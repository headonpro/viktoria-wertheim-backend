/**
 * Reset and Create Complete Kreisliga Tauberbischofsheim Table Data
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

async function resetKreisligaData() {
  console.log('🔄 Resetting Kreisliga Tauberbischofsheim data...');
  
  try {
    // Step 1: Delete ALL existing Kreisliga entries (both liga ID 1 and 5)
    console.log('\n🗑️  Deleting all existing Kreisliga entries...');
    
    const allEntriesResponse = await axios.get(`${API_BASE_URL}/tabellen-eintraege`, {
      params: {
        'populate': 'liga'
      }
    });

    const allEntries = allEntriesResponse.data.data;
    const kreisligaEntries = allEntries.filter(entry => {
      const liga = entry.liga || entry.attributes?.liga;
      return liga && liga.name === 'Kreisliga Tauberbischofsheim';
    });

    console.log(`Found ${kreisligaEntries.length} existing Kreisliga entries to delete`);

    for (const entry of kreisligaEntries) {
      try {
        await axios.delete(`${API_BASE_URL}/tabellen-eintraege/${entry.id}`);
        const teamName = entry.team_name || entry.attributes?.team_name;
        const ligaId = (entry.liga || entry.attributes?.liga).id;
        console.log(`  🗑️  Deleted: ${teamName} (Liga ID: ${ligaId})`);
      } catch (deleteError) {
        console.error(`  ❌ Error deleting entry ${entry.id}: ${deleteError.message}`);
      }
    }

    // Step 2: Delete duplicate liga if it exists
    try {
      await axios.delete(`${API_BASE_URL}/ligas/5`);
      console.log('  🗑️  Deleted duplicate liga (ID: 5)');
    } catch (error) {
      console.log('  ℹ️  No duplicate liga to delete');
    }

    // Step 3: Create all 16 teams fresh in the original liga (ID: 1)
    console.log('\n➕ Creating all 16 teams in Kreisliga Tauberbischofsheim...');
    
    let created = 0;
    let errors = [];

    for (const teamData of KREISLIGA_TEAMS) {
      try {
        const entryData = {
          liga: 1,
          team_name: teamData.team_name,
          platz: teamData.platz,
          ...DEFAULT_STATS
        };

        await axios.post(`${API_BASE_URL}/tabellen-eintraege`, {
          data: entryData
        });
        
        console.log(`    ➕ Created: ${teamData.team_name} (Platz ${teamData.platz})`);
        created++;
      } catch (error) {
        const errorMsg = `Failed to create ${teamData.team_name}: ${error.message}`;
        console.error(`    ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    console.log(`\n📈 Creation Summary:`);
    console.log(`  ➕ Created: ${created} entries`);
    console.log(`  ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach(error => console.log(`  - ${error}`));
    }

    // Step 4: Final verification
    await verifyFinalData();

    console.log('\n✅ Kreisliga reset completed!');

  } catch (error) {
    console.error('❌ Error during reset:', error.message);
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
      return liga && liga.name === 'Kreisliga Tauberbischofsheim';
    });

    // Sort by platz
    kreisligaEntries.sort((a, b) => {
      const platzA = a.platz || a.attributes?.platz;
      const platzB = b.platz || b.attributes?.platz;
      return platzA - platzB;
    });

    console.log(`  📊 Found ${kreisligaEntries.length} entries in Kreisliga Tauberbischofsheim:`);
    
    // Display all teams
    kreisligaEntries.forEach((entry) => {
      const teamName = entry.team_name || entry.attributes?.team_name;
      const platz = entry.platz || entry.attributes?.platz;
      const ligaId = (entry.liga || entry.attributes?.liga).id;
      const isViktoria = teamName.toLowerCase().includes('viktoria');
      const marker = isViktoria ? '🟡' : '  ';
      
      console.log(`${marker} ${platz}. ${teamName} (Liga ID: ${ligaId})`);
    });

    if (kreisligaEntries.length === 16) {
      console.log('\n  ✅ All 16 teams successfully created!');
      
      // Check Viktoria position
      const viktoriaTeam = kreisligaEntries.find(entry => {
        const teamName = entry.team_name || entry.attributes?.team_name;
        return teamName.toLowerCase().includes('viktoria');
      });
      
      if (viktoriaTeam) {
        const teamName = viktoriaTeam.team_name || viktoriaTeam.attributes?.team_name;
        const platz = viktoriaTeam.platz || viktoriaTeam.attributes?.platz;
        if (platz === 1) {
          console.log(`  🟡 ✅ ${teamName} correctly positioned at Platz 1`);
        } else {
          console.log(`  🟡 ⚠️  ${teamName} at Platz ${platz} (should be 1)`);
        }
      }

      // Verify all stats are 0
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
        console.log('  ✅ All statistics correctly set to 0 (season start)');
      } else {
        console.log('  ⚠️  Some statistics are not set to 0');
      }

    } else {
      console.log(`\n  ⚠️  Expected 16 teams, found ${kreisligaEntries.length}`);
    }

  } catch (error) {
    console.error('  ❌ Error during verification:', error.message);
  }
}

// Run the reset
resetKreisligaData();