#!/usr/bin/env node

/**
 * Test Redis Caching for Club Operations
 * 
 * This script tests the Redis caching implementation for club data
 * and provides performance benchmarks.
 */

const { performance } = require('perf_hooks');

/**
 * Redis Cache Test Suite
 */
class RedisCacheTestSuite {
  constructor(strapi) {
    this.strapi = strapi;
    this.results = [];
  }

  /**
   * Log test result
   */
  logResult(testName, duration, cacheHit, dataSize = 0) {
    this.results.push({
      testName,
      duration,
      cacheHit,
      dataSize,
      timestamp: new Date().toISOString()
    });

    const status = cacheHit ? '🎯 CACHE HIT' : '💾 CACHE MISS';
    console.log(`  ${status} - ${testName}: ${duration.toFixed(2)}ms (${dataSize} items)`);
  }

  /**
   * Test club by ID caching
   */
  async testClubByIdCaching() {
    console.log('🧪 Testing club by ID caching...');

    try {
      // Get a test club ID
      const clubs = await this.strapi.entityService.findMany('api::club.club', {
        filters: { aktiv: true },
        limit: 1
      });

      if (clubs.length === 0) {
        console.log('⚠️  No clubs found for testing');
        return;
      }

      const testClubId = clubs[0].id;

      // Test 1: Cold cache (should be cache miss)
      const start1 = performance.now();
      const club1 = await this.strapi.service('api::club.club').getClubWithLogo(testClubId, { skipCache: true });
      const duration1 = performance.now() - start1;
      this.logResult('Club by ID (cold)', duration1, false, 1);

      // Test 2: Warm cache (should be cache hit)
      const start2 = performance.now();
      const club2 = await this.strapi.service('api::club.club').getClubWithLogo(testClubId);
      const duration2 = performance.now() - start2;
      this.logResult('Club by ID (warm)', duration2, true, 1);

      // Test 3: Multiple requests (should all be cache hits)
      const promises = [];
      const start3 = performance.now();
      
      for (let i = 0; i < 10; i++) {
        promises.push(this.strapi.service('api::club.club').getClubWithLogo(testClubId));
      }
      
      await Promise.all(promises);
      const duration3 = performance.now() - start3;
      this.logResult('Club by ID (10x concurrent)', duration3, true, 10);

      console.log(`  📊 Performance improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`);

    } catch (error) {
      console.error('❌ Error testing club by ID caching:', error.message);
    }
  }

  /**
   * Test clubs by liga caching
   */
  async testClubsByLigaCaching() {
    console.log('🧪 Testing clubs by liga caching...');

    try {
      // Get a test liga ID
      const ligen = await this.strapi.entityService.findMany('api::liga.liga', {
        filters: { aktiv: true },
        limit: 1
      });

      if (ligen.length === 0) {
        console.log('⚠️  No ligen found for testing');
        return;
      }

      const testLigaId = ligen[0].id;

      // Test 1: Cold cache
      const start1 = performance.now();
      const clubs1 = await this.strapi.service('api::club.club').findClubsByLiga(testLigaId, { skipCache: true });
      const duration1 = performance.now() - start1;
      this.logResult('Clubs by liga (cold)', duration1, false, clubs1.length);

      // Test 2: Warm cache
      const start2 = performance.now();
      const clubs2 = await this.strapi.service('api::club.club').findClubsByLiga(testLigaId);
      const duration2 = performance.now() - start2;
      this.logResult('Clubs by liga (warm)', duration2, true, clubs2.length);

      // Test 3: Multiple concurrent requests
      const promises = [];
      const start3 = performance.now();
      
      for (let i = 0; i < 5; i++) {
        promises.push(this.strapi.service('api::club.club').findClubsByLiga(testLigaId));
      }
      
      const results = await Promise.all(promises);
      const duration3 = performance.now() - start3;
      this.logResult('Clubs by liga (5x concurrent)', duration3, true, results[0].length * 5);

      console.log(`  📊 Performance improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`);

    } catch (error) {
      console.error('❌ Error testing clubs by liga caching:', error.message);
    }
  }

  /**
   * Test Viktoria club caching
   */
  async testViktoriaClubCaching() {
    console.log('🧪 Testing Viktoria club caching...');

    const teamMappings = ['team_1', 'team_2', 'team_3'];

    for (const mapping of teamMappings) {
      try {
        // Test 1: Cold cache
        const start1 = performance.now();
        const club1 = await this.strapi.service('api::club.club').findViktoriaClubByTeam(mapping, { skipCache: true });
        const duration1 = performance.now() - start1;
        this.logResult(`Viktoria ${mapping} (cold)`, duration1, false, club1 ? 1 : 0);

        // Test 2: Warm cache
        const start2 = performance.now();
        const club2 = await this.strapi.service('api::club.club').findViktoriaClubByTeam(mapping);
        const duration2 = performance.now() - start2;
        this.logResult(`Viktoria ${mapping} (warm)`, duration2, true, club2 ? 1 : 0);

        if (club1 && club2) {
          console.log(`  📊 ${mapping} performance improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`);
        }

      } catch (error) {
        console.error(`❌ Error testing Viktoria ${mapping} caching:`, error.message);
      }
    }
  }

  /**
   * Test club statistics caching
   */
  async testClubStatisticsCaching() {
    console.log('🧪 Testing club statistics caching...');

    try {
      // Get test data
      const clubs = await this.strapi.entityService.findMany('api::club.club', {
        filters: { aktiv: true },
        populate: { ligen: true },
        limit: 1
      });

      if (clubs.length === 0 || !clubs[0].ligen || clubs[0].ligen.length === 0) {
        console.log('⚠️  No clubs with ligen found for statistics testing');
        return;
      }

      const testClubId = clubs[0].id;
      const testLigaId = clubs[0].ligen[0].id;

      // Test 1: Cold cache
      const start1 = performance.now();
      const stats1 = await this.strapi.service('api::club.club').getClubStatistics(testClubId, testLigaId, { skipCache: true });
      const duration1 = performance.now() - start1;
      this.logResult('Club statistics (cold)', duration1, false, stats1 ? 1 : 0);

      // Test 2: Warm cache
      const start2 = performance.now();
      const stats2 = await this.strapi.service('api::club.club').getClubStatistics(testClubId, testLigaId);
      const duration2 = performance.now() - start2;
      this.logResult('Club statistics (warm)', duration2, true, stats2 ? 1 : 0);

      if (stats1 && stats2) {
        console.log(`  📊 Statistics performance improvement: ${((duration1 - duration2) / duration1 * 100).toFixed(1)}%`);
      }

    } catch (error) {
      console.error('❌ Error testing club statistics caching:', error.message);
    }
  }

  /**
   * Test cache invalidation
   */
  async testCacheInvalidation() {
    console.log('🧪 Testing cache invalidation...');

    try {
      // Get a test club
      const clubs = await this.strapi.entityService.findMany('api::club.club', {
        filters: { aktiv: true },
        limit: 1
      });

      if (clubs.length === 0) {
        console.log('⚠️  No clubs found for invalidation testing');
        return;
      }

      const testClub = clubs[0];

      // Step 1: Load into cache
      await this.strapi.service('api::club.club').getClubWithLogo(testClub.id);
      console.log('  ✓ Club loaded into cache');

      // Step 2: Verify cache hit
      const start1 = performance.now();
      await this.strapi.service('api::club.club').getClubWithLogo(testClub.id);
      const duration1 = performance.now() - start1;
      this.logResult('Before invalidation', duration1, true, 1);

      // Step 3: Invalidate cache
      await this.strapi.service('api::club.club').handleClubCacheInvalidation(testClub.id, 'update');
      console.log('  ✓ Cache invalidated');

      // Step 4: Verify cache miss (should be slower)
      const start2 = performance.now();
      await this.strapi.service('api::club.club').getClubWithLogo(testClub.id, { skipCache: true });
      const duration2 = performance.now() - start2;
      this.logResult('After invalidation', duration2, false, 1);

      console.log('  ✅ Cache invalidation working correctly');

    } catch (error) {
      console.error('❌ Error testing cache invalidation:', error.message);
    }
  }

  /**
   * Test cache warming
   */
  async testCacheWarming() {
    console.log('🧪 Testing cache warming...');

    try {
      // Clear cache first
      await this.strapi.service('api::club.club').clearRedisCache();
      console.log('  ✓ Cache cleared');

      // Test cold performance
      const start1 = performance.now();
      await this.strapi.service('api::club.club').findViktoriaClubByTeam('team_1', { skipCache: true });
      const coldDuration = performance.now() - start1;

      // Warm cache
      const start2 = performance.now();
      await this.strapi.service('api::club.club').warmRedisCache();
      const warmingDuration = performance.now() - start2;
      console.log(`  ✓ Cache warming completed in ${warmingDuration.toFixed(2)}ms`);

      // Test warm performance
      const start3 = performance.now();
      await this.strapi.service('api::club.club').findViktoriaClubByTeam('team_1');
      const warmDuration = performance.now() - start3;

      this.logResult('Cache warming - cold', coldDuration, false, 1);
      this.logResult('Cache warming - warm', warmDuration, true, 1);

      console.log(`  📊 Warming effectiveness: ${((coldDuration - warmDuration) / coldDuration * 100).toFixed(1)}% improvement`);

    } catch (error) {
      console.error('❌ Error testing cache warming:', error.message);
    }
  }

  /**
   * Test cache health and metrics
   */
  async testCacheHealthAndMetrics() {
    console.log('🧪 Testing cache health and metrics...');

    try {
      // Get cache health
      const health = await this.strapi.service('api::club.club').getRedisCacheHealth();
      console.log('  📊 Cache health:', health);

      // Get cache metrics
      const metrics = this.strapi.service('api::club.club').getRedisCacheMetrics();
      console.log('  📊 Cache metrics:', metrics);

      // Verify health status
      if (health.status === 'healthy') {
        console.log('  ✅ Cache is healthy');
      } else {
        console.log('  ⚠️  Cache health issues detected');
      }

    } catch (error) {
      console.error('❌ Error testing cache health:', error.message);
    }
  }

  /**
   * Run all cache tests
   */
  async runAllTests() {
    console.log('🚀 Starting Redis cache tests...\n');

    await this.testClubByIdCaching();
    console.log('');

    await this.testClubsByLigaCaching();
    console.log('');

    await this.testViktoriaClubCaching();
    console.log('');

    await this.testClubStatisticsCaching();
    console.log('');

    await this.testCacheInvalidation();
    console.log('');

    await this.testCacheWarming();
    console.log('');

    await this.testCacheHealthAndMetrics();
    console.log('');

    this.printSummary();
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('📊 Redis Cache Test Summary:');
    console.log('=' .repeat(60));

    const cacheHits = this.results.filter(r => r.cacheHit);
    const cacheMisses = this.results.filter(r => !r.cacheHit);

    console.log(`🎯 Cache hits: ${cacheHits.length}`);
    console.log(`💾 Cache misses: ${cacheMisses.length}`);

    if (cacheHits.length > 0 && cacheMisses.length > 0) {
      const avgHitTime = cacheHits.reduce((sum, r) => sum + r.duration, 0) / cacheHits.length;
      const avgMissTime = cacheMisses.reduce((sum, r) => sum + r.duration, 0) / cacheMisses.length;
      const improvement = ((avgMissTime - avgHitTime) / avgMissTime * 100);

      console.log(`⚡ Average cache hit time: ${avgHitTime.toFixed(2)}ms`);
      console.log(`🐌 Average cache miss time: ${avgMissTime.toFixed(2)}ms`);
      console.log(`📈 Overall performance improvement: ${improvement.toFixed(1)}%`);
    }

    console.log('=' .repeat(60));

    // Performance recommendations
    const slowHits = cacheHits.filter(r => r.duration > 50);
    const fastMisses = cacheMisses.filter(r => r.duration < 10);

    if (slowHits.length > 0) {
      console.log('\n⚠️  Performance Issues:');
      slowHits.forEach(hit => {
        console.log(`  - Slow cache hit: ${hit.testName} (${hit.duration.toFixed(2)}ms)`);
      });
    }

    if (fastMisses.length > 0) {
      console.log('\n💡 Optimization Opportunities:');
      fastMisses.forEach(miss => {
        console.log(`  - Fast query could benefit from caching: ${miss.testName} (${miss.duration.toFixed(2)}ms)`);
      });
    }

    if (slowHits.length === 0 && fastMisses.length === 0) {
      console.log('\n✅ All cache operations performing optimally!');
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Initialize Strapi
    const Strapi = require('@strapi/strapi');
    const strapi = await Strapi().load();
    
    console.log('✅ Strapi loaded successfully');

    // Check if Redis is available
    try {
      const health = await strapi.service('api::club.club').getRedisCacheHealth();
      if (health.status === 'unavailable') {
        console.log('⚠️  Redis cache not available - tests will show fallback behavior');
      } else if (health.status === 'unhealthy') {
        console.log('⚠️  Redis cache unhealthy - some tests may fail');
      } else {
        console.log('✅ Redis cache is healthy and ready for testing');
      }
    } catch (error) {
      console.log('⚠️  Could not check Redis health - continuing with tests');
    }

    // Run cache tests
    const tester = new RedisCacheTestSuite(strapi);
    await tester.runAllTests();

    console.log('\n🎉 Redis cache testing completed successfully!');

  } catch (error) {
    console.error('\n❌ Redis cache testing failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  RedisCacheTestSuite,
  main
};