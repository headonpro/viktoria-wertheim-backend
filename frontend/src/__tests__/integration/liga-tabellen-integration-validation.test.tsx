/**
 * Integration Testing und Validierung - Task 13
 * 
 * Comprehensive integration tests that validate:
 * - All three league tables with correct data
 * - Viktoria team highlighting in all leagues
 * - Team switching performance and data loading
 * 
 * Requirements: 2.1, 3.1, 4.1, 5.5
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import axios from 'axios'
import { leagueService } from '../../services/leagueService'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock API config
jest.mock('../../lib/apiConfig', () => ({
  getApiUrl: () => 'http://localhost:1337'
}))

// Mock Next.js components
jest.mock('next/dynamic', () => (fn: any) => {
  const Component = fn()
  return Component
})

jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
})

// Mock AnimatedSection
jest.mock('../../components/AnimatedSection', () => {
  return function MockAnimatedSection({ children }: { children: React.ReactNode }) {
    return <div data-testid="animated-section">{children}</div>
  }
})

// Create a comprehensive test component that simulates the full integration
const IntegrationTestComponent = () => {
  const [selectedTeam, setSelectedTeam] = React.useState<'1' | '2' | '3'>('1')
  const [teams, setTeams] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [leagueName, setLeagueName] = React.useState('')
  const [loadTime, setLoadTime] = React.useState<number>(0)

  const fetchLeagueData = React.useCallback(async (teamId: '1' | '2' | '3') => {
    const startTime = performance.now()
    setLoading(true)
    setError(null)
    
    try {
      // Get team info and league name
      const teamInfo = leagueService.getTeamInfo(teamId)
      setLeagueName(teamInfo.ligaName)
      
      // Fetch league standings
      const standings = await leagueService.fetchLeagueStandingsByTeam(teamId)
      setTeams(standings)
      
      const endTime = performance.now()
      setLoadTime(endTime - startTime)
    } catch (err: any) {
      setError(err.message || 'Failed to load league data')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchLeagueData(selectedTeam)
  }, [selectedTeam, fetchLeagueData])

  const handleTeamSwitch = (teamId: '1' | '2' | '3') => {
    setSelectedTeam(teamId)
  }

  return (
    <div data-testid="integration-test-component">
      {/* Team Selection */}
      <div data-testid="team-selector">
        <button
          onClick={() => handleTeamSwitch('1')}
          className={selectedTeam === '1' ? 'bg-viktoria-yellow' : 'bg-white/10'}
          data-testid="team-1-button"
        >
          1. Mannschaft
        </button>
        <button
          onClick={() => handleTeamSwitch('2')}
          className={selectedTeam === '2' ? 'bg-viktoria-yellow' : 'bg-white/10'}
          data-testid="team-2-button"
        >
          2. Mannschaft
        </button>
        <button
          onClick={() => handleTeamSwitch('3')}
          className={selectedTeam === '3' ? 'bg-viktoria-yellow' : 'bg-white/10'}
          data-testid="team-3-button"
        >
          3. Mannschaft
        </button>
      </div>

      {/* League Information */}
      <div data-testid="league-info">
        <h2 data-testid="league-name">{leagueName}</h2>
        <div data-testid="selected-team">Team: {selectedTeam}</div>
        <div data-testid="load-time">Load Time: {loadTime.toFixed(2)}ms</div>
      </div>

      {/* Loading State */}
      {loading && (
        <div data-testid="loading-state">
          <div>Tabelle wird geladen...</div>
          <div className="animate-pulse">Loading...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div data-testid="error-state" className="text-red-500">
          {error}
        </div>
      )}

      {/* League Table */}
      {!loading && !error && (
        <div data-testid="league-table">
          <div data-testid="team-count">Teams: {teams.length}</div>
          {teams.map((team, index) => {
            const isViktoria = leagueService.isViktoriaTeam(team.name, selectedTeam)
            return (
              <div
                key={index}
                data-testid={`team-row-${index}`}
                className={isViktoria ? 'bg-viktoria-yellow viktoria-team' : 'regular-team'}
              >
                <span data-testid={`team-position-${index}`}>{team.position}.</span>
                <span data-testid={`team-name-${index}`}>{team.name}</span>
                <span data-testid={`team-points-${index}`}>{team.points}</span>
                <span data-testid={`team-games-${index}`}>{team.games}</span>
                <span data-testid={`team-goals-${index}`}>{team.goalsFor}:{team.goalsAgainst}</span>
                {isViktoria && <span data-testid={`viktoria-indicator-${index}`}>VIKTORIA</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

describe('Liga-Tabellen Integration Testing und Validierung', () => {
  // Mock data for all three leagues
  const mockLeagueData = {
    kreisliga: [
      {
        id: 1,
        documentId: 'viktoria-1',
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
        liga: { id: 1, documentId: 'kreisliga', name: 'Kreisliga Tauberbischofsheim' }
      },
      {
        id: 2,
        documentId: 'gerlachsheim',
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
        liga: { id: 1, documentId: 'kreisliga', name: 'Kreisliga Tauberbischofsheim' }
      },
      {
        id: 3,
        documentId: 'kreuzwertheim',
        team_name: 'TSV Jahn Kreuzwertheim',
        platz: 3,
        spiele: 18,
        siege: 9,
        unentschieden: 6,
        niederlagen: 3,
        tore_fuer: 32,
        tore_gegen: 20,
        tordifferenz: 12,
        punkte: 33,
        liga: { id: 1, documentId: 'kreisliga', name: 'Kreisliga Tauberbischofsheim' }
      }
    ],
    kreisklasseA: [
      {
        id: 4,
        documentId: 'unterschuepf',
        team_name: 'TSV Unterschüpf',
        platz: 1,
        spiele: 14,
        siege: 10,
        unentschieden: 3,
        niederlagen: 1,
        tore_fuer: 35,
        tore_gegen: 12,
        tordifferenz: 23,
        punkte: 33,
        liga: { id: 2, documentId: 'kreisklasse-a', name: 'Kreisklasse A Tauberbischofsheim' }
      },
      {
        id: 5,
        documentId: 'nassig-2',
        team_name: 'SV Nassig II',
        platz: 2,
        spiele: 14,
        siege: 8,
        unentschieden: 4,
        niederlagen: 2,
        tore_fuer: 28,
        tore_gegen: 15,
        tordifferenz: 13,
        punkte: 28,
        liga: { id: 2, documentId: 'kreisklasse-a', name: 'Kreisklasse A Tauberbischofsheim' }
      },
      {
        id: 6,
        documentId: 'viktoria-2',
        team_name: 'SV Viktoria Wertheim II',
        platz: 5,
        spiele: 14,
        siege: 6,
        unentschieden: 4,
        niederlagen: 4,
        tore_fuer: 22,
        tore_gegen: 18,
        tordifferenz: 4,
        punkte: 22,
        liga: { id: 2, documentId: 'kreisklasse-a', name: 'Kreisklasse A Tauberbischofsheim' }
      }
    ],
    kreisklasseB: [
      {
        id: 7,
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
        liga: { id: 3, documentId: 'kreisklasse-b', name: 'Kreisklasse B Tauberbischofsheim' }
      },
      {
        id: 8,
        documentId: 'hundheim-2',
        team_name: 'FC Hundheim-Steinbach 2',
        platz: 1,
        spiele: 0,
        siege: 0,
        unentschieden: 0,
        niederlagen: 0,
        tore_fuer: 0,
        tore_gegen: 0,
        tordifferenz: 0,
        punkte: 0,
        liga: { id: 3, documentId: 'kreisklasse-b', name: 'Kreisklasse B Tauberbischofsheim' }
      },
      {
        id: 9,
        documentId: 'eichel-2',
        team_name: 'FC Wertheim-Eichel 2',
        platz: 1,
        spiele: 0,
        siege: 0,
        unentschieden: 0,
        niederlagen: 0,
        tore_fuer: 0,
        tore_gegen: 0,
        tordifferenz: 0,
        punkte: 0,
        liga: { id: 3, documentId: 'kreisklasse-b', name: 'Kreisklasse B Tauberbischofsheim' }
      }
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup axios mock to return appropriate data based on league filter
    mockedAxios.get.mockImplementation((url, config) => {
      const ligaFilter = config?.params?.['filters[liga][name][$eq]']
      
      let data: any[] = []
      if (ligaFilter === 'Kreisliga Tauberbischofsheim') {
        data = mockLeagueData.kreisliga
      } else if (ligaFilter === 'Kreisklasse A Tauberbischofsheim') {
        data = mockLeagueData.kreisklasseA
      } else if (ligaFilter === 'Kreisklasse B Tauberbischofsheim') {
        data = mockLeagueData.kreisklasseB
      }

      return Promise.resolve({
        data: {
          data: data,
          meta: {
            pagination: {
              page: 1,
              pageSize: 100,
              pageCount: 1,
              total: data.length
            }
          }
        }
      })
    })
  })

  describe('Requirement 2.1: Kreisliga Tauberbischofsheim Tabelle', () => {
    it('should display correct Kreisliga table when team 1 is selected', async () => {
      render(<IntegrationTestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisliga Tauberbischofsheim')
        expect(screen.getByTestId('team-count')).toHaveTextContent('Teams: 3')
      })

      // Verify API call
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:1337/api/tabellen-eintraege',
        expect.objectContaining({
          params: expect.objectContaining({
            'filters[liga][name][$eq]': 'Kreisliga Tauberbischofsheim'
          })
        })
      )

      // Verify team data
      expect(screen.getByTestId('team-name-0')).toHaveTextContent('SV Viktoria Wertheim')
      expect(screen.getByTestId('team-position-0')).toHaveTextContent('1.')
      expect(screen.getByTestId('team-points-0')).toHaveTextContent('40')
      
      expect(screen.getByTestId('team-name-1')).toHaveTextContent('VfR Gerlachsheim')
      expect(screen.getByTestId('team-position-1')).toHaveTextContent('2.')
      expect(screen.getByTestId('team-points-1')).toHaveTextContent('35')
    })

    it('should highlight SV Viktoria Wertheim in Kreisliga', async () => {
      render(<IntegrationTestComponent />)

      await waitFor(() => {
        const viktoriaRow = screen.getByTestId('team-row-0')
        expect(viktoriaRow).toHaveClass('viktoria-team')
        expect(viktoriaRow).toHaveClass('bg-viktoria-yellow')
        expect(screen.getByTestId('viktoria-indicator-0')).toBeInTheDocument()
      })

      // Verify other teams are not highlighted
      const gerlachsheimRow = screen.getByTestId('team-row-1')
      expect(gerlachsheimRow).toHaveClass('regular-team')
      expect(gerlachsheimRow).not.toHaveClass('bg-viktoria-yellow')
    })
  })

  describe('Requirement 3.1: Kreisklasse A Tauberbischofsheim Tabelle', () => {
    it('should display correct Kreisklasse A table when team 2 is selected', async () => {
      render(<IntegrationTestComponent />)

      // Switch to team 2
      fireEvent.click(screen.getByTestId('team-2-button'))

      await waitFor(() => {
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse A Tauberbischofsheim')
        expect(screen.getByTestId('team-count')).toHaveTextContent('Teams: 3')
      })

      // Verify API call
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:1337/api/tabellen-eintraege',
        expect.objectContaining({
          params: expect.objectContaining({
            'filters[liga][name][$eq]': 'Kreisklasse A Tauberbischofsheim'
          })
        })
      )

      // Verify team data
      expect(screen.getByTestId('team-name-0')).toHaveTextContent('TSV Unterschüpf')
      expect(screen.getByTestId('team-position-0')).toHaveTextContent('1.')
      
      expect(screen.getByTestId('team-name-2')).toHaveTextContent('SV Viktoria Wertheim II')
      expect(screen.getByTestId('team-position-2')).toHaveTextContent('5.')
      expect(screen.getByTestId('team-points-2')).toHaveTextContent('22')
    })

    it('should highlight SV Viktoria Wertheim II in Kreisklasse A', async () => {
      render(<IntegrationTestComponent />)

      // Switch to team 2
      fireEvent.click(screen.getByTestId('team-2-button'))

      await waitFor(() => {
        const viktoriaRow = screen.getByTestId('team-row-2')
        expect(viktoriaRow).toHaveClass('viktoria-team')
        expect(viktoriaRow).toHaveClass('bg-viktoria-yellow')
        expect(screen.getByTestId('viktoria-indicator-2')).toBeInTheDocument()
      })

      // Verify other teams are not highlighted
      const unterschuepfRow = screen.getByTestId('team-row-0')
      expect(unterschuepfRow).toHaveClass('regular-team')
      expect(unterschuepfRow).not.toHaveClass('bg-viktoria-yellow')
    })
  })

  describe('Requirement 4.1: Kreisklasse B Tauberbischofsheim Tabelle', () => {
    it('should display correct Kreisklasse B table when team 3 is selected', async () => {
      render(<IntegrationTestComponent />)

      // Switch to team 3
      fireEvent.click(screen.getByTestId('team-3-button'))

      await waitFor(() => {
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse B Tauberbischofsheim')
        expect(screen.getByTestId('team-count')).toHaveTextContent('Teams: 3')
      })

      // Verify API call
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://localhost:1337/api/tabellen-eintraege',
        expect.objectContaining({
          params: expect.objectContaining({
            'filters[liga][name][$eq]': 'Kreisklasse B Tauberbischofsheim'
          })
        })
      )

      // Verify all teams are at position 1 (season start)
      expect(screen.getByTestId('team-position-0')).toHaveTextContent('1.')
      expect(screen.getByTestId('team-position-1')).toHaveTextContent('1.')
      expect(screen.getByTestId('team-position-2')).toHaveTextContent('1.')

      // Verify all statistics are 0
      expect(screen.getByTestId('team-points-0')).toHaveTextContent('0')
      expect(screen.getByTestId('team-games-0')).toHaveTextContent('0')
      expect(screen.getByTestId('team-goals-0')).toHaveTextContent('0:0')
    })

    it('should highlight SpG Vikt. Wertheim 3/Grünenwort in Kreisklasse B', async () => {
      render(<IntegrationTestComponent />)

      // Switch to team 3
      fireEvent.click(screen.getByTestId('team-3-button'))

      await waitFor(() => {
        const viktoriaRow = screen.getByTestId('team-row-0')
        expect(viktoriaRow).toHaveClass('viktoria-team')
        expect(viktoriaRow).toHaveClass('bg-viktoria-yellow')
        expect(screen.getByTestId('viktoria-indicator-0')).toBeInTheDocument()
      })

      // Verify other teams are not highlighted
      const hundheimRow = screen.getByTestId('team-row-1')
      expect(hundheimRow).toHaveClass('regular-team')
      expect(hundheimRow).not.toHaveClass('bg-viktoria-yellow')
    })
  })

  describe('Requirement 5.5: Team Switching Performance and Data Loading', () => {
    it('should switch between all three teams efficiently', async () => {
      render(<IntegrationTestComponent />)

      // Initial load (team 1)
      await waitFor(() => {
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisliga Tauberbischofsheim')
        expect(screen.getByTestId('selected-team')).toHaveTextContent('Team: 1')
      })

      const initialLoadTime = parseFloat(screen.getByTestId('load-time').textContent?.match(/[\d.]+/)?.[0] || '0')
      expect(initialLoadTime).toBeGreaterThan(0)

      // Switch to team 2
      act(() => {
        fireEvent.click(screen.getByTestId('team-2-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse A Tauberbischofsheim')
        expect(screen.getByTestId('selected-team')).toHaveTextContent('Team: 2')
        expect(screen.getByTestId('team-2-button')).toHaveClass('bg-viktoria-yellow')
      })

      // Switch to team 3
      act(() => {
        fireEvent.click(screen.getByTestId('team-3-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse B Tauberbischofsheim')
        expect(screen.getByTestId('selected-team')).toHaveTextContent('Team: 3')
        expect(screen.getByTestId('team-3-button')).toHaveClass('bg-viktoria-yellow')
      })

      // Switch back to team 1
      act(() => {
        fireEvent.click(screen.getByTestId('team-1-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisliga Tauberbischofsheim')
        expect(screen.getByTestId('selected-team')).toHaveTextContent('Team: 1')
        expect(screen.getByTestId('team-1-button')).toHaveClass('bg-viktoria-yellow')
      })

      // Verify all API calls were made
      expect(mockedAxios.get).toHaveBeenCalledTimes(4) // Initial + 3 switches
    })

    it('should show loading states during team switches', async () => {
      // Mock delayed response
      mockedAxios.get.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            data: {
              data: mockLeagueData.kreisliga,
              meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 3 } }
            }
          }), 100)
        )
      )

      render(<IntegrationTestComponent />)

      // Should show loading state initially
      expect(screen.getByTestId('loading-state')).toBeInTheDocument()
      expect(screen.getByText('Tabelle wird geladen...')).toBeInTheDocument()

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument()
        expect(screen.getByTestId('league-table')).toBeInTheDocument()
      })
    })

    it('should handle rapid team switching without race conditions', async () => {
      render(<IntegrationTestComponent />)

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisliga Tauberbischofsheim')
      })

      // Rapidly switch between teams
      act(() => {
        fireEvent.click(screen.getByTestId('team-2-button'))
        fireEvent.click(screen.getByTestId('team-3-button'))
        fireEvent.click(screen.getByTestId('team-1-button'))
      })

      // Final state should be team 1
      await waitFor(() => {
        expect(screen.getByTestId('selected-team')).toHaveTextContent('Team: 1')
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisliga Tauberbischofsheim')
        expect(screen.getByTestId('team-1-button')).toHaveClass('bg-viktoria-yellow')
      })
    })

    it('should measure and report load times', async () => {
      render(<IntegrationTestComponent />)

      await waitFor(() => {
        const loadTimeText = screen.getByTestId('load-time').textContent
        expect(loadTimeText).toMatch(/Load Time: \d+\.\d+ms/)
        
        const loadTime = parseFloat(loadTimeText?.match(/[\d.]+/)?.[0] || '0')
        expect(loadTime).toBeGreaterThan(0)
        expect(loadTime).toBeLessThan(1000) // Should be under 1 second
      })
    })
  })

  describe('Error Handling and Resilience', () => {
    it('should handle API errors gracefully', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))

      render(<IntegrationTestComponent />)

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument()
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })

      // Should not show league table when there's an error
      expect(screen.queryByTestId('league-table')).not.toBeInTheDocument()
    })

    it('should recover from errors when switching teams', async () => {
      // First call fails, subsequent calls succeed
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({
          data: {
            data: mockLeagueData.kreisklasseA,
            meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 3 } }
          }
        })

      render(<IntegrationTestComponent />)

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument()
      })

      // Switch to team 2 - should recover
      act(() => {
        fireEvent.click(screen.getByTestId('team-2-button'))
      })

      await waitFor(() => {
        expect(screen.queryByTestId('error-state')).not.toBeInTheDocument()
        expect(screen.getByTestId('league-table')).toBeInTheDocument()
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse A Tauberbischofsheim')
      })
    })
  })

  describe('Data Consistency Validation', () => {
    it('should maintain consistent Viktoria team highlighting across all leagues', async () => {
      render(<IntegrationTestComponent />)

      // Test team 1 highlighting
      await waitFor(() => {
        expect(screen.getByTestId('team-name-0')).toHaveTextContent('SV Viktoria Wertheim')
        expect(screen.getByTestId('viktoria-indicator-0')).toBeInTheDocument()
      })

      // Switch to team 2
      act(() => {
        fireEvent.click(screen.getByTestId('team-2-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('team-name-2')).toHaveTextContent('SV Viktoria Wertheim II')
        expect(screen.getByTestId('viktoria-indicator-2')).toBeInTheDocument()
      })

      // Switch to team 3
      act(() => {
        fireEvent.click(screen.getByTestId('team-3-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('team-name-0')).toHaveTextContent('SpG Vikt. Wertheim 3/Grünenwort')
        expect(screen.getByTestId('viktoria-indicator-0')).toBeInTheDocument()
      })
    })

    it('should validate correct league-to-team mappings', async () => {
      render(<IntegrationTestComponent />)

      // Verify team 1 -> Kreisliga mapping
      await waitFor(() => {
        expect(screen.getByTestId('selected-team')).toHaveTextContent('Team: 1')
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisliga Tauberbischofsheim')
      })

      // Verify team 2 -> Kreisklasse A mapping
      act(() => {
        fireEvent.click(screen.getByTestId('team-2-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('selected-team')).toHaveTextContent('Team: 2')
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse A Tauberbischofsheim')
      })

      // Verify team 3 -> Kreisklasse B mapping
      act(() => {
        fireEvent.click(screen.getByTestId('team-3-button'))
      })

      await waitFor(() => {
        expect(screen.getByTestId('selected-team')).toHaveTextContent('Team: 3')
        expect(screen.getByTestId('league-name')).toHaveTextContent('Kreisklasse B Tauberbischofsheim')
      })
    })

    it('should validate data integrity across team switches', async () => {
      render(<IntegrationTestComponent />)

      // Collect data from all three teams
      const teamData: Record<string, any> = {}

      // Team 1
      await waitFor(() => {
        teamData['1'] = {
          league: screen.getByTestId('league-name').textContent,
          teamCount: screen.getByTestId('team-count').textContent,
          viktoriaTeam: screen.getByTestId('team-name-0').textContent
        }
      })

      // Team 2
      act(() => {
        fireEvent.click(screen.getByTestId('team-2-button'))
      })

      await waitFor(() => {
        teamData['2'] = {
          league: screen.getByTestId('league-name').textContent,
          teamCount: screen.getByTestId('team-count').textContent,
          viktoriaTeam: screen.getByTestId('team-name-2').textContent
        }
      })

      // Team 3
      act(() => {
        fireEvent.click(screen.getByTestId('team-3-button'))
      })

      await waitFor(() => {
        teamData['3'] = {
          league: screen.getByTestId('league-name').textContent,
          teamCount: screen.getByTestId('team-count').textContent,
          viktoriaTeam: screen.getByTestId('team-name-0').textContent
        }
      })

      // Validate data integrity
      expect(teamData['1'].league).toBe('Kreisliga Tauberbischofsheim')
      expect(teamData['1'].viktoriaTeam).toBe('SV Viktoria Wertheim')
      
      expect(teamData['2'].league).toBe('Kreisklasse A Tauberbischofsheim')
      expect(teamData['2'].viktoriaTeam).toBe('SV Viktoria Wertheim II')
      
      expect(teamData['3'].league).toBe('Kreisklasse B Tauberbischofsheim')
      expect(teamData['3'].viktoriaTeam).toBe('SpG Vikt. Wertheim 3/Grünenwort')
    })
  })
})