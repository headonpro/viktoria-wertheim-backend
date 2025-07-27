/**
 * Script to test API filters for mannschaftsspezifische game cards
 * Verifies that the filtering works correctly for all three teams
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337/api';

async function testAPIFilters() {
  console.log('🧪 Testing API filters for mannschaftsspezifische game cards...\n');

  try {
    // Test Last Game Cards filtering
    console.log('🏆 Testing Last Game Cards filtering:');
    
    for (const team of ['m1', 'm2', 'm3']) {
      try {
        const response = await axios.get(`${API_BASE_URL}/game-cards?filters[mannschaft][$eq]=${team}`);
        const gameCards = response.data.data || [];
        
        console.log(`\n${team.toUpperCase()}:`);
        console.log(`  API URL: /api/game-cards?filters[mannschaft][$eq]=${team}`);
        console.log(`  Results found: ${gameCards.length}`);
        
        if (gameCards.length > 0) {
          const card = gameCards[0];
          console.log(`  Game: ${card.gegner} (${card.unsere_tore}:${card.gegner_tore})`);
          console.log(`  Date: ${new Date(card.datum).toLocaleDateString('de-DE')}`);
          console.log(`  Home game: ${card.ist_heimspiel ? 'Yes' : 'No'}`);
          console.log(`  Mannschaft field: ${card.mannschaft}`);
          
          // Verify the mannschaft field matches the filter
          if (card.mannschaft === team) {
            console.log(`  ✅ Filter working correctly`);
          } else {
            console.log(`  ❌ Filter error: Expected ${team}, got ${card.mannschaft}`);
          }
        } else {
          console.log(`  ⚠️  No data found for ${team}`);
        }
      } catch (error) {
        console.error(`  ❌ Error testing ${team}:`, error.response?.data || error.message);
      }
    }

    // Test Next Game Cards filtering
    console.log('\n\n⏭️  Testing Next Game Cards filtering:');
    
    for (const team of ['m1', 'm2', 'm3']) {
      try {
        const response = await axios.get(`${API_BASE_URL}/next-game-cards?filters[mannschaft][$eq]=${team}&populate=gegner_team`);
        const gameCards = response.data.data || [];
        
        console.log(`\n${team.toUpperCase()}:`);
        console.log(`  API URL: /api/next-game-cards?filters[mannschaft][$eq]=${team}&populate=gegner_team`);
        console.log(`  Results found: ${gameCards.length}`);
        
        if (gameCards.length > 0) {
          const card = gameCards[0];
          console.log(`  Game: vs ${card.gegner_team?.name || 'Unknown opponent'}`);
          console.log(`  Date: ${new Date(card.datum).toLocaleDateString('de-DE')}`);
          console.log(`  Home game: ${card.ist_heimspiel ? 'Yes' : 'No'}`);
          console.log(`  Mannschaft field: ${card.mannschaft}`);
          
          // Verify the mannschaft field matches the filter
          if (card.mannschaft === team) {
            console.log(`  ✅ Filter working correctly`);
          } else {
            console.log(`  ❌ Filter error: Expected ${team}, got ${card.mannschaft}`);
          }
        } else {
          console.log(`  ⚠️  No data found for ${team}`);
        }
      } catch (error) {
        console.error(`  ❌ Error testing ${team}:`, error.response?.data || error.message);
      }
    }

    // Test cross-contamination (ensure filters don't return wrong data)
    console.log('\n\n🔍 Testing cross-contamination prevention:');
    
    try {
      const allGameCards = await axios.get(`${API_BASE_URL}/game-cards`);
      const allNextGameCards = await axios.get(`${API_BASE_URL}/next-game-cards`);
      
      console.log(`\nAll Game Cards: ${allGameCards.data.data?.length || 0} total`);
      console.log(`All Next Game Cards: ${allNextGameCards.data.data?.length || 0} total`);
      
      // Check that each team has exactly one game card
      const gameCardsByTeam = {};
      const nextGameCardsByTeam = {};
      
      (allGameCards.data.data || []).forEach(card => {
        gameCardsByTeam[card.mannschaft] = (gameCardsByTeam[card.mannschaft] || 0) + 1;
      });
      
      (allNextGameCards.data.data || []).forEach(card => {
        nextGameCardsByTeam[card.mannschaft] = (nextGameCardsByTeam[card.mannschaft] || 0) + 1;
      });
      
      console.log('\nGame Cards distribution:');
      Object.entries(gameCardsByTeam).forEach(([team, count]) => {
        console.log(`  ${team}: ${count} card(s) ${count === 1 ? '✅' : '⚠️'}`);
      });
      
      console.log('\nNext Game Cards distribution:');
      Object.entries(nextGameCardsByTeam).forEach(([team, count]) => {
        console.log(`  ${team}: ${count} card(s) ${count === 1 ? '✅' : '⚠️'}`);
      });
      
    } catch (error) {
      console.error('❌ Error testing cross-contamination:', error.response?.data || error.message);
    }

    // Test invalid filter values
    console.log('\n\n🚫 Testing invalid filter values:');
    
    try {
      const invalidResponse = await axios.get(`${API_BASE_URL}/game-cards?filters[mannschaft][$eq]=invalid`);
      console.log(`Invalid filter test: ${invalidResponse.data.data?.length || 0} results (should be 0) ✅`);
    } catch (error) {
      console.error('❌ Error testing invalid filter:', error.response?.data || error.message);
    }

    console.log('\n🎉 API filter testing completed!');

  } catch (error) {
    console.error('❌ Error during API filter testing:', error.response?.data || error.message);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  testAPIFilters()
    .then(() => {
      console.log('✅ API filter testing completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ API filter testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testAPIFilters };