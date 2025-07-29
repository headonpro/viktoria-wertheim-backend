/**
 * Club Alerting System
 * 
 * Handles alerts for club-specific metrics and system health issues.
 * Provides configurable alerting with multiple notification channels.
 */

interface Alert {
  id: string;
  metric: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  currentValue: number;
  thresholdValue: number;
  operator: string;
  unit: string;
  timestamp: Date;
  status: 'active' | 'resolved' | 'acknowledged';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  notificationsSent: string[];
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  enabled: boolean;
  cooldownMinutes: number;
  notificationChannels: string[];
  conditions?: {
    timeWindow?: number; // minutes
    consecutiveFailures?: number;
  };
}

interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'webhook' | 'log' | 'console';
  config: any;
  enabled: boolean;
}

interface AlertSummary {
  active: {
    critical: number;
    warning: number;
    info: number;
  };
  resolved: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  topAlerts: Array<{
    name: string;
    count: number;
    lastOccurrence: Date;
  }>;
}

export class ClubAlertingSystem {
  private strapi: any;
  private alerts: Map<string, Alert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private consecutiveFailures: Map<string, number> = new Map();

  constructor(strapi: any) {
    this.strapi = strapi;
    this.initializeDefaultRules();
    this.initializeNotificationChannels();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'club-validation-errors-warning',
        name: 'Club Validation Errors Warning',
        metric: 'club_validation_errors',
        operator: 'gt',
        value: 10,
        severity: 'warning',
        description: 'High number of club validation errors detected',
        enabled: true,
        cooldownMinutes: 15,
        notificationChannels: ['log', 'console'],
        conditions: {
          timeWindow: 5,
          consecutiveFailures: 2
        }
      },
      {
        id: 'club-validation-errors-critical',
        name: 'Club Validation Errors Critical',
        metric: 'club_validation_errors',
        operator: 'gt',
        value: 50,
        severity: 'critical',
        description: 'Critical number of club validation errors detected',
        enabled: true,
        cooldownMinutes: 5,
        notificationChannels: ['log', 'console', 'webhook'],
        conditions: {
          consecutiveFailures: 1
        }
      },
      {
        id: 'club-cache-hit-rate-warning',
        name: 'Low Club Cache Hit Rate',
        metric: 'club_cache_hit_rate',
        operator: 'lt',
        value: 60,
        severity: 'warning',
        description: 'Club cache hit rate is below optimal threshold',
        enabled: true,
        cooldownMinutes: 30,
        notificationChannels: ['log'],
        conditions: {
          timeWindow: 10,
          consecutiveFailures: 3
        }
      },
      {
        id: 'club-cache-hit-rate-critical',
        name: 'Critical Club Cache Hit Rate',
        metric: 'club_cache_hit_rate',
        operator: 'lt',
        value: 40,
        severity: 'critical',
        description: 'Club cache hit rate is critically low',
        enabled: true,
        cooldownMinutes: 10,
        notificationChannels: ['log', 'console', 'webhook']
      },
      {
        id: 'club-query-response-time-warning',
        name: 'Slow Club Query Response',
        metric: 'club_query_response_time',
        operator: 'gt',
        value: 1000,
        severity: 'warning',
        description: 'Club queries are responding slowly',
        enabled: true,
        cooldownMinutes: 20,
        notificationChannels: ['log'],
        conditions: {
          timeWindow: 5,
          consecutiveFailures: 3
        }
      },
      {
        id: 'club-query-response-time-critical',
        name: 'Critical Club Query Response Time',
        metric: 'club_query_response_time',
        operator: 'gt',
        value: 5000,
        severity: 'critical',
        description: 'Club queries are critically slow',
        enabled: true,
        cooldownMinutes: 5,
        notificationChannels: ['log', 'console', 'webhook']
      },
      {
        id: 'club-table-calculation-slow',
        name: 'Slow Club Table Calculation',
        metric: 'club_table_calculation_duration',
        operator: 'gt',
        value: 10000,
        severity: 'warning',
        description: 'Club table calculations are taking too long',
        enabled: true,
        cooldownMinutes: 30,
        notificationChannels: ['log']
      },
      {
        id: 'club-table-calculation-critical',
        name: 'Critical Club Table Calculation Duration',
        metric: 'club_table_calculation_duration',
        operator: 'gt',
        value: 30000,
        severity: 'critical',
        description: 'Club table calculations are critically slow',
        enabled: true,
        cooldownMinutes: 10,
        notificationChannels: ['log', 'console', 'webhook']
      },
      {
        id: 'no-active-clubs',
        name: 'No Active Clubs',
        metric: 'active_clubs_count',
        operator: 'lt',
        value: 1,
        severity: 'critical',
        description: 'No active clubs found in the system',
        enabled: true,
        cooldownMinutes: 5,
        notificationChannels: ['log', 'console', 'webhook']
      },
      {
        id: 'low-club-count',
        name: 'Low Club Count',
        metric: 'active_clubs_count',
        operator: 'lt',
        value: 10,
        severity: 'warning',
        description: 'Low number of active clubs in the system',
        enabled: true,
        cooldownMinutes: 60,
        notificationChannels: ['log']
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * Initialize notification channels
   */
  private initializeNotificationChannels(): void {
    const channels: NotificationChannel[] = [
      {
        id: 'log',
        name: 'System Log',
        type: 'log',
        config: {},
        enabled: true
      },
      {
        id: 'console',
        name: 'Console Output',
        type: 'console',
        config: {},
        enabled: true
      },
      {
        id: 'webhook',
        name: 'Webhook Notifications',
        type: 'webhook',
        config: {
          url: process.env.ALERT_WEBHOOK_URL || '',
          timeout: 5000,
          retries: 3
        },
        enabled: !!process.env.ALERT_WEBHOOK_URL
      },
      {
        id: 'email',
        name: 'Email Notifications',
        type: 'email',
        config: {
          to: process.env.ALERT_EMAIL_TO || '',
          from: process.env.ALERT_EMAIL_FROM || 'alerts@viktoria-wertheim.de',
          subject: 'Club System Alert'
        },
        enabled: !!process.env.ALERT_EMAIL_TO
      }
    ];

    channels.forEach(channel => {
      this.notificationChannels.set(channel.id, channel);
    });
  }

  /**
   * Process a metric value and check for alerts
   */
  async processMetric(metricName: string, value: number, tags: Record<string, string> = {}): Promise<void> {
    const relevantRules = Array.from(this.alertRules.values())
      .filter(rule => rule.enabled && rule.metric === metricName);

    for (const rule of relevantRules) {
      await this.evaluateRule(rule, value, tags);
    }
  }

  /**
   * Evaluate a single alert rule
   */
  private async evaluateRule(rule: AlertRule, value: number, tags: Record<string, string>): Promise<void> {
    const shouldAlert = this.evaluateCondition(value, rule);
    const ruleKey = `${rule.id}_${JSON.stringify(tags)}`;

    if (shouldAlert) {
      // Check consecutive failures if required
      if (rule.conditions?.consecutiveFailures) {
        const failures = (this.consecutiveFailures.get(ruleKey) || 0) + 1;
        this.consecutiveFailures.set(ruleKey, failures);

        if (failures < rule.conditions.consecutiveFailures) {
          return; // Not enough consecutive failures yet
        }
      }

      // Check cooldown
      const lastAlert = this.alertCooldowns.get(ruleKey);
      if (lastAlert) {
        const cooldownEnd = new Date(lastAlert.getTime() + rule.cooldownMinutes * 60 * 1000);
        if (new Date() < cooldownEnd) {
          return; // Still in cooldown period
        }
      }

      await this.triggerAlert(rule, value, tags);
      this.alertCooldowns.set(ruleKey, new Date());
    } else {
      // Reset consecutive failures on success
      this.consecutiveFailures.delete(ruleKey);
      
      // Auto-resolve any active alerts for this rule
      await this.autoResolveAlerts(rule.id, tags);
    }
  }

  /**
   * Evaluate if a condition should trigger an alert
   */
  private evaluateCondition(value: number, rule: AlertRule): boolean {
    switch (rule.operator) {
      case 'gt': return value > rule.value;
      case 'lt': return value < rule.value;
      case 'eq': return value === rule.value;
      case 'gte': return value >= rule.value;
      case 'lte': return value <= rule.value;
      default: return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: AlertRule, currentValue: number, tags: Record<string, string>): Promise<void> {
    const alertId = `${rule.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: Alert = {
      id: alertId,
      metric: rule.metric,
      severity: rule.severity,
      title: rule.name,
      description: rule.description,
      currentValue,
      thresholdValue: rule.value,
      operator: rule.operator,
      unit: this.getMetricUnit(rule.metric),
      timestamp: new Date(),
      status: 'active',
      notificationsSent: []
    };

    this.alerts.set(alertId, alert);

    this.strapi.log[rule.severity === 'critical' ? 'error' : 'warn'](
      `Club Alert [${rule.severity.toUpperCase()}]: ${rule.name}`,
      {
        metric: rule.metric,
        currentValue,
        thresholdValue: rule.value,
        tags
      }
    );

    // Send notifications
    await this.sendNotifications(alert, rule.notificationChannels);

    // Emit event
    this.strapi.eventHub?.emit('club.alert.triggered', {
      alert,
      rule,
      tags
    });
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: Alert, channelIds: string[]): Promise<void> {
    for (const channelId of channelIds) {
      const channel = this.notificationChannels.get(channelId);
      if (!channel || !channel.enabled) {
        continue;
      }

      try {
        await this.sendNotification(alert, channel);
        alert.notificationsSent.push(channelId);
      } catch (error) {
        this.strapi.log.error(`Failed to send notification via ${channelId}:`, error);
      }
    }
  }

  /**
   * Send a single notification
   */
  private async sendNotification(alert: Alert, channel: NotificationChannel): Promise<void> {
    const message = this.formatAlertMessage(alert);

    switch (channel.type) {
      case 'log':
        this.strapi.log[alert.severity === 'critical' ? 'error' : 'warn'](message);
        break;

      case 'console':
        console[alert.severity === 'critical' ? 'error' : 'warn'](`[CLUB ALERT] ${message}`);
        break;

      case 'webhook':
        if (channel.config.url) {
          await this.sendWebhookNotification(alert, channel.config);
        }
        break;

      case 'email':
        if (channel.config.to) {
          await this.sendEmailNotification(alert, channel.config);
        }
        break;

      default:
        this.strapi.log.warn(`Unknown notification channel type: ${channel.type}`);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: Alert, config: any): Promise<void> {
    const payload = {
      alert: {
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        metric: alert.metric,
        currentValue: alert.currentValue,
        thresholdValue: alert.thresholdValue,
        unit: alert.unit,
        timestamp: alert.timestamp.toISOString()
      },
      system: 'viktoria-club-system'
    };

    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Viktoria-Club-Alerting/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.timeout || 5000)
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: Alert, config: any): Promise<void> {
    // This would integrate with your email service
    // For now, just log the email that would be sent
    const emailContent = {
      to: config.to,
      from: config.from,
      subject: `${config.subject} - ${alert.severity.toUpperCase()}`,
      text: this.formatAlertMessage(alert),
      html: this.formatAlertMessageHtml(alert)
    };

    this.strapi.log.info('Email notification would be sent:', emailContent);
    
    // TODO: Integrate with actual email service (SendGrid, Nodemailer, etc.)
  }

  /**
   * Format alert message for text output
   */
  private formatAlertMessage(alert: Alert): string {
    return `${alert.title}: ${alert.description}. ` +
           `Current value: ${alert.currentValue}${alert.unit}, ` +
           `Threshold: ${alert.operator} ${alert.thresholdValue}${alert.unit}. ` +
           `Time: ${alert.timestamp.toISOString()}`;
  }

  /**
   * Format alert message for HTML output
   */
  private formatAlertMessageHtml(alert: Alert): string {
    const severityColor = {
      critical: '#dc2626',
      warning: '#d97706',
      info: '#2563eb'
    }[alert.severity];

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: ${severityColor};">${alert.title}</h2>
        <p><strong>Severity:</strong> <span style="color: ${severityColor};">${alert.severity.toUpperCase()}</span></p>
        <p><strong>Description:</strong> ${alert.description}</p>
        <p><strong>Metric:</strong> ${alert.metric}</p>
        <p><strong>Current Value:</strong> ${alert.currentValue}${alert.unit}</p>
        <p><strong>Threshold:</strong> ${alert.operator} ${alert.thresholdValue}${alert.unit}</p>
        <p><strong>Time:</strong> ${alert.timestamp.toLocaleString()}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">
          This alert was generated by the Viktoria Wertheim Club System monitoring.
        </p>
      </div>
    `;
  }

  /**
   * Auto-resolve alerts when conditions are no longer met
   */
  private async autoResolveAlerts(ruleId: string, tags: Record<string, string>): Promise<void> {
    const activeAlerts = Array.from(this.alerts.values())
      .filter(alert => alert.status === 'active' && alert.id.startsWith(ruleId));

    for (const alert of activeAlerts) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      
      this.strapi.log.info(`Auto-resolved alert: ${alert.title}`);
      
      this.strapi.eventHub?.emit('club.alert.resolved', {
        alert,
        resolvedBy: 'system',
        tags
      });
    }
  }

  /**
   * Manually acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status !== 'active') {
      return false;
    }

    alert.status = 'acknowledged';
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.strapi.log.info(`Alert acknowledged: ${alert.title} by ${acknowledgedBy}`);
    
    this.strapi.eventHub?.emit('club.alert.acknowledged', {
      alert,
      acknowledgedBy
    });

    return true;
  }

  /**
   * Manually resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.status === 'resolved') {
      return false;
    }

    alert.status = 'resolved';
    alert.resolvedAt = new Date();

    this.strapi.log.info(`Alert resolved: ${alert.title} by ${resolvedBy}`);
    
    this.strapi.eventHub?.emit('club.alert.resolved', {
      alert,
      resolvedBy
    });

    return true;
  }

  /**
   * Get alert summary for dashboard
   */
  async getAlertSummary(): Promise<AlertSummary> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const allAlerts = Array.from(this.alerts.values());

    // Active alerts by severity
    const activeAlerts = allAlerts.filter(alert => alert.status === 'active');
    const active = {
      critical: activeAlerts.filter(alert => alert.severity === 'critical').length,
      warning: activeAlerts.filter(alert => alert.severity === 'warning').length,
      info: activeAlerts.filter(alert => alert.severity === 'info').length
    };

    // Resolved alerts by time period
    const resolvedAlerts = allAlerts.filter(alert => alert.status === 'resolved' && alert.resolvedAt);
    const resolved = {
      today: resolvedAlerts.filter(alert => alert.resolvedAt! >= oneDayAgo).length,
      thisWeek: resolvedAlerts.filter(alert => alert.resolvedAt! >= oneWeekAgo).length,
      thisMonth: resolvedAlerts.filter(alert => alert.resolvedAt! >= oneMonthAgo).length
    };

    // Top alerts by frequency
    const alertCounts = new Map<string, number>();
    allAlerts.forEach(alert => {
      const key = alert.title;
      alertCounts.set(key, (alertCounts.get(key) || 0) + 1);
    });

    const topAlerts = Array.from(alertCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => {
        const lastAlert = allAlerts
          .filter(alert => alert.title === name)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
        
        return {
          name,
          count,
          lastOccurrence: lastAlert.timestamp
        };
      });

    return {
      active,
      resolved,
      topAlerts
    };
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.status === 'active')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  /**
   * Get metric unit for display
   */
  private getMetricUnit(metricName: string): string {
    const unitMap: Record<string, string> = {
      'club_validation_errors': ' errors',
      'club_cache_hit_rate': '%',
      'club_cache_miss_rate': '%',
      'club_query_response_time': 'ms',
      'club_table_calculation_duration': 'ms',
      'active_clubs_count': ' clubs',
      'viktoria_clubs_count': ' clubs',
      'opponent_clubs_count': ' clubs',
      'club_based_games_count': ' games',
      'club_creation_rate': '/min',
      'club_update_rate': '/min'
    };

    return unitMap[metricName] || '';
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.strapi.log.info(`Added alert rule: ${rule.name}`);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    if (removed) {
      this.strapi.log.info(`Removed alert rule: ${ruleId}`);
    }
    return removed;
  }

  /**
   * Update alert rule
   */
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      return false;
    }

    Object.assign(rule, updates);
    this.strapi.log.info(`Updated alert rule: ${ruleId}`);
    return true;
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Clean up old alerts
   */
  cleanupOldAlerts(olderThanDays: number = 30): void {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialSize = this.alerts.size;
    
    for (const [id, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoff && alert.status === 'resolved') {
        this.alerts.delete(id);
      }
    }

    const cleaned = initialSize - this.alerts.size;
    if (cleaned > 0) {
      this.strapi.log.info(`Cleaned up ${cleaned} old alerts`);
    }
  }
}