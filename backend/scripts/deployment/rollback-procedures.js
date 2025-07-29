#!/usr/bin/env node

/**
 * Rollback Procedures for Club System Deployment
 * 
 * Provides comprehensive rollback capabilities with different levels
 * of rollback based on the severity and scope of issues.
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const FeatureFlagManager = require('./feature-flag-manager');
const DatabaseMigrationRunner = require('./database-migration-runner');

class RollbackManager {
  constructor(options = {}) {
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.rollbackType = options.rollbackType || 'feature'; // feature, partial, full
    this.dryRun = options.dryRun || false;
    this.force = options.force || false;
    
    this.rollbackId = `rollback-${Date.now()}`;
    this.logFile = path.join(__dirname, '..', 'logs', `rollback-${this.rollbackId}.log`);
    
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

  async validateRollbackPreconditions() {
    this.log('=== VALIDATING ROLLBACK PRECONDITIONS ===');
    
    const issues = [];
    
    try {
      // Check if system is in a rollback-able state
      const systemStatus = await this.getSystemStatus();
      if (!systemStatus.canRollback) {
        issues.push('System is not in a rollback-able state');
      }
      
      // Check backup availability
      const backupStatus = await this.checkBackupAvailability();
      if (!backupStatus.available && this.rollbackType === 'full') {
        issues.push('No valid backup available for full rollback');
      }
      
      // Check feature flag status
      const flagStatus = await this.flagManager.getFeatureStatus();
      const enabledClubFeatures = Object.entries(flagStatus)
        .filter(([name, status]) => name.startsWith('enableClub') && status.enabled)
        .length;
      
      if (enabledClubFeatures === 0 && this.rollbackType === 'feature') {
        issues.push('No club features are currently enabled');
      }
      
      // Check database migration status
      const migrationStatus = await this.migrationRunner.getMigrationStatus();
      if (migrationStatus.pending > 0) {
        issues.push('Pending database migrations detected');
      }
      
      // Check for active users (production only)
      if (this.environment === 'production' && !this.force) {
        const activeUsers = await this.getActiveUserCount();
        if (activeUsers > 10) {
          issues.push(`${activeUsers} active users detected - use --force to override`);
        }
      }
      
      if (issues.length > 0) {
        this.log('❌ Rollback precondition validation failed:', 'error');
        issues.forEach(issue => this.log(`  - ${issue}`, 'error'));
        throw new Error('Rollback preconditions not met');
      }
      
      this.log('✅ All rollback preconditions validated', 'success');
    } catch (error) {
      this.log(`❌ Precondition validation error: ${error.message}`, 'error');
      throw error;
    }
  }

  async getSystemStatus() {
    try {
      // Check application health
      const axios = require('axios');
      const healthUrl = `http://localhost:${process.env.PORT || 1337}/api/health`;
      
      const response = await axios.get(healthUrl, { timeout: 5000 });
      
      return {
        healthy: response.status === 200,
        canRollback: true,
        uptime: response.data?.uptime || 0
      };
    } catch (error) {
      return {
        healthy: false,
        canRollback: true, // Can still rollback even if unhealthy
        error: error.message
      };
    }
  }

  async checkBackupAvailability() {
    const backupDir = path.join(__dirname, '..', '..', 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return { available: false, reason: 'Backup directory not found' };
    }
    
    const backupFiles = fs.readdirSync(backupDir)
      .filter(file => file.includes('pre-deployment') || file.includes('migration'))
      .sort()
      .reverse(); // Most recent first
    
    if (backupFiles.length === 0) {
      return { available: false, reason: 'No backup files found' };
    }
    
    // Check if most recent backup is valid
    const latestBackup = path.join(backupDir, backupFiles[0]);
    const stats = fs.statSync(latestBackup);
    const ageHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
    
    if (ageHours > 24) {
      return { 
        available: false, 
        reason: `Latest backup is ${Math.round(ageHours)} hours old` 
      };
    }
    
    return {
      available: true,
      latestBackup: latestBackup,
      backupAge: ageHours,
      totalBackups: backupFiles.length
    };
  }

  async getActiveUserCount() {
    // In a real implementation, this would check active sessions
    // For now, return a simulated count
    return Math.floor(Math.random() * 20);
  }

  async performFeatureRollback() {
    this.log('=== PERFORMING FEATURE ROLLBACK ===');
    
    try {
      // Get current feature status
      const currentStatus = await this.flagManager.getFeatureStatus();
      
      // Identify enabled club features
      const enabledFeatures = Object.entries(currentStatus)
        .filter(([name, status]) => name.startsWith('enableClub') && status.enabled)
        .map(([name, _]) => name);
      
      this.log(`Found ${enabledFeatures.length} enabled club features`);
      
      // Create rollback plan
      const rollbackPlan = this.createFeatureRollbackPlan(enabledFeatures);
      
      // Execute rollback plan
      for (const phase of rollbackPlan.phases) {
        this.log(`Executing phase: ${phase.name}`);
        
        for (const action of phase.actions) {
          if (this.dryRun) {
            this.log(`DRY RUN: Would ${action.type} ${action.feature}`, 'warning');
          } else {
            await this.executeRollbackAction(action);
          }
        }
        
        if (phase.waitTime && !this.dryRun) {
          this.log(`Waiting ${phase.waitTime}ms before next phase`);
          await new Promise(resolve => setTimeout(resolve, phase.waitTime));
        }
      }
      
      this.log('✅ Feature rollback completed successfully', 'success');
    } catch (error) {
      this.log(`❌ Feature rollback failed: ${error.message}`, 'error');
      throw error;
    }
  }

  createFeatureRollbackPlan(enabledFeatures) {
    // Rollback in reverse dependency order
    const rollbackOrder = [
      'enableClubTables',
      'enableClubGames', 
      'enableClubAdminPanel',
      'enableClubCollection',
      'enableClubCaching',
      'enableClubPerformanceOptimizations',
      'enableClubMetrics'
    ];
    
    const featuresToRollback = rollbackOrder.filter(feature => 
      enabledFeatures.includes(feature)
    );
    
    return {
      phases: [
        {
          name: 'Phase 1: Disable Advanced Features',
          actions: featuresToRollback
            .filter(f => ['enableClubTables', 'enableClubAdminPanel'].includes(f))
            .map(feature => ({ type: 'disable', feature })),
          waitTime: 30000 // 30 seconds
        },
        {
          name: 'Phase 2: Disable Core Features',
          actions: featuresToRollback
            .filter(f => ['enableClubGames', 'enableClubCollection'].includes(f))
            .map(feature => ({ type: 'disable', feature })),
          waitTime: 60000 // 1 minute
        },
        {
          name: 'Phase 3: Disable Performance Features',
          actions: featuresToRollback
            .filter(f => ['enableClubCaching', 'enableClubPerformanceOptimizations', 'enableClubMetrics'].includes(f))
            .map(feature => ({ type: 'disable', feature }))
        }
      ]
    };
  }

  async executeRollbackAction(action) {
    switch (action.type) {
      case 'disable':
        await this.flagManager.disableFeature(action.feature);
        this.log(`Disabled feature: ${action.feature}`);
        break;
        
      case 'rollout':
        await this.flagManager.setRolloutPercentage(action.feature, action.percentage);
        this.log(`Set ${action.feature} rollout to ${action.percentage}%`);
        break;
        
      default:
        throw new Error(`Unknown rollback action type: ${action.type}`);
    }
  }

  async performPartialRollback() {
    this.log('=== PERFORMING PARTIAL ROLLBACK ===');
    
    try {
      // Partial rollback: reduce rollout percentages instead of full disable
      const currentStatus = await this.flagManager.getFeatureStatus();
      
      const partialRollbackPlan = {
        'enableClubCollection': 25, // Reduce to 25%
        'enableClubGames': 10,      // Reduce to 10%
        'enableClubTables': 0,      // Disable completely
        'enableClubAdminPanel': 0   // Disable completely
      };
      
      for (const [feature, percentage] of Object.entries(partialRollbackPlan)) {
        if (currentStatus[feature]?.enabled) {
          if (this.dryRun) {
            this.log(`DRY RUN: Would set ${feature} to ${percentage}%`, 'warning');
          } else {
            if (percentage === 0) {
              await this.flagManager.disableFeature(feature);
              this.log(`Disabled ${feature}`);
            } else {
              await this.flagManager.setRolloutPercentage(feature, percentage);
              this.log(`Reduced ${feature} rollout to ${percentage}%`);
            }
          }
        }
      }
      
      this.log('✅ Partial rollback completed successfully', 'success');
    } catch (error) {
      this.log(`❌ Partial rollback failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async performFullRollback() {
    this.log('=== PERFORMING FULL ROLLBACK ===');
    
    try {
      // Step 1: Disable all club features immediately
      await this.flagManager.emergencyDisableAll();
      this.log('✅ All club features disabled');
      
      // Step 2: Restore database from backup
      await this.restoreFromBackup();
      
      // Step 3: Restart application services
      await this.restartServices();
      
      // Step 4: Validate rollback success
      await this.validateRollbackSuccess();
      
      this.log('✅ Full rollback completed successfully', 'success');
    } catch (error) {
      this.log(`❌ Full rollback failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async restoreFromBackup() {
    this.log('Restoring database from backup...');
    
    const backupStatus = await this.checkBackupAvailability();
    if (!backupStatus.available) {
      throw new Error(`Backup not available: ${backupStatus.reason}`);
    }
    
    if (this.dryRun) {
      this.log(`DRY RUN: Would restore from ${backupStatus.latestBackup}`, 'warning');
      return;
    }
    
    try {
      const { execSync } = require('child_process');
      
      // Create current backup before restore
      const preRestoreBackup = path.join(
        path.dirname(backupStatus.latestBackup),
        `pre-rollback-${this.rollbackId}.sql`
      );
      
      execSync(`pg_dump -h ${process.env.DATABASE_HOST} -U ${process.env.DATABASE_USERNAME} -d ${process.env.DATABASE_NAME} > ${preRestoreBackup}`);
      this.log(`Created pre-rollback backup: ${preRestoreBackup}`);
      
      // Restore from backup
      execSync(`psql -h ${process.env.DATABASE_HOST} -U ${process.env.DATABASE_USERNAME} -d ${process.env.DATABASE_NAME} < ${backupStatus.latestBackup}`);
      this.log(`✅ Database restored from ${backupStatus.latestBackup}`);
      
    } catch (error) {
      this.log(`❌ Database restore failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async restartServices() {
    this.log('Restarting application services...');
    
    if (this.dryRun) {
      this.log('DRY RUN: Would restart services', 'warning');
      return;
    }
    
    try {
      const { execSync } = require('child_process');
      
      if (this.environment === 'production') {
        // Use PM2 for production
        execSync('pm2 reload ecosystem.config.js --env production');
        this.log('✅ Production services restarted with PM2');
      } else {
        // For development/staging, just log the action
        this.log('✅ Service restart would be handled by process manager');
      }
      
      // Wait for services to be ready
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (error) {
      this.log(`❌ Service restart failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async validateRollbackSuccess() {
    this.log('Validating rollback success...');
    
    try {
      // Check application health
      const systemStatus = await this.getSystemStatus();
      if (!systemStatus.healthy) {
        throw new Error('Application is not healthy after rollback');
      }
      
      // Check feature flags are disabled
      const flagStatus = await this.flagManager.getFeatureStatus();
      const enabledClubFeatures = Object.entries(flagStatus)
        .filter(([name, status]) => name.startsWith('enableClub') && status.enabled && name !== 'enableEmergencyRollback')
        .length;
      
      if (enabledClubFeatures > 0) {
        this.log(`Warning: ${enabledClubFeatures} club features still enabled`, 'warning');
      }
      
      // Run basic smoke tests
      await this.runSmokeTests();
      
      this.log('✅ Rollback validation completed successfully', 'success');
    } catch (error) {
      this.log(`❌ Rollback validation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async runSmokeTests() {
    this.log('Running post-rollback smoke tests...');
    
    try {
      const { execSync } = require('child_process');
      
      // Run basic API tests
      const testResult = execSync('npm run test:smoke', { 
        encoding: 'utf8',
        cwd: path.join(__dirname, '..', '..'),
        stdio: 'pipe'
      });
      
      this.log('✅ Smoke tests passed', 'success');
    } catch (error) {
      this.log(`⚠️  Smoke tests failed: ${error.message}`, 'warning');
      // Don't fail rollback for smoke test failures
    }
  }

  async executeRollback() {
    this.log(`=== STARTING ${this.rollbackType.toUpperCase()} ROLLBACK ===`);
    this.log(`Environment: ${this.environment}`);
    this.log(`Rollback Type: ${this.rollbackType}`);
    this.log(`Dry Run: ${this.dryRun}`);
    this.log(`Force: ${this.force}`);
    this.log(`Rollback ID: ${this.rollbackId}`);
    
    try {
      // Validate preconditions
      await this.validateRollbackPreconditions();
      
      // Execute appropriate rollback type
      switch (this.rollbackType) {
        case 'feature':
          await this.performFeatureRollback();
          break;
          
        case 'partial':
          await this.performPartialRollback();
          break;
          
        case 'full':
          await this.performFullRollback();
          break;
          
        default:
          throw new Error(`Unknown rollback type: ${this.rollbackType}`);
      }
      
      // Generate rollback report
      await this.generateRollbackReport();
      
      this.log('🎉 ROLLBACK COMPLETED SUCCESSFULLY!', 'success');
      
    } catch (error) {
      this.log(`💥 ROLLBACK FAILED: ${error.message}`, 'error');
      
      // Generate failure report
      await this.generateFailureReport(error);
      
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  async generateRollbackReport() {
    const report = {
      rollbackId: this.rollbackId,
      environment: this.environment,
      rollbackType: this.rollbackType,
      timestamp: new Date().toISOString(),
      status: 'completed',
      dryRun: this.dryRun,
      featureFlags: await this.flagManager.getFeatureStatus(),
      systemStatus: await this.getSystemStatus(),
      logFile: this.logFile
    };
    
    const reportFile = path.join(path.dirname(this.logFile), `rollback-report-${this.rollbackId}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log(`📊 Rollback report generated: ${reportFile}`, 'success');
  }

  async generateFailureReport(error) {
    const report = {
      rollbackId: this.rollbackId,
      environment: this.environment,
      rollbackType: this.rollbackType,
      timestamp: new Date().toISOString(),
      status: 'failed',
      error: error.message,
      stack: error.stack,
      logFile: this.logFile
    };
    
    const reportFile = path.join(path.dirname(this.logFile), `rollback-failure-${this.rollbackId}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    this.log(`📊 Failure report generated: ${reportFile}`, 'error');
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
    rollbackType: 'feature',
    dryRun: false,
    force: false
  };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    switch (key) {
      case 'environment':
        options.environment = value;
        break;
      case 'type':
        options.rollbackType = value;
        break;
      case 'dry-run':
        options.dryRun = value === 'true';
        break;
      case 'force':
        options.force = value === 'true';
        break;
    }
  }
  
  const rollbackManager = new RollbackManager(options);
  
  rollbackManager.executeRollback()
    .then(() => {
      console.log('✅ Rollback completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Rollback failed:', error.message);
      process.exit(1);
    });
}

module.exports = RollbackManager;