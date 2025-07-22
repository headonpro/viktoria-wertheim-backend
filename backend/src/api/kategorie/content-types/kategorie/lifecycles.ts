/**
 * kategorie lifecycles
 */

export default {
  async afterCreate(event) {
    const { result } = event;
    
    // Log category creation
    strapi.log.info(`Created category: ${result.name}`);
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    
    // Validate color format if provided
    if (data.farbe && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(data.farbe)) {
      throw new Error('Invalid color format. Use hex format like #FF0000 or #F00');
    }
  },

  async beforeCreate(event) {
    const { data } = event.params;
    
    // Validate color format if provided
    if (data.farbe && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(data.farbe)) {
      throw new Error('Invalid color format. Use hex format like #FF0000 or #F00');
    }
    
    // Set default order if not provided
    if (data.reihenfolge === undefined || data.reihenfolge === null) {
      const maxOrder = await strapi.entityService.findMany('api::kategorie.kategorie', {
        sort: { reihenfolge: 'desc' },
        limit: 1,
      });
      
      data.reihenfolge = maxOrder.length > 0 ? maxOrder[0].reihenfolge + 1 : 1;
    }
  }
};