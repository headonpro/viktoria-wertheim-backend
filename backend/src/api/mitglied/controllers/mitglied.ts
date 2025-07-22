/**
 * mitglied controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::mitglied.mitglied', ({ strapi }) => ({
  // Custom controller method to get public member data only
  async findPublic(ctx) {
    const { query } = ctx;
    
    const entities = await strapi.entityService.findMany('api::mitglied.mitglied', {
      ...query,
      filters: {
        ...((query as any).filters || {}),
        oeffentlich_sichtbar: true,
        status: 'Aktiv'
      },
      fields: ['vorname', 'nachname', 'mitgliedsart', 'eintrittsdatum'],
      populate: {
        spieler: {
          fields: ['position', 'rueckennummer'],
          populate: {
            spielerfoto: true
          }
        }
      }
    });

    const sanitizedEntities = await this.sanitizeOutput(entities, ctx);
    return this.transformResponse(sanitizedEntities);
  }
}));