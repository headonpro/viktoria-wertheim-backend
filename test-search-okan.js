const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function searchOkan() {
  try {
    console.log('Searching for Okan Cirakoglu...');
    
    // Search for Okan by name
    const response = await axios.get(`${API_BASE_URL}/api/spielers`, {
      params: {
        filters: {
          $or: [
            { vorname: { $containsi: 'okan' } },
            { nachname: { $containsi: 'cirakoglu' } },
            { nachname: { $containsi: 'çırakoğlu' } }
          ]
        }
      }
    });
    
    console.log('Search results:', response.data.data.length, 'players found');
    
    if (response.data.data.length > 0) {
      response.data.data.forEach(spieler => {
        console.log(`Found: ${spieler.vorname} ${spieler.nachname} - ${spieler.tore_saison} Tore`);
      });
    } else {
      console.log('No player found with name containing "Okan" or "Cirakoglu"');
    }
    
    // Also search all players to see what's available
    console.log('\nAll players with goals > 0:');
    const allResponse = await axios.get(`${API_BASE_URL}/api/spielers`, {
      params: {
        sort: ['tore_saison:desc'],
        filters: {
          tore_saison: {
            $gt: 0
          }
        }
      }
    });
    
    allResponse.data.data.forEach((spieler, index) => {
      console.log(`${index + 1}. ${spieler.vorname} ${spieler.nachname} - ${spieler.tore_saison} Tore`);
    });
    
  } catch (error) {
    console.error('Search failed:', error.response?.status, error.response?.data || error.message);
  }
}

searchOkan();