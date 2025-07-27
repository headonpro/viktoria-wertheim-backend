/**
 * Validation Rule Registry
 * 
 * Central registry for all validation rules with content type specific implementations.
 * Provides rule configuration and management for the validation system.
 * 
 * This implements Requirements 6.1 (configurable validations) and 8.2 (rule dependency resolution).
 */

import { ValidationRule, ValidationContext } from '../ValidationService';

/**
 * Rule configuration interface
 */
interface RuleConfiguration {
  contentType: string;
  enabled: boolean;
  priority: number;
  dependencies?: string[];
  config?: Record<string, any>;
}

/**
 * Rule factory function type
 */
type RuleFactory = (config?: Record<string, any>) => ValidationRule;

/**
 * Validation Rule Registry Class
 */
export class ValidationRuleRegistry {
  private ruleFactories: Map<string, RuleFactory> = new Map();
  private ruleConfigurations: Map<string, RuleConfiguration[]> = new Map();
  private strapi: any;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.initializeDefaultRules();
  }

  /**
   * Register a rule factory
   */
  registerRuleFactory(ruleName: string, factory: RuleFactory): void {
    this.ruleFactories.set(ruleName, factory);
  }

  /**
   * Register rule configuration for content type
   */
  registerRuleConfiguration(contentType: string, config: RuleConfiguration): void {
    if (!this.ruleConfigurations.has(contentType)) {
      this.ruleConfigurations.set(contentType, []);
    }
    this.ruleConfigurations.get(contentType)!.push(config);
  }

  /**
   * Get all rules for a content type
   */
  getRulesForContentType(contentType: string): ValidationRule[] {
    const configurations = this.ruleConfigurations.get(contentType) || [];
    const rules: ValidationRule[] = [];

    for (const config of configurations) {
      if (!config.enabled) continue;

      const factory = this.ruleFactories.get(config.contentType);
      if (factory) {
        const rule = factory(config.config);
        rule.priority = config.priority;
        rule.dependencies = config.dependencies;
        rules.push(rule);
      }
    }

    return rules.sort((a, b) => (a.priority || 100) - (b.priority || 100));
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Common validation rules
    this.registerCommonRules();
    
    // Content type specific rules
    this.registerSaisonRules();
    this.registerTeamRules();
    this.registerTabellenEintragRules();
    this.registerLigaRules();
    this.registerSpielerRules();
  }

  /**
   * Register common validation rules
   */
  private registerCommonRules(): void {
    // Required field validation
    this.registerRuleFactory('required-field', (config = {}) => ({
      name: 'required-field',
      type: 'critical',
      validator: (data: any, context?: ValidationContext) => {
        const field = config.field;
        if (!field) return true;
        
        const value = this.getNestedValue(data, field);
        return value !== null && value !== undefined && value !== '';
      },
      message: config.message || `Das Feld "${config.field}" ist erforderlich`,
      enabled: true,
      priority: 1
    }));

    // String length validation
    this.registerRuleFactory('string-length', (config = {}) => ({
      name: 'string-length',
      type: config.type || 'warning',
      validator: (data: any, context?: ValidationContext) => {
        const field = config.field;
        const minLength = config.minLength || 0;
        const maxLength = config.maxLength || Infinity;
        
        if (!field) return true;
        
        const value = this.getNestedValue(data, field);
        if (typeof value !== 'string') return true;
        
        return value.length >= minLength && value.length <= maxLength;
      },
      message: config.message || `Das Feld "${config.field}" muss zwischen ${config.minLength || 0} und ${config.maxLength || 'unbegrenzt'} Zeichen lang sein`,
      enabled: true,
      priority: 5
    }));

    // Date validation
    this.registerRuleFactory('date-validation', (config = {}) => ({
      name: 'date-validation',
      type: config.type || 'critical',
      validator: (data: any, context?: ValidationContext) => {
        const field = config.field;
        if (!field) return true;
        
        const value = this.getNestedValue(data, field);
        if (!value) return true;
        
        const date = new Date(value);
        return !isNaN(date.getTime());
      },
      message: config.message || `Das Feld "${config.field}" muss ein gültiges Datum enthalten`,
      enabled: true,
      priority: 3
    }));

    // Date range validation
    this.registerRuleFactory('date-range', (config = {}) => ({
      name: 'date-range',
      type: config.type || 'critical',
      validator: (data: any, context?: ValidationContext) => {
        const startField = config.startField;
        const endField = config.endField;
        
        if (!startField || !endField) return true;
        
        const startValue = this.getNestedValue(data, startField);
        const endValue = this.getNestedValue(data, endField);
        
        if (!startValue || !endValue) return true;
        
        const startDate = new Date(startValue);
        const endDate = new Date(endValue);
        
        return startDate < endDate;
      },
      message: config.message || `Das Startdatum muss vor dem Enddatum liegen`,
      enabled: true,
      priority: 4
    }));

    // Unique value validation
    this.registerRuleFactory('unique-value', (config = {}) => ({
      name: 'unique-value',
      type: config.type || 'warning',
      validator: async (data: any, context?: ValidationContext) => {
        const field = config.field;
        const contentType = config.contentType || context?.contentType;
        
        if (!field || !contentType) return true;
        
        const value = this.getNestedValue(data, field);
        if (!value) return true;
        
        try {
          const filters: any = { [field]: value };
          
          // Exclude current record during updates
          if (context?.operation === 'update' && context.existingData?.id) {
            filters.id = { $ne: context.existingData.id };
          }
          
          const existing = await this.strapi.entityService.findMany(contentType, {
            filters,
            pagination: { limit: 1 }
          });
          
          return !existing || (Array.isArray(existing) ? existing.length === 0 : false);
        } catch (error) {
          this.strapi.log.warn(`Unique validation failed for ${field}:`, error);
          return true; // Fail gracefully
        }
      },
      message: config.message || `Der Wert für "${config.field}" existiert bereits`,
      enabled: true,
      priority: 10,
      async: true
    }));
  }

  /**
   * Register saison-specific validation rules
   */
  private registerSaisonRules(): void {
    // Season date validation
    this.registerRuleFactory('saison-date-validation', (config = {}) => ({
      name: 'saison-date-validation',
      type: 'critical',
      validator: (data: any, context?: ValidationContext) => {
        if (!data.start_datum || !data.end_datum) {
          return !data.start_datum && !data.end_datum; // Both must be present or both absent
        }
        
        const startDate = new Date(data.start_datum);
        const endDate = new Date(data.end_datum);
        
        // Validate date format
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return false;
        }
        
        // Validate date logic
        return startDate < endDate;
      },
      message: 'Das Startdatum der Saison muss vor dem Enddatum liegen und beide Daten müssen gültig sein',
      enabled: true,
      priority: 1
    }));

    // Season overlap validation
    this.registerRuleFactory('saison-overlap-validation', (config = {}) => ({
      name: 'saison-overlap-validation',
      type: config.strict ? 'critical' : 'warning',
      validator: async (data: any, context?: ValidationContext) => {
        if (!data.start_datum || !data.end_datum) return true;
        
        try {
          const filters: any = {
            $or: [
              // New season starts during existing season
              {
                $and: [
                  { start_datum: { $lte: data.start_datum } },
                  { end_datum: { $gte: data.start_datum } }
                ]
              },
              // New season ends during existing season
              {
                $and: [
                  { start_datum: { $lte: data.end_datum } },
                  { end_datum: { $gte: data.end_datum } }
                ]
              },
              // New season completely contains existing season
              {
                $and: [
                  { start_datum: { $gte: data.start_datum } },
                  { end_datum: { $lte: data.end_datum } }
                ]
              }
            ]
          };

          // Exclude current season during updates
          if (context?.operation === 'update' && context.existingData?.id) {
            filters.id = { $ne: context.existingData.id };
          }

          const overlapping = await this.strapi.entityService.findMany('api::saison.saison', {
            filters,
            fields: ['id', 'name', 'start_datum', 'end_datum'],
            pagination: { limit: 5 }
          });
          
          return !overlapping || (Array.isArray(overlapping) ? overlapping.length === 0 : false);
        } catch (error) {
          this.strapi.log.warn('Season overlap validation failed:', error);
          return true; // Fail gracefully
        }
      },
      message: 'Der Zeitraum dieser Saison überschneidet sich mit bestehenden Saisons',
      enabled: true,
      priority: 5,
      async: true,
      dependencies: ['saison-date-validation']
    }));

    // Active season constraint
    this.registerRuleFactory('saison-active-constraint', (config = {}) => ({
      name: 'saison-active-constraint',
      type: 'warning',
      validator: async (data: any, context?: ValidationContext) => {
        if (!data.aktiv) return true;
        
        try {
          const filters: any = { aktiv: true };
          
          // Exclude current season during updates
          if (context?.operation === 'update' && context.existingData?.id) {
            filters.id = { $ne: context.existingData.id };
          }
          
          const activeSeasons = await this.strapi.entityService.findMany('api::saison.saison', {
            filters,
            pagination: { limit: 1 }
          });
          
          return !activeSeasons || (Array.isArray(activeSeasons) ? activeSeasons.length === 0 : false);
        } catch (error) {
          this.strapi.log.warn('Active season constraint validation failed:', error);
          return true; // Fail gracefully
        }
      },
      message: 'Es kann nur eine aktive Saison gleichzeitig geben',
      enabled: true,
      priority: 6,
      async: true
    }));

    // Register saison rules
    this.registerRuleConfiguration('api::saison.saison', {
      contentType: 'saison-date-validation',
      enabled: true,
      priority: 1
    });

    this.registerRuleConfiguration('api::saison.saison', {
      contentType: 'saison-overlap-validation',
      enabled: process.env.SAISON_OVERLAP_VALIDATION === 'true',
      priority: 5,
      dependencies: ['saison-date-validation'],
      config: { strict: process.env.SAISON_STRICT_VALIDATION === 'true' }
    });

    this.registerRuleConfiguration('api::saison.saison', {
      contentType: 'saison-active-constraint',
      enabled: true,
      priority: 6
    });

    this.registerRuleConfiguration('api::saison.saison', {
      contentType: 'required-field',
      enabled: true,
      priority: 1,
      config: { field: 'name', message: 'Der Saison-Name ist erforderlich' }
    });

    this.registerRuleConfiguration('api::saison.saison', {
      contentType: 'string-length',
      enabled: true,
      priority: 2,
      config: { 
        field: 'name', 
        minLength: 2, 
        maxLength: 100,
        message: 'Der Saison-Name muss zwischen 2 und 100 Zeichen lang sein'
      }
    });
  }

  /**
   * Register team-specific validation rules
   */
  private registerTeamRules(): void {
    // Team name uniqueness within league/season
    this.registerRuleFactory('team-name-unique-in-context', (config = {}) => ({
      name: 'team-name-unique-in-context',
      type: 'warning',
      validator: async (data: any, context?: ValidationContext) => {
        if (!data.name || !data.liga || !data.saison) return true;
        
        try {
          const filters: any = {
            name: data.name,
            liga: data.liga,
            saison: data.saison
          };
          
          // Exclude current team during updates
          if (context?.operation === 'update' && context.existingData?.id) {
            filters.id = { $ne: context.existingData.id };
          }
          
          const existing = await this.strapi.entityService.findMany('api::team.team', {
            filters,
            pagination: { limit: 1 }
          });
          
          return !existing || (Array.isArray(existing) ? existing.length === 0 : false);
        } catch (error) {
          this.strapi.log.warn('Team name uniqueness validation failed:', error);
          return true; // Fail gracefully
        }
      },
      message: 'Ein Team mit diesem Namen existiert bereits in dieser Liga und Saison',
      enabled: true,
      priority: 5,
      async: true
    }));

    // Register team rules
    this.registerRuleConfiguration('api::team.team', {
      contentType: 'required-field',
      enabled: true,
      priority: 1,
      config: { field: 'name', message: 'Der Team-Name ist erforderlich' }
    });

    this.registerRuleConfiguration('api::team.team', {
      contentType: 'string-length',
      enabled: true,
      priority: 2,
      config: { 
        field: 'name', 
        minLength: 2, 
        maxLength: 100,
        message: 'Der Team-Name muss zwischen 2 und 100 Zeichen lang sein'
      }
    });

    this.registerRuleConfiguration('api::team.team', {
      contentType: 'team-name-unique-in-context',
      enabled: true,
      priority: 5
    });
  }

  /**
   * Register tabellen-eintrag specific validation rules
   */
  private registerTabellenEintragRules(): void {
    // Table data consistency validation
    this.registerRuleFactory('table-data-consistency', (config = {}) => ({
      name: 'table-data-consistency',
      type: 'warning',
      validator: (data: any, context?: ValidationContext) => {
        const spiele = data.spiele || 0;
        const siege = data.siege || 0;
        const unentschieden = data.unentschieden || 0;
        const niederlagen = data.niederlagen || 0;
        
        // Games played should equal sum of wins, draws, and losses
        return spiele === (siege + unentschieden + niederlagen);
      },
      message: 'Die Anzahl der gespielten Spiele stimmt nicht mit der Summe aus Siegen, Unentschieden und Niederlagen überein',
      enabled: true,
      priority: 5
    }));

    // Goal statistics validation
    this.registerRuleFactory('goal-statistics-validation', (config = {}) => ({
      name: 'goal-statistics-validation',
      type: 'warning',
      validator: (data: any, context?: ValidationContext) => {
        const toreFuer = data.tore_fuer || 0;
        const toreGegen = data.tore_gegen || 0;
        
        // Goals should be non-negative
        return toreFuer >= 0 && toreGegen >= 0;
      },
      message: 'Tore für und gegen müssen nicht-negative Zahlen sein',
      enabled: true,
      priority: 3
    }));

    // Register tabellen-eintrag rules
    this.registerRuleConfiguration('api::tabellen-eintrag.tabellen-eintrag', {
      contentType: 'goal-statistics-validation',
      enabled: true,
      priority: 3
    });

    this.registerRuleConfiguration('api::tabellen-eintrag.tabellen-eintrag', {
      contentType: 'table-data-consistency',
      enabled: true,
      priority: 5
    });
  }

  /**
   * Register liga-specific validation rules
   */
  private registerLigaRules(): void {
    this.registerRuleConfiguration('api::liga.liga', {
      contentType: 'required-field',
      enabled: true,
      priority: 1,
      config: { field: 'name', message: 'Der Liga-Name ist erforderlich' }
    });

    this.registerRuleConfiguration('api::liga.liga', {
      contentType: 'string-length',
      enabled: true,
      priority: 2,
      config: { 
        field: 'name', 
        minLength: 2, 
        maxLength: 100,
        message: 'Der Liga-Name muss zwischen 2 und 100 Zeichen lang sein'
      }
    });

    this.registerRuleConfiguration('api::liga.liga', {
      contentType: 'unique-value',
      enabled: true,
      priority: 5,
      config: { 
        field: 'name', 
        contentType: 'api::liga.liga',
        message: 'Eine Liga mit diesem Namen existiert bereits'
      }
    });
  }

  /**
   * Register spieler-specific validation rules
   */
  private registerSpielerRules(): void {
    this.registerRuleConfiguration('api::spieler.spieler', {
      contentType: 'required-field',
      enabled: true,
      priority: 1,
      config: { field: 'name', message: 'Der Spieler-Name ist erforderlich' }
    });

    this.registerRuleConfiguration('api::spieler.spieler', {
      contentType: 'string-length',
      enabled: true,
      priority: 2,
      config: { 
        field: 'name', 
        minLength: 2, 
        maxLength: 100,
        message: 'Der Spieler-Name muss zwischen 2 und 100 Zeichen lang sein'
      }
    });
  }

  /**
   * Utility method to get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

export default ValidationRuleRegistry;