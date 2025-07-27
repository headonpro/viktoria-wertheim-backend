/**
 * Simple Functionality Test
 * Basic verification that pages load and key elements are present
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3001';
const pages = ['news', 'teams', 'shop', 'kontakt'];

function testPageLoad(pagePath) {
  return new Promise((resolve) => {
    const url = `${BASE_URL}/${pagePath}`;
    
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          page: pagePath,
          status: res.statusCode,
          success: res.statusCode === 200,
          hasContent: data.length > 1000,
          hasTitle: data.includes('<title>'),
          hasViktoria: data.includes('Viktoria') || data.includes('viktoria'),
          contentLength: data.length
        };
        
        console.log(`✅ ${pagePath}: Status ${result.status}, Content: ${result.contentLength} bytes`);
        resolve(result);
      });
    }).on('error', (err) => {
      console.log(`❌ ${pagePath}: Error - ${err.message}`);
      resolve({
        page: pagePath,
        status: 0,
        success: false,
        error: err.message
      });
    });
  });
}

async function runBasicTests() {
  console.log('🚀 Running Basic Functionality Tests...');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('='.repeat(50));
  
  const results = [];
  
  for (const page of pages) {
    const result = await testPageLoad(page);
    results.push(result);
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 Test Summary:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`Pages tested: ${total}`);
  console.log(`Successful loads: ${successful}`);
  console.log(`Failed loads: ${total - successful}`);
  console.log(`Success rate: ${((successful / total) * 100).toFixed(1)}%`);
  
  if (successful === total) {
    console.log('\n✅ All pages loaded successfully!');
    console.log('🎯 Basic functionality test PASSED');
  } else {
    console.log('\n❌ Some pages failed to load');
    console.log('🎯 Basic functionality test FAILED');
  }
  
  return results;
}

// Run tests
if (require.main === module) {
  runBasicTests().catch(console.error);
}

module.exports = { runBasicTests, testPageLoad };