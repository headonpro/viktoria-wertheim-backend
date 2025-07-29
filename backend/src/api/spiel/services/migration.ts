/**
 * Migration service for Spiel collection
 * Handles migration from team-based to club-based games
 * Requirements: 8.1, 8.3
 */

export interface SpielMigrationService {
  migrateTeamToClubRelations(): Promise<MigrationResult>;
  validateMigrationData(): Promise<ValidationResult>;
  rollbackMigration(backupId: string): Promise<RollbackResult>;
  createMigrationBackup(): Promise<BackupResult>;
}

export interface MigrationResult {
  success: boolean;
  processed: number;
  migrated: number;
  skipped: number;
  errors: MigrationError[];
  warnings: string[];
  backupId?: string;
  duration: number;
}

export interface ValidationResult {
  isValid: boolean;
  totalSpiele: number;
  teamBasedSpiele: number;
  clubBasedSpiele: number;
  mixedSpiele: number;
  unmappableSpiele: number;
  inconsistencies: DataInconsistency[];
  recommendations: string[];
}

export interface RollbackResult {
  success: boolean;
  restored: number;
  errors: MigrationError[];
  duration: number;
}

export interface BackupResult {
  success: boolean;
  backupId: string;
  recordCount: number;
  filePath: string;
}

export interface MigrationError {
  spielId: number;
  error: string;
  details: any;
  severity: 'warning' | 'error' | 'critical';
}

export interface DataInconsistency {
  spielId: number;
  issue: string;
  currentData: any;
  expectedData: any;
  canAutoFix: boolean;
}

// Team to Club mapping configuration
const TEAM_TO_CLUB_MAPPING = {
  '1. Mannschaft': 'team_1',
  '2. Mannschaft': 'team_2', 
  '3. Mannschaft': 'team_3'
} as const;

export class SpielMigrationServiceImpl implements SpielMigrationService {
  private strapi: any;

  constructor(strapi: any) {
    this.strapi = strapi;
  }

  /**
   * Main migration method to convert team-based spiele to club-based
   * Requirements: 8.1, 8.3
   */
  async migrateTeamToClubRelations(): Promise<MigrationResult> {
    const startTime = Date.now();
    const result: MigrationResult = {
      success: true,
      processed: 0,
      migrated: 0,
      skipped: 0,
      errors: [],
      warnings: [],
      duration: 0
    };

    try {
      this.strapi.log.info('[Migration] Starting team-to-club migration for spiele...');

      // Create backup before migration
      const backup = await this.createMigrationBackup();
      if (!backup.success) {
        throw new Error('Failed to create migration backup');
      }
      result.backupId = backup.backupId;

      // Get all spiele that have team relations but no club relations
      const spieleToMigrate = await this.strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          $and: [
            {
              $or: [
                { heim_team: { $notNull: true } },
                { gast_team: { $notNull: true } }
              ]
            },
            {
              $or: [
                { heim_club: { $null: true } },
                { gast_club: { $null: true } }
              ]
            }
          ]
        },
        populate: {
          heim_team: true,
          gast_team: true,
          heim_club: true,
          gast_club: true,
          liga: true,
          saison: true
        }
      });

      result.processed = spieleToMigrate.length;
      this.strapi.log.info(`[Migration] Found ${result.processed} spiele records to migrate`);

      // Process each spiel
      for (const spiel of spieleToMigrate) {
        try {
          const migrationData = await this.prepareMigrationData(spiel);
          
          if (!migrationData.canMigrate) {
            result.skipped++;
            result.warnings.push(`Skipped spiel ${spiel.id}: ${migrationData.reason}`);
            continue;
          }

          // Perform the migration
          await this.migrateSpielRecord(spiel, migrationData);
          result.migrated++;
          
          this.strapi.log.debug(`[Migration] Migrated spiel ${spiel.id}: ${migrationData.heimClub?.name} vs ${migrationData.gastClub?.name}`);

        } catch (error) {
          result.errors.push({
            spielId: spiel.id,
            error: error.message,
            details: error,
            severity: 'error'
          });
          result.success = false;
          this.strapi.log.error(`[Migration] Failed to migrate spiel ${spiel.id}:`, error);
        }
      }

      result.duration = Date.now() - startTime;
      
      this.strapi.log.info(`[Migration] Completed in ${result.duration}ms. Processed: ${result.processed}, Migrated: ${result.migrated}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`);

      // Validate migration results
      if (result.migrated > 0) {
        const validation = await this.validateMigrationData();
        if (!validation.isValid) {
          result.warnings.push('Post-migration validation found inconsistencies');
        }
      }

      return result;

    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      result.errors.push({
        spielId: 0,
        error: `Migration failed: ${error.message}`,
        details: error,
        severity: 'critical'
      });
      
      this.strapi.log.error('[Migration] Critical migration failure:', error);
      return result;
    }
  }

  /**
   * Prepare migration data for a single spiel record
   */
  private async prepareMigrationData(spiel: any): Promise<{
    canMigrate: boolean;
    reason?: string;
    heimClub?: any;
    gastClub?: any;
  }> {
    try {
      // Check if already has club relations
      if (spiel.heim_club && spiel.gast_club) {
        return {
          canMigrate: false,
          reason: 'Already has club relations'
        };
      }

      // Find clubs for heim team
      let heimClub = null;
      if (spiel.heim_team) {
        heimClub = await this.findClubForTeam(spiel.heim_team, spiel.liga?.id);
        if (!heimClub) {
          return {
            canMigrate: false,
            reason: `No club found for heim team: ${spiel.heim_team.name}`
          };
        }
      }

      // Find clubs for gast team
      let gastClub = null;
      if (spiel.gast_team) {
        gastClub = await this.findClubForTeam(spiel.gast_team, spiel.liga?.id);
        if (!gastClub) {
          return {
            canMigrate: false,
            reason: `No club found for gast team: ${spiel.gast_team.name}`
          };
        }
      }

      // Validate that we have both clubs
      if (!heimClub || !gastClub) {
        return {
          canMigrate: false,
          reason: 'Missing club mapping for one or both teams'
        };
      }

      // Validate clubs are in the same liga
      const heimInLiga = await this.strapi.service('api::club.club').validateClubInLiga(heimClub.id, spiel.liga?.id);
      const gastInLiga = await this.strapi.service('api::club.club').validateClubInLiga(gastClub.id, spiel.liga?.id);

      if (!heimInLiga || !gastInLiga) {
        return {
          canMigrate: false,
          reason: 'One or both clubs are not in the game liga'
        };
      }

      return {
        canMigrate: true,
        heimClub,
        gastClub
      };

    } catch (error) {
      this.strapi.log.error('Error preparing migration data:', error);
      return {
        canMigrate: false,
        reason: `Preparation error: ${error.message}`
      };
    }
  }

  /**
   * Find club for a given team
   */
  private async findClubForTeam(team: any, ligaId?: number): Promise<any> {
    try {
      // First try to find by viktoria team mapping
      const teamMapping = TEAM_TO_CLUB_MAPPING[team.name as keyof typeof TEAM_TO_CLUB_MAPPING];
      if (teamMapping) {
        const viktoriaClub = await this.strapi.service('api::club.club').findViktoriaClubByTeam(teamMapping);
        if (viktoriaClub) {
          return viktoriaClub;
        }
      }

      // Try to find by exact name match
      const clubsByName = await this.strapi.entityService.findMany('api::club.club', {
        filters: {
          name: team.name,
          aktiv: true
        },
        populate: {
          ligen: true
        }
      });

      if (clubsByName.length > 0) {
        // If liga is specified, prefer clubs in that liga
        if (ligaId) {
          const clubInLiga = clubsByName.find((club: any) => 
            club.ligen.some((liga: any) => liga.id === ligaId)
          );
          if (clubInLiga) {
            return clubInLiga;
          }
        }
        return clubsByName[0];
      }

      // Try partial name matching for common variations
      const partialMatches = await this.findClubByPartialName(team.name, ligaId);
      if (partialMatches.length > 0) {
        return partialMatches[0];
      }

      return null;

    } catch (error) {
      this.strapi.log.error(`Error finding club for team ${team.name}:`, error);
      return null;
    }
  }

  /**
   * Find club by partial name matching
   */
  private async findClubByPartialName(teamName: string, ligaId?: number): Promise<any[]> {
    try {
      // Common name variations and mappings
      const nameVariations = this.generateNameVariations(teamName);
      
      const filters: any = {
        $or: nameVariations.map(variation => ({
          name: { $containsi: variation }
        })),
        aktiv: true
      };

      if (ligaId) {
        filters.ligen = { id: ligaId };
      }

      const clubs = await this.strapi.entityService.findMany('api::club.club', {
        filters,
        populate: {
          ligen: true
        }
      });

      return clubs;

    } catch (error) {
      this.strapi.log.error('Error in partial name matching:', error);
      return [];
    }
  }

  /**
   * Generate name variations for matching
   */
  private generateNameVariations(teamName: string): string[] {
    const variations = [teamName];
    
    // Remove common prefixes/suffixes
    const cleanName = teamName
      .replace(/^(SV|TSV|VfR|FC|SpG)\s+/i, '')
      .replace(/\s+(e\.V\.|eV)$/i, '')
      .replace(/\s+II?I?$/i, ''); // Remove Roman numerals
    
    if (cleanName !== teamName) {
      variations.push(cleanName);
    }

    // Add common prefixes
    ['SV', 'TSV', 'VfR', 'FC'].forEach(prefix => {
      if (!teamName.startsWith(prefix)) {
        variations.push(`${prefix} ${cleanName}`);
      }
    });

    return variations;
  }

  /**
   * Migrate a single spiel record
   */
  private async migrateSpielRecord(spiel: any, migrationData: any): Promise<void> {
    try {
      const updateData: any = {};

      // Set club relations
      if (migrationData.heimClub) {
        updateData.heim_club = migrationData.heimClub.id;
      }
      if (migrationData.gastClub) {
        updateData.gast_club = migrationData.gastClub.id;
      }

      // Update the record
      await this.strapi.entityService.update('api::spiel.spiel', spiel.id, {
        data: updateData
      });

      this.strapi.log.debug(`[Migration] Updated spiel ${spiel.id} with club relations`);

    } catch (error) {
      this.strapi.log.error(`Error migrating spiel record ${spiel.id}:`, error);
      throw error;
    }
  }

  /**
   * Validate migration data and consistency
   * Requirements: 8.3
   */
  async validateMigrationData(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      totalSpiele: 0,
      teamBasedSpiele: 0,
      clubBasedSpiele: 0,
      mixedSpiele: 0,
      unmappableSpiele: 0,
      inconsistencies: [],
      recommendations: []
    };

    try {
      // Get all spiele records
      const allSpiele = await this.strapi.entityService.findMany('api::spiel.spiel', {
        populate: {
          heim_team: true,
          gast_team: true,
          heim_club: true,
          gast_club: true,
          liga: true
        }
      });

      result.totalSpiele = allSpiele.length;

      for (const spiel of allSpiele) {
        // Categorize spiele
        const hasTeamData = spiel.heim_team || spiel.gast_team;
        const hasClubData = spiel.heim_club || spiel.gast_club;
        const hasCompleteTeamData = spiel.heim_team && spiel.gast_team;
        const hasCompleteClubData = spiel.heim_club && spiel.gast_club;

        if (hasCompleteClubData && !hasTeamData) {
          result.clubBasedSpiele++;
        } else if (hasCompleteTeamData && !hasClubData) {
          result.teamBasedSpiele++;
        } else if (hasTeamData && hasClubData) {
          result.mixedSpiele++;
          
          // Validate consistency between team and club data
          await this.validateSpielConsistency(spiel, result);
        } else {
          result.unmappableSpiele++;
          result.inconsistencies.push({
            spielId: spiel.id,
            issue: 'Incomplete team or club data',
            currentData: {
              heim_team: spiel.heim_team?.name,
              gast_team: spiel.gast_team?.name,
              heim_club: spiel.heim_club?.name,
              gast_club: spiel.gast_club?.name
            },
            expectedData: 'Complete team or club relations',
            canAutoFix: false
          });
        }
      }

      // Generate recommendations
      if (result.teamBasedSpiele > 0) {
        result.recommendations.push(`${result.teamBasedSpiele} spiele still use team relations and could be migrated to clubs`);
      }

      if (result.unmappableSpiele > 0) {
        result.recommendations.push(`${result.unmappableSpiele} spiele have incomplete data and need manual review`);
      }

      if (result.inconsistencies.length > 0) {
        result.isValid = false;
        result.recommendations.push('Fix data inconsistencies before proceeding with migration');
      }

      this.strapi.log.info(`[Migration] Validation completed. Valid: ${result.isValid}, Total: ${result.totalSpiele}, Team-based: ${result.teamBasedSpiele}, Club-based: ${result.clubBasedSpiele}`);

      return result;

    } catch (error) {
      this.strapi.log.error('[Migration] Validation failed:', error);
      result.isValid = false;
      return result;
    }
  }

  /**
   * Validate consistency between team and club data in a spiel
   */
  private async validateSpielConsistency(spiel: any, result: ValidationResult): Promise<void> {
    try {
      // Check heim side consistency
      if (spiel.heim_team && spiel.heim_club) {
        const expectedClub = await this.findClubForTeam(spiel.heim_team, spiel.liga?.id);
        if (expectedClub && expectedClub.id !== spiel.heim_club.id) {
          result.inconsistencies.push({
            spielId: spiel.id,
            issue: 'Heim team and club mismatch',
            currentData: {
              team: spiel.heim_team.name,
              club: spiel.heim_club.name
            },
            expectedData: {
              club: expectedClub.name
            },
            canAutoFix: true
          });
        }
      }

      // Check gast side consistency
      if (spiel.gast_team && spiel.gast_club) {
        const expectedClub = await this.findClubForTeam(spiel.gast_team, spiel.liga?.id);
        if (expectedClub && expectedClub.id !== spiel.gast_club.id) {
          result.inconsistencies.push({
            spielId: spiel.id,
            issue: 'Gast team and club mismatch',
            currentData: {
              team: spiel.gast_team.name,
              club: spiel.gast_club.name
            },
            expectedData: {
              club: expectedClub.name
            },
            canAutoFix: true
          });
        }
      }

    } catch (error) {
      this.strapi.log.error(`Error validating spiel consistency for ${spiel.id}:`, error);
    }
  }

  /**
   * Create backup before migration
   * Requirements: 8.3
   */
  async createMigrationBackup(): Promise<BackupResult> {
    const result: BackupResult = {
      success: false,
      backupId: '',
      recordCount: 0,
      filePath: ''
    };

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      result.backupId = `spiel-migration-backup-${timestamp}`;
      
      // Get all spiele records with relations
      const allSpiele = await this.strapi.entityService.findMany('api::spiel.spiel', {
        populate: {
          heim_team: true,
          gast_team: true,
          heim_club: true,
          gast_club: true,
          liga: true,
          saison: true
        }
      });

      result.recordCount = allSpiele.length;

      // Create backup data structure
      const backupData = {
        metadata: {
          backupId: result.backupId,
          timestamp: new Date().toISOString(),
          recordCount: result.recordCount,
          version: '1.0'
        },
        spiele: allSpiele.map(spiel => ({
          id: spiel.id,
          documentId: spiel.documentId,
          datum: spiel.datum,
          liga_id: spiel.liga?.id,
          saison_id: spiel.saison?.id,
          heim_team_id: spiel.heim_team?.id,
          gast_team_id: spiel.gast_team?.id,
          heim_club_id: spiel.heim_club?.id,
          gast_club_id: spiel.gast_club?.id,
          heim_tore: spiel.heim_tore,
          gast_tore: spiel.gast_tore,
          spieltag: spiel.spieltag,
          status: spiel.status,
          notizen: spiel.notizen
        }))
      };

      // Save backup to file
      const fs = require('fs');
      const path = require('path');
      const backupDir = path.join(process.cwd(), 'backups', 'migrations');
      
      // Ensure backup directory exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      result.filePath = path.join(backupDir, `${result.backupId}.json`);
      fs.writeFileSync(result.filePath, JSON.stringify(backupData, null, 2));

      result.success = true;
      this.strapi.log.info(`[Migration] Backup created: ${result.filePath} (${result.recordCount} records)`);

      return result;

    } catch (error) {
      this.strapi.log.error('[Migration] Backup creation failed:', error);
      result.success = false;
      return result;
    }
  }

  /**
   * Rollback migration using backup
   * Requirements: 8.3
   */
  async rollbackMigration(backupId: string): Promise<RollbackResult> {
    const startTime = Date.now();
    const result: RollbackResult = {
      success: true,
      restored: 0,
      errors: [],
      duration: 0
    };

    try {
      this.strapi.log.info(`[Migration] Starting rollback using backup: ${backupId}`);

      // Load backup data
      const fs = require('fs');
      const path = require('path');
      const backupPath = path.join(process.cwd(), 'backups', 'migrations', `${backupId}.json`);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
      
      this.strapi.log.info(`[Migration] Loaded backup with ${backupData.spiele.length} records`);

      // Restore each spiel record
      for (const spielBackup of backupData.spiele) {
        try {
          const updateData: any = {
            heim_team: spielBackup.heim_team_id || null,
            gast_team: spielBackup.gast_team_id || null,
            heim_club: spielBackup.heim_club_id || null,
            gast_club: spielBackup.gast_club_id || null
          };

          await this.strapi.entityService.update('api::spiel.spiel', spielBackup.id, {
            data: updateData
          });

          result.restored++;

        } catch (error) {
          result.errors.push({
            spielId: spielBackup.id,
            error: error.message,
            details: error,
            severity: 'error'
          });
          result.success = false;
        }
      }

      result.duration = Date.now() - startTime;
      
      this.strapi.log.info(`[Migration] Rollback completed in ${result.duration}ms. Restored: ${result.restored}, Errors: ${result.errors.length}`);

      return result;

    } catch (error) {
      result.success = false;
      result.duration = Date.now() - startTime;
      result.errors.push({
        spielId: 0,
        error: `Rollback failed: ${error.message}`,
        details: error,
        severity: 'critical'
      });
      
      this.strapi.log.error('[Migration] Rollback failed:', error);
      return result;
    }
  }

  /**
   * Get migration statistics and status
   */
  async getMigrationStatus(): Promise<{
    totalSpiele: number;
    teamOnlySpiele: number;
    clubOnlySpiele: number;
    mixedSpiele: number;
    migrationProgress: number;
    lastMigration?: string;
  }> {
    try {
      const validation = await this.validateMigrationData();
      
      const totalSpiele = validation.totalSpiele;
      const migrationProgress = totalSpiele > 0 
        ? ((validation.clubBasedSpiele + validation.mixedSpiele) / totalSpiele) * 100 
        : 0;

      return {
        totalSpiele,
        teamOnlySpiele: validation.teamBasedSpiele,
        clubOnlySpiele: validation.clubBasedSpiele,
        mixedSpiele: validation.mixedSpiele,
        migrationProgress: Math.round(migrationProgress * 100) / 100,
        lastMigration: undefined // Could be stored in database or config
      };

    } catch (error) {
      this.strapi.log.error('Error getting migration status:', error);
      return {
        totalSpiele: 0,
        teamOnlySpiele: 0,
        clubOnlySpiele: 0,
        mixedSpiele: 0,
        migrationProgress: 0
      };
    }
  }
}

/**
 * Factory function to create migration service
 */
export function createSpielMigrationService(strapi: any): SpielMigrationService {
  return new SpielMigrationServiceImpl(strapi);
}