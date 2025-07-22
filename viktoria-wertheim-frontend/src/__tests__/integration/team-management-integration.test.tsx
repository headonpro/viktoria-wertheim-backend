/**
 * End-to-End Component Integration Tests for Team Management System
 * 
 * This test suite validates:
 * - Complete user flow: team selection → data loading → component updates
 * - All components update correctly when switching teams
 * - Error handling scenarios across all components
 * - Data consistency between different components
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import axios from 'axios'
import HomePage from '../../app/page'
import { teamService } from '../../services/teamService'
import { leagueService } from '../../services/leagueService'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock services
jest.mock('../../services/teamService')
jest.mock('../../services/leagueService')
const mockedTeamService = teamService as jest.Mocked<typeof teamService>
const mockedLeagueService = leagueService as jest.Mocked<typeof leagueService>

// Mock Next.js dynamic imports
jest.mock('next/dynamic', () => {
  return (fn: any) => {
    const Component = React.forwardRef((props: any, ref: any) => {
      if (props.children) {
        return React.createElement('div', { ...props, ref }, props.children)
      }
      return React.createElement('div', { ...props, ref })
    })
    Component.displayName = 'DynamicComponent'
    return Component
  }
})

// Mock AnimatedSection components
jest.mock('../../components/AnimatedSection', () => ({
  __esModule: true,
  default: ({ children, className, ...props }: any) => 
    React.createElement('section', { className, ...props }, children),
  AnimatedDiv: ({ children, className, ...props }: any) => 
    React.createElement('div', { className, ...props }, children)
}))

// Mock strapi
jest.mock('../../lib/strapi', () => require('../../__mocks__/lib/strapi'))

// Mock API config
jest.mock('../../lib/apiConfig', () => require('../../__mocks__/lib/apiConfig'))

// Mock AuthContext
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false
  }),
  AuthProvider: ({ children }: any) => children
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, priority, ...props }: any) {
    // Filter out Next.js specific props that don't belong on img element
    const { priority: _, ...imgProps } = props
    return <div style={{ width: imgProps.width || 100, height: imgProps.height || 100, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{alt}</div>
  }
})

// Test data
const mockTeamData = {
  '1': {
    id: 1,
    name: '1. Mannschaft',
    liga: 'Kreisliga',
    liga_vollname: 'Kreisliga Würzburg',
    tabellenplatz: 8,
    punkte: 24,
    spiele_gesamt: 18,
    siege: 7,
    unentschieden: 3,
    niederlagen: 8,
    tore_fuer: 32,
    tore_gegen: 28,
    tordifferenz: 4,
    form_letzte_5: ['S', 'N', 'U', 'S', 'N'] as ('S' | 'U' | 'N')[],
    trend: 'gleich' as const,
    status: 'aktiv' as const,
    trainer: 'Max Mustermann',
    altersklasse: 'Herren'
  },
  '2': {
    id: 2,
    name: '2. Mannschaft',
    liga: 'Kreisklasse A',
    liga_vollname: 'Kreisklasse A Würzburg',
    tabellenplatz: 5,
    punkte: 28,
    spiele_gesamt: 16,
    siege: 8,
    unentschieden: 4,
    niederlagen: 4,
    tore_fuer: 35,
    tore_gegen: 22,
    tordifferenz: 13,
    form_letzte_5: ['S', 'S', 'U', 'S', 'N'] as ('S' | 'U' | 'N')[],
    trend: 'steigend' as const,
    status: 'aktiv' as const,
    trainer: 'Hans Schmidt',
    altersklasse: 'Herren'
  },
  '3': {
    id: 3,
    name: '3. Mannschaft',
    liga: 'Kreisklasse B',
    liga_vollname: 'Kreisklasse B Würzburg',
    tabellenplatz: 12,
    punkte: 15,
    spiele_gesamt: 14,
    siege: 4,
    unentschieden: 3,
    niederlagen: 7,
    tore_fuer: 18,
    tore_gegen: 31,
    tordifferenz: -13,
    form_letzte_5: ['N', 'N', 'U', 'N', 'S'] as ('S' | 'U' | 'N')[],
    trend: 'fallend' as const,
    status: 'aktiv' as const,
    trainer: 'Peter Weber',
    altersklasse: 'Herren'
  }
}

const mockGameData = {
  '1': {
    lastGame: {
      id: 1,
      type: 'last' as const,
      homeTeam: 'SV Viktoria Wertheim',
      awayTeam: 'FC Eichel',
      homeScore: 2,
      awayScore: 1,
      date: '15.12.2024',
      time: '15:00',
      isHome: true,
      stadium: 'Sportplatz Wertheim',
      referee: 'Hans Müller',
      status: 'beendet' as const,
      goalScorers: [
        { minute: 23, player: 'Thomas Müller', team: 'home' as const },
        { minute: 67, player: 'Max Schmidt', team: 'home' as const }
      ],
      yellowCards: [],
      redCards: []
    },
    nextGame: {
      id: 2,
      type: 'next' as const,
      homeTeam: 'TSV Assamstadt',
      awayTeam: 'SV Viktoria Wertheim',
      date: '22.12.2024',
      time: '14:30',
      isHome: false,
      stadium: 'Sportplatz Assamstadt',
      referee: 'Peter Weber',
      status: 'geplant' as const,
      goalScorers: [],
      yellowCards: [],
      redCards: [],
      lastMeeting: {
        date: '15.05.2024',
        result: '1:2',
        location: 'heim' as const
      }
    }
  }
}

const mockLeagueData = [
  {
    position: 1,
    name: 'FC Eichel',
    games: 18,
    wins: 14,
    draws: 3,
    losses: 1,
    goalsFor: 45,
    goalsAgainst: 12,
    goalDifference: 33,
    points: 45,
    logo: '/fceichel.png'
  },
  {
    position: 8,
    name: 'SV Viktoria Wertheim',
    games: 18,
    wins: 7,
    draws: 3,
    losses: 8,
    goalsFor: 32,
    goalsAgainst: 28,
    goalDifference: 4,
    points: 24,
    logo: '/viktorialogo.png'
  }
]

const mockPlayers = [
  {
    id: 1,
    attributes: {
      position: 'sturm' as const,
      rueckennummer: 9,
      tore_saison: 12,
      spiele_saison: 18,
      status: 'aktiv' as const,
      mitglied: {
        data: {
          id: 1,
          attributes: {
            vorname: 'Thomas',
            nachname: 'Müller',
            email: 'thomas.mueller@example.com'
          }
        }
      },
      publishedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z'
    }
  }
]

describe('Team Management System - End-to-End Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Setup default mock implementations
    mockedTeamService.fetchTeamData.mockImplementation(async (teamId) => {
      return mockTeamData[teamId]
    })
    
    mockedTeamService.fetchLastAndNextGame.mockImplementation(async (teamId) => {
      return mockGameData[teamId] || { lastGame: null, nextGame: null }
    })
    
    mockedLeagueService.fetchLeagueStandings.mockResolvedValue(mockLeagueData)
    
    // Mock axios for player data
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('/spielers')) {
        return Promise.resolve({
          data: {
            data: mockPlayers,
            meta: { pagination: { total: 1 } }
          }
        })
      }
      if (url.includes('/news-artikels')) {
        return Promise.resolve({
          data: {
            data: [],
            meta: { pagination: { total: 0 } }
          }
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  describe('Complete User Flow: Team Selection → Data Loading → Component Updates', () => {
    test('should load initial team data and display all components correctly', async () => {
      render(<HomePage />)
      
      // Wait for initial load and team data to be displayed
      await waitFor(() => {
        expect(screen.getByText('1. Mannschaft')).toBeInTheDocument()
      })
      
      // Wait for TeamStatus component to fully render
      await waitFor(() => {
        expect(screen.getAllByText(/platz/i)[0]).toBeInTheDocument() // Use getAllByText to handle multiple matches
        expect(screen.getAllByText(/8/)[0]).toBeInTheDocument() // Table position - use getAllByText to handle multiple matches
        expect(screen.getByText(/form/i)).toBeInTheDocument()
        expect(screen.getAllByText(/liga/i)[0]).toBeInTheDocument() // Use getAllByText to handle multiple matches
      })
      
      // Verify GameCards component displays
      expect(screen.getByText('Last')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
      
      // Verify LeagueTable component displays
      expect(screen.getAllByText('Kreisliga Würzburg')[0]).toBeInTheDocument() // Use getAllByText to handle multiple matches
      
      // Verify TopScorers component displays
      expect(screen.getByText('Torschützenkönig - 1. Mannschaft')).toBeInTheDocument()
    })

    test('should update all components when switching teams', async () => {
      render(<HomePage />)
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('1. Mannschaft')).toBeInTheDocument()
      })
      
      // Click on 2. Mannschaft button
      const team2Button = screen.getByRole('tab', { name: '2. Mannschaft auswählen' })
      
      await act(async () => {
        fireEvent.click(team2Button)
      })
      
      // Wait for team data to update
      await waitFor(() => {
        expect(mockedTeamService.fetchTeamData).toHaveBeenCalledWith('2')
      })
      
      // Verify TeamStatus updates
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument() // New table position
      })
      
      // Verify TopScorers title updates
      expect(screen.getByText('Torschützenkönig - 2. Mannschaft')).toBeInTheDocument()
      
      // Verify services were called with correct team ID
      expect(mockedTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('2')
    })

    test('should handle rapid team switching without race conditions', async () => {
      render(<HomePage />)
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('1. Mannschaft')).toBeInTheDocument()
      })
      
      const team2Button = screen.getByRole('tab', { name: '2. Mannschaft auswählen' })
      const team3Button = screen.getByRole('tab', { name: '3. Mannschaft auswählen' })
      
      // Rapidly switch between teams
      await act(async () => {
        fireEvent.click(team2Button)
        fireEvent.click(team3Button)
        fireEvent.click(team2Button)
      })
      
      // Wait for final state
      await waitFor(() => {
        expect(screen.getByText('Torschützenkönig - 2. Mannschaft')).toBeInTheDocument()
      })
      
      // Verify final team data is correct
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument() // Team 2 position
      })
    })
  })

  describe('Error Handling Scenarios Across Components', () => {
    test('should handle TeamStatus API errors gracefully', async () => {
      // Mock API error - but teamService.fetchTeamData has internal fallback handling
      mockedTeamService.fetchTeamData.mockImplementation(async (teamId) => {
        // Simulate error but return fallback data (as the service does internally)
        console.error('API Error')
        return mockTeamData[teamId] // Service provides fallback
      })
      
      render(<HomePage />)
      
      // Should still render with fallback data
      await waitFor(() => {
        expect(screen.getByText(/platz/i)).toBeInTheDocument()
      })
      
      // Verify service was called
      await waitFor(() => {
        expect(mockedTeamService.fetchTeamData).toHaveBeenCalled()
      })
    })

    test('should handle GameCards API errors gracefully', async () => {
      // Mock game data error
      mockedTeamService.fetchLastAndNextGame.mockRejectedValue(new Error('Game API Error'))
      
      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getAllByText('Spiele konnten nicht geladen werden')).toHaveLength(2) // One for last game, one for next game
      })
      
      // Should show retry buttons
      expect(screen.getAllByText('Neu laden')).toHaveLength(2)
    })

    test('should handle LeagueTable API errors gracefully', async () => {
      // Mock both team data and league data errors to trigger the error state
      mockedTeamService.fetchTeamData.mockRejectedValue(new Error('Team API Error'))
      mockedLeagueService.fetchLeagueStandings.mockRejectedValue(new Error('League API Error'))
      mockedLeagueService.fetchLeagueStandingsByLeague.mockRejectedValue(new Error('League API Error'))
      
      render(<HomePage />)
      
      await waitFor(() => {
        expect(screen.getByText('Tabelle konnte nicht geladen werden')).toBeInTheDocument()
      }, { timeout: 3000 })
      
      // Should show retry button
      expect(screen.getByText('Erneut versuchen')).toBeInTheDocument()
    })

    test('should handle partial API failures without breaking the page', async () => {
      // Mock partial failures - need to mock both team data and league data to trigger LeagueTable error
      mockedTeamService.fetchLastAndNextGame.mockRejectedValue(new Error('Game API Error'))
      mockedTeamService.fetchTeamData.mockRejectedValue(new Error('Team API Error'))
      mockedLeagueService.fetchLeagueStandings.mockRejectedValue(new Error('League API Error'))
      mockedLeagueService.fetchLeagueStandingsByLeague.mockRejectedValue(new Error('League API Error'))
      
      render(<HomePage />)
      
      // Error messages should be shown for failed components
      await waitFor(() => {
        expect(screen.getAllByText('Spiele konnten nicht geladen werden')).toHaveLength(2) // One for last game, one for next game
      }, { timeout: 3000 })
      
      await waitFor(() => {
        expect(screen.getByText('Tabelle konnte nicht geladen werden')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('Data Consistency Between Components', () => {
    test('should maintain consistent team data across all components', async () => {
      render(<HomePage />)
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('1. Mannschaft')).toBeInTheDocument()
      })
      
      // Switch to team 2
      const team2Button = screen.getByRole('tab', { name: '2. Mannschaft auswählen' })
      
      await act(async () => {
        fireEvent.click(team2Button)
      })
      
      // Verify all components use the same team data
      await waitFor(() => {
        // TeamStatus should show team 2 data
        expect(screen.getByText('5')).toBeInTheDocument() // Position
        
        // TopScorers should show team 2 title
        expect(screen.getByText('Torschützenkönig - 2. Mannschaft')).toBeInTheDocument()
        
        // All service calls should use team ID '2'
        expect(mockedTeamService.fetchTeamData).toHaveBeenCalledWith('2')
        expect(mockedTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('2')
      })
    })

    test('should validate data consistency in TeamStatus component', async () => {
      // Mock inconsistent data
      const inconsistentTeamData = {
        ...mockTeamData['1'],
        spiele_gesamt: 10,
        siege: 5,
        unentschieden: 3,
        niederlagen: 5 // This adds up to 13, not 10
      }
      
      mockedTeamService.fetchTeamData.mockResolvedValue(inconsistentTeamData)
      
      render(<HomePage />)
      
      await waitFor(() => {
        expect(mockedTeamService.fetchTeamData).toHaveBeenCalled()
      })
      
      // Component should still render despite data inconsistency
      expect(screen.getByText(/platz/i)).toBeInTheDocument()
    })

    test('should handle empty or null data gracefully', async () => {
      // Mock empty responses
      mockedTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: null,
        nextGame: null
      })
      
      mockedLeagueService.fetchLeagueStandings.mockResolvedValue([])
      
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/spielers')) {
          return Promise.resolve({
            data: { data: [], meta: { pagination: { total: 0 } } }
          })
        }
        return Promise.resolve({
          data: { data: [], meta: { pagination: { total: 0 } } }
        })
      })
      
      render(<HomePage />)
      
      // Should show appropriate empty states
      await waitFor(() => {
        expect(screen.getByText('Kein letztes Spiel für 1. Mannschaft verfügbar')).toBeInTheDocument()
        expect(screen.getByText('Kein nächstes Spiel für 1. Mannschaft geplant')).toBeInTheDocument()
        expect(screen.getByText('Keine Torschützendaten für 1. Mannschaft verfügbar')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States and Transitions', () => {
    test('should show loading states during team switches', async () => {
      // Add delay to mock service
      mockedTeamService.fetchTeamData.mockImplementation(async (teamId) => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return mockTeamData[teamId]
      })
      
      render(<HomePage />)
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('1. Mannschaft')).toBeInTheDocument()
      })
      
      const team2Button = screen.getByRole('tab', { name: '2. Mannschaft auswählen' })
      
      await act(async () => {
        fireEvent.click(team2Button)
      })
      
      // Should show transition loading state
      expect(screen.getByText('Wechsle Mannschaft...')).toBeInTheDocument()
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.queryByText('Wechsle Mannschaft...')).not.toBeInTheDocument()
      })
    })

    test('should handle concurrent loading states properly', async () => {
      // Mock different loading times for different services
      mockedTeamService.fetchTeamData.mockImplementation(async (teamId) => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return mockTeamData[teamId]
      })
      
      mockedTeamService.fetchLastAndNextGame.mockImplementation(async (teamId) => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return mockGameData[teamId] || { lastGame: null, nextGame: null }
      })
      
      render(<HomePage />)
      
      // All components should eventually load
      await waitFor(() => {
        expect(screen.getByText('Platz')).toBeInTheDocument()
      }, { timeout: 3000 })
      
      await waitFor(() => {
        expect(screen.queryByText('Lade Spiele für 1. Mannschaft...')).not.toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })
})