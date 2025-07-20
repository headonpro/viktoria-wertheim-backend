import { EventEmitter } from 'events';

export interface TransformationOptions {
  validateData?: boolean;
  preserveIds?: boolean;
  batchSize?: number;
  onProgress?: (progress: TransformationProgress) => void;
}

export interface TransformationProgress {
  totalRecords: number;
  processedRecords: number;
  currentTable: string;
  startTime: Date;
  estimatedTimeRemaining?: number;
}

export interface TransformationResult {
  success: boolean;
  transformedData: Record<string, any[]>;
  metadata: {
    transformationDate: Date;
    totalRecords: number;
    totalTables: number;
    duration: number;
    validationErrors: ValidationError[];
  };
  errors: string[];
}

export interface ValidationError {
  table: string;
  recordId?: any;
  field: string;
  error: string;
  severity: 'warning' | 'error';
}

export interface DataTypeMapping {
  sqliteType: string;
  postgresType: string;
  converter?: (value: any) => any;
  validator?: (value: any) => boolean;
}

export interface RelationshipMapping {
  sourceTable: string;
  sourceField: string;
  targetTable: string;
  targetField: string;
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  cascadeDelete?: boolean;
}

/**
 * Data type conversion utilities for SQLite to PostgreSQL migration
 */
export class DataTypeConverter {
  private static readonly TYPE_MAPPINGS: Record<string, DataTypeMapping> = {
    'INTEGER': {
      sqliteType: 'INTEGER',
      postgresType: 'INTEGER',
      converter: (value: any) => {
        if (value === null || value === undefined) return null;
        return parseInt(value, 10);
      },
      validator: (value: any) => value === null || Number.isInteger(value)
    },
    'TEXT': {
      sqliteType: 'TEXT',
      postgresType: 'TEXT',
      converter: (value: any) => {
        if (value === null || value === undefined) return null;
        return String(value);
      },
      validator: (value: any) => value === null || typeof value === 'string'
    },
    'REAL': {
      sqliteType: 'REAL',
      postgresType: 'DECIMAL',
      converter: (value: any) => {
        if (value === null || value === undefined) return null;
        return parseFloat(value);
      },
      validator: (value: any) => value === null || !isNaN(parseFloat(value))
    },
    'BLOB': {
      sqliteType: 'BLOB',
      postgresType: 'BYTEA',
      converter: (value: any) => {
        if (value === null || value === undefined) return null;
        // Convert Buffer to hex string for PostgreSQL BYTEA
        if (Buffer.isBuffer(value)) {
          return '\\x' + value.toString('hex');
        }
        return value;
      },
      validator: (value: any) => value === null || Buffer.isBuffer(value) || typeof value === 'string'
    },
    'DATETIME': {
      sqliteType: 'DATETIME',
      postgresType: 'TIMESTAMP',
      converter: (value: any) => {
        if (value === null || value === undefined) return null;
        
        // Handle various date formats
        if (value instanceof Date) {
          return value.toISOString();
        }
        
        if (typeof value === 'string') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        }
        
        if (typeof value === 'number') {
          // Unix timestamp
          const date = new Date(value * 1000);
          return date.toISOString();
        }
        
        return null;
      },
      validator: (value: any) => {
        if (value === null || value === undefined) return true;
        const date = new Date(value);
        return !isNaN(date.getTime());
      }
    },
    'BOOLEAN': {
      sqliteType: 'BOOLEAN',
      postgresType: 'BOOLEAN',
      converter: (value: any) => {
        if (value === null || value === undefined) return null;
        
        // SQLite stores booleans as integers (0/1)
        if (typeof value === 'number') {
          return value === 1;
        }
        
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true' || value === '1';
        }
        
        return Boolean(value);
      },
      validator: (value: any) => value === null || typeof value === 'boolean' || value === 0 || value === 1
    },
    'JSON': {
      sqliteType: 'TEXT',
      postgresType: 'JSONB',
      converter: (value: any) => {
        if (value === null || value === undefined) return null;
        
        if (typeof value === 'string') {
          try {
            // Validate JSON and return as object for PostgreSQL JSONB
            return JSON.parse(value);
          } catch (e) {
            // If not valid JSON, return as string
            return value;
          }
        }
        
        if (typeof value === 'object') {
          return value;
        }
        
        return value;
      },
      validator: (value: any) => {
        if (value === null || value === undefined) return true;
        
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
            return true;
          } catch (e) {
            return false;
          }
        }
        
        return typeof value === 'object';
      }
    }
  };

  /**
   * Convert a value from SQLite type to PostgreSQL type
   */
  static convertValue(value: any, sqliteType: string, fieldName?: string): any {
    const mapping = this.TYPE_MAPPINGS[sqliteType.toUpperCase()];
    
    if (!mapping) {
      // Default to TEXT conversion for unknown types
      return this.TYPE_MAPPINGS.TEXT.converter!(value);
    }
    
    try {
      return mapping.converter!(value);
    } catch (error) {
      throw new Error(`Failed to convert value for field ${fieldName}: ${error.message}`);
    }
  }

  /**
   * Validate a value against its expected PostgreSQL type
   */
  static validateValue(value: any, sqliteType: string, fieldName?: string): boolean {
    const mapping = this.TYPE_MAPPINGS[sqliteType.toUpperCase()];
    
    if (!mapping) {
      return true; // Allow unknown types
    }
    
    try {
      return mapping.validator!(value);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get PostgreSQL type for SQLite type
   */
  static getPostgreSQLType(sqliteType: string): string {
    const mapping = this.TYPE_MAPPINGS[sqliteType.toUpperCase()];
    return mapping ? mapping.postgresType : 'TEXT';
  }

  /**
   * Detect field type from sample values
   */
  static detectFieldType(values: any[]): string {
    const nonNullValues = values.filter(v => v !== null && v !== undefined);
    
    if (nonNullValues.length === 0) return 'TEXT';
    
    // Check for JSON strings
    const jsonCount = nonNullValues.filter(v => {
      if (typeof v === 'string') {
        try {
          JSON.parse(v);
          return true;
        } catch (e) {
          return false;
        }
      }
      return false;
    }).length;
    
    if (jsonCount > nonNullValues.length * 0.5) return 'JSON';
    
    // Check for dates
    const dateCount = nonNullValues.filter(v => {
      if (typeof v === 'string') {
        const date = new Date(v);
        return !isNaN(date.getTime()) && v.match(/\d{4}-\d{2}-\d{2}/);
      }
      return false;
    }).length;
    
    if (dateCount > nonNullValues.length * 0.5) return 'DATETIME';
    
    // Check for booleans (including 0/1) - check this before numbers
    const actualBooleanCount = nonNullValues.filter(v => typeof v === 'boolean').length;
    const zeroOneCount = nonNullValues.filter(v => v === 0 || v === 1).length;
    
    // If all values are actual booleans, return BOOLEAN
    if (actualBooleanCount === nonNullValues.length) return 'BOOLEAN';
    
    // If all values are 0 or 1 (and they're numbers), it's likely boolean
    if (zeroOneCount === nonNullValues.length && nonNullValues.every(v => typeof v === 'number')) {
      return 'BOOLEAN';
    }
    
    // Check for numbers
    const numberCount = nonNullValues.filter(v => typeof v === 'number').length;
    if (numberCount === nonNullValues.length) {
      const integerCount = nonNullValues.filter(v => Number.isInteger(v)).length;
      return integerCount === nonNullValues.length ? 'INTEGER' : 'REAL';
    }
    
    // Default to TEXT
    return 'TEXT';
  }
}

/**
 * Content relationship mapping utilities
 */
export class RelationshipMapper {
  private relationships: Map<string, RelationshipMapping[]> = new Map();

  /**
   * Add a relationship mapping
   */
  addRelationship(mapping: RelationshipMapping): void {
    const key = `${mapping.sourceTable}.${mapping.sourceField}`;
    const existing = this.relationships.get(mapping.sourceTable) || [];
    existing.push(mapping);
    this.relationships.set(mapping.sourceTable, existing);
  }

  /**
   * Get relationships for a table
   */
  getRelationships(tableName: string): RelationshipMapping[] {
    return this.relationships.get(tableName) || [];
  }

  /**
   * Build relationship mappings from foreign key information
   */
  buildFromForeignKeys(foreignKeyData: Record<string, any[]>): void {
    for (const [tableName, foreignKeys] of Object.entries(foreignKeyData)) {
      foreignKeys.forEach(fk => {
        this.addRelationship({
          sourceTable: tableName,
          sourceField: fk.from,
          targetTable: fk.table,
          targetField: fk.to,
          relationType: 'one-to-many', // Default, can be refined
          cascadeDelete: fk.on_delete === 'CASCADE'
        });
      });
    }
  }

  /**
   * Validate relationship integrity
   */
  validateRelationships(data: Record<string, any[]>): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [tableName, records] of Object.entries(data)) {
      const relationships = this.getRelationships(tableName);
      
      relationships.forEach(rel => {
        const targetRecords = data[rel.targetTable];
        if (!targetRecords) {
          errors.push({
            table: tableName,
            field: rel.sourceField,
            error: `Referenced table ${rel.targetTable} not found`,
            severity: 'error'
          });
          return;
        }

        // Check referential integrity
        records.forEach(record => {
          const foreignKeyValue = record[rel.sourceField];
          if (foreignKeyValue !== null && foreignKeyValue !== undefined) {
            const referencedRecord = targetRecords.find(
              target => target[rel.targetField] === foreignKeyValue
            );
            
            if (!referencedRecord) {
              errors.push({
                table: tableName,
                recordId: record.id,
                field: rel.sourceField,
                error: `Referenced record with ${rel.targetField}=${foreignKeyValue} not found in ${rel.targetTable}`,
                severity: 'error'
              });
            }
          }
        });
      });
    }

    return errors;
  }

  /**
   * Resolve relationship dependencies for import order
   */
  getImportOrder(tableNames: string[]): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (tableName: string) => {
      if (visiting.has(tableName)) {
        // Circular dependency detected, add to result anyway
        return;
      }
      
      if (visited.has(tableName)) {
        return;
      }

      visiting.add(tableName);
      
      // Visit dependencies first (tables that this table depends on)
      const relationships = this.getRelationships(tableName);
      relationships.forEach(rel => {
        if (tableNames.includes(rel.targetTable)) {
          visit(rel.targetTable);
        }
      });

      visiting.delete(tableName);
      visited.add(tableName);
      result.push(tableName);
    };

    tableNames.forEach(tableName => {
      if (!visited.has(tableName)) {
        visit(tableName);
      }
    });

    return result; // Don't reverse - dependencies are already visited first
  }
}

/**
 * Data validation and integrity checker
 */
export class DataValidator {
  private validationRules: Map<string, Array<(record: any) => ValidationError | null>> = new Map();

  /**
   * Add validation rule for a table
   */
  addValidationRule(
    tableName: string, 
    rule: (record: any) => ValidationError | null
  ): void {
    const existing = this.validationRules.get(tableName) || [];
    existing.push(rule);
    this.validationRules.set(tableName, existing);
  }

  /**
   * Add common Strapi validation rules
   */
  addStrapiValidationRules(): void {
    // Common ID validation
    const idValidation = (record: any) => {
      if (!record.id || typeof record.id !== 'number') {
        return {
          table: 'unknown',
          recordId: record.id,
          field: 'id',
          error: 'Invalid or missing ID field',
          severity: 'error' as const
        };
      }
      return null;
    };

    // Timestamp validation and correction
    const timestampValidation = (record: any) => {
      const timestampFields = ['created_at', 'updated_at', 'published_at'];
      for (const field of timestampFields) {
        if (record[field] && !this.isValidTimestamp(record[field])) {
          // Fix the invalid timestamp
          record[field] = this.fixInvalidTimestamp(record[field]);
          return {
            table: 'unknown',
            recordId: record.id,
            field,
            error: `Fixed invalid timestamp format: ${record[field]}`,
            severity: 'warning' as const
          };
        }
      }
      return null;
    };

    // Apply to all tables (including system tables)
    const allTables = [
      'sponsors', 'news_artikels', 'mannschafts', 'spielers', 'spiels', 'trainings', 'mitglieds', 'kategorien', 'leaderboard_entries',
      'admin_users', 'admin_permissions', 'admin_roles', 'up_users', 'up_permissions', 'up_roles',
      'files', 'upload_folders', 'i18n_locale'
    ];
    
    allTables.forEach(table => {
      this.addValidationRule(table, idValidation);
      this.addValidationRule(table, timestampValidation);
    });
  }

  /**
   * Validate all records in a dataset
   */
  validateData(data: Record<string, any[]>): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const [tableName, records] of Object.entries(data)) {
      const rules = this.validationRules.get(tableName) || [];
      
      records.forEach(record => {
        rules.forEach(rule => {
          const error = rule(record);
          if (error) {
            error.table = tableName;
            errors.push(error);
          }
        });
      });
    }

    return errors;
  }

  /**
   * Check if value is a valid timestamp
   */
  private isValidTimestamp(value: any): boolean {
    if (!value) return true; // Allow null/undefined
    
    const date = new Date(value);
    if (isNaN(date.getTime())) return false;
    
    // Check for realistic date ranges (1900-2100)
    const year = date.getFullYear();
    return year >= 1900 && year <= 2100;
  }

  /**
   * Fix invalid timestamps by setting them to current date or null
   */
  private fixInvalidTimestamp(value: any): string | null {
    if (!value) return null;
    
    if (this.isValidTimestamp(value)) return value;
    
    // For obviously corrupted dates, return current timestamp
    console.warn(`Fixed invalid timestamp: ${value} -> ${new Date().toISOString()}`);
    return new Date().toISOString();
  }

  /**
   * Global timestamp sanitizer - fixes ALL timestamp fields in any record
   */
  static sanitizeTimestamps(record: any): any {
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
   * Validate data integrity across tables
   */
  validateIntegrity(data: Record<string, any[]>): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check for duplicate IDs within tables
    for (const [tableName, records] of Object.entries(data)) {
      const ids = new Set();
      records.forEach(record => {
        if (record.id) {
          if (ids.has(record.id)) {
            errors.push({
              table: tableName,
              recordId: record.id,
              field: 'id',
              error: `Duplicate ID found: ${record.id}`,
              severity: 'error'
            });
          }
          ids.add(record.id);
        }
      });
    }

    return errors;
  }
}

/**
 * Main data transformation class
 */
export class DataTransformer extends EventEmitter {
  private options: Required<TransformationOptions>;
  private relationshipMapper: RelationshipMapper;
  private validator: DataValidator;

  constructor(options: TransformationOptions = {}) {
    super();
    
    this.options = {
      validateData: options.validateData ?? true,
      preserveIds: options.preserveIds ?? true,
      batchSize: options.batchSize ?? 1000,
      onProgress: options.onProgress || (() => {})
    };

    this.relationshipMapper = new RelationshipMapper();
    this.validator = new DataValidator();
    
    // Add default Strapi validation rules
    this.validator.addStrapiValidationRules();
  }

  /**
   * Transform exported SQLite data for PostgreSQL import
   */
  async transform(exportedData: any): Promise<TransformationResult> {
    const startTime = new Date();
    const errors: string[] = [];
    const validationErrors: ValidationError[] = [];

    try {
      this.emit('transformationStarted', {
        totalTables: Object.keys(exportedData.data).length,
        startTime
      });

      // Build relationship mappings from foreign key data
      this.buildRelationshipMappings(exportedData.data);

      const transformedData: Record<string, any[]> = {};
      let totalRecords = 0;
      let processedRecords = 0;

      // Calculate total records for progress tracking
      for (const [tableName, tableData] of Object.entries(exportedData.data)) {
        totalRecords += (tableData as any).data?.length || 0;
      }

      // Transform each table
      for (const [tableName, tableData] of Object.entries(exportedData.data)) {
        try {
          this.emit('tableTransformationStarted', { tableName });

          const transformedRecords = await this.transformTable(
            tableName,
            tableData as any,
            processedRecords,
            totalRecords,
            startTime
          );

          transformedData[tableName] = transformedRecords;
          processedRecords += transformedRecords.length;

          this.emit('tableTransformationCompleted', {
            tableName,
            recordCount: transformedRecords.length
          });

        } catch (error) {
          const errorMsg = `Error transforming table ${tableName}: ${error.message}`;
          errors.push(errorMsg);
          this.emit('tableTransformationError', { tableName, error: errorMsg });
        }
      }

      // Validate data if requested
      if (this.options.validateData) {
        this.emit('validationStarted');
        
        const dataValidationErrors = this.validator.validateData(transformedData);
        const integrityErrors = this.validator.validateIntegrity(transformedData);
        const relationshipErrors = this.relationshipMapper.validateRelationships(transformedData);
        
        validationErrors.push(...dataValidationErrors, ...integrityErrors, ...relationshipErrors);
        
        this.emit('validationCompleted', {
          errorCount: validationErrors.length,
          warningCount: validationErrors.filter(e => e.severity === 'warning').length
        });
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const result: TransformationResult = {
        success: errors.length === 0 && validationErrors.filter(e => e.severity === 'error').length === 0,
        transformedData,
        metadata: {
          transformationDate: endTime,
          totalRecords: processedRecords,
          totalTables: Object.keys(transformedData).length,
          duration,
          validationErrors
        },
        errors
      };

      this.emit('transformationCompleted', result.metadata);
      return result;

    } catch (error) {
      const errorMsg = `Transformation failed: ${error.message}`;
      errors.push(errorMsg);
      
      return {
        success: false,
        transformedData: {},
        metadata: {
          transformationDate: new Date(),
          totalRecords: 0,
          totalTables: 0,
          duration: new Date().getTime() - startTime.getTime(),
          validationErrors
        },
        errors
      };
    }
  }

  /**
   * Transform a single table's data
   */
  private async transformTable(
    tableName: string,
    tableData: any,
    processedRecords: number,
    totalRecords: number,
    startTime: Date
  ): Promise<any[]> {
    const { data: records, schema } = tableData;
    const transformedRecords: any[] = [];

    // Build field type mapping from schema
    const fieldTypes = this.buildFieldTypeMapping(schema, records);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const transformedRecord: any = {};

      // Transform each field
      for (const [fieldName, value] of Object.entries(record)) {
        if (fieldName.endsWith('_is_json')) {
          continue; // Skip JSON marker fields
        }

        const fieldType = fieldTypes[fieldName] || 'TEXT';
        
        try {
          transformedRecord[fieldName] = DataTypeConverter.convertValue(
            value,
            fieldType,
            `${tableName}.${fieldName}`
          );
        } catch (error) {
          throw new Error(`Field conversion failed for ${tableName}.${fieldName}: ${error.message}`);
        }
      }

      transformedRecords.push(transformedRecord);

      // Emit progress periodically
      if (i % this.options.batchSize === 0) {
        const currentProcessed = processedRecords + i;
        const progress: TransformationProgress = {
          totalRecords,
          processedRecords: currentProcessed,
          currentTable: tableName,
          startTime,
          estimatedTimeRemaining: this.calculateETA(startTime, currentProcessed, totalRecords)
        };

        this.options.onProgress(progress);
        this.emit('progress', progress);
      }
    }

    return transformedRecords;
  }

  /**
   * Build field type mapping from schema and sample data
   */
  private buildFieldTypeMapping(schema: any[], records: any[]): Record<string, string> {
    const fieldTypes: Record<string, string> = {};

    // Use schema information if available
    schema.forEach(column => {
      fieldTypes[column.name] = column.type || 'TEXT';
    });

    // Enhance with data type detection for better accuracy
    if (records.length > 0) {
      const sampleSize = Math.min(100, records.length);
      const sampleRecords = records.slice(0, sampleSize);

      Object.keys(sampleRecords[0] || {}).forEach(fieldName => {
        if (fieldName.endsWith('_is_json')) return;

        const values = sampleRecords.map(record => record[fieldName]);
        const detectedType = DataTypeConverter.detectFieldType(values);
        
        // Use detected type if more specific than schema type
        if (!fieldTypes[fieldName] || fieldTypes[fieldName] === 'TEXT') {
          fieldTypes[fieldName] = detectedType;
        }
      });
    }

    return fieldTypes;
  }

  /**
   * Build relationship mappings from exported data
   */
  private buildRelationshipMappings(data: Record<string, any>): void {
    for (const [tableName, tableData] of Object.entries(data)) {
      if (tableData.foreignKeys) {
        tableData.foreignKeys.forEach((fk: any) => {
          this.relationshipMapper.addRelationship({
            sourceTable: tableName,
            sourceField: fk.from,
            targetTable: fk.table,
            targetField: fk.to,
            relationType: 'one-to-many',
            cascadeDelete: fk.on_delete === 'CASCADE'
          });
        });
      }
    }
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
   * Get relationship mapper instance
   */
  getRelationshipMapper(): RelationshipMapper {
    return this.relationshipMapper;
  }

  /**
   * Get validator instance
   */
  getValidator(): DataValidator {
    return this.validator;
  }
}

// Convenience function for simple transformations
export async function transformData(
  exportedData: any,
  options: TransformationOptions = {}
): Promise<TransformationResult> {
  const transformer = new DataTransformer(options);
  return await transformer.transform(exportedData);
}
// Main execution function
async function main() {
  console.log('🔄 Starting data transformation...');
  
  try {
    const transformer = new DataTransformer({
      validateData: true,
      preserveIds: true,
      batchSize: 100,
      onProgress: (progress) => {
        const percent = Math.round((progress.processedRecords / progress.totalRecords) * 100);
        console.log(`📊 Processing ${progress.currentTable}: ${percent}% (${progress.processedRecords}/${progress.totalRecords})`);
      }
    });

    // Find the latest export file
    const fs = require('fs');
    const path = require('path');
    const exportsDir = path.join(__dirname, '../exports');
    
    if (!fs.existsSync(exportsDir)) {
      throw new Error('No exports directory found. Please run SQLite export first.');
    }

    const exportFiles = fs.readdirSync(exportsDir)
      .filter((file: string) => file.startsWith('sqlite-export-') && file.endsWith('.json'))
      .sort()
      .reverse();

    if (exportFiles.length === 0) {
      throw new Error('No SQLite export files found. Please run SQLite export first.');
    }

    const latestExportFile = path.join(exportsDir, exportFiles[0]);
    console.log(`📂 Using export file: ${exportFiles[0]}`);

    // Load SQLite data
    const sqliteData = JSON.parse(fs.readFileSync(latestExportFile, 'utf8'));
    
    // Transform data
    const result = await transformer.transform(sqliteData);
    
    if (result.success) {
      // Save transformed data
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFile = path.join(exportsDir, `postgresql-data-${timestamp}.json`);
      
      fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
      
      console.log('✅ Data transformation completed successfully!');
      console.log(`📁 Output file: ${path.basename(outputFile)}`);
      console.log(`📊 Transformed ${result.metadata.totalRecords} records from ${result.metadata.totalTables} tables`);
      
      if (result.metadata.validationErrors.length > 0) {
        console.log(`⚠️  ${result.metadata.validationErrors.length} validation warnings`);
      }
    } else {
      console.error('❌ Data transformation failed:');
      result.errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Transformation error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}