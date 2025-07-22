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
    tore_fuer: 0,
    tore_gegen: 0,
    tordifferenz: 0,
    trend: 'gleich'
  };
  
  try {
    console.log('\n1️⃣ Testing direct API creation (what scripts use)...');
    const apiResponse = await axios.post(`${baseURL}/api/mannschaften`, {
      data: testMannschaft
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000,
      validateStatus: () => true
    });
    
    console.log(`API Creation: ${apiResponse.status}`);
    if (apiResponse.status === 200 || apiResponse.status === 201) {
      console.log('✅ Direct API creation works');
      console.log(`   Created mannschaft with ID: ${apiResponse.data?.data?.id}`);
    } else {
      console.log('❌ Direct API creation failed');
      console.log(`   Error: ${apiResponse.data?.error?.message || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.log(`❌ API Creation error: ${error.message}`);
  }
  
  try {
    console.log('\n2️⃣ Testing Content Manager API (what admin panel uses)...');
    
    // This is the endpoint the admin panel actually uses
    const contentManagerResponse = await axios.post(
      `${baseURL}/admin/content-manager/collection-types/api::mannschaft.mannschaft`,
      testMannschaft,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000,
        validateStatus: () => true
      }
    );
    
    console.log(`Content Manager Creation: ${contentManagerResponse.status}`);
    
    if (contentManagerResponse.status === 401) {
      console.log('❌ Unauthorized - You need to be logged in to admin panel');
      console.log('   This is expected when testing from script');
    } else if (contentManagerResponse.status === 403) {
      console.log('❌ Forbidden - Admin user lacks permissions');
    } else if (contentManagerResponse.status === 200 || contentManagerResponse.status === 201) {
      console.log('✅ Content Manager creation works');
    } else {
      console.log(`❌ Content Manager creation failed: ${contentManagerResponse.status}`);
      if (contentManagerResponse.data) {
        console.log(`   Response: ${JSON.stringify(contentManagerResponse.data, null, 2)}`);
      }
    }
    
  } catch (error) {
    console.log(`❌ Content Manager error: ${error.message}`);
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
  
  console.log('');
  console.log('Next step: Try creating mannschaft in admin panel at:');
  console.log('http://localhost:1337/admin');
}

testAdminCreation();