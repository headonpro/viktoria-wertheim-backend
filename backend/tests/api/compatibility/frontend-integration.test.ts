/**
 * Frontend Integration Compatibility Tests
 * Tests specific scenarios that the frontend depends on
 */

import { setupStrapi, cleanupStrapi } from '../../helpers/strapi';
import request from 'supertest';

describe('Frontend Integration Tests', () => {
  let strapi: any;

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  describe('League Table Display', () => {
    let testData: any = {};

    beforeEach(async () => {
      // Create comprehensive test data for league table
      testData.liga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Bezirksliga',
          beschreibung: 'Test Liga für Frontend Integration'
        }
      });

      testData.saison = await strapi.entityService.create('api::saison.saison', {
        data: {
          name: '2024/25',
          start_datum: new Date('2024-08-01'),
          end_datum: new Date('2025-05-31'),
          aktiv: true
        }
      });

      // Create multiple teams for realistic table
      const teams = ['FC Viktoria', 'SV Wertheim', 'TSV Tauberbischofsheim'];
      testData.teams = [];
      
      for (const teamName of teams) {
        const team = await strapi.entityService.create('api::team.team', {
          data: {
            name: teamName,
            kurz_name: teamName.substring(0, 3).toUpperCase()
          }
        });
        testData.teams.push(team);
      }

      // Create table entries with different positions
      testData.entries = [];
      const tableData = [
        { platz: 1, spiele: 10, siege: 8, unentschieden: 1, niederlagen: 1, tore_fuer: 25, tore_gegen: 8, punkte: 25 },
        { platz: 2, spiele: 10, siege: 6, unentschieden: 2, niederlagen: 2, tore_fuer: 20, tore_gegen: 12, punkte: 20 },
        { platz: 3, spiele: 10, siege: 3, unentschieden: 1, niederlagen: 6, tore_fuer: 12, tore_gegen: 22, punkte: 10 }
      ];

      for (let i = 0; i < testData.teams.length; i++) {
        const entry = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
          data: {
            team_name: testData.teams[i].name,
            liga: testData.liga.id,
            team: testData.teams[i].id,
            ...tableData[i],
            tordifferenz: tableData[i].tore_fuer - tableData[i].tore_gegen
          }
        });
        testData.entries.push(entry);
      }
    });

    afterEach(async () => {
      // Cleanup in reverse order
      for (const entry of testData.entries || []) {
        await strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', entry.id);
      }
      for (const team of testData.teams || []) {
        await strapi.entityService.delete('api::team.team', team.id);
      }
      if (testData.saison) {
        await strapi.entityService.delete('api::saison.saison', testData.saison.id);
      }
      if (testData.liga) {
        await strapi.entityService.delete('api::liga.liga', testData.liga.id);
      }
      testData = {};
    });

    test('Frontend can fetch complete league table with all required data', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/tabellen-eintraege?filters[liga][id][$eq]=${testData.liga.id}&populate=team,liga&sort=platz:asc`)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      
      // Verify table is sorted by position
      expect(response.body.data[0].attributes.platz).toBe(1);
      expect(response.body.data[1].attributes.platz).toBe(2);
      expect(response.body.data[2].attributes.platz).toBe(3);

      // Verify all required fields are present for frontend display
      response.body.data.forEach((entry: any) => {
        const attrs = entry.attributes;
        expect(attrs).toHaveProperty('team_name');
        expect(attrs).toHaveProperty('platz');
        expect(attrs).toHaveProperty('spiele');
        expect(attrs).toHaveProperty('siege');
        expect(attrs).toHaveProperty('unentschieden');
        expect(attrs).toHaveProperty('niederlagen');
        expect(attrs).toHaveProperty('tore_fuer');
        expect(attrs).toHaveProperty('tore_gegen');
        expect(attrs).toHaveProperty('tordifferenz');
        expect(attrs).toHaveProperty('punkte');
        expect(attrs).toHaveProperty('team');
        expect(attrs).toHaveProperty('liga');
      });
    });

    test('Frontend can fetch table data during automation processing', async () => {
      // Simulate automation in progress by triggering calculation
      const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
      await queueManager.addCalculationJob(testData.liga.id, testData.saison.id, 'NORMAL');

      // Frontend should still be able to fetch data
      const response = await request(strapi.server.httpServer)
        .get(`/api/tabellen-eintraege?filters[liga][id][$eq]=${testData.liga.id}`)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      // Response should not be blocked by background processing
    });
  });

  describe('Game Results Display', () => {
    let testData: any = {};

    beforeEach(async () => {
      testData.liga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Bezirksliga',
          beschreibung: 'Test Liga für Spiel Tests'
        }
      });

      testData.saison = await strapi.entityService.create('api::saison.saison', {
        data: {
          name: '2024/25',
          start_datum: new Date('2024-08-01'),
          end_datum: new Date('2025-05-31'),
          aktiv: true
        }
      });

      testData.heimTeam = await strapi.entityService.create('api::team.team', {
        data: {
          name: 'FC Viktoria',
          kurz_name: 'FCV'
        }
      });

      testData.gastTeam = await strapi.entityService.create('api::team.team', {
        data: {
          name: 'SV Wertheim',
          kurz_name: 'SVW'
        }
      });

      // Create games with different statuses
      testData.games = [];
      const gameData = [
        { status: 'beendet', heim_tore: 2, gast_tore: 1, datum: new Date('2024-09-01T15:00:00Z') },
        { status: 'geplant', heim_tore: null, gast_tore: null, datum: new Date('2024-09-15T15:00:00Z') },
        { status: 'beendet', heim_tore: 0, gast_tore: 3, datum: new Date('2024-08-25T15:00:00Z') }
      ];

      for (let i = 0; i < gameData.length; i++) {
        const game = await strapi.entityService.create('api::spiel.spiel', {
          data: {
            datum: gameData[i].datum,
            liga: testData.liga.id,
            saison: testData.saison.id,
            heim_team: testData.heimTeam.id,
            gast_team: testData.gastTeam.id,
            heim_tore: gameData[i].heim_tore,
            gast_tore: gameData[i].gast_tore,
            spieltag: i + 1,
            status: gameData[i].status,
            notizen: `Test Spiel ${i + 1}`
          }
        });
        testData.games.push(game);
      }
    });

    afterEach(async () => {
      for (const game of testData.games || []) {
        await strapi.entityService.delete('api::spiel.spiel', game.id);
      }
      if (testData.gastTeam) {
        await strapi.entityService.delete('api::team.team', testData.gastTeam.id);
      }
      if (testData.heimTeam) {
        await strapi.entityService.delete('api::team.team', testData.heimTeam.id);
      }
      if (testData.saison) {
        await strapi.entityService.delete('api::saison.saison', testData.saison.id);
      }
      if (testData.liga) {
        await strapi.entityService.delete('api::liga.liga', testData.liga.id);
      }
      testData = {};
    });

    test('Frontend can fetch recent games with results', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/spiele?filters[liga][id][$eq]=${testData.liga.id}&filters[status][$eq]=beendet&populate=heim_team,gast_team&sort=datum:desc`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      
      // Verify games are sorted by date (newest first)
      const dates = response.body.data.map((game: any) => new Date(game.attributes.datum));
      expect(dates[0].getTime()).toBeGreaterThan(dates[1].getTime());

      // Verify all required fields for game display
      response.body.data.forEach((game: any) => {
        const attrs = game.attributes;
        expect(attrs).toHaveProperty('datum');
        expect(attrs).toHaveProperty('heim_tore');
        expect(attrs).toHaveProperty('gast_tore');
        expect(attrs).toHaveProperty('status');
        expect(attrs).toHaveProperty('heim_team');
        expect(attrs).toHaveProperty('gast_team');
        expect(attrs.status).toBe('beendet');
        expect(typeof attrs.heim_tore).toBe('number');
        expect(typeof attrs.gast_tore).toBe('number');
      });
    });

    test('Frontend can fetch upcoming games', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/spiele?filters[liga][id][$eq]=${testData.liga.id}&filters[status][$eq]=geplant&populate=heim_team,gast_team&sort=datum:asc`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      
      const game = response.body.data[0];
      expect(game.attributes.status).toBe('geplant');
      expect(game.attributes.heim_tore).toBeNull();
      expect(game.attributes.gast_tore).toBeNull();
      expect(game.attributes).toHaveProperty('heim_team');
      expect(game.attributes).toHaveProperty('gast_team');
    });

    test('Frontend can fetch games for specific team', async () => {
      const response = await request(strapi.server.httpServer)
        .get(`/api/spiele?filters[$or][0][heim_team][id][$eq]=${testData.heimTeam.id}&filters[$or][1][gast_team][id][$eq]=${testData.heimTeam.id}&populate=heim_team,gast_team`)
        .expect(200);

      expect(response.body.data).toHaveLength(3);
      
      // All games should involve the specified team
      response.body.data.forEach((game: any) => {
        const heimTeamId = game.attributes.heim_team.data.id;
        const gastTeamId = game.attributes.gast_team.data.id;
        expect(
          heimTeamId === testData.heimTeam.id || gastTeamId === testData.heimTeam.id
        ).toBe(true);
      });
    });
  });

  describe('Real-time Data Consistency', () => {
    test('Table data remains consistent during concurrent requests', async () => {
      // Create test data
      const liga = await strapi.entityService.create('api::liga.liga', {
        data: { name: 'Concurrent Test Liga' }
      });

      const team = await strapi.entityService.create('api::team.team', {
        data: { name: 'Test Team', kurz_name: 'TT' }
      });

      const entry = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
        data: {
          team_name: 'Test Team',
          liga: liga.id,
          team: team.id,
          platz: 1,
          spiele: 5,
          siege: 3,
          unentschieden: 1,
          niederlagen: 1,
          tore_fuer: 10,
          tore_gegen: 5,
          tordifferenz: 5,
          punkte: 10
        }
      });

      // Make multiple concurrent requests
      const requests = Array(5).fill(null).map(() =>
        request(strapi.server.httpServer)
          .get(`/api/tabellen-eintraege/${entry.id}`)
          .expect(200)
      );

      const responses = await Promise.all(requests);

      // All responses should be identical
      const firstResponse = responses[0].body;
      responses.forEach(response => {
        expect(response.body.data.attributes.punkte).toBe(firstResponse.data.attributes.punkte);
        expect(response.body.data.attributes.platz).toBe(firstResponse.data.attributes.platz);
      });

      // Cleanup
      await strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', entry.id);
      await strapi.entityService.delete('api::team.team', team.id);
      await strapi.entityService.delete('api::liga.liga', liga.id);
    });
  });

  describe('Error Handling for Frontend', () => {
    test('Invalid league ID returns proper error format', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege?filters[liga][id][$eq]=999999')
        .expect(200); // Should return empty data, not error

      expect(response.body.data).toHaveLength(0);
      expect(response.body).toHaveProperty('meta');
    });

    test('Malformed filter returns proper error', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege?filters[invalid_field][$eq]=test')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message');
    });

    test('Non-existent endpoint returns 404', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});