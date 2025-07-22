/**
 * Data transformation utilities for converting Strapi data to component-ready formats
 * Handles data validation, sanitization, and format conversion
 */

import { Mannschaft, Spiel, TeamData, GameDetails, TeamStats, TeamId } from '../types/strapi'

/**
 * Transform Strapi Mannschaft data to TeamData format
 * @param strapiTeam - Raw Strapi team data
 * @returns TeamData - Transformed team data
 */
export const transformStrapiToTeamData = (strapiTeam: Mannschaft): TeamData => {
  const attrs = strapiTeam.attributes
  
  return {
    id: strapiTeam.id,
    name: sanitizeString(attrs.name),
    liga: sanitizeString(attrs.liga || ''),
    liga_vollname: sanitizeString(attrs.liga_vollname || attrs.liga || ''),
    tabellenplatz: validateNumber(attrs.tabellenplatz, 1, 1, 20),
    punkte: validateNumber(attrs.punkte, 0, 0),
    spiele_gesamt: validateNumber(attrs.spiele_gesamt, 0, 0),
    siege: validateNumber(attrs.siege, 0, 0),
    unentschieden: validateNumber(attrs.unentschieden, 0, 0),
    niederlagen: validateNumber(attrs.niederlagen, 0, 0),
    tore_fuer: validateNumber(attrs.tore_fuer, 0, 0),
    tore_gegen: validateNumber(attrs.tore_gegen, 0, 0),
    tordifferenz: validateNumber(attrs.tordifferenz, 0),
    form_letzte_5: validateFormArray(attrs.form_letzte_5),
    trend: validateTrend(attrs.trend),
    status: validateStatus(attrs.status),
    trainer: attrs.trainer ? sanitizeString(attrs.trainer) : undefined,
    altersklasse: attrs.altersklasse ? sanitizeString(attrs.altersklasse) : undefined
  }
}

/**
 * Transform Strapi Spiel data to GameDetails format
 * @param strapiGame - Raw Strapi game data
 * @param teamName - Name of the team to determine home/away status
 * @returns GameDetails - Transformed game data
 */
export const transformStrapiToGameDetails = (strapiGame: Spiel, teamName: string): GameDetails => {
  const attrs = strapiGame.attributes
  const homeTeam = sanitizeString(attrs.heimmannschaft?.data?.attributes?.name || '')
  const awayTeam = sanitizeString(attrs.auswaertsmannschaft?.data?.attributes?.name || '')
  const isHome = homeTeam.includes(teamName) || homeTeam.includes('Viktoria')
  
  // Determine if this is a past or future game
  const gameDate = new Date(attrs.datum)
  const now = new Date()
  const type: 'last' | 'next' = gameDate < now ? 'last' : 'next'
  
  return {
    id: strapiGame.id,
    type,
    homeTeam,
    awayTeam,
    homeScore: attrs.tore_heim !== undefined ? validateNumber(attrs.tore_heim, undefined, 0) : undefined,
    awayScore: attrs.tore_auswaerts !== undefined ? validateNumber(attrs.tore_auswaerts, undefined, 0) : undefined,
    date: formatDate(gameDate),
    time: formatTime(gameDate),
    isHome,
    stadium: sanitizeString(attrs.spielort || 'Unbekannt'),
    referee: sanitizeString(attrs.schiedsrichter || 'N/A'),
    status: validateGameStatus(attrs.status),
    goalScorers: validateMatchEvents(attrs.torschuetzen),
    yellowCards: validateMatchEvents(attrs.gelbe_karten),
    redCards: validateMatchEvents(attrs.rote_karten),
    lastMeeting: attrs.letztes_aufeinandertreffen ? validateLastMeeting(attrs.letztes_aufeinandertreffen) : undefined
  }
}

/**
 * Calculate team statistics from game results
 * @param games - Array of completed games
 * @param teamName - Name of the team
 * @returns TeamStats - Calculated statistics
 */
export const calculateTeamStatsFromGames = (games: GameDetails[], teamName: string): TeamStats => {
  const completedGames = games.filter(game => 
    game.homeScore !== undefined && 
    game.awayScore !== undefined &&
    game.status === 'beendet'
  )
  
  let siege = 0
  let unentschieden = 0
  let niederlagen = 0
  let tore_fuer = 0
  let tore_gegen = 0
  
  completedGames.forEach(game => {
    const teamScore = game.isHome ? game.homeScore! : game.awayScore!
    const opponentScore = game.isHome ? game.awayScore! : game.homeScore!
    
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
}

/**
 * Generate form array from recent games
 * @param games - Array of games
 * @param teamName - Name of the team
 * @param count - Number of recent games to consider (default: 5)
 * @returns ('S' | 'U' | 'N')[] - Form array (most recent first)
 */
export const generateFormArray = (games: GameDetails[], teamName: string, count: number = 5): ('S' | 'U' | 'N')[] => {
  const completedGames = games
    .filter(game => 
      game.homeScore !== undefined && 
      game.awayScore !== undefined &&
      game.status === 'beendet'
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count)
  
  return completedGames.map(game => {
    const teamScore = game.isHome ? game.homeScore! : game.awayScore!
    const opponentScore = game.isHome ? game.awayScore! : game.homeScore!
    
    if (teamScore > opponentScore) return 'S'
    if (teamScore === opponentScore) return 'U'
    return 'N'
  })
}

/**
 * Calculate trend based on recent form
 * @param formArray - Array of recent results
 * @returns 'steigend' | 'gleich' | 'fallend' - Trend indicator
 */
export const calculateTrend = (formArray: ('S' | 'U' | 'N')[]): 'steigend' | 'gleich' | 'fallend' => {
  if (formArray.length < 3) return 'gleich'
  
  // Calculate points for recent games (most recent 3)
  const recent3 = formArray.slice(0, 3)
  const older3 = formArray.slice(3, 6)
  
  const calculatePoints = (results: ('S' | 'U' | 'N')[]) => 
    results.reduce((sum, result) => {
      if (result === 'S') return sum + 3
      if (result === 'U') return sum + 1
      return sum
    }, 0)
  
  const recentPoints = calculatePoints(recent3)
  const olderPoints = calculatePoints(older3)
  
  if (recentPoints > olderPoints) return 'steigend'
  if (recentPoints < olderPoints) return 'fallend'
  return 'gleich'
}

/**
 * Transform team data for component consumption
 * @param teamData - Raw team data
 * @param games - Team's games for additional calculations
 * @returns TeamData - Component-ready team data
 */
export const transformTeamDataForComponent = (teamData: TeamData, games?: GameDetails[]): TeamData => {
  let transformedData = { ...teamData }
  
  // If games are provided, calculate additional stats
  if (games && games.length > 0) {
    const calculatedStats = calculateTeamStatsFromGames(games, teamData.name)
    const formArray = generateFormArray(games, teamData.name)
    const trend = calculateTrend(formArray)
    
    // Use calculated stats if they seem more accurate
    if (calculatedStats.spiele_gesamt > 0) {
      transformedData = {
        ...transformedData,
        ...calculatedStats,
        form_letzte_5: formArray,
        trend
      }
    }
  }
  
  // Ensure data consistency
  transformedData = validateTeamDataConsistency(transformedData)
  
  return transformedData
}

/**
 * Get team display name for different contexts
 * @param teamId - Team ID
 * @param context - Display context ('full', 'short', 'abbrev')
 * @returns string - Formatted team name
 */
export const getTeamDisplayName = (teamId: TeamId, context: 'full' | 'short' | 'abbrev' = 'full'): string => {
  const teamNames = {
    '1': {
      full: '1. Mannschaft',
      short: '1. Mannschaft',
      abbrev: 'I'
    },
    '2': {
      full: '2. Mannschaft', 
      short: '2. Mannschaft',
      abbrev: 'II'
    },
    '3': {
      full: '3. Mannschaft',
      short: '3. Mannschaft', 
      abbrev: 'III'
    }
  }
  
  return teamNames[teamId][context]
}

/**
 * Format game result for display
 * @param game - Game details
 * @param teamName - Name of the team
 * @returns string - Formatted result (e.g., "2:1 (H)", "0:3 (A)")
 */
export const formatGameResult = (game: GameDetails, teamName: string): string => {
  if (game.homeScore === undefined || game.awayScore === undefined) {
    return 'vs ' + (game.isHome ? game.awayTeam : game.homeTeam)
  }
  
  const teamScore = game.isHome ? game.homeScore : game.awayScore
  const opponentScore = game.isHome ? game.awayScore : game.homeScore
  const location = game.isHome ? '(H)' : '(A)'
  
  return `${teamScore}:${opponentScore} ${location}`
}

// Validation and sanitization helper functions

/**
 * Sanitize string input
 */
const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return ''
  return input.trim().replace(/[<>]/g, '')
}

/**
 * Validate and sanitize number input
 */
const validateNumber = (input: any, defaultValue: number = 0, min?: number, max?: number): number => {
  const num = typeof input === 'number' ? input : parseInt(input, 10)
  
  if (isNaN(num)) return defaultValue
  if (min !== undefined && num < min) return min
  if (max !== undefined && num > max) return max
  
  return num
}

/**
 * Validate form array
 */
const validateFormArray = (input: any): ('S' | 'U' | 'N')[] => {
  if (!Array.isArray(input)) return []
  
  return input
    .filter(item => ['S', 'U', 'N'].includes(item))
    .slice(0, 5) // Max 5 entries
}

/**
 * Validate trend value
 */
const validateTrend = (input: any): 'steigend' | 'gleich' | 'fallend' => {
  const validTrends = ['steigend', 'gleich', 'fallend']
  return validTrends.includes(input) ? input : 'gleich'
}

/**
 * Validate status value
 */
const validateStatus = (input: any): 'aktiv' | 'inaktiv' | 'aufgeloest' => {
  const validStatuses = ['aktiv', 'inaktiv', 'aufgeloest']
  return validStatuses.includes(input) ? input : 'aktiv'
}

/**
 * Validate game status
 */
const validateGameStatus = (input: any): 'geplant' | 'live' | 'beendet' | 'abgesagt' | 'verschoben' => {
  const validStatuses = ['geplant', 'live', 'beendet', 'abgesagt', 'verschoben']
  return validStatuses.includes(input) ? input : 'geplant'
}

/**
 * Validate match events array
 */
const validateMatchEvents = (input: any): Array<{minute: number; player: string; team: 'home' | 'away'}> => {
  if (!Array.isArray(input)) return []
  
  return input
    .filter(event => 
      event && 
      typeof event.minute === 'number' && 
      typeof event.player === 'string' &&
      ['home', 'away'].includes(event.team)
    )
    .map(event => ({
      minute: validateNumber(event.minute, 0, 0, 120),
      player: sanitizeString(event.player),
      team: event.team
    }))
}

/**
 * Validate last meeting data
 */
const validateLastMeeting = (input: any): {date: string; result: string; location: 'heim' | 'auswaerts'} | undefined => {
  if (!input || typeof input !== 'object') return undefined
  
  if (!input.date || !input.result || !['heim', 'auswaerts'].includes(input.location)) {
    return undefined
  }
  
  return {
    date: sanitizeString(input.date),
    result: sanitizeString(input.result),
    location: input.location
  }
}

/**
 * Format date for display
 */
const formatDate = (date: Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return new Date().toLocaleDateString('de-DE')
  }
  return date.toLocaleDateString('de-DE')
}

/**
 * Format time for display
 */
const formatTime = (date: Date): string => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '15:00'
  }
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Validate team data consistency
 */
const validateTeamDataConsistency = (teamData: TeamData): TeamData => {
  const validated = { ...teamData }
  
  // Ensure games total matches individual results
  const totalGames = validated.siege + validated.unentschieden + validated.niederlagen
  if (totalGames !== validated.spiele_gesamt && totalGames > 0) {
    console.warn('Team data inconsistency detected: adjusting total games')
    validated.spiele_gesamt = totalGames
  }
  
  // Ensure goal difference is correct
  const calculatedDifference = validated.tore_fuer - validated.tore_gegen
  if (calculatedDifference !== validated.tordifferenz) {
    console.warn('Goal difference inconsistency detected: adjusting')
    validated.tordifferenz = calculatedDifference
  }
  
  // Ensure points are reasonable (max 3 per game)
  const maxPossiblePoints = validated.spiele_gesamt * 3
  if (validated.punkte > maxPossiblePoints) {
    console.warn('Points inconsistency detected: adjusting')
    validated.punkte = Math.min(validated.punkte, maxPossiblePoints)
  }
  
  return validated
}

/**
 * Export all transformation functions
 */
export const dataTransformers = {
  transformStrapiToTeamData,
  transformStrapiToGameDetails,
  calculateTeamStatsFromGames,
  generateFormArray,
  calculateTrend,
  transformTeamDataForComponent,
  getTeamDisplayName,
  formatGameResult
}

export default dataTransformers