/**
 * kategorie controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::kategorie.kategorie', ({ strapi }) => ({
  
  // Get categories ordered by reihenfolge
  async find(ctx) {
    const { query } = ctx;
    
    // Default sorting by reihenfolge
    if (!query.sort) {
      query.sort = { reihenfolge: 'asc' };
    }
    
    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  // Initialize predefined categories
  async initializeCategories(ctx) {
    try {
      const predefinedCategories = [
        {
          name: 'Vereinsnews',
          beschreibung: 'Allgemeine Nachrichten des Vereins',
          farbe: '#1e40af', // Blue
          reihenfolge: 1
        },
        {
          name: 'Spielberichte',
          beschreibung: 'Berichte über Spiele und Matches',
          farbe: '#16a34a', // Green
          reihenfolge: 2
        },
        {
          name: 'Transfers',
          beschreibung: 'Spielerwechsel und Neuzugänge',
          farbe: '#dc2626', // Red
          reihenfolge: 3
        },
        {
          name: 'Veranstaltungen',
          beschreibung: 'Vereinsveranstaltungen und Events',
          farbe: '#7c3aed', // Purple
          reihenfolge: 4
        }
      ];

      const existingCategories = await strapi.entityService.findMany('api::kategorie.kategorie');
      const existingNames = existingCategories.map(cat => cat.name);

      const categoriesToCreate = predefinedCategories.filter(
        cat => !existingNames.includes(cat.name)
      );

      const createdCategories = [];
      for (const categoryData of categoriesToCreate) {
        const category = await strapi.entityService.create('api::kategorie.kategorie', {
          data: categoryData
        });
        createdCategories.push(category);
      }

      ctx.body = {
        message: `Initialized ${createdCategories.length} predefined categories`,
        created: createdCategories,
        existing: existingCategories.length
      };
    } catch (error) {
      ctx.throw(500, `Failed to initialize categories: ${error.message}`);
    }
  },

  // Reorder categories
  async reorder(ctx) {
    try {
      const { categoryOrders } = ctx.request.body;
      
      if (!Array.isArray(categoryOrders)) {
        return ctx.throw(400, 'categoryOrders must be an array of {id, reihenfolge} objects');
      }

      const updatedCategories = [];
      for (const { id, reihenfolge } of categoryOrders) {
        const category = await strapi.entityService.update('api::kategorie.kategorie', id, {
          data: { reihenfolge }
        });
        updatedCategories.push(category);
      }

      ctx.body = {
        message: 'Categories reordered successfully',
        categories: updatedCategories
      };
    } catch (error) {
      ctx.throw(500, `Failed to reorder categories: ${error.message}`);
    }
  }

}));