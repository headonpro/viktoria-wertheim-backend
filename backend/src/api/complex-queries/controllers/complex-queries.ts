/**
 * complex-queries controller
 * Handles complex data queries and aggregations with caching and error handling
 */

import { 
  transformLeagueTable, 
  transformPlayerStatsList,
  transformMatch,
  transformMatchEvents,
  transformTeamRoster,
  createPaginatedResponse,
  addPerformanceMetrics
} from '../utils/transformers';

import { 
  withCache, 
  CacheKeys, 
  CacheTTL, 
  PerformanceMonitor
} from '../utils/cache';

import { 
  asyncErrorHandler,
  validateId,
  validatePagination,
  validateSortBy,
  ensureResourceExists,
  throwValidationError
} from '../utils/error-handler';

export default ({ strapi }) => ({
  
  // ===== LEAGUE TABLE ENDPOINTS =====
  
  /**
   * Get complete league table with enhanced statistics
   * GET /api/complex-queries/league-table/:ligaId
   */
  getLeagueTable: asyncErrorHandler(async (ctx) => {
    const startTime = PerformanceMonitor.start();
    const { ligaId } = ctx.params;
    
    // Validate parameters
    const idErrors = validateId(ligaId, 'ligaId');
    if (idErrors.length > 0) {
      throwValidationError(idErrors);
    }

    const service = strapi.service('api::complex-queries.complex-queries');
    
    // Use caching for league table data
    const table = await withCache(
      CacheKeys.leagueTable(parseInt(ligaId)),
      () => service.getEnhancedLeagueTable(parseInt(ligaId)),
      CacheTTL.MEDIUM
    );
    
    // Transform data for frontend
    const transformedTable = transformLeagueTable(Array.isArray(table) ? table : []);
    
    // Add performance metrics
    const response = addPerformanceMetrics(transformedTable, startTime);
    
    ctx.body = { data: response.data, meta: response.performance };
  }),

  /**
   * Get league standings with form and trends
   * GET /api/complex-queries/league-table/:ligaId/standings
   */
  getLeagueStandings: asyncErrorHandler(async (ctx) => {
    const startTime = PerformanceMonitor.start();
    const { ligaId } = ctx.params;
    
    const idErrors = validateId(ligaId, 'ligaId');
    if (idErrors.length > 0) {
      throwValidationError(idErrors);
    }

    const service = strapi.service('api::complex-queries.complex-queries');
    
    const standings = await withCache(
      CacheKeys.leagueStandings(parseInt(ligaId)),
      () => service.getLeagueStandings(parseInt(ligaId)),
      CacheTTL.MEDIUM
    );
    
    const response = addPerformanceMetrics(standings, startTime);
    ctx.body = { data: response.data, meta: response.performance };
  }),

  // ===== PLAYER STATISTICS ENDPOINTS =====

  /**
   * Get comprehensive player statistics
   * GET /api/complex-queries/player-stats/:playerId
   */
  async getPlayerStatistics(ctx) {
    try {
      const { playerId } = ctx.params;
      const { saisonId } = ctx.query;
      
      if (!playerId) {
        return ctx.badRequest('Player ID is required');
      }

      const service = strapi.service('api::complex-queries.complex-queries');
      const stats = await service.getPlayerStatistics(
        parseInt(playerId), 
        saisonId ? parseInt(saisonId as string) : undefined
      );
      
      return { data: stats };
    } catch (error) {
      strapi.log.error('Error fetching player statistics:', error);
      return ctx.internalServerError('Failed to fetch player statistics');
    }
  },

  /**
   * Get team player statistics aggregated
   * GET /api/complex-queries/player-stats/team/:teamId
   */
  async getTeamPlayerStatistics(ctx) {
    try {
      const { teamId } = ctx.params;
      const { saisonId } = ctx.query;
      
      if (!teamId) {
        return ctx.badRequest('Team ID is required');
      }

      const service = strapi.service('api::complex-queries.complex-queries');
      const stats = await service.getTeamPlayerStatistics(
        parseInt(teamId),
        saisonId ? parseInt(saisonId as string) : undefined
      );
      
      return { data: stats };
    } catch (error) {
      strapi.log.error('Error fetching team player statistics:', error);
      return ctx.internalServerError('Failed to fetch team player statistics');
    }
  },

  /**
   * Get season-wide player statistics
   * GET /api/complex-queries/player-stats/season/:saisonId
   */
  async getSeasonPlayerStatistics(ctx) {
    try {
      const { saisonId } = ctx.params;
      const { limit = 50, sortBy = 'tore' } = ctx.query;
      
      if (!saisonId) {
        return ctx.badRequest('Season ID is required');
      }

      const service = strapi.service('api::complex-queries.complex-queries');
      const stats = await service.getSeasonPlayerStatistics(
        parseInt(saisonId),
        parseInt(limit as string),
        sortBy as string
      );
      
      return { data: stats };
    } catch (error) {
      strapi.log.error('Error fetching season player statistics:', error);
      return ctx.internalServerError('Failed to fetch season player statistics');
    }
  },

  /**
   * Get top scorers for a season
   * GET /api/complex-queries/top-scorers/:saisonId
   */
  async getTopScorers(ctx) {
    try {
      const { saisonId } = ctx.params;
      const { limit = 10 } = ctx.query;
      
      if (!saisonId) {
        return ctx.badRequest('Season ID is required');
      }

      const service = strapi.service('api::complex-queries.complex-queries');
      const topScorers = await service.getTopScorers(
        parseInt(saisonId),
        parseInt(limit as string)
      );
      
      return { data: topScorers };
    } catch (error) {
      strapi.log.error('Error fetching top scorers:', error);
      return ctx.internalServerError('Failed to fetch top scorers');
    }
  },

  // ===== MATCH TIMELINE AND EVENTS ENDPOINTS =====

  /**
   * Get match timeline with events
   * GET /api/complex-queries/match/:matchId/timeline
   */
  async getMatchTimeline(ctx) {
    try {
      const { matchId } = ctx.params;
      
      if (!matchId) {
        return ctx.badRequest('Match ID is required');
      }

      const service = strapi.service('api::complex-queries.complex-queries');
      const timeline = await service.getMatchTimeline(parseInt(matchId));
      
      return { data: timeline };
    } catch (error) {
      strapi.log.error('Error fetching match timeline:', error);
      return ctx.internalServerError('Failed to fetch match timeline');
    }
  },

  /**
   * Get structured match events
   * GET /api/complex-queries/match/:matchId/events
   */
  async getMatchEvents(ctx) {
    try {
      const { matchId } = ctx.params;
      
      if (!matchId) {
        return ctx.badRequest('Match ID is required');
      }

      const service = strapi.service('api::complex-queries.complex-queries');
      const events = await service.getMatchEvents(parseInt(matchId));
      
      return { data: events };
    } catch (error) {
      strapi.log.error('Error fetching match events:', error);
      return ctx.internalServerError('Failed to fetch match events');
    }
  },

  /**
   * Get recent matches for a team
   * GET /api/complex-queries/matches/recent/:teamId
   */
  async getRecentMatches(ctx) {
    try {
      const { teamId } = ctx.params;
      const { limit = 5 } = ctx.query;
      
      if (!teamId) {
        return ctx.badRequest('Team ID is required');
      }

      const service = strapi.service('api::complex-queries.complex-queries');
      const matches = await service.getRecentMatches(
        parseInt(teamId),
        parseInt(limit as string)
      );
      
      return { data: matches };
    } catch (error) {
      strapi.log.error('Error fetching recent matches:', error);
      return ctx.internalServerError('Failed to fetch recent matches');
    }
  },

  /**
   * Get upcoming matches for a team
   * GET /api/complex-queries/matches/upcoming/:teamId
   */
  async getUpcomingMatches(ctx) {
    try {
      const { teamId } = ctx.params;
      const { limit = 5 } = ctx.query;
      
      if (!teamId) {
        return ctx.badRequest('Team ID is required');
      }

      const service = strapi.service('api::complex-queries.complex-queries');
      const matches = await service.getUpcomingMatches(
        parseInt(teamId),
        parseInt(limit as string)
      );
      
      return { data: matches };
    } catch (error) {
      strapi.log.error('Error fetching upcoming matches:', error);
      return ctx.internalServerError('Failed to fetch upcoming matches');
    }
  },

  // ===== TEAM ROSTER AND FORMATION ENDPOINTS =====

  /**
   * Get complete team roster with player details
   * GET /api/complex-queries/team/:teamId/roster
   */
  async getTeamRoster(ctx) {
    try {
      const { teamId } = ctx.params;
      const { saisonId } = ctx.query;
      
      if (!teamId) {
        return ctx.badRequest('Team ID is required');
      }

      const service = strapi.service('api::complex-queries.complex-queries');
      const roster = await service.getTeamRoster(
        parseInt(teamId),
        saisonId ? parseInt(saisonId as string) : undefined
      );
      
      return { data: roster };
    } catch (error) {
      strapi.log.error('Error fetching team roster:', error);
      return ctx.internalServerError('Failed to fetch team roster');
    }
  },

  /**
   * Get team formation and tactical setup
   * GET /api/complex-queries/team/:teamId/formation
   */
  async getTeamFormation(ctx) {
    try {
      const { teamId } = ctx.params;
      
      if (!teamId) {
        return ctx.badRequest('Team ID is required');
      }

      const service = strapi.service('api::complex-queries.complex-queries');
      const formation = await service.getTeamFormation(parseInt(teamId));
      
      return { data: formation };
    } catch (error) {
      strapi.log.error('Error fetching team formation:', error);
      return ctx.internalServerError('Failed to fetch team formation');
    }
  },

  /**
   * Get comprehensive squad overview
   * GET /api/complex-queries/team/:teamId/squad-overview
   */
  async getSquadOverview(ctx) {
    try {
      const { teamId } = ctx.params;
      const { saisonId } = ctx.query;
      
      if (!teamId) {
        return ctx.badRequest('Team ID is required');
      }

      const service = strapi.service('api::complex-queries.complex-queries');
      const overview = await service.getSquadOverview(
        parseInt(teamId),
        saisonId ? parseInt(saisonId as string) : undefined
      );
      
      return { data: overview };
    } catch (error) {
      strapi.log.error('Error fetching squad overview:', error);
      return ctx.internalServerError('Failed to fetch squad overview');
    }
  },
});