/**
 * Redis Configuration for Club Caching
 * 
 * Provides Redis connection configuration and setup for
 * club-specific caching operations.
 */

import { Redis, RedisOptions } from 'ioredis';

interface RedisConfig {
  connection: RedisOptions;
  clusters?: {
    enabled: boolean;
    nodes: Array<{ host: string; port: number }>;
  };
  sentinel?: {
    enabled: boolean;
    sentinels: Array<{ host: string; port: number }>;
    name: string;
  };
  monitoring: {
    enabled: boolean;
    slowLogThreshold: number;
  };
}

/**
 * Get Redis configuration based on environment
 */
export function getRedisConfig(env = process.env.NODE_ENV): RedisConfig {
  const baseConfig: RedisConfig = {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'viktoria:',
      
      // Connection settings
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      
      // Keep-alive settings
      keepAlive: 30000,
      
      // Family preference (IPv4)
      family: 4,
      
      // Connection name for monitoring
      connectionName: `viktoria_club_cache_${env}`,
    },
    monitoring: {
      enabled: process.env.REDIS_MONITORING_ENABLED !== 'false',
      slowLogThreshold: parseInt(process.env.REDIS_SLOW_LOG_THRESHOLD || '100')
    }
  };

  // Environment-specific configurations
  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        connection: {
          ...baseConfig.connection,
          // Production optimizations
          connectTimeout: 5000,
          commandTimeout: 5000,
          maxRetriesPerRequest: 5,
          
          // Production-specific settings
          
          // Production-specific settings
          enableOfflineQueue: false,
          lazyConnect: true,
        },
        // Enable cluster support if configured
        clusters: {
          enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
          nodes: process.env.REDIS_CLUSTER_NODES 
            ? JSON.parse(process.env.REDIS_CLUSTER_NODES)
            : []
        },
        // Enable sentinel support if configured
        sentinel: {
          enabled: process.env.REDIS_SENTINEL_ENABLED === 'true',
          sentinels: process.env.REDIS_SENTINELS 
            ? JSON.parse(process.env.REDIS_SENTINELS)
            : [],
          name: process.env.REDIS_SENTINEL_NAME || 'mymaster'
        }
      };

    case 'test':
      return {
        ...baseConfig,
        connection: {
          ...baseConfig.connection,
          // Test environment settings
          db: parseInt(process.env.REDIS_TEST_DB || '15'), // Use separate DB for tests
          connectTimeout: 2000,
          commandTimeout: 1000,
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        },
        monitoring: {
          enabled: false, // Disable monitoring in tests
          slowLogThreshold: 1000
        }
      };

    case 'development':
    default:
      return {
        ...baseConfig,
        connection: {
          ...baseConfig.connection,
          // Development settings
          connectTimeout: 10000,
          commandTimeout: 10000,
          showFriendlyErrorStack: true,
          enableOfflineQueue: true,
        }
      };
  }
}

/**
 * Create Redis client with proper configuration
 */
export function createRedisClient(config?: Partial<RedisConfig>): Redis {
  const redisConfig = getRedisConfig();
  const finalConfig = config ? { ...redisConfig, ...config } : redisConfig;

  let redis: Redis;

  // Create client based on configuration
  if (finalConfig.clusters?.enabled && finalConfig.clusters.nodes.length > 0) {
    // Cluster mode
    const { Cluster } = require('ioredis');
    redis = new Cluster(finalConfig.clusters.nodes, {
      redisOptions: finalConfig.connection,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
    });
    console.log('🔗 Redis cluster client created');
    
  } else if (finalConfig.sentinel?.enabled && finalConfig.sentinel.sentinels.length > 0) {
    // Sentinel mode
    redis = new Redis({
      ...finalConfig.connection,
      sentinels: finalConfig.sentinel.sentinels,
      name: finalConfig.sentinel.name,
    });
    console.log('🛡️  Redis sentinel client created');
    
  } else {
    // Standard single-instance mode
    redis = new Redis(finalConfig.connection);
    console.log('📡 Redis client created');
  }

  // Setup event handlers
  setupRedisEventHandlers(redis, finalConfig);

  return redis;
}

/**
 * Setup Redis event handlers for monitoring and logging
 */
function setupRedisEventHandlers(redis: Redis, config: RedisConfig): void {
  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });

  redis.on('ready', () => {
    console.log('🚀 Redis ready for operations');
  });

  redis.on('error', (error) => {
    console.error('❌ Redis error:', error.message);
    
    // Log critical errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      console.error('🚨 Redis connection issue - check Redis server status');
    }
  });

  redis.on('close', () => {
    console.log('🔌 Redis connection closed');
  });

  redis.on('reconnecting', (delay) => {
    console.log(`🔄 Redis reconnecting in ${delay}ms...`);
  });

  redis.on('end', () => {
    console.log('🔚 Redis connection ended');
  });

  // Monitor slow commands if enabled
  if (config.monitoring.enabled) {
    redis.on('monitor', (time, args, source, database) => {
      const command = args.join(' ');
      if (command.length > 100) {
        console.warn(`🐌 Slow Redis command detected: ${command.substring(0, 100)}...`);
      }
    });
  }
}

/**
 * Test Redis connection
 */
export async function testRedisConnection(redis: Redis): Promise<boolean> {
  try {
    const start = Date.now();
    const pong = await redis.ping();
    const duration = Date.now() - start;
    
    if (pong === 'PONG') {
      console.log(`✅ Redis connection test successful (${duration}ms)`);
      return true;
    } else {
      console.error('❌ Redis connection test failed - unexpected response:', pong);
      return false;
    }
  } catch (error) {
    console.error('❌ Redis connection test failed:', error.message);
    return false;
  }
}

/**
 * Get Redis info and statistics
 */
export async function getRedisInfo(redis: Redis): Promise<{
  version: string;
  memory: string;
  clients: number;
  keyspace: any;
  stats: any;
}> {
  try {
    const info = await redis.info();
    const lines = info.split('\r\n');
    
    const parseInfo = (section: string) => {
      const sectionStart = lines.findIndex(line => line === `# ${section}`);
      if (sectionStart === -1) return {};
      
      const result: any = {};
      for (let i = sectionStart + 1; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('#') || line === '') break;
        
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = isNaN(Number(value)) ? value : Number(value);
        }
      }
      return result;
    };

    const server = parseInfo('Server');
    const memory = parseInfo('Memory');
    const clients = parseInfo('Clients');
    const keyspace = parseInfo('Keyspace');
    const stats = parseInfo('Stats');

    return {
      version: server.redis_version || 'unknown',
      memory: memory.used_memory_human || 'unknown',
      clients: clients.connected_clients || 0,
      keyspace,
      stats
    };
  } catch (error) {
    console.error('❌ Error getting Redis info:', error.message);
    return {
      version: 'unknown',
      memory: 'unknown',
      clients: 0,
      keyspace: {},
      stats: {}
    };
  }
}

/**
 * Setup Redis health check endpoint data
 */
export async function getRedisHealthCheck(redis: Redis): Promise<{
  status: 'healthy' | 'unhealthy';
  latency: number;
  memory: string;
  connections: number;
  uptime: number;
  version: string;
}> {
  try {
    const start = Date.now();
    const pong = await redis.ping();
    const latency = Date.now() - start;
    
    if (pong !== 'PONG') {
      return {
        status: 'unhealthy',
        latency: -1,
        memory: 'unknown',
        connections: 0,
        uptime: 0,
        version: 'unknown'
      };
    }

    const info = await getRedisInfo(redis);
    
    return {
      status: 'healthy',
      latency,
      memory: info.memory,
      connections: info.clients,
      uptime: info.stats.uptime_in_seconds || 0,
      version: info.version
    };
    
  } catch (error) {
    console.error('❌ Redis health check failed:', error.message);
    return {
      status: 'unhealthy',
      latency: -1,
      memory: 'unknown',
      connections: 0,
      uptime: 0,
      version: 'unknown'
    };
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedisConnection(redis: Redis): Promise<void> {
  try {
    console.log('🔌 Closing Redis connection...');
    await redis.quit();
    console.log('✅ Redis connection closed successfully');
  } catch (error) {
    console.error('❌ Error closing Redis connection:', error.message);
    // Force disconnect if graceful close fails
    redis.disconnect();
  }
}