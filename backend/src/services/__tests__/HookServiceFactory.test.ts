/**
 * Unit tests for HookServiceFactory
 * Tests the factory pattern for creating hook services
 */

import { HookServiceFactory } from '../HookServiceFactory';
import { TeamHookService } from '../TeamHookService';
import { SaisonHookService } from '../SaisonHookService';
import { TableHookService } from '../TableHookService';
import { HookConfiguration } from '../types';

describe('HookServiceFactory', () => {
  let factory: HookServiceFactory;
  let mockConfig: HookConfiguration;

  beforeEach(() => {
    mockConfig = {
      enableStrictValidation: true,
      enableAsyncCalculations: true,
      maxHookExecutionTime: 1000,
      retryAttempts: 3,
      timeoutMs: 5000
    };

    factory = new HookServiceFactory(mockConfig);
  });

  describe('constructor', () => {
    it('should initialize with configuration', () => {
      expect(factory['config']).toEqual(mockConfig);
    });

    it('should initialize service registry', () => {
      expect(factory['serviceRegistry']).toBeDefined();
      expect(factory['serviceRegistry'].size).toBe(0);
    });
  });

  describe('createTeamService', () => {
    it('should create TeamHookService instance', () => {
      const service = factory.createTeamService();
      
      expect(service).toBeInstanceOf(TeamHookService);
    });

    it('should return cached instance on subsequent calls', () => {
      const service1 = factory.createTeamService();
      const service2 = factory.createTeamService();
      
      expect(service1).toBe(service2);
    });

    it('should pass configuration to service', () => {
      const service = factory.createTeamService();
      
      expect(service['config']).toEqual(mockConfig);
    });
  });

  describe('createSaisonService', () => {
    it('should create SaisonHookService instance', () => {
      const service = factory.createSaisonService();
      
      expect(service).toBeInstanceOf(SaisonHookService);
    });

    it('should return cached instance on subsequent calls', () => {
      const service1 = factory.createSaisonService();
      const service2 = factory.createSaisonService();
      
      expect(service1).toBe(service2);
    });

    it('should pass configuration to service', () => {
      const service = factory.createSaisonService();
      
      expect(service['config']).toEqual(mockConfig);
    });
  });

  describe('createTableService', () => {
    it('should create TableHookService instance', () => {
      const service = factory.createTableService();
      
      expect(service).toBeInstanceOf(TableHookService);
    });

    it('should return cached instance on subsequent calls', () => {
      const service1 = factory.createTableService();
      const service2 = factory.createTableService();
      
      expect(service1).toBe(service2);
    });

    it('should pass configuration to service', () => {
      const service = factory.createTableService();
      
      expect(service['config']).toEqual(mockConfig);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = factory.getConfig();
      
      expect(config).toEqual(mockConfig);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig: HookConfiguration = {
        enableStrictValidation: false,
        enableAsyncCalculations: false,
        maxHookExecutionTime: 2000,
        retryAttempts: 5,
        timeoutMs: 10000
      };

      factory.updateConfig(newConfig);

      expect(factory.getConfig()).toEqual(newConfig);
    });

    it('should clear service registry when config changes', () => {
      // Create services to populate registry
      factory.createTeamService();
      factory.createSaisonService();
      
      expect(factory['serviceRegistry'].size).toBe(2);

      const newConfig: HookConfiguration = {
        enableStrictValidation: false,
        enableAsyncCalculations: false,
        maxHookExecutionTime: 2000,
        retryAttempts: 5,
        timeoutMs: 10000
      };

      factory.updateConfig(newConfig);

      expect(factory['serviceRegistry'].size).toBe(0);
    });

    it('should create new service instances with updated config', () => {
      const service1 = factory.createTeamService();
      
      const newConfig: HookConfiguration = {
        enableStrictValidation: false,
        enableAsyncCalculations: false,
        maxHookExecutionTime: 2000,
        retryAttempts: 5,
        timeoutMs: 10000
      };

      factory.updateConfig(newConfig);
      const service2 = factory.createTeamService();

      expect(service1).not.toBe(service2);
      expect(service2['config']).toEqual(newConfig);
    });
  });

  describe('getServiceRegistry', () => {
    it('should return service registry information', () => {
      factory.createTeamService();
      factory.createSaisonService();

      const registry = factory.getServiceRegistry();

      expect(registry).toHaveProperty('team');
      expect(registry).toHaveProperty('saison');
      expect(registry.team).toBeInstanceOf(TeamHookService);
      expect(registry.saison).toBeInstanceOf(SaisonHookService);
    });

    it('should return empty registry when no services created', () => {
      const registry = factory.getServiceRegistry();

      expect(Object.keys(registry)).toHaveLength(0);
    });
  });

  describe('clearRegistry', () => {
    it('should clear all cached services', () => {
      factory.createTeamService();
      factory.createSaisonService();
      factory.createTableService();

      expect(factory['serviceRegistry'].size).toBe(3);

      factory.clearRegistry();

      expect(factory['serviceRegistry'].size).toBe(0);
    });

    it('should create new instances after clearing', () => {
      const service1 = factory.createTeamService();
      
      factory.clearRegistry();
      
      const service2 = factory.createTeamService();

      expect(service1).not.toBe(service2);
    });
  });

  describe('error handling', () => {
    it('should handle service creation errors gracefully', () => {
      // Mock a scenario where service creation fails
      const originalTeamService = TeamHookService;
      
      // Replace constructor to throw error
      (global as any).TeamHookService = jest.fn(() => {
        throw new Error('Service creation failed');
      });

      expect(() => factory.createTeamService()).toThrow('Service creation failed');

      // Restore original
      (global as any).TeamHookService = originalTeamService;
    });
  });

  describe('dependency injection', () => {
    it('should inject dependencies into services', () => {
      const service = factory.createTeamService();

      expect(service['validationService']).toBeDefined();
      expect(service['calculationService']).toBeDefined();
    });

    it('should share validation service between services', () => {
      const teamService = factory.createTeamService();
      const saisonService = factory.createSaisonService();

      expect(teamService['validationService']).toBe(saisonService['validationService']);
    });
  });
});