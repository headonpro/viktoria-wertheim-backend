const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function updateLeaderboardEntries() {
  try {
    console.log('Updating existing leaderboard entries with Liga field...');
    
    // Fetch all entries
    const response = await axios.get(`${API_BASE_URL}/api/leaderboard-entries`, {
      params: {
        'pagination[pageSize]': 100
      }
    });
    
    console.log(`Found ${response.data.data.length} entries to update`);
    
    // Update each entry with Liga field
    for (const entry of response.data.data) {
      try {
        const updateData = {
          data: {
            liga: 'Kreisliga Tauberbischofsheim' // Default liga for all entries
          }
        };
        
        const updateResponse = await axios.put(
          `${API_BASE_URL}/api/leaderboard-entries/${entry.documentId}`,
          updateData
        );
        
        console.log(`Updated ${entry.teamname} - Status: ${updateResponse.status}`);
        
      } catch (updateError) {
        console.error(`Failed to update ${entry.teamname}:`, updateError.response?.data || updateError.message);
      }
    }
    
    console.log('Update completed!');
    
    // Test the API call that was failing
    console.log('\nTesting liga filter...');
    const testResponse = await axios.get(`${API_BASE_URL}/api/leaderboard-entries`, {
      params: {
        'filters[liga][$eq]': 'Kreisliga Tauberbischofsheim',
        'sort[0]': 'position:asc',
        'populate': 'logo'
      }
    });
    
    console.log(`Liga filter test successful: ${testResponse.data.data.length} entries found`);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

updateLeaderboardEntries();