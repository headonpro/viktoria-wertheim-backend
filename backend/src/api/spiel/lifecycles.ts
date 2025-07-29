/**
 * Spiel Lifecycle Hooks
 * Handles automatic table calculation triggering on game changes
 */

import { SpielValidationService } from './services/validation';
import { QueueManagerImpl } from '../tabellen-eintrag/services/queue-manager';
import { TabellenBerechnungsServiceImpl } from '../tabellen-eintrag/services/tabellen-berechnung';
import { DEFAULT_AUTOMATION_CONFIG } from '../../config/automation';
import { shouldRunAutomation, shouldUseManualFallback } from '../tabellen-eintrag/services/feature-flags';

export interface SpielLifecycle {
  afterCreate(event: LifecycleEvent): Promise<void>;
  afterUpdate(event: LifecycleEvent): Promise<void>;
  afterDelete(event: LifecycleEvent): Promise<void>;
}

export interface LifecycleEvent {
  result: SpielEntity;
  params: QueryParams;
  state?: any;
}

export interface QueryParams {
  where?: any;
  select?: string[];
  populate?: any;
  orderBy?: any;
  limit?: number;
  offset?: number;
}

export interface LifecycleContext {
  contentType: string;
  operation: LifecycleOperation;
  data: SpielEntity;
  previousData?: SpielEntity;
  operationId: string;
  timestamp: Date;
  userId?: string;
}

export enum LifecycleOperation {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete'
}

export interface TriggerCondition {
  shouldTriggerCalculation(event: LifecycleEvent): boolean;
  getChangedFields(oldData: SpielEntity, newData: SpielEntity): string[];
  isRelevantChange(changedFields: string[]): boolean;
}

export interface HookConfiguration {
  enabled: boolean;
  priority: Priority;
  timeout: number;
  retries: number;
  async: boolean;
  conditions: HookCondition[];
}

export interface HookCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'changed' | 'exists' | 'not_exists';
  value?: any;
}

export interface HookResult {
  success: boolean;
  jobId?: string;
  error?: string;
  processingTime: number;
  timestamp: Date;
}

export enum Priority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

// Re-export from validation service for consistency
export interface SpielEntity {
  id?: number;
  datum: string;
  liga: Liga;
  saison: Saison;
  // Team relations (deprecated but maintained for backward compatibility)
  heim_team?: Team;
  gast_team?: Team;
  // Club relations (new primary fields)
  heim_club?: Club;
  gast_club?: Club;
  heim_tore?: number;
  gast_tore?: number;
  spieltag: number;
  status: SpielStatus;
  notizen?: string;
  last_calculation?: string;
  calculation_status?: CalculationStatus;
  calculation_error?: string;
}

export interface Liga {
  id: number;
  name: string;
}

export interface Saison {
  id: number;
  name: string;
  jahr: number;
}

export interface Team {
  id: number;
  name: string;
  logo?: any;
}

export interface Club {
  id: number;
  name: string;
  kurz_name?: string;
  logo?: any;
  club_typ: 'viktoria_verein' | 'gegner_verein';
  viktoria_team_mapping?: 'team_1' | 'team_2' | 'team_3';
  ligen: Liga[];
  aktiv: boolean;
}

export enum SpielStatus {
  GEPLANT = 'geplant',
  BEENDET = 'beendet',
  ABGESAGT = 'abgesagt',
  VERSCHOBEN = 'verschoben'
}

export enum CalculationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Implementation of Spiel Lifecycle Hooks
 * Handles automatic table calculation triggering based on game changes
 * Enhanced to support both team and club-based games
 */
export class SpielLifecycleImpl implements SpielLifecycle {
  private validationService: SpielValidationService;
  private queueManager: QueueManagerImpl;
  private triggerCondition: EnhancedTriggerConditionImpl;
  private config: HookConfiguration;

  constructor(
    validationService?: SpielValidationService,
    queueManager?: QueueManagerImpl,
    config?: HookConfiguration
  ) {
    this.validationService = validationService || new SpielValidationService();
    
    // Initialize queue manager with table calculation service if not provided
    if (!queueManager) {
      // Only create queue manager if strapi is available
      if (typeof strapi !== 'undefined' && strapi) {
        const tabellenService = new TabellenBerechnungsServiceImpl(strapi);
        this.queueManager = new QueueManagerImpl(tabellenService, DEFAULT_AUTOMATION_CONFIG.queue);
      } else {
        // For testing or when strapi is not available, use a mock
        this.queueManager = {
          addCalculationJob: async () => 'mock-job-id',
          getQueueStatus: () => ({ pendingJobs: 0, processingJobs: 0, failedJobs: 0 }),
          pauseQueue: () => {},
          resumeQueue: () => {}
        } as any;
      }
    } else {
      this.queueManager = queueManager;
    }
    
    this.triggerCondition = new EnhancedTriggerConditionImpl();
    this.config = config || DEFAULT_HOOK_CONFIG;
  }

  /**
   * Handles game creation - triggers calculation for new completed games
   * Enhanced to support both team and club-based games
   */
  async afterCreate(event: LifecycleEvent): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const startTime = Date.now();
    
    try {
      const spiel = event.result;
      
      // Check if automation is enabled via feature flags
      if (typeof strapi !== 'undefined' && strapi && !shouldRunAutomation(strapi)) {
        console.log(`[SpielLifecycle] Automation disabled via feature flags for game ${spiel.id}`);
        return;
      }
      
      // Determine if this is a club-based or team-based game
      const hasClubData = spiel.heim_club && spiel.gast_club;
      const hasTeamData = spiel.heim_team && spiel.gast_team;
      
      // Log the creation event with type information
      console.log(`[SpielLifecycle] Game created: ID ${spiel.id}, Status: ${spiel.status}, Type: ${hasClubData ? 'club-based' : hasTeamData ? 'team-based' : 'incomplete'}`);
      
      // Only trigger calculation for completed games
      if (spiel.status === SpielStatus.BEENDET && spiel.heim_tore !== undefined && spiel.gast_tore !== undefined) {
        
        // Check workflow compatibility first
        const compatibility = await this.ensureWorkflowCompatibility(spiel, LifecycleOperation.CREATE);
        console.log(`[SpielLifecycle] Workflow compatibility for created game ${spiel.id}:`, compatibility);

        if (compatibility.recommendedAction === 'skip') {
          console.warn(`[SpielLifecycle] Skipping calculation for created game ${spiel.id}: ${compatibility.details}`);
          return;
        }

        if (compatibility.recommendedAction === 'fallback') {
          console.log(`[SpielLifecycle] Using fallback processing for created game ${spiel.id}`);
          const fallbackResult = await this.processFallbackTeamGame(spiel, LifecycleOperation.CREATE);
          console.log(`[SpielLifecycle] Fallback calculation result for created game ${spiel.id}:`, fallbackResult);
          return;
        }
        
        // Validate club data if present
        if (hasClubData) {
          const clubValidation = await this.validateClubData(spiel);
          if (!clubValidation.isValid) {
            console.warn(`[SpielLifecycle] Club validation failed for created game ${spiel.id}:`, clubValidation.errors);
            
            // Handle validation error and determine if we should continue
            const errorHandling = await this.handleClubValidationError(spiel, 'club_validation');
            if (!errorHandling.shouldContinue) {
              return;
            }
          }

          // Validate liga consistency for club-based games
          const ligaValidation = await this.validateLigaConsistency(spiel);
          if (!ligaValidation.isValid) {
            console.warn(`[SpielLifecycle] Liga consistency validation failed for created game ${spiel.id}:`, ligaValidation.errors);
            
            const errorHandling = await this.handleClubValidationError(spiel, 'liga_consistency_failure');
            if (!errorHandling.shouldContinue) {
              return;
            }
          }
        }
        
        // Validate the game result (works for both team and club games)
        const validation = await this.validationService.validateSpielResult(spiel);
        if (!validation.isValid) {
          console.warn(`[SpielLifecycle] Validation failed for created game ${spiel.id}:`, validation.errors);
          return;
        }

        // Trigger table calculation
        const result = await this.triggerCalculation(spiel, LifecycleOperation.CREATE);
        
        console.log(`[SpielLifecycle] Calculation triggered for created game ${spiel.id}:`, result);
      }
    } catch (error) {
      console.error(`[SpielLifecycle] Error in afterCreate for game ${event.result.id}:`, error);
      
      if (this.config.async) {
        // Don't throw in async mode to prevent blocking the main operation
        return;
      }
      throw error;
    } finally {
      const processingTime = Date.now() - startTime;
      if (processingTime > 1000) {
        console.warn(`[SpielLifecycle] afterCreate took ${processingTime}ms for game ${event.result.id}`);
      }
    }
  }

  /**
   * Handles game updates - triggers calculation when relevant fields change
   * Enhanced to detect club field changes and validate club data
   */
  async afterUpdate(event: LifecycleEvent): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const startTime = Date.now();
    
    try {
      const newData = event.result;
      const oldData = event.state?.previousData;
      
      if (!oldData) {
        console.warn(`[SpielLifecycle] No previous data available for game ${newData.id} update`);
        return;
      }

      // Check if automation is enabled via feature flags
      if (typeof strapi !== 'undefined' && strapi && !shouldRunAutomation(strapi)) {
        console.log(`[SpielLifecycle] Automation disabled via feature flags for game ${newData.id}`);
        return;
      }

      // Determine game types for old and new data
      const oldHasClubData = oldData.heim_club && oldData.gast_club;
      const newHasClubData = newData.heim_club && newData.gast_club;
      const oldHasTeamData = oldData.heim_team && oldData.gast_team;
      const newHasTeamData = newData.heim_team && newData.gast_team;

      // Log the update event with type information
      console.log(`[SpielLifecycle] Game updated: ID ${newData.id}, Old Status: ${oldData.status}, New Status: ${newData.status}`);
      console.log(`[SpielLifecycle] Data types - Old: ${oldHasClubData ? 'club' : oldHasTeamData ? 'team' : 'incomplete'}, New: ${newHasClubData ? 'club' : newHasTeamData ? 'team' : 'incomplete'}`);
      
      // Check for gradual migration scenarios first
      const migrationResult = await this.processGradualMigration(oldData, newData);
      if (migrationResult.shouldTrigger) {
        console.log(`[SpielLifecycle] Migration processing completed for game ${newData.id}:`, migrationResult.migrationInfo);
        return;
      }

      // Check if this update should trigger a calculation
      if (!this.triggerCondition.shouldTriggerCalculation(event)) {
        console.log(`[SpielLifecycle] No calculation trigger needed for game ${newData.id}`);
        return;
      }

      // Get changed fields for logging
      const changedFields = this.triggerCondition.getChangedFields(oldData, newData);
      console.log(`[SpielLifecycle] Relevant changes detected for game ${newData.id}:`, changedFields);

      // Check workflow compatibility
      const compatibility = await this.ensureWorkflowCompatibility(newData, LifecycleOperation.UPDATE);
      console.log(`[SpielLifecycle] Workflow compatibility for game ${newData.id}:`, compatibility);

      if (compatibility.recommendedAction === 'skip') {
        console.warn(`[SpielLifecycle] Skipping calculation for game ${newData.id}: ${compatibility.details}`);
        return;
      }

      if (compatibility.recommendedAction === 'fallback') {
        console.log(`[SpielLifecycle] Using fallback processing for game ${newData.id}`);
        const fallbackResult = await this.processFallbackTeamGame(newData, LifecycleOperation.UPDATE);
        console.log(`[SpielLifecycle] Fallback calculation result for game ${newData.id}:`, fallbackResult);
        return;
      }

      // Validate club field changes
      const clubFieldValidation = await this.validateClubFieldChanges(oldData, newData);
      if (!clubFieldValidation.isValid) {
        console.warn(`[SpielLifecycle] Club field validation failed for updated game ${newData.id}:`, clubFieldValidation.errors);
        
        const errorHandling = await this.handleClubValidationError(newData, 'club_field_changes');
        if (!errorHandling.shouldContinue) {
          return;
        }
      }

      // Validate club data if present in new data
      if (newHasClubData) {
        const clubValidation = await this.validateClubData(newData);
        if (!clubValidation.isValid) {
          console.warn(`[SpielLifecycle] Club validation failed for updated game ${newData.id}:`, clubValidation.errors);
          
          const errorHandling = await this.handleClubValidationError(newData, 'club_validation');
          if (!errorHandling.shouldContinue) {
            return;
          }
        }

        // Validate liga consistency for club-based games
        const ligaValidation = await this.validateLigaConsistency(newData);
        if (!ligaValidation.isValid) {
          console.warn(`[SpielLifecycle] Liga consistency validation failed for updated game ${newData.id}:`, ligaValidation.errors);
          
          const errorHandling = await this.handleClubValidationError(newData, 'liga_consistency_failure');
          if (!errorHandling.shouldContinue) {
            return;
          }
        }
      }

      // Validate the updated game result if it's completed
      if (newData.status === SpielStatus.BEENDET) {
        const validation = await this.validationService.validateSpielResult(newData);
        if (!validation.isValid) {
          console.warn(`[SpielLifecycle] Validation failed for updated game ${newData.id}:`, validation.errors);
          return;
        }
      }

      // Trigger table calculation
      const result = await this.triggerCalculation(newData, LifecycleOperation.UPDATE);
      
      console.log(`[SpielLifecycle] Calculation triggered for updated game ${newData.id}:`, result);
    } catch (error) {
      console.error(`[SpielLifecycle] Error in afterUpdate for game ${event.result.id}:`, error);
      
      if (this.config.async) {
        // Don't throw in async mode to prevent blocking the main operation
        return;
      }
      throw error;
    } finally {
      const processingTime = Date.now() - startTime;
      if (processingTime > 1000) {
        console.warn(`[SpielLifecycle] afterUpdate took ${processingTime}ms for game ${event.result.id}`);
      }
    }
  }

  /**
   * Handles game deletion - triggers recalculation to remove deleted game's impact
   * Enhanced to support both club-based and team-based games
   */
  async afterDelete(event: LifecycleEvent): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const startTime = Date.now();
    
    try {
      const deletedSpiel = event.result;
      
      // Check if automation is enabled via feature flags
      if (typeof strapi !== 'undefined' && strapi && !shouldRunAutomation(strapi)) {
        console.log(`[SpielLifecycle] Automation disabled via feature flags for deleted game ${deletedSpiel.id}`);
        return;
      }
      
      // Determine game type for logging
      const hasClubData = deletedSpiel.heim_club && deletedSpiel.gast_club;
      const hasTeamData = deletedSpiel.heim_team && deletedSpiel.gast_team;
      
      // Log the deletion event with type information
      console.log(`[SpielLifecycle] Game deleted: ID ${deletedSpiel.id}, Status: ${deletedSpiel.status}, Type: ${hasClubData ? 'club-based' : hasTeamData ? 'team-based' : 'incomplete'}`);
      
      // Only trigger calculation if the deleted game was completed (had impact on table)
      if (deletedSpiel.status === SpielStatus.BEENDET && 
          deletedSpiel.heim_tore !== undefined && 
          deletedSpiel.gast_tore !== undefined) {
        
        // Trigger table recalculation with high priority since deletion affects existing data
        const result = await this.triggerCalculation(deletedSpiel, LifecycleOperation.DELETE, Priority.HIGH);
        
        console.log(`[SpielLifecycle] Recalculation triggered for deleted game ${deletedSpiel.id}:`, result);
      }
    } catch (error) {
      console.error(`[SpielLifecycle] Error in afterDelete for game ${event.result.id}:`, error);
      
      if (this.config.async) {
        // Don't throw in async mode to prevent blocking the main operation
        return;
      }
      throw error;
    } finally {
      const processingTime = Date.now() - startTime;
      if (processingTime > 1000) {
        console.warn(`[SpielLifecycle] afterDelete took ${processingTime}ms for game ${event.result.id}`);
      }
    }
  }

  /**
   * Triggers table calculation for the given game's league and season
   * Enhanced to support both team and club-based games with backward compatibility
   */
  private async triggerCalculation(
    spiel: SpielEntity, 
    operation: LifecycleOperation,
    priority?: Priority
  ): Promise<HookResult> {
    const startTime = Date.now();
    
    try {
      // Determine game type for processing
      const hasClubData = spiel.heim_club && spiel.gast_club;
      const hasTeamData = spiel.heim_team && spiel.gast_team;
      
      // Log the calculation trigger with game type
      console.log(`[SpielLifecycle] Triggering calculation for ${hasClubData ? 'club-based' : hasTeamData ? 'team-based' : 'incomplete'} game ${spiel.id}`);
      
      // Determine priority based on operation, game type, and changed fields
      let calculationPriority = priority || this.getPriorityForOperation(operation);
      
      // Adjust priority for migration scenarios
      if (hasClubData && hasTeamData) {
        // Game has both club and team data - likely during migration
        calculationPriority = Priority.HIGH;
        console.log(`[SpielLifecycle] High priority set for migration scenario in game ${spiel.id}`);
      }
      
      // Add calculation job to queue
      const jobId = await this.queueManager.addCalculationJob(
        spiel.liga.id,
        spiel.saison.id,
        calculationPriority
      );

      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        jobId,
        processingTime,
        timestamp: new Date()
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      return {
        success: false,
        error: errorMessage,
        processingTime,
        timestamp: new Date()
      };
    }
  }

  /**
   * Determines the appropriate priority for different operations
   */
  private getPriorityForOperation(operation: LifecycleOperation): Priority {
    switch (operation) {
      case LifecycleOperation.CREATE:
        return DEFAULT_AUTOMATION_CONFIG.queue.priority.gameResult;
      case LifecycleOperation.UPDATE:
        return DEFAULT_AUTOMATION_CONFIG.queue.priority.gameResult;
      case LifecycleOperation.DELETE:
        return Priority.HIGH; // Deletions need higher priority to maintain data consistency
      default:
        return DEFAULT_AUTOMATION_CONFIG.queue.priority.default;
    }
  }

  /**
   * Updates the hook configuration
   */
  updateConfig(config: Partial<HookConfiguration>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets the current hook configuration
   */
  getConfig(): HookConfiguration {
    return { ...this.config };
  }

  /**
   * Gets queue status for monitoring
   */
  getQueueStatus() {
    return this.queueManager.getQueueStatus();
  }

  /**
   * Pauses the queue processing
   */
  pauseQueue(): void {
    this.queueManager.pauseQueue();
  }

  /**
   * Resumes the queue processing
   */
  resumeQueue(): void {
    this.queueManager.resumeQueue();
  }

  /**
   * Validates club data for club-based games
   * @param spiel - The game with club data to validate
   * @returns Validation result
   */
  private async validateClubData(spiel: SpielEntity): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check if both clubs exist and are provided
      if (!spiel.heim_club || !spiel.gast_club) {
        errors.push('Both home and away clubs must be specified for club-based games');
        return { isValid: false, errors };
      }

      // Skip validation if strapi is not available (testing environment)
      if (typeof strapi === 'undefined' || !strapi) {
        return { isValid: true, errors: [] };
      }

      // Get club service for validation
      const clubService = strapi.service('api::club.club');

      // Validate that both clubs exist and are active
      const [heimClub, gastClub] = await Promise.all([
        strapi.entityService.findOne('api::club.club', spiel.heim_club.id, {
          populate: { ligen: true }
        }),
        strapi.entityService.findOne('api::club.club', spiel.gast_club.id, {
          populate: { ligen: true }
        })
      ]);

      if (!heimClub) {
        errors.push(`Home club with ID ${spiel.heim_club.id} not found`);
      } else if (!heimClub.aktiv) {
        errors.push(`Home club "${heimClub.name}" is inactive`);
      }

      if (!gastClub) {
        errors.push(`Away club with ID ${spiel.gast_club.id} not found`);
      } else if (!gastClub.aktiv) {
        errors.push(`Away club "${gastClub.name}" is inactive`);
      }

      // If clubs don't exist, can't perform further validation
      if (!heimClub || !gastClub) {
        return { isValid: false, errors };
      }

      // Validate that clubs don't play against themselves
      if (spiel.heim_club.id === spiel.gast_club.id) {
        errors.push('A club cannot play against itself');
      }

      // Validate that both clubs belong to the same league
      const ligaId = spiel.liga.id;
      const [heimInLiga, gastInLiga] = await Promise.all([
        clubService.validateClubInLiga(spiel.heim_club.id, ligaId),
        clubService.validateClubInLiga(spiel.gast_club.id, ligaId)
      ]);

      if (!heimInLiga) {
        errors.push(`Home club "${heimClub.name}" is not assigned to league "${spiel.liga.name}"`);
      }

      if (!gastInLiga) {
        errors.push(`Away club "${gastClub.name}" is not assigned to league "${spiel.liga.name}"`);
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      console.error('[SpielLifecycle] Error validating club data:', error);
      return {
        isValid: false,
        errors: [`Club validation error: ${error.message}`]
      };
    }
  }

  /**
   * Validates club field changes for trigger conditions
   * @param oldData - Previous game data
   * @param newData - Updated game data
   * @returns Validation result for club field changes
   */
  private async validateClubFieldChanges(oldData: SpielEntity, newData: SpielEntity): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Get changed fields to determine what to validate
      const changedFields = this.triggerCondition.getChangedFields(oldData, newData);
      const clubFieldsChanged = changedFields.some(field => 
        ['heim_club', 'gast_club', 'migration_team_to_club', 'migration_club_to_team'].includes(field)
      );

      if (!clubFieldsChanged) {
        // No club fields changed, no validation needed
        return { isValid: true, errors: [] };
      }

      // If club fields changed, validate the new club data
      const hasNewClubData = newData.heim_club && newData.gast_club;
      if (hasNewClubData) {
        const clubValidation = await this.validateClubData(newData);
        if (!clubValidation.isValid) {
          errors.push(...clubValidation.errors);
        }
      }

      // Validate migration scenarios
      const oldHasClubData = oldData.heim_club && oldData.gast_club;
      const newHasClubData = newData.heim_club && newData.gast_club;
      const oldHasTeamData = oldData.heim_team && oldData.gast_team;
      const newHasTeamData = newData.heim_team && newData.gast_team;

      // Validate team-to-club migration
      if (oldHasTeamData && !oldHasClubData && newHasClubData && !newHasTeamData) {
        console.log(`[SpielLifecycle] Detected team-to-club migration for game ${newData.id}`);
        
        // Ensure the migration is complete and valid
        if (!newData.heim_club || !newData.gast_club) {
          errors.push('Incomplete team-to-club migration: both clubs must be specified');
        }
      }

      // Validate club-to-team migration (should be rare)
      if (oldHasClubData && !oldHasTeamData && newHasTeamData && !newHasClubData) {
        console.log(`[SpielLifecycle] Detected club-to-team migration for game ${newData.id}`);
        
        // Ensure the migration is complete and valid
        if (!newData.heim_team || !newData.gast_team) {
          errors.push('Incomplete club-to-team migration: both teams must be specified');
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      console.error('[SpielLifecycle] Error validating club field changes:', error);
      return {
        isValid: false,
        errors: [`Club field validation error: ${error.message}`]
      };
    }
  }

  /**
   * Validates liga consistency for club-based games
   * @param spiel - The game to validate
   * @returns Validation result for liga consistency
   */
  private async validateLigaConsistency(spiel: SpielEntity): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Only validate if this is a club-based game
      const hasClubData = spiel.heim_club && spiel.gast_club;
      if (!hasClubData) {
        return { isValid: true, errors: [] };
      }

      // Get club service for validation
      const clubService = strapi.service('api::club.club');
      const ligaId = spiel.liga.id;

      // Skip validation if strapi is not available (testing environment)
      if (typeof strapi === 'undefined' || !strapi) {
        return { isValid: true, errors: [] };
      }

      // Validate that the league exists and is active
      const liga = await strapi.entityService.findOne('api::liga.liga', ligaId);
      if (!liga) {
        errors.push(`League with ID ${ligaId} not found`);
        return { isValid: false, errors };
      }

      // Liga is active by default (no aktiv field in schema)

      // Validate that both clubs are assigned to this league
      const [heimInLiga, gastInLiga] = await Promise.all([
        clubService.validateClubInLiga(spiel.heim_club.id, ligaId),
        clubService.validateClubInLiga(spiel.gast_club.id, ligaId)
      ]);

      if (!heimInLiga) {
        const heimClub = await strapi.entityService.findOne('api::club.club', spiel.heim_club.id);
        errors.push(`Home club "${heimClub?.name || spiel.heim_club.id}" is not assigned to league "${liga.name}"`);
      }

      if (!gastInLiga) {
        const gastClub = await strapi.entityService.findOne('api::club.club', spiel.gast_club.id);
        errors.push(`Away club "${gastClub?.name || spiel.gast_club.id}" is not assigned to league "${liga.name}"`);
      }

      // Validate season consistency
      const saison = await strapi.entityService.findOne('api::saison.saison', spiel.saison.id);
      if (!saison) {
        errors.push(`Season with ID ${spiel.saison.id} not found`);
      } else if (!saison.aktiv) {
        errors.push(`Season "${saison.name}" is inactive`);
      }

      return {
        isValid: errors.length === 0,
        errors
      };

    } catch (error) {
      console.error('[SpielLifecycle] Error validating liga consistency:', error);
      return {
        isValid: false,
        errors: [`Liga consistency validation error: ${error.message}`]
      };
    }
  }

  /**
   * Comprehensive error handling for club validation
   * @param spiel - The game data
   * @param validationType - Type of validation being performed
   * @returns Detailed error information
   */
  private async handleClubValidationError(spiel: SpielEntity, validationType: string): Promise<{
    shouldContinue: boolean;
    errorDetails: {
      type: string;
      message: string;
      gameId: number;
      timestamp: Date;
      context: any;
    };
  }> {
    try {
      const errorDetails = {
        type: validationType,
        message: `Club validation failed for game ${spiel.id}`,
        gameId: spiel.id,
        timestamp: new Date(),
        context: {
          hasClubData: !!(spiel.heim_club && spiel.gast_club),
          hasTeamData: !!(spiel.heim_team && spiel.gast_team),
          status: spiel.status,
          liga: spiel.liga?.name || spiel.liga?.id,
          saison: spiel.saison?.name || spiel.saison?.id
        }
      };

      // Log the error for monitoring
      console.error(`[SpielLifecycle] ${validationType} error:`, errorDetails);

      // Determine if processing should continue based on error type
      const shouldContinue = this.shouldContinueAfterValidationError(validationType, spiel);

      return {
        shouldContinue,
        errorDetails
      };

    } catch (error) {
      console.error('[SpielLifecycle] Error in error handling:', error);
      return {
        shouldContinue: false,
        errorDetails: {
          type: 'error_handling_failure',
          message: `Failed to handle ${validationType} error: ${error.message}`,
          gameId: spiel.id,
          timestamp: new Date(),
          context: { originalError: error.message }
        }
      };
    }
  }

  /**
   * Determines if processing should continue after a validation error
   * @param validationType - Type of validation that failed
   * @param spiel - The game data
   * @returns Whether to continue processing
   */
  private shouldContinueAfterValidationError(validationType: string, spiel: SpielEntity): boolean {
    // Critical errors that should stop processing
    const criticalErrors = [
      'club_not_found',
      'liga_consistency_failure',
      'invalid_migration'
    ];

    if (criticalErrors.includes(validationType)) {
      return false;
    }

    // For non-critical errors, continue if we have fallback data
    const hasTeamFallback = spiel.heim_team && spiel.gast_team;
    const hasClubData = spiel.heim_club && spiel.gast_club;

    // If club validation fails but we have team data, we can continue
    if (validationType === 'club_validation' && hasTeamFallback && !hasClubData) {
      console.log(`[SpielLifecycle] Continuing with team fallback for game ${spiel.id}`);
      return true;
    }

    // Default to not continuing for unknown error types
    return false;
  }

  /**
   * Handles backward compatibility for team-based games
   * @param spiel - The game data
   * @returns Whether the game can be processed with team data
   */
  private canProcessWithTeamData(spiel: SpielEntity): boolean {
    // Check if we have valid team data
    const hasTeamData = spiel.heim_team && spiel.gast_team;
    if (!hasTeamData) {
      return false;
    }

    // Validate that team IDs are valid
    if (!spiel.heim_team.id || !spiel.gast_team.id) {
      return false;
    }

    // Validate that teams are different
    if (spiel.heim_team.id === spiel.gast_team.id) {
      console.warn(`[SpielLifecycle] Team-based game ${spiel.id} has same team for home and away`);
      return false;
    }

    return true;
  }

  /**
   * Processes fallback logic for team-only games
   * @param spiel - The game data
   * @param operation - The lifecycle operation
   * @returns Processing result
   */
  private async processFallbackTeamGame(spiel: SpielEntity, operation: LifecycleOperation): Promise<HookResult> {
    console.log(`[SpielLifecycle] Processing team-based fallback for game ${spiel.id}`);
    
    try {
      // Validate team data
      if (!this.canProcessWithTeamData(spiel)) {
        return {
          success: false,
          error: 'Invalid team data for fallback processing',
          processingTime: 0,
          timestamp: new Date()
        };
      }

      // Use existing team-based validation
      const validation = await this.validationService.validateSpielResult(spiel);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Team validation failed: ${validation.errors.join(', ')}`,
          processingTime: 0,
          timestamp: new Date()
        };
      }

      // Trigger calculation with normal priority for team-based games
      return await this.triggerCalculation(spiel, operation, Priority.NORMAL);

    } catch (error) {
      console.error(`[SpielLifecycle] Error in team fallback processing for game ${spiel.id}:`, error);
      return {
        success: false,
        error: `Team fallback error: ${error.message}`,
        processingTime: 0,
        timestamp: new Date()
      };
    }
  }

  /**
   * Implements gradual migration triggers for transitioning from team to club system
   * @param oldData - Previous game data
   * @param newData - Updated game data
   * @returns Migration processing result
   */
  private async processGradualMigration(oldData: SpielEntity, newData: SpielEntity): Promise<{
    shouldTrigger: boolean;
    migrationResult?: HookResult;
    migrationInfo: {
      type: 'team_to_club' | 'club_to_team' | 'none';
      requiresSpecialHandling: boolean;
      details: string;
    };
  }> {
    const oldHasClubData = oldData.heim_club && oldData.gast_club;
    const newHasClubData = newData.heim_club && newData.gast_club;
    const oldHasTeamData = oldData.heim_team && oldData.gast_team;
    const newHasTeamData = newData.heim_team && newData.gast_team;

    // Detect team-to-club migration
    if (oldHasTeamData && !oldHasClubData && newHasClubData) {
      console.log(`[SpielLifecycle] Processing team-to-club migration for game ${newData.id}`);
      
      try {
        // Validate the new club data
        const clubValidation = await this.validateClubData(newData);
        if (!clubValidation.isValid) {
          return {
            shouldTrigger: false,
            migrationInfo: {
              type: 'team_to_club',
              requiresSpecialHandling: true,
              details: `Migration validation failed: ${clubValidation.errors.join(', ')}`
            }
          };
        }

        // Trigger calculation with high priority for migration
        const migrationResult = await this.triggerCalculation(newData, LifecycleOperation.UPDATE, Priority.HIGH);
        
        return {
          shouldTrigger: true,
          migrationResult,
          migrationInfo: {
            type: 'team_to_club',
            requiresSpecialHandling: true,
            details: 'Successfully migrated from team-based to club-based game'
          }
        };

      } catch (error) {
        console.error(`[SpielLifecycle] Error in team-to-club migration for game ${newData.id}:`, error);
        return {
          shouldTrigger: false,
          migrationInfo: {
            type: 'team_to_club',
            requiresSpecialHandling: true,
            details: `Migration error: ${error.message}`
          }
        };
      }
    }

    // Detect club-to-team migration (rare but possible)
    if (oldHasClubData && !oldHasTeamData && newHasTeamData) {
      console.log(`[SpielLifecycle] Processing club-to-team migration for game ${newData.id}`);
      
      try {
        // Process as team-based game
        const migrationResult = await this.processFallbackTeamGame(newData, LifecycleOperation.UPDATE);
        
        return {
          shouldTrigger: true,
          migrationResult,
          migrationInfo: {
            type: 'club_to_team',
            requiresSpecialHandling: true,
            details: 'Successfully migrated from club-based to team-based game'
          }
        };

      } catch (error) {
        console.error(`[SpielLifecycle] Error in club-to-team migration for game ${newData.id}:`, error);
        return {
          shouldTrigger: false,
          migrationInfo: {
            type: 'club_to_team',
            requiresSpecialHandling: true,
            details: `Migration error: ${error.message}`
          }
        };
      }
    }

    // No migration detected
    return {
      shouldTrigger: false,
      migrationInfo: {
        type: 'none',
        requiresSpecialHandling: false,
        details: 'No migration scenario detected'
      }
    };
  }

  /**
   * Ensures no breaking changes to existing workflows
   * @param spiel - The game data
   * @param operation - The lifecycle operation
   * @returns Whether existing workflows can continue
   */
  private async ensureWorkflowCompatibility(spiel: SpielEntity, operation: LifecycleOperation): Promise<{
    isCompatible: boolean;
    fallbackAvailable: boolean;
    recommendedAction: 'proceed' | 'fallback' | 'skip';
    details: string;
  }> {
    try {
      const hasClubData = spiel.heim_club && spiel.gast_club;
      const hasTeamData = spiel.heim_team && spiel.gast_team;

      // Case 1: Club-based game with valid data
      if (hasClubData && !hasTeamData) {
        const clubValidation = await this.validateClubData(spiel);
        return {
          isCompatible: clubValidation.isValid,
          fallbackAvailable: false,
          recommendedAction: clubValidation.isValid ? 'proceed' : 'skip',
          details: clubValidation.isValid ? 'Club-based game is valid' : `Club validation failed: ${clubValidation.errors.join(', ')}`
        };
      }

      // Case 2: Team-based game (legacy)
      if (hasTeamData && !hasClubData) {
        const canProcess = this.canProcessWithTeamData(spiel);
        return {
          isCompatible: canProcess,
          fallbackAvailable: false,
          recommendedAction: canProcess ? 'proceed' : 'skip',
          details: canProcess ? 'Team-based game is valid (legacy mode)' : 'Invalid team data'
        };
      }

      // Case 3: Both club and team data (migration scenario)
      if (hasClubData && hasTeamData) {
        const clubValidation = await this.validateClubData(spiel);
        const teamFallback = this.canProcessWithTeamData(spiel);
        
        return {
          isCompatible: clubValidation.isValid,
          fallbackAvailable: teamFallback,
          recommendedAction: clubValidation.isValid ? 'proceed' : teamFallback ? 'fallback' : 'skip',
          details: clubValidation.isValid ? 'Club data valid, team data available as fallback' : 
                   teamFallback ? 'Club data invalid, falling back to team data' : 'Both club and team data invalid'
        };
      }

      // Case 4: No valid data
      return {
        isCompatible: false,
        fallbackAvailable: false,
        recommendedAction: 'skip',
        details: 'No valid team or club data available'
      };

    } catch (error) {
      console.error(`[SpielLifecycle] Error checking workflow compatibility for game ${spiel.id}:`, error);
      return {
        isCompatible: false,
        fallbackAvailable: false,
        recommendedAction: 'skip',
        details: `Compatibility check error: ${error.message}`
      };
    }
  }
}

/**
 * Enhanced implementation of trigger condition logic
 * Determines when lifecycle events should trigger table calculations
 * Supports both team and club-based games
 */
export class EnhancedTriggerConditionImpl implements TriggerCondition {
  
  /**
   * Determines if a lifecycle event should trigger a table calculation
   * Enhanced to support both team and club-based games
   */
  shouldTriggerCalculation(event: LifecycleEvent): boolean {
    const newData = event.result;
    const oldData = event.state?.previousData;
    
    // For create/delete operations, check if game is completed
    if (!oldData) {
      return newData.status === SpielStatus.BEENDET && 
             newData.heim_tore !== undefined && 
             newData.gast_tore !== undefined;
    }

    // For updates, check if relevant fields changed
    const changedFields = this.getChangedFields(oldData, newData);
    return this.isRelevantChange(changedFields);
  }

  /**
   * Gets the list of fields that changed between old and new data
   * Enhanced to detect club field changes
   */
  getChangedFields(oldData: SpielEntity, newData: SpielEntity): string[] {
    const changedFields: string[] = [];
    
    // Check status change
    if (oldData.status !== newData.status) {
      changedFields.push('status');
    }
    
    // Check score changes
    if (oldData.heim_tore !== newData.heim_tore) {
      changedFields.push('heim_tore');
    }
    
    if (oldData.gast_tore !== newData.gast_tore) {
      changedFields.push('gast_tore');
    }
    
    // Check team changes (deprecated but maintained for backward compatibility)
    if (oldData.heim_team && newData.heim_team && oldData.heim_team.id !== newData.heim_team.id) {
      changedFields.push('heim_team');
    }
    
    if (oldData.gast_team && newData.gast_team && oldData.gast_team.id !== newData.gast_team.id) {
      changedFields.push('gast_team');
    }
    
    // Check club changes (new primary fields)
    if (oldData.heim_club && newData.heim_club && oldData.heim_club.id !== newData.heim_club.id) {
      changedFields.push('heim_club');
    }
    
    if (oldData.gast_club && newData.gast_club && oldData.gast_club.id !== newData.gast_club.id) {
      changedFields.push('gast_club');
    }
    
    // Detect transition from team-based to club-based or vice versa
    const oldHasClubData = oldData.heim_club && oldData.gast_club;
    const newHasClubData = newData.heim_club && newData.gast_club;
    const oldHasTeamData = oldData.heim_team && oldData.gast_team;
    const newHasTeamData = newData.heim_team && newData.gast_team;
    
    if (oldHasTeamData && !oldHasClubData && newHasClubData && !newHasTeamData) {
      changedFields.push('migration_team_to_club');
    }
    
    if (oldHasClubData && !oldHasTeamData && newHasTeamData && !newHasClubData) {
      changedFields.push('migration_club_to_team');
    }
    
    // Check league/season changes (very rare but possible)
    if (oldData.liga.id !== newData.liga.id) {
      changedFields.push('liga');
    }
    
    if (oldData.saison.id !== newData.saison.id) {
      changedFields.push('saison');
    }
    
    return changedFields;
  }

  /**
   * Determines if the changed fields are relevant for table calculation
   * Enhanced to include club fields
   */
  isRelevantChange(changedFields: string[]): boolean {
    const relevantFields = [
      'status',
      'heim_tore', 
      'gast_tore',
      // Team fields (deprecated but still relevant)
      'heim_team',
      'gast_team',
      // Club fields (new primary fields)
      'heim_club',
      'gast_club',
      // Migration fields
      'migration_team_to_club',
      'migration_club_to_team',
      // League/season changes
      'liga',
      'saison'
    ];
    
    return changedFields.some(field => relevantFields.includes(field));
  }

  /**
   * Validates club-specific trigger conditions
   * @param spiel - The game data to validate
   * @returns Validation result for club triggers
   */
  validateClubTriggerConditions(spiel: SpielEntity): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if this is a club-based game
    const hasClubData = spiel.heim_club && spiel.gast_club;
    if (!hasClubData) {
      // Not a club-based game, no club-specific validation needed
      return { isValid: true, errors: [] };
    }

    // Validate that both clubs are provided
    if (!spiel.heim_club || !spiel.gast_club) {
      errors.push('Both home and away clubs must be specified for club-based games');
    }

    // Validate that clubs are different
    if (spiel.heim_club && spiel.gast_club && spiel.heim_club.id === spiel.gast_club.id) {
      errors.push('A club cannot play against itself');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Determines the priority for calculation based on the type of change
   * @param changedFields - Array of changed field names
   * @returns Priority level for the calculation
   */
  getCalculationPriority(changedFields: string[]): Priority {
    // High priority for critical changes
    if (changedFields.includes('liga') || changedFields.includes('saison')) {
      return Priority.HIGH;
    }

    // High priority for migration between team and club systems
    if (changedFields.includes('migration_team_to_club') || changedFields.includes('migration_club_to_team')) {
      return Priority.HIGH;
    }

    // Normal priority for score and status changes
    if (changedFields.includes('heim_tore') || changedFields.includes('gast_tore') || changedFields.includes('status')) {
      return Priority.NORMAL;
    }

    // Normal priority for team/club changes
    if (changedFields.some(field => ['heim_team', 'gast_team', 'heim_club', 'gast_club'].includes(field))) {
      return Priority.NORMAL;
    }

    return Priority.LOW;
  }
}

// Default hook configuration - enhanced for club support
export const DEFAULT_HOOK_CONFIG: HookConfiguration = {
  enabled: DEFAULT_AUTOMATION_CONFIG.features.automaticCalculation,
  priority: DEFAULT_AUTOMATION_CONFIG.queue.priority.gameResult,
  timeout: DEFAULT_AUTOMATION_CONFIG.calculation.timeout,
  retries: DEFAULT_AUTOMATION_CONFIG.queue.maxRetries,
  async: true,
  conditions: [
    {
      field: 'status',
      operator: 'changed',
      value: SpielStatus.BEENDET
    },
    {
      field: 'heim_tore',
      operator: 'changed'
    },
    {
      field: 'gast_tore',
      operator: 'changed'
    },
    // Team fields (deprecated but maintained for backward compatibility)
    {
      field: 'heim_team',
      operator: 'changed'
    },
    {
      field: 'gast_team',
      operator: 'changed'
    },
    // Club fields (new primary fields)
    {
      field: 'heim_club',
      operator: 'changed'
    },
    {
      field: 'gast_club',
      operator: 'changed'
    }
  ]
};

// Export the lifecycle implementation for Strapi
const spielLifecycle = new SpielLifecycleImpl();

export default {
  async afterCreate(event: LifecycleEvent) {
    await spielLifecycle.afterCreate(event);
  },
  
  async afterUpdate(event: LifecycleEvent) {
    await spielLifecycle.afterUpdate(event);
  },
  
  async afterDelete(event: LifecycleEvent) {
    await spielLifecycle.afterDelete(event);
  }
};