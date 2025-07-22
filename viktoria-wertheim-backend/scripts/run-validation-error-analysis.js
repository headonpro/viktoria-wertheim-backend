#!/usr/bin/env node

/**
 * Validation Error Analysis Runner
 * 
 * This script runs the validation error analysis system and integrates it with
 * the existing validation test suite to provide comprehensive error reporting.
 */

const { runValidationErrorAnalysis } = require('./validation-error-analysis-system');
const { runTests } = require('./test-validation-error-analysis');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const RUNNER_CONFIG = {
  RUN_TESTS_FIRST: process.env.RUN_TESTS_FIRST !== 'false',
  GENERATE_COMBINED_REPORT: process.env.GENERATE_COMBINED_REPORT !== 'false',
  OUTPUT_DIR: './validation-reports',
  VERBOSE: process.env.VERBOSE === 'true'
};

class ValidationErrorAnalysisRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      testsRan: false,
      testsPassed: false,
      analysisRan: false,
      analysisSucceeded: false,
      reportsPaths: [],
      errors: []
    };
  }

  /**
   * Run pre-analysis tests
   */
  async runPreAnalysisTests() {
    if (!RUNNER_CONFIG.RUN_TESTS_FIRST) {
      console.log('⏭️ Skipping pre-analysis tests (RUN_TESTS_FIRST=false)');
      return true;
    }

    console.log('🧪 Running pre-analysis tests...');
    
    try {
      // Import and run the test function
      const { ValidationErrorAnalysisTest } = require('./test-validation-error-analysis');
      const tester = new ValidationErrorAnalysisTest();
      
      const testSuccess = await tester.runAllTests();
      
      this.results.testsRan = true;
      this.results.testsPassed = testSuccess;
      
      if (testSuccess) {
        console.log('✅ Pre-analysis tests passed');
        return true;
      } else {
        console.log('❌ Pre-analysis tests failed');
        this.results.errors.push('Pre-analysis tests failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Error running pre-analysis tests:', error.message);
      this.results.errors.push(`Pre-analysis test error: ${error.message}`);
      return false;
    }
  }

  /**
   * Run the main validation error analysis
   */
  async runMainAnalysis() {
    console.log('\n🔍 Running main validation error analysis...');
    
    try {
      // Run the validation error analysis
      await runValidationErrorAnalysis();
      
      this.results.analysisRan = true;
      this.results.analysisSucceeded = true;
      
      console.log('✅ Validation error analysis completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Validation error analysis failed:', error.message);
      this.results.errors.push(`Analysis error: ${error.message}`);
      this.results.analysisRan = true;
      this.results.analysisSucceeded = false;
      return false;
    }
  }

  /**
   * Collect generated report paths
   */
  async collectReportPaths() {
    try {
      const reportFiles = await fs.readdir(RUNNER_CONFIG.OUTPUT_DIR);
      
      // Look for recent validation error analysis reports
      const recentReports = reportFiles
        .filter(file => file.includes('validation-error-analysis') || file.includes('validation-error-summary') || file.includes('validation-fix-guide'))
        .map(file => path.join(RUNNER_CONFIG.OUTPUT_DIR, file))
        .sort((a, b) => {
          // Sort by modification time (most recent first)
          return fs.stat(b).then(bStat => fs.stat(a).then(aStat => bStat.mtime - aStat.mtime));
        });

      this.results.reportsPaths = recentReports.slice(0, 10); // Keep last 10 reports
      
      if (RUNNER_CONFIG.VERBOSE) {
        console.log(`📄 Found ${this.results.reportsPaths.length} recent reports`);
      }
    } catch (error) {
      console.warn('⚠️ Could not collect report paths:', error.message);
    }
  }

  /**
   * Generate combined summary report
   */
  async generateCombinedReport() {
    if (!RUNNER_CONFIG.GENERATE_COMBINED_REPORT) {
      console.log('⏭️ Skipping combined report generation');
      return;
    }

    console.log('📊 Generating combined summary report...');
    
    try {
      const combinedReport = {
        metadata: {
          title: 'Validation Error Analysis Execution Summary',
          generated: new Date().toISOString(),
          duration: this.results.endTime - this.results.startTime,
          runner: 'validation-error-analysis-runner'
        },
        execution: {
          startTime: this.results.startTime.toISOString(),
          endTime: this.results.endTime.toISOString(),
          duration: `${this.results.endTime - this.results.startTime}ms`
        },
        results: {
          testsRan: this.results.testsRan,
          testsPassed: this.results.testsPassed,
          analysisRan: this.results.analysisRan,
          analysisSucceeded: this.results.analysisSucceeded,
          overallSuccess: this.results.testsPassed && this.results.analysisSucceeded
        },
        errors: this.results.errors,
        generatedReports: this.results.reportsPaths,
        recommendations: this.generateRunnerRecommendations()
      };

      // Save combined report
      const combinedReportPath = path.join(RUNNER_CONFIG.OUTPUT_DIR, `validation-error-analysis-execution-${Date.now()}.json`);
      await fs.writeFile(combinedReportPath, JSON.stringify(combinedReport, null, 2));

      // Generate human-readable summary
      const summaryContent = this.generateExecutionSummary(combinedReport);
      const summaryPath = path.join(RUNNER_CONFIG.OUTPUT_DIR, `validation-error-analysis-execution-summary-${Date.now()}.md`);
      await fs.writeFile(summaryPath, summaryContent);

      console.log(`📄 Combined report: ${combinedReportPath}`);
      console.log(`📄 Execution summary: ${summaryPath}`);

      this.results.reportsPaths.push(combinedReportPath, summaryPath);
    } catch (error) {
      console.error('❌ Failed to generate combined report:', error.message);
      this.results.errors.push(`Combined report error: ${error.message}`);
    }
  }

  /**
   * Generate runner-specific recommendations
   */
  generateRunnerRecommendations() {
    const recommendations = [];

    if (!this.results.testsPassed) {
      recommendations.push({
        priority: 'HIGH',
        category: 'System Setup',
        issue: 'Pre-analysis tests failed',
        solution: 'Fix system configuration issues before running analysis',
        action: 'Review test output and fix connectivity/authentication issues'
      });
    }

    if (!this.results.analysisSucceeded) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Analysis Execution',
        issue: 'Validation error analysis failed',
        solution: 'Debug analysis execution issues',
        action: 'Check logs for specific error details and fix underlying issues'
      });
    }

    if (this.results.testsPassed && this.results.analysisSucceeded) {
      recommendations.push({
        priority: 'LOW',
        category: 'Success',
        issue: 'Analysis completed successfully',
        solution: 'Review generated reports for validation issues',
        action: 'Implement fixes based on error analysis recommendations'
      });
    }

    if (this.results.errors.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Error Handling',
        issue: `${this.results.errors.length} errors occurred during execution`,
        solution: 'Review and address execution errors',
        action: 'Check error details and improve system reliability'
      });
    }

    return recommendations;
  }

  /**
   * Generate execution summary
   */
  generateExecutionSummary(report) {
    const { results, errors, generatedReports } = report;

    return `# Validation Error Analysis Execution Summary

**Generated:** ${new Date(report.metadata.generated).toLocaleString()}
**Duration:** ${report.execution.duration}
**Overall Success:** ${results.overallSuccess ? '✅ YES' : '❌ NO'}

## Execution Results

### Pre-Analysis Tests
- **Ran:** ${results.testsRan ? '✅ Yes' : '❌ No'}
- **Passed:** ${results.testsPassed ? '✅ Yes' : '❌ No'}

### Main Analysis
- **Ran:** ${results.analysisRan ? '✅ Yes' : '❌ No'}
- **Succeeded:** ${results.analysisSucceeded ? '✅ Yes' : '❌ No'}

## Generated Reports

${generatedReports.length > 0 ? 
  generatedReports.map(report => `- ${report}`).join('\n') : 
  'No reports generated'
}

## Errors

${errors.length > 0 ? 
  errors.map((error, index) => `${index + 1}. ${error}`).join('\n') : 
  'No errors occurred ✅'
}

## Recommendations

${report.recommendations.map((rec, index) => 
  `### ${index + 1}. ${rec.issue} (${rec.priority})
**Category:** ${rec.category}
**Solution:** ${rec.solution}
**Action:** ${rec.action}
`).join('\n')}

## Next Steps

${results.overallSuccess ? `
1. ✅ Review the generated error analysis reports
2. 📋 Implement fixes based on recommendations
3. 🔄 Re-run analysis after fixes to verify improvements
4. 📊 Consider integrating this analysis into CI/CD pipeline
` : `
1. ❌ Fix the issues that caused execution to fail
2. 🔧 Address system configuration problems
3. 🔄 Re-run the analysis after fixes
4. 📞 Contact support if issues persist
`}

---

*This summary was generated automatically by the validation error analysis runner.*
`;
  }

  /**
   * Display execution summary
   */
  displayExecutionSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 VALIDATION ERROR ANALYSIS EXECUTION SUMMARY');
    console.log('='.repeat(70));
    
    console.log(`Duration: ${this.results.endTime - this.results.startTime}ms`);
    console.log(`Tests Ran: ${this.results.testsRan ? '✅' : '❌'}`);
    console.log(`Tests Passed: ${this.results.testsPassed ? '✅' : '❌'}`);
    console.log(`Analysis Ran: ${this.results.analysisRan ? '✅' : '❌'}`);
    console.log(`Analysis Succeeded: ${this.results.analysisSucceeded ? '✅' : '❌'}`);
    
    const overallSuccess = this.results.testsPassed && this.results.analysisSucceeded;
    console.log(`Overall Success: ${overallSuccess ? '✅' : '❌'}`);
    
    if (this.results.errors.length > 0) {
      console.log(`\n❌ Errors (${this.results.errors.length}):`);
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (this.results.reportsPaths.length > 0) {
      console.log(`\n📄 Generated Reports (${this.results.reportsPaths.length}):`);
      this.results.reportsPaths.slice(0, 5).forEach(reportPath => {
        console.log(`  - ${reportPath}`);
      });
      
      if (this.results.reportsPaths.length > 5) {
        console.log(`  ... and ${this.results.reportsPaths.length - 5} more`);
      }
    }
    
    console.log('\n' + '='.repeat(70));
    
    return overallSuccess;
  }

  /**
   * Run complete validation error analysis workflow
   */
  async runComplete() {
    console.log('🚀 Starting Validation Error Analysis Workflow...');
    console.log('='.repeat(70));
    
    try {
      // Step 1: Run pre-analysis tests
      const testsOk = await this.runPreAnalysisTests();
      
      // Step 2: Run main analysis (even if tests failed, for diagnostic purposes)
      const analysisOk = await this.runMainAnalysis();
      
      // Step 3: Collect report paths
      await this.collectReportPaths();
      
      // Step 4: Generate combined report
      this.results.endTime = new Date();
      await this.generateCombinedReport();
      
      // Step 5: Display summary
      const overallSuccess = this.displayExecutionSummary();
      
      return {
        success: overallSuccess,
        results: this.results
      };
      
    } catch (error) {
      this.results.endTime = new Date();
      this.results.errors.push(`Workflow error: ${error.message}`);
      
      console.error('❌ Validation error analysis workflow failed:', error.message);
      this.displayExecutionSummary();
      
      return {
        success: false,
        results: this.results,
        error: error.message
      };
    }
  }
}

/**
 * Main execution function
 */
async function runValidationErrorAnalysisWorkflow() {
  const runner = new ValidationErrorAnalysisRunner();
  
  try {
    const result = await runner.runComplete();
    
    if (result.success) {
      console.log('\n🎉 Validation error analysis workflow completed successfully!');
      console.log('Review the generated reports for detailed error analysis and fix recommendations.');
      process.exit(0);
    } else {
      console.log('\n⚠️ Validation error analysis workflow completed with issues.');
      console.log('Check the execution summary and error details above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Validation error analysis workflow runner failed:', error.message);
    process.exit(1);
  }
}

// Export for module usage
module.exports = {
  ValidationErrorAnalysisRunner,
  runValidationErrorAnalysisWorkflow,
  RUNNER_CONFIG
};

// Run workflow if script is executed directly
if (require.main === module) {
  runValidationErrorAnalysisWorkflow();
}