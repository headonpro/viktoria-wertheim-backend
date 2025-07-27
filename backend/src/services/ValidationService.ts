/**
 * Validation Service
 * 
 * Modular validation system with rules engine that separates critical from warning validations.
 * Provides configurable validation rule management and structured result aggregation.
 * 
 * This service implements Requirements 2.1 (clear error messages) and 8.1 (data integrity).
 */

import { HookConfigurationManager, getHookConfigurationManager } from './HookConfigurationManager';

/**
 * Validation rule interface
 */
interface ValidationRule {
  name: string;
  type: 'critical' | 'warning';
  validator: (data: any, context?: ValidationContext) => boolean | Promise<boolean>;
  message: string;
  messageKey?: string; // For localization
  enabled: boolean;
  dependencies?: string[]; // Other rules this rule depends on
  priority?: number; // Execution priority (lower = higher priority)
  async?: boolean; // Whether this rule requires async execution
}

/**
 * Validation context for rules
 */
export interface ValidationContext {
  contentType: string;
  operation: 'create' | 'update' | 'delete';
  existingData?: any;
  strapi?: any;
  userId?: number;
  operationId: string;
  // Season-specific context properties
  overlappingSeasons?: any[];
  overlapDetails?: any;
  validationError?: string;
  activeSeasons?: any[];
  dependentTeams?: any[];
  dependentLeagues?: any[];
}

/**
 * Validation error details
 */
interface ValidationError {
  ruleName: string;
  type: 'critical' | 'warning';
  code: string;
  message: string;
  field?: string;
  value?: any;
  context?: any;
  timestamp: Date;
}

/**
 * Validation warning details
 */
interface ValidationWarning {
  ruleName: string;
  code: string;
  message: string;
  field?: string;
  value?: any;
  context?: any;
  timestamp: Date;
}

/**
 * Validation result
 */
interface ValidationResult {
  isValid: boolean;
  canProceed: boolean; // Can operation continue despite errors
  errors: ValidationError[];
  warnings: ValidationWarning[];
  executionTime: number;
  rulesExecuted: string[];
  rulesFailed: string[];
  rulesSkipped: string[];
}

/**
 * Rule execution result
 */
interface RuleExecutionResult {
  ruleName: string;
  passed: boolean;
  error?: ValidationError;
  warning?: ValidationWarning;
  executionTime: number;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Rule dependency graph node
 */
interface RuleDependencyNode {
  rule: ValidationRule;
  dependencies: string[];
  dependents: string[];
  executed: boolean;
  result?: RuleExecutionResult;
}

/**
 * Validation metrics
 */
interface ValidationMetrics {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  averageExecutionTime: number;
  ruleMetrics: Record<string, {
    executions: number;
    failures: number;
    averageTime: number;
  }>;
}

/**
 * Default validation messages in German
 */
const DEFAULT_MESSAGES = {
  REQUIRED_FIELD: 'Dieses Feld ist erforderlich',
  INVALID_FORMAT: 'Das Format ist ungültig',
  DUPLICATE_VALUE: 'Dieser Wert existiert bereits',
  INVALID_RANGE: 'Der Wert liegt außerhalb des gültigen Bereichs',
  DEPENDENCY_FAILED: 'Abhängige Validierung fehlgeschlagen',
  BUSINESS_RULE_VIOLATION: 'Geschäftsregel verletzt',
  DATA_INTEGRITY_ERROR: 'Datenintegrität verletzt'
};

/**
 * Validation Service Class
 */
export class ValidationService {
  private strapi: any;
  private configManager: HookConfigurationManager;
  private rules: Map<string, ValidationRule> = new Map();
  private rulesByContentType: Map<string, ValidationRule[]> = new Map();
  private dependencyGraph: Map<string, RuleDependencyNode> = new Map();
  private metrics: ValidationMetrics;
  private resultCache: Map<string, ValidationResult> = new Map();

  constructor(strapi: any, configManager?: HookConfigurationManager) {
    this.strapi = strapi;
    this.configManager = configManager || getHookConfigurationManager(strapi);
    this.metrics = this.initializeMetrics();
    
    // Initialize with default rules
    this.initializeDefaultRules();
    
    this.logInfo('ValidationService initialized');
  }

  /**
   * Validate data with critical rules only
   */
  async validateCritical(
    data: any, 
    contentType: string, 
    context: ValidationContext
  ): Promise<ValidationResult> {
    const rules = this.getCriticalRules(contentType);
    return await this.executeValidation(data, rules, context);
  }

  /**
   * Validate data with warning rules only
   */
  async validateWarning(
    data: any, 
    contentType: string, 
    context: ValidationContext
  ): Promise<ValidationResult> {
    const rules = this.getWarningRules(contentType);
    return await this.executeValidation(data, rules, context);
  }

  /**
   * Validate data with all rules
   */
  async validateAll(
    data: any, 
    contentType: string, 
    context: ValidationContext
  ): Promise<ValidationResult> {
    const rules = this.getRulesForContentType(contentType);
    return await this.executeValidation(data, rules, context);
  }

  /**
   * Check if validation is enabled for a specific rule
   */
  isValidationEnabled(ruleName: string): boolean {
    const rule = this.rules.get(ruleName);
    if (!rule) return false;
    
    // Check global feature flag
    const globalEnabled = this.configManager.getFeatureFlag('enableAdvancedValidation');
    if (!globalEnabled && rule.type === 'warning') {
      return false;
    }
    
    return rule.enabled;
  }

  /**
   * Register a new validation rule
   */
  registerRule(rule: ValidationRule): void {
    // Validate rule structure
    this.validateRuleStructure(rule);
    
    // Store rule
    this.rules.set(rule.name, rule);
    
    // Update dependency graph
    this.updateDependencyGraph(rule);
    
    this.logInfo(`Validation rule registered: ${rule.name}`, {
      type: rule.type,
      enabled: rule.enabled
    });
  }

  /**
   * Register multiple rules at once
   */
  registerRules(rules: ValidationRule[]): void {
    for (const rule of rules) {
      this.registerRule(rule);
    }
  }

  /**
   * Unregister a validation rule
   */
  unregisterRule(ruleName: string): boolean {
    const removed = this.rules.delete(ruleName);
    if (removed) {
      this.dependencyGraph.delete(ruleName);
      this.rebuildDependencyGraph();
      this.logInfo(`Validation rule unregistered: ${ruleName}`);
    }
    return removed;
  }

  /**
   * Enable or disable a validation rule
   */
  setRuleEnabled(ruleName: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleName);
    if (!rule) return false;
    
    rule.enabled = enabled;
    this.logInfo(`Validation rule ${enabled ? 'enabled' : 'disabled'}: ${ruleName}`);
    return true;
  }

  /**
   * Get all rules for a content type
   */
  getRulesForContentType(contentType: string): ValidationRule[] {
    return this.rulesByContentType.get(contentType) || [];
  }

  /**
   * Get critical rules for a content type
   */
  getCriticalRules(contentType: string): ValidationRule[] {
    return this.getRulesForContentType(contentType).filter(rule => 
      rule.type === 'critical' && rule.enabled
    );
  }

  /**
   * Get warning rules for a content type
   */
  getWarningRules(contentType: string): ValidationRule[] {
    return this.getRulesForContentType(contentType).filter(rule => 
      rule.type === 'warning' && rule.enabled
    );
  }

  /**
   * Get validation metrics
   */
  getMetrics(): ValidationMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear validation result cache
   */
  clearCache(): void {
    this.resultCache.clear();
    this.logDebug('Validation result cache cleared');
  }

  /**
   * Execute validation with rule dependency resolution
   */
  private async executeValidation(
    data: any,
    rules: ValidationRule[],
    context: ValidationContext
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const operationId = context.operationId;
    
    // Check cache first
    const cacheKey = this.generateCacheKey(data, rules, context);
    const cachedResult = this.resultCache.get(cacheKey);
    if (cachedResult && this.isCacheValid(cachedResult)) {
      this.logDebug(`Validation result retrieved from cache: ${operationId}`);
      return cachedResult;
    }

    const result: ValidationResult = {
      isValid: true,
      canProceed: true,
      errors: [],
      warnings: [],
      executionTime: 0,
      rulesExecuted: [],
      rulesFailed: [],
      rulesSkipped: []
    };

    try {
      // Sort rules by priority and resolve dependencies
      const sortedRules = this.resolveDependencies(rules);
      
      // Execute rules in dependency order
      for (const rule of sortedRules) {
        if (!this.isValidationEnabled(rule.name)) {
          result.rulesSkipped.push(rule.name);
          continue;
        }

        const ruleResult = await this.executeRule(rule, data, context);
        result.rulesExecuted.push(rule.name);

        if (ruleResult.skipped) {
          result.rulesSkipped.push(rule.name);
          continue;
        }

        if (!ruleResult.passed) {
          result.rulesFailed.push(rule.name);
          
          if (ruleResult.error) {
            result.errors.push(ruleResult.error);
            if (rule.type === 'critical') {
              result.isValid = false;
              // Check if graceful degradation is enabled
              const globalConfig = this.configManager.getGlobalConfig();
              result.canProceed = globalConfig.enableGracefulDegradation;
            }
          }
          
          if (ruleResult.warning) {
            result.warnings.push(ruleResult.warning);
          }
        }

        // Update metrics
        this.updateRuleMetrics(rule.name, ruleResult);
      }

      // Cache result if enabled
      if (this.shouldCacheResult(result)) {
        this.resultCache.set(cacheKey, result);
      }

    } catch (error) {
      this.logError('Validation execution failed', error);
      result.isValid = false;
      result.canProceed = false;
      result.errors.push({
        ruleName: 'SYSTEM',
        type: 'critical',
        code: 'VALIDATION_SYSTEM_ERROR',
        message: 'Validierungssystem-Fehler aufgetreten',
        context: { error: error.message },
        timestamp: new Date()
      });
    } finally {
      result.executionTime = Date.now() - startTime;
      this.updateGlobalMetrics(result);
    }

    this.logDebug(`Validation completed: ${operationId}`, {
      rulesExecuted: result.rulesExecuted.length,
      rulesFailed: result.rulesFailed.length,
      executionTime: result.executionTime
    });

    return result;
  }

  /**
   * Execute a single validation rule
   */
  private async executeRule(
    rule: ValidationRule,
    data: any,
    context: ValidationContext
  ): Promise<RuleExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Check dependencies
      if (rule.dependencies && rule.dependencies.length > 0) {
        const dependencyCheck = this.checkDependencies(rule.name);
        if (!dependencyCheck.canExecute) {
          return {
            ruleName: rule.name,
            passed: false,
            executionTime: Date.now() - startTime,
            skipped: true,
            skipReason: dependencyCheck.reason
          };
        }
      }

      // Execute validator
      const passed = await rule.validator(data, context);
      
      const result: RuleExecutionResult = {
        ruleName: rule.name,
        passed,
        executionTime: Date.now() - startTime
      };

      if (!passed) {
        const errorDetails = {
          ruleName: rule.name,
          type: rule.type,
          code: this.generateErrorCode(rule.name),
          message: this.getLocalizedMessage(rule.message, rule.messageKey),
          timestamp: new Date()
        };

        if (rule.type === 'critical') {
          result.error = errorDetails as ValidationError;
        } else {
          result.warning = errorDetails as ValidationWarning;
        }
      }

      return result;

    } catch (error) {
      this.logError(`Rule execution failed: ${rule.name}`, error);
      
      return {
        ruleName: rule.name,
        passed: false,
        executionTime: Date.now() - startTime,
        error: {
          ruleName: rule.name,
          type: 'critical',
          code: 'RULE_EXECUTION_ERROR',
          message: `Validierungsregel-Fehler: ${error.message}`,
          context: { originalError: error.message },
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * Resolve rule dependencies and return sorted execution order
   */
  private resolveDependencies(rules: ValidationRule[]): ValidationRule[] {
    // Simple topological sort for dependency resolution
    const sorted: ValidationRule[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (rule: ValidationRule) => {
      if (visiting.has(rule.name)) {
        throw new Error(`Circular dependency detected involving rule: ${rule.name}`);
      }
      
      if (visited.has(rule.name)) {
        return;
      }

      visiting.add(rule.name);

      // Visit dependencies first
      if (rule.dependencies) {
        for (const depName of rule.dependencies) {
          const depRule = rules.find(r => r.name === depName);
          if (depRule) {
            visit(depRule);
          }
        }
      }

      visiting.delete(rule.name);
      visited.add(rule.name);
      sorted.push(rule);
    };

    // Sort by priority first, then resolve dependencies
    const prioritySorted = [...rules].sort((a, b) => (a.priority || 100) - (b.priority || 100));
    
    for (const rule of prioritySorted) {
      if (!visited.has(rule.name)) {
        visit(rule);
      }
    }

    return sorted;
  }

  /**
   * Check if rule dependencies are satisfied
   */
  private checkDependencies(ruleName: string): { canExecute: boolean; reason?: string } {
    const node = this.dependencyGraph.get(ruleName);
    if (!node || !node.dependencies.length) {
      return { canExecute: true };
    }

    for (const depName of node.dependencies) {
      const depNode = this.dependencyGraph.get(depName);
      if (!depNode || !depNode.executed || !depNode.result?.passed) {
        return {
          canExecute: false,
          reason: `Dependency ${depName} not satisfied`
        };
      }
    }

    return { canExecute: true };
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Required field validation
    this.registerRule({
      name: 'required-field',
      type: 'critical',
      validator: (data: any, context?: ValidationContext) => {
        // This is a generic rule - specific implementations should override
        return data !== null && data !== undefined && data !== '';
      },
      message: DEFAULT_MESSAGES.REQUIRED_FIELD,
      enabled: true,
      priority: 1
    });

    // Duplicate value validation
    this.registerRule({
      name: 'duplicate-check',
      type: 'warning',
      validator: async (data: any, context?: ValidationContext) => {
        // Generic duplicate check - specific implementations should override
        return true; // Default to pass
      },
      message: DEFAULT_MESSAGES.DUPLICATE_VALUE,
      enabled: true,
      priority: 10,
      async: true
    });

    this.logDebug('Default validation rules initialized');
  }

  /**
   * Validate rule structure
   */
  private validateRuleStructure(rule: ValidationRule): void {
    if (!rule.name || typeof rule.name !== 'string') {
      throw new Error('Rule name is required and must be a string');
    }
    
    if (!['critical', 'warning'].includes(rule.type)) {
      throw new Error('Rule type must be either "critical" or "warning"');
    }
    
    if (typeof rule.validator !== 'function') {
      throw new Error('Rule validator must be a function');
    }
    
    if (!rule.message || typeof rule.message !== 'string') {
      throw new Error('Rule message is required and must be a string');
    }
  }

  /**
   * Update dependency graph when rule is added
   */
  private updateDependencyGraph(rule: ValidationRule): void {
    const node: RuleDependencyNode = {
      rule,
      dependencies: rule.dependencies || [],
      dependents: [],
      executed: false
    };

    this.dependencyGraph.set(rule.name, node);

    // Update dependents for dependency rules
    if (rule.dependencies) {
      for (const depName of rule.dependencies) {
        const depNode = this.dependencyGraph.get(depName);
        if (depNode) {
          depNode.dependents.push(rule.name);
        }
      }
    }
  }

  /**
   * Rebuild entire dependency graph
   */
  private rebuildDependencyGraph(): void {
    this.dependencyGraph.clear();
    for (const rule of this.rules.values()) {
      this.updateDependencyGraph(rule);
    }
  }

  /**
   * Generate cache key for validation result
   */
  private generateCacheKey(data: any, rules: ValidationRule[], context: ValidationContext): string {
    const dataHash = this.hashObject(data);
    const rulesHash = this.hashObject(rules.map(r => r.name).sort());
    const contextHash = this.hashObject({
      contentType: context.contentType,
      operation: context.operation
    });
    
    return `${dataHash}-${rulesHash}-${contextHash}`;
  }

  /**
   * Simple object hashing for cache keys
   */
  private hashObject(obj: any): string {
    return Buffer.from(JSON.stringify(obj)).toString('base64').substring(0, 16);
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(result: ValidationResult): boolean {
    // Cache is valid for 5 minutes
    const cacheAge = Date.now() - result.executionTime;
    return cacheAge < 5 * 60 * 1000;
  }

  /**
   * Determine if result should be cached
   */
  private shouldCacheResult(result: ValidationResult): boolean {
    // Cache successful validations and warning-only results
    return result.isValid || result.errors.length === 0;
  }

  /**
   * Generate error code from rule name
   */
  private generateErrorCode(ruleName: string): string {
    return ruleName.toUpperCase().replace(/-/g, '_');
  }

  /**
   * Get localized message (placeholder for future localization)
   */
  private getLocalizedMessage(message: string, messageKey?: string): string {
    // For now, return the message as-is
    // Future implementation could use messageKey for localization
    return message;
  }

  /**
   * Initialize metrics structure
   */
  private initializeMetrics(): ValidationMetrics {
    return {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      averageExecutionTime: 0,
      ruleMetrics: {}
    };
  }

  /**
   * Update metrics for a specific rule
   */
  private updateRuleMetrics(ruleName: string, result: RuleExecutionResult): void {
    if (!this.metrics.ruleMetrics[ruleName]) {
      this.metrics.ruleMetrics[ruleName] = {
        executions: 0,
        failures: 0,
        averageTime: 0
      };
    }

    const ruleMetrics = this.metrics.ruleMetrics[ruleName];
    ruleMetrics.executions++;
    
    if (!result.passed) {
      ruleMetrics.failures++;
    }

    // Update average execution time
    ruleMetrics.averageTime = 
      (ruleMetrics.averageTime * (ruleMetrics.executions - 1) + result.executionTime) / 
      ruleMetrics.executions;
  }

  /**
   * Update global validation metrics
   */
  private updateGlobalMetrics(result: ValidationResult): void {
    this.metrics.totalValidations++;
    
    if (result.isValid) {
      this.metrics.successfulValidations++;
    } else {
      this.metrics.failedValidations++;
    }

    // Update average execution time
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (this.metrics.totalValidations - 1) + result.executionTime) / 
      this.metrics.totalValidations;
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[ValidationService] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[ValidationService] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[ValidationService] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[ValidationService] ${message}`, error);
  }

  /**
   * Static helper methods for backward compatibility
   */
  static createErrorResponse(message: string, details?: any): any {
    return {
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    };
  }

  static validateRequiredWithDetails(data: any, requiredFields: string[]): any {
    const errors: string[] = [];
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`Field '${field}' is required`);
      }
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static formatErrorResponse(errors: string[]): string {
    return errors.join('; ');
  }

  static validateRequired(data: any, requiredFields: string[]): string[] {
    const errors: string[] = [];
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        errors.push(`Field '${field}' is required`);
      }
    }
    return errors;
  }

  static async validateUnique(contentType: string, field: string, value: any, strapi: any, excludeId?: number): Promise<boolean> {
    try {
      const query: any = { [field]: value };
      if (excludeId) {
        query.id = { $ne: excludeId };
      }
      
      const existing = await strapi.entityService.findMany(contentType, {
        filters: query,
        limit: 1
      });
      
      return !existing || existing.length === 0;
    } catch (error) {
      console.error('Error in validateUnique:', error);
      return false;
    }
  }

  static validateDateRange(startDate: Date, endDate: Date): string[] {
    const errors: string[] = [];
    if (startDate >= endDate) {
      errors.push('Start date must be before end date');
    }
    return errors;
  }

  static validateEnum(value: any, allowedValues: any[]): boolean {
    return allowedValues.includes(value);
  }
}

/**
 * Singleton validation service instance
 */
let validationServiceInstance: ValidationService | null = null;

/**
 * Get or create validation service instance
 */
export function getValidationService(
  strapi?: any,
  configManager?: HookConfigurationManager
): ValidationService {
  if (!validationServiceInstance && strapi) {
    validationServiceInstance = new ValidationService(strapi, configManager);
  }
  
  if (!validationServiceInstance) {
    throw new Error('ValidationService not initialized. Call with strapi instance first.');
  }
  
  return validationServiceInstance;
}

/**
 * Initialize validation service with strapi instance
 */
export function initializeValidationService(
  strapi: any,
  configManager?: HookConfigurationManager
): ValidationService {
  validationServiceInstance = new ValidationService(strapi, configManager);
  return validationServiceInstance;
}

/**
 * Reset validation service instance (mainly for testing)
 */
export function resetValidationService(): void {
  validationServiceInstance = null;
}

export default ValidationService;
export type {
  ValidationRule,
  ValidationError,
  ValidationWarning,
  ValidationResult,
  RuleExecutionResult,
  ValidationMetrics
};