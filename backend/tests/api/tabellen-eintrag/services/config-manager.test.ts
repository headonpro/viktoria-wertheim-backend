/**
 * Configuration Manager Service Tests
 * Tests for environment-specific configuration management
 */

import { createConfigManagerService } from '../../../../src/api/tabellen-eintrag/services/config-manager';
import { createFeatureFlagService } from '../../../../src/api/tabellen-eintrag/services/feature-flags';
import { DEFAULT_AUTOMATION_CONFIG } from '../../../../src/config/automation';

describe('Configuration Manager Service', () => {
  let mockStrapi: any;
  let mockFeatureFlagService: any;
  let configManager: any;

  beforeEach(() => {
    mockStrapi = {
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn()
      }
    };

    mockFeatureFlagService = {
      getAllFlags: jest.fn().mockReturnValue(DEFAULT_AUTOMATION_CONFIG.features),
      updateFlags: jest.fn().mockResolvedValue(undefined),
      resetToDefaults: jest.fn().mockResolvedValue(undefined)
    };

    // Reset environment
    process.env.NODE_ENV = 'test';
    configManager = createConfigManagerService(mockStrapi, mockFeatureFlagService);
  });

  describe('Configuration Management', () => {
    test('should return current configuration', () => {
      const config = configManager.getConfig();
      
      expect(config).toHaveProperty('queue');
      expect(config).toHaveProperty('cache');
      expect(config).toHaveProperty('calculation');
      expect(config).toHaveProperty('features');
      expect(config.features).toEqual(DEFAULT_AUTOMATION_CONFIG.features);
    });

    test('should update configuration', async () => {
      const update = {
        queue: {
          concurrency: 2,
          maxRetries: 2
        }
      };

      await configManager.updateConfig(update);

      const config = configManager.getConfig();
      expect(config.queue.concurrency).toBe(2);
      expect(config.queue.maxRetries).toBe(2);
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Configuration updated',
        expect.objectContaining({
          update: expect.objectContaining({
            queue: expect.objectContaining({
              concurrency: 2,
              maxRetries: 2
            })
          })
        })
      );
    });

    test('should update feature flags separately', async () => {
      const update = {
        features: {
          automaticCalculation: false,
          notifications: true
        }
      };

      await configManager.updateConfig(update);

      expect(mockFeatureFlagService.updateFlags).toHaveBeenCalledWith({
        automaticCalculation: false,
        notifications: true
      });
    });

    test('should reset configuration to defaults', async () => {
      // First modify configuration
      await configManager.updateConfig({
        queue: { concurrency: 5 }
      });

      // Then reset
      await configManager.resetToDefaults();

      const config = configManager.getConfig();
      expect(config.queue.concurrency).toBe(DEFAULT_AUTOMATION_CONFIG.queue.concurrency);
      expect(mockFeatureFlagService.resetToDefaults).toHaveBeenCalled();
    });
  });

  describe('Environment-Specific Configuration', () => {
    test('should load test environment configuration', () => {
      process.env.NODE_ENV = 'test';
      const manager = createConfigManagerService(mockStrapi, mockFeatureFlagService);
      const envConfig = manager.getEnvironmentConfig();

      expect(envConfig.name).toBe('test');
      expect(envConfig.restrictions.maxConcurrency).toBe(1);
      expect(envConfig.restrictions.maxRetries).toBe(1);
      expect(envConfig.restrictions.allowFeatureToggle).toBe(true);
    });

    test('should load production environment configuration', () => {
      process.env.NODE_ENV = 'production';
      const manager = createConfigManagerService(mockStrapi, mockFeatureFlagService);
      const envConfig = manager.getEnvironmentConfig();

      expect(envConfig.name).toBe('production');
      expect(envConfig.restrictions.maxConcurrency).toBe(5);
      expect(envConfig.restrictions.maxRetries).toBe(3);
      expect(envConfig.restrictions.allowFeatureToggle).toBe(false);
    });

    test('should load development environment configuration', () => {
      process.env.NODE_ENV = 'development';
      const manager = createConfigManagerService(mockStrapi, mockFeatureFlagService);
      const envConfig = manager.getEnvironmentConfig();

      expect(envConfig.name).toBe('development');
      expect(envConfig.restrictions.maxConcurrency).toBe(10);
      expect(envConfig.restrictions.maxRetries).toBe(5);
      expect(envConfig.restrictions.allowFeatureToggle).toBe(true);
    });

    test('should load staging environment configuration', () => {
      process.env.NODE_ENV = 'staging';
      const manager = createConfigManagerService(mockStrapi, mockFeatureFlagService);
      const envConfig = manager.getEnvironmentConfig();

      expect(envConfig.name).toBe('staging');
      expect(envConfig.restrictions.maxConcurrency).toBe(3);
      expect(envConfig.restrictions.maxRetries).toBe(3);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate queue configuration', () => {
      const validConfig = {
        queue: {
          concurrency: 1,
          maxRetries: 1,
          jobTimeout: 30000
        }
      };

      const result = configManager.validateConfig(validConfig);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid concurrency', () => {
      const invalidConfig = {
        queue: {
          concurrency: 0 // Invalid: below minimum
        }
      };

      const result = configManager.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'queue.concurrency',
          code: 'INVALID_CONCURRENCY'
        })
      );
    });

    test('should reject invalid max retries', () => {
      const invalidConfig = {
        queue: {
          maxRetries: 10 // Invalid: above environment limit (1 for test)
        }
      };

      const result = configManager.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'queue.maxRetries',
          code: 'INVALID_MAX_RETRIES'
        })
      );
    });

    test('should reject invalid job timeout', () => {
      const invalidConfig = {
        queue: {
          jobTimeout: 500 // Invalid: below minimum
        }
      };

      const result = configManager.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'queue.jobTimeout',
          code: 'INVALID_JOB_TIMEOUT'
        })
      );
    });

    test('should validate calculation configuration', () => {
      const invalidConfig = {
        calculation: {
          timeout: 1000, // Invalid: below minimum
          performance: {
            maxTeamsPerLiga: 100 // Invalid: above maximum
          }
        }
      };

      const result = configManager.validateConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'calculation.timeout',
          code: 'INVALID_CALCULATION_TIMEOUT'
        })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'calculation.performance.maxTeamsPerLiga',
          code: 'INVALID_MAX_TEAMS'
        })
      );
    });

    test('should generate warnings for unusual TTL values', () => {
      const configWithWarnings = {
        cache: {
          ttl: {
            tableData: 100000 // Warning: very high TTL
          }
        }
      };

      const result = configManager.validateConfig(configWithWarnings);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'cache.ttl.tableData',
          code: 'UNUSUAL_TTL'
        })
      );
    });

    test('should generate production-specific warnings', () => {
      process.env.NODE_ENV = 'production';
      const manager = createConfigManagerService(mockStrapi, mockFeatureFlagService);

      const configWithWarnings = {
        monitoring: {
          enabled: false
        },
        errorHandling: {
          circuitBreaker: {
            enabled: false
          }
        }
      };

      const result = manager.validateConfig(configWithWarnings);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'monitoring.enabled',
          code: 'PRODUCTION_MONITORING_DISABLED'
        })
      );
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          field: 'errorHandling.circuitBreaker.enabled',
          code: 'PRODUCTION_CIRCUIT_BREAKER_DISABLED'
        })
      );
    });
  });

  describe('Environment Restrictions', () => {
    test('should apply restrictions in production environment', async () => {
      process.env.NODE_ENV = 'production';
      const manager = createConfigManagerService(mockStrapi, mockFeatureFlagService);

      const restrictedUpdate = {
        features: {
          automaticCalculation: false
        }
      };

      await manager.updateConfig(restrictedUpdate);

      // Feature flags should not be updated in production
      expect(mockFeatureFlagService.updateFlags).not.toHaveBeenCalled();
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        'Feature toggle changes not allowed in this environment',
        expect.objectContaining({
          environment: 'production'
        })
      );
    });

    test('should allow feature flag changes in development', async () => {
      process.env.NODE_ENV = 'development';
      const manager = createConfigManagerService(mockStrapi, mockFeatureFlagService);

      const update = {
        features: {
          automaticCalculation: false
        }
      };

      await manager.updateConfig(update);

      expect(mockFeatureFlagService.updateFlags).toHaveBeenCalledWith({
        automaticCalculation: false
      });
    });

    test('should restrict queue configuration changes when not allowed', async () => {
      // Mock environment that doesn't allow queue config changes
      const restrictedManager = createConfigManagerService(mockStrapi, mockFeatureFlagService);
      restrictedManager.getEnvironmentConfig = jest.fn().mockReturnValue({
        name: 'restricted',
        restrictions: {
          allowQueueConfig: false,
          allowFeatureToggle: true,
          allowCacheConfig: true,
          allowMonitoringConfig: true
        }
      });

      const update = {
        queue: {
          concurrency: 5
        }
      };

      await restrictedManager.updateConfig(update);

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        'Queue configuration changes not allowed in this environment',
        expect.objectContaining({
          environment: 'restricted'
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid configuration', async () => {
      const invalidConfig = {
        queue: {
          concurrency: -1
        }
      };

      await expect(configManager.updateConfig(invalidConfig)).rejects.toThrow(
        'Configuration validation failed'
      );
    });

    test('should handle persistence errors gracefully', async () => {
      // Mock persistence failure
      const originalLog = mockStrapi.log.debug;
      mockStrapi.log.debug = jest.fn().mockImplementation(() => {
        throw new Error('Persistence failed');
      });

      const update = {
        queue: {
          concurrency: 1
        }
      };

      // Should not throw despite persistence failure
      await expect(configManager.updateConfig(update)).resolves.not.toThrow();

      // Restore original log function
      mockStrapi.log.debug = originalLog;
    });
  });
});