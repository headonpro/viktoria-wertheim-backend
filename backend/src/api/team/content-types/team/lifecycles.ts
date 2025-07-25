/**
 * Simplified team lifecycle hooks
 */

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    
    // Basic validation: ensure team is assigned to a league that belongs to the same season
    if (data.liga && data.saison) {
      const liga: any = await strapi.entityService.findOne('api::liga.liga', data.liga, {
        populate: ['saison'] as any
      });
      
      if (liga && liga.saison?.id !== data.saison) {
        throw new Error('Team-Saison muss mit der Liga-Saison übereinstimmen');
      }
    }
  },

  async beforeUpdate(event: any) {
    const { data } = event.params;
    
    // Same basic validation for updates
    if (data.liga && data.saison) {
      const liga: any = await strapi.entityService.findOne('api::liga.liga', data.liga, {
        populate: ['saison'] as any
      });
      
      if (liga && liga.saison?.id !== data.saison) {
        throw new Error('Team-Saison muss mit der Liga-Saison übereinstimmen');
      }
    }
  }
};