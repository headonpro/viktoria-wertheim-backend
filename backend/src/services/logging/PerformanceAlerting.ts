/**
 * Performance Alerting System
 * 
 * Provides comprehensive alerting capabilities for performance monitoring
 * with configurable thresholds, notification channels, and escalation rules.
 * 
 * Features:
 * - Configurable performance thresholds
 * - Multiple notification channels
 * - Alert escalation and acknowledgment
 * - Alert suppression and grouping
 * - Historical alert tracking
 */

import { EventEmitter } from 'events';
import { PerformanceAlert, PerformanceAlertEvent, PerformanceStats } from './PerformanceMonitor';

/**
 * Alert notification channel
 */
export interface AlertChannel {
  id: string;
  name: string;
  type: 'email' | 'webhook' | 'slack' | 'console' | 'log';
  config: {
    url?: string;
    email?: string;
    token?: string;
    channel?: string;
    [key: string]: any;
  };
  enabled: boolean;
  severityFilter: Array<'low' | 'medium' | 'high' | 'critical'>;
}

/**
 * Alert notification
 */
export interface AlertNotification {
  id: string;
  alertId: string;
  channelId: string;
  timestamp: Date;
  status: 'pending' | 'sent' | 'failed' | 'acknowledged';
  retryCount: number;
  error?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * Alert escalation rule
 */
export interface AlertEscalationRule {
  id: string;
  alertId: string;
  delay: number; // milliseconds
  targetChannels: string[];
  condition: 'not_acknowledged' | 'still_active' | 'severity_increase';
  enabled: boolean;
}

/**
 * Alert suppression rule
 */
export interface AlertSuppressionRule {
  id: string;
  name: string;
  pattern: {
    hookName?: string;
    contentType?: string;
    condition?: string;
    severity?: string;
  };
  duration: number; // milliseconds
  maxOccurrences: number;
  enabled: boolean;
}

/**
 * Alert group configuration
 */
export interface AlertGroupConfig {
  id: string;
  name: string;
  groupBy: Array<'hookName' | 'contentType' | 'condition' | 'severity'>;
  timeWindow: number; // milliseconds
  maxAlertsInGroup: number;
  enabled: boolean;
}

/**
 * Alert history entry
 */
export interface AlertHistoryEntry {
  id: string;
  alertId: string;
  timestamp: Date;
  action: 'triggered' | 'acknowledged' | 'resolved' | 'escalated' | 'suppressed';
  value: number;
  threshold: number;
  context: any;
  user?: string;
  notes?: string;
}

/**
 * Performance alerting configuration
 */
export interface AlertingConfig {
  enabled: boolean;
  defaultChannels: string[];
  escalationEnabled: boolean;
  suppressionEnabled: boolean;
  groupingEnabled: boolean;
  historyRetentionDays: number;
  maxRetries: number;
  retryDelay: number;
}

/**
 * Default alerting configuration
 */
const DEFAULT_ALERTING_CONFIG: AlertingConfig = {
  enabled: true,
  defaultChannels: ['console'],
  escalationEnabled: true,
  suppressionEnabled: true,
  groupingEnabled: true,
  historyRetentionDays: 30,
  maxRetries: 3,
  retryDelay: 60000 // 1 minute
};

/**
 * Performance alerting system
 */
export class PerformanceAlerting extends EventEmitter {
  private config: AlertingConfig;
  private channels: Map<string, AlertChannel> = new Map();
  private notifications: Map<string, AlertNotification> = new Map();
  private escalationRules: Map<string, AlertEscalationRule> = new Map();
  private suppressionRules: Map<string, AlertSuppressionRule> = new Map();
  private groupConfigs: Map<string, AlertGroupConfig> = new Map();
  private alertHistory: AlertHistoryEntry[] = [];
  private suppressedAlerts: Map<string, { count: number; lastSuppressed: Date }> = new Map();
  private activeAlertGroups: Map<string, { alerts: string[]; firstAlert: Date }> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<AlertingConfig> = {}) {
    super();
    this.config = { ...DEFAULT_ALERTING_CONFIG, ...config };

    // Add default console channel
    this.addChannel({
      id: 'console',
      name: 'Console',
      type: 'console',
      config: {},
      enabled: true,
      severityFilter: ['low', 'medium', 'high', 'critical']
    });

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Add notification channel
   */
  addChannel(channel: AlertChannel): void {
    this.channels.set(channel.id, channel);
  }

  /**
   * Remove notification channel
   */
  removeChannel(channelId: string): boolean {
    return this.channels.delete(channelId);
  }

  /**
   * Get all channels
   */
  getChannels(): AlertChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Add escalation rule
   */
  addEscalationRule(rule: AlertEscalationRule): void {
    this.escalationRules.set(rule.id, rule);
  }

  /**
   * Remove escalation rule
   */
  removeEscalationRule(ruleId: string): boolean {
    return this.escalationRules.delete(ruleId);
  }

  /**
   * Add suppression rule
   */
  addSuppressionRule(rule: AlertSuppressionRule): void {
    this.suppressionRules.set(rule.id, rule);
  }

  /**
   * Remove suppression rule
   */
  removeSuppressionRule(ruleId: string): boolean {
    return this.suppressionRules.delete(ruleId);
  }

  /**
   * Add alert group configuration
   */
  addGroupConfig(config: AlertGroupConfig): void {
    this.groupConfigs.set(config.id, config);
  }

  /**
   * Remove alert group configuration
   */
  removeGroupConfig(configId: string): boolean {
    return this.groupConfigs.delete(configId);
  }

  /**
   * Process performance alert
   */
  async processAlert(alertEvent: PerformanceAlertEvent): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const alertId = alertEvent.alert.id;

    // Check if alert should be suppressed
    if (this.config.suppressionEnabled && this.shouldSuppressAlert(alertEvent)) {
      this.recordAlertHistory(alertId, 'suppressed', alertEvent.value, alertEvent.threshold, alertEvent.context);
      return;
    }

    // Check if alert should be grouped
    if (this.config.groupingEnabled) {
      const groupKey = this.getAlertGroupKey(alertEvent);
      if (groupKey && this.shouldGroupAlert(groupKey, alertId)) {
        this.addToAlertGroup(groupKey, alertId);
        return;
      }
    }

    // Process individual alert
    await this.processIndividualAlert(alertEvent);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, user: string, notes?: string): Promise<boolean> {
    // Cancel escalation timer
    const escalationTimer = this.escalationTimers.get(alertId);
    if (escalationTimer) {
      clearTimeout(escalationTimer);
      this.escalationTimers.delete(alertId);
    }

    // Update notifications
    const notifications = Array.from(this.notifications.values())
      .filter(n => n.alertId === alertId && n.status !== 'acknowledged');

    for (const notification of notifications) {
      notification.status = 'acknowledged';
      notification.acknowledgedBy = user;
      notification.acknowledgedAt = new Date();
    }

    // Record in history
    this.recordAlertHistory(alertId, 'acknowledged', 0, 0, {}, user, notes);

    this.emit('alert_acknowledged', { alertId, user, notes });
    return true;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string, user?: string, notes?: string): Promise<boolean> {
    // Cancel escalation timer
    const escalationTimer = this.escalationTimers.get(alertId);
    if (escalationTimer) {
      clearTimeout(escalationTimer);
      this.escalationTimers.delete(alertId);
    }

    // Record in history
    this.recordAlertHistory(alertId, 'resolved', 0, 0, {}, user, notes);

    this.emit('alert_resolved', { alertId, user, notes });
    return true;
  }

  /**
   * Get alert notifications
   */
  getNotifications(alertId?: string): AlertNotification[] {
    const notifications = Array.from(this.notifications.values());
    return alertId ? notifications.filter(n => n.alertId === alertId) : notifications;
  }

  /**
   * Get alert history
   */
  getAlertHistory(alertId?: string, limit: number = 100): AlertHistoryEntry[] {
    let history = this.alertHistory;
    
    if (alertId) {
      history = history.filter(h => h.alertId === alertId);
    }

    return history.slice(-limit);
  }

  /**
   * Get alerting statistics
   */
  getStats(): {
    totalAlerts: number;
    alertsByStatus: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    averageResponseTime: number;
    suppressedAlerts: number;
    groupedAlerts: number;
    channelStats: Array<{ channelId: string; sent: number; failed: number }>;
  } {
    const notifications = Array.from(this.notifications.values());
    const history = this.alertHistory;

    const alertsByStatus = notifications.reduce((acc, n) => {
      acc[n.status] = (acc[n.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const suppressedCount = Array.from(this.suppressedAlerts.values())
      .reduce((sum, s) => sum + s.count, 0);

    const groupedCount = Array.from(this.activeAlertGroups.values())
      .reduce((sum, g) => sum + g.alerts.length, 0);

    const channelStats = Array.from(this.channels.keys()).map(channelId => {
      const channelNotifications = notifications.filter(n => n.channelId === channelId);
      return {
        channelId,
        sent: channelNotifications.filter(n => n.status === 'sent').length,
        failed: channelNotifications.filter(n => n.status === 'failed').length
      };
    });

    // Calculate average response time (time from trigger to acknowledgment)
    const acknowledgedAlerts = history.filter(h => h.action === 'acknowledged');
    const triggeredAlerts = history.filter(h => h.action === 'triggered');
    let totalResponseTime = 0;
    let responseCount = 0;

    for (const ack of acknowledgedAlerts) {
      const trigger = triggeredAlerts.find(t => t.alertId === ack.alertId && t.timestamp <= ack.timestamp);
      if (trigger) {
        totalResponseTime += ack.timestamp.getTime() - trigger.timestamp.getTime();
        responseCount++;
      }
    }

    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    return {
      totalAlerts: history.filter(h => h.action === 'triggered').length,
      alertsByStatus,
      alertsBySeverity: {}, // Would need to track severity in notifications
      averageResponseTime,
      suppressedAlerts: suppressedCount,
      groupedAlerts: groupedCount,
      channelStats
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AlertingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Process individual alert
   */
  private async processIndividualAlert(alertEvent: PerformanceAlertEvent): Promise<void> {
    const alertId = alertEvent.alert.id;

    // Record in history
    this.recordAlertHistory(
      alertId,
      'triggered',
      alertEvent.value,
      alertEvent.threshold,
      alertEvent.context
    );

    // Determine target channels
    const targetChannels = this.getTargetChannels(alertEvent.alert);

    // Send notifications
    for (const channelId of targetChannels) {
      await this.sendNotification(alertEvent, channelId);
    }

    // Set up escalation if enabled
    if (this.config.escalationEnabled) {
      this.setupEscalation(alertEvent);
    }

    this.emit('alert_processed', alertEvent);
  }

  /**
   * Check if alert should be suppressed
   */
  private shouldSuppressAlert(alertEvent: PerformanceAlertEvent): boolean {
    for (const rule of this.suppressionRules.values()) {
      if (!rule.enabled) continue;

      if (this.matchesSuppressionPattern(alertEvent, rule.pattern)) {
        const key = this.getSuppressionKey(alertEvent, rule);
        const suppressed = this.suppressedAlerts.get(key);

        if (!suppressed) {
          this.suppressedAlerts.set(key, { count: 1, lastSuppressed: new Date() });
          return false; // First occurrence, don't suppress
        }

        const timeSinceLastSuppressed = Date.now() - suppressed.lastSuppressed.getTime();
        if (timeSinceLastSuppressed > rule.duration) {
          // Reset suppression
          this.suppressedAlerts.set(key, { count: 1, lastSuppressed: new Date() });
          return false;
        }

        if (suppressed.count >= rule.maxOccurrences) {
          suppressed.count++;
          suppressed.lastSuppressed = new Date();
          return true; // Suppress
        }

        suppressed.count++;
        suppressed.lastSuppressed = new Date();
        return false;
      }
    }

    return false;
  }

  /**
   * Check if alert matches suppression pattern
   */
  private matchesSuppressionPattern(
    alertEvent: PerformanceAlertEvent,
    pattern: AlertSuppressionRule['pattern']
  ): boolean {
    if (pattern.hookName && alertEvent.context.hookName !== pattern.hookName) {
      return false;
    }
    if (pattern.contentType && alertEvent.context.contentType !== pattern.contentType) {
      return false;
    }
    if (pattern.condition && alertEvent.alert.condition !== pattern.condition) {
      return false;
    }
    if (pattern.severity && alertEvent.alert.severity !== pattern.severity) {
      return false;
    }
    return true;
  }

  /**
   * Get suppression key
   */
  private getSuppressionKey(alertEvent: PerformanceAlertEvent, rule: AlertSuppressionRule): string {
    const parts = [rule.id];
    if (rule.pattern.hookName) parts.push(alertEvent.context.hookName || '');
    if (rule.pattern.contentType) parts.push(alertEvent.context.contentType || '');
    if (rule.pattern.condition) parts.push(alertEvent.alert.condition);
    if (rule.pattern.severity) parts.push(alertEvent.alert.severity);
    return parts.join(':');
  }

  /**
   * Get alert group key
   */
  private getAlertGroupKey(alertEvent: PerformanceAlertEvent): string | null {
    for (const config of this.groupConfigs.values()) {
      if (!config.enabled) continue;

      const keyParts: string[] = [];
      for (const groupBy of config.groupBy) {
        switch (groupBy) {
          case 'hookName':
            keyParts.push(alertEvent.context.hookName || '');
            break;
          case 'contentType':
            keyParts.push(alertEvent.context.contentType || '');
            break;
          case 'condition':
            keyParts.push(alertEvent.alert.condition);
            break;
          case 'severity':
            keyParts.push(alertEvent.alert.severity);
            break;
        }
      }
      return `${config.id}:${keyParts.join(':')}`;
    }
    return null;
  }

  /**
   * Check if alert should be grouped
   */
  private shouldGroupAlert(groupKey: string, alertId: string): boolean {
    const group = this.activeAlertGroups.get(groupKey);
    if (!group) {
      return false;
    }

    const config = Array.from(this.groupConfigs.values())
      .find(c => groupKey.startsWith(c.id + ':'));
    
    if (!config) {
      return false;
    }

    const timeSinceFirstAlert = Date.now() - group.firstAlert.getTime();
    if (timeSinceFirstAlert > config.timeWindow) {
      // Time window expired, start new group
      this.activeAlertGroups.delete(groupKey);
      return false;
    }

    return group.alerts.length < config.maxAlertsInGroup;
  }

  /**
   * Add alert to group
   */
  private addToAlertGroup(groupKey: string, alertId: string): void {
    let group = this.activeAlertGroups.get(groupKey);
    if (!group) {
      group = { alerts: [], firstAlert: new Date() };
      this.activeAlertGroups.set(groupKey, group);
    }
    group.alerts.push(alertId);
  }

  /**
   * Get target channels for alert
   */
  private getTargetChannels(alert: PerformanceAlert): string[] {
    const channels = Array.from(this.channels.values())
      .filter(c => c.enabled && c.severityFilter.includes(alert.severity))
      .map(c => c.id);

    return channels.length > 0 ? channels : this.config.defaultChannels;
  }

  /**
   * Send notification to channel
   */
  private async sendNotification(alertEvent: PerformanceAlertEvent, channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }

    const notificationId = `${alertEvent.alert.id}-${channelId}-${Date.now()}`;
    const notification: AlertNotification = {
      id: notificationId,
      alertId: alertEvent.alert.id,
      channelId,
      timestamp: new Date(),
      status: 'pending',
      retryCount: 0
    };

    this.notifications.set(notificationId, notification);

    try {
      await this.sendToChannel(channel, alertEvent);
      notification.status = 'sent';
    } catch (error) {
      notification.status = 'failed';
      notification.error = error instanceof Error ? error.message : String(error);
      
      // Schedule retry if within retry limit
      if (notification.retryCount < this.config.maxRetries) {
        this.scheduleRetry(notification, alertEvent);
      }
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(channel: AlertChannel, alertEvent: PerformanceAlertEvent): Promise<void> {
    switch (channel.type) {
      case 'console':
        this.sendToConsole(alertEvent);
        break;
      case 'log':
        this.sendToLog(alertEvent);
        break;
      case 'webhook':
        await this.sendToWebhook(channel, alertEvent);
        break;
      case 'email':
        await this.sendToEmail(channel, alertEvent);
        break;
      case 'slack':
        await this.sendToSlack(channel, alertEvent);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  /**
   * Send alert to console
   */
  private sendToConsole(alertEvent: PerformanceAlertEvent): void {
    const alert = alertEvent.alert;
    const message = `🚨 PERFORMANCE ALERT [${alert.severity.toUpperCase()}]: ${alert.name}
Hook: ${alertEvent.context.hookName || 'Unknown'}
Content Type: ${alertEvent.context.contentType || 'Unknown'}
Condition: ${alert.condition}
Value: ${alertEvent.value}
Threshold: ${alert.threshold}
Time: ${alertEvent.timestamp.toISOString()}`;

    console.error(message);
  }

  /**
   * Send alert to log
   */
  private sendToLog(alertEvent: PerformanceAlertEvent): void {
    // This would integrate with the structured logger
    console.log('PERFORMANCE_ALERT', {
      alert: alertEvent.alert,
      value: alertEvent.value,
      threshold: alertEvent.threshold,
      context: alertEvent.context,
      timestamp: alertEvent.timestamp
    });
  }

  /**
   * Send alert to webhook
   */
  private async sendToWebhook(channel: AlertChannel, alertEvent: PerformanceAlertEvent): Promise<void> {
    if (!channel.config.url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      alert: alertEvent.alert,
      value: alertEvent.value,
      threshold: alertEvent.threshold,
      context: alertEvent.context,
      timestamp: alertEvent.timestamp
    };

    // This would use a HTTP client like axios
    // For now, just simulate the call
    console.log(`Webhook notification sent to ${channel.config.url}`, payload);
  }

  /**
   * Send alert to email
   */
  private async sendToEmail(channel: AlertChannel, alertEvent: PerformanceAlertEvent): Promise<void> {
    if (!channel.config.email) {
      throw new Error('Email address not configured');
    }

    // This would integrate with an email service
    console.log(`Email notification sent to ${channel.config.email}`, alertEvent);
  }

  /**
   * Send alert to Slack
   */
  private async sendToSlack(channel: AlertChannel, alertEvent: PerformanceAlertEvent): Promise<void> {
    if (!channel.config.url || !channel.config.channel) {
      throw new Error('Slack webhook URL or channel not configured');
    }

    // This would use Slack webhook API
    console.log(`Slack notification sent to ${channel.config.channel}`, alertEvent);
  }

  /**
   * Schedule notification retry
   */
  private scheduleRetry(notification: AlertNotification, alertEvent: PerformanceAlertEvent): void {
    const timer = setTimeout(async () => {
      notification.retryCount++;
      const channel = this.channels.get(notification.channelId);
      if (channel) {
        try {
          await this.sendToChannel(channel, alertEvent);
          notification.status = 'sent';
        } catch (error) {
          notification.status = 'failed';
          notification.error = error instanceof Error ? error.message : String(error);
          
          if (notification.retryCount < this.config.maxRetries) {
            this.scheduleRetry(notification, alertEvent);
          }
        }
      }
      this.retryTimers.delete(notification.id);
    }, this.config.retryDelay);

    this.retryTimers.set(notification.id, timer);
  }

  /**
   * Setup alert escalation
   */
  private setupEscalation(alertEvent: PerformanceAlertEvent): void {
    const escalationRules = Array.from(this.escalationRules.values())
      .filter(r => r.enabled && r.alertId === alertEvent.alert.id);

    for (const rule of escalationRules) {
      const timer = setTimeout(() => {
        this.escalateAlert(alertEvent, rule);
        this.escalationTimers.delete(alertEvent.alert.id);
      }, rule.delay);

      this.escalationTimers.set(alertEvent.alert.id, timer);
    }
  }

  /**
   * Escalate alert
   */
  private async escalateAlert(alertEvent: PerformanceAlertEvent, rule: AlertEscalationRule): Promise<void> {
    // Check escalation condition
    if (!this.shouldEscalate(alertEvent, rule)) {
      return;
    }

    // Send to escalation channels
    for (const channelId of rule.targetChannels) {
      await this.sendNotification(alertEvent, channelId);
    }

    // Record escalation
    this.recordAlertHistory(
      alertEvent.alert.id,
      'escalated',
      alertEvent.value,
      alertEvent.threshold,
      { rule: rule.id, ...alertEvent.context }
    );

    this.emit('alert_escalated', { alertEvent, rule });
  }

  /**
   * Check if alert should be escalated
   */
  private shouldEscalate(alertEvent: PerformanceAlertEvent, rule: AlertEscalationRule): boolean {
    switch (rule.condition) {
      case 'not_acknowledged':
        return !this.isAlertAcknowledged(alertEvent.alert.id);
      case 'still_active':
        // Would need to check if the condition is still true
        return true;
      case 'severity_increase':
        // Would need to track severity changes
        return false;
      default:
        return false;
    }
  }

  /**
   * Check if alert is acknowledged
   */
  private isAlertAcknowledged(alertId: string): boolean {
    return Array.from(this.notifications.values())
      .some(n => n.alertId === alertId && n.status === 'acknowledged');
  }

  /**
   * Record alert history entry
   */
  private recordAlertHistory(
    alertId: string,
    action: AlertHistoryEntry['action'],
    value: number,
    threshold: number,
    context: any,
    user?: string,
    notes?: string
  ): void {
    const entry: AlertHistoryEntry = {
      id: `${alertId}-${action}-${Date.now()}`,
      alertId,
      timestamp: new Date(),
      action,
      value,
      threshold,
      context,
      user,
      notes
    };

    this.alertHistory.push(entry);
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (this.config.historyRetentionDays * 24 * 60 * 60 * 1000);

    // Clean up old history
    this.alertHistory = this.alertHistory.filter(h => h.timestamp.getTime() > cutoffTime);

    // Clean up old notifications
    const oldNotifications = Array.from(this.notifications.entries())
      .filter(([_, n]) => n.timestamp.getTime() < cutoffTime);
    
    for (const [id] of oldNotifications) {
      this.notifications.delete(id);
    }

    // Clean up expired alert groups
    for (const [key, group] of this.activeAlertGroups.entries()) {
      const config = Array.from(this.groupConfigs.values())
        .find(c => key.startsWith(c.id + ':'));
      
      if (config) {
        const timeSinceFirstAlert = Date.now() - group.firstAlert.getTime();
        if (timeSinceFirstAlert > config.timeWindow) {
          this.activeAlertGroups.delete(key);
        }
      }
    }
  }
}

export default PerformanceAlerting;