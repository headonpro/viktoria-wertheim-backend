/**
 * spiel router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Default CRUD routes
    {
      method: 'GET',
      path: '/spiele',
      handler: 'spiel.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/spiele/:id',
      handler: 'spiel.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/spiele',
      handler: 'spiel.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/spiele/:id',
      handler: 'spiel.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/spiele/:id',
      handler: 'spiel.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Custom routes for match management
    {
      method: 'GET',
      path: '/spiele/upcoming',
      handler: 'spiel.upcoming',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/spiele/recent',
      handler: 'spiel.recent',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/spiele/by-team-season',
      handler: 'spiel.byTeamAndSeason',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/spiele/:id/timeline',
      handler: 'spiel.timeline',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/spiele/validate-events',
      handler: 'spiel.validateEvents',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/spiele/:id/statistics',
      handler: 'spiel.statistics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/spiele/:matchId/process-events',
      handler: 'spiel.processEvents',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/spiele/:id/update-statistics',
      handler: 'spiel.updateStatistics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};