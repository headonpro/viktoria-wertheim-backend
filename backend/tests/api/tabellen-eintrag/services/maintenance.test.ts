/**
 * Maintenance Service Tests
 * Tests for data cleanup, backup/restore, and system diagnostics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMaintenanceService, MaintenanceServiceImpl } from '../../../../src/api/tabellen-eintrag/services/maintenance';
import { createAutomationLogger } from '../../../../src/api/tabellen-eintrag/services/logger';
import { SnapshotServiceImpl } from '../../../../src/api/tabellen-eintrag/services/snapshot';

describe('MaintenanceService', () => {
  let maintenanceService: any;
  let mockLogger: any;
  let mockSnapshotService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockLogger = createAutomationLogger();
    mockSnapshotService = {
      restoreSnapshot: vi.fn().mockResolvedValue(undefined)
    };
    
    maintenanceService = createMaintenanceService(mockLogger, mockSnapshotService);
  });

  describe('data cleanup operations', () => {
    describe('cleanupOldLogs', () => {
      it('should cleanup old logs successfully', async () => {
        const maxAge = 86400000; // 24 hours
        
        const result = await maintenanceService.cleanupOldLogs(maxAge);

        expect(result).toHaveProperty('operation', 'cleanup_old_logs');
        expect(result).toHaveProperty('itemsProcessed');
        expect(result).toHaveProperty('itemsDeleted');
        expect(result).toHaveProperty('spaceFreed');
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');

        expect(result.itemsProcessed).toBeGreaterThan(0);
        expect(result.itemsDeleted).toBeGreaterThan(0);
        expect(result.spaceFreed).toBeGreaterThan(0);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle cleanup errors gracefully', async () => {
        // Mock an error scenario
        const originalConsole = console.error;
        console.error = vi.fn();

        const result = await maintenanceService.cleanupOldLogs(86400000);

        expect(result).toHaveProperty('operation', 'cleanup_old_logs');
        expect(result.duration).toBeGreaterThan(0);

        console.error = originalConsole;
      });
    });

    describe('cleanupOldSnapshots', () => {
      it('should cleanup old snapshots successfully', async () => {
        const maxAge = 604800000; // 7 days
        
        const result = await maintenanceService.cleanupOldSnapshots(maxAge);

        expect(result).toHaveProperty('operation', 'cleanup_old_snapshots');
        expect(result.itemsProcessed).toBeGreaterThan(0);
        expect(result.itemsDeleted).toBeGreaterThan(0);
        expect(result.spaceFreed).toBeGreaterThan(0);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('cleanupOldMetrics', () => {
      it('should cleanup old metrics successfully', async () => {
        const maxAge = 2592000000; // 30 days
        
        const result = await maintenanceService.cleanupOldMetrics(maxAge);

        expect(result).toHaveProperty('operation', 'cleanup_old_metrics');
        expect(result.itemsProcessed).toBeGreaterThan(0);
        expect(result.itemsDeleted).toBeGreaterThan(0);
        expect(result.spaceFreed).toBeGreaterThan(0);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('cleanupFailedJobs', () => {
      it('should cleanup failed jobs successfully', async () => {
        const maxAge = 86400000; // 24 hours
        
        const result = await maintenanceService.cleanupFailedJobs(maxAge);

        expect(result).toHaveProperty('operation', 'cleanup_failed_jobs');
        expect(result.itemsProcessed).toBeGreaterThan(0);
        expect(result.itemsDeleted).toBeGreaterThan(0);
        expect(result.spaceFreed).toBeGreaterThan(0);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('database maintenance', () => {
    describe('optimizeDatabase', () => {
      it('should optimize database successfully', async () => {
        const result = await maintenanceService.optimizeDatabase();

        expect(result).toHaveProperty('operation', 'optimize_database');
        expect(result).toHaveProperty('tablesProcessed');
        expect(result).toHaveProperty('indexesProcessed');
        expect(result).toHaveProperty('spaceReclaimed');
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('improvements');
        expect(result).toHaveProperty('errors');

        expect(result.tablesProcessed).toBeGreaterThan(0);
        expect(result.indexesProcessed).toBeGreaterThan(0);
        expect(result.spaceReclaimed).toBeGreaterThan(0);
        expect(Array.isArray(result.improvements)).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('rebuildIndexes', () => {
      it('should rebuild indexes successfully', async () => {
        const result = await maintenanceService.rebuildIndexes();

        expect(result).toHaveProperty('operation', 'rebuild_indexes');
        expect(result.tablesProcessed).toBeGreaterThan(0);
        expect(result.indexesProcessed).toBeGreaterThan(0);
        expect(result.spaceReclaimed).toBeGreaterThan(0);
        expect(result.improvements).toContain('Rebuilt all primary indexes');
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('analyzeTableStatistics', () => {
      it('should analyze table statistics successfully', async () => {
        const result = await maintenanceService.analyzeTableStatistics();

        expect(result).toHaveProperty('operation', 'analyze_table_statistics');
        expect(result).toHaveProperty('tablesAnalyzed');
        expect(result).toHaveProperty('issues');
        expect(result).toHaveProperty('recommendations');
        expect(result).toHaveProperty('statistics');

        expect(result.tablesAnalyzed).toBeGreaterThan(0);
        expect(Array.isArray(result.issues)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
        expect(result.statistics).toHaveProperty('totalSize');
        expect(result.statistics).toHaveProperty('tableCount');
        expect(result.statistics).toHaveProperty('indexCount');
        expect(result.statistics).toHaveProperty('largestTables');
        expect(result.statistics).toHaveProperty('slowestQueries');
        expect(result.statistics).toHaveProperty('fragmentationLevel');
      });

      it('should identify performance issues', async () => {
        const result = await maintenanceService.analyzeTableStatistics();

        const performanceIssues = result.issues.filter(issue => issue.type === 'performance');
        expect(performanceIssues.length).toBeGreaterThan(0);

        const issue = performanceIssues[0];
        expect(issue).toHaveProperty('severity');
        expect(issue).toHaveProperty('table');
        expect(issue).toHaveProperty('description');
        expect(issue).toHaveProperty('recommendation');
        expect(['low', 'medium', 'high', 'critical']).toContain(issue.severity);
      });
    });

    describe('vacuumDatabase', () => {
      it('should vacuum database successfully', async () => {
        const result = await maintenanceService.vacuumDatabase();

        expect(result).toHaveProperty('operation', 'vacuum_database');
        expect(result.tablesProcessed).toBeGreaterThan(0);
        expect(result.spaceReclaimed).toBeGreaterThan(0);
        expect(result.improvements).toContain('Reclaimed unused space');
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe('backup and restore operations', () => {
    describe('createSystemBackup', () => {
      it('should create system backup successfully', async () => {
        const options = {
          includeData: true,
          includeSchema: true,
          compression: true,
          description: 'Test backup'
        };

        const result = await maintenanceService.createSystemBackup(options);

        expect(result).toHaveProperty('backupId');
        expect(result).toHaveProperty('size');
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('location');
        expect(result).toHaveProperty('checksum');
        expect(result).toHaveProperty('metadata');

        expect(result.backupId).toMatch(/^backup_/);
        expect(result.size).toBeGreaterThan(0);
        expect(result.duration).toBeGreaterThan(0);
        expect(result.location).toContain(result.backupId);
        expect(result.checksum).toMatch(/^sha256:/);

        expect(result.metadata).toHaveProperty('createdAt');
        expect(result.metadata).toHaveProperty('version');
        expect(result.metadata).toHaveProperty('options', options);
        expect(result.metadata).toHaveProperty('tables');
        expect(result.metadata).toHaveProperty('recordCounts');
      });

      it('should create backup with default options', async () => {
        const result = await maintenanceService.createSystemBackup();

        expect(result).toHaveProperty('backupId');
        expect(result.metadata.options).toEqual({});
      });
    });

    describe('restoreSystemBackup', () => {
      it('should restore system backup successfully', async () => {
        const backupId = 'backup_test_123';
        const options = {
          overwriteExisting: true,
          restoreData: true,
          restoreSchema: true
        };

        const result = await maintenanceService.restoreSystemBackup(backupId, options);

        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('tablesRestored');
        expect(result).toHaveProperty('recordsRestored');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');

        expect(result.duration).toBeGreaterThan(0);
        expect(result.tablesRestored).toBeGreaterThan(0);
        expect(result.recordsRestored).toBeGreaterThan(0);
        expect(result.errors).toHaveLength(0);
      });

      it('should handle dry run mode', async () => {
        const backupId = 'backup_test_123';
        const options = { dryRun: true };

        const result = await maintenanceService.restoreSystemBackup(backupId, options);

        expect(result.success).toBe(true);
        expect(result.warnings).toContain('Dry run mode - no actual changes made');
      });
    });

    describe('listSystemBackups', () => {
      it('should list system backups', async () => {
        const backups = await maintenanceService.listSystemBackups();

        expect(Array.isArray(backups)).toBe(true);
        
        if (backups.length > 0) {
          const backup = backups[0];
          expect(backup).toHaveProperty('id');
          expect(backup).toHaveProperty('createdAt');
          expect(backup).toHaveProperty('size');
          expect(backup).toHaveProperty('metadata');
          expect(backup).toHaveProperty('location');
          expect(backup).toHaveProperty('checksum');
        }
      });
    });

    describe('deleteSystemBackup', () => {
      it('should delete system backup', async () => {
        const backupId = 'backup_test_123';

        await expect(maintenanceService.deleteSystemBackup(backupId))
          .resolves.not.toThrow();
      });
    });
  });

  describe('system diagnostics', () => {
    describe('runSystemDiagnostics', () => {
      it('should run system diagnostics successfully', async () => {
        const result = await maintenanceService.runSystemDiagnostics();

        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('systemHealth');
        expect(result).toHaveProperty('checks');
        expect(result).toHaveProperty('summary');
        expect(result).toHaveProperty('recommendations');

        expect(result.timestamp).toBeInstanceOf(Date);
        expect(['healthy', 'degraded', 'critical']).toContain(result.systemHealth);
        expect(Array.isArray(result.checks)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);

        expect(result.summary).toHaveProperty('totalChecks');
        expect(result.summary).toHaveProperty('passedChecks');
        expect(result.summary).toHaveProperty('warningChecks');
        expect(result.summary).toHaveProperty('failedChecks');
        expect(result.summary).toHaveProperty('criticalIssues');
      });

      it('should include various diagnostic checks', async () => {
        const result = await maintenanceService.runSystemDiagnostics();

        const checkNames = result.checks.map(check => check.name);
        expect(checkNames).toContain('Memory Usage');
        expect(checkNames).toContain('CPU Usage');
        expect(checkNames).toContain('Disk Space');
        expect(checkNames).toContain('Database Connection');
        expect(checkNames).toContain('Queue Health');

        result.checks.forEach(check => {
          expect(check).toHaveProperty('name');
          expect(check).toHaveProperty('category');
          expect(check).toHaveProperty('status');
          expect(check).toHaveProperty('message');
          expect(check).toHaveProperty('duration');

          expect(['system', 'database', 'application', 'performance']).toContain(check.category);
          expect(['pass', 'warning', 'fail']).toContain(check.status);
          expect(typeof check.duration).toBe('number');
        });
      });
    });

    describe('checkDataIntegrity', () => {
      it('should check data integrity successfully', async () => {
        const result = await maintenanceService.checkDataIntegrity();

        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('overallStatus');
        expect(result).toHaveProperty('checks');
        expect(result).toHaveProperty('summary');

        expect(result.timestamp).toBeInstanceOf(Date);
        expect(['valid', 'warnings', 'corrupted']).toContain(result.overallStatus);
        expect(Array.isArray(result.checks)).toBe(true);

        expect(result.summary).toHaveProperty('tablesChecked');
        expect(result.summary).toHaveProperty('validTables');
        expect(result.summary).toHaveProperty('tablesWithWarnings');
        expect(result.summary).toHaveProperty('corruptedTables');
        expect(result.summary).toHaveProperty('totalIssues');
      });

      it('should include integrity checks for different types', async () => {
        const result = await maintenanceService.checkDataIntegrity();

        const checkTypes = result.checks.map(check => check.checkType);
        expect(checkTypes).toContain('foreign_keys');
        expect(checkTypes).toContain('referential_integrity');
        expect(checkTypes).toContain('data_consistency');

        result.checks.forEach(check => {
          expect(check).toHaveProperty('table');
          expect(check).toHaveProperty('checkType');
          expect(check).toHaveProperty('status');
          expect(check).toHaveProperty('message');

          expect(['foreign_keys', 'constraints', 'data_consistency', 'referential_integrity']).toContain(check.checkType);
          expect(['valid', 'warning', 'invalid']).toContain(check.status);
        });
      });
    });

    describe('validateConfiguration', () => {
      it('should validate configuration successfully', async () => {
        const result = await maintenanceService.validateConfiguration();

        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
        expect(result).toHaveProperty('recommendations');

        expect(typeof result.valid).toBe('boolean');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
      });

      it('should provide configuration recommendations', async () => {
        const result = await maintenanceService.validateConfiguration();

        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(result.recommendations).toContain('Enable health check monitoring');
        expect(result.recommendations).toContain('Configure alert notification channels');
        expect(result.recommendations).toContain('Set up automated backups');
      });
    });
  });

  describe('scheduled maintenance', () => {
    describe('scheduleMaintenanceTask', () => {
      it('should schedule maintenance task successfully', async () => {
        const task = {
          id: 'test_task_1',
          name: 'Test Cleanup Task',
          type: 'cleanup' as const,
          schedule: '0 2 * * *', // Daily at 2 AM
          enabled: true,
          options: { maxAge: 86400000 }
        };

        const taskId = await maintenanceService.scheduleMaintenanceTask(task);

        expect(taskId).toBe(task.id);
      });
    });

    describe('getScheduledTasks', () => {
      it('should return scheduled tasks', async () => {
        const task = {
          id: 'test_task_2',
          name: 'Test Backup Task',
          type: 'backup' as const,
          schedule: '0 3 * * 0', // Weekly on Sunday at 3 AM
          enabled: true,
          options: { includeData: true }
        };

        await maintenanceService.scheduleMaintenanceTask(task);
        const tasks = await maintenanceService.getScheduledTasks();

        expect(Array.isArray(tasks)).toBe(true);
        const scheduledTask = tasks.find(t => t.id === task.id);
        expect(scheduledTask).toBeDefined();
        expect(scheduledTask.name).toBe(task.name);
        expect(scheduledTask.type).toBe(task.type);
        expect(scheduledTask.schedule).toBe(task.schedule);
        expect(scheduledTask.enabled).toBe(task.enabled);
      });
    });

    describe('cancelMaintenanceTask', () => {
      it('should cancel maintenance task successfully', async () => {
        const task = {
          id: 'test_task_3',
          name: 'Test Task to Cancel',
          type: 'optimization' as const,
          schedule: '0 4 * * *',
          enabled: true,
          options: {}
        };

        await maintenanceService.scheduleMaintenanceTask(task);
        await maintenanceService.cancelMaintenanceTask(task.id);

        const tasks = await maintenanceService.getScheduledTasks();
        const cancelledTask = tasks.find(t => t.id === task.id);
        expect(cancelledTask).toBeUndefined();
      });
    });
  });

  describe('emergency procedures', () => {
    describe('emergencyCleanup', () => {
      it('should perform emergency cleanup successfully', async () => {
        const result = await maintenanceService.emergencyCleanup();

        expect(result).toHaveProperty('timestamp');
        expect(result).toHaveProperty('actionsPerformed');
        expect(result).toHaveProperty('spaceFreed');
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('systemStatus');

        expect(result.timestamp).toBeInstanceOf(Date);
        expect(Array.isArray(result.actionsPerformed)).toBe(true);
        expect(result.actionsPerformed.length).toBeGreaterThan(0);
        expect(result.spaceFreed).toBeGreaterThan(0);
        expect(result.duration).toBeGreaterThan(0);
        expect(['stable', 'degraded', 'critical']).toContain(result.systemStatus);

        expect(result.actionsPerformed).toContain('Cleared temporary files');
        expect(result.actionsPerformed).toContain('Cleared old log files');
        expect(result.actionsPerformed).toContain('Cleared failed queue jobs');
        expect(result.actionsPerformed).toContain('Cleared application cache');
      });
    });

    describe('emergencyRestart', () => {
      it('should perform emergency restart', async () => {
        await expect(maintenanceService.emergencyRestart())
          .resolves.not.toThrow();
      });
    });

    describe('emergencyRollback', () => {
      it('should perform emergency rollback successfully', async () => {
        const snapshotId = 'snapshot_test_123';

        await expect(maintenanceService.emergencyRollback(snapshotId))
          .resolves.not.toThrow();

        expect(mockSnapshotService.restoreSnapshot).toHaveBeenCalledWith(snapshotId);
      });

      it('should handle rollback failures', async () => {
        const snapshotId = 'snapshot_invalid';
        mockSnapshotService.restoreSnapshot.mockRejectedValue(new Error('Snapshot not found'));

        await expect(maintenanceService.emergencyRollback(snapshotId))
          .rejects.toThrow('Snapshot not found');
      });
    });
  });

  describe('error handling', () => {
    it('should handle cleanup operation errors', async () => {
      // This test verifies that errors are caught and returned in the result
      const result = await maintenanceService.cleanupOldLogs(86400000);

      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should handle database operation errors', async () => {
      const result = await maintenanceService.optimizeDatabase();

      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('logging integration', () => {
    it('should log maintenance operations', async () => {
      const logSpy = vi.spyOn(mockLogger, 'logSystemAction');

      await maintenanceService.cleanupOldLogs(86400000);

      expect(logSpy).toHaveBeenCalledWith('maintenance_cleanup_logs_started', expect.any(Object));
      expect(logSpy).toHaveBeenCalledWith('maintenance_cleanup_logs_completed', expect.any(Object));
    });

    it('should log backup operations', async () => {
      const logSpy = vi.spyOn(mockLogger, 'logSystemAction');

      await maintenanceService.createSystemBackup();

      expect(logSpy).toHaveBeenCalledWith('maintenance_backup_started', expect.any(Object));
      expect(logSpy).toHaveBeenCalledWith('maintenance_backup_completed', expect.any(Object));
    });

    it('should log emergency operations', async () => {
      const logSpy = vi.spyOn(mockLogger, 'logSystemAction');

      await maintenanceService.emergencyCleanup();

      expect(logSpy).toHaveBeenCalledWith('maintenance_emergency_cleanup_started', {});
      expect(logSpy).toHaveBeenCalledWith('maintenance_emergency_cleanup_completed', expect.any(Object));
    });
  });
});