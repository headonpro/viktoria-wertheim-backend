/**
 * Enhanced validation error handler middleware
 * Provides detailed error messages for better debugging
 */

export default (config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: any) => {
    try {
      await next();
    } catch (error: any) {
      // Handle Strapi validation errors
      if (error.name === 'ValidationError' || error.status === 400) {
        const details = error.details || {};
        const errors = details.errors || [];
        
        // Create user-friendly error messages
        const friendlyErrors = errors.map((err: any) => {
          const field = err.path?.join('.') || 'unknown';
          const message = err.message || 'Validation failed';
          
          // Map common validation errors to German
          const germanMessages: Record<string, string> = {
            'This field is required': `Das Feld "${field}" ist erforderlich`,
            'This value is too short': `Das Feld "${field}" ist zu kurz`,
            'This value is too long': `Das Feld "${field}" ist zu lang`,
            'This value must be a number': `Das Feld "${field}" muss eine Zahl sein`,
            'This value must be a boolean': `Das Feld "${field}" muss true oder false sein`,
            'This value must be a valid date': `Das Feld "${field}" muss ein gültiges Datum sein`,
            'This relation does not exist': `Die Verknüpfung für "${field}" existiert nicht`,
          };
          
          return {
            field,
            message: germanMessages[message] || message,
            code: err.name || 'VALIDATION_ERROR'
          };
        });
        
        ctx.status = 400;
        ctx.body = {
          error: {
            status: 400,
            name: 'ValidationError',
            message: 'Validierungsfehler beim Erstellen/Aktualisieren',
            details: {
              errors: friendlyErrors,
              timestamp: new Date().toISOString(),
              path: ctx.request.url,
              method: ctx.request.method
            }
          }
        };
        
        // Log detailed error for debugging
        strapi.log.error('Validation Error Details:', {
          url: ctx.request.url,
          method: ctx.request.method,
          body: ctx.request.body,
          errors: friendlyErrors
        });
        
        return;
      }
      
      // Re-throw other errors
      throw error;
    }
  };
};