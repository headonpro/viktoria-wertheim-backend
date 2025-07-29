/**
 * Prometheus Metrics Service Factory for Strapi
 * Creates and configures the Prometheus metrics service
 */

const { createPrometheusMetricsService } = require('./prometheus-metrics.ts');

module.exports = ({ strapi }) => {
  let metricsService = null;

  return {
    async initialize() {
      const logger = strapi.service('api::tabellen-eintrag.logger');
      
      metricsService = createPrometheusMetricsService(logger);
      
      strapi.log.info('Prometheus metrics service initialized');
    },

    async destroy() {
      if (metricsService) {
        strapi.log.info('Prometheus metrics service destroyed');
      }
    },

    // Counter methods
    incrementCalculationCounter(labels) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.incrementCalculationCounter(labels);
    },

    incrementJobCounter(status, labels) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.incrementJobCounter(status, labels);
    },

    incrementErrorCounter(errorType, labels) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.incrementErrorCounter(errorType, labels);
    },

    incrementApiRequestCounter(endpoint, method, status) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.incrementApiRequestCounter(endpoint, method, status);
    },

    // Gauge methods
    setQueueSizeGauge(size, queueType) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.setQueueSizeGauge(size, queueType);
    },

    setActiveJobsGauge(count) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.setActiveJobsGauge(count);
    },

    setMemoryUsageGauge(bytes) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.setMemoryUsageGauge(bytes);
    },

    setCpuUsageGauge(percentage) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.setCpuUsageGauge(percentage);
    },

    setDatabaseConnectionsGauge(active, idle) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.setDatabaseConnectionsGauge(active, idle);
    },

    setHealthStatus(component, status) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.setHealthStatus(component, status);
    },

    // Histogram methods
    recordCalculationDuration(duration, labels) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.recordCalculationDuration(duration, labels);
    },

    recordJobDuration(duration, labels) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.recordJobDuration(duration, labels);
    },

    recordApiResponseTime(duration, endpoint, method) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.recordApiResponseTime(duration, endpoint, method);
    },

    recordDatabaseQueryTime(duration, operation) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.recordDatabaseQueryTime(duration, operation);
    },

    recordHealthCheckDuration(component, duration) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.recordHealthCheckDuration(component, duration);
    },

    // Business metrics
    recordTeamsProcessed(count, ligaId) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.recordTeamsProcessed(count, ligaId);
    },

    recordTableEntriesUpdated(count, ligaId) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.recordTableEntriesUpdated(count, ligaId);
    },

    recordSnapshotCreated(ligaId, saisonId) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.recordSnapshotCreated(ligaId, saisonId);
    },

    recordRollbackPerformed(ligaId, saisonId) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.recordRollbackPerformed(ligaId, saisonId);
    },

    // Export methods
    getMetrics() {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.getMetrics();
    },

    getMetricsForComponent(component) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.getMetricsForComponent(component);
    },

    resetMetrics() {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.resetMetrics();
    },

    resetComponentMetrics(component) {
      if (!metricsService) {
        throw new Error('Prometheus metrics service not initialized');
      }
      return metricsService.resetComponentMetrics(component);
    }
  };
};