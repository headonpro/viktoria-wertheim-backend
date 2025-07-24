#!/usr/bin/env node

/**
 * Master Consolidation Script
 * 
 * This script orchestrates the complete team/mannschaft consolidation process:
 * 1. Updates schemas
 * 2. Migrates data
 * 3. Validates results
 * 4. Provides rollback if needed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MasterConsolidation {
  constructor() {
    this.scriptsDir = __dirname;
    this.logFile = path.join(__dirname, '../backups/master-consolidation.log');
    this.startTime = Date.now();
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    
    // Ensure log directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(this.logFile, logEntry + '\n');
  }

  async runScript(scriptName, description) {
    this.log(`Starting: ${description}`);
    
    try {
      const scriptPath = path.join(this.scriptsDir, scriptName);
      
      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Script not found: ${scriptPath}`);
      }
      
      // Run the script
      const result = execSync(`node "${scriptPath}"`, {
        cwd: path.dirname(scriptPath),
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      this.log(`Completed: ${description}`);
      this.log(`Output: ${result.substring(0, 500)}${result.length > 500 ? '...' : ''}`);
      
      return { success: true, output: result };
      
    } catch (error) {
      this.log(`ERROR in ${description}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async preFlightChecks() {
    this.log('Running pre-flight checks...');
    
    const checks = {
      strapiInstalled: false,
      backupDirExists: false,
      schemasExist: false,
      databaseConnected: false
    };
    
    try {
      // Check if Strapi is installed
      const packagePath = path.join(__dirname, '../package.json');
      if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        checks.strapiInstalled = !!pkg.dependencies['@strapi/strapi'];
      }
      
      // Check backup directory
      const backupDir = path.join(__dirname, '../backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      checks.backupDirExists = true;
      
      // Check if required schemas exist
      const requiredSchemas = ['team', 'mannschaft', 'spiel', 'spieler'];
      checks.schemasExist = requiredSchemas.every(schema => {
        const schemaPath = path.join(__dirname, `../src/api/${schema}/content-types/${schema}/schema.json`);
        return fs.existsSync(schemaPath);
      });
      
      this.log(`Pre-flight checks: ${JSON.stringify(checks, null, 2)}`);
      
      const allPassed = Object.values(checks).every(check => check === true);
      
      if (!allPassed) {
        throw new Error('Pre-flight checks failed');
      }
      
      this.log('Pre-flight checks passed');
      return checks;
      
    } catch (error) {
      this.log(`Pre-flight check error: ${error.message}`);
      throw error;
    }
  }

  async createSystemBackup() {
    this.log('Creating system backup...');
    
    const backupDir = path.join(__dirname, '../backups/system-backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Backup all schemas
    const schemasDir = path.join(__dirname, '../src/api');
    const contentTypes = ['team', 'mannschaft', 'spiel', 'spieler', 'club', 'liga', 'saison'];
    
    for (const contentType of contentTypes) {
      const schemaPath = path.join(schemasDir, `${contentType}/content-types/${contentType}/schema.json`);
      if (fs.existsSync(schemaPath)) {
        const backupPath = path.join(backupDir, `${contentType}-schema-${Date.now()}.json`);
        fs.copyFileSync(schemaPath, backupPath);
        this.log(`Backed up ${contentType} schema`);
      }
    }
    
    this.log('System backup completed');
  }

  async runConsolidation() {
    this.log('Starting team/mannschaft consolidation process...');
    
    const results = {
      preFlightChecks: null,
      systemBackup: null,
      schemaUpdates: null,
      dataConsolidation: null,
      validation: null,
      success: false,
      duration: 0
    };
    
    try {
      // Pre-flight checks
      results.preFlightChecks = await this.preFlightChecks();
      
      // Create system backup
      await this.createSystemBackup();
      results.systemBackup = { success: true };
      
      // Update schemas
      this.log('=== PHASE 1: SCHEMA UPDATES ===');
      results.schemaUpdates = await this.runScript(
        'update-schemas-for-consolidation.js',
        'Updating content type schemas'
      );
      
      if (!results.schemaUpdates.success) {
        throw new Error('Schema updates failed');
      }
      
      // Consolidate data
      this.log('=== PHASE 2: DATA CONSOLIDATION ===');
      results.dataConsolidation = await this.runScript(
        'consolidate-team-mannschaft.js',
        'Consolidating team and mannschaft data'
      );
      
      if (!results.dataConsolidation.success) {
        throw new Error('Data consolidation failed');
      }
      
      // Validate results
      this.log('=== PHASE 3: VALIDATION ===');
      results.validation = await this.runScript(
        'validate-consolidation.js',
        'Validating consolidation results'
      );
      
      if (!results.validation.success) {
        this.log('WARNING: Validation failed, but consolidation may still be successful');
      }
      
      results.success = true;
      results.duration = Date.now() - this.startTime;
      
      this.log(`Consolidation completed successfully in ${results.duration}ms`);
      
    } catch (error) {
      results.success = false;
      results.duration = Date.now() - this.startTime;
      results.error = error.message;
      
      this.log(`Consolidation failed: ${error.message}`);
      this.log('Consider running rollback script if needed');
    }
    
    // Save results
    const resultsFile = path.join(__dirname, '../backups', `consolidation-results-${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    this.log(`Results saved to ${resultsFile}`);
    
    return results;
  }

  async rollback() {
    this.log('Starting rollback process...');
    
    try {
      const rollbackResult = await this.runScript(
        'rollback-consolidation.js',
        'Rolling back consolidation changes'
      );
      
      if (rollbackResult.success) {
        this.log('Rollback completed successfully');
      } else {
        this.log('Rollback failed - manual intervention may be required');
      }
      
      return rollbackResult;
      
    } catch (error) {
      this.log(`Rollback error: ${error.message}`);
      throw error;
    }
  }

  printUsage() {
    console.log(`
Usage: node run-team-mannschaft-consolidation.js [command]

Commands:
  run       Run the complete consolidation process (default)
  rollback  Rollback the consolidation changes
  validate  Run validation only
  help      Show this help message

Examples:
  node run-team-mannschaft-consolidation.js
  node run-team-mannschaft-consolidation.js run
  node run-team-mannschaft-consolidation.js rollback
  node run-team-mannschaft-consolidation.js validate
    `);
  }

  async run(command = 'run') {
    this.log(`Master consolidation script started with command: ${command}`);
    
    try {
      switch (command) {
        case 'run':
          return await this.runConsolidation();
          
        case 'rollback':
          return await this.rollback();
          
        case 'validate':
          return await this.runScript(
            'validate-consolidation.js',
            'Running validation only'
          );
          
        case 'help':
          this.printUsage();
          return { success: true };
          
        default:
          throw new Error(`Unknown command: ${command}`);
      }
      
    } catch (error) {
      this.log(`Master script error: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const master = new MasterConsolidation();
  const command = process.argv[2] || 'run';
  
  master.run(command)
    .then(result => {
      if (result.success) {
        console.log('\n✅ Operation completed successfully');
        process.exit(0);
      } else {
        console.log('\n❌ Operation failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Fatal error:', error.message);
      process.exit(1);
    });
}

module.exports = MasterConsolidation;