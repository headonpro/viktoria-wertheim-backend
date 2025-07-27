const axios = require('axios');

async function testAPI() {
  const baseURL = 'http://localhost:1337/api';
  
  try {
    console.log('Testing API endpoints...\n');
    
    // Test 1: Check if liga entries exist
    console.log('1. Testing liga endpoint...');
    const ligaResponse = await axios.get(`${baseURL}/ligas`);
    console.log(`Found ${ligaResponse.data.data.length} liga entries:`);
    ligaResponse.data.data.forEach(liga => {
      console.log(`  - ${liga.name} (ID: ${liga.id})`);
    });
    
    // Test 2: Check tabellen-eintraege with liga population
    console.log('\n2. Testing tabellen-eintraege with liga population...');
    const tabellenResponse = await axios.get(`${baseURL}/tabellen-eintraege?populate=liga`);
    console.log(`Found ${tabellenResponse.data.data.length} tabellen entries`);
    
    // Test 3: Test the specific filter that's failing
    console.log('\n3. Testing specific liga filter (Kreisliga Tauberbischofsheim)...');
    const filterResponse = await axios.get(`${baseURL}/tabellen-eintraege`, {
      params: {
        'filters[liga][name][$eq]': 'Kreisliga Tauberbischofsheim',
        populate: 'liga,team_logo',
        sort: 'platz:asc',
        'pagination[pageSize]': 100
      }
    });
    console.log(`Found ${filterResponse.data.data.length} entries for Kreisliga Tauberbischofsheim`);
    
    // Test 4: Test the optimized endpoint that doesn't exist
    console.log('\n4. Testing optimized endpoint (should fail)...');
    try {
      const optimizedResponse = await axios.get(`${baseURL}/tabellen-eintraege/liga/Kreisliga%20Tauberbischofsheim`);
      console.log('Optimized endpoint worked!');
    } catch (error) {
      console.log(`Optimized endpoint failed as expected: ${error.response?.status} ${error.response?.statusText}`);
    }
    
  } catch (error) {
    console.error('API Test Error:', error.response?.status, error.response?.statusText);
    console.error('Error details:', error.response?.data);
  }
}

testAPI();