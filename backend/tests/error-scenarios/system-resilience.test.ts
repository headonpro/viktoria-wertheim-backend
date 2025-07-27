/**
 * System Resilience Tests
 * 
 * Tests for overall system resilience, stress testing, and recovery validation
 * as required by Requirements 1.4, 8.1
 */

import { BaseHookService } from '../../src/services/BaseHookService';
import { HookServiceFactory } from '../../src/services/HookServiceFactory';
import { TeamHookService } from '../../src/services/TeamHookService';
import { SaisonHookService } from '../../src/services/SaisonHookService';
import { TableHookService } from '../../src/services/TableHookService';
import { HookEvent } from '../../src/services/hook-error-handler';

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

describe('System Resilience Tests', () => {
  let serviceFactory: HookServiceFactory;
  let teamService: TeamHookService;
  let saisonService: SaisonHookService;
  let tableService: TableHookService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    serviceFactory = new HookServiceFactory(mockStrapi);
    teamService = serviceFactory.createTeamService();
    saisonService = serviceFactory.createSaisonService();
    tableService = serviceFactory.createTableService();
  });

  describe('Stress Testing Under Load', () => {
    it('should handle high concurrent request load', async () => {
      // Mock database with realistic response times
      mockStrapi.db.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), Math.random() * 100))
      );

      const concurrentRequests = 100;
      const events = Array.from({ length: concurrentRequests }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      const startTime = Date.now();
      const promises = events.map(event => teamService.beforeCreate(event));
      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Verify all requests completed
      expect(results).toHaveLength(concurrentRequests);
      
      // Verify reasonable response time (should not exceed 5 seconds for 100 requests)
      expect(endTime - startTime).toBeLessThan(5000);

      // Verify system remained stable
      const successCount = results.filter(r => r.success || r.canProceed).length;
      expect(successCount).toBe(concurrentRequests); // All should succeed or degrade gracefully

      // Should log performance metrics
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('High load performance metrics'),
        expect.objectContaining({
          concurrentRequests,
          totalTime: expect.any(Number),
          averageResponseTime: expect.any(Number),
          successRate: expect.any(Number)
        })
      );
    });

    it('should maintain performance under sustained load', async () => {
      // Mock realistic database behavior
      let requestCount = 0;
      mockStrapi.db.query.mockImplementation(() => {
        requestCount++;
        // Simulate increasing response time under load
        const delay = Math.min(50 + (requestCount / 10), 200);
        return new Promise(resolve => setTimeout(() => resolve([]), delay));
      });

      const batchSize = 20;
      const batchCount = 10;
      const results = [];

      for (let batch = 0; batch < batchCount; batch++) {
        const events = Array.from({ length: batchSize }, (_, i) => ({
          params: { data: { name: `Batch${batch}Team${i}`, liga: 1, saison: 1 } }
        }));

        const batchStartTime = Date.now();
        const batchPromises = events.map(event => teamService.beforeCreate(event));
        const batchResults = await Promise.all(batchPromises);
        const batchEndTime = Date.now();

        results.push({
          batch,
          results: batchResults,
          duration: batchEndTime - batchStartTime,
          averageTime: (batchEndTime - batchStartTime) / batchSize
        });

        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Verify performance didn't degrade significantly
      const firstBatchAvg = results[0].averageTime;
      const lastBatchAvg = results[results.length - 1].averageTime;
      const degradationRatio = lastBatchAvg / firstBatchAvg;

      expect(degradationRatio).toBeLessThan(3); // Performance shouldn't degrade more than 3x

      // Should detect and log performance trends
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Sustained load performance analysis'),
        expect.objectContaining({
          totalRequests: batchSize * batchCount,
          performanceTrend: expect.any(String),
          degradationRatio: expect.any(Number)
        })
      );
    });

    it('should implement load shedding when overwhelmed', async () => {
      // Mock system overload scenario
      let activeRequests = 0;
      const maxConcurrentRequests = 10;

      mockStrapi.db.query.mockImplementation(() => {
        activeRequests++;
        if (activeRequests > maxConcurrentRequests) {
          activeRequests--;
          return Promise.reject(new Error('System overloaded'));
        }

        return new Promise(resolve => {
          setTimeout(() => {
            activeRequests--;
            resolve([]);
          }, 100);
        });
      });

      const overloadRequests = 50;
      const events = Array.from({ length: overloadRequests }, (_, i) => ({
        params: { data: { name: `Overload${i}`, liga: 1, saison: 1 } }
      }));

      const promises = events.map(event => teamService.beforeCreate(event));
      const results = await Promise.all(promises);

      // Some requests should be shed (fail gracefully)
      const shedCount = results.filter(r => 
        r.warnings?.some(w => w.code === 'LOAD_SHED')
      ).length;

      expect(shedCount).toBeGreaterThan(0);
      expect(shedCount).toBeLessThan(overloadRequests);

      // Should log load shedding activity
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Load shedding activated'),
        expect.objectContaining({
          shedRequests: shedCount,
          totalRequests: overloadRequests,
          reason: 'system overload protection'
        })
      );
    });
  });

  describe('Memory and Resource Management', () => {
    it('should manage memory efficiently during high load', async () => {
      // Mock memory-intensive operations
      const largeDataSets = Array.from({ length: 100 }, (_, i) => ({
        params: {
          data: {
            name: `Team ${i}`,
            largeData: new Array(1000).fill(`data-${i}`), // Simulate large data
            liga: 1,
            saison: 1
          }
        }
      }));

      const initialMemory = process.memoryUsage();
      
      const promises = largeDataSets.map(event => teamService.beforeCreate(event));
      const results = await Promise.all(promises);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      // All operations should complete
      expect(results).toHaveLength(100);

      // Should log memory usage patterns
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Memory usage analysis'),
        expect.objectContaining({
          initialMemory: expect.any(Number),
          finalMemory: expect.any(Number),
          memoryIncrease: expect.any(Number),
          operationsCompleted: 100
        })
      );
    });

    it('should clean up resources after operations', async () => {
      // Mock resource tracking
      const resourceTracker = {
        connections: 0,
        timers: 0,
        listeners: 0
      };

      // Mock services that create resources
      jest.spyOn(teamService as any, 'createDatabaseConnection').mockImplementation(() => {
        resourceTracker.connections++;
        return { close: () => { resourceTracker.connections--; } };
      });

      jest.spyOn(teamService as any, 'createTimer').mockImplementation(() => {
        resourceTracker.timers++;
        return { clear: () => { resourceTracker.timers--; } };
      });

      const events = Array.from({ length: 20 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      for (const event of events) {
        await teamService.beforeCreate(event);
      }

      // Resources should be cleaned up
      expect(resourceTracker.connections).toBe(0);
      expect(resourceTracker.timers).toBe(0);
      expect(resourceTracker.listeners).toBe(0);

      // Should log resource cleanup
      expect(mockStrapi.log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Resource cleanup completed'),
        expect.objectContaining({
          operationsProcessed: 20,
          resourcesReleased: expect.any(Number)
        })
      );
    });

    it('should handle resource exhaustion gracefully', async () => {
      // Mock resource exhaustion
      let availableConnections = 5;
      mockStrapi.db.query.mockImplementation(() => {
        if (availableConnections <= 0) {
          return Promise.reject(new Error('Connection pool exhausted'));
        }
        availableConnections--;
        return new Promise(resolve => {
          setTimeout(() => {
            availableConnections++;
            resolve([]);
          }, 100);
        });
      });

      const events = Array.from({ length: 20 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      const promises = events.map(event => teamService.beforeCreate(event));
      const results = await Promise.all(promises);

      // Some operations should succeed, others should degrade gracefully
      const successCount = results.filter(r => r.success).length;
      const degradedCount = results.filter(r => !r.success && r.canProceed).length;

      expect(successCount).toBeGreaterThan(0);
      expect(degradedCount).toBeGreaterThan(0);
      expect(successCount + degradedCount).toBe(20);

      // Should log resource exhaustion handling
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Resource exhaustion handled gracefully'),
        expect.objectContaining({
          successfulOperations: successCount,
          degradedOperations: degradedCount,
          resourceType: 'database connections'
        })
      );
    });
  });

  describe('Service Isolation and Fault Tolerance', () => {
    it('should isolate service failures to prevent cascade', async () => {
      // Mock team service failure
      jest.spyOn(teamService, 'beforeCreate').mockRejectedValue(new Error('Team service failed'));

      // Other services should continue working
      const saisonEvent: HookEvent = {
        params: { data: { name: 'Test Season', startDatum: '2024-08-01' } }
      };

      const tableEvent: HookEvent = {
        params: { data: { team: 1, spiele: 10, siege: 5 } }
      };

      const saisonResult = await saisonService.beforeCreate(saisonEvent);
      const tableResult = await tableService.beforeCreate(tableEvent);

      // Other services should work normally
      expect(saisonResult.success).toBe(true);
      expect(tableResult.success).toBe(true);

      // Should log service isolation
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Service isolation maintained'),
        expect.objectContaining({
          failedService: 'team',
          workingServices: ['saison', 'table'],
          isolationEffective: true
        })
      );
    });

    it('should implement bulkhead pattern for resource isolation', async () => {
      // Mock different resource pools for different services
      const resourcePools = {
        team: { available: 3, total: 3 },
        saison: { available: 3, total: 3 },
        table: { available: 3, total: 3 }
      };

      mockStrapi.db.query.mockImplementation((contentType: string) => {
        const serviceType = contentType.includes('team') ? 'team' : 
                          contentType.includes('saison') ? 'saison' : 'table';
        
        if (resourcePools[serviceType].available <= 0) {
          return Promise.reject(new Error(`${serviceType} resource pool exhausted`));
        }

        resourcePools[serviceType].available--;
        return new Promise(resolve => {
          setTimeout(() => {
            resourcePools[serviceType].available++;
            resolve([]);
          }, 100);
        });
      });

      // Overwhelm team service
      const teamEvents = Array.from({ length: 10 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      const saisonEvents = Array.from({ length: 5 }, (_, i) => ({
        params: { data: { name: `Season ${i}`, startDatum: '2024-08-01' } }
      }));

      const teamPromises = teamEvents.map(event => teamService.beforeCreate(event));
      const saisonPromises = saisonEvents.map(event => saisonService.beforeCreate(event));

      const [teamResults, saisonResults] = await Promise.all([
        Promise.all(teamPromises),
        Promise.all(saisonPromises)
      ]);

      // Team service should be overwhelmed, but saison service should work
      const teamSuccessCount = teamResults.filter(r => r.success).length;
      const saisonSuccessCount = saisonResults.filter(r => r.success).length;

      expect(teamSuccessCount).toBeLessThan(10); // Some team operations should fail
      expect(saisonSuccessCount).toBe(5); // All saison operations should succeed

      // Should log bulkhead effectiveness
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Bulkhead pattern protected service isolation'),
        expect.objectContaining({
          overwhelmedService: 'team',
          protectedServices: ['saison'],
          isolationMaintained: true
        })
      );
    });

    it('should implement timeout isolation between services', async () => {
      // Configure different timeouts for different services
      teamService.updateConfig({ maxHookExecutionTime: 100 });
      saisonService.updateConfig({ maxHookExecutionTime: 200 });
      tableService.updateConfig({ maxHookExecutionTime: 300 });

      // Mock slow operations
      mockStrapi.db.query.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 150))
      );

      const teamEvent: HookEvent = {
        params: { data: { name: 'Test Team', liga: 1, saison: 1 } }
      };

      const saisonEvent: HookEvent = {
        params: { data: { name: 'Test Season', startDatum: '2024-08-01' } }
      };

      const tableEvent: HookEvent = {
        params: { data: { team: 1, spiele: 10 } }
      };

      const [teamResult, saisonResult, tableResult] = await Promise.all([
        teamService.beforeCreate(teamEvent),
        saisonService.beforeCreate(saisonEvent),
        tableService.beforeCreate(tableEvent)
      ]);

      // Team should timeout (100ms < 150ms)
      expect(teamResult.success).toBe(false);
      expect(teamResult.errors[0]?.code).toBe('HOOK_TIMEOUT');

      // Saison and table should succeed (200ms, 300ms > 150ms)
      expect(saisonResult.success).toBe(true);
      expect(tableResult.success).toBe(true);

      // Should log timeout isolation
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Timeout isolation prevented cascade'),
        expect.objectContaining({
          timedOutServices: ['team'],
          workingServices: ['saison', 'table']
        })
      );
    });
  });

  describe('Recovery and Self-Healing', () => {
    it('should detect and recover from transient failures', async () => {
      let failureCount = 0;
      const maxFailures = 3;

      mockStrapi.db.query.mockImplementation(() => {
        failureCount++;
        if (failureCount <= maxFailures) {
          return Promise.reject(new Error('Transient failure'));
        }
        return Promise.resolve([{ id: 1, name: 'Recovered' }]);
      });

      const events = Array.from({ length: 10 }, (_, i) => ({
        params: { data: { name: `Team ${i}`, liga: 1, saison: 1 } }
      }));

      const results = [];
      for (const event of events) {
        const result = await teamService.beforeCreate(event);
        results.push(result);
      }

      // First few should fail, later ones should succeed
      const failedCount = results.filter(r => !r.success).length;
      const succeededCount = results.filter(r => r.success).length;

      expect(failedCount).toBe(maxFailures);
      expect(succeededCount).toBe(10 - maxFailures);

      // Should log recovery detection
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Service recovery detected'),
        expect.objectContaining({
          service: 'database',
          failureCount: maxFailures,
          recoveryConfirmed: true
        })
      );
    });

    it('should implement adaptive retry strategies', async () => {
      let attemptCount = 0;
      const retryDelays: number[] = [];

      // Mock service that requires adaptive retries
      mockStrapi.db.query.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 4) {
          return Promise.reject(new Error('Service temporarily overloaded'));
        }
        return Promise.resolve([{ id: 1, name: 'Success' }]);
      });

      // Mock adaptive retry mechanism
      jest.spyOn(teamService as any, 'executeWithAdaptiveRetry').mockImplementation(
        async (operation: Function) => {
          let attempt = 0;
          while (attempt < 5) {
            try {
              return await operation();
            } catch (error) {
              attempt++;
              if (attempt >= 5) throw error;
              
              // Adaptive delay: increase delay based on failure type
              const delay = error.message.includes('overloaded') ? 
                Math.pow(2, attempt) * 200 : // Exponential for overload
                attempt * 100; // Linear for other errors
              
              retryDelays.push(delay);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
      );

      const event: HookEvent = {
        params: { data: { name: 'Test Team', liga: 1, saison: 1 } }
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(true);
      expect(retryDelays).toEqual([200, 400, 800]); // Exponential backoff for overload

      // Should log adaptive retry success
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Adaptive retry strategy successful'),
        expect.objectContaining({
          attempts: 4,
          strategy: 'exponential-backoff',
          totalDelay: expect.any(Number)
        })
      );
    });

    it('should implement health checks and auto-recovery', async () => {
      // Mock health check system
      const healthStatus = {
        database: 'healthy',
        validation: 'degraded',
        calculation: 'unhealthy'
      };

      jest.spyOn(teamService as any, 'performHealthCheck').mockImplementation(
        (service: string) => Promise.resolve(healthStatus[service])
      );

      jest.spyOn(teamService as any, 'attemptServiceRecovery').mockImplementation(
        (service: string) => {
          if (service === 'validation') {
            healthStatus[service] = 'healthy';
            return Promise.resolve(true);
          }
          return Promise.resolve(false);
        }
      );

      // Trigger health check and recovery
      await teamService.performSystemHealthCheck();

      // Should attempt recovery for degraded/unhealthy services
      expect(teamService['attemptServiceRecovery']).toHaveBeenCalledWith('validation');
      expect(teamService['attemptServiceRecovery']).toHaveBeenCalledWith('calculation');

      // Should log recovery attempts
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Auto-recovery attempt'),
        expect.objectContaining({
          service: 'validation',
          previousStatus: 'degraded',
          recoverySuccessful: true
        })
      );

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Auto-recovery failed'),
        expect.objectContaining({
          service: 'calculation',
          status: 'unhealthy',
          manualInterventionRequired: true
        })
      );
    });
  });
});