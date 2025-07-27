/**
 * Final verification of Kreisklasse A Tauberbischofsheim table data
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337/api';
const LIGA_NAME = 'Kreisklasse A Tauberbischofsheim';

// Expected teams in correct order
const EXPECTED_TEAMS = [
  { team_name: 'TSV Unterschüpf', platz: 1 },
  { team_name: 'SV Nassig II', platz: 2 },
  { team_name: 'TSV Dittwar', platz: 3 },
  { team_name: 'FV Oberlauda e.V.', platz: 4 },
  { team_name: 'SV Viktoria Wertheim II', platz: 5 },
  { team_name: 'FC Wertheim-Eichel', platz: 6 },
  { team_name: 'TSV Assamstadt II', platz: 7 },
  { team_name: 'FC Grünsfeld II', platz: 8 },
  { team_name: 'TSV Gerchsheim', platz: 9 },
  { team_name: 'SV Distelhausen II', platz: 10 },
  { team_name: 'TSV Wenkheim', platz: 11 },
  { team_name: 'SV Winzer Beckstein II', platz: 12 },
  { team_name: 'SV Oberbalbach', platz: 13 },
  { team_name: 'FSV Tauberhöhe II', platz: 14 }
];

async function finalVerifyKreisklasseA() {
  console.log('🔍 Final verification of Kreisklasse A Tauberbischofsheim data...');
  
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
      return false;
    }

    console.log('\n📋 Complete Kreisklasse A table:');
    let allCorrect = true;
    
    // Check each team
    for (let i = 0; i < EXPECTED_TEAMS.length; i++) {
      const expectedTeam = EXPECTED_TEAMS[i];
      const actualEntry = entries.find(entry => entry.platz === expectedTeam.platz);
      
      if (!actualEntry) {
        console.log(`❌ Missing team at position ${expectedTeam.platz}: ${expectedTeam.team_name}`);
        allCorrect = false;
        continue;
      }
      
      const isViktoria = actualEntry.team_name.toLowerCase().includes('viktoria');
      const marker = isViktoria ? '🟡' : '  ';
      
      const isCorrectTeam = actualEntry.team_name === expectedTeam.team_name;
      const isCorrectPlatz = actualEntry.platz === expectedTeam.platz;
      
      if (!isCorrectTeam || !isCorrectPlatz) {
        allCorrect = false;
      }
      
      const status = (isCorrectTeam && isCorrectPlatz) ? '✅' : '❌';
      console.log(`${marker}${status} ${actualEntry.platz}. ${actualEntry.team_name}`);
      
      if (!isCorrectTeam) {
        console.log(`      Expected: ${expectedTeam.team_name}`);
      }
      
      // Check that all stats are 0 (season start)
      const statsCorrect = actualEntry.spiele === 0 && 
                          actualEntry.siege === 0 && 
                          actualEntry.unentschieden === 0 && 
                          actualEntry.niederlagen === 0 && 
                          actualEntry.tore_fuer === 0 && 
                          actualEntry.tore_gegen === 0 && 
                          actualEntry.tordifferenz === 0 && 
                          actualEntry.punkte === 0;
      
      if (!statsCorrect) {
        console.log(`      ⚠️  Statistics not all zero for ${actualEntry.team_name}`);
        allCorrect = false;
      }
    }

    // Check if we have exactly 14 teams
    if (entries.length === 14) {
      console.log('\n✅ Correct number of teams (14)');
    } else {
      console.log(`\n❌ Expected 14 teams, found ${entries.length}`);
      allCorrect = false;
    }

    // Check Viktoria team position specifically
    const viktoriaTeam = entries.find(entry => 
      entry.team_name === 'SV Viktoria Wertheim II'
    );
    
    if (viktoriaTeam) {
      if (viktoriaTeam.platz === 5) {
        console.log('✅ SV Viktoria Wertheim II correctly positioned at Platz 5');
      } else {
        console.log(`❌ SV Viktoria Wertheim II at wrong position: ${viktoriaTeam.platz} (expected: 5)`);
        allCorrect = false;
      }
    } else {
      console.log('❌ SV Viktoria Wertheim II not found');
      allCorrect = false;
    }

    // Final result
    if (allCorrect) {
      console.log('\n🎉 Task 6 COMPLETED: Kreisklasse A Tauberbischofsheim table is correctly set up!');
      console.log('✅ All 14 teams created with correct positions');
      console.log('✅ SV Viktoria Wertheim II at position 5');
      console.log('✅ All statistics set to 0 (season start)');
      console.log('✅ Requirements 3.2 and 3.3 fulfilled');
    } else {
      console.log('\n⚠️  Some issues found with the table setup');
    }

    return allCorrect;

  } catch (error) {
    console.error('❌ Error during verification:', error.response?.data || error.message);
    return false;
  }
}

// Run verification
finalVerifyKreisklasseA().then(success => {
  if (success) {
    console.log('\n✅ Task 6 verification PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ Task 6 verification FAILED');
    process.exit(1);
  }
});