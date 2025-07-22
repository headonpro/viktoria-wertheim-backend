export default {
  routes: [
    // Admin-only routes for user management
    {
      method: 'POST',
      path: '/user-management/assign-role',
      handler: 'user-management.assignRole',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/user-management/user/:id',
      handler: 'user-management.getUserWithRole',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/user-management/users/role/:roleName',
      handler: 'user-management.getUsersByRole',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/user-management/create-user',
      handler: 'user-management.createUserWithRole',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/user-management/link-member',
      handler: 'user-management.linkMemberToUser',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/user-management/roles',
      handler: 'user-management.getRoles',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // User-accessible routes
    {
      method: 'GET',
      path: '/user-management/my-member',
      handler: 'user-management.getMyMember',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/user-management/profile',
      handler: 'user-management.getProfile',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/user-management/profile',
      handler: 'user-management.updateProfile',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};