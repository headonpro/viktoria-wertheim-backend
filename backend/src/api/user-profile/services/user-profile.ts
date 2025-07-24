import type { Core } from '@strapi/strapi';

/**
 * User profile service for handling profile-specific operations
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Upload and set user avatar
   */
  async uploadAvatar(userId: number, file: any) {
    try {
      // Upload file using Strapi's upload service
      const uploadService = strapi.plugin('upload').service('upload');
      const uploadedFiles = await uploadService.upload({
        data: {
          refId: userId,
          ref: 'plugin::users-permissions.user',
          field: 'avatar',
        },
        files: file,
      });

      // Update user with avatar
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: {
          avatar: uploadedFiles[0].id,
        } as any,
      });

      return updatedUser;
    } catch (error) {
      strapi.log.error('Error uploading avatar:', error);
      throw error;
    }
  },

  /**
   * Remove user avatar
   */
  async removeAvatar(userId: number) {
    try {
      // Get current user with avatar
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: [],
      });

      if ((user as any).avatar) {
        // Delete the file
        await strapi.plugin('upload').service('upload').remove((user as any).avatar);
      }

      // Update user to remove avatar reference
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: {
          avatar: null,
        } as any,
      });

      return updatedUser;
    } catch (error) {
      strapi.log.error('Error removing avatar:', error);
      throw error;
    }
  },

  /**
   * Get user profile with all related data
   */
  async getFullProfile(userId: number) {
    try {
      // Get user with all populated fields
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: ['role'],
      });

      // Get linked member if exists
      const member = await strapi.service('api::user-management.user-management').getMemberForUser(userId);

      // Get user's activity statistics
      const stats = await this.getUserStats(userId);

      // Remove sensitive data
      const { password, resetPasswordToken, confirmationToken, ...safeUser } = user as any;

      return {
        user: safeUser,
        member,
        stats,
      };
    } catch (error) {
      strapi.log.error('Error fetching full profile:', error);
      throw error;
    }
  },

  /**
   * Get user activity statistics
   */
  async getUserStats(userId: number) {
    try {
      // Get member for user
      const member = await strapi.service('api::user-management.user-management').getMemberForUser(userId);
      
      if (!member) {
        return null;
      }

      // Get player record if member is a player
      const player = await strapi.entityService.findMany('api::spieler.spieler', {
        filters: { mitglied: { id: member.id } },
        populate: ['hauptteam'],
      });

      if (player.length === 0) {
        return { type: 'member', data: {} };
      }

      // Get player statistics for current season
      const currentSeason = await strapi.entityService.findMany('api::saison.saison', {
        filters: { aktiv: true },
      });

      const currentSeasonArray = Array.isArray(currentSeason) ? currentSeason : [currentSeason];
      if (currentSeasonArray.length === 0) {
        return { type: 'player', data: {} };
      }

      const stats = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik', {
        filters: {
          spieler: { id: player[0].id },
          saison: { id: currentSeasonArray[0].id },
        },
      });

      return {
        type: 'player',
        data: {
          team: (player[0] as any).hauptteam,
          stats: stats[0] || {},
        },
      };
    } catch (error) {
      strapi.log.error('Error fetching user stats:', error);
      return null;
    }
  },

  /**
   * Update user preferences
   */
  async updatePreferences(userId: number, preferences: any) {
    try {
      // For now, store preferences in user bio field as JSON
      // In a real implementation, you might want a separate preferences table
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: {
          bio: JSON.stringify(preferences),
        } as any,
      });

      return updatedUser;
    } catch (error) {
      strapi.log.error('Error updating preferences:', error);
      throw error;
    }
  },

  /**
   * Get user preferences
   */
  async getPreferences(userId: number) {
    try {
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId);
      
      if ((user as any).bio) {
        try {
          return JSON.parse((user as any).bio);
        } catch {
          return {};
        }
      }

      return {};
    } catch (error) {
      strapi.log.error('Error fetching preferences:', error);
      return {};
    }
  },

  /**
   * Validate profile data
   */
  validateProfileData(data: any) {
    const errors: string[] = [];

    if (data.displayName && data.displayName.length > 100) {
      errors.push('Display name must be less than 100 characters');
    }

    if (data.bio && data.bio.length > 500) {
      errors.push('Bio must be less than 500 characters');
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
});