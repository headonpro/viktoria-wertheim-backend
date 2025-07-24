/**
 * Custom game-card routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/game-cards/next',
      handler: 'api::game-card.game-card.findNext',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/game-cards/last',
      handler: 'api::game-card.game-card.findLast',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};