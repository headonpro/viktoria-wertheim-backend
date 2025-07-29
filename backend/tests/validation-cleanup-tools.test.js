/**
 * Test Suite for Validation and Cleanup Tools
 * 
 * Tests for:
 * - Club data integrity validation
 * - Orphaned records cleanup
 * - Team-club consistency validation
 * - Data quality report generation
 */

const { setupStrapi, cleanupStrapi } = require('./helpers/strapi');
const { ClubDataValidator } = require('../scripts/validate-club-data-integrity');
const { OrphanedRecordsCleaner } = require('../scripts/cleanup-orphaned-records');
const { TeamClubConsistencyValidator } = require('../scripts/validate-team-club-consistency');
const { DataQualityReportGenerator } = require('../scripts/generate-data-quality-report');

describe('Validation and Cleanup Tools', () => {
  let strapi;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  describe('ClubDataValidator', () => {
    let validator;
    let testClub;
    let testLiga;

    beforeEach(async () => {
      validator = new ClubDataValidator(strapi);

      // Create test liga
      testLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Test Liga',
          aktiv: true
        }
      });

      // Create test club
      testClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Test Club',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1',
          aktiv: true,
          ligen: [testLiga.id]
        }
      });
    });

    afterEach(async () => {
      // Cleanup test data
      if (testClub) {
        await strapi.entityService.delete('api::club.club', testClub.id);
      }
      if (testLiga) {
        await strapi.entityService.delete('api::liga.liga', testLiga.id);
      }
    });

    test('should validate club data consistency', async () => {
      const results = await validator.validateAll({ clubId: testClub.id });

      expect(results).toBeDefined();
      expect(results.summary).toBeDefined();
      expect(results.summary.totalClubs).toBe(1);
      expect(results.clubValidation).toHaveLength(1);
      expect(results.clubValidation[0].clubId).toBe(testClub.id);
      expect(results.clubValidation[0].isValid).toBe(true);
    });

    test('should detect missing required fields', async () => {
      // Create club with missing required fields
      const invalidClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: '', // Invalid: empty name
          club_typ: 'viktoria_verein',
          aktiv: true
        }
      });

      const results = await validator.validateAll({ clubId: invalidClub.id });

      expect(results.clubValidation[0].isValid).toBe(false);
      expect(results.clubValidation[0].errors).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_REQUIRED_FIELD',
          field: 'name'
        })
      );

      await strapi.entityService.delete('api::club.club', invalidClub.id);
    });

    test('should detect duplicate club names', async () => {
      // Create duplicate club
      const duplicateClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Test Club', // Same name as testClub
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [testLiga.id]
        }
      });

      const results = await validator.validateAll();

      const duplicateErrors = results.clubValidation.filter(club => 
        club.errors.some(error => error.type === 'DUPLICATE_CLUB_NAME')
      );

      expect(duplicateErrors.length).toBeGreaterThan(0);

      await strapi.entityService.delete('api::club.club', duplicateClub.id);
    });

    test('should validate viktoria team mappings', async () => {
      const results = await validator.validateAll();

      expect(results.teamMappingValidation).toBeDefined();
      expect(results.teamMappingValidation.actualMappings).toBeDefined();
      
      const team1Mapping = results.teamMappingValidation.actualMappings.find(
        mapping => mapping.teamMapping === 'team_1'
      );
      expect(team1Mapping).toBeDefined();
      expect(team1Mapping.clubName).toBe('Test Club');
    });

    test('should detect orphaned records', async () => {
      // Create inactive club
      const inactiveClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Inactive Club',
          club_typ: 'gegner_verein',
          aktiv: false,
          ligen: [testLiga.id]
        }
      });

      // Create spiel with inactive club
      const orphanedSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date().toISOString(),
          heim_club: inactiveClub.id,
          gast_club: testClub.id,
          liga: testLiga.id,
          spieltag: 1,
          status: 'geplant'
        }
      });

      const results = await validator.validateAll();

      expect(results.orphanedRecords.spieleWithInvalidClubs.length).toBeGreaterThan(0);
      expect(results.orphanedRecords.spieleWithInvalidClubs[0].spielId).toBe(orphanedSpiel.id);

      // Cleanup
      await strapi.entityService.delete('api::spiel.spiel', orphanedSpiel.id);
      await strapi.entityService.delete('api::club.club', inactiveClub.id);
    });

    test('should generate recommendations', async () => {
      const results = await validator.validateAll();

      expect(results.recommendations).toBeDefined();
      expect(Array.isArray(results.recommendations)).toBe(true);
    });

    test('should export validation report', async () => {
      const results = await validator.validateAll({ exportReport: true });

      expect(results).toBeDefined();
      // Note: In a real test, you'd check if the file was created
      // For this test, we just verify the method doesn't throw
    });
  });

  describe('OrphanedRecordsCleaner', () => {
    let cleaner;
    let testClub;
    let testLiga;

    beforeEach(async () => {
      cleaner = new OrphanedRecordsCleaner(strapi);

      // Create test data
      testLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Test Liga',
          aktiv: true
        }
      });

      testClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Test Club',
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [testLiga.id]
        }
      });
    });

    afterEach(async () => {
      // Cleanup test data
      if (testClub) {
        await strapi.entityService.delete('api::club.club', testClub.id);
      }
      if (testLiga) {
        await strapi.entityService.delete('api::liga.liga', testLiga.id);
      }
    });

    test('should detect spiele with invalid club references', async () => {
      // Create inactive club
      const inactiveClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Inactive Club',
          club_typ: 'gegner_verein',
          aktiv: false,
          ligen: [testLiga.id]
        }
      });

      // Create spiel with inactive club
      const invalidSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date().toISOString(),
          heim_club: inactiveClub.id,
          gast_club: testClub.id,
          liga: testLiga.id,
          spieltag: 1,
          status: 'geplant'
        }
      });

      const results = await cleaner.cleanup({ dryRun: true, type: 'spiele' });

      expect(results.cleanupResults.summary.totalScanned).toBeGreaterThan(0);

      // Cleanup
      await strapi.entityService.delete('api::spiel.spiel', invalidSpiel.id);
      await strapi.entityService.delete('api::club.club', inactiveClub.id);
    });

    test('should detect tabellen-eintraege with invalid club references', async () => {
      // Create inactive club
      const inactiveClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Inactive Club',
          club_typ: 'gegner_verein',
          aktiv: false,
          ligen: [testLiga.id]
        }
      });

      // Create tabellen-eintrag with inactive club
      const invalidEintrag = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
        data: {
          team_name: 'Inactive Club',
          club: inactiveClub.id,
          liga: testLiga.id,
          platz: 1,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0
        }
      });

      const results = await cleaner.cleanup({ dryRun: true, type: 'tabellen' });

      expect(results.cleanupResults.summary.totalScanned).toBeGreaterThan(0);

      // Cleanup
      await strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', invalidEintrag.id);
      await strapi.entityService.delete('api::club.club', inactiveClub.id);
    });

    test('should detect duplicate clubs', async () => {
      // Create duplicate club
      const duplicateClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Test Club', // Same name as testClub
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [testLiga.id]
        }
      });

      const results = await cleaner.cleanup({ dryRun: true, type: 'duplicates' });

      expect(results.cleanupResults.summary.totalScanned).toBeGreaterThan(0);

      await strapi.entityService.delete('api::club.club', duplicateClub.id);
    });

    test('should create backup when requested', async () => {
      const results = await cleaner.cleanup({ dryRun: true, backup: true });

      expect(results.cleanupResults.summary.backupCreated).toBe(true);
    });

    test('should fix orphaned records when not in dry-run mode', async () => {
      // Create orphaned tabellen-eintrag (no club or team reference)
      const orphanedEintrag = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
        data: {
          team_name: 'Orphaned Entry',
          liga: testLiga.id,
          platz: 1,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0
        }
      });

      const results = await cleaner.cleanup({ 
        force: true, 
        type: 'tabellen'
      });

      expect(results.cleanupResults.summary.totalCleaned).toBeGreaterThan(0);

      // Verify the orphaned entry was cleaned up
      const remainingEntry = await strapi.entityService.findOne('api::tabellen-eintrag.tabellen-eintrag', orphanedEintrag.id);
      expect(remainingEntry).toBeNull();
    });
  });

  describe('TeamClubConsistencyValidator', () => {
    let validator;
    let testTeam;
    let testClub;
    let testLiga;

    beforeEach(async () => {
      validator = new TeamClubConsistencyValidator(strapi);

      // Create test data
      testLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Test Liga',
          aktiv: true
        }
      });

      testTeam = await strapi.entityService.create('api::team.team', {
        data: {
          name: '1. Mannschaft',
          team_typ: 'herren'
        }
      });

      testClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'SV Viktoria Wertheim',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1',
          aktiv: true,
          ligen: [testLiga.id]
        }
      });
    });

    afterEach(async () => {
      // Cleanup test data
      if (testClub) {
        await strapi.entityService.delete('api::club.club', testClub.id);
      }
      if (testTeam) {
        await strapi.entityService.delete('api::team.team', testTeam.id);
      }
      if (testLiga) {
        await strapi.entityService.delete('api::liga.liga', testLiga.id);
      }
    });

    test('should validate team-club mappings', async () => {
      const results = await validator.validateConsistency();

      expect(results.teamClubMapping).toBeDefined();
      expect(results.teamClubMapping.expectedMappings).toBeDefined();
      expect(results.teamClubMapping.actualMappings).toBeDefined();

      const team1Mapping = results.teamClubMapping.expectedMappings.find(
        mapping => mapping.teamMapping === 'team_1'
      );
      expect(team1Mapping).toBeDefined();
      expect(team1Mapping.isValid).toBe(true);
    });

    test('should validate spiele consistency', async () => {
      // Create spiel with both team and club data
      const testSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date().toISOString(),
          heim_team: testTeam.id,
          heim_club: testClub.id,
          gast_team: testTeam.id,
          gast_club: testClub.id,
          liga: testLiga.id,
          spieltag: 1,
          status: 'geplant'
        }
      });

      const results = await validator.validateConsistency();

      expect(results.spieleConsistency).toBeDefined();
      expect(results.spieleConsistency.mixedSpiele.length).toBeGreaterThan(0);

      await strapi.entityService.delete('api::spiel.spiel', testSpiel.id);
    });

    test('should validate tabellen consistency', async () => {
      // Create tabellen-eintrag with both team and club data
      const testEintrag = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
        data: {
          team_name: 'SV Viktoria Wertheim',
          team: testTeam.id,
          club: testClub.id,
          liga: testLiga.id,
          platz: 1,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0
        }
      });

      const results = await validator.validateConsistency();

      expect(results.tabellenConsistency).toBeDefined();

      await strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', testEintrag.id);
    });

    test('should check migration status', async () => {
      const results = await validator.validateConsistency();

      expect(results.migrationStatus).toBeDefined();
      expect(results.migrationStatus.fullyMigrated).toBeDefined();
      expect(results.migrationStatus.partiallyMigrated).toBeDefined();
      expect(results.migrationStatus.notMigrated).toBeDefined();
    });

    test('should generate recommendations', async () => {
      const results = await validator.validateConsistency();

      expect(results.recommendations).toBeDefined();
      expect(Array.isArray(results.recommendations)).toBe(true);
    });

    test('should fix consistency issues when requested', async () => {
      // Create inconsistent tabellen-eintrag
      const inconsistentEintrag = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
        data: {
          team_name: 'Wrong Name', // Inconsistent with club name
          club: testClub.id,
          liga: testLiga.id,
          platz: 1,
          spiele: 0,
          siege: 0,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 0,
          tore_gegen: 0,
          tordifferenz: 0,
          punkte: 0
        }
      });

      const results = await validator.validateConsistency({ fixIssues: true });

      expect(results.tabellenConsistency.inconsistentEintraege.length).toBeGreaterThan(0);

      // Verify the fix was applied
      const updatedEintrag = await strapi.entityService.findOne('api::tabellen-eintrag.tabellen-eintrag', inconsistentEintrag.id);
      expect(updatedEintrag.team_name).toBe('SV Viktoria Wertheim');

      await strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', inconsistentEintrag.id);
    });
  });

  describe('DataQualityReportGenerator', () => {
    let generator;
    let testClub;
    let testLiga;

    beforeEach(async () => {
      generator = new DataQualityReportGenerator(strapi);

      // Create test data
      testLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Test Liga',
          aktiv: true
        }
      });

      testClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Test Club',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1',
          aktiv: true,
          ligen: [testLiga.id],
          kurz_name: 'TC',
          gruendungsjahr: 1950
        }
      });
    });

    afterEach(async () => {
      // Cleanup test data
      if (testClub) {
        await strapi.entityService.delete('api::club.club', testClub.id);
      }
      if (testLiga) {
        await strapi.entityService.delete('api::liga.liga', testLiga.id);
      }
    });

    test('should generate comprehensive data quality report', async () => {
      const report = await generator.generateReport({ period: 7 });

      expect(report).toBeDefined();
      expect(report.metadata).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.dataCompleteness).toBeDefined();
      expect(report.dataAccuracy).toBeDefined();
      expect(report.dataConsistency).toBeDefined();
      expect(report.performance).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.actionItems).toBeDefined();
    });

    test('should analyze data completeness', async () => {
      const report = await generator.generateReport();

      expect(report.dataCompleteness.clubs).toBeDefined();
      expect(report.dataCompleteness.clubs.total).toBeGreaterThan(0);
      expect(report.dataCompleteness.clubs.completenessScores).toBeDefined();
      expect(Array.isArray(report.dataCompleteness.clubs.completenessScores)).toBe(true);
    });

    test('should validate data accuracy', async () => {
      const report = await generator.generateReport();

      expect(report.dataAccuracy).toBeDefined();
      expect(report.dataAccuracy.validationErrors).toBeDefined();
      expect(report.dataAccuracy.inconsistencies).toBeDefined();
      expect(report.dataAccuracy.duplicates).toBeDefined();
    });

    test('should check data consistency', async () => {
      const report = await generator.generateReport();

      expect(report.dataConsistency).toBeDefined();
      expect(report.dataConsistency.teamClubMappings).toBeDefined();
      expect(report.dataConsistency.crossReferences).toBeDefined();
      expect(report.dataConsistency.relationshipIntegrity).toBeDefined();
    });

    test('should measure performance metrics', async () => {
      const report = await generator.generateReport();

      expect(report.performance).toBeDefined();
      expect(report.performance.queryMetrics).toBeDefined();
      expect(report.performance.systemLoad).toBeDefined();
    });

    test('should calculate health scores', async () => {
      const report = await generator.generateReport();

      expect(report.summary.overallHealthScore).toBeDefined();
      expect(report.summary.completenessScore).toBeDefined();
      expect(report.summary.accuracyScore).toBeDefined();
      expect(report.summary.consistencyScore).toBeDefined();
      expect(report.summary.performanceScore).toBeDefined();

      expect(report.summary.overallHealthScore).toBeGreaterThanOrEqual(0);
      expect(report.summary.overallHealthScore).toBeLessThanOrEqual(100);
    });

    test('should generate recommendations', async () => {
      const report = await generator.generateReport();

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);

      if (report.recommendations.length > 0) {
        const recommendation = report.recommendations[0];
        expect(recommendation.priority).toBeDefined();
        expect(recommendation.category).toBeDefined();
        expect(recommendation.title).toBeDefined();
        expect(recommendation.description).toBeDefined();
      }
    });

    test('should create action items', async () => {
      const report = await generator.generateReport();

      expect(report.actionItems).toBeDefined();
      expect(Array.isArray(report.actionItems)).toBe(true);

      if (report.actionItems.length > 0) {
        const actionItem = report.actionItems[0];
        expect(actionItem.id).toBeDefined();
        expect(actionItem.title).toBeDefined();
        expect(actionItem.description).toBeDefined();
        expect(actionItem.priority).toBeDefined();
        expect(actionItem.estimatedEffort).toBeDefined();
        expect(actionItem.assignee).toBeDefined();
        expect(actionItem.dueDate).toBeDefined();
      }
    });

    test('should analyze trends when requested', async () => {
      const report = await generator.generateReport({ trends: true });

      expect(report.trends).toBeDefined();
      expect(report.trends.dataGrowth).toBeDefined();
      expect(report.trends.qualityTrends).toBeDefined();
      expect(Array.isArray(report.trends.dataGrowth)).toBe(true);
      expect(Array.isArray(report.trends.qualityTrends)).toBe(true);
    });

    test('should output report in different formats', async () => {
      // Test JSON format
      const jsonReport = await generator.generateReport({ format: 'json' });
      expect(jsonReport).toBeDefined();

      // Note: In a real test environment, you would test actual file output
      // For this test, we just verify the method doesn't throw errors
    });
  });

  describe('Integration Tests', () => {
    test('should run all validation tools in sequence', async () => {
      // Create test data
      const testLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Integration Test Liga',
          aktiv: true
        }
      });

      const testClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Integration Test Club',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1',
          aktiv: true,
          ligen: [testLiga.id]
        }
      });

      try {
        // Run club data validation
        const clubValidator = new ClubDataValidator(strapi);
        const clubResults = await clubValidator.validateAll();
        expect(clubResults).toBeDefined();

        // Run consistency validation
        const consistencyValidator = new TeamClubConsistencyValidator(strapi);
        const consistencyResults = await consistencyValidator.validateConsistency();
        expect(consistencyResults).toBeDefined();

        // Run cleanup (dry-run)
        const cleaner = new OrphanedRecordsCleaner(strapi);
        const cleanupResults = await cleaner.cleanup({ dryRun: true });
        expect(cleanupResults).toBeDefined();

        // Generate quality report
        const reportGenerator = new DataQualityReportGenerator(strapi);
        const report = await reportGenerator.generateReport({ period: 1 });
        expect(report).toBeDefined();

      } finally {
        // Cleanup test data
        await strapi.entityService.delete('api::club.club', testClub.id);
        await strapi.entityService.delete('api::liga.liga', testLiga.id);
      }
    });

    test('should handle edge cases and error conditions', async () => {
      // Test with non-existent club ID
      const clubValidator = new ClubDataValidator(strapi);
      const results = await clubValidator.validateAll({ clubId: 99999 });
      expect(results.summary.totalClubs).toBe(0);

      // Test cleanup with no orphaned records
      const cleaner = new OrphanedRecordsCleaner(strapi);
      const cleanupResults = await cleaner.cleanup({ dryRun: true, type: 'spiele' });
      expect(cleanupResults).toBeDefined();

      // Test consistency validation with minimal data
      const consistencyValidator = new TeamClubConsistencyValidator(strapi);
      const consistencyResults = await consistencyValidator.validateConsistency();
      expect(consistencyResults).toBeDefined();
    });
  });
});

describe('Validation Tool Error Handling', () => {
  test('should handle database connection errors gracefully', async () => {
    // Mock strapi with failing entityService
    const mockStrapi = {
      entityService: {
        findMany: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        findOne: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      },
      log: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };

    const validator = new ClubDataValidator(mockStrapi);

    await expect(validator.validateAll()).rejects.toThrow('Database connection failed');
  });

  test('should handle invalid input parameters', async () => {
    const mockStrapi = {
      entityService: {
        findMany: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null)
      },
      log: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };

    const validator = new ClubDataValidator(mockStrapi);
    const results = await validator.validateAll({ clubId: 'invalid' });

    expect(results).toBeDefined();
    expect(results.summary.totalClubs).toBe(0);
  });
});

describe('Performance Tests', () => {
  let strapi;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  test('should complete validation within reasonable time limits', async () => {
    const startTime = Date.now();

    const validator = new ClubDataValidator(strapi);
    await validator.validateAll();

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
  });

  test('should handle large datasets efficiently', async () => {
    // Create multiple test clubs
    const testLiga = await strapi.entityService.create('api::liga.liga', {
      data: {
        name: 'Performance Test Liga',
        aktiv: true
      }
    });

    const clubs = [];
    for (let i = 0; i < 10; i++) {
      const club = await strapi.entityService.create('api::club.club', {
        data: {
          name: `Performance Test Club ${i}`,
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [testLiga.id]
        }
      });
      clubs.push(club);
    }

    try {
      const startTime = Date.now();

      const validator = new ClubDataValidator(strapi);
      const results = await validator.validateAll();

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(15000); // Should handle 10 clubs within 15 seconds
      expect(results.summary.totalClubs).toBeGreaterThanOrEqual(10);

    } finally {
      // Cleanup
      for (const club of clubs) {
        await strapi.entityService.delete('api::club.club', club.id);
      }
      await strapi.entityService.delete('api::liga.liga', testLiga.id);
    }
  });
});