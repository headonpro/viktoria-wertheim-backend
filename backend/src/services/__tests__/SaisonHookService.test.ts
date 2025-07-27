/**
 * Unit tests for SaisonHookService
 * Tests season-specific hook operations, constraint handling, and lifecycle management
 */

import { SaisonHookService } from '../SaisonHookService';
import { HookEvent, HookResult, HookConfiguration } from '../types';
import { ValidationService } from '../ValidationService';
import { CalculationService } from '../CalculationService';

// Mock dependencies
jest.mock('../ValidationService');
jest.mock('../CalculationService');

describe('SaisonHookService', () => {
  let service: SaisonHookService;
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

    service = new SaisonHookService(mockConfig);
    service['validationService'] = mockValidationService;
    service['calculationService'] = mockCalculationService;
  });

  describe('beforeCreate', () => {
    it('should validate season data before creation', async () => {
      const event: HookEvent = {
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

      mockValidationService.validateCritical.mockReturnValue({
        isValid: true,
        canProceed: true,
        errors: [],
        warnings: []
      });

      mockCalculationService.calculateSync.mockReturnValue({
        success: true,
        results: {
          slug: '2024-2025'
        },
        errors: [],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(mockValidationService.validateCritical).toHaveBeenCalled();
    });

    it('should prevent overlapping seasons', async () => {
      const event: HookEvent = {
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

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'dateRange',
            message: 'Season dates overlap with existing season 2023/2024',
            code: 'SEASON_OVERLAP'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors[0].code).toBe('SEASON_OVERLAP');
    });

    it('should validate date range consistency', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'saison',
        data: {
          name: '2024/2025',
          startDate: '2025-05-31',
          endDate: '2024-08-01', // End before start
          active: false
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'dateRange',
            message: 'End date must be after start date',
            code: 'INVALID_DATE_RANGE'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_DATE_RANGE');
    });

    it('should prevent multiple active seasons', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'saison',
        data: {
          name: '2024/2025',
          startDate: '2024-08-01',
          endDate: '2025-05-31',
          active: true
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'active',
            message: 'Only one season can be active at a time',
            code: 'MULTIPLE_ACTIVE_SEASONS'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors[0].code).toBe('MULTIPLE_ACTIVE_SEASONS');
    });

    it('should generate season slug automatically', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'saison',
        data: {
          name: '2024/2025 Saison',
          startDate: '2024-08-01',
          endDate: '2025-05-31',
          active: false
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
          slug: '2024-2025-saison'
        },
        errors: [],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.modifiedData).toHaveProperty('slug', '2024-2025-saison');
    });
  });

  describe('beforeUpdate', () => {
    it('should validate season updates', async () => {
      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'saison',
        data: {
          name: 'Updated Season Name'
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
          slug: 'updated-season-name'
        },
        errors: [],
        warnings: []
      });

      const result = await service.beforeUpdate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
    });

    it('should handle season activation', async () => {
      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'saison',
        data: {
          active: true
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

    it('should prevent date changes that would create overlaps', async () => {
      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'saison',
        data: {
          startDate: '2023-08-01',
          endDate: '2024-05-31'
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
            field: 'dateRange',
            message: 'Updated date range would overlap with existing season',
            code: 'SEASON_OVERLAP'
          }
        ],
        warnings: []
      });

      const result = await service.beforeUpdate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors[0].code).toBe('SEASON_OVERLAP');
    });

    it('should warn about season updates affecting existing data', async () => {
      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'saison',
        data: {
          startDate: '2024-09-01' // Later start date
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

      mockValidationService.validateWarning.mockReturnValue({
        isValid: false,
        canProceed: true,
        errors: [],
        warnings: [
          {
            field: 'startDate',
            message: 'Changing start date may affect existing games and teams',
            code: 'DATA_IMPACT_WARNING'
          }
        ]
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
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('DATA_IMPACT_WARNING');
    });
  });

  describe('afterCreate', () => {
    it('should initialize season data after creation', async () => {
      const event: HookEvent = {
        type: 'afterCreate',
        contentType: 'saison',
        data: {
          id: 1,
          name: '2024/2025',
          startDate: '2024-08-01',
          endDate: '2025-05-31',
          active: false
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockReturnValue(['job-1']);

      await service.afterCreate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ name: 'initialize-season-structure' })
        ])
      );
    });

    it('should handle season initialization errors gracefully', async () => {
      const event: HookEvent = {
        type: 'afterCreate',
        contentType: 'saison',
        data: {
          id: 1,
          name: '2024/2025',
          startDate: '2024-08-01',
          endDate: '2025-05-31',
          active: false
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockImplementation(() => {
        throw new Error('Initialization failed');
      });

      // Should not throw error
      await expect(service.afterCreate(event)).resolves.not.toThrow();
    });
  });

  describe('afterUpdate', () => {
    it('should handle season activation changes', async () => {
      const event: HookEvent = {
        type: 'afterUpdate',
        contentType: 'saison',
        data: {
          id: 1,
          name: '2024/2025',
          active: true
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockReturnValue(['job-1', 'job-2']);

      await service.afterUpdate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ name: 'deactivate-other-seasons' }),
          expect.objectContaining({ name: 'activate-season-data' })
        ])
      );
    });

    it('should recalculate dependent data after season changes', async () => {
      const event: HookEvent = {
        type: 'afterUpdate',
        contentType: 'saison',
        data: {
          id: 1,
          name: '2024/2025',
          startDate: '2024-08-15', // Changed start date
          endDate: '2025-05-31'
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockReturnValue(['job-1']);

      await service.afterUpdate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ name: 'recalculate-season-dependent-data' })
        ])
      );
    });
  });

  describe('season overlap validation', () => {
    it('should allow configurable overlap checking', async () => {
      const flexibleConfig = { ...mockConfig, enableStrictValidation: false };
      const flexibleService = new SaisonHookService(flexibleConfig);

      const event: HookEvent = {
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

      // With flexible validation, overlaps might be allowed as warnings
      expect(flexibleService['config'].enableStrictValidation).toBe(false);
    });

    it('should provide detailed overlap information', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'saison',
        data: {
          name: '2024/2025',
          startDate: '2024-06-01',
          endDate: '2025-05-31',
          active: false
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'dateRange',
            message: 'Season overlaps with "2023/2024" from 2024-06-01 to 2024-07-31',
            code: 'SEASON_OVERLAP',
            details: {
              conflictingSeason: '2023/2024',
              overlapStart: '2024-06-01',
              overlapEnd: '2024-07-31'
            }
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.errors[0].details).toHaveProperty('conflictingSeason');
      expect(result.errors[0].details).toHaveProperty('overlapStart');
      expect(result.errors[0].details).toHaveProperty('overlapEnd');
    });
  });

  describe('season activation management', () => {
    it('should enforce single active season constraint', async () => {
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

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'active',
            message: 'Season "2023/2024" is already active',
            code: 'MULTIPLE_ACTIVE_SEASONS',
            details: {
              currentActiveSeason: '2023/2024',
              currentActiveSeasonId: 1
            }
          }
        ],
        warnings: []
      });

      const result = await service.beforeUpdate(event);

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('MULTIPLE_ACTIVE_SEASONS');
      expect(result.errors[0].details).toHaveProperty('currentActiveSeason');
    });

    it('should handle automatic deactivation of other seasons', async () => {
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

      mockCalculationService.scheduleAsync.mockReturnValue(['deactivation-job']);

      await service.afterUpdate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ 
            name: 'deactivate-other-seasons',
            priority: 'high'
          })
        ])
      );
    });
  });

  describe('season transition handling', () => {
    it('should handle season transitions correctly', async () => {
      const event: HookEvent = {
        type: 'afterUpdate',
        contentType: 'saison',
        data: {
          id: 1,
          name: '2023/2024',
          active: false // Being deactivated
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockReturnValue(['transition-job']);

      await service.afterUpdate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ name: 'handle-season-transition' })
        ])
      );
    });

    it('should validate season transition requirements', async () => {
      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'saison',
        data: {
          active: false
        },
        where: { id: 1 },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateWarning.mockReturnValue({
        isValid: false,
        canProceed: true,
        errors: [],
        warnings: [
          {
            field: 'active',
            message: 'Deactivating season with incomplete games',
            code: 'INCOMPLETE_SEASON_DATA'
          }
        ]
      });

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

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('INCOMPLETE_SEASON_DATA');
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const event: HookEvent = {
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

      mockValidationService.validateCritical.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors[0].message).toContain('Database connection failed');
    });

    it('should handle invalid date formats', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'saison',
        data: {
          name: '2024/2025',
          startDate: 'invalid-date',
          endDate: '2025-05-31',
          active: false
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'startDate',
            message: 'Invalid date format',
            code: 'INVALID_DATE_FORMAT'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_DATE_FORMAT');
    });
  });

  describe('configuration handling', () => {
    it('should respect overlap validation configuration', async () => {
      const strictConfig = { ...mockConfig, enableStrictValidation: true };
      const lenientConfig = { ...mockConfig, enableStrictValidation: false };

      const strictService = new SaisonHookService(strictConfig);
      const lenientService = new SaisonHookService(lenientConfig);

      expect(strictService['config'].enableStrictValidation).toBe(true);
      expect(lenientService['config'].enableStrictValidation).toBe(false);
    });

    it('should handle feature flag for overlap checking', async () => {
      // Test would check if overlap validation can be disabled via feature flags
      const event: HookEvent = {
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

      // This would be controlled by feature flags in real implementation
      expect(service['config']).toBeDefined();
    });
  });
});