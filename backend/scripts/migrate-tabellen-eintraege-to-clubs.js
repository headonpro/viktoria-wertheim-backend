#!/usr/bin/env node

/**
 * Migration script for Tabellen-Eintrag records to use club relations
 * 
 * This script:
 * 1. Updates existing table entries with club relations
 * 2. Ensures team_name fields use correct club names
 * 3. Adds club_id population for all migrated entries
 * 4. Validates data consistency after migration
 * 
 * Requirements: 8.2, 8.3
 */

const { createStrapi } = require('@strapi/strapi');

// Team name to club name mapping
const TEAM_TO_CLUB_MAPPING = {
  '1. Mannschaft': 'SV Viktoria Wertheim',
  '2. Mannschaft': 'SV Viktoria Wertheim II', 
  '3. Mannschaft': 'SpG Vikt. Wertheim 3/Grünenwort'
};

// Team mapping to club mapping
const TEAM_MAPPING_TO_CLUB = {
  'team_1': 'SV Viktoria Wertheim',
  'team_2': 'SV Viktoria Wertheim II',
  'team_3': 'SpG Vikt. Wertheim 3/Grünenwort'
};

class TabellenEintragMigration {
  constructor(strapi) {
    this.strapi = strapi;
    this.stats = {
      processed: 0,
      updated: 0,
      clubRelationsAdded: 0,
      teamNamesUpdated: 0,
      errors: [],
      warnings: []
    };
  }

  /**
   * Main migration method
   */
  async migrate() {
    console.log('🚀 Starting Tabellen-Eintrag migration to clubs...\n');
    
    try {
      // Step 1: Update entries that have team relations but no club relations
      await this.updateEntriesWithClubRelations();
      
      // Step 2: Update team_name fields to use club names
      await this.updateTeamNamesToClubNames();
      
      // Step 3: Validate data consistency
      await this.validateDataConsistency();
      
      // Step 4: Print summary
      this.printSummary();
      
      return this.stats;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.stats.errors.push({
        type: 'MIGRATION_FAILED',
        message: error.message,
        details: error
      });
      throw error;
    }
  }

  /**
   * Update existing entries with club relations where possible
   */
  async updateEntriesWithClubRelations() {
    console.log('📋 Step 1: Adding club relations to existing entries...');
    
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

      console.log(`   Found ${entriesWithoutClubs.length} entries without club relations`);
      
      for (const entry of entriesWithoutClubs) {
        this.stats.processed++;
        
        try {
          if (entry.team && entry.team.name) {
            // Try to find matching club
            const club = await this.findMatchingClub(entry.team.name, entry.liga?.id);
            
            if (club) {
              // Update entry with club relation and correct team_name
              await this.strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', entry.id, {
                data: {
                  club: club.id,
                  team_name: club.name
                }
              });
              
              this.stats.updated++;
              this.stats.clubRelationsAdded++;
              this.stats.teamNamesUpdated++;
              
              console.log(`   ✅ Updated entry ${entry.id}: "${entry.team.name}" -> "${club.name}" (Club ID: ${club.id})`);
            } else {
              this.stats.warnings.push(`No matching club found for team "${entry.team.name}" in entry ${entry.id}`);
              console.log(`   ⚠️  No club found for team "${entry.team.name}" in entry ${entry.id}`);
            }
          }
        } catch (error) {
          this.stats.errors.push({
            entryId: entry.id,
            type: 'CLUB_RELATION_UPDATE_FAILED',
            message: error.message,
            details: error
          });
          console.log(`   ❌ Failed to update entry ${entry.id}: ${error.message}`);
        }
      }
      
      console.log(`   Completed: ${this.stats.clubRelationsAdded} club relations added\n`);
    } catch (error) {
      console.error('❌ Failed to update entries with club relations:', error);
      throw error;
    }
  }

  /**
   * Update team_name fields to use correct club names
   */
  async updateTeamNamesToClubNames() {
    console.log('📝 Step 2: Updating team_name fields to use club names...');
    
    try {
      // Get all entries that have club relations
      const entriesWithClubs = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          club: { $notNull: true }
        },
        populate: {
          club: true,
          team: true
        }
      });

      console.log(`   Found ${entriesWithClubs.length} entries with club relations`);
      
      let teamNameUpdates = 0;
      
      for (const entry of entriesWithClubs) {
        this.stats.processed++;
        
        try {
          if (entry.club && entry.club.name && entry.team_name !== entry.club.name) {
            // Update team_name to match club name
            await this.strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', entry.id, {
              data: {
                team_name: entry.club.name
              }
            });
            
            teamNameUpdates++;
            console.log(`   ✅ Updated team_name in entry ${entry.id}: "${entry.team_name}" -> "${entry.club.name}"`);
          }
        } catch (error) {
          this.stats.errors.push({
            entryId: entry.id,
            type: 'TEAM_NAME_UPDATE_FAILED',
            message: error.message,
            details: error
          });
          console.log(`   ❌ Failed to update team_name in entry ${entry.id}: ${error.message}`);
        }
      }
      
      this.stats.teamNamesUpdated += teamNameUpdates;
      console.log(`   Completed: ${teamNameUpdates} team names updated\n`);
    } catch (error) {
      console.error('❌ Failed to update team names:', error);
      throw error;
    }
  }

  /**
   * Find matching club for a team name
   */
  async findMatchingClub(teamName, ligaId) {
    try {
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
          if (!ligaId || club.ligen.some(liga => liga.id === ligaId)) {
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
          if (!ligaId || club.ligen.some(liga => liga.id === ligaId)) {
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
        if (!ligaId || club.ligen.some(liga => liga.id === ligaId)) {
          return club;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error finding matching club for team "${teamName}":`, error);
      return null;
    }
  }

  /**
   * Get team mapping from team name
   */
  getTeamMappingFromTeamName(teamName) {
    const mappings = {
      '1. Mannschaft': 'team_1',
      '2. Mannschaft': 'team_2',
      '3. Mannschaft': 'team_3'
    };
    
    return mappings[teamName] || null;
  }

  /**
   * Validate data consistency after migration
   */
  async validateDataConsistency() {
    console.log('🔍 Step 3: Validating data consistency...');
    
    try {
      const inconsistencies = [];
      
      // Check entries with club relations
      const entriesWithClubs = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          club: { $notNull: true }
        },
        populate: {
          club: true,
          team: true,
          liga: true
        }
      });

      console.log(`   Validating ${entriesWithClubs.length} entries with club relations...`);
      
      for (const entry of entriesWithClubs) {
        // Check if team_name matches club name
        if (entry.club && entry.club.name && entry.team_name !== entry.club.name) {
          inconsistencies.push({
            entryId: entry.id,
            type: 'TEAM_NAME_MISMATCH',
            issue: 'team_name does not match club name',
            currentValue: entry.team_name,
            expectedValue: entry.club.name,
            liga: entry.liga?.name || 'Unknown'
          });
        }
        
        // Check if club is in the correct liga
        if (entry.club && entry.liga && entry.club.ligen) {
          const clubInLiga = entry.club.ligen.some(liga => liga.id === entry.liga.id);
          if (!clubInLiga) {
            inconsistencies.push({
              entryId: entry.id,
              type: 'CLUB_LIGA_MISMATCH',
              issue: 'club is not assigned to entry liga',
              currentValue: entry.club.name,
              expectedValue: `Club should be in liga "${entry.liga.name}"`,
              liga: entry.liga.name
            });
          }
        }
      }
      
      // Check entries without club relations
      const entriesWithoutClubs = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          club: { $null: true }
        },
        populate: {
          team: true,
          liga: true
        }
      });

      console.log(`   Found ${entriesWithoutClubs.length} entries without club relations`);
      
      if (entriesWithoutClubs.length > 0) {
        this.stats.warnings.push(`${entriesWithoutClubs.length} entries still don't have club relations`);
        
        // List them for manual review
        for (const entry of entriesWithoutClubs.slice(0, 10)) { // Show first 10
          console.log(`   ⚠️  Entry ${entry.id}: "${entry.team_name}" in liga "${entry.liga?.name || 'Unknown'}" (Team: ${entry.team?.name || 'None'})`);
        }
        
        if (entriesWithoutClubs.length > 10) {
          console.log(`   ... and ${entriesWithoutClubs.length - 10} more entries`);
        }
      }
      
      // Report inconsistencies
      if (inconsistencies.length > 0) {
        console.log(`   ❌ Found ${inconsistencies.length} data inconsistencies:`);
        
        inconsistencies.forEach(inc => {
          console.log(`      Entry ${inc.entryId}: ${inc.issue}`);
          console.log(`         Current: "${inc.currentValue}"`);
          console.log(`         Expected: "${inc.expectedValue}"`);
          console.log(`         Liga: ${inc.liga}`);
        });
        
        this.stats.errors.push(...inconsistencies.map(inc => ({
          entryId: inc.entryId,
          type: inc.type,
          message: inc.issue,
          details: inc
        })));
      } else {
        console.log('   ✅ No data inconsistencies found');
      }
      
      console.log('');
    } catch (error) {
      console.error('❌ Failed to validate data consistency:', error);
      throw error;
    }
  }

  /**
   * Print migration summary
   */
  printSummary() {
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`Total entries processed: ${this.stats.processed}`);
    console.log(`Entries updated: ${this.stats.updated}`);
    console.log(`Club relations added: ${this.stats.clubRelationsAdded}`);
    console.log(`Team names updated: ${this.stats.teamNamesUpdated}`);
    console.log(`Errors: ${this.stats.errors.length}`);
    console.log(`Warnings: ${this.stats.warnings.length}`);
    
    if (this.stats.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.stats.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.stats.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. Entry ${error.entryId || 'N/A'}: ${error.message}`);
      });
    }
    
    const success = this.stats.errors.length === 0;
    console.log(`\n${success ? '✅' : '❌'} Migration ${success ? 'completed successfully' : 'completed with errors'}`);
  }
}

/**
 * Main execution function
 */
async function runMigration() {
  let app;
  
  try {
    // Initialize Strapi
    app = await createStrapi().load();
    
    // Run migration
    const migration = new TabellenEintragMigration(app);
    const result = await migration.migrate();
    
    // Exit with appropriate code
    process.exit(result.errors.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  } finally {
    if (app) {
      await app.destroy();
    }
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { TabellenEintragMigration, runMigration };