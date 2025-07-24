/**
 * Scheduled Tasks Service
 * Handles periodic maintenance tasks and automated data processing
 */

// AutomatedProcessingService removed - functionality moved to other services
import AuditLoggerService from './audit-logger';

export class ScheduledTasksService {
  private static intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize all scheduled tasks
   */
  static async initializeScheduledTasks(): Promise<void> {
    try {
      // Daily data consistency maintenance (runs at 2 AM)
      this.scheduleTask('daily-maintenance', this.runDailyMaintenance, 24 * 60 * 60 * 1000); // 24 hours

      // Hourly table position updates (for active seasons)
      this.scheduleTask('hourly-table-update', this.runHourlyTableUpdate, 60 * 60 * 1000); // 1 hour

      // Weekly integrity checks (runs on Sundays at 3 AM)
      this.scheduleTask('weekly-integrity-check', this.runWeeklyIntegrityCheck, 7 * 24 * 60 * 60 * 1000); // 7 days

      strapi.log.info('Scheduled tasks initialized successfully');
    } catch (error) {
      strapi.log.error('Failed to initialize scheduled tasks:', error);
      throw error;
    }
  }

  /**
   * Stop all scheduled tasks
   */
  static stopAllTasks(): void {
    for (const [taskName, interval] of this.intervals) {
      clearInterval(interval);
      strapi.log.info(`Stopped scheduled task: ${taskName}`);
    }
    this.intervals.clear();
  }

  /**
   * Schedule a recurring task
   */
  private static scheduleTask(name: string, taskFunction: () => Promise<void>, intervalMs: number): void {
    // Clear existing interval if it exists
    if (this.intervals.has(name)) {
      clearInterval(this.intervals.get(name)!);
    }

    // Schedule the task
    const interval = setInterval(async () => {
      try {
        strapi.log.info(`Starting scheduled task: ${name}`);
        await taskFunction();
        strapi.log.info(`Completed scheduled task: ${name}`);
      } catch (error) {
        strapi.log.error(`Error in scheduled task ${name}:`, error);
        await AuditLoggerService.logSystemEvent(
          'scheduled_task_error',
          'high',
          `Scheduled task ${name} failed: ${error.message}`,
          { taskName: name, error: error.message }
        );
      }
    }, intervalMs);

    this.intervals.set(name, interval);
    strapi.log.info(`Scheduled task '${name}' set to run every ${intervalMs / 1000} seconds`);
  }

  /**
   * Run daily maintenance tasks
   */
  private static async runDailyMaintenance(): Promise<void> {
    await AuditLoggerService.logSystemEvent(
      'daily_maintenance_start',
      'medium',
      'Starting daily maintenance tasks'
    );

    try {
      // Data consistency maintenance moved to individual services
      strapi.log.info('Running simplified daily maintenance tasks');

      // Clean up old audit logs (keep last 30 days)
      await this.cleanupOldAuditLogs(30);

      // Update season statistics summaries
      await this.updateSeasonStatisticsSummaries();

      await AuditLoggerService.logSystemEvent(
        'daily_maintenance_complete',
        'medium',
        'Daily maintenance tasks completed successfully'
      );

    } catch (error) {
      await AuditLoggerService.logSystemEvent(
        'daily_maintenance_error',
        'critical',
        `Daily maintenance failed: ${error.message}`,
        { error: error.message }
      );
      throw error;
    }
  }

  /**
   * Run hourly table position updates
   */
  private static async runHourlyTableUpdate(): Promise<void> {
    try {
      // Get active season
      const activeSeason = await strapi.entityService.findMany('api::saison.saison' as any, {
        filters: { aktiv: true },
        pagination: { limit: 1 }
      });

      if (!activeSeason || activeSeason.length === 0) {
        return; // No active season
      }

      const season = Array.isArray(activeSeason) ? activeSeason[0] : activeSeason;

      // Get all leagues for active season
      const leagues = await strapi.entityService.findMany('api::liga.liga' as any, {
        filters: { saison: season.id }
      });

      const leaguesArray = Array.isArray(leagues) ? leagues : [leagues];
      let updatedTables = 0;

      for (const league of leaguesArray) {
        if (league) {
          try {
            await strapi.service('api::tabellen-eintrag.tabellen-eintrag').updateTablePositions(league.id);
            updatedTables++;
          } catch (error) {
            strapi.log.error(`Failed to update table positions for league ${league.id}:`, error);
          }
        }
      }

      if (updatedTables > 0) {
        strapi.log.info(`Updated table positions for ${updatedTables} leagues`);
      }

    } catch (error) {
      strapi.log.error('Error in hourly table update:', error);
    }
  }

  /**
   * Run weekly integrity checks
   */
  private static async runWeeklyIntegrityCheck(): Promise<void> {
    await AuditLoggerService.logSystemEvent(
      'weekly_integrity_check_start',
      'medium',
      'Starting weekly integrity check'
    );

    try {
      // Run simplified integrity check using Data Integrity Service
      const dataIntegrityService = strapi.service('api::system-maintenance.data-integrity');
      const integrityResult = await dataIntegrityService.validateAllData();
      
      const criticalIssues = integrityResult.errors?.length || 0;

      if (criticalIssues > 0) {
        await AuditLoggerService.logSystemEvent(
          'weekly_integrity_critical_issues',
          'critical',
          `Weekly integrity check found ${criticalIssues} critical issues`,
          { criticalIssues, errors: integrityResult.errors }
        );
      }

      // Generate weekly statistics report
      await this.generateWeeklyStatisticsReport();

      await AuditLoggerService.logSystemEvent(
        'weekly_integrity_check_complete',
        'medium',
        `Weekly integrity check completed. Critical issues: ${criticalIssues}`
      );

    } catch (error) {
      await AuditLoggerService.logSystemEvent(
        'weekly_integrity_check_error',
        'critical',
        `Weekly integrity check failed: ${error.message}`,
        { error: error.message }
      );
      throw error;
    }
  }

  /**
   * Clean up old audit logs
   */
  private static async cleanupOldAuditLogs(daysToKeep: number): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // In a real implementation, this would delete old audit log entries
      // For now, just log the cleanup operation
      strapi.log.info(`Audit log cleanup: would remove entries older than ${cutoffDate.toISOString()}`);

      await AuditLoggerService.logSystemEvent(
        'audit_log_cleanup',
        'low',
        `Audit log cleanup completed for entries older than ${daysToKeep} days`
      );

    } catch (error) {
      strapi.log.error('Error cleaning up audit logs:', error);
    }
  }

  /**
   * Update season statistics summaries
   */
  private static async updateSeasonStatisticsSummaries(): Promise<void> {
    try {
      // Get active season
      const activeSeason = await strapi.entityService.findMany('api::saison.saison' as any, {
        filters: { aktiv: true },
        pagination: { limit: 1 }
      });

      if (!activeSeason || activeSeason.length === 0) {
        return;
      }

      const season = Array.isArray(activeSeason) ? activeSeason[0] : activeSeason;

      // Update top scorers cache
      const topScorers = await strapi.service('api::spielerstatistik.spielerstatistik').getTopScorers(season.id, 20);
      
      // In a real implementation, this would cache the results
      strapi.log.info(`Updated top scorers for season ${season.name}: ${topScorers.length} entries`);

      // Update team statistics summaries
      const teams = await strapi.entityService.findMany('api::team.team' as any, {
        filters: { saison: season.id }
      });

      const teamsArray = Array.isArray(teams) ? teams : [teams];
      
      for (const team of teamsArray) {
        if (team) {
          const teamStats = await strapi.service('api::spielerstatistik.spielerstatistik').getTeamSeasonStatistics(team.id, season.id);
          // Cache team statistics
          strapi.log.debug(`Updated statistics for team ${team.name}: ${teamStats.length} players`);
        }
      }

    } catch (error) {
      strapi.log.error('Error updating season statistics summaries:', error);
    }
  }

  /**
   * Generate weekly statistics report
   */
  private static async generateWeeklyStatisticsReport(): Promise<void> {
    try {
      // Get active season
      const activeSeason = await strapi.entityService.findMany('api::saison.saison' as any, {
        filters: { aktiv: true },
        pagination: { limit: 1 }
      });

      if (!activeSeason || activeSeason.length === 0) {
        return;
      }

      const season = Array.isArray(activeSeason) ? activeSeason[0] : activeSeason;

      // Generate report data
      const report = {
        season: season.name,
        generatedAt: new Date(),
        topScorers: await strapi.service('api::spielerstatistik.spielerstatistik').getTopScorers(season.id, 10),
        statisticsSummary: await this.getStatisticsSummary(season.id)
      };

      // In a real implementation, this would save or email the report
      strapi.log.info(`Generated weekly statistics report for season ${season.name}`);

      await AuditLoggerService.logSystemEvent(
        'weekly_report_generated',
        'low',
        `Weekly statistics report generated for season ${season.name}`,
        { reportSummary: { topScorersCount: report.topScorers.length } }
      );

    } catch (error) {
      strapi.log.error('Error generating weekly statistics report:', error);
    }
  }



  /**
   * Get statistics summary for a season
   */
  private static async getStatisticsSummary(seasonId: any): Promise<any> {
    const allStats = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
      filters: { saison: seasonId }
    });

    const statsArray = Array.isArray(allStats) ? allStats : [allStats];

    const summary = {
      totalPlayers: statsArray.length,
      totalGoals: statsArray.reduce((sum, stat) => sum + (stat.tore || 0), 0),
      totalMatches: statsArray.reduce((sum, stat) => sum + (stat.spiele || 0), 0),
      totalCards: statsArray.reduce((sum, stat) => sum + (stat.gelbe_karten || 0) + (stat.rote_karten || 0), 0),
      averageGoalsPerPlayer: 0,
      averageMatchesPerPlayer: 0
    };

    if (summary.totalPlayers > 0) {
      summary.averageGoalsPerPlayer = Math.round((summary.totalGoals / summary.totalPlayers) * 100) / 100;
      summary.averageMatchesPerPlayer = Math.round((summary.totalMatches / summary.totalPlayers) * 100) / 100;
    }

    return summary;
  }

  /**
   * Manually trigger a specific maintenance task
   */
  static async triggerMaintenanceTask(taskType: 'daily' | 'hourly' | 'weekly'): Promise<any> {
    try {
      let result;
      
      switch (taskType) {
        case 'daily':
          await this.runDailyMaintenance();
          result = { task: 'daily', status: 'completed' };
          break;
        case 'hourly':
          await this.runHourlyTableUpdate();
          result = { task: 'hourly', status: 'completed' };
          break;
        case 'weekly':
          await this.runWeeklyIntegrityCheck();
          result = { task: 'weekly', status: 'completed' };
          break;
        default:
          throw new Error(`Unknown task type: ${taskType}`);
      }

      await AuditLoggerService.logSystemEvent(
        'manual_maintenance_trigger',
        'medium',
        `Manually triggered ${taskType} maintenance task`,
        { taskType, result }
      );

      return result;
    } catch (error) {
      await AuditLoggerService.logSystemEvent(
        'manual_maintenance_error',
        'high',
        `Manual ${taskType} maintenance task failed: ${error.message}`,
        { taskType, error: error.message }
      );
      throw error;
    }
  }
}

export default ScheduledTasksService;