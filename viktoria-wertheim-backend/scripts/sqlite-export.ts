import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export interface ExportProgress {
  totalTables: number;
  completedTables: number;
  currentTable: string;
  totalRecords: number;
  processedRecords: number;
  startTime: Date;
  estimatedTimeRemaining?: number;
}

export interface ExportResult {
  success: boolean;
  data: Record<string, any[]>;
  metadata: {
    exportDate: Date;
    totalRecords: number;
    totalTables: number;
    duration: number;
    databasePath: string;
    contentTypes: string[];
  };
  errors: string[];
}

export interface ExportOptions {
  databasePath?: string;
  outputPath?: string;
  includeSystemTables?: boolean;
  batchSize?: number;
  onProgress?: (progress: ExportProgress) => void;
}

export class SQLiteExporter extends EventEmitter {
  private db: Database.Database | null = null;
  private options: Required<ExportOptions>;

  constructor(options: ExportOptions = {}) {
    super();
    this.options = {
      databasePath: options.databasePath || path.join(__dirname, '../.tmp/data.db'),
      outputPath: options.outputPath || path.join(__dirname, '../exports'),
      includeSystemTables: options.includeSystemTables || false,
      batchSize: options.batchSize || 1000,
      onProgress: options.onProgress || (() => {}),
    };
  }

  /**
   * Initialize database connection
   */
  private initializeDatabase(): void {
    if (!fs.existsSync(this.options.databasePath)) {
      throw new Error(`SQLite database not found at: ${this.options.databasePath}`);
    }

    this.db = new Database(this.options.databasePath, { readonly: true });
    this.emit('connected', { path: this.options.databasePath });
  }

  /**
   * Get all table names from the database
   */
  private getTables(): string[] {
    if (!this.db) throw new Error('Database not initialized');

    const query = `
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      ${!this.options.includeSystemTables ? "AND name NOT LIKE 'strapi_%'" : ''}
      ORDER BY name
    `;

    const tables = this.db.prepare(query).all() as { name: string }[];
    return tables.map(table => table.name);
  }

  /**
   * Get table schema information
   */
  private getTableSchema(tableName: string): any[] {
    if (!this.db) throw new Error('Database not initialized');

    const schema = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
    return schema;
  }

  /**
   * Get foreign key information for a table
   */
  private getForeignKeys(tableName: string): any[] {
    if (!this.db) throw new Error('Database not initialized');

    const foreignKeys = this.db.prepare(`PRAGMA foreign_key_list(${tableName})`).all();
    return foreignKeys;
  }

  /**
   * Export data from a single table with relationship information
   */
  private exportTable(tableName: string): {
    data: any[];
    schema: any[];
    foreignKeys: any[];
    recordCount: number;
  } {
    if (!this.db) throw new Error('Database not initialized');

    const schema = this.getTableSchema(tableName);
    const foreignKeys = this.getForeignKeys(tableName);
    
    // Get total record count
    const countResult = this.db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
    const totalRecords = countResult.count;

    // Export data in batches
    const allData: any[] = [];
    const batchSize = this.options.batchSize;
    
    for (let offset = 0; offset < totalRecords; offset += batchSize) {
      const batchData = this.db.prepare(
        `SELECT * FROM ${tableName} LIMIT ${batchSize} OFFSET ${offset}`
      ).all();
      
      allData.push(...batchData);
      
      this.emit('tableBatchProcessed', {
        tableName,
        batchSize: batchData.length,
        totalProcessed: allData.length,
        totalRecords
      });
    }

    return {
      data: allData,
      schema,
      foreignKeys,
      recordCount: totalRecords
    };
  }

  /**
   * Serialize relationships and prepare data for PostgreSQL import
   */
  private serializeRelationships(data: Record<string, any>): Record<string, any> {
    const serializedData: Record<string, any> = {};

    for (const [tableName, tableData] of Object.entries(data)) {
      serializedData[tableName] = {
        ...tableData,
        // Add relationship mapping for easier PostgreSQL import
        relationshipMap: this.buildRelationshipMap(tableName, tableData.foreignKeys),
        // Serialize JSON fields if any
        serializedRecords: this.serializeJsonFields(tableData.data)
      };
    }

    return serializedData;
  }

  /**
   * Build relationship mapping for a table
   */
  private buildRelationshipMap(tableName: string, foreignKeys: any[]): Record<string, any> {
    const relationshipMap: Record<string, any> = {};

    foreignKeys.forEach(fk => {
      relationshipMap[fk.from] = {
        referencedTable: fk.table,
        referencedColumn: fk.to,
        onDelete: fk.on_delete,
        onUpdate: fk.on_update
      };
    });

    return relationshipMap;
  }

  /**
   * Serialize JSON fields in records
   */
  private serializeJsonFields(records: any[]): any[] {
    return records.map(record => {
      const serializedRecord = { ...record };
      
      // Handle potential JSON fields (common in Strapi)
      Object.keys(serializedRecord).forEach(key => {
        const value = serializedRecord[key];
        
        // Only process string values
        if (typeof value === 'string') {
          // Check if value looks like JSON string
          if (value.startsWith('{') || value.startsWith('[')) {
            try {
              serializedRecord[key] = JSON.parse(value);
              serializedRecord[`${key}_is_json`] = true;
            } catch (e) {
              // Not JSON, keep as string
              serializedRecord[`${key}_is_json`] = false;
            }
          } else {
            // Regular string, mark as not JSON
            serializedRecord[`${key}_is_json`] = false;
          }
        }
      });

      return serializedRecord;
    });
  }

  /**
   * Main export function
   */
  async export(): Promise<ExportResult> {
    const startTime = new Date();
    const errors: string[] = [];
    let totalRecords = 0;
    let processedRecords = 0;

    try {
      this.initializeDatabase();
      
      const tables = this.getTables();
      const exportData: Record<string, any> = {};

      this.emit('exportStarted', {
        totalTables: tables.length,
        tables,
        startTime
      });

      // Create exports directory if it doesn't exist
      if (!fs.existsSync(this.options.outputPath)) {
        fs.mkdirSync(this.options.outputPath, { recursive: true });
      }

      for (let i = 0; i < tables.length; i++) {
        const tableName = tables[i];
        
        try {
          this.emit('tableStarted', { tableName, index: i + 1, total: tables.length });
          
          const tableExport = this.exportTable(tableName);
          exportData[tableName] = tableExport;
          totalRecords += tableExport.recordCount;
          processedRecords += tableExport.recordCount;

          const progress: ExportProgress = {
            totalTables: tables.length,
            completedTables: i + 1,
            currentTable: tableName,
            totalRecords,
            processedRecords,
            startTime,
            estimatedTimeRemaining: this.calculateETA(startTime, i + 1, tables.length)
          };

          this.options.onProgress(progress);
          this.emit('tableCompleted', { tableName, recordCount: tableExport.recordCount });

        } catch (error) {
          const errorMsg = `Error exporting table ${tableName}: ${error.message}`;
          errors.push(errorMsg);
          this.emit('tableError', { tableName, error: errorMsg });
        }
      }

      // Serialize relationships
      const serializedData = this.serializeRelationships(exportData);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const result: ExportResult = {
        success: errors.length === 0,
        data: serializedData,
        metadata: {
          exportDate: endTime,
          totalRecords,
          totalTables: tables.length,
          duration,
          databasePath: this.options.databasePath,
          contentTypes: tables
        },
        errors
      };

      // Save export to file
      const exportFileName = `sqlite-export-${endTime.toISOString().replace(/[:.]/g, '-')}.json`;
      const exportFilePath = path.join(this.options.outputPath, exportFileName);
      
      fs.writeFileSync(exportFilePath, JSON.stringify(result, null, 2));
      
      this.emit('exportCompleted', {
        ...result.metadata,
        exportFilePath,
        success: result.success,
        errorCount: errors.length
      });

      return result;

    } catch (error) {
      const errorMsg = `Export failed: ${error.message}`;
      errors.push(errorMsg);
      
      this.emit('exportError', { error: errorMsg });
      
      return {
        success: false,
        data: {},
        metadata: {
          exportDate: new Date(),
          totalRecords: 0,
          totalTables: 0,
          duration: new Date().getTime() - startTime.getTime(),
          databasePath: this.options.databasePath,
          contentTypes: []
        },
        errors
      };
    } finally {
      if (this.db) {
        this.db.close();
        this.emit('disconnected');
      }
    }
  }

  /**
   * Calculate estimated time of arrival
   */
  private calculateETA(startTime: Date, completed: number, total: number): number {
    const elapsed = new Date().getTime() - startTime.getTime();
    const rate = completed / elapsed;
    const remaining = total - completed;
    return remaining / rate;
  }

  /**
   * Get database statistics without full export
   */
  async getStatistics(): Promise<{
    tables: Array<{ name: string; recordCount: number; }>;
    totalRecords: number;
    databaseSize: number;
  }> {
    this.initializeDatabase();
    
    try {
      const tables = this.getTables();
      const tableStats = tables.map(tableName => {
        const countResult = this.db!.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
        return {
          name: tableName,
          recordCount: countResult.count
        };
      });

      const totalRecords = tableStats.reduce((sum, table) => sum + table.recordCount, 0);
      const databaseSize = fs.statSync(this.options.databasePath).size;

      return {
        tables: tableStats,
        totalRecords,
        databaseSize
      };
    } finally {
      if (this.db) {
        this.db.close();
      }
    }
  }
}

// Convenience function for simple exports
export async function exportSQLiteData(options: ExportOptions = {}): Promise<ExportResult> {
  const exporter = new SQLiteExporter(options);
  return await exporter.export();
}