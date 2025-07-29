/**
 * Database Optimizer Service Tests
 * Tests for database performance optimizations
 */

import { DatabaseOptimizerImpl, DatabaseOptimizer, OptimizationType, RecommendationPriority } from '../../../../src/api/tabellen-eintrag/services/database-optimizer';

describe('DatabaseOptimizer', () => {
  let optimizer: DatabaseOptimizer;
  let mockStrapi: any;
  let mockDb: any;
  let mockConnection: any;
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      numUsed: jest.fn().mockReturnValue(5),
      numFree: jest.fn().mockReturnValue(10),
      numPendingAcquires: jest.fn().mockReturnValue(2),
      max: 20,
      min: 2,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      on: jest.fn()
    };

    mockConnection = {
      client: {
        config: {
          client: 'postgres'
        },
        pool: mockPool,
        on: jest.fn()
      },
      raw: jest.fn().mockResolvedValue({ rows: [] })
    };

    mockDb = {
      connection: mockConnection,
      transaction: jest.fn().mockImplementation((callback) => callback())
    };

    mockStrapi = {
      db: mockDb,
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      }
    };

    optimizer = new DatabaseOptimizerImpl(mockStrapi);
  });

  describe('createIndexes', () => {
    it('should create required indexes for PostgreSQL', async () => {
      mockConnection.raw
        .mockResolvedValueOnce({ rows: [] }) // Index doesn't exist
        .mockResolvedValueOnce(undefined); // Index creation successful

      await optimizer.createIndexes();

      expect(mockConnection.raw).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1 FROM pg_indexes'),
        expect.any(Array)
      );
      expect(mockConnection.raw).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX')
      );
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Index creation completed')
      );
    });

    it('should skip existing indexes', async () => {
      mockConnection.raw.mockResolvedValue({ rows: [{ exists: true }] });

      await optimizer.createIndexes();

      expect(mockStrapi.log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Index already exists')
      );
    });

    it('should handle index creation errors gracefully', async () => {
      mockConnection.raw
        .mockResolvedValueOnce({ rows: [] }) // Index doesn't exist
        .mockRejectedValueOnce(new Error('Index creation failed'));

      await optimizer.createIndexes();

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create index'),
        expect.any(Error)
      );
    });

    it('should create MySQL-specific indexes', async () => {
      mockConnection.client.config.client = 'mysql';
      mockConnection.raw.mockResolvedValue([]);

      await optimizer.createIndexes();

      expect(mockConnection.raw).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1 FROM information_schema.statistics'),
        expect.any(Array)
      );
    });

    it('should create SQLite-specific indexes', async () => {
      mockConnection.client.config.client = 'sqlite';
      mockConnection.raw.mockResolvedValue([]);

      await optimizer.createIndexes();

      expect(mockConnection.raw).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1 FROM sqlite_master'),
        expect.any(Array)
      );
    });
  });

  describe('optimizeQueries', () => {
    it('should enable query logging and optimize settings', async () => {
      await optimizer.optimizeQueries();

      expect(mockConnection.raw).toHaveBeenCalledWith(
        'SET log_min_duration_statement = 1000'
      );
      expect(mockConnection.raw).toHaveBeenCalledWith(
        'SET work_mem = \'16MB\''
      );
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Query optimization completed')
      );
    });

    it('should handle MySQL query optimization', async () => {
      mockConnection.client.config.client = 'mysql';

      await optimizer.optimizeQueries();

      expect(mockConnection.raw).toHaveBeenCalledWith(
        'SET GLOBAL slow_query_log = \'ON\''
      );
      expect(mockConnection.raw).toHaveBeenCalledWith(
        'SET SESSION query_cache_type = ON'
      );
    });

    it('should handle optimization errors gracefully', async () => {
      mockConnection.raw.mockRejectedValue(new Error('Optimization failed'));

      await optimizer.optimizeQueries();

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not enable query logging'),
        expect.any(Error)
      );
    });
  });

  describe('configureConnectionPool', () => {
    it('should configure connection pool with optimized settings', async () => {
      await optimizer.configureConnectionPool();

      expect(mockPool.on).toHaveBeenCalledWith('acquireRequest', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('acquireSuccess', expect.any(Function));
      expect(mockPool.on).toHaveBeenCalledWith('acquireFail', expect.any(Function));
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Connection pool configuration completed')
      );
    });

    it('should handle missing pool gracefully', async () => {
      mockConnection.client.pool = null;

      await optimizer.configureConnectionPool();

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Connection pool configuration completed')
      );
    });
  });

  describe('analyzeQueryPerformance', () => {
    it('should analyze query performance and provide recommendations', async () => {
      // Mock index usage stats
      mockConnection.raw.mockResolvedValue({
        rows: [
          {
            tablename: 'spiele',
            indexname: 'idx_spiele_liga_saison',
            idx_tup_read: 1000,
            idx_tup_fetch: 800
          }
        ]
      });

      const report = await optimizer.analyzeQueryPerformance();

      expect(report).toHaveProperty('slowQueries');
      expect(report).toHaveProperty('indexUsage');
      expect(report).toHaveProperty('connectionStats');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('timestamp');
      expect(report.timestamp).toBeInstanceOf(Date);
    });

    it('should identify slow queries', async () => {
      // Simulate slow query tracking
      const optimizerImpl = optimizer as DatabaseOptimizerImpl;
      (optimizerImpl as any).queryPerformanceCache.set('SELECT * FROM spiele', {
        query: 'SELECT * FROM spiele WHERE liga_id = ?',
        executionTime: 2000,
        frequency: 5,
        lastExecuted: new Date()
      });

      mockConnection.raw.mockResolvedValue({ rows: [] });

      const report = await optimizer.analyzeQueryPerformance();

      expect(report.slowQueries).toHaveLength(1);
      expect(report.slowQueries[0].executionTime).toBe(2000);
      expect(report.slowQueries[0].frequency).toBe(5);
    });

    it('should generate optimization recommendations', async () => {
      // Add slow query
      const optimizerImpl = optimizer as DatabaseOptimizerImpl;
      (optimizerImpl as any).queryPerformanceCache.set('slow-query', {
        query: 'SELECT * FROM spiele',
        executionTime: 6000,
        frequency: 10,
        lastExecuted: new Date()
      });

      mockConnection.raw.mockResolvedValue({ rows: [] });

      const report = await optimizer.analyzeQueryPerformance();

      expect(report.recommendations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: OptimizationType.QUERY_OPTIMIZATION,
            priority: RecommendationPriority.HIGH
          })
        ])
      );
    });
  });

  describe('getConnectionPoolStatus', () => {
    it('should return current connection pool status', async () => {
      const status = await optimizer.getConnectionPoolStatus();

      expect(status).toEqual({
        size: 15, // numUsed + numFree
        used: 5,
        waiting: 2,
        maxSize: 20,
        minSize: 2,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        idleTimeoutMillis: 30000
      });
    });

    it('should handle missing pool', async () => {
      mockConnection.client.pool = null;

      await expect(optimizer.getConnectionPoolStatus()).rejects.toThrow(
        'Connection pool not available'
      );
    });
  });

  describe('Performance Benchmarks', () => {
    it('should create indexes within performance threshold', async () => {
      const startTime = Date.now();
      
      mockConnection.raw.mockResolvedValue({ rows: [] });

      await optimizer.createIndexes();

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should analyze performance within acceptable time', async () => {
      const startTime = Date.now();
      
      mockConnection.raw.mockResolvedValue({ rows: [] });

      await optimizer.analyzeQueryPerformance();

      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Database Client Specific Tests', () => {
    it('should handle PostgreSQL specific optimizations', async () => {
      mockConnection.client.config.client = 'postgres';

      await optimizer.optimizeQueries();

      expect(mockConnection.raw).toHaveBeenCalledWith(
        'SET log_min_duration_statement = 1000'
      );
      expect(mockConnection.raw).toHaveBeenCalledWith(
        'SET work_mem = \'16MB\''
      );
      expect(mockConnection.raw).toHaveBeenCalledWith(
        'SET shared_buffers = \'256MB\''
      );
    });

    it('should handle MySQL specific optimizations', async () => {
      mockConnection.client.config.client = 'mysql';

      await optimizer.optimizeQueries();

      expect(mockConnection.raw).toHaveBeenCalledWith(
        'SET GLOBAL slow_query_log = \'ON\''
      );
      expect(mockConnection.raw).toHaveBeenCalledWith(
        'SET SESSION query_cache_type = ON'
      );
    });

    it('should provide different pool configs for different databases', async () => {
      // Test PostgreSQL config
      mockConnection.client.config.client = 'postgres';
      await optimizer.configureConnectionPool();

      // Test MySQL config
      mockConnection.client.config.client = 'mysql';
      await optimizer.configureConnectionPool();

      // Test SQLite config
      mockConnection.client.config.client = 'sqlite';
      await optimizer.configureConnectionPool();

      expect(mockStrapi.log.info).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockConnection.raw.mockRejectedValue(new Error('Connection failed'));

      await expect(optimizer.createIndexes()).rejects.toThrow(
        'Failed to create database indexes'
      );
    });

    it('should handle query optimization errors', async () => {
      mockConnection.raw.mockRejectedValue(new Error('Query failed'));

      await expect(optimizer.optimizeQueries()).rejects.toThrow(
        'Failed to optimize queries'
      );
    });

    it('should handle connection pool configuration errors', async () => {
      mockConnection.client.pool = undefined;

      await expect(optimizer.configureConnectionPool()).rejects.toThrow(
        'Failed to configure connection pool'
      );
    });
  });
});