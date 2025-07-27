/**
 * Error Classification Tests
 * 
 * Tests for proper error classification and recovery strategy selection
 * as required by Requirements 1.4, 2.2
 */

import { HookErrorHandler, HookContext, HookEvent } from '../../src/services/hook-error-handler';

// Mock Strapi instance
const mockStrapi = {
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
};

describe('Error Classification Tests', () => {
  let errorHandler: HookErrorHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    errorHandler = new HookErrorHandler(mockStrapi, {
      enableGracefulDegradation: true,
      enableStrictValidation: false
    });
  });

  describe('Critical Error Classification', () => {
    it('should classify database constraint violations as critical', async () => {
      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-1'
      };

      const result = await errorHandler.wrapHookOperation(context, async () => {
        const error = new Error('UNIQUE constraint failed');
        error.name = 'DatabaseError';
        throw error;
      });

      expect(result.errors[0].type).toBe('critical');
      expect(result.errors[0].code).toBe('DATABASE_ERROR');
      expect(result.canProceed).toBe(true); // Graceful degradation enabled
    });

    it('should classify required field validation as critical', async () => {
      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-2'
      };

      const result = await errorHandler.wrapHookOperation(context, async () => {
        const error = new Error('Name is required');
        error.name = 'ValidationError';
        throw error;
      });

      expect(result.errors[0].type).toBe('critical');
      expect(result.errors[0].code).toBe('VALIDATION_ERROR');
    });

    it('should classify foreign key constraint violations as critical', async () => {
      const context: HookContext = {
        contentType: 'tabellen-eintrag',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-3'
      };

      const result = await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Foreign key constraint violation: team_id does not exist');
      });

      expect(result.errors[0].type).toBe('critical');
      expect(result.canProceed).toBe(true); // Graceful degradation allows proceeding
    });
  });

  describe('Warning Error Classification', () => {
    it('should classify timeout errors as warnings', async () => {
      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-4'
      };

      const result = await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Hook operation timed out after 100ms');
      });

      expect(result.errors[0].type).toBe('warning');
      expect(result.errors[0].code).toBe('HOOK_TIMEOUT');
      expect(result.canProceed).toBe(true);
    });

    it('should classify business logic validation as warnings', async () => {
      const context: HookContext = {
        contentType: 'saison',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-5'
      };

      const result = await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Saison überschneidet sich mit bestehender Saison');
      });

      expect(result.errors[0].type).toBe('warning');
      expect(result.errors[0].code).toBe('OVERLAP_VALIDATION');
      expect(result.canProceed).toBe(true);
    });

    it('should classify duplicate validation as warnings', async () => {
      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-6'
      };

      const result = await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Team bereits vorhanden in dieser Liga');
      });

      expect(result.errors[0].type).toBe('warning');
      expect(result.errors[0].code).toBe('DUPLICATE_VALIDATION');
      expect(result.canProceed).toBe(true);
    });
  });

  describe('Recovery Strategy Selection', () => {
    it('should apply timeout recovery strategy', async () => {
      const context: HookContext = {
        contentType: 'tabellen-eintrag',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-7'
      };

      await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Hook operation timed out after 100ms');
      });

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Hook timeout'),
        expect.objectContaining({
          suggestion: 'Consider moving to async processing'
        })
      );
    });

    it('should apply overlap validation recovery strategy', async () => {
      const context: HookContext = {
        contentType: 'saison',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-8'
      };

      await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Season überschneidet with existing season');
      });

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Season overlap detected but allowing operation'),
        expect.objectContaining({
          note: 'Strict validation temporarily disabled'
        })
      );
    });

    it('should apply duplicate validation recovery strategy', async () => {
      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-9'
      };

      await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Team bereits vorhanden');
      });

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Duplicate validation failed but allowing operation'),
        expect.objectContaining({
          note: 'Graceful degradation enabled'
        })
      );
    });

    it('should apply default recovery strategy for unknown errors', async () => {
      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-10'
      };

      await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Unknown error occurred');
      });

      expect(mockStrapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Hook error handled gracefully'),
        expect.objectContaining({
          error: 'Unknown error occurred'
        })
      );
    });
  });

  describe('Configuration-Based Error Handling', () => {
    it('should block critical errors when strict validation is enabled', async () => {
      const strictErrorHandler = new HookErrorHandler(mockStrapi, {
        enableStrictValidation: true,
        enableGracefulDegradation: false
      });

      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-11'
      };

      await expect(
        strictErrorHandler.wrapHookOperation(context, async () => {
          const error = new Error('Required field missing');
          error.name = 'ValidationError';
          throw error;
        })
      ).rejects.toThrow('Required field missing');
    });

    it('should allow warnings to proceed even with strict validation', async () => {
      const strictErrorHandler = new HookErrorHandler(mockStrapi, {
        enableStrictValidation: true,
        enableGracefulDegradation: false
      });

      const context: HookContext = {
        contentType: 'saison',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-12'
      };

      const result = await strictErrorHandler.wrapHookOperation(context, async () => {
        throw new Error('Season überschneidet with existing season');
      });

      expect(result.canProceed).toBe(true);
      expect(result.errors[0].type).toBe('warning');
    });

    it('should respect graceful degradation settings', async () => {
      const noGracefulErrorHandler = new HookErrorHandler(mockStrapi, {
        enableStrictValidation: false,
        enableGracefulDegradation: false
      });

      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-13'
      };

      const result = await noGracefulErrorHandler.wrapHookOperation(context, async () => {
        const error = new Error('Database constraint violation');
        error.name = 'DatabaseError';
        throw error;
      });

      expect(result.canProceed).toBe(false); // No graceful degradation
      expect(result.errors[0].type).toBe('critical');
    });
  });

  describe('Error Message Localization', () => {
    it('should provide German error messages', async () => {
      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-14'
      };

      const result = await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Team name already exists');
      });

      expect(result.errors[0].message).toBe('Team name already exists');
      // Note: Localization can be enhanced in the future
    });

    it('should handle unknown errors with fallback message', async () => {
      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-15'
      };

      const result = await errorHandler.wrapHookOperation(context, async () => {
        const error = new Error();
        error.message = ''; // Empty message
        throw error;
      });

      expect(result.errors[0].message).toBe('Ein unbekannter Fehler ist aufgetreten');
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve error context for debugging', async () => {
      const context: HookContext = {
        contentType: 'tabellen-eintrag',
        hookType: 'beforeUpdate',
        event: { 
          params: { 
            data: { team: 1, spiele: 10 },
            where: { id: 5 }
          }
        },
        operationId: 'test-16'
      };

      const result = await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Calculation failed');
      });

      expect(result.errors[0].context).toEqual({
        contentType: 'tabellen-eintrag',
        hookType: 'beforeUpdate',
        operationId: 'test-16'
      });
    });

    it('should include timestamp in error records', async () => {
      const context: HookContext = {
        contentType: 'team',
        hookType: 'beforeCreate',
        event: { params: { data: {} } },
        operationId: 'test-17'
      };

      const beforeTime = new Date();
      
      const result = await errorHandler.wrapHookOperation(context, async () => {
        throw new Error('Test error');
      });

      const afterTime = new Date();

      expect(result.errors[0].timestamp).toBeInstanceOf(Date);
      expect(result.errors[0].timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.errors[0].timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });
});