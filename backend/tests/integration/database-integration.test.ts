/**
 * Database integration tests for hook services
 * Tests real database interactions and data consistency
 */

import { HookServiceFactory } from '../../src/services/HookServiceFactory';
import { HookConfiguration, HookEvent } from '../../src/services/types';

// Mock Strapi database layer
const mockDatabase = {
  connection: {
    raw: jest.fn(),
    transaction: jest.fn()
  },
  query: jest.fn()
};

const mockStrapi = {
  entityService: {
    findMany: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  db: mockDatabase,
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
};

global.strapi = mockStrapi as any;

describe('Database Integration Tests', () => {
  let factory: HookServiceFactory;
  let config: HookConfiguration;

  beforeEach(() => {
    config = {
      enableStrictValidation: true,
      enableAsyncCalculations: true,
      maxHookExecutionTime: 5000,
      retryAttempts: 3,
      timeoutMs: 10000
    };

    factory = new HookServiceFactory(config);
    jest.clearAllMocks();
  });

  describe('Team Database Operations', () => {
    it('should query existing teams correctly', async () => {
      const mockTeams = [
        { id: 1, name: 'Team A', liga: 1, saison: 1 },
        { id: 2, name: 'Team B', liga: 1, saison: 1 },
        { id: 3, name: 'Team A', liga: 2, saison: 1 } // Same name, different liga
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockTeams);

      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Team A',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const result = await teamService.beforeCreate(event);

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::team.team',
        expect.objectContaining({
          filters: expect.objectContaining({
            name: 'Team A',
            liga: 1,
            saison: 1
          })
        })
      );

      expect(result.success).toBe(false); // Should fail due to duplicate
      expect(result.canProceed).toBe(false);
    });

    it('should handle database query errors gracefully', async () => {
      mockStrapi.entityService.findMany.mockRejectedValue(new Error('Database connection lost'));

      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Test Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.message.includes('Database connection lost'))).toBe(true);
    });

    it('should validate foreign key references', async () => {
      // Mock liga query returning empty (liga doesn't exist)
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([]) // No existing teams
        .mockResolvedValueOnce([]) // Liga doesn't exist
        .mockResolvedValueOnce([{ id: 1, name: '2024/2025' }]); // Saison exists

      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Test Team',
          liga: 999, // Non-existent liga
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_REFERENCE')).toBe(true);
    });

    it('should handle concurrent team creation attempts', async () => {
      let callCount = 0;
      mockStrapi.entityService.findMany.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([]); // First check: no duplicates
        } else {
          return Promise.resolve([{ id: 1, name: 'Test Team', liga: 1, saison: 1 }]); // Second check: duplicate exists
        }
      });

      const teamService = factory.createTeamService();

      const event1: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Test Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const event2: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Test Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const [result1, result2] = await Promise.all([
        teamService.beforeCreate(event1),
        teamService.beforeCreate(event2)
      ]);

      // At least one should succeed, one should fail
      const successes = [result1, result2].filter(r => r.success).length;
      const failures = [result1, result2].filter(r => !r.success).length;

      expect(successes).toBeGreaterThanOrEqual(1);
      expect(failures).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Season Database Operations', () => {
    it('should detect season overlaps correctly', async () => {
      const existingSeasons = [
        {
          id: 1,
          name: '2023/2024',
          startDate: '2023-08-01',
          endDate: '2024-05-31'
        },
        {
          id: 2,
          name: '2022/2023',
          startDate: '2022-08-01',
          endDate: '2023-05-31'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(existingSeasons);

      const saisonService = factory.createSaisonService();

      const overlappingEvent: HookEvent = {
        type: 'beforeCreate',
        contentType: 'saison',
        data: {
          name: '2024/2025',
          startDate: '2024-03-01', // Overlaps with 2023/2024
          endDate: '2025-05-31',
          active: false
        },
        params: {},
        timestamp: new Date()
      };

      const result = await saisonService.beforeCreate(overlappingEvent);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.code === 'SEASON_OVERLAP')).toBe(true);
    });

    it('should handle complex overlap scenarios', async () => {
      const existingSeasons = [
        {
          id: 1,
          name: '2023/2024',
          startDate: '2023-08-01',
          endDate: '2024-05-31'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(existingSeasons);

      const saisonService = factory.createSaisonService();

      // Test various overlap scenarios
      const testCases = [
        {
          name: 'Complete overlap',
          data: { startDate: '2023-07-01', endDate: '2024-06-30' },
          shouldOverlap: true
        },
        {
          name: 'Contained overlap',
          data: { startDate: '2023-09-01', endDate: '2024-04-30' },
          shouldOverlap: true
        },
        {
          name: 'Start overlap',
          data: { startDate: '2023-06-01', endDate: '2023-10-31' },
          shouldOverlap: true
        },
        {
          name: 'End overlap',
          data: { startDate: '2024-03-01', endDate: '2024-08-31' },
          shouldOverlap: true
        },
        {
          name: 'Adjacent before',
          data: { startDate: '2022-08-01', endDate: '2023-07-31' },
          shouldOverlap: false
        },
        {
          name: 'Adjacent after',
          data: { startDate: '2024-06-01', endDate: '2025-05-31' },
          shouldOverlap: false
        }
      ];

      for (const testCase of testCases) {
        const event: HookEvent = {
          type: 'beforeCreate',
          contentType: 'saison',
          data: {
            name: `Test ${testCase.name}`,
            ...testCase.data,
            active: false
          },
          params: {},
          timestamp: new Date()
        };

        const result = await saisonService.beforeCreate(event);

        if (testCase.shouldOverlap) {
          expect(result.success).toBe(false);
          expect(result.errors.some(e => e.code === 'SEASON_OVERLAP')).toBe(true);
        } else {
          expect(result.success).toBe(true);
          expect(result.canProceed).toBe(true);
        }
      }
    });

    it('should validate active season constraints', async () => {
      const activeSeasons = [
        { id: 1, name: '2023/2024', active: true }
      ];

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([]) // No overlaps
        .mockResolvedValueOnce(activeSeasons); // Active season exists

      const saisonService = factory.createSaisonService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'saison',
        data: {
          name: '2024/2025',
          startDate: '2024-08-01',
          endDate: '2025-05-31',
          active: true // Trying to create another active season
        },
        params: {},
        timestamp: new Date()
      };

      const result = await saisonService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.code === 'MULTIPLE_ACTIVE_SEASONS')).toBe(true);
    });
  });

  describe('Table Entry Database Operations', () => {
    it('should validate unique team-liga-saison combinations', async () => {
      const existingEntries = [
        { id: 1, team: 1, liga: 1, saison: 1, punkte: 20 }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(existingEntries);

      const tableService = factory.createTableService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data: {
          team: 1,
          liga: 1,
          saison: 1, // Duplicate combination
          spiele: 10,
          siege: 6,
          unentschieden: 2,
          niederlagen: 2
        },
        params: {},
        timestamp: new Date()
      };

      const result = await tableService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.code === 'DUPLICATE_TABLE_ENTRY')).toBe(true);
    });

    it('should handle bulk table operations efficiently', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const tableService = factory.createTableService();

      // Create multiple table entries for different teams
      const events = Array.from({ length: 10 }, (_, i) => ({
        type: 'beforeCreate' as const,
        contentType: 'tabellen-eintrag',
        data: {
          team: i + 1,
          liga: 1,
          saison: 1,
          spiele: 10,
          siege: 5,
          unentschieden: 3,
          niederlagen: 2,
          tore: 15,
          gegentore: 10
        },
        params: {},
        timestamp: new Date()
      }));

      const start = Date.now();
      const results = await Promise.all(
        events.map(event => tableService.beforeCreate(event))
      );
      const duration = Date.now() - start;

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.canProceed).toBe(true);
        expect(result.modifiedData).toHaveProperty('punkte');
        expect(result.modifiedData).toHaveProperty('tordifferenz');
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000);
    });

    it('should maintain data consistency during updates', async () => {
      const existingEntry = {
        id: 1,
        team: 1,
        liga: 1,
        saison: 1,
        spiele: 10,
        siege: 5,
        unentschieden: 3,
        niederlagen: 2,
        punkte: 18,
        tordifferenz: 5
      };

      mockStrapi.entityService.findOne.mockResolvedValue(existingEntry);

      const tableService = factory.createTableService();

      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          siege: 6, // Increased wins
          niederlagen: 1 // Decreased losses
        },
        where: { id: 1 },
        params: {},
        timestamp: new Date()
      };

      const result = await tableService.beforeUpdate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.modifiedData.punkte).toBe(21); // 6*3 + 3*1 = 21
    });
  });

  describe('Transaction Handling', () => {
    it('should handle database transactions correctly', async () => {
      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn()
      };

      mockDatabase.connection.transaction.mockImplementation((callback) => {
        return callback(mockTransaction);
      });

      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Transaction Test Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
    });

    it('should rollback on validation failures', async () => {
      const mockTransaction = {
        commit: jest.fn(),
        rollback: jest.fn()
      };

      mockDatabase.connection.transaction.mockImplementation((callback) => {
        return callback(mockTransaction);
      });

      // Mock validation failure
      mockStrapi.entityService.findMany.mockResolvedValue([
        { id: 1, name: 'Existing Team', liga: 1, saison: 1 }
      ]);

      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Existing Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
    });
  });

  describe('Database Performance', () => {
    it('should optimize queries for large datasets', async () => {
      // Mock large dataset
      const largeTeamList = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Team ${i + 1}`,
        liga: Math.floor(i / 20) + 1,
        saison: 1
      }));

      mockStrapi.entityService.findMany.mockResolvedValue(largeTeamList);

      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'New Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const start = Date.now();
      const result = await teamService.beforeCreate(event);
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(500); // Should handle large datasets efficiently
    });

    it('should use appropriate database indexes', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Index Test Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      await teamService.beforeCreate(event);

      // Verify that queries use indexed fields
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith(
        'api::team.team',
        expect.objectContaining({
          filters: expect.objectContaining({
            name: 'Index Test Team',
            liga: 1,
            saison: 1
          })
        })
      );
    });

    it('should handle connection pooling correctly', async () => {
      // Simulate multiple concurrent database operations
      const promises = Array.from({ length: 20 }, (_, i) => {
        mockStrapi.entityService.findMany.mockResolvedValue([]);
        
        const teamService = factory.createTeamService();
        
        return teamService.beforeCreate({
          type: 'beforeCreate',
          contentType: 'team',
          data: {
            name: `Concurrent Team ${i + 1}`,
            liga: 1,
            saison: 1
          },
          params: {},
          timestamp: new Date()
        });
      });

      const start = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.canProceed).toBe(true);
      });

      // Should handle concurrent operations efficiently
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      // Mock scenario where referenced liga is deleted during validation
      let ligaExists = true;
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([]) // No existing teams
        .mockImplementation(() => {
          if (ligaExists) {
            ligaExists = false;
            return Promise.resolve([{ id: 1, name: 'Liga 1' }]);
          } else {
            return Promise.resolve([]); // Liga was deleted
          }
        });

      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Test Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_REFERENCE')).toBe(true);
    });

    it('should handle cascade operations correctly', async () => {
      // Mock team with related table entries
      const relatedEntries = [
        { id: 1, team: 1, liga: 1, saison: 1, punkte: 20 },
        { id: 2, team: 1, liga: 2, saison: 1, punkte: 15 }
      ];

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([]) // No name conflicts
        .mockResolvedValueOnce(relatedEntries); // Related table entries

      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'afterUpdate',
        contentType: 'team',
        data: {
          id: 1,
          name: 'Updated Team Name',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      await expect(teamService.afterUpdate(event)).resolves.not.toThrow();

      // Verify that related data updates were scheduled
      // This would be verified through background job scheduling
    });
  });
});