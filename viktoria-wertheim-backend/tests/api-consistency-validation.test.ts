/**
 * API Consistency Validation Test Suite
 * 
 * Tests comparing admin interface behavior with direct API calls to ensure
 * identical validation results between both interfaces for create, update, and delete operations.
 * 
 * Requirements: 1.4, 3.3, 4.3
 */

import axios, { AxiosResponse } from 'axios';

// Test configuration
const TEST_CONFIG = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@viktoria-wertheim.de',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  TIMEOUT: 15000,
  TEST_CLEANUP: true
};

// Test data for consistency validation
const CONSISTENCY_TEST_DATA = {
  validMannschaft: {
    name: 'Consistency-Test-Valid',
    status: 'aktiv',
    liga: 'Kreisklasse B',
    altersklasse: 'senioren',
    trend: 'gleich',
    saison: '2024/25',
    spielort: 'Sportplatz Wertheim',
    gruendungsjahr: 2020,
    tabellenplatz: 1,
    punkte: 0
  },
  invalidMannschaft: {
    name: 'Consistency-Test-Invalid',
    status: 'invalid_status',
    liga: 'invalid_liga',
    altersklasse: 'invalid_altersklasse',
    trend: 'invalid_trend',
    saison: '2024/25',
    spielort: 'Sportplatz Wertheim'
  },
  updateData: {
    status: 'inaktiv',
    liga: 'Kreisklasse A',
    altersklasse: 'a-jugend',
    trend: 'steigend'
  },
  invalidUpdateData: {
    status: 'bad_status',
    liga: 'bad_liga'
  }
};

interface ValidationResult {
  success: boolean;
  statusCode: number;
  data?: any;
  error?: string;
  validationDetails?: any;
}

interface ConsistencyComparison {
  operation: string;
  testCase: string;
  adminResult: ValidationResult;
  apiResult: ValidationResult;
  consistent: boolean;
  discrepancy?: {
    type: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
  };
}

describe('API Consistency Validation Tests', () => {
  let authToken: string;
  let createdRecords: { admin: number[], api: number[] } = { admin: [], api: [] };
  let consistencyResults: ConsistencyComparison[] = [];

  beforeAll(async () => {
    // Authenticate with admin
    const authResponse = await axios.post(`${TEST_CONFIG.STRAPI_URL}/admin/auth/local`, {
      email: TEST_CONFIG.ADMIN_EMAIL,
      password: TEST_CONFIG.ADMIN_PASSWORD
    });

    authToken = authResponse.data.data.token;
    expect(authToken).toBeDefined();
  });

  afterAll(async () => {
    // Cleanup test records
    if (TEST_CONFIG.TEST_CLEANUP) {
      await cleanupTestRecords();
    }

    // Generate consistency report
    await generateConsistencyReport();
  });

  afterEach(() => {
    // Clear created records after each test
    createdRecords = { admin: [], api: [] };
  });

  /**
   * Helper function to create mannschaft via admin API
   */
  const createViaAdmin = async (data: any): Promise<ValidationResult> => {
    const testData = {
      ...data,
      name: `${data.name}-Admin-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    };

    try {
      const response = await axios.post(
        `${TEST_CONFIG.STRAPI_URL}/admin/content-manager/collection-types/api::mannschaft.mannschaft`,
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
        createdRecords.admin.push(response.data.id);
      }

      return {
        success: true,
        statusCode: response.status,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        validationDetails: error.response?.data?.error?.details || null
      };
    }
  };

  /**
   * Helper function to create mannschaft via public API
   */
  const createViaAPI = async (data: any): Promise<ValidationResult> => {
    const testData = {
      data: {
        ...data,
        name: `${data.name}-API-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      }
    };

    try {
      const response = await axios.post(
        `${TEST_CONFIG.STRAPI_URL}/api/mannschaften`,
        testData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: TEST_CONFIG.TIMEOUT
        }
      );

      if (response.data?.data?.id) {
        createdRecords.api.push(response.data.data.id);
      }

      return {
        success: true,
        statusCode: response.status,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        validationDetails: error.response?.data?.error?.details || null
      };
    }
  };

  /**
   * Helper function to update mannschaft via admin API
   */
  const updateViaAdmin = async (id: number, data: any): Promise<ValidationResult> => {
    try {
      const response = await axios.put(
        `${TEST_CONFIG.STRAPI_URL}/admin/content-manager/collection-types/api::mannschaft.mannschaft/${id}`,
        data,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: TEST_CONFIG.TIMEOUT
        }
      );

      return {
        success: true,
        statusCode: response.status,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        validationDetails: error.response?.data?.error?.details || null
      };
    }
  };

  /**
   * Helper function to update mannschaft via public API
   */
  const updateViaAPI = async (id: number, data: any): Promise<ValidationResult> => {
    try {
      const response = await axios.put(
        `${TEST_CONFIG.STRAPI_URL}/api/mannschaften/${id}`,
        { data },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: TEST_CONFIG.TIMEOUT
        }
      );

      return {
        success: true,
        statusCode: response.status,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        validationDetails: error.response?.data?.error?.details || null
      };
    }
  };

  /**
   * Helper function to delete mannschaft via admin API
   */
  const deleteViaAdmin = async (id: number): Promise<ValidationResult> => {
    try {
      const response = await axios.delete(
        `${TEST_CONFIG.STRAPI_URL}/admin/content-manager/collection-types/api::mannschaft.mannschaft/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          timeout: TEST_CONFIG.TIMEOUT
        }
      );

      return {
        success: true,
        statusCode: response.status,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        validationDetails: error.response?.data?.error?.details || null
      };
    }
  };

  /**
   * Helper function to delete mannschaft via public API
   */
  const deleteViaAPI = async (id: number): Promise<ValidationResult> => {
    try {
      const response = await axios.delete(
        `${TEST_CONFIG.STRAPI_URL}/api/mannschaften/${id}`,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: TEST_CONFIG.TIMEOUT
        }
      );

      return {
        success: true,
        statusCode: response.status,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        statusCode: error.response?.status || 500,
        error: error.message,
        validationDetails: error.response?.data?.error?.details || null
      };
    }
  };

  /**
   * Compare validation results between admin and API
   */
  const compareResults = (
    operation: string,
    testCase: string,
    adminResult: ValidationResult,
    apiResult: ValidationResult
  ): ConsistencyComparison => {
    const consistent = adminResult.success === apiResult.success;
    
    let discrepancy = null;
    if (!consistent) {
      const type = adminResult.success ? 'API_REJECTS_ADMIN_ACCEPTS' : 'ADMIN_REJECTS_API_ACCEPTS';
      const severity = adminResult.success ? 'HIGH' : 'CRITICAL';
      
      discrepancy = {
        type,
        severity,
        description: adminResult.success 
          ? `Admin accepts ${testCase} but API rejects it`
          : `API accepts ${testCase} but Admin rejects it`
      };
    }

    const comparison: ConsistencyComparison = {
      operation,
      testCase,
      adminResult,
      apiResult,
      consistent,
      discrepancy
    };

    consistencyResults.push(comparison);
    return comparison;
  };

  /**
   * Cleanup test records
   */
  const cleanupTestRecords = async () => {
    console.log('Cleaning up test records...');
    
    // Cleanup admin records
    for (const id of createdRecords.admin) {
      try {
        await deleteViaAdmin(id);
      } catch (error) {
        console.warn(`Failed to cleanup admin record ${id}`);
      }
    }

    // Cleanup API records
    for (const id of createdRecords.api) {
      try {
        await deleteViaAPI(id);
      } catch (error) {
        console.warn(`Failed to cleanup API record ${id}`);
      }
    }
  };

  /**
   * Generate consistency report
   */
  const generateConsistencyReport = async () => {
    const inconsistencies = consistencyResults.filter(r => !r.consistent);
    const criticalIssues = inconsistencies.filter(r => r.discrepancy?.severity === 'CRITICAL');
    const highIssues = inconsistencies.filter(r => r.discrepancy?.severity === 'HIGH');

    const report = {
      metadata: {
        title: 'API Consistency Validation Report',
        generated: new Date().toISOString(),
        totalTests: consistencyResults.length
      },
      summary: {
        consistentTests: consistencyResults.length - inconsistencies.length,
        inconsistentTests: inconsistencies.length,
        consistencyRate: ((consistencyResults.length - inconsistencies.length) / consistencyResults.length * 100).toFixed(2),
        criticalIssues: criticalIssues.length,
        highIssues: highIssues.length
      },
      inconsistencies,
      allResults: consistencyResults
    };

    // Save report
    const fs = require('fs').promises;
    await fs.mkdir('./validation-reports', { recursive: true });
    const reportPath = `./validation-reports/api-consistency-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📊 API CONSISTENCY REPORT`);
    console.log('='.repeat(40));
    console.log(`Total Tests: ${report.metadata.totalTests}`);
    console.log(`Consistency Rate: ${report.summary.consistencyRate}%`);
    console.log(`Inconsistencies: ${report.summary.inconsistentTests}`);
    console.log(`Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`High Issues: ${report.summary.highIssues}`);
    console.log(`Report saved: ${reportPath}`);
  };

  describe('Create Operation Consistency', () => {
    test('should have consistent validation for valid mannschaft data', async () => {
      const adminResult = await createViaAdmin(CONSISTENCY_TEST_DATA.validMannschaft);
      const apiResult = await createViaAPI(CONSISTENCY_TEST_DATA.validMannschaft);

      const comparison = compareResults('CREATE', 'valid data', adminResult, apiResult);

      expect(comparison.consistent).toBe(true);
      expect(adminResult.success).toBe(true);
      expect(apiResult.success).toBe(true);
      expect(adminResult.statusCode).toBe(200);
      expect(apiResult.statusCode).toBe(200);
    });

    test('should have consistent validation for invalid mannschaft data', async () => {
      const adminResult = await createViaAdmin(CONSISTENCY_TEST_DATA.invalidMannschaft);
      const apiResult = await createViaAPI(CONSISTENCY_TEST_DATA.invalidMannschaft);

      const comparison = compareResults('CREATE', 'invalid data', adminResult, apiResult);

      expect(comparison.consistent).toBe(true);
      expect(adminResult.success).toBe(false);
      expect(apiResult.success).toBe(false);
      expect(adminResult.statusCode).toBeGreaterThanOrEqual(400);
      expect(apiResult.statusCode).toBeGreaterThanOrEqual(400);
    });

    test('should have consistent validation for missing required fields', async () => {
      const incompleteData = {
        name: 'Incomplete-Test',
        // Missing required fields: status, liga, altersklasse
        saison: '2024/25'
      };

      const adminResult = await createViaAdmin(incompleteData);
      const apiResult = await createViaAPI(incompleteData);

      const comparison = compareResults('CREATE', 'missing required fields', adminResult, apiResult);

      expect(comparison.consistent).toBe(true);
      expect(adminResult.success).toBe(false);
      expect(apiResult.success).toBe(false);
    });

    test('should have consistent validation for duplicate names', async () => {
      const uniqueName = `Duplicate-Test-${Date.now()}`;
      const duplicateData = {
        ...CONSISTENCY_TEST_DATA.validMannschaft,
        name: uniqueName
      };

      // Create first record via admin
      const firstAdminResult = await createViaAdmin(duplicateData);
      expect(firstAdminResult.success).toBe(true);

      // Try to create duplicate via admin and API
      const adminDuplicateResult = await createViaAdmin(duplicateData);
      const apiDuplicateResult = await createViaAPI(duplicateData);

      const comparison = compareResults('CREATE', 'duplicate name', adminDuplicateResult, apiDuplicateResult);

      expect(comparison.consistent).toBe(true);
      expect(adminDuplicateResult.success).toBe(false);
      expect(apiDuplicateResult.success).toBe(false);
    });
  });

  describe('Update Operation Consistency', () => {
    let testRecordAdmin: number;
    let testRecordAPI: number;

    beforeEach(async () => {
      // Create test records for update operations
      const adminCreateResult = await createViaAdmin(CONSISTENCY_TEST_DATA.validMannschaft);
      const apiCreateResult = await createViaAPI(CONSISTENCY_TEST_DATA.validMannschaft);

      expect(adminCreateResult.success).toBe(true);
      expect(apiCreateResult.success).toBe(true);

      testRecordAdmin = adminCreateResult.data.id;
      testRecordAPI = apiCreateResult.data.data.id;
    });

    test('should have consistent validation for valid update data', async () => {
      const adminResult = await updateViaAdmin(testRecordAdmin, CONSISTENCY_TEST_DATA.updateData);
      const apiResult = await updateViaAPI(testRecordAPI, CONSISTENCY_TEST_DATA.updateData);

      const comparison = compareResults('UPDATE', 'valid update data', adminResult, apiResult);

      expect(comparison.consistent).toBe(true);
      expect(adminResult.success).toBe(true);
      expect(apiResult.success).toBe(true);
    });

    test('should have consistent validation for invalid update data', async () => {
      const adminResult = await updateViaAdmin(testRecordAdmin, CONSISTENCY_TEST_DATA.invalidUpdateData);
      const apiResult = await updateViaAPI(testRecordAPI, CONSISTENCY_TEST_DATA.invalidUpdateData);

      const comparison = compareResults('UPDATE', 'invalid update data', adminResult, apiResult);

      expect(comparison.consistent).toBe(true);
      expect(adminResult.success).toBe(false);
      expect(apiResult.success).toBe(false);
    });

    test('should have consistent validation for partial updates', async () => {
      const partialUpdate = { status: 'inaktiv' };

      const adminResult = await updateViaAdmin(testRecordAdmin, partialUpdate);
      const apiResult = await updateViaAPI(testRecordAPI, partialUpdate);

      const comparison = compareResults('UPDATE', 'partial update', adminResult, apiResult);

      expect(comparison.consistent).toBe(true);
      expect(adminResult.success).toBe(true);
      expect(apiResult.success).toBe(true);
      expect(adminResult.data.status).toBe('inaktiv');
      expect(apiResult.data.data.attributes.status).toBe('inaktiv');
    });

    test('should have consistent validation for non-existent record updates', async () => {
      const nonExistentId = 999999;
      const updateData = { status: 'aktiv' };

      const adminResult = await updateViaAdmin(nonExistentId, updateData);
      const apiResult = await updateViaAPI(nonExistentId, updateData);

      const comparison = compareResults('UPDATE', 'non-existent record', adminResult, apiResult);

      expect(comparison.consistent).toBe(true);
      expect(adminResult.success).toBe(false);
      expect(apiResult.success).toBe(false);
      expect(adminResult.statusCode).toBe(404);
      expect(apiResult.statusCode).toBe(404);
    });
  });

  describe('Delete Operation Consistency', () => {
    test('should have consistent behavior for valid delete operations', async () => {
      // Create records to delete
      const adminCreateResult = await createViaAdmin(CONSISTENCY_TEST_DATA.validMannschaft);
      const apiCreateResult = await createViaAPI(CONSISTENCY_TEST_DATA.validMannschaft);

      expect(adminCreateResult.success).toBe(true);
      expect(apiCreateResult.success).toBe(true);

      const adminRecordId = adminCreateResult.data.id;
      const apiRecordId = apiCreateResult.data.data.id;

      // Delete records
      const adminDeleteResult = await deleteViaAdmin(adminRecordId);
      const apiDeleteResult = await deleteViaAPI(apiRecordId);

      const comparison = compareResults('DELETE', 'valid delete', adminDeleteResult, apiDeleteResult);

      expect(comparison.consistent).toBe(true);
      expect(adminDeleteResult.success).toBe(true);
      expect(apiDeleteResult.success).toBe(true);

      // Remove from cleanup list since they're already deleted
      createdRecords.admin = createdRecords.admin.filter(id => id !== adminRecordId);
      createdRecords.api = createdRecords.api.filter(id => id !== apiRecordId);
    });

    test('should have consistent behavior for non-existent record deletion', async () => {
      const nonExistentId = 999999;

      const adminResult = await deleteViaAdmin(nonExistentId);
      const apiResult = await deleteViaAPI(nonExistentId);

      const comparison = compareResults('DELETE', 'non-existent record', adminResult, apiResult);

      expect(comparison.consistent).toBe(true);
      expect(adminResult.success).toBe(false);
      expect(apiResult.success).toBe(false);
      expect(adminResult.statusCode).toBe(404);
      expect(apiResult.statusCode).toBe(404);
    });
  });

  describe('Error Message Consistency', () => {
    test('should provide similar error messages for validation failures', async () => {
      const invalidData = {
        name: 'Error-Message-Test',
        status: 'invalid_status',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich'
      };

      const adminResult = await createViaAdmin(invalidData);
      const apiResult = await createViaAPI(invalidData);

      expect(adminResult.success).toBe(false);
      expect(apiResult.success).toBe(false);

      // Both should have error information
      expect(adminResult.error).toBeDefined();
      expect(apiResult.error).toBeDefined();

      // Error messages should contain validation-related keywords
      const adminErrorText = JSON.stringify(adminResult.validationDetails || adminResult.error).toLowerCase();
      const apiErrorText = JSON.stringify(apiResult.validationDetails || apiResult.error).toLowerCase();

      expect(adminErrorText).toMatch(/validation|invalid|error/);
      expect(apiErrorText).toMatch(/validation|invalid|error/);
    });

    test('should have consistent status codes for similar errors', async () => {
      const testCases = [
        {
          name: 'invalid enum values',
          data: { ...CONSISTENCY_TEST_DATA.validMannschaft, status: 'invalid' }
        },
        {
          name: 'missing required field',
          data: { name: 'Missing-Required', saison: '2024/25' }
        }
      ];

      for (const testCase of testCases) {
        const adminResult = await createViaAdmin(testCase.data);
        const apiResult = await createViaAPI(testCase.data);

        expect(adminResult.success).toBe(false);
        expect(apiResult.success).toBe(false);

        // Status codes should be in similar ranges (both 4xx)
        expect(Math.floor(adminResult.statusCode / 100)).toBe(4);
        expect(Math.floor(apiResult.statusCode / 100)).toBe(4);
      }
    });
  });

  describe('Response Format Consistency', () => {
    test('should have consistent success response formats', async () => {
      const adminResult = await createViaAdmin(CONSISTENCY_TEST_DATA.validMannschaft);
      const apiResult = await createViaAPI(CONSISTENCY_TEST_DATA.validMannschaft);

      expect(adminResult.success).toBe(true);
      expect(apiResult.success).toBe(true);

      // Both should return created record data
      expect(adminResult.data).toHaveProperty('id');
      expect(apiResult.data).toHaveProperty('data');
      expect(apiResult.data.data).toHaveProperty('id');

      // Both should contain the created mannschaft data
      expect(adminResult.data.name).toContain('Consistency-Test-Valid');
      expect(apiResult.data.data.attributes.name).toContain('Consistency-Test-Valid');
    });

    test('should have predictable error response structures', async () => {
      const adminResult = await createViaAdmin(CONSISTENCY_TEST_DATA.invalidMannschaft);
      const apiResult = await createViaAPI(CONSISTENCY_TEST_DATA.invalidMannschaft);

      expect(adminResult.success).toBe(false);
      expect(apiResult.success).toBe(false);

      // Both should have error information in some form
      expect(adminResult.error || adminResult.validationDetails).toBeDefined();
      expect(apiResult.error || apiResult.validationDetails).toBeDefined();
    });
  });
});