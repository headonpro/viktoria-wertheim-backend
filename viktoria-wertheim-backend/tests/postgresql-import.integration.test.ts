import { PostgreSQLImporter, PostgreSQLConnectionConfig } from '../scripts/postgresql-import';
import { Pool, Client } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Integration tests require a real PostgreSQL database
// These tests are skipped by default and can be run with TEST_INTEGRATION=true
const runIntegrationTests = process.env.TEST_INTEGRATION === 'true';

const testConfig: PostgreSQLConnectionConfig = {
  host: process.env.TEST_DATABASE_HOST || 'localhost',
  port: parseInt(process.env.TEST_DATABASE_PORT || '5432'),
  database: process.env.TEST_DATABASE_NAME || 'viktoria_wertheim_test',
  user: process.env.TEST_DATABASE_USERNAME || 'postgres',
  password: process.env.TEST_DATABASE_PASSWORD || '',
  schema: 'public'
};

// Global test pool variable
let globalTestPool: Pool;

describe('PostgreSQL Import Integration Tests', () => {
  let testPool: Pool;
  let importer: PostgreSQLImporter;

  beforeAll(async () => {
    if (!runIntegrationTests) {
      console.log('Skipping integration tests. Set TEST_INTEGRATION=true to run.');
      return;
    }

    // Create test database if it doesn't exist
    await createTestDatabase();
    
    testPool = new Pool(testConfig);
    globalTestPool = testPool; // Set global reference
    
    // Test connection
    try {
      const client = await testPool.connect();
      await client.query('SELECT NOW()');
      client.release();
    } catch (error) {
      console.error('Failed to connect to test database:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    if (!runIntegrationTests) return;
    
    if (testPool) {
      await testPool.end();
    }
  });

  beforeEach(async () => {
    if (!runIntegrationTests) return;
    
    importer = new PostgreSQLImporter({
      connectionConfig: testConfig,
      createSchema: true,
      dropExisting: true,
      batchSize: 100
    });

    // Clean up any existing test data
    await cleanupTestData();
  });

  afterEach(async () => {
    if (!runIntegrationTests) return;
    
    if (importer) {
      await importer.close();
    }
  });

  describe('Full Import Workflow', () => {
    (runIntegrationTests ? it : it.skip)('should import complete dataset successfully', async () => {

      const transformedData = createTestDataset();
      
      const result = await importer.import(transformedData);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.totalTables).toBe(4);
      expect(result.metadata.totalRecords).toBe(10);
      expect(result.metadata.schemaCreated).toBe(true);

      // Verify data was actually imported
      await verifyImportedData(transformedData, testPool);
    });

    (runIntegrationTests ? it : it.skip)('should handle large dataset with batch processing', async () => {

      const largeDataset = createLargeTestDataset(5000);
      
      const result = await importer.import(largeDataset);

      expect(result.success).toBe(true);
      expect(result.metadata.totalRecords).toBe(5000);

      // Verify record count in database
      const client = await testPool.connect();
      try {
        const countResult = await client.query('SELECT COUNT(*) FROM sponsors');
        expect(parseInt(countResult.rows[0].count)).toBe(5000);
      } finally {
        client.release();
      }
    });

    (runIntegrationTests ? it : it.skip)('should maintain referential integrity', async () => {

      const transformedData = {
        kategorien: [
          { id: 1, name: 'Hauptsponsor', created_at: '2024-01-01T00:00:00.000Z' },
          { id: 2, name: 'Partner', created_at: '2024-01-01T00:00:00.000Z' }
        ],
        sponsors: [
          { 
            id: 1, 
            name: 'Test Sponsor 1', 
            kategorie_id: 1, 
            aktiv: true,
            created_at: '2024-01-01T00:00:00.000Z'
          },
          { 
            id: 2, 
            name: 'Test Sponsor 2', 
            kategorie_id: 2, 
            aktiv: true,
            created_at: '2024-01-01T00:00:00.000Z'
          }
        ]
      };

      const result = await importer.import(transformedData);
      expect(result.success).toBe(true);

      // Verify foreign key relationships
      const client = await testPool.connect();
      try {
        const joinResult = await client.query(`
          SELECT s.name as sponsor_name, k.name as kategorie_name 
          FROM sponsors s 
          JOIN kategorien k ON s.kategorie_id = k.id
        `);
        
        expect(joinResult.rows).toHaveLength(2);
        expect(joinResult.rows[0].sponsor_name).toBe('Test Sponsor 1');
        expect(joinResult.rows[0].kategorie_name).toBe('Hauptsponsor');
      } finally {
        client.release();
      }
    });

    (runIntegrationTests ? it : it.skip)('should handle data type conversions correctly', async () => {

      const transformedData = {
        test_types: [
          {
            id: 1,
            text_field: 'Test String',
            integer_field: 42,
            decimal_field: 19.99,
            boolean_field: true,
            timestamp_field: '2024-01-01T12:00:00.000Z',
            json_field: { key: 'value', nested: { data: 123 } },
            nullable_field: null
          }
        ]
      };

      const result = await importer.import(transformedData);
      expect(result.success).toBe(true);

      // Verify data types in database
      const client = await testPool.connect();
      try {
        const selectResult = await client.query('SELECT * FROM test_types WHERE id = 1');
        const record = selectResult.rows[0];

        expect(record.text_field).toBe('Test String');
        expect(record.integer_field).toBe(42);
        expect(parseFloat(record.decimal_field)).toBe(19.99);
        expect(record.boolean_field).toBe(true);
        expect(record.timestamp_field).toBeInstanceOf(Date);
        expect(record.json_field).toEqual({ key: 'value', nested: { data: 123 } });
        expect(record.nullable_field).toBeNull();
      } finally {
        client.release();
      }
    });

    (runIntegrationTests ? it : it.skip)('should handle upsert operations correctly', async () => {

      // First import
      const initialData = {
        sponsors: [
          { id: 1, name: 'Initial Name', aktiv: true, created_at: '2024-01-01T00:00:00.000Z' }
        ]
      };

      let result = await importer.import(initialData);
      expect(result.success).toBe(true);

      // Second import with updated data (same ID)
      const updatedData = {
        sponsors: [
          { id: 1, name: 'Updated Name', aktiv: false, created_at: '2024-01-01T00:00:00.000Z' }
        ]
      };

      // Create new importer instance for second import
      const secondImporter = new PostgreSQLImporter({
        connectionConfig: testConfig,
        createSchema: false, // Don't recreate schema
        batchSize: 100
      });

      result = await secondImporter.import(updatedData);
      expect(result.success).toBe(true);

      // Verify data was updated, not duplicated
      const client = await testPool.connect();
      try {
        const countResult = await client.query('SELECT COUNT(*) FROM sponsors');
        expect(parseInt(countResult.rows[0].count)).toBe(1);

        const selectResult = await client.query('SELECT * FROM sponsors WHERE id = 1');
        expect(selectResult.rows[0].name).toBe('Updated Name');
        expect(selectResult.rows[0].aktiv).toBe(false);
      } finally {
        client.release();
      }

      await secondImporter.close();
    });

    (runIntegrationTests ? it : it.skip)('should create proper indexes', async () => {

      const transformedData = {
        news_artikels: [
          {
            id: 1,
            title: 'Test News',
            created_at: '2024-01-01T00:00:00.000Z',
            published_at: '2024-01-01T12:00:00.000Z'
          }
        ]
      };

      const result = await importer.import(transformedData);
      expect(result.success).toBe(true);

      // Verify indexes were created
      const client = await testPool.connect();
      try {
        const indexResult = await client.query(`
          SELECT indexname 
          FROM pg_indexes 
          WHERE tablename = 'news_artikels' 
          AND schemaname = 'public'
        `);

        const indexNames = indexResult.rows.map(row => row.indexname);
        expect(indexNames).toContain('idx_news_artikels_created_at');
        expect(indexNames).toContain('idx_news_artikels_published_at');
      } finally {
        client.release();
      }
    });
  });

  describe('Error Handling', () => {
    (runIntegrationTests ? it : it.skip)('should handle connection errors gracefully', async () => {

      const badConfig: PostgreSQLConnectionConfig = {
        ...testConfig,
        host: 'nonexistent-host'
      };

      const badImporter = new PostgreSQLImporter({
        connectionConfig: badConfig
      });

      const transformedData = createTestDataset();
      
      const result = await badImporter.import(transformedData);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Import failed');

      await badImporter.close();
    });

    (runIntegrationTests ? it : it.skip)('should handle invalid data gracefully', async () => {

      const invalidData = {
        sponsors: [
          { id: 'invalid-id', name: null } // Invalid ID type and null name
        ]
      };

      const result = await importer.import(invalidData);

      // Should fail but not crash
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    (runIntegrationTests ? it : it.skip)('should import data within reasonable time limits', async () => {

      const largeDataset = createLargeTestDataset(1000);
      
      const startTime = Date.now();
      const result = await importer.import(largeDataset);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
    });

    (runIntegrationTests ? it : it.skip)('should handle concurrent operations', async () => {

      // This test would require more complex setup for true concurrency testing
      // For now, we'll test sequential operations with multiple importers
      
      const dataset1 = { sponsors: [{ id: 1, name: 'Sponsor 1', created_at: '2024-01-01T00:00:00.000Z' }] };
      const dataset2 = { kategorien: [{ id: 1, name: 'Category 1', created_at: '2024-01-01T00:00:00.000Z' }] };

      const importer1 = new PostgreSQLImporter({
        connectionConfig: testConfig,
        createSchema: true,
        dropExisting: true
      });

      const importer2 = new PostgreSQLImporter({
        connectionConfig: testConfig,
        createSchema: false
      });

      const result1 = await importer1.import(dataset1);
      const result2 = await importer2.import(dataset2);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      await importer1.close();
      await importer2.close();
    });
  });
});

// Helper functions

async function createTestDatabase(): Promise<void> {
  if (!runIntegrationTests) return;

  const adminConfig = {
    ...testConfig,
    database: 'postgres' // Connect to default database to create test database
  };

  const adminPool = new Pool(adminConfig);
  
  try {
    const client = await adminPool.connect();
    
    try {
      // Check if test database exists
      const result = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [testConfig.database]
      );

      if (result.rows.length === 0) {
        // Create test database
        await client.query(`CREATE DATABASE "${testConfig.database}"`);
        console.log(`Created test database: ${testConfig.database}`);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to create test database:', error.message);
    throw error;
  } finally {
    await adminPool.end();
  }
}

async function cleanupTestData(): Promise<void> {
  if (!runIntegrationTests || !globalTestPool) return;

  const client = await globalTestPool.connect();
  
  try {
    // Drop all tables in the test database
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);

    for (const row of tablesResult.rows) {
      await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
    }
  } catch (error) {
    console.error('Failed to cleanup test data:', error.message);
  } finally {
    client.release();
  }
}

function createTestDataset(): Record<string, any[]> {
  return {
    kategorien: [
      { id: 1, name: 'Hauptsponsor', created_at: '2024-01-01T00:00:00.000Z' },
      { id: 2, name: 'Partner', created_at: '2024-01-01T00:00:00.000Z' }
    ],
    sponsors: [
      { 
        id: 1, 
        name: 'Test Sponsor 1', 
        website_url: 'https://example1.com',
        kategorie_id: 1, 
        aktiv: true,
        reihenfolge: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      },
      { 
        id: 2, 
        name: 'Test Sponsor 2', 
        website_url: 'https://example2.com',
        kategorie_id: 2, 
        aktiv: false,
        reihenfolge: 2,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }
    ],
    news_artikels: [
      {
        id: 1,
        title: 'Test News Article 1',
        content: 'This is test content for news article 1',
        kategorie_id: 1,
        published_at: '2024-01-01T12:00:00.000Z',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 2,
        title: 'Test News Article 2',
        content: 'This is test content for news article 2',
        kategorie_id: 2,
        published_at: '2024-01-02T12:00:00.000Z',
        created_at: '2024-01-02T00:00:00.000Z',
        updated_at: '2024-01-02T00:00:00.000Z'
      }
    ],
    mannschafts: [
      {
        id: 1,
        name: 'Erste Mannschaft',
        liga: 'Kreisliga A',
        trainer: 'Max Mustermann',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 2,
        name: 'Zweite Mannschaft',
        liga: 'Kreisliga B',
        trainer: 'Hans Schmidt',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }
    ]
  };
}

function createLargeTestDataset(recordCount: number): Record<string, any[]> {
  const sponsors = Array.from({ length: recordCount }, (_, i) => ({
    id: i + 1,
    name: `Test Sponsor ${i + 1}`,
    website_url: `https://example${i + 1}.com`,
    aktiv: i % 2 === 0,
    reihenfolge: i + 1,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  }));

  return { sponsors };
}

async function verifyImportedData(expectedData: Record<string, any[]>, pool: Pool): Promise<void> {
  const client = await pool.connect();
  
  try {
    for (const [tableName, expectedRecords] of Object.entries(expectedData)) {
      const result = await client.query(`SELECT COUNT(*) FROM "${tableName}"`);
      const actualCount = parseInt(result.rows[0].count);
      
      expect(actualCount).toBe(expectedRecords.length);
      
      // Verify a sample record
      if (expectedRecords.length > 0) {
        const sampleRecord = expectedRecords[0];
        const sampleResult = await client.query(
          `SELECT * FROM "${tableName}" WHERE id = $1`,
          [sampleRecord.id]
        );
        
        expect(sampleResult.rows).toHaveLength(1);
        
        const actualRecord = sampleResult.rows[0];
        Object.keys(sampleRecord).forEach(key => {
          if (key.includes('_at')) {
            // Handle timestamp comparison
            expect(actualRecord[key]).toBeInstanceOf(Date);
          } else if (typeof sampleRecord[key] === 'object' && sampleRecord[key] !== null) {
            // Handle JSON comparison
            expect(actualRecord[key]).toEqual(sampleRecord[key]);
          } else {
            expect(actualRecord[key]).toBe(sampleRecord[key]);
          }
        });
      }
    }
  } finally {
    client.release();
  }
}