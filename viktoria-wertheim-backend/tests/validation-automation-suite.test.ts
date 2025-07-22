/**
 * Validation Test Automation Suite
 * 
 * Comprehensive automated test suite for all content type validations with continuous
 * enum field testing and validation health report generation for system monitoring.
 * 
 * Requirements: 3.1, 3.2, 3.3, 5.2
 */

import axios, { AxiosResponse } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

// Test configuration
const TEST_CONFIG = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@viktoria-wertheim.de',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  TIMEOUT: 15000,
  TEST_CLEANUP: true,
  REPORT_DIR: './validation-reports',
  CONTINUOUS_TEST_INTERVAL: 5000, // 5 seconds for testing
  MAX_CONTINUOUS_ITERATIONS: 3 // Limit for test environment
};

// Content type definitions with their validation rules
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
      },
      gruendungsjahr: { type: 'integer', min: 1900, max: 2030 },
      tabellenplatz: { type: 'integer', min: 1, max: 20, default: 1 }
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
      tordifferenz: 0
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
      },
      tore_heim: { type: 'integer', min: 0, default: 0 },
      tore_auswaerts: { type: 'integer', min: 0, default: 0 },
      spieltag: { type: 'integer', min: 1 },
      zuschauer: { type: 'integer', min: 0 }
    },
    baseData: {
      spielort: 'Sportplatz Wertheim',
      liga: 'Kreisklasse B',
      saison: '2024/25'
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
      },
      rueckennummer: { type: 'integer', min: 1, max: 99 },
      tore_saison: { type: 'integer', min: 0, default: 0 },
      spiele_saison: { type: 'integer', min: 0, default: 0 },
      gelbe_karten: { type: 'integer', min: 0, default: 0 },
      rote_karten: { type: 'integer', min: 0, default: 0 }
    },
    baseData: {
      vorname: 'Test',
      nachname: 'Spieler',
      einsatzminuten: 0,
      assists: 0,
      kapitaen: false,
      vizekapitaen: false
    }
  }
};

interface ValidationResult {
  success: boolean;
  statusCode: number;
  data?: any;
  error?: string;
  validationDetails?: any;
  timestamp: string;
}

interface EnumTestResult {
  contentType: string;
  field: string;
  value: any;
  expected: 'valid' | 'invalid';
  adminResult: ValidationResult;
  apiResult: ValidationResult;
  consistent: boolean;
  passed: boolean;
}

interface ValidationHealthReport {
  metadata: {
    title: string;
    generated: string;
    testDuration: number;
    continuousIterations?: number;
  };
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    consistencyRate: number;
    criticalIssues: number;
    enumFieldsHealthy: number;
    enumFieldsTotal: number;
  };
  contentTypeResults: {
    [contentType: string]: {
      totalTests: number;
      passedTests: number;
      enumFieldResults: {
        [field: string]: {
          validValuesTests: number;
          invalidValuesTests: number;
          passedTests: number;
          failedTests: number;
          consistencyIssues: number;
        };
      };
      criticalIssues: string[];
    };
  };
  enumTestResults: EnumTestResult[];
  recommendations: string[];
  trends?: {
    iteration: number;
    timestamp: string;
    successRate: number;
    consistencyRate: number;
  }[];
}

describe('Validation Test Automation Suite', () => {
  let authToken: string;
  let createdRecords: { [contentType: string]: { admin: number[], api: number[] } } = {};
  let testStartTime: number;
  let continuousTestResults: ValidationHealthReport[] = [];

  beforeAll(async () => {
    testStartTime = Date.now();
    
    // Initialize created records tracking
    Object.keys(CONTENT_TYPES).forEach(contentType => {
      createdRecords[contentType] = { admin: [], api: [] };
    });

    // Authenticate with admin
    const authResponse = await axios.post(`${TEST_CONFIG.STRAPI_URL}/admin/auth/local`, {
      email: TEST_CONFIG.ADMIN_EMAIL,
      password: TEST_CONFIG.ADMIN_PASSWORD
    });

    authToken = authResponse.data.data.token;
    expect(authToken).toBeDefined();

    // Ensure report directory exists
    await fs.mkdir(TEST_CONFIG.REPORT_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup test records
    if (TEST_CONFIG.TEST_CLEANUP) {
      await cleanupAllTestRecords();
    }

    // Generate final comprehensive report
    await generateComprehensiveHealthReport();
  });

  /**
   * Helper function to create record via admin API
   */
  const createViaAdmin = async (contentType: string, data: any): Promise<ValidationResult> => {
    const config = CONTENT_TYPES[contentType];
    const testData = {
      ...config.baseData,
      ...data,
      name: data.name ? `${data.name}-Admin-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` : undefined
    };

    try {
      const response = await axios.post(
        `${TEST_CONFIG.STRAPI_URL}/admin/content-manager/collection-types/${config.adminEndpoint}`,
        testData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: TEST_CONFIG.TIMEOUT
        }
      );

      if (response.data?.id) {
        createdRecords[contentType].admin.push(response.data.id);
      }

      return {
        success: true,
        statusCode: response.status,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        validationDetails: error.response?.data?.error?.details || null,
        timestamp: new Date().toISOString()
      };
    }
  };

  /**
   * Helper function to create record via public API
   */
  const createViaAPI = async (contentType: string, data: any): Promise<ValidationResult> => {
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
        `${TEST_CONFIG.STRAPI_URL}/api/${config.endpoint}`,
        testData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: TEST_CONFIG.TIMEOUT
        }
      );

      if (response.data?.data?.id) {
        createdRecords[contentType].api.push(response.data.data.id);
      }

      return {
        success: true,
        statusCode: response.status,
        data: response.data,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        validationDetails: error.response?.data?.error?.details || null,
        timestamp: new Date().toISOString()
      };
    }
  };

  /**
   * Test enum field validation
   */
  const testEnumField = async (
    contentType: string, 
    fieldName: string, 
    value: any, 
    expected: 'valid' | 'invalid'
  ): Promise<EnumTestResult> => {
    const testData = { [fieldName]: value };
    
    // Add required fields for the content type
    const config = CONTENT_TYPES[contentType];
    Object.entries(config.schema).forEach(([field, fieldConfig]: [string, any]) => {
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

    const adminResult = await createViaAdmin(contentType, testData);
    const apiResult = await createViaAPI(contentType, testData);

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
  };

  /**
   * Run comprehensive enum validation tests for all content types
   */
  const runEnumValidationTests = async (): Promise<EnumTestResult[]> => {
    const results: EnumTestResult[] = [];

    for (const [contentType, config] of Object.entries(CONTENT_TYPES)) {
      for (const [fieldName, fieldConfig] of Object.entries(config.schema)) {
        const typedFieldConfig = fieldConfig as any;
        if (typedFieldConfig.type === 'enumeration') {
          // Test valid enum values
          if (typedFieldConfig.enum) {
            for (const validValue of typedFieldConfig.enum) {
              const result = await testEnumField(contentType, fieldName, validValue, 'valid');
              results.push(result);
            }
          }

          // Test invalid enum values
          if (typedFieldConfig.invalid) {
            for (const invalidValue of typedFieldConfig.invalid) {
              const result = await testEnumField(contentType, fieldName, invalidValue, 'invalid');
              results.push(result);
            }
          }
        }
      }
    }

    return results;
  };

  /**
   * Generate validation health report
   */
  const generateValidationHealthReport = async (
    enumResults: EnumTestResult[],
    iteration?: number
  ): Promise<ValidationHealthReport> => {
    const totalTests = enumResults.length;
    const passedTests = enumResults.filter(r => r.passed).length;
    const consistentTests = enumResults.filter(r => r.consistent).length;
    const criticalIssues = enumResults.filter(r => !r.consistent || (!r.passed && r.expected === 'valid')).length;

    // Group results by content type
    const contentTypeResults: ValidationHealthReport['contentTypeResults'] = {};
    
    for (const contentType of Object.keys(CONTENT_TYPES)) {
      const typeResults = enumResults.filter(r => r.contentType === contentType);
      const typePassedTests = typeResults.filter(r => r.passed).length;
      
      const enumFieldResults: any = {};
      
      // Group by field
      const fieldGroups = typeResults.reduce((acc, result) => {
        if (!acc[result.field]) acc[result.field] = [];
        acc[result.field].push(result);
        return acc;
      }, {} as { [field: string]: EnumTestResult[] });

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
    const recommendations: string[] = [];
    
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
        (fieldResult: any) => fieldResult.failedTests === 0 && fieldResult.consistencyIssues === 0
      ).length;
    }, 0);

    const report: ValidationHealthReport = {
      metadata: {
        title: 'Validation Test Automation Health Report',
        generated: new Date().toISOString(),
        testDuration: Date.now() - testStartTime
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
      
      if (!report.trends) report.trends = [];
      report.trends.push({
        iteration,
        timestamp: new Date().toISOString(),
        successRate: report.summary.successRate,
        consistencyRate: report.summary.consistencyRate
      });
    }

    return report;
  };

  /**
   * Cleanup all test records
   */
  const cleanupAllTestRecords = async () => {
    console.log('Cleaning up all test records...');
    
    for (const [contentType, records] of Object.entries(createdRecords)) {
      const config = CONTENT_TYPES[contentType];
      
      // Cleanup admin records
      for (const id of records.admin) {
        try {
          await axios.delete(
            `${TEST_CONFIG.STRAPI_URL}/admin/content-manager/collection-types/${config.adminEndpoint}/${id}`,
            {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (error) {
          console.warn(`Failed to cleanup admin record ${contentType}:${id}`);
        }
      }

      // Cleanup API records
      for (const id of records.api) {
        try {
          await axios.delete(
            `${TEST_CONFIG.STRAPI_URL}/api/${config.endpoint}/${id}`,
            {
              headers: { 'Content-Type': 'application/json' }
            }
          );
        } catch (error) {
          console.warn(`Failed to cleanup API record ${contentType}:${id}`);
        }
      }
    }
  };

  /**
   * Generate comprehensive health report
   */
  const generateComprehensiveHealthReport = async () => {
    if (continuousTestResults.length === 0) return;

    const latestReport = continuousTestResults[continuousTestResults.length - 1];
    const reportPath = path.join(TEST_CONFIG.REPORT_DIR, `validation-automation-health-${Date.now()}.json`);
    
    // Add trend analysis if multiple iterations
    if (continuousTestResults.length > 1) {
      latestReport.trends = continuousTestResults.map((report, index) => ({
        iteration: index + 1,
        timestamp: report.metadata.generated,
        successRate: report.summary.successRate,
        consistencyRate: report.summary.consistencyRate
      }));
    }

    await fs.writeFile(reportPath, JSON.stringify(latestReport, null, 2));

    console.log(`\n📊 VALIDATION AUTOMATION HEALTH REPORT`);
    console.log('='.repeat(50));
    console.log(`Total Tests: ${latestReport.summary.totalTests}`);
    console.log(`Success Rate: ${latestReport.summary.successRate.toFixed(2)}%`);
    console.log(`Consistency Rate: ${latestReport.summary.consistencyRate.toFixed(2)}%`);
    console.log(`Critical Issues: ${latestReport.summary.criticalIssues}`);
    console.log(`Healthy Enum Fields: ${latestReport.summary.enumFieldsHealthy}/${latestReport.summary.enumFieldsTotal}`);
    console.log(`Report saved: ${reportPath}`);
    
    if (latestReport.recommendations.length > 0) {
      console.log('\n🔧 RECOMMENDATIONS:');
      latestReport.recommendations.forEach(rec => console.log(`- ${rec}`));
    }
  };

  describe('Comprehensive Content Type Validation', () => {
    test('should validate all enum fields across all content types', async () => {
      const enumResults = await runEnumValidationTests();
      const report = await generateValidationHealthReport(enumResults);
      
      continuousTestResults.push(report);

      // Assertions
      expect(enumResults.length).toBeGreaterThan(0);
      expect(report.summary.successRate).toBeGreaterThan(80); // At least 80% success rate
      expect(report.summary.consistencyRate).toBeGreaterThan(90); // At least 90% consistency
      expect(report.summary.criticalIssues).toBe(0); // No critical issues allowed

      // Verify each content type has been tested
      for (const contentType of Object.keys(CONTENT_TYPES)) {
        expect(report.contentTypeResults[contentType]).toBeDefined();
        expect(report.contentTypeResults[contentType].totalTests).toBeGreaterThan(0);
      }
    });

    test('should have consistent validation behavior between admin and API', async () => {
      const enumResults = await runEnumValidationTests();
      const inconsistentResults = enumResults.filter(r => !r.consistent);

      if (inconsistentResults.length > 0) {
        console.warn('Validation inconsistencies detected:');
        inconsistentResults.forEach(result => {
          console.warn(`- ${result.contentType}.${result.field}: ${result.value} (expected: ${result.expected})`);
          console.warn(`  Admin: ${result.adminResult.success}, API: ${result.apiResult.success}`);
        });
      }

      expect(inconsistentResults.length).toBe(0);
    });

    test('should properly reject invalid enum values', async () => {
      const enumResults = await runEnumValidationTests();
      const invalidValueTests = enumResults.filter(r => r.expected === 'invalid');
      const failedInvalidTests = invalidValueTests.filter(r => !r.passed);

      if (failedInvalidTests.length > 0) {
        console.warn('Invalid values incorrectly accepted:');
        failedInvalidTests.forEach(result => {
          console.warn(`- ${result.contentType}.${result.field}: ${result.value}`);
          console.warn(`  Admin accepted: ${result.adminResult.success}, API accepted: ${result.apiResult.success}`);
        });
      }

      expect(failedInvalidTests.length).toBe(0);
    });

    test('should properly accept valid enum values', async () => {
      const enumResults = await runEnumValidationTests();
      const validValueTests = enumResults.filter(r => r.expected === 'valid');
      const failedValidTests = validValueTests.filter(r => !r.passed);

      if (failedValidTests.length > 0) {
        console.warn('Valid values incorrectly rejected:');
        failedValidTests.forEach(result => {
          console.warn(`- ${result.contentType}.${result.field}: ${result.value}`);
          console.warn(`  Admin rejected: ${!result.adminResult.success}, API rejected: ${!result.apiResult.success}`);
        });
      }

      expect(failedValidTests.length).toBe(0);
    });
  });

  describe('Continuous Validation Monitoring', () => {
    test('should run continuous validation tests and track trends', async () => {
      console.log(`Running ${TEST_CONFIG.MAX_CONTINUOUS_ITERATIONS} continuous validation iterations...`);

      for (let iteration = 1; iteration <= TEST_CONFIG.MAX_CONTINUOUS_ITERATIONS; iteration++) {
        console.log(`Continuous test iteration ${iteration}/${TEST_CONFIG.MAX_CONTINUOUS_ITERATIONS}`);
        
        const enumResults = await runEnumValidationTests();
        const report = await generateValidationHealthReport(enumResults, iteration);
        
        continuousTestResults.push(report);

        // Wait between iterations (except for the last one)
        if (iteration < TEST_CONFIG.MAX_CONTINUOUS_ITERATIONS) {
          await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.CONTINUOUS_TEST_INTERVAL));
        }
      }

      // Analyze trends
      expect(continuousTestResults.length).toBe(TEST_CONFIG.MAX_CONTINUOUS_ITERATIONS);
      
      // Check for stability (success rate shouldn't vary too much)
      const successRates = continuousTestResults.map(r => r.summary.successRate);
      const avgSuccessRate = successRates.reduce((a, b) => a + b, 0) / successRates.length;
      const maxDeviation = Math.max(...successRates.map(rate => Math.abs(rate - avgSuccessRate)));
      
      expect(maxDeviation).toBeLessThan(10); // Success rate should be stable within 10%
      expect(avgSuccessRate).toBeGreaterThan(80); // Average success rate should be > 80%
    });

    test('should detect validation degradation over time', async () => {
      if (continuousTestResults.length < 2) {
        console.log('Skipping degradation test - insufficient continuous test data');
        return;
      }

      const firstResult = continuousTestResults[0];
      const lastResult = continuousTestResults[continuousTestResults.length - 1];

      const successRateDelta = lastResult.summary.successRate - firstResult.summary.successRate;
      const consistencyRateDelta = lastResult.summary.consistencyRate - firstResult.summary.consistencyRate;

      // Success rate shouldn't degrade significantly
      expect(successRateDelta).toBeGreaterThan(-5); // Allow max 5% degradation
      
      // Consistency rate should remain stable
      expect(consistencyRateDelta).toBeGreaterThan(-2); // Allow max 2% degradation

      console.log(`Validation trend analysis:`);
      console.log(`Success rate change: ${successRateDelta.toFixed(2)}%`);
      console.log(`Consistency rate change: ${consistencyRateDelta.toFixed(2)}%`);
    });
  });

  describe('Validation Health Monitoring', () => {
    test('should generate comprehensive health reports', async () => {
      const enumResults = await runEnumValidationTests();
      const report = await generateValidationHealthReport(enumResults);

      // Verify report structure
      expect(report.metadata).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.contentTypeResults).toBeDefined();
      expect(report.enumTestResults).toBeDefined();
      expect(report.recommendations).toBeDefined();

      // Verify all content types are covered
      for (const contentType of Object.keys(CONTENT_TYPES)) {
        expect(report.contentTypeResults[contentType]).toBeDefined();
        expect(report.contentTypeResults[contentType].enumFieldResults).toBeDefined();
      }

      // Save report for monitoring
      const reportPath = path.join(TEST_CONFIG.REPORT_DIR, `health-report-${Date.now()}.json`);
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

      expect(report.summary.totalTests).toBeGreaterThan(0);
      expect(report.summary.enumFieldsTotal).toBeGreaterThan(0);
    });

    test('should provide actionable recommendations', async () => {
      const enumResults = await runEnumValidationTests();
      const report = await generateValidationHealthReport(enumResults);

      expect(Array.isArray(report.recommendations)).toBe(true);

      // If there are critical issues, recommendations should be provided
      if (report.summary.criticalIssues > 0) {
        expect(report.recommendations.length).toBeGreaterThan(0);
        expect(report.recommendations.some(rec => rec.includes('Critical'))).toBe(true);
      }

      // If success rate is low, recommendations should address it
      if (report.summary.successRate < 90) {
        expect(report.recommendations.some(rec => 
          rec.includes('failure rate') || rec.includes('enum definitions')
        )).toBe(true);
      }
    });

    test('should track enum field health individually', async () => {
      const enumResults = await runEnumValidationTests();
      const report = await generateValidationHealthReport(enumResults);

      for (const [contentType, typeResult] of Object.entries(report.contentTypeResults)) {
        for (const [field, fieldResult] of Object.entries(typeResult.enumFieldResults)) {
          expect(fieldResult.validValuesTests).toBeGreaterThanOrEqual(0);
          expect(fieldResult.invalidValuesTests).toBeGreaterThanOrEqual(0);
          expect(fieldResult.passedTests).toBeGreaterThanOrEqual(0);
          expect(fieldResult.failedTests).toBeGreaterThanOrEqual(0);
          expect(fieldResult.consistencyIssues).toBeGreaterThanOrEqual(0);

          // Total tests should equal passed + failed
          expect(fieldResult.passedTests + fieldResult.failedTests)
            .toBe(fieldResult.validValuesTests + fieldResult.invalidValuesTests);
        }
      }

      expect(report.summary.enumFieldsHealthy).toBeLessThanOrEqual(report.summary.enumFieldsTotal);
    });
  });

  describe('System Monitoring Integration', () => {
    test('should generate monitoring-friendly metrics', async () => {
      const enumResults = await runEnumValidationTests();
      const report = await generateValidationHealthReport(enumResults);

      // Generate metrics in a format suitable for monitoring systems
      const metrics = {
        'validation.success_rate': report.summary.successRate,
        'validation.consistency_rate': report.summary.consistencyRate,
        'validation.critical_issues': report.summary.criticalIssues,
        'validation.enum_fields_healthy': report.summary.enumFieldsHealthy,
        'validation.enum_fields_total': report.summary.enumFieldsTotal,
        'validation.total_tests': report.summary.totalTests,
        'validation.failed_tests': report.summary.failedTests
      };

      // Add per-content-type metrics
      for (const [contentType, typeResult] of Object.entries(report.contentTypeResults)) {
        metrics[`validation.${contentType}.success_rate`] = 
          (typeResult.passedTests / typeResult.totalTests) * 100;
        metrics[`validation.${contentType}.critical_issues`] = typeResult.criticalIssues.length;
      }

      // Save metrics for monitoring system consumption
      const metricsPath = path.join(TEST_CONFIG.REPORT_DIR, `validation-metrics-${Date.now()}.json`);
      await fs.writeFile(metricsPath, JSON.stringify(metrics, null, 2));

      // Verify metrics are within expected ranges
      expect(metrics['validation.success_rate']).toBeGreaterThanOrEqual(0);
      expect(metrics['validation.success_rate']).toBeLessThanOrEqual(100);
      expect(metrics['validation.consistency_rate']).toBeGreaterThanOrEqual(0);
      expect(metrics['validation.consistency_rate']).toBeLessThanOrEqual(100);
      expect(metrics['validation.critical_issues']).toBeGreaterThanOrEqual(0);
    });

    test('should provide alerting thresholds', async () => {
      const enumResults = await runEnumValidationTests();
      const report = await generateValidationHealthReport(enumResults);

      // Define alerting thresholds
      const thresholds = {
        success_rate_critical: 70,
        success_rate_warning: 85,
        consistency_rate_critical: 90,
        consistency_rate_warning: 95,
        critical_issues_warning: 1,
        critical_issues_critical: 5
      };

      // Check against thresholds
      const alerts = [];
      
      if (report.summary.successRate < thresholds.success_rate_critical) {
        alerts.push({ level: 'CRITICAL', message: 'Validation success rate critically low' });
      } else if (report.summary.successRate < thresholds.success_rate_warning) {
        alerts.push({ level: 'WARNING', message: 'Validation success rate below warning threshold' });
      }

      if (report.summary.consistencyRate < thresholds.consistency_rate_critical) {
        alerts.push({ level: 'CRITICAL', message: 'Validation consistency critically low' });
      } else if (report.summary.consistencyRate < thresholds.consistency_rate_warning) {
        alerts.push({ level: 'WARNING', message: 'Validation consistency below warning threshold' });
      }

      if (report.summary.criticalIssues >= thresholds.critical_issues_critical) {
        alerts.push({ level: 'CRITICAL', message: 'Too many critical validation issues' });
      } else if (report.summary.criticalIssues >= thresholds.critical_issues_warning) {
        alerts.push({ level: 'WARNING', message: 'Critical validation issues detected' });
      }

      // Save alerts for monitoring system
      if (alerts.length > 0) {
        const alertsPath = path.join(TEST_CONFIG.REPORT_DIR, `validation-alerts-${Date.now()}.json`);
        await fs.writeFile(alertsPath, JSON.stringify({ alerts, thresholds, report: report.summary }, null, 2));
        
        console.warn(`⚠️  Validation alerts generated: ${alerts.length}`);
        alerts.forEach(alert => console.warn(`${alert.level}: ${alert.message}`));
      }

      // For testing purposes, we expect no critical alerts in a healthy system
      const criticalAlerts = alerts.filter(a => a.level === 'CRITICAL');
      expect(criticalAlerts.length).toBe(0);
    });
  });
});