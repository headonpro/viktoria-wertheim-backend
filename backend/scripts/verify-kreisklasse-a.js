/**
 * Verify Kreisklasse A Tauberbischofsheim table data
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337/api';
const LIGA_NAME = 'Kreisklasse A Tauberbischofsheim';

async function verifyKreisklasseA() {
  console.log('🔍 Verifying Kreisklasse A Tauberbischofsheim data...');
  
  try {
    // Get all entries for Kreisklasse A
    const response = await axios.get(`${API_BASE_URL}/tabellen-eintraege`, {
      params: {
        'filters[liga][name][$eq]': LIGA_NAME,
        'sort': 'platz:asc',
        'populate': 'liga'
      }
    });

    const entries = response.data.data;
    console.log(`\n📊 ${LIGA_NAME}: ${entries.length} entries found`);
    
    if (entries.length === 0) {
      console.log('❌ No entries found for Kreisklasse A');
      return;
    }

    // Expected teams in correct order
    const expectedTeams = [
      'TSV Unterschüpf',
      'SV Nassig II', 
      'TSV Dittwar',
      'FV Oberlauda e.V.',
      'SV Viktoria Wertheim II',
      'FC Wertheim-Eichel',
      'TSV Assamstadt II',
      'FC Grünsfeld II',
      'TSV Gerchsheim',
      'SV Distelhausen II',
      'TSV Wenkheim',
      'SV Winzer Beckstein II',
      'SV Oberbalbach',
      'FSV Tauberhöhe II'
    ];

    console.log('\n📋 Complete Kreisklasse A table:');
    let allCorrect = true;
    
    entries.forEach((entry, index) => {
      const teamName = entry.attributes.team_name;
      const platz = entry.attributes.platz;
      const expectedTeam = expectedTeams[index];
      const expectedPlatz = index + 1;
      
      const isViktoria = teamName.toLowerCase().includes('viktoria');
      const marker = isViktoria ? '🟡' : '  ';
      
      const isCorrectTeam = teamName === expectedTeam;
      const isCorrectPlatz = platz === expectedPlatz;
      
      if (!isCorrectTeam || !isCorrectPlatz) {
        allCorrect = false;
      }
      
      const status = (isCorrectTeam && isCorrectPlatz) ? '✅' : '❌';
      console.log(`${marker}${status} ${platz}. ${teamName}`);
      
      if (!isCorrectTeam) {
        console.log(`      Expected: ${expectedTeam}`);
      }
      if (!isCorrectPlatz) {
        console.log(`      Expected position: ${expectedPlatz}`);
      }
    });

    // Check if we have exactly 14 teams
    if (entries.length === 14) {
      console.log('\n✅ Correct number of teams (14)');
    } else {
      console.log(`\n❌ Expected 14 teams, found ${entries.length}`);
      allCorrect = false;
    }

    // Check Viktoria team position
    const viktoriaTeam = entries.find(entry => 
      entry.attributes.team_name === 'SV Viktoria Wertheim II'
    );
    
    if (viktoriaTeam) {
      if (viktoriaTeam.attributes.platz === 5) {
        console.log('✅ SV Viktoria Wertheim II correctly positioned at Platz 5');
      } else {
        console.log(`❌ SV Viktoria Wertheim II at wrong position: ${viktoriaTeam.attributes.platz} (expected: 5)`);
        allCorrect = false;
      }
    } else {
      console.log('❌ SV Viktoria Wertheim II not found');
      allCorrect = false;
    }

    // Check that all stats are 0 (season start)
    const statsCheck = entries.every(entry => {
      const attrs = entry.attributes;
      return attrs.spiele === 0 && 
             attrs.siege === 0 && 
             attrs.unentschieden === 0 && 
             attrs.niederlagen === 0 && 
             attrs.tore_fuer === 0 && 
             attrs.tore_gegen === 0 && 
             attrs.tordifferenz === 0 && 
             attrs.punkte === 0;
    });

    if (statsCheck) {
      console.log('✅ All statistics correctly set to 0 (season start)');
    } else {
      console.log('❌ Some statistics are not set to 0');
      allCorrect = false;
    }

    if (allCorrect) {
      console.log('\n🎉 Kreisklasse A Tauberbischofsheim table is correctly set up!');
    } else {
      console.log('\n⚠️  Some issues found with the table setup');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.response?.data || error.message);
  }
}

// Run verification
verifyKreisklasseA();