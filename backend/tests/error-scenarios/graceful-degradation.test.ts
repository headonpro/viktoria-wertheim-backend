/**
 * Graceful Degradation Tests
 * 
 * Tests for degradation scenario tests, partial failure handling tests,
 * and system resilience testing as required by Requirements 1.4, 8.1
 */

import { BaseHookService } from '../../src/services/BaseHookService';
import { HookErrorHandler, HookEvent, HookContext } from '../../src/services/hook-error-handler';
import { TeamHookService } from '../../src/services/TeamHookService';
import { SaisonHookService } from '../../src/services/SaisonHookService';
import { TableHookService } from '../../src/services/TableHookService';
import { ValidationService } from '../../src/services/ValidationService';
import { CalculationService } from '../../src/services/CalculationService';

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

describe('Graceful Degradation Tests', () => {
  let teamService: TeamHookService;
  let saisonService: SaisonHookService;
  let tableService: TableHookService;
  let validationService: ValidationService;
  let calculationService: CalculationService;
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

    validationService = new ValidationService(mockStrapi);
    calculationService = new CalculationService(mockStrapi);
    errorHandler = new HookErrorHandler(mockStrapi, {
      enableGracefulDegradation: true
    });
  });

  describe('Degradation Scenario Tests', () => {
    it('should degrade gracefully when validation service is unavailable', async () => {
      // Mock validation service failure
      jest.spyOn(validationService, 'validateCritical').mockRejectedValue(
        new Error('Validation service unavailable')
      );

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true); // Should allow operation to proceed
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'VALIDATION_DEGRADED',
          message: expect.stringContaining('validation temporarily disabled')
        })
      );
      expect(result.modifiedData).toBeDefined(); // Should still provide data
    });

    it('should degrade gracefully when calculation service fails', async () => {
      // Mock calculation service failure
      jest.spyOn(calculationService, 'calculateSync').mockRejectedValue(
        new Error('Calculation service failed')
      );

      const event: HookEvent = {
        params: {
          data: {
            team: 1,
            spiele: 10,
            siege: 5,
            unentschieden: 2,
            niederlagen: 3,
            toreFuer: 15,
            toreGegen: 8
          }
        }
      };

      const result = await tableService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'CALCULATION_FALLBACK',
          message: expect.stringContaining('fallback values used')
        })
      );
      
      // Should provide fallback calculations
      expect(result.modifiedData).toEqual(
        expect.objectContaining({
          punkte: 17, // 5*3 + 2*1 = 17
          tordifferenz: 7, // 15 - 8 = 7
          spiele: 10
        })
      );
    });

    it('should degrade gracefully when database is slow but responsive', async () => {
      // Mock slow database responses
      mockStrapi.db.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 150))
      );

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false); // May timeout
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'PERFORMANCE_DEGRADED',
          message: expect.stringContaining('slow database response')
        })
      );
    });

    it('should degrade gracefully during high system load', async () => {
      // Simulate high system load by making multiple concurrent requests
      const events = Array.from({ length: 20 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      // Mock resource contention
      let concurrentCalls = 0;
      mockStrapi.db.query.mockImplementation(() => {
        concurrentCalls++;
        if (concurrentCalls > 5) {
          return Promise.reject(new Error('Resource exhausted'));
        }
        return Promise.resolve([{ id: 1, name: 'Test' }]);
      });

      const promises = events.map(event => teamService.beforeCreate(event));
      const results = await Promise.all(promises);

      // Some should succeed, others should degrade gracefully
      const successCount = results.filter(r => r.success).length;
      const degradedCount = results.filter(r => !r.success && r.canProceed).length;

      expect(successCount).toBeGreaterThan(0);
      expect(degradedCount).toBeGreaterThan(0);
      expect(successCount + degradedCount).toBe(20);

      // Should log system load warning
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('High system load detected'),
        expect.objectContaining({
          concurrentRequests: expect.any(Number),
          degradationRate: expect.any(Number)
        })
      );
    });

    it('should maintain core functionality during partial service failures', async () => {
      // Mock partial service failures
      jest.spyOn(validationService, 'validateWarning').mockRejectedValue(
        new Error('Warning validation failed')
      );
      jest.spyOn(calculationService, 'scheduleAsync').mockRejectedValue(
        new Error('Async scheduling failed')
      );

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      
      // Core functionality should still work
      expect(result.modifiedData).toEqual(
        expect.objectContaining({
          name: 'Test Team',
          liga: 1,
          saison: 1,
          aktiv: true // Default value provided
        })
      );

      // Should log partial failure
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Partial service failure'),
        expect.objectContaining({
          failedServices: expect.any(Array),
          coreFunction: 'maintained'
        })
      );
    });
  });

  describe('Partial Failure Handling Tests', () => {
    it('should handle validation rule subset failures', async () => {
      // Mock some validation rules failing, others succeeding
      const mockValidationRules = [
        { name: 'required-fields', validate: jest.fn().mockResolvedValue(true) },
        { name: 'unique-name', validate: jest.fn().mockRejectedValue(new Error('Service down')) },
        { name: 'format-check', validate: jest.fn().mockResolvedValue(true) },
        { name: 'business-rules', validate: jest.fn().mockRejectedValue(new Error('Service down')) }
      ];

      jest.spyOn(validationService, 'getValidationRules').mockReturnValue(mockValidationRules);

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'PARTIAL_VALIDATION',
          message: expect.stringContaining('2 of 4 validation rules applied')
        })
      );

      // Should log which rules failed
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Partial validation applied'),
        expect.objectContaining({
          successfulRules: ['required-fields', 'format-check'],
          failedRules: ['unique-name', 'business-rules']
        })
      );
    });

    it('should handle calculation subset failures', async () => {
      // Mock some calculations failing, others succeeding
      const mockCalculations = {
        punkte: jest.fn().mockResolvedValue(15),
        tordifferenz: jest.fn().mockRejectedValue(new Error('Calculation failed')),
        position: jest.fn().mockResolvedValue(5),
        form: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      };

      jest.spyOn(calculationService, 'getCalculations').mockReturnValue(mockCalculations);

      const event: HookEvent = {
        params: {
          data: {
            team: 1,
            spiele: 10,
            siege: 5,
            unentschieden: 0,
            niederlagen: 5,
            toreFuer: 15,
            toreGegen: 12
          }
        }
      };

      const result = await tableService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.modifiedData).toEqual(
        expect.objectContaining({
          punkte: 15, // Successful calculation
          position: 5, // Successful calculation
          tordifferenz: 3, // Fallback calculation (15-12)
          form: null // Failed calculation, no fallback
        })
      );

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'PARTIAL_CALCULATION',
          message: expect.stringContaining('2 of 4 calculations completed')
        })
      );
    });

    it('should handle database partial availability', async () => {
      // Mock database with some tables available, others not
      mockStrapi.db.query.mockImplementation((contentType: string) => {
        if (contentType === 'api::team.team') {
          return Promise.resolve([{ id: 1, name: 'Test Team' }]);
        } else if (contentType === 'api::liga.liga') {
          return Promise.reject(new Error('Liga table unavailable'));
        } else if (contentType === 'api::saison.saison') {
          return Promise.resolve([{ id: 1, name: 'Test Season' }]);
        }
        return Promise.reject(new Error('Table unavailable'));
      });

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'PARTIAL_DATABASE_ACCESS',
          message: expect.stringContaining('some database tables unavailable')
        })
      );

      // Should use available data and provide fallbacks
      expect(result.modifiedData).toEqual(
        expect.objectContaining({
          name: 'Test Team',
          liga: 1, // Fallback to provided value
          saison: 1,
          ligaName: 'Unknown Liga', // Fallback value
          saisonName: 'Test Season' // Retrieved successfully
        })
      );
    });

    it('should handle feature flag service partial failures', async () => {
      // Mock feature flag service with some flags available, others not
      const mockFeatureFlags = {
        'strict-validation': { enabled: false, error: null },
        'async-calculations': { enabled: null, error: new Error('Flag service down') },
        'enhanced-logging': { enabled: true, error: null },
        'performance-monitoring': { enabled: null, error: new Error('Flag service down') }
      };

      jest.spyOn(teamService as any, 'getFeatureFlags').mockResolvedValue(mockFeatureFlags);

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'PARTIAL_FEATURE_FLAGS',
          message: expect.stringContaining('2 of 4 feature flags available')
        })
      );

      // Should use available flags and defaults for unavailable ones
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Feature flag degradation'),
        expect.objectContaining({
          availableFlags: ['strict-validation', 'enhanced-logging'],
          unavailableFlags: ['async-calculations', 'performance-monitoring'],
          usingDefaults: true
        })
      );
    });
  });

  describe('System Resilience Testing', () => {
    it('should maintain system stability during cascading failures', async () => {
      // Simulate cascading failures across multiple services
      mockStrapi.db.query.mockRejectedValue(new Error('Database cluster down'));
      jest.spyOn(validationService, 'validateCritical').mockRejectedValue(new Error('Validation cluster down'));
      jest.spyOn(calculationService, 'calculateSync').mockRejectedValue(new Error('Calculation cluster down'));

      const events = Array.from({ length: 10 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      const results = await Promise.all(
        events.map(event => teamService.beforeCreate(event))
      );

      // All operations should degrade gracefully, none should crash
      results.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.canProceed).toBe(true);
        expect(result.modifiedData).toBeDefined();
      });

      // System should detect cascading failure pattern
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Cascading failure detected'),
        expect.objectContaining({
          failedServices: expect.any(Array),
          impactLevel: 'high',
          recommendation: expect.any(String)
        })
      );
    });

    it('should implement circuit breaker for system protection', async () => {
      // Mock consistent failures to trigger circuit breaker
      mockStrapi.db.query.mockRejectedValue(new Error('Service overloaded'));

      const events = Array.from({ length: 15 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      const results = [];
      for (const event of events) {
        const result = await teamService.beforeCreate(event);
        results.push(result);
      }

      // After threshold failures, circuit breaker should open
      const laterResults = results.slice(-5);
      laterResults.forEach(result => {
        expect(result.warnings).toContainEqual(
          expect.objectContaining({
            code: 'CIRCUIT_BREAKER_OPEN',
            message: expect.stringContaining('service temporarily disabled for protection')
          })
        );
      });

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker opened for system protection'),
        expect.objectContaining({
          service: 'team',
          failureThreshold: expect.any(Number),
          protectionMode: 'active'
        })
      );
    });

    it('should maintain data consistency during degraded operations', async () => {
      // Mock partial service failures
      jest.spyOn(validationService, 'validateCritical').mockRejectedValue(new Error('Validation failed'));
      jest.spyOn(calculationService, 'calculateSync').mockRejectedValue(new Error('Calculation failed'));

      const event: HookEvent = {
        params: {
          data: {
            team: 1,
            spiele: 10,
            siege: 5,
            unentschieden: 2,
            niederlagen: 3,
            toreFuer: 18,
            toreGegen: 12
          }
        }
      };

      const result = await tableService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);

      // Data should remain mathematically consistent
      const data = result.modifiedData;
      expect(data.spiele).toBe(data.siege + data.unentschieden + data.niederlagen);
      expect(data.punkte).toBe(data.siege * 3 + data.unentschieden * 1);
      expect(data.tordifferenz).toBe(data.toreFuer - data.toreGegen);

      // Should log consistency verification
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Data consistency verified during degraded operation'),
        expect.objectContaining({
          consistencyChecks: expect.any(Array),
          allPassed: true
        })
      );
    });

    it('should provide meaningful user feedback during degradation', async () => {
      // Mock service failures
      jest.spyOn(validationService, 'validateCritical').mockRejectedValue(new Error('Validation service maintenance'));
      jest.spyOn(calculationService, 'calculateSync').mockRejectedValue(new Error('Calculation service maintenance'));

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      
      // Should provide user-friendly messages
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'USER_FRIENDLY_DEGRADATION',
          message: expect.stringContaining('Einige Funktionen sind temporär eingeschränkt')
        })
      );

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'DEGRADATION_EXPLANATION',
          message: expect.stringContaining('Ihre Daten wurden gespeichert, aber einige Validierungen wurden übersprungen')
        })
      );
    });

    it('should recover automatically when services become available', async () => {
      let serviceAvailable = false;
      
      // Mock service that becomes available after some time
      mockStrapi.db.query.mockImplementation(() => {
        if (serviceAvailable) {
          return Promise.resolve([{ id: 1, name: 'Test Team' }]);
        }
        return Promise.reject(new Error('Service temporarily unavailable'));
      });

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      // First call should degrade
      const firstResult = await teamService.beforeCreate(event);
      expect(firstResult.success).toBe(false);
      expect(firstResult.canProceed).toBe(true);

      // Service becomes available
      serviceAvailable = true;

      // Second call should succeed
      const secondResult = await teamService.beforeCreate(event);
      expect(secondResult.success).toBe(true);

      // Should log recovery
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Service recovery detected'),
        expect.objectContaining({
          service: 'database',
          recoveryTime: expect.any(Date),
          degradationDuration: expect.any(Number)
        })
      );
    });

    it('should maintain audit trail during degraded operations', async () => {
      // Mock service failures
      jest.spyOn(validationService, 'validateCritical').mockRejectedValue(new Error('Validation failed'));

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);

      // Should maintain detailed audit trail
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Degraded operation audit'),
        expect.objectContaining({
          operationId: expect.any(String),
          degradationLevel: expect.any(String),
          skippedValidations: expect.any(Array),
          appliedFallbacks: expect.any(Array),
          dataIntegrity: 'maintained',
          userImpact: 'minimal'
        })
      );
    });
  });

  describe('Degradation Configuration and Control', () => {
    it('should respect degradation configuration settings', async () => {
      // Test with degradation disabled
      const strictService = new TeamHookService(mockStrapi, {
        enableGracefulDegradation: false,
        enableStrictValidation: true
      });

      jest.spyOn(validationService, 'validateCritical').mockRejectedValue(
        new Error('Critical validation failed')
      );

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      await expect(strictService.beforeCreate(event)).rejects.toThrow('Critical validation failed');

      // Test with degradation enabled
      const result = await teamService.beforeCreate(event);
      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
    });

    it('should allow selective degradation by service type', async () => {
      // Configure selective degradation
      teamService.updateConfig({
        degradationSettings: {
          validation: { enabled: true, level: 'partial' },
          calculation: { enabled: false, level: 'none' },
          database: { enabled: true, level: 'full' }
        }
      });

      // Mock service failures
      jest.spyOn(validationService, 'validateCritical').mockRejectedValue(new Error('Validation failed'));
      jest.spyOn(calculationService, 'calculateSync').mockRejectedValue(new Error('Calculation failed'));
      mockStrapi.db.query.mockRejectedValue(new Error('Database failed'));

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      // Validation should degrade (partial)
      expect(result.warnings.some(w => w.code === 'VALIDATION_DEGRADED')).toBe(true);
      
      // Calculation should fail completely (no degradation)
      expect(result.errors.some(e => e.code === 'CALCULATION_ERROR')).toBe(true);
      
      // Database should degrade fully
      expect(result.warnings.some(w => w.code === 'DATABASE_DEGRADED')).toBe(true);
    });

    it('should provide degradation status monitoring', async () => {
      // Mock various service states
      jest.spyOn(validationService, 'validateCritical').mockRejectedValue(new Error('Service down'));
      mockStrapi.db.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );

      const events = Array.from({ length: 5 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      for (const event of events) {
        await teamService.beforeCreate(event);
      }

      const degradationStatus = teamService.getDegradationStatus();

      expect(degradationStatus).toEqual(
        expect.objectContaining({
          overall: expect.objectContaining({
            level: expect.any(String),
            services: expect.any(Object),
            impact: expect.any(String)
          }),
          services: expect.objectContaining({
            validation: expect.objectContaining({
              status: 'degraded',
              level: expect.any(String),
              lastFailure: expect.any(Date)
            }),
            database: expect.objectContaining({
              status: 'slow',
              level: expect.any(String),
              averageResponseTime: expect.any(Number)
            })
          })
        })
      );
    });
  });
});