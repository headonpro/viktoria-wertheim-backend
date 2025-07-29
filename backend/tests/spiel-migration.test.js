/**
 * Tests for Spiel Migration Service
 * Requirements: 8.1, 8.3
 */

const { createSpielMigrationService } = require('../src/api/spiel/services/migration');

describe('Spiel Migration Service', () => {
  let strapi;
  let migrationService;
  let testData = {};

  beforeAll(async () => {
    strapi = await global.testUtils.createTestStrapi();
    migrationService = createSpielMigrationService(strapi);
  });

  afterAll(async () => {
    if (strapi) {
      await strapi.destroy();
    }
  });

  beforeEach(async () => {
    // Clean up test data
    await global.testUtils.cleanupTestData(strapi);
    
    // Create test data
    testData = await createTestData();
  });

  describe('validateMigrationData', () => {
    test('should validate migration data correctly', async () => {
      const result = await migrationService.validateMigrationData();
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('totalSpiele');
      expect(result).toHaveProperty('teamBasedSpiele');
      expect(result).toHaveProperty('clubBasedSpiele');
      expect(result).toHaveProperty('mixedSpiele');
      expect(result).toHaveProperty('inconsistencies');
      expect(result).toHaveProperty('recommendations');
      
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.totalSpiele).toBe('number');
      expect(Array.isArray(result.inconsistencies)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    test('should identify team-based spiele correctly', async () => {
      // Create a spiel with only team relations
      const teamSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: testData.liga.id,
          saison: testData.saison.id,
          heim_team: testData.viktoriaTeam.id,
          gast_team: testData.gegnerTeam.id,
          spieltag: 1,
          status: 'geplant'
        }
      });

      const result = await migrationService.validateMigrationData();
      
      expect(result.teamBasedSpiele).toBeGreaterThan(0);
      expect(result.totalSpiele).toBeGreaterThan(0);
    });

    test('should identify club-based spiele correctly', async () => {
      // Create a spiel with only club relations
      const clubSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: testData.liga.id,
          saison: testData.saison.id,
          heim_club: testData.viktoriaClub.id,
          gast_club: testData.gegnerClub.id,
          spieltag: 1,
          status: 'geplant'
        }
      });

      const result = await migrationService.validateMigrationData();
      
      expect(result.clubBasedSpiele).toBeGreaterThan(0);
      expect(result.totalSpiele).toBeGreaterThan(0);
    });

    test('should identify mixed spiele correctly', async () => {
      // Create a spiel with both team and club relations
      const mixedSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: testData.liga.id,
          saison: testData.saison.id,
          heim_team: testData.viktoriaTeam.id,
          gast_team: testData.gegnerTeam.id,
          heim_club: testData.viktoriaClub.id,
          gast_club: testData.gegnerClub.id,
          spieltag: 1,
          status: 'geplant'
        }
      });

      const result = await migrationService.validateMigrationData();
      
      expect(result.mixedSpiele).toBeGreaterThan(0);
      expect(result.totalSpiele).toBeGreaterThan(0);
    });
  });

  describe('createMigrationBackup', () => {
    test('should create backup successfully', async () => {
      const result = await migrationService.createMigrationBackup();
      
      expect(result.success).toBe(true);
      expect(result.backupId).toBeTruthy();
      expect(result.recordCount).toBeGreaterThanOrEqual(0);
      expect(result.filePath).toBeTruthy();
      
      // Verify backup file exists
      const fs = require('fs');
      expect(fs.existsSync(result.filePath)).toBe(true);
      
      // Verify backup content
      const backupData = JSON.parse(fs.readFileSync(result.filePath, 'utf8'));
      expect(backupData).toHaveProperty('metadata');
      expect(backupData).toHaveProperty('spiele');
      expect(backupData.metadata.backupId).toBe(result.backupId);
      expect(backupData.spiele).toHaveLength(result.recordCount);
    });

    test('should handle backup creation errors gracefully', async () => {
      // Mock filesystem error
      const originalWriteFileSync = require('fs').writeFileSync;
      require('fs').writeFileSync = jest.fn(() => {
        throw new Error('Disk full');
      });

      const result = await migrationService.createMigrationBackup();
      
      expect(result.success).toBe(false);
      
      // Restore original function
      require('fs').writeFileSync = originalWriteFileSync;
    });
  });

  describe('migrateTeamToClubRelations', () => {
    test('should migrate team-based spiel to club-based', async () => {
      // Create a team-based spiel
      const teamSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: testData.liga.id,
          saison: testData.saison.id,
          heim_team: testData.viktoriaTeam.id,
          gast_team: testData.gegnerTeam.id,
          spieltag: 1,
          status: 'geplant'
        }
      });

      const result = await migrationService.migrateTeamToClubRelations();
      
      expect(result.success).toBe(true);
      expect(result.processed).toBeGreaterThan(0);
      expect(result.migrated).toBeGreaterThan(0);
      expect(result.backupId).toBeTruthy();
      
      // Verify the spiel was migrated
      const migratedSpiel = await strapi.entityService.findOne('api::spiel.spiel', teamSpiel.id, {
        populate: {
          heim_club: true,
          gast_club: true,
          heim_team: true,
          gast_team: true
        }
      });
      
      expect(migratedSpiel.heim_club).toBeTruthy();
      expect(migratedSpiel.gast_club).toBeTruthy();
      expect(migratedSpiel.heim_club.id).toBe(testData.viktoriaClub.id);
      expect(migratedSpiel.gast_club.id).toBe(testData.gegnerClub.id);
    });

    test('should skip spiele that already have club relations', async () => {
      // Create a club-based spiel
      const clubSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: testData.liga.id,
          saison: testData.saison.id,
          heim_club: testData.viktoriaClub.id,
          gast_club: testData.gegnerClub.id,
          spieltag: 1,
          status: 'geplant'
        }
      });

      const result = await migrationService.migrateTeamToClubRelations();
      
      expect(result.success).toBe(true);
      expect(result.skipped).toBeGreaterThan(0);
    });

    test('should handle migration errors gracefully', async () => {
      // Create a spiel with team that has no club mapping
      const unmappableTeam = await strapi.entityService.create('api::team.team', {
        data: {
          name: 'Unmappable Team',
          team_typ: 'gegner_verein'
        }
      });

      const problemSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: testData.liga.id,
          saison: testData.saison.id,
          heim_team: unmappableTeam.id,
          gast_team: testData.gegnerTeam.id,
          spieltag: 1,
          status: 'geplant'
        }
      });

      const result = await migrationService.migrateTeamToClubRelations();
      
      expect(result.processed).toBeGreaterThan(0);
      expect(result.skipped).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('rollbackMigration', () => {
    test('should rollback migration successfully', async () => {
      // First create a backup
      const backup = await migrationService.createMigrationBackup();
      expect(backup.success).toBe(true);

      // Create and migrate a spiel
      const teamSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: testData.liga.id,
          saison: testData.saison.id,
          heim_team: testData.viktoriaTeam.id,
          gast_team: testData.gegnerTeam.id,
          spieltag: 1,
          status: 'geplant'
        }
      });

      const migration = await migrationService.migrateTeamToClubRelations();
      expect(migration.success).toBe(true);

      // Verify migration happened
      const migratedSpiel = await strapi.entityService.findOne('api::spiel.spiel', teamSpiel.id, {
        populate: {
          heim_club: true,
          gast_club: true
        }
      });
      expect(migratedSpiel.heim_club).toBeTruthy();
      expect(migratedSpiel.gast_club).toBeTruthy();

      // Now rollback
      const rollback = await migrationService.rollbackMigration(backup.backupId);
      
      expect(rollback.success).toBe(true);
      expect(rollback.restored).toBeGreaterThan(0);

      // Verify rollback happened
      const rolledBackSpiel = await strapi.entityService.findOne('api::spiel.spiel', teamSpiel.id, {
        populate: {
          heim_club: true,
          gast_club: true
        }
      });
      expect(rolledBackSpiel.heim_club).toBeFalsy();
      expect(rolledBackSpiel.gast_club).toBeFalsy();
    });

    test('should handle rollback with invalid backup ID', async () => {
      const result = await migrationService.rollbackMigration('invalid-backup-id');
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].error).toContain('Backup file not found');
    });
  });

  describe('getMigrationStatus', () => {
    test('should return migration status correctly', async () => {
      const status = await migrationService.getMigrationStatus();
      
      expect(status).toHaveProperty('totalSpiele');
      expect(status).toHaveProperty('teamOnlySpiele');
      expect(status).toHaveProperty('clubOnlySpiele');
      expect(status).toHaveProperty('mixedSpiele');
      expect(status).toHaveProperty('migrationProgress');
      
      expect(typeof status.totalSpiele).toBe('number');
      expect(typeof status.teamOnlySpiele).toBe('number');
      expect(typeof status.clubOnlySpiele).toBe('number');
      expect(typeof status.mixedSpiele).toBe('number');
      expect(typeof status.migrationProgress).toBe('number');
      
      expect(status.migrationProgress).toBeGreaterThanOrEqual(0);
      expect(status.migrationProgress).toBeLessThanOrEqual(100);
    });
  });

  // Helper function to create test data
  async function createTestData() {
    // Create test liga
    const liga = await strapi.entityService.create('api::liga.liga', {
      data: {
        name: 'Test Liga',
        aktiv: true
      }
    });

    // Create test saison
    const saison = await strapi.entityService.create('api::saison.saison', {
      data: {
        name: '2024/25',
        start_datum: new Date('2024-08-01'),
        end_datum: new Date('2025-05-31'),
        aktiv: true
      }
    });

    // Create Viktoria team
    const viktoriaTeam = await strapi.entityService.create('api::team.team', {
      data: {
        name: '1. Mannschaft',
        team_typ: 'viktoria_mannschaft',
        liga: liga.id,
        saison: saison.id
      }
    });

    // Create Viktoria club
    const viktoriaClub = await strapi.entityService.create('api::club.club', {
      data: {
        name: 'SV Viktoria Wertheim',
        club_typ: 'viktoria_verein',
        viktoria_team_mapping: 'team_1',
        aktiv: true,
        ligen: [liga.id]
      }
    });

    // Create opponent team
    const gegnerTeam = await strapi.entityService.create('api::team.team', {
      data: {
        name: 'VfR Gerlachsheim',
        team_typ: 'gegner_verein'
      }
    });

    // Create opponent club
    const gegnerClub = await strapi.entityService.create('api::club.club', {
      data: {
        name: 'VfR Gerlachsheim',
        club_typ: 'gegner_verein',
        aktiv: true,
        ligen: [liga.id]
      }
    });

    return {
      liga,
      saison,
      viktoriaTeam,
      viktoriaClub,
      gegnerTeam,
      gegnerClub
    };
  }
});

// Integration tests
describe('Spiel Migration Integration', () => {
  let strapi;
  let migrationService;

  beforeAll(async () => {
    strapi = await global.testUtils.createTestStrapi();
    migrationService = createSpielMigrationService(strapi);
  });

  afterAll(async () => {
    if (strapi) {
      await strapi.destroy();
    }
  });

  test('should handle complete migration workflow', async () => {
    // Clean up
    await global.testUtils.cleanupTestData(strapi);

    // Create comprehensive test scenario
    const testData = await createComplexTestScenario();

    // 1. Initial validation
    const initialValidation = await migrationService.validateMigrationData();
    expect(initialValidation.teamBasedSpiele).toBeGreaterThan(0);

    // 2. Create backup
    const backup = await migrationService.createMigrationBackup();
    expect(backup.success).toBe(true);

    // 3. Run migration
    const migration = await migrationService.migrateTeamToClubRelations();
    expect(migration.success).toBe(true);
    expect(migration.migrated).toBeGreaterThan(0);

    // 4. Post-migration validation
    const postValidation = await migrationService.validateMigrationData();
    expect(postValidation.clubBasedSpiele).toBeGreaterThan(initialValidation.clubBasedSpiele);

    // 5. Get status
    const status = await migrationService.getMigrationStatus();
    expect(status.migrationProgress).toBeGreaterThan(0);

    // 6. Test rollback
    const rollback = await migrationService.rollbackMigration(backup.backupId);
    expect(rollback.success).toBe(true);

    // 7. Verify rollback
    const rollbackValidation = await migrationService.validateMigrationData();
    expect(rollbackValidation.teamBasedSpiele).toBe(initialValidation.teamBasedSpiele);
  });

  async function createComplexTestScenario() {
    // Create multiple ligen, teams, clubs, and spiele for comprehensive testing
    const liga1 = await strapi.entityService.create('api::liga.liga', {
      data: { name: 'Kreisliga A', aktiv: true }
    });

    const liga2 = await strapi.entityService.create('api::liga.liga', {
      data: { name: 'Kreisliga B', aktiv: true }
    });

    const saison = await strapi.entityService.create('api::saison.saison', {
      data: {
        name: '2024/25',
        start_datum: new Date('2024-08-01'),
        end_datum: new Date('2025-05-31'),
        aktiv: true
      }
    });

    // Create multiple teams and clubs
    const teams = [];
    const clubs = [];

    for (let i = 1; i <= 3; i++) {
      const team = await strapi.entityService.create('api::team.team', {
        data: {
          name: `${i}. Mannschaft`,
          team_typ: 'viktoria_mannschaft'
        }
      });
      teams.push(team);

      const club = await strapi.entityService.create('api::club.club', {
        data: {
          name: `SV Viktoria Wertheim${i > 1 ? ` ${i === 2 ? 'II' : 'III'}` : ''}`,
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: `team_${i}`,
          aktiv: true,
          ligen: [i <= 2 ? liga1.id : liga2.id]
        }
      });
      clubs.push(club);
    }

    // Create opponent clubs
    const opponents = ['VfR Gerlachsheim', 'TSV Kreuzwertheim', 'FC Hundheim'];
    for (const opponentName of opponents) {
      const team = await strapi.entityService.create('api::team.team', {
        data: {
          name: opponentName,
          team_typ: 'gegner_verein'
        }
      });
      teams.push(team);

      const club = await strapi.entityService.create('api::club.club', {
        data: {
          name: opponentName,
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [liga1.id]
        }
      });
      clubs.push(club);
    }

    // Create various types of spiele
    const spiele = [];

    // Team-only spiele (need migration)
    for (let i = 0; i < 5; i++) {
      const spiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: liga1.id,
          saison: saison.id,
          heim_team: teams[0].id,
          gast_team: teams[3].id,
          spieltag: i + 1,
          status: 'geplant'
        }
      });
      spiele.push(spiel);
    }

    // Club-only spiele (already migrated)
    for (let i = 0; i < 3; i++) {
      const spiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: liga1.id,
          saison: saison.id,
          heim_club: clubs[0].id,
          gast_club: clubs[3].id,
          spieltag: i + 6,
          status: 'geplant'
        }
      });
      spiele.push(spiel);
    }

    // Mixed spiele (have both)
    for (let i = 0; i < 2; i++) {
      const spiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date(),
          liga: liga1.id,
          saison: saison.id,
          heim_team: teams[1].id,
          gast_team: teams[4].id,
          heim_club: clubs[1].id,
          gast_club: clubs[4].id,
          spieltag: i + 9,
          status: 'geplant'
        }
      });
      spiele.push(spiel);
    }

    return { liga1, liga2, saison, teams, clubs, spiele };
  }
});