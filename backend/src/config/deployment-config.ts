/**
 * Deployment Configuration Manager
 * Handles environment-specific configuration loading and validation
 */

import fs from 'fs';
import path from 'path';

interface DatabaseConfig {
  client: string;
  connection: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean | object;
    schema: string;
  };
  pool: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    createTimeoutMillis: number;
    destroyTimeoutMillis: number;
    idleTimeoutMillis: number;
  };
  debug: boolean;
  migrations: {
    directory: string;
    tableName: string;
  };
}

interface AutomationConfig {
  queue: {
    enabled: boolean;
    concurrency: number;
    maxRetries: number;
    retryDelay: number;
    jobTimeout: number;
  };
  cache: {
    enabled: boolean;
    provider: 'memory' | 'redis';
    redis?: {
      host: string;
      port: number;
      password?: string;
      db: number;
      tls?: object;
    };
    ttl: {
      tableData: number;
      teamStats: number;
      queueStatus: number;
    };
  };
  calculation: {
    timeout: number;
    createSnapshots: boolean;
    validateResults: boolean;
  };
  snapshot: {
    enabled: boolean;
    maxSnapshots: number;
    maxAge: number;
    compression: boolean;
    directory: string;
    s3?: {
      enabled: boolean;
      bucket: string;
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
    };
  };
  monitoring: {
    enabled: boolean;
    metricsCollection: boolean;
    prometheus?: {
      enabled: boolean;
      port: number;
    };
    alerting?: {
      enabled: boolean;
      webhook?: string;
      email?: {
        enabled: boolean;
        smtp: {
          host: string;
          port: number;
          secure: boolean;
          auth: {
            user: string;
            pass: string;
          };
        };
        recipients: string[];
      };
    };
    logging: {
      level: string;
      structured: boolean;
      file?: string;
      syslog?: {
        enabled: boolean;
        host: string;
        port: number;
      };
    };
  };
  features: {
    automaticCalculation: boolean;
    queueProcessing: boolean;
    snapshotCreation: boolean;
    adminExtensions: boolean;
    performanceMonitoring: boolean;
    caching: boolean;
    debugMode?: boolean;
  };
}

interface ServerConfig {
  host: string;
  port: number;
  cors: {
    enabled: boolean;
    origin: string[];
  };
}

interface AdminConfig {
  auth: {
    secret: string;
  };
}

export interface DeploymentConfig {
  database: DatabaseConfig;
  automation: AutomationConfig;
  server: ServerConfig;
  admin: AdminConfig;
}

export class DeploymentConfigManager {
  private config: DeploymentConfig | null = null;
  private environment: string;
  private configPath: string;

  constructor(environment?: string) {
    this.environment = environment || process.env.NODE_ENV || 'development';
    this.configPath = path.join(__dirname, '..', '..', 'config', 'environments', `${this.environment}.json`);
  }

  /**
   * Load configuration for the current environment
   */
  public loadConfig(): DeploymentConfig {
    if (this.config) {
      return this.config;
    }

    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Configuration file not found: ${this.configPath}`);
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      const rawConfig = JSON.parse(configData);

      // Replace environment variables in configuration
      this.config = this.replaceEnvironmentVariables(rawConfig);

      // Validate configuration
      this.validateConfig(this.config);

      return this.config;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Replace ${VAR_NAME} placeholders with environment variables
   */
  private replaceEnvironmentVariables(obj: any): any {
    if (typeof obj === 'string') {
      return obj.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        const value = process.env[varName];
        if (value === undefined) {
          throw new Error(`Environment variable ${varName} is not defined`);
        }
        return value;
      });
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceEnvironmentVariables(item));
    }

    if (obj && typeof obj === 'object') {
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceEnvironmentVariables(value);
      }
      return result;
    }

    return obj;
  }

  /**
   * Validate configuration structure and required fields
   */
  private validateConfig(config: DeploymentConfig): void {
    const requiredFields = [
      'database.connection.host',
      'database.connection.database',
      'database.connection.user',
      'database.connection.password',
      'server.host',
      'server.port',
      'admin.auth.secret'
    ];

    for (const field of requiredFields) {
      if (!this.getNestedValue(config, field)) {
        throw new Error(`Required configuration field missing: ${field}`);
      }
    }

    // Validate database configuration
    if (!['postgres', 'mysql', 'sqlite'].includes(config.database.client)) {
      throw new Error(`Unsupported database client: ${config.database.client}`);
    }

    // Validate cache configuration
    if (config.automation.cache.enabled && config.automation.cache.provider === 'redis') {
      if (!config.automation.cache.redis?.host) {
        throw new Error('Redis host is required when using redis cache provider');
      }
    }

    // Validate snapshot configuration
    if (config.automation.snapshot.enabled && config.automation.snapshot.s3?.enabled) {
      const s3Config = config.automation.snapshot.s3;
      if (!s3Config.bucket || !s3Config.region || !s3Config.accessKeyId || !s3Config.secretAccessKey) {
        throw new Error('S3 configuration is incomplete');
      }
    }

    // Validate monitoring configuration
    if (config.automation.monitoring.alerting?.enabled) {
      const alerting = config.automation.monitoring.alerting;
      if (!alerting.webhook && !alerting.email?.enabled) {
        throw new Error('At least one alerting method must be configured');
      }
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get database configuration
   */
  public getDatabaseConfig(): DatabaseConfig {
    const config = this.loadConfig();
    return config.database;
  }

  /**
   * Get automation configuration
   */
  public getAutomationConfig(): AutomationConfig {
    const config = this.loadConfig();
    return config.automation;
  }

  /**
   * Get server configuration
   */
  public getServerConfig(): ServerConfig {
    const config = this.loadConfig();
    return config.server;
  }

  /**
   * Get admin configuration
   */
  public getAdminConfig(): AdminConfig {
    const config = this.loadConfig();
    return config.admin;
  }

  /**
   * Check if feature is enabled
   */
  public isFeatureEnabled(feature: keyof AutomationConfig['features']): boolean {
    const config = this.loadConfig();
    return config.automation.features[feature] || false;
  }

  /**
   * Get current environment
   */
  public getEnvironment(): string {
    return this.environment;
  }

  /**
   * Check if running in production
   */
  public isProduction(): boolean {
    return this.environment === 'production';
  }

  /**
   * Check if running in development
   */
  public isDevelopment(): boolean {
    return this.environment === 'development';
  }

  /**
   * Check if running in staging
   */
  public isStaging(): boolean {
    return this.environment === 'staging';
  }

  /**
   * Get configuration summary for logging
   */
  public getConfigSummary(): object {
    const config = this.loadConfig();
    
    return {
      environment: this.environment,
      database: {
        client: config.database.client,
        host: config.database.connection.host,
        database: config.database.connection.database,
        ssl: !!config.database.connection.ssl
      },
      automation: {
        features: config.automation.features,
        queue: {
          enabled: config.automation.queue.enabled,
          concurrency: config.automation.queue.concurrency
        },
        cache: {
          enabled: config.automation.cache.enabled,
          provider: config.automation.cache.provider
        },
        monitoring: {
          enabled: config.automation.monitoring.enabled,
          metricsCollection: config.automation.monitoring.metricsCollection
        }
      },
      server: {
        host: config.server.host,
        port: config.server.port
      }
    };
  }

  /**
   * Reload configuration (useful for testing)
   */
  public reloadConfig(): DeploymentConfig {
    this.config = null;
    return this.loadConfig();
  }
}

// Export singleton instance
export const deploymentConfig = new DeploymentConfigManager();

// Export for testing
export default DeploymentConfigManager;