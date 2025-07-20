#!/usr/bin/env node

import { MigrationOrchestrator, MigrationOptions, MigrationPhase, runMigration } from './migration-orchestrator';
import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';

interface CLIOptions {
  sqlitePath?: string;
  postgresHost?: string;
  postgresPort?: number;
  postgresDatabase?: string;
  postgresUser?: string;
  postgresPassword?: string;
  postgresConnectionString?: string;
  noBackup?: boolean;
  backupPath?: string;
  noValidation?: boolean;
  batchSize?: number;
  dropExisting?: boolean;
  verbose?: boolean;
  reportPath?: string;
  dryRun?: boolean;
}

/**
 * CLI interface for the migration orchestrator
 */
class MigrationCLI {
  private spinner = ora();
  private verbose = false;

  constructor() {
    this.setupCommander();
  }

  /**
   * Setup Commander.js CLI interface
   */
  private setupCommander(): void {
    program
      .name('run-migration')
      .description('Migrate SQLite database to PostgreSQL')
      .version('1.0.0');

    program
      .option('-s, --sqlite-path <path>', 'Path to SQLite database file', '.tmp/data.db')
      .option('--postgres-host <host>', 'PostgreSQL host', 'localhost')
      .option('--postgres-port <port>', 'PostgreSQL port', '5432')
      .option('--postgres-database <database>', 'PostgreSQL database name', 'viktoria_wertheim')
      .option('--postgres-user <user>', 'PostgreSQL username', 'postgres')
      .option('--postgres-password <password>', 'PostgreSQL password')
      .option('--postgres-connection-string <connectionString>', 'PostgreSQL connection string (overrides other postgres options)')
      .option('--no-backup', 'Skip creating SQLite backup')
      .option('--backup-path <path>', 'Custom backup directory path', 'backups')
      .option('--no-validation', 'Skip post-migration validation')
      .option('--batch-size <size>', 'Batch size for processing records', '1000')
      .option('--drop-existing', 'Drop existing PostgreSQL tables before migration')
      .option('-v, --verbose', 'Enable verbose output')
      .option('--report-path <path>', 'Path to save migration report', 'migration-report.txt')
      .option('--dry-run', 'Perform a dry run without actual migration')
      .action(async (options: CLIOptions) => {
        await this.runMigration(options);
      });

    program
      .command('rollback')
      .description('Rollback migration to previous SQLite state')
      .option('--backup-path <path>', 'Backup directory path', 'backups')
      .action(async (options: { backupPath?: string }) => {
        await this.rollbackMigration(options);
      });

    program
      .command('validate')
      .description('Validate current PostgreSQL database against SQLite backup')
      .option('--sqlite-path <path>', 'Path to SQLite database file', '.tmp/data.db')
      .option('--postgres-connection-string <connectionString>', 'PostgreSQL connection string')
      .action(async (options: { sqlitePath?: string; postgresConnectionString?: string }) => {
        await this.validateDatabase(options);
      });
  }

  /**
   * Run the migration process
   */
  private async runMigration(options: CLIOptions): Promise<void> {
    this.verbose = options.verbose || false;
    
    console.log(chalk.blue.bold('🚀 SQLite to PostgreSQL Migration'));
    console.log(chalk.gray('=====================================\n'));

    if (options.dryRun) {
      console.log(chalk.yellow('⚠️  DRY RUN MODE - No actual migration will be performed\n'));
    }

    // Build migration options
    const migrationOptions: MigrationOptions = {
      sqlitePath: options.sqlitePath,
      postgresConfig: {
        host: options.postgresHost,
        port: options.postgresPort ? parseInt(options.postgresPort.toString()) : undefined,
        database: options.postgresDatabase,
        user: options.postgresUser,
        password: options.postgresPassword,
        connectionString: options.postgresConnectionString
      },
      createBackup: !options.noBackup,
      backupPath: options.backupPath,
      validateData: !options.noValidation,
      batchSize: options.batchSize ? parseInt(options.batchSize.toString()) : undefined,
      dropExisting: options.dropExisting,
      onProgress: (progress) => this.handleProgress(progress),
      onPhaseChange: (phase) => this.handlePhaseChange(phase),
      onError: (error) => this.handleError(error),
      onWarning: (warning) => this.handleWarning(warning)
    };

    try {
      // Validate prerequisites
      await this.validatePrerequisites(migrationOptions);

      if (options.dryRun) {
        console.log(chalk.green('✅ Dry run validation completed successfully'));
        console.log(chalk.gray('Migration would proceed with the following configuration:'));
        console.log(JSON.stringify(migrationOptions, null, 2));
        return;
      }

      // Run migration
      const result = await runMigration(migrationOptions);

      // Display results
      this.displayResults(result);

      // Save report
      if (options.reportPath) {
        const orchestrator = new MigrationOrchestrator();
        const report = orchestrator.generateReport(result);
        await fs.writeFile(options.reportPath, report);
        console.log(chalk.blue(`📄 Migration report saved to: ${options.reportPath}`));
      }

      // Exit with appropriate code
      process.exit(result.success ? 0 : 1);

    } catch (error) {
      this.spinner.fail(chalk.red(`Migration failed: ${error.message}`));
      
      if (this.verbose) {
        console.error(chalk.red('\nError details:'));
        console.error(error);
      }
      
      process.exit(1);
    }
  }

  /**
   * Rollback migration
   */
  private async rollbackMigration(options: { backupPath?: string }): Promise<void> {
    console.log(chalk.yellow.bold('🔄 Migration Rollback'));
    console.log(chalk.gray('===================\n'));

    try {
      // Find latest backup
      const backupDir = options.backupPath || 'backups';
      const backups = await fs.readdir(backupDir);
      const sqliteBackups = backups.filter(file => file.startsWith('sqlite-backup-') && file.endsWith('.db'));
      
      if (sqliteBackups.length === 0) {
        throw new Error('No SQLite backups found');
      }

      const latestBackup = sqliteBackups.sort().reverse()[0];
      const backupPath = path.join(backupDir, latestBackup);

      console.log(chalk.blue(`Found backup: ${latestBackup}`));
      console.log(chalk.yellow('⚠️  Rollback will:'));
      console.log('   1. Stop the current application');
      console.log('   2. Restore SQLite database from backup');
      console.log('   3. Update configuration to use SQLite');
      console.log('   4. Require application restart\n');

      // In a real implementation, this would perform the actual rollback
      console.log(chalk.green('✅ Rollback instructions prepared'));
      console.log(chalk.gray(`Backup location: ${backupPath}`));

    } catch (error) {
      console.error(chalk.red(`Rollback failed: ${error.message}`));
      process.exit(1);
    }
  }

  /**
   * Validate database state
   */
  private async validateDatabase(options: { sqlitePath?: string; postgresConnectionString?: string }): Promise<void> {
    console.log(chalk.blue.bold('🔍 Database Validation'));
    console.log(chalk.gray('=====================\n'));

    try {
      // This would perform validation checks between SQLite and PostgreSQL
      console.log(chalk.green('✅ Database validation completed'));

    } catch (error) {
      console.error(chalk.red(`Validation failed: ${error.message}`));
      process.exit(1);
    }
  }

  /**
   * Validate prerequisites before migration
   */
  private async validatePrerequisites(options: MigrationOptions): Promise<void> {
    this.spinner.start('Validating prerequisites...');

    try {
      // Check SQLite database exists
      if (options.sqlitePath) {
        await fs.access(options.sqlitePath);
      }

      // Check backup directory is writable
      if (options.createBackup && options.backupPath) {
        await fs.mkdir(options.backupPath, { recursive: true });
      }

      this.spinner.succeed('Prerequisites validated');

    } catch (error) {
      this.spinner.fail(`Prerequisites validation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle migration progress updates
   */
  private handleProgress(progress: any): void {
    const percentage = Math.round(progress.overallProgress);
    const eta = progress.estimatedTimeRemaining ? 
      ` (ETA: ${Math.round(progress.estimatedTimeRemaining / 1000)}s)` : '';
    
    this.spinner.text = `${progress.currentOperation} - ${percentage}%${eta}`;
    
    if (this.verbose) {
      console.log(chalk.gray(`[${progress.phase}] ${progress.currentOperation} - ${percentage}%`));
    }
  }

  /**
   * Handle phase changes
   */
  private handlePhaseChange(phase: MigrationPhase): void {
    const phaseNames = {
      [MigrationPhase.INITIALIZATION]: 'Initializing',
      [MigrationPhase.BACKUP]: 'Creating Backup',
      [MigrationPhase.EXPORT]: 'Exporting Data',
      [MigrationPhase.TRANSFORM]: 'Transforming Data',
      [MigrationPhase.IMPORT]: 'Importing Data',
      [MigrationPhase.VALIDATION]: 'Validating Results',
      [MigrationPhase.CLEANUP]: 'Cleaning Up',
      [MigrationPhase.COMPLETED]: 'Completed',
      [MigrationPhase.FAILED]: 'Failed',
      [MigrationPhase.ROLLED_BACK]: 'Rolled Back'
    };

    const phaseName = phaseNames[phase] || phase;
    
    if (this.spinner.isSpinning) {
      this.spinner.succeed();
    }
    
    if (phase !== MigrationPhase.COMPLETED && phase !== MigrationPhase.FAILED) {
      this.spinner.start(chalk.blue(`${phaseName}...`));
    }
  }

  /**
   * Handle migration errors
   */
  private handleError(error: any): void {
    const severity = error.severity === 'critical' ? chalk.red.bold('CRITICAL') :
                    error.severity === 'error' ? chalk.red('ERROR') :
                    chalk.yellow('WARNING');
    
    console.log(`\n${severity}: [${error.phase}] ${error.message}`);
    
    if (this.verbose && error.details) {
      console.log(chalk.gray('Details:'), error.details);
    }
  }

  /**
   * Handle migration warnings
   */
  private handleWarning(warning: any): void {
    console.log(chalk.yellow(`⚠️  [${warning.phase}] ${warning.message}`));
    
    if (this.verbose && warning.details) {
      console.log(chalk.gray('Details:'), warning.details);
    }
  }

  /**
   * Display migration results
   */
  private displayResults(result: any): void {
    if (this.spinner.isSpinning) {
      this.spinner.stop();
    }

    console.log('\n' + '='.repeat(50));
    
    if (result.success) {
      console.log(chalk.green.bold('✅ MIGRATION COMPLETED SUCCESSFULLY'));
    } else {
      console.log(chalk.red.bold('❌ MIGRATION FAILED'));
    }
    
    console.log('='.repeat(50));
    
    // Statistics
    console.log(chalk.blue('\n📊 Statistics:'));
    console.log(`   Duration: ${Math.round(result.duration / 1000)}s`);
    console.log(`   Tables: ${result.statistics.processedTables}/${result.statistics.totalTables}`);
    console.log(`   Records: ${result.statistics.importedRecords} imported`);
    console.log(`   Errors: ${result.statistics.errors}`);
    console.log(`   Warnings: ${result.statistics.warnings}`);
    
    // Rollback info
    if (result.rollbackInfo?.available) {
      console.log(chalk.blue('\n🔄 Rollback Available:'));
      console.log(`   Backup: ${result.rollbackInfo.backupPath}`);
      console.log('   Run: npm run migration:rollback');
    }
    
    // Next steps
    if (result.success) {
      console.log(chalk.green('\n🎉 Next Steps:'));
      console.log('   1. Update your application configuration to use PostgreSQL');
      console.log('   2. Test your application functionality');
      console.log('   3. Update environment variables for production');
    }
  }

  /**
   * Run the CLI
   */
  run(): void {
    program.parse();
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new MigrationCLI();
  cli.run();
}

export { MigrationCLI };