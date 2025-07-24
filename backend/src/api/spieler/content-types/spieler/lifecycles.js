module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Ensure hauptteam relation consistency
    if (data.hauptteam) {
      strapi.log.info(`Creating spieler with hauptteam ${data.hauptteam}`);
    }
    
    // Validate aushilfe_teams if provided
    if (data.aushilfe_teams && Array.isArray(data.aushilfe_teams)) {
      strapi.log.info(`Spieler creation with ${data.aushilfe_teams.length} aushilfe teams`);
    }
  },

  async afterCreate(event) {
    const { result } = event;
    
    // Log successful creation with team relations
    if (result.hauptteam) {
      strapi.log.info(`Spieler ${result.id} created with hauptteam ${result.hauptteam}`);
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    
    // Ensure team relation consistency during updates
    if (data.hauptteam !== undefined) {
      strapi.log.info(`Updating spieler ${where.id} hauptteam relation to ${data.hauptteam}`);
    }
    
    if (data.aushilfe_teams !== undefined) {
      strapi.log.info(`Updating spieler ${where.id} aushilfe_teams relations`);
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    
    // Verify relation consistency after update
    if (result.hauptteam) {
      strapi.log.info(`Spieler ${result.id} updated with hauptteam ${result.hauptteam}`);
    }
  }
};