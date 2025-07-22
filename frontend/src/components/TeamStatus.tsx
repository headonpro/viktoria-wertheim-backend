'use client'

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { IconTrendingUp, IconTrendingDown, IconArrowRight, IconCircle1, IconCircle2, IconCircle3 } from '@tabler/icons-react'
import { teamService } from '@/services/teamService'
import { TeamData, TeamId } from '@/types/strapi'

const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

const AnimatedDiv = dynamic(
  () => import('@/components/AnimatedSection').then(mod => ({ default: mod.AnimatedDiv })),
  { ssr: false }
)

interface TeamStatusProps {
  selectedTeam: TeamId
  onTeamChange: (team: TeamId) => void
}

export default function TeamStatus({ selectedTeam, onTeamChange }: TeamStatusProps) {
  // Add CSS animations for form indicators and transitions
  React.useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes fadeInScale {
        0% {
          opacity: 0;
          transform: scale(0.5);
        }
        100% {
          opacity: 1;
          transform: scale(1);
        }
      }
      @keyframes slideInUp {
        0% {
          opacity: 0;
          transform: translateY(20px);
        }
        100% {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
    `
    document.head.appendChild(style)
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])
  
  const [teamData, setTeamData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Enhanced team change handler with smooth transitions
  const handleTeamChange = async (team: TeamId) => {
    if (team === selectedTeam) return
    
    setIsTransitioning(true)
    onTeamChange(team)
    
    // Add small delay for smooth visual transition
    setTimeout(() => {
      setIsTransitioning(false)
    }, 300)
  }

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch team data using the teamService
        const apiTeamData = await teamService.fetchTeamData(selectedTeam)
        
        // Validate the data before setting it
        if (teamService.validateTeamData(apiTeamData)) {
          setTeamData(apiTeamData)
        } else {
          if (process.env.NODE_ENV !== 'test') {
            console.warn('Invalid team data received:', apiTeamData)
          }
          setError('Ungültige Daten erhalten')
          setTeamData(apiTeamData) // Still set it, validation is just a warning
        }
        
      } catch (err) {
        console.error('Failed to fetch team data:', err)
        setError('Daten werden geladen...')
        // teamService.fetchTeamData already handles fallback internally
        const fallbackData = await teamService.fetchTeamData(selectedTeam)
        setTeamData(fallbackData)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamData()
  }, [selectedTeam])

  const getFormColor = (result: 'S' | 'U' | 'N') => {
    switch (result) {
      case 'S': return 'bg-green-500 text-white shadow-green-500/40 shadow-lg drop-shadow-[0_0_8px_rgba(34,197,94,0.5)] hover:shadow-green-500/60 hover:scale-110'
      case 'U': return 'bg-yellow-500 text-white shadow-yellow-500/40 shadow-lg drop-shadow-[0_0_8px_rgba(234,179,8,0.5)] hover:shadow-yellow-500/60 hover:scale-110'
      case 'N': return 'bg-red-500 text-white shadow-red-500/40 shadow-lg drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] hover:shadow-red-500/60 hover:scale-110'
      default: return 'bg-gray-400 text-white shadow-gray-400/40 shadow-lg drop-shadow-[0_0_8px_rgba(156,163,175,0.4)] hover:shadow-gray-400/60 hover:scale-110'
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

  const getTrendIcon = (trend: 'steigend' | 'gleich' | 'fallend') => {
    const baseClasses = "transition-all duration-300 hover:scale-125"
    switch (trend) {
      case 'steigend': return <IconTrendingUp size={16} className={`text-green-500 ${baseClasses} hover:text-green-400`} />
      case 'gleich': return <IconArrowRight size={16} className={`text-gray-400 ${baseClasses} hover:text-gray-300`} />
      case 'fallend': return <IconTrendingDown size={16} className={`text-red-500 ${baseClasses} hover:text-red-400`} />
      default: return <IconArrowRight size={16} className={`text-gray-400 ${baseClasses}`} />
    }
  }

  const getTrendText = (trend: 'steigend' | 'gleich' | 'fallend') => {
    switch (trend) {
      case 'steigend': return 'Aufwärtstrend'
      case 'gleich': return 'Stabil'
      case 'fallend': return 'Abwärtstrend'
      default: return 'Unbekannt'
    }
  }

  const getFormTooltip = (result: 'S' | 'U' | 'N') => {
    switch (result) {
      case 'S': return 'Sieg'
      case 'U': return 'Unentschieden'
      case 'N': return 'Niederlage'
      default: return 'Unbekannt'
    }
  }

  const getTeamIcon = (team: TeamId, isSelected: boolean) => {
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
        className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)"
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
          <div className="grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 items-center mb-6 md:mb-8">
            {(['1', '2', '3'] as TeamId[]).map((team) => (
              <div key={team} className="flex justify-center">
                <button
                  onClick={() => handleTeamChange(team)}
                  className={`
                    min-h-[48px] min-w-[48px] 
                    px-4 py-3 sm:px-6 sm:py-2 md:px-8 md:py-3 
                    rounded-lg text-sm md:text-base font-semibold 
                    transition-all duration-300 
                    whitespace-nowrap flex items-center justify-center gap-2
                    touch-manipulation
                    active:scale-95
                    hover:scale-105 md:hover:scale-110
                    ${selectedTeam === team
                      ? 'bg-viktoria-yellow text-gray-800 shadow-lg shadow-viktoria-yellow/30 transform scale-105'
                      : 'bg-gray-200/80 dark:bg-white/[0.05] text-gray-700 dark:text-gray-300 hover:bg-gray-300/80 dark:hover:bg-white/[0.08] border border-gray-300/50 dark:border-transparent'
                    }
                  `}
                  aria-label={`${team}. Mannschaft auswählen`}
                  role="tab"
                  aria-selected={selectedTeam === team}
                >
                  <span className="block sm:hidden">{getTeamIcon(team, selectedTeam === team)}</span>
                  <span className="hidden sm:flex items-center gap-2">
                    {getTeamIcon(team, selectedTeam === team)}
                    <span className="hidden md:inline">Mannschaft</span>
                  </span>
                </button>
              </div>
            ))}
          </div>

          {/* Loading State */}
          {(loading || isTransitioning) && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-viktoria-yellow border-t-transparent rounded-full animate-spin"></div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {isTransitioning ? 'Wechsle Mannschaft...' : 'Lade Mannschaftsdaten...'}
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-4">
              <div className="text-sm text-orange-600 dark:text-orange-400 mb-2">
                {error}
              </div>
            </div>
          )}

          {/* Team Data Display */}
          {!loading && teamData && (
            <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8 items-end transition-all duration-500 ease-in-out">
              
              {/* Platz - Links */}
              <div className="text-center">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Platz
                </div>
                <div className="flex items-center justify-center space-x-1 h-8 md:h-10">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-200 transition-all duration-300">
                    {teamData.tabellenplatz}
                  </div>
                  <div className="flex items-center ml-1" title={getTrendText(teamData.trend)}>
                    {getTrendIcon(teamData.trend)}
                  </div>
                </div>
              </div>

              {/* Form - Mitte */}
              <div className="text-center">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Form
                </div>
                <div className="flex space-x-1 sm:space-x-1.5 justify-center items-center h-8 md:h-10">
                  {teamData.form_letzte_5.length > 0 ? (
                    teamData.form_letzte_5.map((result, index) => (
                      <div
                        key={index}
                        title={`${getFormTooltip(result)} (Spiel ${teamData.form_letzte_5.length - index})`}
                        className={`w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-7 rounded-full flex items-center justify-center text-xs font-bold ${getFormColor(result)} transition-all duration-300 shadow-sm cursor-help transform hover:z-10 relative touch-manipulation`}
                        style={{ 
                          animationDelay: `${index * 100}ms`,
                          animation: 'fadeInScale 0.5s ease-out forwards'
                        }}
                      >
                        {getFormText(result)}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                      Keine Daten
                    </div>
                  )}
                </div>
              </div>

              {/* Liga - Rechts */}
              <div className="text-center">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                  Liga
                </div>
                <div className="flex items-center justify-center h-8 md:h-10">
                  <div className="text-xs sm:text-sm md:text-base font-semibold text-gray-800 dark:text-gray-200 leading-tight text-center max-w-full overflow-hidden">
                    <span className="block sm:hidden">
                      {teamData.liga_vollname ? 
                        teamData.liga_vollname.split(' ').slice(0, 2).join(' ') : 
                        teamData.liga
                      }
                    </span>
                    <span className="hidden sm:block">
                      {teamData.liga_vollname || teamData.liga}
                    </span>
                  </div>
                </div>
              </div>
              
            </div>
          )}
        </div>
      </AnimatedDiv>
    </div>
  )
} 
