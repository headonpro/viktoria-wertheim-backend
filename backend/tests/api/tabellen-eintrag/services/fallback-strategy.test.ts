/**
 * Unit Tests for Fallback Strategy
 */

import { DefaultFallbackStrategy } from '../../../../src/api/tabellen-eintrag/services/fallback-strategy';
import { ErrorContext } from '../../../../src/api/tabellen-eintrag/services/error-handling';

// Mock Strapi
const mockSnapshotService = {
  listSnapshots: jest.fn(),
  restoreSnapshot: jest.fn()
};

const mockQueueManager = {
  pauseQueue: jest.fn(),
  resumeQueue: jest.fn(),
  clearLowPriorityJobs: jest.fn()
};

const mockTabellenService = {
  getTableForLiga: jest.fn()
};

const mockStrapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    debug: jest.fn()
  },
  service: jest.fn((serviceName: string) => {
    if (serviceName === 'api::tabellen-eintrag.snapshot') {
      return mockSnapshotService;
    }
    if (serviceName === 'api::tabellen-eintrag.queue-manager') {
      return mockQueueManager;
    }
    if (serviceName === 'api::tabellen-eintrag.tabellen-berechnung') {
      return mockTabellenService;
    }
    return {};
  }),
  config: {
    get: jest.fn()
  },
  db: {
    connection: {
      raw: jest.fn()
    }
  }
};

global.strapi = mockStrapi as any;
global.tableCache = {};

describe('DefaultFallbackStrategy', () => {
  let fallbackStrategy: DefaultFallbackStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    fallbackStrategy = new DefaultFallbackStrategy();
    global.tableCache = {};
  });

  describe('onCalculationFailure', () => {
    const mockContext: ErrorContext = {
      operation: 'calculate-table',
      ligaId: 1,
      saisonId: 2023,
      timestamp: new Date()
    };

    it('should restore from latest snapshot when available', async () => {
      const mockSnapshots = [
        { id: 'snapshot-1', createdAt: new Date('2023-12-01') },
        { id: 'snapshot-2', createdAt: new Date('2023-11-01') }
      ];
      const mockTableData = { entries: [{ team: 'Team A', points: 10 }] };

      mockSnapshotService.listSnapshots.mockResolvedValue(mockSnapshots);
      mockSnapshotService.restoreSnapshot.mockResolvedValue(undefined);
      mockTabellenService.getTableForLiga.mockResolvedValue(mockTableData);

      const result = await fallbackStrategy.onCalculationFailure(mockContext);

      expect(mockSnapshotService.listSnapshots).toHaveBeenCalledWith(1, 2023);
      expect(mockSnapshotService.restoreSnapshot).toHaveBeenCalledWith('snapshot-1');
      expect(mockTabellenService.getTableForLiga).toHaveBeenCalledWith(1, 2023);
      expect(result).toEqual(mockTableData);
    });

    it('should return empty structure when no snapshots available', async () => {
      mockSnapshotService.listSnapshots.mockResolvedValue([]);

      const result = await fallbackStrategy.onCalculationFailure(mockContext);

      expect(result).toEqual({
        ligaId: 1,
        saisonId: 2023,
        entries: [],
        lastUpdated: expect.any(Date),
        status: 'fallback',
        message: 'Table data temporarily unavailable'
      });
    });

    it('should handle snapshot service failure gracefully', async () => {
      mockSnapshotService.listSnapshots.mockRejectedValue(new Error('Snapshot service failed'));

      const result = await fallbackStrategy.onCalculationFailure(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Fallback strategy failed for calculation failure',
        expect.any(Object)
      );
      expect(result).toEqual({
        ligaId: 1,
        saisonId: 2023,
        entries: [],
        lastUpdated: expect.any(Date),
        status: 'fallback',
        message: 'Table data temporarily unavailable'
      });
    });

    it('should handle context without ligaId/saisonId', async () => {
      const contextWithoutIds: ErrorContext = {
        operation: 'calculate-table',
        timestamp: new Date()
      };

      const result = await fallbackStrategy.onCalculationFailure(contextWithoutIds);

      expect(result).toEqual({
        ligaId: undefined,
        saisonId: undefined,
        entries: [],
        lastUpdated: expect.any(Date),
        status: 'fallback',
        message: 'Table data temporarily unavailable'
      });
    });
  });

  describe('onQueueOverload', () => {
    const mockContext: ErrorContext = {
      operation: 'queue-processing',
      timestamp: new Date()
    };

    it('should pause queue and clear low priority jobs', async () => {
      mockQueueManager.pauseQueue.mockResolvedValue(undefined);
      mockQueueManager.clearLowPriorityJobs.mockResolvedValue(undefined);

      await fallbackStrategy.onQueueOverload(mockContext);

      expect(mockQueueManager.pauseQueue).toHaveBeenCalled();
      expect(mockQueueManager.clearLowPriorityJobs).toHaveBeenCalled();
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        'Queue overload fallback triggered',
        { context: mockContext }
      );
    });

    it('should handle queue manager failures gracefully', async () => {
      mockQueueManager.pauseQueue.mockRejectedValue(new Error('Queue manager failed'));

      await fallbackStrategy.onQueueOverload(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Fallback strategy failed for queue overload',
        expect.any(Object)
      );
    });

    it('should set up automatic queue resume', async () => {
      jest.useFakeTimers();
      
      mockQueueManager.pauseQueue.mockResolvedValue(undefined);
      mockQueueManager.clearLowPriorityJobs.mockResolvedValue(undefined);
      mockQueueManager.resumeQueue.mockResolvedValue(undefined);

      await fallbackStrategy.onQueueOverload(mockContext);

      // Fast-forward time by 30 seconds
      jest.advanceTimersByTime(30000);

      // Wait for the timeout callback to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(mockQueueManager.resumeQueue).toHaveBeenCalled();
      expect(mockStrapi.log.info).toHaveBeenCalledWith('Queue resumed after overload cooldown');

      jest.useRealTimers();
    });
  });

  describe('onDatabaseUnavailable', () => {
    const mockContext: ErrorContext = {
      operation: 'database-operation',
      ligaId: 1,
      saisonId: 2023,
      timestamp: new Date()
    };

    it('should enable read-only mode and start health monitoring', async () => {
      const mockConfig = {};
      mockStrapi.config.get.mockReturnValue(mockConfig);

      await fallbackStrategy.onDatabaseUnavailable(mockContext);

      expect(mockConfig.readOnlyMode).toBe(true);
      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Database unavailable fallback triggered',
        { context: mockContext }
      );
      expect(mockStrapi.log.info).toHaveBeenCalledWith('Read-only mode enabled');
    });

    it('should handle config failure gracefully', async () => {
      mockStrapi.config.get.mockImplementation(() => {
        throw new Error('Config failed');
      });

      await fallbackStrategy.onDatabaseUnavailable(mockContext);

      expect(mockStrapi.log.fatal).toHaveBeenCalledWith(
        'Critical: Fallback strategy failed for database unavailability',
        expect.any(Object)
      );
    });

    it('should start database health monitoring', async () => {
      jest.useFakeTimers();
      
      const mockConfig = {};
      mockStrapi.config.get.mockReturnValue(mockConfig);
      mockStrapi.db.connection.raw.mockResolvedValue([]);

      await fallbackStrategy.onDatabaseUnavailable(mockContext);

      // Fast-forward time to trigger health check
      jest.advanceTimersByTime(10000);

      // Wait for the health check to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(mockStrapi.db.connection.raw).toHaveBeenCalledWith('SELECT 1');
      expect(mockStrapi.log.info).toHaveBeenCalledWith('Database connectivity restored');

      jest.useRealTimers();
    });
  });

  describe('onValidationFailure', () => {
    const mockContext: ErrorContext = {
      operation: 'validation',
      ligaId: 1,
      saisonId: 2023,
      timestamp: new Date()
    };

    it('should return cached data when available', async () => {
      const mockCachedData = { entries: [{ team: 'Cached Team', points: 5 }] };
      
      // Set up cache
      global.tableCache = {
        'table_1_2023': {
          data: mockCachedData,
          timestamp: Date.now() - 1000 // 1 second ago
        }
      };

      const result = await fallbackStrategy.onValidationFailure(mockContext);

      expect(result).toEqual(mockCachedData);
      expect(mockStrapi.log.info).toHaveBeenCalledWith('Returning cached table data due to validation failure');
    });

    it('should try database when cache is stale', async () => {
      const mockTableData = { entries: [{ team: 'DB Team', points: 8 }] };
      
      // Set up stale cache (older than 1 hour)
      global.tableCache = {
        'table_1_2023': {
          data: { entries: [] },
          timestamp: Date.now() - 3700000 // More than 1 hour ago
        }
      };

      mockTabellenService.getTableForLiga.mockResolvedValue(mockTableData);

      const result = await fallbackStrategy.onValidationFailure(mockContext);

      expect(mockTabellenService.getTableForLiga).toHaveBeenCalledWith(1, 2023);
      expect(result).toEqual(mockTableData);
    });

    it('should return empty structure when all else fails', async () => {
      mockTabellenService.getTableForLiga.mockRejectedValue(new Error('DB failed'));

      const result = await fallbackStrategy.onValidationFailure(mockContext);

      expect(result).toEqual({
        ligaId: 1,
        saisonId: 2023,
        entries: [],
        lastUpdated: expect.any(Date),
        status: 'fallback',
        message: 'Table data temporarily unavailable'
      });
    });

    it('should handle context without ligaId/saisonId', async () => {
      const contextWithoutIds: ErrorContext = {
        operation: 'validation',
        timestamp: new Date()
      };

      const result = await fallbackStrategy.onValidationFailure(contextWithoutIds);

      expect(result).toEqual({
        ligaId: undefined,
        saisonId: undefined,
        entries: [],
        lastUpdated: expect.any(Date),
        status: 'fallback',
        message: 'Table data temporarily unavailable'
      });
    });

    it('should handle fallback strategy failure', async () => {
      // Mock all methods to fail
      global.tableCache = undefined;
      mockTabellenService.getTableForLiga.mockRejectedValue(new Error('All failed'));

      const result = await fallbackStrategy.onValidationFailure(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Fallback strategy failed for validation failure',
        expect.any(Object)
      );
      expect(result).toEqual({
        ligaId: 1,
        saisonId: 2023,
        entries: [],
        lastUpdated: expect.any(Date),
        status: 'fallback',
        message: 'Table data temporarily unavailable'
      });
    });
  });

  describe('Cache Management', () => {
    it('should cache table data correctly', async () => {
      const mockContext: ErrorContext = {
        operation: 'database-operation',
        ligaId: 1,
        saisonId: 2023,
        timestamp: new Date()
      };

      const mockTableData = { entries: [{ team: 'Test Team', points: 10 }] };
      mockTabellenService.getTableForLiga.mockResolvedValue(mockTableData);
      mockStrapi.config.get.mockReturnValue({});

      await fallbackStrategy.onDatabaseUnavailable(mockContext);

      expect(global.tableCache['table_1_2023']).toBeDefined();
      expect(global.tableCache['table_1_2023'].data).toEqual(mockTableData);
      expect(global.tableCache['table_1_2023'].timestamp).toBeCloseTo(Date.now(), -2);
    });

    it('should handle cache retrieval failure gracefully', async () => {
      // Simulate cache access failure
      Object.defineProperty(global, 'tableCache', {
        get: () => {
          throw new Error('Cache access failed');
        }
      });

      const mockContext: ErrorContext = {
        operation: 'validation',
        ligaId: 1,
        saisonId: 2023,
        timestamp: new Date()
      };

      const result = await fallbackStrategy.onValidationFailure(mockContext);

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        'Failed to retrieve cached table data',
        expect.any(Object)
      );
      expect(result).toBeDefined();
    });
  });

  describe('Notification System', () => {
    it('should log administrator notifications', async () => {
      const mockContext: ErrorContext = {
        operation: 'queue-processing',
        timestamp: new Date()
      };

      mockQueueManager.pauseQueue.mockResolvedValue(undefined);
      mockQueueManager.clearLowPriorityJobs.mockResolvedValue(undefined);

      await fallbackStrategy.onQueueOverload(mockContext);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Administrator notification',
        expect.objectContaining({
          subject: 'Queue Overload',
          message: expect.stringContaining('temporarily paused'),
          timestamp: expect.any(String)
        })
      );
    });

    it('should handle notification failures gracefully', async () => {
      // Mock log.info to throw an error
      mockStrapi.log.info.mockImplementation(() => {
        throw new Error('Logging failed');
      });

      const mockContext: ErrorContext = {
        operation: 'database-operation',
        timestamp: new Date()
      };

      mockStrapi.config.get.mockReturnValue({});

      await fallbackStrategy.onDatabaseUnavailable(mockContext);

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Failed to notify administrators',
        expect.any(Object)
      );
    });
  });
});