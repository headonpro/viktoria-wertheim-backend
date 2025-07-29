/**
 * Club Monitoring Controller
 * 
 * Provides API endpoints for accessing club monitoring data,
 * metrics, alerts, and system health information.
 */

'use strict';

module.exports = {
  /**
   * Get system health status
   */
  async getHealth(ctx) {
    try {
      const monitoringService = strapi.service('api::club.monitoring-service');
      const healthData = await monitoringService.getHealthCheck();
      
      ctx.body = {
        success: true,
        data: healthData
      };
    } catch (error) {
      strapi.log.error('Failed to get health status:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to get health status',
        message: error.message
      };
    }
  },

  /**
   * Get comprehensive dashboard data
   */
  async getDashboard(ctx) {
    try {
      const monitoringService = strapi.service('api::club.monitoring-service');
      const dashboardData = await monitoringService.getDashboardData();
      
      ctx.body = {
        success: true,
        data: dashboardData
      };
    } catch (error) {
      strapi.log.error('Failed to get dashboard data:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to get dashboard data',
        message: error.message
      };
    }
  },

  /**
   * Get system status
   */
  async getStatus(ctx) {
    try {
      const monitoringService = strapi.service('api::club.monitoring-service');
      const statusData = await monitoringService.getSystemStatus();
      
      ctx.body = {
        success: true,
        data: statusData
      };
    } catch (error) {
      strapi.log.error('Failed to get system status:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to get system status',
        message: error.message
      };
    }
  },

  /**
   * Get current metrics
   */
  async getMetrics(ctx) {
    try {
      const monitoringService = strapi.service('api::club.monitoring-service');
      const metricsCollector = monitoringService.getMetricsCollector();
      
      const { metric, timeRange } = ctx.query;
      
      if (metric) {
        // Get specific metric
        const metricData = metricsCollector.getMetric(metric);
        if (!metricData) {
          ctx.status = 404;
          ctx.body = {
            success: false,
            error: 'Metric not found',
            message: `Metric '${metric}' does not exist`
          };
          return;
        }

        const stats = metricsCollector.getMetricStats(metric, parseInt(timeRange) || 60);
        
        ctx.body = {
          success: true,
          data: {
            metric: metricData,
            stats
          }
        };
      } else {
        // Get all metrics
        const exportedMetrics = metricsCollector.exportMetrics();
        
        ctx.body = {
          success: true,
          data: exportedMetrics
        };
      }
    } catch (error) {
      strapi.log.error('Failed to get metrics:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to get metrics',
        message: error.message
      };
    }
  },

  /**
   * Get alerts
   */
  async getAlerts(ctx) {
    try {
      const monitoringService = strapi.service('api::club.monitoring-service');
      const alertingSystem = monitoringService.getAlertingSystem();
      
      const { status, severity, limit } = ctx.query;
      
      let alerts;
      if (status === 'active') {
        alerts = alertingSystem.getActiveAlerts();
      } else {
        // Get alert summary
        const summary = await alertingSystem.getAlertSummary();
        ctx.body = {
          success: true,
          data: summary
        };
        return;
      }

      // Filter by severity if specified
      if (severity) {
        alerts = alerts.filter(alert => alert.severity === severity);
      }

      // Limit results if specified
      if (limit) {
        alerts = alerts.slice(0, parseInt(limit));
      }

      ctx.body = {
        success: true,
        data: {
          alerts,
          total: alerts.length
        }
      };
    } catch (error) {
      strapi.log.error('Failed to get alerts:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to get alerts',
        message: error.message
      };
    }
  },

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(ctx) {
    try {
      const { alertId } = ctx.params;
      const { acknowledgedBy } = ctx.request.body;

      if (!acknowledgedBy) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'Missing acknowledgedBy field'
        };
        return;
      }

      const monitoringService = strapi.service('api::club.monitoring-service');
      const alertingSystem = monitoringService.getAlertingSystem();
      
      const success = await alertingSystem.acknowledgeAlert(alertId, acknowledgedBy);
      
      if (!success) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'Alert not found or already acknowledged'
        };
        return;
      }

      ctx.body = {
        success: true,
        message: 'Alert acknowledged successfully'
      };
    } catch (error) {
      strapi.log.error('Failed to acknowledge alert:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to acknowledge alert',
        message: error.message
      };
    }
  },

  /**
   * Resolve an alert
   */
  async resolveAlert(ctx) {
    try {
      const { alertId } = ctx.params;
      const { resolvedBy } = ctx.request.body;

      if (!resolvedBy) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'Missing resolvedBy field'
        };
        return;
      }

      const monitoringService = strapi.service('api::club.monitoring-service');
      const alertingSystem = monitoringService.getAlertingSystem();
      
      const success = await alertingSystem.resolveAlert(alertId, resolvedBy);
      
      if (!success) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'Alert not found or already resolved'
        };
        return;
      }

      ctx.body = {
        success: true,
        message: 'Alert resolved successfully'
      };
    } catch (error) {
      strapi.log.error('Failed to resolve alert:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to resolve alert',
        message: error.message
      };
    }
  },

  /**
   * Get alert rules
   */
  async getAlertRules(ctx) {
    try {
      const monitoringService = strapi.service('api::club.monitoring-service');
      const alertingSystem = monitoringService.getAlertingSystem();
      
      const rules = alertingSystem.getAlertRules();
      
      ctx.body = {
        success: true,
        data: {
          rules,
          total: rules.length
        }
      };
    } catch (error) {
      strapi.log.error('Failed to get alert rules:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to get alert rules',
        message: error.message
      };
    }
  },

  /**
   * Export monitoring data
   */
  async exportData(ctx) {
    try {
      const monitoringService = strapi.service('api::club.monitoring-service');
      const exportData = await monitoringService.exportMonitoringData();
      
      // Set headers for file download
      ctx.set('Content-Type', 'application/json');
      ctx.set('Content-Disposition', `attachment; filename="club-monitoring-${new Date().toISOString().split('T')[0]}.json"`);
      
      ctx.body = exportData;
    } catch (error) {
      strapi.log.error('Failed to export monitoring data:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to export monitoring data',
        message: error.message
      };
    }
  },

  /**
   * Get monitoring configuration
   */
  async getConfiguration(ctx) {
    try {
      const monitoringService = strapi.service('api::club.monitoring-service');
      const config = monitoringService.getConfiguration();
      
      ctx.body = {
        success: true,
        data: config
      };
    } catch (error) {
      strapi.log.error('Failed to get configuration:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to get configuration',
        message: error.message
      };
    }
  },

  /**
   * Update monitoring configuration
   */
  async updateConfiguration(ctx) {
    try {
      const { config } = ctx.request.body;

      if (!config) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'Missing configuration data'
        };
        return;
      }

      const monitoringService = strapi.service('api::club.monitoring-service');
      monitoringService.updateConfiguration(config);
      
      ctx.body = {
        success: true,
        message: 'Configuration updated successfully',
        data: monitoringService.getConfiguration()
      };
    } catch (error) {
      strapi.log.error('Failed to update configuration:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to update configuration',
        message: error.message
      };
    }
  },

  /**
   * Test alert system
   */
  async testAlert(ctx) {
    try {
      const { severity = 'info' } = ctx.request.body;

      if (!['info', 'warning', 'critical'].includes(severity)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'Invalid severity. Must be info, warning, or critical'
        };
        return;
      }

      const monitoringService = strapi.service('api::club.monitoring-service');
      await monitoringService.testAlert(severity);
      
      ctx.body = {
        success: true,
        message: `Test alert triggered with severity: ${severity}`
      };
    } catch (error) {
      strapi.log.error('Failed to test alert:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to test alert',
        message: error.message
      };
    }
  },

  /**
   * Record custom metric
   */
  async recordMetric(ctx) {
    try {
      const { name, value, tags = {} } = ctx.request.body;

      if (!name || value === undefined) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'Missing required fields: name and value'
        };
        return;
      }

      if (typeof value !== 'number') {
        ctx.status = 400;
        ctx.body = {
          success: false,
          error: 'Value must be a number'
        };
        return;
      }

      const monitoringService = strapi.service('api::club.monitoring-service');
      monitoringService.recordMetric(name, value, tags);
      
      ctx.body = {
        success: true,
        message: 'Metric recorded successfully'
      };
    } catch (error) {
      strapi.log.error('Failed to record metric:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to record metric',
        message: error.message
      };
    }
  },

  /**
   * Get specific metric statistics
   */
  async getMetricStats(ctx) {
    try {
      const { metricName } = ctx.params;
      const { timeRange = 60 } = ctx.query;

      const monitoringService = strapi.service('api::club.monitoring-service');
      const metricsCollector = monitoringService.getMetricsCollector();
      
      const metric = metricsCollector.getMetric(metricName);
      if (!metric) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          error: 'Metric not found'
        };
        return;
      }

      const stats = metricsCollector.getMetricStats(metricName, parseInt(timeRange));
      const latestValue = metricsCollector.getLatestValue(metricName);
      
      ctx.body = {
        success: true,
        data: {
          name: metricName,
          description: metric.description,
          unit: metric.unit,
          type: metric.type,
          latestValue,
          stats,
          timeRangeMinutes: parseInt(timeRange)
        }
      };
    } catch (error) {
      strapi.log.error('Failed to get metric stats:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Failed to get metric stats',
        message: error.message
      };
    }
  }
};