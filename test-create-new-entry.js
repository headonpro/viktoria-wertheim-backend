const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function testCreateNewEntry() {
  try {
    console.log('Testing creation of new entry with logo...');
    
    // Create a completely new entry to test if the schema works
    const newEntryData = {
      data: {
        position: 99,
        teamname: 'Test Team Logo',
        spiele: 10,
        siege: 5,
        unentschieden: 3,
        niederlagen: 2,
        tore: 15,
        gegentore: 10,
        tordifferenz: 5,
        punkte: 18,
        logo: null // Optional logo field
      }
    };

    const response = await axios.post(`${API_BASE_URL}/api/leaderboard-entries`, newEntryData);
    
    console.log('✅ Successfully created new entry:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ Error creating new entry:', error.response?.data || error.message);
    throw error;
  }
}

// Run the test
testCreateNewEntry()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error.message);
    process.exit(1);
  });
        