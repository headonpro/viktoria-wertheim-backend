/**
 * Configuration Inheritance System
 * 
 * Handles configuration inheritance between environments and provides
 * tools for managing configuration hierarchies and overrides.
 * 
 * Requirements: 6.3, 6.1
 */

import {
  HookSystemConfiguration,
  HookConfiguration,
  FactoryConfiguration,
  ContentTypeConfiguration,
  FeatureFlagsConfiguration
} from './HookConfigurationSchema';

/**
 * Inheritance rule types
 */
export type InheritanceRule = 'merge' | 'override' | 'append' | 'ignore';

/**
 * Inheritance configuration
 */
export interface InheritanceConfig {
  field: string;
  rule: InheritanceRule;
  priority?: number;
  condition?: (value: any, parentValue: any) => boolean;
}

/**
 * Environment hierarchy definition
 */
export interface EnvironmentHierarchy {
  environment: string;
  inheritsFrom?: string[];
  inheritanceRules: InheritanceConfig[];
  priority: number;
}

/**
 * Inheritance result
 */
export interface InheritanceResult {
  success: boolean;
  configuration: HookSystemConfiguration;
  appliedRules: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Configuration Inheritance Manager
 */
export class ConfigurationInheritance {
  private hierarchies: Map<string, EnvironmentHierarchy> = new Map();
  private defaultInheritanceRules: InheritanceConfig[] = [];

  constructor() {
    this.initializeDefaultHierarchies();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default environment hierarchies
   */
  private initializeDefaultHierarchies(): void {
    // Base hierarchy: test -> development -> staging -> production
    const hierarchies: EnvironmentHierarchy[] = [
      {
        environment: 'production',
        priority: 1,
        inheritanceRules: [
          { field: 'global.logLevel', rule: 'override' },
          { field: 'global.enableStrictValidation', rule: 'override' },
          { field: 'global.maxHookExecutionTime', rule: 'override' },
          { field: 'featureFlags', rule: 'merge' },
          { field: 'contentTypes', rule: 'merge' }
        ]
      },
      {
        environment: 'staging',
        inheritsFrom: ['production'],
        priority: 2,
        inheritanceRules: [
          { field: 'global.logLevel', rule: 'override' },
          { field: 'global.enableBackgroundJobs', rule: 'override' },
          { field: 'featureFlags.enableConfigurationUI', rule: 'override' },
          { field: 'contentTypes.*.customConfig', rule: 'merge' }
        ]
      },
      {
        environment: 'development',
        inheritsFrom: ['staging'],
        priority: 3,
        inheritanceRules: [
          { field: 'global.logLevel', rule: 'override' },
          { field: 'global.maxHookExecutionTime', rule: 'override' },
          { field: 'global.enableBackgroundJobs', rule: 'override' },
          { field: 'featureFlags', rule: 'merge' },
          { field: 'contentTypes.*.customConfig.enableDebugLogging', rule: 'override' }
        ]
      },
      {
        environment: 'test',
        inheritsFrom: ['development'],
        priority: 4,
        inheritanceRules: [
          { field: 'global.logLevel', rule: 'override' },
          { field: 'global.enableStrictValidation', rule: 'override' },
          { field: 'global.enableMetrics', rule: 'override' },
          { field: 'global.enableCaching', rule: 'override' },
          { field: 'factory.enableServiceCaching', rule: 'override' },
          { field: 'featureFlags', rule: 'override' }
        ]
      }
    ];

    for (const hierarchy of hierarchies) {
      this.hierarchies.set(hierarchy.environment, hierarchy);
    }
  }

  /**
   * Initialize default inheritance rules
   */
  private initializeDefaultRules(): void {
    this.defaultInheritanceRules = [
      // Global configuration rules
      { field: 'global', rule: 'merge', priority: 1 },
      { field: 'factory', rule: 'merge', priority: 1 },
      { field: 'contentTypes', rule: 'merge', priority: 1 },
      { field: 'featureFlags', rule: 'merge', priority: 1 },
      { field: 'metadata', rule: 'merge', priority: 1 },
      
      // Specific override rules
      { field: 'version', rule: 'override', priority: 2 },
      { field: 'metadata.environment', rule: 'override', priority: 2 },
      { field: 'metadata.updatedAt', rule: 'override', priority: 2 }
    ];
  }

  /**
   * Apply inheritance to configuration
   */
  async applyInheritance(
    baseConfiguration: HookSystemConfiguration,
    environment: string,
    environmentConfigs: Record<string, Partial<HookSystemConfiguration>>
  ): Promise<InheritanceResult> {
    const result: InheritanceResult = {
      success: false,
      configuration: JSON.parse(JSON.stringify(baseConfiguration)), // Deep clone
      appliedRules: [],
      warnings: [],
      errors: []
    };

    try {
      const hierarchy = this.hierarchies.get(environment);
      
      if (!hierarchy) {
        result.warnings.push(`No inheritance hierarchy defined for environment: ${environment}`);
        result.success = true;
        return result;
      }

      // Build inheritance chain
      const inheritanceChain = this.buildInheritanceChain(environment);
      
      // Apply inheritance in order
      for (const envName of inheritanceChain) {
        const envConfig = environmentConfigs[envName];
        
        if (envConfig) {
          const envHierarchy = this.hierarchies.get(envName);
          const rules = envHierarchy?.inheritanceRules || this.defaultInheritanceRules;
          
          this.applyConfigurationRules(result.configuration, envConfig, rules, result);
          result.appliedRules.push(`Applied ${envName} configuration`);
        }
      }

      // Apply environment-specific metadata
      result.configuration.metadata = {
        ...result.configuration.metadata,
        environment,
        updatedAt: new Date()
      };

      result.success = true;

    } catch (error) {
      result.errors.push(`Inheritance failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Build inheritance chain for environment
   */
  private buildInheritanceChain(environment: string): string[] {
    const chain: string[] = [];
    const visited = new Set<string>();
    
    const buildChain = (env: string) => {
      if (visited.has(env)) {
        throw new Error(`Circular inheritance detected: ${env}`);
      }
      
      visited.add(env);
      const hierarchy = this.hierarchies.get(env);
      
      if (hierarchy?.inheritsFrom) {
        for (const parent of hierarchy.inheritsFrom) {
          buildChain(parent);
        }
      }
      
      if (!chain.includes(env)) {
        chain.push(env);
      }
    };

    buildChain(environment);
    return chain;
  }

  /**
   * Apply configuration rules
   */
  private applyConfigurationRules(
    target: HookSystemConfiguration,
    source: Partial<HookSystemConfiguration>,
    rules: InheritanceConfig[],
    result: InheritanceResult
  ): void {
    // Sort rules by priority
    const sortedRules = rules.sort((a, b) => (a.priority || 0) - (b.priority || 0));

    for (const rule of sortedRules) {
      try {
        this.applyRule(target, source, rule, result);
      } catch (error) {
        result.warnings.push(`Failed to apply rule ${rule.field}: ${error.message}`);
      }
    }
  }

  /**
   * Apply single inheritance rule
   */
  private applyRule(
    target: any,
    source: any,
    rule: InheritanceConfig,
    result: InheritanceResult
  ): void {
    const fieldPath = rule.field.split('.');
    const sourceValue = this.getNestedValue(source, fieldPath);
    
    if (sourceValue === undefined) {
      return; // No value to inherit
    }

    const targetValue = this.getNestedValue(target, fieldPath);

    // Apply condition check if present
    if (rule.condition && !rule.condition(sourceValue, targetValue)) {
      return;
    }

    switch (rule.rule) {
      case 'override':
        this.setNestedValue(target, fieldPath, sourceValue);
        result.appliedRules.push(`Override: ${rule.field}`);
        break;
        
      case 'merge':
        if (typeof sourceValue === 'object' && typeof targetValue === 'object') {
          const merged = this.mergeObjects(targetValue || {}, sourceValue);
          this.setNestedValue(target, fieldPath, merged);
          result.appliedRules.push(`Merge: ${rule.field}`);
        } else {
          this.setNestedValue(target, fieldPath, sourceValue);
          result.appliedRules.push(`Override (non-object): ${rule.field}`);
        }
        break;
        
      case 'append':
        if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
          const appended = [...targetValue, ...sourceValue];
          this.setNestedValue(target, fieldPath, appended);
          result.appliedRules.push(`Append: ${rule.field}`);
        } else {
          result.warnings.push(`Cannot append non-array values for ${rule.field}`);
        }
        break;
        
      case 'ignore':
        result.appliedRules.push(`Ignore: ${rule.field}`);
        break;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string[]): any {
    let current = obj;
    
    for (const key of path) {
      if (key === '*') {
        // Wildcard handling - return all matching values
        if (typeof current === 'object' && current !== null) {
          const results: any = {};
          for (const [k, v] of Object.entries(current)) {
            results[k] = v;
          }
          return results;
        }
        return undefined;
      }
      
      if (current === null || current === undefined) {
        return undefined;
      }
      
      current = current[key];
    }
    
    return current;
  }

  /**
   * Set nested value in object
   */
  private setNestedValue(obj: any, path: string[], value: any): void {
    let current = obj;
    
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      
      if (key === '*') {
        // Wildcard handling - apply to all keys
        if (typeof current === 'object' && current !== null) {
          const remainingPath = path.slice(i + 1);
          for (const k of Object.keys(current)) {
            this.setNestedValue(current[k], remainingPath, value);
          }
        }
        return;
      }
      
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    const lastKey = path[path.length - 1];
    if (lastKey === '*') {
      // Apply to all keys at this level
      if (typeof current === 'object' && current !== null) {
        for (const k of Object.keys(current)) {
          current[k] = value;
        }
      }
    } else {
      current[lastKey] = value;
    }
  }

  /**
   * Merge two objects deeply
   */
  private mergeObjects(target: any, source: any): any {
    if (source === null || source === undefined) {
      return target;
    }
    
    if (target === null || target === undefined) {
      return source;
    }
    
    if (typeof target !== 'object' || typeof source !== 'object') {
      return source;
    }
    
    if (Array.isArray(source)) {
      return source;
    }
    
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.mergeObjects(result[key], value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Add custom environment hierarchy
   */
  addEnvironmentHierarchy(hierarchy: EnvironmentHierarchy): void {
    this.hierarchies.set(hierarchy.environment, hierarchy);
  }

  /**
   * Get environment hierarchy
   */
  getEnvironmentHierarchy(environment: string): EnvironmentHierarchy | undefined {
    return this.hierarchies.get(environment);
  }

  /**
   * Get all environment hierarchies
   */
  getAllHierarchies(): EnvironmentHierarchy[] {
    return Array.from(this.hierarchies.values());
  }

  /**
   * Validate inheritance configuration
   */
  validateInheritance(environment: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    try {
      const chain = this.buildInheritanceChain(environment);
      result.warnings.push(`Inheritance chain: ${chain.join(' -> ')}`);
    } catch (error) {
      result.isValid = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Get effective configuration for environment
   */
  async getEffectiveConfiguration(
    baseConfiguration: HookSystemConfiguration,
    environment: string,
    environmentConfigs: Record<string, Partial<HookSystemConfiguration>>
  ): Promise<HookSystemConfiguration> {
    const inheritanceResult = await this.applyInheritance(
      baseConfiguration,
      environment,
      environmentConfigs
    );

    if (!inheritanceResult.success) {
      throw new Error(`Failed to apply inheritance: ${inheritanceResult.errors.join(', ')}`);
    }

    return inheritanceResult.configuration;
  }

  /**
   * Compare configurations between environments
   */
  compareEnvironmentConfigurations(
    config1: HookSystemConfiguration,
    config2: HookSystemConfiguration
  ): {
    differences: Array<{
      path: string;
      value1: any;
      value2: any;
      type: 'added' | 'removed' | 'changed';
    }>;
    summary: {
      totalDifferences: number;
      addedFields: number;
      removedFields: number;
      changedFields: number;
    };
  } {
    const differences: Array<{
      path: string;
      value1: any;
      value2: any;
      type: 'added' | 'removed' | 'changed';
    }> = [];

    const compare = (obj1: any, obj2: any, path: string = '') => {
      const keys1 = obj1 ? Object.keys(obj1) : [];
      const keys2 = obj2 ? Object.keys(obj2) : [];
      const allKeys = new Set([...keys1, ...keys2]);

      for (const key of allKeys) {
        const currentPath = path ? `${path}.${key}` : key;
        const value1 = obj1?.[key];
        const value2 = obj2?.[key];

        if (value1 === undefined && value2 !== undefined) {
          differences.push({
            path: currentPath,
            value1,
            value2,
            type: 'added'
          });
        } else if (value1 !== undefined && value2 === undefined) {
          differences.push({
            path: currentPath,
            value1,
            value2,
            type: 'removed'
          });
        } else if (value1 !== value2) {
          if (typeof value1 === 'object' && typeof value2 === 'object' && 
              value1 !== null && value2 !== null && 
              !Array.isArray(value1) && !Array.isArray(value2)) {
            compare(value1, value2, currentPath);
          } else {
            differences.push({
              path: currentPath,
              value1,
              value2,
              type: 'changed'
            });
          }
        }
      }
    };

    compare(config1, config2);

    const summary = {
      totalDifferences: differences.length,
      addedFields: differences.filter(d => d.type === 'added').length,
      removedFields: differences.filter(d => d.type === 'removed').length,
      changedFields: differences.filter(d => d.type === 'changed').length
    };

    return { differences, summary };
  }
}

/**
 * Singleton inheritance instance
 */
let inheritanceInstance: ConfigurationInheritance | null = null;

/**
 * Get configuration inheritance instance
 */
export function getConfigurationInheritance(): ConfigurationInheritance {
  if (!inheritanceInstance) {
    inheritanceInstance = new ConfigurationInheritance();
  }
  return inheritanceInstance;
}

export default ConfigurationInheritance;