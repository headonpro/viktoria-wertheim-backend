/**
 * Integration Tests for Queue Manager Retry Logic and Error Handling
 * Tests exponential backoff, dead letter queue, and timeout handling
 */

import { QueueManagerImpl, Priority, JobStatus } from '../../../../src/api/tabellen-eintrag/services/queue-manager';
import type { TabellenBerechnungsService } from '../../../../src/api/tabellen-eintrag/services/tabellen-berechnung';

// Mock the table calculation service
const mockTabellenService: jest.Mocked<TabellenBerechnungsService> = {
  calculateTableForLiga: jest.fn(),
  calculateTeamStats: jest.fn(),
  sortTableEntries: jest.fn(),
  createMissingEntries: jest.fn()
};

describe('QueueManager Retry Logic Integration', () => {
  let queueManager: QueueManagerImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    queueManager = new QueueManagerImpl(mockTabellenService, {
      enabled: true,
      concurrency: 1,
      maxRetries: 3,
      retryDelay: 100, // Short delay for testing
      jobTimeout: 1000, // Short timeout for testing
      cleanupInterval: 60000,
      maxCompletedJobs: 10,
      maxFailedJobs: 5,
      priority: {
        default: Priority.NORMAL,
        manual: Priority.HIGH,
        gameResult: Priority.HIGH,
        scheduled: Priority.LOW
      },
      backoff: {
        type: 'exponential',
        delay: 100,
        maxDelay: 5000
      }
    });
  });

  afterEach(() => {
    queueManager.destroy();
  });

  describe('exponential backoff', () => {
    it('should retry failed jobs with exponential backoff', async () => {
      let attemptCount = 0;
      mockTabellenService.calculateTableForLiga.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('database_error: Connection failed');
        }
        return Promise.resolve([]);
      });

      const jobId = await queueManager.addCalculationJob(1, 1);
      
      // Wait for initial processing and retries
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const job = await queueManager.getJobById(jobId);
      expect(job!.status).toBe(JobStatus.COMPLETED);
      expect(job!.retryCount).toBe(2); // Failed twice, succeeded on third attempt
      expect(job!.errorHistory).toHaveLength(2);
      expect(attemptCount).toBe(3);
    });

    it('should move job to dead letter queue after max retries', async () => {
      mockTabellenService.calculateTableForLiga.mockRejectedValue(
        new Error('database_error: Persistent failure')
      );

      const jobId = await queueManager.addCalculationJob(1, 1);
      
      // Wait for all retry attempts
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const job = await queueManager.getJobById(jobId);
      expect(job).toBeNull(); // Should be removed from main queue
      
      const deadLetterJobs = queueManager.getDeadLetterJobs();
      expect(deadLetterJobs).toHaveLength(1);
      expect(deadLetterJobs[0].id).toBe(jobId);
      expect(deadLetterJobs[0].status).toBe(JobStatus.FAILED);
      expect(deadLetterJobs[0].retryCount).toBe(3);
      expect(deadLetterJobs[0].errorHistory).toHaveLength(4); // Initial + 3 retries
    });

    it('should calculate correct exponential backoff delays', async () => {
      const delays: number[] = [];
      let attemptCount = 0;
      
      mockTabellenService.calculateTableForLiga.mockImplementation(() => {
        const now = Date.now();
        if (attemptCount > 0) {
          delays.push(now);
        } else {
          delays.push(now); // First attempt
        }
        attemptCount++;
        throw new Error('database_error: Test failure');
      });

      await queueManager.addCalculationJob(1, 1);
      
      // Wait for all attempts
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check that delays increase exponentially (with some tolerance for jitter)
      expect(delays).toHaveLength(4); // Initial + 3 retries
      
      const delay1 = delays[1] - delays[0];
      const delay2 = delays[2] - delays[1];
      const delay3 = delays[3] - delays[2];
      
      // Each delay should be roughly double the previous (with jitter tolerance)
      expect(delay2).toBeGreaterThan(delay1 * 1.5);
      expect(delay3).toBeGreaterThan(delay2 * 1.5);
    });
  });

  describe('timeout handling', () => {
    it.skip('should timeout long-running jobs and retry them', async () => {
      let attemptCount = 0;
      
      mockTabellenService.calculateTableForLiga.mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          // First two attempts timeout
          return new Promise(() => {}); // Never resolves
        }
        // Third attempt succeeds
        return Promise.resolve([]);
      });

      const jobId = await queueManager.addCalculationJob(1, 1);
      
      // Wait for timeouts and retries
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const job = await queueManager.getJobById(jobId);
      expect(job!.status).toBe(JobStatus.COMPLETED);
      expect(job!.timeoutCount).toBeGreaterThan(0);
      expect(job!.errorHistory.length).toBeGreaterThan(0);
      expect(job!.errorHistory.some(e => e.isTimeout)).toBe(true);
      expect(attemptCount).toBe(3);
    });

    it('should track timeout metrics', async () => {
      mockTabellenService.calculateTableForLiga.mockImplementation(() => {
        return new Promise(() => {}); // Never resolves, will timeout
      });

      await queueManager.addCalculationJob(1, 1);
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const metrics = queueManager.getMetrics();
      expect(metrics.timeoutRate).toBeGreaterThan(0);
    });
  });

  describe('dead letter queue', () => {
    it('should allow reprocessing jobs from dead letter queue', async () => {
      let shouldFail = true;
      mockTabellenService.calculateTableForLiga.mockImplementation(() => {
        if (shouldFail) {
          throw new Error('database_error: Temporary failure');
        }
        return Promise.resolve([]);
      });

      const jobId = await queueManager.addCalculationJob(1, 1);
      
      // Wait for job to fail and move to dead letter queue
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      let deadLetterJobs = queueManager.getDeadLetterJobs();
      expect(deadLetterJobs).toHaveLength(1);
      
      // Fix the underlying issue
      shouldFail = false;
      
      // Reprocess the dead letter job
      await queueManager.reprocessDeadLetterJob(jobId);
      
      // Wait for reprocessing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const job = await queueManager.getJobById(jobId);
      expect(job!.status).toBe(JobStatus.COMPLETED);
      
      deadLetterJobs = queueManager.getDeadLetterJobs();
      expect(deadLetterJobs).toHaveLength(0);
    });

    it('should clear dead letter queue', async () => {
      mockTabellenService.calculateTableForLiga.mockRejectedValue(
        new Error('database_error: Persistent failure')
      );

      await queueManager.addCalculationJob(1, 1);
      await queueManager.addCalculationJob(2, 1);
      
      // Wait for jobs to fail
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      let deadLetterJobs = queueManager.getDeadLetterJobs();
      expect(deadLetterJobs).toHaveLength(2);
      
      await queueManager.clearDeadLetterQueue();
      
      deadLetterJobs = queueManager.getDeadLetterJobs();
      expect(deadLetterJobs).toHaveLength(0);
      
      const metrics = queueManager.getMetrics();
      expect(metrics.deadLetterCount).toBe(0);
    });
  });

  describe('error classification', () => {
    it('should not retry non-retryable errors', async () => {
      mockTabellenService.calculateTableForLiga.mockRejectedValue(
        new Error('validation_error: Invalid data')
      );

      const jobId = await queueManager.addCalculationJob(1, 1);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const deadLetterJobs = queueManager.getDeadLetterJobs();
      expect(deadLetterJobs).toHaveLength(1);
      expect(deadLetterJobs[0].retryCount).toBe(0); // Should not have retried
      expect(deadLetterJobs[0].errorHistory[0].isRetryable).toBe(false);
    });

    it('should retry retryable errors', async () => {
      let attemptCount = 0;
      mockTabellenService.calculateTableForLiga.mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('connection_error: Network timeout');
        }
        return Promise.resolve([]);
      });

      const jobId = await queueManager.addCalculationJob(1, 1);
      
      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const job = await queueManager.getJobById(jobId);
      expect(job!.status).toBe(JobStatus.COMPLETED);
      expect(job!.retryCount).toBe(2);
      expect(job!.errorHistory).toHaveLength(2);
      expect(job!.errorHistory[0].isRetryable).toBe(true);
    });
  });

  describe('retry job manually', () => {
    it('should allow manual retry of failed jobs', async () => {
      // Create a queue manager that doesn't auto-retry for this test
      const manualQueueManager = new QueueManagerImpl(mockTabellenService, {
        enabled: true,
        concurrency: 1,
        maxRetries: 0, // No automatic retries
        retryDelay: 100,
        jobTimeout: 1000,
        cleanupInterval: 60000,
        maxCompletedJobs: 10,
        maxFailedJobs: 5,
        priority: {
          default: Priority.NORMAL,
          manual: Priority.HIGH,
          gameResult: Priority.HIGH,
          scheduled: Priority.LOW
        },
        backoff: {
          type: 'exponential',
          delay: 100,
          maxDelay: 5000
        }
      });

      let shouldFail = true;
      mockTabellenService.calculateTableForLiga.mockImplementation(() => {
        if (shouldFail) {
          throw new Error('database_error: Temporary issue');
        }
        return Promise.resolve([]);
      });

      const jobId = await manualQueueManager.addCalculationJob(1, 1);
      
      // Wait for initial failure
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Job should be in dead letter queue since maxRetries = 0
      const deadLetterJobs = manualQueueManager.getDeadLetterJobs();
      expect(deadLetterJobs).toHaveLength(1);
      expect(deadLetterJobs[0].status).toBe(JobStatus.FAILED);
      
      // Fix the issue and reprocess from dead letter queue
      shouldFail = false;
      await manualQueueManager.reprocessDeadLetterJob(jobId);
      
      // Wait for retry processing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const job = await manualQueueManager.getJobById(jobId);
      expect(job!.status).toBe(JobStatus.COMPLETED);
      
      manualQueueManager.destroy();
    });

    it('should not allow retry of jobs that exceeded max retries', async () => {
      mockTabellenService.calculateTableForLiga.mockRejectedValue(
        new Error('database_error: Persistent failure')
      );

      const jobId = await queueManager.addCalculationJob(1, 1);
      
      // Wait for all retries to be exhausted
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Job should be in dead letter queue
      const deadLetterJobs = queueManager.getDeadLetterJobs();
      expect(deadLetterJobs).toHaveLength(1);
      
      // Trying to retry should throw an error
      await expect(queueManager.retryFailedJob(jobId)).rejects.toThrow(
        'Job job_' // Job ID starts with job_
      );
    });
  });

  describe('metrics tracking', () => {
    it('should track retry and error metrics correctly', async () => {
      let attemptCount = 0;
      mockTabellenService.calculateTableForLiga.mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('database_error: Retryable failure');
        }
        return Promise.resolve([]);
      });

      await queueManager.addCalculationJob(1, 1);
      await queueManager.addCalculationJob(2, 1);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const metrics = queueManager.getMetrics();
      expect(metrics.totalProcessed).toBe(2);
      expect(metrics.retryRate).toBeGreaterThan(0);
      expect(metrics.successRate).toBe(100); // Both should eventually succeed
      expect(metrics.errorRate).toBe(0); // No final failures
    });
  });
});