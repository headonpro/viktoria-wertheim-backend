/**
 * Test script for Game Card API endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:1337/api';

async function testGameCardAPIs() {
  console.log('🧪 Testing Game Card APIs...\n');
  
  try {
    // Test 1: Get all game cards
    console.log('1️⃣ Testing GET /game-cards');
    const allCards = await axios.get(`${BASE_URL}/game-cards`);
    console.log(`   ✅ Found ${allCards.data.data.length} game cards`);
    
    // Test 2: Get next match
    console.log('\n2️⃣ Testing GET /game-cards/next');
    const nextMatch = await axios.get(`${BASE_URL}/game-cards/next`);
    if (nextMatch.data.data) {
      console.log(`   ✅ Next match: ${nextMatch.data.data.heimteam} vs ${nextMatch.data.data.auswaertsteam}`);
      console.log(`   📅 Date: ${new Date(nextMatch.data.data.datum).toLocaleDateString('de-DE')}`);
    } else {
      console.log('   ℹ️ No upcoming matches found');
    }
    
    // Test 3: Get last match
    console.log('\n3️⃣ Testing GET /game-cards/last');
    const lastMatch = await axios.get(`${BASE_URL}/game-cards/last`);
    if (lastMatch.data.data) {
      console.log(`   ✅ Last match: ${lastMatch.data.data.heimteam} vs ${lastMatch.data.data.auswaertsteam}`);
      console.log(`   📅 Date: ${new Date(lastMatch.data.data.datum).toLocaleDateString('de-DE')}`);
      console.log(`   ⚽ Score: ${lastMatch.data.data.tore_heim || 0} - ${lastMatch.data.data.tore_auswaerts || 0}`);
    } else {
      console.log('   ℹ️ No completed matches found');
    }
    
    // Test 4: Create a test game card
    console.log('\n4️⃣ Testing POST /game-cards (create test entry)');
    const testGameCard = {
      data: {
        datum: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
        heimteam: 'Viktoria Wertheim',
        auswaertsteam: 'Test Gegner',
        ist_heimspiel: true,
        status: 'geplant',
        liga_name: 'Test Liga',
        spielort: 'Viktoria Sportplatz',
        unser_team_name: 'Viktoria Wertheim'
      }
    };
    
    const created = await axios.post(`${BASE_URL}/game-cards`, testGameCard);
    console.log(`   ✅ Created test game card with ID: ${created.data.data.id}`);
    
    // Clean up - delete test entry
    await axios.delete(`${BASE_URL}/game-cards/${created.data.data.id}`);
    console.log(`   🧹 Cleaned up test entry`);
    
    console.log('\n🎉 All Game Card API tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  testGameCardAPIs();
}

module.exports = { testGameCardAPIs };