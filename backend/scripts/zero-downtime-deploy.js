#!/usr/bin/env node

/**
 * Zero-Downtime Deployment Strategy
 * Implements blue-green deployment pattern for Strapi applications
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const axios = require('axios');
const chalk = require('chalk');

class ZeroDowntimeDeployer {
  constructor(config) {
    this.config = config;
    this.environment = process.env.NODE_ENV || 'development';
    this.projectRoot = path.join(__dirname, '..');
    this.deploymentId = `deploy-${Date.now()}`;
    this.logFile = path.join(this.projectRoot, 'logs', `deployment-${this.deploymentId}.log`);
    
    // Deployment configuration
    this.ports = {
      blue: parseInt(process.env.BLUE_PORT) || 1337,
      green: parseInt(process.env.GREEN_PORT) || 1338,
      proxy: parseInt(process.env.PROXY_PORT) || 1339
    };
    
    this.currentSlot = 'blue';
    this.targetSlot = 'green';
    this.processes = new Map();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow
    };
    
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(colors[type](logMessage));
    
    // Write to log file
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async executeCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        cwd: this.projectRoot,
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options
      });

      let stdout = '';
      let stderr = '';

      if (options.silent) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      child.on('error', reject);
    });
  }

  async getCurrentSlot() {
    try {
      const statusFile = path.join(this.projectRoot, '.deployment-status');
      if (fs.existsSync(statusFile)) {
        const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
        return status.currentSlot || 'blue';
      }
    } catch (error) {
      this.log(`Failed to read deployment status: ${error.message}`, 'warning');
    }
    return 'blue';
  }

  async updateDeploymentStatus(status) {
    const statusFile = path.join(this.projectRoot, '.deployment-status');
    const deploymentStatus = {
      ...status,
      lastUpdate: new Date().toISOString(),
      deploymentId: this.deploymentId
    };
    
    fs.writeFileSync(statusFile, JSON.stringify(deploymentStatus, null, 2));
  }

  async startApplication(slot, port) {
    this.log(`Starting application on ${slot} slot (port ${port})`);
    
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: this.environment,
      DEPLOYMENT_SLOT: slot
    };

    const child = spawn('npm', ['start'], {
      cwd: this.projectRoot,
      env,
      stdio: 'pipe',
      detached: true
    });

    // Store process reference
    this.processes.set(slot, child);

    // Handle process output
    child.stdout.on('data', (data) => {
      this.log(`[${slot}] ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      this.log(`[${slot}] ERROR: ${data.toString().trim()}`, 'error');
    });

    child.on('close', (code) => {
      this.log(`[${slot}] Process exited with code ${code}`, code === 0 ? 'info' : 'error');
      this.processes.delete(slot);
    });

    // Wait for application to start
    await this.waitForHealthCheck(port, 60000);
    
    this.log(`Application started successfully on ${slot} slot`, 'success');
    return child;
  }

  async stopApplication(slot) {
    const process = this.processes.get(slot);
    if (process) {
      this.log(`Stopping application on ${slot} slot`);
      
      // Graceful shutdown
      process.kill('SIGTERM');
      
      // Wait for graceful shutdown
      await new Promise(resolve => {
        const timeout = setTimeout(() => {
          this.log(`Force killing ${slot} process`, 'warning');
          process.kill('SIGKILL');
          resolve();
        }, 10000);
        
        process.on('close', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      
      this.processes.delete(slot);
      this.log(`Application stopped on ${slot} slot`, 'success');
    }
  }

  async waitForHealthCheck(port, timeout = 30000) {
    const startTime = Date.now();
    const healthUrl = `http://localhost:${port}/api/health`;
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await axios.get(healthUrl, { timeout: 5000 });
        if (response.status === 200) {
          return true;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Health check failed for port ${port} after ${timeout}ms`);
  }

  async runTests(port) {
    this.log('Running deployment tests...');
    
    try {
      // Run verification script against the new deployment
      const result = await this.executeCommand(
        `PORT=${port} node scripts/deployment-verification.js`,
        { silent: true }
      );
      
      if (result.code === 0) {
        this.log('All deployment tests passed', 'success');
        return true;
      } else {
        this.log('Deployment tests failed', 'error');
        return false;
      }
    } catch (error) {
      this.log(`Test execution failed: ${error.message}`, 'error');
      return false;
    }
  }

  async switchTraffic(fromSlot, toSlot) {
    this.log(`Switching traffic from ${fromSlot} to ${toSlot}`);
    
    // Update proxy configuration or load balancer
    // This would typically involve updating nginx config, HAProxy, or cloud load balancer
    
    // For this example, we'll update a simple proxy configuration
    const proxyConfig = {
      target: `http://localhost:${this.ports[toSlot]}`,
      currentSlot: toSlot,
      timestamp: new Date().toISOString()
    };
    
    const proxyConfigFile = path.join(this.projectRoot, 'config', 'proxy.json');
    fs.writeFileSync(proxyConfigFile, JSON.stringify(proxyConfig, null, 2));
    
    // Reload proxy (this would be environment-specific)
    try {
      await this.executeCommand('sudo nginx -s reload', { silent: true });
    } catch (error) {
      this.log(`Failed to reload proxy: ${error.message}`, 'warning');
    }
    
    this.log(`Traffic switched to ${toSlot} slot`, 'success');
  }

  async createBackup() {
    this.log('Creating backup before deployment...');
    
    const backupScript = path.join(this.projectRoot, 'scripts', 'create-backup.sh');
    if (fs.existsSync(backupScript)) {
      await this.executeCommand(`bash ${backupScript} ${this.environment}`);
    } else {
      // Fallback backup creation
      const backupDir = path.join(this.projectRoot, 'backups', this.deploymentId);
      fs.mkdirSync(backupDir, { recursive: true });
      
      // Backup database
      await this.executeCommand(`pg_dump -h ${process.env.DATABASE_HOST} -U ${process.env.DATABASE_USERNAME} -d ${process.env.DATABASE_NAME} > ${backupDir}/database.sql`);
      
      // Backup application files
      await this.executeCommand(`tar -czf ${backupDir}/application.tar.gz --exclude=node_modules --exclude=.tmp --exclude=logs .`);
    }
    
    this.log('Backup created successfully', 'success');
  }

  async deployToSlot(slot) {
    this.log(`Deploying to ${slot} slot...`);
    
    const port = this.ports[slot];
    
    try {
      // Build application
      this.log('Building application...');
      await this.executeCommand('npm ci --production=false');
      await this.executeCommand('npm run build');
      
      // Run database migrations
      this.log('Running database migrations...');
      await this.executeCommand('node scripts/migration-runner.js migrate');
      
      // Start application on target slot
      await this.startApplication(slot, port);
      
      // Run tests
      const testsPass = await this.runTests(port);
      if (!testsPass) {
        throw new Error('Deployment tests failed');
      }
      
      this.log(`Deployment to ${slot} slot completed successfully`, 'success');
      return true;
    } catch (error) {
      this.log(`Deployment to ${slot} slot failed: ${error.message}`, 'error');
      
      // Cleanup failed deployment
      await this.stopApplication(slot);
      
      throw error;
    }
  }

  async rollback() {
    this.log('Starting rollback procedure...');
    
    try {
      // Switch back to previous slot
      await this.switchTraffic(this.targetSlot, this.currentSlot);
      
      // Stop failed deployment
      await this.stopApplication(this.targetSlot);
      
      // Update deployment status
      await this.updateDeploymentStatus({
        currentSlot: this.currentSlot,
        status: 'rolled_back',
        error: 'Deployment failed, rolled back to previous version'
      });
      
      this.log('Rollback completed successfully', 'success');
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'error');
      throw error;
    }
  }

  async deploy() {
    try {
      this.log(`Starting zero-downtime deployment (ID: ${this.deploymentId})`);
      
      // Determine current and target slots
      this.currentSlot = await this.getCurrentSlot();
      this.targetSlot = this.currentSlot === 'blue' ? 'green' : 'blue';
      
      this.log(`Current slot: ${this.currentSlot}, Target slot: ${this.targetSlot}`);
      
      // Update deployment status
      await this.updateDeploymentStatus({
        currentSlot: this.currentSlot,
        targetSlot: this.targetSlot,
        status: 'deploying'
      });
      
      // Create backup
      await this.createBackup();
      
      // Deploy to target slot
      await this.deployToSlot(this.targetSlot);
      
      // Switch traffic to new deployment
      await this.switchTraffic(this.currentSlot, this.targetSlot);
      
      // Wait for traffic to stabilize
      this.log('Waiting for traffic to stabilize...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Stop old deployment
      await this.stopApplication(this.currentSlot);
      
      // Update deployment status
      await this.updateDeploymentStatus({
        currentSlot: this.targetSlot,
        status: 'completed',
        previousSlot: this.currentSlot
      });
      
      this.log('Zero-downtime deployment completed successfully!', 'success');
      return true;
    } catch (error) {
      this.log(`Deployment failed: ${error.message}`, 'error');
      
      // Attempt rollback
      try {
        await this.rollback();
      } catch (rollbackError) {
        this.log(`Rollback also failed: ${rollbackError.message}`, 'error');
      }
      
      return false;
    }
  }

  async cleanup() {
    this.log('Cleaning up deployment processes...');
    
    // Stop all processes
    for (const [slot, process] of this.processes) {
      await this.stopApplication(slot);
    }
    
    this.log('Cleanup completed');
  }
}

// CLI Interface
async function main() {
  const command = process.argv[2] || 'deploy';
  const environment = process.env.NODE_ENV || 'development';
  
  // Load configuration
  let config;
  try {
    const configPath = path.join(__dirname, '..', 'config', 'environments', `${environment}.json`);
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error(chalk.red('Failed to load configuration:'), error.message);
    process.exit(1);
  }
  
  // Create logs directory
  const logsDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const deployer = new ZeroDowntimeDeployer(config);
  
  // Handle process termination
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, cleaning up...');
    await deployer.cleanup();
    process.exit(1);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, cleaning up...');
    await deployer.cleanup();
    process.exit(1);
  });
  
  try {
    switch (command) {
      case 'deploy':
        const success = await deployer.deploy();
        process.exit(success ? 0 : 1);
        break;
        
      case 'rollback':
        await deployer.rollback();
        break;
        
      case 'status':
        const statusFile = path.join(__dirname, '..', '.deployment-status');
        if (fs.existsSync(statusFile)) {
          const status = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
          console.log(JSON.stringify(status, null, 2));
        } else {
          console.log('No deployment status found');
        }
        break;
        
      default:
        console.log('Usage: node zero-downtime-deploy.js [deploy|rollback|status]');
        process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('Deployment failed:'), error.message);
    await deployer.cleanup();
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Unhandled error:'), error);
    process.exit(1);
  });
}

module.exports = ZeroDowntimeDeployer;