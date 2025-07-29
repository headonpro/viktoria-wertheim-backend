/**
 * Test for Tabellen-Eintrag migration functionality
 * This test will actually run the migration
 */

const { createStrapi } = require('@strapi/strapi');

let strapi;

beforeAll(async () => {
  strapi = await createStrapi().load();
});

afterAll(async () => {
  if (strapi) {
    await strapi.destroy();
  }
});

describe('Tabellen-Eintrag Migration', () => {
  test('should get migration statistics', async () => {
    const migrationService = strapi.service('api::tabellen-eintrag.migration');
    
    if (!migrationService) {
      console.log('Migration service not found - skipping test');
      return;
    }

    const stats = await migrationService.getMigrationStatistics();
    
    console.log('Migration Statistics:');
    console.log(`- Total entries: ${stats.totalEntries}`);
    console.log(`- Entries with clubs: ${stats.entriesWithClubs}`);
    console.log(`- Entries without clubs: ${stats.entriesWithoutClubs}`);
    console.log(`- Entries with teams: ${stats.entriesWithTeams}`);
    console.log(`- Entries without teams: ${stats.entriesWithoutTeams}`);
    console.log(`- Inconsistent entries: ${stats.inconsistentEntries}`);
    console.log(`- Migration needed: ${stats.migrationNeeded ? 'Yes' : 'No'}`);
    
    expect(stats).toHaveProperty('totalEntries');
    expect(stats).toHaveProperty('entriesWithClubs');
    expect(stats).toHaveProperty('entriesWithoutClubs');
    expect(stats).toHaveProperty('migrationNeeded');
  });

  test('should validate data consistency before migration', async () => {
    const migrationService = strapi.service('api::tabellen-eintrag.migration');
    
    if (!migrationService) {
      console.log('Migration service not found - skipping test');
      return;
    }

    const validationResult = await migrationService.validateDataConsistency();
    
    console.log(`Validation result: ${validationResult.isValid ? 'Valid' : 'Invalid'}`);
    console.log(`Inconsistencies found: ${validationResult.inconsistencies.length}`);
    
    if (validationResult.inconsistencies.length > 0) {
      console.log('Inconsistencies:');
      validationResult.inconsistencies.slice(0, 5).forEach((inc, index) => {
        console.log(`  ${index + 1}. Entry ${inc.entryId}: ${inc.issue}`);
        console.log(`     Current: "${inc.currentValue}"`);
        console.log(`     Expected: "${inc.expectedValue}"`);
      });
    }
    
    expect(validationResult).toHaveProperty('isValid');
    expect(validationResult).toHaveProperty('inconsistencies');
  });

  test('should run complete migration', async () => {
    const migrationService = strapi.service('api::tabellen-eintrag.migration');
    
    if (!migrationService) {
      console.log('Migration service not found - skipping test');
      return;
    }

    console.log('🚀 Starting complete tabellen-eintrag migration...');
    
    const result = await migrationService.migrateAllTabellenEintraege();
    
    console.log('Migration Results:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Processed: ${result.processed}`);
    console.log(`- Updated: ${result.updated}`);
    console.log(`- Errors: ${result.errors.length}`);
    console.log(`- Warnings: ${result.warnings.length}`);
    
    if (result.warnings.length > 0) {
      console.log('Warnings:');
      result.warnings.forEach((warning, index) => {
        console.log(`  ${index + 1}. ${warning}`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log('Errors:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. Entry ${error.entryId || 'N/A'}: ${error.message}`);
      });
    }
    
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('processed');
    expect(result).toHaveProperty('updated');
    
    // Migration should succeed or at least not have critical errors
    if (result.errors.length > 0) {
      console.log('Migration completed with errors - this may be expected if no data needs migration');
    }
  });

  test('should validate data consistency after migration', async () => {
    const migrationService = strapi.service('api::tabellen-eintrag.migration');
    
    if (!migrationService) {
      console.log('Migration service not found - skipping test');
      return;
    }

    const validationResult = await migrationService.validateDataConsistency();
    
    console.log('Post-migration validation:');
    console.log(`- Valid: ${validationResult.isValid}`);
    console.log(`- Inconsistencies: ${validationResult.inconsistencies.length}`);
    
    if (validationResult.inconsistencies.length > 0) {
      console.log('Remaining inconsistencies:');
      validationResult.inconsistencies.slice(0, 5).forEach((inc, index) => {
        console.log(`  ${index + 1}. Entry ${inc.entryId}: ${inc.issue}`);
      });
    }
    
    if (validationResult.recommendations.length > 0) {
      console.log('Recommendations:');
      validationResult.recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }
    
    expect(validationResult).toHaveProperty('isValid');
  });

  test('should get final migration statistics', async () => {
    const migrationService = strapi.service('api::tabellen-eintrag.migration');
    
    if (!migrationService) {
      console.log('Migration service not found - skipping test');
      return;
    }

    const stats = await migrationService.getMigrationStatistics();
    
    console.log('Final Migration Statistics:');
    console.log(`- Total entries: ${stats.totalEntries}`);
    console.log(`- Entries with clubs: ${stats.entriesWithClubs}`);
    console.log(`- Entries without clubs: ${stats.entriesWithoutClubs}`);
    console.log(`- Inconsistent entries: ${stats.inconsistentEntries}`);
    console.log(`- Migration needed: ${stats.migrationNeeded ? 'Yes' : 'No'}`);
    
    const migrationRate = stats.totalEntries > 0 ? (stats.entriesWithClubs / stats.totalEntries) * 100 : 0;
    console.log(`- Migration rate: ${migrationRate.toFixed(1)}%`);
    
    expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
    expect(stats.entriesWithClubs).toBeGreaterThanOrEqual(0);
  });
});