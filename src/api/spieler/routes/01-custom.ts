/**
 * spieler custom router
 */

export default {
  routes: [
    // Player statistics
    {
      method: 'GET',
      path: '/spielers/:id/stats',
      handler: 'spieler.getPlayerStats',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Players by team
    {
      method: 'GET',
      path: '/spielers/team/:teamId',
      handler: 'spieler.findByTeam',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Top scorers
    {
      method: 'GET',
      path: '/spielers/top-scorers',
      handler: 'spieler.getTopScorers',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Players by position
    {
      method: 'GET',
      path: '/spielers/position/:position',
      handler: 'spieler.findByPosition',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Injured players
    {
      method: 'GET',
      path: '/spielers/injured',
      handler: 'spieler.getInjuredPlayers',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 