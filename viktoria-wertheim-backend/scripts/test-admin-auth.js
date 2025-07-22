const axios = require('axios');

async function testAdminAuth() {
  console.log('🔐 Testing Admin Authentication...');
  
  const baseURL = 'http://localhost:1337';
  
  // Test admin login endpoint
  console.log('\n1️⃣ Testing admin login endpoint...');
  
  try {
    // Check if we can access admin login page
    const loginPageResponse = await axios.get(`${baseURL}/admin/auth/login`);
    console.log('✅ Admin login page accessible');
    
    // Try to get admin users (this should fail without auth)
    try {
      const usersResponse = await axios.get(`${baseURL}/admin/users`);
      console.log('⚠️  Admin users accessible without auth - security issue!');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Admin users properly protected (401 Unauthorized)');
      } else {
        console.log('❌ Unexpected error:', error.response?.status, error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Admin login page error:', error.message);
  }
  
  console.log('\n📋 Diagnosis:');
  console.log('- REST API (/api/mannschaften) works ✅');
  console.log('- Admin Panel Content Manager requires authentication ❌');
  console.log('');
  console.log('🔧 Solution:');
  console.log('1. Go to http://localhost:1337/admin');
  console.log('2. Log out completely');
  console.log('3. Log back in');
  console.log('4. Try creating mannschaft again');
  console.log('');
  console.log('If that doesn\'t work, the issue might be:');
  console.log('- Session cookies not being set properly');
  console.log('- CORS issues with admin panel');
  console.log('- Admin user permissions');
}

testAdminAuth();