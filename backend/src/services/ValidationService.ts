/**
 * Ultra-Simple Validation Service
 * 
 * Provides basic validation functions without complex business logic.
 * Follows KISS principle for maintainable code.
 */

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class ValidationService {
  
  /**
   * Safe logging helper that checks if strapi logging is available
   */
  private static log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) {
    try {
      if (typeof strapi !== 'undefined' && strapi?.log?.[level]) {
        strapi.log[level](message, data);
      }
    } catch (error) {
      // Silently fail if logging is not available
    }
  }
  
  /**
   * Validates that required fields are present and not empty
   * @param data - Object containing data to validate
   * @param fields - Array of field names that are required
   * @returns Array of error messages (empty if valid)
   */
  static validateRequired(data: any, fields: string[]): string[] {
    const errors: string[] = [];
    
    try {
      if (!data || typeof data !== 'object') {
        errors.push('Data must be an object');
        this.log('warn', 'ValidationService.validateRequired: Invalid data type provided', { data: typeof data });
        return errors;
      }
      
      for (const field of fields) {
        const value = data[field];
        
        if (value === undefined || value === null) {
          errors.push(`${field} is required`);
        } else if (typeof value === 'string' && value.trim() === '') {
          errors.push(`${field} cannot be empty`);
        } else if (Array.isArray(value) && value.length === 0) {
          errors.push(`${field} cannot be empty`);
        }
      }
      
      if (errors.length > 0) {
        this.log('debug', 'ValidationService.validateRequired: Validation errors found', { 
          errors, 
          fields, 
          dataKeys: Object.keys(data) 
        });
      }
      
    } catch (error) {
      this.log('error', 'ValidationService.validateRequired: Unexpected error', error);
      errors.push('Validation error occurred');
    }
    
    return errors;
  }

  /**
   * Enhanced validation with structured error response
   * @param data - Object containing data to validate
   * @param fields - Array of field names that are required
   * @returns ValidationResult with structured errors
   */
  static validateRequiredWithDetails(data: any, fields: string[]): ValidationResult {
    const errors: ValidationError[] = [];
    
    try {
      if (!data || typeof data !== 'object') {
        errors.push({
          field: 'data',
          message: 'Data must be an object',
          code: 'INVALID_DATA_TYPE'
        });
        this.log('warn', 'ValidationService.validateRequiredWithDetails: Invalid data type provided', { data: typeof data });
        return { isValid: false, errors };
      }
      
      for (const field of fields) {
        const value = data[field];
        
        if (value === undefined || value === null) {
          errors.push({
            field,
            message: `${field} is required`,
            code: 'REQUIRED_FIELD_MISSING'
          });
        } else if (typeof value === 'string' && value.trim() === '') {
          errors.push({
            field,
            message: `${field} cannot be empty`,
            code: 'FIELD_EMPTY'
          });
        } else if (Array.isArray(value) && value.length === 0) {
          errors.push({
            field,
            message: `${field} cannot be empty`,
            code: 'ARRAY_EMPTY'
          });
        }
      }
      
      if (errors.length > 0) {
        this.log('debug', 'ValidationService.validateRequiredWithDetails: Validation errors found', { 
          errors, 
          fields, 
          dataKeys: Object.keys(data) 
        });
      }
      
    } catch (error) {
      this.log('error', 'ValidationService.validateRequiredWithDetails: Unexpected error', error);
      errors.push({
        field: 'system',
        message: 'Validation error occurred',
        code: 'VALIDATION_ERROR'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validates that a field value is unique in the database
   * @param contentType - Strapi content type (e.g., 'api::team.team')
   * @param field - Field name to check for uniqueness
   * @param value - Value to check
   * @param excludeId - Optional ID to exclude from uniqueness check (for updates)
   * @returns Promise<boolean> - true if unique, false if duplicate found
   */
  static async validateUnique(
    contentType: string, 
    field: string, 
    value: any, 
    excludeId?: number
  ): Promise<boolean> {
    try {
      this.log('debug', 'ValidationService.validateUnique: Starting validation', { 
        contentType, 
        field, 
        value, 
        excludeId 
      });

      // Build filters for the query
      const filters: any = {
        [field]: value
      };
      
      // Exclude current record if updating
      if (excludeId) {
        filters.id = { $ne: excludeId };
      }
      
      // Query the database
      const existingRecords = await strapi.entityService.findMany(contentType as any, {
        filters,
        limit: 1
      });
      
      const isUnique = !existingRecords || existingRecords.length === 0;
      
      this.log('debug', 'ValidationService.validateUnique: Validation completed', { 
        isUnique, 
        foundRecords: existingRecords?.length || 0 
      });
      
      return isUnique;
      
    } catch (error) {
      this.log('error', 'ValidationService.validateUnique error:', {
        contentType,
        field,
        value,
        excludeId,
        error: error.message,
        stack: error.stack
      });
      // Return false on error to be safe
      return false;
    }
  }

  /**
   * Enhanced unique validation with detailed error response
   * @param contentType - Strapi content type
   * @param field - Field name to check
   * @param value - Value to check
   * @param excludeId - Optional ID to exclude
   * @returns Promise<ValidationResult>
   */
  static async validateUniqueWithDetails(
    contentType: string, 
    field: string, 
    value: any, 
    excludeId?: number
  ): Promise<ValidationResult> {
    try {
      this.log('debug', 'ValidationService.validateUniqueWithDetails: Starting validation', { 
        contentType, 
        field, 
        value, 
        excludeId 
      });

      const filters: any = { [field]: value };
      if (excludeId) {
        filters.id = { $ne: excludeId };
      }
      
      const existingRecords = await strapi.entityService.findMany(contentType as any, {
        filters,
        limit: 1
      });
      
      const isUnique = !existingRecords || existingRecords.length === 0;
      
      if (!isUnique) {
        return {
          isValid: false,
          errors: [{
            field,
            message: `${field} must be unique. Value '${value}' already exists`,
            code: 'DUPLICATE_VALUE'
          }]
        };
      }
      
      return { isValid: true, errors: [] };
      
    } catch (error) {
      this.log('error', 'ValidationService.validateUniqueWithDetails error:', {
        contentType,
        field,
        value,
        excludeId,
        error: error.message
      });
      
      return {
        isValid: false,
        errors: [{
          field: 'system',
          message: 'Unable to validate uniqueness due to system error',
          code: 'SYSTEM_ERROR'
        }]
      };
    }
  }
  
  /**
   * Validates that end date is after start date
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of error messages (empty if valid)
   */
  static validateDateRange(startDate: Date, endDate: Date): string[] {
    const errors: string[] = [];
    
    try {
      this.log('debug', 'ValidationService.validateDateRange: Validating date range', { 
        startDate, 
        endDate 
      });

      // Check if dates are valid Date objects
      if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
        errors.push('Start date must be a valid date');
      }
      
      if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
        errors.push('End date must be a valid date');
      }
      
      // If both dates are valid, check the range
      if (errors.length === 0) {
        if (endDate <= startDate) {
          errors.push('End date must be after start date');
        }
      }

      if (errors.length > 0) {
        this.log('debug', 'ValidationService.validateDateRange: Date validation errors found', { errors });
      }
      
    } catch (error) {
      this.log('error', 'ValidationService.validateDateRange: Unexpected error', error);
      errors.push('Date validation error occurred');
    }
    
    return errors;
  }

  /**
   * Enhanced date range validation with detailed error response
   * @param startDate - Start date
   * @param endDate - End date
   * @returns ValidationResult
   */
  static validateDateRangeWithDetails(startDate: Date, endDate: Date): ValidationResult {
    const errors: ValidationError[] = [];
    
    try {
      this.log('debug', 'ValidationService.validateDateRangeWithDetails: Validating date range', { 
        startDate, 
        endDate 
      });

      if (!(startDate instanceof Date) || isNaN(startDate.getTime())) {
        errors.push({
          field: 'startDate',
          message: 'Start date must be a valid date',
          code: 'INVALID_DATE'
        });
      }
      
      if (!(endDate instanceof Date) || isNaN(endDate.getTime())) {
        errors.push({
          field: 'endDate',
          message: 'End date must be a valid date',
          code: 'INVALID_DATE'
        });
      }
      
      if (errors.length === 0 && endDate <= startDate) {
        errors.push({
          field: 'dateRange',
          message: 'End date must be after start date',
          code: 'INVALID_DATE_RANGE'
        });
      }

      if (errors.length > 0) {
        this.log('debug', 'ValidationService.validateDateRangeWithDetails: Date validation errors found', { errors });
      }
      
    } catch (error) {
      this.log('error', 'ValidationService.validateDateRangeWithDetails: Unexpected error', error);
      errors.push({
        field: 'system',
        message: 'Date validation error occurred',
        code: 'VALIDATION_ERROR'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validates that a value is within allowed enumeration values
   * @param value - Value to validate
   * @param allowedValues - Array of allowed values
   * @returns boolean - true if value is allowed, false otherwise
   */
  static validateEnum(value: any, allowedValues: any[]): boolean {
    try {
      if (!Array.isArray(allowedValues)) {
        this.log('warn', 'ValidationService.validateEnum: allowedValues is not an array', { 
          allowedValues: typeof allowedValues 
        });
        return false;
      }
      
      const isValid = allowedValues.includes(value);
      
      if (!isValid) {
        this.log('debug', 'ValidationService.validateEnum: Value not in allowed values', { 
          value, 
          allowedValues 
        });
      }
      
      return isValid;
      
    } catch (error) {
      this.log('error', 'ValidationService.validateEnum: Unexpected error', error);
      return false;
    }
  }

  /**
   * Enhanced enum validation with detailed error response
   * @param value - Value to validate
   * @param allowedValues - Array of allowed values
   * @param fieldName - Name of the field being validated
   * @returns ValidationResult
   */
  static validateEnumWithDetails(value: any, allowedValues: any[], fieldName: string = 'value'): ValidationResult {
    try {
      if (!Array.isArray(allowedValues)) {
        this.log('warn', 'ValidationService.validateEnumWithDetails: allowedValues is not an array', { 
          allowedValues: typeof allowedValues 
        });
        return {
          isValid: false,
          errors: [{
            field: fieldName,
            message: 'Invalid configuration: allowed values must be an array',
            code: 'INVALID_CONFIG'
          }]
        };
      }
      
      const isValid = allowedValues.includes(value);
      
      if (!isValid) {
        this.log('debug', 'ValidationService.validateEnumWithDetails: Value not in allowed values', { 
          value, 
          allowedValues,
          fieldName
        });
        
        return {
          isValid: false,
          errors: [{
            field: fieldName,
            message: `${fieldName} must be one of: ${allowedValues.join(', ')}. Received: ${value}`,
            code: 'INVALID_ENUM_VALUE'
          }]
        };
      }
      
      return { isValid: true, errors: [] };
      
    } catch (error) {
      this.log('error', 'ValidationService.validateEnumWithDetails: Unexpected error', error);
      return {
        isValid: false,
        errors: [{
          field: fieldName,
          message: 'Enum validation error occurred',
          code: 'VALIDATION_ERROR'
        }]
      };
    }
  }

  /**
   * Helper method to format validation errors for API responses
   * @param errors - Array of ValidationError objects
   * @returns Formatted error response
   */
  static formatErrorResponse(errors: ValidationError[]) {
    return {
      error: {
        status: 400,
        name: 'ValidationError',
        message: 'Validation failed',
        details: errors
      }
    };
  }

  /**
   * Helper method to create a standardized error response
   * @param message - Error message
   * @param code - Error code
   * @param status - HTTP status code
   * @returns Formatted error response
   */
  static createErrorResponse(message: string, code: string = 'VALIDATION_ERROR', status: number = 400) {
    this.log('debug', 'ValidationService.createErrorResponse: Creating error response', { 
      message, 
      code, 
      status 
    });
    
    return {
      error: {
        status,
        name: 'ValidationError',
        message,
        code
      }
    };
  }
}

export default ValidationService;
export type { ValidationError, ValidationResult };