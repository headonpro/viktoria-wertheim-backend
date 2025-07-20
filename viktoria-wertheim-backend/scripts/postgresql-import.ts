import { Pool, Client, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';

export interface ImportOptions {
  connectionConfig?: PostgreSQLConnectionConfig;
  batchSize?: number;
  createSchema?: boolean;
  dropExisting?: boolean;
  validateData?: boolean;
  onProgress?: (progress: ImportProgress) => void;
}

export interface PostgreSQLConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
  ssl?: boolean | object;
  schema?: string;
  maxConnections?: number;
}

export interface ImportProgress {
  totalTables: number;
  completedTables: number;
  currentTable: string;
  totalRecords: number;
  processedRecords: number;
  startTime: Date;
  estimatedTimeRemaining?: number;
}

export interface ImportResult {
  success: boolean;
  metadata: {
    importDate: Date;
    totalTables: number;
    totalRecords: number;
    duration: number;
    connectionConfig: Partial<PostgreSQLConnectionConfig>;
    schemaCreated: boolean;
    tablesProcessed: string[];
  };
  errors: string[];
  warnings: string[];
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  primaryKey?: string[];
  foreignKeys: ForeignKeyDefinition[];
  indexes: IndexDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey?: boolean;
  isAutoIncrement?: boolean;
}

export interface ForeignKeyDefinition {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
  type?: 'btree' | 'hash' | 'gin' | 'gist';
}

/**
 * PostgreSQL schema generator for Strapi content types
 */
export class PostgreSQLSchemaGenerator {
  private static readonly STRAPI_SYSTEM_COLUMNS = [
    { name: 'id', type: 'SERIAL PRIMARY KEY', nullable: false },
    { name: 'document_id', type: 'VARCHAR(255)', nullable: true },
    { name: 'created_at', type: 'TIMESTAMP', nullable: true },
    { name: 'updated_at', type: 'TIMESTAMP', nullable: true },
    { name: 'published_at', type: 'TIMESTAMP', nullable: true },
    { name: 'created_by_id', type: 'INTEGER', nullable: true },
    { name: 'updated_by_id', type: 'INTEGER', nullable: true },
    { name: 'locale', type: 'VARCHAR(255)', nullable: true }
  ];

  /**
   * Generate PostgreSQL schema from transformed data
   */
  static generateSchema(transformedData: Record<string, any[]>): TableSchema[] {
    const schemas: TableSchema[] = [];

    for (const [tableName, records] of Object.entries(transformedData)) {
      if (records.length === 0) continue;

      const schema = this.generateTableSchema(tableName, records);
      schemas.push(schema);
    }

    return schemas;
  }

  /**
   * Generate schema for a single table
   */
  private static generateTableSchema(tableName: string, records: any[]): TableSchema {
    const sampleRecord = records[0];
    const columns: ColumnDefinition[] = [];
    const foreignKeys: ForeignKeyDefinition[] = [];
    const indexes: IndexDefinition[] = [];

    // Add system columns first
    this.STRAPI_SYSTEM_COLUMNS.forEach(sysCol => {
      if (sampleRecord.hasOwnProperty(sysCol.name)) {
        columns.push({
          name: sysCol.name,
          type: sysCol.type.replace(' PRIMARY KEY', ''),
          nullable: sysCol.nullable,
          isPrimaryKey: sysCol.name === 'id',
          isAutoIncrement: sysCol.name === 'id'
        });
      }
    });

    // Add content-specific columns
    Object.keys(sampleRecord).forEach(fieldName => {
      // Skip system columns (already added)
      if (this.STRAPI_SYSTEM_COLUMNS.some(col => col.name === fieldName)) {
        return;
      }

      const column = this.inferColumnDefinition(fieldName, records);
      columns.push(column);

      // Check for foreign key relationships
      if (fieldName.endsWith('_id') && fieldName !== 'id') {
        const referencedTable = this.inferReferencedTable(fieldName);
        if (referencedTable) {
          foreignKeys.push({
            name: `fk_${tableName}_${fieldName}`,
            columns: [fieldName],
            referencedTable,
            referencedColumns: ['id'],
            onDelete: 'SET NULL'
          });
        }
      }
    });

    // Add standard indexes only if columns exist
    if (columns.some(col => col.name === 'created_at')) {
      indexes.push({
        name: `idx_${tableName}_created_at`,
        columns: ['created_at'],
        unique: false
      });
    }

    if (columns.some(col => col.name === 'published_at')) {
      indexes.push({
        name: `idx_${tableName}_published_at`,
        columns: ['published_at'],
        unique: false
      });
    }

    return {
      name: tableName,
      columns,
      primaryKey: ['id'],
      foreignKeys,
      indexes
    };
  }

  /**
   * Infer column definition from sample data
   */
  private static inferColumnDefinition(fieldName: string, records: any[]): ColumnDefinition {
    const values = records.map(record => record[fieldName]).filter(v => v !== null && v !== undefined);
    
    if (values.length === 0) {
      return {
        name: fieldName,
        type: 'TEXT',
        nullable: true
      };
    }

    // Analyze value types
    const types = new Set(values.map(v => typeof v));
    
    let postgresType = 'TEXT';
    
    if (types.has('number')) {
      const allIntegers = values.every(v => Number.isInteger(v));
      postgresType = allIntegers ? 'INTEGER' : 'DECIMAL';
    } else if (types.has('boolean')) {
      postgresType = 'BOOLEAN';
    } else if (types.has('object')) {
      // Check if it's a date or JSON
      const firstObject = values.find(v => typeof v === 'object');
      if (firstObject instanceof Date) {
        postgresType = 'TIMESTAMP';
      } else {
        postgresType = 'JSONB';
      }
    } else if (types.has('string')) {
      // Check for specific string patterns
      const sampleValue = values[0] as string;
      
      if (sampleValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
        postgresType = 'TIMESTAMP';
      } else if (sampleValue.startsWith('{') || sampleValue.startsWith('[')) {
        try {
          JSON.parse(sampleValue);
          postgresType = 'JSONB';
        } catch (e) {
          postgresType = 'TEXT';
        }
      } else if (sampleValue.length > 255) {
        postgresType = 'TEXT';
      } else {
        postgresType = 'VARCHAR(255)';
      }
    }

    return {
      name: fieldName,
      type: postgresType,
      nullable: records.some(record => record[fieldName] === null || record[fieldName] === undefined)
    };
  }

  /**
   * Infer referenced table from foreign key field name
   */
  private static inferReferencedTable(fieldName: string): string | null {
    // Remove _id suffix and try to map to known table names
    const baseName = fieldName.replace(/_id$/, '');
    
    // Common Strapi table mappings
    const tableMappings: Record<string, string> = {
      'created_by': 'admin_users',
      'updated_by': 'admin_users',
      'kategorie': 'kategorien',
      'mannschaft': 'mannschafts',
      'spieler': 'spielers',
      'spiel': 'spiels',
      'training': 'trainings',
      'mitglied': 'mitglieds',
      'sponsor': 'sponsors',
      'news_artikel': 'news_artikels'
    };

    return tableMappings[baseName] || `${baseName}s`;
  }

  /**
   * Generate CREATE TABLE SQL statement
   */
  static generateCreateTableSQL(schema: TableSchema): string {
    const columnDefinitions = schema.columns.map(col => {
      let definition = `"${col.name}" ${col.type}`;
      
      if (!col.nullable) {
        definition += ' NOT NULL';
      }
      
      if (col.defaultValue !== undefined) {
        definition += ` DEFAULT ${col.defaultValue}`;
      }
      
      return definition;
    }).join(',\n  ');

    let sql = `CREATE TABLE IF NOT EXISTS "${schema.name}" (\n  ${columnDefinitions}`;

    if (schema.primaryKey && schema.primaryKey.length > 0) {
      const pkColumns = schema.primaryKey.map(col => `"${col}"`).join(', ');
      sql += `,\n  PRIMARY KEY (${pkColumns})`;
    }

    sql += '\n);';

    return sql;
  }

  /**
   * Generate CREATE INDEX SQL statements
   */
  static generateCreateIndexSQL(schema: TableSchema): string[] {
    return schema.indexes.map(index => {
      const uniqueClause = index.unique ? 'UNIQUE ' : '';
      const typeClause = index.type ? ` USING ${index.type}` : '';
      const columns = index.columns.map(col => `"${col}"`).join(', ');
      
      return `CREATE ${uniqueClause}INDEX IF NOT EXISTS "${index.name}" ON "${schema.name}"${typeClause} (${columns});`;
    });
  }

  /**
   * Generate ADD FOREIGN KEY SQL statements
   */
  static generateForeignKeySQL(schema: TableSchema): string[] {
    return schema.foreignKeys.map(fk => {
      const columns = fk.columns.map(col => `"${col}"`).join(', ');
      const refColumns = fk.referencedColumns.map(col => `"${col}"`).join(', ');
      
      let sql = `ALTER TABLE "${schema.name}" ADD CONSTRAINT "${fk.name}" `;
      sql += `FOREIGN KEY (${columns}) REFERENCES "${fk.referencedTable}" (${refColumns})`;
      
      if (fk.onDelete) {
        sql += ` ON DELETE ${fk.onDelete}`;
      }
      
      if (fk.onUpdate) {
        sql += ` ON UPDATE ${fk.onUpdate}`;
      }
      
      return sql + ';';
    });
  }
}

/**
 * PostgreSQL data importer with batch processing
 */
export class PostgreSQLImporter extends EventEmitter {
  private pool: Pool;
  private options: Required<ImportOptions>;
  private connectionConfig: PostgreSQLConnectionConfig;

  constructor(options: ImportOptions = {}) {
    super();

    this.connectionConfig = this.buildConnectionConfig(options.connectionConfig);
    this.options = {
      connectionConfig: this.connectionConfig,
      batchSize: options.batchSize ?? 1000,
      createSchema: options.createSchema ?? true,
      dropExisting: options.dropExisting ?? false,
      validateData: options.validateData ?? true,
      onProgress: options.onProgress || (() => {})
    };

    this.pool = new Pool({
      host: this.connectionConfig.host,
      port: this.connectionConfig.port,
      database: this.connectionConfig.database,
      user: this.connectionConfig.user,
      password: this.connectionConfig.password,
      connectionString: this.connectionConfig.connectionString,
      ssl: this.connectionConfig.ssl,
      max: this.connectionConfig.maxConnections || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }

  /**
   * Build connection configuration from environment and options
   */
  private buildConnectionConfig(config?: PostgreSQLConnectionConfig): PostgreSQLConnectionConfig {
    return {
      host: config?.host || process.env.DATABASE_HOST || 'localhost',
      port: config?.port || parseInt(process.env.DATABASE_PORT || '5432'),
      database: config?.database || process.env.DATABASE_NAME || 'viktoria_wertheim',
      user: config?.user || process.env.DATABASE_USERNAME || 'postgres',
      password: config?.password || process.env.DATABASE_PASSWORD || '',
      connectionString: config?.connectionString || process.env.DATABASE_URL,
      ssl: config?.ssl || (process.env.DATABASE_SSL === 'true'),
      schema: config?.schema || process.env.DATABASE_SCHEMA || 'public',
      maxConnections: config?.maxConnections || 10
    };
  }

  /**
   * Import transformed data into PostgreSQL
   */
  async import(transformedData: Record<string, any[]>): Promise<ImportResult> {
    const startTime = new Date();
    const errors: string[] = [];
    const warnings: string[] = [];
    const tablesProcessed: string[] = [];

    try {
      this.emit('importStarted', {
        totalTables: Object.keys(transformedData).length,
        startTime
      });

      // Test connection
      await this.testConnection();
      this.emit('connected', { config: this.sanitizeConfig(this.connectionConfig) });

      // Generate and create schema if requested
      let schemaCreated = false;
      if (this.options.createSchema) {
        await this.createSchema(transformedData);
        schemaCreated = true;
        this.emit('schemaCreated');
      }

      // Calculate total records for progress tracking
      const totalRecords = Object.values(transformedData).reduce((sum, records) => sum + records.length, 0);
      let processedRecords = 0;

      // Determine import order based on foreign key dependencies
      const importOrder = this.determineImportOrder(transformedData);

      // Import data table by table
      for (let i = 0; i < importOrder.length; i++) {
        const tableName = importOrder[i];
        const records = transformedData[tableName];

        if (!records || records.length === 0) {
          warnings.push(`Table ${tableName} has no data to import`);
          continue;
        }

        try {
          this.emit('tableStarted', {
            tableName,
            recordCount: records.length,
            index: i + 1,
            total: importOrder.length
          });

          await this.importTable(tableName, records, processedRecords, totalRecords, startTime);
          
          tablesProcessed.push(tableName);
          processedRecords += records.length;

          this.emit('tableCompleted', {
            tableName,
            recordCount: records.length
          });

        } catch (error) {
          const errorMsg = `Error importing table ${tableName}: ${error.message}`;
          errors.push(errorMsg);
          this.emit('tableError', { tableName, error: errorMsg });
        }
      }

      // Create foreign key constraints after all data is imported
      if (this.options.createSchema) {
        await this.createForeignKeyConstraints(transformedData);
        this.emit('foreignKeysCreated');
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const result: ImportResult = {
        success: errors.length === 0,
        metadata: {
          importDate: endTime,
          totalTables: tablesProcessed.length,
          totalRecords: processedRecords,
          duration,
          connectionConfig: this.sanitizeConfig(this.connectionConfig),
          schemaCreated,
          tablesProcessed
        },
        errors,
        warnings
      };

      this.emit('importCompleted', result.metadata);
      return result;

    } catch (error) {
      const errorMsg = `Import failed: ${error.message}`;
      errors.push(errorMsg);

      return {
        success: false,
        metadata: {
          importDate: new Date(),
          totalTables: 0,
          totalRecords: 0,
          duration: new Date().getTime() - startTime.getTime(),
          connectionConfig: this.sanitizeConfig(this.connectionConfig),
          schemaCreated: false,
          tablesProcessed
        },
        errors,
        warnings
      };
    } finally {
      await this.close();
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
    } finally {
      client.release();
    }
  }

  /**
   * Create database schema
   */
  private async createSchema(transformedData: Record<string, any[]>): Promise<void> {
    const schemas = PostgreSQLSchemaGenerator.generateSchema(transformedData);
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Drop existing tables if requested
      if (this.options.dropExisting) {
        for (const schema of schemas) {
          await client.query(`DROP TABLE IF EXISTS "${schema.name}" CASCADE`);
        }
      }

      // Create tables
      for (const schema of schemas) {
        const createTableSQL = PostgreSQLSchemaGenerator.generateCreateTableSQL(schema);
        await client.query(createTableSQL);

        // Create indexes
        const indexSQLs = PostgreSQLSchemaGenerator.generateCreateIndexSQL(schema);
        for (const indexSQL of indexSQLs) {
          await client.query(indexSQL);
        }
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create foreign key constraints after data import
   */
  private async createForeignKeyConstraints(transformedData: Record<string, any[]>): Promise<void> {
    const schemas = PostgreSQLSchemaGenerator.generateSchema(transformedData);
    const client = await this.pool.connect();

    try {
      for (const schema of schemas) {
        const foreignKeySQLs = PostgreSQLSchemaGenerator.generateForeignKeySQL(schema);
        
        for (const fkSQL of foreignKeySQLs) {
          try {
            await client.query(fkSQL);
          } catch (error) {
            // Log warning but don't fail the import
            this.emit('foreignKeyWarning', {
              table: schema.name,
              constraint: fkSQL,
              error: error.message
            });
          }
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * Import data for a single table with batch processing
   */
  private async importTable(
    tableName: string,
    records: any[],
    processedRecords: number,
    totalRecords: number,
    startTime: Date
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Process records in batches
      for (let i = 0; i < records.length; i += this.options.batchSize) {
        const batch = records.slice(i, i + this.options.batchSize);
        
        await this.importBatch(client, tableName, batch);

        // Emit progress
        const currentProcessed = processedRecords + i + batch.length;
        const progress: ImportProgress = {
          totalTables: 0, // Will be set by caller
          completedTables: 0, // Will be set by caller
          currentTable: tableName,
          totalRecords,
          processedRecords: currentProcessed,
          startTime,
          estimatedTimeRemaining: this.calculateETA(startTime, currentProcessed, totalRecords)
        };

        this.options.onProgress(progress);
        this.emit('progress', progress);

        this.emit('tableBatchProcessed', {
          tableName,
          batchSize: batch.length,
          totalProcessed: i + batch.length,
          totalRecords: records.length
        });
      }

    } finally {
      client.release();
    }
  }

  /**
   * Import a batch of records using prepared statements
   */
  private async importBatch(client: PoolClient, tableName: string, records: any[]): Promise<void> {
    if (records.length === 0) return;

    // Sanitize all timestamps in all records before processing
    const sanitizedRecords = records.map(record => this.sanitizeTimestamps(record));

    const sampleRecord = sanitizedRecords[0];
    const columns = Object.keys(sampleRecord);
    const columnNames = columns.map(col => `"${col}"`).join(', ');
    const placeholders = records.map((_, recordIndex) => {
      const recordPlaceholders = columns.map((_, colIndex) => 
        `$${recordIndex * columns.length + colIndex + 1}`
      ).join(', ');
      return `(${recordPlaceholders})`;
    }).join(', ');

    const sql = `INSERT INTO "${tableName}" (${columnNames}) VALUES ${placeholders} ON CONFLICT (id) DO UPDATE SET ${
      columns.filter(col => col !== 'id').map(col => `"${col}" = EXCLUDED."${col}"`).join(', ')
    }`;

    // Flatten all values for the parameterized query
    const values: any[] = [];
    sanitizedRecords.forEach(record => {
      columns.forEach(column => {
        let value = record[column];
        
        // Handle special PostgreSQL value formatting
        if (value === null || value === undefined) {
          values.push(null);
        } else if (typeof value === 'object' && !(value instanceof Date)) {
          // Convert objects to JSON strings for JSONB columns
          values.push(JSON.stringify(value));
        } else if (typeof value === 'boolean') {
          values.push(value);
        } else {
          values.push(value);
        }
      });
    });

    await client.query(sql, values);
  }

  /**
   * Determine import order based on foreign key dependencies
   */
  private determineImportOrder(transformedData: Record<string, any[]>): string[] {
    const tables = Object.keys(transformedData);
    const dependencies = new Map<string, Set<string>>();

    // Build dependency graph
    tables.forEach(tableName => {
      dependencies.set(tableName, new Set());
      
      const records = transformedData[tableName];
      if (records.length > 0) {
        const sampleRecord = records[0];
        
        // Look for foreign key fields (ending with _id)
        Object.keys(sampleRecord).forEach(fieldName => {
          if (fieldName.endsWith('_id') && fieldName !== 'id') {
            const referencedTable = this.inferReferencedTable(fieldName, tables);
            if (referencedTable && referencedTable !== tableName) {
              dependencies.get(tableName)!.add(referencedTable);
            }
          }
        });
      }
    });

    // Topological sort
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (tableName: string) => {
      if (visiting.has(tableName)) {
        // Circular dependency - skip for now
        return;
      }
      
      if (visited.has(tableName)) {
        return;
      }

      visiting.add(tableName);
      
      // Visit dependencies first
      const deps = dependencies.get(tableName) || new Set();
      deps.forEach(dep => {
        if (tables.includes(dep)) {
          visit(dep);
        }
      });

      visiting.delete(tableName);
      visited.add(tableName);
      result.push(tableName);
    };

    tables.forEach(tableName => {
      if (!visited.has(tableName)) {
        visit(tableName);
      }
    });

    return result;
  }

  /**
   * Infer referenced table from foreign key field name
   */
  private inferReferencedTable(fieldName: string, availableTables: string[]): string | null {
    const baseName = fieldName.replace(/_id$/, '');
    
    // Direct match
    if (availableTables.includes(baseName)) {
      return baseName;
    }
    
    // Try plural form
    const pluralName = `${baseName}s`;
    if (availableTables.includes(pluralName)) {
      return pluralName;
    }
    
    // Common Strapi mappings
    const mappings: Record<string, string> = {
      'created_by': 'admin_users',
      'updated_by': 'admin_users'
    };
    
    const mapped = mappings[baseName];
    if (mapped && availableTables.includes(mapped)) {
      return mapped;
    }
    
    return null;
  }

  /**
   * Calculate estimated time of arrival
   */
  private calculateETA(startTime: Date, processed: number, total: number): number {
    if (processed === 0) return 0;
    
    const elapsed = new Date().getTime() - startTime.getTime();
    const rate = processed / elapsed;
    const remaining = total - processed;
    return remaining / rate;
  }

  /**
   * Sanitize connection config for logging (remove sensitive data)
   */
  private sanitizeConfig(config: PostgreSQLConnectionConfig): Partial<PostgreSQLConnectionConfig> {
    return {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      schema: config.schema,
      ssl: !!config.ssl
    };
  }

  /**
   * Sanitize timestamps in a record to fix invalid dates
   */
  private sanitizeTimestamps(record: any): any {
    if (!record || typeof record !== 'object') return record;
    
    const timestampFields = ['created_at', 'updated_at', 'published_at'];
    const sanitized = { ...record };
    
    for (const field of timestampFields) {
      if (sanitized[field]) {
        const date = new Date(sanitized[field]);
        if (isNaN(date.getTime()) || date.getFullYear() < 1900 || date.getFullYear() > 2100) {
          console.warn(`Sanitized invalid timestamp in ${field}: ${sanitized[field]} -> ${new Date().toISOString()}`);
          sanitized[field] = new Date().toISOString();
        }
      }
    }
    
    return sanitized;
  }

  /**
   * Close database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Convenience function for simple imports
export async function importData(
  transformedData: Record<string, any[]>,
  options: ImportOptions = {}
): Promise<ImportResult> {
  const importer = new PostgreSQLImporter(options);
  return await importer.import(transformedData);
}