#!/usr/bin/env node

/**
 * Validation Consistency Monitor
 * 
 * Continuously monitors validation behavior between admin interface and API
 * Detects validation discrepancies and alerts when inconsistencies are found
 * 
 * Requirements: 3.1, 3.2, 3.3, 5.3
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ValidationConsistencyMonitor {
  constructor(config = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:1337',
      adminToken: config.adminToken || process.env.STRAPI_ADMIN_TOKEN,
      apiToken: config.apiToken || process.env.STRAPI_API_TOKEN,
      monitorInterval: config.monitorInterval || 30000, // 30 seconds
      alertThreshold: config.alertThreshold || 3, // Alert after 3 consecutive failures
      logFile: config.logFile || path.join(__dirname, '../validation-reports/monitor-log.json'),
      alertFile: config.alertFile || path.join(__dirname, '../validation-reports/validation-alerts.json'),
      ...config
    };
    
    this.consecutiveFailures = 0;
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.validationHistory = [];
    this.alerts = [];
  }

  /**
   * Start continuous monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️  Monitor is already running');
      return;
    }

    console.log('🔍 Starting validation consistency monitoring...');
    console.log(`📊 Monitoring interval: ${this.config.monitorInterval / 1000}s`);
    console.log(`🚨 Alert threshold: ${this.config.alertThreshold} consecutive failures`);
    
    this.isMonitoring = true;
    
    // Initial check
    await this.performValidationCheck();
    
    // Set up interval monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.performValidationCheck();
    }, this.config.monitorInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Stopping validation monitor...');
      this.stopMonitoring();
      process.exit(0);
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('✅ Validation monitoring stopped');
  }

  /**
   * Perform a single validation consistency check
   */
  async performValidationCheck() {
    const timestamp = new Date().toISOString();
    console.log(`\n🔍 [${timestamp}] Performing validation consistency check...`);

    try {
      const results = await this.checkAllContentTypes();
      const hasInconsistencies = this.analyzeResults(results);
      
      const checkResult = {
        timestamp,
        results,
        hasInconsistencies,
        consecutiveFailures: this.consecutiveFailures
      };

      // Log results
      await this.logResults(checkResult);
      
      if (hasInconsistencies) {
        this.consecutiveFailures++;
        console.log(`❌ Validation inconsistencies detected (${this.consecutiveFailures}/${this.config.alertThreshold})`);
        
        if (this.consecutiveFailures >= this.config.alertThreshold) {
          await this.triggerAlert(checkResult);
        }
      } else {
        this.consecutiveFailures = 0;
        console.log('✅ All validation checks passed');
      }

    } catch (error) {
      console.error('❌ Error during validation check:', error.message);
      this.consecutiveFailures++;
      
      const errorResult = {
        timestamp,
        error: error.message,
        hasInconsistencies: true,
        consecutiveFailures: this.consecutiveFailures
      };
      
      await this.logResults(errorResult);
      
      if (this.consecutiveFailures >= this.config.alertThreshold) {
        await this.triggerAlert(errorResult);
      }
    }
  }

  /**
   * Check validation consistency for all content types
   */
  async checkAllContentTypes() {
    const contentTypes = [
      {
        name: 'mannschaft',
        testData: {
          name: 'Test Team Monitor',
          status: 'aktiv',
          liga: 'Kreisklasse A',
          gruendungsjahr: 2020
        }
      },
      {
        name: 'spieler',
        testData: {
          name: 'Test Player Monitor',
          position: 'Torwart'
        }
      }
    ];

    const results = {};

    for (const contentType of contentTypes) {
      console.log(`  📋 Testing ${contentType.name}...`);
      
      try {
        const apiResult = await this.testApiValidation(contentType);
        const adminResult = await this.testAdminValidation(contentType);
        
        results[contentType.name] = {
          api: apiResult,
          admin: adminResult,
          consistent: this.compareValidationResults(apiResult, adminResult)
        };
        
        console.log(`    ${results[contentType.name].consistent ? '✅' : '❌'} ${contentType.name}`);
        
      } catch (error) {
        console.log(`    ❌ ${contentType.name} - Error: ${error.message}`);
        results[contentType.name] = {
          error: error.message,
          consistent: false
        };
      }
    }

    return results;
  }

  /**
   * Test API validation
   */
  async testApiValidation(contentType) {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/api/${contentType.name}s`,
        { data: contentType.testData },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Clean up test data
      if (response.data?.data?.id) {
        await this.cleanupTestData(contentType.name, response.data.data.id);
      }

      return {
        success: true,
        status: response.status,
        validationPassed: true
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status,
        error: error.response?.data?.error?.message || error.message,
        validationPassed: false
      };
    }
  }

  /**
   * Test admin validation (simulated through API with admin token)
   */
  async testAdminValidation(contentType) {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/content-manager/collection-types/api::${contentType.name}.${contentType.name}`,
        contentType.testData,
        {
          headers: {
            'Authorization': `Bearer ${this.config.adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Clean up test data
      if (response.data?.id) {
        await this.cleanupAdminTestData(contentType.name, response.data.id);
      }

      return {
        success: true,
        status: response.status,
        validationPassed: true
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status,
        error: error.response?.data?.error?.message || error.message,
        validationPassed: false
      };
    }
  }

  /**
   * Compare validation results between API and admin
   */
  compareValidationResults(apiResult, adminResult) {
    // Both should have same success/failure status
    if (apiResult.success !== adminResult.success) {
      return false;
    }

    // If both failed, check if error messages are similar
    if (!apiResult.success && !adminResult.success) {
      return this.compareErrorMessages(apiResult.error, adminResult.error);
    }

    // If both succeeded, they are consistent
    return apiResult.success && adminResult.success;
  }

  /**
   * Compare error messages for similarity
   */
  compareErrorMessages(apiError, adminError) {
    if (!apiError || !adminError) return false;
    
    // Normalize error messages for comparison
    const normalizeError = (error) => 
      error.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const normalizedApi = normalizeError(apiError);
    const normalizedAdmin = normalizeError(adminError);
    
    // Check if errors contain similar validation keywords
    const validationKeywords = ['validation', 'invalid', 'required', 'enum'];
    const apiKeywords = validationKeywords.filter(keyword => normalizedApi.includes(keyword));
    const adminKeywords = validationKeywords.filter(keyword => normalizedAdmin.includes(keyword));
    
    return apiKeywords.length > 0 && adminKeywords.length > 0;
  }

  /**
   * Analyze results to determine if there are inconsistencies
   */
  analyzeResults(results) {
    return Object.values(results).some(result => !result.consistent);
  }

  /**
   * Log monitoring results
   */
  async logResults(result) {
    try {
      // Ensure directory exists
      const logDir = path.dirname(this.config.logFile);
      await fs.mkdir(logDir, { recursive: true });

      // Read existing log
      let logData = [];
      try {
        const existingLog = await fs.readFile(this.config.logFile, 'utf8');
        logData = JSON.parse(existingLog);
      } catch (error) {
        // File doesn't exist or is invalid, start fresh
      }

      // Add new result
      logData.push(result);

      // Keep only last 100 entries
      if (logData.length > 100) {
        logData = logData.slice(-100);
      }

      // Write updated log
      await fs.writeFile(this.config.logFile, JSON.stringify(logData, null, 2));
      
    } catch (error) {
      console.error('❌ Error logging results:', error.message);
    }
  }

  /**
   * Trigger alert for validation inconsistencies
   */
  async triggerAlert(result) {
    const alert = {
      timestamp: new Date().toISOString(),
      type: 'VALIDATION_INCONSISTENCY',
      severity: 'HIGH',
      message: `Validation inconsistencies detected for ${this.consecutiveFailures} consecutive checks`,
      details: result,
      consecutiveFailures: this.consecutiveFailures
    };

    this.alerts.push(alert);
    
    console.log('\n🚨 ALERT TRIGGERED 🚨');
    console.log(`📅 Time: ${alert.timestamp}`);
    console.log(`⚠️  Type: ${alert.type}`);
    console.log(`🔥 Severity: ${alert.severity}`);
    console.log(`📝 Message: ${alert.message}`);
    
    // Save alert to file
    try {
      const alertDir = path.dirname(this.config.alertFile);
      await fs.mkdir(alertDir, { recursive: true });
      
      let existingAlerts = [];
      try {
        const existingData = await fs.readFile(this.config.alertFile, 'utf8');
        existingAlerts = JSON.parse(existingData);
      } catch (error) {
        // File doesn't exist, start fresh
      }
      
      existingAlerts.push(alert);
      await fs.writeFile(this.config.alertFile, JSON.stringify(existingAlerts, null, 2));
      
      console.log(`💾 Alert saved to: ${this.config.alertFile}`);
      
    } catch (error) {
      console.error('❌ Error saving alert:', error.message);
    }
  }

  /**
   * Clean up test data created via API
   */
  async cleanupTestData(contentType, id) {
    try {
      await axios.delete(
        `${this.config.baseUrl}/api/${contentType}s/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`
          }
        }
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Clean up test data created via admin
   */
  async cleanupAdminTestData(contentType, id) {
    try {
      await axios.delete(
        `${this.config.baseUrl}/content-manager/collection-types/api::${contentType}.${contentType}/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.adminToken}`
          }
        }
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      consecutiveFailures: this.consecutiveFailures,
      alertThreshold: this.config.alertThreshold,
      totalAlerts: this.alerts.length,
      lastCheck: this.validationHistory.length > 0 ? 
        this.validationHistory[this.validationHistory.length - 1].timestamp : null
    };
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new ValidationConsistencyMonitor();
  
  // Handle command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'start':
      monitor.startMonitoring();
      break;
    case 'check':
      monitor.performValidationCheck().then(() => process.exit(0));
      break;
    case 'status':
      console.log('Monitor Status:', monitor.getStatus());
      process.exit(0);
      break;
    default:
      console.log('Usage: node validation-consistency-monitor.js [start|check|status]');
      console.log('  start  - Start continuous monitoring');
      console.log('  check  - Perform single validation check');
      console.log('  status - Show current monitoring status');
      process.exit(1);
  }
}

module.exports = ValidationConsistencyMonitor;