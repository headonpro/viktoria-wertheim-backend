/**
 * Simplified tabellen-eintrag lifecycle hooks
 */

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    
    // Basic table data validation
    const service = strapi.service('api::tabellen-eintrag.tabellen-eintrag');
    if (!service.validateTableData(data)) {
      throw new Error('Invalid table data: games played must equal sum of wins, draws, and losses');
    }
    
    // Calculate derived values
    data.tordifferenz = service.calculateGoalDifference(data.tore_fuer || 0, data.tore_gegen || 0);
    data.punkte = service.calculatePoints(data.siege || 0, data.unentschieden || 0);
  },

  async beforeUpdate(event: any) {
    const { data } = event.params;
    
    // Validate table data consistency if relevant fields are being updated
    if (data.spiele !== undefined || data.siege !== undefined || 
        data.unentschieden !== undefined || data.niederlagen !== undefined) {
      
      const currentEntry: any = await strapi.entityService.findOne('api::tabellen-eintrag.tabellen-eintrag' as any, event.params.where.id);
      const mergedData = { ...currentEntry, ...data };
      
      const service = strapi.service('api::tabellen-eintrag.tabellen-eintrag');
      if (!service.validateTableData(mergedData)) {
        throw new Error('Invalid table data: games played must equal sum of wins, draws, and losses');
      }
    }
    
    // Recalculate derived values if base values change
    if (data.tore_fuer !== undefined || data.tore_gegen !== undefined) {
      const currentEntry: any = await strapi.entityService.findOne('api::tabellen-eintrag.tabellen-eintrag' as any, event.params.where.id);
      const tore_fuer = data.tore_fuer !== undefined ? data.tore_fuer : currentEntry.tore_fuer;
      const tore_gegen = data.tore_gegen !== undefined ? data.tore_gegen : currentEntry.tore_gegen;
      
      const service = strapi.service('api::tabellen-eintrag.tabellen-eintrag');
      data.tordifferenz = service.calculateGoalDifference(tore_fuer, tore_gegen);
    }
    
    if (data.siege !== undefined || data.unentschieden !== undefined) {
      const currentEntry: any = await strapi.entityService.findOne('api::tabellen-eintrag.tabellen-eintrag' as any, event.params.where.id);
      const siege = data.siege !== undefined ? data.siege : currentEntry.siege;
      const unentschieden = data.unentschieden !== undefined ? data.unentschieden : currentEntry.unentschieden;
      
      const service = strapi.service('api::tabellen-eintrag.tabellen-eintrag');
      data.punkte = service.calculatePoints(siege, unentschieden);
    }
  }
};