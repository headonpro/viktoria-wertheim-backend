/**
 * game-card controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::game-card.game-card' as any, ({ strapi }) => ({
  // Get next upcoming match for homepage
  async findNext(ctx) {
    try {
      const now = new Date().toISOString();
      
      const nextMatch = await strapi.entityService.findMany('api::game-card.game-card' as any, {
        filters: {
          datum: {
            $gte: now
          }
        },
        sort: { datum: 'asc' },
        limit: 1
      });

      return { data: nextMatch[0] || null };
    } catch (error) {
      ctx.throw(500, 'Error fetching next match');
    }
  },

  // Get last completed match for homepage
  async findLast(ctx) {
    try {
      const now = new Date().toISOString();
      
      const lastMatch = await strapi.entityService.findMany('api::game-card.game-card' as any, {
        filters: {
          datum: {
            $lt: now
          },
          // Nur Spiele mit Ergebnis (beide Tore-Felder sind nicht null)
          unsere_tore: {
            $notNull: true
          },
          gegner_tore: {
            $notNull: true
          }
        },
        sort: { datum: 'desc' },
        limit: 1
      });

      return { data: lastMatch[0] || null };
    } catch (error) {
      ctx.throw(500, 'Error fetching last match');
    }
  }
}));