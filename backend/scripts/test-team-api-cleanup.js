const axios = require('axios');

async function testTeamAPI() {
  try {
    console.log('🧪 Testing Team API after cleanup...');
    
    // Test GET /api/teams
    console.log('\n📡 Testing GET /api/teams...');
    const teamsResponse = await axios.get('http://localhost:1337/api/teams?populate=liga');
    const teams = teamsResponse.data.data;
    
    console.log(`✅ Found ${teams.length} teams`);
    teams.forEach(team => {
      const attributes = team.attributes;
      console.log(`- ${attributes.name} (${attributes.team_typ})`);
      console.log(`  Liga: ${attributes.liga?.data?.attributes?.name || 'No Liga'}`);
      console.log(`  Trainer: ${attributes.trainer || 'No Trainer'}`);
      console.log(`  Form: ${attributes.form_letzte_5 || 'No Form'}`);
      console.log(`  Trend: ${attributes.trend || 'neutral'}`);
      
      // Check that table statistics fields are NOT present
      const forbiddenFields = ['tabellenplatz', 'punkte', 'spiele_gesamt', 'siege', 'unentschieden', 'niederlagen', 'tore_fuer', 'tore_gegen', 'tordifferenz'];
      const presentForbiddenFields = forbiddenFields.filter(field => attributes[field] !== undefined);
      
      if (presentForbiddenFields.length > 0) {
        console.log(`  ❌ Still contains table statistics: ${presentForbiddenFields.join(', ')}`);
      } else {
        console.log(`  ✅ No table statistics fields present`);
      }
    });

    // Test that only Viktoria teams remain
    const viktoriaTeams = teams.filter(team => team.attributes.team_typ === 'viktoria_mannschaft');
    const gegnerTeams = teams.filter(team => team.attributes.team_typ === 'gegner_verein');
    
    console.log(`\n⚽ Viktoria teams: ${viktoriaTeams.length}`);
    console.log(`🏟️ Gegner teams: ${gegnerTeams.length}`);
    
    if (gegnerTeams.length === 0) {
      console.log('✅ All gegner teams successfully removed');
    } else {
      console.log('❌ Some gegner teams still present');
    }

    // Test individual team endpoint
    if (teams.length > 0) {
      const firstTeam = teams[0];
      console.log(`\n📡 Testing GET /api/teams/${firstTeam.id}...`);
      const teamResponse = await axios.get(`http://localhost:1337/api/teams/${firstTeam.id}?populate=liga`);
      const teamData = teamResponse.data.data;
      
      console.log(`✅ Individual team data for: ${teamData.attributes.name}`);
      console.log(`  Fields present: ${Object.keys(teamData.attributes).join(', ')}`);
    }

    return {
      totalTeams: teams.length,
      viktoriaTeams: viktoriaTeams.length,
      gegnerTeams: gegnerTeams.length,
      apiWorking: true
    };

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to Strapi. Please start the backend first with: npm run develop');
    } else {
      console.error('❌ Error testing Team API:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
    }
    throw error;
  }
}

// If run directly
if (require.main === module) {
  testTeamAPI().then((result) => {
    console.log('\n🎉 Team API test completed successfully!');
    console.log(`- Total teams: ${result.totalTeams}`);
    console.log(`- Viktoria teams: ${result.viktoriaTeams}`);
    console.log(`- Gegner teams: ${result.gegnerTeams}`);
    process.exit(0);
  }).catch(error => {
    console.error('❌ Team API test failed');
    process.exit(1);
  });
}

module.exports = testTeamAPI;