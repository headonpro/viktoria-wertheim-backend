export default {
  /**
   * Called after user creation
   */
  async afterCreate(event: any) {
    const { result } = event;
    
    // Log user creation
    strapi.log.info(`New user created: ${result.username} (${result.email})`);
    
    // Set default display name if not provided
    if (!(result as any).displayName) {
      await strapi.entityService.update('plugin::users-permissions.user', result.id, {
        data: {
          displayName: result.username,
        } as any,
      });
    }
  },

  /**
   * Called before user update
   */
  async beforeUpdate(event: any) {
    const { data } = event.params;
    
    // Update last login time if this is a login event
    if (data.lastLogin === undefined) {
      data.lastLogin = new Date();
    }
  },

  /**
   * Called after user update
   */
  async afterUpdate(event: any) {
    const { result } = event;
    
    // Log significant profile changes
    if (event.params.data.displayName || event.params.data.email) {
      strapi.log.info(`User profile updated: ${result.username}`);
    }
  },

  /**
   * Called before user deletion
   */
  async beforeDelete(event: any) {
    const { where } = event.params;
    
    // Find the user being deleted
    const user = await strapi.entityService.findOne('plugin::users-permissions.user', where.id);
    
    if (user) {
      // Check if user is linked to a member record
      const member = await strapi.entityService.findMany('api::mitglied.mitglied', {
        filters: { website_user: { id: user.id } },
      });
      
      if (member.length > 0) {
        // Unlink member from user account
        await strapi.entityService.update('api::mitglied.mitglied', member[0].id, {
          data: {
            website_user: null,
          },
        });
        
        strapi.log.info(`Unlinked member ${member[0].vorname} ${member[0].nachname} from deleted user ${user.username}`);
      }
    }
  },
};