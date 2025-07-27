/**
 * Performance tests for hook services
 * Tests hook execution time, concurrent execution, and load testing
 */

import { HookServiceFactory } from '../../src/services/HookServiceFactory';
import { HookConfiguration, HookEvent } from '../../src/services/types';

// Mock Strapi for performance tests
const mockStrapi = {
  entityService: {
    findMany: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  db: {
    query: jest.fn()
  },
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
};

global.strapi = mockStrapi as any;

describe('Hook Performance Tests', () => {
  let factory: HookServiceFactory;
  let config: HookConfiguration;

  beforeEach(() => {
    config = {
      enableStrictValidation: true,
      enableAsyncCalculations: true,
      maxHookExecutionTime: 1000,
      retryAttempts: 3,
      timeoutMs: 5000
    };

    factory = new HookServiceFactory(config);
    jest.clearAllMocks();

    // Setup default mock responses for performance tests
    mockStrapi.entityService.findMany.mockResolvedValue([]);
    mockStrapi.entityService.findOne.mockResolvedValue(null);
  });

  describe('Hook Execution Time Tests', () => {
    it('should complete team hook within performance threshold', async () => {
      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Performance Test Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const start = performance.now();
      const result = await teamService.beforeCreate(event);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(result.executionTime).toBeLessThan(50); // Internal execution time should be even faster
    });

    it('should complete season hook within performance threshold', async () => {
      const saisonService = factory.createSaisonService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'saison',
        data: {
          name: '2024/2025',
          startDate: '2024-08-01',
          endDate: '2025-05-31',
          active: false
        },
        params: {},
        timestamp: new Date()
      };

      const start = performance.now();
      const result = await saisonService.beforeCreate(event);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100);
      expect(result.executionTime).toBeLessThan(50);
    });

    it('should complete table hook within performance threshold', async () => {
      const tableService = factory.createTableService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data: {
          team: 1,
          liga: 1,
          saison: 1,
          spiele: 10,
          siege: 6,
          unentschieden: 2,
          niederlagen: 2,
          tore: 18,
          gegentore: 12
        },
        params: {},
        timestamp: new Date()
      };

      const start = performance.now();
      const result = await tableService.beforeCreate(event);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(100);
      expect(result.executionTime).toBeLessThan(50);
    });

    it('should handle complex validation within time limits', async () => {
      // Mock large dataset for validation
      const largeTeamList = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Team ${i + 1}`,
        liga: Math.floor(i / 50) + 1,
        saison: 1
      }));

      mockStrapi.entityService.findMany.mockResolvedValue(largeTeamList);

      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'New Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const start = performance.now();
      const result = await teamService.beforeCreate(event);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(200); // Should handle large datasets within 200ms
    });

    it('should timeout slow operations correctly', async () => {
      // Mock slow database response
      mockStrapi.entityService.findMany.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 2000))
      );

      const fastConfig = { ...config, maxHookExecutionTime: 500 };
      const fastFactory = new HookServiceFactory(fastConfig);
      const teamService = fastFactory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Timeout Test Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const start = performance.now();
      const result = await teamService.beforeCreate(event);
      const duration = performance.now() - start;

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(duration).toBeLessThan(1000); // Should timeout quickly
      expect(result.errors.some(e => e.message.includes('timeout'))).toBe(true);
    });
  });

  describe('Concurrent Hook Execution Tests', () => {
    it('should handle concurrent team creations efficiently', async () => {
      const teamService = factory.createTeamService();

      const events = Array.from({ length: 20 }, (_, i) => ({
        type: 'beforeCreate' as const,
        contentType: 'team',
        data: {
          name: `Concurrent Team ${i + 1}`,
          liga: Math.floor(i / 5) + 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      }));

      const start = performance.now();
      const results = await Promise.all(
        events.map(event => teamService.beforeCreate(event))
      );
      const duration = performance.now() - start;

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.canProceed).toBe(true);
      });

      // Should complete all 20 operations within 1 second
      expect(duration).toBeLessThan(1000);

      // Average execution time per operation should be reasonable
      const avgTime = duration / results.length;
      expect(avgTime).toBeLessThan(50);
    });

    it('should handle mixed concurrent operations across services', async () => {
      const teamService = factory.createTeamService();
      const saisonService = factory.createSaisonService();
      const tableService = factory.createTableService();

      const operations = [
        // Team operations
        ...Array.from({ length: 10 }, (_, i) => ({
          service: teamService,
          event: {
            type: 'beforeCreate' as const,
            contentType: 'team',
            data: {
              name: `Team ${i + 1}`,
              liga: 1,
              saison: 1
            },
            params: {},
            timestamp: new Date()
          }
        })),
        // Season operations
        ...Array.from({ length: 5 }, (_, i) => ({
          service: saisonService,
          event: {
            type: 'beforeCreate' as const,
            contentType: 'saison',
            data: {
              name: `Season ${2024 + i}/${2025 + i}`,
              startDate: `${2024 + i}-08-01`,
              endDate: `${2025 + i}-05-31`,
              active: false
            },
            params: {},
            timestamp: new Date()
          }
        })),
        // Table operations
        ...Array.from({ length: 15 }, (_, i) => ({
          service: tableService,
          event: {
            type: 'beforeCreate' as const,
            contentType: 'tabellen-eintrag',
            data: {
              team: i + 1,
              liga: Math.floor(i / 5) + 1,
              saison: 1,
              spiele: 10,
              siege: Math.floor(Math.random() * 8),
              unentschieden: Math.floor(Math.random() * 4),
              niederlagen: Math.floor(Math.random() * 4),
              tore: Math.floor(Math.random() * 30),
              gegentore: Math.floor(Math.random() * 20)
            },
            params: {},
            timestamp: new Date()
          }
        }))
      ];

      const start = performance.now();
      const results = await Promise.all(
        operations.map(({ service, event }) => service.beforeCreate(event))
      );
      const duration = performance.now() - start;

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.canProceed).toBe(true);
      });

      // Should handle 30 mixed operations within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should maintain performance under high concurrency', async () => {
      const teamService = factory.createTeamService();

      // Create 100 concurrent operations
      const events = Array.from({ length: 100 }, (_, i) => ({
        type: 'beforeCreate' as const,
        contentType: 'team',
        data: {
          name: `High Concurrency Team ${i + 1}`,
          liga: Math.floor(i / 20) + 1,
          saison: Math.floor(i / 50) + 1
        },
        params: {},
        timestamp: new Date()
      }));

      const start = performance.now();
      const results = await Promise.all(
        events.map(event => teamService.beforeCreate(event))
      );
      const duration = performance.now() - start;

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.canProceed).toBe(true);
      });

      // Should handle 100 operations within 3 seconds
      expect(duration).toBeLessThan(3000);

      // No operation should take longer than 100ms
      results.forEach(result => {
        expect(result.executionTime).toBeLessThan(100);
      });
    });

    it('should handle concurrent updates without race conditions', async () => {
      const tableService = factory.createTableService();

      // Mock existing table entry
      mockStrapi.entityService.findOne.mockResolvedValue({
        id: 1,
        team: 1,
        liga: 1,
        saison: 1,
        punkte: 20
      });

      // Create concurrent update operations
      const events = Array.from({ length: 10 }, (_, i) => ({
        type: 'beforeUpdate' as const,
        contentType: 'tabellen-eintrag',
        data: {
          siege: 5 + i,
          unentschieden: 3,
          niederlagen: 2 - Math.floor(i / 5)
        },
        where: { id: 1 },
        params: {},
        timestamp: new Date()
      }));

      const start = performance.now();
      const results = await Promise.all(
        events.map(event => tableService.beforeUpdate(event))
      );
      const duration = performance.now() - start;

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.canProceed).toBe(true);
        expect(result.modifiedData).toHaveProperty('punkte');
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Load Testing for Background Jobs', () => {
    it('should handle high volume of background job scheduling', async () => {
      const teamService = factory.createTeamService();

      // Create many teams that will trigger background jobs
      const events = Array.from({ length: 50 }, (_, i) => ({
        type: 'afterCreate' as const,
        contentType: 'team',
        data: {
          id: i + 1,
          name: `Load Test Team ${i + 1}`,
          liga: Math.floor(i / 10) + 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      }));

      const start = performance.now();
      await Promise.all(
        events.map(event => teamService.afterCreate(event))
      );
      const duration = performance.now() - start;

      // Should schedule all background jobs within 1 second
      expect(duration).toBeLessThan(1000);

      // Verify that background jobs were scheduled
      expect(mockStrapi.log.info).toHaveBeenCalledTimes(50);
    });

    it('should handle background job queue under load', async () => {
      const tableService = factory.createTableService();

      // Create many table updates that trigger position recalculations
      const events = Array.from({ length: 100 }, (_, i) => ({
        type: 'afterUpdate' as const,
        contentType: 'tabellen-eintrag',
        data: {
          id: i + 1,
          team: i + 1,
          liga: Math.floor(i / 20) + 1,
          saison: 1,
          punkte: Math.floor(Math.random() * 50),
          tordifferenz: Math.floor(Math.random() * 20) - 10
        },
        params: {},
        timestamp: new Date()
      }));

      const start = performance.now();
      await Promise.all(
        events.map(event => tableService.afterUpdate(event))
      );
      const duration = performance.now() - start;

      // Should handle 100 background job schedules within 2 seconds
      expect(duration).toBeLessThan(2000);
    });

    it('should prioritize high-priority background jobs', async () => {
      const saisonService = factory.createSaisonService();

      // Create season activation events (high priority)
      const highPriorityEvents = Array.from({ length: 5 }, (_, i) => ({
        type: 'afterUpdate' as const,
        contentType: 'saison',
        data: {
          id: i + 1,
          name: `Priority Season ${i + 1}`,
          active: true
        },
        params: {},
        timestamp: new Date()
      }));

      const start = performance.now();
      await Promise.all(
        highPriorityEvents.map(event => saisonService.afterUpdate(event))
      );
      const duration = performance.now() - start;

      // High priority jobs should be scheduled quickly
      expect(duration).toBeLessThan(500);
    });

    it('should handle job queue overflow gracefully', async () => {
      const teamService = factory.createTeamService();

      // Create an overwhelming number of background jobs
      const events = Array.from({ length: 1000 }, (_, i) => ({
        type: 'afterCreate' as const,
        contentType: 'team',
        data: {
          id: i + 1,
          name: `Overflow Test Team ${i + 1}`,
          liga: Math.floor(i / 100) + 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      }));

      const start = performance.now();
      const results = await Promise.allSettled(
        events.map(event => teamService.afterCreate(event))
      );
      const duration = performance.now() - start;

      // Most should succeed, some might be throttled
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBeGreaterThan(900); // At least 90% should succeed

      // Should handle overflow within reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Memory and Resource Performance', () => {
    it('should not leak memory during repeated operations', async () => {
      const teamService = factory.createTeamService();

      // Measure initial memory usage
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        const event: HookEvent = {
          type: 'beforeCreate',
          contentType: 'team',
          data: {
            name: `Memory Test Team ${i + 1}`,
            liga: 1,
            saison: 1
          },
          params: {},
          timestamp: new Date()
        };

        await teamService.beforeCreate(event);

        // Force garbage collection periodically
        if (i % 20 === 0 && global.gc) {
          global.gc();
        }
      }

      // Measure final memory usage
      if (global.gc) {
        global.gc();
      }
      const finalMemory = process.memoryUsage().heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle large data objects efficiently', async () => {
      const tableService = factory.createTableService();

      // Create event with large data object
      const largeData = {
        team: 1,
        liga: 1,
        saison: 1,
        spiele: 100,
        siege: 60,
        unentschieden: 25,
        niederlagen: 15,
        tore: 180,
        gegentore: 120,
        // Add large metadata
        metadata: {
          games: Array.from({ length: 100 }, (_, i) => ({
            gameId: i + 1,
            opponent: `Opponent ${i + 1}`,
            result: Math.random() > 0.5 ? 'win' : 'loss',
            goals: Math.floor(Math.random() * 5),
            details: `Game details for match ${i + 1}`.repeat(10)
          }))
        }
      };

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data: largeData,
        params: {},
        timestamp: new Date()
      };

      const start = performance.now();
      const result = await tableService.beforeCreate(event);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(200); // Should handle large objects within 200ms
    });

    it('should scale with increasing data volume', async () => {
      const teamService = factory.createTeamService();

      // Test with increasing data volumes
      const volumes = [10, 50, 100, 200];
      const results = [];

      for (const volume of volumes) {
        // Mock dataset of specified volume
        const mockData = Array.from({ length: volume }, (_, i) => ({
          id: i + 1,
          name: `Team ${i + 1}`,
          liga: Math.floor(i / 10) + 1,
          saison: 1
        }));

        mockStrapi.entityService.findMany.mockResolvedValue(mockData);

        const event: HookEvent = {
          type: 'beforeCreate',
          contentType: 'team',
          data: {
            name: 'Scale Test Team',
            liga: 1,
            saison: 1
          },
          params: {},
          timestamp: new Date()
        };

        const start = performance.now();
        const result = await teamService.beforeCreate(event);
        const duration = performance.now() - start;

        results.push({ volume, duration, success: result.success });

        expect(result.success).toBe(true);
      }

      // Performance should scale reasonably (not exponentially)
      const maxDuration = Math.max(...results.map(r => r.duration));
      expect(maxDuration).toBeLessThan(500); // Even with 200 items, should be under 500ms

      // Performance degradation should be linear, not exponential
      const firstDuration = results[0].duration;
      const lastDuration = results[results.length - 1].duration;
      const scaleFactor = lastDuration / firstDuration;
      expect(scaleFactor).toBeLessThan(10); // Should not be more than 10x slower
    });
  });

  describe('Database Performance', () => {
    it('should optimize database queries for performance', async () => {
      const teamService = factory.createTeamService();

      let queryCount = 0;
      const originalFindMany = mockStrapi.entityService.findMany;
      mockStrapi.entityService.findMany = jest.fn().mockImplementation((...args) => {
        queryCount++;
        return originalFindMany.call(mockStrapi.entityService, ...args);
      });

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Query Optimization Test',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      await teamService.beforeCreate(event);

      // Should minimize database queries (ideally 3: teams, liga, saison)
      expect(queryCount).toBeLessThanOrEqual(5);

      // Restore original method
      mockStrapi.entityService.findMany = originalFindMany;
    });

    it('should handle database connection limits', async () => {
      const services = Array.from({ length: 20 }, () => factory.createTeamService());

      // Simulate database connection limit by making some queries fail
      let connectionCount = 0;
      mockStrapi.entityService.findMany.mockImplementation(() => {
        connectionCount++;
        if (connectionCount > 15) {
          return Promise.reject(new Error('Connection pool exhausted'));
        }
        return Promise.resolve([]);
      });

      const events = services.map((service, i) => ({
        service,
        event: {
          type: 'beforeCreate' as const,
          contentType: 'team',
          data: {
            name: `Connection Test Team ${i + 1}`,
            liga: 1,
            saison: 1
          },
          params: {},
          timestamp: new Date()
        }
      }));

      const results = await Promise.allSettled(
        events.map(({ service, event }) => service.beforeCreate(event))
      );

      // Some should succeed, some should fail gracefully
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(successful).toBeGreaterThan(0);
      expect(failed).toBeGreaterThan(0);
      expect(successful + failed).toBe(20);
    });
  });

  describe('Performance Monitoring and Alerting', () => {
    it('should detect slow hook executions', async () => {
      // Mock slow operation
      mockStrapi.entityService.findMany.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 150))
      );

      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Slow Operation Test',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThan(100);

      // Should log warning for slow execution
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow hook execution detected'),
        expect.objectContaining({
          executionTime: expect.any(Number),
          threshold: expect.any(Number)
        })
      );
    });

    it('should track performance metrics over time', async () => {
      const teamService = factory.createTeamService();

      const events = Array.from({ length: 10 }, (_, i) => ({
        type: 'beforeCreate' as const,
        contentType: 'team',
        data: {
          name: `Metrics Test Team ${i + 1}`,
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      }));

      const results = await Promise.all(
        events.map(event => teamService.beforeCreate(event))
      );

      // All should have execution time recorded
      results.forEach(result => {
        expect(result.executionTime).toBeGreaterThan(0);
        expect(typeof result.executionTime).toBe('number');
      });

      // Calculate performance statistics
      const executionTimes = results.map(r => r.executionTime);
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);

      expect(avgTime).toBeLessThan(50);
      expect(maxTime).toBeLessThan(100);
      expect(minTime).toBeGreaterThan(0);
    });

    it('should alert on performance degradation', async () => {
      const teamService = factory.createTeamService();

      // Simulate performance degradation
      let operationCount = 0;
      mockStrapi.entityService.findMany.mockImplementation(() => {
        operationCount++;
        const delay = operationCount * 10; // Increasing delay
        return new Promise(resolve => setTimeout(() => resolve([]), delay));
      });

      const events = Array.from({ length: 5 }, (_, i) => ({
        type: 'beforeCreate' as const,
        contentType: 'team',
        data: {
          name: `Degradation Test Team ${i + 1}`,
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      }));

      const results = await Promise.all(
        events.map(event => teamService.beforeCreate(event))
      );

      // Later operations should be slower
      expect(results[4].executionTime).toBeGreaterThan(results[0].executionTime);

      // Should detect performance degradation
      const slowOperations = results.filter(r => r.executionTime > 30);
      expect(slowOperations.length).toBeGreaterThan(0);
    });
  });
});