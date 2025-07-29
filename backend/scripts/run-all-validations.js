/**
 * Master Validation and Cleanup Script
 * 
 * This script orchestrates all validation and cleanup tools:
 * - Club data integrity validation
 * - Team-club consistency validation
 * - Orphaned records cleanup
 * - Data quality report generation
 * 
 * Usage:
 *   node scripts/run-all-validations.js [options]
 * 
 * Options:
 *   --fix-issues     Automatically fix issues where possible
 *   --cleanup        Run cleanup tools
 *   --report         Generate data quality report
 *   --detailed       Show detailed results
 *   --export         Export all reports
 *   --email=ADDRESS  Email reports to address
 *   --dry-run        Show what would be done without making changes
 */

const { createStrapi } = require('@strapi/strapi');
const { ClubDataValidator } = require('./validate-club-data-integrity');
const { TeamClubConsistencyValidator } = require('./validate-team-club-consistency');
const { OrphanedRecordsCleaner } = require('./cleanup-orphaned-records');
const { DataQualityReportGenerator } = require('./generate-data-quality-report');
const fs = require('fs');
const path = require('path');

class MasterValidationRunner {
  constructor(strapi) {
    this.strapi = strapi;
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalValidations: 0,
        totalIssuesFound: 0,
        totalIssuesFixed: 0,
        overallHealthScore: 0,
        executionTime: 0
      },
      validationResults: {
        clubDataValidation: null,
        teamClubConsistency: null,
        orphanedRecords: null,
        dataQualityReport: null
      },
      recommendations: [],
      actionItems: [],
      errors: []
    };
  }

  /**
   * Run all validations and cleanup tools
   */
  async runAll(options = {}) {
    const startTime = Date.now();
    
    console.log('🚀 Starting Master Validation and Cleanup Process');
    console.log('Options:', options);
    console.log('='.repeat(80));

    try {
      // 1. Club Data Integrity Validation
      await this.runClubDataValidation(options);

      // 2. Team-Club Consistency Validation
      await this.runTeamClubConsistencyValidation(options);

      // 3. Orphaned Records Cleanup (if requested)
      if (options.cleanup) {
        await this.runOrphanedRecordsCleanup(options);
      }

      // 4. Data Quality Report Generation (if requested)
      if (options.report) {
        await this.runDataQualityReport(options);
      }

      // 5. Consolidate results and recommendations
      await this.consolidateResults();

      // 6. Display summary
      this.displaySummary(options);

      // 7. Export results (if requested)
      if (options.export) {
        await this.exportResults();
      }

      // 8. Email results (if requested)
      if (options.email) {
        await this.emailResults(options.email);
      }

      this.results.summary.executionTime = Date.now() - startTime;
      return this.results;

    } catch (error) {
      console.error('❌ Master validation failed:', error);
      this.results.errors.push({
        type: 'MASTER_VALIDATION_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * Run club data integrity validation
   */
  async runClubDataValidation(options) {
    console.log('\n📋 Running Club Data Integrity Validation...');
    console.log('-'.repeat(50));

    try {
      const validator = new ClubDataValidator(this.strapi);
      const validationOptions = {
        detailed: options.detailed,
        fixOrphans: options.fixIssues && !options.dryRun,
        exportReport: options.export
      };

      const results = await validator.validateAll(validationOptions);
      this.results.validationResults.clubDataValidation = results;
      this.results.summary.totalValidations++;

      // Count issues
      const issuesFound = results.summary.totalValidationErrors + results.summary.orphanedRecords;
      this.results.summary.totalIssuesFound += issuesFound;

      console.log(`✅ Club data validation completed`);
      console.log(`   Issues found: ${issuesFound}`);
      console.log(`   Health indicators: ${results.summary.totalClubs} clubs checked`);

    } catch (error) {
      console.error('❌ Club data validation failed:', error.message);
      this.results.errors.push({
        type: 'CLUB_DATA_VALIDATION_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Run team-club consistency validation
   */
  async runTeamClubConsistencyValidation(options) {
    console.log('\n🔗 Running Team-Club Consistency Validation...');
    console.log('-'.repeat(50));

    try {
      const validator = new TeamClubConsistencyValidator(this.strapi);
      const validationOptions = {
        detailed: options.detailed,
        fixIssues: options.fixIssues && !options.dryRun,
        exportReport: options.export
      };

      const results = await validator.validateConsistency(validationOptions);
      this.results.validationResults.teamClubConsistency = results;
      this.results.summary.totalValidations++;

      // Count issues
      const issuesFound = results.summary.consistencyErrors + results.summary.migrationIssues;
      this.results.summary.totalIssuesFound += issuesFound;

      console.log(`✅ Team-club consistency validation completed`);
      console.log(`   Consistency errors: ${results.summary.consistencyErrors}`);
      console.log(`   Migration issues: ${results.summary.migrationIssues}`);

    } catch (error) {
      console.error('❌ Team-club consistency validation failed:', error.message);
      this.results.errors.push({
        type: 'TEAM_CLUB_CONSISTENCY_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Run orphaned records cleanup
   */
  async runOrphanedRecordsCleanup(options) {
    console.log('\n🧹 Running Orphaned Records Cleanup...');
    console.log('-'.repeat(50));

    try {
      const cleaner = new OrphanedRecordsCleaner(this.strapi);
      const cleanupOptions = {
        dryRun: options.dryRun,
        force: options.fixIssues && !options.dryRun,
        backup: !options.dryRun
      };

      const results = await cleaner.cleanup(cleanupOptions);
      this.results.validationResults.orphanedRecords = results;
      this.results.summary.totalValidations++;

      // Count cleanup actions
      const recordsCleaned = results.cleanupResults.summary.totalCleaned;
      this.results.summary.totalIssuesFixed += recordsCleaned;

      console.log(`✅ Orphaned records cleanup completed`);
      console.log(`   Records scanned: ${results.cleanupResults.summary.totalScanned}`);
      console.log(`   Records cleaned: ${recordsCleaned}`);
      console.log(`   Errors: ${results.cleanupResults.summary.totalErrors}`);

    } catch (error) {
      console.error('❌ Orphaned records cleanup failed:', error.message);
      this.results.errors.push({
        type: 'ORPHANED_RECORDS_CLEANUP_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Run data quality report generation
   */
  async runDataQualityReport(options) {
    console.log('\n📊 Generating Data Quality Report...');
    console.log('-'.repeat(50));

    try {
      const generator = new DataQualityReportGenerator(this.strapi);
      const reportOptions = {
        period: 30,
        detailed: options.detailed,
        trends: true,
        format: 'json'
      };

      const report = await generator.generateReport(reportOptions);
      this.results.validationResults.dataQualityReport = report;
      this.results.summary.totalValidations++;

      console.log(`✅ Data quality report generated`);
      console.log(`   Overall health score: ${report.summary.overallHealthScore}%`);
      console.log(`   Total records: ${report.summary.totalRecords}`);
      console.log(`   Quality issues: ${report.summary.qualityIssues}`);

    } catch (error) {
      console.error('❌ Data quality report generation failed:', error.message);
      this.results.errors.push({
        type: 'DATA_QUALITY_REPORT_ERROR',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Consolidate results and recommendations
   */
  async consolidateResults() {
    console.log('\n💡 Consolidating Results and Recommendations...');
    console.log('-'.repeat(50));

    const allRecommendations = [];
    const allActionItems = [];

    // Collect recommendations from all validations
    if (this.results.validationResults.clubDataValidation?.recommendations) {
      allRecommendations.push(...this.results.validationResults.clubDataValidation.recommendations);
    }

    if (this.results.validationResults.teamClubConsistency?.recommendations) {
      allRecommendations.push(...this.results.validationResults.teamClubConsistency.recommendations);
    }

    if (this.results.validationResults.dataQualityReport?.recommendations) {
      allRecommendations.push(...this.results.validationResults.dataQualityReport.recommendations);
    }

    if (this.results.validationResults.dataQualityReport?.actionItems) {
      allActionItems.push(...this.results.validationResults.dataQualityReport.actionItems);
    }

    // Deduplicate and prioritize recommendations
    const uniqueRecommendations = this.deduplicateRecommendations(allRecommendations);
    const prioritizedRecommendations = this.prioritizeRecommendations(uniqueRecommendations);

    this.results.recommendations = prioritizedRecommendations;
    this.results.actionItems = allActionItems;

    // Calculate overall health score
    this.calculateOverallHealthScore();

    console.log(`✅ Consolidated ${prioritizedRecommendations.length} recommendations`);
    console.log(`✅ Identified ${allActionItems.length} action items`);
  }

  /**
   * Deduplicate recommendations
   */
  deduplicateRecommendations(recommendations) {
    const seen = new Set();
    return recommendations.filter(rec => {
      const key = `${rec.category}-${rec.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Prioritize recommendations
   */
  prioritizeRecommendations(recommendations) {
    const priorityOrder = { 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    return recommendations.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 4;
      const bPriority = priorityOrder[b.priority] || 4;
      return aPriority - bPriority;
    });
  }

  /**
   * Calculate overall health score
   */
  calculateOverallHealthScore() {
    const scores = [];

    // Club data validation health
    if (this.results.validationResults.clubDataValidation) {
      const clubResult = this.results.validationResults.clubDataValidation;
      const totalClubs = clubResult.summary.totalClubs;
      const errors = clubResult.summary.totalValidationErrors;
      const clubScore = totalClubs > 0 ? Math.max(0, 100 - (errors / totalClubs * 100)) : 100;
      scores.push(clubScore);
    }

    // Team-club consistency health
    if (this.results.validationResults.teamClubConsistency) {
      const consistencyResult = this.results.validationResults.teamClubConsistency;
      const totalRecords = consistencyResult.summary.totalSpiele + consistencyResult.summary.totalTabellenEintraege;
      const errors = consistencyResult.summary.consistencyErrors;
      const consistencyScore = totalRecords > 0 ? Math.max(0, 100 - (errors / totalRecords * 100)) : 100;
      scores.push(consistencyScore);
    }

    // Data quality report health
    if (this.results.validationResults.dataQualityReport) {
      const qualityScore = this.results.validationResults.dataQualityReport.summary.overallHealthScore;
      scores.push(qualityScore);
    }

    // Calculate average
    this.results.summary.overallHealthScore = scores.length > 0 
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
  }

  /**
   * Display summary results
   */
  displaySummary(options) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 MASTER VALIDATION SUMMARY');
    console.log('='.repeat(80));

    const summary = this.results.summary;
    console.log('\n📈 OVERALL RESULTS:');
    console.log(`Validations Run: ${summary.totalValidations}`);
    console.log(`Issues Found: ${summary.totalIssuesFound}`);
    console.log(`Issues Fixed: ${summary.totalIssuesFixed}`);
    console.log(`Overall Health Score: ${summary.overallHealthScore}%`);
    console.log(`Execution Time: ${Math.round(summary.executionTime / 1000)}s`);

    // Health status
    const healthStatus = summary.overallHealthScore >= 90 ? '🟢 EXCELLENT' :
                        summary.overallHealthScore >= 80 ? '🟡 GOOD' :
                        summary.overallHealthScore >= 70 ? '🟠 FAIR' : '🔴 NEEDS ATTENTION';
    console.log(`Health Status: ${healthStatus}`);

    // Individual validation results
    console.log('\n🔍 VALIDATION BREAKDOWN:');
    
    if (this.results.validationResults.clubDataValidation) {
      const clubResult = this.results.validationResults.clubDataValidation;
      console.log(`Club Data Validation: ${clubResult.summary.totalValidationErrors} errors, ${clubResult.summary.orphanedRecords} orphaned records`);
    }

    if (this.results.validationResults.teamClubConsistency) {
      const consistencyResult = this.results.validationResults.teamClubConsistency;
      console.log(`Team-Club Consistency: ${consistencyResult.summary.consistencyErrors} consistency errors, ${consistencyResult.summary.migrationIssues} migration issues`);
    }

    if (this.results.validationResults.orphanedRecords) {
      const cleanupResult = this.results.validationResults.orphanedRecords;
      console.log(`Orphaned Records Cleanup: ${cleanupResult.cleanupResults.summary.totalCleaned} records cleaned`);
    }

    if (this.results.validationResults.dataQualityReport) {
      const qualityResult = this.results.validationResults.dataQualityReport;
      console.log(`Data Quality Report: ${qualityResult.summary.overallHealthScore}% health score, ${qualityResult.summary.qualityIssues} quality issues`);
    }

    // Top recommendations
    if (this.results.recommendations.length > 0) {
      console.log('\n💡 TOP RECOMMENDATIONS:');
      this.results.recommendations.slice(0, 5).forEach((rec, index) => {
        const priority = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
        console.log(`${index + 1}. ${priority} ${rec.title}`);
        console.log(`   ${rec.description}`);
      });

      if (this.results.recommendations.length > 5) {
        console.log(`   ... and ${this.results.recommendations.length - 5} more recommendations`);
      }
    }

    // Urgent action items
    const urgentActions = this.results.actionItems.filter(item => item.priority === 'HIGH');
    if (urgentActions.length > 0) {
      console.log('\n🚨 URGENT ACTION ITEMS:');
      urgentActions.forEach((item, index) => {
        console.log(`${index + 1}. ${item.title}`);
        console.log(`   Assignee: ${item.assignee}`);
        console.log(`   Due: ${new Date(item.dueDate).toLocaleDateString()}`);
        console.log(`   Effort: ${item.estimatedEffort}`);
      });
    }

    // Errors
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      this.results.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.type}: ${error.message}`);
      });
    }

    // Next steps
    console.log('\n🎯 NEXT STEPS:');
    if (summary.totalIssuesFound > 0) {
      console.log('1. Review and address high-priority recommendations');
      console.log('2. Execute urgent action items');
      if (!options.fixIssues) {
        console.log('3. Re-run with --fix-issues to automatically resolve issues');
      }
      console.log('4. Schedule regular validation runs');
    } else {
      console.log('1. System is healthy - maintain current practices');
      console.log('2. Schedule regular validation runs to monitor health');
      console.log('3. Consider implementing automated monitoring');
    }

    console.log('\n📄 DETAILED REPORTS:');
    if (options.export) {
      console.log('- Detailed reports exported to /reports directory');
    }
    if (options.email) {
      console.log(`- Reports will be emailed to ${options.email}`);
    }
    console.log('- Run individual validation scripts for more details');

    console.log('='.repeat(80));
  }

  /**
   * Export all results
   */
  async exportResults() {
    console.log('\n📄 Exporting validation results...');

    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Export master results
    const masterReportPath = path.join(reportsDir, `master-validation-report-${timestamp}.json`);
    fs.writeFileSync(masterReportPath, JSON.stringify(this.results, null, 2));

    // Export individual results
    const exports = [];

    if (this.results.validationResults.clubDataValidation) {
      const clubReportPath = path.join(reportsDir, `club-validation-${timestamp}.json`);
      fs.writeFileSync(clubReportPath, JSON.stringify(this.results.validationResults.clubDataValidation, null, 2));
      exports.push(clubReportPath);
    }

    if (this.results.validationResults.teamClubConsistency) {
      const consistencyReportPath = path.join(reportsDir, `consistency-validation-${timestamp}.json`);
      fs.writeFileSync(consistencyReportPath, JSON.stringify(this.results.validationResults.teamClubConsistency, null, 2));
      exports.push(consistencyReportPath);
    }

    if (this.results.validationResults.dataQualityReport) {
      const qualityReportPath = path.join(reportsDir, `quality-report-${timestamp}.json`);
      fs.writeFileSync(qualityReportPath, JSON.stringify(this.results.validationResults.dataQualityReport, null, 2));
      exports.push(qualityReportPath);
    }

    exports.push(masterReportPath);

    console.log(`✅ Exported ${exports.length} reports:`);
    exports.forEach(exportPath => {
      console.log(`   - ${path.basename(exportPath)}`);
    });
  }

  /**
   * Email results (placeholder - would need email service integration)
   */
  async emailResults(email) {
    console.log(`\n📧 Email functionality not implemented.`);
    console.log(`   Results would be sent to: ${email}`);
    console.log(`   Health Score: ${this.results.summary.overallHealthScore}%`);
    console.log(`   Issues Found: ${this.results.summary.totalIssuesFound}`);
    console.log(`   Issues Fixed: ${this.results.summary.totalIssuesFixed}`);
  }

  /**
   * Generate executive summary for stakeholders
   */
  generateExecutiveSummary() {
    const summary = this.results.summary;
    const healthGrade = summary.overallHealthScore >= 90 ? 'A' :
                       summary.overallHealthScore >= 80 ? 'B' :
                       summary.overallHealthScore >= 70 ? 'C' :
                       summary.overallHealthScore >= 60 ? 'D' : 'F';

    return {
      executiveOverview: {
        healthGrade,
        healthScore: summary.overallHealthScore,
        systemStatus: summary.totalIssuesFound === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION',
        criticalIssues: this.results.recommendations.filter(r => r.priority === 'HIGH').length,
        dataIntegrityScore: this.results.validationResults.clubDataValidation ? 
          Math.max(0, 100 - this.results.validationResults.clubDataValidation.summary.totalValidationErrors) : 'N/A'
      },
      keyFindings: this.results.recommendations.slice(0, 3).map(rec => ({
        finding: rec.title,
        impact: rec.priority,
        recommendation: rec.description
      })),
      immediateActions: this.results.actionItems.filter(item => item.priority === 'HIGH').map(item => ({
        action: item.title,
        assignee: item.assignee,
        dueDate: item.dueDate,
        effort: item.estimatedEffort
      })),
      metrics: {
        totalRecords: this.results.validationResults.dataQualityReport?.summary.totalRecords || 'N/A',
        validationsRun: summary.totalValidations,
        issuesFound: summary.totalIssuesFound,
        issuesResolved: summary.totalIssuesFixed,
        executionTime: `${Math.round(summary.executionTime / 1000)}s`
      }
    };
  }
}

/**
 * Main execution function
 */
async function runMasterValidation() {
  const args = process.argv.slice(2);
  const options = {
    fixIssues: args.includes('--fix-issues'),
    cleanup: args.includes('--cleanup'),
    report: args.includes('--report'),
    detailed: args.includes('--detailed'),
    export: args.includes('--export'),
    dryRun: args.includes('--dry-run'),
    email: args.find(arg => arg.startsWith('--email='))?.split('=')[1]
  };

  // Default to running report if no specific options provided
  if (!options.cleanup && !options.report && !options.fixIssues) {
    options.report = true;
  }

  console.log('🚀 Starting Master Validation and Cleanup Process');
  console.log('Configuration:', options);
  console.log('='.repeat(80));

  const strapi = await createStrapi();

  try {
    const runner = new MasterValidationRunner(strapi);
    const results = await runner.runAll(options);

    // Generate executive summary
    const executiveSummary = runner.generateExecutiveSummary();
    
    console.log('\n📋 EXECUTIVE SUMMARY:');
    console.log(`System Health Grade: ${executiveSummary.executiveOverview.healthGrade}`);
    console.log(`Health Score: ${executiveSummary.executiveOverview.healthScore}%`);
    console.log(`Status: ${executiveSummary.executiveOverview.systemStatus}`);
    console.log(`Critical Issues: ${executiveSummary.executiveOverview.criticalIssues}`);

    // Exit with appropriate code
    const hasIssues = results.summary.totalIssuesFound > 0 || results.errors.length > 0;
    process.exit(hasIssues ? 1 : 0);

  } catch (error) {
    console.error('❌ Master validation failed:', error);
    process.exit(1);
  } finally {
    await strapi.destroy();
  }
}

// Run master validation if this script is executed directly
if (require.main === module) {
  runMasterValidation().catch(console.error);
}

module.exports = { MasterValidationRunner };