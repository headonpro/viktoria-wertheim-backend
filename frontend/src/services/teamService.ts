import axios from 'axios'
import { getApiUrl } from '../lib/apiConfig'
import { Team, TeamData, GameDetails, TeamId, TeamStats } from '../types/strapi'

// Strapi API Base URL
const API_BASE_URL = getApiUrl()

// Strapi Response Interfaces
interface StrapiTeamResponse {
  data: Team[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

// StrapiSpielResponse removed since Spiel content type was removed

// Static fallback data for graceful degradation
const getFallbackTeamData = (teamId: TeamId): TeamData => {
  const fallbackData: Record<TeamId, TeamData> = {
    '1': {
      id: 1,
      name: '1. Mannschaft',
      liga: 'Kreisliga',
      liga_vollname: 'Kreisliga',
      tabellenplatz: 8,
      punkte: 24,
      spiele_gesamt: 18,
      siege: 7,
      unentschieden: 3,
      niederlagen: 8,
      tore_fuer: 32,
      tore_gegen: 28,
      tordifferenz: 4,
      form_letzte_5: ['S', 'N', 'U', 'S', 'N'],
      trend: 'gleich',
      trainer: 'Max Mustermann',
      altersklasse: 'Herren'
    },
    '2': {
      id: 2,
      name: '2. Mannschaft',
      liga: 'Kreisklasse A',
      liga_vollname: 'Kreisklasse A',
      tabellenplatz: 5,
      punkte: 28,
      spiele_gesamt: 16,
      siege: 8,
      unentschieden: 4,
      niederlagen: 4,
      tore_fuer: 35,
      tore_gegen: 22,
      tordifferenz: 13,
      form_letzte_5: ['S', 'S', 'U', 'S', 'N'],
      trend: 'steigend',
      status: 'aktiv',
      trainer: 'Hans Schmidt',
      altersklasse: 'Herren'
    },
    '3': {
      id: 3,
      name: '3. Mannschaft',
      liga: 'Kreisklasse B',
      liga_vollname: 'Kreisklasse B',
      tabellenplatz: 12,
      punkte: 15,
      spiele_gesamt: 14,
      siege: 4,
      unentschieden: 3,
      niederlagen: 7,
      tore_fuer: 18,
      tore_gegen: 31,
      tordifferenz: -13,
      form_letzte_5: ['N', 'N', 'U', 'N', 'S'],
      trend: 'fallend',
      status: 'aktiv',
      trainer: 'Peter Weber',
      altersklasse: 'Herren'
    }
  }
  
  return fallbackData[teamId]
}

// Transform Strapi Team to TeamData
const transformStrapiToTeamData = (strapiTeam: Team): TeamData => {
  const attrs = strapiTeam.attributes
  
  return {
    id: strapiTeam.id,
    name: attrs.name,
    liga: attrs.liga_name || '',
    liga_vollname: attrs.liga_vollname || attrs.liga_name || '',
    tabellenplatz: attrs.tabellenplatz || 1,
    punkte: attrs.punkte || 0,
    spiele_gesamt: attrs.spiele_gesamt || 0,
    siege: attrs.siege || 0,
    unentschieden: attrs.unentschieden || 0,
    niederlagen: attrs.niederlagen || 0,
    tore_fuer: attrs.tore_fuer || 0,
    tore_gegen: attrs.tore_gegen || 0,
    tordifferenz: attrs.tordifferenz || 0,
    form_letzte_5: attrs.form_letzte_5 || [],
    trend: attrs.trend || 'gleich',

    trainer: attrs.trainer,
    altersklasse: attrs.altersklasse
  }
}

// transformStrapiToGameDetails removed since Spiel content type was removed
// Use Game Cards instead

// Team Service Implementation
export const teamService = {
  /**
   * Fetch team data by team ID
   * @param teamId - ID of the team ('1', '2', or '3')
   * @returns Promise<TeamData> - Team data with graceful fallback
   */
  async fetchTeamData(teamId: TeamId): Promise<TeamData> {
    try {
      const teamNames = {
        '1': '1. Mannschaft',
        '2': '2. Mannschaft', 
        '3': '3. Mannschaft'
      }
      
      const response = await axios.get<StrapiTeamResponse>(
        `${API_BASE_URL}/api/teams`,
        {
          params: {
            'filters[name][$eq]': teamNames[teamId],
            'populate': '*'
          }
        }
      )

      if (!response.data?.data || response.data.data.length === 0) {
        console.warn(`No API data found for team ${teamId}, using fallback`)
        return getFallbackTeamData(teamId)
      }

      return transformStrapiToTeamData(response.data.data[0])

    } catch (error) {
      console.warn(`Error fetching team data for ${teamId}:`, error)
      return getFallbackTeamData(teamId)
    }
  },

  /**
   * Fetch games for a specific team - REMOVED since Spiel content type was removed
   * Use fetchLastAndNextGame() instead for current game data
   * @param teamId - ID of the team
   * @returns Promise<GameDetails[]> - Empty array since Spiel API was removed
   */
  async fetchTeamGames(teamId: TeamId): Promise<GameDetails[]> {
    console.warn(`fetchTeamGames() deprecated - Spiel content type was removed. Use fetchLastAndNextGame() instead.`);
    return [];
  },

  /**
   * Get the last and next game for a team using the new Game Card API
   * @param teamId - ID of the team
   * @returns Promise<{lastGame: GameDetails | null, nextGame: GameDetails | null}>
   */
  async fetchLastAndNextGame(teamId: TeamId): Promise<{
    lastGame: GameDetails | null
    nextGame: GameDetails | null
  }> {
    try {
      // Use the separate Game Card API endpoints
      const [lastResponse, nextResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/game-cards/last`),
        axios.get(`${API_BASE_URL}/api/next-game-cards/next`)
      ])
      
      const lastGameData = lastResponse.data?.data
      const nextGameData = nextResponse.data?.data
      
      // Transform Game Card data to GameDetails format
      const transformGameCardToGameDetails = (gameCard: any, type: 'last' | 'next'): GameDetails | null => {
        if (!gameCard) return null
        
        const gameDate = new Date(gameCard.datum)
        const isHome = gameCard.ist_heimspiel
        
        // Get opponent name - for last games it's a string, for next games it's a club relation
        const opponentName = type === 'last' 
          ? gameCard.gegner 
          : gameCard.gegner_club?.name || gameCard.gegner_club?.kurz_name || 'Unbekannter Gegner'
        
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
      console.warn(`Error fetching last/next games for team ${teamId}:`, error)
      return { lastGame: null, nextGame: null }
    }
  },

  /**
   * Calculate team statistics from game results
   * @param games - Array of games
   * @returns TeamStats - Calculated statistics
   */
  calculateTeamStats(games: GameDetails[]): TeamStats {
    const completedGames = games.filter(game => 
      game.homeScore !== undefined && game.awayScore !== undefined
    )
    
    let siege = 0
    let unentschieden = 0
    let niederlagen = 0
    let tore_fuer = 0
    let tore_gegen = 0
    
    completedGames.forEach(game => {
      const isHome = game.isHome
      const teamScore = isHome ? game.homeScore! : game.awayScore!
      const opponentScore = isHome ? game.awayScore! : game.homeScore!
      
      tore_fuer += teamScore
      tore_gegen += opponentScore
      
      if (teamScore > opponentScore) {
        siege++
      } else if (teamScore === opponentScore) {
        unentschieden++
      } else {
        niederlagen++
      }
    })
    
    return {
      punkte: siege * 3 + unentschieden,
      spiele_gesamt: completedGames.length,
      siege,
      unentschieden,
      niederlagen,
      tore_fuer,
      tore_gegen,
      tordifferenz: tore_fuer - tore_gegen
    }
  },

  /**
   * Generate form array from recent games
   * @param games - Array of games
   * @param count - Number of recent games to consider (default: 5)
   * @returns ('S' | 'U' | 'N')[] - Form array
   */
  generateFormArray(games: GameDetails[], count: number = 5): ('S' | 'U' | 'N')[] {
    const completedGames = games
      .filter(game => game.homeScore !== undefined && game.awayScore !== undefined)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, count)
    
    return completedGames.map(game => {
      const isHome = game.isHome
      const teamScore = isHome ? game.homeScore! : game.awayScore!
      const opponentScore = isHome ? game.awayScore! : game.homeScore!
      
      if (teamScore > opponentScore) return 'S'
      if (teamScore === opponentScore) return 'U'
      return 'N'
    })
  },

  /**
   * Validate team data for consistency
   * @param teamData - Team data to validate
   * @returns boolean - Whether data is valid
   */
  validateTeamData(teamData: TeamData): boolean {
    // Basic validation checks
    if (!teamData.name || !teamData.liga) return false
    if (teamData.tabellenplatz < 1) return false
    if (teamData.punkte < 0) return false
    if (teamData.spiele_gesamt < 0) return false
    
    // Only warn about inconsistencies in non-test environments
    if (process.env.NODE_ENV !== 'test' && 
        teamData.siege + teamData.unentschieden + teamData.niederlagen !== teamData.spiele_gesamt) {
      console.warn('Team stats inconsistency: games don\'t match results')
    }
    
    return true
  }
}

// Export default
export default teamService