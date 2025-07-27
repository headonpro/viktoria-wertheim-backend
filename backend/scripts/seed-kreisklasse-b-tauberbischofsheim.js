/**
 * Seed Kreisklasse B Tauberbischofsheim Table Data
 * Creates table entries for all 9 teams in the Kreisklasse B Tauberbischofsheim
 * All teams start at Platz 1 (season start with equal standings)
 */

const axios = require('axios');

// Kreisklasse B Tauberbischofsheim teams - all start at Platz 1 (season start)
const KREISKLASSE_B_TEAMS = [
  { team_name: 'FC Hundheim-Steinbach 2', platz: 1 },
  { team_name: 'FC Wertheim-Eichel 2', platz: 1 },
  { team_name: 'SG RaMBo 2', platz: 1 },
  { team_name: 'SV Eintracht Nassig 3', platz: 1 },
  { team_name: 'SpG Kickers DHK Wertheim 2/Urphar', platz: 1 },
  { team_name: 'SpG Vikt. Wertheim 3/Grünenwort', platz: 1 },
  { team_name: 'TSV Kreuzwertheim 2', platz: 1 },
  { team_name: 'Turkgucu Wertheim 2', platz: 1 },
  { team_name: 'VfB Reicholzheim 2', platz: 1 }
];

// Default statistics for season start (all zeros)
const DEFAULT_STATS = {
  spiele: 0,
  siege: 0,
  unentschieden: 0,
  niederlagen: 0,
  tore_fuer: 0,
  tore_gegen: 0,
  tordifferenz: 0,
  punkte: 0
};

const API_BASE_URL = 'http://localhost:1337/api';
const LIGA_NAME = 'Kreisklasse B Tauberbischofsheim';

async function seedKreisklasseBTable() {
  console.log('🚀 Starting Kreisklasse B Tauberbischofsheim table seeding...');
  
  try {
    // Step 1: Find or create the Liga
    console.log(`\n📊 Finding/creating liga: ${LIGA_NAME}`);
    
    let liga;
    try {
      const ligaResponse = await axios.get(`${API_BASE_URL}/ligas`, {
        params: {
          'filters[name][$eq]': LIGA_NAME
        }
      });
      
      if (ligaResponse.data.data && ligaResponse.data.data.length > 0) {
        liga = ligaResponse.data.data[0];
        console.log(`  ✅ Liga found with ID: ${liga.id}`);
      } else {
        // Create the liga
        const createLigaResponse = await axios.post(`${API_BASE_URL}/ligas`, {
          data: {
            name: LIGA_NAME,
            kurz_name: 'Kreisklasse B TB'
          }
        });
        liga = createLigaResponse.data.data;
        console.log(`  ➕ Liga created with ID: ${liga.id}`);
      }
    } catch (error) {
      console.error('❌ Error finding/creating liga:', error.message);
      return;
    }

    // Step 2: Create/update table entries for all 9 teams
    console.log(`\n📋 Processing ${KREISKLASSE_B_TEAMS.length} teams (all at Platz 1 - season start)...`);
    
    let created = 0;
    let updated = 0;
    let errors = [];

    for (const teamData of KREISKLASSE_B_TEAMS) {
      try {
        // Check if entry already exists
        const existingResponse = await axios.get(`${API_BASE_URL}/tabellen-eintraege`, {
          params: {
            'filters[liga][id][$eq]': liga.id,
            'filters[team_name][$eq]': teamData.team_name
          }
        });

        const entryData = {
          liga: liga.id,
          team_name: teamData.team_name,
          platz: teamData.platz,
          ...DEFAULT_STATS
        };

        if (existingResponse.data.data && existingResponse.data.data.length > 0) {
          // Update existing entry
          const existingEntry = existingResponse.data.data[0];
          await axios.put(`${API_BASE_URL}/tabellen-eintraege/${existingEntry.id}`, {
            data: entryData
          });
          console.log(`    🔄 Updated: ${teamData.team_name} (Platz ${teamData.platz})`);
          updated++;
        } else {
          // Create new entry
          await axios.post(`${API_BASE_URL}/tabellen-eintraege`, {
            data: entryData
          });
          console.log(`    ➕ Created: ${teamData.team_name} (Platz ${teamData.platz})`);
          created++;
        }

      } catch (teamError) {
        const errorMsg = `Failed to process team ${teamData.team_name}: ${teamError.message}`;
        console.error(`    ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Step 3: Summary
    console.log('\n📈 Seeding Summary:');
    console.log(`  ➕ Created: ${created} entries`);
    console.log(`  🔄 Updated: ${updated} entries`);
    console.log(`  ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(error => console.log(`  - ${error}`));
    }

    // Step 4: Verify the data
    await verifyKreisklasseBData(liga.id);

    console.log('\n✅ Kreisklasse B Tauberbischofsheim seeding completed!');

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error.message);
    process.exit(1);
  }
}

async function verifyKreisklasseBData(ligaId) {
  console.log('\n🔍 Verifying seeded data...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/tabellen-eintraege`, {
      params: {
        'filters[liga][id][$eq]': ligaId,
        'sort': 'platz:asc',
        'populate': 'liga'
      }
    });

    const entries = response.data.data;
    console.log(`  📊 ${LIGA_NAME}: ${entries.length} entries found`);
    
    if (!entries || entries.length === 0) {
      console.log('    ❌ No entries found');
      return;
    }

    // Check for Viktoria team
    const viktoriaTeam = entries.find(entry => {
      if (!entry.team_name) {
        console.log('    ⚠️  Entry missing team_name:', entry);
        return false;
      }
      return entry.team_name.toLowerCase().includes('vikt');
    });
    
    if (viktoriaTeam) {
      console.log(`    🟡 Viktoria team found: ${viktoriaTeam.team_name} (Platz ${viktoriaTeam.platz})`);
    }

    // Verify all 9 teams are present
    if (entries.length === 9) {
      console.log('    ✅ All 9 teams successfully created');
    } else {
      console.log(`    ⚠️  Expected 9 teams, found ${entries.length}`);
    }

    // Verify all teams are at Platz 1 (season start)
    const allAtPlatz1 = entries.every(entry => entry.platz === 1);
    if (allAtPlatz1) {
      console.log('    ✅ All teams correctly set to Platz 1 (season start)');
    } else {
      console.log('    ⚠️  Not all teams are at Platz 1');
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
      console.log('    ✅ All statistics correctly set to 0 (season start)');
    } else {
      console.log('    ⚠️  Some statistics are not set to 0');
    }

    // Show all teams
    console.log('    📋 Complete table (all teams at Platz 1):');
    entries.forEach(entry => {
      if (!entry.team_name) {
        console.log('      ❌ Invalid entry:', entry);
        return;
      }
      const isViktoria = entry.team_name.toLowerCase().includes('vikt');
      const marker = isViktoria ? '🟡' : '  ';
      console.log(`      ${marker}${entry.platz}. ${entry.team_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

// Run the seeding
if (require.main === module) {
  seedKreisklasseBTable().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { seedKreisklasseBTable, KREISKLASSE_B_TEAMS, DEFAULT_STATS };