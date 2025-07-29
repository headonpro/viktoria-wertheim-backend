#!/usr/bin/env node

/**
 * Club Performance Benchmarking Tool
 * 
 * Runs comprehensive performance benchmarks for club operations
 * and establishes baseline performance metrics.
 */

const { performance } = require('perf_hooks');

/**
 * Performance Benchmark Suite
 */
class ClubPerformanceBenchmark {
  constructor(strapi) {
    this.strapi = strapi;
    this.results = [];
    this.config = {
      warmupRuns: 3,
      benchmarkRuns: 10,
      concurrentUsers: [1, 5, 10, 20],
      dataSetSizes: ['small', 'medium', 'large']
    };
  }

  /**
   * Run complete benchmark suite
   */
  async runBenchmarks() {
    console.log('🏁 Starting Club Performance Benchmarks');
    console.log('=' .repeat(60));
    console.log(`Configuration:`);
    console.log(`  Warmup runs: ${this.config.warmupRuns}`);
    console.log(`  Benchmark runs: ${this.config.benchmarkRuns}`);
    console.log(`  Concurrent users: ${this.config.concurrentUsers.join(', ')}`);
    console.log(`  Data set sizes: ${this.config.dataSetSizes.join(', ')}`);
    console.log('');

    // Initialize performance monitor
    const performanceMonitor = this.strapi.service('api::club.club').performanceMonitor;
    if (performanceMonitor) {
      performanceMonitor.startMonitoring(5000); // 5 second intervals during benchmarking
    }

    try {
      // Single-user benchmarks
      await this.runSingleUserBenchmarks();
      
      // Concurrent user benchmarks
      await this.runConcurrentUserBenchmarks();
      
      // Data size impact benchmarks
      await this.runDataSizeBenchmarks();
      
      // Cache performance benchmarks
      await this.runCachePerformanceBenchmarks();
      
      // Database optimization benchmarks
      await this.runDatabaseOptimizationBenchmarks();

    } finally {
      if (performanceMonitor) {
        performanceMonitor.stopMonitoring();
      }
    }

    this.generateReport();
  }

  /**
   * Run single-user performance benchmarks
   */
  async runSingleUserBenchmarks() {
    console.log('👤 Single User Performance Benchmarks');
    console.log('-' .repeat(40));

    const operations = [
      {
        name: 'findClubsByLiga',
        setup: async () => {
          const ligen = await this.strapi.entityService.findMany('api::liga.liga', {
            filters: { aktiv: true },
            limit: 1
          });
          return ligen.length > 0 ? ligen[0].id : null;
        },
        execute: async (ligaId) => {
          if (!ligaId) return null;
          return await this.strapi.service('api::club.club').findClubsByLiga(ligaId);
        }
      },
      {
        name: 'findViktoriaClubByTeam',
        setup: async () => 'team_1',
        execute: async (teamMapping) => {
          return await this.strapi.service('api::club.club').findViktoriaClubByTeam(teamMapping);
        }
      },
      {
        name: 'getClubWithLogo',
        setup: async () => {
          const clubs = await this.strapi.entityService.findMany('api::club.club', {
            filters: { aktiv: true },
            limit: 1
          });
          return clubs.length > 0 ? clubs[0].id : null;
        },
        execute: async (clubId) => {
          if (!clubId) return null;
          return await this.strapi.service('api::club.club').getClubWithLogo(clubId);
        }
      },
      {
        name: 'validateClubInLiga',
        setup: async () => {
          const clubs = await this.strapi.entityService.findMany('api::club.club', {
            filters: { aktiv: true },
            populate: { ligen: true },
            limit: 1
          });
          if (clubs.length > 0 && clubs[0].ligen && clubs[0].ligen.length > 0) {
            return { clubId: clubs[0].id, ligaId: clubs[0].ligen[0].id };
          }
          return null;
        },
        execute: async (params) => {
          if (!params) return false;
          return await this.strapi.service('api::club.club').validateClubInLiga(params.clubId, params.ligaId);
        }
      }
    ];

    for (const operation of operations) {
      await this.benchmarkOperation(operation, 'single-user');
    }
  }

  /**
   * Run concurrent user benchmarks
   */
  async runConcurrentUserBenchmarks() {
    console.log('\n👥 Concurrent User Performance Benchmarks');
    console.log('-' .repeat(40));

    const operation = {
      name: 'findClubsByLiga_concurrent',
      setup: async () => {
        const ligen = await this.strapi.entityService.findMany('api::liga.liga', {
          filters: { aktiv: true },
          limit: 1
        });
        return ligen.length > 0 ? ligen[0].id : null;
      },
      execute: async (ligaId) => {
        if (!ligaId) return null;
        return await this.strapi.service('api::club.club').findClubsByLiga(ligaId);
      }
    };

    for (const concurrentUsers of this.config.concurrentUsers) {
      await this.benchmarkConcurrentOperation(operation, concurrentUsers);
    }
  }

  /**
   * Run data size impact benchmarks
   */
  async runDataSizeBenchmarks() {
    console.log('\n📊 Data Size Impact Benchmarks');
    console.log('-' .repeat(40));

    // This would require different data sets, for now we'll simulate
    const operation = {
      name: 'findClubsByLiga_datasize',
      setup: async () => {
        const ligen = await this.strapi.entityService.findMany('api::liga.liga', {
          filters: { aktiv: true }
        });
        return ligen;
      },
      execute: async (ligen, size) => {
        const ligaCount = size === 'small' ? 1 : size === 'medium' ? Math.min(3, ligen.length) : ligen.length;
        const promises = [];
        
        for (let i = 0; i < ligaCount && i < ligen.length; i++) {
          promises.push(this.strapi.service('api::club.club').findClubsByLiga(ligen[i].id));
        }
        
        return await Promise.all(promises);
      }
    };

    const ligen = await operation.setup();
    
    for (const size of this.config.dataSetSizes) {
      console.log(`\n📈 Testing ${size} data set...`);
      
      const results = [];
      
      // Warmup
      for (let i = 0; i < this.config.warmupRuns; i++) {
        await operation.execute(ligen, size);
      }
      
      // Benchmark
      for (let i = 0; i < this.config.benchmarkRuns; i++) {
        const start = performance.now();
        await operation.execute(ligen, size);
        const duration = performance.now() - start;
        results.push(duration);
      }
      
      const stats = this.calculateStats(results);
      console.log(`  ${size}: ${stats.mean.toFixed(2)}ms ±${stats.stdDev.toFixed(2)}ms (min: ${stats.min.toFixed(2)}ms, max: ${stats.max.toFixed(2)}ms)`);
      
      this.results.push({
        operation: `${operation.name}_${size}`,
        type: 'data-size',
        size,
        ...stats
      });
    }
  }

  /**
   * Run cache performance benchmarks
   */
  async runCachePerformanceBenchmarks() {
    console.log('\n🎯 Cache Performance Benchmarks');
    console.log('-' .repeat(40));

    const cacheOperations = [
      {
        name: 'cache_cold_vs_warm',
        test: async () => {
          // Get test data
          const clubs = await this.strapi.entityService.findMany('api::club.club', {
            filters: { aktiv: true },
            limit: 1
          });
          
          if (clubs.length === 0) return null;
          
          const clubId = clubs[0].id;
          const cacheService = this.strapi.service('api::club.club');
          
          // Clear cache
          await cacheService.clearRedisCache();
          
          // Cold cache test
          const coldStart = performance.now();
          await cacheService.getClubWithLogo(clubId, { skipCache: true });
          const coldDuration = performance.now() - coldStart;
          
          // Warm cache test
          const warmStart = performance.now();
          await cacheService.getClubWithLogo(clubId);
          const warmDuration = performance.now() - warmStart;
          
          return {
            cold: coldDuration,
            warm: warmDuration,
            improvement: ((coldDuration - warmDuration) / coldDuration) * 100
          };
        }
      },
      {
        name: 'cache_hit_rate_under_load',
        test: async () => {
          const cacheService = this.strapi.service('api::club.club');
          
          // Warm cache
          await cacheService.warmRedisCache();
          
          // Get initial metrics
          const initialMetrics = cacheService.getRedisCacheMetrics();
          
          // Generate load
          const promises = [];
          for (let i = 0; i < 50; i++) {
            promises.push(cacheService.findViktoriaClubByTeam('team_1'));
            promises.push(cacheService.findViktoriaClubByTeam('team_2'));
            promises.push(cacheService.findViktoriaClubByTeam('team_3'));
          }
          
          const start = performance.now();
          await Promise.all(promises);
          const duration = performance.now() - start;
          
          // Get final metrics
          const finalMetrics = cacheService.getRedisCacheMetrics();
          
          const hitsDelta = finalMetrics.hits - initialMetrics.hits;
          const totalDelta = finalMetrics.totalRequests - initialMetrics.totalRequests;
          const hitRate = totalDelta > 0 ? (hitsDelta / totalDelta) * 100 : 0;
          
          return {
            duration,
            requests: totalDelta,
            hitRate,
            avgResponseTime: duration / promises.length
          };
        }
      }
    ];

    for (const operation of cacheOperations) {
      console.log(`\n🧪 Testing ${operation.name}...`);
      
      try {
        const result = await operation.test();
        
        if (result) {
          console.log(`  Result:`, result);
          this.results.push({
            operation: operation.name,
            type: 'cache',
            ...result
          });
        } else {
          console.log(`  ⚠️  Test skipped (no test data)`);
        }
      } catch (error) {
        console.log(`  ❌ Test failed: ${error.message}`);
      }
    }
  }

  /**
   * Run database optimization benchmarks
   */
  async runDatabaseOptimizationBenchmarks() {
    console.log('\n🗄️  Database Optimization Benchmarks');
    console.log('-' .repeat(40));

    const dbOperations = [
      {
        name: 'materialized_view_vs_query',
        test: async () => {
          // Test materialized view performance
          const mvStart = performance.now();
          const mvResult = await this.strapi.db.connection.raw(`
            SELECT * FROM club_liga_stats LIMIT 10;
          `);
          const mvDuration = performance.now() - mvStart;
          
          // Test equivalent complex query
          const queryStart = performance.now();
          const queryResult = await this.strapi.db.connection.raw(`
            SELECT 
              c.id as club_id,
              c.name as club_name,
              c.kurz_name,
              l.id as liga_id,
              l.name as liga_name,
              COUNT(s.id) as total_spiele
            FROM clubs c
            JOIN clubs_ligen_links cll ON c.id = cll.club_id
            JOIN ligen l ON cll.liga_id = l.id
            LEFT JOIN spiele s ON (s.heim_club_id = c.id OR s.gast_club_id = c.id) AND s.liga_id = l.id
            WHERE c.aktiv = true
            GROUP BY c.id, c.name, c.kurz_name, l.id, l.name
            LIMIT 10;
          `);
          const queryDuration = performance.now() - queryStart;
          
          return {
            materializedView: mvDuration,
            complexQuery: queryDuration,
            improvement: ((queryDuration - mvDuration) / queryDuration) * 100,
            mvRows: mvResult.rows.length,
            queryRows: queryResult.rows.length
          };
        }
      },
      {
        name: 'index_performance',
        test: async () => {
          // Test indexed vs non-indexed query performance
          const indexedStart = performance.now();
          await this.strapi.db.connection.raw(`
            SELECT * FROM clubs WHERE club_typ = 'viktoria_verein' AND aktiv = true;
          `);
          const indexedDuration = performance.now() - indexedStart;
          
          // Test query that should use indexes
          const optimizedStart = performance.now();
          await this.strapi.db.connection.raw(`
            SELECT c.* FROM clubs c
            JOIN clubs_ligen_links cll ON c.id = cll.club_id
            WHERE cll.liga_id = 1 AND c.aktiv = true;
          `);
          const optimizedDuration = performance.now() - optimizedStart;
          
          return {
            indexedQuery: indexedDuration,
            optimizedQuery: optimizedDuration
          };
        }
      }
    ];

    for (const operation of dbOperations) {
      console.log(`\n🧪 Testing ${operation.name}...`);
      
      try {
        const result = await operation.test();
        console.log(`  Result:`, result);
        
        this.results.push({
          operation: operation.name,
          type: 'database',
          ...result
        });
      } catch (error) {
        console.log(`  ❌ Test failed: ${error.message}`);
      }
    }
  }

  /**
   * Benchmark a single operation
   */
  async benchmarkOperation(operation, type) {
    console.log(`\n🧪 Benchmarking ${operation.name}...`);
    
    try {
      const setupResult = await operation.setup();
      
      if (setupResult === null) {
        console.log(`  ⚠️  Skipped (no test data available)`);
        return;
      }
      
      // Warmup
      for (let i = 0; i < this.config.warmupRuns; i++) {
        await operation.execute(setupResult);
      }
      
      // Benchmark
      const results = [];
      for (let i = 0; i < this.config.benchmarkRuns; i++) {
        const start = performance.now();
        await operation.execute(setupResult);
        const duration = performance.now() - start;
        results.push(duration);
      }
      
      const stats = this.calculateStats(results);
      console.log(`  ${stats.mean.toFixed(2)}ms ±${stats.stdDev.toFixed(2)}ms (min: ${stats.min.toFixed(2)}ms, max: ${stats.max.toFixed(2)}ms)`);
      
      this.results.push({
        operation: operation.name,
        type,
        ...stats
      });
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
  }

  /**
   * Benchmark concurrent operation
   */
  async benchmarkConcurrentOperation(operation, concurrentUsers) {
    console.log(`\n🧪 Benchmarking ${operation.name} with ${concurrentUsers} concurrent users...`);
    
    try {
      const setupResult = await operation.setup();
      
      if (setupResult === null) {
        console.log(`  ⚠️  Skipped (no test data available)`);
        return;
      }
      
      // Warmup
      for (let i = 0; i < this.config.warmupRuns; i++) {
        const promises = [];
        for (let j = 0; j < concurrentUsers; j++) {
          promises.push(operation.execute(setupResult));
        }
        await Promise.all(promises);
      }
      
      // Benchmark
      const results = [];
      for (let i = 0; i < this.config.benchmarkRuns; i++) {
        const promises = [];
        const start = performance.now();
        
        for (let j = 0; j < concurrentUsers; j++) {
          promises.push(operation.execute(setupResult));
        }
        
        await Promise.all(promises);
        const duration = performance.now() - start;
        results.push(duration);
      }
      
      const stats = this.calculateStats(results);
      const avgPerUser = stats.mean / concurrentUsers;
      
      console.log(`  Total: ${stats.mean.toFixed(2)}ms ±${stats.stdDev.toFixed(2)}ms`);
      console.log(`  Per user: ${avgPerUser.toFixed(2)}ms`);
      console.log(`  Throughput: ${(concurrentUsers / (stats.mean / 1000)).toFixed(2)} req/sec`);
      
      this.results.push({
        operation: `${operation.name}_${concurrentUsers}users`,
        type: 'concurrent',
        concurrentUsers,
        totalDuration: stats.mean,
        perUserDuration: avgPerUser,
        throughput: concurrentUsers / (stats.mean / 1000),
        ...stats
      });
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
  }

  /**
   * Calculate statistics for results
   */
  calculateStats(values) {
    const sorted = values.sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      min: Math.min(...values),
      max: Math.max(...values),
      stdDev,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Generate comprehensive benchmark report
   */
  generateReport() {
    console.log('\n📊 Performance Benchmark Report');
    console.log('═' .repeat(80));
    
    // Group results by type
    const resultsByType = {};
    this.results.forEach(result => {
      if (!resultsByType[result.type]) {
        resultsByType[result.type] = [];
      }
      resultsByType[result.type].push(result);
    });
    
    // Single-user performance
    if (resultsByType['single-user']) {
      console.log('\n👤 Single User Performance');
      console.log('-' .repeat(40));
      
      resultsByType['single-user'].forEach(result => {
        const status = this.getPerformanceStatus(result.mean);
        console.log(`${status} ${result.operation}: ${result.mean.toFixed(2)}ms (p95: ${result.p95.toFixed(2)}ms)`);
      });
    }
    
    // Concurrent user performance
    if (resultsByType['concurrent']) {
      console.log('\n👥 Concurrent User Performance');
      console.log('-' .repeat(40));
      
      resultsByType['concurrent'].forEach(result => {
        const status = this.getPerformanceStatus(result.perUserDuration);
        console.log(`${status} ${result.concurrentUsers} users: ${result.perUserDuration.toFixed(2)}ms/user (${result.throughput.toFixed(2)} req/sec)`);
      });
    }
    
    // Cache performance
    if (resultsByType['cache']) {
      console.log('\n🎯 Cache Performance');
      console.log('-' .repeat(40));
      
      resultsByType['cache'].forEach(result => {
        if (result.operation === 'cache_cold_vs_warm') {
          const status = result.improvement > 50 ? '🟢' : result.improvement > 20 ? '🟡' : '🔴';
          console.log(`${status} Cold vs Warm: ${result.improvement.toFixed(1)}% improvement (${result.cold.toFixed(2)}ms → ${result.warm.toFixed(2)}ms)`);
        } else if (result.operation === 'cache_hit_rate_under_load') {
          const status = result.hitRate > 90 ? '🟢' : result.hitRate > 70 ? '🟡' : '🔴';
          console.log(`${status} Hit rate under load: ${result.hitRate.toFixed(1)}% (${result.avgResponseTime.toFixed(2)}ms avg)`);
        }
      });
    }
    
    // Database performance
    if (resultsByType['database']) {
      console.log('\n🗄️  Database Performance');
      console.log('-' .repeat(40));
      
      resultsByType['database'].forEach(result => {
        if (result.operation === 'materialized_view_vs_query') {
          const status = result.improvement > 50 ? '🟢' : result.improvement > 20 ? '🟡' : '🔴';
          console.log(`${status} Materialized view improvement: ${result.improvement.toFixed(1)}% (${result.complexQuery.toFixed(2)}ms → ${result.materializedView.toFixed(2)}ms)`);
        } else if (result.operation === 'index_performance') {
          console.log(`🟢 Indexed query: ${result.indexedQuery.toFixed(2)}ms`);
          console.log(`🟢 Optimized query: ${result.optimizedQuery.toFixed(2)}ms`);
        }
      });
    }
    
    // Performance recommendations
    console.log('\n💡 Performance Recommendations');
    console.log('-' .repeat(40));
    
    const recommendations = this.generateRecommendations();
    recommendations.forEach(rec => {
      console.log(`${rec.priority} ${rec.message}`);
    });
    
    // Export results
    console.log('\n📁 Exporting Results');
    console.log('-' .repeat(40));
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `club-performance-benchmark-${timestamp}.json`;
    
    require('fs').writeFileSync(filename, JSON.stringify({
      timestamp: new Date().toISOString(),
      config: this.config,
      results: this.results,
      recommendations
    }, null, 2));
    
    console.log(`✅ Results exported to: ${filename}`);
    
    console.log('\n🎉 Benchmark completed successfully!');
  }

  /**
   * Get performance status icon
   */
  getPerformanceStatus(duration) {
    if (duration < 50) return '🟢';
    if (duration < 100) return '🟡';
    if (duration < 200) return '🟠';
    return '🔴';
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Check single-user performance
    const singleUserResults = this.results.filter(r => r.type === 'single-user');
    const slowOperations = singleUserResults.filter(r => r.mean > 100);
    
    if (slowOperations.length > 0) {
      recommendations.push({
        priority: '🔴',
        message: `${slowOperations.length} operations are slower than 100ms: ${slowOperations.map(r => r.operation).join(', ')}`
      });
    }
    
    // Check cache performance
    const cacheResults = this.results.filter(r => r.type === 'cache');
    const coldWarmResult = cacheResults.find(r => r.operation === 'cache_cold_vs_warm');
    
    if (coldWarmResult && coldWarmResult.improvement < 30) {
      recommendations.push({
        priority: '🟡',
        message: `Cache improvement is only ${coldWarmResult.improvement.toFixed(1)}% - consider optimizing cache strategy`
      });
    }
    
    const hitRateResult = cacheResults.find(r => r.operation === 'cache_hit_rate_under_load');
    if (hitRateResult && hitRateResult.hitRate < 80) {
      recommendations.push({
        priority: '🟡',
        message: `Cache hit rate under load is ${hitRateResult.hitRate.toFixed(1)}% - consider cache warming or TTL optimization`
      });
    }
    
    // Check concurrent performance
    const concurrentResults = this.results.filter(r => r.type === 'concurrent');
    const highConcurrencyResult = concurrentResults.find(r => r.concurrentUsers >= 20);
    
    if (highConcurrencyResult && highConcurrencyResult.perUserDuration > 200) {
      recommendations.push({
        priority: '🔴',
        message: `Performance degrades significantly under high concurrency (${highConcurrencyResult.perUserDuration.toFixed(2)}ms per user with ${highConcurrencyResult.concurrentUsers} users)`
      });
    }
    
    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push({
        priority: '🟢',
        message: 'All performance metrics are within acceptable ranges'
      });
    }
    
    recommendations.push({
      priority: '💡',
      message: 'Consider running benchmarks regularly to track performance trends'
    });
    
    return recommendations;
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
    
    // Run benchmarks
    const benchmark = new ClubPerformanceBenchmark(strapi);
    await benchmark.runBenchmarks();
    
  } catch (error) {
    console.error('\n❌ Benchmarking failed:', error.message);
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
  ClubPerformanceBenchmark,
  main
};