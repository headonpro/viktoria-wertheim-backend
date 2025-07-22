import type { Core } from '@strapi/strapi';

/**
 * Role-based access control middleware
 * Provides additional security layer for API endpoints based on user roles
 */
export default (config: any, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: any) => {
    // Skip middleware for admin panel requests
    if (ctx.request.url.startsWith('/admin')) {
      return await next();
    }

    // Skip middleware for public endpoints (no authentication required)
    if (!ctx.state.user) {
      return await next();
    }

    const user = ctx.state.user;
    const userRole = user.role?.name;
    const method = ctx.request.method;
    const path = ctx.request.path;

    // Define role-based access rules
    const accessRules = {
      'Admin': {
        // Admin has full access to everything
        allowAll: true
      },
      'Redakteur': {
        // Redakteur can manage content but not system data
        allowed: {
          'GET': ['*'], // Read access to all
          'POST': ['/api/news-artikel', '/api/veranstaltung', '/api/kategorie'],
          'PUT': ['/api/news-artikel', '/api/veranstaltung', '/api/kategorie', '/api/team', '/api/spieler'],
          'DELETE': ['/api/news-artikel', '/api/veranstaltung', '/api/kategorie']
        }
      },
      'Vereinsvorstand': {
        // Board members can manage teams, members, and events
        allowed: {
          'GET': ['*'], // Read access to all
          'POST': ['/api/team', '/api/mitglied', '/api/spieler', '/api/spiel', '/api/veranstaltung', '/api/sponsor', '/api/news-artikel'],
          'PUT': ['/api/team', '/api/mitglied', '/api/spieler', '/api/spiel', '/api/veranstaltung', '/api/sponsor', '/api/news-artikel', '/api/spielerstatistik'],
          'DELETE': ['/api/team', '/api/mitglied', '/api/spieler', '/api/veranstaltung', '/api/sponsor']
        }
      },
      'Mitglied': {
        // Members have read-only access plus limited self-management
        allowed: {
          'GET': ['*'], // Read access to all public content
          'PUT': ['/api/mitglied'] // Can only update own member data (handled by custom logic)
        }
      }
    };

    // Check if user has required role
    if (!userRole || !accessRules[userRole as keyof typeof accessRules]) {
      ctx.status = 403;
      ctx.body = { error: 'Access denied: Invalid role' };
      return;
    }

    const roleRules = accessRules[userRole as keyof typeof accessRules];

    // Admin has full access
    if ('allowAll' in roleRules && roleRules.allowAll) {
      return await next();
    }

    // Check method-specific permissions
    const allowedPaths = 'allowed' in roleRules ? roleRules.allowed?.[method as keyof typeof roleRules.allowed] : undefined;
    
    if (!allowedPaths) {
      ctx.status = 403;
      ctx.body = { error: `Access denied: ${method} not allowed for role ${userRole}` };
      return;
    }

    // Check if path is allowed
    const isAllowed = allowedPaths.includes('*') || 
                     allowedPaths.some((allowedPath: string) => path.startsWith(allowedPath));

    if (!isAllowed) {
      ctx.status = 403;
      ctx.body = { error: `Access denied: ${method} ${path} not allowed for role ${userRole}` };
      return;
    }

    // Special handling for member self-management
    if (userRole === 'Mitglied' && method === 'PUT' && path.startsWith('/api/mitglied')) {
      // Members can only update their own data
      const entityId = path.split('/').pop();
      if (entityId && entityId !== 'me') {
        // Check if the member record belongs to the current user
        const memberRecord = await strapi.entityService.findOne('api::mitglied.mitglied', entityId, {
          populate: ['website_user']
        });

        if (!memberRecord || (memberRecord as any).website_user?.id !== user.id) {
          ctx.status = 403;
          ctx.body = { error: 'Access denied: Can only update own member data' };
          return;
        }
      }
    }

    await next();
  };
};