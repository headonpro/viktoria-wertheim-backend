/**
 * mannschaft service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::mannschaft.mannschaft', ({ strapi }) => ({
  /**
   * Calculate form array from recent games for a mannschaft
   * @param mannschaftId - ID of the mannschaft
   * @param limit - Number of recent games to consider (default: 5)
   * @returns Promise<('S' | 'U' | 'N')[]> - Form array
   */
  async calculateFormFromGames(mannschaftId: number, limit: number = 5): Promise<('S' | 'U' | 'N')[]> {
    try {
      // Get recent games for this mannschaft
      const games = await strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          unsere_mannschaft: { id: mannschaftId },
          status: 'beendet'
        },
        sort: { datum: 'desc' },
        limit,
        populate: ['unsere_mannschaft', 'heimclub', 'auswaertsclub']
      });

      const form: ('S' | 'U' | 'N')[] = [];

      for (const game of games) {
        if (game.tore_heim !== null && game.tore_auswaerts !== null) {
          // Determine our goals and opponent goals based on whether we're home or away
          const unsereGore = game.ist_heimspiel ? game.tore_heim : game.tore_auswaerts;
          const gegnerTore = game.ist_heimspiel ? game.tore_auswaerts : game.tore_heim;
          
          if (unsereGore > gegnerTore) {
            form.push('S'); // Sieg
          } else if (unsereGore === gegnerTore) {
            form.push('U'); // Unentschieden
          } else {
            form.push('N'); // Niederlage
          }
        }
      }

      return form.reverse(); // Reverse to show oldest first
    } catch (error) {
      strapi.log.error('Error calculating form from games:', error);
      return [];
    }
  },

  /**
   * Calculate trend based on recent performance
   * @param mannschaftId - ID of the mannschaft
   * @returns Promise<'steigend' | 'gleich' | 'fallend'> - Trend
   */
  async calculateTrend(mannschaftId: number): Promise<'steigend' | 'gleich' | 'fallend'> {
    try {
      const form = await this.calculateFormFromGames(mannschaftId, 5);
      
      if (form.length < 3) {
        return 'gleich'; // Not enough data
      }

      // Calculate points for recent games (3 for win, 1 for draw, 0 for loss)
      const recentPoints = form.slice(-3).reduce((total, result) => {
        switch (result) {
          case 'S': return total + 3;
          case 'U': return total + 1;
          case 'N': return total + 0;
          default: return total;
        }
      }, 0);

      const olderPoints = form.slice(0, -3).reduce((total, result) => {
        switch (result) {
          case 'S': return total + 3;
          case 'U': return total + 1;
          case 'N': return total + 0;
          default: return total;
        }
      }, 0);

      const recentAverage = recentPoints / 3;
      const olderAverage = form.length > 3 ? olderPoints / (form.length - 3) : recentAverage;

      if (recentAverage > olderAverage + 0.5) {
        return 'steigend';
      } else if (recentAverage < olderAverage - 0.5) {
        return 'fallend';
      } else {
        return 'gleich';
      }
    } catch (error) {
      strapi.log.error('Error calculating trend:', error);
      return 'gleich';
    }
  },

  /**
   * Update mannschaft statistics from games
   * @param mannschaftId - ID of the mannschaft
   */
  async updateStatisticsFromGames(mannschaftId: number): Promise<void> {
    try {
      // Get all completed games for this mannschaft
      const games = await strapi.entityService.findMany('api::spiel.spiel', {
        filters: {
          unsere_mannschaft: { id: mannschaftId },
          status: 'beendet'
        },
        populate: ['unsere_mannschaft', 'heimclub', 'auswaertsclub']
      });

      let siege = 0;
      let unentschieden = 0;
      let niederlagen = 0;
      let toreFuer = 0;
      let toreGegen = 0;
      let punkte = 0;

      for (const game of games) {
        if (game.tore_heim !== null && game.tore_auswaerts !== null) {
          // Determine our goals and opponent goals based on whether we're home or away
          const unsereGore = game.ist_heimspiel ? game.tore_heim : game.tore_auswaerts;
          const gegnerTore = game.ist_heimspiel ? game.tore_auswaerts : game.tore_heim;
          
          toreFuer += unsereGore;
          toreGegen += gegnerTore;

          if (unsereGore > gegnerTore) {
            siege++;
            punkte += 3;
          } else if (unsereGore === gegnerTore) {
            unentschieden++;
            punkte += 1;
          } else {
            niederlagen++;
          }
        }
      }

      const form = await this.calculateFormFromGames(mannschaftId);
      const trend = await this.calculateTrend(mannschaftId);

      // Update the mannschaft with calculated statistics
      await strapi.entityService.update('api::mannschaft.mannschaft', mannschaftId, {
        data: {
          spiele_gesamt: games.length,
          siege,
          unentschieden,
          niederlagen,
          tore_fuer: toreFuer,
          tore_gegen: toreGegen,
          tordifferenz: toreFuer - toreGegen,
          punkte,
          form_letzte_5: form,
          trend
        }
      });

      strapi.log.info(`Updated statistics for mannschaft ${mannschaftId}`);
    } catch (error) {
      strapi.log.error('Error updating mannschaft statistics:', error);
      throw error;
    }
  }
}));