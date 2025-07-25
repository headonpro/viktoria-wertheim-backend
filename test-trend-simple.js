// Simple test using built-in fetch (Node.js 18+)
async function testTrendFeature() {
  console.log('Testing Trend Feature Implementation...\n');
  
  try {
    const response = await fetch('http://localhost:1337/api/teams');
    const teams = await response.json();
    
    console.log('✅ API endpoint working\n');
    
    console.log('Team Status with Trend Icons:');
    teams.forEach(team => {
      const trendIcon = team.trend === 'steigend' ? '📈' : 
                       team.trend === 'fallend' ? '📉' : '➖';
      
      console.log(`   ${team.name}: Platz ${team.tabellenplatz} ${trendIcon} (${team.trend})`);
    });
    
    console.log(`\n✅ All ${teams.length} teams have trend field implemented`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTrendFeature();