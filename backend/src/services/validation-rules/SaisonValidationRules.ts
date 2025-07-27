/**
 * Saison-specific Validation Rules
 * 
 * Specialized validation rules for saison content type including season overlap,
 * active season constraints, and date validation.
 */

import { ValidationRule, ValidationContext } from '../ValidationService';

/**
 * Saison validation rule implementations
 */
export class SaisonValidationRules {
  private strapi: any;

  constructor(strapi: any) {
    this.strapi = strapi;
  }

  /**
   * Get all saison validation rules
   */
  getAllRules(): ValidationRule[] {
    return [
      this.createRequiredFieldsRule(),
      this.createDateValidationRule(),
      this.createDateRangeRule(),
      this.createSeasonOverlapRule(),
      this.createActiveSeasonConstraintRule(),
      this.createNameLengthRule(),
      this.createSeasonDeletionRule()
    ];
  }

  /**
   * Required fields validation
   */
  private createRequiredFieldsRule(): ValidationRule {
    return {
      name: 'saison-required-fields',
      type: 'critical',
      validator: (data: any, context?: ValidationContext) => {
        // Name is always required
        if (!data.name || data.name.trim() === '') {
          return false;
        }

        // If one date is provided, both must be provided
        if ((data.start_datum && !data.end_datum) || (!data.start_datum && data.end_datum)) {
          return false;
        }

        return true;
      },
      message: 'Saison-Name ist erforderlich. Wenn Daten angegeben werden, müssen sowohl Start- als auch Enddatum vorhanden sein.',
      enabled: true,
      priority: 1
    };
  }

  /**
   * Date format validation
   */
  private createDateValidationRule(): ValidationRule {
    return {
      name: 'saison-date-format',
      type: 'critical',
      validator: (data: any, context?: ValidationContext) => {
        if (data.start_datum) {
          const startDate = new Date(data.start_datum);
          if (isNaN(startDate.getTime())) {
            return false;
          }
        }

        if (data.end_datum) {
          const endDate = new Date(data.end_datum);
          if (isNaN(endDate.getTime())) {
            return false;
          }
        }

        return true;
      },
      message: 'Start- und Enddatum müssen gültige Datumsformate haben.',
      enabled: true,
      priority: 2
    };
  }

  /**
   * Date range validation
   */
  private createDateRangeRule(): ValidationRule {
    return {
      name: 'saison-date-range',
      type: 'critical',
      validator: (data: any, context?: ValidationContext) => {
        if (!data.start_datum || !data.end_datum) {
          return true; // Skip if dates not provided
        }

        const startDate = new Date(data.start_datum);
        const endDate = new Date(data.end_datum);

        return startDate < endDate;
      },
      message: 'Das Startdatum der Saison muss vor dem Enddatum liegen.',
      enabled: true,
      priority: 3,
      dependencies: ['saison-date-format']
    };
  }

  /**
   * Season overlap validation with configurable checking and conflict resolution
   */
  private createSeasonOverlapRule(): ValidationRule {
    return {
      name: 'saison-overlap-validation',
      type: process.env.SAISON_STRICT_VALIDATION === 'true' ? 'critical' : 'warning',
      validator: async (data: any, context?: ValidationContext) => {
        // Skip if overlap validation is disabled
        if (process.env.SAISON_OVERLAP_VALIDATION !== 'true') {
          this.strapi.log.info('Season overlap validation disabled', {
            season: data.name || 'Unnamed Season',
            startDate: data.start_datum,
            endDate: data.end_datum,
            configFlag: 'SAISON_OVERLAP_VALIDATION=false'
          });
          return true;
        }

        if (!data.start_datum || !data.end_datum) {
          return true; // Skip if dates not provided
        }

        try {
          const overlappingSeasons = await this.findOverlappingSeasons(
            data.start_datum, 
            data.end_datum, 
            context?.existingData?.id
          );

          if (overlappingSeasons.length > 0) {
            // Store overlapping seasons in context for detailed error message
            if (context) {
              context.overlappingSeasons = overlappingSeasons;
              context.overlapDetails = this.analyzeOverlaps(data, overlappingSeasons);
            }
            
            // Log overlap details for debugging
            this.strapi.log.warn('Season overlap detected', {
              newSeason: {
                name: data.name,
                start: data.start_datum,
                end: data.end_datum
              },
              overlappingSeasons: overlappingSeasons.map(s => ({
                name: s.name,
                start: s.start_datum,
                end: s.end_datum,
                overlapType: this.getOverlapType(data, s)
              }))
            });
            
            return false;
          }

          return true;
        } catch (error) {
          this.strapi.log.error('Season overlap validation failed:', error);
          
          // In strict mode, fail on database errors
          if (process.env.SAISON_STRICT_VALIDATION === 'true') {
            if (context) {
              context.validationError = error.message;
            }
            return false;
          }
          
          // In non-strict mode, allow operation to proceed with warning
          this.strapi.log.warn('Season overlap validation proceeding despite error (non-strict mode)');
          return true;
        }
      },
      message: 'Der Zeitraum dieser Saison überschneidet sich mit bestehenden Saisons.',
      enabled: process.env.SAISON_OVERLAP_VALIDATION === 'true',
      priority: 4,
      async: true,
      dependencies: ['saison-date-range']
    };
  }

  /**
   * Find overlapping seasons with improved query logic
   */
  private async findOverlappingSeasons(startDate: string, endDate: string, excludeId?: number): Promise<any[]> {
    const filters: any = {
      $or: [
        // Case 1: New season starts during existing season
        {
          $and: [
            { start_datum: { $lte: startDate } },
            { end_datum: { $gt: startDate } } // Changed from $gte to $gt for exact boundary handling
          ]
        },
        // Case 2: New season ends during existing season
        {
          $and: [
            { start_datum: { $lt: endDate } }, // Changed from $lte to $lt for exact boundary handling
            { end_datum: { $gte: endDate } }
          ]
        },
        // Case 3: New season completely contains existing season
        {
          $and: [
            { start_datum: { $gte: startDate } },
            { end_datum: { $lte: endDate } }
          ]
        },
        // Case 4: Existing season completely contains new season
        {
          $and: [
            { start_datum: { $lte: startDate } },
            { end_datum: { $gte: endDate } }
          ]
        }
      ]
    };

    // Exclude current season during updates
    if (excludeId) {
      filters.id = { $ne: excludeId };
    }

    const overlappingSeasons = await this.strapi.entityService.findMany('api::saison.saison', {
      filters,
      fields: ['id', 'name', 'start_datum', 'end_datum', 'aktiv'],
      pagination: { limit: 10 } // Increased limit for better conflict analysis
    });

    return overlappingSeasons ? (Array.isArray(overlappingSeasons) ? overlappingSeasons : [overlappingSeasons]) : [];
  }

  /**
   * Analyze overlap types and provide conflict resolution suggestions
   */
  private analyzeOverlaps(newSeason: any, overlappingSeasons: any[]): any {
    const analysis = {
      totalOverlaps: overlappingSeasons.length,
      overlapTypes: [] as any[],
      conflictResolution: [] as any[],
      activeSeasonConflicts: overlappingSeasons.filter(s => s.aktiv).length
    };

    for (const existingSeason of overlappingSeasons) {
      const overlapType = this.getOverlapType(newSeason, existingSeason);
      const resolution = this.suggestConflictResolution(newSeason, existingSeason, overlapType);
      
      analysis.overlapTypes.push({
        seasonId: existingSeason.id,
        seasonName: existingSeason.name,
        type: overlapType,
        isActive: existingSeason.aktiv
      });
      
      analysis.conflictResolution.push(resolution);
    }

    return analysis;
  }

  /**
   * Determine the type of overlap between two seasons
   */
  private getOverlapType(newSeason: any, existingSeason: any): string {
    const newStart = new Date(newSeason.start_datum);
    const newEnd = new Date(newSeason.end_datum);
    const existingStart = new Date(existingSeason.start_datum);
    const existingEnd = new Date(existingSeason.end_datum);

    if (newStart <= existingStart && newEnd >= existingEnd) {
      return 'CONTAINS'; // New season completely contains existing
    } else if (newStart >= existingStart && newEnd <= existingEnd) {
      return 'CONTAINED'; // New season is contained within existing
    } else if (newStart < existingStart && newEnd > existingStart && newEnd < existingEnd) {
      return 'STARTS_BEFORE'; // New season starts before and overlaps into existing
    } else if (newStart > existingStart && newStart < existingEnd && newEnd > existingEnd) {
      return 'ENDS_AFTER'; // New season starts within existing and extends beyond
    } else {
      return 'UNKNOWN';
    }
  }

  /**
   * Suggest conflict resolution strategies
   */
  private suggestConflictResolution(newSeason: any, existingSeason: any, overlapType: string): any {
    const resolution = {
      seasonId: existingSeason.id,
      seasonName: existingSeason.name,
      overlapType,
      suggestions: [] as string[]
    };

    switch (overlapType) {
      case 'CONTAINS':
        resolution.suggestions.push(`Verkürzen Sie die neue Saison "${newSeason.name}" um die bestehende Saison "${existingSeason.name}" nicht zu überschneiden`);
        resolution.suggestions.push(`Verschieben Sie die bestehende Saison "${existingSeason.name}" außerhalb des neuen Zeitraums`);
        break;
      
      case 'CONTAINED':
        resolution.suggestions.push(`Erweitern Sie die bestehende Saison "${existingSeason.name}" oder verkürzen Sie die neue Saison "${newSeason.name}"`);
        resolution.suggestions.push(`Verschieben Sie die neue Saison "${newSeason.name}" vor oder nach die bestehende Saison`);
        break;
      
      case 'STARTS_BEFORE':
        resolution.suggestions.push(`Verschieben Sie das Enddatum der neuen Saison "${newSeason.name}" vor das Startdatum der bestehenden Saison`);
        resolution.suggestions.push(`Verschieben Sie das Startdatum der bestehenden Saison "${existingSeason.name}" nach das Enddatum der neuen Saison`);
        break;
      
      case 'ENDS_AFTER':
        resolution.suggestions.push(`Verschieben Sie das Startdatum der neuen Saison "${newSeason.name}" nach das Enddatum der bestehenden Saison`);
        resolution.suggestions.push(`Verschieben Sie das Enddatum der bestehenden Saison "${existingSeason.name}" vor das Startdatum der neuen Saison`);
        break;
      
      default:
        resolution.suggestions.push(`Überprüfen Sie die Datumsbereiche beider Saisons und passen Sie sie entsprechend an`);
    }

    if (existingSeason.aktiv) {
      resolution.suggestions.unshift(`ACHTUNG: "${existingSeason.name}" ist die aktive Saison. Besondere Vorsicht bei Änderungen erforderlich.`);
    }

    return resolution;
  }

  /**
   * Active season constraint validation
   */
  private createActiveSeasonConstraintRule(): ValidationRule {
    return {
      name: 'saison-active-constraint',
      type: 'warning',
      validator: async (data: any, context?: ValidationContext) => {
        if (!data.aktiv) {
          return true; // Not setting as active, no constraint
        }

        try {
          const filters: any = { aktiv: true };

          // Exclude current season during updates
          if (context?.operation === 'update' && context.existingData?.id) {
            filters.id = { $ne: context.existingData.id };
          }

          const activeSeasons = await this.strapi.entityService.findMany('api::saison.saison', {
            filters,
            fields: ['id', 'name'],
            pagination: { limit: 5 }
          });

          if (activeSeasons && activeSeasons.length > 0) {
            const seasonsArray = Array.isArray(activeSeasons) ? activeSeasons : [activeSeasons];
            
            // Store active seasons in context for detailed handling
            if (context) {
              context.activeSeasons = seasonsArray;
            }
            
            return false;
          }

          return true;
        } catch (error) {
          this.strapi.log.error('Active season constraint validation failed:', error);
          // In case of database error, allow operation to proceed
          return true;
        }
      },
      message: 'Es kann nur eine aktive Saison gleichzeitig geben. Andere aktive Saisons werden automatisch deaktiviert.',
      enabled: true,
      priority: 5,
      async: true
    };
  }

  /**
   * Name length validation
   */
  private createNameLengthRule(): ValidationRule {
    return {
      name: 'saison-name-length',
      type: 'warning',
      validator: (data: any, context?: ValidationContext) => {
        if (!data.name) return true;
        
        const name = data.name.trim();
        return name.length >= 2 && name.length <= 100;
      },
      message: 'Der Saison-Name muss zwischen 2 und 100 Zeichen lang sein.',
      enabled: true,
      priority: 6
    };
  }

  /**
   * Season deletion validation
   */
  private createSeasonDeletionRule(): ValidationRule {
    return {
      name: 'saison-deletion-validation',
      type: 'critical',
      validator: async (data: any, context?: ValidationContext) => {
        if (context?.operation !== 'delete') {
          return true; // Only applies to deletion
        }

        const seasonId = context.existingData?.id;
        if (!seasonId) return true;

        try {
          // Check if season is active
          if (context.existingData?.aktiv) {
            return false;
          }

          // Check for dependent teams
          const teams = await this.strapi.entityService.findMany('api::team.team', {
            filters: { saison: seasonId },
            fields: ['id', 'name'],
            pagination: { limit: 5 }
          });

          if (teams && teams.length > 0) {
            const teamsArray = Array.isArray(teams) ? teams : [teams];
            if (context) {
              context.dependentTeams = teamsArray;
            }
            return false;
          }

          // Check for dependent leagues
          const leagues = await this.strapi.entityService.findMany('api::liga.liga', {
            filters: { saison: seasonId },
            fields: ['id', 'name'],
            pagination: { limit: 5 }
          });

          if (leagues && leagues.length > 0) {
            const leaguesArray = Array.isArray(leagues) ? leagues : [leagues];
            if (context) {
              context.dependentLeagues = leaguesArray;
            }
            return false;
          }

          return true;
        } catch (error) {
          this.strapi.log.error('Season deletion validation failed:', error);
          // In case of database error, prevent deletion for safety
          return false;
        }
      },
      message: 'Diese Saison kann nicht gelöscht werden.',
      enabled: true,
      priority: 1,
      async: true
    };
  }

  /**
   * Format date for user-friendly display
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Public method to check for season overlaps (utility for external use)
   */
  public async checkSeasonOverlap(startDate: string, endDate: string, excludeId?: number): Promise<{
    hasOverlap: boolean;
    overlappingSeasons: any[];
    conflictAnalysis?: any;
  }> {
    try {
      const overlappingSeasons = await this.findOverlappingSeasons(startDate, endDate, excludeId);
      
      const result = {
        hasOverlap: overlappingSeasons.length > 0,
        overlappingSeasons,
        conflictAnalysis: undefined as any
      };

      if (result.hasOverlap) {
        result.conflictAnalysis = this.analyzeOverlaps(
          { start_datum: startDate, end_datum: endDate, name: 'New Season' },
          overlappingSeasons
        );
      }

      return result;
    } catch (error) {
      this.strapi.log.error('Season overlap check failed:', error);
      return {
        hasOverlap: false,
        overlappingSeasons: [],
        conflictAnalysis: { error: error.message }
      };
    }
  }

  /**
   * Public method to get conflict resolution suggestions
   */
  public getConflictResolutionSuggestions(newSeasonData: any, overlappingSeasons: any[]): any[] {
    const suggestions: any[] = [];

    for (const existingSeason of overlappingSeasons) {
      const overlapType = this.getOverlapType(newSeasonData, existingSeason);
      const resolution = this.suggestConflictResolution(newSeasonData, existingSeason, overlapType);
      suggestions.push(resolution);
    }

    return suggestions;
  }

  /**
   * Validate date range with improved error messages
   */
  public validateDateRange(startDate: string, endDate: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      isValid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // Check date format
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      result.isValid = false;
      result.errors.push('Das Startdatum ist ungültig. Bitte verwenden Sie das Format YYYY-MM-DD.');
    }

    if (isNaN(end.getTime())) {
      result.isValid = false;
      result.errors.push('Das Enddatum ist ungültig. Bitte verwenden Sie das Format YYYY-MM-DD.');
    }

    if (result.isValid) {
      // Check date logic
      if (start >= end) {
        result.isValid = false;
        result.errors.push('Das Startdatum muss vor dem Enddatum liegen.');
      }

      // Check for reasonable season length
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 30) {
        result.warnings.push('Die Saison ist sehr kurz (weniger als 30 Tage). Ist das beabsichtigt?');
      } else if (diffDays > 400) {
        result.warnings.push('Die Saison ist sehr lang (mehr als 400 Tage). Ist das beabsichtigt?');
      }

      // Check if season spans multiple years
      if (start.getFullYear() !== end.getFullYear()) {
        result.warnings.push(`Die Saison erstreckt sich über mehrere Jahre (${start.getFullYear()} - ${end.getFullYear()}).`);
      }
    }

    return result;
  }

  /**
   * Get validation rule configuration status
   */
  public getValidationConfig(): {
    overlapValidationEnabled: boolean;
    strictValidationEnabled: boolean;
    enabledRules: string[];
    disabledRules: string[];
  } {
    const allRules = this.getAllRules();
    
    return {
      overlapValidationEnabled: process.env.SAISON_OVERLAP_VALIDATION === 'true',
      strictValidationEnabled: process.env.SAISON_STRICT_VALIDATION === 'true',
      enabledRules: allRules.filter(rule => rule.enabled).map(rule => rule.name),
      disabledRules: allRules.filter(rule => !rule.enabled).map(rule => rule.name)
    };
  }
}

export default SaisonValidationRules;