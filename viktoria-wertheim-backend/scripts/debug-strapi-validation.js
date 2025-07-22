const axios = require('axios');

async function debugStrapiValidation() {
  console.log('🔍 Debugging Strapi validation issue...');
  
  const baseURL = 'http://localhost:1337';
  
  // Test 1: Check what the API expects
  console.log('\n1️⃣ Testing API with different status values...');
  
  const statusValues = ['aktiv', 'inaktiv', 'aufgeloest', 'active', 'inactive'];
  
  for (const status of statusValues) {
    try {
      const testData = {
        data: {
          name: `Test ${status}`,
          liga: "Kreisklasse A",
          status: status,
          saison: "2024/25",
          spielort: "Sportplatz Wertheim",
          altersklasse: "senioren"
        }
      };
      
      const response = await axios.post(`${baseURL}/api/mannschaften`, testData);
      console.log(`✅ Status "${status}" accepted`);
      
      // Clean up
      await axios.delete(`${baseURL}/api/mannschaften/${response.data.data.id}`);
      
    } catch (error) {
      console.log(`❌ Status "${status}" rejected:`, error.response?.data?.error?.message || error.message);
    }
  }
  
  // Test 2: Check liga values
  console.log('\n2️⃣ Testing API with different liga values...');
  
  const ligaValues = ['Kreisklasse A', 'Kreisklasse B', 'Kreisliga', 'Landesliga'];
  
  for (const liga of ligaValues) {
    try {
      const testData = {
        data: {
          name: `Test ${liga}`,
          liga: liga,
          status: "aktiv",
          saison: "2024/25",
          spielort: "Sportplatz Wertheim",
          altersklasse: "senioren"
        }
      };
      
      const response = await axios.post(`${baseURL}/api/mannschaften`, testData);
      console.log(`✅ Liga "${liga}" accepted`);
      
      // Clean up
      await axios.delete(`${baseURL}/api/mannschaften/${response.data.data.id}`);
      
    } catch (error) {
      console.log(`❌ Liga "${liga}" rejected:`, error.response?.data?.error?.message || error.message);
    }
  }
  
  // Test 3: Check minimal data
  console.log('\n3️⃣ Testing with minimal required data...');
  
  try {
    const minimalData = {
      data: {
        name: "Minimal Test"
      }
    };
    
    const response = await axios.post(`${baseURL}/api/mannschaften`, minimalData);
    console.log('✅ Minimal data accepted');
    console.log('Default values:', JSON.stringify(response.data.data.attributes, null, 2));
    
    // Clean up
    await axios.delete(`${baseURL}/api/mannschaften/${response.data.data.id}`);
    
  } catch (error) {
    console.log('❌ Minimal data rejected:', error.response?.data?.error?.message || error.message);
    if (error.response?.data?.error?.details) {
      console.log('Validation details:', JSON.stringify(error.response.data.error.details, null, 2));
    }
  }
  
  console.log('\n🎯 Diagnosis:');
  console.log('If all enum values are accepted via API, the problem is in admin panel validation');
  console.log('If some values are rejected, there\'s a schema mismatch');
}

debugStrapiValidation();