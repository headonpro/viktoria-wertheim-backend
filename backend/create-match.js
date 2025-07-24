/**
 * Script to create the specific match: SV Viktoria Wertheim 7-0 FSV Tauberhöhe 2
 */

const axios = require('axios');

const API_BASE = 'http://localhost:1337/api';
const API_TOKEN = '89dd3bb33f0e95a2e33d22ba710a6ccf7ff1c0332e527296c1f92cd27a92e0e8';

// Configure axios with token
axios.defaults.headers.common['Authorization'] = `Bearer ${API_TOKEN}`;

async function createMatch() {
  console.log('⚽ Creating match: SV Viktoria Wertheim 7-0 FSV Tauberhöhe 2');
  
  try {
    const matchData = {
      datum: '2025-07-20T15:00:00.000Z',
      heimclub: 1, // SV Viktoria Wertheim
      auswaertsclub: 17, // FSV Tauberhöhe 2
      unser_team: 1, // 1. Mannschaft
      liga: 2, // Kreisklasse A Tauberbischofsheim
      saison: 2, // Saison 25/26
      ist_heimspiel: true,
      status: 'beendet',
      tore_heim: 7,
      tore_auswaerts: 0,
      spielort: 'Sportplatz Wertheim',
      spieltag: 18,
      zuschauer: 120,
      spielbericht: 'Überragender Auftritt der 1. Mannschaft mit einem deutlichen 7:0 Sieg gegen FSV Tauberhöhe 2. Das Team zeigte von Beginn an eine starke Leistung und dominierte das Spiel über die gesamte Spielzeit.'
    };
    
    console.log('📤 Sending match data...');
    const response = await axios.post(`${API_BASE}/spiels`, { data: matchData });
    
    console.log('✅ Match created successfully!');
    console.log('📋 Match details:');
    console.log(`- ID: ${response.data.data.id}`);
    console.log(`- Date: ${matchData.datum}`);
    console.log(`- Score: ${matchData.tore_heim}-${matchData.tore_auswaerts}`);
    console.log(`- Status: ${matchData.status}`);
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ Error creating match:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
    throw error;
  }
}

// Run the script
createMatch()
  .then(() => {
    console.log('🎉 Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  });