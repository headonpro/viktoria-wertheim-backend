#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Comprehensive checks to ensure deployment was successful
 */

const axios = require('axios');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class DeploymentVerifier {
  constructor(config) {
    this.config = config;
    this.baseUrl = `http://localhost:${config.server.port || 1337}`;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow
    };
    
    console.log(colors[type](`[${type.toUpperCase()}] ${message}`));
  }

  async runTest(name, testFn) {
    try {
      this.log(`Running test: ${name}`);
      const result = await testFn();
      
      if (result.success) {
        this.results.passed++;
        this.log(`✓ ${name}`, 'success');
      } else {
        this.results.failed++;
        this.log(`✗ ${name}: ${result.message}`, 'error');
      }
      
      this.results.tests.push({
        name,
        success: result.success,
        message: result.message,
        details: result.details
      });
      
      return result.success;
    } catch (error) {
      this.results.failed++;
      this.log(`✗ ${name}: ${error.message}`, 'error');
      
      this.results.tests.push({
        name,
        success: false,
        message: error.message,
        details: error.stack
      });
      
      return false;
    }
  }

  async testDatabaseConnection() {
    return this.runTest('Database Connection', async () => {
      const client = new Client(this.config.database.connection);
      
      try {
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
        
        return { success: true, message: 'Database connection successful' };
      } catch (error) {
        return { success: false, message: `Database connection failed: ${error.message}` };
      }
    });
  }

  async testMigrations() {
    return this.runTest('Database Migrations', async () => {
      const client = new Client(this.config.database.connection);
      
      try {
        await client.connect();
        
        // Check if migrations table exists
        const migrationsTable = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'knex_migrations'
          );
        `);
        
        if (!migrationsTable.rows[0].exists) {
          return { success: false, message: 'Migrations table does not exist' };
        }
        
        // Check if automation tables exist
        const requiredTables = ['queue_jobs', 'table_snapshots', 'automation_audit_logs'];
        const missingTables = [];
        
        for (const table of requiredTables) {
          const result = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            );
          `, [table]);
          
          if (!result.rows[0].exists) {
            missingTables.push(table);
          }
        }
        
        await client.end();
        
        if (missingTables.length > 0) {
          return { 
            success: false, 
            message: `Missing tables: ${missingTables.join(', ')}` 
          };
        }
        
        return { success: true, message: 'All required tables exist' };
      } catch (error) {
        return { success: false, message: `Migration check failed: ${error.message}` };
      }
    });
  }

  async testApiHealth() {
    return this.runTest('API Health Check', async () => {
      try {
        const response = await axios.get(`${this.baseUrl}/api/health`, {
          timeout: 10000
        });
        
        if (response.status === 200) {
          return { success: true, message: 'API health check passed' };
        } else {
          return { success: false, message: `API returned status ${response.status}` };
        }
      } catch (error) {
        return { success: false, message: `API health check failed: ${error.message}` };
      }
    });
  }

  async testAutomationServices() {
    return this.runTest('Automation Services', async () => {
      try {
        // Test queue status endpoint
        const queueResponse = await axios.get(`${this.baseUrl}/api/tabellen-eintraege/queue-status`, {
          timeout: 5000
        });
        
        if (queueResponse.status !== 200) {
          return { success: false, message: 'Queue status endpoint not responding' };
        }
        
        // Test admin endpoints
        const adminResponse = await axios.get(`${this.baseUrl}/api/tabellen-eintraege/admin/system-status`, {
          timeout: 5000
        });
        
        if (adminResponse.status !== 200) {
          return { success: false, message: 'Admin endpoints not responding' };
        }
        
        return { success: true, message: 'Automation services are running' };
      } catch (error) {
        return { success: false, message: `Automation services check failed: ${error.message}` };
      }
    });
  }

  async testFilePermissions() {
    return this.runTest('File Permissions', async () => {
      const requiredDirs = [
        'logs',
        'snapshots',
        'backups'
      ];
      
      const issues = [];
      
      for (const dir of requiredDirs) {
        const dirPath = path.join(__dirname, '..', dir);
        
        try {
          // Check if directory exists
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }
          
          // Test write permissions
          const testFile = path.join(dirPath, 'test-write.tmp');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
        } catch (error) {
          issues.push(`${dir}: ${error.message}`);
        }
      }
      
      if (issues.length > 0) {
        return { success: false, message: `Permission issues: ${issues.join(', ')}` };
      }
      
      return { success: true, message: 'All file permissions are correct' };
    });
  }

  async testEnvironmentConfiguration() {
    return this.runTest('Environment Configuration', async () => {
      const requiredEnvVars = [
        'DATABASE_HOST',
        'DATABASE_NAME',
        'DATABASE_USERNAME',
        'DATABASE_PASSWORD'
      ];
      
      const missing = [];
      
      for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
          missing.push(envVar);
        }
      }
      
      if (missing.length > 0) {
        return { success: false, message: `Missing environment variables: ${missing.join(', ')}` };
      }
      
      // Check if configuration file exists
      const environment = process.env.NODE_ENV || 'development';
      const configPath = path.join(__dirname, '..', 'config', 'environments', `${environment}.json`);
      
      if (!fs.existsSync(configPath)) {
        return { success: false, message: `Configuration file not found: ${environment}.json` };
      }
      
      return { success: true, message: 'Environment configuration is valid' };
    });
  }

  async testPerformance() {
    return this.runTest('Performance Check', async () => {
      const startTime = Date.now();
      
      try {
        // Test API response time
        await axios.get(`${this.baseUrl}/api/health`, { timeout: 5000 });
        const responseTime = Date.now() - startTime;
        
        if (responseTime > 2000) {
          return { 
            success: false, 
            message: `API response time too slow: ${responseTime}ms` 
          };
        }
        
        return { 
          success: true, 
          message: `API response time: ${responseTime}ms` 
        };
      } catch (error) {
        return { success: false, message: `Performance check failed: ${error.message}` };
      }
    });
  }

  async testDataIntegrity() {
    return this.runTest('Data Integrity', async () => {
      const client = new Client(this.config.database.connection);
      
      try {
        await client.connect();
        
        // Check for orphaned records
        const orphanedSpiele = await client.query(`
          SELECT COUNT(*) as count FROM spiele s
          WHERE s.heim_team_id NOT IN (SELECT id FROM teams)
             OR s.gast_team_id NOT IN (SELECT id FROM teams)
        `);
        
        if (parseInt(orphanedSpiele.rows[0].count) > 0) {
          return { 
            success: false, 
            message: `Found ${orphanedSpiele.rows[0].count} orphaned spiele records` 
          };
        }
        
        // Check for invalid table entries
        const invalidEntries = await client.query(`
          SELECT COUNT(*) as count FROM tabellen_eintraege
          WHERE punkte < 0 OR spiele < 0 OR tore_fuer < 0 OR tore_gegen < 0
        `);
        
        if (parseInt(invalidEntries.rows[0].count) > 0) {
          return { 
            success: false, 
            message: `Found ${invalidEntries.rows[0].count} invalid table entries` 
          };
        }
        
        await client.end();
        
        return { success: true, message: 'Data integrity checks passed' };
      } catch (error) {
        return { success: false, message: `Data integrity check failed: ${error.message}` };
      }
    });
  }

  async runAllTests() {
    this.log('Starting deployment verification...', 'info');
    
    const tests = [
      () => this.testDatabaseConnection(),
      () => this.testMigrations(),
      () => this.testApiHealth(),
      () => this.testAutomationServices(),
      () => this.testFilePermissions(),
      () => this.testEnvironmentConfiguration(),
      () => this.testPerformance(),
      () => this.testDataIntegrity()
    ];
    
    for (const test of tests) {
      await test();
    }
    
    this.printSummary();
    
    return this.results.failed === 0;
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log(chalk.cyan('DEPLOYMENT VERIFICATION SUMMARY'));
    console.log('='.repeat(50));
    
    console.log(chalk.green(`✓ Passed: ${this.results.passed}`));
    console.log(chalk.red(`✗ Failed: ${this.results.failed}`));
    console.log(chalk.yellow(`⚠ Warnings: ${this.results.warnings}`));
    
    if (this.results.failed > 0) {
      console.log('\n' + chalk.red('FAILED TESTS:'));
      this.results.tests
        .filter(test => !test.success)
        .forEach(test => {
          console.log(chalk.red(`  ✗ ${test.name}: ${test.message}`));
        });
    }
    
    console.log('\n' + (this.results.failed === 0 ? 
      chalk.green('🎉 DEPLOYMENT VERIFICATION PASSED') : 
      chalk.red('❌ DEPLOYMENT VERIFICATION FAILED')
    ));
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      summary: {
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        success: this.results.failed === 0
      },
      tests: this.results.tests
    };
    
    const reportPath = path.join(__dirname, '..', 'logs', `verification-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`Verification report saved to: ${reportPath}`, 'info');
    
    return reportPath;
  }
}

// CLI Interface
async function main() {
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
  
  const verifier = new DeploymentVerifier(config);
  
  try {
    const success = await verifier.runAllTests();
    await verifier.generateReport();
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('Verification failed:'), error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Unhandled error:'), error);
    process.exit(1);
  });
}

module.exports = DeploymentVerifier;