#!/usr/bin/env node

/**
 * Validation Error Analysis and Reporting System
 * 
 * This script captures and analyzes specific validation error messages,
 * compares error responses between admin interface and API endpoints,
 * and generates actionable error reports with suggested fixes.
 * 
 * Features:
 * - Captures detailed validation error messages from both admin and API
 * - Analyzes error patterns and categorizes them by severity
 * - Compares error consistency between admin interface and API endpoints
 * - Generates actionable reports with specific fix recommendations
 * - Tracks error trends and provides diagnostic insights
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@viktoria-wertheim.de',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  TIMEOUT: 15000,
  OUTPUT_DIR: './validation-reports',
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};

// Test scenarios for comprehensive error analysis
const ERROR_TEST_SCENARIOS = {
  status: {
    validValues: ['aktiv', 'inaktiv', 'aufgeloest'],
    invalidValues: [
      { value: 'active', expectedError: 'Invalid enum value' },
      { value: 'AKTIV', expectedError: 'Case sensitivity error' },
      { value: '', expectedError: 'Required field empty' },
      { value: null, expectedError: 'Null value error' },
      { value: undefined, expectedError: 'Undefined value error' },
      { value: 123, expectedError: 'Type mismatch error' },
      { value: [], expectedError: 'Array instead of string' },
      { value: {}, expectedError: 'Object instead of string' },
      { value: 'dissolved', expectedError: 'English instead of German' }
    ]
  },
  liga: {
    validValues: ['Kreisklasse B', 'Kreisklasse A', 'Kreisliga', 'Landesliga'],
    invalidValues: [
      { value: 'Kreisklasse C', expectedError: 'Invalid league level' },
      { value: 'Bezirksliga', expectedError: 'League not in enum' },
      { value: 'kreisklasse a', expectedError: 'Case sensitivity error' },
      { value: '', expectedError: 'Required field empty' },
      { value: null, expectedError: 'Null value error' },
      { value: 'Oberliga', expectedError: 'Higher league not supported' }
    ]
  },
  altersklasse: {
    validValues: ['senioren', 'a-jugend', 'b-jugend', 'c-jugend', 'd-jugend', 'e-jugend', 'f-jugend', 'bambini'],
    invalidValues: [
      { value: 'senior', expectedError: 'Singular instead of plural' },
      { value: 'herren', expectedError: 'Alternative term not supported' },
      { value: 'A-Jugend', expectedError: 'Case sensitivity error' },
      { value: 'a_jugend', expectedError: 'Underscore instead of hyphen' },
      { value: '', expectedError: 'Required field empty' },
      { value: null, expectedError: 'Null value error' }
    ]
  },
  trend: {
    validValues: ['steigend', 'gleich', 'fallend'],
    invalidValues: [
      { value: 'aufsteigend', expectedError: 'Alternative term not supported' },
      { value: 'stabil', expectedError: 'Synonym not supported' },
      { value: 'STEIGEND', expectedError: 'Case sensitivity error' },
      { value: '', expectedError: 'Required field empty' },
      { value: null, expectedError: 'Null value error' }
    ]
  }
};

/**
 * Error Analysis Result Collector
 */
class ValidationErrorAnalyzer {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      authToken: null,
      errorPatterns: {},
      adminErrors: {},
      apiErrors: {},
      errorComparisons: [],
      errorCategories: {
        enumValidation: [],
        typeValidation: [],
        requiredField: [],
        caseSensitivity: [],
        nullUndefined: [],
        formatValidation: []
      },
      consistencyAnalysis: {},
      recommendations: []
    };
  }

  /**
   * Authenticate with Strapi admin
   */
  async authenticate() {
    console.log('🔐 Authenticating with Strapi admin...');
    
    try {
      const response = await axios.post(`${CONFIG.STRAPI_URL}/admin/auth/local`, {
        email: CONFIG.ADMIN_EMAIL,
        password: CONFIG.ADMIN_PASSWORD
      }, {
        timeout: CONFIG.TIMEOUT
      });

      this.results.authToken = response.data.data.token;
      console.log('✅ Admin authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Admin authentication failed:', error.message);
      this.addError('authentication', 'admin', null, error, 'Failed to authenticate with admin panel');
      return false;
    }
  }

  /**
   * Get admin headers for authenticated requests
   */
  getAdminHeaders() {
    return {
      'Authorization': `Bearer ${this.results.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Test validation error through admin content manager
   */
  async testAdminValidationError(field, testCase) {
    const testData = {
      name: `Admin-Error-Test-${field}-${Date.now()}`,
      [field]: testCase.value,
      saison: "2024/25",
      spielort: "Sportplatz Wertheim",
      // Provide safe defaults for other required fields
      status: field === 'status' ? testCase.value : 'aktiv',
      liga: field === 'liga' ? testCase.value : 'Kreisklasse A',
      altersklasse: field === 'altersklasse' ? testCase.value : 'senioren',
      trend: field === 'trend' ? testCase.value : 'gleich'
    };

    try {
      const response = await axios.post(
        `${CONFIG.STRAPI_URL}/admin/content-manager/collection-types/api::mannschaft.mannschaft`,
        testData,
        {
          headers: this.getAdminHeaders(),
          timeout: CONFIG.TIMEOUT
        }
      );

      // If we get here, the validation didn't fail as expected
      return {
        success: true,
        unexpectedSuccess: true,
        data: response.data,
        statusCode: response.status,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        unexpectedSuccess: false,
        data: null,
        statusCode: error.response?.status || 500,
        error: {
          message: error.message,
          details: error.response?.data?.error?.details || null,
          validationErrors: error.response?.data?.error?.details?.errors || null,
          fullResponse: error.response?.data || null,
          rawError: error.response?.data?.error || null
        }
      };
    }
  }

  /**
   * Test validation error through public API
   */
  async testApiValidationError(field, testCase) {
    const testData = {
      data: {
        name: `API-Error-Test-${field}-${Date.now()}`,
        [field]: testCase.value,
        saison: "2024/25",
        spielort: "Sportplatz Wertheim",
        // Provide safe defaults for other required fields
        status: field === 'status' ? testCase.value : 'aktiv',
        liga: field === 'liga' ? testCase.value : 'Kreisklasse A',
        altersklasse: field === 'altersklasse' ? testCase.value : 'senioren',
        trend: field === 'trend' ? testCase.value : 'gleich'
      }
    };

    try {
      const response = await axios.post(
        `${CONFIG.STRAPI_URL}/api/mannschaften`,
        testData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: CONFIG.TIMEOUT
        }
      );

      // If we get here, the validation didn't fail as expected
      return {
        success: true,
        unexpectedSuccess: true,
        data: response.data,
        statusCode: response.status,
        error: null
      };
    } catch (error) {
      return {
        success: false,
        unexpectedSuccess: false,
        data: null,
        statusCode: error.response?.status || 500,
        error: {
          message: error.message,
          details: error.response?.data?.error?.details || null,
          validationErrors: error.response?.data?.error?.details?.errors || null,
          fullResponse: error.response?.data || null,
          rawError: error.response?.data?.error || null
        }
      };
    }
  }

  /**
   * Analyze and compare validation errors
   */
  async analyzeValidationError(field, testCase) {
    console.log(`🔍 Analyzing error for ${field}: "${testCase.value}"`);

    const adminResult = await this.testAdminValidationError(field, testCase);
    const apiResult = await this.testApiValidationError(field, testCase);

    const comparison = {
      field,
      testCase,
      admin: adminResult,
      api: apiResult,
      timestamp: new Date(),
      errorConsistency: this.analyzeErrorConsistency(adminResult, apiResult),
      errorClassification: this.classifyError(field, testCase, adminResult, apiResult),
      recommendations: this.generateErrorRecommendations(field, testCase, adminResult, apiResult)
    };

    this.results.errorComparisons.push(comparison);
    this.categorizeError(comparison);
    
    // Log results
    this.logErrorAnalysis(comparison);

    return comparison;
  }

  /**
   * Analyze error consistency between admin and API
   */
  analyzeErrorConsistency(adminResult, apiResult) {
    const consistency = {
      bothFailed: !adminResult.success && !apiResult.success,
      bothSucceeded: adminResult.success && apiResult.success,
      adminFailedApiSucceeded: !adminResult.success && apiResult.success,
      adminSucceededApiFailed: adminResult.success && !apiResult.success,
      errorMessagesSimilar: false,
      statusCodesSimilar: false,
      severity: 'LOW'
    };

    // Check if both failed (expected behavior)
    if (consistency.bothFailed) {
      consistency.severity = 'LOW';
      consistency.errorMessagesSimilar = this.compareErrorMessages(
        adminResult.error?.message,
        apiResult.error?.message
      );
      consistency.statusCodesSimilar = adminResult.statusCode === apiResult.statusCode;
    }
    // Check for inconsistent behavior (problematic)
    else if (consistency.adminFailedApiSucceeded) {
      consistency.severity = 'HIGH';
      consistency.description = 'Admin rejects but API accepts - users cannot create via admin what API allows';
    }
    else if (consistency.adminSucceededApiFailed) {
      consistency.severity = 'MEDIUM';
      consistency.description = 'API rejects but Admin accepts - potential data integrity issue';
    }
    // Both succeeded (unexpected for invalid values)
    else if (consistency.bothSucceeded) {
      consistency.severity = 'MEDIUM';
      consistency.description = 'Both interfaces accept invalid value - validation bypass detected';
    }

    return consistency;
  }

  /**
   * Compare error messages for similarity
   */
  compareErrorMessages(adminMessage, apiMessage) {
    if (!adminMessage || !apiMessage) return false;
    
    // Normalize messages for comparison
    const normalizeMessage = (msg) => msg.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const normalizedAdmin = normalizeMessage(adminMessage);
    const normalizedApi = normalizeMessage(apiMessage);
    
    // Check for similar keywords
    const commonKeywords = ['validation', 'invalid', 'required', 'enum', 'error'];
    const adminKeywords = commonKeywords.filter(keyword => normalizedAdmin.includes(keyword));
    const apiKeywords = commonKeywords.filter(keyword => normalizedApi.includes(keyword));
    
    return adminKeywords.length > 0 && apiKeywords.length > 0;
  }

  /**
   * Classify error type and pattern
   */
  classifyError(field, testCase, adminResult, apiResult) {
    const classification = {
      errorType: 'unknown',
      pattern: 'unknown',
      severity: 'LOW',
      category: 'other'
    };

    // Analyze the test case to determine expected error type
    if (testCase.value === null || testCase.value === undefined) {
      classification.errorType = 'null_undefined';
      classification.category = 'nullUndefined';
    } else if (testCase.value === '') {
      classification.errorType = 'empty_required';
      classification.category = 'requiredField';
    } else if (typeof testCase.value !== 'string') {
      classification.errorType = 'type_mismatch';
      classification.category = 'typeValidation';
    } else if (testCase.expectedError?.includes('Case sensitivity')) {
      classification.errorType = 'case_sensitivity';
      classification.category = 'caseSensitivity';
    } else if (testCase.expectedError?.includes('enum') || testCase.expectedError?.includes('Invalid')) {
      classification.errorType = 'enum_validation';
      classification.category = 'enumValidation';
    } else {
      classification.errorType = 'format_validation';
      classification.category = 'formatValidation';
    }

    // Determine severity based on consistency
    if (!adminResult.success && !apiResult.success) {
      classification.severity = 'LOW'; // Both reject as expected
    } else if (adminResult.success !== apiResult.success) {
      classification.severity = 'HIGH'; // Inconsistent behavior
    } else if (adminResult.success && apiResult.success) {
      classification.severity = 'MEDIUM'; // Both accept invalid value
    }

    return classification;
  }

  /**
   * Generate specific recommendations for error fixes
   */
  generateErrorRecommendations(field, testCase, adminResult, apiResult) {
    const recommendations = [];

    // High severity issues
    if (adminResult.success !== apiResult.success) {
      if (!adminResult.success && apiResult.success) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Validation Inconsistency',
          issue: `Admin rejects "${testCase.value}" but API accepts it`,
          solution: 'Check admin panel validation logic and ensure it matches API validation',
          technicalDetails: {
            adminError: adminResult.error?.message,
            apiResponse: apiResult.data,
            suggestedFix: 'Update admin validation rules or fix API validation'
          }
        });
      } else {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'Validation Inconsistency',
          issue: `API rejects "${testCase.value}" but Admin accepts it`,
          solution: 'Ensure API validation rules are properly applied in admin interface',
          technicalDetails: {
            apiError: apiResult.error?.message,
            adminResponse: adminResult.data,
            suggestedFix: 'Synchronize validation rules between admin and API'
          }
        });
      }
    }

    // Both accept invalid value
    if (adminResult.success && apiResult.success && testCase.expectedError) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Insufficient Validation',
        issue: `Both interfaces accept invalid value "${testCase.value}"`,
        solution: 'Strengthen validation rules for this field',
        technicalDetails: {
          expectedError: testCase.expectedError,
          suggestedFix: `Add validation rule to reject "${testCase.value}"`
        }
      });
    }

    // Error message quality issues
    if (!adminResult.success && adminResult.error && !this.isErrorMessageHelpful(adminResult.error.message)) {
      recommendations.push({
        priority: 'LOW',
        category: 'Error Message Quality',
        issue: 'Admin error message is not user-friendly',
        solution: 'Improve error message clarity and provide actionable guidance',
        technicalDetails: {
          currentMessage: adminResult.error.message,
          suggestedMessage: `Invalid ${field} value. Please use one of: ${ERROR_TEST_SCENARIOS[field]?.validValues?.join(', ')}`
        }
      });
    }

    return recommendations;
  }

  /**
   * Check if error message is helpful to users
   */
  isErrorMessageHelpful(message) {
    if (!message) return false;
    
    const helpfulIndicators = [
      'please use',
      'valid values',
      'allowed values',
      'must be one of',
      'expected format'
    ];
    
    const lowerMessage = message.toLowerCase();
    return helpfulIndicators.some(indicator => lowerMessage.includes(indicator));
  }

  /**
   * Categorize error for analysis
   */
  categorizeError(comparison) {
    const category = comparison.errorClassification.category;
    if (this.results.errorCategories[category]) {
      this.results.errorCategories[category].push(comparison);
    }
  }

  /**
   * Log error analysis results
   */
  logErrorAnalysis(comparison) {
    const { field, testCase, admin, api, errorConsistency } = comparison;
    
    if (errorConsistency.severity === 'HIGH') {
      console.log(`  ❌ HIGH SEVERITY: ${errorConsistency.description}`);
    } else if (errorConsistency.severity === 'MEDIUM') {
      console.log(`  ⚠️ MEDIUM: ${errorConsistency.description || 'Validation issue detected'}`);
    } else if (errorConsistency.bothFailed) {
      console.log(`  ✅ Both interfaces correctly reject "${testCase.value}"`);
    } else {
      console.log(`  ℹ️ Unexpected behavior for "${testCase.value}"`);
    }

    // Show error details for debugging
    if (!admin.success && admin.error?.message) {
      console.log(`     Admin error: ${admin.error.message}`);
    }
    if (!api.success && api.error?.message) {
      console.log(`     API error: ${api.error.message}`);
    }
  }

  /**
   * Add error to results
   */
  addError(context, interfaceType, field, error, description) {
    const errorEntry = {
      context,
      interface: interfaceType,
      field,
      error: error.message,
      description,
      timestamp: new Date(),
      details: error.response?.data || null
    };

    if (interfaceType === 'admin') {
      if (!this.results.adminErrors[context]) this.results.adminErrors[context] = [];
      this.results.adminErrors[context].push(errorEntry);
    } else {
      if (!this.results.apiErrors[context]) this.results.apiErrors[context] = [];
      this.results.apiErrors[context].push(errorEntry);
    }
  }

  /**
   * Run comprehensive error analysis
   */
  async runErrorAnalysis() {
    console.log('🚀 Starting Validation Error Analysis...');
    console.log(`📍 Target: ${CONFIG.STRAPI_URL}`);

    // Step 1: Authenticate
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      throw new Error('Cannot proceed without admin authentication');
    }

    // Step 2: Test each field with error scenarios
    for (const [field, scenarios] of Object.entries(ERROR_TEST_SCENARIOS)) {
      console.log(`\n🧪 Testing error scenarios for field: ${field}`);
      
      // Test invalid values to capture error patterns
      for (const testCase of scenarios.invalidValues) {
        await this.analyzeValidationError(field, testCase);
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Step 3: Analyze patterns and generate insights
    this.analyzeErrorPatterns();
    this.generateConsistencyAnalysis();
    this.generateGlobalRecommendations();

    this.results.endTime = new Date();
    console.log('\n✅ Error analysis complete!');
  }

  /**
   * Analyze error patterns across all tests
   */
  analyzeErrorPatterns() {
    console.log('📊 Analyzing error patterns...');

    const patterns = {
      highSeverityCount: 0,
      mediumSeverityCount: 0,
      lowSeverityCount: 0,
      mostProblematicField: null,
      commonErrorTypes: {},
      inconsistentBehaviorCount: 0
    };

    this.results.errorComparisons.forEach(comparison => {
      const severity = comparison.errorConsistency.severity;
      patterns[`${severity.toLowerCase()}SeverityCount`]++;

      if (severity === 'HIGH' || severity === 'MEDIUM') {
        patterns.inconsistentBehaviorCount++;
      }

      // Track error types
      const errorType = comparison.errorClassification.errorType;
      patterns.commonErrorTypes[errorType] = (patterns.commonErrorTypes[errorType] || 0) + 1;
    });

    // Find most problematic field
    const fieldIssues = {};
    this.results.errorComparisons.forEach(comparison => {
      if (comparison.errorConsistency.severity !== 'LOW') {
        fieldIssues[comparison.field] = (fieldIssues[comparison.field] || 0) + 1;
      }
    });

    if (Object.keys(fieldIssues).length > 0) {
      const maxIssues = Math.max(...Object.values(fieldIssues));
      patterns.mostProblematicField = {
        field: Object.keys(fieldIssues).find(field => fieldIssues[field] === maxIssues),
        issueCount: maxIssues
      };
    }

    this.results.errorPatterns = patterns;
  }

  /**
   * Generate consistency analysis
   */
  generateConsistencyAnalysis() {
    const totalTests = this.results.errorComparisons.length;
    const consistentTests = this.results.errorComparisons.filter(c => c.errorConsistency.bothFailed).length;
    const inconsistentTests = totalTests - consistentTests;

    this.results.consistencyAnalysis = {
      totalErrorTests: totalTests,
      consistentErrorHandling: consistentTests,
      inconsistentErrorHandling: inconsistentTests,
      consistencyRate: totalTests > 0 ? ((consistentTests / totalTests) * 100).toFixed(2) : 0,
      criticalInconsistencies: this.results.errorComparisons.filter(c => c.errorConsistency.severity === 'HIGH').length,
      moderateInconsistencies: this.results.errorComparisons.filter(c => c.errorConsistency.severity === 'MEDIUM').length,
      overallErrorHandlingHealth: this.calculateErrorHandlingHealth(consistentTests, totalTests)
    };
  }

  /**
   * Calculate overall error handling health
   */
  calculateErrorHandlingHealth(consistentTests, totalTests) {
    if (totalTests === 0) return 'UNKNOWN';
    
    const consistencyRate = (consistentTests / totalTests) * 100;
    
    if (consistencyRate >= 95) return 'EXCELLENT';
    if (consistencyRate >= 85) return 'GOOD';
    if (consistencyRate >= 70) return 'FAIR';
    if (consistencyRate >= 50) return 'POOR';
    return 'CRITICAL';
  }

  /**
   * Generate global recommendations
   */
  generateGlobalRecommendations() {
    const recommendations = [];

    // High-level consistency issues
    if (this.results.consistencyAnalysis.criticalInconsistencies > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'System Consistency',
        issue: `${this.results.consistencyAnalysis.criticalInconsistencies} critical inconsistencies found`,
        solution: 'Immediately address validation discrepancies between admin and API interfaces',
        impact: 'Users cannot perform operations through admin that work via API'
      });
    }

    // Error message quality
    const poorErrorMessages = this.results.errorComparisons.filter(c => 
      !c.admin.success && c.admin.error && !this.isErrorMessageHelpful(c.admin.error.message)
    ).length;

    if (poorErrorMessages > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'User Experience',
        issue: `${poorErrorMessages} unhelpful error messages detected`,
        solution: 'Improve error message clarity and provide actionable guidance to users',
        impact: 'Users struggle to understand and fix validation errors'
      });
    }

    // Most problematic field
    if (this.results.errorPatterns.mostProblematicField) {
      const { field, issueCount } = this.results.errorPatterns.mostProblematicField;
      recommendations.push({
        priority: 'HIGH',
        category: 'Field-Specific Issues',
        issue: `Field "${field}" has ${issueCount} validation issues`,
        solution: `Focus validation fixes on the "${field}" field first`,
        impact: 'This field is blocking content creation most frequently'
      });
    }

    // Overall health assessment
    const health = this.results.consistencyAnalysis.overallErrorHandlingHealth;
    if (health === 'CRITICAL' || health === 'POOR') {
      recommendations.push({
        priority: 'HIGH',
        category: 'System Health',
        issue: `Overall error handling health is ${health}`,
        solution: 'Comprehensive validation system overhaul required',
        impact: 'System reliability and user experience are severely compromised'
      });
    }

    this.results.recommendations = recommendations;
  }

  /**
   * Generate comprehensive error analysis report
   */
  async generateReport() {
    console.log('📄 Generating error analysis report...');

    const report = {
      metadata: {
        title: 'Validation Error Analysis and Reporting System',
        generated: new Date().toISOString(),
        duration: this.results.endTime && this.results.startTime ? 
          this.results.endTime - this.results.startTime : 0,
        strapiUrl: CONFIG.STRAPI_URL,
        version: '1.0.0'
      },
      executionSummary: {
        startTime: this.results.startTime.toISOString(),
        endTime: this.results.endTime.toISOString(),
        duration: `${this.results.endTime - this.results.startTime}ms`,
        totalErrorTests: this.results.errorComparisons.length,
        authenticationSuccess: !!this.results.authToken
      },
      errorPatterns: this.results.errorPatterns,
      consistencyAnalysis: this.results.consistencyAnalysis,
      errorCategories: this.results.errorCategories,
      detailedErrorComparisons: this.results.errorComparisons,
      globalRecommendations: this.results.recommendations,
      actionableInsights: this.generateActionableInsights()
    };

    // Ensure output directory exists
    await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });

    // Save detailed JSON report
    const jsonReportPath = path.join(CONFIG.OUTPUT_DIR, `validation-error-analysis-${Date.now()}.json`);
    await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2));

    // Generate human-readable summary
    const summaryPath = path.join(CONFIG.OUTPUT_DIR, `validation-error-summary-${Date.now()}.md`);
    const summaryContent = this.generateMarkdownSummary(report);
    await fs.writeFile(summaryPath, summaryContent);

    // Generate actionable fix guide
    const fixGuidePath = path.join(CONFIG.OUTPUT_DIR, `validation-fix-guide-${Date.now()}.md`);
    const fixGuideContent = this.generateFixGuide(report);
    await fs.writeFile(fixGuidePath, fixGuideContent);

    console.log(`📄 Detailed report: ${jsonReportPath}`);
    console.log(`📄 Summary report: ${summaryPath}`);
    console.log(`📄 Fix guide: ${fixGuidePath}`);

    return { report, jsonReportPath, summaryPath, fixGuidePath };
  }

  /**
   * Generate actionable insights
   */
  generateActionableInsights() {
    const insights = [];

    // Immediate actions needed
    const criticalIssues = this.results.errorComparisons.filter(c => c.errorConsistency.severity === 'HIGH');
    if (criticalIssues.length > 0) {
      insights.push({
        type: 'IMMEDIATE_ACTION',
        title: 'Critical Validation Inconsistencies Detected',
        description: `${criticalIssues.length} critical issues where admin and API behave differently`,
        action: 'Review and fix validation logic discrepancies immediately',
        affectedFields: [...new Set(criticalIssues.map(i => i.field))],
        estimatedEffort: 'High',
        businessImpact: 'Users cannot create content through admin interface'
      });
    }

    // Pattern-based insights
    const enumErrors = this.results.errorCategories.enumValidation.length;
    if (enumErrors > 0) {
      insights.push({
        type: 'PATTERN_INSIGHT',
        title: 'Enum Validation Issues Detected',
        description: `${enumErrors} enum validation errors found across multiple fields`,
        action: 'Review enum definitions and validation logic',
        recommendation: 'Consider implementing centralized enum validation',
        estimatedEffort: 'Medium'
      });
    }

    // User experience insights
    const poorMessages = this.results.errorComparisons.filter(c => 
      !c.admin.success && c.admin.error && !this.isErrorMessageHelpful(c.admin.error.message)
    ).length;

    if (poorMessages > 0) {
      insights.push({
        type: 'UX_IMPROVEMENT',
        title: 'Error Message Quality Issues',
        description: `${poorMessages} error messages are not user-friendly`,
        action: 'Improve error message clarity and provide valid options',
        recommendation: 'Implement standardized error message templates',
        estimatedEffort: 'Low',
        businessImpact: 'Improved user experience and reduced support requests'
      });
    }

    return insights;
  }

  /**
   * Generate markdown summary
   */
  generateMarkdownSummary(report) {
    const { consistencyAnalysis, errorPatterns, globalRecommendations } = report;

    return `# Validation Error Analysis Summary

**Generated:** ${new Date(report.metadata.generated).toLocaleString()}
**Duration:** ${report.executionSummary.duration}
**Overall Health:** ${consistencyAnalysis.overallErrorHandlingHealth}

## Executive Summary

This report analyzes validation error behavior between the Strapi admin interface and API endpoints, identifying inconsistencies and providing actionable recommendations for fixes.

## Key Findings

### Error Handling Consistency
- **Total Error Tests:** ${consistencyAnalysis.totalErrorTests}
- **Consistent Error Handling:** ${consistencyAnalysis.consistentErrorHandling}
- **Inconsistent Error Handling:** ${consistencyAnalysis.inconsistentErrorHandling}
- **Consistency Rate:** ${consistencyAnalysis.consistencyRate}%

### Severity Breakdown
- **Critical Issues:** ${consistencyAnalysis.criticalInconsistencies} (Admin/API behave differently)
- **Moderate Issues:** ${consistencyAnalysis.moderateInconsistencies} (Both accept invalid values)
- **Low Issues:** ${errorPatterns.lowSeverityCount} (Both correctly reject)

### Most Problematic Areas
${errorPatterns.mostProblematicField ? 
  `- **Most Problematic Field:** ${errorPatterns.mostProblematicField.field} (${errorPatterns.mostProblematicField.issueCount} issues)` : 
  '- No specific field shows significantly more issues than others'
}

## Priority Recommendations

${globalRecommendations.map((rec, index) => 
  `### ${index + 1}. ${rec.issue} (${rec.priority})
**Category:** ${rec.category}
**Solution:** ${rec.solution}
${rec.impact ? `**Impact:** ${rec.impact}` : ''}
`).join('\n')}

## Error Categories Analysis

${Object.entries(report.errorCategories).map(([category, errors]) => 
  `- **${category}:** ${errors.length} errors`
).join('\n')}

## Next Steps

1. **Immediate:** Address critical inconsistencies (${consistencyAnalysis.criticalInconsistencies} issues)
2. **Short-term:** Fix moderate validation issues (${consistencyAnalysis.moderateInconsistencies} issues)
3. **Long-term:** Improve error message quality and user experience

For detailed technical information and specific error examples, see the full JSON report.
`;
  }

  /**
   * Generate fix guide
   */
  generateFixGuide(report) {
    const criticalIssues = report.detailedErrorComparisons.filter(c => c.errorConsistency.severity === 'HIGH');
    const moderateIssues = report.detailedErrorComparisons.filter(c => c.errorConsistency.severity === 'MEDIUM');

    return `# Validation Error Fix Guide

This guide provides step-by-step instructions to fix the validation errors identified in the analysis.

## Critical Issues (Fix Immediately)

${criticalIssues.length === 0 ? 'No critical issues found! 🎉' : 
  criticalIssues.map((issue, index) => `
### ${index + 1}. ${issue.field} - "${issue.testCase.value}"

**Problem:** ${issue.errorConsistency.description}
**Admin Result:** ${issue.admin.success ? 'Accepts' : 'Rejects'}
**API Result:** ${issue.api.success ? 'Accepts' : 'Rejects'}

**Fix Steps:**
${issue.recommendations.map(rec => `- ${rec.solution}`).join('\n')}

**Technical Details:**
${issue.admin.error ? `- Admin Error: ${issue.admin.error.message}` : ''}
${issue.api.error ? `- API Error: ${issue.api.error.message}` : ''}
`).join('\n')
}

## Moderate Issues (Fix Soon)

${moderateIssues.length === 0 ? 'No moderate issues found!' : 
  moderateIssues.map((issue, index) => `
### ${index + 1}. ${issue.field} - "${issue.testCase.value}"

**Problem:** ${issue.errorConsistency.description || 'Both interfaces accept invalid value'}
**Expected:** Should reject "${issue.testCase.value}" because ${issue.testCase.expectedError}

**Fix Steps:**
${issue.recommendations.map(rec => `- ${rec.solution}`).join('\n')}
`).join('\n')
}

## General Recommendations

${report.globalRecommendations.map((rec, index) => `
### ${index + 1}. ${rec.category}: ${rec.issue}

**Priority:** ${rec.priority}
**Solution:** ${rec.solution}
${rec.impact ? `**Business Impact:** ${rec.impact}` : ''}
`).join('\n')}

## Testing After Fixes

After implementing fixes, run the following tests to verify:

1. **Re-run this error analysis script:**
   \`\`\`bash
   node scripts/validation-error-analysis-system.js
   \`\`\`

2. **Run comprehensive validation tests:**
   \`\`\`bash
   node scripts/run-comprehensive-validation-tests.js
   \`\`\`

3. **Test admin interface manually:**
   - Try creating mannschaft entries with previously problematic values
   - Verify error messages are clear and helpful
   - Confirm consistent behavior between admin and API

## Prevention

To prevent similar issues in the future:

1. **Implement validation tests in CI/CD pipeline**
2. **Use centralized validation logic shared between admin and API**
3. **Regular validation consistency checks**
4. **Standardized error message templates**
5. **Schema validation on deployment**

---

*This fix guide was generated automatically. For technical details, refer to the full JSON report.*
`;
  }
}

/**
 * Main execution function
 */
async function runValidationErrorAnalysis() {
  const analyzer = new ValidationErrorAnalyzer();
  
  try {
    await analyzer.runErrorAnalysis();
    const { report, jsonReportPath, summaryPath, fixGuidePath } = await analyzer.generateReport();
    
    // Display summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 VALIDATION ERROR ANALYSIS COMPLETE');
    console.log('='.repeat(70));
    console.log(`Overall Health: ${report.consistencyAnalysis.overallErrorHandlingHealth}`);
    console.log(`Total Error Tests: ${report.consistencyAnalysis.totalErrorTests}`);
    console.log(`Consistency Rate: ${report.consistencyAnalysis.consistencyRate}%`);
    console.log(`Critical Issues: ${report.consistencyAnalysis.criticalInconsistencies}`);
    console.log(`Moderate Issues: ${report.consistencyAnalysis.moderateInconsistencies}`);
    
    if (report.errorPatterns.mostProblematicField) {
      console.log(`Most Problematic Field: ${report.errorPatterns.mostProblematicField.field}`);
    }
    
    console.log('\n📄 Generated Reports:');
    console.log(`- Detailed Analysis: ${jsonReportPath}`);
    console.log(`- Summary: ${summaryPath}`);
    console.log(`- Fix Guide: ${fixGuidePath}`);
    
    if (report.consistencyAnalysis.criticalInconsistencies > 0) {
      console.log('\n🚨 CRITICAL ISSUES DETECTED!');
      console.log('Review the fix guide immediately to resolve validation inconsistencies.');
      process.exit(1);
    } else if (report.consistencyAnalysis.moderateInconsistencies > 0) {
      console.log('\n⚠️ Moderate issues detected. Review the fix guide for improvements.');
      process.exit(0);
    } else {
      console.log('\n✅ No critical validation issues detected!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Validation error analysis failed:', error.message);
    process.exit(1);
  }
}

// Export for module usage
module.exports = {
  ValidationErrorAnalyzer,
  runValidationErrorAnalysis,
  ERROR_TEST_SCENARIOS,
  CONFIG
};

// Run analysis if script is executed directly
if (require.main === module) {
  runValidationErrorAnalysis();
}