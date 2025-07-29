#!/usr/bin/env node

/**
 * Rollout Monitoring System
 * 
 * Monitors the gradual rollout of club system features with real-time
 * metrics, alerting, and automatic rollback capabilities.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const FeatureFlagManager = require('./feature-flag-manager');

class RolloutMonitor {
  constructor(options = {}) {
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.monitoringInterval = options.monitoringInterval || 30000; // 30 seconds
    this.alertThresholds = options.alertThresholds || this.getDefaultThresholds();
    this.enableAutoRollback = options.enableAutoRollback !== false;
    
    this.flagManager = new FeatureFlagManager({ environment: this.environment });
    this.metrics = new Map();
    this.alerts = [];
    this.isMonitoring = false;
    this.monitoringStartTime = null;
    
    this.logFile = path.join(__dirname, '..', 'logs', `rollout-monitor-${Date.now()}.log`);
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  getDefaultThresholds() {
    const baseThresholds = {
      development: {
        errorRate: 0.05, // 5%
        responseTime: 2000, // 2 seconds
        memoryUsage: 0.9, // 90%
        cpuUsage: 0.8, // 80%
        userComplaints: 10,
        dataIntegrityFailures: 0.01 // 1%
      },
      staging: {
        errorRate: 0.02, // 2%
        responseTime: 1000, // 1 second
        memoryUsage: 0.8, // 80%
        cpuUsage: 0.7, // 70%
        userComplaints: 5,
        dataIntegrityFailures: 0.005 // 0.5%
      },
      production: {
        errorRate: 0.01, // 1%
        responseTime: 500, // 500ms
        memoryUsage: 0.7, // 70%
        cpuUsage: 0.6, // 60%
        userComplaints: 3,
        dataIntegrityFailures: 0.001 // 0.1%
      }
    };
    
    return baseThresholds[this.environment] || baseThresholds.development;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      debug: chalk.gray
    };
    
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(colors[level](logMessage));
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async collectSystemMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: await this.getSystemMetrics(),
      application: await this.getApplicationMetrics(),
      database: await this.getDatabaseMetrics(),
      userExperience: await this.getUserExperienceMetrics(),
      clubSystem: await this.getClubSystemMetrics()
    };
    
    this.metrics.set(Date.now(), metrics);
    
    // Keep only last 100 metric snapshots
    if (this.metrics.size > 100) {
      const oldestKey = Math.min(...this.metrics.keys());
      this.metrics.delete(oldestKey);
    }
    
    return metrics;
  }

  async getSystemMetrics() {
    try {
      const { execSync } = require('child_process');
      
      // Memory usage
      const memInfo = execSync('free -m', { encoding: 'utf8' });
      const memLines = memInfo.split('\n')[1].split(/\s+/);
      const totalMem = parseInt(memLines[1]);
      const usedMem = parseInt(memLines[2]);
      const memoryUsage = usedMem / totalMem;
      
      // CPU usage (simplified)
      const loadAvg = execSync('uptime', { encoding: 'utf8' });
      const loadMatch = loadAvg.match(/load average: ([\d.]+)/);
      const cpuUsage = loadMatch ? parseFloat(loadMatch[1]) / 4 : 0; // Assuming 4 cores
      
      // Disk usage
      const diskInfo = execSync('df -h /', { encoding: 'utf8' });
      const diskLine = diskInfo.split('\n')[1].split(/\s+/);
      const diskUsage = parseInt(diskLine[4].replace('%', '')) / 100;
      
      return {
        memoryUsage,
        cpuUsage: Math.min(cpuUsage, 1),
        diskUsage,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.log(`Failed to collect system metrics: ${error.message}`, 'warning');
      return {
        memoryUsage: 0,
        cpuUsage: 0,
        diskUsage: 0,
        error: error.message
      };
    }
  }

  async getApplicationMetrics() {
    try {
      const healthUrl = `http://localhost:${process.env.PORT || 1337}/api/health`;
      const startTime = Date.now();
      
      const response = await axios.get(healthUrl, { timeout: 5000 });
      const responseTime = Date.now() - startTime;
      
      return {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        uptime: response.data?.uptime || 0,
        version: response.data?.version || 'unknown',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: 5000,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getDatabaseMetrics() {
    try {
      const { Client } = require('pg');
      const client = new Client({
        host: process.env.DATABASE_HOST || 'localhost',
        port: process.env.DATABASE_PORT || 5432,
        database: process.env.DATABASE_NAME || 'viktoria_wertheim',
        user: process.env.DATABASE_USERNAME || 'postgres',
        password: process.env.DATABASE_PASSWORD || ''
      });
      
      await client.connect();
      
      const startTime = Date.now();
      await client.query('SELECT 1');
      const queryTime = Date.now() - startTime;
      
      // Get connection count
      const connResult = await client.query(
        'SELECT count(*) as connections FROM pg_stat_activity WHERE state = \'active\''
      );
      const activeConnections = parseInt(connResult.rows[0].connections);
      
      // Get database size
      const sizeResult = await client.query(
        'SELECT pg_size_pretty(pg_database_size(current_database())) as size'
      );
      const databaseSize = sizeResult.rows[0].size;
      
      await client.end();
      
      return {
        status: 'healthy',
        queryTime,
        activeConnections,
        databaseSize,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getUserExperienceMetrics() {
    try {
      // Simulate user experience metrics collection
      // In a real implementation, this would integrate with analytics tools
      
      const errorLogPath = path.join(__dirname, '..', 'logs', 'strapi.log');
      let errorCount = 0;
      let totalRequests = 1000; // Simulated
      
      if (fs.existsSync(errorLogPath)) {
        const logContent = fs.readFileSync(errorLogPath, 'utf8');
        const recentLogs = logContent.split('\n').slice(-1000); // Last 1000 lines
        errorCount = recentLogs.filter(line => 
          line.includes('ERROR') || line.includes('error')
        ).length;
      }
      
      const errorRate = errorCount / totalRequests;
      
      return {
        errorRate,
        errorCount,
        totalRequests,
        userComplaints: 0, // Would be collected from support system
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        errorRate: 0,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getClubSystemMetrics() {
    try {
      const featureStatus = await this.flagManager.getFeatureStatus();
      
      // Calculate rollout percentages
      const rolloutMetrics = {};
      for (const [flagName, status] of Object.entries(featureStatus)) {
        if (flagName.startsWith('enableClub')) {
          rolloutMetrics[flagName] = {
            enabled: status.enabled,
            rolloutPercentage: status.rolloutPercentage,
            dependenciesMet: status.dependenciesMet.every(met => met)
          };
        }
      }
      
      // Get club system usage metrics (would be from actual usage data)
      const usageMetrics = {
        clubsCreated: 0,
        clubGamesCreated: 0,
        clubTablesGenerated: 0,
        migrationProgress: 100 // Percentage
      };
      
      return {
        rollout: rolloutMetrics,
        usage: usageMetrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  analyzeMetrics(metrics) {
    const issues = [];
    
    // Check system metrics
    if (metrics.system.memoryUsage > this.alertThresholds.memoryUsage) {
      issues.push({
        type: 'system',
        severity: 'critical',
        message: `High memory usage: ${(metrics.system.memoryUsage * 100).toFixed(1)}%`,
        value: metrics.system.memoryUsage,
        threshold: this.alertThresholds.memoryUsage
      });
    }
    
    if (metrics.system.cpuUsage > this.alertThresholds.cpuUsage) {
      issues.push({
        type: 'system',
        severity: 'warning',
        message: `High CPU usage: ${(metrics.system.cpuUsage * 100).toFixed(1)}%`,
        value: metrics.system.cpuUsage,
        threshold: this.alertThresholds.cpuUsage
      });
    }
    
    // Check application metrics
    if (metrics.application.responseTime > this.alertThresholds.responseTime) {
      issues.push({
        type: 'application',
        severity: 'critical',
        message: `High response time: ${metrics.application.responseTime}ms`,
        value: metrics.application.responseTime,
        threshold: this.alertThresholds.responseTime
      });
    }
    
    if (metrics.application.status !== 'healthy') {
      issues.push({
        type: 'application',
        severity: 'critical',
        message: `Application unhealthy: ${metrics.application.error || 'Unknown error'}`,
        value: metrics.application.status
      });
    }
    
    // Check user experience metrics
    if (metrics.userExperience.errorRate > this.alertThresholds.errorRate) {
      issues.push({
        type: 'userExperience',
        severity: 'critical',
        message: `High error rate: ${(metrics.userExperience.errorRate * 100).toFixed(2)}%`,
        value: metrics.userExperience.errorRate,
        threshold: this.alertThresholds.errorRate
      });
    }
    
    // Check database metrics
    if (metrics.database.status !== 'healthy') {
      issues.push({
        type: 'database',
        severity: 'critical',
        message: `Database unhealthy: ${metrics.database.error || 'Unknown error'}`,
        value: metrics.database.status
      });
    }
    
    return issues;
  }

  async handleAlert(issue) {
    this.alerts.push({
      ...issue,
      timestamp: new Date().toISOString(),
      acknowledged: false
    });
    
    this.log(`🚨 ALERT [${issue.severity.toUpperCase()}]: ${issue.message}`, 'error');
    
    // Send notifications (email, Slack, etc.)
    await this.sendNotification(issue);
    
    // Check if automatic rollback should be triggered
    if (this.shouldTriggerAutoRollback(issue)) {
      await this.triggerAutoRollback(issue);
    }
  }

  shouldTriggerAutoRollback(issue) {
    if (!this.enableAutoRollback) return false;
    if (this.environment !== 'production') return false;
    
    // Trigger rollback for critical issues
    const rollbackTriggers = [
      'High error rate',
      'Application unhealthy',
      'Database unhealthy',
      'High response time'
    ];
    
    return issue.severity === 'critical' && 
           rollbackTriggers.some(trigger => issue.message.includes(trigger));
  }

  async triggerAutoRollback(issue) {
    this.log(`🚨 TRIGGERING AUTOMATIC ROLLBACK due to: ${issue.message}`, 'error');
    
    try {
      // Emergency disable all club features
      await this.flagManager.emergencyDisableAll();
      
      // Log rollback action
      this.log('✅ Automatic rollback completed - all club features disabled', 'success');
      
      // Send critical notification
      await this.sendNotification({
        type: 'rollback',
        severity: 'critical',
        message: `Automatic rollback triggered: ${issue.message}`,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.log(`❌ Automatic rollback failed: ${error.message}`, 'error');
      
      // Send failure notification
      await this.sendNotification({
        type: 'rollback_failed',
        severity: 'critical',
        message: `Automatic rollback FAILED: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }

  async sendNotification(issue) {
    // In a real implementation, this would send notifications via:
    // - Email
    // - Slack/Teams
    // - PagerDuty
    // - SMS
    
    const notification = {
      environment: this.environment,
      timestamp: new Date().toISOString(),
      issue: issue,
      logFile: this.logFile
    };
    
    // Save notification to file for now
    const notificationFile = path.join(
      path.dirname(this.logFile), 
      `notification-${Date.now()}.json`
    );
    
    fs.writeFileSync(notificationFile, JSON.stringify(notification, null, 2));
    this.log(`📧 Notification saved: ${notificationFile}`, 'info');
  }

  async startMonitoring() {
    if (this.isMonitoring) {
      this.log('Monitoring is already running', 'warning');
      return;
    }
    
    this.isMonitoring = true;
    this.monitoringStartTime = Date.now();
    
    this.log(`🔍 Starting rollout monitoring for ${this.environment} environment`);
    this.log(`Monitoring interval: ${this.monitoringInterval}ms`);
    this.log(`Auto-rollback enabled: ${this.enableAutoRollback}`);
    
    const monitoringLoop = async () => {
      if (!this.isMonitoring) return;
      
      try {
        // Collect metrics
        const metrics = await this.collectSystemMetrics();
        
        // Analyze for issues
        const issues = this.analyzeMetrics(metrics);
        
        // Handle any alerts
        for (const issue of issues) {
          await this.handleAlert(issue);
        }
        
        // Log status
        if (issues.length === 0) {
          this.log('✅ All metrics within normal ranges', 'debug');
        } else {
          this.log(`⚠️  ${issues.length} issues detected`, 'warning');
        }
        
        // Schedule next check
        setTimeout(monitoringLoop, this.monitoringInterval);
        
      } catch (error) {
        this.log(`❌ Monitoring error: ${error.message}`, 'error');
        
        // Continue monitoring despite errors
        setTimeout(monitoringLoop, this.monitoringInterval);
      }
    };
    
    // Start monitoring loop
    monitoringLoop();
  }

  stopMonitoring() {
    if (!this.isMonitoring) {
      this.log('Monitoring is not running', 'warning');
      return;
    }
    
    this.isMonitoring = false;
    const duration = Date.now() - this.monitoringStartTime;
    
    this.log(`🛑 Stopping rollout monitoring after ${Math.round(duration / 1000)}s`);
    this.log(`Total alerts generated: ${this.alerts.length}`);
  }

  getMonitoringReport() {
    const duration = this.isMonitoring ? 
      Date.now() - this.monitoringStartTime : 
      0;
    
    const criticalAlerts = this.alerts.filter(alert => alert.severity === 'critical');
    const warningAlerts = this.alerts.filter(alert => alert.severity === 'warning');
    
    return {
      environment: this.environment,
      monitoringDuration: duration,
      isActive: this.isMonitoring,
      totalAlerts: this.alerts.length,
      criticalAlerts: criticalAlerts.length,
      warningAlerts: warningAlerts.length,
      autoRollbackEnabled: this.enableAutoRollback,
      logFile: this.logFile,
      alerts: this.alerts,
      latestMetrics: Array.from(this.metrics.values()).slice(-1)[0]
    };
  }

  async cleanup() {
    this.stopMonitoring();
    await this.flagManager.cleanup();
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2] || 'start';
  const environment = process.env.NODE_ENV || 'development';
  
  const monitor = new RolloutMonitor({
    environment,
    enableAutoRollback: process.argv.includes('--auto-rollback'),
    monitoringInterval: parseInt(process.env.MONITORING_INTERVAL) || 30000
  });
  
  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, stopping monitoring...');
    await monitor.cleanup();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, stopping monitoring...');
    await monitor.cleanup();
    process.exit(0);
  });
  
  async function runCommand() {
    try {
      switch (command) {
        case 'start':
          await monitor.startMonitoring();
          // Keep process alive
          setInterval(() => {}, 1000);
          break;
          
        case 'report':
          const report = monitor.getMonitoringReport();
          console.log(JSON.stringify(report, null, 2));
          break;
          
        case 'test':
          console.log('Running monitoring test...');
          const metrics = await monitor.collectSystemMetrics();
          console.log(JSON.stringify(metrics, null, 2));
          break;
          
        default:
          console.log('Usage:');
          console.log('  node rollout-monitor.js start [--auto-rollback]');
          console.log('  node rollout-monitor.js report');
          console.log('  node rollout-monitor.js test');
          process.exit(1);
      }
    } catch (error) {
      console.error('❌ Command failed:', error.message);
      process.exit(1);
    }
  }
  
  runCommand();
}

module.exports = RolloutMonitor;