/**
 * Data Integrity Routes
 * 
 * Routes for data consistency validation endpoints
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/system-maintenance/data-integrity/validate-all',
      handler: 'data-integrity.validateAll',
      config: {
        policies: [],
        middlewares: [],
        auth: false, // Set to true in production with proper authentication
        description: 'Run comprehensive data integrity validation',
        tags: ['system-maintenance', 'data-integrity']
      }
    },
    {
      method: 'GET',
      path: '/system-maintenance/data-integrity/validate-teams',
      handler: 'data-integrity.validateTeams',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
        description: 'Validate team relations and consistency',
        tags: ['system-maintenance', 'data-integrity', 'teams']
      }
    },
    {
      method: 'GET',
      path: '/system-maintenance/data-integrity/validate-spiele',
      handler: 'data-integrity.validateSpiele',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
        description: 'Validate spiel relations and consistency',
        tags: ['system-maintenance', 'data-integrity', 'spiele']
      }
    },
    {
      method: 'GET',
      path: '/system-maintenance/data-integrity/validate-spielers',
      handler: 'data-integrity.validateSpielers',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
        description: 'Validate spieler relations and consistency',
        tags: ['system-maintenance', 'data-integrity', 'spielers']
      }
    },
    {
      method: 'GET',
      path: '/system-maintenance/data-integrity/statistics',
      handler: 'data-integrity.getStatistics',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
        description: 'Get data statistics for monitoring',
        tags: ['system-maintenance', 'statistics']
      }
    },
    {
      method: 'GET',
      path: '/system-maintenance/data-integrity/check-mannschaft-removal',
      handler: 'data-integrity.checkMannschaftRemoval',
      config: {
        policies: [],
        middlewares: [],
        auth: false,
        description: 'Check that mannschaft references have been removed',
        tags: ['system-maintenance', 'data-integrity', 'mannschaft']
      }
    }
  ]
};