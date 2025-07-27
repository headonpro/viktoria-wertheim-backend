/**
 * Test script for team-specific API calls in teamService
 * Tests the fetchLastAndNextGame function for all three teams
 */

const axios = require('axios')

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'

// Helper function to get team name
const getTeamName = (teamId) => {
  const teamNames = {
    '1': '1. Mannschaft',
    '2': '2. Mannschaft', 
    '3': '3. Mannschaft'
  }
  return teamNames[teamId]
}

// Test function for API calls
async function testTeamApiCalls(teamId) {
  const teamName = getTeamName(teamId)
  const mannschaftValue = `m${teamId}`
  
  console.log(`\n=== Testing ${teamName} (Team ${teamId}) ===`)
  console.log(`Backend mannschaft value: ${mannschaftValue}`)
  
  try {
    // Test last game API call
    console.log(`\n📡 Testing Last Game API for ${teamName}...`)
    const lastGameUrl = `${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=${mannschaftValue}`
    console.log(`URL: ${lastGameUrl}`)
    
    const lastResponse = await axios.get(lastGameUrl)
    console.log(`✅ Last Game API Response Status: ${lastResponse.status}`)
    console.log(`📊 Last Game Data Count: ${lastResponse.data?.data?.length || 0}`)
    
    if (lastResponse.data?.data?.length > 0) {
      const lastGame = lastResponse.data.data[0]
      console.log(`   - Game Date: ${lastGame.datum}`)
      console.log(`   - Opponent: ${lastGame.gegner}`)
      console.log(`   - Home Game: ${lastGame.ist_heimspiel}`)
      console.log(`   - Mannschaft: ${lastGame.mannschaft}`)
      if (lastGame.unsere_tore !== undefined && lastGame.gegner_tore !== undefined) {
        console.log(`   - Score: ${lastGame.unsere_tore}:${lastGame.gegner_tore}`)
      }
    } else {
      console.log(`   ℹ️  No last game data found for ${teamName}`)
    }
    
    // Test next game API call
    console.log(`\n📡 Testing Next Game API for ${teamName}...`)
    const nextGameUrl = `${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=${mannschaftValue}&populate=gegner_team`
    console.log(`URL: ${nextGameUrl}`)
    
    const nextResponse = await axios.get(nextGameUrl)
    console.log(`✅ Next Game API Response Status: ${nextResponse.status}`)
    console.log(`📊 Next Game Data Count: ${nextResponse.data?.data?.length || 0}`)
    
    if (nextResponse.data?.data?.length > 0) {
      const nextGame = nextResponse.data.data[0]
      console.log(`   - Game Date: ${nextGame.datum}`)
      console.log(`   - Opponent Team: ${nextGame.gegner_team?.name || 'Unknown'}`)
      console.log(`   - Home Game: ${nextGame.ist_heimspiel}`)
      console.log(`   - Mannschaft: ${nextGame.mannschaft}`)
    } else {
      console.log(`   ℹ️  No next game data found for ${teamName}`)
    }
    
    return {
      teamId,
      teamName,
      success: true,
      lastGameCount: lastResponse.data?.data?.length || 0,
      nextGameCount: nextResponse.data?.data?.length || 0
    }
    
  } catch (error) {
    console.log(`❌ Error testing ${teamName}:`)
    
    if (axios.isAxiosError(error)) {
      console.log(`   - Status: ${error.response?.status}`)
      console.log(`   - Status Text: ${error.response?.statusText}`)
      console.log(`   - URL: ${error.config?.url}`)
      if (error.response?.data) {
        console.log(`   - Error Data:`, JSON.stringify(error.response.data, null, 2))
      }
    } else {
      console.log(`   - Error:`, error.message)
    }
    
    return {
      teamId,
      teamName,
      success: false,
      error: error.message
    }
  }
}

// Main test function
async function runAllTests() {
  console.log('🚀 Starting Team Service API Tests')
  console.log(`🔗 API Base URL: ${API_BASE_URL}`)
  console.log('=' .repeat(50))
  
  const results = []
  
  // Test all three teams
  for (const teamId of ['1', '2', '3']) {
    const result = await testTeamApiCalls(teamId)
    results.push(result)
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50))
  console.log('📋 TEST SUMMARY')
  console.log('=' .repeat(50))
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} ${result.teamName}:`)
    
    if (result.success) {
      console.log(`   - Last Games: ${result.lastGameCount}`)
      console.log(`   - Next Games: ${result.nextGameCount}`)
    } else {
      console.log(`   - Error: ${result.error}`)
    }
  })
  
  const successCount = results.filter(r => r.success).length
  console.log(`\n🎯 Overall: ${successCount}/3 teams tested successfully`)
  
  if (successCount === 3) {
    console.log('🎉 All team API calls working correctly!')
  } else {
    console.log('⚠️  Some team API calls failed. Check the errors above.')
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { testTeamApiCalls, runAllTests }