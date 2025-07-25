/**
 * sponsor service - Ultra-simplified version
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::sponsor.sponsor', ({ strapi }) => ({
  
  /**
   * Find active sponsors with basic ordering
   */
  async findActiveSponsors(params: any = {}) {
    return await strapi.entityService.findMany('api::sponsor.sponsor', {
      ...params,
      filters: {
        aktiv: true,
        ...(params.filters || {})
      },
      sort: [
        { kategorie: 'asc' },
        { reihenfolge: 'asc' },
        { name: 'asc' }
      ],
      populate: ['logo']
    });
  },

  /**
   * Find sponsors by category
   */
  async findByCategory(kategorie: string, activeOnly = true) {
    const filters: any = { kategorie };
    
    if (activeOnly) {
      filters.aktiv = true;
    }

    return await strapi.entityService.findMany('api::sponsor.sponsor', {
      filters,
      sort: [
        { reihenfolge: 'asc' },
        { name: 'asc' }
      ],
      populate: ['logo']
    });
  }

}));