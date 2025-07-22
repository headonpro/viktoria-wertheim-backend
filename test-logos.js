const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function testLogos() {
  try {
    console.log('Testing logo display...');
    
    // Fetch entries with logo population
    const response = await axios.get(`${API_BASE_URL}/api/leaderboard-entries`, {
      params: {
        'sort[0]': 'position:asc',
        'populate': 'logo'
      }
    });
    
    console.log(`Found ${response.data.data.length} entries`);
    
    // Check specifically for teams with logos
    const teamsWithLogos = response.data.data.filter(entry => entry.logo && entry.logo.data);
    console.log(`Teams with logos: ${teamsWithLogos.length}`);
    
    teamsWithLogos.forEach(team => {
      console.log(`\n${team.teamname}:`);
      console.log(`- Logo URL: ${API_BASE_URL}${team.logo.data.attributes.url}`);
      console.log(`- Logo name: ${team.logo.data.attributes.name}`);
    });
    
    // Check for Rundheim and Umverteil specifically
    const rundheim = response.data.data.find(entry => 
      entry.teamname.toLowerCase().includes('rundheim')
    );
    const umverteil = response.data.data.find(entry => 
      entry.teamname.toLowerCase().includes('umverteil')
    );
    
    console.log('\nSpecific teams:');
    console.log('Rundheim found:', rundheim ? 'Yes' : 'No');
    console.log('Umverteil found:', umverteil ? 'Yes' : 'No');
    
    if (rundheim) {
      console.log('Rundheim logo:', rundheim.logo ? 'Present' : 'Missing');
    }
    if (umverteil) {
      console.log('Umverteil logo:', umverteil.logo ? 'Present' : 'Missing');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testLogos();