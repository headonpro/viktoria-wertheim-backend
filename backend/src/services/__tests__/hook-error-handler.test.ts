/**
 * Tests for Hook Error Handler Service
 */

import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { HookErrorHandler, HookWrapper, createHookErrorHandler } from '../hook-error-handler';

// Mock Strapi instance
const mockStrapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
};

describe('HookErrorHandler', () => {
  let errorHandler: HookErrorHandler;

  beforeEach(() => {
    errorHandler = createHookErrorHandler(mockStrapi);
    jest.clearAllMocks();
  });

  describe('wrapHookOperation', () => {
    it('should handle successful operations', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');
      const context = {
        contentType: 'team',
        hookType: 'beforeCreate' as const,
        event: { params: { data: { name: 'Test Team' } } },
        operationId: 'test-op-1'
      };

      const result = await errorHandler.wrapHookOperation(context, mockOperation);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.modifiedData).toBe('success');
      expect(result.errors).toHaveLength(0);
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle validation errors gracefully', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('Team name is required'));
      const context = {
        contentType: 'team',
        hookType: 'beforeCreate' as const,
        event: { params: { data: {} } },
        operationId: 'test-op-2'
      };

      const result = await errorHandler.wrapHookOperation(context, mockOperation);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(true); // Graceful degradation enabled
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Team name is required');
      expect(result.errors[0].type).toBe('warning');
    });

    it('should handle timeout errors', async () => {
      const mockOperation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 200))
      );
      const context = {
        contentType: 'team',
        hookType: 'beforeCreate' as const,
        event: { params: { data: { name: 'Test Team' } } },
        operationId: 'test-op-3'
      };

      const result = await errorHandler.wrapHookOperation(context, mockOperation);

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('HOOK_TIMEOUT');
      expect(result.errors[0].type).toBe('warning');
    });

    it('should classify critical errors correctly', async () => {
      const criticalError = new Error('Database constraint violation');
      criticalError.name = 'DatabaseError';
      
      const mockOperation = jest.fn().mockRejectedValue(criticalError);
      const context = {
        contentType: 'team',
        hookType: 'beforeCreate' as const,
        event: { params: { data: { name: 'Test Team' } } },
        operationId: 'test-op-4'
      };

      const result = await errorHandler.wrapHookOperation(context, mockOperation);

      expect(result.success).toBe(false);
      expect(result.errors[0].type).toBe('critical');
      expect(result.errors[0].code).toBe('DATABASE_ERROR');
      expect(result.canProceed).toBe(true); // Still true due to graceful degradation
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const config = errorHandler.getConfig();
      
      expect(config.enableStrictValidation).toBe(false);
      expect(config.enableGracefulDegradation).toBe(true);
      expect(config.maxExecutionTime).toBe(100);
      expect(config.retryAttempts).toBe(2);
    });

    it('should allow configuration updates', () => {
      errorHandler.updateConfig({
        enableStrictValidation: true,
        maxExecutionTime: 200
      });

      const config = errorHandler.getConfig();
      expect(config.enableStrictValidation).toBe(true);
      expect(config.maxExecutionTime).toBe(200);
      expect(config.enableGracefulDegradation).toBe(true); // Should remain unchanged
    });
  });
});

describe('HookWrapper', () => {
  let hookWrapper: HookWrapper;

  beforeEach(() => {
    hookWrapper = new HookWrapper(mockStrapi);
    jest.clearAllMocks();
  });

  describe('wrapBeforeCreate', () => {
    it('should wrap beforeCreate hook successfully', async () => {
      const mockOperation = jest.fn().mockResolvedValue({ name: 'Modified Team' });
      const wrappedHook = await hookWrapper.wrapBeforeCreate('team', mockOperation);
      
      const event = { params: { data: { name: 'Test Team' } } };
      const result = await wrappedHook(event);

      expect(result).toEqual({ name: 'Modified Team' });
      expect(mockOperation).toHaveBeenCalledWith(event);
    });

    it('should throw error when operation cannot proceed', async () => {
      // Create error handler with strict validation to test blocking behavior
      const strictWrapper = new HookWrapper(mockStrapi, {
        enableStrictValidation: true,
        enableGracefulDegradation: false
      });

      // Create a critical database error that should block operation
      const criticalError = new Error('Database constraint violation');
      criticalError.name = 'DatabaseError';
      const mockOperation = jest.fn().mockRejectedValue(criticalError);
      const wrappedHook = await strictWrapper.wrapBeforeCreate('team', mockOperation);
      
      const event = { params: { data: {} } };
      
      await expect(wrappedHook(event)).rejects.toThrow('Database constraint violation');
    });
  });

  describe('wrapAfterCreate', () => {
    it('should never block operations in after hooks', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('After hook error'));
      const wrappedHook = await hookWrapper.wrapAfterCreate('team', mockOperation);
      
      const event = { 
        params: { data: { name: 'Test Team' } },
        result: { id: 1, name: 'Test Team' } 
      };
      
      // Should not throw even if operation fails
      await expect(wrappedHook(event)).resolves.toBeUndefined();
      expect(mockStrapi.log.error).toHaveBeenCalled();
    });
  });
});

describe('Error Classification', () => {
  let errorHandler: HookErrorHandler;

  beforeEach(() => {
    errorHandler = createHookErrorHandler(mockStrapi);
  });

  it('should classify validation errors correctly', async () => {
    const validationError = new Error('Name is required');
    validationError.name = 'ValidationError';
    
    const mockOperation = jest.fn().mockRejectedValue(validationError);
    const context = {
      contentType: 'team',
      hookType: 'beforeCreate' as const,
      event: { params: { data: {} } },
      operationId: 'test-classification-1'
    };

    const result = await errorHandler.wrapHookOperation(context, mockOperation);
    
    expect(result.errors[0].type).toBe('critical');
    expect(result.errors[0].code).toBe('VALIDATION_ERROR');
  });

  it('should classify business logic errors as warnings', async () => {
    const businessError = new Error('Saison-Zeitraum überschneidet sich mit bestehenden Saisons');
    
    const mockOperation = jest.fn().mockRejectedValue(businessError);
    const context = {
      contentType: 'saison',
      hookType: 'beforeCreate' as const,
      event: { params: { data: { name: 'Test Season' } } },
      operationId: 'test-classification-2'
    };

    const result = await errorHandler.wrapHookOperation(context, mockOperation);
    
    expect(result.errors[0].type).toBe('warning');
    expect(result.errors[0].code).toBe('OVERLAP_VALIDATION');
  });
});