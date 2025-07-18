'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { IconTrendingUp, IconTrendingDown, IconArrowRight } from '@tabler/icons-react'
import { leagueService } from '@/services/leagueService'

const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

const AnimatedDiv = dynamic(
  () => import('@/components/AnimatedSection').then(mod => ({ default: mod.AnimatedDiv })),
  { ssr: false }
)

export default function TeamStatus() {
  const [teamData, setTeamData] = useState({
    formLetzten5: ['S', 'U', 'S', 'N', 'S'], // Fallback form data
    tabellenplatz: 8, // Fallback position
    platzierungsveraenderung: 'U', // U=gleich
    liga: 'Kreisliga'
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Get Viktoria Wertheim's data from the API
        const viktoriaData = await leagueService.fetchViktoriaStanding()
        
        if (viktoriaData) {
          setTeamData(prev => ({
            ...prev,
            tabellenplatz: viktoriaData.position,
            // Keep other data as fallback for now since API doesn't provide form/trend yet
          }))
        }
      } catch (err) {
        console.error('Failed to fetch team data:', err)
        setError('Daten konnten nicht geladen werden')
        // Keep fallback data on error
      } finally {
        setLoading(false)
      }
    }

    fetchTeamData()
  }, [])

  const getFormColor = (result: string) => {
    switch (result) {
      case 'S': return 'bg-green-500 text-gray-700 shadow-green-500/30 shadow-lg'
      case 'U': return 'bg-gray-400 text-gray-700 shadow-gray-400/30 shadow-lg'
      case 'N': return 'bg-red-500 text-gray-700 shadow-red-500/30 shadow-lg'
      default: return 'bg-gray-400 text-gray-700 shadow-gray-400/30 shadow-lg'
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

  return (
    <div className="container max-w-6xl">
      <AnimatedDiv
        className="bg-white/40 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/50 transition-all duration-300 shadow-lg hover:shadow-xl overflow-hidden"
        delay={0.1}
      >
        {/* Kompakte horizontale Anordnung */}
        <div className="px-4 py-3 md:px-6 md:py-4">
          <div className="relative">
            
            {/* Platz - Links mit festem Abstand */}
            <div className="absolute left-8 md:left-12 text-center">
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                Platz
              </div>
              <div className="flex items-center justify-center space-x-1">
                <div className="text-xl md:text-2xl font-bold text-viktoria-blue">
                  {teamData.tabellenplatz}
                </div>
                <div className="flex items-center">
                  {getTrendIcon(teamData.platzierungsveraenderung)}
                </div>
              </div>
            </div>

            {/* Form - Absolut zentriert */}
            <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                Form
              </div>
              <div className="flex space-x-1 justify-center">
                {teamData.formLetzten5.map((result, index) => (
                  <div
                    key={index}
                    className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-xs font-bold ${getFormColor(result)} transition-all duration-200 hover:scale-110 shadow-sm`}
                  >
                    {getFormText(result)}
                  </div>
                ))}
              </div>
            </div>

            {/* Liga - Rechts mit festem Abstand */}
            <div className="absolute right-8 md:right-12 text-center">
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                Liga
              </div>
              <div className="text-sm md:text-base font-semibold text-viktoria-blue">
                {teamData.liga}
              </div>
            </div>

            {/* Invisible spacer to maintain height */}
            <div className="invisible">
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">
                Platz
              </div>
              <div className="text-xl md:text-2xl font-bold">
                0
              </div>
            </div>
            
          </div>
        </div>
      </AnimatedDiv>
    </div>
  )
} 