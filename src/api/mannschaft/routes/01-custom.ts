/**
 * mannschaft custom router
 */

export default {
  routes: [
    // Custom Routes
    {
      method: 'GET',
      path: '/mannschaften/with-trainers',
      handler: 'mannschaft.findWithTrainers',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/mannschaften/active',
      handler: 'mannschaft.findActive',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/mannschaften/age-group/:altersklasse',
      handler: 'mannschaft.findByAgeGroup',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/mannschaften/:id/details',
      handler: 'mannschaft.findOneWithDetails',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
}; 