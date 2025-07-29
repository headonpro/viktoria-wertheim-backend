#!/usr/bin/env node

/**
 * Club System Diagnostic Tool
 * 
 * Comprehensive diagnostic tool for identifying and troubleshooting
 * club system issues, performance problems, and data inconsistencies.
 */

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Initialize Strapi programmatically
async function initializeStrapi() {
  const Strapi = require('@strapi/strapi');
  const strapi = Strapi({
    dir: path.resolve(__dirname, '..'),
    autoReload: false,
    serveAdminPanel: false,
  });

  await strapi.load();
  return strapi;
}

class ClubDiagnosticsManager {
  constructor(strapi) {
    this.strapi = strapi;
    this.diagnostics = {
      timestamp: new Date().toISOString(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        cpus: os.cpus().length,
        loadAverage: os.loadavg()
      },
      checks: [],
      issues: [],
      warnings: [],
      recommendations: [],
      summary: {}
    };
  }

  /**
   * Log diagnostic check result
   */
  logCheck(checkName, status, details = {}) {
    const check = {
      name: checkName,
      status, // 'pass', 'fail', 'warning'
      timestamp: new Date().toISOString(),
      details
    };

    this.diagnostics.checks.push(check);

    if (status === 'fail') {
      this.diagnostics.issues.push(check);
      console.error(`❌ ${checkName}: ${details.message || 'Check failed'}`);
    } else if (status === 'warning') {
      this.diagnostics.warnings.push(check);
      console.warn(`⚠️  ${checkName}: ${details.message || 'Warning'}`);
    } else {
      console.log(`✅ ${checkName}: ${details.message || 'Check passed'}`);
    }

    return check;
  }

  /**
   * Add recommendation
   */
  addRecommendation(category, priority, message, action = null) {
    const recommendation = {
      category,
      priority, // 'high', 'medium', 'low'
      message,
      action,
      timestamp: new Date().toISOString()
    };

    this.diagnostics.recommendations.push(recommendation);
    
    const icon = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
    console.log(`${icon} [${priority.toUpperCase()}] ${category}: ${message}`);
    
    if (action) {
      console.log(`   Action: ${action}`);
    }
  }

  /**
   * Check database connectivity and performance
   */
  async checkDatabaseHealth() {
    try {
      console.log('\n🔍 Checking database health...');

      // Test basic connectivity
      const startTime = Date.now();
      const result = await this.strapi.db.connection.raw('SELECT 1 as test');
      const responseTime = Date.now() - startTime;

      if (result.rows && result.rows[0].test === 1) {
        this.logCheck('database_connectivity', 'pass', {
          message: `Database connected successfully (${responseTime}ms)`,
          responseTime
        });
      } else {
        this.logCheck('database_connectivity', 'fail', {
          message: 'Database connectivity test failed',
          responseTime
        });
      }

      // Check response time
      if (responseTime > 1000) {
        this.addRecommendation('performance', 'high', 
          `Database response time is slow (${responseTime}ms)`,
          'Check database server performance and network connectivity'
        );
      } else if (responseTime > 500) {
        this.addRecommendation('performance', 'medium',
          `Database response time is elevated (${responseTime}ms)`,
          'Monitor database performance and consider optimization'
        );
      }

      // Check database version
      const versionResult = await this.strapi.db.connection.raw('SELECT version()');
      const version = versionResult.rows[0].version;
      
      this.logCheck('database_version', 'pass', {
        message: `Database version: ${version}`,
        version
      });

      // Check connection pool status
      const pool = this.strapi.db.connection.pool;
      if (pool) {
        const poolStats = {
          size: pool.size,
          used: pool.used,
          waiting: pool.pending,
          min: pool.min,
          max: pool.max
        };

        this.logCheck('connection_pool', 'pass', {
          message: `Connection pool: ${poolStats.used}/${poolStats.size} used`,
          poolStats
        });

        if (poolStats.used / poolStats.size > 0.8) {
          this.addRecommendation('performance', 'medium',
            'Connection pool usage is high',
            'Consider increasing pool size or optimizing queries'
          );
        }
      }

      // Check table sizes
      const tableSizeQuery = `
        SELECT 
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND (tablename LIKE '%club%' OR tablename LIKE '%spiel%' OR tablename LIKE '%tabellen%')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      `;

      const tableSizes = await this.strapi.db.connection.raw(tableSizeQuery);
      
      this.logCheck('table_sizes', 'pass', {
        message: `Analyzed ${tableSizes.rows.length} club-related tables`,
        tables: tableSizes.rows.map(row => ({
          table: row.tablename,
          size: row.size,
          sizeBytes: parseInt(row.size_bytes)
        }))
      });

      // Check for large tables
      const largeTables = tableSizes.rows.filter(row => parseInt(row.size_bytes) > 100 * 1024 * 1024); // > 100MB
      if (largeTables.length > 0) {
        this.addRecommendation('performance', 'medium',
          `Found ${largeTables.length} large tables`,
          'Consider archiving old data or optimizing table structure'
        );
      }

    } catch (error) {
      this.logCheck('database_health', 'fail', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Check club data integrity
   */
  async checkClubDataIntegrity() {
    try {
      console.log('\n🔍 Checking club data integrity...');

      // Check for clubs without names
      const clubsWithoutNames = await this.strapi.db.query('api::club.club').count({
        where: {
          $or: [
            { name: { $null: true } },
            { name: '' }
          ]
        }
      });

      if (clubsWithoutNames === 0) {
        this.logCheck('clubs_have_names', 'pass', {
          message: 'All clubs have names'
        });
      } else {
        this.logCheck('clubs_have_names', 'fail', {
          message: `${clubsWithoutNames} clubs without names`,
          count: clubsWithoutNames
        });
        this.addRecommendation('data_integrity', 'high',
          `${clubsWithoutNames} clubs are missing names`,
          'Update clubs to have valid names'
        );
      }

      // Check viktoria club mappings
      const viktoriaClubs = await this.strapi.db.query('api::club.club').findMany({
        where: { club_typ: 'viktoria_verein' }
      });

      const viktoriaClubsWithoutMapping = viktoriaClubs.filter(club => !club.viktoria_team_mapping);
      
      if (viktoriaClubsWithoutMapping.length === 0) {
        this.logCheck('viktoria_club_mappings', 'pass', {
          message: `All ${viktoriaClubs.length} Viktoria clubs have team mappings`
        });
      } else {
        this.logCheck('viktoria_club_mappings', 'fail', {
          message: `${viktoriaClubsWithoutMapping.length} Viktoria clubs without team mapping`,
          count: viktoriaClubsWithoutMapping.length,
          clubs: viktoriaClubsWithoutMapping.map(c => ({ id: c.id, name: c.name }))
        });
        this.addRecommendation('data_integrity', 'high',
          `${viktoriaClubsWithoutMapping.length} Viktoria clubs missing team mappings`,
          'Assign team mappings to all Viktoria clubs'
        );
      }

      // Check for duplicate team mappings
      const mappingCounts = {};
      viktoriaClubs.forEach(club => {
        if (club.viktoria_team_mapping) {
          mappingCounts[club.viktoria_team_mapping] = (mappingCounts[club.viktoria_team_mapping] || 0) + 1;
        }
      });

      const duplicateMappings = Object.entries(mappingCounts).filter(([mapping, count]) => count > 1);
      
      if (duplicateMappings.length === 0) {
        this.logCheck('unique_team_mappings', 'pass', {
          message: 'All team mappings are unique'
        });
      } else {
        this.logCheck('unique_team_mappings', 'fail', {
          message: `${duplicateMappings.length} duplicate team mappings found`,
          duplicates: duplicateMappings
        });
        this.addRecommendation('data_integrity', 'high',
          `Found duplicate team mappings: ${duplicateMappings.map(([m, c]) => `${m}(${c})`).join(', ')}`,
          'Ensure each team mapping is used only once'
        );
      }

      // Check club-liga relationships
      const clubsWithoutLiga = await this.strapi.db.query('api::club.club').count({
        populate: ['ligen'],
        where: {
          ligen: { $null: true }
        }
      });

      if (clubsWithoutLiga === 0) {
        this.logCheck('clubs_have_liga', 'pass', {
          message: 'All clubs are assigned to leagues'
        });
      } else {
        this.logCheck('clubs_have_liga', 'warning', {
          message: `${clubsWithoutLiga} clubs not assigned to any league`,
          count: clubsWithoutLiga
        });
        this.addRecommendation('data_integrity', 'medium',
          `${clubsWithoutLiga} clubs are not assigned to any league`,
          'Assign clubs to appropriate leagues'
        );
      }

      // Check for inactive clubs in active games
      const inactiveClubsInGamesQuery = `
        SELECT DISTINCT c.id, c.name, COUNT(s.id) as game_count
        FROM clubs c
        JOIN spiele s ON (s.heim_club_id = c.id OR s.gast_club_id = c.id)
        WHERE c.aktiv = false
        AND s.status != 'abgesagt'
        GROUP BY c.id, c.name
      `;

      const inactiveClubsInGames = await this.strapi.db.connection.raw(inactiveClubsInGamesQuery);
      const inactiveClubsRows = inactiveClubsInGames.rows || [];

      if (inactiveClubsRows.length === 0) {
        this.logCheck('inactive_clubs_in_games', 'pass', {
          message: 'No inactive clubs found in active games'
        });
      } else {
        this.logCheck('inactive_clubs_in_games', 'warning', {
          message: `${inactiveClubsRows.length} inactive clubs found in active games`,
          clubs: inactiveClubsRows
        });
        this.addRecommendation('data_integrity', 'medium',
          `${inactiveClubsRows.length} inactive clubs are still referenced in games`,
          'Review and update club status or game status'
        );
      }

    } catch (error) {
      this.logCheck('club_data_integrity', 'fail', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Check system performance metrics
   */
  async checkPerformanceMetrics() {
    try {
      console.log('\n🔍 Checking performance metrics...');

      // Check memory usage
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      this.logCheck('memory_usage', 'pass', {
        message: `Memory usage: ${memUsageMB.heapUsed}MB used / ${memUsageMB.heapTotal}MB total`,
        memoryUsage: memUsageMB
      });

      if (memUsageMB.heapUsed > 512) {
        this.addRecommendation('performance', 'medium',
          `High memory usage: ${memUsageMB.heapUsed}MB`,
          'Monitor memory usage and consider optimization'
        );
      }

      // Check system load
      const loadAvg = os.loadavg();
      const cpuCount = os.cpus().length;
      const loadPerCpu = loadAvg[0] / cpuCount;

      this.logCheck('system_load', 'pass', {
        message: `System load: ${loadAvg[0].toFixed(2)} (${(loadPerCpu * 100).toFixed(1)}% per CPU)`,
        loadAverage: loadAvg,
        cpuCount,
        loadPerCpu
      });

      if (loadPerCpu > 0.8) {
        this.addRecommendation('performance', 'high',
          `High system load: ${(loadPerCpu * 100).toFixed(1)}% per CPU`,
          'Check system resources and optimize processes'
        );
      } else if (loadPerCpu > 0.6) {
        this.addRecommendation('performance', 'medium',
          `Elevated system load: ${(loadPerCpu * 100).toFixed(1)}% per CPU`,
          'Monitor system performance'
        );
      }

      // Test query performance
      const queries = [
        {
          name: 'club_count',
          query: () => this.strapi.db.query('api::club.club').count()
        },
        {
          name: 'active_clubs',
          query: () => this.strapi.db.query('api::club.club').count({ where: { aktiv: true } })
        },
        {
          name: 'club_with_liga',
          query: () => this.strapi.db.query('api::club.club').findMany({
            populate: ['ligen'],
            limit: 10
          })
        },
        {
          name: 'recent_games',
          query: () => this.strapi.db.query('api::spiel.spiel').findMany({
            populate: ['heim_club', 'gast_club'],
            sort: { createdAt: 'desc' },
            limit: 10
          })
        }
      ];

      const queryResults = [];
      for (const queryTest of queries) {
        const startTime = Date.now();
        try {
          await queryTest.query();
          const duration = Date.now() - startTime;
          queryResults.push({ name: queryTest.name, duration, status: 'success' });
        } catch (error) {
          const duration = Date.now() - startTime;
          queryResults.push({ name: queryTest.name, duration, status: 'error', error: error.message });
        }
      }

      const avgQueryTime = queryResults.reduce((sum, result) => sum + result.duration, 0) / queryResults.length;
      const slowQueries = queryResults.filter(result => result.duration > 1000);

      this.logCheck('query_performance', 'pass', {
        message: `Average query time: ${avgQueryTime.toFixed(2)}ms`,
        averageTime: avgQueryTime,
        queryResults,
        slowQueries: slowQueries.length
      });

      if (slowQueries.length > 0) {
        this.addRecommendation('performance', 'medium',
          `${slowQueries.length} slow queries detected (>1s)`,
          'Optimize slow queries and consider adding indexes'
        );
      }

      if (avgQueryTime > 500) {
        this.addRecommendation('performance', 'medium',
          `Average query time is elevated: ${avgQueryTime.toFixed(2)}ms`,
          'Review and optimize database queries'
        );
      }

    } catch (error) {
      this.logCheck('performance_metrics', 'fail', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Check cache system health
   */
  async checkCacheHealth() {
    try {
      console.log('\n🔍 Checking cache system health...');

      // Check if cache manager exists
      const cacheManager = this.strapi.service('api::club.cache-manager');
      
      if (!cacheManager) {
        this.logCheck('cache_manager_exists', 'warning', {
          message: 'Cache manager service not found'
        });
        this.addRecommendation('performance', 'low',
          'Cache manager service is not available',
          'Implement cache manager for better performance'
        );
        return;
      }

      this.logCheck('cache_manager_exists', 'pass', {
        message: 'Cache manager service is available'
      });

      // Test cache operations
      const testKey = 'diagnostic_test_' + Date.now();
      const testValue = { test: true, timestamp: new Date().toISOString() };

      try {
        // Test cache set
        const setStartTime = Date.now();
        await cacheManager.set(testKey, testValue, 60);
        const setDuration = Date.now() - setStartTime;

        // Test cache get
        const getStartTime = Date.now();
        const cachedValue = await cacheManager.get(testKey);
        const getDuration = Date.now() - getStartTime;

        // Test cache delete
        const deleteStartTime = Date.now();
        await cacheManager.delete(testKey);
        const deleteDuration = Date.now() - deleteStartTime;

        this.logCheck('cache_operations', 'pass', {
          message: `Cache operations working (set: ${setDuration}ms, get: ${getDuration}ms, delete: ${deleteDuration}ms)`,
          setDuration,
          getDuration,
          deleteDuration,
          testSuccessful: JSON.stringify(cachedValue) === JSON.stringify(testValue)
        });

        if (setDuration > 100 || getDuration > 50) {
          this.addRecommendation('performance', 'medium',
            'Cache operations are slow',
            'Check cache server performance and network connectivity'
          );
        }

      } catch (cacheError) {
        this.logCheck('cache_operations', 'fail', {
          message: `Cache operations failed: ${cacheError.message}`,
          error: cacheError.message
        });
        this.addRecommendation('performance', 'high',
          'Cache operations are failing',
          'Check cache server status and configuration'
        );
      }

      // Get cache metrics if available
      if (typeof cacheManager.getMetrics === 'function') {
        try {
          const metrics = await cacheManager.getMetrics();
          
          this.logCheck('cache_metrics', 'pass', {
            message: `Cache hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`,
            metrics
          });

          if (metrics.hitRate < 0.6) {
            this.addRecommendation('performance', 'medium',
              `Low cache hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`,
              'Review cache strategy and TTL settings'
            );
          }

        } catch (metricsError) {
          this.logCheck('cache_metrics', 'warning', {
            message: 'Could not retrieve cache metrics',
            error: metricsError.message
          });
        }
      }

    } catch (error) {
      this.logCheck('cache_health', 'fail', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Check monitoring system health
   */
  async checkMonitoringHealth() {
    try {
      console.log('\n🔍 Checking monitoring system health...');

      // Check if monitoring service exists
      const monitoringService = this.strapi.service('api::club.monitoring-service');
      
      if (!monitoringService) {
        this.logCheck('monitoring_service_exists', 'warning', {
          message: 'Monitoring service not found'
        });
        this.addRecommendation('monitoring', 'medium',
          'Monitoring service is not available',
          'Enable monitoring service for better observability'
        );
        return;
      }

      this.logCheck('monitoring_service_exists', 'pass', {
        message: 'Monitoring service is available'
      });

      // Get system status
      try {
        const systemStatus = await monitoringService.getSystemStatus();
        
        this.logCheck('monitoring_system_status', 'pass', {
          message: `Monitoring system status: ${systemStatus.status}`,
          systemStatus
        });

        if (systemStatus.status === 'critical') {
          this.addRecommendation('monitoring', 'high',
            'Monitoring system reports critical status',
            'Check monitoring alerts and resolve critical issues'
          );
        } else if (systemStatus.status === 'degraded') {
          this.addRecommendation('monitoring', 'medium',
            'Monitoring system reports degraded status',
            'Review monitoring warnings and optimize performance'
          );
        }

        // Check component health
        const components = systemStatus.components;
        Object.entries(components).forEach(([component, status]) => {
          if (status !== 'running') {
            this.addRecommendation('monitoring', 'medium',
              `Monitoring component ${component} is ${status}`,
              `Check and restart ${component} component`
            );
          }
        });

      } catch (statusError) {
        this.logCheck('monitoring_system_status', 'fail', {
          message: `Failed to get monitoring status: ${statusError.message}`,
          error: statusError.message
        });
      }

      // Check metrics collection
      const metricsCollector = monitoringService.getMetricsCollector();
      if (metricsCollector) {
        const metrics = metricsCollector.getMetrics();
        
        this.logCheck('metrics_collection', 'pass', {
          message: `Collecting ${metrics.size} different metrics`,
          metricCount: metrics.size
        });

        if (metrics.size < 10) {
          this.addRecommendation('monitoring', 'low',
            'Few metrics are being collected',
            'Consider adding more metrics for better observability'
          );
        }
      }

      // Check alerting system
      const alertingSystem = monitoringService.getAlertingSystem();
      if (alertingSystem) {
        const activeAlerts = alertingSystem.getActiveAlerts();
        
        this.logCheck('alerting_system', 'pass', {
          message: `${activeAlerts.length} active alerts`,
          activeAlerts: activeAlerts.length
        });

        const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
        if (criticalAlerts.length > 0) {
          this.addRecommendation('monitoring', 'high',
            `${criticalAlerts.length} critical alerts active`,
            'Address critical alerts immediately'
          );
        }
      }

    } catch (error) {
      this.logCheck('monitoring_health', 'fail', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Check file system health
   */
  async checkFileSystemHealth() {
    try {
      console.log('\n🔍 Checking file system health...');

      // Check disk space
      const stats = await fs.statfs(process.cwd());
      const totalSpace = stats.bavail * stats.bsize;
      const freeSpace = stats.bavail * stats.bsize;
      const usedSpace = totalSpace - freeSpace;
      const usagePercent = (usedSpace / totalSpace) * 100;

      this.logCheck('disk_space', 'pass', {
        message: `Disk usage: ${usagePercent.toFixed(1)}% (${Math.round(freeSpace / 1024 / 1024 / 1024)}GB free)`,
        totalSpace,
        freeSpace,
        usedSpace,
        usagePercent
      });

      if (usagePercent > 90) {
        this.addRecommendation('system', 'high',
          `Disk space critically low: ${usagePercent.toFixed(1)}% used`,
          'Free up disk space immediately'
        );
      } else if (usagePercent > 80) {
        this.addRecommendation('system', 'medium',
          `Disk space running low: ${usagePercent.toFixed(1)}% used`,
          'Plan for disk space cleanup or expansion'
        );
      }

      // Check important directories
      const directories = [
        path.join(__dirname, '..', 'logs'),
        path.join(__dirname, '..', 'backups'),
        path.join(__dirname, '..', 'public', 'uploads')
      ];

      for (const dir of directories) {
        try {
          await fs.access(dir);
          const stats = await fs.stat(dir);
          
          this.logCheck(`directory_${path.basename(dir)}`, 'pass', {
            message: `Directory ${path.basename(dir)} exists and is accessible`,
            path: dir,
            isDirectory: stats.isDirectory()
          });
        } catch (error) {
          this.logCheck(`directory_${path.basename(dir)}`, 'warning', {
            message: `Directory ${path.basename(dir)} not accessible: ${error.message}`,
            path: dir,
            error: error.message
          });
        }
      }

      // Check log files
      const logDir = path.join(__dirname, '..', 'logs');
      try {
        const logFiles = await fs.readdir(logDir);
        const logFileStats = [];
        
        for (const logFile of logFiles.slice(0, 10)) { // Check first 10 log files
          const logPath = path.join(logDir, logFile);
          const stats = await fs.stat(logPath);
          logFileStats.push({
            file: logFile,
            size: stats.size,
            modified: stats.mtime
          });
        }

        this.logCheck('log_files', 'pass', {
          message: `Found ${logFiles.length} log files`,
          logFileCount: logFiles.length,
          recentFiles: logFileStats
        });

        // Check for large log files
        const largeLogFiles = logFileStats.filter(file => file.size > 100 * 1024 * 1024); // > 100MB
        if (largeLogFiles.length > 0) {
          this.addRecommendation('system', 'medium',
            `${largeLogFiles.length} large log files found`,
            'Consider log rotation or cleanup'
          );
        }

      } catch (error) {
        this.logCheck('log_files', 'warning', {
          message: 'Could not check log files',
          error: error.message
        });
      }

    } catch (error) {
      this.logCheck('file_system_health', 'fail', {
        message: error.message,
        stack: error.stack
      });
    }
  }

  /**
   * Generate diagnostic summary
   */
  generateSummary() {
    const summary = {
      totalChecks: this.diagnostics.checks.length,
      passedChecks: this.diagnostics.checks.filter(c => c.status === 'pass').length,
      failedChecks: this.diagnostics.issues.length,
      warnings: this.diagnostics.warnings.length,
      recommendations: {
        total: this.diagnostics.recommendations.length,
        high: this.diagnostics.recommendations.filter(r => r.priority === 'high').length,
        medium: this.diagnostics.recommendations.filter(r => r.priority === 'medium').length,
        low: this.diagnostics.recommendations.filter(r => r.priority === 'low').length
      },
      overallHealth: this.calculateOverallHealth()
    };

    this.diagnostics.summary = summary;

    console.log('\n📊 Diagnostic Summary:');
    console.log(`   Overall Health: ${summary.overallHealth}`);
    console.log(`   Total Checks: ${summary.totalChecks}`);
    console.log(`   Passed: ${summary.passedChecks}`);
    console.log(`   Failed: ${summary.failedChecks}`);
    console.log(`   Warnings: ${summary.warnings}`);
    console.log(`   Recommendations: ${summary.recommendations.total} (${summary.recommendations.high} high priority)`);

    return summary;
  }

  /**
   * Calculate overall system health
   */
  calculateOverallHealth() {
    const totalChecks = this.diagnostics.checks.length;
    const failedChecks = this.diagnostics.issues.length;
    const warnings = this.diagnostics.warnings.length;
    const highPriorityRecommendations = this.diagnostics.recommendations.filter(r => r.priority === 'high').length;

    if (failedChecks > 0 || highPriorityRecommendations > 0) {
      return 'CRITICAL';
    } else if (warnings > 0 || this.diagnostics.recommendations.filter(r => r.priority === 'medium').length > 0) {
      return 'WARNING';
    } else if (totalChecks > 0) {
      return 'HEALTHY';
    } else {
      return 'UNKNOWN';
    }
  }

  /**
   * Save diagnostic report
   */
  async saveDiagnosticReport() {
    try {
      const reportDir = path.join(__dirname, '..', 'logs', 'diagnostics');
      await fs.mkdir(reportDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportFile = path.join(reportDir, `club-diagnostics-${timestamp}.json`);

      await fs.writeFile(reportFile, JSON.stringify(this.diagnostics, null, 2));
      
      console.log(`\n💾 Diagnostic report saved to: ${reportFile}`);
      return reportFile;

    } catch (error) {
      console.error('Failed to save diagnostic report:', error.message);
      return null;
    }
  }

  /**
   * Run all diagnostic checks
   */
  async runAllChecks() {
    console.log('🚀 Starting comprehensive club system diagnostics...');
    
    await this.checkDatabaseHealth();
    await this.checkClubDataIntegrity();
    await this.checkPerformanceMetrics();
    await this.checkCacheHealth();
    await this.checkMonitoringHealth();
    await this.checkFileSystemHealth();
    
    const summary = this.generateSummary();
    await this.saveDiagnosticReport();
    
    console.log('\n✨ Club system diagnostics completed!');
    
    // Print recommendations
    if (this.diagnostics.recommendations.length > 0) {
      console.log('\n📋 Recommendations:');
      this.diagnostics.recommendations
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
        .forEach(rec => {
          const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
          console.log(`${icon} [${rec.priority.toUpperCase()}] ${rec.category}: ${rec.message}`);
          if (rec.action) {
            console.log(`   Action: ${rec.action}`);
          }
        });
    }
    
    return this.diagnostics;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const checkType = args[0] || 'all';

  let strapi;
  try {
    strapi = await initializeStrapi();
    const diagnostics = new ClubDiagnosticsManager(strapi);

    switch (checkType) {
      case 'database':
        await diagnostics.checkDatabaseHealth();
        break;
      case 'data':
        await diagnostics.checkClubDataIntegrity();
        break;
      case 'performance':
        await diagnostics.checkPerformanceMetrics();
        break;
      case 'cache':
        await diagnostics.checkCacheHealth();
        break;
      case 'monitoring':
        await diagnostics.checkMonitoringHealth();
        break;
      case 'filesystem':
        await diagnostics.checkFileSystemHealth();
        break;
      case 'all':
      default:
        await diagnostics.runAllChecks();
        break;
    }

    diagnostics.generateSummary();
    await diagnostics.saveDiagnosticReport();

  } catch (error) {
    console.error('Diagnostic script failed:', error);
    process.exit(1);
  } finally {
    if (strapi) {
      await strapi.destroy();
    }
  }
}

// Export for programmatic use
module.exports = { ClubDiagnosticsManager, initializeStrapi };

// Run if called directly
if (require.main === module) {
  main();
}