/**
 * tabellen-eintrag service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::tabellen-eintrag.tabellen-eintrag' as any, ({ strapi }) => ({
  
  /**
   * Calculate and update table positions for a specific league
   */
  async updateTablePositions(ligaId: number) {
    try {
      // Get all table entries for the league
      const entries: any = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag' as any, {
        filters: { liga: ligaId },
        populate: ['liga', 'club']
      });

      if (!entries || entries.length === 0) {
        return;
      }

      // Sort entries by points (desc), goal difference (desc), goals for (desc)
      const sortedEntries = entries.sort((a: any, b: any) => {
        // Primary: Points (descending)
        if (b.punkte !== a.punkte) {
          return b.punkte - a.punkte;
        }
        
        // Secondary: Goal difference (descending)
        if (b.tordifferenz !== a.tordifferenz) {
          return b.tordifferenz - a.tordifferenz;
        }
        
        // Tertiary: Goals for (descending)
        return b.tore_fuer - a.tore_fuer;
      });

      // Update positions
      for (let i = 0; i < sortedEntries.length; i++) {
        const entry = sortedEntries[i];
        const newPosition = i + 1;
        
        if (entry.platz !== newPosition) {
          await strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag' as any, entry.id, {
            data: { platz: newPosition }
          });
        }
      }

      return sortedEntries;
    } catch (error) {
      strapi.log.error('Error updating table positions:', error);
      throw error;
    }
  },

  /**
   * Calculate goal difference for a table entry
   */
  calculateGoalDifference(tore_fuer: number, tore_gegen: number): number {
    return tore_fuer - tore_gegen;
  },

  /**
   * Calculate points based on wins, draws, losses
   */
  calculatePoints(siege: number, unentschieden: number): number {
    return (siege * 3) + (unentschieden * 1);
  },

  /**
   * Validate table data consistency
   */
  validateTableData(data: any): boolean {
    const { spiele, siege, unentschieden, niederlagen, tore_fuer, tore_gegen } = data;
    
    // Check if games played equals sum of wins, draws, losses
    if (spiele !== (siege + unentschieden + niederlagen)) {
      return false;
    }
    
    // Check if goals are non-negative
    if (tore_fuer < 0 || tore_gegen < 0) {
      return false;
    }
    
    // Check if match results are non-negative
    if (siege < 0 || unentschieden < 0 || niederlagen < 0) {
      return false;
    }
    
    return true;
  },

  /**
   * Update form tracking (last 5 matches)
   */
  updateForm(currentForm: string[], newResult: 'S' | 'U' | 'N'): string[] {
    const form = currentForm || [];
    form.push(newResult);
    
    // Keep only last 5 results
    if (form.length > 5) {
      form.shift();
    }
    
    return form;
  },

  /**
   * Get complete league table sorted by position
   */
  async getLeagueTable(ligaId: number) {
    try {
      const entries: any = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag' as any, {
        filters: { liga: ligaId },
        populate: ['liga', 'club'],
        sort: 'platz:asc'
      });

      return entries;
    } catch (error) {
      strapi.log.error('Error fetching league table:', error);
      throw error;
    }
  },

  /**
   * Calculate form points (last 5 matches)
   */
  calculateFormPoints(form: string[]): number {
    if (!form || !Array.isArray(form)) return 0;
    
    return form.reduce((points, result) => {
      switch (result) {
        case 'S': return points + 3; // Win = 3 points
        case 'U': return points + 1; // Draw = 1 point
        case 'N': return points + 0; // Loss = 0 points
        default: return points;
      }
    }, 0);
  },

  /**
   * Get table statistics for a specific club
   */
  async getClubTableStats(ligaId: number, clubId: number) {
    try {
      const entry = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag' as any, {
        filters: { 
          liga: ligaId,
          club: clubId 
        },
        populate: ['liga', 'club']
      });

      if (!entry || entry.length === 0) {
        return null;
      }

      const tableEntry = entry[0];
      
      // Calculate additional statistics
      const winPercentage = tableEntry.spiele > 0 ? (tableEntry.siege / tableEntry.spiele * 100).toFixed(1) : '0.0';
      const pointsPerGame = tableEntry.spiele > 0 ? (tableEntry.punkte / tableEntry.spiele).toFixed(2) : '0.00';
      const formPoints = this.calculateFormPoints(tableEntry.form_letzte_5);

      return {
        ...tableEntry,
        statistics: {
          winPercentage: parseFloat(winPercentage),
          pointsPerGame: parseFloat(pointsPerGame),
          formPoints,
          goalsPerGame: tableEntry.spiele > 0 ? (tableEntry.tore_fuer / tableEntry.spiele).toFixed(2) : '0.00',
          goalsConcededPerGame: tableEntry.spiele > 0 ? (tableEntry.tore_gegen / tableEntry.spiele).toFixed(2) : '0.00'
        }
      };
    } catch (error) {
      strapi.log.error('Error fetching club table stats:', error);
      throw error;
    }
  },

  /**
   * Initialize table entries for all clubs in a league
   */
  async initializeLeagueTable(ligaId: number) {
    try {
      // Get the league with all clubs
      const liga: any = await strapi.entityService.findOne('api::liga.liga' as any, ligaId, {
        populate: ['clubs']
      });

      if (!liga || !liga.clubs) {
        throw new Error('League not found or has no clubs');
      }

      // Create table entries for each club
      for (const club of liga.clubs) {
        const existingEntry = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag' as any, {
          filters: { 
            liga: ligaId,
            club: club.id 
          }
        });

        if (!existingEntry || existingEntry.length === 0) {
          await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag' as any, {
            data: {
              liga: ligaId,
              club: club.id,
              platz: 1,
              spiele: 0,
              siege: 0,
              unentschieden: 0,
              niederlagen: 0,
              tore_fuer: 0,
              tore_gegen: 0,
              tordifferenz: 0,
              punkte: 0,
              form_letzte_5: []
            }
          });
        }
      }

      // Update positions after initialization
      await this.updateTablePositions(ligaId);

      strapi.log.info(`League table initialized for league ${ligaId}`);
      return await this.getLeagueTable(ligaId);
    } catch (error) {
      strapi.log.error('Error initializing league table:', error);
      throw error;
    }
  },

  /**
   * Create or update table entry for a club in a league
   */
  async createOrUpdateEntry(ligaId: number, clubId: number, data: any) {
    try {
      // Check if entry already exists
      const existingEntry = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag' as any, {
        filters: { 
          liga: ligaId,
          club: clubId 
        }
      });

      // Validate data
      if (!this.validateTableData(data)) {
        throw new Error('Invalid table data provided');
      }

      // Calculate derived values
      const calculatedData = {
        ...data,
        tordifferenz: this.calculateGoalDifference(data.tore_fuer, data.tore_gegen),
        punkte: this.calculatePoints(data.siege, data.unentschieden)
      };

      let result;
      if (existingEntry && existingEntry.length > 0) {
        // Update existing entry
        result = await strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag' as any, existingEntry[0].id, {
          data: calculatedData
        });
      } else {
        // Create new entry
        result = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag' as any, {
          data: {
            ...calculatedData,
            liga: ligaId,
            club: clubId
          }
        });
      }

      // Update table positions after any change
      await this.updateTablePositions(ligaId);

      return result;
    } catch (error) {
      strapi.log.error('Error creating/updating table entry:', error);
      throw error;
    }
  }
}));