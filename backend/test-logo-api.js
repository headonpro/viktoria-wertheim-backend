const axios = require('axios');

async function testLogoAPI() {
  try {
    console.log('Testing team logo API...\n');
    
    // Test 1: Get all entries with team_logo populated
    console.log('1. Getting all entries with team_logo populated...');
    const allResponse = await axios.get('http://localhost:1337/api/tabellen-eintraege?populate=liga,team_logo');
    
    console.log(`Found ${allResponse.data.data.length} entries`);
    
    // Test 2: Find SV Viktoria Wertheim specifically
    console.log('\n2. Looking for SV Viktoria Wertheim...');
    const viktoriaEntries = allResponse.data.data.filter(entry => 
      entry.team_name.includes('Viktoria Wertheim')
    );
    
    console.log(`Found ${viktoriaEntries.length} Viktoria entries:`);
    
    viktoriaEntries.forEach(entry => {
      console.log(`\n   Team: ${entry.team_name}`);
      console.log(`   Liga: ${entry.liga?.name || 'N/A'}`);
      console.log(`   Logo: ${entry.team_logo ? 'YES' : 'NO'}`);
      
      if (entry.team_logo) {
        console.log(`   Logo URL: ${entry.team_logo.url}`);
        console.log(`   Logo ID: ${entry.team_logo.id}`);
        console.log(`   Alt Text: ${entry.team_logo.alternativeText || 'N/A'}`);
      }
    });
    
    // Test 3: Check if any entries have logos
    console.log('\n3. Checking all entries for logos...');
    const entriesWithLogos = allResponse.data.data.filter(entry => entry.team_logo);
    console.log(`Entries with logos: ${entriesWithLogos.length}/${allResponse.data.data.length}`);
    
    if (entriesWithLogos.length > 0) {
      console.log('\nEntries with logos:');
      entriesWithLogos.forEach(entry => {
        console.log(`   - ${entry.team_name}: ${entry.team_logo.url}`);
      });
    }
    
  } catch (error) {
    console.error('Error testing logo API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testLogoAPI();