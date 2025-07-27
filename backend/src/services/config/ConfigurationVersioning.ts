/**
 * Configuration Versioning System
 * 
 * Handles configuration versioning, migrations, and backward compatibility
 * for the hook configuration system.
 * 
 * Requirements: 6.1, 6.3
 */

import {
  ConfigurationMigration,
  HookSystemConfiguration,
  CONFIGURATION_MIGRATIONS
} from './HookConfigurationSchema';

/**
 * Version comparison result
 */
export interface VersionComparison {
  isNewer: boolean;
  isOlder: boolean;
  isEqual: boolean;
  difference: number; // Positive if first version is newer
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  migratedConfig: any;
  errors: string[];
  warnings: string[];
  appliedMigrations: string[];
}

/**
 * Version history entry
 */
export interface VersionHistoryEntry {
  version: string;
  timestamp: Date;
  changes: string[];
  migratedFrom?: string;
  author?: string;
  environment?: string;
}

/**
 * Configuration Versioning Manager
 */
export class ConfigurationVersioning {
  private migrations: Map<string, ConfigurationMigration[]> = new Map();
  private versionHistory: VersionHistoryEntry[] = [];

  constructor() {
    this.loadMigrations();
  }

  /**
   * Load available migrations
   */
  private loadMigrations(): void {
    for (const migration of CONFIGURATION_MIGRATIONS) {
      const fromVersion = migration.fromVersion;
      if (!this.migrations.has(fromVersion)) {
        this.migrations.set(fromVersion, []);
      }
      this.migrations.get(fromVersion)!.push(migration);
    }
  }

  /**
   * Compare two version strings
   */
  compareVersions(version1: string, version2: string): VersionComparison {
    const v1Parts = this.parseVersion(version1);
    const v2Parts = this.parseVersion(version2);

    let difference = 0;

    // Compare major, minor, patch
    for (let i = 0; i < 3; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part !== v2Part) {
        difference = v1Part - v2Part;
        break;
      }
    }

    return {
      isNewer: difference > 0,
      isOlder: difference < 0,
      isEqual: difference === 0,
      difference
    };
  }

  /**
   * Parse version string into numeric parts
   */
  private parseVersion(version: string): number[] {
    return version.split('.').map(part => {
      const num = parseInt(part, 10);
      return isNaN(num) ? 0 : num;
    });
  }

  /**
   * Get latest available version
   */
  getLatestVersion(): string {
    const allVersions = [
      ...CONFIGURATION_MIGRATIONS.map(m => m.fromVersion),
      ...CONFIGURATION_MIGRATIONS.map(m => m.toVersion)
    ];
    
    const uniqueVersions = [...new Set(allVersions)];
    
    return uniqueVersions.reduce((latest, current) => {
      const comparison = this.compareVersions(current, latest);
      return comparison.isNewer ? current : latest;
    }, '0.0.0');
  }

  /**
   * Check if version is supported
   */
  isVersionSupported(version: string): boolean {
    const supportedVersions = [
      '1.0.0',
      '0.9.0'
    ];
    
    return supportedVersions.includes(version);
  }

  /**
   * Get migration path from one version to another
   */
  getMigrationPath(fromVersion: string, toVersion: string): ConfigurationMigration[] {
    const path: ConfigurationMigration[] = [];
    let currentVersion = fromVersion;

    // Simple linear migration path for now
    // In a more complex system, you might need graph traversal
    while (currentVersion !== toVersion) {
      const availableMigrations = this.migrations.get(currentVersion) || [];
      
      // Find migration that gets us closer to target version
      const nextMigration = availableMigrations.find(migration => {
        const comparison = this.compareVersions(migration.toVersion, toVersion);
        return comparison.isEqual || comparison.isOlder;
      });

      if (!nextMigration) {
        throw new Error(`No migration path found from ${fromVersion} to ${toVersion}`);
      }

      path.push(nextMigration);
      currentVersion = nextMigration.toVersion;
    }

    return path;
  }

  /**
   * Migrate configuration to target version
   */
  async migrateConfiguration(
    config: any,
    fromVersion: string,
    toVersion: string
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      fromVersion,
      toVersion,
      migratedConfig: { ...config },
      errors: [],
      warnings: [],
      appliedMigrations: []
    };

    try {
      // Check if migration is needed
      const comparison = this.compareVersions(fromVersion, toVersion);
      if (comparison.isEqual) {
        result.success = true;
        result.warnings.push('Configuration is already at target version');
        return result;
      }

      if (comparison.isNewer) {
        result.errors.push('Cannot migrate to older version');
        return result;
      }

      // Get migration path
      const migrationPath = this.getMigrationPath(fromVersion, toVersion);

      // Apply migrations in sequence
      let currentConfig = { ...config };
      for (const migration of migrationPath) {
        try {
          currentConfig = await this.applyMigration(currentConfig, migration);
          result.appliedMigrations.push(`${migration.fromVersion} -> ${migration.toVersion}`);
          
          // Add version history entry
          this.addVersionHistoryEntry({
            version: migration.toVersion,
            timestamp: new Date(),
            changes: [migration.description],
            migratedFrom: migration.fromVersion
          });
          
        } catch (error) {
          result.errors.push(`Migration failed: ${migration.fromVersion} -> ${migration.toVersion}: ${error.message}`);
          return result;
        }
      }

      result.migratedConfig = currentConfig;
      result.success = true;

    } catch (error) {
      result.errors.push(`Migration failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Apply single migration
   */
  private async applyMigration(config: any, migration: ConfigurationMigration): Promise<any> {
    try {
      const migratedConfig = await migration.migrate(config);
      
      // Validate that migration didn't break the configuration structure
      if (typeof migratedConfig !== 'object' || migratedConfig === null) {
        throw new Error('Migration produced invalid configuration structure');
      }

      return migratedConfig;
      
    } catch (error) {
      throw new Error(`Migration execution failed: ${error.message}`);
    }
  }

  /**
   * Rollback configuration to previous version
   */
  async rollbackConfiguration(
    config: any,
    fromVersion: string,
    toVersion: string
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      fromVersion,
      toVersion,
      migratedConfig: { ...config },
      errors: [],
      warnings: [],
      appliedMigrations: []
    };

    try {
      // Find migration that can rollback
      const migration = CONFIGURATION_MIGRATIONS.find(
        m => m.fromVersion === toVersion && m.toVersion === fromVersion
      );

      if (!migration || !migration.rollback) {
        result.errors.push(`No rollback available from ${fromVersion} to ${toVersion}`);
        return result;
      }

      // Apply rollback
      const rolledBackConfig = await migration.rollback(config);
      result.migratedConfig = rolledBackConfig;
      result.success = true;
      result.appliedMigrations.push(`${fromVersion} -> ${toVersion} (rollback)`);

      // Add version history entry
      this.addVersionHistoryEntry({
        version: toVersion,
        timestamp: new Date(),
        changes: [`Rolled back from ${fromVersion}`],
        migratedFrom: fromVersion
      });

    } catch (error) {
      result.errors.push(`Rollback failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Get available migrations for version
   */
  getAvailableMigrations(version: string): ConfigurationMigration[] {
    return this.migrations.get(version) || [];
  }

  /**
   * Check if migration is available
   */
  isMigrationAvailable(fromVersion: string, toVersion: string): boolean {
    try {
      this.getMigrationPath(fromVersion, toVersion);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get version compatibility information
   */
  getVersionCompatibility(version: string): {
    isSupported: boolean;
    isLatest: boolean;
    canUpgrade: boolean;
    availableUpgrades: string[];
    deprecationWarnings: string[];
  } {
    const latestVersion = this.getLatestVersion();
    const isLatest = this.compareVersions(version, latestVersion).isEqual;
    const availableMigrations = this.getAvailableMigrations(version);
    
    return {
      isSupported: this.isVersionSupported(version),
      isLatest,
      canUpgrade: availableMigrations.length > 0,
      availableUpgrades: availableMigrations.map(m => m.toVersion),
      deprecationWarnings: this.getDeprecationWarnings(version)
    };
  }

  /**
   * Get deprecation warnings for version
   */
  private getDeprecationWarnings(version: string): string[] {
    const warnings: string[] = [];
    
    // Check if version is deprecated
    const comparison = this.compareVersions(version, '1.0.0');
    if (comparison.isOlder) {
      warnings.push(`Version ${version} is deprecated. Please upgrade to 1.0.0 or later.`);
    }

    // Check for specific deprecation notices
    if (version === '0.9.0') {
      warnings.push('Version 0.9.0 lacks important caching and background job features.');
    }

    return warnings;
  }

  /**
   * Add version history entry
   */
  addVersionHistoryEntry(entry: VersionHistoryEntry): void {
    this.versionHistory.push(entry);
    
    // Keep history limited to last 100 entries
    if (this.versionHistory.length > 100) {
      this.versionHistory = this.versionHistory.slice(-100);
    }
  }

  /**
   * Get version history
   */
  getVersionHistory(limit: number = 50): VersionHistoryEntry[] {
    return this.versionHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Create configuration backup before migration
   */
  createConfigurationBackup(config: HookSystemConfiguration): {
    backup: HookSystemConfiguration;
    timestamp: Date;
    version: string;
  } {
    return {
      backup: JSON.parse(JSON.stringify(config)), // Deep clone
      timestamp: new Date(),
      version: config.version
    };
  }

  /**
   * Validate configuration version format
   */
  validateVersionFormat(version: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Check basic format (x.y.z)
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(version)) {
      errors.push('Version must be in format x.y.z (e.g., 1.0.0)');
    }

    // Check for reasonable version numbers
    const parts = this.parseVersion(version);
    if (parts[0] > 99 || parts[1] > 99 || parts[2] > 99) {
      errors.push('Version numbers should not exceed 99');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate version changelog
   */
  generateChangelog(fromVersion: string, toVersion: string): string[] {
    const changelog: string[] = [];
    
    try {
      const migrationPath = this.getMigrationPath(fromVersion, toVersion);
      
      for (const migration of migrationPath) {
        changelog.push(`${migration.fromVersion} -> ${migration.toVersion}: ${migration.description}`);
      }
      
    } catch (error) {
      changelog.push(`Unable to generate changelog: ${error.message}`);
    }

    return changelog;
  }
}

/**
 * Singleton versioning instance
 */
let versioningInstance: ConfigurationVersioning | null = null;

/**
 * Get configuration versioning instance
 */
export function getConfigurationVersioning(): ConfigurationVersioning {
  if (!versioningInstance) {
    versioningInstance = new ConfigurationVersioning();
  }
  return versioningInstance;
}

export default ConfigurationVersioning;