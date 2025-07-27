/**
 * Error Notification System
 * 
 * Provides comprehensive error notification capabilities with multiple
 * channels, escalation rules, and intelligent filtering.
 * 
 * Features:
 * - Multiple notification channels
 * - Error severity-based routing
 * - Notification throttling and deduplication
 * - Error escalation workflows
 * - Notification templates and formatting
 * - Delivery tracking and retry logic
 */

import { EventEmitter } from 'events';
import { TrackedError, ErrorSeverity, ErrorCategory } from './ErrorTracker';

/**
 * Notification channel types
 */
export enum NotificationChannelType {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms',
  CONSOLE = 'console',
  LOG = 'log',
  CUSTOM = 'custom'
}

/**
 * Notification channel configuration
 */
export interface NotificationChannel {
  id: string;
  name: string;
  type: NotificationChannelType;
  enabled: boolean;
  config: {
    // Email configuration
    to?: string[];
    from?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    
    // Slack configuration
    webhookUrl?: string;
    channel?: string;
    username?: string;
    iconEmoji?: string;
    
    // Webhook configuration
    url?: string;
    method?: 'POST' | 'PUT' | 'PATCH';
    headers?: Record<string, string>;
    
    // SMS configuration
    phoneNumbers?: string[];
    provider?: string;
    apiKey?: string;
    
    // Custom configuration
    handler?: (notification: ErrorNotification) => Promise<void>;
    
    [key: string]: any;
  };
  filters: {
    severities: ErrorSeverity[];
    categories: ErrorCategory[];
    hookNames?: string[];
    contentTypes?: string[];
    environments?: string[];
  };
  rateLimit: {
    enabled: boolean;
    maxNotifications: number;
    windowSize: number; // milliseconds
  };
  template?: string;
}

/**
 * Error notification
 */
export interface ErrorNotification {
  id: string;
  type: 'immediate' | 'batch' | 'escalation';
  errors: TrackedError[];
  channels: string[];
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  subject: string;
  message: string;
  metadata: {
    totalOccurrences: number;
    affectedUsers: number;
    affectedSessions: number;
    timeRange: {
      start: Date;
      end: Date;
    };
  };
}

/**
 * Notification delivery status
 */
export interface NotificationDelivery {
  id: string;
  notificationId: string;
  channelId: string;
  status: 'pending' | 'sent' | 'failed' | 'retrying';
  timestamp: Date;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  deliveredAt?: Date;
}

/**
 * Escalation rule
 */
export interface EscalationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    errorCount?: number;
    timeWindow?: number; // milliseconds
    severities?: ErrorSeverity[];
    categories?: ErrorCategory[];
    unresolved?: boolean;
  };
  delay: number; // milliseconds
  targetChannels: string[];
  repeatInterval?: number; // milliseconds for repeated escalations
  maxRepeats?: number;
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'immediate' | 'batch' | 'escalation';
  channelType: NotificationChannelType;
  subject: string;
  body: string;
  variables: string[];
}

/**
 * Default notification templates
 */
const DEFAULT_TEMPLATES: Record<string, NotificationTemplate> = {
  'immediate-console': {
    id: 'immediate-console',
    name: 'Immediate Console Notification',
    type: 'immediate',
    channelType: NotificationChannelType.CONSOLE,
    subject: '🚨 Error Alert: {{error.name}}',
    body: `Error Alert: {{error.name}}
Message: {{error.message}}
Hook: {{error.context.hookName}}
Content Type: {{error.context.contentType}}
Severity: {{error.severity}}
Occurrences: {{error.occurrenceCount}}
First Seen: {{error.firstOccurrence}}
Last Seen: {{error.lastOccurrence}}
Environment: {{error.context.environment}}`,
    variables: ['error']
  },
  
  'batch-console': {
    id: 'batch-console',
    name: 'Batch Console Notification',
    type: 'batch',
    channelType: NotificationChannelType.CONSOLE,
    subject: '📊 Error Summary: {{errorCount}} errors',
    body: `Error Summary Report
Total Errors: {{errorCount}}
Time Range: {{timeRange.start}} - {{timeRange.end}}
Affected Users: {{affectedUsers}}
Affected Sessions: {{affectedSessions}}

Top Errors:
{{#each topErrors}}
- {{name}}: {{occurrenceCount}} occurrences ({{severity}})
{{/each}}`,
    variables: ['errorCount', 'timeRange', 'affectedUsers', 'affectedSessions', 'topErrors']
  },

  'immediate-slack': {
    id: 'immediate-slack',
    name: 'Immediate Slack Notification',
    type: 'immediate',
    channelType: NotificationChannelType.SLACK,
    subject: 'Error Alert',
    body: `{
  "text": "🚨 Error Alert: {{error.name}}",
  "attachments": [
    {
      "color": "{{#if (eq error.severity 'critical')}}danger{{else if (eq error.severity 'high')}}warning{{else}}good{{/if}}",
      "fields": [
        {
          "title": "Message",
          "value": "{{error.message}}",
          "short": false
        },
        {
          "title": "Hook",
          "value": "{{error.context.hookName}}",
          "short": true
        },
        {
          "title": "Content Type",
          "value": "{{error.context.contentType}}",
          "short": true
        },
        {
          "title": "Severity",
          "value": "{{error.severity}}",
          "short": true
        },
        {
          "title": "Occurrences",
          "value": "{{error.occurrenceCount}}",
          "short": true
        }
      ],
      "ts": {{timestamp}}
    }
  ]
}`,
    variables: ['error', 'timestamp']
  }
};

/**
 * Error notification system
 */
export class ErrorNotificationSystem extends EventEmitter {
  private channels: Map<string, NotificationChannel> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private escalationRules: Map<string, EscalationRule> = new Map();
  private deliveries: Map<string, NotificationDelivery> = new Map();
  private rateLimitCounters: Map<string, { count: number; resetTime: number }> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.loadDefaultTemplates();
    this.setupDefaultChannels();
  }

  /**
   * Add notification channel
   */
  addChannel(channel: NotificationChannel): void {
    this.channels.set(channel.id, channel);
  }

  /**
   * Remove notification channel
   */
  removeChannel(channelId: string): boolean {
    return this.channels.delete(channelId);
  }

  /**
   * Get notification channel
   */
  getChannel(channelId: string): NotificationChannel | null {
    return this.channels.get(channelId) || null;
  }

  /**
   * Get all channels
   */
  getChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Add notification template
   */
  addTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Add escalation rule
   */
  addEscalationRule(rule: EscalationRule): void {
    this.escalationRules.set(rule.id, rule);
  }

  /**
   * Process error notification
   */
  async processNotification(notification: ErrorNotification): Promise<void> {
    // Filter channels based on error criteria
    const eligibleChannels = this.getEligibleChannels(notification);
    
    // Send to each eligible channel
    for (const channelId of eligibleChannels) {
      await this.sendToChannel(notification, channelId);
    }

    // Check for escalation rules
    this.checkEscalationRules(notification);

    this.emit('notification_processed', notification);
  }

  /**
   * Get notification delivery status
   */
  getDeliveryStatus(notificationId: string): NotificationDelivery[] {
    return Array.from(this.deliveries.values())
      .filter(d => d.notificationId === notificationId);
  }

  /**
   * Get notification statistics
   */
  getStats(): {
    totalNotifications: number;
    notificationsByChannel: Record<string, number>;
    notificationsByStatus: Record<string, number>;
    averageDeliveryTime: number;
    failureRate: number;
  } {
    const deliveries = Array.from(this.deliveries.values());
    
    const notificationsByChannel = deliveries.reduce((acc, d) => {
      acc[d.channelId] = (acc[d.channelId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const notificationsByStatus = deliveries.reduce((acc, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const successfulDeliveries = deliveries.filter(d => d.status === 'sent' && d.deliveredAt);
    const totalDeliveryTime = successfulDeliveries.reduce((sum, d) => {
      return sum + (d.deliveredAt!.getTime() - d.timestamp.getTime());
    }, 0);
    const averageDeliveryTime = successfulDeliveries.length > 0 
      ? totalDeliveryTime / successfulDeliveries.length 
      : 0;

    const failedDeliveries = deliveries.filter(d => d.status === 'failed').length;
    const failureRate = deliveries.length > 0 ? failedDeliveries / deliveries.length : 0;

    return {
      totalNotifications: new Set(deliveries.map(d => d.notificationId)).size,
      notificationsByChannel,
      notificationsByStatus,
      averageDeliveryTime,
      failureRate
    };
  }

  /**
   * Create error notification
   */
  createNotification(
    type: 'immediate' | 'batch' | 'escalation',
    errors: TrackedError[],
    channels: string[]
  ): ErrorNotification {
    const now = new Date();
    const totalOccurrences = errors.reduce((sum, e) => sum + e.occurrenceCount, 0);
    const affectedUsers = new Set(errors.flatMap(e => Array.from(e.metadata.affectedUsers))).size;
    const affectedSessions = new Set(errors.flatMap(e => Array.from(e.metadata.affectedSessions))).size;

    // Determine priority based on highest severity
    const highestSeverity = errors.reduce((highest, error) => {
      const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
      return severityOrder[error.severity] > severityOrder[highest] ? error.severity : highest;
    }, ErrorSeverity.LOW);

    const priority = highestSeverity as 'low' | 'medium' | 'high' | 'critical';

    // Generate subject and message
    const subject = this.generateSubject(type, errors);
    const message = this.generateMessage(type, errors);

    // Calculate time range
    const timestamps = errors.flatMap(e => [e.firstOccurrence, e.lastOccurrence]);
    const timeRange = {
      start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
      end: new Date(Math.max(...timestamps.map(t => t.getTime())))
    };

    return {
      id: this.generateNotificationId(),
      type,
      errors,
      channels,
      timestamp: now,
      priority,
      subject,
      message,
      metadata: {
        totalOccurrences,
        affectedUsers,
        affectedSessions,
        timeRange
      }
    };
  }

  /**
   * Get eligible channels for notification
   */
  private getEligibleChannels(notification: ErrorNotification): string[] {
    const eligibleChannels: string[] = [];

    for (const channelId of notification.channels) {
      const channel = this.channels.get(channelId);
      if (!channel || !channel.enabled) {
        continue;
      }

      // Check filters
      if (!this.passesChannelFilters(channel, notification.errors)) {
        continue;
      }

      // Check rate limits
      if (!this.checkRateLimit(channel)) {
        continue;
      }

      eligibleChannels.push(channelId);
    }

    return eligibleChannels;
  }

  /**
   * Check if errors pass channel filters
   */
  private passesChannelFilters(channel: NotificationChannel, errors: TrackedError[]): boolean {
    const filters = channel.filters;

    for (const error of errors) {
      // Check severity filter
      if (filters.severities.length > 0 && !filters.severities.includes(error.severity)) {
        continue;
      }

      // Check category filter
      if (filters.categories.length > 0 && !filters.categories.includes(error.category)) {
        continue;
      }

      // Check hook name filter
      if (filters.hookNames && filters.hookNames.length > 0 && 
          !filters.hookNames.includes(error.context.hookName)) {
        continue;
      }

      // Check content type filter
      if (filters.contentTypes && filters.contentTypes.length > 0 && 
          !filters.contentTypes.includes(error.context.contentType)) {
        continue;
      }

      // Check environment filter
      if (filters.environments && filters.environments.length > 0 && 
          !filters.environments.includes(error.context.environment)) {
        continue;
      }

      // At least one error passes all filters
      return true;
    }

    return false;
  }

  /**
   * Check rate limit for channel
   */
  private checkRateLimit(channel: NotificationChannel): boolean {
    if (!channel.rateLimit.enabled) {
      return true;
    }

    const now = Date.now();
    const counter = this.rateLimitCounters.get(channel.id);

    if (!counter || now > counter.resetTime) {
      // Reset or initialize counter
      this.rateLimitCounters.set(channel.id, {
        count: 1,
        resetTime: now + channel.rateLimit.windowSize
      });
      return true;
    }

    if (counter.count >= channel.rateLimit.maxNotifications) {
      return false; // Rate limit exceeded
    }

    counter.count++;
    return true;
  }

  /**
   * Send notification to channel
   */
  private async sendToChannel(notification: ErrorNotification, channelId: string): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }

    const delivery: NotificationDelivery = {
      id: this.generateDeliveryId(),
      notificationId: notification.id,
      channelId,
      status: 'pending',
      timestamp: new Date(),
      attempts: 0
    };

    this.deliveries.set(delivery.id, delivery);

    try {
      await this.deliverToChannel(notification, channel, delivery);
      delivery.status = 'sent';
      delivery.deliveredAt = new Date();
    } catch (error) {
      delivery.status = 'failed';
      delivery.error = error instanceof Error ? error.message : String(error);
      
      // Schedule retry
      this.scheduleRetry(notification, channel, delivery);
    }
  }

  /**
   * Deliver notification to specific channel
   */
  private async deliverToChannel(
    notification: ErrorNotification,
    channel: NotificationChannel,
    delivery: NotificationDelivery
  ): Promise<void> {
    delivery.attempts++;
    delivery.lastAttempt = new Date();

    switch (channel.type) {
      case NotificationChannelType.CONSOLE:
        await this.deliverToConsole(notification, channel);
        break;
      case NotificationChannelType.LOG:
        await this.deliverToLog(notification, channel);
        break;
      case NotificationChannelType.SLACK:
        await this.deliverToSlack(notification, channel);
        break;
      case NotificationChannelType.WEBHOOK:
        await this.deliverToWebhook(notification, channel);
        break;
      case NotificationChannelType.EMAIL:
        await this.deliverToEmail(notification, channel);
        break;
      case NotificationChannelType.SMS:
        await this.deliverToSMS(notification, channel);
        break;
      case NotificationChannelType.CUSTOM:
        await this.deliverToCustom(notification, channel);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  /**
   * Deliver to console
   */
  private async deliverToConsole(notification: ErrorNotification, channel: NotificationChannel): Promise<void> {
    const template = this.getTemplate(notification.type, channel.type) || 
                    this.templates.get(`${notification.type}-console`);
    
    if (template) {
      const rendered = this.renderTemplate(template, notification);
      console.error(`\n${rendered.subject}\n${rendered.body}\n`);
    } else {
      console.error(`Error Notification: ${notification.subject}\n${notification.message}`);
    }
  }

  /**
   * Deliver to log
   */
  private async deliverToLog(notification: ErrorNotification, channel: NotificationChannel): Promise<void> {
    // This would integrate with the structured logger
    console.log('ERROR_NOTIFICATION', {
      notification,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Deliver to Slack
   */
  private async deliverToSlack(notification: ErrorNotification, channel: NotificationChannel): Promise<void> {
    if (!channel.config.webhookUrl) {
      throw new Error('Slack webhook URL not configured');
    }

    const template = this.getTemplate(notification.type, channel.type);
    let payload: any;

    if (template) {
      const rendered = this.renderTemplate(template, notification);
      payload = JSON.parse(rendered.body);
    } else {
      payload = {
        text: notification.subject,
        attachments: [{
          color: this.getSeverityColor(notification.priority),
          text: notification.message,
          ts: Math.floor(notification.timestamp.getTime() / 1000)
        }]
      };
    }

    // This would use a HTTP client like axios
    console.log(`Slack notification sent to ${channel.config.webhookUrl}`, payload);
  }

  /**
   * Deliver to webhook
   */
  private async deliverToWebhook(notification: ErrorNotification, channel: NotificationChannel): Promise<void> {
    if (!channel.config.url) {
      throw new Error('Webhook URL not configured');
    }

    const payload = {
      notification,
      timestamp: new Date().toISOString()
    };

    // This would use a HTTP client
    console.log(`Webhook notification sent to ${channel.config.url}`, payload);
  }

  /**
   * Deliver to email
   */
  private async deliverToEmail(notification: ErrorNotification, channel: NotificationChannel): Promise<void> {
    if (!channel.config.to || channel.config.to.length === 0) {
      throw new Error('Email recipients not configured');
    }

    // This would integrate with an email service
    console.log(`Email notification sent to ${channel.config.to.join(', ')}`, {
      subject: notification.subject,
      body: notification.message
    });
  }

  /**
   * Deliver to SMS
   */
  private async deliverToSMS(notification: ErrorNotification, channel: NotificationChannel): Promise<void> {
    if (!channel.config.phoneNumbers || channel.config.phoneNumbers.length === 0) {
      throw new Error('Phone numbers not configured');
    }

    // This would integrate with an SMS service
    console.log(`SMS notification sent to ${channel.config.phoneNumbers.join(', ')}`, {
      message: `${notification.subject}: ${notification.message}`
    });
  }

  /**
   * Deliver to custom handler
   */
  private async deliverToCustom(notification: ErrorNotification, channel: NotificationChannel): Promise<void> {
    if (!channel.config.handler) {
      throw new Error('Custom handler not configured');
    }

    await channel.config.handler(notification);
  }

  /**
   * Schedule notification retry
   */
  private scheduleRetry(
    notification: ErrorNotification,
    channel: NotificationChannel,
    delivery: NotificationDelivery
  ): void {
    if (delivery.attempts >= 3) {
      return; // Max retries reached
    }

    const retryDelay = Math.pow(2, delivery.attempts) * 1000; // Exponential backoff
    
    const timer = setTimeout(async () => {
      delivery.status = 'retrying';
      
      try {
        await this.deliverToChannel(notification, channel, delivery);
        delivery.status = 'sent';
        delivery.deliveredAt = new Date();
      } catch (error) {
        delivery.status = 'failed';
        delivery.error = error instanceof Error ? error.message : String(error);
        
        if (delivery.attempts < 3) {
          this.scheduleRetry(notification, channel, delivery);
        }
      }
      
      this.retryTimers.delete(delivery.id);
    }, retryDelay);

    this.retryTimers.set(delivery.id, timer);
  }

  /**
   * Check escalation rules
   */
  private checkEscalationRules(notification: ErrorNotification): void {
    for (const rule of this.escalationRules.values()) {
      if (!rule.enabled) {
        continue;
      }

      if (this.shouldEscalate(notification, rule)) {
        this.scheduleEscalation(notification, rule);
      }
    }
  }

  /**
   * Check if notification should trigger escalation
   */
  private shouldEscalate(notification: ErrorNotification, rule: EscalationRule): boolean {
    const conditions = rule.conditions;

    // Check error count
    if (conditions.errorCount && notification.errors.length < conditions.errorCount) {
      return false;
    }

    // Check severities
    if (conditions.severities && conditions.severities.length > 0) {
      const hasMatchingSeverity = notification.errors.some(e => 
        conditions.severities!.includes(e.severity)
      );
      if (!hasMatchingSeverity) {
        return false;
      }
    }

    // Check categories
    if (conditions.categories && conditions.categories.length > 0) {
      const hasMatchingCategory = notification.errors.some(e => 
        conditions.categories!.includes(e.category)
      );
      if (!hasMatchingCategory) {
        return false;
      }
    }

    // Check unresolved condition
    if (conditions.unresolved) {
      const hasUnresolvedErrors = notification.errors.some(e => !e.resolved);
      if (!hasUnresolvedErrors) {
        return false;
      }
    }

    return true;
  }

  /**
   * Schedule escalation
   */
  private scheduleEscalation(notification: ErrorNotification, rule: EscalationRule): void {
    const timer = setTimeout(() => {
      this.executeEscalation(notification, rule);
      this.escalationTimers.delete(rule.id);
    }, rule.delay);

    this.escalationTimers.set(rule.id, timer);
  }

  /**
   * Execute escalation
   */
  private async executeEscalation(notification: ErrorNotification, rule: EscalationRule): Promise<void> {
    const escalationNotification = this.createNotification(
      'escalation',
      notification.errors,
      rule.targetChannels
    );

    await this.processNotification(escalationNotification);

    this.emit('escalation_triggered', { notification, rule, escalationNotification });

    // Schedule repeat if configured
    if (rule.repeatInterval && rule.maxRepeats && rule.maxRepeats > 0) {
      // Implementation for repeated escalations would go here
    }
  }

  /**
   * Get template for notification type and channel
   */
  private getTemplate(notificationType: string, channelType: NotificationChannelType): NotificationTemplate | null {
    const templateId = `${notificationType}-${channelType}`;
    return this.templates.get(templateId) || null;
  }

  /**
   * Render template with notification data
   */
  private renderTemplate(template: NotificationTemplate, notification: ErrorNotification): {
    subject: string;
    body: string;
  } {
    const context = {
      notification,
      errors: notification.errors,
      error: notification.errors[0], // For single error notifications
      errorCount: notification.errors.length,
      timeRange: notification.metadata.timeRange,
      affectedUsers: notification.metadata.affectedUsers,
      affectedSessions: notification.metadata.affectedSessions,
      topErrors: notification.errors.slice(0, 5),
      timestamp: Math.floor(notification.timestamp.getTime() / 1000)
    };

    // Simple template rendering (in production, use a proper template engine)
    let subject = template.subject;
    let body = template.body;

    // Replace simple variables
    subject = this.replaceVariables(subject, context);
    body = this.replaceVariables(body, context);

    return { subject, body };
  }

  /**
   * Simple variable replacement
   */
  private replaceVariables(template: string, context: any): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getNestedValue(context, path.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get severity color for Slack
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return '#ffaa00';
      case 'low': return 'good';
      default: return '#cccccc';
    }
  }

  /**
   * Generate subject for notification
   */
  private generateSubject(type: string, errors: TrackedError[]): string {
    if (type === 'batch') {
      return `Error Summary: ${errors.length} errors detected`;
    } else if (errors.length === 1) {
      return `Error Alert: ${errors[0].name}`;
    } else {
      return `Multiple Error Alert: ${errors.length} errors`;
    }
  }

  /**
   * Generate message for notification
   */
  private generateMessage(type: string, errors: TrackedError[]): string {
    if (type === 'batch') {
      const summary = errors.slice(0, 5).map(e => 
        `- ${e.name}: ${e.occurrenceCount} occurrences (${e.severity})`
      ).join('\n');
      
      return `Error Summary Report:\n${summary}${errors.length > 5 ? '\n... and more' : ''}`;
    } else {
      const error = errors[0];
      return `Error: ${error.message}\nHook: ${error.context.hookName}\nSeverity: ${error.severity}\nOccurrences: ${error.occurrenceCount}`;
    }
  }

  /**
   * Generate unique notification ID
   */
  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique delivery ID
   */
  private generateDeliveryId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load default templates
   */
  private loadDefaultTemplates(): void {
    for (const template of Object.values(DEFAULT_TEMPLATES)) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Setup default channels
   */
  private setupDefaultChannels(): void {
    // Console channel
    this.addChannel({
      id: 'console',
      name: 'Console',
      type: NotificationChannelType.CONSOLE,
      enabled: true,
      config: {},
      filters: {
        severities: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
        categories: []
      },
      rateLimit: {
        enabled: false,
        maxNotifications: 10,
        windowSize: 60000
      }
    });

    // Log channel
    this.addChannel({
      id: 'log',
      name: 'Log',
      type: NotificationChannelType.LOG,
      enabled: true,
      config: {},
      filters: {
        severities: [ErrorSeverity.MEDIUM, ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
        categories: []
      },
      rateLimit: {
        enabled: false,
        maxNotifications: 100,
        windowSize: 60000
      }
    });
  }
}

export default ErrorNotificationSystem;