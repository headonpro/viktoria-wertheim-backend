/**
 * club service
 */

import { factories } from '@strapi/strapi'
import { ClubCacheManager } from './cache-manager'

// Type definitions
interface ClubData {
  name: string;
  kurz_name?: string;
  club_typ: 'viktoria_verein' | 'gegner_verein';
  viktoria_team_mapping?: 'team_1' | 'team_2' | 'team_3';
  liga_ids?: number[];
  aktiv?: boolean;
  gruendungsjahr?: number;
  vereinsfarben?: string;
  heimstadion?: string;
  adresse?: string;
  website?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

enum ClubErrorType {
  CLUB_NOT_FOUND = 'club_not_found',
  CLUB_NOT_IN_LIGA = 'club_not_in_liga',
  DUPLICATE_CLUB_NAME = 'duplicate_club_name',
  INVALID_VIKTORIA_MAPPING = 'invalid_viktoria_mapping',
  CLUB_INACTIVE = 'club_inactive',
  MISSING_LIGA_ASSIGNMENT = 'missing_liga_assignment'
}

interface ClubValidationError {
  type: ClubErrorType;
  message: string;
  clubId?: number;
  clubName?: string;
  ligaId?: number;
  details?: any;
}

export default factories.createCoreService('api::club.club', ({ strapi }) => {
  let cacheManager: ClubCacheManager | null = null;

  // Initialize cache manager
  const initializeCacheManager = () => {
    if (!cacheManager) {
      try {
        cacheManager = new ClubCacheManager(strapi);
        strapi.log.info('✅ Club cache manager initialized');
      } catch (error) {
        strapi.log.error('❌ Failed to initialize club cache manager:', error.message);
        strapi.log.warn('⚠️  Continuing without Redis caching');
      }
    }
    return cacheManager;
  };

  return {
  // Basic CRUD operations
  
  /**
   * Find all active clubs in a specific liga
   * @param ligaId - The liga ID to filter by
   * @param options - Options including cache control
   * @returns Array of clubs in the liga
   */
  async findClubsByLiga(ligaId: number, options: { skipCache?: boolean } = {}) {
    try {
      if (!ligaId || typeof ligaId !== 'number') {
        throw new Error('Valid liga ID is required');
      }

      // Try Redis cache first
      const cache = initializeCacheManager();
      if (cache && !options.skipCache) {
        try {
          const cachedClubs = await cache.getClubsByLiga(ligaId, options);
          if (cachedClubs) {
            strapi.log.debug(`Found ${cachedClubs.length} clubs for liga ${ligaId} (cached)`);
            return cachedClubs;
          }
        } catch (cacheError) {
          strapi.log.warn('Cache error, falling back to database:', cacheError.message);
        }
      }

      // Fallback to database
      const clubs = await strapi.entityService.findMany('api::club.club', {
        filters: {
          ligen: { id: ligaId },
          aktiv: true
        },
        populate: {
          logo: true,
          ligen: true
        },
        sort: 'name:asc'
      });

      strapi.log.debug(`Found ${clubs.length} clubs for liga ${ligaId} (database)`);
      return clubs;
    } catch (error) {
      strapi.log.error('Error finding clubs by liga:', error);
      throw new Error(`Failed to find clubs for liga ${ligaId}: ${error.message}`);
    }
  },

  /**
   * Find Viktoria club by team mapping
   * @param teamMapping - The team mapping (team_1, team_2, team_3)
   * @param options - Options including cache control
   * @returns Club or null if not found
   */
  async findViktoriaClubByTeam(teamMapping: 'team_1' | 'team_2' | 'team_3', options: { skipCache?: boolean } = {}) {
    try {
      if (!teamMapping || !['team_1', 'team_2', 'team_3'].includes(teamMapping)) {
        throw new Error('Valid team mapping is required');
      }

      // Try Redis cache first
      const cache = initializeCacheManager();
      if (cache && !options.skipCache) {
        try {
          const cachedClub = await cache.getViktoriaClubByTeam(teamMapping, options);
          if (cachedClub) {
            strapi.log.debug(`Found Viktoria club for ${teamMapping}: ${cachedClub.name} (cached)`);
            return cachedClub;
          }
        } catch (cacheError) {
          strapi.log.warn('Cache error, falling back to database:', cacheError.message);
        }
      }

      // Fallback to database
      const clubs = await strapi.entityService.findMany('api::club.club', {
        filters: {
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: teamMapping,
          aktiv: true
        },
        populate: {
          logo: true,
          ligen: true
        }
      });
      
      const club = clubs.length > 0 ? clubs[0] : null;
      strapi.log.debug(`Found Viktoria club for ${teamMapping}:`, club?.name || 'none');
      return club;
    } catch (error) {
      strapi.log.error('Error finding Viktoria club by team:', error);
      throw new Error(`Failed to find Viktoria club for ${teamMapping}: ${error.message}`);
    }
  },

  /**
   * Validate that a club belongs to a specific liga
   * @param clubId - The club ID
   * @param ligaId - The liga ID
   * @returns Boolean indicating if club is in liga
   */
  async validateClubInLiga(clubId: number, ligaId: number): Promise<boolean> {
    try {
      if (!clubId || !ligaId) {
        return false;
      }

      const club = await strapi.entityService.findOne('api::club.club', clubId, {
        populate: {
          ligen: true
        }
      });
      
      if (!club) {
        strapi.log.warn(`Club ${clubId} not found for liga validation`);
        return false;
      }
      
      const isInLiga = (club as any).ligen.some((liga: any) => liga.id === ligaId);
      strapi.log.debug(`Club ${clubId} in liga ${ligaId}: ${isInLiga}`);
      return isInLiga;
    } catch (error) {
      strapi.log.error('Error validating club in liga:', error);
      return false;
    }
  },

  /**
   * Get club with logo and full data for frontend
   * @param clubId - The club ID
   * @param options - Options including cache control
   * @returns Club with populated relations
   */
  async getClubWithLogo(clubId: number, options: { skipCache?: boolean } = {}) {
    try {
      if (!clubId || typeof clubId !== 'number') {
        throw new Error('Valid club ID is required');
      }

      // Try Redis cache first
      const cache = initializeCacheManager();
      if (cache && !options.skipCache) {
        try {
          const cachedClub = await cache.getClubById(clubId, options);
          if (cachedClub) {
            strapi.log.debug(`Retrieved club with logo: ${cachedClub.name} (cached)`);
            return cachedClub;
          }
        } catch (cacheError) {
          strapi.log.warn('Cache error, falling back to database:', cacheError.message);
        }
      }

      // Fallback to database
      const club = await strapi.entityService.findOne('api::club.club', clubId, {
        populate: {
          logo: true,
          ligen: {
            populate: {
              saison: true
            }
          }
        }
      });

      if (!club) {
        throw new Error(`Club with ID ${clubId} not found`);
      }

      strapi.log.debug(`Retrieved club with logo: ${(club as any).name}`);
      return club;
    } catch (error) {
      strapi.log.error('Error getting club with logo:', error);
      throw new Error(`Failed to get club ${clubId}: ${error.message}`);
    }
  },

  /**
   * Create club if it doesn't exist, otherwise return existing
   * @param clubData - The club data
   * @returns Created or existing club
   */
  async createClubIfNotExists(clubData: ClubData) {
    try {
      if (!clubData.name) {
        throw new Error('Club name is required');
      }

      // Check if club already exists
      const existingClubs = await strapi.entityService.findMany('api::club.club', {
        filters: {
          name: clubData.name
        }
      });
      
      if (existingClubs.length > 0) {
        strapi.log.debug(`Club ${clubData.name} already exists`);
        return existingClubs[0];
      }
      
      // Validate club data before creation
      const validation = await this.validateClubData(clubData);
      if (!validation.isValid) {
        throw new Error(`Invalid club data: ${validation.errors.join(', ')}`);
      }

      // Create new club
      const newClub = await strapi.entityService.create('api::club.club', {
        data: {
          ...clubData,
          aktiv: clubData.aktiv !== undefined ? clubData.aktiv : true
        }
      });

      strapi.log.info(`Created new club: ${clubData.name}`);
      return newClub;
    } catch (error) {
      strapi.log.error('Error creating club:', error);
      throw new Error(`Failed to create club ${clubData.name}: ${error.message}`);
    }
  },

  // Validation methods

  /**
   * Validate club data consistency
   * @param clubData - Club data to validate
   * @returns Validation result
   */
  async validateClubData(clubData: ClubData): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      // Validate required fields
      if (!clubData.name || clubData.name.trim().length < 2) {
        errors.push('Club name must be at least 2 characters long');
      }

      if (!clubData.club_typ || !['viktoria_verein', 'gegner_verein'].includes(clubData.club_typ)) {
        errors.push('Valid club type is required (viktoria_verein or gegner_verein)');
      }

      // Validate Viktoria-specific requirements
      if (clubData.club_typ === 'viktoria_verein') {
        if (!clubData.viktoria_team_mapping) {
          errors.push('Viktoria clubs must have a team mapping');
        } else if (!['team_1', 'team_2', 'team_3'].includes(clubData.viktoria_team_mapping)) {
          errors.push('Invalid team mapping for Viktoria club');
        }
      }

      // Validate optional fields
      if (clubData.kurz_name && clubData.kurz_name.length > 20) {
        errors.push('Short name must be 20 characters or less');
      }

      if (clubData.gruendungsjahr && (clubData.gruendungsjahr < 1800 || clubData.gruendungsjahr > 2030)) {
        errors.push('Founding year must be between 1800 and 2030');
      }

      if (clubData.website && clubData.website.length > 200) {
        errors.push('Website URL must be 200 characters or less');
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      strapi.log.error('Error validating club data:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  },

  /**
   * Validate club consistency (existing club)
   * @param clubId - The club ID to validate
   * @returns Validation result
   */
  async validateClubConsistency(clubId: number): Promise<ValidationResult> {
    try {
      const club = await strapi.entityService.findOne('api::club.club', clubId, {
        populate: {
          ligen: true
        }
      });
      
      if (!club) {
        return {
          isValid: false,
          errors: [`Club with ID ${clubId} not found`]
        };
      }
      
      const errors: string[] = [];
      const clubData = club as any;
      
      // Validate viktoria_team_mapping uniqueness for viktoria clubs
      if (clubData.club_typ === 'viktoria_verein') {
        if (!clubData.viktoria_team_mapping) {
          errors.push('Viktoria clubs must have a team mapping');
        } else {
          const duplicates = await strapi.entityService.findMany('api::club.club', {
            filters: {
              club_typ: 'viktoria_verein',
              viktoria_team_mapping: clubData.viktoria_team_mapping,
              id: { $ne: clubId }
            }
          });
          
          if (duplicates.length > 0) {
            errors.push(`Team mapping ${clubData.viktoria_team_mapping} is already used by another Viktoria club: ${duplicates[0].name}`);
          }
        }
      }
      
      // Validate club has at least one liga
      if (!clubData.ligen || clubData.ligen.length === 0) {
        errors.push('Club must be assigned to at least one liga');
      }

      // Validate club name uniqueness
      const duplicateNames = await strapi.entityService.findMany('api::club.club', {
        filters: {
          name: clubData.name,
          id: { $ne: clubId }
        }
      });

      if (duplicateNames.length > 0) {
        errors.push(`Club name "${clubData.name}" is already used by another club`);
      }
      
      const result = {
        isValid: errors.length === 0,
        errors
      };

      strapi.log.debug(`Club consistency validation for ${clubData.name}:`, result);
      return result;
    } catch (error) {
      strapi.log.error('Error validating club consistency:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  },

  /**
   * Validate viktoria_team_mapping uniqueness across all clubs
   * @returns Validation result with details about conflicts
   */
  async validateViktoriaTeamMappingUniqueness(): Promise<ValidationResult> {
    try {
      const viktoriaClubs = await strapi.entityService.findMany('api::club.club', {
        filters: {
          club_typ: 'viktoria_verein',
          aktiv: true
        }
      });

      const errors: string[] = [];
      const mappingCounts = new Map<string, any[]>();

      // Group clubs by team mapping
      viktoriaClubs.forEach((club: any) => {
        if (club.viktoria_team_mapping) {
          if (!mappingCounts.has(club.viktoria_team_mapping)) {
            mappingCounts.set(club.viktoria_team_mapping, []);
          }
          mappingCounts.get(club.viktoria_team_mapping)!.push(club);
        }
      });

      // Check for duplicates
      mappingCounts.forEach((clubs, mapping) => {
        if (clubs.length > 1) {
          const clubNames = clubs.map(c => c.name).join(', ');
          errors.push(`Team mapping ${mapping} is used by multiple clubs: ${clubNames}`);
        }
      });

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      strapi.log.error('Error validating Viktoria team mapping uniqueness:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  },

  /**
   * Validate club-liga relationships
   * @param clubId - Optional club ID to validate specific club
   * @returns Validation result
   */
  async validateClubLigaRelationships(clubId?: number): Promise<ValidationResult> {
    try {
      const filters: any = { aktiv: true };
      if (clubId) {
        filters.id = clubId;
      }

      const clubs = await strapi.entityService.findMany('api::club.club', {
        filters,
        populate: {
          ligen: true
        }
      });

      const errors: string[] = [];

      for (const club of clubs as any[]) {
        if (!club.ligen || club.ligen.length === 0) {
          errors.push(`Club "${club.name}" is not assigned to any liga`);
        }

        // Validate that all assigned ligen are active
        for (const liga of club.ligen || []) {
          if (!liga.aktiv) {
            errors.push(`Club "${club.name}" is assigned to inactive liga "${liga.name}"`);
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      strapi.log.error('Error validating club-liga relationships:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  },

  /**
   * Comprehensive validation for all club data integrity
   * @returns Detailed validation result with categorized errors
   */
  async validateAllClubData(): Promise<{
    isValid: boolean;
    errors: ClubValidationError[];
    summary: {
      totalClubs: number;
      viktoriaClubs: number;
      gegnerClubs: number;
      inactiveClubs: number;
      clubsWithoutLiga: number;
      duplicateTeamMappings: number;
    }
  }> {
    try {
      const allClubs = await strapi.entityService.findMany('api::club.club', {
        populate: {
          ligen: true
        }
      });

      const errors: ClubValidationError[] = [];
      const summary = {
        totalClubs: allClubs.length,
        viktoriaClubs: 0,
        gegnerClubs: 0,
        inactiveClubs: 0,
        clubsWithoutLiga: 0,
        duplicateTeamMappings: 0
      };

      // Track team mappings for duplicate detection
      const teamMappings = new Map<string, any[]>();

      for (const club of allClubs as any[]) {
        // Count club types
        if (club.club_typ === 'viktoria_verein') {
          summary.viktoriaClubs++;
        } else {
          summary.gegnerClubs++;
        }

        if (!club.aktiv) {
          summary.inactiveClubs++;
        }

        // Validate club has liga assignment
        if (!club.ligen || club.ligen.length === 0) {
          summary.clubsWithoutLiga++;
          errors.push({
            type: ClubErrorType.MISSING_LIGA_ASSIGNMENT,
            message: `Club "${club.name}" is not assigned to any liga`,
            clubId: club.id,
            clubName: club.name
          });
        }

        // Validate Viktoria team mappings
        if (club.club_typ === 'viktoria_verein') {
          if (!club.viktoria_team_mapping) {
            errors.push({
              type: ClubErrorType.INVALID_VIKTORIA_MAPPING,
              message: `Viktoria club "${club.name}" is missing team mapping`,
              clubId: club.id,
              clubName: club.name
            });
          } else {
            if (!teamMappings.has(club.viktoria_team_mapping)) {
              teamMappings.set(club.viktoria_team_mapping, []);
            }
            teamMappings.get(club.viktoria_team_mapping)!.push(club);
          }
        }

        // Validate inactive clubs
        if (!club.aktiv) {
          errors.push({
            type: ClubErrorType.CLUB_INACTIVE,
            message: `Club "${club.name}" is marked as inactive`,
            clubId: club.id,
            clubName: club.name,
            details: { club_typ: club.club_typ }
          });
        }
      }

      // Check for duplicate team mappings
      teamMappings.forEach((clubs, mapping) => {
        if (clubs.length > 1) {
          summary.duplicateTeamMappings++;
          const clubNames = clubs.map(c => c.name).join(', ');
          errors.push({
            type: ClubErrorType.INVALID_VIKTORIA_MAPPING,
            message: `Team mapping "${mapping}" is used by multiple clubs: ${clubNames}`,
            details: { 
              mapping, 
              clubs: clubs.map(c => ({ id: c.id, name: c.name }))
            }
          });
        }
      });

      const result = {
        isValid: errors.length === 0,
        errors,
        summary
      };

      strapi.log.info('Club data validation completed:', {
        isValid: result.isValid,
        errorCount: errors.length,
        summary
      });

      return result;
    } catch (error) {
      strapi.log.error('Error in comprehensive club validation:', error);
      return {
        isValid: false,
        errors: [{
          type: ClubErrorType.CLUB_NOT_FOUND,
          message: `Validation failed: ${error.message}`,
          details: { error: error.message }
        }],
        summary: {
          totalClubs: 0,
          viktoriaClubs: 0,
          gegnerClubs: 0,
          inactiveClubs: 0,
          clubsWithoutLiga: 0,
          duplicateTeamMappings: 0
        }
      };
    }
  },

  /**
   * Get detailed error messages for validation failures
   * @param errors - Array of validation errors
   * @returns Formatted error messages
   */
  getValidationErrorMessages(errors: ClubValidationError[]): string[] {
    return errors.map(error => {
      switch (error.type) {
        case ClubErrorType.CLUB_NOT_FOUND:
          return `Club not found: ${error.message}`;
        case ClubErrorType.CLUB_NOT_IN_LIGA:
          return `Club "${error.clubName}" is not assigned to liga ${error.ligaId}`;
        case ClubErrorType.DUPLICATE_CLUB_NAME:
          return `Duplicate club name detected: "${error.clubName}"`;
        case ClubErrorType.INVALID_VIKTORIA_MAPPING:
          return `Invalid Viktoria team mapping: ${error.message}`;
        case ClubErrorType.CLUB_INACTIVE:
          return `Club "${error.clubName}" is inactive and cannot be used`;
        case ClubErrorType.MISSING_LIGA_ASSIGNMENT:
          return `Club "${error.clubName}" must be assigned to at least one liga`;
        default:
          return error.message;
      }
    });
  },

  // Caching methods

  /**
   * Cache manager for club data
   */
  _cache: new Map<string, { data: any; timestamp: number; ttl: number }>(),
  _cacheStats: {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0
  },

  /**
   * Get cache key for different types of club data
   * @param type - Cache type
   * @param identifier - Unique identifier
   * @returns Cache key string
   */
  getCacheKey(type: string, identifier: string | number): string {
    return `club:${type}:${identifier}`;
  },

  /**
   * Set cache entry with TTL
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttlMinutes - Time to live in minutes (default: 30)
   */
  setCache(key: string, data: any, ttlMinutes: number = 30): void {
    try {
      this._cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttlMinutes * 60 * 1000 // Convert to milliseconds
      });
      this._cacheStats.sets++;
      strapi.log.debug(`Cache set: ${key} (TTL: ${ttlMinutes}m)`);
    } catch (error) {
      strapi.log.error('Error setting cache:', error);
    }
  },

  /**
   * Get cache entry if valid
   * @param key - Cache key
   * @returns Cached data or null if expired/not found
   */
  getCache(key: string): any | null {
    try {
      const entry = this._cache.get(key);
      if (!entry) {
        this._cacheStats.misses++;
        return null;
      }

      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        this._cache.delete(key);
        this._cacheStats.misses++;
        strapi.log.debug(`Cache expired: ${key}`);
        return null;
      }

      this._cacheStats.hits++;
      strapi.log.debug(`Cache hit: ${key}`);
      return entry.data;
    } catch (error) {
      strapi.log.error('Error getting cache:', error);
      this._cacheStats.misses++;
      return null;
    }
  },

  /**
   * Invalidate cache entries by pattern
   * @param pattern - Pattern to match cache keys
   */
  invalidateCache(pattern?: string): void {
    try {
      if (!pattern) {
        // Clear all club cache
        this._cache.clear();
        this._cacheStats.invalidations++;
        strapi.log.info('All club cache cleared');
        return;
      }

      const keysToDelete: string[] = [];
      for (const key of this._cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => {
        this._cache.delete(key);
        this._cacheStats.invalidations++;
      });

      strapi.log.debug(`Cache invalidated for pattern: ${pattern} (${keysToDelete.length} entries)`);
    } catch (error) {
      strapi.log.error('Error invalidating cache:', error);
    }
  },

  /**
   * Get cache statistics
   * @returns Cache performance stats
   */
  getCacheStats(): {
    hits: number;
    misses: number;
    sets: number;
    invalidations: number;
    hitRate: number;
    size: number;
  } {
    const total = this._cacheStats.hits + this._cacheStats.misses;
    return {
      ...this._cacheStats,
      hitRate: total > 0 ? (this._cacheStats.hits / total) * 100 : 0,
      size: this._cache.size
    };
  },

  /**
   * Cached version of findClubsByLiga
   * @param ligaId - Liga ID
   * @returns Cached or fresh club data
   */
  async findClubsByLigaCached(ligaId: number) {
    const cacheKey = this.getCacheKey('liga', ligaId);
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const clubs = await this.findClubsByLiga(ligaId);
    this.setCache(cacheKey, clubs, 15); // Cache for 15 minutes
    return clubs;
  },

  /**
   * Cached version of findViktoriaClubByTeam
   * @param teamMapping - Team mapping
   * @returns Cached or fresh Viktoria club data
   */
  async findViktoriaClubByTeamCached(teamMapping: 'team_1' | 'team_2' | 'team_3') {
    const cacheKey = this.getCacheKey('viktoria', teamMapping);
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const club = await this.findViktoriaClubByTeam(teamMapping);
    this.setCache(cacheKey, club, 60); // Cache for 1 hour (Viktoria clubs change rarely)
    return club;
  },

  /**
   * Cached version of getClubWithLogo
   * @param clubId - Club ID
   * @returns Cached or fresh club data with logo
   */
  async getClubWithLogoCached(clubId: number) {
    const cacheKey = this.getCacheKey('logo', clubId);
    const cached = this.getCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const club = await this.getClubWithLogo(clubId);
    this.setCache(cacheKey, club, 30); // Cache for 30 minutes
    return club;
  },

  /**
   * Preload frequently accessed club data
   * @param ligaIds - Optional array of liga IDs to preload
   */
  async preloadClubData(ligaIds?: number[]): Promise<void> {
    try {
      strapi.log.info('Starting club data preloading...');

      // Preload Viktoria clubs (most frequently accessed)
      const viktoriaPromises = ['team_1', 'team_2', 'team_3'].map(async (mapping) => {
        try {
          await this.findViktoriaClubByTeamCached(mapping as any);
          strapi.log.debug(`Preloaded Viktoria club: ${mapping}`);
        } catch (error) {
          strapi.log.warn(`Failed to preload Viktoria club ${mapping}:`, error.message);
        }
      });

      await Promise.all(viktoriaPromises);

      // Preload clubs by liga if specified
      if (ligaIds && ligaIds.length > 0) {
        const ligaPromises = ligaIds.map(async (ligaId) => {
          try {
            await this.findClubsByLigaCached(ligaId);
            strapi.log.debug(`Preloaded clubs for liga: ${ligaId}`);
          } catch (error) {
            strapi.log.warn(`Failed to preload clubs for liga ${ligaId}:`, error.message);
          }
        });

        await Promise.all(ligaPromises);
      }

      strapi.log.info('Club data preloading completed');
    } catch (error) {
      strapi.log.error('Error during club data preloading:', error);
    }
  },

  /**
   * Warm cache with most frequently accessed data
   */
  async warmCache(): Promise<void> {
    try {
      strapi.log.info('Starting cache warming...');

      // Get all ligen for preloading
      const ligen = await strapi.entityService.findMany('api::liga.liga', {});

      const ligaIds = (ligen as any[]).map(liga => liga.id);
      await this.preloadClubData(ligaIds);

      const stats = this.getCacheStats();
      strapi.log.info('Cache warming completed:', stats);
    } catch (error) {
      strapi.log.error('Error during cache warming:', error);
    }
  },

  /**
   * Handle cache invalidation on club updates
   * @param clubId - Updated club ID
   * @param updateType - Type of update (create, update, delete)
   */
  async handleClubCacheInvalidation(clubId: number, updateType: 'create' | 'update' | 'delete'): Promise<void> {
    try {
      // Handle Redis cache invalidation
      const cache = initializeCacheManager();
      if (cache) {
        try {
          if (updateType === 'delete') {
            await cache.invalidateClub(clubId);
          } else {
            // Get club data to determine what to invalidate
            const club = await strapi.entityService.findOne('api::club.club', clubId, {
              populate: { ligen: true }
            });

            if (club) {
              await cache.invalidateClub(clubId);
              
              // Invalidate liga-based caches
              if ((club as any).ligen) {
                for (const liga of (club as any).ligen) {
                  await cache.invalidateLiga(liga.id);
                }
              }
            }
          }
        } catch (cacheError) {
          strapi.log.warn('Redis cache invalidation error:', cacheError.message);
        }
      }

      // Handle local cache invalidation (fallback)
      let club: any = null;
      if (updateType !== 'delete') {
        club = await strapi.entityService.findOne('api::club.club', clubId, {
          populate: { ligen: true }
        });
      }

      // Invalidate specific club caches
      this.invalidateCache(`club:logo:${clubId}`);
      
      if (club) {
        // Invalidate liga-based caches
        if (club.ligen) {
          club.ligen.forEach((liga: any) => {
            this.invalidateCache(`club:liga:${liga.id}`);
          });
        }

        // Invalidate Viktoria team mapping cache if applicable
        if (club.club_typ === 'viktoria_verein' && club.viktoria_team_mapping) {
          this.invalidateCache(`club:viktoria:${club.viktoria_team_mapping}`);
        }
      } else {
        // For deletes, invalidate all related caches (safer approach)
        this.invalidateCache('liga');
        this.invalidateCache('viktoria');
      }

      strapi.log.debug(`Cache invalidated for club ${clubId} (${updateType})`);
    } catch (error) {
      strapi.log.error('Error handling club cache invalidation:', error);
    }
  },

  /**
   * Get club statistics with caching
   * @param clubId - Club ID
   * @param ligaId - Liga ID
   * @param options - Options including cache control
   * @returns Club statistics
   */
  async getClubStatistics(clubId: number, ligaId: number, options: { skipCache?: boolean } = {}) {
    try {
      // Try Redis cache first
      const cache = initializeCacheManager();
      if (cache && !options.skipCache) {
        try {
          const cachedStats = await cache.getClubStatistics(clubId, ligaId, options);
          if (cachedStats) {
            strapi.log.debug(`Retrieved club statistics for ${clubId} in liga ${ligaId} (cached)`);
            return cachedStats;
          }
        } catch (cacheError) {
          strapi.log.warn('Cache error, falling back to database:', cacheError.message);
        }
      }

      // Fallback to database calculation
      const stats = await strapi.db.connection.raw(`
        SELECT * FROM current_season_club_stats 
        WHERE club_id = ? AND liga_id = ?
      `, [clubId, ligaId]);

      const result = stats.rows.length > 0 ? stats.rows[0] : null;
      strapi.log.debug(`Retrieved club statistics for ${clubId} in liga ${ligaId} (database)`);
      return result;
    } catch (error) {
      strapi.log.error('Error getting club statistics:', error);
      return null;
    }
  },

  /**
   * Warm Redis cache with frequently accessed data
   */
  async warmRedisCache(): Promise<void> {
    const cache = initializeCacheManager();
    if (cache) {
      try {
        await cache.warmCache();
        strapi.log.info('✅ Redis cache warming completed');
      } catch (error) {
        strapi.log.error('❌ Redis cache warming failed:', error.message);
      }
    } else {
      strapi.log.warn('⚠️  Redis cache not available for warming');
    }
  },

  /**
   * Clear all Redis cache
   */
  async clearRedisCache(): Promise<void> {
    const cache = initializeCacheManager();
    if (cache) {
      try {
        await cache.clearAll();
        strapi.log.info('✅ Redis cache cleared');
      } catch (error) {
        strapi.log.error('❌ Redis cache clear failed:', error.message);
      }
    }
  },

  /**
   * Get Redis cache health status
   */
  async getRedisCacheHealth(): Promise<any> {
    const cache = initializeCacheManager();
    if (cache) {
      try {
        return await cache.getHealthStatus();
      } catch (error) {
        strapi.log.error('❌ Redis cache health check failed:', error.message);
        return { status: 'unhealthy', error: error.message };
      }
    }
    return { status: 'unavailable', message: 'Redis cache not initialized' };
  },

  /**
   * Get Redis cache metrics
   */
  getRedisCacheMetrics(): any {
    const cache = initializeCacheManager();
    if (cache) {
      return cache.getMetrics();
    }
    return { message: 'Redis cache not available' };
  },

  /**
   * Cleanup cache manager on service destruction
   */
  async destroy(): Promise<void> {
    if (cacheManager) {
      try {
        await cacheManager.destroy();
        strapi.log.info('✅ Club cache manager destroyed');
      } catch (error) {
        strapi.log.error('❌ Error destroying club cache manager:', error.message);
      }
    }
  }
  };
});