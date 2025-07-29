#!/usr/bin/env node

/**
 * Automated Club System Health Check
 * 
 * Automated health check system that runs continuously or on schedule
 * to monitor club system health and send alerts when issues are detected.
 */

const path = require('path');
const fs = require('fs').promises;
const cron = require('node-cron');

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

class ClubHealthCheckManager {
  constructor(strapi) {
    this.strapi = strapi;
    this.isRunning = false;
    this.scheduledTasks = new Map();
    this.healthHistory = [];
    this.config = this.loadConfiguration();
    this.lastHealthCheck = null;
  }

  /**
   * Load health check configuration
   */
  loadConfiguration() {
    return {
      enabled: process.env.CLUB_HEALTH_CHECK_ENABLED !== 'false',
      interval: process.env.CLUB_HEALTH_CHECK_INTERVAL || '*/5 * * * *', // Every 5 minutes
      deepCheckInterval: process.env.CLUB_DEEP_CHECK_INTERVAL || '0 */6 * * *', // Every 6 hours
      alertThresholds: {
        consecutiveFailures: parseInt(process.env.CLUB_HEALTH_CONSECUTIVE_FAILURES || '3'),
        responseTimeWarning: parseInt(process.env.CLUB_HEALTH_RESPONSE_TIME_WARNING || '1000'),
        responseTimeCritical: parseInt(process.env.CLUB_HEALTH_RESPONSE_TIME_CRITICAL || '5000'),
        errorRateWarning: parseFloat(process.env.CLUB_HEALTH_ERROR_RATE_WARNING || '0.05'),
        errorRateCritical: parseFloat(process.env.CLUB_HEALTH_ERROR_RATE_CRITICAL || '0.1')
      },
      notifications: {
        webhook: process.env.CLUB_HEALTH_WEBHOOK_URL || null,
        email: process.env.CLUB_HEALTH_EMAIL || null,
        slack: process.env.CLUB_HEALTH_SLACK_WEBHOOK || null
      },
      retention: {
        historyDays: parseInt(process.env.CLUB_HEALTH_HISTORY_DAYS || '7'),
        maxHistoryEntries: parseInt(process.env.CLUB_HEALTH_MAX_HISTORY || '1000')
      }
    };
  }

  /**
   * Start automated health checks
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️  Health check system is already running');
      return;
    }

    if (!this.config.enabled) {
      console.log('⚠️  Health check system is disabled');
      return;
    }

    console.log('🚀 Starting automated club health check system...');
    console.log(`   Basic checks: ${this.config.interval}`);
    console.log(`   Deep checks: ${this.config.deepCheckInterval}`);

    this.isRunning = true;

    // Schedule basic health checks
    const basicTask = cron.schedule(this.config.interval, async () => {
      try {
        await this.performBasicHealthCheck();
      } catch (error) {
        console.error('Basic health check failed:', error);
      }
    }, {
      scheduled: false
    });

    // Schedule deep health checks
    const deepTask = cron.schedule(this.config.deepCheckInterval, async () => {
      try {
        await this.performDeepHealthCheck();
      } catch (error) {
        console.error('Deep health check failed:', error);
      }
    }, {
      scheduled: false
    });

    this.scheduledTasks.set('basic', basicTask);
    this.scheduledTasks.set('deep', deepTask);

    // Start the scheduled tasks
    basicTask.start();
    deepTask.start();

    // Perform initial health check
    await this.performBasicHealthCheck();

    console.log('✅ Automated health check system started');
  }

  /**
   * Stop automated health checks
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping automated health check system...');

    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      console.log(`   Stopped ${name} health checks`);
    });

    this.scheduledTasks.clear();
    this.isRunning = false;

    console.log('✅ Automated health check system stopped');
  }

  /**
   * Perform basic health check
   */
  async performBasicHealthCheck() {
    const startTime = Date.now();
    const healthCheck = {
      timestamp: new Date().toISOString(),
      type: 'basic',
      duration: 0,
      status: 'unknown',
      checks: {},
      issues: [],
      metrics: {}
    };

    try {
      console.log('🔍 Performing basic health check...');

      // Database connectivity check
      const dbCheck = await this.checkDatabaseConnectivity();
      healthCheck.checks.database = dbCheck;

      // Basic club data check
      const clubDataCheck = await this.checkBasicClubData();
      healthCheck.checks.clubData = clubDataCheck;

      // Cache system check
      const cacheCheck = await this.checkCacheSystem();
      healthCheck.checks.cache = cacheCheck;

      // Monitoring system check
      const monitoringCheck = await this.checkMonitoringSystem();
      healthCheck.checks.monitoring = monitoringCheck;

      // Calculate overall status
      const failedChecks = Object.values(healthCheck.checks).filter(check => check.status === 'fail');
      const warningChecks = Object.values(healthCheck.checks).filter(check => check.status === 'warning');

      if (failedChecks.length > 0) {
        healthCheck.status = 'critical';
        healthCheck.issues = failedChecks.map(check => check.message);
      } else if (warningChecks.length > 0) {
        healthCheck.status = 'warning';
        healthCheck.issues = warningChecks.map(check => check.message);
      } else {
        healthCheck.status = 'healthy';
      }

      healthCheck.duration = Date.now() - startTime;
      healthCheck.metrics = {
        totalChecks: Object.keys(healthCheck.checks).length,
        passedChecks: Object.values(healthCheck.checks).filter(check => check.status === 'pass').length,
        failedChecks: failedChecks.length,
        warningChecks: warningChecks.length
      };

      // Store health check result
      this.addToHealthHistory(healthCheck);

      // Check for alerts
      await this.checkForAlerts(healthCheck);

      console.log(`✅ Basic health check completed: ${healthCheck.status} (${healthCheck.duration}ms)`);

    } catch (error) {
      healthCheck.status = 'error';
      healthCheck.duration = Date.now() - startTime;
      healthCheck.issues = [error.message];
      
      console.error('❌ Basic health check failed:', error);
      
      this.addToHealthHistory(healthCheck);
      await this.sendAlert('critical', 'Health check system failure', error.message);
    }

    this.lastHealthCheck = healthCheck;
    return healthCheck;
  }

  /**
   * Perform deep health check
   */
  async performDeepHealthCheck() {
    const startTime = Date.now();
    const healthCheck = {
      timestamp: new Date().toISOString(),
      type: 'deep',
      duration: 0,
      status: 'unknown',
      checks: {},
      issues: [],
      metrics: {},
      recommendations: []
    };

    try {
      console.log('🔍 Performing deep health check...');

      // All basic checks
      const basicResult = await this.performBasicHealthCheck();
      Object.assign(healthCheck.checks, basicResult.checks);

      // Performance metrics check
      const performanceCheck = await this.checkPerformanceMetrics();
      healthCheck.checks.performance = performanceCheck;

      // Data integrity check
      const integrityCheck = await this.checkDataIntegrity();
      healthCheck.checks.dataIntegrity = integrityCheck;

      // System resources check
      const resourcesCheck = await this.checkSystemResources();
      healthCheck.checks.systemResources = resourcesCheck;

      // File system check
      const filesystemCheck = await this.checkFileSystem();
      healthCheck.checks.filesystem = filesystemCheck;

      // Calculate overall status and generate recommendations
      const failedChecks = Object.values(healthCheck.checks).filter(check => check.status === 'fail');
      const warningChecks = Object.values(healthCheck.checks).filter(check => check.status === 'warning');

      if (failedChecks.length > 0) {
        healthCheck.status = 'critical';
        healthCheck.issues = failedChecks.map(check => check.message);
      } else if (warningChecks.length > 0) {
        healthCheck.status = 'warning';
        healthCheck.issues = warningChecks.map(check => check.message);
      } else {
        healthCheck.status = 'healthy';
      }

      // Generate recommendations
      healthCheck.recommendations = this.generateRecommendations(healthCheck.checks);

      healthCheck.duration = Date.now() - startTime;
      healthCheck.metrics = {
        totalChecks: Object.keys(healthCheck.checks).length,
        passedChecks: Object.values(healthCheck.checks).filter(check => check.status === 'pass').length,
        failedChecks: failedChecks.length,
        warningChecks: warningChecks.length,
        recommendations: healthCheck.recommendations.length
      };

      // Store health check result
      this.addToHealthHistory(healthCheck);

      // Check for alerts
      await this.checkForAlerts(healthCheck);

      console.log(`✅ Deep health check completed: ${healthCheck.status} (${healthCheck.duration}ms)`);

    } catch (error) {
      healthCheck.status = 'error';
      healthCheck.duration = Date.now() - startTime;
      healthCheck.issues = [error.message];
      
      console.error('❌ Deep health check failed:', error);
      
      this.addToHealthHistory(healthCheck);
      await this.sendAlert('critical', 'Deep health check system failure', error.message);
    }

    return healthCheck;
  }

  /**
   * Check database connectivity
   */
  async checkDatabaseConnectivity() {
    const startTime = Date.now();
    try {
      const result = await this.strapi.db.connection.raw('SELECT 1 as test');
      const responseTime = Date.now() - startTime;

      if (result.rows && result.rows[0].test === 1) {
        return {
          status: responseTime > this.config.alertThresholds.responseTimeCritical ? 'fail' :
                  responseTime > this.config.alertThresholds.responseTimeWarning ? 'warning' : 'pass',
          message: `Database connected (${responseTime}ms)`,
          responseTime,
          details: { connected: true }
        };
      } else {
        return {
          status: 'fail',
          message: 'Database connectivity test failed',
          responseTime,
          details: { connected: false }
        };
      }
    } catch (error) {
      return {
        status: 'fail',
        message: `Database connection failed: ${error.message}`,
        responseTime: Date.now() - startTime,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check basic club data
   */
  async checkBasicClubData() {
    try {
      const clubCount = await this.strapi.db.query('api::club.club').count();
      const activeClubCount = await this.strapi.db.query('api::club.club').count({
        where: { aktiv: true }
      });

      if (clubCount === 0) {
        return {
          status: 'fail',
          message: 'No clubs found in system',
          details: { clubCount: 0, activeClubCount: 0 }
        };
      }

      if (activeClubCount === 0) {
        return {
          status: 'warning',
          message: 'No active clubs found',
          details: { clubCount, activeClubCount }
        };
      }

      return {
        status: 'pass',
        message: `${activeClubCount}/${clubCount} clubs active`,
        details: { clubCount, activeClubCount }
      };

    } catch (error) {
      return {
        status: 'fail',
        message: `Club data check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check cache system
   */
  async checkCacheSystem() {
    try {
      const cacheManager = this.strapi.service('api::club.cache-manager');
      
      if (!cacheManager) {
        return {
          status: 'warning',
          message: 'Cache manager not available',
          details: { available: false }
        };
      }

      // Test cache operations
      const testKey = 'health_check_' + Date.now();
      const testValue = { test: true };

      const startTime = Date.now();
      await cacheManager.set(testKey, testValue, 60);
      const cachedValue = await cacheManager.get(testKey);
      await cacheManager.delete(testKey);
      const operationTime = Date.now() - startTime;

      const isWorking = JSON.stringify(cachedValue) === JSON.stringify(testValue);

      return {
        status: isWorking ? 'pass' : 'fail',
        message: isWorking ? `Cache working (${operationTime}ms)` : 'Cache operations failed',
        details: { working: isWorking, operationTime }
      };

    } catch (error) {
      return {
        status: 'fail',
        message: `Cache check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check monitoring system
   */
  async checkMonitoringSystem() {
    try {
      const monitoringService = this.strapi.service('api::club.monitoring-service');
      
      if (!monitoringService) {
        return {
          status: 'warning',
          message: 'Monitoring service not available',
          details: { available: false }
        };
      }

      const systemStatus = await monitoringService.getSystemStatus();
      
      return {
        status: systemStatus.status === 'critical' ? 'fail' : 
                systemStatus.status === 'degraded' ? 'warning' : 'pass',
        message: `Monitoring system: ${systemStatus.status}`,
        details: systemStatus
      };

    } catch (error) {
      return {
        status: 'fail',
        message: `Monitoring check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check performance metrics
   */
  async checkPerformanceMetrics() {
    try {
      const memUsage = process.memoryUsage();
      const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      // Test query performance
      const startTime = Date.now();
      await this.strapi.db.query('api::club.club').findMany({ limit: 10 });
      const queryTime = Date.now() - startTime;

      const status = memUsageMB > 512 || queryTime > this.config.alertThresholds.responseTimeCritical ? 'fail' :
                    memUsageMB > 256 || queryTime > this.config.alertThresholds.responseTimeWarning ? 'warning' : 'pass';

      return {
        status,
        message: `Memory: ${memUsageMB}MB, Query: ${queryTime}ms`,
        details: { memoryUsageMB: memUsageMB, queryTime }
      };

    } catch (error) {
      return {
        status: 'fail',
        message: `Performance check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check data integrity
   */
  async checkDataIntegrity() {
    try {
      // Check for clubs without names
      const clubsWithoutNames = await this.strapi.db.query('api::club.club').count({
        where: {
          $or: [
            { name: { $null: true } },
            { name: '' }
          ]
        }
      });

      // Check viktoria clubs without team mapping
      const viktoriaClubsWithoutMapping = await this.strapi.db.query('api::club.club').count({
        where: {
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: { $null: true }
        }
      });

      const issues = [];
      if (clubsWithoutNames > 0) issues.push(`${clubsWithoutNames} clubs without names`);
      if (viktoriaClubsWithoutMapping > 0) issues.push(`${viktoriaClubsWithoutMapping} Viktoria clubs without mapping`);

      return {
        status: issues.length > 0 ? 'warning' : 'pass',
        message: issues.length > 0 ? issues.join(', ') : 'Data integrity checks passed',
        details: { clubsWithoutNames, viktoriaClubsWithoutMapping, issues }
      };

    } catch (error) {
      return {
        status: 'fail',
        message: `Data integrity check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check system resources
   */
  async checkSystemResources() {
    try {
      const os = require('os');
      const loadAvg = os.loadavg();
      const cpuCount = os.cpus().length;
      const loadPerCpu = loadAvg[0] / cpuCount;
      const freeMemory = os.freemem();
      const totalMemory = os.totalmem();
      const memoryUsage = (totalMemory - freeMemory) / totalMemory;

      const status = loadPerCpu > 0.9 || memoryUsage > 0.9 ? 'fail' :
                    loadPerCpu > 0.7 || memoryUsage > 0.8 ? 'warning' : 'pass';

      return {
        status,
        message: `CPU: ${(loadPerCpu * 100).toFixed(1)}%, Memory: ${(memoryUsage * 100).toFixed(1)}%`,
        details: {
          loadPerCpu,
          memoryUsage,
          loadAverage: loadAvg,
          freeMemoryMB: Math.round(freeMemory / 1024 / 1024),
          totalMemoryMB: Math.round(totalMemory / 1024 / 1024)
        }
      };

    } catch (error) {
      return {
        status: 'fail',
        message: `System resources check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check file system
   */
  async checkFileSystem() {
    try {
      // Check if important directories exist
      const directories = [
        path.join(__dirname, '..', 'logs'),
        path.join(__dirname, '..', 'backups')
      ];

      const issues = [];
      for (const dir of directories) {
        try {
          await fs.access(dir);
        } catch (error) {
          issues.push(`Directory ${path.basename(dir)} not accessible`);
        }
      }

      return {
        status: issues.length > 0 ? 'warning' : 'pass',
        message: issues.length > 0 ? issues.join(', ') : 'File system checks passed',
        details: { issues, checkedDirectories: directories.length }
      };

    } catch (error) {
      return {
        status: 'fail',
        message: `File system check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  /**
   * Generate recommendations based on check results
   */
  generateRecommendations(checks) {
    const recommendations = [];

    Object.entries(checks).forEach(([checkName, result]) => {
      if (result.status === 'fail') {
        recommendations.push({
          priority: 'high',
          category: checkName,
          message: `Address critical issue: ${result.message}`,
          action: this.getRecommendedAction(checkName, result)
        });
      } else if (result.status === 'warning') {
        recommendations.push({
          priority: 'medium',
          category: checkName,
          message: `Monitor and optimize: ${result.message}`,
          action: this.getRecommendedAction(checkName, result)
        });
      }
    });

    return recommendations;
  }

  /**
   * Get recommended action for a check result
   */
  getRecommendedAction(checkName, result) {
    const actions = {
      database: 'Check database server status and network connectivity',
      clubData: 'Verify club data integrity and populate missing data',
      cache: 'Check cache server status and configuration',
      monitoring: 'Review monitoring system alerts and resolve issues',
      performance: 'Optimize queries and check system resources',
      dataIntegrity: 'Run data cleanup and validation scripts',
      systemResources: 'Check system load and memory usage',
      filesystem: 'Verify directory permissions and disk space'
    };

    return actions[checkName] || 'Review system logs and configuration';
  }

  /**
   * Add health check result to history
   */
  addToHealthHistory(healthCheck) {
    this.healthHistory.push(healthCheck);

    // Maintain history size limit
    if (this.healthHistory.length > this.config.retention.maxHistoryEntries) {
      this.healthHistory = this.healthHistory.slice(-this.config.retention.maxHistoryEntries);
    }

    // Remove old entries
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retention.historyDays);
    
    this.healthHistory = this.healthHistory.filter(entry => 
      new Date(entry.timestamp) >= cutoffDate
    );
  }

  /**
   * Check for alert conditions
   */
  async checkForAlerts(healthCheck) {
    try {
      // Check for consecutive failures
      const recentChecks = this.healthHistory.slice(-this.config.alertThresholds.consecutiveFailures);
      const consecutiveFailures = recentChecks.every(check => 
        check.status === 'critical' || check.status === 'error'
      );

      if (consecutiveFailures && recentChecks.length >= this.config.alertThresholds.consecutiveFailures) {
        await this.sendAlert('critical', 
          'Consecutive health check failures detected',
          `${this.config.alertThresholds.consecutiveFailures} consecutive failures detected`
        );
      }

      // Check for critical status
      if (healthCheck.status === 'critical') {
        await this.sendAlert('critical',
          'Critical health check status',
          `Issues: ${healthCheck.issues.join(', ')}`
        );
      }

      // Check for performance degradation
      if (healthCheck.checks.performance && healthCheck.checks.performance.details.queryTime > this.config.alertThresholds.responseTimeCritical) {
        await this.sendAlert('warning',
          'Performance degradation detected',
          `Query response time: ${healthCheck.checks.performance.details.queryTime}ms`
        );
      }

    } catch (error) {
      console.error('Failed to check for alerts:', error);
    }
  }

  /**
   * Send alert notification
   */
  async sendAlert(severity, title, message) {
    const alert = {
      timestamp: new Date().toISOString(),
      severity,
      title,
      message,
      system: 'club-health-check'
    };

    console.log(`🚨 [${severity.toUpperCase()}] ${title}: ${message}`);

    // Send to configured notification channels
    const notifications = [];

    if (this.config.notifications.webhook) {
      notifications.push(this.sendWebhookAlert(alert));
    }

    if (this.config.notifications.email) {
      notifications.push(this.sendEmailAlert(alert));
    }

    if (this.config.notifications.slack) {
      notifications.push(this.sendSlackAlert(alert));
    }

    // Wait for all notifications to complete
    await Promise.allSettled(notifications);
  }

  /**
   * Send webhook alert
   */
  async sendWebhookAlert(alert) {
    try {
      const fetch = require('node-fetch');
      const response = await fetch(this.config.notifications.webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status}`);
      }

      console.log('✅ Webhook alert sent');
    } catch (error) {
      console.error('❌ Failed to send webhook alert:', error.message);
    }
  }

  /**
   * Send email alert (placeholder)
   */
  async sendEmailAlert(alert) {
    // This would integrate with an email service
    console.log('📧 Email alert would be sent to:', this.config.notifications.email);
  }

  /**
   * Send Slack alert (placeholder)
   */
  async sendSlackAlert(alert) {
    // This would integrate with Slack webhook
    console.log('💬 Slack alert would be sent');
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    return {
      isRunning: this.isRunning,
      lastHealthCheck: this.lastHealthCheck,
      healthHistory: this.healthHistory.slice(-10), // Last 10 checks
      config: this.config,
      statistics: {
        totalChecks: this.healthHistory.length,
        healthyChecks: this.healthHistory.filter(h => h.status === 'healthy').length,
        warningChecks: this.healthHistory.filter(h => h.status === 'warning').length,
        criticalChecks: this.healthHistory.filter(h => h.status === 'critical').length,
        errorChecks: this.healthHistory.filter(h => h.status === 'error').length
      }
    };
  }

  /**
   * Save health check history
   */
  async saveHealthHistory() {
    try {
      const historyDir = path.join(__dirname, '..', 'logs', 'health-checks');
      await fs.mkdir(historyDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const historyFile = path.join(historyDir, `health-history-${timestamp}.json`);

      const historyData = {
        timestamp: new Date().toISOString(),
        config: this.config,
        statistics: this.getHealthStatus().statistics,
        history: this.healthHistory
      };

      await fs.writeFile(historyFile, JSON.stringify(historyData, null, 2));
      console.log(`💾 Health check history saved to: ${historyFile}`);
      
      return historyFile;
    } catch (error) {
      console.error('Failed to save health history:', error.message);
      return null;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';

  let strapi;
  try {
    strapi = await initializeStrapi();
    const healthCheck = new ClubHealthCheckManager(strapi);

    switch (command) {
      case 'start':
        await healthCheck.start();
        // Keep the process running
        process.on('SIGINT', async () => {
          console.log('\n🛑 Shutting down health check system...');
          await healthCheck.stop();
          await strapi.destroy();
          process.exit(0);
        });
        break;
        
      case 'check':
        await healthCheck.performBasicHealthCheck();
        break;
        
      case 'deep':
        await healthCheck.performDeepHealthCheck();
        break;
        
      case 'status':
        const status = healthCheck.getHealthStatus();
        console.log('📊 Health Check Status:');
        console.log(JSON.stringify(status, null, 2));
        break;
        
      default:
        console.log('Usage: node club-health-check.js <command>');
        console.log('Commands:');
        console.log('  start  - Start automated health checks');
        console.log('  check  - Run single basic health check');
        console.log('  deep   - Run single deep health check');
        console.log('  status - Show health check status');
        process.exit(1);
    }

  } catch (error) {
    console.error('Health check system failed:', error);
    process.exit(1);
  } finally {
    if (strapi && command !== 'start') {
      await strapi.destroy();
    }
  }
}

// Export for programmatic use
module.exports = { ClubHealthCheckManager, initializeStrapi };

// Run if called directly
if (require.main === module) {
  main();
}