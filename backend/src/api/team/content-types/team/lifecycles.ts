/**
 * Lifecycle hooks for team content type
 */

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    
    // Set default values for enum fields if missing or invalid
    if (!data.status || !['aktiv', 'inaktiv', 'pausiert'].includes(data.status)) {
      data.status = 'aktiv';
    }
    if (!data.trend || !['steigend', 'gleich', 'fallend'].includes(data.trend)) {
      data.trend = 'gleich';
    }
    
    // Validate that team is assigned to a league that belongs to the same club and season
    if (data.liga && data.club && data.saison) {
      try {
        const liga: any = await strapi.entityService.findOne('api::liga.liga', data.liga, {
          populate: ['clubs', 'saison'] as any
        });
        
        if (liga) {
          // Check if the club is part of this league
          const clubInLiga = liga.clubs?.some((club: any) => club.id === data.club);
          if (!clubInLiga) {
            throw new Error('Team kann nicht einer Liga zugeordnet werden, die ihren Verein nicht enthält');
          }
          
          // Check if the league belongs to the same season
          if (liga.saison?.id !== data.saison) {
            throw new Error('Team-Saison muss mit der Liga-Saison übereinstimmen');
          }
        }
      } catch (error) {
        // Provide more specific error messages
        if (error.message.includes('Liga')) {
          throw new Error(`Liga-Validierung fehlgeschlagen: ${error.message}`);
        }
        throw error;
      }
    }
  },

  async beforeUpdate(event: any) {
    const { data, where } = event.params;
    
    // Get current data for fallback values
    const currentData = await strapi.entityService.findOne('api::team.team', where.id);
    
    // Set default values for enum fields if missing or invalid
    if (!data.status || !['aktiv', 'inaktiv', 'pausiert'].includes(data.status)) {
      data.status = currentData?.status || 'aktiv';
    }
    if (!data.trend || !['steigend', 'gleich', 'fallend'].includes(data.trend)) {
      data.trend = currentData?.trend || 'gleich';
    }
    
    // Same validation for updates
    if (data.liga && data.club && data.saison) {
      try {
        const liga: any = await strapi.entityService.findOne('api::liga.liga', data.liga, {
          populate: ['clubs', 'saison'] as any
        });
        
        if (liga) {
          // Check if the club is part of this league
          const clubInLiga = liga.clubs?.some((club: any) => club.id === data.club);
          if (!clubInLiga) {
            throw new Error('Team kann nicht einer Liga zugeordnet werden, die ihren Verein nicht enthält');
          }
          
          // Check if the league belongs to the same season
          if (liga.saison?.id !== data.saison) {
            throw new Error('Team-Saison muss mit der Liga-Saison übereinstimmen');
          }
        }
      } catch (error) {
        // Provide more specific error messages
        if (error.message.includes('Liga')) {
          throw new Error(`Liga-Validierung fehlgeschlagen: ${error.message}`);
        }
        throw error;
      }
    }
  },

  async afterCreate(event: any) {
    const { result } = event;
    
    // Log when a new team is created
    strapi.log.info(`New team created: ${result.name} for club ${result.club}`);
  },

  async afterUpdate(event: any) {
    const { result } = event;
    
    // Log when a team is updated
    strapi.log.info(`Team updated: ${result.name}`);
  }
};