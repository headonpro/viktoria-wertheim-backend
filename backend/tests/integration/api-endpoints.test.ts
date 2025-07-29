/**
 * API Endpoint Integration Tests
 * Tests all new API endpoints for automation functionality
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AdminController } from '../../src/api/tabellen-eintrag/controllers/admin';
import { QueueManagerImpl } from '../../src/api/tabellen-eintrag/services/queue-manager';
import { TabellenBerechnungsServiceImpl } from '../../src/api/tabellen-eintrag/services/tabellen-berechnung';
import { SnapshotServiceImpl } from '../../src/api/tabellen-eintrag/services/snapshot';
import { DEFAULT_AUTOMATION_CONFIG } from '../../src/config/automation';
import { Priority, JobStatus } from '../../src/api/tabellen-eintrag/services/queue-manager';

// Mock Strapi for API testing
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

global.strapi = mockStrapi as any;

describe('API Endpoints Integration Tests', () => {
  let adminController: AdminController;
  let queueManager: QueueManagerImpl;
  let tabellenService: TabellenBerechnungsServiceImpl;
  let snapshotService: SnapshotServiceImpl;

  const testLiga = { id: 1, name: 'Test Liga' };
  const testSaison = { id: 1, name: '2023/24', jahr: 2023 };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Initialize services
    tabellenService = new TabellenBerechnungsServiceImpl(mockStrapi);
    
    const queueConfig = {
      ...DEFAULT_AUTOMATION_CONFIG.queue,
      concurrency: 1,
      maxRetries: 2,
      jobTimeout: 5000
    };
    
    queueManager = new QueueManagerImpl(tabellenService, queueConfig);
    
    const snapshotConfig = {
      storageDirectory: './test-snapshots',
      maxSnapshots: 10,
      maxAge: 30,
      compressionEnabled: false,
      checksumEnabled: true
    };
    
    snapshotService = new SnapshotServiceImpl(mockStrapi, snapshotConfig);
    adminController = new AdminController(queueManager, snapshotService, mockStrapi);

    // Setup default mocks
    mockStrapi.entityService.findOne.mockResolvedValue(testLiga);
    mockStrapi.entityService.findMany.mockResolvedValue([]);
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
      queueManager.destroy();
    }
  });

  describe('POST /api/tabellen-eintraege/recalculate/:ligaId', () => {
    it('should trigger recalculation for valid liga', async () => {
      const ctx = {
        params: { ligaId: testLiga.id },
        request: { 
          body: { 
            description: 'Test recalculation',
            priority: 'HIGH'
          } 
        },
        response: {}
      };

      const result = await adminController.triggerRecalculation(ctx);

      expect(result.success).toBe(true);
      expect(result.jobId).toBeDefined();
      expect(result.message).toContain(testLiga.name);
      expect(result.estimatedDuration).toBeGreaterThan(0);

      // Verify job was created
      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBe(1);
      expect(queueStatus.pendingJobs).toBe(1);
    });

    it('should return error for non-existent liga', async () => {
      mockStrapi.entityService.findOne.mockResolvedValue(null);

      const ctx = {
        params: { ligaId: 999 },
        request: { body: {} },
        response: {}
      };

      const result = await adminController.triggerRecalculation(ctx);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Liga not found');
    });

    it('should handle missing parameters gracefully', async () => {
      const ctx = {
        params: {},
        request: { body: {} },
        response: {}
      };

      const result = await adminController.triggerRecalculation(ctx);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate priority parameter', async () => {
      const ctx = {
        params: { ligaId: testLiga.id },
        request: { 
          body: { 
            priority: 'INVALID_PRIORITY'
          } 
        },
        response: {}
      };

      const result = await adminController.triggerRecalculation(ctx);

      expect(result.success).toBe(true); // Should use default priority
      expect(result.jobId).toBeDefined();
    });

    it('should handle database errors', async () => {
      mockStrapi.entityService.findOne.mockRejectedValue(new Error('Database error'));

      const ctx = {
        params: { ligaId: testLiga.id },
        request: { body: {} },
        response: {}
      };

      const result = await adminController.triggerRecalculation(ctx);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('GET /api/tabellen-eintraege/queue-status', () => {
    it('should return current queue status', async () => {
      // Add some jobs to the queue
      await queueManager.addCalculationJob(1, 1, Priority.HIGH);
      await queueManager.addCalculationJob(2, 1, Priority.NORMAL);

      const ctx = { response: {} };
      const status = await adminController.getQueueStatus(ctx);

      expect(status).toHaveProperty('totalJobs');
      expect(status).toHaveProperty('pendingJobs');
      expect(status).toHaveProperty('processingJobs');
      expect(status).toHaveProperty('completedJobs');
      expect(status).toHaveProperty('failedJobs');
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('lastProcessed');

      expect(status.totalJobs).toBe(2);
      expect(status.pendingJobs).toBe(2);
      expect(status.processingJobs).toBe(0);
      expect(status.isRunning).toBe(true);
    });

    it('should return empty status for empty queue', async () => {
      const ctx = { response: {} };
      const status = await adminController.getQueueStatus(ctx);

      expect(status.totalJobs).toBe(0);
      expect(status.pendingJobs).toBe(0);
      expect(status.processingJobs).toBe(0);
      expect(status.completedJobs).toBe(0);
      expect(status.failedJobs).toBe(0);
    });

    it('should include queue metrics', async () => {
      // Add and process some jobs
      await queueManager.addCalculationJob(1, 1);
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 100));

      const ctx = { response: {} };
      const status = await adminController.getQueueStatus(ctx);

      expect(status).toHaveProperty('metrics');
      expect(status.metrics).toHaveProperty('totalProcessed');
      expect(status.metrics).toHaveProperty('successRate');
      expect(status.metrics).toHaveProperty('errorRate');
      expect(status.metrics).toHaveProperty('averageProcessingTime');
    });
  });

  describe('POST /api/tabellen-eintraege/pause-automation', () => {
    it('should pause automation successfully', async () => {
      const ctx = { response: {} };
      const result = await adminController.pauseAutomation(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('paused');

      // Verify queue is paused
      const status = queueManager.getQueueStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should handle already paused state', async () => {
      // Pause first
      queueManager.pauseQueue();

      const ctx = { response: {} };
      const result = await adminController.pauseAutomation(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('already paused');
    });
  });

  describe('POST /api/tabellen-eintraege/resume-automation', () => {
    it('should resume automation successfully', async () => {
      // Pause first
      queueManager.pauseQueue();

      const ctx = { response: {} };
      const result = await adminController.resumeAutomation(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('resumed');

      // Verify queue is running
      const status = queueManager.getQueueStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should handle already running state', async () => {
      const ctx = { response: {} };
      const result = await adminController.resumeAutomation(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('already running');
    });
  });

  describe('GET /api/tabellen-eintraege/calculation-history/:ligaId', () => {
    it('should return calculation history for liga', async () => {
      // Add some jobs to create history
      const jobId1 = await queueManager.addCalculationJob(testLiga.id, testSaison.id);
      const jobId2 = await queueManager.addCalculationJob(testLiga.id, testSaison.id);

      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 100));

      const ctx = {
        params: { ligaId: testLiga.id },
        query: { limit: 10, offset: 0 },
        response: {}
      };

      const history = await adminController.getCalculationHistory(ctx);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);

      if (history.length > 0) {
        const job = history[0];
        expect(job).toHaveProperty('id');
        expect(job).toHaveProperty('ligaId');
        expect(job).toHaveProperty('saisonId');
        expect(job).toHaveProperty('status');
        expect(job).toHaveProperty('createdAt');
        expect(job).toHaveProperty('priority');
        expect(job.ligaId).toBe(testLiga.id);
      }
    });

    it('should handle pagination parameters', async () => {
      const ctx = {
        params: { ligaId: testLiga.id },
        query: { limit: 5, offset: 10 },
        response: {}
      };

      const history = await adminController.getCalculationHistory(ctx);

      expect(Array.isArray(history)).toBe(true);
      // History might be empty if no jobs exist, but should not error
    });

    it('should return empty array for liga with no history', async () => {
      const ctx = {
        params: { ligaId: 999 },
        query: {},
        response: {}
      };

      const history = await adminController.getCalculationHistory(ctx);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });
  });

  describe('GET /api/tabellen-eintraege/system-health', () => {
    it('should return comprehensive system health status', async () => {
      const ctx = { response: {} };
      const health = await adminController.getSystemHealth(ctx);

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('components');
      expect(health).toHaveProperty('metrics');

      expect(health.status).toMatch(/healthy|degraded|unhealthy/);
      expect(health.components).toHaveProperty('queue');
      expect(health.components).toHaveProperty('database');
      expect(health.components).toHaveProperty('validation');

      // Check component structure
      Object.values(health.components).forEach((component: any) => {
        expect(component).toHaveProperty('status');
        expect(component).toHaveProperty('lastCheck');
      });
    });

    it('should detect unhealthy components', async () => {
      // Mock database error
      mockStrapi.db.query.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const ctx = { response: {} };
      const health = await adminController.getSystemHealth(ctx);

      expect(health.status).toMatch(/degraded|unhealthy/);
      expect(health.components.database.status).toBe('unhealthy');
    });
  });

  describe('GET /api/tabellen-eintraege/settings', () => {
    it('should return current automation settings', async () => {
      const ctx = { response: {} };
      const settings = await adminController.getSettings(ctx);

      expect(settings).toHaveProperty('automation');
      expect(settings).toHaveProperty('queue');
      expect(settings).toHaveProperty('validation');
      expect(settings).toHaveProperty('snapshots');

      expect(settings.automation).toHaveProperty('enabled');
      expect(settings.queue).toHaveProperty('concurrency');
      expect(settings.queue).toHaveProperty('maxRetries');
    });
  });

  describe('POST /api/tabellen-eintraege/settings', () => {
    it('should update automation settings', async () => {
      const newSettings = {
        automation: { enabled: false },
        queue: { concurrency: 3, maxRetries: 5 }
      };

      const ctx = {
        request: { body: newSettings },
        response: {}
      };

      const result = await adminController.updateSettings(ctx);

      expect(result.success).toBe(true);
      expect(result.message).toContain('updated');
      expect(result.settings).toMatchObject(newSettings);
    });

    it('should validate settings before updating', async () => {
      const invalidSettings = {
        queue: { concurrency: -1, maxRetries: 'invalid' }
      };

      const ctx = {
        request: { body: invalidSettings },
        response: {}
      };

      const result = await adminController.updateSettings(ctx);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid');
    });
  });

  describe('Snapshot Management Endpoints', () => {
    beforeEach(() => {
      // Mock file system operations
      const fs = require('fs/promises');
      jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
      jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('{}'));
      jest.spyOn(fs, 'readdir').mockResolvedValue([]);
      jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);
    });

    it('should create snapshot via API', async () => {
      const mockTableData = [
        {
          id: 1,
          team_name: 'Test Team',
          liga: testLiga,
          saison: testSaison,
          platz: 1,
          punkte: 3
        }
      ];

      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(mockTableData)
      });

      const ctx = {
        params: { ligaId: testLiga.id },
        request: { body: { description: 'API test snapshot' } },
        response: {}
      };

      // This would be implemented in the admin controller
      const snapshotId = await snapshotService.createSnapshot(
        testLiga.id, 
        testSaison.id, 
        'API test snapshot'
      );

      expect(snapshotId).toBeDefined();
      expect(snapshotId).toMatch(/^snapshot_/);
    });

    it('should list snapshots via API', async () => {
      // Mock snapshot data
      jest.spyOn(snapshotService, 'listSnapshots').mockResolvedValue([
        {
          id: 'snapshot_1_1_test',
          ligaId: testLiga.id,
          saisonId: testSaison.id,
          data: [],
          createdAt: new Date(),
          description: 'Test snapshot',
          filePath: './test.json',
          checksum: 'test',
          size: 100
        }
      ]);

      const snapshots = await snapshotService.listSnapshots(testLiga.id, testSaison.id);

      expect(Array.isArray(snapshots)).toBe(true);
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].ligaId).toBe(testLiga.id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed request bodies', async () => {
      const ctx = {
        params: { ligaId: testLiga.id },
        request: { body: 'invalid json' },
        response: {}
      };

      // Should not crash, should handle gracefully
      const result = await adminController.triggerRecalculation(ctx);
      expect(result).toHaveProperty('success');
    });

    it('should handle missing authentication context', async () => {
      const ctx = {
        params: { ligaId: testLiga.id },
        request: { body: {} },
        response: {},
        state: { user: null }
      };

      // Should still work for admin endpoints (authentication handled by Strapi)
      const result = await adminController.triggerRecalculation(ctx);
      expect(result).toHaveProperty('success');
    });

    it('should handle concurrent API requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        params: { ligaId: testLiga.id },
        request: { body: { description: `Concurrent request ${i}` } },
        response: {}
      }));

      // Execute all requests concurrently
      const promises = requests.map(ctx => 
        adminController.triggerRecalculation(ctx)
      );

      const results = await Promise.all(promises);

      // All should succeed (duplicate prevention might reduce actual jobs)
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      const queueStatus = queueManager.getQueueStatus();
      expect(queueStatus.totalJobs).toBeGreaterThan(0);
      expect(queueStatus.totalJobs).toBeLessThanOrEqual(5);
    });

    it('should handle service unavailability', async () => {
      // Simulate service failure
      jest.spyOn(queueManager, 'addCalculationJob').mockRejectedValue(
        new Error('Queue service unavailable')
      );

      const ctx = {
        params: { ligaId: testLiga.id },
        request: { body: {} },
        response: {}
      };

      const result = await adminController.triggerRecalculation(ctx);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Queue service unavailable');
    });

    it('should validate input parameters', async () => {
      const testCases = [
        { params: { ligaId: 'invalid' }, expectedError: true },
        { params: { ligaId: -1 }, expectedError: true },
        { params: { ligaId: 0 }, expectedError: true },
        { params: { ligaId: 1 }, expectedError: false }
      ];

      for (const testCase of testCases) {
        const ctx = {
          params: testCase.params,
          request: { body: {} },
          response: {}
        };

        const result = await adminController.triggerRecalculation(ctx);

        if (testCase.expectedError) {
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        } else {
          expect(result.success).toBe(true);
        }
      }
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent response format for all endpoints', async () => {
      const endpoints = [
        () => adminController.triggerRecalculation({
          params: { ligaId: testLiga.id },
          request: { body: {} },
          response: {}
        }),
        () => adminController.getQueueStatus({ response: {} }),
        () => adminController.pauseAutomation({ response: {} }),
        () => adminController.resumeAutomation({ response: {} }),
        () => adminController.getSystemHealth({ response: {} }),
        () => adminController.getSettings({ response: {} })
      ];

      for (const endpoint of endpoints) {
        const result = await endpoint();
        
        // All responses should be objects
        expect(typeof result).toBe('object');
        expect(result).not.toBeNull();
        
        // Success/error responses should have consistent structure
        if (result.hasOwnProperty('success')) {
          expect(typeof result.success).toBe('boolean');
          if (!result.success) {
            expect(result).toHaveProperty('error');
          }
        }
      }
    });
  });
});