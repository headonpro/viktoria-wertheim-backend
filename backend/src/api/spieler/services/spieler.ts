/**
 * spieler service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::spieler.spieler', ({ strapi }) => ({
  /**
   * Find players by team (including both hauptteam and aushilfe assignments)
   */
  async findByTeam(teamId: number) {
    const players = await strapi.entityService.findMany('api::spieler.spieler', {
      filters: {
        $or: [
          { hauptteam: { id: teamId } },
          { aushilfe_teams: { id: teamId } }
        ]
      },
      populate: {
        mitglied: true,
        hauptteam: true,
        aushilfe_teams: true
      }
    });

    return players;
  },

  /**
   * Get available jersey numbers for a team
   */
  async getAvailableJerseyNumbers(teamId: number, excludePlayerId?: number) {
    const filters: any = {
      hauptteam: { id: teamId },
      rueckennummer: { $notNull: true }
    };

    if (excludePlayerId) {
      filters.id = { $ne: excludePlayerId };
    }

    const playersWithNumbers: any[] = await strapi.entityService.findMany('api::spieler.spieler', {
      filters,
      fields: ['rueckennummer']
    });

    const usedNumbers = playersWithNumbers.map((player: any) => player.rueckennummer);
    const availableNumbers = [];

    for (let i = 1; i <= 99; i++) {
      if (!usedNumbers.includes(i)) {
        availableNumbers.push(i);
      }
    }

    return availableNumbers;
  },

  /**
   * Validate team assignment consistency
   */
  async validateTeamAssignment(playerId: number) {
    const player: any = await strapi.entityService.findOne('api::spieler.spieler', playerId, {
      populate: {
        hauptteam: {
          populate: ['club', 'saison']
        },
        aushilfe_teams: {
          populate: ['club', 'saison']
        }
      }
    });

    if (!player) {
      throw new Error('Spieler nicht gefunden');
    }

    if (!player.hauptteam) {
      return { valid: true, warnings: ['Spieler hat kein Hauptteam zugewiesen'] };
    }

    const warnings: string[] = [];
    const errors: string[] = [];

    // Check if aushilfe teams belong to same club and season
    if (player.aushilfe_teams && player.aushilfe_teams.length > 0) {
      for (const team of player.aushilfe_teams) {
        if (team.club?.id !== player.hauptteam.club?.id) {
          errors.push(`Aushilfe-Team "${team.name}" gehört nicht zum gleichen Verein`);
        }
        
        if (team.saison?.id !== player.hauptteam.saison?.id) {
          errors.push(`Aushilfe-Team "${team.name}" gehört nicht zur gleichen Saison`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}));