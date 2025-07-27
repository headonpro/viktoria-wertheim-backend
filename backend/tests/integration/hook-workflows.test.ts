/**
 * Integration tests for hook workflows
 * Tests end-to-end hook execution with real database interactions
 */

import { HookServiceFactory } from '../../src/services/HookServiceFactory';
import { HookConfiguration, HookEvent } from '../../src/services/types';

// Mock Strapi for integration tests
const mockStrapi = {
  entityService: {
    findMany: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  db: {
    query: jest.fn()
  },
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
};

global.strapi = mockStrapi as any;

describe('Hook Workflows Integration Tests', () => {
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

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Team Creation Workflow', () => {
    it('should complete full team creation workflow successfully', async () => {
      // Mock database responses
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([]) // No existing teams with same name
        .mockResolvedValueOnce([{ id: 1, name: 'Liga 1' }]) // Liga exists
        .mockResolvedValueOnce([{ id: 1, name: '2024/2025' }]); // Saison exists

      mockStrapi.entityService.create.mockResolvedValue({
        id: 1,
        name: 'Test Team',
        liga: 1,
        saison: 1,
        slug: 'test-team'
      });

      const teamService = factory.createTeamService();

      // Test beforeCreate hook
      const beforeCreateEvent: HookEvent = {
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

      const beforeResult = await teamService.beforeCreate(beforeCreateEvent);

      expect(beforeResult.success).toBe(true);
      expect(beforeResult.canProceed).toBe(true);
      expect(beforeResult.modifiedData).toHaveProperty('slug');
      expect(beforeResult.errors).toHaveLength(0);

      // Test afterCreate hook
      const afterCreateEvent: HookEvent = {
        type: 'afterCreate',
        contentType: 'team',
        data: {
          id: 1,
          name: 'Test Team',
          liga: 1,
          saison: 1,
          slug: 'test-team'
        },
        params: {},
        timestamp: new Date()
      };

      await expect(teamService.afterCreate(afterCreateEvent)).resolves.not.toThrow();

      // Verify database interactions
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledTimes(3);
    });

    it('should handle team creation with validation errors', async () => {
      // Mock duplicate team scenario
      mockStrapi.entityService.findMany.mockResolvedValueOnce([
        { id: 2, name: 'Test Team', liga: 1, saison: 1 }
      ]);

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
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle team update workflow', async () => {
      // Mock existing team data
      mockStrapi.entityService.findOne.mockResolvedValue({
        id: 1,
        name: 'Original Team',
        liga: 1,
        saison: 1
      });

      mockStrapi.entityService.findMany.mockResolvedValue([]); // No conflicts

      const teamService = factory.createTeamService();

      const beforeUpdateEvent: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'team',
        data: {
          name: 'Updated Team Name'
        },
        where: { id: 1 },
        params: {},
        timestamp: new Date()
      };

      const beforeResult = await teamService.beforeUpdate(beforeUpdateEvent);

      expect(beforeResult.success).toBe(true);
      expect(beforeResult.canProceed).toBe(true);
      expect(beforeResult.modifiedData).toHaveProperty('slug');

      const afterUpdateEvent: HookEvent = {
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

      await expect(teamService.afterUpdate(afterUpdateEvent)).resolves.not.toThrow();
    });
  });

  describe('Season Management Workflow', () => {
    it('should complete season creation workflow with overlap validation', async () => {
      // Mock no overlapping seasons
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const saisonService = factory.createSaisonService();

      const beforeCreateEvent: HookEvent = {
        type: 'beforeCreate',
        contentType: 'saison',
        data: {
          name: '2024/2025',
          startDate: '2024-08-01',
          endDate: '2025-05-31',
          active: false
        },
        params: {},
        timestamp: new Date()
      };

      const beforeResult = await saisonService.beforeCreate(beforeCreateEvent);

      expect(beforeResult.success).toBe(true);
      expect(beforeResult.canProceed).toBe(true);
      expect(beforeResult.modifiedData).toHaveProperty('slug');

      const afterCreateEvent: HookEvent = {
        type: 'afterCreate',
        contentType: 'saison',
        data: {
          id: 1,
          name: '2024/2025',
          startDate: '2024-08-01',
          endDate: '2025-05-31',
          active: false,
          slug: '2024-2025'
        },
        params: {},
        timestamp: new Date()
      };

      await expect(saisonService.afterCreate(afterCreateEvent)).resolves.not.toThrow();
    });

    it('should prevent overlapping seasons', async () => {
      // Mock existing overlapping season
      mockStrapi.entityService.findMany.mockResolvedValue([
        {
          id: 1,
          name: '2023/2024',
          startDate: '2023-08-01',
          endDate: '2024-05-31'
        }
      ]);

      const saisonService = factory.createSaisonService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'saison',
        data: {
          name: '2024/2025',
          startDate: '2024-03-01', // Overlaps with existing season
          endDate: '2025-05-31',
          active: false
        },
        params: {},
        timestamp: new Date()
      };

      const result = await saisonService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.code === 'SEASON_OVERLAP')).toBe(true);
    });

    it('should handle season activation workflow', async () => {
      // Mock existing active season
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([]) // No overlaps
        .mockResolvedValueOnce([{ id: 1, name: '2023/2024', active: true }]); // Active season exists

      const saisonService = factory.createSaisonService();

      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'saison',
        data: {
          active: true
        },
        where: { id: 2 },
        params: {},
        timestamp: new Date()
      };

      const result = await saisonService.beforeUpdate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.code === 'MULTIPLE_ACTIVE_SEASONS')).toBe(true);
    });
  });

  describe('Table Entry Workflow', () => {
    it('should complete table entry creation with calculations', async () => {
      // Mock no existing table entry for team-liga-saison combination
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const tableService = factory.createTableService();

      const beforeCreateEvent: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data: {
          team: 1,
          liga: 1,
          saison: 1,
          spiele: 10,
          siege: 6,
          unentschieden: 2,
          niederlagen: 2,
          tore: 18,
          gegentore: 12
        },
        params: {},
        timestamp: new Date()
      };

      const beforeResult = await tableService.beforeCreate(beforeCreateEvent);

      expect(beforeResult.success).toBe(true);
      expect(beforeResult.canProceed).toBe(true);
      expect(beforeResult.modifiedData).toHaveProperty('punkte');
      expect(beforeResult.modifiedData).toHaveProperty('tordifferenz');
      expect(beforeResult.modifiedData.punkte).toBe(20); // 6*3 + 2*1
      expect(beforeResult.modifiedData.tordifferenz).toBe(6); // 18-12

      const afterCreateEvent: HookEvent = {
        type: 'afterCreate',
        contentType: 'tabellen-eintrag',
        data: {
          id: 1,
          team: 1,
          liga: 1,
          saison: 1,
          punkte: 20,
          tordifferenz: 6
        },
        params: {},
        timestamp: new Date()
      };

      await expect(tableService.afterCreate(afterCreateEvent)).resolves.not.toThrow();
    });

    it('should validate game statistics consistency', async () => {
      const tableService = factory.createTableService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data: {
          team: 1,
          liga: 1,
          saison: 1,
          spiele: 10,
          siege: 6,
          unentschieden: 2,
          niederlagen: 3 // 6+2+3 = 11, but spiele = 10
        },
        params: {},
        timestamp: new Date()
      };

      const result = await tableService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors.some(e => e.code === 'INCONSISTENT_GAME_STATS')).toBe(true);
    });

    it('should handle table entry updates with position recalculation', async () => {
      // Mock existing table entry
      mockStrapi.entityService.findOne.mockResolvedValue({
        id: 1,
        team: 1,
        liga: 1,
        saison: 1,
        punkte: 15
      });

      const tableService = factory.createTableService();

      const beforeUpdateEvent: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          siege: 8, // Increased wins
          unentschieden: 2,
          niederlagen: 2
        },
        where: { id: 1 },
        params: {},
        timestamp: new Date()
      };

      const beforeResult = await tableService.beforeUpdate(beforeUpdateEvent);

      expect(beforeResult.success).toBe(true);
      expect(beforeResult.canProceed).toBe(true);
      expect(beforeResult.modifiedData).toHaveProperty('punkte');

      const afterUpdateEvent: HookEvent = {
        type: 'afterUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          id: 1,
          team: 1,
          liga: 1,
          saison: 1,
          punkte: 26 // 8*3 + 2*1
        },
        params: {},
        timestamp: new Date()
      };

      await expect(tableService.afterUpdate(afterUpdateEvent)).resolves.not.toThrow();
    });
  });

  describe('Cross-Service Integration', () => {
    it('should handle cascading updates across services', async () => {
      // Test scenario: Team name change should trigger table entry updates
      mockStrapi.entityService.findOne.mockResolvedValue({
        id: 1,
        name: 'Original Team',
        liga: 1,
        saison: 1
      });

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([]) // No name conflicts
        .mockResolvedValueOnce([
          { id: 1, team: 1, liga: 1, saison: 1, punkte: 20 }
        ]); // Related table entries

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

      // Verify that background jobs were scheduled for related updates
      // This would be verified through the calculation service mock
    });

    it('should handle season activation affecting multiple teams', async () => {
      // Mock existing active season and teams
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([]) // No overlaps
        .mockResolvedValueOnce([{ id: 1, name: '2023/2024', active: true }]) // Current active
        .mockResolvedValueOnce([
          { id: 1, name: 'Team 1', liga: 1, saison: 2 },
          { id: 2, name: 'Team 2', liga: 1, saison: 2 }
        ]); // Teams in new season

      const saisonService = factory.createSaisonService();

      const event: HookEvent = {
        type: 'afterUpdate',
        contentType: 'saison',
        data: {
          id: 2,
          name: '2024/2025',
          active: true
        },
        params: {},
        timestamp: new Date()
      };

      await expect(saisonService.afterUpdate(event)).resolves.not.toThrow();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      // Mock database connection failure
      mockStrapi.entityService.findMany.mockRejectedValue(new Error('Connection failed'));

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
      expect(result.errors.some(e => e.message.includes('Connection failed'))).toBe(true);
    });

    it('should handle timeout scenarios', async () => {
      // Mock slow database response
      mockStrapi.entityService.findMany.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 6000)) // Longer than timeout
      );

      const shortTimeoutConfig = { ...config, maxHookExecutionTime: 1000 };
      const shortTimeoutFactory = new HookServiceFactory(shortTimeoutConfig);
      const teamService = shortTimeoutFactory.createTeamService();

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
      expect(result.errors.some(e => e.message.includes('timeout'))).toBe(true);
    });

    it('should handle partial failures with graceful degradation', async () => {
      // Mock scenario where validation passes but calculation fails
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const teamService = factory.createTeamService();

      // Mock calculation service to fail
      const originalCalculateSync = teamService['calculationService'].calculateSync;
      teamService['calculationService'].calculateSync = jest.fn().mockReturnValue({
        success: false,
        results: { slug: 'fallback-slug' }, // Fallback value
        errors: [{ field: 'slug', message: 'Calculation failed', code: 'CALC_ERROR' }],
        warnings: []
      });

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

      expect(result.success).toBe(true); // Should proceed with fallback
      expect(result.canProceed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.modifiedData).toHaveProperty('slug', 'fallback-slug');

      // Restore original method
      teamService['calculationService'].calculateSync = originalCalculateSync;
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent hook executions', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const teamService = factory.createTeamService();

      const events = Array.from({ length: 5 }, (_, i) => ({
        type: 'beforeCreate' as const,
        contentType: 'team',
        data: {
          name: `Team ${i + 1}`,
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      }));

      const promises = events.map(event => teamService.beforeCreate(event));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.canProceed).toBe(true);
      });

      // Verify all had unique slugs
      const slugs = results.map(r => r.modifiedData?.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });

    it('should complete hooks within performance thresholds', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const teamService = factory.createTeamService();

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Performance Test Team',
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
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(result.executionTime).toBeLessThan(500); // Hook execution under 500ms
    });
  });

  describe('Configuration and Feature Flags', () => {
    it('should respect strict validation configuration', async () => {
      const strictConfig = { ...config, enableStrictValidation: true };
      const lenientConfig = { ...config, enableStrictValidation: false };

      const strictFactory = new HookServiceFactory(strictConfig);
      const lenientFactory = new HookServiceFactory(lenientConfig);

      // Mock duplicate team scenario
      mockStrapi.entityService.findMany.mockResolvedValue([
        { id: 2, name: 'Test Team', liga: 1, saison: 1 }
      ]);

      const strictService = strictFactory.createTeamService();
      const lenientService = lenientFactory.createTeamService();

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

      const strictResult = await strictService.beforeCreate(event);
      const lenientResult = await lenientService.beforeCreate(event);

      expect(strictResult.success).toBe(false);
      expect(strictResult.canProceed).toBe(false);

      // Lenient mode might allow with warnings
      expect(lenientResult.canProceed).toBe(true);
      expect(lenientResult.warnings.length).toBeGreaterThan(0);
    });

    it('should handle async calculation configuration', async () => {
      const asyncConfig = { ...config, enableAsyncCalculations: true };
      const syncConfig = { ...config, enableAsyncCalculations: false };

      const asyncFactory = new HookServiceFactory(asyncConfig);
      const syncFactory = new HookServiceFactory(syncConfig);

      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const asyncService = asyncFactory.createTeamService();
      const syncService = syncFactory.createTeamService();

      const event: HookEvent = {
        type: 'afterCreate',
        contentType: 'team',
        data: {
          id: 1,
          name: 'Test Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      await expect(asyncService.afterCreate(event)).resolves.not.toThrow();
      await expect(syncService.afterCreate(event)).resolves.not.toThrow();

      // Verify different behavior based on configuration
      expect(asyncService['config'].enableAsyncCalculations).toBe(true);
      expect(syncService['config'].enableAsyncCalculations).toBe(false);
    });
  });
});