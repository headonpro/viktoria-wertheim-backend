/**
 * Saison Hook Service
 * 
 * Specialized hook service for saison content type providing season-specific
 * validations, constraint handling, and lifecycle management.
 * 
 * This service implements season lifecycle operations with proper error handling,
 * performance monitoring, and graceful degradation.
 */

import { BaseHookService, HookConfiguration } from './BaseHookService';
import { HookEvent, HookResult } from './hook-error-handler';
import { ValidationService, ValidationContext } from './ValidationService';
import { SaisonValidationRules } from './validation-rules/SaisonValidationRules';

/**
 * Saison-specific configuration
 */
interface SaisonHookConfiguration extends HookConfiguration {
  // Season overlap validation
  enableOverlapValidation: boolean;
  enableStrictOverlapValidation: boolean;
  
  // Active season constraint
  enableActiveSeasonConstraint: boolean;
  autoDeactivateOtherSeasons: boolean;
  
  // Date validation
  enableDateValidation: boolean;
  enableDateRangeValidation: boolean;
  
  // Deletion validation
  enableDeletionValidation: boolean;
  checkDependentTeams: boolean;
  checkDependentLeagues: boolean;
  
  // Season activation management
  enableSeasonActivation: boolean;
  enableSeasonTransition: boolean;
  logSeasonChanges: boolean;
}

/**
 * Season data interface
 */
interface SaisonData {
  id?: number;
  name?: string;
  start_datum?: string;
  end_datum?: string;
  aktiv?: boolean;
  teams?: any[];
  ligen?: any[];
  [key: string]: any;
}

/**
 * Season validation result
 */
interface SaisonValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
  overlappingSeasons?: any[];
  activeSeasons?: any[];
  dependentTeams?: any[];
  dependentLeagues?: any[];
}

/**
 * Season activation result
 */
interface SeasonActivationResult {
  success: boolean;
  deactivatedSeasons: any[];
  errors: string[];
  activatedSeason?: any;
  previouslyActive?: any[];
}

/**
 * Default saison hook configuration
 */
const DEFAULT_SAISON_CONFIG: SaisonHookConfiguration = {
  enableStrictValidation: false,
  enableAsyncCalculations: false, // Seasons don't need async calculations
  maxHookExecutionTime: 200, // Increased for database queries
  retryAttempts: 2,
  enableGracefulDegradation: true,
  logLevel: 'warn',
  
  // Season-specific config
  enableOverlapValidation: process.env.SAISON_OVERLAP_VALIDATION === 'true',
  enableStrictOverlapValidation: process.env.SAISON_STRICT_VALIDATION === 'true',
  enableActiveSeasonConstraint: true,
  autoDeactivateOtherSeasons: true,
  enableDateValidation: true,
  enableDateRangeValidation: true,
  enableDeletionValidation: true,
  checkDependentTeams: true,
  checkDependentLeagues: true,
  enableSeasonActivation: true,
  enableSeasonTransition: true,
  logSeasonChanges: true
};

/**
 * Saison Hook Service Implementation
 */
export class SaisonHookService extends BaseHookService {
  private saisonConfig: SaisonHookConfiguration;
  private validationService: ValidationService;
  private saisonValidationRules: SaisonValidationRules;

  constructor(strapi: any, contentType: string, config: Partial<SaisonHookConfiguration> = {}) {
    const mergedConfig = { ...DEFAULT_SAISON_CONFIG, ...config };
    super(strapi, contentType, mergedConfig);
    
    this.saisonConfig = mergedConfig;
    this.validationService = new ValidationService(strapi);
    this.saisonValidationRules = new SaisonValidationRules(strapi);

    this.logInfo('SaisonHookService initialized', {
      config: this.saisonConfig,
      overlapValidation: this.saisonConfig.enableOverlapValidation,
      activeSeasonConstraint: this.saisonConfig.enableActiveSeasonConstraint,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Before create hook implementation
   */
  async beforeCreate(event: HookEvent): Promise<HookResult> {
    return await this.executeHook('beforeCreate', event, async () => {
      const { data } = event.params;
      
      this.logInfo(`Creating season: ${data.name || 'Unknown'}`, {
        seasonData: {
          name: data.name,
          startDate: data.start_datum,
          endDate: data.end_datum,
          active: data.aktiv
        }
      });

      // Validate season data
      const validationResult = await this.validateSaisonData(data);
      if (!validationResult.canProceed) {
        throw new Error(validationResult.errors.join(', '));
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        this.logWarn('Season validation warnings', validationResult.warnings);
      }

      // Handle active season constraint
      if (data.aktiv && this.saisonConfig.enableActiveSeasonConstraint) {
        await this.handleActiveSeasonConstraint(data);
      }

      return data;
    });
  }

  /**
   * Before update hook implementation
   */
  async beforeUpdate(event: HookEvent): Promise<HookResult> {
    return await this.executeHook('beforeUpdate', event, async () => {
      const { data, where } = event.params;
      
      this.logInfo(`Updating season ${where.id}`, { 
        updatedFields: Object.keys(data),
        seasonId: where.id
      });

      // Get current season data for validation context
      let currentSeason = null;
      if (data.start_datum || data.end_datum || data.aktiv !== undefined) {
        try {
          currentSeason = await this.strapi.entityService.findOne('api::saison.saison', where.id);
        } catch (error) {
          this.logWarn('Could not fetch current season data for validation', { error: error.message });
        }
      }

      // Merge current data with updates for validation
      const mergedData = currentSeason ? { ...currentSeason, ...data } : data;

      // Validate season data
      const validationResult = await this.validateSaisonData(mergedData, where.id);
      if (!validationResult.canProceed) {
        throw new Error(validationResult.errors.join(', '));
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        this.logWarn('Season validation warnings', validationResult.warnings);
      }

      // Handle active season constraint if being activated
      if (data.aktiv && this.saisonConfig.enableActiveSeasonConstraint) {
        await this.handleActiveSeasonConstraint(data, where.id);
      }

      return data;
    });
  }

  /**
   * Before delete hook implementation
   */
  async beforeDelete(event: HookEvent): Promise<HookResult> {
    return await this.executeHook('beforeDelete', event, async () => {
      const { where } = event.params;
      
      this.logInfo(`Deleting season ${where.id}`);

      if (this.saisonConfig.enableDeletionValidation) {
        const validationResult = await this.validateSaisonDeletion(where.id);
        if (!validationResult.canProceed) {
          throw new Error(validationResult.errors.join(', '));
        }

        // Log warnings if any
        if (validationResult.warnings.length > 0) {
          this.logWarn('Season deletion warnings', validationResult.warnings);
        }
      }

      return {};
    });
  }

  /**
   * After create hook implementation
   */
  async afterCreate(event: HookEvent): Promise<void> {
    await this.executeHook('afterCreate', event, async () => {
      const { result } = event;
      
      if (this.saisonConfig.logSeasonChanges) {
        this.logInfo(`Season created successfully`, {
          seasonId: result.id,
          seasonName: result.name,
          startDate: result.start_datum,
          endDate: result.end_datum,
          active: result.aktiv
        });
      }
    });
  }

  /**
   * After update hook implementation
   */
  async afterUpdate(event: HookEvent): Promise<void> {
    await this.executeHook('afterUpdate', event, async () => {
      const { result } = event;
      
      if (this.saisonConfig.logSeasonChanges) {
        this.logInfo(`Season updated successfully`, {
          seasonId: result.id,
          seasonName: result.name,
          startDate: result.start_datum,
          endDate: result.end_datum,
          active: result.aktiv
        });
      }
    });
  }

  /**
   * After delete hook implementation
   */
  async afterDelete(event: HookEvent): Promise<void> {
    await this.executeHook('afterDelete', event, async () => {
      const { result } = event;
      
      if (this.saisonConfig.logSeasonChanges) {
        this.logInfo(`Season deleted successfully`, {
          seasonId: result.id,
          seasonName: result.name
        });
      }
    });
  }

  /**
   * Validate season data using validation service and season-specific rules
   */
  private async validateSaisonData(data: SaisonData, seasonId?: number): Promise<SaisonValidationResult> {
    const result: SaisonValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      canProceed: true
    };

    try {
      // Get all saison validation rules
      const validationRules = this.saisonValidationRules.getAllRules();

      // Create validation context
      const validationContext: ValidationContext = {
        contentType: 'api::saison.saison',
        operation: (seasonId ? 'update' : 'create') as 'create' | 'update' | 'delete',
        existingData: seasonId ? { id: seasonId } : undefined,
        operationId: `validate-season-${seasonId || 'new'}-${Date.now()}`
      };

      // Validate each rule
      for (const rule of validationRules) {
        if (!rule.enabled) continue;

        try {
          let isValid = false;
          
          if (rule.async) {
            isValid = await rule.validator(data, validationContext);
          } else {
            isValid = await rule.validator(data, validationContext);
          }

          if (!isValid) {
            const errorMessage = this.formatValidationMessage(rule, data, validationContext);
            
            if (rule.type === 'critical') {
              result.errors.push(errorMessage);
              result.isValid = false;
            } else {
              result.warnings.push(errorMessage);
            }

            // Store additional context data
            if (validationContext.overlappingSeasons) {
              result.overlappingSeasons = validationContext.overlappingSeasons;
            }
            if (validationContext.activeSeasons) {
              result.activeSeasons = validationContext.activeSeasons;
            }
            if (validationContext.dependentTeams) {
              result.dependentTeams = validationContext.dependentTeams;
            }
            if (validationContext.dependentLeagues) {
              result.dependentLeagues = validationContext.dependentLeagues;
            }
          }
        } catch (error) {
          this.logError(error as Error, {
            contentType: 'api::saison.saison',
            hookType: 'beforeUpdate',
            event: { params: {} },
            operationId: `validate-rule-${rule.name}`
          });
          
          if (this.saisonConfig.enableGracefulDegradation) {
            result.warnings.push(`Validation rule ${rule.name} failed: ${error.message}`);
          } else {
            result.errors.push(`Validation rule ${rule.name} failed: ${error.message}`);
            result.isValid = false;
          }
        }
      }

      // Determine if operation can proceed
      result.canProceed = result.errors.length === 0 || this.saisonConfig.enableGracefulDegradation;

      this.logDebug('Season validation completed', {
        isValid: result.isValid,
        canProceed: result.canProceed,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'validateSaisonData'
      });
      
      if (this.saisonConfig.enableGracefulDegradation) {
        result.warnings.push(`Season validation error: ${error.message}`);
        result.canProceed = true;
      } else {
        result.errors.push(`Season validation failed: ${error.message}`);
        result.canProceed = false;
      }
    }

    return result;
  }

  /**
   * Validate season deletion
   */
  private async validateSaisonDeletion(seasonId: number): Promise<SaisonValidationResult> {
    const result: SaisonValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      canProceed: true
    };

    try {
      // Get season data
      const season = await this.strapi.entityService.findOne('api::saison.saison', seasonId);
      if (!season) {
        result.errors.push('Season not found');
        result.canProceed = false;
        return result;
      }

      // Check if season is active
      if (season.aktiv) {
        result.errors.push('Die aktive Saison kann nicht gelöscht werden. Bitte aktivieren Sie zuerst eine andere Saison.');
        result.canProceed = false;
      }

      // Check for dependent teams if enabled
      if (this.saisonConfig.checkDependentTeams) {
        const teams = await this.strapi.entityService.findMany('api::team.team', {
          filters: { saison: seasonId },
          fields: ['id', 'name'],
          pagination: { limit: 5 }
        });

        if (teams && teams.length > 0) {
          const teamsArray = Array.isArray(teams) ? teams : [teams];
          result.dependentTeams = teamsArray;
          
          const teamNames = teamsArray.map((team: any) => team.name).join(', ');
          const moreTeamsText = teamsArray.length === 5 ? ' und möglicherweise weitere' : '';
          result.errors.push(`Diese Saison kann nicht gelöscht werden, da noch Teams zugeordnet sind: ${teamNames}${moreTeamsText}. Bitte entfernen Sie zuerst alle Teams aus dieser Saison.`);
          result.canProceed = false;
        }
      }

      // Check for dependent leagues if enabled
      if (this.saisonConfig.checkDependentLeagues) {
        const leagues = await this.strapi.entityService.findMany('api::liga.liga', {
          filters: { saison: seasonId },
          fields: ['id', 'name'],
          pagination: { limit: 5 }
        });

        if (leagues && leagues.length > 0) {
          const leaguesArray = Array.isArray(leagues) ? leagues : [leagues];
          result.dependentLeagues = leaguesArray;
          
          const leagueNames = leaguesArray.map((league: any) => league.name).join(', ');
          const moreLeaguesText = leaguesArray.length === 5 ? ' und möglicherweise weitere' : '';
          result.errors.push(`Diese Saison kann nicht gelöscht werden, da noch Ligen zugeordnet sind: ${leagueNames}${moreLeaguesText}. Bitte entfernen Sie zuerst alle Ligen aus dieser Saison.`);
          result.canProceed = false;
        }
      }

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'beforeDelete',
        event: { params: {} },
        operationId: 'validateSaisonDeletion'
      });
      
      if (this.saisonConfig.enableGracefulDegradation) {
        result.warnings.push(`Deletion validation error: ${error.message}`);
        result.canProceed = true;
      } else {
        result.errors.push(`Deletion validation failed: ${error.message}`);
        result.canProceed = false;
      }
    }

    return result;
  }

  /**
   * Handle active season constraint by deactivating other seasons
   */
  private async handleActiveSeasonConstraint(data: SaisonData, excludeId?: number): Promise<SeasonActivationResult> {
    const result: SeasonActivationResult = {
      success: true,
      deactivatedSeasons: [],
      errors: []
    };

    if (!this.saisonConfig.autoDeactivateOtherSeasons) {
      return result;
    }

    try {
      const filters: any = { aktiv: true };
      if (excludeId) {
        filters.id = { $ne: excludeId };
      }

      const activeSeasons = await this.strapi.entityService.findMany('api::saison.saison', {
        filters,
        fields: ['id', 'name']
      });

      if (activeSeasons && activeSeasons.length > 0) {
        const seasonsArray = Array.isArray(activeSeasons) ? activeSeasons : [activeSeasons];
        
        for (const season of seasonsArray) {
          if (season && season.id) {
            try {
              await this.strapi.entityService.update('api::saison.saison', season.id, {
                data: { aktiv: false }
              });
              
              result.deactivatedSeasons.push(season);
              
              if (this.saisonConfig.logSeasonChanges) {
                this.logInfo(`Deactivated season: ${season.name}`, {
                  seasonId: season.id,
                  reason: 'active_season_constraint'
                });
              }
            } catch (error) {
              this.logError(error as Error, {
                contentType: 'api::saison.saison',
                hookType: 'beforeUpdate',
                event: { params: {} },
                operationId: 'deactivateSeason'
              });
              result.errors.push(`Failed to deactivate season ${season.name}: ${error.message}`);
            }
          }
        }
      }

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'handleActiveSeasonConstraint'
      });
      result.success = false;
      result.errors.push(`Active season constraint handling failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Format validation message with context
   */
  private formatValidationMessage(rule: any, data: SaisonData, context: any): string {
    let message = rule.message;

    // Add specific context for overlap validation
    if (rule.name === 'saison-overlap-validation' && context.overlappingSeasons) {
      const overlappingDetails = context.overlappingSeasons.map((s: any) => 
        `"${s.name}" (${this.formatDate(s.start_datum)} - ${this.formatDate(s.end_datum)})`
      ).join(', ');
      
      message = `Der Zeitraum dieser Saison überschneidet sich mit folgenden bestehenden Saisons: ${overlappingDetails}. Bitte wählen Sie einen anderen Zeitraum oder passen Sie die bestehenden Saisons an.`;
    }

    // Add specific context for active season constraint
    if (rule.name === 'saison-active-constraint' && context.activeSeasons) {
      const activeSeasonNames = context.activeSeasons.map((s: any) => s.name).join(', ');
      message = `Es kann nur eine aktive Saison gleichzeitig geben. Folgende Saisons sind bereits aktiv: ${activeSeasonNames}. Diese werden automatisch deaktiviert.`;
    }

    return message;
  }

  /**
   * Format date for user-friendly display
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Get season validation rules
   */
  public getSaisonValidationRules(): any[] {
    return this.saisonValidationRules.getAllRules();
  }

  /**
   * Enable or disable specific validation rule
   */
  public setValidationRuleEnabled(ruleName: string, enabled: boolean): void {
    const rules = this.saisonValidationRules.getAllRules();
    const rule = rules.find(r => r.name === ruleName);
    if (rule) {
      rule.enabled = enabled;
      this.logInfo(`Season validation rule ${ruleName} ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      this.logWarn(`Season validation rule ${ruleName} not found`);
    }
  }

  /**
   * Get validation rule status
   */
  public getValidationRuleStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    const rules = this.saisonValidationRules.getAllRules();
    for (const rule of rules) {
      status[rule.name] = rule.enabled;
    }
    return status;
  }

  /**
   * Update saison configuration
   */
  public updateSaisonConfig(newConfig: Partial<SaisonHookConfiguration>): void {
    this.saisonConfig = { ...this.saisonConfig, ...newConfig };
    this.updateConfig(newConfig);

    this.logInfo('Saison hook configuration updated', this.saisonConfig);
  }

  /**
   * Get saison-specific configuration
   */
  public getSaisonConfig(): SaisonHookConfiguration {
    return { ...this.saisonConfig };
  }

  /**
   * Get season statistics
   */
  public getSaisonStats(): any {
    return {
      contentType: this.contentType,
      config: this.saisonConfig,
      metrics: this.getMetrics(),
      validationRules: this.getValidationRuleStatus(),
      overlapValidationEnabled: this.saisonConfig.enableOverlapValidation,
      activeSeasonConstraintEnabled: this.saisonConfig.enableActiveSeasonConstraint,
      deletionValidationEnabled: this.saisonConfig.enableDeletionValidation
    };
  }

  /**
   * Check if season overlaps with existing seasons (enhanced version)
   */
  public async checkSeasonOverlap(startDate: string, endDate: string, excludeId?: number): Promise<{
    hasOverlap: boolean;
    overlappingSeasons: any[];
    conflictAnalysis?: any;
  }> {
    try {
      return await this.saisonValidationRules.checkSeasonOverlap(startDate, endDate, excludeId);
    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'checkSeasonOverlap',
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
      return {
        hasOverlap: false,
        overlappingSeasons: [],
        conflictAnalysis: { error: error.message }
      };
    }
  }

  /**
   * Get conflict resolution suggestions for overlapping seasons
   */
  public getConflictResolutionSuggestions(newSeasonData: any, overlappingSeasons: any[]): any[] {
    try {
      return this.saisonValidationRules.getConflictResolutionSuggestions(newSeasonData, overlappingSeasons);
    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'getConflictResolutionSuggestions'
      });
      return [];
    }
  }

  /**
   * Validate date range with detailed feedback
   */
  public validateDateRange(startDate: string, endDate: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    try {
      return this.saisonValidationRules.validateDateRange(startDate, endDate);
    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'validateDateRange',
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
      return {
        isValid: false,
        errors: [`Date validation failed: ${error.message}`],
        warnings: []
      };
    }
  }

  /**
   * Get validation configuration status
   */
  public getValidationConfig(): any {
    try {
      return this.saisonValidationRules.getValidationConfig();
    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'getValidationConfig'
      });
      return {
        overlapValidationEnabled: false,
        strictValidationEnabled: false,
        enabledRules: [],
        disabledRules: [],
        error: error.message
      };
    }
  }

  /**
   * Get active seasons
   */
  public async getActiveSeasons(excludeId?: number): Promise<any[]> {
    try {
      const filters: any = { aktiv: true };
      if (excludeId) {
        filters.id = { $ne: excludeId };
      }

      const activeSeasons = await this.strapi.entityService.findMany('api::saison.saison', {
        filters,
        fields: ['id', 'name', 'start_datum', 'end_datum']
      });

      return activeSeasons ? (Array.isArray(activeSeasons) ? activeSeasons : [activeSeasons]) : [];

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'afterUpdate',
        event: { params: {} },
        operationId: 'getActiveSeasons'
      });
      return [];
    }
  }

  /**
   * Activate season and deactivate others with enhanced management
   */
  public async activateSeason(seasonId: number): Promise<SeasonActivationResult> {
    try {
      // Get season data first
      const season = await this.strapi.entityService.findOne('api::saison.saison', seasonId);
      if (!season) {
        return {
          success: false,
          deactivatedSeasons: [],
          errors: ['Season not found']
        };
      }

      // Check if season is already active
      if (season.aktiv) {
        this.logInfo(`Season ${seasonId} is already active`, { seasonName: season.name });
        return {
          success: true,
          deactivatedSeasons: [],
          errors: []
        };
      }

      // Validate season can be activated
      const validationResult = await this.validateSeasonActivation(season);
      if (!validationResult.canActivate) {
        return {
          success: false,
          deactivatedSeasons: [],
          errors: validationResult.errors
        };
      }

      // Get currently active seasons before activation
      const currentlyActive = await this.getActiveSeasons(seasonId);

      // Activate the target season
      await this.strapi.entityService.update('api::saison.saison', seasonId, {
        data: { aktiv: true }
      });

      // Handle constraint by deactivating others
      const constraintResult = await this.handleActiveSeasonConstraint({ aktiv: true }, seasonId);

      // Create comprehensive result
      const result: SeasonActivationResult = {
        success: true,
        deactivatedSeasons: constraintResult.deactivatedSeasons,
        errors: constraintResult.errors,
        activatedSeason: {
          id: season.id,
          name: season.name,
          start_datum: season.start_datum,
          end_datum: season.end_datum
        },
        previouslyActive: currentlyActive
      };

      if (this.saisonConfig.logSeasonChanges) {
        this.logInfo(`Season activation completed`, {
          activatedSeason: season.name,
          deactivatedSeasons: result.deactivatedSeasons.map(s => s.name),
          previouslyActiveCount: currentlyActive.length
        });
      }

      // Trigger season transition if enabled
      if (this.saisonConfig.enableSeasonTransition) {
        await this.handleSeasonTransition(season, currentlyActive);
      }

      return result;

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'activateSeason'
      });
      return {
        success: false,
        deactivatedSeasons: [],
        errors: [`Failed to activate season: ${error.message}`]
      };
    }
  }

  /**
   * Deactivate season with validation
   */
  public async deactivateSeason(seasonId: number): Promise<{
    success: boolean;
    errors: string[];
    deactivatedSeason?: any;
  }> {
    try {
      // Get season data first
      const season = await this.strapi.entityService.findOne('api::saison.saison', seasonId);
      if (!season) {
        return {
          success: false,
          errors: ['Season not found']
        };
      }

      // Check if season is already inactive
      if (!season.aktiv) {
        this.logInfo(`Season ${seasonId} is already inactive`, { seasonName: season.name });
        return {
          success: true,
          errors: [],
          deactivatedSeason: season
        };
      }

      // Validate season can be deactivated
      const validationResult = await this.validateSeasonDeactivation(season);
      if (!validationResult.canDeactivate) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }

      // Deactivate the season
      await this.strapi.entityService.update('api::saison.saison', seasonId, {
        data: { aktiv: false }
      });

      if (this.saisonConfig.logSeasonChanges) {
        this.logInfo(`Season deactivated`, {
          seasonId: season.id,
          seasonName: season.name
        });
      }

      return {
        success: true,
        errors: [],
        deactivatedSeason: season
      };

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'deactivateSeason'
      });
      return {
        success: false,
        errors: [`Failed to deactivate season: ${error.message}`]
      };
    }
  }

  /**
   * Validate if season can be activated
   */
  private async validateSeasonActivation(season: any): Promise<{
    canActivate: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      canActivate: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    try {
      // Check if season has valid dates
      if (!season.start_datum || !season.end_datum) {
        result.canActivate = false;
        result.errors.push('Season must have valid start and end dates to be activated');
      } else {
        // Validate date range
        const dateValidation = this.validateDateRange(season.start_datum, season.end_datum);
        if (!dateValidation.isValid) {
          result.canActivate = false;
          result.errors.push(...dateValidation.errors);
        }
        result.warnings.push(...dateValidation.warnings);
      }

      // Check for overlaps if validation is enabled
      if (this.saisonConfig.enableOverlapValidation && season.start_datum && season.end_datum) {
        const overlapCheck = await this.checkSeasonOverlap(
          season.start_datum, 
          season.end_datum, 
          season.id
        );
        
        if (overlapCheck.hasOverlap) {
          if (this.saisonConfig.enableStrictOverlapValidation) {
            result.canActivate = false;
            result.errors.push(`Season overlaps with existing seasons: ${overlapCheck.overlappingSeasons.map(s => s.name).join(', ')}`);
          } else {
            result.warnings.push(`Season overlaps with existing seasons: ${overlapCheck.overlappingSeasons.map(s => s.name).join(', ')}`);
          }
        }
      }

      // Check if there are dependent entities that might be affected
      const dependencyCheck = await this.checkSeasonDependencies(season.id);
      if (dependencyCheck.hasTeams || dependencyCheck.hasLeagues) {
        result.warnings.push(`Activating this season will affect ${dependencyCheck.teamCount} teams and ${dependencyCheck.leagueCount} leagues`);
      }

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'validateSeasonActivation'
      });
      result.canActivate = false;
      result.errors.push(`Validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate if season can be deactivated
   */
  private async validateSeasonDeactivation(season: any): Promise<{
    canDeactivate: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      canDeactivate: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    try {
      // Check if there are other active seasons
      const otherActiveSeasons = await this.getActiveSeasons(season.id);
      if (otherActiveSeasons.length === 0) {
        result.warnings.push('Deactivating this season will leave no active seasons');
      }

      // Check for ongoing activities in this season
      const dependencyCheck = await this.checkSeasonDependencies(season.id);
      if (dependencyCheck.hasTeams) {
        result.warnings.push(`This season has ${dependencyCheck.teamCount} active teams`);
      }
      if (dependencyCheck.hasLeagues) {
        result.warnings.push(`This season has ${dependencyCheck.leagueCount} active leagues`);
      }

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'validateSeasonDeactivation'
      });
      result.warnings.push(`Validation warning: ${error.message}`);
    }

    return result;
  }

  /**
   * Check season dependencies (teams, leagues, etc.)
   */
  private async checkSeasonDependencies(seasonId: number): Promise<{
    hasTeams: boolean;
    hasLeagues: boolean;
    teamCount: number;
    leagueCount: number;
    teams: any[];
    leagues: any[];
  }> {
    const result = {
      hasTeams: false,
      hasLeagues: false,
      teamCount: 0,
      leagueCount: 0,
      teams: [] as any[],
      leagues: [] as any[]
    };

    try {
      // Check for teams
      const teams = await this.strapi.entityService.findMany('api::team.team', {
        filters: { saison: seasonId },
        fields: ['id', 'name'],
        pagination: { limit: 100 }
      });

      if (teams) {
        result.teams = Array.isArray(teams) ? teams : [teams];
        result.teamCount = result.teams.length;
        result.hasTeams = result.teamCount > 0;
      }

      // Check for leagues
      const leagues = await this.strapi.entityService.findMany('api::liga.liga', {
        filters: { saison: seasonId },
        fields: ['id', 'name'],
        pagination: { limit: 100 }
      });

      if (leagues) {
        result.leagues = Array.isArray(leagues) ? leagues : [leagues];
        result.leagueCount = result.leagues.length;
        result.hasLeagues = result.leagueCount > 0;
      }

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'beforeDelete',
        event: { params: {} },
        operationId: 'checkSeasonDependencies'
      });
    }

    return result;
  }

  /**
   * Handle season transition logic
   */
  private async handleSeasonTransition(newActiveSeason: any, previouslyActive: any[]): Promise<void> {
    if (!this.saisonConfig.enableSeasonTransition) {
      return;
    }

    try {
      this.logInfo('Handling season transition', {
        newActiveSeason: newActiveSeason.name,
        previouslyActive: previouslyActive.map(s => s.name)
      });

      // Log transition event
      if (this.saisonConfig.logSeasonChanges) {
        this.logInfo('Season transition completed', {
          from: previouslyActive.length > 0 ? previouslyActive[0].name : 'None',
          to: newActiveSeason.name,
          transitionDate: new Date().toISOString()
        });
      }

      // Here you could add additional transition logic such as:
      // - Updating related entities
      // - Sending notifications
      // - Creating audit logs
      // - Triggering background jobs

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'afterUpdate',
        event: { params: {} },
        operationId: 'handleSeasonTransition'
      });
      // Don't throw error - transition failures shouldn't block activation
    }
  }

  /**
   * Get season activation history
   */
  public async getSeasonActivationHistory(limit: number = 10): Promise<any[]> {
    try {
      // This would typically query an audit log table
      // For now, we'll return the most recently updated seasons
      const seasons = await this.strapi.entityService.findMany('api::saison.saison', {
        fields: ['id', 'name', 'aktiv', 'updatedAt', 'start_datum', 'end_datum'],
        sort: { updatedAt: 'desc' },
        pagination: { limit }
      });

      return seasons ? (Array.isArray(seasons) ? seasons : [seasons]) : [];

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'afterUpdate',
        event: { params: {} },
        operationId: 'getSeasonActivationHistory'
      });
      return [];
    }
  }

  /**
   * Get current active season
   */
  public async getCurrentActiveSeason(): Promise<any | null> {
    try {
      const activeSeasons = await this.getActiveSeasons();
      return activeSeasons.length > 0 ? activeSeasons[0] : null;
    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::saison.saison',
        hookType: 'afterUpdate',
        event: { params: {} },
        operationId: 'getCurrentActiveSeason'
      });
      return null;
    }
  }
}

export default SaisonHookService;
export type { 
  SaisonHookConfiguration, 
  SaisonData, 
  SaisonValidationResult, 
  SeasonActivationResult 
};