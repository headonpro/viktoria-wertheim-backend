import axios from 'axios'
import { TeamId } from '../types/strapi'

// Strapi API Base URL
import { getApiUrl } from '../lib/apiConfig';
const API_BASE_URL = getApiUrl();

// Performance optimization: Cache for memoization
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class PerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL

  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);
    
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });

    // Clean expired entries periodically
    if (this.cache.size > 50) {
      this.cleanup();
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instances
const leagueStandingsCache = new PerformanceCache<Team[]>();
const ligaMappingCache = new PerformanceCache<string>();
const teamInfoCache = new PerformanceCache<{ ligaName: string; teamName: string; isFallback: boolean }>();
const clubDataCache = new PerformanceCache<any>();

// Strapi v5 Tabellen-Eintrag Response Interface
interface StrapiV5TabellenEintrag {
  id: number
  documentId: string
  team_name: string
  team_logo?: {
    id: number
    url: string
    alternativeText?: string
  }
  club?: {
    id: number
    documentId: string
    name: string
    kurz_name?: string
    logo?: {
      id: number
      url: string
      alternativeText?: string
    }
    ligen?: Array<{
      id: number
      documentId: string
      name: string
      kurz_name?: string
    }>
  }
  platz: number
  spiele: number
  siege: number
  unentschieden: number
  niederlagen: number
  tore_fuer: number
  tore_gegen: number
  tordifferenz: number
  punkte: number
  liga?: {
    id: number
    documentId: string
    name: string
    kurz_name?: string
  }
  createdAt: string
  updatedAt: string
}



// Frontend Team Interface (matches LeagueTable.tsx)
export interface Team {
  position: number
  name: string
  logo?: string
  games: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
}

// Liga-Mannschaft Mapping (as defined in design document) - Memoized
const MANNSCHAFT_LIGA_MAPPING = {
  '1': 'Kreisliga Tauberbischofsheim',
  '2': 'Kreisklasse A Tauberbischofsheim', 
  '3': 'Kreisklasse B Tauberbischofsheim'
} as const

// Club-Mannschaft Mapping (as defined in design document)
const MANNSCHAFT_CLUB_MAPPING = {
  '1': 'SV Viktoria Wertheim',
  '2': 'SV Viktoria Wertheim II',
  '3': 'SpG Vikt. Wertheim 3/Grünenwort'
} as const

// Memoized mapping function for better performance
const getMannschaftLigaMapping = (() => {
  const cache = new Map<TeamId, string>();
  
  return (teamId: TeamId): string | undefined => {
    if (cache.has(teamId)) {
      return cache.get(teamId);
    }
    
    const liga = MANNSCHAFT_LIGA_MAPPING[teamId];
    if (liga) {
      cache.set(teamId, liga);
    }
    
    return liga;
  };
})();

// Memoized club mapping function for better performance
const getMannschaftClubMapping = (() => {
  const cache = new Map<TeamId, string>();
  
  return (teamId: TeamId): string | undefined => {
    if (cache.has(teamId)) {
      return cache.get(teamId);
    }
    
    const club = MANNSCHAFT_CLUB_MAPPING[teamId];
    if (club) {
      cache.set(teamId, club);
    }
    
    return club;
  };
})();

// Viktoria Club Patterns for highlighting (comprehensive patterns for accurate detection)
const VIKTORIA_CLUB_PATTERNS = {
  '1': [
    'SV Viktoria Wertheim',
    'Viktoria Wertheim',
    'SV VIK Wertheim',
    'VIK Wertheim'
  ],
  '2': [
    'SV Viktoria Wertheim II',
    'Viktoria Wertheim II',
    'SV VIK Wertheim II',
    'VIK Wertheim II',
    'SV Viktoria Wertheim 2',
    'Viktoria Wertheim 2'
  ],
  '3': [
    'SpG Vikt. Wertheim 3/Grünenwort',
    'Viktoria Wertheim III',
    'SpG Vikt. Wertheim 3',
    'SpG Viktoria Wertheim 3',
    'Viktoria Wertheim 3',
    'VIK Wertheim 3',
    'SpG VIK Wertheim 3'
  ]
} as const

// Transform Strapi v5 Tabellen-Eintrag data to Frontend Team format
const transformTabellenEintragToTeam = (strapiEntry: StrapiV5TabellenEintrag): Team => {
  // Prefer club logo over team logo, with error handling for missing club data
  let logoUrl: string | undefined;
  
  try {
    const clubLogo = strapiEntry.club?.logo?.url
    const teamLogo = strapiEntry.team_logo?.url
    logoUrl = clubLogo || teamLogo
  } catch (error) {
    console.warn('Error accessing club logo data, falling back to team logo:', error);
    logoUrl = strapiEntry.team_logo?.url
  }
  
  // Use club name if available, otherwise fall back to team_name
  let teamName = strapiEntry.team_name || 'Unknown Team';
  if (strapiEntry.club?.name) {
    teamName = strapiEntry.club.name;
  }
  
  return {
    position: strapiEntry.platz || 0,
    name: teamName,
    logo: logoUrl ? `${API_BASE_URL}${logoUrl}` : undefined,
    games: strapiEntry.spiele || 0,
    wins: strapiEntry.siege || 0,
    draws: strapiEntry.unentschieden || 0,
    losses: strapiEntry.niederlagen || 0,
    goalsFor: strapiEntry.tore_fuer || 0,
    goalsAgainst: strapiEntry.tore_gegen || 0,
    goalDifference: strapiEntry.tordifferenz || 0,
    points: strapiEntry.punkte || 0
  }
}

// Error types for better error handling
export interface LeagueServiceError {
  type: 'network' | 'data' | 'not_found' | 'server' | 'timeout'
  message: string
  retryable: boolean
  originalError?: any
}

// Create specific error instances
const createLeagueServiceError = (type: LeagueServiceError['type'], message: string, retryable: boolean, originalError?: any): LeagueServiceError => ({
  type,
  message,
  retryable,
  originalError
})

// API Service Functions
export const leagueService = {
  /**
   * Fetch league standings for a specific league using Tabellen-Eintrag API with caching
   * @param ligaName - Name of the league to filter by
   * @param useCache - Whether to use cache (default: true)
   * @returns Promise<Team[]> - Array of teams in the specified league
   * @throws LeagueServiceError - Structured error information
   */
  async fetchLeagueStandingsByLiga(ligaName: string, useCache: boolean = true): Promise<Team[]> {
    const cacheKey = `liga:${ligaName}:with-clubs`;
    
    // Check cache first
    if (useCache && leagueStandingsCache.has(cacheKey)) {
      const cachedData = leagueStandingsCache.get(cacheKey);
      if (cachedData) {
        console.log(`Serving league standings for ${ligaName} from cache (with club data)`);
        return cachedData;
      }
    }

    try {
      // Try optimized endpoint first
      let response;
      try {
        response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege/liga/${encodeURIComponent(ligaName)}`, {
          timeout: 8000 // Reduced timeout for optimized endpoint
        });
      } catch (optimizedError) {
        console.warn('Optimized endpoint failed, falling back to standard endpoint');
        // Fallback to standard endpoint
        response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
          params: {
            'filters[liga][name][$eq]': ligaName,
            'populate[liga]': true,
            'populate[team_logo]': true,
            'populate[club][populate][logo]': true,
            'populate[club][populate][ligen]': true,
            sort: 'platz:asc',
            'pagination[pageSize]': 100
          },
          timeout: 10000 // 10 second timeout
        });
      }

      if (!response.data || !response.data.data) {
        console.warn(`No data found for league: ${ligaName}`)
        throw createLeagueServiceError(
          'data',
          `Keine Tabellendaten für Liga "${ligaName}" gefunden`,
          true
        )
      }

      const teams = response.data.data
        .map((entry: StrapiV5TabellenEintrag) => transformTabellenEintragToTeam(entry))
        .filter((team: Team) => team.position > 0) // Only teams with valid positions
        .sort((a: Team, b: Team) => a.position - b.position)

      if (teams.length === 0) {
        throw createLeagueServiceError(
          'data',
          `Keine gültigen Tabellendaten für Liga "${ligaName}" verfügbar`,
          true
        )
      }

      // Cache the result
      if (useCache) {
        leagueStandingsCache.set(cacheKey, teams);
        console.log(`Cached league standings for ${ligaName}`);
      }

      return teams

    } catch (error) {
      console.error(`Error fetching league standings for ${ligaName}:`, error)
      
      // If it's already a LeagueServiceError, re-throw it
      if (error && typeof error === 'object' && 'type' in error) {
        throw error
      }
      
      // Handle different error types
      if (error && typeof error === 'object') {
        // Check for timeout errors
        if ('code' in error && (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')) {
          throw createLeagueServiceError(
            'timeout',
            'Zeitüberschreitung beim Laden der Tabellendaten',
            true,
            error
          )
        }
        
        // Check for network connection errors
        if ('code' in error && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
          throw createLeagueServiceError(
            'network',
            'Netzwerkfehler - Bitte Internetverbindung prüfen',
            true,
            error
          )
        }
        
        // Handle Axios errors with response
        if ('response' in error && error.response && typeof error.response === 'object' && 'status' in error.response) {
          const status = error.response.status as number
          
          switch (status) {
            case 404:
              throw createLeagueServiceError(
                'not_found',
                `Liga "${ligaName}" wurde nicht gefunden`,
                false,
                error
              )
            case 500:
            case 502:
            case 503:
            case 504:
              throw createLeagueServiceError(
                'server',
                'Serverfehler - Bitte später erneut versuchen',
                true,
                error
              )
            default:
              throw createLeagueServiceError(
                'network',
                `Fehler beim Laden der Tabellendaten (${status})`,
                true,
                error
              )
          }
        }
        
        // Handle Axios errors without response (network issues)
        if ('isAxiosError' in error && !('response' in error)) {
          throw createLeagueServiceError(
            'network',
            'Netzwerkfehler - Bitte Internetverbindung prüfen',
            true,
            error
          )
        }
      }
      
      // Generic error fallback
      throw createLeagueServiceError(
        'data',
        'Unbekannter Fehler beim Laden der Tabellendaten',
        true,
        error
      )
    }
  },

  /**
   * Fetch league standings for a specific team using team-to-league mapping with caching
   * @param teamId - ID of the team ('1', '2', or '3')
   * @param useCache - Whether to use cache (default: true)
   * @returns Promise<Team[]> - Array of teams in the team's league
   * @throws LeagueServiceError - Structured error information
   */
  async fetchLeagueStandingsByTeam(teamId: TeamId, useCache: boolean = true): Promise<Team[]> {
    const ligaName = getMannschaftLigaMapping(teamId);
    
    if (!ligaName) {
      console.error(`Invalid team ID: ${teamId}`)
      throw createLeagueServiceError(
        'data',
        `Ungültige Mannschafts-ID: ${teamId}`,
        false
      )
    }

    try {
      return await this.fetchLeagueStandingsByLiga(ligaName, useCache)
    } catch (error) {
      // Add team context to error message
      if (error && typeof error === 'object' && 'message' in error) {
        const teamNames = {
          '1': '1. Mannschaft',
          '2': '2. Mannschaft', 
          '3': '3. Mannschaft'
        }
        const teamName = teamNames[teamId] || `Mannschaft ${teamId}`
        
        throw {
          ...error,
          message: `${error.message} (${teamName})`
        }
      }
      throw error
    }
  },

  /**
   * Get the league name for a specific team with fallback mechanism and caching
   * @param teamId - ID of the team ('1', '2', or '3')
   * @returns string - League name or fallback name
   */
  getLeagueNameByTeam(teamId: TeamId): string {
    const cacheKey = `league-name:${teamId}`;
    
    // Check cache first
    if (ligaMappingCache.has(cacheKey)) {
      const cachedName = ligaMappingCache.get(cacheKey);
      if (cachedName) {
        return cachedName;
      }
    }

    const ligaName = getMannschaftLigaMapping(teamId);
    
    if (!ligaName) {
      console.warn(`No league mapping found for team ${teamId}, using fallback`)
      // Fallback names if mapping fails
      const fallbackNames = {
        '1': 'Kreisliga Tauberbischofsheim',
        '2': 'Kreisklasse A Tauberbischofsheim',
        '3': 'Kreisklasse B Tauberbischofsheim'
      }
      const fallbackName = fallbackNames[teamId] || 'Unbekannte Liga';
      ligaMappingCache.set(cacheKey, fallbackName);
      return fallbackName;
    }
    
    // Cache the result
    ligaMappingCache.set(cacheKey, ligaName);
    return ligaName;
  },

  /**
   * Get team information with fallback mechanism and caching
   * @param teamId - ID of the team ('1', '2', or '3')
   * @returns object with team info and fallback status
   */
  getTeamInfo(teamId: TeamId): { ligaName: string; teamName: string; isFallback: boolean } {
    const cacheKey = `team-info:${teamId}`;
    
    // Check cache first
    if (teamInfoCache.has(cacheKey)) {
      const cachedInfo = teamInfoCache.get(cacheKey);
      if (cachedInfo) {
        return cachedInfo;
      }
    }

    const ligaName = getMannschaftLigaMapping(teamId);
    const teamNames = {
      '1': 'SV Viktoria Wertheim',
      '2': 'SV Viktoria Wertheim II',
      '3': 'SpG Vikt. Wertheim 3/Grünenwort'
    }
    
    let result: { ligaName: string; teamName: string; isFallback: boolean };
    
    if (!ligaName) {
      console.warn(`Liga-Zuordnung für Mannschaft ${teamId} fehlgeschlagen, verwende Fallback`)
      const fallbackNames = {
        '1': 'Kreisliga Tauberbischofsheim',
        '2': 'Kreisklasse A Tauberbischofsheim',
        '3': 'Kreisklasse B Tauberbischofsheim'
      }
      
      result = {
        ligaName: fallbackNames[teamId] || 'Unbekannte Liga',
        teamName: teamNames[teamId] || 'Unbekannte Mannschaft',
        isFallback: true
      };
    } else {
      result = {
        ligaName,
        teamName: teamNames[teamId] || 'Unbekannte Mannschaft',
        isFallback: false
      };
    }
    
    // Cache the result with longer TTL since team info rarely changes
    teamInfoCache.set(cacheKey, result);
    return result;
  },

  /**
   * Get the club name for a specific team using team-to-club mapping
   * @param teamId - ID of the team ('1', '2', or '3')
   * @returns string - Club name for the team
   */
  getClubNameByTeam(teamId: TeamId): string {
    const clubName = getMannschaftClubMapping(teamId);
    
    if (!clubName) {
      console.warn(`No club mapping found for team ${teamId}, using fallback`)
      // Fallback names if mapping fails
      const fallbackNames = {
        '1': 'SV Viktoria Wertheim',
        '2': 'SV Viktoria Wertheim II',
        '3': 'SpG Vikt. Wertheim 3/Grünenwort'
      }
      return fallbackNames[teamId] || 'Unbekannter Verein';
    }
    
    return clubName;
  },

  /**
   * Get all possible Viktoria team name variations for a given team ID
   * @param teamId - ID of the team ('1', '2', or '3')
   * @returns string[] - Array of all possible name variations
   */
  getViktoriaTeamVariations(teamId: TeamId): string[] {
    const patterns = VIKTORIA_CLUB_PATTERNS[teamId];
    if (!patterns) {
      return [];
    }
    
    // Convert readonly array to mutable array and add additional variations
    const baseVariations: string[] = Array.from(patterns);
    const additionalVariations: string[] = [];
    
    patterns.forEach(pattern => {
      // Add variations with different spacing
      additionalVariations.push(pattern.replace(/\s+/g, ' '));
      // Add variations without periods
      additionalVariations.push(pattern.replace(/\./g, ''));
      // Add variations with different abbreviations
      if (pattern.includes('SpG')) {
        additionalVariations.push(pattern.replace('SpG', 'Spielgemeinschaft'));
      }
      if (pattern.includes('SV')) {
        additionalVariations.push(pattern.replace('SV', 'Sportverein'));
      }
    });
    
    // Combine and remove duplicates
    const allVariations: string[] = [];
    baseVariations.forEach(variation => {
      if (allVariations.indexOf(variation) === -1) {
        allVariations.push(variation);
      }
    });
    additionalVariations.forEach(variation => {
      if (allVariations.indexOf(variation) === -1) {
        allVariations.push(variation);
      }
    });
    
    return allVariations;
  },

  /**
   * Check if a club name matches Viktoria patterns for highlighting
   * @param clubName - Name of the club to check
   * @param teamId - Optional team ID for specific pattern matching
   * @returns boolean - Whether the club should be highlighted as Viktoria
   */
  isViktoriaClub(clubName: string, teamId?: TeamId): boolean {
    const normalizedName = clubName.toLowerCase()
    
    // If teamId is provided, check specific patterns for that team
    if (teamId && VIKTORIA_CLUB_PATTERNS[teamId]) {
      const teamSpecificMatch = VIKTORIA_CLUB_PATTERNS[teamId].some(pattern => 
        normalizedName.includes(pattern.toLowerCase())
      );
      if (teamSpecificMatch) {
        return true;
      }
      
      // Also check additional variations
      const variations = this.getViktoriaTeamVariations(teamId);
      const variationMatch = variations.some(variation => 
        normalizedName.includes(variation.toLowerCase())
      );
      if (variationMatch) {
        return true;
      }
    }
    
    // General Viktoria pattern matching (fallback)
    const generalPatterns = [
      'viktoria',
      'vikt.',
      'sv viktoria wertheim',
      'spg vikt. wertheim',
      'vik wertheim'
    ];
    
    return generalPatterns.some(pattern => normalizedName.includes(pattern));
  },

  /**
   * Check if a team name matches Viktoria patterns for highlighting (enhanced with club name detection)
   * @param teamName - Name of the team to check
   * @param teamId - Optional team ID for specific pattern matching
   * @returns boolean - Whether the team should be highlighted as Viktoria
   */
  isViktoriaTeam(teamName: string, teamId?: TeamId): boolean {
    const normalizedName = teamName.toLowerCase()
    
    // First, try club-based detection using the isViktoriaClub method
    if (this.isViktoriaClub(teamName, teamId)) {
      return true;
    }
    
    // If teamId is provided, check specific club patterns for that team
    if (teamId && VIKTORIA_CLUB_PATTERNS[teamId]) {
      const isViktoriaByPattern = VIKTORIA_CLUB_PATTERNS[teamId].some(pattern => 
        normalizedName.includes(pattern.toLowerCase())
      );
      if (isViktoriaByPattern) {
        return true;
      }
    }
    
    // Fallback to team-based detection for backward compatibility
    const teamBasedPatterns = [
      'viktoria',
      'vikt.',
      'sv viktoria wertheim',
      'spg vikt. wertheim',
      'viktoria wertheim'
    ];
    
    const isViktoriaByTeamPattern = teamBasedPatterns.some(pattern => 
      normalizedName.includes(pattern)
    );
    
    if (isViktoriaByTeamPattern) {
      console.log(`Viktoria team detected via fallback team pattern: ${teamName}`);
      return true;
    }
    
    return false;
  },

  /**
   * Fetch all league standings from all leagues (legacy method for backward compatibility)
   * @returns Promise<Team[]> - Array of all teams from all leagues
   */
  async fetchLeagueStandings(): Promise<Team[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
        params: {
          'populate[liga]': true,
          'populate[team_logo]': true,
          sort: 'platz:asc',
          'pagination[pageSize]': 100
        }
      })

      if (!response.data || !response.data.data) {
        throw new Error('Invalid API response structure')
      }

      return response.data.data
        .map((entry: StrapiV5TabellenEintrag) => transformTabellenEintragToTeam(entry))
        .filter((team: Team) => team.position > 0)
        .sort((a: Team, b: Team) => a.position - b.position)

    } catch (error) {
      console.error('Error fetching all league standings:', error)
      throw new Error('Failed to fetch league standings')
    }
  },

  /**
   * Fetch specific team standing by team name from Tabellen-Eintrag API
   * @param teamName - Name of the team to fetch
   * @returns Promise<Team | null> - Team data or null if not found
   */
  async fetchTeamStanding(teamName: string): Promise<Team | null> {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
        params: {
          'filters[team_name][$eq]': teamName,
          'populate[liga]': true,
          'populate[team_logo]': true,
          'populate[club][populate][logo]': true,
          'populate[club][populate][ligen]': true
        }
      })

      if (!response.data || !response.data.data || response.data.data.length === 0) {
        return null
      }

      return transformTabellenEintragToTeam(response.data.data[0])

    } catch (error) {
      console.error(`Error fetching team standing for ${teamName}:`, error)
      return null
    }
  },

  /**
   * Fetch specific club standing by club name from Tabellen-Eintrag API
   * @param clubName - Name of the club to fetch
   * @returns Promise<Team | null> - Club data or null if not found
   */
  async fetchClubStanding(clubName: string): Promise<Team | null> {
    const cacheKey = `club-standing:${clubName}`;
    
    // Check cache first
    if (clubDataCache.has(cacheKey)) {
      const cachedData = clubDataCache.get(cacheKey);
      if (cachedData) {
        console.log(`Serving club standing for ${clubName} from cache`);
        return cachedData;
      }
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
        params: {
          'filters[club][name][$eq]': clubName,
          'populate[liga]': true,
          'populate[team_logo]': true,
          'populate[club][populate][logo]': true,
          'populate[club][populate][ligen]': true
        }
      })

      if (!response.data || !response.data.data || response.data.data.length === 0) {
        // Try fallback with team_name if club lookup fails
        return await this.fetchTeamStanding(clubName);
      }

      const result = transformTabellenEintragToTeam(response.data.data[0]);
      
      // Cache the result
      clubDataCache.set(cacheKey, result);
      
      return result;

    } catch (error) {
      console.error(`Error fetching club standing for ${clubName}:`, error)
      
      // Try fallback with team_name if club lookup fails
      try {
        console.log(`Attempting fallback to team name lookup for ${clubName}`);
        return await this.fetchTeamStanding(clubName);
      } catch (fallbackError) {
        console.error(`Fallback team lookup also failed for ${clubName}:`, fallbackError);
        return null;
      }
    }
  },

  /**
   * Get Viktoria Wertheim specific data (1st team)
   * @returns Promise<Team | null> - Viktoria Wertheim team data
   */
  async fetchViktoriaStanding(): Promise<Team | null> {
    return this.fetchTeamStanding('SV Viktoria Wertheim')
  },

  /**
   * Fetch league standings with retry mechanism for better error handling
   * @param ligaName - Name of the league
   * @param retries - Number of retry attempts (default: 2)
   * @returns Promise<Team[]> - Array of teams with retry logic
   * @throws LeagueServiceError - Final error after all retries exhausted
   */
  async fetchLeagueStandingsWithRetry(ligaName: string, retries: number = 2): Promise<Team[]> {
    let lastError: LeagueServiceError | null = null
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const teams = await this.fetchLeagueStandingsByLiga(ligaName)
        return teams // Success - return immediately
        
      } catch (error) {
        lastError = error as LeagueServiceError
        
        // Don't retry for non-retryable errors
        if (!lastError.retryable) {
          throw lastError
        }
        
        // If this was the last attempt, throw the error
        if (attempt === retries) {
          console.error(`Failed to fetch league standings after ${retries + 1} attempts:`, lastError)
          throw lastError
        }
        
        // Wait before retry with exponential backoff (1s, 2s, 4s, ...)
        const delay = 1000 * Math.pow(2, attempt)
        console.warn(`Retry attempt ${attempt + 1}/${retries + 1} for league ${ligaName} in ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    // This should never be reached, but just in case
    throw lastError || createLeagueServiceError(
      'data',
      'Unbekannter Fehler beim Laden der Tabellendaten',
      false
    )
  },

  /**
   * Fetch league standings by team with retry mechanism
   * @param teamId - ID of the team ('1', '2', or '3')
   * @param retries - Number of retry attempts (default: 2)
   * @returns Promise<Team[]> - Array of teams with retry logic
   * @throws LeagueServiceError - Final error after all retries exhausted
   */
  async fetchLeagueStandingsByTeamWithRetry(teamId: TeamId, retries: number = 2): Promise<Team[]> {
    const ligaName = getMannschaftLigaMapping(teamId);
    
    if (!ligaName) {
      throw createLeagueServiceError(
        'data',
        `Ungültige Mannschafts-ID: ${teamId}`,
        false
      )
    }

    try {
      return await this.fetchLeagueStandingsWithRetry(ligaName, retries)
    } catch (error) {
      // Add team context to error message
      if (error && typeof error === 'object' && 'message' in error) {
        const teamNames = {
          '1': '1. Mannschaft',
          '2': '2. Mannschaft', 
          '3': '3. Mannschaft'
        }
        const teamName = teamNames[teamId] || `Mannschaft ${teamId}`
        
        throw {
          ...error,
          message: `${error.message} (${teamName})`
        }
      }
      throw error
    }
  },

  /**
   * Clear all caches - useful for data updates or debugging
   */
  clearCache(): void {
    leagueStandingsCache.clear();
    ligaMappingCache.clear();
    teamInfoCache.clear();
    clubDataCache.clear();
    console.log('All leagueService caches cleared');
  },

  /**
   * Clear club-specific caches - useful for club data updates
   */
  clearClubCache(): void {
    clubDataCache.clear();
    // Also clear league standings cache since it contains club data
    leagueStandingsCache.clear();
    console.log('Club-related caches cleared');
  },

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { 
    leagueStandings: number; 
    ligaMapping: number; 
    teamInfo: number; 
    clubData: number;
    total: number 
  } {
    const stats = {
      leagueStandings: leagueStandingsCache.size(),
      ligaMapping: ligaMappingCache.size(),
      teamInfo: teamInfoCache.size(),
      clubData: clubDataCache.size(),
      total: 0
    };
    
    stats.total = stats.leagueStandings + stats.ligaMapping + stats.teamInfo + stats.clubData;
    return stats;
  },

  /**
   * Preload data for all teams to improve performance
   * @param useCache - Whether to use cache (default: true)
   */
  async preloadAllLeagueData(useCache: boolean = true): Promise<void> {
    console.log('Preloading league data for all teams...');
    
    const teamIds: TeamId[] = ['1', '2', '3'];
    const preloadPromises = teamIds.map(async (teamId) => {
      try {
        await this.fetchLeagueStandingsByTeam(teamId, useCache);
        console.log(`Preloaded data for team ${teamId}`);
      } catch (error) {
        console.warn(`Failed to preload data for team ${teamId}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    console.log('League data preloading completed');
  },

  /**
   * Preload club data for all Viktoria teams
   * @param useCache - Whether to use cache (default: true)
   */
  async preloadClubData(useCache: boolean = true): Promise<void> {
    console.log('Preloading club data for Viktoria teams...');
    
    const teamIds: TeamId[] = ['1', '2', '3'];
    const preloadPromises = teamIds.map(async (teamId) => {
      try {
        const clubName = this.getClubNameByTeam(teamId);
        await this.fetchClubStanding(clubName);
        console.log(`Preloaded club data for ${clubName}`);
      } catch (error) {
        console.warn(`Failed to preload club data for team ${teamId}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    console.log('Club data preloading completed');
  },

  /**
   * Test Viktoria team detection for all known variations
   * @returns object with test results for debugging and validation
   */
  testViktoriaDetection(): {
    clubDetection: { [key: string]: boolean };
    teamDetection: { [key: string]: boolean };
    summary: {
      clubTests: { passed: number; total: number };
      teamTests: { passed: number; total: number };
      allPassed: boolean;
    };
  } {
    console.log('Testing Viktoria team/club detection...');
    
    // Test club-based detection
    const clubTestCases = {
      'SV Viktoria Wertheim': true,
      'SV Viktoria Wertheim II': true,
      'SpG Vikt. Wertheim 3/Grünenwort': true,
      'Viktoria Wertheim': true,
      'Viktoria Wertheim II': true,
      'Viktoria Wertheim III': true,
      'SpG Vikt. Wertheim 3': true,
      'VfR Gerlachsheim': false,
      'TSV Jahn Kreuzwertheim': false,
      'FC Hundheim-Steinbach': false
    };
    
    const clubResults: { [key: string]: boolean } = {};
    let clubTestsPassed = 0;
    
    Object.entries(clubTestCases).forEach(([clubName, expected]) => {
      const result = this.isViktoriaClub(clubName);
      clubResults[clubName] = result === expected;
      if (result === expected) {
        clubTestsPassed++;
      } else {
        console.warn(`Club detection failed for "${clubName}": expected ${expected}, got ${result}`);
      }
    });
    
    // Test team-based detection (including fallback)
    const teamTestCases = {
      'SV Viktoria Wertheim': true,
      'SV Viktoria Wertheim II': true,
      'SpG Vikt. Wertheim 3/Grünenwort': true,
      'Viktoria Wertheim': true,
      'Viktoria Wertheim II': true,
      'Viktoria Wertheim III': true,
      'SpG Vikt. Wertheim 3': true,
      '1. Mannschaft': false, // Legacy team names should not match
      '2. Mannschaft': false,
      '3. Mannschaft': false,
      'VfR Gerlachsheim': false,
      'TSV Jahn Kreuzwertheim': false,
      'FC Hundheim-Steinbach': false
    };
    
    const teamResults: { [key: string]: boolean } = {};
    let teamTestsPassed = 0;
    
    Object.entries(teamTestCases).forEach(([teamName, expected]) => {
      const result = this.isViktoriaTeam(teamName);
      teamResults[teamName] = result === expected;
      if (result === expected) {
        teamTestsPassed++;
      } else {
        console.warn(`Team detection failed for "${teamName}": expected ${expected}, got ${result}`);
      }
    });
    
    // Test team-specific detection
    const teamSpecificTests = [
      { name: 'SV Viktoria Wertheim', teamId: '1' as TeamId, expected: true },
      { name: 'SV Viktoria Wertheim II', teamId: '2' as TeamId, expected: true },
      { name: 'SpG Vikt. Wertheim 3/Grünenwort', teamId: '3' as TeamId, expected: true },
      { name: 'VfR Gerlachsheim', teamId: '1' as TeamId, expected: false }
    ];
    
    teamSpecificTests.forEach(({ name, teamId, expected }) => {
      const clubResult = this.isViktoriaClub(name, teamId);
      const teamResult = this.isViktoriaTeam(name, teamId);
      
      if (clubResult !== expected || teamResult !== expected) {
        console.warn(`Team-specific detection failed for "${name}" (team ${teamId}): club=${clubResult}, team=${teamResult}, expected=${expected}`);
      }
    });
    
    const summary = {
      clubTests: { passed: clubTestsPassed, total: Object.keys(clubTestCases).length },
      teamTests: { passed: teamTestsPassed, total: Object.keys(teamTestCases).length },
      allPassed: clubTestsPassed === Object.keys(clubTestCases).length && teamTestsPassed === Object.keys(teamTestCases).length
    };
    
    console.log('Viktoria detection test results:', summary);
    
    return {
      clubDetection: clubResults,
      teamDetection: teamResults,
      summary
    };
  }
}

// Export default
export default leagueService