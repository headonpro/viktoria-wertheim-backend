/**
 * news-artikel service - Ultra-simplified version
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::news-artikel.news-artikel', ({ strapi }) => ({
  
  /**
   * Find articles with basic filtering
   */
  async findWithPopulate(params = {}) {
    return await strapi.entityService.findMany('api::news-artikel.news-artikel', {
      ...params,
      populate: ['titelbild'],
      sort: { datum: 'desc' }
    });
  },

  /**
   * Find featured articles
   */
  async findFeatured(limit = 5) {
    return await strapi.entityService.findMany('api::news-artikel.news-artikel', {
      filters: {
        featured: true,
        publishedAt: { $notNull: true }
      },
      sort: { datum: 'desc' },
      limit,
      populate: ['titelbild']
    });
  }

}));