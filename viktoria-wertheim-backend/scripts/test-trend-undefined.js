/**
 * Test Trend Undefined Issue
 * 
 * Specific test to debug why trend field accepts undefined values
 */

const axios = require('axios');

const CONFIG = {
  STRAPI_URL: 'http://localhost:1337'
};

async function testTrendUndefined() {
  console.log('🔍 Testing trend field with undefined value...');
  
  const testData = {
    data: {
      name: `Test Trend Undefined ${Date.now()}`,
      status: 'aktiv',
      liga: 'Kreisklasse A',
      altersklasse: 'senioren',
      trend: undefined,
      saison: "2024/25",
      spielort: "Sportplatz Wertheim"
    }
  };
  
  console.log('📤 Sending request with undefined trend...');
  console.log('Data:', JSON.stringify(testData, null, 2));
  
  try {
    const response = await axios.post(
      `${CONFIG.STRAPI_URL}/api/mannschaften`,
      testData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    console.log('❌ PROBLEM: Request succeeded when it should have failed');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Clean up
    if (response.data?.data?.id) {
      try {
        await axios.delete(`${CONFIG.STRAPI_URL}/api/mannschaften/${response.data.data.id}`);
        console.log('🧹 Cleaned up test record');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup record');
      }
    }
    
    return false; // Test failed (should have been rejected)
    
  } catch (error) {
    console.log('✅ GOOD: Request was rejected as expected');
    console.log('Error:', error.response?.data?.error?.message || error.message);
    
    if (error.response?.data?.error?.details) {
      console.log('Validation details:', JSON.stringify(error.response.data.error.details, null, 2));
    }
    
    return true; // Test passed (correctly rejected)
  }
}

async function testTrendNull() {
  console.log('\n🔍 Testing trend field with null value...');
  
  const testData = {
    data: {
      name: `Test Trend Null ${Date.now()}`,
      status: 'aktiv',
      liga: 'Kreisklasse A',
      altersklasse: 'senioren',
      trend: null,
      saison: "2024/25",
      spielort: "Sportplatz Wertheim"
    }
  };
  
  console.log('📤 Sending request with null trend...');
  
  try {
    const response = await axios.post(
      `${CONFIG.STRAPI_URL}/api/mannschaften`,
      testData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    console.log('❌ PROBLEM: Request succeeded when it should have failed');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Clean up
    if (response.data?.data?.id) {
      try {
        await axios.delete(`${CONFIG.STRAPI_URL}/api/mannschaften/${response.data.data.id}`);
        console.log('🧹 Cleaned up test record');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup record');
      }
    }
    
    return false; // Test failed
    
  } catch (error) {
    console.log('✅ GOOD: Request was rejected as expected');
    console.log('Error:', error.response?.data?.error?.message || error.message);
    return true; // Test passed
  }
}

async function testTrendValid() {
  console.log('\n🔍 Testing trend field with valid value...');
  
  const testData = {
    data: {
      name: `Test Trend Valid ${Date.now()}`,
      status: 'aktiv',
      liga: 'Kreisklasse A',
      altersklasse: 'senioren',
      trend: 'steigend',
      saison: "2024/25",
      spielort: "Sportplatz Wertheim"
    }
  };
  
  console.log('📤 Sending request with valid trend...');
  
  try {
    const response = await axios.post(
      `${CONFIG.STRAPI_URL}/api/mannschaften`,
      testData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    console.log('✅ GOOD: Valid request succeeded');
    console.log('Created trend value:', response.data.data.attributes.trend);
    
    // Clean up
    if (response.data?.data?.id) {
      try {
        await axios.delete(`${CONFIG.STRAPI_URL}/api/mannschaften/${response.data.data.id}`);
        console.log('🧹 Cleaned up test record');
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup record');
      }
    }
    
    return true; // Test passed
    
  } catch (error) {
    console.log('❌ PROBLEM: Valid request was rejected');
    console.log('Error:', error.response?.data?.error?.message || error.message);
    return false; // Test failed
  }
}

async function main() {
  console.log('🧪 Trend Field Undefined Debug Test');
  console.log('='.repeat(50));
  
  const results = {
    undefinedTest: await testTrendUndefined(),
    nullTest: await testTrendNull(),
    validTest: await testTrendValid()
  };
  
  console.log('\n📊 TEST RESULTS:');
  console.log(`Undefined rejection: ${results.undefinedTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Null rejection: ${results.nullTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Valid acceptance: ${results.validTest ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = results.undefinedTest && results.nullTest && results.validTest;
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (!results.undefinedTest) {
    console.log('\n🔍 DIAGNOSIS: The trend field is still accepting undefined values.');
    console.log('This suggests the lifecycle hooks are not catching undefined values properly.');
  }
}

main().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});