/**
 * Club Monitoring System Tests
 * 
 * Comprehensive tests for club metrics collection, alerting, and dashboard functionality.
 */

const { setupStrapi, cleanupStrapi } = require('./helpers/strapi');

describe('Club Monitoring System', () => {
  let strapi;
  let monitoringService;
  let metricsCollector;
  let alertingSystem;
  let dashboard;

  beforeAll(async () => {
    strapi = await setupStrapi();
    monitoringService = strapi.service('api::club.monitoring-service');
    metricsCollector = monitoringService.getMetricsCollector();
    alertingSystem = monitoringService.getAlertingSystem();
    dashboard = monitoringService.getDashboard();
  });

  afterAll(async () => {
    if (monitoringService) {
      await monitoringService.stop();
    }
    await cleanupStrapi();
  });

  describe('Monitoring Service', () => {
    test('should initialize monitoring service', () => {
      expect(monitoringService).toBeDefined();
      expect(metricsCollector).toBeDefined();
      expect(alertingSystem).toBeDefined();
      expect(dashboard).toBeDefined();
    });

    test('should start and stop monitoring service', async () => {
      await monitoringService.start();
      
      const status = await monitoringService.getSystemStatus();
      expect(status.components.metricsCollection).toBe('running');
      
      await monitoringService.stop();
      
      const stoppedStatus = await monitoringService.getSystemStatus();
      expect(stoppedStatus.components.metricsCollection).toBe('stopped');
    });

    test('should get system status', async () => {
      const status = await monitoringService.getSystemStatus();
      
      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('version');
      expect(status).toHaveProperty('components');
      expect(status).toHaveProperty('statistics');
      
      expect(['healthy', 'degraded', 'critical']).toContain(status.status);
      expect(typeof status.uptime).toBe('number');
      expect(status.components).toHaveProperty('metricsCollection');
      expect(status.components).toHaveProperty('alerting');
      expect(status.components).toHaveProperty('dashboard');
    });

    test('should get health check data', async () => {
      const health = await monitoringService.getHealthCheck();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('checks');
      
      expect(typeof health.uptime).toBe('number');
      expect(health.checks).toHaveProperty('metricsCollection');
      expect(health.checks).toHaveProperty('alerting');
      expect(health.checks).toHaveProperty('dashboard');
    });
  });

  describe('Metrics Collector', () => {
    test('should record metrics', () => {
      metricsCollector.recordMetric('test_metric', 100, { test: 'true' });
      
      const metric = metricsCollector.getMetric('test_metric');
      expect(metric).toBeDefined();
      expect(metric.points.length).toBeGreaterThan(0);
      
      const latestValue = metricsCollector.getLatestValue('test_metric');
      expect(latestValue).toBe(100);
    });

    test('should calculate metric statistics', () => {
      // Record multiple values
      metricsCollector.recordMetric('stats_test', 10);
      metricsCollector.recordMetric('stats_test', 20);
      metricsCollector.recordMetric('stats_test', 30);
      
      const stats = metricsCollector.getMetricStats('stats_test', 60);
      expect(stats).toBeDefined();
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(30);
      expect(stats.avg).toBe(20);
      expect(stats.count).toBe(3);
      expect(stats.latest).toBe(30);
    });

    test('should export metrics', () => {
      const exported = metricsCollector.exportMetrics();
      
      expect(exported).toHaveProperty('timestamp');
      expect(exported).toHaveProperty('system');
      expect(exported).toHaveProperty('metrics');
      expect(exported.system).toBe('viktoria-club-metrics');
    });

    test('should clear old metrics', () => {
      metricsCollector.recordMetric('old_metric', 50);
      
      const beforeClear = metricsCollector.getMetric('old_metric');
      expect(beforeClear.points.length).toBeGreaterThan(0);
      
      metricsCollector.clearOldMetrics(0); // Clear all metrics
      
      const afterClear = metricsCollector.getMetric('old_metric');
      expect(afterClear.points.length).toBe(0);
    });
  });

  describe('Alerting System', () => {
    test('should process metrics and trigger alerts', async () => {
      // Add a test alert rule
      alertingSystem.addAlertRule({
        id: 'test-alert-rule',
        name: 'Test Alert',
        metric: 'test_alert_metric',
        operator: 'gt',
        value: 50,
        severity: 'warning',
        description: 'Test alert for monitoring',
        enabled: true,
        cooldownMinutes: 0,
        notificationChannels: ['log']
      });

      // Process a metric that should trigger the alert
      await alertingSystem.processMetric('test_alert_metric', 100);

      // Check if alert was created
      const activeAlerts = alertingSystem.getActiveAlerts();
      const testAlert = activeAlerts.find(alert => alert.metric === 'test_alert_metric');
      
      expect(testAlert).toBeDefined();
      expect(testAlert.severity).toBe('warning');
      expect(testAlert.currentValue).toBe(100);
      expect(testAlert.status).toBe('active');

      // Clean up
      alertingSystem.removeAlertRule('test-alert-rule');
    });

    test('should acknowledge and resolve alerts', async () => {
      // Create a test alert
      alertingSystem.addAlertRule({
        id: 'ack-test-rule',
        name: 'Acknowledgment Test',
        metric: 'ack_test_metric',
        operator: 'gt',
        value: 10,
        severity: 'info',
        description: 'Test alert for acknowledgment',
        enabled: true,
        cooldownMinutes: 0,
        notificationChannels: ['log']
      });

      await alertingSystem.processMetric('ack_test_metric', 20);
      
      const activeAlerts = alertingSystem.getActiveAlerts();
      const testAlert = activeAlerts.find(alert => alert.metric === 'ack_test_metric');
      
      expect(testAlert).toBeDefined();
      expect(testAlert.status).toBe('active');

      // Acknowledge the alert
      const acknowledged = await alertingSystem.acknowledgeAlert(testAlert.id, 'test-user');
      expect(acknowledged).toBe(true);
      
      const acknowledgedAlert = alertingSystem.getAlert(testAlert.id);
      expect(acknowledgedAlert.status).toBe('acknowledged');
      expect(acknowledgedAlert.acknowledgedBy).toBe('test-user');

      // Resolve the alert
      const resolved = await alertingSystem.resolveAlert(testAlert.id, 'test-user');
      expect(resolved).toBe(true);
      
      const resolvedAlert = alertingSystem.getAlert(testAlert.id);
      expect(resolvedAlert.status).toBe('resolved');

      // Clean up
      alertingSystem.removeAlertRule('ack-test-rule');
    });

    test('should get alert summary', async () => {
      const summary = await alertingSystem.getAlertSummary();
      
      expect(summary).toHaveProperty('active');
      expect(summary).toHaveProperty('resolved');
      expect(summary).toHaveProperty('topAlerts');
      
      expect(summary.active).toHaveProperty('critical');
      expect(summary.active).toHaveProperty('warning');
      expect(summary.active).toHaveProperty('info');
      
      expect(summary.resolved).toHaveProperty('today');
      expect(summary.resolved).toHaveProperty('thisWeek');
      expect(summary.resolved).toHaveProperty('thisMonth');
      
      expect(Array.isArray(summary.topAlerts)).toBe(true);
    });

    test('should manage alert rules', () => {
      const testRule = {
        id: 'rule-management-test',
        name: 'Rule Management Test',
        metric: 'rule_test_metric',
        operator: 'lt',
        value: 5,
        severity: 'critical',
        description: 'Test rule for management',
        enabled: true,
        cooldownMinutes: 5,
        notificationChannels: ['log', 'console']
      };

      // Add rule
      alertingSystem.addAlertRule(testRule);
      const rules = alertingSystem.getAlertRules();
      const addedRule = rules.find(rule => rule.id === testRule.id);
      expect(addedRule).toBeDefined();
      expect(addedRule.name).toBe(testRule.name);

      // Update rule
      const updated = alertingSystem.updateAlertRule(testRule.id, { 
        severity: 'warning',
        description: 'Updated description'
      });
      expect(updated).toBe(true);
      
      const updatedRules = alertingSystem.getAlertRules();
      const updatedRule = updatedRules.find(rule => rule.id === testRule.id);
      expect(updatedRule.severity).toBe('warning');
      expect(updatedRule.description).toBe('Updated description');

      // Remove rule
      const removed = alertingSystem.removeAlertRule(testRule.id);
      expect(removed).toBe(true);
      
      const finalRules = alertingSystem.getAlertRules();
      const removedRule = finalRules.find(rule => rule.id === testRule.id);
      expect(removedRule).toBeUndefined();
    });
  });

  describe('Dashboard', () => {
    test('should get dashboard data', async () => {
      const dashboardData = await dashboard.getDashboardData();
      
      expect(dashboardData).toHaveProperty('systemHealth');
      expect(dashboardData).toHaveProperty('operationalMetrics');
      expect(dashboardData).toHaveProperty('performanceMetrics');
      expect(dashboardData).toHaveProperty('alertSummary');
      expect(dashboardData).toHaveProperty('keyMetrics');
      expect(dashboardData).toHaveProperty('lastUpdated');
      
      // System Health
      expect(dashboardData.systemHealth).toHaveProperty('overall');
      expect(dashboardData.systemHealth).toHaveProperty('score');
      expect(dashboardData.systemHealth).toHaveProperty('components');
      expect(dashboardData.systemHealth).toHaveProperty('uptime');
      
      // Key Metrics
      expect(Array.isArray(dashboardData.keyMetrics)).toBe(true);
      if (dashboardData.keyMetrics.length > 0) {
        const metric = dashboardData.keyMetrics[0];
        expect(metric).toHaveProperty('name');
        expect(metric).toHaveProperty('value');
        expect(metric).toHaveProperty('unit');
        expect(metric).toHaveProperty('status');
        expect(metric).toHaveProperty('description');
      }
    });

    test('should get specific metric', async () => {
      // First record a metric to ensure it exists
      metricsCollector.recordMetric('dashboard_test_metric', 42);
      
      const metric = await dashboard.getMetric('Total Clubs');
      if (metric) {
        expect(metric).toHaveProperty('name');
        expect(metric).toHaveProperty('value');
        expect(metric).toHaveProperty('unit');
        expect(metric).toHaveProperty('status');
      }
    });

    test('should export metrics', async () => {
      const exported = await dashboard.exportMetrics();
      
      expect(exported).toHaveProperty('timestamp');
      expect(exported).toHaveProperty('system');
      expect(exported).toHaveProperty('version');
      expect(exported).toHaveProperty('metrics');
      expect(exported.system).toBe('viktoria-club-system');
    });

    test('should clear cache', () => {
      // This should not throw an error
      expect(() => dashboard.clearCache()).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    test('should record metric and trigger monitoring workflow', async () => {
      await monitoringService.start();
      
      // Record a custom metric
      monitoringService.recordMetric('integration_test_metric', 75, { 
        test: 'integration',
        component: 'monitoring'
      });
      
      // Check that metric was recorded
      const latestValue = metricsCollector.getLatestValue('integration_test_metric');
      expect(latestValue).toBe(75);
      
      // Check that dashboard can access the data
      const dashboardData = await monitoringService.getDashboardData();
      expect(dashboardData).toBeDefined();
      
      await monitoringService.stop();
    });

    test('should handle monitoring service lifecycle', async () => {
      // Start service
      await monitoringService.start();
      let status = await monitoringService.getSystemStatus();
      expect(status.components.metricsCollection).toBe('running');
      
      // Stop service
      await monitoringService.stop();
      status = await monitoringService.getSystemStatus();
      expect(status.components.metricsCollection).toBe('stopped');
      
      // Restart service
      await monitoringService.start();
      status = await monitoringService.getSystemStatus();
      expect(status.components.metricsCollection).toBe('running');
      
      await monitoringService.stop();
    });

    test('should export complete monitoring data', async () => {
      const exportData = await monitoringService.exportMonitoringData();
      
      expect(exportData).toHaveProperty('timestamp');
      expect(exportData).toHaveProperty('system');
      expect(exportData).toHaveProperty('version');
      expect(exportData).toHaveProperty('systemStatus');
      expect(exportData).toHaveProperty('dashboardData');
      expect(exportData).toHaveProperty('metrics');
      expect(exportData).toHaveProperty('alerts');
      expect(exportData).toHaveProperty('configuration');
      
      expect(exportData.system).toBe('viktoria-club-monitoring');
    });

    test('should test alert system', async () => {
      // Test different severity levels
      await monitoringService.testAlert('info');
      await monitoringService.testAlert('warning');
      await monitoringService.testAlert('critical');
      
      // This should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    test('should get and update configuration', () => {
      const originalConfig = monitoringService.getConfiguration();
      expect(originalConfig).toHaveProperty('metricsCollection');
      expect(originalConfig).toHaveProperty('alerting');
      expect(originalConfig).toHaveProperty('dashboard');
      expect(originalConfig).toHaveProperty('cleanup');
      
      // Update configuration
      const newConfig = {
        metricsCollection: {
          ...originalConfig.metricsCollection,
          basicInterval: 60
        }
      };
      
      monitoringService.updateConfiguration(newConfig);
      
      const updatedConfig = monitoringService.getConfiguration();
      expect(updatedConfig.metricsCollection.basicInterval).toBe(60);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid metric names gracefully', () => {
      expect(() => {
        metricsCollector.recordMetric('', 100);
      }).not.toThrow();
      
      expect(() => {
        metricsCollector.recordMetric(null, 100);
      }).not.toThrow();
    });

    test('should handle invalid alert operations gracefully', async () => {
      const result1 = await alertingSystem.acknowledgeAlert('non-existent-id', 'user');
      expect(result1).toBe(false);
      
      const result2 = await alertingSystem.resolveAlert('non-existent-id', 'user');
      expect(result2).toBe(false);
    });

    test('should handle missing services gracefully', async () => {
      // This should not throw errors even if some services are not available
      const status = await monitoringService.getSystemStatus();
      expect(status).toBeDefined();
      
      const health = await monitoringService.getHealthCheck();
      expect(health).toBeDefined();
    });
  });
});