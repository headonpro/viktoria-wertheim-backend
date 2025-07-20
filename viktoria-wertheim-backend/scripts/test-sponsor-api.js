const axios = require('axios');

const API_URL = 'http://192.168.178.59:1337';

async function testSponsorAPI() {
  console.log('🧪 Testing Sponsor API...\n');

  try {
    // Test basic API connectivity
    console.log('1. Testing basic API connectivity...');
    const healthCheck = await axios.get(`${API_URL}/api/leaderboard-entries`);
    console.log('✅ Basic API is working\n');

    // Test sponsor endpoint
    console.log('2. Testing sponsor endpoint...');
    const sponsorResponse = await axios.get(`${API_URL}/api/sponsors`);
    
    if (sponsorResponse.data && sponsorResponse.data.data) {
      console.log(`✅ Sponsor API working! Found ${sponsorResponse.data.data.length} sponsors`);
      console.log('Sponsors:', sponsorResponse.data.data.map(s => s.name || s.attributes?.name).join(', '));
    } else {
      console.log('⚠️  Sponsor API returned empty data');
    }

  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      console.log(`❌ Sponsor API Error: ${status}`);
      
      if (status === 404) {
        console.log('\n🔧 FIX NEEDED:');
        console.log('The sponsor content type exists but the API endpoint is not accessible.');
        console.log('This usually means permissions are not set correctly.\n');
        console.log('To fix this:');
        console.log('1. Open Strapi Admin: http://192.168.178.59:1337/admin');
        console.log('2. Go to: Settings → Users & Permissions Plugin → Roles → Public');
        console.log('3. Find "Sponsor" section and enable:');
        console.log('   - ✅ find (to read all sponsors)');
        console.log('   - ✅ findOne (to read individual sponsors)');
        console.log('4. Click Save');
        console.log('5. Run this test again\n');
      } else if (status === 403) {
        console.log('\n🔧 FIX NEEDED:');
        console.log('Access forbidden - check API permissions in Strapi admin');
      } else {
        console.log(`\n❌ Unexpected error: ${error.message}`);
      }
    } else {
      console.log(`❌ Network error: ${error.message}`);
    }
  }

  // Test with populate parameter
  try {
    console.log('\n3. Testing sponsor endpoint with populate...');
    const populatedResponse = await axios.get(`${API_URL}/api/sponsors?populate=*`);
    console.log('✅ Populated sponsor API working!');
  } catch (error) {
    console.log(`❌ Populated sponsor API failed: ${error.response?.status || error.message}`);
  }
}

testSponsorAPI();