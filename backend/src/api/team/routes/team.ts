/**
 * team router - Ultra-simplified version
 */

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
    

  ],
};