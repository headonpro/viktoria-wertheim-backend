/**
 * Custom next-game-card routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/next-game-cards/next',
      handler: 'api::next-game-card.next-game-card.findNext',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};