const axios = require('axios');

async function testAdminCreation() {
  console.log('🧪 Testing mannschaft creation via Content Manager API...');
  
  const baseURL = 'http://localhost:1337';
  
  // Test data - exactly what admin panel would send
  const testMannschaft = {
    name: `Test Mannschaft ${Date.now()}`,
    liga: 'Kreisklasse A',
    status: 'aktiv',
    altersklasse: 'senioren',
    saison: '2024/25',
    spielort: 'Sportplatz Wertheim',
    tabellenplatz: 1,
    punkte: 0,
    spiele_gesamt: 0,
    siege: 0,
    unentschieden: 0,
    niederlagen: 0,
    tore_geschossen: 0,
    tore_erhalten: 0,
    tordifferenz: 0
  };

  try {
    console.log('\n1️⃣ Testing direct API creation (what scripts use)...');
    const apiResponse = await axios.post(`${baseURL}/api/mannschaften`, {
      data: testMannschaft
    });
    console.log(`API Creation: ${apiResponse.status}`);
    console.log('✅ Direct API creation works');
    console.log(`   Created mannschaft with ID: ${apiResponse.data.data.id}`);
  } catch (error) {
    console.log(`❌ API Creation failed: ${error.response?.status || error.message}`);
    if (error.response?.data) {
      console.log('   Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }

  try {
    console.log('\n2️⃣ Testing Content Manager API (what admin panel uses)...');
    const adminResponse = await axios.put(
      `${baseURL}/admin/content-manager/collection-types/api::mannschaft.mannschaft`,
      testMannschaft
    );
    console.log(`Content Manager Creation: ${adminResponse.status}`);
    console.log('✅ Content Manager creation works');
  } catch (error) {
    console.log(`Content Manager Creation: ${error.response?.status || 'ERROR'}`);
    console.log(`❌ Content Manager creation failed: ${error.response?.status || error.message}`);
    console.log(`   Response: "${error.response?.data || error.message}"`);
  }

  console.log('\n🎯 Analysis:');
  console.log('If API creation works but admin panel doesn\'t:');
  console.log('1. The problem is with admin authentication/sessions');
  console.log('2. Try these steps in your browser:');
  console.log('   a) Open browser developer tools (F12)');
  console.log('   b) Go to admin panel and try to create a mannschaft');
  console.log('   c) Check Console tab for JavaScript errors');
  console.log('   d) Check Network tab for failed HTTP requests');
  console.log('   e) Look for 401/403 errors or CORS issues');
  
  console.log('\n🔧 Quick fixes to try:');
  console.log('1. Clear browser cache and cookies');
  console.log('2. Log out and log back in to admin panel');
  console.log('3. Try in incognito/private browser window');
  console.log('4. Check if browser is blocking cookies');
  
  console.log(`\nNext step: Try creating mannschaft in admin panel at:`);
  console.log(`${baseURL}/admin`);
}

testAdminCreation().catch(console.error);