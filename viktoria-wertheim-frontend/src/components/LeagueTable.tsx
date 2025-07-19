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

// Funktion zur Kürzung der Teamnamen (wie professionelle Fußball-Overlays)
const shortenTeamName = (name: string): string => {
  // Spezielle Behandlung für bekannte Teams (wie in TV-Overlays)
  const teamAbbreviations: { [key: string]: string } = {
    'SV Viktoria Wertheim': 'VIK',
    'FC Eichel': 'EIC',
    'TSV Assamstadt': 'ASS',
    'Türkgücü Wertheim': 'TGW',
    'TSV Tauberbischofsheim': 'TAU',
    'FV Brehmbachtal': 'BRE',
    'SV Brehmbachtal': 'BRE',
    'SV Pülfringen': 'PÜL',
    'SG Pülfringen': 'PÜL',
    'TSV Kreuzwertheim': 'KRE',
    'SV Kreuzwertheim': 'KRE',
    'FC Hundheim-Steinbach': 'HUN',
    'TSV Hundheim': 'HUN',
    'SpG Schwabhausen/Windischbuch': 'SCH',
    'SV Schwabhausen': 'SCH',
    'FC Umpfertal': 'UMP',
    'SG Umpfertal': 'UMP',
    'SV Schönfeld': 'SCH',
    'Kickers DHK Wertheim': 'KIC',
    'SG RaMBo': 'RAM',
    'VfR Gerlachsheim': 'GER',
    'VfB Reicholzheim': 'REI',
    'TuS Großrinderfeld': 'GRO',
    'SpG Impfingen/Tauberbischofsheim 2': 'IMP'
  };
  
  // Prüfe ob eine spezielle Abkürzung existiert
  if (teamAbbreviations[name]) {
    return teamAbbreviations[name];
  }
  
  // Automatische Generierung für unbekannte Teams
  const words = name.split(' ').filter(word => word.length > 0);
  
  if (words.length >= 2) {
    // Nimm die ersten 3 Buchstaben des Hauptnamens (nach dem Präfix)
    const mainWord = words[1] || words[0];
    return mainWord.substring(0, 3).toUpperCase();
  }
  
  // Fallback: Erste 3 Buchstaben des ersten Wortes
  return words[0].substring(0, 3).toUpperCase();
}

// Responsive Team Name Component
const TeamNameDisplay = ({ team, isViktoriaTeam }: { team: { name: string }, isViktoriaTeam: boolean }) => (
  <>
    {/* Mobile: Gekürzte Namen */}
    <span className={`font-medium text-sm lg:hidden ${isViktoriaTeam ? 'text-gray-800 dark:text-white' : 'text-gray-700 dark:text-gray-300'
      }`}>
      {shortenTeamName(team.name)}
    </span>
    {/* Desktop: Vollständige Namen */}
    <span className={`font-medium text-base hidden lg:inline ${isViktoriaTeam ? 'text-gray-800 dark:text-white' : 'text-gray-700 dark:text-gray-300'
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

interface LeagueTableProps {
  selectedTeam: '1' | '2' | '3'
}

const LeagueTable = ({ selectedTeam }: LeagueTableProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Mannschaftsspezifische Liga-Namen und Viktoria-Team-Namen
  const getLeagueName = (team: '1' | '2' | '3') => {
    switch (team) {
      case '1': return 'Kreisliga Tauberbischofsheim'
      case '2': return 'Kreisklasse A Tauberbischofsheim'
      case '3': return 'Kreisklasse B Tauberbischofsheim'
      default: return 'Kreisliga Tauberbischofsheim'
    }
  }

  const getViktoriaTeamName = (team: '1' | '2' | '3') => {
    switch (team) {
      case '1': return 'SV Viktoria Wertheim'
      case '2': return 'SV Viktoria Wertheim II'
      case '3': return 'SV Viktoria Wertheim III'
      default: return 'SV Viktoria Wertheim'
    }
  }

  // Mannschaftsspezifische Mock-Daten
  const getMockTeams = (team: '1' | '2' | '3'): Team[] => {
    const baseTeams = {
      '1': [
        { name: 'FC Umpfertal', position: 1, points: 45 },
        { name: 'FC Hundheim-Steinbach', position: 2, points: 42 },
        { name: 'FV Brehmbachtal', position: 3, points: 38 },
        { name: 'Kickers DHK Wertheim', position: 4, points: 35 },
        { name: 'SG RaMBo', position: 5, points: 32 },
        { name: 'SV Pülfringen', position: 6, points: 28 },
        { name: 'SV Schönfeld', position: 7, points: 25 },
        { name: 'SV Viktoria Wertheim', position: 8, points: 22 },
        { name: 'SpG Impfingen/Tauberbischofsheim 2', position: 9, points: 18 },
        { name: 'SpG Schwabhausen/Windischbuch', position: 10, points: 15 },
        { name: 'TSV Assamstadt', position: 11, points: 12 },
        { name: 'TSV Kreuzwertheim', position: 12, points: 10 },
        { name: 'TuS Großrinderfeld', position: 13, points: 8 },
        { name: 'Türkgücü Wertheim', position: 14, points: 6 },
        { name: 'VfB Reicholzheim', position: 15, points: 4 },
        { name: 'VfR Gerlachsheim', position: 16, points: 2 }
      ],
      '2': [
        { name: 'TSV Assamstadt II', position: 1, points: 38 },
        { name: 'FC Eichel II', position: 2, points: 35 },
        { name: 'SV Viktoria Wertheim II', position: 3, points: 32 },
        { name: 'TSV Kreuzwertheim II', position: 4, points: 29 },
        { name: 'SV Pülfringen II', position: 5, points: 26 },
        { name: 'Türkgücü Wertheim II', position: 6, points: 23 },
        { name: 'FC Hundheim II', position: 7, points: 20 },
        { name: 'SV Schönfeld II', position: 8, points: 17 },
        { name: 'FV Brehmbachtal II', position: 9, points: 14 },
        { name: 'SG RaMBo II', position: 10, points: 11 },
        { name: 'VfR Gerlachsheim II', position: 11, points: 8 },
        { name: 'VfB Reicholzheim II', position: 12, points: 5 }
      ],
      '3': [
        { name: 'FC Eichel III', position: 1, points: 42 },
        { name: 'TSV Assamstadt III', position: 2, points: 39 },
        { name: 'SV Pülfringen III', position: 3, points: 36 },
        { name: 'SV Viktoria Wertheim III', position: 4, points: 33 },
        { name: 'TSV Kreuzwertheim III', position: 5, points: 30 },
        { name: 'SV Schönfeld III', position: 6, points: 27 },
        { name: 'Türkgücü Wertheim III', position: 7, points: 24 },
        { name: 'FC Hundheim III', position: 8, points: 21 },
        { name: 'FV Brehmbachtal III', position: 9, points: 18 },
        { name: 'VfR Gerlachsheim III', position: 10, points: 15 },
        { name: 'SG RaMBo III', position: 11, points: 12 },
        { name: 'VfB Reicholzheim III', position: 12, points: 9 }
      ]
    }

    return baseTeams[team].map(teamData => ({
      position: teamData.position,
      name: teamData.name,
      logo: getTeamLogo(teamData.name),
      games: 18,
      wins: Math.floor(teamData.points / 3),
      draws: teamData.points % 3,
      losses: 18 - Math.floor(teamData.points / 3) - (teamData.points % 3),
      goalsFor: Math.floor(Math.random() * 30) + 15,
      goalsAgainst: Math.floor(Math.random() * 25) + 10,
      goalDifference: Math.floor(Math.random() * 20) - 10,
      points: teamData.points
    }))
  }

  // Mock data as fallback
  const mockTeams: Team[] = getMockTeams(selectedTeam)

  // Fetch league standings from API
  const fetchLeagueData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Für die 1. Mannschaft versuchen wir API-Daten zu laden
      if (selectedTeam === '1') {
        try {
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
        } catch (apiError) {
          console.warn('API data not available, using mock data:', apiError)
          setTeams(mockTeams)
        }
      } else {
        // Für 2. und 3. Mannschaft verwenden wir Mock-Daten
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
  }, [selectedTeam])

  // Add refresh function for manual updates
  const refreshData = async () => {
    await fetchLeagueData()
  }

  // Get current Viktoria team name
  const currentViktoriaTeam = getViktoriaTeamName(selectedTeam)

  // Filter teams for compact view: show team above, current Viktoria team, and team below
  const viktoriaTeam = teams.find(team => team.name === currentViktoriaTeam)
  const viktoriaPosition = viktoriaTeam?.position || 8
  
  const displayedTeams = isExpanded ? teams : teams.filter(team =>
    team.position >= Math.max(1, viktoriaPosition - 1) && 
    team.position <= Math.min(teams.length, viktoriaPosition + 1)
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
              {getLeagueName(selectedTeam)}
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
              {displayedTeams.map((team) => {
                const isViktoriaTeam = team.name === currentViktoriaTeam
                return (
                <div
                  key={team.position}
                  className={`px-4 md:px-8 py-2.5 md:py-3 transition-all duration-300 ${isViktoriaTeam
                    ? 'border border-white/40 dark:border-white/[0.08] rounded-lg md:rounded-xl hover:border-white/60 dark:hover:border-white/[0.12] hover:shadow-lg hover:shadow-white/[0.05] dark:hover:shadow-white/[0.08] cursor-pointer'
                    : 'hover:bg-white/20 dark:hover:bg-white/10'
                    }`}
                >
                  <div className="grid grid-cols-12 gap-2 md:gap-4 items-center text-sm md:text-base">
                    {/* Position */}
                    <div className="col-span-1">
                      <span className={`font-semibold text-sm md:text-lg ${isViktoriaTeam ? 'text-gray-800 dark:text-white' : 'text-gray-700 dark:text-gray-300'
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
                      <TeamNameDisplay team={team} isViktoriaTeam={isViktoriaTeam} />
                    </div>

                    {/* Games */}
                    <div className={`col-span-1 text-center text-sm md:text-base ${isViktoriaTeam ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                      }`}>
                      {team.games}
                    </div>

                    {/* Wins */}
                    <div className={`col-span-1 text-center text-sm md:text-base ${isViktoriaTeam ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                      }`}>
                      {team.wins}
                    </div>

                    {/* Draws */}
                    <div className={`col-span-1 text-center text-sm md:text-base ${isViktoriaTeam ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                      }`}>
                      {team.draws}
                    </div>

                    {/* Losses */}
                    <div className={`col-span-1 text-center text-sm md:text-base ${isViktoriaTeam ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                      }`}>
                      {team.losses}
                    </div>

                    {/* Goals */}
                    <div className={`col-span-1 lg:col-span-0 lg:hidden text-center text-xs md:text-sm ${isViktoriaTeam ? 'text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                      }`}>
                      {team.goalsFor}:{team.goalsAgainst}
                    </div>

                    {/* Goal Difference */}
                    <div className="col-span-1 text-center">
                      <span className={`text-xs md:text-sm font-medium ${isViktoriaTeam ? 'text-gray-800 dark:text-white' :
                        team.goalDifference > 0 ? 'text-green-600' :
                          team.goalDifference < 0 ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                        {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                      </span>
                    </div>

                    {/* Points */}
                    <div className="col-span-1 text-center">
                      <span className={`font-bold text-sm md:text-lg ${isViktoriaTeam ? 'text-gray-800 dark:text-white' : 'text-gray-800 dark:text-gray-300'
                        }`}>
                        {team.points}
                      </span>
                    </div>
                  </div>
                </div>
              )})}
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