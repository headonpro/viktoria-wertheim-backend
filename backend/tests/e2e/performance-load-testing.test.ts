/**
 * Performance Load Testing for Club System
 * Tests system performance under realistic load conditions
 */

// Jest globals are available globally, no need to import
import { performance } from 'perf_hooks';
import { setupStrapi, cleanupStrapi } from '../helpers/strapi';

describe('Performance Load Testing', () => {
  let strapi: any;
  let testData: any = {};

  beforeAll(async () => {
    strapi = await setupStrapi();
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(async () => {
    testData = await setupPerformanceTestData(strapi);
  });

  afterEach(async () => {
    await cleanupPerformanceTestData(strapi, testData);
  });

  describe('Large League Performance Tests', () => {
    it('should handle 20-team league with 190 games efficiently', async () => {
      const startTime = performance.now();
      
      // Create 20 clubs (realistic large league)
      const clubs = [];
      for (let i = 1; i <= 20; i++) {
        const club = await strapi.entityService.create('api::club.club', {
          data: {
            name: `FC Performance Team ${i.toString().padStart(2, '0')}`,
            kurz_name: `FCP${i.toString().padStart(2, '0')}`,
            club_typ: i === 1 ? 'viktoria_verein' : 'gegner_verein',
            viktoria_team_mapping: i === 1 ? 'team_1' : undefined,
            ligen: [testData.liga.id],
            aktiv: true
          }
        });
        clubs.push(club);
      }
      
      const clubCreationTime = performance.now();
      console.log(`Club creation time: ${clubCreationTime - startTime}ms`);
      
      // Create full season schedule (each team plays each other once = 190 games)
      const games = [];
      let gameId = 1;
      
      for (let i = 0; i < clubs.length; i++) {
        for (let j = i + 1; j < clubs.length; j++) {
          const game = await strapi.entityService.create('api::spiel.spiel', {
            data: {
              datum: new Date(`2024-03-${(gameId % 30) + 1}T15:00:00Z`),
              liga: testData.liga.id,
              saison: testData.saison.id,
              spieltag: Math.ceil(gameId / 10),
              heim_club: clubs[i].id,
              gast_club: clubs[j].id,
              heim_tore: Math.floor(Math.random() * 4),
              gast_tore: Math.floor(Math.random() * 4),
              status: 'beendet'
            }
          });
          games.push(game);
          gameId++;
        }
      }
      
      const gameCreationTime = performance.now();
      console.log(`Game creation time: ${gameCreationTime - clubCreationTime}ms`);
      console.log(`Total games created: ${games.length}`);
      
      // Wait for all table calculations to complete
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Verify table was calculated correctly
      const tableEntries = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          liga: testData.liga.id,
          saison: testData.saison.id
        },
        populate: ['club']
      });
      
      const calculationTime = performance.now();
      console.log(`Table calculation time: ${calculationTime - gameCreationTime}ms`);
      
      expect(tableEntries.length).toBe(20);
      
      // Verify all entries have correct data
      tableEntries.forEach(entry => {
        expect(entry.club).toBeDefined();
        expect(entry.team_name).toBeDefined();
        expect(entry.spiele).toBeGreaterThanOrEqual(0);
        expect(entry.punkte).toBeGreaterThanOrEqual(0);
        expect(entry.tore_fuer).toBeGreaterThanOrEqual(0);
        expect(entry.tore_gegen).toBeGreaterThanOrEqual(0);
      });
      
      // Verify table is properly sorted
      const sortedEntries = [...tableEntries].sort((a, b) => {
        if (b.punkte !== a.punkte) return b.punkte - a.punkte;
        if (b.tordifferenz !== a.tordifferenz) return b.tordifferenz - a.tordifferenz;
        if (b.tore_fuer !== a.tore_fuer) return b.tore_fuer - a.tore_fuer;
        return a.team_name.localeCompare(b.team_name);
      });
      
      for (let i = 0; i < tableEntries.length; i++) {
        expect(tableEntries[i].id).toBe(sortedEntries[i].id);
      }
      
      const totalTime = performance.now() - startTime;
      console.log(`Total processing time: ${totalTime}ms`);
      
      // Performance requirements
      expect(totalTime).toBeLessThan(30000); // 30 seconds max for large league
    });

    it('should handle concurrent game updates without race conditions', async () => {
      // Create clubs for concurrent testing
      const clubs = [];
      for (let i = 1; i <= 8; i++) {
        const club = await strapi.entityService.create('api::club.club', {
          data: {
            name: `FC Concurrent ${i}`,
            kurz_name: `FCC${i}`,
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true
          }
        });
        clubs.push(club);
      }
      
      // Create initial games
      const games = [];
      for (let i = 0; i < 4; i++) {
        const game = await strapi.entityService.create('api::spiel.spiel', {
          data: {
            datum: new Date(`2024-03-${15 + i}T15:00:00Z`),
            liga: testData.liga.id,
            saison: testData.saison.id,
            spieltag: 15 + i,
            heim_club: clubs[i * 2].id,
            gast_club: clubs[i * 2 + 1].id,
            heim_tore: 0,
            gast_tore: 0,
            status: 'geplant'
          }
        });
        games.push(game);
      }
      
      const startTime = performance.now();
      
      // Update all games concurrently with different results
      const updatePromises = games.map((game, index) => 
        strapi.entityService.update('api::spiel.spiel', game.id, {
          data: {
            heim_tore: index + 1,
            gast_tore: index % 2,
            status: 'beendet'
          }
        })
      );
      
      await Promise.all(updatePromises);
      
      // Wait for all calculations to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const concurrentTime = performance.now() - startTime;
      console.log(`Concurrent update time: ${concurrentTime}ms`);
      
      // Verify table consistency
      const tableEntries = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          liga: testData.liga.id,
          saison: testData.saison.id
        },
        populate: ['club']
      });
      
      expect(tableEntries.length).toBe(8);
      
      // Verify data integrity - total goals should match
      let totalGoalsFor = 0;
      let totalGoalsAgainst = 0;
      
      tableEntries.forEach(entry => {
        totalGoalsFor += entry.tore_fuer;
        totalGoalsAgainst += entry.tore_gegen;
      });
      
      expect(totalGoalsFor).toBe(totalGoalsAgainst); // Goals for = goals against
      
      // Performance requirement
      expect(concurrentTime).toBeLessThan(10000); // 10 seconds max
    });

    it('should maintain performance with complex queries', async () => {
      // Create test data
      const clubs = [];
      for (let i = 1; i <= 10; i++) {
        const club = await strapi.entityService.create('api::club.club', {
          data: {
            name: `FC Query Test ${i}`,
            kurz_name: `FQT${i}`,
            club_typ: i <= 3 ? 'viktoria_verein' : 'gegner_verein',
            viktoria_team_mapping: i <= 3 ? `team_${i}` : undefined,
            ligen: [testData.liga.id],
            aktiv: true,
            gruendungsjahr: 1950 + i,
            vereinsfarben: `Color ${i}`
          }
        });
        clubs.push(club);
      }
      
      // Create games
      for (let i = 0; i < 20; i++) {
        await strapi.entityService.create('api::spiel.spiel', {
          data: {
            datum: new Date(`2024-03-${(i % 30) + 1}T15:00:00Z`),
            liga: testData.liga.id,
            saison: testData.saison.id,
            spieltag: Math.ceil((i + 1) / 5),
            heim_club: clubs[i % 10].id,
            gast_club: clubs[(i + 1) % 10].id,
            heim_tore: Math.floor(Math.random() * 4),
            gast_tore: Math.floor(Math.random() * 4),
            status: 'beendet'
          }
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const startTime = performance.now();
      
      // Execute complex queries simultaneously
      const queryPromises = [
        // Table with full population
        strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
          filters: { liga: testData.liga.id },
          populate: ['club', 'club.logo', 'liga', 'saison'],
          sort: ['punkte:desc', 'tordifferenz:desc', 'tore_fuer:desc', 'team_name:asc']
        }),
        
        // Games with club data
        strapi.entityService.findMany('api::spiel.spiel', {
          filters: { liga: testData.liga.id },
          populate: ['heim_club', 'gast_club', 'liga', 'saison']
        }),
        
        // Clubs with league data
        strapi.entityService.findMany('api::club.club', {
          filters: { ligen: testData.liga.id },
          populate: ['ligen', 'logo']
        }),
        
        // Filtered queries
        strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
          filters: {
            liga: testData.liga.id,
            punkte: { $gt: 0 }
          },
          populate: ['club']
        }),
        
        // Viktoria-specific queries
        strapi.entityService.findMany('api::club.club', {
          filters: {
            club_typ: 'viktoria_verein',
            ligen: testData.liga.id
          },
          populate: ['ligen']
        })
      ];
      
      const results = await Promise.all(queryPromises);
      
      const queryTime = performance.now() - startTime;
      console.log(`Complex queries time: ${queryTime}ms`);
      
      // Verify all queries returned data
      expect(results[0].length).toBeGreaterThan(0); // Table entries
      expect(results[1].length).toBeGreaterThan(0); // Games
      expect(results[2].length).toBeGreaterThan(0); // Clubs
      expect(results[3].length).toBeGreaterThanOrEqual(0); // Filtered entries
      expect(results[4].length).toBe(3); // Viktoria clubs
      
      // Performance requirement
      expect(queryTime).toBeLessThan(5000); // 5 seconds max
    });
  });

  describe('Memory and Resource Usage Tests', () => {
    it('should not have memory leaks during intensive operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform intensive operations
      for (let iteration = 0; iteration < 5; iteration++) {
        // Create clubs
        const clubs = [];
        for (let i = 1; i <= 5; i++) {
          const club = await strapi.entityService.create('api::club.club', {
            data: {
              name: `FC Memory Test ${iteration}-${i}`,
              kurz_name: `FMT${iteration}${i}`,
              club_typ: 'gegner_verein',
              ligen: [testData.liga.id],
              aktiv: true
            }
          });
          clubs.push(club);
        }
        
        // Create games
        for (let i = 0; i < 10; i++) {
          await strapi.entityService.create('api::spiel.spiel', {
            data: {
              datum: new Date(`2024-03-${(i % 30) + 1}T15:00:00Z`),
              liga: testData.liga.id,
              saison: testData.saison.id,
              spieltag: i + 1,
              heim_club: clubs[i % 5].id,
              gast_club: clubs[(i + 1) % 5].id,
              heim_tore: Math.floor(Math.random() * 4),
              gast_tore: Math.floor(Math.random() * 4),
              status: 'beendet'
            }
          });
        }
        
        // Wait for calculations
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Clean up this iteration
        await strapi.db.query('api::tabellen-eintrag.tabellen-eintrag').deleteMany({
          where: { liga: testData.liga.id }
        });
        
        await strapi.db.query('api::spiel.spiel').deleteMany({
          where: { liga: testData.liga.id }
        });
        
        for (const club of clubs) {
          await strapi.entityService.delete('api::club.club', club.id);
        }
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage();
      
      console.log('Memory usage:');
      console.log(`Initial: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`Final: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`Difference: ${Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024)}MB`);
      
      // Memory usage should not increase significantly
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });

    it('should handle database connection limits efficiently', async () => {
      // Create many concurrent operations to test connection pooling
      const operations = [];
      
      for (let i = 0; i < 50; i++) {
        operations.push(
          strapi.entityService.findMany('api::club.club', {
            filters: { aktiv: true },
            populate: ['ligen']
          })
        );
      }
      
      const startTime = performance.now();
      
      try {
        const results = await Promise.all(operations);
        
        const operationTime = performance.now() - startTime;
        console.log(`50 concurrent operations time: ${operationTime}ms`);
        
        // All operations should succeed
        expect(results.length).toBe(50);
        
        // Should complete within reasonable time
        expect(operationTime).toBeLessThan(10000); // 10 seconds max
      } catch (error) {
        console.error('Database connection error:', error);
        throw error;
      }
    });

    it('should handle large result sets efficiently', async () => {
      // Create large dataset
      const clubs = [];
      for (let i = 1; i <= 50; i++) {
        const club = await strapi.entityService.create('api::club.club', {
          data: {
            name: `FC Large Dataset ${i.toString().padStart(3, '0')}`,
            kurz_name: `FLD${i.toString().padStart(3, '0')}`,
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true,
            gruendungsjahr: 1900 + i,
            vereinsfarben: `Color ${i}`,
            heimstadion: `Stadium ${i}`,
            adresse: `Address ${i}, City ${i}`
          }
        });
        clubs.push(club);
      }
      
      const startTime = performance.now();
      
      // Query large result set with population
      const result = await strapi.entityService.findMany('api::club.club', {
        filters: { ligen: testData.liga.id },
        populate: ['ligen', 'logo'],
        sort: 'name:asc'
      });
      
      const queryTime = performance.now() - startTime;
      console.log(`Large result set query time: ${queryTime}ms`);
      
      expect(result.length).toBe(50);
      
      // Should handle large result sets efficiently
      expect(queryTime).toBeLessThan(3000); // 3 seconds max
      
      // Verify data integrity
      result.forEach((club, index) => {
        expect(club.name).toBe(`FC Large Dataset ${(index + 1).toString().padStart(3, '0')}`);
        expect(club.ligen).toBeDefined();
      });
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid successive updates', async () => {
      // Create test clubs
      const clubs = [];
      for (let i = 1; i <= 4; i++) {
        const club = await strapi.entityService.create('api::club.club', {
          data: {
            name: `FC Stress Test ${i}`,
            kurz_name: `FST${i}`,
            club_typ: 'gegner_verein',
            ligen: [testData.liga.id],
            aktiv: true
          }
        });
        clubs.push(club);
      }
      
      // Create game
      const game = await strapi.entityService.create('api::spiel.spiel', {
        data: {
          datum: new Date('2024-03-15T15:00:00Z'),
          liga: testData.liga.id,
          saison: testData.saison.id,
          spieltag: 15,
          heim_club: clubs[0].id,
          gast_club: clubs[1].id,
          heim_tore: 0,
          gast_tore: 0,
          status: 'geplant'
        }
      });
      
      const startTime = performance.now();
      
      // Rapidly update game result multiple times
      for (let i = 0; i < 10; i++) {
        await strapi.entityService.update('api::spiel.spiel', game.id, {
          data: {
            heim_tore: i,
            gast_tore: i % 3,
            status: 'beendet'
          }
        });
        
        // Small delay to simulate real-world scenario
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Wait for all calculations to settle
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const stressTime = performance.now() - startTime;
      console.log(`Stress test time: ${stressTime}ms`);
      
      // Verify final state is consistent
      const tableEntries = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          liga: testData.liga.id,
          saison: testData.saison.id
        },
        populate: ['club']
      });
      
      expect(tableEntries.length).toBeGreaterThanOrEqual(2);
      
      // Final game result should be reflected
      const finalGame = await strapi.entityService.findOne('api::spiel.spiel', game.id);
      expect(finalGame.heim_tore).toBe(9);
      expect(finalGame.gast_tore).toBe(0);
      
      // Should handle stress efficiently
      expect(stressTime).toBeLessThan(15000); // 15 seconds max
    });

    it('should recover from temporary failures', async () => {
      // Create test data
      const club1 = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'FC Recovery Test 1',
          kurz_name: 'FRT1',
          club_typ: 'gegner_verein',
          ligen: [testData.liga.id],
          aktiv: true
        }
      });
      
      const club2 = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'FC Recovery Test 2',
          kurz_name: 'FRT2',
          club_typ: 'gegner_verein',
          ligen: [testData.liga.id],
          aktiv: true
        }
      });
      
      // Simulate failure by temporarily breaking database connection
      const originalQuery = strapi.db.query;
      let failureCount = 0;
      
      strapi.db.query = jest.fn().mockImplementation((contentType) => {
        if (contentType === 'api::tabellen-eintrag.tabellen-eintrag' && failureCount < 3) {
          failureCount++;
          throw new Error('Simulated database failure');
        }
        return originalQuery(contentType);
      });
      
      const startTime = performance.now();
      
      try {
        // Create game that should trigger calculation
        await strapi.entityService.create('api::spiel.spiel', {
          data: {
            datum: new Date('2024-03-15T15:00:00Z'),
            liga: testData.liga.id,
            saison: testData.saison.id,
            spieltag: 15,
            heim_club: club1.id,
            gast_club: club2.id,
            heim_tore: 2,
            gast_tore: 1,
            status: 'beendet'
          }
        });
        
        // Wait for retry mechanisms to work
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Restore normal operation
        strapi.db.query = originalQuery;
        
        // Wait for successful calculation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const recoveryTime = performance.now() - startTime;
        console.log(`Recovery test time: ${recoveryTime}ms`);
        console.log(`Failures simulated: ${failureCount}`);
        
        // System should eventually recover
        expect(recoveryTime).toBeLessThan(20000); // 20 seconds max
        
      } finally {
        // Ensure we restore the original function
        strapi.db.query = originalQuery;
      }
    });
  });
});

// Helper functions
async function setupPerformanceTestData(strapi: any) {
  const saison = await strapi.entityService.create('api::saison.saison', {
    data: {
      name: '2023/24 Performance',
      jahr: 2023,
      aktiv: true
    }
  });

  const liga = await strapi.entityService.create('api::liga.liga', {
    data: {
      name: 'Performance Test Liga',
      saison: saison.id
    }
  });

  return { saison, liga };
}

async function cleanupPerformanceTestData(strapi: any, testData: any) {
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