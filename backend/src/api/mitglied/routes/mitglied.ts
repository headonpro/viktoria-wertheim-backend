/**
 * mitglied router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::mitglied.mitglied', {
  config: {
    find: {
      middlewares: ['api::mitglied.privacy-filter']
    },
    findOne: {
      middlewares: ['api::mitglied.privacy-filter']
    }
  }
});

// Additional custom routes
export const customRoutes = {
  routes: [
    {
      method: 'GET',
      path: '/mitglieder/public',
      handler: 'mitglied.findPublic',
      config: {
        policies: [],
        middlewares: []
      }
    }
  ]
};