const axios = require('axios');

async function checkServerPorts() {
  console.log('🔍 Checking which IP/Port the server is actually running on...');
  
  const testUrls = [
    'http://localhost:1337',
    'http://127.0.0.1:1337',
    'http://192.168.178.59:1337'
  ];
  
  for (const url of testUrls) {
    try {
      console.log(`\n🧪 Testing: ${url}`);
      const response = await axios.get(`${url}/api/mannschaften`, {
        timeout: 3000,
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        console.log(`✅ SUCCESS! Server is running on: ${url}`);
        console.log(`   API returned ${response.data?.data?.length || 0} mannschaften`);
        
        // Test admin panel
        try {
          const adminResponse = await axios.get(`${url}/admin`, {
            timeout: 3000,
            validateStatus: () => true
          });
          console.log(`✅ Admin panel accessible: ${url}/admin (Status: ${adminResponse.status})`);
        } catch (adminError) {
          console.log(`❌ Admin panel not accessible: ${adminError.message}`);
        }
        
      } else {
        console.log(`❌ Server responded with status: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`❌ Not accessible: ${error.message}`);
    }
  }
  
  console.log('\n🎯 Summary:');
  console.log('If server is running on 192.168.178.59:1337 but not localhost:1337,');
  console.log('you need to restart the Strapi server for the new configuration to take effect.');
  console.log('\nAfter restart, both URLs should work:');
  console.log('- http://localhost:1337/admin');
  console.log('- http://192.168.178.59:1337/admin');
}

checkServerPorts();