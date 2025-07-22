import type { Core } from '@strapi/strapi';

/**
 * User profile controller
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Get current user's full profile
   */
  async getProfile(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      const profile = await strapi.service('api::user-profile.user-profile').getFullProfile(userId);

      ctx.body = { data: profile };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      const profileData = ctx.request.body;

      // Validate profile data
      const validation = strapi.service('api::user-profile.user-profile').validateProfileData(profileData);
      if (!validation.isValid) {
        return ctx.badRequest('Validation failed', { errors: validation.errors });
      }

      const updatedUser = await strapi.service('api::user-management.user-management').updateUserProfile(userId, profileData);

      ctx.body = {
        data: updatedUser,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Upload user avatar
   */
  async uploadAvatar(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      const { files } = ctx.request;
      
      if (!files || !files.avatar) {
        return ctx.badRequest('Avatar file is required');
      }

      const updatedUser = await strapi.service('api::user-profile.user-profile').uploadAvatar(userId, files.avatar);

      ctx.body = {
        data: updatedUser,
        message: 'Avatar uploaded successfully',
      };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Remove user avatar
   */
  async removeAvatar(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      const updatedUser = await strapi.service('api::user-profile.user-profile').removeAvatar(userId);

      ctx.body = {
        data: updatedUser,
        message: 'Avatar removed successfully',
      };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Get user statistics
   */
  async getStats(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      const stats = await strapi.service('api::user-profile.user-profile').getUserStats(userId);

      ctx.body = { data: stats };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Update user preferences
   */
  async updatePreferences(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      const preferences = ctx.request.body;

      const updatedUser = await strapi.service('api::user-profile.user-profile').updatePreferences(userId, preferences);

      ctx.body = {
        data: updatedUser,
        message: 'Preferences updated successfully',
      };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Get user preferences
   */
  async getPreferences(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      const preferences = await strapi.service('api::user-profile.user-profile').getPreferences(userId);

      ctx.body = { data: preferences };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },
});