const axios = require('axios');

// Strapi API Configuration
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN; // Optional: für Production

// Teams data from Mock-Data (Kreisliga Tauberbischofsheim)
const teams = [
  { position: 1, teamname: 'FC Umpfertal' },
  { position: 2, teamname: 'FC Hundheim-Steinbach' },
  { position: 3, teamname: 'FV Brehmbachtal' },
  { position: 4, teamname: 'Kickers DHK Wertheim' },
  { position: 5, teamname: 'SG RaMBo' },
  { position: 6, teamname: 'SV Pülfringen' },
  { position: 7, teamname: 'SV Schönfeld' },
  { position: 8, teamname: 'SV Viktoria Wertheim' },
  { position: 9, teamname: 'SpG Impfingen/Tauberbischofsheim 2' },
  { position: 10, teamname: 'SpG Schwabhausen/Windischbuch' },
  { position: 11, teamname: 'TSV Assamstadt' },
  { position: 12, teamname: 'TSV Kreuzwertheim' },
  { position: 13, teamname: 'TuS Großrinderfeld' },
  { position: 14, teamname: 'Türkgücü Wertheim' },
  { position: 15, teamname: 'VfB Reicholzheim' },
  { position: 16, teamname: 'VfR Gerlachsheim' }
];

// Create leaderboard entry
async function createLeaderboardEntry(team) {
  const data = {
    data: {
      position: team.position,
      teamname: team.teamname,
      spiele: 0,
      siege: 0,
      unentschieden: 0,
      niederlagen: 0,
      tore: 0,
      gegentore: 0,
      tordifferenz: 0,
      punkte: 0,
      publishedAt: new Date().toISOString() // Auto-publish
    }
  };

  const config = {
    headers: {
      'Content-Type': 'application/json',
    }
  };

  // Add authorization if token is provided
  if (API_TOKEN) {
    config.headers['Authorization'] = `Bearer ${API_TOKEN}`;
  }

  try {
    const response = await axios.post(
      `${STRAPI_URL}/api/leaderboard-entries`,
      data,
      config
    );
    
    console.log(`✅ ${team.teamname} (Position ${team.position}) erfolgreich erstellt`);
    return response.data;
  } catch (error) {
    console.error(`❌ Fehler beim Erstellen von ${team.teamname}:`, error.response?.data || error.message);
    throw error;
  }
}

// Clear existing entries (optional)
async function clearExistingEntries() {
  try {
    console.log('🧹 Lösche bestehende Einträge...');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (API_TOKEN) {
      config.headers['Authorization'] = `Bearer ${API_TOKEN}`;
    }

    // Get all existing entries
    const response = await axios.get(`${STRAPI_URL}/api/leaderboard-entries`, config);
    const existingEntries = response.data.data;

    // Delete each entry
    for (const entry of existingEntries) {
      await axios.delete(`${STRAPI_URL}/api/leaderboard-entries/${entry.id}`, config);
      console.log(`🗑️  Eintrag ${entry.id} gelöscht`);
    }

    console.log('✅ Alle bestehenden Einträge gelöscht');
  } catch (error) {
    console.error('❌ Fehler beim Löschen bestehender Einträge:', error.response?.data || error.message);
    // Continue anyway - maybe there were no entries to delete
  }
}

// Main seeding function
async function seedLeaderboard() {
  console.log('🚀 Starte Leaderboard Seeding...');
  console.log(`📡 Strapi URL: ${STRAPI_URL}`);
  console.log(`👥 Teams zu erstellen: ${teams.length}`);
  console.log('');

  try {
    // Optional: Clear existing entries first
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      await clearExistingEntries();
      console.log('');
    }

    // Create all teams
    console.log('📝 Erstelle Teams...');
    let successCount = 0;
    let errorCount = 0;

    for (const team of teams) {
      try {
        await createLeaderboardEntry(team);
        successCount++;
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        errorCount++;
      }
    }

    console.log('');
    console.log('📊 Zusammenfassung:');
    console.log(`✅ Erfolgreich erstellt: ${successCount}`);
    console.log(`❌ Fehler: ${errorCount}`);
    console.log(`📈 Gesamt: ${teams.length}`);

    if (successCount === teams.length) {
      console.log('');
      console.log('🎉 Leaderboard erfolgreich erstellt!');
      console.log('🌐 Du kannst jetzt die Frontend-Tabelle testen.');
    } else {
      console.log('');
      console.log('⚠️  Einige Einträge konnten nicht erstellt werden.');
      console.log('💡 Prüfe die Strapi-Verbindung und API-Permissions.');
    }

  } catch (error) {
    console.error('💥 Kritischer Fehler beim Seeding:', error.message);
    process.exit(1);
  }
}

// Help text
function showHelp() {
  console.log('');
  console.log('🏆 Leaderboard Seeding Script');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/seed-leaderboard.js           # Erstelle Teams');
  console.log('  node scripts/seed-leaderboard.js --clear   # Lösche alte + erstelle neue Teams');
  console.log('');
  console.log('Environment Variables:');
  console.log('  STRAPI_URL=http://localhost:1337          # Strapi Base URL');
  console.log('  STRAPI_API_TOKEN=your_token_here          # Optional: API Token für Production');
  console.log('');
}

// Run the script
if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
  } else {
    seedLeaderboard();
  }
}

module.exports = { seedLeaderboard, teams };