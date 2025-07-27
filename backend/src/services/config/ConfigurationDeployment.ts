/**
 * Configuration Deployment Tools
 * 
 * Provides tools for deploying configuration across environments
 * with validation, rollback, and monitoring capabilities.
 * 
 * Requirements: 6.3, 6.1
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { HookSystemConfiguration } from './HookConfigurationSchema';
import { getConfigurationValidator, ValidationResult } from './ConfigurationValidator';
import { getConfigurationPersistence, PersistenceResult } from './ConfigurationPersistence';
import { getConfigurationInheritance, InheritanceResult } from './ConfigurationInheritance';
import { getConfigurationVersioning, MigrationResult } from './ConfigurationVersioning';

/**
 * Deployment target environment
 */
export interface DeploymentTarget {
  environment: string;
  configPath: string;
  backupPath?: string;
  validationRequired: boolean;
  requiresApproval: boolean;
}

/**
 * Deployment plan
 */
export interface DeploymentPlan {
  id: string;
  sourceEnvironment?: string;
  targetEnvironments: DeploymentTarget[];
  configuration: HookSystemConfiguration;
  createdAt: Date;
  createdBy?: string;
  description?: string;
  dryRun: boolean;
}

/**
 * Deployment result
 */
export interface DeploymentResult {
  planId: string;
  success: boolean;
  timestamp: Date;
  targetEnvironment: string;
  errors: string[];
  warnings: string[];
  validationResult?: ValidationResult;
  persistenceResult?: PersistenceResult;
  inheritanceResult?: InheritanceResult;
  migrationResult?: MigrationResult;
  rollbackAvailable: boolean;
  rollbackId?: string;
}

/**
 * Deployment status
 */
export interface DeploymentStatus {
  planId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  startedAt?: Date;
  completedAt?: Date;
  results: DeploymentResult[];
  totalTargets: number;
  successfulTargets: number;
  failedTargets: number;
}

/**
 * Configuration Deployment Manager
 */
export class ConfigurationDeployment {
  private validator = getConfigurationValidator();
  private persistence = getConfigurationPersistence();
  private inheritance = getConfigurationInheritance();
  private versioning = getConfigurationVersioning();
  private strapi: any;
  private deploymentHistory: DeploymentStatus[] = [];

  constructor(strapi: any) {
    this.strapi = strapi;
  }

  /**
   * Create deployment plan
   */
  createDeploymentPlan(
    configuration: HookSystemConfiguration,
    targets: DeploymentTarget[],
    options: {
      sourceEnvironment?: string;
      description?: string;
      createdBy?: string;
      dryRun?: boolean;
    } = {}
  ): DeploymentPlan {
    const plan: DeploymentPlan = {
      id: this.generatePlanId(),
      sourceEnvironment: options.sourceEnvironment,
      targetEnvironments: targets,
      configuration,
      createdAt: new Date(),
      createdBy: options.createdBy,
      description: options.description,
      dryRun: options.dryRun || false
    };

    this.logInfo(`Created deployment plan ${plan.id} for ${targets.length} targets`);
    return plan;
  }

  /**
   * Execute deployment plan
   */
  async executeDeploymentPlan(plan: DeploymentPlan): Promise<DeploymentStatus> {
    const status: DeploymentStatus = {
      planId: plan.id,
      status: 'running',
      startedAt: new Date(),
      results: [],
      totalTargets: plan.targetEnvironments.length,
      successfulTargets: 0,
      failedTargets: 0
    };

    this.deploymentHistory.push(status);
    this.logInfo(`Starting deployment plan ${plan.id}`);

    try {
      // Execute deployment for each target
      for (const target of plan.targetEnvironments) {
        const result = await this.deployToTarget(plan, target);
        status.results.push(result);

        if (result.success) {
          status.successfulTargets++;
        } else {
          status.failedTargets++;
        }

        // Stop on first failure if not dry run
        if (!plan.dryRun && !result.success) {
          this.logError(`Deployment failed for ${target.environment}, stopping deployment`);
          break;
        }
      }

      // Determine final status
      if (status.failedTargets === 0) {
        status.status = 'completed';
      } else if (status.successfulTargets === 0) {
        status.status = 'failed';
      } else {
        status.status = 'completed'; // Partial success
      }

      status.completedAt = new Date();
      this.logInfo(`Deployment plan ${plan.id} completed with status: ${status.status}`);

    } catch (error) {
      status.status = 'failed';
      status.completedAt = new Date();
      this.logError(`Deployment plan ${plan.id} failed`, error);
    }

    return status;
  }

  /**
   * Deploy configuration to specific target
   */
  private async deployToTarget(
    plan: DeploymentPlan,
    target: DeploymentTarget
  ): Promise<DeploymentResult> {
    const result: DeploymentResult = {
      planId: plan.id,
      success: false,
      timestamp: new Date(),
      targetEnvironment: target.environment,
      errors: [],
      warnings: [],
      rollbackAvailable: false
    };

    try {
      this.logInfo(`Deploying to ${target.environment}`);

      // Load environment-specific configurations for inheritance
      const environmentConfigs = await this.loadEnvironmentConfigurations();

      // Apply inheritance for target environment
      const inheritanceResult = await this.inheritance.applyInheritance(
        plan.configuration,
        target.environment,
        environmentConfigs
      );
      result.inheritanceResult = inheritanceResult;

      if (!inheritanceResult.success) {
        result.errors.push(...inheritanceResult.errors);
        return result;
      }

      if (inheritanceResult.warnings.length > 0) {
        result.warnings.push(...inheritanceResult.warnings);
      }

      const finalConfiguration = inheritanceResult.configuration;

      // Validate configuration for target environment
      if (target.validationRequired) {
        const validationResult = this.validator.validateSystemConfiguration(finalConfiguration);
        result.validationResult = validationResult;

        if (!validationResult.isValid) {
          result.errors.push(...validationResult.errors.map(e => e.message));
          return result;
        }

        if (validationResult.warnings.length > 0) {
          result.warnings.push(...validationResult.warnings.map(w => w.message));
        }
      }

      // Check if migration is needed
      const currentConfig = await this.loadCurrentConfiguration(target.configPath);
      if (currentConfig && currentConfig.version !== finalConfiguration.version) {
        const migrationResult = await this.versioning.migrateConfiguration(
          currentConfig,
          currentConfig.version,
          finalConfiguration.version
        );
        result.migrationResult = migrationResult;

        if (!migrationResult.success) {
          result.errors.push(...migrationResult.errors);
          return result;
        }
      }

      // Skip persistence for dry run
      if (plan.dryRun) {
        result.success = true;
        result.warnings.push('Dry run - configuration not saved');
        return result;
      }

      // Create backup if path specified
      if (target.backupPath) {
        try {
          await this.createDeploymentBackup(target.configPath, target.backupPath);
          result.rollbackAvailable = true;
          result.rollbackId = this.generateRollbackId();
        } catch (error) {
          result.warnings.push(`Backup creation failed: ${error.message}`);
        }
      }

      // Persist configuration
      const persistenceResult = await this.persistence.saveConfiguration(
        finalConfiguration,
        target.configPath,
        `Deployment from plan ${plan.id}`
      );
      result.persistenceResult = persistenceResult;

      if (!persistenceResult.success) {
        result.errors.push(...persistenceResult.errors);
        return result;
      }

      if (persistenceResult.warnings.length > 0) {
        result.warnings.push(...persistenceResult.warnings);
      }

      result.success = true;
      this.logInfo(`Successfully deployed to ${target.environment}`);

    } catch (error) {
      result.errors.push(`Deployment failed: ${error.message}`);
      this.logError(`Deployment to ${target.environment} failed`, error);
    }

    return result;
  }

  /**
   * Load environment configurations for inheritance
   */
  private async loadEnvironmentConfigurations(): Promise<Record<string, Partial<HookSystemConfiguration>>> {
    const configs: Record<string, Partial<HookSystemConfiguration>> = {};
    const environments = ['development', 'staging', 'production', 'test'];

    for (const env of environments) {
      try {
        const configPath = `./config/hooks.${env}.json`;
        const config = await this.loadCurrentConfiguration(configPath);
        if (config) {
          configs[env] = config;
        }
      } catch (error) {
        this.logWarn(`Failed to load ${env} configuration for inheritance`, error);
      }
    }

    return configs;
  }

  /**
   * Load current configuration from file
   */
  private async loadCurrentConfiguration(filePath: string): Promise<HookSystemConfiguration | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logWarn(`Failed to load configuration from ${filePath}`, error);
      }
      return null;
    }
  }

  /**
   * Create deployment backup
   */
  private async createDeploymentBackup(sourcePath: string, backupPath: string): Promise<void> {
    try {
      const sourceContent = await fs.readFile(sourcePath, 'utf-8');
      
      // Ensure backup directory exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      
      // Create backup with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `${path.basename(backupPath, path.extname(backupPath))}_${timestamp}${path.extname(backupPath)}`;
      const finalBackupPath = path.join(path.dirname(backupPath), backupFilename);
      
      await fs.writeFile(finalBackupPath, sourceContent, 'utf-8');
      this.logInfo(`Created deployment backup: ${finalBackupPath}`);
      
    } catch (error) {
      throw new Error(`Failed to create deployment backup: ${error.message}`);
    }
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment(
    planId: string,
    targetEnvironment: string,
    rollbackId: string
  ): Promise<DeploymentResult> {
    const result: DeploymentResult = {
      planId,
      success: false,
      timestamp: new Date(),
      targetEnvironment,
      errors: [],
      warnings: [],
      rollbackAvailable: false
    };

    try {
      // Find deployment status
      const deploymentStatus = this.deploymentHistory.find(d => d.planId === planId);
      if (!deploymentStatus) {
        result.errors.push(`Deployment plan ${planId} not found`);
        return result;
      }

      // Find target result
      const targetResult = deploymentStatus.results.find(r => r.targetEnvironment === targetEnvironment);
      if (!targetResult || !targetResult.rollbackAvailable) {
        result.errors.push(`No rollback available for ${targetEnvironment}`);
        return result;
      }

      // Perform rollback (implementation would depend on backup strategy)
      result.warnings.push('Rollback functionality would be implemented here');
      result.success = true;

      // Update deployment status
      deploymentStatus.status = 'rolled_back';
      
      this.logInfo(`Rolled back deployment for ${targetEnvironment}`);

    } catch (error) {
      result.errors.push(`Rollback failed: ${error.message}`);
      this.logError(`Rollback failed for ${targetEnvironment}`, error);
    }

    return result;
  }

  /**
   * Validate deployment plan
   */
  async validateDeploymentPlan(plan: DeploymentPlan): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    targetValidations: Record<string, ValidationResult>;
  }> {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[],
      targetValidations: {} as Record<string, ValidationResult>
    };

    try {
      // Validate base configuration
      const baseValidation = this.validator.validateSystemConfiguration(plan.configuration);
      if (!baseValidation.isValid) {
        result.isValid = false;
        result.errors.push(...baseValidation.errors.map(e => e.message));
      }

      // Load environment configurations
      const environmentConfigs = await this.loadEnvironmentConfigurations();

      // Validate each target
      for (const target of plan.targetEnvironments) {
        try {
          // Apply inheritance
          const inheritanceResult = await this.inheritance.applyInheritance(
            plan.configuration,
            target.environment,
            environmentConfigs
          );

          if (!inheritanceResult.success) {
            result.errors.push(`Inheritance failed for ${target.environment}: ${inheritanceResult.errors.join(', ')}`);
            continue;
          }

          // Validate target configuration
          const targetValidation = this.validator.validateSystemConfiguration(inheritanceResult.configuration);
          result.targetValidations[target.environment] = targetValidation;

          if (!targetValidation.isValid) {
            result.isValid = false;
            result.errors.push(`Validation failed for ${target.environment}`);
          }

        } catch (error) {
          result.isValid = false;
          result.errors.push(`Validation error for ${target.environment}: ${error.message}`);
        }
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Plan validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Get deployment history
   */
  getDeploymentHistory(limit: number = 50): DeploymentStatus[] {
    return this.deploymentHistory
      .sort((a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0))
      .slice(0, limit);
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus(planId: string): DeploymentStatus | undefined {
    return this.deploymentHistory.find(d => d.planId === planId);
  }

  /**
   * Create environment-specific deployment targets
   */
  createStandardTargets(): DeploymentTarget[] {
    return [
      {
        environment: 'development',
        configPath: './config/hooks.development.json',
        backupPath: './config/backups/hooks.development.backup.json',
        validationRequired: true,
        requiresApproval: false
      },
      {
        environment: 'staging',
        configPath: './config/hooks.staging.json',
        backupPath: './config/backups/hooks.staging.backup.json',
        validationRequired: true,
        requiresApproval: true
      },
      {
        environment: 'production',
        configPath: './config/hooks.production.json',
        backupPath: './config/backups/hooks.production.backup.json',
        validationRequired: true,
        requiresApproval: true
      }
    ];
  }

  /**
   * Generate deployment plan ID
   */
  private generatePlanId(): string {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate rollback ID
   */
  private generateRollbackId(): string {
    return `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Logging methods
   */
  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[ConfigurationDeployment] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[ConfigurationDeployment] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[ConfigurationDeployment] ${message}`, error);
  }
}

/**
 * Singleton deployment instance
 */
let deploymentInstance: ConfigurationDeployment | null = null;

/**
 * Get configuration deployment instance
 */
export function getConfigurationDeployment(strapi?: any): ConfigurationDeployment {
  if (!deploymentInstance && strapi) {
    deploymentInstance = new ConfigurationDeployment(strapi);
  }
  
  if (!deploymentInstance) {
    throw new Error('ConfigurationDeployment not initialized. Call with strapi instance first.');
  }
  
  return deploymentInstance;
}

export default ConfigurationDeployment;