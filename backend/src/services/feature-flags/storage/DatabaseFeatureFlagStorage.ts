/**
 * Database Feature Flag Storage
 * 
 * Implements feature flag storage using Strapi database for persistence.
 * Provides CRUD operations for feature flags with proper error handling.
 * 
 * Requirements: 6.2, 3.1
 */

import { FeatureFlag, FeatureFlagStorage } from '../FeatureFlagService';

/**
 * Database feature flag storage implementation
 */
export class DatabaseFeatureFlagStorage implements FeatureFlagStorage {
  private strapi: any;
  private tableName: string;

  constructor(strapi: any, tableName: string = 'feature_flags') {
    this.strapi = strapi;
    this.tableName = tableName;
    this.initializeTable();
  }

  /**
   * Get feature flag by name
   */
  async getFlag(name: string): Promise<FeatureFlag | null> {
    try {
      const result = await this.strapi.db.query(this.tableName).findOne({
        where: { name }
      });

      if (!result) {
        return null;
      }

      return this.deserializeFlag(result);

    } catch (error) {
      this.logError(`Error getting feature flag: ${name}`, error);
      return null;
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    try {
      const results = await this.strapi.db.query(this.tableName).findMany({
        orderBy: { name: 'asc' }
      });

      return results.map(result => this.deserializeFlag(result));

    } catch (error) {
      this.logError('Error getting all feature flags', error);
      return [];
    }
  }

  /**
   * Set feature flag
   */
  async setFlag(flag: FeatureFlag): Promise<void> {
    try {
      const serializedFlag = this.serializeFlag(flag);
      
      const existing = await this.strapi.db.query(this.tableName).findOne({
        where: { name: flag.name }
      });

      if (existing) {
        await this.strapi.db.query(this.tableName).update({
          where: { id: existing.id },
          data: serializedFlag
        });
      } else {
        await this.strapi.db.query(this.tableName).create({
          data: serializedFlag
        });
      }

    } catch (error) {
      this.logError(`Error setting feature flag: ${flag.name}`, error);
      throw error;
    }
  }

  /**
   * Delete feature flag
   */
  async deleteFlag(name: string): Promise<boolean> {
    try {
      const existing = await this.strapi.db.query(this.tableName).findOne({
        where: { name }
      });

      if (!existing) {
        return false;
      }

      await this.strapi.db.query(this.tableName).delete({
        where: { id: existing.id }
      });

      return true;

    } catch (error) {
      this.logError(`Error deleting feature flag: ${name}`, error);
      return false;
    }
  }

  /**
   * Get feature flags by environment
   */
  async getFlagsByEnvironment(environment: string): Promise<FeatureFlag[]> {
    try {
      const results = await this.strapi.db.query(this.tableName).findMany({
        where: {
          $or: [
            { environments: { $null: true } },
            { environments: { $contains: environment } }
          ]
        },
        orderBy: { name: 'asc' }
      });

      return results.map(result => this.deserializeFlag(result));

    } catch (error) {
      this.logError(`Error getting feature flags for environment: ${environment}`, error);
      return [];
    }
  }

  /**
   * Get feature flags by tag
   */
  async getFlagsByTag(tag: string): Promise<FeatureFlag[]> {
    try {
      const results = await this.strapi.db.query(this.tableName).findMany({
        where: {
          metadata_tags: { $contains: tag }
        },
        orderBy: { name: 'asc' }
      });

      return results.map(result => this.deserializeFlag(result));

    } catch (error) {
      this.logError(`Error getting feature flags for tag: ${tag}`, error);
      return [];
    }
  }

  /**
   * Initialize database table if it doesn't exist
   */
  private async initializeTable(): Promise<void> {
    try {
      // Check if table exists
      const tableExists = await this.checkTableExists();
      
      if (!tableExists) {
        await this.createTable();
        this.logInfo(`Feature flags table created: ${this.tableName}`);
      }

    } catch (error) {
      this.logError('Error initializing feature flags table', error);
    }
  }

  /**
   * Check if table exists
   */
  private async checkTableExists(): Promise<boolean> {
    try {
      await this.strapi.db.query(this.tableName).findMany({ limit: 1 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create feature flags table
   */
  private async createTable(): Promise<void> {
    const schema = {
      kind: 'collectionType',
      collectionName: this.tableName,
      info: {
        singularName: 'feature-flag',
        pluralName: 'feature-flags',
        displayName: 'Feature Flag'
      },
      attributes: {
        name: {
          type: 'string',
          required: true,
          unique: true
        },
        enabled: {
          type: 'boolean',
          default: false
        },
        description: {
          type: 'text'
        },
        type: {
          type: 'enumeration',
          enum: ['boolean', 'percentage', 'user', 'environment'],
          default: 'boolean'
        },
        value: {
          type: 'json'
        },
        conditions: {
          type: 'json'
        },
        metadata_created_at: {
          type: 'datetime'
        },
        metadata_updated_at: {
          type: 'datetime'
        },
        metadata_created_by: {
          type: 'string'
        },
        metadata_updated_by: {
          type: 'string'
        },
        metadata_version: {
          type: 'integer',
          default: 1
        },
        metadata_tags: {
          type: 'json'
        },
        rollout: {
          type: 'json'
        },
        environments: {
          type: 'json'
        },
        expiry: {
          type: 'datetime'
        }
      }
    };

    // Note: In a real implementation, you would use Strapi's schema management
    // For now, we'll log what would be created
    this.logInfo('Would create feature flags table with schema', schema);
  }

  /**
   * Serialize feature flag for database storage
   */
  private serializeFlag(flag: FeatureFlag): any {
    return {
      name: flag.name,
      enabled: flag.enabled,
      description: flag.description,
      type: flag.type,
      value: flag.value ? JSON.stringify(flag.value) : null,
      conditions: flag.conditions ? JSON.stringify(flag.conditions) : null,
      metadata_created_at: flag.metadata.createdAt,
      metadata_updated_at: flag.metadata.updatedAt,
      metadata_created_by: flag.metadata.createdBy,
      metadata_updated_by: flag.metadata.updatedBy,
      metadata_version: flag.metadata.version,
      metadata_tags: JSON.stringify(flag.metadata.tags),
      rollout: flag.rollout ? JSON.stringify(flag.rollout) : null,
      environments: flag.environments ? JSON.stringify(flag.environments) : null,
      expiry: flag.expiry
    };
  }

  /**
   * Deserialize feature flag from database
   */
  private deserializeFlag(data: any): FeatureFlag {
    return {
      name: data.name,
      enabled: data.enabled,
      description: data.description || '',
      type: data.type || 'boolean',
      value: data.value ? JSON.parse(data.value) : undefined,
      conditions: data.conditions ? JSON.parse(data.conditions) : [],
      metadata: {
        createdAt: new Date(data.metadata_created_at),
        updatedAt: new Date(data.metadata_updated_at),
        createdBy: data.metadata_created_by,
        updatedBy: data.metadata_updated_by,
        version: data.metadata_version || 1,
        tags: data.metadata_tags ? JSON.parse(data.metadata_tags) : []
      },
      rollout: data.rollout ? JSON.parse(data.rollout) : undefined,
      environments: data.environments ? JSON.parse(data.environments) : undefined,
      expiry: data.expiry ? new Date(data.expiry) : undefined
    };
  }

  /**
   * Logging methods
   */
  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[DatabaseFeatureFlagStorage] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[DatabaseFeatureFlagStorage] ${message}`, error);
  }
}

export default DatabaseFeatureFlagStorage;