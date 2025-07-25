/**
 * Test script for error handling functionality
 * 
 * This script tests various error scenarios to ensure proper error handling
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';

async function testErrorHandling() {
  console.log('🧪 Testing Error Handling...\n');

  const tests = [
    {
      name: 'Test missing ligaId parameter',
      request: () => axios.get(`${BASE_URL}/teams/by-league`),
      expectedStatus: 400
    },
    {
      name: 'Test invalid ligaId parameter',
      request: () => axios.get(`${BASE_URL}/teams/by-league?ligaId=invalid`),
      expectedStatus: 400
    },
    {
      name: 'Test negative ligaId parameter',
      request: () => axios.get(`${BASE_URL}/teams/by-league?ligaId=-1`),
      expectedStatus: 400
    },
    {
      name: 'Test non-existent ligaId',
      request: () => axios.get(`${BASE_URL}/teams/by-league?ligaId=99999`),
      expectedStatus: 400
    },
    {
      name: 'Test non-existent team ID',
      request: () => axios.get(`${BASE_URL}/teams/99999`),
      expectedStatus: 404
    },
    {
      name: 'Test invalid team ID',
      request: () => axios.get(`${BASE_URL}/teams/invalid`),
      expectedStatus: 400
    },
    {
      name: 'Test create team without required fields',
      request: () => axios.post(`${BASE_URL}/teams`, {
        data: {
          // Missing required fields: name, liga, saison
        }
      }),
      expectedStatus: 400
    },
    {
      name: 'Test create team with empty name',
      request: () => axios.post(`${BASE_URL}/teams`, {
        data: {
          name: '',
          liga: 1,
          saison: 1
        }
      }),
      expectedStatus: 400
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`📋 ${test.name}`);
      
      const response = await test.request();
      
      // If we get here, the request didn't fail as expected
      console.log(`❌ Expected error ${test.expectedStatus}, but got ${response.status}`);
      console.log(`   Response:`, response.data);
      failed++;
      
    } catch (error) {
      if (error.response) {
        const { status, data } = error.response;
        
        if (status === test.expectedStatus) {
          console.log(`✅ Correctly returned ${status}`);
          
          // Check if error response has proper structure
          if (data.error && data.error.status && data.error.message) {
            console.log(`   ✅ Proper error structure`);
            console.log(`   📝 Message: ${data.error.message}`);
            if (data.error.code) {
              console.log(`   🏷️  Code: ${data.error.code}`);
            }
          } else {
            console.log(`   ⚠️  Error structure could be improved`);
            console.log(`   📝 Response:`, JSON.stringify(data, null, 2));
          }
          
          passed++;
        } else {
          console.log(`❌ Expected ${test.expectedStatus}, got ${status}`);
          console.log(`   Response:`, data);
          failed++;
        }
      } else {
        console.log(`❌ Network error:`, error.message);
        failed++;
      }
    }
    
    console.log(''); // Empty line for readability
  }

  // Test successful requests to ensure they still work
  console.log('🧪 Testing Successful Requests...\n');
  
  try {
    console.log('📋 Test successful teams fetch');
    const teamsResponse = await axios.get(`${BASE_URL}/teams`);
    console.log(`✅ Successfully fetched ${teamsResponse.data.data?.length || 0} teams`);
    passed++;
  } catch (error) {
    console.log(`❌ Failed to fetch teams:`, error.response?.data || error.message);
    failed++;
  }

  console.log('');
  
  try {
    console.log('📋 Test successful leagues fetch');
    const ligasResponse = await axios.get(`${BASE_URL}/ligas`);
    console.log(`✅ Successfully fetched ${ligasResponse.data.data?.length || 0} leagues`);
    passed++;
  } catch (error) {
    console.log(`❌ Failed to fetch leagues:`, error.response?.data || error.message);
    failed++;
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All error handling tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the error handling implementation.');
  }
}

// Run the tests
testErrorHandling().catch(error => {
  console.error('❌ Test runner error:', error.message);
  process.exit(1);
});