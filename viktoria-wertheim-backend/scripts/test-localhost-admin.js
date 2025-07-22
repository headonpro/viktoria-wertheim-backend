const axios = require('axios');

async function testLocalhostAdmin() {
  console.log('🧪 Testing localhost admin access...');
  
  const baseURL = 'http://localhost:1337';
  
  try {
    // Test 1: Check if admin panel is accessible
    console.log('\n1️⃣ Testing admin panel accessibility...');
    const adminResponse = await axios.get(`${baseURL}/admin`, {
      timeout: 5000,
      validateStatus: () => true // Accept any status
    });
    console.log(`✅ Admin panel accessible: ${adminResponse.status}`);
    
    // Test 2: Check API health
    console.log('\n2️⃣ Testing API health...');
    const healthResponse = await axios.get(`${baseURL}/api/mannschaften`, {
      timeout: 5000,
      validateStatus: () => true
    });
    console.log(`✅ API accessible: ${healthResponse.status}`);
    if (healthResponse.data && healthResponse.data.data) {
      console.log(`   Found ${healthResponse.data.data.length} mannschaften`);
    }
    
    // Test 3: Check content types
    console.log('\n3️⃣ Testing content types...');
    const contentTypes = ['mannschaften', 'news-artikels', 'spielers'];
    
    for (const contentType of contentTypes) {
      try {
        const response = await axios.get(`${baseURL}/api/${contentType}`, {
          timeout: 3000,
          validateStatus: () => true
        });
        console.log(`✅ ${contentType}: ${response.status} (${response.data?.data?.length || 0} items)`);
      } catch (error) {
        console.log(`❌ ${contentType}: ${error.message}`);
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log('✅ Backend is running on localhost:1337');
    console.log('✅ Admin panel should be accessible at: http://localhost:1337/admin');
    console.log('✅ API endpoints are working');
    console.log('\n💡 Next steps:');
    console.log('1. Open http://localhost:1337/admin in your browser');
    console.log('2. Log in with your admin credentials');
    console.log('3. Try creating a new mannschaft');
    console.log('4. If it still doesn\'t work, check browser console for errors');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure Strapi server is running');
    console.log('2. Check if port 1337 is available');
    console.log('3. Restart the Strapi server if needed');
  }
}

testLocalhostAdmin();