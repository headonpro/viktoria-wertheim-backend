'use strict';

/**
 * Club management routes for admin panel operations
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/clubs/export',
      handler: 'management.export',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/clubs/import',
      handler: 'management.import',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/clubs/bulk-update',
      handler: 'management.bulkUpdate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/clubs/statistics',
      handler: 'management.statistics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/clubs/validate-integrity',
      handler: 'management.validateIntegrity',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};