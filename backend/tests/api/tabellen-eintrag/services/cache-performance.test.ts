/**
 * Cache Performance Tests
 * Tests comparing cached vs uncached operations performance
 * Requirements: 8.1, 8.2, 8.3
 */

import { TabellenBerechnungsServiceImpl } from '../../../../src/api/tabellen-eintrag/services/tabellen-berechnung';
import { InMemoryCacheManager, CacheKeyType } from '../../../../src/api/tabellen-eintrag/services/cache-manager';
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
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
// Mock strapi helper
function createMockStrapi() {
  return {
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    },
    entityService: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    db: {
      transaction: jest.fn().mockImplementation((callback) => callback()),
      connection: {
        raw: jest.fn()
      }
    }
  };
}

describe('Cache Performance Tests', () => {
  let tabellenService: TabellenBerechnungsServiceImpl;
  let cacheManager: InMemoryCacheManager;
  let mockStrapi: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    tabellenService = new TabellenBerechnungsServiceImpl(mockStrapi);
    cacheManager = new InMemoryCacheManager(mockStrapi);
  });

  describe('Table Calculation Performance with Caching', () => {
    it('should show performance improvement with cached table data', async () => {
      const ligaId = 1;
      const saisonId = 1;
      const mockGames = generateMockGames(16, 50);
      const mockTableEntries = generateMockTableEntries(16);

      // First calculation (cache miss)
      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);
      
      const uncachedStartTime = Date.now();
      const uncachedResult = await tabellenService.calculateTableForLiga(ligaId, saisonId);
      const uncachedTime = Date.now() - uncachedStartTime;

      // Cache the result
      const cacheKey = `table:liga:${ligaId}:saison:${saisonId}`;
      await cacheManager.set(cacheKey, uncachedResult, 300);

      // Second calculation (cache hit)
      const cachedStartTime = Date.now();
      const cachedResult = await cacheManager.get(cacheKey);
      const cachedTime = Date.now() - cachedStartTime;

      expect(cachedResult).toEqual(uncachedResult);
      expect(cachedTime).toBeLessThan(uncachedTime * 0.1); // Cached should be at least 10x faster
      
      console.log(`Uncached: ${uncachedTime}ms, Cached: ${cachedTime}ms, Improvement: ${Math.round(uncachedTime / cachedTime)}x`);
    });

    it('should demonstrate team stats caching performance', async () => {
      const teamId = 1;
      const ligaId = 1;
      const saisonId = 1;
      const mockGames = generateMockGames(16, 30);

      // Uncached team stats calculation
      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);
      
      const uncachedStartTime = Date.now();
      const uncachedStats = await tabellenService.calculateTeamStats(teamId, ligaId, saisonId);
      const uncachedTime = Date.now() - uncachedStartTime;

      // Cache the team stats
      const cacheKey = `team_stats:team:${teamId}:liga:${ligaId}:saison:${saisonId}`;
      await cacheManager.set(cacheKey, uncachedStats, 600);

      // Cached team stats retrieval
      const cachedStartTime = Date.now();
      const cachedStats = await cacheManager.get(cacheKey);
      const cachedTime = Date.now() - cachedStartTime;

      expect(cachedStats).toEqual(uncachedStats);
      expect(cachedTime).toBeLessThan(uncachedTime * 0.05); // Cached should be at least 20x faster
      
      console.log(`Team Stats - Uncached: ${uncachedTime}ms, Cached: ${cachedTime}ms`);
    });

    it('should show bulk operations performance with caching', async () => {
      const mockEntries = generateMockTableEntries(20);
      
      // Uncached bulk update
      const uncachedStartTime = Date.now();
      await tabellenService.bulkUpdateTableEntries(mockEntries);
      const uncachedTime = Date.now() - uncachedStartTime;

      // Cache individual entries for faster lookups
      for (const entry of mockEntries) {
        const cacheKey = `entry:team:${entry.team.id}:liga:${entry.liga.id}`;
        await cacheManager.set(cacheKey, entry, 300);
      }

      // Simulate cached bulk operation (would use cached lookups)
      const cachedStartTime = Date.now();
      const cachedLookups = await Promise.all(
        mockEntries.map(entry => 
          cacheManager.get(`entry:team:${entry.team.id}:liga:${entry.liga.id}`)
        )
      );
      const cachedTime = Date.now() - cachedStartTime;

      expect(cachedLookups.every(entry => entry !== null)).toBe(true);
      expect(cachedTime).toBeLessThan(uncachedTime * 0.2); // Cached lookups should be much faster
      
      console.log(`Bulk Operations - Uncached: ${uncachedTime}ms, Cached: ${cachedTime}ms`);
    });
  });

  describe('Cache Hit Rate Performance', () => {
    it('should maintain high hit rate under realistic load', async () => {
      const ligaIds = [1, 2, 3];
      const saisonId = 1;
      const operations = [];

      // Warm cache with initial data
      for (const ligaId of ligaIds) {
        const mockData = generateMockTableEntries(16);
        const cacheKey = `table:liga:${ligaId}:saison:${saisonId}`;
        await cacheManager.set(cacheKey, mockData, 300);
      }

      // Simulate realistic access pattern (80% reads, 20% writes)
      for (let i = 0; i < 100; i++) {
        const ligaId = ligaIds[Math.floor(Math.random() * ligaIds.length)];
        const cacheKey = `table:liga:${ligaId}:saison:${saisonId}`;

        if (Math.random() < 0.8) {
          // Read operation (80%)
          operations.push(cacheManager.get(cacheKey));
        } else {
          // Write operation (20%)
          const newData = generateMockTableEntries(16);
          operations.push(cacheManager.set(cacheKey, newData, 300));
        }
      }

      const startTime = Date.now();
      await Promise.all(operations);
      const executionTime = Date.now() - startTime;

      const stats = await cacheManager.getCacheStats();
      
      expect(stats.hitRate).toBeGreaterThan(70); // Should maintain >70% hit rate
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      
      console.log(`Hit Rate: ${stats.hitRate.toFixed(2)}%, Execution Time: ${executionTime}ms`);
    });

    it('should handle cache invalidation efficiently', async () => {
      // Set up cache with multiple leagues
      const setupOperations = [];
      for (let ligaId = 1; ligaId <= 10; ligaId++) {
        for (let saisonId = 1; saisonId <= 3; saisonId++) {
          const cacheKey = `table:liga:${ligaId}:saison:${saisonId}`;
          const mockData = generateMockTableEntries(16);
          setupOperations.push(cacheManager.set(cacheKey, mockData, 300));
        }
      }
      await Promise.all(setupOperations);

      // Measure invalidation performance
      const startTime = Date.now();
      await cacheManager.invalidatePattern('table:liga:5:*');
      const invalidationTime = Date.now() - startTime;

      // Verify invalidation worked
      const invalidatedResult = await cacheManager.get('table:liga:5:saison:1');
      const nonInvalidatedResult = await cacheManager.get('table:liga:1:saison:1');

      expect(invalidatedResult).toBeNull();
      expect(nonInvalidatedResult).not.toBeNull();
      expect(invalidationTime).toBeLessThan(100); // Should invalidate quickly
      
      console.log(`Invalidation Time: ${invalidationTime}ms`);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should manage memory efficiently with large datasets', async () => {
      const initialStats = await cacheManager.getCacheStats();
      const initialMemory = process.memoryUsage();

      // Cache large amount of data
      const cacheOperations = [];
      for (let i = 0; i < 1000; i++) {
        const cacheKey = `large:dataset:${i}`;
        const largeData = generateLargeTableData(50); // 50 teams per entry
        cacheOperations.push(cacheManager.set(cacheKey, largeData, 300));
      }

      await Promise.all(cacheOperations);

      const finalStats = await cacheManager.getCacheStats();
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      expect(finalStats.totalKeys).toBe(initialStats.totalKeys + 1000);
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
      
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB for 1000 entries`);
    });

    it('should clean up expired entries efficiently', async () => {
      // Add entries with short TTL
      const shortLivedOperations = [];
      for (let i = 0; i < 100; i++) {
        const cacheKey = `short:lived:${i}`;
        const data = generateMockTableEntries(5);
        shortLivedOperations.push(cacheManager.set(cacheKey, data, 0.1)); // 100ms TTL
      }

      await Promise.all(shortLivedOperations);

      const beforeCleanup = await cacheManager.getCacheStats();
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Trigger cleanup
      (cacheManager as any).cleanup();
      
      const afterCleanup = await cacheManager.getCacheStats();

      expect(afterCleanup.totalKeys).toBeLessThan(beforeCleanup.totalKeys);
      expect(afterCleanup.evictions).toBeGreaterThan(0);
      
      console.log(`Cleaned up ${beforeCleanup.totalKeys - afterCleanup.totalKeys} expired entries`);
    });
  });

  describe('Concurrent Access Performance', () => {
    it('should handle concurrent reads efficiently', async () => {
      // Pre-populate cache
      const cacheKey = 'concurrent:test';
      const testData = generateMockTableEntries(20);
      await cacheManager.set(cacheKey, testData, 300);

      // Simulate 100 concurrent reads
      const concurrentReads = [];
      for (let i = 0; i < 100; i++) {
        concurrentReads.push(cacheManager.get(cacheKey));
      }

      const startTime = Date.now();
      const results = await Promise.all(concurrentReads);
      const executionTime = Date.now() - startTime;

      expect(results).toHaveLength(100);
      expect(results.every(result => result !== null)).toBe(true);
      expect(executionTime).toBeLessThan(100); // Should handle concurrent reads quickly
      
      console.log(`100 concurrent reads completed in ${executionTime}ms`);
    });

    it('should handle mixed concurrent operations', async () => {
      const operations = [];
      
      // Mix of reads, writes, and deletes
      for (let i = 0; i < 200; i++) {
        const key = `mixed:${i % 20}`; // 20 different keys
        
        if (i % 3 === 0) {
          // Write operation
          operations.push(cacheManager.set(key, { id: i, data: `test${i}` }, 300));
        } else if (i % 3 === 1) {
          // Read operation
          operations.push(cacheManager.get(key));
        } else {
          // Delete operation
          operations.push(cacheManager.del(key));
        }
      }

      const startTime = Date.now();
      await Promise.all(operations);
      const executionTime = Date.now() - startTime;

      expect(executionTime).toBeLessThan(500); // Should handle mixed operations efficiently
      
      const stats = await cacheManager.getCacheStats();
      console.log(`Mixed operations completed in ${executionTime}ms, Final stats:`, {
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hitRate.toFixed(2) + '%'
      });
    });
  });

  describe('Cache Warming Performance', () => {
    it('should warm cache efficiently for multiple leagues', async () => {
      const warmingData = [];
      
      // Prepare warming data for 5 leagues
      for (let ligaId = 1; ligaId <= 5; ligaId++) {
        for (let saisonId = 1; saisonId <= 2; saisonId++) {
          warmingData.push({
            key: `table:liga:${ligaId}:saison:${saisonId}`,
            data: generateMockTableEntries(18)
          });
        }
      }

      const startTime = Date.now();
      
      // Simulate cache warming
      const warmingOperations = warmingData.map(item => 
        cacheManager.set(item.key, item.data, 300)
      );
      
      await Promise.all(warmingOperations);
      
      const warmingTime = Date.now() - startTime;

      expect(warmingTime).toBeLessThan(1000); // Should warm cache within 1 second
      
      const stats = await cacheManager.getCacheStats();
      expect(stats.totalKeys).toBe(10); // 5 leagues × 2 seasons
      
      console.log(`Cache warming completed in ${warmingTime}ms for ${stats.totalKeys} entries`);
    });

    it('should prioritize high-priority cache entries', async () => {
      const highPriorityData = [];
      const lowPriorityData = [];

      // High priority: current season data
      for (let ligaId = 1; ligaId <= 3; ligaId++) {
        highPriorityData.push({
          key: `table:liga:${ligaId}:saison:current`,
          data: generateMockTableEntries(16)
        });
      }

      // Low priority: historical data
      for (let ligaId = 1; ligaId <= 3; ligaId++) {
        for (let saisonId = 1; saisonId <= 5; saisonId++) {
          lowPriorityData.push({
            key: `table:liga:${ligaId}:saison:${saisonId}`,
            data: generateMockTableEntries(16)
          });
        }
      }

      // Warm high priority first
      const highPriorityStart = Date.now();
      await Promise.all(
        highPriorityData.map(item => cacheManager.set(item.key, item.data, 600))
      );
      const highPriorityTime = Date.now() - highPriorityStart;

      // Then warm low priority
      const lowPriorityStart = Date.now();
      await Promise.all(
        lowPriorityData.map(item => cacheManager.set(item.key, item.data, 300))
      );
      const lowPriorityTime = Date.now() - lowPriorityStart;

      // Verify high priority data is accessible
      const highPriorityCheck = await Promise.all(
        highPriorityData.map(item => cacheManager.get(item.key))
      );

      expect(highPriorityCheck.every(data => data !== null)).toBe(true);
      expect(highPriorityTime).toBeLessThan(200); // High priority should be fast
      
      console.log(`High priority warming: ${highPriorityTime}ms, Low priority: ${lowPriorityTime}ms`);
    });
  });
});

/**
 * Helper function to generate mock games for testing
 */
function generateMockGames(teamCount: number, gameCount: number) {
  const games = [];
  const teams = [];
  
  for (let i = 1; i <= teamCount; i++) {
    teams.push({ id: i, name: `Team ${i}` });
  }
  
  for (let i = 1; i <= gameCount; i++) {
    const heimTeam = teams[Math.floor(Math.random() * teamCount)];
    let gastTeam = teams[Math.floor(Math.random() * teamCount)];
    
    while (gastTeam.id === heimTeam.id) {
      gastTeam = teams[Math.floor(Math.random() * teamCount)];
    }
    
    games.push({
      id: i,
      heim_team: heimTeam,
      gast_team: gastTeam,
      heim_tore: Math.floor(Math.random() * 5),
      gast_tore: Math.floor(Math.random() * 5),
      status: 'beendet',
      liga: { id: 1, name: 'Test Liga' },
      saison: { id: 1, name: '2024/25' },
      spieltag: Math.floor(i / (teamCount / 2)) + 1,
      datum: new Date().toISOString()
    });
  }
  
  return games;
}

/**
 * Helper function to generate mock table entries
 */
function generateMockTableEntries(teamCount: number) {
  const entries = [];
  
  for (let i = 1; i <= teamCount; i++) {
    entries.push({
      id: i,
      team_name: `Team ${i}`,
      liga: { id: 1, name: 'Test Liga' },
      team: { id: i, name: `Team ${i}` },
      platz: i,
      spiele: Math.floor(Math.random() * 20) + 10,
      siege: Math.floor(Math.random() * 10),
      unentschieden: Math.floor(Math.random() * 5),
      niederlagen: Math.floor(Math.random() * 10),
      tore_fuer: Math.floor(Math.random() * 30) + 10,
      tore_gegen: Math.floor(Math.random() * 30) + 10,
      tordifferenz: Math.floor(Math.random() * 20) - 10,
      punkte: Math.floor(Math.random() * 30) + 10,
      last_updated: new Date(),
      auto_calculated: true,
      calculation_source: 'automatic'
    });
  }
  
  return entries;
}

/**
 * Helper function to generate large table data for memory testing
 */
function generateLargeTableData(teamCount: number) {
  const entries = generateMockTableEntries(teamCount);
  
  // Add additional data to make entries larger
  return entries.map(entry => ({
    ...entry,
    detailedStats: {
      homeGames: Math.floor(Math.random() * 15),
      awayGames: Math.floor(Math.random() * 15),
      homeWins: Math.floor(Math.random() * 8),
      awayWins: Math.floor(Math.random() * 8),
      recentForm: Array.from({ length: 10 }, () => 
        ['W', 'D', 'L'][Math.floor(Math.random() * 3)]
      ),
      monthlyStats: Array.from({ length: 12 }, (_, month) => ({
        month: month + 1,
        games: Math.floor(Math.random() * 5),
        points: Math.floor(Math.random() * 15)
      }))
    }
  }));
}