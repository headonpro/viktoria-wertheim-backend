/**
 * Performance Integration
 * 
 * Integrates performance monitoring with structured logging and alerting
 * to provide comprehensive performance observability for lifecycle hooks.
 * 
 * Features:
 * - Unified performance and logging interface
 * - Automatic performance metric collection
 * - Integrated alerting system
 * - Performance dashboard data
 * - Hook-specific performance tracking
 */

import PerformanceMonitor, { PerformanceTimer, PerformanceAlert, PerformanceStats } from './PerformanceMonitor';
import PerformanceAlerting, { AlertChannel, AlertEscalationRule, AlertSuppressionRule } from './PerformanceAlerting';
import { HookLogger, getLogger } from './LoggingIntegration';
import { TraceContext } from './RequestTracing';

/**
 * Performance integration configuration
 */
export interface PerformanceIntegrationConfig {
  monitoring: {
    enabled: boolean;
    collectMemoryMetrics: boolean;
    collectCpuMetrics: boolean;
    metricsRetentionHours: number;
    aggregationIntervalSeconds: number;
  };
  alerting: {
    enabled: boolean;
    defaultChannels: string[];
    escalationEnabled: boolean;
    suppressionEnabled: boolean;
  };
  thresholds: {
    slowExecutionTime: number; // milliseconds
    highErrorRate: number; // percentage (0-1)
    lowThroughput: number; // executions per second
    highMemoryUsage: number; // bytes
  };
  logging: {
    logSlowOperations: boolean;
    logHighErrorRates: boolean;
    logPerformanceMetrics: boolean;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PerformanceIntegrationConfig = {
  monitoring: {
    enabled: true,
    collectMemoryMetrics: true,
    collectCpuMetrics: false,
    metricsRetentionHours: 24,
    aggregationIntervalSeconds: 60
  },
  alerting: {
    enabled: true,
    defaultChannels: ['console'],
    escalationEnabled: true,
    suppressionEnabled: true
  },
  thresholds: {
    slowExecutionTime: 100, // 100ms
    highErrorRate: 0.05, // 5%
    lowThroughput: 1, // 1 execution per second
    highMemoryUsage: 100 * 1024 * 1024 // 100MB
  },
  logging: {
    logSlowOperations: true,
    logHighErrorRates: true,
    logPerformanceMetrics: true
  }
};

/**
 * Hook performance tracker
 */
export class HookPerformanceTracker {
  private monitor: PerformanceMonitor;
  private logger: HookLogger;
  private config: PerformanceIntegrationConfig;
  private hookName: string;
  private contentType: string;
  private hookType: string;

  constructor(
    monitor: PerformanceMonitor,
    logger: HookLogger,
    config: PerformanceIntegrationConfig,
    hookName: string,
    contentType: string,
    hookType: string
  ) {
    this.monitor = monitor;
    this.logger = logger;
    this.config = config;
    this.hookName = hookName;
    this.contentType = contentType;
    this.hookType = hookType;
  }

  /**
   * Start performance tracking for an operation
   */
  startTracking(
    operationName: string,
    entityId?: string | number,
    traceContext?: TraceContext
  ): HookOperationTracker {
    return new HookOperationTracker(
      this.monitor,
      this.logger,
      this.config,
      this.hookName,
      this.contentType,
      this.hookType,
      operationName,
      entityId,
      traceContext
    );
  }

  /**
   * Get performance statistics for this hook
   */
  getStats(): PerformanceStats | null {
    return this.monitor.getStats(this.hookName);
  }

  /**
   * Check if hook is performing slowly
   */
  isSlowHook(): boolean {
    const stats = this.getStats();
    return stats ? stats.averageExecutionTime > this.config.thresholds.slowExecutionTime : false;
  }

  /**
   * Check if hook has high error rate
   */
  hasHighErrorRate(): boolean {
    const stats = this.getStats();
    return stats ? stats.errorRate > this.config.thresholds.highErrorRate : false;
  }

  /**
   * Get recent performance trends
   */
  getTrends(): {
    trend: 'improving' | 'stable' | 'degrading';
    averageExecutionTime: number;
    errorRate: number;
    throughput: number;
  } {
    const stats = this.getStats();
    return {
      trend: stats?.trend || 'stable',
      averageExecutionTime: stats?.averageExecutionTime || 0,
      errorRate: stats?.errorRate || 0,
      throughput: stats?.throughput || 0
    };
  }
}

/**
 * Operation-specific performance tracker
 */
export class HookOperationTracker {
  private timer: PerformanceTimer;
  private operationLogger: any;
  private config: PerformanceIntegrationConfig;
  private startTime: Date;
  private operationName: string;

  constructor(
    monitor: PerformanceMonitor,
    logger: HookLogger,
    config: PerformanceIntegrationConfig,
    hookName: string,
    contentType: string,
    hookType: string,
    operationName: string,
    entityId?: string | number,
    traceContext?: TraceContext
  ) {
    this.config = config;
    this.operationName = operationName;
    this.startTime = new Date();

    // Create performance timer
    this.timer = monitor.createTimer(hookName, contentType, hookType, {
      entityId,
      operationId: traceContext?.spanId,
      requestId: traceContext?.traceId
    });

    // Create operation logger
    this.operationLogger = logger
      .forHook(contentType, hookType as any)
      .forOperation(operationName, entityId, traceContext);

    // Log operation start
    if (config.logging.logPerformanceMetrics) {
      this.operationLogger.logStart({
        operationName,
        entityId,
        traceContext: traceContext ? {
          traceId: traceContext.traceId,
          spanId: traceContext.spanId
        } : undefined
      });
    }
  }

  /**
   * Complete operation successfully
   */
  success(result?: any): number {
    const executionTime = this.timer.success();
    
    if (this.config.logging.logPerformanceMetrics) {
      this.operationLogger.logSuccess(executionTime, {
        result: result ? this.sanitizeResult(result) : undefined,
        performance: {
          executionTime,
          isSlowOperation: executionTime > this.config.thresholds.slowExecutionTime
        }
      });
    }

    // Log warning if operation was slow
    if (this.config.logging.logSlowOperations && 
        executionTime > this.config.thresholds.slowExecutionTime) {
      this.operationLogger.warn(`Slow operation detected: ${this.operationName}`, {
        executionTime,
        threshold: this.config.thresholds.slowExecutionTime,
        performance: { executionTime }
      });
    }

    return executionTime;
  }

  /**
   * Complete operation with failure
   */
  failure(error: Error, context?: any): number {
    const executionTime = this.timer.failure(error);
    
    if (this.config.logging.logPerformanceMetrics) {
      this.operationLogger.logFailure(error, executionTime, {
        context,
        performance: {
          executionTime,
          isSlowOperation: executionTime > this.config.thresholds.slowExecutionTime
        }
      });
    }

    return executionTime;
  }

  /**
   * Add performance checkpoint
   */
  checkpoint(name: string, data?: any): void {
    const elapsed = Date.now() - this.startTime.getTime();
    
    if (this.config.logging.logPerformanceMetrics) {
      this.operationLogger.debug(`Performance checkpoint: ${name}`, {
        checkpoint: name,
        elapsed,
        data: data ? this.sanitizeResult(data) : undefined
      });
    }
  }

  /**
   * Log validation warnings with performance context
   */
  logValidationWarnings(warnings: any[]): void {
    const elapsed = Date.now() - this.startTime.getTime();
    
    this.operationLogger.logValidationWarning(warnings, {
      performance: { elapsed }
    });
  }

  /**
   * Get current elapsed time
   */
  getElapsed(): number {
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Sanitize result for logging (remove sensitive data)
   */
  private sanitizeResult(result: any): any {
    if (!result || typeof result !== 'object') {
      return result;
    }

    // Create a copy and remove sensitive fields
    const sanitized = { ...result };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

/**
 * Performance integration system
 */
export class PerformanceIntegration {
  private monitor: PerformanceMonitor;
  private alerting: PerformanceAlerting;
  private logger: HookLogger;
  private config: PerformanceIntegrationConfig;
  private strapi: any;

  constructor(strapi: any, config: Partial<PerformanceIntegrationConfig> = {}) {
    this.strapi = strapi;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize performance monitor
    this.monitor = new PerformanceMonitor({
      enabled: this.config.monitoring.enabled,
      collectMemoryMetrics: this.config.monitoring.collectMemoryMetrics,
      collectCpuMetrics: this.config.monitoring.collectCpuMetrics,
      metricsRetentionTime: this.config.monitoring.metricsRetentionHours * 60 * 60 * 1000,
      aggregationInterval: this.config.monitoring.aggregationIntervalSeconds * 1000
    });

    // Initialize alerting system
    this.alerting = new PerformanceAlerting({
      enabled: this.config.alerting.enabled,
      defaultChannels: this.config.alerting.defaultChannels,
      escalationEnabled: this.config.alerting.escalationEnabled,
      suppressionEnabled: this.config.alerting.suppressionEnabled
    });

    // Initialize logger
    this.logger = getLogger(strapi, {
      enablePerformanceMonitoring: true,
      enableTracing: true
    });

    // Set up default alerts
    this.setupDefaultAlerts();

    // Connect monitor to alerting
    this.monitor.on('alert', (alertEvent) => {
      this.alerting.processAlert(alertEvent);
    });

    // Log performance alerts
    this.alerting.on('alert_processed', (alertEvent) => {
      this.logger.warn('Performance alert triggered', undefined, {
        contentType: alertEvent.context.contentType,
        hookType: alertEvent.context.hookName?.split('.')[1] as any,
        operation: 'performance_alert',
        alert: {
          name: alertEvent.alert.name,
          condition: alertEvent.alert.condition,
          value: alertEvent.value,
          threshold: alertEvent.threshold,
          severity: alertEvent.alert.severity
        }
      });
    });
  }

  /**
   * Create hook performance tracker
   */
  forHook(contentType: string, hookType: string): HookPerformanceTracker {
    const hookName = `${contentType}.${hookType}`;
    return new HookPerformanceTracker(
      this.monitor,
      this.logger,
      this.config,
      hookName,
      contentType,
      hookType
    );
  }

  /**
   * Get performance dashboard data
   */
  getDashboardData(): {
    summary: any;
    slowHooks: any[];
    highErrorRateHooks: any[];
    recentAlerts: any[];
    performanceTrends: any[];
  } {
    const summary = this.monitor.getSummary();
    const slowHooks = this.monitor.getSlowHooks(this.config.thresholds.slowExecutionTime);
    const highErrorRateHooks = this.monitor.getHighErrorRateHooks(this.config.thresholds.highErrorRate);
    const alertStats = this.alerting.getStats();
    
    // Get recent performance trends
    const allStats = this.monitor.getAllStats();
    const performanceTrends = allStats.map(stats => ({
      hookName: stats.hookName,
      trend: stats.trend,
      averageExecutionTime: stats.averageExecutionTime,
      errorRate: stats.errorRate,
      throughput: stats.throughput,
      lastExecution: stats.lastExecution
    }));

    return {
      summary: {
        ...summary,
        alertStats
      },
      slowHooks,
      highErrorRateHooks,
      recentAlerts: this.alerting.getAlertHistory(undefined, 10),
      performanceTrends
    };
  }

  /**
   * Get hook-specific performance data
   */
  getHookPerformanceData(hookName: string): {
    stats: PerformanceStats | null;
    recentMetrics: any[];
    alerts: any[];
  } {
    return {
      stats: this.monitor.getStats(hookName),
      recentMetrics: this.monitor.getRecentMetrics(hookName, 50),
      alerts: this.alerting.getAlertHistory(hookName, 20)
    };
  }

  /**
   * Add custom performance alert
   */
  addAlert(alert: PerformanceAlert): void {
    this.monitor.addAlert(alert);
  }

  /**
   * Add notification channel
   */
  addNotificationChannel(channel: AlertChannel): void {
    this.alerting.addChannel(channel);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, user: string, notes?: string): Promise<boolean> {
    return await this.alerting.acknowledgeAlert(alertId, user, notes);
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    monitoring: any;
    alerting: any;
  } {
    return {
      monitoring: this.monitor.getSummary(),
      alerting: this.alerting.getStats()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceIntegrationConfig>): void {
    this.config = { ...this.config, ...config };

    // Update monitor configuration
    this.monitor.updateConfig({
      enabled: this.config.monitoring.enabled,
      collectMemoryMetrics: this.config.monitoring.collectMemoryMetrics,
      collectCpuMetrics: this.config.monitoring.collectCpuMetrics,
      metricsRetentionTime: this.config.monitoring.metricsRetentionHours * 60 * 60 * 1000,
      aggregationInterval: this.config.monitoring.aggregationIntervalSeconds * 1000
    });

    // Update alerting configuration
    this.alerting.updateConfig({
      enabled: this.config.alerting.enabled,
      defaultChannels: this.config.alerting.defaultChannels,
      escalationEnabled: this.config.alerting.escalationEnabled,
      suppressionEnabled: this.config.alerting.suppressionEnabled
    });

    // Update logger configuration
    this.logger.updateConfig({
      enablePerformanceMonitoring: this.config.monitoring.enabled
    });
  }

  /**
   * Setup default performance alerts
   */
  private setupDefaultAlerts(): void {
    // Slow execution time alert
    this.monitor.addAlert({
      id: 'slow-execution-default',
      name: 'Slow Hook Execution',
      condition: 'execution_time',
      threshold: this.config.thresholds.slowExecutionTime,
      operator: 'gt',
      windowSize: 5 * 60 * 1000, // 5 minutes
      enabled: true,
      severity: 'medium',
      cooldown: 10 * 60 * 1000 // 10 minutes
    });

    // High error rate alert
    this.monitor.addAlert({
      id: 'high-error-rate-default',
      name: 'High Hook Error Rate',
      condition: 'error_rate',
      threshold: this.config.thresholds.highErrorRate,
      operator: 'gt',
      windowSize: 10 * 60 * 1000, // 10 minutes
      enabled: true,
      severity: 'high',
      cooldown: 15 * 60 * 1000 // 15 minutes
    });

    // Low throughput alert
    this.monitor.addAlert({
      id: 'low-throughput-default',
      name: 'Low Hook Throughput',
      condition: 'throughput',
      threshold: this.config.thresholds.lowThroughput,
      operator: 'lt',
      windowSize: 15 * 60 * 1000, // 15 minutes
      enabled: true,
      severity: 'low',
      cooldown: 30 * 60 * 1000 // 30 minutes
    });

    // High memory usage alert
    if (this.config.monitoring.collectMemoryMetrics) {
      this.monitor.addAlert({
        id: 'high-memory-usage-default',
        name: 'High Memory Usage',
        condition: 'memory_usage',
        threshold: this.config.thresholds.highMemoryUsage,
        operator: 'gt',
        windowSize: 5 * 60 * 1000, // 5 minutes
        enabled: true,
        severity: 'high',
        cooldown: 10 * 60 * 1000 // 10 minutes
      });
    }
  }
}

/**
 * Global performance integration instance
 */
let globalPerformanceIntegration: PerformanceIntegration | null = null;

/**
 * Get or create global performance integration
 */
export function getPerformanceIntegration(
  strapi?: any,
  config?: Partial<PerformanceIntegrationConfig>
): PerformanceIntegration {
  if (!globalPerformanceIntegration && strapi) {
    globalPerformanceIntegration = new PerformanceIntegration(strapi, config);
  }
  return globalPerformanceIntegration!;
}

/**
 * Set global performance integration
 */
export function setPerformanceIntegration(integration: PerformanceIntegration): void {
  globalPerformanceIntegration = integration;
}

export default PerformanceIntegration;