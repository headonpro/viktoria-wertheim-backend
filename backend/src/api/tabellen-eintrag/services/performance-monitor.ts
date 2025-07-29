/**
 * Performance Monitoring Service
 * Tracks system performance, resource usage, and provides alerting
 */

import { AutomationLogger, ResourceUsage, AlertLevel } from './logger';
import { HealthStatus as LoggerHealthStatus } from './logger';
import { PerformanceMetrics, PerformanceThresholds } from './types';

// Re-export types for other modules
export { PerformanceMetrics };

export interface PerformanceMonitor {
  startOperation(operationName: string, context?: any): PerformanceTracker;
  trackResourceUsage(): Promise<ResourceUsage>;
  getSystemHealth(): Promise<SystemHealth>;
  getPerformanceReport(timeRange: { from: Date; to: Date }): Promise<PerformanceReport>;
  setThresholds(thresholds: PerformanceThresholds): void;
  startMonitoring(): void;
  stopMonitoring(): void;
}

export interface PerformanceTracker {
  addMetadata(key: string, value: any): void;
  addCheckpoint(name: string): void;
  finish(success?: boolean): PerformanceMetrics;
  cancel(): void;
}

export interface SystemHealth {
  overall: HealthStatus;
  components: ComponentHealth[];
  timestamp: Date;
  uptime: number;
}

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  metrics: ComponentMetrics;
  lastCheck: Date;
  message?: string;
}

export interface ComponentMetrics {
  responseTime?: number;
  errorRate?: number;
  throughput?: number;
  availability?: number;
  customMetrics?: Record<string, number>;
}

export interface PerformanceReport {
  timeRange: { from: Date; to: Date };
  summary: PerformanceSummary;
  operations: OperationPerformance[];
  alerts: PerformanceAlert[];
  trends: PerformanceTrend[];
}

export interface PerformanceSummary {
  totalOperations: number;
  averageDuration: number;
  successRate: number;
  errorRate: number;
  slowOperations: number;
  resourceUsage: {
    avgMemory: number;
    avgCpu: number;
    peakMemory: number;
    peakCpu: number;
  };
}

export interface OperationPerformance {
  name: string;
  count: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  errorRate: number;
  p95Duration: number;
  p99Duration: number;
}

export interface PerformanceAlert {
  timestamp: Date;
  level: AlertLevel;
  type: AlertType;
  message: string;
  operation?: string;
  value: number;
  threshold: number;
  context?: any;
}

export interface PerformanceTrend {
  metric: string;
  timePoints: TimePoint[];
  trend: TrendDirection;
  changePercentage: number;
}

export interface TimePoint {
  timestamp: Date;
  value: number;
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown'
}

export enum AlertType {
  SLOW_OPERATION = 'slow_operation',
  HIGH_MEMORY = 'high_memory',
  HIGH_CPU = 'high_cpu',
  HIGH_ERROR_RATE = 'high_error_rate',
  LOW_SUCCESS_RATE = 'low_success_rate',
  RESOURCE_EXHAUSTION = 'resource_exhaustion'
}

export enum TrendDirection {
  IMPROVING = 'improving',
  DEGRADING = 'degrading',
  STABLE = 'stable'
}

export class PerformanceMonitorImpl implements PerformanceMonitor {
  private logger: AutomationLogger;
  private thresholds: PerformanceThresholds;
  private activeTrackers: Map<string, PerformanceTrackerImpl> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private resourceHistory: ResourceUsage[] = [];
  private performanceHistory: PerformanceMetrics[] = [];
  private startTime: Date = new Date();

  constructor(logger: AutomationLogger, thresholds: PerformanceThresholds) {
    this.logger = logger;
    this.thresholds = thresholds;
  }

  startOperation(operationName: string, context?: any): PerformanceTracker {
    const trackerId = this.generateTrackerId();
    const tracker = new PerformanceTrackerImpl(trackerId, operationName, context, this.logger, this.thresholds);
    
    this.activeTrackers.set(trackerId, tracker);
    
    // Clean up tracker when finished
    tracker.onFinish(() => {
      this.activeTrackers.delete(trackerId);
      this.performanceHistory.push(tracker.getMetrics());
      
      // Keep only last 1000 entries
      if (this.performanceHistory.length > 1000) {
        this.performanceHistory.splice(0, this.performanceHistory.length - 1000);
      }
    });

    return tracker;
  }

  async trackResourceUsage(): Promise<ResourceUsage> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAverage = require('os').loadavg();

    const usage: ResourceUsage = {
      timestamp: new Date(),
      memoryUsage: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      cpuUsage: {
        percentage: this.calculateCpuPercentage(cpuUsage),
        loadAverage
      }
    };

    // Add database connection info if available
    try {
      const dbPool = (strapi.db.connection as any).pool;
      if (dbPool) {
        usage.databaseConnections = {
          active: dbPool.numUsed(),
          idle: dbPool.numFree(),
          total: dbPool.numUsed() + dbPool.numFree()
        };
      }
    } catch (error) {
      // Database connection info not available
    }

    // Store in history
    this.resourceHistory.push(usage);
    if (this.resourceHistory.length > 1000) {
      this.resourceHistory.splice(0, this.resourceHistory.length - 1000);
    }

    // Log resource usage
    this.logger.logResourceUsage(usage);

    return usage;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const components: ComponentHealth[] = [];

    // Database health
    try {
      const dbStart = Date.now();
      await strapi.db.connection.raw('SELECT 1');
      const dbResponseTime = Date.now() - dbStart;

      components.push({
        name: 'database',
        status: dbResponseTime < 1000 ? HealthStatus.HEALTHY : 
                dbResponseTime < 5000 ? HealthStatus.DEGRADED : HealthStatus.UNHEALTHY,
        metrics: {
          responseTime: dbResponseTime,
          availability: 100
        },
        lastCheck: new Date()
      });
    } catch (error) {
      components.push({
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        metrics: {
          availability: 0,
          errorRate: 100
        },
        lastCheck: new Date(),
        message: 'Database connection failed'
      });
    }

    // Memory health
    const resourceUsage = await this.trackResourceUsage();
    components.push({
      name: 'memory',
      status: resourceUsage.memoryUsage.percentage < 70 ? HealthStatus.HEALTHY :
              resourceUsage.memoryUsage.percentage < 90 ? HealthStatus.DEGRADED : HealthStatus.UNHEALTHY,
      metrics: {
        customMetrics: {
          usagePercentage: resourceUsage.memoryUsage.percentage,
          usedMB: resourceUsage.memoryUsage.used / (1024 * 1024),
          totalMB: resourceUsage.memoryUsage.total / (1024 * 1024)
        }
      },
      lastCheck: new Date()
    });

    // CPU health
    components.push({
      name: 'cpu',
      status: resourceUsage.cpuUsage.percentage < 70 ? HealthStatus.HEALTHY :
              resourceUsage.cpuUsage.percentage < 90 ? HealthStatus.DEGRADED : HealthStatus.UNHEALTHY,
      metrics: {
        customMetrics: {
          usagePercentage: resourceUsage.cpuUsage.percentage,
          loadAverage1m: resourceUsage.cpuUsage.loadAverage[0],
          loadAverage5m: resourceUsage.cpuUsage.loadAverage[1],
          loadAverage15m: resourceUsage.cpuUsage.loadAverage[2]
        }
      },
      lastCheck: new Date()
    });

    // Queue health (if queue manager is available)
    try {
      const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
      const queueStatus = queueManager.getQueueStatus();
      
      components.push({
        name: 'queue',
        status: queueStatus.pendingJobs < 50 ? HealthStatus.HEALTHY :
                queueStatus.pendingJobs < 100 ? HealthStatus.DEGRADED : HealthStatus.UNHEALTHY,
        metrics: {
          customMetrics: {
            pendingJobs: queueStatus.pendingJobs,
            processingJobs: queueStatus.processingJobs,
            failedJobs: queueStatus.failedJobs
          }
        },
        lastCheck: new Date()
      });
    } catch (error) {
      // Queue manager not available
    }

    // Determine overall health
    const unhealthyCount = components.filter(c => c.status === HealthStatus.UNHEALTHY).length;
    const degradedCount = components.filter(c => c.status === HealthStatus.DEGRADED).length;

    let overall: HealthStatus;
    if (unhealthyCount > 0) {
      overall = HealthStatus.UNHEALTHY;
    } else if (degradedCount > 0) {
      overall = HealthStatus.DEGRADED;
    } else {
      overall = HealthStatus.HEALTHY;
    }

    const health: SystemHealth = {
      overall,
      components,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime()
    };

    // Log health check
    this.logger.logHealthCheck('system', overall as LoggerHealthStatus, health);

    return health;
  }

  async getPerformanceReport(timeRange: { from: Date; to: Date }): Promise<PerformanceReport> {
    const filteredMetrics = this.performanceHistory.filter(m => 
      m.timestamp >= timeRange.from && m.timestamp <= timeRange.to
    );

    const filteredResources = this.resourceHistory.filter(r => 
      r.timestamp >= timeRange.from && r.timestamp <= timeRange.to
    );

    // Calculate summary
    const summary: PerformanceSummary = {
      totalOperations: filteredMetrics.length,
      averageDuration: this.calculateAverage(filteredMetrics.map(m => m.duration)),
      successRate: 0, // Would need success/failure tracking
      errorRate: 0,
      slowOperations: filteredMetrics.filter(m => m.duration > this.thresholds.duration.warning).length,
      resourceUsage: {
        avgMemory: this.calculateAverage(filteredResources.map(r => r.memoryUsage.used)),
        avgCpu: this.calculateAverage(filteredResources.map(r => r.cpuUsage.percentage)),
        peakMemory: Math.max(...filteredResources.map(r => r.memoryUsage.used)),
        peakCpu: Math.max(...filteredResources.map(r => r.cpuUsage.percentage))
      }
    };

    // Group operations by name
    const operationGroups = this.groupBy(filteredMetrics, m => m.operationName);
    const operations: OperationPerformance[] = Object.entries(operationGroups).map(([name, metrics]) => {
      const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
      return {
        name,
        count: metrics.length,
        averageDuration: this.calculateAverage(durations),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        successRate: 0, // Would need success/failure tracking
        errorRate: 0,
        p95Duration: this.calculatePercentile(durations, 95),
        p99Duration: this.calculatePercentile(durations, 99)
      };
    });

    // Generate alerts (simplified)
    const alerts: PerformanceAlert[] = [];
    filteredMetrics.forEach(metric => {
      if (metric.duration > this.thresholds.duration.error) {
        alerts.push({
          timestamp: metric.timestamp,
          level: AlertLevel.HIGH,
          type: AlertType.SLOW_OPERATION,
          message: `Slow operation: ${metric.operationName} took ${metric.duration}ms`,
          operation: metric.operationName,
          value: metric.duration,
          threshold: this.thresholds.duration.error
        });
      }
    });

    // Generate trends (simplified)
    const trends: PerformanceTrend[] = [];
    if (filteredMetrics.length > 10) {
      const recentMetrics = filteredMetrics.slice(-10);
      const olderMetrics = filteredMetrics.slice(0, 10);
      
      const recentAvg = this.calculateAverage(recentMetrics.map(m => m.duration));
      const olderAvg = this.calculateAverage(olderMetrics.map(m => m.duration));
      
      const changePercentage = ((recentAvg - olderAvg) / olderAvg) * 100;
      
      trends.push({
        metric: 'average_duration',
        timePoints: filteredMetrics.map(m => ({ timestamp: m.timestamp, value: m.duration })),
        trend: changePercentage > 10 ? TrendDirection.DEGRADING :
               changePercentage < -10 ? TrendDirection.IMPROVING : TrendDirection.STABLE,
        changePercentage
      });
    }

    return {
      timeRange,
      summary,
      operations,
      alerts,
      trends
    };
  }

  setThresholds(thresholds: PerformanceThresholds): void {
    this.thresholds = thresholds;
  }

  startMonitoring(): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.trackResourceUsage();
        await this.getSystemHealth();
      } catch (error) {
        this.logger.logAlert(AlertLevel.MEDIUM, 'Performance monitoring error', { error: error.message });
      }
    }, 30000); // Monitor every 30 seconds
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  // Private helper methods
  private generateTrackerId(): string {
    return 'tracker_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  private calculateCpuPercentage(cpuUsage: NodeJS.CpuUsage): number {
    // Simplified CPU percentage calculation
    // In a real implementation, you'd need to track CPU usage over time
    const totalUsage = cpuUsage.user + cpuUsage.system;
    return Math.min((totalUsage / 1000000) * 100, 100); // Convert microseconds to percentage
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculatePercentile(sortedNumbers: number[], percentile: number): number {
    if (sortedNumbers.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedNumbers.length) - 1;
    return sortedNumbers[Math.max(0, index)];
  }

  private groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }
}

class PerformanceTrackerImpl implements PerformanceTracker {
  private id: string;
  private operationName: string;
  private startTime: Date;
  private endTime?: Date;
  private context: any;
  private metadata: Record<string, any> = {};
  private checkpoints: Array<{ name: string; timestamp: Date }> = [];
  private logger: AutomationLogger;
  private thresholds: PerformanceThresholds;
  private finishCallback?: () => void;
  private cancelled = false;

  constructor(
    id: string, 
    operationName: string, 
    context: any, 
    logger: AutomationLogger, 
    thresholds: PerformanceThresholds
  ) {
    this.id = id;
    this.operationName = operationName;
    this.startTime = new Date();
    this.context = context || {};
    this.logger = logger;
    this.thresholds = thresholds;
  }

  addMetadata(key: string, value: any): void {
    this.metadata[key] = value;
  }

  addCheckpoint(name: string): void {
    this.checkpoints.push({
      name,
      timestamp: new Date()
    });
  }

  finish(success: boolean = true): PerformanceMetrics {
    if (this.cancelled || this.endTime) {
      throw new Error('Tracker already finished or cancelled');
    }

    this.endTime = new Date();
    const duration = this.endTime.getTime() - this.startTime.getTime();
    const memoryUsage = process.memoryUsage().heapUsed;

    const metrics: PerformanceMetrics = {
      operationName: this.operationName,
      duration,
      memoryUsage,
      cpuUsage: 0, // Would need more sophisticated CPU tracking
      timestamp: this.startTime,
      metadata: {
        ...this.context,
        ...this.metadata,
        checkpoints: this.checkpoints,
        success
      }
    };

    // Log performance metrics
    this.logger.logPerformanceMetrics(metrics);

    // Check thresholds and alert if necessary
    if (duration > this.thresholds.duration.warning) {
      const level = duration > this.thresholds.duration.error ? AlertLevel.HIGH : AlertLevel.MEDIUM;
      this.logger.logAlert(level, `Slow operation: ${this.operationName} took ${duration}ms`, {
        operationName: this.operationName,
        duration,
        threshold: this.thresholds.duration.warning,
        context: this.context
      });
    }

    if (memoryUsage > this.thresholds.memory.warning) {
      const level = memoryUsage > this.thresholds.memory.error ? AlertLevel.HIGH : AlertLevel.MEDIUM;
      this.logger.logAlert(level, `High memory usage: ${this.operationName} used ${Math.round(memoryUsage / 1024 / 1024)}MB`, {
        operationName: this.operationName,
        memoryUsage,
        threshold: this.thresholds.memory.warning,
        context: this.context
      });
    }

    // Call finish callback
    if (this.finishCallback) {
      this.finishCallback();
    }

    return metrics;
  }

  cancel(): void {
    this.cancelled = true;
  }

  onFinish(callback: () => void): void {
    this.finishCallback = callback;
  }

  getMetrics(): PerformanceMetrics {
    const endTime = this.endTime || new Date();
    const duration = endTime.getTime() - this.startTime.getTime();
    
    return {
      operationName: this.operationName,
      duration,
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: 0,
      timestamp: this.startTime,
      metadata: {
        ...this.context,
        ...this.metadata,
        checkpoints: this.checkpoints
      }
    };
  }
}

// Factory function
export function createPerformanceMonitor(logger: AutomationLogger, thresholds: PerformanceThresholds): PerformanceMonitor {
  return new PerformanceMonitorImpl(logger, thresholds);
}