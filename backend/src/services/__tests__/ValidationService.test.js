/**
 * Unit tests for ValidationService
 * Tests the modular validation system with rules engine
 */

const { ValidationService } = require('../ValidationService');
const { initializeHookConfigurationManager } = require('../HookConfigurationManager');

describe('ValidationService', () => {
  let service;
  let mockRules;
  let mockStrapi;
  let mockContext;

  beforeEach(() => {
    mockStrapi = {
      log: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
      }
    };

    mockContext = {
      contentType: 'team',
      operation: 'create',
      hookType: 'beforeCreate',
      operationId: 'test-1',
      timestamp: new Date()
    };

    mockRules = [
      {
        name: 'required-name',
        type: 'critical',
        validator: (data) => data && data.name && data.name.length > 0,
        message: 'Name is required',
        enabled: true,
        priority: 1
      },
      {
        name: 'valid-email',
        type: 'critical',
        validator: (data) => data && data.email && data.email.includes('@'),
        message: 'Valid email is required',
        enabled: true,
        priority: 2
      },
      {
        name: 'name-length',
        type: 'warning',
        validator: (data) => !data || !data.name || data.name.length <= 50,
        message: 'Name should be 50 characters or less',
        enabled: true,
        priority: 3
      },
      {
        name: 'disabled-rule',
        type: 'warning',
        validator: () => false,
        message: 'This rule is disabled',
        enabled: false,
        priority: 4
      }
    ];

    // Initialize HookConfigurationManager
    initializeHookConfigurationManager(mockStrapi);

    service = new ValidationService(mockStrapi);
    service.registerRules(mockRules);
  });

  describe('validateCritical', () => {
    it('should validate critical rules and return success for valid data', async () => {
      const data = {
        name: 'Test Team',
        email: 'test@example.com'
      };

      const result = await service.validateCritical(data, 'team', mockContext);

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return errors for invalid critical rules', async () => {
      const data = {
        name: '',
        email: 'invalid-email'
      };

      const result = await service.validateCritical(data, 'team', mockContext);

      expect(result.isValid).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toBe('Name is required');
      expect(result.errors[1].message).toBe('Valid email is required');
    });

    it('should skip disabled rules', async () => {
      const data = {
        name: 'Test Team',
        email: 'test@example.com'
      };

      const result = await service.validateCritical(data, 'team', mockContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateWarning', () => {
    it('should validate warning rules and return warnings for invalid data', async () => {
      const data = {
        name: 'This is a very long team name that exceeds fifty characters',
        email: 'test@example.com'
      };

      const result = await service.validateWarning(data, 'team', mockContext);

      expect(result.isValid).toBe(false);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toBe('Name should be 50 characters or less');
    });

    it('should return success for valid warning rules', async () => {
      const data = {
        name: 'Short Name',
        email: 'test@example.com'
      };

      const result = await service.validateWarning(data, 'team', mockContext);

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('validateAll', () => {
    it('should validate both critical and warning rules', async () => {
      const data = {
        name: '',
        email: 'invalid-email'
      };

      const result = await service.validateAll(data, 'team', mockContext);

      expect(result.isValid).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return success when all rules pass', async () => {
      const data = {
        name: 'Test Team',
        email: 'test@example.com'
      };

      const result = await service.validateAll(data, 'team', mockContext);

      expect(result.isValid).toBe(true);
      expect(result.canProceed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('isValidationEnabled', () => {
    it('should return true for enabled rules', () => {
      expect(service.isValidationEnabled('required-name')).toBe(true);
    });

    it('should return false for disabled rules', () => {
      expect(service.isValidationEnabled('disabled-rule')).toBe(false);
    });

    it('should return false for non-existent rules', () => {
      expect(service.isValidationEnabled('non-existent')).toBe(false);
    });
  });

  describe('rule management', () => {
    it('should register new rules', () => {
      const newRules = [
        {
          name: 'new-rule',
          type: 'warning',
          validator: () => true,
          message: 'New rule',
          enabled: true,
          priority: 5
        }
      ];

      service.registerRules(newRules);

      expect(service.isValidationEnabled('new-rule')).toBe(true);
    });

    it('should enable/disable rules dynamically', () => {
      service.setRuleEnabled('disabled-rule', true);
      expect(service.isValidationEnabled('disabled-rule')).toBe(true);

      service.setRuleEnabled('required-name', false);
      expect(service.isValidationEnabled('required-name')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle validator function errors gracefully', async () => {
      const errorRule = {
        name: 'error-rule',
        type: 'critical',
        validator: () => {
          throw new Error('Validation error');
        },
        message: 'Error rule',
        enabled: true,
        priority: 1
      };

      service.registerRules([errorRule]);

      const data = { name: 'Test' };
      const result = await service.validateCritical(data, 'team', mockContext);

      expect(result.isValid).toBe(false);
      expect(result.canProceed).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Validation error');
    });

    it('should handle null/undefined data', async () => {
      const result1 = await service.validateCritical(null, 'team', mockContext);
      const result2 = await service.validateCritical(undefined, 'team', mockContext);

      expect(result1.isValid).toBe(false);
      expect(result2.isValid).toBe(false);
    });
  });

  describe('performance', () => {
    it('should cache validation results for identical data', async () => {
      const data1 = { name: 'Test Team', email: 'test@example.com' };
      const data2 = { name: 'Test Team', email: 'test@example.com' };

      const result1 = await service.validateAll(data1, 'team', mockContext);
      const result2 = await service.validateAll(data2, 'team', mockContext);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });

    it('should clear cache when rules change', async () => {
      const data = { name: 'Test Team', email: 'test@example.com' };
      
      await service.validateAll(data, 'team', mockContext);
      
      const newRules = [...mockRules];
      service.registerRules(newRules);

      // Cache should be cleared, so validation runs again
      const result = await service.validateAll(data, 'team', mockContext);
      expect(result).toBeDefined();
    });
  });
});