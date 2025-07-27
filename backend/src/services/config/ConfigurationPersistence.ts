/**
 * Configuration Persistence
 * 
 * Handles saving, backup, and restore operations for hook configuration
 * with atomic writes and rollback capabilities.
 * 
 * Requirements: 6.1, 6.3
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { HookSystemConfiguration } from './HookConfigurationSchema';
import { getConfigurationValidator } from './ConfigurationValidator';

/**
 * Persistence operation result
 */
export interface PersistenceResult {
  success: boolean;
  filePath?: string;
  backupPath?: string;
  errors: string[];
  warnings: string[];
  timestamp: Date;
}

/**
 * Backup metadata
 */
export interface BackupMetadata {
  originalPath: string;
  backupPath: string;
  timestamp: Date;
  version: string;
  environment: string;
  reason: string;
  size: number;
  checksum?: string;
}

/**
 * Persistence options
 */
export interface PersistenceOptions {
  enableBackup: boolean;
  backupDirectory: string;
  maxBackups: number;
  enableValidation: boolean;
  enableAtomicWrites: boolean;
  enableCompression: boolean;
  filePermissions: string;
}

/**
 * Configuration Persistence Class
 */
export class ConfigurationPersistence {
  private options: PersistenceOptions;
  private validator = getConfigurationValidator();
  private strapi: any;

  constructor(strapi: any, options?: Partial<PersistenceOptions>) {
    this.strapi = strapi;
    this.options = {
      enableBackup: true,
      backupDirectory: './config/backups',
      maxBackups: 10,
      enableValidation: true,
      enableAtomicWrites: true,
      enableCompression: false,
      filePermissions: '0644',
      ...options
    };
  }

  /**
   * Save configuration to file
   */
  async saveConfiguration(
    config: HookSystemConfiguration,
    filePath: string,
    reason?: string
  ): Promise<PersistenceResult> {
    const result: PersistenceResult = {
      success: false,
      errors: [],
      warnings: [],
      timestamp: new Date()
    };

    try {
      // Validate configuration before saving
      if (this.options.enableValidation) {
        const validationResult = this.validator.validateSystemConfiguration(config);
        
        if (!validationResult.isValid) {
          result.errors.push(...validationResult.errors.map(e => e.message));
          return result;
        }
        
        if (validationResult.warnings.length > 0) {
          result.warnings.push(...validationResult.warnings.map(w => w.message));
        }
      }

      // Create backup if enabled and file exists
      if (this.options.enableBackup) {
        const backupResult = await this.createBackup(filePath, reason || 'Configuration update');
        
        if (backupResult.success) {
          result.backupPath = backupResult.filePath;
          result.warnings.push(`Backup created: ${backupResult.filePath}`);
        } else {
          result.warnings.push(...backupResult.warnings);
        }
      }

      // Prepare configuration for saving
      const configToSave = this.prepareConfigurationForSave(config);

      // Save configuration
      if (this.options.enableAtomicWrites) {
        await this.atomicWrite(filePath, configToSave);
      } else {
        await this.directWrite(filePath, configToSave);
      }

      result.success = true;
      result.filePath = filePath;
      result.warnings.push(`Configuration saved to ${filePath}`);

      // Clean up old backups
      if (this.options.enableBackup) {
        await this.cleanupOldBackups();
      }

    } catch (error) {
      result.errors.push(`Failed to save configuration: ${error.message}`);
      
      // If we created a backup, we might want to restore it
      if (result.backupPath) {
        result.warnings.push(`Backup available for restore: ${result.backupPath}`);
      }
    }

    return result;
  }

  /**
   * Create backup of existing configuration
   */
  async createBackup(filePath: string, reason: string): Promise<PersistenceResult> {
    const result: PersistenceResult = {
      success: false,
      errors: [],
      warnings: [],
      timestamp: new Date()
    };

    try {
      // Check if original file exists
      try {
        await fs.access(filePath);
      } catch {
        result.warnings.push('Original file does not exist, no backup needed');
        result.success = true;
        return result;
      }

      // Ensure backup directory exists
      await this.ensureDirectoryExists(this.options.backupDirectory);

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const originalFilename = path.basename(filePath, path.extname(filePath));
      const backupFilename = `${originalFilename}_${timestamp}.backup.json`;
      const backupPath = path.join(this.options.backupDirectory, backupFilename);

      // Read original file
      const originalContent = await fs.readFile(filePath, 'utf-8');
      const originalConfig = JSON.parse(originalContent);

      // Create backup metadata
      const metadata: BackupMetadata = {
        originalPath: filePath,
        backupPath,
        timestamp: new Date(),
        version: originalConfig.version || 'unknown',
        environment: process.env.NODE_ENV || 'development',
        reason,
        size: originalContent.length,
        checksum: this.calculateChecksum(originalContent)
      };

      // Create backup with metadata
      const backupData = {
        metadata,
        configuration: originalConfig
      };

      // Write backup file
      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
      
      // Set file permissions
      await fs.chmod(backupPath, this.options.filePermissions);

      result.success = true;
      result.filePath = backupPath;
      result.warnings.push(`Backup created: ${backupPath}`);

    } catch (error) {
      result.errors.push(`Failed to create backup: ${error.message}`);
    }

    return result;
  }

  /**
   * Restore configuration from backup
   */
  async restoreFromBackup(backupPath: string, targetPath?: string): Promise<PersistenceResult> {
    const result: PersistenceResult = {
      success: false,
      errors: [],
      warnings: [],
      timestamp: new Date()
    };

    try {
      // Read backup file
      const backupContent = await fs.readFile(backupPath, 'utf-8');
      const backupData = JSON.parse(backupContent);

      // Validate backup structure
      if (!backupData.metadata || !backupData.configuration) {
        result.errors.push('Invalid backup file structure');
        return result;
      }

      const metadata: BackupMetadata = backupData.metadata;
      const configuration: HookSystemConfiguration = backupData.configuration;

      // Determine target path
      const restorePath = targetPath || metadata.originalPath;

      // Validate configuration before restore
      if (this.options.enableValidation) {
        const validationResult = this.validator.validateSystemConfiguration(configuration);
        
        if (!validationResult.isValid) {
          result.errors.push(...validationResult.errors.map(e => e.message));
          return result;
        }
        
        if (validationResult.warnings.length > 0) {
          result.warnings.push(...validationResult.warnings.map(w => w.message));
        }
      }

      // Create backup of current file before restore
      if (this.options.enableBackup) {
        const currentBackupResult = await this.createBackup(restorePath, 'Before restore operation');
        if (currentBackupResult.success) {
          result.warnings.push(`Current configuration backed up: ${currentBackupResult.filePath}`);
        }
      }

      // Restore configuration
      const configToSave = this.prepareConfigurationForSave(configuration);
      
      if (this.options.enableAtomicWrites) {
        await this.atomicWrite(restorePath, configToSave);
      } else {
        await this.directWrite(restorePath, configToSave);
      }

      result.success = true;
      result.filePath = restorePath;
      result.warnings.push(`Configuration restored from ${backupPath} to ${restorePath}`);

    } catch (error) {
      result.errors.push(`Failed to restore from backup: ${error.message}`);
    }

    return result;
  }

  /**
   * List available backups
   */
  async listBackups(): Promise<BackupMetadata[]> {
    const backups: BackupMetadata[] = [];

    try {
      // Ensure backup directory exists
      await this.ensureDirectoryExists(this.options.backupDirectory);

      // Read backup directory
      const files = await fs.readdir(this.options.backupDirectory);
      const backupFiles = files.filter(file => file.endsWith('.backup.json'));

      // Read metadata from each backup
      for (const file of backupFiles) {
        try {
          const filePath = path.join(this.options.backupDirectory, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const backupData = JSON.parse(content);
          
          if (backupData.metadata) {
            backups.push(backupData.metadata);
          }
        } catch (error) {
          this.logWarn(`Failed to read backup metadata from ${file}`, error);
        }
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    } catch (error) {
      this.logError('Failed to list backups', error);
    }

    return backups;
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length <= this.options.maxBackups) {
        return; // No cleanup needed
      }

      // Remove oldest backups
      const backupsToRemove = backups.slice(this.options.maxBackups);
      
      for (const backup of backupsToRemove) {
        try {
          await fs.unlink(backup.backupPath);
          this.logInfo(`Removed old backup: ${backup.backupPath}`);
        } catch (error) {
          this.logWarn(`Failed to remove old backup: ${backup.backupPath}`, error);
        }
      }

    } catch (error) {
      this.logError('Failed to cleanup old backups', error);
    }
  }

  /**
   * Prepare configuration for saving
   */
  private prepareConfigurationForSave(config: HookSystemConfiguration): HookSystemConfiguration {
    // Update metadata
    const configToSave = {
      ...config,
      metadata: {
        ...config.metadata,
        updatedAt: new Date(),
        environment: process.env.NODE_ENV || 'development'
      }
    };

    return configToSave;
  }

  /**
   * Atomic write operation
   */
  private async atomicWrite(filePath: string, config: HookSystemConfiguration): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    const content = JSON.stringify(config, null, 2);

    try {
      // Ensure directory exists
      await this.ensureDirectoryExists(path.dirname(filePath));

      // Write to temporary file
      await fs.writeFile(tempPath, content, 'utf-8');
      
      // Set file permissions
      await fs.chmod(tempPath, this.options.filePermissions);

      // Atomic move
      await fs.rename(tempPath, filePath);

    } catch (error) {
      // Clean up temporary file if it exists
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Direct write operation
   */
  private async directWrite(filePath: string, config: HookSystemConfiguration): Promise<void> {
    const content = JSON.stringify(config, null, 2);

    // Ensure directory exists
    await this.ensureDirectoryExists(path.dirname(filePath));

    // Write file
    await fs.writeFile(filePath, content, 'utf-8');
    
    // Set file permissions
    await fs.chmod(filePath, this.options.filePermissions);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Calculate simple checksum for content
   */
  private calculateChecksum(content: string): string {
    // Simple hash function for checksum
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupPath: string): Promise<{
    isValid: boolean;
    errors: string[];
    metadata?: BackupMetadata;
  }> {
    const result = {
      isValid: false,
      errors: [] as string[],
      metadata: undefined as BackupMetadata | undefined
    };

    try {
      // Read backup file
      const backupContent = await fs.readFile(backupPath, 'utf-8');
      const backupData = JSON.parse(backupContent);

      // Check structure
      if (!backupData.metadata || !backupData.configuration) {
        result.errors.push('Invalid backup file structure');
        return result;
      }

      result.metadata = backupData.metadata;

      // Verify checksum if available
      if (backupData.metadata.checksum) {
        const configContent = JSON.stringify(backupData.configuration, null, 2);
        const calculatedChecksum = this.calculateChecksum(configContent);
        
        if (calculatedChecksum !== backupData.metadata.checksum) {
          result.errors.push('Backup checksum mismatch - file may be corrupted');
          return result;
        }
      }

      // Validate configuration
      if (this.options.enableValidation) {
        const validationResult = this.validator.validateSystemConfiguration(backupData.configuration);
        
        if (!validationResult.isValid) {
          result.errors.push(...validationResult.errors.map(e => e.message));
          return result;
        }
      }

      result.isValid = true;

    } catch (error) {
      result.errors.push(`Failed to verify backup: ${error.message}`);
    }

    return result;
  }

  /**
   * Export configuration in different formats
   */
  async exportConfiguration(
    config: HookSystemConfiguration,
    format: 'json' | 'yaml' | 'env',
    outputPath: string
  ): Promise<PersistenceResult> {
    const result: PersistenceResult = {
      success: false,
      errors: [],
      warnings: [],
      timestamp: new Date()
    };

    try {
      let content: string;

      switch (format) {
        case 'json':
          content = JSON.stringify(config, null, 2);
          break;
        case 'yaml':
          // In a real implementation, you would use a YAML library
          result.errors.push('YAML export not implemented yet');
          return result;
        case 'env':
          content = this.convertToEnvironmentVariables(config);
          break;
        default:
          result.errors.push(`Unsupported export format: ${format}`);
          return result;
      }

      // Write exported file
      await fs.writeFile(outputPath, content, 'utf-8');
      await fs.chmod(outputPath, this.options.filePermissions);

      result.success = true;
      result.filePath = outputPath;
      result.warnings.push(`Configuration exported to ${outputPath} in ${format} format`);

    } catch (error) {
      result.errors.push(`Failed to export configuration: ${error.message}`);
    }

    return result;
  }

  /**
   * Convert configuration to environment variables format
   */
  private convertToEnvironmentVariables(config: HookSystemConfiguration): string {
    const envVars: string[] = [];
    const prefix = 'HOOK_CONFIG_';

    // Flatten configuration object
    const flattened = this.flattenObject(config);

    // Convert to environment variable format
    for (const [key, value] of Object.entries(flattened)) {
      const envKey = `${prefix}${key.toUpperCase().replace(/\./g, '_')}`;
      const envValue = typeof value === 'string' ? value : JSON.stringify(value);
      envVars.push(`${envKey}=${envValue}`);
    }

    return envVars.join('\n');
  }

  /**
   * Flatten nested object with dot notation
   */
  private flattenObject(obj: any, prefix: string = ''): Record<string, any> {
    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Logging methods
   */
  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[ConfigurationPersistence] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[ConfigurationPersistence] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[ConfigurationPersistence] ${message}`, error);
  }
}

/**
 * Singleton persistence instance
 */
let persistenceInstance: ConfigurationPersistence | null = null;

/**
 * Get configuration persistence instance
 */
export function getConfigurationPersistence(
  strapi?: any,
  options?: Partial<PersistenceOptions>
): ConfigurationPersistence {
  if (!persistenceInstance && strapi) {
    persistenceInstance = new ConfigurationPersistence(strapi, options);
  }
  
  if (!persistenceInstance) {
    throw new Error('ConfigurationPersistence not initialized. Call with strapi instance first.');
  }
  
  return persistenceInstance;
}

export default ConfigurationPersistence;