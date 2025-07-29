/**
 * Database Connection Pool Configuration for Club Operations
 * 
 * Optimized connection pooling settings for improved performance
 * of club-related database operations.
 */

module.exports = {
  /**
   * Get optimized database configuration with connection pooling
   */
  getDatabaseConfig: (env = process.env.NODE_ENV) => {
    const baseConfig = {
      client: 'postgres',
      connection: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT) || 5432,
        database: process.env.DATABASE_NAME || 'viktoria_wertheim',
        user: process.env.DATABASE_USERNAME || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'password',
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      },
      debug: env === 'development',
      acquireConnectionTimeout: 60000,
      useNullAsDefault: true,
    };

    // Production optimizations
    if (env === 'production') {
      return {
        ...baseConfig,
        pool: {
          min: 2,
          max: 20,
          acquireTimeoutMillis: 60000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200,
          propagateCreateError: false
        },
        connection: {
          ...baseConfig.connection,
          // Connection-level optimizations
          options: {
            // Enable connection pooling at PostgreSQL level
            'application_name': 'viktoria_wertheim_app',
            'statement_timeout': '30s',
            'idle_in_transaction_session_timeout': '60s',
            'tcp_keepalives_idle': '600',
            'tcp_keepalives_interval': '30',
            'tcp_keepalives_count': '3'
          }
        }
      };
    }

    // Development optimizations
    if (env === 'development') {
      return {
        ...baseConfig,
        pool: {
          min: 1,
          max: 10,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 15000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200,
          propagateCreateError: true // Show errors in development
        }
      };
    }

    // Test environment optimizations
    if (env === 'test') {
      return {
        ...baseConfig,
        pool: {
          min: 1,
          max: 5,
          acquireTimeoutMillis: 10000,
          createTimeoutMillis: 5000,
          destroyTimeoutMillis: 2000,
          idleTimeoutMillis: 10000,
          reapIntervalMillis: 500,
          createRetryIntervalMillis: 100,
          propagateCreateError: true
        }
      };
    }

    return baseConfig;
  },

  /**
   * Get connection pool monitoring configuration
   */
  getPoolMonitoringConfig: () => ({
    // Enable pool monitoring
    afterCreate: (conn, done) => {
      console.log('📊 New database connection created');
      done(null, conn);
    },
    
    beforeDestroy: (conn, done) => {
      console.log('🔌 Database connection being destroyed');
      done();
    },
    
    // Pool event handlers
    onPoolCreate: (pool) => {
      console.log('🏊 Database connection pool created');
      
      // Monitor pool events
      pool.on('createSuccess', () => {
        console.log('✅ Connection created successfully');
      });
      
      pool.on('createFail', (err) => {
        console.error('❌ Connection creation failed:', err.message);
      });
      
      pool.on('destroySuccess', () => {
        console.log('🗑️  Connection destroyed successfully');
      });
      
      pool.on('destroyFail', (err) => {
        console.error('❌ Connection destruction failed:', err.message);
      });
      
      pool.on('poolDestroySuccess', () => {
        console.log('🏊 Connection pool destroyed successfully');
      });
    }
  }),

  /**
   * Get club-specific query optimization settings
   */
  getClubQueryOptimizations: () => ({
    // Prepared statement cache size
    preparedStatementCacheSize: 100,
    
    // Query timeout settings
    queryTimeout: 30000, // 30 seconds
    
    // Connection settings for club operations
    connectionSettings: {
      // Optimize for club queries
      'work_mem': '8MB',
      'effective_cache_size': '1GB',
      'random_page_cost': '1.1',
      'seq_page_cost': '1.0',
      'cpu_tuple_cost': '0.01',
      'cpu_index_tuple_cost': '0.005',
      'cpu_operator_cost': '0.0025',
      
      // Enable parallel queries for large datasets
      'max_parallel_workers_per_gather': '2',
      'parallel_tuple_cost': '0.1',
      'parallel_setup_cost': '1000',
      
      // Optimize for club statistics calculations
      'enable_hashjoin': 'on',
      'enable_mergejoin': 'on',
      'enable_nestloop': 'on',
      'enable_seqscan': 'on',
      'enable_indexscan': 'on',
      'enable_bitmapscan': 'on'
    }
  }),

  /**
   * Initialize connection pool with monitoring
   */
  initializePool: async (strapi) => {
    const env = process.env.NODE_ENV || 'development';
    const config = module.exports.getDatabaseConfig(env);
    const monitoring = module.exports.getPoolMonitoringConfig();
    
    console.log(`🚀 Initializing database connection pool for ${env} environment`);
    console.log(`📊 Pool settings: min=${config.pool?.min}, max=${config.pool?.max}`);
    
    try {
      // Apply monitoring if available
      if (strapi?.db?.connection?.pool) {
        const pool = strapi.db.connection.pool;
        
        // Log current pool status
        setInterval(() => {
          const poolInfo = {
            size: pool.size,
            available: pool.available,
            borrowed: pool.borrowed,
            invalid: pool.invalid,
            pending: pool.pending
          };
          
          console.log('📊 Pool status:', poolInfo);
          
          // Log to performance metrics if available
          if (strapi.db) {
            strapi.db.query('plugin::users-permissions.user').findMany({
              limit: 1
            }).then(() => {
              // Pool is healthy
            }).catch((err) => {
              console.error('❌ Pool health check failed:', err.message);
            });
          }
        }, 60000); // Every minute
      }
      
      console.log('✅ Database connection pool initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize connection pool:', error.message);
      throw error;
    }
  },

  /**
   * Get performance monitoring queries
   */
  getPerformanceQueries: () => ({
    poolStatus: `
      SELECT 
        state,
        COUNT(*) as connection_count
      FROM pg_stat_activity 
      WHERE datname = current_database()
      GROUP BY state
      ORDER BY state;
    `,
    
    slowQueries: `
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
      FROM pg_stat_statements 
      WHERE query LIKE '%club%' OR query LIKE '%spiel%' OR query LIKE '%tabellen%'
      ORDER BY mean_time DESC 
      LIMIT 10;
    `,
    
    indexUsage: `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      WHERE tablename IN ('clubs', 'spiele', 'tabellen_eintraege')
      ORDER BY idx_scan DESC;
    `,
    
    tableStats: `
      SELECT 
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_tup_ins,
        n_tup_upd,
        n_tup_del
      FROM pg_stat_user_tables 
      WHERE tablename IN ('clubs', 'spiele', 'tabellen_eintraege')
      ORDER BY tablename;
    `
  })
};