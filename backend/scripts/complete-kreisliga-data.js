/**
 * Complete Kreisliga Tauberbischofsheim Table Data
 * Ensure all 16 teams are present
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

async function completeKreisligaData() {
  console.log('📋 Completing Kreisliga Tauberbischofsheim data...');
  
  try {
    // Get current entries for Kreisliga (ID 1)
    const currentResponse = await axios.get(`${API_BASE_URL}/tabellen-eintraege`, {
      params: {
        'populate': 'liga'
      }
    });

    const allEntries = currentResponse.data.data;
    const existingEntries = allEntries.filter(entry => {
      const liga = entry.liga || entry.attributes?.liga;
      return liga && liga.id === 1;
    });

    console.log(`📊 Currently ${existingEntries.length} entries in Kreisliga`);

    // Get existing team names
    const existingTeamNames = existingEntries.map(entry => {
      return entry.team_name || entry.attributes?.team_name;
    });

    console.log('📝 Existing teams:', existingTeamNames);

    // Create missing teams
    let created = 0;
    
    for (const teamData of KREISLIGA_TEAMS) {
      if (!existingTeamNames.includes(teamData.team_name)) {
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
          console.error(`    ❌ Error creating ${teamData.team_name}: ${error.message}`);
        }
      } else {
        console.log(`    ✅ Exists: ${teamData.team_name}`);
      }
    }

    console.log(`\n📈 Created ${created} new entries`);

    // Final verification
    await verifyFinalData();

    console.log('\n✅ Kreisliga completion finished!');

  } catch (error) {
    console.error('❌ Error during completion:', error.message);
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
      const isViktoria = teamName.toLowerCase().includes('viktoria');
      const marker = isViktoria ? '🟡' : '  ';
      
      console.log(`${marker} ${platz}. ${teamName}`);
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
    } else {
      console.log(`\n  ⚠️  Expected 16 teams, found ${kreisligaEntries.length}`);
    }

  } catch (error) {
    console.error('  ❌ Error during verification:', error.message);
  }
}

// Run the completion
completeKreisligaData();