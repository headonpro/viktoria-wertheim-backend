/**
 * saison controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::saison.saison' as any, ({ strapi }) => ({
  // Custom controller methods can be added here
  // For example, to ensure only one active season exists
  async create(ctx) {
    const { data } = ctx.request.body;
    
    // If creating an active season, deactivate all others
    if (data.aktiv) {
      const activeSeasons = await strapi.entityService.findMany('api::saison.saison' as any, {
        filters: { aktiv: true }
      });
      
      const seasonsArray = Array.isArray(activeSeasons) ? activeSeasons : [activeSeasons];
      for (const season of seasonsArray) {
        if (season && season.id) {
          await strapi.entityService.update('api::saison.saison' as any, season.id, {
            data: { aktiv: false }
          });
        }
      }
    }
    
    return super.create(ctx);
  },
  
  async update(ctx) {
    const { data } = ctx.request.body;
    
    // If setting a season as active, deactivate all others
    if (data.aktiv) {
      const activeSeasons = await strapi.entityService.findMany('api::saison.saison' as any, {
        filters: { aktiv: true }
      });
      
      const seasonsArray = Array.isArray(activeSeasons) ? activeSeasons : [activeSeasons];
      for (const season of seasonsArray) {
        if (season && season.id) {
          await strapi.entityService.update('api::saison.saison' as any, season.id, {
            data: { aktiv: false }
          });
        }
      }
    }
    
    return super.update(ctx);
  }
}));