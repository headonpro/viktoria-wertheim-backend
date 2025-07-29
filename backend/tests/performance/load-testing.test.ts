/**
 * Load Testing for Tabellen Automation System
 * Tests system performance under various load conditions
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { SpielLifecycleImpl } from '../../src/api/spiel/lifecycles';
import { SpielValidationService } from '../../src/api/spiel/services/validation';
import { QueueManagerImpl } from '../../src/api/tabellen-eintrag/services/queue-manager';
import { TabellenBerechnungsServiceImpl } from '../../src/api/tabellen-eintrag/services/tabellen-berechnung';
import { AdminController } from '../../src/api/tabellen-eintrag/controllers/admin';
import { DEFAULT_AUTOMATION_CONFIG } from '../../src/config/automation';
import { SpielStatus, Priority } from '../../src/api/spiel/lifecycles';

// Performance monitoring utilities
class PerformanceMonitor {
  private startTime: number = 0;
  private endTime: number = 0;
  private memoryStart: NodeJS.MemoryUsage;
  private memoryEnd: NodeJS.MemoryUsage;

  start() {
    this.startTime = Date.now();
    this.memoryStart = process.memoryUsage();
  }

  end() {
    this.endTime = Date.now();
    this.memoryEnd = process.memoryUsage();
  }

  getDuration() {
    return this.endTime - this.startTime;
  }

  getMemoryDelta() {
    return {
      rss: this.memoryEnd.rss - this.memoryStart.rss,
      heapUsed: this.memoryEnd.heapUsed - this.memoryStart.heapUsed,
      heapTotal: this.memoryEnd.heapTotal - this.memoryStart.heapTotal,
      external: this.memoryEnd.external - this.memoryStart.external
    };
  }

  getMemoryUsage() {
    return {
      start: this.memoryStart,
      end: this.memoryEnd,
      delta: this.getMemoryDelta()
    };
  }
}

// Mock Strapi with performance considerations
const mockStrapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  db: {
    query: jest.fn(),
    transaction: jest.fn().mockImplementation(async (callback) => {
      // Simulate database transaction overhead
      await new Promise(resolve => setTimeout(resolve, 1));
      return await callback({});
    })
  },
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  config: {
    get: jest.fn().mockReturnValue(DEFAULT_AUTOMATION_CONFIG)
  }
};

global.strapi = mockStrapi as any;

describe('Load Testing - Tabellen Automation System', () => {
  let lifecycle: SpielLifecycleImpl;
  let validationService: SpielValidationService;
  let queueManager: QueueManagerImpl;
  let tabellenService: TabellenBerechnungsServiceImpl;
  let adminController: AdminController;
  let performanceMonitor: PerformanceMonitor;

  const testLiga = { id: 1, name: 'Bundesliga' };
  const testSaison = { id: 1, name: '2023/24', jahr: 2023 };
  const teams = Array.from({ length: 18 }, (_, i) => ({
    id: i + 1,
    name: `Team ${i + 1}`
  }));

  const createTestSpiel = (id: number, heimTeam: any, gastTeam: any, heimTore?: number, gastTore?: number) => ({
    id,
    datum: '2023-10-15T15:00:00Z',
    liga: testLiga,
    saison: testSaison,
    heim_team: heimTeam,
    gast_team: gastTeam,
    heim_tore: heimTore ?? Math.floor(Math.random() * 5),
    gast_tore: gastTore ?? Math.floor(Math.random() * 5),
    spieltag: Math.floor(Math.random() * 34) + 1,
    status: SpielStatus.BEENDET,
    notizen: ''
  });

  beforeAll(() => {
    // Initialize services with performance-optimized configuration
    validationService = new SpielValidationService();
    tabellenService = new TabellenBerechnungsServiceImpl(mockStrapi);
    
    const queueConfig = {
      ...DEFAULT_AUTOMATION_CONFIG.queue,
      concurrency: 4, // Higher concurrency for load testing
      maxRetries: 2,
      jobTimeout: 30000,
      cleanupInterval: 10000
    };
    
    queueManager = new QueueManagerImpl(tabellenService, queueConfig);
    lifecycle = new SpielLifecycleImpl(validationService, queueManager);
    adminController = new AdminController(queueManager, null as any, mockStrapi);
    
    performanceMonitor = new PerformanceMonitor();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup realistic mock responses with slight delays to simulate database operations
    mockStrapi.entityService.findOne.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return testLiga;
    });
    
    mockStrapi.entityService.findMany.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 2));
      return [];
    });
    
    mockStrapi.entityService.create.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return {};
    });
    
    mockStrapi.entityService.update.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 1));
      return {};
    });

    mockStrapi.db.query.mockReturnValue({
      findMany: jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 2));
        return [];
      }),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({})
    });
  });

  afterEach(async () => {
    if (queueManager) {
      queueManager.pauseQueue();
      await queueManager.clearQueue();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });

  afterAll(async () => {
    if (queueManager) {
      queueManager.destroy();
    }
  });

  describe('Concurrent Game Updates Load Test', () => {
    it('should handle 100 concurrent game updates within performance limits', async () => {
      const gameCount = 100;
      const games = Array.from({ length: gameCount }, (_, i) => 
        createTestSpiel(i + 1, teams[i % 18], teams[(i + 1) % 18])
      );

      performanceMonitor.start();

      // Create all games concurrently
      const createPromises = games.map(game => 
        lifecycle.afterCreate({
          result: game,
          params: {}
        })
      );

      await Promise.all(createPromises);

      // Process all jobs
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 1000));

      performanceMonitor.end();

      const duration = performanceMonitor.getDuration();
      const memoryDelta = performanceMonitor.getMemoryDelta();

      // Performance assertions
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      expect(memoryDelta.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB heap increase

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.completedJobs + queueStatus.failedJobs).toBeGreaterThan(0);

      console.log(`Load Test Results - 100 concurrent games:`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Memory Delta: ${JSON.stringify(memoryDelta, null, 2)}`);
      console.log(`Queue Status: ${JSON.stringify(queueStatus, null, 2)}`);
    });

    it('should maintain performance with 500 sequential game updates', async () => {
      const gameCount = 500;
      const batchSize = 50;
      const totalBatches = Math.ceil(gameCount / batchSize);

      performanceMonitor.start();

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchGames = Array.from({ length: batchSize }, (_, i) => {
          const gameId = batch * batchSize + i + 1;
          return createTestSpiel(gameId, teams[gameId % 18], teams[(gameId + 1) % 18]);
        });

        // Process batch
        const batchPromises = batchGames.map(game => 
          lifecycle.afterCreate({
            result: game,
            params: {}
          })
        );

        await Promise.all(batchPromises);

        // Process queue periodically
        if (batch % 5 === 0) {
          await queueManager.processQueue();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Final queue processing
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 2000));

      performanceMonitor.end();

      const duration = performanceMonitor.getDuration();
      const memoryDelta = performanceMonitor.getMemoryDelta();

      // Performance assertions
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
      expect(memoryDelta.heapUsed).toBeLessThan(200 * 1024 * 1024); // Less than 200MB heap increase

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.completedJobs + queueStatus.failedJobs).toBeGreaterThan(0);

      console.log(`Load Test Results - 500 sequential games:`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Memory Delta: ${JSON.stringify(memoryDelta, null, 2)}`);
      console.log(`Queue Status: ${JSON.stringify(queueStatus, null, 2)}`);
    });
  });

  describe('Queue System Load Test', () => {
    it('should handle high-frequency job additions', async () => {
      const jobCount = 200;
      
      performanceMonitor.start();

      // Add jobs as fast as possible
      const addJobPromises = Array.from({ length: jobCount }, (_, i) => 
        queueManager.addCalculationJob(
          (i % 5) + 1, // Liga ID 1-5
          1, // Saison ID
          i % 2 === 0 ? Priority.HIGH : Priority.NORMAL
        )
      );

      await Promise.all(addJobPromises);

      performanceMonitor.end();

      const duration = performanceMonitor.getDuration();
      const queueStatus = queueManager.getQueueStatus();

      // Performance assertions
      expect(duration).toBeLessThan(5000); // Should add all jobs within 5 seconds
      expect(queueStatus.totalJobs).toBeGreaterThan(0);
      expect(queueStatus.totalJobs).toBeLessThanOrEqual(jobCount); // Duplicate prevention might reduce count

      console.log(`Queue Load Test Results - ${jobCount} jobs:`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Jobs per second: ${(jobCount / duration * 1000).toFixed(2)}`);
      console.log(`Queue Status: ${JSON.stringify(queueStatus, null, 2)}`);
    });

    it('should process jobs efficiently under load', async () => {
      // Add jobs with different priorities
      const highPriorityJobs = 20;
      const normalPriorityJobs = 50;
      const lowPriorityJobs = 30;

      // Add high priority jobs
      for (let i = 0; i < highPriorityJobs; i++) {
        await queueManager.addCalculationJob(1, 1, Priority.HIGH);
      }

      // Add normal priority jobs
      for (let i = 0; i < normalPriorityJobs; i++) {
        await queueManager.addCalculationJob(2, 1, Priority.NORMAL);
      }

      // Add low priority jobs
      for (let i = 0; i < lowPriorityJobs; i++) {
        await queueManager.addCalculationJob(3, 1, Priority.LOW);
      }

      performanceMonitor.start();

      // Process all jobs
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 5000));

      performanceMonitor.end();

      const duration = performanceMonitor.getDuration();
      const queueStatus = queueManager.getQueueStatus();
      const metrics = queueManager.getMetrics();

      // Performance assertions
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      expect(queueStatus.completedJobs + queueStatus.failedJobs).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);

      console.log(`Queue Processing Load Test Results:`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Completed Jobs: ${queueStatus.completedJobs}`);
      console.log(`Failed Jobs: ${queueStatus.failedJobs}`);
      console.log(`Average Processing Time: ${metrics.averageProcessingTime}ms`);
      console.log(`Success Rate: ${metrics.successRate}%`);
    });
  });

  describe('Memory Usage and Leak Detection', () => {
    it('should not have memory leaks during extended operation', async () => {
      const iterations = 50;
      const memorySnapshots: NodeJS.MemoryUsage[] = [];

      for (let i = 0; i < iterations; i++) {
        // Take memory snapshot
        memorySnapshots.push(process.memoryUsage());

        // Create and process some games
        const games = Array.from({ length: 10 }, (_, j) => 
          createTestSpiel(i * 10 + j + 1, teams[j % 18], teams[(j + 1) % 18])
        );

        for (const game of games) {
          await lifecycle.afterCreate({
            result: game,
            params: {}
          });
        }

        await queueManager.processQueue();
        await new Promise(resolve => setTimeout(resolve, 50));

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      // Analyze memory usage trend
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;

      // Memory growth should be reasonable (less than 50MB for 500 operations)
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);

      console.log(`Memory Leak Test Results:`);
      console.log(`Initial Heap: ${(firstSnapshot.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Final Heap: ${(lastSnapshot.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Memory Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle large datasets without excessive memory usage', async () => {
      // Create a large dataset
      const largeGameSet = Array.from({ length: 1000 }, (_, i) => 
        createTestSpiel(i + 1, teams[i % 18], teams[(i + 1) % 18])
      );

      // Mock large dataset response
      mockStrapi.entityService.findMany.mockResolvedValue(largeGameSet);

      performanceMonitor.start();

      // Trigger calculation with large dataset
      await queueManager.addCalculationJob(testLiga.id, testSaison.id);
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 2000));

      performanceMonitor.end();

      const duration = performanceMonitor.getDuration();
      const memoryDelta = performanceMonitor.getMemoryDelta();

      // Performance assertions
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      expect(memoryDelta.heapUsed).toBeLessThan(100 * 1024 * 1024); // Less than 100MB for processing 1000 games

      console.log(`Large Dataset Test Results:`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Memory Delta: ${JSON.stringify(memoryDelta, null, 2)}`);
    });
  });

  describe('Stress Testing', () => {
    it('should handle system overload gracefully', async () => {
      // Create extreme load
      const extremeGameCount = 1000;
      const games = Array.from({ length: extremeGameCount }, (_, i) => 
        createTestSpiel(i + 1, teams[i % 18], teams[(i + 1) % 18])
      );

      performanceMonitor.start();

      // Add all games as fast as possible
      const promises = games.map(game => 
        lifecycle.afterCreate({
          result: game,
          params: {}
        }).catch(error => {
          // Catch individual errors to prevent Promise.all from failing
          console.warn(`Game creation failed: ${error.message}`);
          return null;
        })
      );

      await Promise.all(promises);

      // Process with timeout
      const processingTimeout = new Promise(resolve => setTimeout(resolve, 30000));
      const processingPromise = queueManager.processQueue().then(() => 
        new Promise(resolve => setTimeout(resolve, 5000))
      );

      await Promise.race([processingPromise, processingTimeout]);

      performanceMonitor.end();

      const duration = performanceMonitor.getDuration();
      const queueStatus = queueManager.getQueueStatus();
      const memoryDelta = performanceMonitor.getMemoryDelta();

      // System should remain stable under extreme load
      expect(duration).toBeLessThan(35000); // Should complete or timeout within 35 seconds
      expect(memoryDelta.heapUsed).toBeLessThan(500 * 1024 * 1024); // Less than 500MB heap increase

      console.log(`Stress Test Results - ${extremeGameCount} games:`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Queue Status: ${JSON.stringify(queueStatus, null, 2)}`);
      console.log(`Memory Delta: ${JSON.stringify(memoryDelta, null, 2)}`);
    });

    it('should recover from temporary failures under load', async () => {
      let failureCount = 0;
      const maxFailures = 50;

      // Mock intermittent failures
      mockStrapi.entityService.findMany.mockImplementation(async () => {
        failureCount++;
        if (failureCount <= maxFailures && failureCount % 3 === 0) {
          throw new Error('Temporary database error');
        }
        await new Promise(resolve => setTimeout(resolve, 2));
        return [];
      });

      const gameCount = 100;
      const games = Array.from({ length: gameCount }, (_, i) => 
        createTestSpiel(i + 1, teams[i % 18], teams[(i + 1) % 18])
      );

      performanceMonitor.start();

      // Process games with expected failures
      for (const game of games) {
        await lifecycle.afterCreate({
          result: game,
          params: {}
        });
      }

      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 10000));

      performanceMonitor.end();

      const duration = performanceMonitor.getDuration();
      const queueStatus = queueManager.getQueueStatus();

      // System should handle failures and continue processing
      expect(queueStatus.completedJobs + queueStatus.failedJobs).toBeGreaterThan(0);
      expect(queueStatus.completedJobs).toBeGreaterThan(queueStatus.failedJobs);

      console.log(`Failure Recovery Test Results:`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Total Failures Injected: ${maxFailures}`);
      console.log(`Queue Status: ${JSON.stringify(queueStatus, null, 2)}`);
    });
  });

  describe('Admin Panel Performance', () => {
    it('should handle multiple concurrent admin requests', async () => {
      const concurrentRequests = 20;

      performanceMonitor.start();

      // Create concurrent admin requests
      const adminPromises = Array.from({ length: concurrentRequests }, async (_, i) => {
        const ctx = {
          params: { ligaId: (i % 5) + 1 },
          request: { body: { description: `Concurrent request ${i}` } },
          response: {}
        };

        return adminController.triggerRecalculation(ctx);
      });

      const results = await Promise.all(adminPromises);

      performanceMonitor.end();

      const duration = performanceMonitor.getDuration();
      const successfulRequests = results.filter(r => r.success).length;

      // Performance assertions
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(successfulRequests).toBeGreaterThan(0);

      console.log(`Admin Panel Load Test Results:`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Successful Requests: ${successfulRequests}/${concurrentRequests}`);
      console.log(`Requests per second: ${(concurrentRequests / duration * 1000).toFixed(2)}`);
    });

    it('should provide queue status efficiently under load', async () => {
      // Add many jobs to create load
      for (let i = 0; i < 100; i++) {
        await queueManager.addCalculationJob((i % 5) + 1, 1);
      }

      const statusRequestCount = 50;
      
      performanceMonitor.start();

      // Make many concurrent status requests
      const statusPromises = Array.from({ length: statusRequestCount }, () => 
        adminController.getQueueStatus({ response: {} })
      );

      const statusResults = await Promise.all(statusPromises);

      performanceMonitor.end();

      const duration = performanceMonitor.getDuration();

      // All requests should succeed quickly
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(statusResults).toHaveLength(statusRequestCount);
      
      statusResults.forEach(status => {
        expect(status).toHaveProperty('totalJobs');
        expect(status).toHaveProperty('pendingJobs');
      });

      console.log(`Queue Status Load Test Results:`);
      console.log(`Duration: ${duration}ms`);
      console.log(`Status requests per second: ${(statusRequestCount / duration * 1000).toFixed(2)}`);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet performance benchmarks for small league (16 teams)', async () => {
      const smallLeagueGames = Array.from({ length: 240 }, (_, i) => // 16 teams * 15 games each
        createTestSpiel(i + 1, teams[i % 16], teams[(i + 1) % 16])
      );

      mockStrapi.entityService.findMany.mockResolvedValue(smallLeagueGames);

      performanceMonitor.start();

      await queueManager.addCalculationJob(testLiga.id, testSaison.id);
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 1000));

      performanceMonitor.end();

      const duration = performanceMonitor.getDuration();

      // Should meet requirement: calculation under 5 seconds for small league
      expect(duration).toBeLessThan(5000);

      console.log(`Small League Benchmark (16 teams, 240 games): ${duration}ms`);
    });

    it('should meet performance benchmarks for large league (18 teams)', async () => {
      const largeLeagueGames = Array.from({ length: 306 }, (_, i) => // 18 teams * 17 games each
        createTestSpiel(i + 1, teams[i % 18], teams[(i + 1) % 18])
      );

      mockStrapi.entityService.findMany.mockResolvedValue(largeLeagueGames);

      performanceMonitor.start();

      await queueManager.addCalculationJob(testLiga.id, testSaison.id);
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 2000));

      performanceMonitor.end();

      const duration = performanceMonitor.getDuration();

      // Should meet requirement: calculation under 15 seconds for large league
      expect(duration).toBeLessThan(15000);

      console.log(`Large League Benchmark (18 teams, 306 games): ${duration}ms`);
    });
  });
});