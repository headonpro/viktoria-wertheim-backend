/**
 * tabellen-eintrag controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::tabellen-eintrag.tabellen-eintrag' as any, ({ strapi }) => ({
  // Custom controller methods for table position calculations can be added here
  
  async find(ctx) {
    // Call the default find method
    const { data, meta } = await super.find(ctx);
    
    // Sort by position (platz) by default if no sort parameter is provided
    if (!ctx.query.sort) {
      data.sort((a, b) => a.attributes.platz - b.attributes.platz);
    }
    
    return { data, meta };
  },

  async findOne(ctx) {
    const response = await super.findOne(ctx);
    return response;
  },

  /**
   * Get complete league table for a specific league
   * GET /api/tabellen-eintraege/league/:ligaId
   */
  async getLeagueTable(ctx) {
    try {
      const { ligaId } = ctx.params;
      
      if (!ligaId) {
        return ctx.badRequest('Liga ID is required');
      }

      const service = strapi.service('api::tabellen-eintrag.tabellen-eintrag');
      const table = await service.getLeagueTable(parseInt(ligaId));
      
      return { data: table };
    } catch (error) {
      strapi.log.error('Error fetching league table:', error);
      return ctx.internalServerError('Failed to fetch league table');
    }
  },

  /**
   * Get table statistics for a specific club in a league
   * GET /api/tabellen-eintraege/club/:ligaId/:clubId
   */
  async getClubStats(ctx) {
    try {
      const { ligaId, clubId } = ctx.params;
      
      if (!ligaId || !clubId) {
        return ctx.badRequest('Liga ID and Club ID are required');
      }

      const service = strapi.service('api::tabellen-eintrag.tabellen-eintrag');
      const stats = await service.getClubTableStats(parseInt(ligaId), parseInt(clubId));
      
      if (!stats) {
        return ctx.notFound('Club not found in league table');
      }
      
      return { data: stats };
    } catch (error) {
      strapi.log.error('Error fetching club stats:', error);
      return ctx.internalServerError('Failed to fetch club statistics');
    }
  },

  /**
   * Initialize table entries for all clubs in a league
   * POST /api/tabellen-eintraege/initialize/:ligaId
   */
  async initializeTable(ctx) {
    try {
      const { ligaId } = ctx.params;
      
      if (!ligaId) {
        return ctx.badRequest('Liga ID is required');
      }

      const service = strapi.service('api::tabellen-eintrag.tabellen-eintrag');
      const table = await service.initializeLeagueTable(parseInt(ligaId));
      
      return { 
        data: table,
        message: `League table initialized for league ${ligaId}`
      };
    } catch (error) {
      strapi.log.error('Error initializing league table:', error);
      return ctx.internalServerError('Failed to initialize league table');
    }
  },

  /**
   * Manually update table positions for a league
   * POST /api/tabellen-eintraege/update-positions/:ligaId
   */
  async updatePositions(ctx) {
    try {
      const { ligaId } = ctx.params;
      
      if (!ligaId) {
        return ctx.badRequest('Liga ID is required');
      }

      const service = strapi.service('api::tabellen-eintrag.tabellen-eintrag');
      const sortedEntries = await service.updateTablePositions(parseInt(ligaId));
      
      return { 
        data: sortedEntries,
        message: `Table positions updated for league ${ligaId}`
      };
    } catch (error) {
      strapi.log.error('Error updating table positions:', error);
      return ctx.internalServerError('Failed to update table positions');
    }
  }
}));