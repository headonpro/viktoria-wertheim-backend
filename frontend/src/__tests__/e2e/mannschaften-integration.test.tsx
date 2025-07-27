/**
 * Integration Tests für Mannschaftsspezifische Game Cards
 * 
 * Diese Tests simulieren den vollständigen User-Flow ohne echten Browser:
 * - Klick auf Mannschafts-Button → Korrekte Game Cards angezeigt
 * - Game Card Modal-Funktionalität für alle Mannschaften
 * - Design und Layout Konsistenz zwischen Mannschaften
 * 
 * Requirements: 1.1, 1.2, 1.3, 5.1, 5.2
 */

import React from 'react'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GameCards from '../../components/GameCards'
import TeamStatus from '../../components/TeamStatus'
import { teamService } from '../../services/teamService'
import { GameDetails, TeamData, TeamId } from '../../types/strapi'

// Mock teamService
jest.mock('../../services/teamService')
const mockedTeamService = teamService as jest.Mocked<typeof teamService>

// Mock Next.js dynamic imports
jest.mock('next/dynamic', () => {
  return function mockDynamic(importFunc: any) {
    const Component = importFunc()
    return Component.default || Component
  }
})

// Mock AnimatedSection components
jest.mock('../../components/AnimatedSection', () => {
  return {
    __esModule: true,
    default: ({ children, className }: any) => <div className={className}>{children}</div>,
    AnimatedDiv: ({ children, className }: any) => <div className={className}>{children}</div>
  }
})

// Mock createPortal for modals
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (children: React.ReactNode) => children
}))

describe('Mannschaftsspezifische Game Cards - Integration Tests', () => {
  const mockGameData: Record<TeamId, { lastGame: GameDetails | null; nextGame: GameDetails | null }> = {
    '1': {
      lastGame: {
        type: 'last',
        homeTeam: 'SV Viktoria Wertheim',
        awayTeam: 'FC Eichel',
        homeScore: 2,
        awayScore: 1,
        date: '15.01.',
        time: '15:00',
        isHome: true,
        stadium: 'Viktoria-Stadion',
        referee: 'Max Mustermann'
      },
      nextGame: {
        type: 'next',
        homeTeam: 'TSV Assamstadt',
        awayTeam: 'SV Viktoria Wertheim',
        date: '22.01.',
        time: '15:30',
        isHome: false,
        stadium: 'Assamstadt-Platz',
        referee: 'Hans Schmidt'
      }
    },
    '2': {
      lastGame: {
        type: 'last',
        homeTeam: 'SV Viktoria Wertheim II',
        awayTeam: 'TSV Kreuzwertheim',
        homeScore: 1,
        awayScore: 3,
        date: '14.01.',
        time: '13:00',
        isHome: true,
        stadium: 'Viktoria-Platz 2',
        referee: 'Peter Wagner'
      },
      nextGame: null
    },
    '3': {
      lastGame: null,
      nextGame: {
        type: 'next',
        homeTeam: 'SV Viktoria Wertheim III',
        awayTeam: 'SV Pülfringen',
        date: '23.01.',
        time: '11:00',
        isHome: true,
        stadium: 'Viktoria-Platz 3',
        referee: 'Klaus Müller'
      }
    }
  }

  const mockTeamData: Record<TeamId, TeamData> = {
    '1': {
      tabellenplatz: 3,
      liga: 'Kreisliga A',
      form_letzte_5: 'SSNSU',
      trend: 'steigend'
    },
    '2': {
      tabellenplatz: 8,
      liga: 'Kreisliga B',
      form_letzte_5: 'NNSNN',
      trend: 'fallend'
    },
    '3': {
      tabellenplatz: 5,
      liga: 'Kreisklasse A',
      form_letzte_5: 'SUSUN',
      trend: 'neutral'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup teamService mocks
    mockedTeamService.fetchLastAndNextGame.mockImplementation(async (teamId: TeamId) => {
      return mockGameData[teamId]
    })
    
    mockedTeamService.fetchTeamData.mockImplementation(async (teamId: TeamId) => {
      return mockTeamData[teamId]
    })
    
    mockedTeamService.validateTeamData.mockReturnValue(true)
  })

  describe('Vollständiger User-Flow für alle Mannschaften', () => {
    const IntegratedComponent = () => {
      const [selectedTeam, setSelectedTeam] = React.useState<TeamId>('1')
      
      return (
        <div>
          <TeamStatus selectedTeam={selectedTeam} onTeamChange={setSelectedTeam} />
          <GameCards selectedTeam={selectedTeam} />
        </div>
      )
    }

    test('1. Mannschaft - Vollständiger User Flow', async () => {
      const user = userEvent.setup()
      render(<IntegratedComponent />)
      
      // Warte auf initiale Ladung
      await waitFor(() => {
        expect(screen.getByTestId('team-status')).toBeInTheDocument()
        expect(screen.getByTestId('game-cards')).toBeInTheDocument()
      })
      
      // Verifiziere dass 1. Mannschaft standardmäßig ausgewählt ist
      const team1Button = screen.getByLabelText('1. Mannschaft auswählen')
      expect(team1Button).toHaveAttribute('aria-selected', 'true')
      
      // Verifiziere Game Cards für Team 1
      await waitFor(() => {
        expect(screen.getByTestId('last-game-card')).toBeInTheDocument()
        expect(screen.getByTestId('next-game-card')).toBeInTheDocument()
      })
      
      // Verifiziere Spiel-Daten
      expect(screen.getByText('SV Viktoria Wertheim')).toBeInTheDocument()
      expect(screen.getByText('FC Eichel')).toBeInTheDocument()
      expect(screen.getByText('2:1')).toBeInTheDocument()
      
      // Test Modal-Funktionalität
      const lastGameCard = screen.getByTestId('last-game-card')
      await user.click(lastGameCard)
      
      // Verifiziere Modal öffnet sich
      await waitFor(() => {
        expect(screen.getByLabelText('Modal schließen')).toBeInTheDocument()
      })
      
      // Schließe Modal
      const closeButton = screen.getByLabelText('Modal schließen')
      await user.click(closeButton)
      
      // Verifiziere Modal ist geschlossen
      await waitFor(() => {
        expect(screen.queryByLabelText('Modal schließen')).not.toBeInTheDocument()
      })
    })

    test('2. Mannschaft - Vollständiger User Flow', async () => {
      const user = userEvent.setup()
      render(<IntegratedComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('team-status')).toBeInTheDocument()
      })
      
      // Klick auf 2. Mannschaft
      const team2Button = screen.getByLabelText('2. Mannschaft auswählen')
      await user.click(team2Button)
      
      // Verifiziere Button-Status
      await waitFor(() => {
        expect(team2Button).toHaveAttribute('aria-selected', 'true')
      })
      
      // Verifiziere API-Aufruf für Team 2
      await waitFor(() => {
        expect(mockedTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('2')
      })
      
      // Verifiziere Game Cards für Team 2
      await waitFor(() => {
        expect(screen.getByTestId('last-game-card')).toBeInTheDocument()
        expect(screen.getByTestId('next-game-fallback')).toBeInTheDocument()
      })
      
      // Verifiziere spezifische Daten für Team 2
      expect(screen.getByText('SV Viktoria Wertheim II')).toBeInTheDocument()
      expect(screen.getByText('TSV Kreuzwertheim')).toBeInTheDocument()
      expect(screen.getByText('1:3')).toBeInTheDocument()
      
      // Verifiziere Fallback-Nachricht für nächstes Spiel
      expect(screen.getByText(/Kein nächstes Spiel.*2\. Mannschaft.*geplant/)).toBeInTheDocument()
    })

    test('3. Mannschaft - Vollständiger User Flow', async () => {
      const user = userEvent.setup()
      render(<IntegratedComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('team-status')).toBeInTheDocument()
      })
      
      // Klick auf 3. Mannschaft
      const team3Button = screen.getByLabelText('3. Mannschaft auswählen')
      await user.click(team3Button)
      
      // Verifiziere Button-Status
      await waitFor(() => {
        expect(team3Button).toHaveAttribute('aria-selected', 'true')
      })
      
      // Verifiziere API-Aufruf für Team 3
      await waitFor(() => {
        expect(mockedTeamService.fetchLastAndNextGame).toHaveBeenCalledWith('3')
      })
      
      // Verifiziere Game Cards für Team 3
      await waitFor(() => {
        expect(screen.getByTestId('last-game-fallback')).toBeInTheDocument()
        expect(screen.getByTestId('next-game-card')).toBeInTheDocument()
      })
      
      // Verifiziere Fallback-Nachricht für letztes Spiel
      expect(screen.getByText(/Kein letztes Spiel.*3\. Mannschaft.*verfügbar/)).toBeInTheDocument()
      
      // Verifiziere nächstes Spiel
      expect(screen.getByText('SV Viktoria Wertheim III')).toBeInTheDocument()
      expect(screen.getByText('SV Pülfringen')).toBeInTheDocument()
    })
  })

  describe('Game Card Modal-Funktionalität für alle Mannschaften', () => {
    test('Modal öffnet und schließt korrekt für alle Teams mit Daten', async () => {
      const user = userEvent.setup()
      const IntegratedComponent = () => {
        const [selectedTeam, setSelectedTeam] = React.useState<TeamId>('1')
        return <GameCards selectedTeam={selectedTeam} />
      }
      
      render(<IntegratedComponent />)
      
      // Warte auf Ladung
      await waitFor(() => {
        expect(screen.getByTestId('last-game-card')).toBeInTheDocument()
      })
      
      // Test Modal für Last Game
      const lastGameCard = screen.getByTestId('last-game-card')
      await user.click(lastGameCard)
      
      // Verifiziere Modal-Inhalt
      await waitFor(() => {
        expect(screen.getByLabelText('Modal schließen')).toBeInTheDocument()
        expect(screen.getByText('Viktoria-Stadion')).toBeInTheDocument()
        expect(screen.getByText('Max Mustermann')).toBeInTheDocument()
      })
      
      // Schließe Modal durch Klick außerhalb
      const modalBackdrop = screen.getByRole('dialog').parentElement
      if (modalBackdrop) {
        await user.click(modalBackdrop)
      }
      
      await waitFor(() => {
        expect(screen.queryByLabelText('Modal schließen')).not.toBeInTheDocument()
      })
    })

    test('Modal zeigt korrekte Daten für verschiedene Teams', async () => {
      const user = userEvent.setup()
      
      // Test mit Team 2 Daten
      render(<GameCards selectedTeam="2" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('last-game-card')).toBeInTheDocument()
      })
      
      const lastGameCard = screen.getByTestId('last-game-card')
      await user.click(lastGameCard)
      
      await waitFor(() => {
        expect(screen.getByText('Viktoria-Platz 2')).toBeInTheDocument()
        expect(screen.getByText('Peter Wagner')).toBeInTheDocument()
      })
    })
  })

  describe('Design und Layout Konsistenz', () => {
    test('Layout-Struktur bleibt konsistent zwischen Teams', async () => {
      const user = userEvent.setup()
      const IntegratedComponent = () => {
        const [selectedTeam, setSelectedTeam] = React.useState<TeamId>('1')
        return (
          <div>
            <TeamStatus selectedTeam={selectedTeam} onTeamChange={setSelectedTeam} />
            <GameCards selectedTeam={selectedTeam} />
          </div>
        )
      }
      
      render(<IntegratedComponent />)
      
      // Sammle Layout-Informationen für alle Teams
      const teams: TeamId[] = ['1', '2', '3']
      const layoutInfo = []
      
      for (const team of teams) {
        const teamButton = screen.getByLabelText(`${team}. Mannschaft auswählen`)
        await user.click(teamButton)
        
        await waitFor(() => {
          expect(teamButton).toHaveAttribute('aria-selected', 'true')
        })
        
        // Sammle Layout-Informationen
        const gameCardsContainer = screen.getByTestId('game-cards')
        const gridLayout = gameCardsContainer.querySelector('.grid.grid-cols-2')
        
        layoutInfo.push({
          team,
          hasGameCardsContainer: !!gameCardsContainer,
          hasGridLayout: !!gridLayout,
          gridClasses: gridLayout?.className || ''
        })
      }
      
      // Verifiziere Konsistenz
      const firstTeamLayout = layoutInfo[0]
      layoutInfo.forEach((layout, index) => {
        if (index > 0) {
          expect(layout.hasGameCardsContainer).toBe(firstTeamLayout.hasGameCardsContainer)
          expect(layout.hasGridLayout).toBe(firstTeamLayout.hasGridLayout)
          expect(layout.gridClasses).toBe(firstTeamLayout.gridClasses)
        }
      })
    })

    test('Fallback-Nachrichten sind mannschaftsspezifisch', async () => {
      const user = userEvent.setup()
      const IntegratedComponent = () => {
        const [selectedTeam, setSelectedTeam] = React.useState<TeamId>('1')
        return <GameCards selectedTeam={selectedTeam} />
      }
      
      render(<IntegratedComponent />)
      
      // Test Team 2 (hat kein nächstes Spiel)
      render(<GameCards selectedTeam="2" />)
      
      await waitFor(() => {
        expect(screen.getByText(/2\. Mannschaft.*geplant/)).toBeInTheDocument()
      })
      
      // Test Team 3 (hat kein letztes Spiel)
      render(<GameCards selectedTeam="3" />)
      
      await waitFor(() => {
        expect(screen.getByText(/3\. Mannschaft.*verfügbar/)).toBeInTheDocument()
      })
    })

    test('Card-Titel bleiben konsistent', async () => {
      render(<GameCards selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('last-game-card')).toBeInTheDocument()
        expect(screen.getByTestId('next-game-card')).toBeInTheDocument()
      })
      
      // Verifiziere Card-Titel
      const lastCardTitle = screen.getByTestId('last-game-card').querySelector('.text-sm')
      const nextCardTitle = screen.getByTestId('next-game-card').querySelector('.text-sm')
      
      expect(lastCardTitle?.textContent?.toUpperCase()).toBe('LAST')
      expect(nextCardTitle?.textContent?.toUpperCase()).toBe('NEXT')
    })
  })

  describe('Error Handling und Edge Cases', () => {
    test('Behandelt API-Fehler graceful', async () => {
      // Mock API-Fehler
      mockedTeamService.fetchLastAndNextGame.mockRejectedValue(new Error('API Error'))
      
      render(<GameCards selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('last-game-error')).toBeInTheDocument()
        expect(screen.getByTestId('next-game-error')).toBeInTheDocument()
      })
      
      // Verifiziere Error-Nachrichten
      expect(screen.getByText(/1\. Mannschaft.*nicht geladen/)).toBeInTheDocument()
    })

    test('Behandelt leere Daten korrekt', async () => {
      // Mock leere Daten
      mockedTeamService.fetchLastAndNextGame.mockResolvedValue({
        lastGame: null,
        nextGame: null
      })
      
      render(<GameCards selectedTeam="1" />)
      
      await waitFor(() => {
        expect(screen.getByTestId('last-game-fallback')).toBeInTheDocument()
        expect(screen.getByTestId('next-game-fallback')).toBeInTheDocument()
      })
      
      // Verifiziere Fallback-Nachrichten
      expect(screen.getByText(/Kein letztes Spiel.*1\. Mannschaft/)).toBeInTheDocument()
      expect(screen.getByText(/Kein nächstes Spiel.*1\. Mannschaft/)).toBeInTheDocument()
    })

    test('Schnelle Team-Wechsel funktionieren stabil', async () => {
      const user = userEvent.setup()
      const IntegratedComponent = () => {
        const [selectedTeam, setSelectedTeam] = React.useState<TeamId>('1')
        return (
          <div>
            <TeamStatus selectedTeam={selectedTeam} onTeamChange={setSelectedTeam} />
            <GameCards selectedTeam={selectedTeam} />
          </div>
        )
      }
      
      render(<IntegratedComponent />)
      
      await waitFor(() => {
        expect(screen.getByTestId('team-status')).toBeInTheDocument()
      })
      
      // Schnelle Team-Wechsel
      const teams: TeamId[] = ['2', '3', '1', '3', '2', '1']
      
      for (const team of teams) {
        const teamButton = screen.getByLabelText(`${team}. Mannschaft auswählen`)
        await user.click(teamButton)
        
        // Kurze Wartezeit für State-Update
        await waitFor(() => {
          expect(teamButton).toHaveAttribute('aria-selected', 'true')
        })
      }
      
      // Verifiziere dass finale Auswahl korrekt ist
      const finalButton = screen.getByLabelText('1. Mannschaft auswählen')
      expect(finalButton).toHaveAttribute('aria-selected', 'true')
    })
  })
})