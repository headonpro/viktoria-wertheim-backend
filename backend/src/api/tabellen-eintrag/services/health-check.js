/**
 * Health Check Service Factory for Strapi
 * Creates and configures the health check service
 */

const { createHealthCheckService } = require('./health-check.ts');

module.exports = ({ strapi }) => {
  let healthCheckService = null;

  return {
    async initialize() {
      const logger = strapi.service('api::tabellen-eintrag.logger');
      const performanceMonitor = strapi.service('api::tabellen-eintrag.performance-monitor');
      
      healthCheckService = createHealthCheckService(logger, performanceMonitor);
      
      // Start monitoring if enabled
      const config = strapi.config.get('automation', {});
      if (config.healthChecks?.enabled !== false) {
        const interval = config.healthChecks?.interval || 30000;
        healthCheckService.startMonitoring(interval);
      }
      
      strapi.log.info('Health check service initialized');
    },

    async destroy() {
      if (healthCheckService) {
        healthCheckService.stopMonitoring();
        strapi.log.info('Health check service destroyed');
      }
    },

    checkSystemHealth() {
      if (!healthCheckService) {
        throw new Error('Health check service not initialized');
      }
      return healthCheckService.checkSystemHealth();
    },

    checkComponent(componentName) {
      if (!healthCheckService) {
        throw new Error('Health check service not initialized');
      }
      return healthCheckService.checkComponent(componentName);
    },

    registerHealthCheck(name, checkFunction) {
      if (!healthCheckService) {
        throw new Error('Health check service not initialized');
      }
      return healthCheckService.registerHealthCheck(name, checkFunction);
    },

    unregisterHealthCheck(name) {
      if (!healthCheckService) {
        throw new Error('Health check service not initialized');
      }
      return healthCheckService.unregisterHealthCheck(name);
    },

    getHealthHistory(component, timeRange) {
      if (!healthCheckService) {
        throw new Error('Health check service not initialized');
      }
      return healthCheckService.getHealthHistory(component, timeRange);
    },

    setHealthThresholds(component, thresholds) {
      if (!healthCheckService) {
        throw new Error('Health check service not initialized');
      }
      return healthCheckService.setHealthThresholds(component, thresholds);
    }
  };
};