const axios = require('axios');

async function debugAdminPanel() {
  try {
    console.log('🔍 Debugging admin panel issue...');
    
    // Test the specific problematic endpoint
    console.log('\n🔍 Testing the problematic homepage endpoint:');
    try {
      const response = await axios.get('http://localhost:1337/content-manager/homepage/count-documents');
      console.log('✅ Homepage endpoint works:', response.status);
    } catch (error) {
      console.log(`❌ Homepage endpoint error: ${error.response?.status || 'ERROR'}`);
      if (error.response?.data) {
        console.log('📋 Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Test admin panel health
    console.log('\n🔍 Testing admin panel endpoints:');
    try {
      const adminResponse = await axios.get('http://localhost:1337/admin');
      console.log('✅ Admin panel accessible:', adminResponse.status);
    } catch (error) {
      console.log(`❌ Admin panel error: ${error.response?.status || 'ERROR'}`);
    }
    
    // Test content manager
    try {
      const cmResponse = await axios.get('http://localhost:1337/content-manager');
      console.log('✅ Content manager accessible:', cmResponse.status);
    } catch (error) {
      console.log(`❌ Content manager error: ${error.response?.status || 'ERROR'}`);
    }
    
    // Test actual content types that exist
    console.log('\n📋 Testing existing content types:');
    const contentTypes = [
      'tabellen-eintrag',
      'team',
      'news-artikel',
      'game-card'
    ];
    
    for (const contentType of contentTypes) {
      try {
        const response = await axios.get(`http://localhost:1337/content-manager/${contentType}/count-documents`);
        console.log(`✅ ${contentType}: ${response.status} (count: ${response.data})`);
      } catch (error) {
        console.log(`❌ ${contentType}: ${error.response?.status || 'ERROR'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugAdminPanel();