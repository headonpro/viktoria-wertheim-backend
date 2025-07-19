'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import dynamic from 'next/dynamic'
import Image from "next/image"
import { leagueService, Team } from '@/services/leagueService'

const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

// Team interface is now imported from leagueService

// Funktion zur Kürzung der Teamnamen (8 Zeichen um Zeilenumbruch zu verhindern)
const shortenTeamName = (name: string): string => {
  if (name.length <= 8) return name;
  return name.substring(0, 8);
}

// Responsive Team Name Component
const TeamNameDisplay = ({ team }: { team: { name: string } }) => (
  <>
    {/* Mobile: Gekürzte Namen */}
    <span className={`font-medium text-sm lg:hidden ${team.name === 'SV Viktoria Wertheim' ? 'text-gray-800 dark:text-white' : 'text-gray-700 dark:text-gray-300'
      }`}>
      {shortenTeamName(team.name)}
    </span>
    {/* Desktop: Vollständige Namen */}
    <span className={`font-medium text-base hidden lg:inline ${team.name === 'SV Viktoria Wertheim' ? 'text-gray-800 dark:text-white' : 'text-gray-700 dark:text-gray-300'
      }`}>
      {team.name}
    </span>
  </>
)

// Funktion zur automatischen Zuweisung von Logos basierend auf Teamnamen
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
    const teamWords = teamName.toLowerCase().split(' ')
    const keyWords = key.toLowerCase().split(' ')

    // Prüfe ob mindestens ein charakteristisches Wort übereinstimmt
    for (const teamWord of teamWords) {
      for (const keyWord of keyWords) {
        if (teamWord.includes(keyWord) || keyWord.includes(teamWord)) {
          // Zusätzliche Prüfung für gemeinsame Begriffe wie "FC", "SV", etc.
          if (teamWord.length > 2 && keyWord.length > 2) {
            return logo
          }
        }
      }
    }
  }

  return undefined
}

const LeagueTable = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Mock data as fallback
  const mockTeams: Team[] = [
    {
      position: 1,
      name: 'FC Umpfertal',
      logo: getTeamLogo('FC Umpfertal'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 2,
      name: 'FC Hundheim-Steinbach',
      logo: getTeamLogo('FC Hundheim-Steinbach'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 3,
      name: 'FV Brehmbachtal',
      logo: getTeamLogo('FV Brehmbachtal'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 4,
      name: 'Kickers DHK Wertheim',
      logo: getTeamLogo('Kickers DHK Wertheim'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 5,
      name: 'SG RaMBo',
      logo: getTeamLogo('SG RaMBo'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 6,
      name: 'SV Pülfringen',
      logo: getTeamLogo('SV Pülfringen'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 7,
      name: 'SV Schönfeld',
      logo: getTeamLogo('SV Schönfeld'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 8,
      name: 'SV Viktoria Wertheim',
      logo: getTeamLogo('SV Viktoria Wertheim'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 9,
      name: 'SpG Impfingen/Tauberbischofsheim 2',
      logo: getTeamLogo('SpG Impfingen/Tauberbischofsheim 2'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 10,
      name: 'SpG Schwabhausen/Windischbuch',
      logo: getTeamLogo('SpG Schwabhausen/Windischbuch'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 11,
      name: 'TSV Assamstadt',
      logo: getTeamLogo('TSV Assamstadt'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 12,
      name: 'TSV Kreuzwertheim',
      logo: getTeamLogo('TSV Kreuzwertheim'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 13,
      name: 'TuS Großrinderfeld',
      logo: getTeamLogo('TuS Großrinderfeld'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 14,
      name: 'Türkgücü Wertheim',
      logo: getTeamLogo('Türkgücü Wertheim'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 15,
      name: 'VfB Reicholzheim',
      logo: getTeamLogo('VfB Reicholzheim'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    },
    {
      position: 16,
      name: 'VfR Gerlachsheim',
      logo: getTeamLogo('VfR Gerlachsheim'),
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    }
  ]

  // Fetch league standings from API
  const fetchLeagueData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const apiTeams = await leagueService.fetchLeagueStandings()
      
      if (apiTeams && apiTeams.length > 0) {
        // Use API data and add fallback logos for teams without logos
        const teamsWithLogos = apiTeams.map(team => ({
          ...team,
          logo: team.logo || getTeamLogo(team.name)
        }))
        setTeams(teamsWithLogos)
        setLastUpdated(new Date())
      } else {
        // Fallback to mock data if API returns empty
        console.warn('API returned empty data, using mock data')
        setTeams(mockTeams)
      }
      
    } catch (err) {
      console.error('Failed to fetch league standings:', err)
      setError('Tabelle konnte nicht geladen werden')
      // Fallback to mock data on error
      setTeams(mockTeams)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeagueData()
  }, [])

  // Add refresh function for manual updates
  const refreshData = async () => {
    await fetchLeagueData()
  }

  // Filter teams for compact view: show team above, Viktoria Wertheim, and team below
  const displayedTeams = isExpanded ? teams : teams.filter(team =>
    team.position >= 7 && team.position <= 9
  )

  const toggleExpanded = () => setIsExpanded(!isExpanded)

  return (
    <AnimatedSection>
      <div className="container max-w-6xl">
        <div
          className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl md:rounded-2xl border border-white/40 dark:border-white/[0.08] overflow-hidden cursor-pointer hover:bg-white/30 dark:hover:bg-white/[0.04] transition-all duration-300 shadow-lg hover:shadow-xl dark:shadow-white/[0.05] dark:hover:shadow-white/[0.08]"
          onClick={toggleExpanded}
        >
          {/* Title Header */}
          <div className="px-4 md:px-8 py-3 md:py-4 text-center">
            <h2 className="text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              Kreisliga Tauberbischofsheim
            </h2>
          </div>

          {/* Table Header */}
          <div className="px-4 md:px-8 py-3 md:py-3">
            <div className="grid grid-cols-12 gap-2 md:gap-4 text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              <div className="col-span-1">#</div>
              <div className="col-span-4 lg:col-span-5">Verein</div>
              <div className="col-span-1 text-center">Sp</div>
              <div className="col-span-1 text-center">S</div>
              <div className="col-span-1 text-center">U</div>
              <div className="col-span-1 text-center">N</div>
              <div className="col-span-1 lg:col-span-0 lg:hidden text-center">T</div>
              <div className="col-span-1 text-center">TD</div>
              <div className="col-span-1 text-center font-bold">Pkt</div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="px-4 md:px-8 py-8 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 bg-viktoria-blue rounded-full animate-pulse"></div>
                <div className="w-4 h-4 bg-viktoria-blue rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-4 h-4 bg-viktoria-blue rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">Tabelle wird geladen...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="px-4 md:px-8 py-6 text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-viktoria-blue text-white rounded-lg text-sm hover:bg-viktoria-blue-light transition-colors"
              >
                Erneut versuchen
              </button>
            </div>
          )}

          {/* Teams */}
          {!loading && !error && (
            <div>
              {displayedTeams.map((team) => (
              <div
                key={team.position}
                className={`px-4 md:px-8 py-2.5 md:py-3 transition-all duration-300 ${team.name === 'SV Viktoria Wertheim'
                  ? 'border border-white/40 dark:border-white/[0.08] rounded-lg md:rounded-xl hover:border-white/60 dark:hover:border-white/[0.12] hover:shadow-lg hover:shadow-white/[0.05] dark:hover:shadow-white/[0.08] cursor-pointer'
                  : 'hover:bg-white/20 dark:hover:bg-white/10'
                  }`}
              >
                <div className="grid grid-cols-12 gap-2 md:gap-4 items-center text-sm md:text-base">
                  {/* Position */}
                  <div className="col-span-1">
                    <span className={`font-semibold text-sm md:text-lg ${team.name === 'SV Viktoria Wertheim' ? 'text-gray-800 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                      {team.position}.
                    </span>
                  </div>

                  {/* Team Name & Logo */}
                  <div className="col-span-4 lg:col-span-5 flex items-center space-x-2 md:space-x-3">
                    {team.logo ? (
                      <Image
                        src={team.logo}
                        alt={`${team.name} Logo`}
                        width={32}
                        height={32}
                        className="w-6 h-6 md:w-8 md:h-8 object-contain drop-shadow-sm"
                        priority
                      />
                    ) : (
                      <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-xs md:text-sm">
                          {team.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <TeamNameDisplay team={team} />
                  </div>

                  {/* Games */}
                  <div className={`col-span-1 text-center text-sm md:text-base ${team.name === 'SV Viktoria Wertheim' ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                    {team.games}
                  </div>

                  {/* Wins */}
                  <div className={`col-span-1 text-center text-sm md:text-base ${team.name === 'SV Viktoria Wertheim' ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                    {team.wins}
                  </div>

                  {/* Draws */}
                  <div className={`col-span-1 text-center text-sm md:text-base ${team.name === 'SV Viktoria Wertheim' ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                    {team.draws}
                  </div>

                  {/* Losses */}
                  <div className={`col-span-1 text-center text-sm md:text-base ${team.name === 'SV Viktoria Wertheim' ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                    {team.losses}
                  </div>

                  {/* Goals */}
                  <div className={`col-span-1 lg:col-span-0 lg:hidden text-center text-xs md:text-sm ${team.name === 'SV Viktoria Wertheim' ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}>
                    {team.goalsFor}:{team.goalsAgainst}
                  </div>

                  {/* Goal Difference */}
                  <div className="col-span-1 text-center">
                    <span className={`text-xs md:text-sm font-medium ${team.name === 'SV Viktoria Wertheim' ? 'text-gray-800 dark:text-white' :
                      team.goalDifference > 0 ? 'text-green-600' :
                        team.goalDifference < 0 ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'
                      }`}>
                      {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="col-span-1 text-center">
                    <span className={`font-bold text-sm md:text-lg ${team.name === 'SV Viktoria Wertheim' ? 'text-gray-800 dark:text-white' : 'text-gray-800 dark:text-gray-300'
                      }`}>
                      {team.points}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}

          {/* Expand/Collapse Indicator */}
          <div className="px-4 md:px-8 py-4 md:py-5 text-center transition-colors">
            <div className="flex items-center justify-center space-x-2 text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
              <span>{isExpanded ? 'Weniger anzeigen' : 'Vollständige Tabelle anzeigen'}</span>
              {isExpanded ? <ChevronUp size={16} className="md:w-5 md:h-5" /> : <ChevronDown size={16} className="md:w-5 md:h-5" />}
            </div>
          </div>
        </div>

        {/* Legend - only show when expanded */}
        {isExpanded && (
          <div className="mt-4 md:mt-6 text-center">
            <div className="text-xs md:text-sm text-gray-500 max-w-4xl mx-auto">
              Sp = Spiele, S = Siege, U = Unentschieden, N = Niederlagen, T = Tore, TD = Tordifferenz, Pkt = Punkte
            </div>
          </div>
        )}
      </div>
    </AnimatedSection>
  )
}

export default LeagueTable 