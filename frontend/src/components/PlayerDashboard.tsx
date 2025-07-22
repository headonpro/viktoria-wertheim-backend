'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { PlayerApiService, TrainingSession, Game } from '@/lib/playerApi'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from "next/image";

interface PlayerData {
  id: number
  attributes: {
    vorname: string
    nachname: string
    position: string
    rueckennummer?: number
    tore_saison: number
    spiele_saison: number
    foto?: {
      data: {
        id: number
        attributes: {
          url: string
          alternativeText?: string
        }
      }
    }
    mannschaft?: {
      data: {
        id: number
        attributes: {
          name: string
          liga?: string
          trainer?: string
          teamfoto?: {
            data: {
              attributes: {
                url: string
              }
            }
          }
        }
      }
    }
  }
}

interface TrainingStats {
  totalSessions: number
  attended: number
  missed: number
  attendanceRate: number
}

export default function PlayerDashboard() {
  const { user } = useAuth()
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [upcomingTrainings, setUpcomingTrainings] = useState<TrainingSession[]>([])
  const [upcomingGames, setUpcomingGames] = useState<Game[]>([])
  const [trainingStats, setTrainingStats] = useState<TrainingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPlayerData = async () => {
      if (!user?.mitglied?.id) return

      try {
        setLoading(true)
        setError(null)

        // Load player data
        const player = await PlayerApiService.getPlayerByMemberId(user.mitglied.id)
        
        if (!player) {
          setError('Keine Spielerdaten gefunden. Möglicherweise sind Sie kein aktiver Spieler.')
          return
        }

        setPlayerData(player)

        // Load team-related data if player has a team
        if (player.attributes.mannschaft?.data?.id) {
          const teamId = player.attributes.mannschaft.data.id

          // Load upcoming trainings and games in parallel
          const [trainings, games, stats] = await Promise.all([
            PlayerApiService.getUpcomingTrainingSessions(teamId),
            PlayerApiService.getUpcomingGames(teamId),
            PlayerApiService.getPlayerTrainingStats(user.mitglied.id, teamId)
          ])

          setUpcomingTrainings(trainings)
          setUpcomingGames(games)
          setTrainingStats(stats)
        }
      } catch (err: any) {
        console.error('Error loading player data:', err)
        setError(err.message || 'Fehler beim Laden der Spielerdaten')
      } finally {
        setLoading(false)
      }
    }

    loadPlayerData()
  }, [user])

  const handleTrainingAction = async (trainingId: number, action: 'register' | 'absent') => {
    if (!user?.mitglied?.id) return

    try {
      if (action === 'register') {
        await PlayerApiService.registerForTraining(trainingId, user.mitglied.id)
      } else {
        await PlayerApiService.markAbsentForTraining(trainingId, user.mitglied.id)
      }

      // Reload upcoming trainings
      if (playerData?.attributes.mannschaft?.data?.id) {
        const trainings = await PlayerApiService.getUpcomingTrainingSessions(
          playerData.attributes.mannschaft.data.id
        )
        setUpcomingTrainings(trainings)
      }
    } catch (err: any) {
      console.error('Error updating training registration:', err)
      alert('Fehler beim Aktualisieren der Training-Anmeldung: ' + err.message)
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

  // Mapping für Backend-Enum zu UI-Label
  const POSITION_LABELS: Record<string, string> = {
    torwart: 'Torwart',
    abwehr: 'Abwehr',
    mittelfeld: 'Mittelfeld',
    sturm: 'Sturm'
  };
  const POSITION_EMOJIS: Record<string, string> = {
    torwart: '🧤',
    abwehr: '🛡️',
    mittelfeld: '⚽',
    sturm: '🎯'
  };

  const getPositionIcon = (position: string) => {
    return POSITION_EMOJIS[position] || '⚽';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'geplant': 'bg-blue-100 text-blue-800',
      'laufend': 'bg-green-100 text-green-800',
      'abgeschlossen': 'bg-gray-100 text-gray-800',
      'abgesagt': 'bg-red-100 text-red-800',
      'live': 'bg-red-100 text-red-800',
      'beendet': 'bg-gray-100 text-gray-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
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
          <div className="text-6xl mb-4">⚽</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Spieler-Dashboard</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <Link 
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (!playerData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <div className="text-6xl mb-4">⚽</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Spieler-Dashboard</h3>
          <p className="text-gray-600 mb-4">Keine Spielerdaten verfügbar</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Player Profile Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white"
      >
        <div className="flex items-center space-x-6">
          {/* Player Photo */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
              {playerData.attributes.foto?.data ? (
                <Image 
                  src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${playerData.attributes.foto.data.attributes.url}`}
                  alt="Spielerfoto"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                  priority
                />
              ) : (
                <span className="text-3xl">{getPositionIcon(playerData.attributes.position)}</span>
              )}
            </div>
            {playerData.attributes.rueckennummer && (
              <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-green-900 text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center">
                {playerData.attributes.rueckennummer}
              </div>
            )}
          </div>
          
          {/* Player Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">
              {playerData.attributes.vorname} {playerData.attributes.nachname}
            </h1>
            <p className="text-green-100 mb-2">
              {POSITION_LABELS[playerData.attributes.position]}
              {playerData.attributes.mannschaft?.data && (
                <> • {playerData.attributes.mannschaft.data.attributes.name}</>
              )}
            </p>
            
            {/* Quick Stats */}
            <div className="flex space-x-6 text-sm">
              <div>
                <span className="text-green-200">Tore:</span>
                <span className="font-bold ml-1">{playerData.attributes.tore_saison}</span>
              </div>
              <div>
                <span className="text-green-200">Spiele:</span>
                <span className="font-bold ml-1">{playerData.attributes.spiele_saison}</span>
              </div>
              {trainingStats && (
                <div>
                  <span className="text-green-200">Training:</span>
                  <span className="font-bold ml-1">{trainingStats.attendanceRate}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upcoming Trainings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <span className="text-2xl mr-2">🏃‍♂️</span>
              Kommende Trainings
            </h2>
          </div>

          {upcomingTrainings.length > 0 ? (
            <div className="space-y-4">
              {upcomingTrainings.map((training) => {
                const isRegistered = training.attributes.teilnehmer?.data?.some(
                  (p) => p.id === user?.mitglied?.id
                )
                const isAbsent = training.attributes.abwesende?.data?.some(
                  (p) => p.id === user?.mitglied?.id
                )

                return (
                  <div key={training.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{training.attributes.titel}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(training.attributes.status)}`}>
                        {training.attributes.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-3">
                      <p>📅 {formatDate(training.attributes.datum)} • ⏰ {formatTime(training.attributes.datum)}</p>
                      <p>📍 {training.attributes.ort}</p>
                      {training.attributes.trainingsziel && (
                        <p>🎯 {training.attributes.trainingsziel}</p>
                      )}
                    </div>

                    {training.attributes.status === 'geplant' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleTrainingAction(training.id, 'register')}
                          disabled={isRegistered}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            isRegistered 
                              ? 'bg-green-100 text-green-800 cursor-not-allowed' 
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {isRegistered ? '✓ Angemeldet' : 'Anmelden'}
                        </button>
                        <button
                          onClick={() => handleTrainingAction(training.id, 'absent')}
                          disabled={isAbsent}
                          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            isAbsent 
                              ? 'bg-red-100 text-red-800 cursor-not-allowed' 
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {isAbsent ? '✗ Abgemeldet' : 'Absagen'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">🏃‍♂️</div>
              <p>Keine kommenden Trainings geplant</p>
            </div>
          )}
        </motion.div>

        {/* Upcoming Games */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <span className="text-2xl mr-2">⚽</span>
              Nächste Spiele
            </h2>
          </div>

          {upcomingGames.length > 0 ? (
            <div className="space-y-4">
              {upcomingGames.map((game) => (
                <div key={game.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`text-lg ${game.attributes.isHeimspiel ? '🏠' : '🚌'}`}>
                        {game.attributes.isHeimspiel ? '🏠' : '🚌'}
                      </span>
                      <span className="font-medium text-gray-900">
                        {game.attributes.heimmannschaft} vs {game.attributes.auswaertsmannschaft}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(game.attributes.spielstatus)}`}>
                      {game.attributes.spielstatus}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <p>📅 {formatDate(game.attributes.datum)} • ⏰ {formatTime(game.attributes.datum)}</p>
                    <p>📍 {game.attributes.spielort}</p>
                    {game.attributes.liga && <p>🏆 {game.attributes.liga}</p>}
                  </div>

                  {(game.attributes.toreHeim !== undefined && game.attributes.toreAuswaerts !== undefined) && (
                    <div className="mt-2 text-lg font-bold text-center">
                      {game.attributes.toreHeim} : {game.attributes.toreAuswaerts}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">⚽</div>
              <p>Keine kommenden Spiele geplant</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Training Statistics & Team Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Training Statistics */}
        {trainingStats && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">📊</span>
              Training-Statistiken
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{trainingStats.attended}</div>
                  <div className="text-sm text-green-700">Teilgenommen</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{trainingStats.missed}</div>
                  <div className="text-sm text-red-700">Verpasst</div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Anwesenheitsrate</span>
                  <span className="text-sm font-bold text-blue-900">{trainingStats.attendanceRate}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${trainingStats.attendanceRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="text-center text-sm text-gray-600">
                Gesamt: {trainingStats.totalSessions} Training{trainingStats.totalSessions !== 1 ? 's' : ''}
              </div>
            </div>
          </motion.div>
        )}

        {/* Team Information */}
        {playerData.attributes.mannschaft?.data && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="text-2xl mr-2">👥</span>
              Mein Team
            </h2>

            <div className="space-y-4">
              {playerData.attributes.mannschaft.data.attributes.teamfoto?.data && (
                <div className="text-center">
                  <Image 
                    src={`${process.env.NEXT_PUBLIC_STRAPI_URL}${playerData.attributes.mannschaft.data.attributes.teamfoto.data.attributes.url}`}
                    alt="Teamfoto"
                    width={400}
                    height={128}
                    className="w-full h-32 object-cover rounded-lg"
                    priority
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Team:</span>
                  <span className="text-sm text-gray-900">{playerData.attributes.mannschaft.data.attributes.name}</span>
                </div>
                
                {playerData.attributes.mannschaft.data.attributes.liga && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Liga:</span>
                    <span className="text-sm text-gray-900">{playerData.attributes.mannschaft.data.attributes.liga}</span>
                  </div>
                )}
                
                {playerData.attributes.mannschaft.data.attributes.trainer && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Trainer:</span>
                    <span className="text-sm text-gray-900">{playerData.attributes.mannschaft.data.attributes.trainer}</span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <Link 
                  href={`/teams/${playerData.attributes.mannschaft.data.id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Team-Details anzeigen
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-lg p-6"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <span className="text-2xl mr-2">⚡</span>
          Schnellzugriff
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link 
            href="/profile"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span className="text-2xl mb-2">👤</span>
            <span className="text-sm font-medium text-gray-700">Mein Profil</span>
          </Link>

          <Link 
            href="/teams"
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <span className="text-2xl mb-2">👥</span>
            <span className="text-sm font-medium text-gray-700">Teams</span>
          </Link>

          <Link 
            href="/news"
            className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <span className="text-2xl mb-2">📰</span>
            <span className="text-sm font-medium text-gray-700">News</span>
          </Link>

          <Link 
            href="/kontakt"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <span className="text-2xl mb-2">📞</span>
            <span className="text-sm font-medium text-gray-700">Kontakt</span>
          </Link>
        </div>
      </motion.div>
    </div>
  )
} 