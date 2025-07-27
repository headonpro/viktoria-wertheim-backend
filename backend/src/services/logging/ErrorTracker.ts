/**
 * Error Tracker
 * 
 * Comprehensive error tracking system for lifecycle hooks with
 * error categorization, analysis, and notification capabilities.
 * 
 * Features:
 * - Error categorization and classification
 * - Error frequency and trend analysis
 * - Stack trace analysis and grouping
 * - Error context preservation
 * - Automatic error reporting and alerting
 * - Error resolution tracking
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  CALCULATION = 'calculation',
  DATABASE = 'database',
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  PERMISSION = 'permission',
  CONFIGURATION = 'configuration',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

/**
 * Error context information
 */
export interface ErrorContext {
  hookName: string;
  contentType: string;
  hookType: 'beforeCreate' | 'beforeUpdate' | 'afterCreate' | 'afterUpdate';
  entityId?: string | number;
  operationId?: string;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
  environment: string;
  version: string;
  additionalData?: Record<string, any>;
}

/**
 * Tracked error entry
 */
export interface TrackedError {
  id: string;
  fingerprint: string; // Unique identifier for grouping similar errors
  message: string;
  name: string;
  stack?: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  firstOccurrence: Date;
  lastOccurrence: Date;
  occurrenceCount: number;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  tags: string[];
  metadata: {
    affectedUsers: Set<string>;
    affectedSessions: Set<string>;
    relatedErrors: string[];
    performanceImpact?: {
      averageExecutionTime: number;
      slowestExecution: number;
    };
  };
}

/**
 * Error occurrence
 */
export interface ErrorOccurrence {
  id: string;
  errorId: string;
  timestamp: Date;
  context: ErrorContext;
  stackTrace?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Error statistics
 */
export interface ErrorStats {
  totalErrors: number;
  uniqueErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByHook: Record<string, number>;
  errorRate: number;
  topErrors: Array<{
    error: TrackedError;
    occurrences: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
  recentErrors: TrackedError[];
  resolvedErrors: number;
  unresolvedErrors: number;
}

/**
 * Error notification configuration
 */
export interface ErrorNotificationConfig {
  enabled: boolean;
  channels: string[];
  severityFilter: ErrorSeverity[];
  immediateNotification: boolean;
  batchNotification: {
    enabled: boolean;
    interval: number; // milliseconds
    maxBatchSize: number;
  };
  suppressDuplicates: boolean;
  suppressionWindow: number; // milliseconds
}

/**
 * Error tracking configuration
 */
export interface ErrorTrackerConfig {
  enabled: boolean;
  maxErrorsInMemory: number;
  errorRetentionTime: number; // milliseconds
  enableStackTraceAnalysis: boolean;
  enablePerformanceTracking: boolean;
  enableUserTracking: boolean;
  autoResolveAfter: number; // milliseconds
  fingerprintSaltKey: string;
  notification: ErrorNotificationConfig;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ErrorTrackerConfig = {
  enabled: true,
  maxErrorsInMemory: 10000,
  errorRetentionTime: 30 * 24 * 60 * 60 * 1000, // 30 days
  enableStackTraceAnalysis: true,
  enablePerformanceTracking: true,
  enableUserTracking: true,
  autoResolveAfter: 7 * 24 * 60 * 60 * 1000, // 7 days
  fingerprintSaltKey: 'lifecycle-hooks-error-tracking',
  notification: {
    enabled: true,
    channels: ['console'],
    severityFilter: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
    immediateNotification: true,
    batchNotification: {
      enabled: false,
      interval: 5 * 60 * 1000, // 5 minutes
      maxBatchSize: 10
    },
    suppressDuplicates: true,
    suppressionWindow: 60 * 1000 // 1 minute
  }
};

/**
 * Error classifier for automatic categorization
 */
export class ErrorClassifier {
  /**
   * Classify error based on message and stack trace
   */
  static classify(error: Error, context: ErrorContext): {
    category: ErrorCategory;
    severity: ErrorSeverity;
    tags: string[];
  } {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    const tags: string[] = [];

    // Determine category
    let category = ErrorCategory.UNKNOWN;
    
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      category = ErrorCategory.VALIDATION;
      tags.push('validation');
    } else if (message.includes('calculation') || message.includes('math') || message.includes('divide')) {
      category = ErrorCategory.CALCULATION;
      tags.push('calculation');
    } else if (message.includes('database') || message.includes('sql') || message.includes('connection')) {
      category = ErrorCategory.DATABASE;
      tags.push('database');
    } else if (message.includes('network') || message.includes('fetch') || message.includes('request')) {
      category = ErrorCategory.NETWORK;
      tags.push('network');
    } else if (message.includes('timeout') || message.includes('timed out')) {
      category = ErrorCategory.TIMEOUT;
      tags.push('timeout');
    } else if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      category = ErrorCategory.PERMISSION;
      tags.push('permission');
    } else if (message.includes('config') || message.includes('setting')) {
      category = ErrorCategory.CONFIGURATION;
      tags.push('configuration');
    } else if (message.includes('business') || message.includes('rule') || message.includes('constraint')) {
      category = ErrorCategory.BUSINESS_LOGIC;
      tags.push('business-logic');
    } else if (message.includes('system') || message.includes('internal')) {
      category = ErrorCategory.SYSTEM;
      tags.push('system');
    }

    // Determine severity
    let severity = ErrorSeverity.MEDIUM;
    
    if (message.includes('critical') || message.includes('fatal') || message.includes('crash')) {
      severity = ErrorSeverity.CRITICAL;
    } else if (message.includes('error') || message.includes('failed') || message.includes('exception')) {
      severity = ErrorSeverity.HIGH;
    } else if (message.includes('warning') || message.includes('deprecated')) {
      severity = ErrorSeverity.LOW;
    }

    // Add context-based tags
    tags.push(`hook:${context.hookType}`);
    tags.push(`content-type:${context.contentType}`);
    
    if (context.environment) {
      tags.push(`env:${context.environment}`);
    }

    return { category, severity, tags };
  }

  /**
   * Generate error fingerprint for grouping
   */
  static generateFingerprint(error: Error, context: ErrorContext, saltKey: string): string {
    // Create a stable fingerprint based on error characteristics
    const components = [
      error.name,
      this.normalizeMessage(error.message),
      this.extractStackSignature(error.stack),
      context.hookName,
      context.contentType
    ];

    const fingerprint = components.join('|');
    return createHash('sha256').update(fingerprint + saltKey).digest('hex').substring(0, 16);
  }

  /**
   * Normalize error message for consistent grouping
   */
  private static normalizeMessage(message: string): string {
    return message
      .replace(/\d+/g, 'N') // Replace numbers with N
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase();
  }

  /**
   * Extract stack trace signature for grouping
   */
  private static extractStackSignature(stack?: string): string {
    if (!stack) return '';

    const lines = stack.split('\n');
    const relevantLines = lines
      .slice(0, 5) // Take first 5 lines
      .map(line => line.replace(/:\d+:\d+/g, '')) // Remove line numbers
      .map(line => line.replace(/\([^)]*\)/g, '')) // Remove file paths in parentheses
      .join('|');

    return relevantLines;
  }
}

/**
 * Error tracker implementation
 */
export class ErrorTracker extends EventEmitter {
  private config: ErrorTrackerConfig;
  private errors: Map<string, TrackedError> = new Map();
  private occurrences: Map<string, ErrorOccurrence[]> = new Map();
  private recentNotifications: Map<string, Date> = new Map();
  private batchedErrors: TrackedError[] = [];
  private batchTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<ErrorTrackerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    if (this.config.enabled) {
      this.startTimers();
    }
  }

  /**
   * Track an error
   */
  trackError(error: Error, context: ErrorContext): string {
    if (!this.config.enabled) {
      return '';
    }

    // Classify error
    const classification = ErrorClassifier.classify(error, context);
    const fingerprint = ErrorClassifier.generateFingerprint(error, context, this.config.fingerprintSaltKey);

    // Check if error already exists
    let trackedError = this.errors.get(fingerprint);
    
    if (trackedError) {
      // Update existing error
      trackedError.lastOccurrence = new Date();
      trackedError.occurrenceCount++;
      
      // Update metadata
      if (context.userId) {
        trackedError.metadata.affectedUsers.add(context.userId);
      }
      if (context.sessionId) {
        trackedError.metadata.affectedSessions.add(context.sessionId);
      }
    } else {
      // Create new tracked error
      trackedError = {
        id: this.generateErrorId(),
        fingerprint,
        message: error.message,
        name: error.name,
        stack: error.stack,
        category: classification.category,
        severity: classification.severity,
        context,
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        occurrenceCount: 1,
        resolved: false,
        tags: classification.tags,
        metadata: {
          affectedUsers: new Set(context.userId ? [context.userId] : []),
          affectedSessions: new Set(context.sessionId ? [context.sessionId] : []),
          relatedErrors: []
        }
      };

      this.errors.set(fingerprint, trackedError);
    }

    // Record occurrence
    this.recordOccurrence(trackedError.id, error, context);

    // Emit event
    this.emit('error_tracked', trackedError);

    // Handle notifications
    if (this.config.notification.enabled) {
      this.handleNotification(trackedError);
    }

    // Limit errors in memory
    this.limitErrorsInMemory();

    return trackedError.id;
  }

  /**
   * Get error by ID
   */
  getError(errorId: string): TrackedError | null {
    for (const error of this.errors.values()) {
      if (error.id === errorId) {
        return error;
      }
    }
    return null;
  }

  /**
   * Get error by fingerprint
   */
  getErrorByFingerprint(fingerprint: string): TrackedError | null {
    return this.errors.get(fingerprint) || null;
  }

  /**
   * Get all errors
   */
  getAllErrors(): TrackedError[] {
    return Array.from(this.errors.values());
  }

  /**
   * Get errors by criteria
   */
  getErrors(criteria: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    hookName?: string;
    contentType?: string;
    resolved?: boolean;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): TrackedError[] {
    let filteredErrors = Array.from(this.errors.values());

    if (criteria.category) {
      filteredErrors = filteredErrors.filter(e => e.category === criteria.category);
    }
    if (criteria.severity) {
      filteredErrors = filteredErrors.filter(e => e.severity === criteria.severity);
    }
    if (criteria.hookName) {
      filteredErrors = filteredErrors.filter(e => e.context.hookName === criteria.hookName);
    }
    if (criteria.contentType) {
      filteredErrors = filteredErrors.filter(e => e.context.contentType === criteria.contentType);
    }
    if (criteria.resolved !== undefined) {
      filteredErrors = filteredErrors.filter(e => e.resolved === criteria.resolved);
    }
    if (criteria.startTime) {
      filteredErrors = filteredErrors.filter(e => e.lastOccurrence >= criteria.startTime!);
    }
    if (criteria.endTime) {
      filteredErrors = filteredErrors.filter(e => e.lastOccurrence <= criteria.endTime!);
    }

    // Sort by last occurrence (most recent first)
    filteredErrors.sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime());

    if (criteria.limit) {
      filteredErrors = filteredErrors.slice(0, criteria.limit);
    }

    return filteredErrors;
  }

  /**
   * Get error occurrences
   */
  getErrorOccurrences(errorId: string, limit: number = 100): ErrorOccurrence[] {
    const occurrences = this.occurrences.get(errorId) || [];
    return occurrences.slice(-limit);
  }

  /**
   * Resolve error
   */
  resolveError(errorId: string, resolvedBy: string, notes?: string): boolean {
    const error = this.getError(errorId);
    if (!error) {
      return false;
    }

    error.resolved = true;
    error.resolvedBy = resolvedBy;
    error.resolvedAt = new Date();
    error.resolutionNotes = notes;

    this.emit('error_resolved', error);
    return true;
  }

  /**
   * Reopen error
   */
  reopenError(errorId: string): boolean {
    const error = this.getError(errorId);
    if (!error) {
      return false;
    }

    error.resolved = false;
    error.resolvedBy = undefined;
    error.resolvedAt = undefined;
    error.resolutionNotes = undefined;

    this.emit('error_reopened', error);
    return true;
  }

  /**
   * Get error statistics
   */
  getStats(): ErrorStats {
    const allErrors = Array.from(this.errors.values());
    const totalErrors = allErrors.reduce((sum, e) => sum + e.occurrenceCount, 0);

    const errorsByCategory = Object.values(ErrorCategory).reduce((acc, category) => {
      acc[category] = allErrors.filter(e => e.category === category).length;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    const errorsBySeverity = Object.values(ErrorSeverity).reduce((acc, severity) => {
      acc[severity] = allErrors.filter(e => e.severity === severity).length;
      return acc;
    }, {} as Record<ErrorSeverity, number>);

    const errorsByHook = allErrors.reduce((acc, error) => {
      const hookName = error.context.hookName;
      acc[hookName] = (acc[hookName] || 0) + error.occurrenceCount;
      return acc;
    }, {} as Record<string, number>);

    const topErrors = allErrors
      .map(error => ({
        error,
        occurrences: error.occurrenceCount,
        trend: this.calculateErrorTrend(error) as 'increasing' | 'stable' | 'decreasing'
      }))
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10);

    const recentErrors = allErrors
      .sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime())
      .slice(0, 20);

    const resolvedErrors = allErrors.filter(e => e.resolved).length;
    const unresolvedErrors = allErrors.filter(e => !e.resolved).length;

    return {
      totalErrors,
      uniqueErrors: allErrors.length,
      errorsByCategory,
      errorsBySeverity,
      errorsByHook,
      errorRate: 0, // Would need total operations to calculate
      topErrors,
      recentErrors,
      resolvedErrors,
      unresolvedErrors
    };
  }

  /**
   * Search errors
   */
  searchErrors(query: string, limit: number = 50): TrackedError[] {
    const searchTerm = query.toLowerCase();
    
    return Array.from(this.errors.values())
      .filter(error => 
        error.message.toLowerCase().includes(searchTerm) ||
        error.name.toLowerCase().includes(searchTerm) ||
        error.context.hookName.toLowerCase().includes(searchTerm) ||
        error.context.contentType.toLowerCase().includes(searchTerm) ||
        error.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      )
      .sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime())
      .slice(0, limit);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorTrackerConfig>): void {
    const wasEnabled = this.config.enabled;
    this.config = { ...this.config, ...config };

    if (this.config.enabled && !wasEnabled) {
      this.startTimers();
    } else if (!this.config.enabled && wasEnabled) {
      this.stopTimers();
    }
  }

  /**
   * Clear all errors
   */
  clear(): void {
    this.errors.clear();
    this.occurrences.clear();
    this.recentNotifications.clear();
    this.batchedErrors = [];
  }

  /**
   * Record error occurrence
   */
  private recordOccurrence(errorId: string, error: Error, context: ErrorContext): void {
    const occurrence: ErrorOccurrence = {
      id: `${errorId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      errorId,
      timestamp: new Date(),
      context,
      stackTrace: error.stack,
      additionalInfo: context.additionalData
    };

    if (!this.occurrences.has(errorId)) {
      this.occurrences.set(errorId, []);
    }

    const occurrences = this.occurrences.get(errorId)!;
    occurrences.push(occurrence);

    // Limit occurrences per error
    if (occurrences.length > 1000) {
      this.occurrences.set(errorId, occurrences.slice(-1000));
    }
  }

  /**
   * Handle error notification
   */
  private handleNotification(error: TrackedError): void {
    const config = this.config.notification;
    
    // Check severity filter
    if (!config.severityFilter.includes(error.severity)) {
      return;
    }

    // Check duplicate suppression
    if (config.suppressDuplicates) {
      const lastNotification = this.recentNotifications.get(error.fingerprint);
      if (lastNotification && 
          (Date.now() - lastNotification.getTime()) < config.suppressionWindow) {
        return;
      }
    }

    if (config.immediateNotification) {
      this.sendNotification(error);
    } else if (config.batchNotification.enabled) {
      this.addToBatch(error);
    }

    // Update notification timestamp
    this.recentNotifications.set(error.fingerprint, new Date());
  }

  /**
   * Send immediate notification
   */
  private sendNotification(error: TrackedError): void {
    this.emit('error_notification', {
      type: 'immediate',
      errors: [error],
      channels: this.config.notification.channels
    });
  }

  /**
   * Add error to batch
   */
  private addToBatch(error: TrackedError): void {
    this.batchedErrors.push(error);

    if (this.batchedErrors.length >= this.config.notification.batchNotification.maxBatchSize) {
      this.sendBatchNotification();
    }
  }

  /**
   * Send batch notification
   */
  private sendBatchNotification(): void {
    if (this.batchedErrors.length === 0) {
      return;
    }

    this.emit('error_notification', {
      type: 'batch',
      errors: [...this.batchedErrors],
      channels: this.config.notification.channels
    });

    this.batchedErrors = [];
  }

  /**
   * Calculate error trend
   */
  private calculateErrorTrend(error: TrackedError): string {
    const occurrences = this.occurrences.get(error.id) || [];
    if (occurrences.length < 10) {
      return 'stable';
    }

    const now = Date.now();
    const recentWindow = 60 * 60 * 1000; // 1 hour
    const olderWindow = 2 * 60 * 60 * 1000; // 2 hours

    const recentOccurrences = occurrences.filter(o => 
      (now - o.timestamp.getTime()) < recentWindow
    ).length;

    const olderOccurrences = occurrences.filter(o => {
      const age = now - o.timestamp.getTime();
      return age >= recentWindow && age < olderWindow;
    }).length;

    if (recentOccurrences > olderOccurrences * 1.5) {
      return 'increasing';
    } else if (recentOccurrences < olderOccurrences * 0.5) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Limit errors in memory
   */
  private limitErrorsInMemory(): void {
    if (this.errors.size <= this.config.maxErrorsInMemory) {
      return;
    }

    // Remove oldest resolved errors first
    const sortedErrors = Array.from(this.errors.entries())
      .sort(([, a], [, b]) => {
        if (a.resolved && !b.resolved) return -1;
        if (!a.resolved && b.resolved) return 1;
        return a.lastOccurrence.getTime() - b.lastOccurrence.getTime();
      });

    const toRemove = sortedErrors.slice(0, this.errors.size - this.config.maxErrorsInMemory);
    
    for (const [fingerprint, error] of toRemove) {
      this.errors.delete(fingerprint);
      this.occurrences.delete(error.id);
    }
  }

  /**
   * Start timers
   */
  private startTimers(): void {
    // Batch notification timer
    if (this.config.notification.batchNotification.enabled) {
      this.batchTimer = setInterval(() => {
        this.sendBatchNotification();
      }, this.config.notification.batchNotification.interval);
    }

    // Cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Stop timers
   */
  private stopTimers(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const cutoffTime = Date.now() - this.config.errorRetentionTime;

    // Auto-resolve old errors
    if (this.config.autoResolveAfter > 0) {
      const autoResolveCutoff = Date.now() - this.config.autoResolveAfter;
      
      for (const error of this.errors.values()) {
        if (!error.resolved && error.lastOccurrence.getTime() < autoResolveCutoff) {
          error.resolved = true;
          error.resolvedBy = 'system';
          error.resolvedAt = new Date();
          error.resolutionNotes = 'Auto-resolved due to inactivity';
          this.emit('error_auto_resolved', error);
        }
      }
    }

    // Remove old resolved errors
    const toRemove: string[] = [];
    for (const [fingerprint, error] of this.errors.entries()) {
      if (error.resolved && error.lastOccurrence.getTime() < cutoffTime) {
        toRemove.push(fingerprint);
      }
    }

    for (const fingerprint of toRemove) {
      const error = this.errors.get(fingerprint);
      if (error) {
        this.errors.delete(fingerprint);
        this.occurrences.delete(error.id);
      }
    }

    // Clean up old notifications
    for (const [fingerprint, timestamp] of this.recentNotifications.entries()) {
      if (timestamp.getTime() < cutoffTime) {
        this.recentNotifications.delete(fingerprint);
      }
    }
  }
}

export default ErrorTracker;