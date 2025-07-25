/**
 * tabellen-eintrag service - Ultra-simplified version
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::tabellen-eintrag.tabellen-eintrag', ({ strapi }) => ({
  
  /**
   * Get complete league table sorted by position
   */
  async getLeagueTable(ligaId: number) {
    return await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
      filters: { liga: { id: ligaId } },
      populate: { liga: true, team: true },
      sort: 'platz:asc'
    });
  },

  /**
   * Find table entries with basic population
   */
  async findWithPopulate(params = {}) {
    return await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
      ...params,
      populate: { liga: true, team: true },
      sort: 'platz:asc'
    });
  },

  /**
   * Validate table data consistency
   */
  validateTableData(data: any): boolean {
    const { spiele, siege, unentschieden, niederlagen } = data;
    if (spiele !== undefined && siege !== undefined && unentschieden !== undefined && niederlagen !== undefined) {
      return spiele === (siege + unentschieden + niederlagen);
    }
    return true; // Skip validation if not all fields are present
  },

  /**
   * Calculate goal difference
   */
  calculateGoalDifference(tore_fuer: number, tore_gegen: number): number {
    return tore_fuer - tore_gegen;
  },

  /**
   * Calculate points (3 for win, 1 for draw)
   */
  calculatePoints(siege: number, unentschieden: number): number {
    return (siege * 3) + (unentschieden * 1);
  }

}));