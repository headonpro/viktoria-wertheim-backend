/**
 * Test suite for updated leagueService with Tabellen-Eintrag API
 */

import axios from 'axios'
import { leagueService } from '../leagueService'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock getApiUrl to return consistent URL for tests
jest.mock('../../lib/apiConfig', () => ({
  getApiUrl: () => 'http://localhost:1337'
}))

// Mock API response data
const mockTabellenEintragResponse = {
  data: {
    data: [
      {
        id: 1,
        documentId: 'test-1',
        team_name: 'SV Viktoria Wertheim',
        platz: 1,
        spiele: 18,
        siege: 12,
        unentschieden: 4,
        niederlagen: 2,
        tore_fuer: 45,
        tore_gegen: 18,
        tordifferenz: 27,
        punkte: 40,
        liga: {
          id: 1,
          documentId: 'liga-1',
          name: 'Kreisliga Tauberbischofsheim',
          kurz_name: 'Kreisliga TB'
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 2,
        documentId: 'test-2',
        team_name: 'VfR Gerlachsheim',
        platz: 2,
        spiele: 18,
        siege: 10,
        unentschieden: 5,
        niederlagen: 3,
        tore_fuer: 38,
        tore_gegen: 22,
        tordifferenz: 16,
        punkte: 35,
        liga: {
          id: 1,
          documentId: 'liga-1',
          name: 'Kreisliga Tauberbischofsheim',
          kurz_name: 'Kreisliga TB'
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      }
    ],
    meta: {
      pagination: {
        page: 1,
        pageSize: 100,
        pageCount: 1,
        total: 2
      }
    }
  }
}

describe('leagueService with Tabellen-Eintrag API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchLeagueStandingsByLiga', () => {
    it('should fetch league standings for a specific league', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockTabellenEintragResponse)

      const result = await leagueService.fetchLeagueStandingsByLiga('Kreisliga Tauberbischofsheim')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:1337/api/tabellen-eintraege',
        {
          params: {
            'filters[liga][name][$eq]': 'Kreisliga Tauberbischofsheim',
            populate: 'liga',
            sort: 'platz:asc',
            'pagination[pageSize]': 100
          }
        }
      )

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        position: 1,
        name: 'SV Viktoria Wertheim',
        logo: undefined,
        games: 18,
        wins: 12,
        draws: 4,
        losses: 2,
        goalsFor: 45,
        goalsAgainst: 18,
        goalDifference: 27,
        points: 40
      })
    })

    it('should return empty array when no data is found', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } })

      const result = await leagueService.fetchLeagueStandingsByLiga('Non-existent League')

      expect(result).toEqual([])
    })

    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))

      const result = await leagueService.fetchLeagueStandingsByLiga('Kreisliga Tauberbischofsheim')

      expect(result).toEqual([])
    })
  })

  describe('fetchLeagueStandingsByTeam', () => {
    it('should fetch league standings for team 1 (Kreisliga)', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockTabellenEintragResponse)

      const result = await leagueService.fetchLeagueStandingsByTeam('1')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:1337/api/tabellen-eintraege',
        {
          params: {
            'filters[liga][name][$eq]': 'Kreisliga Tauberbischofsheim',
            populate: 'liga',
            sort: 'platz:asc',
            'pagination[pageSize]': 100
          }
        }
      )

      expect(result).toHaveLength(2)
    })

    it('should fetch league standings for team 2 (Kreisklasse A)', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockTabellenEintragResponse)

      await leagueService.fetchLeagueStandingsByTeam('2')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:1337/api/tabellen-eintraege',
        {
          params: {
            'filters[liga][name][$eq]': 'Kreisklasse A Tauberbischofsheim',
            populate: 'liga',
            sort: 'platz:asc',
            'pagination[pageSize]': 100
          }
        }
      )
    })

    it('should fetch league standings for team 3 (Kreisklasse B)', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockTabellenEintragResponse)

      await leagueService.fetchLeagueStandingsByTeam('3')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:1337/api/tabellen-eintraege',
        {
          params: {
            'filters[liga][name][$eq]': 'Kreisklasse B Tauberbischofsheim',
            populate: 'liga',
            sort: 'platz:asc',
            'pagination[pageSize]': 100
          }
        }
      )
    })

    it('should return empty array for invalid team ID', async () => {
      const result = await leagueService.fetchLeagueStandingsByTeam('4' as any)

      expect(result).toEqual([])
      expect(mockedAxios.get).not.toHaveBeenCalled()
    })
  })

  describe('getLeagueNameByTeam', () => {
    it('should return correct league names for each team', () => {
      expect(leagueService.getLeagueNameByTeam('1')).toBe('Kreisliga Tauberbischofsheim')
      expect(leagueService.getLeagueNameByTeam('2')).toBe('Kreisklasse A Tauberbischofsheim')
      expect(leagueService.getLeagueNameByTeam('3')).toBe('Kreisklasse B Tauberbischofsheim')
    })

    it('should return empty string for invalid team ID', () => {
      expect(leagueService.getLeagueNameByTeam('4' as any)).toBe('')
    })
  })

  describe('isViktoriaTeam', () => {
    it('should identify Viktoria teams correctly', () => {
      expect(leagueService.isViktoriaTeam('SV Viktoria Wertheim')).toBe(true)
      expect(leagueService.isViktoriaTeam('SV Viktoria Wertheim II')).toBe(true)
      expect(leagueService.isViktoriaTeam('SpG Vikt. Wertheim 3/Grünenwort')).toBe(true)
      expect(leagueService.isViktoriaTeam('VfR Gerlachsheim')).toBe(false)
    })

    it('should identify team-specific Viktoria patterns', () => {
      expect(leagueService.isViktoriaTeam('SV Viktoria Wertheim', '1')).toBe(true)
      expect(leagueService.isViktoriaTeam('SV Viktoria Wertheim II', '2')).toBe(true)
      expect(leagueService.isViktoriaTeam('SpG Vikt. Wertheim 3/Grünenwort', '3')).toBe(true)
      
      // Wrong team patterns should still work with general matching
      expect(leagueService.isViktoriaTeam('SV Viktoria Wertheim II', '1')).toBe(true)
    })
  })

  describe('fetchTeamStanding', () => {
    it('should fetch specific team standing by name', async () => {
      const singleTeamResponse = {
        data: {
          data: [mockTabellenEintragResponse.data.data[0]]
        }
      }
      
      mockedAxios.get.mockResolvedValueOnce(singleTeamResponse)

      const result = await leagueService.fetchTeamStanding('SV Viktoria Wertheim')

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:1337/api/tabellen-eintraege',
        {
          params: {
            'filters[team_name][$eq]': 'SV Viktoria Wertheim',
            populate: 'liga'
          }
        }
      )

      expect(result).toEqual({
        position: 1,
        name: 'SV Viktoria Wertheim',
        logo: undefined,
        games: 18,
        wins: 12,
        draws: 4,
        losses: 2,
        goalsFor: 45,
        goalsAgainst: 18,
        goalDifference: 27,
        points: 40
      })
    })

    it('should return null when team is not found', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { data: [] } })

      const result = await leagueService.fetchTeamStanding('Non-existent Team')

      expect(result).toBeNull()
    })
  })

  describe('fetchLeagueStandingsWithRetry', () => {
    it('should retry on failure and eventually succeed', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockTabellenEintragResponse)

      const result = await leagueService.fetchLeagueStandingsWithRetry('Kreisliga Tauberbischofsheim', 1)

      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(2)
    })

    it('should return empty array after all retries fail', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))

      const result = await leagueService.fetchLeagueStandingsWithRetry('Kreisliga Tauberbischofsheim', 1)

      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })
  })
})
