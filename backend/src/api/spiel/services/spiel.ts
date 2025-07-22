/**
 * spiel service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::spiel.spiel', ({ strapi }) => ({
  /**
   * Find matches with populated relationships
   */
  async findWithPopulate(params = {}) {
    return await strapi.entityService.findMany('api::spiel.spiel', {
      ...params,
      populate: ['heimclub', 'auswaertsclub', 'unser_team', 'liga', 'saison'] as any
    });
  },

  /**
   * Find a single match with populated relationships
   */
  async findOneWithPopulate(id: number, params = {}) {
    return await strapi.entityService.findOne('api::spiel.spiel', id, {
      ...params,
      populate: ['heimclub', 'auswaertsclub', 'unser_team', 'liga', 'saison'] as any
    });
  },

  /**
   * Get matches for a specific team and season
   */
  async findByTeamAndSeason(teamId: number, saisonId: number, params: any = {}) {
    return await this.findWithPopulate({
      ...params,
      filters: {
        unser_team: teamId,
        saison: saisonId,
        ...(params.filters || {})
      },
      sort: { datum: 'asc' }
    });
  },

  /**
   * Get upcoming matches for a team
   */
  async findUpcoming(teamId?: number, limit = 5) {
    const filters: any = {
      datum: {
        $gte: new Date().toISOString()
      },
      status: {
        $in: ['geplant', 'laufend']
      }
    };

    if (teamId) {
      filters.unser_team = teamId;
    }

    return await this.findWithPopulate({
      filters,
      sort: { datum: 'asc' },
      pagination: { limit }
    });
  },

  /**
   * Get recent completed matches
   */
  async findRecent(teamId?: number, limit = 5) {
    const filters: any = {
      status: 'beendet'
    };

    if (teamId) {
      filters.unser_team = teamId;
    }

    return await this.findWithPopulate({
      filters,
      sort: { datum: 'desc' },
      pagination: { limit }
    });
  },

  /**
   * Validate match event data structure
   */
  validateMatchEvents(events: any) {
    // This validation is also in lifecycles, but can be called directly
    const { torschuetzen = [], karten = [], wechsel = [] } = events;
    
    // Validate goals
    torschuetzen.forEach((goal: any, index: number) => {
      if (!goal.spieler_id || !goal.minute) {
        throw new Error(`Invalid goal data at index ${index}`);
      }
    });

    // Validate cards
    karten.forEach((card: any, index: number) => {
      if (!card.spieler_id || !card.minute || !card.typ) {
        throw new Error(`Invalid card data at index ${index}`);
      }
    });

    // Validate substitutions
    wechsel.forEach((sub: any, index: number) => {
      if (!sub.raus_id || !sub.rein_id || !sub.minute) {
        throw new Error(`Invalid substitution data at index ${index}`);
      }
    });

    return true;
  },

  /**
   * Generate match timeline from events with player information
   */
  async generateTimeline(match: any) {
    const timeline = [];
    
    // Add goals to timeline with player information
    if (match.torschuetzen && Array.isArray(match.torschuetzen)) {
      for (const goal of match.torschuetzen) {
        const player = await strapi.entityService.findOne('api::spieler.spieler', goal.spieler_id, {
          populate: ['mitglied']
        });
        
        let assistPlayer = null;
        if (goal.assist_spieler_id) {
          assistPlayer = await strapi.entityService.findOne('api::spieler.spieler', goal.assist_spieler_id, {
            populate: ['mitglied']
          });
        }

        timeline.push({
          minute: goal.minute,
          type: 'goal',
          subtype: goal.typ || 'tor',
          player: player ? {
            id: player.id,
            name: `${player.vorname} ${player.nachname}`,
            rueckennummer: player.rueckennummer
          } : null,
          assistPlayer: assistPlayer ? {
            id: assistPlayer.id,
            name: `${assistPlayer.vorname} ${assistPlayer.nachname}`,
            rueckennummer: assistPlayer.rueckennummer
          } : null,
          data: goal
        });
      }
    }

    // Add cards to timeline with player information
    if (match.karten && Array.isArray(match.karten)) {
      for (const card of match.karten) {
        const player = await strapi.entityService.findOne('api::spieler.spieler', card.spieler_id, {
          populate: ['mitglied']
        });

        timeline.push({
          minute: card.minute,
          type: 'card',
          subtype: card.typ,
          player: player ? {
            id: player.id,
            name: `${player.vorname} ${player.nachname}`,
            rueckennummer: player.rueckennummer
          } : null,
          reason: card.grund,
          data: card
        });
      }
    }

    // Add substitutions to timeline with player information
    if (match.wechsel && Array.isArray(match.wechsel)) {
      for (const sub of match.wechsel) {
        const playerOut = await strapi.entityService.findOne('api::spieler.spieler', sub.raus_id, {
          populate: ['mitglied']
        });
        
        const playerIn = await strapi.entityService.findOne('api::spieler.spieler', sub.rein_id, {
          populate: ['mitglied']
        });

        timeline.push({
          minute: sub.minute,
          type: 'substitution',
          playerOut: playerOut ? {
            id: playerOut.id,
            name: `${playerOut.vorname} ${playerOut.nachname}`,
            rueckennummer: playerOut.rueckennummer
          } : null,
          playerIn: playerIn ? {
            id: playerIn.id,
            name: `${playerIn.vorname} ${playerIn.nachname}`,
            rueckennummer: playerIn.rueckennummer
          } : null,
          data: sub
        });
      }
    }

    // Sort by minute
    return timeline.sort((a, b) => a.minute - b.minute);
  },

  /**
   * Get match statistics summary
   */
  async getMatchStatistics(matchId: number) {
    const match: any = await this.findOneWithPopulate(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }

    const torschuetzen = Array.isArray(match.torschuetzen) ? match.torschuetzen : [];
    const karten = Array.isArray(match.karten) ? match.karten : [];
    const wechsel = Array.isArray(match.wechsel) ? match.wechsel : [];

    const stats = {
      goals: {
        total: torschuetzen.length,
        byType: {} as any,
        byPlayer: {} as any
      },
      cards: {
        yellow: karten.filter((card: any) => card.typ === 'gelb').length,
        red: karten.filter((card: any) => card.typ === 'rot' || card.typ === 'gelb-rot').length,
        byPlayer: {} as any
      },
      substitutions: {
        total: wechsel.length
      }
    };

    // Aggregate goal statistics
    torschuetzen.forEach((goal: any) => {
      const type = goal.typ || 'tor';
      stats.goals.byType[type] = (stats.goals.byType[type] || 0) + 1;
      stats.goals.byPlayer[goal.spieler_id] = (stats.goals.byPlayer[goal.spieler_id] || 0) + 1;
    });

    // Aggregate card statistics
    karten.forEach((card: any) => {
      stats.cards.byPlayer[card.spieler_id] = stats.cards.byPlayer[card.spieler_id] || [];
      stats.cards.byPlayer[card.spieler_id].push(card.typ);
    });

    return stats;
  },

  /**
   * Validate and process match events before saving
   */
  async processMatchEvents(matchData: any) {
    // Validate event structures
    this.validateMatchEvents(matchData);

    // Additional processing can be added here
    // For example, calculating derived statistics or validating business rules

    return {
      torschuetzen: matchData.torschuetzen || [],
      karten: matchData.karten || [],
      wechsel: matchData.wechsel || []
    };
  }
}));