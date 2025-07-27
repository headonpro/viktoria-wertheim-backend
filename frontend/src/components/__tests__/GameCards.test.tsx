/**
 * Frontend Component Tests for GameCards
 * Tests team-specific behavior, fallback messages, error handling, and UI consistency
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import GameCards from '../GameCards'
import { teamService } from '../../services/teamService'
import { GameDetails, TeamId } from '../../types/strapi'

// Mock the teamService
jest.mock('../../services/teamService', () => ({
  teamService: {
    fetchLastAndNextGame: jest.fn()
  }
}))

// Mock apiConfig
jest.mock('../../lib/apiConfig', () => ({
  getApiUrl: () => 'http://localhost:1337',
  API_URL: 'http://localhost:1337'
}))

// Mock dynamic imports
jest.mock('next/dynamic', () => {
  return (fn: any) => {
    const Component = fn()
    if (Component && typeof Component.then === 'function') {
      // Handle async imports
      return Component.then((mod: any) => mod.default || mod)
    }
    return Component.default || Component
  }
})

// Mock AnimatedSection components
jest.mock('../AnimatedSection', () => {
  const MockAnimatedSection = ({ children, className }: any) => <div className={className}>{children}</div>
  return {
    __esModule: true,
    default: MockAnimatedSection,
    AnimatedDiv: MockAnimatedSection
  }
})

// Mock createPortal for modal tests
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (element: React.ReactNode) => element
}))

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
})

const mockTeamService = teamService as jest.Mocked<typeof teamService>

// Helper function to create mock game data
const createMockGameData = (type: 'last' | 'next', teamId: TeamId): GameDetails => ({
  id: 1,
  type,
  homeTeam: type === 'last' ? 'SV Viktoria Wertheim' : 'SV Viktoria Wertheim',
  awayTeam: type === 'last' ? 'FC Test Gegner' : 'FC Test Gegner',
  homeScore: type === 'last' ? 2 : undefined,
  awayScore: type === 'last' ? 1 : undefined,
  date: '15.01.2025',
  time: '15:00',
  isHome: true,
  stadium: 'Viktoria-Stadion Wertheim',
  referee: 'Max Mustermann',
  status: type === 'last' ? 'beendet' : 'geplant',
  goalScorers: [],
  yellowCards: [],
  redCards: []
})

// Helper function to get team name
const getTeamName = (team: TeamId): string => {
  const teamNames: Record<TeamId, string> = {
    '1': '1. Mannschaft',
    '2': '2. Mannschaft',
    '3': '3. Mannschaft'
  }
  return teamNames[team]
}

describe('GameCards Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset console methods
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Team Service Integration', () => {
    it('should call teamService.fetchLastAndNextGame with correct teamId when selectedTeam changes', async () => {
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: createMockGameData('last', '1'),
        nextGame: createMockGameData('next', '1')
      })

      const { rerender } = render(<GameCards selectedTeam="1" />)

      await waitFor(() => {
        expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('1')
      })

      // Change team and verify new call
      rerender(<GameCards selectedTeam="2" />)

      await waitFor(() => {
        expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('2')
      })

      // Change to team 3
      rerender(<GameCards selectedTeam="3" />)

      await waitFor(() => {
        expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('3')
      })

      expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledTimes(3)
    })

    it('should make separate API calls for each team selection', async () => {
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: null,
        nextGame: null
      })

      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        render(<GameCards selectedTeam={teamId} />)

        await waitFor(() => {
          expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith(teamId)
        })
      }

      expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledTimes(3)
    })
  })

  describe('Team-Specific Fallback Messages', () => {
    beforeEach(() => {
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: null,
        nextGame: null
      })
    })

    it('should display team-specific fallback message for last game when no data available', async () => {
      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        const { unmount } = render(<GameCards selectedTeam={teamId} />)
        const teamName = getTeamName(teamId)

        await waitFor(() => {
          expect(screen.getByText(`Kein letztes Spiel für ${teamName} verfügbar`)).toBeInTheDocument()
        })

        unmount()
      }
    })

    it('should display team-specific fallback message for next game when no data available', async () => {
      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        const { unmount } = render(<GameCards selectedTeam={teamId} />)
        const teamName = getTeamName(teamId)

        await waitFor(() => {
          expect(screen.getByText(`Kein nächstes Spiel für ${teamName} geplant`)).toBeInTheDocument()
        })

        unmount()
      }
    })

    it('should display correct fallback icons for each game type', async () => {
      render(<GameCards selectedTeam="1" />)

      await waitFor(() => {
        // Check for soccer ball icon (⚽) for last game
        expect(screen.getByText('⚽')).toBeInTheDocument()
        // Check for calendar icon (📅) for next game
        expect(screen.getByText('📅')).toBeInTheDocument()
      })
    })
  })

  describe('Team-Specific Error Messages', () => {
    it('should display team-specific error messages when API calls fail', async () => {
      mockTeamService.fetchLastAndNextGame.mockRejectedValue(new Error('API Error'))

      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        const { unmount } = render(<GameCards selectedTeam={teamId} />)
        const teamName = getTeamName(teamId)

        await waitFor(() => {
          expect(screen.getAllByText(`Letztes Spiel für ${teamName} konnte nicht geladen werden`)).toHaveLength(1)
          expect(screen.getAllByText(`Nächstes Spiel für ${teamName} konnte nicht geladen werden`)).toHaveLength(1)
        })

        unmount()
      }
    })

    it('should display error icons when API calls fail', async () => {
      mockTeamService.fetchLastAndNextGame.mockRejectedValue(new Error('API Error'))

      render(<GameCards selectedTeam="1" />)

      await waitFor(() => {
        // Check for warning icons (⚠️) in error state
        expect(screen.getAllByText('⚠️')).toHaveLength(2) // One for each card
      })
    })

    it('should provide reload buttons in error state', async () => {
      mockTeamService.fetchLastAndNextGame.mockRejectedValue(new Error('API Error'))

      // Mock window.location.reload
      const mockReload = jest.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true
      })

      render(<GameCards selectedTeam="1" />)

      await waitFor(() => {
        const reloadButtons = screen.getAllByText('Neu laden')
        expect(reloadButtons).toHaveLength(2) // One for each card

        // Test clicking reload button
        fireEvent.click(reloadButtons[0])
        expect(mockReload).toHaveBeenCalled()
      })
    })

    it('should log team-specific error messages to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockTeamService.fetchLastAndNextGame.mockRejectedValue(new Error('Network Error'))

      render(<GameCards selectedTeam="2" />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching team games for 2. Mannschaft:',
          expect.any(Error)
        )
      })
    })
  })

  describe('UI Consistency Between Teams', () => {
    it('should use consistent card styling across all teams', async () => {
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: null,
        nextGame: null
      })

      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        const { container, unmount } = render(<GameCards selectedTeam={teamId} />)

        await waitFor(() => {
          // Check for consistent card container classes
          const cardContainers = container.querySelectorAll('.bg-gray-100\\/40')
          expect(cardContainers).toHaveLength(2) // Last and next game cards

          // Check for consistent border classes
          const borderElements = container.querySelectorAll('.border-2')
          expect(borderElements.length).toBeGreaterThan(0)

          // Check for consistent shadow classes
          const shadowElements = container.querySelectorAll('[class*="shadow-"]')
          expect(shadowElements.length).toBeGreaterThan(0)
        })

        unmount()
      }
    })

    it('should display consistent card titles across teams', async () => {
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: createMockGameData('last', '1'),
        nextGame: createMockGameData('next', '1')
      })

      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        const { unmount } = render(<GameCards selectedTeam={teamId} />)

        await waitFor(() => {
          expect(screen.getByText('Last')).toBeInTheDocument()
          expect(screen.getByText('Next')).toBeInTheDocument()
        })

        unmount()
      }
    })

    it('should maintain consistent grid layout across teams', async () => {
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: null,
        nextGame: null
      })

      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        const { container, unmount } = render(<GameCards selectedTeam={teamId} />)

        await waitFor(() => {
          // Check for grid layout classes
          const gridContainer = container.querySelector('.grid.grid-cols-2')
          expect(gridContainer).toBeInTheDocument()

          // Check for gap classes
          const gapElements = container.querySelectorAll('.gap-4, .gap-8')
          expect(gapElements.length).toBeGreaterThan(0)
        })

        unmount()
      }
    })

    it('should use consistent text styling for fallback messages', async () => {
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: null,
        nextGame: null
      })

      const teams: TeamId[] = ['1', '2', '3']

      for (const teamId of teams) {
        const { container, unmount } = render(<GameCards selectedTeam={teamId} />)

        await waitFor(() => {
          // Check for consistent text color classes
          const textElements = container.querySelectorAll('.text-gray-500')
          expect(textElements.length).toBeGreaterThan(0)

          // Check for consistent text size classes
          const textSizeElements = container.querySelectorAll('.text-sm')
          expect(textSizeElements.length).toBeGreaterThan(0)
        })

        unmount()
      }
    })
  })

  describe('Game Data Display', () => {
    it('should display game data when available', async () => {
      const mockLastGame = createMockGameData('last', '1')
      const mockNextGame = createMockGameData('next', '1')

      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: mockLastGame,
        nextGame: mockNextGame
      })

      render(<GameCards selectedTeam="1" />)

      await waitFor(() => {
        // Check for score display in last game
        expect(screen.getByText('2:1')).toBeInTheDocument()
        
        // Check for VS display in next game
        expect(screen.getByText('VS')).toBeInTheDocument()
        
        // Check for team names
        expect(screen.getAllByText('SV Viktoria Wertheim')).toHaveLength(2)
        expect(screen.getAllByText('FC Test Gegner')).toHaveLength(2)
      })
    })

    it('should handle modal opening when game cards are clicked', async () => {
      const mockLastGame = createMockGameData('last', '1')

      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: mockLastGame,
        nextGame: null
      })

      render(<GameCards selectedTeam="1" />)

      await waitFor(() => {
        const gameCard = screen.getByText('2:1').closest('div')
        expect(gameCard).toBeInTheDocument()
        
        if (gameCard) {
          fireEvent.click(gameCard)
          
          // Check if modal content appears
          expect(screen.getByText('Viktoria-Stadion Wertheim')).toBeInTheDocument()
        }
      })
    })
  })

  describe('Loading States', () => {
    it('should handle loading state consistently across teams', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockTeamService.fetchLastAndNextGame.mockReturnValue(promise)

      render(<GameCards selectedTeam="1" />)

      // During loading, the component should not show fallback messages yet
      expect(screen.queryByText('Kein letztes Spiel für 1. Mannschaft verfügbar')).not.toBeInTheDocument()

      // Resolve the promise
      resolvePromise!({ lastGame: null, nextGame: null })

      await waitFor(() => {
        expect(screen.getByText('Kein letztes Spiel für 1. Mannschaft verfügbar')).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle partial data gracefully', async () => {
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: createMockGameData('last', '1'),
        nextGame: null // Only last game available
      })

      render(<GameCards selectedTeam="1" />)

      await waitFor(() => {
        // Should show last game data
        expect(screen.getByText('2:1')).toBeInTheDocument()
        
        // Should show fallback for next game
        expect(screen.getByText('Kein nächstes Spiel für 1. Mannschaft geplant')).toBeInTheDocument()
      })
    })

    it('should handle invalid team IDs gracefully', async () => {
      mockTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: null,
        nextGame: null
      })

      // Test with invalid team ID (should default to team 1 behavior)
      render(<GameCards selectedTeam={'invalid' as TeamId} />)

      await waitFor(() => {
        expect(mockTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('invalid')
      })
    })
  })
})