/**
 * Unit tests for BaseHookService
 * Tests the abstract base class functionality for all hook services
 */

import { BaseHookService } from '../BaseHookService';
import { HookEvent, HookResult, HookConfiguration } from '../types';

// Concrete implementation for testing
class TestHookService extends BaseHookService {
  async beforeCreate(event: HookEvent): Promise<HookResult> {
    return {
      success: true,
      canProceed: true,
      errors: [],
      warnings: [],
      executionTime: 10
    };
  }

  async beforeUpdate(event: HookEvent): Promise<HookResult> {
    return {
      success: true,
      canProceed: true,
      errors: [],
      warnings: [],
      executionTime: 15
    };
  }

  async afterCreate(event: HookEvent): Promise<void> {
    // Test implementation
  }

  async afterUpdate(event: HookEvent): Promise<void> {
    // Test implementation
  }
}

describe('BaseHookService', () => {
  let service: TestHookService;
  let mockConfig: HookConfiguration;

  beforeEach(() => {
    mockConfig = {
      enableStrictValidation: true,
      enableAsyncCalculations: true,
      maxHookExecutionTime: 1000,
      retryAttempts: 3,
      timeoutMs: 5000
    };

    service = new TestHookService(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with configuration', () => {
      expect(service['config']).toEqual(mockConfig);
      expect(service['logger']).toBeDefined();
    });
  });

  describe('executeWithTimeout', () => {
    it('should execute operation within timeout', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await service['executeWithTimeout'](operation, 1000);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should throw timeout error when operation exceeds timeout', async () => {
      const operation = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 2000))
      );
      
      await expect(
        service['executeWithTimeout'](operation, 100)
      ).rejects.toThrow('Operation timed out');
    });

    it('should handle operation errors', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(
        service['executeWithTimeout'](operation, 1000)
      ).rejects.toThrow('Operation failed');
    });
  });

  describe('handleError', () => {
    it('should handle critical errors', () => {
      const error = new Error('Critical error');
      const context = {
        contentType: 'team',
        operation: 'create',
        data: { name: 'Test Team' }
      };

      const result = service['handleError'](error, context);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Critical error');
    });

    it('should handle validation errors as warnings', () => {
      const error = new Error('Validation warning');
      error.name = 'ValidationWarning';
      const context = {
        contentType: 'team',
        operation: 'update',
        data: { name: 'Test Team' }
      };

      const result = service['handleError'](error, context);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toBe('Validation warning');
    });
  });

  describe('retry mechanism', () => {
    it('should retry failed operations', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValue('success');

      const result = await service['executeWithRetry'](operation, 3);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      await expect(
        service['executeWithRetry'](operation, 2)
      ).rejects.toThrow('Persistent failure');

      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('logging', () => {
    it('should log hook execution start and end', async () => {
      const logSpy = jest.spyOn(service['logger'], 'info');
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: { name: 'Test Team' },
        params: {},
        timestamp: new Date()
      };

      await service.beforeCreate(event);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Hook execution started'),
        expect.objectContaining({
          contentType: 'team',
          hookType: 'beforeCreate'
        })
      );
    });

    it('should log errors with context', () => {
      const logSpy = jest.spyOn(service['logger'], 'error');
      const error = new Error('Test error');
      const context = {
        contentType: 'team',
        operation: 'create',
        data: { name: 'Test Team' }
      };

      service['handleError'](error, context);

      expect(logSpy).toHaveBeenCalledWith(
        'Hook error occurred',
        expect.objectContaining({
          error: error.message,
          context
        })
      );
    });
  });

  describe('performance monitoring', () => {
    it('should track execution time', async () => {
      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: { name: 'Test Team' },
        params: {},
        timestamp: new Date()
      };

      const result = await service.beforeCreate(event);

      expect(result.executionTime).toBeGreaterThan(0);
      expect(typeof result.executionTime).toBe('number');
    });

    it('should warn about slow operations', async () => {
      const logSpy = jest.spyOn(service['logger'], 'warn');
      
      // Mock slow operation
      const slowService = new (class extends TestHookService {
        async beforeCreate(event: HookEvent): Promise<HookResult> {
          await new Promise(resolve => setTimeout(resolve, 200));
          return super.beforeCreate(event);
        }
      })(mockConfig);

      const event: HookEvent = {
        type: 'beforeCreate',
        contentType: 'team',
        data: { name: 'Test Team' },
        params: {},
        timestamp: new Date()
      };

      await slowService.beforeCreate(event);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow hook execution detected'),
        expect.any(Object)
      );
    });
  });
});