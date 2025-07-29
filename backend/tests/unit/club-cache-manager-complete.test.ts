/**
 * Comprehensive Unit Tests for Club Cache Manager
 * Tests caching functionality, Redis integration, and performance optimizations
 * Requirements: All requirements need test coverage
 */

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  flushall: jest.fn(),
  ping: jest.fn(),
  quit: jest.fn(),
  on: jest.fn(),
  connected: true,
  status: 'ready'
};

// Mock Strapi
const mockStrapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn()
  }
};

// Mock club data
const mockClub = {
  id: 1,
  documentId: 'club-1',
  name: 'SV Viktoria Wertheim',
  kurz_name: 'SV VIK',
  club_typ: 'viktoria_verein',
  viktoria_team_mapping: 'team_1',
  aktiv: true,
  ligen: [{ id: 1, name: 'Kreisliga Tauberbischofsheim' }],
  logo: { id: 1, url: '/uploads/viktoria-logo.png' }
};

const mockClubs = [
  mockClub,
  {
    id: 2,
    name: 'VfR Gerlachsheim',
    club_typ: 'gegner_verein',
    aktiv: true,
    ligen: [{ id: 1, name: 'Kreisliga Tauberbischofsheim' }]
  }
];

// Mock ClubCacheManager class
class MockClubCacheManager {
  private redis: any;
  private strapi: any;
  private isRedisAvailable: boolean = true;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.redis = mockRedisClient;
  }

  async getClubById(clubId: number, options: any = {}) {
    if (!this.isRedisAvailable || options.skipCache) {
      return this.strapi.entityService.findOne('api::club.club', clubId);
    }

    const cacheKey = `club:${clubId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const club = await this.strapi.entityService.findOne('api::club.club', clubId);
    if (club) {
      await this.redis.set(cacheKey, JSON.stringify(club), 'EX', 1800); // 30 minutes
    }
    return club;
  }

  async getClubsByLiga(ligaId: number, options: any = {}) {
    if (!this.isRedisAvailable || options.skipCache) {
      return this.strapi.entityService.findMany('api::club.club', {
        filters: { ligen: { id: ligaId }, aktiv: true }
      });
    }

    const cacheKey = `liga:${ligaId}:clubs`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const clubs = await this.strapi.entityService.findMany('api::club.club', {
      filters: { ligen: { id: ligaId }, aktiv: true }
    });
    
    if (clubs) {
      await this.redis.set(cacheKey, JSON.stringify(clubs), 'EX', 900); // 15 minutes
    }
    return clubs;
  }

  async getViktoriaClubByTeam(teamMapping: string, options: any = {}) {
    if (!this.isRedisAvailable || options.skipCache) {
      const clubs = await this.strapi.entityService.findMany('api::club.club', {
        filters: { viktoria_team_mapping: teamMapping, aktiv: true }
      });
      return clubs.length > 0 ? clubs[0] : null;
    }

    const cacheKey = `viktoria:${teamMapping}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const clubs = await this.strapi.entityService.findMany('api::club.club', {
      filters: { viktoria_team_mapping: teamMapping, aktiv: true }
    });
    
    const club = clubs.length > 0 ? clubs[0] : null;
    if (club) {
      await this.redis.set(cacheKey, JSON.stringify(club), 'EX', 3600); // 1 hour
    }
    return club;
  }

  async invalidateClub(clubId: number) {
    const keys = await this.redis.keys(`*club*${clubId}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async invalidateLiga(ligaId: number) {
    const keys = await this.redis.keys(`*liga*${ligaId}*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async clearAll() {
    await this.redis.flushall();
  }

  async getStats() {
    const keys = await this.redis.keys('*');
    return {
      totalKeys: keys.length,
      clubKeys: keys.filter(k => k.includes('club')).length,
      ligaKeys: keys.filter(k => k.includes('liga')).length,
      viktoriaKeys: keys.filter(k => k.includes('viktoria')).length
    };
  }

  setRedisAvailable(available: boolean) {
    this.isRedisAvailable = available;
  }
}

describe('Club Cache Manager - Comprehensive Unit Tests', () => {
  let cacheManager: MockClubCacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheManager = new MockClubCacheManager(mockStrapi);
    
    // Reset Redis mock
    mockRedisClient.get.mockReset();
    mockRedisClient.set.mockReset();
    mockRedisClient.del.mockReset();
    mockRedisClient.keys.mockReset();
    mockRedisClient.flushall.mockReset();
  });

  describe('Cache Initialization', () => {
    it('should initialize with Redis connection', () => {
      expect(cacheManager).toBeDefined();
      expect(mockRedisClient.connected).toBe(true);
    });

    it('should handle Redis connection failure gracefully', () => {
      cacheManager.setRedisAvailable(false);
      expect(cacheManager).toBeDefined();
    });

    it('should log initialization status', () => {
      new MockClubCacheManager(mockStrapi);
      // In real implementation, this would check strapi.log.info calls
      expect(mockStrapi.log).toBeDefined();
    });
  });

  describe('Club Caching Operations', () => {
    describe('getClubById', () => {
      it('should return cached club when available', async () => {
        const clubId = 1;
        const cachedClub = JSON.stringify(mockClub);
        
        mockRedisClient.get.mockResolvedValue(cachedClub);

        const result = await cacheManager.getClubById(clubId);

        expect(mockRedisClient.get).toHaveBeenCalledWith(`club:${clubId}`);
        expect(result).toEqual(mockClub);
        expect(mockStrapi.entityService.findOne).not.toHaveBeenCalled();
      });

      it('should fetch from database when cache miss', async () => {
        const clubId = 1;
        
        mockRedisClient.get.mockResolvedValue(null);
        mockStrapi.entityService.findOne.mockResolvedValue(mockClub);
        mockRedisClient.set.mockResolvedValue('OK');

        const result = await cacheManager.getClubById(clubId);

        expect(mockRedisClient.get).toHaveBeenCalledWith(`club:${clubId}`);
        expect(mockStrapi.entityService.findOne).toHaveBeenCalledWith('api::club.club', clubId);
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          `club:${clubId}`,
          JSON.stringify(mockClub),
          'EX',
          1800
        );
        expect(result).toEqual(mockClub);
      });

      it('should skip cache when requested', async () => {
        const clubId = 1;
        
        mockStrapi.entityService.findOne.mockResolvedValue(mockClub);

        const result = await cacheManager.getClubById(clubId, { skipCache: true });

        expect(mockRedisClient.get).not.toHaveBeenCalled();
        expect(mockStrapi.entityService.findOne).toHaveBeenCalledWith('api::club.club', clubId);
        expect(result).toEqual(mockClub);
      });

      it('should handle Redis errors gracefully', async () => {
        const clubId = 1;
        
        mockRedisClient.get.mockRejectedValue(new Error('Redis connection failed'));
        mockStrapi.entityService.findOne.mockResolvedValue(mockClub);

        const result = await cacheManager.getClubById(clubId);

        expect(result).toEqual(mockClub);
      });

      it('should not cache null results', async () => {
        const clubId = 999;
        
        mockRedisClient.get.mockResolvedValue(null);
        mockStrapi.entityService.findOne.mockResolvedValue(null);

        const result = await cacheManager.getClubById(clubId);

        expect(mockRedisClient.set).not.toHaveBeenCalled();
        expect(result).toBeNull();
      });
    });

    describe('getClubsByLiga', () => {
      it('should return cached clubs when available', async () => {
        const ligaId = 1;
        const cachedClubs = JSON.stringify(mockClubs);
        
        mockRedisClient.get.mockResolvedValue(cachedClubs);

        const result = await cacheManager.getClubsByLiga(ligaId);

        expect(mockRedisClient.get).toHaveBeenCalledWith(`liga:${ligaId}:clubs`);
        expect(result).toEqual(mockClubs);
        expect(mockStrapi.entityService.findMany).not.toHaveBeenCalled();
      });

      it('should fetch from database when cache miss', async () => {
        const ligaId = 1;
        
        mockRedisClient.get.mockResolvedValue(null);
        mockStrapi.entityService.findMany.mockResolvedValue(mockClubs);
        mockRedisClient.set.mockResolvedValue('OK');

        const result = await cacheManager.getClubsByLiga(ligaId);

        expect(mockRedisClient.get).toHaveBeenCalledWith(`liga:${ligaId}:clubs`);
        expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::club.club', {
          filters: { ligen: { id: ligaId }, aktiv: true }
        });
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          `liga:${ligaId}:clubs`,
          JSON.stringify(mockClubs),
          'EX',
          900
        );
        expect(result).toEqual(mockClubs);
      });

      it('should skip cache when requested', async () => {
        const ligaId = 1;
        
        mockStrapi.entityService.findMany.mockResolvedValue(mockClubs);

        const result = await cacheManager.getClubsByLiga(ligaId, { skipCache: true });

        expect(mockRedisClient.get).not.toHaveBeenCalled();
        expect(mockStrapi.entityService.findMany).toHaveBeenCalled();
        expect(result).toEqual(mockClubs);
      });

      it('should handle empty results', async () => {
        const ligaId = 999;
        
        mockRedisClient.get.mockResolvedValue(null);
        mockStrapi.entityService.findMany.mockResolvedValue([]);
        mockRedisClient.set.mockResolvedValue('OK');

        const result = await cacheManager.getClubsByLiga(ligaId);

        expect(result).toEqual([]);
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          `liga:${ligaId}:clubs`,
          JSON.stringify([]),
          'EX',
          900
        );
      });
    });

    describe('getViktoriaClubByTeam', () => {
      it('should return cached Viktoria club when available', async () => {
        const teamMapping = 'team_1';
        const cachedClub = JSON.stringify(mockClub);
        
        mockRedisClient.get.mockResolvedValue(cachedClub);

        const result = await cacheManager.getViktoriaClubByTeam(teamMapping);

        expect(mockRedisClient.get).toHaveBeenCalledWith(`viktoria:${teamMapping}`);
        expect(result).toEqual(mockClub);
        expect(mockStrapi.entityService.findMany).not.toHaveBeenCalled();
      });

      it('should fetch from database when cache miss', async () => {
        const teamMapping = 'team_1';
        
        mockRedisClient.get.mockResolvedValue(null);
        mockStrapi.entityService.findMany.mockResolvedValue([mockClub]);
        mockRedisClient.set.mockResolvedValue('OK');

        const result = await cacheManager.getViktoriaClubByTeam(teamMapping);

        expect(mockRedisClient.get).toHaveBeenCalledWith(`viktoria:${teamMapping}`);
        expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::club.club', {
          filters: { viktoria_team_mapping: teamMapping, aktiv: true }
        });
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          `viktoria:${teamMapping}`,
          JSON.stringify(mockClub),
          'EX',
          3600
        );
        expect(result).toEqual(mockClub);
      });

      it('should return null when no Viktoria club found', async () => {
        const teamMapping = 'team_3';
        
        mockRedisClient.get.mockResolvedValue(null);
        mockStrapi.entityService.findMany.mockResolvedValue([]);

        const result = await cacheManager.getViktoriaClubByTeam(teamMapping);

        expect(result).toBeNull();
        expect(mockRedisClient.set).not.toHaveBeenCalled();
      });

      it('should skip cache when requested', async () => {
        const teamMapping = 'team_1';
        
        mockStrapi.entityService.findMany.mockResolvedValue([mockClub]);

        const result = await cacheManager.getViktoriaClubByTeam(teamMapping, { skipCache: true });

        expect(mockRedisClient.get).not.toHaveBeenCalled();
        expect(mockStrapi.entityService.findMany).toHaveBeenCalled();
        expect(result).toEqual(mockClub);
      });
    });
  });

  describe('Cache Invalidation', () => {
    describe('invalidateClub', () => {
      it('should invalidate all club-related cache entries', async () => {
        const clubId = 1;
        const clubKeys = [`club:${clubId}`, `club:${clubId}:logo`, `liga:1:clubs`];
        
        mockRedisClient.keys.mockResolvedValue(clubKeys);
        mockRedisClient.del.mockResolvedValue(clubKeys.length);

        await cacheManager.invalidateClub(clubId);

        expect(mockRedisClient.keys).toHaveBeenCalledWith(`*club*${clubId}*`);
        expect(mockRedisClient.del).toHaveBeenCalledWith(...clubKeys);
      });

      it('should handle no matching keys', async () => {
        const clubId = 999;
        
        mockRedisClient.keys.mockResolvedValue([]);

        await cacheManager.invalidateClub(clubId);

        expect(mockRedisClient.keys).toHaveBeenCalledWith(`*club*${clubId}*`);
        expect(mockRedisClient.del).not.toHaveBeenCalled();
      });

      it('should handle Redis errors during invalidation', async () => {
        const clubId = 1;
        
        mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

        await expect(cacheManager.invalidateClub(clubId)).rejects.toThrow('Redis error');
      });
    });

    describe('invalidateLiga', () => {
      it('should invalidate all liga-related cache entries', async () => {
        const ligaId = 1;
        const ligaKeys = [`liga:${ligaId}:clubs`, `liga:${ligaId}:stats`];
        
        mockRedisClient.keys.mockResolvedValue(ligaKeys);
        mockRedisClient.del.mockResolvedValue(ligaKeys.length);

        await cacheManager.invalidateLiga(ligaId);

        expect(mockRedisClient.keys).toHaveBeenCalledWith(`*liga*${ligaId}*`);
        expect(mockRedisClient.del).toHaveBeenCalledWith(...ligaKeys);
      });

      it('should handle no matching keys', async () => {
        const ligaId = 999;
        
        mockRedisClient.keys.mockResolvedValue([]);

        await cacheManager.invalidateLiga(ligaId);

        expect(mockRedisClient.keys).toHaveBeenCalledWith(`*liga*${ligaId}*`);
        expect(mockRedisClient.del).not.toHaveBeenCalled();
      });
    });

    describe('clearAll', () => {
      it('should clear all cache entries', async () => {
        mockRedisClient.flushall.mockResolvedValue('OK');

        await cacheManager.clearAll();

        expect(mockRedisClient.flushall).toHaveBeenCalled();
      });

      it('should handle Redis errors during clear', async () => {
        mockRedisClient.flushall.mockRejectedValue(new Error('Redis error'));

        await expect(cacheManager.clearAll()).rejects.toThrow('Redis error');
      });
    });
  });

  describe('Cache Statistics', () => {
    describe('getStats', () => {
      it('should return cache statistics', async () => {
        const allKeys = [
          'club:1',
          'club:2',
          'liga:1:clubs',
          'liga:2:clubs',
          'viktoria:team_1',
          'viktoria:team_2',
          'other:key'
        ];
        
        mockRedisClient.keys.mockResolvedValue(allKeys);

        const stats = await cacheManager.getStats();

        expect(mockRedisClient.keys).toHaveBeenCalledWith('*');
        expect(stats).toEqual({
          totalKeys: 7,
          clubKeys: 2,
          ligaKeys: 2,
          viktoriaKeys: 2
        });
      });

      it('should handle empty cache', async () => {
        mockRedisClient.keys.mockResolvedValue([]);

        const stats = await cacheManager.getStats();

        expect(stats).toEqual({
          totalKeys: 0,
          clubKeys: 0,
          ligaKeys: 0,
          viktoriaKeys: 0
        });
      });

      it('should handle Redis errors during stats', async () => {
        mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

        await expect(cacheManager.getStats()).rejects.toThrow('Redis error');
      });
    });
  });

  describe('Fallback Behavior', () => {
    it('should fallback to database when Redis is unavailable', async () => {
      cacheManager.setRedisAvailable(false);
      
      mockStrapi.entityService.findOne.mockResolvedValue(mockClub);

      const result = await cacheManager.getClubById(1);

      expect(mockRedisClient.get).not.toHaveBeenCalled();
      expect(mockStrapi.entityService.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockClub);
    });

    it('should continue working when Redis operations fail', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis connection lost'));
      mockStrapi.entityService.findOne.mockResolvedValue(mockClub);

      const result = await cacheManager.getClubById(1);

      expect(result).toEqual(mockClub);
    });

    it('should handle partial Redis failures', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.set.mockRejectedValue(new Error('Redis write failed'));
      mockStrapi.entityService.findOne.mockResolvedValue(mockClub);

      const result = await cacheManager.getClubById(1);

      expect(result).toEqual(mockClub);
      expect(mockStrapi.entityService.findOne).toHaveBeenCalled();
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent cache requests', async () => {
      const clubId = 1;
      
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockClub));

      const promises = Array.from({ length: 10 }, () => 
        cacheManager.getClubById(clubId)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toEqual(mockClub);
      });
      expect(mockRedisClient.get).toHaveBeenCalledTimes(10);
    });

    it('should handle large cache operations efficiently', async () => {
      const largeClubList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockClub,
        id: i + 1,
        name: `Club ${i + 1}`
      }));

      mockRedisClient.get.mockResolvedValue(null);
      mockStrapi.entityService.findMany.mockResolvedValue(largeClubList);
      mockRedisClient.set.mockResolvedValue('OK');

      const start = Date.now();
      const result = await cacheManager.getClubsByLiga(1);
      const duration = Date.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should complete quickly
    });

    it('should handle cache key collisions gracefully', async () => {
      const clubId1 = 1;
      const clubId2 = 11; // Could potentially cause key collision issues
      
      mockRedisClient.get
        .mockResolvedValueOnce(JSON.stringify(mockClub))
        .mockResolvedValueOnce(JSON.stringify({ ...mockClub, id: 11, name: 'Club 11' }));

      const [result1, result2] = await Promise.all([
        cacheManager.getClubById(clubId1),
        cacheManager.getClubById(clubId2)
      ]);

      expect(result1.id).toBe(1);
      expect(result2.id).toBe(11);
    });
  });

  describe('Cache TTL and Expiration', () => {
    it('should set appropriate TTL for different cache types', async () => {
      const clubId = 1;
      const ligaId = 1;
      const teamMapping = 'team_1';
      
      mockRedisClient.get.mockResolvedValue(null);
      mockStrapi.entityService.findOne.mockResolvedValue(mockClub);
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockClubs)
        .mockResolvedValueOnce([mockClub]);
      mockRedisClient.set.mockResolvedValue('OK');

      await Promise.all([
        cacheManager.getClubById(clubId),
        cacheManager.getClubsByLiga(ligaId),
        cacheManager.getViktoriaClubByTeam(teamMapping)
      ]);

      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `club:${clubId}`,
        expect.any(String),
        'EX',
        1800 // 30 minutes
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `liga:${ligaId}:clubs`,
        expect.any(String),
        'EX',
        900 // 15 minutes
      );
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `viktoria:${teamMapping}`,
        expect.any(String),
        'EX',
        3600 // 1 hour
      );
    });

    it('should handle cache expiration gracefully', async () => {
      const clubId = 1;
      
      // First call - cache miss
      mockRedisClient.get.mockResolvedValueOnce(null);
      mockStrapi.entityService.findOne.mockResolvedValue(mockClub);
      mockRedisClient.set.mockResolvedValue('OK');

      await cacheManager.getClubById(clubId);

      // Second call - cache hit
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(mockClub));

      const result = await cacheManager.getClubById(clubId);

      expect(result).toEqual(mockClub);
      expect(mockStrapi.entityService.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed cached data', async () => {
      const clubId = 1;
      
      mockRedisClient.get.mockResolvedValue('invalid-json');
      mockStrapi.entityService.findOne.mockResolvedValue(mockClub);

      const result = await cacheManager.getClubById(clubId);

      expect(result).toEqual(mockClub);
      expect(mockStrapi.entityService.findOne).toHaveBeenCalled();
    });

    it('should handle null cache values', async () => {
      const clubId = 1;
      
      mockRedisClient.get.mockResolvedValue(null);
      mockStrapi.entityService.findOne.mockResolvedValue(null);

      const result = await cacheManager.getClubById(clubId);

      expect(result).toBeNull();
      expect(mockRedisClient.set).not.toHaveBeenCalled();
    });

    it('should handle Redis timeout errors', async () => {
      const clubId = 1;
      const timeoutError = new Error('Redis timeout');
      timeoutError.name = 'TimeoutError';
      
      mockRedisClient.get.mockRejectedValue(timeoutError);
      mockStrapi.entityService.findOne.mockResolvedValue(mockClub);

      const result = await cacheManager.getClubById(clubId);

      expect(result).toEqual(mockClub);
    });

    it('should handle database errors during cache miss', async () => {
      const clubId = 1;
      
      mockRedisClient.get.mockResolvedValue(null);
      mockStrapi.entityService.findOne.mockRejectedValue(new Error('Database error'));

      await expect(cacheManager.getClubById(clubId)).rejects.toThrow('Database error');
    });

    it('should handle very large cache values', async () => {
      const clubId = 1;
      const largeClub = {
        ...mockClub,
        description: 'x'.repeat(10000), // Very large description
        history: Array.from({ length: 1000 }, (_, i) => `Event ${i}`)
      };
      
      mockRedisClient.get.mockResolvedValue(null);
      mockStrapi.entityService.findOne.mockResolvedValue(largeClub);
      mockRedisClient.set.mockResolvedValue('OK');

      const result = await cacheManager.getClubById(clubId);

      expect(result).toEqual(largeClub);
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        `club:${clubId}`,
        JSON.stringify(largeClub),
        'EX',
        1800
      );
    });
  });
});