/**
 * Unit Tests for Structured Error Handler
 */

import { StructuredErrorHandler } from '../../../../src/api/tabellen-eintrag/services/error-handler';
import { DefaultFallbackStrategy } from '../../../../src/api/tabellen-eintrag/services/fallback-strategy';
import { ErrorClassifier } from '../../../../src/api/tabellen-eintrag/services/error-classifier';
import {
  AutomationError,
  AutomationErrorType,
  ErrorSeverity,
  ErrorAction,
  ErrorContext,
  BackoffType,
  CircuitBreakerState,
  ERROR_CODES
} from '../../../../src/api/tabellen-eintrag/services/error-handling';

// Mock Strapi
const mockStrapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    debug: jest.fn()
  },
  service: jest.fn(),
  config: {
    get: jest.fn()
  },
  db: {
    connection: {
      raw: jest.fn()
    }
  }
};

global.strapi = mockStrapi as any;

describe('StructuredErrorHandler', () => {
  let errorHandler: StructuredErrorHandler;
  let fallbackStrategy: DefaultFallbackStrategy;

  const mockRetryStrategy = {
    maxRetries: 3,
    backoffType: BackoffType.EXPONENTIAL,
    baseDelay: 1000,
    maxDelay: 30000,
    jitter: true,
    retryableErrors: [
      AutomationErrorType.TIMEOUT_ERROR,
      AutomationErrorType.NETWORK_ERROR,
      AutomationErrorType.CONNECTION_ERROR,
      AutomationErrorType.CONCURRENCY_ERROR
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fallbackStrategy = new DefaultFallbackStrategy();
    errorHandler = new StructuredErrorHandler(fallbackStrategy, mockRetryStrategy);
  });

  describe('Error Classification', () => {
    it('should classify database connection errors correctly', () => {
      const error = new Error('Connection refused to database');
      const type = errorHandler.classifyError(error);
      
      expect(type).toBe(AutomationErrorType.CONNECTION_ERROR);
    });

    it('should classify validation errors correctly', () => {
      const error = new Error('Validation failed: required field missing');
      const type = errorHandler.classifyError(error);
      
      expect(type).toBe(AutomationErrorType.VALIDATION_ERROR);
    });

    it('should classify timeout errors correctly', () => {
      const error = new Error('Operation timed out after 30 seconds');
      const type = errorHandler.classifyError(error);
      
      expect(type).toBe(AutomationErrorType.TIMEOUT_ERROR);
    });

    it('should classify memory errors correctly', () => {
      const error = new Error('JavaScript heap out of memory');
      const type = errorHandler.classifyError(error);
      
      expect(type).toBe(AutomationErrorType.MEMORY_ERROR);
    });

    it('should default to unknown error for unrecognized patterns', () => {
      const error = new Error('Some completely unknown error');
      const type = errorHandler.classifyError(error);
      
      expect(type).toBe(AutomationErrorType.UNKNOWN_ERROR);
    });
  });

  describe('Retry Logic', () => {
    it('should determine retryable errors correctly', () => {
      const retryableError: AutomationError = {
        type: AutomationErrorType.TIMEOUT_ERROR,
        code: ERROR_CODES.CALCULATION_TIMEOUT,
        message: 'Operation timed out',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: true,
        severity: ErrorSeverity.MEDIUM
      };

      const shouldRetry = errorHandler.shouldRetry(retryableError);
      expect(shouldRetry).toBe(true);
    });

    it('should not retry validation errors', () => {
      const nonRetryableError: AutomationError = {
        type: AutomationErrorType.VALIDATION_ERROR,
        code: ERROR_CODES.NEGATIVE_SCORE,
        message: 'Invalid input',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: false,
        severity: ErrorSeverity.HIGH
      };

      const shouldRetry = errorHandler.shouldRetry(nonRetryableError);
      expect(shouldRetry).toBe(false);
    });

    it('should not retry critical errors', () => {
      const criticalError: AutomationError = {
        type: AutomationErrorType.SYSTEM_ERROR,
        code: ERROR_CODES.MEMORY_EXHAUSTED,
        message: 'System failure',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: true,
        severity: ErrorSeverity.CRITICAL
      };

      const shouldRetry = errorHandler.shouldRetry(criticalError);
      expect(shouldRetry).toBe(false);
    });

    it('should calculate exponential backoff delay correctly', () => {
      const error: AutomationError = {
        type: AutomationErrorType.TIMEOUT_ERROR,
        code: ERROR_CODES.CALCULATION_TIMEOUT,
        message: 'Timeout',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: true,
        severity: ErrorSeverity.MEDIUM
      };

      const delay1 = errorHandler.getRetryDelay(error, 1);
      const delay2 = errorHandler.getRetryDelay(error, 2);
      const delay3 = errorHandler.getRetryDelay(error, 3);

      expect(delay1).toBe(1000); // baseDelay * 2^0
      expect(delay2).toBe(2000); // baseDelay * 2^1
      expect(delay3).toBe(4000); // baseDelay * 2^2
    });

    it('should respect maximum delay limit', () => {
      const error: AutomationError = {
        type: AutomationErrorType.TIMEOUT_ERROR,
        code: ERROR_CODES.CALCULATION_TIMEOUT,
        message: 'Timeout',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: true,
        severity: ErrorSeverity.MEDIUM
      };

      const delay = errorHandler.getRetryDelay(error, 10); // Very high attempt number
      expect(delay).toBeLessThanOrEqual(30000); // maxDelay
    });
  });

  describe('Error Handling Strategies', () => {
    it('should handle retryable errors with retry action', async () => {
      const error: AutomationError = {
        type: AutomationErrorType.TIMEOUT_ERROR,
        code: ERROR_CODES.CALCULATION_TIMEOUT,
        message: 'Operation timed out',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: true,
        severity: ErrorSeverity.MEDIUM
      };

      const result = await errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.action).toBe(ErrorAction.RETRY_WITH_BACKOFF);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should handle validation errors with fail fast action', async () => {
      const error: AutomationError = {
        type: AutomationErrorType.VALIDATION_ERROR,
        code: ERROR_CODES.NEGATIVE_SCORE,
        message: 'Invalid score value',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: false,
        severity: ErrorSeverity.HIGH
      };

      const result = await errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.action).toBe(ErrorAction.FAIL_FAST);
    });

    it('should handle critical errors with escalation', async () => {
      const error: AutomationError = {
        type: AutomationErrorType.SYSTEM_ERROR,
        code: ERROR_CODES.MEMORY_EXHAUSTED,
        message: 'System failure',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: false,
        severity: ErrorSeverity.CRITICAL
      };

      const result = await errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.action).toBe(ErrorAction.ESCALATE);
      expect(result.notification).toBeDefined();
      expect(result.notification?.priority).toBe('urgent');
    });

    it('should handle calculation errors with rollback action', async () => {
      const error: AutomationError = {
        type: AutomationErrorType.CALCULATION_ERROR,
        code: ERROR_CODES.DATA_INCONSISTENCY,
        message: 'Data inconsistency detected',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: false,
        severity: ErrorSeverity.HIGH
      };

      const result = await errorHandler.handleError(error);

      expect(result.handled).toBe(true);
      expect(result.action).toBe(ErrorAction.ROLLBACK);
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after failure threshold', async () => {
      const operation = 'test-operation';
      const error: AutomationError = {
        type: AutomationErrorType.SYSTEM_ERROR,
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: 'Service unavailable',
        details: {},
        timestamp: new Date(),
        context: { ...createMockContext(), operation },
        retryable: false,
        severity: ErrorSeverity.HIGH
      };

      // Trigger multiple failures to open circuit breaker
      for (let i = 0; i < 5; i++) {
        await errorHandler.handleError(error);
      }

      const circuitBreaker = errorHandler.getCircuitBreakerStatus(operation);
      expect(circuitBreaker?.state).toBe(CircuitBreakerState.OPEN);
    });

    it('should handle requests when circuit breaker is open', async () => {
      const operation = 'test-operation-2';
      const error: AutomationError = {
        type: AutomationErrorType.SYSTEM_ERROR,
        code: ERROR_CODES.SERVICE_UNAVAILABLE,
        message: 'Service unavailable',
        details: {},
        timestamp: new Date(),
        context: { ...createMockContext(), operation },
        retryable: false,
        severity: ErrorSeverity.HIGH
      };

      // Open circuit breaker
      for (let i = 0; i < 5; i++) {
        await errorHandler.handleError(error);
      }

      // Next request should be handled by circuit breaker
      const result = await errorHandler.handleError(error);
      expect(result.action).toBe(ErrorAction.FAIL_FAST);
    });

    it('should reset circuit breaker manually', () => {
      const operation = 'test-operation-3';
      
      // Get circuit breaker (creates it if not exists)
      errorHandler.getCircuitBreakerStatus(operation);
      
      // Reset it
      errorHandler.resetCircuitBreaker(operation);
      
      const circuitBreaker = errorHandler.getCircuitBreakerStatus(operation);
      expect(circuitBreaker?.state).toBe(CircuitBreakerState.CLOSED);
      expect(circuitBreaker?.failureCount).toBe(0);
    });
  });

  describe('Error Metrics', () => {
    it('should track error metrics correctly', async () => {
      const error1: AutomationError = {
        type: AutomationErrorType.VALIDATION_ERROR,
        code: ERROR_CODES.NEGATIVE_SCORE,
        message: 'Validation error',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: false,
        severity: ErrorSeverity.HIGH
      };

      const error2: AutomationError = {
        type: AutomationErrorType.TIMEOUT_ERROR,
        code: ERROR_CODES.CALCULATION_TIMEOUT,
        message: 'Timeout error',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: true,
        severity: ErrorSeverity.MEDIUM
      };

      await errorHandler.handleError(error1);
      await errorHandler.handleError(error2);

      const metrics = errorHandler.getErrorMetrics();
      
      expect(metrics.totalErrors).toBe(2);
      expect(metrics.errorsByType[AutomationErrorType.VALIDATION_ERROR]).toBe(1);
      expect(metrics.errorsByType[AutomationErrorType.TIMEOUT_ERROR]).toBe(1);
      expect(metrics.errorsBySeverity[ErrorSeverity.HIGH]).toBe(1);
      expect(metrics.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(1);
    });

    it('should reset error metrics', async () => {
      const error: AutomationError = {
        type: AutomationErrorType.VALIDATION_ERROR,
        code: ERROR_CODES.NEGATIVE_SCORE,
        message: 'Test error',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: false,
        severity: ErrorSeverity.HIGH
      };

      await errorHandler.handleError(error);
      
      let metrics = errorHandler.getErrorMetrics();
      expect(metrics.totalErrors).toBe(1);

      errorHandler.resetErrorMetrics();
      
      metrics = errorHandler.getErrorMetrics();
      expect(metrics.totalErrors).toBe(0);
    });
  });

  describe('Logging', () => {
    it('should log errors with appropriate level based on severity', () => {
      const criticalError: AutomationError = {
        type: AutomationErrorType.SYSTEM_ERROR,
        code: ERROR_CODES.MEMORY_EXHAUSTED,
        message: 'Critical error',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: false,
        severity: ErrorSeverity.CRITICAL
      };

      errorHandler.logError(criticalError, criticalError.context);
      expect(mockStrapi.log.fatal).toHaveBeenCalled();
    });

    it('should log high severity errors as error level', () => {
      const highError: AutomationError = {
        type: AutomationErrorType.CALCULATION_ERROR,
        code: ERROR_CODES.DATA_INCONSISTENCY,
        message: 'High severity error',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: false,
        severity: ErrorSeverity.HIGH
      };

      errorHandler.logError(highError, highError.context);
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });

    it('should log medium severity errors as warning level', () => {
      const mediumError: AutomationError = {
        type: AutomationErrorType.TIMEOUT_ERROR,
        code: ERROR_CODES.CALCULATION_TIMEOUT,
        message: 'Medium severity error',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: true,
        severity: ErrorSeverity.MEDIUM
      };

      errorHandler.logError(mediumError, mediumError.context);
      expect(mockStrapi.log.warn).toHaveBeenCalled();
    });

    it('should log low severity errors as info level', () => {
      const lowError: AutomationError = {
        type: AutomationErrorType.VALIDATION_ERROR,
        code: ERROR_CODES.MISSING_REQUIRED_FIELD,
        message: 'Low severity error',
        details: {},
        timestamp: new Date(),
        context: createMockContext(),
        retryable: false,
        severity: ErrorSeverity.LOW
      };

      errorHandler.logError(lowError, lowError.context);
      expect(mockStrapi.log.info).toHaveBeenCalled();
    });
  });
});

describe('ErrorClassifier', () => {
  describe('Error Type Classification', () => {
    it('should classify database connection errors', () => {
      const error = new Error('ECONNREFUSED: Connection refused');
      const type = ErrorClassifier.classifyErrorType(error);
      expect(type).toBe(AutomationErrorType.CONNECTION_ERROR);
    });

    it('should classify transaction errors', () => {
      const error = new Error('Transaction failed: rollback required');
      const type = ErrorClassifier.classifyErrorType(error);
      expect(type).toBe(AutomationErrorType.TRANSACTION_ERROR);
    });

    it('should classify constraint violations', () => {
      const error = new Error('Unique constraint violation on column');
      const type = ErrorClassifier.classifyErrorType(error);
      expect(type).toBe(AutomationErrorType.CONSTRAINT_VIOLATION);
    });

    it('should classify validation errors', () => {
      const error = new Error('Validation failed: required field missing');
      const type = ErrorClassifier.classifyErrorType(error);
      expect(type).toBe(AutomationErrorType.VALIDATION_ERROR);
    });

    it('should classify timeout errors', () => {
      const error = new Error('Operation timed out after 30 seconds');
      const type = ErrorClassifier.classifyErrorType(error);
      expect(type).toBe(AutomationErrorType.TIMEOUT_ERROR);
    });

    it('should classify memory errors', () => {
      const error = new Error('JavaScript heap out of memory');
      const type = ErrorClassifier.classifyErrorType(error);
      expect(type).toBe(AutomationErrorType.MEMORY_ERROR);
    });
  });

  describe('Severity Determination', () => {
    it('should assign critical severity to system errors', () => {
      const severity = ErrorClassifier.determineSeverity(AutomationErrorType.SYSTEM_ERROR, new Error('System failure'));
      expect(severity).toBe(ErrorSeverity.CRITICAL);
    });

    it('should assign high severity to calculation errors', () => {
      const severity = ErrorClassifier.determineSeverity(AutomationErrorType.CALCULATION_ERROR, new Error('Calculation failed'));
      expect(severity).toBe(ErrorSeverity.HIGH);
    });

    it('should assign medium severity to timeout errors', () => {
      const severity = ErrorClassifier.determineSeverity(AutomationErrorType.TIMEOUT_ERROR, new Error('Timeout'));
      expect(severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('should detect critical keywords in message', () => {
      const severity = ErrorClassifier.determineSeverity(AutomationErrorType.VALIDATION_ERROR, new Error('Critical validation failure'));
      expect(severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe('Error Code Assignment', () => {
    it('should assign correct code for negative score validation', () => {
      const code = ErrorClassifier.getErrorCode(AutomationErrorType.VALIDATION_ERROR, new Error('Negative score not allowed'));
      expect(code).toBe(ERROR_CODES.NEGATIVE_SCORE);
    });

    it('should assign correct code for connection failures', () => {
      const code = ErrorClassifier.getErrorCode(AutomationErrorType.CONNECTION_ERROR, new Error('Connection failed'));
      expect(code).toBe(ERROR_CODES.CONNECTION_FAILED);
    });

    it('should assign correct code for queue full errors', () => {
      const code = ErrorClassifier.getErrorCode(AutomationErrorType.QUEUE_ERROR, new Error('Queue is full'));
      expect(code).toBe(ERROR_CODES.QUEUE_FULL);
    });
  });

  describe('Retryability Assessment', () => {
    it('should mark validation errors as non-retryable', () => {
      const retryable = ErrorClassifier.isRetryable(AutomationErrorType.VALIDATION_ERROR, new Error('Validation failed'));
      expect(retryable).toBe(false);
    });

    it('should mark timeout errors as retryable', () => {
      const retryable = ErrorClassifier.isRetryable(AutomationErrorType.TIMEOUT_ERROR, new Error('Timeout'));
      expect(retryable).toBe(true);
    });

    it('should mark network errors as retryable', () => {
      const retryable = ErrorClassifier.isRetryable(AutomationErrorType.NETWORK_ERROR, new Error('Network error'));
      expect(retryable).toBe(true);
    });

    it('should detect non-retryable patterns in message', () => {
      const retryable = ErrorClassifier.isRetryable(AutomationErrorType.TIMEOUT_ERROR, new Error('Invalid request format'));
      expect(retryable).toBe(false);
    });
  });

  describe('Context Extraction', () => {
    it('should extract SQL from error message', () => {
      const error = new Error('SQL error: SELECT * FROM table WHERE invalid');
      const context = ErrorClassifier.extractErrorContext(error);
      expect(context.sql).toContain('SELECT * FROM table WHERE invalid');
    });

    it('should extract HTTP status codes', () => {
      const error = new Error('HTTP 404 Not Found');
      const context = ErrorClassifier.extractErrorContext(error);
      expect(context.httpStatus).toBe(404);
    });

    it('should extract line numbers from stack trace', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at Object.<anonymous> (/path/to/file.js:123:45)';
      const context = ErrorClassifier.extractErrorContext(error);
      expect(context.line).toBe(123);
      expect(context.column).toBe(45);
    });
  });

  describe('AutomationError Creation', () => {
    it('should create complete AutomationError from generic Error', () => {
      const originalError = new Error('Test error message');
      const context = createMockContext();
      
      const automationError = ErrorClassifier.createAutomationError(originalError, context, { extra: 'data' });
      
      expect(automationError.type).toBeDefined();
      expect(automationError.code).toBeDefined();
      expect(automationError.message).toBe('Test error message');
      expect(automationError.context).toBe(context);
      expect(automationError.originalError).toBe(originalError);
      expect(automationError.details.extra).toBe('data');
      expect(automationError.timestamp).toBeInstanceOf(Date);
      expect(typeof automationError.retryable).toBe('boolean');
      expect(automationError.severity).toBeDefined();
    });
  });
});

// Helper function to create mock error context
function createMockContext(): ErrorContext {
  return {
    operation: 'test-operation',
    ligaId: 1,
    saisonId: 1,
    jobId: 'test-job-123',
    userId: 'test-user',
    requestId: 'test-request-456',
    timestamp: new Date(),
    metadata: {
      testData: 'test'
    }
  };
}