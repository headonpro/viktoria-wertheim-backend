/**
 * Performance Alerting System
 * 
 * Handles alerting for performance degradation in club operations,
 * including webhook notifications, email alerts, and escalation.
 */

interface AlertChannel {
  type: 'webhook' | 'email' | 'slack' | 'discord' | 'console';
  config: Record<string, any>;
  enabled: boolean;
}

interface AlertNotification {
  id: string;
  alert: any; // Alert from performance monitor
  channel: AlertChannel;
  status: 'pending' | 'sent' | 'failed' | 'acknowledged';
  attempts: number;
  lastAttempt?: Date;
  sentAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  error?: string;
}

interface EscalationRule {
  name: string;
  condition: {
    severity: string[];
    duration: number; // ms
    unacknowledged: boolean;
  };
  actions: {
    channels: string[];
    message?: string;
  };
  enabled: boolean;
}

export class PerformanceAlertingSystem {
  private strapi: any;
  private channels: Map<string, AlertChannel> = new Map();
  private notifications: AlertNotification[] = [];
  private escalationRules: EscalationRule[] = [];
  private escalationInterval?: NodeJS.Timeout;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.initializeDefaultChannels();
    this.initializeDefaultEscalationRules();
    this.startEscalationMonitoring();
  }

  /**
   * Initialize default alert channels
   */
  private initializeDefaultChannels(): void {
    // Console logging (always available)
    this.channels.set('console', {
      type: 'console',
      config: {},
      enabled: true
    });

    // Webhook channel
    if (process.env.ALERT_WEBHOOK_URL) {
      this.channels.set('webhook', {
        type: 'webhook',
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.ALERT_WEBHOOK_AUTH || ''
          }
        },
        enabled: true
      });
    }

    // Slack channel
    if (process.env.SLACK_WEBHOOK_URL) {
      this.channels.set('slack', {
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_CHANNEL || '#alerts',
          username: process.env.SLACK_USERNAME || 'Viktoria Performance Bot'
        },
        enabled: true
      });
    }

    // Discord channel
    if (process.env.DISCORD_WEBHOOK_URL) {
      this.channels.set('discord', {
        type: 'discord',
        config: {
          webhookUrl: process.env.DISCORD_WEBHOOK_URL,
          username: process.env.DISCORD_USERNAME || 'Viktoria Performance Bot'
        },
        enabled: true
      });
    }

    // Email channel (requires SMTP configuration)
    if (process.env.SMTP_HOST) {
      this.channels.set('email', {
        type: 'email',
        config: {
          smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          },
          from: process.env.ALERT_EMAIL_FROM || 'alerts@viktoria-wertheim.de',
          to: process.env.ALERT_EMAIL_TO?.split(',') || []
        },
        enabled: process.env.ALERT_EMAIL_ENABLED !== 'false'
      });
    }
  }

  /**
   * Initialize default escalation rules
   */
  private initializeDefaultEscalationRules(): void {
    this.escalationRules = [
      {
        name: 'Critical Alert Immediate',
        condition: {
          severity: ['critical'],
          duration: 0, // Immediate
          unacknowledged: false
        },
        actions: {
          channels: ['console', 'slack', 'discord', 'webhook'],
          message: '🚨 CRITICAL: Immediate attention required'
        },
        enabled: true
      },
      {
        name: 'Critical Alert Escalation',
        condition: {
          severity: ['critical'],
          duration: 300000, // 5 minutes
          unacknowledged: true
        },
        actions: {
          channels: ['email'],
          message: '🚨 ESCALATION: Critical alert unacknowledged for 5 minutes'
        },
        enabled: true
      },
      {
        name: 'Warning Alert Standard',
        condition: {
          severity: ['warning'],
          duration: 60000, // 1 minute
          unacknowledged: false
        },
        actions: {
          channels: ['console', 'slack'],
          message: '⚠️ WARNING: Performance issue detected'
        },
        enabled: true
      },
      {
        name: 'Warning Alert Escalation',
        condition: {
          severity: ['warning'],
          duration: 900000, // 15 minutes
          unacknowledged: true
        },
        actions: {
          channels: ['webhook'],
          message: '⚠️ ESCALATION: Warning alert unacknowledged for 15 minutes'
        },
        enabled: true
      }
    ];
  }

  /**
   * Process alert from performance monitor
   */
  async processAlert(alert: any): Promise<void> {
    console.log(`📢 Processing alert: ${alert.message}`);

    // Find applicable escalation rules
    const applicableRules = this.escalationRules.filter(rule => 
      rule.enabled && 
      rule.condition.severity.includes(alert.rule.severity) &&
      rule.condition.duration === 0 // Immediate rules
    );

    // Send immediate notifications
    for (const rule of applicableRules) {
      await this.executeEscalationRule(rule, alert);
    }
  }

  /**
   * Execute escalation rule
   */
  private async executeEscalationRule(rule: EscalationRule, alert: any): Promise<void> {
    console.log(`🔔 Executing escalation rule: ${rule.name}`);

    for (const channelName of rule.actions.channels) {
      const channel = this.channels.get(channelName);
      if (channel && channel.enabled) {
        await this.sendNotification(alert, channel, rule.actions.message);
      }
    }
  }

  /**
   * Send notification to specific channel
   */
  private async sendNotification(alert: any, channel: AlertChannel, customMessage?: string): Promise<void> {
    const notification: AlertNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alert,
      channel,
      status: 'pending',
      attempts: 0
    };

    this.notifications.push(notification);

    try {
      notification.attempts++;
      notification.lastAttempt = new Date();

      switch (channel.type) {
        case 'console':
          await this.sendConsoleNotification(alert, customMessage);
          break;
        case 'webhook':
          await this.sendWebhookNotification(alert, channel.config, customMessage);
          break;
        case 'slack':
          await this.sendSlackNotification(alert, channel.config, customMessage);
          break;
        case 'discord':
          await this.sendDiscordNotification(alert, channel.config, customMessage);
          break;
        case 'email':
          await this.sendEmailNotification(alert, channel.config, customMessage);
          break;
        default:
          throw new Error(`Unknown channel type: ${channel.type}`);
      }

      notification.status = 'sent';
      notification.sentAt = new Date();
      console.log(`✅ Notification sent via ${channel.type}`);

    } catch (error) {
      notification.status = 'failed';
      notification.error = error.message;
      console.error(`❌ Failed to send notification via ${channel.type}:`, error.message);

      // Retry logic for failed notifications
      if (notification.attempts < 3) {
        setTimeout(() => {
          this.retryNotification(notification);
        }, 30000 * notification.attempts); // Exponential backoff
      }
    }
  }

  /**
   * Retry failed notification
   */
  private async retryNotification(notification: AlertNotification): Promise<void> {
    console.log(`🔄 Retrying notification ${notification.id} (attempt ${notification.attempts + 1})`);
    await this.sendNotification(notification.alert, notification.channel);
  }

  /**
   * Send console notification
   */
  private async sendConsoleNotification(alert: any, customMessage?: string): Promise<void> {
    const timestamp = new Date().toLocaleString();
    const severity = alert.rule.severity.toUpperCase();
    const icon = alert.rule.severity === 'critical' ? '🚨' : '⚠️';
    
    console.log(`\n${icon} ALERT [${severity}] ${timestamp}`);
    console.log(`   ${customMessage || alert.message}`);
    console.log(`   Metric: ${alert.rule.metric} = ${alert.value}`);
    console.log(`   Threshold: ${alert.rule.threshold}`);
    console.log('');
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: any, config: any, customMessage?: string): Promise<void> {
    const axios = require('axios');
    
    const payload = {
      timestamp: new Date().toISOString(),
      alert: {
        id: alert.id,
        severity: alert.rule.severity,
        message: customMessage || alert.message,
        metric: alert.rule.metric,
        value: alert.value,
        threshold: alert.rule.threshold,
        rule: alert.rule.name
      },
      system: {
        service: 'viktoria-wertheim-club-system',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    await axios({
      method: config.method || 'POST',
      url: config.url,
      headers: config.headers,
      data: payload,
      timeout: 10000
    });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: any, config: any, customMessage?: string): Promise<void> {
    const axios = require('axios');
    
    const color = alert.rule.severity === 'critical' ? 'danger' : 'warning';
    const icon = alert.rule.severity === 'critical' ? '🚨' : '⚠️';
    
    const payload = {
      channel: config.channel,
      username: config.username,
      attachments: [
        {
          color,
          title: `${icon} Performance Alert`,
          text: customMessage || alert.message,
          fields: [
            {
              title: 'Metric',
              value: alert.rule.metric,
              short: true
            },
            {
              title: 'Value',
              value: alert.value.toString(),
              short: true
            },
            {
              title: 'Threshold',
              value: alert.rule.threshold.toString(),
              short: true
            },
            {
              title: 'Severity',
              value: alert.rule.severity.toUpperCase(),
              short: true
            }
          ],
          timestamp: Math.floor(Date.now() / 1000)
        }
      ]
    };

    await axios.post(config.webhookUrl, payload, {
      timeout: 10000
    });
  }

  /**
   * Send Discord notification
   */
  private async sendDiscordNotification(alert: any, config: any, customMessage?: string): Promise<void> {
    const axios = require('axios');
    
    const color = alert.rule.severity === 'critical' ? 0xFF0000 : 0xFFA500; // Red or Orange
    const icon = alert.rule.severity === 'critical' ? '🚨' : '⚠️';
    
    const payload = {
      username: config.username,
      embeds: [
        {
          title: `${icon} Performance Alert`,
          description: customMessage || alert.message,
          color,
          fields: [
            {
              name: 'Metric',
              value: alert.rule.metric,
              inline: true
            },
            {
              name: 'Value',
              value: alert.value.toString(),
              inline: true
            },
            {
              name: 'Threshold',
              value: alert.rule.threshold.toString(),
              inline: true
            },
            {
              name: 'Severity',
              value: alert.rule.severity.toUpperCase(),
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    };

    await axios.post(config.webhookUrl, payload, {
      timeout: 10000
    });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: any, config: any, customMessage?: string): Promise<void> {
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransporter(config.smtp);
    
    const severity = alert.rule.severity.toUpperCase();
    const subject = `[${severity}] Viktoria Performance Alert: ${alert.rule.metric}`;
    
    const html = `
      <h2>🚨 Performance Alert</h2>
      <p><strong>Message:</strong> ${customMessage || alert.message}</p>
      <table border="1" cellpadding="5" cellspacing="0">
        <tr><td><strong>Metric</strong></td><td>${alert.rule.metric}</td></tr>
        <tr><td><strong>Current Value</strong></td><td>${alert.value}</td></tr>
        <tr><td><strong>Threshold</strong></td><td>${alert.rule.threshold}</td></tr>
        <tr><td><strong>Severity</strong></td><td>${severity}</td></tr>
        <tr><td><strong>Rule</strong></td><td>${alert.rule.name}</td></tr>
        <tr><td><strong>Time</strong></td><td>${alert.timestamp}</td></tr>
      </table>
      <p><em>This alert was generated by the Viktoria Wertheim Club Performance Monitoring System.</em></p>
    `;

    const mailOptions = {
      from: config.from,
      to: config.to,
      subject,
      html
    };

    await transporter.sendMail(mailOptions);
  }

  /**
   * Start escalation monitoring
   */
  private startEscalationMonitoring(): void {
    this.escalationInterval = setInterval(() => {
      this.checkEscalations();
    }, 60000); // Check every minute

    console.log('🔔 Escalation monitoring started');
  }

  /**
   * Check for escalations
   */
  private async checkEscalations(): Promise<void> {
    const now = Date.now();

    // Get unacknowledged notifications
    const unacknowledgedNotifications = this.notifications.filter(n => 
      n.status === 'sent' && !n.acknowledgedAt
    );

    for (const notification of unacknowledgedNotifications) {
      const alertAge = now - notification.alert.timestamp.getTime();

      // Find applicable escalation rules
      const applicableRules = this.escalationRules.filter(rule => 
        rule.enabled &&
        rule.condition.severity.includes(notification.alert.rule.severity) &&
        rule.condition.duration > 0 && // Not immediate rules
        rule.condition.unacknowledged &&
        alertAge >= rule.condition.duration
      );

      for (const rule of applicableRules) {
        // Check if we've already escalated for this rule
        const alreadyEscalated = this.notifications.some(n => 
          n.alert.id === notification.alert.id &&
          n.status === 'sent' &&
          rule.actions.channels.includes(n.channel.type)
        );

        if (!alreadyEscalated) {
          console.log(`📈 Escalating alert ${notification.alert.id} via rule: ${rule.name}`);
          await this.executeEscalationRule(rule, notification.alert);
        }
      }
    }
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const notifications = this.notifications.filter(n => n.alert.id === alertId);
    
    if (notifications.length === 0) {
      return false;
    }

    notifications.forEach(notification => {
      notification.acknowledgedAt = new Date();
      notification.acknowledgedBy = acknowledgedBy;
    });

    console.log(`✅ Alert ${alertId} acknowledged by ${acknowledgedBy}`);
    return true;
  }

  /**
   * Get notification history
   */
  getNotificationHistory(limit: number = 50): AlertNotification[] {
    return this.notifications
      .sort((a, b) => b.alert.timestamp.getTime() - a.alert.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(): {
    total: number;
    byStatus: Record<string, number>;
    byChannel: Record<string, number>;
    bySeverity: Record<string, number>;
    averageResponseTime: number;
  } {
    const stats = {
      total: this.notifications.length,
      byStatus: {} as Record<string, number>,
      byChannel: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      averageResponseTime: 0
    };

    let totalResponseTime = 0;
    let responseTimeCount = 0;

    this.notifications.forEach(notification => {
      // Count by status
      stats.byStatus[notification.status] = (stats.byStatus[notification.status] || 0) + 1;

      // Count by channel
      stats.byChannel[notification.channel.type] = (stats.byChannel[notification.channel.type] || 0) + 1;

      // Count by severity
      const severity = notification.alert.rule.severity;
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;

      // Calculate response time
      if (notification.sentAt && notification.lastAttempt) {
        totalResponseTime += notification.sentAt.getTime() - notification.lastAttempt.getTime();
        responseTimeCount++;
      }
    });

    stats.averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

    return stats;
  }

  /**
   * Add custom alert channel
   */
  addChannel(name: string, channel: AlertChannel): void {
    this.channels.set(name, channel);
    console.log(`📢 Added alert channel: ${name} (${channel.type})`);
  }

  /**
   * Remove alert channel
   */
  removeChannel(name: string): boolean {
    const removed = this.channels.delete(name);
    if (removed) {
      console.log(`🗑️  Removed alert channel: ${name}`);
    }
    return removed;
  }

  /**
   * Enable/disable alert channel
   */
  toggleChannel(name: string, enabled: boolean): boolean {
    const channel = this.channels.get(name);
    if (channel) {
      channel.enabled = enabled;
      console.log(`${enabled ? '✅' : '❌'} Alert channel ${name}: ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  /**
   * Test alert channel
   */
  async testChannel(channelName: string): Promise<boolean> {
    const channel = this.channels.get(channelName);
    if (!channel) {
      console.error(`❌ Channel ${channelName} not found`);
      return false;
    }

    const testAlert = {
      id: 'test_alert',
      message: 'This is a test alert from Viktoria Performance Monitoring',
      rule: {
        name: 'Test Alert',
        metric: 'test_metric',
        severity: 'info',
        threshold: 100
      },
      value: 150,
      timestamp: new Date()
    };

    try {
      await this.sendNotification(testAlert, channel, '🧪 TEST: Alert system is working correctly');
      console.log(`✅ Test notification sent successfully via ${channelName}`);
      return true;
    } catch (error) {
      console.error(`❌ Test notification failed for ${channelName}:`, error.message);
      return false;
    }
  }

  /**
   * Cleanup old notifications
   */
  cleanup(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    const originalCount = this.notifications.length;
    
    this.notifications = this.notifications.filter(notification => 
      notification.alert.timestamp >= cutoff
    );

    const removed = originalCount - this.notifications.length;
    console.log(`🧹 Cleaned up ${removed} old notifications`);
  }

  /**
   * Stop alerting system
   */
  destroy(): void {
    if (this.escalationInterval) {
      clearInterval(this.escalationInterval);
      this.escalationInterval = undefined;
    }

    this.channels.clear();
    this.notifications = [];
    this.escalationRules = [];

    console.log('🗑️  Performance alerting system destroyed');
  }
}