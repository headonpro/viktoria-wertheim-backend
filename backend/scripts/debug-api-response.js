/**
 * Debug API response structure
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337/api';

async function debugAPIResponse() {
  console.log('🔍 Debugging API response structure...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/tabellen-eintraege`, {
      params: {
        'filters[liga][name][$eq]': 'Kreisklasse A Tauberbischofsheim',
        'sort': 'platz:asc',
        'populate': 'liga'
      }
    });

    console.log('\n📊 Response structure:');
    console.log('Response data keys:', Object.keys(response.data));
    console.log('Data array length:', response.data.data?.length);
    
    if (response.data.data && response.data.data.length > 0) {
      const firstEntry = response.data.data[0];
      console.log('\n📋 First entry structure:');
      console.log('Entry keys:', Object.keys(firstEntry));
      
      if (firstEntry.attributes) {
        console.log('Attributes keys:', Object.keys(firstEntry.attributes));
        console.log('Team name:', firstEntry.attributes.team_name);
        console.log('Platz:', firstEntry.attributes.platz);
        
        if (firstEntry.attributes.liga) {
          console.log('Liga structure:', firstEntry.attributes.liga);
        }
      }
      
      console.log('\n📋 Full first entry:');
      console.log(JSON.stringify(firstEntry, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

debugAPIResponse();