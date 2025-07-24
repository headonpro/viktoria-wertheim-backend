/**
 * team controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::team.team', ({ strapi }) => ({
  /**
   * Find teams with populated relationships
   */
  async find(ctx) {
    const { query } = ctx;
    
    // Use custom service method for populated data
    const teams = await strapi.service('api::team.team').findWithPopulate(query);
    
    return teams;
  },

  /**
   * Find one team with populated relationships
   */
  async findOne(ctx) {
    const { id } = ctx.params;
    const { query } = ctx;
    
    // Use custom service method for populated data
    const team = await strapi.service('api::team.team').findOneWithPopulate(parseInt(id), query);
    
    if (!team) {
      return ctx.notFound('Team not found');
    }
    
    return team;
  },

  /**
   * Get teams by season
   */
  async bySeason(ctx) {
    const { saisonId } = ctx.query;
    
    if (!saisonId) {
      return ctx.badRequest('saisonId is required');
    }
    
    try {
      const teams = await strapi.service('api::team.team').findBySeason(
        parseInt(saisonId as string),
        ctx.query
      );
      
      return teams;
    } catch (error) {
      return ctx.badRequest('Error fetching teams by season', { error: error.message });
    }
  },

  /**
   * Get teams by league
   */
  async byLeague(ctx) {
    const { ligaId } = ctx.query;
    
    if (!ligaId) {
      return ctx.badRequest('ligaId is required');
    }
    
    try {
      const teams = await strapi.service('api::team.team').findByLeague(
        parseInt(ligaId as string),
        ctx.query
      );
      
      return teams;
    } catch (error) {
      return ctx.badRequest('Error fetching teams by league', { error: error.message });
    }
  },

  /**
   * Get active teams
   */
  async active(ctx) {
    try {
      const teams = await strapi.service('api::team.team').findActive(ctx.query);
      return teams;
    } catch (error) {
      return ctx.badRequest('Error fetching active teams', { error: error.message });
    }
  },

  /**
   * Get team with matches
   */
  async withMatches(ctx) {
    const { id } = ctx.params;
    const { saisonId } = ctx.query;
    
    try {
      const team = await strapi.service('api::team.team').findWithMatches(
        parseInt(id),
        saisonId ? parseInt(saisonId as string) : undefined
      );
      
      if (!team) {
        return ctx.notFound('Team not found');
      }
      
      return team;
    } catch (error) {
      return ctx.badRequest('Error fetching team with matches', { error: error.message });
    }
  },

  /**
   * Get team roster
   */
  async roster(ctx) {
    const { id } = ctx.params;
    
    try {
      const roster = await strapi.service('api::team.team').getTeamRoster(parseInt(id));
      return roster;
    } catch (error) {
      return ctx.badRequest('Error fetching team roster', { error: error.message });
    }
  },

  /**
   * Update team statistics
   */
  async updateStatistics(ctx) {
    const { id } = ctx.params;
    const { saisonId } = ctx.query;
    
    try {
      const updatedTeam = await strapi.service('api::team.team').updateTeamStatistics(
        parseInt(id),
        saisonId ? parseInt(saisonId as string) : undefined
      );
      
      return updatedTeam;
    } catch (error) {
      return ctx.badRequest('Error updating team statistics', { error: error.message });
    }
  },

  /**
   * Get league standings
   */
  async standings(ctx) {
    const { ligaId, saisonId } = ctx.query;
    
    if (!ligaId || !saisonId) {
      return ctx.badRequest('ligaId and saisonId are required');
    }
    
    try {
      const standings = await strapi.service('api::team.team').getLeagueStandings(
        parseInt(ligaId as string),
        parseInt(saisonId as string)
      );
      
      return standings;
    } catch (error) {
      return ctx.badRequest('Error fetching league standings', { error: error.message });
    }
  },

  /**
   * Validate team data
   */
  async validate(ctx) {
    const { id } = ctx.params;
    
    try {
      const validation = await strapi.service('api::team.team').validateTeamData(parseInt(id));
      return validation;
    } catch (error) {
      return ctx.badRequest('Error validating team data', { error: error.message });
    }
  },

  /**
   * Get comprehensive team details
   */
  async details(ctx) {
    const { id } = ctx.params;
    const { saisonId } = ctx.query;
    
    try {
      const details = await strapi.service('api::team.team').getTeamDetails(
        parseInt(id),
        saisonId ? parseInt(saisonId as string) : undefined
      );
      
      return details;
    } catch (error) {
      return ctx.badRequest('Error fetching team details', { error: error.message });
    }
  },

  /**
   * Custom create with enhanced validation
   */
  async create(ctx) {
    const { data } = ctx.request.body;
    
    try {
      // Validate required relationships exist
      if (data.club) {
        const club = await strapi.entityService.findOne('api::club.club', data.club);
        if (!club) {
          return ctx.badRequest('Club not found');
        }
      }
      
      if (data.liga) {
        const liga = await strapi.entityService.findOne('api::liga.liga', data.liga);
        if (!liga) {
          return ctx.badRequest('Liga not found');
        }
      }
      
      if (data.saison) {
        const saison = await strapi.entityService.findOne('api::saison.saison', data.saison);
        if (!saison) {
          return ctx.badRequest('Saison not found');
        }
      }
      
      // Create team using default create method
      const team = await strapi.entityService.create('api::team.team', {
        data,
        populate: ['club', 'liga', 'saison', 'spieler', 'aushilfe_spieler'] as any
      });
      
      return team;
    } catch (error) {
      return ctx.badRequest('Error creating team', { error: error.message });
    }
  },

  /**
   * Custom update with enhanced validation
   */
  async update(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;
    
    try {
      // Update team using default update method
      const team = await strapi.entityService.update('api::team.team', parseInt(id), {
        data,
        populate: ['club', 'liga', 'saison', 'spieler', 'aushilfe_spieler'] as any
      });
      
      return team;
    } catch (error) {
      return ctx.badRequest('Error updating team', { error: error.message });
    }
  }
}));