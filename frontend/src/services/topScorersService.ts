import axios from 'axios'
import { getApiUrl } from '../lib/apiConfig'

// API Base URL
const API_BASE_URL = getApiUrl()

// TopScorer Interface
export interface TopScorer {
  id: number
  name: string
  team_name: string
  tore: number
  spiele: number
  ist_viktoria_spieler: boolean
}

// Strapi v5 Response Interface
interface StrapiV5SpielerStatistik {
  id: number
  documentId: string
  name: string
  team_name: string
  tore: number
  spiele: number
  ist_viktoria_spieler: boolean
  createdAt: string
  updatedAt: string
}

// Fallback data for graceful degradation
const getFallbackTopScorers = (): TopScorer[] => [
  { id: 1, name: 'Thomas Müller', team_name: 'Viktoria Wertheim', tore: 12, spiele: 18, ist_viktoria_spieler: true },
  { id: 2, name: 'Michael Schmidt', team_name: 'Viktoria Wertheim', tore: 9, spiele: 18, ist_viktoria_spieler: true },
  { id: 3, name: 'Andreas Weber', team_name: 'FC Tauberbischofsheim', tore: 8, spiele: 16, ist_viktoria_spieler: false },
  { id: 4, name: 'Stefan Braun', team_name: 'Viktoria Wertheim', tore: 7, spiele: 17, ist_viktoria_spieler: true },
  { id: 5, name: 'Marco Richter', team_name: 'SV Lauda', tore: 6, spiele: 15, ist_viktoria_spieler: false },
  { id: 6, name: 'Daniel Fischer', team_name: 'Viktoria Wertheim', tore: 5, spiele: 16, ist_viktoria_spieler: true },
  { id: 7, name: 'Kevin Hoffmann', team_name: 'TSV Königshofen', tore: 5, spiele: 14, ist_viktoria_spieler: false },
  { id: 8, name: 'Florian Keller', team_name: 'Viktoria Wertheim', tore: 4, spiele: 18, ist_viktoria_spieler: true }
]

// Transform Strapi data to TopScorer format
const transformStrapiToTopScorer = (strapiData: StrapiV5SpielerStatistik): TopScorer => ({
  id: strapiData.id,
  name: strapiData.name,
  team_name: strapiData.team_name,
  tore: strapiData.tore,
  spiele: strapiData.spiele,
  ist_viktoria_spieler: strapiData.ist_viktoria_spieler
})

// TopScorers Service
export const topScorersService = {
  /**
   * Fetch top scorers from API with fallback
   * @param limit - Number of top scorers to fetch (default: 10)
   * @returns Promise<TopScorer[]> - Array of top scorers
   */
  async fetchTopScorers(limit: number = 10): Promise<TopScorer[]> {
    try {
      const response = await axios.get<StrapiV5SpielerStatistik[]>(
        `${API_BASE_URL}/api/spieler-statistiks`,
        {
          params: {
            sort: 'tore:desc',
            'pagination[limit]': limit
          }
        }
      )

      if (!response.data || response.data.length === 0) {
        console.warn('No top scorers data found, using fallback')
        return getFallbackTopScorers().slice(0, limit)
      }

      return response.data.map(transformStrapiToTopScorer)

    } catch (error) {
      console.warn('Error fetching top scorers:', error)
      return getFallbackTopScorers().slice(0, limit)
    }
  },

  /**
   * Fetch Viktoria players only
   * @param limit - Number of players to fetch
   * @returns Promise<TopScorer[]> - Array of Viktoria players
   */
  async fetchViktoriaTopScorers(limit: number = 5): Promise<TopScorer[]> {
    try {
      const response = await axios.get<StrapiV5SpielerStatistik[]>(
        `${API_BASE_URL}/api/spieler-statistiks`,
        {
          params: {
            'filters[ist_viktoria_spieler][$eq]': true,
            sort: 'tore:desc',
            'pagination[limit]': limit
          }
        }
      )

      if (!response.data || response.data.length === 0) {
        return getFallbackTopScorers()
          .filter(player => player.ist_viktoria_spieler)
          .slice(0, limit)
      }

      return response.data.map(transformStrapiToTopScorer)

    } catch (error) {
      console.warn('Error fetching Viktoria top scorers:', error)
      return getFallbackTopScorers()
        .filter(player => player.ist_viktoria_spieler)
        .slice(0, limit)
    }
  }
}

export default topScorersService