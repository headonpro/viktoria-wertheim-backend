import type { Core } from '@strapi/strapi';

/**
 * User management service for handling role assignments and user operations
 */
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Assign a role to a user
   */
  async assignRole(userId: number, roleName: string) {
    try {
      // Find the role by name
      const role = await strapi.entityService.findMany('plugin::users-permissions.role', {
        filters: { name: roleName },
      });

      if (!role || role.length === 0) {
        throw new Error(`Role '${roleName}' not found`);
      }

      // Update user with new role
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: {
          role: role[0].id,
        },
      });

      return updatedUser;
    } catch (error) {
      strapi.log.error('Error assigning role:', error);
      throw error;
    }
  },

  /**
   * Get user with role information
   */
  async getUserWithRole(userId: number) {
    try {
      const user = await strapi.entityService.findOne('plugin::users-permissions.user', userId, {
        populate: ['role'],
      });

      return user;
    } catch (error) {
      strapi.log.error('Error fetching user with role:', error);
      throw error;
    }
  },

  /**
   * Get all users with a specific role
   */
  async getUsersByRole(roleName: string) {
    try {
      const role = await strapi.entityService.findMany('plugin::users-permissions.role', {
        filters: { name: roleName },
      });

      if (!role || role.length === 0) {
        return [];
      }

      const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: { role: { id: role[0].id } },
        populate: ['role'],
      });

      return users;
    } catch (error) {
      strapi.log.error('Error fetching users by role:', error);
      throw error;
    }
  },

  /**
   * Create a new user with specific role
   */
  async createUserWithRole(userData: any, roleName: string) {
    try {
      // Find the role by name
      const role = await strapi.entityService.findMany('plugin::users-permissions.role', {
        filters: { name: roleName },
      });

      if (!role || role.length === 0) {
        throw new Error(`Role '${roleName}' not found`);
      }

      // Create user with role
      const newUser = await strapi.entityService.create('plugin::users-permissions.user', {
        data: {
          ...userData,
          role: role[0].id,
          confirmed: true, // Auto-confirm users created by admin
        },
      });

      return newUser;
    } catch (error) {
      strapi.log.error('Error creating user with role:', error);
      throw error;
    }
  },

  /**
   * Link a member to a website user account
   */
  async linkMemberToUser(memberId: number, userId: number) {
    try {
      // Update member record to link to user
      const updatedMember = await strapi.entityService.update('api::mitglied.mitglied', memberId, {
        data: {
          website_user: userId,
        },
      });

      return updatedMember;
    } catch (error) {
      strapi.log.error('Error linking member to user:', error);
      throw error;
    }
  },

  /**
   * Get member data for a user
   */
  async getMemberForUser(userId: number) {
    try {
      const member = await strapi.entityService.findMany('api::mitglied.mitglied', {
        filters: { website_user: { id: userId } },
        populate: ['website_user'],
      });

      return member.length > 0 ? member[0] : null;
    } catch (error) {
      strapi.log.error('Error fetching member for user:', error);
      throw error;
    }
  },

  /**
   * Check if user has specific permission
   */
  async hasPermission(userId: number, action: string, contentType: string) {
    try {
      const user = await this.getUserWithRole(userId);
      if (!user || !(user as any).role) {
        return false;
      }

      const permissions = await strapi.entityService.findMany('plugin::users-permissions.permission', {
        filters: {
          role: (user as any).role.id,
          action: `${contentType}.${action}`,
          enabled: true,
        },
      });

      return permissions.length > 0;
    } catch (error) {
      strapi.log.error('Error checking permission:', error);
      return false;
    }
  },

  /**
   * Get all available roles
   */
  async getAllRoles() {
    try {
      const roles = await strapi.entityService.findMany('plugin::users-permissions.role', {
        sort: 'name:asc',
      });

      return roles;
    } catch (error) {
      strapi.log.error('Error fetching roles:', error);
      throw error;
    }
  },

  /**
   * Update user profile information
   */
  async updateUserProfile(userId: number, profileData: any) {
    try {
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', userId, {
        data: profileData,
      });

      return updatedUser;
    } catch (error) {
      strapi.log.error('Error updating user profile:', error);
      throw error;
    }
  },
});