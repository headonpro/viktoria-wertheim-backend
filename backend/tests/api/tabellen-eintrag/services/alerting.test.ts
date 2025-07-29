/**
 * Alerting Service Tests
 * Tests for system alerting, notifications, and escalation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  createAlertingService, 
  AlertingServiceImpl, 
  AlertSeverity, 
  AlertStatus, 
  NotificationType,
  HealthStatus
} from '../../../../src/api/tabellen-eintrag/services/alerting';
import { createAutomationLogger } from '../../../../src/api/tabellen-eintrag/services/logger';

describe('AlertingService', () => {
  let alertingService: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createAutomationLogger();
    alertingService = createAlertingService(mockLogger);
  });

  afterEach(() => {
    if (alertingService.destroy) {
      alertingService.destroy();
    }
  });

  describe('createAlert', () => {
    it('should create a new alert', async () => {
      const alertDef = {
        title: 'Test Alert',
        description: 'This is a test alert',
        severity: AlertSeverity.HIGH,
        component: 'database',
        metric: 'response_time',
        value: 5000,
        threshold: 1000,
        labels: { liga_id: '1' },
        context: { test: true }
      };

      const alertId = await alertingService.createAlert(alertDef);

      expect(typeof alertId).toBe('string');
      expect(alertId).toMatch(/^alert_/);

      const activeAlerts = await alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].id).toBe(alertId);
      expect(activeAlerts[0].title).toBe(alertDef.title);
      expect(activeAlerts[0].severity).toBe(alertDef.severity);
      expect(activeAlerts[0].status).toBe(AlertStatus.ACTIVE);
    });

    it('should suppress alert if matching suppression pattern exists', async () => {
      // Add suppression pattern
      alertingService.suppressAlerts('Test Alert', 3600000); // 1 hour

      const alertDef = {
        title: 'Test Alert - Database Slow',
        description: 'Database is responding slowly',
        severity: AlertSeverity.HIGH,
        component: 'database'
      };

      const alertId = await alertingService.createAlert(alertDef);

      const activeAlerts = await alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0); // Should be suppressed

      const allAlerts = await alertingService.getAlertHistory();
      const suppressedAlert = allAlerts.find(a => a.id === alertId);
      expect(suppressedAlert.status).toBe(AlertStatus.SUPPRESSED);
    });

    it('should log alert creation', async () => {
      const logSpy = vi.spyOn(mockLogger, 'logAlert');

      const alertDef = {
        title: 'Test Alert',
        description: 'Test description',
        severity: AlertSeverity.MEDIUM,
        component: 'queue'
      };

      await alertingService.createAlert(alertDef);

      expect(logSpy).toHaveBeenCalledWith(
        'warn',
        'Alert created: Test Alert',
        expect.objectContaining({
          component: 'queue',
          severity: AlertSeverity.MEDIUM
        })
      );
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an active alert', async () => {
      const alertDef = {
        title: 'Test Alert',
        description: 'Test description',
        severity: AlertSeverity.HIGH,
        component: 'database'
      };

      const alertId = await alertingService.createAlert(alertDef);
      await alertingService.resolveAlert(alertId, 'Issue fixed manually');

      const activeAlerts = await alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);

      const alertHistory = await alertingService.getAlertHistory();
      const resolvedAlert = alertHistory.find(a => a.id === alertId);
      expect(resolvedAlert.status).toBe(AlertStatus.RESOLVED);
      expect(resolvedAlert.resolution).toBe('Issue fixed manually');
      expect(resolvedAlert.resolvedAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent alert', async () => {
      await expect(alertingService.resolveAlert('non-existent-id'))
        .rejects.toThrow('Alert not found: non-existent-id');
    });

    it('should handle resolving already resolved alert', async () => {
      const alertDef = {
        title: 'Test Alert',
        description: 'Test description',
        severity: AlertSeverity.LOW,
        component: 'memory'
      };

      const alertId = await alertingService.createAlert(alertDef);
      await alertingService.resolveAlert(alertId, 'First resolution');
      
      // Resolving again should not throw
      await expect(alertingService.resolveAlert(alertId, 'Second resolution'))
        .resolves.not.toThrow();
    });
  });

  describe('alert rules', () => {
    it('should add alert rule', () => {
      const rule = {
        id: 'test_rule',
        name: 'Test Rule',
        description: 'Test alert rule',
        enabled: true,
        component: 'database',
        metric: 'response_time',
        condition: { operator: 'gt' as const, value: 1000 },
        threshold: 1000,
        duration: 60,
        severity: AlertSeverity.HIGH,
        notificationChannels: ['default_log']
      };

      alertingService.addAlertRule(rule);

      const rules = alertingService.getAlertRules();
      expect(rules).toContainEqual(rule);
    });

    it('should remove alert rule', () => {
      const rule = {
        id: 'test_rule',
        name: 'Test Rule',
        description: 'Test alert rule',
        enabled: true,
        component: 'database',
        metric: 'response_time',
        condition: { operator: 'gt' as const, value: 1000 },
        threshold: 1000,
        duration: 60,
        severity: AlertSeverity.HIGH,
        notificationChannels: ['default_log']
      };

      alertingService.addAlertRule(rule);
      alertingService.removeAlertRule('test_rule');

      const rules = alertingService.getAlertRules();
      expect(rules.find(r => r.id === 'test_rule')).toBeUndefined();
    });

    it('should update alert rule', () => {
      const rule = {
        id: 'test_rule',
        name: 'Test Rule',
        description: 'Test alert rule',
        enabled: true,
        component: 'database',
        metric: 'response_time',
        condition: { operator: 'gt' as const, value: 1000 },
        threshold: 1000,
        duration: 60,
        severity: AlertSeverity.HIGH,
        notificationChannels: ['default_log']
      };

      alertingService.addAlertRule(rule);
      alertingService.updateAlertRule('test_rule', { 
        threshold: 2000,
        severity: AlertSeverity.CRITICAL 
      });

      const rules = alertingService.getAlertRules();
      const updatedRule = rules.find(r => r.id === 'test_rule');
      expect(updatedRule.threshold).toBe(2000);
      expect(updatedRule.severity).toBe(AlertSeverity.CRITICAL);
    });
  });

  describe('notification channels', () => {
    it('should add notification channel', () => {
      const channel = {
        id: 'test_channel',
        name: 'Test Channel',
        type: NotificationType.EMAIL,
        enabled: true,
        config: {
          email: {
            to: ['admin@example.com'],
            subject: 'Alert: {{title}}'
          }
        }
      };

      alertingService.addNotificationChannel(channel);

      // Verify channel was added (internal state check)
      expect(() => alertingService.removeNotificationChannel('test_channel')).not.toThrow();
    });

    it('should remove notification channel', () => {
      const channel = {
        id: 'test_channel',
        name: 'Test Channel',
        type: NotificationType.LOG,
        enabled: true,
        config: {}
      };

      alertingService.addNotificationChannel(channel);
      alertingService.removeNotificationChannel('test_channel');

      // Verify channel was removed (should not throw when removing non-existent)
      expect(() => alertingService.removeNotificationChannel('test_channel')).not.toThrow();
    });

    it('should test notification channel', async () => {
      const channel = {
        id: 'test_channel',
        name: 'Test Channel',
        type: NotificationType.LOG,
        enabled: true,
        config: {}
      };

      alertingService.addNotificationChannel(channel);

      const result = await alertingService.testNotificationChannel('test_channel');
      expect(result).toBe(true);
    });

    it('should handle test of non-existent channel', async () => {
      await expect(alertingService.testNotificationChannel('non-existent'))
        .rejects.toThrow('Notification channel not found: non-existent');
    });
  });

  describe('health check processing', () => {
    it('should process healthy system health', async () => {
      const systemHealth = {
        overall: HealthStatus.HEALTHY,
        timestamp: new Date(),
        uptime: 3600000,
        components: [
          {
            name: 'database',
            status: HealthStatus.HEALTHY,
            responseTime: 100,
            lastCheck: new Date(),
            metrics: { responseTime: 100 }
          }
        ],
        summary: {
          totalComponents: 1,
          healthyComponents: 1,
          degradedComponents: 0,
          unhealthyComponents: 0,
          averageResponseTime: 100,
          criticalIssues: []
        }
      };

      await alertingService.processHealthCheck(systemHealth);

      const activeAlerts = await alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    it('should create alert for unhealthy component', async () => {
      const systemHealth = {
        overall: HealthStatus.UNHEALTHY,
        timestamp: new Date(),
        uptime: 3600000,
        components: [
          {
            name: 'database',
            status: HealthStatus.UNHEALTHY,
            responseTime: 0,
            lastCheck: new Date(),
            message: 'Connection failed',
            metrics: {}
          }
        ],
        summary: {
          totalComponents: 1,
          healthyComponents: 0,
          degradedComponents: 0,
          unhealthyComponents: 1,
          averageResponseTime: 0,
          criticalIssues: ['Database connection failed']
        }
      };

      await alertingService.processHealthCheck(systemHealth);

      const activeAlerts = await alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].title).toContain('Component Unhealthy: database');
      expect(activeAlerts[0].severity).toBe(AlertSeverity.HIGH);
    });

    it('should create alert for degraded component', async () => {
      const systemHealth = {
        overall: HealthStatus.DEGRADED,
        timestamp: new Date(),
        uptime: 3600000,
        components: [
          {
            name: 'queue',
            status: HealthStatus.DEGRADED,
            responseTime: 2000,
            lastCheck: new Date(),
            message: 'High load detected',
            metrics: { pendingJobs: 50 }
          }
        ],
        summary: {
          totalComponents: 1,
          healthyComponents: 0,
          degradedComponents: 1,
          unhealthyComponents: 0,
          averageResponseTime: 2000,
          criticalIssues: []
        }
      };

      await alertingService.processHealthCheck(systemHealth);

      const activeAlerts = await alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].title).toContain('Component Degraded: queue');
      expect(activeAlerts[0].severity).toBe(AlertSeverity.MEDIUM);
    });
  });

  describe('performance metrics processing', () => {
    it('should process performance metrics without alerts for normal values', async () => {
      const metrics = {
        operationName: 'table_calculation',
        duration: 1000,
        memoryUsage: 50 * 1024 * 1024,
        cpuUsage: 30,
        timestamp: new Date(),
        metadata: { liga_id: 1 }
      };

      await alertingService.processPerformanceMetrics(metrics);

      const activeAlerts = await alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    it('should create alert for slow operation based on rules', async () => {
      // Add a rule for slow operations
      const rule = {
        id: 'slow_calculation',
        name: 'Slow Calculation',
        description: 'Table calculation is taking too long',
        enabled: true,
        component: 'calculation',
        metric: 'duration',
        condition: { operator: 'gt' as const, value: 5000 },
        threshold: 5000,
        duration: 0, // Immediate alert
        severity: AlertSeverity.HIGH,
        notificationChannels: ['default_log']
      };

      alertingService.addAlertRule(rule);

      const metrics = {
        operationName: 'table_calculation',
        duration: 8000, // Exceeds threshold
        memoryUsage: 50 * 1024 * 1024,
        cpuUsage: 30,
        timestamp: new Date(),
        metadata: { liga_id: 1 }
      };

      await alertingService.processPerformanceMetrics(metrics);

      const activeAlerts = await alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].title).toBe('Slow Calculation');
      expect(activeAlerts[0].value).toBe(8000);
      expect(activeAlerts[0].threshold).toBe(5000);
    });
  });

  describe('alert suppression', () => {
    it('should suppress alerts matching pattern', () => {
      alertingService.suppressAlerts('database', 3600000);

      const suppressions = alertingService.getActiveSuppressions();
      expect(suppressions).toHaveLength(1);
      expect(suppressions[0].pattern).toBe('database');
      expect(suppressions[0].expiresAt).toBeInstanceOf(Date);
    });

    it('should remove suppression', () => {
      alertingService.suppressAlerts('test', 3600000);
      
      const suppressions = alertingService.getActiveSuppressions();
      const suppressionId = suppressions[0].id;
      
      alertingService.removeSuppression(suppressionId);
      
      const remainingSuppressions = alertingService.getActiveSuppressions();
      expect(remainingSuppressions).toHaveLength(0);
    });

    it('should filter expired suppressions', () => {
      // Add suppression with very short duration
      alertingService.suppressAlerts('test', 1); // 1ms

      // Wait for expiration
      setTimeout(() => {
        const suppressions = alertingService.getActiveSuppressions();
        expect(suppressions).toHaveLength(0);
      }, 10);
    });
  });

  describe('alert filtering', () => {
    beforeEach(async () => {
      // Create test alerts
      await alertingService.createAlert({
        title: 'Database Alert',
        description: 'Database issue',
        severity: AlertSeverity.HIGH,
        component: 'database'
      });

      await alertingService.createAlert({
        title: 'Queue Alert',
        description: 'Queue issue',
        severity: AlertSeverity.MEDIUM,
        component: 'queue'
      });

      await alertingService.createAlert({
        title: 'Memory Alert',
        description: 'Memory issue',
        severity: AlertSeverity.CRITICAL,
        component: 'memory'
      });
    });

    it('should filter alerts by severity', async () => {
      const highAlerts = await alertingService.getActiveAlerts({ severity: AlertSeverity.HIGH });
      expect(highAlerts).toHaveLength(1);
      expect(highAlerts[0].title).toBe('Database Alert');

      const criticalAlerts = await alertingService.getActiveAlerts({ severity: AlertSeverity.CRITICAL });
      expect(criticalAlerts).toHaveLength(1);
      expect(criticalAlerts[0].title).toBe('Memory Alert');
    });

    it('should filter alerts by component', async () => {
      const databaseAlerts = await alertingService.getActiveAlerts({ component: 'database' });
      expect(databaseAlerts).toHaveLength(1);
      expect(databaseAlerts[0].title).toBe('Database Alert');

      const queueAlerts = await alertingService.getActiveAlerts({ component: 'queue' });
      expect(queueAlerts).toHaveLength(1);
      expect(queueAlerts[0].title).toBe('Queue Alert');
    });

    it('should filter alerts by status', async () => {
      const alerts = await alertingService.getActiveAlerts();
      const alertId = alerts[0].id;
      
      await alertingService.resolveAlert(alertId);

      const activeAlerts = await alertingService.getActiveAlerts({ status: AlertStatus.ACTIVE });
      const resolvedAlerts = await alertingService.getAlertHistory({ status: AlertStatus.RESOLVED });

      expect(activeAlerts).toHaveLength(2);
      expect(resolvedAlerts).toHaveLength(1);
    });

    it('should limit number of returned alerts', async () => {
      const limitedAlerts = await alertingService.getActiveAlerts({ limit: 2 });
      expect(limitedAlerts).toHaveLength(2);
    });
  });

  describe('default alert rules', () => {
    it('should have default alert rules configured', () => {
      const rules = alertingService.getAlertRules();
      
      expect(rules.length).toBeGreaterThan(0);
      
      const ruleNames = rules.map(r => r.name);
      expect(ruleNames).toContain('Database Slow Response');
      expect(ruleNames).toContain('High Memory Usage');
      expect(ruleNames).toContain('Queue Overload');
      expect(ruleNames).toContain('High Calculation Failure Rate');
    });

    it('should have default notification channels', () => {
      // Test that default log channel works
      expect(async () => {
        await alertingService.testNotificationChannel('default_log');
      }).not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle notification failures gracefully', async () => {
      // Add a channel that will fail
      const failingChannel = {
        id: 'failing_channel',
        name: 'Failing Channel',
        type: NotificationType.WEBHOOK,
        enabled: true,
        config: {
          webhook: {
            url: 'http://invalid-url',
            method: 'POST' as const
          }
        }
      };

      alertingService.addNotificationChannel(failingChannel);

      // Add rule that uses the failing channel
      const rule = {
        id: 'test_rule',
        name: 'Test Rule',
        description: 'Test rule',
        enabled: true,
        component: 'test',
        metric: 'test',
        condition: { operator: 'gt' as const, value: 0 },
        threshold: 0,
        duration: 0,
        severity: AlertSeverity.LOW,
        notificationChannels: ['failing_channel']
      };

      alertingService.addAlertRule(rule);

      // Creating alert should not throw even if notification fails
      await expect(alertingService.createAlert({
        title: 'Test Alert',
        description: 'Test',
        severity: AlertSeverity.LOW,
        component: 'test'
      })).resolves.not.toThrow();
    });

    it('should handle malformed alert definitions', async () => {
      const invalidAlert = {
        title: '', // Empty title
        description: null,
        severity: 'invalid' as any,
        component: undefined
      };

      // Should handle gracefully without throwing
      await expect(alertingService.createAlert(invalidAlert)).resolves.toBeDefined();
    });
  });

  describe('concurrent operations', () => {
    it('should handle concurrent alert creation', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(alertingService.createAlert({
          title: `Concurrent Alert ${i}`,
          description: `Alert number ${i}`,
          severity: AlertSeverity.LOW,
          component: 'test'
        }));
      }

      const alertIds = await Promise.all(promises);
      expect(alertIds).toHaveLength(10);
      expect(new Set(alertIds).size).toBe(10); // All IDs should be unique

      const activeAlerts = await alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(10);
    });

    it('should handle concurrent alert resolution', async () => {
      // Create alerts first
      const alertIds = await Promise.all([
        alertingService.createAlert({
          title: 'Alert 1',
          description: 'First alert',
          severity: AlertSeverity.LOW,
          component: 'test'
        }),
        alertingService.createAlert({
          title: 'Alert 2',
          description: 'Second alert',
          severity: AlertSeverity.LOW,
          component: 'test'
        }),
        alertingService.createAlert({
          title: 'Alert 3',
          description: 'Third alert',
          severity: AlertSeverity.LOW,
          component: 'test'
        })
      ]);

      // Resolve them concurrently
      const resolutionPromises = alertIds.map(id => 
        alertingService.resolveAlert(id, 'Resolved concurrently')
      );

      await expect(Promise.all(resolutionPromises)).resolves.not.toThrow();

      const activeAlerts = await alertingService.getActiveAlerts();
      expect(activeAlerts).toHaveLength(0);
    });
  });
});