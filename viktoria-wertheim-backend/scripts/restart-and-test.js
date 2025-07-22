/**
 * Restart and Test Script
 * 
 * This script helps restart Strapi and test the validation fixes
 */

const { spawn } = require('child_process');
const axios = require('axios');

const CONFIG = {
  STRAPI_URL: 'http://localhost:1337',
  MAX_WAIT_TIME: 60000, // 60 seconds
  CHECK_INTERVAL: 2000   // 2 seconds
};

async function waitForStrapi() {
  console.log('⏳ Waiting for Strapi to start...');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < CONFIG.MAX_WAIT_TIME) {
    try {
      await axios.get(`${CONFIG.STRAPI_URL}/api/mannschaften`, { timeout: 5000 });
      console.log('✅ Strapi is ready!');
      return true;
    } catch (error) {
      console.log('   🔄 Still waiting...');
      await new Promise(resolve => setTimeout(resolve, CONFIG.CHECK_INTERVAL));
    }
  }
  
  console.error('❌ Strapi failed to start within timeout period');
  return false;
}

async function runValidationTest() {
  console.log('\n🧪 Running validation fix test...');
  
  const { testValidationFix } = require('./test-api-validation-fix');
  
  try {
    const results = await testValidationFix();
    return results;
  } catch (error) {
    console.error('❌ Validation test failed:', error.message);
    return null;
  }
}

async function runComprehensiveDiagnostic() {
  console.log('\n🔍 Running comprehensive diagnostic...');
  
  const { runComprehensiveDiagnostic } = require('./comprehensive-validation-diagnostic');
  
  try {
    const results = await runComprehensiveDiagnostic();
    return results;
  } catch (error) {
    console.error('❌ Comprehensive diagnostic failed:', error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Restart and Test Process');
  console.log('='.repeat(50));
  
  console.log('💡 MANUAL STEPS REQUIRED:');
  console.log('1. Stop the current Strapi server (Ctrl+C)');
  console.log('2. Run: npm run develop');
  console.log('3. Wait for Strapi to fully start');
  console.log('4. Run this script again with --test flag');
  console.log('');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    console.log('🔍 Testing mode - assuming Strapi is already running...');
    
    // Wait for Strapi to be ready
    const strapiReady = await waitForStrapi();
    if (!strapiReady) {
      process.exit(1);
    }
    
    // Run validation fix test
    const validationResults = await runValidationTest();
    if (!validationResults) {
      process.exit(1);
    }
    
    console.log('\n📊 VALIDATION FIX RESULTS:');
    console.log(`Success Rate: ${validationResults.successRate.toFixed(1)}%`);
    console.log(`Passed: ${validationResults.passedTests}/${validationResults.totalTests}`);
    
    if (validationResults.successRate === 100) {
      console.log('🎉 Validation fix is working perfectly!');
      
      // Run comprehensive diagnostic to verify
      console.log('\n🔍 Running final comprehensive diagnostic...');
      const diagnosticResults = await runComprehensiveDiagnostic();
      
      if (diagnosticResults) {
        console.log('\n📊 FINAL DIAGNOSTIC RESULTS:');
        console.log(`Overall Health: ${diagnosticResults.summary.overallHealth}`);
        console.log(`Discrepancies: ${diagnosticResults.summary.discrepancyCount}`);
        console.log(`High Severity Issues: ${diagnosticResults.summary.highSeverityCount}`);
        
        if (diagnosticResults.summary.discrepancyCount === 0) {
          console.log('\n🎉 PERFECT! All validation issues have been resolved!');
        } else {
          console.log('\n⚠️ Some issues remain. Check the diagnostic report for details.');
        }
      }
    } else {
      console.log('⚠️ Validation fix needs more work. Check the test results above.');
    }
    
  } else if (args.includes('--check')) {
    console.log('🔍 Checking if Strapi is running...');
    const strapiReady = await waitForStrapi();
    if (strapiReady) {
      console.log('✅ Strapi is running and accessible');
    } else {
      console.log('❌ Strapi is not running or not accessible');
      process.exit(1);
    }
  } else {
    console.log('📋 Available commands:');
    console.log('  --test   : Run validation tests (assumes Strapi is running)');
    console.log('  --check  : Check if Strapi is accessible');
    console.log('');
    console.log('💡 Recommended workflow:');
    console.log('1. node scripts/restart-and-test.js --check');
    console.log('2. If not running: npm run develop');
    console.log('3. node scripts/restart-and-test.js --test');
  }
}

// Export for module usage
module.exports = {
  waitForStrapi,
  runValidationTest,
  runComprehensiveDiagnostic
};

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Process failed:', error.message);
    process.exit(1);
  });
}