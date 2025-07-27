const axios = require('axios');

async function testCorrectPopulate() {
  try {
    console.log('Testing different populate syntaxes...\n');
    
    // Test 1: Simple populate
    console.log('1. Testing simple populate...');
    const response1 = await axios.get('http://localhost:1337/api/tabellen-eintraege', {
      params: {
        'filters[liga][name][$eq]': 'Kreisliga Tauberbischofsheim',
        populate: 'liga',
        sort: 'platz:asc'
      }
    });
    console.log('✅ Simple populate works');
    console.log(`Found ${response1.data.data.length} entries`);
    
    // Test 2: Multiple populate with array syntax
    console.log('\n2. Testing array populate...');
    const response2 = await axios.get('http://localhost:1337/api/tabellen-eintraege', {
      params: {
        'filters[liga][name][$eq]': 'Kreisliga Tauberbischofsheim',
        'populate[0]': 'liga',
        'populate[1]': 'team_logo',
        sort: 'platz:asc'
      }
    });
    console.log('✅ Array populate works');
    console.log(`Found ${response2.data.data.length} entries`);
    
    // Test 3: Object populate syntax
    console.log('\n3. Testing object populate...');
    const response3 = await axios.get('http://localhost:1337/api/tabellen-eintraege', {
      params: {
        'filters[liga][name][$eq]': 'Kreisliga Tauberbischofsheim',
        'populate[liga]': true,
        'populate[team_logo]': true,
        sort: 'platz:asc'
      }
    });
    console.log('✅ Object populate works');
    console.log(`Found ${response3.data.data.length} entries`);
    
    // Show sample data
    if (response3.data.data.length > 0) {
      console.log('\nSample entry:');
      console.log(JSON.stringify(response3.data.data[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Query failed:');
    console.error('Full error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('No response received');
    }
  }
}

testCorrectPopulate();