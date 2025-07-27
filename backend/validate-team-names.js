const strapi = require('@strapi/strapi');

async function validateTeamNames() {
  console.log('🔍 Starting team_name field validation...\n');
  
  try {
    // Initialize Strapi
    const app = await strapi.createStrapi().load();
    
    // Get all tabellen-eintrag entries
    const allEntries = await strapi.entityService.findMany(
      'api::tabellen-eintrag.tabellen-eintrag',
      {
        populate: ['liga', 'team']
      }
    );
    
    console.log(`📊 Total tabellen-eintrag entries found: ${allEntries.length}\n`);
    
    // Check for empty or null team_name fields
    const emptyTeamNames = allEntries.filter(entry => 
      !entry.team_name || entry.team_name.trim() === ''
    );
    
    console.log('🔍 Validation Results:');
    console.log('='.repeat(50));
    
    if (emptyTeamNames.length === 0) {
      console.log('✅ All team_name fields are properly populated!');
    } else {
      console.log(`❌ Found ${emptyTeamNames.length} entries with empty team_name fields:`);
      emptyTeamNames.forEach((entry, index) => {
        console.log(`  ${index + 1}. ID: ${entry.id}, Liga: ${entry.liga?.name || 'N/A'}, Team: ${entry.team?.name || 'N/A'}`);
      });
    }
    
    // Check team_name consistency with team relation
    console.log('\n🔍 Checking team_name consistency with team relation...');
    const inconsistentEntries = allEntries.filter(entry => 
      entry.team && entry.team.name && entry.team_name !== entry.team.name
    );
    
    if (inconsistentEntries.length === 0) {
      console.log('✅ All team_name fields are consistent with team relations!');
    } else {
      console.log(`⚠️  Found ${inconsistentEntries.length} entries with inconsistent team_name vs team.name:`);
      inconsistentEntries.forEach((entry, index) => {
        console.log(`  ${index + 1}. ID: ${entry.id}`);
        console.log(`     team_name: "${entry.team_name}"`);
        console.log(`     team.name: "${entry.team.name}"`);
        console.log(`     Liga: ${entry.liga?.name || 'N/A'}\n`);
      });
    }
    
    // Display sample of team names for verification
    console.log('\n📋 Sample team names (first 10 entries):');
    console.log('-'.repeat(50));
    allEntries.slice(0, 10).forEach((entry, index) => {
      console.log(`  ${index + 1}. "${entry.team_name}" (Liga: ${entry.liga?.name || 'N/A'})`);
    });
    
    // Summary statistics
    console.log('\n📈 Summary Statistics:');
    console.log('-'.repeat(50));
    console.log(`Total entries: ${allEntries.length}`);
    console.log(`Empty team_name fields: ${emptyTeamNames.length}`);
    console.log(`Inconsistent team_name/team.name: ${inconsistentEntries.length}`);
    console.log(`Entries with team relation: ${allEntries.filter(e => e.team).length}`);
    console.log(`Entries without team relation: ${allEntries.filter(e => !e.team).length}`);
    
    // Validation result
    const isValid = emptyTeamNames.length === 0;
    console.log(`\n${isValid ? '✅' : '❌'} Validation ${isValid ? 'PASSED' : 'FAILED'}`);
    
    await app.destroy();
    process.exit(isValid ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    process.exit(1);
  }
}

validateTeamNames();