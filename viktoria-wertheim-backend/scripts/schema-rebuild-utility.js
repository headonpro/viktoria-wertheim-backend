#!/usr/bin/env node

/**
 * Schema Rebuild and Cache Clearing Utility
 * 
 * This script provides comprehensive schema rebuild functionality:
 * - Clears Strapi build cache
 * - Regenerates TypeScript types
 * - Implements server restart automation
 * - Verifies schema changes are properly compiled and loaded
 * 
 * Requirements: 2.1, 2.2
 */

const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');
const chalk = require('chalk');

class SchemaRebuildUtility {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.info = [];
    this.projectRoot = path.join(__dirname, '..');
    this.buildCachePath = path.join(this.projectRoot, '.strapi');
    this.nodeModulesPath = path.join(this.projectRoot, 'node_modules');
    this.typesPath = path.join(this.projectRoot, 'types/generated');
    this.rootTypesPath = path.join(__dirname, '../../types/generated');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [SCHEMA-REBUILD]`;
    
    switch (type) {
      case 'error':
        console.log(chalk.red(`${prefix} ERROR: ${message}`));
        this.errors.push(message);
        break;
      case 'warning':
        console.log(chalk.yellow(`${prefix} WARNING: ${message}`));
        this.warnings.push(message);
        break;
      case 'success':
        console.log(chalk.green(`${prefix} SUCCESS: ${message}`));
        break;
      case 'info':
      default:
        console.log(chalk.blue(`${prefix} INFO: ${message}`));
        this.info.push(message);
        break;
    }
  }

  /**
   * Clear Strapi build cache
   */
  async clearBuildCache() {
    this.log('Clearing Strapi build cache...');
    
    try {
      if (fs.existsSync(this.buildCachePath)) {
        await this.removeDirectory(this.buildCachePath);
        this.log('Build cache cleared successfully', 'success');
      } else {
        this.log('No build cache found to clear', 'info');
      }
      return true;
    } catch (error) {
      this.log(`Failed to clear build cache: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Clear generated types
   */
  async clearGeneratedTypes() {
    this.log('Clearing generated TypeScript types...');
    
    try {
      if (fs.existsSync(this.typesPath)) {
        const files = fs.readdirSync(this.typesPath);
        for (const file of files) {
          const filePath = path.join(this.typesPath, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        }
        this.log('Generated types cleared successfully', 'success');
      } else {
        this.log('No generated types found to clear', 'info');
      }
      return true;
    } catch (error) {
      this.log(`Failed to clear generated types: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Clear node_modules/.cache if it exists
   */
  async clearNodeModulesCache() {
    this.log('Clearing node_modules cache...');
    
    try {
      const cachePath = path.join(this.nodeModulesPath, '.cache');
      if (fs.existsSync(cachePath)) {
        await this.removeDirectory(cachePath);
        this.log('Node modules cache cleared successfully', 'success');
      } else {
        this.log('No node modules cache found to clear', 'info');
      }
      return true;
    } catch (error) {
      this.log(`Failed to clear node modules cache: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Rebuild Strapi application
   */
  async rebuildStrapi() {
    this.log('Rebuilding Strapi application...');
    
    return new Promise((resolve) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: this.projectRoot,
        stdio: 'pipe',
        shell: true
      });

      let buildOutput = '';
      let buildError = '';

      buildProcess.stdout.on('data', (data) => {
        const output = data.toString();
        buildOutput += output;
        // Log build progress
        if (output.includes('Building') || output.includes('Generating')) {
          this.log(output.trim(), 'info');
        }
      });

      buildProcess.stderr.on('data', (data) => {
        const error = data.toString();
        buildError += error;
        if (!error.includes('warning')) {
          this.log(error.trim(), 'error');
        }
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          this.log('Strapi build completed successfully', 'success');
          resolve(true);
        } else {
          this.log(`Strapi build failed with exit code ${code}`, 'error');
          if (buildError) {
            this.log(`Build error output: ${buildError}`, 'error');
          }
          resolve(false);
        }
      });

      buildProcess.on('error', (error) => {
        this.log(`Build process error: ${error.message}`, 'error');
        resolve(false);
      });
    });
  }

  /**
   * Verify schema compilation
   */
  async verifySchemaCompilation() {
    this.log('Verifying schema compilation...');
    
    try {
      // Check if types were generated
      const contentTypesPath = path.join(this.typesPath, 'contentTypes.d.ts');
      if (!fs.existsSync(contentTypesPath)) {
        this.log('Generated types file not found after rebuild', 'error');
        return false;
      }

      // Check if mannschaft types are present
      const typesContent = fs.readFileSync(contentTypesPath, 'utf8');
      if (!typesContent.includes('ApiMannschaftMannschaft')) {
        this.log('Mannschaft types not found in generated file', 'error');
        return false;
      }

      // Check for enum definitions
      const enumFields = ['status', 'liga', 'altersklasse', 'trend'];
      let enumsFound = 0;

      for (const field of enumFields) {
        if (typesContent.includes(`${field}:`)) {
          enumsFound++;
        }
      }

      if (enumsFound === enumFields.length) {
        this.log('All enum fields found in generated types', 'success');
      } else {
        this.log(`Only ${enumsFound}/${enumFields.length} enum fields found in generated types`, 'warning');
      }

      this.log('Schema compilation verification completed', 'success');
      return true;
    } catch (error) {
      this.log(`Schema compilation verification failed: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Test server startup (without keeping it running)
   */
  async testServerStartup() {
    this.log('Testing server startup...');
    
    return new Promise((resolve) => {
      const serverProcess = spawn('npm', ['run', 'develop'], {
        cwd: this.projectRoot,
        stdio: 'pipe',
        shell: true
      });

      let serverStarted = false;
      let timeout;

      const cleanup = () => {
        if (timeout) clearTimeout(timeout);
        if (!serverProcess.killed) {
          serverProcess.kill('SIGTERM');
          // Force kill if it doesn't respond
          setTimeout(() => {
            if (!serverProcess.killed) {
              serverProcess.kill('SIGKILL');
            }
          }, 5000);
        }
      };

      // Set timeout for server startup test
      timeout = setTimeout(() => {
        if (!serverStarted) {
          this.log('Server startup test timed out', 'warning');
          cleanup();
          resolve(false);
        }
      }, 30000); // 30 second timeout

      serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        // Look for successful startup indicators
        if (output.includes('Server started') || 
            output.includes('Welcome back') ||
            output.includes('Admin panel available') ||
            output.includes('http://localhost:1337/admin')) {
          serverStarted = true;
          this.log('Server started successfully', 'success');
          cleanup();
          resolve(true);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const error = data.toString();
        // Only log actual errors, not warnings
        if (error.includes('error') && !error.includes('warning')) {
          this.log(`Server error: ${error.trim()}`, 'error');
        }
      });

      serverProcess.on('close', (code) => {
        if (!serverStarted) {
          if (code === 0) {
            this.log('Server process ended normally', 'info');
          } else {
            this.log(`Server process ended with code ${code}`, 'error');
          }
          resolve(serverStarted);
        }
      });

      serverProcess.on('error', (error) => {
        this.log(`Server startup error: ${error.message}`, 'error');
        cleanup();
        resolve(false);
      });
    });
  }

  /**
   * Run schema validation after rebuild
   */
  async runPostRebuildValidation() {
    this.log('Running post-rebuild validation...');
    
    try {
      const SchemaValidationChecker = require('./schema-validation-checker.js');
      const validator = new SchemaValidationChecker();
      const report = await validator.runValidation();
      
      if (report.summary.errors === 0) {
        this.log('Post-rebuild validation passed', 'success');
        return true;
      } else {
        this.log(`Post-rebuild validation found ${report.summary.errors} errors`, 'error');
        return false;
      }
    } catch (error) {
      this.log(`Post-rebuild validation failed: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Helper method to remove directory recursively
   */
  async removeDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          await this.removeDirectory(filePath);
        } else {
          fs.unlinkSync(filePath);
        }
      }
      
      fs.rmdirSync(dirPath);
    }
  }

  /**
   * Generate rebuild report
   */
  generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        success: results.overall,
        errors: this.errors.length,
        warnings: this.warnings.length,
        info: this.info.length
      },
      steps: results,
      details: {
        errors: this.errors,
        warnings: this.warnings,
        info: this.info
      },
      recommendations: []
    };

    // Add recommendations based on results
    if (!results.overall) {
      report.recommendations.push('Schema rebuild completed with issues - review errors above');
    }

    if (!results.serverTest) {
      report.recommendations.push('Server startup test failed - check server configuration');
    }

    if (!results.validation) {
      report.recommendations.push('Post-rebuild validation failed - check schema consistency');
    }

    // Save report
    const reportPath = path.join(this.projectRoot, 'validation-reports/schema-rebuild-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`Rebuild report saved to: ${reportPath}`, 'success');

    return report;
  }

  /**
   * Run complete schema rebuild process
   */
  async runRebuild(options = {}) {
    this.log('Starting schema rebuild process...');
    console.log(chalk.cyan('=' .repeat(60)));
    
    const results = {
      clearCache: false,
      clearTypes: false,
      clearNodeCache: false,
      rebuild: false,
      verification: false,
      serverTest: false,
      validation: false,
      overall: false
    };

    try {
      // Step 1: Clear build cache
      results.clearCache = await this.clearBuildCache();

      // Step 2: Clear generated types
      results.clearTypes = await this.clearGeneratedTypes();

      // Step 3: Clear node modules cache
      results.clearNodeCache = await this.clearNodeModulesCache();

      // Step 4: Rebuild Strapi
      results.rebuild = await this.rebuildStrapi();

      // Step 5: Verify schema compilation
      if (results.rebuild) {
        results.verification = await this.verifySchemaCompilation();
      }

      // Step 6: Test server startup (optional)
      if (options.testServer !== false) {
        results.serverTest = await this.testServerStartup();
      } else {
        results.serverTest = true; // Skip test
        this.log('Server startup test skipped', 'info');
      }

      // Step 7: Run post-rebuild validation
      if (results.rebuild && results.verification) {
        results.validation = await this.runPostRebuildValidation();
      }

      // Determine overall success
      results.overall = results.clearCache && 
                       results.clearTypes && 
                       results.rebuild && 
                       results.verification && 
                       results.serverTest && 
                       results.validation;

      console.log(chalk.cyan('=' .repeat(60)));
      
      if (results.overall) {
        this.log('Schema rebuild completed successfully!', 'success');
      } else {
        this.log('Schema rebuild completed with issues', 'error');
      }

      const report = this.generateReport(results);
      
      // Print summary
      console.log(chalk.cyan('\nRebuild Summary:'));
      console.log(chalk.green(`  Cache Cleared: ${results.clearCache ? 'Yes' : 'No'}`));
      console.log(chalk.green(`  Types Cleared: ${results.clearTypes ? 'Yes' : 'No'}`));
      console.log(chalk.green(`  Rebuild Success: ${results.rebuild ? 'Yes' : 'No'}`));
      console.log(chalk.green(`  Verification: ${results.verification ? 'Yes' : 'No'}`));
      console.log(chalk.green(`  Server Test: ${results.serverTest ? 'Yes' : 'No'}`));
      console.log(chalk.green(`  Validation: ${results.validation ? 'Yes' : 'No'}`));
      console.log(chalk.red(`  Errors: ${report.summary.errors}`));
      console.log(chalk.yellow(`  Warnings: ${report.summary.warnings}`));

      return report;
    } catch (error) {
      this.log(`Rebuild process failed: ${error.message}`, 'error');
      results.overall = false;
      return this.generateReport(results);
    }
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  if (args.includes('--no-server-test')) {
    options.testServer = false;
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log(chalk.cyan('Schema Rebuild Utility'));
    console.log(chalk.white('Usage: node schema-rebuild-utility.js [options]'));
    console.log(chalk.white(''));
    console.log(chalk.white('Options:'));
    console.log(chalk.white('  --no-server-test    Skip server startup test'));
    console.log(chalk.white('  --help, -h          Show this help message'));
    process.exit(0);
  }

  const utility = new SchemaRebuildUtility();
  utility.runRebuild(options)
    .then(report => {
      process.exit(report.summary.success ? 0 : 1);
    })
    .catch(error => {
      console.error(chalk.red('Rebuild failed:'), error);
      process.exit(1);
    });
}

module.exports = SchemaRebuildUtility;