/**
 * Configuration Update Manager
 * 
 * Handles runtime configuration updates with validation, rollback,
 * and notification capabilities for the hook system.
 * 
 * Requirements: 6.1, 6.3
 */

import { EventEmitter } from 'events';
import {
  HookSystemConfiguration,
  HookConfiguration,
  FactoryConfiguration,
  ContentTypeConfiguration,
  FeatureFlagsConfiguration
} from './HookConfigurationSchema';
import { getConfigurationValidator, ValidationResult } from './ConfigurationValidator';
import { getConfigurationPersistence, PersistenceResult } from './ConfigurationPersistence';
import { getConfigurationLoader } from './ConfigurationLoader';

/**
 * Configuration update types
 */
export type ConfigurationUpdateType = 'global' | 'factory' | 'contentType' | 'featureFlag' | 'full';

/**
 * Configuration update request
 */
export interface ConfigurationUpdateRequest {
  type: ConfigurationUpdateType;
  path?: string; // For content type updates
  data: any;
  reason?: string;
  author?: string;
  validateOnly?: boolean;
  skipBackup?: boolean;
}

/**
 * Configuration update result
 */
export interface ConfigurationUpdateResult {
  success: boolean;
  updateId: string;
  timestamp: Date;
  type: ConfigurationUpdateType;
  path?: string;
  errors: string[];
  warnings: string[];
  validationResult?: ValidationResult;
  persistenceResult?: PersistenceResult;
  rollbackId?: string;
}

/**
 * Configuration change event
 */
export interface ConfigurationChangeEvent {
  updateId: string;
  type: ConfigurationUpdateType;
  path?: string;
  oldValue: any;
  newValue: any;
  timestamp: Date;
  author?: string;
  reason?: string;
}

/**
 * Update history entry
 */
export interface UpdateHistoryEntry {
  updateId: string;
  timestamp: Date;
  type: ConfigurationUpdateType;
  path?: string;
  author?: string;
  reason?: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  rollbackId?: string;
  rolledBack?: boolean;
}

/**
 * Configuration Update Manager Class
 */
export class ConfigurationUpdateManager extends EventEmitter {
  private currentConfiguration: HookSystemConfiguration | null = null;
  private updateHistory: UpdateHistoryEntry[] = [];
  private rollbackStack: Array<{
    updateId: string;
    configuration: HookSystemConfiguration;
    timestamp: Date;
  }> = [];
  private validator = getConfigurationValidator();
  private persistence = getConfigurationPersistence();
  private loader = getConfigurationLoader();
  private strapi: any;
  private configurationFilePath: string;

  constructor(strapi: any, configurationFilePath: string = './config/hooks.json') {
    super();
    this.strapi = strapi;
    this.configurationFilePath = configurationFilePath;
  }

  /**
   * Initialize with current configuration
   */
  async initialize(): Promise<void> {
    try {
      const loadResult = await this.loader.loadConfiguration();
      
      if (loadResult.success && loadResult.configuration) {
        this.currentConfiguration = loadResult.configuration;
        this.logInfo('Configuration update manager initialized');
      } else {
        throw new Error(`Failed to load initial configuration: ${loadResult.errors.join(', ')}`);
      }
    } catch (error) {
      this.logError('Failed to initialize configuration update manager', error);
      throw error;
    }
  }

  /**
   * Update global configuration
   */
  async updateGlobalConfiguration(
    updates: Partial<HookConfiguration>,
    options: {
      reason?: string;
      author?: string;
      validateOnly?: boolean;
      skipBackup?: boolean;
    } = {}
  ): Promise<ConfigurationUpdateResult> {
    return this.updateConfiguration({
      type: 'global',
      data: updates,
      ...options
    });
  }

  /**
   * Update factory configuration
   */
  async updateFactoryConfiguration(
    updates: Partial<FactoryConfiguration>,
    options: {
      reason?: string;
      author?: string;
      validateOnly?: boolean;
      skipBackup?: boolean;
    } = {}
  ): Promise<ConfigurationUpdateResult> {
    return this.updateConfiguration({
      type: 'factory',
      data: updates,
      ...options
    });
  }

  /**
   * Update content type configuration
   */
  async updateContentTypeConfiguration(
    contentType: string,
    updates: Partial<ContentTypeConfiguration>,
    options: {
      reason?: string;
      author?: string;
      validateOnly?: boolean;
      skipBackup?: boolean;
    } = {}
  ): Promise<ConfigurationUpdateResult> {
    return this.updateConfiguration({
      type: 'contentType',
      path: contentType,
      data: updates,
      ...options
    });
  }

  /**
   * Update feature flags
   */
  async updateFeatureFlags(
    updates: Partial<FeatureFlagsConfiguration>,
    options: {
      reason?: string;
      author?: string;
      validateOnly?: boolean;
      skipBackup?: boolean;
    } = {}
  ): Promise<ConfigurationUpdateResult> {
    return this.updateConfiguration({
      type: 'featureFlag',
      data: updates,
      ...options
    });
  }

  /**
   * Update complete configuration
   */
  async updateFullConfiguration(
    configuration: HookSystemConfiguration,
    options: {
      reason?: string;
      author?: string;
      validateOnly?: boolean;
      skipBackup?: boolean;
    } = {}
  ): Promise<ConfigurationUpdateResult> {
    return this.updateConfiguration({
      type: 'full',
      data: configuration,
      ...options
    });
  }

  /**
   * Generic configuration update method
   */
  private async updateConfiguration(request: ConfigurationUpdateRequest): Promise<ConfigurationUpdateResult> {
    const updateId = this.generateUpdateId();
    const result: ConfigurationUpdateResult = {
      success: false,
      updateId,
      timestamp: new Date(),
      type: request.type,
      path: request.path,
      errors: [],
      warnings: []
    };

    try {
      if (!this.currentConfiguration) {
        result.errors.push('Configuration not initialized');
        return result;
      }

      // Create updated configuration
      const updatedConfiguration = this.applyUpdate(this.currentConfiguration, request);

      // Validate updated configuration
      const validationResult = this.validateUpdate(updatedConfiguration, request);
      result.validationResult = validationResult;

      if (!validationResult.isValid) {
        result.errors.push(...validationResult.errors.map(e => e.message));
        return result;
      }

      if (validationResult.warnings.length > 0) {
        result.warnings.push(...validationResult.warnings.map(w => w.message));
      }

      // If validation only, return here
      if (request.validateOnly) {
        result.success = true;
        result.warnings.push('Validation only - configuration not saved');
        return result;
      }

      // Create rollback point
      if (!request.skipBackup) {
        this.createRollbackPoint(updateId, this.currentConfiguration);
        result.rollbackId = updateId;
      }

      // Persist configuration
      const persistenceResult = await this.persistence.saveConfiguration(
        updatedConfiguration,
        this.configurationFilePath,
        request.reason || 'Configuration update'
      );
      result.persistenceResult = persistenceResult;

      if (!persistenceResult.success) {
        result.errors.push(...persistenceResult.errors);
        return result;
      }

      if (persistenceResult.warnings.length > 0) {
        result.warnings.push(...persistenceResult.warnings);
      }

      // Update current configuration
      const oldConfiguration = { ...this.currentConfiguration };
      this.currentConfiguration = updatedConfiguration;

      // Emit change event
      this.emitChangeEvent({
        updateId,
        type: request.type,
        path: request.path,
        oldValue: this.extractValue(oldConfiguration, request),
        newValue: this.extractValue(updatedConfiguration, request),
        timestamp: result.timestamp,
        author: request.author,
        reason: request.reason
      });

      // Add to history
      this.addToHistory({
        updateId,
        timestamp: result.timestamp,
        type: request.type,
        path: request.path,
        author: request.author,
        reason: request.reason,
        success: true,
        errors: [],
        warnings: result.warnings,
        rollbackId: result.rollbackId
      });

      result.success = true;
      this.logInfo(`Configuration updated successfully: ${request.type}`, { updateId });

    } catch (error) {
      result.errors.push(`Update failed: ${error.message}`);
      this.logError(`Configuration update failed: ${request.type}`, error);

      // Add failed update to history
      this.addToHistory({
        updateId,
        timestamp: result.timestamp,
        type: request.type,
        path: request.path,
        author: request.author,
        reason: request.reason,
        success: false,
        errors: result.errors,
        warnings: result.warnings
      });
    }

    return result;
  }

  /**
   * Apply update to configuration
   */
  private applyUpdate(
    config: HookSystemConfiguration,
    request: ConfigurationUpdateRequest
  ): HookSystemConfiguration {
    const updatedConfig = JSON.parse(JSON.stringify(config)); // Deep clone

    switch (request.type) {
      case 'global':
        updatedConfig.global = { ...updatedConfig.global, ...request.data };
        break;
      
      case 'factory':
        updatedConfig.factory = { ...updatedConfig.factory, ...request.data };
        break;
      
      case 'contentType':
        if (!request.path) {
          throw new Error('Content type path is required for content type updates');
        }
        updatedConfig.contentTypes[request.path] = {
          ...updatedConfig.contentTypes[request.path],
          ...request.data
        };
        break;
      
      case 'featureFlag':
        updatedConfig.featureFlags = { ...updatedConfig.featureFlags, ...request.data };
        break;
      
      case 'full':
        Object.assign(updatedConfig, request.data);
        break;
      
      default:
        throw new Error(`Unknown update type: ${request.type}`);
    }

    // Update metadata
    updatedConfig.metadata = {
      ...updatedConfig.metadata,
      updatedAt: new Date(),
      updatedBy: request.author
    };

    return updatedConfig;
  }

  /**
   * Validate configuration update
   */
  private validateUpdate(
    config: HookSystemConfiguration,
    request: ConfigurationUpdateRequest
  ): ValidationResult {
    // Full system validation
    const systemValidation = this.validator.validateSystemConfiguration(config);
    
    // Additional update-specific validation
    const updateValidation = this.validateUpdateSpecific(config, request);
    
    return {
      isValid: systemValidation.isValid && updateValidation.isValid,
      errors: [...systemValidation.errors, ...updateValidation.errors],
      warnings: [...systemValidation.warnings, ...updateValidation.warnings],
      suggestions: [...systemValidation.suggestions, ...updateValidation.suggestions]
    };
  }

  /**
   * Update-specific validation
   */
  private validateUpdateSpecific(
    config: HookSystemConfiguration,
    request: ConfigurationUpdateRequest
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Validate content type exists for content type updates
    if (request.type === 'contentType' && request.path) {
      // In a real implementation, you would check if the content type exists in Strapi
      // For now, we'll just validate the path format
      if (!/^[a-z][a-z0-9-]*$/.test(request.path)) {
        result.errors.push({
          field: 'contentType',
          message: 'Content type name must be lowercase with hyphens',
          code: 'INVALID_CONTENT_TYPE_NAME',
          value: request.path
        });
      }
    }

    // Validate feature flag names
    if (request.type === 'featureFlag') {
      for (const flagName of Object.keys(request.data)) {
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(flagName)) {
          result.errors.push({
            field: flagName,
            message: 'Feature flag names must be camelCase',
            code: 'INVALID_FEATURE_FLAG_NAME',
            value: flagName
          });
        }
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Extract value from configuration for change events
   */
  private extractValue(config: HookSystemConfiguration, request: ConfigurationUpdateRequest): any {
    switch (request.type) {
      case 'global':
        return config.global;
      case 'factory':
        return config.factory;
      case 'contentType':
        return request.path ? config.contentTypes[request.path] : config.contentTypes;
      case 'featureFlag':
        return config.featureFlags;
      case 'full':
        return config;
      default:
        return null;
    }
  }

  /**
   * Create rollback point
   */
  private createRollbackPoint(updateId: string, configuration: HookSystemConfiguration): void {
    this.rollbackStack.push({
      updateId,
      configuration: JSON.parse(JSON.stringify(configuration)), // Deep clone
      timestamp: new Date()
    });

    // Keep only last 20 rollback points
    if (this.rollbackStack.length > 20) {
      this.rollbackStack = this.rollbackStack.slice(-20);
    }
  }

  /**
   * Rollback to previous configuration
   */
  async rollbackUpdate(updateId: string, reason?: string): Promise<ConfigurationUpdateResult> {
    const result: ConfigurationUpdateResult = {
      success: false,
      updateId: this.generateUpdateId(),
      timestamp: new Date(),
      type: 'full',
      errors: [],
      warnings: []
    };

    try {
      // Find rollback point
      const rollbackPoint = this.rollbackStack.find(point => point.updateId === updateId);
      
      if (!rollbackPoint) {
        result.errors.push(`No rollback point found for update ID: ${updateId}`);
        return result;
      }

      // Validate rollback configuration
      const validationResult = this.validator.validateSystemConfiguration(rollbackPoint.configuration);
      
      if (!validationResult.isValid) {
        result.errors.push(...validationResult.errors.map(e => e.message));
        result.errors.push('Rollback configuration is invalid');
        return result;
      }

      // Persist rollback configuration
      const persistenceResult = await this.persistence.saveConfiguration(
        rollbackPoint.configuration,
        this.configurationFilePath,
        reason || `Rollback to update ${updateId}`
      );

      if (!persistenceResult.success) {
        result.errors.push(...persistenceResult.errors);
        return result;
      }

      // Update current configuration
      const oldConfiguration = this.currentConfiguration;
      this.currentConfiguration = rollbackPoint.configuration;

      // Emit change event
      this.emitChangeEvent({
        updateId: result.updateId,
        type: 'full',
        oldValue: oldConfiguration,
        newValue: rollbackPoint.configuration,
        timestamp: result.timestamp,
        reason: reason || `Rollback to update ${updateId}`
      });

      // Mark original update as rolled back in history
      const historyEntry = this.updateHistory.find(entry => entry.updateId === updateId);
      if (historyEntry) {
        historyEntry.rolledBack = true;
      }

      // Add rollback to history
      this.addToHistory({
        updateId: result.updateId,
        timestamp: result.timestamp,
        type: 'full',
        reason: reason || `Rollback to update ${updateId}`,
        success: true,
        errors: [],
        warnings: [`Rolled back to configuration from ${rollbackPoint.timestamp.toISOString()}`]
      });

      result.success = true;
      result.warnings.push(`Configuration rolled back to update ${updateId}`);
      this.logInfo(`Configuration rolled back to update ${updateId}`);

    } catch (error) {
      result.errors.push(`Rollback failed: ${error.message}`);
      this.logError(`Configuration rollback failed for update ${updateId}`, error);
    }

    return result;
  }

  /**
   * Get current configuration
   */
  getCurrentConfiguration(): HookSystemConfiguration | null {
    return this.currentConfiguration ? JSON.parse(JSON.stringify(this.currentConfiguration)) : null;
  }

  /**
   * Get update history
   */
  getUpdateHistory(limit: number = 50): UpdateHistoryEntry[] {
    return this.updateHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get available rollback points
   */
  getAvailableRollbackPoints(): Array<{
    updateId: string;
    timestamp: Date;
    description: string;
  }> {
    return this.rollbackStack.map(point => ({
      updateId: point.updateId,
      timestamp: point.timestamp,
      description: `Configuration from ${point.timestamp.toISOString()}`
    }));
  }

  /**
   * Reload configuration from file
   */
  async reloadConfiguration(): Promise<ConfigurationUpdateResult> {
    const result: ConfigurationUpdateResult = {
      success: false,
      updateId: this.generateUpdateId(),
      timestamp: new Date(),
      type: 'full',
      errors: [],
      warnings: []
    };

    try {
      const loadResult = await this.loader.reloadConfiguration();
      
      if (!loadResult.success || !loadResult.configuration) {
        result.errors.push(...loadResult.errors);
        return result;
      }

      const oldConfiguration = this.currentConfiguration;
      this.currentConfiguration = loadResult.configuration;

      // Emit change event
      this.emitChangeEvent({
        updateId: result.updateId,
        type: 'full',
        oldValue: oldConfiguration,
        newValue: loadResult.configuration,
        timestamp: result.timestamp,
        reason: 'Configuration reloaded from file'
      });

      result.success = true;
      result.warnings.push('Configuration reloaded from file');
      this.logInfo('Configuration reloaded from file');

    } catch (error) {
      result.errors.push(`Reload failed: ${error.message}`);
      this.logError('Configuration reload failed', error);
    }

    return result;
  }

  /**
   * Generate unique update ID
   */
  private generateUpdateId(): string {
    return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Emit configuration change event
   */
  private emitChangeEvent(event: ConfigurationChangeEvent): void {
    this.emit('configurationChanged', event);
    this.logInfo(`Configuration changed: ${event.type}`, { updateId: event.updateId });
  }

  /**
   * Add entry to update history
   */
  private addToHistory(entry: UpdateHistoryEntry): void {
    this.updateHistory.push(entry);
    
    // Keep history limited to last 1000 entries
    if (this.updateHistory.length > 1000) {
      this.updateHistory = this.updateHistory.slice(-1000);
    }
  }

  /**
   * Logging methods
   */
  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[ConfigurationUpdateManager] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[ConfigurationUpdateManager] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[ConfigurationUpdateManager] ${message}`, error);
  }
}

/**
 * Singleton update manager instance
 */
let updateManagerInstance: ConfigurationUpdateManager | null = null;

/**
 * Get configuration update manager instance
 */
export function getConfigurationUpdateManager(
  strapi?: any,
  configurationFilePath?: string
): ConfigurationUpdateManager {
  if (!updateManagerInstance && strapi) {
    updateManagerInstance = new ConfigurationUpdateManager(strapi, configurationFilePath);
  }
  
  if (!updateManagerInstance) {
    throw new Error('ConfigurationUpdateManager not initialized. Call with strapi instance first.');
  }
  
  return updateManagerInstance;
}

export default ConfigurationUpdateManager;