/**
 * spielerstatistik service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::spielerstatistik.spielerstatistik' as any, ({ strapi }) => ({
  /**
   * Initialize statistics for a new season for all active players
   */
  async initializeForNewSeason(saisonId: number) {
    // Get all active players
    const players: any[] = await strapi.entityService.findMany('api::spieler.spieler', {
      filters: {
        status: 'aktiv'
      },
      populate: ['hauptteam', 'aushilfe_teams']
    });

    const statisticsEntries = [];

    for (const player of players) {
      // Create statistics entry for hauptteam
      if (player.hauptteam) {
        const hauptteamEntry = {
          spieler: player.id,
          saison: saisonId,
          team: player.hauptteam.id,
          tore: 0,
          spiele: 0,
          assists: 0,
          gelbe_karten: 0,
          rote_karten: 0,
          minuten_gespielt: 0,
          einsaetze_startelf: 0,
          einsaetze_einwechslung: 0
        };

        // Check if entry already exists
        const existingEntry = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
          filters: {
            spieler: player.id,
            saison: saisonId,
            team: player.hauptteam.id
          }
        });

        if (existingEntry.length === 0) {
          statisticsEntries.push(hauptteamEntry);
        }
      }

      // Create statistics entries for aushilfe teams
      if (player.aushilfe_teams && player.aushilfe_teams.length > 0) {
        for (const aushilfeTeam of player.aushilfe_teams) {
          const aushilfeEntry = {
            spieler: player.id,
            saison: saisonId,
            team: aushilfeTeam.id,
            tore: 0,
            spiele: 0,
            assists: 0,
            gelbe_karten: 0,
            rote_karten: 0,
            minuten_gespielt: 0,
            einsaetze_startelf: 0,
            einsaetze_einwechslung: 0
          };

          // Check if entry already exists
          const existingEntry = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
            filters: {
              spieler: player.id,
              saison: saisonId,
              team: aushilfeTeam.id
            }
          });

          if (existingEntry.length === 0) {
            statisticsEntries.push(aushilfeEntry);
          }
        }
      }
    }

    // Create all statistics entries
    const createdEntries = [];
    for (const entry of statisticsEntries) {
      const created = await strapi.entityService.create('api::spielerstatistik.spielerstatistik' as any, {
        data: entry
      });
      createdEntries.push(created);
    }

    return createdEntries;
  },

  /**
   * Get aggregated statistics for a player across all teams in a season
   */
  async getPlayerSeasonTotals(spielerId: number, saisonId: number) {
    const statistics: any = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
      filters: {
        spieler: spielerId,
        saison: saisonId
      },
      populate: ['team']
    });

    if (statistics.length === 0) {
      return null;
    }

    // Aggregate totals
    const totals = {
      spieler: spielerId,
      saison: saisonId,
      teams: statistics.map(stat => stat.team),
      tore: statistics.reduce((sum, stat) => sum + (stat.tore || 0), 0),
      spiele: statistics.reduce((sum, stat) => sum + (stat.spiele || 0), 0),
      assists: statistics.reduce((sum, stat) => sum + (stat.assists || 0), 0),
      gelbe_karten: statistics.reduce((sum, stat) => sum + (stat.gelbe_karten || 0), 0),
      rote_karten: statistics.reduce((sum, stat) => sum + (stat.rote_karten || 0), 0),
      minuten_gespielt: statistics.reduce((sum, stat) => sum + (stat.minuten_gespielt || 0), 0),
      einsaetze_startelf: statistics.reduce((sum, stat) => sum + (stat.einsaetze_startelf || 0), 0),
      einsaetze_einwechslung: statistics.reduce((sum, stat) => sum + (stat.einsaetze_einwechslung || 0), 0)
    };

    return totals;
  },

  /**
   * Get team statistics for a season (all players in the team)
   */
  async getTeamSeasonStatistics(teamId: number, saisonId: number) {
    const statistics: any = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
      filters: {
        team: teamId,
        saison: saisonId
      },
      populate: {
        spieler: {
          populate: ['mitglied']
        }
      },
      sort: [{ tore: 'desc' }, { assists: 'desc' }]
    });

    return statistics;
  },

  /**
   * Update statistics from match events
   */
  async updateFromMatchEvent(spielerId: number, teamId: number, saisonId: number, eventType: string, value: number = 1) {
    // Find the statistics entry
    const statisticsEntries: any = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
      filters: {
        spieler: spielerId,
        team: teamId,
        saison: saisonId
      }
    });

    if (statisticsEntries.length === 0) {
      // Create new statistics entry if it doesn't exist
      const newEntry = await strapi.entityService.create('api::spielerstatistik.spielerstatistik' as any, {
        data: {
          spieler: spielerId,
          team: teamId,
          saison: saisonId,
          tore: eventType === 'tor' ? value : 0,
          assists: eventType === 'assist' ? value : 0,
          gelbe_karten: eventType === 'gelbe_karte' ? value : 0,
          rote_karten: eventType === 'rote_karte' ? value : 0,
          spiele: eventType === 'spiel' ? value : 0,
          minuten_gespielt: eventType === 'minuten' ? value : 0,
          einsaetze_startelf: eventType === 'startelf' ? value : 0,
          einsaetze_einwechslung: eventType === 'einwechslung' ? value : 0
        }
      });
      return newEntry;
    }

    // Update existing entry
    const entry = statisticsEntries[0];
    const updateData: any = {};

    switch (eventType) {
      case 'tor':
        updateData.tore = (entry.tore || 0) + value;
        break;
      case 'assist':
        updateData.assists = (entry.assists || 0) + value;
        break;
      case 'gelbe_karte':
        updateData.gelbe_karten = (entry.gelbe_karten || 0) + value;
        break;
      case 'rote_karte':
        updateData.rote_karten = (entry.rote_karten || 0) + value;
        break;
      case 'spiel':
        updateData.spiele = (entry.spiele || 0) + value;
        break;
      case 'minuten':
        updateData.minuten_gespielt = (entry.minuten_gespielt || 0) + value;
        break;
      case 'startelf':
        updateData.einsaetze_startelf = (entry.einsaetze_startelf || 0) + value;
        break;
      case 'einwechslung':
        updateData.einsaetze_einwechslung = (entry.einsaetze_einwechslung || 0) + value;
        break;
    }

    const updatedEntry = await strapi.entityService.update('api::spielerstatistik.spielerstatistik' as any, entry.id, {
      data: updateData
    });

    return updatedEntry;
  },

  /**
   * Get top scorers for a season
   */
  async getTopScorers(saisonId: number, limit: number = 10) {
    const statistics: any = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
      filters: {
        saison: saisonId,
        tore: { $gt: 0 }
      },
      populate: {
        spieler: {
          populate: ['mitglied']
        },
        team: true
      },
      sort: [{ tore: 'desc' }, { assists: 'desc' }],
      limit
    });

    return statistics;
  }
}));