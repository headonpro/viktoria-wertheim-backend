import axios from 'axios'
import { leagueService, LeagueServiceError } from '../leagueService'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock API config
jest.mock('../../lib/apiConfig', () => ({
  getApiUrl: () => 'http://localhost:1337'
}))

describe('leagueService Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('fetchLeagueStandingsByLiga', () => {
    it('should throw network error for connection issues', async () => {
      mockedAxios.get.mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      })

      await expect(
        leagueService.fetchLeagueStandingsByLiga('Kreisliga Tauberbischofsheim')
      ).rejects.toMatchObject({
        type: 'network',
        message: 'Netzwerkfehler - Bitte Internetverbindung prüfen',
        retryable: true
      })
    })

    it('should throw timeout error for request timeout', async () => {
      mockedAxios.get.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded'
      })

      await expect(
        leagueService.fetchLeagueStandingsByLiga('Kreisliga Tauberbischofsheim')
      ).rejects.toMatchObject({
        type: 'timeout',
        message: 'Zeitüberschreitung beim Laden der Tabellendaten',
        retryable: true
      })
    })

    it('should throw not_found error for 404 responses', async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 404 },
        isAxiosError: true
      })

      await expect(
        leagueService.fetchLeagueStandingsByLiga('Nonexistent Liga')
      ).rejects.toMatchObject({
        type: 'not_found',
        message: 'Liga "Nonexistent Liga" wurde nicht gefunden',
        retryable: false
      })
    })

    it('should throw server error for 500 responses', async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 500 },
        isAxiosError: true
      })

      await expect(
        leagueService.fetchLeagueStandingsByLiga('Kreisliga Tauberbischofsheim')
      ).rejects.toMatchObject({
        type: 'server',
        message: 'Serverfehler - Bitte später erneut versuchen',
        retryable: true
      })
    })

    it('should throw data error for empty response', async () => {
      mockedAxios.get.mockResolvedValue({
        data: null
      })

      await expect(
        leagueService.fetchLeagueStandingsByLiga('Kreisliga Tauberbischofsheim')
      ).rejects.toMatchObject({
        type: 'data',
        message: 'Keine Tabellendaten für Liga "Kreisliga Tauberbischofsheim" gefunden',
        retryable: true
      })
    })

    it('should throw data error for empty teams array', async () => {
      mockedAxios.get.mockResolvedValue({
        data: {
          data: []
        }
      })

      await expect(
        leagueService.fetchLeagueStandingsByLiga('Kreisliga Tauberbischofsheim')
      ).rejects.toMatchObject({
        type: 'data',
        message: 'Keine gültigen Tabellendaten für Liga "Kreisliga Tauberbischofsheim" verfügbar',
        retryable: true
      })
    })
  })

  describe('fetchLeagueStandingsByTeam', () => {
    it('should throw error for invalid team ID', async () => {
      await expect(
        leagueService.fetchLeagueStandingsByTeam('4' as any)
      ).rejects.toMatchObject({
        type: 'data',
        message: 'Ungültige Mannschafts-ID: 4',
        retryable: false
      })
    })

    it('should add team context to error messages', async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 404 },
        isAxiosError: true
      })

      await expect(
        leagueService.fetchLeagueStandingsByTeam('1')
      ).rejects.toMatchObject({
        type: 'not_found',
        message: 'Liga "Kreisliga Tauberbischofsheim" wurde nicht gefunden (1. Mannschaft)',
        retryable: false
      })
    })
  })

  describe('fetchLeagueStandingsWithRetry', () => {
    it('should retry on retryable errors', async () => {
      mockedAxios.get
        .mockRejectedValueOnce({
          response: { status: 500 },
          isAxiosError: true
        })
        .mockRejectedValueOnce({
          response: { status: 500 },
          isAxiosError: true
        })
        .mockResolvedValueOnce({
          data: {
            data: [
              {
                id: 1,
                documentId: 'test-1',
                team_name: 'SV Viktoria Wertheim',
                platz: 1,
                spiele: 0,
                siege: 0,
                unentschieden: 0,
                niederlagen: 0,
                tore_fuer: 0,
                tore_gegen: 0,
                tordifferenz: 0,
                punkte: 0,
                createdAt: '2024-01-01',
                updatedAt: '2024-01-01'
              }
            ]
          }
        })

      const promise = leagueService.fetchLeagueStandingsWithRetry('Kreisliga Tauberbischofsheim', 2)
      
      // Fast-forward through retry delays
      jest.advanceTimersByTime(1000) // First retry after 1s
      jest.advanceTimersByTime(2000) // Second retry after 2s
      
      const result = await promise
      
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('SV Viktoria Wertheim')
      expect(mockedAxios.get).toHaveBeenCalledTimes(3)
    })

    it('should not retry on non-retryable errors', async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 404 },
        isAxiosError: true
      })

      await expect(
        leagueService.fetchLeagueStandingsWithRetry('Nonexistent Liga', 2)
      ).rejects.toMatchObject({
        type: 'not_found',
        retryable: false
      })

      expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    })

    it('should throw final error after all retries exhausted', async () => {
      mockedAxios.get.mockRejectedValue({
        response: { status: 500 },
        isAxiosError: true
      })

      const promise = leagueService.fetchLeagueStandingsWithRetry('Kreisliga Tauberbischofsheim', 2)
      
      // Fast-forward through all retry delays
      jest.advanceTimersByTime(1000) // First retry
      jest.advanceTimersByTime(2000) // Second retry
      
      await expect(promise).rejects.toMatchObject({
        type: 'server',
        message: 'Serverfehler - Bitte später erneut versuchen',
        retryable: true
      })

      expect(mockedAxios.get).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })
  })

  describe('getTeamInfo', () => {
    it('should return normal info for valid team IDs', () => {
      const teamInfo = leagueService.getTeamInfo('1')
      
      expect(teamInfo).toEqual({
        ligaName: 'Kreisliga Tauberbischofsheim',
        teamName: 'SV Viktoria Wertheim',
        isFallback: false
      })
    })

    it('should return fallback info for invalid team IDs', () => {
      const teamInfo = leagueService.getTeamInfo('4' as any)
      
      expect(teamInfo).toEqual({
        ligaName: 'Unbekannte Liga',
        teamName: 'Unbekannte Mannschaft',
        isFallback: true
      })
    })

    it('should provide fallback for all team IDs', () => {
      const team1Info = leagueService.getTeamInfo('1')
      const team2Info = leagueService.getTeamInfo('2')
      const team3Info = leagueService.getTeamInfo('3')
      
      expect(team1Info.isFallback).toBe(false)
      expect(team2Info.isFallback).toBe(false)
      expect(team3Info.isFallback).toBe(false)
      
      expect(team1Info.ligaName).toBe('Kreisliga Tauberbischofsheim')
      expect(team2Info.ligaName).toBe('Kreisklasse A Tauberbischofsheim')
      expect(team3Info.ligaName).toBe('Kreisklasse B Tauberbischofsheim')
    })
  })

  describe('isViktoriaTeam', () => {
    it('should correctly identify Viktoria teams', () => {
      expect(leagueService.isViktoriaTeam('SV Viktoria Wertheim', '1')).toBe(true)
      expect(leagueService.isViktoriaTeam('SV Viktoria Wertheim II', '2')).toBe(true)
      expect(leagueService.isViktoriaTeam('SpG Vikt. Wertheim 3/Grünenwort', '3')).toBe(true)
      expect(leagueService.isViktoriaTeam('FC Hundheim-Steinbach', '1')).toBe(false)
    })

    it('should work without team ID for general matching', () => {
      expect(leagueService.isViktoriaTeam('SV Viktoria Wertheim')).toBe(true)
      expect(leagueService.isViktoriaTeam('Viktoria Wertheim')).toBe(true)
      expect(leagueService.isViktoriaTeam('FC Hundheim-Steinbach')).toBe(false)
    })
  })
})