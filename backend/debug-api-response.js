const axios = require('axios');

async function debugAPI() {
  try {
    const response = await axios.get('http://localhost:1337/api/tabellen-eintraege?populate=liga');
    console.log('Full API Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugAPI();