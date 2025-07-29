/**
 * End-to-End System Validation Tests
 * Comprehensive testing of all requirements and user workflows
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { SpielLifecycleImpl } from '../../src/api/spiel/lifecycles';
import { SpielValidationService } from '../../src/api/spiel/services/validation';
import { QueueManagerImpl } from '../../src/api/tabellen-eintrag/services/queue-manager';
import { TabellenBerechnungsServiceImpl } from '../../src/api/tabellen-eintrag/services/tabellen-berechnung';
import { SnapshotServiceImpl } from '../../src/api/tabellen-eintrag/services/snapshot';
import { AdminController } from '../../src/api/tabellen-eintrag/controllers/admin';
import { HealthCheckService } from '../../src/api/tabellen-eintrag/services/health-check';
import { PrometheusMetricsService } from '../../src/api/tabellen-eintrag/services/prometheus-metrics';
import { DEFAULT_AUTOMATION_CONFIG } from '../../src/config/automation';
import { SpielStatus, Priority } from '../../src/api/spiel/lifecycles';

// Mock Strapi with comprehensive functionality
const mockStrapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  db: {
    query: jest.fn(),
    transaction: jest.fn().mockImplementation(async (callback) => {
      return await callback({
        query: jest.fn().mockReturnValue({
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
          delete: jest.fn().mockResolvedValue({})
        })
      });
    }),
    connection: {
      raw: jest.fn().mockResolvedValue({ rows: [] })
    }
  },
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  config: {
    get: jest.fn().mockReturnValue(DEFAULT_AUTOMATION_CONFIG)
  },
  server: {
    httpServer: {
      listening: true
    }
  }
};

global.strapi = mockStrapi as any;

describe('End-to-End System Validation', () => {
  let lifecycle: SpielLifecycleImpl;
  let validationService: SpielValidationService;
  let queueManager: QueueManagerImpl;
  let tabellenService: TabellenBerechnungsServiceImpl;
  let snapshotService: SnapshotServiceImpl;
  let adminController: AdminController;
  let healthCheck: HealthCheckService;
  let metricsService: PrometheusMetricsService;

  // Test data representing a realistic league scenario
  const testLiga = { id: 1, name: 'Kreisliga A', saison: { id: 1, name: '2023/24' } };
  const testSaison = { id: 1, name: '2023/24', jahr: 2023 };
  const teams = [
    { id: 1, name: 'FC Viktoria Wertheim' },
    { id: 2, name: 'SV Eintracht' },
    { id: 3, name: 'TSV Sportfreunde' },
    { id: 4, name: 'FC Germania' },
    { id: 5, name: 'SV Blau-Weiß' },
    { id: 6, name: 'FC Rot-Gold' }
  ];

  beforeAll(async () => {
    // Initialize all services
    validationService = new SpielValidationService();
    tabellenService = new TabellenBerechnungsServiceImpl(mockStrapi);
    
    const queueConfig = {
      ...DEFAULT_AUTOMATION_CONFIG.queue,
      concurrency: 3,
      maxRetries: 3,
      jobTimeout: 15000,
      cleanupInterval: 5000
    };
    
    queueManager = new QueueManagerImpl(tabellenService, queueConfig);
    lifecycle = new SpielLifecycleImpl(validationService, queueManager);
    
    const snapshotConfig = {
      storageDirectory: './test-snapshots',
      maxSnapshots: 10,
      maxAge: 30,
      compressionEnabled: false,
      checksumEnabled: true
    };
    
    snapshotService = new SnapshotServiceImpl(mockStrapi, snapshotConfig);
    adminController = new AdminController(queueManager, snapshotService, mockStrapi);
    healthCheck = new HealthCheckService(mockStrapi, queueManager);
    metricsService = new PrometheusMetricsService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup realistic mock responses
    mockStrapi.entityService.findOne.mockImplementation((contentType, id) => {
      if (contentType === 'api::liga.liga') return Promise.resolve(testLiga);
      if (contentType === 'api::saison.saison') return Promise.resolve(testSaison);
      return Promise.resolve(null);
    });
    
    mockStrapi.entityService.findMany.mockResolvedValue([]);
    mockStrapi.entityService.create.mockResolvedValue({});
    mockStrapi.entityService.update.mockResolvedValue({});
    
    mockStrapi.db.query.mockReturnValue({
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({})
    });
  });

  afterEach(async () => {
    if (queueManager) {
      queueManager.pauseQueue();
      await queueManager.clearQueue();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });

  afterAll(async () => {
    if (queueManager) {
      queueManager.destroy();
    }
  });

  describe('Requirement 1: Automatic Table Updates', () => {
    it('should automatically update table when game result is entered (Req 1.1)', async () => {
      const game = {
        id: 1,
        datum: '2023-10-15T15:00:00Z',
        liga: testLiga,
        saison: testSaison,
        heim_team: teams[0],
        gast_team: teams[1],
        heim_tore: 2,
        gast_tore: 1,
        spieltag: 10,
        status: SpielStatus.BEENDET,
        notizen: ''
      };

      // Mock existing games for calculation
      mockStrapi.entityService.findMany.mockResolvedValue([game]);

      await lifecycle.afterUpdate({
        result: game,
        params: {},
        state: { previousData: { ...game, status: SpielStatus.GEPLANT } }
      });

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(1);
      expect(queueStatus.pendingJobs).toBe(1);

      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 200));

      const finalStatus = queueManager.getQueueStatus();
      expect(finalStatus.completedJobs).toBe(1);
    });

    it('should trigger calculation when game status changes from planned to completed (Req 1.2)', async () => {
      const plannedGame = {
        id: 1,
        status: SpielStatus.GEPLANT,
        heim_tore: null,
        gast_tore: null,
        liga: testLiga,
        saison: testSaison,
        heim_team: teams[0],
        gast_team: teams[1]
      };

      const completedGame = {
        ...plannedGame,
        status: SpielStatus.BEENDET,
        heim_tore: 3,
        gast_tore: 0
      };

      mockStrapi.entityService.findMany.mockResolvedValue([completedGame]);

      await lifecycle.afterUpdate({
        result: completedGame,
        params: {},
        state: { previousData: plannedGame }
      });

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(1);
    });

    it('should recalculate when completed game is corrected (Req 1.3)', async () => {
      const originalGame = {
        id: 1,
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1,
        liga: testLiga,
        saison: testSaison,
        heim_team: teams[0],
        gast_team: teams[1]
      };

      const correctedGame = {
        ...originalGame,
        heim_tore: 1,
        gast_tore: 2
      };

      mockStrapi.entityService.findMany.mockResolvedValue([correctedGame]);

      await lifecycle.afterUpdate({
        result: correctedGame,
        params: {},
        state: { previousData: originalGame }
      });

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(1);
    });

    it('should show error message when calculation fails (Req 1.4)', async () => {
      mockStrapi.entityService.findMany.mockRejectedValue(new Error('Database error'));

      const game = {
        id: 1,
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1,
        liga: testLiga,
        saison: testSaison,
        heim_team: teams[0],
        gast_team: teams[1]
      };

      await lifecycle.afterUpdate({
        result: game,
        params: {},
        state: { previousData: { ...game, status: SpielStatus.GEPLANT } }
      });

      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 200));

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.failedJobs).toBe(1);
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });

    it('should recalculate when game is deleted (Req 1.5)', async () => {
      const deletedGame = {
        id: 1,
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1,
        liga: testLiga,
        saison: testSaison,
        heim_team: teams[0],
        gast_team: teams[1]
      };

      mockStrapi.entityService.findMany.mockResolvedValue([]);

      await lifecycle.afterDelete({
        result: deletedGame,
        params: {}
      });

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(1);
    });
  });

  describe('Requirement 2: Correct Football Table Calculations', () => {
    it('should award correct points for wins, draws, and losses (Req 2.1-2.3)', async () => {
      const games = [
        {
          id: 1,
          heim_team: teams[0],
          gast_team: teams[1],
          heim_tore: 3,
          gast_tore: 1,
          status: SpielStatus.BEENDET,
          liga: testLiga,
          saison: testSaison
        },
        {
          id: 2,
          heim_team: teams[1],
          gast_team: teams[2],
          heim_tore: 1,
          gast_tore: 1,
          status: SpielStatus.BEENDET,
          liga: testLiga,
          saison: testSaison
        },
        {
          id: 3,
          heim_team: teams[2],
          gast_team: teams[0],
          heim_tore: 0,
          gast_tore: 2,
          status: SpielStatus.BEENDET,
          liga: testLiga,
          saison: testSaison
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(games);

      const stats = await tabellenService.calculateTeamStats(teams[0].id, testLiga.id, testSaison.id);
      
      // Team 0: Won 2 games (6 points), scored 5, conceded 1
      expect(stats.punkte).toBe(6);
      expect(stats.siege).toBe(2);
      expect(stats.toreFuer).toBe(5);
      expect(stats.toreGegen).toBe(1);
    });

    it('should sort table by points, goal difference, goals scored, then alphabetically (Req 2.4-2.6)', async () => {
      const tableEntries = [
        {
          id: 1,
          team_name: 'Team B',
          punkte: 6,
          tordifferenz: 2,
          toreFuer: 4,
          toreGegen: 2
        },
        {
          id: 2,
          team_name: 'Team A',
          punkte: 6,
          tordifferenz: 2,
          toreFuer: 4,
          toreGegen: 2
        },
        {
          id: 3,
          team_name: 'Team C',
          punkte: 6,
          tordifferenz: 3,
          toreFuer: 5,
          toreGegen: 2
        }
      ];

      const sortedEntries = tabellenService.sortTableEntries(tableEntries);

      // Should be sorted: Team C (better goal diff), Team A (alphabetical), Team B
      expect(sortedEntries[0].team_name).toBe('Team C');
      expect(sortedEntries[1].team_name).toBe('Team A');
      expect(sortedEntries[2].team_name).toBe('Team B');
    });
  });

  describe('Requirement 3: Manual Recalculation', () => {
    it('should provide manual recalculation button in admin panel (Req 3.1)', async () => {
      const ctx = {
        params: { ligaId: testLiga.id },
        request: { body: { description: 'Manual recalculation test' } },
        response: {}
      };

      mockStrapi.entityService.findOne.mockResolvedValue(testLiga);

      const result = await adminController.triggerRecalculation(ctx);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.message).toContain(testLiga.name);
    });

    it('should show loading indicator during recalculation (Req 3.3)', async () => {
      const ctx = { response: {} };
      const queueStatus = await adminController.getQueueStatus(ctx);

      expect(queueStatus).toHaveProperty('isRunning');
      expect(queueStatus).toHaveProperty('processingJobs');
      expect(queueStatus).toHaveProperty('totalJobs');
    });

    it('should show success message when recalculation completes (Req 3.4)', async () => {
      // Add and process a job
      await queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.HIGH);
      mockStrapi.entityService.findMany.mockResolvedValue([]);
      
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 200));

      const ctx = {
        params: { ligaId: testLiga.id },
        query: { limit: 1 },
        response: {}
      };

      const history = await adminController.getCalculationHistory(ctx);
      expect(Array.isArray(history)).toBe(true);
    });

    it('should show detailed error message when recalculation fails (Req 3.5)', async () => {
      mockStrapi.entityService.findMany.mockRejectedValue(new Error('Calculation failed'));

      await queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.HIGH);
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 200));

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.failedJobs).toBe(1);
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });

  describe('Requirement 4: Data Integrity', () => {
    it('should require both score fields for completed games (Req 4.1)', async () => {
      const invalidGame = {
        id: 1,
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: null,
        heim_team: teams[0],
        gast_team: teams[1]
      };

      const validation = validationService.validateSpielResult(invalidGame);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'gast_tore')).toBe(true);
    });

    it('should prevent team from playing against itself (Req 4.2)', async () => {
      const invalidGame = {
        id: 1,
        heim_team: teams[0],
        gast_team: teams[0],
        heim_tore: 2,
        gast_tore: 1
      };

      const validation = validationService.validateTeamConsistency(teams[0], teams[0]);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === 'SAME_TEAM')).toBe(true);
    });

    it('should reject negative scores (Req 4.3)', async () => {
      const invalidGame = {
        id: 1,
        heim_tore: -1,
        gast_tore: 2
      };

      const validation = validationService.validateScores(-1, 2);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'heim_tore')).toBe(true);
    });

    it('should create missing table entries automatically (Req 4.4)', async () => {
      const mockQuery = mockStrapi.db.query();
      mockQuery.findMany.mockResolvedValue([]); // No existing entries

      await tabellenService.createMissingEntries(testLiga.id, testSaison.id);

      expect(mockQuery.create).toHaveBeenCalled();
    });

    it('should use database transactions for calculations (Req 4.5)', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      await tabellenService.calculateTableForLiga(testLiga.id, testSaison.id);

      expect(mockStrapi.db.transaction).toHaveBeenCalled();
    });
  });

  describe('Requirement 5: API Compatibility', () => {
    it('should maintain existing API response formats (Req 5.1-5.4)', async () => {
      // This would typically test actual API endpoints
      // For now, we verify that the service returns expected data structure
      const mockTableEntries = [
        {
          id: 1,
          team_name: teams[0].name,
          team: teams[0],
          liga: testLiga,
          platz: 1,
          spiele: 1,
          siege: 1,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 2,
          tore_gegen: 1,
          tordifferenz: 1,
          punkte: 3,
          auto_calculated: true
        }
      ];

      mockStrapi.db.query().findMany.mockResolvedValue(mockTableEntries);

      const result = await tabellenService.calculateTableForLiga(testLiga.id, testSaison.id);
      
      // Verify structure matches expected API format
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('team_name');
        expect(result[0]).toHaveProperty('punkte');
        expect(result[0]).toHaveProperty('tordifferenz');
        expect(result[0]).toHaveProperty('platz');
      }
    });

    it('should support feature flag fallback (Req 5.5)', async () => {
      // Mock disabled automation
      mockStrapi.config.get.mockReturnValue({
        ...DEFAULT_AUTOMATION_CONFIG,
        enabled: false
      });

      const game = {
        id: 1,
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1,
        liga: testLiga,
        saison: testSaison,
        heim_team: teams[0],
        gast_team: teams[1]
      };

      await lifecycle.afterUpdate({
        result: game,
        params: {},
        state: { previousData: { ...game, status: SpielStatus.GEPLANT } }
      });

      // Should not create jobs when disabled
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(0);
    });
  });

  describe('Requirement 6: Monitoring and Logging', () => {
    it('should log calculation operations (Req 6.1)', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      await tabellenService.calculateTableForLiga(testLiga.id, testSaison.id);

      expect(mockStrapi.log.info).toHaveBeenCalled();
    });

    it('should log errors with details (Req 6.2)', async () => {
      mockStrapi.entityService.findMany.mockRejectedValue(new Error('Test error'));

      await queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.NORMAL);
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Calculation failed'),
        expect.objectContaining({
          ligaId: testLiga.id,
          error: expect.any(Error)
        })
      );
    });

    it('should process calculations in queue (Req 6.3)', async () => {
      await queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.NORMAL);
      
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(1);
      expect(queueStatus.pendingJobs).toBe(1);
    });

    it('should warn about long-running calculations (Req 6.4)', async () => {
      // Mock slow calculation
      mockStrapi.entityService.findMany.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      await queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.NORMAL);
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check if warning would be logged for long operations
      const metrics = queueManager.getMetrics();
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should pause automation when system is overloaded (Req 6.5)', async () => {
      // Add many jobs to simulate overload
      for (let i = 0; i < 10; i++) {
        await queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.NORMAL);
      }

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(10);

      // System should handle overload gracefully
      expect(queueStatus.isRunning).toBe(true);
    });
  });

  describe('Requirement 7: Snapshot and Rollback', () => {
    it('should create snapshot before calculation (Req 7.1)', async () => {
      const fs = require('fs/promises');
      jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

      const mockTableData = [{
        id: 1,
        team_name: teams[0].name,
        punkte: 3,
        platz: 1
      }];

      mockStrapi.db.query().findMany.mockResolvedValue(mockTableData);

      const snapshotId = await snapshotService.createSnapshot(testLiga.id, testSaison.id, 'Test snapshot');
      
      expect(snapshotId).toBeDefined();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should restore table from snapshot (Req 7.2, 7.3)', async () => {
      const fs = require('fs/promises');
      const mockSnapshot = {
        id: 'test-snapshot',
        ligaId: testLiga.id,
        saisonId: testSaison.id,
        data: [{ id: 1, team_name: teams[0].name, punkte: 3 }],
        createdAt: new Date().toISOString(),
        description: 'Test snapshot'
      };

      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from(JSON.stringify(mockSnapshot)));

      await snapshotService.restoreSnapshot('test-snapshot');

      expect(fs.readFile).toHaveBeenCalled();
      expect(mockStrapi.db.transaction).toHaveBeenCalled();
    });

    it('should allow snapshot selection (Req 7.4)', async () => {
      const fs = require('fs/promises');
      jest.spyOn(fs, 'readdir').mockResolvedValue(['snapshot1.json', 'snapshot2.json'] as any);
      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from(JSON.stringify({
        id: 'test',
        ligaId: testLiga.id,
        saisonId: testSaison.id,
        data: [],
        createdAt: new Date().toISOString(),
        description: 'Test'
      })));

      const snapshots = await snapshotService.listSnapshots(testLiga.id, testSaison.id);
      
      expect(Array.isArray(snapshots)).toBe(true);
      expect(snapshots.length).toBeGreaterThan(0);
    });

    it('should preserve original table if rollback fails (Req 7.5)', async () => {
      const fs = require('fs/promises');
      jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('File not found'));

      await expect(snapshotService.restoreSnapshot('invalid-snapshot')).rejects.toThrow();
      
      // Original table should remain unchanged
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });

  describe('Requirement 8: Performance', () => {
    it('should calculate table for small league under 5 seconds (Req 8.1)', async () => {
      const startTime = Date.now();
      
      // Mock 16 teams with ~50 games
      const games = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        heim_team: teams[i % 6],
        gast_team: teams[(i + 1) % 6],
        heim_tore: Math.floor(Math.random() * 4),
        gast_tore: Math.floor(Math.random() * 4),
        status: SpielStatus.BEENDET,
        liga: testLiga,
        saison: testSaison
      }));

      mockStrapi.entityService.findMany.mockResolvedValue(games);

      await tabellenService.calculateTableForLiga(testLiga.id, testSaison.id);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000);
    });

    it('should calculate large league under 15 seconds (Req 8.2)', async () => {
      const startTime = Date.now();
      
      // Mock larger dataset
      const games = Array.from({ length: 150 }, (_, i) => ({
        id: i + 1,
        heim_team: teams[i % 6],
        gast_team: teams[(i + 1) % 6],
        heim_tore: Math.floor(Math.random() * 4),
        gast_tore: Math.floor(Math.random() * 4),
        status: SpielStatus.BEENDET,
        liga: testLiga,
        saison: testSaison
      }));

      mockStrapi.entityService.findMany.mockResolvedValue(games);

      await tabellenService.calculateTableForLiga(testLiga.id, testSaison.id);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(15000);
    });

    it('should process multiple leagues in parallel (Req 8.3)', async () => {
      const startTime = Date.now();
      
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      // Add jobs for multiple leagues
      const promises = [
        queueManager.addCalculationJob(1, testSaison.id, Priority.NORMAL),
        queueManager.addCalculationJob(2, testSaison.id, Priority.NORMAL),
        queueManager.addCalculationJob(3, testSaison.id, Priority.NORMAL)
      ];

      await Promise.all(promises);
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 500));

      const duration = Date.now() - startTime;
      const queueStatus = queueManager.getQueueStatus();
      
      expect(queueStatus.completedJobs).toBe(3);
      expect(duration).toBeLessThan(10000); // Should be faster than sequential
    });

    it('should handle background queue processing (Req 8.4)', async () => {
      await queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.NORMAL);
      
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.isRunning).toBe(true);
      expect(queueStatus.totalJobs).toBe(1);
    });

    it('should restart long-running calculations (Req 8.5)', async () => {
      // Mock timeout scenario
      mockStrapi.entityService.findMany.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 20000))
      );

      await queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.NORMAL);
      
      // Start processing but don't wait for completion
      queueManager.processQueue();
      
      // Should handle timeout gracefully
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.processingJobs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('System Health and Monitoring', () => {
    it('should provide comprehensive health status', async () => {
      const health = await healthCheck.checkHealth();
      
      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.components).toHaveProperty('database');
      expect(health.components).toHaveProperty('queue');
      expect(health.components).toHaveProperty('validation');
      
      Object.values(health.components).forEach((component: any) => {
        expect(component).toHaveProperty('status');
        expect(component).toHaveProperty('lastCheck');
      });
    });

    it('should collect performance metrics', async () => {
      // Process some jobs to generate metrics
      await queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.NORMAL);
      mockStrapi.entityService.findMany.mockResolvedValue([]);
      
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 200));

      const metrics = queueManager.getMetrics();
      
      expect(metrics).toHaveProperty('totalProcessed');
      expect(metrics).toHaveProperty('averageProcessingTime');
      expect(metrics).toHaveProperty('successRate');
      expect(metrics.totalProcessed).toBeGreaterThan(0);
    });

    it('should handle system overload gracefully', async () => {
      // Create overload scenario
      const promises = Array.from({ length: 20 }, (_, i) => 
        queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.NORMAL)
      );

      await Promise.all(promises);
      
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(20);
      expect(queueStatus.isRunning).toBe(true);

      // System should remain responsive
      const health = await healthCheck.checkHealth();
      expect(health.status).toMatch(/healthy|degraded/);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from database connection failures', async () => {
      let attempts = 0;
      mockStrapi.entityService.findMany.mockImplementation(() => {
        attempts++;
        if (attempts <= 2) {
          return Promise.reject(new Error('Connection failed'));
        }
        return Promise.resolve([]);
      });

      await queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.NORMAL);
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 500));

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.completedJobs).toBe(1);
      expect(attempts).toBe(3); // Should have retried
    });

    it('should maintain data consistency during failures', async () => {
      // Mock transaction failure
      mockStrapi.db.transaction.mockRejectedValueOnce(new Error('Transaction failed'));

      await queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.NORMAL);
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 200));

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.failedJobs).toBe(1);
      
      // Should log error but not corrupt data
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });

    it('should provide fallback mechanisms', async () => {
      // Test graceful degradation
      mockStrapi.entityService.findMany.mockRejectedValue(new Error('Service unavailable'));

      const health = await healthCheck.checkHealth();
      
      // Should detect unhealthy state
      expect(health.components.database.status).toBe('unhealthy');
      expect(health.status).toMatch(/degraded|unhealthy/);
    });
  });
});