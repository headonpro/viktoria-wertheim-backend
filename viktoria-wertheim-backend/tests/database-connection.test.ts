/**
 * Unit Tests for Database Connection Management Utilities
 */

import { 
  PostgreSQLConnectionValidator,
  DatabaseHealthChecker,
  ConnectionPoolManager,
  DatabaseConnectionUtils,
  PostgreSQLConnectionConfig,
  ConnectionValidationResult,
  HealthCheckResult
} from '../config/database-connection';

// Create mock objects
const mockClient = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn()
};

const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn(),
  totalCount: 5,
  idleCount: 3,
  waitingCount: 0,
  on: jest.fn()
};

// Mock pg module
jest.mock('pg', () => ({
  Client: jest.fn(() => mockClient),
  Pool: jest.fn(() => mockPool)
}));

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  mockClient.connect.mockReset();
  mockClient.query.mockReset();
  mockClient.end.mockReset();
  mockPool.connect.mockReset();
  mockPool.query.mockReset();
  mockPool.end.mockReset();
  mockPool.on.mockReset();
});

describe('PostgreSQLConnectionValidator', () => {
  describe('validateConfiguration', () => {
    it('should validate complete individual parameters configuration', async () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const validator = new PostgreSQLConnectionValidator(config);
      const result = await validator.validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate connection string configuration', async () => {
      const config: PostgreSQLConnectionConfig = {
        connectionString: 'postgresql://user:password@localhost:5432/database'
      };

      const validator = new PostgreSQLConnectionValidator(config);
      const result = await validator.validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with incomplete configuration', async () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        database: 'test_db'
        // Missing user and password
      };

      const validator = new PostgreSQLConnectionValidator(config);
      const result = await validator.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('user is required for PostgreSQL connection');
      expect(result.errors).toContain('password is required for PostgreSQL connection');
    });

    it('should fail validation with invalid port', async () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 70000, // Invalid port
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const validator = new PostgreSQLConnectionValidator(config);
      const result = await validator.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('port must be between 1 and 65535');
    });

    it('should warn about non-localhost host for single-server deployment', async () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'remote-server.com',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const validator = new PostgreSQLConnectionValidator(config);
      const result = await validator.validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Host is not set to localhost. For single-server deployment, using localhost is recommended for better performance.'
      );
    });

    it('should warn about SSL for localhost connections', async () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password',
        ssl: true
      };

      const validator = new PostgreSQLConnectionValidator(config);
      const result = await validator.validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'SSL is enabled for localhost connection. This may not be necessary for local PostgreSQL instances.'
      );
    });
  });

  describe('testConnection', () => {
    it('should successfully test connection', async () => {
      const { Client } = require('pg');
      const mockClient = new Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
      mockClient.end.mockResolvedValue(undefined);

      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const validator = new PostgreSQLConnectionValidator(config);
      const result = await validator.testConnection();

      expect(result.isValid).toBe(true);
      expect(result.connectionTime).toBeDefined();
      expect(mockClient.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockClient.end).toHaveBeenCalled();
    });

    it('should handle connection failure', async () => {
      const { Client } = require('pg');
      const mockClient = new Client();
      mockClient.connect.mockRejectedValue(new Error('Connection refused'));

      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const validator = new PostgreSQLConnectionValidator(config);
      const result = await validator.testConnection();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Connection failed: Connection refused');
    });

    it('should warn about slow connections', async () => {
      const { Client } = require('pg');
      const mockClient = new Client();
      
      // Mock slow connection
      mockClient.connect.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 6000))
      );
      mockClient.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });
      mockClient.end.mockResolvedValue(undefined);

      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const validator = new PostgreSQLConnectionValidator(config);
      const result = await validator.testConnection();

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('Connection took'))).toBe(true);
    });
  });
});

describe('DatabaseHealthChecker', () => {
  describe('checkHealth', () => {
    it('should perform successful health check without pool', async () => {
      const { Client } = require('pg');
      const mockClient = new Client();
      
      // Add a small delay to ensure responseTime > 0
      mockClient.connect.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1))
      );
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({ rows: [{ now: new Date() }] })
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 13.0' }] })
        .mockResolvedValueOnce({ rows: [{ connection_count: '5' }] });
      mockClient.end.mockResolvedValue(undefined);

      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const healthChecker = new DatabaseHealthChecker(config);
      const result = await healthChecker.checkHealth();

      expect(result.isHealthy).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
      expect(result.connectionCount).toBe(5);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle health check failure', async () => {
      const { Client } = require('pg');
      const mockClient = new Client();
      
      // Add a small delay to ensure responseTime > 0
      mockClient.connect.mockImplementation(() => 
        new Promise((resolve, reject) => setTimeout(() => reject(new Error('Database unavailable')), 1))
      );

      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const healthChecker = new DatabaseHealthChecker(config);
      const result = await healthChecker.checkHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('Database unavailable');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should perform health check with pool', async () => {
      const { Pool } = require('pg');
      const mockPool = new Pool();
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({ rows: [{ now: new Date() }] })
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 13.0' }] })
        .mockResolvedValueOnce({ rows: [{ connection_count: '3' }] });

      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const healthChecker = new DatabaseHealthChecker(config, mockPool);
      const result = await healthChecker.checkHealth();

      expect(result.isHealthy).toBe(true);
      expect(result.poolStatus).toEqual({
        totalConnections: 5,
        idleConnections: 3,
        waitingClients: 0
      });
    });
  });

  describe('checkExtendedHealth', () => {
    it('should perform extended health check with diagnostics', async () => {
      const { Client } = require('pg');
      const mockClient = new Client();
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ '?column?': 1 }] })
        .mockResolvedValueOnce({ rows: [{ now: new Date() }] })
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 13.0' }] })
        .mockResolvedValueOnce({ rows: [{ connection_count: '5' }] })
        .mockResolvedValueOnce({ rows: [{ version: 'PostgreSQL 13.0 on x86_64' }] })
        .mockResolvedValueOnce({ rows: [{ current_database: 'test_db', current_user: 'test_user' }] })
        .mockResolvedValueOnce({ rows: [{ total_connections: '5', active_connections: '2', idle_connections: '3' }] })
        .mockResolvedValueOnce({ rows: [{ schemaname: 'public', tablename: 'users', inserts: '100' }] });
      mockClient.end.mockResolvedValue(undefined);

      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const healthChecker = new DatabaseHealthChecker(config);
      const result = await healthChecker.checkExtendedHealth();

      expect(result.isHealthy).toBe(true);
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics.version).toBe('PostgreSQL 13.0 on x86_64');
    });
  });
});

describe('ConnectionPoolManager', () => {
  describe('initializePool', () => {
    it('should initialize pool successfully', async () => {
      const mockPoolClient = { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockPoolClient);

      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const poolManager = new ConnectionPoolManager(config);
      await poolManager.initializePool();

      expect(poolManager.isInitialized()).toBe(true);
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockPoolClient.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockPoolClient.release).toHaveBeenCalled();
    });

    it('should handle pool initialization failure', async () => {
      mockPool.connect.mockRejectedValue(new Error('Pool connection failed'));

      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const poolManager = new ConnectionPoolManager(config);
      
      await expect(poolManager.initializePool()).rejects.toThrow('Failed to initialize connection pool: Pool connection failed');
      expect(poolManager.isInitialized()).toBe(false);
    });

    it('should throw error if pool is already initialized', async () => {
      const mockPoolClient = { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockPoolClient);

      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const poolManager = new ConnectionPoolManager(config);
      await poolManager.initializePool();

      await expect(poolManager.initializePool()).rejects.toThrow('Pool is already initialized');
    });
  });

  describe('validatePoolConfig', () => {
    it('should validate correct pool configuration', () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const poolManager = new ConnectionPoolManager(config, { min: 2, max: 10 });
      const result = poolManager.validatePoolConfig();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation with invalid pool configuration', () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const poolManager = new ConnectionPoolManager(config, { min: 0, max: 5 });
      const result = poolManager.validatePoolConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pool minimum connections must be at least 1');
    });

    it('should fail validation when max < min', () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const poolManager = new ConnectionPoolManager(config, { min: 10, max: 5 });
      const result = poolManager.validatePoolConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pool maximum connections must be greater than or equal to minimum');
    });

    it('should warn about high connection count for single-server deployment', () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const poolManager = new ConnectionPoolManager(config, { min: 2, max: 20 });
      const result = poolManager.validatePoolConfig();

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        'Pool maximum connections is set to more than 15. For single-server deployment, consider reducing to 10-15 for optimal resource usage.'
      );
    });
  });

  describe('getPoolStats', () => {
    it('should return pool statistics', async () => {
      const mockPoolClient = { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockPoolClient);

      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const poolManager = new ConnectionPoolManager(config);
      await poolManager.initializePool();

      const stats = poolManager.getPoolStats();

      expect(stats).toEqual({
        totalConnections: 5,
        idleConnections: 3,
        waitingClients: 0
      });
    });

    it('should throw error if pool is not initialized', () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const poolManager = new ConnectionPoolManager(config);

      expect(() => poolManager.getPoolStats()).toThrow('Pool is not initialized');
    });
  });

  describe('closePool', () => {
    it('should close pool successfully', async () => {
      const mockPoolClient = { query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }), release: jest.fn() };
      mockPool.connect.mockResolvedValue(mockPoolClient);
      mockPool.end.mockResolvedValue(undefined);

      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        port: 5432,
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const poolManager = new ConnectionPoolManager(config);
      await poolManager.initializePool();
      await poolManager.closePool();

      expect(poolManager.isInitialized()).toBe(false);
      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});

describe('DatabaseConnectionUtils', () => {
  describe('validateEnvironmentConfig', () => {
    it('should validate PostgreSQL environment configuration', async () => {
      const mockEnv: any = jest.fn((key, defaultValue) => {
        const values = {
          'DATABASE_CLIENT': 'postgres',
          'DATABASE_HOST': 'localhost',
          'DATABASE_NAME': 'test_db',
          'DATABASE_USERNAME': 'test_user',
          'DATABASE_PASSWORD': 'test_password'
        };
        return values[key] || defaultValue;
      });
      mockEnv.int = jest.fn((key, defaultValue) => {
        const values = {
          'DATABASE_PORT': 5432
        };
        return values[key] || defaultValue;
      });
      mockEnv.bool = jest.fn((key, defaultValue) => {
        const values = {
          'DATABASE_SSL': false
        };
        return values[key] || defaultValue;
      });

      const result = await DatabaseConnectionUtils.validateEnvironmentConfig(mockEnv);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for unsupported database client', async () => {
      const mockEnv: any = jest.fn((key, defaultValue) => {
        const values = {
          'DATABASE_CLIENT': 'mysql'
        };
        return values[key] || defaultValue;
      });

      const result = await DatabaseConnectionUtils.validateEnvironmentConfig(mockEnv);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unsupported database client: mysql. Supported clients are: postgres, sqlite');
    });
  });

  describe('factory methods', () => {
    it('should create validator', () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const validator = DatabaseConnectionUtils.createValidator(config);
      expect(validator).toBeInstanceOf(PostgreSQLConnectionValidator);
    });

    it('should create health checker', () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const healthChecker = DatabaseConnectionUtils.createHealthChecker(config);
      expect(healthChecker).toBeInstanceOf(DatabaseHealthChecker);
    });

    it('should create pool manager', () => {
      const config: PostgreSQLConnectionConfig = {
        host: 'localhost',
        database: 'test_db',
        user: 'test_user',
        password: 'test_password'
      };

      const poolManager = DatabaseConnectionUtils.createPoolManager(config);
      expect(poolManager).toBeInstanceOf(ConnectionPoolManager);
    });
  });
});