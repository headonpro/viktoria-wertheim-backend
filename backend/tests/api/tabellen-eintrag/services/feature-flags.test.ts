/**
 * Feature Flag Service Tests
 * Tests for feature flag management and environment-specific behavior
 */

import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import test from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { createFeatureFlagService, shouldRunAutomation, shouldUseManualFallback } from '../../../../src/api/tabellen-eintrag/services/feature-flags';
import { FeatureFlags } from '../../../../src/config/automation';

describe('Feature Flag Service', () => {
  let mockStrapi: any;
  let featureFlagService: any;

  beforeEach(() => {
    mockStrapi = {
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn()
      }
    };

    // Clear environment variables
    delete process.env.ENABLE_AUTOMATIC_CALCULATION;
    delete process.env.ENABLE_QUEUE_PROCESSING;
    delete process.env.ENABLE_SNAPSHOT_CREATION;
    delete process.env.ENABLE_ADMIN_EXTENSIONS;
    delete process.env.ENABLE_PERFORMANCE_MONITORING;
    delete process.env.ENABLE_CACHING;
    delete process.env.ENABLE_CIRCUIT_BREAKER;
    delete process.env.ENABLE_NOTIFICATIONS;

    // Set to development environment for consistent defaults
    process.env.NODE_ENV = 'development';

    featureFlagService = createFeatureFlagService(mockStrapi);
  });

  describe('Basic Flag Operations', () => {
    test('should return default flag values', () => {
      const flags = featureFlagService.getAllFlags();
      
      expect(flags.automaticCalculation).toBe(true);
      expect(flags.queueProcessing).toBe(true);
      expect(flags.snapshotCreation).toBe(true);
      expect(flags.adminExtensions).toBe(true);
      expect(flags.performanceMonitoring).toBe(true);
      expect(flags.caching).toBe(true);
      expect(flags.circuitBreaker).toBe(true);
      expect(flags.notifications).toBe(false);
    });

    test('should check individual flag status', () => {
      expect(featureFlagService.isEnabled('automaticCalculation')).toBe(true);
      expect(featureFlagService.isEnabled('notifications')).toBe(false);
    });

    test('should enable a feature flag', async () => {
      await featureFlagService.enableFeature('notifications');
      
      expect(featureFlagService.isEnabled('notifications')).toBe(true);
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        "Feature flag 'notifications' enabled",
        expect.objectContaining({
          flag: 'notifications'
        })
      );
    });

    test('should disable a feature flag', async () => {
      await featureFlagService.disableFeature('automaticCalculation');
      
      expect(featureFlagService.isEnabled('automaticCalculation')).toBe(false);
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        "Feature flag 'automaticCalculation' disabled",
        expect.objectContaining({
          flag: 'automaticCalculation'
        })
      );
    });

    test('should update multiple flags', async () => {
      const updates: Partial<FeatureFlags> = {
        automaticCalculation: false,
        notifications: true,
        caching: false
      };

      await featureFlagService.updateFlags(updates);

      expect(featureFlagService.isEnabled('automaticCalculation')).toBe(false);
      expect(featureFlagService.isEnabled('notifications')).toBe(true);
      expect(featureFlagService.isEnabled('caching')).toBe(false);
      expect(featureFlagService.isEnabled('queueProcessing')).toBe(true); // unchanged
    });

    test('should reset flags to defaults', async () => {
      // Change some flags
      await featureFlagService.updateFlags({
        automaticCalculation: false,
        notifications: true
      });

      // Reset to defaults
      await featureFlagService.resetToDefaults();

      const flags = featureFlagService.getAllFlags();
      expect(flags.automaticCalculation).toBe(true);
      expect(flags.notifications).toBe(false);
    });
  });

  describe('Environment Variable Overrides', () => {
    test('should respect environment variable overrides', () => {
      process.env.ENABLE_AUTOMATIC_CALCULATION = 'false';
      process.env.ENABLE_NOTIFICATIONS = 'true';

      const service = createFeatureFlagService(mockStrapi);

      expect(service.isEnabled('automaticCalculation')).toBe(false);
      expect(service.isEnabled('notifications')).toBe(true);
    });

    test('should handle invalid environment variable values', () => {
      process.env.NODE_ENV = 'development'; // Ensure development environment
      process.env.ENABLE_AUTOMATIC_CALCULATION = 'invalid';
      process.env.ENABLE_NOTIFICATIONS = '';

      const service = createFeatureFlagService(mockStrapi);

      // Should fall back to defaults for invalid values
      expect(service.isEnabled('automaticCalculation')).toBe(true);
      expect(service.isEnabled('notifications')).toBe(false);
    });
  });

  describe('Environment-Specific Behavior', () => {
    test('should apply test environment defaults', () => {
      process.env.NODE_ENV = 'test';
      const service = createFeatureFlagService(mockStrapi);

      expect(service.isEnabled('notifications')).toBe(false);
      expect(service.isEnabled('performanceMonitoring')).toBe(false);
    });

    test('should apply production environment defaults', () => {
      process.env.NODE_ENV = 'production';
      const service = createFeatureFlagService(mockStrapi);

      expect(service.isEnabled('circuitBreaker')).toBe(true);
      expect(service.isEnabled('performanceMonitoring')).toBe(true);
    });

    test('should apply development environment defaults', () => {
      process.env.NODE_ENV = 'development';
      const service = createFeatureFlagService(mockStrapi);

      // All features should use default values in development
      const flags = service.getAllFlags();
      expect(flags.automaticCalculation).toBe(true);
      expect(flags.queueProcessing).toBe(true);
    });
  });

  describe('Runtime Overrides', () => {
    test('should support runtime configuration overrides', () => {
      const service = createFeatureFlagService(mockStrapi, {
        overrides: {
          automaticCalculation: false,
          notifications: true
        }
      });

      expect(service.isEnabled('automaticCalculation')).toBe(false);
      expect(service.isEnabled('notifications')).toBe(true);
      expect(service.isEnabled('queueProcessing')).toBe(true); // not overridden
    });

    test('should prioritize environment variables over runtime overrides', () => {
      process.env.ENABLE_AUTOMATIC_CALCULATION = 'true';

      const service = createFeatureFlagService(mockStrapi, {
        overrides: {
          automaticCalculation: false
        }
      });

      // Environment variable should take precedence
      expect(service.isEnabled('automaticCalculation')).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    test('shouldRunAutomation should check required flags', () => {
      const mockStrapiWithService = {
        service: jest.fn().mockReturnValue({
          isEnabled: jest.fn()
            .mockReturnValueOnce(true) // automaticCalculation
            .mockReturnValueOnce(true) // queueProcessing
        })
      };

      const result = shouldRunAutomation(mockStrapiWithService);
      expect(result).toBe(true);
      expect(mockStrapiWithService.service).toHaveBeenCalledWith('api::tabellen-eintrag.feature-flags');
    });

    test('shouldRunAutomation should return false if automation disabled', () => {
      const mockStrapiWithService = {
        service: jest.fn().mockReturnValue({
          isEnabled: jest.fn()
            .mockReturnValueOnce(false) // automaticCalculation
            .mockReturnValueOnce(true) // queueProcessing
        })
      };

      const result = shouldRunAutomation(mockStrapiWithService);
      expect(result).toBe(false);
    });

    test('shouldRunAutomation should fallback to environment variable', () => {
      process.env.ENABLE_AUTOMATIC_CALCULATION = 'true';
      
      const mockStrapiWithoutService = {
        service: jest.fn().mockImplementation(() => {
          throw new Error('Service not available');
        })
      };

      const result = shouldRunAutomation(mockStrapiWithoutService);
      expect(result).toBe(true);
    });

    test('shouldUseManualFallback should check automation flag', () => {
      const mockStrapiWithService = {
        service: jest.fn().mockReturnValue({
          isEnabled: jest.fn().mockReturnValue(false)
        })
      };

      const result = shouldUseManualFallback(mockStrapiWithService);
      expect(result).toBe(true);
    });

    test('shouldUseManualFallback should fallback to environment variable', () => {
      process.env.ENABLE_AUTOMATIC_CALCULATION = 'false';
      
      const mockStrapiWithoutService = {
        service: jest.fn().mockImplementation(() => {
          throw new Error('Service not available');
        })
      };

      const result = shouldUseManualFallback(mockStrapiWithoutService);
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle service initialization errors gracefully', () => {
      const mockStrapiWithError = {
        log: {
          info: jest.fn(),
          warn: jest.fn(),
          debug: jest.fn(),
          error: jest.fn()
        }
      };

      expect(() => {
        createFeatureFlagService(mockStrapiWithError);
      }).not.toThrow();
    });

    test('should handle persistence errors gracefully', async () => {
      const service = createFeatureFlagService(mockStrapi, {
        persistenceEnabled: true
      });

      // Should not throw even if persistence fails
      await expect(service.enableFeature('notifications')).resolves.not.toThrow();
      expect(service.isEnabled('notifications')).toBe(true);
    });
  });

  describe('Logging', () => {
    test('should log flag changes', async () => {
      await featureFlagService.enableFeature('notifications');

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        "Feature flag 'notifications' enabled",
        expect.objectContaining({
          flag: 'notifications',
          timestamp: expect.any(String)
        })
      );
    });

    test('should log bulk flag updates', async () => {
      await featureFlagService.updateFlags({
        automaticCalculation: false,
        notifications: true
      });

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Feature flags updated',
        expect.objectContaining({
          changes: {
            automaticCalculation: false,
            notifications: true
          },
          timestamp: expect.any(String)
        })
      );
    });

    test('should log flag resets', async () => {
      await featureFlagService.resetToDefaults();

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Feature flags reset to defaults',
        expect.objectContaining({
          timestamp: expect.any(String)
        })
      );
    });
  });
});