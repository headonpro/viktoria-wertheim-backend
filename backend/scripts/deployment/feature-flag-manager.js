#!/usr/bin/env node

/**
 * Feature Flag Management System
 * 
 * Manages gradual rollout of club system features with real-time
 * configuration updates and rollback capabilities.
 */

const fs = require('fs');
const path = require('path');
const redis = require('redis');

class FeatureFlagManager {
  constructor(options = {}) {
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.configFile = path.join(__dirname, '..', '..', 'config', 'feature-flags.json');
    this.redisClient = null;
    this.enableRedis = options.enableRedis !== false;
    
    this.initializeRedis();
    this.ensureConfigFile();
  }

  async initializeRedis() {
    if (!this.enableRedis) return;
    
    try {
      this.redisClient = redis.createClient({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0
      });
      
      await this.redisClient.connect();
      console.log('✅ Connected to Redis for feature flag caching');
    } catch (error) {
      console.warn('⚠️  Redis connection failed, using file-based flags only:', error.message);
      this.redisClient = null;
    }
  }

  ensureConfigFile() {
    if (!fs.existsSync(this.configFile)) {
      const defaultConfig = this.getDefaultFeatureFlags();
      fs.writeFileSync(this.configFile, JSON.stringify(defaultConfig, null, 2));
      console.log(`✅ Created default feature flags config: ${this.configFile}`);
    }
  }

  getDefaultFeatureFlags() {
    return {
      version: "1.0.0",
      lastUpdated: new Date().toISOString(),
      environment: this.environment,
      flags: {
        // Core club system features
        enableClubCollection: {
          enabled: this.environment === 'development',
          rolloutPercentage: this.environment === 'development' ? 100 : 0,
          description: "Enable Club collection type and basic CRUD operations",
          dependencies: [],
          environments: {
            development: { enabled: true, rolloutPercentage: 100 },
            test: { enabled: true, rolloutPercentage: 100 },
            staging: { enabled: false, rolloutPercentage: 0 },
            production: { enabled: false, rolloutPercentage: 0 }
          }
        },
        
        enableClubGames: {
          enabled: false,
          rolloutPercentage: 0,
          description: "Enable club-based game creation and management",
          dependencies: ["enableClubCollection"],
          environments: {
            development: { enabled: true, rolloutPercentage: 100 },
            test: { enabled: true, rolloutPercentage: 100 },
            staging: { enabled: false, rolloutPercentage: 0 },
            production: { enabled: false, rolloutPercentage: 0 }
          }
        },
        
        enableClubTables: {
          enabled: false,
          rolloutPercentage: 0,
          description: "Enable club-based table calculations and display",
          dependencies: ["enableClubCollection", "enableClubGames"],
          environments: {
            development: { enabled: true, rolloutPercentage: 100 },
            test: { enabled: true, rolloutPercentage: 100 },
            staging: { enabled: false, rolloutPercentage: 0 },
            production: { enabled: false, rolloutPercentage: 0 }
          }
        },
        
        enableClubMigration: {
          enabled: this.environment !== 'production',
          rolloutPercentage: this.environment !== 'production' ? 100 : 0,
          description: "Enable data migration from team to club system",
          dependencies: ["enableClubCollection"],
          environments: {
            development: { enabled: true, rolloutPercentage: 100 },
            test: { enabled: true, rolloutPercentage: 100 },
            staging: { enabled: true, rolloutPercentage: 100 },
            production: { enabled: false, rolloutPercentage: 0 }
          }
        },
        
        enableClubAdminPanel: {
          enabled: false,
          rolloutPercentage: 0,
          description: "Enable club management in Strapi admin panel",
          dependencies: ["enableClubCollection"],
          environments: {
            development: { enabled: true, rolloutPercentage: 100 },
            test: { enabled: true, rolloutPercentage: 100 },
            staging: { enabled: false, rolloutPercentage: 0 },
            production: { enabled: false, rolloutPercentage: 0 }
          }
        },
        
        // Advanced features
        enableClubCaching: {
          enabled: false,
          rolloutPercentage: 0,
          description: "Enable Redis caching for club data",
          dependencies: ["enableClubCollection"],
          environments: {
            development: { enabled: false, rolloutPercentage: 0 },
            test: { enabled: false, rolloutPercentage: 0 },
            staging: { enabled: true, rolloutPercentage: 100 },
            production: { enabled: false, rolloutPercentage: 0 }
          }
        },
        
        enableClubPerformanceOptimizations: {
          enabled: false,
          rolloutPercentage: 0,
          description: "Enable database optimizations and performance enhancements",
          dependencies: ["enableClubCollection"],
          environments: {
            development: { enabled: false, rolloutPercentage: 0 },
            test: { enabled: false, rolloutPercentage: 0 },
            staging: { enabled: true, rolloutPercentage: 100 },
            production: { enabled: false, rolloutPercentage: 0 }
          }
        },
        
        enableClubMetrics: {
          enabled: false,
          rolloutPercentage: 0,
          description: "Enable club system metrics and monitoring",
          dependencies: ["enableClubCollection"],
          environments: {
            development: { enabled: false, rolloutPercentage: 0 },
            test: { enabled: false, rolloutPercentage: 0 },
            staging: { enabled: true, rolloutPercentage: 100 },
            production: { enabled: false, rolloutPercentage: 0 }
          }
        },
        
        // Emergency controls
        enableEmergencyRollback: {
          enabled: true,
          rolloutPercentage: 100,
          description: "Enable emergency rollback capabilities",
          dependencies: [],
          environments: {
            development: { enabled: true, rolloutPercentage: 100 },
            test: { enabled: true, rolloutPercentage: 100 },
            staging: { enabled: true, rolloutPercentage: 100 },
            production: { enabled: true, rolloutPercentage: 100 }
          }
        },
        
        enableParallelSystems: {
          enabled: true,
          rolloutPercentage: 100,
          description: "Enable parallel operation of team and club systems",
          dependencies: [],
          environments: {
            development: { enabled: true, rolloutPercentage: 100 },
            test: { enabled: false, rolloutPercentage: 0 },
            staging: { enabled: true, rolloutPercentage: 100 },
            production: { enabled: true, rolloutPercentage: 100 }
          }
        }
      }
    };
  }

  async getFeatureFlags() {
    try {
      // Try Redis first if available
      if (this.redisClient) {
        const cached = await this.redisClient.get('feature-flags');
        if (cached) {
          return JSON.parse(cached);
        }
      }
      
      // Fallback to file
      const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
      
      // Cache in Redis if available
      if (this.redisClient) {
        await this.redisClient.setex('feature-flags', 300, JSON.stringify(config)); // 5 minute cache
      }
      
      return config;
    } catch (error) {
      console.error('Failed to load feature flags:', error.message);
      return this.getDefaultFeatureFlags();
    }
  }

  async updateFeatureFlags(updates) {
    const config = await this.getFeatureFlags();
    
    // Apply updates
    for (const [flagName, flagConfig] of Object.entries(updates)) {
      if (config.flags[flagName]) {
        config.flags[flagName] = { ...config.flags[flagName], ...flagConfig };
      } else {
        config.flags[flagName] = flagConfig;
      }
    }
    
    config.lastUpdated = new Date().toISOString();
    
    // Save to file
    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
    
    // Update Redis cache
    if (this.redisClient) {
      await this.redisClient.setex('feature-flags', 300, JSON.stringify(config));
    }
    
    console.log(`✅ Updated feature flags: ${Object.keys(updates).join(', ')}`);
    return config;
  }

  async isFeatureEnabled(flagName, userId = null) {
    const config = await this.getFeatureFlags();
    const flag = config.flags[flagName];
    
    if (!flag) {
      console.warn(`⚠️  Unknown feature flag: ${flagName}`);
      return false;
    }
    
    // Check environment-specific settings
    const envConfig = flag.environments[this.environment];
    if (envConfig && !envConfig.enabled) {
      return false;
    }
    
    // Check global enabled state
    if (!flag.enabled) {
      return false;
    }
    
    // Check dependencies
    if (flag.dependencies && flag.dependencies.length > 0) {
      for (const dependency of flag.dependencies) {
        if (!(await this.isFeatureEnabled(dependency, userId))) {
          return false;
        }
      }
    }
    
    // Check rollout percentage
    const rolloutPercentage = envConfig?.rolloutPercentage ?? flag.rolloutPercentage;
    if (rolloutPercentage < 100) {
      // Use user ID for consistent rollout, or random for anonymous users
      const hash = userId ? this.hashUserId(userId) : Math.random();
      return hash < (rolloutPercentage / 100);
    }
    
    return true;
  }

  hashUserId(userId) {
    // Simple hash function for consistent user-based rollout
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }

  async enableFeature(flagName, rolloutPercentage = 100) {
    const updates = {
      [flagName]: {
        enabled: true,
        rolloutPercentage: rolloutPercentage
      }
    };
    
    return await this.updateFeatureFlags(updates);
  }

  async disableFeature(flagName) {
    const updates = {
      [flagName]: {
        enabled: false,
        rolloutPercentage: 0
      }
    };
    
    return await this.updateFeatureFlags(updates);
  }

  async setRolloutPercentage(flagName, percentage) {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }
    
    const updates = {
      [flagName]: {
        rolloutPercentage: percentage
      }
    };
    
    return await this.updateFeatureFlags(updates);
  }

  async getFeatureStatus() {
    const config = await this.getFeatureFlags();
    const status = {};
    
    for (const [flagName, flag] of Object.entries(config.flags)) {
      const envConfig = flag.environments[this.environment];
      status[flagName] = {
        enabled: flag.enabled && (envConfig?.enabled !== false),
        rolloutPercentage: envConfig?.rolloutPercentage ?? flag.rolloutPercentage,
        description: flag.description,
        dependencies: flag.dependencies || [],
        dependenciesMet: flag.dependencies ? 
          await Promise.all(flag.dependencies.map(dep => this.isFeatureEnabled(dep))) : 
          [true]
      };
    }
    
    return status;
  }

  async validateFeatureFlags() {
    const config = await this.getFeatureFlags();
    const issues = [];
    
    for (const [flagName, flag] of Object.entries(config.flags)) {
      // Check dependencies exist
      if (flag.dependencies) {
        for (const dependency of flag.dependencies) {
          if (!config.flags[dependency]) {
            issues.push(`Flag "${flagName}" depends on non-existent flag "${dependency}"`);
          }
        }
      }
      
      // Check rollout percentage
      if (flag.rolloutPercentage < 0 || flag.rolloutPercentage > 100) {
        issues.push(`Flag "${flagName}" has invalid rollout percentage: ${flag.rolloutPercentage}`);
      }
      
      // Check environment configurations
      for (const [env, envConfig] of Object.entries(flag.environments)) {
        if (envConfig.rolloutPercentage < 0 || envConfig.rolloutPercentage > 100) {
          issues.push(`Flag "${flagName}" has invalid rollout percentage for ${env}: ${envConfig.rolloutPercentage}`);
        }
      }
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }

  async createRolloutPlan(flagName, targetPercentage, steps = 5, intervalMinutes = 30) {
    const config = await this.getFeatureFlags();
    const flag = config.flags[flagName];
    
    if (!flag) {
      throw new Error(`Feature flag "${flagName}" not found`);
    }
    
    const currentPercentage = flag.rolloutPercentage;
    const stepSize = Math.ceil((targetPercentage - currentPercentage) / steps);
    
    const plan = {
      flagName,
      currentPercentage,
      targetPercentage,
      steps: [],
      totalDuration: steps * intervalMinutes
    };
    
    for (let i = 1; i <= steps; i++) {
      const percentage = Math.min(currentPercentage + (stepSize * i), targetPercentage);
      plan.steps.push({
        step: i,
        percentage,
        scheduledTime: new Date(Date.now() + (i * intervalMinutes * 60000)).toISOString(),
        duration: intervalMinutes
      });
    }
    
    return plan;
  }

  async emergencyDisableAll() {
    console.log('🚨 EMERGENCY: Disabling all club system features');
    
    const config = await this.getFeatureFlags();
    const updates = {};
    
    // Disable all club-related features except emergency controls
    for (const [flagName, flag] of Object.entries(config.flags)) {
      if (flagName.startsWith('enableClub') && flagName !== 'enableEmergencyRollback') {
        updates[flagName] = {
          enabled: false,
          rolloutPercentage: 0
        };
      }
    }
    
    await this.updateFeatureFlags(updates);
    console.log('🚨 Emergency disable completed');
    
    return updates;
  }

  async cleanup() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }
}

// CLI interface
if (require.main === module) {
  const manager = new FeatureFlagManager();
  const command = process.argv[2];
  const flagName = process.argv[3];
  const value = process.argv[4];

  async function runCommand() {
    try {
      switch (command) {
        case 'status':
          const status = await manager.getFeatureStatus();
          console.log(JSON.stringify(status, null, 2));
          break;

        case 'enable':
          if (!flagName) {
            console.error('Please specify a feature flag name');
            process.exit(1);
          }
          const rollout = value ? parseInt(value) : 100;
          await manager.enableFeature(flagName, rollout);
          break;

        case 'disable':
          if (!flagName) {
            console.error('Please specify a feature flag name');
            process.exit(1);
          }
          await manager.disableFeature(flagName);
          break;

        case 'rollout':
          if (!flagName || !value) {
            console.error('Please specify feature flag name and percentage');
            process.exit(1);
          }
          await manager.setRolloutPercentage(flagName, parseInt(value));
          break;

        case 'validate':
          const validation = await manager.validateFeatureFlags();
          if (validation.valid) {
            console.log('✅ All feature flags are valid');
          } else {
            console.error('❌ Feature flag validation failed:');
            validation.issues.forEach(issue => console.error(`  - ${issue}`));
            process.exit(1);
          }
          break;

        case 'plan':
          if (!flagName || !value) {
            console.error('Please specify feature flag name and target percentage');
            process.exit(1);
          }
          const plan = await manager.createRolloutPlan(flagName, parseInt(value));
          console.log(JSON.stringify(plan, null, 2));
          break;

        case 'emergency-disable':
          await manager.emergencyDisableAll();
          break;

        default:
          console.log('Usage:');
          console.log('  node feature-flag-manager.js status');
          console.log('  node feature-flag-manager.js enable <flag-name> [rollout-percentage]');
          console.log('  node feature-flag-manager.js disable <flag-name>');
          console.log('  node feature-flag-manager.js rollout <flag-name> <percentage>');
          console.log('  node feature-flag-manager.js validate');
          console.log('  node feature-flag-manager.js plan <flag-name> <target-percentage>');
          console.log('  node feature-flag-manager.js emergency-disable');
      }
    } catch (error) {
      console.error('❌ Command failed:', error.message);
      process.exit(1);
    } finally {
      await manager.cleanup();
    }
  }

  runCommand();
}

module.exports = FeatureFlagManager;