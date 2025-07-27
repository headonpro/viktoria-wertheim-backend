async function checkCurrentTeams() {
  const { createStrapi } = require('@strapi/strapi');
  
  let strapiInstance;
  
  try {
    console.log('🔍 Starting Strapi and checking current teams...');
    
    strapiInstance = await createStrapi().load();
    
    const teams = await strapiInstance.entityService.findMany('api::team.team', {
      populate: ['liga']
    });
    
    console.log(`\n📊 Found ${teams.length} teams:`);
    teams.forEach(team => {
      console.log(`- ${team.name} (${team.team_typ}) - Liga: ${team.liga?.name || 'No Liga'}`);
      console.log(`  Tabellenplatz: ${team.tabellenplatz}, Punkte: ${team.punkte}, Spiele: ${team.spiele_gesamt}`);
    });
    
    const viktoriaTeams = teams.filter(team => team.team_typ === 'viktoria_mannschaft');
    console.log(`\n⚽ Viktoria teams: ${viktoriaTeams.length}`);
    viktoriaTeams.forEach(team => {
      console.log(`- ${team.name}`);
    });
    
    const gegnerTeams = teams.filter(team => team.team_typ === 'gegner_verein');
    console.log(`\n🏟️ Gegner teams to be removed: ${gegnerTeams.length}`);
    gegnerTeams.forEach(team => {
      console.log(`- ${team.name}`);
    });
    
    return { viktoriaTeams, gegnerTeams };
    
  } catch (error) {
    console.error('❌ Error checking teams:', error);
    throw error;
  } finally {
    if (strapiInstance) {
      await strapiInstance.destroy();
    }
  }
}

module.exports = checkCurrentTeams;

// If run directly
if (require.main === module) {
  checkCurrentTeams().then(() => {
    console.log('✅ Check completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}