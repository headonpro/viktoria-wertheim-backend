'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { TrainerApiService, TrainerTeam, TrainingSessionFull, CreateTrainingData } from '@/lib/trainerApi'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface TeamStats {
  totalPlayers: number
  totalTrainingSessions: number
  averageAttendance: number
  upcomingTrainings: number
  completedTrainings: number
}

interface PlayerAttendance {
  playerId: number
  playerName: string
  totalSessions: number
  attended: number
  missed: number
  attendanceRate: number
}

interface CreateTrainingForm {
  titel: string
  datum: string
  zeit: string
  dauer: number
  ort: string
  beschreibung: string
  trainingsziel: string
}

export default function TrainerDashboard() {
  const { user } = useAuth()
  const [teams, setTeams] = useState<TrainerTeam[]>([])
  const [selectedTeam, setSelectedTeam] = useState<TrainerTeam | null>(null)
  const [trainingSessions, setTrainingSessions] = useState<TrainingSessionFull[]>([])
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [playerAttendance, setPlayerAttendance] = useState<PlayerAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createFormData, setCreateFormData] = useState<CreateTrainingForm>({
    titel: '',
    datum: '',
    zeit: '',
    dauer: 90,
    ort: 'Sportplatz Wertheim',
    beschreibung: '',
    trainingsziel: ''
  })

  useEffect(() => {
    const loadTrainerData = async () => {
      if (!user?.mitglied?.id) return

      try {
        setLoading(true)
        setError(null)

        // Load teams where user is trainer
        const trainerTeams = await TrainerApiService.getTrainerTeams(user.mitglied.id)
        
        if (trainerTeams.length === 0) {
          setError('Keine Teams gefunden. Möglicherweise sind Sie kein aktiver Trainer.')
          return
        }

        setTeams(trainerTeams)
        
        // Automatically select first team
        if (trainerTeams.length > 0) {
          const firstTeam = trainerTeams[0]
          setSelectedTeam(firstTeam)
          await loadTeamData(firstTeam.id)
        }
      } catch (err: any) {
        console.error('Error loading trainer data:', err)
        setError(err.message || 'Fehler beim Laden der Trainer-Daten')
      } finally {
        setLoading(false)
      }
    }

    loadTrainerData()
  }, [user])

  const loadTeamData = async (teamId: number) => {
    try {
      const [sessions, stats, attendance] = await Promise.all([
        TrainerApiService.getTeamTrainingSessions(teamId, 10),
        TrainerApiService.getTeamStatistics(teamId),
        TrainerApiService.getPlayerAttendanceStats(teamId)
      ])

      setTrainingSessions(sessions)
      setTeamStats(stats)
      setPlayerAttendance(attendance)
    } catch (err: any) {
      console.error('Error loading team data:', err)
      setError('Fehler beim Laden der Team-Daten: ' + err.message)
    }
  }

  const handleTeamSwitch = async (team: TrainerTeam) => {
    setSelectedTeam(team)
    setLoading(true)
    await loadTeamData(team.id)
    setLoading(false)
  }

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTeam || !user?.mitglied?.id) return

    try {
      const datetime = `${createFormData.datum}T${createFormData.zeit}:00.000Z`
      
      const trainingData: CreateTrainingData = {
        titel: createFormData.titel,
        datum: datetime,
        dauer: createFormData.dauer,
        ort: createFormData.ort,
        beschreibung: createFormData.beschreibung,
        trainingsziel: createFormData.trainingsziel,
        mannschaft: selectedTeam.id,
        trainer: user.mitglied.id,
        status: 'geplant'
      }

      await TrainerApiService.createTrainingSession(trainingData)
      
      // Reload training sessions
      await loadTeamData(selectedTeam.id)
      
      // Reset form
      setShowCreateForm(false)
      setCreateFormData({
        titel: '',
        datum: '',
        zeit: '',
        dauer: 90,
        ort: 'Sportplatz Wertheim',
        beschreibung: '',
        trainingsziel: ''
      })
      
      alert('Training erfolgreich erstellt!')
    } catch (err: any) {
      console.error('Error creating training:', err)
      alert('Fehler beim Erstellen des Trainings: ' + err.message)
    }
  }

  const handleDeleteTraining = async (trainingId: number) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Training löschen möchten?')) return

    try {
      await TrainerApiService.deleteTrainingSession(trainingId)
      
      // Reload training sessions
      if (selectedTeam) {
        await loadTeamData(selectedTeam.id)
      }
      
      alert('Training erfolgreich gelöscht!')
    } catch (err: any) {
      console.error('Error deleting training:', err)
      alert('Fehler beim Löschen des Trainings: ' + err.message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'geplant': 'bg-blue-100 text-blue-800',
      'laufend': 'bg-green-100 text-green-800',
      'abgeschlossen': 'bg-gray-100 text-gray-800',
      'abgesagt': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading && !selectedTeam) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">👨‍🏫</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Trainer-Dashboard</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Link 
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Team Selection */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Trainer-Dashboard</h1>
            <p className="text-blue-100">Training-Management und Team-Übersicht</p>
          </div>
          <div className="text-4xl">👨‍🏫</div>
        </div>

        {/* Team Selection */}
        {teams.length > 1 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-blue-100 mb-2">Team auswählen:</label>
            <select
              value={selectedTeam?.id || ''}
              onChange={(e) => {
                const team = teams.find(t => t.id === parseInt(e.target.value))
                if (team) handleTeamSwitch(team)
              }}
              className="w-full md:w-auto px-4 py-2 rounded-lg bg-white text-gray-900 border-0 focus:ring-2 focus:ring-blue-300"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.attributes.name} {team.attributes.liga ? `(${team.attributes.liga})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </motion.div>

      {selectedTeam && (
        <>
          {/* Team Stats Overview */}
          {teamStats && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-5 gap-4"
            >
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{teamStats.totalPlayers}</div>
                <div className="text-sm text-gray-600">Spieler</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{teamStats.upcomingTrainings}</div>
                <div className="text-sm text-gray-600">Kommende Trainings</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{teamStats.completedTrainings}</div>
                <div className="text-sm text-gray-600">Abgeschlossen</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">{teamStats.averageAttendance}%</div>
                <div className="text-sm text-gray-600">Ø Anwesenheit</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <div className="text-2xl font-bold text-gray-600">{teamStats.totalTrainingSessions}</div>
                <div className="text-sm text-gray-600">Gesamt Trainings</div>
              </div>
            </motion.div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Training Sessions Management */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <span className="text-2xl mr-2">🏃‍♂️</span>
                  Training-Sessions
                </h2>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  + Neues Training
                </button>
              </div>

              {/* Training List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {trainingSessions.map((training) => (
                  <div key={training.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{training.attributes.titel}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(training.attributes.status)}`}>
                          {training.attributes.status}
                        </span>
                        {training.attributes.status === 'geplant' && (
                          <button
                            onClick={() => handleDeleteTraining(training.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                            title="Training löschen"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <p>📅 {formatDate(training.attributes.datum)} • ⏰ {formatTime(training.attributes.datum)}</p>
                      <p>📍 {training.attributes.ort} • ⏱️ {training.attributes.dauer} Min</p>
                      {training.attributes.trainingsziel && (
                        <p>🎯 {training.attributes.trainingsziel}</p>
                      )}
                    </div>

                    {/* Attendance Info */}
                    <div className="flex text-xs space-x-4 text-gray-500">
                      <span>✓ {training.attributes.teilnehmer?.data?.length || 0} Angemeldet</span>
                      <span>✗ {training.attributes.abwesende?.data?.length || 0} Abgemeldet</span>
                    </div>
                  </div>
                ))}

                {trainingSessions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🏃‍♂️</div>
                    <p>Keine Training-Sessions gefunden</p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="mt-2 text-blue-600 hover:text-blue-800 underline"
                    >
                      Erstes Training erstellen
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Player Attendance Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">📊</span>
                Spieler-Anwesenheit
              </h2>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {playerAttendance.map((player) => (
                  <div key={player.playerId} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{player.playerName}</span>
                      <span className={`font-bold ${getAttendanceColor(player.attendanceRate)}`}>
                        {player.attendanceRate}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>✓ {player.attended}</span>
                      <span>✗ {player.missed}</span>
                      <span>📊 {player.totalSessions} total</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          player.attendanceRate >= 80 ? 'bg-green-500' : 
                          player.attendanceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${player.attendanceRate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}

                {playerAttendance.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📊</div>
                    <p>Keine Anwesenheitsdaten verfügbar</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Team Overview */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">👥</span>
              Team: {selectedTeam.attributes.name}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Info */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Team-Informationen</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Team:</span>
                    <span className="font-medium">{selectedTeam.attributes.name}</span>
                  </div>
                  {selectedTeam.attributes.liga && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Liga:</span>
                      <span className="font-medium">{selectedTeam.attributes.liga}</span>
                    </div>
                  )}
                  {selectedTeam.attributes.trainer && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Haupttrainer:</span>
                      <span className="font-medium">{selectedTeam.attributes.trainer}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Schnellzugriff</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    📝 Neues Training planen
                  </button>
                  <Link 
                    href={`/teams/${selectedTeam.id}`}
                    className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm text-center"
                  >
                    👥 Team-Details anzeigen
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Create Training Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Neues Training erstellen</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTraining} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                <input
                  type="text"
                  value={createFormData.titel}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, titel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  placeholder="z.B. Taktiktraining"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum *</label>
                  <input
                    type="date"
                    value={createFormData.datum}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, datum: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit *</label>
                  <input
                    type="time"
                    value={createFormData.zeit}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, zeit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dauer (Minuten) *</label>
                <input
                  type="number"
                  value={createFormData.dauer}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, dauer: parseInt(e.target.value) || 90 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  min="30"
                  max="180"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ort *</label>
                <input
                  type="text"
                  value={createFormData.ort}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, ort: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trainingsziel</label>
                <input
                  type="text"
                  value={createFormData.trainingsziel}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, trainingsziel: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="z.B. Passspiel verbessern"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <textarea
                  value={createFormData.beschreibung}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, beschreibung: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Zusätzliche Informationen zum Training..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Training erstellen
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
} 