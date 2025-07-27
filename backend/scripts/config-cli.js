#!/usr/bin/env node

/**
 * Configuration Management CLI Tool
 * 
 * Command-line interface for managing hook configurations across environments
 * with deployment, validation, and backup capabilities.
 * 
 * Usage:
 *   node scripts/config-cli.js <command> [options]
 * 
 * Commands:
 *   validate <file>           - Validate configuration file
 *   deploy <source> <target>  - Deploy configuration to environment
 *   backup <environment>      - Create configuration backup
 *   restore <backup-file>     - Restore from backup
 *   diff <env1> <env2>        - Compare configurations
 *   migrate <from> <to>       - Migrate configuration version
 */

const fs = require('fs').promises;
const path = require('path');
const { program } = require('commander');

// Configuration paths
const CONFIG_PATHS = {
  base: './config/hooks.json',
  development: './config/hooks.development.json',
  staging: './config/hooks.staging.json',
  production: './config/hooks.production.json',
  test: './config/hooks.test.json'
};

const BACKUP_DIR = './config/backups';

/**
 * Load configuration file
 */
async function loadConfig(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load configuration from ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Save configuration file
 */
async function saveConfig(filePath, config) {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Write configuration
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`Configuration saved to ${filePath}`);
  } catch (error) {
    console.error(`Failed to save configuration to ${filePath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Validate configuration
 */
async function validateConfig(filePath) {
  console.log(`Validating configuration: ${filePath}`);
  
  const config = await loadConfig(filePath);
  
  // Basic validation
  const errors = [];
  const warnings = [];
  
  // Check required fields
  if (!config.version) {
    errors.push('Missing version field');
  }
  
  if (!config.global) {
    errors.push('Missing global configuration');
  }
  
  if (!config.factory) {
    errors.push('Missing factory configuration');
  }
  
  // Validate global configuration
  if (config.global) {
    if (typeof config.global.enableStrictValidation !== 'boolean') {
      errors.push('global.enableStrictValidation must be boolean');
    }
    
    if (typeof config.global.maxHookExecutionTime !== 'number' || 
        config.global.maxHookExecutionTime < 10 || 
        config.global.maxHookExecutionTime > 5000) {
      errors.push('global.maxHookExecutionTime must be number between 10 and 5000');
    }
    
    if (!['error', 'warn', 'info', 'debug'].includes(config.global.logLevel)) {
      errors.push('global.logLevel must be one of: error, warn, info, debug');
    }
  }
  
  // Validate factory configuration
  if (config.factory) {
    if (typeof config.factory.maxCacheSize !== 'number' || 
        config.factory.maxCacheSize < 1 || 
        config.factory.maxCacheSize > 1000) {
      errors.push('factory.maxCacheSize must be number between 1 and 1000');
    }
  }
  
  // Validate content types
  if (config.contentTypes) {
    for (const [contentType, contentConfig] of Object.entries(config.contentTypes)) {
      if (!contentConfig.enabled === undefined) {
        warnings.push(`contentTypes.${contentType}.enabled not specified, defaulting to true`);
      }
      
      if (contentConfig.hooks) {
        const validHooks = ['beforeCreate', 'beforeUpdate', 'afterCreate', 'afterUpdate', 'beforeDelete', 'afterDelete'];
        for (const hook of Object.keys(contentConfig.hooks)) {
          if (!validHooks.includes(hook)) {
            warnings.push(`contentTypes.${contentType}.hooks.${hook} is not a valid hook`);
          }
        }
      }
    }
  }
  
  // Report results
  if (errors.length > 0) {
    console.error('❌ Validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️  Validation warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  console.log('✅ Configuration is valid');
}

/**
 * Deploy configuration
 */
async function deployConfig(sourceEnv, targetEnv) {
  console.log(`Deploying configuration from ${sourceEnv} to ${targetEnv}`);
  
  const sourcePath = CONFIG_PATHS[sourceEnv];
  const targetPath = CONFIG_PATHS[targetEnv];
  
  if (!sourcePath || !targetPath) {
    console.error('Invalid environment. Valid environments: development, staging, production, test');
    process.exit(1);
  }
  
  // Load source configuration
  const sourceConfig = await loadConfig(sourcePath);
  
  // Create backup of target
  await createBackup(targetEnv);
  
  // Apply environment-specific overrides
  const targetConfig = applyEnvironmentOverrides(sourceConfig, targetEnv);
  
  // Validate target configuration
  const tempFile = `/tmp/hooks.${targetEnv}.temp.json`;
  await saveConfig(tempFile, targetConfig);
  await validateConfig(tempFile);
  await fs.unlink(tempFile);
  
  // Save to target
  await saveConfig(targetPath, targetConfig);
  
  console.log(`✅ Successfully deployed configuration to ${targetEnv}`);
}

/**
 * Apply environment-specific overrides
 */
function applyEnvironmentOverrides(config, environment) {
  const envConfig = { ...config };
  
  // Apply environment-specific settings
  const envOverrides = config.environments?.[environment];
  if (envOverrides) {
    envConfig.global = { ...envConfig.global, ...envOverrides };
  }
  
  // Update metadata
  envConfig.metadata = {
    ...envConfig.metadata,
    environment,
    updatedAt: new Date().toISOString(),
    deployedAt: new Date().toISOString()
  };
  
  return envConfig;
}

/**
 * Create backup
 */
async function createBackup(environment) {
  const configPath = CONFIG_PATHS[environment];
  
  if (!configPath) {
    console.error('Invalid environment');
    process.exit(1);
  }
  
  try {
    const config = await loadConfig(configPath);
    
    // Ensure backup directory exists
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `hooks.${environment}.${timestamp}.backup.json`);
    
    // Create backup with metadata
    const backup = {
      metadata: {
        originalPath: configPath,
        backupPath,
        timestamp: new Date().toISOString(),
        environment,
        version: config.version || 'unknown'
      },
      configuration: config
    };
    
    await saveConfig(backupPath, backup);
    console.log(`✅ Backup created: ${backupPath}`);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`⚠️  Configuration file not found: ${configPath}`);
    } else {
      throw error;
    }
  }
}

/**
 * Restore from backup
 */
async function restoreFromBackup(backupPath) {
  console.log(`Restoring configuration from backup: ${backupPath}`);
  
  const backup = await loadConfig(backupPath);
  
  if (!backup.metadata || !backup.configuration) {
    console.error('Invalid backup file structure');
    process.exit(1);
  }
  
  const targetPath = backup.metadata.originalPath;
  
  // Create backup of current configuration before restore
  const environment = backup.metadata.environment;
  await createBackup(environment);
  
  // Restore configuration
  await saveConfig(targetPath, backup.configuration);
  
  console.log(`✅ Configuration restored to ${targetPath}`);
}

/**
 * Compare configurations
 */
async function compareConfigs(env1, env2) {
  console.log(`Comparing configurations: ${env1} vs ${env2}`);
  
  const config1Path = CONFIG_PATHS[env1];
  const config2Path = CONFIG_PATHS[env2];
  
  if (!config1Path || !config2Path) {
    console.error('Invalid environment. Valid environments: development, staging, production, test');
    process.exit(1);
  }
  
  const config1 = await loadConfig(config1Path);
  const config2 = await loadConfig(config2Path);
  
  const differences = findDifferences(config1, config2);
  
  if (differences.length === 0) {
    console.log('✅ Configurations are identical');
  } else {
    console.log(`Found ${differences.length} differences:`);
    differences.forEach(diff => {
      console.log(`  ${diff.path}:`);
      console.log(`    ${env1}: ${JSON.stringify(diff.value1)}`);
      console.log(`    ${env2}: ${JSON.stringify(diff.value2)}`);
    });
  }
}

/**
 * Find differences between configurations
 */
function findDifferences(obj1, obj2, path = '') {
  const differences = [];
  
  const keys1 = obj1 ? Object.keys(obj1) : [];
  const keys2 = obj2 ? Object.keys(obj2) : [];
  const allKeys = new Set([...keys1, ...keys2]);
  
  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const value1 = obj1?.[key];
    const value2 = obj2?.[key];
    
    if (value1 === undefined && value2 !== undefined) {
      differences.push({ path: currentPath, value1: undefined, value2 });
    } else if (value1 !== undefined && value2 === undefined) {
      differences.push({ path: currentPath, value1, value2: undefined });
    } else if (value1 !== value2) {
      if (typeof value1 === 'object' && typeof value2 === 'object' && 
          value1 !== null && value2 !== null && 
          !Array.isArray(value1) && !Array.isArray(value2)) {
        differences.push(...findDifferences(value1, value2, currentPath));
      } else {
        differences.push({ path: currentPath, value1, value2 });
      }
    }
  }
  
  return differences;
}

/**
 * Migrate configuration version
 */
async function migrateConfig(fromVersion, toVersion) {
  console.log(`Migrating configuration from ${fromVersion} to ${toVersion}`);
  
  // This is a simplified migration - in a real implementation,
  // you would use the ConfigurationVersioning class
  
  const environments = ['development', 'staging', 'production', 'test'];
  
  for (const env of environments) {
    const configPath = CONFIG_PATHS[env];
    
    try {
      const config = await loadConfig(configPath);
      
      if (config.version === fromVersion) {
        // Create backup
        await createBackup(env);
        
        // Apply migration
        config.version = toVersion;
        
        // Add new fields for version 1.0.0
        if (toVersion === '1.0.0') {
          config.global = {
            ...config.global,
            enableCaching: config.global.enableCaching ?? true,
            cacheExpirationMs: config.global.cacheExpirationMs ?? 300000,
            enableBackgroundJobs: config.global.enableBackgroundJobs ?? true,
            backgroundJobTimeout: config.global.backgroundJobTimeout ?? 30000
          };
        }
        
        // Save migrated configuration
        await saveConfig(configPath, config);
        console.log(`✅ Migrated ${env} configuration to version ${toVersion}`);
      } else {
        console.log(`⚠️  ${env} configuration is already at version ${config.version}`);
      }
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log(`⚠️  Configuration file not found: ${configPath}`);
      } else {
        throw error;
      }
    }
  }
}

/**
 * List backups
 */
async function listBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter(file => file.endsWith('.backup.json'));
    
    if (backupFiles.length === 0) {
      console.log('No backups found');
      return;
    }
    
    console.log('Available backups:');
    
    for (const file of backupFiles.sort().reverse()) {
      try {
        const backupPath = path.join(BACKUP_DIR, file);
        const backup = await loadConfig(backupPath);
        
        if (backup.metadata) {
          console.log(`  ${file}`);
          console.log(`    Environment: ${backup.metadata.environment}`);
          console.log(`    Version: ${backup.metadata.version}`);
          console.log(`    Created: ${backup.metadata.timestamp}`);
          console.log('');
        }
      } catch (error) {
        console.warn(`    Warning: Could not read backup metadata from ${file}`);
      }
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No backup directory found');
    } else {
      throw error;
    }
  }
}

// CLI Commands
program
  .name('config-cli')
  .description('Hook Configuration Management CLI')
  .version('1.0.0');

program
  .command('validate <file>')
  .description('Validate configuration file')
  .action(validateConfig);

program
  .command('deploy <source> <target>')
  .description('Deploy configuration from source to target environment')
  .action(deployConfig);

program
  .command('backup <environment>')
  .description('Create backup of environment configuration')
  .action(createBackup);

program
  .command('restore <backup-file>')
  .description('Restore configuration from backup file')
  .action(restoreFromBackup);

program
  .command('diff <env1> <env2>')
  .description('Compare configurations between environments')
  .action(compareConfigs);

program
  .command('migrate <from-version> <to-version>')
  .description('Migrate configuration version across all environments')
  .action(migrateConfig);

program
  .command('list-backups')
  .description('List available configuration backups')
  .action(listBackups);

// Parse command line arguments
program.parse();