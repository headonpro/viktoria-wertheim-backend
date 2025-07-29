#!/usr/bin/env node

/**
 * Deployment Orchestrator
 * 
 * Coordinates the complete deployment process including environment setup,
 * feature flags, database migrations, and zero-downtime deployment.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const EnvironmentConfigManager = require('./environment-configs');
const FeatureFlagManager = require('./feature-flag-manager');
const DatabaseMigrationRunner = require('./database-migration-runner');
const ClubSystemDeployment = require('./deploy-club-system');

class DeploymentOrchestrator {
  constructor(options = {}) {
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.dryRun = options.dryRun || false;
    this.skipValidation = options.skipValidation || false;
    this.rolloutPercentage = options.rolloutPercentage || 0;
    this.deploymentStrategy = options.deploymentStrategy || 'gradual';
    
    this.deploymentId = `orchestrated-${Date.now()}`;
    this.logFile = path.join(__dirname, '..', 'logs', `orchestration-${this.deploymentId}.log`);
    
    // Initialize managers
    this.envManager = new EnvironmentConfigManager();
    this.flagManager = new FeatureFlagManager({ environment: this.environment });
    this.migrationRunner = new DatabaseMigrationRunner({ 
      environment: this.environment, 
      dryRun: this.dryRun 
    });
    
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      debug: chalk.gray
    };
    
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(colors[level](logMessage));
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async validatePrerequisites() {
    this.log('=== VALIDATING DEPLOYMENT PREREQUISITES ===');
    
    const issues = [];
    
    try {
      // Validate environment configuration
      const envValidation = this.envManager.validateEnvironmentConfig(this.environment);
      if (!envValidation.valid) {
        issues.push(...envValidation.issues.map(issue => `Environment: ${issue}`));
      }
      
      // Validate feature flags
      const flagValidation = await this.flagManager.validateFeatureFlags();
      if (!flagValidation.valid) {
        issues.push(...flagValidation.issues.map(issue => `Feature Flags: ${issue}`));
      }
      
      // Validate database migrations
      const migrationValidation = await this.migrationRunner.validateMigrations();
      if (!migrationValidation.valid) {
        issues.push(...migrationValidation.issues.map(issue => `Migrations: ${issue}`));
      }
      
      // Check system resources
      await this.checkSystemResources();
      
      // Validate deployment strategy
      this.validateDeploymentStrategy();
      
      if (issues.length > 0) {
        this.log('❌ Prerequisite validation failed:', 'error');
        issues.forEach(issue => this.log(`  - ${issue}`, 'error'));
        throw new Error('Prerequisite validation failed');
      }
      
      this.log('✅ All prerequisites validated successfully', 'success');
    } catch (error) {
      this.log(`❌ Prerequisite validation error: ${error.message}`, 'error');
      throw error;
    }
  }

  async checkSystemResources() {
    // Check disk space
    const { execSync } = require('child_process');
    
    try {
      const diskUsage = execSync('df -h /', { encoding: 'utf8' });
      this.log(`Disk usage: ${diskUsage.split('\n')[1]}`, 'debug');
      
      // Check memory
      const memInfo = execSync('free -h', { encoding: 'utf8' });
      this.log(`Memory info: ${memInfo.split('\n')[1]}`, 'debug');
      
      // Check database connectivity
      const { Client } = require('pg');
      const client = new Client({
        host: process.env.DATABASE_HOST || 'localhost',
        port: process.env.DATABASE_PORT || 5432,
        database: process.env.DATABASE_NAME || 'viktoria_wertheim',
        user: process.env.DATABASE_USERNAME || 'postgres',
        password: process.env.DATABASE_PASSWORD || ''
      });
      
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      
      this.log('✅ System resources check passed', 'success');
    } catch (error) {
      this.log(`⚠️  System resources check warning: ${error.message}`, 'warning');
    }
  }

  validateDeploymentStrategy() {
    const validStrategies = ['immediate', 'gradual', 'canary'];
    if (!validStrategies.includes(this.deploymentStrategy)) {
      throw new Error(`Invalid deployment strategy: ${this.deploymentStrategy}`);
    }
    
    if (this.environment === 'production' && this.deploymentStrategy === 'immediate') {
      this.log('⚠️  Using immediate deployment strategy in production', 'warning');
    }
  }

  async setupEnvironment() {
    this.log('=== SETTING UP DEPLOYMENT ENVIRONMENT ===');
    
    try {
      // Generate environment-specific configuration
      const envFile = path.join(__dirname, '..', '..', `.env.${this.environment}`);
      this.envManager.generateEnvironmentFile(this.environment, envFile);
      
      // Load environment variables
      require('dotenv').config({ path: envFile });
      
      // Validate environment setup
      const requiredVars = [
        'DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USERNAME', 'DATABASE_PASSWORD'
      ];
      
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }
      
      this.log('✅ Environment setup completed', 'success');
    } catch (error) {
      this.log(`❌ Environment setup failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async runDatabaseMigrations() {
    this.log('=== RUNNING DATABASE MIGRATIONS ===');
    
    try {
      // Check migration status
      const status = await this.migrationRunner.getMigrationStatus();
      this.log(`Migration status: ${status.executed}/${status.total} executed, ${status.pending} pending`);
      
      if (status.pending > 0) {
        this.log(`Executing ${status.pending} pending migrations`);
        await this.migrationRunner.runMigrations();
      } else {
        this.log('No pending migrations', 'success');
      }
      
      // Validate migration success
      const postStatus = await this.migrationRunner.getMigrationStatus();
      if (postStatus.pending > 0) {
        throw new Error(`${postStatus.pending} migrations still pending after execution`);
      }
      
      this.log('✅ Database migrations completed successfully', 'success');
    } catch (error) {
      this.log(`❌ Database migration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async configureFeatureFlags() {
    this.log('=== CONFIGURING FEATURE FLAGS ===');
    
    try {
      const deploymentPlan = this.getFeatureFlagDeploymentPlan();
      
      for (const phase of deploymentPlan.phases) {
        this.log(`Executing phase: ${phase.name}`);
        
        for (const flagUpdate of phase.flagUpdates) {
          if (this.dryRun) {
            this.log(`DRY RUN: Would update ${flagUpdate.flag} to ${flagUpdate.rolloutPercentage}%`, 'warning');
          } else {
            await this.flagManager.setRolloutPercentage(flagUpdate.flag, flagUpdate.rolloutPercentage);
            this.log(`Updated ${flagUpdate.flag} to ${flagUpdate.rolloutPercentage}%`);
          }
        }
        
        if (phase.waitTime && !this.dryRun) {
          this.log(`Waiting ${phase.waitTime}ms before next phase`);
          await new Promise(resolve => setTimeout(resolve, phase.waitTime));
        }
      }
      
      this.log('✅ Feature flags configured successfully', 'success');
    } catch (error) {
      this.log(`❌ Feature flag configuration failed: ${error.message}`, 'error');
      throw error;
    }
  }

  getFeatureFlagDeploymentPlan() {
    const baseFlags = [
      'enableClubCollection',
      'enableClubGames', 
      'enableClubTables',
      'enableClubAdminPanel'
    ];
    
    switch (this.deploymentStrategy) {
      case 'immediate':
        return {
          phases: [{
            name: 'Immediate Activation',
            flagUpdates: baseFlags.map(flag => ({
              flag,
              rolloutPercentage: this.rolloutPercentage
            }))
          }]
        };
        
      case 'gradual':
        return {
          phases: [
            {
              name: 'Phase 1: Core Features (25%)',
              flagUpdates: [
                { flag: 'enableClubCollection', rolloutPercentage: Math.min(25, this.rolloutPercentage) }
              ],
              waitTime: 300000 // 5 minutes
            },
            {
              name: 'Phase 2: Game Features (50%)',
              flagUpdates: [
                { flag: 'enableClubCollection', rolloutPercentage: Math.min(50, this.rolloutPercentage) },
                { flag: 'enableClubGames', rolloutPercentage: Math.min(25, this.rolloutPercentage) }
              ],
              waitTime: 300000 // 5 minutes
            },
            {
              name: 'Phase 3: Table Features (75%)',
              flagUpdates: [
                { flag: 'enableClubCollection', rolloutPercentage: Math.min(75, this.rolloutPercentage) },
                { flag: 'enableClubGames', rolloutPercentage: Math.min(50, this.rolloutPercentage) },
                { flag: 'enableClubTables', rolloutPercentage: Math.min(25, this.rolloutPercentage) }
              ],
              waitTime: 300000 // 5 minutes
            },
            {
              name: 'Phase 4: Full Rollout',
              flagUpdates: baseFlags.map(flag => ({
                flag,
                rolloutPercentage: this.rolloutPercentage
              }))
            }
          ]
        };
        
      case 'canary':
        return {
          phases: [
            {
              name: 'Canary: 5% Rollout',
              flagUpdates: baseFlags.map(flag => ({
                flag,
                rolloutPercentage: Math.min(5, this.rolloutPercentage)
              })),
              waitTime: 600000 // 10 minutes
            },
            {
              name: 'Canary: 25% Rollout',
              flagUpdates: baseFlags.map(flag => ({
                flag,
                rolloutPercentage: Math.min(25, this.rolloutPercentage)
              })),
              waitTime: 600000 // 10 minutes
            },
            {
              name: 'Full Rollout',
              flagUpdates: baseFlags.map(flag => ({
                flag,
                rolloutPercentage: this.rolloutPercentage
              }))
            }
          ]
        };
        
      default:
        throw new Error(`Unknown deployment strategy: ${this.deploymentStrategy}`);
    }
  }

  async deployApplication() {
    this.log('=== DEPLOYING APPLICATION ===');
    
    try {
      const deployment = new ClubSystemDeployment({
        environment: this.environment,
        dryRun: this.dryRun,
        rolloutPercentage: this.rolloutPercentage,
        skipMigrations: true, // Already done in previous step
        skipValidation: this.skipValidation
      });
      
      await deployment.deploy();
      
      this.log('✅ Application deployment completed', 'success');
    } catch (error) {
      this.log(`❌ Application deployment failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async validateDeployment() {
    this.log('=== VALIDATING DEPLOYMENT ===');
    
    try {
      // Run deployment validation script
      const validationScript = path.join(__dirname, 'deployment-validation-runner.js');
      const { execSync } = require('child_process');
      
      const validationResult = execSync(
        `node ${validationScript} --environment=${this.environment}`,
        { encoding: 'utf8', cwd: path.join(__dirname, '..', '..') }
      );
      
      this.log('Validation output:', 'debug');
      this.log(validationResult, 'debug');
      
      // Check feature flag status
      const flagStatus = await this.flagManager.getFeatureStatus();
      const enabledFlags = Object.entries(flagStatus)
        .filter(([_, status]) => status.enabled && status.rolloutPercentage > 0)
        .map(([name, _]) => name);
      
      this.log(`Enabled features: ${enabledFlags.join(', ')}`);
      
      this.log('✅ Deployment validation completed', 'success');
    } catch (error) {
      this.log(`❌ Deployment validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async monitorDeployment() {
    this.log('=== MONITORING DEPLOYMENT ===');
    
    const monitoringDuration = this.environment === 'production' ? 600000 : 300000; // 10 or 5 minutes
    const checkInterval = 30000; // 30 seconds
    
    this.log(`Monitoring for ${monitoringDuration / 1000} seconds`);
    
    const startTime = Date.now();
    let healthChecksPassed = 0;
    let healthChecksFailed = 0;
    
    const monitorInterval = setInterval(async () => {
      try {
        // Basic health check
        const { execSync } = require('child_process');
        execSync('node scripts/club-health-check.js --silent', { 
          cwd: path.join(__dirname, '..', '..'),
          stdio: 'pipe'
        });
        
        healthChecksPassed++;
        this.log(`Health check passed (${healthChecksPassed}/${Math.floor((Date.now() - startTime) / checkInterval)})`, 'debug');
        
      } catch (error) {
        healthChecksFailed++;
        this.log(`Health check failed: ${error.message}`, 'warning');
        
        if (healthChecksFailed >= 3) {
          clearInterval(monitorInterval);
          throw new Error('Multiple health check failures detected');
        }
      }
    }, checkInterval);
    
    // Wait for monitoring period
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        clearInterval(monitorInterval);
        
        if (healthChecksFailed >= 3) {
          reject(new Error('Deployment monitoring failed'));
        } else {
          resolve();
        }
      }, monitoringDuration);
    });
    
    this.log(`✅ Deployment monitoring completed - ${healthChecksPassed} checks passed, ${healthChecksFailed} failed`, 'success');
  }

  async rollback() {
    this.log('🚨 INITIATING DEPLOYMENT ROLLBACK');
    
    try {
      // Emergency disable all club features
      await this.flagManager.emergencyDisableAll();
      
      // Rollback database migrations if needed
      // Note: This would need specific rollback logic based on what was deployed
      
      // Restart application
      const deployment = new ClubSystemDeployment({
        environment: this.environment,
        dryRun: this.dryRun
      });
      
      await deployment.rollback();
      
      this.log('✅ Rollback completed successfully', 'success');
    } catch (error) {
      this.log(`❌ Rollback failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async orchestrateDeployment() {
    this.log(`=== STARTING ORCHESTRATED DEPLOYMENT ===`);
    this.log(`Environment: ${this.environment}`);
    this.log(`Strategy: ${this.deploymentStrategy}`);
    this.log(`Rollout: ${this.rolloutPercentage}%`);
    this.log(`Dry Run: ${this.dryRun}`);
    this.log(`Deployment ID: ${this.deploymentId}`);
    
    try {
      await this.validatePrerequisites();
      await this.setupEnvironment();
      await this.runDatabaseMigrations();
      await this.configureFeatureFlags();
      await this.deployApplication();
      await this.validateDeployment();
      await this.monitorDeployment();
      
      this.log('🎉 ORCHESTRATED DEPLOYMENT COMPLETED SUCCESSFULLY!', 'success');
      
      // Generate deployment report
      await this.generateDeploymentReport();
      
    } catch (error) {
      this.log(`💥 ORCHESTRATED DEPLOYMENT FAILED: ${error.message}`, 'error');
      
      if (!this.dryRun && this.environment === 'production') {
        this.log('Initiating automatic rollback for production failure', 'warning');
        try {
          await this.rollback();
        } catch (rollbackError) {
          this.log(`💥 ROLLBACK ALSO FAILED: ${rollbackError.message}`, 'error');
        }
      }
      
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async generateDeploymentReport() {
    const report = {
      deploymentId: this.deploymentId,
      environment: this.environment,
      strategy: this.deploymentStrategy,
      rolloutPercentage: this.rolloutPercentage,
      timestamp: new Date().toISOString(),
      status: 'completed',
      featureFlags: await this.flagManager.getFeatureStatus(),
      migrations: await this.migrationRunner.getMigrationStatus(),
      logFile: this.logFile
    };
    
    const reportFile = path.join(path.dirname(this.logFile), `deployment-report-${this.deploymentId}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log(`📊 Deployment report generated: ${reportFile}`, 'success');
  }

  async cleanup() {
    try {
      await this.flagManager.cleanup();
      this.log('✅ Cleanup completed');
    } catch (error) {
      this.log(`⚠️  Cleanup warning: ${error.message}`, 'warning');
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    environment: process.env.NODE_ENV || 'development',
    dryRun: false,
    skipValidation: false,
    rolloutPercentage: 0,
    deploymentStrategy: 'gradual'
  };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    switch (key) {
      case 'environment':
        options.environment = value;
        break;
      case 'rollout-percentage':
        options.rolloutPercentage = parseInt(value);
        break;
      case 'strategy':
        options.deploymentStrategy = value;
        break;
      case 'dry-run':
        options.dryRun = value === 'true';
        break;
      case 'skip-validation':
        options.skipValidation = value === 'true';
        break;
    }
  }
  
  const orchestrator = new DeploymentOrchestrator(options);
  
  orchestrator.orchestrateDeployment()
    .then(() => {
      console.log('✅ Orchestrated deployment completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Orchestrated deployment failed:', error.message);
      process.exit(1);
    });
}

module.exports = DeploymentOrchestrator;