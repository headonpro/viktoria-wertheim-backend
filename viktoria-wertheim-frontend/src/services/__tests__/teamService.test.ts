/**
 * Unit tests for teamService
 * Note: These tests are designed to be run with a testing framework like Jest or Vitest
 * For now, they serve as documentation of expected behavior
 */

import { teamService } from '../teamService'
import { TeamData, GameDetails, TeamId } from '../../types/strapi'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock API responses
const mockMannschaftResponse = {
  data: {
    data: [{
      id: 1,
      attributes: {
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
        form_letzte_5: ['S', 'N', 'U', 'S', 'N'],
        trend: 'gleich',
        status: 'aktiv',
        trainer: 'Max Mustermann'
      }
    }]
  }
}

const mockSpielResponse = {
  data: {
    data: [{
      id: 1,
      attributes: {
        datum: '2024-01-15T15:00:00.000Z',
        heimmannschaft: {
          data: {
            attributes: { name: '1. Mannschaft' }
          }
        },
        auswaertsmannschaft: {
          data: {
            attributes: { name: 'FC Gegner' }
          }
        },
        tore_heim: 2,
        tore_auswaerts: 1,
        spielort: 'Viktoria-Stadion',
        schiedsrichter: 'Hans Mueller',
        status: 'beendet',
        torschuetzen: [
          { minute: 25, player: 'Max Mustermann', team: 'home' },
          { minute: 67, player: 'John Doe', team: 'home' },
          { minute: 89, player: 'Jane Smith', team: 'away' }
        ],
        gelbe_karten: [
          { minute: 45, player: 'Max Mustermann', team: 'home' }
        ],
        rote_karten: []
      }
    }]
  }
}

describe('TeamService', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockedAxios.get.mockClear()
  })

  describe('fetchTeamData', () => {
    test('should fetch team data successfully', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue(mockMannschaftResponse)
      
      // Act
      const result = await teamService.fetchTeamData('1')
      
      // Assert
      expect(result).toBeDefined()
      expect(result.name).toBe('1. Mannschaft')
      expect(result.liga).toBe('Kreisliga')
      expect(result.tabellenplatz).toBe(8)
      expect(result.punkte).toBe(24)
    })

    test('should return fallback data when API fails', async () => {
      // Arrange
      mockedAxios.get.mockRejectedValue(new Error('API Error'))
      
      // Act
      const result = await teamService.fetchTeamData('1')
      
      // Assert
      expect(result).toBeDefined()
      expect(result.name).toBe('1. Mannschaft')
      expect(result.liga).toBe('Kreisliga')
    })

    test('should return fallback data when no API data found', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue({ data: { data: [] } })
      
      // Act
      const result = await teamService.fetchTeamData('2')
      
      // Assert
      expect(result).toBeDefined()
      expect(result.name).toBe('2. Mannschaft')
      expect(result.liga).toBe('Kreisklasse A')
    })
  })

  describe('fetchTeamGames', () => {
    test('should fetch team games successfully', async () => {
      // Arrange
      mockedAxios.get.mockResolvedValue(mockSpielResponse)
      
      // Act
      const result = await teamService.fetchTeamGames('1')
      
      // Assert
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].homeTeam).toBe('1. Mannschaft')
      expect(result[0].awayTeam).toBe('FC Gegner')
    })

    test('should return empty array when API fails', async () => {
      // Arrange
      mockedAxios.get.mockRejectedValue(new Error('API Error'))
      
      // Act
      const result = await teamService.fetchTeamGames('1')
      
      // Assert
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(0)
    })
  })

  describe('calculateTeamStats', () => {
    test('should calculate team statistics correctly', () => {
      // Arrange
      const games: GameDetails[] = [
        {
          id: 1,
          type: 'last',
          homeTeam: '1. Mannschaft',
          awayTeam: 'FC Gegner',
          homeScore: 2,
          awayScore: 1,
          date: '2024-01-15',
          time: '15:00',
          isHome: true,
          stadium: 'Viktoria-Stadion',
          referee: 'Hans Mueller',
          status: 'beendet',
          goalScorers: [],
          yellowCards: [],
          redCards: []
        },
        {
          id: 2,
          type: 'last',
          homeTeam: 'FC Anderer',
          awayTeam: '1. Mannschaft',
          homeScore: 0,
          awayScore: 1,
          date: '2024-01-08',
          time: '15:00',
          isHome: false,
          stadium: 'Auswärts-Stadion',
          referee: 'Peter Schmidt',
          status: 'beendet',
          goalScorers: [],
          yellowCards: [],
          redCards: []
        }
      ]
      
      // Act
      const stats = teamService.calculateTeamStats(games, '1. Mannschaft')
      
      // Assert
      expect(stats.spiele_gesamt).toBe(2)
      expect(stats.siege).toBe(2)
      expect(stats.unentschieden).toBe(0)
      expect(stats.niederlagen).toBe(0)
      expect(stats.tore_fuer).toBe(3)
      expect(stats.tore_gegen).toBe(1)
      expect(stats.tordifferenz).toBe(2)
      expect(stats.punkte).toBe(6) // 2 wins * 3 points
    })
  })

  describe('generateFormArray', () => {
    test('should generate form array correctly', () => {
      // Arrange
      const games: GameDetails[] = [
        {
          id: 1,
          type: 'last',
          homeTeam: '1. Mannschaft',
          awayTeam: 'FC Gegner',
          homeScore: 2,
          awayScore: 1,
          date: '2024-01-15',
          time: '15:00',
          isHome: true,
          stadium: 'Viktoria-Stadion',
          referee: 'Hans Mueller',
          status: 'beendet',
          goalScorers: [],
          yellowCards: [],
          redCards: []
        },
        {
          id: 2,
          type: 'last',
          homeTeam: 'FC Anderer',
          awayTeam: '1. Mannschaft',
          homeScore: 1,
          awayScore: 1,
          date: '2024-01-08',
          time: '15:00',
          isHome: false,
          stadium: 'Auswärts-Stadion',
          referee: 'Peter Schmidt',
          status: 'beendet',
          goalScorers: [],
          yellowCards: [],
          redCards: []
        },
        {
          id: 3,
          type: 'last',
          homeTeam: '1. Mannschaft',
          awayTeam: 'FC Dritter',
          homeScore: 0,
          awayScore: 2,
          date: '2024-01-01',
          time: '15:00',
          isHome: true,
          stadium: 'Viktoria-Stadion',
          referee: 'Klaus Weber',
          status: 'beendet',
          goalScorers: [],
          yellowCards: [],
          redCards: []
        }
      ]
      
      // Act
      const form = teamService.generateFormArray(games, '1. Mannschaft', 3)
      
      // Assert
      expect(form).toBeDefined()
      expect(Array.isArray(form)).toBe(true)
      expect(form.length).toBe(3)
      expect(form[0]).toBe('S') // Most recent: Win
      expect(form[1]).toBe('U') // Second: Draw
      expect(form[2]).toBe('N') // Third: Loss
    })
  })

  describe('validateTeamData', () => {
    test('should validate correct team data', () => {
      // Arrange
      const validTeamData: TeamData = {
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
        form_letzte_5: ['S', 'N', 'U', 'S', 'N'],
        trend: 'gleich',
        status: 'aktiv'
      }
      
      // Act
      const isValid = teamService.validateTeamData(validTeamData)
      
      // Assert
      expect(isValid).toBe(true)
    })

    test('should reject invalid team data', () => {
      // Arrange
      const invalidTeamData: TeamData = {
        id: 1,
        name: '', // Invalid: empty name
        liga: 'Kreisliga',
        liga_vollname: 'Kreisliga Würzburg',
        tabellenplatz: 0, // Invalid: position < 1
        punkte: -5, // Invalid: negative points
        spiele_gesamt: 18,
        siege: 7,
        unentschieden: 3,
        niederlagen: 8,
        tore_fuer: 32,
        tore_gegen: 28,
        tordifferenz: 4,
        form_letzte_5: ['S', 'N', 'U', 'S', 'N'],
        trend: 'gleich',
        status: 'aktiv'
      }
      
      // Act
      const isValid = teamService.validateTeamData(invalidTeamData)
      
      // Assert
      expect(isValid).toBe(false)
    })
  })
})

// Export test suite for manual execution
export const runTeamServiceTests = () => {
  console.log('TeamService Tests')
  console.log('=================')
  
  // Test fallback data
  console.log('Testing fallback data...')
  const team1 = teamService.fetchTeamData('1')
  const team2 = teamService.fetchTeamData('2')
  const team3 = teamService.fetchTeamData('3')
  
  Promise.all([team1, team2, team3]).then(teams => {
    teams.forEach((team, index) => {
      console.log(`Team ${index + 1}:`, team.name, team.liga, team.tabellenplatz)
    })
  })
  
  // Test stats calculation
  console.log('Testing stats calculation...')
  const mockGames: GameDetails[] = [
    {
      id: 1,
      type: 'last',
      homeTeam: '1. Mannschaft',
      awayTeam: 'FC Test',
      homeScore: 2,
      awayScore: 1,
      date: '2024-01-15',
      time: '15:00',
      isHome: true,
      stadium: 'Test Stadium',
      referee: 'Test Referee',
      status: 'beendet',
      goalScorers: [],
      yellowCards: [],
      redCards: []
    }
  ]
  
  const stats = teamService.calculateTeamStats(mockGames, '1. Mannschaft')
  console.log('Calculated stats:', stats)
  
  const form = teamService.generateFormArray(mockGames, '1. Mannschaft')
  console.log('Generated form:', form)
  
  console.log('All tests completed!')
}