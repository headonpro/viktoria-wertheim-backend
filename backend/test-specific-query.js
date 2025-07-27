const axios = require('axios');

async function testSpecificQuery() {
  try {
    console.log('Testing the exact query that is failing...\n');
    
    const response = await axios.get('http://localhost:1337/api/tabellen-eintraege', {
      params: {
        'filters[liga][name][$eq]': 'Kreisliga Tauberbischofsheim',
        populate: 'liga,team_logo',
        sort: 'platz:asc',
        'pagination[pageSize]': 100
      }
    });
    
    console.log('✅ Query successful!');
    console.log(`Found ${response.data.data.length} entries`);
    console.log('\nResponse data:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Query failed:');
    console.error('Full error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
  }
}

testSpecificQuery();