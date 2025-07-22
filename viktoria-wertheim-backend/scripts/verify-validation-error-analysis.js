#!/usr/bin/env node

/**
 * Verification Script for Validation Error Analysis System
 * 
 * This script verifies that the validation error analysis system is properly
 * implemented and can be used without requiring a running Strapi server.
 */

const fs = require('fs').promises;
const path = require('path');

// Import the system components
const { ValidationErrorAnalyzer, ERROR_TEST_SCENARIOS } = require('./validation-error-analysis-system');

class ValidationErrorAnalysisVerifier {
  constructor() {
    this.verificationResults = {
      codeStructure: false,
      errorScenarios: false,
      reportGeneration: false,
      documentation: false,
      overallSuccess: false
    };
  }

  /**
   * Verify code structure and imports
   */
  async verifyCodeStructure() {
    console.log('🔍 Verifying code structure...');
    
    try {
      // Check if main class can be instantiated
      const analyzer = new ValidationErrorAnalyzer();
      
      // Check if required methods exist
      const requiredMethods = [
        'authenticate',
        'analyzeValidationError',
        'runErrorAnalysis',
        'generateReport',
        'analyzeErrorPatterns',
        'generateConsistencyAnalysis'
      ];
      
      for (const method of requiredMethods) {
        if (typeof analyzer[method] !== 'function') {
          throw new Error(`Missing required method: ${method}`);
        }
      }
      
      // Check if results structure is properly initialized
      const requiredResultsProperties = [
        'startTime',
        'endTime',
        'authToken',
        'errorPatterns',
        'adminErrors',
        'apiErrors',
        'errorComparisons',
        'errorCategories',
        'consistencyAnalysis',
        'recommendations'
      ];
      
      for (const prop of requiredResultsProperties) {
        if (!(prop in analyzer.results)) {
          throw new Error(`Missing required results property: ${prop}`);
        }
      }
      
      console.log('✅ Code structure verification passed');
      this.verificationResults.codeStructure = true;
      return true;
    } catch (error) {
      console.error('❌ Code structure verification failed:', error.message);
      return false;
    }
  }

  /**
   * Verify error test scenarios
   */
  verifyErrorScenarios() {
    console.log('📋 Verifying error test scenarios...');
    
    try {
      // Check if ERROR_TEST_SCENARIOS is properly defined
      if (!ERROR_TEST_SCENARIOS || typeof ERROR_TEST_SCENARIOS !== 'object') {
        throw new Error('ERROR_TEST_SCENARIOS is not properly defined');
      }
      
      // Check required fields
      const requiredFields = ['status', 'liga', 'altersklasse', 'trend'];
      const definedFields = Object.keys(ERROR_TEST_SCENARIOS);
      
      for (const field of requiredFields) {
        if (!definedFields.includes(field)) {
          throw new Error(`Missing test scenarios for field: ${field}`);
        }
        
        const scenarios = ERROR_TEST_SCENARIOS[field];
        
        // Check structure
        if (!scenarios.validValues || !Array.isArray(scenarios.validValues)) {
          throw new Error(`Field ${field} missing or invalid validValues array`);
        }
        
        if (!scenarios.invalidValues || !Array.isArray(scenarios.invalidValues)) {
          throw new Error(`Field ${field} missing or invalid invalidValues array`);
        }
        
        // Check that we have test cases
        if (scenarios.validValues.length === 0) {
          throw new Error(`Field ${field} has no valid values defined`);
        }
        
        if (scenarios.invalidValues.length === 0) {
          throw new Error(`Field ${field} has no invalid values defined`);
        }
        
        // Check invalid values structure
        for (const invalidValue of scenarios.invalidValues) {
          if (!invalidValue.value === undefined) {
            throw new Error(`Field ${field} has invalid test case without value property`);
          }
          
          if (!invalidValue.expectedError) {
            throw new Error(`Field ${field} has invalid test case without expectedError property`);
          }
        }
      }
      
      console.log('✅ Error scenarios verification passed');
      console.log(`   Verified scenarios for ${definedFields.length} fields`);
      
      // Display scenario summary
      for (const [field, scenarios] of Object.entries(ERROR_TEST_SCENARIOS)) {
        console.log(`   ${field}: ${scenarios.validValues.length} valid, ${scenarios.invalidValues.length} invalid values`);
      }
      
      this.verificationResults.errorScenarios = true;
      return true;
    } catch (error) {
      console.error('❌ Error scenarios verification failed:', error.message);
      return false;
    }
  }

  /**
   * Verify report generation functionality
   */
  async verifyReportGeneration() {
    console.log('📄 Verifying report generation...');
    
    try {
      const analyzer = new ValidationErrorAnalyzer();
      
      // Set up minimal test data
      analyzer.results.startTime = new Date();
      analyzer.results.endTime = new Date();
      analyzer.results.authToken = 'test-token';
      
      // Add sample error comparison
      analyzer.results.errorComparisons.push({
        field: 'status',
        testCase: { value: 'test_value', expectedError: 'Test error' },
        admin: { 
          success: false, 
          error: { message: 'Test admin error' },
          statusCode: 400
        },
        api: { 
          success: false, 
          error: { message: 'Test API error' },
          statusCode: 400
        },
        errorConsistency: { 
          severity: 'LOW', 
          bothFailed: true,
          bothSucceeded: false,
          adminFailedApiSucceeded: false,
          adminSucceededApiFailed: false
        },
        errorClassification: { 
          errorType: 'enum_validation', 
          category: 'enumValidation',
          severity: 'LOW'
        },
        recommendations: [{
          priority: 'LOW',
          category: 'Test',
          issue: 'Test issue',
          solution: 'Test solution'
        }],
        timestamp: new Date()
      });
      
      // Test analysis methods
      analyzer.analyzeErrorPatterns();
      analyzer.generateConsistencyAnalysis();
      analyzer.generateGlobalRecommendations();
      
      // Verify analysis results
      if (!analyzer.results.errorPatterns) {
        throw new Error('Error patterns analysis failed');
      }
      
      if (!analyzer.results.consistencyAnalysis) {
        throw new Error('Consistency analysis failed');
      }
      
      if (!analyzer.results.recommendations) {
        throw new Error('Recommendations generation failed');
      }
      
      // Test report generation methods (without actually writing files)
      const mockReport = {
        metadata: {
          title: 'Test Report',
          generated: new Date().toISOString(),
          duration: 1000
        },
        executionSummary: {
          startTime: analyzer.results.startTime.toISOString(),
          endTime: analyzer.results.endTime.toISOString(),
          duration: '1000ms',
          totalErrorTests: analyzer.results.errorComparisons.length,
          authenticationSuccess: !!analyzer.results.authToken
        },
        consistencyAnalysis: analyzer.results.consistencyAnalysis,
        errorPatterns: analyzer.results.errorPatterns,
        globalRecommendations: analyzer.results.recommendations,
        detailedErrorComparisons: analyzer.results.errorComparisons,
        errorCategories: analyzer.results.errorCategories
      };
      
      // Test markdown generation
      const markdownSummary = analyzer.generateMarkdownSummary(mockReport);
      if (!markdownSummary || typeof markdownSummary !== 'string') {
        throw new Error('Markdown summary generation failed');
      }
      
      // Test fix guide generation
      const fixGuide = analyzer.generateFixGuide(mockReport);
      if (!fixGuide || typeof fixGuide !== 'string') {
        throw new Error('Fix guide generation failed');
      }
      
      // Test actionable insights generation
      const insights = analyzer.generateActionableInsights();
      if (!Array.isArray(insights)) {
        throw new Error('Actionable insights generation failed');
      }
      
      console.log('✅ Report generation verification passed');
      console.log('   All report generation methods work correctly');
      
      this.verificationResults.reportGeneration = true;
      return true;
    } catch (error) {
      console.error('❌ Report generation verification failed:', error.message);
      return false;
    }
  }

  /**
   * Verify documentation exists
   */
  async verifyDocumentation() {
    console.log('📚 Verifying documentation...');
    
    try {
      const requiredFiles = [
        'validation-error-analysis-system.js',
        'test-validation-error-analysis.js',
        'run-validation-error-analysis.js',
        'validation-error-analysis-documentation.md'
      ];
      
      for (const file of requiredFiles) {
        const filePath = path.join(__dirname, file);
        
        try {
          const stats = await fs.stat(filePath);
          if (!stats.isFile()) {
            throw new Error(`${file} is not a file`);
          }
          
          // Check file size (should not be empty)
          if (stats.size === 0) {
            throw new Error(`${file} is empty`);
          }
        } catch (error) {
          throw new Error(`Required file missing or invalid: ${file}`);
        }
      }
      
      // Check documentation content
      const docPath = path.join(__dirname, 'validation-error-analysis-documentation.md');
      const docContent = await fs.readFile(docPath, 'utf8');
      
      const requiredSections = [
        '# Validation Error Analysis and Reporting System',
        '## Overview',
        '## Features',
        '## Usage',
        '## Test Scenarios',
        '## Report Types',
        '## Error Severity Levels'
      ];
      
      for (const section of requiredSections) {
        if (!docContent.includes(section)) {
          throw new Error(`Documentation missing required section: ${section}`);
        }
      }
      
      console.log('✅ Documentation verification passed');
      console.log(`   All ${requiredFiles.length} required files exist and are valid`);
      
      this.verificationResults.documentation = true;
      return true;
    } catch (error) {
      console.error('❌ Documentation verification failed:', error.message);
      return false;
    }
  }

  /**
   * Run complete verification
   */
  async runCompleteVerification() {
    console.log('🚀 Starting Validation Error Analysis System Verification...');
    console.log('='.repeat(70));
    
    try {
      // Run all verification steps
      const codeOk = await this.verifyCodeStructure();
      const scenariosOk = this.verifyErrorScenarios();
      const reportOk = await this.verifyReportGeneration();
      const docsOk = await this.verifyDocumentation();
      
      // Determine overall success
      this.verificationResults.overallSuccess = codeOk && scenariosOk && reportOk && docsOk;
      
      // Display results
      this.displayVerificationResults();
      
      return this.verificationResults.overallSuccess;
    } catch (error) {
      console.error('❌ Verification process failed:', error.message);
      this.displayVerificationResults();
      return false;
    }
  }

  /**
   * Display verification results
   */
  displayVerificationResults() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 VALIDATION ERROR ANALYSIS SYSTEM VERIFICATION RESULTS');
    console.log('='.repeat(70));
    
    const checks = [
      { name: 'Code Structure', result: this.verificationResults.codeStructure },
      { name: 'Error Scenarios', result: this.verificationResults.errorScenarios },
      { name: 'Report Generation', result: this.verificationResults.reportGeneration },
      { name: 'Documentation', result: this.verificationResults.documentation }
    ];
    
    checks.forEach(check => {
      const status = check.result ? '✅ PASS' : '❌ FAIL';
      console.log(`${check.name}: ${status}`);
    });
    
    console.log(`\nOverall: ${this.verificationResults.overallSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`);
    
    if (this.verificationResults.overallSuccess) {
      console.log('\n🎉 Validation Error Analysis System is ready for use!');
      console.log('\nNext steps:');
      console.log('1. Start your Strapi server');
      console.log('2. Run: node scripts/test-validation-error-analysis.js');
      console.log('3. Run: node scripts/validation-error-analysis-system.js');
      console.log('4. Review generated reports for validation issues');
    } else {
      console.log('\n❌ System verification failed. Please fix the issues above.');
    }
    
    console.log('\n' + '='.repeat(70));
  }
}

/**
 * Main verification function
 */
async function runVerification() {
  const verifier = new ValidationErrorAnalysisVerifier();
  
  try {
    const success = await verifier.runCompleteVerification();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Verification runner failed:', error.message);
    process.exit(1);
  }
}

// Export for module usage
module.exports = {
  ValidationErrorAnalysisVerifier,
  runVerification
};

// Run verification if script is executed directly
if (require.main === module) {
  runVerification();
}