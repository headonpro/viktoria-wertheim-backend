/**
 * Club Monitoring Routes
 * 
 * Defines API routes for club monitoring, metrics, and alerting endpoints.
 */

'use strict';

module.exports = {
  routes: [
    // Health and status endpoints
    {
      method: 'GET',
      path: '/club/monitoring/health',
      handler: 'monitoring.getHealth',
      config: {
        auth: false, // Health check should be accessible without auth
        description: 'Get system health status',
        tags: ['Club', 'Monitoring', 'Health']
      }
    },
    {
      method: 'GET',
      path: '/club/monitoring/status',
      handler: 'monitoring.getStatus',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Get detailed system status',
        tags: ['Club', 'Monitoring', 'Status']
      }
    },
    {
      method: 'GET',
      path: '/club/monitoring/dashboard',
      handler: 'monitoring.getDashboard',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Get comprehensive dashboard data',
        tags: ['Club', 'Monitoring', 'Dashboard']
      }
    },

    // Metrics endpoints
    {
      method: 'GET',
      path: '/club/monitoring/metrics',
      handler: 'monitoring.getMetrics',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Get all metrics or specific metric data',
        tags: ['Club', 'Monitoring', 'Metrics']
      }
    },
    {
      method: 'GET',
      path: '/club/monitoring/metrics/:metricName/stats',
      handler: 'monitoring.getMetricStats',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Get statistics for a specific metric',
        tags: ['Club', 'Monitoring', 'Metrics']
      }
    },
    {
      method: 'POST',
      path: '/club/monitoring/metrics/record',
      handler: 'monitoring.recordMetric',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Record a custom metric value',
        tags: ['Club', 'Monitoring', 'Metrics']
      }
    },

    // Alert endpoints
    {
      method: 'GET',
      path: '/club/monitoring/alerts',
      handler: 'monitoring.getAlerts',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Get alerts summary or active alerts',
        tags: ['Club', 'Monitoring', 'Alerts']
      }
    },
    {
      method: 'POST',
      path: '/club/monitoring/alerts/:alertId/acknowledge',
      handler: 'monitoring.acknowledgeAlert',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Acknowledge an active alert',
        tags: ['Club', 'Monitoring', 'Alerts']
      }
    },
    {
      method: 'POST',
      path: '/club/monitoring/alerts/:alertId/resolve',
      handler: 'monitoring.resolveAlert',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Resolve an active alert',
        tags: ['Club', 'Monitoring', 'Alerts']
      }
    },
    {
      method: 'GET',
      path: '/club/monitoring/alert-rules',
      handler: 'monitoring.getAlertRules',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Get all alert rules',
        tags: ['Club', 'Monitoring', 'Alerts']
      }
    },

    // Configuration endpoints
    {
      method: 'GET',
      path: '/club/monitoring/configuration',
      handler: 'monitoring.getConfiguration',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Get monitoring configuration',
        tags: ['Club', 'Monitoring', 'Configuration']
      }
    },
    {
      method: 'PUT',
      path: '/club/monitoring/configuration',
      handler: 'monitoring.updateConfiguration',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Update monitoring configuration',
        tags: ['Club', 'Monitoring', 'Configuration']
      }
    },

    // Utility endpoints
    {
      method: 'GET',
      path: '/club/monitoring/export',
      handler: 'monitoring.exportData',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Export all monitoring data',
        tags: ['Club', 'Monitoring', 'Export']
      }
    },
    {
      method: 'POST',
      path: '/club/monitoring/test-alert',
      handler: 'monitoring.testAlert',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
        description: 'Test the alert system',
        tags: ['Club', 'Monitoring', 'Testing']
      }
    }
  ]
};