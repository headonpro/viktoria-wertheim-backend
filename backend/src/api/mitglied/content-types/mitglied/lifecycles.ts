/**
 * Lifecycle hooks for mitglied content type
 */

export default {
  async beforeCreate(event: any) {
    const { data } = event.params;
    
    // Validate unique membership number
    if (data.mitgliedsnummer) {
      const existingMember = await strapi.entityService.findMany('api::mitglied.mitglied', {
        filters: { mitgliedsnummer: data.mitgliedsnummer }
      });
      
      if (existingMember && existingMember.length > 0) {
        throw new Error(`Mitgliedsnummer ${data.mitgliedsnummer} ist bereits vergeben`);
      }
    }
    
    // Validate website user is not already linked to another member
    if (data.website_user) {
      const existingMemberWithUser = await strapi.entityService.findMany('api::mitglied.mitglied', {
        filters: { website_user: data.website_user }
      });
      
      if (existingMemberWithUser && existingMemberWithUser.length > 0) {
        throw new Error('Dieser Website-Benutzer ist bereits mit einem anderen Mitglied verknüpft');
      }
    }
    
    // Set default membership number if not provided
    if (!data.mitgliedsnummer) {
      const lastMember = await strapi.entityService.findMany('api::mitglied.mitglied', {
        sort: { mitgliedsnummer: 'desc' },
        limit: 1
      });
      
      let nextNumber = 1;
      if (lastMember && lastMember.length > 0) {
        const lastNumber = parseInt(lastMember[0].mitgliedsnummer);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }
      
      data.mitgliedsnummer = nextNumber.toString().padStart(4, '0');
    }
  },

  async beforeUpdate(event: any) {
    const { data, where } = event.params;
    
    // Validate unique membership number (excluding current record)
    if (data.mitgliedsnummer) {
      const existingMember = await strapi.entityService.findMany('api::mitglied.mitglied', {
        filters: { 
          mitgliedsnummer: data.mitgliedsnummer,
          id: { $ne: where.id }
        }
      });
      
      if (existingMember && existingMember.length > 0) {
        throw new Error(`Mitgliedsnummer ${data.mitgliedsnummer} ist bereits vergeben`);
      }
    }
    
    // Validate website user is not already linked to another member
    if (data.website_user) {
      const existingMemberWithUser = await strapi.entityService.findMany('api::mitglied.mitglied', {
        filters: { 
          website_user: data.website_user,
          id: { $ne: where.id }
        }
      });
      
      if (existingMemberWithUser && existingMemberWithUser.length > 0) {
        throw new Error('Dieser Website-Benutzer ist bereits mit einem anderen Mitglied verknüpft');
      }
    }
  },

  async afterCreate(event: any) {
    const { result } = event;
    
    // Log when a new member is created
    strapi.log.info(`New member created: ${result.vorname} ${result.nachname} (${result.mitgliedsnummer})`);
  },

  async afterUpdate(event: any) {
    const { result } = event;
    
    // Log when a member is updated
    strapi.log.info(`Member updated: ${result.vorname} ${result.nachname} (${result.mitgliedsnummer})`);
  },

  async beforeDelete(event: any) {
    const { where } = event.params;
    
    // Check if member has associated player record
    const member: any = await strapi.entityService.findOne('api::mitglied.mitglied', where.id, {
      populate: ['spieler']
    });
    
    if (member?.spieler) {
      throw new Error('Mitglied kann nicht gelöscht werden, da es mit einem Spieler verknüpft ist. Bitte zuerst den Spieler löschen.');
    }
  }
};