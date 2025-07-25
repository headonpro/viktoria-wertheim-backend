/**
 * Additional API Endpoint Testing Script
 * Tests remaining API endpoints for functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';

// Additional test configuration
const additionalTests = [
  {
    name: 'GET /api/game-cards endpoint',
    url: `${BASE_URL}/game-cards`,
    expectedFields: ['datum', 'gegner', 'ist_heimspiel', 'unsere_tore', 'gegner_tore']
  },
  {
    name: 'GET /api/next-game-cards endpoint',
    url: `${BASE_URL}/next-game-cards?populate[gegner_team]=true`,
    expectedFields: ['datum', 'gegner_team', 'ist_heimspiel']
  },
  {
    name: 'GET /api/sponsoren endpoint',
    url: `${BASE_URL}/sponsoren`,
    expectedFields: ['name', 'logo', 'website', 'kategorie', 'aktiv']
  },
  {
    name: 'GET /api/veranstaltungs endpoint',
    url: `${BASE_URL}/veranstaltungs`,
    expectedFields: ['titel', 'datum', 'beschreibung']
  }
];

async function testEndpoint(test) {
  try {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`📡 URL: ${test.url}`);
    
    const response = await axios.get(test.url);
    
    if (response.status === 200) {
      console.log(`✅ Status: ${response.status} OK`);
      
      const data = response.data;
      console.log(`📊 Response structure:`, {
        hasData: !!data.data,
        dataType: Array.isArray(data.data) ? 'array' : typeof data.data,
        itemCount: Array.isArray(data.data) ? data.data.length : 1,
        hasMeta: !!data.meta
      });
      
      // Check if we have data
      if (data.data && data.data.length > 0) {
        const firstItem = data.data[0];
        const attributes = firstItem.attributes || firstItem;
        
        console.log(`🔍 First item attributes:`, Object.keys(attributes));
        
        // Check expected fields
        const missingFields = test.expectedFields.filter(field => 
          !(field in attributes) && !(attributes[field] !== undefined)
        );
        
        if (missingFields.length === 0) {
          console.log(`✅ All expected fields present: ${test.expectedFields.join(', ')}`);
        } else {
          console.log(`⚠️  Missing fields: ${missingFields.join(', ')}`);
          console.log(`ℹ️  Available fields: ${Object.keys(attributes).join(', ')}`);
        }
        
        // Show sample data structure
        console.log(`📋 Sample data:`, JSON.stringify(attributes, null, 2).substring(0, 300) + '...');
        
      } else {
        console.log(`ℹ️  No data returned (empty collection)`);
      }
      
      return { success: true, status: response.status, data: data };
      
    } else {
      console.log(`❌ Unexpected status: ${response.status}`);
      return { success: false, status: response.status, error: 'Unexpected status' };
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`📄 Response status: ${error.response.status}`);
      console.log(`📄 Response data:`, error.response.data);
    }
    return { success: false, error: error.message };
  }
}

async function runAdditionalTests() {
  console.log('🚀 Starting Additional API Endpoint Tests');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const test of additionalTests) {
    const result = await testEndpoint(test);
    results.push({ ...test, result });
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 ADDITIONAL TESTS SUMMARY');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.result.success);
  const failed = results.filter(r => !r.result.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed tests:');
    failed.forEach(test => {
      console.log(`  - ${test.name}: ${test.result.error}`);
    });
  }
  
  if (successful.length === results.length) {
    console.log('\n🎉 All additional API endpoints are working correctly!');
  } else {
    console.log('\n⚠️  Some additional endpoints need attention.');
  }
  
  return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAdditionalTests().catch(console.error);
}

module.exports = { runAdditionalTests, testEndpoint };