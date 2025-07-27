/**
 * Calculation Service
 * 
 * Automatic field calculation system with sync/async separation and dependency management.
 * Implements Requirements 5.1 (automatic calculations), 5.2 (dependency updates), 
 * 5.3 (fallback values), and 5.4 (async processing).
 */

import { HookConfigurationManager, getHookConfigurationManager } from './HookConfigurationManager';
import { BackgroundJobQueue, getBackgroundJobQueue } from './BackgroundJobQueue';
import { CalculationErrorHandler, getCalculationErrorHandler } from './CalculationErrorHandler';

/**
 * Sync calculation interface for immediate field calculations
 */
interface SyncCalculation {
  name: string;
  field: string;
  calculator: (data: any, context?: CalculationContext) => any;
  dependencies: string[]; // Fields this calculation depends on
  priority?: number; // Execution priority (lower = higher priority)
  enabled?: boolean;
  fallbackValue?: any;
  validator?: (result: any) => boolean; // Optional result validation
}

/**
 * Async calculation interface for background processing
 */
interface AsyncCalculation {
  name: string;
  calculator: (data: any, context?: CalculationContext) => Promise<any>;
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  enabled?: boolean;
  timeout?: number; // Timeout in milliseconds
  retryAttempts?: number;
  fallbackValue?: any;
}

/**
 * Calculation context for providing additional information
 */
interface CalculationContext {
  contentType: string;
  operation: 'create' | 'update' | 'delete';
  existingData?: any;
  strapi?: any;
  userId?: number | string;
  operationId: string;
  timestamp: Date;
}

/**
 * Calculation result for individual calculations
 */
interface CalculationResult {
  name: string;
  field?: string;
  success: boolean;
  value: any;
  originalValue?: any;
  fallbackUsed: boolean;
  error?: string;
  executionTime: number;
  dependencies: string[];
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Batch calculation result for multiple calculations
 */
interface BatchCalculationResult {
  success: boolean;
  results: CalculationResult[];
  totalExecutionTime: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  modifiedData: any;
  errors: string[];
  warnings: string[];
}

/**
 * Calculation dependency graph node
 */
interface CalculationDependencyNode {
  calculation: SyncCalculation;
  dependencies: string[];
  dependents: string[];
  executed: boolean;
  result?: CalculationResult;
}

/**
 * Calculation metrics for monitoring
 */
interface CalculationMetrics {
  totalCalculations: number;
  successfulCalculations: number;
  failedCalculations: number;
  averageExecutionTime: number;
  calculationMetrics: Record<string, {
    executions: number;
    failures: number;
    averageTime: number;
    fallbackUsage: number;
  }>;
}

/**
 * Calculation status for async operations
 */
interface CalculationStatus {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout' | 'cancelled';
  progress?: number;
  result?: any;
  error?: string;
  startTime: Date;
  endTime?: Date;
  executionTime?: number;
}

/**
 * Default calculation timeouts and limits
 */
const DEFAULT_TIMEOUTS = {
  syncCalculation: 100, // 100ms for sync calculations
  asyncCalculation: 30000, // 30 seconds for async calculations
  dependencyResolution: 50 // 50ms for dependency resolution
};

/**
 * Calculation Service Class
 */
export class CalculationService {
  private strapi: any;
  private configManager: HookConfigurationManager;
  private jobQueue: BackgroundJobQueue;
  private errorHandler: CalculationErrorHandler;
  private syncCalculations: Map<string, SyncCalculation> = new Map();
  private asyncCalculations: Map<string, AsyncCalculation> = new Map();
  private calculationsByContentType: Map<string, SyncCalculation[]> = new Map();
  private dependencyGraph: Map<string, CalculationDependencyNode> = new Map();
  private metrics: CalculationMetrics;
  private resultCache: Map<string, CalculationResult> = new Map();

  constructor(strapi: any, configManager?: HookConfigurationManager) {
    this.strapi = strapi;
    this.configManager = configManager || getHookConfigurationManager(strapi);
    this.jobQueue = getBackgroundJobQueue(strapi);
    this.errorHandler = getCalculationErrorHandler(strapi);
    this.metrics = this.initializeMetrics();
    
    // Initialize with default calculations
    this.initializeDefaultCalculations();
    
    // Start job queue if not already running
    this.jobQueue.start();
    
    this.logInfo('CalculationService initialized');
  }

  /**
   * Execute synchronous calculations on data
   */
  async calculateSync(
    data: any,
    contentType: string,
    context: CalculationContext,
    calculationNames?: string[]
  ): Promise<BatchCalculationResult> {
    const startTime = Date.now();
    
    // Get calculations to execute
    const calculations = calculationNames 
      ? calculationNames.map(name => this.syncCalculations.get(name)).filter(Boolean) as SyncCalculation[]
      : this.getCalculationsForContentType(contentType);

    const result: BatchCalculationResult = {
      success: true,
      results: [],
      totalExecutionTime: 0,
      successCount: 0,
      failureCount: 0,
      skippedCount: 0,
      modifiedData: { ...data },
      errors: [],
      warnings: []
    };

    try {
      // Resolve dependencies and sort calculations
      const sortedCalculations = this.resolveDependencies(calculations);
      
      // Execute calculations in dependency order
      for (const calculation of sortedCalculations) {
        if (!this.isCalculationEnabled(calculation.name)) {
          result.skippedCount++;
          result.results.push({
            name: calculation.name,
            field: calculation.field,
            success: true,
            value: null,
            fallbackUsed: false,
            executionTime: 0,
            dependencies: calculation.dependencies,
            skipped: true,
            skipReason: 'Calculation disabled'
          });
          continue;
        }

        const calcResult = await this.executeSyncCalculation(
          calculation,
          result.modifiedData,
          context
        );
        
        result.results.push(calcResult);

        if (calcResult.success && !calcResult.skipped) {
          result.successCount++;
          // Apply result to modified data
          if (calculation.field && calcResult.value !== undefined) {
            result.modifiedData[calculation.field] = calcResult.value;
          }
        } else if (!calcResult.skipped) {
          result.failureCount++;
          result.success = false;
          if (calcResult.error) {
            result.errors.push(`${calculation.name}: ${calcResult.error}`);
          }
        }

        // Add warnings for fallback usage
        if (calcResult.fallbackUsed) {
          result.warnings.push(`${calculation.name}: Fallback value used`);
        }

        // Update metrics
        this.updateCalculationMetrics(calculation.name, calcResult);
      }

    } catch (error) {
      this.logError('Sync calculation batch failed', error);
      result.success = false;
      result.errors.push(`Batch calculation failed: ${error.message}`);
    } finally {
      result.totalExecutionTime = Date.now() - startTime;
      this.updateGlobalMetrics(result);
    }

    this.logDebug(`Sync calculations completed: ${context.operationId}`, {
      contentType,
      calculationsExecuted: result.results.length,
      successCount: result.successCount,
      failureCount: result.failureCount,
      executionTime: result.totalExecutionTime
    });

    return result;
  }

  /**
   * Schedule asynchronous calculations
   */
  async scheduleAsync(
    data: any,
    contentType: string,
    context: CalculationContext,
    calculationNames?: string[]
  ): Promise<string[]> {
    const jobIds: string[] = [];
    
    // Get async calculations to schedule
    const calculations = calculationNames
      ? calculationNames.map(name => this.asyncCalculations.get(name)).filter(Boolean) as AsyncCalculation[]
      : this.getAsyncCalculationsForContentType(contentType);

    for (const calculation of calculations) {
      if (!this.isCalculationEnabled(calculation.name)) {
        this.logDebug(`Async calculation skipped (disabled): ${calculation.name}`);
        continue;
      }

      try {
        // Add job to background queue
        const jobId = this.jobQueue.addCalculationJob(calculation, data, context);
        jobIds.push(jobId);
        
        this.logDebug(`Async calculation scheduled: ${calculation.name}`, {
          jobId,
          priority: calculation.priority
        });
      } catch (error) {
        this.logError(`Failed to schedule async calculation: ${calculation.name}`, error);
      }
    }

    this.logInfo(`Scheduled ${jobIds.length} async calculations`, {
      contentType,
      operationId: context.operationId,
      jobIds
    });

    return jobIds;
  }

  /**
   * Get status of async calculation
   */
  getCalculationStatus(jobId: string): CalculationStatus | null {
    return this.jobQueue.getJobStatus(jobId);
  }

  /**
   * Register a sync calculation
   */
  registerSyncCalculation(calculation: SyncCalculation): void {
    // Validate calculation structure
    this.validateSyncCalculation(calculation);
    
    // Set defaults
    calculation.enabled = calculation.enabled !== false;
    calculation.priority = calculation.priority || 100;
    
    // Store calculation
    this.syncCalculations.set(calculation.name, calculation);
    
    // Update dependency graph
    this.updateDependencyGraph(calculation);
    
    this.logInfo(`Sync calculation registered: ${calculation.name}`, {
      field: calculation.field,
      dependencies: calculation.dependencies,
      enabled: calculation.enabled
    });
  }

  /**
   * Register an async calculation
   */
  registerAsyncCalculation(calculation: AsyncCalculation): void {
    // Validate calculation structure
    this.validateAsyncCalculation(calculation);
    
    // Set defaults
    calculation.enabled = calculation.enabled !== false;
    calculation.timeout = calculation.timeout || DEFAULT_TIMEOUTS.asyncCalculation;
    calculation.retryAttempts = calculation.retryAttempts || 2;
    
    // Store calculation
    this.asyncCalculations.set(calculation.name, calculation);
    
    this.logInfo(`Async calculation registered: ${calculation.name}`, {
      priority: calculation.priority,
      timeout: calculation.timeout,
      enabled: calculation.enabled
    });
  }

  /**
   * Register multiple calculations at once
   */
  registerCalculations(
    syncCalculations: SyncCalculation[] = [],
    asyncCalculations: AsyncCalculation[] = []
  ): void {
    for (const calc of syncCalculations) {
      this.registerSyncCalculation(calc);
    }
    
    for (const calc of asyncCalculations) {
      this.registerAsyncCalculation(calc);
    }
  }

  /**
   * Enable or disable a calculation
   */
  setCalculationEnabled(calculationName: string, enabled: boolean): boolean {
    const syncCalc = this.syncCalculations.get(calculationName);
    const asyncCalc = this.asyncCalculations.get(calculationName);
    
    if (syncCalc) {
      syncCalc.enabled = enabled;
      this.logInfo(`Sync calculation ${enabled ? 'enabled' : 'disabled'}: ${calculationName}`);
      return true;
    }
    
    if (asyncCalc) {
      asyncCalc.enabled = enabled;
      this.logInfo(`Async calculation ${enabled ? 'enabled' : 'disabled'}: ${calculationName}`);
      return true;
    }
    
    return false;
  }

  /**
   * Get calculations for a content type
   */
  getCalculationsForContentType(contentType: string): SyncCalculation[] {
    return this.calculationsByContentType.get(contentType) || [];
  }

  /**
   * Get async calculations for a content type
   */
  getAsyncCalculationsForContentType(contentType: string): AsyncCalculation[] {
    return Array.from(this.asyncCalculations.values()).filter(calc => 
      calc.enabled !== false
    );
  }

  /**
   * Get calculation metrics
   */
  getMetrics(): CalculationMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear calculation result cache
   */
  clearCache(): void {
    this.resultCache.clear();
    this.logDebug('Calculation result cache cleared');
  }

  /**
   * Clear completed async jobs
   */
  clearCompletedJobs(): number {
    return this.jobQueue.clearCompletedJobs();
  }

  /**
   * Get job queue statistics
   */
  getJobQueueStatistics() {
    return this.jobQueue.getStatistics();
  }

  /**
   * Cancel an async calculation job
   */
  cancelAsyncCalculation(jobId: string): boolean {
    return this.jobQueue.cancelJob(jobId);
  }

  /**
   * Retry a failed async calculation
   */
  retryAsyncCalculation(jobId: string): boolean {
    return this.jobQueue.retryJob(jobId);
  }

  /**
   * Get error metrics from error handler
   */
  getErrorMetrics() {
    return this.errorHandler.getErrorMetrics();
  }

  /**
   * Get error history with optional filtering
   */
  getErrorHistory(filter?: any) {
    return this.errorHandler.getErrorHistory(filter);
  }

  /**
   * Generate comprehensive error report
   */
  generateErrorReport() {
    return this.errorHandler.generateErrorReport();
  }

  /**
   * Register custom error recovery configuration
   */
  registerErrorConfig(config: any): void {
    this.errorHandler.registerErrorConfig(config);
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): number {
    return this.errorHandler.clearErrorHistory();
  }

  /**
   * Execute a single sync calculation
   */
  private async executeSyncCalculation(
    calculation: SyncCalculation,
    data: any,
    context: CalculationContext
  ): Promise<CalculationResult> {
    const startTime = Date.now();
    
    const result: CalculationResult = {
      name: calculation.name,
      field: calculation.field,
      success: false,
      value: null,
      fallbackUsed: false,
      executionTime: 0,
      dependencies: calculation.dependencies
    };

    try {
      // Check dependencies
      if (!this.checkDependencies(calculation.dependencies, data)) {
        result.skipped = true;
        result.skipReason = 'Dependencies not satisfied';
        result.success = true; // Not a failure, just skipped
        return result;
      }

      // Execute calculation with timeout
      const calculationPromise = Promise.resolve(calculation.calculator(data, context));
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Calculation timeout')), DEFAULT_TIMEOUTS.syncCalculation)
      );

      result.value = await Promise.race([calculationPromise, timeoutPromise]);
      
      // Validate result if validator is provided
      if (calculation.validator && !calculation.validator(result.value)) {
        throw new Error('Calculation result validation failed');
      }

      result.success = true;

    } catch (error) {
      // Use error handler for recovery
      const recoveryResult = await this.errorHandler.handleCalculationError(
        calculation.name,
        error,
        context,
        data
      );

      if (recoveryResult.success) {
        result.value = recoveryResult.value;
        result.fallbackUsed = recoveryResult.fallbackUsed;
        result.success = true;
        
        this.logInfo(`Calculation error recovered: ${calculation.name}`, {
          strategy: recoveryResult.strategy,
          fallbackUsed: recoveryResult.fallbackUsed
        });
      } else {
        result.error = error.message;
        result.success = false;
        
        this.logError(`Calculation error recovery failed: ${calculation.name}`, {
          error: error.message,
          recoveryError: recoveryResult.error
        });
      }
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }



  /**
   * Check if calculation is enabled
   */
  private isCalculationEnabled(calculationName: string): boolean {
    const syncCalc = this.syncCalculations.get(calculationName);
    const asyncCalc = this.asyncCalculations.get(calculationName);
    
    if (syncCalc) return syncCalc.enabled !== false;
    if (asyncCalc) return asyncCalc.enabled !== false;
    
    return false;
  }

  /**
   * Resolve calculation dependencies and return sorted execution order
   */
  private resolveDependencies(calculations: SyncCalculation[]): SyncCalculation[] {
    // Simple topological sort for dependency resolution
    const sorted: SyncCalculation[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (calculation: SyncCalculation) => {
      if (visiting.has(calculation.name)) {
        throw new Error(`Circular dependency detected in calculation: ${calculation.name}`);
      }
      
      if (visited.has(calculation.name)) {
        return;
      }

      visiting.add(calculation.name);

      // Visit dependencies first
      for (const depName of calculation.dependencies) {
        const depCalc = calculations.find(c => c.name === depName);
        if (depCalc) {
          visit(depCalc);
        }
      }

      visiting.delete(calculation.name);
      visited.add(calculation.name);
      sorted.push(calculation);
    };

    // Sort by priority first, then resolve dependencies
    const prioritySorted = [...calculations].sort((a, b) => (a.priority || 100) - (b.priority || 100));
    
    for (const calculation of prioritySorted) {
      if (!visited.has(calculation.name)) {
        visit(calculation);
      }
    }

    return sorted;
  }

  /**
   * Check if dependencies are satisfied
   */
  private checkDependencies(dependencies: string[], data: any): boolean {
    for (const dep of dependencies) {
      if (data[dep] === undefined || data[dep] === null) {
        return false;
      }
    }
    return true;
  }

  /**
   * Initialize default calculations
   */
  private initializeDefaultCalculations(): void {
    // Goal difference calculation
    this.registerSyncCalculation({
      name: 'goal-difference',
      field: 'tordifferenz',
      calculator: (data: any) => {
        const fuer = Number(data.tore_fuer) || 0;
        const gegen = Number(data.tore_gegen) || 0;
        return fuer - gegen;
      },
      dependencies: ['tore_fuer', 'tore_gegen'],
      priority: 1,
      fallbackValue: 0,
      validator: (result: any) => typeof result === 'number'
    });

    // Points calculation
    this.registerSyncCalculation({
      name: 'points',
      field: 'punkte',
      calculator: (data: any) => {
        const wins = Number(data.siege) || 0;
        const draws = Number(data.unentschieden) || 0;
        return (wins * 3) + (draws * 1);
      },
      dependencies: ['siege', 'unentschieden'],
      priority: 2,
      fallbackValue: 0,
      validator: (result: any) => typeof result === 'number' && result >= 0
    });

    this.logDebug('Default calculations initialized');
  }

  /**
   * Validate sync calculation structure
   */
  private validateSyncCalculation(calculation: SyncCalculation): void {
    if (!calculation.name || typeof calculation.name !== 'string') {
      throw new Error('Calculation name is required and must be a string');
    }
    
    if (!calculation.field || typeof calculation.field !== 'string') {
      throw new Error('Calculation field is required and must be a string');
    }
    
    if (typeof calculation.calculator !== 'function') {
      throw new Error('Calculation calculator must be a function');
    }
    
    if (!Array.isArray(calculation.dependencies)) {
      throw new Error('Calculation dependencies must be an array');
    }
  }

  /**
   * Validate async calculation structure
   */
  private validateAsyncCalculation(calculation: AsyncCalculation): void {
    if (!calculation.name || typeof calculation.name !== 'string') {
      throw new Error('Async calculation name is required and must be a string');
    }
    
    if (typeof calculation.calculator !== 'function') {
      throw new Error('Async calculation calculator must be a function');
    }
    
    if (!['high', 'medium', 'low'].includes(calculation.priority)) {
      throw new Error('Async calculation priority must be high, medium, or low');
    }
    
    if (!Array.isArray(calculation.dependencies)) {
      throw new Error('Async calculation dependencies must be an array');
    }
  }

  /**
   * Update dependency graph when calculation is added
   */
  private updateDependencyGraph(calculation: SyncCalculation): void {
    const node: CalculationDependencyNode = {
      calculation,
      dependencies: calculation.dependencies,
      dependents: [],
      executed: false
    };

    this.dependencyGraph.set(calculation.name, node);

    // Update dependents for dependency calculations
    for (const depName of calculation.dependencies) {
      const depNode = this.dependencyGraph.get(depName);
      if (depNode) {
        depNode.dependents.push(calculation.name);
      }
    }
  }

  /**
   * Generate unique job ID for async calculations
   */
  private generateJobId(calculationName: string, context: CalculationContext): string {
    return `${calculationName}-${context.operationId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize metrics structure
   */
  private initializeMetrics(): CalculationMetrics {
    return {
      totalCalculations: 0,
      successfulCalculations: 0,
      failedCalculations: 0,
      averageExecutionTime: 0,
      calculationMetrics: {}
    };
  }

  /**
   * Update metrics for a specific calculation
   */
  private updateCalculationMetrics(calculationName: string, result: CalculationResult): void {
    if (!this.metrics.calculationMetrics[calculationName]) {
      this.metrics.calculationMetrics[calculationName] = {
        executions: 0,
        failures: 0,
        averageTime: 0,
        fallbackUsage: 0
      };
    }

    const calcMetrics = this.metrics.calculationMetrics[calculationName];
    calcMetrics.executions++;
    
    if (!result.success) {
      calcMetrics.failures++;
    }
    
    if (result.fallbackUsed) {
      calcMetrics.fallbackUsage++;
    }

    // Update average execution time
    calcMetrics.averageTime = 
      (calcMetrics.averageTime * (calcMetrics.executions - 1) + result.executionTime) / 
      calcMetrics.executions;
  }

  /**
   * Update global calculation metrics
   */
  private updateGlobalMetrics(result: BatchCalculationResult): void {
    this.metrics.totalCalculations += result.results.length;
    this.metrics.successfulCalculations += result.successCount;
    this.metrics.failedCalculations += result.failureCount;

    // Update average execution time
    if (this.metrics.totalCalculations > 0) {
      this.metrics.averageExecutionTime = 
        (this.metrics.averageExecutionTime * (this.metrics.totalCalculations - result.results.length) + 
         result.totalExecutionTime) / this.metrics.totalCalculations;
    }
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[CalculationService] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[CalculationService] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[CalculationService] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[CalculationService] ${message}`, error);
  }
}

/**
 * Singleton calculation service instance
 */
let calculationServiceInstance: CalculationService | null = null;

/**
 * Get or create calculation service instance
 */
export function getCalculationService(
  strapi?: any,
  configManager?: HookConfigurationManager
): CalculationService {
  if (!calculationServiceInstance && strapi) {
    calculationServiceInstance = new CalculationService(strapi, configManager);
  }
  
  if (!calculationServiceInstance) {
    throw new Error('CalculationService not initialized. Call with strapi instance first.');
  }
  
  return calculationServiceInstance;
}

/**
 * Initialize calculation service with strapi instance
 */
export function initializeCalculationService(
  strapi: any,
  configManager?: HookConfigurationManager
): CalculationService {
  calculationServiceInstance = new CalculationService(strapi, configManager);
  return calculationServiceInstance;
}

/**
 * Reset calculation service instance (mainly for testing)
 */
export function resetCalculationService(): void {
  calculationServiceInstance = null;
}

export default CalculationService;
export type {
  SyncCalculation,
  AsyncCalculation,
  CalculationContext,
  CalculationResult,
  BatchCalculationResult,
  CalculationStatus,
  CalculationMetrics
};