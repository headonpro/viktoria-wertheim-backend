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
        className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl border border-white/40 dark:border-white/[0.08] hover:bg-white/30 dark:hover:bg-white/[0.04] transition-all duration-300 shadow-lg hover:shadow-xl dark:shadow-white/[0.05] dark:hover:shadow-white/[0.08] overflow-hidden"
        delay={0.1}
      >
        {/* Kompakte horizontale Anordnung mit Grid */}
        <div className="px-4 py-3 md:px-6 md:py-4">
          <div className="grid grid-cols-3 gap-4 items-end">
            
            {/* Platz - Links */}
            <div className="text-center">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
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
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                Form
              </div>
              <div className="flex space-x-1 justify-center items-center h-6 md:h-8">
                {teamData.formLetzten5.map((result, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 md:w-4 md:h-4 rounded-full flex items-center justify-center text-xs font-bold ${getFormColor(result)} transition-all duration-200 hover:scale-110 shadow-sm`}
                  >
                    {getFormText(result)}
                  </div>
                ))}
              </div>
            </div>

            {/* Liga - Rechts */}
            <div className="text-center">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
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