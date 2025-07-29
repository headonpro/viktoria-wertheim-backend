/**
 * Alerting Service Factory for Strapi
 * Creates and configures the alerting service
 */

const { createAlertingService } = require('./alerting.ts');

module.exports = ({ strapi }) => {
  let alertingService = null;

  return {
    async initialize() {
      const logger = strapi.service('api::tabellen-eintrag.logger');
      
      alertingService = createAlertingService(logger);
      
      strapi.log.info('Alerting service initialized');
    },

    async destroy() {
      if (alertingService) {
        alertingService.destroy();
        strapi.log.info('Alerting service destroyed');
      }
    },

    // Alert management
    createAlert(alertDefinition) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.createAlert(alertDefinition);
    },

    resolveAlert(alertId, resolution) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.resolveAlert(alertId, resolution);
    },

    getActiveAlerts(filters) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.getActiveAlerts(filters);
    },

    getAlertHistory(filters) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.getAlertHistory(filters);
    },

    // Alert rules
    addAlertRule(rule) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.addAlertRule(rule);
    },

    removeAlertRule(ruleId) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.removeAlertRule(ruleId);
    },

    updateAlertRule(ruleId, updates) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.updateAlertRule(ruleId, updates);
    },

    getAlertRules() {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.getAlertRules();
    },

    // Notification channels
    addNotificationChannel(channel) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.addNotificationChannel(channel);
    },

    removeNotificationChannel(channelId) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.removeNotificationChannel(channelId);
    },

    testNotificationChannel(channelId) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.testNotificationChannel(channelId);
    },

    // Health and performance integration
    processHealthCheck(health) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.processHealthCheck(health);
    },

    processPerformanceMetrics(metrics) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.processPerformanceMetrics(metrics);
    },

    // Alert suppression
    suppressAlerts(pattern, duration) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.suppressAlerts(pattern, duration);
    },

    removeSuppression(suppressionId) {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.removeSuppression(suppressionId);
    },

    getActiveSuppressions() {
      if (!alertingService) {
        throw new Error('Alerting service not initialized');
      }
      return alertingService.getActiveSuppressions();
    }
  };
};