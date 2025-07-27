const axios = require('axios');

async function checkTeamsViaAPI() {
  try {
    console.log('🔍 Checking teams via API...');
    
    const response = await axios.get('http://localhost:1337/api/teams?populate=liga');
    const teams = response.data.data;
    
    console.log(`\n📊 Found ${teams.length} teams:`);
    teams.forEach(team => {
      const attributes = team.attributes;
      console.log(`- ${attributes.name} (${attributes.team_typ}) - Liga: ${attributes.liga?.data?.attributes?.name || 'No Liga'}`);
      console.log(`  Tabellenplatz: ${attributes.tabellenplatz}, Punkte: ${attributes.punkte}, Spiele: ${attributes.spiele_gesamt}`);
    });
    
    const viktoriaTeams = teams.filter(team => team.attributes.team_typ === 'viktoria_mannschaft');
    console.log(`\n⚽ Viktoria teams: ${viktoriaTeams.length}`);
    viktoriaTeams.forEach(team => {
      console.log(`- ${team.attributes.name}`);
    });
    
    const gegnerTeams = teams.filter(team => team.attributes.team_typ === 'gegner_verein');
    console.log(`\n🏟️ Gegner teams to be removed: ${gegnerTeams.length}`);
    gegnerTeams.forEach(team => {
      console.log(`- ${team.attributes.name}`);
    });
    
    return { viktoriaTeams, gegnerTeams };
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to Strapi. Please start the backend first with: npm run develop');
    } else {
      console.error('❌ Error checking teams:', error.message);
    }
    throw error;
  }
}

// If run directly
if (require.main === module) {
  checkTeamsViaAPI().then(() => {
    console.log('✅ Check completed');
    process.exit(0);
  }).catch(error => {
    process.exit(1);
  });
}

module.exports = checkTeamsViaAPI;