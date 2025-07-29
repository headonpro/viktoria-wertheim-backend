/**
 * club lifecycles
 */

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Validate viktoria_team_mapping uniqueness
    if (data.club_typ === 'viktoria_verein' && data.viktoria_team_mapping) {
      const existingClubs = await strapi.entityService.findMany('api::club.club', {
        filters: {
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: data.viktoria_team_mapping
        }
      });
      
      if (existingClubs.length > 0) {
        throw new Error(`Team mapping ${data.viktoria_team_mapping} is already used by another Viktoria club`);
      }
    }
    
    // Ensure viktoria clubs have team mapping
    if (data.club_typ === 'viktoria_verein' && !data.viktoria_team_mapping) {
      throw new Error('Viktoria clubs must have a team mapping');
    }
    
    // Ensure non-viktoria clubs don't have team mapping
    if (data.club_typ === 'gegner_verein' && data.viktoria_team_mapping) {
      data.viktoria_team_mapping = null;
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    
    // Validate viktoria_team_mapping uniqueness on update
    if (data.club_typ === 'viktoria_verein' && data.viktoria_team_mapping) {
      const existingClubs = await strapi.entityService.findMany('api::club.club', {
        filters: {
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: data.viktoria_team_mapping,
          id: { $ne: where.id }
        }
      });
      
      if (existingClubs.length > 0) {
        throw new Error(`Team mapping ${data.viktoria_team_mapping} is already used by another Viktoria club`);
      }
    }
    
    // Ensure viktoria clubs have team mapping
    if (data.club_typ === 'viktoria_verein' && data.viktoria_team_mapping === null) {
      throw new Error('Viktoria clubs must have a team mapping');
    }
    
    // Ensure non-viktoria clubs don't have team mapping
    if (data.club_typ === 'gegner_verein' && data.viktoria_team_mapping) {
      data.viktoria_team_mapping = null;
    }
  },

  async afterCreate(event) {
    const { result } = event;
    
    strapi.log.info(`Club created: ${result.name} (${result.club_typ})`);
    
    // Log viktoria team mapping
    if (result.club_typ === 'viktoria_verein' && result.viktoria_team_mapping) {
      strapi.log.info(`Viktoria club ${result.name} mapped to ${result.viktoria_team_mapping}`);
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    
    strapi.log.info(`Club updated: ${result.name} (${result.club_typ})`);
  }
};