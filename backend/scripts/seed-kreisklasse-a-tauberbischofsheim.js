/**
 * Seed Kreisklasse A Tauberbischofsheim Table Data
 * Creates table entries for all 14 teams in the Kreisklasse A Tauberbischofsheim
 */

const axios = require('axios');

// Kreisklasse A Tauberbischofsheim teams with correct positions
const KREISKLASSE_A_TEAMS = [
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
const LIGA_NAME = 'Kreisklasse A Tauberbischofsheim';

async function seedKreisklasseATable() {
  console.log('🚀 Starting Kreisklasse A Tauberbischofsheim table seeding...');
  
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
            kurz_name: 'Kreisklasse A TB'
          }
        });
        liga = createLigaResponse.data.data;
        console.log(`  ➕ Liga created with ID: ${liga.id}`);
      }
    } catch (error) {
      console.error('❌ Error finding/creating liga:', error.message);
      return;
    }

    // Step 2: Create/update table entries for all 14 teams
    console.log(`\n📋 Processing ${KREISKLASSE_A_TEAMS.length} teams...`);
    
    let created = 0;
    let updated = 0;
    let errors = [];

    for (const teamData of KREISKLASSE_A_TEAMS) {
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
    await verifyKreisklasseAData(liga.id);

    console.log('\n✅ Kreisklasse A Tauberbischofsheim seeding completed!');

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error.message);
    process.exit(1);
  }
}

async function verifyKreisklasseAData(ligaId) {
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
      return entry.team_name.toLowerCase().includes('viktoria');
    });
    
    if (viktoriaTeam) {
      console.log(`    🟡 Viktoria team found: ${viktoriaTeam.team_name} (Platz ${viktoriaTeam.platz})`);
    }

    // Verify all 14 teams are present
    if (entries.length === 14) {
      console.log('    ✅ All 14 teams successfully created');
    } else {
      console.log(`    ⚠️  Expected 14 teams, found ${entries.length}`);
    }

    // Show all teams
    console.log('    📋 Complete table:');
    entries.forEach(entry => {
      if (!entry.team_name) {
        console.log('      ❌ Invalid entry:', entry);
        return;
      }
      const isViktoria = entry.team_name.toLowerCase().includes('viktoria');
      const marker = isViktoria ? '🟡' : '  ';
      console.log(`      ${marker}${entry.platz}. ${entry.team_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

// Run the seeding
if (require.main === module) {
  seedKreisklasseATable().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { seedKreisklasseATable, KREISKLASSE_A_TEAMS, DEFAULT_STATS };