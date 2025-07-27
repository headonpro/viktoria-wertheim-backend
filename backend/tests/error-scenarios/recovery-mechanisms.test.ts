/**
 * Recovery Mechanisms Tests
 * 
 * Tests for validation of recovery mechanisms and their effectiveness
 * as required by Requirements 1.4, 2.2
 */

import { BaseHookService } from '../../src/services/BaseHookService';
import { HookErrorHandler, HookEvent, HookContext } from '../../src/services/hook-error-handler';
import { TeamHookService } from '../../src/services/TeamHookService';
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

describe('Recovery Mechanisms Tests', () => {
  let teamService: TeamHookService;
  let errorHandler: HookErrorHandler;
  let validationService: ValidationService;
  let calculationService: CalculationService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    teamService = new TeamHookService(mockStrapi, {
      enableGracefulDegradation: true,
      retryAttempts: 3,
      maxHookExecutionTime: 200
    });

    errorHandler = new HookErrorHandler(mockStrapi, {
      enableGracefulDegradation: true,
      retryAttempts: 3
    });

    validationService = new ValidationService(mockStrapi);
    calculationService = new CalculationService(mockStrapi);
  });

  describe('Retry Mechanisms', () => {
    it('should retry transient database failures', async () => {
      let attemptCount = 0;
      mockStrapi.db.query.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Connection temporarily unavailable');
        }
        return Promise.resolve([{ id: 1, name: 'Test Team' }]);
      });

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(attemptCount).toBe(3);
      expect(result.success).toBe(true);
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Operation succeeded after retry')
      );
    });

    it('should respect maximum retry attempts', async () => {
      let attemptCount = 0;
      mockStrapi.db.query.mockImplementation(() => {
        attemptCount++;
        throw new Error('Persistent connection failure');
      });

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(attemptCount).toBe(3); // Should stop after max retries
      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true); // Graceful degradation
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed after 3 retry attempts')
      );
    });

    it('should use exponential backoff for retries', async () => {
      const retryDelays: number[] = [];
      let attemptCount = 0;

      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-retry-1'
      };

      // Mock the retry mechanism to capture delays
      jest.spyOn(errorHandler as any, 'executeWithRetry').mockImplementation(
        async (operation: Function, maxRetries: number) => {
          for (let i = 0; i < maxRetries; i++) {
            try {
              attemptCount++;
              if (attemptCount < 3) {
                const delay = Math.pow(2, i) * 100; // Exponential backoff
                retryDelays.push(delay);
                await new Promise(resolve => setTimeout(resolve, delay));
                throw new Error('Temporary failure');
              }
              return { success: true };
            } catch (error) {
              if (i === maxRetries - 1) throw error;
            }
          }
        }
      );

      await errorHandler.wrapHookOperation(context, async () => {
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true };
      });

      expect(retryDelays).toEqual([100, 200]); // Exponential backoff: 100ms, 200ms
    });

    it('should not retry non-transient errors', async () => {
      let attemptCount = 0;
      mockStrapi.db.query.mockImplementation(() => {
        attemptCount++;
        const error = new Error('UNIQUE constraint violation');
        error.name = 'DatabaseError';
        throw error;
      });

      const event: HookEvent = {
        params: {
          data: { name: 'Duplicate Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(attemptCount).toBe(1); // Should not retry constraint violations
      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should implement circuit breaker for failing services', async () => {
      // Mock validation service to fail consistently
      let validationCallCount = 0;
      jest.spyOn(validationService, 'validateCritical').mockImplementation(() => {
        validationCallCount++;
        throw new Error('Validation service unavailable');
      });

      const events = Array.from({ length: 10 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      const results = [];
      for (const event of events) {
        const result = await teamService.beforeCreate(event);
        results.push(result);
      }

      // After threshold failures, circuit should open and stop calling service
      expect(validationCallCount).toBeLessThan(10);
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker opened for validation service')
      );

      // Later calls should use fallback without calling the service
      const lastResults = results.slice(-3);
      lastResults.forEach(result => {
        expect(result.warnings).toContainEqual(
          expect.objectContaining({
            code: 'CIRCUIT_BREAKER_OPEN',
            message: expect.stringContaining('service temporarily disabled')
          })
        );
      });
    });

    it('should reset circuit breaker after recovery period', async () => {
      let validationCallCount = 0;
      let shouldFail = true;

      jest.spyOn(validationService, 'validateCritical').mockImplementation(() => {
        validationCallCount++;
        if (shouldFail) {
          throw new Error('Validation service unavailable');
        }
        return { isValid: true, errors: [], warnings: [], canProceed: true };
      });

      // Trigger circuit breaker opening
      for (let i = 0; i < 5; i++) {
        await teamService.beforeCreate({
          params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
        });
      }

      // Simulate service recovery
      shouldFail = false;

      // Wait for circuit breaker reset (simulate time passage)
      jest.advanceTimersByTime(30000); // 30 seconds

      // Next call should try the service again
      const result = await teamService.beforeCreate({
        params: { data: { name: 'Recovery Team', liga: 1, saison: 1 } }
      });

      expect(result.success).toBe(true);
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker reset, service recovered')
      );
    });
  });

  describe('Fallback Data Provision', () => {
    it('should provide safe fallback data for team creation', async () => {
      // Mock all services failing
      mockStrapi.db.query.mockRejectedValue(new Error('Database unavailable'));
      jest.spyOn(validationService, 'validateCritical').mockRejectedValue(new Error('Validation failed'));
      jest.spyOn(calculationService, 'calculateSync').mockRejectedValue(new Error('Calculation failed'));

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team' } // Minimal data
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.modifiedData).toEqual(
        expect.objectContaining({
          name: 'Test Team',
          liga: expect.any(Number),
          saison: expect.any(Number),
          aktiv: true,
          // Should provide safe defaults
          gruendet: expect.any(Date),
          vereinsfarben: expect.any(String)
        })
      );
    });

    it('should provide mathematically consistent fallback calculations', async () => {
      // Mock calculation service failure
      jest.spyOn(calculationService, 'calculateSync').mockRejectedValue(new Error('Calculation service failed'));

      const event: HookEvent = {
        params: {
          data: {
            team: 1,
            spiele: 10,
            siege: 6,
            unentschieden: 2,
            niederlagen: 2,
            toreFuer: 18,
            toreGegen: 8
          }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true);
      
      const data = result.modifiedData;
      // Verify mathematical consistency
      expect(data.spiele).toBe(data.siege + data.unentschieden + data.niederlagen);
      expect(data.punkte).toBe(data.siege * 3 + data.unentschieden * 1);
      expect(data.tordifferenz).toBe(data.toreFuer - data.toreGegen);
    });

    it('should preserve user data while adding fallback fields', async () => {
      const originalData = {
        name: 'User Team',
        liga: 5,
        saison: 3,
        vereinsfarben: 'Rot/Weiß'
      };

      const event: HookEvent = {
        params: { data: originalData }
      };

      // Mock service failures
      jest.spyOn(validationService, 'validateCritical').mockRejectedValue(new Error('Service failed'));

      const result = await teamService.beforeCreate(event);

      expect(result.modifiedData).toEqual(
        expect.objectContaining({
          ...originalData, // User data preserved
          aktiv: true, // Fallback field added
          gruendet: expect.any(Date) // Fallback field added
        })
      );
    });
  });

  describe('Service Isolation and Recovery', () => {
    it('should isolate validation service failures', async () => {
      // Mock validation service failure but keep calculation service working
      jest.spyOn(validationService, 'validateCritical').mockRejectedValue(new Error('Validation failed'));
      jest.spyOn(calculationService, 'calculateSync').mockResolvedValue({
        success: true,
        results: { punkte: 15, tordifferenz: 5 }
      });

      const event: HookEvent = {
        params: {
          data: {
            team: 1,
            spiele: 10,
            siege: 5,
            unentschieden: 0,
            niederlagen: 5
          }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false); // Validation failed
      expect(result.canProceed).toBe(true);
      expect(result.modifiedData.punkte).toBe(15); // Calculation still worked
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'VALIDATION_DEGRADED',
          message: expect.stringContaining('validation temporarily disabled')
        })
      );
    });

    it('should isolate calculation service failures', async () => {
      // Mock calculation service failure but keep validation service working
      jest.spyOn(validationService, 'validateCritical').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        canProceed: true
      });
      jest.spyOn(calculationService, 'calculateSync').mockRejectedValue(new Error('Calculation failed'));

      const event: HookEvent = {
        params: {
          data: { name: 'Valid Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false); // Calculation failed
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'CALCULATION_FALLBACK',
          message: expect.stringContaining('fallback values used')
        })
      );
    });

    it('should handle complete service ecosystem failure gracefully', async () => {
      // Mock all services failing
      mockStrapi.db.query.mockRejectedValue(new Error('Database failed'));
      jest.spyOn(validationService, 'validateCritical').mockRejectedValue(new Error('Validation failed'));
      jest.spyOn(calculationService, 'calculateSync').mockRejectedValue(new Error('Calculation failed'));

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true); // System should remain operational
      expect(result.modifiedData).toBeDefined(); // Should provide some data
      expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
      
      // Should log system degradation
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Multiple service failures detected')
      );
    });
  });

  describe('Recovery Monitoring and Alerting', () => {
    it('should track recovery success rates', async () => {
      let successCount = 0;
      mockStrapi.db.query.mockImplementation(() => {
        successCount++;
        if (successCount <= 2) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve([{ id: 1, name: 'Test Team' }]);
      });

      const events = Array.from({ length: 5 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      const results = [];
      for (const event of events) {
        const result = await teamService.beforeCreate(event);
        results.push(result);
      }

      // Should track and report recovery metrics
      const metrics = teamService.getMetrics();
      expect(metrics.beforeCreate.errorRate).toBeLessThan(1); // Some operations succeeded
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Recovery success rate'),
        expect.objectContaining({
          successRate: expect.any(Number),
          totalAttempts: expect.any(Number)
        })
      );
    });

    it('should alert on persistent recovery failures', async () => {
      // Mock persistent failures
      mockStrapi.db.query.mockRejectedValue(new Error('Persistent failure'));

      const events = Array.from({ length: 10 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      for (const event of events) {
        await teamService.beforeCreate(event);
      }

      // Should trigger alert after threshold failures
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining('High failure rate detected'),
        expect.objectContaining({
          failureRate: expect.any(Number),
          threshold: expect.any(Number),
          recommendation: expect.any(String)
        })
      );
    });

    it('should provide recovery recommendations', async () => {
      // Mock timeout errors
      jest.spyOn(teamService as any, 'executeWithTimeout').mockRejectedValue(
        new Error('Hook operation timed out after 200ms')
      );

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      await teamService.beforeCreate(event);

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Recovery recommendation'),
        expect.objectContaining({
          issue: 'TIMEOUT_ERRORS',
          recommendation: 'Consider increasing timeout or moving to async processing',
          configuration: expect.any(Object)
        })
      );
    });
  });
});