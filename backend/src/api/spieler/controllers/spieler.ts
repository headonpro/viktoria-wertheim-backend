/**
 * spieler controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::spieler.spieler', ({ strapi }) => ({
  /**
   * Get players by team
   */
  async findByTeam(ctx) {
    const { teamId } = ctx.params;
    
    if (!teamId) {
      return ctx.badRequest('Team ID ist erforderlich');
    }

    try {
      const players = await strapi.service('api::spieler.spieler').findByTeam(parseInt(teamId));
      return { data: players };
    } catch (error) {
      return ctx.internalServerError('Fehler beim Laden der Spieler');
    }
  },

  /**
   * Get available jersey numbers for a team
   */
  async getAvailableJerseyNumbers(ctx) {
    const { teamId } = ctx.params;
    const { excludePlayerId } = ctx.query;
    
    if (!teamId) {
      return ctx.badRequest('Team ID ist erforderlich');
    }

    try {
      const availableNumbers = await strapi.service('api::spieler.spieler').getAvailableJerseyNumbers(
        parseInt(teamId),
        excludePlayerId ? parseInt(excludePlayerId as string) : undefined
      );
      
      return { data: availableNumbers };
    } catch (error) {
      return ctx.internalServerError('Fehler beim Laden der verfügbaren Rückennummern');
    }
  },

  /**
   * Validate team assignment for a player
   */
  async validateTeamAssignment(ctx) {
    const { id } = ctx.params;
    
    if (!id) {
      return ctx.badRequest('Spieler ID ist erforderlich');
    }

    try {
      const validation = await strapi.service('api::spieler.spieler').validateTeamAssignment(parseInt(id));
      return { data: validation };
    } catch (error) {
      return ctx.internalServerError('Fehler bei der Validierung der Team-Zuordnung');
    }
  }
}));