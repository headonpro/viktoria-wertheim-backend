/**
 * Performance tests for team switching and data loading
 * Task 13: Integration Testing und Validierung - Performance validation
 * 
 * Requirements: 5.5 - Team switching performance and data loading
 */

import { leagueService } from '../../services/leagueService'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock API config
jest.mock('../../lib/apiConfig', () => ({
  getApiUrl: () => 'http://localhost:1337'
}))

describe('Team Switching Performance Tests', () => {
  const mockApiResponse = (teams: any[], delay: number = 0) => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
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
      }, delay)
    })
  }

  const createMockTeam = (id: number, name: string, position: number, liga: string) => ({
    id,
    documentId: `team-${id}`,
    team_name: name,
    platz: position,
    spiele: 0,
    siege: 0,
    unentschieden: 0,
    niederlagen: 0,
    tore_fuer: 0,
    tore_gegen: 0,
    tordifferenz: 0,
    punkte: 0,
    liga: { id: 1, documentId: 'liga', name: liga },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('API Response Time Performance', () => {
    it('should load Kreisliga data within acceptable time limits', async () => {
      const mockTeams = [
        createMockTeam(1, 'SV Viktoria Wertheim', 1, 'Kreisliga Tauberbischofsheim'),
        createMockTeam(2, 'VfR Gerlachsheim', 2, 'Kreisliga Tauberbischofsheim')
      ]

      mockedAxios.get.mockImplementation(() => mockApiResponse(mockTeams, 50))

      const startTime = performance.now()
      const result = await leagueService.fetchLeagueStandingsByTeam('1')
      const endTime = performance.now()

      const loadTime = endTime - startTime
      
      expect(result).toHaveLength(2)
      expect(loadTime).toBeLessThan(500) // Should load within 500ms
      expect(loadTime).toBeGreaterThan(40) // Should account for mock delay
    })

    it('should load Kreisklasse A data within acceptable time limits', async () => {
      const mockTeams = [
        createMockTeam(3, 'TSV Unterschüpf', 1, 'Kreisklasse A Tauberbischofsheim'),
        createMockTeam(4, 'SV Viktoria Wertheim II', 5, 'Kreisklasse A Tauberbischofsheim')
      ]

      mockedAxios.get.mockImplementation(() => mockApiResponse(mockTeams, 30))

      const startTime = performance.now()
      const result = await leagueService.fetchLeagueStandingsByTeam('2')
      const endTime = performance.now()

      const loadTime = endTime - startTime
      
      expect(result).toHaveLength(2)
      expect(loadTime).toBeLessThan(400)
      expect(loadTime).toBeGreaterThan(25)
    })

    it('should load Kreisklasse B data within acceptable time limits', async () => {
      const mockTeams = [
        createMockTeam(5, 'SpG Vikt. Wertheim 3/Grünenwort', 1, 'Kreisklasse B Tauberbischofsheim'),
        createMockTeam(6, 'FC Hundheim-Steinbach 2', 1, 'Kreisklasse B Tauberbischofsheim')
      ]

      mockedAxios.get.mockImplementation(() => mockApiResponse(mockTeams, 20))

      const startTime = performance.now()
      const result = await leagueService.fetchLeagueStandingsByTeam('3')
      const endTime = performance.now()

      const loadTime = endTime - startTime
      
      expect(result).toHaveLength(2)
      expect(loadTime).toBeLessThan(300)
      expect(loadTime).toBeGreaterThan(15)
    })
  })

  describe('Sequential Team Switching Performance', () => {
    it('should handle sequential team switches efficiently', async () => {
      const mockResponses = {
        'Kreisliga Tauberbischofsheim': [
          createMockTeam(1, 'SV Viktoria Wertheim', 1, 'Kreisliga Tauberbischofsheim')
        ],
        'Kreisklasse A Tauberbischofsheim': [
          createMockTeam(2, 'SV Viktoria Wertheim II', 5, 'Kreisklasse A Tauberbischofsheim')
        ],
        'Kreisklasse B Tauberbischofsheim': [
          createMockTeam(3, 'SpG Vikt. Wertheim 3/Grünenwort', 1, 'Kreisklasse B Tauberbischofsheim')
        ]
      }

      mockedAxios.get.mockImplementation((url, config) => {
        const ligaFilter = config?.params?.['filters[liga][name][$eq]']
        const teams = mockResponses[ligaFilter as keyof typeof mockResponses] || []
        return mockApiResponse(teams, 25)
      })

      const startTime = performance.now()

      // Sequential team switches
      const team1Result = await leagueService.fetchLeagueStandingsByTeam('1')
      const team2Result = await leagueService.fetchLeagueStandingsByTeam('2')
      const team3Result = await leagueService.fetchLeagueStandingsByTeam('3')

      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(team1Result).toHaveLength(1)
      expect(team2Result).toHaveLength(1)
      expect(team3Result).toHaveLength(1)
      
      // Total time should be reasonable for 3 sequential calls
      expect(totalTime).toBeLessThan(1000) // Under 1 second for all 3
      expect(mockedAxios.get).toHaveBeenCalledTimes(3)
    })

    it('should handle rapid team switching without performance degradation', async () => {
      const mockTeams = [
        createMockTeam(1, 'Test Team', 1, 'Test Liga')
      ]

      mockedAxios.get.mockImplementation(() => mockApiResponse(mockTeams, 10))

      const switchTimes: number[] = []

      // Perform 10 rapid switches
      for (let i = 0; i < 10; i++) {
        const teamId = ((i % 3) + 1).toString() as '1' | '2' | '3'
        
        const startTime = performance.now()
        await leagueService.fetchLeagueStandingsByTeam(teamId)
        const endTime = performance.now()
        
        switchTimes.push(endTime - startTime)
      }

      // Calculate average switch time
      const averageTime = switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length
      const maxTime = Math.max(...switchTimes)
      const minTime = Math.min(...switchTimes)

      expect(averageTime).toBeLessThan(100) // Average under 100ms
      expect(maxTime).toBeLessThan(200) // No single switch over 200ms
      expect(minTime).toBeGreaterThan(5) // Sanity check for mock delay
      
      // Performance should be consistent (no significant degradation)
      const timeVariance = switchTimes.reduce((sum, time) => sum + Math.pow(time - averageTime, 2), 0) / switchTimes.length
      expect(Math.sqrt(timeVariance)).toBeLessThan(50) // Low variance
    })
  })

  describe('Concurrent Team Switching Performance', () => {
    it('should handle concurrent team data requests efficiently', async () => {
      const mockResponses = {
        'Kreisliga Tauberbischofsheim': [
          createMockTeam(1, 'SV Viktoria Wertheim', 1, 'Kreisliga Tauberbischofsheim')
        ],
        'Kreisklasse A Tauberbischofsheim': [
          createMockTeam(2, 'SV Viktoria Wertheim II', 5, 'Kreisklasse A Tauberbischofsheim')
        ],
        'Kreisklasse B Tauberbischofsheim': [
          createMockTeam(3, 'SpG Vikt. Wertheim 3/Grünenwort', 1, 'Kreisklasse B Tauberbischofsheim')
        ]
      }

      mockedAxios.get.mockImplementation((url, config) => {
        const ligaFilter = config?.params?.['filters[liga][name][$eq]']
        const teams = mockResponses[ligaFilter as keyof typeof mockResponses] || []
        return mockApiResponse(teams, 50)
      })

      const startTime = performance.now()

      // Concurrent team switches
      const promises = [
        leagueService.fetchLeagueStandingsByTeam('1'),
        leagueService.fetchLeagueStandingsByTeam('2'),
        leagueService.fetchLeagueStandingsByTeam('3')
      ]

      const results = await Promise.all(promises)
      const endTime = performance.now()
      const totalTime = endTime - startTime

      expect(results).toHaveLength(3)
      expect(results[0]).toHaveLength(1)
      expect(results[1]).toHaveLength(1)
      expect(results[2]).toHaveLength(1)
      
      // Concurrent calls should be faster than sequential
      expect(totalTime).toBeLessThan(200) // Should complete in parallel
      expect(mockedAxios.get).toHaveBeenCalledTimes(3)
    })
  })

  describe('Memory and Resource Usage', () => {
    it('should not cause memory leaks during repeated team switches', async () => {
      const mockTeams = [
        createMockTeam(1, 'Test Team', 1, 'Test Liga')
      ]

      mockedAxios.get.mockImplementation(() => mockApiResponse(mockTeams, 5))

      // Measure initial memory usage (approximation)
      const initialMemory = process.memoryUsage()

      // Perform many team switches
      for (let i = 0; i < 100; i++) {
        const teamId = ((i % 3) + 1).toString() as '1' | '2' | '3'
        await leagueService.fetchLeagueStandingsByTeam(teamId)
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed

      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
      expect(mockedAxios.get).toHaveBeenCalledTimes(100)
    })

    it('should handle large league tables efficiently', async () => {
      // Create a large league table (16 teams for Kreisliga)
      const largeLeague = Array.from({ length: 16 }, (_, i) => 
        createMockTeam(i + 1, `Team ${i + 1}`, i + 1, 'Kreisliga Tauberbischofsheim')
      )

      mockedAxios.get.mockImplementation(() => mockApiResponse(largeLeague, 30))

      const startTime = performance.now()
      const result = await leagueService.fetchLeagueStandingsByTeam('1')
      const endTime = performance.now()

      const loadTime = endTime - startTime

      expect(result).toHaveLength(16)
      expect(loadTime).toBeLessThan(200) // Should handle large tables efficiently
      
      // Verify data transformation performance
      expect(result[0].position).toBe(1)
      expect(result[15].position).toBe(16)
      expect(result[0].name).toBe('Team 1')
      expect(result[15].name).toBe('Team 16')
    })
  })

  describe('Error Recovery Performance', () => {
    it('should recover quickly from network errors', async () => {
      const mockTeams = [
        createMockTeam(1, 'SV Viktoria Wertheim', 1, 'Kreisliga Tauberbischofsheim')
      ]

      // First call fails, second succeeds
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockImplementation(() => mockApiResponse(mockTeams, 20))

      const startTime = performance.now()

      try {
        await leagueService.fetchLeagueStandingsByTeam('1')
      } catch (error) {
        // Expected to fail
      }

      // Retry should succeed quickly
      const retryStartTime = performance.now()
      const result = await leagueService.fetchLeagueStandingsByTeam('1')
      const retryEndTime = performance.now()

      const retryTime = retryEndTime - retryStartTime

      expect(result).toHaveLength(1)
      expect(retryTime).toBeLessThan(100) // Quick recovery
      expect(mockedAxios.get).toHaveBeenCalledTimes(2)
    })

    it('should handle timeout scenarios efficiently', async () => {
      // Mock timeout error
      mockedAxios.get.mockRejectedValueOnce({
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded'
      })

      const startTime = performance.now()

      try {
        await leagueService.fetchLeagueStandingsByTeam('1')
      } catch (error) {
        const endTime = performance.now()
        const errorTime = endTime - startTime

        expect(error).toMatchObject({
          type: 'network',
          retryable: true
        })
        
        // Error should be detected quickly, not wait for full timeout
        expect(errorTime).toBeLessThan(100)
      }
    })
  })

  describe('Viktoria Team Recognition Performance', () => {
    it('should identify Viktoria teams quickly across all leagues', async () => {
      const testCases = [
        { name: 'SV Viktoria Wertheim', teamId: '1', expected: true },
        { name: 'Viktoria Wertheim', teamId: '1', expected: true },
        { name: 'SV Viktoria Wertheim II', teamId: '2', expected: true },
        { name: 'Viktoria Wertheim II', teamId: '2', expected: true },
        { name: 'SpG Vikt. Wertheim 3/Grünenwort', teamId: '3', expected: true },
        { name: 'SpG Vikt. Wertheim 3', teamId: '3', expected: true },
        { name: 'VfR Gerlachsheim', teamId: '1', expected: false },
        { name: 'TSV Unterschüpf', teamId: '2', expected: false },
        { name: 'FC Hundheim-Steinbach 2', teamId: '3', expected: false }
      ]

      const startTime = performance.now()

      // Test all recognition patterns
      const results = testCases.map(testCase => ({
        ...testCase,
        result: leagueService.isViktoriaTeam(testCase.name, testCase.teamId as '1' | '2' | '3')
      }))

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Verify all results are correct
      results.forEach(({ name, expected, result }) => {
        expect(result).toBe(expected)
      })

      // Recognition should be very fast
      expect(totalTime).toBeLessThan(10) // Under 10ms for all patterns
      
      // Average time per recognition
      const averageTime = totalTime / testCases.length
      expect(averageTime).toBeLessThan(2) // Under 2ms per recognition
    })

    it('should handle team name variations efficiently', async () => {
      const variations = [
        'SV Viktoria Wertheim',
        'Viktoria Wertheim',
        'SV VIKTORIA WERTHEIM',
        'viktoria wertheim',
        'SV Viktoria Wertheim II',
        'Viktoria Wertheim II',
        'SpG Vikt. Wertheim 3/Grünenwort',
        'SpG Vikt. Wertheim 3',
        'SpG VIKT. WERTHEIM 3/GRÜNENWORT'
      ]

      const startTime = performance.now()

      // Test all variations
      const results = variations.map(name => leagueService.isViktoriaTeam(name))

      const endTime = performance.now()
      const totalTime = endTime - startTime

      // All should be recognized as Viktoria teams
      results.forEach(result => {
        expect(result).toBe(true)
      })

      // Should handle variations efficiently
      expect(totalTime).toBeLessThan(5)
      expect(totalTime / variations.length).toBeLessThan(1) // Under 1ms per variation
    })
  })
})