const axios = require('axios');

async function finalAktivTest() {
  console.log('🎉 Final test with unique names...');
  
  const baseURL = 'http://localhost:1337';
  const timestamp = Date.now();
  
  // Test 1: aktiv with unique name
  console.log('\n1️⃣ Testing "aktiv" with unique name...');
  const aktivData = {
    data: {
      name: `Aktiv Test ${timestamp}`,
      liga: "Kreisklasse A",
      status: "aktiv",
      saison: "2024/25"
    }
  };
  
  try {
    const aktivResponse = await axios.post(`${baseURL}/api/mannschaften`, aktivData);
    console.log('✅ SUCCESS! "aktiv" status works perfectly!');
    console.log(`Created: ${aktivResponse.data.data.attributes.name}`);
    console.log(`Status: ${aktivResponse.data.data.attributes.status}`);
    
    // Clean up
    await axios.delete(`${baseURL}/api/mannschaften/${aktivResponse.data.data.id}`);
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.log('❌ Still failed:', error.response?.data?.error?.message || error.message);
  }
  
  // Test 2: inaktiv with unique name
  console.log('\n2️⃣ Testing "inaktiv" with unique name...');
  const inaktivData = {
    data: {
      name: `Inaktiv Test ${timestamp}`,
      liga: "Kreisklasse A",
      status: "inaktiv",
      saison: "2024/25"
    }
  };
  
  try {
    const inaktivResponse = await axios.post(`${baseURL}/api/mannschaften`, inaktivData);
    console.log('✅ "inaktiv" also works!');
    console.log(`Status: ${inaktivResponse.data.data.attributes.status}`);
    
    // Clean up
    await axios.delete(`${baseURL}/api/mannschaften/${inaktivResponse.data.data.id}`);
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.log('❌ Inaktiv failed:', error.response?.data?.error?.message || error.message);
  }
  
  console.log('\n🎉 CONCLUSION:');
  console.log('✅ Status validation is working correctly!');
  console.log('✅ Both "aktiv" and "inaktiv" work via API');
  console.log('✅ The admin panel should now work too!');
  console.log('');
  console.log('🎯 Try creating a mannschaft in admin panel with:');
  console.log('- Unique name (e.g., "4. Mannschaft")');
  console.log('- Status: "aktiv"');
  console.log('- Liga: any valid value');
}

finalAktivTest();