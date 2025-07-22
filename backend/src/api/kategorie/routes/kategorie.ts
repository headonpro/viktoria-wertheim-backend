/**
 * kategorie router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Default CRUD routes
    {
      method: 'GET',
      path: '/kategorien',
      handler: 'kategorie.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/kategorien/:id',
      handler: 'kategorie.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/kategorien',
      handler: 'kategorie.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/kategorien/:id',
      handler: 'kategorie.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/kategorien/:id',
      handler: 'kategorie.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Custom routes for category management
    {
      method: 'POST',
      path: '/kategorien/initialize',
      handler: 'kategorie.initializeCategories',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/kategorien/reorder',
      handler: 'kategorie.reorder',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};