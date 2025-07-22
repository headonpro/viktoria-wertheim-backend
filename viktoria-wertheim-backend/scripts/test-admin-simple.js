const axios = require('axios');

async function testAdminSimple() {
  console.log('🧪 Simple Admin Panel Test...');
  
  const baseURL = 'http://localhost:1337';
  
  try {
    console.log('\n1️⃣ Testing admin panel accessibility...');
    const adminResponse = await axios.get(`${baseURL}/admin`);
    console.log(`✅ Admin panel accessible: ${adminResponse.status}`);
  } catch (error) {
    console.log(`❌ Admin panel not accessible: ${error.message}`);
  }

  try {
    console.log('\n2️⃣ Testing API endpoint...');
    const apiResponse = await axios.get(`${baseURL}/api/mannschaften`);
    console.log(`✅ API accessible: ${apiResponse.status} (${apiResponse.data.data.length} mannschaften)`);
  } catch (error) {
    console.log(`❌ API not accessible: ${error.message}`);
  }

  try {
    console.log('\n3️⃣ Testing direct mannschaft creation...');
    const createResponse = await axios.post(`${baseURL}/api/mannschaften`, {
      data: {
        name: `Test Simple ${Date.now()}`,
        liga: 'Kreisklasse A',
        status: 'aktiv',
        altersklasse: 'senioren',
        saison: '2024/25',
        spielort: 'Sportplatz Wertheim'
      }
    });
    console.log(`✅ Direct creation works: ${createResponse.status} (ID: ${createResponse.data.data.id})`);
  } catch (error) {
    console.log(`❌ Direct creation failed: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      console.log('   Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }

  console.log('\n🎯 Summary:');
  console.log('If API works but admin panel authentication fails:');
  console.log('1. The problem is with admin session management');
  console.log('2. Try opening browser and go to: http://localhost:1337/admin');
  console.log('3. Log out completely and log back in');
  console.log('4. Try creating a mannschaft manually in the admin panel');
  console.log('5. Check browser developer tools for JavaScript errors');
}

testAdminSimple().catch(console.error);