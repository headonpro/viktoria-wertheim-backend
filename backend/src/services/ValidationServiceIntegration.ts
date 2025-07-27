/**
 * Validation Service Integration
 * 
 * Integrates all validation components (ValidationService, ValidationRuleManager, 
 * ValidationResultHandler, ValidationResultFormatter) into a unified interface
 * for use in lifecycle hooks and other parts of the application.
 */

import { ValidationService, ValidationContext, ValidationResult, getValidationService } from './ValidationService';
import { ValidationRuleManager, getValidationRuleManager } from './validation-rules/ValidationRuleManager';
import { ValidationResultHandler, getValidationResultHandler, FormattedValidationResult } from './validation-results/ValidationResultHandler';
import { ValidationResultFormatter, ApiValidationResponse, AdminValidationDisplay, LogValidationEntry } from './validation-results/ValidationResultFormatter';

/**
 * Integrated validation options
 */
interface ValidationOptions {
  contentType: string;
  operation: 'create' | 'update' | 'delete';
  data: any;
  existingData?: any;
  userId?: number;
  language?: string;
  skipCache?: boolean;
  rulesOnly?: string[]; // Only run specific rules
  skipRules?: string[]; // Skip specific rules
}

/**
 * Validation integration result
 */
interface IntegratedValidationResult {
  raw: ValidationResult;
  formatted: FormattedValidationResult;
  api: ApiValidationResponse;
  admin: AdminValidationDisplay;
  log: LogValidationEntry;
  canProceed: boolean;
  shouldBlock: boolean;
  strapiError?: Error;
}

/**
 * Validation Service Integration Class
 */
export class ValidationServiceIntegration {
  private strapi: any;
  private validationService: ValidationService;
  private ruleManager: ValidationRuleManager;
  private resultHandler: ValidationResultHandler;
  private resultFormatter: ValidationResultFormatter;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.validationService = getValidationService(strapi);
    this.ruleManager = getValidationRuleManager(strapi);
    this.resultHandler = getValidationResultHandler(strapi);
    this.resultFormatter = new ValidationResultFormatter(strapi);
  }

  /**
   * Perform complete validation with all processing
   */
  async validateComplete(options: ValidationOptions): Promise<IntegratedValidationResult> {
    const operationId = this.generateOperationId(options.contentType, options.operation);
    
    // Create validation context
    const context: ValidationContext = {
      contentType: options.contentType,
      operation: options.operation,
      existingData: options.existingData,
      strapi: this.strapi,
      userId: options.userId,
      operationId
    };

    try {
      // Get rules for content type
      let rules = this.ruleManager.getRulesForContentType(options.contentType);
      
      // Filter rules if specified
      if (options.rulesOnly) {
        rules = rules.filter(rule => options.rulesOnly!.includes(rule.name));
      }
      
      if (options.skipRules) {
        rules = rules.filter(rule => !options.skipRules!.includes(rule.name));
      }

      // Perform validation
      const rawResult = await this.validationService.validateAll(
        options.data,
        options.contentType,
        context
      );

      // Process and format results
      const formattedResult = this.resultHandler.processValidationResult(
        rawResult,
        options.contentType,
        options.operation,
        operationId,
        options.language || 'de'
      );

      // Create different output formats
      const apiResult = this.resultFormatter.formatForApi(
        formattedResult,
        options.data,
        options.language || 'de'
      );

      const adminResult = this.resultFormatter.formatForAdmin(
        formattedResult,
        options.language || 'de'
      );

      const logResult = this.resultFormatter.formatForLog(formattedResult);

      // Determine if operation should be blocked
      const shouldBlock = !formattedResult.canProceed;
      const strapiError = shouldBlock ? 
        this.resultFormatter.formatForStrapiError(formattedResult) : undefined;

      // Log the validation result
      this.logValidationResult(logResult);

      return {
        raw: rawResult,
        formatted: formattedResult,
        api: apiResult,
        admin: adminResult,
        log: logResult,
        canProceed: formattedResult.canProceed,
        shouldBlock,
        strapiError
      };

    } catch (error) {
      this.strapi.log.error('Validation integration failed:', error);
      
      // Create error result
      const errorResult = this.createErrorResult(error, options, operationId);
      return errorResult;
    }
  }

  /**
   * Validate for lifecycle hooks (simplified interface)
   */
  async validateForHook(
    contentType: string,
    operation: 'create' | 'update' | 'delete',
    data: any,
    existingData?: any
  ): Promise<{ canProceed: boolean; error?: Error; warnings?: string[] }> {
    try {
      const result = await this.validateComplete({
        contentType,
        operation,
        data,
        existingData
      });

      const warnings = result.formatted.warnings.map(w => w.message.de);

      return {
        canProceed: result.canProceed,
        error: result.strapiError,
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      this.strapi.log.error('Hook validation failed:', error);
      return {
        canProceed: false,
        error: new Error('Validierungssystem-Fehler aufgetreten')
      };
    }
  }

  /**
   * Validate critical rules only (for performance-sensitive operations)
   */
  async validateCriticalOnly(options: ValidationOptions): Promise<IntegratedValidationResult> {
    const operationId = this.generateOperationId(options.contentType, options.operation);
    
    const context: ValidationContext = {
      contentType: options.contentType,
      operation: options.operation,
      existingData: options.existingData,
      strapi: this.strapi,
      userId: options.userId,
      operationId
    };

    try {
      // Only run critical validations
      const rawResult = await this.validationService.validateCritical(
        options.data,
        options.contentType,
        context
      );

      // Process results (same as complete validation)
      return await this.processValidationResult(rawResult, options, operationId);

    } catch (error) {
      return this.createErrorResult(error, options, operationId);
    }
  }

  /**
   * Validate warnings only (for background processing)
   */
  async validateWarningsOnly(options: ValidationOptions): Promise<IntegratedValidationResult> {
    const operationId = this.generateOperationId(options.contentType, options.operation);
    
    const context: ValidationContext = {
      contentType: options.contentType,
      operation: options.operation,
      existingData: options.existingData,
      strapi: this.strapi,
      userId: options.userId,
      operationId
    };

    try {
      // Only run warning validations
      const rawResult = await this.validationService.validateWarning(
        options.data,
        options.contentType,
        context
      );

      // Process results
      return await this.processValidationResult(rawResult, options, operationId);

    } catch (error) {
      return this.createErrorResult(error, options, operationId);
    }
  }

  /**
   * Get validation rules for content type
   */
  getValidationRules(contentType: string) {
    return this.ruleManager.getRulesForContentType(contentType);
  }

  /**
   * Enable or disable validation rule
   */
  setRuleEnabled(contentType: string, ruleName: string, enabled: boolean): boolean {
    return this.ruleManager.setRuleEnabled(contentType, ruleName, enabled);
  }

  /**
   * Get validation statistics
   */
  getValidationStatistics() {
    return {
      rules: this.ruleManager.getValidationStatistics(),
      service: this.validationService.getMetrics(),
      cache: this.resultHandler.getCacheStatistics()
    };
  }

  /**
   * Clear validation caches
   */
  clearCaches(): void {
    this.validationService.clearCache();
    this.resultHandler.clearCache();
    this.strapi.log.info('Validation caches cleared');
  }

  /**
   * Process validation result into all formats
   */
  private async processValidationResult(
    rawResult: ValidationResult,
    options: ValidationOptions,
    operationId: string
  ): Promise<IntegratedValidationResult> {
    const formattedResult = this.resultHandler.processValidationResult(
      rawResult,
      options.contentType,
      options.operation,
      operationId,
      options.language || 'de'
    );

    const apiResult = this.resultFormatter.formatForApi(
      formattedResult,
      options.data,
      options.language || 'de'
    );

    const adminResult = this.resultFormatter.formatForAdmin(
      formattedResult,
      options.language || 'de'
    );

    const logResult = this.resultFormatter.formatForLog(formattedResult);

    const shouldBlock = !formattedResult.canProceed;
    const strapiError = shouldBlock ? 
      this.resultFormatter.formatForStrapiError(formattedResult) : undefined;

    this.logValidationResult(logResult);

    return {
      raw: rawResult,
      formatted: formattedResult,
      api: apiResult,
      admin: adminResult,
      log: logResult,
      canProceed: formattedResult.canProceed,
      shouldBlock,
      strapiError
    };
  }

  /**
   * Create error result for system failures
   */
  private createErrorResult(
    error: any,
    options: ValidationOptions,
    operationId: string
  ): IntegratedValidationResult {
    const errorMessage = error.message || 'Unbekannter Validierungsfehler';
    
    const rawResult: ValidationResult = {
      isValid: false,
      canProceed: false,
      errors: [{
        ruleName: 'SYSTEM',
        type: 'critical',
        code: 'VALIDATION_SYSTEM_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }],
      warnings: [],
      executionTime: 0,
      rulesExecuted: [],
      rulesFailed: ['SYSTEM'],
      rulesSkipped: []
    };

    const formattedResult: FormattedValidationResult = {
      isValid: false,
      canProceed: false,
      summary: {
        totalErrors: 1,
        criticalErrors: 1,
        warnings: 0,
        executionTime: 0,
        rulesExecuted: 0
      },
      errors: [{
        ruleName: 'SYSTEM',
        type: 'critical',
        code: 'VALIDATION_SYSTEM_ERROR',
        message: {
          de: errorMessage,
          key: 'VALIDATION_SYSTEM_ERROR'
        },
        timestamp: new Date()
      }],
      warnings: [],
      metadata: {
        timestamp: new Date(),
        contentType: options.contentType,
        operation: options.operation,
        operationId
      }
    };

    const apiResult = this.resultFormatter.formatForApi(formattedResult, options.data);
    const adminResult = this.resultFormatter.formatForAdmin(formattedResult);
    const logResult = this.resultFormatter.formatForLog(formattedResult);
    const strapiError = new Error(errorMessage);

    this.logValidationResult(logResult);

    return {
      raw: rawResult,
      formatted: formattedResult,
      api: apiResult,
      admin: adminResult,
      log: logResult,
      canProceed: false,
      shouldBlock: true,
      strapiError
    };
  }

  /**
   * Log validation result
   */
  private logValidationResult(logResult: LogValidationEntry): void {
    const { level, message, context } = logResult;
    
    switch (level) {
      case 'error':
        this.strapi.log.error(message, context);
        break;
      case 'warn':
        this.strapi.log.warn(message, context);
        break;
      case 'info':
        this.strapi.log.info(message, context);
        break;
      case 'debug':
        this.strapi.log.debug(message, context);
        break;
    }
  }

  /**
   * Generate operation ID
   */
  private generateOperationId(contentType: string, operation: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${contentType.replace('api::', '').replace('.', '-')}-${operation}-${timestamp}-${random}`;
  }
}

/**
 * Singleton validation service integration instance
 */
let validationServiceIntegrationInstance: ValidationServiceIntegration | null = null;

/**
 * Get or create validation service integration instance
 */
export function getValidationServiceIntegration(strapi?: any): ValidationServiceIntegration {
  if (!validationServiceIntegrationInstance && strapi) {
    validationServiceIntegrationInstance = new ValidationServiceIntegration(strapi);
  }
  
  if (!validationServiceIntegrationInstance) {
    throw new Error('ValidationServiceIntegration not initialized. Call with strapi instance first.');
  }
  
  return validationServiceIntegrationInstance;
}

/**
 * Initialize validation service integration with strapi instance
 */
export function initializeValidationServiceIntegration(strapi: any): ValidationServiceIntegration {
  validationServiceIntegrationInstance = new ValidationServiceIntegration(strapi);
  return validationServiceIntegrationInstance;
}

/**
 * Reset validation service integration instance (mainly for testing)
 */
export function resetValidationServiceIntegration(): void {
  validationServiceIntegrationInstance = null;
}

export default ValidationServiceIntegration;
export type { ValidationOptions, IntegratedValidationResult };