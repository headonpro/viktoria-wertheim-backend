/**
 * Seed Kreisliga Tauberbischofsheim Table Data
 * Creates table entries for all 16 teams in the Kreisliga Tauberbischofsheim
 */

const axios = require('axios');

// Kreisliga Tauberbischofsheim teams with correct positions
const KREISLIGA_TEAMS = [
  { team_name: 'SV Viktoria Wertheim', platz: 1 },
  { team_name: 'VfR Gerlachsheim', platz: 2 },
  { team_name: 'TSV Jahn Kreuzwertheim', platz: 3 },
  { team_name: 'TSV Assamstadt', platz: 4 },
  { team_name: 'FV Brehmbachtal', platz: 5 },
  { team_name: 'FC Hundheim-Steinbach', platz: 6 },
  { team_name: 'TuS Großrinderfeld', platz: 7 },
  { team_name: 'Türk Gücü Wertheim', platz: 8 },
  { team_name: 'SV Pülfringen', platz: 9 },
  { team_name: 'VfB Reicholzheim', platz: 10 },
  { team_name: 'FC Rauenberg', platz: 11 },
  { team_name: 'SV Schönfeld', platz: 12 },
  { team_name: 'TSG Impfingen II', platz: 13 },
  { team_name: '1. FC Umpfertal', platz: 14 },
  { team_name: 'Kickers DHK Wertheim', platz: 15 },
  { team_name: 'TSV Schwabhausen', platz: 16 }
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
const LIGA_NAME = 'Kreisliga Tauberbischofsheim';

async function seedKreisligaTable() {
  console.log('🚀 Starting Kreisliga Tauberbischofsheim table seeding...');
  
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
            kurz_name: 'Kreisliga TB'
          }
        });
        liga = createLigaResponse.data.data;
        console.log(`  ➕ Liga created with ID: ${liga.id}`);
      }
    } catch (error) {
      console.error('❌ Error finding/creating liga:', error.message);
      return;
    }

    // Step 2: Create/update table entries for all 16 teams
    console.log(`\n📋 Processing ${KREISLIGA_TEAMS.length} teams...`);
    
    let created = 0;
    let updated = 0;
    let errors = [];

    for (const teamData of KREISLIGA_TEAMS) {
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
    await verifyKreisligaData(liga.id);

    console.log('\n✅ Kreisliga Tauberbischofsheim seeding completed!');

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error.message);
    process.exit(1);
  }
}

async function verifyKreisligaData(ligaId) {
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
    
    // Check for Viktoria team
    const viktoriaTeam = entries.find(entry => 
      entry.attributes.team_name.toLowerCase().includes('viktoria')
    );
    
    if (viktoriaTeam) {
      console.log(`    🟡 Viktoria team found: ${viktoriaTeam.attributes.team_name} (Platz ${viktoriaTeam.attributes.platz})`);
    }

    // Verify all 16 teams are present
    if (entries.length === 16) {
      console.log('    ✅ All 16 teams successfully created');
    } else {
      console.log(`    ⚠️  Expected 16 teams, found ${entries.length}`);
    }

    // Show first few teams
    console.log('    📋 Top 5 teams:');
    entries.slice(0, 5).forEach(entry => {
      console.log(`      ${entry.attributes.platz}. ${entry.attributes.team_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error during verification:', error.message);
  }
}

// Run the seeding
if (require.main === module) {
  seedKreisligaTable().catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { seedKreisligaTable, KREISLIGA_TEAMS, DEFAULT_STATS };