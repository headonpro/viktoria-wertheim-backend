const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function debugTeams() {
  try {
    console.log('All teams in database:');
    
    const response = await axios.get(`${API_BASE_URL}/api/leaderboard-entries`, {
      params: {
        'sort[0]': 'position:asc',
        'populate': 'logo'
      }
    });
    
    response.data.data.forEach((team, index) => {
      console.log(`${index + 1}. ${team.teamname} (Position: ${team.position})`);
      console.log(`   - ID: ${team.id}, DocumentID: ${team.documentId}`);
      console.log(`   - Logo: ${team.logo ? 'Present' : 'Missing'}`);
      if (team.logo && team.logo.data) {
        console.log(`   - Logo URL: ${API_BASE_URL}${team.logo.data.attributes.url}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugTeams();