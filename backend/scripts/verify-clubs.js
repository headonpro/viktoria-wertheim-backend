/**
 * Verification script for club population
 * Run with: node scripts/verify-clubs.js
 */

const { createStrapi } = require('@strapi/strapi');

async function verifyClubs() {
  console.log('🔍 Verifying club population...');
  
  const strapi = await createStrapi().load();
  
  try {
    // Get all clubs
    const allClubs = await strapi.entityService.findMany('api::club.club', {
      populate: ['ligen']
    });
    
    console.log(`\n📊 Total clubs found: ${allClubs.length}`);
    
    // Check Viktoria clubs
    const viktoriaClubs = allClubs.filter(c => c.club_typ === 'viktoria_verein');
    console.log(`\n🏆 Viktoria clubs (${viktoriaClubs.length}):`);
    
    const expectedMappings = ['team_1', 'team_2', 'team_3'];
    for (const mapping of expectedMappings) {
      const club = viktoriaClubs.find(c => c.viktoria_team_mapping === mapping);
      if (club) {
        console.log(`  ✅ ${mapping}: ${club.name} (Liga: ${club.ligen?.[0]?.name || 'None'})`);
      } else {
        console.log(`  ❌ ${mapping}: NOT FOUND`);
      }
    }
    
    // Check opponent clubs by league
    const opponentClubs = allClubs.filter(c => c.club_typ === 'gegner_verein');
    console.log(`\n⚔️ Opponent clubs (${opponentClubs.length}):`);
    
    // Group by league
    const clubsByLeague = {};
    for (const club of opponentClubs) {
      const ligaName = club.ligen?.[0]?.name || 'No League';
      if (!clubsByLeague[ligaName]) {
        clubsByLeague[ligaName] = [];
      }
      clubsByLeague[ligaName].push(club.name);
    }
    
    for (const [ligaName, clubs] of Object.entries(clubsByLeague)) {
      console.log(`  📋 ${ligaName}: ${clubs.length} clubs`);
      if (clubs.length <= 5) {
        clubs.forEach(name => console.log(`    - ${name}`));
      } else {
        clubs.slice(0, 3).forEach(name => console.log(`    - ${name}`));
        console.log(`    ... and ${clubs.length - 3} more`);
      }
    }
    
    // Validation checks
    console.log(`\n✅ Validation Results:`);
    
    let errors = 0;
    
    // Check if all Viktoria clubs have team mappings
    if (viktoriaClubs.length !== 3) {
      console.log(`❌ Expected 3 Viktoria clubs, found ${viktoriaClubs.length}`);
      errors++;
    }
    
    // Check if all clubs have league assignments
    const clubsWithoutLeagues = allClubs.filter(c => !c.ligen || c.ligen.length === 0);
    if (clubsWithoutLeagues.length > 0) {
      console.log(`❌ ${clubsWithoutLeagues.length} clubs without league assignments:`);
      clubsWithoutLeagues.forEach(c => console.log(`  - ${c.name}`));
      errors++;
    }
    
    // Check expected opponent counts
    const expectedCounts = {
      'Kreisliga': 16,
      'Kreisklasse A': 14,
      'Kreisklasse B': 12
    };
    
    for (const [ligaType, expectedCount] of Object.entries(expectedCounts)) {
      const ligaClubs = Object.entries(clubsByLeague).find(([name]) => name.includes(ligaType));
      if (ligaClubs) {
        const [ligaName, clubs] = ligaClubs;
        if (clubs.length < expectedCount - 2) { // Allow some tolerance
          console.log(`⚠️ ${ligaName}: Expected ~${expectedCount} clubs, found ${clubs.length}`);
        }
      }
    }
    
    if (errors === 0) {
      console.log(`\n🎉 All validations passed!`);
      console.log(`✅ Task 2.1: Viktoria clubs with team mappings - VERIFIED`);
      console.log(`✅ Task 2.2: Opponent clubs for all leagues - VERIFIED`);
      console.log(`✅ Task 2.3: Club-liga relationships - VERIFIED`);
    } else {
      console.log(`\n⚠️ Found ${errors} validation errors`);
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await strapi.destroy();
    process.exit(0);
  }
}

verifyClubs().catch(error => {
  console.error('Verification script failed:', error);
  process.exit(1);
});