/**
 * Tests for Queue Monitoring Admin Functionality
 * Tests the admin endpoints used by the queue monitoring dashboard
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Context } from 'koa';
import adminController from '../../../../src/api/tabellen-eintrag/controllers/admin';

// Mock Strapi
const mockStrapi = {
  service: jest.fn(),
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn()
  },
  log: {
    info: jest.fn(),
    error: jest.fn()
  },
  config: {
    get: jest.fn()
  },
  db: {
    connection: {
      raw: jest.fn()
    }
  }
};

global.strapi = mockStrapi as any;

// Mock services
const mockQueueManager = {
  addCalculationJob: jest.fn(),
  getQueueStatus: jest.fn(),
  pauseQueue: jest.fn(),
  resumeQueue: jest.fn(),
  getJobHistory: jest.fn()
};

const mockSnapshotService = {
  listSnapshots: jest.fn()
};

describe('Queue Monitoring Admin Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStrapi.service.mockImplementation((serviceName: string) => {
      switch (serviceName) {
        case 'api::tabellen-eintrag.queue-manager':
          return mockQueueManager;
        case 'api::tabellen-eintrag.snapshot':
          return mockSnapshotService;
        default:
          return {};
      }
    });

    mockStrapi.config.get.mockReturnValue({
      enabled: true,
      queueConcurrency: 3,
      maxRetries: 3
    });

    mockStrapi.db.connection.raw.mockResolvedValue([]);
    mockSnapshotService.listSnapshots.mockResolvedValue([]);
  });

  describe('Real-time Queue Status', () => {
    it('should return detailed queue status with current jobs', async () => {
      const mockQueueStatus = {
        isRunning: true,
        totalJobs: 15,
        pendingJobs: 3,
        processingJobs: 2,
        completedJobs: 8,
        failedJobs: 2,
        averageProcessingTime: 4500,
        lastProcessedAt: new Date('2024-01-01T10:00:00Z'),
        currentJobs: [
          {
            id: 'job_current_1',
            ligaId: 1,
            saisonId: 1,
            status: 'processing',
            priority: 3,
            progress: 75,
            startedAt: new Date('2024-01-01T10:00:00Z'),
            estimatedCompletion: new Date('2024-01-01T10:00:30Z')
          },
          {
            id: 'job_current_2',
            ligaId: 2,
            saisonId: 1,
            status: 'pending',
            priority: 2,
            progress: 0,
            startedAt: new Date('2024-01-01T10:01:00Z')
          }
        ]
      };

      mockQueueManager.getQueueStatus.mockResolvedValue(mockQueueStatus);

      const ctx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getQueueStatus(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual(mockQueueStatus);
      expect(ctx.body.currentJobs).toHaveLength(2);
      expect(ctx.body.currentJobs[0].progress).toBe(75);
    });

    it('should handle queue status when no jobs are running', async () => {
      const emptyQueueStatus = {
        isRunning: false,
        totalJobs: 0,
        pendingJobs: 0,
        processingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        averageProcessingTime: 0,
        currentJobs: []
      };

      mockQueueManager.getQueueStatus.mockResolvedValue(emptyQueueStatus);

      const ctx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getQueueStatus(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.isRunning).toBe(false);
      expect(ctx.body.totalJobs).toBe(0);
      expect(ctx.body.currentJobs).toHaveLength(0);
    });
  });

  describe('Queue Control Operations', () => {
    it('should pause queue and provide feedback', async () => {
      mockQueueManager.pauseQueue.mockResolvedValue(undefined);

      const ctx = {
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.pauseAutomation(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({
        success: true,
        message: 'Automatisierung wurde pausiert'
      });

      expect(mockQueueManager.pauseQueue).toHaveBeenCalled();
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Automation paused by admin',
        expect.objectContaining({
          userId: 1,
          timestamp: expect.any(Date)
        })
      );
    });

    it('should resume queue and provide feedback', async () => {
      mockQueueManager.resumeQueue.mockResolvedValue(undefined);

      const ctx = {
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.resumeAutomation(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({
        success: true,
        message: 'Automatisierung wurde fortgesetzt'
      });

      expect(mockQueueManager.resumeQueue).toHaveBeenCalled();
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Automation resumed by admin',
        expect.objectContaining({
          userId: 1,
          timestamp: expect.any(Date)
        })
      );
    });

    it('should handle pause/resume errors gracefully', async () => {
      const error = new Error('Queue service unavailable');
      mockQueueManager.pauseQueue.mockRejectedValue(error);

      const ctx = {
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.pauseAutomation(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body).toEqual({
        success: false,
        message: 'Fehler beim Pausieren der Automatisierung',
        error: 'Queue service unavailable'
      });
    });
  });

  describe('Job History and Monitoring', () => {
    it('should return comprehensive job history', async () => {
      const mockHistory = [
        {
          id: 'job_history_1',
          ligaId: 1,
          saisonId: 1,
          trigger: 'MANUAL_TRIGGER',
          status: 'completed',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:00:05Z'),
          duration: 5000,
          entriesUpdated: 16,
          description: 'Manual recalculation from admin panel'
        },
        {
          id: 'job_history_2',
          ligaId: 1,
          saisonId: 1,
          trigger: 'GAME_RESULT',
          status: 'completed',
          startedAt: new Date('2024-01-01T09:30:00Z'),
          completedAt: new Date('2024-01-01T09:30:03Z'),
          duration: 3000,
          entriesUpdated: 16,
          description: 'Automatic calculation after game result update'
        },
        {
          id: 'job_history_3',
          ligaId: 1,
          saisonId: 1,
          trigger: 'MANUAL_TRIGGER',
          status: 'failed',
          startedAt: new Date('2024-01-01T09:00:00Z'),
          completedAt: new Date('2024-01-01T09:00:02Z'),
          duration: 2000,
          entriesUpdated: 0,
          error: 'Database connection timeout',
          description: 'Failed manual recalculation'
        }
      ];

      mockQueueManager.getJobHistory.mockResolvedValue(mockHistory);

      const ctx = {
        params: { ligaId: '1' },
        query: { limit: '50' },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getCalculationHistory(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual(mockHistory);
      expect(ctx.body).toHaveLength(3);
      
      // Check that we have both successful and failed jobs
      const completedJobs = ctx.body.filter((job: any) => job.status === 'completed');
      const failedJobs = ctx.body.filter((job: any) => job.status === 'failed');
      
      expect(completedJobs).toHaveLength(2);
      expect(failedJobs).toHaveLength(1);
      expect(failedJobs[0].error).toBe('Database connection timeout');
    });

    it('should handle different trigger types in history', async () => {
      const mockHistory = [
        {
          id: 'job_game_trigger',
          ligaId: 1,
          saisonId: 1,
          trigger: 'GAME_RESULT',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 3000,
          entriesUpdated: 16
        },
        {
          id: 'job_manual_trigger',
          ligaId: 1,
          saisonId: 1,
          trigger: 'MANUAL_TRIGGER',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 5000,
          entriesUpdated: 16
        },
        {
          id: 'job_scheduled_trigger',
          ligaId: 1,
          saisonId: 1,
          trigger: 'SCHEDULED',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 4000,
          entriesUpdated: 16
        }
      ];

      mockQueueManager.getJobHistory.mockResolvedValue(mockHistory);

      const ctx = {
        params: { ligaId: '1' },
        query: { limit: '10' },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getCalculationHistory(ctx);

      expect(ctx.status).toBe(200);
      
      const triggers = ctx.body.map((job: any) => job.trigger);
      expect(triggers).toContain('GAME_RESULT');
      expect(triggers).toContain('MANUAL_TRIGGER');
      expect(triggers).toContain('SCHEDULED');
    });
  });

  describe('Error Handling and Logging', () => {
    it('should log all admin actions with user context', async () => {
      const userId = 42;
      mockQueueManager.pauseQueue.mockResolvedValue(undefined);

      const ctx = {
        state: { user: { id: userId } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.pauseAutomation(ctx);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Automation paused by admin',
        expect.objectContaining({
          userId,
          timestamp: expect.any(Date)
        })
      );
    });

    it('should handle service errors and provide meaningful messages', async () => {
      const serviceError = new Error('Queue manager is not initialized');
      mockQueueManager.getQueueStatus.mockRejectedValue(serviceError);

      const ctx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getQueueStatus(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body).toEqual({
        error: 'Fehler beim Abrufen des Queue-Status',
        message: 'Queue manager is not initialized'
      });

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error getting queue status:',
        serviceError
      );
    });
  });

  describe('Performance and Monitoring Metrics', () => {
    it('should provide performance metrics in queue status', async () => {
      const performanceStatus = {
        isRunning: true,
        totalJobs: 100,
        pendingJobs: 5,
        processingJobs: 3,
        completedJobs: 85,
        failedJobs: 7,
        averageProcessingTime: 3500, // 3.5 seconds
        lastProcessedAt: new Date(),
        currentJobs: []
      };

      mockQueueManager.getQueueStatus.mockResolvedValue(performanceStatus);

      const ctx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getQueueStatus(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body.averageProcessingTime).toBe(3500);
      
      // Calculate success rate
      const successRate = (ctx.body.completedJobs / ctx.body.totalJobs) * 100;
      expect(successRate).toBe(85); // 85% success rate
      
      // Calculate failure rate
      const failureRate = (ctx.body.failedJobs / ctx.body.totalJobs) * 100;
      expect(Math.round(failureRate)).toBe(7); // 7% failure rate
    });

    it('should track job processing times in history', async () => {
      const historyWithTiming = [
        {
          id: 'fast_job',
          ligaId: 1,
          saisonId: 1,
          trigger: 'GAME_RESULT',
          status: 'completed',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:00:02Z'),
          duration: 2000, // 2 seconds - fast
          entriesUpdated: 8
        },
        {
          id: 'slow_job',
          ligaId: 1,
          saisonId: 1,
          trigger: 'MANUAL_TRIGGER',
          status: 'completed',
          startedAt: new Date('2024-01-01T09:00:00Z'),
          completedAt: new Date('2024-01-01T09:00:15Z'),
          duration: 15000, // 15 seconds - slow
          entriesUpdated: 32
        }
      ];

      mockQueueManager.getJobHistory.mockResolvedValue(historyWithTiming);

      const ctx = {
        params: { ligaId: '1' },
        query: { limit: '10' },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getCalculationHistory(ctx);

      expect(ctx.status).toBe(200);
      
      const durations = ctx.body.map((job: any) => job.duration);
      expect(durations).toContain(2000);
      expect(durations).toContain(15000);
      
      // Verify entries updated tracking
      const entriesUpdated = ctx.body.map((job: any) => job.entriesUpdated);
      expect(entriesUpdated).toContain(8);
      expect(entriesUpdated).toContain(32);
    });
  });
});