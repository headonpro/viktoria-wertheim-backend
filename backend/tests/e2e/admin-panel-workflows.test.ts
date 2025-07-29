/**
 * Admin Panel Club Management Workflow E2E Tests
 * Tests complete admin panel workflows for club management
 */

// Jest globals are available globally, no need to import
import request from 'supertest';
import { setupStrapi, cleanupStrapi } from '../helpers/strapi';

describe('Admin Panel Club Management E2E Tests', () => {
  let strapi: any;
  let testData: any = {};
  let adminToken: string;

  beforeAll(async () => {
    strapi = await setupStrapi();
    
    // Create admin user and get token
    adminToken = await createAdminUser(strapi);
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    testData = await setupAdminTestData(strapi);
  });

  afterEach(async () => {
    await cleanupAdminTestData(strapi, testData);
  });

  describe('Club CRUD Operations Workflow', () => {
    it('should complete full club lifecycle: create → read → update → delete', async () => {
      // Step 1: Create new club
      const createResponse = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            name: 'FC Admin Test Club',
            kurz_name: 'FC ADMIN',
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true,
            gruendungsjahr: 1955,
            vereinsfarben: 'Rot-Blau',
            heimstadion: 'Admin Test Stadium',
            adresse: 'Test Street 123, Test City',
            website: 'https://fc-admin-test.de'
          }
        })
        .expect(200);

      const clubId = createResponse.body.data.id;
      expect(createResponse.body.data.attributes.name).toBe('FC Admin Test Club');
      expect(createResponse.body.data.attributes.club_typ).toBe('gegner_verein');

      // Step 2: Read club with full population
      const readResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs/${clubId}?populate=ligen,logo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(readResponse.body.data.attributes.name).toBe('FC Admin Test Club');
      expect(readResponse.body.data.attributes.ligen.data.length).toBe(1);
      expect(readResponse.body.data.attributes.ligen.data[0].id).toBe(testData.liga.id);

      // Step 3: Update club information
      const updateResponse = await request(strapi.server.httpServer)
        .put(`/api/clubs/${clubId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            kurz_name: 'FC UPDATED',
            vereinsfarben: 'Grün-Weiß',
            website: 'https://fc-updated-test.de',
            aktiv: false
          }
        })
        .expect(200);

      expect(updateResponse.body.data.attributes.kurz_name).toBe('FC UPDATED');
      expect(updateResponse.body.data.attributes.vereinsfarben).toBe('Grün-Weiß');
      expect(updateResponse.body.data.attributes.aktiv).toBe(false);

      // Step 4: Verify update persisted
      const verifyResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs/${clubId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(verifyResponse.body.data.attributes.kurz_name).toBe('FC UPDATED');
      expect(verifyResponse.body.data.attributes.aktiv).toBe(false);

      // Step 5: Delete club
      await request(strapi.server.httpServer)
        .delete(`/api/clubs/${clubId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Step 6: Verify deletion
      await request(strapi.server.httpServer)
        .get(`/api/clubs/${clubId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should handle Viktoria club creation with team mapping', async () => {
      // Create Viktoria club with team mapping
      const createResponse = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            name: 'SV Viktoria Wertheim Test',
            kurz_name: 'SV VIK TEST',
            club_typ: 'viktoria_verein',
            viktoria_team_mapping: 'team_1',
            ligen: [testData.liga.id],
            aktiv: true,
            gruendungsjahr: 1952,
            vereinsfarben: 'Gelb-Blau'
          }
        })
        .expect(200);

      const clubId = createResponse.body.data.id;
      expect(createResponse.body.data.attributes.club_typ).toBe('viktoria_verein');
      expect(createResponse.body.data.attributes.viktoria_team_mapping).toBe('team_1');

      // Verify team mapping is unique - try to create another with same mapping
      const duplicateMappingResponse = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            name: 'Another Viktoria Club',
            kurz_name: 'AVC',
            club_typ: 'viktoria_verein',
            viktoria_team_mapping: 'team_1', // Same mapping
            ligen: [testData.liga.id],
            aktiv: true
          }
        })
        .expect(400);

      expect(duplicateMappingResponse.body.error).toBeDefined();

      // Update team mapping
      const updateResponse = await request(strapi.server.httpServer)
        .put(`/api/clubs/${clubId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            viktoria_team_mapping: 'team_2'
          }
        })
        .expect(200);

      expect(updateResponse.body.data.attributes.viktoria_team_mapping).toBe('team_2');

      // Clean up
      await request(strapi.server.httpServer)
        .delete(`/api/clubs/${clubId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should validate club data integrity', async () => {
      // Test duplicate name validation
      const club1Response = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            name: 'FC Duplicate Test',
            kurz_name: 'FC DUP',
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true
          }
        })
        .expect(200);

      const club1Id = club1Response.body.data.id;

      // Try to create another club with same name
      const duplicateResponse = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            name: 'FC Duplicate Test', // Same name
            kurz_name: 'FC DUP2',
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true
          }
        })
        .expect(400);

      expect(duplicateResponse.body.error).toBeDefined();

      // Test invalid viktoria club without team mapping
      const invalidViktoriaResponse = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            name: 'FC Invalid Viktoria',
            kurz_name: 'FC INV',
            club_typ: 'viktoria_verein',
            // Missing viktoria_team_mapping
            ligen: [testData.liga.id],
            aktiv: true
          }
        })
        .expect(400);

      expect(invalidViktoriaResponse.body.error).toBeDefined();

      // Test invalid data types
      const invalidDataResponse = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            name: 'FC Invalid Data',
            kurz_name: 'FC INV',
            club_typ: 'invalid_type', // Invalid enum value
            ligen: [testData.liga.id],
            aktiv: true
          }
        })
        .expect(400);

      expect(invalidDataResponse.body.error).toBeDefined();

      // Clean up
      await request(strapi.server.httpServer)
        .delete(`/api/clubs/${club1Id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Liga-Club Relationship Management', () => {
    it('should manage club-liga relationships correctly', async () => {
      // Create additional liga
      const liga2 = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Second Test Liga',
          saison: testData.saison.id
        }
      });

      // Create club with multiple liga assignments
      const createResponse = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            name: 'FC Multi Liga',
            kurz_name: 'FC ML',
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id, liga2.id],
            aktiv: true
          }
        })
        .expect(200);

      const clubId = createResponse.body.data.id;

      // Verify club is assigned to both ligas
      const readResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs/${clubId}?populate=ligen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(readResponse.body.data.attributes.ligen.data.length).toBe(2);

      // Update to remove one liga
      const updateResponse = await request(strapi.server.httpServer)
        .put(`/api/clubs/${clubId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            ligen: [testData.liga.id] // Remove liga2
          }
        })
        .expect(200);

      // Verify update
      const verifyResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs/${clubId}?populate=ligen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(verifyResponse.body.data.attributes.ligen.data.length).toBe(1);
      expect(verifyResponse.body.data.attributes.ligen.data[0].id).toBe(testData.liga.id);

      // Clean up
      await request(strapi.server.httpServer)
        .delete(`/api/clubs/${clubId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await strapi.entityService.delete('api::liga.liga', liga2.id);
    });

    it('should filter clubs by liga correctly', async () => {
      // Create clubs in different ligas
      const liga2 = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Filter Test Liga 2',
          saison: testData.saison.id
        }
      });

      const club1Response = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            name: 'FC Liga 1 Only',
            kurz_name: 'FC L1',
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true
          }
        })
        .expect(200);

      const club2Response = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            name: 'FC Liga 2 Only',
            kurz_name: 'FC L2',
            club_typ: 'gegner_verein',
            ligen: [liga2.id],
            aktiv: true
          }
        })
        .expect(200);

      const club3Response = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            name: 'FC Both Ligas',
            kurz_name: 'FC BOTH',
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id, liga2.id],
            aktiv: true
          }
        })
        .expect(200);

      // Filter by liga 1
      const liga1Response = await request(strapi.server.httpServer)
        .get(`/api/clubs?filters[ligen][id]=${testData.liga.id}&populate=ligen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(liga1Response.body.data.length).toBe(2); // club1 and club3

      // Filter by liga 2
      const liga2Response = await request(strapi.server.httpServer)
        .get(`/api/clubs?filters[ligen][id]=${liga2.id}&populate=ligen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(liga2Response.body.data.length).toBe(2); // club2 and club3

      // Clean up
      await request(strapi.server.httpServer)
        .delete(`/api/clubs/${club1Response.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(strapi.server.httpServer)
        .delete(`/api/clubs/${club2Response.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(strapi.server.httpServer)
        .delete(`/api/clubs/${club3Response.body.data.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await strapi.entityService.delete('api::liga.liga', liga2.id);
    });
  });

  describe('Game Creation with Club Selection', () => {
    it('should create games with club selection and validation', async () => {
      // Create clubs for game
      const heimClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'FC Heim Test',
          kurz_name: 'FC HEIM',
          club_typ: 'gegner_verein',
          ligen: [testData.liga.id],
          aktiv: true
        }
      });

      const gastClub = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'FC Gast Test',
          kurz_name: 'FC GAST',
          club_typ: 'gegner_verein',
          ligen: [testData.liga.id],
          aktiv: true
        }
      });

      // Create game with clubs
      const gameResponse = await request(strapi.server.httpServer)
        .post('/api/spiele')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            datum: new Date('2024-04-15T15:00:00Z'),
            liga: testData.liga.id,
            saison: testData.saison.id,
            spieltag: 20,
            heim_club: heimClub.id,
            gast_club: gastClub.id,
            status: 'geplant'
          }
        })
        .expect(200);

      const gameId = gameResponse.body.data.id;
      expect(gameResponse.body.data.attributes.heim_club.data.id).toBe(heimClub.id);
      expect(gameResponse.body.data.attributes.gast_club.data.id).toBe(gastClub.id);

      // Update game with result
      const updateResponse = await request(strapi.server.httpServer)
        .put(`/api/spiele/${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            heim_tore: 3,
            gast_tore: 1,
            status: 'beendet'
          }
        })
        .expect(200);

      expect(updateResponse.body.data.attributes.heim_tore).toBe(3);
      expect(updateResponse.body.data.attributes.gast_tore).toBe(1);
      expect(updateResponse.body.data.attributes.status).toBe('beendet');

      // Wait for table calculation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify table entries were created
      const tableResponse = await request(strapi.server.httpServer)
        .get(`/api/tabellen-eintraege?filters[liga][id]=${testData.liga.id}&populate=club`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(tableResponse.body.data.length).toBeGreaterThanOrEqual(2);

      const heimEntry = tableResponse.body.data.find((entry: any) => 
        entry.attributes.club?.data?.id === heimClub.id
      );
      expect(heimEntry).toBeDefined();
      expect(heimEntry.attributes.punkte).toBe(3);

      // Clean up
      await request(strapi.server.httpServer)
        .delete(`/api/spiele/${gameId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await strapi.entityService.delete('api::club.club', heimClub.id);
      await strapi.entityService.delete('api::club.club', gastClub.id);
    });

    it('should validate game creation constraints', async () => {
      // Create clubs in different ligas
      const liga2 = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Different Liga',
          saison: testData.saison.id
        }
      });

      const club1 = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'FC Liga 1',
          kurz_name: 'FC L1',
          club_typ: 'gegner_verein',
          ligen: [testData.liga.id],
          aktiv: true
        }
      });

      const club2 = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'FC Liga 2',
          kurz_name: 'FC L2',
          club_typ: 'gegner_verein',
          ligen: [liga2.id],
          aktiv: true
        }
      });

      // Try to create game between clubs from different ligas
      const invalidGameResponse = await request(strapi.server.httpServer)
        .post('/api/spiele')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            datum: new Date('2024-04-15T15:00:00Z'),
            liga: testData.liga.id,
            saison: testData.saison.id,
            spieltag: 20,
            heim_club: club1.id,
            gast_club: club2.id, // Different liga
            status: 'geplant'
          }
        })
        .expect(400);

      expect(invalidGameResponse.body.error).toBeDefined();

      // Try to create game where club plays against itself
      const sameClubResponse = await request(strapi.server.httpServer)
        .post('/api/spiele')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            datum: new Date('2024-04-15T15:00:00Z'),
            liga: testData.liga.id,
            saison: testData.saison.id,
            spieltag: 20,
            heim_club: club1.id,
            gast_club: club1.id, // Same club
            status: 'geplant'
          }
        })
        .expect(400);

      expect(sameClubResponse.body.error).toBeDefined();

      // Clean up
      await strapi.entityService.delete('api::club.club', club1.id);
      await strapi.entityService.delete('api::club.club', club2.id);
      await strapi.entityService.delete('api::liga.liga', liga2.id);
    });
  });

  describe('Bulk Operations and Data Management', () => {
    it('should support bulk club operations', async () => {
      // Create multiple clubs
      const clubsData = [
        { name: 'FC Bulk 1', kurz_name: 'FCB1' },
        { name: 'FC Bulk 2', kurz_name: 'FCB2' },
        { name: 'FC Bulk 3', kurz_name: 'FCB3' },
        { name: 'FC Bulk 4', kurz_name: 'FCB4' },
        { name: 'FC Bulk 5', kurz_name: 'FCB5' }
      ];

      const createdClubs = [];
      for (const clubData of clubsData) {
        const response = await request(strapi.server.httpServer)
          .post('/api/clubs')
          .set('Authorization', `Bearer ${adminToken}`)
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

      expect(createdClubs.length).toBe(5);

      // Test bulk query with pagination
      const bulkResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs?filters[name][$contains]=FC Bulk&populate=ligen&pagination[pageSize]=3`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(bulkResponse.body.data.length).toBe(3);
      expect(bulkResponse.body.meta.pagination.total).toBe(5);

      // Test bulk update (deactivate all)
      for (const club of createdClubs) {
        await request(strapi.server.httpServer)
          .put(`/api/clubs/${club.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            data: { aktiv: false }
          })
          .expect(200);
      }

      // Verify bulk update
      const deactivatedResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs?filters[name][$contains]=FC Bulk`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      deactivatedResponse.body.data.forEach((club: any) => {
        expect(club.attributes.aktiv).toBe(false);
      });

      // Test bulk delete
      for (const club of createdClubs) {
        await request(strapi.server.httpServer)
          .delete(`/api/clubs/${club.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }

      // Verify bulk delete
      const deletedResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs?filters[name][$contains]=FC Bulk`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(deletedResponse.body.data.length).toBe(0);
    });

    it('should handle data import/export scenarios', async () => {
      // Simulate data import by creating clubs with complete data
      const importData = [
        {
          name: 'FC Import 1',
          kurz_name: 'FCI1',
          club_typ: 'gegner_verein',
          gruendungsjahr: 1920,
          vereinsfarben: 'Rot-Weiß',
          heimstadion: 'Import Stadium 1',
          adresse: 'Import Street 1',
          website: 'https://fc-import-1.de'
        },
        {
          name: 'FC Import 2',
          kurz_name: 'FCI2',
          club_typ: 'gegner_verein',
          gruendungsjahr: 1925,
          vereinsfarben: 'Blau-Gelb',
          heimstadion: 'Import Stadium 2',
          adresse: 'Import Street 2',
          website: 'https://fc-import-2.de'
        }
      ];

      const importedClubs = [];
      for (const clubData of importData) {
        const response = await request(strapi.server.httpServer)
          .post('/api/clubs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            data: {
              ...clubData,
              ligen: [testData.liga.id],
              aktiv: true
            }
          })
          .expect(200);
        
        importedClubs.push(response.body.data);
      }

      // Simulate data export by querying with full population
      const exportResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs?filters[name][$contains]=FC Import&populate=ligen,logo`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(exportResponse.body.data.length).toBe(2);

      // Verify all imported data is present
      exportResponse.body.data.forEach((club: any, index: number) => {
        expect(club.attributes.name).toBe(importData[index].name);
        expect(club.attributes.gruendungsjahr).toBe(importData[index].gruendungsjahr);
        expect(club.attributes.vereinsfarben).toBe(importData[index].vereinsfarben);
        expect(club.attributes.ligen.data.length).toBe(1);
      });

      // Clean up
      for (const club of importedClubs) {
        await request(strapi.server.httpServer)
          .delete(`/api/clubs/${club.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      }
    });
  });

  describe('Admin Panel Performance and Usability', () => {
    it('should handle large datasets efficiently in admin queries', async () => {
      // Create large dataset
      const clubs = [];
      for (let i = 1; i <= 50; i++) {
        const club = await strapi.entityService.create('api::club.club', {
          data: {
            name: `FC Performance ${i.toString().padStart(3, '0')}`,
            kurz_name: `FCP${i.toString().padStart(3, '0')}`,
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true
          }
        });
        clubs.push(club);
      }

      const startTime = Date.now();

      // Test paginated query
      const paginatedResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs?filters[ligen][id]=${testData.liga.id}&populate=ligen&pagination[pageSize]=10&sort=name:asc`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const queryTime = Date.now() - startTime;
      console.log(`Large dataset query time: ${queryTime}ms`);

      expect(paginatedResponse.body.data.length).toBe(10);
      expect(paginatedResponse.body.meta.pagination.total).toBe(50);
      expect(paginatedResponse.body.meta.pagination.pageCount).toBe(5);

      // Should be fast even with large datasets
      expect(queryTime).toBeLessThan(3000);

      // Test search functionality
      const searchStartTime = Date.now();

      const searchResponse = await request(strapi.server.httpServer)
        .get(`/api/clubs?filters[name][$contains]=Performance 01&populate=ligen`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const searchTime = Date.now() - searchStartTime;
      console.log(`Search query time: ${searchTime}ms`);

      expect(searchResponse.body.data.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(1000);

      // Clean up
      for (const club of clubs) {
        await strapi.entityService.delete('api::club.club', club.id);
      }
    });

    it('should provide proper error handling and user feedback', async () => {
      // Test validation error response format
      const validationResponse = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          data: {
            // Missing required name field
            kurz_name: 'FC ERR',
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true
          }
        })
        .expect(400);

      expect(validationResponse.body.error).toBeDefined();
      expect(validationResponse.body.error.message).toBeDefined();

      // Test not found error
      const notFoundResponse = await request(strapi.server.httpServer)
        .get('/api/clubs/99999')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(notFoundResponse.body.error).toBeDefined();

      // Test unauthorized access
      const unauthorizedResponse = await request(strapi.server.httpServer)
        .post('/api/clubs')
        .send({
          data: {
            name: 'FC Unauthorized',
            kurz_name: 'FC UNAUTH',
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true
          }
        })
        .expect(401);

      expect(unauthorizedResponse.body.error).toBeDefined();
    });
  });
});

// Helper functions
async function createAdminUser(strapi: any): Promise<string> {
  // This would typically create an admin user and return a JWT token
  // For testing purposes, we'll mock this
  return 'mock-admin-token';
}

async function setupAdminTestData(strapi: any) {
  const saison = await strapi.entityService.create('api::saison.saison', {
    data: {
      name: '2023/24 Admin',
      jahr: 2023,
      aktiv: true
    }
  });

  const liga = await strapi.entityService.create('api::liga.liga', {
    data: {
      name: 'Admin Test Liga',
      saison: saison.id
    }
  });

  return { saison, liga };
}

async function cleanupAdminTestData(strapi: any, testData: any) {
  // Clean up all test data
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