export default {
  routes: [
    {
      method: 'GET',
      path: '/auth/me',
      handler: 'auth.me',
      config: {
        prefix: '',
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/register-member',
      handler: 'auth.registerMember',
      config: {
        prefix: '',
        policies: [],
      },
    },
    {
      method: 'PUT',
      path: '/auth/update-profile',
      handler: 'auth.updateProfile',
      config: {
        prefix: '',
        policies: [],
      },
    },
    {
      method: 'POST',
      path: '/auth/change-password',
      handler: 'auth.changePassword',
      config: {
        prefix: '',
        policies: [],
      },
    },
  ],
};