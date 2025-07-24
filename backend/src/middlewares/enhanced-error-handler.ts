/**
 * Enhanced error handler middleware for better validation error messages
 */

export default (config: any, { strapi }: { strapi: any }) => {
  return async (ctx: any, next: any) => {
    try {
      await next();
    } catch (error) {
      // Enhanced error handling for validation errors
      if (error.name === 'ValidationError' || error.message.includes('Invalid status')) {
        
        // Map common validation errors to user-friendly messages
        let userMessage = error.message;
        
        if (error.message.includes('Invalid status')) {
          if (ctx.request.url.includes('/team/')) {
            userMessage = 'Team Status ungültig. Erlaubte Werte: aktiv, inaktiv, pausiert';
          } else if (ctx.request.url.includes('/spiel/')) {
            userMessage = 'Spiel Status ungültig. Erlaubte Werte: geplant, laufend, beendet, abgesagt';
          }
        }
        
        if (error.message.includes('gehört nicht')) {
          userMessage = 'Team-Verein Zuordnung: Das ausgewählte Team gehört nicht zum angegebenen Verein. Bitte überprüfen Sie die Zuordnungen.';
        }
        
        if (error.message.includes('Liga und Saison')) {
          userMessage = 'Liga-Saison Konsistenz: Die ausgewählte Liga gehört nicht zur angegebenen Saison. Bitte wählen Sie eine passende Kombination.';
        }
        
        // Log the original error for debugging
        strapi.log.error('Validation Error:', {
          originalError: error.message,
          userMessage,
          url: ctx.request.url,
          method: ctx.request.method,
          body: ctx.request.body
        });
        
        // Return user-friendly error
        ctx.status = 400;
        ctx.body = {
          error: {
            status: 400,
            name: 'ValidationError',
            message: userMessage,
            details: {
              errors: [{
                path: [],
                message: userMessage,
                name: 'ValidationError'
              }]
            }
          }
        };
        
        return;
      }
      
      // Handle other types of errors
      if (error.status === 400 && error.message.includes('Bad Request')) {
        strapi.log.error('Bad Request Error:', {
          error: error.message,
          url: ctx.request.url,
          method: ctx.request.method,
          body: ctx.request.body
        });
        
        ctx.status = 400;
        ctx.body = {
          error: {
            status: 400,
            name: 'BadRequestError',
            message: 'Anfrage konnte nicht verarbeitet werden. Bitte überprüfen Sie Ihre Eingaben.',
            details: {
              originalError: error.message
            }
          }
        };
        
        return;
      }
      
      // Re-throw other errors to be handled by Strapi's default error handler
      throw error;
    }
  };
};