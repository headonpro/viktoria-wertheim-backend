/**
 * Caching utilities for complex queries
 * Implements in-memory caching with TTL and cache invalidation strategies
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

class QueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0
  };
  
  private cleanupInterval: NodeJS.Timeout;
  
  constructor(private defaultTTL: number = 300000) { // 5 minutes default
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }
  
  /**
   * Get cached data
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size--;
      return null;
    }
    
    this.stats.hits++;
    return entry.data;
  }
  
  /**
   * Set cached data
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      key
    };
    
    if (!this.cache.has(key)) {
      this.stats.size++;
    }
    
    this.cache.set(key, entry);
    this.stats.sets++;
  }
  
  /**
   * Delete cached data
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size--;
    }
    return deleted;
  }
  
  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0
    };
  }
  
  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }
  
  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.stats.size--;
    });
  }
  
  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.stats.deletes++;
      this.stats.size--;
    });
    
    return keysToDelete.length;
  }
  
  /**
   * Get or set cached data with a factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }
    
    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }
  
  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Cache key generators
export const CacheKeys = {
  leagueTable: (ligaId: number) => `league_table:${ligaId}`,
  leagueStandings: (ligaId: number) => `league_standings:${ligaId}`,
  playerStats: (playerId: number, saisonId?: number) => 
    `player_stats:${playerId}${saisonId ? `:${saisonId}` : ''}`,
  teamPlayerStats: (teamId: number, saisonId?: number) => 
    `team_player_stats:${teamId}${saisonId ? `:${saisonId}` : ''}`,
  seasonPlayerStats: (saisonId: number, sortBy: string, limit: number) => 
    `season_player_stats:${saisonId}:${sortBy}:${limit}`,
  topScorers: (saisonId: number, limit: number) => 
    `top_scorers:${saisonId}:${limit}`,
  matchTimeline: (matchId: number) => `match_timeline:${matchId}`,
  matchEvents: (matchId: number) => `match_events:${matchId}`,
  recentMatches: (teamId: number, limit: number) => 
    `recent_matches:${teamId}:${limit}`,
  upcomingMatches: (teamId: number, limit: number) => 
    `upcoming_matches:${teamId}:${limit}`,
  teamRoster: (teamId: number, saisonId?: number) => 
    `team_roster:${teamId}${saisonId ? `:${saisonId}` : ''}`,
  teamFormation: (teamId: number) => `team_formation:${teamId}`,
  squadOverview: (teamId: number, saisonId?: number) => 
    `squad_overview:${teamId}${saisonId ? `:${saisonId}` : ''}`
};

// Cache TTL configurations (in milliseconds)
export const CacheTTL = {
  SHORT: 60000,      // 1 minute
  MEDIUM: 300000,    // 5 minutes
  LONG: 900000,      // 15 minutes
  VERY_LONG: 3600000 // 1 hour
};

// Cache invalidation patterns
export const InvalidationPatterns = {
  leagueData: (ligaId: number) => `league_.*:${ligaId}`,
  playerData: (playerId: number) => `.*player.*:${playerId}`,
  teamData: (teamId: number) => `.*team.*:${teamId}`,
  seasonData: (saisonId: number) => `.*:${saisonId}`,
  matchData: (matchId: number) => `match_.*:${matchId}`,
  allLeagues: () => 'league_.*',
  allPlayers: () => '.*player.*',
  allTeams: () => '.*team.*',
  allMatches: () => 'match_.*'
};

// Global cache instance
export const queryCache = new QueryCache(CacheTTL.MEDIUM);

// Cache middleware for controllers
export function withCache<T>(
  key: string,
  factory: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): Promise<T> {
  return queryCache.getOrSet(key, factory, ttl);
}

// Cache invalidation helpers
export const CacheInvalidation = {
  /**
   * Invalidate cache when league table is updated
   */
  onLeagueTableUpdate: (ligaId: number) => {
    queryCache.invalidatePattern(InvalidationPatterns.leagueData(ligaId));
  },
  
  /**
   * Invalidate cache when player stats are updated
   */
  onPlayerStatsUpdate: (playerId: number) => {
    queryCache.invalidatePattern(InvalidationPatterns.playerData(playerId));
  },
  
  /**
   * Invalidate cache when team data is updated
   */
  onTeamUpdate: (teamId: number) => {
    queryCache.invalidatePattern(InvalidationPatterns.teamData(teamId));
  },
  
  /**
   * Invalidate cache when match is updated
   */
  onMatchUpdate: (matchId: number) => {
    queryCache.invalidatePattern(InvalidationPatterns.matchData(matchId));
  },
  
  /**
   * Invalidate cache when season changes
   */
  onSeasonChange: (saisonId: number) => {
    queryCache.invalidatePattern(InvalidationPatterns.seasonData(saisonId));
  },
  
  /**
   * Clear all cache
   */
  clearAll: () => {
    queryCache.clear();
  }
};

// Query optimization helpers
export const QueryOptimization = {
  /**
   * Get optimal populate fields for league table queries
   */
  getLeagueTablePopulate: () => ({
    liga: {
      populate: ['saison']
    },
    club: {
      populate: ['logo']
    }
  }),
  
  /**
   * Get optimal populate fields for player stats queries
   */
  getPlayerStatsPopulate: () => ({
    spieler: {
      populate: {
        mitglied: true,
        hauptteam: {
          populate: ['club', 'liga', 'saison']
        }
      }
    },
    team: {
      populate: ['club', 'liga']
    },
    saison: true
  }),
  
  /**
   * Get optimal populate fields for match queries
   */
  getMatchPopulate: () => ({
    heimclub: {
      populate: ['logo']
    },
    auswaertsclub: {
      populate: ['logo']
    },
    unser_team: {
      populate: ['club']
    },
    liga: true,
    saison: true
  }),
  
  /**
   * Get optimal populate fields for team roster queries
   */
  getTeamRosterPopulate: () => ({
    mitglied: true,
    hauptteam: {
      populate: ['club', 'liga', 'saison']
    },
    aushilfe_teams: {
      populate: ['club', 'liga', 'saison']
    }
  })
};

// Performance monitoring
export const PerformanceMonitor = {
  /**
   * Start performance timer
   */
  start: (): number => Date.now(),
  
  /**
   * End performance timer and log if slow
   */
  end: (startTime: number, operation: string, threshold: number = 1000) => {
    const duration = Date.now() - startTime;
    
    if (duration > threshold) {
      console.warn(`Slow query detected: ${operation} took ${duration}ms`);
    }
    
    return duration;
  },
  
  /**
   * Get cache performance stats
   */
  getCacheStats: () => queryCache.getStats()
};

// Cleanup on process exit
process.on('exit', () => {
  queryCache.destroy();
});

process.on('SIGINT', () => {
  queryCache.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  queryCache.destroy();
  process.exit(0);
});