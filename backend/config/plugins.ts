export default () => ({
  'users-permissions': {
    config: {
      jwt: {
        expiresIn: '7d', // JWT token expires in 7 days
      },
      register: {
        allowedFields: ['username', 'email', 'password', 'displayName'],
      },
      // Enable email confirmation for new registrations
      emailConfirmation: true,
      // Custom role assignment settings
      defaultRole: 'authenticated', // Default role for new users
    },
  },
});
