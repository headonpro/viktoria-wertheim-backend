import path from 'path';

export default ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');
  const nodeEnv = env('NODE_ENV', 'development');

  // Optimized connection pool settings based on environment
  const getOptimizedPoolConfig = (environment: string) => {
    switch (environment) {
      case 'production':
        return {
          min: env.int('DATABASE_POOL_MIN', 5),
          max: env.int('DATABASE_POOL_MAX', 25),
          acquireTimeoutMillis: 60000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200,
          propagateCreateError: false
        };
      case 'test':
        return {
          min: env.int('DATABASE_POOL_MIN', 1),
          max: env.int('DATABASE_POOL_MAX', 5),
          acquireTimeoutMillis: 10000,
          createTimeoutMillis: 5000,
          destroyTimeoutMillis: 2000,
          idleTimeoutMillis: 10000,
          reapIntervalMillis: 500,
          createRetryIntervalMillis: 100,
          propagateCreateError: true
        };
      default: // development
        return {
          min: env.int('DATABASE_POOL_MIN', 2),
          max: env.int('DATABASE_POOL_MAX', 15),
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 15000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200,
          propagateCreateError: true
        };
    }
  };

  const connections = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: getOptimizedPoolConfig(nodeEnv),
    },
    postgres: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false),
        schema: env('DATABASE_SCHEMA', 'public'),
        // Connection-level optimizations for club operations
        application_name: 'viktoria_wertheim_app',
        statement_timeout: 30000,
        idle_in_transaction_session_timeout: 60000,
      },
      pool: getOptimizedPoolConfig(nodeEnv),
      debug: env.bool('DATABASE_DEBUG', false),
      // Enable query logging for performance monitoring in development
      ...(nodeEnv === 'development' && {
        log: {
          warn(message) {
            console.warn('🔶 Database Warning:', message);
          },
          error(message) {
            console.error('❌ Database Error:', message);
          },
          deprecate(message) {
            console.warn('⚠️  Database Deprecation:', message);
          },
          debug(message) {
            if (env.bool('DATABASE_DEBUG_VERBOSE', false)) {
              console.log('🔍 Database Debug:', message);
            }
          }
        }
      })
    },
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
      pool: getOptimizedPoolConfig(nodeEnv),
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
      useNullAsDefault: true,
    },
  };
};
