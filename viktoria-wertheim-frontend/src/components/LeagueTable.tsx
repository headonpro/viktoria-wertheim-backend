'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  
  // Default: Erste 3 Buchstaben des ersten Wortes
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



  // Fetch league standings from API
  const fetchLeagueData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Für die 1. Mannschaft versuchen wir API-Daten zu laden
      if (selectedTeam === '1') {
        try {
          const apiTeams = await leagueService.fetchLeagueStandings()
          
          if (apiTeams && apiTeams.length > 0) {
            // Use API data - logos come from API or remain undefined
            setTeams(apiTeams)
            setLastUpdated(new Date())
          } else {
            // No API data available - show empty state
            console.warn('API returned empty data')
            setTeams([])
          }
        } catch (apiError) {
          console.warn('API data not available:', apiError)
          setTeams([])
        }
      } else {
        // Für 2. und 3. Mannschaft keine Daten verfügbar
        setTeams([])
      }
      
    } catch (err) {
      console.error('Failed to fetch league standings:', err)
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
          className="bg-white/20 dark:bg-white/[0.02] backdrop-blur-md rounded-xl md:rounded-2xl border border-white/40 dark:border-white/[0.03] overflow-hidden cursor-pointer hover:bg-white/30 dark:hover:bg-white/[0.04] transition-all duration-300 shadow-2xl hover:shadow-3xl shadow-black/20 hover:shadow-black/30 dark:shadow-white/[0.25] dark:hover:shadow-white/[0.35]"
          onClick={toggleExpanded}
        >
          {/* Title Header */}
          <div className="px-8 md:px-12 py-6 md:py-8 text-center">
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

          {/* Empty State */}
          {!loading && !error && teams.length === 0 && (
            <div className="px-4 md:px-8 py-8 text-center">
              <div className="text-gray-400 mb-2">📊</div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                {selectedTeam === '1' 
                  ? 'Keine Tabellendaten verfügbar' 
                  : `Keine Daten für ${selectedTeam === '2' ? '2. Mannschaft' : '3. Mannschaft'} verfügbar`
                }
              </p>
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-viktoria-blue text-white rounded-lg text-sm hover:bg-viktoria-blue-light transition-colors"
              >
                Erneut laden
              </button>
            </div>
          )}

          {/* Teams */}
          {!loading && !error && teams.length > 0 && (
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
          <div className="px-8 md:px-12 py-6 md:py-8 text-center transition-colors">
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