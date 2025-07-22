const axios = require('axios');

async function createThreeMannschaften() {
  console.log('🏆 Creating three mannschaften for Viktoria Wertheim...');
  
  const baseURL = 'http://localhost:1337/api';
  
  const mannschaften = [
    {
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
    },
    {
      name: "2. Mannschaft",
      liga: "Kreisklasse A",
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
    },
    {
      name: "3. Mannschaft",
      liga: "Kreisklasse B",
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
    }
  ];
  
  let successCount = 0;
  
  for (const mannschaftData of mannschaften) {
    try {
      console.log(`\n📤 Creating ${mannschaftData.name}...`);
      
      const response = await axios.post(`${baseURL}/mannschaften`, {
        data: mannschaftData
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`✅ ${mannschaftData.name} created successfully!`);
      console.log(`   Liga: ${mannschaftData.liga}`);
      console.log(`   Tabellenplatz: ${mannschaftData.tabellenplatz}`);
      console.log(`   Status: ${mannschaftData.status}`);
      
      successCount++;
      
    } catch (error) {
      console.log(`❌ Error creating ${mannschaftData.name}:`);
      
      if (error.response) {
        console.log('Status:', error.response.status);
        console.log('Error data:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('Network error:', error.message);
      }
    }
  }
  
  console.log(`\n🎉 Successfully created ${successCount}/3 mannschaften!`);
  
  if (successCount === 3) {
    console.log('\n✅ All mannschaften are ready for the new season!');
    console.log('You can now view them in the Strapi admin panel.');
  }
}

createThreeMannschaften();