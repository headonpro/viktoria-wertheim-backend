/**
 * Simple Integration Test for SnapshotService
 * Focus on basic functionality without complex mocking
 */

import { SnapshotServiceImpl } from '../../../../src/api/tabellen-eintrag/services/snapshot';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('SnapshotService Simple Test', () => {
  let snapshotService: SnapshotServiceImpl;
  let mockStrapi: any;
  let testStorageDir: string;

  beforeEach(async () => {
    // Setup test storage directory
    testStorageDir = path.join(__dirname, 'test-snapshots-simple');
    
    try {
      await fs.mkdir(testStorageDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    // Simple mock Strapi
    mockStrapi = {
      log: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      },
      db: {
        query: jest.fn().mockReturnValue({
          findMany: jest.fn().mockResolvedValue([
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
              punkte: 25
            }
          ]),
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          create: jest.fn().mockResolvedValue({ id: 1 })
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
      checksumEnabled: false // Disable checksum for simplicity
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

  it('should create and restore a snapshot successfully', async () => {
    const ligaId = 1;
    const saisonId = 1;

    // Create snapshot
    const snapshotId = await snapshotService.createSnapshot(ligaId, saisonId, 'Test snapshot');
    expect(snapshotId).toMatch(/^snapshot_1_1_/);

    // Verify snapshot was created
    const snapshot = await snapshotService.getSnapshot(snapshotId);
    expect(snapshot).toBeDefined();
    expect(snapshot?.data).toHaveLength(1);

    // Restore snapshot
    const restoreResult = await snapshotService.restoreSnapshot(snapshotId);
    
    console.log('Restore result:', JSON.stringify(restoreResult, null, 2));
    
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.restoredEntries).toBe(1);
    expect(restoreResult.errors).toHaveLength(0);
  });
});