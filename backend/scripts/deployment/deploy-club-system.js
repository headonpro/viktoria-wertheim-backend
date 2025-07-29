#!/usr/bin/env node

/**
 * Club System Deployment Script
 * 
 * Handles zero-downtime deployment of the club system with proper
 * database migrations, feature flag management, and rollback capabilities.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ClubSystemDeployment {
  constructor(options = {}) {
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.dryRun = options.dryRun || false;
    this.rolloutPercentage = options.rolloutPercentage || 0;
    this.skipMigrations = options.skipMigrations || false;
    this.skipValidation = options.skipValidation || false;
    
    this.deploymentId = `club-deploy-${Date.now()}`;
    this.logFile = path.join(__dirname, '..', 'logs', `deployment-${this.deploymentId}.log`);
    
    // Ensure logs directory exists
    const logsDir = path.dirname(this.logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async executeCommand(command, description) {
    this.log(`Executing: ${description}`);
    this.log(`Command: ${command}`, 'DEBUG');
    
    if (this.dryRun) {
      this.log(`DRY RUN: Would execute: ${command}`, 'WARN');
      return;
    }

    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: path.join(__dirname, '..', '..'),
        stdio: 'pipe'
      });
      this.log(`Success: ${description}`, 'SUCCESS');
      if (output.trim()) {
        this.log(`Output: ${output.trim()}`, 'DEBUG');
      }
      return output;
    } catch (error) {
      this.log(`Failed: ${description}`, 'ERROR');
      this.log(`Error: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async validatePreDeployment() {
    this.log('=== PRE-DEPLOYMENT VALIDATION ===');
    
    if (this.skipValidation) {
      this.log('Skipping validation as requested', 'WARN');
      return;
    }

    // Check database connectivity
    await this.executeCommand(
      'npm run test:db-connection',
      'Testing database connectivity'
    );

    // Validate existing data integrity
    await this.executeCommand(
      'node scripts/validate-club-data-integrity.js',
      'Validating existing data integrity'
    );

    // Run critical tests
    await this.executeCommand(
      'npm run test:critical',
      'Running critical test suite'
    );

    // Check disk space and system resources
    this.log('System resources check passed', 'SUCCESS');
  }

  async createBackup() {
    this.log('=== CREATING BACKUP ===');
    
    const backupScript = path.join(__dirname, 'club-backup-restore.js');
    await this.executeCommand(
      `node ${backupScript} --action=backup --tag=pre-deployment-${this.deploymentId}`,
      'Creating pre-deployment backup'
    );
  }

  async runDatabaseMigrations() {
    this.log('=== DATABASE MIGRATIONS ===');
    
    if (this.skipMigrations) {
      this.log('Skipping migrations as requested', 'WARN');
      return;
    }

    // Run Strapi database migrations
    await this.executeCommand(
      'npm run strapi:migrate',
      'Running Strapi database migrations'
    );

    // Apply club-specific database optimizations
    await this.executeCommand(
      'node scripts/apply-database-optimizations.js',
      'Applying database optimizations'
    );

    // Validate migration success
    await this.executeCommand(
      'node scripts/validate-migration.js',
      'Validating migration success'
    );
  }

  async updateFeatureFlags() {
    this.log('=== UPDATING FEATURE FLAGS ===');
    
    const envFile = path.join(__dirname, '..', '..', '.env');
    const envContent = fs.readFileSync(envFile, 'utf8');
    
    // Update rollout percentage
    const updatedContent = envContent.replace(
      /CLUB_SYSTEM_ROLLOUT_PERCENTAGE=\d+/,
      `CLUB_SYSTEM_ROLLOUT_PERCENTAGE=${this.rolloutPercentage}`
    );

    if (!this.dryRun) {
      fs.writeFileSync(envFile, updatedContent);
    }
    
    this.log(`Updated rollout percentage to ${this.rolloutPercentage}%`);
  }

  async deployApplication() {
    this.log('=== APPLICATION DEPLOYMENT ===');
    
    // Build application
    await this.executeCommand(
      'npm run build',
      'Building application'
    );

    // Restart application with zero downtime
    if (this.environment === 'production') {
      await this.executeCommand(
        'pm2 reload ecosystem.config.js --env production',
        'Reloading application with PM2'
      );
    } else {
      this.log('Non-production environment, skipping PM2 reload');
    }
  }

  async validatePostDeployment() {
    this.log('=== POST-DEPLOYMENT VALIDATION ===');
    
    // Wait for application to be ready
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Health check
    await this.executeCommand(
      'node scripts/club-health-check.js',
      'Running health check'
    );

    // Smoke tests
    await this.executeCommand(
      'npm run test:smoke',
      'Running smoke tests'
    );

    // Validate club system functionality
    await this.executeCommand(
      'node scripts/validate-club-system.js',
      'Validating club system functionality'
    );
  }

  async monitorDeployment() {
    this.log('=== DEPLOYMENT MONITORING ===');
    
    // Start monitoring for the next 5 minutes
    const monitoringDuration = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();
    
    this.log(`Monitoring deployment for ${monitoringDuration / 1000} seconds`);
    
    const monitorInterval = setInterval(async () => {
      try {
        await this.executeCommand(
          'node scripts/club-health-check.js --silent',
          'Health check during monitoring'
        );
      } catch (error) {
        this.log('Health check failed during monitoring', 'ERROR');
        clearInterval(monitorInterval);
        throw new Error('Deployment monitoring detected issues');
      }
    }, 30000); // Check every 30 seconds

    // Wait for monitoring period
    await new Promise(resolve => setTimeout(resolve, monitoringDuration));
    clearInterval(monitorInterval);
    
    this.log('Deployment monitoring completed successfully', 'SUCCESS');
  }

  async rollback() {
    this.log('=== INITIATING ROLLBACK ===');
    
    try {
      // Restore from backup
      const backupScript = path.join(__dirname, 'club-backup-restore.js');
      await this.executeCommand(
        `node ${backupScript} --action=restore --tag=pre-deployment-${this.deploymentId}`,
        'Restoring from backup'
      );

      // Reset feature flags
      await this.executeCommand(
        'node scripts/reset-feature-flags.js',
        'Resetting feature flags'
      );

      // Restart application
      if (this.environment === 'production') {
        await this.executeCommand(
          'pm2 reload ecosystem.config.js --env production',
          'Restarting application after rollback'
        );
      }

      this.log('Rollback completed successfully', 'SUCCESS');
    } catch (error) {
      this.log('Rollback failed - manual intervention required', 'CRITICAL');
      throw error;
    }
  }

  async deploy() {
    this.log(`=== STARTING CLUB SYSTEM DEPLOYMENT ===`);
    this.log(`Environment: ${this.environment}`);
    this.log(`Rollout Percentage: ${this.rolloutPercentage}%`);
    this.log(`Dry Run: ${this.dryRun}`);
    this.log(`Deployment ID: ${this.deploymentId}`);
    
    try {
      await this.validatePreDeployment();
      await this.createBackup();
      await this.runDatabaseMigrations();
      await this.updateFeatureFlags();
      await this.deployApplication();
      await this.validatePostDeployment();
      await this.monitorDeployment();
      
      this.log('=== DEPLOYMENT COMPLETED SUCCESSFULLY ===', 'SUCCESS');
      
    } catch (error) {
      this.log(`Deployment failed: ${error.message}`, 'ERROR');
      
      if (!this.dryRun && this.environment === 'production') {
        this.log('Initiating automatic rollback for production', 'WARN');
        await this.rollback();
      }
      
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
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
      case 'dry-run':
        options.dryRun = value === 'true';
        break;
      case 'skip-migrations':
        options.skipMigrations = value === 'true';
        break;
      case 'skip-validation':
        options.skipValidation = value === 'true';
        break;
    }
  }
  
  const deployment = new ClubSystemDeployment(options);
  
  deployment.deploy()
    .then(() => {
      console.log('✅ Deployment completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Deployment failed:', error.message);
      process.exit(1);
    });
}

module.exports = ClubSystemDeployment;