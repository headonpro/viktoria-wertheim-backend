import axios from 'axios'

// Strapi API Base URL
import { getApiUrl } from '../lib/apiConfig';
const API_BASE_URL = getApiUrl();

// Strapi Club Response Interface (Strapi 5 format)
interface StrapiClub {
  id: number
  documentId: string
  name: string
  kurz_name: string
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
  vereinsfarben?: string
  heimstadion?: string
  adresse?: string
  website?: string
  kontakt?: string
  ist_unser_verein: boolean
  liga?: string
  platz?: number
  spiele?: number
  siege?: number
  unentschieden?: number
  niederlagen?: number
  tore_fuer?: number
  tore_gegen?: number
  tordifferenz?: number
  punkte?: number
  createdAt: string
  updatedAt: string
  publishedAt: string
}

interface StrapiResponse {
  data: StrapiClub[]
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

// Transform Strapi Club data to Frontend Team format
const transformStrapiClubToTeam = (strapiClub: StrapiClub): Team => {
  return {
    position: strapiClub.platz || 0,
    name: strapiClub.name || 'Unknown Team',
    logo: strapiClub.logo?.url
      ? `${API_BASE_URL}${strapiClub.logo.url}`
      : undefined,
    games: strapiClub.spiele || 0,
    wins: strapiClub.siege || 0,
    draws: strapiClub.unentschieden || 0,
    losses: strapiClub.niederlagen || 0,
    goalsFor: strapiClub.tore_fuer || 0,
    goalsAgainst: strapiClub.tore_gegen || 0,
    goalDifference: strapiClub.tordifferenz || 0,
    points: strapiClub.punkte || 0
  }
}

// API Service Functions
export const leagueService = {
  /**
   * Fetch all league standings from Strapi (now using clubs directly)
   * @returns Promise<Team[]> - Array of teams sorted by position
   */
  async fetchLeagueStandings(): Promise<Team[]> {
    try {
      const response = await axios.get<StrapiResponse>(
        `${API_BASE_URL}/api/clubs`,
        {
          params: {
            sort: 'platz:asc', // Sort by position ascending
            'pagination[pageSize]': 100, // Get all teams
            'populate': 'logo',
            'filters[platz][$notNull]': true // Only get clubs with table positions
          }
        }
      )

      if (!response.data?.data) {
        throw new Error('Invalid API response structure')
      }

      // Transform and return sorted data
      return response.data.data
        .map(transformStrapiClubToTeam)
        .filter(team => team.position > 0) // Only teams with valid positions
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
        `${API_BASE_URL}/api/clubs`,
        {
          params: {
            'filters[liga][$eq]': leagueName,
            'filters[platz][$notNull]': true,
            sort: 'platz:asc',
            'pagination[pageSize]': 100,
            'populate': 'logo'
          }
        }
      )

      if (!response.data?.data) {
        return []
      }

      return response.data.data
        .map(transformStrapiClubToTeam)
        .filter(team => team.position > 0)
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
        `${API_BASE_URL}/api/clubs`,
        {
          params: {
            'filters[name][$eq]': teamName,
            'populate': 'logo'
          }
        }
      )

      if (!response.data?.data || response.data.data.length === 0) {
        return null
      }

      return transformStrapiClubToTeam(response.data.data[0])

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