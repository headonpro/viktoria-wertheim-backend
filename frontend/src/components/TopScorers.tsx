'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { IconTrophy } from '@tabler/icons-react'
import dynamic from 'next/dynamic'
import axios from 'axios'
import { getApiUrl } from '@/lib/apiConfig'

const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

interface TopScorer {
  position: number
  name: string
  team: string
  goals: number
  games: number
  isOwnPlayer?: boolean
}

interface SpielerStatistikData {
  id: number
  documentId: string
  tore: number
  spiele: number
  assists: number
  spieler: {
    id: number
    documentId: string
    vorname: string
    nachname: string
    position?: string
    status: string
  }
  team: {
    id: number
    documentId: string
    name: string
  }
  saison: {
    id: number
    documentId: string
    name: string
  }
}

const TopScorers = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [topScorers, setTopScorers] = useState<TopScorer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Hilfsfunktion zur Aufteiling von Vor- und Nachnamen
  const splitName = (fullName: string) => {
    const parts = fullName.split(' ')
    const lastName = parts[parts.length - 1]
    const firstName = parts.slice(0, -1).join(' ')
    return { firstName, lastName }
  }

  // API-Daten laden
  useEffect(() => {
    const fetchTopScorers = async () => {
      try {
        setLoading(true)
        const response = await axios.get(`${getApiUrl()}/api/spielerstatistiks`, {
          params: {
            sort: 'tore:desc',
            'filters[tore][$gt]': 0,
            'pagination[limit]': 10,
            'populate[0]': 'spieler',
            'populate[1]': 'team',
            'populate[2]': 'saison'
          }
        })

        const spielerStatistikData: SpielerStatistikData[] = response.data.data
        const formattedScorers: TopScorer[] = spielerStatistikData.map((statistik, index) => ({
          position: index + 1,
          name: `${statistik.spieler.vorname || 'Unbekannt'} ${statistik.spieler.nachname || ''}`.trim(),
          team: statistik.team?.name || 'Viktoria Wertheim',
          goals: statistik.tore,
          games: statistik.spiele,
          isOwnPlayer: true
        }))

        setTopScorers(formattedScorers)
        setError(null)
      } catch (err) {
        console.error('Fehler beim Laden der Torschützendaten:', err)
        setError('Torschützendaten konnten nicht geladen werden')
        // Fallback zu statischen Daten
        setTopScorers([
          { position: 1, name: 'Thomas Müller', team: 'Viktoria Wertheim', goals: 12, games: 18, isOwnPlayer: true },
          { position: 2, name: 'Michael Schmidt', team: 'Viktoria Wertheim', goals: 9, games: 18, isOwnPlayer: true },
          { position: 3, name: 'Patrick Weber', team: 'Viktoria Wertheim', goals: 8, games: 17, isOwnPlayer: true }
        ])
      } finally {
        setLoading(false)
      }
    }

    fetchTopScorers()
  }, [])

  const displayedScorers = isExpanded ? topScorers : topScorers.slice(0, 5)

  if (loading) {
    return (
      <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)]">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mx-auto mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl border-2 border-white/80 dark:border-white/[0.15] overflow-hidden cursor-pointer hover:bg-gray-100/50 dark:hover:bg-white/[0.06] transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] dark:hover:shadow-[0_6px_20px_rgba(255,255,255,0.12),0_2px_10px_rgba(255,255,255,0.08)] hover:transform hover:translateY(-2px)"
      onClick={() => setIsExpanded(!isExpanded)}
    >
          {/* Title Header */}
          <div className="px-4 md:px-8 py-3 md:py-4 text-center">
            <h2 className="text-xs md:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Torschützenkönig
            </h2>
          </div>

          {/* Table Header */}
          <div className="px-4 md:px-8 py-3 md:py-3">
            <div className="grid grid-cols-12 gap-2 md:gap-4 text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              <div className="col-span-1">#</div>
              <div className="col-span-7">Spieler</div>
              <div className="col-span-2 text-center">Spiele</div>
              <div className="col-span-2 text-center font-bold">Tore</div>
            </div>
          </div>

          {/* Top Scorers */}
          <div className="divide-y divide-white/10">
            {displayedScorers.map((scorer, index) => (
              <div
                key={scorer.position}
                className={`px-4 md:px-8 py-3 md:py-4 transition-all duration-300 relative overflow-hidden ${
                  scorer.position === 1 
                    ? 'bg-gray-900/80 dark:bg-gray-800/90 rounded-lg md:rounded-xl hover:bg-gray-900/90 dark:hover:bg-gray-800/95 hover:shadow-lg hover:shadow-gray-900/30 hover:scale-[1.02] cursor-pointer' 
                    : 'hover:bg-white/30'
                }`}
              >
                {/* Holo-Schimmer-Effekt für Torschützenkönig */}
                {scorer.position === 1 && (
                  <>
                    {/* Prismatische Textur-Basis */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer z-0"></div>
                    
                    {/* Regenbogen-Prisma-Effekt */}
                    <div className="absolute inset-0 animate-shimmer-slow z-0" style={{
                      background: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 2px,
                        rgba(255, 0, 150, 0.1) 4px,
                        rgba(0, 255, 255, 0.1) 6px,
                        rgba(255, 255, 0, 0.1) 8px,
                        rgba(150, 0, 255, 0.1) 10px,
                        transparent 12px
                      )`
                    }}></div>
                    
                    {/* Zusätzlicher Glanz-Schimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-viktoria-yellow/15 to-transparent animate-shimmer-slow z-0 mix-blend-overlay"></div>
                    
                    {/* Zweiter Schimmer-Streifen für mehr Tiefe */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-shimmer z-0" style={{
                      animationDelay: '1.5s',
                      transform: 'skewX(-15deg)'
                    }}></div>
                    
                    {/* Prismatische Lichtbrechung */}
                    <div className="absolute inset-0 animate-prisma-shift z-0" style={{
                      background: `linear-gradient(
                        45deg,
                        transparent,
                        rgba(255, 0, 100, 0.15) 25%,
                        rgba(0, 255, 255, 0.15) 50%,
                        rgba(255, 255, 0, 0.15) 75%,
                        transparent
                      )`,
                      width: '200%',
                      height: '200%',
                      top: '-50%',
                      left: '-50%'
                    }}></div>
                  </>
                )}
                <div className="grid grid-cols-12 gap-2 md:gap-4 items-center relative z-10">
                  {/* Position */}
                  <div className="col-span-1 flex items-center">
                    {scorer.position === 1 ? (
                      <IconTrophy className="text-viktoria-yellow w-5 h-5 md:w-6 md:h-6" />
                    ) : (
                      <span className={`font-bold text-sm md:text-lg ${
                        scorer.position === 2 ? 'text-gray-600 dark:text-gray-300' :
                        'text-gray-700 dark:text-gray-300'
                      }`}>
                        {scorer.position}.
                      </span>
                    )}
                  </div>

                  {/* Player Name */}
                  <div className="col-span-7">
                    {scorer.position === 1 ? (
                      <span className="text-viktoria-yellow font-semibold text-sm md:text-base">
                        <span className="font-light">{splitName(scorer.name).firstName}</span>
                        {' '}
                        <span className="font-bold">{splitName(scorer.name).lastName}</span>
                      </span>
                    ) : (
                      <span className={`text-sm md:text-base ${
                        scorer.position === 2 ? 'text-gray-700 dark:text-gray-200 font-medium' :
                        'text-gray-700 dark:text-gray-200'
                      }`}>
                        <span className="font-light">{splitName(scorer.name).firstName}</span>
                        {' '}
                        <span className="font-semibold">{splitName(scorer.name).lastName}</span>
                      </span>
                    )}
                  </div>

                  {/* Games */}
                  <div className={`col-span-2 text-center text-sm md:text-base ${
                    scorer.position === 1 ? 'text-viktoria-yellow font-medium' : 'text-gray-600 dark:text-gray-300'
                  }`}>
                    {scorer.games}
                  </div>

                  {/* Goals */}
                  <div className="col-span-2 text-center">
                    <span className={`font-bold ${
                      scorer.position === 1 ? 'text-viktoria-yellow text-lg md:text-xl' :
                      scorer.position === 2 ? 'text-gray-600 dark:text-gray-300 text-sm md:text-base' :
                      'text-gray-800 dark:text-gray-200 text-sm md:text-base'
                    }`}>
                      {scorer.goals}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Expand/Collapse Indicator */}
          <div className="px-4 md:px-8 py-4 md:py-5 text-center transition-colors">
            <div className="flex items-center justify-center space-x-2 text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              <span>{isExpanded ? 'Weniger anzeigen' : 'Alle Torschützen anzeigen'}</span>
              {isExpanded ? <ChevronUp size={16} className="md:w-5 md:h-5" /> : <ChevronDown size={16} className="md:w-5 md:h-5" />}
            </div>
          </div>
    </div>
  )
}

export default TopScorers 
