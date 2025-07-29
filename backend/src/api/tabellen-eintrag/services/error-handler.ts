/**
 * Structured Error Handler Implementation
 * Provides comprehensive error handling, classification, and recovery strategies
 */

import { 
  ErrorHandler, 
  AutomationError, 
  ErrorContext, 
  ErrorHandlingResult,
  AutomationErrorType,
  ErrorSeverity,
  ErrorAction,
  FallbackStrategy,
  RetryStrategy,
  BackoffType,
  CircuitBreaker,
  CircuitBreakerState,
  CircuitBreakerConfig,
  ErrorMetrics,
  ERROR_CODES,
  ErrorCode,
  NotificationType,
  NotificationPriority
} from './error-handling';

export class StructuredErrorHandler implements ErrorHandler {
  private errorMetrics: ErrorMetrics;
  private circuitBreakers: Map<string, CircuitBreaker>;
  private fallbackStrategy: FallbackStrategy;
  private retryStrategy: RetryStrategy;

  constructor(
    fallbackStrategy: FallbackStrategy,
    retryStrategy: RetryStrategy
  ) {
    this.fallbackStrategy = fallbackStrategy;
    this.retryStrategy = retryStrategy;
    this.errorMetrics = this.initializeMetrics();
    this.circuitBreakers = new Map();
  }

  async handleError(error: AutomationError): Promise<ErrorHandlingResult> {
    // Update metrics
    this.updateErrorMetrics(error);

    // Log the error
    this.logError(error, error.context);

    // Check circuit breaker
    const circuitBreaker = this.getCircuitBreaker(error.context.operation);
    if (circuitBreaker.state === CircuitBreakerState.OPEN) {
      return this.handleCircuitBreakerOpen(error);
    }

    // Determine handling strategy
    const action = this.determineErrorAction(error);
    
    switch (action) {
      case ErrorAction.RETRY:
        return this.handleRetry(error, 0);
      
      case ErrorAction.RETRY_WITH_DELAY:
        return this.handleRetryWithDelay(error, 1);
      
      case ErrorAction.RETRY_WITH_BACKOFF:
        return this.handleRetryWithBackoff(error, 1);
      
      case ErrorAction.FALLBACK:
        return this.handleFallback(error);
      
      case ErrorAction.ROLLBACK:
        return this.handleRollback(error);
      
      case ErrorAction.ESCALATE:
        return this.handleEscalation(error);
      
      case ErrorAction.FAIL_FAST:
        return this.handleFailFast(error);
      
      case ErrorAction.IGNORE:
        return this.handleIgnore(error);
      
      default:
        return this.handleUnknownAction(error);
    }
  }

  classifyError(error: Error): AutomationErrorType {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Database errors
    if (errorMessage.includes('connection') || errorMessage.includes('econnrefused')) {
      return AutomationErrorType.CONNECTION_ERROR;
    }
    if (errorMessage.includes('transaction') || errorMessage.includes('rollback')) {
      return AutomationErrorType.TRANSACTION_ERROR;
    }
    if (errorMessage.includes('constraint') || errorMessage.includes('unique')) {
      return AutomationErrorType.CONSTRAINT_VIOLATION;
    }
    if (errorMessage.includes('deadlock')) {
      return AutomationErrorType.CONCURRENCY_ERROR;
    }

    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return AutomationErrorType.VALIDATION_ERROR;
    }
    if (errorMessage.includes('required') || errorMessage.includes('missing')) {
      return AutomationErrorType.INVALID_INPUT;
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorName.includes('timeout')) {
      return AutomationErrorType.TIMEOUT_ERROR;
    }

    // Memory errors
    if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
      return AutomationErrorType.MEMORY_ERROR;
    }

    // Queue errors
    if (errorMessage.includes('queue') || errorMessage.includes('job')) {
      return AutomationErrorType.QUEUE_ERROR;
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return AutomationErrorType.NETWORK_ERROR;
    }

    // Default to unknown
    return AutomationErrorType.UNKNOWN_ERROR;
  }

  shouldRetry(error: AutomationError): boolean {
    // Check if error type is retryable
    if (!this.retryStrategy.retryableErrors.includes(error.type)) {
      return false;
    }

    // Check circuit breaker
    const circuitBreaker = this.getCircuitBreaker(error.context.operation);
    if (circuitBreaker.state === CircuitBreakerState.OPEN) {
      return false;
    }

    // Check severity
    if (error.severity === ErrorSeverity.CRITICAL) {
      return false;
    }

    return error.retryable;
  }

  getRetryDelay(error: AutomationError, attemptNumber: number): number {
    const { backoffType, baseDelay, maxDelay, jitter } = this.retryStrategy;

    let delay: number;

    switch (backoffType) {
      case BackoffType.FIXED:
        delay = baseDelay;
        break;
      
      case BackoffType.LINEAR:
        delay = baseDelay * attemptNumber;
        break;
      
      case BackoffType.EXPONENTIAL:
        delay = baseDelay * Math.pow(2, attemptNumber - 1);
        break;
      
      default:
        delay = baseDelay;
    }

    // Apply maximum delay limit
    delay = Math.min(delay, maxDelay);

    // Add jitter if enabled
    if (jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.max(delay, 0);
  }

  logError(error: AutomationError, context: ErrorContext): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: this.getLogLevel(error.severity),
      type: error.type,
      code: error.code,
      message: error.message,
      context: {
        operation: context.operation,
        ligaId: context.ligaId,
        saisonId: context.saisonId,
        jobId: context.jobId,
        userId: context.userId,
        requestId: context.requestId
      },
      details: error.details,
      stack: error.originalError?.stack,
      retryable: error.retryable,
      severity: error.severity
    };

    // Use Strapi's logger
    const logger = strapi.log;
    
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(logEntry);
        break;
      case ErrorSeverity.HIGH:
        logger.error(logEntry);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(logEntry);
        break;
      case ErrorSeverity.LOW:
        logger.info(logEntry);
        break;
    }
  }

  // Error recovery strategies
  private async handleRetry(error: AutomationError, attemptNumber: number): Promise<ErrorHandlingResult> {
    return {
      handled: true,
      action: ErrorAction.RETRY,
      retryAfter: 0
    };
  }

  private async handleRetryWithDelay(error: AutomationError, attemptNumber: number): Promise<ErrorHandlingResult> {
    const delay = this.getRetryDelay(error, attemptNumber);
    
    return {
      handled: true,
      action: ErrorAction.RETRY_WITH_DELAY,
      retryAfter: delay
    };
  }

  private async handleRetryWithBackoff(error: AutomationError, attemptNumber: number): Promise<ErrorHandlingResult> {
    const delay = this.getRetryDelay(error, attemptNumber);
    
    return {
      handled: true,
      action: ErrorAction.RETRY_WITH_BACKOFF,
      retryAfter: delay
    };
  }

  private async handleFallback(error: AutomationError): Promise<ErrorHandlingResult> {
    let fallbackData: any;

    try {
      switch (error.type) {
        case AutomationErrorType.CALCULATION_ERROR:
          fallbackData = await this.fallbackStrategy.onCalculationFailure(error.context);
          break;
        
        case AutomationErrorType.QUEUE_ERROR:
        case AutomationErrorType.QUEUE_FULL:
          await this.fallbackStrategy.onQueueOverload(error.context);
          break;
        
        case AutomationErrorType.DATABASE_ERROR:
        case AutomationErrorType.CONNECTION_ERROR:
          await this.fallbackStrategy.onDatabaseUnavailable(error.context);
          break;
        
        case AutomationErrorType.VALIDATION_ERROR:
          fallbackData = await this.fallbackStrategy.onValidationFailure(error.context);
          break;
      }

      return {
        handled: true,
        action: ErrorAction.FALLBACK,
        fallbackData
      };
    } catch (fallbackError) {
      // Fallback failed, escalate
      return this.handleEscalation(error);
    }
  }

  private async handleRollback(error: AutomationError): Promise<ErrorHandlingResult> {
    // Trigger rollback through snapshot service
    return {
      handled: true,
      action: ErrorAction.ROLLBACK,
      notification: {
        type: NotificationType.ADMIN_PANEL,
        recipients: ['admin'],
        subject: 'Automatic Rollback Triggered',
        message: `Rollback initiated due to ${error.type}: ${error.message}`,
        priority: NotificationPriority.HIGH
      }
    };
  }

  private async handleEscalation(error: AutomationError): Promise<ErrorHandlingResult> {
    return {
      handled: true,
      action: ErrorAction.ESCALATE,
      notification: {
        type: NotificationType.EMAIL,
        recipients: ['admin@viktoria-wertheim.de'],
        subject: `Critical Error in Tabellen-Automatisierung`,
        message: `A critical error occurred that requires immediate attention:\n\nType: ${error.type}\nCode: ${error.code}\nMessage: ${error.message}\nOperation: ${error.context.operation}\nTimestamp: ${error.timestamp.toISOString()}`,
        priority: NotificationPriority.URGENT
      }
    };
  }

  private async handleFailFast(error: AutomationError): Promise<ErrorHandlingResult> {
    // Update circuit breaker
    this.updateCircuitBreaker(error.context.operation, false);

    return {
      handled: true,
      action: ErrorAction.FAIL_FAST
    };
  }

  private async handleIgnore(error: AutomationError): Promise<ErrorHandlingResult> {
    return {
      handled: true,
      action: ErrorAction.IGNORE
    };
  }

  private async handleUnknownAction(error: AutomationError): Promise<ErrorHandlingResult> {
    return {
      handled: false,
      action: ErrorAction.ESCALATE,
      notification: {
        type: NotificationType.LOG,
        recipients: [],
        subject: 'Unknown Error Action',
        message: `Unknown error action for error: ${error.type}`,
        priority: NotificationPriority.NORMAL
      }
    };
  }

  private async handleCircuitBreakerOpen(error: AutomationError): Promise<ErrorHandlingResult> {
    return {
      handled: true,
      action: ErrorAction.FAIL_FAST,
      notification: {
        type: NotificationType.ADMIN_PANEL,
        recipients: ['admin'],
        subject: 'Circuit Breaker Open',
        message: `Circuit breaker is open for operation: ${error.context.operation}`,
        priority: NotificationPriority.HIGH
      }
    };
  }

  // Helper methods
  private determineErrorAction(error: AutomationError): ErrorAction {
    // Critical errors should be escalated
    if (error.severity === ErrorSeverity.CRITICAL) {
      return ErrorAction.ESCALATE;
    }

    // Check if retryable
    if (this.shouldRetry(error)) {
      switch (error.type) {
        case AutomationErrorType.TIMEOUT_ERROR:
        case AutomationErrorType.NETWORK_ERROR:
          return ErrorAction.RETRY_WITH_BACKOFF;
        
        case AutomationErrorType.CONNECTION_ERROR:
        case AutomationErrorType.DATABASE_ERROR:
          return ErrorAction.RETRY_WITH_DELAY;
        
        case AutomationErrorType.CONCURRENCY_ERROR:
          return ErrorAction.RETRY;
        
        default:
          return ErrorAction.RETRY_WITH_DELAY;
      }
    }

    // Non-retryable errors
    switch (error.type) {
      case AutomationErrorType.VALIDATION_ERROR:
      case AutomationErrorType.INVALID_INPUT:
        return ErrorAction.FAIL_FAST;
      
      case AutomationErrorType.CALCULATION_ERROR:
      case AutomationErrorType.DATA_INCONSISTENCY:
        return ErrorAction.ROLLBACK;
      
      case AutomationErrorType.QUEUE_FULL:
      case AutomationErrorType.RESOURCE_EXHAUSTED:
        return ErrorAction.FALLBACK;
      
      case AutomationErrorType.MEMORY_ERROR:
      case AutomationErrorType.SYSTEM_ERROR:
        return ErrorAction.ESCALATE;
      
      default:
        return ErrorAction.FALLBACK;
    }
  }

  private getCircuitBreaker(operation: string): CircuitBreaker {
    if (!this.circuitBreakers.has(operation)) {
      const config: CircuitBreakerConfig = {
        enabled: true,
        failureThreshold: 5,
        recoveryTimeout: 60000, // 1 minute
        monitoringWindow: 300000, // 5 minutes
        halfOpenMaxCalls: 3
      };

      this.circuitBreakers.set(operation, {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        config
      });
    }

    return this.circuitBreakers.get(operation)!;
  }

  private updateCircuitBreaker(operation: string, success: boolean): void {
    const circuitBreaker = this.getCircuitBreaker(operation);

    if (success) {
      // Reset failure count on success
      circuitBreaker.failureCount = 0;
      if (circuitBreaker.state === CircuitBreakerState.HALF_OPEN) {
        circuitBreaker.state = CircuitBreakerState.CLOSED;
      }
    } else {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = new Date();

      // Open circuit breaker if threshold reached
      if (circuitBreaker.failureCount >= circuitBreaker.config.failureThreshold) {
        circuitBreaker.state = CircuitBreakerState.OPEN;
        circuitBreaker.nextAttemptTime = new Date(
          Date.now() + circuitBreaker.config.recoveryTimeout
        );
      }
    }

    // Check if circuit breaker should transition to half-open
    if (
      circuitBreaker.state === CircuitBreakerState.OPEN &&
      circuitBreaker.nextAttemptTime &&
      new Date() > circuitBreaker.nextAttemptTime
    ) {
      circuitBreaker.state = CircuitBreakerState.HALF_OPEN;
    }
  }

  private initializeMetrics(): ErrorMetrics {
    return {
      totalErrors: 0,
      errorsByType: {} as Record<AutomationErrorType, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      retryRate: 0,
      recoveryRate: 0,
      averageRecoveryTime: 0
    };
  }

  private updateErrorMetrics(error: AutomationError): void {
    this.errorMetrics.totalErrors++;
    
    // Update by type
    if (!this.errorMetrics.errorsByType[error.type]) {
      this.errorMetrics.errorsByType[error.type] = 0;
    }
    this.errorMetrics.errorsByType[error.type]++;

    // Update by severity
    if (!this.errorMetrics.errorsBySeverity[error.severity]) {
      this.errorMetrics.errorsBySeverity[error.severity] = 0;
    }
    this.errorMetrics.errorsBySeverity[error.severity]++;

    this.errorMetrics.lastError = error;
  }

  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'fatal';
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
        return 'info';
      default:
        return 'debug';
    }
  }

  // Public methods for metrics and monitoring
  getErrorMetrics(): ErrorMetrics {
    return { ...this.errorMetrics };
  }

  getCircuitBreakerStatus(operation: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(operation);
  }

  getAllCircuitBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.circuitBreakers);
  }

  resetCircuitBreaker(operation: string): void {
    const circuitBreaker = this.getCircuitBreaker(operation);
    circuitBreaker.state = CircuitBreakerState.CLOSED;
    circuitBreaker.failureCount = 0;
    circuitBreaker.lastFailureTime = undefined;
    circuitBreaker.nextAttemptTime = undefined;
  }

  resetErrorMetrics(): void {
    this.errorMetrics = this.initializeMetrics();
  }
}