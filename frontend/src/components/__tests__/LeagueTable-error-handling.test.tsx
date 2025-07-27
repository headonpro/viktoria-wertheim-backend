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

describe('LeagueTable Error Handling', () => {
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
    
    mockedLeagueService.isViktoriaTeam.mockReturnValue(false)
  })

  describe('Network Error Handling', () => {
    it('should display network error with retry button', async () => {
      const networkError = {
        type: 'network' as const,
        message: 'Netzwerkfehler - Bitte Internetverbindung prüfen',
        retryable: true
      }
      
      mockedLeagueService.fetchLeagueStandingsByTeam.mockRejectedValue(networkError)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Verbindungsfehler')).toBeInTheDocument()
        expect(screen.getByText('Netzwerkfehler - Bitte Internetverbindung prüfen')).toBeInTheDocument()
        expect(screen.getByText('Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.')).toBeInTheDocument()
        expect(screen.getByText('🌐')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument()
      })
    })

    it('should retry on button click for network errors', async () => {
      const networkError = {
        type: 'network' as const,
        message: 'Netzwerkfehler - Bitte Internetverbindung prüfen',
        retryable: true
      }
      
      mockedLeagueService.fetchLeagueStandingsByTeam.mockRejectedValueOnce(networkError)
      mockedLeagueService.fetchLeagueStandingsByTeamWithRetry.mockResolvedValueOnce([
        {
          position: 1,
          name: 'SV Viktoria Wertheim',
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
        expect(screen.getByText('Verbindungsfehler')).toBeInTheDocument()
      })
      
      const retryButton = screen.getByRole('button', { name: 'Erneut versuchen' })
      fireEvent.click(retryButton)
      
      await waitFor(() => {
        expect(mockedLeagueService.fetchLeagueStandingsByTeamWithRetry).toHaveBeenCalledWith('1', 2)
        expect(screen.getByText('SV Viktoria Wertheim')).toBeInTheDocument()
      })
    })
  })

  describe('Timeout Error Handling', () => {
    it('should display timeout error with appropriate message', async () => {
      const timeoutError = {
        type: 'timeout' as const,
        message: 'Zeitüberschreitung beim Laden der Tabellendaten',
        retryable: true
      }
      
      mockedLeagueService.fetchLeagueStandingsByTeam.mockRejectedValue(timeoutError)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Zeitüberschreitung')).toBeInTheDocument()
        expect(screen.getByText('Zeitüberschreitung beim Laden der Tabellendaten')).toBeInTheDocument()
        expect(screen.getByText('Die Anfrage dauerte zu lange. Versuchen Sie es in einem Moment erneut.')).toBeInTheDocument()
        expect(screen.getByText('⏱️')).toBeInTheDocument()
      })
    })
  })

  describe('Server Error Handling', () => {
    it('should display server error with appropriate message', async () => {
      const serverError = {
        type: 'server' as const,
        message: 'Serverfehler - Bitte später erneut versuchen',
        retryable: true
      }
      
      mockedLeagueService.fetchLeagueStandingsByTeam.mockRejectedValue(serverError)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Serverfehler')).toBeInTheDocument()
        expect(screen.getByText('Serverfehler - Bitte später erneut versuchen')).toBeInTheDocument()
        expect(screen.getByText('Temporärer Serverfehler. Das Problem wird normalerweise automatisch behoben.')).toBeInTheDocument()
        expect(screen.getByText('🔧')).toBeInTheDocument()
      })
    })
  })

  describe('Not Found Error Handling', () => {
    it('should display not found error without retry button', async () => {
      const notFoundError = {
        type: 'not_found' as const,
        message: 'Liga "Nonexistent Liga" wurde nicht gefunden',
        retryable: false
      }
      
      mockedLeagueService.fetchLeagueStandingsByTeam.mockRejectedValue(notFoundError)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Liga nicht gefunden')).toBeInTheDocument()
        expect(screen.getByText('Liga "Nonexistent Liga" wurde nicht gefunden')).toBeInTheDocument()
        expect(screen.getByText('Dieser Fehler kann nicht automatisch behoben werden.')).toBeInTheDocument()
        expect(screen.getByText('🔍')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'Erneut versuchen' })).not.toBeInTheDocument()
      })
    })
  })

  describe('Empty State Handling', () => {
    it('should display empty state for team 1', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue([])
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Keine Tabellendaten verfügbar')).toBeInTheDocument()
        expect(screen.getByText('Für die Kreisliga Tauberbischofsheim sind derzeit keine Tabellendaten verfügbar.')).toBeInTheDocument()
        expect(screen.getByText('Die Saison hat noch nicht begonnen')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Erneut laden' })).toBeInTheDocument()
      })
    })

    it('should display empty state for team 2', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue([])
      
      render(<LeagueTable selectedTeam="2" />)
      
      await waitFor(() => {
        expect(screen.getByText('Für die Kreisklasse A Tauberbischofsheim sind derzeit keine Tabellendaten verfügbar.')).toBeInTheDocument()
      })
    })

    it('should display empty state for team 3', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue([])
      
      render(<LeagueTable selectedTeam="3" />)
      
      await waitFor(() => {
        expect(screen.getByText('Für die Kreisklasse B Tauberbischofsheim sind derzeit keine Tabellendaten verfügbar.')).toBeInTheDocument()
      })
    })
  })

  describe('Fallback Mode', () => {
    it('should display fallback indicator when in fallback mode', async () => {
      mockedLeagueService.getTeamInfo.mockReturnValue({
        ligaName: 'Kreisliga Tauberbischofsheim',
        teamName: 'SV Viktoria Wertheim',
        isFallback: true
      })
      
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue([])
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByText('⚠️ Fallback-Modus aktiv')).toBeInTheDocument()
      })
    })

    it('should not display fallback indicator in normal mode', async () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockResolvedValue([
        {
          position: 1,
          name: 'SV Viktoria Wertheim',
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
        expect(screen.queryByText('⚠️ Fallback-Modus aktiv')).not.toBeInTheDocument()
        expect(screen.getByText('SV Viktoria Wertheim')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should display loading state initially', () => {
      mockedLeagueService.fetchLeagueStandingsByTeam.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )
      
      render(<LeagueTable selectedTeam="1" />)
      
      expect(screen.getByText('Tabelle wird geladen...')).toBeInTheDocument()
      expect(screen.getAllByRole('generic').some(el => 
        el.className.includes('animate-pulse')
      )).toBe(true)
    })
  })

  describe('Retry Count Display', () => {
    it('should display retry count after retries', async () => {
      const networkError = {
        type: 'network' as const,
        message: 'Netzwerkfehler - Bitte Internetverbindung prüfen',
        retryable: true
      }
      
      mockedLeagueService.fetchLeagueStandingsByTeam.mockRejectedValue(networkError)
      mockedLeagueService.fetchLeagueStandingsByTeamWithRetry.mockRejectedValue(networkError)
      
      render(<LeagueTable selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByText('Verbindungsfehler')).toBeInTheDocument()
      })
      
      // Click retry button
      const retryButton = screen.getByRole('button', { name: 'Erneut versuchen' })
      fireEvent.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByText('Versuche: 1')).toBeInTheDocument()
      })
    })
  })
})