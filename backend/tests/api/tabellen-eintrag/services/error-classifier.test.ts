/**
 * Unit Tests for Error Classifier
 */

import { ErrorClassifier } from '../../../../src/api/tabellen-eintrag/services/error-classifier';
import {
  AutomationErrorType,
  ErrorSeverity,
  ErrorContext,
  ERROR_CODES
} from '../../../../src/api/tabellen-eintrag/services/error-handling';

describe('ErrorClassifier', () => {
  describe('Error Type Classification', () => {
    describe('Database Errors', () => {
      it('should classify connection errors', () => {
        const errors = [
          new Error('ECONNREFUSED: Connection refused'),
          new Error('Connection to database failed'),
          new Error('Database connection timeout')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.CONNECTION_ERROR);
        });
      });

      it('should classify transaction errors', () => {
        const errors = [
          new Error('Transaction failed: rollback required'),
          new Error('Transaction timeout occurred'),
          new Error('Cannot commit transaction')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.TRANSACTION_ERROR);
        });
      });

      it('should classify constraint violations', () => {
        const errors = [
          new Error('Unique constraint violation on column "id"'),
          new Error('Foreign key constraint failed'),
          new Error('Check constraint violation')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.CONSTRAINT_VIOLATION);
        });
      });

      it('should classify deadlock errors', () => {
        const errors = [
          new Error('Deadlock detected'),
          new Error('Transaction deadlock occurred')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.CONCURRENCY_ERROR);
        });
      });

      it('should classify generic database errors', () => {
        const errors = [
          new Error('SQL syntax error'),
          new Error('Database query failed'),
          new Error('PostgreSQL error occurred')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.DATABASE_ERROR);
        });
      });
    });

    describe('Validation Errors', () => {
      it('should classify validation errors', () => {
        const errors = [
          new Error('Validation failed for field'),
          new Error('Invalid input provided'),
          new Error('Schema validation error')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.VALIDATION_ERROR);
        });
      });

      it('should classify input errors', () => {
        const errors = [
          new Error('Required field is missing'),
          new Error('Missing mandatory parameter'),
          new Error('Empty value not allowed')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.INVALID_INPUT);
        });
      });

      it('should classify business rule violations', () => {
        const errors = [
          new Error('Business rule violation detected'),
          new Error('Rule validation failed')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.BUSINESS_RULE_VIOLATION);
        });
      });
    });

    describe('System Errors', () => {
      it('should classify memory errors', () => {
        const errors = [
          new Error('JavaScript heap out of memory'),
          new Error('Memory allocation failed'),
          new Error('ENOMEM: not enough memory')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.MEMORY_ERROR);
        });
      });

      it('should classify timeout errors', () => {
        const errors = [
          new Error('Operation timed out'),
          new Error('Request timeout occurred'),
          new Error('Timeout after 30 seconds')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.TIMEOUT_ERROR);
        });
      });

      it('should classify resource exhaustion errors', () => {
        const errors = [
          new Error('Resource exhausted'),
          new Error('System resources unavailable')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.RESOURCE_EXHAUSTED);
        });
      });

      it('should classify generic system errors', () => {
        const errors = [
          new Error('System failure occurred'),
          new Error('Internal system error')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.SYSTEM_ERROR);
        });
      });
    });

    describe('Queue Errors', () => {
      it('should classify queue timeout errors', () => {
        const errors = [
          new Error('Job timeout in queue'),
          new Error('Queue processing timeout')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.JOB_TIMEOUT);
        });
      });

      it('should classify job cancellation errors', () => {
        const errors = [
          new Error('Job was cancelled'),
          new Error('Queue job cancelled by user')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.JOB_CANCELLED);
        });
      });

      it('should classify queue full errors', () => {
        const errors = [
          new Error('Queue is full'),
          new Error('Cannot add job: queue full')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.QUEUE_FULL);
        });
      });

      it('should classify generic queue errors', () => {
        const errors = [
          new Error('Queue processing failed'),
          new Error('Worker error in queue')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.QUEUE_ERROR);
        });
      });
    });

    describe('Network Errors', () => {
      it('should classify network timeout errors', () => {
        const errors = [
          new Error('Network timeout occurred'),
          new Error('Request timeout on network call')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.TIMEOUT_ERROR);
        });
      });

      it('should classify service unavailable errors', () => {
        const errors = [
          new Error('Service unavailable (503)'),
          new Error('External service unavailable')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.SERVICE_UNAVAILABLE);
        });
      });

      it('should classify generic network errors', () => {
        const errors = [
          new Error('Network request failed'),
          new Error('ENOTFOUND: DNS lookup failed'),
          new Error('ECONNRESET: Connection reset')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.NETWORK_ERROR);
        });
      });
    });

    describe('Configuration Errors', () => {
      it('should classify permission errors', () => {
        const errors = [
          new Error('Permission denied'),
          new Error('Unauthorized access'),
          new Error('Forbidden operation')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.PERMISSION_DENIED);
        });
      });

      it('should classify feature disabled errors', () => {
        const errors = [
          new Error('Feature is disabled'),
          new Error('Functionality not enabled')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.FEATURE_DISABLED);
        });
      });

      it('should classify generic configuration errors', () => {
        const errors = [
          new Error('Configuration error detected'),
          new Error('Invalid environment setting')
        ];

        errors.forEach(error => {
          const type = ErrorClassifier.classifyErrorType(error);
          expect(type).toBe(AutomationErrorType.CONFIGURATION_ERROR);
        });
      });
    });

    it('should default to unknown error for unrecognized patterns', () => {
      const error = new Error('Some completely unknown error pattern');
      const type = ErrorClassifier.classifyErrorType(error);
      expect(type).toBe(AutomationErrorType.UNKNOWN_ERROR);
    });
  });

  describe('Severity Determination', () => {
    it('should assign critical severity to critical error types', () => {
      const criticalTypes = [
        AutomationErrorType.SYSTEM_ERROR,
        AutomationErrorType.MEMORY_ERROR,
        AutomationErrorType.DATABASE_ERROR,
        AutomationErrorType.DATA_INCONSISTENCY
      ];

      criticalTypes.forEach(type => {
        const severity = ErrorClassifier.determineSeverity(type, new Error('Test error'));
        expect(severity).toBe(ErrorSeverity.CRITICAL);
      });
    });

    it('should assign high severity to high severity error types', () => {
      const highSeverityTypes = [
        AutomationErrorType.TRANSACTION_ERROR,
        AutomationErrorType.CONSTRAINT_VIOLATION,
        AutomationErrorType.CALCULATION_ERROR,
        AutomationErrorType.QUEUE_ERROR
      ];

      highSeverityTypes.forEach(type => {
        const severity = ErrorClassifier.determineSeverity(type, new Error('Test error'));
        expect(severity).toBe(ErrorSeverity.HIGH);
      });
    });

    it('should assign medium severity to medium severity error types', () => {
      const mediumSeverityTypes = [
        AutomationErrorType.TIMEOUT_ERROR,
        AutomationErrorType.CONCURRENCY_ERROR,
        AutomationErrorType.NETWORK_ERROR,
        AutomationErrorType.CONFIGURATION_ERROR
      ];

      mediumSeverityTypes.forEach(type => {
        const severity = ErrorClassifier.determineSeverity(type, new Error('Test error'));
        expect(severity).toBe(ErrorSeverity.MEDIUM);
      });
    });

    it('should detect critical keywords in error message', () => {
      const criticalMessages = [
        'Critical system failure',
        'Fatal error occurred',
        'Critical validation failure'
      ];

      criticalMessages.forEach(message => {
        const severity = ErrorClassifier.determineSeverity(
          AutomationErrorType.VALIDATION_ERROR, 
          new Error(message)
        );
        expect(severity).toBe(ErrorSeverity.CRITICAL);
      });
    });

    it('should detect low severity keywords in error message', () => {
      const lowSeverityMessages = [
        'Warning: deprecated function used',
        'Warning message detected'
      ];

      lowSeverityMessages.forEach(message => {
        const severity = ErrorClassifier.determineSeverity(
          AutomationErrorType.VALIDATION_ERROR, 
          new Error(message)
        );
        expect(severity).toBe(ErrorSeverity.LOW);
      });
    });

    it('should default to medium severity', () => {
      const severity = ErrorClassifier.determineSeverity(
        AutomationErrorType.UNKNOWN_ERROR, 
        new Error('Unknown error')
      );
      expect(severity).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('Error Code Assignment', () => {
    it('should assign correct codes for validation errors', () => {
      const testCases = [
        { message: 'Negative score not allowed', expectedCode: ERROR_CODES.NEGATIVE_SCORE },
        { message: 'Team cannot play against itself', expectedCode: ERROR_CODES.TEAM_AGAINST_ITSELF },
        { message: 'Required field is missing', expectedCode: ERROR_CODES.MISSING_REQUIRED_FIELD },
        { message: 'Invalid status transition', expectedCode: ERROR_CODES.INVALID_STATUS_TRANSITION },
        { message: 'Spieltag out of range', expectedCode: ERROR_CODES.INVALID_SPIELTAG_RANGE }
      ];

      testCases.forEach(({ message, expectedCode }) => {
        const code = ErrorClassifier.getErrorCode(
          AutomationErrorType.VALIDATION_ERROR, 
          new Error(message)
        );
        expect(code).toBe(expectedCode);
      });
    });

    it('should assign correct codes for database errors', () => {
      const testCases = [
        { message: 'Connection failed', expectedCode: ERROR_CODES.CONNECTION_FAILED },
        { message: 'Transaction rollback required', expectedCode: ERROR_CODES.TRANSACTION_FAILED },
        { message: 'Constraint violation detected', expectedCode: ERROR_CODES.CONSTRAINT_VIOLATION },
        { message: 'Deadlock detected', expectedCode: ERROR_CODES.DEADLOCK_DETECTED }
      ];

      testCases.forEach(({ message, expectedCode }) => {
        const code = ErrorClassifier.getErrorCode(
          AutomationErrorType.DATABASE_ERROR, 
          new Error(message)
        );
        expect(code).toBe(expectedCode);
      });
    });

    it('should assign correct codes for queue errors', () => {
      const testCases = [
        { message: 'Queue is full', expectedCode: ERROR_CODES.QUEUE_FULL },
        { message: 'Job timeout occurred', expectedCode: ERROR_CODES.JOB_TIMEOUT },
        { message: 'Job was cancelled', expectedCode: ERROR_CODES.JOB_CANCELLED },
        { message: 'Worker unavailable', expectedCode: ERROR_CODES.WORKER_UNAVAILABLE }
      ];

      testCases.forEach(({ message, expectedCode }) => {
        const code = ErrorClassifier.getErrorCode(
          AutomationErrorType.QUEUE_ERROR, 
          new Error(message)
        );
        expect(code).toBe(expectedCode);
      });
    });

    it('should assign correct codes for calculation errors', () => {
      const testCases = [
        { message: 'Calculation timeout', expectedCode: ERROR_CODES.CALCULATION_TIMEOUT },
        { message: 'Data inconsistency found', expectedCode: ERROR_CODES.DATA_INCONSISTENCY },
        { message: 'Missing team data', expectedCode: ERROR_CODES.MISSING_TEAM_DATA },
        { message: 'Invalid game data', expectedCode: ERROR_CODES.INVALID_GAME_DATA }
      ];

      testCases.forEach(({ message, expectedCode }) => {
        const code = ErrorClassifier.getErrorCode(
          AutomationErrorType.CALCULATION_ERROR, 
          new Error(message)
        );
        expect(code).toBe(expectedCode);
      });
    });

    it('should assign correct codes for system errors', () => {
      const testCases = [
        { message: 'Memory exhausted', expectedCode: ERROR_CODES.MEMORY_EXHAUSTED },
        { message: 'CPU overload detected', expectedCode: ERROR_CODES.CPU_OVERLOAD },
        { message: 'Disk full error', expectedCode: ERROR_CODES.DISK_FULL },
        { message: 'Service unavailable', expectedCode: ERROR_CODES.SERVICE_UNAVAILABLE }
      ];

      testCases.forEach(({ message, expectedCode }) => {
        const code = ErrorClassifier.getErrorCode(
          AutomationErrorType.SYSTEM_ERROR, 
          new Error(message)
        );
        expect(code).toBe(expectedCode);
      });
    });

    it('should default to service unavailable for unknown error types', () => {
      const code = ErrorClassifier.getErrorCode(
        AutomationErrorType.UNKNOWN_ERROR, 
        new Error('Unknown error')
      );
      expect(code).toBe(ERROR_CODES.SERVICE_UNAVAILABLE);
    });
  });

  describe('Retryability Assessment', () => {
    it('should mark non-retryable error types as non-retryable', () => {
      const nonRetryableTypes = [
        AutomationErrorType.VALIDATION_ERROR,
        AutomationErrorType.INVALID_INPUT,
        AutomationErrorType.BUSINESS_RULE_VIOLATION,
        AutomationErrorType.CONSTRAINT_VIOLATION,
        AutomationErrorType.PERMISSION_DENIED,
        AutomationErrorType.CONFIGURATION_ERROR
      ];

      nonRetryableTypes.forEach(type => {
        const retryable = ErrorClassifier.isRetryable(type, new Error('Test error'));
        expect(retryable).toBe(false);
      });
    });

    it('should mark retryable error types as retryable', () => {
      const retryableTypes = [
        AutomationErrorType.TIMEOUT_ERROR,
        AutomationErrorType.NETWORK_ERROR,
        AutomationErrorType.CONNECTION_ERROR,
        AutomationErrorType.CONCURRENCY_ERROR,
        AutomationErrorType.QUEUE_ERROR,
        AutomationErrorType.SERVICE_UNAVAILABLE
      ];

      retryableTypes.forEach(type => {
        const retryable = ErrorClassifier.isRetryable(type, new Error('Test error'));
        expect(retryable).toBe(true);
      });
    });

    it('should detect non-retryable patterns in error message', () => {
      const nonRetryableMessages = [
        'Invalid request format',
        'Malformed data provided',
        'Unauthorized access attempt',
        'Forbidden operation requested'
      ];

      nonRetryableMessages.forEach(message => {
        const retryable = ErrorClassifier.isRetryable(
          AutomationErrorType.TIMEOUT_ERROR, // Normally retryable type
          new Error(message)
        );
        expect(retryable).toBe(false);
      });
    });
  });

  describe('Context Extraction', () => {
    it('should extract SQL from error message', () => {
      const error = new Error('SQL error: SELECT * FROM table WHERE invalid_column = ?');
      const context = ErrorClassifier.extractErrorContext(error);
      
      expect(context.sql).toBe('SELECT * FROM table WHERE invalid_column = ?');
    });

    it('should extract HTTP status codes', () => {
      const testCases = [
        { message: 'HTTP 404 Not Found', expectedStatus: 404 },
        { message: 'Server returned 500 Internal Server Error', expectedStatus: 500 },
        { message: 'Request failed with status 403', expectedStatus: 403 }
      ];

      testCases.forEach(({ message, expectedStatus }) => {
        const error = new Error(message);
        const context = ErrorClassifier.extractErrorContext(error);
        expect(context.httpStatus).toBe(expectedStatus);
      });
    });

    it('should extract file paths from error message', () => {
      const testCases = [
        { message: 'Error in file /path/to/file.js', expectedPath: '/path/to/file.js' },
        { message: 'Cannot read C:\\Windows\\System32\\file.dll', expectedPath: 'C:\\Windows\\System32\\file.dll' },
        { message: 'Module not found: ./relative/path.js', expectedPath: './relative/path.js' }
      ];

      testCases.forEach(({ message, expectedPath }) => {
        const error = new Error(message);
        const context = ErrorClassifier.extractErrorContext(error);
        expect(context.filePath).toBe(expectedPath);
      });
    });

    it('should extract line and column numbers from stack trace', () => {
      const error = new Error('Test error');
      error.stack = `Error: Test error
    at Object.<anonymous> (/path/to/file.js:123:45)
    at Module._compile (module.js:456:78)`;
      
      const context = ErrorClassifier.extractErrorContext(error);
      
      expect(context.line).toBe(123);
      expect(context.column).toBe(45);
    });

    it('should handle missing context gracefully', () => {
      const error = new Error('Simple error message');
      const context = ErrorClassifier.extractErrorContext(error);
      
      expect(context).toEqual({});
    });
  });

  describe('AutomationError Creation', () => {
    const mockContext: ErrorContext = {
      operation: 'test-operation',
      ligaId: 1,
      saisonId: 2023,
      timestamp: new Date()
    };

    it('should create complete AutomationError from generic Error', () => {
      const originalError = new Error('Test error message');
      const additionalDetails = { extra: 'data', userId: 'test-user' };
      
      const automationError = ErrorClassifier.createAutomationError(
        originalError, 
        mockContext, 
        additionalDetails
      );
      
      expect(automationError.type).toBeDefined();
      expect(automationError.code).toBeDefined();
      expect(automationError.message).toBe('Test error message');
      expect(automationError.context).toBe(mockContext);
      expect(automationError.originalError).toBe(originalError);
      expect(automationError.details.extra).toBe('data');
      expect(automationError.details.userId).toBe('test-user');
      expect(automationError.details.originalError).toBe('Error');
      expect(automationError.details.stack).toBe(originalError.stack);
      expect(automationError.timestamp).toBeInstanceOf(Date);
      expect(typeof automationError.retryable).toBe('boolean');
      expect(automationError.severity).toBeDefined();
    });

    it('should handle errors without additional details', () => {
      const originalError = new Error('Simple error');
      
      const automationError = ErrorClassifier.createAutomationError(originalError, mockContext);
      
      expect(automationError.details.originalError).toBe('Error');
      expect(automationError.details.stack).toBe(originalError.stack);
      expect(Object.keys(automationError.details)).toEqual(['originalError', 'stack']);
    });

    it('should classify different error types correctly in creation', () => {
      const testCases = [
        { error: new Error('Connection refused'), expectedType: AutomationErrorType.CONNECTION_ERROR },
        { error: new Error('Validation failed'), expectedType: AutomationErrorType.VALIDATION_ERROR },
        { error: new Error('Operation timed out'), expectedType: AutomationErrorType.TIMEOUT_ERROR },
        { error: new Error('Memory exhausted'), expectedType: AutomationErrorType.MEMORY_ERROR }
      ];

      testCases.forEach(({ error, expectedType }) => {
        const automationError = ErrorClassifier.createAutomationError(error, mockContext);
        expect(automationError.type).toBe(expectedType);
      });
    });

    it('should determine severity correctly in creation', () => {
      const testCases = [
        { error: new Error('Critical system failure'), expectedSeverity: ErrorSeverity.CRITICAL },
        { error: new Error('Transaction failed'), expectedSeverity: ErrorSeverity.HIGH },
        { error: new Error('Network timeout'), expectedSeverity: ErrorSeverity.MEDIUM },
        { error: new Error('Warning: deprecated'), expectedSeverity: ErrorSeverity.LOW }
      ];

      testCases.forEach(({ error, expectedSeverity }) => {
        const automationError = ErrorClassifier.createAutomationError(error, mockContext);
        expect(automationError.severity).toBe(expectedSeverity);
      });
    });

    it('should assign correct error codes in creation', () => {
      const testCases = [
        { error: new Error('Negative score'), expectedCode: ERROR_CODES.NEGATIVE_SCORE },
        { error: new Error('Connection failed'), expectedCode: ERROR_CODES.CONNECTION_FAILED },
        { error: new Error('Queue is full'), expectedCode: ERROR_CODES.QUEUE_FULL }
      ];

      testCases.forEach(({ error, expectedCode }) => {
        const automationError = ErrorClassifier.createAutomationError(error, mockContext);
        expect(automationError.code).toBe(expectedCode);
      });
    });

    it('should determine retryability correctly in creation', () => {
      const testCases = [
        { error: new Error('Validation failed'), expectedRetryable: false },
        { error: new Error('Network timeout'), expectedRetryable: true },
        { error: new Error('Invalid input'), expectedRetryable: false },
        { error: new Error('Connection refused'), expectedRetryable: true }
      ];

      testCases.forEach(({ error, expectedRetryable }) => {
        const automationError = ErrorClassifier.createAutomationError(error, mockContext);
        expect(automationError.retryable).toBe(expectedRetryable);
      });
    });
  });
});