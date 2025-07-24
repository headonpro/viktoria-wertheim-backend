/**
 * Data Integrity Service
 * 
 * Service for validating data consistency and relations
 * after team/mannschaft consolidation
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
  };
}

interface RelationValidationOptions {
  checkBidirectional?: boolean;
  validateOrphans?: boolean;
  checkConstraints?: boolean;
}

class DataIntegrityService {
  private strapi: any;

  constructor(strapiInstance?: any) {
    this.strapi = strapiInstance || global.strapi;
  }

  /**
   * Validate all team relations and data consistency
   */
  async validateTeamRelations(options: RelationValidationOptions = {}): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    try {
      // Get all teams with relations
      const teams = await this.strapi.entityService.findMany('api::team.team', {
        populate: ['spieler', 'aushilfe_spieler', 'spiele', 'liga', 'saison', 'club']
      });

      if (!teams || teams.length === 0) {
        warnings.push('No teams found in database');
        return this.buildValidationResult(true, errors, warnings, 1, 1);
      }

      for (const team of teams) {
        totalChecks++;

        // Validate required fields
        if (!team.name) {
          errors.push(`Team ${team.id} missing required name field`);
          continue;
        }

        // Validate unique name constraint
        const duplicateTeams = teams.filter(t => t.name === team.name && t.id !== team.id);
        if (duplicateTeams.length > 0) {
          errors.push(`Team name "${team.name}" is not unique (found in teams: ${duplicateTeams.map(t => t.id).join(', ')})`);
        }

        // Validate bidirectional relations with spieler
        if (options.checkBidirectional && team.spieler) {
          for (const spieler of team.spieler) {
            const spielerData = await this.strapi.entityService.findOne('api::spieler.spieler', spieler.id, {
              populate: ['hauptteam', 'aushilfe_teams']
            });

            if (!spielerData) {
              errors.push(`Team ${team.name} references non-existent Spieler ${spieler.id}`);
              continue;
            }

            const hauptteamId = spielerData.hauptteam?.id;
            const aushilfeTeamIds = spielerData.aushilfe_teams?.map(t => t.id) || [];

            if (hauptteamId !== team.id && !aushilfeTeamIds.includes(team.id)) {
              errors.push(`Broken bidirectional relation: Team ${team.name} references Spieler ${spieler.id}, but spieler doesn't reference team back`);
            }
          }
        }

        // Note: Spiel validation removed since Spiel content type was removed

        // Check for mannschaft references (should not exist)
        const teamStr = JSON.stringify(team);
        if (teamStr.includes('mannschaft')) {
          errors.push(`Team ${team.name} still contains mannschaft references`);
        }

        if (errors.length === 0) {
          passedChecks++;
        }
      }

    } catch (error) {
      errors.push(`Failed to validate team relations: ${error.message}`);
    }

    return this.buildValidationResult(errors.length === 0, errors, warnings, totalChecks, passedChecks);
  }

  /**
   * Validate spiel relations - REMOVED since Spiel content type was removed
   * Returns empty validation result for backward compatibility
   */
  async validateSpielRelations(options: RelationValidationOptions = {}): Promise<ValidationResult> {
    const warnings: string[] = ['Spiel validation skipped - content type removed'];
    return this.buildValidationResult(true, [], warnings, 1, 1);
  }

  /**
   * Validate all spieler relations and data consistency
   */
  async validateSpielerRelations(options: RelationValidationOptions = {}): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    try {
      const spielers = await this.strapi.entityService.findMany('api::spieler.spieler', {
        populate: ['hauptteam', 'aushilfe_teams', 'mitglied']
      });

      if (!spielers || spielers.length === 0) {
        warnings.push('No spielers found in database');
        return this.buildValidationResult(true, errors, warnings, 1, 1);
      }

      for (const spieler of spielers) {
        totalChecks++;

        // Validate required fields
        if (!spieler.vorname) {
          errors.push(`Spieler ${spieler.id} missing required vorname field`);
        }

        if (!spieler.nachname) {
          errors.push(`Spieler ${spieler.id} missing required nachname field`);
        }

        // Validate enum values
        const validStatuses = ['aktiv', 'verletzt', 'gesperrt'];
        if (spieler.status && !validStatuses.includes(spieler.status)) {
          errors.push(`Spieler ${spieler.id} has invalid status: ${spieler.status}`);
        }

        const validPositions = ['Torwart', 'Abwehr', 'Mittelfeld', 'Sturm'];
        if (spieler.position && !validPositions.includes(spieler.position)) {
          errors.push(`Spieler ${spieler.id} has invalid position: ${spieler.position}`);
        }

        // Validate rueckennummer constraints
        if (spieler.rueckennummer && (spieler.rueckennummer < 1 || spieler.rueckennummer > 99)) {
          errors.push(`Spieler ${spieler.id} has invalid rueckennummer: ${spieler.rueckennummer}`);
        }

        // Check for mannschaft references (should not exist)
        const spielerStr = JSON.stringify(spieler);
        if (spielerStr.includes('mannschaft')) {
          errors.push(`Spieler ${spieler.vorname} ${spieler.nachname} still contains mannschaft references`);
        }

        // Validate bidirectional relations
        if (options.checkBidirectional) {
          // Check hauptteam relation
          if (spieler.hauptteam) {
            const teamData = await this.strapi.entityService.findOne('api::team.team', spieler.hauptteam.id, {
              populate: ['spieler']
            });

            if (!teamData) {
              errors.push(`Spieler ${spieler.vorname} ${spieler.nachname} references non-existent Hauptteam ${spieler.hauptteam.id}`);
            } else {
              const teamSpielerIds = teamData.spieler?.map(s => s.id) || [];
              if (!teamSpielerIds.includes(spieler.id)) {
                errors.push(`Broken bidirectional relation: Spieler ${spieler.vorname} ${spieler.nachname} references Team ${spieler.hauptteam.id} as hauptteam, but team doesn't reference spieler back`);
              }
            }
          }

          // Check aushilfe_teams relations
          if (spieler.aushilfe_teams) {
            for (const aushilfeTeam of spieler.aushilfe_teams) {
              const teamData = await this.strapi.entityService.findOne('api::team.team', aushilfeTeam.id, {
                populate: ['aushilfe_spieler']
              });

              if (!teamData) {
                errors.push(`Spieler ${spieler.vorname} ${spieler.nachname} references non-existent Aushilfe Team ${aushilfeTeam.id}`);
              } else {
                const aushilfeSpielerIds = teamData.aushilfe_spieler?.map(s => s.id) || [];
                if (!aushilfeSpielerIds.includes(spieler.id)) {
                  errors.push(`Broken bidirectional relation: Spieler ${spieler.vorname} ${spieler.nachname} references Team ${aushilfeTeam.id} as aushilfe, but team doesn't reference spieler back`);
                }
              }
            }
          }
        }

        if (errors.length === 0) {
          passedChecks++;
        }
      }

    } catch (error) {
      errors.push(`Failed to validate spieler relations: ${error.message}`);
    }

    return this.buildValidationResult(errors.length === 0, errors, warnings, totalChecks, passedChecks);
  }

  /**
   * Check for any remaining mannschaft references
   */
  async validateMannschaftRemoval(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Try to access mannschaft content type - should fail
      try {
        await this.strapi.entityService.findMany('api::mannschaft.mannschaft');
        errors.push('Mannschaft content type still exists - should be removed after consolidation');
      } catch (error) {
        if (error.message.includes('Unknown attribute') || error.message.includes('not found')) {
          // This is expected - mannschaft should not exist
        } else {
          warnings.push(`Could not verify mannschaft removal: ${error.message}`);
        }
      }

    } catch (error) {
      errors.push(`Failed to validate mannschaft removal: ${error.message}`);
    }

    return this.buildValidationResult(errors.length === 0, errors, warnings, 1, errors.length === 0 ? 1 : 0);
  }

  /**
   * Run comprehensive data integrity validation
   */
  async validateAllData(options: RelationValidationOptions = { 
    checkBidirectional: true, 
    validateOrphans: true, 
    checkConstraints: true 
  }): Promise<ValidationResult> {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let totalChecks = 0;
    let passedChecks = 0;

    // Run all validations
    const teamResult = await this.validateTeamRelations(options);
    const spielResult = await this.validateSpielRelations(options);
    const spielerResult = await this.validateSpielerRelations(options);
    const mannschaftResult = await this.validateMannschaftRemoval();

    // Combine results
    allErrors.push(...teamResult.errors, ...spielResult.errors, ...spielerResult.errors, ...mannschaftResult.errors);
    allWarnings.push(...teamResult.warnings, ...spielResult.warnings, ...spielerResult.warnings, ...mannschaftResult.warnings);
    
    totalChecks = teamResult.summary.totalChecks + spielResult.summary.totalChecks + 
                  spielerResult.summary.totalChecks + mannschaftResult.summary.totalChecks;
    passedChecks = teamResult.summary.passedChecks + spielResult.summary.passedChecks + 
                   spielerResult.summary.passedChecks + mannschaftResult.summary.passedChecks;

    return this.buildValidationResult(allErrors.length === 0, allErrors, allWarnings, totalChecks, passedChecks);
  }

  /**
   * Run full integrity check (alias for validateAllData)
   */
  async runFullIntegrityCheck(options: RelationValidationOptions = { 
    checkBidirectional: true, 
    validateOrphans: true, 
    checkConstraints: true 
  }): Promise<ValidationResult> {
    return this.validateAllData(options);
  }

  /**
   * Auto-fix common data integrity issues
   */
  async autoFixIssues(validationResult: ValidationResult): Promise<{
    fixed: string[];
    couldNotFix: string[];
    summary: {
      totalIssues: number;
      fixedIssues: number;
      remainingIssues: number;
    };
  }> {
    const fixed: string[] = [];
    const couldNotFix: string[] = [];

    for (const error of validationResult.errors) {
      try {
        // Try to auto-fix specific types of errors
        if (error.includes('missing required') && error.includes('field')) {
          // Skip auto-fixing missing required fields - needs manual intervention
          couldNotFix.push(`Cannot auto-fix: ${error}`);
        } else if (error.includes('mannschaft references')) {
          // Try to clean up mannschaft references
          const fixed_issue = await this.cleanupMannschaftReferences(error);
          if (fixed_issue) {
            fixed.push(`Fixed: ${error}`);
          } else {
            couldNotFix.push(`Could not fix: ${error}`);
          }
        } else {
          // Most issues require manual intervention
          couldNotFix.push(`Manual fix required: ${error}`);
        }
      } catch (fixError) {
        couldNotFix.push(`Failed to fix: ${error} - ${fixError.message}`);
      }
    }

    return {
      fixed,
      couldNotFix,
      summary: {
        totalIssues: validationResult.errors.length,
        fixedIssues: fixed.length,
        remainingIssues: couldNotFix.length
      }
    };
  }

  /**
   * Clean up mannschaft references in data
   */
  private async cleanupMannschaftReferences(error: string): Promise<boolean> {
    try {
      // This is a placeholder for mannschaft reference cleanup
      // In practice, this would involve updating specific records
      // to remove or replace mannschaft references
      
      // For now, just log that we would attempt to fix this
      this.strapi?.log?.info(`Would attempt to clean up: ${error}`);
      return false; // Return false since we're not actually fixing anything yet
    } catch (error) {
      return false;
    }
  }

  /**
   * Get data statistics for monitoring
   */
  async getDataStatistics() {
    try {
      const [teams, spielers] = await Promise.all([
        this.strapi.entityService.findMany('api::team.team'),
        this.strapi.entityService.findMany('api::spieler.spieler')
      ]);

      return {
        teams: teams?.length || 0,
        spielers: spielers?.length || 0,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get data statistics: ${error.message}`);
    }
  }

  private buildValidationResult(
    isValid: boolean, 
    errors: string[], 
    warnings: string[], 
    totalChecks: number, 
    passedChecks: number
  ): ValidationResult {
    return {
      isValid,
      errors,
      warnings,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks: totalChecks - passedChecks
      }
    };
  }
}

export default DataIntegrityService;
export { ValidationResult, RelationValidationOptions };