/**
 * Check relations via API calls (for running server)
 */

const API_BASE = 'http://localhost:1337/api';

async function fetchAPI(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

async function checkRelationsViaAPI() {
  console.log('🔍 Checking relations via API...');
  
  try {
    // Test 1: Check spieler with populated relations
    console.log('\n1️⃣ Checking spieler relations...');
    
    const spielerResponse = await fetchAPI('/spielers?populate=*');
    const spieler = spielerResponse.data;
    
    console.log(`Found ${spieler.length} spieler`);
    
    let spielerWithMannschaft = 0;
    let spielerWithHauptteam = 0;
    
    spieler.forEach(player => {
      if (player.attributes.mannschaft?.data) spielerWithMannschaft++;
      if (player.attributes.hauptteam?.data) spielerWithHauptteam++;
    });
    
    console.log(`- Spieler with mannschaft: ${spielerWithMannschaft}`);
    console.log(`- Spieler with hauptteam: ${spielerWithHauptteam}`);
    
    // Test 2: Check mannschaften
    console.log('\n2️⃣ Checking mannschaften relations...');
    
    const mannschaftenResponse = await fetchAPI('/mannschaften?populate=*');
    const mannschaften = mannschaftenResponse.data;
    
    console.log(`Found ${mannschaften.length} mannschaften`);
    
    let mannschaftenWithSpieler = 0;
    
    mannschaften.forEach((mannschaft, index) => {
      console.log(`Mannschaft ${index + 1}:`, mannschaft.attributes.name);
      console.log(`- Spieler relation:`, mannschaft.attributes.spieler ? 'exists' : 'missing');
      
      if (mannschaft.attributes.spieler?.data?.length > 0) {
        mannschaftenWithSpieler++;
        console.log(`- Has ${mannschaft.attributes.spieler.data.length} spieler`);
      }
    });
    
    console.log(`- Mannschaften with spieler: ${mannschaftenWithSpieler}`);
    
    // Test 3: Check spiele
    console.log('\n3️⃣ Checking spiele relations...');
    
    const spieleResponse = await fetchAPI('/spieles?populate=*');
    const spiele = spieleResponse.data;
    
    console.log(`Found ${spiele.length} spiele`);
    
    let spieleWithTeam = 0;
    let spieleWithMannschaft = 0;
    let spieleWithBoth = 0;
    
    spiele.forEach(spiel => {
      const hasTeam = !!spiel.attributes.unser_team?.data;
      const hasMannschaft = !!spiel.attributes.unsere_mannschaft?.data;
      
      if (hasTeam) spieleWithTeam++;
      if (hasMannschaft) spieleWithMannschaft++;
      if (hasTeam && hasMannschaft) spieleWithBoth++;
    });
    
    console.log(`- Spiele with unser_team: ${spieleWithTeam}`);
    console.log(`- Spiele with unsere_mannschaft: ${spieleWithMannschaft}`);
    console.log(`- Spiele with both: ${spieleWithBoth}`);
    
    // Test 4: Check teams
    console.log('\n4️⃣ Checking teams relations...');
    
    const teamsResponse = await fetchAPI('/teams?populate=*');
    const teams = teamsResponse.data;
    
    console.log(`Found ${teams.length} teams`);
    
    let teamsWithSpieler = 0;
    let teamsWithSpiele = 0;
    
    teams.forEach(team => {
      if (team.attributes.spieler?.data?.length > 0) {
        teamsWithSpieler++;
      }
      if (team.attributes.spiele?.data?.length > 0) {
        teamsWithSpiele++;
      }
    });
    
    console.log(`- Teams with spieler: ${teamsWithSpieler}`);
    console.log(`- Teams with spiele: ${teamsWithSpiele}`);
    
    console.log('\n🎉 API relation check completed!');
    
  } catch (error) {
    console.error('❌ Error during API check:', error.message);
    console.error('This might be because:');
    console.error('1. No data exists yet (normal for empty database)');
    console.error('2. API structure is different than expected');
    console.error('3. Relations are not properly configured');
  }
}

checkRelationsViaAPI();