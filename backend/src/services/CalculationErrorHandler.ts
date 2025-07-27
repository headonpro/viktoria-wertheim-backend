/**
 * Calculation Error Handler
 * 
 * Implements fallback values for failed calculations, retry mechanisms,
 * and calculation error reporting.
 * 
 * Supports Requirements 5.3 (fallback values) and 2.2 (error handling).
 */

import { CalculationResult, CalculationContext } from './CalculationService';

/**
 * Error severity levels
 */
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error recovery strategy types
 */
type RecoveryStrategy = 'fallback' | 'retry' | 'skip' | 'fail';

/**
 * Calculation error details
 */
interface CalculationError {
  calculationName: string;
  errorType: string;
  message: string;
  originalError?: Error;
  context?: CalculationContext;
  data?: any;
  severity: ErrorSeverity;
  timestamp: Date;
  recoveryStrategy: RecoveryStrategy;
  fallbackValue?: any;
  retryAttempt?: number;
  maxRetries?: number;
}

/**
 * Error recovery configuration
 */
interface ErrorRecoveryConfig {
  calculationName: string;
  errorTypes: string[]; // Error types this config applies to
  strategy: RecoveryStrategy;
  fallbackValue?: any;
  maxRetries?: number;
  retryDelay?: number; // Delay between retries in ms
  retryBackoff?: 'linear' | 'exponential'; // Backoff strategy
  severity: ErrorSeverity;
  enabled: boolean;
}

/**
 * Error reporting configuration
 */
interface ErrorReportingConfig {
  enableDetailedLogging: boolean;
  enableMetricsCollection: boolean;
  enableAlerts: boolean;
  alertThresholds: {
    errorRate: number; // Percentage
    timeWindow: number; // Time window in ms
  };
  reportingInterval: number; // How often to generate reports (ms)
}

/**
 * Error metrics for monitoring
 */
interface ErrorMetrics {
  totalErrors: number;
  errorsByCalculation: Record<string, number>;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  fallbackUsage: Record<string, number>;
  retryAttempts: Record<string, number>;
  recoverySuccess: Record<string, number>;
  averageRecoveryTime: number;
  errorRate: number; // Errors per calculation
  lastReportTime: Date;
}

/**
 * Error recovery result
 */
interface ErrorRecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  value?: any;
  fallbackUsed: boolean;
  retryRecommended: boolean;
  retryDelay?: number;
  error?: string;
  recoveryTime: number;
}

/**
 * Default error recovery configurations
 */
const DEFAULT_ERROR_CONFIGS: ErrorRecoveryConfig[] = [
  {
    calculationName: 'goal-difference',
    errorTypes: ['TypeError', 'ReferenceError', 'ValidationError'],
    strategy: 'fallback',
    fallbackValue: 0,
    severity: 'medium',
    enabled: true
  },
  {
    calculationName: 'points',
    errorTypes: ['TypeError', 'ReferenceError', 'ValidationError'],
    strategy: 'fallback',
    fallbackValue: 0,
    severity: 'medium',
    enabled: true
  },
  {
    calculationName: 'table-position',
    errorTypes: ['TimeoutError', 'DatabaseError'],
    strategy: 'retry',
    maxRetries: 3,
    retryDelay: 1000,
    retryBackoff: 'exponential',
    fallbackValue: 999,
    severity: 'high',
    enabled: true
  },
  {
    calculationName: 'team-statistics',
    errorTypes: ['TimeoutError', 'NetworkError'],
    strategy: 'retry',
    maxRetries: 2,
    retryDelay: 500,
    retryBackoff: 'linear',
    severity: 'low',
    enabled: true
  }
];

/**
 * Default error reporting configuration
 */
const DEFAULT_REPORTING_CONFIG: ErrorReportingConfig = {
  enableDetailedLogging: true,
  enableMetricsCollection: true,
  enableAlerts: false, // Disabled by default to avoid spam
  alertThresholds: {
    errorRate: 10, // 10% error rate
    timeWindow: 5 * 60 * 1000 // 5 minutes
  },
  reportingInterval: 15 * 60 * 1000 // 15 minutes
};

/**
 * Calculation Error Handler Class
 */
export class CalculationErrorHandler {
  private strapi: any;
  private errorConfigs: Map<string, ErrorRecoveryConfig[]> = new Map();
  private reportingConfig: ErrorReportingConfig;
  private metrics: ErrorMetrics;
  private errorHistory: CalculationError[] = [];
  private reportingInterval?: NodeJS.Timeout;

  constructor(strapi: any, reportingConfig: Partial<ErrorReportingConfig> = {}) {
    this.strapi = strapi;
    this.reportingConfig = { ...DEFAULT_REPORTING_CONFIG, ...reportingConfig };
    this.metrics = this.initializeMetrics();
    
    // Initialize with default error configurations
    this.initializeDefaultConfigs();
    
    // Start error reporting if enabled
    if (this.reportingConfig.enableMetricsCollection) {
      this.startErrorReporting();
    }
    
    this.logInfo('CalculationErrorHandler initialized');
  }

  /**
   * Handle calculation error and attempt recovery
   */
  async handleCalculationError(
    calculationName: string,
    error: Error,
    context?: CalculationContext,
    data?: any,
    retryAttempt: number = 0
  ): Promise<ErrorRecoveryResult> {
    const startTime = Date.now();
    
    // Create error record
    const calcError: CalculationError = {
      calculationName,
      errorType: error.constructor.name,
      message: error.message,
      originalError: error,
      context,
      data,
      severity: this.determineSeverity(calculationName, error),
      timestamp: new Date(),
      recoveryStrategy: 'fail', // Will be updated based on config
      retryAttempt
    };

    // Find applicable error configuration
    const config = this.findErrorConfig(calculationName, error);
    if (config) {
      calcError.recoveryStrategy = config.strategy;
      calcError.fallbackValue = config.fallbackValue;
      calcError.maxRetries = config.maxRetries;
    }

    // Record error
    this.recordError(calcError);

    // Attempt recovery based on strategy
    const recoveryResult = await this.executeRecoveryStrategy(calcError, config);
    
    // Update metrics
    this.updateRecoveryMetrics(calcError, recoveryResult, Date.now() - startTime);

    // Log recovery result
    this.logRecoveryResult(calcError, recoveryResult);

    return recoveryResult;
  }

  /**
   * Register error recovery configuration
   */
  registerErrorConfig(config: ErrorRecoveryConfig): void {
    this.validateErrorConfig(config);
    
    const configs = this.errorConfigs.get(config.calculationName) || [];
    
    // Remove existing config for same error types
    const filteredConfigs = configs.filter(c => 
      !c.errorTypes.some(type => config.errorTypes.includes(type))
    );
    
    filteredConfigs.push(config);
    this.errorConfigs.set(config.calculationName, filteredConfigs);
    
    this.logInfo(`Error recovery config registered: ${config.calculationName}`, {
      errorTypes: config.errorTypes,
      strategy: config.strategy,
      severity: config.severity
    });
  }

  /**
   * Register multiple error configurations
   */
  registerErrorConfigs(configs: ErrorRecoveryConfig[]): void {
    for (const config of configs) {
      this.registerErrorConfig(config);
    }
  }

  /**
   * Enable or disable error configuration
   */
  setErrorConfigEnabled(calculationName: string, errorType: string, enabled: boolean): boolean {
    const configs = this.errorConfigs.get(calculationName);
    if (!configs) return false;

    let found = false;
    for (const config of configs) {
      if (config.errorTypes.includes(errorType)) {
        config.enabled = enabled;
        found = true;
      }
    }

    if (found) {
      this.logInfo(`Error config ${enabled ? 'enabled' : 'disabled'}: ${calculationName}/${errorType}`);
    }

    return found;
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Get error history with optional filtering
   */
  getErrorHistory(filter?: {
    calculationName?: string;
    errorType?: string;
    severity?: ErrorSeverity;
    since?: Date;
    limit?: number;
  }): CalculationError[] {
    let errors = [...this.errorHistory];

    if (filter) {
      if (filter.calculationName) {
        errors = errors.filter(e => e.calculationName === filter.calculationName);
      }
      if (filter.errorType) {
        errors = errors.filter(e => e.errorType === filter.errorType);
      }
      if (filter.severity) {
        errors = errors.filter(e => e.severity === filter.severity);
      }
      if (filter.since) {
        errors = errors.filter(e => e.timestamp >= filter.since!);
      }
      if (filter.limit) {
        errors = errors.slice(0, filter.limit);
      }
    }

    return errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): number {
    const count = this.errorHistory.length;
    this.errorHistory = [];
    this.logDebug(`Cleared ${count} error records`);
    return count;
  }

  /**
   * Generate error report
   */
  generateErrorReport(): {
    summary: ErrorMetrics;
    recentErrors: CalculationError[];
    recommendations: string[];
  } {
    const recentErrors = this.getErrorHistory({
      since: new Date(Date.now() - this.reportingConfig.reportingInterval),
      limit: 50
    });

    const recommendations = this.generateRecommendations();

    return {
      summary: this.getErrorMetrics(),
      recentErrors,
      recommendations
    };
  }

  /**
   * Update reporting configuration
   */
  updateReportingConfig(config: Partial<ErrorReportingConfig>): void {
    this.reportingConfig = { ...this.reportingConfig, ...config };
    
    // Restart reporting if needed
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    if (this.reportingConfig.enableMetricsCollection) {
      this.startErrorReporting();
    }
    
    this.logInfo('Error reporting configuration updated', this.reportingConfig);
  }

  /**
   * Execute recovery strategy for an error
   */
  private async executeRecoveryStrategy(
    error: CalculationError,
    config?: ErrorRecoveryConfig
  ): Promise<ErrorRecoveryResult> {
    const startTime = Date.now();

    if (!config || !config.enabled) {
      return {
        success: false,
        strategy: 'fail',
        fallbackUsed: false,
        retryRecommended: false,
        error: 'No recovery configuration found or disabled',
        recoveryTime: Date.now() - startTime
      };
    }

    switch (config.strategy) {
      case 'fallback':
        return this.executeFallbackStrategy(error, config, startTime);
      
      case 'retry':
        return this.executeRetryStrategy(error, config, startTime);
      
      case 'skip':
        return this.executeSkipStrategy(error, config, startTime);
      
      case 'fail':
      default:
        return {
          success: false,
          strategy: 'fail',
          fallbackUsed: false,
          retryRecommended: false,
          error: error.message,
          recoveryTime: Date.now() - startTime
        };
    }
  }

  /**
   * Execute fallback recovery strategy
   */
  private async executeFallbackStrategy(
    error: CalculationError,
    config: ErrorRecoveryConfig,
    startTime: number
  ): Promise<ErrorRecoveryResult> {
    try {
      const fallbackValue = config.fallbackValue !== undefined 
        ? config.fallbackValue 
        : this.getDefaultFallbackValue(error.calculationName);

      this.logWarn(`Using fallback value for calculation: ${error.calculationName}`, {
        error: error.message,
        fallbackValue
      });

      return {
        success: true,
        strategy: 'fallback',
        value: fallbackValue,
        fallbackUsed: true,
        retryRecommended: false,
        recoveryTime: Date.now() - startTime
      };
    } catch (fallbackError) {
      return {
        success: false,
        strategy: 'fallback',
        fallbackUsed: false,
        retryRecommended: true,
        error: `Fallback strategy failed: ${fallbackError.message}`,
        recoveryTime: Date.now() - startTime
      };
    }
  }

  /**
   * Execute retry recovery strategy
   */
  private async executeRetryStrategy(
    error: CalculationError,
    config: ErrorRecoveryConfig,
    startTime: number
  ): Promise<ErrorRecoveryResult> {
    const maxRetries = config.maxRetries || 2;
    const currentAttempt = error.retryAttempt || 0;

    if (currentAttempt >= maxRetries) {
      // Max retries reached, try fallback if available
      if (config.fallbackValue !== undefined) {
        this.logWarn(`Max retries reached, using fallback: ${error.calculationName}`, {
          retryAttempt: currentAttempt,
          maxRetries
        });
        
        return {
          success: true,
          strategy: 'fallback',
          value: config.fallbackValue,
          fallbackUsed: true,
          retryRecommended: false,
          recoveryTime: Date.now() - startTime
        };
      } else {
        return {
          success: false,
          strategy: 'retry',
          fallbackUsed: false,
          retryRecommended: false,
          error: `Max retries (${maxRetries}) exceeded`,
          recoveryTime: Date.now() - startTime
        };
      }
    }

    // Calculate retry delay
    const baseDelay = config.retryDelay || 1000;
    let retryDelay = baseDelay;

    if (config.retryBackoff === 'exponential') {
      retryDelay = baseDelay * Math.pow(2, currentAttempt);
    } else if (config.retryBackoff === 'linear') {
      retryDelay = baseDelay * (currentAttempt + 1);
    }

    this.logInfo(`Scheduling retry for calculation: ${error.calculationName}`, {
      retryAttempt: currentAttempt + 1,
      maxRetries,
      retryDelay
    });

    return {
      success: false,
      strategy: 'retry',
      fallbackUsed: false,
      retryRecommended: true,
      retryDelay,
      recoveryTime: Date.now() - startTime
    };
  }

  /**
   * Execute skip recovery strategy
   */
  private async executeSkipStrategy(
    error: CalculationError,
    config: ErrorRecoveryConfig,
    startTime: number
  ): Promise<ErrorRecoveryResult> {
    this.logInfo(`Skipping failed calculation: ${error.calculationName}`, {
      error: error.message
    });

    return {
      success: true,
      strategy: 'skip',
      value: undefined,
      fallbackUsed: false,
      retryRecommended: false,
      recoveryTime: Date.now() - startTime
    };
  }

  /**
   * Find applicable error configuration
   */
  private findErrorConfig(calculationName: string, error: Error): ErrorRecoveryConfig | null {
    const configs = this.errorConfigs.get(calculationName);
    if (!configs) return null;

    // Find config that matches error type and is enabled
    for (const config of configs) {
      if (config.enabled && config.errorTypes.includes(error.constructor.name)) {
        return config;
      }
    }

    // Try to find a generic config
    for (const config of configs) {
      if (config.enabled && config.errorTypes.includes('*')) {
        return config;
      }
    }

    return null;
  }

  /**
   * Determine error severity based on calculation and error type
   */
  private determineSeverity(calculationName: string, error: Error): ErrorSeverity {
    // Check if there's a specific config for this error
    const config = this.findErrorConfig(calculationName, error);
    if (config) {
      return config.severity;
    }

    // Default severity based on error type
    const errorType = error.constructor.name;
    
    if (errorType.includes('Timeout') || errorType.includes('Network')) {
      return 'medium';
    }
    
    if (errorType.includes('Type') || errorType.includes('Reference')) {
      return 'high';
    }
    
    if (errorType.includes('Validation')) {
      return 'low';
    }

    return 'medium'; // Default
  }

  /**
   * Record error for metrics and history
   */
  private recordError(error: CalculationError): void {
    // Add to history
    this.errorHistory.push(error);
    
    // Limit history size
    if (this.errorHistory.length > 1000) {
      this.errorHistory = this.errorHistory.slice(-500); // Keep last 500
    }

    // Update metrics
    this.metrics.totalErrors++;
    this.metrics.errorsByCalculation[error.calculationName] = 
      (this.metrics.errorsByCalculation[error.calculationName] || 0) + 1;
    this.metrics.errorsByType[error.errorType] = 
      (this.metrics.errorsByType[error.errorType] || 0) + 1;
    this.metrics.errorsBySeverity[error.severity] = 
      (this.metrics.errorsBySeverity[error.severity] || 0) + 1;

    // Check for alerts
    if (this.reportingConfig.enableAlerts) {
      this.checkErrorRateAlert();
    }

    // Log error if detailed logging is enabled
    if (this.reportingConfig.enableDetailedLogging) {
      this.logCalculationError(error);
    }
  }

  /**
   * Update recovery metrics
   */
  private updateRecoveryMetrics(
    error: CalculationError,
    result: ErrorRecoveryResult,
    recoveryTime: number
  ): void {
    if (result.fallbackUsed) {
      this.metrics.fallbackUsage[error.calculationName] = 
        (this.metrics.fallbackUsage[error.calculationName] || 0) + 1;
    }

    if (result.retryRecommended) {
      this.metrics.retryAttempts[error.calculationName] = 
        (this.metrics.retryAttempts[error.calculationName] || 0) + 1;
    }

    if (result.success) {
      this.metrics.recoverySuccess[error.calculationName] = 
        (this.metrics.recoverySuccess[error.calculationName] || 0) + 1;
    }

    // Update average recovery time
    const totalRecoveries = Object.values(this.metrics.recoverySuccess).reduce((a, b) => a + b, 0);
    if (totalRecoveries > 0) {
      this.metrics.averageRecoveryTime = 
        (this.metrics.averageRecoveryTime * (totalRecoveries - 1) + recoveryTime) / totalRecoveries;
    }

    // Update error rate
    const totalCalculations = this.metrics.totalErrors + totalRecoveries;
    this.metrics.errorRate = totalCalculations > 0 ? this.metrics.totalErrors / totalCalculations : 0;
  }

  /**
   * Get default fallback value for a calculation
   */
  private getDefaultFallbackValue(calculationName: string): any {
    const defaultFallbacks: Record<string, any> = {
      'goal-difference': 0,
      'points': 0,
      'table-position': 999,
      'games-played': 0,
      'wins': 0,
      'draws': 0,
      'losses': 0,
      'goals-for': 0,
      'goals-against': 0
    };

    return defaultFallbacks[calculationName] || null;
  }

  /**
   * Initialize default error configurations
   */
  private initializeDefaultConfigs(): void {
    for (const config of DEFAULT_ERROR_CONFIGS) {
      this.registerErrorConfig(config);
    }
    
    this.logDebug('Default error configurations initialized');
  }

  /**
   * Initialize metrics structure
   */
  private initializeMetrics(): ErrorMetrics {
    return {
      totalErrors: 0,
      errorsByCalculation: {},
      errorsByType: {},
      errorsBySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      fallbackUsage: {},
      retryAttempts: {},
      recoverySuccess: {},
      averageRecoveryTime: 0,
      errorRate: 0,
      lastReportTime: new Date()
    };
  }

  /**
   * Start error reporting interval
   */
  private startErrorReporting(): void {
    this.reportingInterval = setInterval(() => {
      this.generatePeriodicReport();
    }, this.reportingConfig.reportingInterval);
  }

  /**
   * Generate periodic error report
   */
  private generatePeriodicReport(): void {
    const report = this.generateErrorReport();
    
    this.logInfo('Periodic error report generated', {
      totalErrors: report.summary.totalErrors,
      errorRate: report.summary.errorRate,
      recentErrorsCount: report.recentErrors.length,
      recommendations: report.recommendations.length
    });

    this.metrics.lastReportTime = new Date();
  }

  /**
   * Check for error rate alerts
   */
  private checkErrorRateAlert(): void {
    const threshold = this.reportingConfig.alertThresholds.errorRate / 100;
    const timeWindow = this.reportingConfig.alertThresholds.timeWindow;
    const cutoffTime = new Date(Date.now() - timeWindow);

    const recentErrors = this.errorHistory.filter(e => e.timestamp >= cutoffTime);
    const recentErrorRate = recentErrors.length / Math.max(1, this.metrics.totalErrors);

    if (recentErrorRate > threshold) {
      this.logError('High error rate alert triggered', {
        errorRate: recentErrorRate,
        threshold,
        recentErrors: recentErrors.length,
        timeWindow
      });
    }
  }

  /**
   * Generate recommendations based on error patterns
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Check for high error rates
    if (this.metrics.errorRate > 0.1) {
      recommendations.push('Consider reviewing calculation logic - error rate is above 10%');
    }

    // Check for frequent fallback usage
    for (const [calc, usage] of Object.entries(this.metrics.fallbackUsage)) {
      if (usage > 10) {
        recommendations.push(`High fallback usage for ${calc} - consider improving error handling`);
      }
    }

    // Check for timeout errors
    if (this.metrics.errorsByType['TimeoutError'] > 5) {
      recommendations.push('Consider increasing timeout values or optimizing slow calculations');
    }

    return recommendations;
  }

  /**
   * Validate error configuration
   */
  private validateErrorConfig(config: ErrorRecoveryConfig): void {
    if (!config.calculationName || typeof config.calculationName !== 'string') {
      throw new Error('Error config calculationName is required and must be a string');
    }
    
    if (!Array.isArray(config.errorTypes) || config.errorTypes.length === 0) {
      throw new Error('Error config errorTypes must be a non-empty array');
    }
    
    if (!['fallback', 'retry', 'skip', 'fail'].includes(config.strategy)) {
      throw new Error('Error config strategy must be fallback, retry, skip, or fail');
    }
    
    if (!['low', 'medium', 'high', 'critical'].includes(config.severity)) {
      throw new Error('Error config severity must be low, medium, high, or critical');
    }
  }

  /**
   * Log calculation error
   */
  private logCalculationError(error: CalculationError): void {
    const logLevel = error.severity === 'critical' ? 'error' : 
                    error.severity === 'high' ? 'error' :
                    error.severity === 'medium' ? 'warn' : 'debug';

    const logData = {
      calculationName: error.calculationName,
      errorType: error.errorType,
      message: error.message,
      severity: error.severity,
      recoveryStrategy: error.recoveryStrategy,
      retryAttempt: error.retryAttempt,
      context: error.context?.operationId
    };

    if (logLevel === 'error') {
      this.logError(`Calculation error: ${error.calculationName}`, logData);
    } else if (logLevel === 'warn') {
      this.logWarn(`Calculation error: ${error.calculationName}`, logData);
    } else {
      this.logDebug(`Calculation error: ${error.calculationName}`, logData);
    }
  }

  /**
   * Log recovery result
   */
  private logRecoveryResult(error: CalculationError, result: ErrorRecoveryResult): void {
    if (result.success) {
      this.logInfo(`Error recovery successful: ${error.calculationName}`, {
        strategy: result.strategy,
        fallbackUsed: result.fallbackUsed,
        recoveryTime: result.recoveryTime
      });
    } else {
      this.logWarn(`Error recovery failed: ${error.calculationName}`, {
        strategy: result.strategy,
        error: result.error,
        retryRecommended: result.retryRecommended,
        recoveryTime: result.recoveryTime
      });
    }
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[CalculationErrorHandler] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[CalculationErrorHandler] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[CalculationErrorHandler] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[CalculationErrorHandler] ${message}`, error);
  }
}

/**
 * Singleton error handler instance
 */
let errorHandlerInstance: CalculationErrorHandler | null = null;

/**
 * Get or create error handler instance
 */
export function getCalculationErrorHandler(
  strapi?: any,
  reportingConfig?: Partial<ErrorReportingConfig>
): CalculationErrorHandler {
  if (!errorHandlerInstance && strapi) {
    errorHandlerInstance = new CalculationErrorHandler(strapi, reportingConfig);
  }
  
  if (!errorHandlerInstance) {
    throw new Error('CalculationErrorHandler not initialized. Call with strapi instance first.');
  }
  
  return errorHandlerInstance;
}

/**
 * Initialize error handler with strapi instance
 */
export function initializeCalculationErrorHandler(
  strapi: any,
  reportingConfig?: Partial<ErrorReportingConfig>
): CalculationErrorHandler {
  errorHandlerInstance = new CalculationErrorHandler(strapi, reportingConfig);
  return errorHandlerInstance;
}

/**
 * Reset error handler instance (mainly for testing)
 */
export function resetCalculationErrorHandler(): void {
  if (errorHandlerInstance && errorHandlerInstance['reportingInterval']) {
    clearInterval(errorHandlerInstance['reportingInterval']);
  }
  errorHandlerInstance = null;
}

export default CalculationErrorHandler;
export type {
  CalculationError,
  ErrorRecoveryConfig,
  ErrorReportingConfig,
  ErrorMetrics,
  ErrorRecoveryResult,
  ErrorSeverity,
  RecoveryStrategy
};