/**
 * Migration service for Tabellen-Eintrag collection
 * Handles migration from team-based to club-based entries
 */

export interface MigrationService {
  migrateTeamNamesToClubNames(): Promise<MigrationResult>;
  validateDataConsistency(): Promise<ValidationResult>;
  updateExistingEntriesWithClubData(): Promise<MigrationResult>;
  migrateAllTabellenEintraege(): Promise<MigrationResult>;
  getMigrationStatistics(): Promise<{
    totalEntries: number;
    entriesWithClubs: number;
    entriesWithoutClubs: number;
    entriesWithTeams: number;
    entriesWithoutTeams: number;
    inconsistentEntries: number;
    migrationNeeded: boolean;
  }>;
}

export interface MigrationResult {
  success: boolean;
  processed: number;
  updated: number;
  errors: MigrationError[];
  warnings: string[];
}

export interface ValidationResult {
  isValid: boolean;
  inconsistencies: DataInconsistency[];
  recommendations: string[];
}

export interface MigrationError {
  entryId: number;
  error: string;
  details: any;
}

export interface DataInconsistency {
  entryId: number;
  issue: string;
  currentValue: string;
  expectedValue: string;
}

export class MigrationServiceImpl implements MigrationService {
  private strapi: any;

  constructor(strapi: any) {
    this.strapi = strapi;
  }

  /**
   * Migrate existing entries to use club names for team_name field
   * Requirements: 4.2, 4.3
   */
  async migrateTeamNamesToClubNames(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: true,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: []
    };

    try {
      // Get all entries that have club relations but might have incorrect team_name
      const entries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          club: { $notNull: true }
        },
        populate: {
          club: true,
          team: true,
          liga: true
        }
      });

      result.processed = entries.length;

      for (const entry of entries) {
        try {
          if (entry.club && entry.club.name) {
            // Check if team_name needs to be updated
            if (entry.team_name !== entry.club.name) {
              await this.strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', entry.id, {
                data: {
                  team_name: entry.club.name
                }
              });
              
              result.updated++;
              this.strapi.log.info(`[Migration] Updated entry ${entry.id}: "${entry.team_name}" -> "${entry.club.name}"`);
            }
          }
        } catch (error) {
          result.errors.push({
            entryId: entry.id,
            error: error.message,
            details: error
          });
          result.success = false;
        }
      }

      const processingTime = Date.now() - startTime;
      this.strapi.log.info(`[Migration] Completed team name migration in ${processingTime}ms. Processed: ${result.processed}, Updated: ${result.updated}, Errors: ${result.errors.length}`);

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        entryId: 0,
        error: `Migration failed: ${error.message}`,
        details: error
      });
      return result;
    }
  }

  /**
   * Update existing entries with club data where possible
   * Requirements: 4.2, 8.2
   */
  async updateExistingEntriesWithClubData(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: true,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: []
    };

    try {
      // Get entries that have team relations but no club relations
      const entriesWithoutClubs = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          team: { $notNull: true },
          club: { $null: true }
        },
        populate: {
          team: true,
          liga: true
        }
      });

      result.processed = entriesWithoutClubs.length;

      // Try to find matching clubs for these entries
      for (const entry of entriesWithoutClubs) {
        try {
          if (entry.team && entry.team.name) {
            // Look for matching club using improved matching logic
            const club = await this.findMatchingClub(entry.team.name, entry.liga?.id);

            if (club) {
              await this.strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', entry.id, {
                data: {
                  club: club.id,
                  team_name: club.name // Update team_name to use club name
                }
              });
              
              result.updated++;
              this.strapi.log.info(`[Migration] Added club relation to entry ${entry.id}: ${club.name}`);
            } else {
              result.warnings.push(`No matching club found for team "${entry.team.name}" in entry ${entry.id}`);
            }
          }
        } catch (error) {
          result.errors.push({
            entryId: entry.id,
            error: error.message,
            details: error
          });
        }
      }

      const processingTime = Date.now() - startTime;
      this.strapi.log.info(`[Migration] Completed club data update in ${processingTime}ms. Processed: ${result.processed}, Updated: ${result.updated}, Errors: ${result.errors.length}`);

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        entryId: 0,
        error: `Club data update failed: ${error.message}`,
        details: error
      });
      return result;
    }
  }

  /**
   * Validate data consistency between team_name and club/team relations
   * Requirements: 4.3, 9.5
   */
  async validateDataConsistency(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      inconsistencies: [],
      recommendations: []
    };

    try {
      // Check entries with club relations
      const entriesWithClubs = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          club: { $notNull: true }
        },
        populate: {
          club: true,
          team: true
        }
      });

      for (const entry of entriesWithClubs) {
        if (entry.club && entry.club.name && entry.team_name !== entry.club.name) {
          result.isValid = false;
          result.inconsistencies.push({
            entryId: entry.id,
            issue: 'team_name does not match club name',
            currentValue: entry.team_name,
            expectedValue: entry.club.name
          });
        }
      }

      // Check entries with team relations but no club
      const entriesWithoutClubs = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          team: { $notNull: true },
          club: { $null: true }
        },
        populate: {
          team: true
        }
      });

      if (entriesWithoutClubs.length > 0) {
        result.recommendations.push(`${entriesWithoutClubs.length} entries could benefit from club relations`);
      }

      // Generate recommendations
      if (result.inconsistencies.length > 0) {
        result.recommendations.push('Run migrateTeamNamesToClubNames() to fix team_name inconsistencies');
      }

      this.strapi.log.info(`[Migration] Data consistency check completed. Valid: ${result.isValid}, Inconsistencies: ${result.inconsistencies.length}`);

      return result;
    } catch (error) {
      this.strapi.log.error('[Migration] Data consistency validation failed:', error);
      result.isValid = false;
      return result;
    }
  }

  /**
   * Find matching club for a team name with improved logic
   */
  private async findMatchingClub(teamName: string, ligaId?: number): Promise<any> {
    try {
      // Team name to club name mapping for Viktoria teams
      const TEAM_TO_CLUB_MAPPING = {
        '1. Mannschaft': 'SV Viktoria Wertheim',
        '2. Mannschaft': 'SV Viktoria Wertheim II', 
        '3. Mannschaft': 'SpG Vikt. Wertheim 3/Grünenwort'
      };

      // First, try direct mapping for Viktoria teams
      const clubName = TEAM_TO_CLUB_MAPPING[teamName];
      if (clubName) {
        const clubs = await this.strapi.entityService.findMany('api::club.club', {
          filters: {
            name: clubName,
            aktiv: true
          },
          populate: {
            ligen: true
          }
        });
        
        if (clubs.length > 0) {
          const club = clubs[0];
          // Verify club is in the correct liga if ligaId is provided
          if (!ligaId || club.ligen.some((liga: any) => liga.id === ligaId)) {
            return club;
          }
        }
      }
      
      // Try to find by team mapping for Viktoria teams
      const teamMapping = this.getTeamMappingFromTeamName(teamName);
      if (teamMapping) {
        const clubs = await this.strapi.entityService.findMany('api::club.club', {
          filters: {
            club_typ: 'viktoria_verein',
            viktoria_team_mapping: teamMapping,
            aktiv: true
          },
          populate: {
            ligen: true
          }
        });
        
        if (clubs.length > 0) {
          const club = clubs[0];
          if (!ligaId || club.ligen.some((liga: any) => liga.id === ligaId)) {
            return club;
          }
        }
      }
      
      // Try exact name match
      const clubs = await this.strapi.entityService.findMany('api::club.club', {
        filters: {
          name: teamName,
          aktiv: true
        },
        populate: {
          ligen: true
        }
      });
      
      if (clubs.length > 0) {
        const club = clubs[0];
        if (!ligaId || club.ligen.some((liga: any) => liga.id === ligaId)) {
          return club;
        }
      }
      
      return null;
    } catch (error) {
      this.strapi.log.error(`Error finding matching club for team "${teamName}":`, error);
      return null;
    }
  }

  /**
   * Helper method to map team names to team mappings
   */
  private getTeamMappingFromTeamName(teamName: string): string | null {
    const mappings = {
      '1. Mannschaft': 'team_1',
      '2. Mannschaft': 'team_2', 
      '3. Mannschaft': 'team_3'
    };
    
    return mappings[teamName] || null;
  }

  /**
   * Complete migration process for all tabellen-eintrag records
   * Requirements: 8.2, 8.3
   */
  async migrateAllTabellenEintraege(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: true,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: []
    };

    try {
      this.strapi.log.info('[Migration] Starting complete tabellen-eintrag migration...');

      // Step 1: Update entries with club relations
      const clubRelationResult = await this.updateExistingEntriesWithClubData();
      result.processed += clubRelationResult.processed;
      result.updated += clubRelationResult.updated;
      result.errors.push(...clubRelationResult.errors);
      result.warnings.push(...clubRelationResult.warnings);

      // Step 2: Update team names to match club names
      const teamNameResult = await this.migrateTeamNamesToClubNames();
      result.processed += teamNameResult.processed;
      result.updated += teamNameResult.updated;
      result.errors.push(...teamNameResult.errors);
      result.warnings.push(...teamNameResult.warnings);

      // Step 3: Validate consistency
      const validationResult = await this.validateDataConsistency();
      if (!validationResult.isValid) {
        result.success = false;
        result.warnings.push(`Data consistency validation found ${validationResult.inconsistencies.length} issues`);
      }

      const processingTime = Date.now() - startTime;
      this.strapi.log.info(`[Migration] Complete migration finished in ${processingTime}ms. Success: ${result.success}, Updated: ${result.updated}, Errors: ${result.errors.length}`);

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push({
        entryId: 0,
        error: `Complete migration failed: ${error.message}`,
        details: error
      });
      return result;
    }
  }

  /**
   * Get migration statistics
   */
  async getMigrationStatistics(): Promise<{
    totalEntries: number;
    entriesWithClubs: number;
    entriesWithoutClubs: number;
    entriesWithTeams: number;
    entriesWithoutTeams: number;
    inconsistentEntries: number;
    migrationNeeded: boolean;
  }> {
    try {
      // Get total entries
      const totalEntries = await this.strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag');

      // Get entries with clubs
      const entriesWithClubs = await this.strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          club: { $notNull: true }
        }
      });

      // Get entries without clubs
      const entriesWithoutClubs = totalEntries - entriesWithClubs;

      // Get entries with teams
      const entriesWithTeams = await this.strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          team: { $notNull: true }
        }
      });

      // Get entries without teams
      const entriesWithoutTeams = totalEntries - entriesWithTeams;

      // Check for inconsistent entries (have club but team_name doesn't match)
      const entriesWithClubData = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          club: { $notNull: true }
        },
        populate: {
          club: true
        }
      });

      let inconsistentEntries = 0;
      for (const entry of entriesWithClubData) {
        if (entry.club && entry.club.name && entry.team_name !== entry.club.name) {
          inconsistentEntries++;
        }
      }

      const migrationNeeded = entriesWithoutClubs > 0 || inconsistentEntries > 0;

      return {
        totalEntries,
        entriesWithClubs,
        entriesWithoutClubs,
        entriesWithTeams,
        entriesWithoutTeams,
        inconsistentEntries,
        migrationNeeded
      };
    } catch (error) {
      this.strapi.log.error('Error getting migration statistics:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create migration service
 */
export function createMigrationService(strapi: any): MigrationService {
  return new MigrationServiceImpl(strapi);
}