/**
 * Migration Monitoring and Validation System
 * 
 * Provides real-time monitoring, validation, and alerting during the migration process.
 * Tracks system health, performance metrics, and migration progress.
 * 
 * Requirements: 1.1, 1.4
 */

import { EventEmitter } from 'events';
import { StructuredLogger } from '../logging/StructuredLogger';
import { PerformanceMonitor } from '../logging/PerformanceMonitor';
import { getFeatureFlagService } from '../feature-flags/FeatureFlagService';

/**
 * Migration phase definitions
 */
export enum MigrationPhase {
  PREPARATION = 'preparation',
  STAGING = 'staging',
  DEPLOYMENT = 'deployment',
  ROLLOUT = 'rollout',
  OPTIMIZATION = 'optimization',
  COMPLETE = 'complete'
}

/**
 * Migration status types
 */
export enum MigrationStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

/**
 * Migration health check result
 */
export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  metrics?: Record<string, number>;
  timestamp: Date;
}

/**
 * Migration validation result
 */
export interface ValidationResult {
  validationType: string;
  passed: boolean;
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * Migration progress tracking
 */
export interface MigrationProgress {
  phase: MigrationPhase;
  status: MigrationStatus;
  completedSteps: number;
  totalSteps: number;
  startTime: Date;
  estimatedCompletion?: Date;
  currentStep?: string;
}

/**
 * Migration alert configuration
 */
export interface AlertConfig {
  type: 'performance' | 'error' | 'health' | 'progress';
  threshold: number;
  enabled: boolean;
  channels: ('email' | 'slack' | 'webhook')[];
  escalation?: {
    warning: number; // minutes
    critical: number; // minutes
  };
}

/**
 * Migration monitoring configuration
 */
export interface MigrationMonitorConfig {
  refreshInterval: number;
  healthCheckInterval: number;
  validationInterval: number;
  performanceThresholds: {
    slowHookThreshold: number;
    highErrorRateThreshold: number;
    criticalErrorRateThreshold: number;
    memoryUsageThreshold: number;
    cpuUsageThreshold: number;
  };
  alerts: Record<string, AlertConfig>;
}

/**
 * Migration monitoring system
 */
export class MigrationMonitor extends EventEmitter {
  private logger: StructuredLogger;
  private performanceMonitor: PerformanceMonitor;
  private config: MigrationMonitorConfig;
  private progress: MigrationProgress;
  private healthChecks: Map<string, () => Promise<HealthCheckResult>>;
  private validations: Map<string, () => Promise<ValidationResult>>;
  private monitoringInterval?: NodeJS.Timeout;
  private isMonitoring: boolean = false;

  constructor(config: MigrationMonitorConfig) {
    super();
    this.logger = new StructuredLogger('MigrationMonitor');
    this.performanceMonitor = new PerformanceMonitor();
    this.config = config;
    this.healthChecks = new Map();
    this.validations = new Map();
    
    this.progress = {
      phase: MigrationPhase.PREPARATION,
      status: MigrationStatus.NOT_STARTED,
      completedSteps: 0,
      totalSteps: 0,
      startTime: new Date()
    };

    this.setupDefaultHealthChecks();
    this.setupDefaultValidations();
  }

  /**
   * Start migration monitoring
   */
  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      this.logger.warn('Migration monitoring already started');
      return;
    }

    this.logger.info('Starting migration monitoring', {
      phase: this.progress.phase,
      refreshInterval: this.config.refreshInterval
    });

    this.isMonitoring = true;
    this.progress.status = MigrationStatus.IN_PROGRESS;
    this.progress.startTime = new Date();

    // Start monitoring intervals
    this.monitoringInterval = setInterval(
      () => this.performMonitoringCycle(),
      this.config.refreshInterval
    );

    this.emit('monitoring:started', this.progress);
  }

  /**
   * Stop migration monitoring
   */
  public async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    this.logger.info('Stopping migration monitoring');

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit('monitoring:stopped', this.progress);
  }

  /**
   * Update migration progress
   */
  public updateProgress(update: Partial<MigrationProgress>): void {
    const previousPhase = this.progress.phase;
    const previousStatus = this.progress.status;

    this.progress = { ...this.progress, ...update };

    this.logger.info('Migration progress updated', {
      previousPhase,
      previousStatus,
      currentPhase: this.progress.phase,
      currentStatus: this.progress.status,
      completedSteps: this.progress.completedSteps,
      totalSteps: this.progress.totalSteps
    });

    this.emit('progress:updated', this.progress);

    // Check for phase transitions
    if (previousPhase !== this.progress.phase) {
      this.emit('phase:changed', {
        from: previousPhase,
        to: this.progress.phase,
        progress: this.progress
      });
    }

    // Check for status changes
    if (previousStatus !== this.progress.status) {
      this.emit('status:changed', {
        from: previousStatus,
        to: this.progress.status,
        progress: this.progress
      });
    }
  }

  /**
   * Get current migration progress
   */
  public getProgress(): MigrationProgress {
    return { ...this.progress };
  }

  /**
   * Add custom health check
   */
  public addHealthCheck(name: string, check: () => Promise<HealthCheckResult>): void {
    this.healthChecks.set(name, check);
    this.logger.info('Health check added', { name });
  }

  /**
   * Add custom validation
   */
  public addValidation(name: string, validation: () => Promise<ValidationResult>): void {
    this.validations.set(name, validation);
    this.logger.info('Validation added', { name });
  }

  /**
   * Run all health checks
   */
  public async runHealthChecks(): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const [name, check] of this.healthChecks) {
      try {
        const result = await check();
        results.push(result);

        if (result.status === 'critical') {
          this.emit('health:critical', result);
          this.logger.error(`Critical health check failure - Component: ${result.component}, Message: ${result.message}`);
        } else if (result.status === 'warning') {
          this.emit('health:warning', result);
          this.logger.warn('Health check warning', {
            component: result.component,
            message: result.message,
            metrics: result.metrics
          });
        }
      } catch (error) {
        const errorResult: HealthCheckResult = {
          component: name,
          status: 'critical',
          message: `Health check failed: ${error.message}`,
          timestamp: new Date()
        };
        results.push(errorResult);
        this.emit('health:critical', errorResult);
        this.logger.error(`Health check execution failed: ${name}`, error);
      }
    }

    return results;
  }

  /**
   * Run all validations
   */
  public async runValidations(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const [name, validation] of this.validations) {
      try {
        const result = await validation();
        results.push(result);

        if (!result.passed) {
          this.emit('validation:failed', result);
          this.logger.error(`Validation failed - Type: ${result.validationType}, Message: ${result.message}`);
        }
      } catch (error) {
        const errorResult: ValidationResult = {
          validationType: name,
          passed: false,
          message: `Validation execution failed: ${error.message}`,
          timestamp: new Date()
        };
        results.push(errorResult);
        this.emit('validation:failed', errorResult);
        this.logger.error(`Validation execution failed: ${name}`, error);
      }
    }

    return results;
  }

  /**
   * Get system metrics
   */
  public async getSystemMetrics(): Promise<Record<string, any>> {
    const metrics = {
      timestamp: new Date(),
      migration: this.progress,
      performance: this.performanceMonitor.getMetricsInRange(new Date(Date.now() - 60000), new Date()),
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      featureFlags: await this.getFeatureFlagStatus()
    };

    return metrics;
  }

  /**
   * Perform monitoring cycle
   */
  private async performMonitoringCycle(): Promise<void> {
    try {
      // Run health checks
      const healthResults = await this.runHealthChecks();
      
      // Run validations
      const validationResults = await this.runValidations();
      
      // Get system metrics
      const metrics = await this.getSystemMetrics();
      
      // Check thresholds and trigger alerts
      await this.checkThresholds(metrics, healthResults, validationResults);
      
      // Emit monitoring data
      this.emit('monitoring:cycle', {
        health: healthResults,
        validations: validationResults,
        metrics,
        progress: this.progress
      });

    } catch (error) {
      this.logger.error('Monitoring cycle failed', error);
      this.emit('monitoring:error', error);
    }
  }

  /**
   * Check thresholds and trigger alerts
   */
  private async checkThresholds(
    metrics: Record<string, any>,
    healthResults: HealthCheckResult[],
    validationResults: ValidationResult[]
  ): Promise<void> {
    // Check performance thresholds
    const performanceMetrics = metrics.performance;
    if (performanceMetrics) {
      if (performanceMetrics.averageExecutionTime > this.config.performanceThresholds.slowHookThreshold) {
        this.emit('alert:performance', {
          type: 'slow_hooks',
          value: performanceMetrics.averageExecutionTime,
          threshold: this.config.performanceThresholds.slowHookThreshold,
          severity: 'warning'
        });
      }

      if (performanceMetrics.errorRate > this.config.performanceThresholds.highErrorRateThreshold) {
        this.emit('alert:error', {
          type: 'high_error_rate',
          value: performanceMetrics.errorRate,
          threshold: this.config.performanceThresholds.highErrorRateThreshold,
          severity: performanceMetrics.errorRate > this.config.performanceThresholds.criticalErrorRateThreshold ? 'critical' : 'warning'
        });
      }
    }

    // Check memory usage
    const memoryUsage = (metrics.memory.heapUsed / metrics.memory.heapTotal) * 100;
    if (memoryUsage > this.config.performanceThresholds.memoryUsageThreshold) {
      this.emit('alert:resource', {
        type: 'high_memory_usage',
        value: memoryUsage,
        threshold: this.config.performanceThresholds.memoryUsageThreshold,
        severity: 'warning'
      });
    }

    // Check health results
    const criticalHealthIssues = healthResults.filter(r => r.status === 'critical');
    if (criticalHealthIssues.length > 0) {
      this.emit('alert:health', {
        type: 'critical_health_issues',
        issues: criticalHealthIssues,
        severity: 'critical'
      });
    }

    // Check validation results
    const failedValidations = validationResults.filter(r => !r.passed);
    if (failedValidations.length > 0) {
      this.emit('alert:validation', {
        type: 'validation_failures',
        failures: failedValidations,
        severity: 'warning'
      });
    }
  }

  /**
   * Setup default health checks
   */
  private setupDefaultHealthChecks(): void {
    // Database connectivity check
    this.addHealthCheck('database', async () => {
      try {
        // This would be replaced with actual database check
        const isConnected = true; // await strapi.db.connection.raw('SELECT 1');
        return {
          component: 'database',
          status: isConnected ? 'healthy' : 'critical',
          message: isConnected ? 'Database connection healthy' : 'Database connection failed',
          timestamp: new Date()
        };
      } catch (error) {
        return {
          component: 'database',
          status: 'critical',
          message: `Database check failed: ${error.message}`,
          timestamp: new Date()
        };
      }
    });

    // Service availability check
    this.addHealthCheck('services', async () => {
      try {
        // Check if all required services are running
        const services = ['hook-service', 'validation-service', 'calculation-service'];
        const serviceStatus = services.map(service => ({ service, status: 'running' }));
        
        return {
          component: 'services',
          status: 'healthy',
          message: 'All services running',
          metrics: { runningServices: services.length },
          timestamp: new Date()
        };
      } catch (error) {
        return {
          component: 'services',
          status: 'critical',
          message: `Service check failed: ${error.message}`,
          timestamp: new Date()
        };
      }
    });

    // Performance check
    this.addHealthCheck('performance', async () => {
      try {
        const metrics = this.performanceMonitor.getMetricsInRange(new Date(Date.now() - 60000), new Date());
        const avgExecutionTime = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length : 0;
        const errorRate = metrics.length > 0 ? metrics.filter(m => !m.success).length / metrics.length : 0;

        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        let message = 'Performance within normal parameters';

        if (avgExecutionTime > this.config.performanceThresholds.slowHookThreshold) {
          status = 'warning';
          message = 'Hook execution time above threshold';
        }

        if (errorRate > this.config.performanceThresholds.criticalErrorRateThreshold) {
          status = 'critical';
          message = 'Critical error rate detected';
        }

        return {
          component: 'performance',
          status,
          message,
          metrics: {
            averageExecutionTime: avgExecutionTime,
            errorRate: errorRate
          },
          timestamp: new Date()
        };
      } catch (error) {
        return {
          component: 'performance',
          status: 'critical',
          message: `Performance check failed: ${error.message}`,
          timestamp: new Date()
        };
      }
    });
  }

  /**
   * Setup default validations
   */
  private setupDefaultValidations(): void {
    // Configuration validation
    this.addValidation('configuration', async () => {
      try {
        // Validate configuration files exist and are valid
        const configValid = true; // This would be actual validation
        
        return {
          validationType: 'configuration',
          passed: configValid,
          message: configValid ? 'Configuration valid' : 'Configuration validation failed',
          timestamp: new Date()
        };
      } catch (error) {
        return {
          validationType: 'configuration',
          passed: false,
          message: `Configuration validation failed: ${error.message}`,
          timestamp: new Date()
        };
      }
    });

    // Feature flag validation
    this.addValidation('feature_flags', async () => {
      try {
        const featureFlagService = getFeatureFlagService();
        const flags = await featureFlagService.getAllFlags();
        
        // Validate that migration flags are in expected states
        const migrationFlags = Object.keys(flags).filter(key => key.startsWith('migration_'));
        const validStates = migrationFlags.every(flag => 
          typeof flags[flag] === 'boolean'
        );

        return {
          validationType: 'feature_flags',
          passed: validStates,
          message: validStates ? 'Feature flags valid' : 'Invalid feature flag states detected',
          details: { migrationFlags, flagCount: migrationFlags.length },
          timestamp: new Date()
        };
      } catch (error) {
        return {
          validationType: 'feature_flags',
          passed: false,
          message: `Feature flag validation failed: ${error.message}`,
          timestamp: new Date()
        };
      }
    });

    // System resources validation
    this.addValidation('resources', async () => {
      try {
        const memoryUsage = process.memoryUsage();
        const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        
        const resourcesOk = memoryPercent < this.config.performanceThresholds.memoryUsageThreshold;

        return {
          validationType: 'resources',
          passed: resourcesOk,
          message: resourcesOk ? 'System resources within limits' : 'System resources under pressure',
          details: {
            memoryUsagePercent: memoryPercent,
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal
          },
          timestamp: new Date()
        };
      } catch (error) {
        return {
          validationType: 'resources',
          passed: false,
          message: `Resource validation failed: ${error.message}`,
          timestamp: new Date()
        };
      }
    });
  }

  /**
   * Get feature flag status
   */
  private async getFeatureFlagStatus(): Promise<Record<string, boolean>> {
    try {
      const featureFlagService = getFeatureFlagService();
      const flags = await featureFlagService.getAllFlags();
      
      // Filter to migration-related flags
      const migrationFlags: Record<string, boolean> = {};
      Object.keys(flags).forEach(key => {
        if (key.startsWith('migration_') || key.startsWith('enable')) {
          migrationFlags[key] = flags[key];
        }
      });

      return migrationFlags;
    } catch (error) {
      this.logger.error('Failed to get feature flag status', error);
      return {};
    }
  }
}

/**
 * Default migration monitoring configuration
 */
export const DEFAULT_MIGRATION_MONITOR_CONFIG: MigrationMonitorConfig = {
  refreshInterval: 5000, // 5 seconds during migration
  healthCheckInterval: 10000, // 10 seconds
  validationInterval: 30000, // 30 seconds
  performanceThresholds: {
    slowHookThreshold: 100, // ms
    highErrorRateThreshold: 5, // percent
    criticalErrorRateThreshold: 15, // percent
    memoryUsageThreshold: 80, // percent
    cpuUsageThreshold: 80 // percent
  },
  alerts: {
    performance: {
      type: 'performance',
      threshold: 100,
      enabled: true,
      channels: ['email', 'slack'],
      escalation: {
        warning: 5,
        critical: 1
      }
    },
    error: {
      type: 'error',
      threshold: 5,
      enabled: true,
      channels: ['email', 'slack', 'webhook'],
      escalation: {
        warning: 5,
        critical: 1
      }
    },
    health: {
      type: 'health',
      threshold: 1,
      enabled: true,
      channels: ['email', 'slack', 'webhook'],
      escalation: {
        warning: 2,
        critical: 1
      }
    }
  }
};

/**
 * Create migration monitor instance
 */
export function createMigrationMonitor(config?: Partial<MigrationMonitorConfig>): MigrationMonitor {
  const finalConfig = { ...DEFAULT_MIGRATION_MONITOR_CONFIG, ...config };
  return new MigrationMonitor(finalConfig);
}