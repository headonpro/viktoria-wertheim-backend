/**
 * Health Check Service
 * Provides comprehensive health monitoring for all system components
 */

import { AutomationLogger, HealthStatus, AlertLevel } from './logger';
import { PerformanceMonitor, SystemHealth, ComponentHealth } from './performance-monitor';

// Re-export types for other modules
export { SystemHealth, ComponentHealth, HealthStatus };

export interface HealthCheckService {
  checkSystemHealth(): Promise<SystemHealthReport>;
  checkComponent(componentName: string): Promise<ComponentHealthReport>;
  registerHealthCheck(name: string, check: HealthCheckFunction): void;
  unregisterHealthCheck(name: string): void;
  getHealthHistory(component?: string, timeRange?: TimeRange): Promise<HealthHistoryEntry[]>;
  setHealthThresholds(component: string, thresholds: HealthThresholds): void;
}

export interface HealthCheckFunction {
  (): Promise<ComponentHealthResult>;
}

export interface ComponentHealthResult {
  status: HealthStatus;
  responseTime?: number;
  message?: string;
  metrics?: Record<string, number>;
  details?: any;
}

export interface SystemHealthReport {
  overall: HealthStatus;
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  components: ComponentHealthReport[];
  summary: HealthSummary;
}

export interface ComponentHealthReport {
  name: string;
  status: HealthStatus;
  responseTime: number;
  lastCheck: Date;
  message?: string;
  metrics: Record<string, number>;
  details?: any;
  history?: HealthHistoryEntry[];
}

export interface HealthSummary {
  totalComponents: number;
  healthyComponents: number;
  degradedComponents: number;
  unhealthyComponents: number;
  averageResponseTime: number;
  criticalIssues: string[];
}

export interface HealthHistoryEntry {
  timestamp: Date;
  component: string;
  status: HealthStatus;
  responseTime: number;
  message?: string;
  metrics?: Record<string, number>;
}

export interface HealthThresholds {
  responseTime: {
    warning: number;
    error: number;
  };
  availability: {
    warning: number;
    error: number;
  };
  customMetrics?: Record<string, { warning: number; error: number }>;
}

export interface TimeRange {
  from: Date;
  to: Date;
}

export class HealthCheckServiceImpl implements HealthCheckService {
  private logger: AutomationLogger;
  private performanceMonitor: PerformanceMonitor;
  private healthChecks: Map<string, HealthCheckFunction> = new Map();
  private healthHistory: HealthHistoryEntry[] = [];
  private thresholds: Map<string, HealthThresholds> = new Map();
  private startTime: Date = new Date();
  private monitoringInterval?: NodeJS.Timeout;

  constructor(logger: AutomationLogger, performanceMonitor: PerformanceMonitor) {
    this.logger = logger;
    this.performanceMonitor = performanceMonitor;
    this.registerDefaultHealthChecks();
  }

  async checkSystemHealth(): Promise<SystemHealthReport> {
    const components: ComponentHealthReport[] = [];
    const checkPromises: Promise<ComponentHealthReport>[] = [];

    // Run all health checks in parallel
    for (const [name, checkFn] of this.healthChecks) {
      checkPromises.push(this.runHealthCheck(name, checkFn));
    }

    const componentResults = await Promise.allSettled(checkPromises);
    
    componentResults.forEach((result, index) => {
      const componentName = Array.from(this.healthChecks.keys())[index];
      if (result.status === 'fulfilled') {
        components.push(result.value);
      } else {
        components.push({
          name: componentName,
          status: HealthStatus.UNHEALTHY,
          responseTime: 0,
          lastCheck: new Date(),
          message: `Health check failed: ${result.reason?.message || 'Unknown error'}`,
          metrics: {},
          details: { error: result.reason }
        });
      }
    });

    // Calculate overall health
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

    // Calculate summary
    const summary: HealthSummary = {
      totalComponents: components.length,
      healthyComponents: components.filter(c => c.status === HealthStatus.HEALTHY).length,
      degradedComponents: degradedCount,
      unhealthyComponents: unhealthyCount,
      averageResponseTime: components.reduce((sum, c) => sum + c.responseTime, 0) / components.length,
      criticalIssues: components
        .filter(c => c.status === HealthStatus.UNHEALTHY)
        .map(c => `${c.name}: ${c.message || 'Unhealthy'}`)
    };

    const report: SystemHealthReport = {
      overall,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      components,
      summary
    };

    // Log health check
    this.logger.logHealthCheck('system', overall, report);

    return report;
  }

  async checkComponent(componentName: string): Promise<ComponentHealthReport> {
    const checkFn = this.healthChecks.get(componentName);
    if (!checkFn) {
      throw new Error(`Health check not found for component: ${componentName}`);
    }

    return this.runHealthCheck(componentName, checkFn);
  }

  registerHealthCheck(name: string, check: HealthCheckFunction): void {
    this.healthChecks.set(name, check);
  }

  unregisterHealthCheck(name: string): void {
    this.healthChecks.delete(name);
  }

  async getHealthHistory(component?: string, timeRange?: TimeRange): Promise<HealthHistoryEntry[]> {
    let filteredHistory = this.healthHistory;

    if (component) {
      filteredHistory = filteredHistory.filter(entry => entry.component === component);
    }

    if (timeRange) {
      filteredHistory = filteredHistory.filter(entry => 
        entry.timestamp >= timeRange.from && entry.timestamp <= timeRange.to
      );
    }

    return filteredHistory.slice(-1000); // Return last 1000 entries
  }

  setHealthThresholds(component: string, thresholds: HealthThresholds): void {
    this.thresholds.set(component, thresholds);
  }

  startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkSystemHealth();
      } catch (error) {
        this.logger.logAlert(AlertLevel.MEDIUM, 'Health monitoring error', { error: error.message });
      }
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  private async runHealthCheck(name: string, checkFn: HealthCheckFunction): Promise<ComponentHealthReport> {
    const startTime = Date.now();
    let result: ComponentHealthResult;

    try {
      result = await Promise.race([
        checkFn(),
        this.createTimeoutPromise(10000) // 10 second timeout
      ]);
    } catch (error) {
      result = {
        status: HealthStatus.UNHEALTHY,
        message: `Health check failed: ${error.message}`,
        details: { error: error.message, stack: error.stack }
      };
    }

    const responseTime = Date.now() - startTime;
    const thresholds = this.thresholds.get(name);

    // Apply thresholds if configured
    if (thresholds && result.status === HealthStatus.HEALTHY) {
      if (responseTime > thresholds.responseTime.error) {
        result.status = HealthStatus.UNHEALTHY;
        result.message = `Response time ${responseTime}ms exceeds error threshold ${thresholds.responseTime.error}ms`;
      } else if (responseTime > thresholds.responseTime.warning) {
        result.status = HealthStatus.DEGRADED;
        result.message = `Response time ${responseTime}ms exceeds warning threshold ${thresholds.responseTime.warning}ms`;
      }
    }

    const report: ComponentHealthReport = {
      name,
      status: result.status,
      responseTime,
      lastCheck: new Date(),
      message: result.message,
      metrics: result.metrics || {},
      details: result.details
    };

    // Add to history
    const historyEntry: HealthHistoryEntry = {
      timestamp: new Date(),
      component: name,
      status: result.status,
      responseTime,
      message: result.message,
      metrics: result.metrics
    };

    this.healthHistory.push(historyEntry);
    
    // Keep only last 10000 entries
    if (this.healthHistory.length > 10000) {
      this.healthHistory.splice(0, this.healthHistory.length - 10000);
    }

    // Log component health check
    this.logger.logHealthCheck(name, result.status, report);

    return report;
  }

  private createTimeoutPromise(timeoutMs: number): Promise<ComponentHealthResult> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  private registerDefaultHealthChecks(): void {
    // Database health check
    this.registerHealthCheck('database', async (): Promise<ComponentHealthResult> => {
      try {
        const startTime = Date.now();
        await strapi.db.connection.raw('SELECT 1');
        const responseTime = Date.now() - startTime;

        // Check connection pool if available
        let poolMetrics = {};
        try {
          const pool = (strapi.db.connection as any).pool;
          if (pool) {
            poolMetrics = {
              activeConnections: pool.numUsed(),
              idleConnections: pool.numFree(),
              totalConnections: pool.numUsed() + pool.numFree(),
              maxConnections: pool.max
            };
          }
        } catch (error) {
          // Pool metrics not available
        }

        return {
          status: responseTime < 1000 ? HealthStatus.HEALTHY : 
                  responseTime < 5000 ? HealthStatus.DEGRADED : HealthStatus.UNHEALTHY,
          responseTime,
          message: `Database responding in ${responseTime}ms`,
          metrics: {
            responseTime,
            ...poolMetrics
          }
        };
      } catch (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: `Database connection failed: ${error.message}`,
          details: { error: error.message }
        };
      }
    });

    // Memory health check
    this.registerHealthCheck('memory', async (): Promise<ComponentHealthResult> => {
      const memoryUsage = process.memoryUsage();
      const usedMB = memoryUsage.heapUsed / (1024 * 1024);
      const totalMB = memoryUsage.heapTotal / (1024 * 1024);
      const percentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      let status: HealthStatus;
      let message: string;

      if (percentage < 70) {
        status = HealthStatus.HEALTHY;
        message = `Memory usage is healthy at ${percentage.toFixed(1)}%`;
      } else if (percentage < 90) {
        status = HealthStatus.DEGRADED;
        message = `Memory usage is elevated at ${percentage.toFixed(1)}%`;
      } else {
        status = HealthStatus.UNHEALTHY;
        message = `Memory usage is critical at ${percentage.toFixed(1)}%`;
      }

      return {
        status,
        message,
        metrics: {
          usedMB: Math.round(usedMB),
          totalMB: Math.round(totalMB),
          percentage: Math.round(percentage * 100) / 100,
          rss: Math.round(memoryUsage.rss / (1024 * 1024)),
          external: Math.round(memoryUsage.external / (1024 * 1024))
        }
      };
    });

    // CPU health check
    this.registerHealthCheck('cpu', async (): Promise<ComponentHealthResult> => {
      const loadAverage = require('os').loadavg();
      const cpuCount = require('os').cpus().length;
      const load1m = loadAverage[0];
      const load5m = loadAverage[1];
      const load15m = loadAverage[2];
      
      // Calculate load percentage based on CPU count
      const loadPercentage = (load1m / cpuCount) * 100;

      let status: HealthStatus;
      let message: string;

      if (loadPercentage < 70) {
        status = HealthStatus.HEALTHY;
        message = `CPU load is healthy at ${loadPercentage.toFixed(1)}%`;
      } else if (loadPercentage < 90) {
        status = HealthStatus.DEGRADED;
        message = `CPU load is elevated at ${loadPercentage.toFixed(1)}%`;
      } else {
        status = HealthStatus.UNHEALTHY;
        message = `CPU load is critical at ${loadPercentage.toFixed(1)}%`;
      }

      return {
        status,
        message,
        metrics: {
          loadPercentage: Math.round(loadPercentage * 100) / 100,
          load1m: Math.round(load1m * 100) / 100,
          load5m: Math.round(load5m * 100) / 100,
          load15m: Math.round(load15m * 100) / 100,
          cpuCount
        }
      };
    });

    // Queue health check
    this.registerHealthCheck('queue', async (): Promise<ComponentHealthResult> => {
      try {
        const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
        const status = queueManager.getQueueStatus();

        let healthStatus: HealthStatus;
        let message: string;

        const totalJobs = status.pendingJobs + status.processingJobs;
        
        if (totalJobs < 10 && status.failedJobs < 5) {
          healthStatus = HealthStatus.HEALTHY;
          message = `Queue is healthy with ${totalJobs} active jobs`;
        } else if (totalJobs < 50 && status.failedJobs < 20) {
          healthStatus = HealthStatus.DEGRADED;
          message = `Queue is under moderate load with ${totalJobs} active jobs`;
        } else {
          healthStatus = HealthStatus.UNHEALTHY;
          message = `Queue is overloaded with ${totalJobs} active jobs and ${status.failedJobs} failed jobs`;
        }

        return {
          status: healthStatus,
          message,
          metrics: {
            pendingJobs: status.pendingJobs,
            processingJobs: status.processingJobs,
            completedJobs: status.completedJobs,
            failedJobs: status.failedJobs,
            totalJobs,
            isProcessing: status.isProcessing ? 1 : 0
          }
        };
      } catch (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: `Queue service unavailable: ${error.message}`,
          details: { error: error.message }
        };
      }
    });

    // Disk space health check
    this.registerHealthCheck('disk', async (): Promise<ComponentHealthResult> => {
      try {
        const fs = require('fs');
        const stats = fs.statSync(process.cwd());
        
        // This is a simplified disk check - in production you'd want to check actual disk usage
        return {
          status: HealthStatus.HEALTHY,
          message: 'Disk space check not fully implemented',
          metrics: {
            available: 1, // Placeholder
            total: 1,     // Placeholder
            percentage: 0 // Placeholder
          }
        };
      } catch (error) {
        return {
          status: HealthStatus.UNHEALTHY,
          message: `Disk check failed: ${error.message}`,
          details: { error: error.message }
        };
      }
    });

    // Set default thresholds
    this.setHealthThresholds('database', {
      responseTime: { warning: 1000, error: 5000 },
      availability: { warning: 95, error: 90 }
    });

    this.setHealthThresholds('queue', {
      responseTime: { warning: 100, error: 500 },
      availability: { warning: 95, error: 90 },
      customMetrics: {
        pendingJobs: { warning: 10, error: 50 },
        failedJobs: { warning: 5, error: 20 }
      }
    });
  }
}

// Factory function
export function createHealthCheckService(
  logger: AutomationLogger, 
  performanceMonitor: PerformanceMonitor
): HealthCheckService {
  return new HealthCheckServiceImpl(logger, performanceMonitor);
}