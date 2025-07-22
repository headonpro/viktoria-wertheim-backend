import { getService } from '@strapi/plugin-users-permissions/server/utils';

export default (plugin: any) => {
  const originalRegister = plugin.controllers.auth.register;
  const originalCallback = plugin.controllers.auth.callback;

  // Extend register controller
  plugin.controllers.auth.register = async (ctx: any) => {
    const { email, username, password, displayName, memberNumber } = ctx.request.body;

    // Validate required fields
    if (!email || !username || !password) {
      return ctx.badRequest('Email, username, and password are required');
    }

    // Check if member number is provided and valid
    let linkedMember = null;
    if (memberNumber) {
      linkedMember = await strapi.entityService.findMany('api::mitglied.mitglied', {
        filters: { mitgliedsnummer: memberNumber },
      });

      if (linkedMember.length === 0) {
        return ctx.badRequest('Invalid member number');
      }

      linkedMember = linkedMember[0];

      // Check if member is already linked to another user
      if (linkedMember.website_user) {
        return ctx.badRequest('This member is already linked to another account');
      }
    }

    // Call original register function
    await originalRegister(ctx);

    // If registration was successful, handle additional setup
    if (ctx.body && ctx.body.user) {
      const user = ctx.body.user;

      try {
        // Update user with display name
        await strapi.entityService.update('plugin::users-permissions.user', user.id, {
          data: {
            displayName: displayName || username,
            lastLogin: new Date(),
          } as any,
        });

        // Link to member if member number was provided
        if (linkedMember) {
          await strapi.entityService.update('api::mitglied.mitglied', linkedMember.id, {
            data: {
              website_user: user.id,
            },
          });

          // Assign appropriate role based on member type
          let roleName = 'Mitglied';
          if (linkedMember.mitgliedsart === 'Vorstand') {
            roleName = 'Vereinsvorstand';
          }

          await strapi.service('api::user-management.user-management').assignRole(user.id, roleName);

          strapi.log.info(`User ${username} registered and linked to member ${linkedMember.vorname} ${linkedMember.nachname}`);
        } else {
          // Assign default member role for non-member registrations
          await strapi.service('api::user-management.user-management').assignRole(user.id, 'Mitglied');
        }

      } catch (error) {
        strapi.log.error('Error during post-registration setup:', error);
        // Don't fail the registration, just log the error
      }
    }
  };

  // Extend callback controller (for login)
  plugin.controllers.auth.callback = async (ctx: any) => {
    // Call original callback
    await originalCallback(ctx);

    // If login was successful, update last login time
    if (ctx.body && ctx.body.user) {
      const user = ctx.body.user;

      try {
        await strapi.entityService.update('plugin::users-permissions.user', user.id, {
          data: {
            lastLogin: new Date(),
          } as any,
        });
      } catch (error) {
        strapi.log.error('Error updating last login time:', error);
      }
    }
  };

  // Add custom me endpoint with extended user information
  plugin.controllers.auth.me = async (ctx: any) => {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('You must be authenticated to access this endpoint');
    }

    try {
      // Get user with role and member information
      const fullUser = await strapi.entityService.findOne('plugin::users-permissions.user', user.id, {
        populate: ['role'],
      });

      // Get linked member if exists
      const member = await strapi.service('api::user-management.user-management').getMemberForUser(user.id);

      // Remove sensitive data manually
      const { password, resetPasswordToken, confirmationToken, ...safeUser } = fullUser as any;

      ctx.body = {
        user: safeUser,
        member: member,
      };
    } catch (error) {
      strapi.log.error('Error fetching user profile:', error);
      ctx.badRequest('Error fetching user profile');
    }
  };

  // Add member registration endpoint
  plugin.controllers.auth.registerMember = async (ctx: any) => {
    const { email, username, password, displayName, memberNumber } = ctx.request.body;

    // Validate required fields
    if (!email || !username || !password || !memberNumber) {
      return ctx.badRequest('Email, username, password, and member number are required');
    }

    try {
      // Check if member number exists and is not already linked
      const member = await strapi.entityService.findMany('api::mitglied.mitglied', {
        filters: { mitgliedsnummer: memberNumber },
      });

      if (member.length === 0) {
        return ctx.badRequest('Invalid member number');
      }

      if ((member[0] as any).website_user) {
        return ctx.badRequest('This member is already linked to another account');
      }

      // Create user account
      const userService = getService('user');
      const role = await strapi.entityService.findMany('plugin::users-permissions.role', {
        filters: { name: 'Mitglied' },
      });

      const newUser = await userService.add({
        username,
        email,
        password,
        displayName: displayName || username,
        role: role[0]?.id,
        confirmed: true,
      });

      // Link member to user
      await strapi.entityService.update('api::mitglied.mitglied', member[0].id, {
        data: {
          website_user: newUser.id,
        },
      });

      // Assign appropriate role based on member type
      let roleName = 'Mitglied';
      if ((member[0] as any).mitgliedsart === 'Vorstand') {
        roleName = 'Vereinsvorstand';
      }

      await strapi.service('api::user-management.user-management').assignRole(newUser.id, roleName);

      // Generate JWT token
      const jwt = getService('jwt').issue({ id: newUser.id });

      ctx.body = {
        jwt,
        user: newUser,
        member: member[0],
      };

    } catch (error) {
      strapi.log.error('Error during member registration:', error);
      ctx.badRequest('Registration failed');
    }
  };

  // Add profile update endpoint
  plugin.controllers.auth.updateProfile = async (ctx: any) => {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const { displayName, bio } = ctx.request.body;

    try {
      const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: {
          displayName,
          bio,
        } as any,
      });

      // Remove sensitive data
      const { password, resetPasswordToken, confirmationToken, ...safeUser } = updatedUser as any;

      ctx.body = {
        user: safeUser,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      strapi.log.error('Error updating profile:', error);
      ctx.badRequest('Failed to update profile');
    }
  };

  // Add password change endpoint
  plugin.controllers.auth.changePassword = async (ctx: any) => {
    const user = ctx.state.user;

    if (!user) {
      return ctx.unauthorized('Authentication required');
    }

    const { currentPassword, newPassword } = ctx.request.body;

    if (!currentPassword || !newPassword) {
      return ctx.badRequest('Current password and new password are required');
    }

    try {
      // Verify current password
      const userService = getService('user');
      const validPassword = await userService.validatePassword(currentPassword, user.password);

      if (!validPassword) {
        return ctx.badRequest('Current password is incorrect');
      }

      // Update password
      await strapi.entityService.update('plugin::users-permissions.user', user.id, {
        data: {
          password: newPassword,
        },
      });

      ctx.body = {
        message: 'Password changed successfully',
      };
    } catch (error) {
      strapi.log.error('Error changing password:', error);
      ctx.badRequest('Failed to change password');
    }
  };

  return plugin;
};