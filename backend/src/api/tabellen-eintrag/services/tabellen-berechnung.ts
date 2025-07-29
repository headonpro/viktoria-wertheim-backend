/**
 * Tabellen-Berechnungs-Service
 * Core service for calculating league table statistics and positions
 */

import type { SpielEntity, SpielStatus } from '../../spiel/services/validation';
import { createDatabaseOptimizer, DatabaseOptimizer } from './database-optimizer';
import { createCacheManager, CacheManager, CacheKeyType, CacheConfig } from './cache-manager';
import { DEFAULT_AUTOMATION_CONFIG } from '../../../config/automation';

export interface TabellenBerechnungsService {
  calculateTableForLiga(ligaId: number, saisonId: number): Promise<TabellenEintrag[]>;
  calculateTeamStats(teamId: number, ligaId: number, saisonId: number): Promise<TeamStats>;
  calculateClubStats(clubId: number, ligaId: number, saisonId: number): Promise<TeamStats>;
  getClubsInLiga(ligaId: number, saisonId: number): Promise<Club[]>;
  sortTableEntries(entries: TabellenEintrag[]): TabellenEintrag[];
  createMissingEntries(ligaId: number, saisonId: number): Promise<void>;
  createMissingClubEntries(ligaId: number, saisonId: number): Promise<void>;
  updateTableEntry(entry: TabellenEintrag): Promise<TabellenEintrag>;
  bulkUpdateTableEntries(entries: TabellenEintrag[]): Promise<TabellenEintrag[]>;
}

/**
 * Implementation of the Tabellen-Berechnungs-Service
 */
export class TabellenBerechnungsServiceImpl implements TabellenBerechnungsService {
  private strapi: any;
  private databaseOptimizer: DatabaseOptimizer;
  private cacheManager: CacheManager;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.databaseOptimizer = createDatabaseOptimizer(strapi);
    
    // Convert automation config to cache config
    const cacheConfig: CacheConfig = {
      enabled: DEFAULT_AUTOMATION_CONFIG.cache.enabled,
      host: DEFAULT_AUTOMATION_CONFIG.cache.redis?.host || 'localhost',
      port: DEFAULT_AUTOMATION_CONFIG.cache.redis?.port || 6379,
      password: DEFAULT_AUTOMATION_CONFIG.cache.redis?.password,
      db: DEFAULT_AUTOMATION_CONFIG.cache.redis?.db || 0,
      keyPrefix: DEFAULT_AUTOMATION_CONFIG.cache.keyPrefix,
      defaultTtl: DEFAULT_AUTOMATION_CONFIG.cache.ttl.tableData,
      maxMemory: '256mb',
      evictionPolicy: 'allkeys-lru'
    };
    
    this.cacheManager = createCacheManager(strapi, cacheConfig);
  }

  /**
   * Calculate individual club statistics for a specific league and season
   * Requirements: 4.1, 4.2, 4.3
   */
  async calculateClubStats(clubId: number, ligaId: number, saisonId: number): Promise<TeamStats> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey({
        type: CacheKeyType.TEAM_STATS,
        clubId,
        ligaId,
        saisonId
      });
      
      const cachedStats = await this.cacheManager.get<TeamStats>(cacheKey);
      if (cachedStats) {
        const processingTime = Date.now() - startTime;
        this.strapi.log.debug(`[TabellenBerechnung] Club stats cache hit for club ${clubId} in ${processingTime}ms`);
        return cachedStats;
      }

      // Query for club-based games
      const games = await this.strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          $and: [
            {
              $or: [
                { heim_club: { id: clubId } },
                { gast_club: { id: clubId } }
              ]
            },
            { liga: { id: ligaId } },
            { saison: { id: saisonId } },
            { status: 'beendet' },
            { heim_tore: { $notNull: true } },
            { gast_tore: { $notNull: true } }
          ]
        },
        populate: {
          heim_club: true,
          gast_club: true,
          liga: true,
          saison: true
        }
      });

      // Initialize statistics
      let spiele = 0;
      let siege = 0;
      let unentschieden = 0;
      let niederlagen = 0;
      let toreFuer = 0;
      let toreGegen = 0;

      // Process each game
      for (const game of games) {
        const isHomeClub = game.heim_club?.id === clubId;
        const clubTore = isHomeClub ? game.heim_tore : game.gast_tore;
        const opponentTore = isHomeClub ? game.gast_tore : game.heim_tore;

        spiele++;
        toreFuer += clubTore;
        toreGegen += opponentTore;

        if (clubTore > opponentTore) {
          siege++;
        } else if (clubTore === opponentTore) {
          unentschieden++;
        } else {
          niederlagen++;
        }
      }

      const tordifferenz = toreFuer - toreGegen;
      const punkte = (siege * 3) + (unentschieden * 1);

      const clubStats: TeamStats = {
        spiele,
        siege,
        unentschieden,
        niederlagen,
        toreFuer,
        toreGegen,
        tordifferenz,
        punkte
      };

      // Cache the calculated stats
      await this.cacheManager.set(cacheKey, clubStats, 600); // Cache for 10 minutes

      const processingTime = Date.now() - startTime;
      
      if (processingTime > 1000) {
        this.strapi.log.warn(`[TabellenBerechnung] Club stats calculation for club ${clubId} took ${processingTime}ms`);
      }

      return clubStats;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.strapi.log.error(`[TabellenBerechnung] Failed to calculate club stats for club ${clubId} after ${processingTime}ms:`, error);
      throw new Error(`Failed to calculate club stats for club ${clubId}: ${error.message}`);
    }
  }

  /**
   * Get unique clubs that have played games in a specific league and season
   * Requirements: 5.1, 5.2
   */
  async getClubsInLiga(ligaId: number, saisonId: number): Promise<Club[]> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey({
        type: CacheKeyType.TABLE_DATA,
        ligaId,
        saisonId,
        additional: 'clubs'
      });
      
      const cachedClubs = await this.cacheManager.get<Club[]>(cacheKey);
      if (cachedClubs) {
        const processingTime = Date.now() - startTime;
        this.strapi.log.debug(`[TabellenBerechnung] Clubs cache hit for liga ${ligaId} in ${processingTime}ms`);
        return cachedClubs;
      }

      // Get all club-based games for this league/season
      const games = await this.strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          liga: { id: ligaId },
          saison: { id: saisonId },
          heim_club: { $notNull: true },
          gast_club: { $notNull: true }
        },
        populate: {
          heim_club: {
            populate: ['logo']
          },
          gast_club: {
            populate: ['logo']
          }
        }
      });

      // Collect unique clubs
      const uniqueClubs = new Map<number, Club>();
      
      games.forEach(game => {
        if (game.heim_club) {
          uniqueClubs.set(game.heim_club.id, {
            id: game.heim_club.id,
            name: game.heim_club.name,
            kurz_name: game.heim_club.kurz_name,
            logo: game.heim_club.logo,
            club_typ: game.heim_club.club_typ,
            viktoria_team_mapping: game.heim_club.viktoria_team_mapping
          });
        }
        if (game.gast_club) {
          uniqueClubs.set(game.gast_club.id, {
            id: game.gast_club.id,
            name: game.gast_club.name,
            kurz_name: game.gast_club.kurz_name,
            logo: game.gast_club.logo,
            club_typ: game.gast_club.club_typ,
            viktoria_team_mapping: game.gast_club.viktoria_team_mapping
          });
        }
      });

      const clubs = Array.from(uniqueClubs.values());
      
      // Sort clubs alphabetically by name for consistent ordering
      clubs.sort((a, b) => a.name.localeCompare(b.name));

      // Cache the result
      await this.cacheManager.set(cacheKey, clubs, 600); // Cache for 10 minutes

      const processingTime = Date.now() - startTime;
      this.strapi.log.debug(`[TabellenBerechnung] Found ${clubs.length} clubs for liga ${ligaId} in ${processingTime}ms`);

      return clubs;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.strapi.log.error(`[TabellenBerechnung] Failed to get clubs for liga ${ligaId} after ${processingTime}ms:`, error);
      throw new Error(`Failed to get clubs for liga ${ligaId}: ${error.message}`);
    }
  }

  /**
   * Create unified entity collection from both teams and clubs
   * Requirements: 5.3, 8.4
   */
  private createUnifiedEntityCollection(clubGames: any[], teamGames: any[]): Map<string, UnifiedEntity> {
    const unifiedEntities = new Map<string, UnifiedEntity>();

    // Process club-based games
    clubGames.forEach(game => {
      if (game.heim_club) {
        const key = `club_${game.heim_club.id}`;
        unifiedEntities.set(key, {
          id: game.heim_club.id,
          name: game.heim_club.name,
          logo: game.heim_club.logo,
          type: 'club',
          club: game.heim_club
        });
      }
      if (game.gast_club) {
        const key = `club_${game.gast_club.id}`;
        unifiedEntities.set(key, {
          id: game.gast_club.id,
          name: game.gast_club.name,
          logo: game.gast_club.logo,
          type: 'club',
          club: game.gast_club
        });
      }
    });

    // Process team-based games (fallback)
    teamGames.forEach(game => {
      if (game.heim_team) {
        const key = `team_${game.heim_team.id}`;
        // Only add if no club equivalent exists
        if (!this.hasClubEquivalent(game.heim_team, unifiedEntities)) {
          unifiedEntities.set(key, {
            id: game.heim_team.id,
            name: game.heim_team.name,
            logo: game.heim_team.logo,
            type: 'team',
            team: game.heim_team
          });
        }
      }
      if (game.gast_team) {
        const key = `team_${game.gast_team.id}`;
        // Only add if no club equivalent exists
        if (!this.hasClubEquivalent(game.gast_team, unifiedEntities)) {
          unifiedEntities.set(key, {
            id: game.gast_team.id,
            name: game.gast_team.name,
            logo: game.gast_team.logo,
            type: 'team',
            team: game.gast_team
          });
        }
      }
    });

    return unifiedEntities;
  }

  /**
   * Check if a team has a club equivalent in the unified collection
   * Requirements: 8.4
   */
  private hasClubEquivalent(team: Team, unifiedEntities: Map<string, UnifiedEntity>): boolean {
    // Check if there's a club with viktoria_team_mapping that matches this team
    for (const entity of unifiedEntities.values()) {
      if (entity.type === 'club' && entity.club?.club_typ === 'viktoria_verein') {
        // Map team IDs to viktoria_team_mapping values
        const teamMapping = this.getTeamMappingForTeamId(team.id);
        if (teamMapping && entity.club.viktoria_team_mapping === teamMapping) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Get viktoria_team_mapping value for a team ID
   * Requirements: 8.4
   */
  private getTeamMappingForTeamId(teamId: number): string | null {
    // This mapping should ideally come from configuration or database
    // For now, using a simple mapping based on common team IDs
    const teamMappings: { [key: number]: string } = {
      1: 'team_1',
      2: 'team_2', 
      3: 'team_3'
    };
    return teamMappings[teamId] || null;
  }

  /**
   * Validate data consistency between team and club systems
   * Requirements: 5.5, 8.4
   */
  private async validateDataConsistency(ligaId: number, saisonId: number): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check for games with both team and club data
      const mixedGames = await this.strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          liga: { id: ligaId },
          saison: { id: saisonId },
          heim_team: { $notNull: true },
          heim_club: { $notNull: true }
        }
      });

      if (mixedGames.length > 0) {
        warnings.push(`Found ${mixedGames.length} games with both team and club data - this may cause inconsistencies`);
      }

      // Check for orphaned table entries
      const tableEntries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          liga: { id: ligaId }
        },
        populate: {
          team: true,
          club: true
        }
      });

      const orphanedEntries = tableEntries.filter(entry => !entry.team && !entry.club);
      if (orphanedEntries.length > 0) {
        errors.push(`Found ${orphanedEntries.length} table entries without team or club reference`);
      }

      // Check for duplicate entries (same entity with both team and club entries)
      const duplicateCheck = new Map<string, number>();
      tableEntries.forEach(entry => {
        const key = entry.team_name.toLowerCase();
        duplicateCheck.set(key, (duplicateCheck.get(key) || 0) + 1);
      });

      const duplicates = Array.from(duplicateCheck.entries()).filter(([_, count]) => count > 1);
      if (duplicates.length > 0) {
        warnings.push(`Found potential duplicate entries for: ${duplicates.map(([name]) => name).join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Calculate individual team statistics for a specific league and season
   * Requirements: 2.1, 2.2, 2.3
   */
  async calculateTeamStats(teamId: number, ligaId: number, saisonId: number): Promise<TeamStats> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey({
        type: CacheKeyType.TEAM_STATS,
        teamId,
        ligaId,
        saisonId
      });
      
      const cachedStats = await this.cacheManager.get<TeamStats>(cacheKey);
      if (cachedStats) {
        const processingTime = Date.now() - startTime;
        this.strapi.log.debug(`[TabellenBerechnung] Team stats cache hit for team ${teamId} in ${processingTime}ms`);
        return cachedStats;
      }

      // Optimized query using indexes created by database optimizer
      // This query benefits from idx_spiele_liga_saison_status and idx_spiele_teams indexes
      const games = await this.strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          $and: [
            {
              $or: [
                { heim_team: { id: teamId } },
                { gast_team: { id: teamId } }
              ]
            },
            { liga: { id: ligaId } },
            { saison: { id: saisonId } },
            { status: 'beendet' },
            { heim_tore: { $notNull: true } },
            { gast_tore: { $notNull: true } }
          ]
        },
        populate: {
          heim_team: true,
          gast_team: true,
          liga: true,
          saison: true
        }
      });

      // Initialize statistics
      let spiele = 0;
      let siege = 0;
      let unentschieden = 0;
      let niederlagen = 0;
      let toreFuer = 0;
      let toreGegen = 0;

      // Process each game
      for (const game of games) {
        const isHomeTeam = game.heim_team.id === teamId;
        const teamTore = isHomeTeam ? game.heim_tore : game.gast_tore;
        const opponentTore = isHomeTeam ? game.gast_tore : game.heim_tore;

        spiele++;
        toreFuer += teamTore;
        toreGegen += opponentTore;

        // Calculate points according to football rules
        // Requirement 2.1: 3 points for win
        // Requirement 2.2: 1 point for draw  
        // Requirement 2.3: 0 points for loss
        if (teamTore > opponentTore) {
          siege++;
        } else if (teamTore === opponentTore) {
          unentschieden++;
        } else {
          niederlagen++;
        }
      }

      const tordifferenz = toreFuer - toreGegen;
      const punkte = (siege * 3) + (unentschieden * 1);

      const teamStats: TeamStats = {
        spiele,
        siege,
        unentschieden,
        niederlagen,
        toreFuer,
        toreGegen,
        tordifferenz,
        punkte
      };

      // Cache the calculated stats
      await this.cacheManager.set(cacheKey, teamStats, 600); // Cache for 10 minutes

      const processingTime = Date.now() - startTime;
      
      // Log performance metrics for monitoring
      if (processingTime > 1000) {
        this.strapi.log.warn(`[TabellenBerechnung] Team stats calculation for team ${teamId} took ${processingTime}ms`);
      }

      return teamStats;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.strapi.log.error(`[TabellenBerechnung] Failed to calculate team stats for team ${teamId} after ${processingTime}ms:`, error);
      throw new Error(`Failed to calculate team stats for team ${teamId}: ${error.message}`);
    }
  }

  /**
   * Sort table entries according to official football rules
   * Requirements: 2.4, 2.5, 2.6
   */
  sortTableEntries(entries: TabellenEintrag[]): TabellenEintrag[] {
    const sortedEntries = [...entries].sort((a, b) => {
      // Requirement 2.4: Sort by points (descending)
      if (a.punkte !== b.punkte) {
        return b.punkte - a.punkte;
      }

      // Requirement 2.5: Then by goal difference (descending)
      if (a.tordifferenz !== b.tordifferenz) {
        return b.tordifferenz - a.tordifferenz;
      }

      // Requirement 2.6: Then by goals scored (descending)
      if (a.tore_fuer !== b.tore_fuer) {
        return b.tore_fuer - a.tore_fuer;
      }

      // Final tiebreaker: alphabetical by team name (ascending)
      return a.team_name.localeCompare(b.team_name);
    });

    // Update positions after sorting
    return sortedEntries.map((entry, index) => ({
      ...entry,
      platz: index + 1
    }));
  }

  /**
   * Calculate complete table for a league with transaction support
   * Requirements: 4.4, 4.5, 8.1
   */
  async calculateTableForLiga(ligaId: number, saisonId: number): Promise<TabellenEintrag[]> {
    const startTime = Date.now();
    
    // Check cache first
    const cacheKey = this.generateCacheKey({
      type: CacheKeyType.TABLE_DATA,
      ligaId,
      saisonId
    });
    
    const cachedTable = await this.cacheManager.get<TabellenEintrag[]>(cacheKey);
    if (cachedTable) {
      const processingTime = Date.now() - startTime;
      this.strapi.log.debug(`[TabellenBerechnung] Table cache hit for liga ${ligaId} in ${processingTime}ms`);
      return cachedTable;
    }
    
    // Use database transaction for data consistency (Requirement 4.5)
    return await this.strapi.db.transaction(async (trx) => {
      try {
        // Ensure database is optimized before heavy calculations
        await this.ensureDatabaseOptimization();

        // Migrate existing entries to use club relations where possible
        await this.migrateExistingEntriesToClubs(ligaId, saisonId);

        // Create missing entries for both teams and clubs
        await this.createMissingEntries(ligaId, saisonId);
        await this.createMissingClubEntries(ligaId, saisonId);

        // Get club-based games
        const clubGames = await this.strapi.entityService.findMany('api::spiel.spiel', {
          filters: {
            liga: { id: ligaId },
            saison: { id: saisonId },
            heim_club: { $notNull: true },
            gast_club: { $notNull: true }
          },
          populate: {
            heim_club: {
              populate: ['logo']
            },
            gast_club: {
              populate: ['logo']
            }
          }
        });

        // Get team-based games (fallback)
        const teamGames = await this.strapi.entityService.findMany('api::spiel.spiel', {
          filters: {
            liga: { id: ligaId },
            saison: { id: saisonId },
            heim_team: { $notNull: true },
            gast_team: { $notNull: true },
            heim_club: { $null: true },
            gast_club: { $null: true }
          },
          populate: {
            heim_team: true,
            gast_team: true
          }
        });

        // Validate data consistency before processing
        const validationResult = await this.validateDataConsistency(ligaId, saisonId);
        if (!validationResult.isValid) {
          this.strapi.log.error(`[TabellenBerechnung] Data consistency validation failed for liga ${ligaId}:`, validationResult.errors);
        }
        if (validationResult.warnings.length > 0) {
          this.strapi.log.warn(`[TabellenBerechnung] Data consistency warnings for liga ${ligaId}:`, validationResult.warnings);
        }

        // Create unified entity collection for mixed team/club processing
        const unifiedEntities = this.createUnifiedEntityCollection(clubGames, teamGames);

        const tableEntries: TabellenEintrag[] = [];

        // Calculate stats for each unified entity
        for (const [key, entity] of unifiedEntities) {
          let stats: TeamStats;
          
          if (entity.type === 'club' && entity.club) {
            stats = await this.calculateClubStats(entity.club.id, ligaId, saisonId);
            
            tableEntries.push({
              team_name: entity.club.name, // Use club name for team_name
              liga: { id: ligaId, name: '' }, // Will be populated properly
              club: entity.club,
              platz: 0, // Will be set after sorting
              spiele: stats.spiele,
              siege: stats.siege,
              unentschieden: stats.unentschieden,
              niederlagen: stats.niederlagen,
              tore_fuer: stats.toreFuer,
              tore_gegen: stats.toreGegen,
              tordifferenz: stats.tordifferenz,
              punkte: stats.punkte,
              last_updated: new Date(),
              auto_calculated: true,
              calculation_source: 'automatic'
            });
          } else if (entity.type === 'team' && entity.team) {
            stats = await this.calculateTeamStats(entity.team.id, ligaId, saisonId);
            
            tableEntries.push({
              team_name: entity.team.name,
              liga: { id: ligaId, name: '' }, // Will be populated properly
              team: entity.team,
              platz: 0, // Will be set after sorting
              spiele: stats.spiele,
              siege: stats.siege,
              unentschieden: stats.unentschieden,
              niederlagen: stats.niederlagen,
              tore_fuer: stats.toreFuer,
              tore_gegen: stats.toreGegen,
              tordifferenz: stats.tordifferenz,
              punkte: stats.punkte,
              last_updated: new Date(),
              auto_calculated: true,
              calculation_source: 'automatic'
            });
          }
        }

        // Sort entries according to football rules
        const sortedEntries = this.sortTableEntries(tableEntries);

        // Bulk update all entries for performance (Requirement 8.1)
        const updatedEntries = await this.bulkUpdateTableEntries(sortedEntries);

        // Cache the calculated table
        await this.cacheManager.set(cacheKey, updatedEntries, 300); // Cache for 5 minutes

        // Invalidate related cache entries
        await this.invalidateRelatedCache(ligaId, saisonId);

        const processingTime = Date.now() - startTime;
        
        // Performance monitoring and alerting
        if (processingTime > 15000) {
          this.strapi.log.warn(`[TabellenBerechnung] Table calculation for liga ${ligaId} took ${processingTime}ms - exceeds performance target`);
        }
        
        this.strapi.log.info(`Table calculation completed for liga ${ligaId}, saison ${saisonId} in ${processingTime}ms`);

        return updatedEntries;
      } catch (error) {
        const processingTime = Date.now() - startTime;
        this.strapi.log.error(`Table calculation failed for liga ${ligaId}, saison ${saisonId} after ${processingTime}ms:`, error);
        throw error;
      }
    });
  }

  /**
   * Create missing table entries for clubs that don't have entries yet
   * Requirements: 4.1, 4.2
   */
  async createMissingClubEntries(ligaId: number, saisonId: number): Promise<void> {
    try {
      // Get all clubs that have played games in this league/season
      const games = await this.strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          liga: { id: ligaId },
          saison: { id: saisonId },
          heim_club: { $notNull: true },
          gast_club: { $notNull: true }
        },
        populate: {
          heim_club: {
            populate: ['logo']
          },
          gast_club: {
            populate: ['logo']
          },
          liga: true,
          saison: true
        }
      });

      const uniqueClubs = new Map();
      games.forEach(game => {
        if (game.heim_club) {
          uniqueClubs.set(game.heim_club.id, {
            club: game.heim_club,
            liga: game.liga,
            saison: game.saison
          });
        }
        if (game.gast_club) {
          uniqueClubs.set(game.gast_club.id, {
            club: game.gast_club,
            liga: game.liga,
            saison: game.saison
          });
        }
      });

      // Check which clubs already have table entries
      const existingEntries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          liga: { id: ligaId },
          saison: { id: saisonId },
          club: { $notNull: true }
        },
        populate: {
          club: true
        }
      });

      const existingClubIds = new Set(existingEntries.map(entry => entry.club?.id).filter(Boolean));

      // Create entries for clubs that don't have them yet
      const entriesToCreate = [];
      for (const [clubId, { club, liga, saison }] of uniqueClubs) {
        if (!existingClubIds.has(clubId)) {
          entriesToCreate.push({
            team_name: club.name, // Use club name for team_name field
            liga: liga.id,
            saison: saison.id,
            club: club.id,
            platz: 0,
            spiele: 0,
            siege: 0,
            unentschieden: 0,
            niederlagen: 0,
            tore_fuer: 0,
            tore_gegen: 0,
            tordifferenz: 0,
            punkte: 0,
            last_updated: new Date(),
            auto_calculated: true,
            calculation_source: 'automatic'
          });
        }
      }

      // Bulk create missing entries
      if (entriesToCreate.length > 0) {
        await Promise.all(
          entriesToCreate.map(entry =>
            this.strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
              data: entry
            })
          )
        );
        this.strapi.log.info(`Created ${entriesToCreate.length} missing club table entries for liga ${ligaId}, saison ${saisonId}`);
      }
    } catch (error) {
      throw new Error(`Failed to create missing club entries: ${error.message}`);
    }
  }

  /**
   * Create missing table entries for teams that don't have entries yet
   * Requirements: 4.4, 4.5
   */
  async createMissingEntries(ligaId: number, saisonId: number): Promise<void> {
    try {
      // Get all teams that have played games in this league/season
      const games = await this.strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          liga: { id: ligaId },
          saison: { id: saisonId }
        },
        populate: {
          heim_team: true,
          gast_team: true,
          liga: true,
          saison: true
        }
      });

      const uniqueTeams = new Map();
      games.forEach(game => {
        uniqueTeams.set(game.heim_team.id, {
          team: game.heim_team,
          liga: game.liga,
          saison: game.saison
        });
        uniqueTeams.set(game.gast_team.id, {
          team: game.gast_team,
          liga: game.liga,
          saison: game.saison
        });
      });

      // Check which teams already have table entries
      const existingEntries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          liga: { id: ligaId },
          saison: { id: saisonId }
        },
        populate: {
          team: true
        }
      });

      const existingTeamIds = new Set(existingEntries.map(entry => entry.team.id));

      // Create entries for teams that don't have them yet
      const entriesToCreate = [];
      for (const [teamId, { team, liga, saison }] of uniqueTeams) {
        if (!existingTeamIds.has(teamId)) {
          entriesToCreate.push({
            team_name: team.name,
            liga: liga.id,
            saison: saison.id,
            team: team.id,
            platz: 0,
            spiele: 0,
            siege: 0,
            unentschieden: 0,
            niederlagen: 0,
            tore_fuer: 0,
            tore_gegen: 0,
            tordifferenz: 0,
            punkte: 0,
            last_updated: new Date(),
            auto_calculated: true,
            calculation_source: 'automatic'
          });
        }
      }

      // Bulk create missing entries
      if (entriesToCreate.length > 0) {
        await Promise.all(
          entriesToCreate.map(entry =>
            this.strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
              data: entry
            })
          )
        );
        this.strapi.log.info(`Created ${entriesToCreate.length} missing table entries for liga ${ligaId}, saison ${saisonId}`);
      }
    } catch (error) {
      throw new Error(`Failed to create missing entries: ${error.message}`);
    }
  }

  /**
   * Update a single table entry
   */
  async updateTableEntry(entry: TabellenEintrag): Promise<TabellenEintrag> {
    try {
      const updated = await this.strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', entry.id, {
        data: {
          team_name: entry.team_name,
          platz: entry.platz,
          spiele: entry.spiele,
          siege: entry.siege,
          unentschieden: entry.unentschieden,
          niederlagen: entry.niederlagen,
          tore_fuer: entry.tore_fuer,
          tore_gegen: entry.tore_gegen,
          tordifferenz: entry.tordifferenz,
          punkte: entry.punkte,
          last_updated: new Date(),
          auto_calculated: entry.auto_calculated,
          calculation_source: entry.calculation_source
        }
      });
      return updated;
    } catch (error) {
      throw new Error(`Failed to update table entry ${entry.id}: ${error.message}`);
    }
  }

  /**
   * Ensure database is optimized for performance
   * Requirements: 8.1, 8.2
   */
  private async ensureDatabaseOptimization(): Promise<void> {
    try {
      // Check if optimization has been run recently
      const lastOptimization = await this.getLastOptimizationTime();
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      if (!lastOptimization || (now - lastOptimization) > oneHour) {
        this.strapi.log.info('[TabellenBerechnung] Running database optimization...');
        
        // Run optimizations in background to avoid blocking calculations
        setImmediate(async () => {
          try {
            await this.databaseOptimizer.createIndexes();
            await this.databaseOptimizer.optimizeQueries();
            await this.setLastOptimizationTime(now);
          } catch (error) {
            this.strapi.log.warn('[TabellenBerechnung] Database optimization failed:', error);
          }
        });
      }
    } catch (error) {
      this.strapi.log.warn('[TabellenBerechnung] Could not check database optimization status:', error);
    }
  }

  /**
   * Get last optimization timestamp
   */
  private async getLastOptimizationTime(): Promise<number | null> {
    try {
      // Store optimization timestamp in a simple key-value store or cache
      // For now, use a simple in-memory approach
      return (global as any).__lastDbOptimization || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set last optimization timestamp
   */
  private async setLastOptimizationTime(timestamp: number): Promise<void> {
    try {
      (global as any).__lastDbOptimization = timestamp;
    } catch (error) {
      this.strapi.log.warn('[TabellenBerechnung] Could not save optimization timestamp:', error);
    }
  }

  /**
   * Generate cache key for different data types
   */
  private generateCacheKey(params: {
    type: CacheKeyType;
    ligaId?: number;
    saisonId?: number;
    teamId?: number;
    clubId?: number;
    additional?: string;
  }): string {
    const parts: string[] = [params.type];
    
    if (params.teamId) parts.push(`team:${params.teamId}`);
    if (params.clubId) parts.push(`club:${params.clubId}`);
    if (params.ligaId) parts.push(`liga:${params.ligaId}`);
    if (params.saisonId) parts.push(`saison:${params.saisonId}`);
    if (params.additional) parts.push(params.additional);
    
    return parts.join(':');
  }

  /**
   * Invalidate cache entries related to a league/season
   */
  private async invalidateRelatedCache(ligaId: number, saisonId: number): Promise<void> {
    try {
      // Invalidate table data cache
      await this.cacheManager.invalidatePattern(`${CacheKeyType.TABLE_DATA}:liga:${ligaId}:saison:${saisonId}*`);
      
      // Invalidate team stats cache for this league/season
      await this.cacheManager.invalidatePattern(`${CacheKeyType.TEAM_STATS}:*:liga:${ligaId}:saison:${saisonId}*`);
      
      // Invalidate calculation results cache
      await this.cacheManager.invalidatePattern(`${CacheKeyType.CALCULATION_RESULT}:liga:${ligaId}:saison:${saisonId}*`);
      
      this.strapi.log.debug(`[TabellenBerechnung] Invalidated cache for liga ${ligaId}, saison ${saisonId}`);
    } catch (error) {
      this.strapi.log.warn('[TabellenBerechnung] Failed to invalidate cache:', error);
    }
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(): Promise<void> {
    try {
      await this.cacheManager.warmCache();
      this.strapi.log.info('[TabellenBerechnung] Cache warming completed');
    } catch (error) {
      this.strapi.log.error('[TabellenBerechnung] Cache warming failed:', error);
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  async getCacheStats() {
    return await this.cacheManager.getCacheStats();
  }

  /**
   * Migrate existing table entries to use club relations
   * Requirements: 4.1, 4.2, 8.1, 8.2
   */
  async migrateExistingEntriesToClubs(ligaId: number, saisonId: number): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Get all existing table entries that don't have club relations
      const existingEntries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          liga: { id: ligaId },
          saison: { id: saisonId },
          club: { $null: true },
          team: { $notNull: true }
        },
        populate: {
          team: true,
          liga: true,
          saison: true
        }
      });

      if (existingEntries.length === 0) {
        this.strapi.log.info(`[TabellenBerechnung] No entries to migrate for liga ${ligaId}, saison ${saisonId}`);
        return;
      }

      this.strapi.log.info(`[TabellenBerechnung] Starting migration of ${existingEntries.length} entries for liga ${ligaId}, saison ${saisonId}`);

      let migratedCount = 0;
      let skippedCount = 0;

      // Process each entry
      for (const entry of existingEntries) {
        try {
          // Try to find a corresponding club for this team
          const correspondingClub = await this.findClubForTeam(entry.team, ligaId);
          
          if (correspondingClub) {
            // Update the entry to use club relation
            await this.strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', entry.id, {
              data: {
                team_name: correspondingClub.name, // Use club name for team_name
                club: correspondingClub.id,
                last_updated: new Date(),
                calculation_source: 'migration'
              }
            });
            migratedCount++;
            this.strapi.log.debug(`[TabellenBerechnung] Migrated entry ${entry.id} from team "${entry.team.name}" to club "${correspondingClub.name}"`);
          } else {
            skippedCount++;
            this.strapi.log.debug(`[TabellenBerechnung] No corresponding club found for team "${entry.team.name}", keeping team-based entry`);
          }
        } catch (error) {
          this.strapi.log.error(`[TabellenBerechnung] Failed to migrate entry ${entry.id}:`, error);
          skippedCount++;
        }
      }

      const processingTime = Date.now() - startTime;
      this.strapi.log.info(`[TabellenBerechnung] Migration completed in ${processingTime}ms: ${migratedCount} migrated, ${skippedCount} skipped`);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.strapi.log.error(`[TabellenBerechnung] Migration failed after ${processingTime}ms:`, error);
      throw new Error(`Failed to migrate existing entries: ${error.message}`);
    }
  }

  /**
   * Find corresponding club for a team based on viktoria_team_mapping
   * Requirements: 8.1, 8.2
   */
  private async findClubForTeam(team: Team, ligaId: number): Promise<Club | null> {
    try {
      // Get the team mapping for this team
      const teamMapping = this.getTeamMappingForTeamId(team.id);
      
      if (!teamMapping) {
        return null;
      }

      // Find club with matching viktoria_team_mapping in this league
      const clubs = await this.strapi.entityService.findMany('api::club.club', {
        filters: {
          viktoria_team_mapping: teamMapping,
          club_typ: 'viktoria_verein',
          ligen: { id: ligaId }
        },
        populate: ['logo']
      });

      return clubs.length > 0 ? clubs[0] : null;
    } catch (error) {
      this.strapi.log.error(`[TabellenBerechnung] Failed to find club for team ${team.id}:`, error);
      return null;
    }
  }

  /**
   * Bulk update table entries for performance
   * Requirements: 8.1
   */
  async bulkUpdateTableEntries(entries: TabellenEintrag[]): Promise<TabellenEintrag[]> {
    const startTime = Date.now();
    
    try {
      // Batch size for optimal performance
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < entries.length; i += batchSize) {
        batches.push(entries.slice(i, i + batchSize));
      }

      const allUpdatedEntries: TabellenEintrag[] = [];

      // Process batches sequentially to avoid overwhelming the database
      for (const batch of batches) {
        const batchPromises = batch.map(async (entry) => {
          let existingEntries = [];
          
          // Check for existing entries based on club or team
          if (entry.club) {
            existingEntries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
              filters: {
                club: { id: entry.club.id },
                liga: { id: entry.liga.id }
              }
            });
          } else if (entry.team) {
            existingEntries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
              filters: {
                team: { id: entry.team.id },
                liga: { id: entry.liga.id }
              }
            });
          }

          if (existingEntries.length > 0) {
            const existingEntry = existingEntries[0];
            const updateData: any = {
              team_name: entry.team_name,
              platz: entry.platz,
              spiele: entry.spiele,
              siege: entry.siege,
              unentschieden: entry.unentschieden,
              niederlagen: entry.niederlagen,
              tore_fuer: entry.tore_fuer,
              tore_gegen: entry.tore_gegen,
              tordifferenz: entry.tordifferenz,
              punkte: entry.punkte,
              last_updated: new Date(),
              auto_calculated: entry.auto_calculated,
              calculation_source: entry.calculation_source
            };

            // Update club relation if present
            if (entry.club) {
              updateData.club = entry.club.id;
            }

            return await this.strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', existingEntry.id, {
              data: updateData
            });
          } else {
            // Create new entry if it doesn't exist
            const createData: any = {
              team_name: entry.team_name,
              liga: entry.liga.id,
              platz: entry.platz,
              spiele: entry.spiele,
              siege: entry.siege,
              unentschieden: entry.unentschieden,
              niederlagen: entry.niederlagen,
              tore_fuer: entry.tore_fuer,
              tore_gegen: entry.tore_gegen,
              tordifferenz: entry.tordifferenz,
              punkte: entry.punkte,
              last_updated: new Date(),
              auto_calculated: entry.auto_calculated,
              calculation_source: entry.calculation_source
            };

            // Set club or team relation
            if (entry.club) {
              createData.club = entry.club.id;
            } else if (entry.team) {
              createData.team = entry.team.id;
            }

            return await this.strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
              data: createData
            });
          }
        });

        const batchResults = await Promise.all(batchPromises);
        allUpdatedEntries.push(...batchResults);
      }

      const processingTime = Date.now() - startTime;
      this.strapi.log.info(`Bulk updated ${allUpdatedEntries.length} table entries in ${processingTime}ms`);
      
      return allUpdatedEntries;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.strapi.log.error(`Bulk update failed after ${processingTime}ms:`, error);
      throw new Error(`Failed to bulk update table entries: ${error.message}`);
    }
  }
}

/**
 * Factory function to create a new instance of the service
 */
export function createTabellenBerechnungsService(strapi: any): TabellenBerechnungsService {
  return new TabellenBerechnungsServiceImpl(strapi);
}

export interface TeamStats {
  spiele: number;
  siege: number;
  unentschieden: number;
  niederlagen: number;
  toreFuer: number;
  toreGegen: number;
  tordifferenz: number;
  punkte: number;
}

export interface TabellenEintrag {
  id?: number;
  team_name: string;
  liga: Liga;
  team?: Team;
  club?: Club;
  team_logo?: any;
  platz: number;
  spiele: number;
  siege: number;
  unentschieden: number;
  niederlagen: number;
  tore_fuer: number;
  tore_gegen: number;
  tordifferenz: number;
  punkte: number;
  // New fields for automation tracking
  last_updated?: Date;
  auto_calculated?: boolean;
  calculation_source?: string;
}

export interface Liga {
  id: number;
  name: string;
}

export interface Team {
  id: number;
  name: string;
  logo?: any;
}

export interface Club {
  id: number;
  name: string;
  kurz_name?: string;
  logo?: any;
  club_typ: 'viktoria_verein' | 'gegner_verein';
  viktoria_team_mapping?: 'team_1' | 'team_2' | 'team_3';
}

export interface UnifiedEntity {
  id: number;
  name: string;
  logo?: any;
  type: 'club' | 'team';
  club?: Club;
  team?: Team;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CalculationContext {
  ligaId: number;
  saisonId: number;
  triggeredBy: CalculationTrigger;
  timestamp: Date;
  jobId?: string;
}

export enum CalculationTrigger {
  GAME_RESULT = 'game_result',
  GAME_CREATED = 'game_created',
  GAME_DELETED = 'game_deleted',
  MANUAL_TRIGGER = 'manual_trigger',
  SCHEDULED = 'scheduled'
}

export interface SortingCriteria {
  punkte: 'desc';
  tordifferenz: 'desc';
  tore_fuer: 'desc';
  team_name: 'asc';
}

export interface CalculationResult {
  success: boolean;
  entries: TabellenEintrag[];
  errors: CalculationError[];
  warnings: CalculationWarning[];
  processingTime: number;
  timestamp: Date;
  context: CalculationContext;
}

export interface CalculationError {
  type: CalculationErrorType;
  message: string;
  details: any;
  timestamp: Date;
  ligaId: number;
  saisonId: number;
  retryable: boolean;
}

export interface CalculationWarning {
  type: CalculationWarningType;
  message: string;
  details: any;
  timestamp: Date;
}

export enum CalculationErrorType {
  VALIDATION_ERROR = 'validation_error',
  DATABASE_ERROR = 'database_error',
  TIMEOUT_ERROR = 'timeout_error',
  CONCURRENCY_ERROR = 'concurrency_error',
  SYSTEM_ERROR = 'system_error',
  MISSING_DATA = 'missing_data'
}

export enum CalculationWarningType {
  MISSING_TEAM_ENTRY = 'missing_team_entry',
  INCONSISTENT_DATA = 'inconsistent_data',
  PERFORMANCE_ISSUE = 'performance_issue'
}