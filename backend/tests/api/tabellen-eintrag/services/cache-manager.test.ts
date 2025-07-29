/**
 * Cache Manager Service Tests
 * Tests for Redis caching functionality and performance
 */

import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { 
  RedisCacheManager, 
  InMemoryCacheManager, 
  CacheManager, 
  CacheKeyType, 
  WarmingPriority,
  DEFAULT_CACHE_CONFIG 
} from '../../../../src/api/tabellen-eintrag/services/cache-manager';

// Mock Redis module
const mockRedisInstance = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  flushdb: jest.fn(),
  info: jest.fn(),
  config: jest.fn(),
  on: jest.fn(),
  quit: jest.fn()
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

describe('CacheManager', () => {
  let mockStrapi: any;
  let mockRedis: any;

  beforeEach(() => {
    mockStrapi = {
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      },
      entityService: {
        findMany: jest.fn()
      }
    };

    // Use the mocked Redis instance
    mockRedis = mockRedisInstance;
  });

  describe('RedisCacheManager', () => {
    let cacheManager: CacheManager;
    let config: any;

    beforeEach(() => {
      config = {
        ...DEFAULT_CACHE_CONFIG,
        enabled: true
      };
      cacheManager = new RedisCacheManager(mockStrapi, config);
      (cacheManager as any).redis = mockRedisInstance;
    });

    describe('get', () => {
      it('should return cached value when key exists', async () => {
        const testData = { id: 1, name: 'Test Team' };
        mockRedis.get.mockResolvedValue(JSON.stringify(testData));

        const result = await cacheManager.get('test:key');

        expect(result).toEqual(testData);
        expect(mockRedis.get).toHaveBeenCalledWith('test:key');
      });

      it('should return null when key does not exist', async () => {
        mockRedis.get.mockResolvedValue(null);

        const result = await cacheManager.get('nonexistent:key');

        expect(result).toBeNull();
      });

      it('should handle Redis errors gracefully', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis error'));

        const result = await cacheManager.get('error:key');

        expect(result).toBeNull();
        expect(mockStrapi.log.warn).toHaveBeenCalled();
      });

      it('should update hit/miss statistics', async () => {
        mockRedis.get.mockResolvedValueOnce(JSON.stringify({ data: 'hit' }));
        mockRedis.get.mockResolvedValueOnce(null);

        await cacheManager.get('hit:key');
        await cacheManager.get('miss:key');

        const stats = await cacheManager.getCacheStats();
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBe(50);
      });
    });

    describe('set', () => {
      it('should store value with default TTL', async () => {
        const testData = { id: 1, name: 'Test Team' };
        mockRedis.setex.mockResolvedValue('OK');

        await cacheManager.set('test:key', testData);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          'test:key',
          config.defaultTtl,
          JSON.stringify(testData)
        );
      });

      it('should store value with custom TTL', async () => {
        const testData = { id: 1, name: 'Test Team' };
        const customTtl = 600;
        mockRedis.setex.mockResolvedValue('OK');

        await cacheManager.set('test:key', testData, customTtl);

        expect(mockRedis.setex).toHaveBeenCalledWith(
          'test:key',
          customTtl,
          JSON.stringify(testData)
        );
      });

      it('should handle Redis errors gracefully', async () => {
        mockRedis.setex.mockRejectedValue(new Error('Redis error'));

        await cacheManager.set('error:key', { data: 'test' });

        expect(mockStrapi.log.warn).toHaveBeenCalled();
      });
    });

    describe('del', () => {
      it('should delete key from cache', async () => {
        mockRedis.del.mockResolvedValue(1);

        await cacheManager.del('test:key');

        expect(mockRedis.del).toHaveBeenCalledWith('test:key');
      });

      it('should handle deletion errors gracefully', async () => {
        mockRedis.del.mockRejectedValue(new Error('Redis error'));

        await cacheManager.del('error:key');

        expect(mockStrapi.log.warn).toHaveBeenCalled();
      });
    });

    describe('invalidatePattern', () => {
      it('should invalidate keys matching pattern', async () => {
        const matchingKeys = ['table:liga:1:saison:1', 'table:liga:1:saison:2'];
        mockRedis.keys.mockResolvedValue(matchingKeys);
        mockRedis.del.mockResolvedValue(2);

        await cacheManager.invalidatePattern('table:liga:1:*');

        expect(mockRedis.keys).toHaveBeenCalledWith('table:liga:1:*');
        expect(mockRedis.del).toHaveBeenCalledWith(...matchingKeys);
      });

      it('should handle no matching keys', async () => {
        mockRedis.keys.mockResolvedValue([]);

        await cacheManager.invalidatePattern('nonexistent:*');

        expect(mockRedis.keys).toHaveBeenCalledWith('nonexistent:*');
        expect(mockRedis.del).not.toHaveBeenCalled();
      });
    });

    describe('warmCache', () => {
      it('should warm cache with predefined strategies', async () => {
        // Mock entity service responses
        mockStrapi.entityService.findMany
          .mockResolvedValueOnce([{ id: 1, aktiv: true }]) // saison
          .mockResolvedValueOnce([{ id: 1, aktiv: true }]) // ligen
          .mockResolvedValueOnce([{ id: 1, team: { name: 'Team 1' } }]); // table entries

        mockRedis.setex.mockResolvedValue('OK');

        await cacheManager.warmCache();

        expect(mockStrapi.log.info).toHaveBeenCalledWith(
          expect.stringContaining('Cache warming completed')
        );
      });

      it('should handle warming errors gracefully', async () => {
        mockStrapi.entityService.findMany.mockRejectedValue(new Error('DB error'));

        await cacheManager.warmCache();

        expect(mockStrapi.log.warn).toHaveBeenCalled();
      });
    });

    describe('getCacheStats', () => {
      it('should return cache statistics', async () => {
        mockRedis.info
          .mockResolvedValueOnce('used_memory:1048576\nevicted_keys:5\nuptime_in_seconds:3600')
          .mockResolvedValueOnce('db0:keys=100,expires=50');

        const stats = await cacheManager.getCacheStats();

        expect(stats).toHaveProperty('hits');
        expect(stats).toHaveProperty('misses');
        expect(stats).toHaveProperty('hitRate');
        expect(stats).toHaveProperty('totalKeys');
        expect(stats).toHaveProperty('memoryUsage');
        expect(stats.memoryUsage).toBe(1048576);
        expect(stats.totalKeys).toBe(100);
      });
    });

    describe('generateKey', () => {
      it('should generate cache key from components', () => {
        const key = (cacheManager as any).generateKey({
          type: CacheKeyType.TABLE_DATA,
          ligaId: 1,
          saisonId: 2,
          teamId: 3,
          additional: 'extra'
        });

        expect(key).toBe('table:liga:1:saison:2:team:3:extra');
      });

      it('should generate key with minimal components', () => {
        const key = (cacheManager as any).generateKey({
          type: CacheKeyType.QUEUE_STATUS
        });

        expect(key).toBe('queue');
      });
    });

    describe('invalidateTableCache', () => {
      it('should invalidate all table-related cache patterns', async () => {
        mockRedis.keys.mockResolvedValue(['key1', 'key2']);
        mockRedis.del.mockResolvedValue(2);

        await (cacheManager as any).invalidateTableCache(1, 2);

        expect(mockRedis.keys).toHaveBeenCalledTimes(3); // Three patterns
        expect(mockStrapi.log.info).toHaveBeenCalledWith(
          expect.stringContaining('Invalidated table cache for liga 1, saison 2')
        );
      });
    });
  });

  describe('InMemoryCacheManager', () => {
    let cacheManager: InMemoryCacheManager;

    beforeEach(() => {
      cacheManager = new InMemoryCacheManager(mockStrapi);
    });

    describe('get and set', () => {
      it('should store and retrieve values', async () => {
        const testData = { id: 1, name: 'Test Team' };

        await cacheManager.set('test:key', testData, 300);
        const result = await cacheManager.get('test:key');

        expect(result).toEqual(testData);
      });

      it('should return null for expired keys', async () => {
        const testData = { id: 1, name: 'Test Team' };

        await cacheManager.set('test:key', testData, 0.001); // 1ms TTL
        
        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const result = await cacheManager.get('test:key');

        expect(result).toBeNull();
      });

      it('should update statistics correctly', async () => {
        await cacheManager.set('test:key', { data: 'test' });
        
        await cacheManager.get('test:key'); // Hit
        await cacheManager.get('nonexistent:key'); // Miss

        const stats = await cacheManager.getCacheStats();
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBe(50);
      });
    });

    describe('del', () => {
      it('should delete keys', async () => {
        await cacheManager.set('test:key', { data: 'test' });
        await cacheManager.del('test:key');
        
        const result = await cacheManager.get('test:key');
        expect(result).toBeNull();
      });
    });

    describe('invalidatePattern', () => {
      it('should invalidate keys matching pattern', async () => {
        await cacheManager.set('table:liga:1:saison:1', { data: 'test1' });
        await cacheManager.set('table:liga:1:saison:2', { data: 'test2' });
        await cacheManager.set('team:stats:1', { data: 'test3' });

        await cacheManager.invalidatePattern('table:liga:1:*');

        expect(await cacheManager.get('table:liga:1:saison:1')).toBeNull();
        expect(await cacheManager.get('table:liga:1:saison:2')).toBeNull();
        expect(await cacheManager.get('team:stats:1')).not.toBeNull();
      });
    });

    describe('clearAll', () => {
      it('should clear all cache data', async () => {
        await cacheManager.set('key1', { data: 'test1' });
        await cacheManager.set('key2', { data: 'test2' });

        await cacheManager.clearAll();

        expect(await cacheManager.get('key1')).toBeNull();
        expect(await cacheManager.get('key2')).toBeNull();
        
        const stats = await cacheManager.getCacheStats();
        expect(stats.totalKeys).toBe(0);
      });
    });

    describe('cleanup', () => {
      it('should automatically clean up expired entries', async () => {
        await cacheManager.set('short:key', { data: 'test' }, 0.001); // 1ms TTL
        
        // Trigger cleanup manually
        (cacheManager as any).cleanup();
        
        const stats = await cacheManager.getCacheStats();
        expect(stats.evictions).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance Tests', () => {
    let cacheManager: InMemoryCacheManager;

    beforeEach(() => {
      cacheManager = new InMemoryCacheManager(mockStrapi);
    });

    it('should handle high-volume operations efficiently', async () => {
      const startTime = Date.now();
      const operations = [];

      // Perform 1000 set operations
      for (let i = 0; i < 1000; i++) {
        operations.push(cacheManager.set(`key:${i}`, { id: i, data: `test${i}` }));
      }

      await Promise.all(operations);

      // Perform 1000 get operations
      const getOperations = [];
      for (let i = 0; i < 1000; i++) {
        getOperations.push(cacheManager.get(`key:${i}`));
      }

      const results = await Promise.all(getOperations);

      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(results).toHaveLength(1000);
      expect(results.every(result => result !== null)).toBe(true);
    });

    it('should maintain performance with pattern invalidation', async () => {
      // Set up 1000 keys with different patterns
      const setOperations = [];
      for (let i = 0; i < 1000; i++) {
        const pattern = i % 10; // 10 different patterns
        setOperations.push(cacheManager.set(`pattern:${pattern}:key:${i}`, { id: i }));
      }

      await Promise.all(setOperations);

      const startTime = Date.now();

      // Invalidate one pattern (should affect ~100 keys)
      await cacheManager.invalidatePattern('pattern:5:*');

      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(100); // Should complete quickly
      
      // Verify invalidation worked
      const result = await cacheManager.get('pattern:5:key:50');
      expect(result).toBeNull();
      
      // Verify other patterns are intact
      const otherResult = await cacheManager.get('pattern:1:key:10');
      expect(otherResult).not.toBeNull();
    });

    it('should handle concurrent access efficiently', async () => {
      const concurrentOperations = [];
      
      // 100 concurrent mixed operations
      for (let i = 0; i < 100; i++) {
        if (i % 3 === 0) {
          concurrentOperations.push(cacheManager.set(`concurrent:${i}`, { id: i }));
        } else if (i % 3 === 1) {
          concurrentOperations.push(cacheManager.get(`concurrent:${i - 1}`));
        } else {
          concurrentOperations.push(cacheManager.del(`concurrent:${i - 2}`));
        }
      }

      const startTime = Date.now();
      
      await Promise.all(concurrentOperations);
      
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(500); // Should handle concurrency well
    });
  });

  describe('Cache Warming Performance', () => {
    let cacheManager: RedisCacheManager;

    beforeEach(() => {
      const config = { ...DEFAULT_CACHE_CONFIG, enabled: true };
      cacheManager = new RedisCacheManager(mockStrapi, config);
      (cacheManager as any).redis = mockRedis;
    });

    it('should warm cache within acceptable time', async () => {
      // Mock large dataset
      const mockSaisons = [{ id: 1, aktiv: true }];
      const mockLigen = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, aktiv: true }));
      const mockEntries = Array.from({ length: 160 }, (_, i) => ({ 
        id: i + 1, 
        team: { name: `Team ${i + 1}` } 
      }));

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockSaisons)
        .mockResolvedValueOnce(mockLigen)
        .mockResolvedValue(mockEntries);

      mockRedis.setex.mockResolvedValue('OK');

      const startTime = Date.now();
      
      await cacheManager.warmCache();
      
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Cache warming completed')
      );
    });
  });
});