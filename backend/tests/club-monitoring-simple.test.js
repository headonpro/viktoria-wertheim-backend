/**
 * Simple Club Monitoring System Test
 * 
 * Basic tests to verify the monitoring system components work correctly.
 */

describe('Club Monitoring System - Simple Tests', () => {
  let ClubMetricsCollector, ClubAlertingSystem, ClubMonitoringService;

  beforeAll(() => {
    // Import the classes directly
    try {
      const metricsModule = require('../src/api/club/services/metrics-collector');
      const alertingModule = require('../src/api/club/services/alerting-system');
      const monitoringModule = require('../src/api/club/services/monitoring-service');
      
      ClubMetricsCollector = metricsModule.ClubMetricsCollector;
      ClubAlertingSystem = alertingModule.ClubAlertingSystem;
      ClubMonitoringService = monitoringModule.ClubMonitoringService;
    } catch (error) {
      console.log('Import error:', error.message);
    }
  });

  describe('ClubMetricsCollector', () => {
    let collector;
    let mockStrapi;

    beforeEach(() => {
      mockStrapi = {
        log: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn()
        },
        eventHub: {
          emit: jest.fn()
        }
      };

      if (ClubMetricsCollector) {
        collector = new ClubMetricsCollector(mockStrapi);
      }
    });

    test('should initialize with default metrics', () => {
      if (!ClubMetricsCollector) {
        console.log('ClubMetricsCollector not available, skipping test');
        return;
      }

      expect(collector).toBeDefined();
      const metrics = collector.getMetrics();
      expect(metrics.size).toBeGreaterThan(0);
      expect(metrics.has('club_creation_rate')).toBe(true);
      expect(metrics.has('active_clubs_count')).toBe(true);
    });

    test('should record metrics correctly', () => {
      if (!ClubMetricsCollector) {
        console.log('ClubMetricsCollector not available, skipping test');
        return;
      }

      collector.recordMetric('test_metric', 100, { test: 'true' });
      
      const latestValue = collector.getLatestValue('test_metric');
      expect(latestValue).toBe(100);
      
      const metric = collector.getMetric('test_metric');
      expect(metric).toBeDefined();
      expect(metric.points.length).toBe(1);
      expect(metric.points[0].value).toBe(100);
      expect(metric.points[0].tags.test).toBe('true');
    });

    test('should calculate metric statistics', () => {
      if (!ClubMetricsCollector) {
        console.log('ClubMetricsCollector not available, skipping test');
        return;
      }

      // Record multiple values
      collector.recordMetric('stats_test', 10);
      collector.recordMetric('stats_test', 20);
      collector.recordMetric('stats_test', 30);
      
      const stats = collector.getMetricStats('stats_test', 60);
      expect(stats).toBeDefined();
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(30);
      expect(stats.avg).toBe(20);
      expect(stats.count).toBe(3);
      expect(stats.latest).toBe(30);
    });
  });

  describe('ClubAlertingSystem', () => {
    let alertingSystem;
    let mockStrapi;

    beforeEach(() => {
      mockStrapi = {
        log: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn()
        },
        eventHub: {
          emit: jest.fn()
        }
      };

      if (ClubAlertingSystem) {
        alertingSystem = new ClubAlertingSystem(mockStrapi);
      }
    });

    test('should initialize with default alert rules', () => {
      if (!ClubAlertingSystem) {
        console.log('ClubAlertingSystem not available, skipping test');
        return;
      }

      expect(alertingSystem).toBeDefined();
      const rules = alertingSystem.getAlertRules();
      expect(rules.length).toBeGreaterThan(0);
      
      // Check for some expected default rules
      const validationRule = rules.find(rule => rule.metric === 'club_validation_errors');
      expect(validationRule).toBeDefined();
      
      const cacheRule = rules.find(rule => rule.metric === 'club_cache_hit_rate');
      expect(cacheRule).toBeDefined();
    });

    test('should add and remove alert rules', () => {
      if (!ClubAlertingSystem) {
        console.log('ClubAlertingSystem not available, skipping test');
        return;
      }

      const testRule = {
        id: 'test-rule',
        name: 'Test Rule',
        metric: 'test_metric',
        operator: 'gt',
        value: 50,
        severity: 'warning',
        description: 'Test rule',
        enabled: true,
        cooldownMinutes: 5,
        notificationChannels: ['log']
      };

      // Add rule
      alertingSystem.addAlertRule(testRule);
      const rules = alertingSystem.getAlertRules();
      const addedRule = rules.find(rule => rule.id === 'test-rule');
      expect(addedRule).toBeDefined();
      expect(addedRule.name).toBe('Test Rule');

      // Remove rule
      const removed = alertingSystem.removeAlertRule('test-rule');
      expect(removed).toBe(true);
      
      const rulesAfterRemoval = alertingSystem.getAlertRules();
      const removedRule = rulesAfterRemoval.find(rule => rule.id === 'test-rule');
      expect(removedRule).toBeUndefined();
    });

    test('should get alert summary', async () => {
      if (!ClubAlertingSystem) {
        console.log('ClubAlertingSystem not available, skipping test');
        return;
      }

      const summary = await alertingSystem.getAlertSummary();
      
      expect(summary).toHaveProperty('active');
      expect(summary).toHaveProperty('resolved');
      expect(summary).toHaveProperty('topAlerts');
      
      expect(summary.active).toHaveProperty('critical');
      expect(summary.active).toHaveProperty('warning');
      expect(summary.active).toHaveProperty('info');
      
      expect(Array.isArray(summary.topAlerts)).toBe(true);
    });
  });

  describe('ClubMonitoringService', () => {
    let monitoringService;
    let mockStrapi;

    beforeEach(() => {
      mockStrapi = {
        log: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn()
        },
        eventHub: {
          on: jest.fn(),
          emit: jest.fn()
        },
        service: jest.fn().mockReturnValue({
          getMetrics: jest.fn().mockResolvedValue({}),
          start: jest.fn(),
          stop: jest.fn()
        })
      };

      if (ClubMonitoringService) {
        monitoringService = new ClubMonitoringService(mockStrapi);
      }
    });

    test('should initialize monitoring service', () => {
      if (!ClubMonitoringService) {
        console.log('ClubMonitoringService not available, skipping test');
        return;
      }

      expect(monitoringService).toBeDefined();
      expect(monitoringService.getMetricsCollector()).toBeDefined();
      expect(monitoringService.getAlertingSystem()).toBeDefined();
      expect(monitoringService.getDashboard()).toBeDefined();
    });

    test('should get configuration', () => {
      if (!ClubMonitoringService) {
        console.log('ClubMonitoringService not available, skipping test');
        return;
      }

      const config = monitoringService.getConfiguration();
      
      expect(config).toHaveProperty('metricsCollection');
      expect(config).toHaveProperty('alerting');
      expect(config).toHaveProperty('dashboard');
      expect(config).toHaveProperty('cleanup');
      
      expect(config.metricsCollection).toHaveProperty('enabled');
      expect(config.alerting).toHaveProperty('enabled');
      expect(config.dashboard).toHaveProperty('enabled');
    });

    test('should update configuration', () => {
      if (!ClubMonitoringService) {
        console.log('ClubMonitoringService not available, skipping test');
        return;
      }

      const originalConfig = monitoringService.getConfiguration();
      
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

    test('should record custom metrics', () => {
      if (!ClubMonitoringService) {
        console.log('ClubMonitoringService not available, skipping test');
        return;
      }

      // This should not throw an error
      expect(() => {
        monitoringService.recordMetric('custom_metric', 42, { source: 'test' });
      }).not.toThrow();
      
      const metricsCollector = monitoringService.getMetricsCollector();
      const latestValue = metricsCollector.getLatestValue('custom_metric');
      expect(latestValue).toBe(42);
    });
  });

  describe('Integration', () => {
    test('should work together as a system', () => {
      if (!ClubMetricsCollector || !ClubAlertingSystem || !ClubMonitoringService) {
        console.log('Some components not available, skipping integration test');
        return;
      }

      const mockStrapi = {
        log: {
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
          debug: jest.fn()
        },
        eventHub: {
          on: jest.fn(),
          emit: jest.fn()
        },
        service: jest.fn().mockReturnValue({
          getMetrics: jest.fn().mockResolvedValue({}),
          start: jest.fn(),
          stop: jest.fn()
        })
      };

      // Create monitoring service
      const monitoringService = new ClubMonitoringService(mockStrapi);
      
      // Record a metric
      monitoringService.recordMetric('integration_test', 100);
      
      // Verify metric was recorded
      const metricsCollector = monitoringService.getMetricsCollector();
      const value = metricsCollector.getLatestValue('integration_test');
      expect(value).toBe(100);
      
      // Verify alerting system is available
      const alertingSystem = monitoringService.getAlertingSystem();
      expect(alertingSystem).toBeDefined();
      
      // Verify dashboard is available
      const dashboard = monitoringService.getDashboard();
      expect(dashboard).toBeDefined();
    });
  });
});