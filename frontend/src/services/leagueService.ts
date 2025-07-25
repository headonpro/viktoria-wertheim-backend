import axios from 'axios'

// Strapi API Base URL
import { getApiUrl } from '../lib/apiConfig';
const API_BASE_URL = getApiUrl();

// Strapi v5 Tabellen-Eintrag Response Interface
interface StrapiV5TabellenEintrag {
  id: number
  documentId: string
  platz: number
  spiele: number
  siege: number
  unentschieden: number
  niederlagen: number
  tore_fuer: number
  tore_gegen: number
  tordifferenz: number
  punkte: number
  liga?: {
    id: number
    documentId: string
    name: string
    kurz_name?: string
  }
  team?: {
    id: number
    documentId: string
    name: string
    teamfoto?: {
      id: number
      url: string
      alternativeText?: string
    }
  }
  createdAt: string
  updatedAt: string
}

interface StrapiV5Response {
  data: StrapiV5TabellenEintrag[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      pageCount: number
      total: number
    }
  }
}

// Frontend Team Interface (matches LeagueTable.tsx)
export interface Team {
  position: number
  name: string
  logo?: string
  games: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

// Transform Strapi v5 Tabellen-Eintrag data to Frontend Team format
const transformStrapiV5TabellenEintragToTeam = (strapiEntry: StrapiV5TabellenEintrag): Team => {
  const teamLogo = strapiEntry.team?.teamfoto?.url
  
  return {
    position: strapiEntry.platz || 0,
    name: strapiEntry.team?.name || 'Unknown Team',
    logo: teamLogo ? `${API_BASE_URL}${teamLogo}` : undefined,
    games: strapiEntry.spiele || 0,
    wins: strapiEntry.siege || 0,
    draws: strapiEntry.unentschieden || 0,
    losses: strapiEntry.niederlagen || 0,
    goalsFor: strapiEntry.tore_fuer || 0,
    goalsAgainst: strapiEntry.tore_gegen || 0,
    goalDifference: strapiEntry.tordifferenz || 0,
    points: strapiEntry.punkte || 0
  }
}

// API Service Functions
export const leagueService = {
  /**
   * Fetch all league standings from Strapi (using teams endpoint)
   * @returns Promise<Team[]> - Array of teams sorted by position
   */
  async fetchLeagueStandings(): Promise<Team[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/teams`,
        {
          params: {
            sort: 'tabellenplatz:asc', // Sort by position ascending
            'pagination[pageSize]': 100, // Get all teams
            populate: '*'
          }
        }
      )

      if (!response.data || !response.data.data) {
        throw new Error('Invalid API response structure')
      }

      // Transform team data to league table format
      return response.data.data
        .map((team: any) => ({
          position: team.tabellenplatz || 0,
          name: team.name || 'Unknown Team',
          logo: team.teamfoto?.url ? `${API_BASE_URL}${team.teamfoto.url}` : undefined,
          games: team.spiele_gesamt || 0,
          wins: team.siege || 0,
          draws: team.unentschieden || 0,
          losses: team.niederlagen || 0,
          goalsFor: team.tore_fuer || 0,
          goalsAgainst: team.tore_gegen || 0,
          goalDifference: team.tordifferenz || 0,
          points: team.punkte || 0
        }))
        .filter((team: Team) => team.position > 0) // Only teams with valid positions
        .sort((a: Team, b: Team) => a.position - b.position)

    } catch (error) {
      console.error('Error fetching league standings:', error)
      throw new Error('Failed to fetch league standings')
    }
  },

  /**
   * Fetch league standings for a specific league
   * @param leagueName - Name of the league to filter by
   * @returns Promise<Team[]> - Array of teams in the specified league
   */
  async fetchLeagueStandingsByLeague(leagueName: string): Promise<Team[]> {
    try {
      // Try both liga relation and liga_name field for flexibility
      const [relationResponse, nameResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/teams`, {
          params: {
            'filters[liga][name][$eq]': leagueName,
            sort: 'tabellenplatz:asc',
            'pagination[pageSize]': 100,
            populate: '*'
          }
        }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/api/teams`, {
          params: {
            'filters[liga_name][$eq]': leagueName,
            sort: 'tabellenplatz:asc',
            'pagination[pageSize]': 100,
            populate: '*'
          }
        }).catch(() => ({ data: [] }))
      ])

      // Combine results and remove duplicates
      const allTeams = [...(relationResponse.data?.data || []), ...(nameResponse.data?.data || [])]
      const uniqueTeams = allTeams.filter((team, index, self) => 
        index === self.findIndex(t => t.id === team.id)
      )

      if (uniqueTeams.length === 0) {
        return []
      }

      return uniqueTeams
        .map((team: any) => ({
          position: team.tabellenplatz || 0,
          name: team.name || 'Unknown Team',
          logo: team.teamfoto?.url ? `${API_BASE_URL}${team.teamfoto.url}` : undefined,
          games: team.spiele_gesamt || 0,
          wins: team.siege || 0,
          draws: team.unentschieden || 0,
          losses: team.niederlagen || 0,
          goalsFor: team.tore_fuer || 0,
          goalsAgainst: team.tore_gegen || 0,
          goalDifference: team.tordifferenz || 0,
          points: team.punkte || 0
        }))
        .filter((team: Team) => team.position > 0)
        .sort((a: Team, b: Team) => a.position - b.position)

    } catch (error) {
      console.error(`Error fetching league standings for ${leagueName}:`, error)
      return []
    }
  },

  /**
   * Fetch specific team standing by team name
   * @param teamName - Name of the team to fetch
   * @returns Promise<Team | null> - Team data or null if not found
   */
  async fetchTeamStanding(teamName: string): Promise<Team | null> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/teams`,
        {
          params: {
            'filters[name][$eq]': teamName,
            populate: '*'
          }
        }
      )

      if (!response.data || !response.data.data || response.data.data.length === 0) {
        return null
      }

      const team = response.data.data[0]
      return {
        position: team.tabellenplatz || 0,
        name: team.name || 'Unknown Team',
        logo: team.teamfoto?.url ? `${API_BASE_URL}${team.teamfoto.url}` : undefined,
        games: team.spiele_gesamt || 0,
        wins: team.siege || 0,
        draws: team.unentschieden || 0,
        losses: team.niederlagen || 0,
        goalsFor: team.tore_fuer || 0,
        goalsAgainst: team.tore_gegen || 0,
        goalDifference: team.tordifferenz || 0,
        points: team.punkte || 0
      }

    } catch (error) {
      console.error(`Error fetching team standing for ${teamName}:`, error)
      return null
    }
  },

  /**
   * Get Viktoria Wertheim specific data
   * @returns Promise<Team | null> - Viktoria Wertheim team data
   */
  async fetchViktoriaStanding(): Promise<Team | null> {
    return this.fetchTeamStanding('SV Viktoria Wertheim')
  }
}

// Export default
export default leagueService