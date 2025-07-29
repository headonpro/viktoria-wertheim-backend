/**
 * Comprehensive Game Validation Service for Club-based Games
 * Implements requirements 1.2, 1.3, 9.4, 9.5
 */

import { factories } from '@strapi/strapi';
import { SpielValidationService, ValidationResult, ValidationError, ValidationWarning, ValidationErrorCode, ValidationWarningCode } from './validation';

interface GameValidationResult extends ValidationResult {
  details?: {
    clubValidation?: ValidationResult;
    ligaValidation?: ValidationResult;
    businessRuleValidation?: ValidationResult;
    note?: string;
  };
}

interface DetailedValidationError extends ValidationError {
  severity: 'error' | 'warning';
  suggestion?: string;
  relatedField?: string;
}

export default factories.createCoreService('api::spiel.spiel', ({ strapi }) => ({
  
  /**
   * Comprehensive validation for club-based games
   * @param gameData - Game data to validate
   * @returns Detailed validation result
   */
  async validateClubGame(gameData: any): Promise<GameValidationResult> {
    try {
      const errors: DetailedValidationError[] = [];
      const gameWarnings: ValidationWarning[] = [];
      const details: any = {};

      // Initialize validation service
      const validationService = new SpielValidationService();

      // 1. Validate that both clubs exist and are active
      if (gameData.heim_club && gameData.gast_club) {
        const clubValidation = await this.validateClubsExistAndActive(
          gameData.heim_club, 
          gameData.gast_club
        );
        details.clubValidation = clubValidation;
        
        if (!clubValidation.isValid) {
          errors.push(...clubValidation.errors.map(e => ({
            ...e,
            severity: 'error' as const,
            suggestion: this.getClubErrorSuggestion(e.code)
          })));
        }
      }

      // 2. Validate that clubs belong to the same league
      if (gameData.heim_club && gameData.gast_club && gameData.liga) {
        const ligaValidation = await this.validateClubsInLiga(
          gameData.heim_club,
          gameData.gast_club,
          gameData.liga
        );
        details.ligaValidation = ligaValidation;
        
        if (!ligaValidation.isValid) {
          errors.push(...ligaValidation.errors.map(e => ({
            ...e,
            severity: 'error' as const,
            suggestion: this.getLigaErrorSuggestion(e.code)
          })));
        }
        
        if (ligaValidation.warnings) {
          gameWarnings.push(...ligaValidation.warnings);
        }
      }

      // 3. Validate that clubs don't play against themselves
      if (gameData.heim_club && gameData.gast_club) {
        const selfPlayValidation = this.validateClubsNotSame(
          gameData.heim_club,
          gameData.gast_club
        );
        
        if (!selfPlayValidation.isValid) {
          errors.push(...selfPlayValidation.errors.map(e => ({
            ...e,
            severity: 'error' as const,
            suggestion: 'Wählen Sie unterschiedliche Clubs für Heim und Gast aus'
          })));
        }
      }

      // 4. Business rule validation
      if (gameData.heim_club && gameData.gast_club) {
        const businessRuleValidation = await this.validateBusinessRules(gameData);
        details.businessRuleValidation = businessRuleValidation;
        
        if (!businessRuleValidation.isValid) {
          errors.push(...businessRuleValidation.errors.map(e => ({
            ...e,
            severity: 'error' as const,
            suggestion: this.getBusinessRuleErrorSuggestion(e.code)
          })));
        }
        
        if (businessRuleValidation.warnings) {
          gameWarnings.push(...businessRuleValidation.warnings);
        }
      }

      // 5. Additional game data validation
      const gameDataValidation = await validationService.validateSpielResult(gameData);
      if (!gameDataValidation.isValid) {
        errors.push(...gameDataValidation.errors.map(e => ({
          ...e,
          severity: 'error' as const,
          suggestion: this.getGameDataErrorSuggestion(e.code)
        })));
      }
      
      if (gameDataValidation.warnings) {
        gameWarnings.push(...gameDataValidation.warnings);
      }

      const result: GameValidationResult = {
        isValid: errors.length === 0,
        errors: errors as ValidationError[],
        warnings: gameWarnings.length > 0 ? gameWarnings : undefined,
        details
      };

      strapi.log.debug('Club game validation completed:', {
        isValid: result.isValid,
        errorCount: errors.length,
        warningCount: gameWarnings.length
      });

      return result;
    } catch (error) {
      strapi.log.error('Error in club game validation:', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: `Validierungsfehler: ${error.message}`,
          code: ValidationErrorCode.VALIDATION_ERROR
        }]
      };
    }
  },

  /**
   * Validate that both clubs exist and are active
   * @param heimClub - Home club data or ID
   * @param gastClub - Away club data or ID
   * @returns Validation result
   */
  async validateClubsExistAndActive(heimClub: any, gastClub: any): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      
      // Get club IDs
      const heimClubId = typeof heimClub === 'object' ? heimClub.id : heimClub;
      const gastClubId = typeof gastClub === 'object' ? gastClub.id : gastClub;

      // Validate home club
      const heimClubData = await strapi.entityService.findOne('api::club.club', heimClubId);
      if (!heimClubData) {
        errors.push({
          field: 'heim_club',
          message: `Heim-Club mit ID ${heimClubId} wurde nicht gefunden`,
          code: ValidationErrorCode.CLUB_NOT_FOUND
        });
      } else if (!(heimClubData as any).aktiv) {
        errors.push({
          field: 'heim_club',
          message: `Heim-Club "${(heimClubData as any).name}" ist inaktiv`,
          code: ValidationErrorCode.CLUB_INACTIVE
        });
      }

      // Validate away club
      const gastClubData = await strapi.entityService.findOne('api::club.club', gastClubId);
      if (!gastClubData) {
        errors.push({
          field: 'gast_club',
          message: `Gast-Club mit ID ${gastClubId} wurde nicht gefunden`,
          code: ValidationErrorCode.CLUB_NOT_FOUND
        });
      } else if (!(gastClubData as any).aktiv) {
        errors.push({
          field: 'gast_club',
          message: `Gast-Club "${(gastClubData as any).name}" ist inaktiv`,
          code: ValidationErrorCode.CLUB_INACTIVE
        });
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      strapi.log.error('Error validating club existence:', error);
      return {
        isValid: false,
        errors: [{
          field: 'clubs',
          message: `Fehler beim Validieren der Clubs: ${error.message}`,
          code: ValidationErrorCode.VALIDATION_ERROR
        }]
      };
    }
  },

  /**
   * Validate that clubs belong to the specified league
   * @param heimClub - Home club data or ID
   * @param gastClub - Away club data or ID
   * @param liga - League data or ID
   * @returns Validation result
   */
  async validateClubsInLiga(heimClub: any, gastClub: any, liga: any): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      
      // Get IDs
      const heimClubId = typeof heimClub === 'object' ? heimClub.id : heimClub;
      const gastClubId = typeof gastClub === 'object' ? gastClub.id : gastClub;
      const ligaId = typeof liga === 'object' ? liga.id : liga;

      // Get clubs with their liga relationships
      const [heimClubData, gastClubData] = await Promise.all([
        strapi.entityService.findOne('api::club.club', heimClubId, {
          populate: { ligen: true }
        }),
        strapi.entityService.findOne('api::club.club', gastClubId, {
          populate: { ligen: true }
        })
      ]);

      if (!heimClubData || !gastClubData) {
        errors.push({
          field: 'clubs',
          message: 'Ein oder beide Clubs konnten nicht gefunden werden',
          code: ValidationErrorCode.CLUB_NOT_FOUND
        });
        return { isValid: false, errors };
      }

      // Check if home club is in the league
      const heimClubInLiga = (heimClubData as any).ligen?.some((l: any) => l.id === ligaId);
      if (!heimClubInLiga) {
        errors.push({
          field: 'heim_club',
          message: `Heim-Club "${(heimClubData as any).name}" ist nicht in der ausgewählten Liga`,
          code: ValidationErrorCode.CLUB_NOT_IN_LIGA
        });
      }

      // Check if away club is in the league
      const gastClubInLiga = (gastClubData as any).ligen?.some((l: any) => l.id === ligaId);
      if (!gastClubInLiga) {
        errors.push({
          field: 'gast_club',
          message: `Gast-Club "${(gastClubData as any).name}" ist nicht in der ausgewählten Liga`,
          code: ValidationErrorCode.CLUB_NOT_IN_LIGA
        });
      }

      // Add warnings for clubs in multiple leagues
      if ((heimClubData as any).ligen?.length > 1) {
        warnings.push({
          field: 'heim_club',
          message: `Heim-Club "${(heimClubData as any).name}" spielt in mehreren Ligen`,
          code: ValidationWarningCode.CLUB_IN_MULTIPLE_LEAGUES
        });
      }

      if ((gastClubData as any).ligen?.length > 1) {
        warnings.push({
          field: 'gast_club',
          message: `Gast-Club "${(gastClubData as any).name}" spielt in mehreren Ligen`,
          code: ValidationWarningCode.CLUB_IN_MULTIPLE_LEAGUES
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      strapi.log.error('Error validating clubs in liga:', error);
      return {
        isValid: false,
        errors: [{
          field: 'clubs',
          message: `Fehler beim Validieren der Liga-Zugehörigkeit: ${error.message}`,
          code: ValidationErrorCode.VALIDATION_ERROR
        }]
      };
    }
  },

  /**
   * Validate that clubs are not the same (prevent self-play)
   * @param heimClub - Home club data or ID
   * @param gastClub - Away club data or ID
   * @returns Validation result
   */
  validateClubsNotSame(heimClub: any, gastClub: any): ValidationResult {
    const heimClubId = typeof heimClub === 'object' ? heimClub.id : heimClub;
    const gastClubId = typeof gastClub === 'object' ? gastClub.id : gastClub;

    if (heimClubId === gastClubId) {
      return {
        isValid: false,
        errors: [{
          field: 'clubs',
          message: 'Ein Club kann nicht gegen sich selbst spielen',
          code: ValidationErrorCode.CLUB_AGAINST_ITSELF
        }]
      };
    }

    return { isValid: true, errors: [] };
  },

  /**
   * Validate business rules for club games
   * @param gameData - Game data to validate
   * @returns Validation result
   */
  async validateBusinessRules(gameData: any): Promise<ValidationResult> {
    try {
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Get full club data
      const [heimClubData, gastClubData] = await Promise.all([
        strapi.entityService.findOne('api::club.club', gameData.heim_club.id || gameData.heim_club),
        strapi.entityService.findOne('api::club.club', gameData.gast_club.id || gameData.gast_club)
      ]);

      if (!heimClubData || !gastClubData) {
        return { isValid: true, errors: [] }; // Skip business rules if clubs not found
      }

      // Check for Viktoria vs Viktoria games (unusual but not invalid)
      if ((heimClubData as any).club_typ === 'viktoria_verein' && 
          (gastClubData as any).club_typ === 'viktoria_verein') {
        warnings.push({
          field: 'clubs',
          message: 'Zwei Viktoria-Vereine spielen gegeneinander - bitte prüfen Sie die Eingabe',
          code: ValidationWarningCode.VIKTORIA_VS_VIKTORIA
        });

        // Check for same team mapping (this would be an error)
        if ((heimClubData as any).viktoria_team_mapping === (gastClubData as any).viktoria_team_mapping) {
          errors.push({
            field: 'clubs',
            message: 'Viktoria-Clubs mit derselben Team-Zuordnung können nicht gegeneinander spielen',
            code: ValidationErrorCode.DUPLICATE_VIKTORIA_MAPPING
          });
        }
      }

      // Check for similar club names (potential input error)
      const nameSimilarity = this.calculateNameSimilarity(
        (heimClubData as any).name,
        (gastClubData as any).name
      );
      
      if (nameSimilarity > 0.8 && nameSimilarity < 1.0) {
        warnings.push({
          field: 'clubs',
          message: `Club-Namen sind sehr ähnlich: "${(heimClubData as any).name}" vs "${(gastClubData as any).name}"`,
          code: ValidationWarningCode.SIMILAR_CLUB_NAMES
        });
      }

      // Validate game date is reasonable
      if (gameData.datum) {
        const gameDate = new Date(gameData.datum);
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

        if (gameDate < oneYearAgo) {
          warnings.push({
            field: 'datum',
            message: 'Spieltermin liegt mehr als ein Jahr in der Vergangenheit',
            code: ValidationWarningCode.OLD_GAME_DATE
          });
        } else if (gameDate > oneYearFromNow) {
          warnings.push({
            field: 'datum',
            message: 'Spieltermin liegt mehr als ein Jahr in der Zukunft',
            code: ValidationWarningCode.FUTURE_GAME_DATE
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      strapi.log.error('Error validating business rules:', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: `Fehler bei der Geschäftsregel-Validierung: ${error.message}`,
          code: ValidationErrorCode.VALIDATION_ERROR
        }]
      };
    }
  },

  /**
   * Calculate name similarity between two strings
   * @param name1 - First name
   * @param name2 - Second name
   * @returns Similarity score (0-1)
   */
  calculateNameSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;
    
    const longer = name1.length > name2.length ? name1.toLowerCase() : name2.toLowerCase();
    const shorter = name1.length > name2.length ? name2.toLowerCase() : name1.toLowerCase();
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  },

  /**
   * Calculate Levenshtein distance
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
  },

  // Error suggestion methods
  getClubErrorSuggestion(errorCode: string): string {
    switch (errorCode) {
      case 'CLUB_NOT_FOUND':
        return 'Überprüfen Sie, ob der Club existiert und korrekt ausgewählt wurde';
      case 'CLUB_INACTIVE':
        return 'Aktivieren Sie den Club oder wählen Sie einen aktiven Club aus';
      default:
        return 'Überprüfen Sie die Club-Auswahl';
    }
  },

  getLigaErrorSuggestion(errorCode: string): string {
    switch (errorCode) {
      case 'CLUB_NOT_IN_LIGA':
        return 'Ordnen Sie den Club der entsprechenden Liga zu oder wählen Sie die korrekte Liga aus';
      default:
        return 'Überprüfen Sie die Liga-Zuordnungen der Clubs';
    }
  },

  getLigaWarningSuggestion(warningCode: string): string {
    switch (warningCode) {
      case 'CLUB_IN_MULTIPLE_LEAGUES':
        return 'Stellen Sie sicher, dass die korrekte Liga für das Spiel ausgewählt ist';
      default:
        return 'Überprüfen Sie die Liga-Einstellungen';
    }
  },

  getBusinessRuleErrorSuggestion(errorCode: string): string {
    switch (errorCode) {
      case 'DUPLICATE_VIKTORIA_MAPPING':
        return 'Überprüfen Sie die Team-Zuordnungen der Viktoria-Clubs';
      case 'CLUB_AGAINST_ITSELF':
        return 'Wählen Sie unterschiedliche Clubs für Heim und Gast aus';
      default:
        return 'Überprüfen Sie die Spiel-Konfiguration';
    }
  },

  getBusinessRuleWarningSuggestion(warningCode: string): string {
    switch (warningCode) {
      case 'VIKTORIA_VS_VIKTORIA':
        return 'Bestätigen Sie, dass zwei Viktoria-Teams tatsächlich gegeneinander spielen';
      case 'SIMILAR_CLUB_NAMES':
        return 'Überprüfen Sie, ob die richtigen Clubs ausgewählt wurden';
      case 'OLD_GAME_DATE':
        return 'Überprüfen Sie das Spieldatum';
      case 'FUTURE_GAME_DATE':
        return 'Überprüfen Sie das Spieldatum';
      default:
        return 'Überprüfen Sie die Eingaben';
    }
  },

  getGameDataErrorSuggestion(errorCode: string): string {
    switch (errorCode) {
      case 'NEGATIVE_SCORE':
        return 'Tore müssen positive Zahlen sein';
      case 'SCORES_REQUIRED_FOR_COMPLETED':
        return 'Geben Sie die Tore für beendete Spiele ein';
      case 'MISSING_REQUIRED_FIELD':
        return 'Füllen Sie alle Pflichtfelder aus';
      default:
        return 'Überprüfen Sie die Spieldaten';
    }
  },

  getGameDataWarningSuggestion(warningCode: string): string {
    switch (warningCode) {
      case 'HIGH_SCORE_VALUE':
        return 'Überprüfen Sie die eingegebenen Tore';
      case 'UNUSUAL_SCORE_DIFFERENCE':
        return 'Überprüfen Sie das Spielergebnis';
      default:
        return 'Überprüfen Sie die Eingaben';
    }
  },

  /**
   * Get user-friendly validation summary
   * @param validation - Validation result
   * @returns Formatted summary
   */
  getValidationSummary(validation: GameValidationResult): {
    isValid: boolean;
    summary: string;
    errorCount: number;
    warningCount: number;
    messages: string[];
  } {
    const errorCount = validation.errors.length;
    const warningCount = validation.warnings?.length || 0;
    
    const messages: string[] = [];
    
    // Add error messages
    validation.errors.forEach(error => {
      messages.push(`❌ ${error.message}`);
    });
    
    // Add warning messages
    validation.warnings?.forEach(warning => {
      messages.push(`⚠️ ${warning.message}`);
    });

    let summary = '';
    if (validation.isValid) {
      summary = warningCount > 0 
        ? `Validierung erfolgreich mit ${warningCount} Warnung(en)`
        : 'Validierung erfolgreich';
    } else {
      summary = `Validierung fehlgeschlagen: ${errorCount} Fehler`;
      if (warningCount > 0) {
        summary += `, ${warningCount} Warnung(en)`;
      }
    }

    return {
      isValid: validation.isValid,
      summary,
      errorCount,
      warningCount,
      messages
    };
  },

  /**
   * Validate game creation
   * @param gameData - Game data for creation
   * @returns Validation result
   */
  async validateGameCreation(gameData: any): Promise<GameValidationResult> {
    strapi.log.debug('Validating game creation:', { 
      hasClubs: !!(gameData.heim_club && gameData.gast_club),
      hasTeams: !!(gameData.heim_team && gameData.gast_team)
    });

    // Use club validation if club data is provided
    if (gameData.heim_club && gameData.gast_club) {
      return await this.validateClubGame(gameData);
    }

    // Fallback to basic validation for team-based games
    const validationService = new SpielValidationService();
    const result = await validationService.validateSpielResult(gameData);
    
    return {
      ...result,
      details: { note: 'Team-based validation used (legacy mode)' }
    };
  },

  /**
   * Validate game update
   * @param gameData - Game data for update
   * @param gameId - ID of game being updated
   * @returns Validation result
   */
  async validateGameUpdate(gameData: any, gameId: number): Promise<GameValidationResult> {
    try {
      // Get existing game data
      const existingGame = await strapi.entityService.findOne('api::spiel.spiel', gameId, {
        populate: ['heim_club', 'gast_club', 'heim_team', 'gast_team', 'liga', 'saison']
      });

      if (!existingGame) {
        return {
          isValid: false,
          errors: [{
            field: 'id',
            message: `Spiel mit ID ${gameId} wurde nicht gefunden`,
            code: ValidationErrorCode.GAME_NOT_FOUND
          }]
        };
      }

      // Merge existing data with updates
      const mergedData = {
        ...(existingGame as any),
        ...gameData
      };

      strapi.log.debug('Validating game update:', { 
        gameId,
        hasClubs: !!(mergedData.heim_club && mergedData.gast_club),
        hasTeams: !!(mergedData.heim_team && mergedData.gast_team)
      });

      // Use appropriate validation based on data type
      if (mergedData.heim_club && mergedData.gast_club) {
        return await this.validateClubGame(mergedData);
      } else {
        const validationService = new SpielValidationService();
        const result = await validationService.validateSpielResult(mergedData);
        
        return {
          ...result,
          details: { note: 'Team-based validation used (legacy mode)' }
        };
      }
    } catch (error) {
      strapi.log.error('Error validating game update:', error);
      return {
        isValid: false,
        errors: [{
          field: 'general',
          message: `Update-Validierung fehlgeschlagen: ${error.message}`,
          code: ValidationErrorCode.VALIDATION_ERROR
        }]
      };
    }
  }
}));