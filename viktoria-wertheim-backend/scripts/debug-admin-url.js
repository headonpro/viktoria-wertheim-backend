const axios = require('axios');

async function debugAdminUrls() {
  console.log('🔍 Debugging Strapi Admin URL Configuration...\n');
  
  const baseUrl = 'http://localhost:1337';
  
  // Test different URL patterns
  const urlsToTest = [
    `${baseUrl}/admin`,
    `${baseUrl}/admin/`,
    `${baseUrl}/content-manager`,
    `${baseUrl}/admin/content-manager`,
    `${baseUrl}/_health`,
    `${baseUrl}/api/mannschaften`
  ];
  
  for (const url of urlsToTest) {
    try {
      console.log(`Testing: ${url}`);
      const response = await axios.get(url, { 
        timeout: 5000,
        validateStatus: () => true // Don't throw on 4xx/5xx
      });
      console.log(`✅ Status: ${response.status} - ${response.statusText}`);
      
      if (response.headers['content-type']?.includes('text/html')) {
        console.log('📄 Returns HTML (likely admin panel)');
      } else if (response.headers['content-type']?.includes('application/json')) {
        console.log('📊 Returns JSON');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log('---');
  }
  
  // Check if server is running on expected port
  console.log('\n🔧 Server Configuration Check:');
  try {
    const healthCheck = await axios.get(`${baseUrl}/_health`, { timeout: 3000 });
    console.log('✅ Strapi server is responding');
  } catch (error) {
    console.log('❌ Strapi server might not be running on port 1337');
    console.log('   Try: npm run develop in viktoria-wertheim-backend/');
  }
}

debugAdminUrls().catch(console.error);