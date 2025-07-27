/**
 * Timeout Testing
 * 
 * Tests for hook timeout scenarios, timeout recovery testing,
 * and timeout configuration testing as required by Requirements 3.1, 1.4
 */

import { BaseHookService } from '../../src/services/BaseHookService';
import { HookErrorHandler, HookEvent, HookContext } from '../../src/services/hook-error-handler';
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

// Helper function to create a delayed promise
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('Timeout Testing', () => {
  let teamService: TeamHookService;
  let saisonService: SaisonHookService;
  let tableService: TableHookService;
  let errorHandler: HookErrorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Initialize services with short timeouts for testing
    teamService = new TeamHookService(mockStrapi, {
      maxHookExecutionTime: 100, // 100ms timeout
      enableGracefulDegradation: true,
      retryAttempts: 2
    });
    
    saisonService = new SaisonHookService(mockStrapi, {
      maxHookExecutionTime: 150, // 150ms timeout
      enableGracefulDegradation: true,
      retryAttempts: 2
    });
    
    tableService = new TableHookService(mockStrapi, {
      maxHookExecutionTime: 200, // 200ms timeout
      enableGracefulDegradation: true,
      retryAttempts: 2
    });

    errorHandler = new HookErrorHandler(mockStrapi, {
      maxExecutionTime: 100,
      enableGracefulDegradation: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Hook Timeout Scenarios', () => {
    it('should timeout when database query takes too long', async () => {
      // Mock slow database query
      mockStrapi.db.query.mockImplementation(() => delay(200)); // 200ms delay

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const resultPromise = teamService.beforeCreate(event);
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(150);
      
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true); // Graceful degradation
      expect(result.errors[0].code).toBe('HOOK_TIMEOUT');
      expect(result.errors[0].message).toContain('timed out after 100ms');
    });

    it('should timeout when validation takes too long', async () => {
      // Mock slow validation
      jest.spyOn(teamService as any, 'validateTeamData').mockImplementation(() => delay(200));

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const resultPromise = teamService.beforeCreate(event);
      jest.advanceTimersByTime(150);
      
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('HOOK_TIMEOUT');
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Hook timeout'),
        expect.objectContaining({
          suggestion: 'Consider moving to async processing'
        })
      );
    });

    it('should timeout when calculations take too long', async () => {
      // Mock slow calculation
      jest.spyOn(tableService as any, 'calculateTableData').mockImplementation(() => delay(300));

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

      const resultPromise = tableService.beforeCreate(event);
      jest.advanceTimersByTime(250);
      
      const result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('HOOK_TIMEOUT');
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'ASYNC_CALCULATION_RECOMMENDED',
          message: expect.stringContaining('Consider moving calculation to background job')
        })
      );
    });

    it('should handle multiple concurrent timeouts', async () => {
      // Mock slow operations for multiple services
      mockStrapi.db.query.mockImplementation(() => delay(200));

      const events = [
        { params: { data: { name: 'Team 1', liga: 1, saison: 1 } } },
        { params: { data: { name: 'Team 2', liga: 1, saison: 1 } } },
        { params: { data: { name: 'Team 3', liga: 1, saison: 1 } } }
      ];

      const promises = events.map(event => teamService.beforeCreate(event));
      
      jest.advanceTimersByTime(150);
      
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.errors[0].code).toBe('HOOK_TIMEOUT');
        expect(result.canProceed).toBe(true);
      });

      // Should log concurrent timeout warning
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Multiple concurrent timeouts detected'),
        expect.objectContaining({
          count: 3,
          recommendation: expect.any(String)
        })
      );
    });
  });

  describe('Timeout Recovery Testing', () => {
    it('should recover from timeout by using cached data', async () => {
      // Mock timeout on first call, success on retry with cache
      let callCount = 0;
      mockStrapi.db.query.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return delay(200); // Timeout
        }
        return Promise.resolve([{ id: 1, name: 'Cached Team' }]); // Fast cache response
      });

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      const resultPromise = teamService.beforeCreate(event);
      jest.advanceTimersByTime(150);
      
      const result = await resultPromise;

      expect(result.success).toBe(false); // First attempt timed out
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'TIMEOUT_RECOVERY_CACHE',
          message: expect.stringContaining('recovered using cached data')
        })
      );
    });

    it('should fallback to async processing after timeout', async () => {
      // Mock timeout for sync operation
      jest.spyOn(tableService as any, 'calculateTableData').mockImplementation(() => delay(300));
      
      // Mock async job scheduling
      const mockScheduleAsync = jest.spyOn(tableService as any, 'scheduleAsyncCalculation')
        .mockResolvedValue({ jobId: 'calc-job-123' });

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

      const resultPromise = tableService.beforeCreate(event);
      jest.advanceTimersByTime(250);
      
      const result = await resultPromise;

      expect(result.success).toBe(false); // Sync calculation timed out
      expect(result.canProceed).toBe(true);
      expect(mockScheduleAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'table-calculation',
          data: event.params.data,
          priority: 'high'
        })
      );
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          code: 'ASYNC_FALLBACK',
          message: expect.stringContaining('scheduled for background processing')
        })
      );
    });

    it('should use progressive timeout increases for retries', async () => {
      let attemptCount = 0;
      const timeouts: number[] = [];

      // Mock the executeWithTimeout method to capture timeout values
      jest.spyOn(teamService as any, 'executeWithTimeout').mockImplementation(
        async (operation: Function, timeoutMs: number) => {
          attemptCount++;
          timeouts.push(timeoutMs);
          
          if (attemptCount < 3) {
            await delay(timeoutMs + 50); // Exceed timeout
            throw new Error(`Hook operation timed out after ${timeoutMs}ms`);
          }
          
          return operation();
        }
      );

      const event: HookEvent = {
        params: {
          data: { name: 'Test Team', liga: 1, saison: 1 }
        }
      };

      await teamService.beforeCreate(event);

      // Should use progressive timeout increases: 100ms, 200ms, 400ms
      expect(timeouts).toEqual([100, 200, 400]);
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Progressive timeout recovery successful'),
        expect.objectContaining({
          finalTimeout: 400,
          attempts: 3
        })
      );
    });

    it('should implement timeout circuit breaker', async () => {
      // Mock consistent timeouts
      mockStrapi.db.query.mockImplementation(() => delay(200));

      const events = Array.from({ length: 10 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      const results = [];
      for (const event of events) {
        const resultPromise = teamService.beforeCreate(event);
        jest.advanceTimersByTime(150);
        const result = await resultPromise;
        results.push(result);
      }

      // After threshold timeouts, should open circuit breaker
      const lastResults = results.slice(-3);
      lastResults.forEach(result => {
        expect(result.warnings).toContainEqual(
          expect.objectContaining({
            code: 'TIMEOUT_CIRCUIT_OPEN',
            message: expect.stringContaining('timeout circuit breaker activated')
          })
        );
      });

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Timeout circuit breaker opened'),
        expect.objectContaining({
          timeoutCount: expect.any(Number),
          threshold: expect.any(Number)
        })
      );
    });
  });

  describe('Timeout Configuration Testing', () => {
    it('should respect different timeout configurations per service', async () => {
      // Mock operations that exceed different service timeouts
      mockStrapi.db.query.mockImplementation(() => delay(175)); // 175ms delay

      const teamEvent: HookEvent = {
        params: { data: { name: 'Team Test', liga: 1, saison: 1 } }
      };

      const saisonEvent: HookEvent = {
        params: { data: { name: 'Saison Test', startDatum: '2024-08-01' } }
      };

      const tableEvent: HookEvent = {
        params: { data: { team: 1, spiele: 10 } }
      };

      const teamPromise = teamService.beforeCreate(teamEvent); // 100ms timeout
      const saisonPromise = saisonService.beforeCreate(saisonEvent); // 150ms timeout
      const tablePromise = tableService.beforeCreate(tableEvent); // 200ms timeout

      jest.advanceTimersByTime(200);

      const [teamResult, saisonResult, tableResult] = await Promise.all([
        teamPromise, saisonPromise, tablePromise
      ]);

      // Team service should timeout (100ms < 175ms)
      expect(teamResult.success).toBe(false);
      expect(teamResult.errors[0].code).toBe('HOOK_TIMEOUT');

      // Saison service should timeout (150ms < 175ms)
      expect(saisonResult.success).toBe(false);
      expect(saisonResult.errors[0].code).toBe('HOOK_TIMEOUT');

      // Table service should succeed (200ms > 175ms)
      expect(tableResult.success).toBe(true);
    });

    it('should allow runtime timeout configuration updates', async () => {
      // Initial timeout: 100ms
      mockStrapi.db.query.mockImplementation(() => delay(150));

      const event: HookEvent = {
        params: { data: { name: 'Test Team', liga: 1, saison: 1 } }
      };

      // First call should timeout
      let resultPromise = teamService.beforeCreate(event);
      jest.advanceTimersByTime(120);
      let result = await resultPromise;

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('HOOK_TIMEOUT');

      // Update timeout configuration
      teamService.updateConfig({ maxHookExecutionTime: 200 });

      // Second call should succeed with new timeout
      resultPromise = teamService.beforeCreate(event);
      jest.advanceTimersByTime(180);
      result = await resultPromise;

      expect(result.success).toBe(true);
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Hook service configuration updated'),
        expect.objectContaining({
          maxHookExecutionTime: 200
        })
      );
    });

    it('should validate timeout configuration values', async () => {
      // Test invalid timeout configurations
      expect(() => {
        teamService.updateConfig({ maxHookExecutionTime: -1 });
      }).toThrow('Invalid timeout configuration: must be positive number');

      expect(() => {
        teamService.updateConfig({ maxHookExecutionTime: 0 });
      }).toThrow('Invalid timeout configuration: must be positive number');

      expect(() => {
        teamService.updateConfig({ maxHookExecutionTime: 10000 });
      }).toThrow('Invalid timeout configuration: exceeds maximum allowed timeout');

      // Valid configuration should work
      expect(() => {
        teamService.updateConfig({ maxHookExecutionTime: 500 });
      }).not.toThrow();
    });

    it('should provide timeout recommendations based on performance', async () => {
      // Mock operations with varying execution times
      const executionTimes = [80, 90, 95, 105, 110]; // Some exceed 100ms timeout
      let callCount = 0;

      mockStrapi.db.query.mockImplementation(() => {
        const time = executionTimes[callCount % executionTimes.length];
        callCount++;
        return delay(time);
      });

      const events = Array.from({ length: 10 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      for (const event of events) {
        const resultPromise = teamService.beforeCreate(event);
        jest.advanceTimersByTime(120);
        await resultPromise;
      }

      // Should analyze performance and recommend timeout adjustment
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Timeout configuration recommendation'),
        expect.objectContaining({
          currentTimeout: 100,
          recommendedTimeout: expect.any(Number),
          reason: expect.stringContaining('performance analysis'),
          successRate: expect.any(Number)
        })
      );
    });

    it('should handle environment-specific timeout configurations', async () => {
      // Mock different environment configurations
      const developmentConfig = { maxHookExecutionTime: 500 }; // Longer for debugging
      const productionConfig = { maxHookExecutionTime: 100 }; // Shorter for performance
      const testConfig = { maxHookExecutionTime: 50 }; // Very short for fast tests

      // Test development configuration
      const devService = new TeamHookService(mockStrapi, developmentConfig);
      expect(devService.getConfig().maxHookExecutionTime).toBe(500);

      // Test production configuration
      const prodService = new TeamHookService(mockStrapi, productionConfig);
      expect(prodService.getConfig().maxHookExecutionTime).toBe(100);

      // Test configuration
      const testService = new TeamHookService(mockStrapi, testConfig);
      expect(testService.getConfig().maxHookExecutionTime).toBe(50);

      // Verify each service respects its timeout
      mockStrapi.db.query.mockImplementation(() => delay(200));

      const event: HookEvent = {
        params: { data: { name: 'Test Team', liga: 1, saison: 1 } }
      };

      // Development should succeed (500ms > 200ms)
      const devPromise = devService.beforeCreate(event);
      jest.advanceTimersByTime(250);
      const devResult = await devPromise;
      expect(devResult.success).toBe(true);

      // Production should timeout (100ms < 200ms)
      const prodPromise = prodService.beforeCreate(event);
      jest.advanceTimersByTime(150);
      const prodResult = await prodPromise;
      expect(prodResult.success).toBe(false);
      expect(prodResult.errors[0].code).toBe('HOOK_TIMEOUT');

      // Test should timeout (50ms < 200ms)
      const testPromise = testService.beforeCreate(event);
      jest.advanceTimersByTime(100);
      const testResult = await testPromise;
      expect(testResult.success).toBe(false);
      expect(testResult.errors[0].code).toBe('HOOK_TIMEOUT');
    });
  });

  describe('Timeout Monitoring and Metrics', () => {
    it('should track timeout frequency and patterns', async () => {
      // Mock intermittent timeouts
      let callCount = 0;
      mockStrapi.db.query.mockImplementation(() => {
        callCount++;
        const shouldTimeout = callCount % 3 === 0; // Every 3rd call times out
        return delay(shouldTimeout ? 150 : 50);
      });

      const events = Array.from({ length: 9 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      for (const event of events) {
        const resultPromise = teamService.beforeCreate(event);
        jest.advanceTimersByTime(120);
        await resultPromise;
      }

      const metrics = teamService.getMetrics();
      expect(metrics.beforeCreate.timeoutRate).toBeCloseTo(0.33, 1); // ~33% timeout rate
      expect(metrics.beforeCreate.averageExecutionTime).toBeGreaterThan(0);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Timeout pattern analysis'),
        expect.objectContaining({
          timeoutRate: expect.any(Number),
          pattern: expect.any(String),
          recommendation: expect.any(String)
        })
      );
    });

    it('should alert on timeout threshold breaches', async () => {
      // Mock high timeout rate
      mockStrapi.db.query.mockImplementation(() => delay(150)); // Always timeout

      const events = Array.from({ length: 5 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      for (const event of events) {
        const resultPromise = teamService.beforeCreate(event);
        jest.advanceTimersByTime(120);
        await resultPromise;
      }

      // Should trigger high timeout rate alert
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining('High timeout rate alert'),
        expect.objectContaining({
          timeoutRate: 1.0, // 100% timeout rate
          threshold: expect.any(Number),
          urgency: 'high',
          actionRequired: expect.any(String)
        })
      );
    });

    it('should provide timeout performance insights', async () => {
      // Mock various execution times
      const times = [30, 60, 90, 120, 150]; // Mix of success and timeout
      let callCount = 0;

      mockStrapi.db.query.mockImplementation(() => {
        const time = times[callCount % times.length];
        callCount++;
        return delay(time);
      });

      const events = Array.from({ length: 10 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      for (const event of events) {
        const resultPromise = teamService.beforeCreate(event);
        jest.advanceTimersByTime(160);
        await resultPromise;
      }

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Timeout performance insights'),
        expect.objectContaining({
          averageExecutionTime: expect.any(Number),
          p95ExecutionTime: expect.any(Number),
          timeoutThreshold: 100,
          recommendation: expect.any(String),
          optimizationSuggestions: expect.any(Array)
        })
      );
    });
  });
});