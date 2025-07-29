/**
 * Tests for enhanced game creation interface
 * Verifies club selection dropdowns, league-based filtering, autocomplete, and validation feedback
 */

const request = require('supertest');

describe('Enhanced Game Creation Interface', () => {
  let strapi;
  let adminUser;
  let authToken;
  let testLiga;
  let testSaison;
  let testClubs;

  beforeAll(async () => {
    strapi = await setupStrapi();
    
    // Create admin user and get auth token
    adminUser = await createAdminUser();
    authToken = await getAuthToken(adminUser);
    
    // Create test data
    testLiga = await createTestLiga();
    testSaison = await createTestSaison();
    testClubs = await createTestClubs(testLiga);
  });

  afterAll(async () => {
    await cleanupTestData();
    await strapi.destroy();
  });

  describe('Club Selection Dropdowns', () => {
    test('should load clubs filtered by league', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/clubs?populate=*&sort=name:asc&filters[aktiv][$eq]=true&filters[ligen][id][$eq]=${testLiga.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(testClubs.length);
      expect(response.body.data[0]).toHaveProperty('name');
      expect(response.body.data[0]).toHaveProperty('ligen');
      expect(response.body.data[0].ligen.some(liga => liga.id === testLiga.id)).toBe(true);
    });

    test('should exclude inactive clubs from selection', async () => {
      // Create inactive club
      const inactiveClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Inactive Test Club',
          club_typ: 'gegner_verein',
          aktiv: false,
          ligen: [testLiga.id]
        }
      });

      const response = await request(strapi.server.httpServer)
        .get(`/api/clubs?populate=*&sort=name:asc&filters[aktiv][$eq]=true&filters[ligen][id][$eq]=${testLiga.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const clubNames = response.body.data.map(club => club.name);
      expect(clubNames).not.toContain('Inactive Test Club');

      // Cleanup
      await strapi.entityService.delete('api::club.club', inactiveClub.id);
    });

    test('should prevent selecting same club for both teams', async () => {
      const gameData = {
        datum: new Date().toISOString(),
        liga: testLiga.id,
        saison: testSaison.id,
        spieltag: 1,
        heim_club: testClubs[0].id,
        gast_club: testClubs[0].id, // Same club
        status: 'geplant'
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameData)
        .expect(400);

      expect(response.body.data.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('gegen sich selbst')
        })
      );
    });
  });

  describe('League-based Filtering', () => {
    test('should filter clubs by selected league', async () => {
      // Create club in different league
      const otherLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Other Test Liga',
          saison: testSaison.id
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

      // Request clubs for original league
      const response = await request(strapi.server.httpServer)
        .get(`/api/clubs?populate=*&sort=name:asc&filters[aktiv][$eq]=true&filters[ligen][id][$eq]=${testLiga.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const clubNames = response.body.data.map(club => club.name);
      expect(clubNames).not.toContain('Other Liga Club');

      // Cleanup
      await strapi.entityService.delete('api::club.club', otherClub.id);
      await strapi.entityService.delete('api::liga.liga', otherLiga.id);
    });

    test('should show all clubs when no league is selected', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/clubs?populate=*&sort=name:asc&filters[aktiv][$eq]=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(testClubs.length);
    });

    test('should validate clubs are in same league', async () => {
      // Create clubs in different leagues
      const liga1 = await strapi.entityService.create('api::liga.liga', {
        data: { name: 'Liga 1', saison: testSaison.id }
      });
      
      const liga2 = await strapi.entityService.create('api::liga.liga', {
        data: { name: 'Liga 2', saison: testSaison.id }
      });

      const club1 = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Club Liga 1',
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [liga1.id]
        }
      });

      const club2 = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Club Liga 2',
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [liga2.id]
        }
      });

      const gameData = {
        datum: new Date().toISOString(),
        liga: liga1.id,
        saison: testSaison.id,
        spieltag: 1,
        heim_club: club1.id,
        gast_club: club2.id, // Different league
        status: 'geplant'
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameData)
        .expect(400);

      expect(response.body.data.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('nicht in dieser Liga')
        })
      );

      // Cleanup
      await strapi.entityService.delete('api::club.club', club1.id);
      await strapi.entityService.delete('api::club.club', club2.id);
      await strapi.entityService.delete('api::liga.liga', liga1.id);
      await strapi.entityService.delete('api::liga.liga', liga2.id);
    });
  });

  describe('Autocomplete Functionality', () => {
    test('should search clubs by name', async () => {
      const searchTerm = testClubs[0].name.substring(0, 3);
      
      const response = await request(strapi.server.httpServer)
        .get(`/api/clubs?populate=*&sort=name:asc&filters[aktiv][$eq]=true&filters[name][$containsi]=${searchTerm}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].name.toLowerCase()).toContain(searchTerm.toLowerCase());
    });

    test('should search clubs by short name', async () => {
      // Create club with short name
      const clubWithShortName = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Test Club with Short Name',
          kurz_name: 'TCWSN',
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [testLiga.id]
        }
      });

      const response = await request(strapi.server.httpServer)
        .get(`/api/clubs?populate=*&sort=name:asc&filters[aktiv][$eq]=true&filters[kurz_name][$containsi]=TCWSN`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].kurz_name).toBe('TCWSN');

      // Cleanup
      await strapi.entityService.delete('api::club.club', clubWithShortName.id);
    });

    test('should handle empty search results gracefully', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/clubs?populate=*&sort=name:asc&filters[aktiv][$eq]=true&filters[name][$containsi]=NonexistentClub')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('Validation Feedback', () => {
    test('should provide real-time validation for club selection', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/spiel/validate-club/${testClubs[0].id}/liga/${testLiga.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data.isValid).toBe(true);
    });

    test('should validate club exists and is active', async () => {
      const nonExistentClubId = 99999;
      
      const response = await request(strapi.server.httpServer)
        .get(`/api/spiel/validate-club/${nonExistentClubId}/liga/${testLiga.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.data.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('nicht gefunden')
        })
      );
    });

    test('should validate club match compatibility', async () => {
      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate-clubs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          heimClubId: testClubs[0].id,
          gastClubId: testClubs[1].id,
          ligaId: testLiga.id
        })
        .expect(200);

      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data.isValid).toBe(true);
    });

    test('should provide validation warnings for special cases', async () => {
      // Create two Viktoria clubs with same team mapping
      const viktoriaClub1 = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'SV Viktoria Test 1',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1',
          aktiv: true,
          ligen: [testLiga.id]
        }
      });

      const viktoriaClub2 = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'SV Viktoria Test 2',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1', // Same mapping
          aktiv: true,
          ligen: [testLiga.id]
        }
      });

      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate-clubs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          heimClubId: viktoriaClub1.id,
          gastClubId: viktoriaClub2.id,
          ligaId: testLiga.id
        })
        .expect(400);

      expect(response.body.data.errors).toContainEqual(
        expect.objectContaining({
          message: expect.stringContaining('Team-Zuordnung')
        })
      );

      // Cleanup
      await strapi.entityService.delete('api::club.club', viktoriaClub1.id);
      await strapi.entityService.delete('api::club.club', viktoriaClub2.id);
    });

    test('should get validation rules for admin panel', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/spiel/validation-rules')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('clubRules');
      expect(response.body.data).toHaveProperty('gameRules');
      expect(response.body.data).toHaveProperty('hints');
      expect(response.body.data.clubRules).toBeInstanceOf(Array);
      expect(response.body.data.gameRules).toBeInstanceOf(Array);
      expect(response.body.data.hints).toBeInstanceOf(Array);
    });
  });

  describe('Form Integration', () => {
    test('should create game with club selection', async () => {
      const gameData = {
        datum: new Date().toISOString(),
        liga: testLiga.id,
        saison: testSaison.id,
        spieltag: 1,
        heim_club: testClubs[0].id,
        gast_club: testClubs[1].id,
        status: 'geplant'
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/spiels')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: gameData })
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.heim_club).toBe(testClubs[0].id);
      expect(response.body.data.gast_club).toBe(testClubs[1].id);

      // Cleanup
      await strapi.entityService.delete('api::spiel.spiel', response.body.data.id);
    });

    test('should update game with club selection', async () => {
      // Create initial game
      const initialGame = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date().toISOString(),
          liga: testLiga.id,
          saison: testSaison.id,
          spieltag: 1,
          heim_club: testClubs[0].id,
          gast_club: testClubs[1].id,
          status: 'geplant'
        }
      });

      // Update with different clubs
      const updateData = {
        heim_club: testClubs[1].id,
        gast_club: testClubs[2].id
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/spiels/${initialGame.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ data: updateData })
        .expect(200);

      expect(response.body.data.heim_club).toBe(testClubs[1].id);
      expect(response.body.data.gast_club).toBe(testClubs[2].id);

      // Cleanup
      await strapi.entityService.delete('api::spiel.spiel', initialGame.id);
    });

    test('should validate game creation data', async () => {
      const gameData = {
        datum: new Date().toISOString(),
        liga: testLiga.id,
        saison: testSaison.id,
        spieltag: 1,
        heim_club: testClubs[0].id,
        gast_club: testClubs[1].id,
        status: 'geplant'
      };

      const response = await request(strapi.server.httpServer)
        .post('/api/spiel/validate-creation')
        .set('Authorization', `Bearer ${authToken}`)
        .send(gameData)
        .expect(200);

      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data.isValid).toBe(true);
      expect(response.body.data).toHaveProperty('summary');
    });

    test('should validate game update data', async () => {
      // Create initial game
      const initialGame = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date().toISOString(),
          liga: testLiga.id,
          saison: testSaison.id,
          spieltag: 1,
          heim_club: testClubs[0].id,
          gast_club: testClubs[1].id,
          status: 'geplant'
        }
      });

      const updateData = {
        heim_club: testClubs[1].id,
        gast_club: testClubs[2].id,
        status: 'beendet',
        heim_tore: 2,
        gast_tore: 1
      };

      const response = await request(strapi.server.httpServer)
        .put(`/api/spiel/validate-update/${initialGame.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data).toHaveProperty('isValid');
      expect(response.body.data.isValid).toBe(true);

      // Cleanup
      await strapi.entityService.delete('api::spiel.spiel', initialGame.id);
    });
  });

  // Helper functions
  async function setupStrapi() {
    return require('../../../jest.e2e.config').setupStrapi();
  }

  async function createAdminUser() {
    return strapi.admin.services.user.create({
      email: 'admin@test.com',
      password: 'password123',
      firstname: 'Admin',
      lastname: 'User',
      isActive: true
    });
  }

  async function getAuthToken(user) {
    const response = await request(strapi.server.httpServer)
      .post('/admin/login')
      .send({
        email: user.email,
        password: 'password123'
      });
    
    return response.body.data.token;
  }

  async function createTestLiga() {
    return strapi.entityService.create('api::liga.liga', {
      data: {
        name: 'Test Liga Enhanced Form'
      }
    });
  }

  async function createTestSaison() {
    return strapi.entityService.create('api::saison.saison', {
      data: {
        jahr: 2024
      }
    });
  }

  async function createTestClubs(liga) {
    const clubs = [];
    
    for (let i = 1; i <= 5; i++) {
      const club = await strapi.entityService.create('api::club.club', {
        data: {
          name: `Test Club ${i}`,
          kurz_name: `TC${i}`,
          club_typ: 'gegner_verein',
          aktiv: true,
          ligen: [liga.id]
        }
      });
      clubs.push(club);
    }
    
    return clubs;
  }

  async function cleanupTestData() {
    // Clean up in reverse order due to relationships
    await strapi.db.query('api::spiel.spiel').deleteMany({
      where: { liga: testLiga.id }
    });
    
    for (const club of testClubs) {
      await strapi.entityService.delete('api::club.club', club.id);
    }
    
    await strapi.entityService.delete('api::liga.liga', testLiga.id);
    await strapi.entityService.delete('api::saison.saison', testSaison.id);
    await strapi.entityService.delete('admin::user.user', adminUser.id);
  }
});