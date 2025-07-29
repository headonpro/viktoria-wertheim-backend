/**
 * Error Classification Utilities
 * Provides detailed error classification and context extraction
 */

import { 
  AutomationError, 
  AutomationErrorType, 
  ErrorSeverity, 
  ErrorContext,
  ERROR_CODES,
  ErrorCode
} from './error-handling';

export class ErrorClassifier {
  
  /**
   * Creates a structured AutomationError from a generic Error
   */
  static createAutomationError(
    error: Error, 
    context: ErrorContext, 
    additionalDetails?: any
  ): AutomationError {
    const type = this.classifyErrorType(error);
    const severity = this.determineSeverity(type, error);
    const code = this.getErrorCode(type, error);
    const retryable = this.isRetryable(type, error);

    return {
      type,
      code,
      message: error.message,
      details: {
        originalError: error.name,
        stack: error.stack,
        ...additionalDetails
      },
      timestamp: new Date(),
      context,
      originalError: error,
      retryable,
      severity
    };
  }

  /**
   * Classifies error type based on error characteristics
   */
  static classifyErrorType(error: Error): AutomationErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    // Database-related errors
    if (this.isDatabaseError(message, name, stack)) {
      return this.classifyDatabaseError(message, name, stack);
    }

    // Validation errors
    if (this.isValidationError(message, name, stack)) {
      return this.classifyValidationError(message, name, stack);
    }

    // System errors
    if (this.isSystemError(message, name, stack)) {
      return this.classifySystemError(message, name, stack);
    }

    // Queue errors
    if (this.isQueueError(message, name, stack)) {
      return this.classifyQueueError(message, name, stack);
    }

    // Network errors
    if (this.isNetworkError(message, name, stack)) {
      return this.classifyNetworkError(message, name, stack);
    }

    // Configuration errors
    if (this.isConfigurationError(message, name, stack)) {
      return this.classifyConfigurationError(message, name, stack);
    }

    // Default to unknown
    return AutomationErrorType.UNKNOWN_ERROR;
  }

  /**
   * Determines error severity based on type and characteristics
   */
  static determineSeverity(type: AutomationErrorType, error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();

    // Critical errors that require immediate attention
    const criticalTypes = [
      AutomationErrorType.SYSTEM_ERROR,
      AutomationErrorType.MEMORY_ERROR,
      AutomationErrorType.DATABASE_ERROR,
      AutomationErrorType.DATA_INCONSISTENCY
    ];

    if (criticalTypes.includes(type)) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    const highSeverityTypes = [
      AutomationErrorType.TRANSACTION_ERROR,
      AutomationErrorType.CONSTRAINT_VIOLATION,
      AutomationErrorType.CALCULATION_ERROR,
      AutomationErrorType.QUEUE_ERROR
    ];

    if (highSeverityTypes.includes(type)) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    const mediumSeverityTypes = [
      AutomationErrorType.TIMEOUT_ERROR,
      AutomationErrorType.CONCURRENCY_ERROR,
      AutomationErrorType.NETWORK_ERROR,
      AutomationErrorType.CONFIGURATION_ERROR
    ];

    if (mediumSeverityTypes.includes(type)) {
      return ErrorSeverity.MEDIUM;
    }

    // Check for specific severity indicators in message
    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }

    if (message.includes('warning') || message.includes('deprecated')) {
      return ErrorSeverity.LOW;
    }

    // Default to medium
    return ErrorSeverity.MEDIUM;
  }

  /**
   * Gets appropriate error code for the error
   */
  static getErrorCode(type: AutomationErrorType, error: Error): ErrorCode {
    const message = error.message.toLowerCase();

    // Map specific error patterns to codes
    switch (type) {
      case AutomationErrorType.VALIDATION_ERROR:
        if (message.includes('negative')) return ERROR_CODES.NEGATIVE_SCORE;
        if (message.includes('team') && message.includes('itself')) return ERROR_CODES.TEAM_AGAINST_ITSELF;
        if (message.includes('required')) return ERROR_CODES.MISSING_REQUIRED_FIELD;
        if (message.includes('status')) return ERROR_CODES.INVALID_STATUS_TRANSITION;
        if (message.includes('spieltag')) return ERROR_CODES.INVALID_SPIELTAG_RANGE;
        return ERROR_CODES.MISSING_REQUIRED_FIELD;

      case AutomationErrorType.DATABASE_ERROR:
      case AutomationErrorType.CONNECTION_ERROR:
        if (message.includes('connection')) return ERROR_CODES.CONNECTION_FAILED;
        if (message.includes('transaction')) return ERROR_CODES.TRANSACTION_FAILED;
        if (message.includes('constraint')) return ERROR_CODES.CONSTRAINT_VIOLATION;
        if (message.includes('deadlock')) return ERROR_CODES.DEADLOCK_DETECTED;
        return ERROR_CODES.CONNECTION_FAILED;

      case AutomationErrorType.QUEUE_ERROR:
        if (message.includes('full')) return ERROR_CODES.QUEUE_FULL;
        if (message.includes('timeout')) return ERROR_CODES.JOB_TIMEOUT;
        if (message.includes('cancelled')) return ERROR_CODES.JOB_CANCELLED;
        if (message.includes('worker')) return ERROR_CODES.WORKER_UNAVAILABLE;
        return ERROR_CODES.QUEUE_FULL;

      case AutomationErrorType.CALCULATION_ERROR:
        if (message.includes('timeout')) return ERROR_CODES.CALCULATION_TIMEOUT;
        if (message.includes('inconsistency')) return ERROR_CODES.DATA_INCONSISTENCY;
        if (message.includes('team')) return ERROR_CODES.MISSING_TEAM_DATA;
        if (message.includes('game') || message.includes('spiel')) return ERROR_CODES.INVALID_GAME_DATA;
        return ERROR_CODES.CALCULATION_TIMEOUT;

      case AutomationErrorType.SYSTEM_ERROR:
      case AutomationErrorType.MEMORY_ERROR:
        if (message.includes('memory')) return ERROR_CODES.MEMORY_EXHAUSTED;
        if (message.includes('cpu')) return ERROR_CODES.CPU_OVERLOAD;
        if (message.includes('disk')) return ERROR_CODES.DISK_FULL;
        if (message.includes('service')) return ERROR_CODES.SERVICE_UNAVAILABLE;
        return ERROR_CODES.SERVICE_UNAVAILABLE;

      default:
        return ERROR_CODES.SERVICE_UNAVAILABLE;
    }
  }

  /**
   * Determines if an error is retryable
   */
  static isRetryable(type: AutomationErrorType, error: Error): boolean {
    const message = error.message.toLowerCase();

    // Never retry these error types
    const nonRetryableTypes = [
      AutomationErrorType.VALIDATION_ERROR,
      AutomationErrorType.INVALID_INPUT,
      AutomationErrorType.BUSINESS_RULE_VIOLATION,
      AutomationErrorType.CONSTRAINT_VIOLATION,
      AutomationErrorType.PERMISSION_DENIED,
      AutomationErrorType.CONFIGURATION_ERROR
    ];

    if (nonRetryableTypes.includes(type)) {
      return false;
    }

    // Check for specific non-retryable patterns
    if (message.includes('invalid') || 
        message.includes('malformed') || 
        message.includes('unauthorized') ||
        message.includes('forbidden')) {
      return false;
    }

    // Retryable error types
    const retryableTypes = [
      AutomationErrorType.TIMEOUT_ERROR,
      AutomationErrorType.NETWORK_ERROR,
      AutomationErrorType.CONNECTION_ERROR,
      AutomationErrorType.CONCURRENCY_ERROR,
      AutomationErrorType.QUEUE_ERROR,
      AutomationErrorType.SERVICE_UNAVAILABLE
    ];

    return retryableTypes.includes(type);
  }

  // Private helper methods for error classification

  private static isDatabaseError(message: string, name: string, stack: string): boolean {
    const dbKeywords = [
      'connection', 'database', 'sql', 'query', 'transaction', 
      'constraint', 'deadlock', 'timeout', 'pg', 'postgres'
    ];
    
    return dbKeywords.some(keyword => 
      message.includes(keyword) || name.includes(keyword) || stack.includes(keyword)
    );
  }

  private static classifyDatabaseError(message: string, name: string, stack: string): AutomationErrorType {
    if (message.includes('connection') || message.includes('econnrefused')) {
      return AutomationErrorType.CONNECTION_ERROR;
    }
    if (message.includes('transaction') || message.includes('rollback')) {
      return AutomationErrorType.TRANSACTION_ERROR;
    }
    if (message.includes('constraint') || message.includes('unique') || message.includes('foreign key')) {
      return AutomationErrorType.CONSTRAINT_VIOLATION;
    }
    if (message.includes('deadlock')) {
      return AutomationErrorType.CONCURRENCY_ERROR;
    }
    return AutomationErrorType.DATABASE_ERROR;
  }

  private static isValidationError(message: string, name: string, stack: string): boolean {
    const validationKeywords = [
      'validation', 'invalid', 'required', 'missing', 'empty',
      'format', 'range', 'length', 'type', 'schema'
    ];
    
    return validationKeywords.some(keyword => 
      message.includes(keyword) || name.includes(keyword)
    ) || name.includes('validationerror');
  }

  private static classifyValidationError(message: string, name: string, stack: string): AutomationErrorType {
    if (message.includes('required') || message.includes('missing')) {
      return AutomationErrorType.INVALID_INPUT;
    }
    if (message.includes('business') || message.includes('rule')) {
      return AutomationErrorType.BUSINESS_RULE_VIOLATION;
    }
    return AutomationErrorType.VALIDATION_ERROR;
  }

  private static isSystemError(message: string, name: string, stack: string): boolean {
    const systemKeywords = [
      'memory', 'heap', 'cpu', 'disk', 'resource', 'system',
      'out of memory', 'maximum call stack', 'enomem'
    ];
    
    return systemKeywords.some(keyword => 
      message.includes(keyword) || name.includes(keyword) || stack.includes(keyword)
    );
  }

  private static classifySystemError(message: string, name: string, stack: string): AutomationErrorType {
    if (message.includes('memory') || message.includes('heap') || message.includes('enomem')) {
      return AutomationErrorType.MEMORY_ERROR;
    }
    if (message.includes('timeout')) {
      return AutomationErrorType.TIMEOUT_ERROR;
    }
    if (message.includes('resource') || message.includes('exhausted')) {
      return AutomationErrorType.RESOURCE_EXHAUSTED;
    }
    return AutomationErrorType.SYSTEM_ERROR;
  }

  private static isQueueError(message: string, name: string, stack: string): boolean {
    const queueKeywords = [
      'queue', 'job', 'worker', 'task', 'bull', 'redis'
    ];
    
    return queueKeywords.some(keyword => 
      message.includes(keyword) || name.includes(keyword) || stack.includes(keyword)
    );
  }

  private static classifyQueueError(message: string, name: string, stack: string): AutomationErrorType {
    if (message.includes('timeout')) {
      return AutomationErrorType.JOB_TIMEOUT;
    }
    if (message.includes('cancelled')) {
      return AutomationErrorType.JOB_CANCELLED;
    }
    if (message.includes('full')) {
      return AutomationErrorType.QUEUE_FULL;
    }
    return AutomationErrorType.QUEUE_ERROR;
  }

  private static isNetworkError(message: string, name: string, stack: string): boolean {
    const networkKeywords = [
      'network', 'fetch', 'request', 'response', 'http', 'https',
      'enotfound', 'econnreset', 'etimedout'
    ];
    
    return networkKeywords.some(keyword => 
      message.includes(keyword) || name.includes(keyword)
    );
  }

  private static classifyNetworkError(message: string, name: string, stack: string): AutomationErrorType {
    if (message.includes('timeout')) {
      return AutomationErrorType.TIMEOUT_ERROR;
    }
    if (message.includes('unavailable') || message.includes('503')) {
      return AutomationErrorType.SERVICE_UNAVAILABLE;
    }
    return AutomationErrorType.NETWORK_ERROR;
  }

  private static isConfigurationError(message: string, name: string, stack: string): boolean {
    const configKeywords = [
      'config', 'configuration', 'setting', 'environment', 'env',
      'permission', 'unauthorized', 'forbidden', 'access denied'
    ];
    
    return configKeywords.some(keyword => 
      message.includes(keyword) || name.includes(keyword)
    );
  }

  private static classifyConfigurationError(message: string, name: string, stack: string): AutomationErrorType {
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return AutomationErrorType.PERMISSION_DENIED;
    }
    if (message.includes('disabled') || message.includes('feature')) {
      return AutomationErrorType.FEATURE_DISABLED;
    }
    return AutomationErrorType.CONFIGURATION_ERROR;
  }

  /**
   * Extracts additional context from error for better debugging
   */
  static extractErrorContext(error: Error): Record<string, any> {
    const context: Record<string, any> = {};

    // Extract SQL error details if present
    if (error.message.includes('SQL') || error.message.includes('query')) {
      const sqlMatch = error.message.match(/SQL: (.+?)(?:\n|$)/);
      if (sqlMatch) {
        context.sql = sqlMatch[1];
      }
    }

    // Extract HTTP status codes
    const statusMatch = error.message.match(/(\d{3})/);
    if (statusMatch) {
      context.httpStatus = parseInt(statusMatch[1]);
    }

    // Extract file paths
    const pathMatch = error.message.match(/([\/\\][\w\/\\.-]+)/);
    if (pathMatch) {
      context.filePath = pathMatch[1];
    }

    // Extract line numbers from stack trace
    if (error.stack) {
      const lineMatch = error.stack.match(/:(\d+):(\d+)/);
      if (lineMatch) {
        context.line = parseInt(lineMatch[1]);
        context.column = parseInt(lineMatch[2]);
      }
    }

    return context;
  }
}