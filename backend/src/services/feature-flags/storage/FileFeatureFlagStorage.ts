/**
 * File Feature Flag Storage
 * 
 * Implements feature flag storage using JSON files for persistence.
 * Useful for development and simple deployments.
 * 
 * Requirements: 6.2, 3.1
 */

import { promises as fs } from 'fs';
import path from 'path';
import { FeatureFlag, FeatureFlagStorage } from '../FeatureFlagService';

/**
 * File-based feature flag storage implementation
 */
export class FileFeatureFlagStorage implements FeatureFlagStorage {
  private strapi: any;
  private filePath: string;
  private flags: Map<string, FeatureFlag> = new Map();
  private lastModified: number = 0;
  private watchInterval: NodeJS.Timeout | null = null;

  constructor(strapi: any, filePath?: string) {
    this.strapi = strapi;
    this.filePath = filePath || path.join(process.cwd(), 'config', 'feature-flags.json');
    
    this.loadFlags();
    this.startFileWatcher();
  }

  /**
   * Get feature flag by name
   */
  async getFlag(name: string): Promise<FeatureFlag | null> {
    await this.ensureFlagsLoaded();
    return this.flags.get(name) || null;
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    await this.ensureFlagsLoaded();
    return Array.from(this.flags.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Set feature flag
   */
  async setFlag(flag: FeatureFlag): Promise<void> {
    await this.ensureFlagsLoaded();
    this.flags.set(flag.name, { ...flag });
    await this.saveFlags();
  }

  /**
   * Delete feature flag
   */
  async deleteFlag(name: string): Promise<boolean> {
    await this.ensureFlagsLoaded();
    const deleted = this.flags.delete(name);
    
    if (deleted) {
      await this.saveFlags();
    }
    
    return deleted;
  }

  /**
   * Get feature flags by environment
   */
  async getFlagsByEnvironment(environment: string): Promise<FeatureFlag[]> {
    await this.ensureFlagsLoaded();
    const flags = Array.from(this.flags.values());
    
    return flags.filter(flag => 
      !flag.environments || flag.environments.includes(environment)
    ).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get feature flags by tag
   */
  async getFlagsByTag(tag: string): Promise<FeatureFlag[]> {
    await this.ensureFlagsLoaded();
    const flags = Array.from(this.flags.values());
    
    return flags.filter(flag => 
      flag.metadata.tags.includes(tag)
    ).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Stop file watcher (cleanup)
   */
  destroy(): void {
    if (this.watchInterval) {
      clearInterval(this.watchInterval);
      this.watchInterval = null;
    }
  }

  /**
   * Load flags from file
   */
  private async loadFlags(): Promise<void> {
    try {
      // Check if file exists
      const fileExists = await this.fileExists(this.filePath);
      
      if (!fileExists) {
        // Create default file
        await this.createDefaultFile();
        return;
      }

      // Get file stats
      const stats = await fs.stat(this.filePath);
      
      // Only reload if file was modified
      if (stats.mtimeMs <= this.lastModified) {
        return;
      }

      // Read and parse file
      const fileContent = await fs.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(fileContent);
      
      // Validate and load flags
      if (data.flags && Array.isArray(data.flags)) {
        this.flags.clear();
        
        for (const flagData of data.flags) {
          try {
            const flag = this.deserializeFlag(flagData);
            this.flags.set(flag.name, flag);
          } catch (error) {
            this.logError(`Error deserializing flag: ${flagData.name}`, error);
          }
        }
      }

      this.lastModified = stats.mtimeMs;
      this.logInfo(`Loaded ${this.flags.size} feature flags from file`);

    } catch (error) {
      this.logError('Error loading feature flags from file', error);
      
      // Initialize with empty flags on error
      if (this.flags.size === 0) {
        this.flags = new Map();
      }
    }
  }

  /**
   * Save flags to file
   */
  private async saveFlags(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Prepare data structure
      const data = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        flags: Array.from(this.flags.values()).map(flag => this.serializeFlag(flag))
      };

      // Write to temporary file first
      const tempPath = `${this.filePath}.tmp`;
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');

      // Atomic move
      await fs.rename(tempPath, this.filePath);

      // Update last modified time
      const stats = await fs.stat(this.filePath);
      this.lastModified = stats.mtimeMs;

      this.logInfo(`Saved ${this.flags.size} feature flags to file`);

    } catch (error) {
      this.logError('Error saving feature flags to file', error);
      throw error;
    }
  }

  /**
   * Create default feature flags file
   */
  private async createDefaultFile(): Promise<void> {
    const defaultData = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      flags: []
    };

    try {
      // Ensure directory exists
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      // Write default file
      await fs.writeFile(this.filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      
      this.logInfo(`Created default feature flags file: ${this.filePath}`);

    } catch (error) {
      this.logError('Error creating default feature flags file', error);
      throw error;
    }
  }

  /**
   * Start file watcher to reload flags when file changes
   */
  private startFileWatcher(): void {
    // Check for file changes every 5 seconds
    this.watchInterval = setInterval(async () => {
      try {
        await this.loadFlags();
      } catch (error) {
        this.logError('Error in file watcher', error);
      }
    }, 5000);
  }

  /**
   * Ensure flags are loaded
   */
  private async ensureFlagsLoaded(): Promise<void> {
    if (this.flags.size === 0 || this.lastModified === 0) {
      await this.loadFlags();
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Serialize feature flag for file storage
   */
  private serializeFlag(flag: FeatureFlag): any {
    return {
      name: flag.name,
      enabled: flag.enabled,
      description: flag.description,
      type: flag.type,
      value: flag.value,
      conditions: flag.conditions,
      metadata: {
        createdAt: flag.metadata.createdAt.toISOString(),
        updatedAt: flag.metadata.updatedAt.toISOString(),
        createdBy: flag.metadata.createdBy,
        updatedBy: flag.metadata.updatedBy,
        version: flag.metadata.version,
        tags: flag.metadata.tags
      },
      rollout: flag.rollout,
      environments: flag.environments,
      expiry: flag.expiry?.toISOString()
    };
  }

  /**
   * Deserialize feature flag from file data
   */
  private deserializeFlag(data: any): FeatureFlag {
    return {
      name: data.name,
      enabled: data.enabled || false,
      description: data.description || '',
      type: data.type || 'boolean',
      value: data.value,
      conditions: data.conditions || [],
      metadata: {
        createdAt: new Date(data.metadata?.createdAt || Date.now()),
        updatedAt: new Date(data.metadata?.updatedAt || Date.now()),
        createdBy: data.metadata?.createdBy,
        updatedBy: data.metadata?.updatedBy,
        version: data.metadata?.version || 1,
        tags: data.metadata?.tags || []
      },
      rollout: data.rollout,
      environments: data.environments,
      expiry: data.expiry ? new Date(data.expiry) : undefined
    };
  }

  /**
   * Logging methods
   */
  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[FileFeatureFlagStorage] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[FileFeatureFlagStorage] ${message}`, error);
  }
}

export default FileFeatureFlagStorage;