/**
 * liga controller - Enhanced with error handling
 */

import { factories } from '@strapi/strapi';
import { ValidationService } from '../../../services/ValidationService';

export default factories.createCoreController('api::liga.liga', ({ strapi }) => ({
  /**
   * Find leagues with error handling
   */
  async find(ctx) {
    try {
      const { query } = ctx;
      
      strapi.log.debug('Liga.find: Fetching leagues with query', { query });
      
      const leagues = await strapi.entityService.findMany('api::liga.liga', {
        ...query,
        populate: ['saison', 'teams'] as any
      });
      
      strapi.log.debug('Liga.find: Successfully fetched leagues', { count: leagues?.length || 0 });
      
      return leagues;
    } catch (error) {
      strapi.log.error('Liga.find: Error fetching leagues', {
        error: error.message,
        query: ctx.query
      });
      
      throw error;
    }
  },

  /**
   * Find one league with error handling
   */
  async findOne(ctx) {
    try {
      const { id } = ctx.params;
      
      strapi.log.debug('Liga.findOne: Fetching league', { id });
      
      // Validate ID
      const ligaId = parseInt(id);
      if (isNaN(ligaId) || ligaId <= 0) {
        return ctx.badRequest(
          ValidationService.createErrorResponse(
            'Invalid league ID',
            'INVALID_ID'
          )
        );
      }
      
      const league = await strapi.entityService.findOne('api::liga.liga', ligaId, {
        populate: ['saison', 'teams'] as any
      });
      
      if (!league) {
        return ctx.notFound('Liga not found');
      }
      
      strapi.log.debug('Liga.findOne: League found', { id: ligaId, name: league.name });
      
      return league;
    } catch (error) {
      strapi.log.error('Liga.findOne: Error fetching league', {
        error: error.message,
        id: ctx.params.id
      });
      
      throw error;
    }
  }
}));