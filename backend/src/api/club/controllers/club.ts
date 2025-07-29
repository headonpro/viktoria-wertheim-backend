/**
 * club controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::club.club', ({ strapi }) => ({
  // Custom controller methods can be added here
  
  async find(ctx) {
    // Add population for related data by default
    ctx.query = {
      ...ctx.query,
      populate: {
        logo: true,
        ligen: {
          populate: {
            saison: true
          }
        }
      }
    };
    
    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  async findOne(ctx) {
    // Add population for related data by default
    ctx.query = {
      ...ctx.query,
      populate: {
        logo: true,
        ligen: {
          populate: {
            saison: true
          }
        },
        heim_spiele: {
          populate: {
            liga: true,
            saison: true,
            gast_club: true
          }
        },
        gast_spiele: {
          populate: {
            liga: true,
            saison: true,
            heim_club: true
          }
        },
        tabellen_eintraege: {
          populate: {
            liga: true
          }
        }
      }
    };
    
    const { data, meta } = await super.findOne(ctx);
    return { data, meta };
  }
}));