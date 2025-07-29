/**
 * Unit Tests for Queue Manager
 * Tests job processing, priority handling, and queue operations
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

describe('QueueManager', () => {
  let queueManager: QueueManagerImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    queueManager = new QueueManagerImpl(mockTabellenService, {
      enabled: false, // Disable automatic processing for tests
      concurrency: 2,
      maxRetries: 3,
      retryDelay: 1000,
      jobTimeout: 5000,
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
        delay: 500,
        maxDelay: 10000
      }
    });
  });

  afterEach(() => {
    queueManager.destroy();
  });

  describe('addCalculationJob', () => {
    it('should add a job with default priority', async () => {
      const jobId = await queueManager.addCalculationJob(1, 1);
      
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      
      const job = await queueManager.getJobById(jobId);
      expect(job).toBeDefined();
      expect(job!.ligaId).toBe(1);
      expect(job!.saisonId).toBe(1);
      expect(job!.priority).toBe(Priority.NORMAL);
      expect(job!.status).toBe(JobStatus.PENDING);
    });

    it('should add a job with specified priority', async () => {
      const jobId = await queueManager.addCalculationJob(1, 1, Priority.HIGH);
      
      const job = await queueManager.getJobById(jobId);
      expect(job!.priority).toBe(Priority.HIGH);
    });

    it('should generate unique job IDs for different liga/saison combinations', async () => {
      const jobId1 = await queueManager.addCalculationJob(1, 1);
      const jobId2 = await queueManager.addCalculationJob(2, 1); // Different liga
      const jobId3 = await queueManager.addCalculationJob(1, 2); // Different saison
      
      expect(jobId1).not.toBe(jobId2);
      expect(jobId2).not.toBe(jobId3);
      expect(jobId1).not.toBe(jobId3);
    });

    it('should return same job ID for duplicate liga/saison requests', async () => {
      const jobId1 = await queueManager.addCalculationJob(1, 1);
      const jobId2 = await queueManager.addCalculationJob(1, 1);
      
      expect(jobId1).toBe(jobId2);
    });
  });

  describe('priority handling', () => {
    it('should process high priority jobs before normal priority jobs', async () => {
      // Mock the calculation to be slow so we can control execution order
      let resolveCalculation: () => void;
      const calculationPromise = new Promise<void>((resolve) => {
        resolveCalculation = resolve;
      });
      
      mockTabellenService.calculateTableForLiga.mockImplementation(() => calculationPromise);

      // Add jobs in reverse priority order
      const lowPriorityJob = await queueManager.addCalculationJob(1, 1, Priority.LOW);
      const highPriorityJob = await queueManager.addCalculationJob(2, 1, Priority.HIGH);
      const normalPriorityJob = await queueManager.addCalculationJob(3, 1, Priority.NORMAL);

      // Start processing
      queueManager.processQueue();

      // Wait a bit for processing to start
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that high priority job is processed first
      const highJob = await queueManager.getJobById(highPriorityJob);
      expect(highJob!.status).toBe(JobStatus.PROCESSING);

      // Resolve the calculation
      resolveCalculation!();
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockTabellenService.calculateTableForLiga).toHaveBeenCalledWith(2, 1);
    });

    it('should process jobs with same priority in FIFO order', async () => {
      const job1 = await queueManager.addCalculationJob(1, 1, Priority.NORMAL);
      const job2 = await queueManager.addCalculationJob(2, 1, Priority.NORMAL);
      
      // Mock quick execution
      mockTabellenService.calculateTableForLiga.mockResolvedValue([]);
      
      await queueManager.processQueue();
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // First job should have been processed first
      const calls = mockTabellenService.calculateTableForLiga.mock.calls;
      expect(calls[0]).toEqual([1, 1]);
      expect(calls[1]).toEqual([2, 1]);
    });
  });

  describe('queue status', () => {
    it('should return correct queue status for empty queue', () => {
      const status = queueManager.getQueueStatus();
      
      expect(status.totalJobs).toBe(0);
      expect(status.pendingJobs).toBe(0);
      expect(status.processingJobs).toBe(0);
      expect(status.completedJobs).toBe(0);
      expect(status.failedJobs).toBe(0);
      expect(status.isRunning).toBe(false);
    });

    it('should return correct queue status with pending jobs', async () => {
      await queueManager.addCalculationJob(1, 1);
      await queueManager.addCalculationJob(2, 1);
      
      const status = queueManager.getQueueStatus();
      
      expect(status.totalJobs).toBe(2);
      expect(status.pendingJobs).toBe(2);
      expect(status.processingJobs).toBe(0);
      expect(status.completedJobs).toBe(0);
      expect(status.failedJobs).toBe(0);
    });

    it('should track processing jobs correctly', async () => {
      let resolveCalculation: () => void;
      const calculationPromise = new Promise<void>((resolve) => {
        resolveCalculation = resolve;
      });
      
      mockTabellenService.calculateTableForLiga.mockImplementation(() => calculationPromise);
      
      await queueManager.addCalculationJob(1, 1);
      queueManager.processQueue();
      
      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = queueManager.getQueueStatus();
      expect(status.processingJobs).toBe(1);
      expect(status.pendingJobs).toBe(0);
      expect(status.isRunning).toBe(true);
      
      resolveCalculation!();
    });
  });

  describe('pause and resume', () => {
    it('should pause queue processing', async () => {
      await queueManager.addCalculationJob(1, 1);
      queueManager.pauseQueue();
      
      await queueManager.processQueue();
      
      const status = queueManager.getQueueStatus();
      expect(status.pendingJobs).toBe(1);
      expect(status.processingJobs).toBe(0);
      expect(mockTabellenService.calculateTableForLiga).not.toHaveBeenCalled();
    });

    it('should resume queue processing', async () => {
      // Create a queue manager with enabled processing for this test
      const enabledQueueManager = new QueueManagerImpl(mockTabellenService, {
        enabled: true,
        concurrency: 2,
        maxRetries: 3,
        retryDelay: 1000,
        jobTimeout: 5000,
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
          delay: 500,
          maxDelay: 10000
        }
      });
      
      mockTabellenService.calculateTableForLiga.mockResolvedValue([]);
      
      await enabledQueueManager.addCalculationJob(1, 1);
      enabledQueueManager.pauseQueue();
      enabledQueueManager.resumeQueue();
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(mockTabellenService.calculateTableForLiga).toHaveBeenCalledWith(1, 1);
      
      enabledQueueManager.destroy();
    });
  });

  describe('concurrency limits', () => {
    it('should respect concurrency limits', async () => {
      let resolveCalculations: (() => void)[] = [];
      const calculationPromises: Promise<void>[] = [];
      
      // Create multiple slow calculations
      for (let i = 0; i < 3; i++) {
        const promise = new Promise<void>((resolve) => {
          resolveCalculations.push(resolve);
        });
        calculationPromises.push(promise);
      }
      
      let callCount = 0;
      mockTabellenService.calculateTableForLiga.mockImplementation(() => {
        return calculationPromises[callCount++];
      });
      
      // Add 3 jobs (more than concurrency limit of 2)
      await queueManager.addCalculationJob(1, 1);
      await queueManager.addCalculationJob(2, 1);
      await queueManager.addCalculationJob(3, 1);
      
      queueManager.processQueue();
      
      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const status = queueManager.getQueueStatus();
      expect(status.processingJobs).toBe(2); // Should be limited by concurrency
      expect(status.pendingJobs).toBe(1);
      
      // Resolve first two calculations
      resolveCalculations[0]();
      resolveCalculations[1]();
      
      // Wait for third job to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const statusAfter = queueManager.getQueueStatus();
      expect(statusAfter.processingJobs).toBe(1);
      expect(statusAfter.pendingJobs).toBe(0);
      
      resolveCalculations[2]();
    });
  });

  describe('job retrieval', () => {
    it('should retrieve job by ID', async () => {
      const jobId = await queueManager.addCalculationJob(1, 1, Priority.HIGH);
      
      const job = await queueManager.getJobById(jobId);
      
      expect(job).toBeDefined();
      expect(job!.id).toBe(jobId);
      expect(job!.ligaId).toBe(1);
      expect(job!.saisonId).toBe(1);
      expect(job!.priority).toBe(Priority.HIGH);
    });

    it('should return null for non-existent job', async () => {
      const job = await queueManager.getJobById('non-existent-id');
      expect(job).toBeNull();
    });
  });

  describe('clear queue', () => {
    it('should clear all pending jobs', async () => {
      await queueManager.addCalculationJob(1, 1);
      await queueManager.addCalculationJob(2, 1);
      
      await queueManager.clearQueue();
      
      const status = queueManager.getQueueStatus();
      expect(status.totalJobs).toBe(0);
      expect(status.pendingJobs).toBe(0);
    });

    it('should wait for processing jobs to complete before clearing', async () => {
      let resolveCalculation: () => void;
      const calculationPromise = new Promise<void>((resolve) => {
        resolveCalculation = resolve;
      });
      
      mockTabellenService.calculateTableForLiga.mockImplementation(() => calculationPromise);
      
      await queueManager.addCalculationJob(1, 1);
      queueManager.processQueue();
      
      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start clearing (should wait for processing job)
      const clearPromise = queueManager.clearQueue();
      
      // Queue should still have the processing job
      let status = queueManager.getQueueStatus();
      expect(status.processingJobs).toBe(1);
      
      // Resolve the calculation
      resolveCalculation!();
      
      // Wait for clear to complete
      await clearPromise;
      
      status = queueManager.getQueueStatus();
      expect(status.totalJobs).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle calculation errors', async () => {
      const error = new Error('validation_error: Non-retryable error');
      mockTabellenService.calculateTableForLiga.mockRejectedValue(error);
      
      const jobId = await queueManager.addCalculationJob(1, 1);
      
      await queueManager.processQueue();
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Job should be moved to dead letter queue for non-retryable errors
      const job = await queueManager.getJobById(jobId);
      expect(job).toBeNull(); // Should be removed from main queue
      
      const deadLetterJobs = queueManager.getDeadLetterJobs();
      expect(deadLetterJobs).toHaveLength(1);
      expect(deadLetterJobs[0].status).toBe(JobStatus.FAILED);
      expect(deadLetterJobs[0].error).toBe('validation_error: Non-retryable error');
    });

    it('should track job completion times', async () => {
      mockTabellenService.calculateTableForLiga.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      const jobId = await queueManager.addCalculationJob(1, 1);
      
      await queueManager.processQueue();
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const job = await queueManager.getJobById(jobId);
      expect(job!.status).toBe(JobStatus.COMPLETED);
      expect(job!.startedAt).toBeDefined();
      expect(job!.completedAt).toBeDefined();
      expect(job!.completedAt!.getTime()).toBeGreaterThan(job!.startedAt!.getTime());
    });
  });

  describe('metrics', () => {
    it('should track basic metrics', async () => {
      mockTabellenService.calculateTableForLiga.mockResolvedValue([]);
      
      await queueManager.addCalculationJob(1, 1);
      await queueManager.processQueue();
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const metrics = queueManager.getMetrics();
      expect(metrics.totalProcessed).toBe(1);
      expect(metrics.successRate).toBe(100);
      expect(metrics.errorRate).toBe(0);
    });

    it('should calculate average processing time', async () => {
      mockTabellenService.calculateTableForLiga.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      await queueManager.addCalculationJob(1, 1);
      await queueManager.addCalculationJob(2, 1);
      
      await queueManager.processQueue();
      
      // Wait for processing to complete
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const metrics = queueManager.getMetrics();
      expect(metrics.totalProcessed).toBe(2);
      expect(metrics.averageProcessingTime).toBeGreaterThan(90);
      expect(metrics.averageProcessingTime).toBeLessThan(200);
    });
  });
});