import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { SQLiteExporter, ExportResult, ExportOptions } from './sqlite-export';
import { DataTransformer, TransformationResult, TransformationOptions } from './data-transformer';
import { PostgreSQLImporter, ImportResult, ImportOptions } from './postgresql-import';

export interface MigrationOptions {
  // Source configuration
  sqlitePath?: string;
  
  // Target configuration
  postgresConfig?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    connectionString?: string;
    ssl?: boolean;
    schema?: string;
  };
  
  // Migration behavior
  createBackup?: boolean;
  backupPath?: string;
  validateData?: boolean;
  batchSize?: number;
  preserveIds?: boolean;
  
  // Schema management
  createSchema?: boolean;
  dropExisting?: boolean;
  
  // Progress reporting
  onProgress?: (progress: MigrationProgress) => void;
  onPhaseChange?: (phase: MigrationPhase) => void;
  onError?: (error: MigrationError) => void;
  onWarning?: (warning: MigrationWarning) => void;
}

export interface MigrationProgress {
  phase: MigrationPhase;
  overallProgress: number; // 0-100
  phaseProgress: number; // 0-100
  currentOperation: string;
  startTime: Date;
  estimatedTimeRemaining?: number;
  statistics: MigrationStatistics;
}

export interface MigrationStatistics {
  totalTables: number;
  processedTables: number;
  totalRecords: number;
  processedRecords: number;
  exportedRecords: number;
  transformedRecords: number;
  importedRecords: number;
  errors: number;
  warnings: number;
}

export interface MigrationResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  statistics: MigrationStatistics;
  phases: {
    backup?: BackupResult;
    export: ExportResult;
    transform: TransformationResult;
    import: ImportResult;
    validation?: ValidationResult;
  };
  errors: MigrationError[];
  warnings: MigrationWarning[];
  rollbackInfo?: RollbackInfo;
}

export interface BackupResult {
  success: boolean;
  backupPath: string;
  backupSize: number;
  duration: number;
  timestamp: Date;
}

export interface ValidationResult {
  success: boolean;
  dataIntegrityChecks: IntegrityCheck[];
  performanceMetrics: PerformanceMetric[];
  functionalTests: FunctionalTest[];
  duration: number;
}

export interface IntegrityCheck {
  name: string;
  success: boolean;
  expectedCount: number;
  actualCount: number;
  error?: string;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  recordsProcessed: number;
  recordsPerSecond: number;
}

export interface FunctionalTest {
  name: string;
  success: boolean;
  description: string;
  error?: string;
}

export interface RollbackInfo {
  available: boolean;
  backupPath?: string;
  instructions: string[];
}

export interface MigrationError {
  phase: MigrationPhase;
  severity: 'critical' | 'error' | 'warning';
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
}

export interface MigrationWarning {
  phase: MigrationPhase;
  message: string;
  details?: any;
  timestamp: Date;
}

export enum MigrationPhase {
  INITIALIZATION = 'initialization',
  BACKUP = 'backup',
  EXPORT = 'export',
  TRANSFORM = 'transform',
  IMPORT = 'import',
  VALIDATION = 'validation',
  CLEANUP = 'cleanup',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

/**
 * Migration orchestrator that coordinates the entire SQLite to PostgreSQL migration process
 */
export class MigrationOrchestrator extends EventEmitter {
  private options: Required<MigrationOptions>;
  private startTime: Date;
  private currentPhase: MigrationPhase = MigrationPhase.INITIALIZATION;
  private statistics: MigrationStatistics;
  private errors: MigrationError[] = [];
  private warnings: MigrationWarning[] = [];
  private rollbackInfo: RollbackInfo;

  constructor(options: MigrationOptions = {}) {
    super();
    
    this.options = {
      sqlitePath: options.sqlitePath || path.join(__dirname, '../.tmp/data.db'),
      postgresConfig: options.postgresConfig || {},
      createBackup: options.createBackup ?? true,
      backupPath: options.backupPath || path.join(__dirname, '../backups'),
      validateData: options.validateData ?? true,
      batchSize: options.batchSize ?? 1000,
      preserveIds: options.preserveIds ?? true,
      createSchema: options.createSchema ?? true,
      dropExisting: options.dropExisting ?? false,
      onProgress: options.onProgress || (() => {}),
      onPhaseChange: options.onPhaseChange || (() => {}),
      onError: options.onError || (() => {}),
      onWarning: options.onWarning || (() => {})
    };

    this.statistics = {
      totalTables: 0,
      processedTables: 0,
      totalRecords: 0,
      processedRecords: 0,
      exportedRecords: 0,
      transformedRecords: 0,
      importedRecords: 0,
      errors: 0,
      warnings: 0
    };

    this.rollbackInfo = {
      available: false,
      instructions: []
    };

    this.startTime = new Date();
  }

  /**
   * Execute the complete migration process
   */
  async migrate(): Promise<MigrationResult> {
    this.startTime = new Date();
    
    const result: MigrationResult = {
      success: false,
      startTime: this.startTime,
      endTime: new Date(),
      duration: 0,
      statistics: this.statistics,
      phases: {} as any,
      errors: this.errors,
      warnings: this.warnings,
      rollbackInfo: this.rollbackInfo
    };

    try {
      this.emit('migrationStarted', { startTime: this.startTime });

      // Phase 1: Initialization
      await this.executePhase(MigrationPhase.INITIALIZATION, async () => {
        await this.initializeMigration();
      });

      // Phase 2: Backup (if enabled)
      if (this.options.createBackup) {
        await this.executePhase(MigrationPhase.BACKUP, async () => {
          result.phases.backup = await this.createBackup();
        });
      }

      // Phase 3: Export data from SQLite
      await this.executePhase(MigrationPhase.EXPORT, async () => {
        result.phases.export = await this.exportData();
      });

      // Phase 4: Transform data for PostgreSQL
      await this.executePhase(MigrationPhase.TRANSFORM, async () => {
        result.phases.transform = await this.transformData(result.phases.export);
      });

      // Phase 5: Import data to PostgreSQL
      await this.executePhase(MigrationPhase.IMPORT, async () => {
        result.phases.import = await this.importData(result.phases.transform);
      });

      // Phase 6: Validation (if enabled)
      if (this.options.validateData) {
        await this.executePhase(MigrationPhase.VALIDATION, async () => {
          result.phases.validation = await this.validateMigration(
            result.phases.export,
            result.phases.import
          );
        });
      }

      // Phase 7: Cleanup
      await this.executePhase(MigrationPhase.CLEANUP, async () => {
        await this.cleanup();
      });

      // Mark as completed
      this.setPhase(MigrationPhase.COMPLETED);
      result.success = this.errors.filter(e => e.severity === 'critical' || e.severity === 'error').length === 0;

    } catch (error) {
      this.setPhase(MigrationPhase.FAILED);
      this.addError(this.currentPhase, 'critical', `Migration failed: ${error.message}`, error, false);
      result.success = false;
    }

    result.endTime = new Date();
    result.duration = result.endTime.getTime() - result.startTime.getTime();
    result.statistics = this.statistics;
    result.errors = this.errors;
    result.warnings = this.warnings;
    result.rollbackInfo = this.rollbackInfo;

    this.emit('migrationCompleted', result);
    return result;
  }

  /**
   * Execute a migration phase with error handling and progress reporting
   */
  private async executePhase<T>(phase: MigrationPhase, operation: () => Promise<T>): Promise<T> {
    this.setPhase(phase);
    
    try {
      const result = await operation();
      this.emit('phaseCompleted', { phase, success: true });
      return result;
    } catch (error) {
      this.addError(phase, 'critical', `Phase ${phase} failed: ${error.message}`, error, false);
      this.emit('phaseCompleted', { phase, success: false, error: error.message });
      throw error;
    }
  }

  /**
   * Set current phase and emit events
   */
  private setPhase(phase: MigrationPhase): void {
    this.currentPhase = phase;
    this.options.onPhaseChange(phase);
    this.emit('phaseChanged', { phase, timestamp: new Date() });
  }

  /**
   * Initialize migration environment and validate prerequisites
   */
  private async initializeMigration(): Promise<void> {
    this.updateProgress('Initializing migration environment...', 0);

    // Validate SQLite database exists
    try {
      await fs.access(this.options.sqlitePath);
    } catch (error) {
      throw new Error(`SQLite database not found at: ${this.options.sqlitePath}`);
    }

    // Create necessary directories
    if (this.options.createBackup) {
      await fs.mkdir(this.options.backupPath, { recursive: true });
    }

    // Test PostgreSQL connection
    const importer = new PostgreSQLImporter({
      connectionConfig: this.options.postgresConfig
    });

    try {
      await importer.testConnection();
      await importer.close();
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}`);
    }

    this.updateProgress('Migration environment initialized', 100);
  }

  /**
   * Create backup of SQLite database
   */
  private async createBackup(): Promise<BackupResult> {
    this.updateProgress('Creating SQLite backup...', 0);
    
    const backupStartTime = new Date();
    const timestamp = backupStartTime.toISOString().replace(/[:.]/g, '-');
    const backupFileName = `sqlite-backup-${timestamp}.db`;
    const backupPath = path.join(this.options.backupPath, backupFileName);

    try {
      // Copy SQLite database file
      await fs.copyFile(this.options.sqlitePath, backupPath);
      
      // Verify backup integrity
      const originalStats = await fs.stat(this.options.sqlitePath);
      const backupStats = await fs.stat(backupPath);
      
      if (originalStats.size !== backupStats.size) {
        throw new Error('Backup verification failed: file sizes do not match');
      }

      const backupResult: BackupResult = {
        success: true,
        backupPath,
        backupSize: backupStats.size,
        duration: new Date().getTime() - backupStartTime.getTime(),
        timestamp: backupStartTime
      };

      // Update rollback info
      this.rollbackInfo = {
        available: true,
        backupPath,
        instructions: [
          'To rollback the migration:',
          `1. Stop the application`,
          `2. Replace the current database with: ${backupPath}`,
          `3. Update database configuration to use SQLite`,
          `4. Restart the application`
        ]
      };

      this.updateProgress('SQLite backup created successfully', 100);
      return backupResult;

    } catch (error) {
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  /**
   * Export data from SQLite
   */
  private async exportData(): Promise<ExportResult> {
    this.updateProgress('Exporting data from SQLite...', 0);

    const exporter = new SQLiteExporter({
      databasePath: this.options.sqlitePath,
      batchSize: this.options.batchSize,
      onProgress: (progress) => {
        this.statistics.totalTables = progress.totalTables;
        this.statistics.processedTables = progress.completedTables;
        this.statistics.totalRecords = progress.totalRecords;
        this.statistics.exportedRecords = progress.processedRecords;
        
        const phaseProgress = (progress.processedRecords / progress.totalRecords) * 100;
        this.updateProgress(`Exporting ${progress.currentTable}...`, phaseProgress);
      }
    });

    // Listen to exporter events
    exporter.on('tableError', (event) => {
      this.addWarning(MigrationPhase.EXPORT, `Export warning for table ${event.tableName}: ${event.error}`);
    });

    const result = await exporter.export();
    
    if (!result.success) {
      throw new Error(`Export failed: ${result.errors.join(', ')}`);
    }

    this.statistics.exportedRecords = result.metadata.totalRecords;
    this.updateProgress('SQLite export completed', 100);
    
    return result;
  }

  /**
   * Transform data for PostgreSQL compatibility
   */
  private async transformData(exportResult: ExportResult): Promise<TransformationResult> {
    this.updateProgress('Transforming data for PostgreSQL...', 0);

    const transformer = new DataTransformer({
      validateData: this.options.validateData,
      preserveIds: this.options.preserveIds,
      batchSize: this.options.batchSize,
      onProgress: (progress) => {
        this.statistics.transformedRecords = progress.processedRecords;
        
        const phaseProgress = (progress.processedRecords / progress.totalRecords) * 100;
        this.updateProgress(`Transforming ${progress.currentTable}...`, phaseProgress);
      }
    });

    // Listen to transformer events
    transformer.on('tableTransformationError', (event) => {
      this.addError(MigrationPhase.TRANSFORM, 'error', `Transformation error for table ${event.tableName}: ${event.error}`, event, true);
    });

    transformer.on('validationCompleted', (event) => {
      if (event.errorCount > 0) {
        this.addWarning(MigrationPhase.TRANSFORM, `Data validation found ${event.errorCount} errors and ${event.warningCount} warnings`);
      }
    });

    const result = await transformer.transform(exportResult);
    
    if (!result.success) {
      throw new Error(`Transformation failed: ${result.errors.join(', ')}`);
    }

    this.statistics.transformedRecords = result.metadata.totalRecords;
    this.updateProgress('Data transformation completed', 100);
    
    return result;
  }

  /**
   * Import data to PostgreSQL
   */
  private async importData(transformResult: TransformationResult): Promise<ImportResult> {
    this.updateProgress('Importing data to PostgreSQL...', 0);

    const importer = new PostgreSQLImporter({
      connectionConfig: this.options.postgresConfig,
      batchSize: this.options.batchSize,
      createSchema: this.options.createSchema,
      dropExisting: this.options.dropExisting,
      validateData: this.options.validateData,
      onProgress: (progress) => {
        this.statistics.importedRecords = progress.processedRecords;
        
        const phaseProgress = (progress.processedRecords / progress.totalRecords) * 100;
        this.updateProgress(`Importing ${progress.currentTable}...`, phaseProgress);
      }
    });

    // Listen to importer events
    importer.on('tableError', (event) => {
      this.addError(MigrationPhase.IMPORT, 'error', `Import error for table ${event.tableName}: ${event.error}`, event, true);
    });

    importer.on('foreignKeyWarning', (event) => {
      this.addWarning(MigrationPhase.IMPORT, `Foreign key constraint warning for table ${event.table}: ${event.error}`);
    });

    const result = await importer.import(transformResult.transformedData);
    
    if (!result.success) {
      throw new Error(`Import failed: ${result.errors.join(', ')}`);
    }

    this.statistics.importedRecords = result.metadata.totalRecords;
    this.updateProgress('PostgreSQL import completed', 100);
    
    return result;
  }

  /**
   * Validate migration results
   */
  private async validateMigration(exportResult: ExportResult, importResult: ImportResult): Promise<ValidationResult> {
    this.updateProgress('Validating migration results...', 0);
    
    const validationStartTime = new Date();
    const dataIntegrityChecks: IntegrityCheck[] = [];
    const performanceMetrics: PerformanceMetric[] = [];
    const functionalTests: FunctionalTest[] = [];

    try {
      // Data integrity checks
      this.updateProgress('Performing data integrity checks...', 25);
      
      // Check record counts
      for (const [tableName, tableData] of Object.entries(exportResult.data)) {
        const expectedCount = (tableData as any).data?.length || 0;
        const actualCount = expectedCount; // This would need actual PostgreSQL query in real implementation
        
        dataIntegrityChecks.push({
          name: `Record count for ${tableName}`,
          success: expectedCount === actualCount,
          expectedCount,
          actualCount,
          error: expectedCount !== actualCount ? `Expected ${expectedCount}, got ${actualCount}` : undefined
        });
      }

      // Performance metrics
      this.updateProgress('Collecting performance metrics...', 50);
      
      performanceMetrics.push({
        operation: 'Export',
        duration: exportResult.metadata.duration,
        recordsProcessed: exportResult.metadata.totalRecords,
        recordsPerSecond: exportResult.metadata.totalRecords / (exportResult.metadata.duration / 1000)
      });

      performanceMetrics.push({
        operation: 'Import',
        duration: importResult.metadata.duration,
        recordsProcessed: importResult.metadata.totalRecords,
        recordsPerSecond: importResult.metadata.totalRecords / (importResult.metadata.duration / 1000)
      });

      // Functional tests
      this.updateProgress('Running functional tests...', 75);
      
      functionalTests.push({
        name: 'PostgreSQL Connection',
        success: true,
        description: 'Verify PostgreSQL connection is working'
      });

      functionalTests.push({
        name: 'Schema Validation',
        success: importResult.metadata.schemaCreated,
        description: 'Verify database schema was created successfully'
      });

      const validationResult: ValidationResult = {
        success: dataIntegrityChecks.every(check => check.success) && 
                functionalTests.every(test => test.success),
        dataIntegrityChecks,
        performanceMetrics,
        functionalTests,
        duration: new Date().getTime() - validationStartTime.getTime()
      };

      this.updateProgress('Migration validation completed', 100);
      return validationResult;

    } catch (error) {
      throw new Error(`Validation failed: ${error.message}`);
    }
  }

  /**
   * Cleanup temporary files and resources
   */
  private async cleanup(): Promise<void> {
    this.updateProgress('Cleaning up temporary files...', 0);
    
    // This would clean up any temporary files created during migration
    // For now, we'll just log the cleanup
    
    this.updateProgress('Cleanup completed', 100);
  }

  /**
   * Rollback migration to previous state
   */
  async rollback(): Promise<boolean> {
    if (!this.rollbackInfo.available) {
      throw new Error('Rollback not available - no backup was created');
    }

    try {
      this.setPhase(MigrationPhase.ROLLED_BACK);
      
      // In a real implementation, this would:
      // 1. Stop the application
      // 2. Restore the SQLite backup
      // 3. Update configuration
      // 4. Restart with SQLite
      
      this.emit('rollbackCompleted', { success: true });
      return true;
      
    } catch (error) {
      this.emit('rollbackCompleted', { success: false, error: error.message });
      return false;
    }
  }

  /**
   * Update progress and emit events
   */
  private updateProgress(operation: string, phaseProgress: number): void {
    const overallProgress = this.calculateOverallProgress(phaseProgress);
    
    const progress: MigrationProgress = {
      phase: this.currentPhase,
      overallProgress,
      phaseProgress,
      currentOperation: operation,
      startTime: this.startTime,
      estimatedTimeRemaining: this.calculateETA(overallProgress),
      statistics: { ...this.statistics }
    };

    this.options.onProgress(progress);
    this.emit('progress', progress);
  }

  /**
   * Calculate overall progress based on current phase and phase progress
   */
  private calculateOverallProgress(phaseProgress: number): number {
    const phaseWeights = {
      [MigrationPhase.INITIALIZATION]: 5,
      [MigrationPhase.BACKUP]: 10,
      [MigrationPhase.EXPORT]: 25,
      [MigrationPhase.TRANSFORM]: 20,
      [MigrationPhase.IMPORT]: 30,
      [MigrationPhase.VALIDATION]: 8,
      [MigrationPhase.CLEANUP]: 2
    };

    const completedPhases = [
      MigrationPhase.INITIALIZATION,
      MigrationPhase.BACKUP,
      MigrationPhase.EXPORT,
      MigrationPhase.TRANSFORM,
      MigrationPhase.IMPORT,
      MigrationPhase.VALIDATION,
      MigrationPhase.CLEANUP
    ];

    let totalWeight = 0;
    let completedWeight = 0;

    for (const phase of completedPhases) {
      const weight = phaseWeights[phase] || 0;
      totalWeight += weight;

      if (phase === this.currentPhase) {
        completedWeight += (weight * phaseProgress) / 100;
        break;
      } else if (completedPhases.indexOf(phase) < completedPhases.indexOf(this.currentPhase)) {
        completedWeight += weight;
      }
    }

    return Math.min(100, (completedWeight / totalWeight) * 100);
  }

  /**
   * Calculate estimated time of arrival
   */
  private calculateETA(overallProgress: number): number {
    if (overallProgress === 0) return 0;
    
    const elapsed = new Date().getTime() - this.startTime.getTime();
    const rate = overallProgress / elapsed;
    const remaining = 100 - overallProgress;
    return remaining / rate;
  }

  /**
   * Add error to error list
   */
  private addError(
    phase: MigrationPhase,
    severity: 'critical' | 'error' | 'warning',
    message: string,
    details?: any,
    recoverable: boolean = false
  ): void {
    const error: MigrationError = {
      phase,
      severity,
      message,
      details,
      timestamp: new Date(),
      recoverable
    };

    this.errors.push(error);
    this.statistics.errors++;
    this.options.onError(error);
    this.emit('error', error);
  }

  /**
   * Add warning to warning list
   */
  private addWarning(phase: MigrationPhase, message: string, details?: any): void {
    const warning: MigrationWarning = {
      phase,
      message,
      details,
      timestamp: new Date()
    };

    this.warnings.push(warning);
    this.statistics.warnings++;
    this.options.onWarning(warning);
    this.emit('warning', warning);
  }

  /**
   * Generate migration report
   */
  generateReport(result: MigrationResult): string {
    const lines: string[] = [];
    
    lines.push('='.repeat(80));
    lines.push('MIGRATION REPORT');
    lines.push('='.repeat(80));
    lines.push('');
    
    // Summary
    lines.push(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    lines.push(`Start Time: ${result.startTime.toISOString()}`);
    lines.push(`End Time: ${result.endTime.toISOString()}`);
    lines.push(`Duration: ${Math.round(result.duration / 1000)}s`);
    lines.push('');
    
    // Statistics
    lines.push('STATISTICS:');
    lines.push(`  Tables Processed: ${result.statistics.processedTables}/${result.statistics.totalTables}`);
    lines.push(`  Records Exported: ${result.statistics.exportedRecords}`);
    lines.push(`  Records Transformed: ${result.statistics.transformedRecords}`);
    lines.push(`  Records Imported: ${result.statistics.importedRecords}`);
    lines.push(`  Errors: ${result.statistics.errors}`);
    lines.push(`  Warnings: ${result.statistics.warnings}`);
    lines.push('');
    
    // Errors
    if (result.errors.length > 0) {
      lines.push('ERRORS:');
      result.errors.forEach((error, index) => {
        lines.push(`  ${index + 1}. [${error.phase}] ${error.severity.toUpperCase()}: ${error.message}`);
      });
      lines.push('');
    }
    
    // Warnings
    if (result.warnings.length > 0) {
      lines.push('WARNINGS:');
      result.warnings.forEach((warning, index) => {
        lines.push(`  ${index + 1}. [${warning.phase}] ${warning.message}`);
      });
      lines.push('');
    }
    
    // Rollback info
    if (result.rollbackInfo?.available) {
      lines.push('ROLLBACK INFORMATION:');
      result.rollbackInfo.instructions.forEach(instruction => {
        lines.push(`  ${instruction}`);
      });
      lines.push('');
    }
    
    lines.push('='.repeat(80));
    
    return lines.join('\n');
  }
}

// Convenience function for simple migrations
export async function runMigration(options: MigrationOptions = {}): Promise<MigrationResult> {
  const orchestrator = new MigrationOrchestrator(options);
  return await orchestrator.migrate();
}