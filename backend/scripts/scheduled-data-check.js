#!/usr/bin/env node

/**
 * Scheduled Data Integrity Check
 * 
 * This script can be run regularly (via cron or similar) to monitor
 * data consistency and send alerts if issues are found.
 * 
 * Usage: node scripts/scheduled-data-check.js [--email] [--slack] [--verbose]
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const ALERT_EMAIL = process.env.ALERT_EMAIL;
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK;
const LOG_FILE = process.env.LOG_FILE || path.join(__dirname, '../logs/data-integrity.log');

// Command line arguments
const args = process.argv.slice(2);
const shouldEmail = args.includes('--email');
const shouldSlack = args.includes('--slack');
const verbose = args.includes('--verbose');

class ScheduledDataChecker {
  constructor() {
    this.api = axios.create({
      baseURL: `${STRAPI_URL}/api`,
      headers: API_TOKEN ? {
        'Authorization': `Bearer ${API_TOKEN}`
      } : {}
    });
  }

  async runCheck() {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Starting scheduled data integrity check...`);

    try {
      // Run comprehensive validation
      const response = await this.api.get('/system-maintenance/data-integrity/validate-all');
      const result = response.data;

      // Log results
      await this.logResults(result, timestamp);

      if (result.success) {
        console.log(`[${timestamp}] ✅ All data integrity checks passed`);
        if (verbose) {
          console.log(`   - Total checks: ${result.data.summary.totalChecks}`);
          console.log(`   - Passed: ${result.data.summary.passedChecks}`);
          console.log(`   - Failed: ${result.data.summary.failedChecks}`);
        }
      } else {
        console.log(`[${timestamp}] ❌ Data integrity issues found`);
        console.log(`   - Errors: ${result.data.errors.length}`);
        console.log(`   - Warnings: ${result.data.warnings.length}`);
        
        if (verbose) {
          result.data.errors.forEach(error => console.log(`     ERROR: ${error}`));
          result.data.warnings.forEach(warning => console.log(`     WARNING: ${warning}`));
        }

        // Send alerts if configured
        await this.sendAlerts(result, timestamp);
      }

      // Get and log statistics
      const statsResponse = await this.api.get('/system-maintenance/data-integrity/statistics');
      const stats = statsResponse.data.data;
      
      if (verbose) {
        console.log(`[${timestamp}] 📊 Data Statistics:`);
        console.log(`   - Teams: ${stats.teams}`);
        console.log(`   - Spielers: ${stats.spielers}`);
        console.log(`   - Spiele: ${stats.spiele}`);
      }

      await this.logStatistics(stats, timestamp);

      return result.success;

    } catch (error) {
      const errorMsg = `Data integrity check failed: ${error.message}`;
      console.error(`[${timestamp}] ❌ ${errorMsg}`);
      
      await this.logError(error, timestamp);
      
      if (shouldEmail || shouldSlack) {
        await this.sendErrorAlert(error, timestamp);
      }
      
      return false;
    }
  }

  async logResults(result, timestamp) {
    const logEntry = {
      timestamp,
      success: result.success,
      summary: result.data.summary,
      errorCount: result.data.errors.length,
      warningCount: result.data.warnings.length,
      errors: result.data.errors,
      warnings: result.data.warnings
    };

    await this.writeToLog(logEntry);
  }

  async logStatistics(stats, timestamp) {
    const logEntry = {
      timestamp,
      type: 'statistics',
      data: stats
    };

    await this.writeToLog(logEntry);
  }

  async logError(error, timestamp) {
    const logEntry = {
      timestamp,
      type: 'error',
      message: error.message,
      stack: error.stack
    };

    await this.writeToLog(logEntry);
  }

  async writeToLog(entry) {
    try {
      // Ensure log directory exists
      const logDir = path.dirname(LOG_FILE);
      await fs.mkdir(logDir, { recursive: true });

      // Append to log file
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(LOG_FILE, logLine);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  async sendAlerts(result, timestamp) {
    const alertMessage = this.formatAlertMessage(result, timestamp);

    if (shouldEmail && ALERT_EMAIL) {
      await this.sendEmailAlert(alertMessage);
    }

    if (shouldSlack && SLACK_WEBHOOK) {
      await this.sendSlackAlert(alertMessage);
    }
  }

  async sendErrorAlert(error, timestamp) {
    const alertMessage = `🚨 Data Integrity Check Failed\n\nTime: ${timestamp}\nError: ${error.message}`;

    if (shouldEmail && ALERT_EMAIL) {
      await this.sendEmailAlert(alertMessage);
    }

    if (shouldSlack && SLACK_WEBHOOK) {
      await this.sendSlackAlert(alertMessage);
    }
  }

  formatAlertMessage(result, timestamp) {
    let message = `🚨 Data Integrity Issues Detected\n\n`;
    message += `Time: ${timestamp}\n`;
    message += `Total Checks: ${result.data.summary.totalChecks}\n`;
    message += `Failed Checks: ${result.data.summary.failedChecks}\n`;
    message += `Errors: ${result.data.errors.length}\n`;
    message += `Warnings: ${result.data.warnings.length}\n\n`;

    if (result.data.errors.length > 0) {
      message += `Errors:\n`;
      result.data.errors.forEach(error => {
        message += `• ${error}\n`;
      });
    }

    if (result.data.warnings.length > 0) {
      message += `\nWarnings:\n`;
      result.data.warnings.forEach(warning => {
        message += `• ${warning}\n`;
      });
    }

    return message;
  }

  async sendEmailAlert(message) {
    try {
      // This is a placeholder - implement actual email sending
      // You might use nodemailer, sendgrid, or similar
      console.log(`📧 Would send email alert to ${ALERT_EMAIL}:`);
      console.log(message);
    } catch (error) {
      console.error('Failed to send email alert:', error.message);
    }
  }

  async sendSlackAlert(message) {
    try {
      await axios.post(SLACK_WEBHOOK, {
        text: message,
        username: 'Data Integrity Bot',
        icon_emoji: ':warning:'
      });
      console.log('📱 Slack alert sent successfully');
    } catch (error) {
      console.error('Failed to send Slack alert:', error.message);
    }
  }

  async generateReport() {
    try {
      // Read recent log entries
      const logContent = await fs.readFile(LOG_FILE, 'utf8');
      const logLines = logContent.trim().split('\n').filter(line => line);
      const recentEntries = logLines.slice(-100).map(line => JSON.parse(line));

      // Generate summary report
      const report = {
        generatedAt: new Date().toISOString(),
        totalChecks: recentEntries.length,
        successfulChecks: recentEntries.filter(e => e.success).length,
        failedChecks: recentEntries.filter(e => e.success === false).length,
        recentErrors: recentEntries
          .filter(e => e.errors && e.errors.length > 0)
          .slice(-10)
          .map(e => ({
            timestamp: e.timestamp,
            errors: e.errors
          })),
        statistics: recentEntries
          .filter(e => e.type === 'statistics')
          .slice(-1)[0]?.data || null
      };

      // Write report to file
      const reportFile = path.join(path.dirname(LOG_FILE), 'data-integrity-report.json');
      await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
      
      console.log(`📊 Report generated: ${reportFile}`);
      return report;

    } catch (error) {
      console.error('Failed to generate report:', error.message);
      return null;
    }
  }
}

// Main execution
async function main() {
  const checker = new ScheduledDataChecker();
  
  if (args.includes('--report')) {
    await checker.generateReport();
    return;
  }

  const success = await checker.runCheck();
  process.exit(success ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Scheduled check failed:', error);
    process.exit(1);
  });
}

module.exports = ScheduledDataChecker;