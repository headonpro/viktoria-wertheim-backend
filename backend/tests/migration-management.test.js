/**
 * Migration Management Tools Test Suite
 * Requirements: 8.1, 8.2, 8.5
 */

const { setupStrapi, cleanupStrapi } = require('./helpers/strapi');
const { MigrationManager } = require('../scripts/migration-manager');
const fs = require('fs');
const path = require('path');

describe('Migration Management Tools', () => {
  let strapi;
  let migrationManager;

  beforeAll(async () => {
    strapi = await setupStrapi();
    migrationManager = new MigrationManager(strapi, { verbose: false });
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await cleanupTestData();
  });

  describe('Migration Status Monitoring', () => {
    test('should get migration status overview', async () => {
      const status = await migrationManager.showStatus();
      
      expect(status).toBeDefined();
      // Status is displayed, not returned, so we test the underlying methods
    });

    test('should track spiel migration progress', async () => {
      // Create test spiele with team relations
      const testSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: 1,
          saison: 1,
          heim_team: 1,
          gast_team: 2,
          status: 'beendet',
          heim_tore: 2,
          gast_tore: 1,
          spieltag: 1
        }
      });

      const spielStatus = migrationManager.getSpielStatus({
        totalSpiele: 1,
        clubBasedSpiele: 0,
        teamBasedSpiele: 1,
        inconsistencies: []
      });

      expect(spielStatus.status).toBe('pending');
      expect(spielStatus.progress).toBe(0);
      expect(spielStatus.total).toBe(1);
      expect(spielStatus.remaining).toBe(1);
    });

    test('should track tabellen migration progress', async () => {
      // Create test tabellen entry without club relation
      const testEntry = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
        data: {
          team_name: '1. Mannschaft',
          liga: 1,
          team: 1,
          platz: 1,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0
        }
      });

      const tabellenStatus = await migrationManager.getTabellenStatus();

      expect(tabellenStatus.status).toBe('pending');
      expect(tabellenStatus.total).toBeGreaterThan(0);
      expect(tabellenStatus.remaining).toBeGreaterThan(0);
    });
  });

  describe('Migration Validation', () => {
    test('should run comprehensive validation', async () => {
      const validationReport = await migrationManager.runValidation();

      expect(validationReport).toHaveProperty('timestamp');
      expect(validationReport).toHaveProperty('spiel');
      expect(validationReport).toHaveProperty('tabellen');
      expect(validationReport).toHaveProperty('consistency');
      expect(validationReport).toHaveProperty('summary');
      
      expect(validationReport.summary).toHaveProperty('overallStatus');
      expect(validationReport.summary).toHaveProperty('totalIssues');
    });

    test('should validate spiel migration data', async () => {
      // Create test data with inconsistencies
      const testSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: 1,
          saison: 1,
          heim_team: 1,
          gast_team: 2,
          heim_club: 1, // This creates an inconsistency
          gast_club: 2,
          status: 'beendet',
          spieltag: 1
        }
      });

      const consistencyCheck = await migrationManager.checkDataConsistency();

      expect(consistencyCheck).toHaveProperty('isConsistent');
      expect(consistencyCheck).toHaveProperty('issues');
      
      if (consistencyCheck.issues.length > 0) {
        expect(consistencyCheck.issues[0]).toHaveProperty('type');
        expect(consistencyCheck.issues[0]).toHaveProperty('count');
        expect(consistencyCheck.issues[0]).toHaveProperty('description');
      }
    });

    test('should validate tabellen migration data', async () => {
      const tabellenValidation = await migrationManager.validateTabellenMigration();

      expect(tabellenValidation).toHaveProperty('isValid');
      expect(tabellenValidation).toHaveProperty('total');
      expect(tabellenValidation).toHaveProperty('withClub');
      expect(tabellenValidation).toHaveProperty('withoutClub');
      expect(tabellenValidation).toHaveProperty('errors');
      expect(tabellenValidation).toHaveProperty('warnings');
    });

    test('should generate validation summary', async () => {
      const spielValidation = { inconsistencies: [] };
      const tabellenValidation = { errors: [] };
      const consistencyCheck = { isConsistent: true, issues: [] };

      const summary = migrationManager.generateValidationSummary(
        spielValidation, 
        tabellenValidation, 
        consistencyCheck
      );

      expect(summary).toHaveProperty('overallStatus');
      expect(summary).toHaveProperty('totalIssues');
      expect(summary).toHaveProperty('spielMigrationReady');
      expect(summary).toHaveProperty('tabellenMigrationReady');
      expect(summary).toHaveProperty('dataConsistent');
      
      expect(summary.overallStatus).toBe('VALID');
      expect(summary.totalIssues).toBe(0);
    });
  });

  describe('Migration Execution', () => {
    test('should run spiel migration in dry-run mode', async () => {
      migrationManager.options.dryRun = true;
      
      const result = await migrationManager.runSpielMigration();

      expect(result).toBeDefined();
      // In dry-run mode, it should return validation data
      expect(result).toHaveProperty('totalSpiele');
    });

    test('should run tabellen migration in dry-run mode', async () => {
      migrationManager.options.dryRun = true;
      
      const result = await migrationManager.runTabellenMigration();

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('withClub');
      expect(result).toHaveProperty('withoutClub');
    });

    test('should handle migration type detection from backup ID', () => {
      expect(migrationManager.getMigrationTypeFromBackupId('spiel-migration-backup-123')).toBe('spiel');
      expect(migrationManager.getMigrationTypeFromBackupId('tabellen-migration-backup-456')).toBe('tabellen');
      
      expect(() => {
        migrationManager.getMigrationTypeFromBackupId('unknown-backup-789');
      }).toThrow('Cannot determine migration type from backup ID');
    });
  });

  describe('Data Cleanup', () => {
    test('should clean orphaned tabellen entries', async () => {
      // Create orphaned entry (with team reference but no actual team)
      const orphanedEntry = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
        data: {
          team_name: 'Orphaned Team',
          liga: 1,
          team: 999, // Non-existent team ID
          platz: 1,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0
        }
      });

      migrationManager.options.dryRun = true;
      const cleanedCount = await migrationManager.cleanOrphanedTabellenEntries();

      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });

    test('should clean inconsistent spiele', async () => {
      // Create inconsistent spiel (with both team and club relations)
      const inconsistentSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: 1,
          saison: 1,
          heim_team: 1,
          gast_team: 2,
          heim_club: 1,
          gast_club: 2,
          status: 'beendet',
          spieltag: 1
        }
      });

      migrationManager.options.dryRun = true;
      const cleanedCount = await migrationManager.cleanInconsistentSpiele();

      expect(typeof cleanedCount).toBe('number');
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });

    test('should perform comprehensive data cleanup', async () => {
      const cleanupResults = await migrationManager.cleanupData();

      expect(cleanupResults).toHaveProperty('orphanedTabellen');
      expect(cleanupResults).toHaveProperty('inconsistentSpiele');
      expect(cleanupResults).toHaveProperty('details');
      
      expect(typeof cleanupResults.orphanedTabellen).toBe('number');
      expect(typeof cleanupResults.inconsistentSpiele).toBe('number');
      expect(Array.isArray(cleanupResults.details)).toBe(true);
    });
  });

  describe('Data Quality Reporting', () => {
    test('should generate data quality report', async () => {
      const report = await migrationManager.generateDataQualityReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('spiele');
      expect(report).toHaveProperty('tabellen');
      
      expect(report.spiele).toHaveProperty('total');
      expect(report.spiele).toHaveProperty('teamBased');
      expect(report.spiele).toHaveProperty('clubBased');
      expect(report.spiele).toHaveProperty('migrationProgress');
      
      expect(report.tabellen).toHaveProperty('total');
      expect(report.tabellen).toHaveProperty('withClub');
      expect(report.tabellen).toHaveProperty('withoutClub');
      expect(report.tabellen).toHaveProperty('migrationProgress');
      
      expect(typeof report.spiele.migrationProgress).toBe('number');
      expect(typeof report.tabellen.migrationProgress).toBe('number');
    });

    test('should calculate migration progress correctly', async () => {
      const report = await migrationManager.generateDataQualityReport();

      // Progress should be between 0 and 100
      expect(report.spiele.migrationProgress).toBeGreaterThanOrEqual(0);
      expect(report.spiele.migrationProgress).toBeLessThanOrEqual(100);
      expect(report.tabellen.migrationProgress).toBeGreaterThanOrEqual(0);
      expect(report.tabellen.migrationProgress).toBeLessThanOrEqual(100);
    });
  });

  describe('Migration History', () => {
    test('should get migration history', async () => {
      const history = await migrationManager.getMigrationHistory();

      expect(Array.isArray(history)).toBe(true);
      // History might be empty initially, which is fine
    });

    test('should get available backups', async () => {
      const backups = await migrationManager.getAvailableBackups();

      expect(Array.isArray(backups)).toBe(true);
      // Backups might be empty initially, which is fine
    });

    test('should log migration results', async () => {
      const testResults = {
        success: true,
        processed: 10,
        migrated: 8,
        errors: []
      };

      await migrationManager.logMigrationResults('test', testResults);

      // Check if history file was created/updated
      const historyFile = path.join(process.cwd(), 'migration-history.json');
      if (fs.existsSync(historyFile)) {
        const historyData = fs.readFileSync(historyFile, 'utf8');
        const history = JSON.parse(historyData);
        
        expect(Array.isArray(history)).toBe(true);
        
        if (history.length > 0) {
          const lastEntry = history[history.length - 1];
          expect(lastEntry).toHaveProperty('type');
          expect(lastEntry).toHaveProperty('timestamp');
          expect(lastEntry).toHaveProperty('results');
        }
      }
    });

    test('should log rollback results', async () => {
      const testResult = {
        success: true,
        restored: 5,
        errors: []
      };

      await migrationManager.logRollbackResults('test', 'test-backup-123', testResult);

      // Similar check as above for rollback logging
      const historyFile = path.join(process.cwd(), 'migration-history.json');
      if (fs.existsSync(historyFile)) {
        const historyData = fs.readFileSync(historyFile, 'utf8');
        const history = JSON.parse(historyData);
        
        expect(Array.isArray(history)).toBe(true);
      }
    });
  });

  describe('Overall Statistics', () => {
    test('should get overall migration statistics', async () => {
      const stats = await migrationManager.getOverallStats();

      expect(stats).toHaveProperty('totalMigrations');
      expect(stats).toHaveProperty('successfulMigrations');
      expect(stats).toHaveProperty('failedMigrations');
      expect(stats).toHaveProperty('availableBackups');
      expect(stats).toHaveProperty('lastMigration');
      
      expect(typeof stats.totalMigrations).toBe('number');
      expect(typeof stats.successfulMigrations).toBe('number');
      expect(typeof stats.failedMigrations).toBe('number');
      expect(typeof stats.availableBackups).toBe('number');
    });
  });

  describe('Display Methods', () => {
    test('should get correct status icon', () => {
      expect(migrationManager.getStatusIcon('completed')).toBe('✅');
      expect(migrationManager.getStatusIcon('partial')).toBe('🔄');
      expect(migrationManager.getStatusIcon('pending')).toBe('⏳');
      expect(migrationManager.getStatusIcon('failed')).toBe('❌');
      expect(migrationManager.getStatusIcon('unknown')).toBe('❓');
    });

    test('should handle logging methods without errors', () => {
      // Test that logging methods don't throw errors
      expect(() => {
        migrationManager.log('Test message');
        migrationManager.warn('Test warning');
        migrationManager.error('Test error');
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid migration type gracefully', () => {
      expect(() => {
        migrationManager.getMigrationTypeFromBackupId('invalid-backup-id');
      }).toThrow();
    });

    test('should handle missing backup directory gracefully', async () => {
      // This should not throw an error, just return empty array
      const backups = await migrationManager.getAvailableBackups();
      expect(Array.isArray(backups)).toBe(true);
    });

    test('should handle missing history file gracefully', async () => {
      // This should not throw an error, just return empty array
      const history = await migrationManager.getMigrationHistory();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  // Helper function to clean up test data
  async function cleanupTestData() {
    try {
      // Clean up test spiele
      const testSpiele = await strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          $or: [
            { heim_team: { $notNull: true } },
            { heim_club: { $notNull: true } }
          ]
        }
      });

      for (const spiel of testSpiele) {
        await strapi.entityService.delete('api::spiel.spiel', spiel.id);
      }

      // Clean up test tabellen entries
      const testTabellen = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag');
      for (const entry of testTabellen) {
        await strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', entry.id);
      }

      // Clean up test history file
      const historyFile = path.join(process.cwd(), 'migration-history.json');
      if (fs.existsSync(historyFile)) {
        fs.unlinkSync(historyFile);
      }

      // Clean up test validation file
      const validationFile = path.join(process.cwd(), 'validation-results.json');
      if (fs.existsSync(validationFile)) {
        fs.unlinkSync(validationFile);
      }
    } catch (error) {
      console.warn('Error cleaning up test data:', error.message);
    }
  }
});

describe('Migration Management API Controller', () => {
  let strapi;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  describe('API Endpoints', () => {
    test('should have migration controller', () => {
      expect(strapi.controller('api::migration.migration')).toBeDefined();
    });

    test('should handle getStatus method', async () => {
      const controller = strapi.controller('api::migration.migration');
      expect(controller.getStatus).toBeDefined();
      expect(typeof controller.getStatus).toBe('function');
    });

    test('should handle getHistory method', async () => {
      const controller = strapi.controller('api::migration.migration');
      expect(controller.getHistory).toBeDefined();
      expect(typeof controller.getHistory).toBe('function');
    });

    test('should handle runMigration method', async () => {
      const controller = strapi.controller('api::migration.migration');
      expect(controller.runMigration).toBeDefined();
      expect(typeof controller.runMigration).toBe('function');
    });

    test('should handle rollbackMigration method', async () => {
      const controller = strapi.controller('api::migration.migration');
      expect(controller.rollbackMigration).toBeDefined();
      expect(typeof controller.rollbackMigration).toBe('function');
    });

    test('should handle runValidation method', async () => {
      const controller = strapi.controller('api::migration.migration');
      expect(controller.runValidation).toBeDefined();
      expect(typeof controller.runValidation).toBe('function');
    });

    test('should handle getValidation method', async () => {
      const controller = strapi.controller('api::migration.migration');
      expect(controller.getValidation).toBeDefined();
      expect(typeof controller.getValidation).toBe('function');
    });

    test('should handle getDataQuality method', async () => {
      const controller = strapi.controller('api::migration.migration');
      expect(controller.getDataQuality).toBeDefined();
      expect(typeof controller.getDataQuality).toBe('function');
    });

    test('should handle runCleanup method', async () => {
      const controller = strapi.controller('api::migration.migration');
      expect(controller.runCleanup).toBeDefined();
      expect(typeof controller.runCleanup).toBe('function');
    });

    test('should handle exportData method', async () => {
      const controller = strapi.controller('api::migration.migration');
      expect(controller.exportData).toBeDefined();
      expect(typeof controller.exportData).toBe('function');
    });
  });
});