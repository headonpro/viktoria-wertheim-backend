/**
 * Integration Tests for SnapshotService
 * Tests complete rollback scenarios with real database operations
 */

import { SnapshotServiceImpl, TabellenEintrag, RestoreResult } from '../../../../src/api/tabellen-eintrag/services/snapshot';
import * as fs from 'fs/promises';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import * as path from 'path';

describe('SnapshotService Integration Tests', () => {
  let snapshotService: SnapshotServiceImpl;
  let mockStrapi: any;
  let testStorageDir: string;

  const mockTableData: TabellenEintrag[] = [
    {
      id: 1,
      team_name: 'Team A',
      liga: { id: 1, name: 'Liga 1' },
      team: { id: 1, name: 'Team A' },
      platz: 1,
      spiele: 10,
      siege: 8,
      unentschieden: 1,
      niederlagen: 1,
      tore_fuer: 25,
      tore_gegen: 8,
      tordifferenz: 17,
      punkte: 25,
      last_updated: new Date(),
      auto_calculated: true,
      calculation_source: 'automatic'
    },
    {
      id: 2,
      team_name: 'Team B',
      liga: { id: 1, name: 'Liga 1' },
      team: { id: 2, name: 'Team B' },
      platz: 2,
      spiele: 10,
      siege: 6,
      unentschieden: 2,
      niederlagen: 2,
      tore_fuer: 18,
      tore_gegen: 12,
      tordifferenz: 6,
      punkte: 20,
      last_updated: new Date(),
      auto_calculated: true,
      calculation_source: 'automatic'
    }
  ];

  const updatedTableData: TabellenEintrag[] = [
    {
      id: 1,
      team_name: 'Team A',
      liga: { id: 1, name: 'Liga 1' },
      team: { id: 1, name: 'Team A' },
      platz: 1,
      spiele: 11,
      siege: 9,
      unentschieden: 1,
      niederlagen: 1,
      tore_fuer: 28,
      tore_gegen: 8,
      tordifferenz: 20,
      punkte: 28,
      last_updated: new Date(),
      auto_calculated: true,
      calculation_source: 'automatic'
    },
    {
      id: 2,
      team_name: 'Team B',
      liga: { id: 1, name: 'Liga 1' },
      team: { id: 2, name: 'Team B' },
      platz: 2,
      spiele: 11,
      siege: 6,
      unentschieden: 2,
      niederlagen: 3,
      tore_fuer: 18,
      tore_gegen: 15,
      tordifferenz: 3,
      punkte: 20,
      last_updated: new Date(),
      auto_calculated: true,
      calculation_source: 'automatic'
    }
  ];

  beforeEach(async () => {
    // Setup test storage directory
    testStorageDir = path.join(__dirname, 'test-snapshots');
    
    try {
      await fs.mkdir(testStorageDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Mock Strapi with more realistic database operations
    mockStrapi = {
      log: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      },
      db: {
        query: jest.fn().mockReturnValue({
          findMany: jest.fn().mockResolvedValue(mockTableData),
          deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
          create: jest.fn().mockImplementation((options) => {
            return Promise.resolve({
              id: Math.floor(Math.random() * 1000),
              ...options.data
            });
          })
        }),
        transaction: jest.fn().mockImplementation(async (callback) => {
          return await callback({});
        })
      }
    };

    snapshotService = new SnapshotServiceImpl(mockStrapi, {
      storageDirectory: testStorageDir,
      maxSnapshots: 5,
      maxAge: 7,
      compressionEnabled: false,
      checksumEnabled: true
    });
  });

  afterEach(async () => {
    // Cleanup test files
    try {
      const files = await fs.readdir(testStorageDir);
      for (const file of files) {
        await fs.unlink(path.join(testStorageDir, file));
      }
      await fs.rmdir(testStorageDir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Complete Rollback Workflow', () => {
    it('should create snapshot, modify data, and rollback successfully', async () => {
      const ligaId = 1;
      const saisonId = 1;

      // Step 1: Create initial snapshot
      const initialSnapshotId = await snapshotService.createSnapshot(
        ligaId,
        saisonId,
        'Initial table state'
      );

      expect(initialSnapshotId).toMatch(/^snapshot_1_1_/);

      // Step 2: Simulate data modification
      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(updatedTableData),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        create: jest.fn().mockImplementation((options) => {
          return Promise.resolve({
            id: Math.floor(Math.random() * 1000),
            ...options.data
          });
        })
      });

      // Step 3: Create snapshot after modification
      const modifiedSnapshotId = await snapshotService.createSnapshot(
        ligaId,
        saisonId,
        'Modified table state'
      );

      expect(modifiedSnapshotId).toMatch(/^snapshot_1_1_/);
      expect(modifiedSnapshotId).not.toBe(initialSnapshotId);

      // Step 4: Rollback to initial state
      const restoreResult = await snapshotService.restoreSnapshot(initialSnapshotId);

      if (!restoreResult.success) {
        console.log('Restore failed with errors:', JSON.stringify(restoreResult.errors, null, 2));
        console.log('Restore result:', JSON.stringify(restoreResult, null, 2));
      }

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoredEntries).toBe(2);
      expect(restoreResult.errors).toHaveLength(0);

      // Verify database operations were called correctly
      expect(mockStrapi.db.query().deleteMany).toHaveBeenCalled();
      expect(mockStrapi.db.query().create).toHaveBeenCalledTimes(2); // 2 table entries restored
      expect(mockStrapi.db.transaction).toHaveBeenCalled();
    });

    it('should handle rollback with database errors gracefully', async () => {
      const ligaId = 1;
      const saisonId = 1;

      // Create snapshot
      const snapshotId = await snapshotService.createSnapshot(ligaId, saisonId);

      // Mock database error during restore transaction
      mockStrapi.db.transaction.mockImplementation(async (callback) => {
        throw new Error('Database connection failed');
      });

      // Attempt rollback
      const restoreResult = await snapshotService.restoreSnapshot(snapshotId);

      expect(restoreResult.success).toBe(false);
      expect(restoreResult.errors).toHaveLength(1);
      expect(restoreResult.errors[0].type).toBe('database_error');
      expect(restoreResult.errors[0].message).toContain('Database connection failed');
    });

    it('should create backup before rollback in production', async () => {
      const ligaId = 1;
      const saisonId = 1;

      // Set production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        // Create initial snapshot
        const snapshotId = await snapshotService.createSnapshot(ligaId, saisonId, 'Initial snapshot');

        // Mock createSnapshot to track backup creation
        const createSnapshotSpy = jest.spyOn(snapshotService, 'createSnapshot');

        // Perform rollback
        const restoreResult = await snapshotService.restoreSnapshot(snapshotId);

        // Verify backup was created
        expect(createSnapshotSpy).toHaveBeenCalledWith(
          ligaId,
          saisonId,
          expect.stringContaining('Pre-restore backup')
        );
      } finally {
        // Restore original environment
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should validate snapshot before rollback', async () => {
      const ligaId = 1;
      const saisonId = 1;

      // Create snapshot
      const snapshotId = await snapshotService.createSnapshot(ligaId, saisonId);

      // Corrupt the snapshot file with invalid JSON
      const snapshotPath = path.join(testStorageDir, `${snapshotId}.json`);
      await fs.writeFile(snapshotPath, '{"invalid": json content}');

      // Attempt rollback
      const restoreResult = await snapshotService.restoreSnapshot(snapshotId);

      expect(restoreResult.success).toBe(false);
      expect(restoreResult.errors).toHaveLength(1);
      expect(restoreResult.errors[0].type).toBe('validation_error');
    });
  });

  describe('Snapshot Listing and Selection', () => {
    it('should list snapshots in chronological order', async () => {
      const ligaId = 1;
      const saisonId = 1;

      // Create multiple snapshots with delays to ensure different timestamps
      const snapshot1 = await snapshotService.createSnapshot(ligaId, saisonId, 'First snapshot');
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const snapshot2 = await snapshotService.createSnapshot(ligaId, saisonId, 'Second snapshot');
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const snapshot3 = await snapshotService.createSnapshot(ligaId, saisonId, 'Third snapshot');

      // List snapshots
      const snapshots = await snapshotService.listSnapshots(ligaId, saisonId);

      expect(snapshots).toHaveLength(3);
      expect(snapshots[0].id).toBe(snapshot3); // Newest first
      expect(snapshots[1].id).toBe(snapshot2);
      expect(snapshots[2].id).toBe(snapshot1); // Oldest last
    });

    it('should provide snapshot metadata for selection', async () => {
      const ligaId = 1;
      const saisonId = 1;
      const description = 'Test snapshot for metadata';

      const snapshotId = await snapshotService.createSnapshot(ligaId, saisonId, description);

      const metadata = await snapshotService.getSnapshotMetadata(snapshotId);

      expect(metadata).toBeDefined();
      expect(metadata?.id).toBe(snapshotId);
      expect(metadata?.ligaId).toBe(ligaId);
      expect(metadata?.saisonId).toBe(saisonId);
      expect(metadata?.description).toBe(description);
      expect(metadata?.entryCount).toBe(2);
      expect(metadata?.size).toBeGreaterThan(0);
    });

    it('should list metadata for multiple snapshots efficiently', async () => {
      const ligaId = 1;
      const saisonId = 1;

      // Create multiple snapshots
      await snapshotService.createSnapshot(ligaId, saisonId, 'Snapshot 1');
      await snapshotService.createSnapshot(ligaId, saisonId, 'Snapshot 2');
      await snapshotService.createSnapshot(ligaId, saisonId, 'Snapshot 3');

      const metadataList = await snapshotService.listSnapshotMetadata(ligaId, saisonId);

      expect(metadataList).toHaveLength(3);
      expect(metadataList[0].description).toBe('Snapshot 3'); // Newest first
      expect(metadataList[1].description).toBe('Snapshot 2');
      expect(metadataList[2].description).toBe('Snapshot 1'); // Oldest last

      // Verify all metadata has required fields
      metadataList.forEach(meta => {
        expect(meta.id).toBeDefined();
        expect(meta.ligaId).toBe(ligaId);
        expect(meta.saisonId).toBe(saisonId);
        expect(meta.entryCount).toBe(2);
        expect(meta.size).toBeGreaterThan(0);
      });
    });
  });

  describe('Rollback Confirmation and Logging', () => {
    it('should log successful rollback operations', async () => {
      const ligaId = 1;
      const saisonId = 1;

      const snapshotId = await snapshotService.createSnapshot(ligaId, saisonId);
      await snapshotService.restoreSnapshot(snapshotId);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining(`Snapshot restored: ${snapshotId}`)
      );
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Restored 2 entries')
      );
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Backup created')
      );
    });

    it('should log rollback errors with details', async () => {
      const nonExistentSnapshotId = 'non-existent-snapshot';

      const restoreResult = await snapshotService.restoreSnapshot(nonExistentSnapshotId);

      expect(restoreResult.success).toBe(false);
      expect(restoreResult.errors[0].type).toBe('snapshot_not_found');
      expect(restoreResult.errors[0].message).toContain(nonExistentSnapshotId);
    });

    it('should provide detailed restore results for confirmation', async () => {
      const ligaId = 1;
      const saisonId = 1;

      const snapshotId = await snapshotService.createSnapshot(ligaId, saisonId);
      const restoreResult = await snapshotService.restoreSnapshot(snapshotId);

      expect(restoreResult).toHaveProperty('success');
      expect(restoreResult).toHaveProperty('restoredEntries');
      expect(restoreResult).toHaveProperty('errors');
      expect(restoreResult).toHaveProperty('timestamp');

      expect(restoreResult.success).toBe(true);
      expect(restoreResult.restoredEntries).toBe(2);
      expect(restoreResult.errors).toHaveLength(0);
      expect(restoreResult.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle partial restore failures gracefully', async () => {
      const ligaId = 1;
      const saisonId = 1;

      const snapshotId = await snapshotService.createSnapshot(ligaId, saisonId);

      // Mock partial failure during restore
      let createCallCount = 0;
      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockTableData),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        create: jest.fn().mockImplementation(() => {
          createCallCount++;
          if (createCallCount === 2) {
            throw new Error('Failed to create second entry');
          }
          return Promise.resolve({ id: createCallCount });
        })
      });

      const restoreResult = await snapshotService.restoreSnapshot(snapshotId);

      expect(restoreResult.success).toBe(false);
      expect(restoreResult.restoredEntries).toBe(1); // Only first entry succeeded
      expect(restoreResult.errors).toHaveLength(1);
      expect(restoreResult.errors[0].message).toContain('Failed to restore entry');
    });

    it('should handle corrupted snapshot files', async () => {
      const ligaId = 1;
      const saisonId = 1;

      // Create a corrupted snapshot file directly
      const corruptedSnapshotId = 'snapshot_1_1_corrupted';
      const corruptedPath = path.join(testStorageDir, `${corruptedSnapshotId}.json`);
      await fs.writeFile(corruptedPath, '{"invalid": "json", "content": }');

      const restoreResult = await snapshotService.restoreSnapshot(corruptedSnapshotId);

      expect(restoreResult.success).toBe(false);
      expect(restoreResult.errors).toHaveLength(1);
      expect(restoreResult.errors[0].type).toBe('validation_error');
    });

    it('should handle missing snapshot files', async () => {
      const nonExistentId = 'snapshot_1_1_missing';

      const restoreResult = await snapshotService.restoreSnapshot(nonExistentId);

      expect(restoreResult.success).toBe(false);
      expect(restoreResult.errors).toHaveLength(1);
      expect(restoreResult.errors[0].type).toBe('snapshot_not_found');
    });
  });
});