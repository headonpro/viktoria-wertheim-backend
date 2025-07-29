/**
 * Monitoring Controller
 * Handles API requests for system monitoring, health checks, and metrics
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::tabellen-eintrag.tabellen-eintrag', ({ strapi }) => ({
  // Health check endpoints
  async getSystemHealth(ctx) {
    try {
      const healthCheckService = strapi.service('api::tabellen-eintrag.health-check');
      const systemHealth = await healthCheckService.checkSystemHealth();
      
      ctx.body = {
        data: systemHealth,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: ctx.state.requestId || 'unknown'
        }
      };
    } catch (error) {
      strapi.log.error('Failed to get system health:', error);
      ctx.throw(500, 'Failed to retrieve system health', { error: error.message });
    }
  },

  async getComponentHealth(ctx) {
    try {
      const { component } = ctx.params;
      const healthCheckService = strapi.service('api::tabellen-eintrag.health-check');
      const componentHealth = await healthCheckService.checkComponent(component);
      
      ctx.body = {
        data: componentHealth,
        meta: {
          component,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        ctx.throw(404, `Health check not found for component: ${ctx.params.component}`);
      }
      strapi.log.error('Failed to get component health:', error);
      ctx.throw(500, 'Failed to retrieve component health', { error: error.message });
    }
  },

  async triggerHealthCheck(ctx) {
    try {
      const { component } = ctx.params;
      const healthCheckService = strapi.service('api::tabellen-eintrag.health-check');
      const result = await healthCheckService.checkComponent(component);
      
      ctx.body = {
        data: result,
        meta: {
          component,
          triggered: true,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      strapi.log.error('Failed to trigger health check:', error);
      ctx.throw(500, 'Failed to trigger health check', { error: error.message });
    }
  },

  // Performance metrics endpoints
  async getPerformanceMetrics(ctx) {
    try {
      const { timeRange = '1h' } = ctx.query;
      const performanceMonitor = strapi.service('api::tabellen-eintrag.performance-monitor');
      
      // Parse time range
      const now = new Date();
      let from: Date;
      
      switch (timeRange) {
        case '1h':
          from = new Date(now.getTime() - 3600000);
          break;
        case '6h':
          from = new Date(now.getTime() - 21600000);
          break;
        case '24h':
          from = new Date(now.getTime() - 86400000);
          break;
        case '7d':
          from = new Date(now.getTime() - 604800000);
          break;
        default:
          from = new Date(now.getTime() - 3600000);
      }
      
      const performanceReport = await performanceMonitor.getPerformanceReport({
        from,
        to: now
      });
      
      ctx.body = {
        data: performanceReport,
        meta: {
          timeRange,
          from: from.toISOString(),
          to: now.toISOString()
        }
      };
    } catch (error) {
      strapi.log.error('Failed to get performance metrics:', error);
      ctx.throw(500, 'Failed to retrieve performance metrics', { error: error.message });
    }
  },

  async getPrometheusMetrics(ctx) {
    try {
      const prometheusService = strapi.service('api::tabellen-eintrag.prometheus-metrics');
      const metrics = await prometheusService.getMetrics();
      
      // Set content type for Prometheus
      ctx.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      ctx.body = metrics;
    } catch (error) {
      strapi.log.error('Failed to get Prometheus metrics:', error);
      ctx.throw(500, 'Failed to retrieve Prometheus metrics', { error: error.message });
    }
  },

  async getComponentMetrics(ctx) {
    try {
      const { component } = ctx.params;
      const prometheusService = strapi.service('api::tabellen-eintrag.prometheus-metrics');
      const metrics = await prometheusService.getMetricsForComponent(component);
      
      ctx.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      ctx.body = metrics;
    } catch (error) {
      strapi.log.error('Failed to get component metrics:', error);
      ctx.throw(500, 'Failed to retrieve component metrics', { error: error.message });
    }
  },

  async resetMetrics(ctx) {
    try {
      const { component } = ctx.request.body;
      const prometheusService = strapi.service('api::tabellen-eintrag.prometheus-metrics');
      
      if (component) {
        prometheusService.resetComponentMetrics(component);
      } else {
        prometheusService.resetMetrics();
      }
      
      // Log the reset action
      const logger = strapi.service('api::tabellen-eintrag.logger');
      logger.logUserAction(
        ctx.state.user?.id || 'unknown',
        'metrics_reset',
        {
          component: component || 'all',
          timestamp: new Date().toISOString(),
          ipAddress: ctx.request.ip,
          userAgent: ctx.request.get('User-Agent')
        }
      );
      
      ctx.body = {
        data: {
          success: true,
          component: component || 'all',
          resetAt: new Date().toISOString()
        }
      };
    } catch (error) {
      strapi.log.error('Failed to reset metrics:', error);
      ctx.throw(500, 'Failed to reset metrics', { error: error.message });
    }
  },

  // Alert endpoints
  async getAlerts(ctx) {
    try {
      const { 
        status = 'active',
        severity,
        component,
        limit = 100,
        createdAfter,
        createdBefore
      } = ctx.query;
      
      const alertingService = strapi.service('api::tabellen-eintrag.alerting');
      
      const filters = {
        status,
        severity,
        component,
        limit: parseInt(limit as string) || 100,
        createdAfter: createdAfter ? new Date(createdAfter as string) : undefined,
        createdBefore: createdBefore ? new Date(createdBefore as string) : undefined
      };
      
      const alerts = status === 'active' 
        ? await alertingService.getActiveAlerts(filters)
        : await alertingService.getAlertHistory(filters);
      
      ctx.body = {
        data: alerts,
        meta: {
          filters,
          count: alerts.length,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      strapi.log.error('Failed to get alerts:', error);
      ctx.throw(500, 'Failed to retrieve alerts', { error: error.message });
    }
  },

  async resolveAlert(ctx) {
    try {
      const { alertId } = ctx.params;
      const { resolution } = ctx.request.body;
      
      const alertingService = strapi.service('api::tabellen-eintrag.alerting');
      await alertingService.resolveAlert(alertId, resolution);
      
      // Log the resolution
      const logger = strapi.service('api::tabellen-eintrag.logger');
      logger.logUserAction(
        ctx.state.user?.id || 'unknown',
        'alert_resolved',
        {
          alertId,
          resolution,
          timestamp: new Date().toISOString(),
          ipAddress: ctx.request.ip,
          userAgent: ctx.request.get('User-Agent')
        }
      );
      
      ctx.body = {
        data: {
          success: true,
          alertId,
          resolvedAt: new Date().toISOString(),
          resolution
        }
      };
    } catch (error) {
      if (error.message.includes('not found')) {
        ctx.throw(404, `Alert not found: ${ctx.params.alertId}`);
      }
      strapi.log.error('Failed to resolve alert:', error);
      ctx.throw(500, 'Failed to resolve alert', { error: error.message });
    }
  },

  async suppressAlerts(ctx) {
    try {
      const { pattern, duration = 3600 } = ctx.request.body; // Default 1 hour
      
      if (!pattern) {
        ctx.throw(400, 'Pattern is required for alert suppression');
      }
      
      const alertingService = strapi.service('api::tabellen-eintrag.alerting');
      alertingService.suppressAlerts(pattern, duration * 1000); // Convert to milliseconds
      
      // Log the suppression
      const logger = strapi.service('api::tabellen-eintrag.logger');
      logger.logUserAction(
        ctx.state.user?.id || 'unknown',
        'alerts_suppressed',
        {
          pattern,
          duration,
          timestamp: new Date().toISOString(),
          ipAddress: ctx.request.ip,
          userAgent: ctx.request.get('User-Agent')
        }
      );
      
      ctx.body = {
        data: {
          success: true,
          pattern,
          duration,
          suppressedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + duration * 1000).toISOString()
        }
      };
    } catch (error) {
      strapi.log.error('Failed to suppress alerts:', error);
      ctx.throw(500, 'Failed to suppress alerts', { error: error.message });
    }
  },

  // Export endpoints
  async exportMonitoringData(ctx) {
    try {
      const { 
        timeRange = '24h',
        includeMetrics = true,
        includeAlerts = true,
        includeHealth = true,
        format = 'json'
      } = ctx.query;
      
      const exportData: any = {
        exportedAt: new Date().toISOString(),
        timeRange,
        data: {}
      };
      
      // Parse time range
      const now = new Date();
      let from: Date;
      
      switch (timeRange) {
        case '1h':
          from = new Date(now.getTime() - 3600000);
          break;
        case '6h':
          from = new Date(now.getTime() - 21600000);
          break;
        case '24h':
          from = new Date(now.getTime() - 86400000);
          break;
        case '7d':
          from = new Date(now.getTime() - 604800000);
          break;
        default:
          from = new Date(now.getTime() - 86400000);
      }
      
      // Include health data
      if (includeHealth === 'true') {
        const healthCheckService = strapi.service('api::tabellen-eintrag.health-check');
        exportData.data.health = await healthCheckService.checkSystemHealth();
        exportData.data.healthHistory = await healthCheckService.getHealthHistory(undefined, { from, to: now });
      }
      
      // Include performance metrics
      if (includeMetrics === 'true') {
        const performanceMonitor = strapi.service('api::tabellen-eintrag.performance-monitor');
        exportData.data.performance = await performanceMonitor.getPerformanceReport({ from, to: now });
      }
      
      // Include alerts
      if (includeAlerts === 'true') {
        const alertingService = strapi.service('api::tabellen-eintrag.alerting');
        exportData.data.alerts = await alertingService.getAlertHistory({
          createdAfter: from,
          createdBefore: now,
          limit: 1000
        });
      }
      
      // Set appropriate headers
      const filename = `monitoring-export-${new Date().toISOString().split('T')[0]}.${format}`;
      ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
      
      if (format === 'json') {
        ctx.set('Content-Type', 'application/json');
        ctx.body = JSON.stringify(exportData, null, 2);
      } else {
        ctx.throw(400, 'Unsupported export format. Only JSON is currently supported.');
      }
      
      // Log the export
      const logger = strapi.service('api::tabellen-eintrag.logger');
      logger.logUserAction(
        ctx.state.user?.id || 'unknown',
        'monitoring_data_exported',
        {
          timeRange,
          format,
          includeMetrics,
          includeAlerts,
          includeHealth,
          timestamp: new Date().toISOString(),
          ipAddress: ctx.request.ip,
          userAgent: ctx.request.get('User-Agent')
        }
      );
    } catch (error) {
      strapi.log.error('Failed to export monitoring data:', error);
      ctx.throw(500, 'Failed to export monitoring data', { error: error.message });
    }
  },

  // Configuration endpoints
  async getMonitoringConfig(ctx) {
    try {
      const config = {
        healthChecks: {
          enabled: true,
          interval: 30000, // 30 seconds
          timeout: 10000   // 10 seconds
        },
        metrics: {
          enabled: true,
          retention: 86400000, // 24 hours
          prometheusEnabled: true
        },
        alerts: {
          enabled: true,
          defaultChannels: ['default_log'],
          escalationEnabled: true,
          escalationInterval: 300000 // 5 minutes
        },
        performance: {
          enabled: true,
          thresholds: {
            duration: { warning: 5000, error: 15000 },
            memory: { warning: 100 * 1024 * 1024, error: 500 * 1024 * 1024 },
            cpu: { warning: 70, error: 90 }
          }
        }
      };
      
      ctx.body = {
        data: config,
        meta: {
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      strapi.log.error('Failed to get monitoring config:', error);
      ctx.throw(500, 'Failed to retrieve monitoring configuration', { error: error.message });
    }
  },

  async updateMonitoringConfig(ctx) {
    try {
      const updates = ctx.request.body;
      
      // In a real implementation, you would validate and persist the configuration
      // For now, we'll just log the update
      const logger = strapi.service('api::tabellen-eintrag.logger');
      logger.logUserAction(
        ctx.state.user?.id || 'unknown',
        'monitoring_config_updated',
        {
          updates,
          timestamp: new Date().toISOString(),
          ipAddress: ctx.request.ip,
          userAgent: ctx.request.get('User-Agent')
        }
      );
      
      ctx.body = {
        data: {
          success: true,
          updatedAt: new Date().toISOString(),
          updates
        }
      };
    } catch (error) {
      strapi.log.error('Failed to update monitoring config:', error);
      ctx.throw(500, 'Failed to update monitoring configuration', { error: error.message });
    }
  }
}));