/**
 * Data Integrity Service
 * Provides automated data consistency checks and maintenance routines
 */

export interface IntegrityCheckResult {
  contentType: string;
  issues: IntegrityIssue[];
  summary: {
    total: number;
    critical: number;
    warnings: number;
  };
}

export interface IntegrityIssue {
  id: any;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  field?: string;
  suggestedFix?: string;
}

export class DataIntegrityService {
  /**
   * Runs comprehensive data integrity checks across all content types
   */
  static async runFullIntegrityCheck(): Promise<IntegrityCheckResult[]> {
    const results: IntegrityCheckResult[] = [];

    try {
      // Check each content type
      results.push(await this.checkSeasonIntegrity());
      results.push(await this.checkPlayerIntegrity());
      results.push(await this.checkTeamIntegrity());
      results.push(await this.checkMatchIntegrity());
      results.push(await this.checkStatisticsIntegrity());
      results.push(await this.checkLeagueTableIntegrity());

      // Log summary
      const totalIssues = results.reduce((sum, result) => sum + result.summary.total, 0);
      const criticalIssues = results.reduce((sum, result) => sum + result.summary.critical, 0);
      
      strapi.log.info(`Data integrity check completed: ${totalIssues} total issues, ${criticalIssues} critical`);

      return results;
    } catch (error) {
      strapi.log.error('Error running data integrity check:', error);
      throw error;
    }
  }

  /**
   * Checks season data integrity
   */
  static async checkSeasonIntegrity(): Promise<IntegrityCheckResult> {
    const issues: IntegrityIssue[] = [];

    try {
      // Check for multiple active seasons
      const activeSeasons = await strapi.entityService.findMany('api::saison.saison' as any, {
        filters: { aktiv: true }
      });

      const activeSeasonsArray = Array.isArray(activeSeasons) ? activeSeasons : [activeSeasons];
      
      if (activeSeasonsArray.length > 1) {
        issues.push({
          id: 'multiple-active-seasons',
          severity: 'critical',
          type: 'constraint_violation',
          message: `${activeSeasonsArray.length} aktive Saisons gefunden, nur eine erlaubt`,
          suggestedFix: 'Deaktivieren Sie alle bis auf eine Saison'
        });
      }

      if (activeSeasonsArray.length === 0) {
        issues.push({
          id: 'no-active-season',
          severity: 'critical',
          type: 'missing_data',
          message: 'Keine aktive Saison gefunden',
          suggestedFix: 'Aktivieren Sie eine Saison'
        });
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
          issues.push({
            id: current.id,
            severity: 'warning',
            type: 'data_inconsistency',
            message: `Saison "${current.name}" überschneidet sich mit "${next.name}"`,
            field: 'end_datum',
            suggestedFix: 'Überprüfen Sie die Saison-Daten'
          });
        }
      }

    } catch (error) {
      issues.push({
        id: 'check-error',
        severity: 'critical',
        type: 'system_error',
        message: `Fehler bei Saison-Integritätsprüfung: ${error.message}`
      });
    }

    return {
      contentType: 'api::saison.saison',
      issues,
      summary: {
        total: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        warnings: issues.filter(i => i.severity === 'warning').length
      }
    };
  }

  /**
   * Checks player data integrity
   */
  static async checkPlayerIntegrity(): Promise<IntegrityCheckResult> {
    const issues: IntegrityIssue[] = [];

    try {
      // Check for players without teams
      const playersWithoutTeams = await strapi.entityService.findMany('api::spieler.spieler' as any, {
        filters: { hauptteam: { $null: true } },
        populate: ['mitglied']
      });

      const playersArray = Array.isArray(playersWithoutTeams) ? playersWithoutTeams : [playersWithoutTeams];
      
      for (const player of playersArray) {
        if (player) {
          issues.push({
            id: player.id,
            severity: 'warning',
            type: 'missing_relationship',
            message: `Spieler "${player.vorname} ${player.nachname}" hat kein Hauptteam`,
            field: 'hauptteam',
            suggestedFix: 'Weisen Sie dem Spieler ein Hauptteam zu'
          });
        }
      }

      // Check for duplicate jersey numbers within teams
      const allPlayers = await strapi.entityService.findMany('api::spieler.spieler' as any, {
        filters: { 
          rueckennummer: { $notNull: true },
          hauptteam: { $notNull: true }
        },
        populate: ['hauptteam']
      });

      const allPlayersArray = Array.isArray(allPlayers) ? allPlayers : [allPlayers];
      const teamJerseyMap = new Map<string, any[]>();

      for (const player of allPlayersArray) {
        if (player && player.hauptteam) {
          const key = `${player.hauptteam.id}-${player.rueckennummer}`;
          if (!teamJerseyMap.has(key)) {
            teamJerseyMap.set(key, []);
          }
          teamJerseyMap.get(key)!.push(player);
        }
      }

      for (const [key, players] of teamJerseyMap) {
        if (players.length > 1) {
          const [teamId, jerseyNumber] = key.split('-');
          const teamName = players[0].hauptteam?.name || 'Unbekanntes Team';
          
          for (const player of players) {
            issues.push({
              id: player.id,
              severity: 'critical',
              type: 'constraint_violation',
              message: `Rückennummer ${jerseyNumber} ist mehrfach im Team "${teamName}" vergeben`,
              field: 'rueckennummer',
              suggestedFix: 'Vergeben Sie eindeutige Rückennummern'
            });
          }
        }
      }

      // Check for multiple captains per team
      const captains = await strapi.entityService.findMany('api::spieler.spieler' as any, {
        filters: { 
          kapitaen: true,
          hauptteam: { $notNull: true }
        },
        populate: ['hauptteam']
      });

      const captainsArray = Array.isArray(captains) ? captains : [captains];
      const teamCaptainMap = new Map<number, any[]>();

      for (const captain of captainsArray) {
        if (captain && captain.hauptteam) {
          const teamId = captain.hauptteam.id;
          if (!teamCaptainMap.has(teamId)) {
            teamCaptainMap.set(teamId, []);
          }
          teamCaptainMap.get(teamId)!.push(captain);
        }
      }

      for (const [teamId, teamCaptains] of teamCaptainMap) {
        if (teamCaptains.length > 1) {
          const teamName = teamCaptains[0].hauptteam?.name || 'Unbekanntes Team';
          
          for (const captain of teamCaptains) {
            issues.push({
              id: captain.id,
              severity: 'warning',
              type: 'business_rule_violation',
              message: `Team "${teamName}" hat mehrere Kapitäne`,
              field: 'kapitaen',
              suggestedFix: 'Bestimmen Sie nur einen Kapitän pro Team'
            });
          }
        }
      }

    } catch (error) {
      issues.push({
        id: 'check-error',
        severity: 'critical',
        type: 'system_error',
        message: `Fehler bei Spieler-Integritätsprüfung: ${error.message}`
      });
    }

    return {
      contentType: 'api::spieler.spieler',
      issues,
      summary: {
        total: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        warnings: issues.filter(i => i.severity === 'warning').length
      }
    };
  }

  /**
   * Checks team data integrity
   */
  static async checkTeamIntegrity(): Promise<IntegrityCheckResult> {
    const issues: IntegrityIssue[] = [];

    try {
      // Check for teams without leagues or seasons
      const teamsWithMissingData = await strapi.entityService.findMany('api::team.team' as any, {
        filters: {
          $or: [
            { liga: { $null: true } },
            { saison: { $null: true } },
            { club: { $null: true } }
          ]
        }
      });

      const teamsArray = Array.isArray(teamsWithMissingData) ? teamsWithMissingData : [teamsWithMissingData];
      
      for (const team of teamsArray) {
        if (team) {
          if (!team.liga) {
            issues.push({
              id: team.id,
              severity: 'critical',
              type: 'missing_relationship',
              message: `Team "${team.name}" hat keine Liga zugeordnet`,
              field: 'liga',
              suggestedFix: 'Weisen Sie dem Team eine Liga zu'
            });
          }
          
          if (!team.saison) {
            issues.push({
              id: team.id,
              severity: 'critical',
              type: 'missing_relationship',
              message: `Team "${team.name}" hat keine Saison zugeordnet`,
              field: 'saison',
              suggestedFix: 'Weisen Sie dem Team eine Saison zu'
            });
          }
          
          if (!team.club) {
            issues.push({
              id: team.id,
              severity: 'critical',
              type: 'missing_relationship',
              message: `Team "${team.name}" hat keinen Verein zugeordnet`,
              field: 'club',
              suggestedFix: 'Weisen Sie dem Team einen Verein zu'
            });
          }
        }
      }

    } catch (error) {
      issues.push({
        id: 'check-error',
        severity: 'critical',
        type: 'system_error',
        message: `Fehler bei Team-Integritätsprüfung: ${error.message}`
      });
    }

    return {
      contentType: 'api::team.team',
      issues,
      summary: {
        total: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        warnings: issues.filter(i => i.severity === 'warning').length
      }
    };
  }

  /**
   * Checks match data integrity
   */
  static async checkMatchIntegrity(): Promise<IntegrityCheckResult> {
    const issues: IntegrityIssue[] = [];

    try {
      // Check for matches with same home and away clubs
      const invalidMatches = await strapi.entityService.findMany('api::spiel.spiel' as any, {
        populate: ['heimclub', 'auswaertsclub', 'unser_team']
      });

      const matchesArray = Array.isArray(invalidMatches) ? invalidMatches : [invalidMatches];
      
      for (const match of matchesArray) {
        if (match && match.heimclub && match.auswaertsclub) {
          if (match.heimclub.id === match.auswaertsclub.id) {
            issues.push({
              id: match.id,
              severity: 'critical',
              type: 'data_inconsistency',
              message: `Spiel hat gleichen Heim- und Auswärtsverein: ${match.heimclub.name}`,
              suggestedFix: 'Korrigieren Sie die Vereinszuordnung'
            });
          }
        }

        // Check for negative scores
        if (match.tore_heim < 0 || match.tore_auswaerts < 0) {
          issues.push({
            id: match.id,
            severity: 'critical',
            type: 'invalid_data',
            message: 'Spiel hat negative Tore',
            field: match.tore_heim < 0 ? 'tore_heim' : 'tore_auswaerts',
            suggestedFix: 'Korrigieren Sie die Toranzahl'
          });
        }

        // Check for unrealistic scores
        if (match.tore_heim > 20 || match.tore_auswaerts > 20) {
          issues.push({
            id: match.id,
            severity: 'warning',
            type: 'unusual_data',
            message: `Spiel hat ungewöhnlich hohe Toranzahl: ${match.tore_heim}-${match.tore_auswaerts}`,
            suggestedFix: 'Überprüfen Sie die Toranzahl'
          });
        }
      }

    } catch (error) {
      issues.push({
        id: 'check-error',
        severity: 'critical',
        type: 'system_error',
        message: `Fehler bei Spiel-Integritätsprüfung: ${error.message}`
      });
    }

    return {
      contentType: 'api::spiel.spiel',
      issues,
      summary: {
        total: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        warnings: issues.filter(i => i.severity === 'warning').length
      }
    };
  }

  /**
   * Checks statistics data integrity
   */
  static async checkStatisticsIntegrity(): Promise<IntegrityCheckResult> {
    const issues: IntegrityIssue[] = [];

    try {
      // Check for negative statistics
      const allStats = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
        populate: ['spieler', 'team', 'saison']
      });

      const statsArray = Array.isArray(allStats) ? allStats : [allStats];
      
      for (const stat of statsArray) {
        if (stat) {
          const negativeFields = [];
          
          if (stat.tore < 0) negativeFields.push('tore');
          if (stat.spiele < 0) negativeFields.push('spiele');
          if (stat.assists < 0) negativeFields.push('assists');
          if (stat.gelbe_karten < 0) negativeFields.push('gelbe_karten');
          if (stat.rote_karten < 0) negativeFields.push('rote_karten');
          if (stat.minuten_gespielt < 0) negativeFields.push('minuten_gespielt');

          if (negativeFields.length > 0) {
            issues.push({
              id: stat.id,
              severity: 'critical',
              type: 'invalid_data',
              message: `Negative Statistikwerte: ${negativeFields.join(', ')}`,
              suggestedFix: 'Korrigieren Sie die negativen Werte'
            });
          }

          // Check for unrealistic ratios
          if (stat.tore > stat.spiele * 5) {
            issues.push({
              id: stat.id,
              severity: 'warning',
              type: 'unusual_data',
              message: `Ungewöhnliches Tor-Spiel-Verhältnis: ${stat.tore} Tore in ${stat.spiele} Spielen`,
              field: 'tore',
              suggestedFix: 'Überprüfen Sie die Statistiken'
            });
          }

          if (stat.gelbe_karten + stat.rote_karten > stat.spiele) {
            issues.push({
              id: stat.id,
              severity: 'warning',
              type: 'data_inconsistency',
              message: `Mehr Karten als Spiele: ${stat.gelbe_karten + stat.rote_karten} Karten in ${stat.spiele} Spielen`,
              suggestedFix: 'Überprüfen Sie die Kartenstatistiken'
            });
          }
        }
      }

      // Check for duplicate statistics entries
      const duplicateCheck = new Map<string, any[]>();
      
      for (const stat of statsArray) {
        if (stat && stat.spieler && stat.team && stat.saison) {
          const key = `${stat.spieler.id}-${stat.team.id}-${stat.saison.id}`;
          if (!duplicateCheck.has(key)) {
            duplicateCheck.set(key, []);
          }
          duplicateCheck.get(key)!.push(stat);
        }
      }

      for (const [key, duplicates] of duplicateCheck) {
        if (duplicates.length > 1) {
          for (const duplicate of duplicates) {
            issues.push({
              id: duplicate.id,
              severity: 'critical',
              type: 'constraint_violation',
              message: `Doppelte Statistik-Einträge für Spieler-Team-Saison-Kombination`,
              suggestedFix: 'Entfernen Sie doppelte Einträge'
            });
          }
        }
      }

    } catch (error) {
      issues.push({
        id: 'check-error',
        severity: 'critical',
        type: 'system_error',
        message: `Fehler bei Statistik-Integritätsprüfung: ${error.message}`
      });
    }

    return {
      contentType: 'api::spielerstatistik.spielerstatistik',
      issues,
      summary: {
        total: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        warnings: issues.filter(i => i.severity === 'warning').length
      }
    };
  }

  /**
   * Checks league table data integrity
   */
  static async checkLeagueTableIntegrity(): Promise<IntegrityCheckResult> {
    const issues: IntegrityIssue[] = [];

    try {
      const allTableEntries = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag' as any, {
        populate: ['liga', 'club']
      });

      const entriesArray = Array.isArray(allTableEntries) ? allTableEntries : [allTableEntries];
      
      for (const entry of entriesArray) {
        if (entry) {
          // Check mathematical consistency
          const calculatedPoints = (entry.siege * 3) + entry.unentschieden;
          if (entry.punkte !== calculatedPoints) {
            issues.push({
              id: entry.id,
              severity: 'critical',
              type: 'calculation_error',
              message: `Punkte stimmen nicht überein: ${entry.punkte} vs berechnet ${calculatedPoints}`,
              field: 'punkte',
              suggestedFix: 'Korrigieren Sie die Punkteberechnung'
            });
          }

          const calculatedGoalDiff = entry.tore_fuer - entry.tore_gegen;
          if (entry.tordifferenz !== calculatedGoalDiff) {
            issues.push({
              id: entry.id,
              severity: 'critical',
              type: 'calculation_error',
              message: `Tordifferenz stimmt nicht überein: ${entry.tordifferenz} vs berechnet ${calculatedGoalDiff}`,
              field: 'tordifferenz',
              suggestedFix: 'Korrigieren Sie die Tordifferenz'
            });
          }

          const totalGames = entry.siege + entry.unentschieden + entry.niederlagen;
          if (entry.spiele !== totalGames) {
            issues.push({
              id: entry.id,
              severity: 'critical',
              type: 'calculation_error',
              message: `Spielanzahl stimmt nicht überein: ${entry.spiele} vs berechnet ${totalGames}`,
              field: 'spiele',
              suggestedFix: 'Korrigieren Sie die Spielanzahl'
            });
          }
        }
      }

    } catch (error) {
      issues.push({
        id: 'check-error',
        severity: 'critical',
        type: 'system_error',
        message: `Fehler bei Tabellen-Integritätsprüfung: ${error.message}`
      });
    }

    return {
      contentType: 'api::tabellen-eintrag.tabellen-eintrag',
      issues,
      summary: {
        total: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        warnings: issues.filter(i => i.severity === 'warning').length
      }
    };
  }

  /**
   * Attempts to automatically fix certain types of integrity issues
   */
  static async autoFixIssues(results: IntegrityCheckResult[]): Promise<{ fixed: number; failed: number }> {
    let fixed = 0;
    let failed = 0;

    for (const result of results) {
      for (const issue of result.issues) {
        try {
          const wasFixed = await this.attemptAutoFix(result.contentType, issue);
          if (wasFixed) {
            fixed++;
          } else {
            failed++;
          }
        } catch (error) {
          strapi.log.error(`Failed to auto-fix issue ${issue.id}:`, error);
          failed++;
        }
      }
    }

    strapi.log.info(`Auto-fix completed: ${fixed} fixed, ${failed} failed`);
    return { fixed, failed };
  }

  private static async attemptAutoFix(contentType: string, issue: IntegrityIssue): Promise<boolean> {
    switch (issue.type) {
      case 'calculation_error':
        return await this.fixCalculationError(contentType, issue);
      case 'constraint_violation':
        // Most constraint violations require manual intervention
        return false;
      default:
        return false;
    }
  }

  private static async fixCalculationError(contentType: string, issue: IntegrityIssue): Promise<boolean> {
    if (contentType === 'api::tabellen-eintrag.tabellen-eintrag') {
      const entry = await strapi.entityService.findOne(contentType as any, issue.id);
      if (!entry) return false;

      const updates: any = {};
      
      // Fix points calculation
      if (issue.field === 'punkte') {
        updates.punkte = (entry.siege * 3) + entry.unentschieden;
      }
      
      // Fix goal difference calculation
      if (issue.field === 'tordifferenz') {
        updates.tordifferenz = entry.tore_fuer - entry.tore_gegen;
      }
      
      // Fix games calculation
      if (issue.field === 'spiele') {
        updates.spiele = entry.siege + entry.unentschieden + entry.niederlagen;
      }

      if (Object.keys(updates).length > 0) {
        await strapi.entityService.update(contentType as any, issue.id, { data: updates });
        return true;
      }
    }

    return false;
  }
}

export default DataIntegrityService;