const axios = require('axios');

async function debugAPIStructure() {
  try {
    const response = await axios.get('http://localhost:1337/api/tabellen-eintraege?populate=*');
    console.log('API Response structure:');
    console.log('Response data keys:', Object.keys(response.data));
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('\nFirst entry structure:');
      console.log(JSON.stringify(response.data.data[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugAPIStructure();