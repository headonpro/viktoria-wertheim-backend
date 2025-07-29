'use strict';

/**
 * Custom routes for club population
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/clubs/populate',
      handler: 'populate.populate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};