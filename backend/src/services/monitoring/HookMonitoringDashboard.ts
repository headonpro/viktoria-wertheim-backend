/**
 * Hook Monitoring Dashboard
 * 
 * Real-time monitoring dashboard for lifecycle hooks with status indicators,
 * performance visualizations, and health monitoring.
 * 
 * Features:
 * - Real-time hook execution monitoring
 * - Hook health status indicators
 * - Performance metrics visualization
 * - Error tracking and analysis
 * - System health overview
 * - Alert management
 */

import { EventEmitter } from 'events';
import PerformanceMonitor, { PerformanceStats, PerformanceMetric } from '../logging/PerformanceMonitor';
import ErrorTracker, { TrackedError, ErrorStats } from '../logging/ErrorTracker';
import JobMonitor, { SystemHealthMetrics, JobAlert, JobPerformanceMetrics } from '../JobMonitor';
import { StructuredLogger } from '../logging/StructuredLogger';

/**
 * Hook status information
 */
export interface HookStatus {
  hookName: string;
  contentType: string;
  status: 'healthy' | 'warning' | 'critical' | 'disabled';
  lastExecution?: Date;
  executionCount: number;
  averageExecutionTime: number;
  errorRate: number;
  recentErrors: number;
  isEnabled: boolean;
  configurationStatus: 'valid' | 'invalid' | 'missing';
}

/**
 * Dashboard metrics summary
 */
export interface DashboardMetrics {
  overview: {
    totalHooks: number;
    activeHooks: number;
    healthyHooks: number;
    warningHooks: number;
    criticalHooks: number;
    disabledHooks: number;
    totalExecutions: number;
    averageExecutionTime: number;
    overallErrorRate: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
  };
  performance: {
    slowestHooks: Array<{
      hookName: string;
      averageTime: number;
      trend: 'improving' | 'stable' | 'degrading';
    }>;
    fastestHooks: Array<{
      hookName: string;
      averageTime: number;
    }>;
    executionTrends: Array<{
      timestamp: Date;
      totalExecutions: number;
      averageTime: number;
      errorCount: number;
    }>;
  };
  errors: {
    totalErrors: number;
    recentErrors: number;
    topErrors: Array<{
      message: string;
      count: number;
      hookName: string;
      severity: string;
    }>;
    errorTrends: Array<{
      timestamp: Date;
      errorCount: number;
      errorRate: number;
    }>;
  };
  jobs: {
    systemHealth: SystemHealthMetrics;
    jobMetrics: JobPerformanceMetrics[];
    recentFailures: Array<{
      jobName: string;
      error: string;
      timestamp: Date;
    }>;
  };
}

/**
 * Real-time dashboard event
 */
export interface DashboardEvent {
  type: 'hook_execution' | 'error_occurred' | 'alert_triggered' | 'status_changed';
  timestamp: Date;
  data: any;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfig {
  refreshInterval: number; // milliseconds
  metricsHistorySize: number;
  enableRealTimeUpdates: boolean;
  performanceThresholds: {
    slowHookThreshold: number; // milliseconds
    highErrorRateThreshold: number; // percentage
    criticalErrorRateThreshold: number; // percentage
  };
  retentionPeriod: number; // milliseconds
}

/**
 * Default dashboard configuration
 */
const DEFAULT_CONFIG: DashboardConfig = {
  refreshInterval: 5000, // 5 seconds
  metricsHistorySize: 100,
  enableRealTimeUpdates: true,
  performanceThresholds: {
    slowHookThreshold: 100, // 100ms
    highErrorRateThreshold: 5, // 5%
    criticalErrorRateThreshold: 15 // 15%
  },
  retentionPeriod: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Hook Monitoring Dashboard implementation
 */
export class HookMonitoringDashboard extends EventEmitter {
  private strapi: any;
  private performanceMonitor: PerformanceMonitor;
  private errorTracker: ErrorTracker;
  private jobMonitor: JobMonitor;
  private logger: StructuredLogger;
  private config: DashboardConfig;

  // Dashboard state
  private isRunning: boolean = false;
  private refreshTimer?: NodeJS.Timeout;
  private metricsHistory: DashboardMetrics[] = [];
  private currentMetrics?: DashboardMetrics;
  private hookStatuses: Map<string, HookStatus> = new Map();

  constructor(
    strapi: any,
    performanceMonitor: PerformanceMonitor,
    errorTracker: ErrorTracker,
    jobMonitor: JobMonitor,
    config: Partial<DashboardConfig> = {}
  ) {
    super();
    this.strapi = strapi;
    this.performanceMonitor = performanceMonitor;
    this.errorTracker = errorTracker;
    this.jobMonitor = jobMonitor;
    this.logger = new StructuredLogger(strapi);
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.setupEventListeners();
    this.logger.info('Hook monitoring dashboard initialized');
  }

  /**
   * Start the dashboard
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Dashboard is already running');
      return;
    }

    this.isRunning = true;

    // Initial metrics collection
    this.collectMetrics();

    // Start refresh timer
    if (this.config.enableRealTimeUpdates) {
      this.refreshTimer = setInterval(() => {
        this.collectMetrics();
      }, this.config.refreshInterval);
    }

    this.logger.info('Hook monitoring dashboard started', {
      refreshInterval: this.config.refreshInterval,
      realTimeUpdates: this.config.enableRealTimeUpdates
    });

    this.emit('dashboard_started');
  }

  /**
   * Stop the dashboard
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }

    this.logger.info('Hook monitoring dashboard stopped');
    this.emit('dashboard_stopped');
  }

  /**
   * Get current dashboard metrics
   */
  getCurrentMetrics(): DashboardMetrics | null {
    return this.currentMetrics || null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): DashboardMetrics[] {
    const history = this.metricsHistory;
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get hook status information
   */
  getHookStatuses(): HookStatus[] {
    return Array.from(this.hookStatuses.values())
      .sort((a, b) => {
        // Sort by status priority (critical first)
        const statusPriority = { critical: 0, warning: 1, healthy: 2, disabled: 3 };
        const aPriority = statusPriority[a.status];
        const bPriority = statusPriority[b.status];
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        
        // Then by error rate (highest first)
        return b.errorRate - a.errorRate;
      });
  }

  /**
   * Get hook status by name
   */
  getHookStatus(hookName: string): HookStatus | null {
    return this.hookStatuses.get(hookName) || null;
  }

  /**
   * Get system alerts
   */
  getAlerts(filter?: {
    type?: 'error' | 'warning' | 'info';
    acknowledged?: boolean;
    resolved?: boolean;
  }): JobAlert[] {
    return this.jobMonitor.getAlerts(filter);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const result = this.jobMonitor.acknowledgeAlert(alertId, acknowledgedBy);
    
    if (result) {
      this.emit('alert_acknowledged', { alertId, acknowledgedBy });
      this.logger.info('Alert acknowledged via dashboard', { alertId, acknowledgedBy });
    }
    
    return result;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const result = this.jobMonitor.resolveAlert(alertId);
    
    if (result) {
      this.emit('alert_resolved', { alertId });
      this.logger.info('Alert resolved via dashboard', { alertId });
    }
    
    return result;
  }

  /**
   * Get performance trends for a specific hook
   */
  getHookPerformanceTrends(hookName: string, timeRange: number = 3600000): Array<{
    timestamp: Date;
    executionTime: number;
    success: boolean;
  }> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRange);
    
    return this.performanceMonitor.getMetricsInRange(startTime, endTime, hookName)
      .map(metric => ({
        timestamp: metric.timestamp,
        executionTime: metric.executionTime,
        success: metric.success
      }));
  }

  /**
   * Get error trends for a specific hook
   */
  getHookErrorTrends(hookName: string, timeRange: number = 3600000): Array<{
    timestamp: Date;
    errorCount: number;
    errorRate: number;
  }> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - timeRange);
    
    const errors = this.errorTracker.getErrors({
      hookName,
      startTime,
      endTime
    });

    // Group errors by time intervals (5-minute buckets)
    const bucketSize = 5 * 60 * 1000; // 5 minutes
    const buckets = new Map<number, number>();
    
    for (const error of errors) {
      const bucketTime = Math.floor(error.lastOccurrence.getTime() / bucketSize) * bucketSize;
      buckets.set(bucketTime, (buckets.get(bucketTime) || 0) + error.occurrenceCount);
    }

    // Convert to trend data
    const trends: Array<{ timestamp: Date; errorCount: number; errorRate: number }> = [];
    const currentTime = startTime.getTime();
    
    while (currentTime <= endTime.getTime()) {
      const bucketTime = Math.floor(currentTime / bucketSize) * bucketSize;
      const errorCount = buckets.get(bucketTime) || 0;
      
      // Calculate error rate (would need total executions for accurate rate)
      const errorRate = errorCount > 0 ? errorCount * 0.1 : 0; // Simplified calculation
      
      trends.push({
        timestamp: new Date(bucketTime),
        errorCount,
        errorRate
      });
    }

    return trends;
  }

  /**
   * Force metrics refresh
   */
  refreshMetrics(): void {
    this.collectMetrics();
  }

  /**
   * Update dashboard configuration
   */
  updateConfig(config: Partial<DashboardConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // Restart if refresh interval changed
    if (this.isRunning && oldConfig.refreshInterval !== this.config.refreshInterval) {
      this.stop();
      this.start();
    }

    this.logger.info('Dashboard configuration updated', { 
      oldConfig: oldConfig,
      newConfig: this.config 
    });
  }

  /**
   * Setup event listeners for real-time updates
   */
  private setupEventListeners(): void {
    // Performance monitor events
    this.performanceMonitor.on('metric', (metric: PerformanceMetric) => {
      this.handlePerformanceMetric(metric);
    });

    // Error tracker events
    this.errorTracker.on('error_tracked', (error: TrackedError) => {
      this.handleErrorTracked(error);
    });

    // Job monitor events (alerts)
    // TODO: Implement event system for JobMonitor
    // this.jobMonitor.on('alert', (alert: JobAlert) => {
    //   this.handleAlert(alert);
    // });
  }

  /**
   * Handle performance metric event
   */
  private handlePerformanceMetric(metric: PerformanceMetric): void {
    // Update hook status
    this.updateHookStatus(metric.hookName, metric.contentType);

    // Emit real-time event
    if (this.config.enableRealTimeUpdates) {
      const event: DashboardEvent = {
        type: 'hook_execution',
        timestamp: new Date(),
        data: {
          hookName: metric.hookName,
          contentType: metric.contentType,
          executionTime: metric.executionTime,
          success: metric.success
        }
      };
      
      this.emit('real_time_event', event);
    }
  }

  /**
   * Handle error tracked event
   */
  private handleErrorTracked(error: TrackedError): void {
    // Update hook status
    this.updateHookStatus(error.context.hookName, error.context.contentType);

    // Emit real-time event
    if (this.config.enableRealTimeUpdates) {
      const event: DashboardEvent = {
        type: 'error_occurred',
        timestamp: new Date(),
        data: {
          hookName: error.context.hookName,
          contentType: error.context.contentType,
          errorMessage: error.message,
          severity: error.severity
        }
      };
      
      this.emit('real_time_event', event);
    }
  }

  /**
   * Handle alert event
   */
  private handleAlert(alert: JobAlert): void {
    // Emit real-time event
    if (this.config.enableRealTimeUpdates) {
      const event: DashboardEvent = {
        type: 'alert_triggered',
        timestamp: new Date(),
        data: {
          alertId: alert.id,
          type: alert.type,
          category: alert.category,
          title: alert.title,
          message: alert.message
        }
      };
      
      this.emit('real_time_event', event);
    }
  }

  /**
   * Update hook status based on metrics
   */
  private updateHookStatus(hookName: string, contentType: string): void {
    const performanceStats = this.performanceMonitor.getStats(hookName);
    const errors = this.errorTracker.getErrors({ hookName, limit: 10 });
    
    if (!performanceStats) {
      return;
    }

    const recentErrors = errors.filter(e => 
      (Date.now() - e.lastOccurrence.getTime()) < (60 * 60 * 1000) // Last hour
    ).length;

    const errorRate = performanceStats.errorRate * 100;
    
    // Determine status
    let status: HookStatus['status'] = 'healthy';
    
    if (errorRate >= this.config.performanceThresholds.criticalErrorRateThreshold) {
      status = 'critical';
    } else if (
      errorRate >= this.config.performanceThresholds.highErrorRateThreshold ||
      performanceStats.averageExecutionTime > this.config.performanceThresholds.slowHookThreshold
    ) {
      status = 'warning';
    }

    const hookStatus: HookStatus = {
      hookName,
      contentType,
      status,
      lastExecution: performanceStats.lastExecution,
      executionCount: performanceStats.totalExecutions,
      averageExecutionTime: performanceStats.averageExecutionTime,
      errorRate,
      recentErrors,
      isEnabled: true, // Would need to check configuration
      configurationStatus: 'valid' // Would need to validate configuration
    };

    const previousStatus = this.hookStatuses.get(hookName);
    this.hookStatuses.set(hookName, hookStatus);

    // Emit status change event if status changed
    if (previousStatus && previousStatus.status !== hookStatus.status) {
      const event: DashboardEvent = {
        type: 'status_changed',
        timestamp: new Date(),
        data: {
          hookName,
          previousStatus: previousStatus.status,
          newStatus: hookStatus.status
        }
      };
      
      this.emit('real_time_event', event);
    }
  }

  /**
   * Collect comprehensive metrics
   */
  private collectMetrics(): void {
    try {
      const performanceStats = this.performanceMonitor.getAllStats();
      const performanceSummary = this.performanceMonitor.getSummary();
      const errorStats = this.errorTracker.getStats();
      const systemHealth = this.jobMonitor.getSystemHealth();
      const jobMetrics = this.jobMonitor.getJobMetrics();

      // Calculate overview metrics
      const overview = {
        totalHooks: performanceStats.length,
        activeHooks: performanceStats.filter(s => s.totalExecutions > 0).length,
        healthyHooks: Array.from(this.hookStatuses.values()).filter(s => s.status === 'healthy').length,
        warningHooks: Array.from(this.hookStatuses.values()).filter(s => s.status === 'warning').length,
        criticalHooks: Array.from(this.hookStatuses.values()).filter(s => s.status === 'critical').length,
        disabledHooks: Array.from(this.hookStatuses.values()).filter(s => s.status === 'disabled').length,
        totalExecutions: performanceSummary.totalExecutions,
        averageExecutionTime: performanceSummary.averageExecutionTime,
        overallErrorRate: performanceSummary.overallErrorRate * 100,
        systemHealth: this.determineOverallSystemHealth(systemHealth)
      };

      // Calculate performance metrics
      const performance = {
        slowestHooks: performanceStats
          .sort((a, b) => b.averageExecutionTime - a.averageExecutionTime)
          .slice(0, 5)
          .map(stats => ({
            hookName: stats.hookName,
            averageTime: stats.averageExecutionTime,
            trend: stats.trend
          })),
        fastestHooks: performanceStats
          .filter(s => s.totalExecutions > 0)
          .sort((a, b) => a.averageExecutionTime - b.averageExecutionTime)
          .slice(0, 5)
          .map(stats => ({
            hookName: stats.hookName,
            averageTime: stats.averageExecutionTime
          })),
        executionTrends: this.calculateExecutionTrends()
      };

      // Calculate error metrics
      const errors = {
        totalErrors: errorStats.totalErrors,
        recentErrors: errorStats.recentErrors.length,
        topErrors: errorStats.topErrors.slice(0, 5).map(topError => ({
          message: topError.error.message,
          count: topError.occurrences,
          hookName: topError.error.context.hookName,
          severity: topError.error.severity
        })),
        errorTrends: this.calculateErrorTrends()
      };

      // Job metrics
      const jobs = {
        systemHealth,
        jobMetrics,
        recentFailures: jobMetrics
          .flatMap(metric => metric.recentFailures)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10)
          .map(failure => ({
            jobName: failure.jobName,
            error: failure.error,
            timestamp: failure.timestamp
          }))
      };

      // Create dashboard metrics
      const metrics: DashboardMetrics = {
        overview,
        performance,
        errors,
        jobs
      };

      this.currentMetrics = metrics;

      // Add to history
      this.metricsHistory.push(metrics);
      
      // Limit history size
      if (this.metricsHistory.length > this.config.metricsHistorySize) {
        this.metricsHistory = this.metricsHistory.slice(-this.config.metricsHistorySize);
      }

      // Emit metrics update event
      this.emit('metrics_updated', metrics);

      this.logger.debug('Dashboard metrics collected', {
        totalHooks: overview.totalHooks,
        systemHealth: overview.systemHealth,
        totalErrors: errors.totalErrors
      });

    } catch (error) {
      this.logger.error('Failed to collect dashboard metrics', error);
    }
  }

  /**
   * Determine overall system health
   */
  private determineOverallSystemHealth(systemHealth: SystemHealthMetrics): 'healthy' | 'warning' | 'critical' {
    const statuses = [
      systemHealth.queueHealth.status,
      systemHealth.workerHealth.status,
      systemHealth.performanceHealth.status,
      systemHealth.errorHealth.status
    ];

    if (statuses.includes('critical')) {
      return 'critical';
    }
    if (statuses.includes('warning')) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Calculate execution trends
   */
  private calculateExecutionTrends(): Array<{
    timestamp: Date;
    totalExecutions: number;
    averageTime: number;
    errorCount: number;
  }> {
    // Simplified trend calculation using metrics history
    return this.metricsHistory.slice(-20).map(metrics => ({
      timestamp: new Date(), // Would use actual timestamp from metrics
      totalExecutions: metrics.overview.totalExecutions,
      averageTime: metrics.overview.averageExecutionTime,
      errorCount: metrics.errors.recentErrors
    }));
  }

  /**
   * Calculate error trends
   */
  private calculateErrorTrends(): Array<{
    timestamp: Date;
    errorCount: number;
    errorRate: number;
  }> {
    // Simplified trend calculation using metrics history
    return this.metricsHistory.slice(-20).map(metrics => ({
      timestamp: new Date(), // Would use actual timestamp from metrics
      errorCount: metrics.errors.recentErrors,
      errorRate: metrics.overview.overallErrorRate
    }));
  }
}

export default HookMonitoringDashboard;