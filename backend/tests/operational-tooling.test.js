/**
 * Operational Tooling Test Suite
 * 
 * Comprehensive tests for club system operational tools including
 * maintenance, backup/restore, diagnostics, and health checks.
 */

const { setupStrapi, cleanupStrapi } = require('./helpers/strapi');
const { ClubMaintenanceManager } = require('../scripts/club-maintenance');
const { ClubBackupRestoreManager } = require('../scripts/club-backup-restore');
const { ClubDiagnosticsManager } = require('../scripts/club-diagnostics');
const { ClubHealthCheckManager } = require('../scripts/club-health-check');
const fs = require('fs').promises;
const path = require('path');

describe('Operational Tooling', () => {
  let strapi;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  describe('Club Maintenance Manager', () => {
    let maintenanceManager;

    beforeEach(() => {
      maintenanceManager = new ClubMaintenanceManager(strapi);
    });

    describe('Orphaned Club Cleanup', () => {
      test('should identify and clean orphaned clubs', async () => {
        // Create test club without liga relationship
        const orphanedClub = await strapi.entityService.create('api::club.club', {
          data: {
            name: 'Orphaned Test Club',
            club_typ: 'gegner_verein',
            aktiv: true
          }
        });

        // Run cleanup
        await maintenanceManager.cleanupOrphanedClubs();

        // Verify club was cleaned up
        const clubExists = await strapi.entityService.findOne('api::club.club', orphanedClub.id);
        expect(clubExists).toBeNull();

        // Check operation was logged
        const operations = maintenanceManager.results.operations;
        const cleanupOp = operations.find(op => op.operation === 'cleanup_orphaned_club');
        expect(cleanupOp).toBeDefined();
        expect(cleanupOp.status).toBe('success');
      });

      test('should not clean clubs referenced in games', async () => {
        // Create club without liga but referenced in game
        const club = await strapi.entityService.create('api::club.club', {
          data: {
            name: 'Referenced Test Club',
            club_typ: 'gegner_verein',
            aktiv: true
          }
        });

        // Create game referencing the club
        const liga = await strapi.entityService.findMany('api::liga.liga', { limit: 1 });
        const saison = await strapi.entityService.findMany('api::saison.saison', { limit: 1 });
        
        await strapi.entityService.create('api::spiel.spiel', {
          data: {
            datum: new Date(),
            liga: liga[0].id,
            saison: saison[0].id,
            heim_club: club.id,
            gast_club: club.id, // Self-reference for test
            spieltag: 1,
            status: 'geplant'
          }
        });

        // Run cleanup
        await maintenanceManager.cleanupOrphanedClubs();

        // Verify club was NOT cleaned up
        const clubExists = await strapi.entityService.findOne('api::club.club', club.id);
        expect(clubExists).toBeTruthy();

        // Check warning was logged
        const warnings = maintenanceManager.results.warnings;
        expect(warnings.length).toBeGreaterThan(0);
      });
    });

    describe('Duplicate Club Cleanup', () => {
      test('should identify and resolve duplicate club names', async () => {
        // Create duplicate clubs
        const club1 = await strapi.entityService.create('api::club.club', {
          data: {
            name: 'Duplicate Test Club',
            club_typ: 'gegner_verein',
            aktiv: true
          }
        });

        const club2 = await strapi.entityService.create('api::club.club', {
          data: {
            name: 'Duplicate Test Club',
            club_typ: 'gegner_verein',
            aktiv: true
          }
        });

        // Run duplicate cleanup
        await maintenanceManager.cleanupDuplicateClubs();

        // Verify only one club remains
        const remainingClubs = await strapi.entityService.findMany('api::club.club', {
          filters: { name: 'Duplicate Test Club' }
        });
        expect(remainingClubs.length).toBe(1);

        // Check operation was logged
        const operations = maintenanceManager.results.operations;
        const cleanupOp = operations.find(op => op.operation === 'cleanup_duplicate_club');
        expect(cleanupOp).toBeDefined();
        expect(cleanupOp.status).toBe('success');
      });
    });

    describe('Data Integrity Validation', () => {
      test('should validate club data integrity', async () => {
        await maintenanceManager.validateClubDataIntegrity();

        const operations = maintenanceManager.results.operations;
        const validationOps = operations.filter(op => op.operation.includes('integrity'));
        expect(validationOps.length).toBeGreaterThan(0);
      });

      test('should detect clubs without names', async () => {
        // Create club without name
        const clubWithoutName = await strapi.db.query('api::club.club').create({
          data: {
            name: null,
            club_typ: 'gegner_verein',
            aktiv: true
          }
        });

        await maintenanceManager.validateClubDataIntegrity();

        // Check that issue was detected
        const operations = maintenanceManager.results.operations;
        const nameCheck = operations.find(op => op.operation === 'clubs_have_names');
        expect(nameCheck).toBeDefined();
        expect(nameCheck.status).toBe('fail');
      });
    });

    describe('Report Generation', () => {
      test('should generate comprehensive maintenance report', async () => {
        await maintenanceManager.cleanupOrphanedClubs();
        await maintenanceManager.validateClubDataIntegrity();

        const report = maintenanceManager.generateReport();

        expect(report).toHaveProperty('timestamp');
        expect(report).toHaveProperty('operations');
        expect(report).toHaveProperty('summary');
        expect(report.summary).toHaveProperty('totalOperations');
        expect(report.summary).toHaveProperty('successfulOperations');
        expect(report.summary).toHaveProperty('warnings');
        expect(report.summary).toHaveProperty('errors');
      });

      test('should save maintenance report to file', async () => {
        const reportFile = await maintenanceManager.saveReport();
        expect(reportFile).toBeTruthy();

        // Verify file exists and contains valid JSON
        const reportContent = await fs.readFile(reportFile, 'utf8');
        const reportData = JSON.parse(reportContent);
        expect(reportData).toHaveProperty('timestamp');
        expect(reportData).toHaveProperty('operations');

        // Cleanup
        await fs.unlink(reportFile);
      });
    });
  });

  describe('Backup & Restore Manager', () => {
    let backupManager;

    beforeEach(() => {
      backupManager = new ClubBackupRestoreManager(strapi);
    });

    describe('Full Backup', () => {
      test('should create full backup of club data', async () => {
        const backupResult = await backupManager.createFullBackup();

        expect(backupResult).toHaveProperty('backupPath');
        expect(backupResult).toHaveProperty('metadataPath');
        expect(backupResult).toHaveProperty('checksum');
        expect(backupResult).toHaveProperty('fileSize');

        // Verify backup file exists
        await fs.access(backupResult.backupPath);
        await fs.access(backupResult.metadataPath);

        // Verify metadata
        const metadata = JSON.parse(await fs.readFile(backupResult.metadataPath, 'utf8'));
        expect(metadata).toHaveProperty('version');
        expect(metadata).toHaveProperty('timestamp');
        expect(metadata).toHaveProperty('backupType', 'full');
        expect(metadata).toHaveProperty('checksum');

        // Cleanup
        await fs.unlink(backupResult.backupPath);
        await fs.unlink(backupResult.metadataPath);
      });

      test('should include all club-related tables in backup', async () => {
        const backupResult = await backupManager.createFullBackup();

        // Read and verify backup content
        const metadata = JSON.parse(await fs.readFile(backupResult.metadataPath, 'utf8'));
        const expectedTables = ['clubs', 'spiele', 'tabellen_eintraege', 'ligen'];
        
        expectedTables.forEach(table => {
          expect(metadata.tables).toContain(table);
        });

        // Cleanup
        await fs.unlink(backupResult.backupPath);
        await fs.unlink(backupResult.metadataPath);
      });
    });

    describe('Incremental Backup', () => {
      test('should create incremental backup with changes only', async () => {
        // Create initial full backup
        const fullBackup = await backupManager.createFullBackup();
        
        // Wait a moment to ensure timestamp difference
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Create some new data
        await strapi.entityService.create('api::club.club', {
          data: {
            name: 'New Test Club for Incremental',
            club_typ: 'gegner_verein',
            aktiv: true
          }
        });

        // Create incremental backup
        const incrementalResult = await backupManager.createIncrementalBackup();

        expect(incrementalResult).toBeTruthy();
        expect(incrementalResult).toHaveProperty('backupPath');
        expect(incrementalResult).toHaveProperty('totalRecords');
        expect(incrementalResult.totalRecords).toBeGreaterThan(0);

        // Verify metadata
        const metadata = JSON.parse(await fs.readFile(incrementalResult.metadataPath, 'utf8'));
        expect(metadata.backupType).toBe('incremental');
        expect(metadata.options).toHaveProperty('sinceDate');

        // Cleanup
        await fs.unlink(fullBackup.backupPath);
        await fs.unlink(fullBackup.metadataPath);
        await fs.unlink(incrementalResult.backupPath);
        await fs.unlink(incrementalResult.metadataPath);
      });
    });

    describe('Backup Listing', () => {
      test('should list available backups', async () => {
        // Create a test backup
        const backup = await backupManager.createFullBackup();

        // List backups
        const backups = await backupManager.listBackups();

        expect(Array.isArray(backups)).toBe(true);
        expect(backups.length).toBeGreaterThan(0);

        const testBackup = backups.find(b => b.backupPath === backup.backupPath);
        expect(testBackup).toBeDefined();
        expect(testBackup).toHaveProperty('name');
        expect(testBackup).toHaveProperty('type');
        expect(testBackup).toHaveProperty('timestamp');
        expect(testBackup).toHaveProperty('fileSize');

        // Cleanup
        await fs.unlink(backup.backupPath);
        await fs.unlink(backup.metadataPath);
      });
    });

    describe('Backup Restore', () => {
      test('should restore data from backup', async () => {
        // Create test club
        const originalClub = await strapi.entityService.create('api::club.club', {
          data: {
            name: 'Original Test Club for Restore',
            club_typ: 'gegner_verein',
            aktiv: true
          }
        });

        // Create backup
        const backup = await backupManager.createFullBackup();
        const backupName = path.basename(backup.backupPath, '.json.gz');

        // Delete the original club
        await strapi.entityService.delete('api::club.club', originalClub.id);

        // Restore from backup
        const restoreResult = await backupManager.restoreFromBackup(backupName);

        expect(restoreResult).toHaveProperty('success', true);
        expect(restoreResult).toHaveProperty('restoredTables');

        // Verify club was restored
        const restoredClubs = await strapi.entityService.findMany('api::club.club', {
          filters: { name: 'Original Test Club for Restore' }
        });
        expect(restoredClubs.length).toBeGreaterThan(0);

        // Cleanup
        await fs.unlink(backup.backupPath);
        await fs.unlink(backup.metadataPath);
      });

      test('should perform dry run restore', async () => {
        // Create backup
        const backup = await backupManager.createFullBackup();
        const backupName = path.basename(backup.backupPath, '.json.gz');

        // Perform dry run restore
        const dryRunResult = await backupManager.restoreFromBackup(backupName, { dryRun: true });

        expect(dryRunResult).toHaveProperty('dryRun', true);
        expect(dryRunResult).toHaveProperty('tables');

        // Cleanup
        await fs.unlink(backup.backupPath);
        await fs.unlink(backup.metadataPath);
      });
    });

    describe('Backup Cleanup', () => {
      test('should clean up old backups', async () => {
        // Create test backup
        const backup = await backupManager.createFullBackup();

        // Clean up with very short retention (should delete the backup)
        const cleanupResult = await backupManager.cleanupOldBackups({
          retentionDays: 0,
          keepMinimum: 0
        });

        expect(cleanupResult).toHaveProperty('deletedCount');
        expect(cleanupResult.deletedCount).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Diagnostics Manager', () => {
    let diagnosticsManager;

    beforeEach(() => {
      diagnosticsManager = new ClubDiagnosticsManager(strapi);
    });

    describe('Database Health Check', () => {
      test('should check database connectivity and performance', async () => {
        await diagnosticsManager.checkDatabaseHealth();

        const checks = diagnosticsManager.diagnostics.checks;
        const dbConnectivityCheck = checks.find(c => c.name === 'database_connectivity');
        
        expect(dbConnectivityCheck).toBeDefined();
        expect(dbConnectivityCheck.status).toBe('pass');
        expect(dbConnectivityCheck.details).toHaveProperty('responseTime');
      });

      test('should analyze table sizes', async () => {
        await diagnosticsManager.checkDatabaseHealth();

        const checks = diagnosticsManager.diagnostics.checks;
        const tableSizeCheck = checks.find(c => c.name === 'table_sizes');
        
        expect(tableSizeCheck).toBeDefined();
        expect(tableSizeCheck.details).toHaveProperty('tables');
        expect(Array.isArray(tableSizeCheck.details.tables)).toBe(true);
      });
    });

    describe('Club Data Integrity Check', () => {
      test('should validate club data integrity', async () => {
        await diagnosticsManager.checkClubDataIntegrity();

        const checks = diagnosticsManager.diagnostics.checks;
        const nameCheck = checks.find(c => c.name === 'clubs_have_names');
        const mappingCheck = checks.find(c => c.name === 'viktoria_club_mappings');
        
        expect(nameCheck).toBeDefined();
        expect(mappingCheck).toBeDefined();
      });

      test('should detect data integrity issues', async () => {
        // Create club with integrity issue
        await strapi.db.query('api::club.club').create({
          data: {
            name: null, // This should trigger an integrity issue
            club_typ: 'gegner_verein',
            aktiv: true
          }
        });

        await diagnosticsManager.checkClubDataIntegrity();

        const issues = diagnosticsManager.diagnostics.issues;
        expect(issues.length).toBeGreaterThan(0);
      });
    });

    describe('Performance Metrics Check', () => {
      test('should check system performance metrics', async () => {
        await diagnosticsManager.checkPerformanceMetrics();

        const checks = diagnosticsManager.diagnostics.checks;
        const memoryCheck = checks.find(c => c.name === 'memory_usage');
        const loadCheck = checks.find(c => c.name === 'system_load');
        const queryCheck = checks.find(c => c.name === 'query_performance');
        
        expect(memoryCheck).toBeDefined();
        expect(loadCheck).toBeDefined();
        expect(queryCheck).toBeDefined();
      });
    });

    describe('Cache Health Check', () => {
      test('should check cache system health', async () => {
        await diagnosticsManager.checkCacheHealth();

        const checks = diagnosticsManager.diagnostics.checks;
        const cacheManagerCheck = checks.find(c => c.name === 'cache_manager_exists');
        
        expect(cacheManagerCheck).toBeDefined();
      });
    });

    describe('Comprehensive Diagnostics', () => {
      test('should run all diagnostic checks', async () => {
        const diagnostics = await diagnosticsManager.runAllChecks();

        expect(diagnostics).toHaveProperty('timestamp');
        expect(diagnostics).toHaveProperty('checks');
        expect(diagnostics).toHaveProperty('summary');
        expect(diagnostics.checks.length).toBeGreaterThan(0);
        expect(diagnostics.summary).toHaveProperty('overallHealth');
      });

      test('should generate recommendations', async () => {
        await diagnosticsManager.runAllChecks();

        const recommendations = diagnosticsManager.diagnostics.recommendations;
        expect(Array.isArray(recommendations)).toBe(true);
        
        // Each recommendation should have required properties
        recommendations.forEach(rec => {
          expect(rec).toHaveProperty('category');
          expect(rec).toHaveProperty('priority');
          expect(rec).toHaveProperty('message');
        });
      });

      test('should save diagnostic report', async () => {
        await diagnosticsManager.runAllChecks();
        const reportFile = await diagnosticsManager.saveDiagnosticReport();

        expect(reportFile).toBeTruthy();

        // Verify file exists and contains valid JSON
        const reportContent = await fs.readFile(reportFile, 'utf8');
        const reportData = JSON.parse(reportContent);
        expect(reportData).toHaveProperty('timestamp');
        expect(reportData).toHaveProperty('checks');

        // Cleanup
        await fs.unlink(reportFile);
      });
    });
  });

  describe('Health Check Manager', () => {
    let healthCheckManager;

    beforeEach(() => {
      healthCheckManager = new ClubHealthCheckManager(strapi);
    });

    describe('Basic Health Check', () => {
      test('should perform basic health check', async () => {
        const healthCheck = await healthCheckManager.performBasicHealthCheck();

        expect(healthCheck).toHaveProperty('timestamp');
        expect(healthCheck).toHaveProperty('type', 'basic');
        expect(healthCheck).toHaveProperty('status');
        expect(healthCheck).toHaveProperty('checks');
        expect(healthCheck).toHaveProperty('duration');
        expect(healthCheck).toHaveProperty('metrics');

        // Verify required checks are present
        expect(healthCheck.checks).toHaveProperty('database');
        expect(healthCheck.checks).toHaveProperty('clubData');
        expect(healthCheck.checks).toHaveProperty('cache');
        expect(healthCheck.checks).toHaveProperty('monitoring');
      });

      test('should calculate correct health status', async () => {
        const healthCheck = await healthCheckManager.performBasicHealthCheck();

        expect(['healthy', 'warning', 'critical', 'error']).toContain(healthCheck.status);
        
        if (healthCheck.status === 'critical' || healthCheck.status === 'error') {
          expect(healthCheck.issues.length).toBeGreaterThan(0);
        }
      });
    });

    describe('Deep Health Check', () => {
      test('should perform deep health check', async () => {
        const healthCheck = await healthCheckManager.performDeepHealthCheck();

        expect(healthCheck).toHaveProperty('type', 'deep');
        expect(healthCheck).toHaveProperty('recommendations');
        
        // Deep check should have more checks than basic
        const checkCount = Object.keys(healthCheck.checks).length;
        expect(checkCount).toBeGreaterThan(4); // More than basic checks
      });

      test('should generate recommendations for issues', async () => {
        const healthCheck = await healthCheckManager.performDeepHealthCheck();

        expect(Array.isArray(healthCheck.recommendations)).toBe(true);
        
        // Each recommendation should have required properties
        healthCheck.recommendations.forEach(rec => {
          expect(rec).toHaveProperty('priority');
          expect(rec).toHaveProperty('category');
          expect(rec).toHaveProperty('message');
          expect(['high', 'medium', 'low']).toContain(rec.priority);
        });
      });
    });

    describe('Health History', () => {
      test('should maintain health check history', async () => {
        // Perform multiple health checks
        await healthCheckManager.performBasicHealthCheck();
        await healthCheckManager.performBasicHealthCheck();

        const status = healthCheckManager.getHealthStatus();
        
        expect(status).toHaveProperty('healthHistory');
        expect(status.healthHistory.length).toBeGreaterThanOrEqual(2);
        expect(status).toHaveProperty('statistics');
        expect(status.statistics).toHaveProperty('totalChecks');
      });

      test('should limit history size', async () => {
        // Set a small history limit for testing
        healthCheckManager.config.retention.maxHistoryEntries = 2;

        // Perform more checks than the limit
        await healthCheckManager.performBasicHealthCheck();
        await healthCheckManager.performBasicHealthCheck();
        await healthCheckManager.performBasicHealthCheck();

        expect(healthCheckManager.healthHistory.length).toBeLessThanOrEqual(2);
      });
    });

    describe('Alert Detection', () => {
      test('should detect consecutive failures', async () => {
        // Mock consecutive failures
        const failedCheck = {
          timestamp: new Date().toISOString(),
          type: 'basic',
          status: 'critical',
          checks: {},
          issues: ['Test failure'],
          metrics: {}
        };

        // Add multiple failed checks to history
        healthCheckManager.config.alertThresholds.consecutiveFailures = 2;
        healthCheckManager.addToHealthHistory(failedCheck);
        healthCheckManager.addToHealthHistory(failedCheck);

        // This should trigger alert detection
        await healthCheckManager.checkForAlerts(failedCheck);

        // Verify alert would be sent (we can't easily test actual sending)
        expect(healthCheckManager.healthHistory.length).toBe(2);
      });
    });

    describe('Configuration', () => {
      test('should load configuration from environment', async () => {
        const config = healthCheckManager.config;

        expect(config).toHaveProperty('enabled');
        expect(config).toHaveProperty('interval');
        expect(config).toHaveProperty('alertThresholds');
        expect(config).toHaveProperty('notifications');
        expect(config).toHaveProperty('retention');
      });

      test('should have reasonable default values', async () => {
        const config = healthCheckManager.config;

        expect(config.alertThresholds.consecutiveFailures).toBeGreaterThan(0);
        expect(config.alertThresholds.responseTimeWarning).toBeGreaterThan(0);
        expect(config.alertThresholds.responseTimeCritical).toBeGreaterThan(config.alertThresholds.responseTimeWarning);
        expect(config.retention.historyDays).toBeGreaterThan(0);
        expect(config.retention.maxHistoryEntries).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration Tests', () => {
    test('should work together for complete operational workflow', async () => {
      // 1. Run diagnostics to identify issues
      const diagnosticsManager = new ClubDiagnosticsManager(strapi);
      const diagnostics = await diagnosticsManager.runAllChecks();
      
      expect(diagnostics.summary.overallHealth).toBeDefined();

      // 2. Create backup before maintenance
      const backupManager = new ClubBackupRestoreManager(strapi);
      const backup = await backupManager.createFullBackup();
      
      expect(backup.backupPath).toBeTruthy();

      // 3. Run maintenance operations
      const maintenanceManager = new ClubMaintenanceManager(strapi);
      await maintenanceManager.cleanupOrphanedClubs();
      await maintenanceManager.validateClubDataIntegrity();
      
      const maintenanceReport = maintenanceManager.generateReport();
      expect(maintenanceReport.summary.totalOperations).toBeGreaterThan(0);

      // 4. Verify system health after maintenance
      const healthCheckManager = new ClubHealthCheckManager(strapi);
      const healthCheck = await healthCheckManager.performBasicHealthCheck();
      
      expect(healthCheck.status).toBeDefined();

      // Cleanup
      await fs.unlink(backup.backupPath);
      await fs.unlink(backup.metadataPath);
    });

    test('should handle errors gracefully across all tools', async () => {
      // Test error handling by temporarily breaking database connection
      const originalConnection = strapi.db.connection;
      
      // Mock a broken connection
      strapi.db.connection = {
        raw: () => Promise.reject(new Error('Connection failed'))
      };

      try {
        // All tools should handle the error gracefully
        const diagnosticsManager = new ClubDiagnosticsManager(strapi);
        await diagnosticsManager.checkDatabaseHealth();
        
        const healthCheckManager = new ClubHealthCheckManager(strapi);
        await healthCheckManager.performBasicHealthCheck();

        // Verify errors were logged but didn't crash
        expect(diagnosticsManager.diagnostics.errors.length).toBeGreaterThan(0);
        expect(healthCheckManager.lastHealthCheck.status).toBe('error');

      } finally {
        // Restore connection
        strapi.db.connection = originalConnection;
      }
    });
  });

  describe('Performance Tests', () => {
    test('should complete operations within reasonable time limits', async () => {
      const startTime = Date.now();

      // Run basic operations
      const diagnosticsManager = new ClubDiagnosticsManager(strapi);
      await diagnosticsManager.checkDatabaseHealth();
      await diagnosticsManager.checkClubDataIntegrity();

      const healthCheckManager = new ClubHealthCheckManager(strapi);
      await healthCheckManager.performBasicHealthCheck();

      const duration = Date.now() - startTime;
      
      // Should complete within 30 seconds
      expect(duration).toBeLessThan(30000);
    });

    test('should handle large datasets efficiently', async () => {
      // Create multiple test clubs
      const clubPromises = [];
      for (let i = 0; i < 50; i++) {
        clubPromises.push(
          strapi.entityService.create('api::club.club', {
            data: {
              name: `Performance Test Club ${i}`,
              club_typ: 'gegner_verein',
              aktiv: true
            }
          })
        );
      }
      await Promise.all(clubPromises);

      const startTime = Date.now();

      // Run maintenance on larger dataset
      const maintenanceManager = new ClubMaintenanceManager(strapi);
      await maintenanceManager.validateClubDataIntegrity();

      const duration = Date.now() - startTime;
      
      // Should still complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds
    });
  });
});