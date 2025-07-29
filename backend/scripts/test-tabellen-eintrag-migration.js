#!/usr/bin/env node

/**
 * Test script for Tabellen-Eintrag migration
 * 
 * This script tests the migration functionality without making actual changes
 */

const { createStrapi } = require('@strapi/strapi');

class TabellenEintragMigrationTest {
  constructor(strapi) {
    this.strapi = strapi;
  }

  /**
   * Run comprehensive migration tests
   */
  async runTests() {
    console.log('🧪 Testing Tabellen-Eintrag migration functionality...\n');
    
    try {
      await this.testMigrationStatistics();
      await this.testClubMatching();
      await this.testDataConsistency();
      
      console.log('✅ All tests completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Tests failed:', error);
      return false;
    }
  }

  /**
   * Test migration statistics
   */
  async testMigrationStatistics() {
    console.log('📊 Testing migration statistics...');
    
    try {
      // Get migration service
      const migrationService = this.strapi.service('api::tabellen-eintrag.migration');
      
      if (!migrationService) {
        throw new Error('Migration service not found');
      }

      const stats = await migrationService.getMigrationStatistics();
      
      console.log('   Migration Statistics:');
      console.log(`   - Total entries: ${stats.totalEntries}`);
      console.log(`   - Entries with clubs: ${stats.entriesWithClubs}`);
      console.log(`   - Entries without clubs: ${stats.entriesWithoutClubs}`);
      console.log(`   - Entries with teams: ${stats.entriesWithTeams}`);
      console.log(`   - Entries without teams: ${stats.entriesWithoutTeams}`);
      console.log(`   - Inconsistent entries: ${stats.inconsistentEntries}`);
      console.log(`   - Migration needed: ${stats.migrationNeeded ? 'Yes' : 'No'}`);
      
      console.log('   ✅ Statistics test passed\n');
    } catch (error) {
      console.error('   ❌ Statistics test failed:', error);
      throw error;
    }
  }

  /**
   * Test club matching logic
   */
  async testClubMatching() {
    console.log('🔍 Testing club matching logic...');
    
    try {
      // Test team names that should match clubs
      const testCases = [
        { teamName: '1. Mannschaft', expectedClub: 'SV Viktoria Wertheim' },
        { teamName: '2. Mannschaft', expectedClub: 'SV Viktoria Wertheim II' },
        { teamName: '3. Mannschaft', expectedClub: 'SpG Vikt. Wertheim 3/Grünenwort' }
      ];

      for (const testCase of testCases) {
        // Try to find matching club
        const clubs = await this.strapi.entityService.findMany('api::club.club', {
          filters: {
            name: testCase.expectedClub,
            aktiv: true
          }
        });

        if (clubs.length > 0) {
          console.log(`   ✅ Found club for "${testCase.teamName}": ${clubs[0].name}`);
        } else {
          console.log(`   ⚠️  No club found for "${testCase.teamName}" (expected: ${testCase.expectedClub})`);
        }
      }
      
      console.log('   ✅ Club matching test completed\n');
    } catch (error) {
      console.error('   ❌ Club matching test failed:', error);
      throw error;
    }
  }

  /**
   * Test data consistency validation
   */
  async testDataConsistency() {
    console.log('🔍 Testing data consistency validation...');
    
    try {
      // Get migration service
      const migrationService = this.strapi.service('api::tabellen-eintrag.migration');
      
      const validationResult = await migrationService.validateDataConsistency();
      
      console.log(`   Validation result: ${validationResult.isValid ? 'Valid' : 'Invalid'}`);
      console.log(`   Inconsistencies found: ${validationResult.inconsistencies.length}`);
      
      if (validationResult.inconsistencies.length > 0) {
        console.log('   Inconsistencies:');
        validationResult.inconsistencies.slice(0, 5).forEach((inc, index) => {
          console.log(`     ${index + 1}. Entry ${inc.entryId}: ${inc.issue}`);
          console.log(`        Current: "${inc.currentValue}"`);
          console.log(`        Expected: "${inc.expectedValue}"`);
        });
        
        if (validationResult.inconsistencies.length > 5) {
          console.log(`     ... and ${validationResult.inconsistencies.length - 5} more`);
        }
      }
      
      if (validationResult.recommendations.length > 0) {
        console.log('   Recommendations:');
        validationResult.recommendations.forEach((rec, index) => {
          console.log(`     ${index + 1}. ${rec}`);
        });
      }
      
      console.log('   ✅ Data consistency test completed\n');
    } catch (error) {
      console.error('   ❌ Data consistency test failed:', error);
      throw error;
    }
  }

  /**
   * Test dry run of migration
   */
  async testDryRun() {
    console.log('🏃 Testing dry run of migration...');
    
    try {
      // Get entries that would be affected
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

      console.log(`   Found ${entriesWithoutClubs.length} entries that would be migrated`);
      
      // Show first few entries
      for (const entry of entriesWithoutClubs.slice(0, 5)) {
        console.log(`     Entry ${entry.id}: "${entry.team_name}" (Team: ${entry.team?.name || 'None'}, Liga: ${entry.liga?.name || 'None'})`);
      }
      
      if (entriesWithoutClubs.length > 5) {
        console.log(`     ... and ${entriesWithoutClubs.length - 5} more entries`);
      }
      
      console.log('   ✅ Dry run test completed\n');
    } catch (error) {
      console.error('   ❌ Dry run test failed:', error);
      throw error;
    }
  }
}

/**
 * Main execution function
 */
async function runTests() {
  let app;
  
  try {
    // Initialize Strapi
    app = await createStrapi().load();
    
    // Run tests
    const tester = new TabellenEintragMigrationTest(app);
    const success = await tester.runTests();
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('❌ Test script failed:', error);
    process.exit(1);
  } finally {
    if (app) {
      await app.destroy();
    }
  }
}

// Run if called directly
if (require.main === module) {
  runTests();
}

module.exports = { TabellenEintragMigrationTest, runTests };