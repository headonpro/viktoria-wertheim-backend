import { strapi, apiRequest, API_ENDPOINTS } from './strapi'
import { AuthService } from './auth'

export interface TrainerTeam {
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
    spielers?: {
      data: Array<{
        id: number
        attributes: {
          vorname: string
          nachname: string
          position: string
          rueckennummer?: number
          tore: number
          spiele: number
          foto?: {
            data: {
              attributes: {
                url: string
              }
            }
          }
        }
      }>
    }
    mitglieder?: {
      data: Array<{
        id: number
        attributes: {
          vorname: string
          nachname: string
          mitgliedstyp: string
        }
      }>
    }
  }
}

export interface TrainingSessionFull {
  id: number
  attributes: {
    titel: string
    datum: string
    dauer: number
    ort: string
    beschreibung?: string
    trainingsziel?: string
    uebungen?: any
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
    mannschaft?: {
      data: {
        id: number
        attributes: {
          name: string
        }
      }
    }
    teilnehmer?: {
      data: Array<{
        id: number
        attributes: {
          vorname: string
          nachname: string
          mitgliedstyp: string
        }
      }>
    }
    abwesende?: {
      data: Array<{
        id: number
        attributes: {
          vorname: string
          nachname: string
          mitgliedstyp: string
        }
      }>
    }
  }
}

export interface CreateTrainingData {
  titel: string
  datum: string
  dauer: number
  ort: string
  beschreibung?: string
  trainingsziel?: string
  mannschaft: number
  trainer: number
  status?: 'geplant' | 'laufend' | 'abgeschlossen' | 'abgesagt'
}

export interface UpdateTrainingData {
  titel?: string
  datum?: string
  dauer?: number
  ort?: string
  beschreibung?: string
  trainingsziel?: string
  status?: 'geplant' | 'laufend' | 'abgeschlossen' | 'abgesagt'
  wetter?: string
  notizen?: string
  uebungen?: any
}

export class TrainerApiService {
  
  // Get teams where user is trainer (by member ID)
  static async getTrainerTeams(memberId: number): Promise<TrainerTeam[]> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      const response = await strapi.get(API_ENDPOINTS.mannschaft.withTrainers, {
        params: {
          trainerId: memberId
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data || []
    } catch (error) {
      console.error('Error fetching trainer teams:', error)
      throw error
    }
  }

  // Get training sessions for a team (trainer view)
  static async getTeamTrainingSessions(teamId: number, limit = 20): Promise<TrainingSessionFull[]> {
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
      console.error('Error fetching team training sessions:', error)
      throw error
    }
  }

  // Create new training session
  static async createTrainingSession(data: CreateTrainingData): Promise<TrainingSessionFull> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      const response = await strapi.post(API_ENDPOINTS.training.create, data, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data
    } catch (error) {
      console.error('Error creating training session:', error)
      throw error
    }
  }

  // Update training session
  static async updateTrainingSession(trainingId: number, data: UpdateTrainingData): Promise<TrainingSessionFull> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      const response = await strapi.put(`${API_ENDPOINTS.trainings}/${trainingId}`, {
        data: data
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data.data
    } catch (error) {
      console.error('Error updating training session:', error)
      throw error
    }
  }

  // Delete training session
  static async deleteTrainingSession(trainingId: number): Promise<void> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      await strapi.delete(`${API_ENDPOINTS.trainings}/${trainingId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('Error deleting training session:', error)
      throw error
    }
  }

  // Get single training session with full details
  static async getTrainingSession(trainingId: number): Promise<TrainingSessionFull> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      const response = await strapi.get(`${API_ENDPOINTS.trainings}/${trainingId}`, {
        params: {
          populate: {
            trainer: true,
            mannschaft: {
              populate: ['mitglieder']
            },
            teilnehmer: true,
            abwesende: true
          }
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data.data
    } catch (error) {
      console.error('Error fetching training session:', error)
      throw error
    }
  }

  // Update attendance for training session
  static async updateTrainingAttendance(
    trainingId: number, 
    participantIds: number[], 
    absentIds: number[]
  ): Promise<void> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      await strapi.post(API_ENDPOINTS.training.attendance(trainingId), {
        participantIds,
        absentIds
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('Error updating training attendance:', error)
      throw error
    }
  }

  // Complete training session
  static async completeTrainingSession(trainingId: number, sessionData?: {
    wetter?: string
    notizen?: string
    uebungen?: any
  }): Promise<void> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      await strapi.post(API_ENDPOINTS.training.complete(trainingId), sessionData || {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
    } catch (error) {
      console.error('Error completing training session:', error)
      throw error
    }
  }

  // Get trainings by trainer
  static async getTrainingsByTrainer(trainerId: number): Promise<TrainingSessionFull[]> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      const response = await strapi.get(API_ENDPOINTS.training.byTrainer(trainerId), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data || []
    } catch (error) {
      console.error('Error fetching trainings by trainer:', error)
      throw error
    }
  }

  // Get team statistics
  static async getTeamStatistics(teamId: number): Promise<{
    totalPlayers: number
    totalTrainingSessions: number
    averageAttendance: number
    upcomingTrainings: number
    completedTrainings: number
  }> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      // Get team details
      const teamResponse = await strapi.get(API_ENDPOINTS.mannschaft.details(teamId), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      // Get team training sessions
      const trainingsResponse = await strapi.get(API_ENDPOINTS.training.byTeam(teamId), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const teamData = teamResponse.data || {}
      const trainings = trainingsResponse.data || []

      const totalPlayers = teamData.totalPlayers || 0
      const completedTrainings = trainings.filter((t: any) => t.status === 'abgeschlossen')
      const upcomingTrainings = trainings.filter((t: any) => 
        t.status === 'geplant' && new Date(t.datum) > new Date()
      )

      // Calculate average attendance
      let totalAttendance = 0
      completedTrainings.forEach((training: any) => {
        if (training.attendanceRate) {
          totalAttendance += training.attendanceRate
        }
      })

      const averageAttendance = completedTrainings.length > 0 
        ? totalAttendance / completedTrainings.length 
        : 0

      return {
        totalPlayers,
        totalTrainingSessions: trainings.length,
        averageAttendance: Math.round(averageAttendance * 100) / 100,
        upcomingTrainings: upcomingTrainings.length,
        completedTrainings: completedTrainings.length
      }
    } catch (error) {
      console.error('Error fetching team statistics:', error)
      throw error
    }
  }

  // Get player attendance for a specific team
  static async getPlayerAttendanceStats(teamId: number): Promise<Array<{
    playerId: number
    playerName: string
    totalSessions: number
    attended: number
    missed: number
    attendanceRate: number
  }>> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      // Use the team details endpoint which includes attendance stats
      const response = await strapi.get(API_ENDPOINTS.mannschaft.details(teamId), {
        params: {
          includeAttendance: true
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data?.playerAttendance || []
    } catch (error) {
      console.error('Error fetching player attendance stats:', error)
      throw error
    }
  }

  // Get active teams
  static async getActiveTeams(): Promise<TrainerTeam[]> {
    const token = AuthService.getToken()
    if (!token) throw new Error('Nicht authentifiziert')

    try {
      const response = await strapi.get(API_ENDPOINTS.mannschaft.active, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      return response.data || []
    } catch (error) {
      console.error('Error fetching active teams:', error)
      throw error
    }
  }

  // Get teams by age group  
  static async getTeamsByAgeGroup(ageGroup: string): Promise<TrainerTeam[]> {
    try {
      const response = await strapi.get(API_ENDPOINTS.mannschaft.byAgeGroup(ageGroup), {
        params: {
          ageGroup: ageGroup
        }
      })

      return response.data || []
    } catch (error) {
      console.error('Error fetching teams by age group:', error)
      throw error
    }
  }
} 