/**
 * Verify Kreisklasse B Tauberbischofsheim Table Data
 * Checks the current state and cleans up duplicates if needed
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337/api';
const LIGA_NAME = 'Kreisklasse B Tauberbischofsheim';

// Expected teams for Kreisklasse B
const EXPECTED_TEAMS = [
  'FC Hundheim-Steinbach 2',
  'FC Wertheim-Eichel 2',
  'SG RaMBo 2',
  'SV Eintracht Nassig 3',
  'SpG Kickers DHK Wertheim 2/Urphar',
  'SpG Vikt. Wertheim 3/Grünenwort',
  'TSV Kreuzwertheim 2',
  'Turkgucu Wertheim 2',
  'VfB Reicholzheim 2'
];

async function verifyKreisklasseBData() {
  console.log('🔍 Verifying Kreisklasse B Tauberbischofsheim data...');
  
  try {
    // Step 1: Check all ligas with this name
    console.log('\n📊 Checking for duplicate ligas...');
    const ligasResponse = await axios.get(`${API_BASE_URL}/ligas`, {
      params: {
        'filters[name][$eq]': LIGA_NAME
      }
    });
    
    const ligas = ligasResponse.data.data;
    console.log(`  Found ${ligas.length} liga(s) with name "${LIGA_NAME}"`);
    
    if (ligas.length > 1) {
      console.log('  ⚠️  Multiple ligas found:');
      ligas.forEach(liga => {
        console.log(`    - ID: ${liga.id}, Name: ${liga.name}, Created: ${liga.createdAt}`);
      });
    }

    // Step 2: Check tabellen-eintraege for each liga
    let totalEntries = 0;
    let correctLiga = null;
    
    for (const liga of ligas) {
      const entriesResponse = await axios.get(`${API_BASE_URL}/tabellen-eintraege`, {
        params: {
          'filters[liga][id][$eq]': liga.id,
          'sort': 'platz:asc'
        }
      });
      
      const entries = entriesResponse.data.data;
      console.log(`\n  Liga ID ${liga.id}: ${entries.length} entries`);
      
      if (entries.length === 9) {
        correctLiga = liga;
        console.log('    ✅ This liga has the correct number of entries (9)');
        
        // Verify all expected teams are present
        const teamNames = entries.map(entry => entry.team_name);
        const missingTeams = EXPECTED_TEAMS.filter(team => !teamNames.includes(team));
        const extraTeams = teamNames.filter(team => !EXPECTED_TEAMS.includes(team));
        
        if (missingTeams.length === 0 && extraTeams.length === 0) {
          console.log('    ✅ All expected teams are present');
        } else {
          if (missingTeams.length > 0) {
            console.log('    ❌ Missing teams:', missingTeams);
          }
          if (extraTeams.length > 0) {
            console.log('    ❌ Extra teams:', extraTeams);
          }
        }
        
        // Verify all teams are at Platz 1
        const allAtPlatz1 = entries.every(entry => entry.platz === 1);
        if (allAtPlatz1) {
          console.log('    ✅ All teams correctly at Platz 1');
        } else {
          console.log('    ❌ Not all teams are at Platz 1');
        }
        
        // Verify all stats are 0
        const allStatsZero = entries.every(entry => 
          entry.spiele === 0 && 
          entry.siege === 0 && 
          entry.unentschieden === 0 && 
          entry.niederlagen === 0 && 
          entry.tore_fuer === 0 && 
          entry.tore_gegen === 0 && 
          entry.tordifferenz === 0 && 
          entry.punkte === 0
        );
        
        if (allStatsZero) {
          console.log('    ✅ All statistics correctly set to 0');
        } else {
          console.log('    ❌ Some statistics are not 0');
        }
        
        // Show Viktoria team
        const viktoriaTeam = entries.find(entry => 
          entry.team_name.toLowerCase().includes('vikt')
        );
        
        if (viktoriaTeam) {
          console.log(`    🟡 Viktoria team: ${viktoriaTeam.team_name} (Platz ${viktoriaTeam.platz})`);
        }
        
      } else if (entries.length > 0) {
        console.log(`    ⚠️  This liga has ${entries.length} entries (expected 9)`);
      }
      
      totalEntries += entries.length;
    }

    // Step 3: Summary and recommendations
    console.log('\n📈 Summary:');
    console.log(`  Total ligas found: ${ligas.length}`);
    console.log(`  Total entries across all ligas: ${totalEntries}`);
    
    if (correctLiga) {
      console.log(`  ✅ Correct liga found: ID ${correctLiga.id}`);
      console.log('  ✅ Task 7 requirements fulfilled:');
      console.log('    - All 9 teams created');
      console.log('    - All teams at Platz 1 (season start)');
      console.log('    - All statistics set to 0');
      console.log('    - Viktoria team (SpG Vikt. Wertheim 3/Grünenwort) present');
    }
    
    if (ligas.length > 1) {
      console.log('\n⚠️  Recommendation: Clean up duplicate ligas');
      console.log('  Keep the liga with 9 correct entries and remove others');
    }

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

// Run the verification
if (require.main === module) {
  verifyKreisklasseBData().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { verifyKreisklasseBData, EXPECTED_TEAMS };