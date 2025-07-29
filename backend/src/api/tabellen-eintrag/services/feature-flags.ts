/**
 * Feature Flag Service
 * Manages feature toggles for gradual rollout and environment-specific configuration
 */

import { DEFAULT_AUTOMATION_CONFIG, FeatureFlags } from '../../../config/automation';

export interface FeatureFlagService {
  isEnabled(flag: keyof FeatureFlags): boolean;
  enableFeature(flag: keyof FeatureFlags): Promise<void>;
  disableFeature(flag: keyof FeatureFlags): Promise<void>;
  getAllFlags(): FeatureFlags;
  updateFlags(flags: Partial<FeatureFlags>): Promise<void>;
  resetToDefaults(): Promise<void>;
}

export interface FeatureFlagConfig {
  environment: string;
  overrides: Partial<FeatureFlags>;
  persistenceEnabled: boolean;
  storageKey: string;
}

class FeatureFlagServiceImpl implements FeatureFlagService {
  private flags: FeatureFlags;
  private config: FeatureFlagConfig;
  private strapi: any;

  constructor(strapi: any, config?: Partial<FeatureFlagConfig>) {
    this.strapi = strapi;
    this.config = {
      environment: process.env.NODE_ENV || 'development',
      overrides: {},
      persistenceEnabled: true,
      storageKey: 'automation_feature_flags',
      ...config
    };

    this.flags = this.loadFlags();
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flag: keyof FeatureFlags): boolean {
    // Check environment-specific overrides first
    const envOverride = this.getEnvironmentOverride(flag);
    if (envOverride !== undefined) {
      return envOverride;
    }

    // Check runtime overrides
    if (this.config.overrides[flag] !== undefined) {
      return this.config.overrides[flag]!;
    }

    // Return current flag value
    return this.flags[flag];
  }

  /**
   * Enable a feature flag
   */
  async enableFeature(flag: keyof FeatureFlags): Promise<void> {
    this.flags[flag] = true;
    await this.persistFlags();
    
    this.strapi.log.info(`Feature flag '${flag}' enabled`, {
      flag,
      environment: this.config.environment,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Disable a feature flag
   */
  async disableFeature(flag: keyof FeatureFlags): Promise<void> {
    this.flags[flag] = false;
    await this.persistFlags();
    
    this.strapi.log.info(`Feature flag '${flag}' disabled`, {
      flag,
      environment: this.config.environment,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlags {
    const result: FeatureFlags = { ...this.flags };
    
    // Apply environment overrides
    Object.keys(result).forEach(key => {
      const flag = key as keyof FeatureFlags;
      const envOverride = this.getEnvironmentOverride(flag);
      if (envOverride !== undefined) {
        result[flag] = envOverride;
      }
    });

    // Apply runtime overrides
    Object.keys(this.config.overrides).forEach(key => {
      const flag = key as keyof FeatureFlags;
      if (this.config.overrides[flag] !== undefined) {
        result[flag] = this.config.overrides[flag]!;
      }
    });

    return result;
  }

  /**
   * Update multiple feature flags
   */
  async updateFlags(flags: Partial<FeatureFlags>): Promise<void> {
    const oldFlags = { ...this.flags };
    
    Object.keys(flags).forEach(key => {
      const flag = key as keyof FeatureFlags;
      if (flags[flag] !== undefined) {
        this.flags[flag] = flags[flag]!;
      }
    });

    await this.persistFlags();
    
    this.strapi.log.info('Feature flags updated', {
      oldFlags,
      newFlags: this.flags,
      changes: flags,
      environment: this.config.environment,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Reset all flags to default values
   */
  async resetToDefaults(): Promise<void> {
    const oldFlags = { ...this.flags };
    this.flags = { ...DEFAULT_AUTOMATION_CONFIG.features };
    await this.persistFlags();
    
    this.strapi.log.info('Feature flags reset to defaults', {
      oldFlags,
      newFlags: this.flags,
      environment: this.config.environment,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Load flags from storage or defaults
   */
  private loadFlags(): FeatureFlags {
    try {
      if (this.config.persistenceEnabled) {
        // Try to load from database or file system
        const stored = this.loadStoredFlags();
        if (stored) {
          return { ...DEFAULT_AUTOMATION_CONFIG.features, ...stored };
        }
      }
    } catch (error) {
      this.strapi.log.warn('Failed to load stored feature flags, using defaults', { error });
    }

    return { ...DEFAULT_AUTOMATION_CONFIG.features };
  }

  /**
   * Load stored flags from persistence layer
   */
  private loadStoredFlags(): Partial<FeatureFlags> | null {
    // In a real implementation, this would load from database or file
    // For now, we'll use environment variables as the persistence layer
    const stored: Partial<FeatureFlags> = {};

    const envVars = [
      { key: 'ENABLE_AUTOMATIC_CALCULATION', flag: 'automaticCalculation' as keyof FeatureFlags },
      { key: 'ENABLE_QUEUE_PROCESSING', flag: 'queueProcessing' as keyof FeatureFlags },
      { key: 'ENABLE_SNAPSHOT_CREATION', flag: 'snapshotCreation' as keyof FeatureFlags },
      { key: 'ENABLE_ADMIN_EXTENSIONS', flag: 'adminExtensions' as keyof FeatureFlags },
      { key: 'ENABLE_PERFORMANCE_MONITORING', flag: 'performanceMonitoring' as keyof FeatureFlags },
      { key: 'ENABLE_CACHING', flag: 'caching' as keyof FeatureFlags },
      { key: 'ENABLE_CIRCUIT_BREAKER', flag: 'circuitBreaker' as keyof FeatureFlags },
      { key: 'ENABLE_NOTIFICATIONS', flag: 'notifications' as keyof FeatureFlags }
    ];

    envVars.forEach(({ key, flag }) => {
      const value = process.env[key];
      if (value !== undefined && (value === 'true' || value === 'false')) {
        stored[flag] = value === 'true';
      }
    });

    return Object.keys(stored).length > 0 ? stored : null;
  }

  /**
   * Persist flags to storage
   */
  private async persistFlags(): Promise<void> {
    if (!this.config.persistenceEnabled) {
      return;
    }

    try {
      // In a real implementation, this would save to database or file
      // For now, we'll just log the change
      this.strapi.log.debug('Feature flags persisted', {
        flags: this.flags,
        storageKey: this.config.storageKey
      });
    } catch (error) {
      this.strapi.log.error('Failed to persist feature flags', { error });
    }
  }

  /**
   * Get environment-specific override for a flag
   */
  private getEnvironmentOverride(flag: keyof FeatureFlags): boolean | undefined {
    // Convert camelCase to SCREAMING_SNAKE_CASE
    const envKey = `ENABLE_${flag.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
    const envValue = process.env[envKey];
    
    if (envValue !== undefined && (envValue === 'true' || envValue === 'false')) {
      return envValue === 'true';
    }

    // Environment-specific defaults
    if (this.config.environment === 'test') {
      // Disable certain features in test environment
      if (flag === 'notifications') return false;
      if (flag === 'performanceMonitoring') return false;
    }

    if (this.config.environment === 'development') {
      // Enable all features in development
      return undefined; // Use default behavior
    }

    if (this.config.environment === 'production') {
      // Conservative defaults for production
      if (flag === 'circuitBreaker') return true;
      if (flag === 'performanceMonitoring') return true;
    }

    return undefined;
  }
}

/**
 * Factory function to create feature flag service
 */
export function createFeatureFlagService(strapi: any, config?: Partial<FeatureFlagConfig>): FeatureFlagService {
  return new FeatureFlagServiceImpl(strapi, config);
}

/**
 * Middleware to check feature flags
 */
export function requireFeatureFlag(flag: keyof FeatureFlags) {
  return async (ctx: any, next: any) => {
    const featureFlags = ctx.state.strapi.service('api::tabellen-eintrag.feature-flags');
    
    if (!featureFlags.isEnabled(flag)) {
      ctx.status = 503;
      ctx.body = {
        error: {
          status: 503,
          name: 'FeatureDisabled',
          message: `Feature '${flag}' is currently disabled`,
          details: {
            flag,
            environment: process.env.NODE_ENV
          }
        }
      };
      return;
    }

    await next();
  };
}

/**
 * Utility function to check if automation should run
 */
export function shouldRunAutomation(strapi: any): boolean {
  try {
    const featureFlags = strapi.service('api::tabellen-eintrag.feature-flags');
    return featureFlags.isEnabled('automaticCalculation') && 
           featureFlags.isEnabled('queueProcessing');
  } catch (error) {
    // Fallback to environment variable if service is not available
    return process.env.ENABLE_AUTOMATIC_CALCULATION !== 'false';
  }
}

/**
 * Utility function to check if manual fallback should be used
 */
export function shouldUseManualFallback(strapi: any): boolean {
  try {
    const featureFlags = strapi.service('api::tabellen-eintrag.feature-flags');
    return !featureFlags.isEnabled('automaticCalculation');
  } catch (error) {
    // Fallback to environment variable if service is not available
    return process.env.ENABLE_AUTOMATIC_CALCULATION === 'false';
  }
}

export default createFeatureFlagService;