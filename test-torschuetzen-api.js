const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function testTorschuetzenAPI() {
  try {
    console.log('Testing Torschützen API...');
    
    // Test basic API call
    const response = await axios.get(`${API_BASE_URL}/api/spielers`, {
      params: {
        sort: ['tore_saison:desc'],
        filters: {
          tore_saison: {
            $gt: 0
          }
        },
        pagination: {
          limit: 10
        }
      }
    });
    
    console.log('API Response Status:', response.status);
    console.log('Number of players:', response.data.data.length);
    
    if (response.data.data.length > 0) {
      console.log('Top 5 Torschützen:');
      response.data.data.slice(0, 5).forEach((spieler, index) => {
        console.log(`${index + 1}. ${spieler.vorname || 'Unbekannt'} ${spieler.nachname || ''} - ${spieler.tore_saison} Tore (${spieler.spiele_saison} Spiele)`);
      });
      
      console.log('\nFirst entry details:', JSON.stringify(response.data.data[0], null, 2));
    }
    
  } catch (error) {
    console.error('API Test failed:', error.response?.status, error.response?.data || error.message);
  }
}

testTorschuetzenAPI();