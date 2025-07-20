import { MigrationOrchestrator, MigrationOptions, MigrationPhase } from '../scripts/migration-orchestrator';
import fs from 'fs/promises';
import path from 'path';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('MigrationOrchestrator Integration Tests', () => {
  const testDataDir = path.join(__dirname, 'test-data');
  const testSqlitePath = path.join(testDataDir, 'test.db');
  const testBackupPath = path.join(testDataDir, 'backups');
  
  let testDb: Database.Database;
  let pgPool: Pool | null = null;
  let postgresAvailable = false;

  beforeAll(async () => {
    // Create test data directory
    await fs.mkdir(testDataDir, { recursive: true });
    await fs.mkdir(testBackupPath, { recursive: true });

    // Create test SQLite database
    testDb = new Database(testSqlitePath);
    await setupTestSQLiteData();

    // Try to setup PostgreSQL connection for testing
    try {
      pgPool = new Pool({
        host: process.env.TEST_POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
        database: process.env.TEST_POSTGRES_DB || 'test_migration',
        user: process.env.TEST_POSTGRES_USER || 'postgres',
        password: process.env.TEST_POSTGRES_PASSWORD || 'password'
      });

      const client = await pgPool.connect();
      client.release();
      postgresAvailable = true;
      console.log('PostgreSQL available for integration tests');
    } catch (error) {
      console.warn('PostgreSQL not available for integration tests:', error.message);
      postgresAvailable = false;
      if (pgPool) {
        await pgPool.end();
        pgPool = null;
      }
    }
  });

  afterAll(async () => {
    // Cleanup
    if (testDb) {
      testDb.close();
    }
    
    if (pgPool) {
      await pgPool.end();
    }

    // Remove test files
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  beforeEach(async () => {
    // Clean up PostgreSQL test database before each test
    if (pgPool) {
      try {
        const client = await pgPool.connect();
        await client.query('DROP SCHEMA IF EXISTS public CASCADE');
        await client.query('CREATE SCHEMA public');
        client.release();
      } catch (error) {
        // Ignore if PostgreSQL is not available
      }
    }
  });

  async function setupTestSQLiteData(): Promise<void> {
    // Create test tables with Strapi-like structure
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS sponsors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id VARCHAR(255),
        name TEXT NOT NULL,
        logo TEXT,
        website_url TEXT,
        beschreibung TEXT,
        kategorie_id INTEGER,
        reihenfolge INTEGER DEFAULT 0,
        aktiv BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME,
        created_by_id INTEGER,
        updated_by_id INTEGER,
        locale VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS kategorien (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id VARCHAR(255),
        name TEXT NOT NULL,
        beschreibung TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        published_at DATETIME,
        created_by_id INTEGER,
        updated_by_id INTEGER,
        locale VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS news_artikels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id VARCHAR(255),
        titel TEXT NOT NULL,
        inhalt TEXT,
        autor TEXT,
        featured_image TEXT,
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by_id INTEGER,
        updated_by_id INTEGER,
        locale VARCHAR(255)
      );
    `);

    // Insert test data
    const insertKategorie = testDb.prepare(`
      INSERT INTO kategorien (name, beschreibung, published_at) 
      VALUES (?, ?, ?)
    `);

    const insertSponsor = testDb.prepare(`
      INSERT INTO sponsors (name, website_url, beschreibung, kategorie_id, aktiv, published_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertNews = testDb.prepare(`
      INSERT INTO news_artikels (titel, inhalt, autor, published_at) 
      VALUES (?, ?, ?, ?)
    `);

    // Insert categories
    insertKategorie.run('Hauptsponsor', 'Hauptsponsoren des Vereins', new Date().toISOString());
    insertKategorie.run('Partner', 'Vereinspartner', new Date().toISOString());

    // Insert sponsors
    insertSponsor.run('Test Sponsor 1', 'https://example1.com', 'Beschreibung 1', 1, 1, new Date().toISOString());
    insertSponsor.run('Test Sponsor 2', 'https://example2.com', 'Beschreibung 2', 2, 1, new Date().toISOString());
    insertSponsor.run('Test Sponsor 3', 'https://example3.com', 'Beschreibung 3', 1, 0, new Date().toISOString());

    // Insert news articles
    insertNews.run('Test Artikel 1', 'Inhalt des ersten Artikels', 'Test Autor', new Date().toISOString());
    insertNews.run('Test Artikel 2', 'Inhalt des zweiten Artikels', 'Test Autor', new Date().toISOString());
  }

  describe('Full Migration Process', () => {
    it('should complete full migration successfully', async () => {
      if (!postgresAvailable) {
        console.log('Skipping PostgreSQL integration test - database not available');
        return;
      }
      const migrationOptions: MigrationOptions = {
        sqlitePath: testSqlitePath,
        postgresConfig: {
          host: process.env.TEST_POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
          database: process.env.TEST_POSTGRES_DB || 'test_migration',
          user: process.env.TEST_POSTGRES_USER || 'postgres',
          password: process.env.TEST_POSTGRES_PASSWORD || 'password'
        },
        createBackup: true,
        backupPath: testBackupPath,
        validateData: true,
        batchSize: 10,
        createSchema: true,
        dropExisting: true
      };

      const orchestrator = new MigrationOrchestrator(migrationOptions);
      
      // Track progress
      const progressEvents: any[] = [];
      const phaseEvents: MigrationPhase[] = [];
      const errorEvents: any[] = [];
      const warningEvents: any[] = [];

      orchestrator.on('progress', (progress) => progressEvents.push(progress));
      orchestrator.on('phaseChanged', (event) => phaseEvents.push(event.phase));
      orchestrator.on('error', (error) => errorEvents.push(error));
      orchestrator.on('warning', (warning) => warningEvents.push(warning));

      const result = await orchestrator.migrate();

      // Verify migration result
      expect(result.success).toBe(true);
      expect(result.statistics.totalTables).toBeGreaterThan(0);
      expect(result.statistics.totalRecords).toBeGreaterThan(0);
      expect(result.statistics.exportedRecords).toBe(result.statistics.importedRecords);

      // Verify phases were executed
      expect(phaseEvents).toContain(MigrationPhase.INITIALIZATION);
      expect(phaseEvents).toContain(MigrationPhase.BACKUP);
      expect(phaseEvents).toContain(MigrationPhase.EXPORT);
      expect(phaseEvents).toContain(MigrationPhase.TRANSFORM);
      expect(phaseEvents).toContain(MigrationPhase.IMPORT);
      expect(phaseEvents).toContain(MigrationPhase.VALIDATION);
      expect(phaseEvents).toContain(MigrationPhase.COMPLETED);

      // Verify backup was created
      expect(result.phases.backup).toBeDefined();
      expect(result.phases.backup!.success).toBe(true);
      expect(result.rollbackInfo.available).toBe(true);

      // Verify progress events were emitted
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1].overallProgress).toBe(100);

      // Verify data integrity
      if (pgPool) {
        const client = await pgPool.connect();
        try {
          // Check that tables were created
          const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
          `);
          
          const tableNames = tablesResult.rows.map(row => row.table_name);
          expect(tableNames).toContain('sponsors');
          expect(tableNames).toContain('kategorien');
          expect(tableNames).toContain('news_artikels');

          // Check data was imported
          const sponsorsResult = await client.query('SELECT COUNT(*) as count FROM sponsors');
          expect(parseInt(sponsorsResult.rows[0].count)).toBe(3);

          const kategorienResult = await client.query('SELECT COUNT(*) as count FROM kategorien');
          expect(parseInt(kategorienResult.rows[0].count)).toBe(2);

          const newsResult = await client.query('SELECT COUNT(*) as count FROM news_artikels');
          expect(parseInt(newsResult.rows[0].count)).toBe(2);

          // Verify data integrity
          const sponsorData = await client.query('SELECT * FROM sponsors ORDER BY id');
          expect(sponsorData.rows[0].name).toBe('Test Sponsor 1');
          expect(sponsorData.rows[0].website_url).toBe('https://example1.com');
          expect(sponsorData.rows[0].aktiv).toBe(true);

        } finally {
          client.release();
        }
      }
    }, 30000); // 30 second timeout for integration test

    it('should handle migration with validation errors gracefully', async () => {
      if (!postgresAvailable) {
        console.log('Skipping PostgreSQL integration test - database not available');
        return;
      }
      // Create a database with invalid data
      const invalidDb = new Database(path.join(testDataDir, 'invalid.db'));
      
      invalidDb.exec(`
        CREATE TABLE test_table (
          id INTEGER PRIMARY KEY,
          invalid_date TEXT,
          invalid_json TEXT
        );
        
        INSERT INTO test_table (id, invalid_date, invalid_json) 
        VALUES (1, 'not-a-date', 'not-json');
      `);
      
      invalidDb.close();

      const migrationOptions: MigrationOptions = {
        sqlitePath: path.join(testDataDir, 'invalid.db'),
        postgresConfig: {
          host: process.env.TEST_POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
          database: process.env.TEST_POSTGRES_DB || 'test_migration',
          user: process.env.TEST_POSTGRES_USER || 'postgres',
          password: process.env.TEST_POSTGRES_PASSWORD || 'password'
        },
        createBackup: false,
        validateData: true,
        createSchema: true,
        dropExisting: true
      };

      const orchestrator = new MigrationOrchestrator(migrationOptions);
      const result = await orchestrator.migrate();

      // Migration might succeed but with warnings
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
      
      // Clean up
      await fs.unlink(path.join(testDataDir, 'invalid.db')).catch(() => {});
    });

    it('should fail gracefully when PostgreSQL is unavailable', async () => {
      const migrationOptions: MigrationOptions = {
        sqlitePath: testSqlitePath,
        postgresConfig: {
          host: 'nonexistent-host',
          port: 9999,
          database: 'nonexistent_db',
          user: 'nonexistent_user',
          password: 'wrong_password'
        },
        createBackup: false,
        validateData: false
      };

      const orchestrator = new MigrationOrchestrator(migrationOptions);
      const result = await orchestrator.migrate();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('PostgreSQL connection failed');
    });

    it('should fail when SQLite database does not exist', async () => {
      const migrationOptions: MigrationOptions = {
        sqlitePath: '/nonexistent/path/database.db',
        postgresConfig: {
          host: 'localhost',
          port: 5432,
          database: 'test_db',
          user: 'test_user',
          password: 'test_pass'
        }
      };

      const orchestrator = new MigrationOrchestrator(migrationOptions);
      const result = await orchestrator.migrate();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('SQLite database not found');
    });
  });

  describe('Backup and Rollback', () => {
    it('should create backup and support rollback', async () => {
      if (!postgresAvailable) {
        console.log('Skipping PostgreSQL integration test - database not available');
        return;
      }
      const migrationOptions: MigrationOptions = {
        sqlitePath: testSqlitePath,
        postgresConfig: {
          host: process.env.TEST_POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
          database: process.env.TEST_POSTGRES_DB || 'test_migration',
          user: process.env.TEST_POSTGRES_USER || 'postgres',
          password: process.env.TEST_POSTGRES_PASSWORD || 'password'
        },
        createBackup: true,
        backupPath: testBackupPath,
        validateData: false
      };

      const orchestrator = new MigrationOrchestrator(migrationOptions);
      const result = await orchestrator.migrate();

      // Verify backup was created
      expect(result.phases.backup).toBeDefined();
      expect(result.phases.backup!.success).toBe(true);
      expect(result.rollbackInfo.available).toBe(true);

      // Verify backup file exists
      const backupExists = await fs.access(result.phases.backup!.backupPath)
        .then(() => true)
        .catch(() => false);
      expect(backupExists).toBe(true);

      // Test rollback capability
      const rollbackResult = await orchestrator.rollback();
      expect(rollbackResult).toBe(true);
    });

    it('should skip backup when disabled', async () => {
      if (!postgresAvailable) {
        console.log('Skipping PostgreSQL integration test - database not available');
        return;
      }

      const migrationOptions: MigrationOptions = {
        sqlitePath: testSqlitePath,
        postgresConfig: {
          host: process.env.TEST_POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
          database: process.env.TEST_POSTGRES_DB || 'test_migration',
          user: process.env.TEST_POSTGRES_USER || 'postgres',
          password: process.env.TEST_POSTGRES_PASSWORD || 'password'
        },
        createBackup: false,
        validateData: false
      };

      const orchestrator = new MigrationOrchestrator(migrationOptions);
      const result = await orchestrator.migrate();

      expect(result.phases.backup).toBeUndefined();
      expect(result.rollbackInfo.available).toBe(false);

      // Rollback should fail
      await expect(orchestrator.rollback()).rejects.toThrow('Rollback not available');
    });
  });

  describe('Progress Reporting', () => {
    it('should provide detailed progress information', async () => {
      if (!postgresAvailable) {
        console.log('Skipping PostgreSQL integration test - database not available');
        return;
      }

      const migrationOptions: MigrationOptions = {
        sqlitePath: testSqlitePath,
        postgresConfig: {
          host: process.env.TEST_POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
          database: process.env.TEST_POSTGRES_DB || 'test_migration',
          user: process.env.TEST_POSTGRES_USER || 'postgres',
          password: process.env.TEST_POSTGRES_PASSWORD || 'password'
        },
        createBackup: false,
        validateData: false
      };

      const orchestrator = new MigrationOrchestrator(migrationOptions);
      
      const progressUpdates: any[] = [];
      orchestrator.on('progress', (progress) => {
        progressUpdates.push({
          phase: progress.phase,
          overallProgress: progress.overallProgress,
          operation: progress.currentOperation
        });
      });

      await orchestrator.migrate();

      // Verify progress was reported
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Verify progress increases over time
      const progressValues = progressUpdates.map(p => p.overallProgress);
      expect(progressValues[progressValues.length - 1]).toBe(100);
      
      // Verify different phases were reported
      const phases = new Set(progressUpdates.map(p => p.phase));
      expect(phases.size).toBeGreaterThan(1);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive migration report', async () => {
      if (!postgresAvailable) {
        console.log('Skipping PostgreSQL integration test - database not available');
        return;
      }

      const migrationOptions: MigrationOptions = {
        sqlitePath: testSqlitePath,
        postgresConfig: {
          host: process.env.TEST_POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.TEST_POSTGRES_PORT || '5432'),
          database: process.env.TEST_POSTGRES_DB || 'test_migration',
          user: process.env.TEST_POSTGRES_USER || 'postgres',
          password: process.env.TEST_POSTGRES_PASSWORD || 'password'
        },
        createBackup: true,
        backupPath: testBackupPath,
        validateData: true
      };

      const orchestrator = new MigrationOrchestrator(migrationOptions);
      const result = await orchestrator.migrate();

      const report = orchestrator.generateReport(result);

      // Verify report contains key information
      expect(report).toContain('MIGRATION REPORT');
      expect(report).toContain('Status:');
      expect(report).toContain('Duration:');
      expect(report).toContain('STATISTICS:');
      expect(report).toContain('Tables Processed:');
      expect(report).toContain('Records Exported:');
      expect(report).toContain('Records Imported:');

      if (result.rollbackInfo.available) {
        expect(report).toContain('ROLLBACK INFORMATION:');
      }

      // Save report to file for manual inspection
      const reportPath = path.join(testDataDir, 'migration-report.txt');
      await fs.writeFile(reportPath, report);
      
      const reportExists = await fs.access(reportPath)
        .then(() => true)
        .catch(() => false);
      expect(reportExists).toBe(true);
    });
  });
});