/**
 * Test API Validation Fix
 * 
 * This script tests if the API validation fixes are working correctly
 * by attempting to create records with null/undefined values.
 */

const axios = require('axios');

const CONFIG = {
  STRAPI_URL: process.env.STRAPI_URL || 'http://localhost:1337',
  TIMEOUT: 10000
};

async function testValidationFix() {
  console.log('🧪 Testing API Validation Fix...');
  console.log(`📍 Target: ${CONFIG.STRAPI_URL}`);
  console.log('='.repeat(50));
  
  // Test cases that should now FAIL (be rejected)
  const testCases = [
    {
      name: 'Null status test',
      data: {
        name: 'Test Null Status',
        status: null,
        liga: 'Kreisklasse A',
        altersklasse: 'senioren'
      },
      shouldFail: true
    },
    {
      name: 'Undefined liga test',
      data: {
        name: 'Test Undefined Liga',
        status: 'aktiv',
        liga: undefined,
        altersklasse: 'senioren'
      },
      shouldFail: true
    },
    {
      name: 'Null altersklasse test',
      data: {
        name: 'Test Null Altersklasse',
        status: 'aktiv',
        liga: 'Kreisklasse A',
        altersklasse: null
      },
      shouldFail: true
    },
    {
      name: 'Valid data test',
      data: {
        name: `Test Valid Data ${Date.now()}`,
        status: 'aktiv',
        liga: 'Kreisklasse A',
        altersklasse: 'senioren'
      },
      shouldFail: false
    },
    {
      name: 'Invalid enum value test',
      data: {
        name: 'Test Invalid Enum',
        status: 'invalid_status',
        liga: 'Kreisklasse A',
        altersklasse: 'senioren'
      },
      shouldFail: true
    }
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  const results = [];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Running: ${testCase.name}`);
    
    try {
      const response = await axios.post(
        `${CONFIG.STRAPI_URL}/api/mannschaften`,
        { data: testCase.data },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: CONFIG.TIMEOUT
        }
      );
      
      // Request succeeded
      const success = !testCase.shouldFail;
      if (success) {
        console.log('   ✅ PASS - Valid data accepted');
        passedTests++;
        
        // Clean up created record
        if (response.data?.data?.id) {
          try {
            await axios.delete(`${CONFIG.STRAPI_URL}/api/mannschaften/${response.data.data.id}`);
          } catch (cleanupError) {
            console.warn(`   ⚠️ Failed to cleanup record ${response.data.data.id}`);
          }
        }
      } else {
        console.log('   ❌ FAIL - Invalid data was accepted (should have been rejected)');
        failedTests++;
        
        // Clean up created record
        if (response.data?.data?.id) {
          try {
            await axios.delete(`${CONFIG.STRAPI_URL}/api/mannschaften/${response.data.data.id}`);
          } catch (cleanupError) {
            console.warn(`   ⚠️ Failed to cleanup record ${response.data.data.id}`);
          }
        }
      }
      
      results.push({
        test: testCase.name,
        expected: testCase.shouldFail ? 'REJECT' : 'ACCEPT',
        actual: 'ACCEPT',
        passed: success,
        response: response.data
      });
      
    } catch (error) {
      // Request failed
      const success = testCase.shouldFail;
      if (success) {
        console.log('   ✅ PASS - Invalid data rejected');
        console.log(`   📝 Error: ${error.response?.data?.error?.message || error.message}`);
        passedTests++;
      } else {
        console.log('   ❌ FAIL - Valid data was rejected');
        console.log(`   📝 Error: ${error.response?.data?.error?.message || error.message}`);
        failedTests++;
      }
      
      results.push({
        test: testCase.name,
        expected: testCase.shouldFail ? 'REJECT' : 'ACCEPT',
        actual: 'REJECT',
        passed: success,
        error: error.response?.data?.error?.message || error.message
      });
    }
  }
  
  // Summary
  console.log('\n📊 VALIDATION FIX TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / testCases.length) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED! API validation is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. API validation may need additional fixes.');
    
    console.log('\n📋 Failed Tests:');
    results.filter(r => !r.passed).forEach(result => {
      console.log(`   - ${result.test}: Expected ${result.expected}, got ${result.actual}`);
    });
  }
  
  return {
    totalTests: testCases.length,
    passedTests,
    failedTests,
    successRate: (passedTests / testCases.length) * 100,
    results
  };
}

async function testServerConnectivity() {
  console.log('🔌 Testing server connectivity...');
  
  try {
    await axios.get(`${CONFIG.STRAPI_URL}/api/mannschaften`, { timeout: 5000 });
    console.log('✅ Strapi server is accessible');
    return true;
  } catch (error) {
    console.error('❌ Strapi server is not accessible:', error.message);
    console.log('💡 Make sure Strapi is running with: npm run develop');
    return false;
  }
}

async function main() {
  // Test connectivity first
  const serverOk = await testServerConnectivity();
  if (!serverOk) {
    process.exit(1);
  }
  
  // Run validation tests
  const results = await testValidationFix();
  
  // Exit with appropriate code
  process.exit(results.failedTests > 0 ? 1 : 0);
}

// Export for module usage
module.exports = {
  testValidationFix,
  testServerConnectivity
};

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}