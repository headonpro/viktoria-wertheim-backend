/**
 * Comprehensive Club Validation Service
 * Implements all validation requirements for club data integrity
 */

import { factories } from '@strapi/strapi';

// Enhanced type definitions
interface ClubData {
  name: string;
  kurz_name?: string;
  club_typ: 'viktoria_verein' | 'gegner_verein';
  viktoria_team_mapping?: 'team_1' | 'team_2' | 'team_3';
  liga_ids?: number[];
  aktiv?: boolean;
  gruendungsjahr?: number;
  vereinsfarben?: string;
  heimstadion?: string;
  adresse?: string;
  website?: string;
  logo?: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

interface ValidationError {
  field: string;
  type: ValidationErrorType;
  message: string;
  value?: any;
  details?: any;
}

interface ValidationWarning {
  field: string;
  message: string;
  suggestion?: string;
}

enum ValidationErrorType {
  REQUIRED = 'required',
  UNIQUE = 'unique',
  FORMAT = 'format',
  LENGTH = 'length',
  RANGE = 'range',
  RELATIONSHIP = 'relationship',
  BUSINESS_RULE = 'business_rule'
}

interface SanitizedClubData {
  name: string;
  kurz_name?: string;
  club_typ: 'viktoria_verein' | 'gegner_verein';
  viktoria_team_mapping?: 'team_1' | 'team_2' | 'team_3';
  aktiv: boolean;
  gruendungsjahr?: number;
  vereinsfarben?: string;
  heimstadion?: string;
  adresse?: string;
  website?: string;
}

export default factories.createCoreService('api::club.club', ({ strapi }) => ({
  
  /**
   * Comprehensive input sanitization for club data
   * @param input - Raw input data
   * @returns Sanitized club data
   */
  sanitizeClubInput(input: any): SanitizedClubData {
    try {
      const sanitized: SanitizedClubData = {
        name: this.sanitizeString(input.name, 100, true),
        club_typ: this.sanitizeClubType(input.club_typ),
        aktiv: Boolean(input.aktiv !== undefined ? input.aktiv : true)
      };

      // Optional fields with sanitization
      if (input.kurz_name) {
        sanitized.kurz_name = this.sanitizeString(input.kurz_name, 20);
      }

      if (input.viktoria_team_mapping) {
        sanitized.viktoria_team_mapping = this.sanitizeTeamMapping(input.viktoria_team_mapping);
      }

      if (input.gruendungsjahr) {
        sanitized.gruendungsjahr = this.sanitizeYear(input.gruendungsjahr);
      }

      if (input.vereinsfarben) {
        sanitized.vereinsfarben = this.sanitizeString(input.vereinsfarben, 50);
      }

      if (input.heimstadion) {
        sanitized.heimstadion = this.sanitizeString(input.heimstadion, 100);
      }

      if (input.adresse) {
        sanitized.adresse = this.sanitizeString(input.adresse, 500);
      }

      if (input.website) {
        sanitized.website = this.sanitizeUrl(input.website);
      }

      strapi.log.debug('Club input sanitized successfully');
      return sanitized;
    } catch (error) {
      strapi.log.error('Error sanitizing club input:', error);
      throw new Error(`Input sanitization failed: ${error.message}`);
    }
  },

  /**
   * Sanitize string input with length limits and HTML removal
   * @param value - Input string
   * @param maxLength - Maximum allowed length
   * @param required - Whether field is required
   * @returns Sanitized string
   */
  sanitizeString(value: any, maxLength: number, required: boolean = false): string {
    if (!value) {
      if (required) {
        throw new Error('Required string field cannot be empty');
      }
      return '';
    }

    if (typeof value !== 'string') {
      value = String(value);
    }

    // Remove HTML tags and dangerous characters
    let sanitized = value
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/[<>'"&]/g, '') // Remove dangerous characters
      .trim();

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');

    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength).trim();
    }

    if (required && sanitized.length === 0) {
      throw new Error('Required field cannot be empty after sanitization');
    }

    return sanitized;
  },

  /**
   * Sanitize club type input
   * @param value - Input club type
   * @returns Valid club type
   */
  sanitizeClubType(value: any): 'viktoria_verein' | 'gegner_verein' {
    if (!value || typeof value !== 'string') {
      return 'gegner_verein'; // Default to gegner_verein
    }

    const normalized = value.toLowerCase().trim();
    if (normalized === 'viktoria_verein' || normalized === 'viktoria') {
      return 'viktoria_verein';
    }

    return 'gegner_verein';
  },

  /**
   * Sanitize team mapping input
   * @param value - Input team mapping
   * @returns Valid team mapping or undefined
   */
  sanitizeTeamMapping(value: any): 'team_1' | 'team_2' | 'team_3' | undefined {
    if (!value || typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.toLowerCase().trim();
    const validMappings = ['team_1', 'team_2', 'team_3'];
    
    if (validMappings.includes(normalized)) {
      return normalized as 'team_1' | 'team_2' | 'team_3';
    }

    return undefined;
  },

  /**
   * Sanitize year input
   * @param value - Input year
   * @returns Valid year or undefined
   */
  sanitizeYear(value: any): number | undefined {
    if (!value) {
      return undefined;
    }

    const year = parseInt(String(value), 10);
    if (isNaN(year)) {
      return undefined;
    }

    const currentYear = new Date().getFullYear();
    if (year < 1800 || year > currentYear + 10) {
      return undefined;
    }

    return year;
  },

  /**
   * Sanitize URL input
   * @param value - Input URL
   * @returns Valid URL or undefined
   */
  sanitizeUrl(value: any): string | undefined {
    if (!value || typeof value !== 'string') {
      return undefined;
    }

    let url = value.trim();
    if (url.length === 0) {
      return undefined;
    }

    // Add protocol if missing
    if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }

    // Basic URL validation
    try {
      new URL(url);
      return url.length <= 200 ? url : undefined;
    } catch {
      return undefined;
    }
  },

  /**
   * Validate unique club name
   * @param name - Club name to validate
   * @param excludeId - Club ID to exclude from uniqueness check
   * @returns Validation result
   */
  async validateUniqueClubName(name: string, excludeId?: number): Promise<ValidationResult> {
    try {
      if (!name || name.trim().length === 0) {
        return {
          isValid: false,
          errors: [{
            field: 'name',
            type: ValidationErrorType.REQUIRED,
            message: 'Club name is required',
            value: name
          }]
        };
      }

      const filters: any = { name: name.trim() };
      if (excludeId) {
        filters.id = { $ne: excludeId };
      }

      const existingClubs = await strapi.entityService.findMany('api::club.club', {
        filters
      });

      if (existingClubs.length > 0) {
        return {
          isValid: false,
          errors: [{
            field: 'name',
            type: ValidationErrorType.UNIQUE,
            message: `Club with name "${name}" already exists`,
            value: name,
            details: { existingClub: existingClubs[0] }
          }]
        };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      strapi.log.error('Error validating unique club name:', error);
      return {
        isValid: false,
        errors: [{
          field: 'name',
          type: ValidationErrorType.BUSINESS_RULE,
          message: `Validation error: ${error.message}`,
          value: name
        }]
      };
    }
  },

  /**
   * Validate viktoria_team_mapping uniqueness
   * @param mapping - Team mapping to validate
   * @param excludeId - Club ID to exclude from uniqueness check
   * @returns Validation result
   */
  async validateUniqueViktoriaMapping(mapping: string, excludeId?: number): Promise<ValidationResult> {
    try {
      if (!mapping) {
        return { isValid: true, errors: [] }; // Optional field
      }

      const validMappings = ['team_1', 'team_2', 'team_3'];
      if (!validMappings.includes(mapping)) {
        return {
          isValid: false,
          errors: [{
            field: 'viktoria_team_mapping',
            type: ValidationErrorType.FORMAT,
            message: 'Invalid team mapping. Must be team_1, team_2, or team_3',
            value: mapping
          }]
        };
      }

      const filters: any = {
        club_typ: 'viktoria_verein',
        viktoria_team_mapping: mapping
      };
      if (excludeId) {
        filters.id = { $ne: excludeId };
      }

      const existingClubs = await strapi.entityService.findMany('api::club.club', {
        filters
      });

      if (existingClubs.length > 0) {
        return {
          isValid: false,
          errors: [{
            field: 'viktoria_team_mapping',
            type: ValidationErrorType.UNIQUE,
            message: `Team mapping "${mapping}" is already used by club "${existingClubs[0].name}"`,
            value: mapping,
            details: { existingClub: existingClubs[0] }
          }]
        };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      strapi.log.error('Error validating unique viktoria mapping:', error);
      return {
        isValid: false,
        errors: [{
          field: 'viktoria_team_mapping',
          type: ValidationErrorType.BUSINESS_RULE,
          message: `Validation error: ${error.message}`,
          value: mapping
        }]
      };
    }
  },

  /**
   * Validate liga-club relationships
   * @param clubId - Club ID
   * @param ligaIds - Array of liga IDs to validate
   * @returns Validation result
   */
  async validateLigaClubRelationships(clubId: number, ligaIds: number[]): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      if (!ligaIds || ligaIds.length === 0) {
        errors.push({
          field: 'ligen',
          type: ValidationErrorType.REQUIRED,
          message: 'Club must be assigned to at least one liga',
          value: ligaIds
        });
        return { isValid: false, errors, warnings };
      }

      // Validate each liga exists and is active
      for (const ligaId of ligaIds) {
        const liga = await strapi.entityService.findOne('api::liga.liga', ligaId);
        
        if (!liga) {
          errors.push({
            field: 'ligen',
            type: ValidationErrorType.RELATIONSHIP,
            message: `Liga with ID ${ligaId} does not exist`,
            value: ligaId
          });
          continue;
        }

        if (!(liga as any).aktiv) {
          warnings.push({
            field: 'ligen',
            message: `Liga "${(liga as any).name}" is inactive`,
            suggestion: 'Consider assigning club to active liga only'
          });
        }
      }

      // Check for duplicate liga assignments
      const uniqueLigaIds = [...new Set(ligaIds)];
      if (uniqueLigaIds.length !== ligaIds.length) {
        errors.push({
          field: 'ligen',
          type: ValidationErrorType.BUSINESS_RULE,
          message: 'Duplicate liga assignments detected',
          value: ligaIds,
          details: { duplicates: ligaIds.length - uniqueLigaIds.length }
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      strapi.log.error('Error validating liga-club relationships:', error);
      return {
        isValid: false,
        errors: [{
          field: 'ligen',
          type: ValidationErrorType.BUSINESS_RULE,
          message: `Validation error: ${error.message}`,
          value: ligaIds
        }]
      };
    }
  },

  /**
   * Comprehensive club data validation
   * @param clubData - Club data to validate
   * @param excludeId - Club ID to exclude from uniqueness checks
   * @returns Detailed validation result
   */
  async validateClubData(clubData: ClubData, excludeId?: number): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Validate required fields
      if (!clubData.name || clubData.name.trim().length < 2) {
        errors.push({
          field: 'name',
          type: ValidationErrorType.LENGTH,
          message: 'Club name must be at least 2 characters long',
          value: clubData.name
        });
      }

      if (!clubData.club_typ || !['viktoria_verein', 'gegner_verein'].includes(clubData.club_typ)) {
        errors.push({
          field: 'club_typ',
          type: ValidationErrorType.REQUIRED,
          message: 'Valid club type is required (viktoria_verein or gegner_verein)',
          value: clubData.club_typ
        });
      }

      // Validate name uniqueness
      if (clubData.name && clubData.name.trim().length >= 2) {
        const nameValidation = await this.validateUniqueClubName(clubData.name, excludeId);
        if (!nameValidation.isValid) {
          errors.push(...nameValidation.errors);
        }
      }

      // Validate Viktoria-specific requirements
      if (clubData.club_typ === 'viktoria_verein') {
        if (!clubData.viktoria_team_mapping) {
          errors.push({
            field: 'viktoria_team_mapping',
            type: ValidationErrorType.REQUIRED,
            message: 'Viktoria clubs must have a team mapping',
            value: clubData.viktoria_team_mapping
          });
        } else {
          const mappingValidation = await this.validateUniqueViktoriaMapping(clubData.viktoria_team_mapping, excludeId);
          if (!mappingValidation.isValid) {
            errors.push(...mappingValidation.errors);
          }
        }
      } else if (clubData.viktoria_team_mapping) {
        warnings.push({
          field: 'viktoria_team_mapping',
          message: 'Non-Viktoria clubs should not have team mapping',
          suggestion: 'Remove team mapping for gegner_verein clubs'
        });
      }

      // Validate optional fields
      if (clubData.kurz_name && clubData.kurz_name.length > 20) {
        errors.push({
          field: 'kurz_name',
          type: ValidationErrorType.LENGTH,
          message: 'Short name must be 20 characters or less',
          value: clubData.kurz_name
        });
      }

      if (clubData.gruendungsjahr) {
        const currentYear = new Date().getFullYear();
        if (clubData.gruendungsjahr < 1800 || clubData.gruendungsjahr > currentYear + 10) {
          errors.push({
            field: 'gruendungsjahr',
            type: ValidationErrorType.RANGE,
            message: `Founding year must be between 1800 and ${currentYear + 10}`,
            value: clubData.gruendungsjahr
          });
        }
      }

      if (clubData.website) {
        const urlPattern = /^https?:\/\/.+\..+/;
        if (!urlPattern.test(clubData.website)) {
          errors.push({
            field: 'website',
            type: ValidationErrorType.FORMAT,
            message: 'Website must be a valid URL starting with http:// or https://',
            value: clubData.website
          });
        } else if (clubData.website.length > 200) {
          errors.push({
            field: 'website',
            type: ValidationErrorType.LENGTH,
            message: 'Website URL must be 200 characters or less',
            value: clubData.website
          });
        }
      }

      // Validate string field lengths
      const stringFields = [
        { field: 'vereinsfarben', value: clubData.vereinsfarben, maxLength: 50 },
        { field: 'heimstadion', value: clubData.heimstadion, maxLength: 100 },
        { field: 'adresse', value: clubData.adresse, maxLength: 500 }
      ];

      stringFields.forEach(({ field, value, maxLength }) => {
        if (value && value.length > maxLength) {
          errors.push({
            field,
            type: ValidationErrorType.LENGTH,
            message: `${field} must be ${maxLength} characters or less`,
            value
          });
        }
      });

      // Validate liga relationships if provided
      if (clubData.liga_ids && clubData.liga_ids.length > 0) {
        const ligaValidation = await this.validateLigaClubRelationships(excludeId || 0, clubData.liga_ids);
        if (!ligaValidation.isValid) {
          errors.push(...ligaValidation.errors);
        }
        if (ligaValidation.warnings) {
          warnings.push(...ligaValidation.warnings);
        }
      }

      const result = {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined
      };

      strapi.log.debug(`Club data validation completed: ${result.isValid ? 'VALID' : 'INVALID'}`, {
        errors: errors.length,
        warnings: warnings.length
      });

      return result;
    } catch (error) {
      strapi.log.error('Error in comprehensive club validation:', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          type: ValidationErrorType.BUSINESS_RULE,
          message: `Validation failed: ${error.message}`,
          details: { error: error.message }
        }]
      };
    }
  },

  /**
   * Validate club before creation
   * @param clubData - Club data for creation
   * @returns Validation result
   */
  async validateClubCreation(clubData: ClubData): Promise<ValidationResult> {
    try {
      // Sanitize input first
      const sanitized = this.sanitizeClubInput(clubData);
      
      // Perform comprehensive validation
      const validation = await this.validateClubData(sanitized);
      
      if (!validation.isValid) {
        strapi.log.warn('Club creation validation failed:', validation.errors);
      }

      return validation;
    } catch (error) {
      strapi.log.error('Error validating club creation:', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          type: ValidationErrorType.BUSINESS_RULE,
          message: `Creation validation failed: ${error.message}`
        }]
      };
    }
  },

  /**
   * Validate club before update
   * @param clubData - Club data for update
   * @param clubId - ID of club being updated
   * @returns Validation result
   */
  async validateClubUpdate(clubData: Partial<ClubData>, clubId: number): Promise<ValidationResult> {
    try {
      // Get existing club data
      const existingClub = await strapi.entityService.findOne('api::club.club', clubId, {
        populate: { ligen: true }
      });

      if (!existingClub) {
        return {
          isValid: false,
          errors: [{
            field: 'id',
            type: ValidationErrorType.RELATIONSHIP,
            message: `Club with ID ${clubId} not found`,
            value: clubId
          }]
        };
      }

      // Merge existing data with updates
      const mergedData: ClubData = {
        ...(existingClub as any),
        ...clubData
      };

      // Extract liga IDs if ligen relation is provided
      if ((existingClub as any).ligen) {
        mergedData.liga_ids = (existingClub as any).ligen.map((liga: any) => liga.id);
      }

      // Sanitize input
      const sanitized = this.sanitizeClubInput(mergedData);
      
      // Perform comprehensive validation with exclusion of current club
      const validation = await this.validateClubData(sanitized, clubId);
      
      if (!validation.isValid) {
        strapi.log.warn(`Club update validation failed for ID ${clubId}:`, validation.errors);
      }

      return validation;
    } catch (error) {
      strapi.log.error('Error validating club update:', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          type: ValidationErrorType.BUSINESS_RULE,
          message: `Update validation failed: ${error.message}`
        }]
      };
    }
  },

  /**
   * Get user-friendly error messages
   * @param errors - Array of validation errors
   * @returns Array of formatted error messages
   */
  getErrorMessages(errors: ValidationError[]): string[] {
    return errors.map(error => {
      switch (error.type) {
        case ValidationErrorType.REQUIRED:
          return `${error.field}: This field is required`;
        case ValidationErrorType.UNIQUE:
          return `${error.field}: This value must be unique`;
        case ValidationErrorType.FORMAT:
          return `${error.field}: Invalid format`;
        case ValidationErrorType.LENGTH:
          return `${error.field}: Invalid length`;
        case ValidationErrorType.RANGE:
          return `${error.field}: Value out of range`;
        case ValidationErrorType.RELATIONSHIP:
          return `${error.field}: Invalid relationship`;
        case ValidationErrorType.BUSINESS_RULE:
          return `${error.field}: Business rule violation`;
        default:
          return error.message;
      }
    });
  },

  /**
   * Get detailed validation report
   * @param validation - Validation result
   * @returns Formatted validation report
   */
  getValidationReport(validation: ValidationResult): {
    isValid: boolean;
    summary: string;
    errors: string[];
    warnings?: string[];
    details: ValidationError[];
  } {
    const errorMessages = this.getErrorMessages(validation.errors);
    const warningMessages = validation.warnings?.map(w => w.message) || [];

    return {
      isValid: validation.isValid,
      summary: validation.isValid 
        ? 'Validation passed successfully'
        : `Validation failed with ${validation.errors.length} error(s)`,
      errors: errorMessages,
      warnings: warningMessages.length > 0 ? warningMessages : undefined,
      details: validation.errors
    };
  },

  /**
   * Batch validate multiple clubs
   * @param clubs - Array of club data to validate
   * @returns Array of validation results
   */
  async batchValidateClubs(clubs: ClubData[]): Promise<ValidationResult[]> {
    try {
      const results = await Promise.all(
        clubs.map(async (club, index) => {
          try {
            const validation = await this.validateClubData(club);
            return {
              ...validation,
              index,
              clubName: club.name
            };
          } catch (error) {
            return {
              isValid: false,
              errors: [{
                field: 'general',
                type: ValidationErrorType.BUSINESS_RULE,
                message: `Batch validation error: ${error.message}`
              }],
              index,
              clubName: club.name
            };
          }
        })
      );

      const validCount = results.filter(r => r.isValid).length;
      strapi.log.info(`Batch validation completed: ${validCount}/${clubs.length} clubs valid`);

      return results;
    } catch (error) {
      strapi.log.error('Error in batch club validation:', error);
      throw new Error(`Batch validation failed: ${error.message}`);
    }
  }
}));