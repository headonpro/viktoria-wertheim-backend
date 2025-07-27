/**
 * Logging Integration
 * 
 * Integrates structured logging, request tracing, and log aggregation
 * into a unified logging system for lifecycle hooks.
 * 
 * Features:
 * - Unified logging interface
 * - Automatic request tracing
 * - Performance monitoring integration
 * - Error tracking and alerting
 * - Configuration management
 */

import StructuredLogger, { LogLevel, LogContext, ChildLogger } from './StructuredLogger';
import RequestTracer, { TraceContext, getTracer } from './RequestTracing';
import AdvancedLogAggregator from './LogAggregation';

/**
 * Hook logging context
 */
export interface HookLoggingContext extends LogContext {
  hookType: 'beforeCreate' | 'beforeUpdate' | 'afterCreate' | 'afterUpdate';
  contentType: string;
  entityId?: string | number;
  operation?: string;
  traceContext?: TraceContext;
  errorId?: string;
  hookName?: string;
  alert?: any;
  resolvedBy?: string;
  errorCount?: number;
  notes?: string;
  threshold?: number;
  windowMinutes?: number;
}

/**
 * Logging integration configuration
 */
export interface LoggingIntegrationConfig {
  logLevel: LogLevel;
  enableTracing: boolean;
  enableAggregation: boolean;
  enablePerformanceMonitoring: boolean;
  enableErrorTracking: boolean;
  tracingSampleRate: number;
  aggregationRetentionDays: number;
  service: string;
  version: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: LoggingIntegrationConfig = {
  logLevel: LogLevel.INFO,
  enableTracing: true,
  enableAggregation: true,
  enablePerformanceMonitoring: true,
  enableErrorTracking: true,
  tracingSampleRate: 1.0,
  aggregationRetentionDays: 7,
  service: 'lifecycle-hooks',
  version: '1.0.0'
};

/**
 * Hook logger with integrated tracing and aggregation
 */
export class HookLogger {
  private structuredLogger: StructuredLogger;
  private tracer: RequestTracer;
  private config: LoggingIntegrationConfig;
  private strapi: any;

  constructor(strapi: any, config: Partial<LoggingIntegrationConfig> = {}) {
    this.strapi = strapi;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize structured logger
    this.structuredLogger = new StructuredLogger(strapi, {
      level: this.config.logLevel,
      enableAggregation: this.config.enableAggregation,
      aggregator: this.config.enableAggregation ? new AdvancedLogAggregator({
        maxAge: this.config.aggregationRetentionDays * 24 * 60 * 60 * 1000
      }) : undefined,
      service: this.config.service,
      version: this.config.version,
      environment: process.env.NODE_ENV || 'development'
    });

    // Initialize tracer
    this.tracer = getTracer({
      enabled: this.config.enableTracing,
      sampleRate: this.config.tracingSampleRate,
      enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
      enableErrorTracking: this.config.enableErrorTracking
    });
  }

  /**
   * Create a hook-specific logger
   */
  forHook(contentType: string, hookType: HookLoggingContext['hookType']): HookSpecificLogger {
    return new HookSpecificLogger(this, { contentType, hookType });
  }

  /**
   * Start a new request trace
   */
  startTrace(operationName: string, metadata?: any): TraceContext {
    return this.tracer.startTrace(operationName, metadata);
  }

  /**
   * Start a child span
   */
  startSpan(context: TraceContext, operationName: string, tags?: Record<string, any>): TraceContext {
    return this.tracer.startSpan(context, operationName, tags);
  }

  /**
   * Finish a span
   */
  finishSpan(context: TraceContext, status: 'success' | 'error' = 'success', error?: Error): void {
    this.tracer.finishSpan(context, status, error);
  }

  /**
   * Log with tracing integration
   */
  debug(message: string, data?: any, context?: Partial<HookLoggingContext>): void {
    this.logWithTracing(LogLevel.DEBUG, message, data, context);
  }

  info(message: string, data?: any, context?: Partial<HookLoggingContext>): void {
    this.logWithTracing(LogLevel.INFO, message, data, context);
  }

  warn(message: string, data?: any, context?: Partial<HookLoggingContext>): void {
    this.logWithTracing(LogLevel.WARN, message, data, context);
  }

  error(message: string, error?: Error, data?: any, context?: Partial<HookLoggingContext>): void {
    this.logWithTracing(LogLevel.ERROR, message, data, context, error);
  }

  fatal(message: string, error?: Error, data?: any, context?: Partial<HookLoggingContext>): void {
    this.logWithTracing(LogLevel.FATAL, message, data, context, error);
  }

  /**
   * Get logging statistics
   */
  async getStats(): Promise<{
    logs: any;
    traces: any;
  }> {
    const logStats = await this.structuredLogger.getStats();
    const traceStats = this.tracer.getTraceStats();

    return {
      logs: logStats,
      traces: traceStats
    };
  }

  /**
   * Search logs
   */
  async searchLogs(criteria: any): Promise<any> {
    const aggregator = (this.structuredLogger as any).aggregator;
    if (aggregator && aggregator.search) {
      return await aggregator.search(criteria);
    }
    return null;
  }

  /**
   * Get trace by ID
   */
  getTrace(traceId: string): any {
    return this.tracer.getTrace(traceId);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LoggingIntegrationConfig>): void {
    this.config = { ...this.config, ...config };
    
    this.structuredLogger.updateConfig({
      level: this.config.logLevel
    });

    this.tracer.updateConfig({
      enabled: this.config.enableTracing,
      sampleRate: this.config.tracingSampleRate,
      enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
      enableErrorTracking: this.config.enableErrorTracking
    });
  }

  /**
   * Flush all logs
   */
  async flush(): Promise<void> {
    await this.structuredLogger.flush();
  }

  /**
   * Core logging method with tracing integration
   */
  private logWithTracing(
    level: LogLevel,
    message: string,
    data?: any,
    context?: Partial<HookLoggingContext>,
    error?: Error
  ): void {
    // Add trace information to log context
    const logContext: Partial<LogContext> = {
      ...context,
      timestamp: new Date()
    };

    // If trace context is provided, add tracing information
    if (context?.traceContext) {
      const traceLogContext = this.tracer.createLogContext(context.traceContext);
      Object.assign(logContext, traceLogContext);

      // Log to span as well
      this.tracer.logToSpan(
        context.traceContext,
        LogLevel[level],
        message,
        { ...data, error: error?.message }
      );
    }

    // Log using structured logger
    switch (level) {
      case LogLevel.DEBUG:
        this.structuredLogger.debug(message, data, logContext);
        break;
      case LogLevel.INFO:
        this.structuredLogger.info(message, data, logContext);
        break;
      case LogLevel.WARN:
        this.structuredLogger.warn(message, data, logContext);
        break;
      case LogLevel.ERROR:
        this.structuredLogger.error(message, error, data, logContext);
        break;
      case LogLevel.FATAL:
        this.structuredLogger.fatal(message, error, data, logContext);
        break;
    }
  }
}

/**
 * Hook-specific logger with pre-configured context
 */
export class HookSpecificLogger {
  private parent: HookLogger;
  private baseContext: Partial<HookLoggingContext>;

  constructor(parent: HookLogger, baseContext: Partial<HookLoggingContext>) {
    this.parent = parent;
    this.baseContext = baseContext;
  }

  /**
   * Create logger for specific operation
   */
  forOperation(operation: string, entityId?: string | number, traceContext?: TraceContext): OperationLogger {
    return new OperationLogger(this.parent, {
      ...this.baseContext,
      hookType: this.baseContext.hookType || 'afterUpdate',
      contentType: this.baseContext.contentType || 'unknown',
      timestamp: this.baseContext.timestamp || new Date(),
      operation,
      entityId,
      traceContext
    });
  }

  /**
   * Log methods with base context
   */
  debug(message: string, data?: any, context?: Partial<HookLoggingContext>): void {
    this.parent.debug(message, data, { ...this.baseContext, ...context });
  }

  info(message: string, data?: any, context?: Partial<HookLoggingContext>): void {
    this.parent.info(message, data, { ...this.baseContext, ...context });
  }

  warn(message: string, data?: any, context?: Partial<HookLoggingContext>): void {
    this.parent.warn(message, data, { ...this.baseContext, ...context });
  }

  error(message: string, error?: Error, data?: any, context?: Partial<HookLoggingContext>): void {
    this.parent.error(message, error, data, { ...this.baseContext, ...context });
  }

  fatal(message: string, error?: Error, data?: any, context?: Partial<HookLoggingContext>): void {
    this.parent.fatal(message, error, data, { ...this.baseContext, ...context });
  }
}

/**
 * Operation-specific logger with full context
 */
export class OperationLogger {
  private parent: HookLogger;
  private fullContext: HookLoggingContext;

  constructor(parent: HookLogger, fullContext: HookLoggingContext) {
    this.parent = parent;
    this.fullContext = fullContext;
  }

  /**
   * Start timing an operation
   */
  startTiming(): OperationTimer {
    return new OperationTimer(this);
  }

  /**
   * Log methods with full context
   */
  debug(message: string, data?: any): void {
    this.parent.debug(message, data, this.fullContext);
  }

  info(message: string, data?: any): void {
    this.parent.info(message, data, this.fullContext);
  }

  warn(message: string, data?: any): void {
    this.parent.warn(message, data, this.fullContext);
  }

  error(message: string, error?: Error, data?: any): void {
    this.parent.error(message, error, data, this.fullContext);
  }

  fatal(message: string, error?: Error, data?: any): void {
    this.parent.fatal(message, error, data, this.fullContext);
  }

  /**
   * Log operation start
   */
  logStart(data?: any): void {
    this.info(`${this.fullContext.operation} started`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log operation success
   */
  logSuccess(duration: number, data?: any): void {
    this.info(`${this.fullContext.operation} completed successfully`, {
      ...data,
      duration,
      performance: { executionTime: duration }
    });
  }

  /**
   * Log operation failure
   */
  logFailure(error: Error, duration: number, data?: any): void {
    this.error(`${this.fullContext.operation} failed`, error, {
      ...data,
      duration,
      performance: { executionTime: duration }
    });
  }

  /**
   * Log validation warning
   */
  logValidationWarning(warnings: any[], data?: any): void {
    this.warn(`${this.fullContext.operation} validation warnings`, {
      ...data,
      warnings,
      warningCount: warnings.length
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(metrics: any, data?: any): void {
    this.info(`${this.fullContext.operation} performance metrics`, {
      ...data,
      performance: metrics
    });
  }
}

/**
 * Operation timer for performance tracking
 */
export class OperationTimer {
  private logger: OperationLogger;
  private startTime: number;

  constructor(logger: OperationLogger) {
    this.logger = logger;
    this.startTime = Date.now();
  }

  /**
   * Finish timing and log success
   */
  success(data?: any): number {
    const duration = Date.now() - this.startTime;
    this.logger.logSuccess(duration, data);
    return duration;
  }

  /**
   * Finish timing and log failure
   */
  failure(error: Error, data?: any): number {
    const duration = Date.now() - this.startTime;
    this.logger.logFailure(error, duration, data);
    return duration;
  }

  /**
   * Get elapsed time without logging
   */
  getElapsed(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Global logging integration instance
 */
let globalLogger: HookLogger | null = null;

/**
 * Get or create global logger
 */
export function getLogger(strapi?: any, config?: Partial<LoggingIntegrationConfig>): HookLogger {
  if (!globalLogger && strapi) {
    globalLogger = new HookLogger(strapi, config);
  }
  return globalLogger!;
}

/**
 * Set global logger
 */
export function setLogger(logger: HookLogger): void {
  globalLogger = logger;
}

export default HookLogger;