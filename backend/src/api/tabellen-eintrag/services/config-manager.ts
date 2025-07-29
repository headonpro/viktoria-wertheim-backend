/**
 * Configuration Manager Service
 * Manages environment-specific configuration and feature flags
 */

import { AutomationConfig, DEFAULT_AUTOMATION_CONFIG, FeatureFlags } from '../../../config/automation';
import { FeatureFlagService } from './feature-flags';

export interface ConfigManagerService {
  getConfig(): AutomationConfig;
  updateConfig(config: Partial<AutomationConfig>): Promise<void>;
  getEnvironmentConfig(): EnvironmentConfig;
  validateConfig(config: Partial<AutomationConfig>): ConfigValidationResult;
  resetToDefaults(): Promise<void>;
}

export interface EnvironmentConfig {
  name: string;
  features: FeatureFlags;
  overrides: Partial<AutomationConfig>;
  restrictions: ConfigRestrictions;
}

export interface ConfigRestrictions {
  allowFeatureToggle: boolean;
  allowQueueConfig: boolean;
  allowCacheConfig: boolean;
  allowMonitoringConfig: boolean;
  maxConcurrency: number;
  maxRetries: number;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  field: string;
  message: string;
  code: string;
  value: any;
}

export interface ConfigValidationWarning {
  field: string;
  message: string;
  code: string;
  value: any;
}

class ConfigManagerServiceImpl implements ConfigManagerService {
  private config: AutomationConfig;
  private environmentConfig: EnvironmentConfig;
  private featureFlagService: FeatureFlagService;
  private strapi: any;

  constructor(strapi: any, featureFlagService: FeatureFlagService) {
    this.strapi = strapi;
    this.featureFlagService = featureFlagService;
    this.environmentConfig = this.loadEnvironmentConfig();
    this.config = this.loadConfig();
  }

  /**
   * Get current configuration
   */
  getConfig(): AutomationConfig {
    return {
      ...this.config,
      features: this.featureFlagService.getAllFlags()
    };
  }

  /**
   * Update configuration
   */
  async updateConfig(configUpdate: Partial<AutomationConfig>): Promise<void> {
    // Validate the configuration update
    const validation = this.validateConfig(configUpdate);
    if (!validation.isValid) {
      throw new Error(`Configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Apply restrictions based on environment
    const filteredUpdate = this.applyEnvironmentRestrictions(configUpdate);

    // Update feature flags separately
    if (filteredUpdate.features) {
      await this.featureFlagService.updateFlags(filteredUpdate.features);
      delete filteredUpdate.features;
    }

    // Update other configuration
    this.config = {
      ...this.config,
      ...filteredUpdate
    };

    // Persist configuration
    await this.persistConfig();

    this.strapi.log.info('Configuration updated', {
      update: filteredUpdate,
      environment: this.environmentConfig.name,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(): EnvironmentConfig {
    return this.environmentConfig;
  }

  /**
   * Validate configuration
   */
  validateConfig(config: Partial<AutomationConfig>): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationWarning[] = [];

    // Validate queue configuration
    if (config.queue) {
      if (config.queue.concurrency !== undefined) {
        if (config.queue.concurrency < 1 || config.queue.concurrency > this.environmentConfig.restrictions.maxConcurrency) {
          errors.push({
            field: 'queue.concurrency',
            message: `Concurrency must be between 1 and ${this.environmentConfig.restrictions.maxConcurrency}`,
            code: 'INVALID_CONCURRENCY',
            value: config.queue.concurrency
          });
        }
      }

      if (config.queue.maxRetries !== undefined) {
        if (config.queue.maxRetries < 0 || config.queue.maxRetries > this.environmentConfig.restrictions.maxRetries) {
          errors.push({
            field: 'queue.maxRetries',
            message: `Max retries must be between 0 and ${this.environmentConfig.restrictions.maxRetries}`,
            code: 'INVALID_MAX_RETRIES',
            value: config.queue.maxRetries
          });
        }
      }

      if (config.queue.jobTimeout !== undefined) {
        if (config.queue.jobTimeout < 1000 || config.queue.jobTimeout > 300000) {
          errors.push({
            field: 'queue.jobTimeout',
            message: 'Job timeout must be between 1000ms and 300000ms',
            code: 'INVALID_JOB_TIMEOUT',
            value: config.queue.jobTimeout
          });
        }
      }
    }

    // Validate cache configuration
    if (config.cache) {
      if (config.cache.ttl) {
        Object.entries(config.cache.ttl).forEach(([key, value]) => {
          if (value < 0 || value > 86400) {
            warnings.push({
              field: `cache.ttl.${key}`,
              message: 'TTL values should be between 0 and 86400 seconds',
              code: 'UNUSUAL_TTL',
              value
            });
          }
        });
      }
    }

    // Validate calculation configuration
    if (config.calculation) {
      if (config.calculation.timeout !== undefined) {
        if (config.calculation.timeout < 5000 || config.calculation.timeout > 300000) {
          errors.push({
            field: 'calculation.timeout',
            message: 'Calculation timeout must be between 5000ms and 300000ms',
            code: 'INVALID_CALCULATION_TIMEOUT',
            value: config.calculation.timeout
          });
        }
      }

      if (config.calculation.performance) {
        const perf = config.calculation.performance;
        if (perf.maxTeamsPerLiga !== undefined && (perf.maxTeamsPerLiga < 2 || perf.maxTeamsPerLiga > 50)) {
          errors.push({
            field: 'calculation.performance.maxTeamsPerLiga',
            message: 'Max teams per liga must be between 2 and 50',
            code: 'INVALID_MAX_TEAMS',
            value: perf.maxTeamsPerLiga
          });
        }
      }
    }

    // Environment-specific validations
    if (this.environmentConfig.name === 'production') {
      if (config.monitoring?.enabled === false) {
        warnings.push({
          field: 'monitoring.enabled',
          message: 'Disabling monitoring in production is not recommended',
          code: 'PRODUCTION_MONITORING_DISABLED',
          value: false
        });
      }

      if (config.errorHandling?.circuitBreaker?.enabled === false) {
        warnings.push({
          field: 'errorHandling.circuitBreaker.enabled',
          message: 'Disabling circuit breaker in production is not recommended',
          code: 'PRODUCTION_CIRCUIT_BREAKER_DISABLED',
          value: false
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Reset configuration to defaults
   */
  async resetToDefaults(): Promise<void> {
    this.config = { ...DEFAULT_AUTOMATION_CONFIG };
    await this.featureFlagService.resetToDefaults();
    await this.persistConfig();

    this.strapi.log.info('Configuration reset to defaults', {
      environment: this.environmentConfig.name,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Load environment-specific configuration
   */
  private loadEnvironmentConfig(): EnvironmentConfig {
    const environment = process.env.NODE_ENV || 'development';

    const baseConfig: EnvironmentConfig = {
      name: environment,
      features: { ...DEFAULT_AUTOMATION_CONFIG.features },
      overrides: {},
      restrictions: {
        allowFeatureToggle: true,
        allowQueueConfig: true,
        allowCacheConfig: true,
        allowMonitoringConfig: true,
        maxConcurrency: 10,
        maxRetries: 5
      }
    };

    switch (environment) {
      case 'production':
        return {
          ...baseConfig,
          features: {
            ...baseConfig.features,
            circuitBreaker: true,
            performanceMonitoring: true,
            notifications: true
          },
          restrictions: {
            ...baseConfig.restrictions,
            allowFeatureToggle: false, // Prevent runtime feature changes in production
            maxConcurrency: 5,
            maxRetries: 3
          }
        };

      case 'staging':
        return {
          ...baseConfig,
          features: {
            ...baseConfig.features,
            performanceMonitoring: true
          },
          restrictions: {
            ...baseConfig.restrictions,
            maxConcurrency: 3,
            maxRetries: 3
          }
        };

      case 'test':
        return {
          ...baseConfig,
          features: {
            ...baseConfig.features,
            notifications: false,
            performanceMonitoring: false
          },
          restrictions: {
            ...baseConfig.restrictions,
            maxConcurrency: 1,
            maxRetries: 1
          }
        };

      case 'development':
      default:
        return baseConfig;
    }
  }

  /**
   * Load configuration from defaults and environment
   */
  private loadConfig(): AutomationConfig {
    const config = { ...DEFAULT_AUTOMATION_CONFIG };

    // Apply environment overrides
    if (this.environmentConfig.overrides) {
      Object.assign(config, this.environmentConfig.overrides);
    }

    return config;
  }

  /**
   * Apply environment restrictions to configuration update
   */
  private applyEnvironmentRestrictions(configUpdate: Partial<AutomationConfig>): Partial<AutomationConfig> {
    const filtered = { ...configUpdate };
    const restrictions = this.environmentConfig.restrictions;

    // Remove restricted fields based on environment
    if (!restrictions.allowFeatureToggle && filtered.features) {
      this.strapi.log.warn('Feature toggle changes not allowed in this environment', {
        environment: this.environmentConfig.name,
        attempted: filtered.features
      });
      delete filtered.features;
    }

    if (!restrictions.allowQueueConfig && filtered.queue) {
      this.strapi.log.warn('Queue configuration changes not allowed in this environment', {
        environment: this.environmentConfig.name
      });
      delete filtered.queue;
    }

    if (!restrictions.allowCacheConfig && filtered.cache) {
      this.strapi.log.warn('Cache configuration changes not allowed in this environment', {
        environment: this.environmentConfig.name
      });
      delete filtered.cache;
    }

    if (!restrictions.allowMonitoringConfig && filtered.monitoring) {
      this.strapi.log.warn('Monitoring configuration changes not allowed in this environment', {
        environment: this.environmentConfig.name
      });
      delete filtered.monitoring;
    }

    return filtered;
  }

  /**
   * Persist configuration to storage
   */
  private async persistConfig(): Promise<void> {
    try {
      // In a real implementation, this would save to database or file
      this.strapi.log.debug('Configuration persisted', {
        config: this.config,
        environment: this.environmentConfig.name
      });
    } catch (error) {
      this.strapi.log.error('Failed to persist configuration', { error });
    }
  }
}

/**
 * Factory function to create configuration manager service
 */
export function createConfigManagerService(strapi: any, featureFlagService: FeatureFlagService): ConfigManagerService {
  return new ConfigManagerServiceImpl(strapi, featureFlagService);
}

export default createConfigManagerService;