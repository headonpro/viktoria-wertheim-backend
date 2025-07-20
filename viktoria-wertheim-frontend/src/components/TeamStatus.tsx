'use client'

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { IconTrendingUp, IconTrendingDown, IconArrowRight, IconCircle1, IconCircle2, IconCircle3 } from '@tabler/icons-react'
import { leagueService } from '@/services/leagueService'

const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

const AnimatedDiv = dynamic(
  () => import('@/components/AnimatedSection').then(mod => ({ default: mod.AnimatedDiv })),
  { ssr: false }
)

// Team types
type TeamType = '1' | '2' | '3'

interface TeamData {
  formLetzten5: string[]
  tabellenplatz: number
  platzierungsveraenderung: string
  liga: string
}

interface TeamStatusProps {
  selectedTeam: TeamType
  onTeamChange: (team: TeamType) => void
}

export default function TeamStatus({ selectedTeam, onTeamChange }: TeamStatusProps) {
  // Mannschaftsspezifische Daten
  const teamDataMap: Record<TeamType, TeamData> = useMemo(() => ({
    '1': {
      formLetzten5: ['S', 'U', 'S', 'N', 'S'],
      tabellenplatz: 8,
      platzierungsveraenderung: 'U',
      liga: 'Kreisliga'
    },
    '2': {
      formLetzten5: ['S', 'S', 'U', 'S', 'N'],
      tabellenplatz: 4,
      platzierungsveraenderung: 'S',
      liga: 'Kreisklasse A'
    },
    '3': {
      formLetzten5: ['N', 'S', 'S', 'U', 'S'],
      tabellenplatz: 12,
      platzierungsveraenderung: 'N',
      liga: 'Kreisklasse B'
    }
  }), [])

  const [teamData, setTeamData] = useState<TeamData>(teamDataMap[selectedTeam])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Setze die Daten basierend auf der ausgewählten Mannschaft
        const currentTeamData = teamDataMap[selectedTeam]
        
        // Für die 1. Mannschaft versuchen wir API-Daten zu laden
        if (selectedTeam === '1') {
          try {
            const viktoriaData = await leagueService.fetchViktoriaStanding()
            if (viktoriaData) {
              setTeamData({
                ...currentTeamData,
                tabellenplatz: viktoriaData.position,
              })
            } else {
              setTeamData(currentTeamData)
            }
          } catch (apiError) {
            console.warn('API data not available, using fallback:', apiError)
            setTeamData(currentTeamData)
          }
        } else {
          // Für 2. und 3. Mannschaft verwenden wir Mock-Daten
          setTeamData(currentTeamData)
        }
      } catch (err) {
        console.error('Failed to fetch team data:', err)
        setError('Daten konnten nicht geladen werden')
        setTeamData(teamDataMap[selectedTeam])
      } finally {
        setLoading(false)
      }
    }

    fetchTeamData()
  }, [selectedTeam, teamDataMap])

  const getFormColor = (result: string) => {
    switch (result) {
      case 'S': return 'bg-green-500 text-gray-700 shadow-green-500/30 shadow-lg drop-shadow-[0_0_6px_rgba(34,197,94,0.4)]'
      case 'U': return 'bg-gray-400 text-gray-700 shadow-gray-400/30 shadow-lg drop-shadow-[0_0_6px_rgba(156,163,175,0.3)]'
      case 'N': return 'bg-red-500 text-gray-700 shadow-red-500/30 shadow-lg drop-shadow-[0_0_6px_rgba(239,68,68,0.4)]'
      default: return 'bg-gray-400 text-gray-700 shadow-gray-400/30 shadow-lg drop-shadow-[0_0_6px_rgba(156,163,175,0.3)]'
    }
  }

  const getFormText = (result: string) => {
    switch (result) {
      case 'S': return ''
      case 'U': return ''
      case 'N': return ''
      default: return '?'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'S': return <IconTrendingUp size={16} className="text-green-500" />
      case 'U': return <IconArrowRight size={16} className="text-gray-400" />
      case 'N': return <IconTrendingDown size={16} className="text-red-500" />
      default: return <IconArrowRight size={16} className="text-gray-400" />
    }
  }

  const getTeamIcon = (team: TeamType, isSelected: boolean) => {
    const iconClass = isSelected 
      ? "text-gray-800" // Dunkle Schrift für aktiven Button auf gelbem Hintergrund
      : "text-gray-700 dark:text-gray-300"; // Normale Schrift für inaktive Buttons
    
    switch (team) {
      case '1': return <IconCircle1 size={32} className={iconClass} strokeWidth={2.5} />
      case '2': return <IconCircle2 size={32} className={iconClass} strokeWidth={2.5} />
      case '3': return <IconCircle3 size={32} className={iconClass} strokeWidth={2.5} />
      default: return <IconCircle1 size={32} className={iconClass} strokeWidth={2.5} />
    }
  }

  return (
    <div className="container max-w-6xl">
      <AnimatedDiv
        className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl border border-white/40 dark:border-white/[0.03] transition-all duration-300 shadow-2xl shadow-black/20 dark:shadow-white/[0.25] overflow-hidden"
        delay={0.1}
      >
        {/* Mannschaftsauswahl Buttons */}
        <div className="px-8 py-6 md:px-12 md:py-8">
          {/* Titel */}
          <div className="text-center mb-6 md:mb-8">
            <h3 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Mannschaften
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-8 items-center mb-6 md:mb-8">
            {(['1', '2', '3'] as TeamType[]).map((team) => (
              <div key={team} className="flex justify-center">
                <button
                  onClick={() => onTeamChange(team)}
                  className={`px-6 py-2 md:px-8 md:py-3 rounded-lg text-sm md:text-base font-semibold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${
                    selectedTeam === team
                      ? 'bg-viktoria-yellow text-gray-800 shadow-lg shadow-viktoria-yellow/30'
                      : 'bg-white/30 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="block md:hidden">{getTeamIcon(team, selectedTeam === team)}</span>
                  <span className="hidden md:block">
                    {getTeamIcon(team, selectedTeam === team)}
                  </span>
                </button>
              </div>
            ))}
          </div>

          {/* Kompakte horizontale Anordnung mit Grid */}
          <div className="grid grid-cols-3 gap-8 items-end">
            
            {/* Platz - Links */}
            <div className="text-center">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                Platz
              </div>
              <div className="flex items-center justify-center space-x-1 h-6 md:h-8">
                <div className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200">
                  {teamData.tabellenplatz}
                </div>
                <div className="flex items-center">
                  {getTrendIcon(teamData.platzierungsveraenderung)}
                </div>
              </div>
            </div>

            {/* Form - Mitte */}
            <div className="text-center">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                Form
              </div>
              <div className="flex space-x-1 justify-center items-center h-6 md:h-8">
                {teamData.formLetzten5.map((result, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 md:w-4 md:h-4 rounded-full flex items-center justify-center text-xs font-bold ${getFormColor(result)} transition-all duration-200 shadow-sm`}
                  >
                    {getFormText(result)}
                  </div>
                ))}
              </div>
            </div>

            {/* Liga - Rechts */}
            <div className="text-center">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                Liga
              </div>
              <div className="flex items-center justify-center h-6 md:h-8">
                <div className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200">
                  {teamData.liga}
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </AnimatedDiv>
    </div>
  )
} 