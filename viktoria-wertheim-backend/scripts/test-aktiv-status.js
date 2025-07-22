const axios = require('axios');

async function testAktivStatus() {
  console.log('🧪 Testing "aktiv" status after schema change...');
  
  const baseURL = 'http://localhost:1337';
  
  // Wait a moment for server to be ready
  console.log('⏳ Waiting for server to be ready...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test aktiv status specifically
  const testData = {
    data: {
      name: "Aktiv Test Mannschaft",
      liga: "Kreisklasse A",
      status: "aktiv",  // This was failing before
      saison: "2024/25",
      spielort: "Sportplatz Wertheim",
      altersklasse: "senioren",
      tabellenplatz: 8
    }
  };
  
  try {
    console.log('📤 Testing "aktiv" status via API...');
    const response = await axios.post(`${baseURL}/api/mannschaften`, testData);
    
    console.log('✅ SUCCESS! "aktiv" status now works!');
    console.log(`Created: ${response.data.data.attributes.name}`);
    console.log(`Status: ${response.data.data.attributes.status}`);
    
    // Clean up test data
    await axios.delete(`${baseURL}/api/mannschaften/${response.data.data.id}`);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 SOLUTION FOUND!');
    console.log('The problem was the default value in the schema.');
    console.log('Now try creating a mannschaft in the admin panel!');
    
  } catch (error) {
    console.log('❌ "aktiv" status still failing:');
    console.log('Error:', error.response?.data?.error?.message || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⏳ Server not ready yet. Please wait and try again.');
      console.log('Or run this script again after server startup is complete.');
    }
  }
}

testAktivStatus();