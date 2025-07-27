/**
 * Performance Monitor
 * 
 * Comprehensive performance monitoring system for lifecycle hooks
 * with execution time tracking, metrics collection, and alerting.
 * 
 * Features:
 * - Hook execution time tracking
 * - Performance metrics collection and aggregation
 * - Threshold-based alerting
 * - Performance trend analysis
 * - Resource usage monitoring
 * - Bottleneck identification
 */

import { EventEmitter } from 'events';

/**
 * Performance metric data point
 */
export interface PerformanceMetric {
  timestamp: Date;
  hookName: string;
  contentType: string;
  hookType: string;
  executionTime: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  cpuUsage?: {
    user: number;
    system: number;
  };
  success: boolean;
  error?: string;
  entityId?: string | number;
  operationId?: string;
  requestId?: string;
}

/**
 * Aggregated performance statistics
 */
export interface PerformanceStats {
  hookName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  p50ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  errorRate: number;
  throughput: number; // executions per second
  lastExecution: Date;
  trend: 'improving' | 'stable' | 'degrading';
}

/**
 * Performance alert configuration
 */
export interface PerformanceAlert {
  id: string;
  name: string;
  hookName?: string;
  contentType?: string;
  condition: 'execution_time' | 'error_rate' | 'throughput' | 'memory_usage';
  threshold: number;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  windowSize: number; // in milliseconds
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown: number; // minimum time between alerts in milliseconds
  lastTriggered?: Date;
}

/**
 * Performance alert event
 */
export interface PerformanceAlertEvent {
  alert: PerformanceAlert;
  value: number;
  threshold: number;
  timestamp: Date;
  context: {
    hookName?: string;
    contentType?: string;
    recentMetrics: PerformanceMetric[];
  };
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceMonitorConfig {
  enabled: boolean;
  collectMemoryMetrics: boolean;
  collectCpuMetrics: boolean;
  metricsRetentionTime: number; // in milliseconds
  aggregationInterval: number; // in milliseconds
  alertCheckInterval: number; // in milliseconds
  maxMetricsInMemory: number;
  enableTrendAnalysis: boolean;
  trendAnalysisWindow: number; // in milliseconds
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: PerformanceMonitorConfig = {
  enabled: true,
  collectMemoryMetrics: true,
  collectCpuMetrics: false, // CPU metrics can be expensive
  metricsRetentionTime: 24 * 60 * 60 * 1000, // 24 hours
  aggregationInterval: 60 * 1000, // 1 minute
  alertCheckInterval: 30 * 1000, // 30 seconds
  maxMetricsInMemory: 10000,
  enableTrendAnalysis: true,
  trendAnalysisWindow: 60 * 60 * 1000 // 1 hour
};

/**
 * Performance timer for measuring execution time
 */
export class PerformanceTimer {
  private startTime: bigint;
  private startMemory?: NodeJS.MemoryUsage;
  private startCpuUsage?: NodeJS.CpuUsage;
  private monitor: PerformanceMonitor;
  private hookName: string;
  private contentType: string;
  private hookType: string;
  private entityId?: string | number;
  private operationId?: string;
  private requestId?: string;

  constructor(
    monitor: PerformanceMonitor,
    hookName: string,
    contentType: string,
    hookType: string,
    options?: {
      entityId?: string | number;
      operationId?: string;
      requestId?: string;
    }
  ) {
    this.monitor = monitor;
    this.hookName = hookName;
    this.contentType = contentType;
    this.hookType = hookType;
    this.entityId = options?.entityId;
    this.operationId = options?.operationId;
    this.requestId = options?.requestId;
    
    this.startTime = process.hrtime.bigint();
    
    if (monitor.getConfig().collectMemoryMetrics) {
      this.startMemory = process.memoryUsage();
    }
    
    if (monitor.getConfig().collectCpuMetrics) {
      this.startCpuUsage = process.cpuUsage();
    }
  }

  /**
   * Stop timer and record successful execution
   */
  success(): number {
    return this.stop(true);
  }

  /**
   * Stop timer and record failed execution
   */
  failure(error?: Error): number {
    return this.stop(false, error?.message);
  }

  /**
   * Stop timer and record metric
   */
  private stop(success: boolean, error?: string): number {
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - this.startTime) / 1_000_000; // Convert to milliseconds

    const metric: PerformanceMetric = {
      timestamp: new Date(),
      hookName: this.hookName,
      contentType: this.contentType,
      hookType: this.hookType,
      executionTime,
      success,
      error,
      entityId: this.entityId,
      operationId: this.operationId,
      requestId: this.requestId
    };

    // Add memory metrics if enabled
    if (this.startMemory && this.monitor.getConfig().collectMemoryMetrics) {
      const currentMemory = process.memoryUsage();
      metric.memoryUsage = {
        heapUsed: currentMemory.heapUsed - this.startMemory.heapUsed,
        heapTotal: currentMemory.heapTotal,
        external: currentMemory.external - this.startMemory.external,
        rss: currentMemory.rss - this.startMemory.rss
      };
    }

    // Add CPU metrics if enabled
    if (this.startCpuUsage && this.monitor.getConfig().collectCpuMetrics) {
      const currentCpuUsage = process.cpuUsage(this.startCpuUsage);
      metric.cpuUsage = {
        user: currentCpuUsage.user,
        system: currentCpuUsage.system
      };
    }

    this.monitor.recordMetric(metric);
    return executionTime;
  }
}

/**
 * Performance monitor implementation
 */
export class PerformanceMonitor extends EventEmitter {
  private config: PerformanceMonitorConfig;
  private metrics: PerformanceMetric[] = [];
  private stats: Map<string, PerformanceStats> = new Map();
  private alerts: Map<string, PerformanceAlert> = new Map();
  private aggregationTimer?: NodeJS.Timeout;
  private alertTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<PerformanceMonitorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.enabled) {
      this.startTimers();
    }
  }

  /**
   * Create a performance timer
   */
  createTimer(
    hookName: string,
    contentType: string,
    hookType: string,
    options?: {
      entityId?: string | number;
      operationId?: string;
      requestId?: string;
    }
  ): PerformanceTimer {
    if (!this.config.enabled) {
      return new NoOpTimer();
    }

    return new PerformanceTimer(this, hookName, contentType, hookType, options);
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    if (!this.config.enabled) {
      return;
    }

    this.metrics.push(metric);

    // Limit metrics in memory
    if (this.metrics.length > this.config.maxMetricsInMemory) {
      this.metrics = this.metrics.slice(-this.config.maxMetricsInMemory);
    }

    // Emit metric event
    this.emit('metric', metric);
  }

  /**
   * Get performance statistics for a hook
   */
  getStats(hookName: string): PerformanceStats | null {
    return this.stats.get(hookName) || null;
  }

  /**
   * Get all performance statistics
   */
  getAllStats(): PerformanceStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(hookName?: string, limit: number = 100): PerformanceMetric[] {
    let filteredMetrics = this.metrics;
    
    if (hookName) {
      filteredMetrics = this.metrics.filter(m => m.hookName === hookName);
    }

    return filteredMetrics.slice(-limit);
  }

  /**
   * Get metrics within time range
   */
  getMetricsInRange(startTime: Date, endTime: Date, hookName?: string): PerformanceMetric[] {
    return this.metrics.filter(metric => {
      const inTimeRange = metric.timestamp >= startTime && metric.timestamp <= endTime;
      const matchesHook = !hookName || metric.hookName === hookName;
      return inTimeRange && matchesHook;
    });
  }

  /**
   * Add performance alert
   */
  addAlert(alert: PerformanceAlert): void {
    this.alerts.set(alert.id, alert);
  }

  /**
   * Remove performance alert
   */
  removeAlert(alertId: string): boolean {
    return this.alerts.delete(alertId);
  }

  /**
   * Get all alerts
   */
  getAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Enable/disable alert
   */
  toggleAlert(alertId: string, enabled: boolean): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get slow hooks above threshold
   */
  getSlowHooks(threshold: number = 100): Array<{ hookName: string; averageTime: number; stats: PerformanceStats }> {
    return Array.from(this.stats.values())
      .filter(stats => stats.averageExecutionTime > threshold)
      .map(stats => ({
        hookName: stats.hookName,
        averageTime: stats.averageExecutionTime,
        stats
      }))
      .sort((a, b) => b.averageTime - a.averageTime);
  }

  /**
   * Get hooks with high error rates
   */
  getHighErrorRateHooks(threshold: number = 0.05): Array<{ hookName: string; errorRate: number; stats: PerformanceStats }> {
    return Array.from(this.stats.values())
      .filter(stats => stats.errorRate > threshold)
      .map(stats => ({
        hookName: stats.hookName,
        errorRate: stats.errorRate,
        stats
      }))
      .sort((a, b) => b.errorRate - a.errorRate);
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalHooks: number;
    totalExecutions: number;
    averageExecutionTime: number;
    overallErrorRate: number;
    slowHooks: number;
    highErrorRateHooks: number;
    activeAlerts: number;
  } {
    const allStats = Array.from(this.stats.values());
    const totalExecutions = allStats.reduce((sum, stats) => sum + stats.totalExecutions, 0);
    const totalFailures = allStats.reduce((sum, stats) => sum + stats.failedExecutions, 0);
    const totalExecutionTime = allStats.reduce((sum, stats) => sum + (stats.averageExecutionTime * stats.totalExecutions), 0);

    return {
      totalHooks: allStats.length,
      totalExecutions,
      averageExecutionTime: totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0,
      overallErrorRate: totalExecutions > 0 ? totalFailures / totalExecutions : 0,
      slowHooks: this.getSlowHooks(100).length,
      highErrorRateHooks: this.getHighErrorRateHooks(0.05).length,
      activeAlerts: Array.from(this.alerts.values()).filter(a => a.enabled).length
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PerformanceMonitorConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };

    if (this.config.enabled && !wasEnabled) {
      this.startTimers();
    } else if (!this.config.enabled && wasEnabled) {
      this.stopTimers();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): PerformanceMonitorConfig {
    return { ...this.config };
  }

  /**
   * Clear all metrics and statistics
   */
  clear(): void {
    this.metrics = [];
    this.stats.clear();
  }

  /**
   * Start monitoring timers
   */
  private startTimers(): void {
    // Aggregation timer
    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics();
    }, this.config.aggregationInterval);

    // Alert checking timer
    this.alertTimer = setInterval(() => {
      this.checkAlerts();
    }, this.config.alertCheckInterval);

    // Cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Stop monitoring timers
   */
  private stopTimers(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = undefined;
    }

    if (this.alertTimer) {
      clearInterval(this.alertTimer);
      this.alertTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Aggregate metrics into statistics
   */
  private aggregateMetrics(): void {
    const hookGroups = new Map<string, PerformanceMetric[]>();

    // Group metrics by hook name
    for (const metric of this.metrics) {
      if (!hookGroups.has(metric.hookName)) {
        hookGroups.set(metric.hookName, []);
      }
      hookGroups.get(metric.hookName)!.push(metric);
    }

    // Calculate statistics for each hook
    for (const [hookName, hookMetrics] of hookGroups.entries()) {
      const stats = this.calculateStats(hookName, hookMetrics);
      this.stats.set(hookName, stats);
    }
  }

  /**
   * Calculate statistics for a hook
   */
  private calculateStats(hookName: string, metrics: PerformanceMetric[]): PerformanceStats {
    if (metrics.length === 0) {
      return {
        hookName,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
        minExecutionTime: 0,
        maxExecutionTime: 0,
        p50ExecutionTime: 0,
        p95ExecutionTime: 0,
        p99ExecutionTime: 0,
        errorRate: 0,
        throughput: 0,
        lastExecution: new Date(),
        trend: 'stable'
      };
    }

    const successfulMetrics = metrics.filter(m => m.success);
    const failedMetrics = metrics.filter(m => !m.success);
    const executionTimes = metrics.map(m => m.executionTime).sort((a, b) => a - b);

    const totalExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0);
    const averageExecutionTime = totalExecutionTime / executionTimes.length;

    // Calculate percentiles
    const p50Index = Math.floor(executionTimes.length * 0.5);
    const p95Index = Math.floor(executionTimes.length * 0.95);
    const p99Index = Math.floor(executionTimes.length * 0.99);

    // Calculate throughput (executions per second)
    const timeSpan = metrics[metrics.length - 1].timestamp.getTime() - metrics[0].timestamp.getTime();
    const throughput = timeSpan > 0 ? (metrics.length / timeSpan) * 1000 : 0;

    // Calculate trend
    const trend = this.config.enableTrendAnalysis ? this.calculateTrend(hookName, metrics) : 'stable';

    return {
      hookName,
      totalExecutions: metrics.length,
      successfulExecutions: successfulMetrics.length,
      failedExecutions: failedMetrics.length,
      averageExecutionTime,
      minExecutionTime: executionTimes[0] || 0,
      maxExecutionTime: executionTimes[executionTimes.length - 1] || 0,
      p50ExecutionTime: executionTimes[p50Index] || 0,
      p95ExecutionTime: executionTimes[p95Index] || 0,
      p99ExecutionTime: executionTimes[p99Index] || 0,
      errorRate: metrics.length > 0 ? failedMetrics.length / metrics.length : 0,
      throughput,
      lastExecution: metrics[metrics.length - 1].timestamp,
      trend
    };
  }

  /**
   * Calculate performance trend
   */
  private calculateTrend(hookName: string, metrics: PerformanceMetric[]): 'improving' | 'stable' | 'degrading' {
    if (metrics.length < 10) {
      return 'stable'; // Not enough data
    }

    const now = Date.now();
    const windowStart = now - this.config.trendAnalysisWindow;
    
    const recentMetrics = metrics.filter(m => m.timestamp.getTime() > windowStart);
    const olderMetrics = metrics.filter(m => m.timestamp.getTime() <= windowStart);

    if (recentMetrics.length === 0 || olderMetrics.length === 0) {
      return 'stable';
    }

    const recentAvg = recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / recentMetrics.length;
    const olderAvg = olderMetrics.reduce((sum, m) => sum + m.executionTime, 0) / olderMetrics.length;

    const changePercent = (recentAvg - olderAvg) / olderAvg;

    if (changePercent > 0.1) {
      return 'degrading';
    } else if (changePercent < -0.1) {
      return 'improving';
    } else {
      return 'stable';
    }
  }

  /**
   * Check performance alerts
   */
  private checkAlerts(): void {
    const now = new Date();

    for (const alert of this.alerts.values()) {
      if (!alert.enabled) {
        continue;
      }

      // Check cooldown
      if (alert.lastTriggered && (now.getTime() - alert.lastTriggered.getTime()) < alert.cooldown) {
        continue;
      }

      const shouldTrigger = this.evaluateAlert(alert, now);
      if (shouldTrigger) {
        alert.lastTriggered = now;
        this.triggerAlert(alert, now);
      }
    }
  }

  /**
   * Evaluate if alert should trigger
   */
  private evaluateAlert(alert: PerformanceAlert, now: Date): boolean {
    const windowStart = new Date(now.getTime() - alert.windowSize);
    let relevantMetrics = this.getMetricsInRange(windowStart, now);

    // Filter by hook name if specified
    if (alert.hookName) {
      relevantMetrics = relevantMetrics.filter(m => m.hookName === alert.hookName);
    }

    // Filter by content type if specified
    if (alert.contentType) {
      relevantMetrics = relevantMetrics.filter(m => m.contentType === alert.contentType);
    }

    if (relevantMetrics.length === 0) {
      return false;
    }

    let value: number;

    switch (alert.condition) {
      case 'execution_time':
        value = relevantMetrics.reduce((sum, m) => sum + m.executionTime, 0) / relevantMetrics.length;
        break;
      case 'error_rate':
        const failures = relevantMetrics.filter(m => !m.success).length;
        value = failures / relevantMetrics.length;
        break;
      case 'throughput':
        const timeSpan = relevantMetrics[relevantMetrics.length - 1].timestamp.getTime() - 
                        relevantMetrics[0].timestamp.getTime();
        value = timeSpan > 0 ? (relevantMetrics.length / timeSpan) * 1000 : 0;
        break;
      case 'memory_usage':
        const memoryMetrics = relevantMetrics.filter(m => m.memoryUsage);
        if (memoryMetrics.length === 0) return false;
        value = memoryMetrics.reduce((sum, m) => sum + (m.memoryUsage?.heapUsed || 0), 0) / memoryMetrics.length;
        break;
      default:
        return false;
    }

    return this.compareValue(value, alert.operator, alert.threshold);
  }

  /**
   * Compare value with threshold using operator
   */
  private compareValue(value: number, operator: PerformanceAlert['operator'], threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  /**
   * Trigger performance alert
   */
  private triggerAlert(alert: PerformanceAlert, timestamp: Date): void {
    const windowStart = new Date(timestamp.getTime() - alert.windowSize);
    const recentMetrics = this.getMetricsInRange(windowStart, timestamp);

    const alertEvent: PerformanceAlertEvent = {
      alert,
      value: 0, // Will be calculated based on condition
      threshold: alert.threshold,
      timestamp,
      context: {
        hookName: alert.hookName,
        contentType: alert.contentType,
        recentMetrics: recentMetrics.slice(-10) // Last 10 metrics for context
      }
    };

    this.emit('alert', alertEvent);
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.config.metricsRetentionTime;
    this.metrics = this.metrics.filter(metric => metric.timestamp.getTime() > cutoffTime);
  }
}

/**
 * No-op timer for when monitoring is disabled
 */
class NoOpTimer extends PerformanceTimer {
  constructor() {
    super(null as any, '', '', '');
  }

  success(): number {
    return 0;
  }

  failure(): number {
    return 0;
  }
}

export default PerformanceMonitor;