/**
 * Automated Data Processing Service
 * Handles automatic statistics updates, table recalculations, and data consistency maintenance
 */

import AuditLoggerService from './audit-logger';
import DataIntegrityService from './data-integrity';

export interface ProcessingResult {
  success: boolean;
  message: string;
  details?: any;
  errors?: string[];
}

export class AutomatedProcessingService {
  /**
   * Processes match completion and triggers all related updates
   */
  static async processMatchCompletion(matchId: any): Promise<ProcessingResult> {
    try {
      // Get match with all related data
      const match = await strapi.entityService.findOne('api::spiel.spiel' as any, matchId, {
        populate: ['unser_team', 'saison', 'liga', 'heimclub', 'auswaertsclub']
      });

      if (!match) {
        return { success: false, message: 'Match not found' };
      }

      const results = [];
      const errors = [];

      // 1. Update player statistics from match events
      try {
        const statsResult = await this.updatePlayerStatisticsFromMatch(match);
        results.push(statsResult);
      } catch (error) {
        errors.push(`Statistics update failed: ${error.message}`);
      }

      // 2. Update league table
      try {
        const tableResult = await this.updateLeagueTableFromMatch(match);
        results.push(tableResult);
      } catch (error) {
        errors.push(`Table update failed: ${error.message}`);
      }

      // 3. Validate data consistency
      try {
        const validationResult = await this.validateMatchDataConsistency(match);
        results.push(validationResult);
      } catch (error) {
        errors.push(`Validation failed: ${error.message}`);
      }

      // 4. Log the processing
      await AuditLoggerService.logSystemEvent(
        'match_completion_processing',
        errors.length > 0 ? 'high' : 'medium',
        `Match ${matchId} completion processing: ${results.length} operations completed, ${errors.length} errors`,
        { matchId, results, errors }
      );

      return {
        success: errors.length === 0,
        message: `Match completion processing: ${results.length} operations completed`,
        details: results,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      await AuditLoggerService.logSystemEvent(
        'match_completion_processing_error',
        'critical',
        `Critical error processing match completion for match ${matchId}: ${error.message}`,
        { matchId, error: error.message }
      );

      return {
        success: false,
        message: `Critical error processing match completion: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  /**
   * Updates player statistics from match events
   */
  static async updatePlayerStatisticsFromMatch(match: any): Promise<ProcessingResult> {
    try {
      if (!match.unser_team || !match.saison) {
        return { success: false, message: 'Match missing required team or season data' };
      }

      const teamId = match.unser_team.id;
      const saisonId = match.saison.id;
      const updatedPlayers = [];

      // Process goals
      if (match.torschuetzen && Array.isArray(match.torschuetzen)) {
        for (const goal of match.torschuetzen) {
          // Update goal scorer
          await strapi.service('api::spielerstatistik.spielerstatistik').updateFromMatchEvent(
            goal.spieler_id,
            teamId,
            saisonId,
            'tor',
            1
          );
          updatedPlayers.push({ playerId: goal.spieler_id, event: 'goal' });

          // Update assist if present
          if (goal.assist_spieler_id) {
            await strapi.service('api::spielerstatistik.spielerstatistik').updateFromMatchEvent(
              goal.assist_spieler_id,
              teamId,
              saisonId,
              'assist',
              1
            );
            updatedPlayers.push({ playerId: goal.assist_spieler_id, event: 'assist' });
          }
        }
      }

      // Process cards
      if (match.karten && Array.isArray(match.karten)) {
        for (const card of match.karten) {
          const eventType = card.typ === 'rot' || card.typ === 'gelb-rot' ? 'rote_karte' : 'gelbe_karte';
          
          await strapi.service('api::spielerstatistik.spielerstatistik').updateFromMatchEvent(
            card.spieler_id,
            teamId,
            saisonId,
            eventType,
            1
          );
          updatedPlayers.push({ playerId: card.spieler_id, event: card.typ });
        }
      }

      // Process substitutions
      if (match.wechsel && Array.isArray(match.wechsel)) {
        for (const substitution of match.wechsel) {
          // Player coming in gets substitution appearance
          await strapi.service('api::spielerstatistik.spielerstatistik').updateFromMatchEvent(
            substitution.rein_id,
            teamId,
            saisonId,
            'einwechslung',
            1
          );
          updatedPlayers.push({ playerId: substitution.rein_id, event: 'substitution_in' });
        }
      }

      // Update match appearances for all involved players
      await this.updateMatchAppearances(match, teamId, saisonId);

      return {
        success: true,
        message: `Statistics updated for ${updatedPlayers.length} player events`,
        details: { updatedPlayers, matchId: match.id }
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to update player statistics: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  /**
   * Updates league table from match result
   */
  static async updateLeagueTableFromMatch(match: any): Promise<ProcessingResult> {
    try {
      if (!match.liga || !match.heimclub || !match.auswaertsclub || 
          match.tore_heim === undefined || match.tore_auswaerts === undefined) {
        return { success: false, message: 'Match missing required data for table update' };
      }

      const ligaId = match.liga.id;
      const heimclubId = match.heimclub.id;
      const auswaertsclubId = match.auswaertsclub.id;
      const toreHeim = match.tore_heim;
      const toreAuswaerts = match.tore_auswaerts;

      // Determine match result
      let heimResult: 'S' | 'U' | 'N';
      let auswaertsResult: 'S' | 'U' | 'N';
      
      if (toreHeim > toreAuswaerts) {
        heimResult = 'S'; // Win
        auswaertsResult = 'N'; // Loss
      } else if (toreHeim < toreAuswaerts) {
        heimResult = 'N'; // Loss
        auswaertsResult = 'S'; // Win
      } else {
        heimResult = 'U'; // Draw
        auswaertsResult = 'U'; // Draw
      }

      // Update home club table entry
      await this.updateClubTableEntry(ligaId, heimclubId, {
        spiele: 1,
        siege: heimResult === 'S' ? 1 : 0,
        unentschieden: heimResult === 'U' ? 1 : 0,
        niederlagen: heimResult === 'N' ? 1 : 0,
        tore_fuer: toreHeim,
        tore_gegen: toreAuswaerts,
        form_result: heimResult
      });

      // Update away club table entry
      await this.updateClubTableEntry(ligaId, auswaertsclubId, {
        spiele: 1,
        siege: auswaertsResult === 'S' ? 1 : 0,
        unentschieden: auswaertsResult === 'U' ? 1 : 0,
        niederlagen: auswaertsResult === 'N' ? 1 : 0,
        tore_fuer: toreAuswaerts,
        tore_gegen: toreHeim,
        form_result: auswaertsResult
      });

      // Update table positions
      await strapi.service('api::tabellen-eintrag.tabellen-eintrag').updateTablePositions(ligaId);

      return {
        success: true,
        message: `League table updated for match ${match.id}`,
        details: { 
          ligaId, 
          result: `${toreHeim}-${toreAuswaerts}`,
          heimResult,
          auswaertsResult
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to update league table: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  /**
   * Validates match data consistency after processing
   */
  static async validateMatchDataConsistency(match: any): Promise<ProcessingResult> {
    try {
      const issues = [];

      // Validate score consistency with events
      if (match.torschuetzen && Array.isArray(match.torschuetzen)) {
        const goalCount = match.torschuetzen.length;
        const totalScore = (match.tore_heim || 0) + (match.tore_auswaerts || 0);
        
        if (Math.abs(goalCount - totalScore) > 2) { // Allow some tolerance for own goals
          issues.push(`Goal events (${goalCount}) don't match total score (${totalScore})`);
        }
      }

      // Validate player participation
      const allPlayerIds = new Set();
      
      if (match.torschuetzen) {
        match.torschuetzen.forEach((goal: any) => {
          allPlayerIds.add(goal.spieler_id);
          if (goal.assist_spieler_id) allPlayerIds.add(goal.assist_spieler_id);
        });
      }
      
      if (match.karten) {
        match.karten.forEach((card: any) => allPlayerIds.add(card.spieler_id));
      }
      
      if (match.wechsel) {
        match.wechsel.forEach((sub: any) => {
          allPlayerIds.add(sub.raus_id);
          allPlayerIds.add(sub.rein_id);
        });
      }

      // Validate all players belong to participating team
      for (const playerId of allPlayerIds) {
        const player = await strapi.entityService.findOne('api::spieler.spieler', playerId as any, {
          populate: ['hauptteam', 'aushilfe_teams']
        });

        if (!player) {
          issues.push(`Player ${playerId} not found`);
          continue;
        }

        const isInTeam = (player as any).hauptteam?.id === match.unser_team?.id || 
                         (player as any).aushilfe_teams?.some((team: any) => team.id === match.unser_team?.id);

        if (!isInTeam) {
          issues.push(`Player ${player.vorname} ${player.nachname} not in participating team`);
        }
      }

      if (issues.length > 0) {
        await AuditLoggerService.logIntegrityIssue(
          'api::spiel.spiel',
          match.id,
          'match_data_consistency',
          issues.join('; '),
          'medium'
        );
      }

      return {
        success: issues.length === 0,
        message: issues.length === 0 ? 'Match data is consistent' : `${issues.length} consistency issues found`,
        details: { issues }
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to validate match consistency: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  /**
   * Runs periodic data consistency maintenance
   */
  static async runDataConsistencyMaintenance(): Promise<ProcessingResult> {
    try {
      const results = [];
      const errors = [];

      // 1. Run integrity checks
      try {
        const integrityResults = await DataIntegrityService.runFullIntegrityCheck();
        results.push({ operation: 'integrity_check', results: integrityResults });
        
        // Log critical issues
        for (const result of integrityResults) {
          const criticalIssues = result.issues.filter(issue => issue.severity === 'critical');
          if (criticalIssues.length > 0) {
            await AuditLoggerService.logSystemEvent(
              'critical_integrity_issues',
              'critical',
              `${criticalIssues.length} critical integrity issues found in ${result.contentType}`,
              { contentType: result.contentType, issues: criticalIssues }
            );
          }
        }
      } catch (error) {
        errors.push(`Integrity check failed: ${error.message}`);
      }

      // 2. Recalculate all table positions
      try {
        const tableResults = await this.recalculateAllTablePositions();
        results.push({ operation: 'table_recalculation', results: tableResults });
      } catch (error) {
        errors.push(`Table recalculation failed: ${error.message}`);
      }

      // 3. Validate statistics consistency
      try {
        const statsResults = await this.validateAllStatisticsConsistency();
        results.push({ operation: 'statistics_validation', results: statsResults });
      } catch (error) {
        errors.push(`Statistics validation failed: ${error.message}`);
      }

      // 4. Clean up orphaned data
      try {
        const cleanupResults = await this.cleanupOrphanedData();
        results.push({ operation: 'data_cleanup', results: cleanupResults });
      } catch (error) {
        errors.push(`Data cleanup failed: ${error.message}`);
      }

      await AuditLoggerService.logSystemEvent(
        'data_consistency_maintenance',
        errors.length > 0 ? 'high' : 'medium',
        `Data consistency maintenance completed: ${results.length} operations, ${errors.length} errors`,
        { results, errors }
      );

      return {
        success: errors.length === 0,
        message: `Data consistency maintenance: ${results.length} operations completed`,
        details: results,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      await AuditLoggerService.logSystemEvent(
        'data_consistency_maintenance_error',
        'critical',
        `Critical error in data consistency maintenance: ${error.message}`,
        { error: error.message }
      );

      return {
        success: false,
        message: `Critical error in data consistency maintenance: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  /**
   * Calculates player statistics from match events
   */
  static calculatePlayerStatistics(matchData: any): any {
    const stats = {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      substitutions: 0
    };

    // Process goals
    if (matchData.torschuetzen && Array.isArray(matchData.torschuetzen)) {
      stats.goals = matchData.torschuetzen.length;
      stats.assists = matchData.torschuetzen.filter((goal: any) => goal.assist_spieler_id).length;
    }

    // Process cards
    if (matchData.karten && Array.isArray(matchData.karten)) {
      for (const card of matchData.karten) {
        if (card.typ === 'gelb') {
          stats.yellowCards++;
        } else if (card.typ === 'rot' || card.typ === 'gelb-rot') {
          stats.redCards++;
        }
      }
    }

    // Process substitutions
    if (matchData.wechsel && Array.isArray(matchData.wechsel)) {
      stats.substitutions = matchData.wechsel.length;
    }

    return stats;
  }

  /**
   * Updates table positions for a league
   */
  static async updateTablePositions(ligaId: any): Promise<void> {
    const tableEntries = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag' as any, {
      filters: { liga: ligaId },
      sort: ['punkte:desc', 'tordifferenz:desc', 'tore_fuer:desc']
    });

    const entriesArray = Array.isArray(tableEntries) ? tableEntries : [tableEntries];
    
    for (let i = 0; i < entriesArray.length; i++) {
      const entry = entriesArray[i];
      if (entry) {
        await strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag' as any, entry.id, {
          data: { position: i + 1 }
        });
      }
    }
  }

  /**
   * Processes season transition (deactivate old, activate new)
   */
  static async processSeasonTransition(oldSeasonId: any, newSeasonId: any): Promise<ProcessingResult> {
    try {
      const results = [];
      const errors = [];

      // 1. Initialize statistics for new season
      try {
        const statsResult = await strapi.service('api::spielerstatistik.spielerstatistik').initializeForNewSeason(newSeasonId);
        results.push({ operation: 'initialize_statistics', count: statsResult.length });
      } catch (error) {
        errors.push(`Statistics initialization failed: ${error.message}`);
      }

      // 2. Initialize league tables for new season
      try {
        const leagues = await strapi.entityService.findMany('api::liga.liga' as any, {
          filters: { saison: newSeasonId }
        });

        const leaguesArray = Array.isArray(leagues) ? leagues : [leagues];
        
        for (const league of leaguesArray) {
          if (league) {
            await strapi.service('api::tabellen-eintrag.tabellen-eintrag').initializeLeagueTable(league.id);
          }
        }
        
        results.push({ operation: 'initialize_tables', count: leaguesArray.length });
      } catch (error) {
        errors.push(`Table initialization failed: ${error.message}`);
      }

      // 3. Archive old season data
      try {
        const archiveResult = await this.archiveSeasonData(oldSeasonId);
        results.push({ operation: 'archive_data', result: archiveResult });
      } catch (error) {
        errors.push(`Data archiving failed: ${error.message}`);
      }

      await AuditLoggerService.logSystemEvent(
        'season_transition',
        errors.length > 0 ? 'high' : 'medium',
        `Season transition from ${oldSeasonId} to ${newSeasonId}: ${results.length} operations completed`,
        { oldSeasonId, newSeasonId, results, errors }
      );

      return {
        success: errors.length === 0,
        message: `Season transition completed: ${results.length} operations`,
        details: results,
        errors: errors.length > 0 ? errors : undefined
      };

    } catch (error) {
      return {
        success: false,
        message: `Season transition failed: ${error.message}`,
        errors: [error.message]
      };
    }
  }

  // Private helper methods

  private static async updateMatchAppearances(match: any, teamId: number, saisonId: number): Promise<void> {
    const playersInMatch = new Set<number>();
    const substitutedPlayers = new Set<number>();
    const substitutePlayers = new Set<number>();

    // Collect players from all events
    if (match.torschuetzen) {
      match.torschuetzen.forEach((goal: any) => {
        playersInMatch.add(goal.spieler_id);
        if (goal.assist_spieler_id) playersInMatch.add(goal.assist_spieler_id);
      });
    }

    if (match.karten) {
      match.karten.forEach((card: any) => playersInMatch.add(card.spieler_id));
    }

    if (match.wechsel) {
      match.wechsel.forEach((sub: any) => {
        playersInMatch.add(sub.raus_id);
        playersInMatch.add(sub.rein_id);
        substitutedPlayers.add(sub.raus_id);
        substitutePlayers.add(sub.rein_id);
      });
    }

    // Update match appearances
    for (const playerId of playersInMatch) {
      await strapi.service('api::spielerstatistik.spielerstatistik').updateFromMatchEvent(
        playerId,
        teamId,
        saisonId,
        'spiel',
        1
      );

      // Determine if player started or came as substitute
      if (substitutePlayers.has(playerId) && !substitutedPlayers.has(playerId)) {
        await strapi.service('api::spielerstatistik.spielerstatistik').updateFromMatchEvent(
          playerId,
          teamId,
          saisonId,
          'einwechslung',
          1
        );
      } else if (!substitutePlayers.has(playerId)) {
        await strapi.service('api::spielerstatistik.spielerstatistik').updateFromMatchEvent(
          playerId,
          teamId,
          saisonId,
          'startelf',
          1
        );
      }
    }
  }

  private static async updateClubTableEntry(ligaId: number, clubId: number, matchData: any): Promise<void> {
    const existingEntries = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag' as any, {
      filters: { liga: ligaId, club: clubId }
    });

    const tableService = strapi.service('api::tabellen-eintrag.tabellen-eintrag');

    if (existingEntries && existingEntries.length > 0) {
      const currentEntry = existingEntries[0];
      
      const updatedData: any = {
        spiele: currentEntry.spiele + matchData.spiele,
        siege: currentEntry.siege + matchData.siege,
        unentschieden: currentEntry.unentschieden + matchData.unentschieden,
        niederlagen: currentEntry.niederlagen + matchData.niederlagen,
        tore_fuer: currentEntry.tore_fuer + matchData.tore_fuer,
        tore_gegen: currentEntry.tore_gegen + matchData.tore_gegen
      };

      const updatedForm = tableService.updateForm(currentEntry.form_letzte_5 || [], matchData.form_result);
      updatedData.tordifferenz = tableService.calculateGoalDifference(updatedData.tore_fuer, updatedData.tore_gegen);
      updatedData.punkte = tableService.calculatePoints(updatedData.siege, updatedData.unentschieden);

      await strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag' as any, currentEntry.id, {
        data: { ...updatedData, form_letzte_5: updatedForm }
      });
    } else {
      const newEntryData: any = {
        liga: ligaId,
        club: clubId,
        spiele: matchData.spiele,
        siege: matchData.siege,
        unentschieden: matchData.unentschieden,
        niederlagen: matchData.niederlagen,
        tore_fuer: matchData.tore_fuer,
        tore_gegen: matchData.tore_gegen,
        form_letzte_5: [matchData.form_result]
      };

      newEntryData.tordifferenz = tableService.calculateGoalDifference(newEntryData.tore_fuer, newEntryData.tore_gegen);
      newEntryData.punkte = tableService.calculatePoints(newEntryData.siege, newEntryData.unentschieden);

      await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag' as any, {
        data: newEntryData
      });
    }
  }

  private static async recalculateAllTablePositions(): Promise<any> {
    const leagues = await strapi.entityService.findMany('api::liga.liga' as any);
    const leaguesArray = Array.isArray(leagues) ? leagues : [leagues];
    const results = [];

    for (const league of leaguesArray) {
      if (league) {
        try {
          await strapi.service('api::tabellen-eintrag.tabellen-eintrag').updateTablePositions(league.id);
          results.push({ ligaId: league.id, status: 'success' });
        } catch (error) {
          results.push({ ligaId: league.id, status: 'error', error: error.message });
        }
      }
    }

    return results;
  }

  private static async validateAllStatisticsConsistency(): Promise<any> {
    const allStats = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
      populate: ['spieler', 'team', 'saison']
    });

    const statsArray = Array.isArray(allStats) ? allStats : [allStats];
    const issues = [];

    for (const stat of statsArray) {
      if (stat) {
        // Check for negative values
        const negativeFields = [];
        if (stat.tore < 0) negativeFields.push('tore');
        if (stat.spiele < 0) negativeFields.push('spiele');
        if (stat.assists < 0) negativeFields.push('assists');
        if (stat.gelbe_karten < 0) negativeFields.push('gelbe_karten');
        if (stat.rote_karten < 0) negativeFields.push('rote_karten');

        if (negativeFields.length > 0) {
          issues.push({
            statisticsId: stat.id,
            issue: 'negative_values',
            fields: negativeFields
          });
        }

        // Check for unrealistic ratios
        if (stat.tore > stat.spiele * 5) {
          issues.push({
            statisticsId: stat.id,
            issue: 'unrealistic_goal_ratio',
            ratio: stat.tore / stat.spiele
          });
        }
      }
    }

    return { totalChecked: statsArray.length, issues };
  }

  private static async cleanupOrphanedData(): Promise<any> {
    const results = [];

    // Clean up statistics without valid player references
    try {
      const orphanedStats = await strapi.db.query('api::spielerstatistik.spielerstatistik').findMany({
        where: {
          spieler: null
        }
      });

      if (orphanedStats.length > 0) {
        for (const stat of orphanedStats) {
          await strapi.entityService.delete('api::spielerstatistik.spielerstatistik' as any, stat.id);
        }
        results.push({ type: 'orphaned_statistics', cleaned: orphanedStats.length });
      }
    } catch (error) {
      results.push({ type: 'orphaned_statistics', error: error.message });
    }

    return results;
  }

  private static async archiveSeasonData(seasonId: any): Promise<any> {
    // In a real implementation, this would archive old season data
    // For now, just log the archiving
    strapi.log.info(`Archiving data for season ${seasonId}`);
    return { archived: true, seasonId };
  }
}

export default AutomatedProcessingService;