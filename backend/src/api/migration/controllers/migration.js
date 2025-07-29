'use strict';

/**
 * Migration Management Controller
 * Provides API endpoints for migration management interface
 * Requirements: 8.1, 8.2, 8.5
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { createSpielMigrationService } = require('../../spiel/services/migration');
const { TabellenEintragMigration } = require('../../../scripts/migrate-tabellen-eintraege-to-clubs');

module.exports = createCoreController('api::migration.migration', ({ strapi }) => ({
  /**
   * Get migration status overview
   */
  async getStatus(ctx) {
    try {
      const spielMigrationService = createSpielMigrationService(strapi);
      const tabellenMigration = new TabellenEintragMigration(strapi);

      // Get current migration status
      const spielStatus = await this.getSpielMigrationStatus(spielMigrationService);
      const tabellenStatus = await this.getTabellenMigrationStatus();
      
      // Check if any migration is currently running
      const isRunning = spielStatus.status === 'running' || tabellenStatus.status === 'running';
      
      // Get progress if running
      let progress = null;
      if (isRunning) {
        progress = await this.getMigrationProgress();
      }

      ctx.body = {
        isRunning,
        progress,
        spiel: spielStatus,
        tabellen: tabellenStatus,
        lastValidation: await this.getLastValidationTime()
      };
    } catch (error) {
      strapi.log.error('Error getting migration status:', error);
      ctx.throw(500, 'Failed to get migration status');
    }
  },

  /**
   * Get migration history
   */
  async getHistory(ctx) {
    try {
      const history = await this.getMigrationHistory();
      
      ctx.body = {
        history: history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      };
    } catch (error) {
      strapi.log.error('Error getting migration history:', error);
      ctx.throw(500, 'Failed to get migration history');
    }
  },

  /**
   * Run migration
   */
  async runMigration(ctx) {
    try {
      const { type, options = {} } = ctx.request.body;
      
      if (!['spiel', 'tabellen'].includes(type)) {
        return ctx.throw(400, 'Invalid migration type');
      }

      // Check if migration is already running
      const status = await this.getStatus(ctx);
      if (status.isRunning) {
        return ctx.throw(409, 'Migration is already running');
      }

      let result;
      
      if (type === 'spiel') {
        result = await this.runSpielMigration(options);
      } else if (type === 'tabellen') {
        result = await this.runTabellenMigration(options);
      }

      // Log migration to history
      await this.logMigrationToHistory({
        type,
        status: result.success ? 'completed' : 'failed',
        processed: result.processed || 0,
        migrated: result.migrated || 0,
        errors: result.errors || [],
        backupId: result.backupId,
        hasBackup: !!result.backupId,
        duration: result.duration,
        options
      });

      ctx.body = {
        success: result.success,
        message: result.success ? 'Migration completed successfully' : 'Migration failed',
        data: result,
        error: result.success ? null : result.error
      };
    } catch (error) {
      strapi.log.error('Error running migration:', error);
      
      // Log failed migration
      await this.logMigrationToHistory({
        type: ctx.request.body.type,
        status: 'failed',
        processed: 0,
        errors: [{ message: error.message }],
        hasBackup: false
      });
      
      ctx.throw(500, 'Failed to run migration');
    }
  },

  /**
   * Rollback migration
   */
  async rollbackMigration(ctx) {
    try {
      const { backupId } = ctx.request.body;
      
      if (!backupId) {
        return ctx.throw(400, 'Backup ID is required');
      }

      // Determine migration type from backup ID
      const migrationType = backupId.includes('spiel') ? 'spiel' : 'tabellen';
      
      let result;
      
      if (migrationType === 'spiel') {
        const spielMigrationService = createSpielMigrationService(strapi);
        result = await spielMigrationService.rollbackMigration(backupId);
      } else {
        // For tabellen migration, we need to implement rollback
        result = await this.rollbackTabellenMigration(backupId);
      }

      // Log rollback to history
      await this.logMigrationToHistory({
        type: `${migrationType}_rollback`,
        status: result.success ? 'completed' : 'failed',
        processed: result.restored || 0,
        errors: result.errors || [],
        backupId: backupId,
        hasBackup: false,
        duration: result.duration
      });

      ctx.body = {
        success: result.success,
        message: result.success ? 'Rollback completed successfully' : 'Rollback failed',
        data: result,
        error: result.success ? null : result.error
      };
    } catch (error) {
      strapi.log.error('Error rolling back migration:', error);
      ctx.throw(500, 'Failed to rollback migration');
    }
  },

  /**
   * Run validation
   */
  async runValidation(ctx) {
    try {
      const spielMigrationService = createSpielMigrationService(strapi);
      
      // Validate spiel migration data
      const spielValidation = await spielMigrationService.validateMigrationData();
      
      // Validate tabellen migration data
      const tabellenValidation = await this.validateTabellenMigrationData();
      
      // Combine results
      const totalValid = (spielValidation.clubBasedSpiele || 0) + (tabellenValidation.withClub || 0);
      const totalErrors = (spielValidation.inconsistencies?.length || 0) + (tabellenValidation.errors?.length || 0);
      const totalWarnings = (spielValidation.unmappableSpiele || 0) + (tabellenValidation.warnings?.length || 0);
      const total = (spielValidation.totalSpiele || 0) + (tabellenValidation.total || 0);
      
      const issues = [
        ...(spielValidation.inconsistencies || []).map(inc => ({
          type: 'spiel_inconsistency',
          severity: 'error',
          message: inc.issue,
          details: inc
        })),
        ...(tabellenValidation.errors || []).map(err => ({
          type: 'tabellen_error',
          severity: 'error',
          message: err.message,
          details: err
        })),
        ...(tabellenValidation.warnings || []).map(warn => ({
          type: 'tabellen_warning',
          severity: 'warning',
          message: warn,
          details: null
        }))
      ];

      const validationResult = {
        lastRun: new Date().toISOString(),
        valid: totalValid,
        errors: totalErrors,
        warnings: totalWarnings,
        total: total,
        issues: issues,
        spiel: spielValidation,
        tabellen: tabellenValidation
      };

      // Store validation results
      await this.storeValidationResults(validationResult);

      ctx.body = validationResult;
    } catch (error) {
      strapi.log.error('Error running validation:', error);
      ctx.throw(500, 'Failed to run validation');
    }
  },

  /**
   * Get validation results
   */
  async getValidation(ctx) {
    try {
      const validationResults = await this.getStoredValidationResults();
      ctx.body = validationResults || {};
    } catch (error) {
      strapi.log.error('Error getting validation results:', error);
      ctx.throw(500, 'Failed to get validation results');
    }
  },

  /**
   * Generate data quality report
   */
  async getDataQuality(ctx) {
    try {
      const report = await this.generateDataQualityReport();
      ctx.body = report;
    } catch (error) {
      strapi.log.error('Error generating data quality report:', error);
      ctx.throw(500, 'Failed to generate data quality report');
    }
  },

  /**
   * Run data cleanup
   */
  async runCleanup(ctx) {
    try {
      const cleanupResult = await this.performDataCleanup();
      
      ctx.body = {
        success: true,
        cleaned: cleanupResult.cleaned,
        message: `Cleaned up ${cleanupResult.cleaned} orphaned records`,
        details: cleanupResult.details
      };
    } catch (error) {
      strapi.log.error('Error running data cleanup:', error);
      ctx.throw(500, 'Failed to run data cleanup');
    }
  },

  /**
   * Export migration data
   */
  async exportData(ctx) {
    try {
      const exportData = await this.generateExportData();
      ctx.body = exportData;
    } catch (error) {
      strapi.log.error('Error exporting migration data:', error);
      ctx.throw(500, 'Failed to export migration data');
    }
  },

  // Helper methods

  async getSpielMigrationStatus(spielMigrationService) {
    try {
      const validation = await spielMigrationService.validateMigrationData();
      
      let status = 'pending';
      let message = 'Migration not started';
      
      if (validation.clubBasedSpiele > 0) {
        if (validation.teamBasedSpiele === 0) {
          status = 'completed';
          message = `All ${validation.totalSpiele} spiele are using club relations`;
        } else {
          status = 'partial';
          message = `${validation.clubBasedSpiele}/${validation.totalSpiele} spiele migrated`;
        }
      }
      
      return {
        status,
        message,
        migrated: validation.clubBasedSpiele,
        remaining: validation.teamBasedSpiele,
        total: validation.totalSpiele,
        lastRun: await this.getLastMigrationTime('spiel')
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to get status',
        error: error.message
      };
    }
  },

  async getTabellenMigrationStatus() {
    try {
      // Count tabellen entries with and without club relations
      const withClub = await strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { club: { $notNull: true } }
      });
      
      const withoutClub = await strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { club: { $null: true } }
      });
      
      const total = withClub + withoutClub;
      
      let status = 'pending';
      let message = 'Migration not started';
      
      if (withClub > 0) {
        if (withoutClub === 0) {
          status = 'completed';
          message = `All ${total} tabellen entries are using club relations`;
        } else {
          status = 'partial';
          message = `${withClub}/${total} tabellen entries migrated`;
        }
      }
      
      return {
        status,
        message,
        migrated: withClub,
        remaining: withoutClub,
        total,
        lastRun: await this.getLastMigrationTime('tabellen')
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Failed to get status',
        error: error.message
      };
    }
  },

  async runSpielMigration(options) {
    const spielMigrationService = createSpielMigrationService(strapi);
    
    if (options.dryRun) {
      return await spielMigrationService.validateMigrationData();
    } else {
      return await spielMigrationService.migrateTeamToClubRelations();
    }
  },

  async runTabellenMigration(options) {
    const tabellenMigration = new TabellenEintragMigration(strapi);
    
    if (options.dryRun) {
      // For dry run, just validate without making changes
      return await this.validateTabellenMigrationData();
    } else {
      return await tabellenMigration.migrate();
    }
  },

  async validateTabellenMigrationData() {
    try {
      const withClub = await strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { club: { $notNull: true } }
      });
      
      const withoutClub = await strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { club: { $null: true } }
      });
      
      // Check for inconsistencies
      const entriesWithClub = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { club: { $notNull: true } },
        populate: ['club', 'team', 'liga']
      });
      
      const errors = [];
      const warnings = [];
      
      for (const entry of entriesWithClub) {
        // Check if team_name matches club name
        if (entry.club && entry.team_name !== entry.club.name) {
          errors.push({
            entryId: entry.id,
            type: 'TEAM_NAME_MISMATCH',
            message: `team_name "${entry.team_name}" does not match club name "${entry.club.name}"`,
            details: { entryId: entry.id, teamName: entry.team_name, clubName: entry.club.name }
          });
        }
        
        // Check if club is in correct liga
        if (entry.club && entry.liga && entry.club.ligen) {
          const clubInLiga = entry.club.ligen.some(liga => liga.id === entry.liga.id);
          if (!clubInLiga) {
            warnings.push(`Entry ${entry.id}: club "${entry.club.name}" is not in liga "${entry.liga.name}"`);
          }
        }
      }
      
      return {
        success: true,
        total: withClub + withoutClub,
        withClub,
        withoutClub,
        errors,
        warnings,
        isValid: errors.length === 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        errors: [{ message: error.message }],
        warnings: []
      };
    }
  },

  async rollbackTabellenMigration(backupId) {
    // This would need to be implemented based on backup format
    // For now, return a placeholder
    return {
      success: false,
      error: 'Tabellen migration rollback not yet implemented',
      restored: 0,
      errors: [{ message: 'Rollback functionality not implemented for tabellen migration' }]
    };
  },

  async getMigrationHistory() {
    try {
      // Try to read from a simple JSON file or database
      const fs = require('fs');
      const path = require('path');
      const historyFile = path.join(process.cwd(), 'migration-history.json');
      
      if (fs.existsSync(historyFile)) {
        const historyData = fs.readFileSync(historyFile, 'utf8');
        return JSON.parse(historyData);
      }
      
      return [];
    } catch (error) {
      strapi.log.error('Error reading migration history:', error);
      return [];
    }
  },

  async logMigrationToHistory(migrationData) {
    try {
      const fs = require('fs');
      const path = require('path');
      const historyFile = path.join(process.cwd(), 'migration-history.json');
      
      let history = [];
      if (fs.existsSync(historyFile)) {
        const historyData = fs.readFileSync(historyFile, 'utf8');
        history = JSON.parse(historyData);
      }
      
      const entry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...migrationData
      };
      
      history.push(entry);
      
      // Keep only last 100 entries
      if (history.length > 100) {
        history = history.slice(-100);
      }
      
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      strapi.log.error('Error logging migration to history:', error);
    }
  },

  async getLastMigrationTime(type) {
    try {
      const history = await this.getMigrationHistory();
      const lastMigration = history
        .filter(h => h.type === type && h.status === 'completed')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
      
      return lastMigration ? lastMigration.timestamp : null;
    } catch (error) {
      return null;
    }
  },

  async getLastValidationTime() {
    try {
      const validationResults = await this.getStoredValidationResults();
      return validationResults?.lastRun || null;
    } catch (error) {
      return null;
    }
  },

  async storeValidationResults(results) {
    try {
      const fs = require('fs');
      const path = require('path');
      const validationFile = path.join(process.cwd(), 'validation-results.json');
      
      fs.writeFileSync(validationFile, JSON.stringify(results, null, 2));
    } catch (error) {
      strapi.log.error('Error storing validation results:', error);
    }
  },

  async getStoredValidationResults() {
    try {
      const fs = require('fs');
      const path = require('path');
      const validationFile = path.join(process.cwd(), 'validation-results.json');
      
      if (fs.existsSync(validationFile)) {
        const validationData = fs.readFileSync(validationFile, 'utf8');
        return JSON.parse(validationData);
      }
      
      return null;
    } catch (error) {
      strapi.log.error('Error reading validation results:', error);
      return null;
    }
  },

  async generateDataQualityReport() {
    try {
      // Analyze spiele data
      const totalSpiele = await strapi.entityService.count('api::spiel.spiel');
      const teamBasedSpiele = await strapi.entityService.count('api::spiel.spiel', {
        filters: { 
          heim_team: { $notNull: true },
          heim_club: { $null: true }
        }
      });
      const clubBasedSpiele = await strapi.entityService.count('api::spiel.spiel', {
        filters: { heim_club: { $notNull: true } }
      });
      const inconsistentSpiele = await strapi.entityService.count('api::spiel.spiel', {
        filters: { 
          heim_team: { $notNull: true },
          heim_club: { $notNull: true }
        }
      });

      // Analyze tabellen data
      const totalTabellen = await strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag');
      const tabellenWithClub = await strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { club: { $notNull: true } }
      });
      const tabellenWithoutClub = await strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { club: { $null: true } }
      });
      
      // Find orphaned entries (entries with team but team doesn't exist)
      const orphanedTabellen = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { 
          team: { $notNull: true },
          club: { $null: true }
        },
        populate: ['team']
      });
      
      const actualOrphaned = orphanedTabellen.filter(entry => !entry.team).length;

      // Identify issues
      const issues = [];
      
      if (inconsistentSpiele > 0) {
        issues.push({
          type: 'INCONSISTENT_SPIELE',
          description: 'Spiele haben sowohl Team- als auch Club-Relationen',
          count: inconsistentSpiele
        });
      }
      
      if (actualOrphaned > 0) {
        issues.push({
          type: 'ORPHANED_TABELLEN',
          description: 'Tabellen-Einträge verweisen auf nicht existierende Teams',
          count: actualOrphaned
        });
      }
      
      if (teamBasedSpiele > 0) {
        issues.push({
          type: 'UNMIGRATED_SPIELE',
          description: 'Spiele verwenden noch Team-Relationen statt Club-Relationen',
          count: teamBasedSpiele
        });
      }

      return {
        lastGenerated: new Date().toISOString(),
        spiele: {
          total: totalSpiele,
          teamBased: teamBasedSpiele,
          clubBased: clubBasedSpiele,
          inconsistent: inconsistentSpiele
        },
        tabellen: {
          total: totalTabellen,
          withClub: tabellenWithClub,
          withoutClub: tabellenWithoutClub,
          orphaned: actualOrphaned
        },
        issues
      };
    } catch (error) {
      strapi.log.error('Error generating data quality report:', error);
      throw error;
    }
  },

  async performDataCleanup() {
    try {
      let cleaned = 0;
      const details = [];

      // Clean up orphaned tabellen entries
      const orphanedTabellen = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { 
          team: { $notNull: true },
          club: { $null: true }
        },
        populate: ['team']
      });
      
      for (const entry of orphanedTabellen) {
        if (!entry.team) {
          await strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', entry.id);
          cleaned++;
          details.push(`Deleted orphaned tabellen entry ${entry.id}`);
        }
      }

      // Clean up inconsistent spiele (remove team relations where club relations exist)
      const inconsistentSpiele = await strapi.entityService.findMany('api::spiel.spiel', {
        filters: { 
          heim_team: { $notNull: true },
          heim_club: { $notNull: true }
        }
      });
      
      for (const spiel of inconsistentSpiele) {
        await strapi.entityService.update('api::spiel.spiel', spiel.id, {
          data: {
            heim_team: null,
            gast_team: null
          }
        });
        cleaned++;
        details.push(`Cleaned inconsistent spiel ${spiel.id} - removed team relations`);
      }

      return {
        cleaned,
        details
      };
    } catch (error) {
      strapi.log.error('Error performing data cleanup:', error);
      throw error;
    }
  },

  async generateExportData() {
    try {
      const migrationHistory = await this.getMigrationHistory();
      const validationResults = await this.getStoredValidationResults();
      const dataQualityReport = await this.generateDataQualityReport();
      const migrationStatus = {
        spiel: await this.getSpielMigrationStatus(createSpielMigrationService(strapi)),
        tabellen: await this.getTabellenMigrationStatus()
      };

      return {
        exportDate: new Date().toISOString(),
        migrationStatus,
        migrationHistory,
        validationResults,
        dataQualityReport,
        metadata: {
          version: '1.0',
          exportedBy: 'migration-management-system'
        }
      };
    } catch (error) {
      strapi.log.error('Error generating export data:', error);
      throw error;
    }
  },

  async getMigrationProgress() {
    // This would be implemented to track real-time migration progress
    // For now, return a placeholder
    return {
      currentStep: 'Processing spiele...',
      processed: 150,
      total: 200,
      percentage: 75,
      estimatedTimeRemaining: '2 minutes'
    };
  }
}));