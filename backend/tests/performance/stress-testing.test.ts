/**
 * Stress Testing for Queue System and Memory Management
 * Tests system behavior under extreme conditions
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { QueueManagerImpl } from '../../src/api/tabellen-eintrag/services/queue-manager';
import { TabellenBerechnungsServiceImpl } from '../../src/api/tabellen-eintrag/services/tabellen-berechnung';
import { SpielValidationService } from '../../src/api/spiel/services/validation';
import { DEFAULT_AUTOMATION_CONFIG } from '../../src/config/automation';
import { Priority, JobStatus } from '../../src/api/tabellen-eintrag/services/queue-manager';

// Stress testing utilities
class StressTestMonitor {
  private metrics: {
    startTime: number;
    endTime: number;
    memorySnapshots: NodeJS.MemoryUsage[];
    errorCount: number;
    successCount: number;
    timeouts: number;
  };

  constructor() {
    this.metrics = {
      startTime: 0,
      endTime: 0,
      memorySnapshots: [],
      errorCount: 0,
      successCount: 0,
      timeouts: 0
    };
  }

  start() {
    this.metrics.startTime = Date.now();
    this.metrics.memorySnapshots = [process.memoryUsage()];
  }

  recordSuccess() {
    this.metrics.successCount++;
  }

  recordError() {
    this.metrics.errorCount++;
  }

  recordTimeout() {
    this.metrics.timeouts++;
  }

  takeMemorySnapshot() {
    this.metrics.memorySnapshots.push(process.memoryUsage());
  }

  end() {
    this.metrics.endTime = Date.now();
    this.metrics.memorySnapshots.push(process.memoryUsage());
  }

  getResults() {
    const duration = this.metrics.endTime - this.metrics.startTime;
    const firstMemory = this.metrics.memorySnapshots[0];
    const lastMemory = this.metrics.memorySnapshots[this.metrics.memorySnapshots.length - 1];
    
    return {
      duration,
      totalOperations: this.metrics.successCount + this.metrics.errorCount,
      successCount: this.metrics.successCount,
      errorCount: this.metrics.errorCount,
      timeouts: this.metrics.timeouts,
      successRate: (this.metrics.successCount / (this.metrics.successCount + this.metrics.errorCount)) * 100,
      operationsPerSecond: (this.metrics.successCount + this.metrics.errorCount) / (duration / 1000),
      memoryGrowth: lastMemory.heapUsed - firstMemory.heapUsed,
      maxMemoryUsed: Math.max(...this.metrics.memorySnapshots.map(s => s.heapUsed)),
      memorySnapshots: this.metrics.memorySnapshots
    };
  }
}

// Mock Strapi with configurable delays and failures
const createMockStrapi = (config: { delay?: number; failureRate?: number } = {}) => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  db: {
    query: jest.fn(),
    transaction: jest.fn().mockImplementation(async (callback) => {
      if (config.delay) {
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }
      if (config.failureRate && Math.random() < config.failureRate) {
        throw new Error('Simulated database failure');
      }
      return await callback({});
    })
  },
  entityService: {
    findOne: jest.fn().mockImplementation(async () => {
      if (config.delay) {
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }
      if (config.failureRate && Math.random() < config.failureRate) {
        throw new Error('Simulated entity service failure');
      }
      return { id: 1, name: 'Test Liga' };
    }),
    findMany: jest.fn().mockImplementation(async () => {
      if (config.delay) {
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }
      if (config.failureRate && Math.random() < config.failureRate) {
        throw new Error('Simulated findMany failure');
      }
      return [];
    }),
    create: jest.fn().mockImplementation(async () => {
      if (config.delay) {
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }
      return {};
    }),
    update: jest.fn().mockImplementation(async () => {
      if (config.delay) {
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }
      return {};
    }),
    delete: jest.fn().mockResolvedValue({})
  },
  config: {
    get: jest.fn().mockReturnValue(DEFAULT_AUTOMATION_CONFIG)
  }
});

describe('Stress Testing - Queue System and Memory Management', () => {
  let queueManager: QueueManagerImpl;
  let tabellenService: TabellenBerechnungsServiceImpl;
  let validationService: SpielValidationService;
  let stressMonitor: StressTestMonitor;
  let mockStrapi: any;

  beforeAll(() => {
    validationService = new SpielValidationService();
    stressMonitor = new StressTestMonitor();
  });

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    global.strapi = mockStrapi;
    
    tabellenService = new TabellenBerechnungsServiceImpl(mockStrapi);
    
    const queueConfig = {
      ...DEFAULT_AUTOMATION_CONFIG.queue,
      concurrency: 8, // High concurrency for stress testing
      maxRetries: 3,
      jobTimeout: 10000,
      cleanupInterval: 5000
    };
    
    queueManager = new QueueManagerImpl(tabellenService, queueConfig);
  });

  afterEach(async () => {
    if (queueManager) {
      queueManager.pauseQueue();
      await queueManager.clearQueue();
      queueManager.destroy();
    }
  });

  describe('Extreme Load Stress Tests', () => {
    it('should handle 1000 jobs without system failure', async () => {
      const jobCount = 1000;
      stressMonitor.start();

      try {
        // Add jobs in batches to avoid overwhelming the system
        const batchSize = 100;
        const batches = Math.ceil(jobCount / batchSize);

        for (let batch = 0; batch < batches; batch++) {
          const batchPromises = Array.from({ length: batchSize }, async (_, i) => {
            const jobIndex = batch * batchSize + i;
            if (jobIndex >= jobCount) return;

            try {
              await queueManager.addCalculationJob(
                (jobIndex % 10) + 1, // Liga ID 1-10
                1, // Saison ID
                jobIndex % 3 === 0 ? Priority.HIGH : Priority.NORMAL
              );
              stressMonitor.recordSuccess();
            } catch (error) {
              stressMonitor.recordError();
            }
          });

          await Promise.all(batchPromises);
          stressMonitor.takeMemorySnapshot();

          // Brief pause between batches
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Process all jobs with timeout
        const processingPromise = queueManager.processQueue();
        const timeoutPromise = new Promise(resolve => setTimeout(resolve, 60000));

        await Promise.race([processingPromise, timeoutPromise]);
        await new Promise(resolve => setTimeout(resolve, 5000));

      } catch (error) {
        stressMonitor.recordError();
      }

      stressMonitor.end();
      const results = stressMonitor.getResults();

      // System should remain stable
      expect(results.duration).toBeLessThan(70000); // Within 70 seconds
      expect(results.memoryGrowth).toBeLessThan(500 * 1024 * 1024); // Less than 500MB growth
      expect(results.successRate).toBeGreaterThan(80); // At least 80% success rate

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBeGreaterThan(0);

      console.log(`Extreme Load Test Results (${jobCount} jobs):`);
      console.log(JSON.stringify(results, null, 2));
      console.log(`Final Queue Status:`, JSON.stringify(queueStatus, null, 2));
    });

    it('should handle rapid job additions without memory leaks', async () => {
      const iterations = 100;
      const jobsPerIteration = 50;
      
      stressMonitor.start();

      for (let i = 0; i < iterations; i++) {
        // Add jobs rapidly
        const addPromises = Array.from({ length: jobsPerIteration }, async (_, j) => {
          try {
            await queueManager.addCalculationJob(
              ((i * jobsPerIteration + j) % 5) + 1,
              1,
              Priority.NORMAL
            );
            stressMonitor.recordSuccess();
          } catch (error) {
            stressMonitor.recordError();
          }
        });

        await Promise.all(addPromises);

        // Process some jobs
        if (i % 10 === 0) {
          await queueManager.processQueue();
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
          
          stressMonitor.takeMemorySnapshot();
        }
      }

      // Final processing
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 2000));

      stressMonitor.end();
      const results = stressMonitor.getResults();

      // Memory should not grow excessively
      expect(results.memoryGrowth).toBeLessThan(200 * 1024 * 1024); // Less than 200MB growth
      expect(results.successRate).toBeGreaterThan(90); // High success rate

      console.log(`Rapid Addition Test Results:`);
      console.log(JSON.stringify(results, null, 2));
    });
  });

  describe('Failure Resilience Stress Tests', () => {
    it('should handle high failure rates gracefully', async () => {
      // Configure high failure rate
      mockStrapi = createMockStrapi({ failureRate: 0.3, delay: 10 });
      global.strapi = mockStrapi;
      
      tabellenService = new TabellenBerechnungsServiceImpl(mockStrapi);
      queueManager = new QueueManagerImpl(tabellenService, {
        ...DEFAULT_AUTOMATION_CONFIG.queue,
        concurrency: 4,
        maxRetries: 2,
        jobTimeout: 5000
      });

      const jobCount = 200;
      stressMonitor.start();

      // Add jobs
      for (let i = 0; i < jobCount; i++) {
        try {
          await queueManager.addCalculationJob(
            (i % 5) + 1,
            1,
            Priority.NORMAL
          );
          stressMonitor.recordSuccess();
        } catch (error) {
          stressMonitor.recordError();
        }
      }

      // Process with expected failures
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 10000));

      stressMonitor.end();
      const results = stressMonitor.getResults();
      const queueStatus = queueManager.getQueueStatus();

      // System should handle failures without crashing
      expect(results.duration).toBeLessThan(15000);
      expect(queueStatus.completedJobs + queueStatus.failedJobs).toBeGreaterThan(0);
      expect(queueStatus.completedJobs).toBeGreaterThan(0); // Some should succeed

      console.log(`High Failure Rate Test Results:`);
      console.log(JSON.stringify(results, null, 2));
      console.log(`Queue Status:`, JSON.stringify(queueStatus, null, 2));
    });

    it('should recover from complete system failures', async () => {
      const jobCount = 100;
      
      // Add jobs normally
      for (let i = 0; i < jobCount; i++) {
        await queueManager.addCalculationJob((i % 3) + 1, 1, Priority.NORMAL);
      }

      stressMonitor.start();

      // Simulate complete system failure
      mockStrapi = createMockStrapi({ failureRate: 1.0 }); // 100% failure rate
      global.strapi = mockStrapi;

      // Try to process (should fail)
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 2000));

      let queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.failedJobs).toBeGreaterThan(0);

      // Simulate system recovery
      mockStrapi = createMockStrapi({ failureRate: 0.0, delay: 5 }); // No failures
      global.strapi = mockStrapi;

      // Retry failed jobs (this would be done by retry mechanism)
      const deadLetterJobs = queueManager.getDeadLetterJobs();
      for (const job of deadLetterJobs.slice(0, 10)) { // Retry first 10
        try {
          await queueManager.addCalculationJob(job.ligaId, job.saisonId, job.priority);
          stressMonitor.recordSuccess();
        } catch (error) {
          stressMonitor.recordError();
        }
      }

      // Process recovered jobs
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 2000));

      stressMonitor.end();
      const results = stressMonitor.getResults();
      queueStatus = queueManager.getQueueStatus();

      // System should recover
      expect(queueStatus.completedJobs).toBeGreaterThan(0);
      expect(results.successRate).toBeGreaterThan(0);

      console.log(`System Recovery Test Results:`);
      console.log(JSON.stringify(results, null, 2));
    });
  });

  describe('Resource Exhaustion Tests', () => {
    it('should handle memory pressure gracefully', async () => {
      // Create memory pressure by keeping references to large objects
      const memoryHogs: any[] = [];
      
      stressMonitor.start();

      try {
        // Create memory pressure
        for (let i = 0; i < 100; i++) {
          memoryHogs.push(new Array(100000).fill(`memory-hog-${i}`));
          stressMonitor.takeMemorySnapshot();
        }

        // Add jobs under memory pressure
        const jobCount = 50;
        for (let i = 0; i < jobCount; i++) {
          try {
            await queueManager.addCalculationJob((i % 3) + 1, 1, Priority.NORMAL);
            stressMonitor.recordSuccess();
          } catch (error) {
            stressMonitor.recordError();
          }
        }

        // Process jobs under memory pressure
        await queueManager.processQueue();
        await new Promise(resolve => setTimeout(resolve, 3000));

      } finally {
        // Clean up memory hogs
        memoryHogs.length = 0;
        if (global.gc) {
          global.gc();
        }
      }

      stressMonitor.end();
      const results = stressMonitor.getResults();
      const queueStatus = queueManager.getQueueStatus();

      // System should handle memory pressure
      expect(results.successRate).toBeGreaterThan(50); // At least 50% success under pressure
      expect(queueStatus.completedJobs + queueStatus.failedJobs).toBeGreaterThan(0);

      console.log(`Memory Pressure Test Results:`);
      console.log(JSON.stringify(results, null, 2));
    });

    it('should handle timeout scenarios under load', async () => {
      // Configure slow operations
      mockStrapi = createMockStrapi({ delay: 100 }); // 100ms delay per operation
      global.strapi = mockStrapi;
      
      tabellenService = new TabellenBerechnungsServiceImpl(mockStrapi);
      queueManager = new QueueManagerImpl(tabellenService, {
        ...DEFAULT_AUTOMATION_CONFIG.queue,
        concurrency: 10,
        maxRetries: 1,
        jobTimeout: 500 // Very short timeout
      });

      const jobCount = 100;
      stressMonitor.start();

      // Add jobs that will likely timeout
      for (let i = 0; i < jobCount; i++) {
        try {
          await queueManager.addCalculationJob((i % 5) + 1, 1, Priority.NORMAL);
          stressMonitor.recordSuccess();
        } catch (error) {
          stressMonitor.recordError();
        }
      }

      // Process with expected timeouts
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 5000));

      stressMonitor.end();
      const results = stressMonitor.getResults();
      const queueStatus = queueManager.getQueueStatus();

      // System should handle timeouts gracefully
      expect(queueStatus.failedJobs).toBeGreaterThan(0); // Some should timeout
      expect(results.duration).toBeLessThan(10000); // Should not hang

      console.log(`Timeout Stress Test Results:`);
      console.log(JSON.stringify(results, null, 2));
      console.log(`Queue Status:`, JSON.stringify(queueStatus, null, 2));
    });
  });

  describe('Concurrency Stress Tests', () => {
    it('should handle maximum concurrency without deadlocks', async () => {
      const maxConcurrency = 20;
      
      queueManager = new QueueManagerImpl(tabellenService, {
        ...DEFAULT_AUTOMATION_CONFIG.queue,
        concurrency: maxConcurrency,
        maxRetries: 2,
        jobTimeout: 10000
      });

      const jobCount = maxConcurrency * 10; // 10 jobs per concurrent slot
      stressMonitor.start();

      // Add many jobs quickly
      const addPromises = Array.from({ length: jobCount }, async (_, i) => {
        try {
          await queueManager.addCalculationJob(
            (i % 10) + 1,
            1,
            i % 2 === 0 ? Priority.HIGH : Priority.NORMAL
          );
          stressMonitor.recordSuccess();
        } catch (error) {
          stressMonitor.recordError();
        }
      });

      await Promise.all(addPromises);

      // Process with maximum concurrency
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 15000));

      stressMonitor.end();
      const results = stressMonitor.getResults();
      const queueStatus = queueManager.getQueueStatus();

      // Should handle high concurrency
      expect(results.duration).toBeLessThan(20000);
      expect(queueStatus.completedJobs + queueStatus.failedJobs).toBeGreaterThan(0);
      expect(results.successRate).toBeGreaterThan(70);

      console.log(`Max Concurrency Test Results (${maxConcurrency} concurrent):`);
      console.log(JSON.stringify(results, null, 2));
    });

    it('should prevent race conditions under high concurrency', async () => {
      const concurrentOperations = 50;
      const operationsPerThread = 20;
      
      stressMonitor.start();

      // Create many concurrent operations
      const concurrentPromises = Array.from({ length: concurrentOperations }, async (_, threadId) => {
        const threadResults = { success: 0, errors: 0 };
        
        for (let i = 0; i < operationsPerThread; i++) {
          try {
            // Mix of operations that could cause race conditions
            if (i % 3 === 0) {
              await queueManager.addCalculationJob(threadId % 5 + 1, 1, Priority.NORMAL);
            } else if (i % 3 === 1) {
              queueManager.getQueueStatus();
            } else {
              queueManager.getMetrics();
            }
            
            threadResults.success++;
            stressMonitor.recordSuccess();
          } catch (error) {
            threadResults.errors++;
            stressMonitor.recordError();
          }
        }
        
        return threadResults;
      });

      const threadResults = await Promise.all(concurrentPromises);
      
      // Process any added jobs
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 2000));

      stressMonitor.end();
      const results = stressMonitor.getResults();

      // Should handle concurrent operations without race conditions
      expect(results.successRate).toBeGreaterThan(95); // Very high success rate
      expect(results.errorCount).toBeLessThan(results.totalOperations * 0.05); // Less than 5% errors

      const totalThreadSuccess = threadResults.reduce((sum, r) => sum + r.success, 0);
      const totalThreadErrors = threadResults.reduce((sum, r) => sum + r.errors, 0);

      console.log(`Race Condition Test Results:`);
      console.log(`Thread Success: ${totalThreadSuccess}, Thread Errors: ${totalThreadErrors}`);
      console.log(JSON.stringify(results, null, 2));
    });
  });

  describe('Long-Running Stress Tests', () => {
    it('should maintain stability over extended operation', async () => {
      const testDuration = 30000; // 30 seconds
      const jobInterval = 100; // Add job every 100ms
      
      stressMonitor.start();
      
      const startTime = Date.now();
      let jobCounter = 0;
      
      // Add jobs continuously for test duration
      const addJobsInterval = setInterval(async () => {
        if (Date.now() - startTime >= testDuration) {
          clearInterval(addJobsInterval);
          return;
        }
        
        try {
          await queueManager.addCalculationJob(
            (jobCounter % 5) + 1,
            1,
            jobCounter % 4 === 0 ? Priority.HIGH : Priority.NORMAL
          );
          jobCounter++;
          stressMonitor.recordSuccess();
          
          // Take memory snapshot every 50 jobs
          if (jobCounter % 50 === 0) {
            stressMonitor.takeMemorySnapshot();
          }
        } catch (error) {
          stressMonitor.recordError();
        }
      }, jobInterval);

      // Process jobs continuously
      const processInterval = setInterval(async () => {
        if (Date.now() - startTime >= testDuration) {
          clearInterval(processInterval);
          return;
        }
        
        await queueManager.processQueue();
      }, 1000);

      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, testDuration + 1000));

      // Final processing
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 2000));

      stressMonitor.end();
      const results = stressMonitor.getResults();
      const queueStatus = queueManager.getQueueStatus();

      // System should remain stable over time
      expect(results.duration).toBeGreaterThan(testDuration);
      expect(results.memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth
      expect(results.successRate).toBeGreaterThan(80);
      expect(queueStatus.completedJobs).toBeGreaterThan(0);

      console.log(`Long-Running Stress Test Results (${testDuration}ms):`);
      console.log(`Jobs Added: ${jobCounter}`);
      console.log(JSON.stringify(results, null, 2));
      console.log(`Final Queue Status:`, JSON.stringify(queueStatus, null, 2));
    });
  });
});