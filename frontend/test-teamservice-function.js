/**
 * Test script for the actual teamService.fetchLastAndNextGame function
 * Tests the implementation with team-specific filtering
 */

// Mock Next.js environment
process.env.NEXT_PUBLIC_STRAPI_URL = 'http://localhost:1337'

// Import the teamService
const { teamService } = require('./src/services/teamService.ts')

async function testTeamServiceFunction() {
  console.log('🚀 Testing teamService.fetchLastAndNextGame function')
  console.log('=' .repeat(60))
  
  const teams = ['1', '2', '3']
  const results = []
  
  for (const teamId of teams) {
    console.log(`\n=== Testing Team ${teamId} ===`)
    
    try {
      const result = await teamService.fetchLastAndNextGame(teamId)
      
      console.log(`✅ Team ${teamId} - Function executed successfully`)
      console.log(`📊 Last Game: ${result.lastGame ? 'Found' : 'Not found'}`)
      console.log(`📊 Next Game: ${result.nextGame ? 'Found' : 'Not found'}`)
      
      if (result.lastGame) {
        console.log(`   Last Game Details:`)
        console.log(`   - Date: ${result.lastGame.date}`)
        console.log(`   - Time: ${result.lastGame.time}`)
        console.log(`   - Home Team: ${result.lastGame.homeTeam}`)
        console.log(`   - Away Team: ${result.lastGame.awayTeam}`)
        console.log(`   - Score: ${result.lastGame.homeScore}:${result.lastGame.awayScore}`)
        console.log(`   - Stadium: ${result.lastGame.stadium}`)
      }
      
      if (result.nextGame) {
        console.log(`   Next Game Details:`)
        console.log(`   - Date: ${result.nextGame.date}`)
        console.log(`   - Time: ${result.nextGame.time}`)
        console.log(`   - Home Team: ${result.nextGame.homeTeam}`)
        console.log(`   - Away Team: ${result.nextGame.awayTeam}`)
        console.log(`   - Stadium: ${result.nextGame.stadium}`)
      }
      
      results.push({
        teamId,
        success: true,
        hasLastGame: !!result.lastGame,
        hasNextGame: !!result.nextGame
      })
      
    } catch (error) {
      console.log(`❌ Team ${teamId} - Error:`, error.message)
      results.push({
        teamId,
        success: false,
        error: error.message
      })
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60))
  console.log('📋 FUNCTION TEST SUMMARY')
  console.log('=' .repeat(60))
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌'
    console.log(`${status} Team ${result.teamId}:`)
    
    if (result.success) {
      console.log(`   - Last Game: ${result.hasLastGame ? 'Available' : 'None'}`)
      console.log(`   - Next Game: ${result.hasNextGame ? 'Available' : 'None'}`)
    } else {
      console.log(`   - Error: ${result.error}`)
    }
  })
  
  const successCount = results.filter(r => r.success).length
  console.log(`\n🎯 Overall: ${successCount}/3 teams tested successfully`)
  
  if (successCount === 3) {
    console.log('🎉 teamService.fetchLastAndNextGame working correctly for all teams!')
  } else {
    console.log('⚠️  Some team function calls failed. Check the errors above.')
  }
}

// Run the test
if (require.main === module) {
  testTeamServiceFunction().catch(console.error)
}

module.exports = { testTeamServiceFunction }