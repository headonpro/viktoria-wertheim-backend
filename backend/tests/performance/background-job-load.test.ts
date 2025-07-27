/**
 * Load testing for background job system
 * Tests job queue performance, concurrent job execution, and system limits
 */

import { JobManagementService } from '../../src/services/JobManagementService';
import { JobScheduler } from '../../src/services/JobScheduler';
import { JobMonitor } from '../../src/services/JobMonitor';

// Mock Strapi
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

describe('Background Job Load Tests', () => {
  let jobManager: JobManagementService;
  let jobScheduler: JobScheduler;
  let jobMonitor: JobMonitor;

  beforeEach(() => {
    jobManager = new JobManagementService();
    jobScheduler = new JobScheduler();
    jobMonitor = new JobMonitor();

    jest.clearAllMocks();
  });

  describe('Job Queue Load Testing', () => {
    it('should handle high volume job scheduling', async () => {
      const jobCount = 1000;
      const jobs = Array.from({ length: jobCount }, (_, i) => ({
        name: `load-test-job-${i}`,
        data: { teamId: i + 1, operation: 'calculate-statistics' },
        priority: i % 3 === 0 ? 'high' : i % 2 === 0 ? 'medium' : 'low',
        calculator: async (data: any) => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
          return { result: `processed-${data.teamId}` };
        }
      }));

      const start = performance.now();
      const jobIds = await Promise.all(
        jobs.map(job => jobScheduler.schedule(job.name, job.calculator, job.data, job.priority as any))
      );
      const schedulingDuration = performance.now() - start;

      expect(jobIds).toHaveLength(jobCount);
      expect(schedulingDuration).toBeLessThan(2000); // Should schedule 1000 jobs within 2 seconds

      // Verify all jobs are in the queue
      const queueStatus = jobMonitor.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(jobCount);
      expect(queueStatus.pendingJobs).toBe(jobCount);
    });

    it('should prioritize jobs correctly under load', async () => {
      const highPriorityJobs = Array.from({ length: 100 }, (_, i) => ({
        name: `high-priority-job-${i}`,
        priority: 'high',
        calculator: async () => ({ result: `high-${i}` })
      }));

      const lowPriorityJobs = Array.from({ length: 500 }, (_, i) => ({
        name: `low-priority-job-${i}`,
        priority: 'low',
        calculator: async () => ({ result: `low-${i}` })
      }));

      // Schedule low priority jobs first
      const lowPriorityIds = await Promise.all(
        lowPriorityJobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}, job.priority as any))
      );

      // Then schedule high priority jobs
      const highPriorityIds = await Promise.all(
        highPriorityJobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}, job.priority as any))
      );

      // Wait for some jobs to start processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const queueStatus = jobMonitor.getQueueStatus();
      
      // High priority jobs should be processed first despite being scheduled later
      expect(queueStatus.runningJobs).toBeGreaterThan(0);
      
      // Check that high priority jobs are being processed
      const runningJobs = jobMonitor.getRunningJobs();
      const highPriorityRunning = runningJobs.filter(job => 
        highPriorityIds.includes(job.id)
      ).length;
      
      expect(highPriorityRunning).toBeGreaterThan(0);
    });

    it('should handle job queue overflow gracefully', async () => {
      // Set a lower queue limit for testing
      const originalLimit = jobScheduler['maxQueueSize'];
      jobScheduler['maxQueueSize'] = 100;

      const jobs = Array.from({ length: 150 }, (_, i) => ({
        name: `overflow-test-job-${i}`,
        calculator: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { result: i };
        }
      }));

      const results = await Promise.allSettled(
        jobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}))
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Should accept up to the limit and reject the rest
      expect(successful).toBeLessThanOrEqual(100);
      expect(failed).toBeGreaterThan(0);
      expect(successful + failed).toBe(150);

      // Failed jobs should have appropriate error messages
      const rejectedResults = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
      rejectedResults.forEach(result => {
        expect(result.reason.message).toContain('Queue is full');
      });

      // Restore original limit
      jobScheduler['maxQueueSize'] = originalLimit;
    });

    it('should maintain performance with large job payloads', async () => {
      const largePayloadJobs = Array.from({ length: 50 }, (_, i) => ({
        name: `large-payload-job-${i}`,
        data: {
          teamId: i + 1,
          statistics: Array.from({ length: 1000 }, (_, j) => ({
            gameId: j + 1,
            opponent: `Opponent ${j + 1}`,
            result: Math.random() > 0.5 ? 'win' : 'loss',
            goals: Math.floor(Math.random() * 5),
            details: `Game details for match ${j + 1}`.repeat(20)
          }))
        },
        calculator: async (data: any) => {
          // Simulate processing large data
          const processed = data.statistics.map((stat: any) => ({
            ...stat,
            processed: true
          }));
          return { processedCount: processed.length };
        }
      }));

      const start = performance.now();
      const jobIds = await Promise.all(
        largePayloadJobs.map(job => jobScheduler.schedule(job.name, job.calculator, job.data))
      );
      const duration = performance.now() - start;

      expect(jobIds).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // Should handle large payloads within 1 second

      // Wait for jobs to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const completedJobs = jobIds.map(id => jobMonitor.getJobStatus(id))
        .filter(status => status.status === 'completed');

      expect(completedJobs.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Job Execution Load Testing', () => {
    it('should handle maximum concurrent job execution', async () => {
      const maxConcurrency = jobScheduler['maxConcurrentJobs'] || 10;
      
      const jobs = Array.from({ length: maxConcurrency * 2 }, (_, i) => ({
        name: `concurrent-job-${i}`,
        calculator: async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return { result: i };
        }
      }));

      const start = performance.now();
      const jobIds = await Promise.all(
        jobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}))
      );

      // Wait a bit for jobs to start
      await new Promise(resolve => setTimeout(resolve, 50));

      const runningJobs = jobMonitor.getRunningJobs();
      expect(runningJobs.length).toBeLessThanOrEqual(maxConcurrency);

      // Wait for all jobs to complete
      let allCompleted = false;
      let attempts = 0;
      while (!allCompleted && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const statuses = jobIds.map(id => jobMonitor.getJobStatus(id));
        allCompleted = statuses.every(status => 
          status.status === 'completed' || status.status === 'failed'
        );
        attempts++;
      }

      const totalDuration = performance.now() - start;
      expect(totalDuration).toBeLessThan(5000); // Should complete within 5 seconds

      const completedJobs = jobIds.map(id => jobMonitor.getJobStatus(id))
        .filter(status => status.status === 'completed');

      expect(completedJobs.length).toBe(jobs.length);
    });

    it('should handle job failures without affecting other jobs', async () => {
      const mixedJobs = [
        // Successful jobs
        ...Array.from({ length: 20 }, (_, i) => ({
          name: `success-job-${i}`,
          calculator: async () => ({ result: `success-${i}` })
        })),
        // Failing jobs
        ...Array.from({ length: 10 }, (_, i) => ({
          name: `fail-job-${i}`,
          calculator: async () => {
            throw new Error(`Intentional failure ${i}`);
          }
        })),
        // More successful jobs
        ...Array.from({ length: 20 }, (_, i) => ({
          name: `success-job-${i + 20}`,
          calculator: async () => ({ result: `success-${i + 20}` })
        }))
      ];

      const jobIds = await Promise.all(
        mixedJobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}))
      );

      // Wait for all jobs to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      const statuses = jobIds.map(id => jobMonitor.getJobStatus(id));
      const completed = statuses.filter(s => s.status === 'completed');
      const failed = statuses.filter(s => s.status === 'failed');

      expect(completed.length).toBe(40); // 40 successful jobs
      expect(failed.length).toBe(10); // 10 failed jobs

      // Failed jobs should not affect successful ones
      expect(completed.length + failed.length).toBe(mixedJobs.length);
    });

    it('should handle resource-intensive jobs', async () => {
      const resourceIntensiveJobs = Array.from({ length: 10 }, (_, i) => ({
        name: `resource-intensive-job-${i}`,
        calculator: async () => {
          // Simulate CPU-intensive work
          const start = Date.now();
          let result = 0;
          while (Date.now() - start < 100) {
            result += Math.random();
          }
          
          // Simulate memory-intensive work
          const largeArray = new Array(100000).fill(0).map(() => Math.random());
          
          return { 
            result: result,
            arraySum: largeArray.reduce((a, b) => a + b, 0)
          };
        }
      }));

      const start = performance.now();
      const jobIds = await Promise.all(
        resourceIntensiveJobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}))
      );

      // Wait for jobs to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(5000);

      const completedJobs = jobIds.map(id => jobMonitor.getJobStatus(id))
        .filter(status => status.status === 'completed');

      expect(completedJobs.length).toBe(resourceIntensiveJobs.length);

      // Verify results are correct
      completedJobs.forEach(job => {
        expect(job.result).toHaveProperty('result');
        expect(job.result).toHaveProperty('arraySum');
        expect(typeof job.result.result).toBe('number');
        expect(typeof job.result.arraySum).toBe('number');
      });
    });
  });

  describe('Job System Performance Monitoring', () => {
    it('should track job execution metrics under load', async () => {
      const jobs = Array.from({ length: 100 }, (_, i) => ({
        name: `metrics-job-${i}`,
        calculator: async () => {
          const delay = Math.random() * 50;
          await new Promise(resolve => setTimeout(resolve, delay));
          return { result: i, delay };
        }
      }));

      const jobIds = await Promise.all(
        jobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}))
      );

      // Wait for all jobs to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const metrics = jobMonitor.getPerformanceMetrics();

      expect(metrics.totalJobsProcessed).toBe(100);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
      expect(metrics.averageExecutionTime).toBeLessThan(100);
      expect(metrics.successRate).toBe(1.0); // 100% success rate
      expect(metrics.throughput).toBeGreaterThan(0);
    });

    it('should detect performance degradation under load', async () => {
      // First batch - normal performance
      const normalJobs = Array.from({ length: 20 }, (_, i) => ({
        name: `normal-job-${i}`,
        calculator: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return { result: i };
        }
      }));

      await Promise.all(
        normalJobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}))
      );

      await new Promise(resolve => setTimeout(resolve, 500));
      const normalMetrics = jobMonitor.getPerformanceMetrics();

      // Second batch - degraded performance
      const slowJobs = Array.from({ length: 20 }, (_, i) => ({
        name: `slow-job-${i}`,
        calculator: async () => {
          await new Promise(resolve => setTimeout(resolve, 100)); // 10x slower
          return { result: i };
        }
      }));

      await Promise.all(
        slowJobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}))
      );

      await new Promise(resolve => setTimeout(resolve, 3000));
      const degradedMetrics = jobMonitor.getPerformanceMetrics();

      // Should detect performance degradation
      expect(degradedMetrics.averageExecutionTime).toBeGreaterThan(normalMetrics.averageExecutionTime * 2);
      expect(degradedMetrics.throughput).toBeLessThan(normalMetrics.throughput);
    });

    it('should handle memory usage monitoring under load', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      const memoryIntensiveJobs = Array.from({ length: 50 }, (_, i) => ({
        name: `memory-job-${i}`,
        calculator: async () => {
          // Create large objects
          const largeData = new Array(10000).fill(0).map(() => ({
            id: Math.random(),
            data: new Array(100).fill(0).map(() => Math.random()),
            timestamp: new Date()
          }));

          // Process the data
          const processed = largeData.map(item => ({
            ...item,
            processed: true,
            sum: item.data.reduce((a, b) => a + b, 0)
          }));

          return { processedCount: processed.length };
        }
      }));

      const jobIds = await Promise.all(
        memoryIntensiveJobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}))
      );

      // Wait for jobs to complete
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);

      const completedJobs = jobIds.map(id => jobMonitor.getJobStatus(id))
        .filter(status => status.status === 'completed');

      expect(completedJobs.length).toBe(memoryIntensiveJobs.length);
    });
  });

  describe('Job System Stress Testing', () => {
    it('should handle extreme load without crashing', async () => {
      const extremeJobCount = 5000;
      const batchSize = 100;
      const batches = Math.ceil(extremeJobCount / batchSize);

      let totalScheduled = 0;
      let totalFailed = 0;

      for (let batch = 0; batch < batches; batch++) {
        const batchJobs = Array.from({ length: batchSize }, (_, i) => ({
          name: `extreme-job-${batch}-${i}`,
          calculator: async () => {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 20));
            return { batch, index: i };
          }
        }));

        try {
          const batchResults = await Promise.allSettled(
            batchJobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}))
          );

          const batchSuccessful = batchResults.filter(r => r.status === 'fulfilled').length;
          const batchFailed = batchResults.filter(r => r.status === 'rejected').length;

          totalScheduled += batchSuccessful;
          totalFailed += batchFailed;

          // Small delay between batches to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 10));
        } catch (error) {
          totalFailed += batchSize;
        }
      }

      expect(totalScheduled).toBeGreaterThan(extremeJobCount * 0.8); // At least 80% should be scheduled
      expect(totalScheduled + totalFailed).toBe(extremeJobCount);

      // System should still be responsive
      const queueStatus = jobMonitor.getQueueStatus();
      expect(queueStatus).toBeDefined();
      expect(typeof queueStatus.totalJobs).toBe('number');
    });

    it('should recover from system overload', async () => {
      // Overload the system
      const overloadJobs = Array.from({ length: 1000 }, (_, i) => ({
        name: `overload-job-${i}`,
        calculator: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { result: i };
        }
      }));

      // Schedule all jobs at once
      const overloadResults = await Promise.allSettled(
        overloadJobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}))
      );

      const overloadSuccessful = overloadResults.filter(r => r.status === 'fulfilled').length;

      // Wait for system to process some jobs
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Now try normal operations
      const normalJobs = Array.from({ length: 10 }, (_, i) => ({
        name: `recovery-job-${i}`,
        calculator: async () => ({ result: `recovery-${i}` })
      }));

      const recoveryResults = await Promise.allSettled(
        normalJobs.map(job => jobScheduler.schedule(job.name, job.calculator, {}))
      );

      const recoverySuccessful = recoveryResults.filter(r => r.status === 'fulfilled').length;

      // System should recover and handle normal operations
      expect(recoverySuccessful).toBeGreaterThan(5); // At least half should succeed
      expect(overloadSuccessful).toBeGreaterThan(0); // Some overload jobs should have been scheduled

      // System should still be responsive
      const finalStatus = jobMonitor.getQueueStatus();
      expect(finalStatus).toBeDefined();
    });

    it('should maintain data consistency under extreme load', async () => {
      const consistencyJobs = Array.from({ length: 200 }, (_, i) => ({
        name: `consistency-job-${i}`,
        data: { counter: i },
        calculator: async (data: any) => {
          // Simulate data processing that must maintain consistency
          const processed = data.counter * 2;
          return { 
            original: data.counter,
            processed,
            timestamp: Date.now()
          };
        }
      }));

      const jobIds = await Promise.all(
        consistencyJobs.map(job => jobScheduler.schedule(job.name, job.calculator, job.data))
      );

      // Wait for all jobs to complete
      let allCompleted = false;
      let attempts = 0;
      while (!allCompleted && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const statuses = jobIds.map(id => jobMonitor.getJobStatus(id));
        allCompleted = statuses.every(status => 
          status.status === 'completed' || status.status === 'failed'
        );
        attempts++;
      }

      const completedJobs = jobIds.map(id => jobMonitor.getJobStatus(id))
        .filter(status => status.status === 'completed');

      expect(completedJobs.length).toBe(consistencyJobs.length);

      // Verify data consistency
      completedJobs.forEach((job, index) => {
        expect(job.result.original).toBe(index);
        expect(job.result.processed).toBe(index * 2);
        expect(job.result.timestamp).toBeGreaterThan(0);
      });
    });
  });
});