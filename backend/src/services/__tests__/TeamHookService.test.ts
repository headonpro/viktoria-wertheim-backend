/**
 * Unit tests for TeamHookService
 * Tests team-specific hook operations, validations, and calculations
 */

import { TeamHookService } from '../TeamHookService';
import { HookEvent, HookResult, HookConfiguration } from '../types';
import { ValidationService } from '../ValidationService';
import { CalculationService } from '../CalculationService';

// Mock dependencies
jest.mock('../ValidationService');
jest.mock('../CalculationService');

describe('TeamHookService', () => {
  let service: TeamHookService;
  let mockValidationService: jest.Mocked<ValidationService>;
  let mockCalculationService: jest.Mocked<CalculationService>;
  let mockConfig: HookConfiguration;

  beforeEach(() => {
    mockConfig = {
      enableStrictValidation: true,
      enableAsyncCalculations: true,
      maxHookExecutionTime: 1000,
      retryAttempts: 3,
      timeoutMs: 5000
    };

    mockValidationService = new ValidationService() as jest.Mocked<ValidationService>;
    mockCalculationService = new CalculationService() as jest.Mocked<CalculationService>;

    service = new TeamHookService(mockConfig);
    service['validationService'] = mockValidationService;
    service['calculationService'] = mockCalculationService;
  });

  describe('beforeCreate', () => {
    it('should validate team data before creation', async () => {
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

      mockValidationService.validateCritical.mockReturnValue({
        isValid: true,
        canProceed: true,
        errors: [],
        warnings: []
      });

      mockCalculationService.calculateSync.mockReturnValue({
        success: true,
        results: {
          slug: 'test-team'
        },
        errors: [],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(mockValidationService.validateCritical).toHaveBeenCalled();
      expect(mockCalculationService.calculateSync).toHaveBeenCalled();
    });

    it('should block creation for critical validation errors', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: '',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'name',
            message: 'Team name is required',
            code: 'REQUIRED_FIELD'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Team name is required');
    });

    it('should proceed with warnings for non-critical validation issues', async () => {
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

      mockValidationService.validateCritical.mockReturnValue({
        isValid: true,
        canProceed: true,
        errors: [],
        warnings: []
      });

      mockValidationService.validateWarning.mockReturnValue({
        isValid: false,
        canProceed: true,
        errors: [],
        warnings: [
          {
            field: 'description',
            message: 'Team description is recommended',
            code: 'RECOMMENDED_FIELD'
          }
        ]
      });

      mockCalculationService.calculateSync.mockReturnValue({
        success: true,
        results: { slug: 'test-team' },
        errors: [],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toHaveLength(1);
    });

    it('should calculate team slug automatically', async () => {
      const event: HookEvent = {
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

      mockValidationService.validateCritical.mockReturnValue({
        isValid: true,
        canProceed: true,
        errors: [],
        warnings: []
      });

      mockCalculationService.calculateSync.mockReturnValue({
        success: true,
        results: {
          slug: 'test-team-fc'
        },
        errors: [],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.modifiedData).toHaveProperty('slug', 'test-team-fc');
      expect(mockCalculationService.calculateSync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ field: 'slug' })
        ])
      );
    });

    it('should validate team-liga-saison uniqueness', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'Duplicate Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'name',
            message: 'Team already exists in this liga and saison',
            code: 'DUPLICATE_TEAM'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors[0].code).toBe('DUPLICATE_TEAM');
    });
  });

  describe('beforeUpdate', () => {
    it('should validate team data before update', async () => {
      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'team',
        data: {
          name: 'Updated Team Name'
        },
        where: { id: 1 },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: true,
        canProceed: true,
        errors: [],
        warnings: []
      });

      mockCalculationService.calculateSync.mockReturnValue({
        success: true,
        results: {
          slug: 'updated-team-name'
        },
        errors: [],
        warnings: []
      });

      const result = await service.beforeUpdate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.modifiedData).toHaveProperty('slug', 'updated-team-name');
    });

    it('should prevent updates that would create duplicates', async () => {
      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'team',
        data: {
          name: 'Existing Team Name'
        },
        where: { id: 1 },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'name',
            message: 'Another team with this name already exists',
            code: 'DUPLICATE_NAME'
          }
        ],
        warnings: []
      });

      const result = await service.beforeUpdate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors[0].code).toBe('DUPLICATE_NAME');
    });

    it('should handle partial updates correctly', async () => {
      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'team',
        data: {
          description: 'Updated description only'
        },
        where: { id: 1 },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: true,
        canProceed: true,
        errors: [],
        warnings: []
      });

      mockCalculationService.calculateSync.mockReturnValue({
        success: true,
        results: {},
        errors: [],
        warnings: []
      });

      const result = await service.beforeUpdate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
    });
  });

  describe('afterCreate', () => {
    it('should schedule async calculations after team creation', async () => {
      const event: HookEvent = {
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

      mockCalculationService.scheduleAsync.mockReturnValue(['job-1', 'job-2']);

      await service.afterCreate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ name: 'team-statistics' }),
          expect.objectContaining({ name: 'team-ranking' })
        ])
      );
    });

    it('should handle async calculation scheduling errors gracefully', async () => {
      const event: HookEvent = {
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

      mockCalculationService.scheduleAsync.mockImplementation(() => {
        throw new Error('Job scheduling failed');
      });

      // Should not throw error
      await expect(service.afterCreate(event)).resolves.not.toThrow();
    });
  });

  describe('afterUpdate', () => {
    it('should recalculate dependent data after team update', async () => {
      const event: HookEvent = {
        type: 'afterUpdate',
        contentType: 'team',
        data: {
          id: 1,
          name: 'Updated Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockReturnValue(['job-1']);

      await service.afterUpdate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ name: 'team-statistics-update' })
        ])
      );
    });

    it('should update related table entries when team data changes', async () => {
      const event: HookEvent = {
        type: 'afterUpdate',
        contentType: 'team',
        data: {
          id: 1,
          name: 'Updated Team',
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockReturnValue(['job-1', 'job-2']);

      await service.afterUpdate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ name: 'update-table-entries' })
        ])
      );
    });
  });

  describe('team validation rules', () => {
    it('should validate team name requirements', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: {
          name: 'A', // Too short
          liga: 1,
          saison: 1
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'name',
            message: 'Team name must be at least 2 characters long',
            code: 'MIN_LENGTH'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('MIN_LENGTH');
    });

    it('should validate liga and saison references', async () => {
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

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'liga',
            message: 'Liga does not exist',
            code: 'INVALID_REFERENCE'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_REFERENCE');
    });
  });

  describe('team calculations', () => {
    it('should calculate team statistics correctly', async () => {
      const teamData = {
        id: 1,
        name: 'Test Team',
        tabellenEintraege: [
          { punkte: 30, tore: 25, gegentore: 15 },
          { punkte: 25, tore: 20, gegentore: 18 }
        ]
      };

      mockCalculationService.calculateSync.mockReturnValue({
        success: true,
        results: {
          totalPoints: 55,
          totalGoals: 45,
          totalGoalsAgainst: 33,
          goalDifference: 12
        },
        errors: [],
        warnings: []
      });

      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'team',
        data: teamData,
        params: {},
        timestamp: new Date()
      };

      const result = await service.beforeUpdate(event);

      expect(result.modifiedData).toHaveProperty('totalPoints', 55);
      expect(result.modifiedData).toHaveProperty('goalDifference', 12);
    });

    it('should handle calculation errors gracefully', async () => {
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

      mockValidationService.validateCritical.mockReturnValue({
        isValid: true,
        canProceed: true,
        errors: [],
        warnings: []
      });

      mockCalculationService.calculateSync.mockReturnValue({
        success: false,
        results: {},
        errors: [
          {
            field: 'slug',
            message: 'Failed to generate slug',
            code: 'CALCULATION_ERROR'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(true); // Should proceed with warnings
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should handle service initialization errors', () => {
      const invalidConfig = null as any;

      expect(() => new TeamHookService(invalidConfig)).toThrow();
    });

    it('should handle timeout errors gracefully', async () => {
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

      // Mock a slow validation that times out
      mockValidationService.validateCritical.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({
            isValid: true,
            canProceed: true,
            errors: [],
            warnings: []
          }), 2000);
        }) as any;
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors[0].message).toContain('timeout');
    });
  });

  describe('configuration handling', () => {
    it('should respect strict validation setting', async () => {
      const strictConfig = { ...mockConfig, enableStrictValidation: true };
      const lenientConfig = { ...mockConfig, enableStrictValidation: false };

      const strictService = new TeamHookService(strictConfig);
      const lenientService = new TeamHookService(lenientConfig);

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

      // Both services should behave differently based on config
      expect(strictService['config'].enableStrictValidation).toBe(true);
      expect(lenientService['config'].enableStrictValidation).toBe(false);
    });

    it('should respect async calculation setting', async () => {
      const asyncConfig = { ...mockConfig, enableAsyncCalculations: true };
      const syncConfig = { ...mockConfig, enableAsyncCalculations: false };

      const asyncService = new TeamHookService(asyncConfig);
      const syncService = new TeamHookService(syncConfig);

      expect(asyncService['config'].enableAsyncCalculations).toBe(true);
      expect(syncService['config'].enableAsyncCalculations).toBe(false);
    });
  });
});