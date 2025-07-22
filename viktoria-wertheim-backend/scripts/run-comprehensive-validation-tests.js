#!/usr/bin/env node

/**
 * Comprehensive Validation Test Runner
 * 
 * Executes both admin interface validation tests and API consistency tests
 * to provide a complete validation testing suite for the backend system.
 */

const { AdminValidationTestRunner } = require('./run-admin-validation-tests');
const { APIConsistencyTestRunner } = require('./run-api-consistency-tests');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  REPORT_DIR: './validation-reports',
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@viktoria-wertheim.de',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  VERBOSE: process.env.VERBOSE_TESTS === 'true',
  PARALLEL_EXECUTION: process.env.PARALLEL_TESTS === 'true'
};

class ComprehensiveValidationTestRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      duration: null,
      adminValidationResults: null,
      apiConsistencyResults: null,
      overallSuccess: false,
      summary: null,
      errors: []
    };
  }

  /**
   * Pre-flight checks before running tests
   */
  async preflightChecks() {
    console.log('🔍 Running pre-flight checks...');
    
    try {
      const axios = require('axios');
      
      // Check Strapi server
      await axios.get(`${CONFIG.STRAPI_URL}/admin/init`, { timeout: 5000 });
      await axios.get(`${CONFIG.STRAPI_URL}/api/mannschaften?pagination[limit]=1`, { timeout: 5000 });
      
      // Check admin authentication
      const authResponse = await axios.post(`${CONFIG.STRAPI_URL}/admin/auth/local`, {
        email: CONFIG.ADMIN_EMAIL,
        password: CONFIG.ADMIN_PASSWORD
      }, { timeout: 10000 });
      
      if (!authResponse.data?.data?.token) {
        throw new Error('Admin authentication failed');
      }
      
      console.log('✅ Pre-flight checks passed');
      return true;
    } catch (error) {
      console.error('❌ Pre-flight checks failed:', error.message);
      return false;
    }
  }

  /**
   * Run admin validation tests
   */
  async runAdminValidationTests() {
    console.log('\n📋 PHASE 1: Admin Interface Validation Tests');
    console.log('='.repeat(60));
    
    try {
      const adminRunner = new AdminValidationTestRunner();
      const result = await adminRunner.runTests();
      
      this.results.adminValidationResults = {
        success: result.success,
        report: result.report,
        reportPath: result.reportPath
      };
      
      console.log(`✅ Admin validation tests completed: ${result.success ? 'PASSED' : 'FAILED'}`);
      return result.success;
    } catch (error) {
      console.error('❌ Admin validation tests failed:', error.message);
      this.results.errors.push(`Admin validation: ${error.message}`);
      this.results.adminValidationResults = { success: false, error: error.message };
      return false;
    }
  }

  /**
   * Run API consistency tests
   */
  async runAPIConsistencyTests() {
    console.log('\n🔄 PHASE 2: API Consistency Validation Tests');
    console.log('='.repeat(60));
    
    try {
      const apiRunner = new APIConsistencyTestRunner();
      const result = await apiRunner.runTests();
      
      this.results.apiConsistencyResults = {
        success: result.success,
        report: result.report,
        reportPath: result.reportPath,
        overallStatus: result.report.summary.overallStatus
      };
      
      console.log(`✅ API consistency tests completed: ${result.report.summary.overallStatus}`);
      return result.success && result.report.summary.overallStatus !== 'NEEDS_ATTENTION';
    } catch (error) {
      console.error('❌ API consistency tests failed:', error.message);
      this.results.errors.push(`API consistency: ${error.message}`);
      this.results.apiConsistencyResults = { success: false, error: error.message };
      return false;
    }
  }

  /**
   * Run tests in parallel (if enabled)
   */
  async runTestsInParallel() {
    console.log('\n🚀 Running validation tests in parallel...');
    
    const [adminResult, apiResult] = await Promise.allSettled([
      this.runAdminValidationTests(),
      this.runAPIConsistencyTests()
    ]);

    const adminSuccess = adminResult.status === 'fulfilled' && adminResult.value;
    const apiSuccess = apiResult.status === 'fulfilled' && apiResult.value;

    if (adminResult.status === 'rejected') {
      this.results.errors.push(`Admin validation: ${adminResult.reason.message}`);
    }
    
    if (apiResult.status === 'rejected') {
      this.results.errors.push(`API consistency: ${apiResult.reason.message}`);
    }

    return { adminSuccess, apiSuccess };
  }

  /**
   * Run tests sequentially
   */
  async runTestsSequentially() {
    console.log('\n🔄 Running validation tests sequentially...');
    
    const adminSuccess = await this.runAdminValidationTests();
    const apiSuccess = await this.runAPIConsistencyTests();
    
    return { adminSuccess, apiSuccess };
  }

  /**
   * Generate comprehensive summary
   */
  generateSummary(adminSuccess, apiSuccess) {
    const summary = {
      overallStatus: 'UNKNOWN',
      adminValidation: adminSuccess ? 'PASSED' : 'FAILED',
      apiConsistency: 'UNKNOWN',
      criticalIssues: [],
      recommendations: [],
      readyForProduction: false
    };

    // Determine API consistency status
    if (this.results.apiConsistencyResults?.overallStatus) {
      summary.apiConsistency = this.results.apiConsistencyResults.overallStatus;
    } else if (apiSuccess) {
      summary.apiConsistency = 'PASSED';
    } else {
      summary.apiConsistency = 'FAILED';
    }

    // Determine overall status
    if (adminSuccess && apiSuccess && summary.apiConsistency === 'EXCELLENT') {
      summary.overallStatus = 'EXCELLENT';
      summary.readyForProduction = true;
    } else if (adminSuccess && apiSuccess && ['GOOD', 'ACCEPTABLE'].includes(summary.apiConsistency)) {
      summary.overallStatus = 'GOOD';
      summary.readyForProduction = true;
    } else if (adminSuccess && apiSuccess) {
      summary.overallStatus = 'ACCEPTABLE';
      summary.readyForProduction = false;
    } else {
      summary.overallStatus = 'NEEDS_ATTENTION';
      summary.readyForProduction = false;
    }

    // Identify critical issues
    if (!adminSuccess) {
      summary.criticalIssues.push('Admin interface validation failures detected');
    }
    
    if (!apiSuccess) {
      summary.criticalIssues.push('API consistency validation failures detected');
    }

    if (this.results.apiConsistencyResults?.report?.summary?.consistencyStats?.criticalIssues > 0) {
      summary.criticalIssues.push('Critical API consistency issues found');
    }

    // Generate recommendations
    summary.recommendations = this.generateRecommendations(summary);

    return summary;
  }

  /**
   * Generate recommendations based on overall results
   */
  generateRecommendations(summary) {
    const recommendations = [];

    if (summary.overallStatus === 'EXCELLENT') {
      recommendations.push('🎉 Excellent! All validation tests passed with high consistency');
      recommendations.push('✅ System is ready for production deployment');
      recommendations.push('📊 Consider integrating these tests into CI/CD pipeline');
      recommendations.push('🔄 Run these tests regularly to maintain quality');
    } else if (summary.overallStatus === 'GOOD') {
      recommendations.push('✅ Good results! System is ready for production with minor considerations');
      recommendations.push('📈 Monitor API consistency metrics in production');
      recommendations.push('🔍 Address any remaining minor inconsistencies when possible');
    } else if (summary.overallStatus === 'ACCEPTABLE') {
      recommendations.push('⚠️ Acceptable results but improvements recommended before production');
      recommendations.push('🔧 Address API consistency issues to improve reliability');
      recommendations.push('📋 Review validation logic for potential improvements');
    } else {
      recommendations.push('🔴 CRITICAL: Do not deploy to production until issues are resolved');
      recommendations.push('🛠️ Fix all failing validation tests immediately');
      recommendations.push('🔍 Investigate root causes of validation inconsistencies');
    }

    if (summary.criticalIssues.length > 0) {
      recommendations.push('🚨 URGENT: Address all critical issues before proceeding');
    }

    return recommendations;
  }

  /**
   * Generate comprehensive report
   */
  async generateComprehensiveReport() {
    const report = {
      metadata: {
        title: 'Comprehensive Validation Test Report',
        generated: new Date().toISOString(),
        duration: this.results.duration,
        strapiUrl: CONFIG.STRAPI_URL,
        executionMode: CONFIG.PARALLEL_EXECUTION ? 'parallel' : 'sequential'
      },
      execution: {
        startTime: this.results.startTime.toISOString(),
        endTime: this.results.endTime.toISOString(),
        duration: this.results.duration,
        overallSuccess: this.results.overallSuccess
      },
      summary: this.results.summary,
      adminValidation: this.results.adminValidationResults,
      apiConsistency: this.results.apiConsistencyResults,
      errors: this.results.errors
    };

    // Save comprehensive report
    const reportPath = path.join(CONFIG.REPORT_DIR, `comprehensive-validation-${Date.now()}.json`);
    await fs.mkdir(CONFIG.REPORT_DIR, { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    await this.generateHumanReadableSummary(report, reportPath);

    return { report, reportPath };
  }

  /**
   * Generate human-readable summary
   */
  async generateHumanReadableSummary(report, jsonReportPath) {
    const summary = report.summary;
    const readableReport = `
COMPREHENSIVE VALIDATION TEST REPORT
===================================

Generated: ${report.metadata.generated}
Duration: ${report.execution.duration}ms
Execution Mode: ${report.metadata.executionMode}
Strapi URL: ${report.metadata.strapiUrl}

OVERALL STATUS: ${summary.overallStatus}
READY FOR PRODUCTION: ${summary.readyForProduction ? 'YES' : 'NO'}

TEST RESULTS SUMMARY
===================
Admin Interface Validation: ${summary.adminValidation}
API Consistency Validation: ${summary.apiConsistency}

${summary.criticalIssues.length > 0 ? `
CRITICAL ISSUES
==============
${summary.criticalIssues.map(issue => `🔴 ${issue}`).join('\n')}
` : ''}

RECOMMENDATIONS
==============
${summary.recommendations.join('\n')}

DETAILED RESULTS
===============
${report.adminValidation?.reportPath ? `Admin Validation Report: ${report.adminValidation.reportPath}` : 'Admin validation report not available'}
${report.apiConsistency?.reportPath ? `API Consistency Report: ${report.apiConsistency.reportPath}` : 'API consistency report not available'}

VALIDATION COVERAGE
==================
✓ Admin Interface Authentication
✓ Admin Interface Field Validation
✓ Admin Interface Error Handling
✓ API Endpoint Validation
✓ Admin vs API Consistency
✓ CRUD Operation Consistency
✓ Error Message Consistency
✓ Response Format Consistency

${report.errors.length > 0 ? `
EXECUTION ERRORS
===============
${report.errors.map(error => `❌ ${error}`).join('\n')}
` : ''}

For detailed technical information, see: ${jsonReportPath}
`;

    const readableReportPath = jsonReportPath.replace('.json', '.txt');
    await fs.writeFile(readableReportPath, readableReport);
    
    console.log(`\n📄 Comprehensive summary: ${readableReportPath}`);
    return readableReportPath;
  }

  /**
   * Run comprehensive validation test suite
   */
  async runComprehensiveTests() {
    console.log('🚀 COMPREHENSIVE VALIDATION TEST SUITE');
    console.log('='.repeat(80));
    console.log(`Execution Mode: ${CONFIG.PARALLEL_EXECUTION ? 'Parallel' : 'Sequential'}`);
    console.log(`Strapi URL: ${CONFIG.STRAPI_URL}`);
    console.log('='.repeat(80));

    try {
      // Pre-flight checks
      const preflightPassed = await this.preflightChecks();
      if (!preflightPassed) {
        throw new Error('Pre-flight checks failed');
      }

      // Run tests
      let adminSuccess, apiSuccess;
      if (CONFIG.PARALLEL_EXECUTION) {
        ({ adminSuccess, apiSuccess } = await this.runTestsInParallel());
      } else {
        ({ adminSuccess, apiSuccess } = await this.runTestsSequentially());
      }

      // Record completion
      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;
      this.results.overallSuccess = adminSuccess && apiSuccess;

      // Generate summary
      this.results.summary = this.generateSummary(adminSuccess, apiSuccess);

      // Generate comprehensive report
      const { report, reportPath } = await this.generateComprehensiveReport();

      // Display final summary
      console.log('\n' + '='.repeat(80));
      console.log('📊 COMPREHENSIVE VALIDATION TEST RESULTS');
      console.log('='.repeat(80));
      console.log(`Overall Status: ${this.results.summary.overallStatus}`);
      console.log(`Ready for Production: ${this.results.summary.readyForProduction ? '✅ YES' : '❌ NO'}`);
      console.log(`Admin Validation: ${this.results.summary.adminValidation}`);
      console.log(`API Consistency: ${this.results.summary.apiConsistency}`);
      console.log(`Duration: ${this.results.duration}ms`);
      console.log(`Report: ${reportPath}`);

      if (this.results.summary.criticalIssues.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES DETECTED:');
        this.results.summary.criticalIssues.forEach(issue => {
          console.log(`   🔴 ${issue}`);
        });
      }

      return {
        success: this.results.overallSuccess,
        summary: this.results.summary,
        report,
        reportPath
      };

    } catch (error) {
      this.results.errors.push(error.message);
      this.results.endTime = new Date();
      this.results.duration = this.results.endTime - this.results.startTime;
      
      console.error('❌ Comprehensive validation test execution failed:', error.message);
      throw error;
    }
  }
}

/**
 * Main execution function
 */
async function runComprehensiveValidationTests() {
  const runner = new ComprehensiveValidationTestRunner();
  
  try {
    const result = await runner.runComprehensiveTests();
    
    if (result.summary.readyForProduction) {
      console.log('\n🎉 System validation passed! Ready for production deployment.');
      process.exit(0);
    } else {
      console.log('\n⚠️ System validation completed with issues. Review the report before deployment.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Comprehensive validation test runner failed:', error.message);
    process.exit(1);
  }
}

// Export for module usage
module.exports = {
  ComprehensiveValidationTestRunner,
  runComprehensiveValidationTests,
  CONFIG
};

// Run tests if script is executed directly
if (require.main === module) {
  runComprehensiveValidationTests();
}