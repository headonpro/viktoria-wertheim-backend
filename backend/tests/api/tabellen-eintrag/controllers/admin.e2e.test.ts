/**
 * End-to-End Tests for Admin Panel Extensions
 * Tests the complete admin panel workflow including recalculation, monitoring, and snapshots
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
  listSnapshots: jest.fn(),
  createSnapshot: jest.fn(),
  restoreSnapshot: jest.fn(),
  deleteSnapshot: jest.fn()
};

describe('Admin Panel Extensions E2E', () => {
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

    // Setup default responses
    mockStrapi.config.get.mockReturnValue({
      enabled: true,
      queueConcurrency: 3,
      maxRetries: 3
    });

    mockStrapi.db.connection.raw.mockResolvedValue([]);
    mockSnapshotService.listSnapshots.mockResolvedValue([]);
  });

  describe('Complete Admin Workflow', () => {
    it('should handle complete table management workflow', async () => {
      const ligaId = 1;
      const saisonId = 1;
      const userId = 1;
      const jobId = 'job_e2e_test';
      const snapshotId = 'snapshot_e2e_test';

      // Setup test data
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: ligaId, name: 'E2E Test Liga' }) // For recalculation
        .mockResolvedValueOnce({ id: ligaId, name: 'E2E Test Liga' }) // For snapshot creation
        .mockResolvedValueOnce({ id: saisonId, name: '2024/25' }); // For snapshot creation

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([{ id: saisonId, aktiv: true }]) // Active saison
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }, { id: 3 }]); // Teams

      // Mock service responses
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

      mockSnapshotService.createSnapshot.mockResolvedValue(snapshotId);
      mockSnapshotService.listSnapshots.mockResolvedValue([
        {
          id: snapshotId,
          ligaId,
          saisonId,
          createdAt: new Date(),
          description: 'E2E test snapshot',
          fileSize: 1024,
          entriesUpdated: 16
        }
      ]);

      // 1. Create a snapshot before making changes
      const createSnapshotCtx = {
        request: {
          body: {
            ligaId,
            saisonId,
            description: 'Before E2E test changes'
          }
        },
        state: { user: { id: userId } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.createSnapshot(createSnapshotCtx);
      expect(createSnapshotCtx.status).toBe(201);
      expect(createSnapshotCtx.body.success).toBe(true);

      // 2. Trigger manual recalculation
      const recalcCtx = {
        request: {
          body: {
            ligaId,
            priority: 'HIGH',
            description: 'E2E test recalculation'
          }
        },
        state: { user: { id: userId } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.triggerRecalculation(recalcCtx);
      expect(recalcCtx.status).toBe(200);
      expect(recalcCtx.body.success).toBe(true);
      expect(recalcCtx.body.jobId).toBe(jobId);

      // 3. Monitor queue status
      const queueStatusCtx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getQueueStatus(queueStatusCtx);
      expect(queueStatusCtx.status).toBe(200);
      expect(queueStatusCtx.body.isRunning).toBe(true);
      expect(queueStatusCtx.body.totalJobs).toBe(5);

      // 4. Check calculation history
      const historyCtx = {
        params: { ligaId: ligaId.toString() },
        query: { limit: '10' },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getCalculationHistory(historyCtx);
      expect(historyCtx.status).toBe(200);
      expect(Array.isArray(historyCtx.body)).toBe(true);
      expect(historyCtx.body[0].id).toBe(jobId);

      // 5. List snapshots
      const listSnapshotsCtx = {
        params: { ligaId: ligaId.toString(), saisonId: saisonId.toString() },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.listSnapshots(listSnapshotsCtx);
      expect(listSnapshotsCtx.status).toBe(200);
      expect(Array.isArray(listSnapshotsCtx.body)).toBe(true);
      expect(listSnapshotsCtx.body[0].id).toBe(snapshotId);

      // 6. Check system health
      const healthCtx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getSystemHealth(healthCtx);
      expect(healthCtx.status).toBe(200);
      expect(healthCtx.body.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(healthCtx.body.components).toHaveLength(3);

      // 7. Pause automation
      const pauseCtx = {
        state: { user: { id: userId } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.pauseAutomation(pauseCtx);
      expect(pauseCtx.status).toBe(200);
      expect(pauseCtx.body.success).toBe(true);

      // 8. Resume automation
      const resumeCtx = {
        state: { user: { id: userId } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.resumeAutomation(resumeCtx);
      expect(resumeCtx.status).toBe(200);
      expect(resumeCtx.body.success).toBe(true);

      // 9. Get settings
      const settingsCtx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getSettings(settingsCtx);
      expect(settingsCtx.status).toBe(200);
      expect(settingsCtx.body.enabled).toBe(true);

      // Verify all services were called correctly
      expect(mockSnapshotService.createSnapshot).toHaveBeenCalled();
      expect(mockQueueManager.addCalculationJob).toHaveBeenCalled();
      expect(mockQueueManager.getQueueStatus).toHaveBeenCalled();
      expect(mockQueueManager.getJobHistory).toHaveBeenCalled();
      expect(mockSnapshotService.listSnapshots).toHaveBeenCalled();
      expect(mockQueueManager.pauseQueue).toHaveBeenCalled();
      expect(mockQueueManager.resumeQueue).toHaveBeenCalled();

      // Verify logging
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Manual snapshot created',
        expect.any(Object)
      );
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Manual table recalculation triggered',
        expect.any(Object)
      );
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Automation paused by admin',
        expect.any(Object)
      );
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Automation resumed by admin',
        expect.any(Object)
      );
    });

    it('should handle error recovery workflow', async () => {
      const ligaId = 1;
      const saisonId = 1;
      const userId = 1;
      const snapshotId = 'snapshot_recovery_test';

      // Setup test data
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: ligaId, name: 'Recovery Test Liga' })
        .mockResolvedValueOnce({ id: saisonId, name: '2024/25' })
        .mockResolvedValueOnce({ id: ligaId, name: 'Recovery Test Liga' }); // For failed recalculation

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([{ id: saisonId, aktiv: true }])
        .mockResolvedValueOnce([{ id: 1 }]);

      mockSnapshotService.createSnapshot.mockResolvedValue(snapshotId);
      mockSnapshotService.restoreSnapshot.mockResolvedValue(undefined);

      // 1. Create snapshot before risky operation
      const createSnapshotCtx = {
        request: {
          body: {
            ligaId,
            saisonId,
            description: 'Before risky operation'
          }
        },
        state: { user: { id: userId } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.createSnapshot(createSnapshotCtx);
      expect(createSnapshotCtx.status).toBe(201);

      // 2. Simulate a failed operation (e.g., recalculation fails)
      const error = new Error('Calculation failed due to data corruption');
      mockQueueManager.addCalculationJob.mockRejectedValue(error);

      const failedRecalcCtx = {
        request: {
          body: { ligaId, priority: 'HIGH' }
        },
        state: { user: { id: userId } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.triggerRecalculation(failedRecalcCtx);
      expect(failedRecalcCtx.status).toBe(500);
      expect(failedRecalcCtx.body.success).toBe(false);

      // 3. Restore from snapshot to recover
      const restoreCtx = {
        params: { snapshotId },
        request: {
          body: { confirmRestore: true }
        },
        state: { user: { id: userId } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.restoreSnapshot(restoreCtx);
      expect(restoreCtx.status).toBe(200);
      expect(restoreCtx.body.success).toBe(true);

      // Verify error was logged
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Error triggering recalculation:',
        error
      );

      // Verify recovery was logged
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Snapshot restored by admin',
        expect.objectContaining({
          snapshotId,
          userId
        })
      );
    });

    it('should handle concurrent admin operations', async () => {
      const ligaId = 1;
      const saisonId = 1;
      const userId1 = 1;
      const userId2 = 2;

      // Setup concurrent operations
      mockStrapi.entityService.findOne.mockResolvedValue({ id: ligaId, name: 'Concurrent Test Liga' });
      mockStrapi.entityService.findMany
        .mockResolvedValue([{ id: saisonId, aktiv: true }])
        .mockResolvedValue([{ id: 1 }, { id: 2 }]);

      mockQueueManager.addCalculationJob
        .mockResolvedValueOnce('job_user1')
        .mockResolvedValueOnce('job_user2');

      mockQueueManager.getQueueStatus.mockResolvedValue({
        isRunning: true,
        totalJobs: 2,
        pendingJobs: 2,
        processingJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        averageProcessingTime: 0,
        currentJobs: []
      });

      // User 1 triggers recalculation
      const user1Ctx = {
        request: {
          body: { ligaId, priority: 'HIGH', description: 'User 1 recalculation' }
        },
        state: { user: { id: userId1 } },
        status: 0,
        body: null
      } as unknown as Context;

      // User 2 triggers recalculation simultaneously
      const user2Ctx = {
        request: {
          body: { ligaId, priority: 'NORMAL', description: 'User 2 recalculation' }
        },
        state: { user: { id: userId2 } },
        status: 0,
        body: null
      } as unknown as Context;

      // Execute concurrent operations
      await Promise.all([
        adminController.triggerRecalculation(user1Ctx),
        adminController.triggerRecalculation(user2Ctx)
      ]);

      expect(user1Ctx.status).toBe(200);
      expect(user2Ctx.status).toBe(200);
      expect(user1Ctx.body.jobId).toBe('job_user1');
      expect(user2Ctx.body.jobId).toBe('job_user2');

      // Check queue status shows both jobs
      const queueCtx = {
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.getQueueStatus(queueCtx);
      expect(queueCtx.body.totalJobs).toBe(2);
      expect(queueCtx.body.pendingJobs).toBe(2);

      // Verify both operations were logged with correct user context
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Manual table recalculation triggered',
        expect.objectContaining({ userId: userId1 })
      );
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Manual table recalculation triggered',
        expect.objectContaining({ userId: userId2 })
      );
    });

    it('should maintain audit trail for all admin actions', async () => {
      const ligaId = 1;
      const saisonId = 1;
      const userId = 42;
      const jobId = 'job_audit_test';
      const snapshotId = 'snapshot_audit_test';

      // Setup test data
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: ligaId, name: 'Audit Test Liga' })
        .mockResolvedValueOnce({ id: ligaId, name: 'Audit Test Liga' })
        .mockResolvedValueOnce({ id: saisonId, name: '2024/25' });

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([{ id: saisonId, aktiv: true }])
        .mockResolvedValueOnce([{ id: 1 }]);

      mockQueueManager.addCalculationJob.mockResolvedValue(jobId);
      mockSnapshotService.createSnapshot.mockResolvedValue(snapshotId);
      mockSnapshotService.restoreSnapshot.mockResolvedValue(undefined);
      mockSnapshotService.deleteSnapshot.mockResolvedValue(undefined);

      // Perform various admin actions
      const actions = [
        {
          name: 'triggerRecalculation',
          ctx: {
            request: { body: { ligaId, description: 'Audit test' } },
            state: { user: { id: userId } },
            status: 0,
            body: null
          },
          expectedLog: 'Manual table recalculation triggered'
        },
        {
          name: 'createSnapshot',
          ctx: {
            request: { body: { ligaId, saisonId, description: 'Audit snapshot' } },
            state: { user: { id: userId } },
            status: 0,
            body: null
          },
          expectedLog: 'Manual snapshot created'
        },
        {
          name: 'restoreSnapshot',
          ctx: {
            params: { snapshotId },
            request: { body: { confirmRestore: true } },
            state: { user: { id: userId } },
            status: 0,
            body: null
          },
          expectedLog: 'Snapshot restored by admin'
        },
        {
          name: 'deleteSnapshot',
          ctx: {
            params: { snapshotId },
            state: { user: { id: userId } },
            status: 0,
            body: null
          },
          expectedLog: 'Snapshot deleted by admin'
        },
        {
          name: 'pauseAutomation',
          ctx: {
            state: { user: { id: userId } },
            status: 0,
            body: null
          },
          expectedLog: 'Automation paused by admin'
        },
        {
          name: 'resumeAutomation',
          ctx: {
            state: { user: { id: userId } },
            status: 0,
            body: null
          },
          expectedLog: 'Automation resumed by admin'
        }
      ];

      // Execute all actions and verify logging
      for (const action of actions) {
        mockStrapi.log.info.mockClear();
        
        await adminController[action.name](action.ctx as Context);
        
        expect(mockStrapi.log.info).toHaveBeenCalledWith(
          action.expectedLog,
          expect.objectContaining({
            userId
          })
        );
      }

      // Verify all actions completed successfully
      expect(actions.every(action => action.ctx.status === 200 || action.ctx.status === 201)).toBe(true);
    });
  });
});