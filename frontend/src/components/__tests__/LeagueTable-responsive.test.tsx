/**
 * LeagueTable Responsive Display Tests
 * Tests for Task 8: Frontend: Responsive Tabellendarstellung optimieren
 * 
 * Requirements tested:
 * - 7.1: Team-Name Kürzung für mobile Geräte mit neuen Team-Namen
 * - 7.2: Viktoria-Team Hervorhebung für alle drei Mannschafts-Varianten
 * - 7.3: Vollständige Tabelle Anzeige mit allen Liga-Größen (9, 14, 16 Teams)
 * - 7.4: Responsive Tabellendarstellung
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import LeagueTable from '../LeagueTable'
import { leagueService } from '../../services/leagueService'

// Mock the leagueService
jest.mock('../../services/leagueService')
const mockLeagueService = leagueService as jest.Mocked<typeof leagueService>

// Mock Next.js dynamic import
jest.mock('next/dynamic', () => {
  return (fn: any) => {
    const Component = fn()
    return Component
  }
})

// Mock AnimatedSection
jest.mock('../AnimatedSection', () => {
  return function MockAnimatedSection({ children }: { children: React.ReactNode }) {
    return <div data-testid="animated-section">{children}</div>
  }
})

// Test data for different league sizes
const createMockTeam = (position: number, name: string) => ({
  position,
  name,
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

// Kreisliga Tauberbischofsheim (16 teams) - from actual database
const mockKreisligaTeams = [
  createMockTeam(1, 'SV Viktoria Wertheim'),
  createMockTeam(2, 'VfR Gerlachsheim'),
  createMockTeam(3, 'TSV Jahn Kreuzwertheim'),
  createMockTeam(4, 'TSV Assamstadt'),
  createMockTeam(5, 'FV Brehmbachtal'),
  createMockTeam(6, 'FC Hundheim-Steinbach'),
  createMockTeam(7, 'TuS Großrinderfeld'),
  createMockTeam(8, 'Türk Gücü Wertheim'),
  createMockTeam(9, 'SV Pülfringen'),
  createMockTeam(10, 'VfB Reicholzheim'),
  createMockTeam(11, 'FC Rauenberg'),
  createMockTeam(12, 'SV Schönfeld'),
  createMockTeam(13, 'TSG Impfingen II'),
  createMockTeam(14, '1. FC Umpfertal'),
  createMockTeam(15, 'Kickers DHK Wertheim'),
  createMockTeam(16, 'TSV Schwabhausen')
]

// Kreisklasse A Tauberbischofsheim (14 teams) - from actual database
const mockKreisklasseATeams = [
  createMockTeam(1, 'TSV Unterschüpf'),
  createMockTeam(2, 'SV Nassig II'),
  createMockTeam(3, 'TSV Dittwar'),
  createMockTeam(4, 'FV Oberlauda e.V.'),
  createMockTeam(5, 'SV Viktoria Wertheim II'),
  createMockTeam(6, 'FC Wertheim-Eichel'),
  createMockTeam(7, 'TSV Assamstadt II'),
  createMockTeam(8, 'FC Grünsfeld II'),
  createMockTeam(9, 'TSV Gerchsheim'),
  createMockTeam(10, 'SV Distelhausen II'),
  createMockTeam(11, 'TSV Wenkheim'),
  createMockTeam(12, 'SV Winzer Beckstein II'),
  createMockTeam(13, 'SV Oberbalbach'),
  createMockTeam(14, 'FSV Tauberhöhe II')
]

// Kreisklasse B Tauberbischofsheim (9 teams) - from actual database
const mockKreisklasseBTeams = [
  createMockTeam(1, 'FC Hundheim-Steinbach 2'),
  createMockTeam(1, 'FC Wertheim-Eichel 2'),
  createMockTeam(1, 'SG RaMBo 2'),
  createMockTeam(1, 'SV Eintracht Nassig 3'),
  createMockTeam(1, 'SpG Kickers DHK Wertheim 2/Urphar'),
  createMockTeam(1, 'SpG Vikt. Wertheim 3/Grünenwort'),
  createMockTeam(1, 'TSV Kreuzwertheim 2'),
  createMockTeam(1, 'Turkgucu Wertheim 2'),
  createMockTeam(1, 'VfB Reicholzheim 2')
]

describe('LeagueTable Responsive Display', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue([])
    mockLeagueService.getLeagueNameByTeam.mockReturnValue('')
    mockLeagueService.fetchLeagueStandingsWithRetry.mockResolvedValue([])
    mockLeagueService.isViktoriaTeam.mockReturnValue(false)
  })

  describe('Team Name Abbreviations (Requirement 7.1)', () => {
    it('should show abbreviated team names on mobile for Kreisliga teams', async () => {
      mockLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(mockKreisligaTeams.slice(0, 3))
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisliga Tauberbischofsheim')
      mockLeagueService.isViktoriaTeam.mockImplementation((name, teamId) => 
        name === 'SV Viktoria Wertheim' && teamId === '1'
      )

      render(<LeagueTable selectedTeam="1" />)

      await waitFor(() => {
        // Check that mobile abbreviated names are present
        expect(screen.getByText('SV VIK')).toBeInTheDocument()
        expect(screen.getByText('VfR GER')).toBeInTheDocument()
        expect(screen.getByText('TSV JAH')).toBeInTheDocument()
      })
    })

    it('should show abbreviated team names for Kreisklasse A teams', async () => {
      mockLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(mockKreisklasseATeams.slice(4, 7))
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisklasse A Tauberbischofsheim')
      mockLeagueService.isViktoriaTeam.mockImplementation((name, teamId) => 
        name === 'SV Viktoria Wertheim II' && teamId === '2'
      )

      render(<LeagueTable selectedTeam="2" />)

      await waitFor(() => {
        // Check Kreisklasse A specific abbreviations
        expect(screen.getByText('SV VIK II')).toBeInTheDocument()
        expect(screen.getByText('FC EIC')).toBeInTheDocument()
        expect(screen.getByText('TSV ASS II')).toBeInTheDocument()
      })
    })

    it('should show abbreviated team names for Kreisklasse B teams', async () => {
      mockLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(mockKreisklasseBTeams.slice(0, 3))
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisklasse B Tauberbischofsheim')
      mockLeagueService.isViktoriaTeam.mockImplementation((name, teamId) => 
        name === 'SpG Vikt. Wertheim 3/Grünenwort' && teamId === '3'
      )

      render(<LeagueTable selectedTeam="3" />)

      await waitFor(() => {
        // Check Kreisklasse B specific abbreviations
        expect(screen.getByText('FC HUN 2')).toBeInTheDocument()
        expect(screen.getByText('FC EIC 2')).toBeInTheDocument()
        expect(screen.getByText('SG RAM 2')).toBeInTheDocument()
      })
    })
  })

  describe('Viktoria Team Highlighting (Requirement 7.2)', () => {
    it('should highlight SV Viktoria Wertheim (1st team) correctly', async () => {
      mockLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(mockKreisligaTeams.slice(0, 3))
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisliga Tauberbischofsheim')
      mockLeagueService.isViktoriaTeam.mockImplementation((name, teamId) => 
        name === 'SV Viktoria Wertheim' && teamId === '1'
      )

      render(<LeagueTable selectedTeam="1" />)

      await waitFor(() => {
        const viktoriaRow = screen.getByText('SV VIK').closest('div')
        expect(viktoriaRow).toHaveClass('cursor-pointer')
        
        // Check for Viktoria highlighting background
        const highlightBg = viktoriaRow?.querySelector('.bg-viktoria-yellow')
        expect(highlightBg).toBeInTheDocument()
      })
    })

    it('should highlight SV Viktoria Wertheim II (2nd team) correctly', async () => {
      mockLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(mockKreisklasseATeams.slice(4, 7))
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisklasse A Tauberbischofsheim')
      mockLeagueService.isViktoriaTeam.mockImplementation((name, teamId) => 
        name === 'SV Viktoria Wertheim II' && teamId === '2'
      )

      render(<LeagueTable selectedTeam="2" />)

      await waitFor(() => {
        const viktoriaRow = screen.getByText('SV VIK II').closest('div')
        expect(viktoriaRow).toHaveClass('cursor-pointer')
        
        // Check for Viktoria highlighting background
        const highlightBg = viktoriaRow?.querySelector('.bg-viktoria-yellow')
        expect(highlightBg).toBeInTheDocument()
      })
    })

    it('should highlight SpG Vikt. Wertheim 3/Grünenwort (3rd team) correctly', async () => {
      const teamWithViktoria = mockKreisklasseBTeams.filter(team => 
        team.name === 'SpG Vikt. Wertheim 3/Grünenwort'
      )
      mockLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue([
        ...mockKreisklasseBTeams.slice(0, 2),
        ...teamWithViktoria
      ])
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisklasse B Tauberbischofsheim')
      mockLeagueService.isViktoriaTeam.mockImplementation((name, teamId) => 
        name === 'SpG Vikt. Wertheim 3/Grünenwort' && teamId === '3'
      )

      render(<LeagueTable selectedTeam="3" />)

      await waitFor(() => {
        const viktoriaRow = screen.getByText('SpG VIK 3').closest('div')
        expect(viktoriaRow).toHaveClass('cursor-pointer')
        
        // Check for Viktoria highlighting background
        const highlightBg = viktoriaRow?.querySelector('.bg-viktoria-yellow')
        expect(highlightBg).toBeInTheDocument()
      })
    })
  })

  describe('Full Table Display with All League Sizes (Requirement 7.3)', () => {
    it('should display full Kreisliga table with 16 teams when expanded', async () => {
      mockLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(mockKreisligaTeams)
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisliga Tauberbischofsheim')
      mockLeagueService.isViktoriaTeam.mockImplementation((name, teamId) => 
        name === 'SV Viktoria Wertheim' && teamId === '1'
      )

      render(<LeagueTable selectedTeam="1" />)

      await waitFor(() => {
        expect(screen.getByText('Kreisliga Tauberbischofsheim')).toBeInTheDocument()
      })

      // Click to expand full table
      const expandButton = screen.getByText('Vollständige Tabelle anzeigen')
      fireEvent.click(expandButton)

      await waitFor(() => {
        // Should show all 16 teams
        expect(screen.getByText('SV VIK')).toBeInTheDocument() // 1st place
        expect(screen.getByText('TSV SCH')).toBeInTheDocument() // 16th place (TSV Schwabhausen)
        expect(screen.getByText('Weniger anzeigen')).toBeInTheDocument()
      })
    })

    it('should display full Kreisklasse A table with 14 teams when expanded', async () => {
      mockLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(mockKreisklasseATeams)
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisklasse A Tauberbischofsheim')
      mockLeagueService.isViktoriaTeam.mockImplementation((name, teamId) => 
        name === 'SV Viktoria Wertheim II' && teamId === '2'
      )

      render(<LeagueTable selectedTeam="2" />)

      await waitFor(() => {
        expect(screen.getByText('Kreisklasse A Tauberbischofsheim')).toBeInTheDocument()
      })

      // Click to expand full table
      const expandButton = screen.getByText('Vollständige Tabelle anzeigen')
      fireEvent.click(expandButton)

      await waitFor(() => {
        // Should show all 14 teams
        expect(screen.getByText('TSV UNT')).toBeInTheDocument() // 1st place
        expect(screen.getByText('FSV TAU II')).toBeInTheDocument() // 14th place
        expect(screen.getByText('SV VIK II')).toBeInTheDocument() // Viktoria II at 5th place
        expect(screen.getByText('Weniger anzeigen')).toBeInTheDocument()
      })
    })

    it('should display full Kreisklasse B table with 9 teams when expanded', async () => {
      mockLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(mockKreisklasseBTeams)
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisklasse B Tauberbischofsheim')
      mockLeagueService.isViktoriaTeam.mockImplementation((name, teamId) => 
        name === 'SpG Vikt. Wertheim 3/Grünenwort' && teamId === '3'
      )

      render(<LeagueTable selectedTeam="3" />)

      await waitFor(() => {
        expect(screen.getByText('Kreisklasse B Tauberbischofsheim')).toBeInTheDocument()
      })

      // Click to expand full table
      const expandButton = screen.getByText('Vollständige Tabelle anzeigen')
      fireEvent.click(expandButton)

      await waitFor(() => {
        // Should show all 9 teams (all at position 1 for season start)
        expect(screen.getByText('FC HUN 2')).toBeInTheDocument()
        expect(screen.getByText('SpG VIK 3')).toBeInTheDocument() // Viktoria III
        expect(screen.getByText('VfB REI 2')).toBeInTheDocument()
        expect(screen.getByText('Weniger anzeigen')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Table Display (Requirement 7.4)', () => {
    it('should show compact view by default and expand on click', async () => {
      mockLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue(mockKreisligaTeams)
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisliga Tauberbischofsheim')
      mockLeagueService.isViktoriaTeam.mockImplementation((name, teamId) => 
        name === 'SV Viktoria Wertheim' && teamId === '1'
      )

      render(<LeagueTable selectedTeam="1" />)

      await waitFor(() => {
        // Should show compact view initially
        expect(screen.getByText('Vollständige Tabelle anzeigen')).toBeInTheDocument()
        
        // Should not show all teams initially (compact view shows ~3-5 teams)
        expect(screen.queryByText('TSV SCH')).not.toBeInTheDocument() // Last team
      })

      // Click to expand
      const expandButton = screen.getByText('Vollständige Tabelle anzeigen')
      fireEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText('Weniger anzeigen')).toBeInTheDocument()
        expect(screen.getByText('TSV SCH')).toBeInTheDocument() // Last team now visible
      })
    })

    it('should handle empty state gracefully', async () => {
      mockLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue([])
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisliga Tauberbischofsheim')
      mockLeagueService.fetchLeagueStandingsWithRetry.mockResolvedValue([])

      render(<LeagueTable selectedTeam="1" />)

      await waitFor(() => {
        expect(screen.getByText('Keine Tabellendaten für die Kreisliga verfügbar')).toBeInTheDocument()
        expect(screen.getByText('Erneut laden')).toBeInTheDocument()
      })
    })

    it('should show proper league names for all teams', async () => {
      // Test team 1
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisliga Tauberbischofsheim')
      const { rerender } = render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Kreisliga Tauberbischofsheim')).toBeInTheDocument()
      })

      // Test team 2
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisklasse A Tauberbischofsheim')
      rerender(<LeagueTable selectedTeam="2" />)
      
      await waitFor(() => {
        expect(screen.getByText('Kreisklasse A Tauberbischofsheim')).toBeInTheDocument()
      })

      // Test team 3
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisklasse B Tauberbischofsheim')
      rerender(<LeagueTable selectedTeam="3" />)
      
      await waitFor(() => {
        expect(screen.getByText('Kreisklasse B Tauberbischofsheim')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should show error state when API fails', async () => {
      mockLeagueService.fetchLeagueStandingsByTeam.mockRejectedValue(new Error('API Error'))
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisliga Tauberbischofsheim')
      mockLeagueService.fetchLeagueStandingsWithRetry.mockRejectedValue(new Error('Retry failed'))

      render(<LeagueTable selectedTeam="1" />)

      await waitFor(() => {
        expect(screen.getByText('Tabellendaten konnten nicht geladen werden')).toBeInTheDocument()
        expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
      })
    })

    it('should handle retry functionality', async () => {
      mockLeagueService.fetchLeagueStandingsByTeam.mockRejectedValue(new Error('API Error'))
      mockLeagueService.getLeagueNameByTeam.mockReturnValue('Kreisliga Tauberbischofsheim')
      mockLeagueService.fetchLeagueStandingsWithRetry.mockRejectedValue(new Error('Retry failed'))

      render(<LeagueTable selectedTeam="1" />)

      await waitFor(() => {
        expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
      })

      // Click retry button
      const retryButton = screen.getByText('Erneut versuchen')
      fireEvent.click(retryButton)

      // Should call the fetch function again
      expect(mockLeagueService.fetchLeagueStandingsByTeam).toHaveBeenCalledTimes(2)
    })
  })
})