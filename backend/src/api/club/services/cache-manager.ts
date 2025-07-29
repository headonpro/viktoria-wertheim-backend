/**
 * Club Cache Manager
 * 
 * Implements Redis-based caching for club data with intelligent
 * cache warming, invalidation strategies, and performance monitoring.
 */

import { Redis } from 'ioredis';
import type { Club } from '../../../../types/club';
import type { Liga } from '../../../../types/liga';

interface CacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };
  ttl: {
    club: number;
    clubList: number;
    statistics: number;
    viktoria: number;
  };
  warming: {
    enabled: boolean;
    interval: number;
    batchSize: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
  };
}

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  totalRequests: number;
  hitRate: number;
  lastReset: Date;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
  source: string;
}

export class ClubCacheManager {
  private redis: Redis;
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private warmingInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private strapi: any;

  constructor(strapi: any, config?: Partial<CacheConfig>) {
    this.strapi = strapi;
    this.config = this.getDefaultConfig(config);
    this.metrics = this.initializeMetrics();
    
    // Initialize Redis connection
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      keyPrefix: this.config.redis.keyPrefix,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.setupRedisEventHandlers();
    this.startCacheWarming();
    this.startMetricsCollection();
  }

  /**
   * Get default cache configuration
   */
  private getDefaultConfig(overrides?: Partial<CacheConfig>): CacheConfig {
    return {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB || '0'),
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'viktoria:club:',
        ...overrides?.redis
      },
      ttl: {
        club: parseInt(process.env.CACHE_TTL_CLUB || '3600'), // 1 hour
        clubList: parseInt(process.env.CACHE_TTL_CLUB_LIST || '1800'), // 30 minutes
        statistics: parseInt(process.env.CACHE_TTL_STATISTICS || '900'), // 15 minutes
        viktoria: parseInt(process.env.CACHE_TTL_VIKTORIA || '7200'), // 2 hours
        ...overrides?.ttl
      },
      warming: {
        enabled: process.env.CACHE_WARMING_ENABLED !== 'false',
        interval: parseInt(process.env.CACHE_WARMING_INTERVAL || '300000'), // 5 minutes
        batchSize: parseInt(process.env.CACHE_WARMING_BATCH_SIZE || '10'),
        ...overrides?.warming
      },
      monitoring: {
        enabled: process.env.CACHE_MONITORING_ENABLED !== 'false',
        metricsInterval: parseInt(process.env.CACHE_METRICS_INTERVAL || '60000'), // 1 minute
        ...overrides?.monitoring
      }
    };
  }

  /**
   * Initialize metrics tracking
   */
  private initializeMetrics(): CacheMetrics {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0,
      hitRate: 0,
      lastReset: new Date()
    };
  }

  /**
   * Setup Redis event handlers
   */
  private setupRedisEventHandlers(): void {
    this.redis.on('connect', () => {
      console.log('✅ Club cache Redis connected');
    });

    this.redis.on('error', (error) => {
      console.error('❌ Club cache Redis error:', error.message);
      this.metrics.errors++;
    });

    this.redis.on('close', () => {
      console.log('🔌 Club cache Redis connection closed');
    });

    this.redis.on('reconnecting', () => {
      console.log('🔄 Club cache Redis reconnecting...');
    });
  }

  /**
   * Generate cache key
   */
  private getCacheKey(type: string, identifier: string | number, suffix?: string): string {
    const key = `${type}:${identifier}`;
    return suffix ? `${key}:${suffix}` : key;
  }

  /**
   * Create cache entry with metadata
   */
  private createCacheEntry<T>(data: T, source: string = 'database'): CacheEntry<T> {
    return {
      data,
      timestamp: Date.now(),
      version: '1.0',
      source
    };
  }

  /**
   * Get club by ID with caching
   */
  async getClubById(clubId: number, options: { skipCache?: boolean } = {}): Promise<Club | null> {
    const cacheKey = this.getCacheKey('club', clubId);
    
    try {
      // Check cache first (unless skipping)
      if (!options.skipCache) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.metrics.hits++;
          this.metrics.totalRequests++;
          
          const entry: CacheEntry<Club> = JSON.parse(cached);
          console.log(`🎯 Cache hit for club ${clubId}`);
          return entry.data;
        }
      }

      this.metrics.misses++;
      this.metrics.totalRequests++;

      // Fetch from database
      const club = await this.strapi.entityService.findOne('api::club.club', clubId, {
        populate: ['logo', 'ligen']
      });

      if (club) {
        // Cache the result
        const entry = this.createCacheEntry(club);
        await this.redis.setex(cacheKey, this.config.ttl.club, JSON.stringify(entry));
        this.metrics.sets++;
        
        console.log(`💾 Cached club ${clubId} for ${this.config.ttl.club}s`);
      }

      return club;

    } catch (error) {
      console.error(`❌ Error getting club ${clubId}:`, error.message);
      this.metrics.errors++;
      
      // Fallback to database without caching
      try {
        return await this.strapi.entityService.findOne('api::club.club', clubId, {
          populate: ['logo', 'ligen']
        });
      } catch (dbError) {
        console.error(`❌ Database fallback failed for club ${clubId}:`, dbError.message);
        return null;
      }
    }
  }

  /**
   * Get clubs by liga with caching
   */
  async getClubsByLiga(ligaId: number, options: { skipCache?: boolean } = {}): Promise<Club[]> {
    const cacheKey = this.getCacheKey('liga_clubs', ligaId);
    
    try {
      // Check cache first
      if (!options.skipCache) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.metrics.hits++;
          this.metrics.totalRequests++;
          
          const entry: CacheEntry<Club[]> = JSON.parse(cached);
          console.log(`🎯 Cache hit for liga ${ligaId} clubs`);
          return entry.data;
        }
      }

      this.metrics.misses++;
      this.metrics.totalRequests++;

      // Fetch from database
      const clubs = await this.strapi.entityService.findMany('api::club.club', {
        filters: {
          ligen: { id: ligaId },
          aktiv: true
        },
        populate: ['logo'],
        sort: 'name:asc'
      });

      // Cache the result
      const entry = this.createCacheEntry(clubs);
      await this.redis.setex(cacheKey, this.config.ttl.clubList, JSON.stringify(entry));
      this.metrics.sets++;
      
      console.log(`💾 Cached ${clubs.length} clubs for liga ${ligaId}`);
      return clubs;

    } catch (error) {
      console.error(`❌ Error getting clubs for liga ${ligaId}:`, error.message);
      this.metrics.errors++;
      
      // Fallback to database
      try {
        return await this.strapi.entityService.findMany('api::club.club', {
          filters: {
            ligen: { id: ligaId },
            aktiv: true
          },
          populate: ['logo'],
          sort: 'name:asc'
        });
      } catch (dbError) {
        console.error(`❌ Database fallback failed for liga ${ligaId}:`, dbError.message);
        return [];
      }
    }
  }

  /**
   * Get Viktoria club by team mapping with caching
   */
  async getViktoriaClubByTeam(teamMapping: string, options: { skipCache?: boolean } = {}): Promise<Club | null> {
    const cacheKey = this.getCacheKey('viktoria_team', teamMapping);
    
    try {
      // Check cache first
      if (!options.skipCache) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.metrics.hits++;
          this.metrics.totalRequests++;
          
          const entry: CacheEntry<Club> = JSON.parse(cached);
          console.log(`🎯 Cache hit for viktoria team ${teamMapping}`);
          return entry.data;
        }
      }

      this.metrics.misses++;
      this.metrics.totalRequests++;

      // Fetch from database
      const club = await this.strapi.entityService.findMany('api::club.club', {
        filters: {
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: teamMapping,
          aktiv: true
        },
        populate: ['logo', 'ligen'],
        limit: 1
      });

      const result = club.length > 0 ? club[0] : null;

      if (result) {
        // Cache with longer TTL for viktoria clubs (they change less frequently)
        const entry = this.createCacheEntry(result);
        await this.redis.setex(cacheKey, this.config.ttl.viktoria, JSON.stringify(entry));
        this.metrics.sets++;
        
        console.log(`💾 Cached viktoria club for team ${teamMapping}`);
      }

      return result;

    } catch (error) {
      console.error(`❌ Error getting viktoria club for team ${teamMapping}:`, error.message);
      this.metrics.errors++;
      
      // Fallback to database
      try {
        const club = await this.strapi.entityService.findMany('api::club.club', {
          filters: {
            club_typ: 'viktoria_verein',
            viktoria_team_mapping: teamMapping,
            aktiv: true
          },
          populate: ['logo', 'ligen'],
          limit: 1
        });
        return club.length > 0 ? club[0] : null;
      } catch (dbError) {
        console.error(`❌ Database fallback failed for viktoria team ${teamMapping}:`, dbError.message);
        return null;
      }
    }
  }

  /**
   * Get club statistics with caching
   */
  async getClubStatistics(clubId: number, ligaId: number, options: { skipCache?: boolean } = {}): Promise<any> {
    const cacheKey = this.getCacheKey('club_stats', `${clubId}_${ligaId}`);
    
    try {
      // Check cache first
      if (!options.skipCache) {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          this.metrics.hits++;
          this.metrics.totalRequests++;
          
          const entry: CacheEntry<any> = JSON.parse(cached);
          console.log(`🎯 Cache hit for club ${clubId} stats in liga ${ligaId}`);
          return entry.data;
        }
      }

      this.metrics.misses++;
      this.metrics.totalRequests++;

      // Fetch from materialized view or calculate
      const stats = await this.strapi.db.connection.raw(`
        SELECT * FROM current_season_club_stats 
        WHERE club_id = ? AND liga_id = ?
      `, [clubId, ligaId]);

      const result = stats.rows.length > 0 ? stats.rows[0] : null;

      if (result) {
        // Cache with shorter TTL for statistics (they change more frequently)
        const entry = this.createCacheEntry(result, 'materialized_view');
        await this.redis.setex(cacheKey, this.config.ttl.statistics, JSON.stringify(entry));
        this.metrics.sets++;
        
        console.log(`💾 Cached statistics for club ${clubId} in liga ${ligaId}`);
      }

      return result;

    } catch (error) {
      console.error(`❌ Error getting club statistics:`, error.message);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Invalidate cache for specific club
   */
  async invalidateClub(clubId: number): Promise<void> {
    try {
      const patterns = [
        this.getCacheKey('club', clubId),
        this.getCacheKey('club_stats', `${clubId}_*`),
        this.getCacheKey('liga_clubs', '*') // Invalidate all liga club lists
      ];

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          // Use SCAN for pattern matching
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
            this.metrics.deletes += keys.length;
          }
        } else {
          await this.redis.del(pattern);
          this.metrics.deletes++;
        }
      }

      console.log(`🗑️  Invalidated cache for club ${clubId}`);

    } catch (error) {
      console.error(`❌ Error invalidating cache for club ${clubId}:`, error.message);
      this.metrics.errors++;
    }
  }

  /**
   * Invalidate cache for liga
   */
  async invalidateLiga(ligaId: number): Promise<void> {
    try {
      const patterns = [
        this.getCacheKey('liga_clubs', ligaId),
        this.getCacheKey('club_stats', `*_${ligaId}`)
      ];

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
            this.metrics.deletes += keys.length;
          }
        } else {
          await this.redis.del(pattern);
          this.metrics.deletes++;
        }
      }

      console.log(`🗑️  Invalidated cache for liga ${ligaId}`);

    } catch (error) {
      console.error(`❌ Error invalidating cache for liga ${ligaId}:`, error.message);
      this.metrics.errors++;
    }
  }

  /**
   * Clear all club cache
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await this.redis.keys('*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.metrics.deletes += keys.length;
      }
      
      console.log(`🗑️  Cleared all club cache (${keys.length} keys)`);

    } catch (error) {
      console.error('❌ Error clearing all cache:', error.message);
      this.metrics.errors++;
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(): Promise<void> {
    if (!this.config.warming.enabled) {
      return;
    }

    console.log('🔥 Starting cache warming...');

    try {
      // Warm viktoria clubs
      const viktoriaTeams = ['team_1', 'team_2', 'team_3'];
      for (const team of viktoriaTeams) {
        await this.getViktoriaClubByTeam(team, { skipCache: true });
      }

      // Warm active clubs by liga
      const ligen = await this.strapi.entityService.findMany('api::liga.liga', {
        filters: { aktiv: true },
        limit: this.config.warming.batchSize
      });

      for (const liga of ligen) {
        await this.getClubsByLiga(liga.id, { skipCache: true });
      }

      // Warm individual club data for active clubs
      const clubs = await this.strapi.entityService.findMany('api::club.club', {
        filters: { aktiv: true },
        limit: this.config.warming.batchSize,
        fields: ['id']
      });

      for (const club of clubs) {
        await this.getClubById(club.id, { skipCache: true });
      }

      console.log(`🔥 Cache warming completed: ${viktoriaTeams.length} viktoria clubs, ${ligen.length} liga lists, ${clubs.length} individual clubs`);

    } catch (error) {
      console.error('❌ Error during cache warming:', error.message);
      this.metrics.errors++;
    }
  }

  /**
   * Start automatic cache warming
   */
  private startCacheWarming(): void {
    if (!this.config.warming.enabled) {
      return;
    }

    // Initial warming after a short delay
    setTimeout(() => {
      this.warmCache();
    }, 5000);

    // Periodic warming
    this.warmingInterval = setInterval(() => {
      this.warmCache();
    }, this.config.warming.interval);

    console.log(`🔥 Cache warming started (interval: ${this.config.warming.interval}ms)`);
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    if (!this.config.monitoring.enabled) {
      return;
    }

    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.metricsInterval);

    console.log(`📊 Cache metrics collection started (interval: ${this.config.monitoring.metricsInterval}ms)`);
  }

  /**
   * Collect and log cache metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // Calculate hit rate
      this.metrics.hitRate = this.metrics.totalRequests > 0 
        ? (this.metrics.hits / this.metrics.totalRequests) * 100 
        : 0;

      // Get Redis info
      const redisInfo = await this.redis.info('memory');
      const memoryUsage = this.parseRedisMemoryInfo(redisInfo);

      // Log metrics
      console.log('📊 Club Cache Metrics:', {
        hitRate: `${this.metrics.hitRate.toFixed(2)}%`,
        hits: this.metrics.hits,
        misses: this.metrics.misses,
        totalRequests: this.metrics.totalRequests,
        sets: this.metrics.sets,
        deletes: this.metrics.deletes,
        errors: this.metrics.errors,
        memoryUsage: memoryUsage
      });

      // Log to database if available
      if (this.strapi?.db) {
        await this.strapi.db.connection.raw(`
          SELECT log_performance_metric(?, ?, '%', ?::jsonb);
        `, [
          'club_cache_hit_rate',
          this.metrics.hitRate,
          JSON.stringify({
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            total_requests: this.metrics.totalRequests,
            memory_usage: memoryUsage
          })
        ]);
      }

    } catch (error) {
      console.error('❌ Error collecting cache metrics:', error.message);
      this.metrics.errors++;
    }
  }

  /**
   * Parse Redis memory info
   */
  private parseRedisMemoryInfo(info: string): string {
    const lines = info.split('\r\n');
    const memoryLine = lines.find(line => line.startsWith('used_memory_human:'));
    return memoryLine ? memoryLine.split(':')[1] : 'unknown';
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset cache metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    console.log('📊 Cache metrics reset');
  }

  /**
   * Get cache health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    redis: boolean;
    hitRate: number;
    errors: number;
    uptime: number;
  }> {
    try {
      // Test Redis connection
      const pong = await this.redis.ping();
      const redisHealthy = pong === 'PONG';

      const uptime = Date.now() - this.metrics.lastReset.getTime();
      const hitRate = this.metrics.hitRate;
      const errors = this.metrics.errors;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

      if (!redisHealthy || errors > 100) {
        status = 'unhealthy';
      } else if (hitRate < 50 || errors > 10) {
        status = 'degraded';
      }

      return {
        status,
        redis: redisHealthy,
        hitRate,
        errors,
        uptime
      };

    } catch (error) {
      console.error('❌ Error checking cache health:', error.message);
      return {
        status: 'unhealthy',
        redis: false,
        hitRate: 0,
        errors: this.metrics.errors + 1,
        uptime: Date.now() - this.metrics.lastReset.getTime()
      };
    }
  }

  /**
   * Cleanup and close connections
   */
  async destroy(): Promise<void> {
    console.log('🔌 Shutting down club cache manager...');

    // Clear intervals
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
    }
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Close Redis connection
    await this.redis.quit();
    
    console.log('✅ Club cache manager shut down successfully');
  }
}