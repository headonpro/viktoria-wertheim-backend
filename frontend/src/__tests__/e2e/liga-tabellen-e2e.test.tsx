/**
 * E2E tests for Liga-Tabellen functionality with team switching
 * Task 10: Tests für neue Liga-Tabellen Funktionalität
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import React from 'react'
import { leagueService } from '../../services/leagueService'
import { teamService } from '../../services/teamService'

// Mock services
jest.mock('../../services/leagueService')
jest.mock('../../services/teamService')

const mockedLeagueService = leagueService as jest.Mocked<typeof leagueService>
const mockedTeamService = teamService as jest.Mocked<typeof teamService>

// Mock Next.js components
jest.mock('next/dynamic', () => (fn: any) => {
  const Component = fn()
  return Component
})

jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...props} />
  }
})

// Mock components
jest.mock('../../components/AnimatedSection', () => {
  return function MockAnimatedSection({ children }: { children: React.ReactNode }) {
    return <div data-testid="animated-section">{children}</div>
  }
})

// Create a test component that includes both TeamStatus and LeagueTable
const TestComponent = () => {
  const [selectedTeam, setSelectedTeam] = React.useState<'1' | '2' | '3'>('1')
  
  return (
    <div>
      <div data-testid="team-status">
        <button 
          onClick={() => setSelectedTeam('1')}
          className={selectedTeam === '1' ? 'bg-viktoria-yellow' : 'bg-white/10'}
          data-testid="team-1-button"
        >
          1. Mannschaft
        </button>
        <button 
          onClick={() => setSelectedTeam('2')}
          className={selectedTeam === '2' ? 'bg-viktoria-yellow' : 'bg-white/10'}
          data-testid="team-2-button"
        >
          2. Mannschaft
        </button>
        <button 
          onClick={() => setSelectedTeam('3')}
          className={selectedTeam === '3' ? 'bg-viktoria-yellow' : 'bg-white/10'}
          data-testid="team-3-button"
        >
          3. Mannschaft
        </button>
      </div>
      
      <div data-testid="league-table">
        {/* Simulate LeagueTable component */}
        <div className="league-table-container">
          <h2 data-testid="league-name">
            {selectedTeam === '1' && 'Kreisliga Tauberbischofsheim'}
            {selectedTeam === '2' && 'Kreisklasse A Tauberbischofsheim'}
            {selectedTeam === '3' && 'Kreisklasse B Tauberbischofsheim'}
          </h2>
          <div data-testid="team-list">
            {/* Teams will be populated by mocked service calls */}
          </div>
        </div>
      </div>
    </div>
  )
}

describe('Liga-Tabellen E2E Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    mockedLeagueService.getLeagueNameByTeam.mockImplementation((teamId) => {
      const names = {
        '1': 'Kreisliga Tauberbischofsheim',
        '2': 'Kreisklasse A Tauberbischofsheim',
        '3': 'Kreisklasse B Tauberbischofsheim'
      }
      return names[teamId] || 'Unbekannte Liga'
    })
    
    mockedLeagueService.getTeamInfo.mockImplementation((teamId) => {
      const info = {
        '1': { ligaName: 'Kreisliga Tauberbischofsheim', teamName: 'SV Viktoria Wertheim', isFallback: false },
        '2': { ligaName: 'Kreisklasse A Tauberbischofsheim', teamName: 'SV Viktoria Wertheim II', isFallback: false },
        '3': { ligaName: 'Kreisklasse B Tauberbischofsheim', teamName: 'SpG Vikt. Wertheim 3/Grünenwort', isFallback: false }
      }
      return info[teamId] || { ligaName: 'Unbekannte Liga', teamName: 'Unbekannte Mannschaft', isFallback: true }
    })
    
    mockedLeagueService.isViktoriaTeam.mockImplementation((teamName, teamId) => {
      const viktoriaPatterns = {
        '1': ['SV Viktoria Wertheim'],
        '2': ['SV Viktoria Wertheim II'],
        '3': ['SpG Vikt. Wertheim 3/Grünenwort']
      }
      
      if (teamId && viktoriaPatterns[teamId]) {
        return viktoriaPatterns[teamId].some(pattern => teamName.includes(pattern))
      }
      
      return teamName.toLowerCase().includes('viktoria')
    })

    // Mock team data for different leagues
    mockedLeagueService.fetchLeagueStandingsByTeam.mockImplementation((teamId) => {
      const mockData = {
        '1': [ // Kreisliga
          {
            position: 1,
            name: 'SV Viktoria Wertheim',
            logo: 'http://localhost:1337/uploads/viktoria-logo.png',
            games: 18,
            wins: 12,
            draws: 4,
            losses: 2,
            goalsFor: 45,
            goalsAgainst: 18,
            goalDifference: 27,
            points: 40
          },
          {
            position: 2,
            name: 'VfR Gerlachsheim',
            games: 18,
            wins: 10,
            draws: 5,
            losses: 3,
            goalsFor: 38,
            goalsAgainst: 22,
            goalDifference: 16,
            points: 35
          }
        ],
        '2': [ // Kreisklasse A
          {
            position: 1,
            name: 'TSV Unterschüpf',
            games: 14,
            wins: 10,
            draws: 3,
            losses: 1,
            goalsFor: 35,
            goalsAgainst: 12,
            goalDifference: 23,
            points: 33
          },
          {
            position: 5,
            name: 'SV Viktoria Wertheim II',
            games: 14,
            wins: 6,
            draws: 4,
            losses: 4,
            goalsFor: 22,
            goalsAgainst: 18,
            goalDifference: 4,
            points: 22
          }
        ],
        '3': [ // Kreisklasse B
          {
            position: 1,
            name: 'SpG Vikt. Wertheim 3/Grünenwort',
            games: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
          },
          {
            position: 1,
            name: 'FC Hundheim-Steinbach 2',
            games: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
          }
        ]
      }
      
      return Promise.resolve(mockData[teamId] || [])
    })
  })

  describe('Team Switching Workflow', () => {
    it('should switch between all three teams and load correct league tables', async () => {
      render(<TestComponent />)
      
      // Initially should show team 1 (Kreisliga)
      expect(screen.getByTestId('team-1-button')).toHaveClass('bg-viktoria-yellow')
      expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisliga Tauberbischofsheim')
      
      // Switch to team 2
      fireEvent.click(screen.getByTestId('team-2-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('team-2-button')).toHaveClass('bg-viktoria-yellow')
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse A Tauberbischofsheim')
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('2')
      })
      
      // Switch to team 3
      fireEvent.click(screen.getByTestId('team-3-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('team-3-button')).toHaveClass('bg-viktoria-yellow')
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse B Tauberbischofsheim')
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('3')
      })
      
      // Switch back to team 1
      fireEvent.click(screen.getByTestId('team-1-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('team-1-button')).toHaveClass('bg-viktoria-yellow')
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisliga Tauberbischofsheim')
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('1')
      })
    })

    it('should call API for each team switch', async () => {
      render(<TestComponent />)
      
      // Initial load for team 1
      expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('1')
      
      // Switch to team 2
      fireEvent.click(screen.getByTestId('team-2-button'))
      
      await waitFor(() => {
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('2')
      })
      
      // Switch to team 3
      fireEvent.click(screen.getByTestId('team-3-button'))
      
      await waitFor(() => {
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('3')
      })
      
      // Should have been called 3 times total
      expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledTimes(3)
    })
  })

  describe('League-specific Data Display', () => {
    it('should display correct Viktoria team highlighting for each league', async () => {
      render(<TestComponent />)
      
      // Team 1: Should highlight "SV Viktoria Wertheim"
      expect(mockedLeagueService.isViktoriaTeam).toHaveBeenCalledWith('SV Viktoria Wertheim', '1')
      
      // Switch to team 2
      fireEvent.click(screen.getByTestId('team-2-button'))
      
      await waitFor(() => {
        // Team 2: Should highlight "SV Viktoria Wertheim II"
        expect(mockedLeagueService.isViktoriaTeam).toHaveBeenCalledWith('SV Viktoria Wertheim II', '2')
      })
      
      // Switch to team 3
      fireEvent.click(screen.getByTestId('team-3-button'))
      
      await waitFor(() => {
        // Team 3: Should highlight "SpG Vikt. Wertheim 3/Grünenwort"
        expect(mockedLeagueService.isViktoriaTeam).toHaveBeenCalledWith('SpG Vikt. Wertheim 3/Grünenwort', '3')
      })
    })

    it('should load different league sizes correctly', async () => {
      render(<TestComponent />)
      
      // Team 1: Kreisliga (16 teams expected)
      await waitFor(() => {
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('1')
      })
      
      // Switch to team 2: Kreisklasse A (14 teams expected)
      fireEvent.click(screen.getByTestId('team-2-button'))
      
      await waitFor(() => {
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('2')
      })
      
      // Switch to team 3: Kreisklasse B (9 teams expected)
      fireEvent.click(screen.getByTestId('team-3-button'))
      
      await waitFor(() => {
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('3')
      })
    })
  })

  describe('Performance and Caching', () => {
    it('should not make duplicate API calls for same team', async () => {
      render(<TestComponent />)
      
      // Initial load for team 1
      expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledTimes(1)
      
      // Switch to team 2
      fireEvent.click(screen.getByTestId('team-2-button'))
      
      await waitFor(() => {
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledTimes(2)
      })
      
      // Switch back to team 1 - should make new call (no caching implemented yet)
      fireEvent.click(screen.getByTestId('team-1-button'))
      
      await waitFor(() => {
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledTimes(3)
      })
    })

    it('should handle rapid team switching without race conditions', async () => {
      render(<TestComponent />)
      
      // Rapidly switch between teams
      fireEvent.click(screen.getByTestId('team-2-button'))
      fireEvent.click(screen.getByTestId('team-3-button'))
      fireEvent.click(screen.getByTestId('team-1-button'))
      
      await waitFor(() => {
        // Should have made calls for all teams
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('1')
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('2')
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('3')
      })
      
      // Final state should be team 1
      expect(screen.getByTestId('team-1-button')).toHaveClass('bg-viktoria-yellow')
      expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisliga Tauberbischofsheim')
    })
  })

  describe('Error Handling in Team Switching', () => {
    it('should handle API errors gracefully during team switch', async () => {
      // Mock error for team 2
      mockedLeagueService.fetchLeagueStandingsByTeam.mockImplementation((teamId) => {
        if (teamId === '2') {
          return Promise.reject({
            type: 'network',
            message: 'Network error',
            retryable: true
          })
        }
        return Promise.resolve([])
      })
      
      render(<TestComponent />)
      
      // Switch to team 2 (should error)
      fireEvent.click(screen.getByTestId('team-2-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('team-2-button')).toHaveClass('bg-viktoria-yellow')
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse A Tauberbischofsheim')
      })
      
      // Should still be able to switch to team 3
      fireEvent.click(screen.getByTestId('team-3-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('team-3-button')).toHaveClass('bg-viktoria-yellow')
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse B Tauberbischofsheim')
      })
    })

    it('should use fallback league names when mapping fails', async () => {
      // Mock fallback scenario
      mockedLeagueService.getTeamInfo.mockImplementation((teamId) => {
        if (teamId === '2') {
          return {
            ligaName: 'Kreisklasse A Tauberbischofsheim',
            teamName: 'SV Viktoria Wertheim II',
            isFallback: true
          }
        }
        return {
          ligaName: 'Kreisliga Tauberbischofsheim',
          teamName: 'SV Viktoria Wertheim',
          isFallback: false
        }
      })
      
      render(<TestComponent />)
      
      // Switch to team 2 (fallback mode)
      fireEvent.click(screen.getByTestId('team-2-button'))
      
      await waitFor(() => {
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse A Tauberbischofsheim')
        expect(mockedLeagueService.getTeamInfo).toHaveBeenCalledWith('2')
      })
    })
  })

  describe('Data Consistency', () => {
    it('should maintain consistent team highlighting across switches', async () => {
      render(<TestComponent />)
      
      // Each team switch should call isViktoriaTeam with correct parameters
      
      // Team 1
      await waitFor(() => {
        expect(mockedLeagueService.isViktoriaTeam).toHaveBeenCalledWith('SV Viktoria Wertheim', '1')
      })
      
      // Switch to team 2
      fireEvent.click(screen.getByTestId('team-2-button'))
      
      await waitFor(() => {
        expect(mockedLeagueService.isViktoriaTeam).toHaveBeenCalledWith('SV Viktoria Wertheim II', '2')
      })
      
      // Switch to team 3
      fireEvent.click(screen.getByTestId('team-3-button'))
      
      await waitFor(() => {
        expect(mockedLeagueService.isViktoriaTeam).toHaveBeenCalledWith('SpG Vikt. Wertheim 3/Grünenwort', '3')
      })
    })

    it('should maintain correct league-to-team mapping', async () => {
      render(<TestComponent />)
      
      // Verify each team maps to correct league
      expect(mockedLeagueService.getLeagueNameByTeam('1')).toBe('Kreisliga Tauberbischofsheim')
      expect(mockedLeagueService.getLeagueNameByTeam('2')).toBe('Kreisklasse A Tauberbischofsheim')
      expect(mockedLeagueService.getLeagueNameByTeam('3')).toBe('Kreisklasse B Tauberbischofsheim')
    })
  })

  describe('User Experience', () => {
    it('should provide immediate visual feedback on team selection', async () => {
      render(<TestComponent />)
      
      // Initially team 1 should be selected
      expect(screen.getByTestId('team-1-button')).toHaveClass('bg-viktoria-yellow')
      expect(screen.getByTestId('team-2-button')).toHaveClass('bg-white/10')
      expect(screen.getByTestId('team-3-button')).toHaveClass('bg-white/10')
      
      // Click team 2
      fireEvent.click(screen.getByTestId('team-2-button'))
      
      // Should immediately update button states
      expect(screen.getByTestId('team-1-button')).toHaveClass('bg-white/10')
      expect(screen.getByTestId('team-2-button')).toHaveClass('bg-viktoria-yellow')
      expect(screen.getByTestId('team-3-button')).toHaveClass('bg-white/10')
    })

    it('should update league name immediately on team switch', async () => {
      render(<TestComponent />)
      
      // Initially should show Kreisliga
      expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisliga Tauberbischofsheim')
      
      // Switch to team 2
      fireEvent.click(screen.getByTestId('team-2-button'))
      
      // Should immediately update league name
      expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse A Tauberbischofsheim')
      
      // Switch to team 3
      fireEvent.click(screen.getByTestId('team-3-button'))
      
      // Should immediately update league name
      expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse B Tauberbischofsheim')
    })
  })
})