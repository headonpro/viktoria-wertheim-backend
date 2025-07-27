/**
 * Job Management Service Tests
 * 
 * Tests for the integrated job queue, scheduler, and monitoring system.
 */

import { JobManagementService } from '../JobManagementService';
import { AsyncCalculation, CalculationContext } from '../CalculationService';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock Strapi instance
const mockStrapi = {
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
};

describe('JobManagementService', () => {
  let jobService: JobManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    jobService = new JobManagementService(mockStrapi, {
      queue: {
        maxWorkers: 2,
        maxQueueSize: 10
      },
      monitoring: {
        enabled: true,
        healthCheckInterval: 1000,
        alerting: {
          enabled: true,
          channels: ['log']
        }
      },
      scheduler: {
        enabled: true,
        checkInterval: 500
      }
    });
  });

  afterEach(async () => {
    if (jobService.isServiceRunning()) {
      await jobService.stop();
    }
  });

  describe('Service Lifecycle', () => {
    test('should initialize service correctly', () => {
      expect(jobService.isServiceInitialized()).toBe(true);
      expect(jobService.isServiceRunning()).toBe(false);
    });

    test('should start and stop service', async () => {
      await jobService.start();
      expect(jobService.isServiceRunning()).toBe(true);

      await jobService.stop();
      expect(jobService.isServiceRunning()).toBe(false);
    });

    test('should not start service twice', async () => {
      await jobService.start();
      
      // Starting again should not throw but should log warning
      await jobService.start();
      
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('already running'),
        expect.any(Object)
      );
    });
  });

  describe('Job Queue Operations', () => {
    beforeEach(async () => {
      await jobService.start();
    });

    test('should add calculation job to queue', async () => {
      const calculation: AsyncCalculation = {
        name: 'test-calculation',
        priority: 'medium',
        calculator: async (data) => ({ result: data.value * 2 }),
        timeout: 5000,
        retryAttempts: 1,
        dependencies: []
      };

      const context: CalculationContext = {
        contentType: 'test',
        operation: 'create',
        operationId: 'test-op-1',
        timestamp: new Date(),
        userId: 1
      };

      const jobId = jobService.addCalculationJob(calculation, { value: 10 }, context);
      
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
      
      // Verify job was added
      const status = jobService.getJobStatus(jobId);
      expect(status).toBeDefined();
      expect(status?.status).toBe('pending');
    });

    test('should get job status', async () => {
      const calculation: AsyncCalculation = {
        name: 'status-test',
        priority: 'high',
        calculator: async (data) => ({ result: 'success' }),
        timeout: 5000,
        dependencies: []
      };

      const jobId = jobService.addCalculationJob(
        calculation, 
        { test: true }, 
        { contentType: 'test', operation: 'create', operationId: 'status-test', timestamp: new Date() }
      );

      const status = jobService.getJobStatus(jobId);
      expect(status).toMatchObject({
        jobId,
        status: 'pending'
      });
    });

    test('should cancel job', async () => {
      const calculation: AsyncCalculation = {
        name: 'cancel-test',
        priority: 'low',
        calculator: async (data) => {
          // Simulate long-running job
          await new Promise(resolve => setTimeout(resolve, 2000));
          return { result: 'completed' };
        },
        timeout: 10000,
        dependencies: []
      };

      const jobId = jobService.addCalculationJob(
        calculation, 
        { test: true }, 
        { contentType: 'test', operation: 'create', operationId: 'cancel-test', timestamp: new Date() }
      );

      const cancelled = jobService.cancelJob(jobId);
      expect(cancelled).toBe(true);

      const status = jobService.getJobStatus(jobId);
      expect(status?.status).toBe('cancelled');
    });

    test('should retry failed job', async () => {
      const calculation: AsyncCalculation = {
        name: 'retry-test',
        priority: 'medium',
        calculator: async (data) => {
          throw new Error('Simulated failure');
        },
        timeout: 5000,
        retryAttempts: 2,
        dependencies: []
      };

      const jobId = jobService.addCalculationJob(
        calculation, 
        { test: true }, 
        { contentType: 'test', operation: 'create', operationId: 'retry-test', timestamp: new Date() }
      );

      // Wait for job to fail
      await new Promise(resolve => setTimeout(resolve, 100));

      const retried = jobService.retryJob(jobId);
      expect(retried).toBe(true);
    });
  });

  describe('Job Scheduling', () => {
    beforeEach(async () => {
      await jobService.start();
    });

    test('should schedule one-time job', async () => {
      const calculation: AsyncCalculation = {
        name: 'scheduled-test',
        priority: 'medium',
        calculator: async (data) => ({ result: 'scheduled success' }),
        timeout: 5000,
        dependencies: []
      };

      const scheduledAt = new Date(Date.now() + 1000); // 1 second from now
      
      const jobId = jobService.scheduleCalculationJob(
        calculation,
        { test: true },
        { contentType: 'test', operation: 'create', operationId: 'scheduled-test', timestamp: new Date() },
        scheduledAt
      );

      expect(jobId).toBeDefined();
      
      const scheduledJobs = jobService.getScheduledJobs();
      expect(scheduledJobs).toHaveLength(1);
      expect(scheduledJobs[0].id).toBe(jobId);
      expect(scheduledJobs[0].scheduleType).toBe('once');
    });

    test('should schedule recurring job', async () => {
      const calculation: AsyncCalculation = {
        name: 'recurring-test',
        priority: 'low',
        calculator: async (data) => ({ result: 'recurring success' }),
        timeout: 5000,
        dependencies: []
      };

      const startAt = new Date(Date.now() + 500);
      const intervalMs = 2000; // Every 2 seconds
      
      const jobId = jobService.scheduleRecurringCalculationJob(
        calculation,
        { test: true },
        { contentType: 'test', operation: 'create', operationId: 'recurring-test', timestamp: new Date() },
        startAt,
        intervalMs,
        { maxRuns: 3 }
      );

      expect(jobId).toBeDefined();
      
      const scheduledJobs = jobService.getScheduledJobs();
      expect(scheduledJobs).toHaveLength(1);
      expect(scheduledJobs[0].scheduleType).toBe('recurring');
      expect(scheduledJobs[0].recurring?.interval).toBe(intervalMs);
      expect(scheduledJobs[0].recurring?.maxRuns).toBe(3);
    });

    test('should cancel scheduled job', async () => {
      const calculation: AsyncCalculation = {
        name: 'cancel-scheduled-test',
        priority: 'medium',
        calculator: async (data) => ({ result: 'should not run' }),
        timeout: 5000,
        dependencies: []
      };

      const scheduledAt = new Date(Date.now() + 5000); // 5 seconds from now
      
      const jobId = jobService.scheduleCalculationJob(
        calculation,
        { test: true },
        { contentType: 'test', operation: 'create', operationId: 'cancel-scheduled-test', timestamp: new Date() },
        scheduledAt
      );

      const cancelled = jobService.cancelScheduledJob(jobId);
      expect(cancelled).toBe(true);
      
      const scheduledJobs = jobService.getScheduledJobs();
      expect(scheduledJobs).toHaveLength(0);
    });

    test('should enable/disable scheduled job', async () => {
      const calculation: AsyncCalculation = {
        name: 'enable-disable-test',
        priority: 'medium',
        calculator: async (data) => ({ result: 'test' }),
        timeout: 5000,
        dependencies: []
      };

      const scheduledAt = new Date(Date.now() + 5000);
      
      const jobId = jobService.scheduleCalculationJob(
        calculation,
        { test: true },
        { contentType: 'test', operation: 'create', operationId: 'enable-disable-test', timestamp: new Date() },
        scheduledAt
      );

      // Disable job
      const disabled = jobService.setScheduledJobEnabled(jobId, false);
      expect(disabled).toBe(true);
      
      let scheduledJobs = jobService.getScheduledJobs({ enabled: false });
      expect(scheduledJobs).toHaveLength(1);
      expect(scheduledJobs[0].enabled).toBe(false);

      // Re-enable job
      const enabled = jobService.setScheduledJobEnabled(jobId, true);
      expect(enabled).toBe(true);
      
      scheduledJobs = jobService.getScheduledJobs({ enabled: true });
      expect(scheduledJobs).toHaveLength(1);
      expect(scheduledJobs[0].enabled).toBe(true);
    });
  });

  describe('Monitoring and Metrics', () => {
    beforeEach(async () => {
      await jobService.start();
    });

    test('should get job execution summary', async () => {
      const summary = jobService.getJobExecutionSummary();
      
      expect(summary).toMatchObject({
        totalJobs: expect.any(Number),
        completedJobs: expect.any(Number),
        failedJobs: expect.any(Number),
        pendingJobs: expect.any(Number),
        runningJobs: expect.any(Number),
        averageExecutionTime: expect.any(Number),
        successRate: expect.any(Number),
        recentFailures: expect.any(Number)
      });
    });

    test('should get system status', async () => {
      const status = jobService.getSystemStatus();
      
      expect(status).toMatchObject({
        queue: {
          status: expect.stringMatching(/healthy|warning|critical/),
          length: expect.any(Number),
          activeWorkers: expect.any(Number)
        },
        scheduler: {
          status: expect.stringMatching(/running|stopped/),
          scheduledJobs: expect.any(Number)
        },
        monitoring: {
          status: expect.stringMatching(/running|stopped/),
          activeAlerts: expect.any(Number)
        },
        overall: expect.stringMatching(/healthy|warning|critical/)
      });
    });

    test('should get performance metrics', async () => {
      // Add and execute some jobs first
      const calculation: AsyncCalculation = {
        name: 'metrics-test',
        priority: 'medium',
        calculator: async (data) => ({ result: 'success' }),
        timeout: 5000,
        dependencies: []
      };

      jobService.addCalculationJob(
        calculation,
        { test: true },
        { contentType: 'test', operation: 'create', operationId: 'metrics-test', timestamp: new Date() }
      );

      // Wait a bit for job to potentially execute
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = jobService.getPerformanceMetrics();
      expect(Array.isArray(metrics)).toBe(true);
    });

    test('should get system health', async () => {
      const health = jobService.getSystemHealth();
      
      if (health) {
        expect(health).toMatchObject({
          queueHealth: {
            status: expect.stringMatching(/healthy|warning|critical/),
            queueLength: expect.any(Number)
          },
          workerHealth: {
            status: expect.stringMatching(/healthy|warning|critical/),
            activeWorkers: expect.any(Number),
            totalWorkers: expect.any(Number)
          },
          performanceHealth: {
            status: expect.stringMatching(/healthy|warning|critical/),
            averageExecutionTime: expect.any(Number),
            slowJobs: expect.any(Array),
            timeoutRate: expect.any(Number)
          },
          errorHealth: {
            status: expect.stringMatching(/healthy|warning|critical/),
            errorRate: expect.any(Number),
            recentErrors: expect.any(Number),
            criticalErrors: expect.any(Array)
          }
        });
      }
    });

    test('should get active alerts', async () => {
      const alerts = jobService.getActiveAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    test('should acknowledge alert', async () => {
      // This test would need to trigger an alert first
      // For now, just test that the method exists and handles non-existent alerts
      const acknowledged = jobService.acknowledgeAlert('non-existent-alert', 'test-user');
      expect(acknowledged).toBe(false);
    });
  });

  describe('Utility Operations', () => {
    beforeEach(async () => {
      await jobService.start();
    });

    test('should get jobs with filtering', async () => {
      const jobs = jobService.getJobs({ limit: 10 });
      expect(Array.isArray(jobs)).toBe(true);
      expect(jobs.length).toBeLessThanOrEqual(10);
    });

    test('should get queue statistics', async () => {
      const stats = jobService.getQueueStatistics();
      
      expect(stats).toMatchObject({
        totalJobs: expect.any(Number),
        pendingJobs: expect.any(Number),
        runningJobs: expect.any(Number),
        completedJobs: expect.any(Number),
        failedJobs: expect.any(Number),
        averageExecutionTime: expect.any(Number),
        queueLength: expect.any(Number),
        activeWorkers: expect.any(Number),
        jobsByPriority: expect.any(Object),
        jobsByType: expect.any(Object)
      });
    });

    test('should clear completed jobs', async () => {
      const cleared = jobService.clearCompletedJobs();
      expect(typeof cleared).toBe('number');
      expect(cleared).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should throw error when adding job to stopped service', async () => {
      const calculation: AsyncCalculation = {
        name: 'error-test',
        priority: 'medium',
        calculator: async (data) => ({ result: 'test' }),
        timeout: 5000,
        dependencies: []
      };

      expect(() => {
        jobService.addCalculationJob(
          calculation,
          { test: true },
          { contentType: 'test', operation: 'create', operationId: 'error-test', timestamp: new Date() }
        );
      }).toThrow('Job management service is not running');
    });

    test('should handle scheduler operations when scheduler disabled', () => {
      const serviceWithoutScheduler = new JobManagementService(mockStrapi, {
        scheduler: { enabled: false, checkInterval: 1000 }
      });

      const calculation: AsyncCalculation = {
        name: 'no-scheduler-test',
        priority: 'medium',
        calculator: async (data) => ({ result: 'test' }),
        timeout: 5000,
        dependencies: []
      };

      expect(() => {
        serviceWithoutScheduler.scheduleCalculationJob(
          calculation,
          { test: true },
          { contentType: 'test', operation: 'create', operationId: 'no-scheduler-test', timestamp: new Date() },
          new Date()
        );
      }).toThrow('Job scheduler is not enabled');
    });

    test('should handle monitoring operations when monitoring disabled', () => {
      const serviceWithoutMonitoring = new JobManagementService(mockStrapi, {
        monitoring: { enabled: false, healthCheckInterval: 1000, alerting: { enabled: false, channels: [] } }
      });

      const health = serviceWithoutMonitoring.getSystemHealth();
      expect(health).toBeNull();

      const alerts = serviceWithoutMonitoring.getActiveAlerts();
      expect(alerts).toEqual([]);

      const acknowledged = serviceWithoutMonitoring.acknowledgeAlert('test', 'user');
      expect(acknowledged).toBe(false);
    });
  });
});

describe('JobManagementService Integration', () => {
  test('should handle complete job lifecycle', async () => {
    const jobService = new JobManagementService(mockStrapi);
    await jobService.start();

    try {
      // Add a job
      const calculation: AsyncCalculation = {
        name: 'integration-test',
        priority: 'high',
        calculator: async (data) => {
          await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
          return { result: data.input * 2 };
        },
        timeout: 5000,
        retryAttempts: 1,
        dependencies: []
      };

      const jobId = jobService.addCalculationJob(
        calculation,
        { input: 5 },
        { contentType: 'test', operation: 'create', operationId: 'integration-test', timestamp: new Date() }
      );

      // Check initial status
      let status = jobService.getJobStatus(jobId);
      expect(status?.status).toBe('pending');

      // Wait for job to potentially execute
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check if job completed or is still running
      status = jobService.getJobStatus(jobId);
      expect(['pending', 'running', 'completed']).toContain(status?.status);

      // Get system status
      const systemStatus = jobService.getSystemStatus();
      expect(systemStatus.overall).toMatch(/healthy|warning|critical/);

      // Get execution summary
      const summary = jobService.getJobExecutionSummary();
      expect(summary.totalJobs).toBeGreaterThan(0);

    } finally {
      await jobService.stop();
    }
  });
});