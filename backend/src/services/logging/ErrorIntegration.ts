/**
 * Error Integration
 * 
 * Integrates error tracking with structured logging, performance monitoring,
 * and notification systems to provide comprehensive error observability.
 * 
 * Features:
 * - Unified error tracking interface
 * - Automatic error categorization and analysis
 * - Integration with logging and performance systems
 * - Error notification and alerting
 * - Error resolution workflows
 * - Error analytics and reporting
 */

import ErrorTracker, { TrackedError, ErrorContext, ErrorCategory, ErrorSeverity } from './ErrorTracker';
import ErrorNotificationSystem, { NotificationChannel, EscalationRule } from './ErrorNotification';
import { HookLogger, getLogger } from './LoggingIntegration';
import { getPerformanceIntegration } from './PerformanceIntegration';
import { TraceContext } from './RequestTracing';

/**
 * Error integration configuration
 */
export interface ErrorIntegrationConfig {
  tracking: {
    enabled: boolean;
    maxErrorsInMemory: number;
    errorRetentionDays: number;
    enableStackTraceAnalysis: boolean;
    enableUserTracking: boolean;
    autoResolveAfterDays: number;
  };
  notification: {
    enabled: boolean;
    immediateNotification: boolean;
    batchNotification: boolean;
    batchInterval: number; // minutes
    suppressDuplicates: boolean;
    suppressionWindow: number; // minutes
  };
  integration: {
    enableLoggingIntegration: boolean;
    enablePerformanceIntegration: boolean;
    enableTracingIntegration: boolean;
    logErrorDetails: boolean;
    trackPerformanceImpact: boolean;
  };
  thresholds: {
    criticalErrorRate: number; // errors per minute
    highErrorCount: number; // total errors for escalation
    errorBurstThreshold: number; // errors in short time window
    errorBurstWindow: number; // minutes
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ErrorIntegrationConfig = {
  tracking: {
    enabled: true,
    maxErrorsInMemory: 10000,
    errorRetentionDays: 30,
    enableStackTraceAnalysis: true,
    enableUserTracking: true,
    autoResolveAfterDays: 7
  },
  notification: {
    enabled: true,
    immediateNotification: true,
    batchNotification: false,
    batchInterval: 5,
    suppressDuplicates: true,
    suppressionWindow: 1
  },
  integration: {
    enableLoggingIntegration: true,
    enablePerformanceIntegration: true,
    enableTracingIntegration: true,
    logErrorDetails: true,
    trackPerformanceImpact: true
  },
  thresholds: {
    criticalErrorRate: 10, // 10 errors per minute
    highErrorCount: 100, // 100 total errors
    errorBurstThreshold: 5, // 5 errors in burst window
    errorBurstWindow: 1 // 1 minute
  }
};

/**
 * Hook error tracker for specific hooks
 */
export class HookErrorTracker {
  private errorTracker: ErrorTracker;
  private notificationSystem: ErrorNotificationSystem;
  private logger: HookLogger;
  private config: ErrorIntegrationConfig;
  private hookName: string;
  private contentType: string;
  private hookType: string;

  constructor(
    errorTracker: ErrorTracker,
    notificationSystem: ErrorNotificationSystem,
    logger: HookLogger,
    config: ErrorIntegrationConfig,
    hookName: string,
    contentType: string,
    hookType: string
  ) {
    this.errorTracker = errorTracker;
    this.notificationSystem = notificationSystem;
    this.logger = logger;
    this.config = config;
    this.hookName = hookName;
    this.contentType = contentType;
    this.hookType = hookType;
  }

  /**
   * Track an error for this hook
   */
  trackError(
    error: Error,
    entityId?: string | number,
    traceContext?: TraceContext,
    additionalData?: Record<string, any>
  ): string {
    const context: ErrorContext = {
      hookName: this.hookName,
      contentType: this.contentType,
      hookType: this.hookType as any,
      entityId,
      operationId: traceContext?.spanId,
      requestId: traceContext?.traceId,
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      additionalData
    };

    // Track error
    const errorId = this.errorTracker.trackError(error, context);

    // Log error if integration enabled
    if (this.config.integration.enableLoggingIntegration && this.config.integration.logErrorDetails) {
      this.logger.error(
        `Hook error: ${error.message}`,
        error,
        {
          errorId,
          errorCategory: this.categorizeError(error),
          errorSeverity: this.assessSeverity(error),
          ...additionalData
        },
        {
          contentType: this.contentType,
          hookType: this.hookType as any,
          operation: 'error_tracking',
          entityId: entityId?.toString(),
          traceContext
        }
      );
    }

    return errorId;
  }

  /**
   * Get error statistics for this hook
   */
  getErrorStats(): {
    totalErrors: number;
    uniqueErrors: number;
    errorRate: number;
    topErrors: TrackedError[];
    recentErrors: TrackedError[];
    resolvedErrors: number;
    unresolvedErrors: number;
  } {
    const hookErrors = this.errorTracker.getErrors({
      hookName: this.hookName,
      limit: 1000
    });

    const totalOccurrences = hookErrors.reduce((sum, e) => sum + e.occurrenceCount, 0);
    const resolvedErrors = hookErrors.filter(e => e.resolved).length;
    const unresolvedErrors = hookErrors.filter(e => !e.resolved).length;

    const topErrors = hookErrors
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .slice(0, 10);

    const recentErrors = hookErrors
      .sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime())
      .slice(0, 20);

    return {
      totalErrors: totalOccurrences,
      uniqueErrors: hookErrors.length,
      errorRate: 0, // Would need operation count to calculate
      topErrors,
      recentErrors,
      resolvedErrors,
      unresolvedErrors
    };
  }

  /**
   * Check if hook has critical error rate
   */
  hasCriticalErrorRate(): boolean {
    const recentErrors = this.errorTracker.getErrors({
      hookName: this.hookName,
      startTime: new Date(Date.now() - 60 * 1000), // Last minute
      resolved: false
    });

    return recentErrors.length >= this.config.thresholds.criticalErrorRate;
  }

  /**
   * Check for error bursts
   */
  hasErrorBurst(): boolean {
    const burstWindow = this.config.thresholds.errorBurstWindow * 60 * 1000;
    const recentErrors = this.errorTracker.getErrors({
      hookName: this.hookName,
      startTime: new Date(Date.now() - burstWindow)
    });

    return recentErrors.length >= this.config.thresholds.errorBurstThreshold;
  }

  /**
   * Get error trends
   */
  getErrorTrends(): {
    trend: 'increasing' | 'stable' | 'decreasing';
    recentErrorCount: number;
    previousErrorCount: number;
    changePercent: number;
  } {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    const twoHoursAgo = now - (2 * 60 * 60 * 1000);

    const recentErrors = this.errorTracker.getErrors({
      hookName: this.hookName,
      startTime: new Date(hourAgo)
    });

    const previousErrors = this.errorTracker.getErrors({
      hookName: this.hookName,
      startTime: new Date(twoHoursAgo),
      endTime: new Date(hourAgo)
    });

    const recentCount = recentErrors.reduce((sum, e) => sum + e.occurrenceCount, 0);
    const previousCount = previousErrors.reduce((sum, e) => sum + e.occurrenceCount, 0);

    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    let changePercent = 0;

    if (previousCount > 0) {
      changePercent = ((recentCount - previousCount) / previousCount) * 100;
      
      if (changePercent > 20) {
        trend = 'increasing';
      } else if (changePercent < -20) {
        trend = 'decreasing';
      }
    } else if (recentCount > 0) {
      trend = 'increasing';
      changePercent = 100;
    }

    return {
      trend,
      recentErrorCount: recentCount,
      previousErrorCount: previousCount,
      changePercent
    };
  }

  /**
   * Categorize error automatically
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    } else if (message.includes('calculation') || message.includes('math')) {
      return ErrorCategory.CALCULATION;
    } else if (message.includes('database') || message.includes('sql')) {
      return ErrorCategory.DATABASE;
    } else if (message.includes('timeout')) {
      return ErrorCategory.TIMEOUT;
    } else if (message.includes('permission') || message.includes('unauthorized')) {
      return ErrorCategory.PERMISSION;
    } else {
      return ErrorCategory.UNKNOWN;
    }
  }

  /**
   * Assess error severity
   */
  private assessSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    } else if (message.includes('error') || message.includes('failed')) {
      return ErrorSeverity.HIGH;
    } else if (message.includes('warning')) {
      return ErrorSeverity.LOW;
    } else {
      return ErrorSeverity.MEDIUM;
    }
  }
}

/**
 * Error integration system
 */
export class ErrorIntegration {
  private errorTracker: ErrorTracker;
  private notificationSystem: ErrorNotificationSystem;
  private logger: HookLogger;
  private config: ErrorIntegrationConfig;
  private strapi: any;

  constructor(strapi: any, config: Partial<ErrorIntegrationConfig> = {}) {
    this.strapi = strapi;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize error tracker
    this.errorTracker = new ErrorTracker({
      enabled: this.config.tracking.enabled,
      maxErrorsInMemory: this.config.tracking.maxErrorsInMemory,
      errorRetentionTime: this.config.tracking.errorRetentionDays * 24 * 60 * 60 * 1000,
      enableStackTraceAnalysis: this.config.tracking.enableStackTraceAnalysis,
      enableUserTracking: this.config.tracking.enableUserTracking,
      autoResolveAfter: this.config.tracking.autoResolveAfterDays * 24 * 60 * 60 * 1000,
      notification: {
        enabled: this.config.notification.enabled,
        channels: ['console', 'log'],
        severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
        immediateNotification: this.config.notification.immediateNotification,
        batchNotification: {
          enabled: this.config.notification.batchNotification,
          interval: this.config.notification.batchInterval * 60 * 1000,
          maxBatchSize: 10
        },
        suppressDuplicates: this.config.notification.suppressDuplicates,
        suppressionWindow: this.config.notification.suppressionWindow * 60 * 1000
      }
    });

    // Initialize notification system
    this.notificationSystem = new ErrorNotificationSystem();

    // Initialize logger
    this.logger = getLogger(strapi, {
      enableErrorTracking: true
    });

    // Set up integrations
    this.setupIntegrations();
    this.setupDefaultNotifications();
  }

  /**
   * Create hook-specific error tracker
   */
  forHook(contentType: string, hookType: string): HookErrorTracker {
    const hookName = `${contentType}.${hookType}`;
    return new HookErrorTracker(
      this.errorTracker,
      this.notificationSystem,
      this.logger,
      this.config,
      hookName,
      contentType,
      hookType
    );
  }

  /**
   * Get error dashboard data
   */
  getErrorDashboard(): {
    summary: any;
    topErrors: TrackedError[];
    recentErrors: TrackedError[];
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    errorsByHook: Record<string, number>;
    errorTrends: any[];
    notifications: any;
  } {
    const stats = this.errorTracker.getStats();
    const notificationStats = this.notificationSystem.getStats();

    // Get error trends by hook
    const hookNames = Object.keys(stats.errorsByHook);
    const errorTrends = hookNames.map(hookName => {
      const hookErrors = this.errorTracker.getErrors({ hookName, limit: 100 });
      const recentCount = hookErrors.filter(e => 
        e.lastOccurrence.getTime() > Date.now() - (60 * 60 * 1000)
      ).reduce((sum, e) => sum + e.occurrenceCount, 0);

      return {
        hookName,
        recentErrorCount: recentCount,
        totalErrors: hookErrors.reduce((sum, e) => sum + e.occurrenceCount, 0),
        uniqueErrors: hookErrors.length
      };
    });

    return {
      summary: {
        ...stats,
        notificationStats
      },
      topErrors: stats.topErrors.map(te => te.error),
      recentErrors: stats.recentErrors,
      errorsByCategory: stats.errorsByCategory,
      errorsBySeverity: stats.errorsBySeverity,
      errorsByHook: stats.errorsByHook,
      errorTrends,
      notifications: notificationStats
    };
  }

  /**
   * Get error details
   */
  getErrorDetails(errorId: string): {
    error: TrackedError | null;
    occurrences: any[];
    relatedErrors: TrackedError[];
    resolutionSuggestions: string[];
  } {
    const error = this.errorTracker.getError(errorId);
    if (!error) {
      return {
        error: null,
        occurrences: [],
        relatedErrors: [],
        resolutionSuggestions: []
      };
    }

    const occurrences = this.errorTracker.getErrorOccurrences(errorId, 50);
    
    // Find related errors (same category and hook)
    const relatedErrors = this.errorTracker.getErrors({
      category: error.category,
      hookName: error.context.hookName,
      limit: 10
    }).filter(e => e.id !== errorId);

    // Generate resolution suggestions
    const resolutionSuggestions = this.generateResolutionSuggestions(error);

    return {
      error,
      occurrences,
      relatedErrors,
      resolutionSuggestions
    };
  }

  /**
   * Resolve error
   */
  async resolveError(errorId: string, resolvedBy: string, notes?: string): Promise<boolean> {
    const success = this.errorTracker.resolveError(errorId, resolvedBy, notes);
    
    if (success && this.config.integration.enableLoggingIntegration) {
      this.logger.info('Error resolved', undefined, {
        operation: 'error_resolution',
        errorId,
        resolvedBy,
        notes
      });
    }

    return success;
  }

  /**
   * Add notification channel
   */
  addNotificationChannel(channel: NotificationChannel): void {
    this.notificationSystem.addChannel(channel);
  }

  /**
   * Add escalation rule
   */
  addEscalationRule(rule: EscalationRule): void {
    this.notificationSystem.addEscalationRule(rule);
  }

  /**
   * Search errors
   */
  searchErrors(query: string, limit: number = 50): TrackedError[] {
    return this.errorTracker.searchErrors(query, limit);
  }

  /**
   * Get error statistics
   */
  getStats(): {
    tracking: any;
    notifications: any;
  } {
    return {
      tracking: this.errorTracker.getStats(),
      notifications: this.notificationSystem.getStats()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorIntegrationConfig>): void {
    this.config = { ...this.config, ...config };

    // Update error tracker configuration
    this.errorTracker.updateConfig({
      enabled: this.config.tracking.enabled,
      maxErrorsInMemory: this.config.tracking.maxErrorsInMemory,
      errorRetentionTime: this.config.tracking.errorRetentionDays * 24 * 60 * 60 * 1000,
      enableStackTraceAnalysis: this.config.tracking.enableStackTraceAnalysis,
      enableUserTracking: this.config.tracking.enableUserTracking,
      autoResolveAfter: this.config.tracking.autoResolveAfterDays * 24 * 60 * 60 * 1000
    });
  }

  /**
   * Setup integrations with other systems
   */
  private setupIntegrations(): void {
    // Error tracker event handlers
    this.errorTracker.on('error_tracked', (error: TrackedError) => {
      // Check for critical conditions
      this.checkCriticalConditions(error);
    });

    this.errorTracker.on('error_notification', async (event: any) => {
      if (this.config.notification.enabled) {
        const notification = this.notificationSystem.createNotification(
          event.type,
          event.errors,
          event.channels
        );
        await this.notificationSystem.processNotification(notification);
      }
    });

    // Performance integration
    if (this.config.integration.enablePerformanceIntegration) {
      const perfIntegration = getPerformanceIntegration(this.strapi);
      
      // Track performance impact of errors
      this.errorTracker.on('error_tracked', (error: TrackedError) => {
        if (this.config.integration.trackPerformanceImpact) {
          // This would correlate errors with performance metrics
          // Implementation would depend on performance system API
        }
      });
    }
  }

  /**
   * Setup default notification channels and rules
   */
  private setupDefaultNotifications(): void {
    // Add Slack channel if webhook URL is configured
    if (process.env.SLACK_WEBHOOK_URL) {
      this.notificationSystem.addChannel({
        id: 'slack-errors',
        name: 'Slack Error Notifications',
        type: 'slack' as any,
        enabled: true,
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: '#errors',
          username: 'Error Bot'
        },
        filters: {
          severities: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
          categories: []
        },
        rateLimit: {
          enabled: true,
          maxNotifications: 5,
          windowSize: 60000 // 1 minute
        }
      });
    }

    // Add email channel if configured
    if (process.env.ERROR_EMAIL_RECIPIENTS) {
      this.notificationSystem.addChannel({
        id: 'email-errors',
        name: 'Email Error Notifications',
        type: 'email' as any,
        enabled: true,
        config: {
          to: process.env.ERROR_EMAIL_RECIPIENTS.split(','),
          from: process.env.ERROR_EMAIL_FROM || 'noreply@example.com'
        },
        filters: {
          severities: [ErrorSeverity.CRITICAL],
          categories: []
        },
        rateLimit: {
          enabled: true,
          maxNotifications: 3,
          windowSize: 300000 // 5 minutes
        }
      });
    }

    // Add escalation rule for critical errors
    this.notificationSystem.addEscalationRule({
      id: 'critical-error-escalation',
      name: 'Critical Error Escalation',
      enabled: true,
      conditions: {
        severities: [ErrorSeverity.CRITICAL],
        unresolved: true
      },
      delay: 15 * 60 * 1000, // 15 minutes
      targetChannels: ['email-errors'],
      repeatInterval: 60 * 60 * 1000, // 1 hour
      maxRepeats: 3
    });
  }

  /**
   * Check for critical error conditions
   */
  private checkCriticalConditions(error: TrackedError): void {
    // Check for error bursts
    const recentErrors = this.errorTracker.getErrors({
      hookName: error.context.hookName,
      startTime: new Date(Date.now() - this.config.thresholds.errorBurstWindow * 60 * 1000)
    });

    if (recentErrors.length >= this.config.thresholds.errorBurstThreshold) {
      this.logger.warn('Error burst detected', undefined, {
        operation: 'error_burst_detection',
        hookName: error.context.hookName,
        errorCount: recentErrors.length,
        threshold: this.config.thresholds.errorBurstThreshold,
        windowMinutes: this.config.thresholds.errorBurstWindow
      });
    }

    // Check for high error count
    const totalErrors = this.errorTracker.getErrors({
      hookName: error.context.hookName,
      resolved: false
    });

    if (totalErrors.length >= this.config.thresholds.highErrorCount) {
      this.logger.error('High error count detected', undefined, undefined, {
        operation: 'high_error_count_detection',
        hookName: error.context.hookName,
        errorCount: totalErrors.length,
        threshold: this.config.thresholds.highErrorCount
      });
    }
  }

  /**
   * Generate resolution suggestions based on error
   */
  private generateResolutionSuggestions(error: TrackedError): string[] {
    const suggestions: string[] = [];

    switch (error.category) {
      case ErrorCategory.VALIDATION:
        suggestions.push('Check input validation rules and data format');
        suggestions.push('Verify required fields are provided');
        suggestions.push('Review validation error messages for specific issues');
        break;

      case ErrorCategory.CALCULATION:
        suggestions.push('Check for division by zero or invalid mathematical operations');
        suggestions.push('Verify input data types and ranges');
        suggestions.push('Review calculation logic for edge cases');
        break;

      case ErrorCategory.DATABASE:
        suggestions.push('Check database connection and availability');
        suggestions.push('Verify database schema and table structure');
        suggestions.push('Review SQL queries for syntax errors');
        break;

      case ErrorCategory.TIMEOUT:
        suggestions.push('Increase timeout values if appropriate');
        suggestions.push('Optimize slow operations');
        suggestions.push('Check network connectivity and latency');
        break;

      case ErrorCategory.PERMISSION:
        suggestions.push('Verify user permissions and access rights');
        suggestions.push('Check authentication and authorization logic');
        suggestions.push('Review security policies and configurations');
        break;

      default:
        suggestions.push('Review error message and stack trace for clues');
        suggestions.push('Check recent code changes that might be related');
        suggestions.push('Verify system configuration and environment variables');
    }

    // Add frequency-based suggestions
    if (error.occurrenceCount > 10) {
      suggestions.push('This is a frequent error - consider prioritizing the fix');
    }

    if (error.metadata.affectedUsers.size > 5) {
      suggestions.push('Multiple users affected - this may be a system-wide issue');
    }

    return suggestions;
  }
}

/**
 * Global error integration instance
 */
let globalErrorIntegration: ErrorIntegration | null = null;

/**
 * Get or create global error integration
 */
export function getErrorIntegration(
  strapi?: any,
  config?: Partial<ErrorIntegrationConfig>
): ErrorIntegration {
  if (!globalErrorIntegration && strapi) {
    globalErrorIntegration = new ErrorIntegration(strapi, config);
  }
  return globalErrorIntegration!;
}

/**
 * Set global error integration
 */
export function setErrorIntegration(integration: ErrorIntegration): void {
  globalErrorIntegration = integration;
}

export default ErrorIntegration;