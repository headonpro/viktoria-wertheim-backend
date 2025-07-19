'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconClock, IconMapPin, IconCalendar, IconX, IconUser, IconTrophy, IconCards } from '@tabler/icons-react'
import dynamic from 'next/dynamic'
import { strapi } from '@/lib/strapi'
import { Spiel } from '@/types/strapi'
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

interface GameDetails {
  type: 'last' | 'next'
  homeTeam: string
  awayTeam: string
  homeScore?: number
  awayScore?: number
  date: string
  time: string
  isHome: boolean
  stadium: string
  referee: string
  goalScorers?: string[]
  yellowCards?: string[]
  redCards?: string[]
  lastMeeting?: {
    date: string
    result: string
    location: string
  }
}

// Funktion zur Bestimmung des Team-Logos basierend auf dem Teamnamen
const getTeamLogo = (teamName: string): string | undefined => {
  const teamLogos: { [key: string]: string } = {
    'SV Viktoria Wertheim': '/viktorialogo.png',
    'Viktoria Wertheim': '/viktorialogo.png',
    'FC Eichel': '/fceichel.png',
    'TSV Assamstadt': '/Assamstadt.png',
    'Türkgücü Wertheim': '/Türkgücü.png',
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
  const isViktoria = homeTeam === 'SV Viktoria Wertheim' || awayTeam === 'SV Viktoria Wertheim' || homeTeam === 'Viktoria Wertheim' || awayTeam === 'Viktoria Wertheim'
  
  // Funktion zur Bestimmung der Ergebnisfarbe basierend auf dem Spielausgang
  const getResultColor = () => {
    if (type !== 'last' || homeScore === undefined || awayScore === undefined) {
      return 'text-gray-800'
    }
    
    const isViktoriaHome = homeTeam === 'SV Viktoria Wertheim' || homeTeam === 'Viktoria Wertheim'
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
      className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl md:rounded-2xl p-3 md:p-6 border border-white/40 dark:border-white/[0.08] hover:bg-white/30 dark:hover:bg-white/[0.04] transition-all duration-300 cursor-pointer md:min-h-[240px] shadow-lg hover:shadow-xl dark:shadow-white/[0.05] dark:hover:shadow-white/[0.08]"
      onClick={onClick}
    >
      <div className="mb-2 md:mb-4 text-center">
        <div className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
          {type === 'last' ? 'Last' : 'Next'}
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-3 md:mb-8">
        {/* Home Team */}
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center justify-center w-10 h-10 md:w-16 md:h-16 mb-0 md:mb-3">
            {homeLogo ? (
              <Image 
                src={homeLogo} 
                alt={`${homeTeam} Logo`}
                width={64}
                height={64}
                className="w-10 h-10 md:w-16 md:h-16 object-contain drop-shadow-sm"
                priority
              />
            ) : (
              <div className="w-10 h-10 md:w-16 md:h-16 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs md:text-base">{homeTeam.charAt(0)}</span>
              </div>
            )}
          </div>
          {/* Team Name - nur auf Desktop anzeigen */}
          <div className="hidden md:block text-center px-2">
            <p className="text-gray-800 dark:text-gray-200 text-sm font-semibold leading-tight max-w-32 line-clamp-2">
              {homeTeam}
            </p>
          </div>
        </div>
        
        {/* Score/VS */}
        <div className="text-center px-2 md:px-6 flex-shrink-0">
          {type === 'last' && homeScore !== undefined && awayScore !== undefined ? (
            <div className={`font-bold text-xl md:text-4xl ${getResultColor()}`} style={{ letterSpacing: '-0.05em', lineHeight: '1' }}>
              {homeScore}<span style={{ position: 'relative', top: '-0.1em' }}>:</span>{awayScore}
            </div>
          ) : (
            <div 
              className="font-medium text-viktoria-blue dark:text-white text-lg md:text-3xl font-sans"
            >
              VS
            </div>
          )}
        </div>
        
        {/* Away Team */}
        <div className="flex flex-col items-center flex-1">
          <div className="flex items-center justify-center w-10 h-10 md:w-16 md:h-16 mb-0 md:mb-3">
            {awayLogo ? (
              <Image 
                src={awayLogo} 
                alt={`${awayTeam} Logo`}
                width={64}
                height={64}
                className="w-10 h-10 md:w-16 md:h-16 object-contain drop-shadow-sm"
                priority
              />
            ) : (
              <div className="w-10 h-10 md:w-16 md:h-16 bg-gray-400 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-xs md:text-base">{awayTeam.charAt(0)}</span>
              </div>
            )}
          </div>
          {/* Team Name - nur auf Desktop anzeigen */}
          <div className="hidden md:block text-center px-2">
            <p className="text-gray-800 dark:text-gray-200 text-sm font-semibold leading-tight max-w-32 line-clamp-2">
              {awayTeam}
            </p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between text-xs md:text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center space-x-1 md:space-x-2">
          <IconClock size={12} className="md:w-4 md:h-4" />
          <span className="text-xs md:text-sm">{time}</span>
        </div>
        <div className="text-xs md:text-sm">
          {date.replace(/(\d{2})\.(\d{2})/, '$1.$2.')}
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
  const [games, setGames] = useState<Spiel[]>([])
  const [loading, setLoading] = useState(true)
  
  const openGameModal = (game: GameDetails) => {
    setSelectedGame(game)
    setIsModalOpen(true)
  }
  
  const closeGameModal = () => {
    setSelectedGame(null)
    setIsModalOpen(false)
  }

  // Fetch games from API
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true)
        const response = await strapi.get('/spiele', {
          params: {
            populate: ['heimmannschaft', 'auswaertsmannschaft'],
            sort: 'datum:desc',
            'pagination[limit]': 10
          }
        })
        
        const apiGames = response.data.data || []
        setGames(apiGames)
      } catch (err) {
        console.error('Error fetching games:', err)
        setGames([])
      } finally {
        setLoading(false)
      }
    }

        fetchGames()
  }, [])

  // Convert Spiel to GameDetails
  const convertSpielToGameDetails = (spiel: Spiel): GameDetails => {
    const now = new Date()
    const spielDatum = new Date(spiel.attributes.datum)
    const isLastGame = spielDatum < now
    const isViktoriaHome = spiel.attributes.heimmannschaft?.data?.attributes?.name === 'SV Viktoria Wertheim';

    return {
      type: isLastGame ? 'last' : 'next',
      homeTeam: isViktoriaHome ? 'SV Viktoria Wertheim' : spiel.attributes.auswaertsmannschaft?.data?.attributes?.name || '',
      awayTeam: isViktoriaHome ? spiel.attributes.auswaertsmannschaft?.data?.attributes?.name || '' : 'SV Viktoria Wertheim',
      homeScore: isLastGame ? (isViktoriaHome ? spiel.attributes.tore_heim : spiel.attributes.tore_auswaerts) : undefined,
      awayScore: isLastGame ? (isViktoriaHome ? spiel.attributes.tore_auswaerts : spiel.attributes.tore_heim) : undefined,
      date: spielDatum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      time: spielDatum.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      isHome: isViktoriaHome,
      stadium: spiel.attributes.spielort || 'Sportplatz Wertheim',
      referee: 'Schmidt, Michael', // TODO: Add referee field to schema
      goalScorers: [], // TODO: Add goal scorers
      yellowCards: [], // TODO: Add cards
      redCards: [],
      lastMeeting: !isLastGame ? {
        date: '15.05.2024',
        result: '2:1',
        location: 'Heim'
      } : undefined
    }
  }

  // Get last and next game from API data
  const now = new Date()
  const pastGames = games.filter(game => new Date(game.attributes.datum) < now)
  const futureGames = games.filter(game => new Date(game.attributes.datum) >= now)
  
  const lastGame = pastGames.length > 0 ? convertSpielToGameDetails(pastGames[0]) : null
  const nextGame = futureGames.length > 0 ? convertSpielToGameDetails(futureGames[futureGames.length - 1]) : null
   
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
  
  // Funktion zur Bestimmung der Ergebnisfarbe für das Modal
  const getModalResultColor = (game: GameDetails) => {
    if (game.type !== 'last' || game.homeScore === undefined || game.awayScore === undefined) {
      return 'text-viktoria-blue'
    }
    
    const isViktoriaHome = game.homeTeam === 'SV Viktoria Wertheim' || game.homeTeam === 'Viktoria Wertheim'
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
  
  // Mannschaftsspezifische Mock-Daten
  const getTeamName = (team: '1' | '2' | '3') => {
    switch (team) {
      case '1': return 'SV Viktoria Wertheim'
      case '2': return 'SV Viktoria Wertheim II'
      case '3': return 'SV Viktoria Wertheim III'
      default: return 'SV Viktoria Wertheim'
    }
  }

  const mockGameData = {
    '1': {
      last: {
        type: 'last' as const,
        homeTeam: 'SV Viktoria Wertheim',
        awayTeam: 'TSV Assamstadt',
        homeScore: 3,
        awayScore: 0,
        date: '02.08',
        time: '18:00',
        isHome: true,
        stadium: 'Viktoria-Stadion Wertheim',
        referee: 'Schmidt, Michael',
        goalScorers: ['Müller 15\'', 'Wagner 42\'', 'Bauer 78\''],
        yellowCards: ['Neumann 65\'', 'Scholz 89\''],
        redCards: []
      },
      next: {
        type: 'next' as const,
        homeTeam: 'Türkgücü Wertheim',
        awayTeam: 'SV Viktoria Wertheim',
        date: '16.08',
        time: '15:30',
        isHome: false,
        stadium: 'Sportplatz Türkgücü',
        referee: 'Weber, Thomas',
        lastMeeting: {
          date: '12.03',
          result: '0:3',
          location: 'Auswärts'
        }
      }
    },
    '2': {
      last: {
        type: 'last' as const,
        homeTeam: 'SV Viktoria Wertheim II',
        awayTeam: 'FC Eichel II',
        homeScore: 2,
        awayScore: 1,
        date: '28.07',
        time: '15:00',
        isHome: true,
        stadium: 'Sportplatz Wertheim',
        referee: 'Müller, Andreas',
        goalScorers: ['Schmidt 23\'', 'Weber 67\''],
        yellowCards: ['Klein 45\''],
        redCards: []
      },
      next: {
        type: 'next' as const,
        homeTeam: 'SV Viktoria Wertheim II',
        awayTeam: 'TSV Kreuzwertheim II',
        date: '18.08',
        time: '13:00',
        isHome: true,
        stadium: 'Sportplatz Wertheim',
        referee: 'Fischer, Peter',
        lastMeeting: {
          date: '20.04',
          result: '1:2',
          location: 'Auswärts'
        }
      }
    },
    '3': {
      last: {
        type: 'last' as const,
        homeTeam: 'SV Pülfringen II',
        awayTeam: 'SV Viktoria Wertheim III',
        homeScore: 1,
        awayScore: 4,
        date: '25.07',
        time: '17:30',
        isHome: false,
        stadium: 'Sportplatz Pülfringen',
        referee: 'Wagner, Klaus',
        goalScorers: ['Becker 12\'', 'Hoffmann 34\'', 'Jung 56\'', 'Roth 89\''],
        yellowCards: ['Braun 72\'', 'Sommer 85\''],
        redCards: []
      },
      next: {
        type: 'next' as const,
        homeTeam: 'SV Viktoria Wertheim III',
        awayTeam: 'SV Schönfeld II',
        date: '20.08',
        time: '11:00',
        isHome: true,
        stadium: 'Sportplatz Wertheim',
        referee: 'Bauer, Martin',
        lastMeeting: {
          date: '15.05',
          result: '3:0',
          location: 'Heim'
        }
      }
    }
  }

  const mockLastGameDetails = mockGameData[selectedTeam].last
  const mockNextGameDetails = mockGameData[selectedTeam].next
  
  return (
    <>
      <AnimatedSection className="py-0" delay={0}>
        <div className="container max-w-6xl">
          <div className="grid grid-cols-2 gap-4 md:gap-8">
            {/* Letztes Spiel */}
            {(lastGame || mockLastGameDetails) && (
              <GameCard
                {...(lastGame || mockLastGameDetails)}
                onClick={() => openGameModal(lastGame || mockLastGameDetails)}
              />
            )}
            
            {/* Nächstes Spiel */}
            {(nextGame || mockNextGameDetails) && (
              <GameCard
                {...(nextGame || mockNextGameDetails)}
                onClick={() => openGameModal(nextGame || mockNextGameDetails)}
              />
            )}
          </div>
        </div>
      </AnimatedSection>
      
      {/* Game Modal */}
      {isModalOpen && selectedGame && createPortal(
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-4">
          <AnimatedDiv delay={0} className="bg-white/95 backdrop-blur-sm rounded-xl max-w-lg w-full mx-2 md:mx-0 border border-white/40 shadow-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="relative rounded-t-xl pt-6 px-4 pb-4 md:pt-8 md:px-6 md:pb-6 text-center border-b border-gray-200">
              <button
                onClick={closeGameModal}
                className="absolute top-3 right-3 md:top-4 md:right-4 w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors duration-300"
              >
                <IconX className="text-gray-600" size={18} />
              </button>
              
              {/* Teams */}
              <div className="flex items-center justify-center space-x-2 md:space-x-4 mb-3 md:mb-4">
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
                  <p className="text-gray-800 text-xs md:text-sm font-medium text-center leading-tight max-w-20 md:max-w-none">
                    {selectedGame.homeTeam}
                  </p>
                </div>
                
                <div className="text-center px-2 md:px-4">
                  {selectedGame.type === 'last' && selectedGame.homeScore !== undefined && selectedGame.awayScore !== undefined ? (
                    <div className={`${getModalResultColor(selectedGame)} font-bold text-2xl md:text-3xl`}>
                      {selectedGame.homeScore}:{selectedGame.awayScore}
                    </div>
                  ) : (
                    <div className="text-viktoria-blue font-bold text-xl md:text-2xl font-permanent-marker">
                      VS
                    </div>
                  )}
                </div>
                
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
                        <span className="text-white font-bold text-sm md:text-base">{selectedGame.awayTeam.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-800 text-xs md:text-sm font-medium text-center leading-tight max-w-20 md:max-w-none">
                    {selectedGame.awayTeam}
                  </p>
                </div>
              </div>
              
              {/* Datum und Zeit */}
              <div className="flex items-center justify-center space-x-3 md:space-x-4 text-viktoria-blue">
                <div className="flex items-center space-x-1">
                  <IconCalendar size={14} />
                  <span className="text-xs md:text-sm">{selectedGame.date}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <IconClock size={14} />
                  <span className="text-xs md:text-sm">{selectedGame.time}</span>
                </div>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="pt-4 px-4 pb-4 md:pt-6 md:px-6 md:pb-6 space-y-4 md:space-y-6">
              {/* Spiel-Infos */}
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="bg-viktoria-blue/10 rounded-lg p-3 md:p-4 text-center">
                  <IconMapPin className="text-viktoria-blue mx-auto mb-1 md:mb-2" size={18} />
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Stadion</p>
                  <p className="text-xs md:text-sm font-semibold text-viktoria-blue leading-tight">{selectedGame.stadium}</p>
                </div>
                <div className="bg-viktoria-blue/10 rounded-lg p-3 md:p-4 text-center">
                  <IconUser className="text-viktoria-blue mx-auto mb-1 md:mb-2" size={18} />
                  <p className="text-xs md:text-sm text-gray-600 mb-1">Schiedsrichter</p>
                  <p className="text-xs md:text-sm font-semibold text-viktoria-blue leading-tight">{selectedGame.referee}</p>
                </div>
              </div>
              
              {/* Letztes Spiel - Statistiken */}
              {selectedGame.type === 'last' && (
                <>
                  {/* Torschützen */}
                  {selectedGame.goalScorers && selectedGame.goalScorers.length > 0 && (
                    <div className="bg-gradient-to-r from-viktoria-blue to-viktoria-blue-light rounded-lg p-3 md:p-4">
                      <h3 className="text-viktoria-yellow font-semibold mb-2 md:mb-3 text-center text-sm md:text-base flex items-center justify-center">
                        <IconTrophy className="mr-1 md:mr-2" size={18} />
                        Torschützen
                      </h3>
                      <div className="space-y-1 md:space-y-2">
                        {selectedGame.goalScorers.map((scorer, index) => (
                          <div key={index} className="text-center">
                            <p className="text-white font-semibold text-sm md:text-base">{scorer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Karten */}
                  {((selectedGame.yellowCards && selectedGame.yellowCards.length > 0) || 
                    (selectedGame.redCards && selectedGame.redCards.length > 0)) && (
                    <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                      <h3 className="font-semibold mb-2 md:mb-3 text-center text-sm md:text-base flex items-center justify-center">
                        <IconCards className="mr-1 md:mr-2" size={18} />
                        Karten
                      </h3>
                      <div className="grid grid-cols-2 gap-3 md:gap-4">
                        {selectedGame.yellowCards && selectedGame.yellowCards.length > 0 && (
                          <div className="text-center">
                            <p className="text-yellow-600 font-semibold mb-1 md:mb-2 text-xs md:text-sm">Gelbe Karten</p>
                            {selectedGame.yellowCards.map((card, index) => (
                              <p key={index} className="text-xs md:text-sm text-gray-600 leading-tight">{card}</p>
                            ))}
                          </div>
                        )}
                        {selectedGame.redCards && selectedGame.redCards.length > 0 && (
                          <div className="text-center">
                            <p className="text-red-600 font-semibold mb-1 md:mb-2 text-xs md:text-sm">Rote Karten</p>
                            {selectedGame.redCards.map((card, index) => (
                              <p key={index} className="text-xs md:text-sm text-gray-600 leading-tight">{card}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Nächstes Spiel - Letztes Aufeinandertreffen */}
              {selectedGame.type === 'next' && selectedGame.lastMeeting && (
                <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                  <h3 className="text-gray-800 font-semibold mb-2 md:mb-3 text-center text-sm md:text-base">
                    Letztes Aufeinandertreffen
                  </h3>
                  <div className="text-center">
                    <p className={`text-lg md:text-xl font-bold mb-1 ${getResultColor(selectedGame.lastMeeting.result, selectedGame.lastMeeting.location)}`}>
                      {selectedGame.lastMeeting.result}
                    </p>
                    <p className="text-gray-600 text-xs md:text-sm">
                      {selectedGame.lastMeeting.date} • {selectedGame.lastMeeting.location}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Schließen Button */}
              <button
                onClick={closeGameModal}
                className="w-full bg-viktoria-blue hover:bg-viktoria-blue-light text-white font-semibold py-2.5 md:py-3 rounded-lg transition-colors duration-300 text-sm md:text-base"
              >
                Schließen
              </button>
            </div>
          </AnimatedDiv>
        </div>,
        document.body
      )}
    </>
  )
} 