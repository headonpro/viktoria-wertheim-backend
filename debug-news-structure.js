// Debug script to see the exact structure of news data
const axios = require('axios');

const API_URL = 'http://localhost:1337';

async function debugNewsStructure() {
  try {
    console.log('🔍 Debugging News API structure...');
    
    const response = await axios.get(`${API_URL}/api/news-artikels`, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    console.log('✅ API Response received');
    console.log('\n📊 Full response structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugNewsStructure();