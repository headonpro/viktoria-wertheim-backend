/**
 * System Maintenance Controller
 * Provides endpoints for manual maintenance tasks and system status
 */

import { factories } from '@strapi/strapi';
import AutomatedProcessingService from '../../../services/automated-processing';
import ScheduledTasksService from '../../../services/scheduled-tasks';
import DataIntegrityService from '../../../services/data-integrity';
import AuditLoggerService from '../../../services/audit-logger';

export default ({ strapi }) => ({
  /**
   * Trigger data consistency maintenance
   */
  async triggerMaintenance(ctx) {
    try {
      const { type = 'full' } = ctx.request.body;
      
      let result;
      
      switch (type) {
        case 'full':
          result = await AutomatedProcessingService.runDataConsistencyMaintenance();
          break;
        case 'daily':
          result = await ScheduledTasksService.triggerMaintenanceTask('daily');
          break;
        case 'hourly':
          result = await ScheduledTasksService.triggerMaintenanceTask('hourly');
          break;
        case 'weekly':
          result = await ScheduledTasksService.triggerMaintenanceTask('weekly');
          break;
        default:
          return ctx.badRequest('Invalid maintenance type. Use: full, daily, hourly, or weekly');
      }

      await AuditLoggerService.logSystemEvent(
        'manual_maintenance_triggered',
        'medium',
        `Manual ${type} maintenance triggered by user`,
        { 
          userId: ctx.state.user?.id,
          userEmail: ctx.state.user?.email,
          maintenanceType: type,
          result 
        }
      );

      ctx.body = {
        success: result.success,
        message: result.message,
        type,
        timestamp: new Date().toISOString(),
        details: result.details,
        errors: result.errors
      };

    } catch (error) {
      strapi.log.error('Error triggering maintenance:', error);
      
      await AuditLoggerService.logSystemEvent(
        'manual_maintenance_error',
        'high',
        `Manual maintenance trigger failed: ${error.message}`,
        { 
          userId: ctx.state.user?.id,
          error: error.message 
        }
      );

      return ctx.internalServerError('Failed to trigger maintenance', { error: error.message });
    }
  },

  /**
   * Run data integrity check
   */
  async checkIntegrity(ctx) {
    try {
      const results = await DataIntegrityService.runFullIntegrityCheck();
      
      const summary = {
        totalContentTypes: results.length,
        totalIssues: results.reduce((sum, result) => sum + result.summary.total, 0),
        criticalIssues: results.reduce((sum, result) => sum + result.summary.critical, 0),
        warnings: results.reduce((sum, result) => sum + result.summary.warnings, 0)
      };

      await AuditLoggerService.logSystemEvent(
        'integrity_check_manual',
        summary.criticalIssues > 0 ? 'high' : 'medium',
        `Manual integrity check completed: ${summary.totalIssues} issues found`,
        { 
          userId: ctx.state.user?.id,
          summary,
          results 
        }
      );

      ctx.body = {
        success: true,
        message: 'Integrity check completed',
        timestamp: new Date().toISOString(),
        summary,
        results
      };

    } catch (error) {
      strapi.log.error('Error running integrity check:', error);
      return ctx.internalServerError('Failed to run integrity check', { error: error.message });
    }
  },

  /**
   * Process specific match completion
   */
  async processMatch(ctx) {
    try {
      const { matchId } = ctx.params;
      
      if (!matchId) {
        return ctx.badRequest('Match ID is required');
      }

      // Verify match exists
      const match = await strapi.entityService.findOne('api::spiel.spiel', matchId);
      if (!match) {
        return ctx.notFound('Match not found');
      }

      const result = await AutomatedProcessingService.processMatchCompletion(matchId);

      await AuditLoggerService.logSystemEvent(
        'manual_match_processing',
        result.success ? 'medium' : 'high',
        `Manual match processing for match ${matchId}: ${result.success ? 'success' : 'failed'}`,
        { 
          userId: ctx.state.user?.id,
          matchId,
          result 
        }
      );

      ctx.body = {
        success: result.success,
        message: result.message,
        matchId,
        timestamp: new Date().toISOString(),
        details: result.details,
        errors: result.errors
      };

    } catch (error) {
      strapi.log.error('Error processing match:', error);
      return ctx.internalServerError('Failed to process match', { error: error.message });
    }
  },

  /**
   * Get system status and maintenance information
   */
  async getStatus(ctx) {
    try {
      // Get active season
      const activeSeason = await strapi.entityService.findMany('api::saison.saison' as any, {
        filters: { aktiv: true },
        pagination: { limit: 1 }
      });

      // Get recent matches
      const recentMatches = await strapi.entityService.findMany('api::spiel.spiel' as any, {
        filters: { status: 'beendet' },
        sort: 'datum:desc',
        pagination: { limit: 5 },
        populate: ['heimclub', 'auswaertsclub']
      });

      // Get statistics summary
      const statsCount = await strapi.entityService.count('api::spielerstatistik.spielerstatistik' as any);
      const playersCount = await strapi.entityService.count('api::spieler.spieler' as any);
      const teamsCount = await strapi.entityService.count('api::team.team' as any);

      // Get table entries count
      const tableEntriesCount = await strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag' as any);

      const status = {
        timestamp: new Date().toISOString(),
        system: {
          status: 'operational',
          version: strapi.config.info?.version || 'unknown',
          environment: strapi.config.environment
        },
        activeSeason: activeSeason && activeSeason.length > 0 
          ? (Array.isArray(activeSeason) ? activeSeason[0] : activeSeason)
          : null,
        statistics: {
          players: playersCount,
          teams: teamsCount,
          playerStatistics: statsCount,
          tableEntries: tableEntriesCount
        },
        recentActivity: {
          recentMatches: Array.isArray(recentMatches) ? recentMatches : [recentMatches]
        },
        maintenance: {
          lastRun: 'Scheduled tasks running automatically',
          scheduledTasks: [
            { name: 'Daily Maintenance', frequency: '24 hours', status: 'active' },
            { name: 'Hourly Table Update', frequency: '1 hour', status: 'active' },
            { name: 'Weekly Integrity Check', frequency: '7 days', status: 'active' }
          ]
        }
      };

      ctx.body = status;

    } catch (error) {
      strapi.log.error('Error getting system status:', error);
      return ctx.internalServerError('Failed to get system status', { error: error.message });
    }
  },

  /**
   * Auto-fix integrity issues
   */
  async autoFix(ctx) {
    try {
      // First run integrity check
      const integrityResults = await DataIntegrityService.runFullIntegrityCheck();
      
      // Attempt auto-fix
      const fixResults = await DataIntegrityService.autoFixIssues(integrityResults);

      await AuditLoggerService.logSystemEvent(
        'auto_fix_triggered',
        'high',
        `Auto-fix completed: ${fixResults.fixed} fixed, ${fixResults.failed} failed`,
        { 
          userId: ctx.state.user?.id,
          fixResults,
          integrityResults 
        }
      );

      ctx.body = {
        success: true,
        message: 'Auto-fix completed',
        timestamp: new Date().toISOString(),
        results: {
          fixed: fixResults.fixed,
          failed: fixResults.failed,
          integrityCheck: integrityResults
        }
      };

    } catch (error) {
      strapi.log.error('Error running auto-fix:', error);
      return ctx.internalServerError('Failed to run auto-fix', { error: error.message });
    }
  },

  /**
   * Initialize statistics for new season
   */
  async initializeSeasonStats(ctx) {
    try {
      const { seasonId } = ctx.request.body;
      
      if (!seasonId) {
        return ctx.badRequest('Season ID is required');
      }

      // Verify season exists
      const season = await strapi.entityService.findOne('api::saison.saison', seasonId);
      if (!season) {
        return ctx.notFound('Season not found');
      }

      // Initialize statistics
      const result = await strapi.service('api::spielerstatistik.spielerstatistik').initializeForNewSeason(seasonId);

      await AuditLoggerService.logSystemEvent(
        'season_stats_initialization',
        'medium',
        `Statistics initialized for season ${season.name}: ${result.length} entries created`,
        { 
          userId: ctx.state.user?.id,
          seasonId,
          seasonName: season.name,
          entriesCreated: result.length 
        }
      );

      ctx.body = {
        success: true,
        message: `Statistics initialized for season ${season.name}`,
        seasonId,
        seasonName: season.name,
        entriesCreated: result.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      strapi.log.error('Error initializing season statistics:', error);
      return ctx.internalServerError('Failed to initialize season statistics', { error: error.message });
    }
  },

  /**
   * Recalculate all table positions
   */
  async recalculateTables(ctx) {
    try {
      const { leagueId } = ctx.request.body;
      
      if (leagueId) {
        // Recalculate specific league
        const league = await strapi.entityService.findOne('api::liga.liga', leagueId);
        if (!league) {
          return ctx.notFound('League not found');
        }

        await strapi.service('api::tabellen-eintrag.tabellen-eintrag').updateTablePositions(leagueId);
        
        ctx.body = {
          success: true,
          message: `Table positions recalculated for league ${league.name}`,
          leagueId,
          timestamp: new Date().toISOString()
        };
      } else {
        // Recalculate all leagues
        const leagues = await strapi.entityService.findMany('api::liga.liga' as any);
        const leaguesArray = Array.isArray(leagues) ? leagues : [leagues];
        
        let updated = 0;
        const errors = [];
        
        for (const league of leaguesArray) {
          if (league) {
            try {
              await strapi.service('api::tabellen-eintrag.tabellen-eintrag').updateTablePositions(league.id);
              updated++;
            } catch (error) {
              errors.push(`League ${league.name}: ${error.message}`);
            }
          }
        }

        await AuditLoggerService.logSystemEvent(
          'table_recalculation',
          errors.length > 0 ? 'high' : 'medium',
          `Table positions recalculated: ${updated} leagues updated, ${errors.length} errors`,
          { 
            userId: ctx.state.user?.id,
            updated,
            errors 
          }
        );

        ctx.body = {
          success: errors.length === 0,
          message: `Table positions recalculated for ${updated} leagues`,
          updated,
          errors: errors.length > 0 ? errors : undefined,
          timestamp: new Date().toISOString()
        };
      }

    } catch (error) {
      strapi.log.error('Error recalculating tables:', error);
      return ctx.internalServerError('Failed to recalculate tables', { error: error.message });
    }
  }
});