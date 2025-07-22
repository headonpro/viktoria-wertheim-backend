const axios = require('axios');

async function simpleAktivTest() {
  console.log('🧪 Simple test for "aktiv" status...');
  
  const baseURL = 'http://localhost:1337';
  
  const testData = {
    data: {
      name: "Simple Aktiv Test",
      liga: "Kreisklasse A",
      status: "aktiv",
      saison: "2024/25"
    }
  };
  
  try {
    console.log('📤 Sending POST request...');
    console.log('Data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(`${baseURL}/api/mannschaften`, testData);
    
    console.log('✅ SUCCESS!');
    console.log('Response status:', response.status);
    console.log('Created mannschaft:', response.data.data.attributes.name);
    console.log('Status value:', response.data.data.attributes.status);
    
    return response.data.data.id;
    
  } catch (error) {
    console.log('❌ FAILED!');
    console.log('Error status:', error.response?.status);
    console.log('Error message:', error.response?.data?.error?.message || error.message);
    
    if (error.response?.data?.error?.details) {
      console.log('Validation details:', JSON.stringify(error.response.data.error.details, null, 2));
    }
    
    return null;
  }
}

// Test both aktiv and inaktiv
async function runTests() {
  console.log('🔍 Testing both status values...\n');
  
  // Test 1: aktiv
  console.log('1️⃣ Testing "aktiv"...');
  const aktivId = await simpleAktivTest();
  
  // Test 2: inaktiv
  console.log('\n2️⃣ Testing "inaktiv"...');
  const inaktivData = {
    data: {
      name: "Simple Inaktiv Test",
      liga: "Kreisklasse A", 
      status: "inaktiv",
      saison: "2024/25"
    }
  };
  
  try {
    const inaktivResponse = await axios.post('http://localhost:1337/api/mannschaften', inaktivData);
    console.log('✅ "inaktiv" works');
    console.log('Status value:', inaktivResponse.data.data.attributes.status);
    
    // Clean up
    await axios.delete(`http://localhost:1337/api/mannschaften/${inaktivResponse.data.data.id}`);
    
  } catch (error) {
    console.log('❌ "inaktiv" failed:', error.response?.data?.error?.message || error.message);
  }
  
  // Clean up aktiv test if it worked
  if (aktivId) {
    try {
      await axios.delete(`http://localhost:1337/api/mannschaften/${aktivId}`);
      console.log('✅ Cleaned up "aktiv" test data');
    } catch (error) {
      console.log('⚠️  Could not clean up "aktiv" test data');
    }
  }
  
  console.log('\n🎯 Summary:');
  if (aktivId) {
    console.log('✅ "aktiv" status works via API');
    console.log('❓ If admin panel still fails, it\'s a UI/session issue');
  } else {
    console.log('❌ "aktiv" status still broken');
    console.log('🔧 Need to investigate schema/validation further');
  }
}

runTests();