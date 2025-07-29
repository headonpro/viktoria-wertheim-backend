/**
 * Script to check existing data for migration planning
 */

const { createStrapi } = require('@strapi/strapi');

async function checkMigrationData() {
  const strapi = await createStrapi();
  
  try {
    console.log('=== MIGRATION DATA CHECK ===\n');
    
    // Check existing teams
    const teams = await strapi.entityService.findMany('api::team.team', {});
    console.log('Existing teams:');
    teams.forEach(team => {
      console.log(`- ID: ${team.id}, Name: "${team.name}", Type: ${team.team_typ}`);
    });
    
    // Check existing clubs
    const clubs = await strapi.entityService.findMany('api::club.club', {});
    console.log('\nExisting clubs:');
    clubs.forEach(club => {
      console.log(`- ID: ${club.id}, Name: "${club.name}", Type: ${club.club_typ}, Mapping: ${club.viktoria_team_mapping || 'N/A'}`);
    });
    
    // Check spiele with team relations (need migration)
    const spieleWithTeams = await strapi.entityService.findMany('api::spiel.spiel', {
      filters: {
        $or: [
          { heim_team: { $notNull: true } },
          { gast_team: { $notNull: true } }
        ]
      },
      populate: {
        heim_team: true,
        gast_team: true,
        heim_club: true,
        gast_club: true,
        liga: true
      }
    });
    
    console.log(`\nSpiele records with team relations (need migration): ${spieleWithTeams.length}`);
    
    // Show sample records
    const sampleSize = Math.min(5, spieleWithTeams.length);
    console.log(`\nSample records (showing first ${sampleSize}):`);
    
    for (let i = 0; i < sampleSize; i++) {
      const spiel = spieleWithTeams[i];
      console.log(`${i + 1}. ID: ${spiel.id}`);
      console.log(`   Liga: ${spiel.liga?.name || 'N/A'}`);
      console.log(`   Heim Team: ${spiel.heim_team?.name || 'N/A'}`);
      console.log(`   Gast Team: ${spiel.gast_team?.name || 'N/A'}`);
      console.log(`   Heim Club: ${spiel.heim_club?.name || 'N/A'}`);
      console.log(`   Gast Club: ${spiel.gast_club?.name || 'N/A'}`);
      console.log(`   Status: ${spiel.status}`);
      console.log('---');
    }
    
    // Check spiele with club relations (already migrated)
    const spieleWithClubs = await strapi.entityService.findMany('api::spiel.spiel', {
      filters: {
        $and: [
          { heim_club: { $notNull: true } },
          { gast_club: { $notNull: true } }
        ]
      }
    });
    
    console.log(`\nSpiele records with club relations (already migrated): ${spieleWithClubs.length}`);
    
    // Summary
    console.log('\n=== MIGRATION SUMMARY ===');
    console.log(`Total teams: ${teams.length}`);
    console.log(`Total clubs: ${clubs.length}`);
    console.log(`Spiele needing migration: ${spieleWithTeams.length}`);
    console.log(`Spiele already migrated: ${spieleWithClubs.length}`);
    
  } catch (error) {
    console.error('Error checking migration data:', error);
  } finally {
    await strapi.destroy();
  }
}

checkMigrationData();