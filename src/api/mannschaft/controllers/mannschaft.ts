/**
 * mannschaft controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::mannschaft.mannschaft' as any, ({ strapi }) => ({

  // Mannschaften mit Trainern
  async findWithTrainers(ctx) {
    try {
      const { trainerId } = ctx.query;

      let whereClause = {};
      if (trainerId) {
        whereClause = { trainer: trainerId };
      }

      const mannschaften = await strapi.db.query('api::mannschaft.mannschaft').findMany({
        where: whereClause,
        populate: {
          trainer: {
            populate: ['profilfoto']
          },
          teamfoto: true
        }
      });

      ctx.body = {
        success: true,
        data: mannschaften
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Mannschaften mit Trainern:', error);
      ctx.internalServerError('Fehler beim Abrufen der Mannschaften mit Trainern');
    }
  },

  // Aktive Mannschaften
  async findActive(ctx) {
    try {
      const mannschaften = await strapi.db.query('api::mannschaft.mannschaft').findMany({
        where: { status: 'aktiv' },
        populate: {
          trainer: true,
          teamfoto: true
        }
      });

      ctx.body = {
        success: true,
        data: mannschaften
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der aktiven Mannschaften:', error);
      ctx.internalServerError('Fehler beim Abrufen der aktiven Mannschaften');
    }
  },

  // Mannschaften nach Altersklasse
  async findByAgeGroup(ctx) {
    try {
      const { altersklasse } = ctx.params;

      const mannschaften = await strapi.db.query('api::mannschaft.mannschaft').findMany({
        where: { altersklasse },
        populate: {
          trainer: true,
          teamfoto: true
        }
      });

      ctx.body = {
        success: true,
        data: mannschaften
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Mannschaften nach Altersklasse:', error);
      ctx.internalServerError('Fehler beim Abrufen der Mannschaften nach Altersklasse');
    }
  },

  // Mannschaft mit Details
  async findOneWithDetails(ctx) {
    try {
      const { id } = ctx.params;

      const mannschaft = await strapi.db.query('api::mannschaft.mannschaft').findOne({
        where: { id },
        populate: {
          trainer: {
            populate: ['profilfoto']
          },
          kontaktperson: {
            populate: ['profilfoto']
          },
          teamfoto: true
        }
      });

      if (!mannschaft) {
        return ctx.notFound('Mannschaft nicht gefunden');
      }

      // Zusätzliche Statistiken
      const spielerCount = await strapi.db.query('api::spieler.spieler').count({
        where: { mannschaft: id }
      });

      const result = {
        ...mannschaft,
        totalPlayers: spielerCount
      };

      ctx.body = {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Fehler beim Abrufen der Mannschafts-Details:', error);
      ctx.internalServerError('Fehler beim Abrufen der Mannschafts-Details');
    }
  }

})); 