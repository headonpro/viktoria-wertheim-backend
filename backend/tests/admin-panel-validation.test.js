/**
 * Tests for Admin Panel Validation
 */

const { setupStrapi, cleanupStrapi } = require('./helpers/strapi');

describe('Admin Panel Validation', () => {
  let strapi;
  let testLiga;
  let testSaison;
  let testClub1;
  let testClub2;
  let viktoriaClub;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    // Create test data
    testLiga = await strapi.entityService.create('api::liga.liga', {
      data: {
        name: 'Test Liga Admin',
        aktiv: true
      }
    });

    testSaison = await strapi.entityService.create('api::saison.saison', {
      data: {
        name: '2023/24 Admin',
        jahr: 2023,
        aktiv: true
      }
    });

    testClub1 = await strapi.entityService.create('api::club.club', {
      data: {
        name: 'Admin Test Club 1',
        club_typ: 'gegner_verein',
        aktiv: true,
        ligen: [testLiga.id]
      }
    });

    testClub2 = await strapi.entityService.create('api::club.club', {
      data: {
        name: 'Admin Test Club 2',
        club_typ: 'gegner_verein',
        aktiv: true,
        ligen: [testLiga.id]
      }
    });

    viktoriaClub = await strapi.entityService.create('api::club.club', {
      data: {
        name: 'SV Viktoria Admin Test',
        club_typ: 'viktoria_verein',
        viktoria_team_mapping: 'team_1',
        aktiv: true,
        ligen: [testLiga.id]
      }
    });
  });

  describe('Game Validation API', () => {
    test('should validate valid game data', async () => {
      const gameData = {
        heim_club: testClub1.id,
        gast_club: testClub2.id,
        liga: testLiga.id,
        saison: testSaison.id,
        datum: new Date().toISOString(),
        spieltag: 1,
        status: 'geplant'
      };

      const response = await strapi
        .request('POST', '/api/spiel/validate')
        .send(gameData)
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.errors).toHaveLength(0);
      expect(response.body.data.summary).toBeDefined();
    });

    test('should reject invalid game data', async () => {
      const gameData = {
        heim_club: testClub1.id,
        gast_club: testClub1.id, // Same club (error)
        liga: testLiga.id,
        saison: testSaison.id,
        datum: new Date().toISOString(),
        spieltag: 1,
        status: 'geplant'
      };

      const response = await strapi
        .request('POST', '/api/spiel/validate')
        .send(gameData)
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
      expect(response.body.data.summary.errorCount).toBeGreaterThan(0);
    });
  });

  describe('Club-Liga Validation API', () => {
    test('should validate club in liga', async () => {
      const response = await strapi
        .request('GET', `/api/spiel/validate-club/${testClub1.id}/liga/${testLiga.id}`)
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
    });

    test('should reject club not in liga', async () => {
      // Create club in different liga
      const otherLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Other Liga Admin',
          aktiv: true
        }
      });

      const response = await strapi
        .request('GET', `/api/spiel/validate-club/${testClub1.id}/liga/${otherLiga.id}`)
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
    });
  });

  describe('Club Match Validation API', () => {
    test('should validate valid club match', async () => {
      const response = await strapi
        .request('POST', '/api/spiel/validate-clubs')
        .send({
          heimClubId: testClub1.id,
          gastClubId: testClub2.id,
          ligaId: testLiga.id
        })
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.details).toBeDefined();
    });

    test('should reject same club match', async () => {
      const response = await strapi
        .request('POST', '/api/spiel/validate-clubs')
        .send({
          heimClubId: testClub1.id,
          gastClubId: testClub1.id,
          ligaId: testLiga.id
        })
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors.length).toBeGreaterThan(0);
    });

    test('should require both club IDs', async () => {
      await strapi
        .request('POST', '/api/spiel/validate-clubs')
        .send({
          heimClubId: testClub1.id
          // Missing gastClubId
        })
        .expect(400);
    });
  });

  describe('Validation Rules API', () => {
    test('should return validation rules', async () => {
      const response = await strapi
        .request('GET', '/api/spiel/validation-rules')
        .expect(200);

      expect(response.body.data.clubRules).toBeDefined();
      expect(response.body.data.gameRules).toBeDefined();
      expect(response.body.data.hints).toBeDefined();
      expect(Array.isArray(response.body.data.clubRules)).toBe(true);
    });
  });

  describe('Game Creation Validation API', () => {
    test('should validate game creation', async () => {
      const gameData = {
        heim_club: testClub1.id,
        gast_club: testClub2.id,
        liga: testLiga.id,
        saison: testSaison.id,
        datum: new Date().toISOString(),
        spieltag: 1,
        status: 'geplant'
      };

      const response = await strapi
        .request('POST', '/api/spiel/validate-creation')
        .send(gameData)
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.summary).toBeDefined();
    });

    test('should warn about duplicate games', async () => {
      // Create a game first
      const gameData = {
        heim_club: testClub1.id,
        gast_club: testClub2.id,
        liga: testLiga.id,
        saison: testSaison.id,
        datum: new Date(),
        spieltag: 1,
        status: 'geplant'
      };

      await strapi.entityService.create('api::spiel.spiel', {
        data: gameData
      });

      // Try to create similar game
      const response = await strapi
        .request('POST', '/api/spiel/validate-creation')
        .send(gameData)
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.warnings).toBeDefined();
      expect(response.body.data.warnings.some(w => w.code === 'DUPLICATE_GAME_WARNING')).toBe(true);
    });
  });

  describe('Game Update Validation API', () => {
    test('should validate game update', async () => {
      // Create a game first
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

      const response = await strapi
        .request('PUT', `/api/spiel/validate-update/${game.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.summary).toBeDefined();
    });

    test('should reject update for non-existent game', async () => {
      const updateData = {
        status: 'beendet',
        heim_tore: 2,
        gast_tore: 1
      };

      const response = await strapi
        .request('PUT', '/api/spiel/validate-update/99999')
        .send(updateData)
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors[0].code).toBe('GAME_NOT_FOUND');
    });
  });

  describe('Real-time Validation Features', () => {
    test('should provide detailed validation feedback', async () => {
      const gameData = {
        heim_club: testClub1.id,
        gast_club: viktoriaClub.id, // Mix of regular and Viktoria club
        liga: testLiga.id,
        saison: testSaison.id,
        datum: new Date().toISOString(),
        spieltag: 1,
        status: 'geplant'
      };

      const response = await strapi
        .request('POST', '/api/spiel/validate')
        .send(gameData)
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.details).toBeDefined();
      
      // Should have details about club types
      if (response.body.data.details.businessRuleValidation) {
        expect(response.body.data.details.businessRuleValidation).toBeDefined();
      }
    });

    test('should provide user-friendly error messages', async () => {
      const gameData = {
        heim_club: testClub1.id,
        gast_club: testClub1.id, // Same club
        liga: testLiga.id,
        saison: testSaison.id,
        datum: new Date().toISOString(),
        spieltag: 1,
        status: 'beendet',
        heim_tore: -1, // Invalid score
        gast_tore: undefined // Missing score
      };

      const response = await strapi
        .request('POST', '/api/spiel/validate')
        .send(gameData)
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.summary.messages).toBeDefined();
      expect(response.body.data.summary.messages.length).toBeGreaterThan(0);
      
      // Check for user-friendly messages
      const messages = response.body.data.summary.messages.join(' ');
      expect(messages).toContain('Club');
    });
  });

  describe('League-based Filtering', () => {
    test('should validate clubs belong to same league', async () => {
      // Create club in different league
      const otherLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Other Liga Filter Test',
          aktiv: true
        }
      });

      const otherClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Other Liga Club',
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [otherLiga.id]
        }
      });

      const response = await strapi
        .request('POST', '/api/spiel/validate-clubs')
        .send({
          heimClubId: testClub1.id,
          gastClubId: otherClub.id,
          ligaId: testLiga.id
        })
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors.some(e => e.code === 'CLUB_NOT_IN_LIGA')).toBe(true);
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
            { gast_club: testClub2?.id },
            { heim_club: viktoriaClub?.id },
            { gast_club: viktoriaClub?.id }
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
            $contains: 'Admin Test'
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
            $contains: 'Admin'
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
            $contains: 'Admin'
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