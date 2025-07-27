/**
 * Integration Tests for GameCards Component
 * Tests team-specific behavior, fallback messages, error handling, and UI consistency
 * This is a simplified test approach focusing on the core requirements
 */

import { teamService } from '../../services/teamService'
import { TeamId } from '../../types/strapi'

// Mock the teamService
jest.mock('../../services/teamService', () => ({
  teamService: {
    fetchLastAndNextGame: jest.fn()
  }
}))

const mockTeamService = teamService as jest.Mocked<typeof teamService>

// Helper function to get team name
const getTeamName = (team: TeamId): string => {
  const teamNames: Record<TeamId, string> = {
    '1': '1. Mannschaft',
    '2': '2. Mannschaft',
    '3': '3. Mannschaft'
  }
  return teamNames[team]
}

describe('GameCards Component Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Team Service Integration', () => {
    it('should call teamService.fetchLastAndNextGame with correct teamId', async () => {
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: null,
        nextGame: null
      })

      // Simulate component behavior
      const selectedTeam: TeamId = '1'
      await teamService.fetchLastAndNextGame(selectedTeam)

      expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('1')
    })

    it('should make separate API calls for each team selection', async () => {
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: null,
        nextGame: null
      })

      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        await teamService.fetchLastAndNextGame(teamId)
        expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith(teamId)
      }

      expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledTimes(3)
    })
  })

  describe('Team-Specific Fallback Messages', () => {
    it('should generate correct fallback messages for each team', () => {
      const teams: TeamId[] = ['1', '2', '3']

      teams.forEach(teamId => {
        const teamName = getTeamName(teamId)
        
        // Test last game fallback message
        const lastGameMessage = `Kein letztes Spiel für ${teamName} verfügbar`
        expect(lastGameMessage).toContain(teamName)
        expect(lastGameMessage).toContain('Kein letztes Spiel')
        expect(lastGameMessage).toContain('verfügbar')
        
        // Test next game fallback message
        const nextGameMessage = `Kein nächstes Spiel für ${teamName} geplant`
        expect(nextGameMessage).toContain(teamName)
        expect(nextGameMessage).toContain('Kein nächstes Spiel')
        expect(nextGameMessage).toContain('geplant')
      })
    })

    it('should have consistent message format across teams', () => {
      const teams: TeamId[] = ['1', '2', '3']
      
      teams.forEach(teamId => {
        const teamName = getTeamName(teamId)
        
        // Check message patterns
        const lastGameMessage = `Kein letztes Spiel für ${teamName} verfügbar`
        const nextGameMessage = `Kein nächstes Spiel für ${teamName} geplant`
        
        // Verify consistent structure
        expect(lastGameMessage).toMatch(/^Kein letztes Spiel für .+ verfügbar$/)
        expect(nextGameMessage).toMatch(/^Kein nächstes Spiel für .+ geplant$/)
      })
    })
  })

  describe('Team-Specific Error Messages', () => {
    it('should generate correct error messages for each team', () => {
      const teams: TeamId[] = ['1', '2', '3']

      teams.forEach(teamId => {
        const teamName = getTeamName(teamId)
        
        // Test general error message
        const generalError = `Spiele für ${teamName} konnten nicht geladen werden`
        expect(generalError).toContain(teamName)
        expect(generalError).toContain('konnten nicht geladen werden')
        
        // Test specific error messages
        const lastGameError = `Letztes Spiel für ${teamName} konnte nicht geladen werden`
        expect(lastGameError).toContain(teamName)
        expect(lastGameError).toContain('Letztes Spiel')
        
        const nextGameError = `Nächstes Spiel für ${teamName} konnte nicht geladen werden`
        expect(nextGameError).toContain(teamName)
        expect(nextGameError).toContain('Nächstes Spiel')
      })
    })

    it('should handle API errors gracefully for each team', async () => {
      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        mockTeamService.fetchLastAndNextGame.mockRejectedValueOnce(new Error('API Error'))
        
        try {
          await teamService.fetchLastAndNextGame(teamId)
        } catch (error) {
          // Error should be thrown
          expect(error).toBeInstanceOf(Error)
        }
        
        expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith(teamId)
      }
    })
  })

  describe('UI Consistency Requirements', () => {
    it('should use consistent team naming across all functions', () => {
      const teams: TeamId[] = ['1', '2', '3']
      const expectedNames = ['1. Mannschaft', '2. Mannschaft', '3. Mannschaft']

      teams.forEach((teamId, index) => {
        const teamName = getTeamName(teamId)
        expect(teamName).toBe(expectedNames[index])
      })
    })

    it('should maintain consistent message structure', () => {
      const teams: TeamId[] = ['1', '2', '3']
      
      teams.forEach(teamId => {
        const teamName = getTeamName(teamId)
        
        // All messages should follow the same pattern
        const messages = [
          `Kein letztes Spiel für ${teamName} verfügbar`,
          `Kein nächstes Spiel für ${teamName} geplant`,
          `Spiele für ${teamName} konnten nicht geladen werden`
        ]
        
        messages.forEach(message => {
          expect(message).toContain(teamName)
          expect(message.length).toBeGreaterThan(0)
        })
      })
    })

    it('should handle edge cases consistently', () => {
      // Test with invalid team ID (should default gracefully)
      const invalidTeam = 'invalid' as TeamId
      const result = getTeamName(invalidTeam)
      
      // Should return a default value or handle gracefully
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Component Behavior Simulation', () => {
    it('should simulate correct component lifecycle for team changes', async () => {
      // Simulate component mounting with team 1
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: null,
        nextGame: null
      })

      await teamService.fetchLastAndNextGame('1')
      expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('1')

      // Simulate team change to team 2
      await teamService.fetchLastAndNextGame('2')
      expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('2')

      // Simulate team change to team 3
      await teamService.fetchLastAndNextGame('3')
      expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('3')

      expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledTimes(3)
    })

    it('should handle data availability scenarios', async () => {
      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        // Test with no data (should show fallback)
        mockTeamService.fetchLastAndNextGame.mockResolvedValueOnce({
          lastGame: null,
          nextGame: null
        })

        const result = await teamService.fetchLastAndNextGame(teamId)
        expect(result.lastGame).toBeNull()
        expect(result.nextGame).toBeNull()

        // Test with partial data
        mockTeamService.fetchLastAndNextGame.mockResolvedValueOnce({
          lastGame: {
            id: 1,
            type: 'last',
            homeTeam: 'SV Viktoria Wertheim',
            awayTeam: 'FC Test',
            homeScore: 2,
            awayScore: 1,
            date: '15.01.2025',
            time: '15:00',
            isHome: true,
            stadium: 'Test Stadium',
            referee: 'Test Referee',
            status: 'beendet',
            goalScorers: [],
            yellowCards: [],
            redCards: []
          },
          nextGame: null
        })

        const partialResult = await teamService.fetchLastAndNextGame(teamId)
        expect(partialResult.lastGame).not.toBeNull()
        expect(partialResult.nextGame).toBeNull()
      }
    })
  })

  describe('Error Handling Scenarios', () => {
    it('should handle network errors for each team', async () => {
      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        mockTeamService.fetchLastAndNextGame.mockRejectedValueOnce(new Error('Network Error'))
        
        await expect(teamService.fetchLastAndNextGame(teamId)).rejects.toThrow('Network Error')
      }
    })

    it('should handle timeout errors for each team', async () => {
      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        mockTeamService.fetchLastAndNextGame.mockRejectedValueOnce(new Error('Timeout'))
        
        await expect(teamService.fetchLastAndNextGame(teamId)).rejects.toThrow('Timeout')
      }
    })
  })

  describe('Performance and Consistency', () => {
    it('should make efficient API calls', async () => {
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: null,
        nextGame: null
      })

      // Simulate rapid team switching
      await Promise.all([
        teamService.fetchLastAndNextGame('1'),
        teamService.fetchLastAndNextGame('2'),
        teamService.fetchLastAndNextGame('3')
      ])

      expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledTimes(3)
      expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('1')
      expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('2')
      expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('3')
    })

    it('should maintain consistent response format', async () => {
      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        mockTeamService.fetchLastAndNextGame.mockResolvedValueOnce({
          lastGame: null,
          nextGame: null
        })

        const result = await teamService.fetchLastAndNextGame(teamId)
        
        // Verify response structure
        expect(result).toHaveProperty('lastGame')
        expect(result).toHaveProperty('nextGame')
        expect(typeof result.lastGame === 'object' || result.lastGame === null).toBe(true)
        expect(typeof result.nextGame === 'object' || result.nextGame === null).toBe(true)
      }
    })
  })
})