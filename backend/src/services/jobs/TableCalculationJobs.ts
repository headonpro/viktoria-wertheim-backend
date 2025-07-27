/**
 * Table Calculation Jobs
 * 
 * Implements async table position calculations, league-wide statistics calculations,
 * and table ranking update jobs for background processing.
 * 
 * Supports Requirements 5.4 (async processing) and 3.3 (background jobs).
 */

import { AsyncCalculation, CalculationContext } from '../CalculationService';
import { BackgroundJobQueue, getBackgroundJobQueue } from '../BackgroundJobQueue';
import { JobScheduler } from '../JobScheduler';
import { TableCalculations } from '../calculations/TableCalculations';

/**
 * Table calculation job types
 */
type TableJobType = 
  | 'table-position-update'
  | 'league-statistics-update'
  | 'table-ranking-recalculation'
  | 'league-batch-update'
  | 'table-validation-check';

/**
 * Table job data interface
 */
interface TableJobData {
  ligaId: number;
  teamId?: number;
  entryId?: number;
  batchSize?: number;
  forceUpdate?: boolean;
  validationOnly?: boolean;
}

/**
 * Table job result interface
 */
interface TableJobResult {
  success: boolean;
  jobType: TableJobType;
  ligaId: number;
  teamId?: number;
  processed: number;
  updated: number;
  errors: string[];
  warnings: string[];
  executionTime: number;
  result?: any;
}

/**
 * League statistics result
 */
interface LeagueStatisticsResult {
  ligaId: number;
  totalTeams: number;
  totalGames: number;
  totalGoals: number;
  averageGoalsPerGame: number;
  topScorer: { teamId: number; goals: number } | null;
  pointsLeader: { teamId: number; points: number } | null;
  lastUpdated: Date;
}

/**
 * Table Calculation Jobs Class
 */
export class TableCalculationJobs {
  private strapi: any;
  private jobQueue: BackgroundJobQueue;
  private jobScheduler: JobScheduler;
  private tableCalculations: TableCalculations;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.jobQueue = getBackgroundJobQueue(strapi);
    this.jobScheduler = new JobScheduler(strapi, this.jobQueue);
    this.tableCalculations = new TableCalculations(strapi);
    
    this.logInfo('TableCalculationJobs initialized');
  }

  /**
   * Get all table calculation jobs
   */
  getTableCalculationJobs(): AsyncCalculation[] {
    return [
      {
        name: 'table-position-calculation',
        calculator: async (data: TableJobData, context?: CalculationContext) => 
          await this.calculateTablePositionJob(data, context),
        priority: 'high',
        dependencies: ['punkte', 'tordifferenz', 'tore_fuer', 'liga', 'team'],
        enabled: true,
        timeout: 10000, // 10 seconds
        retryAttempts: 2,
        fallbackValue: 999
      },
      {
        name: 'league-statistics-calculation',
        calculator: async (data: TableJobData, context?: CalculationContext) => 
          await this.calculateLeagueStatisticsJob(data, context),
        priority: 'medium',
        dependencies: ['liga'],
        enabled: true,
        timeout: 15000, // 15 seconds
        retryAttempts: 1
      },
      {
        name: 'table-ranking-update',
        calculator: async (data: TableJobData, context?: CalculationContext) => 
          await this.updateTableRankingJob(data, context),
        priority: 'high',
        dependencies: ['liga'],
        enabled: true,
        timeout: 20000, // 20 seconds
        retryAttempts: 2
      },
      {
        name: 'league-batch-calculation',
        calculator: async (data: TableJobData, context?: CalculationContext) => 
          await this.batchUpdateLeagueJob(data, context),
        priority: 'medium',
        dependencies: ['liga'],
        enabled: true,
        timeout: 60000, // 60 seconds for batch operations
        retryAttempts: 1
      }
    ];
  }

  /**
   * Schedule table position calculation for a specific team
   */
  async scheduleTablePositionCalculation(
    ligaId: number,
    teamId: number,
    priority: 'high' | 'medium' | 'low' = 'high',
    delay: number = 0
  ): Promise<string> {
    const jobData: TableJobData = {
      ligaId,
      teamId
    };

    const context: CalculationContext = {
      contentType: 'tabellen-eintrag',
      operation: 'update',
      operationId: `position-calc-${ligaId}-${teamId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + delay);

    const jobId = this.jobScheduler.scheduleOnce(
      `table-position-${ligaId}-${teamId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority,
        data: jobData,
        context,
        calculation: this.getTableCalculationJobs().find(job => job.name === 'table-position-calculation')
      }
    );

    this.logInfo('Table position calculation scheduled', {
      jobId,
      ligaId,
      teamId,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule league statistics update
   */
  async scheduleLeagueStatisticsUpdate(
    ligaId: number,
    priority: 'high' | 'medium' | 'low' = 'medium',
    delay: number = 1000 // 1 second delay to allow other calculations to complete
  ): Promise<string> {
    const jobData: TableJobData = {
      ligaId
    };

    const context: CalculationContext = {
      contentType: 'tabellen-eintrag',
      operation: 'update',
      operationId: `league-stats-${ligaId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + delay);

    const jobId = this.jobScheduler.scheduleOnce(
      `league-statistics-${ligaId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority,
        data: jobData,
        context,
        calculation: this.getTableCalculationJobs().find(job => job.name === 'league-statistics-calculation')
      }
    );

    this.logInfo('League statistics update scheduled', {
      jobId,
      ligaId,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule table ranking update for entire league
   */
  async scheduleTableRankingUpdate(
    ligaId: number,
    priority: 'high' | 'medium' | 'low' = 'high',
    delay: number = 500 // 0.5 second delay
  ): Promise<string> {
    const jobData: TableJobData = {
      ligaId,
      forceUpdate: true
    };

    const context: CalculationContext = {
      contentType: 'tabellen-eintrag',
      operation: 'update',
      operationId: `ranking-update-${ligaId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + delay);

    const jobId = this.jobScheduler.scheduleOnce(
      `table-ranking-${ligaId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority,
        data: jobData,
        context,
        calculation: this.getTableCalculationJobs().find(job => job.name === 'table-ranking-update')
      }
    );

    this.logInfo('Table ranking update scheduled', {
      jobId,
      ligaId,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule batch update for entire league
   */
  async scheduleBatchLeagueUpdate(
    ligaId: number,
    batchSize: number = 10,
    priority: 'high' | 'medium' | 'low' = 'medium',
    delay: number = 2000 // 2 second delay for batch operations
  ): Promise<string> {
    const jobData: TableJobData = {
      ligaId,
      batchSize,
      forceUpdate: true
    };

    const context: CalculationContext = {
      contentType: 'tabellen-eintrag',
      operation: 'update',
      operationId: `batch-update-${ligaId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + delay);

    const jobId = this.jobScheduler.scheduleOnce(
      `batch-league-${ligaId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority,
        data: jobData,
        context,
        calculation: this.getTableCalculationJobs().find(job => job.name === 'league-batch-calculation')
      }
    );

    this.logInfo('Batch league update scheduled', {
      jobId,
      ligaId,
      batchSize,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule recurring league statistics updates
   */
  async scheduleRecurringLeagueUpdates(
    ligaId: number,
    intervalMinutes: number = 30,
    maxRuns?: number
  ): Promise<string> {
    const jobData: TableJobData = {
      ligaId
    };

    const context: CalculationContext = {
      contentType: 'tabellen-eintrag',
      operation: 'update',
      operationId: `recurring-stats-${ligaId}`,
      userId: 'system',
      timestamp: new Date()
    };

    const startAt = new Date(Date.now() + 60000); // Start in 1 minute
    const intervalMs = intervalMinutes * 60 * 1000;

    const jobId = this.jobScheduler.scheduleRecurring(
      `recurring-league-stats-${ligaId}`,
      startAt,
      intervalMs,
      {
        type: 'calculation',
        priority: 'low',
        data: jobData,
        context,
        calculation: this.getTableCalculationJobs().find(job => job.name === 'league-statistics-calculation'),
        maxRuns
      }
    );

    this.logInfo('Recurring league statistics scheduled', {
      jobId,
      ligaId,
      intervalMinutes,
      maxRuns,
      startAt
    });

    return jobId;
  }

  /**
   * Execute table position calculation job
   */
  private async calculateTablePositionJob(
    data: TableJobData,
    context?: CalculationContext
  ): Promise<TableJobResult> {
    const startTime = Date.now();
    const result: TableJobResult = {
      success: false,
      jobType: 'table-position-update',
      ligaId: data.ligaId,
      teamId: data.teamId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      if (!data.teamId) {
        throw new Error('Team ID is required for position calculation');
      }

      this.logInfo('Starting table position calculation', {
        ligaId: data.ligaId,
        teamId: data.teamId,
        context: context?.operationId
      });

      // Calculate new position
      const positionResult = await this.tableCalculations.calculateTablePosition(
        data.ligaId,
        data.teamId
      );

      if (!positionResult.success) {
        throw new Error(positionResult.error || 'Position calculation failed');
      }

      // Update the table entry with new position
      const entries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { 
          liga: { id: data.ligaId },
          team: { id: data.teamId }
        }
      });

      if (entries.length === 0) {
        throw new Error(`No table entry found for team ${data.teamId} in league ${data.ligaId}`);
      }

      const entry = entries[0];
      result.processed = 1;

      // Only update if position changed
      if (entry.platz !== positionResult.value) {
        await this.strapi.entityService.update(
          'api::tabellen-eintrag.tabellen-eintrag',
          entry.id,
          {
            data: { platz: positionResult.value }
          }
        );
        result.updated = 1;
        
        this.logInfo('Table position updated', {
          entryId: entry.id,
          teamId: data.teamId,
          oldPosition: entry.platz,
          newPosition: positionResult.value
        });
      } else {
        this.logDebug('Table position unchanged', {
          entryId: entry.id,
          teamId: data.teamId,
          position: positionResult.value
        });
      }

      result.success = true;
      result.result = {
        position: positionResult.value,
        previousPosition: positionResult.previousPosition,
        positionChange: positionResult.positionChange
      };

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Table position calculation job failed', {
        ligaId: data.ligaId,
        teamId: data.teamId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute league statistics calculation job
   */
  private async calculateLeagueStatisticsJob(
    data: TableJobData,
    context?: CalculationContext
  ): Promise<TableJobResult> {
    const startTime = Date.now();
    const result: TableJobResult = {
      success: false,
      jobType: 'league-statistics-update',
      ligaId: data.ligaId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      this.logInfo('Starting league statistics calculation', {
        ligaId: data.ligaId,
        context: context?.operationId
      });

      // Get all table entries for the league
      const entries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { liga: { id: data.ligaId } },
        populate: { team: { fields: ['id'] } }
      });

      result.processed = entries.length;

      if (entries.length === 0) {
        result.warnings.push('No table entries found for league');
        result.success = true;
        return result;
      }

      // Calculate comprehensive league statistics
      const [goalStats, pointsStats, tableStats] = await Promise.all([
        this.tableCalculations.calculateGoalStatistics(data.ligaId),
        this.tableCalculations.calculatePointsDistribution(data.ligaId),
        this.tableCalculations.getLeagueTableStatistics(data.ligaId)
      ]);

      const leagueStats: LeagueStatisticsResult = {
        ligaId: data.ligaId,
        totalTeams: entries.length,
        totalGames: goalStats.totalGames,
        totalGoals: goalStats.totalGoals,
        averageGoalsPerGame: goalStats.averageGoalsPerGame,
        topScorer: goalStats.highestScoringTeam,
        pointsLeader: pointsStats.pointsLeader,
        lastUpdated: new Date()
      };

      // Store statistics (could be in a separate statistics table or cache)
      // For now, we'll log the results and mark as successful
      this.logInfo('League statistics calculated', {
        ligaId: data.ligaId,
        stats: leagueStats
      });

      result.success = true;
      result.updated = 1; // Statistics updated
      result.result = leagueStats;

    } catch (error) {
      result.errors.push(error.message);
      this.logError('League statistics calculation job failed', {
        ligaId: data.ligaId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute table ranking update job
   */
  private async updateTableRankingJob(
    data: TableJobData,
    context?: CalculationContext
  ): Promise<TableJobResult> {
    const startTime = Date.now();
    const result: TableJobResult = {
      success: false,
      jobType: 'table-ranking-recalculation',
      ligaId: data.ligaId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      this.logInfo('Starting table ranking update', {
        ligaId: data.ligaId,
        context: context?.operationId
      });

      // Get all table entries for the league
      const entries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { liga: { id: data.ligaId } },
        populate: { team: { fields: ['id'] } },
        fields: ['id', 'punkte', 'tordifferenz', 'tore_fuer', 'platz']
      });

      result.processed = entries.length;

      if (entries.length === 0) {
        result.warnings.push('No table entries found for league');
        result.success = true;
        return result;
      }

      // Calculate all positions at once for efficiency
      const allPositions = await this.tableCalculations.calculateAllPositions(data.ligaId);

      // Prepare batch updates
      const updates: Array<{ id: number; newPosition: number; oldPosition: number }> = [];

      for (const entry of entries) {
        const teamId = entry.team?.id;
        if (!teamId) continue;

        const newPosition = allPositions.get(teamId);
        if (newPosition && newPosition !== entry.platz) {
          updates.push({
            id: entry.id,
            newPosition,
            oldPosition: entry.platz
          });
        }
      }

      // Execute updates in batches
      const batchSize = 10;
      const updateBatches = this.createBatches(updates, batchSize);

      for (const updateBatch of updateBatches) {
        try {
          await Promise.all(updateBatch.map(async (update) => {
            try {
              await this.strapi.entityService.update(
                'api::tabellen-eintrag.tabellen-eintrag',
                update.id,
                {
                  data: { platz: update.newPosition }
                }
              );
              result.updated++;
              
              this.logDebug('Position updated', {
                entryId: update.id,
                oldPosition: update.oldPosition,
                newPosition: update.newPosition
              });
            } catch (error) {
              result.errors.push(`Failed to update entry ${update.id}: ${error.message}`);
            }
          }));

          // Small delay between batches
          if (updateBatches.indexOf(updateBatch) < updateBatches.length - 1) {
            await this.delay(100);
          }
        } catch (error) {
          result.errors.push(`Batch update failed: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;
      
      this.logInfo('Table ranking update completed', {
        ligaId: data.ligaId,
        processed: result.processed,
        updated: result.updated,
        errors: result.errors.length
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Table ranking update job failed', {
        ligaId: data.ligaId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute batch league update job
   */
  private async batchUpdateLeagueJob(
    data: TableJobData,
    context?: CalculationContext
  ): Promise<TableJobResult> {
    const startTime = Date.now();
    const result: TableJobResult = {
      success: false,
      jobType: 'league-batch-update',
      ligaId: data.ligaId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      this.logInfo('Starting batch league update', {
        ligaId: data.ligaId,
        batchSize: data.batchSize,
        context: context?.operationId
      });

      const batchSize = data.batchSize || 10;
      
      // Use the optimized batch update from TableCalculations
      const batchResult = await this.tableCalculations.batchUpdateLeagueCalculations(
        data.ligaId,
        batchSize
      );

      result.processed = batchResult.processed;
      result.updated = batchResult.updated;
      result.errors = batchResult.errors;
      result.success = batchResult.success;

      if (batchResult.errors.length > 0) {
        result.warnings.push(`${batchResult.errors.length} errors occurred during batch update`);
      }

      this.logInfo('Batch league update completed', {
        ligaId: data.ligaId,
        processed: result.processed,
        updated: result.updated,
        errors: result.errors.length,
        executionTime: batchResult.executionTime
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Batch league update job failed', {
        ligaId: data.ligaId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Get job status for table calculations
   */
  getTableJobStatus(jobId: string) {
    return this.jobQueue.getJobStatus(jobId);
  }

  /**
   * Cancel a table calculation job
   */
  cancelTableJob(jobId: string): boolean {
    return this.jobQueue.cancelJob(jobId) || this.jobScheduler.cancelScheduledJob(jobId);
  }

  /**
   * Get all table calculation jobs with filtering
   */
  getTableJobs(filter?: {
    ligaId?: number;
    status?: string;
    type?: string;
    limit?: number;
  }) {
    const jobs = this.jobQueue.getJobs({
      type: 'calculation',
      limit: filter?.limit
    });

    // Filter by table-related jobs
    return jobs.filter(job => 
      job.name.includes('table-') || 
      job.name.includes('league-') ||
      job.name.includes('ranking-')
    );
  }

  /**
   * Start the job scheduler
   */
  start(): void {
    this.jobQueue.start();
    this.jobScheduler.start();
    this.logInfo('Table calculation jobs system started');
  }

  /**
   * Stop the job scheduler
   */
  async stop(): Promise<void> {
    this.jobScheduler.stop();
    await this.jobQueue.stop();
    this.logInfo('Table calculation jobs system stopped');
  }

  /**
   * Utility method to create batches
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[TableCalculationJobs] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[TableCalculationJobs] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[TableCalculationJobs] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[TableCalculationJobs] ${message}`, error);
  }
}

export default TableCalculationJobs;
export type {
  TableJobType,
  TableJobData,
  TableJobResult,
  LeagueStatisticsResult
};