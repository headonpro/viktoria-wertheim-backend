/**
 * Base Hook Service
 * 
 * Abstract base class for all lifecycle hook services providing common functionality
 * including timeout protection, error handling, logging, and metrics collection.
 * 
 * This service implements the foundation for the modular hook architecture
 * with graceful degradation and performance monitoring.
 */

import { HookErrorHandler, HookEvent, HookResult, HookContext, HookErrorConfig } from './hook-error-handler';

/**
 * Hook configuration interface
 */
interface HookConfiguration {
  enableStrictValidation: boolean;
  enableAsyncCalculations: boolean;
  maxHookExecutionTime: number;
  retryAttempts: number;
  enableGracefulDegradation: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Hook execution metrics
 */
interface HookMetrics {
  executionCount: number;
  averageExecutionTime: number;
  errorRate: number;
  warningRate: number;
  lastExecution: Date;
  totalErrors: number;
  totalWarnings: number;
}

/**
 * Hook execution timer
 */
interface Timer {
  start(): void;
  stop(): number;
  getElapsed(): number;
}

/**
 * Performance monitor interface
 */
interface PerformanceMonitor {
  startTimer(hookName: string): Timer;
  recordExecution(hookName: string, duration: number, success: boolean): void;
  getMetrics(hookName: string): HookMetrics;
  getAverageExecutionTime(hookName: string): number;
  getSlowHooks(threshold: number): Array<{ hookName: string; averageTime: number }>;
}

/**
 * Simple timer implementation
 */
class SimpleTimer implements Timer {
  private startTime: number = 0;
  private endTime: number = 0;

  start(): void {
    this.startTime = Date.now();
  }

  stop(): number {
    this.endTime = Date.now();
    return this.getElapsed();
  }

  getElapsed(): number {
    const end = this.endTime || Date.now();
    return end - this.startTime;
  }
}

/**
 * Simple performance monitor implementation
 */
class SimplePerformanceMonitor implements PerformanceMonitor {
  private metrics: Map<string, HookMetrics> = new Map();

  startTimer(hookName: string): Timer {
    return new SimpleTimer();
  }

  recordExecution(hookName: string, duration: number, success: boolean): void {
    const existing = this.metrics.get(hookName) || {
      executionCount: 0,
      averageExecutionTime: 0,
      errorRate: 0,
      warningRate: 0,
      lastExecution: new Date(),
      totalErrors: 0,
      totalWarnings: 0
    };

    existing.executionCount++;
    existing.lastExecution = new Date();
    
    // Update average execution time
    existing.averageExecutionTime = 
      (existing.averageExecutionTime * (existing.executionCount - 1) + duration) / existing.executionCount;

    if (!success) {
      existing.totalErrors++;
    }

    // Update error rate
    existing.errorRate = existing.totalErrors / existing.executionCount;

    this.metrics.set(hookName, existing);
  }

  getMetrics(hookName: string): HookMetrics {
    return this.metrics.get(hookName) || {
      executionCount: 0,
      averageExecutionTime: 0,
      errorRate: 0,
      warningRate: 0,
      lastExecution: new Date(),
      totalErrors: 0,
      totalWarnings: 0
    };
  }

  getAverageExecutionTime(hookName: string): number {
    const metrics = this.metrics.get(hookName);
    return metrics?.averageExecutionTime || 0;
  }

  getSlowHooks(threshold: number): Array<{ hookName: string; averageTime: number }> {
    const slowHooks: Array<{ hookName: string; averageTime: number }> = [];
    
    for (const [hookName, metrics] of this.metrics.entries()) {
      if (metrics.averageExecutionTime > threshold) {
        slowHooks.push({
          hookName,
          averageTime: metrics.averageExecutionTime
        });
      }
    }

    return slowHooks.sort((a, b) => b.averageTime - a.averageTime);
  }
}

/**
 * Default hook configuration
 */
const DEFAULT_HOOK_CONFIG: HookConfiguration = {
  enableStrictValidation: false, // Temporarily disabled for stability
  enableAsyncCalculations: true,
  maxHookExecutionTime: 100, // 100ms max execution time
  retryAttempts: 2,
  enableGracefulDegradation: true,
  logLevel: 'warn'
};

/**
 * Abstract base class for all hook services
 */
export abstract class BaseHookService {
  protected config: HookConfiguration;
  protected errorHandler: HookErrorHandler;
  protected performanceMonitor: PerformanceMonitor;
  protected strapi: any;
  protected contentType: string;

  constructor(strapi: any, contentType: string, config: Partial<HookConfiguration> = {}) {
    this.strapi = strapi;
    this.contentType = contentType;
    this.config = { ...DEFAULT_HOOK_CONFIG, ...config };
    
    // Initialize error handler with hook-specific config
    const errorConfig: Partial<HookErrorConfig> = {
      enableStrictValidation: this.config.enableStrictValidation,
      enableGracefulDegradation: this.config.enableGracefulDegradation,
      maxExecutionTime: this.config.maxHookExecutionTime,
      retryAttempts: this.config.retryAttempts,
      logLevel: this.config.logLevel
    };
    
    this.errorHandler = new HookErrorHandler(strapi, errorConfig);
    this.performanceMonitor = new SimplePerformanceMonitor();
  }

  /**
   * Abstract methods that must be implemented by concrete services
   */
  abstract beforeCreate(event: HookEvent): Promise<HookResult>;
  abstract beforeUpdate(event: HookEvent): Promise<HookResult>;
  abstract afterCreate(event: HookEvent): Promise<void>;
  abstract afterUpdate(event: HookEvent): Promise<void>;

  /**
   * Execute operation with timeout protection
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number = this.config.maxHookExecutionTime
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
   * Handle errors with appropriate recovery strategies
   */
  protected handleError(error: Error, context: HookContext): HookResult {
    const result: HookResult = {
      success: false,
      canProceed: this.config.enableGracefulDegradation,
      errors: [{
        type: 'warning',
        code: 'HOOK_ERROR',
        message: error.message,
        context,
        timestamp: new Date()
      }],
      warnings: [],
      executionTime: 0
    };

    // Log error with context
    this.logError(error, context);

    return result;
  }

  /**
   * Execute hook with comprehensive error handling and metrics
   */
  protected async executeHook<T>(
    hookType: 'beforeCreate' | 'beforeUpdate' | 'afterCreate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete',
    event: HookEvent,
    operation: () => Promise<T>
  ): Promise<HookResult> {
    const timer = this.performanceMonitor.startTimer(`${this.contentType}.${hookType}`);
    timer.start();

    const context: HookContext = {
      contentType: this.contentType,
      hookType,
      event,
      operationId: `${this.contentType}-${hookType}-${Date.now()}`
    };

    try {
      // Log hook execution start
      this.logHookStart(context);

      // Execute operation with error handling
      const result = await this.errorHandler.wrapHookOperation(context, operation);
      
      // Record successful execution
      const executionTime = timer.stop();
      this.performanceMonitor.recordExecution(
        `${this.contentType}.${hookType}`,
        executionTime,
        result.success
      );

      // Log successful completion
      this.logHookSuccess(context, executionTime);

      return result;

    } catch (error) {
      // Record failed execution
      const executionTime = timer.stop();
      this.performanceMonitor.recordExecution(
        `${this.contentType}.${hookType}`,
        executionTime,
        false
      );

      // Handle error and return result
      const result = this.handleError(error, context);
      result.executionTime = executionTime;

      return result;
    }
  }

  /**
   * Get performance metrics for this service
   */
  public getMetrics(): Record<string, HookMetrics> {
    const metrics: Record<string, HookMetrics> = {};
    const hookTypes = ['beforeCreate', 'beforeUpdate', 'afterCreate', 'afterUpdate'];

    for (const hookType of hookTypes) {
      const hookName = `${this.contentType}.${hookType}`;
      metrics[hookType] = this.performanceMonitor.getMetrics(hookName);
    }

    return metrics;
  }

  /**
   * Get average execution time for a specific hook type
   */
  public getAverageExecutionTime(hookType: string): number {
    const hookName = `${this.contentType}.${hookType}`;
    return this.performanceMonitor.getAverageExecutionTime(hookName);
  }

  /**
   * Check if any hooks are performing slowly
   */
  public getSlowHooks(threshold: number = 50): Array<{ hookName: string; averageTime: number }> {
    return this.performanceMonitor.getSlowHooks(threshold);
  }

  /**
   * Update configuration at runtime
   */
  public updateConfig(newConfig: Partial<HookConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update error handler configuration
    this.errorHandler.updateConfig({
      enableStrictValidation: this.config.enableStrictValidation,
      enableGracefulDegradation: this.config.enableGracefulDegradation,
      maxExecutionTime: this.config.maxHookExecutionTime,
      retryAttempts: this.config.retryAttempts,
      logLevel: this.config.logLevel
    });

    this.logInfo('Hook service configuration updated', this.config);
  }

  /**
   * Get current configuration
   */
  public getConfig(): HookConfiguration {
    return { ...this.config };
  }

  /**
   * Logging methods with level checking
   */
  protected logDebug(message: string, data?: any): void {
    if (this.config.logLevel === 'debug') {
      this.strapi?.log?.debug(`[${this.contentType}] ${message}`, data);
    }
  }

  protected logInfo(message: string, data?: any): void {
    if (['debug', 'info'].includes(this.config.logLevel)) {
      this.strapi?.log?.info(`[${this.contentType}] ${message}`, data);
    }
  }

  protected logWarn(message: string, data?: any): void {
    if (['debug', 'info', 'warn'].includes(this.config.logLevel)) {
      this.strapi?.log?.warn(`[${this.contentType}] ${message}`, data);
    }
  }

  protected logError(error: Error, context?: HookContext): void {
    this.strapi?.log?.error(`[${this.contentType}] Hook error`, {
      error: error.message,
      stack: error.stack,
      context
    });
  }

  /**
   * Hook execution logging
   */
  private logHookStart(context: HookContext): void {
    this.logDebug(`Hook execution started: ${context.hookType}`, {
      operationId: context.operationId,
      timestamp: new Date().toISOString()
    });
  }

  private logHookSuccess(context: HookContext, executionTime: number): void {
    this.logInfo(`Hook execution completed: ${context.hookType}`, {
      operationId: context.operationId,
      executionTime,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Utility method to safely access nested properties
   */
  protected safeGet(obj: any, path: string, defaultValue: any = null): any {
    try {
      return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Utility method to check if a value is empty
   */
  protected isEmpty(value: any): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  /**
   * Utility method to generate operation ID
   */
  protected generateOperationId(hookType: string): string {
    return `${this.contentType}-${hookType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default BaseHookService;
export type { 
  HookConfiguration, 
  HookMetrics, 
  Timer, 
  PerformanceMonitor 
};