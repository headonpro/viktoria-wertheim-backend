/**
 * API Endpoint Testing Script
 * Tests all simplified API endpoints for functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';

// Test configuration
const tests = [
  {
    name: 'GET /api/teams endpoint with population',
    url: `${BASE_URL}/teams?populate[liga]=true&populate[saison]=true`,
    expectedFields: ['name', 'liga', 'saison', 'trainer', 'punkte']
  },
  {
    name: 'GET /api/ligas endpoint with team relations',
    url: `${BASE_URL}/ligas?populate[teams]=true`,
    expectedFields: ['name', 'kurz_name', 'teams']
  },
  {
    name: 'GET /api/saisons endpoint with active season filtering',
    url: `${BASE_URL}/saisons?filters[aktiv][$eq]=true`,
    expectedFields: ['name', 'start_datum', 'end_datum', 'aktiv']
  },
  {
    name: 'GET /api/news-artikels endpoint with basic sorting',
    url: `${BASE_URL}/news-artikels?sort=datum:desc`,
    expectedFields: ['titel', 'inhalt', 'datum', 'autor']
  },
  {
    name: 'GET /api/tabellen-eintraege endpoint',
    url: `${BASE_URL}/tabellen-eintraege?populate[liga]=true&populate[team]=true`,
    expectedFields: ['platz', 'punkte', 'spiele', 'liga', 'team']
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

async function runAllTests() {
  console.log('🚀 Starting API Endpoint Verification Tests');
  console.log('=' .repeat(60));
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test);
    results.push({ ...test, result });
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY');
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
    console.log('\n🎉 All API endpoints are working correctly!');
  } else {
    console.log('\n⚠️  Some endpoints need attention.');
  }
  
  return results;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests, testEndpoint };