/**
 * Simple relation check using Strapi console
 * Run with: npm run console -- --file scripts/simple-relation-check.js
 */

module.exports = async ({ strapi }) => {
  console.log('🔍 Starting simple relations check...');
  
  try {
    // Test 1: Check spieler-mannschaft relations
    console.log('\n1️⃣ Checking spieler-mannschaft relations...');
    
    const spieler = await strapi.entityService.findMany('api::spieler.spieler', {
      populate: ['mannschaft', 'hauptteam']
    });
    
    console.log(`Found ${spieler.length} spieler`);
    
    let spielerWithMannschaft = 0;
    let spielerWithHauptteam = 0;
    let spielerWithBoth = 0;
    
    spieler.forEach(player => {
      if (player.mannschaft) spielerWithMannschaft++;
      if (player.hauptteam) spielerWithHauptteam++;
      if (player.mannschaft && player.hauptteam) spielerWithBoth++;
    });
    
    console.log(`- Spieler with mannschaft: ${spielerWithMannschaft}`);
    console.log(`- Spieler with hauptteam: ${spielerWithHauptteam}`);
    console.log(`- Spieler with both: ${spielerWithBoth}`);
    
    // Test 2: Check mannschaft-spieler reverse relations
    console.log('\n2️⃣ Checking mannschaft-spieler reverse relations...');
    
    const mannschaften = await strapi.entityService.findMany('api::mannschaft.mannschaft', {
      populate: ['spieler']
    });
    
    console.log(`Found ${mannschaften.length} mannschaften`);
    
    let mannschaftenWithSpieler = 0;
    let totalSpielerInMannschaften = 0;
    
    mannschaften.forEach(mannschaft => {
      if (mannschaft.spieler && mannschaft.spieler.length > 0) {
        mannschaftenWithSpieler++;
        totalSpielerInMannschaften += mannschaft.spieler.length;
      }
    });
    
    console.log(`- Mannschaften with spieler: ${mannschaftenWithSpieler}`);
    console.log(`- Total spieler in mannschaften: ${totalSpielerInMannschaften}`);
    
    // Test 3: Check spiel relations
    console.log('\n3️⃣ Checking spiel relations...');
    
    const spiele = await strapi.entityService.findMany('api::spiel.spiel', {
      populate: ['unser_team', 'unsere_mannschaft']
    });
    
    console.log(`Found ${spiele.length} spiele`);
    
    let spieleWithTeam = 0;
    let spieleWithMannschaft = 0;
    let spieleWithBoth = 0;
    let spieleWithNeither = 0;
    
    spiele.forEach(spiel => {
      const hasTeam = !!spiel.unser_team;
      const hasMannschaft = !!spiel.unsere_mannschaft;
      
      if (hasTeam) spieleWithTeam++;
      if (hasMannschaft) spieleWithMannschaft++;
      if (hasTeam && hasMannschaft) spieleWithBoth++;
      if (!hasTeam && !hasMannschaft) spieleWithNeither++;
    });
    
    console.log(`- Spiele with unser_team: ${spieleWithTeam}`);
    console.log(`- Spiele with unsere_mannschaft: ${spieleWithMannschaft}`);
    console.log(`- Spiele with both: ${spieleWithBoth}`);
    console.log(`- Spiele with neither: ${spieleWithNeither}`);
    
    // Test 4: Check teams
    console.log('\n4️⃣ Checking teams...');
    
    const teams = await strapi.entityService.findMany('api::team.team', {
      populate: ['spieler', 'spiele']
    });
    
    console.log(`Found ${teams.length} teams`);
    
    let teamsWithSpieler = 0;
    let teamsWithSpiele = 0;
    let totalSpielerInTeams = 0;
    let totalSpieleInTeams = 0;
    
    teams.forEach(team => {
      if (team.spieler && team.spieler.length > 0) {
        teamsWithSpieler++;
        totalSpielerInTeams += team.spieler.length;
      }
      if (team.spiele && team.spiele.length > 0) {
        teamsWithSpiele++;
        totalSpieleInTeams += team.spiele.length;
      }
    });
    
    console.log(`- Teams with spieler: ${teamsWithSpieler}`);
    console.log(`- Teams with spiele: ${teamsWithSpiele}`);
    console.log(`- Total spieler in teams: ${totalSpielerInTeams}`);
    console.log(`- Total spiele in teams: ${totalSpieleInTeams}`);
    
    // Summary
    console.log('\n📋 Summary:');
    console.log('✅ Basic relation check completed');
    
    if (spieleWithNeither > 0) {
      console.log(`⚠️ ${spieleWithNeither} spiele have neither team nor mannschaft`);
    }
    
    if (spielerWithMannschaft !== totalSpielerInMannschaften) {
      console.log(`⚠️ Spieler-Mannschaft relation mismatch: ${spielerWithMannschaft} vs ${totalSpielerInMannschaften}`);
    }
    
    if (spielerWithHauptteam !== totalSpielerInTeams) {
      console.log(`⚠️ Spieler-Team relation mismatch: ${spielerWithHauptteam} vs ${totalSpielerInTeams}`);
    }
    
    console.log('🎉 Relation check completed!');
    
  } catch (error) {
    console.error('❌ Error during relation check:', error);
  }
};