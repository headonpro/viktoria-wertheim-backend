/**
 * Job Monitoring System
 * 
 * Implements job status tracking, performance monitoring, and failure alerting.
 * Supports Requirements 7.3 (performance monitoring) and 7.4 (alerting).
 */

import { BackgroundJobQueue, QueueStatistics, BackgroundJob, JobStatus } from './BackgroundJobQueue';
import { JobScheduler, ScheduledJob } from './JobScheduler';

/**
 * Performance metrics for jobs
 */
interface JobPerformanceMetrics {
  jobName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  lastRun?: Date;
  successRate: number;
  recentFailures: JobFailure[];
}

/**
 * Job failure information
 */
interface JobFailure {
  jobId: string;
  jobName: string;
  error: string;
  timestamp: Date;
  executionTime: number;
  retryCount: number;
}

/**
 * System health metrics
 */
interface SystemHealthMetrics {
  queueHealth: {
    status: 'healthy' | 'warning' | 'critical';
    queueLength: number;
    averageWaitTime: number;
    oldestPendingJob?: Date;
  };
  workerHealth: {
    status: 'healthy' | 'warning' | 'critical';
    activeWorkers: number;
    totalWorkers: number;
    averageJobsPerWorker: number;
  };
  performanceHealth: {
    status: 'healthy' | 'warning' | 'critical';
    averageExecutionTime: number;
    slowJobs: string[];
    timeoutRate: number;
  };
  errorHealth: {
    status: 'healthy' | 'warning' | 'critical';
    errorRate: number;
    recentErrors: number;
    criticalErrors: string[];
  };
}

/**
 * Alert types
 */
type AlertType = 'error' | 'warning' | 'info';
type AlertCategory = 'performance' | 'failure' | 'queue' | 'system';

/**
 * Alert interface
 */
interface JobAlert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  title: string;
  message: string;
  jobId?: string;
  jobName?: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: any;
}

/**
 * Alert rule configuration
 */
interface AlertRule {
  id: string;
  name: string;
  category: AlertCategory;
  enabled: boolean;
  condition: (metrics: SystemHealthMetrics, jobMetrics: Map<string, JobPerformanceMetrics>) => boolean;
  alertType: AlertType;
  message: string;
  cooldownMs: number; // Minimum time between alerts of this type
  lastTriggered?: Date;
}

/**
 * Monitoring configuration
 */
interface MonitoringConfig {
  metricsRetentionDays: number;
  alertRetentionDays: number;
  performanceThresholds: {
    slowJobThresholdMs: number;
    highErrorRatePercent: number;
    queueBacklogThreshold: number;
    workerUtilizationThreshold: number;
  };
  alerting: {
    enabled: boolean;
    channels: string[]; // email, webhook, log, etc.
  };
  healthCheckInterval: number;
}

/**
 * Default monitoring configuration
 */
const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  metricsRetentionDays: 30,
  alertRetentionDays: 7,
  performanceThresholds: {
    slowJobThresholdMs: 5000, // 5 seconds
    highErrorRatePercent: 10, // 10%
    queueBacklogThreshold: 50,
    workerUtilizationThreshold: 80 // 80%
  },
  alerting: {
    enabled: true,
    channels: ['log']
  },
  healthCheckInterval: 30000 // 30 seconds
};

/**
 * Job Monitor Class
 */
export class JobMonitor {
  private strapi: any;
  private jobQueue: BackgroundJobQueue;
  private jobScheduler?: JobScheduler;
  private config: MonitoringConfig;
  
  // Metrics storage
  private jobMetrics: Map<string, JobPerformanceMetrics> = new Map();
  private jobExecutionHistory: Map<string, Date[]> = new Map(); // jobName -> execution times
  private alerts: Map<string, JobAlert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  
  // Monitoring state
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsCleanupInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private lastHealthCheck?: Date;

  constructor(
    strapi: any, 
    jobQueue: BackgroundJobQueue, 
    jobScheduler?: JobScheduler,
    config: Partial<MonitoringConfig> = {}
  ) {
    this.strapi = strapi;
    this.jobQueue = jobQueue;
    this.jobScheduler = jobScheduler;
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config };
    
    this.initializeDefaultAlertRules();
    this.logInfo('JobMonitor initialized');
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.isRunning) {
      this.logWarn('Job monitor is already running');
      return;
    }

    this.isRunning = true;
    
    // Start health check interval
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
    
    // Start metrics cleanup interval
    this.metricsCleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
    
    this.logInfo('Job monitor started', {
      healthCheckInterval: this.config.healthCheckInterval,
      alertingEnabled: this.config.alerting.enabled
    });
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    if (this.metricsCleanupInterval) {
      clearInterval(this.metricsCleanupInterval);
      this.metricsCleanupInterval = undefined;
    }
    
    this.logInfo('Job monitor stopped');
  }

  /**
   * Record job execution
   */
  recordJobExecution(
    jobId: string,
    jobName: string,
    status: JobStatus,
    executionTime: number,
    error?: string
  ): void {
    // Update job metrics
    let metrics = this.jobMetrics.get(jobName);
    if (!metrics) {
      metrics = {
        jobName,
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        averageExecutionTime: 0,
        minExecutionTime: Infinity,
        maxExecutionTime: 0,
        successRate: 0,
        recentFailures: []
      };
      this.jobMetrics.set(jobName, metrics);
    }

    // Update metrics
    metrics.totalRuns++;
    metrics.lastRun = new Date();
    
    if (status === 'completed') {
      metrics.successfulRuns++;
    } else if (status === 'failed') {
      metrics.failedRuns++;
      
      // Record failure
      const failure: JobFailure = {
        jobId,
        jobName,
        error: error || 'Unknown error',
        timestamp: new Date(),
        executionTime,
        retryCount: 0 // Would need to get this from job data
      };
      
      metrics.recentFailures.push(failure);
      
      // Keep only recent failures (last 10)
      if (metrics.recentFailures.length > 10) {
        metrics.recentFailures = metrics.recentFailures.slice(-10);
      }
    }

    // Update execution time metrics
    if (executionTime > 0) {
      metrics.minExecutionTime = Math.min(metrics.minExecutionTime, executionTime);
      metrics.maxExecutionTime = Math.max(metrics.maxExecutionTime, executionTime);
      
      // Calculate new average
      const totalTime = (metrics.averageExecutionTime * (metrics.totalRuns - 1)) + executionTime;
      metrics.averageExecutionTime = totalTime / metrics.totalRuns;
    }

    // Update success rate
    metrics.successRate = (metrics.successfulRuns / metrics.totalRuns) * 100;

    // Record execution time for trend analysis
    let executionHistory = this.jobExecutionHistory.get(jobName);
    if (!executionHistory) {
      executionHistory = [];
      this.jobExecutionHistory.set(jobName, executionHistory);
    }
    executionHistory.push(new Date());
    
    // Keep only recent executions (last 100)
    if (executionHistory.length > 100) {
      this.jobExecutionHistory.set(jobName, executionHistory.slice(-100));
    }

    this.logDebug(`Job execution recorded: ${jobName}`, {
      jobId,
      status,
      executionTime,
      totalRuns: metrics.totalRuns,
      successRate: metrics.successRate
    });
  }

  /**
   * Get job performance metrics
   */
  getJobMetrics(jobName?: string): JobPerformanceMetrics[] {
    if (jobName) {
      const metrics = this.jobMetrics.get(jobName);
      return metrics ? [metrics] : [];
    }
    
    return Array.from(this.jobMetrics.values())
      .sort((a, b) => b.totalRuns - a.totalRuns);
  }

  /**
   * Get system health metrics
   */
  getSystemHealth(): SystemHealthMetrics {
    const queueStats = this.jobQueue.getStatistics();
    const now = new Date();

    // Queue health
    const queueHealth = {
      status: this.determineQueueHealthStatus(queueStats),
      queueLength: queueStats.queueLength,
      averageWaitTime: this.calculateAverageWaitTime(),
      oldestPendingJob: this.getOldestPendingJobTime()
    };

    // Worker health
    const workerHealth = {
      status: this.determineWorkerHealthStatus(queueStats),
      activeWorkers: queueStats.activeWorkers,
      totalWorkers: 3, // From queue config
      averageJobsPerWorker: queueStats.activeWorkers > 0 ? 
        queueStats.completedJobs / queueStats.activeWorkers : 0
    };

    // Performance health
    const performanceHealth = {
      status: this.determinePerformanceHealthStatus(),
      averageExecutionTime: queueStats.averageExecutionTime,
      slowJobs: this.getSlowJobs(),
      timeoutRate: this.calculateTimeoutRate()
    };

    // Error health
    const errorHealth = {
      status: this.determineErrorHealthStatus(),
      errorRate: this.calculateOverallErrorRate(),
      recentErrors: this.getRecentErrorCount(),
      criticalErrors: this.getCriticalErrors()
    };

    return {
      queueHealth,
      workerHealth,
      performanceHealth,
      errorHealth
    };
  }

  /**
   * Get active alerts
   */
  getAlerts(filter?: {
    type?: AlertType;
    category?: AlertCategory;
    acknowledged?: boolean;
    resolved?: boolean;
  }): JobAlert[] {
    let alerts = Array.from(this.alerts.values());

    if (filter) {
      if (filter.type) {
        alerts = alerts.filter(alert => alert.type === filter.type);
      }
      if (filter.category) {
        alerts = alerts.filter(alert => alert.category === filter.category);
      }
      if (filter.acknowledged !== undefined) {
        alerts = alerts.filter(alert => alert.acknowledged === filter.acknowledged);
      }
      if (filter.resolved !== undefined) {
        alerts = alerts.filter(alert => alert.resolved === filter.resolved);
      }
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.logInfo(`Alert acknowledged: ${alert.title}`, {
      alertId,
      acknowledgedBy
    });

    return true;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.logInfo(`Alert resolved: ${alert.title}`, { alertId });
    return true;
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.logInfo(`Alert rule added: ${rule.name}`, { ruleId: rule.id });
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const removed = this.alertRules.delete(ruleId);
    if (removed) {
      this.logInfo(`Alert rule removed`, { ruleId });
    }
    return removed;
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.lastHealthCheck = new Date();
      
      // Get current system health
      const health = this.getSystemHealth();
      
      // Check alert rules
      this.checkAlertRules(health);
      
      // Update job metrics from queue
      this.updateMetricsFromQueue();
      
      this.logDebug('Health check completed', {
        queueStatus: health.queueHealth.status,
        workerStatus: health.workerHealth.status,
        performanceStatus: health.performanceHealth.status,
        errorStatus: health.errorHealth.status
      });
      
    } catch (error) {
      this.logError('Health check failed', error);
    }
  }

  /**
   * Check alert rules and trigger alerts
   */
  private checkAlertRules(health: SystemHealthMetrics): void {
    const now = new Date();

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) {
        continue;
      }

      // Check cooldown
      if (rule.lastTriggered) {
        const timeSinceLastAlert = now.getTime() - rule.lastTriggered.getTime();
        if (timeSinceLastAlert < rule.cooldownMs) {
          continue;
        }
      }

      // Check condition
      try {
        if (rule.condition(health, this.jobMetrics)) {
          this.triggerAlert(rule, health);
          rule.lastTriggered = now;
        }
      } catch (error) {
        this.logError(`Alert rule evaluation failed: ${rule.name}`, error);
      }
    }
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule, health: SystemHealthMetrics): void {
    const alertId = this.generateAlertId(rule.id);
    
    const alert: JobAlert = {
      id: alertId,
      type: rule.alertType,
      category: rule.category,
      title: rule.name,
      message: rule.message,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      metadata: { health }
    };

    this.alerts.set(alertId, alert);

    // Send alert through configured channels
    this.sendAlert(alert);

    this.logWarn(`Alert triggered: ${rule.name}`, {
      alertId,
      type: rule.alertType,
      category: rule.category
    });
  }

  /**
   * Send alert through configured channels
   */
  private sendAlert(alert: JobAlert): void {
    for (const channel of this.config.alerting.channels) {
      try {
        switch (channel) {
          case 'log':
            this.logAlert(alert);
            break;
          case 'webhook':
            // Would implement webhook sending
            break;
          case 'email':
            // Would implement email sending
            break;
        }
      } catch (error) {
        this.logError(`Failed to send alert via ${channel}`, error);
      }
    }
  }

  /**
   * Log alert
   */
  private logAlert(alert: JobAlert): void {
    const logLevel = alert.type === 'error' ? 'error' : 
                    alert.type === 'warning' ? 'warn' : 'info';
    
    this.strapi?.log?.[logLevel](`[ALERT] ${alert.title}: ${alert.message}`, {
      alertId: alert.id,
      category: alert.category,
      timestamp: alert.timestamp
    });
  }

  /**
   * Update metrics from job queue
   */
  private updateMetricsFromQueue(): void {
    // Get recent jobs from queue and update metrics
    const recentJobs = this.jobQueue.getJobs({ limit: 100 });
    
    for (const job of recentJobs) {
      if (job.completedAt && job.executionTime !== undefined) {
        this.recordJobExecution(
          job.id,
          job.name,
          job.status,
          job.executionTime,
          job.error
        );
      }
    }
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    // High error rate alert
    this.addAlertRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      category: 'failure',
      enabled: true,
      condition: (health) => health.errorHealth.errorRate > this.config.performanceThresholds.highErrorRatePercent,
      alertType: 'error',
      message: `Error rate is above ${this.config.performanceThresholds.highErrorRatePercent}%`,
      cooldownMs: 5 * 60 * 1000 // 5 minutes
    });

    // Queue backlog alert
    this.addAlertRule({
      id: 'queue-backlog',
      name: 'Queue Backlog',
      category: 'queue',
      enabled: true,
      condition: (health) => health.queueHealth.queueLength > this.config.performanceThresholds.queueBacklogThreshold,
      alertType: 'warning',
      message: `Queue backlog is above ${this.config.performanceThresholds.queueBacklogThreshold} jobs`,
      cooldownMs: 2 * 60 * 1000 // 2 minutes
    });

    // Slow jobs alert
    this.addAlertRule({
      id: 'slow-jobs',
      name: 'Slow Jobs Detected',
      category: 'performance',
      enabled: true,
      condition: (health) => health.performanceHealth.slowJobs.length > 0,
      alertType: 'warning',
      message: 'Jobs are running slower than expected',
      cooldownMs: 10 * 60 * 1000 // 10 minutes
    });

    // Worker utilization alert
    this.addAlertRule({
      id: 'high-worker-utilization',
      name: 'High Worker Utilization',
      category: 'system',
      enabled: true,
      condition: (health) => {
        const utilization = (health.workerHealth.activeWorkers / health.workerHealth.totalWorkers) * 100;
        return utilization > this.config.performanceThresholds.workerUtilizationThreshold;
      },
      alertType: 'warning',
      message: `Worker utilization is above ${this.config.performanceThresholds.workerUtilizationThreshold}%`,
      cooldownMs: 5 * 60 * 1000 // 5 minutes
    });
  }

  /**
   * Helper methods for health status determination
   */
  private determineQueueHealthStatus(stats: QueueStatistics): 'healthy' | 'warning' | 'critical' {
    if (stats.queueLength > this.config.performanceThresholds.queueBacklogThreshold * 2) {
      return 'critical';
    }
    if (stats.queueLength > this.config.performanceThresholds.queueBacklogThreshold) {
      return 'warning';
    }
    return 'healthy';
  }

  private determineWorkerHealthStatus(stats: QueueStatistics): 'healthy' | 'warning' | 'critical' {
    const utilization = (stats.activeWorkers / 3) * 100; // Assuming 3 total workers
    
    if (utilization > 90) {
      return 'critical';
    }
    if (utilization > this.config.performanceThresholds.workerUtilizationThreshold) {
      return 'warning';
    }
    return 'healthy';
  }

  private determinePerformanceHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const slowJobs = this.getSlowJobs();
    const timeoutRate = this.calculateTimeoutRate();
    
    if (timeoutRate > 20 || slowJobs.length > 5) {
      return 'critical';
    }
    if (timeoutRate > 5 || slowJobs.length > 2) {
      return 'warning';
    }
    return 'healthy';
  }

  private determineErrorHealthStatus(): 'healthy' | 'warning' | 'critical' {
    const errorRate = this.calculateOverallErrorRate();
    
    if (errorRate > this.config.performanceThresholds.highErrorRatePercent * 2) {
      return 'critical';
    }
    if (errorRate > this.config.performanceThresholds.highErrorRatePercent) {
      return 'warning';
    }
    return 'healthy';
  }

  /**
   * Helper calculation methods
   */
  private calculateAverageWaitTime(): number {
    // Simplified calculation - would need more detailed tracking
    return 0;
  }

  private getOldestPendingJobTime(): Date | undefined {
    const pendingJobs = this.jobQueue.getJobs({ status: 'pending' });
    if (pendingJobs.length === 0) return undefined;
    
    return pendingJobs.reduce((oldest, job) => 
      job.createdAt < oldest ? job.createdAt : oldest, 
      pendingJobs[0].createdAt
    );
  }

  private getSlowJobs(): string[] {
    const slowJobs: string[] = [];
    
    for (const metrics of this.jobMetrics.values()) {
      if (metrics.averageExecutionTime > this.config.performanceThresholds.slowJobThresholdMs) {
        slowJobs.push(metrics.jobName);
      }
    }
    
    return slowJobs;
  }

  private calculateTimeoutRate(): number {
    const timeoutJobs = this.jobQueue.getJobs({ status: 'timeout' });
    const totalJobs = this.jobQueue.getJobs();
    
    return totalJobs.length > 0 ? (timeoutJobs.length / totalJobs.length) * 100 : 0;
  }

  private calculateOverallErrorRate(): number {
    let totalRuns = 0;
    let totalFailures = 0;
    
    for (const metrics of this.jobMetrics.values()) {
      totalRuns += metrics.totalRuns;
      totalFailures += metrics.failedRuns;
    }
    
    return totalRuns > 0 ? (totalFailures / totalRuns) * 100 : 0;
  }

  private getRecentErrorCount(): number {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let recentErrors = 0;
    
    for (const metrics of this.jobMetrics.values()) {
      recentErrors += metrics.recentFailures.filter(
        failure => failure.timestamp > oneHourAgo
      ).length;
    }
    
    return recentErrors;
  }

  private getCriticalErrors(): string[] {
    const criticalErrors: string[] = [];
    
    for (const metrics of this.jobMetrics.values()) {
      if (metrics.successRate < 50) { // Less than 50% success rate
        criticalErrors.push(metrics.jobName);
      }
    }
    
    return criticalErrors;
  }

  /**
   * Cleanup old metrics and alerts
   */
  private cleanupOldMetrics(): void {
    const now = new Date();
    const metricsRetentionMs = this.config.metricsRetentionDays * 24 * 60 * 60 * 1000;
    const alertRetentionMs = this.config.alertRetentionDays * 24 * 60 * 60 * 1000;

    // Clean up old alerts
    for (const [alertId, alert] of this.alerts.entries()) {
      const age = now.getTime() - alert.timestamp.getTime();
      if (age > alertRetentionMs && alert.resolved) {
        this.alerts.delete(alertId);
      }
    }

    // Clean up old execution history
    for (const [jobName, history] of this.jobExecutionHistory.entries()) {
      const recentHistory = history.filter(
        time => (now.getTime() - time.getTime()) < metricsRetentionMs
      );
      this.jobExecutionHistory.set(jobName, recentHistory);
    }

    this.logDebug('Metrics cleanup completed', {
      activeAlerts: this.alerts.size,
      trackedJobs: this.jobMetrics.size
    });
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(ruleId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `alert-${ruleId}-${timestamp}-${random}`;
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[JobMonitor] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[JobMonitor] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[JobMonitor] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[JobMonitor] ${message}`, error);
  }
}

export default JobMonitor;
export type {
  JobPerformanceMetrics,
  JobFailure,
  SystemHealthMetrics,
  JobAlert,
  AlertRule,
  MonitoringConfig,
  AlertType,
  AlertCategory
};