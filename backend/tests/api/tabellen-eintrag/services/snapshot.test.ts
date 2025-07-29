/**
 * Unit Tests for SnapshotService
 * Tests snapshot creation, storage, and validation functionality
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { SnapshotServiceImpl, TabellenEintrag, Snapshot } from '../../../../src/api/tabellen-eintrag/services/snapshot';

// Mock fs module
jest.mock('fs/promises');
jest.mock('path');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;

describe('SnapshotService', () => {
  let snapshotService: SnapshotServiceImpl;
  let mockStrapi: any;
  let mockConfig: any;

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

  beforeEach(() => {
    mockStrapi = {
      log: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
      },
      db: {
        query: jest.fn().mockReturnValue({
          findMany: jest.fn().mockResolvedValue(mockTableData),
          deleteMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({})
        }),
        transaction: jest.fn().mockImplementation(async (callback) => {
          return await callback({});
        })
      }
    };

    mockConfig = {
      storageDirectory: './test-snapshots',
      maxSnapshots: 10,
      maxAge: 30,
      compressionEnabled: false,
      checksumEnabled: true
    };

    snapshotService = new SnapshotServiceImpl(mockStrapi, mockConfig);

    // Mock path.join
    mockPath.join.mockImplementation((...args: string[]) => args.join('/'));

    // Mock fs operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(Buffer.from('{}'));
    mockFs.readdir.mockResolvedValue([]);
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.stat.mockResolvedValue({ mtime: new Date() });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSnapshot', () => {
    it('should create a snapshot successfully', async () => {
      const ligaId = 1;
      const saisonId = 1;
      const description = 'Test snapshot';

      const snapshotId = await snapshotService.createSnapshot(ligaId, saisonId, description);

      expect(snapshotId).toMatch(/^snapshot_1_1_/);
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Snapshot created')
      );
    });

    it('should generate unique snapshot IDs', async () => {
      const ligaId = 1;
      const saisonId = 1;

      const id1 = await snapshotService.createSnapshot(ligaId, saisonId);
      const id2 = await snapshotService.createSnapshot(ligaId, saisonId);

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^snapshot_1_1_/);
      expect(id2).toMatch(/^snapshot_1_1_/);
    });

    it('should use default description when none provided', async () => {
      const ligaId = 1;
      const saisonId = 1;

      await snapshotService.createSnapshot(ligaId, saisonId);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const snapshotData = JSON.parse(writeCall[1].toString());
      
      expect(snapshotData.description).toBe('Automatic snapshot for Liga 1, Saison 1');
    });

    it('should calculate checksum when enabled', async () => {
      const ligaId = 1;
      const saisonId = 1;

      await snapshotService.createSnapshot(ligaId, saisonId);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const snapshotData = JSON.parse(writeCall[1].toString());
      
      expect(snapshotData.checksum).toBeDefined();
      expect(snapshotData.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should handle database errors gracefully', async () => {
      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      await expect(snapshotService.createSnapshot(1, 1)).rejects.toThrow('Failed to create snapshot');
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });

    it('should handle file system errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('File system error'));

      await expect(snapshotService.createSnapshot(1, 1)).rejects.toThrow('Failed to create snapshot');
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });

  describe('getSnapshot', () => {
    it('should retrieve an existing snapshot', async () => {
      const mockSnapshot: Snapshot = {
        id: 'test-snapshot-id',
        ligaId: 1,
        saisonId: 1,
        data: mockTableData,
        createdAt: new Date(),
        description: 'Test snapshot',
        filePath: './test-snapshots/test-snapshot-id.json',
        checksum: 'test-checksum',
        size: 1000
      };

      mockFs.readFile.mockResolvedValue(Buffer.from(JSON.stringify(mockSnapshot)));

      const result = await snapshotService.getSnapshot('test-snapshot-id');

      expect(result).toBeDefined();
      expect(result?.id).toBe('test-snapshot-id');
      expect(result?.ligaId).toBe(1);
      expect(result?.data).toHaveLength(2);
    });

    it('should return null for non-existent snapshot', async () => {
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      const result = await snapshotService.getSnapshot('non-existent-id');

      expect(result).toBeNull();
    });

    it('should throw error for other file system errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      await expect(snapshotService.getSnapshot('test-id')).rejects.toThrow('Failed to get snapshot');
    });

    it('should parse dates correctly', async () => {
      const testDate = new Date('2024-01-01T12:00:00Z');
      const mockSnapshot = {
        id: 'test-snapshot-id',
        ligaId: 1,
        saisonId: 1,
        data: [],
        createdAt: testDate.toISOString(),
        description: 'Test snapshot',
        filePath: './test-snapshots/test-snapshot-id.json',
        checksum: 'test-checksum',
        size: 1000
      };

      mockFs.readFile.mockResolvedValue(Buffer.from(JSON.stringify(mockSnapshot)));

      const result = await snapshotService.getSnapshot('test-snapshot-id');

      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.createdAt.getTime()).toBe(testDate.getTime());
    });
  });

  describe('listSnapshots', () => {
    it('should list snapshots for specific liga and saison', async () => {
      const mockFiles = [
        'snapshot_1_1_2024-01-01_abc123.json',
        'snapshot_1_1_2024-01-02_def456.json',
        'snapshot_2_1_2024-01-01_ghi789.json', // Different liga
        'other-file.txt' // Non-snapshot file
      ];

      mockFs.readdir.mockResolvedValue(mockFiles);
      
      // Mock getSnapshot to return valid snapshots
      const mockSnapshot1 = {
        id: 'snapshot_1_1_2024-01-01_abc123',
        ligaId: 1,
        saisonId: 1,
        data: [],
        createdAt: new Date('2024-01-01'),
        description: 'Snapshot 1',
        filePath: '',
        checksum: '',
        size: 100
      };
      
      const mockSnapshot2 = {
        id: 'snapshot_1_1_2024-01-02_def456',
        ligaId: 1,
        saisonId: 1,
        data: [],
        createdAt: new Date('2024-01-02'),
        description: 'Snapshot 2',
        filePath: '',
        checksum: '',
        size: 100
      };

      jest.spyOn(snapshotService, 'getSnapshot')
        .mockResolvedValueOnce(mockSnapshot1)
        .mockResolvedValueOnce(mockSnapshot2);

      const result = await snapshotService.listSnapshots(1, 1);

      expect(result).toHaveLength(2);
      expect(result[0].createdAt.getTime()).toBeGreaterThan(result[1].createdAt.getTime()); // Sorted newest first
    });

    it('should return empty array when no snapshots exist', async () => {
      mockFs.readdir.mockResolvedValue([]);

      const result = await snapshotService.listSnapshots(1, 1);

      expect(result).toEqual([]);
    });

    it('should handle readdir errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      const result = await snapshotService.listSnapshots(1, 1);

      expect(result).toEqual([]);
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete an existing snapshot', async () => {
      await snapshotService.deleteSnapshot('test-snapshot-id');

      expect(mockFs.unlink).toHaveBeenCalledWith('./test-snapshots/test-snapshot-id.json');
      expect(mockStrapi.log.info).toHaveBeenCalledWith('Snapshot deleted: test-snapshot-id');
    });

    it('should handle non-existent file gracefully', async () => {
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';
      mockFs.unlink.mockRejectedValue(error);

      await expect(snapshotService.deleteSnapshot('non-existent-id')).resolves.not.toThrow();
    });

    it('should throw error for other file system errors', async () => {
      mockFs.unlink.mockRejectedValue(new Error('Permission denied'));

      await expect(snapshotService.deleteSnapshot('test-id')).rejects.toThrow('Failed to delete snapshot');
    });
  });

  describe('deleteOldSnapshots', () => {
    it('should delete snapshots older than maxAge', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40); // 40 days old

      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10); // 10 days old

      mockFs.readdir.mockResolvedValue([
        'snapshot_1_1_old.json',
        'snapshot_1_1_recent.json'
      ]);

      mockFs.stat
        .mockResolvedValueOnce({ mtime: oldDate })
        .mockResolvedValueOnce({ mtime: recentDate });

      await snapshotService.deleteOldSnapshots(30);

      expect(mockFs.unlink).toHaveBeenCalledTimes(1);
      expect(mockFs.unlink).toHaveBeenCalledWith('./test-snapshots/snapshot_1_1_old.json');
    });

    it('should handle stat errors gracefully', async () => {
      mockFs.readdir.mockResolvedValue(['snapshot_1_1_test.json']);
      mockFs.stat.mockRejectedValue(new Error('Stat error'));

      await expect(snapshotService.deleteOldSnapshots(30)).resolves.not.toThrow();
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should validate snapshot data structure', async () => {
      const invalidSnapshot = {
        id: 'test-id',
        ligaId: 1,
        saisonId: 1,
        data: 'invalid-data', // Should be array
        createdAt: new Date(),
        description: 'Test',
        filePath: 'test.json',
        checksum: '',
        size: 100
      };

      mockFs.readFile.mockResolvedValue(Buffer.from(JSON.stringify(invalidSnapshot)));

      await expect(snapshotService.getSnapshot('test-id')).rejects.toThrow('Invalid snapshot data structure');
    });

    it('should validate table entry fields', async () => {
      const invalidSnapshot = {
        id: 'test-id',
        ligaId: 1,
        saisonId: 1,
        data: [
          {
            // Missing required fields
            team_name: '',
            platz: 'invalid', // Should be number
            punkte: null
          }
        ],
        createdAt: new Date(),
        description: 'Test',
        filePath: 'test.json',
        checksum: '',
        size: 100
      };

      mockFs.readFile.mockResolvedValue(Buffer.from(JSON.stringify(invalidSnapshot)));

      await expect(snapshotService.getSnapshot('test-id')).rejects.toThrow('Invalid table entry in snapshot');
    });
  });

  describe('compression', () => {
    it('should handle compressed snapshots when compression is enabled', async () => {
      const compressedService = new SnapshotServiceImpl(mockStrapi, {
        ...mockConfig,
        compressionEnabled: true
      });

      // Mock zlib functions
      const mockGzip = jest.fn().mockResolvedValue(Buffer.from('compressed-data'));
      const mockGunzip = jest.fn().mockResolvedValue(Buffer.from('{"id":"test"}'));
      
      jest.doMock('zlib', () => ({
        gzip: mockGzip,
        gunzip: mockGunzip
      }));

      await compressedService.createSnapshot(1, 1);

      expect(mockFs.writeFile).toHaveBeenCalled();
    });
  });
});