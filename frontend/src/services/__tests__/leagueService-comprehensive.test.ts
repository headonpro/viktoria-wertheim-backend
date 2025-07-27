/**
 * Comprehensive test suite for leagueService with Tabellen-Eintrag API
 * Task 10: Tests für neue Liga-Tabellen Funktionalität
 */

import axios from 'axios'
import { leagueService, Team, LeagueServiceError } from '../leagueService'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock getApiUrl to return consistent URL for tests
jest.mock('../../lib/apiConfig', () => ({
  getApiUrl: () => 'http://localhost:1337'
}))

describe('leagueService - Comprehensive Tabellen-Eintrag API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Team-to-League Mapping', () => {
    it('should correctly map all three teams to their leagues', () => {
      expect(leagueService.getLeagueNameByTeam('1')).toBe('Kreisliga Tauberbischofsheim')
      expect(leagueService.getLeagueNameByTeam('2')).toBe('Kreisklasse A Tauberbischofsheim')
      expect(leagueService.getLeagueNameByTeam('3')).toBe('Kreisklasse B Tauberbischofsheim')
    })

    it('should provide fallback for invalid team IDs', () => {
      expect(leagueService.getLeagueNameByTeam('4' as any)).toBe('Unbekannte Liga')
      expect(leagueService.getLeagueNameByTeam('invalid' as any)).toBe('Unbekannte Liga')
    })

    it('should provide complete team info with fallback detection', () => {
      const team1Info = leagueService.getTeamInfo('1')
      expect(team1Info).toEqual({
        ligaName: 'Kreisliga Tauberbischofsheim',
        teamName: 'SV Viktoria Wertheim',
        isFallback: false
      })

      const invalidTeamInfo = leagueService.getTeamInfo('4' as any)
      expect(invalidTeamInfo).toEqual({
        ligaName: 'Unbekannte Liga',
        teamName: 'Unbekannte Mannschaft',
        isFallback: true
      })
    })
  })

  describe('Viktoria Team Recognition', () => {
    it('should identify all Viktoria team variations', () => {
      // Team 1 patterns
      expect(leagueService.isViktoriaTeam('SV Viktoria Wertheim', '1')).toBe(true)
      expect(leagueService.isViktoriaTeam('Viktoria Wertheim', '1')).toBe(true)
      
      // Team 2 patterns
      expect(leagueService.isViktoriaTeam('SV Viktoria Wertheim II', '2')).toBe(true)
      expect(leagueService.isViktoriaTeam('Viktoria Wertheim II', '2')).toBe(true)
      
      // Team 3 patterns
      expect(leagueService.isViktoriaTeam('SpG Vikt. Wertheim 3/Grünenwort', '3')).toBe(true)
      expect(leagueService.isViktoriaTeam('SpG Vikt. Wertheim 3', '3')).toBe(true)
      
      // Non-Viktoria teams
      expect(leagueService.isViktoriaTeam('VfR Gerlachsheim', '1')).toBe(false)
      expect(leagueService.isViktoriaTeam('TSV Unterschüpf', '2')).toBe(false)
    })

    it('should work with general pattern matching without team ID', () => {
      expect(leagueService.isViktoriaTeam('SV Viktoria Wertheim')).toBe(true)
      expect(leagueService.isViktoriaTeam('Viktoria Wertheim')).toBe(true)
      expect(leagueService.isViktoriaTeam('VfR Gerlachsheim')).toBe(false)
    })
  })

  describe('API Integration - All Three Leagues', () => {
    const createMockResponse = (teams: any[]) => ({
      data: {
        data: teams,
        meta: {
          pagination: {
            page: 1,
            pageSize: 100,
            pageCount: 1,
            total: teams.length
          }
        }
      }
    })

    describe('Kreisliga Tauberbischofsheim (Team 1)', () => {
      const kreisligaTeams = [
        {
          id: 1,
          documentId: 'viktoria-1',
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
          liga: {
            id: 1,
            documentId: 'kreisliga',
            name: 'Kreisliga Tauberbischofsheim'
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 2,
          documentId: 'gerlachsheim',
          team_name: 'VfR Gerlachsheim',
          platz: 2,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0,
          liga: {
            id: 1,
            documentId: 'kreisliga',
            name: 'Kreisliga Tauberbischofsheim'
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ]

      it('should fetch Kreisliga standings for team 1', async () => {
        mockedAxios.get.mockResolvedValueOnce(createMockResponse(kreisligaTeams))

        const result = await leagueService.fetchLeagueStandingsByTeam('1')

        expect(mockedAxios.get).toHaveBeenCalledWith(
          'http://localhost:1337/api/tabellen-eintraege',
          {
            params: {
              'filters[liga][name][$eq]': 'Kreisliga Tauberbischofsheim',
              populate: 'liga',
              sort: 'platz:asc',
              'pagination[pageSize]': 100
            },
            timeout: 10000
          }
        )

        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({
          position: 1,
          name: 'SV Viktoria Wertheim',
          logo: undefined,
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        })
      })
    })

    describe('Kreisklasse A Tauberbischofsheim (Team 2)', () => {
      const kreisklasseATeams = [
        {
          id: 3,
          documentId: 'unterschuepf',
          team_name: 'TSV Unterschüpf',
          platz: 1,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0,
          liga: {
            id: 2,
            documentId: 'kreisklasse-a',
            name: 'Kreisklasse A Tauberbischofsheim'
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 4,
          documentId: 'viktoria-2',
          team_name: 'SV Viktoria Wertheim II',
          platz: 5,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0,
          liga: {
            id: 2,
            documentId: 'kreisklasse-a',
            name: 'Kreisklasse A Tauberbischofsheim'
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ]

      it('should fetch Kreisklasse A standings for team 2', async () => {
        mockedAxios.get.mockResolvedValueOnce(createMockResponse(kreisklasseATeams))

        const result = await leagueService.fetchLeagueStandingsByTeam('2')

        expect(mockedAxios.get).toHaveBeenCalledWith(
          'http://localhost:1337/api/tabellen-eintraege',
          {
            params: {
              'filters[liga][name][$eq]': 'Kreisklasse A Tauberbischofsheim',
              populate: 'liga',
              sort: 'platz:asc',
              'pagination[pageSize]': 100
            },
            timeout: 10000
          }
        )

        expect(result).toHaveLength(2)
        expect(result[1]).toEqual({
          position: 5,
          name: 'SV Viktoria Wertheim II',
          logo: undefined,
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        })
      })
    })

    describe('Kreisklasse B Tauberbischofsheim (Team 3)', () => {
      const kreisklasseBTeams = [
        {
          id: 5,
          documentId: 'viktoria-3',
          team_name: 'SpG Vikt. Wertheim 3/Grünenwort',
          platz: 1,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0,
          liga: {
            id: 3,
            documentId: 'kreisklasse-b',
            name: 'Kreisklasse B Tauberbischofsheim'
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ]

      it('should fetch Kreisklasse B standings for team 3', async () => {
        mockedAxios.get.mockResolvedValueOnce(createMockResponse(kreisklasseBTeams))

        const result = await leagueService.fetchLeagueStandingsByTeam('3')

        expect(mockedAxios.get).toHaveBeenCalledWith(
          'http://localhost:1337/api/tabellen-eintraege',
          {
            params: {
              'filters[liga][name][$eq]': 'Kreisklasse B Tauberbischofsheim',
              populate: 'liga',
              sort: 'platz:asc',
              'pagination[pageSize]': 100
            },
            timeout: 10000
          }
        )

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual({
          position: 1,
          name: 'SpG Vikt. Wertheim 3/Grünenwort',
          logo: undefined,
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        })
      })
    })
  })

  describe('Data Transformation', () => {
    it('should correctly transform Strapi data to frontend format', async () => {
      const strapiData = {
        data: {
          data: [{
            id: 1,
            documentId: 'test-team',
            team_name: 'Test Team',
            team_logo: {
              id: 1,
              url: '/uploads/logo.png',
              alternativeText: 'Team Logo'
            },
            platz: 3,
            spiele: 10,
            siege: 6,
            unentschieden: 2,
            niederlagen: 2,
            tore_fuer: 18,
            tore_gegen: 12,
            tordifferenz: 6,
            punkte: 20,
            liga: {
              id: 1,
              documentId: 'liga-1',
              name: 'Test Liga'
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }],
          meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 1 } }
        }
      }

      mockedAxios.get.mockResolvedValueOnce(strapiData)

      const result = await leagueService.fetchLeagueStandingsByLiga('Test Liga')

      expect(result[0]).toEqual({
        position: 3,
        name: 'Test Team',
        logo: 'http://localhost:1337/uploads/logo.png',
        games: 10,
        wins: 6,
        draws: 2,
        losses: 2,
        goalsFor: 18,
        goalsAgainst: 12,
        goalDifference: 6,
        points: 20
      })
    })

    it('should handle missing logo data gracefully', async () => {
      const strapiDataNoLogo = {
        data: {
          data: [{
            id: 1,
            documentId: 'test-team',
            team_name: 'Test Team',
            platz: 1,
            spiele: 0,
            siege: 0,
            unentschieden: 0,
            niederlagen: 0,
            tore_fuer: 0,
            tore_gegen: 0,
            tordifferenz: 0,
            punkte: 0,
            liga: {
              id: 1,
              documentId: 'liga-1',
              name: 'Test Liga'
            },
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z'
          }],
          meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 1 } }
        }
      }

      mockedAxios.get.mockResolvedValueOnce(strapiDataNoLogo)

      const result = await leagueService.fetchLeagueStandingsByLiga('Test Liga')

      expect(result[0].logo).toBeUndefined()
    })
  })

  describe('Error Handling and Retry Logic', () => {
    it('should handle network errors with proper error structure', async () => {
      const networkError = { code: 'ECONNREFUSED', message: 'Connection refused' }
      mockedAxios.get.mockRejectedValueOnce(networkError)

      await expect(
        leagueService.fetchLeagueStandingsByLiga('Test Liga')
      ).rejects.toMatchObject({
        type: 'network',
        retryable: true
      })
    })

    it('should retry on retryable errors', async () => {
      const serverError = { response: { status: 500 }, isAxiosError: true }
      
      mockedAxios.get
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          data: {
            data: [{
              id: 1,
              documentId: 'test',
              team_name: 'Test Team',
              platz: 1,
              spiele: 0,
              siege: 0,
              unentschieden: 0,
              niederlagen: 0,
              tore_fuer: 0,
              tore_gegen: 0,
              tordifferenz: 0,
              punkte: 0,
              liga: { id: 1, documentId: 'liga', name: 'Test Liga' },
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z'
            }],
            meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 1 } }
          }
        })

      const result = await leagueService.fetchLeagueStandingsWithRetry('Test Liga', 1)

      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(1)
    })

    it('should not retry on non-retryable errors', async () => {
      const notFoundError = { response: { status: 404 }, isAxiosError: true }
      mockedAxios.get.mockRejectedValueOnce(notFoundError)

      await expect(
        leagueService.fetchLeagueStandingsWithRetry('Nonexistent Liga', 2)
      ).rejects.toMatchObject({
        type: 'not_found',
        retryable: false
      })

      expect(mockedAxios.get).toHaveBeenCalledTimes(1)
    })
  })

  describe('Team-specific API calls', () => {
    it('should add team context to error messages', async () => {
      const notFoundError = { response: { status: 404 }, isAxiosError: true }
      mockedAxios.get.mockRejectedValueOnce(notFoundError)

      await expect(
        leagueService.fetchLeagueStandingsByTeam('1')
      ).rejects.toMatchObject({
        message: expect.stringContaining('(1. Mannschaft)')
      })
    })

    it('should use retry mechanism for team-specific calls', async () => {
      const serverError = { response: { status: 500 }, isAxiosError: true }
      
      mockedAxios.get
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({
          data: {
            data: [{
              id: 1,
              documentId: 'test',
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
              liga: { id: 1, documentId: 'liga', name: 'Kreisliga Tauberbischofsheim' },
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z'
            }],
            meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 1 } }
          }
        })

      const result = await leagueService.fetchLeagueStandingsByTeamWithRetry('1', 1)

      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('SV Viktoria Wertheim')
    })
  })

  describe('Data Sorting and Filtering', () => {
    it('should sort teams by position correctly', async () => {
      const unsortedTeams = {
        data: {
          data: [
            {
              id: 2,
              documentId: 'team-2',
              team_name: 'Team B',
              platz: 3,
              spiele: 0,
              siege: 0,
              unentschieden: 0,
              niederlagen: 0,
              tore_fuer: 0,
              tore_gegen: 0,
              tordifferenz: 0,
              punkte: 0,
              liga: { id: 1, documentId: 'liga', name: 'Test Liga' },
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z'
            },
            {
              id: 1,
              documentId: 'team-1',
              team_name: 'Team A',
              platz: 1,
              spiele: 0,
              siege: 0,
              unentschieden: 0,
              niederlagen: 0,
              tore_fuer: 0,
              tore_gegen: 0,
              tordifferenz: 0,
              punkte: 0,
              liga: { id: 1, documentId: 'liga', name: 'Test Liga' },
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z'
            }
          ],
          meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 2 } }
        }
      }

      mockedAxios.get.mockResolvedValueOnce(unsortedTeams)

      const result = await leagueService.fetchLeagueStandingsByLiga('Test Liga')

      expect(result[0].position).toBe(1)
      expect(result[0].name).toBe('Team A')
      expect(result[1].position).toBe(3)
      expect(result[1].name).toBe('Team B')
    })

    it('should filter out teams with invalid positions', async () => {
      const teamsWithInvalidPositions = {
        data: {
          data: [
            {
              id: 1,
              documentId: 'valid-team',
              team_name: 'Valid Team',
              platz: 1,
              spiele: 0,
              siege: 0,
              unentschieden: 0,
              niederlagen: 0,
              tore_fuer: 0,
              tore_gegen: 0,
              tordifferenz: 0,
              punkte: 0,
              liga: { id: 1, documentId: 'liga', name: 'Test Liga' },
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z'
            },
            {
              id: 2,
              documentId: 'invalid-team',
              team_name: 'Invalid Team',
              platz: 0, // Invalid position
              spiele: 0,
              siege: 0,
              unentschieden: 0,
              niederlagen: 0,
              tore_fuer: 0,
              tore_gegen: 0,
              tordifferenz: 0,
              punkte: 0,
              liga: { id: 1, documentId: 'liga', name: 'Test Liga' },
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z'
            }
          ],
          meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 2 } }
        }
      }

      mockedAxios.get.mockResolvedValueOnce(teamsWithInvalidPositions)

      const result = await leagueService.fetchLeagueStandingsByLiga('Test Liga')

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Valid Team')
    })
  })
})