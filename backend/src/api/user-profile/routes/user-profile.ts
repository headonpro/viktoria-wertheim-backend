export default {
  routes: [
    // User profile routes
    {
      method: 'GET',
      path: '/user-profile',
      handler: 'user-profile.getProfile',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/user-profile',
      handler: 'user-profile.updateProfile',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/user-profile/avatar',
      handler: 'user-profile.uploadAvatar',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/user-profile/avatar',
      handler: 'user-profile.removeAvatar',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/user-profile/stats',
      handler: 'user-profile.getStats',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/user-profile/preferences',
      handler: 'user-profile.getPreferences',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/user-profile/preferences',
      handler: 'user-profile.updatePreferences',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};