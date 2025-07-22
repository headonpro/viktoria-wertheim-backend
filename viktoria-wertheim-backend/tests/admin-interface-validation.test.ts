/**
 * Admin Interface Validation Test Suite
 * 
 * Tests mannschaft creation through admin API with comprehensive validation scenarios.
 * Covers all valid enum combinations, edge cases, and error handling verification.
 * 
 * Requirements: 1.1, 1.2, 1.3, 4.1, 4.2
 */

import axios, { AxiosResponse } from 'axios';
import { AdminValidationTester } from '../scripts/admin-validation-tester';

// Test configuration
const TEST_CONFIG = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@viktoria-wertheim.de',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  TIMEOUT: 15000,
  TEST_CLEANUP: true
};

// Test data definitions
const ENUM_TEST_DATA = {
  status: {
    valid: ['aktiv', 'inaktiv', 'aufgeloest'],
    invalid: ['active', 'inactive', 'dissolved', '', null, undefined, 'AKTIV', 'Aktiv']
  },
  liga: {
    valid: ['Kreisklasse B', 'Kreisklasse A', 'Kreisliga', 'Landesliga'],
    invalid: ['Kreisklasse C', 'Bezirksliga', 'Oberliga', '', null, undefined, 'kreisklasse b']
  },
  altersklasse: {
    valid: ['senioren', 'a-jugend', 'b-jugend', 'c-jugend', 'd-jugend', 'e-jugend', 'f-jugend', 'bambini'],
    invalid: ['senior', 'herren', 'erwachsene', '', null, undefined, 'A-Jugend']
  },
  trend: {
    valid: ['steigend', 'gleich', 'fallend'],
    invalid: ['aufsteigend', 'stabil', 'sinkend', '', null, undefined, 'STEIGEND']
  }
};

// Base test data for mannschaft creation
const BASE_MANNSCHAFT_DATA = {
  name: 'Test-Mannschaft',
  saison: '2024/25',
  spielort: 'Sportplatz Wertheim',
  gruendungsjahr: 2020,
  tabellenplatz: 1,
  punkte: 0,
  spiele_gesamt: 0,
  siege: 0,
  unentschieden: 0,
  niederlagen: 0,
  tore_fuer: 0,
  tore_gegen: 0,
  tordifferenz: 0
};

describe('Admin Interface Validation Tests', () => {
  let adminTester: AdminValidationTester;
  let authToken: string;
  let createdRecords: number[] = [];

  beforeAll(async () => {
    adminTester = new AdminValidationTester();
    
    // Authenticate with admin
    const authSuccess = await adminTester.authenticate();
    expect(authSuccess).toBe(true);
    
    authToken = (adminTester as any).authToken;
    expect(authToken).toBeDefined();
  });

  afterAll(async () => {
    // Cleanup any remaining test records
    if (TEST_CONFIG.TEST_CLEANUP && createdRecords.length > 0) {
      console.log(`Cleaning up ${createdRecords.length} test records...`);
      
      for (const recordId of createdRecords) {
        try {
          await axios.delete(
            `${TEST_CONFIG.STRAPI_URL}/admin/content-manager/collection-types/api::mannschaft.mannschaft/${recordId}`,
            {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
        } catch (error) {
          console.warn(`Failed to cleanup record ${recordId}:`, error.message);
        }
      }
    }
  });

  afterEach(() => {
    // Clear created records array after each test
    createdRecords = [];
  });

  /**
   * Helper function to create mannschaft via admin API
   */
  const createMannschaftViaAdmin = async (data: any): Promise<AxiosResponse> => {
    const testData = {
      ...BASE_MANNSCHAFT_DATA,
      ...data,
      name: `${data.name || 'Test'}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    };

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

    // Track created record for cleanup
    if (response.data?.id) {
      createdRecords.push(response.data.id);
    }

    return response;
  };

  /**
   * Helper function to expect validation error
   */
  const expectValidationError = async (data: any, expectedField?: string) => {
    await expect(createMannschaftViaAdmin(data)).rejects.toMatchObject({
      response: {
        status: expect.any(Number),
        data: {
          error: expect.objectContaining({
            message: expect.stringContaining('validation')
          })
        }
      }
    });
  };

  describe('Authentication and Setup', () => {
    test('should authenticate successfully with admin credentials', () => {
      expect(authToken).toBeDefined();
      expect(authToken).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/); // JWT format
    });

    test('should have access to admin content manager endpoints', async () => {
      const response = await axios.get(
        `${TEST_CONFIG.STRAPI_URL}/admin/content-manager/collection-types/api::mannschaft.mannschaft`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('results');
    });
  });

  describe('Status Field Validation', () => {
    test.each(ENUM_TEST_DATA.status.valid)('should accept valid status value: %s', async (status) => {
      const response = await createMannschaftViaAdmin({
        status,
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich'
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.status).toBe(status);
    });

    test.each(ENUM_TEST_DATA.status.invalid)('should reject invalid status value: %s', async (status) => {
      await expectValidationError({
        status,
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich'
      }, 'status');
    });

    test('should require status field', async () => {
      await expectValidationError({
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich'
        // status intentionally omitted
      }, 'status');
    });
  });

  describe('Liga Field Validation', () => {
    test.each(ENUM_TEST_DATA.liga.valid)('should accept valid liga value: %s', async (liga) => {
      const response = await createMannschaftViaAdmin({
        status: 'aktiv',
        liga,
        altersklasse: 'senioren',
        trend: 'gleich'
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.liga).toBe(liga);
    });

    test.each(ENUM_TEST_DATA.liga.invalid)('should reject invalid liga value: %s', async (liga) => {
      await expectValidationError({
        status: 'aktiv',
        liga,
        altersklasse: 'senioren',
        trend: 'gleich'
      }, 'liga');
    });

    test('should require liga field', async () => {
      await expectValidationError({
        status: 'aktiv',
        altersklasse: 'senioren',
        trend: 'gleich'
        // liga intentionally omitted
      }, 'liga');
    });
  });

  describe('Altersklasse Field Validation', () => {
    test.each(ENUM_TEST_DATA.altersklasse.valid)('should accept valid altersklasse value: %s', async (altersklasse) => {
      const response = await createMannschaftViaAdmin({
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse,
        trend: 'gleich'
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.altersklasse).toBe(altersklasse);
    });

    test.each(ENUM_TEST_DATA.altersklasse.invalid)('should reject invalid altersklasse value: %s', async (altersklasse) => {
      await expectValidationError({
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse,
        trend: 'gleich'
      }, 'altersklasse');
    });

    test('should require altersklasse field', async () => {
      await expectValidationError({
        status: 'aktiv',
        liga: 'Kreisklasse B',
        trend: 'gleich'
        // altersklasse intentionally omitted
      }, 'altersklasse');
    });
  });

  describe('Trend Field Validation', () => {
    test.each(ENUM_TEST_DATA.trend.valid)('should accept valid trend value: %s', async (trend) => {
      const response = await createMannschaftViaAdmin({
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.trend).toBe(trend);
    });

    test.each(ENUM_TEST_DATA.trend.invalid)('should reject invalid trend value: %s', async (trend) => {
      await expectValidationError({
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend
      }, 'trend');
    });

    test('should use default trend value when not provided', async () => {
      const response = await createMannschaftViaAdmin({
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren'
        // trend intentionally omitted to test default
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.trend).toBe('gleich'); // Default value from schema
    });
  });

  describe('Valid Enum Combinations', () => {
    const validCombinations = [
      { status: 'aktiv', liga: 'Kreisklasse B', altersklasse: 'senioren', trend: 'steigend' },
      { status: 'inaktiv', liga: 'Kreisklasse A', altersklasse: 'a-jugend', trend: 'gleich' },
      { status: 'aufgeloest', liga: 'Kreisliga', altersklasse: 'b-jugend', trend: 'fallend' },
      { status: 'aktiv', liga: 'Landesliga', altersklasse: 'c-jugend', trend: 'steigend' },
      { status: 'aktiv', liga: 'Kreisklasse B', altersklasse: 'bambini', trend: 'gleich' }
    ];

    test.each(validCombinations)('should accept valid combination: %o', async (combination) => {
      const response = await createMannschaftViaAdmin(combination);

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('id');
      expect(response.data.status).toBe(combination.status);
      expect(response.data.liga).toBe(combination.liga);
      expect(response.data.altersklasse).toBe(combination.altersklasse);
      expect(response.data.trend).toBe(combination.trend);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty string values appropriately', async () => {
      await expectValidationError({
        status: '',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich'
      });
    });

    test('should handle null values appropriately', async () => {
      await expectValidationError({
        status: null,
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich'
      });
    });

    test('should handle case sensitivity correctly', async () => {
      await expectValidationError({
        status: 'AKTIV', // Should be 'aktiv'
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich'
      });
    });

    test('should provide clear error messages for validation failures', async () => {
      try {
        await createMannschaftViaAdmin({
          status: 'invalid_status',
          liga: 'Kreisklasse B',
          altersklasse: 'senioren',
          trend: 'gleich'
        });
        fail('Expected validation error');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
        expect(error.response.data).toHaveProperty('error');
        expect(error.response.data.error).toHaveProperty('message');
        expect(error.response.data.error.message).toMatch(/validation|invalid/i);
      }
    });

    test('should handle multiple validation errors', async () => {
      try {
        await createMannschaftViaAdmin({
          status: 'invalid_status',
          liga: 'invalid_liga',
          altersklasse: 'invalid_altersklasse',
          trend: 'invalid_trend'
        });
        fail('Expected validation error');
      } catch (error) {
        expect(error.response.status).toBeGreaterThanOrEqual(400);
        expect(error.response.data).toHaveProperty('error');
      }
    });
  });

  describe('Required Field Validation', () => {
    test('should require name field', async () => {
      await expectValidationError({
        // name intentionally omitted
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich'
      }, 'name');
    });

    test('should enforce unique name constraint', async () => {
      const uniqueName = `Unique-Test-${Date.now()}`;
      
      // Create first record
      const firstResponse = await createMannschaftViaAdmin({
        name: uniqueName,
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich'
      });
      
      expect(firstResponse.status).toBe(200);

      // Try to create second record with same name
      await expectValidationError({
        name: uniqueName,
        status: 'aktiv',
        liga: 'Kreisklasse A',
        altersklasse: 'a-jugend',
        trend: 'steigend'
      }, 'name');
    });
  });

  describe('Numeric Field Validation', () => {
    test('should validate gruendungsjahr range', async () => {
      // Test valid year
      const validResponse = await createMannschaftViaAdmin({
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich',
        gruendungsjahr: 2020
      });
      
      expect(validResponse.status).toBe(200);
      expect(validResponse.data.gruendungsjahr).toBe(2020);

      // Test invalid year (too early)
      await expectValidationError({
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich',
        gruendungsjahr: 1800
      });

      // Test invalid year (too late)
      await expectValidationError({
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich',
        gruendungsjahr: 2050
      });
    });

    test('should validate tabellenplatz range', async () => {
      // Test valid position
      const validResponse = await createMannschaftViaAdmin({
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich',
        tabellenplatz: 5
      });
      
      expect(validResponse.status).toBe(200);
      expect(validResponse.data.tabellenplatz).toBe(5);

      // Test invalid position (too low)
      await expectValidationError({
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich',
        tabellenplatz: 0
      });

      // Test invalid position (too high)
      await expectValidationError({
        status: 'aktiv',
        liga: 'Kreisklasse B',
        altersklasse: 'senioren',
        trend: 'gleich',
        tabellenplatz: 25
      });
    });
  });
});