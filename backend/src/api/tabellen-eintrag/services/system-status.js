/**
 * System Status Service Factory for Strapi
 * Creates and configures the system status service
 */

const { createSystemStatusService } = require('./system-status.ts');

module.exports = ({ strapi }) => {
  let systemStatusService = null;

  return {
    async initialize() {
      const logger = strapi.service('api::tabellen-eintrag.logger');
      const healthCheckService = strapi.service('api::tabellen-eintrag.health-check');
      const performanceMonitor = strapi.service('api::tabellen-eintrag.performance-monitor');
      const alertingService = strapi.service('api::tabellen-eintrag.alerting');
      const maintenanceService = strapi.service('api::tabellen-eintrag.maintenance');
      
      systemStatusService = createSystemStatusService(
        logger,
        healthCheckService,
        performanceMonitor,
        alertingService,
        maintenanceService
      );
      
      // Start status monitoring if enabled
      const config = strapi.config.get('automation', {});
      if (config.statusMonitoring?.enabled !== false) {
        const interval = config.statusMonitoring?.interval || 60000;
        systemStatusService.startStatusMonitoring(interval);
      }
      
      strapi.log.info('System status service initialized');
    },

    async destroy() {
      if (systemStatusService) {
        systemStatusService.stopStatusMonitoring();
        strapi.log.info('System status service destroyed');
      }
    },

    // Status reporting
    getSystemStatus() {
      if (!systemStatusService) {
        throw new Error('System status service not initialized');
      }
      return systemStatusService.getSystemStatus();
    },

    getComponentStatus(component) {
      if (!systemStatusService) {
        throw new Error('System status service not initialized');
      }
      return systemStatusService.getComponentStatus(component);
    },

    getStatusHistory(timeRange) {
      if (!systemStatusService) {
        throw new Error('System status service not initialized');
      }
      return systemStatusService.getStatusHistory(timeRange);
    },

    // Status monitoring
    startStatusMonitoring(interval) {
      if (!systemStatusService) {
        throw new Error('System status service not initialized');
      }
      return systemStatusService.startStatusMonitoring(interval);
    },

    stopStatusMonitoring() {
      if (!systemStatusService) {
        throw new Error('System status service not initialized');
      }
      return systemStatusService.stopStatusMonitoring();
    },

    // Status notifications
    subscribeToStatusChanges(callback) {
      if (!systemStatusService) {
        throw new Error('System status service not initialized');
      }
      return systemStatusService.subscribeToStatusChanges(callback);
    },

    unsubscribeFromStatusChanges(subscriptionId) {
      if (!systemStatusService) {
        throw new Error('System status service not initialized');
      }
      return systemStatusService.unsubscribeFromStatusChanges(subscriptionId);
    },

    // Status dashboard data
    getDashboardData() {
      if (!systemStatusService) {
        throw new Error('System status service not initialized');
      }
      return systemStatusService.getDashboardData();
    },

    getStatusMetrics(timeRange) {
      if (!systemStatusService) {
        throw new Error('System status service not initialized');
      }
      return systemStatusService.getStatusMetrics(timeRange);
    },

    // Status reports
    generateStatusReport(options) {
      if (!systemStatusService) {
        throw new Error('System status service not initialized');
      }
      return systemStatusService.generateStatusReport(options);
    },

    exportStatusData(format, timeRange) {
      if (!systemStatusService) {
        throw new Error('System status service not initialized');
      }
      return systemStatusService.exportStatusData(format, timeRange);
    }
  };
};