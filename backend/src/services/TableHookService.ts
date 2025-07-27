/**
 * Table Hook Service
 * 
 * Specialized hook service for tabellen-eintrag content type with optimized calculations,
 * efficient table data validation, and table position calculation logic.
 * 
 * Implements Requirements 4.1 (modular services), 5.1 (automatic calculations),
 * 3.1 (performance optimization), and 8.1 (data integrity).
 */

import { BaseHookService, HookConfiguration } from './BaseHookService';
import { HookEvent, HookResult, HookContext } from './hook-error-handler';
import { ValidationService, getValidationService } from './ValidationService';
import { CalculationService, getCalculationService } from './CalculationService';
import { TabellenEintragValidationRules } from './validation-rules/TabellenEintragValidationRules';
import { TableCalculations } from './calculations/TableCalculations';

/**
 * Table-specific hook configuration
 */
interface TableHookConfiguration extends HookConfiguration {
  enablePositionCalculation: boolean;
  enableBatchCalculations: boolean;
  positionCalculationTimeout: number;
  batchSize: number;
}

/**
 * Table data interface
 */
interface TableData {
  id?: number;
  team?: any;
  liga?: any;
  spiele?: number;
  siege?: number;
  unentschieden?: number;
  niederlagen?: number;
  tore_fuer?: number;
  tore_gegen?: number;
  tordifferenz?: number;
  punkte?: number;
  platz?: number;
}

/**
 * Table calculation result
 */
interface TableCalculationResult {
  success: boolean;
  modifiedData: TableData;
  calculations: {
    tordifferenz: { value: number; fallbackUsed: boolean; error?: string };
    punkte: { value: number; fallbackUsed: boolean; error?: string };
    platz?: { value: number; fallbackUsed: boolean; error?: string };
  };
  validationWarnings: string[];
}

/**
 * Default table hook configuration
 */
const DEFAULT_TABLE_CONFIG: TableHookConfiguration = {
  enableStrictValidation: false,
  enableAsyncCalculations: true,
  maxHookExecutionTime: 100,
  retryAttempts: 2,
  enableGracefulDegradation: true,
  logLevel: 'warn',
  enablePositionCalculation: true,
  enableBatchCalculations: true,
  positionCalculationTimeout: 5000,
  batchSize: 10
};

/**
 * Table Hook Service Class
 */
export class TableHookService extends BaseHookService {
  private validationService: ValidationService;
  private calculationService: CalculationService;
  private validationRules: TabellenEintragValidationRules;
  private tableCalculations: TableCalculations;
  private tableConfig: TableHookConfiguration;

  constructor(strapi: any, contentType: string, config: Partial<TableHookConfiguration> = {}) {
    const mergedConfig = { ...DEFAULT_TABLE_CONFIG, ...config };
    super(strapi, contentType, mergedConfig);
    
    this.tableConfig = mergedConfig;
    this.validationService = getValidationService(strapi);
    this.calculationService = getCalculationService(strapi);
    this.validationRules = new TabellenEintragValidationRules(strapi);
    this.tableCalculations = new TableCalculations(strapi);

    // Register table-specific validation rules
    this.registerValidationRules();
    
    // Register table-specific calculations
    this.registerCalculations();

    this.logInfo('TableHookService initialized', {
      contentType: this.contentType,
      config: this.tableConfig
    });
  }

  /**
   * Before create hook implementation
   */
  async beforeCreate(event: HookEvent): Promise<HookResult> {
    return await this.executeHook('beforeCreate', event, async () => {
      const { data } = event.params;
      
      this.logDebug('Processing beforeCreate for table entry', { data });

      // Perform table-specific calculations and validation
      const result = await this.processTableData(data, 'create');
      
      if (!result.success) {
        throw new Error('Table data processing failed');
      }

      // Apply calculated values to data
      Object.assign(data, result.modifiedData);

      // Log any warnings
      if (result.validationWarnings.length > 0) {
        this.logWarn('Table validation warnings during create', {
          warnings: result.validationWarnings,
          data
        });
      }

      this.logDebug('Table entry beforeCreate completed', {
        calculations: result.calculations,
        warnings: result.validationWarnings.length
      });

      return data;
    });
  }

  /**
   * Before update hook implementation
   */
  async beforeUpdate(event: HookEvent): Promise<HookResult> {
    return await this.executeHook('beforeUpdate', event, async () => {
      const { data, where } = event.params;
      
      this.logDebug('Processing beforeUpdate for table entry', { 
        id: where?.id, 
        data 
      });

      // Get existing data for comparison
      const existingData = await this.getExistingTableEntry(where?.id);
      if (!existingData) {
        this.logWarn('Existing table entry not found during update', { id: where?.id });
        return data;
      }

      // Merge existing data with updates
      const mergedData = { ...existingData, ...data };

      // Check if recalculation is needed
      if (this.needsRecalculation(data)) {
        const result = await this.processTableData(mergedData, 'update', existingData);
        
        if (result.success) {
          // Apply calculated values to update data
          Object.assign(data, result.modifiedData);

          // Log any warnings
          if (result.validationWarnings.length > 0) {
            this.logWarn('Table validation warnings during update', {
              id: where?.id,
              warnings: result.validationWarnings,
              data: mergedData
            });
          }
        } else {
          this.logWarn('Table data processing failed during update, continuing without calculations', {
            id: where?.id,
            data
          });
        }
      }

      this.logDebug('Table entry beforeUpdate completed', { 
        id: where?.id,
        recalculationNeeded: this.needsRecalculation(data)
      });

      return data;
    });
  }

  /**
   * After create hook implementation
   */
  async afterCreate(event: HookEvent): Promise<void> {
    await this.executeHook('afterCreate', event, async () => {
      const { result } = event;
      
      this.logDebug('Processing afterCreate for table entry', { id: result.id });

      // Schedule async position calculation if enabled
      if (this.tableConfig.enablePositionCalculation && result.liga?.id && result.team?.id) {
        this.schedulePositionCalculation(result.liga.id, result.team.id, result.id);
      }

      // Schedule batch calculations for league if enabled
      if (this.tableConfig.enableBatchCalculations && result.liga?.id) {
        this.scheduleBatchCalculations(result.liga.id);
      }

      this.logDebug('Table entry afterCreate completed', { id: result.id });
    });
  }

  /**
   * After update hook implementation
   */
  async afterUpdate(event: HookEvent): Promise<void> {
    await this.executeHook('afterUpdate', event, async () => {
      const { result, params } = event;
      
      this.logDebug('Processing afterUpdate for table entry', { id: result.id });

      // Check if position-affecting fields were changed
      const changedFields = Object.keys(params.data || {});
      const positionAffectingFields = ['punkte', 'tordifferenz', 'tore_fuer'];
      
      const needsPositionUpdate = changedFields.some(field => 
        positionAffectingFields.includes(field)
      );

      if (needsPositionUpdate && this.tableConfig.enablePositionCalculation && 
          result.liga?.id && result.team?.id) {
        this.schedulePositionCalculation(result.liga.id, result.team.id, result.id);
      }

      // Schedule batch calculations for league if significant changes
      if (needsPositionUpdate && this.tableConfig.enableBatchCalculations && result.liga?.id) {
        this.scheduleBatchCalculations(result.liga.id);
      }

      this.logDebug('Table entry afterUpdate completed', { 
        id: result.id,
        positionUpdateNeeded: needsPositionUpdate
      });
    });
  }

  /**
   * Process table data with calculations and validation
   */
  private async processTableData(
    data: TableData, 
    operation: 'create' | 'update',
    existingData?: TableData
  ): Promise<TableCalculationResult> {
    const result: TableCalculationResult = {
      success: true,
      modifiedData: { ...data },
      calculations: {
        tordifferenz: { value: 0, fallbackUsed: false },
        punkte: { value: 0, fallbackUsed: false }
      },
      validationWarnings: []
    };

    try {
      // Perform validation
      const validationContext = {
        contentType: this.contentType,
        operation,
        existingData,
        strapi: this.strapi,
        operationId: this.generateOperationId('processTableData')
      };

      const validationResult = await this.validationService.validateAll(
        data,
        this.contentType,
        validationContext
      );

      // Collect validation warnings
      result.validationWarnings = validationResult.warnings.map(w => w.message);

      // Check if we can proceed despite validation issues
      if (!validationResult.canProceed) {
        result.success = false;
        return result;
      }

      // Perform calculations
      const calculationContext = {
        contentType: this.contentType,
        operation,
        existingData,
        strapi: this.strapi,
        operationId: this.generateOperationId('tableCalculations'),
        timestamp: new Date()
      };

      const calculationResult = await this.calculationService.calculateSync(
        data,
        this.contentType,
        calculationContext,
        ['goal-difference', 'points']
      );

      if (calculationResult.success) {
        // Apply calculation results
        result.modifiedData = calculationResult.modifiedData;
        
        // Extract specific calculation results
        const goalDiffResult = calculationResult.results.find(r => r.name === 'goal-difference');
        const pointsResult = calculationResult.results.find(r => r.name === 'points');

        if (goalDiffResult) {
          result.calculations.tordifferenz = {
            value: goalDiffResult.value,
            fallbackUsed: goalDiffResult.fallbackUsed,
            error: goalDiffResult.error
          };
        }

        if (pointsResult) {
          result.calculations.punkte = {
            value: pointsResult.value,
            fallbackUsed: pointsResult.fallbackUsed,
            error: pointsResult.error
          };
        }

        // Add calculation warnings
        result.validationWarnings.push(...calculationResult.warnings);
      } else {
        this.logWarn('Table calculations failed, using fallback values', {
          errors: calculationResult.errors,
          data
        });
        
        // Use fallback values
        result.calculations.tordifferenz = { value: 0, fallbackUsed: true };
        result.calculations.punkte = { value: 0, fallbackUsed: true };
        result.modifiedData.tordifferenz = 0;
        result.modifiedData.punkte = 0;
      }

    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::tabellen-eintrag.tabellen-eintrag',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'processTableData'
      });
      result.success = false;
    }

    return result;
  }

  /**
   * Check if recalculation is needed based on changed fields
   */
  private needsRecalculation(data: TableData): boolean {
    const calculationTriggerFields = [
      'tore_fuer', 'tore_gegen', 'siege', 'unentschieden', 'niederlagen'
    ];
    
    return calculationTriggerFields.some(field => data[field] !== undefined);
  }

  /**
   * Get existing table entry with error handling
   */
  private async getExistingTableEntry(id: number): Promise<TableData | null> {
    try {
      return await this.executeWithTimeout(
        () => this.strapi.entityService.findOne(
          'api::tabellen-eintrag.tabellen-eintrag',
          id,
          { populate: ['team', 'liga'] }
        ),
        this.tableConfig.maxHookExecutionTime
      );
    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::tabellen-eintrag.tabellen-eintrag',
        hookType: 'beforeUpdate',
        event: { params: {} },
        operationId: 'getExistingTableEntry'
      });
      return null;
    }
  }

  /**
   * Schedule async position calculation
   */
  private schedulePositionCalculation(ligaId: number, teamId: number, entryId: number): void {
    // Use setTimeout to avoid blocking the hook
    setTimeout(async () => {
      try {
        const positionResult = await this.tableCalculations.calculateTablePosition(ligaId, teamId);
        
        if (positionResult.success && positionResult.value) {
          // Update position asynchronously
          await this.executeWithTimeout(
            () => this.strapi.entityService.update(
              'api::tabellen-eintrag.tabellen-eintrag',
              entryId,
              { data: { platz: positionResult.value } }
            ),
            this.tableConfig.positionCalculationTimeout
          );

          this.logDebug('Table position updated asynchronously', {
            entryId,
            ligaId,
            teamId,
            newPosition: positionResult.value
          });
        }
      } catch (error) {
        this.logWarn('Async table position calculation failed', {
          entryId,
          ligaId,
          teamId,
          error: error.message
        });
      }
    }, 100); // Small delay to ensure hook completion
  }

  /**
   * Schedule batch calculations for entire league
   */
  private scheduleBatchCalculations(ligaId: number): void {
    // Use setTimeout to avoid blocking the hook
    setTimeout(async () => {
      try {
        await this.tableCalculations.batchUpdateLeagueCalculations(ligaId, this.tableConfig.batchSize);
        
        this.logDebug('Batch calculations completed for league', { ligaId });
      } catch (error) {
        this.logWarn('Batch calculations failed for league', {
          ligaId,
          error: error.message
        });
      }
    }, 500); // Longer delay for batch operations
  }

  /**
   * Register table-specific validation rules
   */
  private registerValidationRules(): void {
    try {
      const rules = this.validationRules.getAllRules();
      this.validationService.registerRules(rules);
      
      this.logDebug(`Registered ${rules.length} table validation rules`);
    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::tabellen-eintrag.tabellen-eintrag',
        hookType: 'beforeCreate',
        event: { params: {} },
        operationId: 'registerTableValidationRules'
      });
    }
  }

  /**
   * Register table-specific calculations
   */
  private registerCalculations(): void {
    try {
      const { syncCalculations, asyncCalculations } = this.tableCalculations.getAllCalculations();
      
      this.calculationService.registerCalculations(syncCalculations, asyncCalculations);
      
      this.logDebug(`Registered ${syncCalculations.length} sync and ${asyncCalculations.length} async table calculations`);
    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::tabellen-eintrag.tabellen-eintrag',
        hookType: 'beforeCreate',
        event: { params: {} },
        operationId: 'registerTableCalculations'
      });
    }
  }

  /**
   * Update table-specific configuration
   */
  public updateTableConfig(newConfig: Partial<TableHookConfiguration>): void {
    this.tableConfig = { ...this.tableConfig, ...newConfig };
    
    // Update base configuration
    this.updateConfig(newConfig);
    
    this.logInfo('Table hook configuration updated', this.tableConfig);
  }

  /**
   * Get table-specific configuration
   */
  public getTableConfig(): TableHookConfiguration {
    return { ...this.tableConfig };
  }

  /**
   * Get table calculation statistics
   */
  public getTableCalculationStats() {
    return {
      calculationMetrics: this.calculationService.getMetrics(),
      validationMetrics: this.validationService.getMetrics(),
      hookMetrics: this.getMetrics(),
      config: this.tableConfig
    };
  }

  /**
   * Manually trigger position recalculation for a league
   */
  public async recalculateLeaguePositions(ligaId: number): Promise<{
    success: boolean;
    updated: number;
    errors: string[];
  }> {
    const result = {
      success: true,
      updated: 0,
      errors: [] as string[]
    };

    try {
      const entries = await this.strapi.entityService.findMany(
        'api::tabellen-eintrag.tabellen-eintrag',
        {
          filters: { liga: { id: ligaId } },
          populate: ['team']
        }
      );

      for (const entry of entries) {
        try {
          const positionResult = await this.tableCalculations.calculateTablePosition(
            ligaId, 
            entry.team?.id
          );
          
          if (positionResult.success && positionResult.value !== entry.platz) {
            await this.strapi.entityService.update(
              'api::tabellen-eintrag.tabellen-eintrag',
              entry.id,
              { data: { platz: positionResult.value } }
            );
            result.updated++;
          }
        } catch (error) {
          result.errors.push(`Entry ${entry.id}: ${error.message}`);
        }
      }

      this.logInfo('League position recalculation completed', {
        ligaId,
        updated: result.updated,
        errors: result.errors.length
      });

    } catch (error) {
      result.success = false;
      result.errors.push(`League recalculation failed: ${error.message}`);
      this.logError(error as Error, {
        contentType: 'api::tabellen-eintrag.tabellen-eintrag',
        hookType: 'afterUpdate',
        event: { params: {} },
        operationId: 'recalculateLeaguePositions'
      });
    }

    return result;
  }

  /**
   * Get league table with current calculations
   */
  public async getLeagueTable(ligaId: number): Promise<TableData[]> {
    try {
      return await this.executeWithTimeout(
        () => this.strapi.entityService.findMany(
          'api::tabellen-eintrag.tabellen-eintrag',
          {
            filters: { liga: { id: ligaId } },
            populate: ['team', 'liga'],
            sort: ['platz:asc', 'punkte:desc', 'tordifferenz:desc', 'tore_fuer:desc']
          }
        ),
        this.tableConfig.positionCalculationTimeout
      );
    } catch (error) {
      this.logError(error as Error, {
        contentType: 'api::tabellen-eintrag.tabellen-eintrag',
        hookType: 'afterUpdate',
        event: { params: {} },
        operationId: 'getLeagueTable'
      });
      return [];
    }
  }
}

/**
 * Singleton table hook service instance
 */
let tableHookServiceInstance: TableHookService | null = null;

/**
 * Get or create table hook service instance
 */
export function getTableHookService(
  strapi?: any,
  config?: Partial<TableHookConfiguration>
): TableHookService {
  if (!tableHookServiceInstance && strapi) {
    tableHookServiceInstance = new TableHookService(strapi, 'api::tabellen-eintrag.tabellen-eintrag', config);
  }
  
  if (!tableHookServiceInstance) {
    throw new Error('TableHookService not initialized. Call with strapi instance first.');
  }
  
  return tableHookServiceInstance;
}

/**
 * Initialize table hook service with strapi instance
 */
export function initializeTableHookService(
  strapi: any,
  config?: Partial<TableHookConfiguration>
): TableHookService {
  tableHookServiceInstance = new TableHookService(strapi, 'api::tabellen-eintrag.tabellen-eintrag', config);
  return tableHookServiceInstance;
}

/**
 * Reset table hook service instance (mainly for testing)
 */
export function resetTableHookService(): void {
  tableHookServiceInstance = null;
}

export default TableHookService;
export type { 
  TableHookConfiguration, 
  TableData, 
  TableCalculationResult 
};