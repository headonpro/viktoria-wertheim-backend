/**
 * veranstaltung controller - Ultra-simplified version
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::veranstaltung.veranstaltung', ({ strapi }) => ({
  
  async find(ctx) {
    const { query } = ctx;
    
    if (!query.filters) {
      query.filters = {};
    }
    
    // Simple public filter - no auth logic
    (query.filters as any).publishedAt = { $notNull: true };
    (query.filters as any).oeffentlich = true;
    
    if (!query.sort) {
      query.sort = { datum: 'asc' };
    }
    
    if (!query.populate) {
      query.populate = ['titelbild'];
    }
    
    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  // Get upcoming events
  async getUpcoming(ctx) {
    try {
      const { limit = 10 } = ctx.query;
      
      const events = await strapi.service('api::veranstaltung.veranstaltung').findUpcoming(
        parseInt(limit as string)
      );

      ctx.body = { data: events };
    } catch (error) {
      ctx.throw(500, `Failed to fetch upcoming events: ${error.message}`);
    }
  }

}));