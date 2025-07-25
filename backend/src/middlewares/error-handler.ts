/**
 * Global Error Handler Middleware
 * 
 * Provides consistent error formatting and logging across all API endpoints
 */

export default (config, { strapi }) => {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      // Skip error handling for Strapi admin routes to avoid interference
      if (ctx.url.startsWith('/admin') || ctx.url.startsWith('/content-manager')) {
        throw error; // Let Strapi handle admin errors natively
      }
      // Log the error for debugging
      strapi.log.error('API Error occurred:', {
        url: ctx.url,
        method: ctx.method,
        error: error.message,
        stack: error.stack,
        body: ctx.request.body,
        query: ctx.query,
        params: ctx.params
      });

      // Determine error type and format response accordingly
      let status = 500;
      let errorResponse = {
        error: {
          status: 500,
          name: 'InternalServerError',
          message: 'An internal server error occurred',
          code: 'INTERNAL_ERROR'
        }
      };

      // Handle Strapi validation errors
      if (error.name === 'ValidationError') {
        status = 400;
        errorResponse = {
          error: {
            status: 400,
            name: 'ValidationError',
            message: error.message || 'Validation failed',
            code: 'VALIDATION_ERROR',
            ...(error.details && { details: error.details })
          }
        };
      }
      // Handle Strapi application errors
      else if (error.name === 'ApplicationError') {
        status = 400;
        errorResponse = {
          error: {
            status: 400,
            name: 'ApplicationError',
            message: error.message || 'Application error occurred',
            code: 'APPLICATION_ERROR'
          }
        };
      }
      // Handle Strapi forbidden errors
      else if (error.name === 'ForbiddenError') {
        status = 403;
        errorResponse = {
          error: {
            status: 403,
            name: 'ForbiddenError',
            message: error.message || 'Forbidden',
            code: 'FORBIDDEN'
          }
        };
      }
      // Handle Strapi not found errors
      else if (error.name === 'NotFoundError') {
        status = 404;
        errorResponse = {
          error: {
            status: 404,
            name: 'NotFoundError',
            message: error.message || 'Resource not found',
            code: 'NOT_FOUND'
          }
        };
      }
      // Handle database errors
      else if (error.name === 'DatabaseError' || error.code?.startsWith('23')) {
        status = 400;
        errorResponse = {
          error: {
            status: 400,
            name: 'DatabaseError',
            message: 'Database operation failed',
            code: 'DATABASE_ERROR'
          }
        };
      }
      // Handle network/timeout errors
      else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        status = 503;
        errorResponse = {
          error: {
            status: 503,
            name: 'ServiceUnavailable',
            message: 'Service temporarily unavailable',
            code: 'SERVICE_UNAVAILABLE'
          }
        };
      }

      // Set response status and body
      ctx.status = status;
      ctx.body = errorResponse;

      // Log the formatted response for debugging
      strapi.log.debug('Error response sent:', {
        status,
        response: errorResponse,
        originalError: error.message
      });
    }
  };
};