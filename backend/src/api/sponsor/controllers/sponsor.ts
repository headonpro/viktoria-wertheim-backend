/**
 * sponsor controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::sponsor.sponsor', ({ strapi }) => ({
  /**
   * Get active sponsors with proper ordering
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
   * Get sponsors grouped by category
   */
  async findGrouped(ctx) {
    try {
      const { activeOnly = 'true' } = ctx.query;
      
      const groupedSponsors = await strapi.service('api::sponsor.sponsor').getSponsorsGroupedByCategory(
        activeOnly === 'true'
      );
      
      return { data: groupedSponsors };
    } catch (error) {
      ctx.throw(400, error.message);
    }
  },

  /**
   * Update sponsor ordering
   */
  async updateOrdering(ctx) {
    try {
      const { id } = ctx.params;
      const { reihenfolge } = ctx.request.body;

      if (typeof reihenfolge !== 'number') {
        ctx.throw(400, 'Reihenfolge muss eine Zahl sein');
      }

      const updatedSponsor = await strapi.service('api::sponsor.sponsor').updateOrdering(
        parseInt(id),
        reihenfolge
      );
      
      return this.transformResponse(updatedSponsor);
    } catch (error) {
      ctx.throw(400, error.message);
    }
  },

  /**
   * Toggle sponsor active status
   */
  async toggleActive(ctx) {
    try {
      const { id } = ctx.params;

      const updatedSponsor = await strapi.service('api::sponsor.sponsor').toggleActiveStatus(
        parseInt(id)
      );
      
      return this.transformResponse(updatedSponsor);
    } catch (error) {
      ctx.throw(400, error.message);
    }
  },

  /**
   * Get sponsors for homepage showcase
   */
  async getHomepageShowcase(ctx) {
    try {
      const { maxSponsors = '6' } = ctx.query;
      
      const showcaseSponsors = await strapi.service('api::sponsor.sponsor').getHomepageShowcase(
        parseInt(maxSponsors as string)
      );
      
      return this.transformResponse(showcaseSponsors);
    } catch (error) {
      ctx.throw(400, error.message);
    }
  },

  /**
   * Get rotating sponsors for dynamic display
   */
  async getRotatingSponsors(ctx) {
    try {
      const { seed } = ctx.query;
      
      const rotatingSponsors = await strapi.service('api::sponsor.sponsor').getRotatingSponsors(
        seed ? parseInt(seed as string) : undefined
      );
      
      return this.transformResponse(rotatingSponsors);
    } catch (error) {
      ctx.throw(400, error.message);
    }
  },

  /**
   * Get sponsor display order with advanced options
   */
  async getDisplayOrder(ctx) {
    try {
      const {
        activeOnly = 'true',
        prioritizeCategory,
        randomize = 'false',
        limit,
      } = ctx.query;

      const options = {
        activeOnly: activeOnly === 'true',
        prioritizeCategory: prioritizeCategory as string || undefined,
        randomize: randomize === 'true',
        limit: limit ? parseInt(limit as string) : undefined,
      };

      const sponsors = await strapi.service('api::sponsor.sponsor').getSponsorDisplayOrder(options);
      
      return this.transformResponse(sponsors);
    } catch (error) {
      ctx.throw(400, error.message);
    }
  },

  /**
   * Get sponsor statistics
   */
  async getStatistics(ctx) {
    try {
      const stats = await strapi.service('api::sponsor.sponsor').getSponsorStatistics();
      
      return { data: stats };
    } catch (error) {
      ctx.throw(400, error.message);
    }
  },

  /**
   * Override default find to include proper ordering
   */
  async find(ctx) {
    const { query } = ctx;
    
    // If no specific sorting is requested, use our default ordering
    if (!query.sort) {
      query.sort = ['kategorie:asc', 'reihenfolge:asc', 'name:asc'];
    }
    
    // Always populate logo by default
    if (!query.populate) {
      query.populate = ['logo'];
    }

    return await super.find(ctx);
  },
}));