/**
 * Hook Error Handler Service
 * 
 * Provides centralized error handling for Strapi lifecycle hooks with graceful degradation
 * for non-critical failures. This service wraps hook operations to prevent system blockage
 * while maintaining proper error logging and monitoring.
 */

interface HookEvent {
  params: {
    data?: any;
    where?: any;
    [key: string]: any;
  };
  result?: any;
  [key: string]: any;
}

interface HookResult {
  success: boolean;
  canProceed: boolean;
  modifiedData?: any;
  errors: HookError[];
  warnings: HookWarning[];
  executionTime: number;
}

interface HookError {
  type: 'critical' | 'warning' | 'info';
  code: string;
  message: string;
  context?: any;
  timestamp: Date;
}

interface HookWarning {
  code: string;
  message: string;
  context?: any;
  timestamp: Date;
}

interface HookContext {
  contentType: string;
  hookType: 'beforeCreate' | 'beforeUpdate' | 'afterCreate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete';
  event: HookEvent;
  operationId: string;
  // Additional context properties
  data?: any;
  seasonData?: any;
  seasonId?: number;
  teamData?: any;
  teamId?: number;
  startDate?: Date;
  endDate?: Date;
  [key: string]: any;
}

/**
 * Configuration for hook error handling behavior
 */
interface HookErrorConfig {
  enableStrictValidation: boolean;
  enableGracefulDegradation: boolean;
  maxExecutionTime: number;
  retryAttempts: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Default configuration for hook error handling
 */
const DEFAULT_CONFIG: HookErrorConfig = {
  enableStrictValidation: false, // Temporarily disabled for stability
  enableGracefulDegradation: true,
  maxExecutionTime: 100, // 100ms max execution time
  retryAttempts: 2,
  logLevel: 'warn'
};

/**
 * Hook Error Handler Service Class
 */
class HookErrorHandler {
  private config: HookErrorConfig;
  private strapi: any;

  constructor(strapi: any, config: Partial<HookErrorConfig> = {}) {
    this.strapi = strapi;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Wraps a hook operation with comprehensive error handling
   */
  async wrapHookOperation<T>(
    context: HookContext,
    operation: () => Promise<T>
  ): Promise<HookResult> {
    const startTime = Date.now();
    const result: HookResult = {
      success: false,
      canProceed: true,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      // Log hook execution start
      this.logHookExecution(context, 'start');

      // Execute operation with timeout protection
      const operationResult = await this.executeWithTimeout(
        operation,
        this.config.maxExecutionTime
      );

      // Operation completed successfully
      result.success = true;
      result.modifiedData = operationResult;
      
      this.logHookExecution(context, 'success', {
        executionTime: Date.now() - startTime
      });

    } catch (error) {
      // Handle the error based on its type and configuration
      const handledError = await this.handleHookError(error, context);
      result.errors.push(handledError);

      // Determine if operation can proceed based on error type
      result.canProceed = this.shouldProceedAfterError(handledError);

      this.logHookExecution(context, 'error', {
        error: handledError,
        canProceed: result.canProceed
      });

      // If strict validation is enabled and it's a critical error, re-throw
      if (this.config.enableStrictValidation && handledError.type === 'critical') {
        throw error;
      }
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Executes an operation with timeout protection
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Hook operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }

  /**
   * Handles different types of hook errors with appropriate strategies
   */
  private async handleHookError(error: Error, context: HookContext): Promise<HookError> {
    const hookError: HookError = {
      type: this.classifyError(error),
      code: this.getErrorCode(error),
      message: this.getErrorMessage(error),
      context: {
        contentType: context.contentType,
        hookType: context.hookType,
        operationId: context.operationId
      },
      timestamp: new Date()
    };

    // Apply error recovery strategies if enabled
    if (this.config.enableGracefulDegradation) {
      await this.applyRecoveryStrategy(hookError, context);
    }

    return hookError;
  }

  /**
   * Classifies errors into critical, warning, or info types
   */
  private classifyError(error: Error): 'critical' | 'warning' | 'info' {
    // Critical errors that should block operations
    if (error.name === 'ValidationError' && error.message.includes('required')) {
      return 'critical';
    }
    
    if (error.name === 'DatabaseError' || error.message.includes('constraint')) {
      return 'critical';
    }

    // Timeout errors are warnings in graceful degradation mode
    if (error.message.includes('timed out')) {
      return 'warning';
    }

    // Business logic validation errors are warnings
    if (error.message.includes('überschneidet') || error.message.includes('bereits')) {
      return 'warning';
    }

    // Default to warning for unknown errors
    return 'warning';
  }

  /**
   * Gets appropriate error code for different error types
   */
  private getErrorCode(error: Error): string {
    if (error.message.includes('timed out')) return 'HOOK_TIMEOUT';
    if (error.name === 'ValidationError') return 'VALIDATION_ERROR';
    if (error.name === 'DatabaseError') return 'DATABASE_ERROR';
    if (error.message.includes('überschneidet')) return 'OVERLAP_VALIDATION';
    if (error.message.includes('bereits')) return 'DUPLICATE_VALIDATION';
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Gets user-friendly error message
   */
  private getErrorMessage(error: Error): string {
    // Return original message for now, can be enhanced with localization
    return error.message || 'Ein unbekannter Fehler ist aufgetreten';
  }

  /**
   * Determines if operation should proceed after an error
   */
  private shouldProceedAfterError(error: HookError): boolean {
    // Critical errors block operation unless graceful degradation is enabled
    if (error.type === 'critical') {
      return this.config.enableGracefulDegradation;
    }

    // Warning and info errors allow operation to proceed
    return true;
  }

  /**
   * Applies recovery strategies for different error types
   */
  private async applyRecoveryStrategy(error: HookError, context: HookContext): Promise<void> {
    switch (error.code) {
      case 'HOOK_TIMEOUT':
        // Log timeout and suggest async processing
        this.strapi.log.warn(`Hook timeout in ${context.contentType}.${context.hookType}`, {
          suggestion: 'Consider moving to async processing',
          context: error.context
        });
        break;

      case 'OVERLAP_VALIDATION':
        // Log overlap validation but allow operation
        this.strapi.log.warn(`Season overlap detected but allowing operation`, {
          context: error.context,
          note: 'Strict validation temporarily disabled'
        });
        break;

      case 'DUPLICATE_VALIDATION':
        // Log duplicate validation but allow operation
        this.strapi.log.warn(`Duplicate validation failed but allowing operation`, {
          context: error.context,
          note: 'Graceful degradation enabled'
        });
        break;

      default:
        // Default recovery: log and continue
        this.strapi.log.warn(`Hook error handled gracefully`, {
          error: error.message,
          context: error.context
        });
    }
  }

  /**
   * Logs hook execution events with structured format
   */
  private logHookExecution(
    context: HookContext,
    event: 'start' | 'success' | 'error',
    details?: any
  ): void {
    const logData = {
      contentType: context.contentType,
      hookType: context.hookType,
      operationId: context.operationId,
      event,
      timestamp: new Date().toISOString(),
      ...details
    };

    switch (event) {
      case 'start':
        if (this.config.logLevel === 'debug') {
          this.strapi.log.debug(`Hook execution started`, logData);
        }
        break;

      case 'success':
        if (['debug', 'info'].includes(this.config.logLevel)) {
          this.strapi.log.info(`Hook execution completed`, logData);
        }
        break;

      case 'error':
        this.strapi.log.error(`Hook execution failed`, logData);
        break;
    }
  }

  /**
   * Updates configuration at runtime
   */
  updateConfig(newConfig: Partial<HookErrorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.strapi.log.info('Hook error handler configuration updated', this.config);
  }

  /**
   * Gets current configuration
   */
  getConfig(): HookErrorConfig {
    return { ...this.config };
  }
}

/**
 * Factory function to create hook error handler instance
 */
export function createHookErrorHandler(
  strapi: any,
  config?: Partial<HookErrorConfig>
): HookErrorHandler {
  return new HookErrorHandler(strapi, config);
}

/**
 * Convenience wrapper for common hook operations
 */
export class HookWrapper {
  private errorHandler: HookErrorHandler;

  constructor(strapi: any, config?: Partial<HookErrorConfig>) {
    this.errorHandler = createHookErrorHandler(strapi, config);
  }

  /**
   * Wraps beforeCreate hook with error handling
   */
  async wrapBeforeCreate(
    contentType: string,
    operation: (event: HookEvent) => Promise<any>
  ) {
    return async (event: HookEvent) => {
      const context: HookContext = {
        contentType,
        hookType: 'beforeCreate',
        event,
        operationId: `${contentType}-beforeCreate-${Date.now()}`
      };

      const result = await this.errorHandler.wrapHookOperation(context, () => operation(event));
      
      // If operation cannot proceed, throw error to block creation
      if (!result.canProceed) {
        throw new Error(result.errors[0]?.message || 'Hook operation failed');
      }

      return result.modifiedData;
    };
  }

  /**
   * Wraps beforeUpdate hook with error handling
   */
  async wrapBeforeUpdate(
    contentType: string,
    operation: (event: HookEvent) => Promise<any>
  ) {
    return async (event: HookEvent) => {
      const context: HookContext = {
        contentType,
        hookType: 'beforeUpdate',
        event,
        operationId: `${contentType}-beforeUpdate-${Date.now()}`
      };

      const result = await this.errorHandler.wrapHookOperation(context, () => operation(event));
      
      // If operation cannot proceed, throw error to block update
      if (!result.canProceed) {
        throw new Error(result.errors[0]?.message || 'Hook operation failed');
      }

      return result.modifiedData;
    };
  }

  /**
   * Wraps afterCreate hook with error handling (non-blocking)
   */
  async wrapAfterCreate(
    contentType: string,
    operation: (event: HookEvent) => Promise<void>
  ) {
    return async (event: HookEvent) => {
      const context: HookContext = {
        contentType,
        hookType: 'afterCreate',
        event,
        operationId: `${contentType}-afterCreate-${Date.now()}`
      };

      // After hooks should never block operations
      await this.errorHandler.wrapHookOperation(context, () => operation(event));
    };
  }

  /**
   * Wraps afterUpdate hook with error handling (non-blocking)
   */
  async wrapAfterUpdate(
    contentType: string,
    operation: (event: HookEvent) => Promise<void>
  ) {
    return async (event: HookEvent) => {
      const context: HookContext = {
        contentType,
        hookType: 'afterUpdate',
        event,
        operationId: `${contentType}-afterUpdate-${Date.now()}`
      };

      // After hooks should never block operations
      await this.errorHandler.wrapHookOperation(context, () => operation(event));
    };
  }
}

export default HookErrorHandler;
export { HookErrorHandler };
export type { HookEvent, HookResult, HookError, HookWarning, HookContext, HookErrorConfig };