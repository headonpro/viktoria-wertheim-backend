/**
 * Timeout Configuration Tests
 * 
 * Tests for timeout configuration management, validation, and dynamic updates
 * as required by Requirements 3.1, 1.4
 */

import { BaseHookService } from '../../src/services/BaseHookService';
import { HookConfigurationManager } from '../../src/services/HookConfigurationManager';
import { TeamHookService } from '../../src/services/TeamHookService';

// Mock Strapi instance
const mockStrapi = {
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  },
  db: {
    query: jest.fn()
  }
};

describe('Timeout Configuration Tests', () => {
  let configManager: HookConfigurationManager;
  let teamService: TeamHookService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    configManager = new HookConfigurationManager(mockStrapi);
    teamService = new TeamHookService(mockStrapi);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Configuration Loading and Validation', () => {
    it('should load default timeout configurations', () => {
      const config = configManager.getDefaultConfig();
      
      expect(config.timeouts).toEqual({
        beforeCreate: 100,
        beforeUpdate: 100,
        afterCreate: 50,
        afterUpdate: 50,
        validation: 30,
        calculation: 80,
        database: 200
      });
    });

    it('should validate timeout configuration values', () => {
      // Valid configurations
      expect(() => {
        configManager.validateTimeoutConfig({
          beforeCreate: 100,
          beforeUpdate: 150,
          afterCreate: 50,
          afterUpdate: 50
        });
      }).not.toThrow();

      // Invalid configurations
      expect(() => {
        configManager.validateTimeoutConfig({
          beforeCreate: -1 // Negative timeout
        });
      }).toThrow('Timeout values must be positive numbers');

      expect(() => {
        configManager.validateTimeoutConfig({
          beforeCreate: 0 // Zero timeout
        });
      }).toThrow('Timeout values must be greater than 0');

      expect(() => {
        configManager.validateTimeoutConfig({
          beforeCreate: 30000 // Too large
        });
      }).toThrow('Timeout values cannot exceed 10000ms');

      expect(() => {
        configManager.validateTimeoutConfig({
          beforeCreate: 'invalid' // Wrong type
        });
      }).toThrow('Timeout values must be numbers');
    });

    it('should load environment-specific timeout configurations', () => {
      // Mock different environment configurations
      process.env.NODE_ENV = 'development';
      const devConfig = configManager.loadEnvironmentConfig();
      expect(devConfig.timeouts.beforeCreate).toBe(500); // Longer for debugging

      process.env.NODE_ENV = 'production';
      const prodConfig = configManager.loadEnvironmentConfig();
      expect(prodConfig.timeouts.beforeCreate).toBe(100); // Shorter for performance

      process.env.NODE_ENV = 'test';
      const testConfig = configManager.loadEnvironmentConfig();
      expect(testConfig.timeouts.beforeCreate).toBe(50); // Very short for fast tests
    });

    it('should merge configuration hierarchies correctly', () => {
      const baseConfig = {
        timeouts: {
          beforeCreate: 100,
          beforeUpdate: 100,
          afterCreate: 50,
          afterUpdate: 50
        }
      };

      const environmentConfig = {
        timeouts: {
          beforeCreate: 200, // Override
          validation: 40 // Add new
        }
      };

      const userConfig = {
        timeouts: {
          beforeCreate: 150, // Override again
          calculation: 90 // Add new
        }
      };

      const merged = configManager.mergeConfigurations([
        baseConfig,
        environmentConfig,
        userConfig
      ]);

      expect(merged.timeouts).toEqual({
        beforeCreate: 150, // From user config (highest priority)
        beforeUpdate: 100, // From base config
        afterCreate: 50, // From base config
        afterUpdate: 50, // From base config
        validation: 40, // From environment config
        calculation: 90 // From user config
      });
    });
  });

  describe('Dynamic Configuration Updates', () => {
    it('should update timeout configuration at runtime', async () => {
      const initialConfig = teamService.getConfig();
      expect(initialConfig.maxHookExecutionTime).toBe(100);

      // Update configuration
      await configManager.updateTimeoutConfig('team', {
        beforeCreate: 200,
        beforeUpdate: 180
      });

      const updatedConfig = teamService.getConfig();
      expect(updatedConfig.maxHookExecutionTime).toBe(200);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Timeout configuration updated for team service',
        expect.objectContaining({
          oldTimeout: 100,
          newTimeout: 200
        })
      );
    });

    it('should validate configuration updates before applying', async () => {
      await expect(
        configManager.updateTimeoutConfig('team', {
          beforeCreate: -50 // Invalid
        })
      ).rejects.toThrow('Invalid timeout configuration');

      // Original configuration should remain unchanged
      const config = teamService.getConfig();
      expect(config.maxHookExecutionTime).toBe(100);
    });

    it('should rollback configuration on service failure', async () => {
      const originalConfig = teamService.getConfig();

      // Mock service failure after configuration update
      jest.spyOn(teamService, 'updateConfig').mockImplementation(() => {
        throw new Error('Service update failed');
      });

      await expect(
        configManager.updateTimeoutConfig('team', {
          beforeCreate: 200
        })
      ).rejects.toThrow('Service update failed');

      // Configuration should be rolled back
      const currentConfig = teamService.getConfig();
      expect(currentConfig.maxHookExecutionTime).toBe(originalConfig.maxHookExecutionTime);

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        'Configuration rollback performed due to service failure',
        expect.objectContaining({
          service: 'team',
          error: 'Service update failed'
        })
      );
    });

    it('should notify dependent services of configuration changes', async () => {
      const mockValidationService = {
        updateTimeoutConfig: jest.fn()
      };
      const mockCalculationService = {
        updateTimeoutConfig: jest.fn()
      };

      // Register dependent services
      configManager.registerDependentService('validation', mockValidationService);
      configManager.registerDependentService('calculation', mockCalculationService);

      await configManager.updateTimeoutConfig('team', {
        beforeCreate: 200,
        validation: 60,
        calculation: 120
      });

      expect(mockValidationService.updateTimeoutConfig).toHaveBeenCalledWith({
        timeout: 60
      });
      expect(mockCalculationService.updateTimeoutConfig).toHaveBeenCalledWith({
        timeout: 120
      });
    });
  });

  describe('Configuration Persistence and Recovery', () => {
    it('should persist configuration changes to storage', async () => {
      const mockStorage = {
        save: jest.fn().mockResolvedValue(true),
        load: jest.fn(),
        backup: jest.fn()
      };

      configManager.setStorage(mockStorage);

      await configManager.updateTimeoutConfig('team', {
        beforeCreate: 200,
        beforeUpdate: 180
      });

      expect(mockStorage.save).toHaveBeenCalledWith(
        'team-timeout-config',
        expect.objectContaining({
          beforeCreate: 200,
          beforeUpdate: 180,
          timestamp: expect.any(Date),
          version: expect.any(String)
        })
      );
    });

    it('should create configuration backups before updates', async () => {
      const mockStorage = {
        save: jest.fn().mockResolvedValue(true),
        load: jest.fn(),
        backup: jest.fn().mockResolvedValue(true)
      };

      configManager.setStorage(mockStorage);

      const originalConfig = teamService.getConfig();

      await configManager.updateTimeoutConfig('team', {
        beforeCreate: 200
      });

      expect(mockStorage.backup).toHaveBeenCalledWith(
        'team-timeout-config',
        expect.objectContaining({
          config: originalConfig,
          timestamp: expect.any(Date),
          reason: 'pre-update-backup'
        })
      );
    });

    it('should recover from configuration corruption', async () => {
      const mockStorage = {
        save: jest.fn().mockRejectedValue(new Error('Storage corrupted')),
        load: jest.fn().mockResolvedValue({
          beforeCreate: 150,
          beforeUpdate: 130
        }),
        backup: jest.fn().mockResolvedValue(true),
        getLatestBackup: jest.fn().mockResolvedValue({
          config: {
            beforeCreate: 100,
            beforeUpdate: 100
          },
          timestamp: new Date()
        })
      };

      configManager.setStorage(mockStorage);

      // Attempt to update configuration (will fail due to storage corruption)
      await expect(
        configManager.updateTimeoutConfig('team', {
          beforeCreate: 200
        })
      ).rejects.toThrow('Storage corrupted');

      // Should attempt recovery from backup
      expect(mockStorage.getLatestBackup).toHaveBeenCalled();
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        'Configuration recovery attempted from backup',
        expect.objectContaining({
          service: 'team',
          backupTimestamp: expect.any(Date)
        })
      );
    });

    it('should validate configuration integrity on load', async () => {
      const mockStorage = {
        load: jest.fn().mockResolvedValue({
          beforeCreate: 'invalid', // Invalid type
          beforeUpdate: -50, // Invalid value
          corrupted: true
        }),
        save: jest.fn(),
        backup: jest.fn()
      };

      configManager.setStorage(mockStorage);

      await expect(
        configManager.loadTimeoutConfig('team')
      ).rejects.toThrow('Configuration integrity check failed');

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Corrupted configuration detected',
        expect.objectContaining({
          service: 'team',
          errors: expect.any(Array)
        })
      );
    });
  });

  describe('Performance-Based Configuration Optimization', () => {
    it('should analyze performance metrics to suggest timeout adjustments', async () => {
      // Mock performance data
      const performanceData = {
        averageExecutionTime: 85,
        p95ExecutionTime: 120,
        p99ExecutionTime: 180,
        timeoutRate: 0.15, // 15% timeout rate
        successRate: 0.85
      };

      jest.spyOn(teamService, 'getMetrics').mockReturnValue({
        beforeCreate: {
          executionCount: 100,
          averageExecutionTime: 85,
          errorRate: 0.15,
          warningRate: 0.05,
          lastExecution: new Date(),
          totalErrors: 15,
          totalWarnings: 5
        }
      });

      const recommendations = await configManager.analyzePerformanceAndRecommend('team');

      expect(recommendations).toEqual(
        expect.objectContaining({
          currentTimeout: 100,
          recommendedTimeout: 130, // Based on p95 + buffer
          confidence: expect.any(Number),
          reasoning: expect.stringContaining('performance analysis'),
          expectedImprovement: expect.any(Object)
        })
      );

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Performance-based timeout recommendation generated',
        expect.objectContaining({
          service: 'team',
          recommendation: recommendations
        })
      );
    });

    it('should auto-adjust timeouts based on performance trends', async () => {
      // Enable auto-adjustment
      configManager.enableAutoAdjustment('team', {
        enabled: true,
        minSampleSize: 50,
        adjustmentThreshold: 0.1, // 10% timeout rate threshold
        maxAdjustmentPercent: 0.5 // Max 50% increase
      });

      // Mock performance data indicating high timeout rate
      jest.spyOn(teamService, 'getMetrics').mockReturnValue({
        beforeCreate: {
          executionCount: 100,
          averageExecutionTime: 95,
          errorRate: 0.20, // 20% timeout rate (above threshold)
          warningRate: 0.05,
          lastExecution: new Date(),
          totalErrors: 20,
          totalWarnings: 5
        }
      });

      // Trigger performance analysis
      await configManager.performPerformanceAnalysis('team');

      // Should auto-adjust timeout
      const updatedConfig = teamService.getConfig();
      expect(updatedConfig.maxHookExecutionTime).toBeGreaterThan(100);
      expect(updatedConfig.maxHookExecutionTime).toBeLessThanOrEqual(150); // Max 50% increase

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Auto-adjustment applied based on performance analysis',
        expect.objectContaining({
          service: 'team',
          oldTimeout: 100,
          newTimeout: updatedConfig.maxHookExecutionTime,
          reason: 'high timeout rate detected'
        })
      );
    });

    it('should prevent excessive auto-adjustments', async () => {
      configManager.enableAutoAdjustment('team', {
        enabled: true,
        minSampleSize: 10,
        adjustmentThreshold: 0.1,
        maxAdjustmentPercent: 0.2,
        cooldownPeriod: 300000 // 5 minutes
      });

      // First adjustment
      await configManager.performPerformanceAnalysis('team');
      const firstAdjustment = teamService.getConfig().maxHookExecutionTime;

      // Immediate second analysis (should be blocked by cooldown)
      await configManager.performPerformanceAnalysis('team');
      const secondCheck = teamService.getConfig().maxHookExecutionTime;

      expect(secondCheck).toBe(firstAdjustment);
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        'Auto-adjustment blocked by cooldown period',
        expect.objectContaining({
          service: 'team',
          remainingCooldown: expect.any(Number)
        })
      );
    });
  });

  describe('Configuration Monitoring and Alerting', () => {
    it('should monitor configuration changes and alert on anomalies', async () => {
      // Set up monitoring
      configManager.enableConfigurationMonitoring('team', {
        alertOnLargeChanges: true,
        largeChangeThreshold: 0.5, // 50% change
        alertOnFrequentChanges: true,
        frequentChangeThreshold: 5, // 5 changes per hour
        alertOnPerformanceDegradation: true
      });

      // Large configuration change
      await configManager.updateTimeoutConfig('team', {
        beforeCreate: 300 // 200% increase from 100
      });

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        'Large timeout configuration change detected',
        expect.objectContaining({
          service: 'team',
          changePercent: 200,
          threshold: 50,
          oldValue: 100,
          newValue: 300
        })
      );
    });

    it('should track configuration change history', async () => {
      const changes = [
        { beforeCreate: 120 },
        { beforeCreate: 140 },
        { beforeCreate: 160 },
        { beforeCreate: 180 }
      ];

      for (const change of changes) {
        await configManager.updateTimeoutConfig('team', change);
      }

      const history = configManager.getConfigurationHistory('team');

      expect(history).toHaveLength(4);
      expect(history[0]).toEqual(
        expect.objectContaining({
          change: { beforeCreate: 120 },
          timestamp: expect.any(Date),
          reason: expect.any(String),
          performanceImpact: expect.any(Object)
        })
      );
    });

    it('should provide configuration health reports', async () => {
      // Mock various configuration states
      jest.spyOn(configManager, 'getConfigurationHealth').mockResolvedValue({
        team: {
          status: 'healthy',
          lastUpdate: new Date(),
          changeFrequency: 'normal',
          performanceImpact: 'positive',
          recommendations: []
        },
        saison: {
          status: 'warning',
          lastUpdate: new Date(),
          changeFrequency: 'high',
          performanceImpact: 'negative',
          recommendations: [
            'Consider reducing timeout change frequency',
            'Review recent performance degradation'
          ]
        }
      });

      const healthReport = await configManager.getConfigurationHealth();

      expect(healthReport.team.status).toBe('healthy');
      expect(healthReport.saison.status).toBe('warning');
      expect(healthReport.saison.recommendations).toHaveLength(2);

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Configuration health report generated',
        expect.objectContaining({
          healthyServices: 1,
          warningServices: 1,
          criticalServices: 0
        })
      );
    });
  });
});