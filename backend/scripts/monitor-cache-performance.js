#!/usr/bin/env node

/**
 * Cache Performance Monitor
 * 
 * Monitors Redis cache performance and provides real-time metrics
 * for club operations caching.
 */

const { performance } = require('perf_hooks');

/**
 * Cache Performance Monitor
 */
class CachePerformanceMonitor {
  constructor(strapi, options = {}) {
    this.strapi = strapi;
    this.options = {
      interval: options.interval || 30000, // 30 seconds
      alertThresholds: {
        hitRate: options.hitRateThreshold || 70, // %
        avgResponseTime: options.responseTimeThreshold || 100, // ms
        errorRate: options.errorRateThreshold || 5, // %
      },
      ...options
    };
    
    this.metrics = {
      samples: [],
      alerts: [],
      startTime: Date.now()
    };
    
    this.monitoringInterval = null;
  }

  /**
   * Start monitoring
   */
  start() {
    console.log('🔍 Starting cache performance monitoring...');
    console.log(`📊 Monitoring interval: ${this.options.interval / 1000}s`);
    console.log('📈 Alert thresholds:', this.options.alertThresholds);
    console.log('');

    // Initial sample
    this.collectSample();

    // Start periodic monitoring
    this.monitoringInterval = setInterval(() => {
      this.collectSample();
    }, this.options.interval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.stop();
      process.exit(0);
    });
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    console.log('\n🛑 Cache monitoring stopped');
    this.printFinalReport();
  }

  /**
   * Collect performance sample
   */
  async collectSample() {
    const timestamp = new Date();
    const sample = {
      timestamp,
      redis: await this.collectRedisMetrics(),
      performance: await this.collectPerformanceMetrics(),
      health: await this.collectHealthMetrics()
    };

    this.metrics.samples.push(sample);
    
    // Keep only last 100 samples
    if (this.metrics.samples.length > 100) {
      this.metrics.samples.shift();
    }

    this.analyzeSample(sample);
    this.displaySample(sample);
  }

  /**
   * Collect Redis-specific metrics
   */
  async collectRedisMetrics() {
    try {
      const cacheService = this.strapi.service('api::club.club');
      const health = await cacheService.getRedisCacheHealth();
      const metrics = cacheService.getRedisCacheMetrics();

      return {
        status: health.status,
        latency: health.latency,
        memory: health.memory,
        connections: health.connections,
        uptime: health.uptime,
        version: health.version,
        hitRate: metrics.hitRate || 0,
        hits: metrics.hits || 0,
        misses: metrics.misses || 0,
        totalRequests: metrics.totalRequests || 0,
        errors: metrics.errors || 0
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        latency: -1,
        hitRate: 0,
        hits: 0,
        misses: 0,
        totalRequests: 0,
        errors: 1
      };
    }
  }

  /**
   * Collect performance metrics through test queries
   */
  async collectPerformanceMetrics() {
    const metrics = {
      clubById: await this.measureOperation('getClubWithLogo'),
      clubsByLiga: await this.measureOperation('findClubsByLiga'),
      viktoriaClub: await this.measureOperation('findViktoriaClubByTeam'),
      statistics: await this.measureOperation('getClubStatistics')
    };

    return metrics;
  }

  /**
   * Measure operation performance
   */
  async measureOperation(operation) {
    try {
      const cacheService = this.strapi.service('api::club.club');
      let duration = 0;
      let success = false;

      const start = performance.now();

      switch (operation) {
        case 'getClubWithLogo':
          // Get first active club
          const clubs = await this.strapi.entityService.findMany('api::club.club', {
            filters: { aktiv: true },
            limit: 1
          });
          if (clubs.length > 0) {
            await cacheService.getClubWithLogo(clubs[0].id);
            success = true;
          }
          break;

        case 'findClubsByLiga':
          // Get first active liga
          const ligen = await this.strapi.entityService.findMany('api::liga.liga', {
            filters: { aktiv: true },
            limit: 1
          });
          if (ligen.length > 0) {
            await cacheService.findClubsByLiga(ligen[0].id);
            success = true;
          }
          break;

        case 'findViktoriaClubByTeam':
          await cacheService.findViktoriaClubByTeam('team_1');
          success = true;
          break;

        case 'getClubStatistics':
          // Get test data
          const testClubs = await this.strapi.entityService.findMany('api::club.club', {
            filters: { aktiv: true },
            populate: { ligen: true },
            limit: 1
          });
          if (testClubs.length > 0 && testClubs[0].ligen && testClubs[0].ligen.length > 0) {
            await cacheService.getClubStatistics(testClubs[0].id, testClubs[0].ligen[0].id);
            success = true;
          }
          break;
      }

      duration = performance.now() - start;

      return {
        duration,
        success,
        error: null
      };

    } catch (error) {
      return {
        duration: -1,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Collect health metrics
   */
  async collectHealthMetrics() {
    try {
      // Database connection test
      const dbStart = performance.now();
      await this.strapi.db.connection.raw('SELECT 1');
      const dbLatency = performance.now() - dbStart;

      // Memory usage
      const memUsage = process.memoryUsage();

      return {
        database: {
          latency: dbLatency,
          status: 'healthy'
        },
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024) // MB
        },
        uptime: process.uptime()
      };
    } catch (error) {
      return {
        database: {
          latency: -1,
          status: 'error',
          error: error.message
        },
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };
    }
  }

  /**
   * Analyze sample for alerts
   */
  analyzeSample(sample) {
    const alerts = [];

    // Check Redis health
    if (sample.redis.status !== 'healthy') {
      alerts.push({
        type: 'redis_health',
        severity: 'critical',
        message: `Redis status: ${sample.redis.status}`,
        value: sample.redis.status
      });
    }

    // Check hit rate
    if (sample.redis.hitRate < this.options.alertThresholds.hitRate) {
      alerts.push({
        type: 'low_hit_rate',
        severity: 'warning',
        message: `Low cache hit rate: ${sample.redis.hitRate.toFixed(1)}%`,
        value: sample.redis.hitRate,
        threshold: this.options.alertThresholds.hitRate
      });
    }

    // Check response times
    const avgResponseTime = this.calculateAverageResponseTime(sample.performance);
    if (avgResponseTime > this.options.alertThresholds.avgResponseTime) {
      alerts.push({
        type: 'slow_response',
        severity: 'warning',
        message: `Slow average response time: ${avgResponseTime.toFixed(2)}ms`,
        value: avgResponseTime,
        threshold: this.options.alertThresholds.avgResponseTime
      });
    }

    // Check error rate
    const errorRate = this.calculateErrorRate(sample.performance);
    if (errorRate > this.options.alertThresholds.errorRate) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `High error rate: ${errorRate.toFixed(1)}%`,
        value: errorRate,
        threshold: this.options.alertThresholds.errorRate
      });
    }

    // Store alerts
    alerts.forEach(alert => {
      alert.timestamp = sample.timestamp;
      this.metrics.alerts.push(alert);
      this.displayAlert(alert);
    });
  }

  /**
   * Calculate average response time
   */
  calculateAverageResponseTime(performance) {
    const operations = Object.values(performance);
    const validOperations = operations.filter(op => op.success && op.duration > 0);
    
    if (validOperations.length === 0) return 0;
    
    const totalTime = validOperations.reduce((sum, op) => sum + op.duration, 0);
    return totalTime / validOperations.length;
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate(performance) {
    const operations = Object.values(performance);
    const totalOperations = operations.length;
    const failedOperations = operations.filter(op => !op.success).length;
    
    if (totalOperations === 0) return 0;
    
    return (failedOperations / totalOperations) * 100;
  }

  /**
   * Display current sample
   */
  displaySample(sample) {
    const time = sample.timestamp.toLocaleTimeString();
    
    console.log(`\n⏰ ${time} - Cache Performance Sample`);
    console.log('─'.repeat(50));
    
    // Redis metrics
    const redisStatus = this.getStatusIcon(sample.redis.status);
    console.log(`${redisStatus} Redis: ${sample.redis.status} | Latency: ${sample.redis.latency}ms | Memory: ${sample.redis.memory}`);
    console.log(`🎯 Hit Rate: ${sample.redis.hitRate.toFixed(1)}% (${sample.redis.hits}/${sample.redis.totalRequests})`);
    
    // Performance metrics
    console.log('⚡ Operation Performance:');
    Object.entries(sample.performance).forEach(([op, metrics]) => {
      const status = metrics.success ? '✅' : '❌';
      const duration = metrics.success ? `${metrics.duration.toFixed(2)}ms` : 'FAILED';
      console.log(`  ${status} ${op}: ${duration}`);
    });
    
    // Health metrics
    console.log(`💾 Memory: ${sample.health.memory.heapUsed}MB / ${sample.health.memory.heapTotal}MB`);
    console.log(`🗄️  Database: ${sample.health.database.latency.toFixed(2)}ms`);
  }

  /**
   * Display alert
   */
  displayAlert(alert) {
    const severityIcon = alert.severity === 'critical' ? '🚨' : '⚠️';
    const time = alert.timestamp.toLocaleTimeString();
    
    console.log(`\n${severityIcon} ALERT [${alert.severity.toUpperCase()}] ${time}`);
    console.log(`   ${alert.message}`);
    
    if (alert.threshold) {
      console.log(`   Threshold: ${alert.threshold}, Current: ${alert.value}`);
    }
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      case 'unavailable': return '🔌';
      default: return '❓';
    }
  }

  /**
   * Print final report
   */
  printFinalReport() {
    const duration = Date.now() - this.metrics.startTime;
    const samples = this.metrics.samples.length;
    const alerts = this.metrics.alerts.length;

    console.log('\n📊 Final Cache Performance Report');
    console.log('═'.repeat(60));
    console.log(`⏱️  Monitoring duration: ${Math.round(duration / 1000)}s`);
    console.log(`📈 Samples collected: ${samples}`);
    console.log(`🚨 Alerts generated: ${alerts}`);

    if (samples > 0) {
      // Calculate averages
      const avgHitRate = this.metrics.samples.reduce((sum, s) => sum + s.redis.hitRate, 0) / samples;
      const avgLatency = this.metrics.samples.reduce((sum, s) => sum + s.redis.latency, 0) / samples;
      
      console.log(`🎯 Average hit rate: ${avgHitRate.toFixed(1)}%`);
      console.log(`⚡ Average Redis latency: ${avgLatency.toFixed(2)}ms`);

      // Performance summary
      const performanceOps = ['clubById', 'clubsByLiga', 'viktoriaClub', 'statistics'];
      console.log('\n⚡ Operation Performance Summary:');
      
      performanceOps.forEach(op => {
        const opSamples = this.metrics.samples
          .map(s => s.performance[op])
          .filter(p => p.success && p.duration > 0);
        
        if (opSamples.length > 0) {
          const avgDuration = opSamples.reduce((sum, p) => sum + p.duration, 0) / opSamples.length;
          const successRate = (opSamples.length / samples) * 100;
          console.log(`  ${op}: ${avgDuration.toFixed(2)}ms avg (${successRate.toFixed(1)}% success)`);
        }
      });
    }

    // Alert summary
    if (alerts > 0) {
      console.log('\n🚨 Alert Summary:');
      const alertTypes = {};
      this.metrics.alerts.forEach(alert => {
        alertTypes[alert.type] = (alertTypes[alert.type] || 0) + 1;
      });
      
      Object.entries(alertTypes).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} occurrences`);
      });
    }

    console.log('═'.repeat(60));
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace('--', '');
      const value = args[i + 1];
      
      switch (key) {
        case 'interval':
          options.interval = parseInt(value) * 1000; // Convert to ms
          break;
        case 'hit-rate-threshold':
          options.hitRateThreshold = parseFloat(value);
          break;
        case 'response-time-threshold':
          options.responseTimeThreshold = parseFloat(value);
          break;
        case 'error-rate-threshold':
          options.errorRateThreshold = parseFloat(value);
          break;
      }
    }

    // Initialize Strapi
    const Strapi = require('@strapi/strapi');
    const strapi = await Strapi().load();
    
    console.log('✅ Strapi loaded successfully');

    // Check cache availability
    try {
      const health = await strapi.service('api::club.club').getRedisCacheHealth();
      console.log(`📊 Initial cache status: ${health.status}`);
    } catch (error) {
      console.log('⚠️  Could not check initial cache status');
    }

    // Start monitoring
    const monitor = new CachePerformanceMonitor(strapi, options);
    monitor.start();

    // Keep process alive
    console.log('Press Ctrl+C to stop monitoring\n');

  } catch (error) {
    console.error('\n❌ Cache monitoring failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  console.log('🔍 Cache Performance Monitor');
  console.log('Usage: node monitor-cache-performance.js [options]');
  console.log('Options:');
  console.log('  --interval <seconds>           Monitoring interval (default: 30)');
  console.log('  --hit-rate-threshold <percent> Hit rate alert threshold (default: 70)');
  console.log('  --response-time-threshold <ms> Response time alert threshold (default: 100)');
  console.log('  --error-rate-threshold <percent> Error rate alert threshold (default: 5)');
  console.log('');

  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  CachePerformanceMonitor,
  main
};