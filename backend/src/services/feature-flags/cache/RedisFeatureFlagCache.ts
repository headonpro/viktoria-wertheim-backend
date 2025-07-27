/**
 * Redis Feature Flag Cache
 * 
 * Implements feature flag caching using Redis for high-performance
 * distributed caching across multiple application instances.
 * 
 * Requirements: 6.2, 3.1
 */

import { FeatureFlagCache } from '../FeatureFlagService';

/**
 * Redis client interface (compatible with ioredis and node_redis)
 */
interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  flushall(): Promise<string>;
  keys(pattern: string): Promise<string[]>;
  ttl(key: string): Promise<number>;
}

/**
 * Redis feature flag cache implementation
 */
export class RedisFeatureFlagCache implements FeatureFlagCache {
  private redis: RedisClient;
  private strapi: any;
  private keyPrefix: string;
  private defaultTtlSeconds: number;

  constructor(
    redis: RedisClient,
    strapi: any,
    options: {
      keyPrefix?: string;
      defaultTtlSeconds?: number;
    } = {}
  ) {
    this.redis = redis;
    this.strapi = strapi;
    this.keyPrefix = options.keyPrefix || 'feature_flags:';
    this.defaultTtlSeconds = options.defaultTtlSeconds || 300; // 5 minutes

    this.logInfo('RedisFeatureFlagCache initialized', {
      keyPrefix: this.keyPrefix,
      defaultTtlSeconds: this.defaultTtlSeconds
    });
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<any> {
    try {
      const redisKey = this.buildKey(key);
      const value = await this.redis.get(redisKey);
      
      if (value === null) {
        return null;
      }

      const parsed = JSON.parse(value);
      this.logDebug(`Cache hit for key: ${key}`);
      return parsed;

    } catch (error) {
      this.logError(`Error getting from cache: ${key}`, error);
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key: string, value: any, ttlMs?: number): Promise<void> {
    try {
      const redisKey = this.buildKey(key);
      const serialized = JSON.stringify(value);
      const ttlSeconds = ttlMs ? Math.ceil(ttlMs / 1000) : this.defaultTtlSeconds;

      await this.redis.setex(redisKey, ttlSeconds, serialized);
      this.logDebug(`Cache set for key: ${key}, TTL: ${ttlSeconds}s`);

    } catch (error) {
      this.logError(`Error setting cache: ${key}`, error);
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const redisKey = this.buildKey(key);
      await this.redis.del(redisKey);
      this.logDebug(`Cache deleted for key: ${key}`);

    } catch (error) {
      this.logError(`Error deleting from cache: ${key}`, error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        // Delete keys in batches to avoid blocking Redis
        const batchSize = 100;
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize);
          await Promise.all(batch.map(key => this.redis.del(key)));
        }
      }

      this.logInfo(`Cache cleared: ${keys.length} keys deleted`);

    } catch (error) {
      this.logError('Error clearing cache', error);
      throw error;
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const redisKey = this.buildKey(key);
      const exists = await this.redis.exists(redisKey);
      return exists === 1;

    } catch (error) {
      this.logError(`Error checking cache existence: ${key}`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async getTtl(key: string): Promise<number> {
    try {
      const redisKey = this.buildKey(key);
      const ttl = await this.redis.ttl(redisKey);
      return ttl;

    } catch (error) {
      this.logError(`Error getting TTL: ${key}`, error);
      return -1;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    keysByPattern: Record<string, number>;
    avgTtl: number;
  }> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      // Group keys by pattern
      const keysByPattern: Record<string, number> = {};
      let totalTtl = 0;
      let ttlCount = 0;

      for (const key of keys) {
        // Extract pattern from key
        const patternMatch = key.replace(this.keyPrefix, '').split(':')[0];
        keysByPattern[patternMatch] = (keysByPattern[patternMatch] || 0) + 1;

        // Get TTL for average calculation
        try {
          const ttl = await this.redis.ttl(key);
          if (ttl > 0) {
            totalTtl += ttl;
            ttlCount++;
          }
        } catch {
          // Ignore TTL errors for individual keys
        }
      }

      return {
        totalKeys: keys.length,
        keysByPattern,
        avgTtl: ttlCount > 0 ? Math.round(totalTtl / ttlCount) : 0
      };

    } catch (error) {
      this.logError('Error getting cache stats', error);
      return {
        totalKeys: 0,
        keysByPattern: {},
        avgTtl: 0
      };
    }
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const searchPattern = `${this.keyPrefix}${pattern}*`;
      const keys = await this.redis.keys(searchPattern);
      
      if (keys.length === 0) {
        return 0;
      }

      // Delete keys in batches
      const batchSize = 100;
      let deletedCount = 0;
      
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(key => this.redis.del(key)));
        deletedCount += results.reduce((sum, result) => sum + result, 0);
      }

      this.logInfo(`Invalidated ${deletedCount} cache entries matching pattern: ${pattern}`);
      return deletedCount;

    } catch (error) {
      this.logError(`Error invalidating cache pattern: ${pattern}`, error);
      return 0;
    }
  }

  /**
   * Warm up cache with feature flags
   */
  async warmUp(flags: Array<{ name: string; data: any }>): Promise<void> {
    try {
      const operations = flags.map(async ({ name, data }) => {
        try {
          await this.set(name, data);
        } catch (error) {
          this.logError(`Error warming up cache for flag: ${name}`, error);
        }
      });

      await Promise.all(operations);
      this.logInfo(`Cache warmed up with ${flags.length} feature flags`);

    } catch (error) {
      this.logError('Error warming up cache', error);
    }
  }

  /**
   * Build Redis key with prefix
   */
  private buildKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[RedisFeatureFlagCache] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[RedisFeatureFlagCache] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[RedisFeatureFlagCache] ${message}`, error);
  }
}

/**
 * Create Redis cache with connection handling
 */
export function createRedisFeatureFlagCache(
  redisConfig: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
    url?: string;
  },
  strapi: any,
  options?: {
    keyPrefix?: string;
    defaultTtlSeconds?: number;
  }
): RedisFeatureFlagCache {
  // This would typically use ioredis or node_redis
  // For now, we'll create a mock implementation
  const mockRedis: RedisClient = {
    async get(key: string): Promise<string | null> {
      // Mock implementation - would connect to actual Redis
      return null;
    },
    async set(key: string, value: string, mode?: string, duration?: number): Promise<string | null> {
      return 'OK';
    },
    async setex(key: string, seconds: number, value: string): Promise<string> {
      return 'OK';
    },
    async del(key: string): Promise<number> {
      return 1;
    },
    async exists(key: string): Promise<number> {
      return 0;
    },
    async flushall(): Promise<string> {
      return 'OK';
    },
    async keys(pattern: string): Promise<string[]> {
      return [];
    },
    async ttl(key: string): Promise<number> {
      return -1;
    }
  };

  return new RedisFeatureFlagCache(mockRedis, strapi, options);
}

export default RedisFeatureFlagCache;