/**
 * Season Calculation Jobs
 * 
 * Implements season-wide statistics calculations, season summary generation jobs,
 * and season transition processing jobs for background processing.
 * 
 * Supports Requirements 5.4 (async processing) and 3.3 (background jobs).
 */

import { AsyncCalculation, CalculationContext } from '../CalculationService';
import { BackgroundJobQueue, getBackgroundJobQueue } from '../BackgroundJobQueue';
import { JobScheduler } from '../JobScheduler';

/**
 * Season calculation job types
 */
type SeasonJobType = 
  | 'season-statistics-calculation'
  | 'season-summary-generation'
  | 'season-transition-processing'
  | 'season-league-aggregation'
  | 'season-team-aggregation'
  | 'season-performance-analysis'
  | 'season-comparison-analysis'
  | 'season-archive-processing';

/**
 * Season job data interface
 */
interface SeasonJobData {
  saisonId: number;
  includeTeams?: boolean;
  includeLeagues?: boolean;
  includeStatistics?: boolean;
  includeSummary?: boolean;
  transitionToSaisonId?: number;
  archiveData?: boolean;
  batchSize?: number;
  forceUpdate?: boolean;
  comparisonSaisonIds?: number[];
}

/**
 * Season job result interface
 */
interface SeasonJobResult {
  success: boolean;
  jobType: SeasonJobType;
  saisonId: number;
  processed: number;
  updated: number;
  errors: string[];
  warnings: string[];
  executionTime: number;
  result?: any;
}

/**
 * Season statistics interface
 */
interface SeasonStatistics {
  saisonId: number;
  saisonName: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  totalTeams: number;
  totalLeagues: number;
  totalGames: number;
  totalGoals: number;
  averageGoalsPerGame: number;
  topScoringTeam: { teamId: number; teamName: string; goals: number } | null;
  championTeam: { teamId: number; teamName: string; points: number } | null;
  leagueStatistics: Array<{
    ligaId: number;
    ligaName: string;
    teamCount: number;
    totalGames: number;
    totalGoals: number;
    champion: { teamId: number; teamName: string; points: number } | null;
  }>;
  lastUpdated: Date;
}

/**
 * Season summary interface
 */
interface SeasonSummary {
  saisonId: number;
  saisonName: string;
  period: { start: string; end: string };
  status: 'active' | 'completed' | 'upcoming';
  overview: {
    totalTeams: number;
    totalLeagues: number;
    totalMatches: number;
    totalGoals: number;
  };
  champions: Array<{
    ligaId: number;
    ligaName: string;
    championTeam: { teamId: number; teamName: string; points: number };
  }>;
  topPerformers: {
    topScorer: { teamId: number; teamName: string; goals: number } | null;
    bestDefense: { teamId: number; teamName: string; goalsAgainst: number } | null;
    mostWins: { teamId: number; teamName: string; wins: number } | null;
  };
  statistics: {
    averageGoalsPerGame: number;
    averagePointsPerTeam: number;
    competitiveness: number; // 0-100 score
  };
  generatedAt: Date;
}

/**
 * Season transition result interface
 */
interface SeasonTransitionResult {
  fromSaisonId: number;
  toSaisonId: number;
  transitionType: 'activation' | 'deactivation' | 'archive';
  teamsTransitioned: number;
  leaguesTransitioned: number;
  dataArchived: boolean;
  summaryGenerated: boolean;
  errors: string[];
  warnings: string[];
  completedAt: Date;
}

/**
 * Season comparison result interface
 */
interface SeasonComparisonResult {
  baseSaisonId: number;
  comparedSaisonIds: number[];
  metrics: {
    [saisonId: number]: {
      statistics: SeasonStatistics;
      summary: SeasonSummary;
      performanceScore: number;
    };
  };
  comparisons: {
    teamGrowth: { [saisonId: number]: number };
    goalTrends: { [saisonId: number]: number };
    competitivenessTrends: { [saisonId: number]: number };
  };
  insights: string[];
  lastUpdated: Date;
}

/**
 * Season Calculation Jobs Class
 */
export class SeasonCalculationJobs {
  private strapi: any;
  private jobQueue: BackgroundJobQueue;
  private jobScheduler: JobScheduler;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.jobQueue = getBackgroundJobQueue(strapi);
    this.jobScheduler = new JobScheduler(strapi, this.jobQueue);
    
    this.logInfo('SeasonCalculationJobs initialized');
  }

  /**
   * Get all season calculation jobs
   */
  getSeasonCalculationJobs(): AsyncCalculation[] {
    return [
      {
        name: 'season-statistics-calculation',
        calculator: async (data: SeasonJobData, context?: CalculationContext) => 
          await this.calculateSeasonStatisticsJob(data, context),
        priority: 'medium',
        dependencies: ['saison', 'teams', 'ligen'],
        enabled: true,
        timeout: 30000, // 30 seconds
        retryAttempts: 2
      },
      {
        name: 'season-summary-generation',
        calculator: async (data: SeasonJobData, context?: CalculationContext) => 
          await this.generateSeasonSummaryJob(data, context),
        priority: 'low',
        dependencies: ['saison'],
        enabled: true,
        timeout: 25000, // 25 seconds
        retryAttempts: 1
      },
      {
        name: 'season-transition-processing',
        calculator: async (data: SeasonJobData, context?: CalculationContext) => 
          await this.processSeasonTransitionJob(data, context),
        priority: 'high',
        dependencies: ['saison'],
        enabled: true,
        timeout: 45000, // 45 seconds
        retryAttempts: 2
      },
      {
        name: 'season-league-aggregation',
        calculator: async (data: SeasonJobData, context?: CalculationContext) => 
          await this.aggregateSeasonLeaguesJob(data, context),
        priority: 'medium',
        dependencies: ['saison', 'ligen'],
        enabled: true,
        timeout: 20000, // 20 seconds
        retryAttempts: 1
      },
      {
        name: 'season-team-aggregation',
        calculator: async (data: SeasonJobData, context?: CalculationContext) => 
          await this.aggregateSeasonTeamsJob(data, context),
        priority: 'medium',
        dependencies: ['saison', 'teams'],
        enabled: true,
        timeout: 25000, // 25 seconds
        retryAttempts: 1
      },
      {
        name: 'season-performance-analysis',
        calculator: async (data: SeasonJobData, context?: CalculationContext) => 
          await this.analyzeSeasonPerformanceJob(data, context),
        priority: 'low',
        dependencies: ['saison'],
        enabled: true,
        timeout: 35000, // 35 seconds
        retryAttempts: 1
      },
      {
        name: 'season-comparison-analysis',
        calculator: async (data: SeasonJobData, context?: CalculationContext) => 
          await this.analyzeSeasonComparisonJob(data, context),
        priority: 'low',
        dependencies: ['saison'],
        enabled: true,
        timeout: 40000, // 40 seconds
        retryAttempts: 1
      },
      {
        name: 'season-archive-processing',
        calculator: async (data: SeasonJobData, context?: CalculationContext) => 
          await this.processSeasonArchiveJob(data, context),
        priority: 'low',
        dependencies: ['saison'],
        enabled: true,
        timeout: 60000, // 60 seconds
        retryAttempts: 1
      }
    ];
  }

  /**
   * Schedule season statistics calculation
   */
  async scheduleSeasonStatisticsCalculation(
    saisonId: number,
    options: {
      includeTeams?: boolean;
      includeLeagues?: boolean;
      priority?: 'high' | 'medium' | 'low';
      delay?: number;
    } = {}
  ): Promise<string> {
    const jobData: SeasonJobData = {
      saisonId,
      includeTeams: options.includeTeams ?? true,
      includeLeagues: options.includeLeagues ?? true,
      includeStatistics: true
    };

    const context: CalculationContext = {
      contentType: 'saison',
      operation: 'update',
      operationId: `season-stats-${saisonId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + (options.delay || 1000));

    const jobId = this.jobScheduler.scheduleOnce(
      `season-statistics-${saisonId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority: options.priority || 'medium',
        data: jobData,
        context,
        calculation: this.getSeasonCalculationJobs().find(job => job.name === 'season-statistics-calculation')
      }
    );

    this.logInfo('Season statistics calculation scheduled', {
      jobId,
      saisonId,
      options,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule season summary generation
   */
  async scheduleSeasonSummaryGeneration(
    saisonId: number,
    options: {
      priority?: 'high' | 'medium' | 'low';
      delay?: number;
    } = {}
  ): Promise<string> {
    const jobData: SeasonJobData = {
      saisonId,
      includeSummary: true,
      includeStatistics: true,
      includeTeams: true,
      includeLeagues: true
    };

    const context: CalculationContext = {
      contentType: 'saison',
      operation: 'update',
      operationId: `season-summary-${saisonId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + (options.delay || 2000));

    const jobId = this.jobScheduler.scheduleOnce(
      `season-summary-${saisonId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority: options.priority || 'low',
        data: jobData,
        context,
        calculation: this.getSeasonCalculationJobs().find(job => job.name === 'season-summary-generation')
      }
    );

    this.logInfo('Season summary generation scheduled', {
      jobId,
      saisonId,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule season transition processing
   */
  async scheduleSeasonTransition(
    fromSaisonId: number,
    toSaisonId: number,
    options: {
      archiveData?: boolean;
      priority?: 'high' | 'medium' | 'low';
      delay?: number;
    } = {}
  ): Promise<string> {
    const jobData: SeasonJobData = {
      saisonId: fromSaisonId,
      transitionToSaisonId: toSaisonId,
      archiveData: options.archiveData ?? true,
      includeTeams: true,
      includeLeagues: true
    };

    const context: CalculationContext = {
      contentType: 'saison',
      operation: 'update',
      operationId: `season-transition-${fromSaisonId}-${toSaisonId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + (options.delay || 5000)); // 5 second delay for transitions

    const jobId = this.jobScheduler.scheduleOnce(
      `season-transition-${fromSaisonId}-${toSaisonId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority: options.priority || 'high',
        data: jobData,
        context,
        calculation: this.getSeasonCalculationJobs().find(job => job.name === 'season-transition-processing')
      }
    );

    this.logInfo('Season transition scheduled', {
      jobId,
      fromSaisonId,
      toSaisonId,
      options,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule season comparison analysis
   */
  async scheduleSeasonComparison(
    baseSaisonId: number,
    comparisonSaisonIds: number[],
    options: {
      priority?: 'high' | 'medium' | 'low';
      delay?: number;
    } = {}
  ): Promise<string> {
    const jobData: SeasonJobData = {
      saisonId: baseSaisonId,
      comparisonSaisonIds,
      includeStatistics: true,
      includeTeams: true,
      includeLeagues: true
    };

    const context: CalculationContext = {
      contentType: 'saison',
      operation: 'update',
      operationId: `season-comparison-${baseSaisonId}-${Date.now()}`,
      userId: 'system',
      timestamp: new Date()
    };

    const scheduledAt = new Date(Date.now() + (options.delay || 3000));

    const jobId = this.jobScheduler.scheduleOnce(
      `season-comparison-${baseSaisonId}`,
      scheduledAt,
      {
        type: 'calculation',
        priority: options.priority || 'low',
        data: jobData,
        context,
        calculation: this.getSeasonCalculationJobs().find(job => job.name === 'season-comparison-analysis')
      }
    );

    this.logInfo('Season comparison analysis scheduled', {
      jobId,
      baseSaisonId,
      comparisonSaisonIds,
      scheduledAt
    });

    return jobId;
  }

  /**
   * Schedule recurring season updates
   */
  async scheduleRecurringSeasonUpdates(
    saisonId: number,
    intervalHours: number = 24,
    maxRuns?: number
  ): Promise<string> {
    const jobData: SeasonJobData = {
      saisonId,
      includeStatistics: true,
      includeTeams: true,
      includeLeagues: true
    };

    const context: CalculationContext = {
      contentType: 'saison',
      operation: 'update',
      operationId: `recurring-season-${saisonId}`,
      userId: 'system',
      timestamp: new Date()
    };

    const startAt = new Date(Date.now() + 300000); // Start in 5 minutes
    const intervalMs = intervalHours * 60 * 60 * 1000;

    const jobId = this.jobScheduler.scheduleRecurring(
      `recurring-season-stats-${saisonId}`,
      startAt,
      intervalMs,
      {
        type: 'calculation',
        priority: 'low',
        data: jobData,
        context,
        calculation: this.getSeasonCalculationJobs().find(job => job.name === 'season-statistics-calculation'),
        maxRuns
      }
    );

    this.logInfo('Recurring season statistics scheduled', {
      jobId,
      saisonId,
      intervalHours,
      maxRuns,
      startAt
    });

    return jobId;
  }

  /**
   * Execute season statistics calculation job
   */
  private async calculateSeasonStatisticsJob(
    data: SeasonJobData,
    context?: CalculationContext
  ): Promise<SeasonJobResult> {
    const startTime = Date.now();
    const result: SeasonJobResult = {
      success: false,
      jobType: 'season-statistics-calculation',
      saisonId: data.saisonId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      this.logInfo('Starting season statistics calculation', {
        saisonId: data.saisonId,
        context: context?.operationId
      });

      // Get season data
      const saison = await this.strapi.entityService.findOne('api::saison.saison', data.saisonId, {
        populate: {
          teams: {
            populate: {
              tabellen_eintraege: true
            }
          },
          ligen: {
            populate: {
              tabellen_eintraege: {
                populate: {
                  team: true
                }
              }
            }
          }
        }
      });

      if (!saison) {
        throw new Error(`Season with ID ${data.saisonId} not found`);
      }

      result.processed = 1;

      // Calculate comprehensive season statistics
      const statistics = await this.calculateSeasonStatistics(saison);
      
      result.success = true;
      result.updated = 1;
      result.result = statistics;

      this.logInfo('Season statistics calculation completed', {
        saisonId: data.saisonId,
        totalTeams: statistics.totalTeams,
        totalLeagues: statistics.totalLeagues,
        totalGoals: statistics.totalGoals
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Season statistics calculation job failed', {
        saisonId: data.saisonId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute season summary generation job
   */
  private async generateSeasonSummaryJob(
    data: SeasonJobData,
    context?: CalculationContext
  ): Promise<SeasonJobResult> {
    const startTime = Date.now();
    const result: SeasonJobResult = {
      success: false,
      jobType: 'season-summary-generation',
      saisonId: data.saisonId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      this.logInfo('Starting season summary generation', {
        saisonId: data.saisonId,
        context: context?.operationId
      });

      // Get season data with full population
      const saison = await this.strapi.entityService.findOne('api::saison.saison', data.saisonId, {
        populate: {
          teams: {
            populate: {
              tabellen_eintraege: {
                populate: {
                  liga: true
                }
              }
            }
          },
          ligen: {
            populate: {
              tabellen_eintraege: {
                populate: {
                  team: true
                }
              }
            }
          }
        }
      });

      if (!saison) {
        throw new Error(`Season with ID ${data.saisonId} not found`);
      }

      result.processed = 1;

      // Generate comprehensive season summary
      const summary = await this.generateSeasonSummary(saison);
      
      result.success = true;
      result.updated = 1;
      result.result = summary;

      this.logInfo('Season summary generation completed', {
        saisonId: data.saisonId,
        status: summary.status,
        totalTeams: summary.overview.totalTeams,
        champions: summary.champions.length
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Season summary generation job failed', {
        saisonId: data.saisonId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute season transition processing job
   */
  private async processSeasonTransitionJob(
    data: SeasonJobData,
    context?: CalculationContext
  ): Promise<SeasonJobResult> {
    const startTime = Date.now();
    const result: SeasonJobResult = {
      success: false,
      jobType: 'season-transition-processing',
      saisonId: data.saisonId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      if (!data.transitionToSaisonId) {
        throw new Error('Transition target season ID is required');
      }

      this.logInfo('Starting season transition processing', {
        fromSaisonId: data.saisonId,
        toSaisonId: data.transitionToSaisonId,
        context: context?.operationId
      });

      // Process the season transition
      const transitionResult = await this.processSeasonTransition(
        data.saisonId,
        data.transitionToSaisonId,
        {
          archiveData: data.archiveData ?? true,
          includeTeams: data.includeTeams ?? true,
          includeLeagues: data.includeLeagues ?? true
        }
      );

      result.processed = transitionResult.teamsTransitioned + transitionResult.leaguesTransitioned;
      result.updated = result.processed;
      result.success = transitionResult.errors.length === 0;
      result.errors = transitionResult.errors;
      result.warnings = transitionResult.warnings;
      result.result = transitionResult;

      this.logInfo('Season transition processing completed', {
        fromSaisonId: data.saisonId,
        toSaisonId: data.transitionToSaisonId,
        teamsTransitioned: transitionResult.teamsTransitioned,
        leaguesTransitioned: transitionResult.leaguesTransitioned,
        success: result.success
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Season transition processing job failed', {
        fromSaisonId: data.saisonId,
        toSaisonId: data.transitionToSaisonId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute season league aggregation job
   */
  private async aggregateSeasonLeaguesJob(
    data: SeasonJobData,
    context?: CalculationContext
  ): Promise<SeasonJobResult> {
    const startTime = Date.now();
    const result: SeasonJobResult = {
      success: false,
      jobType: 'season-league-aggregation',
      saisonId: data.saisonId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      this.logInfo('Starting season league aggregation', {
        saisonId: data.saisonId,
        context: context?.operationId
      });

      // Get all leagues for the season
      const leagues = await this.strapi.entityService.findMany('api::liga.liga', {
        filters: { saison: { id: data.saisonId } },
        populate: {
          tabellen_eintraege: {
            populate: {
              team: true
            }
          }
        }
      });

      result.processed = leagues.length;

      if (leagues.length === 0) {
        result.warnings.push('No leagues found for season');
        result.success = true;
        return result;
      }

      // Aggregate statistics for each league
      const leagueAggregations = [];
      
      for (const league of leagues) {
        try {
          const aggregation = await this.aggregateLeagueStatistics(league);
          leagueAggregations.push(aggregation);
          result.updated++;
        } catch (error) {
          result.errors.push(`League ${league.id}: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;
      result.result = {
        saisonId: data.saisonId,
        leagueAggregations,
        totalLeagues: leagues.length,
        processedLeagues: result.updated
      };

      this.logInfo('Season league aggregation completed', {
        saisonId: data.saisonId,
        totalLeagues: leagues.length,
        processedLeagues: result.updated,
        errors: result.errors.length
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Season league aggregation job failed', {
        saisonId: data.saisonId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute season team aggregation job
   */
  private async aggregateSeasonTeamsJob(
    data: SeasonJobData,
    context?: CalculationContext
  ): Promise<SeasonJobResult> {
    const startTime = Date.now();
    const result: SeasonJobResult = {
      success: false,
      jobType: 'season-team-aggregation',
      saisonId: data.saisonId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      this.logInfo('Starting season team aggregation', {
        saisonId: data.saisonId,
        context: context?.operationId
      });

      // Get all teams for the season
      const teams = await this.strapi.entityService.findMany('api::team.team', {
        filters: { saison: { id: data.saisonId } },
        populate: {
          tabellen_eintraege: {
            populate: {
              liga: true
            }
          }
        }
      });

      result.processed = teams.length;

      if (teams.length === 0) {
        result.warnings.push('No teams found for season');
        result.success = true;
        return result;
      }

      // Aggregate statistics for each team
      const teamAggregations = [];
      
      for (const team of teams) {
        try {
          const aggregation = await this.aggregateTeamStatistics(team);
          teamAggregations.push(aggregation);
          result.updated++;
        } catch (error) {
          result.errors.push(`Team ${team.id}: ${error.message}`);
        }
      }

      result.success = result.errors.length === 0;
      result.result = {
        saisonId: data.saisonId,
        teamAggregations,
        totalTeams: teams.length,
        processedTeams: result.updated
      };

      this.logInfo('Season team aggregation completed', {
        saisonId: data.saisonId,
        totalTeams: teams.length,
        processedTeams: result.updated,
        errors: result.errors.length
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Season team aggregation job failed', {
        saisonId: data.saisonId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute season performance analysis job
   */
  private async analyzeSeasonPerformanceJob(
    data: SeasonJobData,
    context?: CalculationContext
  ): Promise<SeasonJobResult> {
    const startTime = Date.now();
    const result: SeasonJobResult = {
      success: false,
      jobType: 'season-performance-analysis',
      saisonId: data.saisonId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      this.logInfo('Starting season performance analysis', {
        saisonId: data.saisonId,
        context: context?.operationId
      });

      // Get season data for analysis
      const saison = await this.strapi.entityService.findOne('api::saison.saison', data.saisonId, {
        populate: {
          teams: {
            populate: {
              tabellen_eintraege: {
                populate: {
                  liga: true
                }
              }
            }
          },
          ligen: {
            populate: {
              tabellen_eintraege: {
                populate: {
                  team: true
                }
              }
            }
          }
        }
      });

      if (!saison) {
        throw new Error(`Season with ID ${data.saisonId} not found`);
      }

      result.processed = 1;

      // Perform comprehensive performance analysis
      const performanceAnalysis = await this.analyzeSeasonPerformance(saison);
      
      result.success = true;
      result.updated = 1;
      result.result = performanceAnalysis;

      this.logInfo('Season performance analysis completed', {
        saisonId: data.saisonId,
        competitiveness: performanceAnalysis.competitiveness,
        insights: performanceAnalysis.insights.length
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Season performance analysis job failed', {
        saisonId: data.saisonId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute season comparison analysis job
   */
  private async analyzeSeasonComparisonJob(
    data: SeasonJobData,
    context?: CalculationContext
  ): Promise<SeasonJobResult> {
    const startTime = Date.now();
    const result: SeasonJobResult = {
      success: false,
      jobType: 'season-comparison-analysis',
      saisonId: data.saisonId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      if (!data.comparisonSaisonIds || data.comparisonSaisonIds.length === 0) {
        throw new Error('Comparison season IDs are required for season comparison');
      }

      this.logInfo('Starting season comparison analysis', {
        baseSaisonId: data.saisonId,
        comparisonSaisonIds: data.comparisonSaisonIds,
        context: context?.operationId
      });

      const allSaisonIds = [data.saisonId, ...data.comparisonSaisonIds];
      const comparisonResult: SeasonComparisonResult = {
        baseSaisonId: data.saisonId,
        comparedSaisonIds: data.comparisonSaisonIds,
        metrics: {},
        comparisons: {
          teamGrowth: {},
          goalTrends: {},
          competitivenessTrends: {}
        },
        insights: [],
        lastUpdated: new Date()
      };

      // Calculate metrics for all seasons
      for (const saisonId of allSaisonIds) {
        try {
          const saison = await this.strapi.entityService.findOne('api::saison.saison', saisonId, {
            populate: {
              teams: {
                populate: {
                  tabellen_eintraege: true
                }
              },
              ligen: {
                populate: {
                  tabellen_eintraege: {
                    populate: {
                      team: true
                    }
                  }
                }
              }
            }
          });

          if (!saison) {
            result.warnings.push(`Season ${saisonId} not found`);
            continue;
          }

          const statistics = await this.calculateSeasonStatistics(saison);
          const summary = await this.generateSeasonSummary(saison);
          const performanceScore = this.calculateSeasonPerformanceScore(statistics, summary);

          comparisonResult.metrics[saisonId] = {
            statistics,
            summary,
            performanceScore
          };

          result.processed++;
        } catch (error) {
          result.errors.push(`Season ${saisonId}: ${error.message}`);
        }
      }

      // Generate comparisons and insights
      if (Object.keys(comparisonResult.metrics).length > 1) {
        comparisonResult.comparisons = this.generateSeasonComparisons(comparisonResult.metrics);
        comparisonResult.insights = this.generateSeasonInsights(comparisonResult.metrics, comparisonResult.comparisons);
      }

      result.success = true;
      result.updated = 1;
      result.result = comparisonResult;

      this.logInfo('Season comparison analysis completed', {
        baseSaisonId: data.saisonId,
        comparedSeasons: data.comparisonSaisonIds.length,
        processed: result.processed,
        insights: comparisonResult.insights.length
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Season comparison analysis job failed', {
        baseSaisonId: data.saisonId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Execute season archive processing job
   */
  private async processSeasonArchiveJob(
    data: SeasonJobData,
    context?: CalculationContext
  ): Promise<SeasonJobResult> {
    const startTime = Date.now();
    const result: SeasonJobResult = {
      success: false,
      jobType: 'season-archive-processing',
      saisonId: data.saisonId,
      processed: 0,
      updated: 0,
      errors: [],
      warnings: [],
      executionTime: 0
    };

    try {
      this.logInfo('Starting season archive processing', {
        saisonId: data.saisonId,
        context: context?.operationId
      });

      // Get season data for archiving
      const saison = await this.strapi.entityService.findOne('api::saison.saison', data.saisonId, {
        populate: {
          teams: {
            populate: {
              tabellen_eintraege: true
            }
          },
          ligen: {
            populate: {
              tabellen_eintraege: {
                populate: {
                  team: true
                }
              }
            }
          }
        }
      });

      if (!saison) {
        throw new Error(`Season with ID ${data.saisonId} not found`);
      }

      result.processed = 1;

      // Process season archiving
      const archiveResult = await this.archiveSeasonData(saison);
      
      result.success = archiveResult.success;
      result.updated = archiveResult.archivedItems;
      result.errors = archiveResult.errors;
      result.warnings = archiveResult.warnings;
      result.result = archiveResult;

      this.logInfo('Season archive processing completed', {
        saisonId: data.saisonId,
        archivedItems: archiveResult.archivedItems,
        success: result.success
      });

    } catch (error) {
      result.errors.push(error.message);
      this.logError('Season archive processing job failed', {
        saisonId: data.saisonId,
        error: error.message
      });
    } finally {
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Calculate comprehensive season statistics
   */
  private async calculateSeasonStatistics(saison: any): Promise<SeasonStatistics> {
    const statistics: SeasonStatistics = {
      saisonId: saison.id,
      saisonName: saison.name,
      startDate: saison.start_datum,
      endDate: saison.end_datum,
      isActive: saison.aktiv,
      totalTeams: 0,
      totalLeagues: 0,
      totalGames: 0,
      totalGoals: 0,
      averageGoalsPerGame: 0,
      topScoringTeam: null,
      championTeam: null,
      leagueStatistics: [],
      lastUpdated: new Date()
    };

    // Count teams and leagues
    statistics.totalTeams = saison.teams ? saison.teams.length : 0;
    statistics.totalLeagues = saison.ligen ? saison.ligen.length : 0;

    let maxGoals = 0;
    let maxPoints = 0;
    let topScoringTeamData = null;
    let championTeamData = null;

    // Process league statistics
    if (saison.ligen && Array.isArray(saison.ligen)) {
      for (const liga of saison.ligen) {
        const leagueStats = {
          ligaId: liga.id,
          ligaName: liga.name,
          teamCount: 0,
          totalGames: 0,
          totalGoals: 0,
          champion: null as any
        };

        let leagueMaxPoints = 0;
        let leagueChampion = null;

        if (liga.tabellen_eintraege && Array.isArray(liga.tabellen_eintraege)) {
          leagueStats.teamCount = liga.tabellen_eintraege.length;

          for (const entry of liga.tabellen_eintraege) {
            const games = this.safeNumber(entry.spiele);
            const goals = this.safeNumber(entry.tore_fuer);
            const points = this.safeNumber(entry.punkte);

            leagueStats.totalGames += games;
            leagueStats.totalGoals += goals;
            statistics.totalGames += games;
            statistics.totalGoals += goals;

            // Track top scoring team
            if (goals > maxGoals) {
              maxGoals = goals;
              topScoringTeamData = {
                teamId: entry.team?.id,
                teamName: entry.team?.name,
                goals
              };
            }

            // Track league champion
            if (points > leagueMaxPoints) {
              leagueMaxPoints = points;
              leagueChampion = {
                teamId: entry.team?.id,
                teamName: entry.team?.name,
                points
              };
            }

            // Track overall champion
            if (points > maxPoints) {
              maxPoints = points;
              championTeamData = {
                teamId: entry.team?.id,
                teamName: entry.team?.name,
                points
              };
            }
          }
        }

        leagueStats.champion = leagueChampion;
        statistics.leagueStatistics.push(leagueStats);
      }
    }

    statistics.topScoringTeam = topScoringTeamData;
    statistics.championTeam = championTeamData;
    statistics.averageGoalsPerGame = statistics.totalGames > 0 ? statistics.totalGoals / statistics.totalGames : 0;

    return statistics;
  }

  /**
   * Generate comprehensive season summary
   */
  private async generateSeasonSummary(saison: any): Promise<SeasonSummary> {
    const statistics = await this.calculateSeasonStatistics(saison);
    
    // Determine season status
    let status: 'active' | 'completed' | 'upcoming' = 'completed';
    if (saison.aktiv) {
      status = 'active';
    } else if (saison.start_datum && new Date(saison.start_datum) > new Date()) {
      status = 'upcoming';
    }

    // Find best defense team
    let bestDefenseTeam = null;
    let minGoalsAgainst = Number.MAX_SAFE_INTEGER;
    let mostWinsTeam = null;
    let maxWins = 0;

    if (saison.ligen && Array.isArray(saison.ligen)) {
      for (const liga of saison.ligen) {
        if (liga.tabellen_eintraege && Array.isArray(liga.tabellen_eintraege)) {
          for (const entry of liga.tabellen_eintraege) {
            const goalsAgainst = this.safeNumber(entry.tore_gegen);
            const wins = this.safeNumber(entry.siege);

            if (goalsAgainst < minGoalsAgainst && goalsAgainst > 0) {
              minGoalsAgainst = goalsAgainst;
              bestDefenseTeam = {
                teamId: entry.team?.id,
                teamName: entry.team?.name,
                goalsAgainst
              };
            }

            if (wins > maxWins) {
              maxWins = wins;
              mostWinsTeam = {
                teamId: entry.team?.id,
                teamName: entry.team?.name,
                wins
              };
            }
          }
        }
      }
    }

    // Calculate competitiveness score
    const competitiveness = this.calculateCompetitiveness(statistics);

    const summary: SeasonSummary = {
      saisonId: saison.id,
      saisonName: saison.name,
      period: {
        start: saison.start_datum,
        end: saison.end_datum
      },
      status,
      overview: {
        totalTeams: statistics.totalTeams,
        totalLeagues: statistics.totalLeagues,
        totalMatches: statistics.totalGames,
        totalGoals: statistics.totalGoals
      },
      champions: statistics.leagueStatistics
        .filter(league => league.champion)
        .map(league => ({
          ligaId: league.ligaId,
          ligaName: league.ligaName,
          championTeam: league.champion
        })),
      topPerformers: {
        topScorer: statistics.topScoringTeam,
        bestDefense: bestDefenseTeam,
        mostWins: mostWinsTeam
      },
      statistics: {
        averageGoalsPerGame: statistics.averageGoalsPerGame,
        averagePointsPerTeam: statistics.totalTeams > 0 ? 
          statistics.leagueStatistics.reduce((sum, league) => {
            return sum + (league.champion?.points || 0);
          }, 0) / statistics.totalTeams : 0,
        competitiveness
      },
      generatedAt: new Date()
    };

    return summary;
  }

  /**
   * Process season transition
   */
  private async processSeasonTransition(
    fromSaisonId: number,
    toSaisonId: number,
    options: {
      archiveData: boolean;
      includeTeams: boolean;
      includeLeagues: boolean;
    }
  ): Promise<SeasonTransitionResult> {
    const result: SeasonTransitionResult = {
      fromSaisonId,
      toSaisonId,
      transitionType: 'activation',
      teamsTransitioned: 0,
      leaguesTransitioned: 0,
      dataArchived: false,
      summaryGenerated: false,
      errors: [],
      warnings: [],
      completedAt: new Date()
    };

    try {
      // Archive data from old season if requested
      if (options.archiveData) {
        try {
          const fromSaison = await this.strapi.entityService.findOne('api::saison.saison', fromSaisonId, {
            populate: {
              teams: { populate: { tabellen_eintraege: true } },
              ligen: { populate: { tabellen_eintraege: true } }
            }
          });

          if (fromSaison) {
            const archiveResult = await this.archiveSeasonData(fromSaison);
            result.dataArchived = archiveResult.success;
            if (!archiveResult.success) {
              result.warnings.push(...archiveResult.errors);
            }
          }
        } catch (error) {
          result.warnings.push(`Archive failed: ${error.message}`);
        }
      }

      // Generate summary for old season
      try {
        const fromSaison = await this.strapi.entityService.findOne('api::saison.saison', fromSaisonId, {
          populate: {
            teams: { populate: { tabellen_eintraege: true } },
            ligen: { populate: { tabellen_eintraege: true } }
          }
        });

        if (fromSaison) {
          await this.generateSeasonSummary(fromSaison);
          result.summaryGenerated = true;
        }
      } catch (error) {
        result.warnings.push(`Summary generation failed: ${error.message}`);
      }

      // Transition teams if requested
      if (options.includeTeams) {
        try {
          const teams = await this.strapi.entityService.findMany('api::team.team', {
            filters: { saison: { id: fromSaisonId } }
          });

          for (const team of teams) {
            try {
              await this.strapi.entityService.update('api::team.team', team.id, {
                data: { saison: toSaisonId }
              });
              result.teamsTransitioned++;
            } catch (error) {
              result.errors.push(`Failed to transition team ${team.id}: ${error.message}`);
            }
          }
        } catch (error) {
          result.errors.push(`Team transition failed: ${error.message}`);
        }
      }

      // Transition leagues if requested
      if (options.includeLeagues) {
        try {
          const leagues = await this.strapi.entityService.findMany('api::liga.liga', {
            filters: { saison: { id: fromSaisonId } }
          });

          for (const league of leagues) {
            try {
              await this.strapi.entityService.update('api::liga.liga', league.id, {
                data: { saison: toSaisonId }
              });
              result.leaguesTransitioned++;
            } catch (error) {
              result.errors.push(`Failed to transition league ${league.id}: ${error.message}`);
            }
          }
        } catch (error) {
          result.errors.push(`League transition failed: ${error.message}`);
        }
      }

    } catch (error) {
      result.errors.push(`Season transition failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Archive season data
   */
  private async archiveSeasonData(saison: any): Promise<{
    success: boolean;
    archivedItems: number;
    errors: string[];
    warnings: string[];
  }> {
    // This is a placeholder implementation
    // In a real scenario, you would implement actual archiving logic
    
    return {
      success: true,
      archivedItems: 1,
      errors: [],
      warnings: ['Archive functionality not fully implemented']
    };
  }

  /**
   * Aggregate league statistics
   */
  private async aggregateLeagueStatistics(league: any): Promise<any> {
    const aggregation = {
      ligaId: league.id,
      ligaName: league.name,
      totalTeams: 0,
      totalGames: 0,
      totalGoals: 0,
      averageGoalsPerGame: 0,
      champion: null,
      lastUpdated: new Date()
    };

    if (league.tabellen_eintraege && Array.isArray(league.tabellen_eintraege)) {
      aggregation.totalTeams = league.tabellen_eintraege.length;
      
      let maxPoints = 0;
      let champion = null;

      for (const entry of league.tabellen_eintraege) {
        const games = this.safeNumber(entry.spiele);
        const goals = this.safeNumber(entry.tore_fuer);
        const points = this.safeNumber(entry.punkte);

        aggregation.totalGames += games;
        aggregation.totalGoals += goals;

        if (points > maxPoints) {
          maxPoints = points;
          champion = {
            teamId: entry.team?.id,
            teamName: entry.team?.name,
            points
          };
        }
      }

      aggregation.champion = champion;
      aggregation.averageGoalsPerGame = aggregation.totalGames > 0 ? 
        aggregation.totalGoals / aggregation.totalGames : 0;
    }

    return aggregation;
  }

  /**
   * Aggregate team statistics
   */
  private async aggregateTeamStatistics(team: any): Promise<any> {
    const aggregation = {
      teamId: team.id,
      teamName: team.name,
      totalGames: 0,
      totalGoals: 0,
      totalPoints: 0,
      averageGoalsPerGame: 0,
      averagePointsPerGame: 0,
      bestLeaguePosition: null,
      lastUpdated: new Date()
    };

    if (team.tabellen_eintraege && Array.isArray(team.tabellen_eintraege)) {
      let bestPosition = Number.MAX_SAFE_INTEGER;
      let bestLeague = null;

      for (const entry of team.tabellen_eintraege) {
        const games = this.safeNumber(entry.spiele);
        const goals = this.safeNumber(entry.tore_fuer);
        const points = this.safeNumber(entry.punkte);
        const position = this.safeNumber(entry.platz);

        aggregation.totalGames += games;
        aggregation.totalGoals += goals;
        aggregation.totalPoints += points;

        if (position > 0 && position < bestPosition) {
          bestPosition = position;
          bestLeague = {
            ligaId: entry.liga?.id,
            ligaName: entry.liga?.name,
            position
          };
        }
      }

      aggregation.bestLeaguePosition = bestLeague;
      aggregation.averageGoalsPerGame = aggregation.totalGames > 0 ? 
        aggregation.totalGoals / aggregation.totalGames : 0;
      aggregation.averagePointsPerGame = aggregation.totalGames > 0 ? 
        aggregation.totalPoints / aggregation.totalGames : 0;
    }

    return aggregation;
  }

  /**
   * Analyze season performance
   */
  private async analyzeSeasonPerformance(saison: any): Promise<any> {
    const statistics = await this.calculateSeasonStatistics(saison);
    const competitiveness = this.calculateCompetitiveness(statistics);
    
    const insights = [];
    
    if (statistics.averageGoalsPerGame > 2.5) {
      insights.push('High-scoring season with exciting matches');
    } else if (statistics.averageGoalsPerGame < 1.5) {
      insights.push('Defensive season with low-scoring matches');
    }
    
    if (competitiveness > 80) {
      insights.push('Highly competitive season with close standings');
    } else if (competitiveness < 40) {
      insights.push('Season dominated by few strong teams');
    }

    return {
      saisonId: saison.id,
      competitiveness,
      insights,
      statistics,
      performanceScore: this.calculateSeasonPerformanceScore(statistics, null),
      lastUpdated: new Date()
    };
  }

  /**
   * Generate season comparisons
   */
  private generateSeasonComparisons(metrics: any): any {
    const comparisons = {
      teamGrowth: {} as any,
      goalTrends: {} as any,
      competitivenessTrends: {} as any
    };

    for (const [saisonId, metric] of Object.entries(metrics)) {
      const m = metric as any;
      comparisons.teamGrowth[saisonId] = m.statistics.totalTeams;
      comparisons.goalTrends[saisonId] = m.statistics.averageGoalsPerGame;
      comparisons.competitivenessTrends[saisonId] = m.summary.statistics.competitiveness;
    }

    return comparisons;
  }

  /**
   * Generate season insights
   */
  private generateSeasonInsights(metrics: any, comparisons: any): string[] {
    const insights = [];
    
    const teamCounts = Object.values(comparisons.teamGrowth) as number[];
    const goalAverages = Object.values(comparisons.goalTrends) as number[];
    
    if (teamCounts.length > 1) {
      const maxTeams = Math.max(...teamCounts);
      const minTeams = Math.min(...teamCounts);
      if (maxTeams > minTeams) {
        insights.push(`Team participation varied from ${minTeams} to ${maxTeams} teams across seasons`);
      }
    }
    
    if (goalAverages.length > 1) {
      const maxGoals = Math.max(...goalAverages);
      const minGoals = Math.min(...goalAverages);
      if (maxGoals - minGoals > 0.5) {
        insights.push(`Goal scoring varied significantly across seasons (${minGoals.toFixed(1)} to ${maxGoals.toFixed(1)} per game)`);
      }
    }

    return insights;
  }

  /**
   * Calculate competitiveness score
   */
  private calculateCompetitiveness(statistics: SeasonStatistics): number {
    // Simple competitiveness calculation based on point distribution
    // In a real scenario, this would be more sophisticated
    
    let competitiveness = 50; // Base score
    
    if (statistics.totalTeams > 10) {
      competitiveness += 20; // More teams = more competitive
    }
    
    if (statistics.averageGoalsPerGame > 2) {
      competitiveness += 15; // More goals = more exciting
    }
    
    return Math.min(100, Math.max(0, competitiveness));
  }

  /**
   * Calculate season performance score
   */
  private calculateSeasonPerformanceScore(statistics: SeasonStatistics, summary: SeasonSummary | null): number {
    let score = 0;
    
    // Team participation (25%)
    score += Math.min(25, (statistics.totalTeams / 20) * 25);
    
    // Goal scoring (25%)
    score += Math.min(25, (statistics.averageGoalsPerGame / 3) * 25);
    
    // League diversity (25%)
    score += Math.min(25, (statistics.totalLeagues / 5) * 25);
    
    // Competitiveness (25%)
    if (summary) {
      score += (summary.statistics.competitiveness / 100) * 25;
    } else {
      score += 12.5; // Default half score
    }
    
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * Helper methods
   */
  private safeNumber(value: any): number {
    const num = parseInt(String(value));
    return isNaN(num) ? 0 : num;
  }

  /**
   * Job management methods
   */
  getSeasonJobStatus(jobId: string) {
    return this.jobQueue.getJobStatus(jobId);
  }

  cancelSeasonJob(jobId: string): boolean {
    return this.jobQueue.cancelJob(jobId) || this.jobScheduler.cancelScheduledJob(jobId);
  }

  getSeasonJobs(filter?: {
    saisonId?: number;
    status?: string;
    type?: string;
    limit?: number;
  }) {
    const jobs = this.jobQueue.getJobs({
      type: 'calculation',
      limit: filter?.limit
    });

    return jobs.filter(job => 
      job.name.includes('season-') && 
      (!filter?.saisonId || job.data?.saisonId === filter.saisonId)
    );
  }

  start(): void {
    this.jobQueue.start();
    this.jobScheduler.start();
    this.logInfo('Season calculation jobs system started');
  }

  async stop(): Promise<void> {
    this.jobScheduler.stop();
    await this.jobQueue.stop();
    this.logInfo('Season calculation jobs system stopped');
  }

  /**
   * Logging methods
   */
  private logDebug(message: string, data?: any): void {
    this.strapi?.log?.debug(`[SeasonCalculationJobs] ${message}`, data);
  }

  private logInfo(message: string, data?: any): void {
    this.strapi?.log?.info(`[SeasonCalculationJobs] ${message}`, data);
  }

  private logWarn(message: string, data?: any): void {
    this.strapi?.log?.warn(`[SeasonCalculationJobs] ${message}`, data);
  }

  private logError(message: string, error?: any): void {
    this.strapi?.log?.error(`[SeasonCalculationJobs] ${message}`, error);
  }
}

export default SeasonCalculationJobs;
export type {
  SeasonJobType,
  SeasonJobData,
  SeasonJobResult,
  SeasonStatistics,
  SeasonSummary,
  SeasonTransitionResult,
  SeasonComparisonResult
};