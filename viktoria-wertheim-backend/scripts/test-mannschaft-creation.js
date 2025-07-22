const axios = require('axios');

async function testMannschaftCreation() {
  console.log('🧪 Testing mannschaft creation...');
  
  const baseURL = 'http://localhost:1337/api';
  
  // Test data with valid enum values
  const testMannschaft = {
    data: {
      name: "Test Mannschaft",
      liga: "Kreisklasse A",  // Valid enum value
      status: "aktiv",        // Valid enum value
      saison: "2024/25",
      spielort: "Sportplatz Wertheim",
      altersklasse: "senioren"
    }
  };
  
  try {
    console.log('📤 Sending POST request to create mannschaft...');
    console.log('Data:', JSON.stringify(testMannschaft, null, 2));
    
    const response = await axios.post(`${baseURL}/mannschaften`, testMannschaft, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success! Mannschaft created:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error creating mannschaft:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
      
      // Check for validation errors
      if (error.response.data.error && error.response.data.error.details) {
        console.log('\n🔍 Validation details:');
        console.log(JSON.stringify(error.response.data.error.details, null, 2));
      }
    } else {
      console.log('Network error:', error.message);
    }
  }
}

testMannschaftCreation();