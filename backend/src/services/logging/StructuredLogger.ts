/**
 * Structured Logger
 * 
 * Provides consistent structured logging across all hook operations with
 * contextual information, request tracing, and log aggregation support.
 * 
 * Features:
 * - Consistent log format across all hooks
 * - Contextual logging with request tracing
 * - Log level management
 * - Performance metrics integration
 * - Error categorization and analysis
 */

// import { v4 as uuidv4 } from 'uuid';
const uuidv4 = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

/**
 * Log context for request tracing
 */
export interface LogContext {
  requestId?: string;
  operationId?: string;
  userId?: string;
  contentType?: string;
  hookType?: string;
  entityId?: string | number;
  sessionId?: string;
  timestamp: Date;
  environment?: string;
}

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  context: LogContext;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    executionTime?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  tags?: string[];
  source: string;
  version: string;
}

/**
 * Log aggregation interface
 */
export interface LogAggregator {
  aggregate(entry: LogEntry): Promise<void>;
  flush(): Promise<void>;
  getStats(): Promise<LogStats>;
}

/**
 * Log statistics
 */
export interface LogStats {
  totalLogs: number;
  logsByLevel: Record<LogLevel, number>;
  errorRate: number;
  averageExecutionTime: number;
  topErrors: Array<{ message: string; count: number }>;
  recentLogs: LogEntry[];
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableAggregation: boolean;
  filePath?: string;
  maxFileSize?: number;
  maxFiles?: number;
  aggregator?: LogAggregator;
  environment: string;
  service: string;
  version: string;
}

/**
 * Default logger configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.INFO,
  enableConsole: true,
  enableFile: false,
  enableAggregation: false,
  environment: process.env.NODE_ENV || 'development',
  service: 'lifecycle-hooks',
  version: '1.0.0'
};

/**
 * Simple in-memory log aggregator
 */
class MemoryLogAggregator implements LogAggregator {
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;
  private stats: LogStats = {
    totalLogs: 0,
    logsByLevel: {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
      [LogLevel.FATAL]: 0
    },
    errorRate: 0,
    averageExecutionTime: 0,
    topErrors: [],
    recentLogs: []
  };

  async aggregate(entry: LogEntry): Promise<void> {
    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Update statistics
    this.updateStats(entry);
  }

  async flush(): Promise<void> {
    // In memory aggregator doesn't need flushing
  }

  async getStats(): Promise<LogStats> {
    this.stats.recentLogs = this.logs.slice(-100); // Last 100 logs
    return { ...this.stats };
  }

  private updateStats(entry: LogEntry): void {
    this.stats.totalLogs++;
    this.stats.logsByLevel[entry.level]++;
    
    // Calculate error rate
    const errorLogs = this.stats.logsByLevel[LogLevel.ERROR] + this.stats.logsByLevel[LogLevel.FATAL];
    this.stats.errorRate = errorLogs / this.stats.totalLogs;

    // Update average execution time
    if (entry.performance?.executionTime) {
      const currentAvg = this.stats.averageExecutionTime;
      const count = this.stats.totalLogs;
      this.stats.averageExecutionTime = (currentAvg * (count - 1) + entry.performance.executionTime) / count;
    }

    // Track top errors
    if (entry.level >= LogLevel.ERROR && entry.error) {
      const existingError = this.stats.topErrors.find(e => e.message === entry.error!.message);
      if (existingError) {
        existingError.count++;
      } else {
        this.stats.topErrors.push({ message: entry.error.message, count: 1 });
      }
      
      // Keep only top 10 errors
      this.stats.topErrors.sort((a, b) => b.count - a.count);
      this.stats.topErrors = this.stats.topErrors.slice(0, 10);
    }
  }
}

/**
 * Structured Logger implementation
 */
export class StructuredLogger {
  private config: LoggerConfig;
  private strapi: any;
  private aggregator?: LogAggregator;

  constructor(strapi: any, config: Partial<LoggerConfig> = {}) {
    this.strapi = strapi;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.enableAggregation) {
      this.aggregator = this.config.aggregator || new MemoryLogAggregator();
    }
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Partial<LogContext>): ChildLogger {
    return new ChildLogger(this, context);
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: any, context?: Partial<LogContext>): void {
    this.log(LogLevel.DEBUG, message, data, context);
  }

  /**
   * Log info message
   */
  info(message: string, data?: any, context?: Partial<LogContext>): void {
    this.log(LogLevel.INFO, message, data, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: any, context?: Partial<LogContext>): void {
    this.log(LogLevel.WARN, message, data, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, data?: any, context?: Partial<LogContext>): void {
    this.log(LogLevel.ERROR, message, data, context, error);
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, error?: Error, data?: any, context?: Partial<LogContext>): void {
    this.log(LogLevel.FATAL, message, data, context, error);
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    data?: any,
    context?: Partial<LogContext>,
    error?: Error
  ): void {
    // Check if log level is enabled
    if (level < this.config.level) {
      return;
    }

    // Create log entry
    const entry: LogEntry = {
      level,
      message,
      context: this.createContext(context),
      data,
      source: this.config.service,
      version: this.config.version,
      tags: this.extractTags(message, data)
    };

    // Add error information if provided
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      };
    }

    // Add performance information if available
    if (data?.performance) {
      entry.performance = data.performance;
    }

    // Output to console if enabled
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // Output to Strapi logger
    this.outputToStrapi(entry);

    // Aggregate if enabled
    if (this.aggregator) {
      this.aggregator.aggregate(entry).catch(err => {
        console.error('Failed to aggregate log entry:', err);
      });
    }
  }

  /**
   * Create log context with defaults
   */
  private createContext(context?: Partial<LogContext>): LogContext {
    return {
      timestamp: new Date(),
      environment: this.config.environment,
      requestId: this.generateRequestId(),
      ...context
    };
  }

  /**
   * Extract tags from message and data
   */
  private extractTags(message: string, data?: any): string[] {
    const tags: string[] = [];

    // Extract tags from message
    if (message.includes('hook')) tags.push('hook');
    if (message.includes('validation')) tags.push('validation');
    if (message.includes('calculation')) tags.push('calculation');
    if (message.includes('performance')) tags.push('performance');
    if (message.includes('error')) tags.push('error');

    // Extract tags from data
    if (data?.contentType) tags.push(`content-type:${data.contentType}`);
    if (data?.hookType) tags.push(`hook-type:${data.hookType}`);
    if (data?.operation) tags.push(`operation:${data.operation}`);

    return tags;
  }

  /**
   * Output to console with formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const timestamp = entry.context.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${level}] [${entry.source}]`;
    
    const contextStr = this.formatContext(entry.context);
    const message = `${prefix} ${entry.message} ${contextStr}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data);
        break;
      case LogLevel.INFO:
        console.info(message, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.error || entry.data);
        break;
    }
  }

  /**
   * Output to Strapi logger
   */
  private outputToStrapi(entry: LogEntry): void {
    if (!this.strapi?.log) return;

    const message = `${entry.message} ${this.formatContext(entry.context)}`;
    const logData = {
      ...entry.data,
      context: entry.context,
      tags: entry.tags,
      performance: entry.performance
    };

    switch (entry.level) {
      case LogLevel.DEBUG:
        this.strapi.log.debug(message, logData);
        break;
      case LogLevel.INFO:
        this.strapi.log.info(message, logData);
        break;
      case LogLevel.WARN:
        this.strapi.log.warn(message, logData);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        this.strapi.log.error(message, { ...logData, error: entry.error });
        break;
    }
  }

  /**
   * Format context for display
   */
  private formatContext(context: LogContext): string {
    const parts: string[] = [];
    
    if (context.requestId) parts.push(`req:${context.requestId.slice(0, 8)}`);
    if (context.operationId) parts.push(`op:${context.operationId.slice(0, 8)}`);
    if (context.contentType) parts.push(`type:${context.contentType}`);
    if (context.hookType) parts.push(`hook:${context.hookType}`);
    if (context.entityId) parts.push(`id:${context.entityId}`);

    return parts.length > 0 ? `[${parts.join(' ')}]` : '';
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return uuidv4().slice(0, 8);
  }

  /**
   * Get logger statistics
   */
  async getStats(): Promise<LogStats | null> {
    return this.aggregator ? await this.aggregator.getStats() : null;
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Flush aggregated logs
   */
  async flush(): Promise<void> {
    if (this.aggregator) {
      await this.aggregator.flush();
    }
  }
}

/**
 * Child logger with inherited context
 */
export class ChildLogger {
  constructor(
    private parent: StructuredLogger,
    private inheritedContext: Partial<LogContext>
  ) {}

  debug(message: string, data?: any, context?: Partial<LogContext>): void {
    this.parent.debug(message, data, { ...this.inheritedContext, ...context });
  }

  info(message: string, data?: any, context?: Partial<LogContext>): void {
    this.parent.info(message, data, { ...this.inheritedContext, ...context });
  }

  warn(message: string, data?: any, context?: Partial<LogContext>): void {
    this.parent.warn(message, data, { ...this.inheritedContext, ...context });
  }

  error(message: string, error?: Error, data?: any, context?: Partial<LogContext>): void {
    this.parent.error(message, error, data, { ...this.inheritedContext, ...context });
  }

  fatal(message: string, error?: Error, data?: any, context?: Partial<LogContext>): void {
    this.parent.fatal(message, error, data, { ...this.inheritedContext, ...context });
  }

  child(context: Partial<LogContext>): ChildLogger {
    return new ChildLogger(this.parent, { ...this.inheritedContext, ...context });
  }
}

export default StructuredLogger;