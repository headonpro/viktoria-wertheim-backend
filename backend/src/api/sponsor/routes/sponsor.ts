/**
 * sponsor router
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
    // Custom routes for sponsor management
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
      path: '/sponsoren/grouped',
      handler: 'sponsor.findGrouped',
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
    {
      method: 'PUT',
      path: '/sponsoren/:id/ordering',
      handler: 'sponsor.updateOrdering',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/sponsoren/:id/toggle-active',
      handler: 'sponsor.toggleActive',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Advanced display and rotation routes
    {
      method: 'GET',
      path: '/sponsoren/showcase',
      handler: 'sponsor.getHomepageShowcase',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/sponsoren/rotating',
      handler: 'sponsor.getRotatingSponsors',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/sponsoren/display-order',
      handler: 'sponsor.getDisplayOrder',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/sponsoren/statistics',
      handler: 'sponsor.getStatistics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};