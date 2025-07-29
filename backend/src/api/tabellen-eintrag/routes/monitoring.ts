/**
 * Monitoring API Routes
 * Provides endpoints for health checks, metrics, and system monitoring
 */

export default {
  routes: [
    // Health check endpoints
    {
      method: 'GET',
      path: '/tabellen-eintraege/monitoring/health',
      handler: 'monitoring.getSystemHealth',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/tabellen-eintraege/monitoring/health/:component',
      handler: 'monitoring.getComponentHealth',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        middlewares: [],
      },
    },

    // Performance metrics endpoints
    {
      method: 'GET',
      path: '/tabellen-eintraege/monitoring/performance',
      handler: 'monitoring.getPerformanceMetrics',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/tabellen-eintraege/monitoring/metrics',
      handler: 'monitoring.getPrometheusMetrics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/tabellen-eintraege/monitoring/metrics/:component',
      handler: 'monitoring.getComponentMetrics',
      config: {
        policies: [],
        middlewares: [],
      },
    },

    // Alert endpoints
    {
      method: 'GET',
      path: '/tabellen-eintraege/monitoring/alerts',
      handler: 'monitoring.getAlerts',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/tabellen-eintraege/monitoring/alerts/:alertId/resolve',
      handler: 'monitoring.resolveAlert',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/tabellen-eintraege/monitoring/alerts/suppress',
      handler: 'monitoring.suppressAlerts',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        middlewares: [],
      },
    },

    // System control endpoints
    {
      method: 'POST',
      path: '/tabellen-eintraege/monitoring/health-check/:component',
      handler: 'monitoring.triggerHealthCheck',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/tabellen-eintraege/monitoring/reset-metrics',
      handler: 'monitoring.resetMetrics',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        middlewares: [],
      },
    },

    // Export endpoints
    {
      method: 'GET',
      path: '/tabellen-eintraege/monitoring/export',
      handler: 'monitoring.exportMonitoringData',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        middlewares: [],
      },
    },

    // Configuration endpoints
    {
      method: 'GET',
      path: '/tabellen-eintraege/monitoring/config',
      handler: 'monitoring.getMonitoringConfig',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/tabellen-eintraege/monitoring/config',
      handler: 'monitoring.updateMonitoringConfig',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        middlewares: [],
      },
    },
  ],
};