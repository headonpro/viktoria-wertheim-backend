const axios = require('axios');

async function testAPI() {
  const baseURL = 'http://localhost:1337/api';
  
  try {
    console.log('Testing API endpoints...');
    
    // Test teams endpoint
    try {
      const teamsResponse = await axios.get(`${baseURL}/teams`);
      console.log('✓ Teams endpoint working:', teamsResponse.status);
    } catch (error) {
      console.log('✗ Teams endpoint error:', error.response?.status || error.message);
    }
    
    // Test leagues endpoint
    try {
      const ligasResponse = await axios.get(`${baseURL}/ligas`);
      console.log('✓ Ligas endpoint working:', ligasResponse.status);
    } catch (error) {
      console.log('✗ Ligas endpoint error:', error.response?.status || error.message);
    }
    
    // Test news endpoint
    try {
      const newsResponse = await axios.get(`${baseURL}/news-artikels`);
      console.log('✓ News endpoint working:', newsResponse.status);
    } catch (error) {
      console.log('✗ News endpoint error:', error.response?.status || error.message);
    }
    
    // Test saisons endpoint
    try {
      const saisonsResponse = await axios.get(`${baseURL}/saisons`);
      console.log('✓ Saisons endpoint working:', saisonsResponse.status);
    } catch (error) {
      console.log('✗ Saisons endpoint error:', error.response?.status || error.message);
    }
    
  } catch (error) {
    console.error('General API test error:', error.message);
  }
}

// Wait a bit for server to start, then test
setTimeout(testAPI, 5000);