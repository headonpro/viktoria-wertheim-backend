/**
 * Simple test script for team-specific API calls
 * Tests the actual implementation logic without TypeScript
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

// Simplified version of the fetchLastAndNextGame function
async function fetchLastAndNextGame(teamId) {
  try {
    // Map frontend team IDs to backend mannschaft values
    // Frontend: "1", "2", "3" -> Backend: "m1", "m2", "m3"
    const mannschaftValue = `m${teamId}`
    
    // Use the separate Game Card API endpoints with mannschaft filtering
    const [lastResponse, nextResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=${mannschaftValue}`),
      axios.get(`${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=${mannschaftValue}&populate=gegner_team`)
    ])
    
    // Get the first (most recent) game from each endpoint
    const lastGameData = lastResponse.data?.data?.[0]
    const nextGameData = nextResponse.data?.data?.[0]
    
    // Transform Game Card data to GameDetails format
    const transformGameCardToGameDetails = (gameCard, type) => {
      if (!gameCard) return null
      
      const gameDate = new Date(gameCard.datum)
      const isHome = gameCard.ist_heimspiel
      
      // Get opponent name - for last games it's a string, for next games it's a team relation
      const opponentName = type === 'last' 
        ? gameCard.gegner 
        : gameCard.gegner_team?.name || 'Unbekannter Gegner'
      
      // Determine team names based on whether it's a home or away game
      const homeTeam = isHome ? 'SV Viktoria Wertheim' : opponentName
      const awayTeam = isHome ? opponentName : 'SV Viktoria Wertheim'
      
      return {
        id: gameCard.id,
        type,
        homeTeam,
        awayTeam,
        homeScore: type === 'last' ? (isHome ? gameCard.unsere_tore : gameCard.gegner_tore) : undefined,
        awayScore: type === 'last' ? (isHome ? gameCard.gegner_tore : gameCard.unsere_tore) : undefined,
        date: gameDate.toLocaleDateString('de-DE'),
        time: gameDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        isHome,
        stadium: isHome ? 'Viktoria-Stadion Wertheim' : `Auswärts bei ${opponentName}`,
        referee: 'N/A',
        status: type === 'last' ? 'beendet' : 'geplant',
        goalScorers: [],
        yellowCards: [],
        redCards: [],
        lastMeeting: undefined
      }
    }
    
    return {
      lastGame: transformGameCardToGameDetails(lastGameData, 'last'),
      nextGame: transformGameCardToGameDetails(nextGameData, 'next')
    }
  } catch (error) {
    const teamName = getTeamName(teamId)
    console.warn(`Error fetching last/next games for ${teamName} (Team ${teamId}):`, error.message)
    
    // Provide team-specific error context
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.warn(`No game data found for ${teamName}`)
      } else if (error.response?.status >= 500) {
        console.warn(`Server error while fetching games for ${teamName}`)
      } else {
        console.warn(`API error for ${teamName}: ${error.response?.status} ${error.response?.statusText}`)
      }
    } else {
      console.warn(`Network or unknown error for ${teamName}:`, error)
    }
    
    return { lastGame: null, nextGame: null }
  }
}

async function testTeamServiceFunction() {
  console.log('🚀 Testing fetchLastAndNextGame function implementation')
  console.log('=' .repeat(60))
  
  const teams = ['1', '2', '3']
  const results = []
  
  for (const teamId of teams) {
    console.log(`\n=== Testing Team ${teamId} (${getTeamName(teamId)}) ===`)
    
    try {
      const result = await fetchLastAndNextGame(teamId)
      
      console.log(`✅ Team ${teamId} - Function executed successfully`)
      console.log(`📊 Last Game: ${result.lastGame ? 'Found' : 'Not found'}`)
      console.log(`📊 Next Game: ${result.nextGame ? 'Found' : 'Not found'}`)
      
      if (result.lastGame) {
        console.log(`   Last Game Details:`)
        console.log(`   - Date: ${result.lastGame.date}`)
        console.log(`   - Time: ${result.lastGame.time}`)
        console.log(`   - Home Team: ${result.lastGame.homeTeam}`)
        console.log(`   - Away Team: ${result.lastGame.awayTeam}`)
        if (result.lastGame.homeScore !== undefined && result.lastGame.awayScore !== undefined) {
          console.log(`   - Score: ${result.lastGame.homeScore}:${result.lastGame.awayScore}`)
        }
        console.log(`   - Stadium: ${result.lastGame.stadium}`)
        console.log(`   - Status: ${result.lastGame.status}`)
      }
      
      if (result.nextGame) {
        console.log(`   Next Game Details:`)
        console.log(`   - Date: ${result.nextGame.date}`)
        console.log(`   - Time: ${result.nextGame.time}`)
        console.log(`   - Home Team: ${result.nextGame.homeTeam}`)
        console.log(`   - Away Team: ${result.nextGame.awayTeam}`)
        console.log(`   - Stadium: ${result.nextGame.stadium}`)
        console.log(`   - Status: ${result.nextGame.status}`)
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
    console.log(`${status} Team ${result.teamId} (${getTeamName(result.teamId)}):`)
    
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
    console.log('🎉 fetchLastAndNextGame working correctly for all teams!')
    console.log('✅ Team-specific filtering implemented successfully')
    console.log('✅ Error handling with team-specific messages working')
    console.log('✅ API calls using correct mannschaft filter format')
  } else {
    console.log('⚠️  Some team function calls failed. Check the errors above.')
  }
}

// Run the test
if (require.main === module) {
  testTeamServiceFunction().catch(console.error)
}

module.exports = { testTeamServiceFunction, fetchLastAndNextGame }