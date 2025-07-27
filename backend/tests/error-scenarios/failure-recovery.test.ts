/**
 * Failure Recovery Tests
 * 
 * Tests for all error scenarios, recovery mechanism validation,
 * and fallback behavior testing as required by Requirements 1.4, 2.2
 */

import { BaseHookService } from '../../src/services/BaseHookService';
import { HookErrorHandler, HookEvent, HookResult, HookContext } from '../../src/services/hook-error-handler';
import { TeamHookService } from '../../src/services/TeamHookService';
import { SaisonHookService } from '../../src/services/SaisonHookService';
import { TableHookService } from '../../src/services/TableHookService';

// Mock Strapi instance
const mockStrapi = {
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  db: {
    query: jest.fn()
  }
};

describe('Failure Recovery Tests', () => {
  let teamService: TeamHookService;
  let saisonService: SaisonHookService;
  let tableService: TableHookService;
  let errorHandler: HookErrorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Initialize services with graceful degradation enabled
    teamService = new TeamHookService(mockStrapi, {
      enableGracefulDegradation: true,
      enableStrictValidation: false,
      retryAttempts: 2
    });
    
    saisonService = new SaisonHookService(mockStrapi, {
      enableGracefulDegradation: true,
      enableStrictValidation: false,
      retryAttempts: 2
    });
    
    tableService = new TableHookService(mockStrapi, {
      enableGracefulDegradation: true,
      enableStrictValidation: false,
      retryAttempts: 2
    });

    errorHandler = new HookErrorHandler(mockStrapi, {
      enableGracefulDegradation: true,
      enableStrictValidation: false,
      retryAttempts: 2
    });
  });

  describe('Database Connection Failures', () => {
    it('should recover from database connection timeout', async () => {
      // Mock database timeout error
      mockStrapi.db.query.mockRejectedValueOnce(new Error('Connection timeout'));
      mockStrapi.db.query.mockResolvedValueOnce({ id: 1, name: 'Test Team' });

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Database connection recovered after retry')
      );
    });

    it('should handle persistent database failures gracefully', async () => {
      // Mock persistent database failure
      mockStrapi.db.query.mockRejectedValue(new Error('Database unavailable'));

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true); // Graceful degradation allows proceeding
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('warning');
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });

    it('should use fallback data when database queries fail', async () => {
      // Mock database failure for validation query
      mockStrapi.db.query.mockRejectedValue(new Error('Query failed'));

      const event: HookEvent = {
        params: {
          data: { 
            team: 1,
            spiele: 10,
            siege: 5,
            unentschieden: 2,
            niederlagen: 3
          }
        }
      };

      const result = await tableService.beforeCreate(event);

      // Should proceed with fallback calculations
      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'FALLBACK_CALCULATION',
          message: expect.stringContaining('fallback')
        })
      );
    });
  });

  describe('Validation Failure Recovery', () => {
    it('should recover from validation service failures', async () => {
      const event: HookEvent = {
        params: {
          data: { 
            name: 'Duplicate Team',
            liga: 1,
            saison: 1
          }
        }
      };

      // Mock validation service throwing error
      jest.spyOn(teamService as any, 'validateTeamData').mockRejectedValueOnce(
        new Error('Validation service unavailable')
      );

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true); // Should allow proceeding with degraded validation
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'VALIDATION_DEGRADED',
          message: expect.stringContaining('validation temporarily disabled')
        })
      );
    });

    it('should handle season overlap validation failures gracefully', async () => {
      const event: HookEvent = {
        params: {
          data: {
            name: 'Saison 2024/25',
            startDatum: '2024-08-01',
            endDatum: '2025-05-31',
            aktiv: true
          }
        }
      };

      // Mock overlap validation failure
      mockStrapi.db.query.mockResolvedValueOnce([
        { id: 1, name: 'Existing Season', startDatum: '2024-07-01', endDatum: '2025-06-30' }
      ]);

      const result = await saisonService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true); // Graceful degradation allows overlap
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'OVERLAP_VALIDATION',
          message: expect.stringContaining('überschneidet')
        })
      );
    });

    it('should provide fallback validation when rules engine fails', async () => {
      const event: HookEvent = {
        params: {
          data: { name: '', liga: null, saison: null } // Invalid data
        }
      };

      // Mock validation rules engine failure
      jest.spyOn(teamService as any, 'getValidationRules').mockImplementation(() => {
        throw new Error('Rules engine failed');
      });

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'BASIC_VALIDATION_ONLY',
          message: expect.stringContaining('basic validation applied')
        })
      );
    });
  });

  describe('Calculation Failure Recovery', () => {
    it('should use fallback values when calculations fail', async () => {
      const event: HookEvent = {
        params: {
          data: {
            team: 1,
            spiele: 10,
            siege: 5,
            unentschieden: 2,
            niederlagen: 3,
            toreFuer: null, // Missing data that would cause calculation failure
            toreGegen: null
          }
        }
      };

      const result = await tableService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.modifiedData).toEqual(
        expect.objectContaining({
          punkte: 17, // Should calculate: 5*3 + 2*1 = 17
          tordifferenz: 0, // Fallback value when goals are missing
          toreFuer: 0,
          toreGegen: 0
        })
      );
    });

    it('should handle complex calculation service failures', async () => {
      const event: HookEvent = {
        params: {
          data: {
            team: 1,
            spiele: 10,
            siege: 5,
            unentschieden: 2,
            niederlagen: 3
          }
        }
      };

      // Mock calculation service failure
      jest.spyOn(tableService as any, 'calculateTableData').mockImplementation(() => {
        throw new Error('Calculation service unavailable');
      });

      const result = await tableService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'CALCULATION_FALLBACK',
          message: expect.stringContaining('fallback values used')
        })
      );
    });

    it('should recover from async calculation job failures', async () => {
      const event: HookEvent = {
        params: {
          data: { team: 1, spiele: 20 }
        }
      };

      // Mock background job queue failure
      jest.spyOn(tableService as any, 'scheduleAsyncCalculation').mockRejectedValueOnce(
        new Error('Job queue unavailable')
      );

      const result = await tableService.afterCreate(event);

      // After hooks should not block operations
      expect(result).toBeUndefined(); // afterCreate returns void
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Async calculation failed, will retry later')
      );
    });
  });

  describe('Service Integration Failure Recovery', () => {
    it('should handle service factory failures', async () => {
      // Mock service factory returning null
      const mockFactory = {
        createTeamService: jest.fn().mockReturnValue(null),
        createValidationService: jest.fn().mockReturnValue(null),
        createCalculationService: jest.fn().mockReturnValue(null)
      };

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team' }
        }
      };

      // Test with null services
      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'SERVICE_DEGRADED',
          message: expect.stringContaining('service temporarily unavailable')
        })
      );
    });

    it('should handle configuration service failures', async () => {
      // Mock configuration loading failure
      jest.spyOn(teamService, 'getConfig').mockImplementation(() => {
        throw new Error('Configuration service unavailable');
      });

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team' }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'DEFAULT_CONFIG_USED',
          message: expect.stringContaining('default configuration applied')
        })
      );
    });
  });

  describe('Error Handler Recovery Mechanisms', () => {
    it('should classify errors correctly for recovery decisions', async () => {
      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-op-1'
      };

      // Test critical error classification
      const criticalResult = await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Database constraint violation');
      });

      expect(criticalResult.success).toBe(false);
      expect(criticalResult.canProceed).toBe(true); // Graceful degradation enabled
      expect(criticalResult.errors[0].type).toBe('critical');

      // Test warning error classification
      const warningResult = await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Season überschneidet with existing season');
      });

      expect(warningResult.success).toBe(false);
      expect(warningResult.canProceed).toBe(true);
      expect(warningResult.errors[0].type).toBe('warning');
    });

    it('should apply appropriate recovery strategies', async () => {
      const context: HookContext = {
        contentType: 'saison',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-op-2'
      };

      // Test overlap validation recovery
      const result = await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Season überschneidet with existing season');
      });

      expect(result.canProceed).toBe(true);
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Season overlap detected but allowing operation'),
        expect.objectContaining({
          note: 'Strict validation temporarily disabled'
        })
      );
    });

    it('should handle retry mechanisms for transient failures', async () => {
      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-op-3'
      };

      let attemptCount = 0;
      const result = await errorHandler.wrapHookOperation(context, async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary network error');
        }
        return { success: true };
      });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3); // Should retry twice before succeeding
    });
  });

  describe('Fallback Behavior Validation', () => {
    it('should provide meaningful fallback data structures', async () => {
      const event: HookEvent = {
        params: {
          data: { /* incomplete data */ }
        }
      };

      // Mock all services failing
      jest.spyOn(teamService as any, 'validateTeamData').mockRejectedValue(new Error('Service failed'));
      jest.spyOn(teamService as any, 'calculateTeamStats').mockRejectedValue(new Error('Service failed'));

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.modifiedData).toEqual(
        expect.objectContaining({
          // Should provide safe fallback structure
          name: expect.any(String),
          liga: expect.any(Number),
          saison: expect.any(Number)
        })
      );
    });

    it('should maintain data consistency during fallback operations', async () => {
      const event: HookEvent = {
        params: {
          data: {
            team: 1,
            spiele: 10,
            siege: 5,
            unentschieden: 2,
            niederlagen: 3
          }
        }
      };

      // Mock partial service failures
      jest.spyOn(tableService as any, 'validateTableData').mockRejectedValue(new Error('Validation failed'));

      const result = await tableService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      
      // Verify mathematical consistency in fallback data
      const data = result.modifiedData;
      expect(data.spiele).toBe(data.siege + data.unentschieden + data.niederlagen);
      expect(data.punkte).toBe(data.siege * 3 + data.unentschieden * 1);
    });

    it('should log fallback operations for monitoring', async () => {
      const event: HookEvent = {
        params: {
          data: { name: 'Test Team' }
        }
      };

      // Mock service failure to trigger fallback
      jest.spyOn(teamService as any, 'validateTeamData').mockRejectedValue(new Error('Service unavailable'));

      await teamService.beforeCreate(event);

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Fallback behavior activated'),
        expect.objectContaining({
          reason: expect.any(String),
          fallbackType: expect.any(String)
        })
      );
    });
  });

  describe('System Resilience Under Multiple Failures', () => {
    it('should handle cascading service failures', async () => {
      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      // Mock multiple cascading failures
      mockStrapi.db.query.mockRejectedValue(new Error('Database failed'));
      jest.spyOn(teamService as any, 'validateTeamData').mockRejectedValue(new Error('Validation failed'));
      jest.spyOn(teamService as any, 'calculateTeamStats').mockRejectedValue(new Error('Calculation failed'));

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true); // System should remain resilient
      expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
      
      // Should still provide some form of processed data
      expect(result.modifiedData).toBeDefined();
    });

    it('should maintain service isolation during failures', async () => {
      const teamEvent: HookEvent = {
        params: { data: { name: 'Team 1' } }
      };
      
      const saisonEvent: HookEvent = {
        params: { data: { name: 'Saison 1' } }
      };

      // Mock team service failure
      jest.spyOn(teamService as any, 'validateTeamData').mockRejectedValue(new Error('Team service failed'));

      const teamResult = await teamService.beforeCreate(teamEvent);
      const saisonResult = await saisonService.beforeCreate(saisonEvent);

      // Team service should fail but saison service should work
      expect(teamResult.success).toBe(false);
      expect(saisonResult.success).toBe(true);
      
      // Services should be isolated
      expect(teamResult.canProceed).toBe(true);
      expect(saisonResult.canProceed).toBe(true);
    });
  });
});