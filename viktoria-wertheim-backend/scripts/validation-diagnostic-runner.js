/**
 * Validation Diagnostic Runner
 * 
 * Master script that orchestrates all validation diagnostic tests and generates
 * a comprehensive report identifying root causes of validation discrepancies.
 */

const fs = require('fs').promises;
const path = require('path');
const { runComprehensiveDiagnostic } = require('./comprehensive-validation-diagnostic');
const { runAdminValidationTest } = require('./admin-validation-tester');

// Configuration
const CONFIG = {
  OUTPUT_DIR: './validation-reports',
  MASTER_REPORT_PREFIX: 'master-validation-report',
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337'
};

class ValidationDiagnosticRunner {
  constructor() {
    this.results = {
      timestamp: new Date(),
      comprehensive: null,
      adminComparison: null,
      rootCauseAnalysis: null,
      actionPlan: null
    };
  }

  /**
   * Run all diagnostic tests
   */
  async runAllDiagnostics() {
    console.log('🚀 Starting Master Validation Diagnostic...');
    console.log(`📍 Target: ${CONFIG.STRAPI_URL}`);
    console.log('='.repeat(60));

    try {
      // Step 1: Run comprehensive validation diagnostic
      console.log('\n📋 STEP 1: Comprehensive Validation Diagnostic');
      console.log('-'.repeat(50));
      this.results.comprehensive = await runComprehensiveDiagnostic();
      console.log('✅ Comprehensive diagnostic completed');

      // Step 2: Run admin vs API comparison
      console.log('\n📋 STEP 2: Admin vs API Validation Comparison');
      console.log('-'.repeat(50));
      try {
        this.results.adminComparison = await runAdminValidationTest();
        console.log('✅ Admin comparison completed');
      } catch (error) {
        console.warn('⚠️ Admin comparison failed (this may be expected):', error.message);
        this.results.adminComparison = {
          error: error.message,
          skipped: true
        };
      }

      // Step 3: Perform root cause analysis
      console.log('\n📋 STEP 3: Root Cause Analysis');
      console.log('-'.repeat(50));
      this.results.rootCauseAnalysis = this.performRootCauseAnalysis();
      console.log('✅ Root cause analysis completed');

      // Step 4: Generate action plan
      console.log('\n📋 STEP 4: Action Plan Generation');
      console.log('-'.repeat(50));
      this.results.actionPlan = this.generateActionPlan();
      console.log('✅ Action plan generated');

      return this.results;
    } catch (error) {
      console.error('❌ Master diagnostic failed:', error.message);
      throw error;
    }
  }

  /**
   * Perform root cause analysis based on all test results
   */
  performRootCauseAnalysis() {
    console.log('🔍 Analyzing root causes...');

    const analysis = {
      primaryIssues: [],
      secondaryIssues: [],
      systemHealth: 'UNKNOWN',
      confidence: 0
    };

    // Analyze comprehensive diagnostic results
    if (this.results.comprehensive) {
      const compResults = this.results.comprehensive;
      
      // Check for schema-related issues
      if (compResults.summary.discrepancyCount > 0) {
        const schemaIssues = compResults.discrepancies.filter(d => 
          d.description.includes('schema') || 
          d.description.includes('validation bypass')
        );

        if (schemaIssues.length > 0) {
          analysis.primaryIssues.push({
            type: 'SCHEMA_INCONSISTENCY',
            severity: 'HIGH',
            description: 'Schema definitions do not match actual validation behavior',
            evidence: schemaIssues.map(i => `${i.field}: ${i.value}`),
            likelihood: 0.8
          });
        }
      }

      // Check for validation bypass issues
      const bypassIssues = compResults.discrepancies.filter(d => 
        d.description.includes('accepted by API') && d.apiResult === true
      );

      if (bypassIssues.length > 0) {
        analysis.primaryIssues.push({
          type: 'VALIDATION_BYPASS',
          severity: 'HIGH',
          description: 'API accepts invalid values that should be rejected',
          evidence: bypassIssues.map(i => `${i.field}: ${i.value}`),
          likelihood: 0.9
        });
      }

      // Determine system health
      analysis.systemHealth = compResults.summary.overallHealth;
    }

    // Analyze admin comparison results
    if (this.results.adminComparison && !this.results.adminComparison.skipped) {
      const adminResults = this.results.adminComparison;
      
      if (adminResults.analysis && adminResults.analysis.consistencyRate < 90) {
        analysis.primaryIssues.push({
          type: 'ADMIN_API_DISCREPANCY',
          severity: 'HIGH',
          description: 'Admin interface and API have different validation behavior',
          evidence: [`Consistency rate: ${adminResults.analysis.consistencyRate}%`],
          likelihood: 0.95
        });
      }
    } else if (this.results.adminComparison && this.results.adminComparison.skipped) {
      analysis.secondaryIssues.push({
        type: 'ADMIN_ACCESS_ISSUE',
        severity: 'MEDIUM',
        description: 'Unable to test admin interface validation (authentication or access issue)',
        evidence: [this.results.adminComparison.error],
        likelihood: 0.7
      });
    }

    // Calculate overall confidence
    const totalIssues = analysis.primaryIssues.length + analysis.secondaryIssues.length;
    if (totalIssues === 0) {
      analysis.confidence = 0.3; // Low confidence if no issues found
    } else {
      const avgLikelihood = [...analysis.primaryIssues, ...analysis.secondaryIssues]
        .reduce((sum, issue) => sum + issue.likelihood, 0) / totalIssues;
      analysis.confidence = avgLikelihood;
    }

    console.log(`   Found ${analysis.primaryIssues.length} primary issues`);
    console.log(`   Found ${analysis.secondaryIssues.length} secondary issues`);
    console.log(`   Analysis confidence: ${(analysis.confidence * 100).toFixed(1)}%`);

    return analysis;
  }

  /**
   * Generate actionable plan based on root cause analysis
   */
  generateActionPlan() {
    console.log('📋 Generating action plan...');

    const plan = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      preventive: []
    };

    const rootCauses = this.results.rootCauseAnalysis;

    // Process primary issues
    rootCauses.primaryIssues.forEach(issue => {
      switch (issue.type) {
        case 'SCHEMA_INCONSISTENCY':
          plan.immediate.push({
            action: 'Verify and update schema definitions',
            description: 'Check mannschaft schema.json for correct enum definitions',
            commands: [
              'node scripts/rebuild-schema.js',
              'npm run develop -- --watch-admin'
            ],
            priority: 'HIGH',
            estimatedTime: '30 minutes'
          });
          break;

        case 'VALIDATION_BYPASS':
          plan.immediate.push({
            action: 'Fix validation logic',
            description: 'Strengthen validation rules to reject invalid enum values',
            commands: [
              'Check src/api/mannschaft/content-types/mannschaft/schema.json',
              'Restart Strapi server to reload validation'
            ],
            priority: 'HIGH',
            estimatedTime: '1 hour'
          });
          break;

        case 'ADMIN_API_DISCREPANCY':
          plan.shortTerm.push({
            action: 'Synchronize admin and API validation',
            description: 'Ensure admin panel uses same validation as API',
            commands: [
              'Clear Strapi admin build cache',
              'Rebuild admin panel',
              'Test both interfaces'
            ],
            priority: 'HIGH',
            estimatedTime: '2 hours'
          });
          break;
      }
    });

    // Process secondary issues
    rootCauses.secondaryIssues.forEach(issue => {
      switch (issue.type) {
        case 'ADMIN_ACCESS_ISSUE':
          plan.shortTerm.push({
            action: 'Fix admin authentication',
            description: 'Resolve admin panel access issues for testing',
            commands: [
              'Check admin user credentials',
              'Verify admin panel is accessible',
              'Test admin authentication'
            ],
            priority: 'MEDIUM',
            estimatedTime: '1 hour'
          });
          break;
      }
    });

    // Add preventive measures
    plan.preventive.push(
      {
        action: 'Implement validation monitoring',
        description: 'Set up automated tests to catch validation discrepancies',
        commands: [
          'Add validation tests to CI/CD pipeline',
          'Create validation health checks'
        ],
        priority: 'MEDIUM',
        estimatedTime: '4 hours'
      },
      {
        action: 'Document validation procedures',
        description: 'Create troubleshooting guide for future validation issues',
        commands: [
          'Document schema update procedures',
          'Create validation testing checklist'
        ],
        priority: 'LOW',
        estimatedTime: '2 hours'
      }
    );

    // Add long-term improvements
    plan.longTerm.push({
      action: 'Implement comprehensive validation testing',
      description: 'Create automated test suite for all content type validations',
      commands: [
        'Extend validation test coverage',
        'Add performance validation tests'
      ],
      priority: 'LOW',
      estimatedTime: '8 hours'
    });

    const totalActions = plan.immediate.length + plan.shortTerm.length + plan.longTerm.length + plan.preventive.length;
    console.log(`   Generated ${totalActions} actionable items`);
    console.log(`   Immediate actions: ${plan.immediate.length}`);
    console.log(`   Short-term actions: ${plan.shortTerm.length}`);

    return plan;
  }

  /**
   * Generate comprehensive master report
   */
  async generateMasterReport() {
    console.log('\n📊 Generating master validation report...');

    const report = {
      metadata: {
        title: 'Master Validation Diagnostic Report',
        generated: this.results.timestamp.toISOString(),
        strapiUrl: CONFIG.STRAPI_URL,
        version: '1.0.0'
      },
      executiveSummary: this.generateExecutiveSummary(),
      diagnosticResults: {
        comprehensive: this.results.comprehensive,
        adminComparison: this.results.adminComparison
      },
      rootCauseAnalysis: this.results.rootCauseAnalysis,
      actionPlan: this.results.actionPlan,
      recommendations: this.generateRecommendations()
    };

    // Ensure output directory exists
    await fs.mkdir(CONFIG.OUTPUT_DIR, { recursive: true });

    // Save detailed JSON report
    const jsonPath = path.join(CONFIG.OUTPUT_DIR, `${CONFIG.MASTER_REPORT_PREFIX}-${Date.now()}.json`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    // Save executive summary
    const summaryPath = path.join(CONFIG.OUTPUT_DIR, `executive-summary-${Date.now()}.md`);
    const summaryContent = this.generateMarkdownSummary(report);
    await fs.writeFile(summaryPath, summaryContent);

    console.log(`📄 Master report saved to: ${jsonPath}`);
    console.log(`📄 Executive summary saved to: ${summaryPath}`);

    return report;
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary() {
    const summary = {
      status: 'UNKNOWN',
      criticalIssues: 0,
      recommendedActions: 0,
      estimatedFixTime: '0 hours',
      confidence: 0
    };

    if (this.results.rootCauseAnalysis) {
      const analysis = this.results.rootCauseAnalysis;
      summary.criticalIssues = analysis.primaryIssues.filter(i => i.severity === 'HIGH').length;
      summary.confidence = analysis.confidence;
      
      // Determine overall status
      if (summary.criticalIssues === 0) {
        summary.status = 'HEALTHY';
      } else if (summary.criticalIssues <= 2) {
        summary.status = 'NEEDS_ATTENTION';
      } else {
        summary.status = 'CRITICAL';
      }
    }

    if (this.results.actionPlan) {
      const plan = this.results.actionPlan;
      summary.recommendedActions = plan.immediate.length + plan.shortTerm.length;
      
      // Calculate estimated fix time
      const immediateTime = plan.immediate.reduce((sum, action) => {
        const hours = parseFloat(action.estimatedTime.match(/(\d+(?:\.\d+)?)/)?.[1] || 0);
        return sum + hours;
      }, 0);
      
      const shortTermTime = plan.shortTerm.reduce((sum, action) => {
        const hours = parseFloat(action.estimatedTime.match(/(\d+(?:\.\d+)?)/)?.[1] || 0);
        return sum + hours;
      }, 0);
      
      summary.estimatedFixTime = `${immediateTime + shortTermTime} hours`;
    }

    return summary;
  }

  /**
   * Generate final recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.results.rootCauseAnalysis) {
      const analysis = this.results.rootCauseAnalysis;
      
      // High-priority recommendations
      if (analysis.primaryIssues.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          title: 'Address Critical Validation Issues',
          description: 'Fix identified validation discrepancies immediately to prevent data integrity issues',
          impact: 'Prevents invalid data entry and ensures consistent user experience'
        });
      }

      // System health recommendations
      if (analysis.systemHealth === 'CRITICAL' || analysis.systemHealth === 'POOR') {
        recommendations.push({
          priority: 'HIGH',
          title: 'System Health Recovery',
          description: 'Implement comprehensive validation fixes to restore system health',
          impact: 'Improves overall system reliability and user confidence'
        });
      }
    }

    // Always recommend monitoring
    recommendations.push({
      priority: 'MEDIUM',
      title: 'Implement Validation Monitoring',
      description: 'Set up automated validation testing to prevent future issues',
      impact: 'Proactive issue detection and prevention'
    });

    return recommendations;
  }

  /**
   * Generate markdown summary
   */
  generateMarkdownSummary(report) {
    const { executiveSummary, rootCauseAnalysis, actionPlan } = report;
    
    let markdown = `# Validation Diagnostic Executive Summary\n\n`;
    markdown += `**Generated:** ${new Date(report.metadata.generated).toLocaleString()}\n`;
    markdown += `**Status:** ${executiveSummary.status}\n`;
    markdown += `**Critical Issues:** ${executiveSummary.criticalIssues}\n`;
    markdown += `**Confidence:** ${(executiveSummary.confidence * 100).toFixed(1)}%\n`;
    markdown += `**Estimated Fix Time:** ${executiveSummary.estimatedFixTime}\n\n`;

    // Root causes
    if (rootCauseAnalysis && rootCauseAnalysis.primaryIssues.length > 0) {
      markdown += `## Primary Issues\n\n`;
      rootCauseAnalysis.primaryIssues.forEach((issue, index) => {
        markdown += `### ${index + 1}. ${issue.type} (${issue.severity})\n`;
        markdown += `**Description:** ${issue.description}\n`;
        markdown += `**Likelihood:** ${(issue.likelihood * 100).toFixed(1)}%\n`;
        if (issue.evidence.length > 0) {
          markdown += `**Evidence:**\n`;
          issue.evidence.forEach(evidence => {
            markdown += `- ${evidence}\n`;
          });
        }
        markdown += `\n`;
      });
    }

    // Immediate actions
    if (actionPlan && actionPlan.immediate.length > 0) {
      markdown += `## Immediate Actions Required\n\n`;
      actionPlan.immediate.forEach((action, index) => {
        markdown += `### ${index + 1}. ${action.action} (${action.priority})\n`;
        markdown += `**Description:** ${action.description}\n`;
        markdown += `**Estimated Time:** ${action.estimatedTime}\n`;
        if (action.commands.length > 0) {
          markdown += `**Commands:**\n`;
          action.commands.forEach(command => {
            markdown += `- \`${command}\`\n`;
          });
        }
        markdown += `\n`;
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      report.recommendations.forEach((rec, index) => {
        markdown += `### ${index + 1}. ${rec.title} (${rec.priority})\n`;
        markdown += `**Description:** ${rec.description}\n`;
        markdown += `**Impact:** ${rec.impact}\n\n`;
      });
    }

    return markdown;
  }
}

/**
 * Main execution function
 */
async function runMasterDiagnostic() {
  const runner = new ValidationDiagnosticRunner();
  
  try {
    // Run all diagnostics
    await runner.runAllDiagnostics();
    
    // Generate master report
    const report = await runner.generateMasterReport();
    
    // Display final summary
    console.log('\n🎯 MASTER DIAGNOSTIC COMPLETE');
    console.log('='.repeat(60));
    console.log(`Status: ${report.executiveSummary.status}`);
    console.log(`Critical Issues: ${report.executiveSummary.criticalIssues}`);
    console.log(`Recommended Actions: ${report.executiveSummary.recommendedActions}`);
    console.log(`Estimated Fix Time: ${report.executiveSummary.estimatedFixTime}`);
    console.log(`Confidence: ${(report.executiveSummary.confidence * 100).toFixed(1)}%`);
    
    if (report.executiveSummary.criticalIssues > 0) {
      console.log('\n🚨 CRITICAL ISSUES DETECTED - Immediate action required!');
    } else {
      console.log('\n✅ No critical issues detected');
    }
    
    console.log('\n📄 Check the generated reports for detailed analysis and action plans.');
    
    return report;
  } catch (error) {
    console.error('❌ Master diagnostic failed:', error.message);
    throw error;
  }
}

// Export for module usage
module.exports = {
  ValidationDiagnosticRunner,
  runMasterDiagnostic,
  CONFIG
};

// Run master diagnostic if script is executed directly
if (require.main === module) {
  runMasterDiagnostic().catch(error => {
    console.error('❌ Master diagnostic execution failed:', error.message);
    process.exit(1);
  });
}