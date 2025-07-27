/**
 * Unit Tests for teamService - Task 7
 * 
 * Tests all requirements:
 * - Schreibe Tests für `fetchLastAndNextGame()` mit verschiedenen teamId-Parametern
 * - Schreibe Tests für korrekte API-URL-Generierung mit Filtern
 * - Schreibe Tests für Error-Handling bei API-Fehlern
 * - Schreibe Tests für Graceful-Degradation bei fehlenden Daten
 * _Requirements: 6.1, 6.2, 6.3, 6.4_
 * 
 * @jest-environment node
 */

import axios from 'axios'
import { teamService } from '../teamService'
import { TeamId } from '../../types/strapi'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock API configuration
jest.mock('../../lib/apiConfig', () => ({
  getApiUrl: () => 'http://localhost:1337'
}))

describe('teamService.fetchLastAndNextGame', () => {
  const API_BASE_URL = 'http://localhost:1337'

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset console.warn mock
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('API URL Generation with Filters', () => {
    it('should generate correct API URLs with mannschaft filters for team 1', async () => {
      // Mock successful responses
      mockedAxios.get.mockResolvedValue({
        data: { data: [] }
      })

      await teamService.fetchLastAndNextGame('1')

      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=m1`
      )
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=m1&populate=gegner_team`
      )
    })

    it('should generate correct API URLs with mannschaft filters for team 2', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { data: [] }
      })

      await teamService.fetchLastAndNextGame('2')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=m2`
      )
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=m2&populate=gegner_team`
      )
    })

    it('should generate correct API URLs with mannschaft filters for team 3', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { data: [] }
      })

      await teamService.fetchLastAndNextGame('3')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=m3`
      )
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=m3&populate=gegner_team`
      )
    })

    it('should make parallel API calls for both endpoints', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { data: [] }
      })

      const startTime = Date.now()
      await teamService.fetchLastAndNextGame('1')
      const endTime = Date.now()

      // Verify both calls were made
      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
      
      // Verify calls were made in parallel (should be fast)
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('Successful Data Transformation', () => {
    it('should transform last game data correctly', async () => {
      const mockLastGameData = {
        id: 1,
        datum: '2024-01-15T15:00:00.000Z',
        gegner: 'FC Test',
        ist_heimspiel: true,
        unsere_tore: 2,
        gegner_tore: 1,
        mannschaft: 'm1'
      }

      mockedAxios.get
        .mockResolvedValueOnce({ data: { data: [mockLastGameData] } }) // last game
        .mockResolvedValueOnce({ data: { data: [] } }) // next game

      const result = await teamService.fetchLastAndNextGame('1')

      expect(result.lastGame).toEqual({
        id: 1,
        type: 'last',
        homeTeam: 'SV Viktoria Wertheim',
        awayTeam: 'FC Test',
        homeScore: 2,
        awayScore: 1,
        date: new Date('2024-01-15T15:00:00.000Z').toLocaleDateString('de-DE'),
        time: new Date('2024-01-15T15:00:00.000Z').toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        isHome: true,
        stadium: 'Viktoria-Stadion Wertheim',
        referee: 'N/A',
        status: 'beendet',
        goalScorers: [],
        yellowCards: [],
        redCards: [],
        lastMeeting: undefined
      })
    })

    it('should transform next game data correctly', async () => {
      const mockNextGameData = {
        id: 2,
        datum: '2024-01-22T14:30:00.000Z',
        ist_heimspiel: false,
        mannschaft: 'm2',
        gegner_team: {
          name: 'SV Gegner'
        }
      }

      mockedAxios.get
        .mockResolvedValueOnce({ data: { data: [] } }) // last game
        .mockResolvedValueOnce({ data: { data: [mockNextGameData] } }) // next game

      const result = await teamService.fetchLastAndNextGame('2')

      expect(result.nextGame).toEqual({
        id: 2,
        type: 'next',
        homeTeam: 'SV Gegner',
        awayTeam: 'SV Viktoria Wertheim',
        homeScore: undefined,
        awayScore: undefined,
        date: new Date('2024-01-22T14:30:00.000Z').toLocaleDateString('de-DE'),
        time: new Date('2024-01-22T14:30:00.000Z').toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        isHome: false,
        stadium: 'Auswärts bei SV Gegner',
        referee: 'N/A',
        status: 'geplant',
        goalScorers: [],
        yellowCards: [],
        redCards: [],
        lastMeeting: undefined
      })
    })

    it('should handle away games correctly for last games', async () => {
      const mockLastGameData = {
        id: 1,
        datum: '2024-01-15T15:00:00.000Z',
        gegner: 'FC Away',
        ist_heimspiel: false,
        unsere_tore: 1,
        gegner_tore: 3,
        mannschaft: 'm1'
      }

      mockedAxios.get
        .mockResolvedValueOnce({ data: { data: [mockLastGameData] } })
        .mockResolvedValueOnce({ data: { data: [] } })

      const result = await teamService.fetchLastAndNextGame('1')

      expect(result.lastGame).toEqual(
        expect.objectContaining({
          homeTeam: 'FC Away',
          awayTeam: 'SV Viktoria Wertheim',
          homeScore: 3,
          awayScore: 1,
          isHome: false,
          stadium: 'Auswärts bei FC Away'
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error')
      mockedAxios.get.mockRejectedValue(networkError)

      const result = await teamService.fetchLastAndNextGame('1')

      expect(result).toEqual({
        lastGame: null,
        nextGame: null
      })

      expect(console.warn).toHaveBeenCalledWith(
        'Error fetching last/next games for 1. Mannschaft (Team 1):',
        networkError
      )
    })

    it('should handle 404 errors with team-specific messaging', async () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          statusText: 'Not Found'
        }
      }
      mockedAxios.get.mockRejectedValue(axiosError)
      mockedAxios.isAxiosError.mockReturnValue(true)

      const result = await teamService.fetchLastAndNextGame('2')

      expect(result).toEqual({
        lastGame: null,
        nextGame: null
      })

      expect(console.warn).toHaveBeenCalledWith(
        'Error fetching last/next games for 2. Mannschaft (Team 2):',
        axiosError
      )
      expect(console.warn).toHaveBeenCalledWith(
        'No game data found for 2. Mannschaft'
      )
    })

    it('should handle 500 server errors with team-specific messaging', async () => {
      const serverError = {
        isAxiosError: true,
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      }
      mockedAxios.get.mockRejectedValue(serverError)
      mockedAxios.isAxiosError.mockReturnValue(true)

      const result = await teamService.fetchLastAndNextGame('3')

      expect(result).toEqual({
        lastGame: null,
        nextGame: null
      })

      expect(console.warn).toHaveBeenCalledWith(
        'Error fetching last/next games for 3. Mannschaft (Team 3):',
        serverError
      )
      expect(console.warn).toHaveBeenCalledWith(
        'Server error while fetching games for 3. Mannschaft'
      )
    })

    it('should handle API errors with status codes', async () => {
      const apiError = {
        isAxiosError: true,
        response: {
          status: 400,
          statusText: 'Bad Request'
        }
      }
      mockedAxios.get.mockRejectedValue(apiError)
      mockedAxios.isAxiosError.mockReturnValue(true)

      const result = await teamService.fetchLastAndNextGame('1')

      expect(result).toEqual({
        lastGame: null,
        nextGame: null
      })

      expect(console.warn).toHaveBeenCalledWith(
        'API error for 1. Mannschaft: 400 Bad Request'
      )
    })

    it('should handle axios errors without response', async () => {
      const networkError = {
        isAxiosError: true,
        message: 'Request timeout'
      }
      mockedAxios.get.mockRejectedValue(networkError)
      mockedAxios.isAxiosError.mockReturnValue(true)

      const result = await teamService.fetchLastAndNextGame('2')

      expect(result).toEqual({
        lastGame: null,
        nextGame: null
      })

      expect(console.warn).toHaveBeenCalledWith(
        'Network error for 2. Mannschaft: Request timeout'
      )
    })

    it('should handle non-axios errors', async () => {
      const unknownError = new TypeError('Unknown error')
      mockedAxios.get.mockRejectedValue(unknownError)
      mockedAxios.isAxiosError.mockReturnValue(false)

      const result = await teamService.fetchLastAndNextGame('3')

      expect(result).toEqual({
        lastGame: null,
        nextGame: null
      })

      expect(console.warn).toHaveBeenCalledWith(
        'Unknown error for 3. Mannschaft:',
        unknownError
      )
    })
  })

  describe('Graceful Degradation with Missing Data', () => {
    it('should handle empty API responses gracefully', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { data: [] }
      })

      const result = await teamService.fetchLastAndNextGame('1')

      expect(result).toEqual({
        lastGame: null,
        nextGame: null
      })
    })

    it('should handle missing data property in response', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {}
      })

      const result = await teamService.fetchLastAndNextGame('2')

      expect(result).toEqual({
        lastGame: null,
        nextGame: null
      })
    })

    it('should handle null response data', async () => {
      mockedAxios.get.mockResolvedValue({
        data: null
      })

      const result = await teamService.fetchLastAndNextGame('3')

      expect(result).toEqual({
        lastGame: null,
        nextGame: null
      })
    })

    it('should handle missing gegner_team in next game data', async () => {
      const mockNextGameData = {
        id: 2,
        datum: '2024-01-22T14:30:00.000Z',
        ist_heimspiel: false,
        mannschaft: 'm1'
        // gegner_team is missing
      }

      mockedAxios.get
        .mockResolvedValueOnce({ data: { data: [] } })
        .mockResolvedValueOnce({ data: { data: [mockNextGameData] } })

      const result = await teamService.fetchLastAndNextGame('1')

      expect(result.nextGame).toEqual(
        expect.objectContaining({
          homeTeam: 'Unbekannter Gegner',
          awayTeam: 'SV Viktoria Wertheim',
          stadium: 'Auswärts bei Unbekannter Gegner'
        })
      )
    })

    it('should handle missing scores in last game data', async () => {
      const mockLastGameData = {
        id: 1,
        datum: '2024-01-15T15:00:00.000Z',
        gegner: 'FC Test',
        ist_heimspiel: true,
        mannschaft: 'm1'
        // unsere_tore and gegner_tore are missing
      }

      mockedAxios.get
        .mockResolvedValueOnce({ data: { data: [mockLastGameData] } })
        .mockResolvedValueOnce({ data: { data: [] } })

      const result = await teamService.fetchLastAndNextGame('1')

      expect(result.lastGame).toEqual(
        expect.objectContaining({
          homeScore: undefined,
          awayScore: undefined
        })
      )
    })

    it('should handle partial API failures (one endpoint fails)', async () => {
      // First call (last games) succeeds, second call (next games) fails
      mockedAxios.get
        .mockResolvedValueOnce({ data: { data: [] } })
        .mockRejectedValueOnce(new Error('Next games API failed'))

      const result = await teamService.fetchLastAndNextGame('1')

      expect(result).toEqual({
        lastGame: null,
        nextGame: null
      })

      expect(console.warn).toHaveBeenCalledWith(
        'Error fetching last/next games for 1. Mannschaft (Team 1):',
        expect.any(Error)
      )
    })
  })

  describe('Team ID Parameter Validation', () => {
    it('should work with all valid team IDs', async () => {
      mockedAxios.get.mockResolvedValue({ data: { data: [] } })

      const teamIds: TeamId[] = ['1', '2', '3']
      
      for (const teamId of teamIds) {
        await teamService.fetchLastAndNextGame(teamId)
        
        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining(`filters[mannschaft][$eq]=m${teamId}`)
        )
      }

      expect(mockedAxios.get).toHaveBeenCalledTimes(6) // 2 calls per team * 3 teams
    })

    it('should map frontend team IDs to backend mannschaft values correctly', async () => {
      mockedAxios.get.mockResolvedValue({ data: { data: [] } })

      // Test the mapping: frontend "1" -> backend "m1"
      await teamService.fetchLastAndNextGame('1')
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('filters[mannschaft][$eq]=m1')
      )

      // Test the mapping: frontend "2" -> backend "m2"
      await teamService.fetchLastAndNextGame('2')
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('filters[mannschaft][$eq]=m2')
      )

      // Test the mapping: frontend "3" -> backend "m3"
      await teamService.fetchLastAndNextGame('3')
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('filters[mannschaft][$eq]=m3')
      )
    })
  })

  describe('Performance and Concurrency', () => {
    it('should make concurrent API calls for better performance', async () => {
      let callOrder: string[] = []
      
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('game-cards') && !url.includes('next-game-cards')) {
          callOrder.push('last')
        } else if (url.includes('next-game-cards')) {
          callOrder.push('next')
        }
        return Promise.resolve({ data: { data: [] } })
      })

      await teamService.fetchLastAndNextGame('1')

      // Both calls should be initiated (order doesn't matter for concurrent calls)
      expect(callOrder).toHaveLength(2)
      expect(callOrder).toContain('last')
      expect(callOrder).toContain('next')
    })

    it('should not block on individual API call failures', async () => {
      // Simulate one slow/failing call
      mockedAxios.get
        .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ data: { data: [] } }), 100)))
        .mockRejectedValueOnce(new Error('Fast failure'))

      const startTime = Date.now()
      const result = await teamService.fetchLastAndNextGame('1')
      const endTime = Date.now()

      // Should fail fast due to Promise.all behavior
      expect(result).toEqual({
        lastGame: null,
        nextGame: null
      })
      
      // Should not wait for the slow call to complete
      expect(endTime - startTime).toBeLessThan(200)
    })
  })
})