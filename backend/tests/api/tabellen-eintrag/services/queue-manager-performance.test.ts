/**
 * Performance Tests for Queue Manager
 * Tests concurrent job processing, job locking, and performance under load
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

describe('QueueManager Performance Tests', () => {
  let queueManager: QueueManagerImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    queueManager = new QueueManagerImpl(mockTabellenService, {
      enabled: true,
      concurrency: 5, // Higher concurrency for performance tests
      maxRetries: 2,
      retryDelay: 50, // Shorter delays for faster tests
      jobTimeout: 2000,
      cleanupInterval: 60000,
      maxCompletedJobs: 100,
      maxFailedJobs: 50,
      priority: {
        default: Priority.NORMAL,
        manual: Priority.HIGH,
        gameResult: Priority.HIGH,
        scheduled: Priority.LOW
      },
      backoff: {
        type: 'exponential',
        delay: 50,
        maxDelay: 1000
      }
    });
  });

  afterEach(() => {
    queueManager.destroy();
  });

  describe('concurrent job processing', () => {
    it('should process multiple jobs concurrently', async () => {
      const processingTimes: number[] = [];
      let activeJobs = 0;
      let maxConcurrentJobs = 0;
      
      mockTabellenService.calculateTableForLiga.mockImplementation(async (ligaId) => {
        activeJobs++;
        maxConcurrentJobs = Math.max(maxConcurrentJobs, activeJobs);
        
        const startTime = Date.now();
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate work
        const endTime = Date.now();
        
        processingTimes.push(endTime - startTime);
        activeJobs--;
        
        return [];
      });

      // Add 10 jobs for different leagues
      const jobPromises = [];
      for (let i = 1; i <= 10; i++) {
        jobPromises.push(queueManager.addCalculationJob(i, 1));
      }
      
      const jobIds = await Promise.all(jobPromises);
      
      // Wait for all jobs to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check that jobs were processed concurrently
      expect(maxConcurrentJobs).toBeGreaterThan(1);
      expect(maxConcurrentJobs).toBeLessThanOrEqual(5); // Should respect concurrency limit
      
      // Check that all jobs completed
      for (const jobId of jobIds) {
        const job = await queueManager.getJobById(jobId);
        expect(job!.status).toBe(JobStatus.COMPLETED);
      }
      
      expect(mockTabellenService.calculateTableForLiga).toHaveBeenCalledTimes(10);
    });

    it('should respect concurrency limits under heavy load', async () => {
      let activeJobs = 0;
      let maxConcurrentJobs = 0;
      
      mockTabellenService.calculateTableForLiga.mockImplementation(async () => {
        activeJobs++;
        maxConcurrentJobs = Math.max(maxConcurrentJobs, activeJobs);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        activeJobs--;
        return [];
      });

      // Add 20 jobs (more than concurrency limit)
      const jobPromises = [];
      for (let i = 1; i <= 20; i++) {
        jobPromises.push(queueManager.addCalculationJob(i, 1));
      }
      
      await Promise.all(jobPromises);
      
      // Wait for processing to start
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check concurrency is respected
      expect(maxConcurrentJobs).toBeLessThanOrEqual(5);
      
      // Wait for all jobs to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      expect(mockTabellenService.calculateTableForLiga).toHaveBeenCalledTimes(20);
    });
  });

  describe('job locking and duplicate prevention', () => {
    it('should prevent duplicate jobs for same liga/saison', async () => {
      mockTabellenService.calculateTableForLiga.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return [];
      });

      // Add multiple jobs for the same liga/saison
      const jobId1 = await queueManager.addCalculationJob(1, 1);
      const jobId2 = await queueManager.addCalculationJob(1, 1);
      const jobId3 = await queueManager.addCalculationJob(1, 1);
      
      // Should return the same job ID
      expect(jobId1).toBe(jobId2);
      expect(jobId2).toBe(jobId3);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Should only process once
      expect(mockTabellenService.calculateTableForLiga).toHaveBeenCalledTimes(1);
      expect(mockTabellenService.calculateTableForLiga).toHaveBeenCalledWith(1, 1);
    });

    it('should allow jobs for different liga/saison combinations', async () => {
      mockTabellenService.calculateTableForLiga.mockResolvedValue([]);

      // Add jobs for different combinations
      const jobId1 = await queueManager.addCalculationJob(1, 1);
      const jobId2 = await queueManager.addCalculationJob(1, 2); // Different saison
      const jobId3 = await queueManager.addCalculationJob(2, 1); // Different liga
      
      // Should be different job IDs
      expect(jobId1).not.toBe(jobId2);
      expect(jobId2).not.toBe(jobId3);
      expect(jobId1).not.toBe(jobId3);
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Should process all three
      expect(mockTabellenService.calculateTableForLiga).toHaveBeenCalledTimes(3);
    });

    it('should release locks when jobs complete', async () => {
      mockTabellenService.calculateTableForLiga.mockResolvedValue([]);

      const jobId1 = await queueManager.addCalculationJob(1, 1);
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const job1 = await queueManager.getJobById(jobId1);
      expect(job1!.status).toBe(JobStatus.COMPLETED);
      
      // Should be able to add a new job for the same liga/saison
      const jobId2 = await queueManager.addCalculationJob(1, 1);
      expect(jobId2).not.toBe(jobId1);
      
      // Wait for second job
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(mockTabellenService.calculateTableForLiga).toHaveBeenCalledTimes(2);
    });

    it('should release locks when jobs fail', async () => {
      mockTabellenService.calculateTableForLiga.mockRejectedValue(
        new Error('validation_error: Non-retryable error')
      );

      const jobId1 = await queueManager.addCalculationJob(1, 1);
      
      // Wait for failure
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Job should be in dead letter queue
      const deadLetterJobs = queueManager.getDeadLetterJobs();
      expect(deadLetterJobs).toHaveLength(1);
      
      // Should be able to add a new job for the same liga/saison
      mockTabellenService.calculateTableForLiga.mockResolvedValue([]);
      const jobId2 = await queueManager.addCalculationJob(1, 1);
      expect(jobId2).not.toBe(jobId1);
      
      // Wait for second job
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const job2 = await queueManager.getJobById(jobId2);
      expect(job2!.status).toBe(JobStatus.COMPLETED);
    });
  });

  describe('queue monitoring and health checks', () => {
    it('should provide detailed queue status', async () => {
      mockTabellenService.calculateTableForLiga.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return [];
      });

      // Add some jobs
      await queueManager.addCalculationJob(1, 1);
      await queueManager.addCalculationJob(2, 1);
      await queueManager.addCalculationJob(3, 1);
      
      const detailedStatus = queueManager.getDetailedStatus();
      
      expect(detailedStatus.totalJobs).toBe(3);
      expect(detailedStatus.jobs).toHaveLength(3);
      expect(detailedStatus.activeLocks).toHaveLength(3);
      expect(detailedStatus.config).toBeDefined();
      
      // Check job details
      detailedStatus.jobs.forEach(job => {
        expect(job.id).toBeDefined();
        expect(job.ligaId).toBeGreaterThan(0);
        expect(job.saisonId).toBe(1);
        expect(job.status).toBeDefined();
        expect(job.priority).toBeDefined();
        expect(job.createdAt).toBeInstanceOf(Date);
      });
    });

    it('should provide health status', async () => {
      const healthStatus = queueManager.getHealthStatus();
      
      expect(healthStatus.status).toBe('healthy');
      expect(healthStatus.timestamp).toBeInstanceOf(Date);
      expect(healthStatus.queueStatus).toBeDefined();
      expect(healthStatus.metrics).toBeDefined();
      expect(healthStatus.issues).toEqual([]);
      expect(healthStatus.activeLocks).toBe(0);
      expect(healthStatus.memoryUsage).toBeDefined();
    });

    it('should detect degraded health with high pending jobs', async () => {
      // Mock slow processing to build up pending jobs
      mockTabellenService.calculateTableForLiga.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Very slow
        return [];
      });

      // Add many jobs
      for (let i = 1; i <= 60; i++) {
        await queueManager.addCalculationJob(i, 1);
      }
      
      const healthStatus = queueManager.getHealthStatus();
      
      expect(healthStatus.status).toBe('degraded');
      expect(healthStatus.issues.some(issue => issue.includes('High pending job count'))).toBe(true);
    });

    it('should detect degraded health when paused', async () => {
      queueManager.pauseQueue();
      
      const healthStatus = queueManager.getHealthStatus();
      
      expect(healthStatus.status).toBe('degraded');
      expect(healthStatus.issues).toContain('Queue is paused');
    });

    it('should track memory usage', async () => {
      // Add some jobs
      for (let i = 1; i <= 10; i++) {
        await queueManager.addCalculationJob(i, 1);
      }
      
      const healthStatus = queueManager.getHealthStatus();
      
      expect(healthStatus.memoryUsage.totalJobs).toBe(10);
      expect(healthStatus.memoryUsage.activeLocks).toBe(10);
      expect(healthStatus.memoryUsage.estimatedMemoryBytes).toBeGreaterThan(0);
      expect(healthStatus.memoryUsage.estimatedMemoryMB).toBeGreaterThan(0);
    });
  });

  describe('performance under load', () => {
    it('should handle burst of jobs efficiently', async () => {
      const startTime = Date.now();
      
      mockTabellenService.calculateTableForLiga.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return [];
      });

      // Add 50 jobs quickly
      const jobPromises = [];
      for (let i = 1; i <= 50; i++) {
        jobPromises.push(queueManager.addCalculationJob(i, 1));
      }
      
      await Promise.all(jobPromises);
      const addJobsTime = Date.now() - startTime;
      
      // Adding jobs should be fast
      expect(addJobsTime).toBeLessThan(1000);
      
      // Wait for all jobs to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const status = queueManager.getQueueStatus();
      expect(status.completedJobs).toBe(50);
      expect(status.pendingJobs).toBe(0);
      expect(status.processingJobs).toBe(0);
    });

    it('should maintain good performance with mixed priorities', async () => {
      mockTabellenService.calculateTableForLiga.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return [];
      });

      const startTime = Date.now();
      
      // Add jobs with different priorities
      const jobPromises = [];
      for (let i = 1; i <= 30; i++) {
        const priority = i % 3 === 0 ? Priority.HIGH : 
                        i % 3 === 1 ? Priority.NORMAL : Priority.LOW;
        jobPromises.push(queueManager.addCalculationJob(i, 1, priority));
      }
      
      await Promise.all(jobPromises);
      
      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete in reasonable time
      expect(totalTime).toBeLessThan(8000); // 8 seconds max
      
      const status = queueManager.getQueueStatus();
      expect(status.completedJobs).toBe(30);
      
      const metrics = queueManager.getMetrics();
      expect(metrics.averageProcessingTime).toBeGreaterThan(90);
      expect(metrics.averageProcessingTime).toBeLessThan(200);
    });

    it('should handle job failures gracefully under load', async () => {
      let callCount = 0;
      mockTabellenService.calculateTableForLiga.mockImplementation(async () => {
        callCount++;
        if (callCount % 3 === 0) {
          throw new Error('database_error: Intermittent failure');
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        return [];
      });

      // Add 30 jobs
      const jobPromises = [];
      for (let i = 1; i <= 30; i++) {
        jobPromises.push(queueManager.addCalculationJob(i, 1));
      }
      
      await Promise.all(jobPromises);
      
      // Wait for processing and retries
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const status = queueManager.getQueueStatus();
      const metrics = queueManager.getMetrics();
      
      // Most jobs should eventually succeed
      expect(status.completedJobs).toBeGreaterThan(20);
      expect(metrics.successRate).toBeGreaterThan(60);
      expect(metrics.retryRate).toBeGreaterThan(0);
    });
  });
});