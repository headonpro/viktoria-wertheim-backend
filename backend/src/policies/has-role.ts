/**
 * Policy to check if user has required role(s)
 */
export default (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: any) => {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const userRole = user.role?.name;
    const { roles } = config;

    if (!roles || !Array.isArray(roles)) {
      strapi.log.error('has-role policy: roles configuration is required and must be an array');
      return ctx.badRequest('Policy configuration error');
    }

    // Check if user has one of the required roles
    if (roles.includes(userRole)) {
      return await next();
    }

    return ctx.forbidden(`Access denied. Required roles: ${roles.join(', ')}`);
  };
};