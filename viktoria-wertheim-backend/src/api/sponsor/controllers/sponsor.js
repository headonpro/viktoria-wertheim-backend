'use strict';

/**
 * sponsor controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::sponsor.sponsor', ({ strapi }) => ({
  // Custom controller methods can be added here
  
  async find(ctx) {
    // Add default filtering for active sponsors only
    const { query } = ctx;
    
    // Add filter for active sponsors if not explicitly set
    if (!query.filters || !query.filters.aktiv) {
      query.filters = {
        ...query.filters,
        aktiv: true
      };
    }
    
    // Call the default core action
    const { data, meta } = await super.find(ctx);
    
    return { data, meta };
  }
}));