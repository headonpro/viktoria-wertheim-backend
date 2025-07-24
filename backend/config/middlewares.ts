export default [
  'strapi::logger',
  'strapi::errors',
  // Enhanced error handler for better validation messages
  {
    name: 'global::enhanced-error-handler',
    config: {},
  },
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.178.59:3000'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept'],
      keepHeaderOnError: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  // Role-based access control middleware
  {
    name: 'global::role-based-access',
    config: {},
  },
  // Avatar upload validation middleware
  {
    name: 'global::avatar-upload',
    config: {},
  },
];
