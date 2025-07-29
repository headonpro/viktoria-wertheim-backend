/**
 * Alerting Service
 * Handles system alerts, notifications, and escalation for failures and performance issues
 */

import { AutomationLogger, AlertLevel } from './logger';
import { SystemHealth, ComponentHealth, HealthStatus } from './health-check';
import { PerformanceMetrics, PerformanceThresholds } from './types';

export interface AlertingService {
  // Alert management
  createAlert(alert: AlertDefinition): Promise<string>;
  resolveAlert(alertId: string, resolution?: string): Promise<void>;
  getActiveAlerts(filters?: AlertFilters): Promise<Alert[]>;
  getAlertHistory(filters?: AlertFilters): Promise<Alert[]>;
  
  // Alert rules
  addAlertRule(rule: AlertRule): void;
  removeAlertRule(ruleId: string): void;
  updateAlertRule(ruleId: string, rule: Partial<AlertRule>): void;
  getAlertRules(): AlertRule[];
  
  // Notification channels
  addNotificationChannel(channel: NotificationChannel): void;
  removeNotificationChannel(channelId: string): void;
  testNotificationChannel(channelId: string): Promise<boolean>;
  
  // Health monitoring integration
  processHealthCheck(health: SystemHealth): Promise<void>;
  processPerformanceMetrics(metrics: PerformanceMetrics): Promise<void>;
  
  // Alert suppression
  suppressAlerts(pattern: string, duration: number): void;
  removeSuppression(suppressionId: string): void;
  getActiveSuppressions(): AlertSuppression[];
}

export interface AlertDefinition {
  title: string;
  description: string;
  severity: AlertSeverity;
  component: string;
  metric?: string;
  value?: number;
  threshold?: number;
  labels?: Record<string, string>;
  context?: any;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  component: string;
  metric?: string;
  value?: number;
  threshold?: number;
  labels: Record<string, string>;
  context: any;
  status: AlertStatus;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  notificationsSent: NotificationRecord[];
  escalationLevel: number;
  nextEscalationAt?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  component: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  duration: number; // How long condition must be true before alerting
  severity: AlertSeverity;
  notificationChannels: string[];
  labels?: Record<string, string>;
  suppressionPatterns?: string[];
}

export interface AlertCondition {
  operator: 'gt' | 'lt' | 'eq' | 'ne' | 'gte' | 'lte';
  value: number;
  aggregation?: 'avg' | 'max' | 'min' | 'sum' | 'count';
  timeWindow?: number; // Time window in seconds for aggregation
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: NotificationType;
  enabled: boolean;
  config: NotificationConfig;
  escalationDelay?: number; // Delay before escalating to this channel
}

export interface NotificationConfig {
  // Email configuration
  email?: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    template?: string;
  };
  
  // Webhook configuration
  webhook?: {
    url: string;
    method: 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    payload?: any;
    timeout?: number;
  };
  
  // Slack configuration
  slack?: {
    webhook: string;
    channel: string;
    username?: string;
    iconEmoji?: string;
  };
  
  // SMS configuration (placeholder)
  sms?: {
    to: string[];
    provider: string;
    apiKey: string;
  };
}

export interface NotificationRecord {
  channelId: string;
  channelType: NotificationType;
  sentAt: Date;
  success: boolean;
  error?: string;
  response?: any;
}

export interface AlertFilters {
  severity?: AlertSeverity;
  component?: string;
  status?: AlertStatus;
  createdAfter?: Date;
  createdBefore?: Date;
  resolvedAfter?: Date;
  resolvedBefore?: Date;
  limit?: number;
}

export interface AlertSuppression {
  id: string;
  pattern: string;
  reason: string;
  createdAt: Date;
  expiresAt: Date;
  createdBy: string;
  matchCount: number;
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export enum AlertStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
  ACKNOWLEDGED = 'acknowledged'
}

export enum NotificationType {
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  SMS = 'sms',
  LOG = 'log'
}

export class AlertingServiceImpl implements AlertingService {
  private logger: AutomationLogger;
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private suppressions: Map<string, AlertSuppression> = new Map();
  private metricHistory: Map<string, Array<{ timestamp: Date; value: number }>> = new Map();
  private escalationInterval?: NodeJS.Timeout;

  constructor(logger: AutomationLogger) {
    this.logger = logger;
    this.initializeDefaultRules();
    this.initializeDefaultChannels();
    this.startEscalationProcessor();
  }

  async createAlert(alertDef: AlertDefinition): Promise<string> {
    const alertId = this.generateAlertId();
    
    const alert: Alert = {
      id: alertId,
      title: alertDef.title,
      description: alertDef.description,
      severity: alertDef.severity,
      component: alertDef.component,
      metric: alertDef.metric,
      value: alertDef.value,
      threshold: alertDef.threshold,
      labels: alertDef.labels || {},
      context: alertDef.context || {},
      status: AlertStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      notificationsSent: [],
      escalationLevel: 0
    };

    // Check if alert should be suppressed
    if (this.isAlertSuppressed(alert)) {
      alert.status = AlertStatus.SUPPRESSED;
    }

    this.alerts.set(alertId, alert);

    // Log alert creation
    this.logger.logAlert(
      this.severityToLogLevel(alertDef.severity),
      `Alert created: ${alertDef.title}`,
      {
        alertId,
        component: alertDef.component,
        severity: alertDef.severity,
        metric: alertDef.metric,
        value: alertDef.value,
        threshold: alertDef.threshold
      }
    );

    // Send notifications if not suppressed
    if (alert.status === AlertStatus.ACTIVE) {
      await this.sendNotifications(alert);
    }

    return alertId;
  }

  async resolveAlert(alertId: string, resolution?: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    if (alert.status === AlertStatus.RESOLVED) {
      return; // Already resolved
    }

    alert.status = AlertStatus.RESOLVED;
    alert.resolvedAt = new Date();
    alert.updatedAt = new Date();
    alert.resolution = resolution;

    this.logger.logAlert(
      AlertLevel.LOW,
      `Alert resolved: ${alert.title}`,
      {
        alertId,
        component: alert.component,
        resolution,
        duration: alert.resolvedAt.getTime() - alert.createdAt.getTime()
      }
    );

    // Send resolution notifications
    await this.sendResolutionNotifications(alert);
  }

  async getActiveAlerts(filters?: AlertFilters): Promise<Alert[]> {
    return this.filterAlerts(Array.from(this.alerts.values()), {
      ...filters,
      status: AlertStatus.ACTIVE
    });
  }

  async getAlertHistory(filters?: AlertFilters): Promise<Alert[]> {
    return this.filterAlerts(Array.from(this.alerts.values()), filters);
  }

  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.logger.logSystemAction('alert_rule_added', {
      ruleId: rule.id,
      name: rule.name,
      component: rule.component,
      metric: rule.metric
    });
  }

  removeAlertRule(ruleId: string): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      this.alertRules.delete(ruleId);
      this.logger.logSystemAction('alert_rule_removed', {
        ruleId,
        name: rule.name
      });
    }
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.logger.logSystemAction('alert_rule_updated', {
        ruleId,
        updates
      });
    }
  }

  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  addNotificationChannel(channel: NotificationChannel): void {
    this.notificationChannels.set(channel.id, channel);
    this.logger.logSystemAction('notification_channel_added', {
      channelId: channel.id,
      name: channel.name,
      type: channel.type
    });
  }

  removeNotificationChannel(channelId: string): void {
    const channel = this.notificationChannels.get(channelId);
    if (channel) {
      this.notificationChannels.delete(channelId);
      this.logger.logSystemAction('notification_channel_removed', {
        channelId,
        name: channel.name
      });
    }
  }

  async testNotificationChannel(channelId: string): Promise<boolean> {
    const channel = this.notificationChannels.get(channelId);
    if (!channel) {
      throw new Error(`Notification channel not found: ${channelId}`);
    }

    const testAlert: Alert = {
      id: 'test',
      title: 'Test Alert',
      description: 'This is a test alert to verify notification channel configuration',
      severity: AlertSeverity.INFO,
      component: 'alerting',
      labels: {},
      context: { test: true },
      status: AlertStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      notificationsSent: [],
      escalationLevel: 0
    };

    try {
      await this.sendNotificationToChannel(testAlert, channel);
      return true;
    } catch (error) {
      this.logger.logAlert(AlertLevel.MEDIUM, `Notification channel test failed: ${channelId}`, {
        channelId,
        error: error.message
      });
      return false;
    }
  }

  async processHealthCheck(health: SystemHealth): Promise<void> {
    // Check for health-based alerts
    for (const component of health.components) {
      await this.checkHealthAlerts(component);
    }

    // Update health metrics
    this.updateMetricHistory(`health.${health.overall}`, health.overall === HealthStatus.HEALTHY ? 1 : 0);
  }

  async processPerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    // Update metric history
    this.updateMetricHistory(`performance.${metrics.operationName}.duration`, metrics.duration);
    this.updateMetricHistory(`performance.${metrics.operationName}.memory`, metrics.memoryUsage);
    
    if (metrics.cpuUsage) {
      this.updateMetricHistory(`performance.${metrics.operationName}.cpu`, metrics.cpuUsage);
    }

    // Check performance-based alert rules
    await this.checkPerformanceAlerts(metrics);
  }

  suppressAlerts(pattern: string, duration: number): void {
    const suppressionId = this.generateSuppressionId();
    const suppression: AlertSuppression = {
      id: suppressionId,
      pattern,
      reason: 'Manual suppression',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + duration),
      createdBy: 'system',
      matchCount: 0
    };

    this.suppressions.set(suppressionId, suppression);
    
    this.logger.logSystemAction('alert_suppression_added', {
      suppressionId,
      pattern,
      duration
    });
  }

  removeSuppression(suppressionId: string): void {
    const suppression = this.suppressions.get(suppressionId);
    if (suppression) {
      this.suppressions.delete(suppressionId);
      this.logger.logSystemAction('alert_suppression_removed', {
        suppressionId,
        pattern: suppression.pattern
      });
    }
  }

  getActiveSuppressions(): AlertSuppression[] {
    const now = new Date();
    return Array.from(this.suppressions.values())
      .filter(s => s.expiresAt > now);
  }

  // Private methods
  private initializeDefaultRules(): void {
    // Database response time alert
    this.addAlertRule({
      id: 'database_slow_response',
      name: 'Database Slow Response',
      description: 'Database response time is above threshold',
      enabled: true,
      component: 'database',
      metric: 'response_time',
      condition: { operator: 'gt', value: 5000 },
      threshold: 5000,
      duration: 60,
      severity: AlertSeverity.HIGH,
      notificationChannels: ['default_log', 'admin_email']
    });

    // Memory usage alert
    this.addAlertRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      description: 'Memory usage is above 90%',
      enabled: true,
      component: 'memory',
      metric: 'usage_percentage',
      condition: { operator: 'gt', value: 90 },
      threshold: 90,
      duration: 300,
      severity: AlertSeverity.CRITICAL,
      notificationChannels: ['default_log', 'admin_email']
    });

    // Queue overload alert
    this.addAlertRule({
      id: 'queue_overload',
      name: 'Queue Overload',
      description: 'Too many jobs in queue',
      enabled: true,
      component: 'queue',
      metric: 'pending_jobs',
      condition: { operator: 'gt', value: 50 },
      threshold: 50,
      duration: 120,
      severity: AlertSeverity.HIGH,
      notificationChannels: ['default_log']
    });

    // Calculation failure rate alert
    this.addAlertRule({
      id: 'high_calculation_failure_rate',
      name: 'High Calculation Failure Rate',
      description: 'Too many calculation failures',
      enabled: true,
      component: 'calculation',
      metric: 'failure_rate',
      condition: { operator: 'gt', value: 10 },
      threshold: 10,
      duration: 300,
      severity: AlertSeverity.MEDIUM,
      notificationChannels: ['default_log']
    });
  }

  private initializeDefaultChannels(): void {
    // Default log channel
    this.addNotificationChannel({
      id: 'default_log',
      name: 'Default Log Channel',
      type: NotificationType.LOG,
      enabled: true,
      config: {}
    });

    // Admin email channel (if configured)
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      this.addNotificationChannel({
        id: 'admin_email',
        name: 'Admin Email',
        type: NotificationType.EMAIL,
        enabled: true,
        config: {
          email: {
            to: [adminEmail],
            subject: '[Viktoria Wertheim] System Alert: {{title}}'
          }
        },
        escalationDelay: 300 // 5 minutes
      });
    }

    // Webhook channel (if configured)
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      this.addNotificationChannel({
        id: 'webhook_alerts',
        name: 'Webhook Alerts',
        type: NotificationType.WEBHOOK,
        enabled: true,
        config: {
          webhook: {
            url: webhookUrl,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.ALERT_WEBHOOK_TOKEN || ''}`
            },
            timeout: 10000
          }
        }
      });
    }
  }

  private async checkHealthAlerts(component: ComponentHealth): Promise<void> {
    if (component.status === HealthStatus.UNHEALTHY) {
      await this.createAlert({
        title: `Component Unhealthy: ${component.name}`,
        description: component.message || `Component ${component.name} is unhealthy`,
        severity: AlertSeverity.HIGH,
        component: component.name,
        metric: 'health_status',
        value: 0,
        threshold: 1,
        context: {
          responseTime: component.metrics.responseTime,
          metrics: component.metrics,
          details: component.message
        }
      });
    } else if (component.status === HealthStatus.DEGRADED) {
      await this.createAlert({
        title: `Component Degraded: ${component.name}`,
        description: component.message || `Component ${component.name} is degraded`,
        severity: AlertSeverity.MEDIUM,
        component: component.name,
        metric: 'health_status',
        value: 0.5,
        threshold: 1,
        context: {
          responseTime: component.metrics.responseTime,
          metrics: component.metrics,
          details: component.message
        }
      });
    }
  }

  private async checkPerformanceAlerts(metrics: PerformanceMetrics): Promise<void> {
    // Check against alert rules
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      const metricKey = `performance.${metrics.operationName}.${rule.metric}`;
      let value: number | undefined;

      switch (rule.metric) {
        case 'duration':
          value = metrics.duration;
          break;
        case 'memory':
          value = metrics.memoryUsage;
          break;
        case 'cpu':
          value = metrics.cpuUsage;
          break;
      }

      if (value !== undefined && this.evaluateCondition(value, rule.condition)) {
        // Check if condition has been true for the required duration
        if (await this.checkConditionDuration(metricKey, rule.condition, rule.duration)) {
          await this.createAlert({
            title: rule.name,
            description: rule.description,
            severity: rule.severity,
            component: rule.component,
            metric: rule.metric,
            value,
            threshold: rule.threshold,
            labels: rule.labels,
            context: {
              operationName: metrics.operationName,
              timestamp: metrics.timestamp,
              metadata: metrics.metadata
            }
          });
        }
      }
    }
  }

  private evaluateCondition(value: number, condition: AlertCondition): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.value;
      case 'lt': return value < condition.value;
      case 'eq': return value === condition.value;
      case 'ne': return value !== condition.value;
      case 'gte': return value >= condition.value;
      case 'lte': return value <= condition.value;
      default: return false;
    }
  }

  private async checkConditionDuration(metricKey: string, condition: AlertCondition, duration: number): Promise<boolean> {
    const history = this.metricHistory.get(metricKey) || [];
    const cutoffTime = new Date(Date.now() - duration * 1000);
    
    const recentValues = history.filter(h => h.timestamp >= cutoffTime);
    
    if (recentValues.length === 0) return false;

    // Check if all recent values meet the condition
    return recentValues.every(h => this.evaluateCondition(h.value, condition));
  }

  private updateMetricHistory(metricKey: string, value: number): void {
    if (!this.metricHistory.has(metricKey)) {
      this.metricHistory.set(metricKey, []);
    }

    const history = this.metricHistory.get(metricKey)!;
    history.push({ timestamp: new Date(), value });

    // Keep only last hour of data
    const cutoffTime = new Date(Date.now() - 3600000);
    const filteredHistory = history.filter(h => h.timestamp >= cutoffTime);
    this.metricHistory.set(metricKey, filteredHistory);
  }

  private async sendNotifications(alert: Alert): Promise<void> {
    // Find applicable notification channels
    const applicableRules = Array.from(this.alertRules.values())
      .filter(rule => rule.component === alert.component && rule.enabled);

    const channelIds = new Set<string>();
    applicableRules.forEach(rule => {
      rule.notificationChannels.forEach(channelId => channelIds.add(channelId));
    });

    // Send notifications
    for (const channelId of channelIds) {
      const channel = this.notificationChannels.get(channelId);
      if (channel && channel.enabled) {
        try {
          await this.sendNotificationToChannel(alert, channel);
          
          alert.notificationsSent.push({
            channelId,
            channelType: channel.type,
            sentAt: new Date(),
            success: true
          });
        } catch (error) {
          alert.notificationsSent.push({
            channelId,
            channelType: channel.type,
            sentAt: new Date(),
            success: false,
            error: error.message
          });

          this.logger.logAlert(AlertLevel.MEDIUM, `Failed to send notification`, {
            alertId: alert.id,
            channelId,
            error: error.message
          });
        }
      }
    }
  }

  private async sendNotificationToChannel(alert: Alert, channel: NotificationChannel): Promise<void> {
    switch (channel.type) {
      case NotificationType.LOG:
        this.logger.logAlert(
          this.severityToLogLevel(alert.severity),
          `ALERT: ${alert.title}`,
          {
            alertId: alert.id,
            description: alert.description,
            component: alert.component,
            severity: alert.severity,
            context: alert.context
          }
        );
        break;

      case NotificationType.EMAIL:
        await this.sendEmailNotification(alert, channel.config.email!);
        break;

      case NotificationType.WEBHOOK:
        await this.sendWebhookNotification(alert, channel.config.webhook!);
        break;

      case NotificationType.SLACK:
        await this.sendSlackNotification(alert, channel.config.slack!);
        break;

      default:
        throw new Error(`Unsupported notification type: ${channel.type}`);
    }
  }

  private async sendEmailNotification(alert: Alert, config: any): Promise<void> {
    // Email implementation would go here
    // For now, just log that we would send an email
    this.logger.logAlert(AlertLevel.LOW, `Would send email notification for alert: ${alert.title}`, {
      alertId: alert.id,
      recipients: config.to
    });
  }

  private async sendWebhookNotification(alert: Alert, config: any): Promise<void> {
    const payload = {
      alert: {
        id: alert.id,
        title: alert.title,
        description: alert.description,
        severity: alert.severity,
        component: alert.component,
        status: alert.status,
        createdAt: alert.createdAt,
        labels: alert.labels,
        context: alert.context
      },
      timestamp: new Date().toISOString()
    };

    // Webhook implementation would use actual HTTP client
    this.logger.logAlert(AlertLevel.LOW, `Would send webhook notification for alert: ${alert.title}`, {
      alertId: alert.id,
      url: config.url,
      payload
    });
  }

  private async sendSlackNotification(alert: Alert, config: any): Promise<void> {
    // Slack implementation would go here
    this.logger.logAlert(AlertLevel.LOW, `Would send Slack notification for alert: ${alert.title}`, {
      alertId: alert.id,
      channel: config.channel
    });
  }

  private async sendResolutionNotifications(alert: Alert): Promise<void> {
    // Send resolution notifications to the same channels that received the original alert
    for (const notification of alert.notificationsSent) {
      if (notification.success) {
        const channel = this.notificationChannels.get(notification.channelId);
        if (channel) {
          try {
            await this.sendResolutionToChannel(alert, channel);
          } catch (error) {
            this.logger.logAlert(AlertLevel.LOW, `Failed to send resolution notification`, {
              alertId: alert.id,
              channelId: notification.channelId,
              error: error.message
            });
          }
        }
      }
    }
  }

  private async sendResolutionToChannel(alert: Alert, channel: NotificationChannel): Promise<void> {
    switch (channel.type) {
      case NotificationType.LOG:
        this.logger.logAlert(AlertLevel.LOW, `RESOLVED: ${alert.title}`, {
          alertId: alert.id,
          resolution: alert.resolution,
          duration: alert.resolvedAt ? alert.resolvedAt.getTime() - alert.createdAt.getTime() : 0
        });
        break;

      default:
        // For other notification types, we would send resolution messages
        this.logger.logAlert(AlertLevel.LOW, `Would send resolution notification for alert: ${alert.title}`, {
          alertId: alert.id,
          channelType: channel.type
        });
        break;
    }
  }

  private isAlertSuppressed(alert: Alert): boolean {
    const now = new Date();
    
    for (const suppression of this.suppressions.values()) {
      if (suppression.expiresAt <= now) {
        continue; // Expired suppression
      }

      // Simple pattern matching - in production you'd want more sophisticated matching
      if (alert.title.includes(suppression.pattern) || 
          alert.component.includes(suppression.pattern)) {
        suppression.matchCount++;
        return true;
      }
    }

    return false;
  }

  private filterAlerts(alerts: Alert[], filters?: AlertFilters): Alert[] {
    if (!filters) return alerts;

    return alerts.filter(alert => {
      if (filters.severity && alert.severity !== filters.severity) return false;
      if (filters.component && alert.component !== filters.component) return false;
      if (filters.status && alert.status !== filters.status) return false;
      if (filters.createdAfter && alert.createdAt < filters.createdAfter) return false;
      if (filters.createdBefore && alert.createdAt > filters.createdBefore) return false;
      if (filters.resolvedAfter && (!alert.resolvedAt || alert.resolvedAt < filters.resolvedAfter)) return false;
      if (filters.resolvedBefore && (!alert.resolvedAt || alert.resolvedAt > filters.resolvedBefore)) return false;
      return true;
    }).slice(0, filters.limit || 100);
  }

  private startEscalationProcessor(): void {
    this.escalationInterval = setInterval(() => {
      this.processEscalations();
    }, 60000); // Check every minute
  }

  private processEscalations(): void {
    const now = new Date();
    
    for (const alert of this.alerts.values()) {
      if (alert.status !== AlertStatus.ACTIVE) continue;
      if (!alert.nextEscalationAt || alert.nextEscalationAt > now) continue;

      // Process escalation
      alert.escalationLevel++;
      alert.nextEscalationAt = new Date(now.getTime() + 300000); // Next escalation in 5 minutes

      this.logger.logAlert(AlertLevel.MEDIUM, `Alert escalated: ${alert.title}`, {
        alertId: alert.id,
        escalationLevel: alert.escalationLevel
      });
    }
  }

  private severityToLogLevel(severity: AlertSeverity): AlertLevel {
    switch (severity) {
      case AlertSeverity.CRITICAL: return AlertLevel.CRITICAL;
      case AlertSeverity.HIGH: return AlertLevel.HIGH;
      case AlertSeverity.MEDIUM: return AlertLevel.MEDIUM;
      case AlertSeverity.LOW: return AlertLevel.LOW;
      case AlertSeverity.INFO: return AlertLevel.LOW;
      default: return AlertLevel.LOW;
    }
  }

  private generateAlertId(): string {
    return 'alert_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateSuppressionId(): string {
    return 'suppression_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Cleanup method
  destroy(): void {
    if (this.escalationInterval) {
      clearInterval(this.escalationInterval);
    }
  }
}

// Factory function
export function createAlertingService(logger: AutomationLogger): AlertingService {
  return new AlertingServiceImpl(logger);
}