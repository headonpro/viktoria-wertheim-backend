/**
 * tabellen-eintrag controller - Ultra-simplified version
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::tabellen-eintrag.tabellen-eintrag', ({ strapi }) => ({
  
  async find(ctx) {
    const { data, meta } = await super.find(ctx);
    
    // Sort by position (platz) by default if no sort parameter is provided
    if (!ctx.query.sort) {
      data.sort((a, b) => a.attributes.platz - b.attributes.platz);
    }
    
    return { data, meta };
  }

}));