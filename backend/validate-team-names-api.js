const axios = require('axios');

async function validateTeamNamesViaAPI() {
  console.log('🔍 Starting team_name field validation via API...\n');
  
  try {
    // Fetch all tabellen-eintrag entries via API
    const response = await axios.get('http://localhost:1337/api/tabellen-eintraege?populate=*');
    const allEntries = response.data.data;
    
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
        const liga = entry.liga?.name || 'N/A';
        const team = entry.team?.name || 'N/A';
        console.log(`  ${index + 1}. ID: ${entry.id}, Liga: ${liga}, Team: ${team}`);
      });
    }
    
    // Check team_name consistency with team relation
    console.log('\n🔍 Checking team_name consistency with team relation...');
    const inconsistentEntries = allEntries.filter(entry => {
      const teamName = entry.team?.name;
      return teamName && entry.team_name !== teamName;
    });
    
    if (inconsistentEntries.length === 0) {
      console.log('✅ All team_name fields are consistent with team relations!');
    } else {
      console.log(`⚠️  Found ${inconsistentEntries.length} entries with inconsistent team_name vs team.name:`);
      inconsistentEntries.forEach((entry, index) => {
        const liga = entry.liga?.name || 'N/A';
        const teamName = entry.team?.name;
        console.log(`  ${index + 1}. ID: ${entry.id}`);
        console.log(`     team_name: "${entry.team_name}"`);
        console.log(`     team.name: "${teamName}"`);
        console.log(`     Liga: ${liga}\n`);
      });
    }
    
    // Display sample of team names for verification
    console.log('\n📋 Sample team names (first 10 entries):');
    console.log('-'.repeat(50));
    allEntries.slice(0, 10).forEach((entry, index) => {
      const liga = entry.liga?.name || 'N/A';
      console.log(`  ${index + 1}. "${entry.team_name}" (Liga: ${liga})`);
    });
    
    // Summary statistics
    const entriesWithTeamRelation = allEntries.filter(e => e.team);
    console.log('\n📈 Summary Statistics:');
    console.log('-'.repeat(50));
    console.log(`Total entries: ${allEntries.length}`);
    console.log(`Empty team_name fields: ${emptyTeamNames.length}`);
    console.log(`Inconsistent team_name/team.name: ${inconsistentEntries.length}`);
    console.log(`Entries with team relation: ${entriesWithTeamRelation.length}`);
    console.log(`Entries without team relation: ${allEntries.length - entriesWithTeamRelation.length}`);
    
    // Validation result
    const isValid = emptyTeamNames.length === 0;
    console.log(`\n${isValid ? '✅' : '❌'} Validation ${isValid ? 'PASSED' : 'FAILED'}`);
    
    return isValid;
    
  } catch (error) {
    console.error('❌ Error during validation:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

validateTeamNamesViaAPI()
  .then(isValid => process.exit(isValid ? 0 : 1))
  .catch(() => process.exit(1));