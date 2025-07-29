/**
 * Cache Manager Service
 * Implements Redis caching for calculated table data with cache invalidation and warming strategies
 * Requirements: 8.1, 8.2, 8.3
 */

export interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
  warmCache(): Promise<void>;
  getCacheStats(): Promise<CacheStats>;
  clearAll(): Promise<void>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalKeys: number;
  memoryUsage: number;
  uptime: number;
  evictions: number;
}

export interface CacheConfig {
  enabled: boolean;
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  defaultTtl: number;
  maxMemory: string;
  evictionPolicy: string;
}

export interface CacheKey {
  type: CacheKeyType;
  ligaId?: number;
  saisonId?: number;
  teamId?: number;
  additional?: string;
}

export enum CacheKeyType {
  TABLE_DATA = 'table',
  TEAM_STATS = 'team_stats',
  GAME_DATA = 'games',
  QUEUE_STATUS = 'queue',
  CALCULATION_RESULT = 'calc_result'
}

export interface CacheWarmingStrategy {
  priority: WarmingPriority;
  keys: string[];
  dataLoader: () => Promise<any>;
  ttl?: number;
}

export enum WarmingPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * Redis-based Cache Manager Implementation
 */
export class RedisCacheManager implements CacheManager {
  private redis: any;
  private strapi: any;
  private config: CacheConfig;
  private stats: CacheStats;
  private warmingStrategies: Map<string, CacheWarmingStrategy> = new Map();

  constructor(strapi: any, config: CacheConfig) {
    this.strapi = strapi;
    this.config = config;
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalKeys: 0,
      memoryUsage: 0,
      uptime: 0,
      evictions: 0
    };

    if (config.enabled) {
      this.initializeRedis();
      this.setupWarmingStrategies();
    }
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(): void {
    try {
      // Use ioredis for better performance and features
      const Redis = require('ioredis');
      
      this.redis = new Redis({
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        keyPrefix: this.config.keyPrefix,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        // Connection pool settings
        family: 4,
        connectTimeout: 10000,
        commandTimeout: 5000
      });

      this.redis.on('connect', () => {
        this.strapi.log.info('[CacheManager] Connected to Redis');
      });

      this.redis.on('error', (error: Error) => {
        this.strapi.log.error('[CacheManager] Redis connection error:', error);
      });

      this.redis.on('ready', () => {
        this.strapi.log.info('[CacheManager] Redis is ready');
        this.configureRedis();
      });

    } catch (error) {
      this.strapi?.log?.error('[CacheManager] Failed to initialize Redis:', error);
      this.config.enabled = false;
    }
  }

  /**
   * Configure Redis for optimal performance
   */
  private async configureRedis(): Promise<void> {
    try {
      // Set memory policy
      await this.redis.config('SET', 'maxmemory', this.config.maxMemory);
      await this.redis.config('SET', 'maxmemory-policy', this.config.evictionPolicy);
      
      // Enable keyspace notifications for cache invalidation
      await this.redis.config('SET', 'notify-keyspace-events', 'Ex');
      
      this.strapi.log.info('[CacheManager] Redis configured successfully');
    } catch (error) {
      this.strapi.log.warn('[CacheManager] Could not configure Redis:', error);
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.config.enabled || !this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      
      if (value !== null) {
        this.stats.hits++;
        this.updateHitRate();
        return JSON.parse(value);
      } else {
        this.stats.misses++;
        this.updateHitRate();
        return null;
      }
    } catch (error) {
      this.strapi.log.warn(`[CacheManager] Failed to get key ${key}:`, error);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      return;
    }

    try {
      const serializedValue = JSON.stringify(value);
      const cacheTtl = ttl || this.config.defaultTtl;
      
      await this.redis.setex(key, cacheTtl, serializedValue);
      
      this.strapi.log.debug(`[CacheManager] Cached key ${key} with TTL ${cacheTtl}s`);
    } catch (error) {
      this.strapi.log.warn(`[CacheManager] Failed to set key ${key}:`, error);
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      return;
    }

    try {
      await this.redis.del(key);
      this.strapi.log.debug(`[CacheManager] Deleted key ${key}`);
    } catch (error) {
      this.strapi.log.warn(`[CacheManager] Failed to delete key ${key}:`, error);
    }
  }

  /**
   * Invalidate cache keys matching pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      return;
    }

    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.strapi.log.info(`[CacheManager] Invalidated ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      this.strapi.log.warn(`[CacheManager] Failed to invalidate pattern ${pattern}:`, error);
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      return;
    }

    this.strapi.log.info('[CacheManager] Starting cache warming...');
    
    const startTime = Date.now();
    let warmedCount = 0;

    // Sort strategies by priority
    const sortedStrategies = Array.from(this.warmingStrategies.values())
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of sortedStrategies) {
      try {
        const data = await strategy.dataLoader();
        
        for (const key of strategy.keys) {
          await this.set(key, data, strategy.ttl);
          warmedCount++;
        }
      } catch (error) {
        this.strapi.log.warn(`[CacheManager] Failed to warm cache for strategy:`, error);
      }
    }

    const processingTime = Date.now() - startTime;
    this.strapi.log.info(`[CacheManager] Cache warming completed: ${warmedCount} keys in ${processingTime}ms`);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    if (!this.config.enabled || !this.redis) {
      return this.stats;
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      // Parse Redis info
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const evictionsMatch = info.match(/evicted_keys:(\d+)/);
      const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
      
      const keyspaceMatch = keyspace.match(/keys=(\d+)/);

      this.stats.memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
      this.stats.evictions = evictionsMatch ? parseInt(evictionsMatch[1]) : 0;
      this.stats.uptime = uptimeMatch ? parseInt(uptimeMatch[1]) : 0;
      this.stats.totalKeys = keyspaceMatch ? parseInt(keyspaceMatch[1]) : 0;

      return { ...this.stats };
    } catch (error) {
      this.strapi.log.warn('[CacheManager] Failed to get cache stats:', error);
      return this.stats;
    }
  }

  /**
   * Clear all cache data
   */
  async clearAll(): Promise<void> {
    if (!this.config.enabled || !this.redis) {
      return;
    }

    try {
      await this.redis.flushdb();
      this.strapi.log.info('[CacheManager] Cleared all cache data');
      
      // Reset stats
      this.stats.hits = 0;
      this.stats.misses = 0;
      this.stats.hitRate = 0;
    } catch (error) {
      this.strapi.log.error('[CacheManager] Failed to clear cache:', error);
    }
  }

  /**
   * Generate cache key from components
   */
  generateKey(cacheKey: CacheKey): string {
    const parts: string[] = [cacheKey.type];
    
    if (cacheKey.ligaId) parts.push(`liga:${cacheKey.ligaId}`);
    if (cacheKey.saisonId) parts.push(`saison:${cacheKey.saisonId}`);
    if (cacheKey.teamId) parts.push(`team:${cacheKey.teamId}`);
    if (cacheKey.additional) parts.push(cacheKey.additional);
    
    return parts.join(':');
  }

  /**
   * Invalidate table-related cache on data updates
   */
  async invalidateTableCache(ligaId: number, saisonId: number): Promise<void> {
    const patterns = [
      `${CacheKeyType.TABLE_DATA}:liga:${ligaId}:saison:${saisonId}*`,
      `${CacheKeyType.TEAM_STATS}:*:liga:${ligaId}:saison:${saisonId}*`,
      `${CacheKeyType.CALCULATION_RESULT}:liga:${ligaId}:saison:${saisonId}*`
    ];

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }

    this.strapi.log.info(`[CacheManager] Invalidated table cache for liga ${ligaId}, saison ${saisonId}`);
  }

  /**
   * Setup cache warming strategies
   */
  private setupWarmingStrategies(): void {
    // Strategy for current season tables
    this.warmingStrategies.set('current_tables', {
      priority: WarmingPriority.HIGH,
      keys: [], // Will be populated dynamically
      dataLoader: async () => {
        // Load current season table data
        return await this.loadCurrentSeasonTables();
      },
      ttl: 300 // 5 minutes
    });

    // Strategy for team statistics
    this.warmingStrategies.set('team_stats', {
      priority: WarmingPriority.MEDIUM,
      keys: [], // Will be populated dynamically
      dataLoader: async () => {
        // Load frequently accessed team stats
        return await this.loadPopularTeamStats();
      },
      ttl: 600 // 10 minutes
    });

    // Strategy for queue status
    this.warmingStrategies.set('queue_status', {
      priority: WarmingPriority.CRITICAL,
      keys: ['queue:status'],
      dataLoader: async () => {
        // Load queue status
        return await this.loadQueueStatus();
      },
      ttl: 30 // 30 seconds
    });
  }

  /**
   * Load current season table data for warming
   */
  private async loadCurrentSeasonTables(): Promise<any> {
    try {
      // Get current season
      const currentSaison = await this.strapi.entityService.findMany('api::saison.saison', {
        filters: { aktiv: true },
        limit: 1
      });

      if (currentSaison.length === 0) return null;

      // Get all active leagues
      const ligen = await this.strapi.entityService.findMany('api::liga.liga', {
        filters: { aktiv: true }
      });

      const tableData = {};
      
      for (const liga of ligen) {
        const key = this.generateKey({
          type: CacheKeyType.TABLE_DATA,
          ligaId: liga.id,
          saisonId: currentSaison[0].id
        });

        // Load table data
        const entries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
          filters: {
            liga: { id: liga.id },
            saison: { id: currentSaison[0].id }
          },
          populate: {
            team: true,
            liga: true
          },
          sort: 'platz:asc'
        });

        tableData[key] = entries;
      }

      return tableData;
    } catch (error) {
      this.strapi.log.warn('[CacheManager] Failed to load current season tables:', error);
      return null;
    }
  }

  /**
   * Load popular team statistics for warming
   */
  private async loadPopularTeamStats(): Promise<any> {
    try {
      // Get teams that have played recently
      const recentGames = await this.strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          datum: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        },
        populate: {
          heim_team: true,
          gast_team: true,
          liga: true,
          saison: true
        },
        limit: 50
      });

      const teamStats = {};
      const processedTeams = new Set();

      for (const game of recentGames) {
        for (const team of [game.heim_team, game.gast_team]) {
          const teamKey = `${team.id}-${game.liga.id}-${game.saison.id}`;
          
          if (!processedTeams.has(teamKey)) {
            const key = this.generateKey({
              type: CacheKeyType.TEAM_STATS,
              teamId: team.id,
              ligaId: game.liga.id,
              saisonId: game.saison.id
            });

            // This would normally call the table calculation service
            teamStats[key] = {
              teamId: team.id,
              ligaId: game.liga.id,
              saisonId: game.saison.id,
              // Stats would be calculated here
            };

            processedTeams.add(teamKey);
          }
        }
      }

      return teamStats;
    } catch (error) {
      this.strapi.log.warn('[CacheManager] Failed to load team stats:', error);
      return null;
    }
  }

  /**
   * Load queue status for warming
   */
  private async loadQueueStatus(): Promise<any> {
    try {
      // This would normally get queue status from queue manager
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        lastUpdated: new Date()
      };
    } catch (error) {
      this.strapi.log.warn('[CacheManager] Failed to load queue status:', error);
      return null;
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.strapi.log.info('[CacheManager] Redis connection closed');
    }
  }
}

/**
 * In-Memory Cache Manager for development/testing
 */
export class InMemoryCacheManager implements CacheManager {
  private cache: Map<string, { value: any; expires: number }> = new Map();
  private stats: CacheStats;
  private strapi: any;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.stats = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalKeys: 0,
      memoryUsage: 0,
      uptime: Date.now(),
      evictions: 0
    };

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (entry && entry.expires > Date.now()) {
      this.stats.hits++;
      this.updateHitRate();
      return entry.value;
    } else {
      if (entry) {
        this.cache.delete(key);
      }
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    const expires = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expires });
    this.stats.totalKeys = this.cache.size;
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
    this.stats.totalKeys = this.cache.size;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const keysToDelete = Array.from(this.cache.keys()).filter(key => regex.test(key));
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
    
    this.stats.totalKeys = this.cache.size;
  }

  async warmCache(): Promise<void> {
    // No-op for in-memory cache
  }

  async getCacheStats(): Promise<CacheStats> {
    this.stats.totalKeys = this.cache.size;
    this.stats.uptime = Date.now() - this.stats.uptime;
    return { ...this.stats };
  }

  async clearAll(): Promise<void> {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.hitRate = 0;
    this.stats.totalKeys = 0;
  }

  private cleanup(): void {
    const now = Date.now();
    let evicted = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires <= now) {
        this.cache.delete(key);
        evicted++;
      }
    }
    
    this.stats.evictions += evicted;
    this.stats.totalKeys = this.cache.size;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
}

/**
 * Factory function to create cache manager
 */
export function createCacheManager(strapi: any, config: CacheConfig): CacheManager {
  if (config.enabled && config.host) {
    return new RedisCacheManager(strapi, config);
  } else {
    return new InMemoryCacheManager(strapi);
  }
}

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: process.env.REDIS_ENABLED === 'true',
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'viktoria:',
  defaultTtl: 300, // 5 minutes
  maxMemory: '256mb',
  evictionPolicy: 'allkeys-lru'
};