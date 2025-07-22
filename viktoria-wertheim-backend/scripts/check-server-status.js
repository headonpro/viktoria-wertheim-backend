const axios = require('axios');

async function checkServerStatus() {
  console.log('🔍 Checking Strapi server status...');
  
  const ports = [1337, 3000, 3001, 8080];
  const hosts = ['192.168.178.59', 'localhost', '127.0.0.1'];
  
  for (const host of hosts) {
    for (const port of ports) {
      try {
        console.log(`\n🔗 Testing ${host}:${port}...`);
        
        const response = await axios.get(`http://${host}:${port}`, {
          timeout: 2000
        });
        
        console.log(`✅ Server found at ${host}:${port}`);
        console.log(`Status: ${response.status}`);
        
        // Test admin endpoint
        try {
          const adminResponse = await axios.get(`http://${host}:${port}/admin`, {
            timeout: 2000
          });
          console.log(`✅ Admin panel accessible at ${host}:${port}/admin`);
        } catch (adminError) {
          console.log(`❌ Admin panel not accessible: ${adminError.message}`);
        }
        
        // Test API endpoint
        try {
          const apiResponse = await axios.get(`http://${host}:${port}/api/mannschaften`, {
            timeout: 2000
          });
          console.log(`✅ API accessible at ${host}:${port}/api/mannschaften`);
          console.log(`Mannschaften count: ${apiResponse.data.data.length}`);
        } catch (apiError) {
          console.log(`❌ API not accessible: ${apiError.message}`);
        }
        
      } catch (error) {
        console.log(`❌ No server at ${host}:${port}`);
      }
    }
  }
  
  console.log('\n🎯 Next steps:');
  console.log('1. If no server found, start Strapi with: npm run develop');
  console.log('2. If server found on different port, update your browser URL');
  console.log('3. If admin panel not accessible, check CORS configuration');
}

checkServerStatus();