/**
 * Test Validation Diagnostic
 * 
 * Simple test script to verify the validation diagnostic system works correctly
 */

const { runMasterDiagnostic } = require('./validation-diagnostic-runner');

async function testDiagnostic() {
  console.log('🧪 Testing Validation Diagnostic System...');
  console.log('='.repeat(50));
  
  try {
    // Test server connectivity first
    const axios = require('axios');
    const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
    
    console.log(`📡 Testing connection to ${STRAPI_URL}...`);
    
    try {
      await axios.get(`${STRAPI_URL}/api/mannschaften`, { timeout: 5000 });
      console.log('✅ Strapi server is accessible');
    } catch (error) {
      console.error('❌ Strapi server is not accessible:', error.message);
      console.log('💡 Make sure Strapi is running with: npm run develop');
      process.exit(1);
    }
    
    // Run the master diagnostic
    console.log('\n🚀 Running master diagnostic...');
    const report = await runMasterDiagnostic();
    
    // Verify report structure
    console.log('\n🔍 Verifying report structure...');
    
    const requiredSections = [
      'metadata',
      'executiveSummary', 
      'diagnosticResults',
      'rootCauseAnalysis',
      'actionPlan',
      'recommendations'
    ];
    
    let structureValid = true;
    requiredSections.forEach(section => {
      if (!report[section]) {
        console.error(`❌ Missing report section: ${section}`);
        structureValid = false;
      } else {
        console.log(`✅ Found section: ${section}`);
      }
    });
    
    if (structureValid) {
      console.log('\n✅ Report structure is valid');
    } else {
      console.error('\n❌ Report structure is invalid');
      process.exit(1);
    }
    
    // Display key findings
    console.log('\n📊 KEY FINDINGS:');
    console.log(`   Status: ${report.executiveSummary.status}`);
    console.log(`   Critical Issues: ${report.executiveSummary.criticalIssues}`);
    console.log(`   Confidence: ${(report.executiveSummary.confidence * 100).toFixed(1)}%`);
    
    if (report.rootCauseAnalysis.primaryIssues.length > 0) {
      console.log('\n🔍 PRIMARY ISSUES DETECTED:');
      report.rootCauseAnalysis.primaryIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.type} (${issue.severity})`);
        console.log(`      ${issue.description}`);
      });
    }
    
    if (report.actionPlan.immediate.length > 0) {
      console.log('\n⚡ IMMEDIATE ACTIONS:');
      report.actionPlan.immediate.forEach((action, index) => {
        console.log(`   ${index + 1}. ${action.action} (${action.estimatedTime})`);
      });
    }
    
    console.log('\n🎉 Validation diagnostic test completed successfully!');
    console.log('📄 Check the validation-reports directory for detailed reports.');
    
  } catch (error) {
    console.error('❌ Diagnostic test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run test
testDiagnostic();