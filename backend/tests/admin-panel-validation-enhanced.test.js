/**
 * Enhanced Admin Panel Validation Tests
 * Tests for task 10.3: Add admin panel validation
 */

const request = require('supertest');

describe('Enhanced Admin Panel Validation', () => {
  let strapi;
  let testClubs = [];
  let testLiga;

  beforeAll(async () => {
    strapi = await setupStrapi();
    
    // Create test liga
    testLiga = await strapi.entityService.create('api::liga.liga', {
      data: {
        name: 'Test Liga Validation',
        saison: 'Test Saison'
      }
    });

    // Create test clubs
    testClubs = await Promise.all([
      strapi.entityService.create('api::club.club', {
        data: {
          name: 'Test Club A',
          kurz_name: 'TCA',
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [testLiga.id]
        }
      }),
      strapi.entityService.create('api::club.club', {
        data: {
          name: 'Test Club B',
          kurz_name: 'TCB',
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [testLiga.id]
        }
      }),
      strapi.entityService.create('api::club.club', {
        data: {
          name: 'Inactive Club',
          kurz_name: 'IC',
          club_typ: 'gegner_verein',
          aktiv: false,
          ligen: [testLiga.id]
        }
      }),
      strapi.entityService.create('api::club.club', {
        data: {
          name: 'SV Viktoria Test',
          kurz_name: 'SVT',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1',
          aktiv: true,
          ligen: [testLiga.id]
        }
      }),
      strapi.entityService.create('api::club.club', {
        data: {
          name: 'SV Viktoria Test II',
          kurz_name: 'SVT II',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_2',
          aktiv: true,
          ligen: [testLiga.id]
        }
      })
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await Promise.all([
      ...testClubs.map(club => 
        strapi.entityService.delete('api::club.club', club.id)
      ),
      strapi.entityService.delete('api::liga.liga', testLiga.id)
    ]);
    
    await strapi.destroy();
  });

  describe('Real-time Club Selection Validation', () => {
    test('should validate club exists and is active', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/spiel/validate-club/${testClubs[0].id}/liga/${testLiga.id}`)
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.errors).toHaveLength(0);
    });

    test('should reject inactive club', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/spiel/validate-club/${testClubs[2].id}/liga/${testLiga.id}`)
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('inaktiv')
          })
        ])
      );
    });

    test('should validate club is in specified league', async () => {
      // Create club not in the test liga
      const otherLiga = await strapi.entityService.create('api::liga.liga', {
        data: { name: 'Other Liga', saison: 'Test' }
      });

      const clubNotInLiga = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Club Not In Liga',
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [otherLiga.id]
        }
      });

      const response = await request(strapi.server.httpServer)
        .get(`/api/spiel/validate-club/${clubNotInLiga.id}/liga/${testLiga.id}`)
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('nicht in der angegebenen Liga')
          })
        ])
      );

      // Cleanup
      await strapi.entityService.delete('api::club.club', clubNotInLiga.id);
      await strapi.entityService.delete('api::liga.liga', otherLiga.id);
    });
  });

  describe('League-based Filtering', () => {
    test('should filter clubs by league', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/clubs?populate=*&filters[aktiv][$eq]=true&filters[ligen][id][$eq]=${testLiga.id}`)
        .expect(200);

      expect(response.body.data).toHaveLength(5); // All test clubs are in testLiga
      response.body.data.forEach(club => {
        expect(club.ligen.some(liga => liga.id === testLiga.id)).toBe(true);
      });
    });

    test('should return empty array for non-existent league', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/clubs?populate=*&filters[aktiv][$eq]=true&filters[ligen][id][$eq]=99999')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('Club Match Validation', () => {
    test('should validate clubs can play against each other', async () => {
      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate-clubs')
        .send({
          heimClubId: testClubs[0].id,
          gastClubId: testClubs[1].id,
          ligaId: testLiga.id
        })
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.errors).toHaveLength(0);
    });

    test('should reject same club for both teams', async () => {
      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate-clubs')
        .send({
          heimClubId: testClubs[0].id,
          gastClubId: testClubs[0].id,
          ligaId: testLiga.id
        })
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('gegen sich selbst spielen')
          })
        ])
      );
    });

    test('should warn about Viktoria vs Viktoria games', async () => {
      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate-clubs')
        .send({
          heimClubId: testClubs[3].id, // Viktoria club
          gastClubId: testClubs[4].id, // Another Viktoria club
          ligaId: testLiga.id
        })
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('Viktoria-Vereine spielen gegeneinander')
          })
        ])
      );
    });

    test('should reject Viktoria clubs with same team mapping', async () => {
      // Create another Viktoria club with same team mapping
      const duplicateViktoriaClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'SV Viktoria Duplicate',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1', // Same as testClubs[3]
          aktiv: true,
          ligen: [testLiga.id]
        }
      });

      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate-clubs')
        .send({
          heimClubId: testClubs[3].id,
          gastClubId: duplicateViktoriaClub.id,
          ligaId: testLiga.id
        })
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('derselben Team-Zuordnung')
          })
        ])
      );

      // Cleanup
      await strapi.entityService.delete('api::club.club', duplicateViktoriaClub.id);
    });
  });

  describe('Form Validation with Error Messages', () => {
    test('should validate complete game data', async () => {
      const gameData = {
        heim_club: testClubs[0].id,
        gast_club: testClubs[1].id,
        liga: testLiga.id,
        datum: new Date().toISOString(),
        status: 'geplant',
        spieltag: 1
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate')
        .send(gameData)
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.isValid).toBe(true);
    });

    test('should provide helpful error messages for invalid data', async () => {
      const invalidGameData = {
        heim_club: testClubs[0].id,
        gast_club: testClubs[0].id, // Same club
        liga: testLiga.id,
        datum: new Date().toISOString(),
        status: 'beendet',
        spieltag: 1
        // Missing scores for completed game
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate')
        .send(invalidGameData)
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('gegen sich selbst spielen')
          }),
          expect.objectContaining({
            message: expect.stringContaining('Tore sind für beendete Spiele erforderlich')
          })
        ])
      );
      
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.summary.errorCount).toBeGreaterThan(0);
    });

    test('should provide validation suggestions', async () => {
      const gameData = {
        heim_club: testClubs[2].id, // Inactive club
        gast_club: testClubs[1].id,
        liga: testLiga.id,
        datum: new Date().toISOString(),
        status: 'geplant',
        spieltag: 1
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate')
        .send(gameData)
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors.some(error => 
        error.suggestion && error.suggestion.includes('aktiven Club')
      )).toBe(true);
    });
  });

  describe('Game Creation Validation', () => {
    test('should validate game creation with duplicate check', async () => {
      const gameData = {
        heim_club: testClubs[0].id,
        gast_club: testClubs[1].id,
        liga: testLiga.id,
        datum: new Date().toISOString(),
        status: 'geplant',
        spieltag: 1
      };

      // First creation should be valid
      const response1 = await request(strapi.server.httpServer)
        .post('/api/spiel/validate-creation')
        .send(gameData)
        .expect(200);

      expect(response1.body.data.isValid).toBe(true);

      // Create the actual game
      const createdGame = await strapi.entityService.create('api::spiel.spiel', {
        data: gameData
      });

      // Second validation should warn about duplicate
      const response2 = await request(strapi.server.httpServer)
        .post('/api/spiel/validate-creation')
        .send(gameData)
        .expect(200);

      expect(response2.body.data.isValid).toBe(true);
      expect(response2.body.data.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('ähnliches Spiel existiert bereits')
          })
        ])
      );

      // Cleanup
      await strapi.entityService.delete('api::spiel.spiel', createdGame.id);
    });
  });

  describe('Game Update Validation', () => {
    test('should validate game updates', async () => {
      // Create a test game
      const gameData = {
        heim_club: testClubs[0].id,
        gast_club: testClubs[1].id,
        liga: testLiga.id,
        datum: new Date().toISOString(),
        status: 'geplant',
        spieltag: 1
      };

      const createdGame = await strapi.entityService.create('api::spiel.spiel', {
        data: gameData
      });

      // Validate update
      const updateData = {
        status: 'beendet',
        heim_tore: 2,
        gast_tore: 1
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/spiel/validate-update/${createdGame.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data.summary).toBeDefined();

      // Cleanup
      await strapi.entityService.delete('api::spiel.spiel', createdGame.id);
    });

    test('should reject invalid game updates', async () => {
      // Create a test game
      const gameData = {
        heim_club: testClubs[0].id,
        gast_club: testClubs[1].id,
        liga: testLiga.id,
        datum: new Date().toISOString(),
        status: 'geplant',
        spieltag: 1
      };

      const createdGame = await strapi.entityService.create('api::spiel.spiel', {
        data: gameData
      });

      // Try to update with invalid data
      const invalidUpdateData = {
        gast_club: testClubs[0].id, // Same as heim_club
        status: 'beendet'
        // Missing scores for completed game
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/spiel/validate-update/${createdGame.id}`)
        .send(invalidUpdateData)
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors.length).toBeGreaterThan(0);

      // Cleanup
      await strapi.entityService.delete('api::spiel.spiel', createdGame.id);
    });
  });

  describe('Validation Rules Endpoint', () => {
    test('should return validation rules and hints', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/spiel/validation-rules')
        .expect(200);

      expect(response.body.data).toHaveProperty('clubRules');
      expect(response.body.data).toHaveProperty('gameRules');
      expect(response.body.data).toHaveProperty('hints');

      expect(response.body.data.clubRules).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            rule: 'CLUB_REQUIRED',
            description: expect.any(String),
            severity: 'error'
          })
        ])
      );

      expect(response.body.data.hints).toEqual(
        expect.arrayContaining([
          expect.stringContaining('automatisch nach Liga gefiltert')
        ])
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle non-existent club validation gracefully', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/spiel/validate-club/99999/liga/99999')
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('nicht gefunden')
          })
        ])
      );
    });

    test('should handle malformed validation requests', async () => {
      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate-clubs')
        .send({
          heimClubId: 'invalid',
          gastClubId: null
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should handle API validation failures gracefully', async () => {
      // Test with invalid data that would cause API errors
      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate')
        .send({
          invalid_field: 'invalid_value'
        })
        .expect(200);

      // Should still return a response, even if validation fails
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Performance and Caching', () => {
    test('should handle multiple concurrent validation requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        request(strapi.server.httpServer)
          .get(`/api/spiel/validate-club/${testClubs[0].id}/liga/${testLiga.id}`)
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data.isValid).toBe(true);
      });
    });

    test('should validate complex game data efficiently', async () => {
      const complexGameData = {
        heim_club: testClubs[0].id,
        gast_club: testClubs[1].id,
        liga: testLiga.id,
        datum: new Date().toISOString(),
        status: 'beendet',
        spieltag: 1,
        heim_tore: 3,
        gast_tore: 2,
        notizen: 'Test game with complex validation'
      };

      const startTime = Date.now();
      
      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate')
        .send(complexGameData)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.data.isValid).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});

// Helper function to setup Strapi for testing
async function setupStrapi() {
  if (!strapi) {
    await require('../../../jest.setup');
  }
  return strapi;
}