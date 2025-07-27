/**
 * Configuration Loader
 * 
 * Handles loading configuration from various sources including files,
 * environment variables, and Strapi configuration with caching support.
 * 
 * Requirements: 6.1, 6.3
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  HookSystemConfiguration,
  DEFAULT_HOOK_CONFIGURATION,
  DEFAULT_FACTORY_CONFIGURATION,
  DEFAULT_CONTENT_TYPE_CONFIGURATION,
  DEFAULT_FEATURE_FLAGS_CONFIGURATION
} from './HookConfigurationSchema';
import { getConfigurationValidator, ValidationResult } from './ConfigurationValidator';
import { getConfigurationVersioning, MigrationResult } from './ConfigurationVersioning';

/**
 * Configuration source types
 */
export type ConfigurationSource = 'file' | 'environment' | 'strapi' | 'database' | 'default';

/**
 * Configuration load result
 */
export interface ConfigurationLoadResult {
  success: boolean;
  configuration?: HookSystemConfiguration;
  source: ConfigurationSource;
  errors: string[];
  warnings: string[];
  migrationResult?: MigrationResult;
  validationResult?: ValidationResult;
}

/**
 * Configuration cache entry
 */
interface ConfigurationCacheEntry {
  configuration: HookSystemConfiguration;
  timestamp: Date;
  source: ConfigurationSource;
  etag?: string;
  expiresAt: Date;
}

/**
 * Configuration loader options
 */
export interface ConfigurationLoaderOptions {
  enableCaching: boolean;
  cacheExpirationMs: number;
  enableValidation: boolean;
  enableMigration: boolean;
  configurationPaths: string[];
  environmentPrefix: string;
  fallbackToDefaults: boolean;
}

/**
 * Configuration Loader Class
 */
export class ConfigurationLoader {
  private cache: Map<string, ConfigurationCacheEntry> = new Map();
  private options: ConfigurationLoaderOptions;
  private validator = getConfigurationValidator();
  private versioning = getConfigurationVersioning();
  private strapi: any;

  constructor(strapi: any, options?: Partial<ConfigurationLoaderOptions>) {
    this.strapi = strapi;
    this.options = {
      enableCaching: true,
      cacheExpirationMs: 300000, // 5 minutes
      enableValidation: true,
      enableMigration: true,
      configurationPaths: [
        './config/hooks.json',
        './config/hooks.development.json',
        './config/hooks.production.json'
      ],
      environmentPrefix: 'HOOK_CONFIG_',
      fallbackToDefaults: true,
      ...options
    };
  }

  /**
   * Load configuration from all available sources
   */
  async loadConfiguration(environment?: string): Promise<ConfigurationLoadResult> {
    const env = environment || process.env.NODE_ENV || 'development';
    const cacheKey = `config_${env}`;

    // Check cache first
    if (this.options.enableCaching) {
      const cached = this.getCachedConfiguration(cacheKey);
      if (cached) {
        return {
          success: true,
          configuration: cached.configuration,
          source: cached.source,
          errors: [],
          warnings: ['Configuration loaded from cache']
        };
      }
    }

    // Try loading from different sources in priority order
    const sources: ConfigurationSource[] = ['file', 'strapi', 'environment', 'default'];
    
    for (const source of sources) {
      try {
        const result = await this.loadFromSource(source, env);
        
        if (result.success && result.configuration) {
          // Cache the configuration
          if (this.options.enableCaching) {
            this.cacheConfiguration(cacheKey, result.configuration, source);
          }
          
          return result;
        }
        
        // If not successful but has warnings, continue to next source
        if (result.warnings.length > 0) {
          this.logWarn(`Failed to load from ${source}`, result.warnings);
        }
        
      } catch (error) {
        this.logError(`Error loading configuration from ${source}`, error);
        continue;
      }
    }

    // If all sources failed, return error
    return {
      success: false,
      source: 'default',
      errors: ['Failed to load configuration from any source'],
      warnings: []
    };
  }

  /**
   * Load configuration from specific source
   */
  private async loadFromSource(source: ConfigurationSource, environment: string): Promise<ConfigurationLoadResult> {
    switch (source) {
      case 'file':
        return this.loadFromFile(environment);
      case 'strapi':
        return this.loadFromStrapi();
      case 'environment':
        return this.loadFromEnvironment();
      case 'default':
        return this.loadDefaults();
      default:
        throw new Error(`Unknown configuration source: ${source}`);
    }
  }

  /**
   * Load configuration from file
   */
  private async loadFromFile(environment: string): Promise<ConfigurationLoadResult> {
    const result: ConfigurationLoadResult = {
      success: false,
      source: 'file',
      errors: [],
      warnings: []
    };

    // Try environment-specific file first, then general file
    const filePaths = [
      `./config/hooks.${environment}.json`,
      './config/hooks.json'
    ];

    for (const filePath of filePaths) {
      try {
        const fullPath = path.resolve(filePath);
        const fileContent = await fs.readFile(fullPath, 'utf-8');
        const rawConfig = JSON.parse(fileContent);

        // Process the loaded configuration
        const processResult = await this.processRawConfiguration(rawConfig);
        
        if (processResult.success) {
          result.success = true;
          result.configuration = processResult.configuration;
          result.validationResult = processResult.validationResult;
          result.migrationResult = processResult.migrationResult;
          result.warnings.push(`Configuration loaded from ${filePath}`);
          return result;
        } else {
          result.errors.push(...processResult.errors);
          result.warnings.push(...processResult.warnings);
        }
        
      } catch (error) {
        if (error.code !== 'ENOENT') {
          result.errors.push(`Failed to load ${filePath}: ${error.message}`);
        }
        continue;
      }
    }

    result.errors.push('No configuration files found');
    return result;
  }

  /**
   * Load configuration from Strapi config
   */
  private async loadFromStrapi(): Promise<ConfigurationLoadResult> {
    const result: ConfigurationLoadResult = {
      success: false,
      source: 'strapi',
      errors: [],
      warnings: []
    };

    try {
      const strapiConfig = this.strapi?.config?.get?.('hooks');
      
      if (!strapiConfig) {
        result.errors.push('No hooks configuration found in Strapi config');
        return result;
      }

      // Process the loaded configuration
      const processResult = await this.processRawConfiguration(strapiConfig);
      
      if (processResult.success) {
        result.success = true;
        result.configuration = processResult.configuration;
        result.validationResult = processResult.validationResult;
        result.migrationResult = processResult.migrationResult;
        result.warnings.push('Configuration loaded from Strapi config');
      } else {
        result.errors.push(...processResult.errors);
        result.warnings.push(...processResult.warnings);
      }

    } catch (error) {
      result.errors.push(`Failed to load from Strapi config: ${error.message}`);
    }

    return result;
  }

  /**
   * Load configuration from environment variables
   */
  private async loadFromEnvironment(): Promise<ConfigurationLoadResult> {
    const result: ConfigurationLoadResult = {
      success: false,
      source: 'environment',
      errors: [],
      warnings: []
    };

    try {
      const envConfig = this.parseEnvironmentVariables();
      
      if (Object.keys(envConfig).length === 0) {
        result.errors.push('No hook configuration found in environment variables');
        return result;
      }

      // Process the loaded configuration
      const processResult = await this.processRawConfiguration(envConfig);
      
      if (processResult.success) {
        result.success = true;
        result.configuration = processResult.configuration;
        result.validationResult = processResult.validationResult;
        result.migrationResult = processResult.migrationResult;
        result.warnings.push('Configuration loaded from environment variables');
      } else {
        result.errors.push(...processResult.errors);
        result.warnings.push(...processResult.warnings);
      }

    } catch (error) {
      result.errors.push(`Failed to load from environment: ${error.message}`);
    }

    return result;
  }

  /**
   * Load default configuration
   */
  private async loadDefaults(): Promise<ConfigurationLoadResult> {
    const result: ConfigurationLoadResult = {
      success: true,
      source: 'default',
      errors: [],
      warnings: ['Using default configuration']
    };

    const defaultConfig: HookSystemConfiguration = {
      version: '1.0.0',
      global: { ...DEFAULT_HOOK_CONFIGURATION },
      factory: { ...DEFAULT_FACTORY_CONFIGURATION },
      contentTypes: {},
      environments: {
        development: {
          logLevel: 'debug',
          enableStrictValidation: false
        },
        production: {
          logLevel: 'warn',
          maxHookExecutionTime: 50
        }
      },
      featureFlags: { ...DEFAULT_FEATURE_FLAGS_CONFIGURATION },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        environment: process.env.NODE_ENV || 'development'
      }
    };

    result.configuration = defaultConfig;
    return result;
  }

  /**
   * Process raw configuration data
   */
  private async processRawConfiguration(rawConfig: any): Promise<ConfigurationLoadResult> {
    const result: ConfigurationLoadResult = {
      success: false,
      source: 'file',
      errors: [],
      warnings: []
    };

    try {
      // Merge with defaults to ensure all required fields are present
      const mergedConfig = this.mergeWithDefaults(rawConfig);

      // Apply migrations if needed
      if (this.options.enableMigration && rawConfig.version) {
        const migrationResult = await this.versioning.migrateConfiguration(
          mergedConfig,
          rawConfig.version,
          '1.0.0'
        );
        
        result.migrationResult = migrationResult;
        
        if (!migrationResult.success) {
          result.errors.push(...migrationResult.errors);
          return result;
        }
        
        mergedConfig.version = '1.0.0';
        Object.assign(mergedConfig, migrationResult.migratedConfig);
      }

      // Validate configuration
      if (this.options.enableValidation) {
        const validationResult = this.validator.validateSystemConfiguration(mergedConfig);
        result.validationResult = validationResult;
        
        if (!validationResult.isValid) {
          result.errors.push(...validationResult.errors.map(e => e.message));
          return result;
        }
        
        if (validationResult.warnings.length > 0) {
          result.warnings.push(...validationResult.warnings.map(w => w.message));
        }
      }

      // Apply environment-specific configuration
      const finalConfig = this.applyEnvironmentConfiguration(mergedConfig);

      result.success = true;
      result.configuration = finalConfig;

    } catch (error) {
      result.errors.push(`Failed to process configuration: ${error.message}`);
    }

    return result;
  }

  /**
   * Parse environment variables into configuration
   */
  private parseEnvironmentVariables(): any {
    const config: any = {};
    const prefix = this.options.environmentPrefix;

    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        const configKey = key.substring(prefix.length).toLowerCase();
        const parsedValue = this.parseEnvironmentValue(value);
        
        // Convert dot notation to nested object
        this.setNestedValue(config, configKey, parsedValue);
      }
    }

    return config;
  }

  /**
   * Parse environment variable value
   */
  private parseEnvironmentValue(value: string | undefined): any {
    if (!value) return undefined;

    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // If not JSON, try to parse as boolean or number
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;
      
      const numValue = Number(value);
      if (!isNaN(numValue)) return numValue;
      
      return value;
    }
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config: any): HookSystemConfiguration {
    const defaultConfig: HookSystemConfiguration = {
      version: '1.0.0',
      global: { ...DEFAULT_HOOK_CONFIGURATION },
      factory: { ...DEFAULT_FACTORY_CONFIGURATION },
      contentTypes: {},
      environments: {},
      featureFlags: { ...DEFAULT_FEATURE_FLAGS_CONFIGURATION },
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        environment: process.env.NODE_ENV || 'development'
      }
    };

    return {
      version: config.version || defaultConfig.version,
      global: { ...defaultConfig.global, ...config.global },
      factory: { ...defaultConfig.factory, ...config.factory },
      contentTypes: { ...defaultConfig.contentTypes, ...config.contentTypes },
      environments: { ...defaultConfig.environments, ...config.environments },
      featureFlags: { ...defaultConfig.featureFlags, ...config.featureFlags },
      metadata: {
        ...defaultConfig.metadata,
        ...config.metadata,
        updatedAt: new Date()
      }
    };
  }

  /**
   * Apply environment-specific configuration
   */
  private applyEnvironmentConfiguration(config: HookSystemConfiguration): HookSystemConfiguration {
    const environment = process.env.NODE_ENV || 'development';
    const envConfig = config.environments[environment as keyof typeof config.environments];

    if (envConfig) {
      config.global = { ...config.global, ...envConfig };
    }

    // Update metadata
    config.metadata.environment = environment;
    config.metadata.updatedAt = new Date();

    return config;
  }

  /**
   * Get cached configuration
   */
  private getCachedConfiguration(cacheKey: string): ConfigurationCacheEntry | null {
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return null;
    
    // Check if cache is expired
    if (cached.expiresAt < new Date()) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached;
  }

  /**
   * Cache configuration
   */
  private cacheConfiguration(
    cacheKey: string,
    configuration: HookSystemConfiguration,
    source: ConfigurationSource
  ): void {
    const expiresAt = new Date(Date.now() + this.options.cacheExpirationMs);
    
    this.cache.set(cacheKey, {
      configuration: JSON.parse(JSON.stringify(configuration)), // Deep clone
      timestamp: new Date(),
      source,
      expiresAt
    });
  }

  /**
   * Clear configuration cache
   */
  clearCache(cacheKey?: string): void {
    if (cacheKey) {
      this.cache.delete(cacheKey);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{
      key: string;
      source: ConfigurationSource;
      timestamp: Date;
      expiresAt: Date;
    }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      source: entry.source,
      timestamp: entry.timestamp,
      expiresAt: entry.expiresAt
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Reload configuration from source
   */
  async reloadConfiguration(environment?: string): Promise<ConfigurationLoadResult> {
    const env = environment || process.env.NODE_ENV || 'development';
    const cacheKey = `config_${env}`;
    
    // Clear cache for this environment
    this.clearCache(cacheKey);
    
    // Load fresh configuration
    return this.loadConfiguration(env);
  }

  /**
   * Watch configuration file for changes
   */
  watchConfigurationFile(filePath: string, callback: (config: HookSystemConfiguration) => void): void {
    // In a real implementation, you would use fs.watch or chokidar
    // For now, we'll just log that watching would be enabled
    this.logInfo(`Would start watching configuration file: ${filePath}`);
    
    // Placeholder for file watching implementation
    // fs.watch(filePath, async (eventType) => {
    //   if (eventType === 'change') {
    //     const result = await this.loadConfiguration();
    //     if (result.success && result.configuration) {
    //       callback(result.configuration);
    //     }
    //   }
    // });
  }

  /**
   * Logging methods
   */
  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[ConfigurationLoader] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[ConfigurationLoader] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[ConfigurationLoader] ${message}`, error);
  }
}

/**
 * Singleton loader instance
 */
let loaderInstance: ConfigurationLoader | null = null;

/**
 * Get configuration loader instance
 */
export function getConfigurationLoader(
  strapi?: any,
  options?: Partial<ConfigurationLoaderOptions>
): ConfigurationLoader {
  if (!loaderInstance && strapi) {
    loaderInstance = new ConfigurationLoader(strapi, options);
  }
  
  if (!loaderInstance) {
    throw new Error('ConfigurationLoader not initialized. Call with strapi instance first.');
  }
  
  return loaderInstance;
}

/**
 * Initialize configuration loader
 */
export function initializeConfigurationLoader(
  strapi: any,
  options?: Partial<ConfigurationLoaderOptions>
): ConfigurationLoader {
  loaderInstance = new ConfigurationLoader(strapi, options);
  return loaderInstance;
}

export default ConfigurationLoader;