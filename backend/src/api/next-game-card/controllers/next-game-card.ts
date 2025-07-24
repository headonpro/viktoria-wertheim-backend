/**
 * next-game-card controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::next-game-card.next-game-card' as any, ({ strapi }) => ({
  // Get next upcoming match for homepage
  async findNext(ctx) {
    try {
      const now = new Date().toISOString();
      console.log('Finding next match - Current time:', now);
      
      const nextMatch = await strapi.entityService.findMany('api::next-game-card.next-game-card' as any, {
        filters: {
          datum: {
            $gte: now
          }
        },
        sort: { datum: 'asc' },
        limit: 1,
        populate: {
          gegner_club: {
            fields: ['name', 'kurz_name'],
            populate: {
              logo: true
            }
          }
        }
      });

      console.log('Found next matches:', nextMatch);
      return { data: nextMatch[0] || null };
    } catch (error) {
      console.error('Error in findNext:', error);
      ctx.throw(500, 'Error fetching next match');
    }
  }
}));