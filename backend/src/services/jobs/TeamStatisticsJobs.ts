/**
 * Team Statistics Jobs
 * 
 * Implements team performance calculation jobs, team form calculation background processing,
 * and team ranking update jobs for background processing.
 * 
 * Supports Requirements 5.4 (async processing) and 3.1 (performance optimization).
 */

import { AsyncCalculation, CalculationContext } from '../CalculationService';
import { BackgroundJobQueue, getBackgroundJobQueue } from '../BackgroundJobQueue';
import { JobScheduler } from '../JobScheduler';
import { TeamStatistics, TeamRanking, TeamForm } from '../calculations/TeamCalculations';

/**
 * Team statistics job types
 */
type TeamJobType = 
  | 'team-performance-calculation'
  | 'team-form-calculation'
  | 'team-ranking-update'
  | 'team-statistics-update'
  | 'team-batch-update'
  | 'team-comparison-analysis';

/**
 * Team job data interface
 */
interface TeamJobData {
  teamId: number;
  ligaId?: number;
  saisonId?: number;
  includeForm?: boolean;
  includeRanking?: boolean;
  includeStatistics?: boolean;
  batchSize?: number;
  forceUpdate?: boolean;
  comparisonTeamIds?: number[];
}

/**
 * Team job result interface
 */
interface TeamJobResult {
  success: boolean;
  jobType: TeamJobType;
  teamId: number;
  ligaId?: number;
  processed: number;
  updated: number;
  errors: string[];
  warnings: string[];
  executionTime: number;
  result?: any;
}

/**
 * Team performance metrics
 */
interface TeamPerformanceMetrics {
  teamId: number;
  statistics: TeamStatistics;
  ranking?: TeamRanking;
  form?: TeamForm;
  performanceScore: number;
  strengthAreas: string[];
  improvementAreas: string[];
  lastUpdated: Date;
}

/**
 * Team comparison result
 */
interface TeamComparisonResult {
  baseTeam: number;
  comparedTeams: number[];
  metrics: {
    [teamId: number]: {
      statistics: TeamStatistics;
      ranking?: TeamRanking;
      performanceScore: number;
    };
  };
  rankings: {
    byPoints: number[];
    byGoalDifference: number[];
    byWinPercentage: number[];
  };
  lastUpdated: Date;
}

/**
 * Team Statistics Jobs Class
 */
export class TeamStatisticsJobs {
  private strapi: any;
  private jobQueue: BackgroundJobQueue;
  private jobScheduler: JobScheduler;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.jobQueue = getBackgroundJobQueue(strapi);
    this.jobScheduler = new JobScheduler(strapi, this.jobQueue);
    
    this.logInfo('TeamStatisticsJobs initialized');
  }

  /**
   * Get all team statistics calculation jobs
   */
  getTeamStatisticsJobs(): AsyncCalculation[] {
    return [
      {
        name: 'team-performance-calculation',
        calculator: async (data: TeamJobData, context?: CalculationContext) => 
          await this.calculateTeamPerformanceJob(data, context),
        priority: 'medium',
        dependencies: ['team', 'tabellen_eintraege'],
        enabled: true,
        timeout: 15000, // 15 seconds
        retryAttempts: 2
      },
      {
        name: 'team-form-calculation',
        calculator: async (data: TeamJobData, context?: CalculationContext) => 
          await this.calculateTeamFormJob(data, context),
        priority: 'low',
        dependencies: ['team', 'spiele'],
        enabled: true,
        timeout: 10000, // 10 seconds
        retryAttempts: 1
      },
      {
        name: 'team-ranking-update',
        calculator: async (data: TeamJobData, context?: CalculationContext) => 
          await this.updateTeamRankingJob(data, context),
        priority: 'high',
        dependencies: ['team', 'liga', 'saison'],
        enabled: true,
        timeout: 20000, // 20 seconds
        retryAttempts: 2
      },
      {
        name: 'team-statistics-update',
        calculator: async (data: TeamJobData, context?: CalculationContext) => 
          await this.updateTeamStatisticsJob(data, context),
        priority: 'medium',
        dependencies: ['team', 'tabellen_eintraege'],
        enabled: true,
        timeout: 12000, // 12 seconds
        retryAttempts: 1
      },
      {
        name: 'team-batch-update',
        calculator: async (data: TeamJobData, context?: CalculationContext) => 
          await this.batchUpdateTeamsJob(data, context),
        priority: 'low',
        dependencies: ['liga', 'saison'],
        enabled: true,
        timeout: 60000, // 60 seconds for batch operations
        retryAttempts: 1
      },
      {
        name: 'team-comparison-analysis',
        calculator: async (data: TeamJobData, context?: CalculationContext) => 
          await this.analyzeTeamComparisonJob(data, context),
        priority: 'low',
        dependencies: ['team'],
        enabled: true,
        timeout: 25000, // 25 seconds
        retryAttempts: 1
      }
    ];
  }

  /**
   * Schedule team performance calculation
   */
  async scheduleTeamPerformanceCalculation(
    teamId: number,
    options: {
      ligaId?: number;
      saisonId?: number;
      includeForm?: boolean;
      includeRanking?: boolean;
      priority?: 'high' | 'medium' | 'low';
      delay?: number;
    } = {}
  ): Promise<string> {
    const jobData: TeamJobData = {
      teamId,
      ligaId: options.ligaId,
      saisonId: options.saisonId,
      includeForm: options.includeForm ?? true,
      includeRanking: options.includeRanking ?? true,
      includeStatistics: true
    };

    const context: CalculationContext = {
      contentType: 'team',
      operation: 'update',
      operationId: `team-performance-${teamId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + (options.delay || 0));

    const jobId = this.jobScheduler.scheduleOnce(
      `team-performance-${teamId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority: options.priority || 'medium',
        data: jobData,
        context,
        calculation: this.getTeamStatisticsJobs().find(job => job.name === 'team-performance-calculation')
      }
    );

    this.logInfo('Team performance calculation scheduled', {
      jobId,
      teamId,
      options,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule team form calculation
   */
  async scheduleTeamFormCalculation(
    teamId: number,
    options: {
      priority?: 'high' | 'medium' | 'low';
      delay?: number;
    } = {}
  ): Promise<string> {
    const jobData: TeamJobData = {
      teamId,
      includeForm: true
    };

    const context: CalculationContext = {
      contentType: 'team',
      operation: 'update',
      operationId: `team-form-${teamId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + (options.delay || 1000)); // 1 second default delay

    const jobId = this.jobScheduler.scheduleOnce(
      `team-form-${teamId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority: options.priority || 'low',
        data: jobData,
        context,
        calculation: this.getTeamStatisticsJobs().find(job => job.name === 'team-form-calculation')
      }
    );

    this.logInfo('Team form calculation scheduled', {
      jobId,
      teamId,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule team ranking update
   */
  async scheduleTeamRankingUpdate(
    teamId: number,
    ligaId: number,
    saisonId: number,
    options: {
      priority?: 'high' | 'medium' | 'low';
      delay?: number;
    } = {}
  ): Promise<string> {
    const jobData: TeamJobData = {
      teamId,
      ligaId,
      saisonId,
      includeRanking: true
    };

    const context: CalculationContext = {
      contentType: 'team',
      operation: 'update',
      operationId: `team-ranking-${teamId}-${ligaId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + (options.delay || 500)); // 0.5 second default delay

    const jobId = this.jobScheduler.scheduleOnce(
      `team-ranking-${teamId}-${ligaId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority: options.priority || 'high',
        data: jobData,
        context,
        calculation: this.getTeamStatisticsJobs().find(job => job.name === 'team-ranking-update')
      }
    );

    this.logInfo('Team ranking update scheduled', {
      jobId,
      teamId,
      ligaId,
      saisonId,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule batch team updates for a league
   */
  async scheduleBatchTeamUpdates(
    ligaId: number,
    saisonId: number,
    options: {
      batchSize?: number;
      priority?: 'high' | 'medium' | 'low';
      delay?: number;
    } = {}
  ): Promise<string> {
    const jobData: TeamJobData = {
      teamId: 0, // Will be ignored for batch operations
      ligaId,
      saisonId,
      batchSize: options.batchSize || 10,
      forceUpdate: true,
      includeStatistics: true,
      includeRanking: true,
      includeForm: true
    };

    const context: CalculationContext = {
      contentType: 'team',
      operation: 'update',
      operationId: `batch-teams-${ligaId}-${saisonId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + (options.delay || 2000)); // 2 second default delay

    const jobId = this.jobScheduler.scheduleOnce(
      `batch-teams-${ligaId}-${saisonId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority: options.priority || 'low',
        data: jobData,
        context,
        calculation: this.getTeamStatisticsJobs().find(job => job.name === 'team-batch-update')
      }
    );

    this.logInfo('Batch team updates scheduled', {
      jobId,
      ligaId,
      saisonId,
      options,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule team comparison analysis
   */
  async scheduleTeamComparison(
    baseTeamId: number,
    comparisonTeamIds: number[],
    options: {
      priority?: 'high' | 'medium' | 'low';
      delay?: number;
    } = {}
  ): Promise<string> {
    const jobData: TeamJobData = {
      teamId: baseTeamId,
      comparisonTeamIds,
      includeStatistics: true,
      includeRanking: true
    };

    const context: CalculationContext = {
      contentType: 'team',
      operation: 'update',
      operationId: `team-comparison-${baseTeamId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + (options.delay || 1500)); // 1.5 second default delay

    const jobId = this.jobScheduler.scheduleOnce(
      `team-comparison-${baseTeamId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority: options.priority || 'low',
        data: jobData,
        context,
        calculation: this.getTeamStatisticsJobs().find(job => job.name === 'team-comparison-analysis')
      }
    );

    this.logInfo('Team comparison analysis scheduled', {
      jobId,
      baseTeamId,
      comparisonTeamIds,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule recurring team statistics updates
   */
  async scheduleRecurringTeamUpdates(
    ligaId: number,
    saisonId: number,
    intervalMinutes: number = 60,
    maxRuns?: number
  ): Promise<string> {
    const jobData: TeamJobData = {
      teamId: 0, // Will be ignored for batch operations
      ligaId,
      saisonId,
      includeStatistics: true,
      includeRanking: true
    };

    const context: CalculationContext = {
      contentType: 'team',
      operation: 'update',
      operationId: `recurring-teams-${ligaId}-${saisonId}`,
      userId: 'system',
      timestamp: new Date()
    };

    const startAt = new Date(Date.now() + 120000); // Start in 2 minutes
    const intervalMs = intervalMinutes * 60 * 1000;

    const jobId = this.jobScheduler.scheduleRecurring(
      `recurring-team-stats-${ligaId}-${saisonId}`,
      startAt,
      intervalMs,
      {
        type: 'calculation',
        priority: 'low',
        data: jobData,
        context,
        calculation: this.getTeamStatisticsJobs().find(job => job.name === 'team-batch-update'),
        maxRuns
      }
    );

    this.logInfo('Recurring team statistics scheduled', {
      jobId,
      ligaId,
      saisonId,
      intervalMinutes,
      maxRuns,
      startAt
    });

    return jobId;
  }

  /**
   * Execute team performance calculation job
   */
  private async calculateTeamPerformanceJob(
    data: TeamJobData,
    context?: CalculationContext
  ): Promise<TeamJobResult> {
    const startTime = Date.now();
    const result: TeamJobResult = {
      success: false,
      jobType: 'team-performance-calculation',
      teamId: data.teamId,
      ligaId: data.ligaId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      this.logInfo('Starting team performance calculation', {
        teamId: data.teamId,
        context: context?.operationId
      });

      // Get team data with related information
      const team = await this.strapi.entityService.findOne('api::team.team', data.teamId, {
        populate: {
          tabellen_eintraege: {
            populate: {
              liga: true,
              saison: true
            }
          },
          liga: true,
          saison: true
        }
      });

      if (!team) {
        throw new Error(`Team with ID ${data.teamId} not found`);
      }

      result.processed = 1;

      // Calculate team statistics
      const statistics = await this.calculateTeamStatistics(team);
      
      let ranking: TeamRanking | undefined;
      let form: TeamForm | undefined;

      // Calculate ranking if requested and data is available
      if (data.includeRanking && team.liga && team.saison) {
        try {
          ranking = await this.calculateTeamRanking(data.teamId, team.liga.id, team.saison.id);
        } catch (error) {
          result.warnings.push(`Ranking calculation failed: ${error.message}`);
        }
      }

      // Calculate form if requested
      if (data.includeForm) {
        try {
          form = await this.calculateTeamForm(data.teamId);
        } catch (error) {
          result.warnings.push(`Form calculation failed: ${error.message}`);
        }
      }

      // Calculate performance score
      const performanceScore = this.calculatePerformanceScore(statistics, ranking);

      // Analyze strengths and improvement areas
      const { strengthAreas, improvementAreas } = this.analyzeTeamPerformance(statistics, ranking);

      const performanceMetrics: TeamPerformanceMetrics = {
        teamId: data.teamId,
        statistics,
        ranking,
        form,
        performanceScore,
        strengthAreas,
        improvementAreas,
        lastUpdated: new Date()
      };

      result.success = true;
      result.updated = 1;
      result.result = performanceMetrics;

      this.logInfo('Team performance calculation completed', {
        teamId: data.teamId,
        performanceScore,
        hasRanking: !!ranking,
        hasForm: !!form
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Team performance calculation job failed', {
        teamId: data.teamId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute team form calculation job
   */
  private async calculateTeamFormJob(
    data: TeamJobData,
    context?: CalculationContext
  ): Promise<TeamJobResult> {
    const startTime = Date.now();
    const result: TeamJobResult = {
      success: false,
      jobType: 'team-form-calculation',
      teamId: data.teamId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      this.logInfo('Starting team form calculation', {
        teamId: data.teamId,
        context: context?.operationId
      });

      const form = await this.calculateTeamForm(data.teamId);
      
      result.processed = 1;
      result.updated = 1;
      result.success = true;
      result.result = form;

      this.logInfo('Team form calculation completed', {
        teamId: data.teamId,
        form: form.form,
        formPoints: form.formPoints
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Team form calculation job failed', {
        teamId: data.teamId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute team ranking update job
   */
  private async updateTeamRankingJob(
    data: TeamJobData,
    context?: CalculationContext
  ): Promise<TeamJobResult> {
    const startTime = Date.now();
    const result: TeamJobResult = {
      success: false,
      jobType: 'team-ranking-update',
      teamId: data.teamId,
      ligaId: data.ligaId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      if (!data.ligaId || !data.saisonId) {
        throw new Error('Liga ID and Saison ID are required for ranking update');
      }

      this.logInfo('Starting team ranking update', {
        teamId: data.teamId,
        ligaId: data.ligaId,
        saisonId: data.saisonId,
        context: context?.operationId
      });

      const ranking = await this.calculateTeamRanking(data.teamId, data.ligaId, data.saisonId);
      
      result.processed = 1;
      result.updated = 1;
      result.success = true;
      result.result = ranking;

      this.logInfo('Team ranking update completed', {
        teamId: data.teamId,
        position: ranking.position,
        totalTeams: ranking.totalTeams
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Team ranking update job failed', {
        teamId: data.teamId,
        ligaId: data.ligaId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute team statistics update job
   */
  private async updateTeamStatisticsJob(
    data: TeamJobData,
    context?: CalculationContext
  ): Promise<TeamJobResult> {
    const startTime = Date.now();
    const result: TeamJobResult = {
      success: false,
      jobType: 'team-statistics-update',
      teamId: data.teamId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      this.logInfo('Starting team statistics update', {
        teamId: data.teamId,
        context: context?.operationId
      });

      const team = await this.strapi.entityService.findOne('api::team.team', data.teamId, {
        populate: {
          tabellen_eintraege: {
            populate: {
              liga: true,
              saison: true
            }
          }
        }
      });

      if (!team) {
        throw new Error(`Team with ID ${data.teamId} not found`);
      }

      const statistics = await this.calculateTeamStatistics(team);
      
      result.processed = 1;
      result.updated = 1;
      result.success = true;
      result.result = statistics;

      this.logInfo('Team statistics update completed', {
        teamId: data.teamId,
        gamesPlayed: statistics.gamesPlayed,
        points: statistics.points
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Team statistics update job failed', {
        teamId: data.teamId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute batch team updates job
   */
  private async batchUpdateTeamsJob(
    data: TeamJobData,
    context?: CalculationContext
  ): Promise<TeamJobResult> {
    const startTime = Date.now();
    const result: TeamJobResult = {
      success: false,
      jobType: 'team-batch-update',
      teamId: 0,
      ligaId: data.ligaId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      if (!data.ligaId || !data.saisonId) {
        throw new Error('Liga ID and Saison ID are required for batch update');
      }

      this.logInfo('Starting batch team updates', {
        ligaId: data.ligaId,
        saisonId: data.saisonId,
        batchSize: data.batchSize,
        context: context?.operationId
      });

      // Get all teams in the league and season
      const teams = await this.strapi.entityService.findMany('api::team.team', {
        filters: {
          liga: { id: data.ligaId },
          saison: { id: data.saisonId }
        },
        populate: {
          tabellen_eintraege: true
        }
      });

      result.processed = teams.length;

      if (teams.length === 0) {
        result.warnings.push('No teams found for the specified league and season');
        result.success = true;
        return result;
      }

      // Process teams in batches
      const batchSize = data.batchSize || 10;
      const batches = this.createBatches(teams, batchSize);

      for (const batch of batches) {
        try {
          const batchPromises = batch.map(async (team: any) => {
            try {
              // Calculate statistics for each team
              const statistics = await this.calculateTeamStatistics(team);
              
              // Calculate ranking if requested
              let ranking: TeamRanking | undefined;
              if (data.includeRanking) {
                ranking = await this.calculateTeamRanking(team.id, data.ligaId!, data.saisonId!);
              }

              result.updated++;
              
              this.logDebug('Team updated in batch', {
                teamId: team.id,
                gamesPlayed: statistics.gamesPlayed,
                points: statistics.points,
                position: ranking?.position
              });

            } catch (error) {
              result.errors.push(`Team ${team.id}: ${error.message}`);
            }
          });

          await Promise.all(batchPromises);

          // Small delay between batches
          if (batches.indexOf(batch) < batches.length - 1) {
            await this.delay(200);
          }
        } catch (error) {
          result.errors.push(`Batch processing failed: ${error.message}`);
        }
      }

      result.success = result.errors.length < result.processed / 2; // Success if less than 50% errors

      this.logInfo('Batch team updates completed', {
        ligaId: data.ligaId,
        saisonId: data.saisonId,
        processed: result.processed,
        updated: result.updated,
        errors: result.errors.length
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Batch team updates job failed', {
        ligaId: data.ligaId,
        saisonId: data.saisonId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute team comparison analysis job
   */
  private async analyzeTeamComparisonJob(
    data: TeamJobData,
    context?: CalculationContext
  ): Promise<TeamJobResult> {
    const startTime = Date.now();
    const result: TeamJobResult = {
      success: false,
      jobType: 'team-comparison-analysis',
      teamId: data.teamId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      if (!data.comparisonTeamIds || data.comparisonTeamIds.length === 0) {
        throw new Error('Comparison team IDs are required for team comparison');
      }

      this.logInfo('Starting team comparison analysis', {
        baseTeamId: data.teamId,
        comparisonTeamIds: data.comparisonTeamIds,
        context: context?.operationId
      });

      const allTeamIds = [data.teamId, ...data.comparisonTeamIds];
      const comparisonResult: TeamComparisonResult = {
        baseTeam: data.teamId,
        comparedTeams: data.comparisonTeamIds,
        metrics: {},
        rankings: {
          byPoints: [],
          byGoalDifference: [],
          byWinPercentage: []
        },
        lastUpdated: new Date()
      };

      // Calculate metrics for all teams
      for (const teamId of allTeamIds) {
        try {
          const team = await this.strapi.entityService.findOne('api::team.team', teamId, {
            populate: {
              tabellen_eintraege: true,
              liga: true,
              saison: true
            }
          });

          if (!team) {
            result.warnings.push(`Team ${teamId} not found`);
            continue;
          }

          const statistics = await this.calculateTeamStatistics(team);
          let ranking: TeamRanking | undefined;

          if (team.liga && team.saison) {
            try {
              ranking = await this.calculateTeamRanking(teamId, team.liga.id, team.saison.id);
            } catch (error) {
              result.warnings.push(`Ranking calculation failed for team ${teamId}: ${error.message}`);
            }
          }

          const performanceScore = this.calculatePerformanceScore(statistics, ranking);

          comparisonResult.metrics[teamId] = {
            statistics,
            ranking,
            performanceScore
          };

          result.processed++;
        } catch (error) {
          result.errors.push(`Team ${teamId}: ${error.message}`);
        }
      }

      // Create rankings
      const teamsWithMetrics = Object.entries(comparisonResult.metrics);
      
      comparisonResult.rankings.byPoints = teamsWithMetrics
        .sort(([, a], [, b]) => b.statistics.points - a.statistics.points)
        .map(([teamId]) => parseInt(teamId));

      comparisonResult.rankings.byGoalDifference = teamsWithMetrics
        .sort(([, a], [, b]) => b.statistics.goalDifference - a.statistics.goalDifference)
        .map(([teamId]) => parseInt(teamId));

      comparisonResult.rankings.byWinPercentage = teamsWithMetrics
        .sort(([, a], [, b]) => b.statistics.winPercentage - a.statistics.winPercentage)
        .map(([teamId]) => parseInt(teamId));

      result.success = true;
      result.updated = 1;
      result.result = comparisonResult;

      this.logInfo('Team comparison analysis completed', {
        baseTeamId: data.teamId,
        comparedTeams: data.comparisonTeamIds.length,
        processed: result.processed
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Team comparison analysis job failed', {
        baseTeamId: data.teamId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Calculate team statistics from team data
   */
  private async calculateTeamStatistics(team: any): Promise<TeamStatistics> {
    const statistics: TeamStatistics = {
      gamesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      winPercentage: 0,
      averageGoalsFor: 0,
      averageGoalsAgainst: 0,
      form: '',
      formPoints: 0,
      lastUpdated: new Date()
    };

    if (team.tabellen_eintraege && Array.isArray(team.tabellen_eintraege)) {
      for (const entry of team.tabellen_eintraege) {
        statistics.gamesPlayed += this.safeNumber(entry.spiele);
        statistics.wins += this.safeNumber(entry.siege);
        statistics.draws += this.safeNumber(entry.unentschieden);
        statistics.losses += this.safeNumber(entry.niederlagen);
        statistics.goalsFor += this.safeNumber(entry.tore_fuer);
        statistics.goalsAgainst += this.safeNumber(entry.tore_gegen);
        statistics.points += this.safeNumber(entry.punkte);
      }
    }

    // Calculate derived statistics
    statistics.goalDifference = statistics.goalsFor - statistics.goalsAgainst;
    
    if (statistics.gamesPlayed > 0) {
      statistics.winPercentage = (statistics.wins / statistics.gamesPlayed) * 100;
      statistics.averageGoalsFor = statistics.goalsFor / statistics.gamesPlayed;
      statistics.averageGoalsAgainst = statistics.goalsAgainst / statistics.gamesPlayed;
    }

    return statistics;
  }

  /**
   * Calculate team ranking
   */
  private async calculateTeamRanking(teamId: number, ligaId: number, saisonId: number): Promise<TeamRanking> {
    // Get all teams in the same league and season
    const teams = await this.strapi.entityService.findMany('api::team.team', {
      filters: {
        liga: { id: ligaId },
        saison: { id: saisonId }
      },
      populate: {
        tabellen_eintraege: true
      }
    });

    // Calculate points and sort teams
    const teamRankings = teams.map((team: any) => {
      const totalPoints = this.calculateTotalPoints(team.tabellen_eintraege || []);
      const totalGoalDifference = this.calculateTotalGoalDifference(team.tabellen_eintraege || []);
      const totalGoalsFor = this.calculateTotalGoalsFor(team.tabellen_eintraege || []);
      
      return {
        id: team.id,
        points: totalPoints,
        goalDifference: totalGoalDifference,
        goalsFor: totalGoalsFor
      };
    }).sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor;
    });

    const teamIndex = teamRankings.findIndex(t => t.id === teamId);
    if (teamIndex === -1) {
      throw new Error(`Team ${teamId} not found in league ${ligaId}`);
    }

    const position = teamIndex + 1;
    const totalTeams = teamRankings.length;
    const currentTeam = teamRankings[teamIndex];
    
    const leader = teamRankings[0];
    const pointsGap = leader.points - currentTeam.points;
    
    const teamBelow = teamIndex < totalTeams - 1 ? teamRankings[teamIndex + 1] : null;
    const pointsAbove = teamBelow ? currentTeam.points - teamBelow.points : 0;

    return {
      position,
      totalTeams,
      pointsGap,
      pointsAbove,
      trend: 'stable', // Would need historical data for actual trend
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate team form (placeholder implementation)
   */
  private async calculateTeamForm(teamId: number): Promise<TeamForm> {
    // This is a placeholder implementation
    // In a real scenario, you would analyze recent match results
    
    return {
      form: 'WWDLW', // Placeholder
      formPoints: 10, // Placeholder
      recentGames: [], // Would be populated with actual game data
      trend: 'stable',
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate performance score based on statistics and ranking
   */
  private calculatePerformanceScore(statistics: TeamStatistics, ranking?: TeamRanking): number {
    let score = 0;
    
    // Points contribution (40%)
    score += (statistics.points / Math.max(statistics.gamesPlayed * 3, 1)) * 40;
    
    // Win percentage contribution (25%)
    score += (statistics.winPercentage / 100) * 25;
    
    // Goal difference contribution (20%)
    const maxGoalDiff = Math.max(Math.abs(statistics.goalDifference), 1);
    score += Math.max(0, (statistics.goalDifference / maxGoalDiff)) * 20;
    
    // Ranking contribution (15%)
    if (ranking) {
      const rankingScore = Math.max(0, (ranking.totalTeams - ranking.position + 1) / ranking.totalTeams);
      score += rankingScore * 15;
    }
    
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Analyze team performance to identify strengths and improvement areas
   */
  private analyzeTeamPerformance(statistics: TeamStatistics, ranking?: TeamRanking): {
    strengthAreas: string[];
    improvementAreas: string[];
  } {
    const strengthAreas: string[] = [];
    const improvementAreas: string[] = [];

    // Analyze win percentage
    if (statistics.winPercentage >= 60) {
      strengthAreas.push('High win rate');
    } else if (statistics.winPercentage <= 30) {
      improvementAreas.push('Low win rate');
    }

    // Analyze goal difference
    if (statistics.goalDifference > 5) {
      strengthAreas.push('Strong goal difference');
    } else if (statistics.goalDifference < -5) {
      improvementAreas.push('Poor goal difference');
    }

    // Analyze scoring
    if (statistics.averageGoalsFor >= 2) {
      strengthAreas.push('Good scoring rate');
    } else if (statistics.averageGoalsFor <= 1) {
      improvementAreas.push('Low scoring rate');
    }

    // Analyze defense
    if (statistics.averageGoalsAgainst <= 1) {
      strengthAreas.push('Strong defense');
    } else if (statistics.averageGoalsAgainst >= 2) {
      improvementAreas.push('Defensive issues');
    }

    // Analyze ranking
    if (ranking) {
      if (ranking.position <= ranking.totalTeams * 0.3) {
        strengthAreas.push('Top league position');
      } else if (ranking.position >= ranking.totalTeams * 0.7) {
        improvementAreas.push('Low league position');
      }
    }

    return { strengthAreas, improvementAreas };
  }

  /**
   * Helper methods
   */
  private calculateTotalPoints(entries: any[]): number {
    return entries.reduce((total, entry) => total + this.safeNumber(entry.punkte), 0);
  }

  private calculateTotalGoalDifference(entries: any[]): number {
    return entries.reduce((total, entry) => {
      const goalsFor = this.safeNumber(entry.tore_fuer);
      const goalsAgainst = this.safeNumber(entry.tore_gegen);
      return total + (goalsFor - goalsAgainst);
    }, 0);
  }

  private calculateTotalGoalsFor(entries: any[]): number {
    return entries.reduce((total, entry) => total + this.safeNumber(entry.tore_fuer), 0);
  }

  private safeNumber(value: any): number {
    const num = parseInt(String(value));
    return isNaN(num) ? 0 : num;
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Job management methods
   */
  getTeamJobStatus(jobId: string) {
    return this.jobQueue.getJobStatus(jobId);
  }

  cancelTeamJob(jobId: string): boolean {
    return this.jobQueue.cancelJob(jobId) || this.jobScheduler.cancelScheduledJob(jobId);
  }

  getTeamJobs(filter?: {
    teamId?: number;
    status?: string;
    type?: string;
    limit?: number;
  }) {
    const jobs = this.jobQueue.getJobs({
      type: 'calculation',
      limit: filter?.limit
    });

    return jobs.filter(job => 
      job.name.includes('team-') && 
      (!filter?.teamId || job.data?.teamId === filter.teamId)
    );
  }

  start(): void {
    this.jobQueue.start();
    this.jobScheduler.start();
    this.logInfo('Team statistics jobs system started');
  }

  async stop(): Promise<void> {
    this.jobScheduler.stop();
    await this.jobQueue.stop();
    this.logInfo('Team statistics jobs system stopped');
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[TeamStatisticsJobs] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[TeamStatisticsJobs] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[TeamStatisticsJobs] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[TeamStatisticsJobs] ${message}`, error);
  }
}

export default TeamStatisticsJobs;
export type {
  TeamJobType,
  TeamJobData,
  TeamJobResult,
  TeamPerformanceMetrics,
  TeamComparisonResult
};