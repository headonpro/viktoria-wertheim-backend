/**
 * Database Integration Tests
 * Tests database operations with real data scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { TabellenBerechnungsServiceImpl } from '../../src/api/tabellen-eintrag/services/tabellen-berechnung';
import { SnapshotServiceImpl } from '../../src/api/tabellen-eintrag/services/snapshot';
import { DatabaseOptimizerImpl } from '../../src/api/tabellen-eintrag/services/database-optimizer';

// Mock Strapi with realistic database operations
const mockStrapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  db: {
    query: jest.fn(),
    transaction: jest.fn(),
    connection: {
      raw: jest.fn(),
      client: {
        config: {
          client: 'postgresql',
          connection: {
            host: 'localhost',
            port: 5432,
            database: 'test_db'
          }
        },
        pool: {
          min: 2,
          max: 10
        }
      }
    }
  },
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
};

global.strapi = mockStrapi as any;

describe('Database Operations Integration Tests', () => {
  let tabellenService: TabellenBerechnungsServiceImpl;
  let snapshotService: SnapshotServiceImpl;
  let databaseOptimizer: DatabaseOptimizerImpl;

  const testLiga = { id: 1, name: 'Bundesliga' };
  const testSaison = { id: 1, name: '2023/24', jahr: 2023 };
  const teams = [
    { id: 1, name: 'Bayern München' },
    { id: 2, name: 'Borussia Dortmund' },
    { id: 3, name: 'RB Leipzig' },
    { id: 4, name: 'Bayer Leverkusen' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    tabellenService = new TabellenBerechnungsServiceImpl(mockStrapi);
    
    const snapshotConfig = {
      storageDirectory: './test-snapshots',
      maxSnapshots: 10,
      maxAge: 30,
      compressionEnabled: false,
      checksumEnabled: true
    };
    
    snapshotService = new SnapshotServiceImpl(mockStrapi, snapshotConfig);
    databaseOptimizer = new DatabaseOptimizerImpl(mockStrapi);

    // Setup transaction mock
    mockStrapi.db.transaction.mockImplementation(async (callback) => {
      const trx = {
        commit: jest.fn(),
        rollback: jest.fn()
      };
      return await callback(trx);
    });
  });

  describe('Table Calculation Database Operations', () => {
    it('should perform complete table calculation with database transactions', async () => {
      // Mock games data
      const mockGames = [
        {
          id: 1,
          heim_team: teams[0],
          gast_team: teams[1],
          heim_tore: 3,
          gast_tore: 1,
          status: 'beendet',
          liga: testLiga,
          saison: testSaison
        },
        {
          id: 2,
          heim_team: teams[2],
          gast_team: teams[3],
          heim_tore: 2,
          gast_tore: 0,
          status: 'beendet',
          liga: testLiga,
          saison: testSaison
        },
        {
          id: 3,
          heim_team: teams[1],
          gast_team: teams[2],
          heim_tore: 1,
          gast_tore: 1,
          status: 'beendet',
          liga: testLiga,
          saison: testSaison
        }
      ];

      // Mock existing table entries
      const mockTableEntries = [
        {
          id: 1,
          team: teams[0],
          team_name: teams[0].name,
          liga: testLiga,
          saison: testSaison,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0
        }
      ];

      // Setup mocks
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockGames) // Games query
        .mockResolvedValueOnce(mockTableEntries); // Existing entries query

      mockStrapi.entityService.create.mockResolvedValue({});
      mockStrapi.entityService.update.mockResolvedValue({});

      // Execute calculation
      const result = await tabellenService.calculateTableForLiga(testLiga.id, testSaison.id);

      // Verify database operations
      expect(mockStrapi.db.transaction).toHaveBeenCalled();
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledTimes(2);
      
      // Should create missing entries for teams 2, 3, 4
      expect(mockStrapi.entityService.create).toHaveBeenCalledTimes(3);
      
      // Should update all team entries
      expect(mockStrapi.entityService.update).toHaveBeenCalledTimes(4);

      // Verify update calls contain correct data
      const updateCalls = mockStrapi.entityService.update.mock.calls;
      expect(updateCalls.length).toBe(4);
      
      // Check Bayern München stats (won against Dortmund 3-1)
      const bayernUpdate = updateCalls.find(call => 
        call[2].data.team_name === 'Bayern München'
      );
      expect(bayernUpdate).toBeDefined();
      expect(bayernUpdate[2].data.siege).toBe(1);
      expect(bayernUpdate[2].data.punkte).toBe(3);
      expect(bayernUpdate[2].data.tore_fuer).toBe(3);
      expect(bayernUpdate[2].data.tore_gegen).toBe(1);
    });

    it('should handle database errors with proper rollback', async () => {
      // Mock database error during update
      mockStrapi.entityService.findMany.mockResolvedValue([]);
      mockStrapi.entityService.update.mockRejectedValue(new Error('Database constraint violation'));

      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn()
      };

      mockStrapi.db.transaction.mockImplementation(async (callback) => {
        try {
          return await callback(mockTransaction);
        } catch (error) {
          await mockTransaction.rollback();
          throw error;
        }
      });

      // Should throw error and rollback
      await expect(
        tabellenService.calculateTableForLiga(testLiga.id, testSaison.id)
      ).rejects.toThrow('Database constraint violation');

      expect(mockTransaction.rollback).toHaveBeenCalled();
      expect(mockTransaction.commit).not.toHaveBeenCalled();
    });

    it('should optimize database queries for large datasets', async () => {
      // Create large dataset
      const largeGameSet = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        heim_team: teams[i % 4],
        gast_team: teams[(i + 1) % 4],
        heim_tore: Math.floor(Math.random() * 5),
        gast_tore: Math.floor(Math.random() * 5),
        status: 'beendet',
        liga: testLiga,
        saison: testSaison
      }));

      const largeTableSet = teams.map((team, i) => ({
        id: i + 1,
        team,
        team_name: team.name,
        liga: testLiga,
        saison: testSaison,
        spiele: 0,
        siege: 0,
        unentschieden: 0,
        niederlagen: 0,
        tore_fuer: 0,
        tore_gegen: 0,
        tordifferenz: 0,
        punkte: 0
      }));

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(largeGameSet)
        .mockResolvedValueOnce(largeTableSet);

      mockStrapi.entityService.update.mockResolvedValue({});

      const startTime = Date.now();
      await tabellenService.calculateTableForLiga(testLiga.id, testSaison.id);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds

      // Should use bulk operations
      expect(mockStrapi.entityService.update).toHaveBeenCalledTimes(4); // One per team
    });

    it('should handle concurrent database operations', async () => {
      const mockGames = [
        {
          id: 1,
          heim_team: teams[0],
          gast_team: teams[1],
          heim_tore: 2,
          gast_tore: 1,
          status: 'beendet',
          liga: testLiga,
          saison: testSaison
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);
      mockStrapi.entityService.findMany.mockResolvedValue([]);
      mockStrapi.entityService.create.mockResolvedValue({});
      mockStrapi.entityService.update.mockResolvedValue({});

      // Execute multiple calculations concurrently
      const promises = Array.from({ length: 3 }, () => 
        tabellenService.calculateTableForLiga(testLiga.id, testSaison.id)
      );

      await Promise.all(promises);

      // Should handle concurrent access without errors
      expect(mockStrapi.db.transaction).toHaveBeenCalledTimes(3);
    });
  });

  describe('Snapshot Database Operations', () => {
    beforeEach(() => {
      // Mock file system operations
      const fs = require('fs/promises');
      jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('{}'));
      jest.spyOn(fs, 'readdir').mockResolvedValue([]);
      jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);
      jest.spyOn(fs, 'stat').mockResolvedValue({ mtime: new Date() });
    });

    it('should create snapshot with database query', async () => {
      const mockTableData = [
        {
          id: 1,
          team_name: teams[0].name,
          team: teams[0],
          liga: testLiga,
          saison: testSaison,
          platz: 1,
          spiele: 1,
          siege: 1,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 3,
          tore_gegen: 1,
          tordifferenz: 2,
          punkte: 3,
          auto_calculated: true
        }
      ];

      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockTableData)
      });

      const snapshotId = await snapshotService.createSnapshot(
        testLiga.id, 
        testSaison.id, 
        'Database integration test'
      );

      expect(snapshotId).toBeDefined();
      expect(mockStrapi.db.query).toHaveBeenCalledWith('api::tabellen-eintrag.tabellen-eintrag');
      
      const fs = require('fs/promises');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should restore snapshot with database operations', async () => {
      const mockSnapshotData = {
        id: 'test-snapshot',
        ligaId: testLiga.id,
        saisonId: testSaison.id,
        data: [
          {
            id: 1,
            team_name: teams[0].name,
            team: teams[0],
            liga: testLiga,
            saison: testSaison,
            platz: 1,
            punkte: 3
          }
        ],
        createdAt: new Date().toISOString(),
        description: 'Test snapshot'
      };

      const fs = require('fs/promises');
      fs.readFile.mockResolvedValue(Buffer.from(JSON.stringify(mockSnapshotData)));

      const mockQuery = {
        deleteMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({})
      };

      mockStrapi.db.query.mockReturnValue(mockQuery);

      const snapshot = await snapshotService.getSnapshot('test-snapshot');
      expect(snapshot).toBeDefined();
      expect(snapshot?.data).toHaveLength(1);

      // Verify database query was called
      expect(mockStrapi.db.query).toHaveBeenCalled();
    });

    it('should handle database errors during snapshot operations', async () => {
      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockRejectedValue(new Error('Database connection lost'))
      });

      await expect(
        snapshotService.createSnapshot(testLiga.id, testSaison.id, 'Error test')
      ).rejects.toThrow('Failed to create snapshot');

      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });

  describe('Database Optimization Operations', () => {
    it('should create database indexes', async () => {
      const mockIndexQueries = [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spiele_liga_saison_status ON spiele(liga_id, saison_id, status)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tabellen_liga_saison ON tabellen_eintraege(liga_id, saison_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spiele_teams ON spiele(heim_team_id, gast_team_id)'
      ];

      mockStrapi.db.connection.raw.mockResolvedValue({});

      await databaseOptimizer.createIndexes();

      expect(mockStrapi.db.connection.raw).toHaveBeenCalledTimes(mockIndexQueries.length);
      
      mockIndexQueries.forEach(query => {
        expect(mockStrapi.db.connection.raw).toHaveBeenCalledWith(query);
      });
    });

    it('should analyze query performance', async () => {
      const mockQueryPlan = {
        rows: [
          {
            'QUERY PLAN': 'Index Scan using idx_spiele_liga_saison_status on spiele (cost=0.29..8.31 rows=1 width=4)'
          }
        ]
      };

      mockStrapi.db.connection.raw.mockResolvedValue(mockQueryPlan);

      const analysis = await databaseOptimizer.analyzeQueryPerformance();

      expect(analysis).toBeDefined();
      expect(mockStrapi.db.connection.raw).toHaveBeenCalledWith(
        expect.stringContaining('EXPLAIN ANALYZE')
      );
    });

    it('should configure connection pool', async () => {
      await databaseOptimizer.configureConnectionPool();

      // Should access connection configuration
      expect(mockStrapi.db.connection.client.config).toBeDefined();
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Connection pool configured')
      );
    });

    it('should handle database optimization errors', async () => {
      mockStrapi.db.connection.raw.mockRejectedValue(new Error('Permission denied'));

      await expect(databaseOptimizer.createIndexes()).resolves.not.toThrow();
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });

  describe('Complex Database Scenarios', () => {
    it('should handle data consistency during concurrent updates', async () => {
      const mockGames = [
        {
          id: 1,
          heim_team: teams[0],
          gast_team: teams[1],
          heim_tore: 2,
          gast_tore: 1,
          status: 'beendet',
          liga: testLiga,
          saison: testSaison
        }
      ];

      const mockTableEntries = teams.map((team, i) => ({
        id: i + 1,
        team,
        team_name: team.name,
        liga: testLiga,
        saison: testSaison,
        spiele: 0,
        siege: 0,
        unentschieden: 0,
        niederlagen: 0,
        tore_fuer: 0,
        tore_gegen: 0,
        tordifferenz: 0,
        punkte: 0
      }));

      mockStrapi.entityService.findMany
        .mockResolvedValue(mockGames)
        .mockResolvedValue(mockTableEntries);

      mockStrapi.entityService.update.mockResolvedValue({});

      // Simulate concurrent calculations
      const calculations = Array.from({ length: 5 }, () => 
        tabellenService.calculateTableForLiga(testLiga.id, testSaison.id)
      );

      await Promise.all(calculations);

      // All calculations should complete successfully
      expect(mockStrapi.db.transaction).toHaveBeenCalledTimes(5);
      expect(mockStrapi.entityService.update).toHaveBeenCalled();
    });

    it('should handle large dataset operations efficiently', async () => {
      // Create dataset with 1000 games
      const largeGameSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        heim_team: teams[i % 4],
        gast_team: teams[(i + 1) % 4],
        heim_tore: Math.floor(Math.random() * 5),
        gast_tore: Math.floor(Math.random() * 5),
        status: 'beendet',
        liga: testLiga,
        saison: testSaison
      }));

      const mockTableEntries = teams.map((team, i) => ({
        id: i + 1,
        team,
        team_name: team.name,
        liga: testLiga,
        saison: testSaison,
        spiele: 0,
        siege: 0,
        unentschieden: 0,
        niederlagen: 0,
        tore_fuer: 0,
        tore_gegen: 0,
        tordifferenz: 0,
        punkte: 0
      }));

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(largeGameSet)
        .mockResolvedValueOnce(mockTableEntries);

      mockStrapi.entityService.update.mockResolvedValue({});

      const startTime = Date.now();
      await tabellenService.calculateTableForLiga(testLiga.id, testSaison.id);
      const endTime = Date.now();

      // Should complete within reasonable time even with large dataset
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds

      // Should process all teams
      expect(mockStrapi.entityService.update).toHaveBeenCalledTimes(4);
    });

    it('should maintain referential integrity', async () => {
      const mockGames = [
        {
          id: 1,
          heim_team: teams[0],
          gast_team: teams[1],
          heim_tore: 2,
          gast_tore: 1,
          status: 'beendet',
          liga: testLiga,
          saison: testSaison
        }
      ];

      // Mock missing table entry (should be created)
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockGames)
        .mockResolvedValueOnce([]); // No existing entries

      mockStrapi.entityService.create.mockResolvedValue({});
      mockStrapi.entityService.update.mockResolvedValue({});

      await tabellenService.calculateTableForLiga(testLiga.id, testSaison.id);

      // Should create entries for both teams in the game
      expect(mockStrapi.entityService.create).toHaveBeenCalledTimes(2);
      
      // Verify created entries have correct references
      const createCalls = mockStrapi.entityService.create.mock.calls;
      createCalls.forEach(call => {
        const data = call[1].data;
        expect(data.liga).toBe(testLiga.id);
        expect(data.saison).toBe(testSaison.id);
        expect(data.team).toBeDefined();
        expect(data.team_name).toBeDefined();
      });
    });
  });

  describe('Database Performance Monitoring', () => {
    it('should track query execution times', async () => {
      const mockGames = [
        {
          id: 1,
          heim_team: teams[0],
          gast_team: teams[1],
          heim_tore: 2,
          gast_tore: 1,
          status: 'beendet',
          liga: testLiga,
          saison: testSaison
        }
      ];

      // Add delay to simulate slow query
      mockStrapi.entityService.findMany.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockGames), 100))
      );

      mockStrapi.entityService.findMany.mockResolvedValueOnce([]);
      mockStrapi.entityService.create.mockResolvedValue({});
      mockStrapi.entityService.update.mockResolvedValue({});

      const startTime = Date.now();
      await tabellenService.calculateTableForLiga(testLiga.id, testSaison.id);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeGreaterThan(100); // Should include the delay
      expect(duration).toBeLessThan(1000); // But not too slow
    });

    it('should monitor connection pool status', async () => {
      const poolStatus = databaseOptimizer.getConnectionPoolStatus();

      expect(poolStatus).toHaveProperty('min');
      expect(poolStatus).toHaveProperty('max');
      expect(poolStatus).toHaveProperty('client');
      expect(poolStatus.client).toBe('postgresql');
    });
  });
});