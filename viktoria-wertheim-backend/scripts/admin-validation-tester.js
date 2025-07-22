/**
 * Admin Interface Validation Tester
 * 
 * This script specifically tests validation behavior through the Strapi admin interface
 * by simulating admin panel requests and comparing them with direct API calls.
 */

const axios = require('axios');
const fs = require('fs').promises;

// Configuration
const CONFIG = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@viktoria-wertheim.de',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  TIMEOUT: 15000
};

class AdminValidationTester {
  constructor() {
    this.authToken = null;
    this.results = {
      authentication: null,
      adminValidation: {},
      apiValidation: {},
      comparisons: []
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

      this.authToken = response.data.data.token;
      this.results.authentication = {
        success: true,
        user: response.data.data.user.email,
        timestamp: new Date()
      };
      
      console.log('✅ Admin authentication successful');
      return true;
    } catch (error) {
      console.error('❌ Admin authentication failed:', error.message);
      this.results.authentication = {
        success: false,
        error: error.message,
        timestamp: new Date()
      };
      return false;
    }
  }

  /**
   * Get admin headers for authenticated requests
   */
  getAdminHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Test validation through admin content manager
   */
  async testAdminContentManager(field, value) {
    if (!this.authToken) {
      throw new Error('Not authenticated with admin');
    }

    const testData = {
      name: `Admin-Test-${field}-${Date.now()}`,
      [field]: value,
      saison: "2024/25",
      spielort: "Sportplatz Wertheim",
      altersklasse: "senioren"
    };

    try {
      // Use admin content manager endpoint
      const response = await axios.post(
        `${CONFIG.STRAPI_URL}/admin/content-manager/collection-types/api::mannschaft.mannschaft`,
        testData,
        {
          headers: this.getAdminHeaders(),
          timeout: CONFIG.TIMEOUT
        }
      );

      // Clean up created record
      if (response.data?.id) {
        try {
          await axios.delete(
            `${CONFIG.STRAPI_URL}/admin/content-manager/collection-types/api::mannschaft.mannschaft/${response.data.id}`,
            { headers: this.getAdminHeaders() }
          );
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup admin record ${response.data.id}`);
        }
      }

      return {
        success: true,
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status || 500,
        validationDetails: error.response?.data?.error?.details || null,
        fullError: error.response?.data || null
      };
    }
  }

  /**
   * Test validation through public API
   */
  async testPublicApi(field, value) {
    const testData = {
      data: {
        name: `API-Test-${field}-${Date.now()}`,
        [field]: value,
        saison: "2024/25",
        spielort: "Sportplatz Wertheim",
        altersklasse: "senioren"
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

      // Clean up created record
      if (response.data?.data?.id) {
        try {
          await axios.delete(`${CONFIG.STRAPI_URL}/api/mannschaften/${response.data.data.id}`);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup API record ${response.data.data.id}`);
        }
      }

      return {
        success: true,
        data: response.data,
        statusCode: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status || 500,
        validationDetails: error.response?.data?.error?.details || null,
        fullError: error.response?.data || null
      };
    }
  }

  /**
   * Compare admin vs API validation for a specific field and value
   */
  async compareValidation(field, value) {
    console.log(`🔍 Testing ${field}: "${value}"`);

    const adminResult = await this.testAdminContentManager(field, value);
    const apiResult = await this.testPublicApi(field, value);

    const comparison = {
      field,
      value,
      admin: adminResult,
      api: apiResult,
      consistent: adminResult.success === apiResult.success,
      discrepancy: null,
      timestamp: new Date()
    };

    if (!comparison.consistent) {
      comparison.discrepancy = {
        type: adminResult.success ? 'API_REJECTS_ADMIN_ACCEPTS' : 'ADMIN_REJECTS_API_ACCEPTS',
        severity: adminResult.success ? 'MEDIUM' : 'HIGH',
        description: adminResult.success 
          ? `Admin accepts "${value}" but API rejects it`
          : `API accepts "${value}" but Admin rejects it`
      };
    }

    this.results.comparisons.push(comparison);
    
    // Log result
    if (comparison.consistent) {
      console.log(`  ✅ Consistent: Both ${adminResult.success ? 'accept' : 'reject'}`);
    } else {
      console.log(`  ❌ Inconsistent: Admin ${adminResult.success ? 'accepts' : 'rejects'}, API ${apiResult.success ? 'accepts' : 'rejects'}`);
      if (adminResult.validationDetails) {
        console.log(`     Admin error: ${JSON.stringify(adminResult.validationDetails, null, 2)}`);
      }
      if (apiResult.validationDetails) {
        console.log(`     API error: ${JSON.stringify(apiResult.validationDetails, null, 2)}`);
      }
    }

    return comparison;
  }

  /**
   * Test all enum values for a specific field
   */
  async testFieldValues(field, validValues, invalidValues) {
    console.log(`\n🧪 Testing field: ${field}`);
    
    // Test valid values
    console.log(`  📋 Testing ${validValues.length} valid values...`);
    for (const value of validValues) {
      await this.compareValidation(field, value);
    }

    // Test invalid values
    console.log(`  📋 Testing ${invalidValues.length} invalid values...`);
    for (const value of invalidValues) {
      await this.compareValidation(field, value);
    }
  }

  /**
   * Run comprehensive admin validation test
   */
  async runComprehensiveTest() {
    console.log('🚀 Starting Admin Validation Test...');

    // Step 1: Authenticate
    const authSuccess = await this.authenticate();
    if (!authSuccess) {
      console.error('❌ Cannot proceed without admin authentication');
      return this.results;
    }

    // Step 2: Test enum fields
    const enumTests = {
      status: {
        valid: ['aktiv', 'inaktiv', 'aufgeloest'],
        invalid: ['active', 'inactive', 'dissolved', '', null]
      },
      liga: {
        valid: ['Kreisklasse B', 'Kreisklasse A', 'Kreisliga', 'Landesliga'],
        invalid: ['Kreisklasse C', 'Bezirksliga', '', null]
      },
      altersklasse: {
        valid: ['senioren', 'a-jugend', 'b-jugend', 'c-jugend'],
        invalid: ['senior', 'herren', '', null]
      },
      trend: {
        valid: ['steigend', 'gleich', 'fallend'],
        invalid: ['aufsteigend', 'stabil', '', null]
      }
    };

    for (const [field, testSet] of Object.entries(enumTests)) {
      await this.testFieldValues(field, testSet.valid, testSet.invalid);
    }

    // Step 3: Analyze results
    this.analyzeResults();

    return this.results;
  }

  /**
   * Analyze test results and generate insights
   */
  analyzeResults() {
    const discrepancies = this.results.comparisons.filter(c => !c.consistent);
    const highSeverity = discrepancies.filter(d => d.discrepancy?.severity === 'HIGH');
    const mediumSeverity = discrepancies.filter(d => d.discrepancy?.severity === 'MEDIUM');

    this.results.analysis = {
      totalTests: this.results.comparisons.length,
      consistentTests: this.results.comparisons.length - discrepancies.length,
      discrepancies: discrepancies.length,
      highSeverityIssues: highSeverity.length,
      mediumSeverityIssues: mediumSeverity.length,
      consistencyRate: ((this.results.comparisons.length - discrepancies.length) / this.results.comparisons.length * 100).toFixed(2),
      fieldsWithIssues: [...new Set(discrepancies.map(d => d.field))],
      mostProblematicField: this.getMostProblematicField(discrepancies)
    };
  }

  /**
   * Identify the field with the most validation issues
   */
  getMostProblematicField(discrepancies) {
    const fieldCounts = {};
    discrepancies.forEach(d => {
      fieldCounts[d.field] = (fieldCounts[d.field] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(fieldCounts));
    const problematicField = Object.keys(fieldCounts).find(field => fieldCounts[field] === maxCount);
    
    return problematicField ? { field: problematicField, issueCount: maxCount } : null;
  }

  /**
   * Generate detailed report
   */
  async generateReport() {
    const report = {
      metadata: {
        title: 'Admin vs API Validation Comparison Report',
        generated: new Date().toISOString(),
        strapiUrl: CONFIG.STRAPI_URL
      },
      authentication: this.results.authentication,
      analysis: this.results.analysis,
      discrepancies: this.results.comparisons.filter(c => !c.consistent),
      allResults: this.results.comparisons
    };

    // Save report
    const reportPath = `./validation-reports/admin-api-comparison-${Date.now()}.json`;
    await fs.mkdir('./validation-reports', { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 ADMIN VALIDATION TEST SUMMARY`);
    console.log('='.repeat(50));
    console.log(`Authentication: ${this.results.authentication?.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Total Tests: ${this.results.analysis?.totalTests || 0}`);
    console.log(`Consistency Rate: ${this.results.analysis?.consistencyRate || 0}%`);
    console.log(`Discrepancies: ${this.results.analysis?.discrepancies || 0}`);
    console.log(`High Severity: ${this.results.analysis?.highSeverityIssues || 0}`);
    console.log(`Medium Severity: ${this.results.analysis?.mediumSeverityIssues || 0}`);

    if (this.results.analysis?.fieldsWithIssues?.length > 0) {
      console.log(`Fields with Issues: ${this.results.analysis.fieldsWithIssues.join(', ')}`);
    }

    if (this.results.analysis?.mostProblematicField) {
      console.log(`Most Problematic Field: ${this.results.analysis.mostProblematicField.field} (${this.results.analysis.mostProblematicField.issueCount} issues)`);
    }

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return report;
  }
}

/**
 * Main execution function
 */
async function runAdminValidationTest() {
  const tester = new AdminValidationTester();
  
  try {
    await tester.runComprehensiveTest();
    await tester.generateReport();
  } catch (error) {
    console.error('❌ Admin validation test failed:', error.message);
    throw error;
  }
}

// Export for module usage
module.exports = {
  AdminValidationTester,
  runAdminValidationTest,
  CONFIG
};

// Run test if script is executed directly
if (require.main === module) {
  runAdminValidationTest().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}