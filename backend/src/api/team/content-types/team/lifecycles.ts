/**
 * Team lifecycle hooks with safe validation
 */

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    
    try {
      // Only validate if both liga and saison are provided
      if (data.liga && data.saison) {
        const liga: any = await strapi.entityService.findOne('api::liga.liga', data.liga, {
          populate: ['saison'] as any
        });
        
        // Only throw error if liga exists and has a different saison
        if (liga && liga.saison && liga.saison.id !== data.saison) {
          strapi.log.warn('Team-Saison validation failed', { 
            teamName: data.name,
            ligaId: data.liga, 
            teamSaison: data.saison, 
            ligaSaison: liga.saison.id 
          });
          throw new Error('Team-Saison muss mit der Liga-Saison übereinstimmen');
        }
      }
      
      strapi.log.info(`Creating team: ${data.name || 'Unknown'}`);
    } catch (error) {
      strapi.log.error('Team beforeCreate error:', error.message);
      throw error;
    }
  },

  async beforeUpdate(event: any) {
    const { data, where } = event.params;
    
    try {
      // Only validate if both liga and saison are being updated
      if (data.liga && data.saison) {
        const liga: any = await strapi.entityService.findOne('api::liga.liga', data.liga, {
          populate: ['saison'] as any
        });
        
        // Only throw error if liga exists and has a different saison
        if (liga && liga.saison && liga.saison.id !== data.saison) {
          strapi.log.warn('Team-Saison validation failed on update', { 
            teamId: where.id,
            ligaId: data.liga, 
            teamSaison: data.saison, 
            ligaSaison: liga.saison.id 
          });
          throw new Error('Team-Saison muss mit der Liga-Saison übereinstimmen');
        }
      }
      
      strapi.log.info(`Updating team ${where.id}`, { 
        updatedFields: Object.keys(data) 
      });
    } catch (error) {
      strapi.log.error('Team beforeUpdate error:', error.message);
      // Don't throw the error for simple field updates
      if (!error.message.includes('Team-Saison')) {
        strapi.log.warn('Ignoring non-critical update error');
        return;
      }
      throw error;
    }
  },

  async afterCreate(event: any) {
    const { result } = event;
    strapi.log.info(`Team ${result.id} (${result.name}) created successfully`);
  },

  async afterUpdate(event: any) {
    const { result } = event;
    strapi.log.info(`Team ${result.id} (${result.name}) updated successfully`);
  }
};