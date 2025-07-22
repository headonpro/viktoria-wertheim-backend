import type { Core } from '@strapi/strapi';

/**
 * User management controller
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Assign role to user
   */
  async assignRole(ctx: any) {
    try {
      const { userId, roleName } = ctx.request.body;

      if (!userId || !roleName) {
        return ctx.badRequest('userId and roleName are required');
      }

      const updatedUser = await strapi.service('api::user-management.user-management').assignRole(userId, roleName);

      ctx.body = {
        data: updatedUser,
        message: `Role '${roleName}' assigned successfully`,
      };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Get user with role information
   */
  async getUserWithRole(ctx: any) {
    try {
      const { id } = ctx.params;

      const user = await strapi.service('api::user-management.user-management').getUserWithRole(id);

      if (!user) {
        return ctx.notFound('User not found');
      }

      ctx.body = { data: user };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Get users by role
   */
  async getUsersByRole(ctx: any) {
    try {
      const { roleName } = ctx.params;

      const users = await strapi.service('api::user-management.user-management').getUsersByRole(roleName);

      ctx.body = { data: users };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Create user with role
   */
  async createUserWithRole(ctx: any) {
    try {
      const { userData, roleName } = ctx.request.body;

      if (!userData || !roleName) {
        return ctx.badRequest('userData and roleName are required');
      }

      const newUser = await strapi.service('api::user-management.user-management').createUserWithRole(userData, roleName);

      ctx.body = {
        data: newUser,
        message: 'User created successfully',
      };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Link member to user
   */
  async linkMemberToUser(ctx: any) {
    try {
      const { memberId, userId } = ctx.request.body;

      if (!memberId || !userId) {
        return ctx.badRequest('memberId and userId are required');
      }

      const updatedMember = await strapi.service('api::user-management.user-management').linkMemberToUser(memberId, userId);

      ctx.body = {
        data: updatedMember,
        message: 'Member linked to user successfully',
      };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Get member for current user
   */
  async getMyMember(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      const member = await strapi.service('api::user-management.user-management').getMemberForUser(userId);

      ctx.body = { data: member };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Get all roles
   */
  async getRoles(ctx: any) {
    try {
      const roles = await strapi.service('api::user-management.user-management').getAllRoles();

      ctx.body = { data: roles };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },

  /**
   * Update current user profile
   */
  async updateProfile(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      const profileData = ctx.request.body;

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
   * Get current user profile
   */
  async getProfile(ctx: any) {
    try {
      const userId = ctx.state.user?.id;

      if (!userId) {
        return ctx.unauthorized('Authentication required');
      }

      const user = await strapi.service('api::user-management.user-management').getUserWithRole(userId);

      if (!user) {
        return ctx.notFound('User not found');
      }

      // Remove sensitive information
      const { password, resetPasswordToken, confirmationToken, ...safeUser } = user;

      ctx.body = { data: safeUser };
    } catch (error) {
      ctx.badRequest(error.message);
    }
  },
});