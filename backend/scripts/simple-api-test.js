/**
 * Simple API test using built-in fetch (Node 18+)
 */

const BASE_URL = 'http://localhost:1337/api';

async function testAPI() {
  console.log('🧪 Testing Tabellen-Eintrag API...');
  
  try {
    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test basic endpoint
    const response = await fetch(`${BASE_URL}/tabellen-eintraege?populate=liga&sort=platz:asc`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ API is working! Found ${data.data.length} entries`);
    
    // Show first few entries
    data.data.slice(0, 5).forEach(entry => {
      const ligaName = entry.attributes.liga?.data?.attributes?.name || 'Unknown Liga';
      console.log(`   - ${entry.attributes.team_name} (${ligaName}) - Platz ${entry.attributes.platz}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    return false;
  }
}

// Run test
testAPI();