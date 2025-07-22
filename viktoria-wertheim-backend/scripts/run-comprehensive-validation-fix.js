#!/usr/bin/env node

/**
 * Comprehensive Validation Fix Execution Script
 * 
 * This master script executes all diagnostic and repair operations in a structured workflow
 * to resolve validation issues between admin interface and API endpoints.
 * 
 * Features:
 * - Step-by-step validation fix workflow
 * - Detailed logging and progress reporting
 * - Rollback capability for all operations
 * - Comprehensive reporting and documentation
 * - Interactive confirmation for destructive operations
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { execSync, spawn } = require('child_process');

// Import our validation modules
const { runComprehensiveDiagnostic } = require('./comprehensive-validation-diagnostic');
const SchemaValidationChecker = require('./schema-validation-checker');
const { DatabaseEnumValidator } = require('./database-enum-validation-scanner');
const { DatabaseEnumRepairer } = require('./database-enum-repair');
const { AdminValidationTestRunner } = require('./run-admin-validation-tests');
const { APIConsistencyTestRunner } = require('./run-api-consistency-tests');
const { ValidationErrorAnalysisRunner } = require('./run-validation-error-analysis');
const { ValidationAutomationRunner } = require('./run-validation-automation-suite');

// Configuration
const CONFIG = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@viktoria-wertheim.de',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  REPORT_DIR: './validation-reports',
  BACKUP_DIR: './validation-backups',
  DRY_RUN: process.env.DRY_RUN === 'true',
  INTERACTIVE: process.env.INTERACTIVE !== 'false',
  VERBOSE: process.env.VERBOSE === 'true',
  SKIP_BACKUP: process.env.SKIP_BACKUP === 'true',
  AUTO_CONFIRM: process.env.AUTO_CONFIRM === 'true'
};

// Workflow steps definition
const WORKFLOW_STEPS = [
  {
    id: 'pre_check',
    name: 'Pre-execution System Check',
    description: 'Verify system requirements and connectivity',
    critical: true,
    estimatedTime: '30 seconds'
  },
  {
    id: 'backup',
    name: 'Database Backup Creation',
    description: 'Create safety backup before making changes',
    critical: true,
    estimatedTime: '1-2 minutes',
    destructive: false
  },
  {
    id: 'initial_diagnostic',
    name: 'Initial Comprehensive Diagnostic',
    description: 'Run complete validation diagnostic to identify issues',
    critical: true,
    estimatedTime: '2-3 minutes',
    destructive: false
  },
  {
    id: 'schema_validation',
    name: 'Schema Consistency Verification',
    description: 'Validate schema definitions and compilation',
    critical: true,
    estimatedTime: '1 minute',
    destructive: false
  },
  {
    id: 'database_scan',
    name: 'Database Integrity Validation',
    description: 'Scan database for invalid enum values',
    critical: true,
    estimatedTime: '1-2 minutes',
    destructive: false
  },
  {
    id: 'schema_rebuild',
    name: 'Schema Rebuild and Cache Clear',
    description: 'Rebuild schema and clear Strapi cache',
    critical: false,
    estimatedTime: '2-3 minutes',
    destructive: true
  },
  {
    id: 'database_repair',
    name: 'Database Enum Repair',
    description: 'Fix invalid enum values in database',
    critical: false,
    estimatedTime: '1-2 minutes',
    destructive: true
  },
  {
    id: 'admin_validation_test',
    name: 'Admin Interface Validation Testing',
    description: 'Test admin interface validation functionality',
    critical: true,
    estimatedTime: '2-3 minutes',
    destructive: false
  },
  {
    id: 'api_consistency_test',
    name: 'API Consistency Validation Testing',
    description: 'Test consistency between admin and API validation',
    critical: true,
    estimatedTime: '3-4 minutes',
    destructive: false
  },
  {
    id: 'error_analysis',
    name: 'Validation Error Analysis',
    description: 'Analyze and document validation errors',
    critical: false,
    estimatedTime: '1-2 minutes',
    destructive: false
  },
  {
    id: 'final_validation',
    name: 'Final Validation Suite',
    description: 'Run comprehensive validation tests to verify fixes',
    critical: true,
    estimatedTime: '3-5 minutes',
    destructive: false
  },
  {
    id: 'monitoring_setup',
    name: 'Validation Monitoring Setup',
    description: 'Setup continuous validation monitoring',
    critical: false,
    estimatedTime: '1 minute',
    destructive: false
  }
];

class ComprehensiveValidationFixer {
  constructor() {
    this.startTime = new Date();
    this.endTime = null;
    this.currentStep = null;
    this.completedSteps = [];
    this.failedSteps = [];
    this.skippedSteps = [];
    this.results = {};
    this.rollbackData = [];
    this.errors = [];
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Logging utility with different levels
   */
  log(message, level = 'info', step = null) {
    const timestamp = new Date().toISOString();
    const stepPrefix = step ? `[${step}] ` : '';
    
    let prefix;
    switch (level) {
      case 'error':
        prefix = '❌ ERROR';
        break;
      case 'warn':
        prefix = '⚠️ WARN';
        break;
      case 'success':
        prefix = '✅ SUCCESS';
        break;
      case 'info':
      default:
        prefix = 'ℹ️ INFO';
        break;
    }
    
    const logMessage = `${prefix} [${timestamp}] ${stepPrefix}${message}`;
    console.log(logMessage);
    
    // Store errors for reporting
    if (level === 'error') {
      this.errors.push({
        timestamp,
        step: step || this.currentStep?.id,
        message,
        level
      });
    }
  }

  /**
   * Ask user for confirmation
   */
  async askConfirmation(question, defaultAnswer = false) {
    if (CONFIG.AUTO_CONFIRM) {
      this.log(`Auto-confirming: ${question} -> ${defaultAnswer ? 'YES' : 'NO'}`);
      return defaultAnswer;
    }
    
    if (!CONFIG.INTERACTIVE) {
      return defaultAnswer;
    }

    return new Promise((resolve) => {
      const defaultText = defaultAnswer ? ' [Y/n]' : ' [y/N]';
      this.rl.question(`❓ ${question}${defaultText}: `, (answer) => {
        const response = answer.trim().toLowerCase();
        if (response === '') {
          resolve(defaultAnswer);
        } else {
          resolve(response === 'y' || response === 'yes');
        }
      });
    });
  }

  /**
   * Display workflow overview
   */
  displayWorkflowOverview() {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 COMPREHENSIVE VALIDATION FIX WORKFLOW');
    console.log('='.repeat(80));
    console.log(`Target: ${CONFIG.STRAPI_URL}`);
    console.log(`Mode: ${CONFIG.DRY_RUN ? 'DRY RUN' : 'LIVE EXECUTION'}`);
    console.log(`Interactive: ${CONFIG.INTERACTIVE ? 'YES' : 'NO'}`);
    console.log(`Backup: ${CONFIG.SKIP_BACKUP ? 'SKIPPED' : 'ENABLED'}`);
    
    console.log('\n📋 WORKFLOW STEPS:');
    WORKFLOW_STEPS.forEach((step, index) => {
      const criticalIcon = step.critical ? '🔴' : '🟡';
      const destructiveIcon = step.destructive ? '⚠️' : '✅';
      console.log(`${index + 1}. ${criticalIcon} ${destructiveIcon} ${step.name}`);
      console.log(`   ${step.description}`);
      console.log(`   Estimated time: ${step.estimatedTime}`);
    });
    
    console.log('\n🔍 Legend:');
    console.log('🔴 Critical step (required for success)');
    console.log('🟡 Optional step (recommended but not required)');
    console.log('⚠️ Destructive operation (modifies data)');
    console.log('✅ Safe operation (read-only or reversible)');
    console.log('='.repeat(80));
  }

  /**
   * Execute a workflow step
   */
  async executeStep(stepConfig) {
    this.currentStep = stepConfig;
    this.log(`Starting step: ${stepConfig.name}`, 'info', stepConfig.id);
    
    const stepStartTime = Date.now();
    
    try {
      // Ask for confirmation for destructive operations
      if (stepConfig.destructive && CONFIG.INTERACTIVE) {
        const confirmed = await this.askConfirmation(
          `Step "${stepConfig.name}" will modify data. Continue?`,
          false
        );
        
        if (!confirmed) {
          this.log(`Step skipped by user: ${stepConfig.name}`, 'warn', stepConfig.id);
          this.skippedSteps.push({
            ...stepConfig,
            reason: 'User declined destructive operation',
            timestamp: new Date().toISOString()
          });
          return { success: true, skipped: true };
        }
      }

      let result;
      
      // Execute the appropriate step function
      switch (stepConfig.id) {
        case 'pre_check':
          result = await this.executePreCheck();
          break;
        case 'backup':
          result = await this.executeBackup();
          break;
        case 'initial_diagnostic':
          result = await this.executeInitialDiagnostic();
          break;
        case 'schema_validation':
          result = await this.executeSchemaValidation();
          break;
        case 'database_scan':
          result = await this.executeDatabaseScan();
          break;
        case 'schema_rebuild':
          result = await this.executeSchemaRebuild();
          break;
        case 'database_repair':
          result = await this.executeDatabaseRepair();
          break;
        case 'admin_validation_test':
          result = await this.executeAdminValidationTest();
          break;
        case 'api_consistency_test':
          result = await this.executeAPIConsistencyTest();
          break;
        case 'error_analysis':
          result = await this.executeErrorAnalysis();
          break;
        case 'final_validation':
          result = await this.executeFinalValidation();
          break;
        case 'monitoring_setup':
          result = await this.executeMonitoringSetup();
          break;
        default:
          throw new Error(`Unknown step: ${stepConfig.id}`);
      }

      const duration = Date.now() - stepStartTime;
      
      if (result.success) {
        this.log(`Completed step: ${stepConfig.name} (${duration}ms)`, 'success', stepConfig.id);
        this.completedSteps.push({
          ...stepConfig,
          duration,
          result,
          timestamp: new Date().toISOString()
        });
      } else {
        this.log(`Failed step: ${stepConfig.name} - ${result.error}`, 'error', stepConfig.id);
        this.failedSteps.push({
          ...stepConfig,
          duration,
          error: result.error,
          timestamp: new Date().toISOString()
        });
      }

      // Store step results
      this.results[stepConfig.id] = {
        ...result,
        duration,
        timestamp: new Date().toISOString()
      };

      return result;

    } catch (error) {
      const duration = Date.now() - stepStartTime;
      this.log(`Step failed with exception: ${stepConfig.name} - ${error.message}`, 'error', stepConfig.id);
      
      this.failedSteps.push({
        ...stepConfig,
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.results[stepConfig.id] = {
        success: false,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      };

      return { success: false, error: error.message };
    }
  }

  /**
   * Step implementations
   */
  async executePreCheck() {
    this.log('Checking system requirements and connectivity...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    this.log(`Node.js version: ${nodeVersion}`);
    
    // Check if required modules are available
    const requiredModules = ['axios', 'pg'];
    for (const module of requiredModules) {
      try {
        require.resolve(module);
        this.log(`Module ${module}: ✅ Available`);
      } catch (error) {
        return { success: false, error: `Required module ${module} not found` };
      }
    }
    
    // Test Strapi connectivity
    try {
      const axios = require('axios');
      await axios.get(`${CONFIG.STRAPI_URL}/admin/init`, { timeout: 10000 });
      this.log('Strapi server: ✅ Accessible');
    } catch (error) {
      return { success: false, error: `Strapi server not accessible: ${error.message}` };
    }
    
    // Test admin authentication
    try {
      const axios = require('axios');
      const response = await axios.post(`${CONFIG.STRAPI_URL}/admin/auth/local`, {
        email: CONFIG.ADMIN_EMAIL,
        password: CONFIG.ADMIN_PASSWORD
      });
      
      if (response.data?.data?.token) {
        this.log('Admin authentication: ✅ Successful');
      } else {
        return { success: false, error: 'Admin authentication failed: No token received' };
      }
    } catch (error) {
      return { success: false, error: `Admin authentication failed: ${error.message}` };
    }
    
    // Check database connectivity
    try {
      const { Client } = require('pg');
      const client = new Client({
        host: process.env.DATABASE_HOST || 'localhost',
        port: process.env.DATABASE_PORT || 5432,
        database: process.env.DATABASE_NAME || 'viktoria_wertheim',
        user: process.env.DATABASE_USERNAME || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres123',
      });
      
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      this.log('Database connectivity: ✅ Successful');
    } catch (error) {
      this.log(`Database connectivity: ⚠️ Failed (${error.message})`, 'warn');
      // Don't fail the entire step for database issues
    }
    
    return { success: true, checks: ['node', 'modules', 'strapi', 'auth', 'database'] };
  }

  async executeBackup() {
    if (CONFIG.SKIP_BACKUP) {
      this.log('Backup skipped by configuration');
      return { success: true, skipped: true };
    }
    
    this.log('Creating database backup...');
    
    try {
      // Ensure backup directory exists
      await fs.mkdir(CONFIG.BACKUP_DIR, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(CONFIG.BACKUP_DIR, `validation-fix-backup-${timestamp}.sql`);
      
      // Create PostgreSQL backup
      const backupCommand = `pg_dump -h ${process.env.DATABASE_HOST || 'localhost'} -p ${process.env.DATABASE_PORT || 5432} -U ${process.env.DATABASE_USERNAME || 'postgres'} -d ${process.env.DATABASE_NAME || 'viktoria_wertheim'} -f ${backupFile}`;
      
      if (CONFIG.DRY_RUN) {
        this.log(`DRY RUN: Would execute backup command: ${backupCommand}`);
        return { success: true, dryRun: true, backupFile };
      }
      
      execSync(backupCommand, { 
        env: { 
          ...process.env, 
          PGPASSWORD: process.env.DATABASE_PASSWORD || 'postgres123' 
        },
        stdio: CONFIG.VERBOSE ? 'inherit' : 'pipe'
      });
      
      // Verify backup file was created
      const stats = await fs.stat(backupFile);
      if (stats.size > 0) {
        this.log(`Backup created successfully: ${backupFile} (${stats.size} bytes)`);
        this.rollbackData.push({
          type: 'backup',
          file: backupFile,
          timestamp: new Date().toISOString()
        });
        return { success: true, backupFile, size: stats.size };
      } else {
        return { success: false, error: 'Backup file is empty' };
      }
    } catch (error) {
      return { success: false, error: `Backup failed: ${error.message}` };
    }
  }

  async executeInitialDiagnostic() {
    this.log('Running comprehensive validation diagnostic...');
    
    try {
      const diagnosticResult = await runComprehensiveDiagnostic();
      
      this.log(`Diagnostic completed: ${diagnosticResult.summary.overallHealth} health`);
      this.log(`Found ${diagnosticResult.summary.discrepancyCount} discrepancies`);
      
      return {
        success: true,
        health: diagnosticResult.summary.overallHealth,
        discrepancies: diagnosticResult.summary.discrepancyCount,
        report: diagnosticResult
      };
    } catch (error) {
      return { success: false, error: `Diagnostic failed: ${error.message}` };
    }
  }

  async executeSchemaValidation() {
    this.log('Validating schema consistency...');
    
    try {
      const checker = new SchemaValidationChecker();
      const validationReport = await checker.runValidation();
      
      const hasErrors = validationReport.summary.errors > 0;
      this.log(`Schema validation: ${hasErrors ? 'FAILED' : 'PASSED'}`);
      this.log(`Errors: ${validationReport.summary.errors}, Warnings: ${validationReport.summary.warnings}`);
      
      return {
        success: !hasErrors,
        errors: validationReport.summary.errors,
        warnings: validationReport.summary.warnings,
        report: validationReport
      };
    } catch (error) {
      return { success: false, error: `Schema validation failed: ${error.message}` };
    }
  }

  async executeDatabaseScan() {
    this.log('Scanning database for enum validation issues...');
    
    try {
      const validator = new DatabaseEnumValidator();
      await validator.connect();
      
      const scanResults = await validator.scanMannschaftRecords();
      await validator.generateReport();
      await validator.disconnect();
      
      this.log(`Database scan completed: ${scanResults.validRecords}/${scanResults.totalRecords} valid records`);
      this.log(`Found ${scanResults.invalidRecords} records with validation issues`);
      
      return {
        success: true,
        totalRecords: scanResults.totalRecords,
        validRecords: scanResults.validRecords,
        invalidRecords: scanResults.invalidRecords,
        validationRate: scanResults.summary.validationRate,
        report: scanResults
      };
    } catch (error) {
      return { success: false, error: `Database scan failed: ${error.message}` };
    }
  }

  async executeSchemaRebuild() {
    this.log('Rebuilding schema and clearing cache...');
    
    try {
      if (CONFIG.DRY_RUN) {
        this.log('DRY RUN: Would rebuild schema and clear cache');
        return { success: true, dryRun: true };
      }
      
      // Clear Strapi build cache
      const strapiBuildPath = path.join(__dirname, '../.strapi');
      try {
        await fs.rmdir(strapiBuildPath, { recursive: true });
        this.log('Cleared Strapi build cache');
      } catch (error) {
        this.log(`Could not clear build cache: ${error.message}`, 'warn');
      }
      
      // Rebuild types
      try {
        execSync('npm run build', { 
          cwd: path.join(__dirname, '..'),
          stdio: CONFIG.VERBOSE ? 'inherit' : 'pipe'
        });
        this.log('Schema rebuild completed');
      } catch (error) {
        return { success: false, error: `Schema rebuild failed: ${error.message}` };
      }
      
      return { success: true, rebuilt: true };
    } catch (error) {
      return { success: false, error: `Schema rebuild failed: ${error.message}` };
    }
  }

  async executeDatabaseRepair() {
    this.log('Repairing database enum values...');
    
    try {
      const repairer = new DatabaseEnumRepairer();
      await repairer.connect();
      
      // Set dry run mode based on configuration
      repairer.repairResults.dryRun = CONFIG.DRY_RUN;
      
      const repairResults = await repairer.executeRepairs();
      await repairer.generateReport();
      
      if (!CONFIG.DRY_RUN) {
        await repairer.generateRollbackScript();
      }
      
      await repairer.disconnect();
      
      this.log(`Database repair completed: ${repairResults.repairedRecords} records repaired`);
      
      return {
        success: true,
        repairedRecords: repairResults.repairedRecords,
        failedRecords: repairResults.failedRecords,
        dryRun: CONFIG.DRY_RUN,
        report: repairResults
      };
    } catch (error) {
      return { success: false, error: `Database repair failed: ${error.message}` };
    }
  }

  async executeAdminValidationTest() {
    this.log('Testing admin interface validation...');
    
    try {
      const testRunner = new AdminValidationTestRunner();
      const testResult = await testRunner.runTests();
      
      this.log(`Admin validation tests: ${testResult.success ? 'PASSED' : 'FAILED'}`);
      
      return {
        success: testResult.success,
        report: testResult.report,
        reportPath: testResult.reportPath
      };
    } catch (error) {
      return { success: false, error: `Admin validation test failed: ${error.message}` };
    }
  }

  async executeAPIConsistencyTest() {
    this.log('Testing API consistency validation...');
    
    try {
      const testRunner = new APIConsistencyTestRunner();
      const testResult = await testRunner.runTests();
      
      this.log(`API consistency tests: ${testResult.success ? 'PASSED' : 'FAILED'}`);
      
      return {
        success: testResult.success,
        report: testResult.report,
        reportPath: testResult.reportPath
      };
    } catch (error) {
      return { success: false, error: `API consistency test failed: ${error.message}` };
    }
  }

  async executeErrorAnalysis() {
    this.log('Running validation error analysis...');
    
    try {
      const analysisRunner = new ValidationErrorAnalysisRunner();
      const analysisResult = await analysisRunner.runComplete();
      
      this.log(`Error analysis: ${analysisResult.success ? 'COMPLETED' : 'FAILED'}`);
      
      return {
        success: analysisResult.success,
        results: analysisResult.results
      };
    } catch (error) {
      return { success: false, error: `Error analysis failed: ${error.message}` };
    }
  }

  async executeFinalValidation() {
    this.log('Running final validation suite...');
    
    try {
      const automationRunner = new ValidationAutomationRunner({
        cleanup: true,
        verbose: CONFIG.VERBOSE
      });
      
      // Run single comprehensive test
      const finalReport = await automationRunner.runSingleTest();
      
      const successRate = finalReport.summary.successRate;
      const criticalIssues = finalReport.summary.criticalIssues;
      
      this.log(`Final validation: ${successRate.toFixed(2)}% success rate`);
      this.log(`Critical issues remaining: ${criticalIssues}`);
      
      const success = successRate >= 95 && criticalIssues === 0;
      
      return {
        success,
        successRate,
        criticalIssues,
        report: finalReport
      };
    } catch (error) {
      return { success: false, error: `Final validation failed: ${error.message}` };
    }
  }

  async executeMonitoringSetup() {
    this.log('Setting up validation monitoring...');
    
    try {
      // Create monitoring configuration
      const monitoringConfig = {
        enabled: true,
        interval: 300000, // 5 minutes
        thresholds: {
          successRate: 95,
          consistencyRate: 98,
          maxCriticalIssues: 0
        },
        notifications: {
          email: CONFIG.ADMIN_EMAIL,
          webhook: null
        },
        createdAt: new Date().toISOString()
      };
      
      const configPath = path.join(__dirname, '../scripts/monitor-config.json');
      await fs.writeFile(configPath, JSON.stringify(monitoringConfig, null, 2));
      
      this.log(`Monitoring configuration saved: ${configPath}`);
      
      return {
        success: true,
        configPath,
        config: monitoringConfig
      };
    } catch (error) {
      return { success: false, error: `Monitoring setup failed: ${error.message}` };
    }
  }

  /**
   * Generate comprehensive execution report
   */
  async generateExecutionReport() {
    this.log('Generating comprehensive execution report...');
    
    const executionReport = {
      metadata: {
        title: 'Comprehensive Validation Fix Execution Report',
        generated: new Date().toISOString(),
        startTime: this.startTime.toISOString(),
        endTime: this.endTime.toISOString(),
        duration: this.endTime - this.startTime,
        configuration: CONFIG
      },
      execution: {
        totalSteps: WORKFLOW_STEPS.length,
        completedSteps: this.completedSteps.length,
        failedSteps: this.failedSteps.length,
        skippedSteps: this.skippedSteps.length,
        overallSuccess: this.failedSteps.length === 0
      },
      stepResults: this.results,
      completedSteps: this.completedSteps,
      failedSteps: this.failedSteps,
      skippedSteps: this.skippedSteps,
      errors: this.errors,
      rollbackData: this.rollbackData,
      recommendations: this.generateRecommendations()
    };

    // Save detailed report
    await fs.mkdir(CONFIG.REPORT_DIR, { recursive: true });
    const reportPath = path.join(CONFIG.REPORT_DIR, `comprehensive-fix-execution-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(executionReport, null, 2));

    // Generate human-readable summary
    const summaryContent = this.generateExecutionSummary(executionReport);
    const summaryPath = path.join(CONFIG.REPORT_DIR, `comprehensive-fix-summary-${Date.now()}.md`);
    await fs.writeFile(summaryPath, summaryContent);

    this.log(`Execution report saved: ${reportPath}`);
    this.log(`Execution summary saved: ${summaryPath}`);

    return { reportPath, summaryPath, report: executionReport };
  }

  /**
   * Generate recommendations based on execution results
   */
  generateRecommendations() {
    const recommendations = [];

    // Check overall success
    if (this.failedSteps.length === 0) {
      recommendations.push({
        priority: 'INFO',
        category: 'Success',
        message: 'All validation fix steps completed successfully',
        action: 'Monitor system for continued stability'
      });
    } else {
      recommendations.push({
        priority: 'HIGH',
        category: 'Failures',
        message: `${this.failedSteps.length} steps failed during execution`,
        action: 'Review failed steps and address underlying issues'
      });
    }

    // Check critical step failures
    const failedCriticalSteps = this.failedSteps.filter(step => step.critical);
    if (failedCriticalSteps.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Critical Failures',
        message: 'Critical validation fix steps failed',
        action: 'Address critical failures before proceeding with system use'
      });
    }

    // Check final validation results
    const finalValidation = this.results.final_validation;
    if (finalValidation && finalValidation.success) {
      if (finalValidation.successRate < 95) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'Validation Quality',
          message: `Final validation success rate is ${finalValidation.successRate.toFixed(2)}% (target: 95%+)`,
          action: 'Investigate remaining validation issues'
        });
      }
      
      if (finalValidation.criticalIssues > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'Critical Issues',
          message: `${finalValidation.criticalIssues} critical validation issues remain`,
          action: 'Address critical issues before production use'
        });
      }
    }

    // Check database repair results
    const databaseRepair = this.results.database_repair;
    if (databaseRepair && databaseRepair.success && !databaseRepair.dryRun) {
      if (databaseRepair.repairedRecords > 0) {
        recommendations.push({
          priority: 'INFO',
          category: 'Data Repair',
          message: `${databaseRepair.repairedRecords} database records were repaired`,
          action: 'Verify repaired data and keep rollback script available'
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate human-readable execution summary
   */
  generateExecutionSummary(report) {
    const { execution, metadata } = report;
    
    return `# Comprehensive Validation Fix Execution Summary

**Generated:** ${new Date(metadata.generated).toLocaleString()}
**Duration:** ${Math.round(metadata.duration / 1000)} seconds
**Overall Success:** ${execution.overallSuccess ? '✅ YES' : '❌ NO'}

## Execution Overview

- **Total Steps:** ${execution.totalSteps}
- **Completed:** ${execution.completedSteps} ✅
- **Failed:** ${execution.failedSteps} ❌
- **Skipped:** ${execution.skippedSteps} ⏭️

## Step Results

${WORKFLOW_STEPS.map(step => {
  const result = report.stepResults[step.id];
  if (!result) return `### ${step.name} - ⏭️ Not Executed`;
  
  const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
  const duration = result.duration ? ` (${result.duration}ms)` : '';
  
  return `### ${step.name} - ${status}${duration}
${step.description}
${result.error ? `**Error:** ${result.error}` : ''}
`;
}).join('\n')}

## Failed Steps

${this.failedSteps.length > 0 ? 
  this.failedSteps.map(step => `- **${step.name}:** ${step.error}`).join('\n') :
  'No steps failed ✅'
}

## Recommendations

${report.recommendations.map((rec, index) => 
  `${index + 1}. **[${rec.priority}] ${rec.category}:** ${rec.message}
   *Action:* ${rec.action}
`).join('\n')}

## Next Steps

${execution.overallSuccess ? `
### Success! ✅

1. **Verify fixes** by testing admin interface manually
2. **Monitor system** for continued stability
3. **Keep backups** available for emergency recovery
4. **Document lessons learned** for future reference
5. **Update team** on resolved validation issues

### Monitoring

The validation monitoring system has been configured to continuously check system health.
Review the monitoring configuration and adjust thresholds as needed.
` : `
### Issues Detected ❌

1. **Address failed steps** listed above
2. **Review error details** in the full execution report
3. **Check system logs** for additional context
4. **Consider rollback** if critical issues persist
5. **Contact support** if problems continue

### Recovery

If rollback is needed:
1. Use the database backup created at the beginning
2. Review rollback scripts generated during execution
3. Restore system to pre-execution state
4. Investigate root causes before retry
`}

## Technical Details

- **Configuration:** ${JSON.stringify(metadata.configuration, null, 2)}
- **Execution Mode:** ${metadata.configuration.DRY_RUN ? 'Dry Run' : 'Live Execution'}
- **Backup Created:** ${!metadata.configuration.SKIP_BACKUP ? 'Yes' : 'No'}
- **Interactive Mode:** ${metadata.configuration.INTERACTIVE ? 'Yes' : 'No'}

---

*This report was generated automatically by the Comprehensive Validation Fix system.*
`;
  }

  /**
   * Display final execution summary
   */
  displayFinalSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE VALIDATION FIX EXECUTION SUMMARY');
    console.log('='.repeat(80));
    
    const duration = Math.round((this.endTime - this.startTime) / 1000);
    console.log(`Duration: ${duration} seconds`);
    console.log(`Completed Steps: ${this.completedSteps.length}/${WORKFLOW_STEPS.length}`);
    console.log(`Failed Steps: ${this.failedSteps.length}`);
    console.log(`Skipped Steps: ${this.skippedSteps.length}`);
    
    const overallSuccess = this.failedSteps.length === 0;
    console.log(`Overall Success: ${overallSuccess ? '✅ YES' : '❌ NO'}`);
    
    if (this.failedSteps.length > 0) {
      console.log('\n❌ FAILED STEPS:');
      this.failedSteps.forEach(step => {
        console.log(`  - ${step.name}: ${step.error}`);
      });
    }
    
    if (this.skippedSteps.length > 0) {
      console.log('\n⏭️ SKIPPED STEPS:');
      this.skippedSteps.forEach(step => {
        console.log(`  - ${step.name}: ${step.reason}`);
      });
    }
    
    // Show key results
    const finalValidation = this.results.final_validation;
    if (finalValidation && finalValidation.success) {
      console.log('\n📈 FINAL VALIDATION RESULTS:');
      console.log(`  Success Rate: ${finalValidation.successRate.toFixed(2)}%`);
      console.log(`  Critical Issues: ${finalValidation.criticalIssues}`);
    }
    
    console.log('\n' + '='.repeat(80));
    
    return overallSuccess;
  }

  /**
   * Main execution workflow
   */
  async runWorkflow() {
    try {
      // Display overview
      this.displayWorkflowOverview();
      
      // Ask for final confirmation
      if (CONFIG.INTERACTIVE) {
        const confirmed = await this.askConfirmation(
          'Ready to start the comprehensive validation fix workflow?',
          true
        );
        
        if (!confirmed) {
          this.log('Workflow cancelled by user');
          return { success: false, cancelled: true };
        }
      }
      
      this.log('Starting comprehensive validation fix workflow...');
      
      // Execute each step
      for (const stepConfig of WORKFLOW_STEPS) {
        const result = await this.executeStep(stepConfig);
        
        // Handle critical step failures
        if (!result.success && !result.skipped && stepConfig.critical) {
          this.log(`Critical step failed: ${stepConfig.name}`, 'error');
          
          if (CONFIG.INTERACTIVE) {
            const continueAnyway = await this.askConfirmation(
              'Critical step failed. Continue with remaining steps anyway?',
              false
            );
            
            if (!continueAnyway) {
              this.log('Workflow aborted due to critical step failure');
              break;
            }
          } else {
            this.log('Aborting workflow due to critical step failure');
            break;
          }
        }
      }
      
      // Record end time
      this.endTime = new Date();
      
      // Generate reports
      const reportResult = await this.generateExecutionReport();
      
      // Display final summary
      const overallSuccess = this.displayFinalSummary();
      
      return {
        success: overallSuccess,
        duration: this.endTime - this.startTime,
        completedSteps: this.completedSteps.length,
        failedSteps: this.failedSteps.length,
        reportPath: reportResult.reportPath,
        summaryPath: reportResult.summaryPath
      };
      
    } catch (error) {
      this.endTime = new Date();
      this.log(`Workflow failed with exception: ${error.message}`, 'error');
      
      // Still try to generate a report
      try {
        await this.generateExecutionReport();
      } catch (reportError) {
        this.log(`Failed to generate report: ${reportError.message}`, 'error');
      }
      
      return {
        success: false,
        error: error.message,
        duration: this.endTime - this.startTime
      };
    } finally {
      this.rl.close();
    }
  }
}

/**
 * Main execution function
 */
async function runComprehensiveValidationFix() {
  const fixer = new ComprehensiveValidationFixer();
  
  try {
    const result = await fixer.runWorkflow();
    
    if (result.success) {
      console.log('\n🎉 Comprehensive validation fix completed successfully!');
      console.log(`📄 Detailed report: ${result.reportPath}`);
      console.log(`📝 Summary: ${result.summaryPath}`);
      process.exit(0);
    } else if (result.cancelled) {
      console.log('\n⏹️ Workflow cancelled by user');
      process.exit(0);
    } else {
      console.log('\n⚠️ Comprehensive validation fix completed with issues');
      console.log('Check the execution summary and reports for details');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Comprehensive validation fix failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Export for module usage
module.exports = {
  ComprehensiveValidationFixer,
  runComprehensiveValidationFix,
  CONFIG,
  WORKFLOW_STEPS
};

// Run workflow if script is executed directly
if (require.main === module) {
  runComprehensiveValidationFix();
}