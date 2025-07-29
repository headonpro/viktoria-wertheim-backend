#!/usr/bin/env node

/**
 * Validation script for Tabellen-Eintrag migration results
 * 
 * This script validates that the migration was successful and data is consistent
 */

const { createStrapi } = require('@strapi/strapi');

class TabellenEintragMigrationValidator {
  constructor(strapi) {
    this.strapi = strapi;
    this.validationResults = {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      warnings: [],
      errors: [],
      recommendations: []
    };
  }

  /**
   * Run comprehensive validation
   */
  async validate() {
    console.log('🔍 Validating Tabellen-Eintrag migration results...\n');
    
    try {
      await this.validateClubRelations();
      await this.validateTeamNames();
      await this.validateDataIntegrity();
      await this.validateLigaConsistency();
      
      this.printValidationSummary();
      
      return this.validationResults.failedChecks === 0;
    } catch (error) {
      console.error('❌ Validation failed:', error);
      return false;
    }
  }

  /**
   * Validate club relations
   */
  async validateClubRelations() {
    console.log('🔗 Validating club relations...');
    
    try {
      this.validationResults.totalChecks++;
      
      // Get all entries
      const allEntries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        populate: {
          club: true,
          team: true,
          liga: true
        }
      });

      const entriesWithClubs = allEntries.filter(entry => entry.club);
      const entriesWithoutClubs = allEntries.filter(entry => !entry.club);
      
      console.log(`   Total entries: ${allEntries.length}`);
      console.log(`   Entries with clubs: ${entriesWithClubs.length}`);
      console.log(`   Entries without clubs: ${entriesWithoutClubs.length}`);
      
      // Check if we have a good migration rate
      const migrationRate = (entriesWithClubs.length / allEntries.length) * 100;
      console.log(`   Migration rate: ${migrationRate.toFixed(1)}%`);
      
      if (migrationRate >= 80) {
        console.log('   ✅ Good migration rate (≥80%)');
        this.validationResults.passedChecks++;
      } else if (migrationRate >= 50) {
        console.log('   ⚠️  Moderate migration rate (50-79%)');
        this.validationResults.warnings.push(`Migration rate is ${migrationRate.toFixed(1)}% - consider investigating unmigrated entries`);
        this.validationResults.passedChecks++;
      } else {
        console.log('   ❌ Low migration rate (<50%)');
        this.validationResults.errors.push(`Low migration rate: ${migrationRate.toFixed(1)}%`);
        this.validationResults.failedChecks++;
      }
      
      // List entries without clubs for investigation
      if (entriesWithoutClubs.length > 0 && entriesWithoutClubs.length <= 10) {
        console.log('   Entries without clubs:');
        entriesWithoutClubs.forEach(entry => {
          console.log(`     Entry ${entry.id}: "${entry.team_name}" (Team: ${entry.team?.name || 'None'}, Liga: ${entry.liga?.name || 'None'})`);
        });
      } else if (entriesWithoutClubs.length > 10) {
        console.log(`   ${entriesWithoutClubs.length} entries without clubs (showing first 5):`);
        entriesWithoutClubs.slice(0, 5).forEach(entry => {
          console.log(`     Entry ${entry.id}: "${entry.team_name}" (Team: ${entry.team?.name || 'None'}, Liga: ${entry.liga?.name || 'None'})`);
        });
      }
      
      console.log('');
    } catch (error) {
      console.error('   ❌ Club relations validation failed:', error);
      this.validationResults.errors.push(`Club relations validation failed: ${error.message}`);
      this.validationResults.failedChecks++;
    }
  }

  /**
   * Validate team names match club names
   */
  async validateTeamNames() {
    console.log('📝 Validating team names match club names...');
    
    try {
      this.validationResults.totalChecks++;
      
      const entriesWithClubs = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          club: { $notNull: true }
        },
        populate: {
          club: true
        }
      });

      let consistentEntries = 0;
      let inconsistentEntries = 0;
      const inconsistencies = [];
      
      for (const entry of entriesWithClubs) {
        if (entry.club && entry.club.name) {
          if (entry.team_name === entry.club.name) {
            consistentEntries++;
          } else {
            inconsistentEntries++;
            inconsistencies.push({
              entryId: entry.id,
              teamName: entry.team_name,
              clubName: entry.club.name
            });
          }
        }
      }
      
      console.log(`   Entries with clubs: ${entriesWithClubs.length}`);
      console.log(`   Consistent team names: ${consistentEntries}`);
      console.log(`   Inconsistent team names: ${inconsistentEntries}`);
      
      const consistencyRate = entriesWithClubs.length > 0 ? (consistentEntries / entriesWithClubs.length) * 100 : 100;
      console.log(`   Consistency rate: ${consistencyRate.toFixed(1)}%`);
      
      if (consistencyRate >= 95) {
        console.log('   ✅ Excellent consistency (≥95%)');
        this.validationResults.passedChecks++;
      } else if (consistencyRate >= 80) {
        console.log('   ⚠️  Good consistency (80-94%)');
        this.validationResults.warnings.push(`Team name consistency is ${consistencyRate.toFixed(1)}%`);
        this.validationResults.passedChecks++;
      } else {
        console.log('   ❌ Poor consistency (<80%)');
        this.validationResults.errors.push(`Poor team name consistency: ${consistencyRate.toFixed(1)}%`);
        this.validationResults.failedChecks++;
      }
      
      // Show inconsistencies
      if (inconsistencies.length > 0 && inconsistencies.length <= 10) {
        console.log('   Inconsistencies found:');
        inconsistencies.forEach(inc => {
          console.log(`     Entry ${inc.entryId}: "${inc.teamName}" ≠ "${inc.clubName}"`);
        });
      } else if (inconsistencies.length > 10) {
        console.log(`   ${inconsistencies.length} inconsistencies found (showing first 5):`);
        inconsistencies.slice(0, 5).forEach(inc => {
          console.log(`     Entry ${inc.entryId}: "${inc.teamName}" ≠ "${inc.clubName}"`);
        });
      }
      
      console.log('');
    } catch (error) {
      console.error('   ❌ Team names validation failed:', error);
      this.validationResults.errors.push(`Team names validation failed: ${error.message}`);
      this.validationResults.failedChecks++;
    }
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity() {
    console.log('🔒 Validating data integrity...');
    
    try {
      this.validationResults.totalChecks++;
      
      // Check for duplicate entries
      const allEntries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        populate: {
          club: true,
          liga: true
        }
      });

      const entryGroups = new Map();
      
      for (const entry of allEntries) {
        const key = `${entry.liga?.id || 'no-liga'}-${entry.club?.id || entry.team_name}`;
        if (!entryGroups.has(key)) {
          entryGroups.set(key, []);
        }
        entryGroups.get(key).push(entry);
      }
      
      const duplicateGroups = Array.from(entryGroups.entries()).filter(([key, entries]) => entries.length > 1);
      
      console.log(`   Total entries: ${allEntries.length}`);
      console.log(`   Unique team-liga combinations: ${entryGroups.size}`);
      console.log(`   Duplicate groups: ${duplicateGroups.length}`);
      
      if (duplicateGroups.length === 0) {
        console.log('   ✅ No duplicate entries found');
        this.validationResults.passedChecks++;
      } else {
        console.log('   ⚠️  Duplicate entries found:');
        duplicateGroups.slice(0, 5).forEach(([key, entries]) => {
          console.log(`     ${key}: ${entries.length} entries (IDs: ${entries.map(e => e.id).join(', ')})`);
        });
        this.validationResults.warnings.push(`Found ${duplicateGroups.length} duplicate entry groups`);
        this.validationResults.passedChecks++;
      }
      
      console.log('');
    } catch (error) {
      console.error('   ❌ Data integrity validation failed:', error);
      this.validationResults.errors.push(`Data integrity validation failed: ${error.message}`);
      this.validationResults.failedChecks++;
    }
  }

  /**
   * Validate liga consistency
   */
  async validateLigaConsistency() {
    console.log('🏆 Validating liga consistency...');
    
    try {
      this.validationResults.totalChecks++;
      
      const entriesWithClubs = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          club: { $notNull: true }
        },
        populate: {
          club: {
            populate: {
              ligen: true
            }
          },
          liga: true
        }
      });

      let consistentEntries = 0;
      let inconsistentEntries = 0;
      const inconsistencies = [];
      
      for (const entry of entriesWithClubs) {
        if (entry.club && entry.liga && entry.club.ligen) {
          const clubInLiga = entry.club.ligen.some(liga => liga.id === entry.liga.id);
          if (clubInLiga) {
            consistentEntries++;
          } else {
            inconsistentEntries++;
            inconsistencies.push({
              entryId: entry.id,
              clubName: entry.club.name,
              ligaName: entry.liga.name,
              clubLigen: entry.club.ligen.map(l => l.name)
            });
          }
        }
      }
      
      console.log(`   Entries with clubs: ${entriesWithClubs.length}`);
      console.log(`   Liga-consistent entries: ${consistentEntries}`);
      console.log(`   Liga-inconsistent entries: ${inconsistentEntries}`);
      
      const ligaConsistencyRate = entriesWithClubs.length > 0 ? (consistentEntries / entriesWithClubs.length) * 100 : 100;
      console.log(`   Liga consistency rate: ${ligaConsistencyRate.toFixed(1)}%`);
      
      if (ligaConsistencyRate >= 95) {
        console.log('   ✅ Excellent liga consistency (≥95%)');
        this.validationResults.passedChecks++;
      } else if (ligaConsistencyRate >= 80) {
        console.log('   ⚠️  Good liga consistency (80-94%)');
        this.validationResults.warnings.push(`Liga consistency is ${ligaConsistencyRate.toFixed(1)}%`);
        this.validationResults.passedChecks++;
      } else {
        console.log('   ❌ Poor liga consistency (<80%)');
        this.validationResults.errors.push(`Poor liga consistency: ${ligaConsistencyRate.toFixed(1)}%`);
        this.validationResults.failedChecks++;
      }
      
      // Show inconsistencies
      if (inconsistencies.length > 0 && inconsistencies.length <= 5) {
        console.log('   Liga inconsistencies found:');
        inconsistencies.forEach(inc => {
          console.log(`     Entry ${inc.entryId}: Club "${inc.clubName}" not in liga "${inc.ligaName}"`);
          console.log(`       Club is in: ${inc.clubLigen.join(', ')}`);
        });
      } else if (inconsistencies.length > 5) {
        console.log(`   ${inconsistencies.length} liga inconsistencies found (showing first 3):`);
        inconsistencies.slice(0, 3).forEach(inc => {
          console.log(`     Entry ${inc.entryId}: Club "${inc.clubName}" not in liga "${inc.ligaName}"`);
        });
      }
      
      console.log('');
    } catch (error) {
      console.error('   ❌ Liga consistency validation failed:', error);
      this.validationResults.errors.push(`Liga consistency validation failed: ${error.message}`);
      this.validationResults.failedChecks++;
    }
  }

  /**
   * Print validation summary
   */
  printValidationSummary() {
    console.log('📊 Validation Summary:');
    console.log('='.repeat(50));
    console.log(`Total checks: ${this.validationResults.totalChecks}`);
    console.log(`Passed checks: ${this.validationResults.passedChecks}`);
    console.log(`Failed checks: ${this.validationResults.failedChecks}`);
    console.log(`Warnings: ${this.validationResults.warnings.length}`);
    console.log(`Errors: ${this.validationResults.errors.length}`);
    
    const successRate = this.validationResults.totalChecks > 0 ? 
      (this.validationResults.passedChecks / this.validationResults.totalChecks) * 100 : 0;
    console.log(`Success rate: ${successRate.toFixed(1)}%`);
    
    if (this.validationResults.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.validationResults.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    if (this.validationResults.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.validationResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    if (this.validationResults.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.validationResults.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }
    
    const overallSuccess = this.validationResults.failedChecks === 0;
    console.log(`\n${overallSuccess ? '✅' : '❌'} Migration validation ${overallSuccess ? 'PASSED' : 'FAILED'}`);
  }
}

/**
 * Main execution function
 */
async function runValidation() {
  let app;
  
  try {
    // Initialize Strapi
    app = await createStrapi().load();
    
    // Run validation
    const validator = new TabellenEintragMigrationValidator(app);
    const success = await validator.validate();
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  } finally {
    if (app) {
      await app.destroy();
    }
  }
}

// Run if called directly
if (require.main === module) {
  runValidation();
}

module.exports = { TabellenEintragMigrationValidator, runValidation };