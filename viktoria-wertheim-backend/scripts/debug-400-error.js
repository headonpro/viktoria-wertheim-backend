const axios = require('axios');

async function debug400Error() {
  console.log('🔍 Debugging 400 Bad Request Error...');
  
  const baseURL = 'http://localhost:1337';
  
  // Test 1: Check what the admin panel is trying to send
  console.log('\n1️⃣ Testing Content Manager PUT request...');
  
  const testData = {
    name: 'Test Mannschaft Debug',
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
  
  // Test the exact URL structure the admin panel uses
  const testId = 'test123';
  const contentManagerUrl = `${baseURL}/content-manager/collection-types/api::mannschaft.mannschaft/${testId}`;
  
  try {
    const response = await axios.put(contentManagerUrl, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000,
      validateStatus: () => true
    });
    
    console.log(`PUT Response: ${response.status}`);
    
    if (response.status === 400) {
      console.log('❌ 400 Bad Request - Invalid data or URL structure');
      if (response.data) {
        console.log('Error details:', JSON.stringify(response.data, null, 2));
      }
    } else if (response.status === 404) {
      console.log('❌ 404 Not Found - URL structure might be wrong');
    } else if (response.status === 401) {
      console.log('❌ 401 Unauthorized - Authentication required');
    }
    
  } catch (error) {
    console.log(`❌ PUT Error: ${error.message}`);
  }
  
  // Test 2: Check the correct admin API structure
  console.log('\n2️⃣ Testing correct admin API structure...');
  
  try {
    // First, let's see what content types are available
    const contentTypesResponse = await axios.get(`${baseURL}/admin/content-manager/collection-types`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    console.log(`Content Types Response: ${contentTypesResponse.status}`);
    
    if (contentTypesResponse.status === 200) {
      const contentTypes = contentTypesResponse.data;
      console.log('Available content types:');
      
      // Look for mannschaft
      const mannschaftKey = Object.keys(contentTypes).find(key => 
        key.includes('mannschaft') || key.includes('api::mannschaft')
      );
      
      if (mannschaftKey) {
        console.log(`✅ Found mannschaft content type: ${mannschaftKey}`);
        
        // Check the schema
        const schema = contentTypes[mannschaftKey];
        if (schema && schema.attributes) {
          console.log('Required fields:');
          Object.keys(schema.attributes).forEach(field => {
            const attr = schema.attributes[field];
            if (attr.required) {
              console.log(`  - ${field} (${attr.type})`);
            }
          });
        }
      } else {
        console.log('❌ Mannschaft content type not found');
      }
    }
    
  } catch (error) {
    console.log(`❌ Content Types Error: ${error.message}`);
  }
  
  // Test 3: Check if the issue is with the URL structure
  console.log('\n3️⃣ Testing different URL structures...');
  
  const urlVariations = [
    `${baseURL}/admin/content-manager/collection-types/api::mannschaft.mannschaft`,
    `${baseURL}/content-manager/collection-types/api::mannschaft.mannschaft`,
    `${baseURL}/admin/api/mannschaften`
  ];
  
  for (const url of urlVariations) {
    try {
      const response = await axios.get(url, {
        timeout: 3000,
        validateStatus: () => true
      });
      
      console.log(`${url}: ${response.status}`);
      
      if (response.status === 200) {
        console.log('  ✅ This URL structure works');
      }
      
    } catch (error) {
      console.log(`${url}: Error - ${error.message}`);
    }
  }
  
  console.log('\n🎯 Analysis:');
  console.log('The 400 Bad Request error suggests:');
  console.log('1. Invalid data format being sent');
  console.log('2. Missing required fields');
  console.log('3. Wrong URL structure');
  console.log('4. Enum validation failing');
  
  console.log('\n🔧 Potential fixes:');
  console.log('1. Check if all enum values are exactly correct');
  console.log('2. Verify required fields are present');
  console.log('3. Check if the admin panel URL structure changed');
  console.log('4. Clear browser cache and try again');
}

debug400Error();