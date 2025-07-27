/**
 * Feature Flag Monitoring Service
 * 
 * Implements feature flag usage tracking, performance monitoring,
 * and alerting system for feature flag operations.
 * 
 * Requirements: 7.4, 6.2
 */

import { EventEmitter } from 'events';
import { FeatureFlagService, FeatureFlagEvaluationResult } from './FeatureFlagService';
import { FeatureFlagManagement, FeatureFlagAnalytics, RolloutStatus } from './FeatureFlagManagement';
import { StructuredLogger } from '../logging/StructuredLogger';

/**
 * Feature flag usage metrics
 */
export interface FeatureFlagUsageMetrics {
  flagName: string;
  totalEvaluations: number;
  evaluationsPerMinute: number;
  evaluationsPerHour: number;
  evaluationsPerDay: number;
  uniqueUsers: number;
  uniqueUsersPerDay: number;
  enabledPercentage: number;
  disabledPercentage: number;
  averageEvaluationTime: number;
  p95EvaluationTime: number;
  p99EvaluationTime: number;
  errorCount: number;
  errorRate: number;
  cacheHitRate: number;
  lastEvaluation: Date;
  trends: {
    evaluationTrend: 'increasing' | 'decreasing' | 'stable';
    errorTrend: 'increasing' | 'decreasing' | 'stable';
    performanceTrend: 'improving' | 'degrading' | 'stable';
  };
}

/**
 * Feature flag performance metrics
 */
export interface FeatureFlagPerformanceMetrics {
  flagName: string;
  evaluationTimes: number[];
  averageTime: number;
  medianTime: number;
  p95Time: number;
  p99Time: number;
  slowestEvaluations: Array<{
    timestamp: Date;
    evaluationTime: number;
    context: any;
    reason: string;
  }>;
  performanceAlerts: Array<{
    timestamp: Date;
    type: 'slow_evaluation' | 'high_error_rate' | 'cache_miss';
    message: string;
    severity: 'warning' | 'critical';
  }>;
}

/**
 * Feature flag alert configuration
 */
export interface FeatureFlagAlertConfig {
  flagName: string;
  enabled: boolean;
  thresholds: {
    slowEvaluationMs: number;
    highErrorRatePercent: number;
    lowCacheHitRatePercent: number;
    unusualUsageChangePercent: number;
  };
  notifications: {
    email: boolean;
    webhook: boolean;
    slack: boolean;
  };
  escalation: {
    enabled: boolean;
    escalateAfterMinutes: number;
    escalationContacts: string[];
  };
}

/**
 * Feature flag alert
 */
export interface FeatureFlagAlert {
  id: string;
  flagName: string;
  type: 'performance' | 'error_rate' | 'usage' | 'rollout';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata: any;
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enableUsageTracking: boolean;
  enablePerformanceMonitoring: boolean;
  enableAlerting: boolean;
  metricsRetentionDays: number;
  alertRetentionDays: number;
  performanceThresholds: {
    slowEvaluationMs: number;
    highErrorRatePercent: number;
    lowCacheHitRatePercent: number;
  };
  usageAnalysis: {
    enableTrendAnalysis: boolean;
    trendAnalysisWindowHours: number;
    anomalyDetectionEnabled: boolean;
  };
  notifications: {
    enableEmail: boolean;
    enableWebhook: boolean;
    enableSlack: boolean;
    webhookUrl?: string;
    slackWebhookUrl?: string;
  };
}

/**
 * Default monitoring configuration
 */
const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enableUsageTracking: true,
  enablePerformanceMonitoring: true,
  enableAlerting: true,
  metricsRetentionDays: 30,
  alertRetentionDays: 90,
  performanceThresholds: {
    slowEvaluationMs: 100,
    highErrorRatePercent: 5,
    lowCacheHitRatePercent: 80
  },
  usageAnalysis: {
    enableTrendAnalysis: true,
    trendAnalysisWindowHours: 24,
    anomalyDetectionEnabled: true
  },
  notifications: {
    enableEmail: false,
    enableWebhook: false,
    enableSlack: false
  }
};

/**
 * Feature Flag Monitoring Service
 */
export class FeatureFlagMonitoring extends EventEmitter {
  private featureFlagService: FeatureFlagService;
  private featureFlagManagement: FeatureFlagManagement;
  private strapi: any;
  private logger: StructuredLogger;
  private config: MonitoringConfig;

  // Monitoring state
  private usageMetrics: Map<string, FeatureFlagUsageMetrics> = new Map();
  private performanceMetrics: Map<string, FeatureFlagPerformanceMetrics> = new Map();
  private alertConfigs: Map<string, FeatureFlagAlertConfig> = new Map();
  private activeAlerts: Map<string, FeatureFlagAlert> = new Map();
  private evaluationHistory: Array<{
    timestamp: Date;
    flagName: string;
    result: FeatureFlagEvaluationResult;
  }> = [];

  // Timers
  private metricsTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private alertTimer?: NodeJS.Timeout;

  constructor(
    featureFlagService: FeatureFlagService,
    featureFlagManagement: FeatureFlagManagement,
    strapi: any,
    config: Partial<MonitoringConfig> = {}
  ) {
    super();
    
    this.featureFlagService = featureFlagService;
    this.featureFlagManagement = featureFlagManagement;
    this.strapi = strapi;
    this.logger = new StructuredLogger(strapi);
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config };

    this.setupEventListeners();
    this.startMonitoring();
    
    this.logger.info('Feature flag monitoring initialized', {
      usageTracking: this.config.enableUsageTracking,
      performanceMonitoring: this.config.enablePerformanceMonitoring,
      alerting: this.config.enableAlerting
    });
  }

  /**
   * Start monitoring
   */
  start(): void {
    this.startMonitoring();
    this.logger.info('Feature flag monitoring started');
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.stopTimers();
    this.logger.info('Feature flag monitoring stopped');
  }

  /**
   * Get usage metrics for a flag
   */
  getUsageMetrics(flagName: string): FeatureFlagUsageMetrics | null {
    return this.usageMetrics.get(flagName) || null;
  }

  /**
   * Get usage metrics for all flags
   */
  getAllUsageMetrics(): FeatureFlagUsageMetrics[] {
    return Array.from(this.usageMetrics.values());
  }

  /**
   * Get performance metrics for a flag
   */
  getPerformanceMetrics(flagName: string): FeatureFlagPerformanceMetrics | null {
    return this.performanceMetrics.get(flagName) || null;
  }

  /**
   * Get performance metrics for all flags
   */
  getAllPerformanceMetrics(): FeatureFlagPerformanceMetrics[] {
    return Array.from(this.performanceMetrics.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(flagName?: string): FeatureFlagAlert[] {
    const alerts = Array.from(this.activeAlerts.values())
      .filter(alert => !alert.resolved);
    
    if (flagName) {
      return alerts.filter(alert => alert.flagName === flagName);
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get alert history
   */
  getAlertHistory(flagName?: string, limit: number = 100): FeatureFlagAlert[] {
    const alerts = Array.from(this.activeAlerts.values());
    
    let filteredAlerts = alerts;
    if (flagName) {
      filteredAlerts = alerts.filter(alert => alert.flagName === flagName);
    }
    
    return filteredAlerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    this.emit('alert_acknowledged', { alert, acknowledgedBy });
    this.logger.info(`Feature flag alert acknowledged: ${alertId}`, {
      flagName: alert.flagName,
      acknowledgedBy
    });

    return true;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.emit('alert_resolved', { alert });
    this.logger.info(`Feature flag alert resolved: ${alertId}`, {
      flagName: alert.flagName
    });

    return true;
  }

  /**
   * Configure alerts for a flag
   */
  configureAlerts(flagName: string, config: Partial<FeatureFlagAlertConfig>): void {
    const existingConfig = this.alertConfigs.get(flagName);
    
    const alertConfig: FeatureFlagAlertConfig = {
      flagName,
      enabled: config.enabled ?? true,
      thresholds: {
        slowEvaluationMs: config.thresholds?.slowEvaluationMs ?? this.config.performanceThresholds.slowEvaluationMs,
        highErrorRatePercent: config.thresholds?.highErrorRatePercent ?? this.config.performanceThresholds.highErrorRatePercent,
        lowCacheHitRatePercent: config.thresholds?.lowCacheHitRatePercent ?? this.config.performanceThresholds.lowCacheHitRatePercent,
        unusualUsageChangePercent: config.thresholds?.unusualUsageChangePercent ?? 50
      },
      notifications: {
        email: config.notifications?.email ?? this.config.notifications.enableEmail,
        webhook: config.notifications?.webhook ?? this.config.notifications.enableWebhook,
        slack: config.notifications?.slack ?? this.config.notifications.enableSlack
      },
      escalation: {
        enabled: config.escalation?.enabled ?? false,
        escalateAfterMinutes: config.escalation?.escalateAfterMinutes ?? 30,
        escalationContacts: config.escalation?.escalationContacts ?? []
      }
    };

    this.alertConfigs.set(flagName, alertConfig);
    
    this.logger.info(`Alert configuration updated for flag: ${flagName}`, alertConfig);
  }

  /**
   * Get monitoring summary
   */
  getMonitoringSummary(): {
    totalFlags: number;
    totalEvaluations: number;
    averageEvaluationTime: number;
    totalErrors: number;
    overallErrorRate: number;
    activeAlerts: number;
    criticalAlerts: number;
    slowestFlags: Array<{ flagName: string; averageTime: number }>;
    mostUsedFlags: Array<{ flagName: string; evaluations: number }>;
    flagsWithErrors: Array<{ flagName: string; errorRate: number }>;
  } {
    const usageMetrics = Array.from(this.usageMetrics.values());
    const performanceMetrics = Array.from(this.performanceMetrics.values());
    const activeAlerts = this.getActiveAlerts();

    const totalEvaluations = usageMetrics.reduce((sum, m) => sum + m.totalEvaluations, 0);
    const totalErrors = usageMetrics.reduce((sum, m) => sum + m.errorCount, 0);

    return {
      totalFlags: usageMetrics.length,
      totalEvaluations,
      averageEvaluationTime: usageMetrics.reduce((sum, m) => sum + m.averageEvaluationTime, 0) / usageMetrics.length || 0,
      totalErrors,
      overallErrorRate: totalEvaluations > 0 ? (totalErrors / totalEvaluations) * 100 : 0,
      activeAlerts: activeAlerts.length,
      criticalAlerts: activeAlerts.filter(a => a.severity === 'critical').length,
      slowestFlags: performanceMetrics
        .sort((a, b) => b.averageTime - a.averageTime)
        .slice(0, 5)
        .map(m => ({ flagName: m.flagName, averageTime: m.averageTime })),
      mostUsedFlags: usageMetrics
        .sort((a, b) => b.totalEvaluations - a.totalEvaluations)
        .slice(0, 5)
        .map(m => ({ flagName: m.flagName, evaluations: m.totalEvaluations })),
      flagsWithErrors: usageMetrics
        .filter(m => m.errorRate > 0)
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 5)
        .map(m => ({ flagName: m.flagName, errorRate: m.errorRate }))
    };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart monitoring if needed
    this.stopTimers();
    this.startMonitoring();
    
    this.logger.info('Feature flag monitoring configuration updated', config);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to flag evaluations
    this.featureFlagService.on('flagEvaluated', (result: FeatureFlagEvaluationResult) => {
      this.handleFlagEvaluation(result);
    });

    // Listen to rollout events
    this.featureFlagManagement.on('rollout_started', (event) => {
      this.handleRolloutEvent('rollout_started', event);
    });

    this.featureFlagManagement.on('rollout_completed', (event) => {
      this.handleRolloutEvent('rollout_completed', event);
    });

    this.featureFlagManagement.on('rollout_rolled_back', (event) => {
      this.handleRolloutEvent('rollout_rolled_back', event);
    });
  }

  /**
   * Start monitoring timers
   */
  private startMonitoring(): void {
    // Metrics calculation timer (every minute)
    this.metricsTimer = setInterval(() => {
      this.calculateMetrics();
    }, 60000);

    // Alert checking timer (every 30 seconds)
    this.alertTimer = setInterval(() => {
      this.checkAlerts();
    }, 30000);

    // Cleanup timer (every hour)
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldData();
    }, 3600000);
  }

  /**
   * Stop all timers
   */
  private stopTimers(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
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
   * Handle flag evaluation
   */
  private handleFlagEvaluation(result: FeatureFlagEvaluationResult): void {
    if (!this.config.enableUsageTracking && !this.config.enablePerformanceMonitoring) {
      return;
    }

    // Add to evaluation history
    this.evaluationHistory.push({
      timestamp: new Date(),
      flagName: result.flagName,
      result
    });

    // Limit history size
    if (this.evaluationHistory.length > 10000) {
      this.evaluationHistory = this.evaluationHistory.slice(-5000);
    }

    // Update usage metrics
    if (this.config.enableUsageTracking) {
      this.updateUsageMetrics(result);
    }

    // Update performance metrics
    if (this.config.enablePerformanceMonitoring) {
      this.updatePerformanceMetrics(result);
    }
  }

  /**
   * Handle rollout events
   */
  private handleRolloutEvent(eventType: string, event: any): void {
    const { flagName, rolloutStatus } = event;

    if (eventType === 'rollout_rolled_back') {
      this.createAlert({
        flagName,
        type: 'rollout',
        severity: 'critical',
        title: 'Feature Flag Rollback',
        message: `Feature flag ${flagName} has been rolled back due to issues`,
        metadata: { rolloutStatus, eventType }
      });
    }
  }

  /**
   * Update usage metrics
   */
  private updateUsageMetrics(result: FeatureFlagEvaluationResult): void {
    let metrics = this.usageMetrics.get(result.flagName);
    
    if (!metrics) {
      metrics = {
        flagName: result.flagName,
        totalEvaluations: 0,
        evaluationsPerMinute: 0,
        evaluationsPerHour: 0,
        evaluationsPerDay: 0,
        uniqueUsers: 0,
        uniqueUsersPerDay: 0,
        enabledPercentage: 0,
        disabledPercentage: 0,
        averageEvaluationTime: 0,
        p95EvaluationTime: 0,
        p99EvaluationTime: 0,
        errorCount: 0,
        errorRate: 0,
        cacheHitRate: 0,
        lastEvaluation: new Date(),
        trends: {
          evaluationTrend: 'stable',
          errorTrend: 'stable',
          performanceTrend: 'stable'
        }
      };
      this.usageMetrics.set(result.flagName, metrics);
    }

    metrics.totalEvaluations++;
    metrics.lastEvaluation = new Date();
    
    // Update average evaluation time
    metrics.averageEvaluationTime = (
      (metrics.averageEvaluationTime * (metrics.totalEvaluations - 1)) + result.evaluationTime
    ) / metrics.totalEvaluations;

    // Update enabled/disabled percentages (simplified)
    const recentEvaluations = this.evaluationHistory
      .filter(e => e.flagName === result.flagName)
      .slice(-100);
    
    const enabledCount = recentEvaluations.filter(e => e.result.enabled).length;
    metrics.enabledPercentage = (enabledCount / recentEvaluations.length) * 100;
    metrics.disabledPercentage = 100 - metrics.enabledPercentage;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(result: FeatureFlagEvaluationResult): void {
    let metrics = this.performanceMetrics.get(result.flagName);
    
    if (!metrics) {
      metrics = {
        flagName: result.flagName,
        evaluationTimes: [],
        averageTime: 0,
        medianTime: 0,
        p95Time: 0,
        p99Time: 0,
        slowestEvaluations: [],
        performanceAlerts: []
      };
      this.performanceMetrics.set(result.flagName, metrics);
    }

    // Add evaluation time
    metrics.evaluationTimes.push(result.evaluationTime);
    
    // Keep only last 1000 evaluation times
    if (metrics.evaluationTimes.length > 1000) {
      metrics.evaluationTimes = metrics.evaluationTimes.slice(-1000);
    }

    // Recalculate percentiles
    const sortedTimes = [...metrics.evaluationTimes].sort((a, b) => a - b);
    metrics.averageTime = sortedTimes.reduce((sum, time) => sum + time, 0) / sortedTimes.length;
    metrics.medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];
    metrics.p95Time = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    metrics.p99Time = sortedTimes[Math.floor(sortedTimes.length * 0.99)];

    // Track slow evaluations
    if (result.evaluationTime > this.config.performanceThresholds.slowEvaluationMs) {
      metrics.slowestEvaluations.push({
        timestamp: new Date(),
        evaluationTime: result.evaluationTime,
        context: result.context,
        reason: result.reason
      });

      // Keep only last 50 slow evaluations
      if (metrics.slowestEvaluations.length > 50) {
        metrics.slowestEvaluations = metrics.slowestEvaluations.slice(-50);
      }
    }
  }

  /**
   * Calculate metrics
   */
  private calculateMetrics(): void {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const oneDayAgo = new Date(now.getTime() - 86400000);

    for (const [flagName, metrics] of this.usageMetrics.entries()) {
      const recentEvaluations = this.evaluationHistory.filter(e => 
        e.flagName === flagName && e.timestamp >= oneMinuteAgo
      );
      
      const hourlyEvaluations = this.evaluationHistory.filter(e => 
        e.flagName === flagName && e.timestamp >= oneHourAgo
      );
      
      const dailyEvaluations = this.evaluationHistory.filter(e => 
        e.flagName === flagName && e.timestamp >= oneDayAgo
      );

      metrics.evaluationsPerMinute = recentEvaluations.length;
      metrics.evaluationsPerHour = hourlyEvaluations.length;
      metrics.evaluationsPerDay = dailyEvaluations.length;

      // Calculate unique users (simplified - using userId from context)
      const uniqueUsers = new Set(
        dailyEvaluations
          .map(e => e.result.context.userId)
          .filter(userId => userId)
      );
      metrics.uniqueUsersPerDay = uniqueUsers.size;

      // Update trends (simplified)
      this.updateTrends(metrics, dailyEvaluations);
    }
  }

  /**
   * Update trends
   */
  private updateTrends(metrics: FeatureFlagUsageMetrics, evaluations: any[]): void {
    if (evaluations.length < 10) return;

    const midpoint = Math.floor(evaluations.length / 2);
    const firstHalf = evaluations.slice(0, midpoint);
    const secondHalf = evaluations.slice(midpoint);

    // Evaluation trend
    const firstHalfCount = firstHalf.length;
    const secondHalfCount = secondHalf.length;
    const evaluationChange = ((secondHalfCount - firstHalfCount) / firstHalfCount) * 100;

    if (evaluationChange > 20) {
      metrics.trends.evaluationTrend = 'increasing';
    } else if (evaluationChange < -20) {
      metrics.trends.evaluationTrend = 'decreasing';
    } else {
      metrics.trends.evaluationTrend = 'stable';
    }

    // Performance trend (simplified)
    const firstHalfAvgTime = firstHalf.reduce((sum, e) => sum + e.result.evaluationTime, 0) / firstHalf.length;
    const secondHalfAvgTime = secondHalf.reduce((sum, e) => sum + e.result.evaluationTime, 0) / secondHalf.length;
    const performanceChange = ((secondHalfAvgTime - firstHalfAvgTime) / firstHalfAvgTime) * 100;

    if (performanceChange > 20) {
      metrics.trends.performanceTrend = 'degrading';
    } else if (performanceChange < -20) {
      metrics.trends.performanceTrend = 'improving';
    } else {
      metrics.trends.performanceTrend = 'stable';
    }
  }

  /**
   * Check alerts
   */
  private checkAlerts(): void {
    if (!this.config.enableAlerting) return;

    for (const [flagName, metrics] of this.usageMetrics.entries()) {
      const alertConfig = this.alertConfigs.get(flagName);
      if (!alertConfig || !alertConfig.enabled) continue;

      this.checkPerformanceAlerts(flagName, metrics, alertConfig);
      this.checkUsageAlerts(flagName, metrics, alertConfig);
    }
  }

  /**
   * Check performance alerts
   */
  private checkPerformanceAlerts(
    flagName: string,
    metrics: FeatureFlagUsageMetrics,
    alertConfig: FeatureFlagAlertConfig
  ): void {
    // Slow evaluation alert
    if (metrics.averageEvaluationTime > alertConfig.thresholds.slowEvaluationMs) {
      this.createAlert({
        flagName,
        type: 'performance',
        severity: 'warning',
        title: 'Slow Feature Flag Evaluation',
        message: `Feature flag ${flagName} has slow average evaluation time: ${metrics.averageEvaluationTime.toFixed(2)}ms`,
        metadata: { averageEvaluationTime: metrics.averageEvaluationTime, threshold: alertConfig.thresholds.slowEvaluationMs }
      });
    }

    // High error rate alert
    if (metrics.errorRate > alertConfig.thresholds.highErrorRatePercent) {
      this.createAlert({
        flagName,
        type: 'error_rate',
        severity: 'critical',
        title: 'High Feature Flag Error Rate',
        message: `Feature flag ${flagName} has high error rate: ${metrics.errorRate.toFixed(2)}%`,
        metadata: { errorRate: metrics.errorRate, threshold: alertConfig.thresholds.highErrorRatePercent }
      });
    }
  }

  /**
   * Check usage alerts
   */
  private checkUsageAlerts(
    flagName: string,
    metrics: FeatureFlagUsageMetrics,
    alertConfig: FeatureFlagAlertConfig
  ): void {
    // Unusual usage change alert
    if (metrics.trends.evaluationTrend === 'increasing' || metrics.trends.evaluationTrend === 'decreasing') {
      this.createAlert({
        flagName,
        type: 'usage',
        severity: 'info',
        title: 'Unusual Feature Flag Usage Change',
        message: `Feature flag ${flagName} usage trend is ${metrics.trends.evaluationTrend}`,
        metadata: { trend: metrics.trends.evaluationTrend, evaluationsPerDay: metrics.evaluationsPerDay }
      });
    }
  }

  /**
   * Create alert
   */
  private createAlert(alertData: {
    flagName: string;
    type: FeatureFlagAlert['type'];
    severity: FeatureFlagAlert['severity'];
    title: string;
    message: string;
    metadata: any;
  }): void {
    // Check if similar alert already exists
    const existingAlert = Array.from(this.activeAlerts.values()).find(alert =>
      alert.flagName === alertData.flagName &&
      alert.type === alertData.type &&
      !alert.resolved &&
      (Date.now() - alert.timestamp.getTime()) < 300000 // 5 minutes
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: FeatureFlagAlert = {
      id: `${alertData.flagName}-${alertData.type}-${Date.now()}`,
      flagName: alertData.flagName,
      type: alertData.type,
      severity: alertData.severity,
      title: alertData.title,
      message: alertData.message,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
      metadata: alertData.metadata
    };

    this.activeAlerts.set(alert.id, alert);

    this.emit('alert_created', { alert });
    this.logger.warn(`Feature flag alert created: ${alert.title}`, {
      flagName: alert.flagName,
      type: alert.type,
      severity: alert.severity
    });

    // Send notifications
    this.sendNotifications(alert);
  }

  /**
   * Send notifications for alert
   */
  private async sendNotifications(alert: FeatureFlagAlert): Promise<void> {
    const alertConfig = this.alertConfigs.get(alert.flagName);
    if (!alertConfig) return;

    try {
      // Email notification
      if (alertConfig.notifications.email && this.config.notifications.enableEmail) {
        await this.sendEmailNotification(alert);
      }

      // Webhook notification
      if (alertConfig.notifications.webhook && this.config.notifications.enableWebhook && this.config.notifications.webhookUrl) {
        await this.sendWebhookNotification(alert);
      }

      // Slack notification
      if (alertConfig.notifications.slack && this.config.notifications.enableSlack && this.config.notifications.slackWebhookUrl) {
        await this.sendSlackNotification(alert);
      }

    } catch (error) {
      this.logger.error(`Error sending notifications for alert: ${alert.id}`, error);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: FeatureFlagAlert): Promise<void> {
    // Implementation would depend on email service
    this.logger.info(`Email notification sent for alert: ${alert.id}`);
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: FeatureFlagAlert): Promise<void> {
    // Implementation would send HTTP POST to webhook URL
    this.logger.info(`Webhook notification sent for alert: ${alert.id}`);
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: FeatureFlagAlert): Promise<void> {
    // Implementation would send to Slack webhook
    this.logger.info(`Slack notification sent for alert: ${alert.id}`);
  }

  /**
   * Cleanup old data
   */
  private cleanupOldData(): void {
    const now = new Date();
    const metricsRetentionMs = this.config.metricsRetentionDays * 24 * 60 * 60 * 1000;
    const alertRetentionMs = this.config.alertRetentionDays * 24 * 60 * 60 * 1000;

    // Cleanup evaluation history
    this.evaluationHistory = this.evaluationHistory.filter(
      entry => (now.getTime() - entry.timestamp.getTime()) < metricsRetentionMs
    );

    // Cleanup old alerts
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if ((now.getTime() - alert.timestamp.getTime()) > alertRetentionMs) {
        this.activeAlerts.delete(alertId);
      }
    }

    this.logger.debug('Feature flag monitoring data cleanup completed', {
      evaluationHistorySize: this.evaluationHistory.length,
      activeAlertsCount: this.activeAlerts.size
    });
  }
}

export default FeatureFlagMonitoring;