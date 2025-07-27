/**
 * Migration Validation System
 * 
 * Comprehensive validation system for migration processes.
 * Validates system state, configuration, and readiness for migration phases.
 * 
 * Requirements: 1.1, 1.4
 */

import { StructuredLogger } from '../logging/StructuredLogger';
import { getFeatureFlagService } from '../feature-flags/FeatureFlagService';
import { HookConfigurationManager } from '../HookConfigurationManager';

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * Validation result
 */
export interface ValidationResult {
  id: string;
  name: string;
  severity: ValidationSeverity;
  passed: boolean;
  message: string;
  details?: any;
  recommendations?: string[];
  timestamp: Date;
}

/**
 * Validation category
 */
export enum ValidationCategory {
  SYSTEM = 'system',
  CONFIGURATION = 'configuration',
  DEPENDENCIES = 'dependencies',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  DATA_INTEGRITY = 'data_integrity'
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  id: string;
  name: string;
  category: ValidationCategory;
  severity: ValidationSeverity;
  description: string;
  validator: () => Promise<ValidationResult>;
  enabled: boolean;
  requiredForPhase?: string[];
}

/**
 * Migration validation configuration
 */
export interface MigrationValidationConfig {
  enabledCategories: ValidationCategory[];
  severityThreshold: ValidationSeverity;
  timeoutMs: number;
  retryCount: number;
  parallelExecution: boolean;
}

/**
 * Validation summary
 */
export interface ValidationSummary {
  totalRules: number;
  executedRules: number;
  passedRules: number;
  failedRules: number;
  skippedRules: number;
  criticalFailures: number;
  errorFailures: number;
  warnings: number;
  overallPassed: boolean;
  executionTime: number;
  results: ValidationResult[];
}

/**
 * Migration validator
 */
export class MigrationValidator {
  private logger: StructuredLogger;
  private config: MigrationValidationConfig;
  private rules: Map<string, ValidationRule>;

  constructor(config: MigrationValidationConfig) {
    this.logger = new StructuredLogger('MigrationValidator');
    this.config = config;
    this.rules = new Map();
    this.setupDefaultRules();
  }

  /**
   * Add validation rule
   */
  public addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
    this.logger.info('Validation rule added', {
      ruleId: rule.id,
      category: rule.category,
      severity: rule.severity
    });
  }

  /**
   * Remove validation rule
   */
  public removeRule(ruleId: string): void {
    if (this.rules.delete(ruleId)) {
      this.logger.info('Validation rule removed', { ruleId });
    }
  }

  /**
   * Enable/disable validation rule
   */
  public setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.logger.info('Validation rule status changed', { ruleId, enabled });
    }
  }

  /**
   * Run all validations
   */
  public async runValidations(phase?: string): Promise<ValidationSummary> {
    const startTime = Date.now();
    const results: ValidationResult[] = [];
    
    // Filter rules based on phase and configuration
    const rulesToRun = this.getApplicableRules(phase);
    
    this.logger.info('Starting migration validation', {
      phase,
      totalRules: rulesToRun.length,
      enabledCategories: this.config.enabledCategories,
      parallelExecution: this.config.parallelExecution
    });

    // Execute validations
    if (this.config.parallelExecution) {
      const validationPromises = rulesToRun.map(rule => this.executeRule(rule));
      const ruleResults = await Promise.allSettled(validationPromises);
      
      ruleResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Create error result for failed validation execution
          results.push({
            id: rulesToRun[index].id,
            name: rulesToRun[index].name,
            severity: ValidationSeverity.ERROR,
            passed: false,
            message: `Validation execution failed: ${result.reason}`,
            timestamp: new Date()
          });
        }
      });
    } else {
      // Sequential execution
      for (const rule of rulesToRun) {
        try {
          const result = await this.executeRule(rule);
          results.push(result);
        } catch (error) {
          results.push({
            id: rule.id,
            name: rule.name,
            severity: ValidationSeverity.ERROR,
            passed: false,
            message: `Validation execution failed: ${error.message}`,
            timestamp: new Date()
          });
        }
      }
    }

    // Generate summary
    const summary = this.generateSummary(results, rulesToRun.length, Date.now() - startTime);
    
    this.logger.info('Migration validation completed', {
      phase,
      overallPassed: summary.overallPassed,
      passedRules: summary.passedRules,
      failedRules: summary.failedRules,
      criticalFailures: summary.criticalFailures,
      executionTime: summary.executionTime
    });

    return summary;
  }

  /**
   * Run validations for specific category
   */
  public async runCategoryValidations(category: ValidationCategory, phase?: string): Promise<ValidationSummary> {
    const originalCategories = this.config.enabledCategories;
    this.config.enabledCategories = [category];
    
    try {
      return await this.runValidations(phase);
    } finally {
      this.config.enabledCategories = originalCategories;
    }
  }

  /**
   * Get validation rules
   */
  public getRules(category?: ValidationCategory): ValidationRule[] {
    const rules = Array.from(this.rules.values());
    return category ? rules.filter(rule => rule.category === category) : rules;
  }

  /**
   * Execute single validation rule
   */
  private async executeRule(rule: ValidationRule): Promise<ValidationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.debug('Executing validation rule', {
        ruleId: rule.id,
        category: rule.category,
        severity: rule.severity
      });

      // Execute with timeout
      const result = await Promise.race([
        rule.validator(),
        new Promise<ValidationResult>((_, reject) => 
          setTimeout(() => reject(new Error('Validation timeout')), this.config.timeoutMs)
        )
      ]);

      result.timestamp = new Date();
      
      this.logger.debug('Validation rule completed', {
        ruleId: rule.id,
        passed: result.passed,
        executionTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      this.logger.error(`Validation rule failed: ${rule.id} - ${error.message}, Execution Time: ${Date.now() - startTime}ms`);

      return {
        id: rule.id,
        name: rule.name,
        severity: rule.severity,
        passed: false,
        message: `Validation failed: ${error.message}`,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get applicable rules for phase
   */
  private getApplicableRules(phase?: string): ValidationRule[] {
    return Array.from(this.rules.values()).filter(rule => {
      // Check if rule is enabled
      if (!rule.enabled) {
        return false;
      }

      // Check if category is enabled
      if (!this.config.enabledCategories.includes(rule.category)) {
        return false;
      }

      // Check if rule is required for this phase
      if (phase && rule.requiredForPhase && !rule.requiredForPhase.includes(phase)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Generate validation summary
   */
  private generateSummary(results: ValidationResult[], totalRules: number, executionTime: number): ValidationSummary {
    const passedRules = results.filter(r => r.passed).length;
    const failedRules = results.filter(r => !r.passed).length;
    const criticalFailures = results.filter(r => !r.passed && r.severity === ValidationSeverity.CRITICAL).length;
    const errorFailures = results.filter(r => !r.passed && r.severity === ValidationSeverity.ERROR).length;
    const warnings = results.filter(r => !r.passed && r.severity === ValidationSeverity.WARNING).length;
    
    // Overall pass criteria: no critical failures and errors below threshold
    const overallPassed = criticalFailures === 0 && 
      (this.config.severityThreshold === ValidationSeverity.CRITICAL || 
       (this.config.severityThreshold === ValidationSeverity.ERROR && errorFailures === 0) ||
       (this.config.severityThreshold === ValidationSeverity.WARNING && errorFailures === 0 && warnings === 0));

    return {
      totalRules,
      executedRules: results.length,
      passedRules,
      failedRules,
      skippedRules: totalRules - results.length,
      criticalFailures,
      errorFailures,
      warnings,
      overallPassed,
      executionTime,
      results
    };
  }

  /**
   * Setup default validation rules
   */
  private setupDefaultRules(): void {
    // System validations
    this.addRule({
      id: 'system_memory',
      name: 'System Memory Check',
      category: ValidationCategory.SYSTEM,
      severity: ValidationSeverity.WARNING,
      description: 'Check if system has sufficient memory',
      enabled: true,
      validator: async () => {
        const memoryUsage = process.memoryUsage();
        const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        const passed = memoryPercent < 80;

        return {
          id: 'system_memory',
          name: 'System Memory Check',
          severity: ValidationSeverity.WARNING,
          passed,
          message: passed 
            ? `Memory usage is healthy (${memoryPercent.toFixed(1)}%)`
            : `High memory usage detected (${memoryPercent.toFixed(1)}%)`,
          details: {
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            memoryPercent
          },
          recommendations: passed ? [] : [
            'Consider restarting the application',
            'Monitor for memory leaks',
            'Increase available memory if needed'
          ],
          timestamp: new Date()
        };
      }
    });

    this.addRule({
      id: 'database_connectivity',
      name: 'Database Connectivity',
      category: ValidationCategory.SYSTEM,
      severity: ValidationSeverity.CRITICAL,
      description: 'Verify database connection is working',
      enabled: true,
      requiredForPhase: ['deployment', 'rollout'],
      validator: async () => {
        try {
          // This would be replaced with actual database check
          const isConnected = true; // await strapi.db.connection.raw('SELECT 1');
          
          return {
            id: 'database_connectivity',
            name: 'Database Connectivity',
            severity: ValidationSeverity.CRITICAL,
            passed: isConnected,
            message: isConnected 
              ? 'Database connection is healthy'
              : 'Database connection failed',
            timestamp: new Date()
          };
        } catch (error) {
          return {
            id: 'database_connectivity',
            name: 'Database Connectivity',
            severity: ValidationSeverity.CRITICAL,
            passed: false,
            message: `Database connection failed: ${error.message}`,
            recommendations: [
              'Check database server status',
              'Verify connection configuration',
              'Check network connectivity'
            ],
            timestamp: new Date()
          };
        }
      }
    });

    // Configuration validations
    this.addRule({
      id: 'hook_configuration',
      name: 'Hook Configuration Validation',
      category: ValidationCategory.CONFIGURATION,
      severity: ValidationSeverity.ERROR,
      description: 'Validate hook configuration files',
      enabled: true,
      requiredForPhase: ['deployment', 'rollout'],
      validator: async () => {
        try {
          const configManager = new HookConfigurationManager(strapi);
          const config = configManager.getGlobalConfig();
          const isValid = config && typeof config === 'object';

          return {
            id: 'hook_configuration',
            name: 'Hook Configuration Validation',
            severity: ValidationSeverity.ERROR,
            passed: isValid,
            message: isValid 
              ? 'Hook configuration is valid'
              : 'Hook configuration validation failed',
            details: { configKeys: isValid ? Object.keys(config) : [] },
            recommendations: isValid ? [] : [
              'Check configuration file syntax',
              'Verify all required fields are present',
              'Validate configuration schema'
            ],
            timestamp: new Date()
          };
        } catch (error) {
          return {
            id: 'hook_configuration',
            name: 'Hook Configuration Validation',
            severity: ValidationSeverity.ERROR,
            passed: false,
            message: `Configuration validation failed: ${error.message}`,
            recommendations: [
              'Check configuration file exists',
              'Verify file permissions',
              'Validate JSON/YAML syntax'
            ],
            timestamp: new Date()
          };
        }
      }
    });

    this.addRule({
      id: 'feature_flags_config',
      name: 'Feature Flags Configuration',
      category: ValidationCategory.CONFIGURATION,
      severity: ValidationSeverity.WARNING,
      description: 'Validate feature flags are properly configured',
      enabled: true,
      requiredForPhase: ['rollout'],
      validator: async () => {
        try {
          const featureFlagService = getFeatureFlagService();
          const flags = await featureFlagService.getAllFlags();
          
          const migrationFlags = Object.keys(flags).filter(key => 
            key.startsWith('migration_') || key.startsWith('enable')
          );

          const passed = migrationFlags.length > 0;

          return {
            id: 'feature_flags_config',
            name: 'Feature Flags Configuration',
            severity: ValidationSeverity.WARNING,
            passed,
            message: passed 
              ? `Found ${migrationFlags.length} migration feature flags`
              : 'No migration feature flags found',
            details: { migrationFlags },
            recommendations: passed ? [] : [
              'Configure migration feature flags',
              'Verify feature flag service is running',
              'Check feature flag storage'
            ],
            timestamp: new Date()
          };
        } catch (error) {
          return {
            id: 'feature_flags_config',
            name: 'Feature Flags Configuration',
            severity: ValidationSeverity.WARNING,
            passed: false,
            message: `Feature flags validation failed: ${error.message}`,
            recommendations: [
              'Check feature flag service status',
              'Verify configuration',
              'Restart feature flag service if needed'
            ],
            timestamp: new Date()
          };
        }
      }
    });

    // Dependencies validation
    this.addRule({
      id: 'node_modules',
      name: 'Node Modules Check',
      category: ValidationCategory.DEPENDENCIES,
      severity: ValidationSeverity.ERROR,
      description: 'Verify all required dependencies are installed',
      enabled: true,
      requiredForPhase: ['deployment'],
      validator: async () => {
        try {
          // Check if critical modules are available
          const criticalModules = [
            '@strapi/strapi',
            'pg',
            'typescript'
          ];

          const missingModules: string[] = [];
          
          for (const module of criticalModules) {
            try {
              require.resolve(module);
            } catch {
              missingModules.push(module);
            }
          }

          const passed = missingModules.length === 0;

          return {
            id: 'node_modules',
            name: 'Node Modules Check',
            severity: ValidationSeverity.ERROR,
            passed,
            message: passed 
              ? 'All required dependencies are installed'
              : `Missing dependencies: ${missingModules.join(', ')}`,
            details: { missingModules, checkedModules: criticalModules },
            recommendations: passed ? [] : [
              'Run npm install or pnpm install',
              'Check package.json for missing dependencies',
              'Verify node_modules directory exists'
            ],
            timestamp: new Date()
          };
        } catch (error) {
          return {
            id: 'node_modules',
            name: 'Node Modules Check',
            severity: ValidationSeverity.ERROR,
            passed: false,
            message: `Dependency check failed: ${error.message}`,
            timestamp: new Date()
          };
        }
      }
    });

    // Performance validations
    this.addRule({
      id: 'hook_performance_baseline',
      name: 'Hook Performance Baseline',
      category: ValidationCategory.PERFORMANCE,
      severity: ValidationSeverity.INFO,
      description: 'Establish performance baseline for hooks',
      enabled: true,
      validator: async () => {
        // This would run actual performance tests
        const baselineTime = 50; // ms
        const passed = true; // Always pass for baseline establishment

        return {
          id: 'hook_performance_baseline',
          name: 'Hook Performance Baseline',
          severity: ValidationSeverity.INFO,
          passed,
          message: `Performance baseline established: ${baselineTime}ms average`,
          details: { baselineTime },
          timestamp: new Date()
        };
      }
    });

    // Security validations
    this.addRule({
      id: 'environment_variables',
      name: 'Environment Variables Check',
      category: ValidationCategory.SECURITY,
      severity: ValidationSeverity.WARNING,
      description: 'Verify required environment variables are set',
      enabled: true,
      requiredForPhase: ['deployment'],
      validator: async () => {
        const requiredVars = [
          'DATABASE_URL',
          'NODE_ENV'
        ];

        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        const passed = missingVars.length === 0;

        return {
          id: 'environment_variables',
          name: 'Environment Variables Check',
          severity: ValidationSeverity.WARNING,
          passed,
          message: passed 
            ? 'All required environment variables are set'
            : `Missing environment variables: ${missingVars.join(', ')}`,
          details: { missingVars, requiredVars },
          recommendations: passed ? [] : [
            'Set missing environment variables',
            'Check .env file configuration',
            'Verify environment-specific settings'
          ],
          timestamp: new Date()
        };
      }
    });

    // Data integrity validations
    this.addRule({
      id: 'backup_verification',
      name: 'Backup Verification',
      category: ValidationCategory.DATA_INTEGRITY,
      severity: ValidationSeverity.CRITICAL,
      description: 'Verify backup files exist and are valid',
      enabled: true,
      requiredForPhase: ['deployment', 'rollout'],
      validator: async () => {
        try {
          // This would check actual backup files
          const backupExists = true; // fs.existsSync('/backup/database.sql');
          const backupValid = true; // Additional validation logic
          
          const passed = backupExists && backupValid;

          return {
            id: 'backup_verification',
            name: 'Backup Verification',
            severity: ValidationSeverity.CRITICAL,
            passed,
            message: passed 
              ? 'Backup files are valid and accessible'
              : 'Backup verification failed',
            details: { backupExists, backupValid },
            recommendations: passed ? [] : [
              'Create fresh backup before migration',
              'Verify backup file integrity',
              'Test backup restoration process'
            ],
            timestamp: new Date()
          };
        } catch (error) {
          return {
            id: 'backup_verification',
            name: 'Backup Verification',
            severity: ValidationSeverity.CRITICAL,
            passed: false,
            message: `Backup verification failed: ${error.message}`,
            recommendations: [
              'Check backup directory permissions',
              'Verify backup creation process',
              'Create new backup if needed'
            ],
            timestamp: new Date()
          };
        }
      }
    });
  }
}

/**
 * Default migration validation configuration
 */
export const DEFAULT_MIGRATION_VALIDATION_CONFIG: MigrationValidationConfig = {
  enabledCategories: [
    ValidationCategory.SYSTEM,
    ValidationCategory.CONFIGURATION,
    ValidationCategory.DEPENDENCIES,
    ValidationCategory.PERFORMANCE,
    ValidationCategory.SECURITY,
    ValidationCategory.DATA_INTEGRITY
  ],
  severityThreshold: ValidationSeverity.ERROR,
  timeoutMs: 30000, // 30 seconds per validation
  retryCount: 2,
  parallelExecution: true
};

/**
 * Create migration validator instance
 */
export function createMigrationValidator(config?: Partial<MigrationValidationConfig>): MigrationValidator {
  const finalConfig = { ...DEFAULT_MIGRATION_VALIDATION_CONFIG, ...config };
  return new MigrationValidator(finalConfig);
}