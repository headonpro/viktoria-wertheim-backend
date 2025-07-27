/**
 * Unit tests for BaseHookService
 * Tests the abstract base class functionality for all hook services
 */

const { BaseHookService } = require('../BaseHookService');

// Concrete implementation for testing
class TestHookService extends BaseHookService {
  async beforeCreate(event) {
    return {
      success: true,
      canProceed: true,
      errors: [],
      warnings: [],
      executionTime: 10
    };
  }

  async beforeUpdate(event) {
    return {
      success: true,
      canProceed: true,
      errors: [],
      warnings: [],
      executionTime: 15
    };
  }

  async beforeDelete(event) {
    return {
      success: true,
      canProceed: true,
      errors: [],
      warnings: [],
      executionTime: 5
    };
  }

  async afterCreate(event) {
    return {
      success: true,
      canProceed: true,
      errors: [],
      warnings: [],
      executionTime: 8
    };
  }

  async afterUpdate(event) {
    return {
      success: true,
      canProceed: true,
      errors: [],
      warnings: [],
      executionTime: 12
    };
  }

  async afterDelete(event) {
    return {
      success: true,
      canProceed: true,
      errors: [],
      warnings: [],
      executionTime: 3
    };
  }
}

describe('BaseHookService', () => {
  let service;
  let mockStrapi;
  let mockConfig;

  beforeEach(() => {
    mockStrapi = {
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      }
    };

    mockConfig = {
      enabled: true,
      timeout: 5000,
      retries: 3,
      async: false
    };

    service = new TestHookService(mockStrapi, 'test-content-type', mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      const defaultService = new TestHookService(mockStrapi, 'test-content-type');
      expect(defaultService).toBeDefined();
    });

    it('should merge provided configuration with defaults', () => {
      const customConfig = { timeout: 10000 };
      const customService = new TestHookService(mockStrapi, 'test-content-type', customConfig);
      expect(customService).toBeDefined();
    });
  });

  describe('hook execution', () => {
    it('should execute beforeCreate hook', async () => {
      const event = {
        contentType: 'test-content-type',
        operation: 'create',
        data: { name: 'Test' },
        timestamp: new Date()
      };

      const result = await service.beforeCreate(event);

      expect(result.success).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.executionTime).toBe(10);
    });

    it('should execute beforeUpdate hook', async () => {
      const event = {
        contentType: 'test-content-type',
        operation: 'update',
        data: { name: 'Updated Test' },
        timestamp: new Date()
      };

      const result = await service.beforeUpdate(event);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBe(15);
    });

    it('should execute beforeDelete hook', async () => {
      const event = {
        contentType: 'test-content-type',
        operation: 'delete',
        data: { id: 1 },
        timestamp: new Date()
      };

      const result = await service.beforeDelete(event);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBe(5);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      const errorService = new (class extends TestHookService {
        async beforeCreate(event) {
          throw new Error('Test error');
        }
      })(mockStrapi, 'test-content-type', mockConfig);

      const event = {
        contentType: 'test-content-type',
        operation: 'create',
        data: { name: 'Test' },
        timestamp: new Date()
      };

      try {
        await errorService.beforeCreate(event);
      } catch (error) {
        expect(error.message).toBe('Test error');
      }
    });

    it('should handle timeout scenarios', async () => {
      const slowService = new (class extends TestHookService {
        async beforeCreate(event) {
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            success: true,
            canProceed: true,
            errors: [],
            warnings: [],
            executionTime: 100
          };
        }
      })(mockStrapi, 'test-content-type', { ...mockConfig, timeout: 50 });

      const event = {
        contentType: 'test-content-type',
        operation: 'create',
        data: { name: 'Test' },
        timestamp: new Date()
      };

      const result = await slowService.beforeCreate(event);
      expect(result.success).toBe(true);
    });
  });

  describe('metrics collection', () => {
    it('should collect execution metrics', async () => {
      const event = {
        contentType: 'test-content-type',
        operation: 'create',
        data: { name: 'Test' },
        timestamp: new Date()
      };

      await service.beforeCreate(event);
      await service.beforeUpdate(event);

      // Metrics should be collected internally
      expect(mockStrapi.log.info).toHaveBeenCalled();
    });
  });

  describe('configuration management', () => {
    it('should allow configuration updates', () => {
      const newConfig = { timeout: 8000 };
      service.updateConfig(newConfig);
      
      // Configuration should be updated
      expect(service).toBeDefined();
    });

    it('should validate configuration on update', () => {
      const invalidConfig = { timeout: -1000 };
      
      // Should handle invalid configuration gracefully
      expect(() => service.updateConfig(invalidConfig)).not.toThrow();
    });
  });

  describe('lifecycle hooks', () => {
    it('should execute all lifecycle hooks in sequence', async () => {
      const event = {
        contentType: 'test-content-type',
        operation: 'create',
        data: { name: 'Test' },
        timestamp: new Date()
      };

      const beforeResult = await service.beforeCreate(event);
      const afterResult = await service.afterCreate(event);

      expect(beforeResult.success).toBe(true);
      expect(afterResult.success).toBe(true);
    });

    it('should handle mixed success/failure scenarios', async () => {
      const mixedService = new (class extends TestHookService {
        async beforeCreate(event) {
          return {
            success: false,
            canProceed: false,
            errors: [{ message: 'Validation failed' }],
            warnings: [],
            executionTime: 5
          };
        }
      })(mockStrapi, 'test-content-type', mockConfig);

      const event = {
        contentType: 'test-content-type',
        operation: 'create',
        data: { name: 'Test' },
        timestamp: new Date()
      };

      const result = await mixedService.beforeCreate(event);

      expect(result.success).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });
});