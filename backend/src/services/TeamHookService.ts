/**
 * Team Hook Service
 * 
 * Specialized hook service for team content type providing team-specific
 * validations, calculations, and relationship management.
 * 
 * This service implements team lifecycle operations with proper error handling,
 * performance monitoring, and graceful degradation.
 */

import { BaseHookService, HookConfiguration } from './BaseHookService';
import { HookEvent, HookResult } from './hook-error-handler';
import { ValidationService } from './ValidationService';
import { CalculationService } from './CalculationService';
import { HookConfigurationManager } from './HookConfigurationManager';
import { 
  createTeamValidationRules, 
  updateTeamValidationConfig,
  TeamValidationConfig 
} from './validation-rules/TeamValidationRules';
import {
  createTeamSyncCalculations,
  createTeamAsyncCalculations,
  updateTeamCalculationConfig,
  TeamCalculationConfig,
  TeamStatistics,
  TeamRanking,
  TeamForm
} from './calculations/TeamCalculations';

/**
 * Team-specific configuration
 */
interface TeamHookConfiguration extends HookConfiguration, TeamValidationConfig, TeamCalculationConfig {}

/**
 * Team data interface
 */
interface TeamData {
  id?: number;
  name?: string;
  gruendungsjahr?: number;
  liga?: any;
  saison?: any;
  spieler?: any[];
  tabellen_eintraege?: any[];
  [key: string]: any;
}

/**
 * Team validation result
 */
interface TeamValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canProceed: boolean;
}

/**
 * Team calculation result
 */
interface TeamCalculationResult {
  success: boolean;
  calculatedFields: Record<string, any>;
  errors: string[];
}

/**
 * Default team hook configuration
 */
const DEFAULT_TEAM_CONFIG: TeamHookConfiguration = {
  enableStrictValidation: false,
  enableAsyncCalculations: true,
  maxHookExecutionTime: 100,
  retryAttempts: 2,
  enableGracefulDegradation: true,
  logLevel: 'warn',
  // Team validation config
  enableNameUniqueness: true,
  enableLigaSaisonConsistency: false, // Disabled for stability
  enableStatisticsValidation: true,
  maxTeamNameLength: 100,
  minFoundingYear: 1800,
  maxFoundingYear: new Date().getFullYear(),
  allowDuplicateNamesInDifferentSeasons: true,
  // Team calculation config
  enableStatisticsCalculation: true,
  enableRankingCalculation: true,
  enableFormCalculation: true,
  formCalculationGames: 5,
  enableGoalDifferenceCalculation: true,
  enablePointsCalculation: true,
  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0
};

/**
 * Team Hook Service Implementation
 */
export class TeamHookService extends BaseHookService {
  private teamConfig: TeamHookConfiguration;
  private validationService: ValidationService;
  private calculationService: CalculationService;
  private teamValidationRules: any[];
  private teamSyncCalculations: any[];
  private teamAsyncCalculations: any[];

  constructor(strapi: any, contentType: string, config: Partial<TeamHookConfiguration> = {}) {
    const mergedConfig = { ...DEFAULT_TEAM_CONFIG, ...config };
    super(strapi, contentType, mergedConfig);
    
    this.teamConfig = mergedConfig;
    this.validationService = new ValidationService(strapi, new HookConfigurationManager(strapi));
    this.calculationService = new CalculationService(strapi, new HookConfigurationManager(strapi));

    // Initialize team-specific validation rules
    this.teamValidationRules = createTeamValidationRules(strapi, mergedConfig);
    
    // Register validation rules with validation service
    for (const rule of this.teamValidationRules) {
      // this.validationService.addValidationRule(rule);
    }

    // Initialize team-specific calculations
    this.teamSyncCalculations = createTeamSyncCalculations(strapi, mergedConfig);
    this.teamAsyncCalculations = createTeamAsyncCalculations(strapi, mergedConfig);

    this.logInfo('TeamHookService initialized', {
      config: this.teamConfig,
      validationRules: this.teamValidationRules.map(r => r.name),
      syncCalculations: this.teamSyncCalculations.map(c => c.field),
      asyncCalculations: this.teamAsyncCalculations.map(c => c.name),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Before create hook implementation
   */
  async beforeCreate(event: HookEvent): Promise<HookResult> {
    return await this.executeHook('beforeCreate', event, async () => {
      const { data } = event.params;
      
      this.logInfo(`Creating team: ${data.name || 'Unknown'}`, {
        teamData: {
          name: data.name,
          hasLiga: !!data.liga,
          hasSaison: !!data.saison,
          gruendungsjahr: data.gruendungsjahr
        }
      });

      // Validate team data
      const validationResult = await this.validateTeamData(data);
      if (!validationResult.canProceed) {
        throw new Error(validationResult.errors.join(', '));
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        this.logWarn('Team validation warnings', validationResult.warnings);
      }

      // Calculate team fields
      const calculationResult = await this.calculateTeamFields(data, 'create');
      if (calculationResult.success) {
        Object.assign(data, calculationResult.calculatedFields);
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
      
      this.logInfo(`Updating team ${where.id}`, { 
        updatedFields: Object.keys(data),
        teamId: where.id
      });

      // Validate team data
      const validationResult = await this.validateTeamData(data, where.id);
      if (!validationResult.canProceed) {
        throw new Error(validationResult.errors.join(', '));
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        this.logWarn('Team validation warnings', validationResult.warnings);
      }

      // Calculate team fields
      const calculationResult = await this.calculateTeamFields(data, 'update', where.id);
      if (calculationResult.success) {
        Object.assign(data, calculationResult.calculatedFields);
      }

      return data;
    });
  }

  /**
   * After create hook implementation
   */
  async afterCreate(event: HookEvent): Promise<void> {
    await this.executeHook('afterCreate', event, async () => {
      const { result } = event;
      
      this.logInfo(`Team created successfully`, {
        teamId: result.id,
        teamName: result.name,
        liga: result.liga?.id || null,
        saison: result.saison?.id || null,
        gruendungsjahr: result.gruendungsjahr
      });

      // Schedule async calculations if enabled
      if (this.teamConfig.enableAsyncCalculations) {
        await this.scheduleAsyncCalculations(result, 'create');
      }
    });
  }

  /**
   * After update hook implementation
   */
  async afterUpdate(event: HookEvent): Promise<void> {
    await this.executeHook('afterUpdate', event, async () => {
      const { result } = event;
      
      this.logInfo(`Team updated successfully`, {
        teamId: result.id,
        teamName: result.name,
        liga: result.liga?.id || null,
        saison: result.saison?.id || null,
        gruendungsjahr: result.gruendungsjahr
      });

      // Schedule async calculations if enabled
      if (this.teamConfig.enableAsyncCalculations) {
        await this.scheduleAsyncCalculations(result, 'update');
      }
    });
  }

  /**
   * Validate team data using validation service and team-specific rules
   */
  private async validateTeamData(data: TeamData, teamId?: number): Promise<TeamValidationResult> {
    const result: TeamValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      canProceed: true
    };

    try {
      // Use validation service with team-specific rules
      const validationContext = {
        contentType: 'api::team.team',
        operation: (teamId ? 'update' : 'create') as 'create' | 'update' | 'delete',
        operationId: `team-validation-${teamId || 'new'}-${Date.now()}`,
        entityId: teamId,
        timestamp: new Date()
      };

      // Validate critical rules
      const criticalRules = this.teamValidationRules.filter(rule => rule.type === 'critical');
      const criticalResult = await this.validationService.validateCritical(
        data, 
        'team-critical-validation',
        validationContext
      );

      // Validate warning rules
      const warningRules = this.teamValidationRules.filter(rule => rule.type === 'warning');
      const warningResult = await this.validationService.validateWarning(
        data,
        'team-warning-validation',
        validationContext
      );

      // Combine results
      result.errors = criticalResult.errors.map(e => e.message);
      result.warnings = warningResult.errors.map(e => e.message);
      result.isValid = criticalResult.isValid && warningResult.isValid;
      result.canProceed = criticalResult.canProceed && (warningResult.canProceed || this.teamConfig.enableGracefulDegradation);

      this.logDebug('Team validation completed', {
        isValid: result.isValid,
        canProceed: result.canProceed,
        errorCount: result.errors.length,
        warningCount: result.warnings.length
      });

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::team.team',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'validateTeamData'
      });
      
      if (this.teamConfig.enableGracefulDegradation) {
        result.warnings.push(`Validation error: ${error.message}`);
        result.canProceed = true;
      } else {
        result.errors.push(`Validation failed: ${error.message}`);
        result.canProceed = false;
      }
    }

    return result;
  }

  /**
   * Get team validation rules
   */
  public getTeamValidationRules(): any[] {
    return [...this.teamValidationRules];
  }

  /**
   * Enable or disable specific validation rule
   */
  public setValidationRuleEnabled(ruleName: string, enabled: boolean): void {
    const rule = this.teamValidationRules.find(r => r.name === ruleName);
    if (rule) {
      rule.enabled = enabled;
      this.logInfo(`Team validation rule ${ruleName} ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      this.logWarn(`Team validation rule ${ruleName} not found`);
    }
  }

  /**
   * Get validation rule status
   */
  public getValidationRuleStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const rule of this.teamValidationRules) {
      status[rule.name] = rule.enabled;
    }
    return status;
  }

  /**
   * Calculate team fields using calculation service and team-specific calculations
   */
  private async calculateTeamFields(data: TeamData, operation: 'create' | 'update', teamId?: number): Promise<TeamCalculationResult> {
    const result: TeamCalculationResult = {
      success: true,
      calculatedFields: {},
      errors: []
    };

    try {
      // Use calculation service with team-specific sync calculations
      const syncResult = await this.calculationService.calculateSync(
        data,
        'team-sync-calculation',
        { 
          operationId: 'team-sync-calculation', 
          contentType: 'api::team.team',
          operation: 'update' as 'create' | 'update' | 'delete',
          timestamp: new Date()
        }
      );

      if (syncResult.success) {
        Object.assign(result.calculatedFields, syncResult.results);
        this.logDebug('Team sync calculations completed', {
          calculatedFields: Object.keys(syncResult.results),
          teamId: data.id
        });
      } else {
        result.errors.push(...syncResult.errors);
        this.logWarn('Some team sync calculations failed', {
          errors: syncResult.errors,
          teamId: data.id
        });
      }

      // Add operation metadata
      result.calculatedFields.last_calculated = new Date();
      result.calculatedFields.calculation_operation = operation;

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::team.team',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'calculateTeamFields'
      });
      result.success = false;
      result.errors.push(`Calculation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Get team statistics (calculated)
   */
  public async getTeamStatistics(teamId: number): Promise<TeamStatistics | null> {
    try {
      const team = await this.strapi.entityService.findOne('api::team.team', teamId, {
        populate: {
          tabellen_eintraege: true
        }
      });

      if (!team) {
        return null;
      }

      // Use sync calculation to get current statistics
      const statsCalculation = this.teamSyncCalculations.find(c => c.field === 'basic_statistics');
      if (statsCalculation) {
        return statsCalculation.calculator(team);
      }

      return null;

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::team.team',
        hookType: 'afterUpdate',
        event: { params: {} },
        operationId: 'getTeamStatistics'
      });
      return null;
    }
  }

  /**
   * Get team ranking (async)
   */
  public async getTeamRanking(teamId: number): Promise<TeamRanking | null> {
    try {
      const rankingCalculation = this.teamAsyncCalculations.find(c => c.name === 'team-ranking-calculation');
      if (rankingCalculation) {
        return await rankingCalculation.calculator({ teamId });
      }

      return null;

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::team.team',
        hookType: 'afterUpdate',
        event: { params: {} },
        operationId: 'getTeamRanking'
      });
      return null;
    }
  }

  /**
   * Get team form (async)
   */
  public async getTeamForm(teamId: number): Promise<TeamForm | null> {
    try {
      const formCalculation = this.teamAsyncCalculations.find(c => c.name === 'team-form-calculation');
      if (formCalculation) {
        return await formCalculation.calculator({ teamId });
      }

      return null;

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::team.team',
        hookType: 'afterUpdate',
        event: { params: {} },
        operationId: 'getTeamForm'
      });
      return null;
    }
  }

  /**
   * Schedule async calculations
   */
  private async scheduleAsyncCalculations(teamData: TeamData, operation: 'create' | 'update'): Promise<void> {
    try {
      if (!teamData.id) {
        this.logWarn('Cannot schedule async calculations without team ID');
        return;
      }

      // Schedule team-specific async calculations
      await this.calculationService.scheduleAsync(
        { teamId: teamData.id, operation },
        'api::team.team',
        { 
          operationId: 'team-async-calculation', 
          contentType: 'api::team.team',
          operation: 'update' as 'create' | 'update' | 'delete',
          timestamp: new Date()
        }
      );

      this.logDebug('Team async calculations scheduled', { 
        teamId: teamData.id, 
        operation,
        calculations: this.teamAsyncCalculations.map(c => c.name)
      });

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::team.team',
        hookType: 'afterUpdate',
        event: { params: {} },
        operationId: 'scheduleAsyncCalculations'
      });
      // Don't throw error - async calculations are not critical
    }
  }

  /**
   * Get team calculations
   */
  public getTeamSyncCalculations(): any[] {
    return [...this.teamSyncCalculations];
  }

  public getTeamAsyncCalculations(): any[] {
    return [...this.teamAsyncCalculations];
  }

  /**
   * Enable or disable specific calculation
   */
  public setCalculationEnabled(calculationName: string, enabled: boolean): void {
    // Find in sync calculations
    const syncCalc = this.teamSyncCalculations.find(c => c.field === calculationName);
    if (syncCalc && 'enabled' in syncCalc) {
      syncCalc.enabled = enabled;
      this.logInfo(`Team sync calculation ${calculationName} ${enabled ? 'enabled' : 'disabled'}`);
      return;
    }

    // Find in async calculations
    const asyncCalc = this.teamAsyncCalculations.find(c => c.name === calculationName);
    if (asyncCalc && 'enabled' in asyncCalc) {
      asyncCalc.enabled = enabled;
      this.logInfo(`Team async calculation ${calculationName} ${enabled ? 'enabled' : 'disabled'}`);
      return;
    }

    this.logWarn(`Team calculation ${calculationName} not found`);
  }

  /**
   * Get calculation status
   */
  public getCalculationStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    
    for (const calc of this.teamSyncCalculations) {
      status[calc.field] = calc.enabled !== false;
    }
    
    for (const calc of this.teamAsyncCalculations) {
      status[calc.name] = calc.enabled !== false;
    }
    
    return status;
  }

  /**
   * Update team configuration
   */
  public updateTeamConfig(newConfig: Partial<TeamHookConfiguration>): void {
    this.teamConfig = { ...this.teamConfig, ...newConfig };
    this.updateConfig(newConfig);
    
    // Update service configurations
    // TODO: Implement updateConfig methods
    // this.validationService.updateConfig({
    //   enableStrictValidation: this.teamConfig.enableStrictValidation,
    //   logLevel: this.teamConfig.logLevel
    // });
    
    // this.calculationService.updateConfig({
    //   enableAsyncCalculations: this.teamConfig.enableAsyncCalculations,
    //   logLevel: this.teamConfig.logLevel
    // });

    // Update team validation rules configuration
    updateTeamValidationConfig(this.teamValidationRules, newConfig);

    // Update team calculation configurations
    updateTeamCalculationConfig([...this.teamSyncCalculations, ...this.teamAsyncCalculations], newConfig);

    this.logInfo('Team hook configuration updated', this.teamConfig);
  }

  /**
   * Get team-specific configuration
   */
  public getTeamConfig(): TeamHookConfiguration {
    return { ...this.teamConfig };
  }

  /**
   * Get team validation statistics
   */
  public getValidationStats(): any {
    return {
      contentType: this.contentType,
      config: this.teamConfig,
      metrics: this.getMetrics(),
      validationService: null, // this.validationService.getStats?.() || null,
      calculationService: null, // this.calculationService.getStats?.() || null,
      validationRules: this.getValidationRuleStatus(),
      calculations: this.getCalculationStatus(),
      syncCalculations: this.teamSyncCalculations.map(c => ({
        field: c.field,
        dependencies: c.dependencies
      })),
      asyncCalculations: this.teamAsyncCalculations.map(c => ({
        name: c.name,
        priority: c.priority
      }))
    };
  }
}

export default TeamHookService;
export type { 
  TeamHookConfiguration, 
  TeamData, 
  TeamValidationResult, 
  TeamCalculationResult 
};