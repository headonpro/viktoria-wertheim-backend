/**
 * Test suite for Tabellen-Eintrag logo display functionality
 * Tests club logo population and fallback logic
 */

const request = require('supertest');

describe('Tabellen-Eintrag Logo Display', () => {
  let strapi;
  let testClub;
  let testTeam;
  let testLiga;

  beforeAll(async () => {
    strapi = global.strapi;
    
    // Create test data
    testLiga = await strapi.entityService.create('api::liga.liga', {
      data: {
        name: 'Test Liga',
        saison: 'Test Saison'
      }
    });

    testClub = await strapi.entityService.create('api::club.club', {
      data: {
        name: 'Test Club',
        club_typ: 'gegner_verein',
        aktiv: true
      }
    });

    testTeam = await strapi.entityService.create('api::team.team', {
      data: {
        name: 'Test Team'
      }
    });
  });

  afterAll(async () => {
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

  describe('Club Logo Display', () => {
    test('should display club logo when available', async () => {
      // Create entry with club relation
      const entry = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
        data: {
          team_name: testClub.name,
          liga: testLiga.id,
          club: testClub.id,
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

      // Test API response includes club data
      const response = await request(strapi.server.httpServer)
        .get(`/api/tabellen-eintraege/${entry.id}`)
        .expect(200);

      expect(response.body.data.club).toBeDefined();
      expect(response.body.data.team_name).toBe(testClub.name);
      expect(response.body.data.club_info).toBeDefined();
      expect(response.body.data.club_info.name).toBe(testClub.name);

      // Cleanup
      await strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', entry.id);
    });

    test('should fallback to team logo when club logo not available', async () => {
      // Create entry with team relation only
      const entry = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
        data: {
          team_name: testTeam.name,
          liga: testLiga.id,
          team: testTeam.id,
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

      // Test API response handles fallback
      const response = await request(strapi.server.httpServer)
        .get(`/api/tabellen-eintraege/${entry.id}`)
        .expect(200);

      expect(response.body.data.team).toBeDefined();
      expect(response.body.data.team_name).toBe(testTeam.name);
      expect(response.body.data.club).toBeNull();

      // Cleanup
      await strapi.entityService.delete('api::tabellen-eintrag.tabellen-eintrag', entry.id);
    });
  });

  describe('Service Methods', () => {
    test('should process entry data correctly', async () => {
      const service = strapi.service('api::tabellen-eintrag.tabellen-eintrag');
      
      const mockEntry = {
        id: 1,
        team_name: 'Old Name',
        club: {
          id: testClub.id,
          name: testClub.name,
          club_typ: 'gegner_verein'
        }
      };

      const processed = service.processEntryForClubData(mockEntry);
      
      expect(processed.team_name).toBe(testClub.name);
      expect(processed.club_metadata).toBeDefined();
      expect(processed.club_metadata.is_viktoria).toBe(false);
    });

    test('should handle logo fallback logic', async () => {
      const service = strapi.service('api::tabellen-eintrag.tabellen-eintrag');
      
      // Test with club logo
      const entryWithClubLogo = {
        club: {
          name: 'Test Club',
          logo: {
            id: 1,
            url: '/uploads/club-logo.png',
            alternativeText: 'Club Logo'
          }
        }
      };

      const logoWithClub = service.getEntryLogo(entryWithClubLogo);
      expect(logoWithClub.source).toBe('club');
      expect(logoWithClub.url).toBe('/uploads/club-logo.png');

      // Test with team logo fallback
      const entryWithTeamLogo = {
        team: {
          name: 'Test Team',
          logo: {
            id: 2,
            url: '/uploads/team-logo.png'
          }
        }
      };

      const logoWithTeam = service.getEntryLogo(entryWithTeamLogo);
      expect(logoWithTeam.source).toBe('team');
      expect(logoWithTeam.url).toBe('/uploads/team-logo.png');

      // Test with no logo
      const entryWithoutLogo = {
        team_name: 'No Logo Team'
      };

      const noLogo = service.getEntryLogo(entryWithoutLogo);
      expect(noLogo).toBeNull();
    });
  });

  describe('API Population', () => {
    test('should populate club relations in find endpoint', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege')
        .expect(200);

      // Check that response structure includes club population
      if (response.body.data.length > 0) {
        const entry = response.body.data[0];
        expect(entry).toHaveProperty('club');
        expect(entry).toHaveProperty('team');
        expect(entry).toHaveProperty('liga');
      }
    });

    test('should handle empty results gracefully', async () => {
      const response = await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege?filters[id][$eq]=999999')
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.meta).toBeDefined();
    });
  });
});