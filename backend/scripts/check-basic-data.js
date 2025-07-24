/**
 * Check basic data availability
 * Run with: npm run console -- --file scripts/check-basic-data.js
 */

module.exports = async ({ strapi }) => {
  console.log('🔍 Checking basic data availability...');
  
  try {
    // Check all content types
    const contentTypes = [
      'api::saison.saison',
      'api::liga.liga', 
      'api::club.club',
      'api::team.team',
      'api::mannschaft.mannschaft',
      'api::spieler.spieler',
      'api::spiel.spiel',
      'api::mitglied.mitglied'
    ];
    
    const results = {};
    
    for (const contentType of contentTypes) {
      try {
        const items = await strapi.entityService.findMany(contentType);
        const count = Array.isArray(items) ? items.length : (items ? 1 : 0);
        results[contentType] = count;
        console.log(`✅ ${contentType}: ${count} entries`);
      } catch (error) {
        results[contentType] = `ERROR: ${error.message}`;
        console.log(`❌ ${contentType}: ERROR - ${error.message}`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('='.repeat(50));
    
    Object.entries(results).forEach(([type, count]) => {
      const name = type.split('.').pop();
      if (typeof count === 'number') {
        console.log(`${name.padEnd(15)}: ${count.toString().padStart(3)} entries`);
      } else {
        console.log(`${name.padEnd(15)}: ${count}`);
      }
    });
    
    // Check if we have the minimum data needed
    console.log('\n🎯 Data Requirements Check:');
    
    const hasBasicData = results['api::saison.saison'] > 0 && 
                        results['api::club.club'] > 0 && 
                        results['api::liga.liga'] > 0;
    
    if (hasBasicData) {
      console.log('✅ Basic data (saison, club, liga) available');
    } else {
      console.log('❌ Missing basic data - need at least 1 saison, club, and liga');
    }
    
    const hasTeamData = results['api::team.team'] > 0 || results['api::mannschaft.mannschaft'] > 0;
    
    if (hasTeamData) {
      console.log('✅ Team data available');
    } else {
      console.log('❌ No team or mannschaft data found');
    }
    
    if (results['api::spieler.spieler'] === 0) {
      console.log('⚠️ No spieler data - relation tests will be limited');
    } else {
      console.log('✅ Spieler data available for relation testing');
    }
    
    if (results['api::spiel.spiel'] === 0) {
      console.log('⚠️ No spiel data - match relation tests will be limited');
    } else {
      console.log('✅ Spiel data available for relation testing');
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    
    if (results['api::spieler.spieler'] === 0) {
      console.log('1. Create some test spieler to test player relations');
      console.log('2. Run: node scripts/create-teams.js (if available)');
    }
    
    if (results['api::spiel.spiel'] === 0) {
      console.log('3. Create some test spiele to test match relations');
    }
    
    if (!hasBasicData) {
      console.log('4. Create basic data first: saison, clubs, ligas');
    }
    
    console.log('\n🎉 Basic data check completed!');
    
  } catch (error) {
    console.error('❌ Error during basic data check:', error);
  }
};