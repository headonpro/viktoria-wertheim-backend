const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function testLeaderboardAPI() {
  try {
    console.log('Testing Leaderboard API...');
    
    // Test basic API call
    const response = await axios.get(`${API_BASE_URL}/api/leaderboard-entries`, {
      params: {
        'sort[0]': 'position:asc',
        'pagination[pageSize]': 100,
        'populate': 'logo'
      }
    });
    
    console.log('API Response Status:', response.status);
    console.log('Number of entries:', response.data.data.length);
    
    if (response.data.data.length > 0) {
      console.log('First entry:', JSON.stringify(response.data.data[0], null, 2));
    }
    
    // Test with liga filter (this was causing the 400 error)
    try {
      const filteredResponse = await axios.get(`${API_BASE_URL}/api/leaderboard-entries`, {
        params: {
          'filters[liga][$eq]': 'Kreisliga Tauberbischofsheim',
          'sort[0]': 'position:asc',
          'pagination[pageSize]': 100,
          'populate': 'logo'
        }
      });
      console.log('Liga filter test successful:', filteredResponse.data.data.length, 'entries');
    } catch (filterError) {
      console.log('Liga filter test failed:', filterError.response?.status, filterError.response?.data);
    }
    
  } catch (error) {
    console.error('API Test failed:', error.response?.status, error.response?.data || error.message);
  }
}

testLeaderboardAPI();