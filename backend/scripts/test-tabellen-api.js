/**
 * Test script for Tabellen-Eintrag API endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';

async function testTabellenAPI() {
  console.log('🧪 Testing Tabellen-Eintrag API endpoints...');

  try {
    // Test 1: Get all tabellen-eintraege
    console.log('\n1️⃣ Testing GET /api/tabellen-eintraege');
    const allEntries = await axios.get(`${BASE_URL}/tabellen-eintraege?populate=liga&sort=platz:asc`);
    console.log(`✅ Found ${allEntries.data.data.length} total entries`);
    
    // Show first few entries
    allEntries.data.data.slice(0, 3).forEach(entry => {
      console.log(`   - ${entry.attributes.team_name} (${entry.attributes.liga?.data?.attributes?.name}) - Platz ${entry.attributes.platz}`);
    });

    // Test 2: Filter by Liga
    console.log('\n2️⃣ Testing Liga filtering');
    const kreisligaEntries = await axios.get(`${BASE_URL}/tabellen-eintraege?filters[liga][name][$eq]=Kreisliga Tauberbischofsheim&populate=liga&sort=platz:asc`);
    console.log(`✅ Found ${kreisligaEntries.data.data.length} entries for Kreisliga Tauberbischofsheim`);
    
    // Show Viktoria team
    const viktoriaTeam = kreisligaEntries.data.data.find(entry => 
      entry.attributes.team_name.toLowerCase().includes('viktoria')
    );
    if (viktoriaTeam) {
      console.log(`   🟡 Viktoria team: ${viktoriaTeam.attributes.team_name} - Platz ${viktoriaTeam.attributes.platz}`);
    }

    // Test 3: Filter by team name
    console.log('\n3️⃣ Testing team name filtering');
    const viktoriaEntries = await axios.get(`${BASE_URL}/tabellen-eintraege?filters[team_name][$containsi]=viktoria&populate=liga&sort=platz:asc`);
    console.log(`✅ Found ${viktoriaEntries.data.data.length} Viktoria teams`);
    
    viktoriaEntries.data.data.forEach(entry => {
      console.log(`   🟡 ${entry.attributes.team_name} (${entry.attributes.liga?.data?.attributes?.name}) - Platz ${entry.attributes.platz}`);
    });

    // Test 4: Test each Liga
    const ligas = ['Kreisliga Tauberbischofsheim', 'Kreisklasse A Tauberbischofsheim', 'Kreisklasse B Tauberbischofsheim'];
    
    console.log('\n4️⃣ Testing all Liga tables');
    for (const ligaName of ligas) {
      const entries = await axios.get(`${BASE_URL}/tabellen-eintraege?filters[liga][name][$eq]=${encodeURIComponent(ligaName)}&populate=liga&sort=platz:asc`);
      console.log(`   📊 ${ligaName}: ${entries.data.data.length} teams`);
      
      // Show top 3 teams
      entries.data.data.slice(0, 3).forEach((entry, index) => {
        const isViktoria = entry.attributes.team_name.toLowerCase().includes('viktoria') || 
                          entry.attributes.team_name.toLowerCase().includes('vikt.');
        const marker = isViktoria ? '🟡' : '  ';
        console.log(`     ${marker} ${index + 1}. ${entry.attributes.team_name} (${entry.attributes.punkte} Punkte)`);
      });
    }

    console.log('\n✅ All API tests completed successfully!');

  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

// Run the test
testTabellenAPI();