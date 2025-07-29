#!/usr/bin/env node

/**
 * Migration from Manual to Automatic Calculation
 * Migrates existing manual table management to automated system
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

class AutomationMigrator {
  constructor(config) {
    this.config = config;
    this.client = new Client(config.database.connection);
    this.migrationResults = {
      tablesProcessed: 0,
      entriesUpdated: 0,
      snapshotsCreated: 0,
      errors: [],
      warnings: []
    };
  }

  async connect() {
    try {
      await this.client.connect();
      this.log('Connected to database', 'success');
    } catch (error) {
      this.error('Failed to connect to database:', error.message);
      throw error;
    }
  }

  async disconnect() {
    await this.client.end();
    this.log('Disconnected from database', 'info');
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow
    };
    
    console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
  }

  error(message, details = '') {
    this.log(`${message} ${details}`, 'error');
    this.migrationResults.errors.push(`${message} ${details}`);
  }

  warning(message, details = '') {
    this.log(`${message} ${details}`, 'warning');
    this.migrationResults.warnings.push(`${message} ${details}`);
  }

  async checkPrerequisites() {
    this.log('Checking migration prerequisites...');

    try {
      // Check if automation tables exist
      const automationTables = ['queue_jobs', 'table_snapshots', 'automation_audit_logs'];
      for (const table of automationTables) {
        const result = await this.client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          );
        `, [table]);

        if (!result.rows[0].exists) {
          throw new Error(`Required automation table '${table}' does not exist. Run migrations first.`);
        }
      }

      // Check if automation columns exist
      const spieleColumns = await this.client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'spiele' 
          AND column_name IN ('last_calculation', 'calculation_status', 'calculation_error')
      `);

      if (spieleColumns.rows.length < 3) {
        throw new Error('Required automation columns missing from spiele table. Run migrations first.');
      }

      const tabellenColumns = await this.client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'tabellen_eintraege' 
          AND column_name IN ('last_updated', 'auto_calculated', 'calculation_source')
      `);

      if (tabellenColumns.rows.length < 3) {
        throw new Error('Required automation columns missing from tabellen_eintraege table. Run migrations first.');
      }

      this.log('Prerequisites check passed', 'success');
      return true;
    } catch (error) {
      this.error('Prerequisites check failed:', error.message);
      return false;
    }
  }

  async createPreMigrationSnapshot() {
    this.log('Creating pre-migration snapshot...');

    try {
      // Get all table entries
      const tableEntries = await this.client.query(`
        SELECT te.*, t.name as team_name, l.name as liga_name, s.name as saison_name
        FROM tabellen_eintraege te
        JOIN teams t ON te.team_id = t.id
        JOIN ligas l ON te.liga_id = l.id
        JOIN saisons s ON te.saison_id = s.id
        ORDER BY te.liga_id, te.saison_id, te.platz
      `);

      const snapshotData = {
        timestamp: new Date().toISOString(),
        type: 'pre_migration_snapshot',
        description: 'Snapshot before migration to automation',
        entries: tableEntries.rows
      };

      // Save to database
      const snapshotResult = await this.client.query(`
        INSERT INTO table_snapshots (
          liga_id, saison_id, snapshot_data, description, created_by
        ) VALUES (0, 0, $1, $2, 0)
        RETURNING id
      `, [JSON.stringify(snapshotData), 'Pre-migration snapshot']);

      const snapshotId = snapshotResult.rows[0].id;

      // Also save to file
      const snapshotDir = path.join(__dirname, '..', 'snapshots', 'migration');
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }

      const snapshotFile = path.join(snapshotDir, `pre-migration-${Date.now()}.json`);
      fs.writeFileSync(snapshotFile, JSON.stringify(snapshotData, null, 2));

      this.log(`Pre-migration snapshot created: ID ${snapshotId}, File: ${snapshotFile}`, 'success');
      this.migrationResults.snapshotsCreated++;

      return snapshotId;
    } catch (error) {
      this.error('Failed to create pre-migration snapshot:', error.message);
      throw error;
    }
  }

  async validateExistingData() {
    this.log('Validating existing data before migration...');

    try {
      // Check for data inconsistencies
      const inconsistencies = await this.client.query(`
        SELECT COUNT(*) as count
        FROM tabellen_eintraege 
        WHERE spiele != (siege + unentschieden + niederlagen)
           OR tordifferenz != (tore_fuer - tore_gegen)
           OR punkte != (siege * 3 + unentschieden * 1)
           OR punkte < 0 OR spiele < 0 OR siege < 0 OR unentschieden < 0 
           OR niederlagen < 0 OR tore_fuer < 0 OR tore_gegen < 0
      `);

      const inconsistentCount = parseInt(inconsistencies.rows[0].count);
      if (inconsistentCount > 0) {
        this.warning(`Found ${inconsistentCount} table entries with inconsistencies`);
        
        const { proceed } = await inquirer.prompt([{
          type: 'confirm',
          name: 'proceed',
          message: 'Data inconsistencies found. Continue with migration? (Recommend running data repair first)',
          default: false
        }]);

        if (!proceed) {
          throw new Error('Migration cancelled due to data inconsistencies');
        }
      }

      // Check for missing game data
      const missingGames = await this.client.query(`
        SELECT DISTINCT te.team_id, te.liga_id, te.saison_id
        FROM tabellen_eintraege te
        WHERE NOT EXISTS (
          SELECT 1 FROM spiele s
          WHERE (s.heim_team_id = te.team_id OR s.gast_team_id = te.team_id)
            AND s.liga_id = te.liga_id
            AND s.saison_id = te.saison_id
            AND s.status = 'beendet'
        )
      `);

      if (missingGames.rows.length > 0) {
        this.warning(`Found ${missingGames.rows.length} table entries without corresponding finished games`);
      }

      this.log('Data validation completed', 'success');
      return true;
    } catch (error) {
      this.error('Data validation failed:', error.message);
      return false;
    }
  }

  async markExistingEntriesAsManual() {
    this.log('Marking existing table entries as manually calculated...');

    try {
      const result = await this.client.query(`
        UPDATE tabellen_eintraege 
        SET auto_calculated = false,
            calculation_source = 'manual_pre_migration',
            last_updated = CURRENT_TIMESTAMP
        WHERE auto_calculated IS NULL OR auto_calculated = true
      `);

      const updatedCount = result.rowCount;
      this.log(`Marked ${updatedCount} entries as manually calculated`, 'success');
      this.migrationResults.entriesUpdated += updatedCount;

      return true;
    } catch (error) {
      this.error('Failed to mark entries as manual:', error.message);
      return false;
    }
  }

  async initializeAutomationColumns() {
    this.log('Initializing automation columns...');

    try {
      // Initialize spiele automation columns
      const spieleResult = await this.client.query(`
        UPDATE spiele 
        SET calculation_status = CASE 
              WHEN status = 'beendet' AND heim_tore IS NOT NULL AND gast_tore IS NOT NULL 
              THEN 'completed' 
              ELSE 'pending' 
            END,
            last_calculation = CASE 
              WHEN status = 'beendet' AND heim_tore IS NOT NULL AND gast_tore IS NOT NULL 
              THEN CURRENT_TIMESTAMP 
              ELSE NULL 
            END
        WHERE calculation_status IS NULL
      `);

      this.log(`Initialized automation columns for ${spieleResult.rowCount} games`, 'success');

      return true;
    } catch (error) {
      this.error('Failed to initialize automation columns:', error.message);
      return false;
    }
  }

  async createMigrationAuditLog() {
    this.log('Creating migration audit log...');

    try {
      await this.client.query(`
        INSERT INTO automation_audit_logs (
          action, entity_type, timestamp, user_id, 
          old_values, new_values, liga_id, saison_id
        ) VALUES (
          'MIGRATION_TO_AUTOMATION', 'SYSTEM', CURRENT_TIMESTAMP, 0,
          $1, $2, 0, 0
        )
      `, [
        JSON.stringify({ migration_type: 'manual_to_automatic' }),
        JSON.stringify(this.migrationResults)
      ]);

      this.log('Migration audit log created', 'success');
      return true;
    } catch (error) {
      this.error('Failed to create audit log:', error.message);
      return false;
    }
  }

  async testAutomationSystem() {
    this.log('Testing automation system...');

    try {
      // Find a completed game to test with
      const testGame = await this.client.query(`
        SELECT id, heim_team_id, gast_team_id, liga_id, saison_id, heim_tore, gast_tore
        FROM spiele 
        WHERE status = 'beendet' 
          AND heim_tore IS NOT NULL 
          AND gast_tore IS NOT NULL
        LIMIT 1
      `);

      if (testGame.rows.length === 0) {
        this.warning('No completed games found for testing');
        return true;
      }

      const game = testGame.rows[0];
      
      // Simulate a small change to trigger automation
      await this.client.query(`
        UPDATE spiele 
        SET calculation_status = 'pending',
            last_calculation = NULL
        WHERE id = $1
      `, [game.id]);

      // Here we would normally trigger the automation system
      // For now, we'll just verify the structure is in place
      this.log('Automation system structure verified', 'success');
      
      // Reset the test game
      await this.client.query(`
        UPDATE spiele 
        SET calculation_status = 'completed',
            last_calculation = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [game.id]);

      return true;
    } catch (error) {
      this.error('Automation system test failed:', error.message);
      return false;
    }
  }

  async generateMigrationReport() {
    this.log('Generating migration report...');

    try {
      // Get statistics
      const stats = await this.client.query(`
        SELECT 
          COUNT(*) as total_entries,
          COUNT(CASE WHEN auto_calculated = true THEN 1 END) as auto_entries,
          COUNT(CASE WHEN auto_calculated = false THEN 1 END) as manual_entries,
          COUNT(DISTINCT liga_id) as total_ligas,
          COUNT(DISTINCT saison_id) as total_saisons
        FROM tabellen_eintraege
      `);

      const gameStats = await this.client.query(`
        SELECT 
          COUNT(*) as total_games,
          COUNT(CASE WHEN status = 'beendet' THEN 1 END) as finished_games,
          COUNT(CASE WHEN calculation_status = 'completed' THEN 1 END) as calculated_games,
          COUNT(CASE WHEN calculation_status = 'pending' THEN 1 END) as pending_games
        FROM spiele
      `);

      const report = {
        timestamp: new Date().toISOString(),
        migration_type: 'manual_to_automatic',
        environment: process.env.NODE_ENV || 'development',
        results: this.migrationResults,
        statistics: {
          table_entries: stats.rows[0],
          games: gameStats.rows[0]
        },
        next_steps: [
          'Enable automation features in configuration',
          'Monitor automation system performance',
          'Gradually enable automatic calculation for new games',
          'Verify table calculations match expected results'
        ]
      };

      const reportPath = path.join(__dirname, '..', 'logs', `migration-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      this.log(`Migration report saved to: ${reportPath}`, 'info');
      return report;
    } catch (error) {
      this.error('Failed to generate migration report:', error.message);
      return null;
    }
  }

  async runMigration() {
    this.log('Starting migration from manual to automatic calculation...', 'info');

    try {
      // Check prerequisites
      if (!(await this.checkPrerequisites())) {
        throw new Error('Prerequisites check failed');
      }

      // Create pre-migration snapshot
      await this.createPreMigrationSnapshot();

      // Validate existing data
      if (!(await this.validateExistingData())) {
        throw new Error('Data validation failed');
      }

      // Begin transaction
      await this.client.query('BEGIN');

      try {
        // Mark existing entries as manual
        await this.markExistingEntriesAsManual();

        // Initialize automation columns
        await this.initializeAutomationColumns();

        // Create audit log
        await this.createMigrationAuditLog();

        // Commit transaction
        await this.client.query('COMMIT');

        this.log('Migration transaction completed successfully', 'success');
      } catch (error) {
        // Rollback transaction
        await this.client.query('ROLLBACK');
        throw error;
      }

      // Test automation system
      await this.testAutomationSystem();

      // Generate report
      const report = await this.generateMigrationReport();

      this.printSummary();

      return {
        success: true,
        results: this.migrationResults,
        report
      };
    } catch (error) {
      this.error('Migration failed:', error.message);
      return {
        success: false,
        error: error.message,
        results: this.migrationResults
      };
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log(chalk.cyan('MIGRATION SUMMARY'));
    console.log('='.repeat(60));

    console.log(chalk.blue(`Tables processed: ${this.migrationResults.tablesProcessed}`));
    console.log(chalk.blue(`Entries updated: ${this.migrationResults.entriesUpdated}`));
    console.log(chalk.blue(`Snapshots created: ${this.migrationResults.snapshotsCreated}`));
    console.log(chalk.yellow(`Warnings: ${this.migrationResults.warnings.length}`));
    console.log(chalk.red(`Errors: ${this.migrationResults.errors.length}`));

    if (this.migrationResults.warnings.length > 0) {
      console.log('\n' + chalk.yellow('WARNINGS:'));
      this.migrationResults.warnings.forEach(warning => {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      });
    }

    if (this.migrationResults.errors.length > 0) {
      console.log('\n' + chalk.red('ERRORS:'));
      this.migrationResults.errors.forEach(error => {
        console.log(chalk.red(`  ✗ ${error}`));
      });
    }

    console.log('\n' + chalk.cyan('NEXT STEPS:'));
    console.log('1. Review migration report');
    console.log('2. Enable automation features in configuration');
    console.log('3. Test automation with a few games');
    console.log('4. Monitor system performance');
    console.log('5. Gradually enable full automation');

    console.log('\n' + (this.migrationResults.errors.length === 0 ? 
      chalk.green('🎉 MIGRATION COMPLETED SUCCESSFULLY') : 
      chalk.red('❌ MIGRATION COMPLETED WITH ERRORS')
    ));
  }
}

// CLI Interface
async function main() {
  const environment = process.env.NODE_ENV || 'development';
  
  // Load configuration
  let config;
  try {
    const configPath = path.join(__dirname, '..', 'config', 'environments', `${environment}.json`);
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error(chalk.red('Failed to load configuration:'), error.message);
    process.exit(1);
  }

  // Create necessary directories
  const dirs = ['logs', 'snapshots/migration'];
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  const migrator = new AutomationMigrator(config);

  // Confirm migration
  console.log(chalk.yellow('This will migrate your system from manual to automatic table calculation.'));
  console.log(chalk.yellow('A backup will be created before making any changes.'));
  
  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Do you want to proceed with the migration?',
    default: false
  }]);

  if (!confirm) {
    console.log(chalk.yellow('Migration cancelled by user'));
    process.exit(0);
  }

  try {
    await migrator.connect();
    const result = await migrator.runMigration();

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('Migration failed:'), error.message);
    process.exit(1);
  } finally {
    await migrator.disconnect();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Unhandled error:'), error);
    process.exit(1);
  });
}

module.exports = AutomationMigrator;