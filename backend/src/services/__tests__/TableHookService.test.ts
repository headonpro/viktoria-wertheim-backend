/**
 * Unit tests for TableHookService
 * Tests table-specific hook operations, optimized calculations, and data validation
 */

import { TableHookService } from '../TableHookService';
import { HookEvent, HookResult, HookConfiguration } from '../types';
import { ValidationService } from '../ValidationService';
import { CalculationService } from '../CalculationService';

// Mock dependencies
jest.mock('../ValidationService');
jest.mock('../CalculationService');

describe('TableHookService', () => {
  let service: TableHookService;
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

    service = new TableHookService(mockConfig);
    service['validationService'] = mockValidationService;
    service['calculationService'] = mockCalculationService;
  });

  describe('beforeCreate', () => {
    it('should validate table entry data before creation', async () => {
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
          niederlagen: 2,
          tore: 18,
          gegentore: 12
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
          punkte: 20,
          tordifferenz: 6,
          position: 3
        },
        errors: [],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.modifiedData).toHaveProperty('punkte', 20);
      expect(result.modifiedData).toHaveProperty('tordifferenz', 6);
    });

    it('should validate team-liga-saison uniqueness', async () => {
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
          niederlagen: 2,
          tore: 18,
          gegentore: 12
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'team',
            message: 'Table entry already exists for this team in this liga and saison',
            code: 'DUPLICATE_TABLE_ENTRY'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors[0].code).toBe('DUPLICATE_TABLE_ENTRY');
    });

    it('should validate game statistics consistency', async () => {
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
          niederlagen: 3, // 6+2+3 = 11, but spiele = 10
          tore: 18,
          gegentore: 12
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'spiele',
            message: 'Games played must equal wins + draws + losses',
            code: 'INCONSISTENT_GAME_STATS'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors[0].code).toBe('INCONSISTENT_GAME_STATS');
    });

    it('should calculate points automatically', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data: {
          team: 1,
          liga: 1,
          saison: 1,
          spiele: 15,
          siege: 8,
          unentschieden: 4,
          niederlagen: 3,
          tore: 25,
          gegentore: 18
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
          punkte: 28, // 8*3 + 4*1 = 28
          tordifferenz: 7, // 25-18 = 7
          position: 2
        },
        errors: [],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.modifiedData).toHaveProperty('punkte', 28);
      expect(result.modifiedData).toHaveProperty('tordifferenz', 7);
      expect(mockCalculationService.calculateSync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ field: 'punkte' }),
          expect.objectContaining({ field: 'tordifferenz' })
        ])
      );
    });

    it('should validate negative values', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data: {
          team: 1,
          liga: 1,
          saison: 1,
          spiele: 10,
          siege: -1, // Negative value
          unentschieden: 2,
          niederlagen: 2,
          tore: 18,
          gegentore: 12
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'siege',
            message: 'Wins cannot be negative',
            code: 'NEGATIVE_VALUE'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('NEGATIVE_VALUE');
    });
  });

  describe('beforeUpdate', () => {
    it('should validate table entry updates', async () => {
      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          spiele: 12,
          siege: 7,
          unentschieden: 3,
          niederlagen: 2
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
          punkte: 24,
          tordifferenz: 8
        },
        errors: [],
        warnings: []
      });

      const result = await service.beforeUpdate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.modifiedData).toHaveProperty('punkte', 24);
    });

    it('should recalculate position when stats change', async () => {
      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          tore: 30,
          gegentore: 15
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
          tordifferenz: 15
        },
        errors: [],
        warnings: []
      });

      const result = await service.beforeUpdate(event);

      expect(result.modifiedData).toHaveProperty('tordifferenz', 15);
    });

    it('should warn about significant statistical changes', async () => {
      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          spiele: 5, // Reducing from higher number
          siege: 3,
          unentschieden: 1,
          niederlagen: 1
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
            field: 'spiele',
            message: 'Reducing games played may affect league standings',
            code: 'SIGNIFICANT_STAT_CHANGE'
          }
        ]
      });

      mockCalculationService.calculateSync.mockReturnValue({
        success: true,
        results: {
          punkte: 10,
          tordifferenz: 5
        },
        errors: [],
        warnings: []
      });

      const result = await service.beforeUpdate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('SIGNIFICANT_STAT_CHANGE');
    });
  });

  describe('afterCreate', () => {
    it('should schedule table position recalculation after creation', async () => {
      const event: HookEvent = {
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

      mockCalculationService.scheduleAsync.mockReturnValue(['position-job']);

      await service.afterCreate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ name: 'recalculate-table-positions' })
        ])
      );
    });

    it('should schedule league statistics update', async () => {
      const event: HookEvent = {
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

      mockCalculationService.scheduleAsync.mockReturnValue(['stats-job']);

      await service.afterCreate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ name: 'update-league-statistics' })
        ])
      );
    });
  });

  describe('afterUpdate', () => {
    it('should recalculate table positions after update', async () => {
      const event: HookEvent = {
        type: 'afterUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          id: 1,
          team: 1,
          liga: 1,
          saison: 1,
          punkte: 25,
          tordifferenz: 8
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockReturnValue(['position-job', 'stats-job']);

      await service.afterUpdate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ name: 'recalculate-table-positions' }),
          expect.objectContaining({ name: 'update-team-statistics' })
        ])
      );
    });

    it('should handle position changes affecting other teams', async () => {
      const event: HookEvent = {
        type: 'afterUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          id: 1,
          team: 1,
          liga: 1,
          saison: 1,
          punkte: 35, // Significant increase
          tordifferenz: 15
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockReturnValue(['cascade-job']);

      await service.afterUpdate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({ 
            name: 'recalculate-table-positions',
            priority: 'high'
          })
        ])
      );
    });
  });

  describe('table calculations', () => {
    it('should calculate points correctly', () => {
      const data = {
        siege: 10,
        unentschieden: 5,
        niederlagen: 3
      };

      mockCalculationService.calculateSync.mockReturnValue({
        success: true,
        results: {
          punkte: 35 // 10*3 + 5*1 = 35
        },
        errors: [],
        warnings: []
      });

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data,
        params: {},
        timestamp: new Date()
      };

      service.beforeCreate(event);

      expect(mockCalculationService.calculateSync).toHaveBeenCalledWith(
        data,
        expect.arrayContaining([
          expect.objectContaining({
            field: 'punkte',
            calculator: expect.any(Function)
          })
        ])
      );
    });

    it('should calculate goal difference correctly', () => {
      const data = {
        tore: 25,
        gegentore: 18
      };

      mockCalculationService.calculateSync.mockReturnValue({
        success: true,
        results: {
          tordifferenz: 7 // 25-18 = 7
        },
        errors: [],
        warnings: []
      });

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data,
        params: {},
        timestamp: new Date()
      };

      service.beforeCreate(event);

      expect(mockCalculationService.calculateSync).toHaveBeenCalledWith(
        data,
        expect.arrayContaining([
          expect.objectContaining({
            field: 'tordifferenz',
            calculator: expect.any(Function)
          })
        ])
      );
    });

    it('should handle calculation errors with fallback values', async () => {
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
          niederlagen: 2,
          tore: 18,
          gegentore: 12
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
        results: {
          punkte: 0, // Fallback value
          tordifferenz: 0 // Fallback value
        },
        errors: [
          {
            field: 'punkte',
            message: 'Calculation failed, using fallback',
            code: 'CALCULATION_ERROR'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(true); // Should proceed with fallback
      expect(result.canProceed).toBe(true);
      expect(result.modifiedData).toHaveProperty('punkte', 0);
      expect(result.warnings).toHaveLength(1);
    });
  });

  describe('table position calculation', () => {
    it('should schedule position recalculation for entire league', async () => {
      const event: HookEvent = {
        type: 'afterCreate',
        contentType: 'tabellen-eintrag',
        data: {
          id: 1,
          team: 1,
          liga: 1,
          saison: 1,
          punkte: 20
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockReturnValue(['league-position-job']);

      await service.afterCreate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({
            name: 'recalculate-table-positions',
            calculator: expect.any(Function),
            priority: 'high'
          })
        ])
      );
    });

    it('should handle position ties correctly', async () => {
      // This would test the tie-breaking logic in position calculation
      const event: HookEvent = {
        type: 'afterUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          id: 1,
          team: 1,
          liga: 1,
          saison: 1,
          punkte: 30,
          tordifferenz: 5 // Same points as another team
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockReturnValue(['tie-break-job']);

      await service.afterUpdate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalled();
    });
  });

  describe('data validation rules', () => {
    it('should validate required fields', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data: {
          // Missing required fields
          spiele: 10
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'team',
            message: 'Team is required',
            code: 'REQUIRED_FIELD'
          },
          {
            field: 'liga',
            message: 'Liga is required',
            code: 'REQUIRED_FIELD'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should validate data type constraints', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data: {
          team: 1,
          liga: 1,
          saison: 1,
          spiele: 'ten', // Should be number
          siege: 6,
          unentschieden: 2,
          niederlagen: 2
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'spiele',
            message: 'Games played must be a number',
            code: 'INVALID_TYPE'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_TYPE');
    });

    it('should validate business logic constraints', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'tabellen-eintrag',
        data: {
          team: 1,
          liga: 1,
          saison: 1,
          spiele: 10,
          siege: 15, // More wins than games played
          unentschieden: 2,
          niederlagen: 2
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'siege',
            message: 'Wins cannot exceed games played',
            code: 'BUSINESS_LOGIC_VIOLATION'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('BUSINESS_LOGIC_VIOLATION');
    });
  });

  describe('performance optimization', () => {
    it('should batch position calculations for efficiency', async () => {
      const event: HookEvent = {
        type: 'afterUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          id: 1,
          liga: 1,
          saison: 1,
          punkte: 25
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockReturnValue(['batch-job']);

      await service.afterUpdate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalledWith(
        event.data,
        expect.arrayContaining([
          expect.objectContaining({
            name: 'recalculate-table-positions',
            priority: 'high'
          })
        ])
      );
    });

    it('should use efficient queries for large datasets', async () => {
      // This would test optimization for leagues with many teams
      const event: HookEvent = {
        type: 'afterCreate',
        contentType: 'tabellen-eintrag',
        data: {
          id: 1,
          team: 1,
          liga: 1, // Large league
          saison: 1,
          punkte: 20
        },
        params: {},
        timestamp: new Date()
      };

      mockCalculationService.scheduleAsync.mockReturnValue(['optimized-job']);

      await service.afterCreate(event);

      expect(mockCalculationService.scheduleAsync).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle concurrent updates gracefully', async () => {
      const event: HookEvent = {
        type: 'beforeUpdate',
        contentType: 'tabellen-eintrag',
        data: {
          punkte: 25
        },
        where: { id: 1 },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockImplementation(() => {
        throw new Error('Concurrent modification detected');
      });

      const result = await service.beforeUpdate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors[0].message).toContain('Concurrent modification');
    });

    it('should handle database constraint violations', async () => {
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
          niederlagen: 2
        },
        params: {},
        timestamp: new Date()
      };

      mockValidationService.validateCritical.mockReturnValue({
        isValid: false,
        canProceed: false,
        errors: [
          {
            field: 'team',
            message: 'Foreign key constraint violation',
            code: 'CONSTRAINT_VIOLATION'
          }
        ],
        warnings: []
      });

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('CONSTRAINT_VIOLATION');
    });
  });
});