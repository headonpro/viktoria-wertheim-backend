/**
 * Configuration Validator
 * 
 * Validates hook configuration against defined schemas with detailed
 * error reporting and version compatibility checking.
 * 
 * Requirements: 6.1, 6.3
 */

import {
  ConfigurationSchema,
  ConfigurationSchemaField,
  HookConfiguration,
  FactoryConfiguration,
  ContentTypeConfiguration,
  FeatureFlagsConfiguration,
  HookSystemConfiguration,
  getConfigurationSchema,
  CONFIGURATION_MIGRATIONS
} from './HookConfigurationSchema';

/**
 * Validation result with detailed error information
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
  expectedType?: string;
  allowedValues?: any[];
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: any;
  suggestion?: string;
}

/**
 * Validation suggestion
 */
export interface ValidationSuggestion {
  field: string;
  message: string;
  suggestedValue: any;
  reason: string;
}

/**
 * Configuration Validator Class
 */
export class ConfigurationValidator {
  private schemas: Map<string, ConfigurationSchema> = new Map();

  constructor() {
    // Load all schemas
    this.schemas.set('hook', getConfigurationSchema('hook'));
    this.schemas.set('factory', getConfigurationSchema('factory'));
    this.schemas.set('contentType', getConfigurationSchema('contentType'));
    this.schemas.set('featureFlags', getConfigurationSchema('featureFlags'));
  }

  /**
   * Validate hook configuration
   */
  validateHookConfiguration(config: Partial<HookConfiguration>): ValidationResult {
    const schema = this.schemas.get('hook')!;
    return this.validateAgainstSchema(config, schema, 'hook');
  }

  /**
   * Validate factory configuration
   */
  validateFactoryConfiguration(config: Partial<FactoryConfiguration>): ValidationResult {
    const schema = this.schemas.get('factory')!;
    return this.validateAgainstSchema(config, schema, 'factory');
  }

  /**
   * Validate content type configuration
   */
  validateContentTypeConfiguration(config: Partial<ContentTypeConfiguration>): ValidationResult {
    const schema = this.schemas.get('contentType')!;
    return this.validateAgainstSchema(config, schema, 'contentType');
  }

  /**
   * Validate feature flags configuration
   */
  validateFeatureFlagsConfiguration(config: Partial<FeatureFlagsConfiguration>): ValidationResult {
    const schema = this.schemas.get('featureFlags')!;
    return this.validateAgainstSchema(config, schema, 'featureFlags');
  }

  /**
   * Validate complete system configuration
   */
  validateSystemConfiguration(config: Partial<HookSystemConfiguration>): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Validate version compatibility
    if (config.version) {
      const versionValidation = this.validateVersion(config.version);
      result.errors.push(...versionValidation.errors);
      result.warnings.push(...versionValidation.warnings);
      result.suggestions.push(...versionValidation.suggestions);
    }

    // Validate global configuration
    if (config.global) {
      const globalValidation = this.validateHookConfiguration(config.global);
      this.prefixValidationResults(globalValidation, 'global', result);
    }

    // Validate factory configuration
    if (config.factory) {
      const factoryValidation = this.validateFactoryConfiguration(config.factory);
      this.prefixValidationResults(factoryValidation, 'factory', result);
    }

    // Validate content type configurations
    if (config.contentTypes) {
      for (const [contentType, contentTypeConfig] of Object.entries(config.contentTypes)) {
        const contentTypeValidation = this.validateContentTypeConfiguration(contentTypeConfig);
        this.prefixValidationResults(contentTypeValidation, `contentTypes.${contentType}`, result);
      }
    }

    // Validate feature flags
    if (config.featureFlags) {
      const featureFlagsValidation = this.validateFeatureFlagsConfiguration(config.featureFlags);
      this.prefixValidationResults(featureFlagsValidation, 'featureFlags', result);
    }

    // Validate cross-configuration dependencies
    const dependencyValidation = this.validateConfigurationDependencies(config);
    result.errors.push(...dependencyValidation.errors);
    result.warnings.push(...dependencyValidation.warnings);
    result.suggestions.push(...dependencyValidation.suggestions);

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate configuration against schema
   */
  private validateAgainstSchema(
    config: any,
    schema: ConfigurationSchema,
    configType: string
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Check for unknown fields
    for (const fieldName of Object.keys(config)) {
      if (!schema.fields[fieldName]) {
        result.warnings.push({
          field: fieldName,
          message: `Unknown configuration field '${fieldName}' for ${configType} configuration`,
          code: 'UNKNOWN_FIELD',
          value: config[fieldName],
          suggestion: this.suggestSimilarField(fieldName, Object.keys(schema.fields))
        });
      }
    }

    // Validate each field
    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
      const fieldValue = config[fieldName];
      const fieldValidation = this.validateField(fieldName, fieldValue, fieldSchema);
      
      result.errors.push(...fieldValidation.errors);
      result.warnings.push(...fieldValidation.warnings);
      result.suggestions.push(...fieldValidation.suggestions);
    }

    // Check for required fields
    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
      if (fieldSchema.required && !(fieldName in config)) {
        result.errors.push({
          field: fieldName,
          message: `Required field '${fieldName}' is missing`,
          code: 'REQUIRED_FIELD_MISSING',
          expectedType: fieldSchema.type
        });
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate individual field
   */
  private validateField(
    fieldName: string,
    value: any,
    schema: ConfigurationSchemaField
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Skip validation if field is undefined and not required
    if (value === undefined) {
      if (schema.required) {
        result.errors.push({
          field: fieldName,
          message: `Required field '${fieldName}' is missing`,
          code: 'REQUIRED_FIELD_MISSING',
          expectedType: schema.type
        });
      }
      return result;
    }

    // Type validation
    if (!this.validateType(value, schema.type)) {
      result.errors.push({
        field: fieldName,
        message: `Field '${fieldName}' must be of type ${schema.type}`,
        code: 'INVALID_TYPE',
        value,
        expectedType: schema.type
      });
      return result; // Skip further validation if type is wrong
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      result.errors.push({
        field: fieldName,
        message: `Field '${fieldName}' must be one of: ${schema.enum.join(', ')}`,
        code: 'INVALID_ENUM_VALUE',
        value,
        allowedValues: schema.enum
      });
    }

    // Range validation for numbers
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        result.errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be at least ${schema.min}`,
          code: 'VALUE_TOO_SMALL',
          value
        });
      }
      if (schema.max !== undefined && value > schema.max) {
        result.errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be at most ${schema.max}`,
          code: 'VALUE_TOO_LARGE',
          value
        });
      }
    }

    // String length validation
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        result.errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be at least ${schema.minLength} characters long`,
          code: 'STRING_TOO_SHORT',
          value
        });
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        result.errors.push({
          field: fieldName,
          message: `Field '${fieldName}' must be at most ${schema.maxLength} characters long`,
          code: 'STRING_TOO_LONG',
          value
        });
      }
    }

    // Pattern validation for strings
    if (schema.type === 'string' && typeof value === 'string' && schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        result.errors.push({
          field: fieldName,
          message: `Field '${fieldName}' does not match required pattern`,
          code: 'PATTERN_MISMATCH',
          value
        });
      }
    }

    // Object validation
    if (schema.type === 'object' && schema.properties) {
      const objectValidation = this.validateObjectProperties(fieldName, value, schema.properties);
      result.errors.push(...objectValidation.errors);
      result.warnings.push(...objectValidation.warnings);
      result.suggestions.push(...objectValidation.suggestions);
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value) && schema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemValidation = this.validateField(`${fieldName}[${i}]`, value[i], schema.items);
        result.errors.push(...itemValidation.errors);
        result.warnings.push(...itemValidation.warnings);
        result.suggestions.push(...itemValidation.suggestions);
      }
    }

    // Deprecation warning
    if (schema.deprecated) {
      result.warnings.push({
        field: fieldName,
        message: `Field '${fieldName}' is deprecated and may be removed in future versions`,
        code: 'DEPRECATED_FIELD',
        value
      });
    }

    // Performance suggestions
    const performanceSuggestion = this.getPerformanceSuggestion(fieldName, value, schema);
    if (performanceSuggestion) {
      result.suggestions.push(performanceSuggestion);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate object properties
   */
  private validateObjectProperties(
    parentField: string,
    obj: any,
    properties: Record<string, ConfigurationSchemaField>
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    for (const [propName, propSchema] of Object.entries(properties)) {
      const propValue = obj[propName];
      const propValidation = this.validateField(`${parentField}.${propName}`, propValue, propSchema);
      
      result.errors.push(...propValidation.errors);
      result.warnings.push(...propValidation.warnings);
      result.suggestions.push(...propValidation.suggestions);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate configuration version
   */
  private validateVersion(version: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Check if version is supported
    const supportedVersions = ['1.0.0'];
    if (!supportedVersions.includes(version)) {
      result.warnings.push({
        field: 'version',
        message: `Configuration version '${version}' is not officially supported`,
        code: 'UNSUPPORTED_VERSION',
        value: version,
        suggestion: `Consider upgrading to version ${supportedVersions[supportedVersions.length - 1]}`
      });
    }

    // Check if migration is available
    const availableMigrations = CONFIGURATION_MIGRATIONS.filter(m => m.fromVersion === version);
    if (availableMigrations.length > 0) {
      result.suggestions.push({
        field: 'version',
        message: `Migration available from version ${version}`,
        suggestedValue: availableMigrations[0].toVersion,
        reason: availableMigrations[0].description
      });
    }

    return result;
  }

  /**
   * Validate cross-configuration dependencies
   */
  private validateConfigurationDependencies(config: Partial<HookSystemConfiguration>): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Check if background jobs are enabled but async calculations are disabled
    if (config.featureFlags?.enableBackgroundJobs && !config.global?.enableAsyncCalculations) {
      result.warnings.push({
        field: 'global.enableAsyncCalculations',
        message: 'Background jobs are enabled but async calculations are disabled',
        code: 'DEPENDENCY_MISMATCH',
        suggestion: 'Enable async calculations to use background jobs effectively'
      });
    }

    // Check if caching is disabled but validation caching is enabled
    if (!config.global?.enableCaching && config.featureFlags?.enableValidationCaching) {
      result.warnings.push({
        field: 'featureFlags.enableValidationCaching',
        message: 'Validation caching is enabled but global caching is disabled',
        code: 'DEPENDENCY_MISMATCH',
        suggestion: 'Enable global caching or disable validation caching'
      });
    }

    // Check if metrics are disabled but service metrics are enabled
    if (!config.global?.enableMetrics && config.factory?.enableServiceMetrics) {
      result.warnings.push({
        field: 'factory.enableServiceMetrics',
        message: 'Service metrics are enabled but global metrics are disabled',
        code: 'DEPENDENCY_MISMATCH',
        suggestion: 'Enable global metrics or disable service metrics'
      });
    }

    // Performance recommendations
    if (config.global?.maxHookExecutionTime && config.global.maxHookExecutionTime > 200) {
      result.suggestions.push({
        field: 'global.maxHookExecutionTime',
        message: 'Hook execution time is set quite high',
        suggestedValue: 100,
        reason: 'Lower execution times improve user experience'
      });
    }

    return result;
  }

  /**
   * Validate value type
   */
  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * Suggest similar field name for typos
   */
  private suggestSimilarField(fieldName: string, availableFields: string[]): string | undefined {
    const threshold = 0.6;
    let bestMatch = '';
    let bestScore = 0;

    for (const availableField of availableFields) {
      const score = this.calculateSimilarity(fieldName.toLowerCase(), availableField.toLowerCase());
      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = availableField;
      }
    }

    return bestMatch || undefined;
  }

  /**
   * Calculate string similarity (simple Levenshtein-based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Get performance suggestion for field
   */
  private getPerformanceSuggestion(
    fieldName: string,
    value: any,
    schema: ConfigurationSchemaField
  ): ValidationSuggestion | null {
    // Suggest enabling caching for performance
    if (fieldName === 'enableCaching' && value === false) {
      return {
        field: fieldName,
        message: 'Consider enabling caching for better performance',
        suggestedValue: true,
        reason: 'Caching can significantly improve hook execution times'
      };
    }

    // Suggest reasonable timeout values
    if (fieldName.includes('Timeout') && typeof value === 'number' && value > 30000) {
      return {
        field: fieldName,
        message: 'Timeout value seems quite high',
        suggestedValue: Math.min(value, 10000),
        reason: 'Lower timeouts prevent hanging operations'
      };
    }

    // Suggest enabling graceful degradation
    if (fieldName === 'enableGracefulDegradation' && value === false) {
      return {
        field: fieldName,
        message: 'Consider enabling graceful degradation',
        suggestedValue: true,
        reason: 'Graceful degradation improves system stability'
      };
    }

    return null;
  }

  /**
   * Add prefix to validation results
   */
  private prefixValidationResults(
    validation: ValidationResult,
    prefix: string,
    target: ValidationResult
  ): void {
    target.errors.push(...validation.errors.map(error => ({
      ...error,
      field: `${prefix}.${error.field}`
    })));
    
    target.warnings.push(...validation.warnings.map(warning => ({
      ...warning,
      field: `${prefix}.${warning.field}`
    })));
    
    target.suggestions.push(...validation.suggestions.map(suggestion => ({
      ...suggestion,
      field: `${prefix}.${suggestion.field}`
    })));
  }
}

/**
 * Singleton validator instance
 */
let validatorInstance: ConfigurationValidator | null = null;

/**
 * Get configuration validator instance
 */
export function getConfigurationValidator(): ConfigurationValidator {
  if (!validatorInstance) {
    validatorInstance = new ConfigurationValidator();
  }
  return validatorInstance;
}

export default ConfigurationValidator;