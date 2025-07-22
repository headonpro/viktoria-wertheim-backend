/**
 * Error handling utilities for complex queries
 * Provides standardized error responses and logging
 */

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
  statusCode: number;
}

// Error codes
export const ErrorCodes = {
  // Validation errors
  INVALID_PARAMETER: 'INVALID_PARAMETER',
  MISSING_PARAMETER: 'MISSING_PARAMETER',
  INVALID_ID: 'INVALID_ID',
  
  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  LEAGUE_NOT_FOUND: 'LEAGUE_NOT_FOUND',
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  TEAM_NOT_FOUND: 'TEAM_NOT_FOUND',
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  SEASON_NOT_FOUND: 'SEASON_NOT_FOUND',
  
  // Data errors
  NO_DATA_AVAILABLE: 'NO_DATA_AVAILABLE',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  DATA_INCONSISTENCY: 'DATA_INCONSISTENCY',
  
  // Query errors
  QUERY_FAILED: 'QUERY_FAILED',
  QUERY_TIMEOUT: 'QUERY_TIMEOUT',
  INVALID_QUERY_PARAMETERS: 'INVALID_QUERY_PARAMETERS',
  
  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

// Error messages
export const ErrorMessages = {
  [ErrorCodes.INVALID_PARAMETER]: 'Invalid parameter provided',
  [ErrorCodes.MISSING_PARAMETER]: 'Required parameter is missing',
  [ErrorCodes.INVALID_ID]: 'Invalid ID format',
  
  [ErrorCodes.RESOURCE_NOT_FOUND]: 'Requested resource not found',
  [ErrorCodes.LEAGUE_NOT_FOUND]: 'League not found',
  [ErrorCodes.PLAYER_NOT_FOUND]: 'Player not found',
  [ErrorCodes.TEAM_NOT_FOUND]: 'Team not found',
  [ErrorCodes.MATCH_NOT_FOUND]: 'Match not found',
  [ErrorCodes.SEASON_NOT_FOUND]: 'Season not found',
  
  [ErrorCodes.NO_DATA_AVAILABLE]: 'No data available for the requested resource',
  [ErrorCodes.INSUFFICIENT_DATA]: 'Insufficient data to complete the request',
  [ErrorCodes.DATA_INCONSISTENCY]: 'Data inconsistency detected',
  
  [ErrorCodes.QUERY_FAILED]: 'Database query failed',
  [ErrorCodes.QUERY_TIMEOUT]: 'Query execution timeout',
  [ErrorCodes.INVALID_QUERY_PARAMETERS]: 'Invalid query parameters',
  
  [ErrorCodes.INTERNAL_ERROR]: 'Internal server error',
  [ErrorCodes.DATABASE_ERROR]: 'Database connection error',
  [ErrorCodes.CACHE_ERROR]: 'Cache operation failed',
  
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded'
};

// HTTP status codes mapping
export const StatusCodes = {
  [ErrorCodes.INVALID_PARAMETER]: 400,
  [ErrorCodes.MISSING_PARAMETER]: 400,
  [ErrorCodes.INVALID_ID]: 400,
  [ErrorCodes.INVALID_QUERY_PARAMETERS]: 400,
  
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
  [ErrorCodes.LEAGUE_NOT_FOUND]: 404,
  [ErrorCodes.PLAYER_NOT_FOUND]: 404,
  [ErrorCodes.TEAM_NOT_FOUND]: 404,
  [ErrorCodes.MATCH_NOT_FOUND]: 404,
  [ErrorCodes.SEASON_NOT_FOUND]: 404,
  [ErrorCodes.NO_DATA_AVAILABLE]: 404,
  
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  
  [ErrorCodes.INTERNAL_ERROR]: 500,
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.CACHE_ERROR]: 500,
  [ErrorCodes.QUERY_FAILED]: 500,
  [ErrorCodes.QUERY_TIMEOUT]: 500,
  [ErrorCodes.INSUFFICIENT_DATA]: 500,
  [ErrorCodes.DATA_INCONSISTENCY]: 500
};

/**
 * Create standardized API error
 */
export function createApiError(
  code: string,
  message?: string,
  details?: any
): ApiError {
  return {
    code,
    message: message || ErrorMessages[code] || 'Unknown error',
    details,
    statusCode: StatusCodes[code] || 500
  };
}

/**
 * Create error response for API
 */
export function createErrorResponse(
  error: ApiError,
  requestId?: string
): ErrorResponse {
  return {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
      requestId
    },
    statusCode: error.statusCode
  };
}

/**
 * Handle and format validation errors
 */
export function handleValidationErrors(errors: ValidationError[]): ApiError {
  return createApiError(
    ErrorCodes.INVALID_PARAMETER,
    'Validation failed',
    { validationErrors: errors }
  );
}

/**
 * Handle database errors
 */
export function handleDatabaseError(error: any): ApiError {
  console.error('Database error:', error);
  
  // Check for specific database error types
  if (error.code === 'ECONNREFUSED') {
    return createApiError(
      ErrorCodes.DATABASE_ERROR,
      'Database connection refused'
    );
  }
  
  if (error.code === 'ETIMEDOUT') {
    return createApiError(
      ErrorCodes.QUERY_TIMEOUT,
      'Database query timeout'
    );
  }
  
  return createApiError(
    ErrorCodes.DATABASE_ERROR,
    'Database operation failed',
    { originalError: error.message }
  );
}

/**
 * Handle cache errors
 */
export function handleCacheError(error: any): ApiError {
  console.error('Cache error:', error);
  
  return createApiError(
    ErrorCodes.CACHE_ERROR,
    'Cache operation failed',
    { originalError: error.message }
  );
}

/**
 * Validate required parameters
 */
export function validateRequiredParams(
  params: Record<string, any>,
  required: string[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  required.forEach(param => {
    if (params[param] === undefined || params[param] === null || params[param] === '') {
      errors.push({
        field: param,
        message: `${param} is required`,
        value: params[param]
      });
    }
  });
  
  return errors;
}

/**
 * Validate ID parameter
 */
export function validateId(id: any, fieldName: string = 'id'): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!id) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      value: id
    });
    return errors;
  }
  
  const numericId = parseInt(id);
  if (isNaN(numericId) || numericId <= 0) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be a positive integer`,
      value: id
    });
  }
  
  return errors;
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  page?: any,
  limit?: any
): { page: number; limit: number; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  let validPage = 1;
  let validLimit = 25;
  
  if (page !== undefined) {
    const numericPage = parseInt(page);
    if (isNaN(numericPage) || numericPage < 1) {
      errors.push({
        field: 'page',
        message: 'page must be a positive integer',
        value: page
      });
    } else {
      validPage = numericPage;
    }
  }
  
  if (limit !== undefined) {
    const numericLimit = parseInt(limit);
    if (isNaN(numericLimit) || numericLimit < 1 || numericLimit > 100) {
      errors.push({
        field: 'limit',
        message: 'limit must be between 1 and 100',
        value: limit
      });
    } else {
      validLimit = numericLimit;
    }
  }
  
  return { page: validPage, limit: validLimit, errors };
}

/**
 * Validate sort parameter
 */
export function validateSortBy(
  sortBy: any,
  allowedFields: string[]
): { sortBy: string; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  let validSortBy = allowedFields[0] || 'id';
  
  if (sortBy && !allowedFields.includes(sortBy)) {
    errors.push({
      field: 'sortBy',
      message: `sortBy must be one of: ${allowedFields.join(', ')}`,
      value: sortBy
    });
  } else if (sortBy) {
    validSortBy = sortBy;
  }
  
  return { sortBy: validSortBy, errors };
}

/**
 * Error handler middleware for controllers
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('Handler error:', error);
      
      // If it's already an ApiError, re-throw it
      if (error && typeof error === 'object' && 'code' in error && 'statusCode' in error) {
        throw error;
      }
      
      // Handle database errors
      if (error && typeof error === 'object' && 'code' in error) {
        throw handleDatabaseError(error);
      }
      
      // Generic error
      throw createApiError(
        ErrorCodes.INTERNAL_ERROR,
        'An unexpected error occurred',
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  };
}

/**
 * Send error response to client
 */
export function sendErrorResponse(ctx: any, error: ApiError, requestId?: string) {
  const response = createErrorResponse(error, requestId);
  
  ctx.status = response.statusCode;
  ctx.body = response;
  
  // Log error for monitoring
  if (response.statusCode >= 500) {
    console.error('API Error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      requestId,
      url: ctx.url,
      method: ctx.method
    });
  }
}

/**
 * Async error handler for Koa controllers
 */
export function asyncErrorHandler(handler: (ctx: any) => Promise<any>) {
  return async (ctx: any) => {
    try {
      await handler(ctx);
    } catch (error) {
      let apiError: ApiError;
      
      if (error && typeof error === 'object' && 'code' in error && 'statusCode' in error) {
        apiError = error as ApiError;
      } else if (error && typeof error === 'object' && 'code' in error) {
        apiError = handleDatabaseError(error);
      } else {
        apiError = createApiError(
          ErrorCodes.INTERNAL_ERROR,
          'An unexpected error occurred',
          { originalError: error instanceof Error ? error.message : String(error) }
        );
      }
      
      sendErrorResponse(ctx, apiError, ctx.state.requestId);
    }
  };
}

/**
 * Resource not found helper
 */
export function throwNotFound(resourceType: string, id?: any) {
  const code = `${resourceType.toUpperCase()}_NOT_FOUND` as keyof typeof ErrorCodes;
  throw createApiError(
    ErrorCodes[code] || ErrorCodes.RESOURCE_NOT_FOUND,
    `${resourceType} not found${id ? ` with ID: ${id}` : ''}`,
    { resourceType, id }
  );
}

/**
 * Validation helper
 */
export function throwValidationError(errors: ValidationError[]) {
  throw handleValidationErrors(errors);
}

/**
 * Check if resource exists, throw error if not
 */
export function ensureResourceExists(resource: any, resourceType: string, id?: any) {
  if (!resource) {
    throwNotFound(resourceType, id);
  }
  return resource;
}