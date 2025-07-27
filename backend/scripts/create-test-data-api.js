/**
 * API-based script to create test data for all three Mannschaften (teams)
 * Creates realistic Last Game Cards and Next Game Cards for teams m1, m2, m3
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337/api';

async function createTestData() {
  console.log('🚀 Starting test data creation for all three Mannschaften...');

  try {
    // First, create some opponent teams if they don't exist
    const opponentTeams = [
      { name: 'SV Würzburg 05', team_typ: 'gegner_verein' },
      { name: 'FC Schweinfurt 05', team_typ: 'gegner_verein' },
      { name: 'TSV 1860 Rostock', team_typ: 'gegner_verein' },
      { name: 'SpVgg Greuther Fürth II', team_typ: 'gegner_verein' },
      { name: 'FC Augsburg II', team_typ: 'gegner_verein' },
      { name: 'TSV 1860 München II', team_typ: 'gegner_verein' },
      { name: 'SV Darmstadt 98 II', team_typ: 'gegner_verein' },
      { name: 'FC Nürnberg II', team_typ: 'gegner_verein' },
      { name: 'SV Sandhausen II', team_typ: 'gegner_verein' }
    ];

    console.log('📝 Creating opponent teams...');
    
    // Get existing teams
    const existingTeamsResponse = await axios.get(`${API_BASE_URL}/teams`);
    const existingTeams = existingTeamsResponse.data.data || [];
    
    const createdTeams = [];
    
    for (const teamData of opponentTeams) {
      // Check if team already exists
      const existingTeam = existingTeams.find(t => t.name === teamData.name);

      if (!existingTeam) {
        try {
          const response = await axios.post(`${API_BASE_URL}/teams`, {
            data: teamData
          });
          createdTeams.push(response.data.data);
          console.log(`✅ Created team: ${response.data.data.name}`);
        } catch (error) {
          console.error(`❌ Error creating team ${teamData.name}:`, error.response?.data || error.message);
        }
      } else {
        createdTeams.push(existingTeam);
        console.log(`ℹ️  Team already exists: ${existingTeam.name}`);
      }
    }

    // Clear existing test data to avoid duplicates (keep only the most recent ones)
    console.log('🧹 Clearing old test data...');
    
    try {
      const existingGameCards = await axios.get(`${API_BASE_URL}/game-cards`);
      const existingNextGameCards = await axios.get(`${API_BASE_URL}/next-game-cards`);
      
      // Delete existing game cards
      for (const card of existingGameCards.data.data || []) {
        try {
          await axios.delete(`${API_BASE_URL}/game-cards/${card.documentId}`);
          console.log(`🗑️  Deleted old game card: ${card.gegner}`);
        } catch (error) {
          console.warn(`⚠️  Could not delete game card ${card.id}:`, error.response?.data || error.message);
        }
      }
      
      // Delete existing next game cards
      for (const card of existingNextGameCards.data.data || []) {
        try {
          await axios.delete(`${API_BASE_URL}/next-game-cards/${card.documentId}`);
          console.log(`🗑️  Deleted old next game card`);
        } catch (error) {
          console.warn(`⚠️  Could not delete next game card ${card.id}:`, error.response?.data || error.message);
        }
      }
    } catch (error) {
      console.warn('⚠️  Error during cleanup:', error.response?.data || error.message);
    }

    // Create Last Game Cards for all three teams
    console.log('🏆 Creating Last Game Cards...');
    
    const lastGameCards = [
      // 1. Mannschaft (m1) - Recent victory
      {
        datum: '2025-01-20T15:00:00.000Z',
        gegner: 'SV Würzburg 05',
        ist_heimspiel: true,
        unsere_tore: 3,
        gegner_tore: 1,
        mannschaft: 'm1'
      },
      // 2. Mannschaft (m2) - Close defeat
      {
        datum: '2025-01-19T14:00:00.000Z',
        gegner: 'FC Schweinfurt 05',
        ist_heimspiel: false,
        unsere_tore: 1,
        gegner_tore: 2,
        mannschaft: 'm2'
      },
      // 3. Mannschaft (m3) - Draw
      {
        datum: '2025-01-18T13:30:00.000Z',
        gegner: 'TSV 1860 Rostock',
        ist_heimspiel: true,
        unsere_tore: 2,
        gegner_tore: 2,
        mannschaft: 'm3'
      }
    ];

    for (const gameData of lastGameCards) {
      try {
        const response = await axios.post(`${API_BASE_URL}/game-cards`, {
          data: gameData
        });
        console.log(`✅ Created Last Game Card for ${gameData.mannschaft}: ${gameData.gegner} (${gameData.unsere_tore}:${gameData.gegner_tore})`);
      } catch (error) {
        console.error(`❌ Error creating Last Game Card for ${gameData.mannschaft}:`, error.response?.data || error.message);
      }
    }

    // Create Next Game Cards for all three teams
    console.log('⏭️  Creating Next Game Cards...');
    
    // Get all teams to find IDs for relations
    const allTeamsResponse = await axios.get(`${API_BASE_URL}/teams`);
    const allTeams = allTeamsResponse.data.data || [];
    
    const nextGameCards = [
      // 1. Mannschaft (m1) - Home game
      {
        datum: '2025-01-27T15:00:00.000Z',
        gegner_team: allTeams.find(t => t.name === 'SpVgg Greuther Fürth II')?.id,
        ist_heimspiel: true,
        mannschaft: 'm1'
      },
      // 2. Mannschaft (m2) - Away game
      {
        datum: '2025-01-26T14:00:00.000Z',
        gegner_team: allTeams.find(t => t.name === 'FC Augsburg II')?.id,
        ist_heimspiel: false,
        mannschaft: 'm2'
      },
      // 3. Mannschaft (m3) - Home game
      {
        datum: '2025-01-25T13:30:00.000Z',
        gegner_team: allTeams.find(t => t.name === 'TSV 1860 München II')?.id,
        ist_heimspiel: true,
        mannschaft: 'm3'
      }
    ];

    for (const gameData of nextGameCards) {
      if (gameData.gegner_team) {
        try {
          const response = await axios.post(`${API_BASE_URL}/next-game-cards`, {
            data: gameData
          });
          const teamName = allTeams.find(t => t.id === gameData.gegner_team)?.name;
          console.log(`✅ Created Next Game Card for ${gameData.mannschaft}: vs ${teamName} (${gameData.ist_heimspiel ? 'Home' : 'Away'})`);
        } catch (error) {
          console.error(`❌ Error creating Next Game Card for ${gameData.mannschaft}:`, error.response?.data || error.message);
        }
      } else {
        console.warn(`⚠️  Could not find opponent team for ${gameData.mannschaft}`);
      }
    }

    console.log('🎉 Test data creation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Created ${lastGameCards.length} Last Game Cards`);
    console.log(`- Created ${nextGameCards.length} Next Game Cards`);
    console.log(`- Created/verified ${createdTeams.length} opponent teams`);

    // Verify the data by querying each team
    console.log('\n🔍 Verifying created data...');
    
    for (const team of ['m1', 'm2', 'm3']) {
      try {
        const lastGameResponse = await axios.get(`${API_BASE_URL}/game-cards?filters[mannschaft][$eq]=${team}`);
        const nextGameResponse = await axios.get(`${API_BASE_URL}/next-game-cards?filters[mannschaft][$eq]=${team}&populate=gegner_team`);
        
        const lastGame = lastGameResponse.data.data?.[0];
        const nextGame = nextGameResponse.data.data?.[0];

        console.log(`\n${team.toUpperCase()}:`);
        if (lastGame) {
          console.log(`  Last Game: ${lastGame.gegner} (${lastGame.unsere_tore}:${lastGame.gegner_tore}) - ${lastGame.ist_heimspiel ? 'Home' : 'Away'}`);
        } else {
          console.log(`  Last Game: No data found`);
        }
        if (nextGame) {
          console.log(`  Next Game: vs ${nextGame.gegner_team?.name} - ${nextGame.ist_heimspiel ? 'Home' : 'Away'}`);
        } else {
          console.log(`  Next Game: No data found`);
        }
      } catch (error) {
        console.error(`❌ Error verifying data for ${team}:`, error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error creating test data:', error.response?.data || error.message);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  createTestData()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createTestData };