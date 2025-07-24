#!/usr/bin/env node

/**
 * Test Script for Consolidation Scripts
 * 
 * This script tests that all consolidation scripts are properly structured
 * and can be loaded without errors.
 */

const fs = require('fs');
const path = require('path');

class ConsolidationScriptTester {
  constructor() {
    this.scriptsDir = __dirname;
    this.testResults = {
      scripts: {},
      overall: false
    };
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  testScriptStructure(scriptName) {
    this.log(`Testing ${scriptName}...`);
    
    const scriptPath = path.join(this.scriptsDir, scriptName);
    const result = {
      exists: false,
      loadable: false,
      hasRequiredMethods: false,
      error: null
    };
    
    try {
      // Check if file exists
      result.exists = fs.existsSync(scriptPath);
      
      if (!result.exists) {
        result.error = 'File does not exist';
        return result;
      }
      
      // Check if file is loadable (syntax check)
      try {
        const ScriptClass = require(scriptPath);
        result.loadable = true;
        
        // Check if it's a class with expected methods
        if (typeof ScriptClass === 'function') {
          const instance = new ScriptClass();
          result.hasRequiredMethods = typeof instance.run === 'function';
        }
        
      } catch (loadError) {
        result.error = `Load error: ${loadError.message}`;
      }
      
    } catch (error) {
      result.error = error.message;
    }
    
    this.testResults.scripts[scriptName] = result;
    
    const status = result.exists && result.loadable ? '✅' : '❌';
    this.log(`${status} ${scriptName}: ${result.error || 'OK'}`);
    
    return result;
  }

  testAllScripts() {
    this.log('Testing all consolidation scripts...');
    
    const scripts = [
      'consolidate-team-mannschaft.js',
      'update-schemas-for-consolidation.js',
      'rollback-consolidation.js',
      'validate-consolidation.js',
      'run-team-mannschaft-consolidation.js'
    ];
    
    let allPassed = true;
    
    scripts.forEach(script => {
      const result = this.testScriptStructure(script);
      if (!result.exists || !result.loadable) {
        allPassed = false;
      }
    });
    
    this.testResults.overall = allPassed;
    
    this.log(`\n=== TEST SUMMARY ===`);
    this.log(`Overall: ${allPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    Object.entries(this.testResults.scripts).forEach(([script, result]) => {
      const status = result.exists && result.loadable ? '✅' : '❌';
      this.log(`${status} ${script}`);
    });
    
    return this.testResults;
  }

  testSchemaFiles() {
    this.log('\nTesting schema file accessibility...');
    
    const schemasDir = path.join(__dirname, '../src/api');
    const contentTypes = ['team', 'mannschaft', 'spiel', 'spieler'];
    
    const schemaResults = {};
    
    contentTypes.forEach(contentType => {
      const schemaPath = path.join(schemasDir, `${contentType}/content-types/${contentType}/schema.json`);
      const exists = fs.existsSync(schemaPath);
      
      schemaResults[contentType] = {
        exists,
        path: schemaPath
      };
      
      const status = exists ? '✅' : '❌';
      this.log(`${status} ${contentType} schema: ${exists ? 'Found' : 'Missing'}`);
    });
    
    return schemaResults;
  }

  testBackupDirectories() {
    this.log('\nTesting backup directory structure...');
    
    const backupDirs = [
      '../backups',
      '../backups/schema-updates',
      '../backups/team-mannschaft-consolidation'
    ];
    
    backupDirs.forEach(dir => {
      const fullPath = path.join(__dirname, dir);
      const exists = fs.existsSync(fullPath);
      
      if (!exists) {
        fs.mkdirSync(fullPath, { recursive: true });
        this.log(`✅ Created backup directory: ${dir}`);
      } else {
        this.log(`✅ Backup directory exists: ${dir}`);
      }
    });
  }

  generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.testResults,
      recommendations: []
    };
    
    if (!this.testResults.overall) {
      report.recommendations.push('Fix script loading errors before running consolidation');
    }
    
    Object.entries(this.testResults.scripts).forEach(([script, result]) => {
      if (!result.exists) {
        report.recommendations.push(`Create missing script: ${script}`);
      } else if (!result.loadable) {
        report.recommendations.push(`Fix syntax errors in: ${script}`);
      }
    });
    
    if (report.recommendations.length === 0) {
      report.recommendations.push('All scripts are ready for consolidation');
    }
    
    return report;
  }

  async run() {
    try {
      this.log('Starting consolidation script tests...');
      
      const scriptResults = this.testAllScripts();
      const schemaResults = this.testSchemaFiles();
      this.testBackupDirectories();
      
      const report = this.generateTestReport();
      
      // Save test report
      const reportFile = path.join(__dirname, '../backups', `script-test-report-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify({
        ...report,
        schemaResults
      }, null, 2));
      
      this.log(`\nTest report saved to: ${reportFile}`);
      
      if (report.recommendations.length > 0) {
        this.log('\n=== RECOMMENDATIONS ===');
        report.recommendations.forEach(rec => this.log(`- ${rec}`));
      }
      
      return report;
      
    } catch (error) {
      this.log(`Test error: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const tester = new ConsolidationScriptTester();
  
  tester.run()
    .then(report => {
      if (report.testResults.overall) {
        console.log('\n✅ All tests passed - scripts are ready for consolidation');
        process.exit(0);
      } else {
        console.log('\n❌ Some tests failed - fix issues before running consolidation');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test execution failed:', error.message);
      process.exit(1);
    });
}

module.exports = ConsolidationScriptTester;