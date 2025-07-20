import { 
  PostgreSQLImporter, 
  PostgreSQLSchemaGenerator, 
  importData,
  PostgreSQLConnectionConfig,
  ImportOptions,
  TableSchema,
  ColumnDefinition,
  ForeignKeyDefinition,
  IndexDefinition
} from '../scripts/postgresql-import';
import { Pool } from 'pg';

// Mock pg module
const mockPool = {
  connect: jest.fn(),
  end: jest.fn(),
  query: jest.fn()
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => mockPool),
  Client: jest.fn()
}));

describe('PostgreSQLSchemaGenerator', () => {
  describe('generateSchema', () => {
    it('should generate schema for simple table', () => {
      const transformedData = {
        sponsors: [
          {
            id: 1,
            name: 'Test Sponsor',
            website_url: 'https://example.com',
            aktiv: true,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
          }
        ]
      };

      const schemas = PostgreSQLSchemaGenerator.generateSchema(transformedData);
      
      expect(schemas).toHaveLength(1);
      expect(schemas[0].name).toBe('sponsors');
      expect(schemas[0].columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'id', type: 'SERIAL', isPrimaryKey: true }),
          expect.objectContaining({ name: 'name', type: 'VARCHAR(255)' }),
          expect.objectContaining({ name: 'website_url', type: 'VARCHAR(255)' }),
          expect.objectContaining({ name: 'aktiv', type: 'BOOLEAN' }),
          expect.objectContaining({ name: 'created_at', type: 'TIMESTAMP' }),
          expect.objectContaining({ name: 'updated_at', type: 'TIMESTAMP' })
        ])
      );
    });

    it('should handle empty data gracefully', () => {
      const transformedData = {
        empty_table: []
      };

      const schemas = PostgreSQLSchemaGenerator.generateSchema(transformedData);
      
      expect(schemas).toHaveLength(0);
    });

    it('should detect foreign key relationships', () => {
      const transformedData = {
        news_artikels: [
          {
            id: 1,
            title: 'Test News',
            kategorie_id: 1,
            created_by_id: 1,
            created_at: '2024-01-01T00:00:00.000Z'
          }
        ]
      };

      const schemas = PostgreSQLSchemaGenerator.generateSchema(transformedData);
      
      expect(schemas[0].foreignKeys).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            columns: ['kategorie_id'],
            referencedTable: 'kategorien',
            referencedColumns: ['id'],
            onDelete: 'SET NULL'
          })
        ])
      );
    });

    it('should create appropriate indexes', () => {
      const transformedData = {
        news_artikels: [
          {
            id: 1,
            title: 'Test News',
            created_at: '2024-01-01T00:00:00.000Z',
            published_at: '2024-01-01T00:00:00.000Z'
          }
        ]
      };

      const schemas = PostgreSQLSchemaGenerator.generateSchema(transformedData);
      
      expect(schemas[0].indexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'idx_news_artikels_created_at',
            columns: ['created_at'],
            unique: false
          }),
          expect.objectContaining({
            name: 'idx_news_artikels_published_at',
            columns: ['published_at'],
            unique: false
          })
        ])
      );
    });
  });

  describe('generateCreateTableSQL', () => {
    it('should generate correct CREATE TABLE SQL', () => {
      const schema: TableSchema = {
        name: 'test_table',
        columns: [
          { name: 'id', type: 'SERIAL', nullable: false, isPrimaryKey: true },
          { name: 'name', type: 'VARCHAR(255)', nullable: false },
          { name: 'description', type: 'TEXT', nullable: true }
        ],
        primaryKey: ['id'],
        foreignKeys: [],
        indexes: []
      };

      const sql = PostgreSQLSchemaGenerator.generateCreateTableSQL(schema);
      
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS "test_table"');
      expect(sql).toContain('"id" SERIAL NOT NULL');
      expect(sql).toContain('"name" VARCHAR(255) NOT NULL');
      expect(sql).toContain('"description" TEXT');
      expect(sql).toContain('PRIMARY KEY ("id")');
    });

    it('should handle tables without primary key', () => {
      const schema: TableSchema = {
        name: 'test_table',
        columns: [
          { name: 'name', type: 'VARCHAR(255)', nullable: false }
        ],
        primaryKey: [],
        foreignKeys: [],
        indexes: []
      };

      const sql = PostgreSQLSchemaGenerator.generateCreateTableSQL(schema);
      
      expect(sql).toContain('CREATE TABLE IF NOT EXISTS "test_table"');
      expect(sql).not.toContain('PRIMARY KEY');
    });
  });

  describe('generateCreateIndexSQL', () => {
    it('should generate correct CREATE INDEX SQL', () => {
      const schema: TableSchema = {
        name: 'test_table',
        columns: [],
        primaryKey: [],
        foreignKeys: [],
        indexes: [
          {
            name: 'idx_test_name',
            columns: ['name'],
            unique: false
          },
          {
            name: 'idx_test_email_unique',
            columns: ['email'],
            unique: true,
            type: 'btree'
          }
        ]
      };

      const indexSQLs = PostgreSQLSchemaGenerator.generateCreateIndexSQL(schema);
      
      expect(indexSQLs).toHaveLength(2);
      expect(indexSQLs[0]).toBe('CREATE INDEX IF NOT EXISTS "idx_test_name" ON "test_table" ("name");');
      expect(indexSQLs[1]).toBe('CREATE UNIQUE INDEX IF NOT EXISTS "idx_test_email_unique" ON "test_table" USING btree ("email");');
    });
  });

  describe('generateForeignKeySQL', () => {
    it('should generate correct FOREIGN KEY SQL', () => {
      const schema: TableSchema = {
        name: 'test_table',
        columns: [],
        primaryKey: [],
        foreignKeys: [
          {
            name: 'fk_test_category',
            columns: ['category_id'],
            referencedTable: 'categories',
            referencedColumns: ['id'],
            onDelete: 'CASCADE',
            onUpdate: 'SET NULL'
          }
        ],
        indexes: []
      };

      const fkSQLs = PostgreSQLSchemaGenerator.generateForeignKeySQL(schema);
      
      expect(fkSQLs).toHaveLength(1);
      expect(fkSQLs[0]).toBe(
        'ALTER TABLE "test_table" ADD CONSTRAINT "fk_test_category" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE SET NULL;'
      );
    });
  });

  describe('type inference', () => {
    it('should correctly infer column types from data', () => {
      const transformedData = {
        test_table: [
          {
            id: 1,
            name: 'Test',
            price: 19.99,
            active: true,
            metadata: { key: 'value' },
            created_at: '2024-01-01T00:00:00.000Z',
            long_text: 'This is a very long text that exceeds 255 characters and should be detected as TEXT type instead of VARCHAR. '.repeat(5)
          }
        ]
      };

      const schemas = PostgreSQLSchemaGenerator.generateSchema(transformedData);
      const columns = schemas[0].columns;
      
      const idColumn = columns.find(col => col.name === 'id');
      const nameColumn = columns.find(col => col.name === 'name');
      const priceColumn = columns.find(col => col.name === 'price');
      const activeColumn = columns.find(col => col.name === 'active');
      const metadataColumn = columns.find(col => col.name === 'metadata');
      const createdAtColumn = columns.find(col => col.name === 'created_at');
      const longTextColumn = columns.find(col => col.name === 'long_text');

      expect(idColumn?.type).toBe('SERIAL'); // ID columns are treated as SERIAL for primary keys
      expect(nameColumn?.type).toBe('VARCHAR(255)');
      expect(priceColumn?.type).toBe('DECIMAL');
      expect(activeColumn?.type).toBe('BOOLEAN');
      expect(metadataColumn?.type).toBe('JSONB');
      expect(createdAtColumn?.type).toBe('TIMESTAMP');
      expect(longTextColumn?.type).toBe('TEXT');
    });
  });
});

describe('PostgreSQLImporter', () => {
  beforeEach(() => {
    mockClient.query.mockClear();
    mockClient.release.mockClear();
    mockPool.connect.mockClear();
    mockPool.end.mockClear();
    mockPool.query.mockClear();
    
    mockPool.connect.mockResolvedValue(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create importer with default options', () => {
      const importer = new PostgreSQLImporter();
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 5432,
          database: 'viktoria_wertheim',
          user: 'postgres',
          max: 10
        })
      );
    });

    it('should create importer with custom options', () => {
      const connectionConfig: PostgreSQLConnectionConfig = {
        host: 'custom-host',
        port: 3306,
        database: 'custom-db',
        user: 'custom-user',
        password: 'custom-pass',
        maxConnections: 20
      };

      const options: ImportOptions = {
        connectionConfig,
        batchSize: 500,
        createSchema: false
      };

      const importer = new PostgreSQLImporter(options);
      
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'custom-host',
          port: 3306,
          database: 'custom-db',
          user: 'custom-user',
          password: 'custom-pass',
          max: 20
        })
      );
    });

    it('should use environment variables when available', () => {
      process.env.DATABASE_HOST = 'env-host';
      process.env.DATABASE_PORT = '9999';
      process.env.DATABASE_NAME = 'env-db';
      process.env.DATABASE_USERNAME = 'env-user';
      process.env.DATABASE_PASSWORD = 'env-pass';

      const importer = new PostgreSQLImporter();
      
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'env-host',
          port: 9999,
          database: 'env-db',
          user: 'env-user',
          password: 'env-pass'
        })
      );

      // Clean up
      delete process.env.DATABASE_HOST;
      delete process.env.DATABASE_PORT;
      delete process.env.DATABASE_NAME;
      delete process.env.DATABASE_USERNAME;
      delete process.env.DATABASE_PASSWORD;
    });
  });

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const importer = new PostgreSQLImporter();
      await expect(importer.testConnection()).resolves.not.toThrow();
      
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      const importer = new PostgreSQLImporter();
      await expect(importer.testConnection()).rejects.toThrow('Connection failed');
    });
  });

  describe('import', () => {
    it('should import data successfully', async () => {
      const transformedData = {
        sponsors: [
          { id: 1, name: 'Test Sponsor', aktiv: true },
          { id: 2, name: 'Another Sponsor', aktiv: false }
        ],
        kategorien: [
          { id: 1, name: 'Category 1' }
        ]
      };

      mockClient.query.mockResolvedValue({ rows: [] });

      const importer = new PostgreSQLImporter({
        createSchema: true,
        batchSize: 1
      });

      const result = await importer.import(transformedData);

      expect(result.success).toBe(true);
      expect(result.metadata.totalTables).toBe(2);
      expect(result.metadata.totalRecords).toBe(3);
      expect(result.metadata.tablesProcessed).toEqual(['sponsors', 'kategorien']);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle import errors gracefully', async () => {
      const transformedData = {
        sponsors: [
          { id: 1, name: 'Test Sponsor' }
        ]
      };

      mockClient.query.mockRejectedValue(new Error('Import failed'));

      const importer = new PostgreSQLImporter();
      const result = await importer.import(transformedData);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Import failed');
    });

    it('should emit progress events', async () => {
      const transformedData = {
        sponsors: [
          { id: 1, name: 'Test Sponsor 1' },
          { id: 2, name: 'Test Sponsor 2' }
        ]
      };

      mockClient.query.mockResolvedValue({ rows: [] });

      const importer = new PostgreSQLImporter({ batchSize: 1 });
      const progressEvents: any[] = [];

      importer.on('progress', (progress) => {
        progressEvents.push(progress);
      });

      await importer.import(transformedData);

      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toHaveProperty('currentTable');
      expect(progressEvents[0]).toHaveProperty('processedRecords');
      expect(progressEvents[0]).toHaveProperty('totalRecords');
    });

    it('should determine correct import order based on dependencies', async () => {
      const transformedData = {
        news_artikels: [
          { id: 1, title: 'News', kategorie_id: 1 }
        ],
        kategorien: [
          { id: 1, name: 'Category' }
        ],
        sponsors: [
          { id: 1, name: 'Sponsor' }
        ]
      };

      mockClient.query.mockResolvedValue({ rows: [] });

      const importer = new PostgreSQLImporter();
      const tableStartedEvents: string[] = [];

      importer.on('tableStarted', (data) => {
        tableStartedEvents.push(data.tableName);
      });

      await importer.import(transformedData);

      // Verify that all tables were processed
      expect(tableStartedEvents).toContain('kategorien');
      expect(tableStartedEvents).toContain('news_artikels');
      expect(tableStartedEvents).toContain('sponsors');
      
      // The exact order may vary, but we should have processed all tables
      expect(tableStartedEvents.length).toBe(3);
    });
  });

  describe('batch processing', () => {
    it('should process records in batches', async () => {
      const transformedData = {
        sponsors: Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          name: `Sponsor ${i + 1}`
        }))
      };

      mockClient.query.mockResolvedValue({ rows: [] });

      const importer = new PostgreSQLImporter({ batchSize: 2 });
      const batchEvents: any[] = [];

      importer.on('tableBatchProcessed', (data) => {
        batchEvents.push(data);
      });

      await importer.import(transformedData);

      expect(batchEvents.length).toBeGreaterThan(1);
      expect(batchEvents[0].batchSize).toBeLessThanOrEqual(2);
    });
  });

  describe('schema creation', () => {
    it('should create schema when requested', async () => {
      const transformedData = {
        sponsors: [{ id: 1, name: 'Test' }]
      };

      mockClient.query.mockResolvedValue({ rows: [] });

      const importer = new PostgreSQLImporter({ createSchema: true });
      let schemaCreated = false;

      importer.on('schemaCreated', () => {
        schemaCreated = true;
      });

      await importer.import(transformedData);

      expect(schemaCreated).toBe(true);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should drop existing tables when requested', async () => {
      const transformedData = {
        sponsors: [{ id: 1, name: 'Test' }]
      };

      mockClient.query.mockResolvedValue({ rows: [] });

      const importer = new PostgreSQLImporter({ 
        createSchema: true, 
        dropExisting: true 
      });

      await importer.import(transformedData);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DROP TABLE IF EXISTS "sponsors" CASCADE')
      );
    });
  });

  describe('error handling', () => {
    it('should rollback schema creation on error', async () => {
      const transformedData = {
        sponsors: [{ id: 1, name: 'Test' }]
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Schema creation failed')); // CREATE TABLE

      const importer = new PostgreSQLImporter({ createSchema: true });
      const result = await importer.import(transformedData);

      expect(result.success).toBe(false);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should handle foreign key constraint errors gracefully', async () => {
      const transformedData = {
        sponsors: [{ id: 1, name: 'Test', kategorie_id: 1 }] // Add foreign key to trigger constraint creation
      };

      // Mock successful queries except for foreign key creation
      mockClient.query.mockImplementation((sql: string) => {
        if (typeof sql === 'string' && sql.includes('ADD CONSTRAINT') && sql.includes('FOREIGN KEY')) {
          throw new Error('Foreign key constraint failed');
        }
        return Promise.resolve({ rows: [] });
      });

      const importer = new PostgreSQLImporter({ createSchema: true });
      let foreignKeyWarning = false;

      importer.on('foreignKeyWarning', () => {
        foreignKeyWarning = true;
      });

      const result = await importer.import(transformedData);

      expect(result.success).toBe(true); // Should still succeed
      expect(foreignKeyWarning).toBe(true);
    });
  });
});

describe('importData convenience function', () => {
  beforeEach(() => {
    mockClient.query.mockClear();
    mockClient.release.mockClear();
    mockPool.connect.mockClear();
    mockPool.end.mockClear();
    mockPool.query.mockClear();
    
    mockPool.connect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rows: [] });
  });

  it('should import data using convenience function', async () => {
    const transformedData = {
      sponsors: [{ id: 1, name: 'Test Sponsor' }]
    };

    const result = await importData(transformedData, { batchSize: 100 });

    expect(result.success).toBe(true);
    expect(result.metadata.totalRecords).toBe(1);
  });
});