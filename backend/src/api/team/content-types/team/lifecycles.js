module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Ensure required fields are present
    if (!data.name) {
      throw new Error('Team name is required');
    }
    
    // Log creation attempt
    strapi.log.info(`Creating team: ${data.name}`);
  },

  async afterCreate(event) {
    const { result } = event;
    
    // Log successful creation
    strapi.log.info(`Team ${result.id} (${result.name}) created successfully`);
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    
    // Log update attempt
    if (data.name) {
      strapi.log.info(`Updating team ${where.id} name to: ${data.name}`);
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    
    // Log successful update
    strapi.log.info(`Team ${result.id} (${result.name}) updated successfully`);
  },

  async beforeDelete(event) {
    const { where } = event.params;
    
    // Check for related spieler before deletion (spiele removed since content type was deleted)
    const team = await strapi.entityService.findOne('api::team.team', where.id, {
      populate: ['spieler', 'aushilfe_spieler']
    });
    
    if (team.spieler && team.spieler.length > 0) {
      strapi.log.warn(`Deleting team ${where.id} with ${team.spieler.length} related spieler`);
    }
    
    if (team.aushilfe_spieler && team.aushilfe_spieler.length > 0) {
      strapi.log.warn(`Deleting team ${where.id} with ${team.aushilfe_spieler.length} aushilfe spieler`);
    }
    
    // Note: spiele check removed since Spiel content type was deleted
  }
};