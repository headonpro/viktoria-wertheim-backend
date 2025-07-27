/**
 * Service interaction integration tests
 * Tests how different hook services interact with each other and shared services
 */

import { HookServiceFactory } from '../../src/services/HookServiceFactory';
import { ValidationService } from '../../src/services/ValidationService';
import { CalculationService } from '../../src/services/CalculationService';
import { HookConfiguration, HookEvent } from '../../src/services/types';

// Mock Strapi
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

describe('Service Interaction Integration Tests', () => {
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

  describe('Shared Service Dependencies', () => {
    it('should share validation service between hook services', () => {
      const teamService = factory.createTeamService();
      const saisonService = factory.createSaisonService();
      const tableService = factory.createTableService();

      // All services should share the same validation service instance
      expect(teamService['validationService']).toBe(saisonService['validationService']);
      expect(saisonService['validationService']).toBe(tableService['validationService']);
    });

    it('should share calculation service between hook services', () => {
      const teamService = factory.createTeamService();
      const saisonService = factory.createSaisonService();
      const tableService = factory.createTableService();

      // All services should share the same calculation service instance
      expect(teamService['calculationService']).toBe(saisonService['calculationService']);
      expect(saisonService['calculationService']).toBe(tableService['calculationService']);
    });

    it('should propagate configuration changes to all services', () => {
      const teamService = factory.createTeamService();
      const saisonService = factory.createSaisonService();

      const newConfig: HookConfiguration = {
        enableStrictValidation: false,
        enableAsyncCalculations: false,
        maxHookExecutionTime: 2000,
        retryAttempts: 5,
        timeoutMs: 8000
      };

      factory.updateConfig(newConfig);

      // New services should use updated config
      const newTeamService = factory.createTeamService();
      const newSaisonService = factory.createSaisonService();

      expect(newTeamService['config']).toEqual(newConfig);
      expect(newSaisonService['config']).toEqual(newConfig);

      // Old services should not be affected (they're cleared from registry)
      expect(newTeamService).not.toBe(teamService);
      expect(newSaisonService).not.toBe(saisonService);
    });
  });

  describe('Cross-Service Data Dependencies', () => {
    it('should handle team creation affecting table entries', async () => {
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([]) // No existing teams
        .mockResolvedValueOnce([{ id: 1, name: 'Liga 1' }]) // Liga exists
        .mockResolvedValueOnce([{ id: 1, name: '2024/2025' }]); // Saison exists

      const teamService = factory.createTeamService();

      const teamCreateEvent: HookEvent = {
        type: 'afterCreate',
        contentType: 'team',
        data: {
          id: 1,
          name: 'New Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      await teamService.afterCreate(teamCreateEvent);

      // Verify that background jobs were scheduled for table initialization
      // This would typically create an empty table entry for the new team
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled background calculations'),
        expect.any(Object)
      );
    });

    it('should handle season activation affecting multiple teams', async () => {
      const mockTeams = [
        { id: 1, name: 'Team A', liga: 1, saison: 2 },
        { id: 2, name: 'Team B', liga: 1, saison: 2 },
        { id: 3, name: 'Team C', liga: 2, saison: 2 }
      ];

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([]) // No overlapping seasons
        .mockResolvedValueOnce([{ id: 1, name: '2023/2024', active: true }]) // Current active season
        .mockResolvedValueOnce(mockTeams); // Teams in new season

      const saisonService = factory.createSaisonService();

      const seasonActivationEvent: HookEvent = {
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

      await saisonService.afterUpdate(seasonActivationEvent);

      // Should schedule jobs to:
      // 1. Deactivate other seasons
      // 2. Update team statistics for new active season
      // 3. Recalculate league standings
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled background calculations'),
        expect.objectContaining({
          jobs: expect.arrayContaining([
            expect.stringContaining('deactivate-other-seasons'),
            expect.stringContaining('activate-season-data')
          ])
        })
      );
    });

    it('should handle table entry updates affecting team statistics', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const tableService = factory.createTableService();

      const tableUpdateEvent: HookEvent = {
        type: 'afterUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          id: 1,
          team: 1,
          liga: 1,
          saison: 1,
          punkte: 30, // Significant point increase
          tordifferenz: 15
        },
        params: {},
        timestamp: new Date()
      };

      await tableService.afterUpdate(tableUpdateEvent);

      // Should schedule jobs to:
      // 1. Recalculate table positions for the league
      // 2. Update team statistics
      // 3. Update league-wide statistics
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled background calculations'),
        expect.objectContaining({
          jobs: expect.arrayContaining([
            expect.stringContaining('recalculate-table-positions'),
            expect.stringContaining('update-team-statistics')
          ])
        })
      );
    });
  });

  describe('Validation Rule Interactions', () => {
    it('should apply team validation rules consistently across services', async () => {
      const teamService = factory.createTeamService();
      const tableService = factory.createTableService();

      // Mock team validation failure
      mockStrapi.entityService.findMany.mockResolvedValue([
        { id: 1, name: 'Existing Team', liga: 1, saison: 1 }
      ]);

      const teamEvent: HookEvent = {
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

      const teamResult = await teamService.beforeCreate(teamEvent);

      // Team creation should fail due to duplicate
      expect(teamResult.success).toBe(false);
      expect(teamResult.canProceed).toBe(false);

      // Table entry creation should also validate team reference
      const tableEvent: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data: {
          team: 999, // Non-existent team
          liga: 1,
          saison: 1,
          spiele: 10,
          siege: 5,
          unentschieden: 3,
          niederlagen: 2
        },
        params: {},
        timestamp: new Date()
      };

      const tableResult = await tableService.beforeCreate(tableEvent);

      expect(tableResult.success).toBe(false);
      expect(tableResult.canProceed).toBe(false);
      expect(tableResult.errors.some(e => e.code === 'INVALID_REFERENCE')).toBe(true);
    });

    it('should handle validation rule dependencies correctly', async () => {
      // Mock scenario where team name validation depends on liga validation
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
          liga: 999, // Invalid liga
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const result = await teamService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);

      // Should fail on liga reference validation before checking team uniqueness
      expect(result.errors.some(e => e.code === 'INVALID_REFERENCE')).toBe(true);
    });
  });

  describe('Calculation Service Interactions', () => {
    it('should coordinate sync and async calculations across services', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const teamService = factory.createTeamService();
      const tableService = factory.createTableService();

      // Team creation should trigger sync slug calculation
      const teamEvent: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Test Team FC',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      const teamResult = await teamService.beforeCreate(teamEvent);

      expect(teamResult.success).toBe(true);
      expect(teamResult.modifiedData).toHaveProperty('slug');

      // Table entry creation should trigger sync point calculations
      const tableEvent: HookEvent = {
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

      const tableResult = await tableService.beforeCreate(tableEvent);

      expect(tableResult.success).toBe(true);
      expect(tableResult.modifiedData).toHaveProperty('punkte');
      expect(tableResult.modifiedData).toHaveProperty('tordifferenz');

      // Both should use the same calculation service instance
      expect(teamService['calculationService']).toBe(tableService['calculationService']);
    });

    it('should handle calculation dependencies between services', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const tableService = factory.createTableService();

      // Table entry update should trigger cascading calculations
      const tableUpdateEvent: HookEvent = {
        type: 'afterUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          id: 1,
          team: 1,
          liga: 1,
          saison: 1,
          punkte: 35, // Significant change
          tordifferenz: 20
        },
        params: {},
        timestamp: new Date()
      };

      await tableService.afterUpdate(tableUpdateEvent);

      // Should schedule calculations that affect:
      // 1. Team statistics (team service domain)
      // 2. League standings (table service domain)
      // 3. Season statistics (season service domain)
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Scheduled background calculations'),
        expect.objectContaining({
          jobs: expect.arrayContaining([
            expect.stringContaining('recalculate-table-positions'),
            expect.stringContaining('update-team-statistics')
          ])
        })
      );
    });

    it('should handle calculation errors gracefully across services', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const teamService = factory.createTeamService();

      // Mock calculation service to fail for slug generation
      const originalCalculateSync = teamService['calculationService'].calculateSync;
      teamService['calculationService'].calculateSync = jest.fn().mockReturnValue({
        success: false,
        results: { slug: 'fallback-slug' },
        errors: [{ field: 'slug', message: 'Slug generation failed', code: 'CALC_ERROR' }],
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

      // Should proceed with fallback value and warning
      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.modifiedData).toHaveProperty('slug', 'fallback-slug');

      // Restore original method
      teamService['calculationService'].calculateSync = originalCalculateSync;
    });
  });

  describe('Error Propagation and Recovery', () => {
    it('should isolate errors between services', async () => {
      const teamService = factory.createTeamService();
      const saisonService = factory.createSaisonService();

      // Mock team service to fail
      mockStrapi.entityService.findMany
        .mockRejectedValueOnce(new Error('Team service database error'))
        .mockResolvedValueOnce([]); // Season service should still work

      const teamEvent: HookEvent = {
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

      const seasonEvent: HookEvent = {
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

      const [teamResult, seasonResult] = await Promise.all([
        teamService.beforeCreate(teamEvent),
        saisonService.beforeCreate(seasonEvent)
      ]);

      // Team service should fail
      expect(teamResult.success).toBe(false);
      expect(teamResult.errors.some(e => e.message.includes('database error'))).toBe(true);

      // Season service should succeed
      expect(seasonResult.success).toBe(true);
      expect(seasonResult.canProceed).toBe(true);
    });

    it('should handle shared service failures gracefully', async () => {
      const teamService = factory.createTeamService();
      const tableService = factory.createTableService();

      // Mock shared validation service to fail
      const originalValidateCritical = teamService['validationService'].validateCritical;
      teamService['validationService'].validateCritical = jest.fn().mockImplementation(() => {
        throw new Error('Validation service failure');
      });

      const teamEvent: HookEvent = {
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

      const tableEvent: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data: {
          team: 1,
          liga: 1,
          saison: 1,
          spiele: 10,
          siege: 5,
          unentschieden: 3,
          niederlagen: 2
        },
        params: {},
        timestamp: new Date()
      };

      const [teamResult, tableResult] = await Promise.all([
        teamService.beforeCreate(teamEvent),
        tableService.beforeCreate(tableEvent)
      ]);

      // Both should fail gracefully due to shared service failure
      expect(teamResult.success).toBe(false);
      expect(tableResult.success).toBe(false);

      expect(teamResult.errors.some(e => e.message.includes('Validation service failure'))).toBe(true);
      expect(tableResult.errors.some(e => e.message.includes('Validation service failure'))).toBe(true);

      // Restore original method
      teamService['validationService'].validateCritical = originalValidateCritical;
    });
  });

  describe('Performance and Resource Sharing', () => {
    it('should share resources efficiently between services', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const services = [
        factory.createTeamService(),
        factory.createSaisonService(),
        factory.createTableService()
      ];

      // All services should share the same validation and calculation service instances
      const validationService = services[0]['validationService'];
      const calculationService = services[0]['calculationService'];

      services.forEach(service => {
        expect(service['validationService']).toBe(validationService);
        expect(service['calculationService']).toBe(calculationService);
      });

      // Create multiple events for different services
      const events = [
        {
          service: services[0],
          event: {
            type: 'beforeCreate' as const,
            contentType: 'team',
            data: { name: 'Team 1', liga: 1, saison: 1 },
            params: {},
            timestamp: new Date()
          }
        },
        {
          service: services[1],
          event: {
            type: 'beforeCreate' as const,
            contentType: 'saison',
            data: { name: '2024/2025', startDate: '2024-08-01', endDate: '2025-05-31', active: false },
            params: {},
            timestamp: new Date()
          }
        },
        {
          service: services[2],
          event: {
            type: 'beforeCreate' as const,
            contentType: 'tabellen-eintrag',
            data: { team: 1, liga: 1, saison: 1, spiele: 10, siege: 5, unentschieden: 3, niederlagen: 2 },
            params: {},
            timestamp: new Date()
          }
        }
      ];

      const start = Date.now();
      const results = await Promise.all(
        events.map(({ service, event }) => service.beforeCreate(event))
      );
      const duration = Date.now() - start;

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.canProceed).toBe(true);
      });

      // Should complete efficiently due to resource sharing
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent access to shared services', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const teamService = factory.createTeamService();

      // Create many concurrent requests
      const events = Array.from({ length: 50 }, (_, i) => ({
        type: 'beforeCreate' as const,
        contentType: 'team',
        data: {
          name: `Concurrent Team ${i + 1}`,
          liga: Math.floor(i / 10) + 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      }));

      const start = Date.now();
      const results = await Promise.all(
        events.map(event => teamService.beforeCreate(event))
      );
      const duration = Date.now() - start;

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.canProceed).toBe(true);
      });

      // Should handle concurrent access efficiently
      expect(duration).toBeLessThan(2000);

      // All should have unique slugs
      const slugs = results.map(r => r.modifiedData?.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });
  });

  describe('Configuration Consistency', () => {
    it('should maintain configuration consistency across all services', () => {
      const services = [
        factory.createTeamService(),
        factory.createSaisonService(),
        factory.createTableService()
      ];

      // All services should have the same configuration
      services.forEach(service => {
        expect(service['config']).toEqual(config);
      });

      // Update configuration
      const newConfig: HookConfiguration = {
        enableStrictValidation: false,
        enableAsyncCalculations: false,
        maxHookExecutionTime: 2000,
        retryAttempts: 5,
        timeoutMs: 8000
      };

      factory.updateConfig(newConfig);

      // New services should use updated configuration
      const newServices = [
        factory.createTeamService(),
        factory.createSaisonService(),
        factory.createTableService()
      ];

      newServices.forEach(service => {
        expect(service['config']).toEqual(newConfig);
      });
    });

    it('should propagate feature flag changes to all services', async () => {
      // Test with strict validation disabled
      const lenientConfig = { ...config, enableStrictValidation: false };
      const lenientFactory = new HookServiceFactory(lenientConfig);

      const lenientTeamService = lenientFactory.createTeamService();
      const lenientSaisonService = lenientFactory.createSaisonService();

      // Mock duplicate scenarios
      mockStrapi.entityService.findMany.mockResolvedValue([
        { id: 1, name: 'Existing Team', liga: 1, saison: 1 }
      ]);

      const teamEvent: HookEvent = {
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

      const result = await lenientTeamService.beforeCreate(teamEvent);

      // With lenient validation, should proceed with warnings
      expect(result.canProceed).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});