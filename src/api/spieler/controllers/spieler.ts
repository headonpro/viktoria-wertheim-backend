/**
 * spieler controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::spieler.spieler' as any, ({ strapi }) => ({
  
  // Spieler-Statistiken abrufen
  async getPlayerStats(ctx) {
    try {
      const { id } = ctx.params;

      const spieler = await strapi.db.query('api::spieler.spieler').findOne({
        where: { id },
        populate: {
          mitglied: {
            populate: ['profilfoto', 'adresse']
          },
          mannschaft: {
            populate: ['teamfoto', 'trainer']
          },
          spielerfoto: true
        }
      });

      if (!spieler) {
        return ctx.notFound('Spieler nicht gefunden');
      }

      // Berechne zusätzliche Statistiken
      const stats = {
        ...spieler,
        durchschnittToreProSpiel: spieler.spiele_saison > 0 ? 
          (spieler.tore_saison / spieler.spiele_saison).toFixed(2) : 0,
        durchschnittMinutenProSpiel: spieler.spiele_saison > 0 ? 
          Math.round(spieler.einsatzminuten / spieler.spiele_saison) : 0,
        torQuote: spieler.spiele_saison > 0 ? 
          ((spieler.tore_saison / spieler.spiele_saison) * 100).toFixed(1) : 0
      };

      ctx.body = {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Spieler-Statistiken:', error);
      ctx.internalServerError('Fehler beim Abrufen der Spieler-Statistiken');
    }
  },

  // Spieler nach Mannschaft
  async findByTeam(ctx) {
    try {
      const { teamId } = ctx.params;

      const spielers = await strapi.db.query('api::spieler.spieler').findMany({
        where: { mannschaft: teamId },
        populate: {
          mitglied: {
            populate: ['profilfoto']
          },
          spielerfoto: true
        },
        orderBy: [
          { rueckennummer: 'asc' },
          { 'mitglied.nachname': 'asc' }
        ]
      });

      ctx.body = {
        success: true,
        data: spielers,
        count: spielers.length
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Mannschafts-Spieler:', error);
      ctx.internalServerError('Fehler beim Abrufen der Mannschafts-Spieler');
    }
  },

  // Top-Torschützen
  async getTopScorers(ctx) {
    try {
      const { limit = 10, teamId } = ctx.query;

      const whereClause: any = {
        tore_saison: { $gt: 0 }
      };

      if (teamId) {
        whereClause.mannschaft = teamId;
      }

      const topScorers = await strapi.db.query('api::spieler.spieler').findMany({
        where: whereClause,
        populate: {
          mitglied: {
            populate: ['profilfoto']
          },
          mannschaft: true,
          spielerfoto: true
        },
        orderBy: { tore_saison: 'desc' },
        limit: parseInt(limit as string)
      });

      ctx.body = {
        success: true,
        data: topScorers,
        count: topScorers.length
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Top-Torschützen:', error);
      ctx.internalServerError('Fehler beim Abrufen der Top-Torschützen');
    }
  },

  // Spieler nach Position
  async findByPosition(ctx) {
    try {
      const { position } = ctx.params;
      const { teamId } = ctx.query;

      const whereClause: any = { position };
      if (teamId) {
        whereClause.mannschaft = teamId;
      }

      const spielers = await strapi.db.query('api::spieler.spieler').findMany({
        where: whereClause,
        populate: {
          mitglied: {
            populate: ['profilfoto']
          },
          mannschaft: true,
          spielerfoto: true
        },
        orderBy: { rueckennummer: 'asc' }
      });

      ctx.body = {
        success: true,
        data: spielers,
        count: spielers.length
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Spieler nach Position:', error);
      ctx.internalServerError('Fehler beim Abrufen der Spieler nach Position');
    }
  },

  // Verletzte Spieler
  async getInjuredPlayers(ctx) {
    try {
      const { teamId } = ctx.query;

      const whereClause: any = { status: 'verletzt' };
      if (teamId) {
        whereClause.mannschaft = teamId;
      }

      const verletzteSpiele = await strapi.db.query('api::spieler.spieler').findMany({
        where: whereClause,
        populate: {
          mitglied: true,
          mannschaft: true
        },
        orderBy: { rueckennummer: 'asc' }
      });

      ctx.body = {
        success: true,
        data: verletzteSpiele,
        count: verletzteSpiele.length
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der verletzten Spieler:', error);
      ctx.internalServerError('Fehler beim Abrufen der verletzten Spieler');
    }
  }

})); 