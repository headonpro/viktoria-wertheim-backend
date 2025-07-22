const axios = require('axios');

const API_BASE_URL = 'http://localhost:1337';

async function fixLigaField() {
  try {
    console.log('Fixing Liga field for all entries...');
    
    // Get all entries
    const response = await axios.get(`${API_BASE_URL}/api/leaderboard-entries`, {
      params: {
        'pagination[pageSize]': 100
      }
    });
    
    console.log(`Found ${response.data.data.length} entries`);
    
    // Update each entry with Liga field
    for (const entry of response.data.data) {
      try {
        console.log(`Updating ${entry.teamname}...`);
        
        // First, just save with liga field (don't publish yet)
        const updateData = {
          data: {
            position: entry.position,
            teamname: entry.teamname,
            spiele: entry.spiele || 0,
            siege: entry.siege || 0,
            unentschieden: entry.unentschieden || 0,
            niederlagen: entry.niederlagen || 0,
            tore: entry.tore || 0,
            gegentore: entry.gegentore || 0,
            tordifferenz: entry.tordifferenz || 0,
            punkte: entry.punkte || 0,
            liga: 'Kreisliga Tauberbischofsheim'
          }
        };
        
        const updateResponse = await axios.put(
          `${API_BASE_URL}/api/leaderboard-entries/${entry.documentId}`,
          updateData
        );
        
        console.log(`✓ Updated ${entry.teamname}`);
        
        // Now try to publish using the content-manager endpoint
        try {
          const publishResponse = await axios.post(
            `${API_BASE_URL}/content-manager/collection-types/api::leaderboard-entry.leaderboard-entry/${entry.documentId}/actions/publish`
          );
          console.log(`✓ Published ${entry.teamname}`);
        } catch (publishError) {
          console.log(`✗ Failed to publish ${entry.teamname}:`, publishError.response?.status);
        }
        
      } catch (updateError) {
        console.error(`✗ Failed to update ${entry.teamname}:`, updateError.response?.status, updateError.response?.data);
      }
    }
    
    console.log('\nDone! Now testing API...');
    
    // Test the API
    const testResponse = await axios.get(`${API_BASE_URL}/api/leaderboard-entries`, {
      params: {
        'sort[0]': 'position:asc',
        'populate': 'logo'
      }
    });
    
    console.log(`API test: ${testResponse.data.data.length} entries found`);
    const publishedEntries = testResponse.data.data.filter(entry => entry.publishedAt);
    console.log(`Published entries: ${publishedEntries.length}`);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

fixLigaField();