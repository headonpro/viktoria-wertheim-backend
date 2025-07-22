/**
 * kategorie service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::kategorie.kategorie', ({ strapi }) => ({
  
  // Get categories with article counts
  async findWithArticleCounts(params = {}) {
    const categories = await strapi.entityService.findMany('api::kategorie.kategorie', {
      ...params,
      populate: {
        news_artikel: true
      },
      sort: { reihenfolge: 'asc' }
    });

    return categories.map((category: any) => ({
      ...category,
      articleCount: category.news_artikel?.length || 0
    }));
  },

  // Validate category before operations
  async validateCategory(data) {
    const errors = [];

    // Validate name
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Category name is required');
    }

    // Check for duplicate names
    if (data.name) {
      const existing = await strapi.entityService.findMany('api::kategorie.kategorie', {
        filters: { name: data.name }
      });
      
      if (existing.length > 0 && (!data.id || existing[0].id !== data.id)) {
        errors.push('Category name must be unique');
      }
    }

    // Validate color format
    if (data.farbe && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(data.farbe)) {
      errors.push('Color must be in hex format (e.g., #FF0000 or #F00)');
    }

    // Validate order
    if (data.reihenfolge !== undefined && (isNaN(data.reihenfolge) || data.reihenfolge < 0)) {
      errors.push('Order must be a non-negative number');
    }

    return errors;
  },

  // Get next available order number
  async getNextOrder() {
    const categories = await strapi.entityService.findMany('api::kategorie.kategorie', {
      sort: { reihenfolge: 'desc' },
      limit: 1
    });

    return categories.length > 0 ? categories[0].reihenfolge + 1 : 1;
  },

  // Check if category can be deleted
  async canDelete(id) {
    const category = await strapi.entityService.findOne('api::kategorie.kategorie', id, {
      populate: {
        news_artikel: true
      }
    });

    if (!category) {
      throw new Error('Category not found');
    }

    const articleCount = (category as any).news_artikel?.length || 0;
    
    return {
      canDelete: articleCount === 0,
      articleCount,
      message: articleCount > 0 
        ? `Cannot delete category with ${articleCount} associated articles`
        : 'Category can be safely deleted'
    };
  }

}));