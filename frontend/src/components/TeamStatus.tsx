'use client'

import React, { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { IconCircle1, IconCircle2, IconCircle3, IconTrendingUp, IconTrendingDown, IconMinus } from '@tabler/icons-react'
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



  const getTeamIcon = (team: TeamId, isSelected: boolean) => {
    const iconClass = isSelected 
      ? "text-gray-800" // Dunkle Schrift für aktiven Button auf gelbem Hintergrund
      : "text-gray-700 dark:text-gray-300"; // Normale Schrift für inaktive Buttons
    
    switch (team) {
      case '1': return <IconCircle1 size={24} className={iconClass} strokeWidth={2.5} />
      case '2': return <IconCircle2 size={24} className={iconClass} strokeWidth={2.5} />
      case '3': return <IconCircle3 size={24} className={iconClass} strokeWidth={2.5} />
      default: return <IconCircle1 size={24} className={iconClass} strokeWidth={2.5} />
    }
  }

  const getTrendIcon = (trend?: 'steigend' | 'neutral' | 'fallend') => {
    const iconClass = "text-gray-600 dark:text-gray-400"
    
    switch (trend) {
      case 'steigend': return <IconTrendingUp size={16} className="text-green-500" strokeWidth={2} />
      case 'fallend': return <IconTrendingDown size={16} className="text-red-500" strokeWidth={2} />
      case 'neutral':
      default: return <IconMinus size={16} className={iconClass} strokeWidth={2} />
    }
  }

  return (
    <div className="container max-w-6xl">
      <div
        className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0"
        data-testid="team-status"
      >
        {/* Mannschaftsauswahl Buttons */}
        <div className="relative z-10 px-8 py-6 md:px-12 md:py-8">
          {/* Titel */}
          <div className="text-center mb-6 md:mb-8">
            <h3 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
              Mannschaften
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 items-center mb-6 md:mb-8">
            {(['1', '2', '3'] as TeamId[]).map((team) => (
              <div key={team} className="flex justify-center">
                <button
                  onClick={() => handleTeamChange(team)}
                  className={`
                    min-h-[36px] min-w-[48px] 
                    px-4 py-1.5 sm:px-6 sm:py-1.5 md:px-8 md:py-2 
                    rounded-lg text-sm md:text-base font-semibold 
                    transition-all duration-300 
                    whitespace-nowrap flex items-center justify-center gap-2
                    touch-manipulation
                    active:scale-95
                    ${selectedTeam === team
                      ? 'bg-viktoria-yellow text-gray-800 shadow-sm shadow-viktoria-yellow/20'
                      : 'bg-white/10 backdrop-blur-sm text-gray-700 dark:text-gray-200 hover:bg-white/15 hover:text-gray-600 dark:hover:text-white border border-white/20 hover:border-white/30 shadow-sm hover:shadow-md'
                    }
                  `}
                  aria-label={`${team}. Mannschaft auswählen`}
                  role="tab"
                  aria-selected={selectedTeam === team}
                >
                  <span className="block sm:hidden">{getTeamIcon(team, selectedTeam === team)}</span>
                  <span className="hidden sm:flex items-center gap-1">
                    {getTeamIcon(team, selectedTeam === team)}
                    <span className="hidden md:inline">Mannschaft</span>
                  </span>
                </button>
              </div>
            ))}
          </div>



          {/* Team Data Display - Always show, no loading states */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 md:gap-8 items-end transition-all duration-500 ease-in-out">
              
              {/* Platz - Links */}
              <div className="text-center">
                <div className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2">
                  Platz
                </div>
                <div className="flex items-center justify-center h-8 md:h-10">
                  <div className="flex items-center gap-2">
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 transition-all duration-300">
                      {teamData?.tabellenplatz || '-'}
                    </div>
                    {teamData?.trend && (
                      <div className="flex items-center">
                        {getTrendIcon(teamData.trend)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="text-center">
                <div className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2">
                  Form
                </div>
                <div className="flex items-center justify-center h-8 md:h-10">
                  <div className="flex space-x-1">
                    {(teamData?.form_letzte_5 || '-----').split('').map((result, index) => (
                      <div
                        key={index}
                        className={`w-4 h-4 md:w-5 md:h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                          result === 'S' ? 'bg-green-500 text-white' :
                          result === 'U' ? 'bg-yellow-500 text-white' :
                          result === 'N' ? 'bg-red-500 text-white' :
                          'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        {result !== '-' ? result : ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Liga - Rechts */}
              <div className="text-center">
                <div className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide mb-2">
                  Liga
                </div>
                <div className="flex items-center justify-center h-8 md:h-10">
                  <div className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 leading-tight text-center max-w-full overflow-hidden">
                    <span className="block sm:hidden">
                      {teamData?.liga ? 
                        teamData.liga.split(' ').slice(0, 2).join(' ') : 
                        '-'
                      }
                    </span>
                    <span className="hidden sm:block">
                      {teamData?.liga || '-'}
                    </span>
                  </div>
                </div>
              </div>
              
            </div>
        </div>
      </div>
    </div>
  )
} 
