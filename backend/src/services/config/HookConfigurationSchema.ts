/**
 * Hook Configuration Schema
 * 
 * Defines the complete schema structure for hook configuration system
 * including validation rules, versioning, and type definitions.
 * 
 * Requirements: 6.1, 6.3
 */

/**
 * Configuration schema field definition
 */
export interface ConfigurationSchemaField {
  type: 'object' | 'string' | 'number' | 'boolean' | 'array';
  required?: boolean;
  default?: any;
  enum?: any[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  description?: string;
  deprecated?: boolean;
  version?: string;
  properties?: Record<string, ConfigurationSchemaField>;
  items?: ConfigurationSchemaField;
  additionalProperties?: boolean;
}

/**
 * Configuration schema with versioning
 */
export interface ConfigurationSchema {
  version: string;
  schemaVersion: string;
  lastUpdated: Date;
  fields: Record<string, ConfigurationSchemaField>;
  migrations?: ConfigurationMigration[];
}

/**
 * Configuration migration definition
 */
export interface ConfigurationMigration {
  fromVersion: string;
  toVersion: string;
  description: string;
  migrate: (config: any) => any;
  rollback?: (config: any) => any;
}

/**
 * Hook configuration data structure
 */
export interface HookConfiguration {
  enableStrictValidation: boolean;
  enableAsyncCalculations: boolean;
  maxHookExecutionTime: number;
  retryAttempts: number;
  enableGracefulDegradation: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  enableMetrics: boolean;
  metricsRetentionDays: number;
  enableCaching: boolean;
  cacheExpirationMs: number;
  enableBackgroundJobs: boolean;
  backgroundJobTimeout: number;
  enableValidationWarnings: boolean;
  validationTimeout: number;
  enableCalculationFallbacks: boolean;
  calculationTimeout: number;
}

/**
 * Factory configuration data structure
 */
export interface FactoryConfiguration {
  enableServiceCaching: boolean;
  maxCacheSize: number;
  cacheExpirationMs: number;
  enableServicePooling: boolean;
  maxPoolSize: number;
  poolIdleTimeout: number;
  enableServiceMetrics: boolean;
  defaultHookConfig: HookConfiguration;
}

/**
 * Content type specific configuration
 */
export interface ContentTypeConfiguration {
  enabled: boolean;
  hooks: {
    beforeCreate?: boolean;
    beforeUpdate?: boolean;
    afterCreate?: boolean;
    afterUpdate?: boolean;
    beforeDelete?: boolean;
    afterDelete?: boolean;
  };
  validationRules: string[];
  calculationRules: string[];
  customConfig?: Record<string, any>;
}

/**
 * Environment configuration
 */
export interface EnvironmentConfiguration {
  development?: Partial<HookConfiguration>;
  staging?: Partial<HookConfiguration>;
  production?: Partial<HookConfiguration>;
  test?: Partial<HookConfiguration>;
}

/**
 * Feature flags configuration
 */
export interface FeatureFlagsConfiguration {
  enableHookMetrics: boolean;
  enableBackgroundJobs: boolean;
  enableAdvancedValidation: boolean;
  enableConfigurationUI: boolean;
  enableHookProfiling: boolean;
  enableAsyncValidation: boolean;
  enableValidationCaching: boolean;
  enableCalculationCaching: boolean;
  enableHookChaining: boolean;
  enableConditionalHooks: boolean;
}

/**
 * Complete hook system configuration
 */
export interface HookSystemConfiguration {
  version: string;
  global: HookConfiguration;
  factory: FactoryConfiguration;
  contentTypes: Record<string, ContentTypeConfiguration>;
  environments: EnvironmentConfiguration;
  featureFlags: FeatureFlagsConfiguration;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    updatedBy?: string;
    environment: string;
    deploymentId?: string;
  };
}

/**
 * Hook configuration schema definition
 */
export const HOOK_CONFIG_SCHEMA: ConfigurationSchema = {
  version: '1.0.0',
  schemaVersion: '2024.1',
  lastUpdated: new Date(),
  fields: {
    enableStrictValidation: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable strict validation that blocks operations on validation failures'
    },
    enableAsyncCalculations: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable asynchronous calculations in background jobs'
    },
    maxHookExecutionTime: {
      type: 'number',
      required: false,
      default: 100,
      min: 10,
      max: 5000,
      description: 'Maximum execution time for hooks in milliseconds'
    },
    retryAttempts: {
      type: 'number',
      required: false,
      default: 2,
      min: 0,
      max: 10,
      description: 'Number of retry attempts for failed hook operations'
    },
    enableGracefulDegradation: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable graceful degradation on hook failures'
    },
    logLevel: {
      type: 'string',
      required: false,
      default: 'warn',
      enum: ['error', 'warn', 'info', 'debug'],
      description: 'Logging level for hook operations'
    },
    enableMetrics: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable metrics collection for hook performance'
    },
    metricsRetentionDays: {
      type: 'number',
      required: false,
      default: 30,
      min: 1,
      max: 365,
      description: 'Number of days to retain metrics data'
    },
    enableCaching: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable caching for hook results and validations'
    },
    cacheExpirationMs: {
      type: 'number',
      required: false,
      default: 300000, // 5 minutes
      min: 60000, // 1 minute
      max: 3600000, // 1 hour
      description: 'Cache expiration time in milliseconds'
    },
    enableBackgroundJobs: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable background job processing for heavy operations'
    },
    backgroundJobTimeout: {
      type: 'number',
      required: false,
      default: 30000, // 30 seconds
      min: 5000,
      max: 300000,
      description: 'Timeout for background job execution in milliseconds'
    },
    enableValidationWarnings: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable validation warnings that do not block operations'
    },
    validationTimeout: {
      type: 'number',
      required: false,
      default: 5000, // 5 seconds
      min: 1000,
      max: 30000,
      description: 'Timeout for validation operations in milliseconds'
    },
    enableCalculationFallbacks: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable fallback values when calculations fail'
    },
    calculationTimeout: {
      type: 'number',
      required: false,
      default: 10000, // 10 seconds
      min: 1000,
      max: 60000,
      description: 'Timeout for calculation operations in milliseconds'
    }
  }
};

/**
 * Factory configuration schema definition
 */
export const FACTORY_CONFIG_SCHEMA: ConfigurationSchema = {
  version: '1.0.0',
  schemaVersion: '2024.1',
  lastUpdated: new Date(),
  fields: {
    enableServiceCaching: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable caching of service instances'
    },
    maxCacheSize: {
      type: 'number',
      required: false,
      default: 50,
      min: 1,
      max: 1000,
      description: 'Maximum number of cached service instances'
    },
    cacheExpirationMs: {
      type: 'number',
      required: false,
      default: 1800000, // 30 minutes
      min: 60000, // 1 minute
      max: 3600000, // 1 hour
      description: 'Service cache expiration time in milliseconds'
    },
    enableServicePooling: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable service instance pooling for better performance'
    },
    maxPoolSize: {
      type: 'number',
      required: false,
      default: 10,
      min: 1,
      max: 100,
      description: 'Maximum number of service instances in pool'
    },
    poolIdleTimeout: {
      type: 'number',
      required: false,
      default: 600000, // 10 minutes
      min: 60000,
      max: 3600000,
      description: 'Idle timeout for pooled service instances in milliseconds'
    },
    enableServiceMetrics: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable metrics collection for service factory operations'
    }
  }
};

/**
 * Content type configuration schema definition
 */
export const CONTENT_TYPE_CONFIG_SCHEMA: ConfigurationSchema = {
  version: '1.0.0',
  schemaVersion: '2024.1',
  lastUpdated: new Date(),
  fields: {
    enabled: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable hooks for this content type'
    },
    hooks: {
      type: 'object',
      required: false,
      default: {},
      description: 'Hook activation configuration',
      properties: {
        beforeCreate: {
          type: 'boolean',
          default: true,
          description: 'Enable beforeCreate hook'
        },
        beforeUpdate: {
          type: 'boolean',
          default: true,
          description: 'Enable beforeUpdate hook'
        },
        afterCreate: {
          type: 'boolean',
          default: true,
          description: 'Enable afterCreate hook'
        },
        afterUpdate: {
          type: 'boolean',
          default: true,
          description: 'Enable afterUpdate hook'
        },
        beforeDelete: {
          type: 'boolean',
          default: false,
          description: 'Enable beforeDelete hook'
        },
        afterDelete: {
          type: 'boolean',
          default: false,
          description: 'Enable afterDelete hook'
        }
      }
    },
    validationRules: {
      type: 'array',
      required: false,
      default: [],
      description: 'List of validation rule names to apply',
      items: {
        type: 'string'
      }
    },
    calculationRules: {
      type: 'array',
      required: false,
      default: [],
      description: 'List of calculation rule names to apply',
      items: {
        type: 'string'
      }
    },
    customConfig: {
      type: 'object',
      required: false,
      default: {},
      description: 'Custom configuration specific to this content type',
      additionalProperties: true
    }
  }
};

/**
 * Feature flags configuration schema definition
 */
export const FEATURE_FLAGS_CONFIG_SCHEMA: ConfigurationSchema = {
  version: '1.0.0',
  schemaVersion: '2024.1',
  lastUpdated: new Date(),
  fields: {
    enableHookMetrics: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable collection of hook performance metrics'
    },
    enableBackgroundJobs: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable background job processing system'
    },
    enableAdvancedValidation: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable advanced validation features'
    },
    enableConfigurationUI: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable web UI for configuration management'
    },
    enableHookProfiling: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable detailed profiling of hook execution'
    },
    enableAsyncValidation: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable asynchronous validation processing'
    },
    enableValidationCaching: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable caching of validation results'
    },
    enableCalculationCaching: {
      type: 'boolean',
      required: false,
      default: true,
      description: 'Enable caching of calculation results'
    },
    enableHookChaining: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable chaining of multiple hooks'
    },
    enableConditionalHooks: {
      type: 'boolean',
      required: false,
      default: false,
      description: 'Enable conditional hook execution based on data'
    }
  }
};

/**
 * Default configuration values
 */
export const DEFAULT_HOOK_CONFIGURATION: HookConfiguration = {
  enableStrictValidation: false,
  enableAsyncCalculations: true,
  maxHookExecutionTime: 100,
  retryAttempts: 2,
  enableGracefulDegradation: true,
  logLevel: 'warn',
  enableMetrics: true,
  metricsRetentionDays: 30,
  enableCaching: true,
  cacheExpirationMs: 300000,
  enableBackgroundJobs: true,
  backgroundJobTimeout: 30000,
  enableValidationWarnings: true,
  validationTimeout: 5000,
  enableCalculationFallbacks: true,
  calculationTimeout: 10000
};

export const DEFAULT_FACTORY_CONFIGURATION: FactoryConfiguration = {
  enableServiceCaching: true,
  maxCacheSize: 50,
  cacheExpirationMs: 1800000,
  enableServicePooling: false,
  maxPoolSize: 10,
  poolIdleTimeout: 600000,
  enableServiceMetrics: true,
  defaultHookConfig: DEFAULT_HOOK_CONFIGURATION
};

export const DEFAULT_CONTENT_TYPE_CONFIGURATION: ContentTypeConfiguration = {
  enabled: true,
  hooks: {
    beforeCreate: true,
    beforeUpdate: true,
    afterCreate: true,
    afterUpdate: true,
    beforeDelete: false,
    afterDelete: false
  },
  validationRules: [],
  calculationRules: [],
  customConfig: {}
};

export const DEFAULT_FEATURE_FLAGS_CONFIGURATION: FeatureFlagsConfiguration = {
  enableHookMetrics: true,
  enableBackgroundJobs: true,
  enableAdvancedValidation: false,
  enableConfigurationUI: false,
  enableHookProfiling: false,
  enableAsyncValidation: false,
  enableValidationCaching: true,
  enableCalculationCaching: true,
  enableHookChaining: false,
  enableConditionalHooks: false
};

/**
 * Configuration migrations
 */
export const CONFIGURATION_MIGRATIONS: ConfigurationMigration[] = [
  {
    fromVersion: '0.9.0',
    toVersion: '1.0.0',
    description: 'Add new caching and background job configuration options',
    migrate: (config: any) => {
      return {
        ...config,
        enableCaching: config.enableCaching ?? true,
        cacheExpirationMs: config.cacheExpirationMs ?? 300000,
        enableBackgroundJobs: config.enableBackgroundJobs ?? true,
        backgroundJobTimeout: config.backgroundJobTimeout ?? 30000
      };
    },
    rollback: (config: any) => {
      const { enableCaching, cacheExpirationMs, enableBackgroundJobs, backgroundJobTimeout, ...rest } = config;
      return rest;
    }
  }
];

/**
 * Get schema for configuration type
 */
export function getConfigurationSchema(type: 'hook' | 'factory' | 'contentType' | 'featureFlags'): ConfigurationSchema {
  switch (type) {
    case 'hook':
      return HOOK_CONFIG_SCHEMA;
    case 'factory':
      return FACTORY_CONFIG_SCHEMA;
    case 'contentType':
      return CONTENT_TYPE_CONFIG_SCHEMA;
    case 'featureFlags':
      return FEATURE_FLAGS_CONFIG_SCHEMA;
    default:
      throw new Error(`Unknown configuration type: ${type}`);
  }
}

/**
 * Get default configuration for type
 */
export function getDefaultConfiguration(type: 'hook' | 'factory' | 'contentType' | 'featureFlags'): any {
  switch (type) {
    case 'hook':
      return DEFAULT_HOOK_CONFIGURATION;
    case 'factory':
      return DEFAULT_FACTORY_CONFIGURATION;
    case 'contentType':
      return DEFAULT_CONTENT_TYPE_CONFIGURATION;
    case 'featureFlags':
      return DEFAULT_FEATURE_FLAGS_CONFIGURATION;
    default:
      throw new Error(`Unknown configuration type: ${type}`);
  }
}