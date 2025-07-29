/**
 * Tests for Snapshot Management Admin Functionality
 * Tests the admin endpoints used by the snapshot management interface
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
  }
};

global.strapi = mockStrapi as any;

// Mock services
const mockSnapshotService = {
  listSnapshots: jest.fn(),
  createSnapshot: jest.fn(),
  restoreSnapshot: jest.fn(),
  deleteSnapshot: jest.fn()
};

describe('Snapshot Management Admin Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStrapi.service.mockImplementation((serviceName: string) => {
      switch (serviceName) {
        case 'api::tabellen-eintrag.snapshot':
          return mockSnapshotService;
        default:
          return {};
      }
    });
  });

  describe('listSnapshots', () => {
    it('should return snapshots for valid liga and saison', async () => {
      const mockSnapshots = [
        {
          id: 'snapshot_1',
          ligaId: 1,
          saisonId: 1,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          description: 'Manual snapshot before corrections',
          fileSize: 1024,
          entriesCount: 16
        },
        {
          id: 'snapshot_2',
          ligaId: 1,
          saisonId: 1,
          createdAt: new Date('2024-01-01T09:00:00Z'),
          description: 'Automatic snapshot',
          fileSize: 2048,
          entriesCount: 16
        }
      ];

      mockSnapshotService.listSnapshots.mockResolvedValue(mockSnapshots);

      const ctx = {
        params: { ligaId: '1', saisonId: '1' },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.listSnapshots(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual(mockSnapshots);
      expect(mockSnapshotService.listSnapshots).toHaveBeenCalledWith(1, 1);
    });

    it('should return 400 for missing ligaId', async () => {
      const ctx = {
        params: { saisonId: '1' },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.listSnapshots(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({
        error: 'Liga ID und Saison ID sind erforderlich'
      });
    });

    it('should return 400 for missing saisonId', async () => {
      const ctx = {
        params: { ligaId: '1' },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.listSnapshots(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({
        error: 'Liga ID und Saison ID sind erforderlich'
      });
    });

    it('should handle service errors gracefully', async () => {
      const error = new Error('Snapshot service unavailable');
      mockSnapshotService.listSnapshots.mockRejectedValue(error);

      const ctx = {
        params: { ligaId: '1', saisonId: '1' },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.listSnapshots(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body).toEqual({
        error: 'Fehler beim Abrufen der Snapshots',
        message: 'Snapshot service unavailable'
      });
    });
  });

  describe('createSnapshot', () => {
    it('should create snapshot with valid data', async () => {
      const ligaId = 1;
      const saisonId = 1;
      const description = 'Test snapshot';
      const snapshotId = 'snapshot_new_123';

      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: ligaId, name: 'Test Liga' }) // Liga
        .mockResolvedValueOnce({ id: saisonId, name: '2024/25' }); // Saison

      mockSnapshotService.createSnapshot.mockResolvedValue(snapshotId);

      const ctx = {
        request: {
          body: { ligaId, saisonId, description }
        },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.createSnapshot(ctx);

      expect(ctx.status).toBe(201);
      expect(ctx.body).toEqual({
        success: true,
        snapshotId,
        message: 'Snapshot wurde erfolgreich erstellt'
      });

      expect(mockSnapshotService.createSnapshot).toHaveBeenCalledWith(
        ligaId,
        saisonId,
        description
      );

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Manual snapshot created',
        expect.objectContaining({
          snapshotId,
          ligaId,
          saisonId,
          userId: 1,
          description
        })
      );
    });

    it('should create snapshot with auto-generated description', async () => {
      const ligaId = 1;
      const saisonId = 1;
      const snapshotId = 'snapshot_auto_desc';

      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: ligaId, name: 'Test Liga' })
        .mockResolvedValueOnce({ id: saisonId, name: '2024/25' });

      mockSnapshotService.createSnapshot.mockResolvedValue(snapshotId);

      const ctx = {
        request: {
          body: { ligaId, saisonId } // No description provided
        },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.createSnapshot(ctx);

      expect(ctx.status).toBe(201);
      expect(mockSnapshotService.createSnapshot).toHaveBeenCalledWith(
        ligaId,
        saisonId,
        expect.stringContaining('Manueller Snapshot für Liga "Test Liga"')
      );
    });

    it('should return 400 for missing ligaId', async () => {
      const ctx = {
        request: {
          body: { saisonId: 1 }
        },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.createSnapshot(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({
        error: 'Liga ID und Saison ID sind erforderlich'
      });
    });

    it('should return 404 for non-existent liga', async () => {
      mockStrapi.entityService.findOne.mockResolvedValue(null);

      const ctx = {
        request: {
          body: { ligaId: 999, saisonId: 1 }
        },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.createSnapshot(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body).toEqual({
        error: 'Liga nicht gefunden'
      });
    });

    it('should return 404 for non-existent saison', async () => {
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: 1, name: 'Test Liga' }) // Liga exists
        .mockResolvedValueOnce(null); // Saison doesn't exist

      const ctx = {
        request: {
          body: { ligaId: 1, saisonId: 999 }
        },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.createSnapshot(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body).toEqual({
        error: 'Saison nicht gefunden'
      });
    });
  });

  describe('restoreSnapshot', () => {
    it('should restore snapshot with confirmation', async () => {
      const snapshotId = 'snapshot_restore_123';

      mockSnapshotService.restoreSnapshot.mockResolvedValue(undefined);

      const ctx = {
        params: { snapshotId },
        request: {
          body: { confirmRestore: true }
        },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.restoreSnapshot(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({
        success: true,
        message: 'Snapshot wurde erfolgreich wiederhergestellt'
      });

      expect(mockSnapshotService.restoreSnapshot).toHaveBeenCalledWith(snapshotId);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Snapshot restored by admin',
        expect.objectContaining({
          snapshotId,
          userId: 1,
          timestamp: expect.any(Date)
        })
      );
    });

    it('should return 400 for missing snapshotId', async () => {
      const ctx = {
        params: {},
        request: {
          body: { confirmRestore: true }
        },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.restoreSnapshot(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({
        error: 'Snapshot ID ist erforderlich'
      });
    });

    it('should return 400 without confirmation', async () => {
      const ctx = {
        params: { snapshotId: 'snapshot_123' },
        request: {
          body: { confirmRestore: false }
        },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.restoreSnapshot(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({
        error: 'Bestätigung für Wiederherstellung ist erforderlich',
        message: 'Setzen Sie confirmRestore auf true um die Wiederherstellung zu bestätigen'
      });
    });

    it('should handle restore errors gracefully', async () => {
      const error = new Error('Snapshot file corrupted');
      mockSnapshotService.restoreSnapshot.mockRejectedValue(error);

      const ctx = {
        params: { snapshotId: 'snapshot_123' },
        request: {
          body: { confirmRestore: true }
        },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.restoreSnapshot(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body).toMatchObject({
        error: 'Fehler beim Wiederherstellen des Snapshots',
        message: expect.any(String)
      });
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete snapshot successfully', async () => {
      const snapshotId = 'snapshot_delete_123';

      mockSnapshotService.deleteSnapshot.mockResolvedValue(undefined);

      const ctx = {
        params: { snapshotId },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.deleteSnapshot(ctx);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({
        success: true,
        message: 'Snapshot wurde erfolgreich gelöscht'
      });

      expect(mockSnapshotService.deleteSnapshot).toHaveBeenCalledWith(snapshotId);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Snapshot deleted by admin',
        expect.objectContaining({
          snapshotId,
          userId: 1,
          timestamp: expect.any(Date)
        })
      );
    });

    it('should return 400 for missing snapshotId', async () => {
      const ctx = {
        params: {},
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.deleteSnapshot(ctx);

      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({
        error: 'Snapshot ID ist erforderlich'
      });
    });

    it('should return 404 for non-existent snapshot', async () => {
      const error = new Error('Snapshot not found');
      mockSnapshotService.deleteSnapshot.mockRejectedValue(error);

      const ctx = {
        params: { snapshotId: 'nonexistent_snapshot' },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.deleteSnapshot(ctx);

      expect(ctx.status).toBe(404);
      expect(ctx.body).toEqual({
        error: 'Snapshot nicht gefunden'
      });
    });

    it('should handle other delete errors gracefully', async () => {
      const error = new Error('File system error');
      mockSnapshotService.deleteSnapshot.mockRejectedValue(error);

      const ctx = {
        params: { snapshotId: 'snapshot_123' },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.deleteSnapshot(ctx);

      expect(ctx.status).toBe(500);
      expect(ctx.body).toEqual({
        error: 'Fehler beim Löschen des Snapshots',
        message: 'File system error'
      });
    });
  });

  describe('Snapshot Management Workflow', () => {
    it('should handle complete snapshot lifecycle', async () => {
      const ligaId = 1;
      const saisonId = 1;
      const description = 'Workflow test snapshot';
      const snapshotId = 'snapshot_workflow_123';

      // 1. Create snapshot
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: ligaId, name: 'Workflow Liga' })
        .mockResolvedValueOnce({ id: saisonId, name: '2024/25' });

      mockSnapshotService.createSnapshot.mockResolvedValue(snapshotId);

      const createCtx = {
        request: {
          body: { ligaId, saisonId, description }
        },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.createSnapshot(createCtx);
      expect(createCtx.status).toBe(201);
      expect(createCtx.body.snapshotId).toBe(snapshotId);

      // 2. List snapshots
      const mockSnapshots = [
        {
          id: snapshotId,
          ligaId,
          saisonId,
          createdAt: new Date(),
          description,
          fileSize: 1024,
          entriesCount: 16
        }
      ];

      mockSnapshotService.listSnapshots.mockResolvedValue(mockSnapshots);

      const listCtx = {
        params: { ligaId: ligaId.toString(), saisonId: saisonId.toString() },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.listSnapshots(listCtx);
      expect(listCtx.status).toBe(200);
      expect(listCtx.body).toEqual(mockSnapshots);

      // 3. Restore snapshot
      mockSnapshotService.restoreSnapshot.mockResolvedValue(undefined);

      const restoreCtx = {
        params: { snapshotId },
        request: {
          body: { confirmRestore: true }
        },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.restoreSnapshot(restoreCtx);
      expect(restoreCtx.status).toBe(200);
      expect(restoreCtx.body.success).toBe(true);

      // 4. Delete snapshot
      mockSnapshotService.deleteSnapshot.mockResolvedValue(undefined);

      const deleteCtx = {
        params: { snapshotId },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.deleteSnapshot(deleteCtx);
      expect(deleteCtx.status).toBe(200);
      expect(deleteCtx.body.success).toBe(true);

      // Verify all service calls were made
      expect(mockSnapshotService.createSnapshot).toHaveBeenCalled();
      expect(mockSnapshotService.listSnapshots).toHaveBeenCalled();
      expect(mockSnapshotService.restoreSnapshot).toHaveBeenCalled();
      expect(mockSnapshotService.deleteSnapshot).toHaveBeenCalled();
    });

    it('should log all admin actions with proper context', async () => {
      const userId = 42;
      const snapshotId = 'snapshot_logging_test';

      // Test create logging
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce({ id: 1, name: 'Test Liga' })
        .mockResolvedValueOnce({ id: 1, name: '2024/25' });

      mockSnapshotService.createSnapshot.mockResolvedValue(snapshotId);

      const createCtx = {
        request: {
          body: { ligaId: 1, saisonId: 1, description: 'Test' }
        },
        state: { user: { id: userId } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.createSnapshot(createCtx);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Manual snapshot created',
        expect.objectContaining({
          snapshotId,
          ligaId: 1,
          saisonId: 1,
          userId,
          description: 'Test'
        })
      );

      // Clear previous log calls
      mockStrapi.log.info.mockClear();

      // Test restore logging
      mockSnapshotService.restoreSnapshot.mockResolvedValue(undefined);

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

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Snapshot restored by admin',
        expect.objectContaining({
          snapshotId,
          userId,
          timestamp: expect.any(Date)
        })
      );

      // Clear previous log calls
      mockStrapi.log.info.mockClear();

      // Test delete logging
      mockSnapshotService.deleteSnapshot.mockResolvedValue(undefined);

      const deleteCtx = {
        params: { snapshotId },
        state: { user: { id: userId } },
        status: 0,
        body: null
      } as unknown as Context;

      await adminController.deleteSnapshot(deleteCtx);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Snapshot deleted by admin',
        expect.objectContaining({
          snapshotId,
          userId,
          timestamp: expect.any(Date)
        })
      );
    });
  });
});