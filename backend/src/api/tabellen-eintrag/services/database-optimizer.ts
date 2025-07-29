/**
 * Database Optimizer Service
 * Handles database performance optimizations including indexes, query optimization, and connection pooling
 * Requirements: 8.1, 8.2
 */

export interface DatabaseOptimizer {
  createIndexes(): Promise<void>;
  optimizeQueries(): Promise<void>;
  configureConnectionPool(): Promise<void>;
  analyzeQueryPerformance(): Promise<QueryPerformanceReport>;
  getConnectionPoolStatus(): Promise<ConnectionPoolStatus>;
}

export interface QueryPerformanceReport {
  slowQueries: SlowQuery[];
  indexUsage: IndexUsageStats[];
  connectionStats: ConnectionStats;
  recommendations: OptimizationRecommendation[];
  timestamp: Date;
}

export interface SlowQuery {
  query: string;
  executionTime: number;
  frequency: number;
  lastExecuted: Date;
  suggestedOptimization?: string;
}

export interface IndexUsageStats {
  tableName: string;
  indexName: string;
  usageCount: number;
  lastUsed: Date;
  effectiveness: number; // 0-100 score
}

export interface ConnectionStats {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  averageConnectionTime: number;
  connectionErrors: number;
}

export interface ConnectionPoolStatus {
  size: number;
  used: number;
  waiting: number;
  maxSize: number;
  minSize: number;
  acquireTimeoutMillis: number;
  createTimeoutMillis: number;
  idleTimeoutMillis: number;
}

export interface OptimizationRecommendation {
  type: OptimizationType;
  priority: RecommendationPriority;
  description: string;
  impact: string;
  implementation: string;
}

export enum OptimizationType {
  INDEX_CREATION = 'index_creation',
  QUERY_OPTIMIZATION = 'query_optimization',
  CONNECTION_TUNING = 'connection_tuning',
  SCHEMA_OPTIMIZATION = 'schema_optimization'
}

export enum RecommendationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Implementation of Database Optimizer Service
 */
export class DatabaseOptimizerImpl implements DatabaseOptimizer {
  private strapi: any;
  private db: any;
  private queryPerformanceCache: Map<string, SlowQuery> = new Map();
  private indexCreationStatus: Map<string, boolean> = new Map();

  constructor(strapi: any) {
    this.strapi = strapi;
    this.db = strapi?.db || null;
  }

  /**
   * Create database indexes for frequently queried fields
   * Requirements: 8.1, 8.2
   */
  async createIndexes(): Promise<void> {
    try {
      const startTime = Date.now();
      this.strapi.log.info('[DatabaseOptimizer] Starting index creation...');

      // Get database client type
      const client = this.db.connection.client.config.client;
      
      // Define indexes based on query patterns from table calculation service
      const indexes = this.getRequiredIndexes(client);

      let createdCount = 0;
      let skippedCount = 0;

      for (const index of indexes) {
        try {
          const exists = await this.indexExists(index.tableName, index.indexName);
          
          if (!exists) {
            await this.createIndex(index);
            this.indexCreationStatus.set(index.indexName, true);
            createdCount++;
            this.strapi.log.info(`[DatabaseOptimizer] Created index: ${index.indexName} on ${index.tableName}`);
          } else {
            skippedCount++;
            this.strapi.log.debug(`[DatabaseOptimizer] Index already exists: ${index.indexName}`);
          }
        } catch (error) {
          this.strapi.log.error(`[DatabaseOptimizer] Failed to create index ${index.indexName}:`, error);
          this.indexCreationStatus.set(index.indexName, false);
        }
      }

      const processingTime = Date.now() - startTime;
      this.strapi.log.info(`[DatabaseOptimizer] Index creation completed in ${processingTime}ms. Created: ${createdCount}, Skipped: ${skippedCount}`);
    } catch (error) {
      this.strapi.log.error('[DatabaseOptimizer] Index creation failed:', error);
      throw new Error(`Failed to create database indexes: ${error.message}`);
    }
  }

  /**
   * Optimize database queries for better performance
   * Requirements: 8.1, 8.2
   */
  async optimizeQueries(): Promise<void> {
    try {
      this.strapi.log.info('[DatabaseOptimizer] Starting query optimization...');

      // Enable query logging for performance monitoring
      await this.enableQueryLogging();

      // Optimize connection settings
      await this.optimizeConnectionSettings();

      // Set up query performance monitoring
      this.setupQueryPerformanceMonitoring();

      this.strapi.log.info('[DatabaseOptimizer] Query optimization completed');
    } catch (error) {
      this.strapi.log.error('[DatabaseOptimizer] Query optimization failed:', error);
      throw new Error(`Failed to optimize queries: ${error.message}`);
    }
  }

  /**
   * Configure connection pool for optimal performance
   * Requirements: 8.1, 8.2
   */
  async configureConnectionPool(): Promise<void> {
    try {
      this.strapi.log.info('[DatabaseOptimizer] Configuring connection pool...');

      const client = this.db.connection.client.config.client;
      const optimizedConfig = this.getOptimizedPoolConfig(client);

      // Apply optimized pool configuration
      if (this.db.connection.client.pool) {
        // Update existing pool configuration
        Object.assign(this.db.connection.client.pool.config, optimizedConfig);
        this.strapi.log.info('[DatabaseOptimizer] Connection pool configuration updated:', optimizedConfig);
      }

      // Set up connection pool monitoring
      this.setupConnectionPoolMonitoring();

      this.strapi.log.info('[DatabaseOptimizer] Connection pool configuration completed');
    } catch (error) {
      this.strapi.log.error('[DatabaseOptimizer] Connection pool configuration failed:', error);
      throw new Error(`Failed to configure connection pool: ${error.message}`);
    }
  }

  /**
   * Analyze query performance and provide recommendations
   */
  async analyzeQueryPerformance(): Promise<QueryPerformanceReport> {
    try {
      const slowQueries = Array.from(this.queryPerformanceCache.values())
        .filter(query => query.executionTime > 1000) // Queries taking more than 1 second
        .sort((a, b) => b.executionTime - a.executionTime)
        .slice(0, 10); // Top 10 slowest queries

      const indexUsage = await this.getIndexUsageStats();
      const connectionStats = await this.getConnectionStats();
      const recommendations = this.generateOptimizationRecommendations(slowQueries, indexUsage, connectionStats);

      return {
        slowQueries,
        indexUsage,
        connectionStats,
        recommendations,
        timestamp: new Date()
      };
    } catch (error) {
      this.strapi.log.error('[DatabaseOptimizer] Query performance analysis failed:', error);
      throw new Error(`Failed to analyze query performance: ${error.message}`);
    }
  }

  /**
   * Get current connection pool status
   */
  async getConnectionPoolStatus(): Promise<ConnectionPoolStatus> {
    try {
      const pool = this.db.connection.client.pool;
      
      if (!pool) {
        throw new Error('Connection pool not available');
      }

      return {
        size: pool.numUsed() + pool.numFree(),
        used: pool.numUsed(),
        waiting: pool.numPendingAcquires(),
        maxSize: pool.max,
        minSize: pool.min,
        acquireTimeoutMillis: pool.acquireTimeoutMillis,
        createTimeoutMillis: pool.createTimeoutMillis,
        idleTimeoutMillis: pool.idleTimeoutMillis
      };
    } catch (error) {
      this.strapi.log.error('[DatabaseOptimizer] Failed to get connection pool status:', error);
      throw new Error(`Failed to get connection pool status: ${error.message}`);
    }
  }

  /**
   * Get required indexes based on query patterns
   */
  private getRequiredIndexes(client: string): DatabaseIndex[] {
    const indexes: DatabaseIndex[] = [
      // Spiele table indexes for frequent queries
      {
        tableName: 'spiele',
        indexName: 'idx_spiele_liga_saison_status',
        columns: ['liga_id', 'saison_id', 'status'],
        type: 'btree',
        unique: false
      },
      {
        tableName: 'spiele',
        indexName: 'idx_spiele_teams',
        columns: ['heim_team_id', 'gast_team_id'],
        type: 'btree',
        unique: false
      },
      {
        tableName: 'spiele',
        indexName: 'idx_spiele_datum',
        columns: ['datum'],
        type: 'btree',
        unique: false
      },
      {
        tableName: 'spiele',
        indexName: 'idx_spiele_spieltag',
        columns: ['spieltag', 'liga_id', 'saison_id'],
        type: 'btree',
        unique: false
      },

      // Tabellen-eintraege table indexes
      {
        tableName: 'tabellen_eintraege',
        indexName: 'idx_tabellen_liga_saison',
        columns: ['liga_id', 'saison_id'],
        type: 'btree',
        unique: false
      },
      {
        tableName: 'tabellen_eintraege',
        indexName: 'idx_tabellen_team_liga',
        columns: ['team_id', 'liga_id'],
        type: 'btree',
        unique: false
      },
      {
        tableName: 'tabellen_eintraege',
        indexName: 'idx_tabellen_platz',
        columns: ['platz', 'liga_id', 'saison_id'],
        type: 'btree',
        unique: false
      },
      {
        tableName: 'tabellen_eintraege',
        indexName: 'idx_tabellen_punkte',
        columns: ['punkte', 'tordifferenz', 'tore_fuer'],
        type: 'btree',
        unique: false
      },

      // Teams table indexes
      {
        tableName: 'teams',
        indexName: 'idx_teams_name',
        columns: ['name'],
        type: 'btree',
        unique: false
      },

      // Ligen table indexes
      {
        tableName: 'ligen',
        indexName: 'idx_ligen_name',
        columns: ['name'],
        type: 'btree',
        unique: false
      },

      // Queue jobs table indexes (if exists)
      {
        tableName: 'queue_jobs',
        indexName: 'idx_queue_status_priority',
        columns: ['status', 'priority', 'created_at'],
        type: 'btree',
        unique: false
      }
    ];

    // Add database-specific optimizations
    if (client === 'postgres') {
      indexes.push({
        tableName: 'spiele',
        indexName: 'idx_spiele_tore_gin',
        columns: ['heim_tore', 'gast_tore'],
        type: 'gin',
        unique: false,
        condition: 'WHERE status = \'beendet\' AND heim_tore IS NOT NULL AND gast_tore IS NOT NULL'
      });
    }

    return indexes;
  }

  /**
   * Check if an index exists
   */
  private async indexExists(tableName: string, indexName: string): Promise<boolean> {
    try {
      const client = this.db.connection.client.config.client;
      
      let query: string;
      let params: any[];

      switch (client) {
        case 'postgres':
          query = `
            SELECT 1 FROM pg_indexes 
            WHERE tablename = ? AND indexname = ?
          `;
          params = [tableName, indexName];
          break;
        case 'mysql':
          query = `
            SELECT 1 FROM information_schema.statistics 
            WHERE table_name = ? AND index_name = ?
          `;
          params = [tableName, indexName];
          break;
        case 'sqlite':
          query = `
            SELECT 1 FROM sqlite_master 
            WHERE type = 'index' AND name = ?
          `;
          params = [indexName];
          break;
        default:
          return false;
      }

      const result = await this.db.connection.raw(query, params);
      return result.rows ? result.rows.length > 0 : result.length > 0;
    } catch (error) {
      this.strapi.log.warn(`[DatabaseOptimizer] Could not check if index exists: ${indexName}`, error);
      return false;
    }
  }

  /**
   * Create a database index
   */
  private async createIndex(index: DatabaseIndex): Promise<void> {
    const client = this.db.connection.client.config.client;
    
    let sql: string;
    const columnsStr = index.columns.join(', ');

    switch (client) {
      case 'postgres':
        sql = `CREATE INDEX ${index.unique ? 'UNIQUE ' : ''}${index.indexName} ON ${index.tableName} USING ${index.type || 'btree'} (${columnsStr})`;
        if (index.condition) {
          sql += ` ${index.condition}`;
        }
        break;
      case 'mysql':
        sql = `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.indexName} ON ${index.tableName} (${columnsStr})`;
        break;
      case 'sqlite':
        sql = `CREATE ${index.unique ? 'UNIQUE ' : ''}INDEX ${index.indexName} ON ${index.tableName} (${columnsStr})`;
        break;
      default:
        throw new Error(`Unsupported database client: ${client}`);
    }

    await this.db.connection.raw(sql);
  }

  /**
   * Enable query logging for performance monitoring
   */
  private async enableQueryLogging(): Promise<void> {
    const client = this.db.connection.client.config.client;

    // Enable slow query logging based on database type
    try {
      switch (client) {
        case 'postgres':
          await this.db.connection.raw("SET log_min_duration_statement = 1000"); // Log queries > 1s
          break;
        case 'mysql':
          await this.db.connection.raw("SET GLOBAL slow_query_log = 'ON'");
          await this.db.connection.raw("SET GLOBAL long_query_time = 1");
          break;
        // SQLite doesn't have built-in slow query logging
      }
    } catch (error) {
      this.strapi.log.warn('[DatabaseOptimizer] Could not enable query logging:', error);
    }
  }

  /**
   * Optimize connection settings
   */
  private async optimizeConnectionSettings(): Promise<void> {
    const client = this.db.connection.client.config.client;

    try {
      switch (client) {
        case 'postgres':
          // Optimize PostgreSQL settings
          await this.db.connection.raw("SET work_mem = '16MB'");
          await this.db.connection.raw("SET shared_buffers = '256MB'");
          await this.db.connection.raw("SET effective_cache_size = '1GB'");
          break;
        case 'mysql':
          // Optimize MySQL settings
          await this.db.connection.raw("SET SESSION query_cache_type = ON");
          await this.db.connection.raw("SET SESSION query_cache_size = 67108864"); // 64MB
          break;
      }
    } catch (error) {
      this.strapi.log.warn('[DatabaseOptimizer] Could not optimize connection settings:', error);
    }
  }

  /**
   * Set up query performance monitoring
   */
  private setupQueryPerformanceMonitoring(): void {
    // Hook into Strapi's database query events if available
    if (this.db.connection.client.on) {
      this.db.connection.client.on('query', (query: any) => {
        const startTime = Date.now();
        
        query.on('end', () => {
          const executionTime = Date.now() - startTime;
          
          if (executionTime > 500) { // Track queries taking more than 500ms
            const queryKey = this.normalizeQuery(query.sql);
            const existing = this.queryPerformanceCache.get(queryKey);
            
            if (existing) {
              existing.frequency++;
              existing.executionTime = Math.max(existing.executionTime, executionTime);
              existing.lastExecuted = new Date();
            } else {
              this.queryPerformanceCache.set(queryKey, {
                query: query.sql,
                executionTime,
                frequency: 1,
                lastExecuted: new Date()
              });
            }
          }
        });
      });
    }
  }

  /**
   * Set up connection pool monitoring
   */
  private setupConnectionPoolMonitoring(): void {
    const pool = this.db.connection.client.pool;
    
    if (pool) {
      // Monitor pool events
      pool.on('acquireRequest', () => {
        this.strapi.log.debug('[DatabaseOptimizer] Connection acquire requested');
      });

      pool.on('acquireSuccess', () => {
        this.strapi.log.debug('[DatabaseOptimizer] Connection acquired successfully');
      });

      pool.on('acquireFail', (err: Error) => {
        this.strapi.log.warn('[DatabaseOptimizer] Connection acquire failed:', err);
      });

      pool.on('createRequest', () => {
        this.strapi.log.debug('[DatabaseOptimizer] New connection creation requested');
      });

      pool.on('createSuccess', () => {
        this.strapi.log.debug('[DatabaseOptimizer] New connection created successfully');
      });

      pool.on('createFail', (err: Error) => {
        this.strapi.log.warn('[DatabaseOptimizer] Connection creation failed:', err);
      });
    }
  }

  /**
   * Get optimized pool configuration based on database client
   */
  private getOptimizedPoolConfig(client: string): any {
    const baseConfig = {
      min: 2,
      max: 20,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200
    };

    switch (client) {
      case 'postgres':
        return {
          ...baseConfig,
          max: 25, // PostgreSQL can handle more connections
          acquireTimeoutMillis: 60000
        };
      case 'mysql':
        return {
          ...baseConfig,
          max: 15, // MySQL typically has lower connection limits
          acquireTimeoutMillis: 45000
        };
      case 'sqlite':
        return {
          ...baseConfig,
          max: 1, // SQLite only supports one writer
          min: 1
        };
      default:
        return baseConfig;
    }
  }

  /**
   * Get index usage statistics
   */
  private async getIndexUsageStats(): Promise<IndexUsageStats[]> {
    try {
      const client = this.db.connection.client.config.client;
      const stats: IndexUsageStats[] = [];

      switch (client) {
        case 'postgres':
          const pgResult = await this.db.connection.raw(`
            SELECT 
              schemaname,
              tablename,
              indexname,
              idx_tup_read,
              idx_tup_fetch
            FROM pg_stat_user_indexes
            ORDER BY idx_tup_read DESC
          `);
          
          for (const row of pgResult.rows) {
            stats.push({
              tableName: row.tablename,
              indexName: row.indexname,
              usageCount: row.idx_tup_read,
              lastUsed: new Date(), // PostgreSQL doesn't track last used time
              effectiveness: this.calculateIndexEffectiveness(row.idx_tup_read, row.idx_tup_fetch)
            });
          }
          break;
        
        case 'mysql':
          const mysqlResult = await this.db.connection.raw(`
            SELECT 
              TABLE_NAME,
              INDEX_NAME,
              CARDINALITY
            FROM information_schema.statistics
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY CARDINALITY DESC
          `);
          
          for (const row of mysqlResult[0]) {
            stats.push({
              tableName: row.TABLE_NAME,
              indexName: row.INDEX_NAME,
              usageCount: row.CARDINALITY || 0,
              lastUsed: new Date(),
              effectiveness: row.CARDINALITY > 1000 ? 80 : 50
            });
          }
          break;
      }

      return stats;
    } catch (error) {
      this.strapi.log.warn('[DatabaseOptimizer] Could not get index usage stats:', error);
      return [];
    }
  }

  /**
   * Get connection statistics
   */
  private async getConnectionStats(): Promise<ConnectionStats> {
    try {
      const poolStatus = await this.getConnectionPoolStatus();
      
      return {
        activeConnections: poolStatus.used,
        idleConnections: poolStatus.size - poolStatus.used,
        totalConnections: poolStatus.size,
        averageConnectionTime: 0, // Would need more detailed monitoring
        connectionErrors: 0 // Would need error tracking
      };
    } catch (error) {
      this.strapi.log.warn('[DatabaseOptimizer] Could not get connection stats:', error);
      return {
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0,
        averageConnectionTime: 0,
        connectionErrors: 0
      };
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    slowQueries: SlowQuery[],
    indexUsage: IndexUsageStats[],
    connectionStats: ConnectionStats
  ): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze slow queries
    for (const query of slowQueries.slice(0, 5)) { // Top 5 slowest
      if (query.executionTime > 5000) {
        recommendations.push({
          type: OptimizationType.QUERY_OPTIMIZATION,
          priority: RecommendationPriority.HIGH,
          description: `Query taking ${query.executionTime}ms should be optimized`,
          impact: 'High performance impact on table calculations',
          implementation: 'Review query structure, add appropriate indexes, or optimize joins'
        });
      }
    }

    // Analyze index usage
    const unusedIndexes = indexUsage.filter(idx => idx.usageCount < 10);
    if (unusedIndexes.length > 0) {
      recommendations.push({
        type: OptimizationType.INDEX_CREATION,
        priority: RecommendationPriority.MEDIUM,
        description: `${unusedIndexes.length} indexes appear to be unused`,
        impact: 'Storage overhead without performance benefit',
        implementation: 'Consider dropping unused indexes or reviewing query patterns'
      });
    }

    // Analyze connection pool
    if (connectionStats.activeConnections / connectionStats.totalConnections > 0.8) {
      recommendations.push({
        type: OptimizationType.CONNECTION_TUNING,
        priority: RecommendationPriority.HIGH,
        description: 'Connection pool utilization is high',
        impact: 'May cause connection timeouts during peak load',
        implementation: 'Increase connection pool size or optimize query execution time'
      });
    }

    return recommendations;
  }

  /**
   * Calculate index effectiveness score
   */
  private calculateIndexEffectiveness(tupRead: number, tupFetch: number): number {
    if (tupRead === 0) return 0;
    const ratio = tupFetch / tupRead;
    return Math.min(100, Math.max(0, ratio * 100));
  }

  /**
   * Normalize query for performance tracking
   */
  private normalizeQuery(sql: string): string {
    return sql
      .replace(/\$\d+/g, '?') // Replace PostgreSQL parameters
      .replace(/\d+/g, 'N') // Replace numbers
      .replace(/'[^']*'/g, "'X'") // Replace string literals
      .trim();
  }
}

export interface DatabaseIndex {
  tableName: string;
  indexName: string;
  columns: string[];
  type?: string;
  unique: boolean;
  condition?: string;
}

/**
 * Factory function to create database optimizer
 */
export function createDatabaseOptimizer(strapi: any): DatabaseOptimizer {
  return new DatabaseOptimizerImpl(strapi);
}