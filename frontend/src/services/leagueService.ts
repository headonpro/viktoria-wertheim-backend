import axios from 'axios'

// Strapi API Base URL
import { getApiUrl } from '../lib/apiConfig';
const API_BASE_URL = getApiUrl();

// Strapi Response Interface (Strapi 5 format)
interface StrapiTabellenEintrag {
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
  form_letzte_5?: any
  liga?: {
    id: number
    documentId: string
    name: string
    saison: string
  }
  club?: {
    id: number
    documentId: string
    name: string
    logo?: {
      id: number
      documentId: string
      name: string
      alternativeText?: string
      caption?: string
      width: number
      height: number
      formats?: any
      hash: string
      ext: string
      mime: string
      size: number
      url: string
      previewUrl?: string
      provider: string
      provider_metadata?: any
      createdAt: string
      updatedAt: string
      publishedAt: string
    }
  }
  createdAt: string
  updatedAt: string
  publishedAt: string
}

interface StrapiResponse {
  data: StrapiTabellenEintrag[]
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

// Transform Strapi data to Frontend format (Strapi 5 - data is in root level)
const transformStrapiToTeam = (strapiEntry: StrapiTabellenEintrag): Team => {
  return {
    position: strapiEntry.platz,
    name: strapiEntry.club?.name || 'Unknown Team',
    logo: strapiEntry.club?.logo?.url
      ? `${API_BASE_URL}${strapiEntry.club.logo.url}`
      : undefined,
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
   * Fetch all league standings from Strapi
   * @returns Promise<Team[]> - Array of teams sorted by position
   */
  async fetchLeagueStandings(): Promise<Team[]> {
    try {
      const response = await axios.get<StrapiResponse>(
        `${API_BASE_URL}/api/tabellen-eintraege`,
        {
          params: {
            sort: 'platz:asc', // Sort by position ascending
            'pagination[pageSize]': 100, // Get all teams
            'populate[0]': 'club',
            'populate[1]': 'liga'
          }
        }
      )

      if (!response.data?.data) {
        throw new Error('Invalid API response structure')
      }

      // Transform and return sorted data
      return response.data.data
        .map(transformStrapiToTeam)
        .sort((a, b) => a.position - b.position)

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
      const response = await axios.get<StrapiResponse>(
        `${API_BASE_URL}/api/tabellen-eintraege`,
        {
          params: {
            'filters[liga][name][$eq]': leagueName,
            sort: 'platz:asc',
            'pagination[pageSize]': 100,
            'populate[0]': 'club',
            'populate[1]': 'liga'
          }
        }
      )

      if (!response.data?.data) {
        return []
      }

      return response.data.data
        .map(transformStrapiToTeam)
        .sort((a, b) => a.position - b.position)

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
      const response = await axios.get<StrapiResponse>(
        `${API_BASE_URL}/api/tabellen-eintraege`,
        {
          params: {
            'filters[club][name][$eq]': teamName,
            'populate[0]': 'club'
          }
        }
      )

      if (!response.data?.data || response.data.data.length === 0) {
        return null
      }

      return transformStrapiToTeam(response.data.data[0])

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