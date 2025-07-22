import { strapi, apiRequest, API_ENDPOINTS } from './strapi'
import { AuthService } from './auth'

export interface PlayerStats {
  tore_saison: number
  spiele_saison: number
  position: string
  rueckennummer?: number
  foto?: {
    data: {
      id: number
      attributes: {
        url: string
        alternativeText?: string
      }
    }
  }
}

export interface TrainingSession {
  id: number
  attributes: {
    titel: string
    datum: string
    dauer: number
    ort: string
    beschreibung?: string
    trainingsziel?: string
    status: 'geplant' | 'laufend' | 'abgeschlossen' | 'abgesagt'
    wetter?: string
    notizen?: string
    trainer?: {
      data: {
        id: number
        attributes: {
          vorname: string
          nachname: string
        }
      }
    }
    teilnehmer?: {
      data: Array<{
        id: number
        attributes: {
          vorname: string
          nachname: string
        }
      }>
    }
    abwesende?: {
      data: Array<{
        id: number
        attributes: {
          vorname: string
          nachname: string
        }
      }>
    }
  }
}

export interface Game {
  id: number
  attributes: {
    datum: string
    heimmannschaft: string
    auswaertsmannschaft: string
    toreHeim?: number
    toreAuswaerts?: number
    spielort: string
    liga?: string
    isHeimspiel: boolean
    spielstatus: 'geplant' | 'live' | 'beendet' | 'abgesagt'
  }
}

export interface TeamInfo {
  id: number
  attributes: {
    name: string
    liga?: string
    trainer?: string
    teamfoto?: {
      data: {
        id: number
        attributes: {
          url: string
          alternativeText?: string
        }
      }
    }
  }
}

export class PlayerApiService {
  
  // Get player data by member ID
  static async getPlayerByMemberId(memberId: number): Promise<any> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      const response = await strapi.get(API_ENDPOINTS.spieler.byTeam(0), {
        params: {
          filters: {
            mitglied: {
              id: {
                $eq: memberId
              }
            }
          },
          populate: {
            foto: true,
            mannschaft: {
              populate: ['teamfoto']
            },
            mitglied: true
          }
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data?.data?.[0] || null
    } catch (error) {
      console.error('Error fetching player data:', error)
      throw error
    }
  }

  // Get player statistics
  static async getPlayerStats(playerId: number): Promise<PlayerStats> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      const response = await strapi.get(API_ENDPOINTS.spieler.stats(playerId), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data
    } catch (error) {
      console.error('Error fetching player stats:', error)
      throw error
    }
  }

  // Get training sessions for a team
  static async getTrainingSessions(teamId: number, limit = 10): Promise<TrainingSession[]> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      const response = await strapi.get(API_ENDPOINTS.training.byTeam(teamId), {
        params: {
          limit: limit
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data || []
    } catch (error) {
      console.error('Error fetching training sessions:', error)
      throw error
    }
  }

  // Get upcoming training sessions
  static async getUpcomingTrainingSessions(teamId?: number): Promise<TrainingSession[]> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      let endpoint = API_ENDPOINTS.training.upcoming
      let params: any = {}

      if (teamId) {
        params.teamId = teamId
      }

      const response = await strapi.get(endpoint, {
        params,
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data || []
    } catch (error) {
      console.error('Error fetching upcoming training sessions:', error)
      throw error
    }
  }

  // Get games for a team (placeholder - no games content type yet)
  static async getTeamGames(teamId: number, limit = 10): Promise<Game[]> {
    // TODO: Implement when games content type is created
    console.warn('Games content type not implemented yet')
    return []
  }

  // Get upcoming games (placeholder)
  static async getUpcomingGames(teamId: number): Promise<Game[]> {
    // TODO: Implement when games content type is created
    console.warn('Games content type not implemented yet')
    return []
  }

  // Register for training session
  static async registerForTraining(trainingId: number, memberId: number): Promise<void> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      await strapi.post(API_ENDPOINTS.training.attendance(trainingId), {
        action: 'register',
        memberId: memberId
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('Error registering for training:', error)
      throw error
    }
  }

  // Mark as absent for training session
  static async markAbsentForTraining(trainingId: number, memberId: number): Promise<void> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      await strapi.post(API_ENDPOINTS.training.attendance(trainingId), {
        action: 'absent',
        memberId: memberId
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('Error marking absent for training:', error)
      throw error
    }
  }

  // Get player training attendance statistics
  static async getPlayerTrainingStats(memberId: number, teamId: number): Promise<{
    totalSessions: number
    attended: number
    missed: number
    attendanceRate: number
  }> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      // Use the new backend endpoint for training statistics
      const response = await strapi.get(API_ENDPOINTS.training.byTeam(teamId), {
        params: {
          memberId: memberId,
          includeStats: true
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const sessions = response.data || []
      let attended = 0
      let missed = 0

      sessions.forEach((session: any) => {
        if (session.participated) {
          attended++
        } else if (session.wasAbsent) {
          missed++
        }
      })

      const totalSessions = attended + missed
      const attendanceRate = totalSessions > 0 ? (attended / totalSessions) * 100 : 0

      return {
        totalSessions,
        attended,
        missed,
        attendanceRate: Math.round(attendanceRate * 100) / 100
      }
    } catch (error) {
      console.error('Error fetching training stats:', error)
      throw error
    }
  }

  // Get team players
  static async getTeamPlayers(teamId: number): Promise<any[]> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      const response = await strapi.get(API_ENDPOINTS.spieler.byTeam(teamId), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data || []
    } catch (error) {
      console.error('Error fetching team players:', error)
      throw error
    }
  }

  // Get top scorers
  static async getTopScorers(limit = 10): Promise<any[]> {
    try {
      const response = await strapi.get(API_ENDPOINTS.spieler.topScorers, {
        params: {
          limit: limit
        }
      })

      return response.data || []
    } catch (error) {
      console.error('Error fetching top scorers:', error)
      throw error
    }
  }

  // Get players by position
  static async getPlayersByPosition(position: string): Promise<any[]> {
    try {
      const response = await strapi.get(API_ENDPOINTS.spieler.byPosition(position))

      return response.data || []
    } catch (error) {
      console.error('Error fetching players by position:', error)
      throw error
    }
  }

  // Get injured players
  static async getInjuredPlayers(): Promise<any[]> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      const response = await strapi.get(API_ENDPOINTS.spieler.injured, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data || []
    } catch (error) {
      console.error('Error fetching injured players:', error)
      throw error
    }
  }
} 