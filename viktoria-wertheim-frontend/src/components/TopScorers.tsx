'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { IconTrophy } from '@tabler/icons-react'
import dynamic from 'next/dynamic'

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

const TopScorers = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Hilfsfunktion zur Aufteiling von Vor- und Nachnamen
  const splitName = (fullName: string) => {
    const parts = fullName.split(' ')
    const lastName = parts[parts.length - 1]
    const firstName = parts.slice(0, -1).join(' ')
    return { firstName, lastName }
  }
  
  const topScorers: TopScorer[] = [
    {
      position: 1,
      name: 'Okan Cirakoglu',
      team: 'Viktoria Wertheim',
      goals: 19,
      games: 16,
      isOwnPlayer: true
    },
    {
      position: 2,
      name: 'Silas Jacob',
      team: 'Viktoria Wertheim',
      goals: 15,
      games: 18,
      isOwnPlayer: true
    },
    {
      position: 3,
      name: 'Justin Schulz',
      team: 'Viktoria Wertheim',
      goals: 12,
      games: 17,
      isOwnPlayer: true
    },
    {
      position: 4,
      name: 'Marco Klein',
      team: 'Viktoria Wertheim',
      goals: 11,
      games: 18,
      isOwnPlayer: true
    },
    {
      position: 5,
      name: 'David Bauer',
      team: 'Viktoria Wertheim',
      goals: 10,
      games: 16,
      isOwnPlayer: true
    },
    {
      position: 6,
      name: 'Alex Schmidt',
      team: 'Viktoria Wertheim',
      goals: 9,
      games: 18,
      isOwnPlayer: true
    }
  ]

  const displayedScorers = isExpanded ? topScorers : topScorers.slice(0, 3)

  return (
    <AnimatedSection>
      <div className="container max-w-6xl">
        <div
          className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl md:rounded-2xl border border-white/40 dark:border-white/[0.03] overflow-hidden cursor-pointer hover:bg-white/30 dark:hover:bg-white/[0.04] transition-all duration-300 shadow-2xl hover:shadow-3xl shadow-black/20 hover:shadow-black/30 dark:shadow-white/[0.25] dark:hover:shadow-white/[0.35]"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {/* Title Header */}
          <div className="px-4 md:px-8 py-3 md:py-4 text-center">
            <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Torschützen König
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
                    ? 'bg-viktoria-blue-light rounded-lg md:rounded-xl hover:bg-viktoria-blue hover:shadow-lg hover:shadow-viktoria-blue/20 hover:scale-[1.02] cursor-pointer' 
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
      </div>
    </AnimatedSection>
  )
}

export default TopScorers 