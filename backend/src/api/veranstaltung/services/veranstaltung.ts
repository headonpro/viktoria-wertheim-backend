/**
 * veranstaltung service - Ultra-simplified version
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::veranstaltung.veranstaltung', ({ strapi }) => ({
  
  /**
   * Find events with basic population
   */
  async findWithPopulate(params = {}) {
    return await strapi.entityService.findMany('api::veranstaltung.veranstaltung', {
      ...params,
      populate: ['titelbild'],
      sort: { datum: 'asc' }
    });
  },

  /**
   * Find upcoming events
   */
  async findUpcoming(limit = 10) {
    const today = new Date().toISOString().split('T')[0];
    
    return await strapi.entityService.findMany('api::veranstaltung.veranstaltung', {
      filters: {
        datum: { $gte: today },
        publishedAt: { $notNull: true },
        oeffentlich: true
      },
      sort: { datum: 'asc' },
      limit,
      populate: ['titelbild']
    });
  }

}));