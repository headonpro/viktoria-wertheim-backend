/**
 * Integration Tests for Admin Controller
 * Tests the complete admin panel functionality with mocked services
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Context } from 'koa';
import adminController from '../../../../src/api/tabellen-eintrag/controllers/admin';

// Mock Strapi with more realistic behavior
const mockStrapi = {
  service: jest.fn(),
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
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

// Mock services with realistic implementations
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

describe('Admin Controller Integration', () => {
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

    // Setup default mock responses
    mockStrapi.config.get.mockReturnValue({
      enabled: true,
      queueConcurrency: 3,
      maxRetries: 3,
      jobTimeout: 300000,
      snapshotRetention: 30,
      enableNotifications: true,
      logLevel: 'info'
    });

    mockStrapi.db.connection.raw.mockResolvedValue([]);
    mockSnapshotService.listSnapshots.mockResolvedValue([]);
  });

  describe('triggerRecalculation Integration', () => {
    it('should trigger recalculation with complete workflow', async () => {
      // Setup test data
      const ligaId = 1;
      const saisonId = 1;
      const jobId = 'job_integration_123';

      mockStrapi.entityService.findOne.mockResolvedValue({
        id: ligaId,
        name: 'Integration Test Liga'
      });

      mockStrapi.entityService.findMany.mockResolvedValue([
        { id: 1, name: 'Team A' },
        { id: 2, name: 'Team B' },
        { id: 3, name: 'Team C' }
      ]);

      mockQueueManager.addCalculationJob.mockResolvedValue(jobId);

      const ctx = {
        request: {
          body: {
            ligaId,
            saisonId,
            priority: 'HIGH',
            description: 'Integration test recalculation'
          }
        },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      // Act
      await adminController.triggerRecalculation(ctx);

      // Assert
      expect(ctx.status).toBe(200);
      expect(ctx.body).toMatchObject({
        success: true,
        jobId,
        message: expect.stringContaining('Integration Test Liga'),
        estimatedDuration: 5 // 3 teams * 0.5, minimum 5
      });

      expect(mockQueueManager.addCalculationJob).toHaveBeenCalledWith(
        ligaId,
        saisonId,
        'HIGH',
        'MANUAL_TRIGGER',
        'Integration test recalculation'
      );
    });

    it('should handle missing saison by finding active one', async () => {
      const ligaId = 1;
      const activeSaisonId = 2;
      const jobId = 'job_active_saison';

      mockStrapi.entityService.findOne.mockResolvedValue({
        id: ligaId,
        name: 'Test Liga'
      });

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([{ id: activeSaisonId, aktiv: true }]) // Active saison
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]); // Teams

      mockQueueManager.addCalculationJob.mockResolvedValue(jobId);

      const ctx = {
        request: {
          body: { ligaId } // No saisonId provided
        },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.triggerRecalculation(ctx);

      expect(mockQueueManager.addCalculationJob).toHaveBeenCalledWith(
        ligaId,
        activeSaisonId,
        'HIGH',
        'MANUAL_TRIGGER',
        'Manuelle Neuberechnung für Liga Test Liga'
      );
    });
  });

  describe('getQueueStatus Integration', () => {
    it('should return comprehensive queue status', async () => {
      const mockStatus = {
        isRunning: true,
        totalJobs: 15,
        pendingJobs: 3,
        processingJobs: 2,
        completedJobs: 8,
        failedJobs: 2,
        averageProcessingTime: 4500,
        lastProcessedAt: new Date(),
        currentJobs: [
          {
            id: 'job_1',
            ligaId: 1,
            saisonId: 1,
            status: 'processing',
            priority: 3,
            progress: 75,
            startedAt: new Date(),
            estimatedCompletion: new Date(Date.now() + 30000)
          }
        ]
      };

      mockQueueManager.getQueueStatus.mockResolvedValue(mockStatus);

      const ctx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getQueueStatus(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual(mockStatus);
    });
  });

  describe('pauseAutomation Integration', () => {
    it('should pause automation and log action', async () => {
      mockQueueManager.pauseQueue.mockResolvedValue(undefined);

      const ctx = {
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.pauseAutomation(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toMatchObject({
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
  });

  describe('resumeAutomation Integration', () => {
    it('should resume automation and log action', async () => {
      mockQueueManager.resumeQueue.mockResolvedValue(undefined);

      const ctx = {
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.resumeAutomation(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toMatchObject({
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
  });

  describe('getCalculationHistory Integration', () => {
    it('should return calculation history with detailed job information', async () => {
      const ligaId = 1;
      const mockHistory = [
        {
          id: 'job_history_1',
          ligaId,
          saisonId: 1,
          trigger: 'MANUAL_TRIGGER',
          status: 'completed',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:00:05Z'),
          duration: 5000,
          entriesUpdated: 16,
          description: 'Manual recalculation'
        },
        {
          id: 'job_history_2',
          ligaId,
          saisonId: 1,
          trigger: 'GAME_RESULT',
          status: 'completed',
          startedAt: new Date('2024-01-01T09:30:00Z'),
          completedAt: new Date('2024-01-01T09:30:03Z'),
          duration: 3000,
          entriesUpdated: 16,
          description: 'Automatic calculation after game result'
        }
      ];

      mockQueueManager.getJobHistory.mockResolvedValue(mockHistory);

      const ctx = {
        params: { ligaId: ligaId.toString() },
        query: { limit: '10' },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getCalculationHistory(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual(mockHistory);
      expect(mockQueueManager.getJobHistory).toHaveBeenCalledWith(ligaId, 10);
    });
  });

  describe('getSystemHealth Integration', () => {
    it('should return comprehensive system health status', async () => {
      const mockQueueStatus = {
        isRunning: true,
        totalJobs: 10,
        completedJobs: 8,
        failedJobs: 1
      };

      mockQueueManager.getQueueStatus.mockResolvedValue(mockQueueStatus);

      const ctx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getSystemHealth(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        components: expect.arrayContaining([
          expect.objectContaining({
            name: 'Queue System',
            status: 'up',
            message: 'Queue is running normally'
          }),
          expect.objectContaining({
            name: 'Database',
            status: 'up',
            message: 'Database connection is healthy'
          }),
          expect.objectContaining({
            name: 'Snapshot Service',
            status: 'up',
            message: 'Snapshot service is operational'
          })
        ]),
        lastChecked: expect.any(Date),
        uptime: expect.any(Number)
      });

      expect(ctx.body.components.length).toBe(3);
    });

    it('should detect degraded status when queue is not running', async () => {
      const mockQueueStatus = {
        isRunning: false,
        totalJobs: 5,
        completedJobs: 3,
        failedJobs: 2
      };

      mockQueueManager.getQueueStatus.mockResolvedValue(mockQueueStatus);

      const ctx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getSystemHealth(ctx);

      expect(ctx.body.components).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Queue System',
            status: 'down',
            message: 'Queue is paused'
          })
        ])
      );
    });
  });

  describe('getSettings Integration', () => {
    it('should return complete automation settings', async () => {
      const ctx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getSettings(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toMatchObject({
        enabled: true,
        queueConcurrency: 3,
        maxRetries: 3,
        jobTimeout: 300000,
        snapshotRetention: 30,
        enableNotifications: true,
        logLevel: 'info'
      });
    });
  });

  describe('updateSettings Integration', () => {
    it('should update settings and log the change', async () => {
      const newSettings = {
        queueConcurrency: 5,
        maxRetries: 2,
        enableNotifications: false
      };

      const ctx = {
        request: { body: newSettings },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.updateSettings(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toMatchObject({
        success: true,
        message: 'Einstellungen wurden aktualisiert',
        settings: newSettings
      });

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Automation settings updated by admin',
        expect.objectContaining({
          userId: 1,
          settings: newSettings,
          timestamp: expect.any(Date)
        })
      );
    });
  });

  describe('Complete Admin Workflow Integration', () => {
    it('should handle complete admin workflow scenario', async () => {
      // Setup comprehensive test scenario
      const ligaId = 1;
      const saisonId = 1;
      const jobId = 'job_workflow_test';

      // Mock all required responses
      mockStrapi.entityService.findOne.mockResolvedValue({
        id: ligaId,
        name: 'Workflow Test Liga'
      });

      mockStrapi.entityService.findMany.mockResolvedValue([
        { id: 1, name: 'Team Alpha' },
        { id: 2, name: 'Team Beta' },
        { id: 3, name: 'Team Gamma' }
      ]);

      mockQueueManager.addCalculationJob.mockResolvedValue(jobId);
      mockQueueManager.getQueueStatus.mockResolvedValue({
        isRunning: true,
        totalJobs: 5,
        pendingJobs: 1,
        processingJobs: 1,
        completedJobs: 2,
        failedJobs: 1,
        averageProcessingTime: 4000,
        currentJobs: []
      });

      mockQueueManager.getJobHistory.mockResolvedValue([
        {
          id: jobId,
          ligaId,
          saisonId,
          trigger: 'MANUAL_TRIGGER',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 4000,
          entriesUpdated: 16
        }
      ]);

      // 1. Trigger recalculation
      const recalcCtx = {
        request: {
          body: {
            ligaId,
            saisonId,
            priority: 'HIGH',
            description: 'Workflow test'
          }
        },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.triggerRecalculation(recalcCtx);
      expect(recalcCtx.status).toBe(200);
      expect(recalcCtx.body).toMatchObject({
        success: true,
        jobId
      });

      // 2. Check queue status
      const statusCtx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getQueueStatus(statusCtx);
      expect(statusCtx.status).toBe(200);
      expect(statusCtx.body.totalJobs).toBe(5);

      // 3. Pause automation
      const pauseCtx = {
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.pauseAutomation(pauseCtx);
      expect(pauseCtx.status).toBe(200);

      // 4. Resume automation
      const resumeCtx = {
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.resumeAutomation(resumeCtx);
      expect(resumeCtx.status).toBe(200);

      // 5. Get history
      const historyCtx = {
        params: { ligaId: ligaId.toString() },
        query: { limit: '10' },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getCalculationHistory(historyCtx);
      expect(historyCtx.status).toBe(200);
      expect(Array.isArray(historyCtx.body)).toBe(true);

      // 6. Check system health
      const healthCtx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getSystemHealth(healthCtx);
      expect(healthCtx.status).toBe(200);
      expect(healthCtx.body.status).toMatch(/^(healthy|degraded|unhealthy)$/);

      // Verify all services were called correctly
      expect(mockQueueManager.addCalculationJob).toHaveBeenCalled();
      expect(mockQueueManager.getQueueStatus).toHaveBeenCalled();
      expect(mockQueueManager.pauseQueue).toHaveBeenCalled();
      expect(mockQueueManager.resumeQueue).toHaveBeenCalled();
      expect(mockQueueManager.getJobHistory).toHaveBeenCalled();
    });
  });
});