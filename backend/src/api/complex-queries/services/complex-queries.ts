/**
 * complex-queries service
 * Implements complex data queries and aggregations with caching and optimization
 */

import { 
  transformLeagueTable, 
  transformPlayerStats, 
  transformPlayerStatsList,
  transformMatch,
  transformMatchEvents,
  transformTeamRoster,
  createPaginatedResponse,
  addPerformanceMetrics
} from '../utils/transformers';

import { 
  withCache, 
  CacheKeys, 
  CacheTTL, 
  QueryOptimization,
  PerformanceMonitor
} from '../utils/cache';

import { 
  createApiError, 
  ErrorCodes, 
  ensureResourceExists,
  withErrorHandler,
  validateId,
  validatePagination,
  validateSortBy
} from '../utils/error-handler';

export default ({ strapi }) => ({

  // ===== LEAGUE TABLE SERVICES =====

  /**
   * Get enhanced league table with additional statistics
   */
  async getEnhancedLeagueTable(ligaId: number) {
    try {
      // Get basic table entries
      const entries: any[] = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
        filters: { liga: ligaId },
        populate: {
          liga: true,
          club: {
            populate: ['logo']
          }
        },
        sort: 'platz:asc'
      });

      // Enhance each entry with additional statistics
      const enhancedEntries = entries.map(entry => {
        const winPercentage = entry.spiele > 0 ? (entry.siege / entry.spiele * 100) : 0;
        const pointsPerGame = entry.spiele > 0 ? (entry.punkte / entry.spiele) : 0;
        const goalsPerGame = entry.spiele > 0 ? (entry.tore_fuer / entry.spiele) : 0;
        const goalsConcededPerGame = entry.spiele > 0 ? (entry.tore_gegen / entry.spiele) : 0;
        
        // Calculate form points (last 5 matches)
        const formPoints = this.calculateFormPoints(entry.form_letzte_5 || []);
        
        return {
          ...entry,
          statistics: {
            winPercentage: Math.round(winPercentage * 10) / 10,
            pointsPerGame: Math.round(pointsPerGame * 100) / 100,
            goalsPerGame: Math.round(goalsPerGame * 100) / 100,
            goalsConcededPerGame: Math.round(goalsConcededPerGame * 100) / 100,
            formPoints,
            formString: (entry.form_letzte_5 || []).join('')
          }
        };
      });

      return enhancedEntries;
    } catch (error) {
      strapi.log.error('Error fetching enhanced league table:', error);
      throw error;
    }
  },

  /**
   * Get league standings with trends and form analysis
   */
  async getLeagueStandings(ligaId: number) {
    try {
      const table = await this.getEnhancedLeagueTable(ligaId);
      
      // Add trend analysis
      const standings = table.map((entry, index) => {
        const trend = this.calculateTrend(entry.form_letzte_5 || []);
        const isChampionshipPosition = index < 1;
        const isRelegationPosition = index >= table.length - 3;
        
        return {
          ...entry,
          trend,
          position: {
            isChampionship: isChampionshipPosition,
            isRelegation: isRelegationPosition,
            change: 0 // Would need historical data to calculate
          }
        };
      });

      return {
        standings,
        metadata: {
          totalTeams: table.length,
          lastUpdated: new Date().toISOString(),
          championshipPositions: 1,
          relegationPositions: 3
        }
      };
    } catch (error) {
      strapi.log.error('Error fetching league standings:', error);
      throw error;
    }
  },

  // ===== PLAYER STATISTICS SERVICES =====

  /**
   * Get comprehensive player statistics
   */
  async getPlayerStatistics(playerId: number, saisonId?: number) {
    try {
      // Get player basic info
      const player: any = await strapi.entityService.findOne('api::spieler.spieler', playerId, {
        populate: {
          mitglied: true,
          hauptteam: {
            populate: ['club', 'liga', 'saison']
          },
          aushilfe_teams: {
            populate: ['club', 'liga', 'saison']
          }
        }
      });

      if (!player) {
        throw new Error('Player not found');
      }

      // Get season statistics
      const statsFilters: any = { spieler: playerId };
      if (saisonId) {
        statsFilters.saison = saisonId;
      }

      const seasonStats: any[] = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik', {
        filters: statsFilters,
        populate: {
          saison: true,
          team: {
            populate: ['club', 'liga']
          }
        }
      });

      // Get match events for detailed analysis
      const matches = await this.getPlayerMatchEvents(playerId, saisonId);

      // Calculate aggregated statistics
      const aggregatedStats = this.aggregatePlayerStats(seasonStats);
      
      return {
        player,
        seasonStats,
        aggregatedStats,
        matchEvents: matches,
        performance: this.calculatePlayerPerformance(seasonStats, matches)
      };
    } catch (error) {
      strapi.log.error('Error fetching player statistics:', error);
      throw error;
    }
  },

  /**
   * Get team player statistics aggregated
   */
  async getTeamPlayerStatistics(teamId: number, saisonId?: number) {
    try {
      // Get all players for the team
      const players: any[] = await strapi.entityService.findMany('api::spieler.spieler', {
        filters: {
          $or: [
            { hauptteam: teamId },
            { aushilfe_teams: teamId }
          ]
        },
        populate: {
          mitglied: true,
          hauptteam: true,
          aushilfe_teams: true
        }
      });

      // Get statistics for all players
      const statsFilters: any = { 
        spieler: { $in: players.map(p => p.id) }
      };
      if (saisonId) {
        statsFilters.saison = saisonId;
      }

      const allStats: any[] = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik', {
        filters: statsFilters,
        populate: {
          spieler: {
            populate: ['mitglied']
          },
          saison: true,
          team: true
        }
      });

      // Group statistics by player
      const playerStats = players.map(player => {
        const stats = allStats.filter(stat => stat.spieler.id === player.id);
        const aggregated = this.aggregatePlayerStats(stats);
        
        return {
          player,
          stats,
          aggregated
        };
      });

      // Calculate team totals
      const teamTotals = this.calculateTeamTotals(allStats);

      return {
        players: playerStats,
        teamTotals,
        metadata: {
          totalPlayers: players.length,
          activePlayers: playerStats.filter(p => p.aggregated.spiele > 0).length
        }
      };
    } catch (error) {
      strapi.log.error('Error fetching team player statistics:', error);
      throw error;
    }
  },

  /**
   * Get season-wide player statistics
   */
  async getSeasonPlayerStatistics(saisonId: number, limit: number = 50, sortBy: string = 'tore') {
    try {
      const sortField = this.validateSortField(sortBy);
      
      const stats: any[] = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik', {
        filters: { saison: saisonId },
        populate: {
          spieler: {
            populate: ['mitglied', 'hauptteam']
          },
          team: {
            populate: ['club']
          },
          saison: true
        },
        sort: `${sortField}:desc`,
        limit
      });

      return stats.map(stat => ({
        ...stat,
        performance: this.calculateIndividualPerformance(stat)
      }));
    } catch (error) {
      strapi.log.error('Error fetching season player statistics:', error);
      throw error;
    }
  },

  /**
   * Get top scorers for a season
   */
  async getTopScorers(saisonId: number, limit: number = 10) {
    try {
      const topScorers: any[] = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik', {
        filters: { 
          saison: saisonId,
          tore: { $gt: 0 }
        },
        populate: {
          spieler: {
            populate: ['mitglied', 'hauptteam']
          },
          team: {
            populate: ['club']
          }
        },
        sort: 'tore:desc',
        limit
      });

      return topScorers.map((scorer, index) => ({
        rank: index + 1,
        ...scorer,
        goalsPerGame: scorer.spiele > 0 ? Math.round((scorer.tore / scorer.spiele) * 100) / 100 : 0
      }));
    } catch (error) {
      strapi.log.error('Error fetching top scorers:', error);
      throw error;
    }
  },

  // ===== MATCH TIMELINE AND EVENTS SERVICES =====

  /**
   * Get match timeline with events
   */
  async getMatchTimeline(matchId: number) {
    try {
      const match: any = await strapi.entityService.findOne('api::spiel.spiel', matchId, {
        populate: {
          heimclub: true,
          auswaertsclub: true,
          unser_team: {
            populate: ['club']
          },
          liga: true,
          saison: true
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      // Parse and structure events
      const timeline = this.buildMatchTimeline(match);

      return {
        match,
        timeline,
        summary: this.generateMatchSummary(match, timeline)
      };
    } catch (error) {
      strapi.log.error('Error fetching match timeline:', error);
      throw error;
    }
  },

  /**
   * Get structured match events
   */
  async getMatchEvents(matchId: number) {
    try {
      const match: any = await strapi.entityService.findOne('api::spiel.spiel', matchId, {
        populate: {
          heimclub: true,
          auswaertsclub: true,
          unser_team: true
        }
      });

      if (!match) {
        throw new Error('Match not found');
      }

      const events = {
        goals: this.parseMatchEvents(match.torschuetzen || [], 'goal'),
        cards: this.parseMatchEvents(match.karten || [], 'card'),
        substitutions: this.parseMatchEvents(match.wechsel || [], 'substitution')
      };

      return {
        match: {
          id: match.id,
          datum: match.datum,
          heimclub: match.heimclub,
          auswaertsclub: match.auswaertsclub,
          tore_heim: match.tore_heim,
          tore_auswaerts: match.tore_auswaerts,
          status: match.status
        },
        events
      };
    } catch (error) {
      strapi.log.error('Error fetching match events:', error);
      throw error;
    }
  },

  /**
   * Get recent matches for a team
   */
  async getRecentMatches(teamId: number, limit: number = 5) {
    try {
      const matches: any[] = await strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          unser_team: teamId,
          status: 'beendet',
          datum: { $lt: new Date().toISOString() }
        },
        populate: {
          heimclub: true,
          auswaertsclub: true,
          unser_team: true,
          liga: true
        },
        sort: 'datum:desc',
        limit
      });

      return matches.map(match => ({
        ...match,
        result: this.determineMatchResult(match, teamId),
        events: {
          goals: (match.torschuetzen || []).length,
          cards: (match.karten || []).length,
          substitutions: (match.wechsel || []).length
        }
      }));
    } catch (error) {
      strapi.log.error('Error fetching recent matches:', error);
      throw error;
    }
  },

  /**
   * Get upcoming matches for a team
   */
  async getUpcomingMatches(teamId: number, limit: number = 5) {
    try {
      const matches: any[] = await strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          unser_team: teamId,
          status: { $in: ['geplant', 'laufend'] },
          datum: { $gte: new Date().toISOString() }
        },
        populate: {
          heimclub: true,
          auswaertsclub: true,
          unser_team: true,
          liga: true
        },
        sort: 'datum:asc',
        limit
      });

      return matches.map(match => ({
        ...match,
        daysUntilMatch: this.calculateDaysUntilMatch(match.datum)
      }));
    } catch (error) {
      strapi.log.error('Error fetching upcoming matches:', error);
      throw error;
    }
  },

  // ===== TEAM ROSTER AND FORMATION SERVICES =====

  /**
   * Get complete team roster with player details
   */
  async getTeamRoster(teamId: number, saisonId?: number) {
    try {
      // Get team info
      const team: any = await strapi.entityService.findOne('api::team.team', teamId, {
        populate: {
          club: true,
          liga: true,
          saison: true
        }
      });

      if (!team) {
        throw new Error('Team not found');
      }

      // Get all players (primary and secondary assignments)
      const players: any[] = await strapi.entityService.findMany('api::spieler.spieler', {
        filters: {
          $or: [
            { hauptteam: teamId },
            { aushilfe_teams: teamId }
          ]
        },
        populate: {
          mitglied: true,
          hauptteam: true,
          aushilfe_teams: true
        },
        sort: 'rueckennummer:asc'
      });

      // Get player statistics for the season
      const statsFilters: any = { 
        spieler: { $in: players.map(p => p.id) },
        team: teamId
      };
      if (saisonId) {
        statsFilters.saison = saisonId;
      }

      const playerStats: any[] = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik', {
        filters: statsFilters,
        populate: ['spieler', 'saison']
      });

      // Combine player info with statistics
      const roster = players.map(player => {
        const stats = playerStats.find(stat => stat.spieler.id === player.id);
        const isPrimary = player.hauptteam?.id === teamId;
        
        return {
          ...player,
          isPrimaryTeam: isPrimary,
          statistics: stats || this.getEmptyPlayerStats(),
          availability: this.calculatePlayerAvailability(player)
        };
      });

      // Group by position
      const rosterByPosition = this.groupPlayersByPosition(roster);

      return {
        team,
        roster,
        rosterByPosition,
        summary: {
          totalPlayers: roster.length,
          primaryPlayers: roster.filter(p => p.isPrimaryTeam).length,
          availablePlayers: roster.filter(p => p.availability.available).length,
          averageAge: this.calculateAverageAge(roster)
        }
      };
    } catch (error) {
      strapi.log.error('Error fetching team roster:', error);
      throw error;
    }
  },

  /**
   * Get team formation and tactical setup
   */
  async getTeamFormation(teamId: number) {
    try {
      const roster = await this.getTeamRoster(teamId);
      
      // Get typical formation based on player positions
      const formation = this.analyzeTeamFormation(roster.roster);
      
      // Get starting XI based on statistics and availability
      const startingXI = this.selectStartingXI(roster.roster);
      
      return {
        team: roster.team,
        formation,
        startingXI,
        bench: roster.roster.filter(player => 
          !startingXI.find(starter => starter.id === player.id) && 
          player.availability.available
        ),
        tacticalAnalysis: this.analyzeTacticalSetup(roster.roster, formation)
      };
    } catch (error) {
      strapi.log.error('Error fetching team formation:', error);
      throw error;
    }
  },

  /**
   * Get comprehensive squad overview
   */
  async getSquadOverview(teamId: number, saisonId?: number) {
    try {
      const roster = await this.getTeamRoster(teamId, saisonId);
      const recentMatches = await this.getRecentMatches(teamId, 5);
      const upcomingMatches = await this.getUpcomingMatches(teamId, 3);

      // Calculate squad statistics
      const squadStats = this.calculateSquadStatistics(roster.roster);
      
      return {
        team: roster.team,
        squadStats,
        playerSummary: {
          totalPlayers: roster.summary.totalPlayers,
          averageAge: roster.summary.averageAge,
          positionBreakdown: this.getPositionBreakdown(roster.roster),
          topPerformers: this.getTopPerformers(roster.roster)
        },
        recentForm: this.analyzeRecentForm(recentMatches),
        upcomingFixtures: upcomingMatches,
        injuryReport: this.getInjuryReport(roster.roster)
      };
    } catch (error) {
      strapi.log.error('Error fetching squad overview:', error);
      throw error;
    }
  },

  // ===== HELPER METHODS =====

  calculateFormPoints(form: string[]): number {
    if (!form || !Array.isArray(form)) return 0;
    
    return form.reduce((points, result) => {
      switch (result) {
        case 'S': return points + 3;
        case 'U': return points + 1;
        case 'N': return points + 0;
        default: return points;
      }
    }, 0);
  },

  calculateTrend(form: string[]): 'up' | 'down' | 'stable' {
    if (!form || form.length < 3) return 'stable';
    
    const recent = form.slice(-3);
    const earlier = form.slice(-5, -3);
    
    const recentPoints = this.calculateFormPoints(recent);
    const earlierPoints = this.calculateFormPoints(earlier);
    
    if (recentPoints > earlierPoints) return 'up';
    if (recentPoints < earlierPoints) return 'down';
    return 'stable';
  },

  aggregatePlayerStats(stats: any[]): any {
    if (!stats || stats.length === 0) {
      return this.getEmptyPlayerStats();
    }

    return stats.reduce((total, stat) => ({
      tore: total.tore + (stat.tore || 0),
      spiele: total.spiele + (stat.spiele || 0),
      assists: total.assists + (stat.assists || 0),
      gelbe_karten: total.gelbe_karten + (stat.gelbe_karten || 0),
      rote_karten: total.rote_karten + (stat.rote_karten || 0),
      minuten_gespielt: total.minuten_gespielt + (stat.minuten_gespielt || 0)
    }), this.getEmptyPlayerStats());
  },

  getEmptyPlayerStats(): any {
    return {
      tore: 0,
      spiele: 0,
      assists: 0,
      gelbe_karten: 0,
      rote_karten: 0,
      minuten_gespielt: 0
    };
  },

  validateSortField(sortBy: string): string {
    const validFields = ['tore', 'spiele', 'assists', 'gelbe_karten', 'rote_karten', 'minuten_gespielt'];
    return validFields.includes(sortBy) ? sortBy : 'tore';
  },

  calculatePlayerPerformance(seasonStats: any[], matches: any[]): any {
    // Implementation for player performance calculation
    return {
      rating: 0,
      consistency: 0,
      improvement: 0
    };
  },

  calculateTeamTotals(allStats: any[]): any {
    return allStats.reduce((totals, stat) => ({
      tore: totals.tore + (stat.tore || 0),
      spiele: Math.max(totals.spiele, stat.spiele || 0),
      assists: totals.assists + (stat.assists || 0),
      gelbe_karten: totals.gelbe_karten + (stat.gelbe_karten || 0),
      rote_karten: totals.rote_karten + (stat.rote_karten || 0)
    }), this.getEmptyPlayerStats());
  },

  async getPlayerMatchEvents(playerId: number, saisonId?: number): Promise<any[]> {
    // Implementation to get player match events
    return [];
  },

  calculateIndividualPerformance(stat: any): any {
    const goalsPerGame = stat.spiele > 0 ? stat.tore / stat.spiele : 0;
    const minutesPerGoal = stat.tore > 0 ? stat.minuten_gespielt / stat.tore : 0;
    
    return {
      goalsPerGame: Math.round(goalsPerGame * 100) / 100,
      minutesPerGoal: Math.round(minutesPerGoal),
      disciplineScore: this.calculateDisciplineScore(stat)
    };
  },

  calculateDisciplineScore(stat: any): number {
    const yellowWeight = 1;
    const redWeight = 3;
    const totalCards = (stat.gelbe_karten * yellowWeight) + (stat.rote_karten * redWeight);
    
    if (stat.spiele === 0) return 10;
    return Math.max(0, 10 - (totalCards / stat.spiele * 2));
  },

  buildMatchTimeline(match: any): any[] {
    const timeline: any[] = [];
    
    // Add goals
    if (match.torschuetzen) {
      match.torschuetzen.forEach((goal: any) => {
        timeline.push({
          minute: goal.minute,
          type: 'goal',
          data: goal
        });
      });
    }
    
    // Add cards
    if (match.karten) {
      match.karten.forEach((card: any) => {
        timeline.push({
          minute: card.minute,
          type: 'card',
          data: card
        });
      });
    }
    
    // Add substitutions
    if (match.wechsel) {
      match.wechsel.forEach((sub: any) => {
        timeline.push({
          minute: sub.minute,
          type: 'substitution',
          data: sub
        });
      });
    }
    
    return timeline.sort((a, b) => a.minute - b.minute);
  },

  generateMatchSummary(match: any, timeline: any[]): any {
    return {
      totalEvents: timeline.length,
      goals: timeline.filter(e => e.type === 'goal').length,
      cards: timeline.filter(e => e.type === 'card').length,
      substitutions: timeline.filter(e => e.type === 'substitution').length,
      keyMoments: timeline.filter(e => e.type === 'goal' || (e.type === 'card' && e.data.typ === 'rot'))
    };
  },

  parseMatchEvents(events: any[], type: string): any[] {
    if (!events || !Array.isArray(events)) return [];
    
    return events.map(event => ({
      ...event,
      type
    }));
  },

  determineMatchResult(match: any, teamId: number): 'win' | 'draw' | 'loss' {
    if (match.tore_heim === match.tore_auswaerts) return 'draw';
    
    const isHome = match.ist_heimspiel;
    const ourGoals = isHome ? match.tore_heim : match.tore_auswaerts;
    const opponentGoals = isHome ? match.tore_auswaerts : match.tore_heim;
    
    return ourGoals > opponentGoals ? 'win' : 'loss';
  },

  calculateDaysUntilMatch(matchDate: string): number {
    const today = new Date();
    const match = new Date(matchDate);
    const diffTime = match.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  groupPlayersByPosition(roster: any[]): any {
    const positions = {
      goalkeeper: roster.filter(p => p.position?.toLowerCase().includes('tor')),
      defenders: roster.filter(p => p.position?.toLowerCase().includes('verteidiger')),
      midfielders: roster.filter(p => p.position?.toLowerCase().includes('mittelfeld')),
      forwards: roster.filter(p => p.position?.toLowerCase().includes('sturm')),
      other: roster.filter(p => !p.position || p.position === '')
    };
    
    return positions;
  },

  calculatePlayerAvailability(player: any): any {
    const isAvailable = player.status !== 'verletzt' && player.status !== 'gesperrt';
    
    return {
      available: isAvailable,
      status: player.status || 'aktiv',
      reason: !isAvailable ? player.status : null
    };
  },

  calculateAverageAge(roster: any[]): number {
    const playersWithAge = roster.filter(p => p.mitglied?.geburtsdatum);
    if (playersWithAge.length === 0) return 0;
    
    const totalAge = playersWithAge.reduce((sum, player) => {
      const birthDate = new Date(player.mitglied.geburtsdatum);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      return sum + age;
    }, 0);
    
    return Math.round(totalAge / playersWithAge.length);
  },

  analyzeTeamFormation(roster: any[]): any {
    // Simplified formation analysis
    const positions = this.groupPlayersByPosition(roster);
    
    return {
      formation: '4-4-2', // Default formation
      goalkeeper: positions.goalkeeper.length,
      defenders: positions.defenders.length,
      midfielders: positions.midfielders.length,
      forwards: positions.forwards.length
    };
  },

  selectStartingXI(roster: any[]): any[] {
    // Select starting XI based on availability and statistics
    return roster
      .filter(p => p.availability.available)
      .sort((a, b) => (b.statistics?.spiele || 0) - (a.statistics?.spiele || 0))
      .slice(0, 11);
  },

  analyzeTacticalSetup(roster: any[], formation: any): any {
    return {
      strengths: ['Experienced squad', 'Good depth'],
      weaknesses: ['Young defense'],
      keyPlayers: roster.filter(p => p.kapitaen).slice(0, 3)
    };
  },

  calculateSquadStatistics(roster: any[]): any {
    const totalStats = roster.reduce((totals, player) => {
      const stats = player.statistics || this.getEmptyPlayerStats();
      return {
        tore: totals.tore + stats.tore,
        spiele: totals.spiele + stats.spiele,
        assists: totals.assists + stats.assists,
        gelbe_karten: totals.gelbe_karten + stats.gelbe_karten,
        rote_karten: totals.rote_karten + stats.rote_karten
      };
    }, this.getEmptyPlayerStats());

    return {
      ...totalStats,
      averageGoalsPerPlayer: roster.length > 0 ? Math.round((totalStats.tore / roster.length) * 100) / 100 : 0,
      disciplineScore: this.calculateTeamDisciplineScore(totalStats)
    };
  },

  calculateTeamDisciplineScore(stats: any): number {
    const totalCards = stats.gelbe_karten + (stats.rote_karten * 3);
    const gamesPlayed = stats.spiele || 1;
    return Math.max(0, 10 - (totalCards / gamesPlayed));
  },

  getPositionBreakdown(roster: any[]): any {
    const positions = this.groupPlayersByPosition(roster);
    return {
      goalkeepers: positions.goalkeeper.length,
      defenders: positions.defenders.length,
      midfielders: positions.midfielders.length,
      forwards: positions.forwards.length,
      other: positions.other.length
    };
  },

  getTopPerformers(roster: any[]): any[] {
    return roster
      .filter(p => p.statistics && p.statistics.spiele > 0)
      .sort((a, b) => (b.statistics.tore || 0) - (a.statistics.tore || 0))
      .slice(0, 5)
      .map(player => ({
        name: `${player.mitglied?.vorname} ${player.mitglied?.nachname}`,
        goals: player.statistics.tore,
        games: player.statistics.spiele,
        position: player.position
      }));
  },

  analyzeRecentForm(matches: any[]): any {
    if (!matches || matches.length === 0) {
      return { form: [], points: 0, trend: 'stable' };
    }

    const form = matches.map(match => {
      switch (match.result) {
        case 'win': return 'S';
        case 'draw': return 'U';
        case 'loss': return 'N';
        default: return 'N';
      }
    });

    const points = this.calculateFormPoints(form);
    const trend = this.calculateTrend(form);

    return { form, points, trend };
  },

  getInjuryReport(roster: any[]): any[] {
    return roster
      .filter(p => p.status === 'verletzt' || p.status === 'gesperrt')
      .map(player => ({
        name: `${player.mitglied?.vorname} ${player.mitglied?.nachname}`,
        status: player.status,
        position: player.position,
        expectedReturn: null // Would need additional data
      }));
  }
});