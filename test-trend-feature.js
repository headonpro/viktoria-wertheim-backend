const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function testTrendFeature() {
  console.log('Testing Trend Feature Implementation...\n');
  
  try {
    // Test API endpoint
    console.log('1. Testing API endpoint...');
    const response = await axios.get(`${API_BASE_URL}/api/teams`);
    
    if (response.data && response.data.length > 0) {
      console.log('✅ API endpoint working');
      
      // Check each team for trend field
      console.log('\n2. Checking trend field for each team:');
      response.data.forEach(team => {
        const trendValue = team.trend;
        const trendIcon = trendValue === 'steigend' ? '📈' : 
                         trendValue === 'fallend' ? '📉' : '➖';
        
        console.log(`   ${team.name}: Platz ${team.tabellenplatz} ${trendIcon} (${trendValue})`);
      });
      
      // Verify all teams have trend field
      const teamsWithTrend = response.data.filter(team => team.trend);
      console.log(`\n✅ ${teamsWithTrend.length}/${response.data.length} teams have trend field`);
      
      // Test specific team data structure
      console.log('\n3. Testing team data structure:');
      const firstTeam = response.data[0];
      const requiredFields = ['tabellenplatz', 'trend', 'name', 'punkte'];
      const missingFields = requiredFields.filter(field => !firstTeam.hasOwnProperty(field));
      
      if (missingFields.length === 0) {
        console.log('✅ All required fields present');
      } else {
        console.log(`❌ Missing fields: ${missingFields.join(', ')}`);
      }
      
    } else {
      console.log('❌ No team data received');
    }
    
  } catch (error) {
    console.error('❌ Error testing trend feature:', error.message);
  }
}

// Run the test
testTrendFeature();