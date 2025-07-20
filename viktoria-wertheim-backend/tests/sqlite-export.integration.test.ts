import { SQLiteExporter, exportSQLiteData } from '../scripts/sqlite-export';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('SQLiteExporter Integration Tests', () => {
  let testDbPath: string;
  let testOutputPath: string;
  let testDb: Database.Database;

  beforeAll(() => {
    // Create temporary database for testing
    testDbPath = path.join(os.tmpdir(), `test-db-${Date.now()}.db`);
    testOutputPath = path.join(os.tmpdir(), `test-exports-${Date.now()}`);
    
    // Create test database with sample data
    testDb = new Database(testDbPath);
    
    // Create test tables
    testDb.exec(`
      CREATE TABLE sponsors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        website_url TEXT,
        kategorie TEXT DEFAULT 'partner',
        aktiv BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE kategorien (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        beschreibung TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE news_artikel (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titel TEXT NOT NULL,
        inhalt TEXT,
        datum DATE NOT NULL,
        kategorie_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (kategorie_id) REFERENCES kategorien(id)
      );
    `);
    
    // Insert test data
    const insertKategorie = testDb.prepare('INSERT INTO kategorien (name, beschreibung) VALUES (?, ?)');
    insertKategorie.run('Allgemein', 'Allgemeine Nachrichten');
    insertKategorie.run('Sport', 'Sportnachrichten');
    
    const insertSponsor = testDb.prepare('INSERT INTO sponsors (name, website_url, kategorie) VALUES (?, ?, ?)');
    insertSponsor.run('Test Sponsor 1', 'https://example1.com', 'hauptsponsor');
    insertSponsor.run('Test Sponsor 2', 'https://example2.com', 'partner');
    insertSponsor.run('Test Sponsor 3', null, 'premium');
    
    const insertNews = testDb.prepare('INSERT INTO news_artikel (titel, inhalt, datum, kategorie_id) VALUES (?, ?, ?, ?)');
    insertNews.run('Test News 1', 'Content 1', '2024-01-01', 1);
    insertNews.run('Test News 2', 'Content 2', '2024-01-02', 2);
    
    testDb.close();
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testOutputPath)) {
      fs.rmSync(testOutputPath, { recursive: true, force: true });
    }
  });

  describe('Real database export', () => {
    it('should export data from real SQLite database', async () => {
      const exporter = new SQLiteExporter({
        databasePath: testDbPath,
        outputPath: testOutputPath,
        includeSystemTables: false
      });

      const result = await exporter.export();

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.totalTables).toBe(3);
      expect(result.metadata.totalRecords).toBe(7); // 2 kategorien + 3 sponsors + 2 news
      expect(result.metadata.contentTypes).toEqual(['kategorien', 'news_artikel', 'sponsors']);

      // Verify data structure
      expect(result.data.sponsors).toBeDefined();
      expect((result.data.sponsors as any).data).toHaveLength(3);
      expect((result.data.sponsors as any).recordCount).toBe(3);
      expect((result.data.sponsors as any).schema).toBeDefined();
      expect((result.data.sponsors as any).foreignKeys).toBeDefined();

      expect(result.data.kategorien).toBeDefined();
      expect((result.data.kategorien as any).data).toHaveLength(2);
      expect((result.data.kategorien as any).recordCount).toBe(2);

      expect(result.data.news_artikel).toBeDefined();
      expect((result.data.news_artikel as any).data).toHaveLength(2);
      expect((result.data.news_artikel as any).recordCount).toBe(2);
      expect((result.data.news_artikel as any).foreignKeys).toHaveLength(1);

      // Verify relationship mapping
      expect((result.data.news_artikel as any).relationshipMap).toEqual({
        kategorie_id: {
          referencedTable: 'kategorien',
          referencedColumn: 'id',
          onDelete: 'NO ACTION',
          onUpdate: 'NO ACTION'
        }
      });

      // Verify serialized data
      const newsRecord = (result.data.news_artikel as any).serializedRecords[0];
      expect(newsRecord.titel).toBe('Test News 1');
      expect(newsRecord.kategorie_id).toBe(1);
    });

    it('should handle batch processing correctly', async () => {
      const exporter = new SQLiteExporter({
        databasePath: testDbPath,
        outputPath: testOutputPath,
        batchSize: 1 // Force batching
      });

      let batchEvents = 0;
      exporter.on('tableBatchProcessed', () => {
        batchEvents++;
      });

      const result = await exporter.export();

      expect(result.success).toBe(true);
      expect(batchEvents).toBeGreaterThan(0); // Should have processed batches
    });

    it('should emit progress events', async () => {
      const exporter = new SQLiteExporter({
        databasePath: testDbPath,
        outputPath: testOutputPath
      });

      const events: string[] = [];
      exporter.on('connected', () => events.push('connected'));
      exporter.on('exportStarted', () => events.push('exportStarted'));
      exporter.on('tableStarted', () => events.push('tableStarted'));
      exporter.on('tableCompleted', () => events.push('tableCompleted'));
      exporter.on('exportCompleted', () => events.push('exportCompleted'));
      exporter.on('disconnected', () => events.push('disconnected'));

      const result = await exporter.export();

      expect(result.success).toBe(true);
      expect(events).toContain('connected');
      expect(events).toContain('exportStarted');
      expect(events).toContain('tableStarted');
      expect(events).toContain('tableCompleted');
      expect(events).toContain('exportCompleted');
      expect(events).toContain('disconnected');
    });

    it('should save export file to disk', async () => {
      const result = await exportSQLiteData({
        databasePath: testDbPath,
        outputPath: testOutputPath
      });

      expect(result.success).toBe(true);

      // Check if export directory was created
      expect(fs.existsSync(testOutputPath)).toBe(true);

      // Check if export file was created
      const files = fs.readdirSync(testOutputPath);
      const exportFile = files.find(file => file.startsWith('sqlite-export-') && file.endsWith('.json'));
      expect(exportFile).toBeDefined();

      if (exportFile) {
        const exportFilePath = path.join(testOutputPath, exportFile);
        const exportContent = JSON.parse(fs.readFileSync(exportFilePath, 'utf8'));
        
        expect(exportContent.success).toBe(true);
        expect(exportContent.metadata.totalRecords).toBe(7);
        expect(exportContent.data.sponsors).toBeDefined();
      }
    });
  });

  describe('Statistics functionality', () => {
    it('should get accurate database statistics', async () => {
      const exporter = new SQLiteExporter({
        databasePath: testDbPath
      });

      const stats = await exporter.getStatistics();

      expect(stats.tables).toHaveLength(3);
      expect(stats.totalRecords).toBe(7);
      expect(stats.databaseSize).toBeGreaterThan(0);

      // Verify individual table counts
      const sponsorsTable = stats.tables.find(t => t.name === 'sponsors');
      const kategorienTable = stats.tables.find(t => t.name === 'kategorien');
      const newsTable = stats.tables.find(t => t.name === 'news_artikel');

      expect(sponsorsTable?.recordCount).toBe(3);
      expect(kategorienTable?.recordCount).toBe(2);
      expect(newsTable?.recordCount).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent database file', async () => {
      const exporter = new SQLiteExporter({
        databasePath: '/non/existent/path.db'
      });

      const result = await exporter.export();
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('SQLite database not found');
    });

    it('should handle corrupted database gracefully', async () => {
      // Create a corrupted database file
      const corruptDbPath = path.join(os.tmpdir(), `corrupt-db-${Date.now()}.db`);
      fs.writeFileSync(corruptDbPath, 'This is not a valid SQLite database');

      const exporter = new SQLiteExporter({
        databasePath: corruptDbPath
      });

      const result = await exporter.export();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Clean up
      fs.unlinkSync(corruptDbPath);
    });
  });
});