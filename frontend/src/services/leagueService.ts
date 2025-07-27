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

// Viktoria Team Patterns for highlighting (updated with actual database names)
const VIKTORIA_TEAM_PATTERNS = {
  '1': ['SV Viktoria Wertheim', 'Viktoria Wertheim'],
  '2': ['SV Viktoria Wertheim II', 'Viktoria Wertheim II'],
  '3': ['SpG Vikt. Wertheim 3/Grünenwort', 'Viktoria Wertheim III', 'SpG Vikt. Wertheim 3']
} as const

// Transform Strapi v5 Tabellen-Eintrag data to Frontend Team format
const transformTabellenEintragToTeam = (strapiEntry: StrapiV5TabellenEintrag): Team => {
  const teamLogo = strapiEntry.team_logo?.url
  
  return {
    position: strapiEntry.platz || 0,
    name: strapiEntry.team_name || 'Unknown Team',
    logo: teamLogo ? `${API_BASE_URL}${teamLogo}` : undefined,
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
    const cacheKey = `liga:${ligaName}`;
    
    // Check cache first
    if (useCache && leagueStandingsCache.has(cacheKey)) {
      const cachedData = leagueStandingsCache.get(cacheKey);
      if (cachedData) {
        console.log(`Serving league standings for ${ligaName} from cache`);
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
   * Check if a team name matches Viktoria patterns for highlighting
   * @param teamName - Name of the team to check
   * @param teamId - Optional team ID for specific pattern matching
   * @returns boolean - Whether the team should be highlighted as Viktoria
   */
  isViktoriaTeam(teamName: string, teamId?: TeamId): boolean {
    const normalizedName = teamName.toLowerCase()
    
    // If teamId is provided, check specific patterns for that team
    if (teamId && VIKTORIA_TEAM_PATTERNS[teamId]) {
      return VIKTORIA_TEAM_PATTERNS[teamId].some(pattern => 
        normalizedName.includes(pattern.toLowerCase())
      )
    }
    
    // General Viktoria pattern matching
    return normalizedName.includes('viktoria') || 
           normalizedName.includes('vikt.') ||
           normalizedName.includes('sv viktoria wertheim')
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
          'populate[team_logo]': true
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
    console.log('All leagueService caches cleared');
  },

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { 
    leagueStandings: number; 
    ligaMapping: number; 
    teamInfo: number; 
    total: number 
  } {
    const stats = {
      leagueStandings: leagueStandingsCache.size(),
      ligaMapping: ligaMappingCache.size(),
      teamInfo: teamInfoCache.size(),
      total: 0
    };
    
    stats.total = stats.leagueStandings + stats.ligaMapping + stats.teamInfo;
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
  }
}

// Export default
export default leagueService