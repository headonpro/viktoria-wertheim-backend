/**
 * Hook Service Factory
 * 
 * Factory pattern implementation for creating hook services with dependency injection
 * and service registry management. Provides centralized service creation and configuration.
 */

import { BaseHookService, HookConfiguration } from './BaseHookService';
import { TableHookService } from './TableHookService';

/**
 * Service registry entry
 */
interface ServiceRegistryEntry {
  service: BaseHookService;
  contentType: string;
  created: Date;
  lastAccessed: Date;
  accessCount: number;
}

/**
 * Factory configuration
 */
interface FactoryConfiguration {
  enableServiceCaching: boolean;
  maxCacheSize: number;
  cacheExpirationMs: number;
  defaultHookConfig: Partial<HookConfiguration>;
}

/**
 * Service creation options
 */
interface ServiceCreationOptions {
  contentType: string;
  config?: Partial<HookConfiguration>;
  forceNew?: boolean;
}

/**
 * Default factory configuration
 */
const DEFAULT_FACTORY_CONFIG: FactoryConfiguration = {
  enableServiceCaching: true,
  maxCacheSize: 50,
  cacheExpirationMs: 30 * 60 * 1000, // 30 minutes
  defaultHookConfig: {
    enableStrictValidation: false,
    enableAsyncCalculations: true,
    maxHookExecutionTime: 100,
    retryAttempts: 2,
    enableGracefulDegradation: true,
    logLevel: 'warn'
  }
};

/**
 * Hook Service Factory Class
 */
export class HookServiceFactory {
  private strapi: any;
  private config: FactoryConfiguration;
  private serviceRegistry: Map<string, ServiceRegistryEntry> = new Map();
  private serviceConstructors: Map<string, new (strapi: any, contentType: string, config?: Partial<HookConfiguration>) => BaseHookService> = new Map();

  constructor(strapi: any, config: Partial<FactoryConfiguration> = {}) {
    this.strapi = strapi;
    this.config = { ...DEFAULT_FACTORY_CONFIG, ...config };
    
    // Register default service constructors
    this.registerDefaultServices();
    
    // Initialize cleanup interval for expired services
    this.initializeCleanupInterval();
    
    this.logInfo('HookServiceFactory initialized', {
      config: this.config,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Register a service constructor for a specific content type
   */
  registerService<T extends BaseHookService>(
    contentType: string,
    serviceConstructor: new (strapi: any, contentType: string, config?: Partial<HookConfiguration>) => T
  ): void {
    this.serviceConstructors.set(contentType, serviceConstructor);
    this.logDebug(`Service registered for content type: ${contentType}`);
  }

  /**
   * Create or retrieve a hook service for the specified content type
   */
  createService(options: ServiceCreationOptions): BaseHookService {
    const { contentType, config = {}, forceNew = false } = options;
    
    // Check if service exists in registry and caching is enabled
    if (!forceNew && this.config.enableServiceCaching) {
      const cachedService = this.getCachedService(contentType);
      if (cachedService) {
        this.logDebug(`Retrieved cached service for: ${contentType}`);
        return cachedService;
      }
    }

    // Create new service instance
    const service = this.createNewService(contentType, config);
    
    // Cache the service if caching is enabled
    if (this.config.enableServiceCaching) {
      this.cacheService(contentType, service);
    }

    this.logInfo(`Created new service for: ${contentType}`);
    return service;
  }

  /**
   * Create team hook service
   */
  createTeamService(config?: Partial<HookConfiguration>): BaseHookService {
    return this.createService({
      contentType: 'api::team.team',
      config
    });
  }

  /**
   * Create saison hook service
   */
  createSaisonService(config?: Partial<HookConfiguration>): BaseHookService {
    return this.createService({
      contentType: 'api::saison.saison',
      config
    });
  }

  /**
   * Create table hook service
   */
  createTableService(config?: Partial<HookConfiguration>): BaseHookService {
    return this.createService({
      contentType: 'api::tabellen-eintrag.tabellen-eintrag',
      config
    });
  }

  /**
   * Get service by content type (creates if not exists)
   */
  getService(contentType: string, config?: Partial<HookConfiguration>): BaseHookService {
    return this.createService({ contentType, config });
  }

  /**
   * Check if service is registered for content type
   */
  hasService(contentType: string): boolean {
    return this.serviceConstructors.has(contentType);
  }

  /**
   * Get all registered content types
   */
  getRegisteredContentTypes(): string[] {
    return Array.from(this.serviceConstructors.keys());
  }

  /**
   * Get service registry statistics
   */
  getRegistryStats(): {
    totalServices: number;
    cachedServices: number;
    registeredTypes: number;
    oldestService: Date | null;
    newestService: Date | null;
  } {
    const entries = Array.from(this.serviceRegistry.values());
    
    return {
      totalServices: this.serviceConstructors.size,
      cachedServices: entries.length,
      registeredTypes: this.serviceConstructors.size,
      oldestService: entries.length > 0 ? 
        new Date(Math.min(...entries.map(e => e.created.getTime()))) : null,
      newestService: entries.length > 0 ? 
        new Date(Math.max(...entries.map(e => e.created.getTime()))) : null
    };
  }

  /**
   * Clear service cache
   */
  clearCache(): void {
    this.serviceRegistry.clear();
    this.logInfo('Service cache cleared');
  }

  /**
   * Remove specific service from cache
   */
  removeFromCache(contentType: string): boolean {
    const removed = this.serviceRegistry.delete(contentType);
    if (removed) {
      this.logDebug(`Service removed from cache: ${contentType}`);
    }
    return removed;
  }

  /**
   * Update factory configuration
   */
  updateConfig(newConfig: Partial<FactoryConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    this.logInfo('Factory configuration updated', this.config);
  }

  /**
   * Get current factory configuration
   */
  getConfig(): FactoryConfiguration {
    return { ...this.config };
  }

  /**
   * Get default hook configuration
   */
  getDefaultHookConfig(): Partial<HookConfiguration> {
    return { ...this.config.defaultHookConfig };
  }

  /**
   * Update default hook configuration
   */
  updateDefaultHookConfig(newConfig: Partial<HookConfiguration>): void {
    this.config.defaultHookConfig = { ...this.config.defaultHookConfig, ...newConfig };
    this.logInfo('Default hook configuration updated', this.config.defaultHookConfig);
  }

  /**
   * Private method to get cached service
   */
  private getCachedService(contentType: string): BaseHookService | null {
    const entry = this.serviceRegistry.get(contentType);
    
    if (!entry) {
      return null;
    }

    // Check if service has expired
    const now = Date.now();
    const age = now - entry.created.getTime();
    
    if (age > this.config.cacheExpirationMs) {
      this.serviceRegistry.delete(contentType);
      this.logDebug(`Expired service removed from cache: ${contentType}`);
      return null;
    }

    // Update access statistics
    entry.lastAccessed = new Date();
    entry.accessCount++;

    return entry.service;
  }

  /**
   * Private method to create new service instance
   */
  private createNewService(contentType: string, config: Partial<HookConfiguration>): BaseHookService {
    const ServiceConstructor = this.serviceConstructors.get(contentType);
    
    if (!ServiceConstructor) {
      // Create a generic service if no specific constructor is registered
      return this.createGenericService(contentType, config);
    }

    // Merge with default configuration
    const mergedConfig = { ...this.config.defaultHookConfig, ...config };
    
    return new ServiceConstructor(this.strapi, contentType, mergedConfig);
  }

  /**
   * Private method to create generic service for unregistered content types
   */
  private createGenericService(contentType: string, config: Partial<HookConfiguration>): BaseHookService {
    const mergedConfig = { ...this.config.defaultHookConfig, ...config };
    
    // Create a generic service implementation
    class GenericHookService extends BaseHookService {
      async beforeCreate(event: any) {
        return await this.executeHook('beforeCreate', event, async () => {
          this.logDebug(`Generic beforeCreate hook for ${this.contentType}`);
          return event.params.data;
        });
      }

      async beforeUpdate(event: any) {
        return await this.executeHook('beforeUpdate', event, async () => {
          this.logDebug(`Generic beforeUpdate hook for ${this.contentType}`);
          return event.params.data;
        });
      }

      async afterCreate(event: any) {
        await this.executeHook('afterCreate', event, async () => {
          this.logDebug(`Generic afterCreate hook for ${this.contentType}`);
        });
      }

      async afterUpdate(event: any) {
        await this.executeHook('afterUpdate', event, async () => {
          this.logDebug(`Generic afterUpdate hook for ${this.contentType}`);
        });
      }
    }

    this.logWarn(`Creating generic service for unregistered content type: ${contentType}`);
    return new GenericHookService(this.strapi, contentType, mergedConfig);
  }

  /**
   * Private method to cache service
   */
  private cacheService(contentType: string, service: BaseHookService): void {
    // Check cache size limit
    if (this.serviceRegistry.size >= this.config.maxCacheSize) {
      this.evictOldestService();
    }

    const entry: ServiceRegistryEntry = {
      service,
      contentType,
      created: new Date(),
      lastAccessed: new Date(),
      accessCount: 1
    };

    this.serviceRegistry.set(contentType, entry);
    this.logDebug(`Service cached: ${contentType}`);
  }

  /**
   * Private method to evict oldest service from cache
   */
  private evictOldestService(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.serviceRegistry.entries()) {
      if (entry.lastAccessed.getTime() < oldestTime) {
        oldestTime = entry.lastAccessed.getTime();
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.serviceRegistry.delete(oldestKey);
      this.logDebug(`Evicted oldest service from cache: ${oldestKey}`);
    }
  }

  /**
   * Private method to initialize cleanup interval
   */
  private initializeCleanupInterval(): void {
    // Run cleanup every 10 minutes
    setInterval(() => {
      this.cleanupExpiredServices();
    }, 10 * 60 * 1000);
  }

  /**
   * Private method to cleanup expired services
   */
  private cleanupExpiredServices(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.serviceRegistry.entries()) {
      const age = now - entry.created.getTime();
      if (age > this.config.cacheExpirationMs) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.serviceRegistry.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.logDebug(`Cleaned up ${expiredKeys.length} expired services`);
    }
  }

  /**
   * Register default service constructors
   */
  private registerDefaultServices(): void {
    // Register TableHookService for tabellen-eintrag content type
    this.registerService('api::tabellen-eintrag.tabellen-eintrag', TableHookService);
    
    this.logDebug('Default services registered');
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[HookServiceFactory] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[HookServiceFactory] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[HookServiceFactory] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[HookServiceFactory] ${message}`, error);
  }
}

/**
 * Singleton factory instance
 */
let factoryInstance: HookServiceFactory | null = null;

/**
 * Get or create factory instance
 */
export function getHookServiceFactory(
  strapi?: any, 
  config?: Partial<FactoryConfiguration>
): HookServiceFactory {
  if (!factoryInstance && strapi) {
    factoryInstance = new HookServiceFactory(strapi, config);
  }
  
  if (!factoryInstance) {
    throw new Error('HookServiceFactory not initialized. Call with strapi instance first.');
  }
  
  return factoryInstance;
}

/**
 * Initialize factory with strapi instance
 */
export function initializeHookServiceFactory(
  strapi: any, 
  config?: Partial<FactoryConfiguration>
): HookServiceFactory {
  factoryInstance = new HookServiceFactory(strapi, config);
  return factoryInstance;
}

/**
 * Reset factory instance (mainly for testing)
 */
export function resetHookServiceFactory(): void {
  factoryInstance = null;
}

export default HookServiceFactory;
export type { 
  ServiceRegistryEntry, 
  FactoryConfiguration, 
  ServiceCreationOptions 
};