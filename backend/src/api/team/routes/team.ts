/**
 * team router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Default CRUD routes
    {
      method: 'GET',
      path: '/teams',
      handler: 'team.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/teams/:id',
      handler: 'team.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/teams',
      handler: 'team.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/teams/:id',
      handler: 'team.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/teams/:id',
      handler: 'team.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Custom routes for team management
    {
      method: 'GET',
      path: '/teams/by-season',
      handler: 'team.bySeason',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/teams/by-league',
      handler: 'team.byLeague',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/teams/active',
      handler: 'team.active',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/teams/:id/with-matches',
      handler: 'team.withMatches',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/teams/:id/roster',
      handler: 'team.roster',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/teams/:id/update-statistics',
      handler: 'team.updateStatistics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/teams/standings',
      handler: 'team.standings',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/teams/:id/validate',
      handler: 'team.validate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/teams/:id/details',
      handler: 'team.details',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};