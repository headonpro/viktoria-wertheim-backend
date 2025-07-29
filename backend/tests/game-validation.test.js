/**
 * Tests for Game Validation Service
 */

const { setupStrapi, cleanupStrapi } = require('./helpers/strapi');

describe('Game Validation Service', () => {
  let strapi;
  let gameValidationService;
  let testLiga;
  let testSaison;
  let testClub1;
  let testClub2;
  let viktoriaClub1;
  let viktoriaClub2;

  beforeAll(async () => {
    strapi = await setupStrapi();
    gameValidationService = strapi.service('api::spiel.game-validation');
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    // Create test liga
    testLiga = await strapi.entityService.create('api::liga.liga', {
      data: {
        name: 'Test Liga',
        aktiv: true
      }
    });

    // Create test saison
    testSaison = await strapi.entityService.create('api::saison.saison', {
      data: {
        name: '2023/24',
        jahr: 2023,
        aktiv: true
      }
    });

    // Create test clubs
    testClub1 = await strapi.entityService.create('api::club.club', {
      data: {
        name: 'Test Club 1',
        club_typ: 'gegner_verein',
        aktiv: true,
        ligen: [testLiga.id]
      }
    });

    testClub2 = await strapi.entityService.create('api::club.club', {
      data: {
        name: 'Test Club 2',
        club_typ: 'gegner_verein',
        aktiv: true,
        ligen: [testLiga.id]
      }
    });

    // Create Viktoria clubs
    viktoriaClub1 = await strapi.entityService.create('api::club.club', {
      data: {
        name: 'SV Viktoria Test 1',
        club_typ: 'viktoria_verein',
        viktoria_team_mapping: 'team_1',
        aktiv: true,
        ligen: [testLiga.id]
      }
    });

    viktoriaClub2 = await strapi.entityService.create('api::club.club', {
      data: {
        name: 'SV Viktoria Test 2',
        club_typ: 'viktoria_verein',
        viktoria_team_mapping: 'team_2',
        aktiv: true,
        ligen: [testLiga.id]
      }
    });
  });

  describe('Club Existence and Activity Validation', () => {
    test('should validate that both clubs exist and are active', async () => {
      const validation = await gameValidationService.validateClubsExistAndActive(
        testClub1.id,
        testClub2.id
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject non-existent clubs', async () => {
      const validation = await gameValidationService.validateClubsExistAndActive(
        99999, // Non-existent club
        testClub2.id
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].code).toBe('CLUB_NOT_FOUND');
      expect(validation.errors[0].field).toBe('heim_club');
    });

    test('should reject inactive clubs', async () => {
      // Create inactive club
      const inactiveClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Inactive Club',
          club_typ: 'gegner_verein',
          aktiv: false,
          ligen: [testLiga.id]
        }
      });

      const validation = await gameValidationService.validateClubsExistAndActive(
        testClub1.id,
        inactiveClub.id
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].code).toBe('CLUB_INACTIVE');
      expect(validation.errors[0].field).toBe('gast_club');
    });
  });

  describe('Liga Assignment Validation', () => {
    test('should validate that clubs belong to the same league', async () => {
      const validation = await gameValidationService.validateClubsInLiga(
        testClub1.id,
        testClub2.id,
        testLiga.id
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject clubs not in the specified league', async () => {
      // Create club in different league
      const otherLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Other Liga',
          aktiv: true
        }
      });

      const otherClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Other Club',
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [otherLiga.id]
        }
      });

      const validation = await gameValidationService.validateClubsInLiga(
        testClub1.id,
        otherClub.id,
        testLiga.id
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].code).toBe('CLUB_NOT_IN_LIGA');
      expect(validation.errors[0].field).toBe('gast_club');
    });

    test('should warn about clubs in multiple leagues', async () => {
      // Create another liga
      const secondLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Second Liga',
          aktiv: true
        }
      });

      // Add testClub1 to multiple leagues
      await strapi.entityService.update('api::club.club', testClub1.id, {
        data: {
          ligen: [testLiga.id, secondLiga.id]
        }
      });

      const validation = await gameValidationService.validateClubsInLiga(
        testClub1.id,
        testClub2.id,
        testLiga.id
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toBeDefined();
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0].code).toBe('CLUB_IN_MULTIPLE_LEAGUES');
    });
  });

  describe('Self-Play Prevention', () => {
    test('should prevent clubs from playing against themselves', async () => {
      const validation = gameValidationService.validateClubsNotSame(
        testClub1.id,
        testClub1.id
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].code).toBe('CLUB_AGAINST_ITSELF');
    });

    test('should allow different clubs to play', async () => {
      const validation = gameValidationService.validateClubsNotSame(
        testClub1.id,
        testClub2.id
      );

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Business Rules Validation', () => {
    test('should warn about Viktoria vs Viktoria games', async () => {
      const gameData = {
        heim_club: { id: viktoriaClub1.id },
        gast_club: { id: viktoriaClub2.id },
        datum: new Date().toISOString()
      };

      const validation = await gameValidationService.validateBusinessRules(gameData);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toBeDefined();
      expect(validation.warnings.some(w => w.code === 'VIKTORIA_VS_VIKTORIA')).toBe(true);
    });

    test('should reject Viktoria clubs with same team mapping', async () => {
      // Create another Viktoria club with same mapping
      const duplicateViktoriaClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'SV Viktoria Duplicate',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1', // Same as viktoriaClub1
          aktiv: true,
          ligen: [testLiga.id]
        }
      });

      const gameData = {
        heim_club: { id: viktoriaClub1.id },
        gast_club: { id: duplicateViktoriaClub.id },
        datum: new Date().toISOString()
      };

      const validation = await gameValidationService.validateBusinessRules(gameData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].code).toBe('DUPLICATE_VIKTORIA_MAPPING');
    });

    test('should warn about similar club names', async () => {
      const similarClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Test Club 1 Similar', // Very similar to 'Test Club 1'
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [testLiga.id]
        }
      });

      const gameData = {
        heim_club: { id: testClub1.id },
        gast_club: { id: similarClub.id },
        datum: new Date().toISOString()
      };

      const validation = await gameValidationService.validateBusinessRules(gameData);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toBeDefined();
      expect(validation.warnings.some(w => w.code === 'SIMILAR_CLUB_NAMES')).toBe(true);
    });

    test('should warn about old game dates', async () => {
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2); // 2 years ago

      const gameData = {
        heim_club: { id: testClub1.id },
        gast_club: { id: testClub2.id },
        datum: oldDate.toISOString()
      };

      const validation = await gameValidationService.validateBusinessRules(gameData);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toBeDefined();
      expect(validation.warnings.some(w => w.code === 'OLD_GAME_DATE')).toBe(true);
    });

    test('should warn about future game dates', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2); // 2 years from now

      const gameData = {
        heim_club: { id: testClub1.id },
        gast_club: { id: testClub2.id },
        datum: futureDate.toISOString()
      };

      const validation = await gameValidationService.validateBusinessRules(gameData);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toBeDefined();
      expect(validation.warnings.some(w => w.code === 'FUTURE_GAME_DATE')).toBe(true);
    });
  });

  describe('Comprehensive Club Game Validation', () => {
    test('should validate complete valid club game', async () => {
      const gameData = {
        heim_club: { id: testClub1.id },
        gast_club: { id: testClub2.id },
        liga: { id: testLiga.id },
        saison: { id: testSaison.id },
        datum: new Date().toISOString(),
        spieltag: 1,
        status: 'geplant'
      };

      const validation = await gameValidationService.validateClubGame(gameData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.details).toBeDefined();
    });

    test('should reject invalid club game with multiple errors', async () => {
      const gameData = {
        heim_club: { id: testClub1.id },
        gast_club: { id: testClub1.id }, // Same club (error)
        liga: { id: testLiga.id },
        saison: { id: testSaison.id },
        datum: new Date().toISOString(),
        spieltag: 1,
        status: 'beendet',
        heim_tore: -1, // Invalid score
        gast_tore: undefined // Missing score for completed game
      };

      const validation = await gameValidationService.validateClubGame(gameData);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(1);
      expect(validation.errors.some(e => e.code === 'CLUB_AGAINST_ITSELF')).toBe(true);
    });
  });

  describe('Game Creation and Update Validation', () => {
    test('should validate game creation with clubs', async () => {
      const gameData = {
        heim_club: { id: testClub1.id },
        gast_club: { id: testClub2.id },
        liga: { id: testLiga.id },
        saison: { id: testSaison.id },
        datum: new Date().toISOString(),
        spieltag: 1,
        status: 'geplant'
      };

      const validation = await gameValidationService.validateGameCreation(gameData);

      expect(validation.isValid).toBe(true);
    });

    test('should validate game update', async () => {
      // Create a test game first
      const game = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          heim_club: testClub1.id,
          gast_club: testClub2.id,
          liga: testLiga.id,
          saison: testSaison.id,
          datum: new Date(),
          spieltag: 1,
          status: 'geplant'
        }
      });

      const updateData = {
        status: 'beendet',
        heim_tore: 2,
        gast_tore: 1
      };

      const validation = await gameValidationService.validateGameUpdate(updateData, game.id);

      expect(validation.isValid).toBe(true);
    });

    test('should reject update for non-existent game', async () => {
      const validation = await gameValidationService.validateGameUpdate({}, 99999);

      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].code).toBe('GAME_NOT_FOUND');
    });
  });

  describe('Validation Summary and Messages', () => {
    test('should generate validation summary', async () => {
      const gameData = {
        heim_club: { id: testClub1.id },
        gast_club: { id: testClub1.id }, // Same club (error)
        liga: { id: testLiga.id },
        saison: { id: testSaison.id },
        datum: new Date().toISOString(),
        spieltag: 1,
        status: 'geplant'
      };

      const validation = await gameValidationService.validateClubGame(gameData);
      const summary = gameValidationService.getValidationSummary(validation);

      expect(summary.isValid).toBe(false);
      expect(summary.errorCount).toBeGreaterThan(0);
      expect(summary.messages.length).toBeGreaterThan(0);
      expect(summary.summary).toContain('fehlgeschlagen');
    });

    test('should provide error suggestions', () => {
      const clubSuggestion = gameValidationService.getClubErrorSuggestion('CLUB_NOT_FOUND');
      expect(clubSuggestion).toContain('existiert');

      const ligaSuggestion = gameValidationService.getLigaErrorSuggestion('CLUB_NOT_IN_LIGA');
      expect(ligaSuggestion).toContain('Liga');

      const businessSuggestion = gameValidationService.getBusinessRuleErrorSuggestion('CLUB_AGAINST_ITSELF');
      expect(businessSuggestion).toContain('unterschiedliche');
    });
  });

  describe('Name Similarity Calculation', () => {
    test('should calculate name similarity correctly', () => {
      const similarity1 = gameValidationService.calculateNameSimilarity('Test Club', 'Test Club');
      expect(similarity1).toBe(1.0);

      const similarity2 = gameValidationService.calculateNameSimilarity('Test Club', 'Test Club 2');
      expect(similarity2).toBeGreaterThan(0.8);

      const similarity3 = gameValidationService.calculateNameSimilarity('Test Club', 'Completely Different');
      expect(similarity3).toBeLessThan(0.5);
    });

    test('should handle empty strings', () => {
      const similarity = gameValidationService.calculateNameSimilarity('', 'Test');
      expect(similarity).toBe(0);
    });
  });

  // Cleanup after each test
  afterEach(async () => {
    try {
      // Clean up test games
      const games = await strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          $or: [
            { heim_club: testClub1?.id },
            { gast_club: testClub1?.id },
            { heim_club: testClub2?.id },
            { gast_club: testClub2?.id }
          ]
        }
      });

      for (const game of games) {
        await strapi.entityService.delete('api::spiel.spiel', game.id);
      }

      // Clean up test clubs
      const clubs = await strapi.entityService.findMany('api::club.club', {
        filters: {
          name: {
            $contains: 'Test'
          }
        }
      });

      for (const club of clubs) {
        await strapi.entityService.delete('api::club.club', club.id);
      }

      // Clean up test ligen
      const ligen = await strapi.entityService.findMany('api::liga.liga', {
        filters: {
          name: {
            $contains: 'Test'
          }
        }
      });

      for (const liga of ligen) {
        await strapi.entityService.delete('api::liga.liga', liga.id);
      }

      // Clean up test saisons
      const saisons = await strapi.entityService.findMany('api::saison.saison', {
        filters: {
          name: {
            $contains: '2023'
          }
        }
      });

      for (const saison of saisons) {
        await strapi.entityService.delete('api::saison.saison', saison.id);
      }
    } catch (error) {
      console.warn('Cleanup error:', error.message);
    }
  });
});