#!/usr/bin/env node

/**
 * Test Script for Validation Error Analysis System
 * 
 * This script tests the validation error analysis system to ensure it works correctly
 * and captures validation errors as expected.
 */

const { ValidationErrorAnalyzer, ERROR_TEST_SCENARIOS } = require('./validation-error-analysis-system');
const axios = require('axios');

// Test configuration
const TEST_CONFIG = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@viktoria-wertheim.de',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  TIMEOUT: 10000
};

class ValidationErrorAnalysisTest {
  constructor() {
    this.testResults = {
      serverConnectivity: false,
      authenticationTest: false,
      errorCaptureTest: false,
      reportGenerationTest: false,
      overallSuccess: false
    };
  }

  /**
   * Test server connectivity
   */
  async testServerConnectivity() {
    console.log('🔍 Testing server connectivity...');
    
    try {
      // Test API endpoint
      await axios.get(`${TEST_CONFIG.STRAPI_URL}/api/mannschaften?pagination[limit]=1`, {
        timeout: TEST_CONFIG.TIMEOUT
      });
      
      // Test admin endpoint
      await axios.get(`${TEST_CONFIG.STRAPI_URL}/admin/init`, {
        timeout: TEST_CONFIG.TIMEOUT
      });
      
      console.log('✅ Server connectivity test passed');
      this.testResults.serverConnectivity = true;
      return true;
    } catch (error) {
      console.error('❌ Server connectivity test failed:', error.message);
      return false;
    }
  }

  /**
   * Test authentication functionality
   */
  async testAuthentication() {
    console.log('🔐 Testing authentication...');
    
    const analyzer = new ValidationErrorAnalyzer();
    
    try {
      const authSuccess = await analyzer.authenticate();
      
      if (authSuccess && analyzer.results.authToken) {
        console.log('✅ Authentication test passed');
        this.testResults.authenticationTest = true;
        return true;
      } else {
        console.error('❌ Authentication test failed: No token received');
        return false;
      }
    } catch (error) {
      console.error('❌ Authentication test failed:', error.message);
      return false;
    }
  }

  /**
   * Test error capture functionality
   */
  async testErrorCapture() {
    console.log('🧪 Testing error capture functionality...');
    
    const analyzer = new ValidationErrorAnalyzer();
    
    try {
      // Authenticate first
      const authSuccess = await analyzer.authenticate();
      if (!authSuccess) {
        throw new Error('Authentication failed');
      }

      // Test with a known invalid value
      const testCase = { value: 'invalid_status', expectedError: 'Invalid enum value' };
      const comparison = await analyzer.analyzeValidationError('status', testCase);
      
      // Verify error was captured
      if (comparison && comparison.admin && comparison.api) {
        console.log('✅ Error capture test passed');
        console.log(`   Admin result: ${comparison.admin.success ? 'Success' : 'Error captured'}`);
        console.log(`   API result: ${comparison.api.success ? 'Success' : 'Error captured'}`);
        
        this.testResults.errorCaptureTest = true;
        return true;
      } else {
        console.error('❌ Error capture test failed: No comparison data');
        return false;
      }
    } catch (error) {
      console.error('❌ Error capture test failed:', error.message);
      return false;
    }
  }

  /**
   * Test report generation
   */
  async testReportGeneration() {
    console.log('📄 Testing report generation...');
    
    const analyzer = new ValidationErrorAnalyzer();
    
    try {
      // Set up minimal test data
      analyzer.results.startTime = new Date();
      analyzer.results.endTime = new Date();
      analyzer.results.authToken = 'test-token';
      
      // Add a sample error comparison
      analyzer.results.errorComparisons.push({
        field: 'status',
        testCase: { value: 'test', expectedError: 'Test error' },
        admin: { success: false, error: { message: 'Test admin error' } },
        api: { success: false, error: { message: 'Test API error' } },
        errorConsistency: { severity: 'LOW', bothFailed: true },
        errorClassification: { errorType: 'enum_validation', category: 'enumValidation' },
        recommendations: []
      });
      
      // Generate analysis
      analyzer.analyzeErrorPatterns();
      analyzer.generateConsistencyAnalysis();
      analyzer.generateGlobalRecommendations();
      
      // Test report generation
      const { report } = await analyzer.generateReport();
      
      if (report && report.metadata && report.consistencyAnalysis) {
        console.log('✅ Report generation test passed');
        console.log(`   Report contains ${Object.keys(report).length} sections`);
        
        this.testResults.reportGenerationTest = true;
        return true;
      } else {
        console.error('❌ Report generation test failed: Invalid report structure');
        return false;
      }
    } catch (error) {
      console.error('❌ Report generation test failed:', error.message);
      return false;
    }
  }

  /**
   * Test error scenario definitions
   */
  testErrorScenarios() {
    console.log('📋 Testing error scenario definitions...');
    
    try {
      // Verify all required fields have test scenarios
      const requiredFields = ['status', 'liga', 'altersklasse', 'trend'];
      const definedFields = Object.keys(ERROR_TEST_SCENARIOS);
      
      const missingFields = requiredFields.filter(field => !definedFields.includes(field));
      
      if (missingFields.length > 0) {
        console.error(`❌ Missing error scenarios for fields: ${missingFields.join(', ')}`);
        return false;
      }
      
      // Verify each field has valid and invalid values
      for (const [field, scenarios] of Object.entries(ERROR_TEST_SCENARIOS)) {
        if (!scenarios.validValues || !scenarios.invalidValues) {
          console.error(`❌ Field "${field}" missing valid or invalid values`);
          return false;
        }
        
        if (scenarios.validValues.length === 0) {
          console.error(`❌ Field "${field}" has no valid values defined`);
          return false;
        }
        
        if (scenarios.invalidValues.length === 0) {
          console.error(`❌ Field "${field}" has no invalid values defined`);
          return false;
        }
      }
      
      console.log('✅ Error scenario definitions test passed');
      console.log(`   Defined scenarios for ${definedFields.length} fields`);
      
      return true;
    } catch (error) {
      console.error('❌ Error scenario definitions test failed:', error.message);
      return false;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Validation Error Analysis System Tests...');
    console.log('='.repeat(60));
    
    try {
      // Test 1: Server connectivity
      const connectivityOk = await this.testServerConnectivity();
      if (!connectivityOk) {
        console.log('\n❌ Cannot proceed without server connectivity');
        return false;
      }
      
      // Test 2: Error scenario definitions
      const scenariosOk = this.testErrorScenarios();
      if (!scenariosOk) {
        console.log('\n❌ Error scenario definitions are invalid');
        return false;
      }
      
      // Test 3: Authentication
      const authOk = await this.testAuthentication();
      if (!authOk) {
        console.log('\n❌ Cannot proceed without authentication');
        return false;
      }
      
      // Test 4: Error capture
      const captureOk = await this.testErrorCapture();
      if (!captureOk) {
        console.log('\n❌ Error capture functionality failed');
        return false;
      }
      
      // Test 5: Report generation
      const reportOk = await this.testReportGeneration();
      if (!reportOk) {
        console.log('\n❌ Report generation failed');
        return false;
      }
      
      // All tests passed
      this.testResults.overallSuccess = true;
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ ALL TESTS PASSED!');
      console.log('='.repeat(60));
      console.log('The Validation Error Analysis System is ready for use.');
      console.log('\nTo run the full analysis:');
      console.log('node scripts/validation-error-analysis-system.js');
      
      return true;
      
    } catch (error) {
      console.error('\n❌ Test execution failed:', error.message);
      return false;
    }
  }

  /**
   * Display test summary
   */
  displayTestSummary() {
    console.log('\n📊 TEST SUMMARY');
    console.log('='.repeat(30));
    
    const tests = [
      { name: 'Server Connectivity', result: this.testResults.serverConnectivity },
      { name: 'Authentication', result: this.testResults.authenticationTest },
      { name: 'Error Capture', result: this.testResults.errorCaptureTest },
      { name: 'Report Generation', result: this.testResults.reportGenerationTest }
    ];
    
    tests.forEach(test => {
      const status = test.result ? '✅ PASS' : '❌ FAIL';
      console.log(`${test.name}: ${status}`);
    });
    
    console.log(`\nOverall: ${this.testResults.overallSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`);
  }
}

/**
 * Main test execution
 */
async function runTests() {
  const tester = new ValidationErrorAnalysisTest();
  
  try {
    const success = await tester.runAllTests();
    tester.displayTestSummary();
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Test runner failed:', error.message);
    tester.displayTestSummary();
    process.exit(1);
  }
}

// Export for module usage
module.exports = {
  ValidationErrorAnalysisTest,
  runTests,
  TEST_CONFIG
};

// Run tests if script is executed directly
if (require.main === module) {
  runTests();
}