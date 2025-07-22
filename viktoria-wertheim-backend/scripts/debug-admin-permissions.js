const axios = require('axios');

async function debugAdminPermissions() {
  console.log('🔐 Debugging Strapi Admin Permissions...\n');
  
  const baseUrl = 'http://localhost:1337';
  
  try {
    // 1. Test Admin Panel Access
    console.log('1. Testing Admin Panel Access...');
    const adminResponse = await axios.get(`${baseUrl}/admin`, {
      timeout: 5000,
      validateStatus: () => true
    });
    console.log(`   Admin Panel Status: ${adminResponse.status}`);
    
    // 2. Test Content Manager API
    console.log('\n2. Testing Content Manager API...');
    const contentManagerUrl = `${baseUrl}/admin/content-manager/collection-types/api::mannschaft.mannschaft`;
    const cmResponse = await axios.get(contentManagerUrl, {
      timeout: 5000,
      validateStatus: () => true,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    console.log(`   Content Manager Status: ${cmResponse.status}`);
    
    if (cmResponse.status === 401) {
      console.log('   ❌ Unauthorized - Need to login first');
    } else if (cmResponse.status === 403) {
      console.log('   ❌ Forbidden - Permission issue');
    } else if (cmResponse.status === 404) {
      console.log('   ❌ Not Found - URL or content type issue');
    }
    
    // 3. Test API Routes
    console.log('\n3. Testing API Routes...');
    const apiResponse = await axios.get(`${baseUrl}/api/mannschaften`, {
      timeout: 5000,
      validateStatus: () => true
    });
    console.log(`   API Status: ${apiResponse.status}`);
    
    // 4. Check Strapi Configuration
    console.log('\n4. Checking Strapi Configuration...');
    console.log('   Admin URL should be: http://localhost:1337/admin');
    console.log('   Content Manager should be: http://localhost:1337/admin/content-manager/...');
    
    // 5. Test with wrong URL (missing /admin)
    console.log('\n5. Testing URL without /admin (should fail)...');
    const wrongUrl = `${baseUrl}/content-manager/collection-types/api::mannschaft.mannschaft`;
    const wrongResponse = await axios.get(wrongUrl, {
      timeout: 5000,
      validateStatus: () => true
    });
    console.log(`   Wrong URL Status: ${wrongResponse.status} (should be 404)`);
    
    if (wrongResponse.status !== 404) {
      console.log('   ⚠️  WARNING: Wrong URL is working - this indicates a routing issue!');
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
  }
}

debugAdminPermissions();