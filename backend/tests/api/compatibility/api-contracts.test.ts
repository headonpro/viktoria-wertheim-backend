/**
 * API Compatibility Tests
 * Ensures existing API contracts remain unchanged for frontend integration
 */

import { setupStrapi, cleanupStrapi } from '../../helpers/strapi';
import request from 'supertest';

describe('API Compatibility Tests', () => {
  let strapi: any;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  describe('/api/tabellen-eintraege endpoints', () => {
    let testLiga: any;
    let testSaison: any;
    let testTeam: any;
    let testTabellenEintrag: any;

    beforeEach(async () => {
      // Create test data
      testLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Test Liga',
          beschreibung: 'Test Liga für API Tests'
        }
      });

      testSaison = await strapi.entityService.create('api::saison.saison', {
        data: {
          name: '2024/25',
          start_datum: new Date('2024-08-01'),
          end_datum: new Date('2025-05-31'),
          aktiv: true
        }
      });

      testTeam = await strapi.entityService.create('api::team.team', {
        data: {
          name: 'Test Team',
          kurz_name: 'TT'
        }
      });

      testTabellenEintrag = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
        data: {
          team_name: 'Test Team',
          liga: testLiga.id,
          team: testTeam.id,
          platz: 1,
          spiele: 10,
          siege: 7,
          unentschieden: 2,
          niederlagen: 1,
          tore_fuer: 25,
          tore_gegen: 8,
          tordifferenz: 17,
          punkte: 23
        }
      });
    });

    afterEach(async () => {
      // Cleanup test data
      if (testTabellenEintrag) {
        await strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', testTabellenEintrag.id);
      }
      if (testTeam) {
        await strapi.entityService.delete('api::team.team', testTeam.id);
      }
      if (testSaison) {
        await strapi.entityService.delete('api::saison.saison', testSaison.id);
      }
      if (testLiga) {
        await strapi.entityService.delete('api::liga.liga', testLiga.id);
      }
    });

    test('GET /api/tabellen-eintraege should return expected data format', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const entry = response.body.data[0];
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('attributes');
        
        const attributes = entry.attributes;
        expect(attributes).toHaveProperty('team_name');
        expect(attributes).toHaveProperty('platz');
        expect(attributes).toHaveProperty('spiele');
        expect(attributes).toHaveProperty('siege');
        expect(attributes).toHaveProperty('unentschieden');
        expect(attributes).toHaveProperty('niederlagen');
        expect(attributes).toHaveProperty('tore_fuer');
        expect(attributes).toHaveProperty('tore_gegen');
        expect(attributes).toHaveProperty('tordifferenz');
        expect(attributes).toHaveProperty('punkte');
      }
    });

    test('GET /api/tabellen-eintraege/:id should return single entry format', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/tabellen-eintraege/${testTabellenEintrag.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('attributes');

      const attributes = response.body.data.attributes;
      expect(attributes.team_name).toBe('Test Team');
      expect(attributes.platz).toBe(1);
      expect(attributes.spiele).toBe(10);
      expect(attributes.siege).toBe(7);
      expect(attributes.punkte).toBe(23);
    });

    test('GET /api/tabellen-eintraege with filters should work', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/tabellen-eintraege?filters[liga][id][$eq]=${testLiga.id}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].attributes.team_name).toBe('Test Team');
    });

    test('GET /api/tabellen-eintraege with populate should include relations', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege?populate=liga,team')
        .expect(200);

      if (response.body.data.length > 0) {
        const entry = response.body.data[0];
        expect(entry.attributes).toHaveProperty('liga');
        expect(entry.attributes).toHaveProperty('team');
      }
    });

    test('GET /api/tabellen-eintraege with sort should work', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege?sort=platz:asc')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Should not throw error and return valid format
    });

    test('GET /api/tabellen-eintraege with pagination should work', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege?pagination[page]=1&pagination[pageSize]=10')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('pagination');
    });
  });

  describe('/api/spiele endpoints', () => {
    let testLiga: any;
    let testSaison: any;
    let testHeimTeam: any;
    let testGastTeam: any;
    let testSpiel: any;

    beforeEach(async () => {
      // Create test data
      testLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Test Liga',
          beschreibung: 'Test Liga für API Tests'
        }
      });

      testSaison = await strapi.entityService.create('api::saison.saison', {
        data: {
          name: '2024/25',
          start_datum: new Date('2024-08-01'),
          end_datum: new Date('2025-05-31'),
          aktiv: true
        }
      });

      testHeimTeam = await strapi.entityService.create('api::team.team', {
        data: {
          name: 'Heim Team',
          kurz_name: 'HT'
        }
      });

      testGastTeam = await strapi.entityService.create('api::team.team', {
        data: {
          name: 'Gast Team',
          kurz_name: 'GT'
        }
      });

      testSpiel = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date('2024-09-15T15:00:00Z'),
          liga: testLiga.id,
          saison: testSaison.id,
          heim_team: testHeimTeam.id,
          gast_team: testGastTeam.id,
          heim_tore: 2,
          gast_tore: 1,
          spieltag: 5,
          status: 'beendet',
          notizen: 'Test Spiel'
        }
      });
    });

    afterEach(async () => {
      // Cleanup test data
      if (testSpiel) {
        await strapi.entityService.delete('api::spiel.spiel', testSpiel.id);
      }
      if (testGastTeam) {
        await strapi.entityService.delete('api::team.team', testGastTeam.id);
      }
      if (testHeimTeam) {
        await strapi.entityService.delete('api::team.team', testHeimTeam.id);
      }
      if (testSaison) {
        await strapi.entityService.delete('api::saison.saison', testSaison.id);
      }
      if (testLiga) {
        await strapi.entityService.delete('api::liga.liga', testLiga.id);
      }
    });

    test('GET /api/spiele should return expected data format', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/spiele')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        const spiel = response.body.data[0];
        expect(spiel).toHaveProperty('id');
        expect(spiel).toHaveProperty('attributes');
        
        const attributes = spiel.attributes;
        expect(attributes).toHaveProperty('datum');
        expect(attributes).toHaveProperty('heim_tore');
        expect(attributes).toHaveProperty('gast_tore');
        expect(attributes).toHaveProperty('spieltag');
        expect(attributes).toHaveProperty('status');
      }
    });

    test('GET /api/spiele/:id should return single game format', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/spiele/${testSpiel.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('attributes');

      const attributes = response.body.data.attributes;
      expect(attributes.heim_tore).toBe(2);
      expect(attributes.gast_tore).toBe(1);
      expect(attributes.spieltag).toBe(5);
      expect(attributes.status).toBe('beendet');
    });

    test('GET /api/spiele with filters should work', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/spiele?filters[liga][id][$eq]=${testLiga.id}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].attributes.spieltag).toBe(5);
    });

    test('GET /api/spiele with populate should include relations', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/spiele?populate=liga,saison,heim_team,gast_team')
        .expect(200);

      if (response.body.data.length > 0) {
        const spiel = response.body.data[0];
        expect(spiel.attributes).toHaveProperty('liga');
        expect(spiel.attributes).toHaveProperty('saison');
        expect(spiel.attributes).toHaveProperty('heim_team');
        expect(spiel.attributes).toHaveProperty('gast_team');
      }
    });

    test('GET /api/spiele with status filter should work', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/spiele?filters[status][$eq]=beendet')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Should not throw error and return valid format
    });

    test('GET /api/spiele with date sorting should work', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/spiele?sort=datum:desc')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      // Should not throw error and return valid format
    });
  });

  describe('API Response Format Consistency', () => {
    test('All endpoints should return consistent error format', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege/999999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('status');
      expect(response.body.error).toHaveProperty('name');
      expect(response.body.error).toHaveProperty('message');
    });

    test('All endpoints should handle malformed requests gracefully', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege?filters[invalid')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Performance and Response Time', () => {
    test('GET /api/tabellen-eintraege should respond within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });

    test('GET /api/spiele should respond within acceptable time', async () => {
      const startTime = Date.now();
      
      await request(strapi.server.httpServer)
        .get('/api/spiele')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(5000); // 5 seconds max
    });
  });
});