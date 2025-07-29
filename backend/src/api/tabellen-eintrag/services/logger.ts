/**
 * Comprehensive Logging System for Tabellen-Automatisierung
 * Provides structured logging, performance metrics, and audit trails
 */

import { 
  ErrorContext, 
  AutomationError
} from './error-handling';
import {
  AuditLogEntry,
  AuditAction,
  PerformanceMetrics,
  PerformanceThresholds
} from './types';

export interface AutomationLogger {
  // Structured logging methods
  logCalculationStart(context: CalculationLogContext): void;
  logCalculationEnd(context: CalculationLogContext, result: CalculationResult): void;
  logCalculationError(context: CalculationLogContext, error: AutomationError): void;
  
  // Queue logging methods
  logJobQueued(jobContext: JobLogContext): void;
  logJobStarted(jobContext: JobLogContext): void;
  logJobCompleted(jobContext: JobLogContext, metrics: JobMetrics): void;
  logJobFailed(jobContext: JobLogContext, error: AutomationError): void;
  logJobRetry(jobContext: JobLogContext, retryCount: number, nextRetryAt: Date): void;
  
  // Performance logging methods
  logPerformanceMetrics(metrics: PerformanceMetrics): void;
  logSlowOperation(operation: string, duration: number, threshold: number, context?: any): void;
  logResourceUsage(usage: ResourceUsage): void;
  
  // Audit logging methods
  logAuditEvent(entry: AuditLogEntry): void;
  logUserAction(userId: string, action: string, details: any): void;
  logSystemAction(action: string, details: any): void;
  
  // Alert and monitoring methods
  logAlert(level: AlertLevel, message: string, context?: any): void;
  logHealthCheck(component: string, status: HealthStatus, details?: any): void;
  
  // Query methods
  getCalculationLogs(ligaId: number, saisonId: number, limit?: number): Promise<CalculationLogEntry[]>;
  getJobLogs(jobId: string): Promise<JobLogEntry[]>;
  getAuditLogs(filters: AuditLogFilters): Promise<AuditLogEntry[]>;
  getPerformanceLogs(timeRange: TimeRange): Promise<PerformanceLogEntry[]>;
  getAlertLogs(level?: AlertLevel, timeRange?: TimeRange): Promise<AlertLogEntry[]>;
}

export interface CalculationLogContext {
  ligaId: number;
  saisonId: number;
  trigger: string;
  userId?: string;
  requestId?: string;
  jobId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface CalculationResult {
  success: boolean;
  duration: number;
  teamsProcessed: number;
  entriesUpdated: number;
  warnings?: string[];
  metadata?: Record<string, any>;
}

export interface JobLogContext {
  jobId: string;
  ligaId: number;
  saisonId: number;
  priority: string;
  trigger: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface JobMetrics {
  duration: number;
  memoryUsage: number;
  cpuUsage?: number;
  retryCount: number;
  timeoutCount: number;
}

export interface ResourceUsage {
  timestamp: Date;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  cpuUsage: {
    percentage: number;
    loadAverage: number[];
  };
  diskUsage?: {
    used: number;
    total: number;
    percentage: number;
  };
  databaseConnections?: {
    active: number;
    idle: number;
    total: number;
  };
}

export interface CalculationLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  ligaId: number;
  saisonId: number;
  operation: string;
  duration?: number;
  success: boolean;
  message: string;
  context: any;
  error?: string;
}

export interface JobLogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  jobId: string;
  operation: string;
  status: string;
  message: string;
  context: any;
  metrics?: JobMetrics;
  error?: string;
}

export interface PerformanceLogEntry {
  id: string;
  timestamp: Date;
  operation: string;
  duration: number;
  memoryUsage: number;
  cpuUsage?: number;
  context: any;
  threshold?: {
    duration: number;
    memory: number;
  };
}

export interface AlertLogEntry {
  id: string;
  timestamp: Date;
  level: AlertLevel;
  component: string;
  message: string;
  context: any;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  entityType?: string;
  entityId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}

export interface TimeRange {
  from: Date;
  to: Date;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export enum AlertLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

export class AutomationLoggerImpl implements AutomationLogger {
  private performanceThresholds: PerformanceThresholds;
  private logBuffer: Map<string, any[]> = new Map();
  private flushInterval?: NodeJS.Timeout;

  constructor(performanceThresholds?: PerformanceThresholds) {
    this.performanceThresholds = performanceThresholds || {
      duration: { warning: 5000, error: 15000 },
      memory: { warning: 100 * 1024 * 1024, error: 500 * 1024 * 1024 }, // 100MB, 500MB
      cpu: { warning: 70, error: 90 }
    };
    
    this.startFlushInterval();
  }

  // Calculation logging methods
  logCalculationStart(context: CalculationLogContext): void {
    const logEntry = {
      timestamp: context.timestamp,
      level: LogLevel.INFO,
      operation: 'calculation_start',
      ligaId: context.ligaId,
      saisonId: context.saisonId,
      trigger: context.trigger,
      userId: context.userId,
      requestId: context.requestId,
      jobId: context.jobId,
      message: `Starting table calculation for Liga ${context.ligaId}, Saison ${context.saisonId}`,
      context: context.metadata || {}
    };

    this.writeLog('calculation', logEntry);
    strapi.log.info(logEntry.message, logEntry);
  }

  logCalculationEnd(context: CalculationLogContext, result: CalculationResult): void {
    const level = result.success ? LogLevel.INFO : LogLevel.ERROR;
    const logEntry = {
      timestamp: new Date(),
      level,
      operation: 'calculation_end',
      ligaId: context.ligaId,
      saisonId: context.saisonId,
      trigger: context.trigger,
      userId: context.userId,
      requestId: context.requestId,
      jobId: context.jobId,
      duration: result.duration,
      success: result.success,
      teamsProcessed: result.teamsProcessed,
      entriesUpdated: result.entriesUpdated,
      warnings: result.warnings,
      message: result.success 
        ? `Table calculation completed successfully in ${result.duration}ms`
        : `Table calculation failed after ${result.duration}ms`,
      context: { ...context.metadata, ...result.metadata }
    };

    this.writeLog('calculation', logEntry);
    
    if (result.success) {
      strapi.log.info(logEntry.message, logEntry);
    } else {
      strapi.log.error(logEntry.message, logEntry);
    }

    // Check performance thresholds
    if (result.duration > this.performanceThresholds.duration.warning) {
      this.logSlowOperation('table_calculation', result.duration, this.performanceThresholds.duration.warning, context);
    }
  }

  logCalculationError(context: CalculationLogContext, error: AutomationError): void {
    const logEntry = {
      timestamp: new Date(),
      level: LogLevel.ERROR,
      operation: 'calculation_error',
      ligaId: context.ligaId,
      saisonId: context.saisonId,
      trigger: context.trigger,
      userId: context.userId,
      requestId: context.requestId,
      jobId: context.jobId,
      errorType: error.type,
      errorCode: error.code,
      errorSeverity: error.severity,
      retryable: error.retryable,
      message: `Table calculation error: ${error.message}`,
      context: { ...context.metadata, ...error.details },
      error: {
        type: error.type,
        code: error.code,
        message: error.message,
        severity: error.severity,
        retryable: error.retryable,
        stack: error.originalError?.stack
      }
    };

    this.writeLog('calculation', logEntry);
    strapi.log.error(logEntry.message, logEntry);
  }

  // Queue logging methods
  logJobQueued(jobContext: JobLogContext): void {
    const logEntry = {
      timestamp: jobContext.timestamp,
      level: LogLevel.INFO,
      operation: 'job_queued',
      jobId: jobContext.jobId,
      ligaId: jobContext.ligaId,
      saisonId: jobContext.saisonId,
      priority: jobContext.priority,
      trigger: jobContext.trigger,
      message: `Job queued: ${jobContext.jobId} for Liga ${jobContext.ligaId}`,
      context: jobContext.metadata || {}
    };

    this.writeLog('queue', logEntry);
    strapi.log.info(logEntry.message, logEntry);
  }

  logJobStarted(jobContext: JobLogContext): void {
    const logEntry = {
      timestamp: new Date(),
      level: LogLevel.INFO,
      operation: 'job_started',
      jobId: jobContext.jobId,
      ligaId: jobContext.ligaId,
      saisonId: jobContext.saisonId,
      priority: jobContext.priority,
      trigger: jobContext.trigger,
      message: `Job started: ${jobContext.jobId}`,
      context: jobContext.metadata || {}
    };

    this.writeLog('queue', logEntry);
    strapi.log.info(logEntry.message, logEntry);
  }

  logJobCompleted(jobContext: JobLogContext, metrics: JobMetrics): void {
    const logEntry = {
      timestamp: new Date(),
      level: LogLevel.INFO,
      operation: 'job_completed',
      jobId: jobContext.jobId,
      ligaId: jobContext.ligaId,
      saisonId: jobContext.saisonId,
      priority: jobContext.priority,
      trigger: jobContext.trigger,
      duration: metrics.duration,
      memoryUsage: metrics.memoryUsage,
      cpuUsage: metrics.cpuUsage,
      retryCount: metrics.retryCount,
      message: `Job completed: ${jobContext.jobId} in ${metrics.duration}ms`,
      context: { ...jobContext.metadata, metrics }
    };

    this.writeLog('queue', logEntry);
    strapi.log.info(logEntry.message, logEntry);

    // Log performance metrics
    this.logPerformanceMetrics({
      operationName: 'queue_job',
      duration: metrics.duration,
      memoryUsage: metrics.memoryUsage,
      cpuUsage: metrics.cpuUsage || 0,
      timestamp: new Date(),
      metadata: { jobId: jobContext.jobId, ligaId: jobContext.ligaId }
    });
  }

  logJobFailed(jobContext: JobLogContext, error: AutomationError): void {
    const logEntry = {
      timestamp: new Date(),
      level: LogLevel.ERROR,
      operation: 'job_failed',
      jobId: jobContext.jobId,
      ligaId: jobContext.ligaId,
      saisonId: jobContext.saisonId,
      priority: jobContext.priority,
      trigger: jobContext.trigger,
      errorType: error.type,
      errorCode: error.code,
      errorSeverity: error.severity,
      retryable: error.retryable,
      message: `Job failed: ${jobContext.jobId} - ${error.message}`,
      context: { ...jobContext.metadata, ...error.details },
      error: {
        type: error.type,
        code: error.code,
        message: error.message,
        severity: error.severity,
        retryable: error.retryable
      }
    };

    this.writeLog('queue', logEntry);
    strapi.log.error(logEntry.message, logEntry);
  }

  logJobRetry(jobContext: JobLogContext, retryCount: number, nextRetryAt: Date): void {
    const logEntry = {
      timestamp: new Date(),
      level: LogLevel.WARN,
      operation: 'job_retry',
      jobId: jobContext.jobId,
      ligaId: jobContext.ligaId,
      saisonId: jobContext.saisonId,
      priority: jobContext.priority,
      trigger: jobContext.trigger,
      retryCount,
      nextRetryAt,
      message: `Job retry scheduled: ${jobContext.jobId} (attempt ${retryCount})`,
      context: { ...jobContext.metadata, retryCount, nextRetryAt }
    };

    this.writeLog('queue', logEntry);
    strapi.log.warn(logEntry.message, logEntry);
  }

  // Performance logging methods
  logPerformanceMetrics(metrics: PerformanceMetrics): void {
    const logEntry = {
      timestamp: metrics.timestamp,
      level: LogLevel.DEBUG,
      operation: 'performance_metrics',
      operationName: metrics.operationName,
      duration: metrics.duration,
      memoryUsage: metrics.memoryUsage,
      cpuUsage: metrics.cpuUsage,
      message: `Performance: ${metrics.operationName} took ${metrics.duration}ms`,
      context: metrics.metadata || {}
    };

    this.writeLog('performance', logEntry);
    
    // Only log to Strapi if it exceeds thresholds
    if (metrics.duration > this.performanceThresholds.duration.warning ||
        metrics.memoryUsage > this.performanceThresholds.memory.warning) {
      strapi.log.warn(logEntry.message, logEntry);
    }
  }

  logSlowOperation(operation: string, duration: number, threshold: number, context?: any): void {
    const level = duration > this.performanceThresholds.duration.error ? AlertLevel.HIGH : AlertLevel.MEDIUM;
    
    this.logAlert(level, `Slow operation detected: ${operation} took ${duration}ms (threshold: ${threshold}ms)`, {
      operation,
      duration,
      threshold,
      ...context
    });
  }

  logResourceUsage(usage: ResourceUsage): void {
    const logEntry = {
      timestamp: usage.timestamp,
      level: LogLevel.DEBUG,
      operation: 'resource_usage',
      memoryUsage: usage.memoryUsage,
      cpuUsage: usage.cpuUsage,
      diskUsage: usage.diskUsage,
      databaseConnections: usage.databaseConnections,
      message: `Resource usage: Memory ${usage.memoryUsage.percentage}%, CPU ${usage.cpuUsage.percentage}%`,
      context: usage
    };

    this.writeLog('performance', logEntry);

    // Alert on high resource usage
    if (usage.memoryUsage.percentage > 80 || usage.cpuUsage.percentage > 80) {
      this.logAlert(AlertLevel.HIGH, 'High resource usage detected', usage);
    }
  }

  // Audit logging methods
  logAuditEvent(entry: AuditLogEntry): void {
    const logEntry = {
      timestamp: entry.timestamp,
      level: LogLevel.INFO,
      operation: 'audit_event',
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValues: entry.oldValues,
      newValues: entry.newValues,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      message: `Audit: ${entry.action} on ${entry.entityType}:${entry.entityId} by user ${entry.userId}`,
      context: entry.metadata || {}
    };

    this.writeLog('audit', logEntry);
    strapi.log.info(logEntry.message, logEntry);
  }

  logUserAction(userId: string, action: string, details: any): void {
    const auditEntry: AuditLogEntry = {
      id: this.generateId(),
      userId,
      action: action as AuditAction,
      entityType: details.entityType || 'unknown',
      entityId: details.entityId || 'unknown',
      oldValues: details.oldValues,
      newValues: details.newValues,
      timestamp: new Date(),
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      metadata: details.metadata
    };

    this.logAuditEvent(auditEntry);
  }

  logSystemAction(action: string, details: any): void {
    const auditEntry: AuditLogEntry = {
      id: this.generateId(),
      userId: 'system',
      action: action as AuditAction,
      entityType: details.entityType || 'system',
      entityId: details.entityId || 'system',
      oldValues: details.oldValues,
      newValues: details.newValues,
      timestamp: new Date(),
      metadata: details.metadata
    };

    this.logAuditEvent(auditEntry);
  }

  // Alert and monitoring methods
  logAlert(level: AlertLevel, message: string, context?: any): void {
    const logEntry = {
      timestamp: new Date(),
      level: this.alertLevelToLogLevel(level),
      operation: 'alert',
      alertLevel: level,
      message,
      context: context || {}
    };

    this.writeLog('alerts', logEntry);
    
    switch (level) {
      case AlertLevel.CRITICAL:
        strapi.log.error(message, logEntry);
        break;
      case AlertLevel.HIGH:
        strapi.log.error(message, logEntry);
        break;
      case AlertLevel.MEDIUM:
        strapi.log.warn(message, logEntry);
        break;
      case AlertLevel.LOW:
        strapi.log.info(message, logEntry);
        break;
    }
  }

  logHealthCheck(component: string, status: HealthStatus, details?: any): void {
    const level = status === HealthStatus.HEALTHY ? LogLevel.DEBUG : 
                  status === HealthStatus.DEGRADED ? LogLevel.WARN : LogLevel.ERROR;
    
    const logEntry = {
      timestamp: new Date(),
      level,
      operation: 'health_check',
      component,
      status,
      message: `Health check: ${component} is ${status}`,
      context: details || {}
    };

    this.writeLog('health', logEntry);
    
    if (status !== HealthStatus.HEALTHY) {
      strapi.log[level](logEntry.message, logEntry);
    }
  }

  // Query methods (simplified implementations - in production these would query a database)
  async getCalculationLogs(ligaId: number, saisonId: number, limit: number = 100): Promise<CalculationLogEntry[]> {
    const logs = this.getBufferedLogs('calculation');
    return logs
      .filter((log: any) => log.ligaId === ligaId && log.saisonId === saisonId)
      .slice(0, limit)
      .map(this.mapToCalculationLogEntry);
  }

  async getJobLogs(jobId: string): Promise<JobLogEntry[]> {
    const logs = this.getBufferedLogs('queue');
    return logs
      .filter((log: any) => log.jobId === jobId)
      .map(this.mapToJobLogEntry);
  }

  async getAuditLogs(filters: AuditLogFilters): Promise<AuditLogEntry[]> {
    const logs = this.getBufferedLogs('audit');
    let filteredLogs = logs;

    if (filters.userId) {
      filteredLogs = filteredLogs.filter((log: any) => log.userId === filters.userId);
    }
    if (filters.action) {
      filteredLogs = filteredLogs.filter((log: any) => log.action === filters.action);
    }
    if (filters.entityType) {
      filteredLogs = filteredLogs.filter((log: any) => log.entityType === filters.entityType);
    }
    if (filters.dateFrom) {
      filteredLogs = filteredLogs.filter((log: any) => new Date(log.timestamp) >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      filteredLogs = filteredLogs.filter((log: any) => new Date(log.timestamp) <= filters.dateTo!);
    }

    return filteredLogs
      .slice(0, filters.limit || 100)
      .map(this.mapToAuditLogEntry);
  }

  async getPerformanceLogs(timeRange: TimeRange): Promise<PerformanceLogEntry[]> {
    const logs = this.getBufferedLogs('performance');
    return logs
      .filter((log: any) => {
        const timestamp = new Date(log.timestamp);
        return timestamp >= timeRange.from && timestamp <= timeRange.to;
      })
      .map(this.mapToPerformanceLogEntry);
  }

  async getAlertLogs(level?: AlertLevel, timeRange?: TimeRange): Promise<AlertLogEntry[]> {
    const logs = this.getBufferedLogs('alerts');
    let filteredLogs = logs;

    if (level) {
      filteredLogs = filteredLogs.filter((log: any) => log.alertLevel === level);
    }
    if (timeRange) {
      filteredLogs = filteredLogs.filter((log: any) => {
        const timestamp = new Date(log.timestamp);
        return timestamp >= timeRange.from && timestamp <= timeRange.to;
      });
    }

    return filteredLogs.map(this.mapToAlertLogEntry);
  }

  // Private helper methods
  private writeLog(category: string, entry: any): void {
    if (!this.logBuffer.has(category)) {
      this.logBuffer.set(category, []);
    }
    
    const logs = this.logBuffer.get(category)!;
    logs.push(entry);
    
    // Keep only last 1000 entries per category to prevent memory issues
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
  }

  private getBufferedLogs(category: string): any[] {
    return this.logBuffer.get(category) || [];
  }

  private startFlushInterval(): void {
    // In a production environment, this would flush logs to persistent storage
    this.flushInterval = setInterval(() => {
      // Placeholder for log flushing logic
      // In production, you might want to:
      // 1. Write logs to database
      // 2. Send logs to external logging service
      // 3. Archive old logs
    }, 60000); // Flush every minute
  }

  private alertLevelToLogLevel(alertLevel: AlertLevel): LogLevel {
    switch (alertLevel) {
      case AlertLevel.CRITICAL:
        return LogLevel.FATAL;
      case AlertLevel.HIGH:
        return LogLevel.ERROR;
      case AlertLevel.MEDIUM:
        return LogLevel.WARN;
      case AlertLevel.LOW:
        return LogLevel.INFO;
      default:
        return LogLevel.INFO;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private mapToCalculationLogEntry = (log: any): CalculationLogEntry => ({
    id: log.id || this.generateId(),
    timestamp: new Date(log.timestamp),
    level: log.level,
    ligaId: log.ligaId,
    saisonId: log.saisonId,
    operation: log.operation,
    duration: log.duration,
    success: log.success,
    message: log.message,
    context: log.context,
    error: log.error
  });

  private mapToJobLogEntry = (log: any): JobLogEntry => ({
    id: log.id || this.generateId(),
    timestamp: new Date(log.timestamp),
    level: log.level,
    jobId: log.jobId,
    operation: log.operation,
    status: log.status || 'unknown',
    message: log.message,
    context: log.context,
    metrics: log.metrics,
    error: log.error
  });

  private mapToAuditLogEntry = (log: any): AuditLogEntry => ({
    id: log.id || this.generateId(),
    userId: log.userId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    oldValues: log.oldValues,
    newValues: log.newValues,
    timestamp: new Date(log.timestamp),
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    metadata: log.metadata
  });

  private mapToPerformanceLogEntry = (log: any): PerformanceLogEntry => ({
    id: log.id || this.generateId(),
    timestamp: new Date(log.timestamp),
    operation: log.operationName,
    duration: log.duration,
    memoryUsage: log.memoryUsage,
    cpuUsage: log.cpuUsage,
    context: log.context,
    threshold: log.threshold
  });

  private mapToAlertLogEntry = (log: any): AlertLogEntry => ({
    id: log.id || this.generateId(),
    timestamp: new Date(log.timestamp),
    level: log.alertLevel,
    component: log.component || 'system',
    message: log.message,
    context: log.context,
    resolved: log.resolved,
    resolvedAt: log.resolvedAt ? new Date(log.resolvedAt) : undefined
  });

  // Cleanup method
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.logBuffer.clear();
  }
}

// Factory function for easy instantiation
export function createAutomationLogger(performanceThresholds?: PerformanceThresholds): AutomationLogger {
  return new AutomationLoggerImpl(performanceThresholds);
}