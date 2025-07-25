'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconClock, IconMapPin, IconCalendar, IconX, IconUser, IconTrophy, IconCards } from '@tabler/icons-react'
import dynamic from 'next/dynamic'
import { teamService } from '@/services/teamService'
import { GameDetails, TeamId } from '@/types/strapi'
import Image from "next/image";

const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

const AnimatedDiv = dynamic(
  () => import('@/components/AnimatedSection').then(mod => ({ default: mod.AnimatedDiv })),
  { ssr: false }
)

interface GameCardProps {
  type: 'last' | 'next'
  homeTeam: string
  awayTeam: string
  homeScore?: number
  awayScore?: number
  date: string
  time: string
  isHome: boolean
  onClick: () => void
}



// Funktion zur Bestimmung des Team-Logos basierend auf dem Teamnamen
const getTeamLogo = (teamName: string): string | undefined => {
  const teamLogos: { [key: string]: string } = {
    'SV Viktoria Wertheim': '/viktorialogo.png',
    'Viktoria Wertheim': '/viktorialogo.png',
    'FC Eichel': '/fceichel.png',
    'TSV Assamstadt': '/Assamstadt.png',
    'Türkgücü Wertheim': '/Türkgücü.png',
    'Türk Gücü Wertheim': '/Türkgücü.png', // Backend-Schreibweise
    'TSV Tauberbischofsheim': '/Tauberbischofsheim.png',
    'FV Brehmbachtal': '/Brehmbachtal.png',
    'SV Brehmbachtal': '/Brehmbachtal.png',
    'SV Pülfringen': '/Pülfringen.png',
    'SG Pülfringen': '/Pülfringen.png',
    'TSV Kreuzwertheim': '/Kreuzwertheim.png',
    'SV Kreuzwertheim': '/Kreuzwertheim.png',
    'FC Hundheim-Steinbach': '/Hundheim.png',
    'TSV Hundheim': '/Hundheim.png',
    'SpG Schwabhausen/Windischbuch': '/Scwabhausen.png',
    'SV Schwabhausen': '/Scwabhausen.png',
    'FC Umpfertal': '/Umpfertal.png',
    'SG Umpfertal': '/Umpfertal.png',
    'SV Schönfeld': '/Schönfeld.png',
    'Kickers DHK Wertheim': '/Kickers.png',
    'Kickers Würzburg': '/Kickers.png',
    'FC Kickers': '/Kickers.png',
    'SG RaMBo': '/Rambo.png',
    'VfR Gerlachsheim': '/Gerlachsheim.png',
    'VfB Reicholzheim': '/Reichholzheim.png',
    'TuS Großrinderfeld': '/Großrinderfeld.png',
  }
  
  // Exakte Übereinstimmung
  if (teamLogos[teamName]) {
    return teamLogos[teamName]
  }
  
  // Partielle Übereinstimmung für flexiblere Namen
  for (const [key, logo] of Object.entries(teamLogos)) {
    if (teamName.toLowerCase().includes(key.toLowerCase().split(' ')[1]) || 
        key.toLowerCase().includes(teamName.toLowerCase().split(' ')[1])) {
      return logo
    }
  }
  
  return undefined
}

const GameCard = ({ type, homeTeam, awayTeam, homeScore, awayScore, date, time, isHome, onClick }: GameCardProps) => {
  // Helper function to check if team name is Viktoria (handles variations)
  const isViktoriaTeam = (teamName: string) => {
    return teamName.includes('Viktoria Wertheim') || teamName.includes('Viktoria')
  }
  
  // Funktion zur Bestimmung der Ergebnisfarbe basierend auf dem Spielausgang
  const getResultColor = () => {
    if (type !== 'last' || homeScore === undefined || awayScore === undefined) {
      return 'text-gray-800'
    }
    
    const isViktoriaHome = isViktoriaTeam(homeTeam)
    const viktoriaScore = isViktoriaHome ? homeScore : awayScore
    const opponentScore = isViktoriaHome ? awayScore : homeScore
    
    if (viktoriaScore > opponentScore) {
      return 'text-green-600' // Sieg
    } else if (viktoriaScore < opponentScore) {
      return 'text-red-600' // Niederlage
    } else {
      return 'text-gray-600' // Unentschieden
    }
  }
  
  // Logos für Home und Away Teams
  const homeLogo = getTeamLogo(homeTeam)
  const awayLogo = getTeamLogo(awayTeam)
  
  return (
    <div 
      className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-6 overflow-hidden cursor-pointer md:min-h-[240px] shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0"
      onClick={onClick}
    >
      <div className="mb-2 md:mb-4 text-center">
        <div className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
          {type === 'last' ? 'Last' : 'Next'}
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-3 md:mb-8">
        {/* Home Team */}
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 mb-2 md:mb-3">
            {homeLogo ? (
              <Image 
                src={homeLogo} 
                alt={`${homeTeam} Logo`}
                width={64}
                height={64}
                className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-sm"
                priority
              />
            ) : (
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs md:text-base">{homeTeam.charAt(0)}</span>
              </div>
            )}
          </div>
          {/* Team Name - nur auf Desktop anzeigen */}
          <div className="hidden md:block text-center px-2 mb-2">
            <p className="text-gray-800 dark:text-gray-200 text-sm font-semibold leading-tight max-w-32 line-clamp-2">
              {homeTeam}
            </p>
          </div>
          {/* Time - centered under logo/team name */}
          <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 text-center">
            {time}
          </div>
        </div>
        
        {/* Score/VS */}
        <div className="text-center px-2 md:px-6 flex-shrink-0">
          {type === 'last' && homeScore !== undefined && awayScore !== undefined ? (
            <div className={`font-bold text-xl md:text-4xl ${getResultColor()} ${getResultColor() === 'text-green-600' ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' : ''}`} style={{ lineHeight: '1' }}>
              <span style={{ letterSpacing: 'normal' }}>{homeScore}</span>
              <span 
                className="relative"
                style={{ 
                  top: '-0.1em', 
                  margin: '0 0.08em'
                }}
              >:</span>
              <span style={{ letterSpacing: 'normal' }}>{awayScore}</span>
            </div>
          ) : (
            <div 
              className="font-medium text-gray-800 dark:text-white text-lg md:text-3xl font-sans tracking-tight drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
            >
              VS
            </div>
          )}
        </div>
        
        {/* Away Team */}
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 mb-2 md:mb-3">
            {awayLogo ? (
              <Image 
                src={awayLogo} 
                alt={`${awayTeam} Logo`}
                width={64}
                height={64}
                className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-sm"
                priority
              />
            ) : (
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs md:text-base">{awayTeam.charAt(0)}</span>
              </div>
            )}
          </div>
          {/* Team Name - nur auf Desktop anzeigen */}
          <div className="hidden md:block text-center px-2 mb-2">
            <p className="text-gray-800 dark:text-gray-200 text-sm font-semibold leading-tight max-w-32 line-clamp-2">
              {awayTeam}
            </p>
          </div>
          {/* Date - centered under logo/team name */}
          <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 text-center">
            {(() => {
              // Robust format: TT.MM.
              const parts = date.split(".");
              if (parts.length >= 2) {
                const day = parts[0].padStart(2, "0");
                const month = parts[1].padStart(2, "0");
                return `${day}.${month}.`;
              }
              return date;
            })()}
          </div>
        </div>
      </div>

    </div>
  )
}

interface GameCardsProps {
  selectedTeam: '1' | '2' | '3'
}

export default function GameCards({ selectedTeam }: GameCardsProps) {
  const [selectedGame, setSelectedGame] = useState<GameDetails | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [lastGame, setLastGame] = useState<GameDetails | null>(null)
  const [nextGame, setNextGame] = useState<GameDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const openGameModal = (game: GameDetails) => {
    setSelectedGame(game)
    setIsModalOpen(true)
  }
  
  const closeGameModal = () => {
    setSelectedGame(null)
    setIsModalOpen(false)
  }

  // Fetch team-specific games from API
  useEffect(() => {
    const fetchTeamGames = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const { lastGame: fetchedLastGame, nextGame: fetchedNextGame } = await teamService.fetchLastAndNextGame(selectedTeam as TeamId)
        
        setLastGame(fetchedLastGame)
        setNextGame(fetchedNextGame)
      } catch (err) {
        console.error('Error fetching team games:', err)
        setError('Spiele konnten nicht geladen werden')
        setLastGame(null)
        setNextGame(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamGames()
  }, [selectedTeam])
   
  // Funktion zur Bestimmung der Ergebnisfarbe für das letzte Aufeinandertreffen
  const getResultColor = (result: string, location: string) => {
    if (!result || !location) return 'text-gray-600'
    
    const [homeScore, awayScore] = result.split(':').map(Number)
    
    // Validierung der Scores
    if (isNaN(homeScore) || isNaN(awayScore)) return 'text-gray-600'
    
    // Bestimme, ob Viktoria Heim- oder Auswärtsteam war
    const isViktoriaHome = location.toLowerCase() === 'heim'
    const viktoriaScore = isViktoriaHome ? homeScore : awayScore
    const opponentScore = isViktoriaHome ? awayScore : homeScore
    
    if (viktoriaScore > opponentScore) {
      return 'text-green-600' // Sieg
    } else if (viktoriaScore < opponentScore) {
      return 'text-red-600' // Niederlage  
    } else {
      return 'text-gray-600' // Unentschieden
    }
  }
  
  // Helper function to check if team name is Viktoria (handles variations)
  const isViktoriaTeam = (teamName: string) => {
    return teamName.includes('Viktoria Wertheim') || teamName.includes('Viktoria')
  }

  // Funktion zur Bestimmung der Ergebnisfarbe für das Modal
  const getModalResultColor = (game: GameDetails) => {
    if (game.type !== 'last' || game.homeScore === undefined || game.awayScore === undefined) {
      return 'text-viktoria-blue'
    }
    
    const isViktoriaHome = isViktoriaTeam(game.homeTeam)
    const viktoriaScore = isViktoriaHome ? game.homeScore : game.awayScore
    const opponentScore = isViktoriaHome ? game.awayScore : game.homeScore
    
    if (viktoriaScore > opponentScore) {
      return 'text-green-600' // Sieg
    } else if (viktoriaScore < opponentScore) {
      return 'text-red-600' // Niederlage
    } else {
      return 'text-gray-600' // Unentschieden
    }
  }
  
  // Mannschaftsspezifische Team-Namen
  const getTeamName = (team: '1' | '2' | '3') => {
    switch (team) {
      case '1': return '1. Mannschaft'
      case '2': return '2. Mannschaft'
      case '3': return '3. Mannschaft'
      default: return '1. Mannschaft'
    }
  }

  // Get display name for team (for UI display)
  const getTeamDisplayName = (team: '1' | '2' | '3') => {
    switch (team) {
      case '1': return 'SV Viktoria Wertheim'
      case '2': return 'SV Viktoria Wertheim II'
      case '3': return 'SV Viktoria Wertheim III'
      default: return 'SV Viktoria Wertheim'
    }
  }

  // Check if a team name matches the selected team (handles variations)
  const isSelectedTeam = (teamName: string, selectedTeam: '1' | '2' | '3') => {
    const teamVariations = {
      '1': ['1. Mannschaft', 'SV Viktoria Wertheim', 'Viktoria Wertheim', 'Viktoria'],
      '2': ['2. Mannschaft', 'SV Viktoria Wertheim II', 'Viktoria Wertheim II', 'Viktoria II'],
      '3': ['3. Mannschaft', 'SV Viktoria Wertheim III', 'Viktoria Wertheim III', 'Viktoria III']
    }
    
    return teamVariations[selectedTeam].some(variation => 
      teamName.includes(variation) || variation.includes(teamName)
    )
  }


  
  return (
    <>
      <AnimatedSection className="py-0" delay={0}>
        <div className="container max-w-6xl">
          <div className="grid grid-cols-2 gap-4 md:gap-8">
            {/* Letztes Spiel */}
            {error ? (
              <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl p-3 md:p-6 border-2 border-white/80 dark:border-white/[0.15] md:min-h-[240px] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-red-400 mb-2">⚠️</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {error}
                  </p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="text-xs text-viktoria-blue hover:text-viktoria-blue-light underline"
                  >
                    Neu laden
                  </button>
                </div>
              </div>
            ) : lastGame ? (
              <GameCard
                {...lastGame}
                onClick={() => openGameModal(lastGame)}
              />
            ) : (
              <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl p-3 md:p-6 border-2 border-white/80 dark:border-white/[0.15] md:min-h-[240px] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">⚽</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Kein letztes Spiel für {getTeamName(selectedTeam)} verfügbar
                  </p>
                </div>
              </div>
            )}
            
            {/* Nächstes Spiel */}
            {error ? (
              <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl p-3 md:p-6 border-2 border-white/80 dark:border-white/[0.15] md:min-h-[240px] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-red-400 mb-2">⚠️</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {error}
                  </p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="text-xs text-viktoria-blue hover:text-viktoria-blue-light underline"
                  >
                    Neu laden
                  </button>
                </div>
              </div>
            ) : nextGame ? (
              <GameCard
                {...nextGame}
                onClick={() => openGameModal(nextGame)}
              />
            ) : (
              <div className="bg-gray-100/40 dark:bg-white/[0.04] backdrop-blur-lg rounded-xl md:rounded-2xl p-3 md:p-6 border-2 border-white/80 dark:border-white/[0.15] md:min-h-[240px] shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_1px_8px_rgba(255,255,255,0.05)] flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">📅</div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Kein nächstes Spiel für {getTeamName(selectedTeam)} geplant
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </AnimatedSection>
      
      {/* Game Modal */}
      {isModalOpen && selectedGame && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 touch-manipulation"
          onClick={closeGameModal}
        >
          <div 
            className="bg-white/95 dark:bg-white/[0.04] backdrop-blur-sm rounded-xl sm:rounded-2xl max-w-sm sm:max-w-md md:max-w-lg w-full mx-2 sm:mx-4 md:mx-0 border border-white/40 dark:border-white/[0.08] shadow-2xl max-h-[90vh] sm:max-h-[85vh] md:max-h-[90vh] overflow-y-auto transform transition-all duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header with Date/Time and Close Button */}
            <div className="relative rounded-t-xl pt-6 px-4 pb-4 md:pt-8 md:px-6 md:pb-6">
              <div className="flex items-center justify-between h-8">
                {/* Empty left space for balance */}
                <div className="w-8"></div>
                
                {/* Date and Time - Centered */}
                <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                  <IconClock size={14} />
                  <span className="text-sm">{selectedGame.time}</span>
                  <IconCalendar size={14} />
                  <span className="text-sm">{selectedGame.date}</span>
                </div>
                
                {/* Close Button */}
                <button
                  onClick={closeGameModal}
                  className="w-10 h-10 sm:w-8 sm:h-8 bg-gray-100/80 dark:bg-white/[0.04] hover:bg-white/30 dark:hover:bg-white/[0.04] active:bg-white/40 dark:active:bg-white/[0.06] backdrop-blur-md border border-white/40 dark:border-white/[0.08] rounded-full flex items-center justify-center transition-all duration-200 touch-manipulation transform active:scale-95"
                  aria-label="Modal schließen"
                >
                  <IconX className="text-gray-600 dark:text-gray-300" size={20} />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="pt-4 px-4 pb-6 sm:px-6 md:pt-6 md:px-6 md:pb-8 space-y-4 sm:space-y-6 md:space-y-8">

              {/* Teams with Score/VS */}
              <div className="relative mb-6 md:mb-8">
                <div className="grid grid-cols-2 gap-4 md:gap-6 items-center">
                  {/* Home Team */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-1 md:mb-2">
                      {getTeamLogo(selectedGame.homeTeam) ? (
                        <Image 
                          src={getTeamLogo(selectedGame.homeTeam)!} 
                          alt={`${selectedGame.homeTeam} Logo`}
                          width={64}
                          height={64}
                          className="w-12 h-12 md:w-16 md:h-16 object-contain drop-shadow-sm"
                          priority
                        />
                      ) : (
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-400 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm md:text-base">{selectedGame.homeTeam.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 text-sm font-medium text-center leading-tight">
                      {selectedGame.homeTeam}
                    </p>
                  </div>
                  
                  {/* Away Team */}
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-1 md:mb-2">
                      {getTeamLogo(selectedGame.awayTeam) ? (
                        <Image 
                          src={getTeamLogo(selectedGame.awayTeam)!} 
                          alt={`${selectedGame.awayTeam} Logo`}
                          width={64}
                          height={64}
                          className="w-12 h-12 md:w-16 md:h-16 object-contain drop-shadow-sm"
                          priority
                        />
                      ) : (
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-400 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">{selectedGame.awayTeam.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-800 dark:text-gray-200 text-sm font-medium text-center leading-tight">
                      {selectedGame.awayTeam}
                    </p>
                  </div>
                </div>
                
                {/* Score/VS - Absolutely positioned between logos */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 flex items-center justify-center h-12 md:h-16">
                  {selectedGame.type === 'last' && selectedGame.homeScore !== undefined && selectedGame.awayScore !== undefined ? (
                    <div className={`${getModalResultColor(selectedGame)} font-bold text-3xl md:text-4xl ${getModalResultColor(selectedGame) === 'text-green-600' ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' : ''}`}>
                      {selectedGame.homeScore}:{selectedGame.awayScore}
                    </div>
                  ) : (
                    <div className="text-gray-800 dark:text-white font-extrabold text-2xl md:text-3xl font-sans tracking-tight drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">
                      VS
                    </div>
                  )}
                </div>
              </div>

              {/* Spiel-Infos */}
              <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
                <div className="text-center">
                  <IconMapPin className="text-viktoria-blue dark:text-viktoria-yellow mx-auto mb-1 md:mb-2" size={18} />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Stadion</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight">{selectedGame.stadium}</p>
                </div>
                <div className="text-center">
                  <IconUser className="text-viktoria-blue dark:text-viktoria-yellow mx-auto mb-1 md:mb-2" size={18} />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Schiedsrichter</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-tight">{selectedGame.referee}</p>
                </div>
              </div>
              
              {/* Letztes Spiel - Statistiken */}
              {selectedGame.type === 'last' && (
                <div className="space-y-4">
                  {/* Torschützen */}
                  {selectedGame.goalScorers && selectedGame.goalScorers.length > 0 && (
                    <div className="bg-gradient-to-r from-viktoria-blue to-viktoria-blue-light dark:from-gray-800 dark:to-gray-700 rounded-lg p-3 md:p-4">
                      <h3 className="text-viktoria-yellow dark:text-viktoria-yellow font-semibold mb-3 text-center text-sm flex items-center justify-center">
                        <IconTrophy className="mr-2" size={18} />
                        Torschützen
                      </h3>
                      <div className="space-y-2">
                        {selectedGame.goalScorers.map((goal, index) => (
                          <div key={index} className="flex items-center justify-between bg-white/10 dark:bg-white/5 rounded-md p-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-viktoria-yellow text-viktoria-blue rounded-full flex items-center justify-center text-xs font-bold">
                                {goal.minute}&apos;
                              </div>
                              <span className="text-white dark:text-gray-200 font-medium text-sm">
                                {goal.player}
                              </span>
                            </div>
                            <div className="text-xs text-viktoria-yellow dark:text-gray-300">
                              {goal.team === 'home' ? selectedGame.homeTeam : selectedGame.awayTeam}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Karten */}
                  {((selectedGame.yellowCards && selectedGame.yellowCards.length > 0) || 
                    (selectedGame.redCards && selectedGame.redCards.length > 0)) && (
                    <div className="bg-gradient-to-r from-viktoria-blue to-viktoria-blue-light dark:from-gray-800 dark:to-gray-700 rounded-lg p-3 md:p-4">
                      <h3 className="text-viktoria-yellow dark:text-viktoria-yellow font-semibold mb-3 text-center text-sm flex items-center justify-center">
                        <IconCards className="mr-2" size={18} />
                        Karten
                      </h3>
                      <div className="space-y-2">
                        {/* Gelbe Karten */}
                        {selectedGame.yellowCards && selectedGame.yellowCards.map((card, index) => (
                          <div key={`yellow-${index}`} className="flex items-center justify-between bg-white/10 dark:bg-white/5 rounded-md p-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-viktoria-yellow rounded-full flex items-center justify-center text-xs font-bold text-gray-800">
                                {card.minute}&apos;
                              </div>
                              <div className="w-3 h-4 bg-viktoria-yellow rounded-sm"></div>
                              <span className="text-white dark:text-gray-200 font-medium text-sm">
                                {card.player}
                              </span>
                            </div>
                            <div className="text-xs text-viktoria-yellow dark:text-gray-300">
                              {card.team === 'home' ? selectedGame.homeTeam : selectedGame.awayTeam}
                            </div>
                          </div>
                        ))}
                        
                        {/* Rote Karten */}
                        {selectedGame.redCards && selectedGame.redCards.map((card, index) => (
                          <div key={`red-${index}`} className="flex items-center justify-between bg-white/10 dark:bg-white/5 rounded-md p-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                                {card.minute}&apos;
                              </div>
                              <div className="w-3 h-4 bg-red-500 rounded-sm"></div>
                              <span className="text-white dark:text-gray-200 font-medium text-sm">
                                {card.player}
                              </span>
                            </div>
                            <div className="text-xs text-viktoria-yellow dark:text-gray-300">
                              {card.team === 'home' ? selectedGame.homeTeam : selectedGame.awayTeam}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Nächstes Spiel - Letztes Aufeinandertreffen */}
              {selectedGame.type === 'next' && selectedGame.lastMeeting && (
                <div className="bg-gradient-to-r from-viktoria-blue to-viktoria-blue-light dark:from-gray-800 dark:to-gray-700 rounded-lg p-3 md:p-4">
                  <h3 className="text-viktoria-yellow dark:text-viktoria-yellow font-semibold mb-3 text-center text-sm flex items-center justify-center">
                    <IconTrophy className="mr-2" size={18} />
                    Letztes Aufeinandertreffen
                  </h3>
                  <div className="bg-white/10 dark:bg-white/5 rounded-md p-3">
                    <div className="text-center mb-2">
                      <div className={`font-bold text-2xl md:text-3xl ${getResultColor(selectedGame.lastMeeting.result, selectedGame.lastMeeting.location)} ${getResultColor(selectedGame.lastMeeting.result, selectedGame.lastMeeting.location) === 'text-green-600' ? 'drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]' : getResultColor(selectedGame.lastMeeting.result, selectedGame.lastMeeting.location) === 'text-red-600' ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'drop-shadow-[0_0_8px_rgba(156,163,175,0.3)]'}`}>
                        {selectedGame.lastMeeting.result}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2 text-viktoria-yellow dark:text-gray-300">
                        <IconCalendar size={14} />
                        <span>{selectedGame.lastMeeting.date}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-viktoria-yellow dark:text-gray-300">
                        <IconMapPin size={14} />
                        <span>{selectedGame.lastMeeting.location === 'heim' ? 'Heimspiel' : 'Auswärtsspiel'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
} 
