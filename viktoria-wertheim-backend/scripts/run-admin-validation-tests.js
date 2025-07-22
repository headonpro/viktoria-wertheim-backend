#!/usr/bin/env node

/**
 * Admin Validation Test Runner
 * 
 * Executes the admin interface validation test suite and generates comprehensive reports.
 * This script provides a convenient way to run validation tests with proper setup and cleanup.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  TEST_FILE: 'tests/admin-interface-validation.test.ts',
  REPORT_DIR: './validation-reports',
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@viktoria-wertheim.de',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  TIMEOUT: 60000, // 60 seconds for entire test suite
  VERBOSE: process.env.VERBOSE_TESTS === 'true'
};

class AdminValidationTestRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      duration: null,
      success: false,
      testResults: null,
      errors: [],
      summary: null
    };
  }

  /**
   * Check if Strapi server is running
   */
  async checkStrapiServer() {
    console.log('🔍 Checking Strapi server availability...');
    
    try {
      const axios = require('axios');
      const response = await axios.get(`${CONFIG.STRAPI_URL}/admin/init`, {
        timeout: 5000
      });
      
      console.log('✅ Strapi server is running and accessible');
      return true;
    } catch (error) {
      console.error('❌ Strapi server is not accessible:', error.message);
      console.error('   Please ensure Strapi is running on', CONFIG.STRAPI_URL);
      return false;
    }
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    // Ensure report directory exists
    await fs.mkdir(CONFIG.REPORT_DIR, { recursive: true });
    
    // Set environment variables for tests
    process.env.STRAPI_URL = CONFIG.STRAPI_URL;
    process.env.ADMIN_EMAIL = CONFIG.ADMIN_EMAIL;
    process.env.ADMIN_PASSWORD = CONFIG.ADMIN_PASSWORD;
    
    if (CONFIG.VERBOSE) {
      process.env.VERBOSE_TESTS = 'true';
    }
    
    console.log('✅ Test environment configured');
  }

  /**
   * Run Jest tests for admin validation
   */
  async runJestTests() {
    console.log('🧪 Running admin interface validation tests...');
    
    return new Promise((resolve, reject) => {
      const jestArgs = [
        '--testPathPattern=admin-interface-validation.test.ts',
        '--verbose',
        '--detectOpenHandles',
        '--forceExit',
        '--json',
        '--outputFile=./validation-reports/jest-results.json'
      ];

      if (CONFIG.VERBOSE) {
        jestArgs.push('--verbose');
      }

      const jestProcess = spawn('npx', ['jest', ...jestArgs], {
        stdio: CONFIG.VERBOSE ? 'inherit' : 'pipe',
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      if (!CONFIG.VERBOSE) {
        jestProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        jestProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      jestProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ All tests passed successfully');
          resolve({ success: true, stdout, stderr });
        } else {
          console.log(`⚠️ Tests completed with exit code ${code}`);
          resolve({ success: false, stdout, stderr, exitCode: code });
        }
      });

      jestProcess.on('error', (error) => {
        console.error('❌ Failed to run Jest tests:', error.message);
        reject(error);
      });

      // Set timeout for test execution
      setTimeout(() => {
        jestProcess.kill('SIGTERM');
        reject(new Error('Test execution timed out'));
      }, CONFIG.TIMEOUT);
    });
  }

  /**
   * Parse Jest results
   */
  async parseJestResults() {
    try {
      const resultsPath = './validation-reports/jest-results.json';
      const resultsContent = await fs.readFile(resultsPath, 'utf8');
      const jestResults = JSON.parse(resultsContent);
      
      return {
        numTotalTests: jestResults.numTotalTests,
        numPassedTests: jestResults.numPassedTests,
        numFailedTests: jestResults.numFailedTests,
        numPendingTests: jestResults.numPendingTests,
        testResults: jestResults.testResults,
        success: jestResults.success
      };
    } catch (error) {
      console.warn('⚠️ Could not parse Jest results:', error.message);
      return null;
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport(testResults) {
    const jestResults = await this.parseJestResults();
    
    const report = {
      metadata: {
        title: 'Admin Interface Validation Test Report',
        generated: new Date().toISOString(),
        duration: this.results.duration,
        strapiUrl: CONFIG.STRAPI_URL,
        testFile: CONFIG.TEST_FILE
      },
      configuration: {
        timeout: CONFIG.TIMEOUT,
        verbose: CONFIG.VERBOSE,
        adminEmail: CONFIG.ADMIN_EMAIL
      },
      execution: {
        startTime: this.results.startTime.toISOString(),
        endTime: this.results.endTime.toISOString(),
        duration: this.results.duration,
        success: this.results.success
      },
      testResults: jestResults,
      summary: this.generateSummary(jestResults),
      errors: this.results.errors
    };

    // Save detailed report
    const reportPath = path.join(CONFIG.REPORT_DIR, `admin-validation-test-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    await this.generateHumanReadableReport(report, reportPath);

    return { report, reportPath };
  }

  /**
   * Generate test summary
   */
  generateSummary(jestResults) {
    if (!jestResults) {
      return {
        status: 'INCOMPLETE',
        message: 'Test results could not be parsed'
      };
    }

    const passRate = jestResults.numTotalTests > 0 
      ? (jestResults.numPassedTests / jestResults.numTotalTests * 100).toFixed(2)
      : 0;

    return {
      status: jestResults.success ? 'PASSED' : 'FAILED',
      totalTests: jestResults.numTotalTests,
      passedTests: jestResults.numPassedTests,
      failedTests: jestResults.numFailedTests,
      pendingTests: jestResults.numPendingTests,
      passRate: `${passRate}%`,
      criticalIssues: jestResults.numFailedTests > 0 ? 'YES' : 'NO'
    };
  }

  /**
   * Generate human-readable report
   */
  async generateHumanReadableReport(report, jsonReportPath) {
    const summary = report.summary;
    const readableReport = `
ADMIN INTERFACE VALIDATION TEST REPORT
=====================================

Generated: ${report.metadata.generated}
Duration: ${report.execution.duration}ms
Strapi URL: ${report.configuration.strapiUrl}

TEST EXECUTION SUMMARY
---------------------
Status: ${summary.status}
Total Tests: ${summary.totalTests}
Passed: ${summary.passedTests}
Failed: ${summary.failedTests}
Pending: ${summary.pendingTests}
Pass Rate: ${summary.passRate}
Critical Issues: ${summary.criticalIssues}

${summary.status === 'FAILED' ? `
FAILED TESTS
-----------
${this.formatFailedTests(report.testResults)}
` : ''}

${report.errors.length > 0 ? `
EXECUTION ERRORS
---------------
${report.errors.map(error => `- ${error}`).join('\n')}
` : ''}

VALIDATION AREAS TESTED
----------------------
✓ Authentication and Setup
✓ Status Field Validation (aktiv, inaktiv, aufgeloest)
✓ Liga Field Validation (Kreisklasse B/A, Kreisliga, Landesliga)
✓ Altersklasse Field Validation (senioren, jugend categories)
✓ Trend Field Validation (steigend, gleich, fallend)
✓ Valid Enum Combinations
✓ Edge Cases and Error Handling
✓ Required Field Validation
✓ Numeric Field Validation

RECOMMENDATIONS
--------------
${this.generateRecommendations(summary)}

For detailed technical information, see: ${jsonReportPath}
`;

    const readableReportPath = jsonReportPath.replace('.json', '.txt');
    await fs.writeFile(readableReportPath, readableReport);
    
    console.log(`\n📄 Human-readable report: ${readableReportPath}`);
    return readableReportPath;
  }

  /**
   * Format failed tests for readable report
   */
  formatFailedTests(testResults) {
    if (!testResults || !testResults.testResults) {
      return 'No detailed failure information available';
    }

    const failures = [];
    testResults.testResults.forEach(suite => {
      suite.assertionResults.forEach(test => {
        if (test.status === 'failed') {
          failures.push(`- ${test.title}: ${test.failureMessages?.[0] || 'Unknown error'}`);
        }
      });
    });

    return failures.length > 0 ? failures.join('\n') : 'No specific failure details available';
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations(summary) {
    const recommendations = [];

    if (summary.status === 'FAILED') {
      recommendations.push('🔴 CRITICAL: Fix failing validation tests before deployment');
      recommendations.push('🔍 Review error messages for specific validation issues');
      recommendations.push('🛠️ Check schema definitions and admin panel configuration');
    }

    if (summary.passRate < 100) {
      recommendations.push('⚠️ Investigate partial test failures');
      recommendations.push('🔄 Re-run tests after fixes to verify resolution');
    }

    if (summary.status === 'PASSED') {
      recommendations.push('✅ Admin interface validation is working correctly');
      recommendations.push('🚀 Safe to proceed with content creation through admin panel');
      recommendations.push('📊 Consider adding these tests to CI/CD pipeline');
    }

    return recommendations.length > 0 
      ? recommendations.join('\n') 
      : '✅ All validation tests passed - no specific recommendations';
  }

  /**
   * Run complete test suite
   */
  async runTests() {
    console.log('🚀 Starting Admin Interface Validation Test Suite...');
    console.log('='.repeat(60));

    try {
      // Step 1: Check Strapi server
      const serverAvailable = await this.checkStrapiServer();
      if (!serverAvailable) {
        throw new Error('Strapi server is not available');
      }

      // Step 2: Setup test environment
      await this.setupTestEnvironment();

      // Step 3: Run Jest tests
      const testResults = await this.runJestTests();
      this.results.testResults = testResults;
      this.results.success = testResults.success;

      // Step 4: Record completion time
      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;

      // Step 5: Generate reports
      const { report, reportPath } = await this.generateReport(testResults);

      // Step 6: Display summary
      console.log('\n' + '='.repeat(60));
      console.log('📊 TEST EXECUTION COMPLETE');
      console.log('='.repeat(60));
      console.log(`Duration: ${this.results.duration}ms`);
      console.log(`Success: ${this.results.success ? '✅ YES' : '❌ NO'}`);
      console.log(`Report: ${reportPath}`);

      return {
        success: this.results.success,
        report,
        reportPath
      };

    } catch (error) {
      this.results.errors.push(error.message);
      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;
      
      console.error('❌ Test execution failed:', error.message);
      throw error;
    }
  }
}

/**
 * Main execution function
 */
async function runAdminValidationTests() {
  const runner = new AdminValidationTestRunner();
  
  try {
    const result = await runner.runTests();
    
    if (result.success) {
      console.log('\n🎉 All admin validation tests passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Some tests failed. Check the report for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Test runner failed:', error.message);
    process.exit(1);
  }
}

// Export for module usage
module.exports = {
  AdminValidationTestRunner,
  runAdminValidationTests,
  CONFIG
};

// Run tests if script is executed directly
if (require.main === module) {
  runAdminValidationTests();
}