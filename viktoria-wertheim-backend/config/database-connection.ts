/**
 * Database Connection Management Utilities
 * Provides connection validation, health checks, and pooling management for PostgreSQL
 */

import { Pool, Client, PoolConfig, ClientConfig } from 'pg';

export interface DatabaseConnectionConfig {
  client: 'postgres' | 'sqlite';
  connection: PostgreSQLConnectionConfig | SQLiteConnectionConfig;
  pool?: PoolConfig;
  debug?: boolean;
}

export interface PostgreSQLConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
  ssl?: any;
  schema?: string;
  socketPath?: string;
}

export interface SQLiteConnectionConfig {
  filename: string;
}

export interface ConnectionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  connectionTime?: number;
}

export interface HealthCheckResult {
  isHealthy: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
  connectionCount?: number;
  poolStatus?: PoolStatus;
}

export interface PoolStatus {
  totalConnections: number;
  idleConnections: number;
  waitingClients: number;
}

/**
 * PostgreSQL Connection Validator
 * Validates connection parameters and tests actual connectivity
 */
export class PostgreSQLConnectionValidator {
  private config: PostgreSQLConnectionConfig;

  constructor(config: PostgreSQLConnectionConfig) {
    this.config = config;
  }

  /**
   * Validates PostgreSQL connection configuration
   */
  async validateConfiguration(): Promise<ConnectionValidationResult> {
    const result: ConnectionValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if using connection string or individual parameters
    const usingConnectionString = !!this.config.connectionString;
    const usingIndividualParams = !!(
      this.config.host && 
      this.config.database && 
      this.config.user && 
      this.config.password
    );

    if (!usingConnectionString && !usingIndividualParams) {
      result.errors.push(
        'PostgreSQL configuration incomplete. Either provide connectionString or all of: host, database, user, password'
      );
    }

    // Validate individual parameters if not using connection string
    if (!usingConnectionString) {
      if (!this.config.host) {
        result.errors.push('host is required for PostgreSQL connection');
      }

      if (!this.config.database) {
        result.errors.push('database is required for PostgreSQL connection');
      }

      if (!this.config.user) {
        result.errors.push('user is required for PostgreSQL connection');
      }

      if (!this.config.password) {
        result.errors.push('password is required for PostgreSQL connection');
      }

      // Validate port
      if (this.config.port && (this.config.port < 1 || this.config.port > 65535)) {
        result.errors.push('port must be between 1 and 65535');
      }
    }

    // Single-server deployment recommendations
    if (this.config.host && this.config.host !== 'localhost' && this.config.host !== '127.0.0.1') {
      result.warnings.push(
        'Host is not set to localhost. For single-server deployment, using localhost is recommended for better performance.'
      );
    }

    // SSL warnings for local connections
    if (this.config.ssl && (this.config.host === 'localhost' || this.config.host === '127.0.0.1')) {
      result.warnings.push(
        'SSL is enabled for localhost connection. This may not be necessary for local PostgreSQL instances.'
      );
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Tests actual database connectivity
   */
  async testConnection(): Promise<ConnectionValidationResult> {
    const result: ConnectionValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const startTime = Date.now();
    let client: Client | null = null;

    try {
      const clientConfig: ClientConfig = this.config.connectionString 
        ? { connectionString: this.config.connectionString }
        : {
            host: this.config.host,
            port: this.config.port || 5432,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            ssl: this.config.ssl
          };

      client = new Client(clientConfig);
      await client.connect();

      // Test basic query
      await client.query('SELECT 1');
      
      result.connectionTime = Date.now() - startTime;
      
      // Performance warning for slow connections
      if (result.connectionTime > 5000) {
        result.warnings.push(
          `Connection took ${result.connectionTime}ms. Consider optimizing database configuration for better performance.`
        );
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Connection failed: ${error.message}`);
    } finally {
      if (client) {
        try {
          await client.end();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }

    return result;
  }

  /**
   * Validates complete connection including configuration and connectivity
   */
  async validate(): Promise<ConnectionValidationResult> {
    const configResult = await this.validateConfiguration();
    
    if (!configResult.isValid) {
      return configResult;
    }

    const connectionResult = await this.testConnection();
    
    return {
      isValid: configResult.isValid && connectionResult.isValid,
      errors: [...configResult.errors, ...connectionResult.errors],
      warnings: [...configResult.warnings, ...connectionResult.warnings],
      connectionTime: connectionResult.connectionTime
    };
  }
}

/**
 * Database Health Check Service
 * Provides health monitoring for database connections and pools
 */
export class DatabaseHealthChecker {
  private pool: Pool | null = null;
  private config: PostgreSQLConnectionConfig;

  constructor(config: PostgreSQLConnectionConfig, pool?: Pool) {
    this.config = config;
    this.pool = pool;
  }

  /**
   * Performs a basic health check on the database
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const result: HealthCheckResult = {
      isHealthy: false,
      responseTime: 0,
      timestamp: new Date()
    };

    try {
      let client: Client | Pool;
      let shouldCloseClient = false;

      if (this.pool) {
        client = this.pool;
        result.poolStatus = this.getPoolStatus();
      } else {
        const clientConfig: ClientConfig = this.config.connectionString 
          ? { connectionString: this.config.connectionString }
          : {
              host: this.config.host,
              port: this.config.port || 5432,
              database: this.config.database,
              user: this.config.user,
              password: this.config.password,
              ssl: this.config.ssl
            };

        client = new Client(clientConfig);
        await (client as Client).connect();
        shouldCloseClient = true;
      }

      // Perform health check queries
      await client.query('SELECT 1');
      await client.query('SELECT NOW()');
      
      // Check database version and basic stats
      await client.query('SELECT version()');
      const statsResult = await client.query(`
        SELECT 
          count(*) as connection_count 
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      result.isHealthy = true;
      result.responseTime = Date.now() - startTime;
      result.connectionCount = parseInt(statsResult.rows[0].connection_count);

      if (shouldCloseClient) {
        await (client as Client).end();
      }

    } catch (error) {
      result.isHealthy = false;
      result.error = error.message;
      result.responseTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Gets current pool status if pool is available
   */
  private getPoolStatus(): PoolStatus | undefined {
    if (!this.pool) {
      return undefined;
    }

    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount
    };
  }

  /**
   * Performs an extended health check with additional diagnostics
   */
  async checkExtendedHealth(): Promise<HealthCheckResult & { diagnostics?: any }> {
    const basicHealth = await this.checkHealth();
    
    if (!basicHealth.isHealthy) {
      return basicHealth;
    }

    try {
      let client: Client | Pool = this.pool || new Client(
        this.config.connectionString 
          ? { connectionString: this.config.connectionString }
          : {
              host: this.config.host,
              port: this.config.port || 5432,
              database: this.config.database,
              user: this.config.user,
              password: this.config.password,
              ssl: this.config.ssl
            }
      );

      let shouldCloseClient = false;
      if (!this.pool) {
        await (client as Client).connect();
        shouldCloseClient = true;
      }

      // Extended diagnostics
      const diagnosticsQueries = await Promise.all([
        client.query('SELECT version()'),
        client.query('SELECT current_database(), current_user, inet_server_addr(), inet_server_port()'),
        client.query(`
          SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections,
            count(*) FILTER (WHERE state = 'idle') as idle_connections
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `),
        client.query(`
          SELECT 
            schemaname,
            tablename,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes
          FROM pg_stat_user_tables 
          ORDER BY (n_tup_ins + n_tup_upd + n_tup_del) DESC 
          LIMIT 5
        `)
      ]);

      const diagnostics = {
        version: diagnosticsQueries[0].rows[0].version,
        serverInfo: diagnosticsQueries[1].rows[0],
        connectionStats: diagnosticsQueries[2].rows[0],
        topTables: diagnosticsQueries[3].rows
      };

      if (shouldCloseClient) {
        await (client as Client).end();
      }

      return {
        ...basicHealth,
        diagnostics
      };

    } catch (error) {
      return {
        ...basicHealth,
        error: `Extended health check failed: ${error.message}`
      };
    }
  }
}

/**
 * Connection Pool Manager
 * Manages PostgreSQL connection pools with optimized settings for single-server deployment
 */
export class ConnectionPoolManager {
  private pool: Pool | null = null;
  private config: PostgreSQLConnectionConfig;
  private poolConfig: PoolConfig;

  constructor(config: PostgreSQLConnectionConfig, poolConfig?: Partial<PoolConfig>) {
    this.config = config;
    this.poolConfig = this.createOptimizedPoolConfig(poolConfig);
  }

  /**
   * Creates optimized pool configuration for single-server deployment
   */
  private createOptimizedPoolConfig(customConfig?: Partial<PoolConfig>): PoolConfig {
    const defaultConfig: PoolConfig = {
      // Connection limits optimized for single-server
      min: 2,
      max: 10,
      
      // Timeout settings (using correct pg Pool options)
      idleTimeoutMillis: 30000,
      
      // Connection configuration
      ...(this.config.connectionString 
        ? { connectionString: this.config.connectionString }
        : {
            host: this.config.host,
            port: this.config.port || 5432,
            database: this.config.database,
            user: this.config.user,
            password: this.config.password,
            ssl: this.config.ssl
          })
    };

    return { ...defaultConfig, ...customConfig };
  }

  /**
   * Initializes the connection pool
   */
  async initializePool(): Promise<void> {
    if (this.pool) {
      throw new Error('Pool is already initialized');
    }

    this.pool = new Pool(this.poolConfig);

    // Set up error handling
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    this.pool.on('connect', (client) => {
      console.log('New client connected to PostgreSQL pool');
    });

    this.pool.on('remove', (client) => {
      console.log('Client removed from PostgreSQL pool');
    });

    // Test the pool with a simple query
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ PostgreSQL connection pool initialized successfully');
    } catch (error) {
      await this.closePool();
      throw new Error(`Failed to initialize connection pool: ${error.message}`);
    }
  }

  /**
   * Gets the current pool instance
   */
  getPool(): Pool {
    if (!this.pool) {
      throw new Error('Pool is not initialized. Call initializePool() first.');
    }
    return this.pool;
  }

  /**
   * Gets pool statistics
   */
  getPoolStats(): PoolStatus {
    if (!this.pool) {
      throw new Error('Pool is not initialized');
    }

    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingClients: this.pool.waitingCount
    };
  }

  /**
   * Validates pool configuration
   */
  validatePoolConfig(): ConnectionValidationResult {
    const result: ConnectionValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (this.poolConfig.min !== undefined && this.poolConfig.min < 1) {
      result.errors.push('Pool minimum connections must be at least 1');
    }

    if (this.poolConfig.max !== undefined && this.poolConfig.min !== undefined && this.poolConfig.max < this.poolConfig.min) {
      result.errors.push('Pool maximum connections must be greater than or equal to minimum');
    }

    // Single-server deployment warnings
    if (this.poolConfig.max !== undefined && this.poolConfig.max > 15) {
      result.warnings.push(
        'Pool maximum connections is set to more than 15. For single-server deployment, consider reducing to 10-15 for optimal resource usage.'
      );
    }

    if (this.poolConfig.idleTimeoutMillis !== undefined && this.poolConfig.idleTimeoutMillis < 5000) {
      result.warnings.push(
        'Pool idle timeout is less than 5 seconds. This may cause connection issues under load.'
      );
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Closes the connection pool
   */
  async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('PostgreSQL connection pool closed');
    }
  }

  /**
   * Checks if pool is initialized
   */
  isInitialized(): boolean {
    return this.pool !== null;
  }
}

/**
 * Utility functions for database connection management
 */
export const DatabaseConnectionUtils = {
  /**
   * Creates a PostgreSQL connection validator
   */
  createValidator(config: PostgreSQLConnectionConfig): PostgreSQLConnectionValidator {
    return new PostgreSQLConnectionValidator(config);
  },

  /**
   * Creates a database health checker
   */
  createHealthChecker(config: PostgreSQLConnectionConfig, pool?: Pool): DatabaseHealthChecker {
    return new DatabaseHealthChecker(config, pool);
  },

  /**
   * Creates a connection pool manager
   */
  createPoolManager(config: PostgreSQLConnectionConfig, poolConfig?: Partial<PoolConfig>): ConnectionPoolManager {
    return new ConnectionPoolManager(config, poolConfig);
  },

  /**
   * Validates environment variables for database configuration
   */
  async validateEnvironmentConfig(env: any): Promise<ConnectionValidationResult> {
    const result: ConnectionValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const client = env('DATABASE_CLIENT', 'sqlite');
    
    if (client !== 'postgres' && client !== 'sqlite') {
      result.errors.push(`Unsupported database client: ${client}. Supported clients are: postgres, sqlite`);
    }

    if (client === 'postgres') {
      const config: PostgreSQLConnectionConfig = {
        host: env('DATABASE_HOST'),
        port: env.int('DATABASE_PORT'),
        database: env('DATABASE_NAME'),
        user: env('DATABASE_USERNAME'),
        password: env('DATABASE_PASSWORD'),
        connectionString: env('DATABASE_URL'),
        ssl: env.bool('DATABASE_SSL', false),
        schema: env('DATABASE_SCHEMA', 'public')
      };

      const validator = new PostgreSQLConnectionValidator(config);
      return await validator.validateConfiguration();
    }

    result.isValid = result.errors.length === 0;
    return result;
  }
};