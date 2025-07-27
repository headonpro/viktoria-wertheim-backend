/**
 * Feature Flag Service
 * 
 * Provides feature flag storage, retrieval, evaluation logic, and caching system.
 * Integrates with the existing configuration system to provide dynamic feature control.
 * 
 * Requirements: 6.2, 3.1
 */

import { EventEmitter } from 'events';

/**
 * Feature flag definition
 */
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  type: 'boolean' | 'percentage' | 'user' | 'environment';
  value?: any;
  conditions?: FeatureFlagCondition[];
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
    version: number;
    tags: string[];
  };
  rollout?: RolloutConfiguration;
  environments?: string[];
  expiry?: Date;
}

/**
 * Feature flag condition for advanced evaluation
 */
export interface FeatureFlagCondition {
  type: 'user' | 'environment' | 'percentage' | 'custom';
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains';
  field: string;
  value: any;
  weight?: number;
}

/**
 * Rollout configuration for gradual feature deployment
 */
export interface RolloutConfiguration {
  enabled: boolean;
  percentage: number;
  strategy: 'random' | 'user_id' | 'session' | 'sticky';
  groups?: string[];
  startDate?: Date;
  endDate?: Date;
}

/**
 * Feature flag evaluation context
 */
export interface FeatureFlagContext {
  userId?: string;
  sessionId?: string;
  environment: string;
  userAgent?: string;
  ipAddress?: string;
  customAttributes?: Record<string, any>;
  timestamp: Date;
}

/**
 * Feature flag evaluation result
 */
export interface FeatureFlagEvaluationResult {
  flagName: string;
  enabled: boolean;
  value?: any;
  reason: string;
  evaluationTime: number;
  context: FeatureFlagContext;
  matchedConditions?: FeatureFlagCondition[];
}

/**
 * Feature flag storage interface
 */
export interface FeatureFlagStorage {
  getFlag(name: string): Promise<FeatureFlag | null>;
  getAllFlags(): Promise<FeatureFlag[]>;
  setFlag(flag: FeatureFlag): Promise<void>;
  deleteFlag(name: string): Promise<boolean>;
  getFlagsByEnvironment(environment: string): Promise<FeatureFlag[]>;
  getFlagsByTag(tag: string): Promise<FeatureFlag[]>;
}

/**
 * Feature flag cache interface
 */
export interface FeatureFlagCache {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

/**
 * In-memory feature flag storage implementation
 */
class InMemoryFeatureFlagStorage implements FeatureFlagStorage {
  private flags: Map<string, FeatureFlag> = new Map();

  async getFlag(name: string): Promise<FeatureFlag | null> {
    return this.flags.get(name) || null;
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  async setFlag(flag: FeatureFlag): Promise<void> {
    this.flags.set(flag.name, { ...flag });
  }

  async deleteFlag(name: string): Promise<boolean> {
    return this.flags.delete(name);
  }

  async getFlagsByEnvironment(environment: string): Promise<FeatureFlag[]> {
    const flags = Array.from(this.flags.values());
    return flags.filter(flag => 
      !flag.environments || flag.environments.includes(environment)
    );
  }

  async getFlagsByTag(tag: string): Promise<FeatureFlag[]> {
    const flags = Array.from(this.flags.values());
    return flags.filter(flag => flag.metadata.tags.includes(tag));
  }
}

/**
 * In-memory feature flag cache implementation
 */
class InMemoryFeatureFlagCache implements FeatureFlagCache {
  private cache: Map<string, { value: any; expiry: number }> = new Map();

  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  async set(key: string, value: any, ttlMs: number = 300000): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

/**
 * Feature Flag Service Implementation
 */
export class FeatureFlagService extends EventEmitter {
  private storage: FeatureFlagStorage;
  private cache: FeatureFlagCache;
  private strapi: any;
  private environment: string;
  private cacheEnabled: boolean;
  private cacheTtlMs: number;
  private evaluationMetrics: Map<string, number[]> = new Map();

  constructor(
    strapi: any,
    storage?: FeatureFlagStorage,
    cache?: FeatureFlagCache,
    options: {
      cacheEnabled?: boolean;
      cacheTtlMs?: number;
    } = {}
  ) {
    super();
    
    this.strapi = strapi;
    this.environment = process.env.NODE_ENV || 'development';
    this.storage = storage || new InMemoryFeatureFlagStorage();
    this.cache = cache || new InMemoryFeatureFlagCache();
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.cacheTtlMs = options.cacheTtlMs ?? 300000; // 5 minutes

    this.initializeDefaultFlags();
    this.logInfo('FeatureFlagService initialized', {
      environment: this.environment,
      cacheEnabled: this.cacheEnabled,
      cacheTtlMs: this.cacheTtlMs
    });
  }

  /**
   * Evaluate a feature flag
   */
  async isEnabled(flagName: string, context?: Partial<FeatureFlagContext>): Promise<boolean> {
    const result = await this.evaluate(flagName, context);
    return result.enabled;
  }

  /**
   * Get feature flag value
   */
  async getValue(flagName: string, context?: Partial<FeatureFlagContext>): Promise<any> {
    const result = await this.evaluate(flagName, context);
    return result.value;
  }

  /**
   * Evaluate feature flag with full result
   */
  async evaluate(flagName: string, context?: Partial<FeatureFlagContext>): Promise<FeatureFlagEvaluationResult> {
    const startTime = Date.now();
    const evaluationContext = this.buildContext(context);
    
    try {
      // Check cache first
      if (this.cacheEnabled) {
        const cacheKey = this.buildCacheKey(flagName, evaluationContext);
        const cachedResult = await this.cache.get(cacheKey);
        if (cachedResult) {
          this.recordEvaluationMetric(flagName, Date.now() - startTime);
          return {
            ...cachedResult,
            evaluationTime: Date.now() - startTime
          };
        }
      }

      // Get flag from storage
      const flag = await this.storage.getFlag(flagName);
      
      if (!flag) {
        const result = this.createDefaultResult(flagName, evaluationContext, 'Flag not found', startTime);
        this.logWarn(`Feature flag not found: ${flagName}`);
        return result;
      }

      // Check if flag is expired
      if (flag.expiry && flag.expiry < new Date()) {
        const result = this.createDefaultResult(flagName, evaluationContext, 'Flag expired', startTime);
        this.logInfo(`Feature flag expired: ${flagName}`);
        return result;
      }

      // Check environment
      if (flag.environments && !flag.environments.includes(evaluationContext.environment)) {
        const result = this.createDefaultResult(flagName, evaluationContext, 'Environment not allowed', startTime);
        return result;
      }

      // Evaluate flag
      const result = await this.evaluateFlag(flag, evaluationContext, startTime);

      // Cache result
      if (this.cacheEnabled) {
        const cacheKey = this.buildCacheKey(flagName, evaluationContext);
        await this.cache.set(cacheKey, result, this.cacheTtlMs);
      }

      this.recordEvaluationMetric(flagName, result.evaluationTime);
      this.emit('flagEvaluated', result);

      return result;

    } catch (error) {
      this.logError(`Error evaluating feature flag: ${flagName}`, error);
      const result = this.createDefaultResult(flagName, evaluationContext, `Evaluation error: ${error.message}`, startTime);
      return result;
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    try {
      return await this.storage.getAllFlags();
    } catch (error) {
      this.logError('Error getting all feature flags', error);
      return [];
    }
  }

  /**
   * Get feature flags for current environment
   */
  async getEnvironmentFlags(): Promise<FeatureFlag[]> {
    try {
      return await this.storage.getFlagsByEnvironment(this.environment);
    } catch (error) {
      this.logError('Error getting environment feature flags', error);
      return [];
    }
  }

  /**
   * Create or update a feature flag
   */
  async setFlag(flag: Partial<FeatureFlag>): Promise<FeatureFlag> {
    try {
      const existingFlag = await this.storage.getFlag(flag.name!);
      
      const newFlag: FeatureFlag = {
        name: flag.name!,
        enabled: flag.enabled ?? false,
        description: flag.description ?? '',
        type: flag.type ?? 'boolean',
        value: flag.value,
        conditions: flag.conditions ?? [],
        metadata: {
          createdAt: existingFlag?.metadata.createdAt ?? new Date(),
          updatedAt: new Date(),
          createdBy: existingFlag?.metadata.createdBy ?? flag.metadata?.createdBy,
          updatedBy: flag.metadata?.updatedBy,
          version: (existingFlag?.metadata.version ?? 0) + 1,
          tags: flag.metadata?.tags ?? []
        },
        rollout: flag.rollout,
        environments: flag.environments,
        expiry: flag.expiry
      };

      await this.storage.setFlag(newFlag);
      
      // Clear cache for this flag
      if (this.cacheEnabled) {
        await this.clearFlagCache(flag.name!);
      }

      this.emit('flagUpdated', { flag: newFlag, previous: existingFlag });
      this.logInfo(`Feature flag ${existingFlag ? 'updated' : 'created'}: ${flag.name}`);

      return newFlag;

    } catch (error) {
      this.logError(`Error setting feature flag: ${flag.name}`, error);
      throw error;
    }
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(flagName: string): Promise<boolean> {
    try {
      const existingFlag = await this.storage.getFlag(flagName);
      const deleted = await this.storage.deleteFlag(flagName);
      
      if (deleted) {
        // Clear cache for this flag
        if (this.cacheEnabled) {
          await this.clearFlagCache(flagName);
        }

        this.emit('flagDeleted', { flag: existingFlag });
        this.logInfo(`Feature flag deleted: ${flagName}`);
      }

      return deleted;

    } catch (error) {
      this.logError(`Error deleting feature flag: ${flagName}`, error);
      return false;
    }
  }

  /**
   * Get evaluation metrics for a flag
   */
  getEvaluationMetrics(flagName: string): { count: number; averageTime: number } {
    const metrics = this.evaluationMetrics.get(flagName) || [];
    return {
      count: metrics.length,
      averageTime: metrics.length > 0 ? metrics.reduce((a, b) => a + b, 0) / metrics.length : 0
    };
  }

  /**
   * Clear cache for all flags
   */
  async clearCache(): Promise<void> {
    if (this.cacheEnabled) {
      await this.cache.clear();
      this.logInfo('Feature flag cache cleared');
    }
  }

  /**
   * Clear cache for specific flag
   */
  async clearFlagCache(flagName: string): Promise<void> {
    if (this.cacheEnabled) {
      // We need to clear all cache entries that start with the flag name
      // Since we don't have a pattern delete, we'll implement a simple approach
      const cacheKey = `flag:${flagName}:`;
      await this.cache.delete(cacheKey);
      this.logDebug(`Cache cleared for flag: ${flagName}`);
    }
  }

  /**
   * Initialize default feature flags
   */
  private async initializeDefaultFlags(): Promise<void> {
    const defaultFlags: Partial<FeatureFlag>[] = [
      {
        name: 'enableHookMetrics',
        enabled: true,
        description: 'Enable collection of hook performance metrics',
        type: 'boolean',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: ['hooks', 'metrics', 'performance']
        }
      },
      {
        name: 'enableBackgroundJobs',
        enabled: true,
        description: 'Enable background job processing system',
        type: 'boolean',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: ['hooks', 'jobs', 'performance']
        }
      },
      {
        name: 'enableAdvancedValidation',
        enabled: false,
        description: 'Enable advanced validation features',
        type: 'boolean',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: ['hooks', 'validation']
        }
      },
      {
        name: 'enableConfigurationUI',
        enabled: false,
        description: 'Enable web UI for configuration management',
        type: 'boolean',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: ['configuration', 'ui']
        }
      },
      {
        name: 'enableHookProfiling',
        enabled: false,
        description: 'Enable detailed profiling of hook execution',
        type: 'boolean',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: ['hooks', 'profiling', 'debug']
        }
      },
      {
        name: 'enableAsyncValidation',
        enabled: false,
        description: 'Enable asynchronous validation processing',
        type: 'boolean',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: ['hooks', 'validation', 'async']
        }
      },
      {
        name: 'enableValidationCaching',
        enabled: true,
        description: 'Enable caching of validation results',
        type: 'boolean',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: ['hooks', 'validation', 'cache']
        }
      },
      {
        name: 'enableCalculationCaching',
        enabled: true,
        description: 'Enable caching of calculation results',
        type: 'boolean',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: ['hooks', 'calculations', 'cache']
        }
      },
      {
        name: 'enableHookChaining',
        enabled: false,
        description: 'Enable chaining of multiple hooks',
        type: 'boolean',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: ['hooks', 'chaining', 'advanced']
        }
      },
      {
        name: 'enableConditionalHooks',
        enabled: false,
        description: 'Enable conditional hook execution based on data',
        type: 'boolean',
        metadata: {
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          tags: ['hooks', 'conditional', 'advanced']
        }
      }
    ];

    for (const flag of defaultFlags) {
      const existing = await this.storage.getFlag(flag.name!);
      if (!existing) {
        await this.setFlag(flag);
      }
    }
  }

  /**
   * Evaluate individual flag
   */
  private async evaluateFlag(
    flag: FeatureFlag,
    context: FeatureFlagContext,
    startTime: number
  ): Promise<FeatureFlagEvaluationResult> {
    // Simple boolean flag
    if (flag.type === 'boolean' && !flag.conditions?.length && !flag.rollout?.enabled) {
      return {
        flagName: flag.name,
        enabled: flag.enabled,
        value: flag.value ?? flag.enabled,
        reason: 'Simple boolean evaluation',
        evaluationTime: Date.now() - startTime,
        context
      };
    }

    // Rollout evaluation
    if (flag.rollout?.enabled) {
      const rolloutResult = this.evaluateRollout(flag, context);
      if (!rolloutResult.enabled) {
        return {
          flagName: flag.name,
          enabled: false,
          value: false,
          reason: rolloutResult.reason,
          evaluationTime: Date.now() - startTime,
          context
        };
      }
    }

    // Condition evaluation
    if (flag.conditions?.length) {
      const conditionResult = this.evaluateConditions(flag.conditions, context);
      return {
        flagName: flag.name,
        enabled: flag.enabled && conditionResult.enabled,
        value: flag.value ?? (flag.enabled && conditionResult.enabled),
        reason: conditionResult.reason,
        evaluationTime: Date.now() - startTime,
        context,
        matchedConditions: conditionResult.matchedConditions
      };
    }

    // Default evaluation
    return {
      flagName: flag.name,
      enabled: flag.enabled,
      value: flag.value ?? flag.enabled,
      reason: 'Default evaluation',
      evaluationTime: Date.now() - startTime,
      context
    };
  }

  /**
   * Evaluate rollout configuration
   */
  private evaluateRollout(flag: FeatureFlag, context: FeatureFlagContext): { enabled: boolean; reason: string } {
    const rollout = flag.rollout!;

    // Check date range
    if (rollout.startDate && context.timestamp < rollout.startDate) {
      return { enabled: false, reason: 'Rollout not started' };
    }
    
    if (rollout.endDate && context.timestamp > rollout.endDate) {
      return { enabled: false, reason: 'Rollout ended' };
    }

    // Check percentage
    if (rollout.percentage < 100) {
      const hash = this.hashString(`${flag.name}:${context.userId || context.sessionId || 'anonymous'}`);
      const userPercentage = hash % 100;
      
      if (userPercentage >= rollout.percentage) {
        return { enabled: false, reason: `User not in rollout percentage (${rollout.percentage}%)` };
      }
    }

    return { enabled: true, reason: 'Rollout criteria met' };
  }

  /**
   * Evaluate conditions
   */
  private evaluateConditions(
    conditions: FeatureFlagCondition[],
    context: FeatureFlagContext
  ): { enabled: boolean; reason: string; matchedConditions: FeatureFlagCondition[] } {
    const matchedConditions: FeatureFlagCondition[] = [];
    
    for (const condition of conditions) {
      if (this.evaluateCondition(condition, context)) {
        matchedConditions.push(condition);
      }
    }

    const enabled = matchedConditions.length > 0;
    const reason = enabled 
      ? `Matched ${matchedConditions.length} condition(s)`
      : 'No conditions matched';

    return { enabled, reason, matchedConditions };
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: FeatureFlagCondition, context: FeatureFlagContext): boolean {
    let contextValue: any;

    switch (condition.field) {
      case 'userId':
        contextValue = context.userId;
        break;
      case 'environment':
        contextValue = context.environment;
        break;
      case 'userAgent':
        contextValue = context.userAgent;
        break;
      default:
        contextValue = context.customAttributes?.[condition.field];
    }

    switch (condition.operator) {
      case 'equals':
        return contextValue === condition.value;
      case 'not_equals':
        return contextValue !== condition.value;
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(contextValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(contextValue);
      case 'greater_than':
        return typeof contextValue === 'number' && contextValue > condition.value;
      case 'less_than':
        return typeof contextValue === 'number' && contextValue < condition.value;
      case 'contains':
        return typeof contextValue === 'string' && contextValue.includes(condition.value);
      default:
        return false;
    }
  }

  /**
   * Build evaluation context
   */
  private buildContext(context?: Partial<FeatureFlagContext>): FeatureFlagContext {
    return {
      environment: this.environment,
      timestamp: new Date(),
      ...context
    };
  }

  /**
   * Build cache key
   */
  private buildCacheKey(flagName: string, context: FeatureFlagContext): string {
    const keyParts = [
      'flag',
      flagName,
      context.environment,
      context.userId || 'anonymous'
    ];
    return keyParts.join(':');
  }

  /**
   * Create default evaluation result
   */
  private createDefaultResult(
    flagName: string,
    context: FeatureFlagContext,
    reason: string,
    startTime: number
  ): FeatureFlagEvaluationResult {
    return {
      flagName,
      enabled: false,
      value: false,
      reason,
      evaluationTime: Date.now() - startTime,
      context
    };
  }

  /**
   * Record evaluation metric
   */
  private recordEvaluationMetric(flagName: string, evaluationTime: number): void {
    if (!this.evaluationMetrics.has(flagName)) {
      this.evaluationMetrics.set(flagName, []);
    }
    
    const metrics = this.evaluationMetrics.get(flagName)!;
    metrics.push(evaluationTime);
    
    // Keep only last 1000 evaluations
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[FeatureFlagService] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[FeatureFlagService] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[FeatureFlagService] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[FeatureFlagService] ${message}`, error);
  }
}

/**
 * Singleton feature flag service instance
 */
let featureFlagServiceInstance: FeatureFlagService | null = null;

/**
 * Get or create feature flag service instance
 */
export function getFeatureFlagService(
  strapi?: any,
  storage?: FeatureFlagStorage,
  cache?: FeatureFlagCache,
  options?: { cacheEnabled?: boolean; cacheTtlMs?: number }
): FeatureFlagService {
  if (!featureFlagServiceInstance && strapi) {
    featureFlagServiceInstance = new FeatureFlagService(strapi, storage, cache, options);
  }
  
  if (!featureFlagServiceInstance) {
    throw new Error('FeatureFlagService not initialized. Call with strapi instance first.');
  }
  
  return featureFlagServiceInstance;
}

/**
 * Initialize feature flag service with strapi instance
 */
export function initializeFeatureFlagService(
  strapi: any,
  storage?: FeatureFlagStorage,
  cache?: FeatureFlagCache,
  options?: { cacheEnabled?: boolean; cacheTtlMs?: number }
): FeatureFlagService {
  featureFlagServiceInstance = new FeatureFlagService(strapi, storage, cache, options);
  return featureFlagServiceInstance;
}

/**
 * Reset feature flag service instance (mainly for testing)
 */
export function resetFeatureFlagService(): void {
  featureFlagServiceInstance = null;
}

export default FeatureFlagService;