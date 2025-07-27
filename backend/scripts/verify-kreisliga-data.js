/**
 * Verify Kreisliga Tauberbischofsheim Table Data
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337/api';

async function verifyKreisligaData() {
  console.log('🔍 Verifying Kreisliga Tauberbischofsheim data...');
  
  try {
    // Get all tabellen-eintraege with liga populated
    const response = await axios.get(`${API_BASE_URL}/tabellen-eintraege`, {
      params: {
        'populate': 'liga',
        'sort': 'platz:asc'
      }
    });

    const allEntries = response.data.data;
    
    // Filter for Kreisliga Tauberbischofsheim entries
    const kreisligaEntries = allEntries.filter(entry => {
      const liga = entry.liga || entry.attributes?.liga;
      return liga && liga.name === 'Kreisliga Tauberbischofsheim';
    });

    console.log(`\n📊 Found ${kreisligaEntries.length} Kreisliga Tauberbischofsheim entries:`);
    
    // Sort by platz
    kreisligaEntries.sort((a, b) => {
      const platzA = a.platz || a.attributes?.platz;
      const platzB = b.platz || b.attributes?.platz;
      return platzA - platzB;
    });
    
    // Display all teams
    kreisligaEntries.forEach((entry, index) => {
      const teamName = entry.team_name || entry.attributes?.team_name;
      const platz = entry.platz || entry.attributes?.platz;
      const liga = entry.liga || entry.attributes?.liga;
      const isViktoria = teamName.toLowerCase().includes('viktoria');
      const marker = isViktoria ? '🟡' : '  ';
      
      console.log(`${marker} ${platz}. ${teamName} (Liga ID: ${liga.id})`);
    });

    // Check for Viktoria team
    const viktoriaTeam = kreisligaEntries.find(entry => {
      const teamName = entry.team_name || entry.attributes?.team_name;
      return teamName.toLowerCase().includes('viktoria');
    });
    
    if (viktoriaTeam) {
      const teamName = viktoriaTeam.team_name || viktoriaTeam.attributes?.team_name;
      const platz = viktoriaTeam.platz || viktoriaTeam.attributes?.platz;
      console.log(`\n🟡 Viktoria team found: ${teamName} on position ${platz}`);
    }

    // Verify all statistics are 0 (season start)
    const allZeroStats = kreisligaEntries.every(entry => {
      const spiele = entry.spiele || entry.attributes?.spiele;
      const siege = entry.siege || entry.attributes?.siege;
      const unentschieden = entry.unentschieden || entry.attributes?.unentschieden;
      const niederlagen = entry.niederlagen || entry.attributes?.niederlagen;
      const tore_fuer = entry.tore_fuer || entry.attributes?.tore_fuer;
      const tore_gegen = entry.tore_gegen || entry.attributes?.tore_gegen;
      const tordifferenz = entry.tordifferenz || entry.attributes?.tordifferenz;
      const punkte = entry.punkte || entry.attributes?.punkte;
      
      return spiele === 0 && siege === 0 && unentschieden === 0 && 
             niederlagen === 0 && tore_fuer === 0 && tore_gegen === 0 && 
             tordifferenz === 0 && punkte === 0;
    });

    if (allZeroStats) {
      console.log('\n✅ All statistics are correctly set to 0 (season start)');
    } else {
      console.log('\n⚠️  Some statistics are not set to 0');
    }

    // Check if we have exactly 16 teams
    if (kreisligaEntries.length === 16) {
      console.log('✅ Correct number of teams (16) found');
    } else {
      console.log(`⚠️  Expected 16 teams, found ${kreisligaEntries.length}`);
    }

    console.log('\n✅ Verification completed!');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

// Run verification
verifyKreisligaData();