#!/usr/bin/env node

/**
 * API Consistency Test Runner
 * 
 * Executes the API consistency validation test suite that compares admin interface
 * behavior with direct API calls to ensure identical validation results.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  TEST_FILE: 'tests/api-consistency-validation.test.ts',
  REPORT_DIR: './validation-reports',
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@viktoria-wertheim.de',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  TIMEOUT: 120000, // 2 minutes for consistency tests
  VERBOSE: process.env.VERBOSE_TESTS === 'true'
};

class APIConsistencyTestRunner {
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
   * Check if Strapi server is running and accessible
   */
  async checkStrapiServer() {
    console.log('🔍 Checking Strapi server availability...');
    
    try {
      const axios = require('axios');
      
      // Check admin endpoint
      const adminResponse = await axios.get(`${CONFIG.STRAPI_URL}/admin/init`, {
        timeout: 5000
      });
      
      // Check API endpoint
      const apiResponse = await axios.get(`${CONFIG.STRAPI_URL}/api/mannschaften?pagination[limit]=1`, {
        timeout: 5000
      });
      
      console.log('✅ Strapi server is running and both admin/API endpoints are accessible');
      return true;
    } catch (error) {
      console.error('❌ Strapi server accessibility check failed:', error.message);
      console.error('   Please ensure Strapi is running on', CONFIG.STRAPI_URL);
      console.error('   Both admin panel and API endpoints must be accessible');
      return false;
    }
  }

  /**
   * Verify admin authentication
   */
  async verifyAdminAuth() {
    console.log('🔐 Verifying admin authentication...');
    
    try {
      const axios = require('axios');
      const response = await axios.post(`${CONFIG.STRAPI_URL}/admin/auth/local`, {
        email: CONFIG.ADMIN_EMAIL,
        password: CONFIG.ADMIN_PASSWORD
      }, {
        timeout: 10000
      });

      if (response.data?.data?.token) {
        console.log('✅ Admin authentication successful');
        return true;
      } else {
        console.error('❌ Admin authentication failed: No token received');
        return false;
      }
    } catch (error) {
      console.error('❌ Admin authentication failed:', error.message);
      console.error('   Please check admin credentials in environment variables');
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
   * Run Jest tests for API consistency
   */
  async runJestTests() {
    console.log('🧪 Running API consistency validation tests...');
    console.log('   This may take a few minutes as it tests all CRUD operations...');
    
    return new Promise((resolve, reject) => {
      const jestArgs = [
        '--testPathPattern=api-consistency-validation.test.ts',
        '--verbose',
        '--detectOpenHandles',
        '--forceExit',
        '--json',
        '--outputFile=./validation-reports/api-consistency-jest-results.json',
        '--testTimeout=30000' // 30 seconds per test
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
          // Show progress for long-running tests
          if (data.toString().includes('PASS') || data.toString().includes('FAIL')) {
            process.stdout.write('.');
          }
        });

        jestProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      jestProcess.on('close', (code) => {
        if (!CONFIG.VERBOSE) {
          console.log(''); // New line after progress dots
        }
        
        if (code === 0) {
          console.log('✅ All API consistency tests passed');
          resolve({ success: true, stdout, stderr });
        } else {
          console.log(`⚠️ API consistency tests completed with exit code ${code}`);
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
        reject(new Error('API consistency test execution timed out'));
      }, CONFIG.TIMEOUT);
    });
  }

  /**
   * Parse Jest results
   */
  async parseJestResults() {
    try {
      const resultsPath = './validation-reports/api-consistency-jest-results.json';
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
   * Analyze consistency results
   */
  async analyzeConsistencyResults() {
    try {
      // Look for the latest API consistency report
      const reportFiles = await fs.readdir(CONFIG.REPORT_DIR);
      const consistencyReports = reportFiles
        .filter(file => file.startsWith('api-consistency-') && file.endsWith('.json'))
        .sort()
        .reverse();

      if (consistencyReports.length === 0) {
        return null;
      }

      const latestReport = consistencyReports[0];
      const reportPath = path.join(CONFIG.REPORT_DIR, latestReport);
      const reportContent = await fs.readFile(reportPath, 'utf8');
      const consistencyData = JSON.parse(reportContent);

      return {
        reportPath,
        ...consistencyData.summary,
        criticalInconsistencies: consistencyData.inconsistencies?.filter(i => i.discrepancy?.severity === 'CRITICAL') || [],
        highInconsistencies: consistencyData.inconsistencies?.filter(i => i.discrepancy?.severity === 'HIGH') || []
      };
    } catch (error) {
      console.warn('⚠️ Could not analyze consistency results:', error.message);
      return null;
    }
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport(testResults) {
    const jestResults = await this.parseJestResults();
    const consistencyAnalysis = await this.analyzeConsistencyResults();
    
    const report = {
      metadata: {
        title: 'API Consistency Validation Test Report',
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
      consistencyAnalysis,
      summary: this.generateSummary(jestResults, consistencyAnalysis),
      errors: this.results.errors
    };

    // Save detailed report
    const reportPath = path.join(CONFIG.REPORT_DIR, `api-consistency-test-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    await this.generateHumanReadableReport(report, reportPath);

    return { report, reportPath };
  }

  /**
   * Generate test summary
   */
  generateSummary(jestResults, consistencyAnalysis) {
    const summary = {
      testExecution: 'UNKNOWN',
      apiConsistency: 'UNKNOWN',
      overallStatus: 'UNKNOWN',
      recommendations: []
    };

    // Analyze test execution
    if (jestResults) {
      const passRate = jestResults.numTotalTests > 0 
        ? (jestResults.numPassedTests / jestResults.numTotalTests * 100).toFixed(2)
        : 0;
      
      summary.testExecution = jestResults.success ? 'PASSED' : 'FAILED';
      summary.testStats = {
        totalTests: jestResults.numTotalTests,
        passedTests: jestResults.numPassedTests,
        failedTests: jestResults.numFailedTests,
        passRate: `${passRate}%`
      };
    }

    // Analyze API consistency
    if (consistencyAnalysis) {
      const consistencyRate = parseFloat(consistencyAnalysis.consistencyRate || 0);
      
      if (consistencyRate >= 95) {
        summary.apiConsistency = 'EXCELLENT';
      } else if (consistencyRate >= 85) {
        summary.apiConsistency = 'GOOD';
      } else if (consistencyRate >= 70) {
        summary.apiConsistency = 'FAIR';
      } else {
        summary.apiConsistency = 'POOR';
      }

      summary.consistencyStats = {
        consistencyRate: consistencyAnalysis.consistencyRate,
        inconsistentTests: consistencyAnalysis.inconsistentTests,
        criticalIssues: consistencyAnalysis.criticalIssues,
        highIssues: consistencyAnalysis.highIssues
      };
    }

    // Determine overall status
    if (summary.testExecution === 'PASSED' && summary.apiConsistency === 'EXCELLENT') {
      summary.overallStatus = 'EXCELLENT';
    } else if (summary.testExecution === 'PASSED' && ['GOOD', 'FAIR'].includes(summary.apiConsistency)) {
      summary.overallStatus = 'ACCEPTABLE';
    } else {
      summary.overallStatus = 'NEEDS_ATTENTION';
    }

    // Generate recommendations
    summary.recommendations = this.generateRecommendations(summary, consistencyAnalysis);

    return summary;
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations(summary, consistencyAnalysis) {
    const recommendations = [];

    if (summary.overallStatus === 'NEEDS_ATTENTION') {
      recommendations.push('🔴 CRITICAL: Address API consistency issues before production deployment');
    }

    if (consistencyAnalysis?.criticalIssues > 0) {
      recommendations.push('🚨 URGENT: Fix critical inconsistencies between admin and API interfaces');
      recommendations.push('🔍 Review validation logic in both admin panel and API endpoints');
    }

    if (consistencyAnalysis?.highIssues > 0) {
      recommendations.push('⚠️ HIGH PRIORITY: Resolve high-severity consistency issues');
    }

    if (summary.testExecution === 'FAILED') {
      recommendations.push('🧪 Fix failing tests before proceeding with validation fixes');
    }

    if (summary.apiConsistency === 'EXCELLENT' && summary.testExecution === 'PASSED') {
      recommendations.push('✅ API consistency is excellent - safe for production use');
      recommendations.push('📊 Consider integrating these tests into CI/CD pipeline');
      recommendations.push('🔄 Run these tests regularly to maintain consistency');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ No specific issues detected - system appears to be functioning correctly');
    }

    return recommendations;
  }

  /**
   * Generate human-readable report
   */
  async generateHumanReadableReport(report, jsonReportPath) {
    const summary = report.summary;
    const readableReport = `
API CONSISTENCY VALIDATION TEST REPORT
=====================================

Generated: ${report.metadata.generated}
Duration: ${report.execution.duration}ms
Strapi URL: ${report.configuration.strapiUrl}

OVERALL STATUS: ${summary.overallStatus}
=====================================

TEST EXECUTION: ${summary.testExecution}
${summary.testStats ? `
- Total Tests: ${summary.testStats.totalTests}
- Passed: ${summary.testStats.passedTests}
- Failed: ${summary.testStats.failedTests}
- Pass Rate: ${summary.testStats.passRate}
` : '- Test statistics not available'}

API CONSISTENCY: ${summary.apiConsistency}
${summary.consistencyStats ? `
- Consistency Rate: ${summary.consistencyStats.consistencyRate}%
- Inconsistent Tests: ${summary.consistencyStats.inconsistentTests}
- Critical Issues: ${summary.consistencyStats.criticalIssues}
- High Priority Issues: ${summary.consistencyStats.highIssues}
` : '- Consistency statistics not available'}

OPERATIONS TESTED
================
✓ Create Operations (Admin vs API)
✓ Update Operations (Admin vs API)
✓ Delete Operations (Admin vs API)
✓ Error Message Consistency
✓ Response Format Consistency
✓ Validation Rule Consistency

RECOMMENDATIONS
==============
${summary.recommendations.map(rec => rec).join('\n')}

${report.consistencyAnalysis?.criticalInconsistencies?.length > 0 ? `
CRITICAL INCONSISTENCIES
=======================
${report.consistencyAnalysis.criticalInconsistencies.map(inc => 
  `- ${inc.operation} ${inc.testCase}: ${inc.discrepancy.description}`
).join('\n')}
` : ''}

${report.consistencyAnalysis?.highInconsistencies?.length > 0 ? `
HIGH PRIORITY INCONSISTENCIES
============================
${report.consistencyAnalysis.highInconsistencies.map(inc => 
  `- ${inc.operation} ${inc.testCase}: ${inc.discrepancy.description}`
).join('\n')}
` : ''}

For detailed technical information, see: ${jsonReportPath}
`;

    const readableReportPath = jsonReportPath.replace('.json', '.txt');
    await fs.writeFile(readableReportPath, readableReport);
    
    console.log(`\n📄 Human-readable report: ${readableReportPath}`);
    return readableReportPath;
  }

  /**
   * Run complete API consistency test suite
   */
  async runTests() {
    console.log('🚀 Starting API Consistency Validation Test Suite...');
    console.log('='.repeat(70));

    try {
      // Step 1: Check Strapi server
      const serverAvailable = await this.checkStrapiServer();
      if (!serverAvailable) {
        throw new Error('Strapi server is not available');
      }

      // Step 2: Verify admin authentication
      const authValid = await this.verifyAdminAuth();
      if (!authValid) {
        throw new Error('Admin authentication failed');
      }

      // Step 3: Setup test environment
      await this.setupTestEnvironment();

      // Step 4: Run Jest tests
      const testResults = await this.runJestTests();
      this.results.testResults = testResults;
      this.results.success = testResults.success;

      // Step 5: Record completion time
      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;

      // Step 6: Generate reports
      const { report, reportPath } = await this.generateReport(testResults);

      // Step 7: Display summary
      console.log('\n' + '='.repeat(70));
      console.log('📊 API CONSISTENCY TEST EXECUTION COMPLETE');
      console.log('='.repeat(70));
      console.log(`Duration: ${this.results.duration}ms`);
      console.log(`Overall Status: ${report.summary.overallStatus}`);
      console.log(`Test Execution: ${report.summary.testExecution}`);
      console.log(`API Consistency: ${report.summary.apiConsistency}`);
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
      
      console.error('❌ API consistency test execution failed:', error.message);
      throw error;
    }
  }
}

/**
 * Main execution function
 */
async function runAPIConsistencyTests() {
  const runner = new APIConsistencyTestRunner();
  
  try {
    const result = await runner.runTests();
    
    if (result.success && result.report.summary.overallStatus !== 'NEEDS_ATTENTION') {
      console.log('\n🎉 API consistency validation passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️ API consistency issues detected. Check the report for details.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 API consistency test runner failed:', error.message);
    process.exit(1);
  }
}

// Export for module usage
module.exports = {
  APIConsistencyTestRunner,
  runAPIConsistencyTests,
  CONFIG
};

// Run tests if script is executed directly
if (require.main === module) {
  runAPIConsistencyTests();
}