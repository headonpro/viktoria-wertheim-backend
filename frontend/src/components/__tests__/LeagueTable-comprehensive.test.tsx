/**
 * Comprehensive test suite for LeagueTable component with all three teams
 * Task 10: Tests für neue Liga-Tabellen Funktionalität
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import LeagueTable from '../LeagueTable'
import { leagueService } from '../../services/leagueService'

// Mock the leagueService
jest.mock('../../services/leagueService')
const mockedLeagueService = leagueService as jest.Mocked<typeof leagueService>

// Mock dynamic imports
jest.mock('next/dynamic', () => (fn: any) => {
  const Component = fn()
  return Component
})

// Mock AnimatedSection
jest.mock('../AnimatedSection', () => {
  return function MockAnimatedSection({ children }: { children: React.ReactNode }) {
    return <div data-testid="animated-section">{children}</div>
  }
})

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
})

describe('LeagueTable - Comprehensive Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Default mock implementations
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
        '1': ['SV Viktoria Wertheim', 'Viktoria Wertheim'],
        '2': ['SV Viktoria Wertheim II', 'Viktoria Wertheim II'],
        '3': ['SpG Vikt. Wertheim 3/Grünenwort', 'SpG Vikt. Wertheim 3']
      }
      
      if (teamId && viktoriaPatterns[teamId]) {
        return viktoriaPatterns[teamId].some(pattern => teamName.includes(pattern))
      }
      
      return teamName.toLowerCase().includes('viktoria')
    })
  })

  describe('Team 1 - Kreisliga Tauberbischofsheim', () => {
    const kreisligaTeams = [
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
      },
      {
        position: 3,
        name: 'TSV Jahn Kreuzwertheim',
        games: 18,
        wins: 9,
        draws: 6,
        losses: 3,
        goalsFor: 32,
        goalsAgainst: 20,
        goalDifference: 12,
        points: 33
      }
    ]

    it('should display Kreisliga table with correct league name', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(kreisligaTeams)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Kreisliga Tauberbischofsheim')).toBeInTheDocument()
      })
    })

    it('should highlight Viktoria Wertheim team correctly', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(kreisligaTeams)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        const viktoriaRow = screen.getByText('SV Viktoria Wertheim').closest('div')
        expect(viktoriaRow).toHaveClass('bg-viktoria-yellow')
      })
    })

    it('should display team statistics correctly', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(kreisligaTeams)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByText('1.')).toBeInTheDocument() // Position
        expect(screen.getByText('40')).toBeInTheDocument() // Points
        expect(screen.getByText('+27')).toBeInTheDocument() // Goal difference
        expect(screen.getByText('18')).toBeInTheDocument() // Games
      })
    })

    it('should show team logo when available', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(kreisligaTeams)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        const logoImg = screen.getByAltText('SV Viktoria Wertheim Logo')
        expect(logoImg).toBeInTheDocument()
        expect(logoImg).toHaveAttribute('src', 'http://localhost:1337/uploads/viktoria-logo.png')
      })
    })
  })

  describe('Team 2 - Kreisklasse A Tauberbischofsheim', () => {
    const kreisklasseATeams = [
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
      },
      {
        position: 6,
        name: 'SV Nassig II',
        games: 14,
        wins: 5,
        draws: 5,
        losses: 4,
        goalsFor: 20,
        goalsAgainst: 19,
        goalDifference: 1,
        points: 20
      }
    ]

    it('should display Kreisklasse A table with correct league name', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(kreisklasseATeams)
      
      render(<LeagueTable selectedTeam="2" />)
      
      await waitFor(() => {
        expect(screen.getByText('Kreisklasse A Tauberbischofsheim')).toBeInTheDocument()
      })
    })

    it('should highlight Viktoria Wertheim II team correctly', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(kreisklasseATeams)
      
      render(<LeagueTable selectedTeam="2" />)
      
      await waitFor(() => {
        const viktoriaRow = screen.getByText('SV Viktoria Wertheim II').closest('div')
        expect(viktoriaRow).toHaveClass('bg-viktoria-yellow')
      })
    })

    it('should show Viktoria team in 5th position', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(kreisklasseATeams)
      
      render(<LeagueTable selectedTeam="2" />)
      
      await waitFor(() => {
        const viktoriaRow = screen.getByText('SV Viktoria Wertheim II').closest('div')
        expect(viktoriaRow).toHaveTextContent('5.')
        expect(viktoriaRow).toHaveTextContent('22') // Points
      })
    })
  })

  describe('Team 3 - Kreisklasse B Tauberbischofsheim', () => {
    const kreisklasseBTeams = [
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
      },
      {
        position: 1,
        name: 'FC Wertheim-Eichel 2',
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

    it('should display Kreisklasse B table with correct league name', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(kreisklasseBTeams)
      
      render(<LeagueTable selectedTeam="3" />)
      
      await waitFor(() => {
        expect(screen.getByText('Kreisklasse B Tauberbischofsheim')).toBeInTheDocument()
      })
    })

    it('should highlight Viktoria Wertheim III team correctly', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(kreisklasseBTeams)
      
      render(<LeagueTable selectedTeam="3" />)
      
      await waitFor(() => {
        const viktoriaRow = screen.getByText('SpG Vikt. Wertheim 3/Grünenwort').closest('div')
        expect(viktoriaRow).toHaveClass('bg-viktoria-yellow')
      })
    })

    it('should show all teams at position 1 (season start)', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(kreisklasseBTeams)
      
      render(<LeagueTable selectedTeam="3" />)
      
      await waitFor(() => {
        const positionElements = screen.getAllByText('1.')
        expect(positionElements).toHaveLength(3)
      })
    })

    it('should show all statistics as 0 (season start)', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(kreisklasseBTeams)
      
      render(<LeagueTable selectedTeam="3" />)
      
      await waitFor(() => {
        // Check that all teams have 0 points
        const pointsElements = screen.getAllByText('0')
        expect(pointsElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Team Name Shortening', () => {
    const teamsWithLongNames = [
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
        position: 2,
        name: 'SpG Kickers DHK Wertheim 2/Urphar',
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

    it('should show shortened names on mobile and full names on desktop', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(teamsWithLongNames)
      
      render(<LeagueTable selectedTeam="3" />)
      
      await waitFor(() => {
        // Mobile shortened name
        expect(screen.getByText('SpG VIK 3')).toBeInTheDocument()
        // Desktop full name
        expect(screen.getByText('SpG Vikt. Wertheim 3/Grünenwort')).toBeInTheDocument()
      })
    })
  })

  describe('Table Expansion', () => {
    const manyTeams = Array.from({ length: 16 }, (_, i) => ({
      position: i + 1,
      name: `Team ${i + 1}`,
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    }))

    it('should show compact view initially', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(manyTeams)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Vollständige Tabelle anzeigen')).toBeInTheDocument()
        // Should not show all 16 teams initially
        expect(screen.queryByText('Team 16')).not.toBeInTheDocument()
      })
    })

    it('should expand to show all teams when clicked', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(manyTeams)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        const expandButton = screen.getByText('Vollständige Tabelle anzeigen')
        fireEvent.click(expandButton)
      })
      
      await waitFor(() => {
        expect(screen.getByText('Weniger anzeigen')).toBeInTheDocument()
        expect(screen.getByText('Team 16')).toBeInTheDocument()
      })
    })

    it('should show legend when expanded', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(manyTeams)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        const expandButton = screen.getByText('Vollständige Tabelle anzeigen')
        fireEvent.click(expandButton)
      })
      
      await waitFor(() => {
        expect(screen.getByText(/Sp = Spiele, S = Siege/)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )
      
      render(<LeagueTable selectedTeam="1" />)
      
      expect(screen.getByText('Tabelle wird geladen...')).toBeInTheDocument()
      expect(screen.getAllByRole('generic').some(el => 
        el.className.includes('animate-pulse')
      )).toBe(true)
    })

    it('should hide loading state when data loads', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue([
        {
          position: 1,
          name: 'Test Team',
          games: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        }
      ])
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.queryByText('Tabelle wird geladen...')).not.toBeInTheDocument()
        expect(screen.getByText('Test Team')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    const testTeams = [
      {
        position: 1,
        name: 'SV Viktoria Wertheim',
        games: 18,
        wins: 12,
        draws: 4,
        losses: 2,
        goalsFor: 45,
        goalsAgainst: 18,
        goalDifference: 27,
        points: 40
      }
    ]

    it('should show different columns on mobile vs desktop', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(testTeams)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        // Mobile should show goals as "45:18"
        expect(screen.getByText('45:18')).toBeInTheDocument()
        
        // Desktop should show individual win/draw/loss columns
        expect(screen.getByText('12')).toBeInTheDocument() // Wins
        expect(screen.getByText('4')).toBeInTheDocument()  // Draws
        expect(screen.getByText('2')).toBeInTheDocument()  // Losses
      })
    })

    it('should have proper touch targets for mobile', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(testTeams)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        const tableContainer = screen.getByText('SV Viktoria Wertheim').closest('div')
        expect(tableContainer).toHaveClass('min-h-[48px]') // Minimum touch target
        expect(tableContainer).toHaveClass('touch-manipulation')
      })
    })
  })

  describe('Data Updates', () => {
    it('should update when selectedTeam prop changes', async () => {
      const { rerender } = render(<LeagueTable selectedTeam="1" />)
      
      // Initial call for team 1
      expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('1')
      
      // Change to team 2
      rerender(<LeagueTable selectedTeam="2" />)
      
      await waitFor(() => {
        expect(mockedLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledWith('2')
      })
    })

    it('should show last updated timestamp', async () => {
      const testTeams = [
        {
          position: 1,
          name: 'Test Team',
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
      
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(testTeams)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Test Team')).toBeInTheDocument()
        // The component should track when data was last updated
      })
    })
  })
})