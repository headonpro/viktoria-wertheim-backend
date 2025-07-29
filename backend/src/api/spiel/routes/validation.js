/**
 * Validation routes for Spiel entities
 */

'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/spiel/validate',
      handler: 'validation.validateGame',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/spiel/validate-club/:clubId/liga/:ligaId',
      handler: 'validation.validateClubInLiga',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/spiel/validate-clubs',
      handler: 'validation.validateClubMatch',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/spiel/validation-rules',
      handler: 'validation.getValidationRules',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/spiel/validate-creation',
      handler: 'validation.validateGameCreation',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/spiel/validate-update/:id',
      handler: 'validation.validateGameUpdate',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};