/**
 * Maintenance Service Factory for Strapi
 * Creates and configures the maintenance service
 */

const { createMaintenanceService } = require('./maintenance.ts');

module.exports = ({ strapi }) => {
  let maintenanceService = null;

  return {
    async initialize() {
      const logger = strapi.service('api::tabellen-eintrag.logger');
      const snapshotService = strapi.service('api::tabellen-eintrag.snapshot');
      
      maintenanceService = createMaintenanceService(logger, snapshotService);
      
      strapi.log.info('Maintenance service initialized');
    },

    async destroy() {
      if (maintenanceService) {
        strapi.log.info('Maintenance service destroyed');
      }
    },

    // Data cleanup operations
    cleanupOldLogs(maxAge) {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.cleanupOldLogs(maxAge);
    },

    cleanupOldSnapshots(maxAge) {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.cleanupOldSnapshots(maxAge);
    },

    cleanupOldMetrics(maxAge) {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.cleanupOldMetrics(maxAge);
    },

    cleanupFailedJobs(maxAge) {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.cleanupFailedJobs(maxAge);
    },

    // Database maintenance
    optimizeDatabase() {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.optimizeDatabase();
    },

    rebuildIndexes() {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.rebuildIndexes();
    },

    analyzeTableStatistics() {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.analyzeTableStatistics();
    },

    vacuumDatabase() {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.vacuumDatabase();
    },

    // Backup and restore operations
    createSystemBackup(options) {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.createSystemBackup(options);
    },

    restoreSystemBackup(backupId, options) {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.restoreSystemBackup(backupId, options);
    },

    listSystemBackups() {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.listSystemBackups();
    },

    deleteSystemBackup(backupId) {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.deleteSystemBackup(backupId);
    },

    // System diagnostics
    runSystemDiagnostics() {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.runSystemDiagnostics();
    },

    checkDataIntegrity() {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.checkDataIntegrity();
    },

    validateConfiguration() {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.validateConfiguration();
    },

    // Scheduled maintenance
    scheduleMaintenanceTask(task) {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.scheduleMaintenanceTask(task);
    },

    cancelMaintenanceTask(taskId) {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.cancelMaintenanceTask(taskId);
    },

    getScheduledTasks() {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.getScheduledTasks();
    },

    // Emergency procedures
    emergencyCleanup() {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.emergencyCleanup();
    },

    emergencyRestart() {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.emergencyRestart();
    },

    emergencyRollback(snapshotId) {
      if (!maintenanceService) {
        throw new Error('Maintenance service not initialized');
      }
      return maintenanceService.emergencyRollback(snapshotId);
    }
  };
};