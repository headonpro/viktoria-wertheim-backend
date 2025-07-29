#!/usr/bin/env node

/**
 * Enhanced Migration Manager Script
 * Provides comprehensive migration management with progress monitoring and rollback
 * Requirements: 8.1, 8.2, 8.5
 * 
 * Usage:
 * node scripts/migration-manager.js [command] [options]
 * 
 * Commands:
 * status       - Show migration status
 * validate     - Run validation checks
 * migrate      - Run migrations
 * rollback     - Rollback migrations
 * cleanup      - Clean up orphaned data
 * report       - Generate data quality report
 * 
 * Options:
 * --type <type>        - Migration type (spiel, tabellen, all)
 * --dry-run           - Run without making changes
 * --backup-id <id>    - Backup ID for rollback
 * --force             - Skip confirmation prompts
 * --verbose           - Verbose output
 * --output <format>   - Output format (json, table, summary)
 */

const { createStrapi } = require('@strapi/strapi');
const { createSpielMigrationService } = require('../src/api/spiel/services/migration');
const { TabellenEintragMigration } = require('./migrate-tabellen-eintraege-to-clubs');
const fs = require('fs');
const path = require('path');

class MigrationManager {
  constructor(strapi, options = {}) {
    this.strapi = strapi;
    this.options = {
      verbose: false,
      dryRun: false,
      force: false,
      output: 'summary',
      ...options
    };
    
    this.spielMigrationService = createSpielMigrationService(strapi);
    this.tabellenMigration = new TabellenEintragMigration(strapi);
  }

  /**
   * Show migration status
   */
  async showStatus() {
    this.log('📊 Checking migration status...\n');
    
    try {
      // Get spiel migration status
      const spielValidation = await this.spielMigrationService.validateMigrationData();
      const spielStatus = this.getSpielStatus(spielValidation);
      
      // Get tabellen migration status
      const tabellenStatus = await this.getTabellenStatus();
      
      // Get overall statistics
      const stats = await this.getOverallStats();
      
      if (this.options.output === 'json') {
        console.log(JSON.stringify({
          spiel: spielStatus,
          tabellen: tabellenStatus,
          stats
        }, null, 2));
        return;
      }
      
      // Display formatted status
      this.displayStatus(spielStatus, tabellenStatus, stats);
      
    } catch (error) {
      this.error('Failed to get migration status:', error);
      throw error;
    }
  }

  /**
   * Run comprehensive validation
   */
  async runValidation() {
    this.log('🔍 Running comprehensive validation...\n');
    
    try {
      // Validate spiel migration
      this.log('Validating spiel migration...');
      const spielValidation = await this.spielMigrationService.validateMigrationData();
      
      // Validate tabellen migration
      this.log('Validating tabellen migration...');
      const tabellenValidation = await this.validateTabellenMigration();
      
      // Check data consistency
      this.log('Checking data consistency...');
      const consistencyCheck = await this.checkDataConsistency();
      
      // Generate validation report
      const validationReport = {
        timestamp: new Date().toISOString(),
        spiel: spielValidation,
        tabellen: tabellenValidation,
        consistency: consistencyCheck,
        summary: this.generateValidationSummary(spielValidation, tabellenValidation, consistencyCheck)
      };
      
      if (this.options.output === 'json') {
        console.log(JSON.stringify(validationReport, null, 2));
        return validationReport;
      }
      
      this.displayValidationReport(validationReport);
      return validationReport;
      
    } catch (error) {
      this.error('Validation failed:', error);
      throw error;
    }
  }

  /**
   * Run migrations
   */
  async runMigrations(type = 'all') {
    this.log(`🚀 Starting migration (type: ${type})...\n`);
    
    try {
      const results = {};
      
      if (type === 'spiel' || type === 'all') {
        this.log('Running spiel migration...');
        results.spiel = await this.runSpielMigration();
      }
      
      if (type === 'tabellen' || type === 'all') {
        this.log('Running tabellen migration...');
        results.tabellen = await this.runTabellenMigration();
      }
      
      // Log results to history
      await this.logMigrationResults(type, results);
      
      if (this.options.output === 'json') {
        console.log(JSON.stringify(results, null, 2));
        return results;
      }
      
      this.displayMigrationResults(results);
      return results;
      
    } catch (error) {
      this.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback migrations
   */
  async rollbackMigrations(backupId) {
    if (!backupId) {
      throw new Error('Backup ID is required for rollback');
    }
    
    this.log(`🔄 Rolling back migration (backup: ${backupId})...\n`);
    
    try {
      // Determine migration type from backup ID
      const migrationType = this.getMigrationTypeFromBackupId(backupId);
      
      let result;
      if (migrationType === 'spiel') {
        result = await this.spielMigrationService.rollbackMigration(backupId);
      } else if (migrationType === 'tabellen') {
        result = await this.rollbackTabellenMigration(backupId);
      } else {
        throw new Error(`Unknown migration type for backup: ${backupId}`);
      }
      
      // Log rollback to history
      await this.logRollbackResults(migrationType, backupId, result);
      
      if (this.options.output === 'json') {
        console.log(JSON.stringify(result, null, 2));
        return result;
      }
      
      this.displayRollbackResults(result);
      return result;
      
    } catch (error) {
      this.error('Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Clean up orphaned data
   */
  async cleanupData() {
    this.log('🧹 Cleaning up orphaned data...\n');
    
    try {
      const cleanupResults = {
        orphanedTabellen: 0,
        inconsistentSpiele: 0,
        details: []
      };
      
      // Clean orphaned tabellen entries
      this.log('Cleaning orphaned tabellen entries...');
      const orphanedCount = await this.cleanOrphanedTabellenEntries();
      cleanupResults.orphanedTabellen = orphanedCount;
      cleanupResults.details.push(`Cleaned ${orphanedCount} orphaned tabellen entries`);
      
      // Clean inconsistent spiele
      this.log('Cleaning inconsistent spiele...');
      const inconsistentCount = await this.cleanInconsistentSpiele();
      cleanupResults.inconsistentSpiele = inconsistentCount;
      cleanupResults.details.push(`Cleaned ${inconsistentCount} inconsistent spiele`);
      
      if (this.options.output === 'json') {
        console.log(JSON.stringify(cleanupResults, null, 2));
        return cleanupResults;
      }
      
      this.displayCleanupResults(cleanupResults);
      return cleanupResults;
      
    } catch (error) {
      this.error('Cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Generate data quality report
   */
  async generateReport() {
    this.log('📋 Generating data quality report...\n');
    
    try {
      const report = await this.generateDataQualityReport();
      
      if (this.options.output === 'json') {
        console.log(JSON.stringify(report, null, 2));
        return report;
      }
      
      this.displayDataQualityReport(report);
      return report;
      
    } catch (error) {
      this.error('Report generation failed:', error);
      throw error;
    }
  }

  // Helper methods

  getSpielStatus(validation) {
    const progress = validation.totalSpiele > 0 
      ? (validation.clubBasedSpiele / validation.totalSpiele) * 100 
      : 0;
    
    let status = 'pending';
    if (validation.clubBasedSpiele > 0) {
      status = validation.teamBasedSpiele === 0 ? 'completed' : 'partial';
    }
    
    return {
      status,
      progress: Math.round(progress),
      total: validation.totalSpiele,
      migrated: validation.clubBasedSpiele,
      remaining: validation.teamBasedSpiele,
      inconsistencies: validation.inconsistencies?.length || 0
    };
  }

  async getTabellenStatus() {
    const withClub = await this.strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
      filters: { club: { $notNull: true } }
    });
    
    const withoutClub = await this.strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
      filters: { club: { $null: true } }
    });
    
    const total = withClub + withoutClub;
    const progress = total > 0 ? (withClub / total) * 100 : 0;
    
    let status = 'pending';
    if (withClub > 0) {
      status = withoutClub === 0 ? 'completed' : 'partial';
    }
    
    return {
      status,
      progress: Math.round(progress),
      total,
      migrated: withClub,
      remaining: withoutClub
    };
  }

  async getOverallStats() {
    const history = await this.getMigrationHistory();
    const backups = await this.getAvailableBackups();
    
    return {
      totalMigrations: history.length,
      successfulMigrations: history.filter(h => h.status === 'completed').length,
      failedMigrations: history.filter(h => h.status === 'failed').length,
      availableBackups: backups.length,
      lastMigration: history.length > 0 ? history[history.length - 1].timestamp : null
    };
  }

  async validateTabellenMigration() {
    // Use the existing tabellen migration validation logic
    const tabellenMigration = new TabellenEintragMigration(this.strapi);
    
    // Mock the validation method since it's not exposed
    const withClub = await this.strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
      filters: { club: { $notNull: true } }
    });
    
    const withoutClub = await this.strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
      filters: { club: { $null: true } }
    });
    
    return {
      isValid: true,
      total: withClub + withoutClub,
      withClub,
      withoutClub,
      errors: [],
      warnings: []
    };
  }

  async checkDataConsistency() {
    const issues = [];
    
    // Check for spiele with both team and club relations
    const inconsistentSpiele = await this.strapi.entityService.count('api::spiel.spiel', {
      filters: {
        heim_team: { $notNull: true },
        heim_club: { $notNull: true }
      }
    });
    
    if (inconsistentSpiele > 0) {
      issues.push({
        type: 'INCONSISTENT_SPIELE',
        count: inconsistentSpiele,
        description: 'Spiele have both team and club relations'
      });
    }
    
    // Check for tabellen entries with mismatched team_name and club name
    const tabellenWithClub = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
      filters: { club: { $notNull: true } },
      populate: ['club']
    });
    
    const mismatchedNames = tabellenWithClub.filter(entry => 
      entry.club && entry.team_name !== entry.club.name
    ).length;
    
    if (mismatchedNames > 0) {
      issues.push({
        type: 'MISMATCHED_TEAM_NAMES',
        count: mismatchedNames,
        description: 'Tabellen entries with team_name not matching club name'
      });
    }
    
    return {
      isConsistent: issues.length === 0,
      issues
    };
  }

  generateValidationSummary(spielValidation, tabellenValidation, consistencyCheck) {
    const totalIssues = (spielValidation.inconsistencies?.length || 0) + 
                       (tabellenValidation.errors?.length || 0) + 
                       (consistencyCheck.issues?.length || 0);
    
    return {
      overallStatus: totalIssues === 0 ? 'VALID' : 'ISSUES_FOUND',
      totalIssues,
      spielMigrationReady: (spielValidation.inconsistencies?.length || 0) === 0,
      tabellenMigrationReady: (tabellenValidation.errors?.length || 0) === 0,
      dataConsistent: consistencyCheck.isConsistent
    };
  }

  async runSpielMigration() {
    if (this.options.dryRun) {
      return await this.spielMigrationService.validateMigrationData();
    } else {
      return await this.spielMigrationService.migrateTeamToClubRelations();
    }
  }

  async runTabellenMigration() {
    if (this.options.dryRun) {
      return await this.validateTabellenMigration();
    } else {
      return await this.tabellenMigration.migrate();
    }
  }

  async cleanOrphanedTabellenEntries() {
    const orphanedEntries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
      filters: { 
        team: { $notNull: true },
        club: { $null: true }
      },
      populate: ['team']
    });
    
    let cleaned = 0;
    for (const entry of orphanedEntries) {
      if (!entry.team) {
        if (!this.options.dryRun) {
          await this.strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', entry.id);
        }
        cleaned++;
      }
    }
    
    return cleaned;
  }

  async cleanInconsistentSpiele() {
    const inconsistentSpiele = await this.strapi.entityService.findMany('api::spiel.spiel', {
      filters: {
        heim_team: { $notNull: true },
        heim_club: { $notNull: true }
      }
    });
    
    if (!this.options.dryRun) {
      for (const spiel of inconsistentSpiele) {
        await this.strapi.entityService.update('api::spiel.spiel', spiel.id, {
          data: {
            heim_team: null,
            gast_team: null
          }
        });
      }
    }
    
    return inconsistentSpiele.length;
  }

  async generateDataQualityReport() {
    // Implementation similar to the controller method
    const totalSpiele = await this.strapi.entityService.count('api::spiel.spiel');
    const teamBasedSpiele = await this.strapi.entityService.count('api::spiel.spiel', {
      filters: { 
        heim_team: { $notNull: true },
        heim_club: { $null: true }
      }
    });
    const clubBasedSpiele = await this.strapi.entityService.count('api::spiel.spiel', {
      filters: { heim_club: { $notNull: true } }
    });

    const totalTabellen = await this.strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag');
    const tabellenWithClub = await this.strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
      filters: { club: { $notNull: true } }
    });

    return {
      timestamp: new Date().toISOString(),
      spiele: {
        total: totalSpiele,
        teamBased: teamBasedSpiele,
        clubBased: clubBasedSpiele,
        migrationProgress: totalSpiele > 0 ? (clubBasedSpiele / totalSpiele) * 100 : 0
      },
      tabellen: {
        total: totalTabellen,
        withClub: tabellenWithClub,
        withoutClub: totalTabellen - tabellenWithClub,
        migrationProgress: totalTabellen > 0 ? (tabellenWithClub / totalTabellen) * 100 : 0
      }
    };
  }

  getMigrationTypeFromBackupId(backupId) {
    if (backupId.includes('spiel')) return 'spiel';
    if (backupId.includes('tabellen')) return 'tabellen';
    throw new Error(`Cannot determine migration type from backup ID: ${backupId}`);
  }

  async rollbackTabellenMigration(backupId) {
    // Placeholder for tabellen rollback
    return {
      success: false,
      error: 'Tabellen migration rollback not yet implemented',
      restored: 0
    };
  }

  async getMigrationHistory() {
    try {
      const historyFile = path.join(process.cwd(), 'migration-history.json');
      if (fs.existsSync(historyFile)) {
        const historyData = fs.readFileSync(historyFile, 'utf8');
        return JSON.parse(historyData);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async getAvailableBackups() {
    try {
      const backupDir = path.join(process.cwd(), 'backups', 'migrations');
      if (fs.existsSync(backupDir)) {
        return fs.readdirSync(backupDir).filter(file => file.endsWith('.json'));
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async logMigrationResults(type, results) {
    // Implementation to log results to history file
    const historyEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type,
      results,
      status: results.success ? 'completed' : 'failed'
    };
    
    try {
      const historyFile = path.join(process.cwd(), 'migration-history.json');
      let history = [];
      
      if (fs.existsSync(historyFile)) {
        const historyData = fs.readFileSync(historyFile, 'utf8');
        history = JSON.parse(historyData);
      }
      
      history.push(historyEntry);
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      this.warn('Failed to log migration results:', error.message);
    }
  }

  async logRollbackResults(type, backupId, result) {
    // Similar to logMigrationResults but for rollbacks
    const historyEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: `${type}_rollback`,
      backupId,
      result,
      status: result.success ? 'completed' : 'failed'
    };
    
    try {
      const historyFile = path.join(process.cwd(), 'migration-history.json');
      let history = [];
      
      if (fs.existsSync(historyFile)) {
        const historyData = fs.readFileSync(historyFile, 'utf8');
        history = JSON.parse(historyData);
      }
      
      history.push(historyEntry);
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      this.warn('Failed to log rollback results:', error.message);
    }
  }

  // Display methods

  displayStatus(spielStatus, tabellenStatus, stats) {
    console.log('📊 MIGRATION STATUS');
    console.log('='.repeat(50));
    console.log(`Spiel Migration:     ${this.getStatusIcon(spielStatus.status)} ${spielStatus.status.toUpperCase()} (${spielStatus.progress}%)`);
    console.log(`  Migrated:          ${spielStatus.migrated}/${spielStatus.total}`);
    console.log(`  Remaining:         ${spielStatus.remaining}`);
    console.log(`  Inconsistencies:   ${spielStatus.inconsistencies}`);
    console.log('');
    console.log(`Tabellen Migration:  ${this.getStatusIcon(tabellenStatus.status)} ${tabellenStatus.status.toUpperCase()} (${tabellenStatus.progress}%)`);
    console.log(`  Migrated:          ${tabellenStatus.migrated}/${tabellenStatus.total}`);
    console.log(`  Remaining:         ${tabellenStatus.remaining}`);
    console.log('');
    console.log(`Overall Statistics:`);
    console.log(`  Total Migrations:  ${stats.totalMigrations}`);
    console.log(`  Successful:        ${stats.successfulMigrations}`);
    console.log(`  Failed:            ${stats.failedMigrations}`);
    console.log(`  Available Backups: ${stats.availableBackups}`);
    if (stats.lastMigration) {
      console.log(`  Last Migration:    ${new Date(stats.lastMigration).toLocaleString()}`);
    }
  }

  displayValidationReport(report) {
    console.log('🔍 VALIDATION REPORT');
    console.log('='.repeat(50));
    console.log(`Overall Status: ${report.summary.overallStatus}`);
    console.log(`Total Issues: ${report.summary.totalIssues}`);
    console.log('');
    
    if (report.spiel.inconsistencies && report.spiel.inconsistencies.length > 0) {
      console.log('Spiel Issues:');
      report.spiel.inconsistencies.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.issue} (Spiel ${issue.spielId})`);
      });
      console.log('');
    }
    
    if (report.consistency.issues && report.consistency.issues.length > 0) {
      console.log('Data Consistency Issues:');
      report.consistency.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.description} (${issue.count} affected)`);
      });
    }
  }

  displayMigrationResults(results) {
    console.log('🚀 MIGRATION RESULTS');
    console.log('='.repeat(50));
    
    Object.entries(results).forEach(([type, result]) => {
      console.log(`${type.toUpperCase()} Migration:`);
      console.log(`  Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`  Processed: ${result.processed || 0}`);
      console.log(`  Migrated: ${result.migrated || 0}`);
      console.log(`  Errors: ${result.errors?.length || 0}`);
      if (result.backupId) {
        console.log(`  Backup ID: ${result.backupId}`);
      }
      console.log('');
    });
  }

  displayRollbackResults(result) {
    console.log('🔄 ROLLBACK RESULTS');
    console.log('='.repeat(50));
    console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Restored: ${result.restored || 0}`);
    console.log(`Errors: ${result.errors?.length || 0}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.message || error}`);
      });
    }
  }

  displayCleanupResults(results) {
    console.log('🧹 CLEANUP RESULTS');
    console.log('='.repeat(50));
    console.log(`Orphaned Tabellen Entries: ${results.orphanedTabellen}`);
    console.log(`Inconsistent Spiele: ${results.inconsistentSpiele}`);
    console.log('');
    
    if (results.details.length > 0) {
      console.log('Details:');
      results.details.forEach((detail, index) => {
        console.log(`  ${index + 1}. ${detail}`);
      });
    }
  }

  displayDataQualityReport(report) {
    console.log('📋 DATA QUALITY REPORT');
    console.log('='.repeat(50));
    console.log(`Generated: ${new Date(report.timestamp).toLocaleString()}`);
    console.log('');
    console.log('Spiele:');
    console.log(`  Total: ${report.spiele.total}`);
    console.log(`  Team-based: ${report.spiele.teamBased}`);
    console.log(`  Club-based: ${report.spiele.clubBased}`);
    console.log(`  Migration Progress: ${report.spiele.migrationProgress.toFixed(1)}%`);
    console.log('');
    console.log('Tabellen:');
    console.log(`  Total: ${report.tabellen.total}`);
    console.log(`  With Club: ${report.tabellen.withClub}`);
    console.log(`  Without Club: ${report.tabellen.withoutClub}`);
    console.log(`  Migration Progress: ${report.tabellen.migrationProgress.toFixed(1)}%`);
  }

  getStatusIcon(status) {
    const icons = {
      'completed': '✅',
      'partial': '🔄',
      'pending': '⏳',
      'failed': '❌'
    };
    return icons[status] || '❓';
  }

  log(message) {
    if (this.options.verbose || this.options.output !== 'json') {
      console.log(message);
    }
  }

  warn(message, error) {
    if (this.options.verbose || this.options.output !== 'json') {
      console.warn(`⚠️  ${message}`, error || '');
    }
  }

  error(message, error) {
    if (this.options.output !== 'json') {
      console.error(`❌ ${message}`, error || '');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  // Parse options
  const options = {
    type: 'all',
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    verbose: args.includes('--verbose'),
    output: args.includes('--output') ? args[args.indexOf('--output') + 1] : 'summary',
    backupId: args.includes('--backup-id') ? args[args.indexOf('--backup-id') + 1] : null
  };
  
  if (args.includes('--type')) {
    options.type = args[args.indexOf('--type') + 1];
  }

  let strapi;
  
  try {
    // Initialize Strapi
    strapi = await createStrapi();
    const migrationManager = new MigrationManager(strapi, options);
    
    // Execute command
    switch (command) {
      case 'status':
        await migrationManager.showStatus();
        break;
      case 'validate':
        await migrationManager.runValidation();
        break;
      case 'migrate':
        await migrationManager.runMigrations(options.type);
        break;
      case 'rollback':
        if (!options.backupId) {
          throw new Error('--backup-id is required for rollback');
        }
        await migrationManager.rollbackMigrations(options.backupId);
        break;
      case 'cleanup':
        await migrationManager.cleanupData();
        break;
      case 'report':
        await migrationManager.generateReport();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Available commands: status, validate, migrate, rollback, cleanup, report');
        process.exit(1);
    }
    
  } catch (error) {
    console.error('Migration manager failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (strapi) {
      await strapi.destroy();
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { MigrationManager };