/**
 * Lifecycle hooks for team content type
 */

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    
    // Validate that team is assigned to a league that belongs to the same club and season
    if (data.liga && data.club && data.saison) {
      const liga: any = await strapi.entityService.findOne('api::liga.liga', data.liga, {
        populate: ['clubs', 'saison']
      });
      
      if (liga) {
        // Check if the club is part of this league
        const clubInLiga = liga.clubs?.some((club: any) => club.id === data.club);
        if (!clubInLiga) {
          throw new Error('Team cannot be assigned to a league that does not include their club');
        }
        
        // Check if the league belongs to the same season
        if (liga.saison?.id !== data.saison) {
          throw new Error('Team season must match the league season');
        }
      }
    }
  },

  async beforeUpdate(event: any) {
    const { data } = event.params;
    
    // Same validation for updates
    if (data.liga && data.club && data.saison) {
      const liga: any = await strapi.entityService.findOne('api::liga.liga', data.liga, {
        populate: ['clubs', 'saison']
      });
      
      if (liga) {
        // Check if the club is part of this league
        const clubInLiga = liga.clubs?.some((club: any) => club.id === data.club);
        if (!clubInLiga) {
          throw new Error('Team cannot be assigned to a league that does not include their club');
        }
        
        // Check if the league belongs to the same season
        if (liga.saison?.id !== data.saison) {
          throw new Error('Team season must match the league season');
        }
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