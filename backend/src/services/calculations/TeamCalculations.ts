/**
 * Team Calculations
 * 
 * Comprehensive calculation logic for team statistics including
 * automatic team statistics calculations, team ranking calculations,
 * and team form calculation logic.
 * 
 * These calculations support both synchronous and asynchronous processing
 * with proper error handling and fallback values.
 */

import { SyncCalculation, AsyncCalculation } from '../CalculationService';

/**
 * Team calculation configuration
 */
interface TeamCalculationConfig {
  enableStatisticsCalculation: boolean;
  enableRankingCalculation: boolean;
  enableFormCalculation: boolean;
  formCalculationGames: number; // Number of recent games for form calculation
  enableGoalDifferenceCalculation: boolean;
  enablePointsCalculation: boolean;
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
}

/**
 * Default team calculation configuration
 */
const DEFAULT_TEAM_CALCULATION_CONFIG: TeamCalculationConfig = {
  enableStatisticsCalculation: true,
  enableRankingCalculation: true,
  enableFormCalculation: true,
  formCalculationGames: 5,
  enableGoalDifferenceCalculation: true,
  enablePointsCalculation: true,
  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0
};

/**
 * Team statistics interface
 */
interface TeamStatistics {
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  winPercentage: number;
  averageGoalsFor: number;
  averageGoalsAgainst: number;
  form: string; // e.g., "WWDLW"
  formPoints: number;
  lastUpdated: Date;
}

/**
 * Team ranking information
 */
interface TeamRanking {
  position: number;
  totalTeams: number;
  pointsGap: number; // Gap to leader
  pointsAbove: number; // Points above team below
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

/**
 * Team form information
 */
interface TeamForm {
  form: string; // e.g., "WWDLW"
  formPoints: number;
  recentGames: Array<{
    result: 'W' | 'D' | 'L';
    goalsFor: number;
    goalsAgainst: number;
    opponent: string;
    date: Date;
  }>;
  trend: 'improving' | 'declining' | 'stable';
  lastUpdated: Date;
}

/**
 * Basic team statistics calculation (synchronous)
 */
export class TeamBasicStatisticsCalculation implements SyncCalculation {
  name = 'team-basic-statistics';
  field = 'basic_statistics';
  dependencies = ['tabellen_eintraege'];
  
  private config: TeamCalculationConfig;
  private strapi: any;

  constructor(strapi: any, config: Partial<TeamCalculationConfig> = {}) {
    this.strapi = strapi;
    this.config = { ...DEFAULT_TEAM_CALCULATION_CONFIG, ...config };
  }

  calculator = (data: any): TeamStatistics | null => {
    try {
      if (!this.config.enableStatisticsCalculation) {
        return null;
      }

      // Initialize default statistics
      const stats: TeamStatistics = {
        gamesPlayed: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        winPercentage: 0,
        averageGoalsFor: 0,
        averageGoalsAgainst: 0,
        form: '',
        formPoints: 0,
        lastUpdated: new Date()
      };

      // Calculate from table entries if available
      if (data.tabellen_eintraege && Array.isArray(data.tabellen_eintraege)) {
        for (const entry of data.tabellen_eintraege) {
          if (entry && typeof entry === 'object') {
            stats.gamesPlayed += this.safeNumber(entry.spiele) || 0;
            stats.wins += this.safeNumber(entry.siege) || 0;
            stats.draws += this.safeNumber(entry.unentschieden) || 0;
            stats.losses += this.safeNumber(entry.niederlagen) || 0;
            stats.goalsFor += this.safeNumber(entry.tore) || 0;
            stats.goalsAgainst += this.safeNumber(entry.gegentore) || 0;
            stats.points += this.safeNumber(entry.punkte) || 0;
          }
        }
      }

      // Calculate derived statistics
      if (this.config.enableGoalDifferenceCalculation) {
        stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
      }

      if (this.config.enablePointsCalculation && stats.gamesPlayed === 0) {
        // Calculate points if not provided in table entries
        stats.points = (stats.wins * this.config.pointsForWin) + 
                      (stats.draws * this.config.pointsForDraw) + 
                      (stats.losses * this.config.pointsForLoss);
      }

      // Calculate percentages and averages
      if (stats.gamesPlayed > 0) {
        stats.winPercentage = (stats.wins / stats.gamesPlayed) * 100;
        stats.averageGoalsFor = stats.goalsFor / stats.gamesPlayed;
        stats.averageGoalsAgainst = stats.goalsAgainst / stats.gamesPlayed;
      }

      this.strapi?.log?.debug('Team basic statistics calculated', {
        teamId: data.id,
        statistics: stats
      });

      return stats;

    } catch (error) {
      this.strapi?.log?.error('Team basic statistics calculation failed', {
        error: error.message,
        teamData: data
      });
      
      return null;
    }
  };

  private safeNumber(value: any): number {
    const num = parseInt(String(value));
    return isNaN(num) ? 0 : num;
  }

  updateConfig(newConfig: Partial<TeamCalculationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Team age calculation (synchronous)
 */
export class TeamAgeCalculation implements SyncCalculation {
  name = 'team-age-calculation';
  field = 'team_age';
  dependencies = ['gruendungsjahr'];
  
  private strapi: any;

  constructor(strapi: any) {
    this.strapi = strapi;
  }

  calculator = (data: any): number | null => {
    try {
      if (!data.gruendungsjahr) {
        return null;
      }

      const foundingYear = parseInt(String(data.gruendungsjahr));
      if (isNaN(foundingYear)) {
        return null;
      }

      const currentYear = new Date().getFullYear();
      const age = currentYear - foundingYear;

      this.strapi?.log?.debug('Team age calculated', {
        teamId: data.id,
        foundingYear,
        age
      });

      return age > 0 ? age : null;

    } catch (error) {
      this.strapi?.log?.error('Team age calculation failed', {
        error: error.message,
        teamData: data
      });
      
      return null;
    }
  };
}

/**
 * Team ranking calculation (asynchronous)
 */
export class TeamRankingCalculation implements AsyncCalculation {
  name = 'team-ranking-calculation';
  dependencies = ['tabellen_eintraege', 'liga'];
  priority: 'high' | 'medium' | 'low' = 'medium';
  
  private config: TeamCalculationConfig;
  private strapi: any;

  constructor(strapi: any, config: Partial<TeamCalculationConfig> = {}) {
    this.strapi = strapi;
    this.config = { ...DEFAULT_TEAM_CALCULATION_CONFIG, ...config };
  }

  calculator = async (data: any): Promise<TeamRanking | null> => {
    try {
      if (!this.config.enableRankingCalculation || !data.teamId) {
        return null;
      }

      // Get team data
      const team = await this.strapi.entityService.findOne('api::team.team', data.teamId, {
        populate: {
          liga: true,
          saison: true,
          tabellen_eintraege: true
        }
      });

      if (!team || !team.liga || !team.saison) {
        this.strapi?.log?.warn('Cannot calculate team ranking without liga and saison', {
          teamId: data.teamId
        });
        return null;
      }

      // Get all teams in the same liga and saison
      const teamsInLeague = await this.strapi.entityService.findMany('api::team.team', {
        filters: {
          liga: team.liga.id,
          saison: team.saison.id
        },
        populate: {
          tabellen_eintraege: true
        }
      });

      // Calculate points for each team and sort
      const teamRankings = teamsInLeague.map((t: any) => {
        const totalPoints = this.calculateTotalPoints(t.tabellen_eintraege || []);
        const totalGoalDifference = this.calculateTotalGoalDifference(t.tabellen_eintraege || []);
        const totalGoalsFor = this.calculateTotalGoalsFor(t.tabellen_eintraege || []);
        
        return {
          id: t.id,
          name: t.name,
          points: totalPoints,
          goalDifference: totalGoalDifference,
          goalsFor: totalGoalsFor
        };
      }).sort((a, b) => {
        // Sort by points, then goal difference, then goals for
        if (a.points !== b.points) return b.points - a.points;
        if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });

      // Find current team position
      const teamIndex = teamRankings.findIndex(t => t.id === data.teamId);
      if (teamIndex === -1) {
        return null;
      }

      const position = teamIndex + 1;
      const totalTeams = teamRankings.length;
      const currentTeam = teamRankings[teamIndex];
      
      // Calculate gaps
      const leader = teamRankings[0];
      const pointsGap = leader.points - currentTeam.points;
      
      const teamBelow = teamIndex < totalTeams - 1 ? teamRankings[teamIndex + 1] : null;
      const pointsAbove = teamBelow ? currentTeam.points - teamBelow.points : 0;

      // Determine trend (placeholder - would need historical data)
      const trend: 'up' | 'down' | 'stable' = 'stable';

      const ranking: TeamRanking = {
        position,
        totalTeams,
        pointsGap,
        pointsAbove,
        trend,
        lastUpdated: new Date()
      };

      this.strapi?.log?.debug('Team ranking calculated', {
        teamId: data.teamId,
        ranking
      });

      return ranking;

    } catch (error) {
      this.strapi?.log?.error('Team ranking calculation failed', {
        error: error.message,
        teamId: data.teamId
      });
      
      return null;
    }
  };

  private calculateTotalPoints(entries: any[]): number {
    return entries.reduce((total, entry) => {
      return total + (parseInt(String(entry.punkte)) || 0);
    }, 0);
  }

  private calculateTotalGoalDifference(entries: any[]): number {
    return entries.reduce((total, entry) => {
      const goalsFor = parseInt(String(entry.tore)) || 0;
      const goalsAgainst = parseInt(String(entry.gegentore)) || 0;
      return total + (goalsFor - goalsAgainst);
    }, 0);
  }

  private calculateTotalGoalsFor(entries: any[]): number {
    return entries.reduce((total, entry) => {
      return total + (parseInt(String(entry.tore)) || 0);
    }, 0);
  }

  updateConfig(newConfig: Partial<TeamCalculationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Team form calculation (asynchronous)
 */
export class TeamFormCalculation implements AsyncCalculation {
  name = 'team-form-calculation';
  dependencies = ['spiele', 'tabellen_eintraege'];
  priority: 'high' | 'medium' | 'low' = 'low';
  
  private config: TeamCalculationConfig;
  private strapi: any;

  constructor(strapi: any, config: Partial<TeamCalculationConfig> = {}) {
    this.strapi = strapi;
    this.config = { ...DEFAULT_TEAM_CALCULATION_CONFIG, ...config };
  }

  calculator = async (data: any): Promise<TeamForm | null> => {
    try {
      if (!this.config.enableFormCalculation || !data.teamId) {
        return null;
      }

      // This is a placeholder for team form calculation
      // Would need game/match data to calculate actual form
      
      this.strapi?.log?.debug('Team form calculation', {
        teamId: data.teamId,
        formGames: this.config.formCalculationGames
      });

      // Placeholder form calculation
      const form: TeamForm = {
        form: 'WWDLW', // Placeholder
        formPoints: 10, // Placeholder
        recentGames: [], // Would be populated with actual game data
        trend: 'stable',
        lastUpdated: new Date()
      };

      return form;

    } catch (error) {
      this.strapi?.log?.error('Team form calculation failed', {
        error: error.message,
        teamId: data.teamId
      });
      
      return null;
    }
  };

  updateConfig(newConfig: Partial<TeamCalculationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Factory function to create all team calculations
 */
export function createTeamSyncCalculations(
  strapi: any,
  config: Partial<TeamCalculationConfig> = {}
): SyncCalculation[] {
  return [
    new TeamBasicStatisticsCalculation(strapi, config),
    new TeamAgeCalculation(strapi)
  ];
}

/**
 * Factory function to create all team async calculations
 */
export function createTeamAsyncCalculations(
  strapi: any,
  config: Partial<TeamCalculationConfig> = {}
): AsyncCalculation[] {
  return [
    new TeamRankingCalculation(strapi, config),
    new TeamFormCalculation(strapi, config)
  ];
}

/**
 * Update configuration for all team calculations
 */
export function updateTeamCalculationConfig(
  calculations: Array<SyncCalculation | AsyncCalculation>,
  newConfig: Partial<TeamCalculationConfig>
): void {
  for (const calc of calculations) {
    if ('updateConfig' in calc && typeof calc.updateConfig === 'function') {
      (calc as any).updateConfig(newConfig);
    }
  }
}

export default {
  TeamBasicStatisticsCalculation,
  TeamAgeCalculation,
  TeamRankingCalculation,
  TeamFormCalculation,
  createTeamSyncCalculations,
  createTeamAsyncCalculations,
  updateTeamCalculationConfig
};

export type { 
  TeamCalculationConfig,
  TeamStatistics,
  TeamRanking,
  TeamForm
};