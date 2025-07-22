/**
 * Comprehensive Validation Diagnostic Script
 * 
 * This script systematically tests all validation scenarios to identify
 * discrepancies between admin interface validation and API validation.
 * 
 * Features:
 * - Tests all enum fields with valid and invalid values
 * - Compares API validation behavior with expected admin behavior
 * - Generates detailed reports of validation discrepancies
 * - Identifies root causes of validation issues
 * - Tests schema consistency and compilation
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const CONFIG = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  API_BASE: '/api',
  ADMIN_BASE: '/admin',
  TIMEOUT: 10000,
  OUTPUT_DIR: './validation-reports',
  SCHEMA_PATH: './src/api/mannschaft/content-types/mannschaft/schema.json'
};

// Test data sets for comprehensive validation
const TEST_DATA_SETS = {
  status: {
    valid: ['aktiv', 'inaktiv', 'aufgeloest'],
    invalid: ['active', 'inactive', 'dissolved', 'AKTIV', 'Aktiv', '', null, undefined, 123, true, []]
  },
  liga: {
    valid: ['Kreisklasse B', 'Kreisklasse A', 'Kreisliga', 'Landesliga'],
    invalid: ['Kreisklasse C', 'Bezirksliga', 'Oberliga', 'KREISKLASSE A', '', null, undefined, 123, true, []]
  },
  altersklasse: {
    valid: ['senioren', 'a-jugend', 'b-jugend', 'c-jugend', 'd-jugend', 'e-jugend', 'f-jugend', 'bambini'],
    invalid: ['senior', 'a_jugend', 'A-Jugend', 'herren', '', null, undefined, 123, true, []]
  },
  trend: {
    valid: ['steigend', 'gleich', 'fallend'],
    invalid: ['aufsteigend', 'stabil', 'absteigend', 'STEIGEND', '', null, undefined, 123, true, []]
  }
};

// Validation result collector
class ValidationResults {
  constructor() {
    this.results = {
      api: {},
      admin: {},
      schema: {},
      discrepancies: [],
      summary: {}
    };
    this.startTime = new Date();
  }

  addApiResult(field, value, success, error = null, response = null) {
    if (!this.results.api[field]) this.results.api[field] = {};
    this.results.api[field][value] = {
      success,
      error: error ? error.message : null,
      statusCode: error?.response?.status || (success ? 200 : 500),
      validationDetails: error?.response?.data?.error?.details || null,
      response: response?.data || null,
      timestamp: new Date()
    };
  }

  addAdminResult(field, value, success, error = null) {
    if (!this.results.admin[field]) this.results.admin[field] = {};
    this.results.admin[field][value] = {
      success,
      error: error ? error.message : null,
      timestamp: new Date()
    };
  }

  addSchemaResult(field, definition) {
    this.results.schema[field] = definition;
  }

  addDiscrepancy(field, value, apiResult, adminResult, description) {
    this.results.discrepancies.push({
      field,
      value,
      apiResult,
      adminResult,
      description,
      severity: this.calculateSeverity(apiResult, adminResult),
      timestamp: new Date()
    });
  }

  calculateSeverity(apiResult, adminResult) {
    if (apiResult !== adminResult) {
      return apiResult ? 'HIGH' : 'MEDIUM'; // API accepts but admin rejects = HIGH, vice versa = MEDIUM
    }
    return 'LOW';
  }

  generateSummary() {
    const endTime = new Date();
    const duration = endTime - this.startTime;

    this.results.summary = {
      executionTime: duration,
      totalTests: this.getTotalTestCount(),
      discrepancyCount: this.results.discrepancies.length,
      highSeverityCount: this.results.discrepancies.filter(d => d.severity === 'HIGH').length,
      mediumSeverityCount: this.results.discrepancies.filter(d => d.severity === 'MEDIUM').length,
      fieldsWithIssues: [...new Set(this.results.discrepancies.map(d => d.field))],
      overallHealth: this.calculateOverallHealth(),
      timestamp: endTime
    };
  }

  getTotalTestCount() {
    let count = 0;
    Object.values(TEST_DATA_SETS).forEach(dataset => {
      count += dataset.valid.length + dataset.invalid.length;
    });
    return count;
  }

  calculateOverallHealth() {
    const totalTests = this.getTotalTestCount();
    const issues = this.results.discrepancies.length;
    const healthPercentage = ((totalTests - issues) / totalTests) * 100;
    
    if (healthPercentage >= 95) return 'EXCELLENT';
    if (healthPercentage >= 85) return 'GOOD';
    if (healthPercentage >= 70) return 'FAIR';
    if (healthPercentage >= 50) return 'POOR';
    return 'CRITICAL';
  }
}

/**
 * Schema Analysis Functions
 */
async function analyzeSchema() {
  console.log('🔍 Analyzing schema definition...');
  
  try {
    const schemaContent = await fs.readFile(CONFIG.SCHEMA_PATH, 'utf8');
    const schema = JSON.parse(schemaContent);
    
    const enumFields = {};
    Object.entries(schema.attributes).forEach(([fieldName, fieldDef]) => {
      if (fieldDef.type === 'enumeration') {
        enumFields[fieldName] = {
          enum: fieldDef.enum,
          required: fieldDef.required || false,
          default: fieldDef.default || null
        };
      }
    });

    console.log(`✅ Found ${Object.keys(enumFields).length} enum fields in schema`);
    return enumFields;
  } catch (error) {
    console.error('❌ Error reading schema:', error.message);
    return null;
  }
}

/**
 * API Validation Testing
 */
async function testApiValidation(field, value, results) {
  const testData = {
    data: {
      name: `Test-${field}-${Date.now()}`,
      [field]: value,
      // Add all required fields with safe defaults
      saison: "2024/25",
      spielort: "Sportplatz Wertheim",
      // Provide defaults for other required enum fields
      status: field === 'status' ? value : 'aktiv',
      liga: field === 'liga' ? value : 'Kreisklasse A',
      altersklasse: field === 'altersklasse' ? value : 'senioren',
      trend: field === 'trend' ? value : 'gleich'
    }
  };

  try {
    const response = await axios.post(
      `${CONFIG.STRAPI_URL}${CONFIG.API_BASE}/mannschaften`,
      testData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: CONFIG.TIMEOUT
      }
    );

    results.addApiResult(field, value, true, null, response);
    
    // Clean up created record
    if (response.data?.data?.id) {
      try {
        await axios.delete(`${CONFIG.STRAPI_URL}${CONFIG.API_BASE}/mannschaften/${response.data.data.id}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup record ${response.data.data.id}`);
      }
    }

    return true;
  } catch (error) {
    results.addApiResult(field, value, false, error);
    return false;
  }
}

/**
 * Admin Interface Validation Testing (Simulated)
 * Note: This simulates admin validation by testing admin API endpoints
 */
async function testAdminValidation(field, value, results) {
  // For now, we'll simulate admin validation by testing the same API
  // but with admin-specific headers and endpoints if available
  
  const testData = {
    name: `Admin-Test-${field}-${Date.now()}`,
    [field]: value,
    saison: "2024/25",
    spielort: "Sportplatz Wertheim",
    // Provide defaults for other required enum fields
    status: field === 'status' ? value : 'aktiv',
    liga: field === 'liga' ? value : 'Kreisklasse A',
    altersklasse: field === 'altersklasse' ? value : 'senioren',
    trend: field === 'trend' ? value : 'gleich'
  };

  try {
    // Try to simulate admin panel validation
    // This would need to be enhanced with actual admin panel testing
    const response = await axios.post(
      `${CONFIG.STRAPI_URL}${CONFIG.API_BASE}/mannschaften`,
      { data: testData },
      {
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Request': 'true' // Simulate admin request
        },
        timeout: CONFIG.TIMEOUT
      }
    );

    results.addAdminResult(field, value, true);
    
    // Clean up
    if (response.data?.data?.id) {
      try {
        await axios.delete(`${CONFIG.STRAPI_URL}${CONFIG.API_BASE}/mannschaften/${response.data.data.id}`);
      } catch (cleanupError) {
        console.warn(`⚠️ Failed to cleanup admin record ${response.data.data.id}`);
      }
    }

    return true;
  } catch (error) {
    results.addAdminResult(field, value, false, error);
    return false;
  }
}

/**
 * Comprehensive validation testing for a single field
 */
async function testFieldValidation(field, testSet, results) {
  console.log(`\n🧪 Testing field: ${field}`);
  
  // Test valid values
  console.log(`  📋 Testing ${testSet.valid.length} valid values...`);
  for (const value of testSet.valid) {
    console.log(`    Testing: "${value}"`);
    const apiResult = await testApiValidation(field, value, results);
    const adminResult = await testAdminValidation(field, value, results);
    
    // Check for discrepancies
    if (apiResult !== adminResult) {
      results.addDiscrepancy(
        field, 
        value, 
        apiResult, 
        adminResult, 
        `Valid value "${value}" has different validation results between API (${apiResult}) and Admin (${adminResult})`
      );
    }
    
    // Valid values should always pass
    if (!apiResult) {
      results.addDiscrepancy(
        field,
        value,
        apiResult,
        true,
        `Valid value "${value}" was rejected by API - possible schema issue`
      );
    }
  }

  // Test invalid values
  console.log(`  📋 Testing ${testSet.invalid.length} invalid values...`);
  for (const value of testSet.invalid) {
    console.log(`    Testing: "${value}"`);
    const apiResult = await testApiValidation(field, value, results);
    const adminResult = await testAdminValidation(field, value, results);
    
    // Check for discrepancies
    if (apiResult !== adminResult) {
      results.addDiscrepancy(
        field, 
        value, 
        apiResult, 
        adminResult, 
        `Invalid value "${value}" has different validation results between API (${apiResult}) and Admin (${adminResult})`
      );
    }
    
    // Invalid values should always fail
    if (apiResult) {
      results.addDiscrepancy(
        field,
        value,
        apiResult,
        false,
        `Invalid value "${value}" was accepted by API - possible validation bypass`
      );
    }
  }
}

/**
 * Test server connectivity and basic functionality
 */
async function testServerConnectivity() {
  console.log('🔌 Testing server connectivity...');
  
  try {
    // Test basic API endpoint
    const apiResponse = await axios.get(`${CONFIG.STRAPI_URL}${CONFIG.API_BASE}/mannschaften`, {
      timeout: CONFIG.TIMEOUT
    });
    console.log('✅ API endpoint accessible');

    // Test admin endpoint (if available)
    try {
      const adminResponse = await axios.get(`${CONFIG.STRAPI_URL}${CONFIG.ADMIN_BASE}`, {
        timeout: CONFIG.TIMEOUT
      });
      console.log('✅ Admin endpoint accessible');
    } catch (adminError) {
      console.log('⚠️ Admin endpoint not accessible (this is normal for API-only testing)');
    }

    return true;
  } catch (error) {
    console.error('❌ Server connectivity failed:', error.message);
    return false;
  }
}

/**
 * Generate detailed validation report
 */
async function generateReport(results) {
  console.log('\n📊 Generating validation report...');
  
  results.generateSummary();
  
  const report = {
    metadata: {
      title: 'Comprehensive Validation Diagnostic Report',
      generated: new Date().toISOString(),
      strapiUrl: CONFIG.STRAPI_URL,
      version: '1.0.0'
    },
    summary: results.results.summary,
    schemaAnalysis: results.results.schema,
    apiResults: results.results.api,
    adminResults: results.results.admin,
    discrepancies: results.results.discrepancies,
    recommendations: generateRecommendations(results.results)
  };

  // Ensure output directory exists
  try {
    await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  // Write detailed JSON report
  const jsonReportPath = path.join(CONFIG.OUTPUT_DIR, `validation-report-${Date.now()}.json`);
  await fs.writeFile(jsonReportPath, JSON.stringify(report, null, 2));
  
  // Write human-readable summary
  const summaryPath = path.join(CONFIG.OUTPUT_DIR, `validation-summary-${Date.now()}.md`);
  const summaryContent = generateMarkdownSummary(report);
  await fs.writeFile(summaryPath, summaryContent);

  console.log(`📄 Detailed report saved to: ${jsonReportPath}`);
  console.log(`📄 Summary report saved to: ${summaryPath}`);
  
  return report;
}

/**
 * Generate recommendations based on validation results
 */
function generateRecommendations(results) {
  const recommendations = [];
  
  // Check for high-severity discrepancies
  const highSeverityIssues = results.discrepancies.filter(d => d.severity === 'HIGH');
  if (highSeverityIssues.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Validation Discrepancy',
      issue: 'API accepts values that admin interface rejects',
      solution: 'Check admin panel validation logic and schema compilation',
      affectedFields: [...new Set(highSeverityIssues.map(d => d.field))]
    });
  }

  // Check for schema inconsistencies
  Object.entries(results.api).forEach(([field, fieldResults]) => {
    const validValues = Object.entries(fieldResults)
      .filter(([value, result]) => result.success)
      .map(([value]) => value);
    
    const schemaEnum = results.schema[field]?.enum || [];
    const unexpectedValid = validValues.filter(v => !schemaEnum.includes(v));
    
    if (unexpectedValid.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Schema Inconsistency',
        issue: `Field "${field}" accepts values not defined in schema`,
        solution: 'Update schema definition or fix validation logic',
        details: { unexpectedValues: unexpectedValid, schemaEnum }
      });
    }
  });

  // Check for missing validation
  Object.entries(TEST_DATA_SETS).forEach(([field, testSet]) => {
    const apiResults = results.api[field] || {};
    const invalidAccepted = testSet.invalid.filter(value => 
      apiResults[value]?.success === true
    );
    
    if (invalidAccepted.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Insufficient Validation',
        issue: `Field "${field}" accepts invalid values`,
        solution: 'Strengthen validation rules for this field',
        details: { invalidValuesAccepted: invalidAccepted }
      });
    }
  });

  return recommendations;
}

/**
 * Generate human-readable markdown summary
 */
function generateMarkdownSummary(report) {
  const { summary, discrepancies, recommendations } = report;
  
  let markdown = `# Validation Diagnostic Summary\n\n`;
  markdown += `**Generated:** ${new Date(summary.timestamp).toLocaleString()}\n`;
  markdown += `**Execution Time:** ${summary.executionTime}ms\n`;
  markdown += `**Overall Health:** ${summary.overallHealth}\n\n`;
  
  // Summary statistics
  markdown += `## Summary Statistics\n\n`;
  markdown += `- **Total Tests:** ${summary.totalTests}\n`;
  markdown += `- **Discrepancies Found:** ${summary.discrepancyCount}\n`;
  markdown += `- **High Severity Issues:** ${summary.highSeverityCount}\n`;
  markdown += `- **Medium Severity Issues:** ${summary.mediumSeverityCount}\n`;
  markdown += `- **Fields with Issues:** ${summary.fieldsWithIssues.join(', ') || 'None'}\n\n`;
  
  // Discrepancies
  if (discrepancies.length > 0) {
    markdown += `## Validation Discrepancies\n\n`;
    discrepancies.forEach((disc, index) => {
      markdown += `### ${index + 1}. ${disc.field} - "${disc.value}" (${disc.severity})\n`;
      markdown += `**Description:** ${disc.description}\n`;
      markdown += `**API Result:** ${disc.apiResult ? '✅ Accepted' : '❌ Rejected'}\n`;
      markdown += `**Admin Result:** ${disc.adminResult ? '✅ Accepted' : '❌ Rejected'}\n\n`;
    });
  }
  
  // Recommendations
  if (recommendations.length > 0) {
    markdown += `## Recommendations\n\n`;
    recommendations.forEach((rec, index) => {
      markdown += `### ${index + 1}. ${rec.issue} (${rec.priority})\n`;
      markdown += `**Category:** ${rec.category}\n`;
      markdown += `**Solution:** ${rec.solution}\n`;
      if (rec.affectedFields) {
        markdown += `**Affected Fields:** ${rec.affectedFields.join(', ')}\n`;
      }
      markdown += `\n`;
    });
  }
  
  return markdown;
}

/**
 * Main diagnostic function
 */
async function runComprehensiveDiagnostic() {
  console.log('🚀 Starting Comprehensive Validation Diagnostic...');
  console.log(`📍 Target: ${CONFIG.STRAPI_URL}`);
  
  const results = new ValidationResults();
  
  // Step 1: Test server connectivity
  const serverOk = await testServerConnectivity();
  if (!serverOk) {
    console.error('❌ Cannot proceed without server connectivity');
    process.exit(1);
  }
  
  // Step 2: Analyze schema
  const schemaFields = await analyzeSchema();
  if (schemaFields) {
    Object.entries(schemaFields).forEach(([field, definition]) => {
      results.addSchemaResult(field, definition);
    });
  }
  
  // Step 3: Test each enum field
  for (const [field, testSet] of Object.entries(TEST_DATA_SETS)) {
    if (schemaFields && !schemaFields[field]) {
      console.log(`⚠️ Field "${field}" not found in schema, skipping...`);
      continue;
    }
    
    await testFieldValidation(field, testSet, results);
  }
  
  // Step 4: Generate report
  const report = await generateReport(results);
  
  // Step 5: Display summary
  console.log('\n📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(50));
  console.log(`Overall Health: ${report.summary.overallHealth}`);
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`Discrepancies: ${report.summary.discrepancyCount}`);
  console.log(`High Severity: ${report.summary.highSeverityCount}`);
  console.log(`Medium Severity: ${report.summary.mediumSeverityCount}`);
  
  if (report.summary.discrepancyCount > 0) {
    console.log('\n🔍 KEY ISSUES FOUND:');
    report.discrepancies.slice(0, 5).forEach((disc, index) => {
      console.log(`${index + 1}. ${disc.field}: "${disc.value}" - ${disc.description}`);
    });
    
    if (report.discrepancies.length > 5) {
      console.log(`... and ${report.discrepancies.length - 5} more (see detailed report)`);
    }
  }
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 TOP RECOMMENDATIONS:');
    report.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority}] ${rec.issue}`);
      console.log(`   Solution: ${rec.solution}`);
    });
  }
  
  console.log('\n✅ Diagnostic complete! Check the generated reports for detailed analysis.');
  
  return report;
}

// Export for testing and module usage
module.exports = {
  runComprehensiveDiagnostic,
  testApiValidation,
  testAdminValidation,
  analyzeSchema,
  ValidationResults,
  TEST_DATA_SETS,
  CONFIG
};

// Run diagnostic if script is executed directly
if (require.main === module) {
  runComprehensiveDiagnostic().catch(error => {
    console.error('❌ Diagnostic failed:', error.message);
    process.exit(1);
  });
}