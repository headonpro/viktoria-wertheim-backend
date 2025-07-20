import axios from 'axios'

// Strapi API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'

// Strapi Response Interface (Strapi 5 format)
interface StrapiLeaderboardEntry {
  id: number
  documentId: string
  position: number
  teamname: string
  spiele: number
  siege: number
  unentschieden: number
  niederlagen: number
  tore: number
  gegentore: number
  tordifferenz: number
  punkte: number
  logo?: {
    data?: {
      attributes: {
        url: string
        name: string
      }
    }
  }
  createdAt: string
  updatedAt: string
  publishedAt: string
}

interface StrapiResponse {
  data: StrapiLeaderboardEntry[]
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
const transformStrapiToTeam = (strapiEntry: StrapiLeaderboardEntry): Team => {
  return {
    position: strapiEntry.position,
    name: strapiEntry.teamname,
    logo: strapiEntry.logo?.data?.attributes?.url
      ? `${API_BASE_URL}${strapiEntry.logo.data.attributes.url}`
      : undefined,
    games: strapiEntry.spiele || 0,
    wins: strapiEntry.siege || 0,
    draws: strapiEntry.unentschieden || 0,
    losses: strapiEntry.niederlagen || 0,
    goalsFor: strapiEntry.tore || 0,
    goalsAgainst: strapiEntry.gegentore || 0,
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
        `${API_BASE_URL}/api/leaderboard-entries`,
        {
          params: {
            'sort[0]': 'position:asc', // Sort by position ascending
            'pagination[pageSize]': 100, // Get all teams
            'populate': 'logo' // Include logo media
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
   * Fetch specific team standing by team name
   * @param teamName - Name of the team to fetch
   * @returns Promise<Team | null> - Team data or null if not found
   */
  async fetchTeamStanding(teamName: string): Promise<Team | null> {
    try {
      const response = await axios.get<StrapiResponse>(
        `${API_BASE_URL}/api/leaderboard-entries`,
        {
          params: {
            'filters[teamname][$eq]': teamName,
            'populate': 'logo'
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