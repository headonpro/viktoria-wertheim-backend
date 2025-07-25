/**
 * sponsor router - Ultra-simplified version
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Default CRUD routes
    {
      method: 'GET',
      path: '/sponsoren',
      handler: 'sponsor.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/sponsoren/:id',
      handler: 'sponsor.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/sponsoren',
      handler: 'sponsor.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/sponsoren/:id',
      handler: 'sponsor.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/sponsoren/:id',
      handler: 'sponsor.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Basic custom routes only
    {
      method: 'GET',
      path: '/sponsoren/active',
      handler: 'sponsor.findActive',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/sponsoren/category/:kategorie',
      handler: 'sponsor.findByCategory',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};