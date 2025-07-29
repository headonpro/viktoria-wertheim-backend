/**
 * Tests for Admin Controller
 * Tests manual recalculation, queue monitoring, and system management endpoints
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Context } from 'koa';
import adminController from '../../../../src/api/tabellen-eintrag/controllers/admin';
import type { RecalculationRequest, QueueStatus } from '../../../../src/admin/extensions/tabellen-automatisierung/types';

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

const mockTabellenService = {
  calculateTableForLiga: jest.fn()
};

const mockSnapshotService = {
  listSnapshots: jest.fn()
};

describe('Admin Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStrapi.service.mockImplementation((serviceName: string) => {
      switch (serviceName) {
        case 'api::tabellen-eintrag.queue-manager':
          return mockQueueManager;
        case 'api::tabellen-eintrag.tabellen-berechnung':
          return mockTabellenService;
        case 'api::tabellen-eintrag.snapshot':
          return mockSnapshotService;
        default:
          return {};
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('triggerRecalculation', () => {
    it('should trigger recalculation for valid liga', async () => {
      // Arrange
      const ligaId = 1;
      const saisonId = 1;
      const jobId = 'job_123';
      
      const ctx = {
        request: {
          body: {
            ligaId,
            saisonId,
            priority: 'HIGH',
            description: 'Test recalculation'
          } as RecalculationRequest
        },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      mockStrapi.entityService.findOne.mockResolvedValue({
        id: ligaId,
        name: 'Test Liga'
      });

      mockStrapi.entityService.findMany.mockResolvedValue([
        { id: 1, name: 'Team 1' },
        { id: 2, name: 'Team 2' }
      ]);

      mockQueueManager.addCalculationJob.mockResolvedValue(jobId);

      // Act
      await adminController.triggerRecalculation(ctx);

      // Assert
      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({
        success: true,
        jobId,
        message: 'Tabellenberechnung für Liga "Test Liga" wurde gestartet',
        estimatedDuration: 5 // 2 teams * 0.5 seconds, minimum 5
      });

      expect(mockQueueManager.addCalculationJob).toHaveBeenCalledWith(
        ligaId,
        saisonId,
        'HIGH',
        'MANUAL_TRIGGER',
        'Test recalculation'
      );
    });

    it('should return error for missing ligaId', async () => {
      // Arrange
      const ctx = {
        request: {
          body: {} as RecalculationRequest
        },
        status: 0,
        body: null
      } as unknown as Context;

      // Act
      await adminController.triggerRecalculation(ctx);

      // Assert
      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({
        success: false,
        message: 'Liga ID ist erforderlich',
        error: 'MISSING_LIGA_ID'
      });
    });

    it('should return error for non-existent liga', async () => {
      // Arrange
      const ctx = {
        request: {
          body: {
            ligaId: 999
          } as RecalculationRequest
        },
        status: 0,
        body: null
      } as unknown as Context;

      mockStrapi.entityService.findOne.mockResolvedValue(null);

      // Act
      await adminController.triggerRecalculation(ctx);

      // Assert
      expect(ctx.status).toBe(404);
      expect(ctx.body).toEqual({
        success: false,
        message: 'Liga nicht gefunden',
        error: 'LIGA_NOT_FOUND'
      });
    });

    it('should use current saison when not provided', async () => {
      // Arrange
      const ligaId = 1;
      const currentSaisonId = 2;
      const jobId = 'job_456';

      const ctx = {
        request: {
          body: {
            ligaId
          } as RecalculationRequest
        },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      mockStrapi.entityService.findOne.mockResolvedValue({
        id: ligaId,
        name: 'Test Liga'
      });

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([{ id: currentSaisonId, aktiv: true }]) // For saison query
        .mockResolvedValueOnce([{ id: 1 }, { id: 2 }]); // For teams query

      mockQueueManager.addCalculationJob.mockResolvedValue(jobId);

      // Act
      await adminController.triggerRecalculation(ctx);

      // Assert
      expect(mockQueueManager.addCalculationJob).toHaveBeenCalledWith(
        ligaId,
        currentSaisonId,
        'HIGH',
        'MANUAL_TRIGGER',
        'Manuelle Neuberechnung für Liga Test Liga'
      );
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const ctx = {
        request: {
          body: {
            ligaId: 1
          } as RecalculationRequest
        },
        status: 0,
        body: null
      } as unknown as Context;

      const error = new Error('Service unavailable');
      mockStrapi.entityService.findOne.mockRejectedValue(error);

      // Act
      await adminController.triggerRecalculation(ctx);

      // Assert
      expect(ctx.status).toBe(500);
      expect(ctx.body).toEqual({
        success: false,
        message: 'Fehler beim Starten der Tabellenberechnung',
        error: 'Service unavailable'
      });
    });
  });

  describe('getQueueStatus', () => {
    it('should return queue status', async () => {
      // Arrange
      const queueStatus: QueueStatus = {
        isRunning: true,
        totalJobs: 10,
        pendingJobs: 2,
        processingJobs: 1,
        completedJobs: 6,
        failedJobs: 1,
        averageProcessingTime: 5000,
        lastProcessedAt: new Date(),
        currentJobs: []
      };

      const ctx = {
        status: 0,
        body: null
      } as unknown as Context;

      mockQueueManager.getQueueStatus.mockResolvedValue(queueStatus);

      // Act
      await adminController.getQueueStatus(ctx);

      // Assert
      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual(queueStatus);
    });

    it('should handle service errors', async () => {
      // Arrange
      const ctx = {
        status: 0,
        body: null
      } as unknown as Context;

      const error = new Error('Queue service error');
      mockQueueManager.getQueueStatus.mockRejectedValue(error);

      // Act
      await adminController.getQueueStatus(ctx);

      // Assert
      expect(ctx.status).toBe(500);
      expect(ctx.body).toEqual({
        error: 'Fehler beim Abrufen des Queue-Status',
        message: 'Queue service error'
      });
    });
  });

  describe('pauseAutomation', () => {
    it('should pause automation successfully', async () => {
      // Arrange
      const ctx = {
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      mockQueueManager.pauseQueue.mockResolvedValue(undefined);

      // Act
      await adminController.pauseAutomation(ctx);

      // Assert
      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({
        success: true,
        message: 'Automatisierung wurde pausiert'
      });
      expect(mockQueueManager.pauseQueue).toHaveBeenCalled();
    });
  });

  describe('resumeAutomation', () => {
    it('should resume automation successfully', async () => {
      // Arrange
      const ctx = {
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      mockQueueManager.resumeQueue.mockResolvedValue(undefined);

      // Act
      await adminController.resumeAutomation(ctx);

      // Assert
      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({
        success: true,
        message: 'Automatisierung wurde fortgesetzt'
      });
      expect(mockQueueManager.resumeQueue).toHaveBeenCalled();
    });
  });

  describe('getCalculationHistory', () => {
    it('should return calculation history for liga', async () => {
      // Arrange
      const ligaId = 1;
      const limit = 25;
      const history = [
        {
          id: 'job_1',
          ligaId,
          saisonId: 1,
          trigger: 'MANUAL_TRIGGER',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 5000,
          entriesUpdated: 16
        }
      ];

      const ctx = {
        params: { ligaId: ligaId.toString() },
        query: { limit: limit.toString() },
        status: 0,
        body: null
      } as unknown as Context;

      mockQueueManager.getJobHistory.mockResolvedValue(history);

      // Act
      await adminController.getCalculationHistory(ctx);

      // Assert
      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual(history);
      expect(mockQueueManager.getJobHistory).toHaveBeenCalledWith(ligaId, limit);
    });

    it('should return error for missing ligaId', async () => {
      // Arrange
      const ctx = {
        params: {},
        query: {},
        status: 0,
        body: null
      } as unknown as Context;

      // Act
      await adminController.getCalculationHistory(ctx);

      // Assert
      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({
        error: 'Liga ID ist erforderlich'
      });
    });
  });

  describe('getSystemHealth', () => {
    it('should return system health status', async () => {
      // Arrange
      const ctx = {
        status: 0,
        body: null
      } as unknown as Context;

      const queueStatus = {
        isRunning: true,
        totalJobs: 5,
        completedJobs: 4,
        failedJobs: 1
      };

      mockQueueManager.getQueueStatus.mockResolvedValue(queueStatus);
      mockSnapshotService.listSnapshots.mockResolvedValue([]);

      // Mock database connection
      const mockDb = {
        connection: {
          raw: jest.fn().mockResolvedValue([])
        }
      };
      mockStrapi.db = mockDb;

      // Act
      await adminController.getSystemHealth(ctx);

      // Assert
      expect(ctx.status).toBe(200);
      expect(ctx.body).toMatchObject({
        status: 'healthy',
        components: expect.arrayContaining([
          expect.objectContaining({
            name: 'Queue System',
            status: 'up'
          }),
          expect.objectContaining({
            name: 'Database',
            status: 'up'
          }),
          expect.objectContaining({
            name: 'Snapshot Service',
            status: 'up'
          })
        ])
      });
    });
  });

  describe('getSettings', () => {
    it('should return automation settings', async () => {
      // Arrange
      const ctx = {
        status: 0,
        body: null
      } as unknown as Context;

      const mockConfig = {
        enabled: true,
        queueConcurrency: 3,
        maxRetries: 3
      };

      mockStrapi.config.get.mockReturnValue(mockConfig);

      // Act
      await adminController.getSettings(ctx);

      // Assert
      expect(ctx.status).toBe(200);
      expect(ctx.body).toMatchObject({
        enabled: true,
        queueConcurrency: 3,
        maxRetries: 3
      });
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      // Arrange
      const newSettings = {
        queueConcurrency: 5,
        maxRetries: 2
      };

      const ctx = {
        request: { body: newSettings },
        state: { user: { id: 1 } },
        status: 0,
        body: null
      } as unknown as Context;

      // Act
      await adminController.updateSettings(ctx);

      // Assert
      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({
        success: true,
        message: 'Einstellungen wurden aktualisiert',
        settings: newSettings
      });
    });

    it('should validate queue concurrency limits', async () => {
      // Arrange
      const invalidSettings = {
        queueConcurrency: 15 // Too high
      };

      const ctx = {
        request: { body: invalidSettings },
        status: 0,
        body: null
      } as unknown as Context;

      // Act
      await adminController.updateSettings(ctx);

      // Assert
      expect(ctx.status).toBe(400);
      expect(ctx.body).toEqual({
        error: 'Queue Concurrency muss zwischen 1 und 10 liegen'
      });
    });
  });
});