// import type { Core } from '@strapi/strapi';

/**
 * Set up public permissions for API endpoints
 */
async function setupPublicPermissions(strapi: any) {
  try {
    // Get the public role
    const publicRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' }
    });

    if (!publicRole) {
      strapi.log.warn('Public role not found, skipping permission setup');
      return;
    }

    // Define the content types that should be publicly accessible
    const publicContentTypes = [
      'api::news-artikel.news-artikel',
      'api::tabellen-eintrag.tabellen-eintrag',
      'api::team.team',
      'api::liga.liga',
      'api::sponsor.sponsor',
      'api::veranstaltung.veranstaltung',
      'api::game-card.game-card',
      'api::next-game-card.next-game-card',
      'api::saison.saison'
    ];

    // Set up find and findOne permissions for each content type
    for (const contentType of publicContentTypes) {
      try {
        // Check if permissions already exist
        const existingPermissions = await strapi.query('plugin::users-permissions.permission').findMany({
          where: {
            role: publicRole.id,
            action: { $in: [`${contentType}.find`, `${contentType}.findOne`] }
          }
        });

        const existingActions = existingPermissions.map(p => p.action);

        // Create find permission if it doesn't exist
        if (!existingActions.includes(`${contentType}.find`)) {
          await strapi.query('plugin::users-permissions.permission').create({
            data: {
              action: `${contentType}.find`,
              subject: null,
              properties: {},
              conditions: [],
              role: publicRole.id
            }
          });
          strapi.log.info(`Created public find permission for ${contentType}`);
        }

        // Create findOne permission if it doesn't exist
        if (!existingActions.includes(`${contentType}.findOne`)) {
          await strapi.query('plugin::users-permissions.permission').create({
            data: {
              action: `${contentType}.findOne`,
              subject: null,
              properties: {},
              conditions: [],
              role: publicRole.id
            }
          });
          strapi.log.info(`Created public findOne permission for ${contentType}`);
        }

      } catch (error) {
        strapi.log.error(`Failed to set up permissions for ${contentType}:`, error);
      }
    }

    strapi.log.info('Public API permissions setup completed');

  } catch (error) {
    strapi.log.error('Failed to set up public permissions:', error);
  }
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) { },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: any }) {
    try {
      // Set up public API permissions for frontend access
      await setupPublicPermissions(strapi);

      strapi.log.info('Backend initialization completed successfully');

    } catch (error) {
      strapi.log.error('Failed to initialize automated data processing services:', error);
    }
  },
};
