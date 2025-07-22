/**
 * Privacy filter middleware for mitglied content type
 * Filters out private data based on user permissions
 */

export default (config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: any) => {
    await next();
    
    // Check if user is authenticated and has admin permissions
    const user = ctx.state.user;
    const isAdmin = user && (user.role?.type === 'admin' || user.role?.name === 'Admin');
    
    // If not admin, filter out private fields
    if (!isAdmin && ctx.response.body) {
      const filterPrivateData = (data: any) => {
        if (Array.isArray(data)) {
          return data.map(filterPrivateData);
        }
        
        if (data && typeof data === 'object') {
          const filtered = { ...data };
          
          // Remove private fields for non-admin users
          delete filtered.notizen;
          delete filtered.telefon;
          delete filtered.adresse;
          delete filtered.email;
          delete filtered.geburtsdatum;
          
          // Only show public members
          if (filtered.oeffentlich_sichtbar === false) {
            return null;
          }
          
          return filtered;
        }
        
        return data;
      };
      
      if (ctx.response.body.data) {
        ctx.response.body.data = filterPrivateData(ctx.response.body.data);
        
        // Remove null entries from arrays
        if (Array.isArray(ctx.response.body.data)) {
          ctx.response.body.data = ctx.response.body.data.filter((item: any) => item !== null);
        }
      }
    }
  };
};