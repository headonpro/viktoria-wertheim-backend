/**
 * Complete End-to-End Club Workflow Tests
 * Tests the complete workflow from game entry to table display with club data
 */

// Jest globals are available globally, no need to import
import request from 'supertest';
import { setupStrapi, cleanupStrapi } from '../helpers/strapi';

describe('Complete Club Workflow E2E Tests', () => {
  let strapi: any;
  let testData: any = {};

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    // Setup test data
    testData = await setupTestData(strapi);
  });

  afterEach(async () => {
    await cleanupTestData(strapi, testData);
  });

  describe('Complete Game Entry to Table Display Workflow', () => {
    it('should complete full workflow: create clubs → create game → auto-calculate table → display results', async () => {
      // Step 1: Create clubs for the league
      const heimClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'SV Viktoria Wertheim',
          kurz_name: 'SV VIK',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1',
          ligen: [testData.liga.id],
          aktiv: true
        }
      });

      const gastClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'VfR Gerlachsheim',
          kurz_name: 'VfR GER',
          club_typ: 'gegner_verein',
          ligen: [testData.liga.id],
          aktiv: true
        }
      });

      expect(heimClub.name).toBe('SV Viktoria Wertheim');
      expect(gastClub.name).toBe('VfR Gerlachsheim');

      // Step 2: Create a game between the clubs
      const game = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date('2024-03-15T15:00:00Z'),
          liga: testData.liga.id,
          saison: testData.saison.id,
          spieltag: 15,
          heim_club: heimClub.id,
          gast_club: gastClub.id,
          heim_tore: 2,
          gast_tore: 1,
          status: 'beendet'
        }
      });

      expect(game.heim_club).toBe(heimClub.id);
      expect(game.gast_club).toBe(gastClub.id);
      expect(game.status).toBe('beendet');

      // Step 3: Wait for automatic table calculation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 4: Verify table entries were created with club data
      const tableEntries = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          liga: testData.liga.id,
          saison: testData.saison.id
        },
        populate: ['club', 'liga', 'saison']
      });

      expect(tableEntries.length).toBeGreaterThanOrEqual(2);

      // Find Viktoria entry
      const viktoriaEntry = tableEntries.find(entry => 
        entry.club && entry.club.name === 'SV Viktoria Wertheim'
      );
      expect(viktoriaEntry).toBeDefined();
      expect(viktoriaEntry.team_name).toBe('SV Viktoria Wertheim');
      expect(viktoriaEntry.punkte).toBe(3); // Win = 3 points
      expect(viktoriaEntry.siege).toBe(1);
      expect(viktoriaEntry.tore_fuer).toBe(2);
      expect(viktoriaEntry.tore_gegen).toBe(1);

      // Find Gerlachsheim entry
      const gerlachsheimEntry = tableEntries.find(entry => 
        entry.club && entry.club.name === 'VfR Gerlachsheim'
      );
      expect(gerlachsheimEntry).toBeDefined();
      expect(gerlachsheimEntry.team_name).toBe('VfR Gerlachsheim');
      expect(gerlachsheimEntry.punkte).toBe(0); // Loss = 0 points
      expect(gerlachsheimEntry.niederlagen).toBe(1);

      // Step 5: Test API endpoint for frontend consumption
      const response = await request(strapi.server.httpServer)
        .get(`/api/tabellen-eintraege?filters[liga][id]=${testData.liga.id}&populate=club,liga`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      const apiViktoriaEntry = response.body.data.find((entry: any) => 
        entry.attributes.club?.data?.attributes?.name === 'SV Viktoria Wertheim'
      );
      expect(apiViktoriaEntry).toBeDefined();
      expect(apiViktoriaEntry.attributes.team_name).toBe('SV Viktoria Wertheim');
    });

    it('should handle game result corrections and recalculate table', async () => {
      // Create initial game and clubs
      const heimClub = await createTestClub(strapi, 'FC Test Heim', testData.liga.id);
      const gastClub = await createTestClub(strapi, 'FC Test Gast', testData.liga.id);

      const game = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date('2024-03-15T15:00:00Z'),
          liga: testData.liga.id,
          saison: testData.saison.id,
          spieltag: 15,
          heim_club: heimClub.id,
          gast_club: gastClub.id,
          heim_tore: 1,
          gast_tore: 0,
          status: 'beendet'
        }
      });

      // Wait for initial calculation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify initial table state
      let tableEntries = await getTableEntries(strapi, testData.liga.id, testData.saison.id);
      let heimEntry = tableEntries.find(e => e.club?.name === 'FC Test Heim');
      expect(heimEntry?.punkte).toBe(3);

      // Correct the game result
      await strapi.entityService.update('api::spiel.spiel', game.id, {
        data: {
          heim_tore: 0,
          gast_tore: 2
        }
      });

      // Wait for recalculation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify corrected table state
      tableEntries = await getTableEntries(strapi, testData.liga.id, testData.saison.id);
      heimEntry = tableEntries.find(e => e.club?.name === 'FC Test Heim');
      const gastEntry = tableEntries.find(e => e.club?.name === 'FC Test Gast');

      expect(heimEntry?.punkte).toBe(0); // Now a loss
      expect(gastEntry?.punkte).toBe(3); // Now a win
    });

    it('should handle multiple games and complex table calculations', async () => {
      // Create multiple clubs
      const clubs = await Promise.all([
        createTestClub(strapi, 'FC Alpha', testData.liga.id),
        createTestClub(strapi, 'FC Beta', testData.liga.id),
        createTestClub(strapi, 'FC Gamma', testData.liga.id),
        createTestClub(strapi, 'FC Delta', testData.liga.id)
      ]);

      // Create multiple games
      const games = [
        { heim: clubs[0], gast: clubs[1], heim_tore: 2, gast_tore: 1 }, // Alpha wins
        { heim: clubs[1], gast: clubs[2], heim_tore: 1, gast_tore: 1 }, // Draw
        { heim: clubs[2], gast: clubs[3], heim_tore: 0, gast_tore: 3 }, // Delta wins
        { heim: clubs[3], gast: clubs[0], heim_tore: 1, gast_tore: 2 }  // Alpha wins
      ];

      for (let i = 0; i < games.length; i++) {
        await strapi.entityService.create('api::spiel.spiel', {
          data: {
            datum: new Date(`2024-03-${15 + i}T15:00:00Z`),
            liga: testData.liga.id,
            saison: testData.saison.id,
            spieltag: 15 + i,
            heim_club: games[i].heim.id,
            gast_club: games[i].gast.id,
            heim_tore: games[i].heim_tore,
            gast_tore: games[i].gast_tore,
            status: 'beendet'
          }
        });
      }

      // Wait for all calculations
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify complex table calculations
      const tableEntries = await getTableEntries(strapi, testData.liga.id, testData.saison.id);
      
      const alphaEntry = tableEntries.find(e => e.club?.name === 'FC Alpha');
      const betaEntry = tableEntries.find(e => e.club?.name === 'FC Beta');
      const gammaEntry = tableEntries.find(e => e.club?.name === 'FC Gamma');
      const deltaEntry = tableEntries.find(e => e.club?.name === 'FC Delta');

      // Alpha: 2 wins = 6 points
      expect(alphaEntry?.punkte).toBe(6);
      expect(alphaEntry?.siege).toBe(2);

      // Beta: 1 draw, 1 loss = 1 point
      expect(betaEntry?.punkte).toBe(1);
      expect(betaEntry?.unentschieden).toBe(1);

      // Gamma: 1 draw, 1 loss = 1 point
      expect(gammaEntry?.punkte).toBe(1);
      expect(gammaEntry?.unentschieden).toBe(1);

      // Delta: 1 win, 1 loss = 3 points
      expect(deltaEntry?.punkte).toBe(3);
      expect(deltaEntry?.siege).toBe(1);

      // Verify table sorting (Alpha should be first with 6 points)
      const sortedEntries = tableEntries.sort((a, b) => b.punkte - a.punkte);
      expect(sortedEntries[0].club?.name).toBe('FC Alpha');
    });
  });

  describe('Frontend Integration with Club Data', () => {
    it('should provide correct API responses for frontend league service', async () => {
      // Create Viktoria club with team mapping
      const viktoriaClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'SV Viktoria Wertheim',
          kurz_name: 'SV VIK',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1',
          ligen: [testData.liga.id],
          aktiv: true
        }
      });

      // Create opponent club
      const opponentClub = await createTestClub(strapi, 'FC Opponent', testData.liga.id);

      // Create game
      await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date('2024-03-15T15:00:00Z'),
          liga: testData.liga.id,
          saison: testData.saison.id,
          spieltag: 15,
          heim_club: viktoriaClub.id,
          gast_club: opponentClub.id,
          heim_tore: 3,
          gast_tore: 1,
          status: 'beendet'
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test API endpoint that frontend would use
      const response = await request(strapi.server.httpServer)
        .get(`/api/tabellen-eintraege?filters[liga][id]=${testData.liga.id}&populate=club,club.logo,liga&sort=punkte:desc,tordifferenz:desc,tore_fuer:desc,team_name:asc`)
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);

      // Verify Viktoria entry has correct club data
      const viktoriaEntry = response.body.data.find((entry: any) => 
        entry.attributes.club?.data?.attributes?.name === 'SV Viktoria Wertheim'
      );

      expect(viktoriaEntry).toBeDefined();
      expect(viktoriaEntry.attributes.team_name).toBe('SV Viktoria Wertheim');
      expect(viktoriaEntry.attributes.club.data.attributes.viktoria_team_mapping).toBe('team_1');
      expect(viktoriaEntry.attributes.punkte).toBe(3);

      // Test games API for frontend
      const gamesResponse = await request(strapi.server.httpServer)
        .get(`/api/spiele?filters[liga][id]=${testData.liga.id}&populate=heim_club,gast_club,liga`)
        .expect(200);

      expect(gamesResponse.body.data).toBeDefined();
      expect(gamesResponse.body.data.length).toBeGreaterThanOrEqual(1);

      const gameEntry = gamesResponse.body.data[0];
      expect(gameEntry.attributes.heim_club.data.attributes.name).toBe('SV Viktoria Wertheim');
      expect(gameEntry.attributes.gast_club.data.attributes.name).toBe('FC Opponent');
    });

    it('should support team-based navigation with club data mapping', async () => {
      // Create all three Viktoria teams
      const viktoriaClubs = await Promise.all([
        strapi.entityService.create('api::club.club', {
          data: {
            name: 'SV Viktoria Wertheim',
            kurz_name: 'SV VIK',
            club_typ: 'viktoria_verein',
            viktoria_team_mapping: 'team_1',
            ligen: [testData.liga.id],
            aktiv: true
          }
        }),
        strapi.entityService.create('api::club.club', {
          data: {
            name: 'SV Viktoria Wertheim II',
            kurz_name: 'SV VIK II',
            club_typ: 'viktoria_verein',
            viktoria_team_mapping: 'team_2',
            ligen: [testData.liga.id],
            aktiv: true
          }
        }),
        strapi.entityService.create('api::club.club', {
          data: {
            name: 'SpG Vikt. Wertheim 3/Grünenwort',
            kurz_name: 'SpG VIK 3',
            club_typ: 'viktoria_verein',
            viktoria_team_mapping: 'team_3',
            ligen: [testData.liga.id],
            aktiv: true
          }
        })
      ]);

      // Test API endpoint for team-based queries
      for (let i = 0; i < viktoriaClubs.length; i++) {
        const teamMapping = `team_${i + 1}`;
        
        const response = await request(strapi.server.httpServer)
          .get(`/api/clubs?filters[viktoria_team_mapping]=${teamMapping}&populate=ligen`)
          .expect(200);

        expect(response.body.data).toBeDefined();
        expect(response.body.data.length).toBe(1);
        expect(response.body.data[0].attributes.viktoria_team_mapping).toBe(teamMapping);
      }
    });
  });

  describe('Admin Panel Club Management Workflows', () => {
    it('should support complete club CRUD operations', async () => {
      // Create club
      const createResponse = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .send({
          data: {
            name: 'FC Test Club',
            kurz_name: 'FC TEST',
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true,
            gruendungsjahr: 1950,
            vereinsfarben: 'Rot-Weiß'
          }
        })
        .expect(200);

      const clubId = createResponse.body.data.id;
      expect(createResponse.body.data.attributes.name).toBe('FC Test Club');

      // Read club
      const readResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs/${clubId}?populate=ligen`)
        .expect(200);

      expect(readResponse.body.data.attributes.name).toBe('FC Test Club');
      expect(readResponse.body.data.attributes.ligen.data.length).toBe(1);

      // Update club
      const updateResponse = await request(strapi.server.httpServer)
        .put(`/api/clubs/${clubId}`)
        .send({
          data: {
            kurz_name: 'FC UPDATED',
            vereinsfarben: 'Blau-Gelb'
          }
        })
        .expect(200);

      expect(updateResponse.body.data.attributes.kurz_name).toBe('FC UPDATED');
      expect(updateResponse.body.data.attributes.vereinsfarben).toBe('Blau-Gelb');

      // Delete club
      await request(strapi.server.httpServer)
        .delete(`/api/clubs/${clubId}`)
        .expect(200);

      // Verify deletion
      await request(strapi.server.httpServer)
        .get(`/api/clubs/${clubId}`)
        .expect(404);
    });

    it('should validate club data in admin operations', async () => {
      // Test duplicate name validation
      await strapi.entityService.create('api::club.club', {
        data: {
          name: 'FC Duplicate Test',
          club_typ: 'gegner_verein',
          ligen: [testData.liga.id],
          aktiv: true
        }
      });

      // Try to create another club with same name
      const duplicateResponse = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .send({
          data: {
            name: 'FC Duplicate Test',
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true
          }
        })
        .expect(400);

      expect(duplicateResponse.body.error).toBeDefined();

      // Test viktoria team mapping validation
      const invalidViktoriaResponse = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .send({
          data: {
            name: 'FC Invalid Viktoria',
            club_typ: 'viktoria_verein',
            // Missing viktoria_team_mapping
            ligen: [testData.liga.id],
            aktiv: true
          }
        })
        .expect(400);

      expect(invalidViktoriaResponse.body.error).toBeDefined();
    });

    it('should support bulk club operations', async () => {
      // Create multiple clubs
      const clubsData = [
        { name: 'FC Bulk 1', kurz_name: 'FCB1' },
        { name: 'FC Bulk 2', kurz_name: 'FCB2' },
        { name: 'FC Bulk 3', kurz_name: 'FCB3' }
      ];

      const createdClubs = [];
      for (const clubData of clubsData) {
        const response = await request(strapi.server.httpServer)
          .post('/api/clubs')
          .send({
            data: {
              ...clubData,
              club_typ: 'gegner_verein',
              ligen: [testData.liga.id],
              aktiv: true
            }
          })
          .expect(200);
        
        createdClubs.push(response.body.data);
      }

      expect(createdClubs.length).toBe(3);

      // Test bulk query
      const bulkResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs?filters[name][$contains]=FC Bulk&populate=ligen`)
        .expect(200);

      expect(bulkResponse.body.data.length).toBe(3);

      // Test bulk update (deactivate all)
      for (const club of createdClubs) {
        await request(strapi.server.httpServer)
          .put(`/api/clubs/${club.id}`)
          .send({
            data: { aktiv: false }
          })
          .expect(200);
      }

      // Verify bulk update
      const deactivatedResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs?filters[name][$contains]=FC Bulk`)
        .expect(200);

      deactivatedResponse.body.data.forEach((club: any) => {
        expect(club.attributes.aktiv).toBe(false);
      });
    });
  });

  describe('Performance Testing Under Realistic Load', () => {
    it('should handle large league with many clubs and games efficiently', async () => {
      const startTime = Date.now();

      // Create 16 clubs (typical league size)
      const clubs = [];
      for (let i = 1; i <= 16; i++) {
        const club = await strapi.entityService.create('api::club.club', {
          data: {
            name: `FC Team ${i.toString().padStart(2, '0')}`,
            kurz_name: `FC${i.toString().padStart(2, '0')}`,
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true
          }
        });
        clubs.push(club);
      }

      // Create realistic number of games (each team plays ~15 games)
      const games = [];
      for (let spieltag = 1; spieltag <= 15; spieltag++) {
        for (let i = 0; i < 8; i++) { // 8 games per matchday
          const heimIndex = (spieltag + i) % 16;
          const gastIndex = (spieltag + i + 8) % 16;
          
          if (heimIndex !== gastIndex) {
            const game = await strapi.entityService.create('api::spiel.spiel', {
              data: {
                datum: new Date(`2024-03-${spieltag}T15:00:00Z`),
                liga: testData.liga.id,
                saison: testData.saison.id,
                spieltag,
                heim_club: clubs[heimIndex].id,
                gast_club: clubs[gastIndex].id,
                heim_tore: Math.floor(Math.random() * 4),
                gast_tore: Math.floor(Math.random() * 4),
                status: 'beendet'
              }
            });
            games.push(game);
          }
        }
      }

      // Wait for all calculations to complete
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify table was calculated correctly
      const tableEntries = await getTableEntries(strapi, testData.liga.id, testData.saison.id);
      expect(tableEntries.length).toBe(16);

      // Verify all entries have club data
      tableEntries.forEach(entry => {
        expect(entry.club).toBeDefined();
        expect(entry.team_name).toBeDefined();
        expect(entry.punkte).toBeGreaterThanOrEqual(0);
      });

      const totalTime = Date.now() - startTime;
      console.log(`Large league processing time: ${totalTime}ms`);
      
      // Should complete within reasonable time (adjust based on requirements)
      expect(totalTime).toBeLessThan(30000); // 30 seconds max
    });

    it('should handle concurrent game updates efficiently', async () => {
      // Create clubs for concurrent testing
      const clubs = await Promise.all([
        createTestClub(strapi, 'FC Concurrent A', testData.liga.id),
        createTestClub(strapi, 'FC Concurrent B', testData.liga.id),
        createTestClub(strapi, 'FC Concurrent C', testData.liga.id),
        createTestClub(strapi, 'FC Concurrent D', testData.liga.id)
      ]);

      // Create multiple games
      const games = [];
      for (let i = 0; i < 4; i++) {
        const game = await strapi.entityService.create('api::spiel.spiel', {
          data: {
            datum: new Date(`2024-03-${15 + i}T15:00:00Z`),
            liga: testData.liga.id,
            saison: testData.saison.id,
            spieltag: 15 + i,
            heim_club: clubs[i % 2].id,
            gast_club: clubs[(i % 2) + 2].id,
            heim_tore: 0,
            gast_tore: 0,
            status: 'geplant'
          }
        });
        games.push(game);
      }

      const startTime = Date.now();

      // Update all games concurrently
      const updatePromises = games.map((game, index) => 
        strapi.entityService.update('api::spiel.spiel', game.id, {
          data: {
            heim_tore: index + 1,
            gast_tore: index,
            status: 'beendet'
          }
        })
      );

      await Promise.all(updatePromises);

      // Wait for all calculations
      await new Promise(resolve => setTimeout(resolve, 3000));

      const concurrentTime = Date.now() - startTime;
      console.log(`Concurrent updates processing time: ${concurrentTime}ms`);

      // Verify all calculations completed correctly
      const tableEntries = await getTableEntries(strapi, testData.liga.id, testData.saison.id);
      expect(tableEntries.length).toBe(4);

      // Should handle concurrent updates efficiently
      expect(concurrentTime).toBeLessThan(10000); // 10 seconds max
    });

    it('should maintain performance with complex queries', async () => {
      // Create test data
      const clubs = await Promise.all([
        createTestClub(strapi, 'FC Performance A', testData.liga.id),
        createTestClub(strapi, 'FC Performance B', testData.liga.id)
      ]);

      // Create game
      await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date('2024-03-15T15:00:00Z'),
          liga: testData.liga.id,
          saison: testData.saison.id,
          spieltag: 15,
          heim_club: clubs[0].id,
          gast_club: clubs[1].id,
          heim_tore: 2,
          gast_tore: 1,
          status: 'beendet'
        }
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test complex API queries that frontend would use
      const startTime = Date.now();

      const complexQueries = [
        // Table with full population
        request(strapi.server.httpServer)
          .get(`/api/tabellen-eintraege?filters[liga][id]=${testData.liga.id}&populate=club,club.logo,liga,saison&sort=punkte:desc,tordifferenz:desc`),
        
        // Games with club data
        request(strapi.server.httpServer)
          .get(`/api/spiele?filters[liga][id]=${testData.liga.id}&populate=heim_club,gast_club,liga,saison`),
        
        // Clubs with league data
        request(strapi.server.httpServer)
          .get(`/api/clubs?filters[ligen][id]=${testData.liga.id}&populate=ligen,logo`),
        
        // Filtered queries
        request(strapi.server.httpServer)
          .get(`/api/tabellen-eintraege?filters[liga][id]=${testData.liga.id}&filters[punkte][$gt]=0&populate=club`)
      ];

      const responses = await Promise.all(complexQueries);
      const queryTime = Date.now() - startTime;

      console.log(`Complex queries processing time: ${queryTime}ms`);

      // All queries should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toBeDefined();
      });

      // Should complete complex queries quickly
      expect(queryTime).toBeLessThan(5000); // 5 seconds max
    });
  });
});

// Helper functions
async function setupTestData(strapi: any) {
  const saison = await strapi.entityService.create('api::saison.saison', {
    data: {
      name: '2023/24',
      jahr: 2023,
      aktiv: true
    }
  });

  const liga = await strapi.entityService.create('api::liga.liga', {
    data: {
      name: 'Test Liga E2E',
      saison: saison.id
    }
  });

  return { saison, liga };
}

async function cleanupTestData(strapi: any, testData: any) {
  // Clean up in reverse order due to relationships
  await strapi.db.query('api::tabellen-eintrag.tabellen-eintrag').deleteMany({
    where: { liga: testData.liga.id }
  });
  
  await strapi.db.query('api::spiel.spiel').deleteMany({
    where: { liga: testData.liga.id }
  });
  
  await strapi.db.query('api::club.club').deleteMany({
    where: { ligen: testData.liga.id }
  });
  
  await strapi.entityService.delete('api::liga.liga', testData.liga.id);
  await strapi.entityService.delete('api::saison.saison', testData.saison.id);
}

async function createTestClub(strapi: any, name: string, ligaId: number) {
  return await strapi.entityService.create('api::club.club', {
    data: {
      name,
      kurz_name: name.substring(0, 8),
      club_typ: 'gegner_verein',
      ligen: [ligaId],
      aktiv: true
    }
  });
}

async function getTableEntries(strapi: any, ligaId: number, saisonId: number) {
  return await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
    filters: {
      liga: ligaId,
      saison: saisonId
    },
    populate: ['club', 'liga', 'saison']
  });
}