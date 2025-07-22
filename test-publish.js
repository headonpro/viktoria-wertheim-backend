const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function testPublish() {
  try {
    console.log('Testing publish functionality...');
    
    // Get FC Umpfertal entry
    const response = await axios.get(`${API_BASE_URL}/api/leaderboard-entries`, {
      params: {
        'filters[teamname][$eq]': 'FC Umpfertal'
      }
    });
    
    if (response.data.data.length === 0) {
      console.log('FC Umpfertal not found');
      return;
    }
    
    const entry = response.data.data[0];
    console.log('Found FC Umpfertal:', entry.documentId);
    console.log('Current publishedAt:', entry.publishedAt);
    
    // Try to update with minimal data
    const updateData = {
      data: {
        liga: 'Kreisliga Tauberbischofsheim',
        publishedAt: new Date().toISOString()
      }
    };
    
    console.log('Attempting to publish...');
    const publishResponse = await axios.put(
      `${API_BASE_URL}/api/leaderboard-entries/${entry.documentId}`,
      updateData
    );
    
    console.log('Publish successful!', publishResponse.status);
    console.log('Updated entry:', publishResponse.data.data);
    
  } catch (error) {
    console.error('Publish failed:');
    console.error('Status:', error.response?.status);
    console.error('Error:', error.response?.data);
    
    // Try alternative approach - just update without publishedAt
    if (error.response?.status === 500) {
      console.log('\nTrying alternative approach...');
      try {
        const alternativeData = {
          data: {
            liga: 'Kreisliga Tauberbischofsheim'
          }
        };
        
        const altResponse = await axios.put(
          `${API_BASE_URL}/api/leaderboard-entries/${entry.documentId}`,
          alternativeData
        );
        
        console.log('Alternative update successful:', altResponse.status);
        
      } catch (altError) {
        console.error('Alternative also failed:', altError.response?.data);
      }
    }
  }
}

testPublish();