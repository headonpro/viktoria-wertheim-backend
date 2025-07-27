/**
 * Validation Rule Manager
 * 
 * Manages validation rules across all content types with dependency resolution,
 * configuration management, and rule registration.
 * 
 * This implements Requirements 6.1 (configurable validation rules) and 8.2 (rule dependency resolution).
 */

import { ValidationRule, ValidationContext, getValidationService } from '../ValidationService';
import { getHookConfigurationManager } from '../HookConfigurationManager';
import { ValidationRuleRegistry } from './ValidationRuleRegistry';
import SaisonValidationRules from './SaisonValidationRules';
import TabellenEintragValidationRules from './TabellenEintragValidationRules';

/**
 * Rule configuration interface
 */
interface RuleConfig {
  enabled: boolean;
  type?: 'critical' | 'warning';
  priority?: number;
  dependencies?: string[];
  config?: Record<string, any>;
}

/**
 * Content type rule configuration
 */
interface ContentTypeRuleConfig {
  [ruleName: string]: RuleConfig;
}

/**
 * Validation Rule Manager Class
 */
export class ValidationRuleManager {
  private strapi: any;
  private registry: ValidationRuleRegistry;
  private configManager: any;
  private validationService: any;
  private contentTypeRules: Map<string, ValidationRule[]> = new Map();
  private ruleConfigurations: Map<string, ContentTypeRuleConfig> = new Map();

  constructor(strapi: any) {
    this.strapi = strapi;
    this.registry = new ValidationRuleRegistry(strapi);
    this.configManager = getHookConfigurationManager(strapi);
    this.validationService = getValidationService(strapi);
    
    this.initializeRules();
    this.loadRuleConfigurations();
  }

  /**
   * Get validation rules for a specific content type
   */
  getRulesForContentType(contentType: string): ValidationRule[] {
    if (!this.contentTypeRules.has(contentType)) {
      this.loadRulesForContentType(contentType);
    }
    
    return this.contentTypeRules.get(contentType) || [];
  }

  /**
   * Register a custom validation rule
   */
  registerRule(contentType: string, rule: ValidationRule): void {
    if (!this.contentTypeRules.has(contentType)) {
      this.contentTypeRules.set(contentType, []);
    }
    
    const rules = this.contentTypeRules.get(contentType)!;
    
    // Remove existing rule with same name
    const existingIndex = rules.findIndex(r => r.name === rule.name);
    if (existingIndex >= 0) {
      rules.splice(existingIndex, 1);
    }
    
    // Add new rule
    rules.push(rule);
    
    // Re-sort by priority
    rules.sort((a, b) => (a.priority || 100) - (b.priority || 100));
    
    // Register with validation service
    this.validationService.registerRule(rule);
    
    this.strapi.log.info(`Validation rule registered: ${rule.name} for ${contentType}`);
  }

  /**
   * Unregister a validation rule
   */
  unregisterRule(contentType: string, ruleName: string): boolean {
    const rules = this.contentTypeRules.get(contentType);
    if (!rules) return false;
    
    const index = rules.findIndex(r => r.name === ruleName);
    if (index >= 0) {
      rules.splice(index, 1);
      this.validationService.unregisterRule(ruleName);
      this.strapi.log.info(`Validation rule unregistered: ${ruleName} from ${contentType}`);
      return true;
    }
    
    return false;
  }

  /**
   * Enable or disable a validation rule
   */
  setRuleEnabled(contentType: string, ruleName: string, enabled: boolean): boolean {
    const rules = this.contentTypeRules.get(contentType);
    if (!rules) return false;
    
    const rule = rules.find(r => r.name === ruleName);
    if (rule) {
      rule.enabled = enabled;
      this.validationService.setRuleEnabled(ruleName, enabled);
      
      // Update configuration
      this.updateRuleConfiguration(contentType, ruleName, { enabled });
      
      this.strapi.log.info(`Validation rule ${enabled ? 'enabled' : 'disabled'}: ${ruleName} for ${contentType}`);
      return true;
    }
    
    return false;
  }

  /**
   * Update rule configuration
   */
  updateRuleConfiguration(contentType: string, ruleName: string, config: Partial<RuleConfig>): void {
    if (!this.ruleConfigurations.has(contentType)) {
      this.ruleConfigurations.set(contentType, {});
    }
    
    const contentTypeConfig = this.ruleConfigurations.get(contentType)!;
    if (!contentTypeConfig[ruleName]) {
      contentTypeConfig[ruleName] = { enabled: true };
    }
    
    Object.assign(contentTypeConfig[ruleName], config);
    
    // Apply configuration to existing rule
    const rules = this.contentTypeRules.get(contentType);
    if (rules) {
      const rule = rules.find(r => r.name === ruleName);
      if (rule) {
        if (config.enabled !== undefined) rule.enabled = config.enabled;
        if (config.type !== undefined) rule.type = config.type;
        if (config.priority !== undefined) rule.priority = config.priority;
        if (config.dependencies !== undefined) rule.dependencies = config.dependencies;
      }
    }
  }

  /**
   * Get rule configuration for content type
   */
  getRuleConfiguration(contentType: string): ContentTypeRuleConfig {
    return this.ruleConfigurations.get(contentType) || {};
  }

  /**
   * Validate data using rules for specific content type
   */
  async validateData(
    data: any,
    contentType: string,
    context: ValidationContext
  ): Promise<any> {
    const rules = this.getRulesForContentType(contentType);
    
    if (rules.length === 0) {
      return this.validationService.validateAll(data, contentType, context);
    }
    
    // Use validation service with content type specific rules
    return await this.validationService.validateAll(data, contentType, context);
  }

  /**
   * Initialize all validation rules
   */
  private initializeRules(): void {
    this.initializeSaisonRules();
    this.initializeTabellenEintragRules();
    this.initializeTeamRules();
    this.initializeLigaRules();
    this.initializeSpielerRules();
  }

  /**
   * Initialize saison validation rules
   */
  private initializeSaisonRules(): void {
    const saisonRules = new SaisonValidationRules(this.strapi);
    const rules = saisonRules.getAllRules();
    
    this.contentTypeRules.set('api::saison.saison', rules);
    
    // Register each rule with validation service
    for (const rule of rules) {
      this.validationService.registerRule(rule);
    }
  }

  /**
   * Initialize tabellen-eintrag validation rules
   */
  private initializeTabellenEintragRules(): void {
    const tabellenRules = new TabellenEintragValidationRules(this.strapi);
    const rules = tabellenRules.getAllRules();
    
    this.contentTypeRules.set('api::tabellen-eintrag.tabellen-eintrag', rules);
    
    // Register each rule with validation service
    for (const rule of rules) {
      this.validationService.registerRule(rule);
    }
  }

  /**
   * Initialize team validation rules
   */
  private initializeTeamRules(): void {
    const rules: ValidationRule[] = [
      {
        name: 'team-required-name',
        type: 'critical',
        validator: (data: any) => {
          return data.name && data.name.trim() !== '';
        },
        message: 'Der Team-Name ist erforderlich.',
        enabled: true,
        priority: 1
      },
      {
        name: 'team-name-length',
        type: 'warning',
        validator: (data: any) => {
          if (!data.name) return true;
          const name = data.name.trim();
          return name.length >= 2 && name.length <= 100;
        },
        message: 'Der Team-Name muss zwischen 2 und 100 Zeichen lang sein.',
        enabled: true,
        priority: 2
      },
      {
        name: 'team-unique-in-league-season',
        type: 'warning',
        validator: async (data: any, context?: ValidationContext) => {
          if (!data.name || !data.liga || !data.saison) return true;
          
          try {
            const filters: any = {
              name: data.name,
              liga: data.liga,
              saison: data.saison
            };
            
            if (context?.operation === 'update' && context.existingData?.id) {
              filters.id = { $ne: context.existingData.id };
            }
            
            const existing = await this.strapi.entityService.findMany('api::team.team', {
              filters,
              pagination: { limit: 1 }
            });
            
            return !existing || (Array.isArray(existing) ? existing.length === 0 : false);
          } catch (error) {
            this.strapi.log.warn('Team uniqueness validation failed:', error);
            return true;
          }
        },
        message: 'Ein Team mit diesem Namen existiert bereits in dieser Liga und Saison.',
        enabled: true,
        priority: 5,
        async: true
      }
    ];
    
    this.contentTypeRules.set('api::team.team', rules);
    
    // Register each rule with validation service
    for (const rule of rules) {
      this.validationService.registerRule(rule);
    }
  }

  /**
   * Initialize liga validation rules
   */
  private initializeLigaRules(): void {
    const rules: ValidationRule[] = [
      {
        name: 'liga-required-name',
        type: 'critical',
        validator: (data: any) => {
          return data.name && data.name.trim() !== '';
        },
        message: 'Der Liga-Name ist erforderlich.',
        enabled: true,
        priority: 1
      },
      {
        name: 'liga-name-length',
        type: 'warning',
        validator: (data: any) => {
          if (!data.name) return true;
          const name = data.name.trim();
          return name.length >= 2 && name.length <= 100;
        },
        message: 'Der Liga-Name muss zwischen 2 und 100 Zeichen lang sein.',
        enabled: true,
        priority: 2
      },
      {
        name: 'liga-unique-name',
        type: 'warning',
        validator: async (data: any, context?: ValidationContext) => {
          if (!data.name) return true;
          
          try {
            const filters: any = { name: data.name };
            
            if (context?.operation === 'update' && context.existingData?.id) {
              filters.id = { $ne: context.existingData.id };
            }
            
            const existing = await this.strapi.entityService.findMany('api::liga.liga', {
              filters,
              pagination: { limit: 1 }
            });
            
            return !existing || (Array.isArray(existing) ? existing.length === 0 : false);
          } catch (error) {
            this.strapi.log.warn('Liga uniqueness validation failed:', error);
            return true;
          }
        },
        message: 'Eine Liga mit diesem Namen existiert bereits.',
        enabled: true,
        priority: 5,
        async: true
      }
    ];
    
    this.contentTypeRules.set('api::liga.liga', rules);
    
    // Register each rule with validation service
    for (const rule of rules) {
      this.validationService.registerRule(rule);
    }
  }

  /**
   * Initialize spieler validation rules
   */
  private initializeSpielerRules(): void {
    const rules: ValidationRule[] = [
      {
        name: 'spieler-required-name',
        type: 'critical',
        validator: (data: any) => {
          return data.name && data.name.trim() !== '';
        },
        message: 'Der Spieler-Name ist erforderlich.',
        enabled: true,
        priority: 1
      },
      {
        name: 'spieler-name-length',
        type: 'warning',
        validator: (data: any) => {
          if (!data.name) return true;
          const name = data.name.trim();
          return name.length >= 2 && name.length <= 100;
        },
        message: 'Der Spieler-Name muss zwischen 2 und 100 Zeichen lang sein.',
        enabled: true,
        priority: 2
      }
    ];
    
    this.contentTypeRules.set('api::spieler.spieler', rules);
    
    // Register each rule with validation service
    for (const rule of rules) {
      this.validationService.registerRule(rule);
    }
  }

  /**
   * Load rules for specific content type
   */
  private loadRulesForContentType(contentType: string): void {
    // Rules are already loaded during initialization
    // This method is for future dynamic loading if needed
  }

  /**
   * Load rule configurations from environment and config manager
   */
  private loadRuleConfigurations(): void {
    // Load from environment variables
    this.loadEnvironmentConfigurations();
    
    // Load from configuration manager
    this.loadConfigManagerConfigurations();
  }

  /**
   * Load configurations from environment variables
   */
  private loadEnvironmentConfigurations(): void {
    // Saison configurations
    this.updateRuleConfiguration('api::saison.saison', 'saison-overlap-validation', {
      enabled: process.env.SAISON_OVERLAP_VALIDATION === 'true',
      type: process.env.SAISON_STRICT_VALIDATION === 'true' ? 'critical' : 'warning'
    });
    
    // Global validation settings
    const strictValidation = process.env.ENABLE_STRICT_VALIDATION === 'true';
    if (strictValidation) {
      // Make all warning rules critical in strict mode
      for (const [contentType, rules] of this.contentTypeRules.entries()) {
        for (const rule of rules) {
          if (rule.type === 'warning') {
            this.updateRuleConfiguration(contentType, rule.name, { type: 'critical' });
          }
        }
      }
    }
  }

  /**
   * Load configurations from configuration manager
   */
  private loadConfigManagerConfigurations(): void {
    try {
      const globalConfig = this.configManager.getGlobalConfig();
      
      // Apply global settings to all rules
      if (!globalConfig.enableStrictValidation) {
        // Disable critical validations that are not essential
        const nonEssentialCriticalRules = [
          'saison-overlap-validation',
          'team-unique-in-league-season',
          'liga-unique-name'
        ];
        
        for (const [contentType, rules] of this.contentTypeRules.entries()) {
          for (const rule of rules) {
            if (nonEssentialCriticalRules.includes(rule.name)) {
              this.updateRuleConfiguration(contentType, rule.name, { type: 'warning' });
            }
          }
        }
      }
      
      // Apply feature flags
      const advancedValidationEnabled = this.configManager.getFeatureFlag('enableAdvancedValidation');
      if (!advancedValidationEnabled) {
        // Disable advanced validation rules
        const advancedRules = [
          'table-data-consistency',
          'goal-statistics-validation',
          'points-calculation',
          'goal-difference-calculation'
        ];
        
        for (const [contentType, rules] of this.contentTypeRules.entries()) {
          for (const rule of rules) {
            if (advancedRules.includes(rule.name)) {
              this.updateRuleConfiguration(contentType, rule.name, { enabled: false });
            }
          }
        }
      }
      
    } catch (error) {
      this.strapi.log.warn('Failed to load configuration manager settings:', error);
    }
  }

  /**
   * Get validation statistics
   */
  getValidationStatistics(): any {
    const stats = {
      totalRules: 0,
      enabledRules: 0,
      criticalRules: 0,
      warningRules: 0,
      contentTypes: {} as Record<string, any>
    };
    
    for (const [contentType, rules] of this.contentTypeRules.entries()) {
      const contentTypeStats = {
        totalRules: rules.length,
        enabledRules: rules.filter(r => r.enabled).length,
        criticalRules: rules.filter(r => r.type === 'critical').length,
        warningRules: rules.filter(r => r.type === 'warning').length,
        rules: rules.map(r => ({
          name: r.name,
          type: r.type,
          enabled: r.enabled,
          priority: r.priority,
          async: r.async || false
        }))
      };
      
      stats.contentTypes[contentType] = contentTypeStats;
      stats.totalRules += contentTypeStats.totalRules;
      stats.enabledRules += contentTypeStats.enabledRules;
      stats.criticalRules += contentTypeStats.criticalRules;
      stats.warningRules += contentTypeStats.warningRules;
    }
    
    return stats;
  }
}

/**
 * Singleton validation rule manager instance
 */
let validationRuleManagerInstance: ValidationRuleManager | null = null;

/**
 * Get or create validation rule manager instance
 */
export function getValidationRuleManager(strapi?: any): ValidationRuleManager {
  if (!validationRuleManagerInstance && strapi) {
    validationRuleManagerInstance = new ValidationRuleManager(strapi);
  }
  
  if (!validationRuleManagerInstance) {
    throw new Error('ValidationRuleManager not initialized. Call with strapi instance first.');
  }
  
  return validationRuleManagerInstance;
}

/**
 * Initialize validation rule manager with strapi instance
 */
export function initializeValidationRuleManager(strapi: any): ValidationRuleManager {
  validationRuleManagerInstance = new ValidationRuleManager(strapi);
  return validationRuleManagerInstance;
}

/**
 * Reset validation rule manager instance (mainly for testing)
 */
export function resetValidationRuleManager(): void {
  validationRuleManagerInstance = null;
}

export default ValidationRuleManager;
export type { RuleConfig, ContentTypeRuleConfig };