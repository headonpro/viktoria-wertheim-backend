/**
 * tabellen-eintrag router - Ultra-simplified version
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::tabellen-eintrag.tabellen-eintrag', {
  config: {
    find: {
      middlewares: [],
    },
    findOne: {
      middlewares: [],
    },
  },
});