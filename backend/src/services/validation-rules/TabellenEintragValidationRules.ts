/**
 * Tabellen-Eintrag specific Validation Rules
 * 
 * Specialized validation rules for table entries including data consistency,
 * goal statistics validation, and calculation verification.
 */

import { ValidationRule, ValidationContext } from '../ValidationService';

/**
 * Tabellen-Eintrag validation rule implementations
 */
export class TabellenEintragValidationRules {
  private strapi: any;

  constructor(strapi: any) {
    this.strapi = strapi;
  }

  /**
   * Get all tabellen-eintrag validation rules
   */
  getAllRules(): ValidationRule[] {
    return [
      this.createRequiredFieldsRule(),
      this.createNumericValidationRule(),
      this.createGameStatisticsConsistencyRule(),
      this.createGoalStatisticsValidationRule(),
      this.createPointsCalculationRule(),
      this.createGoalDifferenceCalculationRule(),
      this.createTablePositionValidationRule(),
      this.createTeamLigaConsistencyRule(),
      this.createUniqueTeamPerLeagueRule(),
      this.createSeasonConsistencyRule(),
      this.createDataRangeValidationRule(),
      this.createCalculationAccuracyRule(),
      this.createBusinessLogicValidationRule(),
      this.createPerformanceValidationRule()
    ];
  }

  /**
   * Required fields validation
   */
  private createRequiredFieldsRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-required-fields',
      type: 'critical',
      validator: (data: any, context?: ValidationContext) => {
        // Team and Liga are required
        if (!data.team || !data.liga) {
          return false;
        }

        return true;
      },
      message: 'Team und Liga sind erforderliche Felder für einen Tabelleneintrag.',
      enabled: true,
      priority: 1
    };
  }

  /**
   * Numeric fields validation
   */
  private createNumericValidationRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-numeric-validation',
      type: 'critical',
      validator: (data: any, context?: ValidationContext) => {
        const numericFields = [
          'spiele', 'siege', 'unentschieden', 'niederlagen',
          'tore_fuer', 'tore_gegen', 'tordifferenz', 'punkte', 'platz'
        ];

        for (const field of numericFields) {
          if (data[field] !== undefined && data[field] !== null) {
            const value = Number(data[field]);
            if (isNaN(value) || value < 0) {
              return false;
            }
          }
        }

        return true;
      },
      message: 'Alle numerischen Felder müssen gültige, nicht-negative Zahlen sein.',
      enabled: true,
      priority: 2
    };
  }

  /**
   * Game statistics consistency validation (enhanced)
   */
  private createGameStatisticsConsistencyRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-game-consistency',
      type: 'warning',
      validator: (data: any, context?: ValidationContext) => {
        const spiele = Number(data.spiele) || 0;
        const siege = Number(data.siege) || 0;
        const unentschieden = Number(data.unentschieden) || 0;
        const niederlagen = Number(data.niederlagen) || 0;

        // Games played should equal sum of wins, draws, and losses
        const calculatedGames = siege + unentschieden + niederlagen;
        
        // Strict validation for exact match
        if (spiele !== calculatedGames) {
          return false;
        }

        // Additional check: no negative values
        if (spiele < 0 || siege < 0 || unentschieden < 0 || niederlagen < 0) {
          return false;
        }

        // Check logical constraints
        if (siege > spiele || unentschieden > spiele || niederlagen > spiele) {
          return false;
        }

        return true;
      },
      message: 'Die Spielstatistiken sind inkonsistent. Gespielten Spiele sollten gleich Siege + Unentschieden + Niederlagen sein.',
      enabled: true,
      priority: 5
    };
  }

  /**
   * Goal statistics validation (enhanced)
   */
  private createGoalStatisticsValidationRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-goal-validation',
      type: 'warning',
      validator: (data: any, context?: ValidationContext) => {
        const toreFuer = Number(data.tore_fuer) || 0;
        const toreGegen = Number(data.tore_gegen) || 0;
        const spiele = Number(data.spiele) || 0;

        // Basic sanity checks
        if (toreFuer < 0 || toreGegen < 0) {
          return false;
        }

        // Goals should be reasonable relative to games played
        if (spiele > 0) {
          const avgGoalsFor = toreFuer / spiele;
          const avgGoalsAgainst = toreGegen / spiele;
          
          // More realistic thresholds for goal averages
          if (avgGoalsFor > 10 || avgGoalsAgainst > 10) {
            return false;
          }

          // Check for unrealistic goal ratios
          if (spiele > 5) { // Only check if significant number of games
            // Very low scoring (less than 0.1 goals per game) might be unusual
            if (avgGoalsFor < 0.1 && toreFuer > 0) {
              return false;
            }
            
            // Very high conceding rate might indicate data error
            if (avgGoalsAgainst > 8) {
              return false;
            }
          }
        }

        // Check for extreme goal differences that might indicate errors
        const goalDifference = Math.abs(toreFuer - toreGegen);
        if (spiele > 0 && goalDifference > (spiele * 8)) {
          return false; // Goal difference shouldn't exceed 8 goals per game on average
        }

        return true;
      },
      message: 'Tor-Statistiken sind ungewöhnlich. Bitte überprüfen Sie die Werte.',
      enabled: true,
      priority: 6
    };
  }

  /**
   * Points calculation validation
   */
  private createPointsCalculationRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-points-calculation',
      type: 'warning',
      validator: (data: any, context?: ValidationContext) => {
        const siege = Number(data.siege) || 0;
        const unentschieden = Number(data.unentschieden) || 0;
        const punkte = Number(data.punkte) || 0;

        // Standard calculation: 3 points for win, 1 for draw
        const expectedPoints = (siege * 3) + (unentschieden * 1);
        
        // Allow manual override with tolerance
        return Math.abs(punkte - expectedPoints) <= 3;
      },
      message: 'Die Punktzahl entspricht nicht der Standard-Berechnung (3 Punkte pro Sieg, 1 Punkt pro Unentschieden).',
      enabled: true,
      priority: 7,
      dependencies: ['tabellen-eintrag-numeric-validation']
    };
  }

  /**
   * Goal difference calculation validation
   */
  private createGoalDifferenceCalculationRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-goal-difference-calculation',
      type: 'warning',
      validator: (data: any, context?: ValidationContext) => {
        const toreFuer = Number(data.tore_fuer) || 0;
        const toreGegen = Number(data.tore_gegen) || 0;
        const tordifferenz = Number(data.tordifferenz) || 0;

        const expectedDifference = toreFuer - toreGegen;
        
        // Should match exactly
        return tordifferenz === expectedDifference;
      },
      message: 'Die Tordifferenz entspricht nicht der Berechnung (Tore für - Tore gegen).',
      enabled: true,
      priority: 8,
      dependencies: ['tabellen-eintrag-numeric-validation']
    };
  }

  /**
   * Table position validation
   */
  private createTablePositionValidationRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-position-validation',
      type: 'warning',
      validator: async (data: any, context?: ValidationContext) => {
        if (!data.platz || !data.liga) {
          return true; // Skip if position or league not provided
        }

        try {
          const position = Number(data.platz);
          if (position < 1) {
            return false;
          }

          // Check if position is reasonable within league
          const totalTeams = await this.strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
            filters: { liga: data.liga }
          });

          // Position should not exceed total teams + some buffer for new entries
          return position <= totalTeams + 5;
        } catch (error) {
          this.strapi.log.warn('Table position validation failed:', error);
          return true; // Fail gracefully
        }
      },
      message: 'Die Tabellenposition erscheint ungewöhnlich für diese Liga.',
      enabled: true,
      priority: 9,
      async: true
    };
  }

  /**
   * Team-Liga consistency validation
   */
  private createTeamLigaConsistencyRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-team-liga-consistency',
      type: 'critical',
      validator: async (data: any, context?: ValidationContext) => {
        if (!data.team || !data.liga) {
          return true; // Skip if team or league not provided
        }

        try {
          // Check if team exists and is associated with the same league/season
          const team = await this.strapi.entityService.findOne('api::team.team', data.team, {
            populate: ['liga', 'saison']
          });

          if (!team) {
            return false;
          }

          // Get league information
          const liga = await this.strapi.entityService.findOne('api::liga.liga', data.liga, {
            populate: ['saison']
          });

          if (!liga) {
            return false;
          }

          // Check if team's league matches the table entry's league
          if (team.liga?.id && team.liga.id !== data.liga) {
            return false;
          }

          // Check if seasons match
          if (team.saison?.id && liga.saison?.id && team.saison.id !== liga.saison.id) {
            return false;
          }

          return true;
        } catch (error) {
          this.strapi.log.warn('Team-Liga consistency validation failed:', error);
          return true; // Fail gracefully
        }
      },
      message: 'Das Team und die Liga sind nicht konsistent. Überprüfen Sie die Zuordnungen.',
      enabled: true,
      priority: 3,
      async: true,
      dependencies: ['tabellen-eintrag-required-fields']
    };
  }

  /**
   * Unique team per league validation
   */
  private createUniqueTeamPerLeagueRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-unique-team-per-league',
      type: 'critical',
      validator: async (data: any, context?: ValidationContext) => {
        if (!data.team || !data.liga) {
          return true; // Skip if team or league not provided
        }

        try {
          const filters: any = {
            team: data.team,
            liga: data.liga
          };

          // Exclude current entry during updates
          if (context?.operation === 'update' && context.existingData?.id) {
            filters.id = { $ne: context.existingData.id };
          }

          const existing = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
            filters,
            pagination: { limit: 1 }
          });

          return !existing || (Array.isArray(existing) ? existing.length === 0 : false);
        } catch (error) {
          this.strapi.log.warn('Unique team per league validation failed:', error);
          return true; // Fail gracefully
        }
      },
      message: 'Dieses Team hat bereits einen Eintrag in dieser Liga.',
      enabled: true,
      priority: 4,
      async: true,
      dependencies: ['tabellen-eintrag-required-fields']
    };
  }

  /**
   * Season consistency validation
   */
  private createSeasonConsistencyRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-season-consistency',
      type: 'warning',
      validator: async (data: any, context?: ValidationContext) => {
        if (!data.team || !data.liga) {
          return true; // Skip if team or league not provided
        }

        try {
          // Get team with season information
          const team = await this.strapi.entityService.findOne('api::team.team', data.team, {
            populate: ['saison']
          });

          // Get league with season information
          const liga = await this.strapi.entityService.findOne('api::liga.liga', data.liga, {
            populate: ['saison']
          });

          if (!team || !liga) {
            return true; // Skip if entities not found
          }

          // Check if both team and league belong to the same season
          if (team.saison?.id && liga.saison?.id) {
            return team.saison.id === liga.saison.id;
          }

          return true; // Pass if season information is not available
        } catch (error) {
          this.strapi.log.warn('Season consistency validation failed:', error);
          return true; // Fail gracefully
        }
      },
      message: 'Team und Liga gehören nicht zur gleichen Saison.',
      enabled: true,
      priority: 10,
      async: true,
      dependencies: ['tabellen-eintrag-team-liga-consistency']
    };
  }

  /**
   * Data range validation for realistic values
   */
  private createDataRangeValidationRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-data-range-validation',
      type: 'warning',
      validator: (data: any, context?: ValidationContext) => {
        const ranges = {
          spiele: { min: 0, max: 50 }, // Reasonable season game limit
          siege: { min: 0, max: 50 },
          unentschieden: { min: 0, max: 50 },
          niederlagen: { min: 0, max: 50 },
          tore_fuer: { min: 0, max: 200 }, // High but realistic goal limit
          tore_gegen: { min: 0, max: 200 },
          punkte: { min: 0, max: 150 }, // 50 games * 3 points max
          platz: { min: 1, max: 30 } // Reasonable league size
        };

        for (const [field, range] of Object.entries(ranges)) {
          if (data[field] !== undefined && data[field] !== null) {
            const value = Number(data[field]);
            if (!isNaN(value) && (value < range.min || value > range.max)) {
              return false;
            }
          }
        }

        return true;
      },
      message: 'Ein oder mehrere Werte liegen außerhalb des erwarteten Bereichs.',
      enabled: true,
      priority: 11,
      dependencies: ['tabellen-eintrag-numeric-validation']
    };
  }

  /**
   * Calculation accuracy validation
   */
  private createCalculationAccuracyRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-calculation-accuracy',
      type: 'warning',
      validator: (data: any, context?: ValidationContext) => {
        // Validate goal difference calculation
        if (data.tore_fuer !== undefined && data.tore_gegen !== undefined && data.tordifferenz !== undefined) {
          const expectedDiff = Number(data.tore_fuer) - Number(data.tore_gegen);
          if (Number(data.tordifferenz) !== expectedDiff) {
            return false;
          }
        }

        // Validate points calculation
        if (data.siege !== undefined && data.unentschieden !== undefined && data.punkte !== undefined) {
          const expectedPoints = (Number(data.siege) * 3) + (Number(data.unentschieden) * 1);
          if (Math.abs(Number(data.punkte) - expectedPoints) > 0) {
            return false;
          }
        }

        // Validate games calculation
        if (data.siege !== undefined && data.unentschieden !== undefined && 
            data.niederlagen !== undefined && data.spiele !== undefined) {
          const expectedGames = Number(data.siege) + Number(data.unentschieden) + Number(data.niederlagen);
          if (Math.abs(Number(data.spiele) - expectedGames) > 0) {
            return false;
          }
        }

        return true;
      },
      message: 'Berechnete Werte stimmen nicht mit den eingegebenen Daten überein.',
      enabled: true,
      priority: 12,
      dependencies: ['tabellen-eintrag-numeric-validation']
    };
  }

  /**
   * Business logic validation
   */
  private createBusinessLogicValidationRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-business-logic',
      type: 'warning',
      validator: (data: any, context?: ValidationContext) => {
        // A team cannot have more wins than games played
        if (data.spiele !== undefined && data.siege !== undefined) {
          if (Number(data.siege) > Number(data.spiele)) {
            return false;
          }
        }

        // A team cannot have more draws than games played
        if (data.spiele !== undefined && data.unentschieden !== undefined) {
          if (Number(data.unentschieden) > Number(data.spiele)) {
            return false;
          }
        }

        // A team cannot have more losses than games played
        if (data.spiele !== undefined && data.niederlagen !== undefined) {
          if (Number(data.niederlagen) > Number(data.spiele)) {
            return false;
          }
        }

        // Goals scored should be reasonable relative to games played
        if (data.spiele !== undefined && data.tore_fuer !== undefined) {
          const games = Number(data.spiele);
          const goals = Number(data.tore_fuer);
          if (games > 0 && goals / games > 15) { // More than 15 goals per game is suspicious
            return false;
          }
        }

        // Points should not exceed theoretical maximum
        if (data.spiele !== undefined && data.punkte !== undefined) {
          const maxPossiblePoints = Number(data.spiele) * 3;
          if (Number(data.punkte) > maxPossiblePoints) {
            return false;
          }
        }

        return true;
      },
      message: 'Die Daten verletzen grundlegende Geschäftsregeln des Fußballs.',
      enabled: true,
      priority: 13,
      dependencies: ['tabellen-eintrag-numeric-validation']
    };
  }

  /**
   * Performance validation for large datasets
   */
  private createPerformanceValidationRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-performance-validation',
      type: 'warning',
      validator: async (data: any, context?: ValidationContext) => {
        if (!data.liga) {
          return true; // Skip if league not provided
        }

        try {
          // Check if league has too many teams (performance concern)
          const teamCount = await this.strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
            filters: { liga: data.liga }
          });

          // Warn if league has more than 25 teams (unusual and may impact performance)
          if (teamCount > 25) {
            return false;
          }

          return true;
        } catch (error) {
          this.strapi.log.warn('Performance validation failed:', error);
          return true; // Fail gracefully
        }
      },
      message: 'Diese Liga hat ungewöhnlich viele Teams, was die Performance beeinträchtigen könnte.',
      enabled: true,
      priority: 14,
      async: true
    };
  }

  /**
   * Advanced statistical validation
   */
  private createStatisticalValidationRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-statistical-validation',
      type: 'warning',
      validator: async (data: any, context?: ValidationContext) => {
        if (!data.liga || !data.team) {
          return true; // Skip if league or team not provided
        }

        try {
          // Get league statistics for comparison
          const leagueEntries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
            filters: { liga: data.liga },
            fields: ['tore_fuer', 'tore_gegen', 'punkte', 'spiele']
          });

          if (leagueEntries.length === 0) {
            return true; // Skip if no other entries
          }

          // Calculate league averages
          const totalEntries = leagueEntries.length;
          const avgGoalsFor = leagueEntries.reduce((sum, entry) => sum + (Number(entry.tore_fuer) || 0), 0) / totalEntries;
          const avgGoalsAgainst = leagueEntries.reduce((sum, entry) => sum + (Number(entry.tore_gegen) || 0), 0) / totalEntries;
          const avgPoints = leagueEntries.reduce((sum, entry) => sum + (Number(entry.punkte) || 0), 0) / totalEntries;

          // Check if current entry is statistical outlier (more than 3 standard deviations)
          const currentGoalsFor = Number(data.tore_fuer) || 0;
          const currentGoalsAgainst = Number(data.tore_gegen) || 0;
          const currentPoints = Number(data.punkte) || 0;

          // Simple outlier detection (could be enhanced with proper standard deviation)
          const goalsForOutlier = Math.abs(currentGoalsFor - avgGoalsFor) > (avgGoalsFor * 2);
          const goalsAgainstOutlier = Math.abs(currentGoalsAgainst - avgGoalsAgainst) > (avgGoalsAgainst * 2);
          const pointsOutlier = Math.abs(currentPoints - avgPoints) > (avgPoints * 2);

          return !(goalsForOutlier || goalsAgainstOutlier || pointsOutlier);
        } catch (error) {
          this.strapi.log.warn('Statistical validation failed:', error);
          return true; // Fail gracefully
        }
      },
      message: 'Die Statistiken weichen stark vom Liga-Durchschnitt ab.',
      enabled: false, // Disabled by default as it might be too strict
      priority: 15,
      async: true
    };
  }

  /**
   * Historical data consistency validation
   */
  private createHistoricalConsistencyRule(): ValidationRule {
    return {
      name: 'tabellen-eintrag-historical-consistency',
      type: 'warning',
      validator: async (data: any, context?: ValidationContext) => {
        if (!data.team || context?.operation !== 'update') {
          return true; // Only validate on updates
        }

        try {
          // Get previous entries for this team to check for dramatic changes
          const previousEntries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
            filters: { team: data.team },
            sort: 'createdAt:desc',
            pagination: { limit: 3 }
          });

          if (previousEntries.length === 0) {
            return true; // No historical data to compare
          }

          const currentPoints = Number(data.punkte) || 0;
          const currentGoals = Number(data.tore_fuer) || 0;

          // Check for unrealistic improvements (more than doubling points/goals)
          for (const prevEntry of previousEntries) {
            const prevPoints = Number(prevEntry.punkte) || 0;
            const prevGoals = Number(prevEntry.tore_fuer) || 0;

            if (prevPoints > 0 && currentPoints > prevPoints * 3) {
              return false; // Points more than tripled
            }

            if (prevGoals > 0 && currentGoals > prevGoals * 3) {
              return false; // Goals more than tripled
            }
          }

          return true;
        } catch (error) {
          this.strapi.log.warn('Historical consistency validation failed:', error);
          return true; // Fail gracefully
        }
      },
      message: 'Die Änderungen sind im Vergleich zu historischen Daten ungewöhnlich groß.',
      enabled: false, // Disabled by default as it might be too restrictive
      priority: 16,
      async: true
    };
  }

  /**
   * Helper method to validate numeric field ranges
   */
  private validateNumericRange(value: any, min: number, max: number): boolean {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  }

  /**
   * Helper method to calculate expected values
   */
  private calculateExpectedValues(data: any): {
    expectedPoints: number;
    expectedGoalDifference: number;
    expectedGames: number;
  } {
    const siege = Number(data.siege) || 0;
    const unentschieden = Number(data.unentschieden) || 0;
    const niederlagen = Number(data.niederlagen) || 0;
    const toreFuer = Number(data.tore_fuer) || 0;
    const toreGegen = Number(data.tore_gegen) || 0;

    return {
      expectedPoints: (siege * 3) + (unentschieden * 1),
      expectedGoalDifference: toreFuer - toreGegen,
      expectedGames: siege + unentschieden + niederlagen
    };
  }

  /**
   * Helper method to check if value is within statistical normal range
   */
  private isStatisticalOutlier(value: number, average: number, threshold: number = 2): boolean {
    return Math.abs(value - average) > (average * threshold);
  }

  /**
   * Helper method to validate team-league relationship
   */
  private async validateTeamLeagueRelationship(teamId: number, ligaId: number): Promise<boolean> {
    try {
      const team = await this.strapi.entityService.findOne('api::team.team', teamId, {
        populate: ['liga']
      });

      if (!team) return false;

      // If team has a specific league assigned, it should match
      if (team.liga?.id && team.liga.id !== ligaId) {
        return false;
      }

      return true;
    } catch (error) {
      this.strapi.log.warn('Team-league relationship validation failed:', error);
      return true; // Fail gracefully
    }
  }

  /**
   * Helper method to get league statistics for comparison
   */
  private async getLeagueStatistics(ligaId: number): Promise<{
    averageGoalsFor: number;
    averageGoalsAgainst: number;
    averagePoints: number;
    teamCount: number;
  } | null> {
    try {
      const entries = await this.strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { liga: ligaId },
        fields: ['tore_fuer', 'tore_gegen', 'punkte']
      });

      if (entries.length === 0) return null;

      const totalGoalsFor = entries.reduce((sum, entry) => sum + (Number(entry.tore_fuer) || 0), 0);
      const totalGoalsAgainst = entries.reduce((sum, entry) => sum + (Number(entry.tore_gegen) || 0), 0);
      const totalPoints = entries.reduce((sum, entry) => sum + (Number(entry.punkte) || 0), 0);

      return {
        averageGoalsFor: totalGoalsFor / entries.length,
        averageGoalsAgainst: totalGoalsAgainst / entries.length,
        averagePoints: totalPoints / entries.length,
        teamCount: entries.length
      };
    } catch (error) {
      this.strapi.log.warn('Failed to get league statistics:', error);
      return null;
    }
  }

  /**
   * Get validation rules by type
   */
  getCriticalRules(): ValidationRule[] {
    return this.getAllRules().filter(rule => rule.type === 'critical');
  }

  /**
   * Get validation rules by type
   */
  getWarningRules(): ValidationRule[] {
    return this.getAllRules().filter(rule => rule.type === 'warning');
  }

  /**
   * Get enabled validation rules
   */
  getEnabledRules(): ValidationRule[] {
    return this.getAllRules().filter(rule => rule.enabled);
  }

  /**
   * Get validation rules by priority
   */
  getRulesByPriority(): ValidationRule[] {
    return this.getAllRules().sort((a, b) => (a.priority || 100) - (b.priority || 100));
  }

  /**
   * Validate table entry data with all rules
   */
  async validateTableEntry(data: any, context?: ValidationContext): Promise<{
    isValid: boolean;
    criticalErrors: string[];
    warnings: string[];
    passedRules: string[];
    failedRules: string[];
  }> {
    const result = {
      isValid: true,
      criticalErrors: [] as string[],
      warnings: [] as string[],
      passedRules: [] as string[],
      failedRules: [] as string[]
    };

    const rules = this.getEnabledRules();

    for (const rule of rules) {
      try {
        const passed = await rule.validator(data, context);
        
        if (passed) {
          result.passedRules.push(rule.name);
        } else {
          result.failedRules.push(rule.name);
          
          if (rule.type === 'critical') {
            result.criticalErrors.push(rule.message);
            result.isValid = false;
          } else {
            result.warnings.push(rule.message);
          }
        }
      } catch (error) {
        this.strapi.log.error(`Validation rule ${rule.name} failed with error:`, error);
        result.failedRules.push(rule.name);
        result.warnings.push(`Validierungsregel ${rule.name} konnte nicht ausgeführt werden.`);
      }
    }

    return result;
  }
}

export default TabellenEintragValidationRules;