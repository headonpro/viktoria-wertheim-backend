/**
 * Hook Configuration Manager
 * 
 * Manages hook configuration with schema validation, environment-specific loading,
 * and runtime configuration updates. Provides centralized configuration management
 * for the hook system.
 */

import { HookConfiguration } from './BaseHookService';
import { FactoryConfiguration } from './HookServiceFactory';

/**
 * Configuration schema definition
 */
interface ConfigurationSchema {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  default?: any;
  enum?: any[];
  min?: number;
  max?: number;
  properties?: Record<string, ConfigurationSchema>;
  items?: ConfigurationSchema;
}

/**
 * Validation result
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Environment-specific configuration
 */
interface EnvironmentConfig {
  development?: Partial<HookConfiguration>;
  staging?: Partial<HookConfiguration>;
  production?: Partial<HookConfiguration>;
  test?: Partial<HookConfiguration>;
}

/**
 * Complete hook system configuration
 */
interface HookSystemConfiguration {
  global: HookConfiguration;
  factory: FactoryConfiguration;
  contentTypes: Record<string, Partial<HookConfiguration>>;
  environments: EnvironmentConfig;
  featureFlags: Record<string, boolean>;
}

/**
 * Configuration change event
 */
interface ConfigurationChangeEvent {
  type: 'global' | 'contentType' | 'factory' | 'featureFlag';
  key: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
}

/**
 * Configuration schema definitions
 */
const HOOK_CONFIG_SCHEMA: Record<string, ConfigurationSchema> = {
  enableStrictValidation: {
    type: 'boolean',
    required: false,
    default: false
  },
  enableAsyncCalculations: {
    type: 'boolean',
    required: false,
    default: true
  },
  maxHookExecutionTime: {
    type: 'number',
    required: false,
    default: 100,
    min: 10,
    max: 5000
  },
  retryAttempts: {
    type: 'number',
    required: false,
    default: 2,
    min: 0,
    max: 10
  },
  enableGracefulDegradation: {
    type: 'boolean',
    required: false,
    default: true
  },
  logLevel: {
    type: 'string',
    required: false,
    default: 'warn',
    enum: ['error', 'warn', 'info', 'debug']
  }
};

const FACTORY_CONFIG_SCHEMA: Record<string, ConfigurationSchema> = {
  enableServiceCaching: {
    type: 'boolean',
    required: false,
    default: true
  },
  maxCacheSize: {
    type: 'number',
    required: false,
    default: 50,
    min: 1,
    max: 1000
  },
  cacheExpirationMs: {
    type: 'number',
    required: false,
    default: 1800000, // 30 minutes
    min: 60000, // 1 minute
    max: 3600000 // 1 hour
  }
};

/**
 * Default configuration values
 */
const DEFAULT_HOOK_SYSTEM_CONFIG: HookSystemConfiguration = {
  global: {
    enableStrictValidation: false,
    enableAsyncCalculations: true,
    maxHookExecutionTime: 100,
    retryAttempts: 2,
    enableGracefulDegradation: true,
    logLevel: 'warn'
  },
  factory: {
    enableServiceCaching: true,
    maxCacheSize: 50,
    cacheExpirationMs: 1800000,
    defaultHookConfig: {
      enableStrictValidation: false,
      enableAsyncCalculations: true,
      maxHookExecutionTime: 100,
      retryAttempts: 2,
      enableGracefulDegradation: true,
      logLevel: 'warn'
    }
  },
  contentTypes: {},
  environments: {
    development: {
      logLevel: 'debug',
      enableStrictValidation: false
    },
    staging: {
      logLevel: 'info',
      enableStrictValidation: false
    },
    production: {
      logLevel: 'warn',
      enableStrictValidation: false,
      maxHookExecutionTime: 50
    },
    test: {
      logLevel: 'error',
      enableStrictValidation: true,
      maxHookExecutionTime: 200
    }
  },
  featureFlags: {
    enableHookMetrics: true,
    enableBackgroundJobs: false,
    enableAdvancedValidation: false,
    enableConfigurationUI: false
  }
};

/**
 * Hook Configuration Manager Class
 */
export class HookConfigurationManager {
  private config: HookSystemConfiguration;
  private strapi: any;
  private environment: string;
  private changeListeners: Array<(event: ConfigurationChangeEvent) => void> = [];
  private configHistory: ConfigurationChangeEvent[] = [];

  constructor(strapi: any, initialConfig?: Partial<HookSystemConfiguration>) {
    this.strapi = strapi;
    this.environment = process.env.NODE_ENV || 'development';
    this.config = this.mergeConfigurations(DEFAULT_HOOK_SYSTEM_CONFIG, initialConfig || {});
    
    // Apply environment-specific configuration
    this.applyEnvironmentConfig();
    
    this.logInfo('HookConfigurationManager initialized', {
      environment: this.environment,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get global hook configuration
   */
  getGlobalConfig(): HookConfiguration {
    return { ...this.config.global };
  }

  /**
   * Get factory configuration
   */
  getFactoryConfig(): FactoryConfiguration {
    return { ...this.config.factory };
  }

  /**
   * Get configuration for specific content type
   */
  getContentTypeConfig(contentType: string): HookConfiguration {
    const globalConfig = this.config.global;
    const contentTypeConfig = this.config.contentTypes[contentType] || {};
    
    return { ...globalConfig, ...contentTypeConfig };
  }

  /**
   * Get feature flag value
   */
  getFeatureFlag(flagName: string): boolean {
    return this.config.featureFlags[flagName] || false;
  }

  /**
   * Get all feature flags
   */
  getAllFeatureFlags(): Record<string, boolean> {
    return { ...this.config.featureFlags };
  }

  /**
   * Update global configuration
   */
  updateGlobalConfig(newConfig: Partial<HookConfiguration>): ValidationResult {
    const validation = this.validateHookConfig(newConfig);
    
    if (!validation.isValid) {
      this.logError('Global configuration validation failed', validation.errors);
      return validation;
    }

    const oldConfig = { ...this.config.global };
    this.config.global = { ...this.config.global, ...newConfig };

    // Emit change events
    for (const [key, value] of Object.entries(newConfig)) {
      this.emitConfigurationChange({
        type: 'global',
        key,
        oldValue: oldConfig[key as keyof HookConfiguration],
        newValue: value,
        timestamp: new Date()
      });
    }

    this.logInfo('Global configuration updated', newConfig);
    return validation;
  }

  /**
   * Update factory configuration
   */
  updateFactoryConfig(newConfig: Partial<FactoryConfiguration>): ValidationResult {
    const validation = this.validateFactoryConfig(newConfig);
    
    if (!validation.isValid) {
      this.logError('Factory configuration validation failed', validation.errors);
      return validation;
    }

    const oldConfig = { ...this.config.factory };
    this.config.factory = { ...this.config.factory, ...newConfig };

    // Emit change events
    for (const [key, value] of Object.entries(newConfig)) {
      this.emitConfigurationChange({
        type: 'factory',
        key,
        oldValue: oldConfig[key as keyof FactoryConfiguration],
        newValue: value,
        timestamp: new Date()
      });
    }

    this.logInfo('Factory configuration updated', newConfig);
    return validation;
  }

  /**
   * Update content type specific configuration
   */
  updateContentTypeConfig(contentType: string, newConfig: Partial<HookConfiguration>): ValidationResult {
    const validation = this.validateHookConfig(newConfig);
    
    if (!validation.isValid) {
      this.logError(`Content type configuration validation failed for ${contentType}`, validation.errors);
      return validation;
    }

    const oldConfig = { ...this.config.contentTypes[contentType] };
    this.config.contentTypes[contentType] = { 
      ...this.config.contentTypes[contentType], 
      ...newConfig 
    };

    // Emit change events
    for (const [key, value] of Object.entries(newConfig)) {
      this.emitConfigurationChange({
        type: 'contentType',
        key: `${contentType}.${key}`,
        oldValue: oldConfig[key as keyof HookConfiguration],
        newValue: value,
        timestamp: new Date()
      });
    }

    this.logInfo(`Content type configuration updated for ${contentType}`, newConfig);
    return validation;
  }

  /**
   * Update feature flag
   */
  updateFeatureFlag(flagName: string, enabled: boolean): void {
    const oldValue = this.config.featureFlags[flagName];
    this.config.featureFlags[flagName] = enabled;

    this.emitConfigurationChange({
      type: 'featureFlag',
      key: flagName,
      oldValue,
      newValue: enabled,
      timestamp: new Date()
    });

    this.logInfo(`Feature flag updated: ${flagName} = ${enabled}`);
  }

  /**
   * Load configuration from file
   */
  async loadConfigurationFromFile(filePath: string): Promise<ValidationResult> {
    try {
      // In a real implementation, you would read from file system
      // For now, we'll simulate loading from environment variables or Strapi config
      const fileConfig = this.loadFromStrapiConfig();
      
      const validation = this.validateFullConfiguration(fileConfig);
      
      if (validation.isValid) {
        this.config = this.mergeConfigurations(this.config, fileConfig);
        this.applyEnvironmentConfig();
        this.logInfo(`Configuration loaded from file: ${filePath}`);
      }
      
      return validation;
      
    } catch (error) {
      this.logError(`Failed to load configuration from file: ${filePath}`, error);
      return {
        isValid: false,
        errors: [`Failed to load configuration: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Save configuration to file
   */
  async saveConfigurationToFile(filePath: string): Promise<boolean> {
    try {
      // In a real implementation, you would write to file system
      // For now, we'll log the configuration that would be saved
      this.logInfo(`Configuration would be saved to: ${filePath}`, this.config);
      return true;
      
    } catch (error) {
      this.logError(`Failed to save configuration to file: ${filePath}`, error);
      return false;
    }
  }

  /**
   * Get configuration history
   */
  getConfigurationHistory(limit: number = 50): ConfigurationChangeEvent[] {
    return this.configHistory.slice(-limit);
  }

  /**
   * Add configuration change listener
   */
  addChangeListener(listener: (event: ConfigurationChangeEvent) => void): void {
    this.changeListeners.push(listener);
  }

  /**
   * Remove configuration change listener
   */
  removeChangeListener(listener: (event: ConfigurationChangeEvent) => void): void {
    const index = this.changeListeners.indexOf(listener);
    if (index > -1) {
      this.changeListeners.splice(index, 1);
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    const oldConfig = { ...this.config };
    this.config = { ...DEFAULT_HOOK_SYSTEM_CONFIG };
    this.applyEnvironmentConfig();

    this.emitConfigurationChange({
      type: 'global',
      key: 'reset',
      oldValue: oldConfig,
      newValue: this.config,
      timestamp: new Date()
    });

    this.logInfo('Configuration reset to defaults');
  }

  /**
   * Validate hook configuration
   */
  private validateHookConfig(config: Partial<HookConfiguration>): ValidationResult {
    return this.validateAgainstSchema(config, HOOK_CONFIG_SCHEMA);
  }

  /**
   * Validate factory configuration
   */
  private validateFactoryConfig(config: Partial<FactoryConfiguration>): ValidationResult {
    return this.validateAgainstSchema(config, FACTORY_CONFIG_SCHEMA);
  }

  /**
   * Validate full configuration
   */
  private validateFullConfiguration(config: Partial<HookSystemConfiguration>): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validate global config
    if (config.global) {
      const globalValidation = this.validateHookConfig(config.global);
      result.errors.push(...globalValidation.errors);
      result.warnings.push(...globalValidation.warnings);
    }

    // Validate factory config
    if (config.factory) {
      const factoryValidation = this.validateFactoryConfig(config.factory);
      result.errors.push(...factoryValidation.errors);
      result.warnings.push(...factoryValidation.warnings);
    }

    // Validate content type configs
    if (config.contentTypes) {
      for (const [contentType, contentTypeConfig] of Object.entries(config.contentTypes)) {
        const contentTypeValidation = this.validateHookConfig(contentTypeConfig);
        result.errors.push(...contentTypeValidation.errors.map(e => `${contentType}: ${e}`));
        result.warnings.push(...contentTypeValidation.warnings.map(w => `${contentType}: ${w}`));
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate configuration against schema
   */
  private validateAgainstSchema(config: any, schema: Record<string, ConfigurationSchema>): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    for (const [key, value] of Object.entries(config)) {
      const fieldSchema = schema[key];
      
      if (!fieldSchema) {
        result.warnings.push(`Unknown configuration field: ${key}`);
        continue;
      }

      const fieldValidation = this.validateField(key, value, fieldSchema);
      result.errors.push(...fieldValidation.errors);
      result.warnings.push(...fieldValidation.warnings);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate individual field
   */
  private validateField(key: string, value: any, schema: ConfigurationSchema): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Type validation
    if (!this.validateType(value, schema.type)) {
      result.errors.push(`${key} must be of type ${schema.type}`);
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      result.errors.push(`${key} must be one of: ${schema.enum.join(', ')}`);
    }

    // Range validation for numbers
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        result.errors.push(`${key} must be at least ${schema.min}`);
      }
      if (schema.max !== undefined && value > schema.max) {
        result.errors.push(`${key} must be at most ${schema.max}`);
      }
    }

    result.isValid = result.errors.length === 0;
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
   * Merge configurations
   */
  private mergeConfigurations(
    base: HookSystemConfiguration, 
    override: Partial<HookSystemConfiguration>
  ): HookSystemConfiguration {
    return {
      global: { ...base.global, ...override.global },
      factory: { ...base.factory, ...override.factory },
      contentTypes: { ...base.contentTypes, ...override.contentTypes },
      environments: { ...base.environments, ...override.environments },
      featureFlags: { ...base.featureFlags, ...override.featureFlags }
    };
  }

  /**
   * Apply environment-specific configuration
   */
  private applyEnvironmentConfig(): void {
    const envConfig = this.config.environments[this.environment as keyof EnvironmentConfig];
    if (envConfig) {
      this.config.global = { ...this.config.global, ...envConfig };
      this.logDebug(`Applied ${this.environment} environment configuration`);
    }
  }

  /**
   * Load configuration from Strapi config
   */
  private loadFromStrapiConfig(): Partial<HookSystemConfiguration> {
    // Try to load from Strapi configuration
    const strapiConfig = this.strapi?.config?.get?.('hooks') || {};
    
    return {
      global: strapiConfig.global || {},
      factory: strapiConfig.factory || {},
      contentTypes: strapiConfig.contentTypes || {},
      featureFlags: strapiConfig.featureFlags || {}
    };
  }

  /**
   * Emit configuration change event
   */
  private emitConfigurationChange(event: ConfigurationChangeEvent): void {
    this.configHistory.push(event);
    
    // Keep history limited to last 1000 changes
    if (this.configHistory.length > 1000) {
      this.configHistory = this.configHistory.slice(-1000);
    }

    // Notify listeners
    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (error) {
        this.logError('Configuration change listener error', error);
      }
    }
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[HookConfigurationManager] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[HookConfigurationManager] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[HookConfigurationManager] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[HookConfigurationManager] ${message}`, error);
  }
}

/**
 * Singleton configuration manager instance
 */
let configManagerInstance: HookConfigurationManager | null = null;

/**
 * Get or create configuration manager instance
 */
export function getHookConfigurationManager(
  strapi?: any,
  initialConfig?: Partial<HookSystemConfiguration>
): HookConfigurationManager {
  if (!configManagerInstance && strapi) {
    configManagerInstance = new HookConfigurationManager(strapi, initialConfig);
  }
  
  if (!configManagerInstance) {
    throw new Error('HookConfigurationManager not initialized. Call with strapi instance first.');
  }
  
  return configManagerInstance;
}

/**
 * Initialize configuration manager with strapi instance
 */
export function initializeHookConfigurationManager(
  strapi: any,
  initialConfig?: Partial<HookSystemConfiguration>
): HookConfigurationManager {
  configManagerInstance = new HookConfigurationManager(strapi, initialConfig);
  return configManagerInstance;
}

/**
 * Reset configuration manager instance (mainly for testing)
 */
export function resetHookConfigurationManager(): void {
  configManagerInstance = null;
}

export default HookConfigurationManager;
export type {
  ConfigurationSchema,
  ValidationResult,
  EnvironmentConfig,
  HookSystemConfiguration,
  ConfigurationChangeEvent
};