/**
 * team service - Ultra-simplified version with enhanced error handling
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::team.team', ({ strapi }) => ({
  /**
   * Find teams with basic relation loading and error handling
   */
  async findWithPopulate(params = {}) {
    try {
      strapi.log.debug('TeamService.findWithPopulate: Starting query', { params });
      
      const teams = await strapi.entityService.findMany('api::team.team', {
        ...params,
        populate: ['liga', 'saison'] as any
      });
      
      strapi.log.debug('TeamService.findWithPopulate: Query completed', { 
        count: teams?.length || 0 
      });
      
      return teams;
    } catch (error) {
      strapi.log.error('TeamService.findWithPopulate: Database error', {
        error: error.message,
        params,
        stack: error.stack
      });
      
      // Re-throw with more context
      throw new Error(`Failed to fetch teams: ${error.message}`);
    }
  },

  /**
   * Find teams for a specific league with validation and error handling
   */
  async findByLeague(ligaId: number, params: any = {}) {
    try {
      strapi.log.debug('TeamService.findByLeague: Starting query', { ligaId, params });
      
      // Validate ligaId
      if (!ligaId || isNaN(ligaId) || ligaId <= 0) {
        throw new Error('Invalid league ID provided');
      }
      
      // Check if league exists
      const league = await strapi.entityService.findOne('api::liga.liga', ligaId);
      if (!league) {
        strapi.log.warn('TeamService.findByLeague: League not found', { ligaId });
        throw new Error(`League with ID ${ligaId} not found`);
      }
      
      const teams = await this.findWithPopulate({
        ...params,
        filters: {
          liga: ligaId,
          ...(params.filters || {})
        },
        sort: { tabellenplatz: 'asc' }
      });
      
      strapi.log.debug('TeamService.findByLeague: Query completed', { 
        ligaId, 
        count: teams?.length || 0 
      });
      
      return teams;
    } catch (error) {
      strapi.log.error('TeamService.findByLeague: Error fetching teams by league', {
        error: error.message,
        ligaId,
        params
      });
      
      // Re-throw to let controller handle the response
      throw error;
    }
  },

  /**
   * Safely get team by ID with error handling
   */
  async findOneWithPopulate(id: number) {
    try {
      strapi.log.debug('TeamService.findOneWithPopulate: Fetching team', { id });
      
      if (!id || isNaN(id) || id <= 0) {
        throw new Error('Invalid team ID provided');
      }
      
      const team = await strapi.entityService.findOne('api::team.team', id, {
        populate: ['liga', 'saison'] as any
      });
      
      if (!team) {
        strapi.log.warn('TeamService.findOneWithPopulate: Team not found', { id });
        throw new Error(`Team with ID ${id} not found`);
      }
      
      strapi.log.debug('TeamService.findOneWithPopulate: Team found', { 
        id, 
        name: team.name 
      });
      
      return team;
    } catch (error) {
      strapi.log.error('TeamService.findOneWithPopulate: Error fetching team', {
        error: error.message,
        id
      });
      
      throw error;
    }
  }
}));