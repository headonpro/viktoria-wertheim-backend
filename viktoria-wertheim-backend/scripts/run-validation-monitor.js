#!/usr/bin/env node

/**
 * Validation Monitor Runner
 * 
 * Easy-to-use wrapper for running the validation consistency monitor
 * with different configurations and options
 */

const ValidationConsistencyMonitor = require('./validation-consistency-monitor');
const fs = require('fs').promises;
const path = require('path');

class MonitorRunner {
  constructor() {
    this.configFile = path.join(__dirname, 'monitor-config.json');
    this.defaultConfig = {
      baseUrl: 'http://localhost:1337',
      monitorInterval: 30000,
      alertThreshold: 3,
      logFile: '../validation-reports/monitor-log.json',
      alertFile: '../validation-reports/validation-alerts.json'
    };
  }

  /**
   * Load configuration from file
   */
  async loadConfig() {
    try {
      const configData = await fs.readFile(this.configFile, 'utf8');
      return { ...this.defaultConfig, ...JSON.parse(configData) };
    } catch (error) {
      console.log('⚠️  Using default configuration (config file not found)');
      return this.defaultConfig;
    }
  }

  /**
   * Run monitor with specified mode
   */
  async run(mode = 'start', options = {}) {
    const config = await this.loadConfig();
    
    // Override config with command line options
    if (options.interval) config.monitorInterval = parseInt(options.interval) * 1000;
    if (options.threshold) config.alertThreshold = parseInt(options.threshold);
    if (options.url) config.baseUrl = options.url;

    const monitor = new ValidationConsistencyMonitor(config);

    switch (mode) {
      case 'start':
        console.log('🚀 Starting validation consistency monitor...');
        await monitor.startMonitoring();
        break;

      case 'check':
        console.log('🔍 Performing single validation check...');
        await monitor.performValidationCheck();
        console.log('✅ Check completed');
        break;

      case 'status':
        console.log('📊 Monitor Status:');
        console.log(JSON.stringify(monitor.getStatus(), null, 2));
        break;

      case 'test':
        console.log('🧪 Running monitor test...');
        const testMonitor = require('./test-validation-monitor');
        await testMonitor.testMonitor();
        break;

      case 'logs':
        await this.showLogs(config);
        break;

      case 'alerts':
        await this.showAlerts(config);
        break;

      default:
        this.showHelp();
        process.exit(1);
    }
  }

  /**
   * Show recent logs
   */
  async showLogs(config) {
    try {
      const logFile = path.resolve(__dirname, config.logFile);
      const logData = await fs.readFile(logFile, 'utf8');
      const logs = JSON.parse(logData);
      
      console.log('📋 Recent Validation Logs:');
      console.log('=' .repeat(50));
      
      logs.slice(-10).forEach((log, index) => {
        console.log(`\n${index + 1}. ${log.timestamp}`);
        console.log(`   Status: ${log.hasInconsistencies ? '❌ Issues Found' : '✅ All Good'}`);
        if (log.error) {
          console.log(`   Error: ${log.error}`);
        }
        if (log.results) {
          Object.entries(log.results).forEach(([type, result]) => {
            console.log(`   ${type}: ${result.consistent ? '✅' : '❌'}`);
          });
        }
      });
      
    } catch (error) {
      console.log('❌ No logs found or error reading logs:', error.message);
    }
  }

  /**
   * Show recent alerts
   */
  async showAlerts(config) {
    try {
      const alertFile = path.resolve(__dirname, config.alertFile);
      const alertData = await fs.readFile(alertFile, 'utf8');
      const alerts = JSON.parse(alertData);
      
      console.log('🚨 Recent Validation Alerts:');
      console.log('=' .repeat(50));
      
      alerts.slice(-5).forEach((alert, index) => {
        console.log(`\n${index + 1}. ${alert.timestamp}`);
        console.log(`   Type: ${alert.type}`);
        console.log(`   Severity: ${alert.severity}`);
        console.log(`   Message: ${alert.message}`);
        console.log(`   Consecutive Failures: ${alert.consecutiveFailures}`);
      });
      
    } catch (error) {
      console.log('❌ No alerts found or error reading alerts:', error.message);
    }
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
🔍 Validation Consistency Monitor Runner

Usage: node run-validation-monitor.js <command> [options]

Commands:
  start     Start continuous monitoring (default)
  check     Perform single validation check
  status    Show current monitor status
  test      Run monitor test suite
  logs      Show recent monitoring logs
  alerts    Show recent validation alerts
  help      Show this help message

Options:
  --interval <seconds>    Monitoring interval in seconds (default: 30)
  --threshold <number>    Alert threshold for consecutive failures (default: 3)
  --url <url>            Strapi base URL (default: http://localhost:1337)

Examples:
  node run-validation-monitor.js start
  node run-validation-monitor.js check
  node run-validation-monitor.js start --interval 60 --threshold 5
  node run-validation-monitor.js logs
  node run-validation-monitor.js alerts

Environment Variables:
  STRAPI_ADMIN_TOKEN     Admin token for Strapi
  STRAPI_API_TOKEN       API token for Strapi
`);
  }
}

// CLI interface
if (require.main === module) {
  const runner = new MonitorRunner();
  const args = process.argv.slice(2);
  
  // Parse command and options
  const command = args[0] || 'start';
  const options = {};
  
  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--interval':
        options.interval = value;
        break;
      case '--threshold':
        options.threshold = value;
        break;
      case '--url':
        options.url = value;
        break;
    }
  }
  
  runner.run(command, options).catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
}

module.exports = MonitorRunner;