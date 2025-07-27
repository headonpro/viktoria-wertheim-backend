/**
 * Fix Kreisliga Tauberbischofsheim Table Data
 * Remove duplicates and ensure all 16 teams are in the correct liga
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337/api';

// All 16 teams for Kreisliga Tauberbischofsheim
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

async function fixKreisligaData() {
  console.log('🔧 Fixing Kreisliga Tauberbischofsheim data...');
  
  try {
    // Step 1: Find the original Kreisliga (ID 1)
    const ligaResponse = await axios.get(`${API_BASE_URL}/ligas/1`);
    const originalLiga = ligaResponse.data;
    console.log(`✅ Using original liga: ${originalLiga.name} (ID: ${originalLiga.id})`);

    // Step 2: Delete the duplicate liga (ID 5) and its entries
    console.log('\n🗑️  Cleaning up duplicate liga and entries...');
    
    // Get all entries for liga ID 5
    const duplicateEntriesResponse = await axios.get(`${API_BASE_URL}/tabellen-eintraege`, {
      params: {
        'populate': 'liga'
      }
    });
    
    const allEntries = duplicateEntriesResponse.data.data;
    const duplicateEntries = allEntries.filter(entry => {
      const liga = entry.liga || entry.attributes?.liga;
      return liga && liga.id === 5;
    });

    // Delete duplicate entries
    for (const entry of duplicateEntries) {
      await axios.delete(`${API_BASE_URL}/tabellen-eintraege/${entry.id}`);
      const teamName = entry.team_name || entry.attributes?.team_name;
      console.log(`  🗑️  Deleted duplicate: ${teamName}`);
    }

    // Delete duplicate liga
    try {
      await axios.delete(`${API_BASE_URL}/ligas/5`);
      console.log('  🗑️  Deleted duplicate liga');
    } catch (error) {
      console.log('  ℹ️  Duplicate liga already deleted or not found');
    }

    // Step 3: Ensure all 16 teams exist in the original liga
    console.log('\n📋 Ensuring all 16 teams exist in original liga...');
    
    let created = 0;
    let updated = 0;

    for (const teamData of KREISLIGA_TEAMS) {
      try {
        // Check if entry already exists in original liga
        const existingResponse = await axios.get(`${API_BASE_URL}/tabellen-eintraege`, {
          params: {
            'populate': 'liga'
          }
        });

        const existingEntry = existingResponse.data.data.find(entry => {
          const liga = entry.liga || entry.attributes?.liga;
          const teamName = entry.team_name || entry.attributes?.team_name;
          return liga && liga.id === 1 && teamName === teamData.team_name;
        });

        const entryData = {
          liga: 1,
          team_name: teamData.team_name,
          platz: teamData.platz,
          ...DEFAULT_STATS
        };

        if (existingEntry) {
          // Update existing entry
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
        console.error(`    ❌ Error processing ${teamData.team_name}: ${teamError.message}`);
      }
    }

    console.log('\n📈 Fix Summary:');
    console.log(`  ➕ Created: ${created} entries`);
    console.log(`  🔄 Updated: ${updated} entries`);

    // Step 4: Verify the final result
    await verifyFinalData();

    console.log('\n✅ Kreisliga data fix completed!');

  } catch (error) {
    console.error('❌ Error during fix:', error.message);
  }
}

async function verifyFinalData() {
  console.log('\n🔍 Final verification...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/tabellen-eintraege`, {
      params: {
        'populate': 'liga',
        'sort': 'platz:asc'
      }
    });

    const allEntries = response.data.data;
    const kreisligaEntries = allEntries.filter(entry => {
      const liga = entry.liga || entry.attributes?.liga;
      return liga && liga.name === 'Kreisliga Tauberbischofsheim' && liga.id === 1;
    });

    console.log(`  📊 Found ${kreisligaEntries.length} entries in original Kreisliga`);
    
    if (kreisligaEntries.length === 16) {
      console.log('  ✅ All 16 teams present');
      
      // Show Viktoria team
      const viktoriaTeam = kreisligaEntries.find(entry => {
        const teamName = entry.team_name || entry.attributes?.team_name;
        return teamName.toLowerCase().includes('viktoria');
      });
      
      if (viktoriaTeam) {
        const teamName = viktoriaTeam.team_name || viktoriaTeam.attributes?.team_name;
        const platz = viktoriaTeam.platz || viktoriaTeam.attributes?.platz;
        console.log(`  🟡 Viktoria team: ${teamName} (Platz ${platz})`);
      }
    } else {
      console.log(`  ⚠️  Expected 16 teams, found ${kreisligaEntries.length}`);
    }

  } catch (error) {
    console.error('  ❌ Error during verification:', error.message);
  }
}

// Run the fix
fixKreisligaData();