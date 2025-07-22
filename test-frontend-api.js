// Quick test to check if frontend can reach backend API
const axios = require('axios');

const API_URL = 'http://localhost:1337';

async function testNewsAPI() {
  try {
    console.log('🔍 Testing News API...');
    console.log(`URL: ${API_URL}/api/news-artikels`);
    
    const response = await axios.get(`${API_URL}/api/news-artikels`, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ Success!');
    console.log(`Status: ${response.status}`);
    console.log(`News count: ${response.data?.data?.length || 0}`);
    
    if (response.data?.data?.length > 0) {
      console.log('\n📰 Sample news article:');
      const sample = response.data.data[0];
      console.log(`- ID: ${sample.id}`);
      console.log(`- Title: ${sample.attributes?.titel || 'No title'}`);
      console.log(`- Created: ${sample.attributes?.createdAt || 'No date'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
  }
}

testNewsAPI();