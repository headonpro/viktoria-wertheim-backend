/**
 * Hook Services Index
 * 
 * Central export point for all hook-related services and utilities.
 * Provides easy access to the hook infrastructure components.
 */

// Base infrastructure
export { BaseHookService } from './BaseHookService';
export type { HookConfiguration, HookMetrics, Timer, PerformanceMonitor } from './BaseHookService';

// Service factory
export { 
  HookServiceFactory, 
  getHookServiceFactory, 
  initializeHookServiceFactory, 
  resetHookServiceFactory 
} from './HookServiceFactory';
export type { 
  ServiceRegistryEntry, 
  FactoryConfiguration, 
  ServiceCreationOptions 
} from './HookServiceFactory';

// Configuration management
export { 
  HookConfigurationManager, 
  getHookConfigurationManager, 
  initializeHookConfigurationManager, 
  resetHookConfigurationManager 
} from './HookConfigurationManager';
export type {
  ConfigurationSchema,
  ValidationResult,
  EnvironmentConfig,
  HookSystemConfiguration,
  ConfigurationChangeEvent
} from './HookConfigurationManager';

// Import types and functions for internal use
import type { FactoryConfiguration } from './HookServiceFactory';
import type { HookSystemConfiguration } from './HookConfigurationManager';
import { initializeHookServiceFactory, resetHookServiceFactory } from './HookServiceFactory';
import { initializeHookConfigurationManager, resetHookConfigurationManager } from './HookConfigurationManager';

// Error handling
export { 
  HookErrorHandler, 
  createHookErrorHandler, 
  HookWrapper 
} from './hook-error-handler';
export type { 
  HookEvent, 
  HookResult, 
  HookError, 
  HookWarning, 
  HookContext, 
  HookErrorConfig 
} from './hook-error-handler';

// Validation services
export { ValidationService } from './ValidationService';
export type { ValidationError, ValidationResult as ValidationServiceResult } from './ValidationService';

/**
 * Initialize the complete hook system
 */
export function initializeHookSystem(strapi: any, config?: {
  factory?: Partial<FactoryConfiguration>;
  configuration?: Partial<HookSystemConfiguration>;
}) {
  // Initialize configuration manager first
  const configManager = initializeHookConfigurationManager(strapi, config?.configuration);
  
  // Initialize factory with configuration
  const factory = initializeHookServiceFactory(strapi, {
    ...config?.factory,
    defaultHookConfig: configManager.getGlobalConfig()
  });

  return {
    configManager,
    factory
  };
}

/**
 * Reset the complete hook system (mainly for testing)
 */
export function resetHookSystem() {
  resetHookConfigurationManager();
  resetHookServiceFactory();
}