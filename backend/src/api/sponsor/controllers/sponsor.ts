/**
 * sponsor controller - Ultra-simplified version
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::sponsor.sponsor', ({ strapi }) => ({
  
  /**
   * Get active sponsors
   */
  async findActive(ctx) {
    try {
      const sponsors = await strapi.service('api::sponsor.sponsor').findActiveSponsors(ctx.query);
      return this.transformResponse(sponsors);
    } catch (error) {
      ctx.throw(400, error.message);
    }
  },

  /**
   * Get sponsors by category
   */
  async findByCategory(ctx) {
    try {
      const { kategorie } = ctx.params;
      const { activeOnly = 'true' } = ctx.query;
      
      if (!['Hauptsponsor', 'Premium', 'Partner'].includes(kategorie)) {
        ctx.throw(400, 'Ungültige Kategorie. Erlaubt: Hauptsponsor, Premium, Partner');
      }

      const sponsors = await strapi.service('api::sponsor.sponsor').findByCategory(
        kategorie,
        activeOnly === 'true'
      );
      
      return this.transformResponse(sponsors);
    } catch (error) {
      ctx.throw(400, error.message);
    }
  },

  /**
   * Override default find to include proper ordering
   */
  async find(ctx) {
    const { query } = ctx;
    
    if (!query.sort) {
      query.sort = ['kategorie:asc', 'reihenfolge:asc', 'name:asc'];
    }
    
    if (!query.populate) {
      query.populate = ['logo'];
    }

    return await super.find(ctx);
  }

}));