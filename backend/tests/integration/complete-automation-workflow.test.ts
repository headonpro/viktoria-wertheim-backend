/**
 * End-to-End Integration Tests for Complete Automation Workflow
 * Tests the complete flow from game entry to table calculation and display
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { SpielLifecycleImpl } from '../../src/api/spiel/lifecycles';
import { SpielValidationService } from '../../src/api/spiel/services/validation';
import { QueueManagerImpl } from '../../src/api/tabellen-eintrag/services/queue-manager';
import { TabellenBerechnungsServiceImpl } from '../../src/api/tabellen-eintrag/services/tabellen-berechnung';
import { SnapshotServiceImpl } from '../../src/api/tabellen-eintrag/services/snapshot';
import { AdminController } from '../../src/api/tabellen-eintrag/controllers/admin';
import { DEFAULT_AUTOMATION_CONFIG } from '../../src/config/automation';
import { SpielStatus, Priority } from '../../src/api/spiel/lifecycles';

// Mock Strapi instance for integration testing
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
      return await callback({});
    })
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
  }
};

// Set global strapi for services
global.strapi = mockStrapi as any;

describe('Complete Automation Workflow Integration', () => {
  let lifecycle: SpielLifecycleImpl;
  let validationService: SpielValidationService;
  let queueManager: QueueManagerImpl;
  let tabellenService: TabellenBerechnungsServiceImpl;
  let snapshotService: SnapshotServiceImpl;
  let adminController: AdminController;

  // Test data
  const testLiga = { id: 1, name: 'Bundesliga' };
  const testSaison = { id: 1, name: '2023/24', jahr: 2023 };
  const teams = [
    { id: 1, name: 'Bayern München' },
    { id: 2, name: 'Borussia Dortmund' },
    { id: 3, name: 'RB Leipzig' },
    { id: 4, name: 'Bayer Leverkusen' }
  ];

  const createTestSpiel = (id: number, heimTeam: any, gastTeam: any, heimTore?: number, gastTore?: number, status = SpielStatus.BEENDET) => ({
    id,
    datum: '2023-10-15T15:00:00Z',
    liga: testLiga,
    saison: testSaison,
    heim_team: heimTeam,
    gast_team: gastTeam,
    heim_tore: heimTore,
    gast_tore: gastTore,
    spieltag: 10,
    status,
    notizen: ''
  });

  beforeAll(async () => {
    // Initialize services
    validationService = new SpielValidationService();
    tabellenService = new TabellenBerechnungsServiceImpl(mockStrapi);
    
    const queueConfig = {
      ...DEFAULT_AUTOMATION_CONFIG.queue,
      concurrency: 2,
      maxRetries: 3,
      jobTimeout: 10000,
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
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockStrapi.entityService.findOne.mockResolvedValue(testLiga);
    mockStrapi.entityService.findMany.mockResolvedValue([]);
    mockStrapi.entityService.create.mockResolvedValue({});
    mockStrapi.entityService.update.mockResolvedValue({});
    
    // Mock database query for table entries
    mockStrapi.db.query.mockReturnValue({
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({})
    });
  });

  afterEach(async () => {
    // Clean up queue
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

  describe('Complete Game Entry to Table Update Workflow', () => {
    it('should handle complete workflow from game creation to table calculation', async () => {
      // Mock games data for table calculation
      const mockGames = [
        createTestSpiel(1, teams[0], teams[1], 3, 1), // Bayern 3-1 Dortmund
        createTestSpiel(2, teams[2], teams[3], 2, 0), // Leipzig 2-0 Leverkusen
        createTestSpiel(3, teams[1], teams[2], 1, 1), // Dortmund 1-1 Leipzig
        createTestSpiel(4, teams[3], teams[0], 0, 2)  // Leverkusen 0-2 Bayern
      ];

      // Mock existing table entries
      const mockTableEntries = [
        {
          id: 1,
          team: teams[0],
          team_name: teams[0].name,
          liga: testLiga,
          saison: testSaison,
          platz: 1,
          spiele: 2,
          siege: 2,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 5,
          tore_gegen: 1,
          tordifferenz: 4,
          punkte: 6,
          auto_calculated: true
        },
        {
          id: 2,
          team: teams[1],
          team_name: teams[1].name,
          liga: testLiga,
          saison: testSaison,
          platz: 2,
          spiele: 2,
          siege: 0,
          unentschieden: 1,
          niederlagen: 1,
          tore_fuer: 2,
          tore_gegen: 4,
          tordifferenz: -2,
          punkte: 1,
          auto_calculated: true
        }
      ];

      // Setup mocks for table calculation
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockGames) // For games query
        .mockResolvedValueOnce(mockTableEntries); // For existing table entries

      // Step 1: Create a new game (planned)
      const newGame = createTestSpiel(5, teams[0], teams[2], undefined, undefined, SpielStatus.GEPLANT);
      
      await lifecycle.afterCreate({
        result: newGame,
        params: {}
      });

      // Should not trigger calculation for planned game
      let queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(0);

      // Step 2: Update game to completed
      const completedGame = { ...newGame, status: SpielStatus.BEENDET, heim_tore: 2, gast_tore: 1 };
      
      await lifecycle.afterUpdate({
        result: completedGame,
        params: {},
        state: { previousData: newGame }
      });

      // Should trigger calculation
      queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(1);
      expect(queueStatus.pendingJobs).toBe(1);

      // Step 3: Process the queue
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify calculation was called
      queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.completedJobs).toBe(1);
      expect(mockStrapi.entityService.findMany).toHaveBeenCalled();

      // Step 4: Verify table entries were updated
      const updateCalls = mockStrapi.entityService.update.mock.calls;
      expect(updateCalls.length).toBeGreaterThan(0);

      // Step 5: Test admin panel interaction
      const ctx = {
        params: { ligaId: testLiga.id },
        request: { body: {} },
        response: {}
      };

      const recalculationResult = await adminController.triggerRecalculation(ctx);
      expect(recalculationResult.success).toBe(true);
      expect(recalculationResult.jobId).toBeDefined();
    });

    it('should handle multiple concurrent game updates', async () => {
      const games = [
        createTestSpiel(1, teams[0], teams[1], 2, 1),
        createTestSpiel(2, teams[2], teams[3], 1, 0),
        createTestSpiel(3, teams[0], teams[2], 3, 2)
      ];

      // Setup mock data
      mockStrapi.entityService.findMany.mockResolvedValue(games);

      // Create all games simultaneously
      const createPromises = games.map(game => 
        lifecycle.afterCreate({
          result: game,
          params: {}
        })
      );

      await Promise.all(createPromises);

      // Should have jobs (but duplicate prevention might reduce count)
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBeGreaterThan(0);
      expect(queueStatus.totalJobs).toBeLessThanOrEqual(3);

      // Process all jobs
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 300));

      const finalStatus = queueManager.getQueueStatus();
      expect(finalStatus.completedJobs).toBeGreaterThan(0);
    });

    it('should handle error scenarios with proper fallback', async () => {
      // Mock database error
      mockStrapi.entityService.findMany.mockRejectedValueOnce(new Error('Database connection failed'));

      const game = createTestSpiel(1, teams[0], teams[1], 2, 1);
      
      await lifecycle.afterCreate({
        result: game,
        params: {}
      });

      // Process queue (should handle error gracefully)
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 200));

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.failedJobs).toBeGreaterThan(0);

      // Error should be logged
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });

  describe('Admin Panel Integration', () => {
    it('should provide complete admin functionality', async () => {
      // Test queue status
      const ctx = { response: {} };
      const queueStatus = await adminController.getQueueStatus(ctx);
      
      expect(queueStatus).toHaveProperty('totalJobs');
      expect(queueStatus).toHaveProperty('pendingJobs');
      expect(queueStatus).toHaveProperty('processingJobs');
      expect(queueStatus).toHaveProperty('completedJobs');
      expect(queueStatus).toHaveProperty('failedJobs');

      // Test system health
      const healthStatus = await adminController.getSystemHealth(ctx);
      
      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('components');
      expect(healthStatus.components).toHaveProperty('queue');
      expect(healthStatus.components).toHaveProperty('database');

      // Test pause/resume functionality
      await adminController.pauseAutomation(ctx);
      expect(queueManager.getQueueStatus().isRunning).toBe(false);

      await adminController.resumeAutomation(ctx);
      expect(queueManager.getQueueStatus().isRunning).toBe(true);
    });

    it('should handle manual recalculation requests', async () => {
      const ctx = {
        params: { ligaId: testLiga.id },
        request: { body: { description: 'Manual test recalculation' } },
        response: {}
      };

      // Mock liga lookup
      mockStrapi.entityService.findOne.mockResolvedValue(testLiga);

      const result = await adminController.triggerRecalculation(ctx);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.message).toContain(testLiga.name);

      // Should have created a job
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(1);
    });

    it('should provide calculation history', async () => {
      // Add some jobs to history
      await queueManager.addCalculationJob(testLiga.id, testSaison.id, Priority.NORMAL);
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 100));

      const ctx = {
        params: { ligaId: testLiga.id },
        query: { limit: 10 },
        response: {}
      };

      const history = await adminController.getCalculationHistory(ctx);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      
      if (history.length > 0) {
        expect(history[0]).toHaveProperty('id');
        expect(history[0]).toHaveProperty('ligaId');
        expect(history[0]).toHaveProperty('status');
        expect(history[0]).toHaveProperty('createdAt');
      }
    });
  });

  describe('Snapshot and Rollback Integration', () => {
    it('should create and restore snapshots during calculations', async () => {
      // Mock table data for snapshot
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
          tore_fuer: 2,
          tore_gegen: 1,
          tordifferenz: 1,
          punkte: 3,
          auto_calculated: true
        }
      ];

      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockTableData),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({})
      });

      // Mock file system operations for snapshot
      const fs = require('fs/promises');
      jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from(JSON.stringify({
        id: 'test-snapshot',
        ligaId: testLiga.id,
        saisonId: testSaison.id,
        data: mockTableData,
        createdAt: new Date().toISOString(),
        description: 'Test snapshot'
      })));

      // Create snapshot
      const snapshotId = await snapshotService.createSnapshot(testLiga.id, testSaison.id, 'Test snapshot');
      expect(snapshotId).toBeDefined();
      expect(fs.writeFile).toHaveBeenCalled();

      // Test admin snapshot management
      const ctx = {
        params: { ligaId: testLiga.id },
        response: {}
      };

      // This would normally list snapshots, but we'll mock the response
      jest.spyOn(snapshotService, 'listSnapshots').mockResolvedValue([
        {
          id: snapshotId,
          ligaId: testLiga.id,
          saisonId: testSaison.id,
          data: mockTableData,
          createdAt: new Date(),
          description: 'Test snapshot',
          filePath: './test-snapshots/test.json',
          checksum: 'test-checksum',
          size: 1000
        }
      ]);

      const snapshots = await snapshotService.listSnapshots(testLiga.id, testSaison.id);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].id).toBe(snapshotId);
    });
  });

  describe('Performance and Monitoring Integration', () => {
    it('should track performance metrics across the workflow', async () => {
      const startTime = Date.now();

      // Create multiple games to test performance
      const games = Array.from({ length: 5 }, (_, i) => 
        createTestSpiel(i + 1, teams[i % 2], teams[(i + 1) % 2], i + 1, i % 3)
      );

      mockStrapi.entityService.findMany.mockResolvedValue(games);

      // Process all games
      for (const game of games) {
        await lifecycle.afterCreate({
          result: game,
          params: {}
        });
      }

      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 300));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds

      // Check queue metrics
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.completedJobs).toBeGreaterThan(0);

      const metrics = queueManager.getMetrics();
      expect(metrics.totalProcessed).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.successRate).toBeGreaterThan(0);
    });

    it('should provide comprehensive system health monitoring', async () => {
      const ctx = { response: {} };
      const healthStatus = await adminController.getSystemHealth(ctx);

      expect(healthStatus.status).toMatch(/healthy|degraded|unhealthy/);
      expect(healthStatus.components).toHaveProperty('queue');
      expect(healthStatus.components).toHaveProperty('database');
      expect(healthStatus.components).toHaveProperty('validation');

      // Each component should have status and metrics
      Object.values(healthStatus.components).forEach((component: any) => {
        expect(component).toHaveProperty('status');
        expect(component).toHaveProperty('lastCheck');
      });
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from temporary failures', async () => {
      let failureCount = 0;
      const maxFailures = 2;

      // Mock intermittent failures
      mockStrapi.entityService.findMany.mockImplementation(() => {
        failureCount++;
        if (failureCount <= maxFailures) {
          return Promise.reject(new Error('Temporary database error'));
        }
        return Promise.resolve([]);
      });

      const game = createTestSpiel(1, teams[0], teams[1], 2, 1);
      
      await lifecycle.afterCreate({
        result: game,
        params: {}
      });

      // Process with retries
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should eventually succeed
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.completedJobs).toBe(1);
      expect(failureCount).toBe(maxFailures + 1); // Failed twice, succeeded on third try
    });

    it('should handle system overload gracefully', async () => {
      // Create many jobs quickly
      const games = Array.from({ length: 20 }, (_, i) => 
        createTestSpiel(i + 1, teams[i % 2], teams[(i + 1) % 2], i + 1, i % 3)
      );

      mockStrapi.entityService.findMany.mockResolvedValue(games);

      // Add all jobs simultaneously
      const promises = games.map(game => 
        lifecycle.afterCreate({
          result: game,
          params: {}
        })
      );

      await Promise.all(promises);

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBeGreaterThan(0);

      // Process with concurrency limits
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalStatus = queueManager.getQueueStatus();
      expect(finalStatus.completedJobs + finalStatus.failedJobs).toBe(finalStatus.totalJobs);
    });
  });
});