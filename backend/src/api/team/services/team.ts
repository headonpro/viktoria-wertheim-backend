/**
 * team service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::team.team', ({ strapi }) => ({
  /**
   * Find teams with populated relationships
   */
  async findWithPopulate(params = {}) {
    return await strapi.entityService.findMany('api::team.team', {
      ...params,
      populate: ['club', 'liga', 'saison', 'spieler', 'aushilfe_spieler'] as any
    });
  },

  /**
   * Find a single team with populated relationships
   */
  async findOneWithPopulate(id: number, params = {}) {
    return await strapi.entityService.findOne('api::team.team', id, {
      ...params,
      populate: ['club', 'liga', 'saison', 'spieler', 'aushilfe_spieler'] as any
    });
  },

  /**
   * Get teams for a specific season
   */
  async findBySeason(saisonId: number, params: any = {}) {
    return await this.findWithPopulate({
      ...params,
      filters: {
        saison: saisonId,
        ...(params.filters || {})
      },
      sort: { name: 'asc' }
    });
  },

  /**
   * Get teams for a specific league
   */
  async findByLeague(ligaId: number, params: any = {}) {
    return await this.findWithPopulate({
      ...params,
      filters: {
        liga: ligaId,
        ...(params.filters || {})
      },
      sort: { tabellenplatz: 'asc' }
    });
  },

  /**
   * Get active teams
   */
  async findActive(params: any = {}) {
    return await this.findWithPopulate({
      ...params,
      filters: {
        status: 'aktiv',
        ...(params.filters || {})
      },
      sort: { name: 'asc' }
    });
  },

  /**
   * Get team with full match history - SIMPLIFIED since Spiel content type was removed
   */
  async findWithMatches(teamId: number, saisonId?: number) {
    const populateOptions: any = {
      populate: {
        club: true,
        liga: true,
        saison: true,
        spieler: {
          populate: ['mitglied']
        },
        aushilfe_spieler: {
          populate: ['mitglied']
        }
      }
    };

    return await strapi.entityService.findOne('api::team.team', teamId, populateOptions);
  },

  /**
   * Get team roster with player details
   */
  async getTeamRoster(teamId: number) {
    const team = await strapi.entityService.findOne('api::team.team', teamId, {
      populate: {
        spieler: {
          populate: ['mitglied'] as any
        },
        aushilfe_spieler: {
          populate: ['mitglied', 'hauptteam'] as any
        }
      }
    });

    if (!team) {
      throw new Error('Team not found');
    }

    return {
      team: {
        id: team.id,
        name: team.name,
        liga_name: team.liga_name,
        trainer: team.trainer,
        co_trainer: team.co_trainer
      },
      hauptspieler: (team as any).spieler || [],
      aushilfespieler: (team as any).aushilfe_spieler || []
    };
  },

  /**
   * Update team statistics - SIMPLIFIED since Spiel content type was removed
   * Statistics would need to be manually maintained or calculated from Game Cards
   */
  async updateTeamStatistics(teamId: number, saisonId?: number) {
    const team = await this.findWithMatches(teamId, saisonId);
    
    if (!team) {
      throw new Error('Team not found');
    }

    // Since we don't have matches anymore, return team with current statistics
    // Statistics would need to be manually updated or calculated from Game Cards
    strapi.log.info(`Team statistics update requested for team ${teamId} - manual update required since Spiel content type was removed`);
    
    return team;
  },

  /**
   * Get team standings for a league
   */
  async getLeagueStandings(ligaId: number, saisonId: number) {
    const teams = await strapi.entityService.findMany('api::team.team', {
      filters: {
        liga: { id: ligaId },
        saison: { id: saisonId },
        status: 'aktiv'
      } as any,
      populate: ['club', 'liga', 'saison'] as any,
      sort: [
        { punkte: 'desc' },
        { tordifferenz: 'desc' },
        { tore_fuer: 'desc' },
        { name: 'asc' }
      ] as any
    });

    // Update table positions
    const updatedTeams = [];
    const teamsArray = Array.isArray(teams) ? teams : [teams];
    for (let i = 0; i < teamsArray.length; i++) {
      const team = teamsArray[i];
      if (team.tabellenplatz !== i + 1) {
        const updatedTeam = await strapi.entityService.update('api::team.team', team.id, {
          data: { tabellenplatz: i + 1 }
        });
        updatedTeams.push(updatedTeam);
      } else {
        updatedTeams.push(team);
      }
    }

    return updatedTeams;
  },

  /**
   * Validate team data consistency
   */
  async validateTeamData(teamId: number) {
    const team = await this.findOneWithPopulate(teamId);
    
    if (!team) {
      throw new Error('Team not found');
    }

    const issues = [];

    // Check if team has required relations
    if (!(team as any).club) {
      issues.push('Team has no club assigned');
    }

    if (!(team as any).liga) {
      issues.push('Team has no league assigned');
    }

    if (!(team as any).saison) {
      issues.push('Team has no season assigned');
    }

    // Check if players are properly linked
    const spieler = (team as any).spieler || [];
    for (const player of spieler) {
      if (!player.hauptteam || player.hauptteam.id !== teamId) {
        issues.push(`Player ${player.vorname} ${player.nachname} has inconsistent team relation`);
      }
    }

    // Note: Match relation validation removed since Spiel content type was removed

    return {
      valid: issues.length === 0,
      issues
    };
  },

  /**
   * Get comprehensive team information
   */
  async getTeamDetails(teamId: number, saisonId?: number) {
    const team = await this.findWithMatches(teamId, saisonId);
    
    if (!team) {
      throw new Error('Team not found');
    }

    const roster = await this.getTeamRoster(teamId);
    const validation = await this.validateTeamData(teamId);

    return {
      team,
      roster,
      validation,
      statistics: {
        spiele_gesamt: team.spiele_gesamt,
        siege: team.siege,
        unentschieden: team.unentschieden,
        niederlagen: team.niederlagen,
        punkte: team.punkte,
        tore_fuer: team.tore_fuer,
        tore_gegen: team.tore_gegen,
        tordifferenz: team.tordifferenz,
        form_letzte_5: team.form_letzte_5,
        trend: team.trend,
        tabellenplatz: team.tabellenplatz
      }
    };
  }
}));