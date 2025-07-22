/**
 * spiel controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::spiel.spiel', ({ strapi }) => ({
  /**
   * Find matches with populated relationships
   */
  async find(ctx) {
    const { query } = ctx;
    
    // Use custom service method for populated data
    const matches = await strapi.service('api::spiel.spiel').findWithPopulate(query);
    
    return matches;
  },

  /**
   * Find one match with populated relationships
   */
  async findOne(ctx) {
    const { id } = ctx.params;
    const { query } = ctx;
    
    // Use custom service method for populated data
    const match = await strapi.service('api::spiel.spiel').findOneWithPopulate(parseInt(id), query);
    
    if (!match) {
      return ctx.notFound('Match not found');
    }
    
    return match;
  },

  /**
   * Get upcoming matches
   */
  async upcoming(ctx) {
    const { teamId, limit } = ctx.query;
    
    try {
      const matches = await strapi.service('api::spiel.spiel').findUpcoming(
        teamId ? parseInt(teamId as string) : undefined,
        limit ? parseInt(limit as string) : 5
      );
      
      return matches;
    } catch (error) {
      return ctx.badRequest('Error fetching upcoming matches', { error: error.message });
    }
  },

  /**
   * Get recent completed matches
   */
  async recent(ctx) {
    const { teamId, limit } = ctx.query;
    
    try {
      const matches = await strapi.service('api::spiel.spiel').findRecent(
        teamId ? parseInt(teamId as string) : undefined,
        limit ? parseInt(limit as string) : 5
      );
      
      return matches;
    } catch (error) {
      return ctx.badRequest('Error fetching recent matches', { error: error.message });
    }
  },

  /**
   * Get matches by team and season
   */
  async byTeamAndSeason(ctx) {
    const { teamId, saisonId } = ctx.query;
    
    if (!teamId || !saisonId) {
      return ctx.badRequest('teamId and saisonId are required');
    }
    
    try {
      const matches = await strapi.service('api::spiel.spiel').findByTeamAndSeason(
        parseInt(teamId as string),
        parseInt(saisonId as string),
        ctx.query
      );
      
      return matches;
    } catch (error) {
      return ctx.badRequest('Error fetching matches', { error: error.message });
    }
  },

  /**
   * Get match timeline with events
   */
  async timeline(ctx) {
    const { id } = ctx.params;
    
    try {
      const match = await strapi.service('api::spiel.spiel').findOneWithPopulate(parseInt(id));
      
      if (!match) {
        return ctx.notFound('Match not found');
      }
      
      const timeline = await strapi.service('api::spiel.spiel').generateTimeline(match);
      
      return {
        match: {
          id: match.id,
          datum: match.datum,
          heimclub: match.heimclub,
          auswaertsclub: match.auswaertsclub,
          tore_heim: match.tore_heim,
          tore_auswaerts: match.tore_auswaerts,
          status: match.status
        },
        timeline
      };
    } catch (error) {
      return ctx.badRequest('Error generating timeline', { error: error.message });
    }
  },

  /**
   * Validate match events before saving
   */
  async validateEvents(ctx) {
    const { torschuetzen, karten, wechsel } = ctx.request.body;
    
    try {
      const isValid = strapi.service('api::spiel.spiel').validateMatchEvents({
        torschuetzen,
        karten,
        wechsel
      });
      
      return { valid: isValid };
    } catch (error) {
      return ctx.badRequest('Validation failed', { error: error.message });
    }
  },

  /**
   * Custom create with enhanced validation
   */
  async create(ctx) {
    const { data } = ctx.request.body;
    
    try {
      // Validate required relationships exist
      if (data.heimclub) {
        const heimclub = await strapi.entityService.findOne('api::club.club', data.heimclub);
        if (!heimclub) {
          return ctx.badRequest('Heimclub not found');
        }
      }
      
      if (data.auswaertsclub) {
        const auswaertsclub = await strapi.entityService.findOne('api::club.club', data.auswaertsclub);
        if (!auswaertsclub) {
          return ctx.badRequest('Auswaertsclub not found');
        }
      }
      
      if (data.unser_team) {
        const team = await strapi.entityService.findOne('api::team.team', data.unser_team);
        if (!team) {
          return ctx.badRequest('Team not found');
        }
      }
      
      // Create match using default create method (will trigger lifecycles)
      const match = await strapi.entityService.create('api::spiel.spiel', {
        data,
        populate: ['heimclub', 'auswaertsclub', 'unser_team', 'liga', 'saison'] as any
      });
      
      return match;
    } catch (error) {
      return ctx.badRequest('Error creating match', { error: error.message });
    }
  },

  /**
   * Custom update with enhanced validation
   */
  async update(ctx) {
    const { id } = ctx.params;
    const { data } = ctx.request.body;
    
    try {
      // Update match using default update method (will trigger lifecycles)
      const match = await strapi.entityService.update('api::spiel.spiel', parseInt(id), {
        data,
        populate: ['heimclub', 'auswaertsclub', 'unser_team', 'liga', 'saison'] as any
      });
      
      return match;
    } catch (error) {
      return ctx.badRequest('Error updating match', { error: error.message });
    }
  },

  /**
   * Get match statistics summary
   */
  async statistics(ctx) {
    const { id } = ctx.params;
    
    try {
      const stats = await strapi.service('api::spiel.spiel').getMatchStatistics(parseInt(id));
      return stats;
    } catch (error) {
      return ctx.badRequest('Error fetching match statistics', { error: error.message });
    }
  },

  /**
   * Process and validate match events
   */
  async processEvents(ctx) {
    const { matchId } = ctx.params;
    const eventData = ctx.request.body;
    
    try {
      const processedEvents = await strapi.service('api::spiel.spiel').processMatchEvents(eventData);
      
      // Update the match with processed events
      const updatedMatch = await strapi.entityService.update('api::spiel.spiel', parseInt(matchId), {
        data: processedEvents,
        populate: ['heimclub', 'auswaertsclub', 'unser_team', 'liga', 'saison'] as any
      });
      
      return updatedMatch;
    } catch (error) {
      return ctx.badRequest('Error processing match events', { error: error.message });
    }
  },

  /**
   * Trigger manual statistics update for a completed match
   */
  async updateStatistics(ctx) {
    const { id } = ctx.params;
    
    try {
      const match = await strapi.entityService.findOne('api::spiel.spiel', parseInt(id), {
        populate: ['unser_team', 'saison'] as any
      });
      
      if (!match) {
        return ctx.notFound('Match not found');
      }
      
      if (match.status !== 'beendet') {
        return ctx.badRequest('Statistics can only be updated for completed matches');
      }
      
      // For manual statistics update, we would need to implement this differently
      // For now, return a message indicating the feature is available
      return { message: 'Manual statistics update feature - would need to be implemented via lifecycle hooks' };
    } catch (error) {
      return ctx.badRequest('Error updating statistics', { error: error.message });
    }
  }
}));