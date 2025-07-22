#!/usr/bin/env node

/**
 * Validation Test Automation Suite Runner
 * 
 * Standalone script to run the comprehensive validation test automation suite
 * with continuous monitoring and health report generation.
 * 
 * Usage:
 *   node scripts/run-validation-automation-suite.js [options]
 * 
 * Options:
 *   --continuous [iterations]  Run continuous validation tests (default: 5)
 *   --interval [ms]           Interval between continuous tests (default: 10000)
 *   --report-only            Generate report from existing test data
 *   --cleanup                Clean up test records after completion
 *   --verbose                Enable verbose output
 *   --help                   Show this help message
 * 
 * Requirements: 3.1, 3.2, 3.3, 5.2
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { program } = require('commander');

// Configuration
const CONFIG = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@viktoria-wertheim.de',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  TIMEOUT: 15000,
  REPORT_DIR: './validation-reports',
  DEFAULT_CONTINUOUS_ITERATIONS: 5,
  DEFAULT_INTERVAL: 10000
};

// Content type definitions (same as in test file)
const CONTENT_TYPES = {
  mannschaft: {
    endpoint: 'mannschaften',
    adminEndpoint: 'api::mannschaft.mannschaft',
    schema: {
      name: { type: 'string', required: true, unique: true },
      status: { 
        type: 'enumeration', 
        required: true, 
        enum: ['aktiv', 'inaktiv', 'aufgeloest'],
        invalid: ['active', 'inactive', 'dissolved', '', null, 'AKTIV']
      },
      liga: { 
        type: 'enumeration', 
        required: true, 
        enum: ['Kreisklasse B', 'Kreisklasse A', 'Kreisliga', 'Landesliga'],
        invalid: ['Kreisklasse C', 'Bezirksliga', '', null, 'kreisklasse b']
      },
      altersklasse: { 
        type: 'enumeration', 
        required: true, 
        enum: ['senioren', 'a-jugend', 'b-jugend', 'c-jugend', 'd-jugend', 'e-jugend', 'f-jugend', 'bambini'],
        invalid: ['senior', 'herren', '', null, 'A-Jugend']
      },
      trend: { 
        type: 'enumeration', 
        required: true, 
        enum: ['steigend', 'gleich', 'fallend'],
        default: 'gleich',
        invalid: ['aufsteigend', 'stabil', '', null, 'STEIGEND']
      }
    },
    baseData: {
      saison: '2024/25',
      spielort: 'Sportplatz Wertheim',
      punkte: 0,
      spiele_gesamt: 0,
      siege: 0,
      unentschieden: 0,
      niederlagen: 0,
      tore_fuer: 0,
      tore_gegen: 0,
      tordifferenz: 0,
      gruendungsjahr: 2020,
      tabellenplatz: 1
    }
  },
  spiel: {
    endpoint: 'spiele',
    adminEndpoint: 'api::spiel.spiel',
    schema: {
      datum: { type: 'datetime', required: true },
      status: { 
        type: 'enumeration', 
        enum: ['geplant', 'live', 'beendet', 'abgesagt', 'verschoben'],
        default: 'geplant',
        invalid: ['planned', 'finished', 'cancelled', '', null]
      },
      wetter: { 
        type: 'enumeration', 
        enum: ['sonnig', 'bewoelkt', 'regen', 'schnee', 'wind'],
        invalid: ['sunny', 'cloudy', 'rainy', '', null]
      }
    },
    baseData: {
      spielort: 'Sportplatz Wertheim',
      liga: 'Kreisklasse B',
      saison: '2024/25',
      tore_heim: 0,
      tore_auswaerts: 0,
      spieltag: 1,
      zuschauer: 0
    }
  },
  spieler: {
    endpoint: 'spielers',
    adminEndpoint: 'api::spieler.spieler',
    schema: {
      position: { 
        type: 'enumeration', 
        required: true, 
        enum: ['torwart', 'abwehr', 'mittelfeld', 'sturm'],
        invalid: ['goalkeeper', 'defense', 'midfield', 'forward', '', null]
      },
      status: { 
        type: 'enumeration', 
        enum: ['aktiv', 'verletzt', 'gesperrt', 'pausiert', 'inaktiv'],
        default: 'aktiv',
        invalid: ['active', 'injured', 'suspended', '', null]
      },
      hauptposition: { 
        type: 'enumeration', 
        enum: ['torwart', 'innenverteidiger', 'aussenverteidiger', 'defensives_mittelfeld', 'zentrales_mittelfeld', 'offensives_mittelfeld', 'fluegelstuermer', 'mittelstuermer'],
        invalid: ['goalkeeper', 'defender', '', null]
      }
    },
    baseData: {
      vorname: 'Test',
      nachname: 'Spieler',
      rueckennummer: 1,
      tore_saison: 0,
      spiele_saison: 0,
      gelbe_karten: 0,
      rote_karten: 0,
      einsatzminuten: 0,
      assists: 0,
      kapitaen: false,
      vizekapitaen: false
    }
  }
};

class ValidationAutomationRunner {
  constructor(options = {}) {
    this.options = {
      continuous: options.continuous || false,
      iterations: options.iterations || CONFIG.DEFAULT_CONTINUOUS_ITERATIONS,
      interval: options.interval || CONFIG.DEFAULT_INTERVAL,
      reportOnly: options.reportOnly || false,
      cleanup: options.cleanup || false,
      verbose: options.verbose || false
    };
    
    this.authToken = null;
    this.createdRecords = {};
    this.testStartTime = Date.now();
    this.results = [];
    
    // Initialize created records tracking
    Object.keys(CONTENT_TYPES).forEach(contentType => {
      this.createdRecords[contentType] = { admin: [], api: [] };
    });
  }

  log(message, level = 'info') {
    if (this.options.verbose || level === 'error' || level === 'warn') {
      const timestamp = new Date().toISOString();
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
      console.log(`${prefix} [${timestamp}] ${message}`);
    }
  }

  async authenticate() {
    try {
      this.log('Authenticating with Strapi admin...');
      const response = await axios.post(`${CONFIG.STRAPI_URL}/admin/auth/local`, {
        email: CONFIG.ADMIN_EMAIL,
        password: CONFIG.ADMIN_PASSWORD
      });

      this.authToken = response.data.data.token;
      this.log('Authentication successful');
      return true;
    } catch (error) {
      this.log(`Authentication failed: ${error.message}`, 'error');
      return false;
    }
  }

  async createViaAdmin(contentType, data) {
    const config = CONTENT_TYPES[contentType];
    const testData = {
      ...config.baseData,
      ...data,
      name: data.name ? `${data.name}-Admin-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` : undefined
    };

    try {
      const response = await axios.post(
        `${CONFIG.STRAPI_URL}/admin/content-manager/collection-types/${config.adminEndpoint}`,
        testData,
        {
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: CONFIG.TIMEOUT
        }
      );

      if (response.data?.id) {
        this.createdRecords[contentType].admin.push(response.data.id);
      }

      return {
        success: true,
        statusCode: response.status,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        validationDetails: error.response?.data?.error?.details || null,
        timestamp: new Date().toISOString()
      };
    }
  }

  async createViaAPI(contentType, data) {
    const config = CONTENT_TYPES[contentType];
    const testData = {
      data: {
        ...config.baseData,
        ...data,
        name: data.name ? `${data.name}-API-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` : undefined
      }
    };

    try {
      const response = await axios.post(
        `${CONFIG.STRAPI_URL}/api/${config.endpoint}`,
        testData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: CONFIG.TIMEOUT
        }
      );

      if (response.data?.data?.id) {
        this.createdRecords[contentType].api.push(response.data.data.id);
      }

      return {
        success: true,
        statusCode: response.status,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        validationDetails: error.response?.data?.error?.details || null,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testEnumField(contentType, fieldName, value, expected) {
    const testData = { [fieldName]: value };
    
    // Add required fields for the content type
    const config = CONTENT_TYPES[contentType];
    Object.entries(config.schema).forEach(([field, fieldConfig]) => {
      if (fieldConfig.required && field !== fieldName) {
        if (fieldConfig.type === 'enumeration' && fieldConfig.enum) {
          testData[field] = fieldConfig.enum[0]; // Use first valid enum value
        } else if (field === 'name') {
          testData[field] = `EnumTest-${fieldName}-${Date.now()}`;
        } else if (field === 'datum') {
          testData[field] = new Date().toISOString();
        }
      }
    });

    const adminResult = await this.createViaAdmin(contentType, testData);
    const apiResult = await this.createViaAPI(contentType, testData);

    const expectedSuccess = expected === 'valid';
    const adminPassed = adminResult.success === expectedSuccess;
    const apiPassed = apiResult.success === expectedSuccess;
    const consistent = adminResult.success === apiResult.success;
    const passed = adminPassed && apiPassed && consistent;

    return {
      contentType,
      field: fieldName,
      value,
      expected,
      adminResult,
      apiResult,
      consistent,
      passed
    };
  }

  async runEnumValidationTests() {
    this.log('Running comprehensive enum validation tests...');
    const results = [];

    for (const [contentType, config] of Object.entries(CONTENT_TYPES)) {
      this.log(`Testing content type: ${contentType}`);
      
      for (const [fieldName, fieldConfig] of Object.entries(config.schema)) {
        if (fieldConfig.type === 'enumeration') {
          this.log(`  Testing enum field: ${fieldName}`);
          
          // Test valid enum values
          if (fieldConfig.enum) {
            for (const validValue of fieldConfig.enum) {
              const result = await this.testEnumField(contentType, fieldName, validValue, 'valid');
              results.push(result);
              
              if (!result.passed) {
                this.log(`    ❌ Valid value '${validValue}' failed`, 'warn');
              } else if (this.options.verbose) {
                this.log(`    ✅ Valid value '${validValue}' passed`);
              }
            }
          }

          // Test invalid enum values
          if (fieldConfig.invalid) {
            for (const invalidValue of fieldConfig.invalid) {
              const result = await this.testEnumField(contentType, fieldName, invalidValue, 'invalid');
              results.push(result);
              
              if (!result.passed) {
                this.log(`    ❌ Invalid value '${invalidValue}' incorrectly accepted`, 'warn');
              } else if (this.options.verbose) {
                this.log(`    ✅ Invalid value '${invalidValue}' correctly rejected`);
              }
            }
          }
        }
      }
    }

    this.log(`Completed ${results.length} enum validation tests`);
    return results;
  }

  async generateHealthReport(enumResults, iteration) {
    const totalTests = enumResults.length;
    const passedTests = enumResults.filter(r => r.passed).length;
    const consistentTests = enumResults.filter(r => r.consistent).length;
    const criticalIssues = enumResults.filter(r => !r.consistent || (!r.passed && r.expected === 'valid')).length;

    // Group results by content type
    const contentTypeResults = {};
    
    for (const contentType of Object.keys(CONTENT_TYPES)) {
      const typeResults = enumResults.filter(r => r.contentType === contentType);
      const typePassedTests = typeResults.filter(r => r.passed).length;
      
      const enumFieldResults = {};
      
      // Group by field
      const fieldGroups = typeResults.reduce((acc, result) => {
        if (!acc[result.field]) acc[result.field] = [];
        acc[result.field].push(result);
        return acc;
      }, {});

      for (const [field, fieldResults] of Object.entries(fieldGroups)) {
        const validTests = fieldResults.filter(r => r.expected === 'valid');
        const invalidTests = fieldResults.filter(r => r.expected === 'invalid');
        const fieldPassedTests = fieldResults.filter(r => r.passed).length;
        const consistencyIssues = fieldResults.filter(r => !r.consistent).length;

        enumFieldResults[field] = {
          validValuesTests: validTests.length,
          invalidValuesTests: invalidTests.length,
          passedTests: fieldPassedTests,
          failedTests: fieldResults.length - fieldPassedTests,
          consistencyIssues
        };
      }

      const criticalIssuesForType = typeResults
        .filter(r => !r.consistent || (!r.passed && r.expected === 'valid'))
        .map(r => `${r.field}: ${r.value} (${r.expected})`);

      contentTypeResults[contentType] = {
        totalTests: typeResults.length,
        passedTests: typePassedTests,
        enumFieldResults,
        criticalIssues: criticalIssuesForType
      };
    }

    // Generate recommendations
    const recommendations = [];
    
    if (criticalIssues > 0) {
      recommendations.push('Critical validation inconsistencies detected - immediate attention required');
    }
    
    const failureRate = ((totalTests - passedTests) / totalTests) * 100;
    if (failureRate > 10) {
      recommendations.push('High validation failure rate detected - review enum definitions and validation logic');
    }
    
    const consistencyRate = (consistentTests / totalTests) * 100;
    if (consistencyRate < 95) {
      recommendations.push('Admin/API validation inconsistency detected - synchronize validation rules');
    }

    const enumFieldsTotal = Object.values(CONTENT_TYPES).reduce((total, config) => {
      return total + Object.values(config.schema).filter(field => field.type === 'enumeration').length;
    }, 0);

    const enumFieldsHealthy = Object.values(contentTypeResults).reduce((total, typeResult) => {
      return total + Object.values(typeResult.enumFieldResults).filter(
        fieldResult => fieldResult.failedTests === 0 && fieldResult.consistencyIssues === 0
      ).length;
    }, 0);

    const report = {
      metadata: {
        title: 'Validation Test Automation Health Report',
        generated: new Date().toISOString(),
        testDuration: Date.now() - this.testStartTime,
        options: this.options
      },
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate: (passedTests / totalTests) * 100,
        consistencyRate,
        criticalIssues,
        enumFieldsHealthy,
        enumFieldsTotal
      },
      contentTypeResults,
      enumTestResults: enumResults,
      recommendations
    };

    if (iteration !== undefined) {
      report.metadata.continuousIterations = iteration;
    }

    return report;
  }

  async cleanupTestRecords() {
    if (!this.options.cleanup) {
      this.log('Skipping cleanup (use --cleanup to enable)');
      return;
    }

    this.log('Cleaning up test records...');
    let cleanedCount = 0;
    
    for (const [contentType, records] of Object.entries(this.createdRecords)) {
      const config = CONTENT_TYPES[contentType];
      
      // Cleanup admin records
      for (const id of records.admin) {
        try {
          await axios.delete(
            `${CONFIG.STRAPI_URL}/admin/content-manager/collection-types/${config.adminEndpoint}/${id}`,
            {
              headers: {
                'Authorization': `Bearer ${this.authToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          cleanedCount++;
        } catch (error) {
          this.log(`Failed to cleanup admin record ${contentType}:${id}`, 'warn');
        }
      }

      // Cleanup API records
      for (const id of records.api) {
        try {
          await axios.delete(
            `${CONFIG.STRAPI_URL}/api/${config.endpoint}/${id}`,
            {
              headers: { 'Content-Type': 'application/json' }
            }
          );
          cleanedCount++;
        } catch (error) {
          this.log(`Failed to cleanup API record ${contentType}:${id}`, 'warn');
        }
      }
    }

    this.log(`Cleaned up ${cleanedCount} test records`);
  }

  async saveReport(report, suffix = '') {
    await fs.mkdir(CONFIG.REPORT_DIR, { recursive: true });
    const filename = `validation-automation-health${suffix}-${Date.now()}.json`;
    const reportPath = path.join(CONFIG.REPORT_DIR, filename);
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.log(`Report saved: ${reportPath}`);
    return reportPath;
  }

  async generateMetrics(report) {
    const metrics = {
      'validation.success_rate': report.summary.successRate,
      'validation.consistency_rate': report.summary.consistencyRate,
      'validation.critical_issues': report.summary.criticalIssues,
      'validation.enum_fields_healthy': report.summary.enumFieldsHealthy,
      'validation.enum_fields_total': report.summary.enumFieldsTotal,
      'validation.total_tests': report.summary.totalTests,
      'validation.failed_tests': report.summary.failedTests,
      'validation.timestamp': Date.now()
    };

    // Add per-content-type metrics
    for (const [contentType, typeResult] of Object.entries(report.contentTypeResults)) {
      metrics[`validation.${contentType}.success_rate`] = 
        (typeResult.passedTests / typeResult.totalTests) * 100;
      metrics[`validation.${contentType}.critical_issues`] = typeResult.criticalIssues.length;
    }

    const metricsPath = path.join(CONFIG.REPORT_DIR, `validation-metrics-${Date.now()}.json`);
    await fs.writeFile(metricsPath, JSON.stringify(metrics, null, 2));
    this.log(`Metrics saved: ${metricsPath}`);
    
    return metrics;
  }

  async runSingleTest() {
    this.log('Running single validation test suite...');
    
    const enumResults = await this.runEnumValidationTests();
    const report = await this.generateHealthReport(enumResults);
    
    this.results.push(report);
    
    await this.saveReport(report);
    await this.generateMetrics(report);
    
    return report;
  }

  async runContinuousTests() {
    this.log(`Running ${this.options.iterations} continuous validation iterations...`);
    
    for (let iteration = 1; iteration <= this.options.iterations; iteration++) {
      this.log(`Continuous test iteration ${iteration}/${this.options.iterations}`);
      
      const enumResults = await this.runEnumValidationTests();
      const report = await this.generateHealthReport(enumResults, iteration);
      
      this.results.push(report);
      
      await this.saveReport(report, `-iteration-${iteration}`);
      
      // Wait between iterations (except for the last one)
      if (iteration < this.options.iterations) {
        this.log(`Waiting ${this.options.interval}ms before next iteration...`);
        await new Promise(resolve => setTimeout(resolve, this.options.interval));
      }
    }

    // Generate trend analysis
    const trendReport = await this.generateTrendReport();
    await this.saveReport(trendReport, '-trends');
    
    return trendReport;
  }

  async generateTrendReport() {
    if (this.results.length < 2) {
      this.log('Insufficient data for trend analysis', 'warn');
      return this.results[0] || null;
    }

    const trends = this.results.map((report, index) => ({
      iteration: index + 1,
      timestamp: report.metadata.generated,
      successRate: report.summary.successRate,
      consistencyRate: report.summary.consistencyRate,
      criticalIssues: report.summary.criticalIssues
    }));

    const latestReport = this.results[this.results.length - 1];
    latestReport.trends = trends;

    // Add trend analysis
    const firstResult = this.results[0];
    const lastResult = this.results[this.results.length - 1];
    
    const successRateDelta = lastResult.summary.successRate - firstResult.summary.successRate;
    const consistencyRateDelta = lastResult.summary.consistencyRate - firstResult.summary.consistencyRate;

    latestReport.trendAnalysis = {
      successRateChange: successRateDelta,
      consistencyRateChange: consistencyRateDelta,
      stability: {
        successRateStable: Math.abs(successRateDelta) < 5,
        consistencyRateStable: Math.abs(consistencyRateDelta) < 2
      }
    };

    return latestReport;
  }

  printSummary(report) {
    console.log('\n📊 VALIDATION AUTOMATION HEALTH REPORT');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`Success Rate: ${report.summary.successRate.toFixed(2)}%`);
    console.log(`Consistency Rate: ${report.summary.consistencyRate.toFixed(2)}%`);
    console.log(`Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`Healthy Enum Fields: ${report.summary.enumFieldsHealthy}/${report.summary.enumFieldsTotal}`);
    
    if (report.trendAnalysis) {
      console.log('\n📈 TREND ANALYSIS:');
      console.log(`Success Rate Change: ${report.trendAnalysis.successRateChange.toFixed(2)}%`);
      console.log(`Consistency Rate Change: ${report.trendAnalysis.consistencyRateChange.toFixed(2)}%`);
      console.log(`System Stability: ${report.trendAnalysis.stability.successRateStable && report.trendAnalysis.stability.consistencyRateStable ? '✅ Stable' : '⚠️ Unstable'}`);
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n🔧 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => console.log(`- ${rec}`));
    }

    // Content type breakdown
    console.log('\n📋 CONTENT TYPE BREAKDOWN:');
    for (const [contentType, typeResult] of Object.entries(report.contentTypeResults)) {
      const successRate = (typeResult.passedTests / typeResult.totalTests) * 100;
      console.log(`${contentType}: ${successRate.toFixed(1)}% (${typeResult.passedTests}/${typeResult.totalTests})`);
      
      if (typeResult.criticalIssues.length > 0) {
        console.log(`  ⚠️ Critical issues: ${typeResult.criticalIssues.join(', ')}`);
      }
    }
  }

  async run() {
    try {
      // Authenticate
      const authSuccess = await this.authenticate();
      if (!authSuccess) {
        process.exit(1);
      }

      let finalReport;

      if (this.options.reportOnly) {
        this.log('Report-only mode - skipping tests');
        return;
      } else if (this.options.continuous) {
        finalReport = await this.runContinuousTests();
      } else {
        finalReport = await this.runSingleTest();
      }

      // Cleanup
      await this.cleanupTestRecords();

      // Print summary
      this.printSummary(finalReport);

      // Exit with appropriate code
      const hasFailures = finalReport.summary.criticalIssues > 0 || finalReport.summary.successRate < 80;
      process.exit(hasFailures ? 1 : 0);

    } catch (error) {
      this.log(`Validation automation failed: ${error.message}`, 'error');
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// CLI setup
program
  .name('run-validation-automation-suite')
  .description('Run comprehensive validation test automation suite')
  .option('-c, --continuous [iterations]', 'Run continuous validation tests', parseInt)
  .option('-i, --interval [ms]', 'Interval between continuous tests in milliseconds', parseInt)
  .option('-r, --report-only', 'Generate report from existing test data')
  .option('--cleanup', 'Clean up test records after completion')
  .option('-v, --verbose', 'Enable verbose output')
  .parse();

const options = program.opts();

// Convert continuous option
if (options.continuous !== undefined) {
  options.continuous = true;
  if (typeof options.continuous === 'number') {
    options.iterations = options.continuous;
  }
}

// Run the automation suite
const runner = new ValidationAutomationRunner(options);
runner.run();