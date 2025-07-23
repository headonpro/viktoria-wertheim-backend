/**
 * Lifecycle hooks for mannschaft content type
 */

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    
    // Calculate tordifferenz if not provided
    if (data.tore_fuer !== undefined && data.tore_gegen !== undefined && data.tordifferenz === undefined) {
      data.tordifferenz = data.tore_fuer - data.tore_gegen;
    }
    
    // Ensure form_letzte_5 is an array
    if (!data.form_letzte_5 || !Array.isArray(data.form_letzte_5)) {
      data.form_letzte_5 = [];
    }
    
    // Set default trend if not provided
    if (!data.trend) {
      data.trend = 'gleich';
    }
    
    // Set default status if not provided
    if (!data.status) {
      data.status = 'aktiv';
    }
  },

  async beforeUpdate(event: any) {
    const { data } = event.params;
    
    // Calculate tordifferenz if tore_fuer or tore_gegen are updated
    if (data.tore_fuer !== undefined || data.tore_gegen !== undefined) {
      // Get current data to fill in missing values
      const currentData = await strapi.entityService.findOne(
        'api::mannschaft.mannschaft',
        event.params.where.id
      );
      
      const toreFuer = data.tore_fuer !== undefined ? data.tore_fuer : currentData.tore_fuer || 0;
      const toreGegen = data.tore_gegen !== undefined ? data.tore_gegen : currentData.tore_gegen || 0;
      
      data.tordifferenz = toreFuer - toreGegen;
    }
    
    // Ensure form_letzte_5 is an array if provided
    if (data.form_letzte_5 && !Array.isArray(data.form_letzte_5)) {
      data.form_letzte_5 = [];
    }
  },

  async afterCreate(event: any) {
    const { result } = event;
    
    // Log when a new mannschaft is created
    strapi.log.info(`New mannschaft created: ${result.name} in ${result.liga}`);
  },

  async afterUpdate(event: any) {
    const { result } = event;
    
    // Log when a mannschaft is updated
    strapi.log.info(`Mannschaft updated: ${result.name}`);
  }
};