/**
 * Integration tests for Spiel Lifecycle Hooks
 * Tests complete lifecycle scenarios with real queue manager and table calculation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  SpielLifecycleImpl, 
  LifecycleEvent,
  SpielEntity,
  SpielStatus,
  Priority
} from '../../../src/api/spiel/lifecycles';
import { SpielValidationService } from '../../../src/api/spiel/services/validation';
import { QueueManagerImpl } from '../../../src/api/tabellen-eintrag/services/queue-manager';
import { TabellenBerechnungsServiceImpl } from '../../../src/api/tabellen-eintrag/services/tabellen-berechnung';
import { DEFAULT_AUTOMATION_CONFIG } from '../../../src/config/automation';

// Mock the table calculation service to avoid database dependencies
jest.mock('../../../src/api/tabellen-eintrag/services/tabellen-berechnung');

describe('SpielLifecycle Integration Tests', () => {
  let lifecycle: SpielLifecycleImpl;
  let queueManager: QueueManagerImpl;
  let tabellenService: TabellenBerechnungsServiceImpl;
  let validationService: SpielValidationService;

  // Test data
  const mockLiga = { id: 1, name: 'Bundesliga' };
  const mockSaison = { id: 1, name: '2023/24', jahr: 2023 };
  const mockHeimTeam = { id: 1, name: 'Bayern München' };
  const mockGastTeam = { id: 2, name: 'Borussia Dortmund' };

  const createMockSpiel = (overrides: Partial<SpielEntity> = {}): SpielEntity => ({
    id: 1,
    datum: '2023-10-15T15:00:00Z',
    liga: mockLiga,
    saison: mockSaison,
    heim_team: mockHeimTeam,
    gast_team: mockGastTeam,
    heim_tore: 2,
    gast_tore: 1,
    spieltag: 10,
    status: SpielStatus.BEENDET,
    notizen: '',
    ...overrides
  });

  beforeEach(() => {
    // Create real instances (with mocked table service)
    tabellenService = new TabellenBerechnungsServiceImpl();
    validationService = new SpielValidationService();
    
    // Mock the table calculation method
    jest.mocked(tabellenService.calculateTableForLiga).mockResolvedValue();
    
    // Create queue manager with test configuration
    const testConfig = {
      ...DEFAULT_AUTOMATION_CONFIG.queue,
      concurrency: 1,
      maxRetries: 2,
      jobTimeout: 5000,
      cleanupInterval: 1000
    };
    
    queueManager = new QueueManagerImpl(tabellenService, testConfig);
    lifecycle = new SpielLifecycleImpl(validationService, queueManager);
  });

  afterEach(async () => {
    // Clean up queue and wait for all operations to complete
    if (queueManager) {
      queueManager.pauseQueue();
      await queueManager.clearQueue();
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      queueManager.destroy();
    }
  });

  describe('Complete lifecycle scenarios', () => {
    it('should handle game creation, update, and deletion lifecycle', async () => {
      // 1. Create a planned game (should not trigger calculation)
      const plannedSpiel = createMockSpiel({ 
        id: 1,
        status: SpielStatus.GEPLANT,
        heim_tore: undefined,
        gast_tore: undefined
      });

      const createEvent: LifecycleEvent = {
        result: plannedSpiel,
        params: {}
      };

      await lifecycle.afterCreate(createEvent);

      let queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(0);

      // 2. Update game to completed (should trigger calculation)
      const completedSpiel = createMockSpiel({ 
        id: 1,
        status: SpielStatus.BEENDET,
        heim_tore: 3,
        gast_tore: 1
      });

      const updateEvent: LifecycleEvent = {
        result: completedSpiel,
        params: {},
        state: { previousData: plannedSpiel }
      };

      await lifecycle.afterUpdate(updateEvent);

      queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(1);
      expect(queueStatus.pendingJobs).toBe(1);

      // Wait for job processing
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 200));

      queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.completedJobs).toBe(1);
      expect(tabellenService.calculateTableForLiga).toHaveBeenCalledWith(mockLiga.id, mockSaison.id);

      // 3. Wait for lock to be released, then update scores
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updatedScoreSpiel = createMockSpiel({ 
        id: 1,
        status: SpielStatus.BEENDET,
        heim_tore: 4,
        gast_tore: 1
      });

      const scoreUpdateEvent: LifecycleEvent = {
        result: updatedScoreSpiel,
        params: {},
        state: { previousData: completedSpiel }
      };

      await lifecycle.afterUpdate(scoreUpdateEvent);

      // Should have a new job since previous completed
      queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBeGreaterThanOrEqual(1);

      // 4. Delete the game (should trigger recalculation with high priority)
      const deleteEvent: LifecycleEvent = {
        result: updatedScoreSpiel,
        params: {}
      };

      await lifecycle.afterDelete(deleteEvent);

      queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBeGreaterThanOrEqual(2);

      // Process remaining jobs
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 300));

      queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.completedJobs).toBeGreaterThanOrEqual(2);
      expect(tabellenService.calculateTableForLiga).toHaveBeenCalledTimes(queueStatus.completedJobs);
    });

    it('should handle multiple games from same league concurrently', async () => {
      const games = [
        createMockSpiel({ id: 1, heim_team: { id: 1, name: 'Team A' }, gast_team: { id: 2, name: 'Team B' } }),
        createMockSpiel({ id: 2, heim_team: { id: 3, name: 'Team C' }, gast_team: { id: 4, name: 'Team D' } }),
        createMockSpiel({ id: 3, heim_team: { id: 5, name: 'Team E' }, gast_team: { id: 6, name: 'Team F' } })
      ];

      // Create all games simultaneously
      const createPromises = games.map(spiel => 
        lifecycle.afterCreate({ result: spiel, params: {} })
      );

      await Promise.all(createPromises);

      // Should have jobs for each game (but duplicate prevention might reduce this)
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBeGreaterThan(0);
      expect(queueStatus.totalJobs).toBeLessThanOrEqual(3);

      // Process all jobs
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 300));

      const finalStatus = queueManager.getQueueStatus();
      expect(finalStatus.completedJobs).toBeGreaterThan(0);
      expect(tabellenService.calculateTableForLiga).toHaveBeenCalled();
    });

    it('should handle validation errors gracefully', async () => {
      // Create a game with invalid data
      const invalidSpiel = createMockSpiel({ 
        heim_tore: -1, // Invalid negative score
        gast_tore: 2
      });

      const event: LifecycleEvent = {
        result: invalidSpiel,
        params: {}
      };

      // Should not throw error
      await expect(lifecycle.afterCreate(event)).resolves.toBeUndefined();

      // Should not have created any jobs
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(0);
      expect(tabellenService.calculateTableForLiga).not.toHaveBeenCalled();
    });

    it('should handle queue processing errors with retries', async () => {
      // Mock table service to fail initially then succeed
      let callCount = 0;
      jest.mocked(tabellenService.calculateTableForLiga).mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.reject(new Error('Database connection failed'));
        }
        return Promise.resolve();
      });

      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      await lifecycle.afterCreate(event);

      // Process queue and wait for retries
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should eventually succeed after retries
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.completedJobs).toBe(1);
      expect(callCount).toBeGreaterThan(1); // Should have retried
    });

    it('should respect hook configuration settings', async () => {
      // Disable hooks
      lifecycle.updateConfig({ enabled: false });

      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      await lifecycle.afterCreate(event);

      // Should not have created any jobs
      let queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(0);

      // Re-enable hooks
      lifecycle.updateConfig({ enabled: true });

      await lifecycle.afterCreate(event);

      // Should now create jobs
      queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(1);
    });

    it('should handle queue pause and resume operations', async () => {
      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      // Pause queue before creating job
      lifecycle.pauseQueue();

      await lifecycle.afterCreate(event);

      let queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(1);
      expect(queueStatus.pendingJobs).toBe(1);

      // Try to process (should not process while paused)
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 100));

      queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.completedJobs).toBe(0);

      // Resume and process
      lifecycle.resumeQueue();
      await new Promise(resolve => setTimeout(resolve, 100));

      queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.completedJobs).toBe(1);
    });
  });

  describe('Error handling and logging', () => {
    it('should log lifecycle events appropriately', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      await lifecycle.afterCreate(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SpielLifecycle] Game created')
      );

      consoleSpy.mockRestore();
    });

    it('should handle and log processing errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock table service to always fail
      jest.mocked(tabellenService.calculateTableForLiga).mockRejectedValue(
        new Error('Critical database error')
      );

      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      await lifecycle.afterCreate(event);

      // Process queue to trigger error
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should have logged error but not thrown
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in afterCreate'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle timeout scenarios', async () => {
      // Mock table service to timeout
      jest.mocked(tabellenService.calculateTableForLiga).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
      );

      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      await lifecycle.afterCreate(event);

      // Process queue (should timeout)
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 6000)); // Wait longer than job timeout

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.failedJobs).toBeGreaterThan(0);
    });
  });

  describe('Performance and monitoring', () => {
    it('should track processing times', async () => {
      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      const startTime = Date.now();
      await lifecycle.afterCreate(event);
      const endTime = Date.now();

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(1000);

      // Process queue and check metrics
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 100));

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should provide queue health status', async () => {
      const healthStatus = queueManager.getHealthStatus();

      expect(healthStatus).toHaveProperty('status');
      expect(healthStatus).toHaveProperty('timestamp');
      expect(healthStatus).toHaveProperty('queueStatus');
      expect(healthStatus).toHaveProperty('metrics');
      expect(healthStatus).toHaveProperty('issues');
      expect(healthStatus.status).toMatch(/healthy|degraded|unhealthy/);
    });

    it('should provide detailed queue status', async () => {
      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      await lifecycle.afterCreate(event);

      const detailedStatus = queueManager.getDetailedStatus();

      expect(detailedStatus).toHaveProperty('jobs');
      expect(detailedStatus).toHaveProperty('deadLetterJobs');
      expect(detailedStatus).toHaveProperty('activeLocks');
      expect(detailedStatus).toHaveProperty('config');
      expect(detailedStatus.jobs).toHaveLength(1);
    });
  });
});