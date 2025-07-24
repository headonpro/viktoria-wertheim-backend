/**
 * Comprehensive validation service for data integrity checks
 * Provides reusable validation functions across content types
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export class ValidationService {
  /**
   * Validates that a season is active and exists
   */
  static async validateActiveSeason(seasonId?: any): Promise<any> {
    if (!seasonId) {
      const activeSeasons = await strapi.entityService.findMany('api::saison.saison' as any, {
        filters: { aktiv: true },
        pagination: { limit: 1 }
      });
      
      if (!activeSeasons || activeSeasons.length === 0) {
        throw new Error('Keine aktive Saison gefunden');
      }
      
      return Array.isArray(activeSeasons) ? activeSeasons[0] : activeSeasons;
    }
    
    const season = await strapi.entityService.findOne('api::saison.saison' as any, seasonId);
    if (!season) {
      throw new Error('Saison nicht gefunden');
    }
    
    return season;
  }

  /**
   * Validates that only one record has a specific boolean flag set to true
   */
  static async validateUniqueFlag(
    contentType: string,
    flagField: string,
    data: any,
    excludeId?: any,
    additionalFilters?: any
  ): Promise<void> {
    if (!data[flagField]) {
      return; // Not setting flag to true, no validation needed
    }

    const filters: any = {
      [flagField]: true,
      ...additionalFilters
    };

    if (excludeId) {
      filters.id = { $ne: excludeId };
    }

    const existingRecords = await strapi.entityService.findMany(contentType as any, {
      filters
    });

    if (existingRecords && existingRecords.length > 0) {
      throw new Error(`Nur ein Datensatz kann ${flagField} = true haben`);
    }
  }

  /**
   * Validates that a relationship exists and is valid
   */
  static async validateRelationship(
    contentType: string,
    relationId: any,
    relationName: string
  ): Promise<any> {
    if (!relationId) {
      return null;
    }

    const relatedRecord = await strapi.entityService.findOne(contentType as any, relationId);
    if (!relatedRecord) {
      throw new Error(`${relationName} nicht gefunden`);
    }

    return relatedRecord;
  }

  /**
   * Validates that numeric values are within acceptable ranges
   */
  static validateNumericRanges(data: any, fieldRanges: Record<string, { min?: number; max?: number }>): void {
    for (const [field, range] of Object.entries(fieldRanges)) {
      const value = data[field];
      
      if (value === undefined || value === null) {
        continue;
      }

      if (typeof value !== 'number') {
        throw new Error(`${field} muss eine Zahl sein`);
      }

      if (range.min !== undefined && value < range.min) {
        throw new Error(`${field} muss mindestens ${range.min} sein`);
      }

      if (range.max !== undefined && value > range.max) {
        throw new Error(`${field} darf höchstens ${range.max} sein`);
      }
    }
  }

  /**
   * Validates that date ranges are logical
   */
  static validateDateRange(startDate: any, endDate: any, fieldNames: { start: string; end: string }): void {
    if (!startDate || !endDate) {
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      throw new Error(`${fieldNames.start} muss vor ${fieldNames.end} liegen`);
    }
  }

  /**
   * Validates that required fields are present
   */
  static validateRequiredFields(data: any, requiredFields: string[]): void {
    const missingFields = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missingFields.length > 0) {
      throw new Error(`Pflichtfelder fehlen: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Validates that a combination of fields is unique
   */
  static async validateUniqueCombo(
    contentType: string,
    data: any,
    fields: string[],
    excludeId?: any
  ): Promise<void> {
    const filters: any = {};
    
    // Build filters for the combination
    for (const field of fields) {
      if (data[field] !== undefined) {
        filters[field] = data[field];
      }
    }

    // Skip validation if not all fields are provided
    if (Object.keys(filters).length !== fields.length) {
      return;
    }

    if (excludeId) {
      filters.id = { $ne: excludeId };
    }

    const existingRecords = await strapi.entityService.findMany(contentType as any, {
      filters
    });

    if (existingRecords && existingRecords.length > 0) {
      throw new Error(`Kombination von ${fields.join(', ')} muss eindeutig sein`);
    }
  }

  /**
   * Validates JSON structure against a schema
   */
  static validateJSONStructure(data: any, field: string, validator: (value: any) => boolean, errorMessage: string): void {
    const value = data[field];
    
    if (!value) {
      return;
    }

    if (!validator(value)) {
      throw new Error(`${field}: ${errorMessage}`);
    }
  }

  /**
   * Validates that a player belongs to a specific team
   */
  static async validatePlayerTeamMembership(playerId: any, teamId: any): Promise<boolean> {
    const player = await strapi.entityService.findOne('api::spieler.spieler', playerId, {
      populate: ['hauptteam', 'aushilfe_teams']
    });

    if (!player) {
      throw new Error(`Spieler mit ID ${playerId} nicht gefunden`);
    }

    const isInTeam = (player as any).hauptteam?.id === teamId || 
                     (player as any).aushilfe_teams?.some((team: any) => team.id === teamId);

    return isInTeam;
  }

  /**
   * Validates that teams belong to the same club and season
   */
  static async validateTeamConsistency(teamIds: any[]): Promise<void> {
    if (teamIds.length <= 1) {
      return;
    }

    const teams = await strapi.entityService.findMany('api::team.team' as any, {
      filters: {
        id: { $in: teamIds }
      },
      populate: ['club', 'saison']
    });

    if (!teams || teams.length !== teamIds.length) {
      throw new Error('Nicht alle Teams gefunden');
    }

    const teamsArray = Array.isArray(teams) ? teams : [teams];
    const firstTeam = teamsArray[0];
    
    for (const team of teamsArray.slice(1)) {
      if (team.club?.id !== firstTeam.club?.id) {
        throw new Error('Alle Teams müssen zum gleichen Verein gehören');
      }
      
      if (team.saison?.id !== firstTeam.saison?.id) {
        throw new Error('Alle Teams müssen zur gleichen Saison gehören');
      }
    }
  }

  /**
   * Validates that match events are chronologically ordered
   */
  static validateEventChronology(events: any[], minuteField: string = 'minute'): void {
    if (!events || events.length <= 1) {
      return;
    }

    for (let i = 1; i < events.length; i++) {
      const prevMinute = events[i - 1][minuteField];
      const currentMinute = events[i][minuteField];
      
      if (prevMinute > currentMinute) {
        throw new Error('Ereignisse müssen chronologisch geordnet sein');
      }
    }
  }

  /**
   * Validates that statistics are mathematically consistent
   */
  static validateStatisticsConsistency(stats: any): void {
    // Goals and assists shouldn't exceed games played by too much
    if (stats.tore && stats.spiele && stats.tore > stats.spiele * 5) {
      strapi.log.warn(`Unusual goal ratio: ${stats.tore} goals in ${stats.spiele} games`);
    }

    if (stats.assists && stats.spiele && stats.assists > stats.spiele * 3) {
      strapi.log.warn(`Unusual assist ratio: ${stats.assists} assists in ${stats.spiele} games`);
    }

    // Cards shouldn't exceed games by much
    const totalCards = (stats.gelbe_karten || 0) + (stats.rote_karten || 0);
    if (stats.spiele && totalCards > stats.spiele) {
      strapi.log.warn(`More cards than games: ${totalCards} cards in ${stats.spiele} games`);
    }

    // Minutes played shouldn't exceed theoretical maximum
    if (stats.minuten_gespielt && stats.spiele && stats.minuten_gespielt > stats.spiele * 120) {
      strapi.log.warn(`Excessive minutes played: ${stats.minuten_gespielt} minutes in ${stats.spiele} games`);
    }
  }

  /**
   * Validates season constraints
   */
  static async validateSeasonConstraints(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check for multiple active seasons
      const activeSeasons = await strapi.entityService.findMany('api::saison.saison' as any, {
        filters: { aktiv: true }
      });

      const activeSeasonsArray = Array.isArray(activeSeasons) ? activeSeasons : [activeSeasons];
      
      if (activeSeasonsArray.length > 1) {
        errors.push('Multiple active seasons');
      }

      if (activeSeasonsArray.length === 0) {
        errors.push('No active season found');
      }

      // Check for overlapping seasons
      const allSeasons = await strapi.entityService.findMany('api::saison.saison' as any, {
        sort: 'start_datum:asc'
      });

      const seasonsArray = Array.isArray(allSeasons) ? allSeasons : [allSeasons];
      
      for (let i = 0; i < seasonsArray.length - 1; i++) {
        const current = seasonsArray[i];
        const next = seasonsArray[i + 1];
        
        if (new Date(current.end_datum) > new Date(next.start_datum)) {
          errors.push('Invalid date range');
        }
      }

    } catch (error) {
      errors.push(`Season validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates player team assignments
   */
  static async validatePlayerTeamAssignments(player: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      if (!player.hauptteam) {
        errors.push('Player has no main team');
      }

      // Check for conflicting team assignments
      if (player.aushilfe_teams && player.hauptteam) {
        const conflictingTeams = player.aushilfe_teams.filter((team: any) => team.id === player.hauptteam.id);
        if (conflictingTeams.length > 0) {
          errors.push('Player cannot be in main team and help team simultaneously');
        }
      }

    } catch (error) {
      errors.push(`Player team validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates match event consistency
   */
  static async validateMatchEventConsistency(match: any): Promise<{ isValid: boolean; errors: string[]; warnings?: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate score consistency with events
      if (match.torschuetzen && Array.isArray(match.torschuetzen)) {
        const goalCount = match.torschuetzen.length;
        const totalScore = (match.tore_heim || 0) + (match.tore_auswaerts || 0);
        
        if (Math.abs(goalCount - totalScore) > 2) {
          warnings.push('Goal events do not match final score');
        }
      }

      // Validate event chronology
      if (match.torschuetzen) {
        this.validateEventChronology(match.torschuetzen, 'minute');
      }

    } catch (error) {
      errors.push(`Match event validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validates statistics integrity
   */
  static async validateStatisticsIntegrity(playerId: any, saisonId: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const stats = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
        filters: { spieler: playerId, saison: saisonId }
      });

      const statsArray = Array.isArray(stats) ? stats : [stats];
      
      for (const stat of statsArray) {
        if (stat) {
          // Check for negative values
          if (stat.tore < 0 || stat.spiele < 0 || stat.assists < 0) {
            errors.push('Statistics contain negative values');
          }

          // Check for unrealistic ratios
          if (stat.tore > stat.spiele * 5) {
            errors.push('Unrealistic goal to games ratio');
          }
        }
      }

    } catch (error) {
      errors.push(`Statistics validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates table positions
   */
  static async validateTablePositions(ligaId: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const tableEntries = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag' as any, {
        filters: { liga: ligaId },
        sort: 'position:asc'
      });

      const entriesArray = Array.isArray(tableEntries) ? tableEntries : [tableEntries];
      
      // Check for duplicate positions
      const positions = entriesArray.map((entry: any) => entry.position);
      const uniquePositions = new Set(positions);
      
      if (positions.length !== uniquePositions.size) {
        errors.push('Duplicate table positions found');
      }

      // Check for gaps in positions
      for (let i = 1; i <= entriesArray.length; i++) {
        if (!positions.includes(i)) {
          errors.push(`Missing position ${i} in table`);
        }
      }

    } catch (error) {
      errors.push(`Table position validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates referential integrity
   */
  static async validateReferentialIntegrity(contentType: string, entityId: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const entity = await strapi.entityService.findOne(contentType as any, entityId);
      
      if (!entity) {
        errors.push('Entity not found');
      }

      // Add specific referential integrity checks based on content type
      // This is a placeholder implementation

    } catch (error) {
      errors.push(`Referential integrity validation error: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates enum field values
   */
  static validateEnumField(data: any, fieldName: string, allowedValues: string[], defaultValue?: string): void {
    if (data[fieldName] && !allowedValues.includes(data[fieldName])) {
      if (defaultValue) {
        data[fieldName] = defaultValue;
        strapi.log.warn(`Invalid ${fieldName} value '${data[fieldName]}' replaced with default '${defaultValue}'`);
      } else {
        throw new Error(`${fieldName} muss einer der folgenden Werte sein: ${allowedValues.join(', ')}`);
      }
    }
  }

  /**
   * Validates business rules for content creation/updates
   */
  static async validateBusinessRules(contentType: string, data: any, operation?: 'create' | 'update', entityId?: any): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // If operation is not provided, default to 'create'
      const op = operation || 'create';
      
      switch (contentType) {
        case 'api::saison.saison':
          await this.validateSeasonBusinessRules(data, op, entityId);
          break;
        case 'api::spieler.spieler':
          await this.validatePlayerBusinessRules(data, op, entityId);
          break;

        case 'api::spielerstatistik.spielerstatistik':
          await this.validateStatisticsBusinessRules(data, op, entityId);
          break;
        case 'api::team.team':
          await this.validateTeamBusinessRules(data, op, entityId);
          break;
      }
    } catch (error) {
      errors.push(error.message);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Original validateBusinessRules method for backward compatibility
   */
  static async validateBusinessRulesVoid(contentType: string, data: any, operation: 'create' | 'update', entityId?: any): Promise<void> {
    switch (contentType) {
      case 'api::saison.saison':
        await this.validateSeasonBusinessRules(data, operation, entityId);
        break;
      case 'api::spieler.spieler':
        await this.validatePlayerBusinessRules(data, operation, entityId);
        break;

      case 'api::spielerstatistik.spielerstatistik':
        await this.validateStatisticsBusinessRules(data, operation, entityId);
        break;
    }
  }

  private static async validateSeasonBusinessRules(data: any, operation: string, entityId?: any): Promise<void> {
    // Ensure only one active season
    if (data.aktiv) {
      await this.validateUniqueFlag('api::saison.saison', 'aktiv', data, entityId);
    }

    // Validate date ranges
    if (data.start_datum && data.end_datum) {
      this.validateDateRange(data.start_datum, data.end_datum, { start: 'Startdatum', end: 'Enddatum' });
    }
  }

  private static async validatePlayerBusinessRules(data: any, operation: string, entityId?: any): Promise<void> {
    // Validate jersey number uniqueness within team
    if (data.hauptteam && data.rueckennummer) {
      await this.validateUniqueCombo('api::spieler.spieler', data, ['hauptteam', 'rueckennummer'], entityId);
    }

    // Validate captain uniqueness within team
    if (data.kapitaen && data.hauptteam) {
      await this.validateUniqueFlag('api::spieler.spieler', 'kapitaen', data, entityId, { hauptteam: data.hauptteam });
    }
  }



  private static async validateStatisticsBusinessRules(data: any, operation: string, entityId?: any): Promise<void> {
    // Validate non-negative values
    this.validateNumericRanges(data, {
      tore: { min: 0 },
      spiele: { min: 0 },
      assists: { min: 0 },
      gelbe_karten: { min: 0 },
      rote_karten: { min: 0 },
      minuten_gespielt: { min: 0 }
    });

    // Validate unique combination
    if (data.spieler && data.team && data.saison) {
      await this.validateUniqueCombo('api::spielerstatistik.spielerstatistik', data, ['spieler', 'team', 'saison'], entityId);
    }
  }

  private static async validateTeamBusinessRules(data: any, operation: string, entityId?: any): Promise<void> {
    // Validate enum fields
    this.validateEnumField(data, 'status', ['aktiv', 'inaktiv', 'pausiert'], 'aktiv');
    this.validateEnumField(data, 'trend', ['steigend', 'gleich', 'fallend'], 'gleich');

    // Validate numeric ranges
    this.validateNumericRanges(data, {
      tabellenplatz: { min: 1 },
      punkte: { min: 0 },
      spiele_gesamt: { min: 0 },
      siege: { min: 0 },
      unentschieden: { min: 0 },
      niederlagen: { min: 0 },
      tore_fuer: { min: 0 },
      tore_gegen: { min: 0 }
    });

    // Validate team name uniqueness within club and season
    if (data.name && data.club && data.saison) {
      await this.validateUniqueCombo('api::team.team', data, ['name', 'club', 'saison'], entityId);
    }

    // Validate mathematical consistency
    if (data.siege !== undefined && data.unentschieden !== undefined && data.niederlagen !== undefined && data.spiele_gesamt !== undefined) {
      const calculatedGames = (data.siege || 0) + (data.unentschieden || 0) + (data.niederlagen || 0);
      if (calculatedGames !== data.spiele_gesamt) {
        throw new Error('Siege + Unentschieden + Niederlagen muss gleich Spiele gesamt sein');
      }
    }

    // Validate goal difference
    if (data.tore_fuer !== undefined && data.tore_gegen !== undefined && data.tordifferenz !== undefined) {
      const calculatedDiff = data.tore_fuer - data.tore_gegen;
      if (calculatedDiff !== data.tordifferenz) {
        throw new Error('Tordifferenz muss Tore für minus Tore gegen entsprechen');
      }
    }
  }
}

export default ValidationService;