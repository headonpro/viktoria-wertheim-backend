/**
 * spielerstatistik controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::spielerstatistik.spielerstatistik' as any, ({ strapi }) => ({
  /**
   * Initialize statistics for a new season
   */
  async initializeForSeason(ctx) {
    const { saisonId } = ctx.params;
    
    if (!saisonId) {
      return ctx.badRequest('Saison ID ist erforderlich');
    }

    try {
      const createdEntries = await strapi.service('api::spielerstatistik.spielerstatistik').initializeForNewSeason(parseInt(saisonId));
      
      return {
        data: createdEntries,
        message: `${createdEntries.length} Statistik-Einträge für Saison ${saisonId} erstellt`
      };
    } catch (error) {
      strapi.log.error('Error initializing season statistics:', error);
      return ctx.internalServerError('Fehler beim Initialisieren der Saison-Statistiken');
    }
  },

  /**
   * Get aggregated statistics for a player in a season
   */
  async getPlayerSeasonTotals(ctx) {
    const { spielerId, saisonId } = ctx.params;
    
    if (!spielerId || !saisonId) {
      return ctx.badRequest('Spieler ID und Saison ID sind erforderlich');
    }

    try {
      const totals = await strapi.service('api::spielerstatistik.spielerstatistik').getPlayerSeasonTotals(
        parseInt(spielerId),
        parseInt(saisonId)
      );
      
      if (!totals) {
        return ctx.notFound('Keine Statistiken für diesen Spieler in dieser Saison gefunden');
      }

      return { data: totals };
    } catch (error) {
      strapi.log.error('Error getting player season totals:', error);
      return ctx.internalServerError('Fehler beim Laden der Spieler-Statistiken');
    }
  },

  /**
   * Get team statistics for a season
   */
  async getTeamSeasonStatistics(ctx) {
    const { teamId, saisonId } = ctx.params;
    
    if (!teamId || !saisonId) {
      return ctx.badRequest('Team ID und Saison ID sind erforderlich');
    }

    try {
      const statistics = await strapi.service('api::spielerstatistik.spielerstatistik').getTeamSeasonStatistics(
        parseInt(teamId),
        parseInt(saisonId)
      );
      
      return { data: statistics };
    } catch (error) {
      strapi.log.error('Error getting team season statistics:', error);
      return ctx.internalServerError('Fehler beim Laden der Team-Statistiken');
    }
  },

  /**
   * Update statistics from match event
   */
  async updateFromMatchEvent(ctx) {
    const { spielerId, teamId, saisonId } = ctx.params;
    const { eventType, value = 1 } = ctx.request.body;
    
    if (!spielerId || !teamId || !saisonId || !eventType) {
      return ctx.badRequest('Spieler ID, Team ID, Saison ID und Event-Typ sind erforderlich');
    }

    const validEventTypes = ['tor', 'assist', 'gelbe_karte', 'rote_karte', 'spiel', 'minuten', 'startelf', 'einwechslung'];
    if (!validEventTypes.includes(eventType)) {
      return ctx.badRequest(`Ungültiger Event-Typ. Erlaubt sind: ${validEventTypes.join(', ')}`);
    }

    try {
      const updatedEntry = await strapi.service('api::spielerstatistik.spielerstatistik').updateFromMatchEvent(
        parseInt(spielerId),
        parseInt(teamId),
        parseInt(saisonId),
        eventType,
        parseInt(value)
      );
      
      return { data: updatedEntry };
    } catch (error) {
      strapi.log.error('Error updating statistics from match event:', error);
      return ctx.internalServerError('Fehler beim Aktualisieren der Statistiken');
    }
  },

  /**
   * Get top scorers for a season
   */
  async getTopScorers(ctx) {
    const { saisonId } = ctx.params;
    const { limit = 10 } = ctx.query;
    
    if (!saisonId) {
      return ctx.badRequest('Saison ID ist erforderlich');
    }

    try {
      const topScorers = await strapi.service('api::spielerstatistik.spielerstatistik').getTopScorers(
        parseInt(saisonId),
        parseInt(limit as string)
      );
      
      return { data: topScorers };
    } catch (error) {
      strapi.log.error('Error getting top scorers:', error);
      return ctx.internalServerError('Fehler beim Laden der Torschützenliste');
    }
  }
}));