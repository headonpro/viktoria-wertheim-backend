const axios = require('axios');

async function createErsteMannschaft() {
  console.log('🏆 Creating 1. Mannschaft...');
  
  const baseURL = 'http://localhost:1337/api';
  
  const mannschaftData = {
    name: "1. Mannschaft",
    liga: "Kreisliga",
    status: "aktiv",
    saison: "2024/25",
    spielort: "Sportplatz Wertheim",
    altersklasse: "senioren",
    tabellenplatz: 8,
    punkte: 0,
    spiele_gesamt: 0,
    siege: 0,
    unentschieden: 0,
    niederlagen: 0,
    tore_fuer: 0,
    tore_gegen: 0,
    tordifferenz: 0,
    trend: "gleich"
  };
  
  try {
    console.log('📤 Creating 1. Mannschaft...');
    
    const response = await axios.post(`${baseURL}/mannschaften`, {
      data: mannschaftData
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 1. Mannschaft created successfully!');
    console.log('   Liga: Kreisliga');
    console.log('   Tabellenplatz: 8');
    console.log('   Status: aktiv');
    console.log('\n🎉 All three mannschaften are now complete!');
    
  } catch (error) {
    console.log('❌ Error creating 1. Mannschaft:');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Network error:', error.message);
    }
  }
}

createErsteMannschaft();