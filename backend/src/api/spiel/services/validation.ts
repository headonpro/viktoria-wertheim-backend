/**
 * Validation Service for Spiel entities
 * Handles input validation and data consistency checks
 */

import { ERROR_CODES } from '../../tabellen-eintrag/services/error-handling';

export interface ValidationService {
  validateSpielResult(spiel: SpielEntity): Promise<ValidationResult>;
  validateTeamConsistency(heimTeam: Team, gastTeam: Team): ValidationResult;
  validateClubConsistency(heimClub: Club, gastClub: Club, ligaId?: number): Promise<ValidationResult>;
  validateTeamOrClubRequired(spiel: SpielEntity): ValidationResult;
  validateScores(heimTore: number, gastTore: number): ValidationResult;
  validateStatusTransition(oldStatus: SpielStatus, newStatus: SpielStatus): ValidationResult;
  validateRequiredFields(spiel: SpielEntity): ValidationResult;
  validateSpieltagRange(spieltag: number): ValidationResult;
}

/**
 * Implementation of ValidationService
 * Provides comprehensive validation for Spiel entities
 */
export class SpielValidationService implements ValidationService {
  
  /**
   * Validates a complete Spiel result
   * Combines all validation checks for comprehensive validation
   */
  async validateSpielResult(spiel: SpielEntity): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate that either team OR club fields are provided
    const teamOrClubValidation = this.validateTeamOrClubRequired(spiel);
    errors.push(...teamOrClubValidation.errors);
    if (teamOrClubValidation.warnings) {
      warnings.push(...teamOrClubValidation.warnings);
    }

    // Validate team consistency (if using teams)
    if (spiel.heim_team && spiel.gast_team) {
      const teamValidation = this.validateTeamConsistency(spiel.heim_team, spiel.gast_team);
      errors.push(...teamValidation.errors);
      if (teamValidation.warnings) {
        warnings.push(...teamValidation.warnings);
      }
    }

    // Validate club consistency (if using clubs)
    if (spiel.heim_club && spiel.gast_club) {
      const clubValidation = await this.validateClubConsistency(
        spiel.heim_club, 
        spiel.gast_club, 
        spiel.liga?.id
      );
      errors.push(...clubValidation.errors);
      if (clubValidation.warnings) {
        warnings.push(...clubValidation.warnings);
      }
    }

    // Validate scores if provided
    if (spiel.heim_tore !== undefined && spiel.gast_tore !== undefined) {
      const scoreValidation = this.validateScores(spiel.heim_tore, spiel.gast_tore);
      errors.push(...scoreValidation.errors);
      if (scoreValidation.warnings) {
        warnings.push(...scoreValidation.warnings);
      }
    }

    // Validate required fields based on status
    const requiredFieldsValidation = this.validateRequiredFields(spiel);
    errors.push(...requiredFieldsValidation.errors);
    if (requiredFieldsValidation.warnings) {
      warnings.push(...requiredFieldsValidation.warnings);
    }

    // Validate spieltag range
    const spieltagValidation = this.validateSpieltagRange(spiel.spieltag);
    errors.push(...spieltagValidation.errors);
    if (spieltagValidation.warnings) {
      warnings.push(...spieltagValidation.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validates that teams are different (team cannot play against itself)
   */
  validateTeamConsistency(heimTeam: Team, gastTeam: Team): ValidationResult {
    const errors: ValidationError[] = [];

    if (heimTeam.id === gastTeam.id) {
      errors.push({
        field: 'teams',
        message: 'Ein Team kann nicht gegen sich selbst spielen',
        code: ValidationErrorCode.TEAM_AGAINST_ITSELF
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates that clubs are different and meet all business rules
   * Requirements: 1.2, 1.3, 9.4, 9.5
   */
  async validateClubConsistency(heimClub: Club, gastClub: Club, ligaId?: number): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic validation: club cannot play against itself
    if (heimClub.id === gastClub.id) {
      errors.push({
        field: 'clubs',
        message: 'Ein Club kann nicht gegen sich selbst spielen',
        code: ValidationErrorCode.CLUB_AGAINST_ITSELF
      });
    }

    try {
      // Validate that both clubs exist and are active
      const heimClubValidation = await this.validateClubExistsAndActive(heimClub.id);
      if (!heimClubValidation.isValid) {
        errors.push({
          field: 'heim_club',
          message: `Heim-Club ist ungültig: ${heimClubValidation.errors[0]?.message || 'Club nicht gefunden oder inaktiv'}`,
          code: ValidationErrorCode.CLUB_NOT_FOUND_OR_INACTIVE
        });
      }

      const gastClubValidation = await this.validateClubExistsAndActive(gastClub.id);
      if (!gastClubValidation.isValid) {
        errors.push({
          field: 'gast_club',
          message: `Gast-Club ist ungültig: ${gastClubValidation.errors[0]?.message || 'Club nicht gefunden oder inaktiv'}`,
          code: ValidationErrorCode.CLUB_NOT_FOUND_OR_INACTIVE
        });
      }

      // Validate that clubs belong to the same league (if liga is provided)
      if (ligaId && heimClubValidation.isValid && gastClubValidation.isValid) {
        const ligaValidation = await this.validateClubsInSameLiga(heimClub.id, gastClub.id, ligaId);
        if (!ligaValidation.isValid) {
          errors.push(...ligaValidation.errors);
        }
        if (ligaValidation.warnings) {
          warnings.push(...ligaValidation.warnings);
        }
      }

      // Additional business rule validations
      const businessRuleValidation = await this.validateClubBusinessRules(heimClub, gastClub);
      if (!businessRuleValidation.isValid) {
        errors.push(...businessRuleValidation.errors);
      }
      if (businessRuleValidation.warnings) {
        warnings.push(...businessRuleValidation.warnings);
      }

    } catch (error) {
      strapi.log.error('Error in club consistency validation:', error);
      errors.push({
        field: 'clubs',
        message: `Validierungsfehler: ${error.message}`,
        code: ValidationErrorCode.VALIDATION_ERROR
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate that a club exists and is active
   * @param clubId - Club ID to validate
   * @returns Validation result
   */
  async validateClubExistsAndActive(clubId: number): Promise<ValidationResult> {
    try {
      const club = await strapi.entityService.findOne('api::club.club', clubId);
      
      if (!club) {
        return {
          isValid: false,
          errors: [{
            field: 'club',
            message: `Club mit ID ${clubId} wurde nicht gefunden`,
            code: ValidationErrorCode.CLUB_NOT_FOUND_OR_INACTIVE
          }]
        };
      }

      if (!(club as any).aktiv) {
        return {
          isValid: false,
          errors: [{
            field: 'club',
            message: `Club "${(club as any).name}" ist inaktiv und kann nicht für Spiele verwendet werden`,
            code: ValidationErrorCode.CLUB_NOT_FOUND_OR_INACTIVE
          }]
        };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      strapi.log.error('Error validating club existence:', error);
      return {
        isValid: false,
        errors: [{
          field: 'club',
          message: `Fehler beim Validieren des Clubs: ${error.message}`,
          code: ValidationErrorCode.VALIDATION_ERROR
        }]
      };
    }
  }

  /**
   * Validate that both clubs belong to the same league
   * @param heimClubId - Home club ID
   * @param gastClubId - Away club ID  
   * @param ligaId - League ID
   * @returns Validation result
   */
  async validateClubsInSameLiga(heimClubId: number, gastClubId: number, ligaId: number): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Get clubs with their liga relationships
      const [heimClub, gastClub] = await Promise.all([
        strapi.entityService.findOne('api::club.club', heimClubId, {
          populate: { ligen: true }
        }),
        strapi.entityService.findOne('api::club.club', gastClubId, {
          populate: { ligen: true }
        })
      ]);

      if (!heimClub || !gastClub) {
        errors.push({
          field: 'clubs',
          message: 'Ein oder beide Clubs konnten nicht gefunden werden',
          code: ValidationErrorCode.CLUB_NOT_FOUND_OR_INACTIVE
        });
        return { isValid: false, errors };
      }

      // Check if home club is in the specified league
      const heimClubInLiga = (heimClub as any).ligen?.some((liga: any) => liga.id === ligaId);
      if (!heimClubInLiga) {
        errors.push({
          field: 'heim_club',
          message: `Heim-Club "${(heimClub as any).name}" ist nicht in der angegebenen Liga zugeordnet`,
          code: ValidationErrorCode.CLUB_NOT_IN_LIGA
        });
      }

      // Check if away club is in the specified league
      const gastClubInLiga = (gastClub as any).ligen?.some((liga: any) => liga.id === ligaId);
      if (!gastClubInLiga) {
        errors.push({
          field: 'gast_club',
          message: `Gast-Club "${(gastClub as any).name}" ist nicht in der angegebenen Liga zugeordnet`,
          code: ValidationErrorCode.CLUB_NOT_IN_LIGA
        });
      }

      // Warning if clubs are in multiple leagues
      if ((heimClub as any).ligen?.length > 1) {
        warnings.push({
          field: 'heim_club',
          message: `Heim-Club "${(heimClub as any).name}" spielt in mehreren Ligen`,
          code: ValidationWarningCode.CLUB_IN_MULTIPLE_LEAGUES
        });
      }

      if ((gastClub as any).ligen?.length > 1) {
        warnings.push({
          field: 'gast_club',
          message: `Gast-Club "${(gastClub as any).name}" spielt in mehreren Ligen`,
          code: ValidationWarningCode.CLUB_IN_MULTIPLE_LEAGUES
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      strapi.log.error('Error validating clubs in same liga:', error);
      return {
        isValid: false,
        errors: [{
          field: 'clubs',
          message: `Fehler beim Validieren der Liga-Zugehörigkeit: ${error.message}`,
          code: ValidationErrorCode.VALIDATION_ERROR
        }]
      };
    }
  }

  /**
   * Validate additional business rules for clubs
   * @param heimClub - Home club
   * @param gastClub - Away club
   * @returns Validation result
   */
  async validateClubBusinessRules(heimClub: Club, gastClub: Club): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Validate club types are compatible
      if (heimClub.club_typ === 'viktoria_verein' && gastClub.club_typ === 'viktoria_verein') {
        // Two Viktoria clubs playing against each other should be rare
        warnings.push({
          field: 'clubs',
          message: 'Zwei Viktoria-Vereine spielen gegeneinander - bitte prüfen Sie die Eingabe',
          code: ValidationWarningCode.VIKTORIA_VS_VIKTORIA
        });
      }

      // Validate Viktoria team mappings are different (if both are Viktoria clubs)
      if (heimClub.club_typ === 'viktoria_verein' && 
          gastClub.club_typ === 'viktoria_verein' &&
          heimClub.viktoria_team_mapping === gastClub.viktoria_team_mapping) {
        errors.push({
          field: 'clubs',
          message: 'Viktoria-Clubs mit derselben Team-Zuordnung können nicht gegeneinander spielen',
          code: ValidationErrorCode.DUPLICATE_VIKTORIA_MAPPING
        });
      }

      // Check for potential name conflicts or similar names
      const nameSimilarity = this.calculateNameSimilarity(heimClub.name, gastClub.name);
      if (nameSimilarity > 0.8) {
        warnings.push({
          field: 'clubs',
          message: `Club-Namen sind sehr ähnlich: "${heimClub.name}" vs "${gastClub.name}" - bitte prüfen Sie die Eingabe`,
          code: ValidationWarningCode.SIMILAR_CLUB_NAMES
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      strapi.log.error('Error validating club business rules:', error);
      return {
        isValid: false,
        errors: [{
          field: 'clubs',
          message: `Fehler bei der Geschäftsregel-Validierung: ${error.message}`,
          code: ValidationErrorCode.VALIDATION_ERROR
        }]
      };
    }
  }

  /**
   * Calculate name similarity between two strings (simple Levenshtein-based)
   * @param name1 - First name
   * @param name2 - Second name
   * @returns Similarity score (0-1, where 1 is identical)
   */
  calculateNameSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;
    
    const longer = name1.length > name2.length ? name1 : name2;
    const shorter = name1.length > name2.length ? name2 : name1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Edit distance
   */
  levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Validates that either team OR club fields are provided (backward compatibility)
   */
  validateTeamOrClubRequired(spiel: SpielEntity): ValidationResult {
    const errors: ValidationError[] = [];

    const hasTeamData = spiel.heim_team && spiel.gast_team;
    const hasClubData = spiel.heim_club && spiel.gast_club;

    // At least one pair must be provided
    if (!hasTeamData && !hasClubData) {
      errors.push({
        field: 'teams_or_clubs',
        message: 'Entweder Team-Felder (heim_team, gast_team) oder Club-Felder (heim_club, gast_club) müssen ausgefüllt sein',
        code: ValidationErrorCode.TEAM_OR_CLUB_REQUIRED
      });
    }

    // If only partial data is provided, show specific errors
    if (spiel.heim_team && !spiel.gast_team) {
      errors.push({
        field: 'gast_team',
        message: 'Gastteam ist erforderlich wenn Heimteam angegeben ist',
        code: ValidationErrorCode.INCOMPLETE_TEAM_DATA
      });
    }

    if (!spiel.heim_team && spiel.gast_team) {
      errors.push({
        field: 'heim_team',
        message: 'Heimteam ist erforderlich wenn Gastteam angegeben ist',
        code: ValidationErrorCode.INCOMPLETE_TEAM_DATA
      });
    }

    if (spiel.heim_club && !spiel.gast_club) {
      errors.push({
        field: 'gast_club',
        message: 'Gast-Club ist erforderlich wenn Heim-Club angegeben ist',
        code: ValidationErrorCode.INCOMPLETE_CLUB_DATA
      });
    }

    if (!spiel.heim_club && spiel.gast_club) {
      errors.push({
        field: 'heim_club',
        message: 'Heim-Club ist erforderlich wenn Gast-Club angegeben ist',
        code: ValidationErrorCode.INCOMPLETE_CLUB_DATA
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates score values (must be non-negative integers)
   */
  validateScores(heimTore: number, gastTore: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for negative scores
    if (heimTore < 0) {
      errors.push({
        field: 'heim_tore',
        message: 'Heimtore können nicht negativ sein',
        code: ValidationErrorCode.NEGATIVE_SCORE
      });
    }

    if (gastTore < 0) {
      errors.push({
        field: 'gast_tore',
        message: 'Gasttore können nicht negativ sein',
        code: ValidationErrorCode.NEGATIVE_SCORE
      });
    }

    // Check for non-integer values
    if (!Number.isInteger(heimTore)) {
      errors.push({
        field: 'heim_tore',
        message: 'Heimtore müssen eine ganze Zahl sein',
        code: ValidationErrorCode.NEGATIVE_SCORE
      });
    }

    if (!Number.isInteger(gastTore)) {
      errors.push({
        field: 'gast_tore',
        message: 'Gasttore müssen eine ganze Zahl sein',
        code: ValidationErrorCode.NEGATIVE_SCORE
      });
    }

    // Add warnings for unusually high scores
    if (heimTore > 10) {
      warnings.push({
        field: 'heim_tore',
        message: 'Ungewöhnlich hohe Toranzahl für Heimteam',
        code: ValidationWarningCode.HIGH_SCORE_VALUE
      });
    }

    if (gastTore > 10) {
      warnings.push({
        field: 'gast_tore',
        message: 'Ungewöhnlich hohe Toranzahl für Gastteam',
        code: ValidationWarningCode.HIGH_SCORE_VALUE
      });
    }

    // Add warning for unusual score differences
    const scoreDifference = Math.abs(heimTore - gastTore);
    if (scoreDifference > 5) {
      warnings.push({
        field: 'scores',
        message: 'Ungewöhnlich hohe Tordifferenz',
        code: ValidationWarningCode.UNUSUAL_SCORE_DIFFERENCE
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validates status transitions (e.g., geplant -> beendet)
   */
  validateStatusTransition(oldStatus: SpielStatus, newStatus: SpielStatus): ValidationResult {
    const errors: ValidationError[] = [];

    // Define valid transitions
    const validTransitions: Record<SpielStatus, SpielStatus[]> = {
      [SpielStatus.GEPLANT]: [SpielStatus.BEENDET, SpielStatus.ABGESAGT, SpielStatus.VERSCHOBEN],
      [SpielStatus.VERSCHOBEN]: [SpielStatus.GEPLANT, SpielStatus.BEENDET, SpielStatus.ABGESAGT],
      [SpielStatus.BEENDET]: [], // Completed games cannot be changed
      [SpielStatus.ABGESAGT]: [SpielStatus.GEPLANT, SpielStatus.VERSCHOBEN] // Cancelled games can be rescheduled
    };

    const allowedTransitions = validTransitions[oldStatus] || [];
    
    if (!allowedTransitions.includes(newStatus) && oldStatus !== newStatus) {
      errors.push({
        field: 'status',
        message: `Statuswechsel von "${oldStatus}" zu "${newStatus}" ist nicht erlaubt`,
        code: ValidationErrorCode.INVALID_STATUS_TRANSITION
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates required fields based on game status
   */
  validateRequiredFields(spiel: SpielEntity): ValidationResult {
    const errors: ValidationError[] = [];

    // For completed games, scores are required
    if (spiel.status === SpielStatus.BEENDET) {
      if (spiel.heim_tore === undefined || spiel.heim_tore === null) {
        errors.push({
          field: 'heim_tore',
          message: 'Heimtore sind für beendete Spiele erforderlich',
          code: ValidationErrorCode.SCORES_REQUIRED_FOR_COMPLETED
        });
      }

      if (spiel.gast_tore === undefined || spiel.gast_tore === null) {
        errors.push({
          field: 'gast_tore',
          message: 'Gasttore sind für beendete Spiele erforderlich',
          code: ValidationErrorCode.SCORES_REQUIRED_FOR_COMPLETED
        });
      }
    }

    // Team or club fields are validated separately in validateTeamOrClubRequired
    // This ensures backward compatibility

    if (!spiel.liga || !spiel.liga.id) {
      errors.push({
        field: 'liga',
        message: 'Liga ist erforderlich',
        code: ValidationErrorCode.MISSING_REQUIRED_FIELD
      });
    }

    if (!spiel.saison || !spiel.saison.id) {
      errors.push({
        field: 'saison',
        message: 'Saison ist erforderlich',
        code: ValidationErrorCode.MISSING_REQUIRED_FIELD
      });
    }

    if (!spiel.datum) {
      errors.push({
        field: 'datum',
        message: 'Spieltermin ist erforderlich',
        code: ValidationErrorCode.MISSING_REQUIRED_FIELD
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates spieltag range (typically 1-34 for football seasons)
   */
  validateSpieltagRange(spieltag: number): ValidationResult {
    const errors: ValidationError[] = [];

    if (!Number.isInteger(spieltag)) {
      errors.push({
        field: 'spieltag',
        message: 'Spieltag muss eine ganze Zahl sein',
        code: ValidationErrorCode.INVALID_SPIELTAG_RANGE
      });
    } else if (spieltag < 1 || spieltag > 34) {
      errors.push({
        field: 'spieltag',
        message: 'Spieltag muss zwischen 1 und 34 liegen',
        code: ValidationErrorCode.INVALID_SPIELTAG_RANGE
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitizes input data to prevent common issues
   */
  sanitizeSpielInput(input: Partial<SpielEntity>): Partial<SpielEntity> {
    const sanitized: Partial<SpielEntity> = { ...input };

    // Sanitize scores
    if (sanitized.heim_tore !== undefined) {
      sanitized.heim_tore = Math.max(0, Math.floor(Number(sanitized.heim_tore) || 0));
    }

    if (sanitized.gast_tore !== undefined) {
      sanitized.gast_tore = Math.max(0, Math.floor(Number(sanitized.gast_tore) || 0));
    }

    // Sanitize spieltag
    if (sanitized.spieltag !== undefined) {
      sanitized.spieltag = Math.max(1, Math.min(34, Math.floor(Number(sanitized.spieltag) || 1)));
    }

    // Sanitize status
    if (sanitized.status && !Object.values(SpielStatus).includes(sanitized.status)) {
      sanitized.status = SpielStatus.GEPLANT;
    }

    // Trim string fields
    if (sanitized.notizen) {
      sanitized.notizen = sanitized.notizen.trim();
    }

    return sanitized;
  }
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: ValidationErrorCode;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: ValidationWarningCode;
}

export enum ValidationErrorCode {
  NEGATIVE_SCORE = 'NEGATIVE_SCORE',
  TEAM_AGAINST_ITSELF = 'TEAM_AGAINST_ITSELF',
  CLUB_AGAINST_ITSELF = 'CLUB_AGAINST_ITSELF',
  TEAM_OR_CLUB_REQUIRED = 'TEAM_OR_CLUB_REQUIRED',
  INCOMPLETE_TEAM_DATA = 'INCOMPLETE_TEAM_DATA',
  INCOMPLETE_CLUB_DATA = 'INCOMPLETE_CLUB_DATA',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  INVALID_SPIELTAG_RANGE = 'INVALID_SPIELTAG_RANGE',
  SCORES_REQUIRED_FOR_COMPLETED = 'SCORES_REQUIRED_FOR_COMPLETED',
  // New club-specific validation errors
  CLUB_NOT_FOUND_OR_INACTIVE = 'CLUB_NOT_FOUND_OR_INACTIVE',
  CLUB_NOT_FOUND = 'CLUB_NOT_FOUND',
  CLUB_INACTIVE = 'CLUB_INACTIVE',
  CLUB_NOT_IN_LIGA = 'CLUB_NOT_IN_LIGA',
  DUPLICATE_VIKTORIA_MAPPING = 'DUPLICATE_VIKTORIA_MAPPING',
  GAME_NOT_FOUND = 'GAME_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export enum ValidationWarningCode {
  HIGH_SCORE_VALUE = 'HIGH_SCORE_VALUE',
  UNUSUAL_SCORE_DIFFERENCE = 'UNUSUAL_SCORE_DIFFERENCE',
  // New club-specific validation warnings
  CLUB_IN_MULTIPLE_LEAGUES = 'CLUB_IN_MULTIPLE_LEAGUES',
  VIKTORIA_VS_VIKTORIA = 'VIKTORIA_VS_VIKTORIA',
  SIMILAR_CLUB_NAMES = 'SIMILAR_CLUB_NAMES',
  OLD_GAME_DATE = 'OLD_GAME_DATE',
  FUTURE_GAME_DATE = 'FUTURE_GAME_DATE'
}

// Entity interfaces based on Strapi schema
export interface SpielEntity {
  id?: number;
  datum: string;
  liga: Liga;
  saison: Saison;
  // Team fields (deprecated but kept for backward compatibility)
  heim_team?: Team;
  gast_team?: Team;
  // New club fields
  heim_club?: Club;
  gast_club?: Club;
  heim_tore?: number;
  gast_tore?: number;
  spieltag: number;
  status: SpielStatus;
  notizen?: string;
  // New fields for automation tracking
  last_calculation?: string;
  calculation_status?: CalculationStatus;
  calculation_error?: string;
}

export interface Liga {
  id: number;
  name: string;
}

export interface Saison {
  id: number;
  name: string;
  jahr: number;
}

export interface Team {
  id: number;
  name: string;
  logo?: any;
}

export interface Club {
  id: number;
  name: string;
  kurz_name?: string;
  logo?: any;
  club_typ: 'viktoria_verein' | 'gegner_verein';
  viktoria_team_mapping?: 'team_1' | 'team_2' | 'team_3';
  aktiv: boolean;
}

export enum SpielStatus {
  GEPLANT = 'geplant',
  BEENDET = 'beendet',
  ABGESAGT = 'abgesagt',
  VERSCHOBEN = 'verschoben'
}

export enum CalculationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}