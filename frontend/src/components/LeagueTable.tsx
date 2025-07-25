'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import dynamic from 'next/dynamic'
import Image from "next/image"
import { leagueService, Team } from '@/services/leagueService'
import { teamService } from '@/services/teamService'

const AnimatedSection = dynamic(
  () => import('@/components/AnimatedSection'),
  { ssr: false }
)

// Team interface is now imported from leagueService

// Funktion zur Kürzung der Teamnamen (wie professionelle Fußball-Overlays)
const shortenTeamName = (name: string): string => {
  // Spezielle Behandlung für bekannte Teams (wie in TV-Overlays)
  const teamAbbreviations: { [key: string]: string } = {
    'SV Viktoria Wertheim': 'SV VIK',
    'SV Viktoria Wertheim II': 'SV VIK II',
    'SV Viktoria Wertheim III': 'SV VIK III',
    'FC Eichel': 'FC EIC',
    'TSV Assamstadt': 'TSV ASS',
    'Türkgücü Wertheim': 'TGW',
    'TSV Tauberbischofsheim': 'TSV TAU',
    'FV Brehmbachtal': 'FV BRE',
    'SV Brehmbachtal': 'SV BRE',
    'SV Pülfringen': 'SV PÜL',
    'SG Pülfringen': 'SG PÜL',
    'TSV Kreuzwertheim': 'TSV KRE',
    'SV Kreuzwertheim': 'SV KRE',
    'FC Hundheim-Steinbach': 'FC HUN',
    'TSV Hundheim': 'TSV HUN',
    'SpG Schwabhausen/Windischbuch': 'SpG SCH',
    'SV Schwabhausen': 'SV SCH',
    'FC Umpfertal': 'FC UMP',
    'SG Umpfertal': 'SG UMP',
    'SV Schönfeld': 'SV SCH',
    'Kickers DHK Wertheim': 'KIC',
    'SG RaMBo': 'SG RAM',
    'VfR Gerlachsheim': 'VfR GER',
    'VfB Reicholzheim': 'VfB REI',
    'TuS Großrinderfeld': 'TuS GRO',
    'SpG Impfingen/Tauberbischofsheim 2': 'SpG IMP'
  };

  // Prüfe ob eine spezielle Abkürzung existiert
  if (teamAbbreviations[name]) {
    return teamAbbreviations[name];
  }

  // Automatische Generierung für unbekannte Teams
  const words = name.split(' ').filter(word => word.length > 0);

  // Bekannte Präfixe
  const prefixes = ['SV', 'FC', 'TSV', 'FV', 'SG', 'SpG', 'VfR', 'VfB', 'TuS', 'Kickers'];

  if (words.length >= 2) {
    const firstWord = words[0];

    // Prüfe ob das erste Wort ein bekanntes Präfix ist
    if (prefixes.includes(firstWord)) {
      const mainWord = words[1] || words[0];
      return `${firstWord} ${mainWord.substring(0, 3).toUpperCase()}`;
    }

    // Fallback: Nimm die ersten 3 Buchstaben des Hauptnamens (nach dem Präfix)
    const mainWord = words[1] || words[0];
    return mainWord.substring(0, 3).toUpperCase();
  }

  // Default: Erste 3 Buchstaben des ersten Wortes
  return words[0].substring(0, 3).toUpperCase();
}

// Responsive Team Name Component
const TeamNameDisplay = ({ team, isViktoriaTeam }: { team: { name: string }, isViktoriaTeam: boolean }) => (
  <>
    {/* Mobile: Gekürzte Namen */}
    <span className={`text-sm lg:hidden ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-800 dark:text-gray-100 font-medium'
      }`}>
      {shortenTeamName(team.name)}
    </span>
    {/* Desktop: Vollständige Namen */}
    <span className={`text-base hidden lg:inline ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-800 dark:text-gray-100 font-medium'
      }`}>
      {team.name}
    </span>
  </>
)

// Note: Team logos now come directly from the API data
// No more local logo fallback mapping needed

interface LeagueTableProps {
  selectedTeam: '1' | '2' | '3'
}

const LeagueTable = ({ selectedTeam }: LeagueTableProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Get league name from team data or fallback to static names
  const [leagueName, setLeagueName] = useState<string>('')

  const getLeagueName = (team: '1' | '2' | '3') => {
    // Static fallback names
    const fallbackNames = {
      '1': 'Kreisliga Tauberbischofsheim',
      '2': 'Kreisklasse A Tauberbischofsheim',
      '3': 'Kreisklasse B Tauberbischofsheim'
    }
    return leagueName || fallbackNames[team]
  }

  const getViktoriaTeamName = (team: '1' | '2' | '3') => {
    switch (team) {
      case '1': return 'SV Viktoria Wertheim'
      case '2': return 'SV Viktoria Wertheim II'
      case '3': return 'SV Viktoria Wertheim III'
      default: return 'SV Viktoria Wertheim'
    }
  }



  // Fetch league standings from API based on selected team
  const fetchLeagueData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // First, get team data to determine league information
      const teamData = await teamService.fetchTeamData(selectedTeam)

      if (teamData && teamData.liga_vollname) {
        setLeagueName(teamData.liga_vollname)

        // Try to fetch league-specific data first
        try {
          const leagueTeams = await leagueService.fetchLeagueStandingsByLeague(teamData.liga_vollname)

          if (leagueTeams && leagueTeams.length > 0) {
            setTeams(leagueTeams)
            setLastUpdated(new Date())
            return
          }
        } catch (leagueError) {
          console.warn(`League-specific data not available for ${teamData.liga_vollname}:`, leagueError)
        }
      }

      // Fallback: For team 1, try to get general league standings
      if (selectedTeam === '1') {
        try {
          const apiTeams = await leagueService.fetchLeagueStandings()

          if (apiTeams && apiTeams.length > 0) {
            setTeams(apiTeams)
            setLastUpdated(new Date())
          } else {
            console.warn('No league data available for team', selectedTeam)
            setTeams([])
          }
        } catch (apiError) {
          console.warn('General league API data not available:', apiError)
          setTeams([])
          setError('Tabellendaten konnten nicht geladen werden')
        }
      } else {
        // For teams 2 and 3, show empty state if no league-specific data
        if (process.env.NODE_ENV !== 'test') {
          console.info(`No league table data available for team ${selectedTeam}`)
        }
        setTeams([])
      }

    } catch (err) {
      console.error('Failed to fetch league data for team', selectedTeam, ':', err)
      setError('Tabelle konnte nicht geladen werden')
      setTeams([])
    } finally {
      setLoading(false)
    }
  }, [selectedTeam])

  useEffect(() => {
    fetchLeagueData()
  }, [fetchLeagueData])

  // Add refresh function for manual updates
  const refreshData = async () => {
    await fetchLeagueData()
  }

  // Get current Viktoria team name and implement proper team matching
  const currentViktoriaTeam = getViktoriaTeamName(selectedTeam)

  // Enhanced team matching function to handle different name variations
  const isViktoriaTeamMatch = (teamName: string, selectedTeam: '1' | '2' | '3'): boolean => {
    const normalizedTeamName = teamName.toLowerCase().trim()

    // Check for exact matches first
    if (teamName === currentViktoriaTeam) return true

    // Check for variations of Viktoria team names
    const viktoriaVariations = [
      'sv viktoria wertheim',
      'viktoria wertheim',
      'sv viktoria wertheim i',
      'sv viktoria wertheim ii',
      'sv viktoria wertheim iii',
      'viktoria wertheim i',
      'viktoria wertheim ii',
      'viktoria wertheim iii'
    ]

    // For team 1, match base name and "I" variations
    if (selectedTeam === '1') {
      return viktoriaVariations.slice(0, 3).some(variation =>
        normalizedTeamName.includes(variation) || normalizedTeamName === variation
      )
    }

    // For team 2, match "II" variations
    if (selectedTeam === '2') {
      return viktoriaVariations.slice(3, 5).some(variation =>
        normalizedTeamName.includes(variation) || normalizedTeamName === variation
      )
    }

    // For team 3, match "III" variations  
    if (selectedTeam === '3') {
      return viktoriaVariations.slice(5).some(variation =>
        normalizedTeamName.includes(variation) || normalizedTeamName === variation
      )
    }

    return false
  }

  // Filter teams for compact view: show more teams on desktop (5 total including 6th and 10th)
  const viktoriaTeam = teams.find(team => isViktoriaTeamMatch(team.name, selectedTeam))
  const viktoriaPosition = viktoriaTeam?.position || 8

  // Get teams for mobile (3 teams) and desktop (5 teams including 6th and 10th)
  const { mobileTeams, desktopTeams } = useMemo(() => {
    if (isExpanded) return { mobileTeams: teams, desktopTeams: teams }

    // Mobile: show 3 teams (team above, Viktoria, team below)
    const mobile = teams.filter(team =>
      team.position >= Math.max(1, viktoriaPosition - 1) &&
      team.position <= Math.min(teams.length, viktoriaPosition + 1)
    )

    // Desktop: show 5 teams including specific positions (6th, 10th, Viktoria +/- 1)
    const desktopPositions = new Set([
      6, // Show 6th place  
      10, // Show 10th place
      Math.max(1, viktoriaPosition - 1), // Team above Viktoria
      viktoriaPosition, // Viktoria team
      Math.min(teams.length, viktoriaPosition + 1) // Team below Viktoria
    ])

    const desktop = teams.filter(team =>
      desktopPositions.has(team.position) && team.position <= teams.length
    ).sort((a, b) => a.position - b.position) // Ensure proper ordering

    return { mobileTeams: mobile, desktopTeams: desktop }
  }, [teams, isExpanded, viktoriaPosition])

  const toggleExpanded = () => setIsExpanded(!isExpanded)

  return (
    <AnimatedSection>
      <div className="container max-w-6xl">
        <div
          className="relative bg-gray-100/11 dark:bg-white/[0.012] backdrop-blur-xl rounded-xl md:rounded-2xl overflow-hidden cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_rgba(255,255,255,0.08),0_2px_8px_rgba(255,255,255,0.04)] before:content-[''] before:absolute before:inset-0 before:rounded-xl before:md:rounded-2xl before:p-1.5 before:bg-gradient-to-br before:from-white/2 before:via-white/4 before:to-white/8 dark:before:from-white/0.4 dark:before:via-white/1 dark:before:to-white/2 before:mask-composite:subtract before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:pointer-events-none after:content-[''] after:absolute after:inset-[6px] after:rounded-[calc(0.75rem-6px)] after:md:rounded-[calc(1rem-6px)] after:bg-gradient-to-tl after:from-transparent after:via-white/[0.01] after:to-white/[0.02] after:pointer-events-none after:z-0"
          onClick={toggleExpanded}
        >
          {/* Title Header */}
          <div className="relative z-10 px-8 md:px-12 py-6 md:py-8 text-center">
            <h2 className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
              {getLeagueName(selectedTeam)}
            </h2>
          </div>

          {/* Table Header */}
          <div className="relative z-10 px-4 sm:px-6 md:px-8 py-3 md:py-3">
            <div className="flex items-center text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
              <div className="w-8 sm:w-10 md:w-12 text-left">#</div>
              <div className="flex-1 min-w-0 text-left">Verein</div>
              <div className="w-8 sm:w-10 md:w-12 text-center">Sp</div>
              <div className="w-8 sm:w-10 md:w-12 text-center hidden sm:block">S</div>
              <div className="w-8 sm:w-10 md:w-12 text-center hidden sm:block">U</div>
              <div className="w-8 sm:w-10 md:w-12 text-center hidden sm:block">N</div>
              <div className="w-12 sm:w-16 md:w-20 text-center sm:hidden">T</div>
              <div className="w-10 sm:w-12 md:w-16 text-center">TD</div>
              <div className="w-10 sm:w-12 md:w-16 text-center font-bold">Pkt</div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="relative z-10 px-4 md:px-8 py-8 text-center">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 bg-viktoria-blue rounded-full animate-pulse"></div>
                <div className="w-4 h-4 bg-viktoria-blue rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-4 h-4 bg-viktoria-blue rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-100 mt-2">Tabelle wird geladen...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="relative z-10 px-4 md:px-8 py-6 text-center">
              <div className="text-red-500 mb-2">⚠️</div>
              <p className="text-sm text-red-400 dark:text-red-300 mb-3">{error}</p>
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-viktoria-blue text-white rounded-lg text-sm hover:bg-viktoria-blue-light transition-colors"
              >
                Erneut versuchen
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && teams.length === 0 && (
            <div className="relative z-10 px-4 md:px-8 py-8 text-center">
              <div className="text-gray-400 mb-2">📊</div>
              <p className="text-sm text-gray-800 dark:text-gray-100 mb-3">
                {selectedTeam === '1'
                  ? 'Keine Tabellendaten für die Kreisliga verfügbar'
                  : selectedTeam === '2'
                    ? 'Keine Tabellendaten für die Kreisklasse A verfügbar'
                    : 'Keine Tabellendaten für die Kreisklasse B verfügbar'
                }
              </p>
              <p className="text-xs text-gray-200 dark:text-gray-300 mb-4">
                {selectedTeam === '1'
                  ? 'Die Tabellendaten werden möglicherweise noch aktualisiert.'
                  : 'Tabellendaten für diese Liga sind derzeit nicht verfügbar.'
                }
              </p>
              <button
                onClick={refreshData}
                disabled={loading}
                className="px-4 py-2 bg-viktoria-blue text-white rounded-lg text-sm hover:bg-viktoria-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Wird geladen...' : 'Erneut laden'}
              </button>
            </div>
          )}

          {/* Teams - Mobile View */}
          {!loading && !error && teams.length > 0 && (
            <div className="relative z-10 md:hidden">
              {mobileTeams.map((team) => {
                const isViktoriaTeam = isViktoriaTeamMatch(team.name, selectedTeam)
                return (
                  <div
                    key={team.position}
                    className={`
                    px-4 sm:px-6 md:px-8 py-3 sm:py-2.5 md:py-3 
                    touch-manipulation
                    min-h-[48px] flex items-center
                    relative overflow-hidden
                    ${isViktoriaTeam
                        ? 'cursor-pointer'
                        : ''
                      }
                  `}
                  >
                    {/* Viktoria team highlighting background - properly contained */}
                    {isViktoriaTeam && (
                      <div className="absolute inset-0 bg-viktoria-yellow opacity-90" />
                    )}
                    <div className="flex items-center text-sm md:text-base w-full relative z-10">
                      {/* Position */}
                      <div className="w-8 sm:w-10 md:w-12 text-left">
                        <span className={`text-sm md:text-lg ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-800 dark:text-gray-200'
                          }`}>
                          {team.position}.
                        </span>
                      </div>

                      {/* Team Name & Logo */}
                      <div className="flex-1 min-w-0 flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
                        {team.logo ? (
                          <Image
                            src={team.logo}
                            alt={`${team.name} Logo`}
                            width={48}
                            height={48}
                            className="w-7 h-7 sm:w-8 sm:h-8 md:w-12 md:h-12 object-contain drop-shadow-sm flex-shrink-0"
                            priority
                          />
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-12 md:h-12 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xs md:text-sm">
                              {team.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <TeamNameDisplay team={team} isViktoriaTeam={isViktoriaTeam} />
                        </div>
                      </div>

                      {/* Games */}
                      <div className={`w-8 sm:w-10 md:w-12 text-center text-xs sm:text-sm md:text-base ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                        {team.games}
                      </div>

                      {/* Wins - Hidden on mobile */}
                      <div className={`w-8 sm:w-10 md:w-12 text-center text-xs sm:text-sm md:text-base hidden sm:block ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                        {team.wins}
                      </div>

                      {/* Draws - Hidden on mobile */}
                      <div className={`w-8 sm:w-10 md:w-12 text-center text-xs sm:text-sm md:text-base hidden sm:block ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                        {team.draws}
                      </div>

                      {/* Losses - Hidden on mobile */}
                      <div className={`w-8 sm:w-10 md:w-12 text-center text-xs sm:text-sm md:text-base hidden sm:block ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                        {team.losses}
                      </div>

                      {/* Goals - Mobile shows goals, desktop hidden */}
                      <div className={`w-12 sm:w-16 md:w-20 text-center text-xs sm:text-sm sm:hidden ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                        {team.goalsFor}:{team.goalsAgainst}
                      </div>

                      {/* Goal Difference */}
                      <div className="w-10 sm:w-12 md:w-16 text-center">
                        <span className={`text-xs sm:text-sm md:text-base ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' :
                          team.goalDifference > 0 ? 'text-green-600' :
                            team.goalDifference < 0 ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'
                          }`}>
                          {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                        </span>
                      </div>

                      {/* Points */}
                      <div className="w-10 sm:w-12 md:w-16 text-center">
                        <span className={`text-sm sm:text-base md:text-lg ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-800 dark:text-gray-300'
                          }`}>
                          {team.points}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Teams - Desktop View */}
          {!loading && !error && teams.length > 0 && (
            <div className="relative z-10 hidden md:block">
              {desktopTeams.map((team) => {
                const isViktoriaTeam = isViktoriaTeamMatch(team.name, selectedTeam)
                return (
                  <div
                    key={team.position}
                    className={`
                    px-4 sm:px-6 md:px-8 py-3 sm:py-2.5 md:py-3 
                    touch-manipulation
                    min-h-[48px] flex items-center
                    relative overflow-hidden
                    ${isViktoriaTeam
                        ? 'cursor-pointer'
                        : ''
                      }
                  `}
                  >
                    {/* Viktoria team highlighting background - properly contained */}
                    {isViktoriaTeam && (
                      <div className="absolute inset-0 bg-viktoria-yellow opacity-90" />
                    )}
                    <div className="flex items-center text-sm md:text-base w-full relative z-10">
                      {/* Position */}
                      <div className="w-8 sm:w-10 md:w-12 text-left">
                        <span className={`text-sm md:text-lg ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-800 dark:text-gray-200'
                          }`}>
                          {team.position}.
                        </span>
                      </div>

                      {/* Team Name & Logo */}
                      <div className="flex-1 min-w-0 flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
                        {team.logo ? (
                          <Image
                            src={team.logo}
                            alt={`${team.name} Logo`}
                            width={48}
                            height={48}
                            className="w-7 h-7 sm:w-8 sm:h-8 md:w-12 md:h-12 object-contain drop-shadow-sm flex-shrink-0"
                            priority
                          />
                        ) : (
                          <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-12 md:h-12 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-bold text-xs md:text-sm">
                              {team.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <TeamNameDisplay team={team} isViktoriaTeam={isViktoriaTeam} />
                        </div>
                      </div>

                      {/* Games */}
                      <div className={`w-8 sm:w-10 md:w-12 text-center text-xs sm:text-sm md:text-base ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                        {team.games}
                      </div>

                      {/* Wins - Hidden on mobile */}
                      <div className={`w-8 sm:w-10 md:w-12 text-center text-xs sm:text-sm md:text-base hidden sm:block ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                        {team.wins}
                      </div>

                      {/* Draws - Hidden on mobile */}
                      <div className={`w-8 sm:w-10 md:w-12 text-center text-xs sm:text-sm md:text-base hidden sm:block ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                        {team.draws}
                      </div>

                      {/* Losses - Hidden on mobile */}
                      <div className={`w-8 sm:w-10 md:w-12 text-center text-xs sm:text-sm md:text-base hidden sm:block ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                        {team.losses}
                      </div>

                      {/* Goals - Mobile shows goals, desktop hidden */}
                      <div className={`w-12 sm:w-16 md:w-20 text-center text-xs sm:text-sm sm:hidden ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-600 dark:text-gray-300'
                        }`}>
                        {team.goalsFor}:{team.goalsAgainst}
                      </div>

                      {/* Goal Difference */}
                      <div className="w-10 sm:w-12 md:w-16 text-center">
                        <span className={`text-xs sm:text-sm md:text-base ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' :
                          team.goalDifference > 0 ? 'text-green-600' :
                            team.goalDifference < 0 ? 'text-red-600' : 'text-gray-600 dark:text-gray-300'
                          }`}>
                          {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                        </span>
                      </div>

                      {/* Points */}
                      <div className="w-10 sm:w-12 md:w-16 text-center">
                        <span className={`text-sm sm:text-base md:text-lg ${isViktoriaTeam ? 'text-gray-900 dark:text-gray-900 font-bold' : 'text-gray-800 dark:text-gray-300'
                          }`}>
                          {team.points}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Expand/Collapse Indicator */}
          <div className="relative z-10 px-6 sm:px-8 md:px-12 py-4 sm:py-6 md:py-8 text-center transition-colors touch-manipulation">
            <div className="flex items-center justify-center space-x-2 text-xs sm:text-xs md:text-sm font-medium text-gray-600 dark:text-gray-300 tracking-wide min-h-[44px] cursor-pointer opacity-70">
              <span className="select-none">
                {isExpanded ? 'Weniger anzeigen' : 'Vollständige Tabelle anzeigen'}
              </span>
              <div className="transition-transform duration-300 ease-in-out">
                {isExpanded ?
                  <ChevronUp size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" /> :
                  <ChevronDown size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
                }
              </div>
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






