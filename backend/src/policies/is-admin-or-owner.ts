/**
 * Policy to check if user is admin or owns the resource
 */
export default (policyContext: any, config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: any) => {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const userRole = user.role?.name;

    // Admin has access to everything
    if (userRole === 'Admin') {
      return await next();
    }

    // For other roles, check ownership or specific permissions
    const { resourceType, ownerField = 'website_user' } = config;

    if (resourceType && ctx.params.id) {
      try {
        // Get the resource
        const resource = await strapi.entityService.findOne(resourceType, ctx.params.id, {
          populate: [ownerField],
        });

        if (!resource) {
          return ctx.notFound('Resource not found');
        }

        // Check if user owns the resource
        const ownerId = resource[ownerField]?.id || resource[ownerField];
        if (ownerId === user.id) {
          return await next();
        }

        // Check role-specific permissions
        if (userRole === 'Vereinsvorstand' && ['api::mitglied.mitglied', 'api::team.team', 'api::spieler.spieler'].includes(resourceType)) {
          return await next();
        }

        if (userRole === 'Redakteur' && ['api::news-artikel.news-artikel', 'api::veranstaltung.veranstaltung'].includes(resourceType)) {
          return await next();
        }

        return ctx.forbidden('Access denied');
      } catch (error) {
        strapi.log.error('Error in is-admin-or-owner policy:', error);
        return ctx.badRequest('Error checking permissions');
      }
    }

    return ctx.forbidden('Access denied');
  };
};