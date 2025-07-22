/**
 * news-artikel controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::news-artikel.news-artikel', ({ strapi }) => ({
  
  // Get published articles with pagination and filtering
  async find(ctx) {
    const { query } = ctx;
    
    // Default to published articles only for public API
    if (!query.filters) {
      query.filters = {};
    }
    
    // Add publishedAt filter for public access
    if (!ctx.state.user || !ctx.state.user.role) {
      (query.filters as any).publishedAt = { $notNull: true };
    }
    
    // Default sorting by publication date (newest first)
    if (!query.sort) {
      query.sort = { datum: 'desc' };
    }
    
    // Default population
    if (!query.populate) {
      query.populate = {
        kategorie: true,
        titelbild: true
      };
    }
    
    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  // Get single article by slug
  async findBySlug(ctx) {
    const { slug } = ctx.params;
    
    try {
      const articles = await strapi.entityService.findMany('api::news-artikel.news-artikel', {
        filters: { 
          slug,
          publishedAt: { $notNull: true }
        },
        populate: {
          kategorie: true,
          titelbild: true
        }
      });

      if (articles.length === 0) {
        return ctx.notFound('Article not found');
      }

      ctx.body = { data: articles[0] };
    } catch (error) {
      ctx.throw(500, `Failed to fetch article: ${error.message}`);
    }
  },

  // Get featured articles
  async getFeatured(ctx) {
    try {
      const { kategorie, limit = 5 } = ctx.query;
      
      const filters: any = {
        featured: true,
        publishedAt: { $notNull: true }
      };
      
      if (kategorie) {
        filters.kategorie = kategorie;
      }
      
      const articles = await strapi.entityService.findMany('api::news-artikel.news-artikel', {
        filters,
        sort: { datum: 'desc' },
        limit: parseInt(limit as string),
        populate: {
          kategorie: true,
          titelbild: true
        }
      });

      ctx.body = { data: articles };
    } catch (error) {
      ctx.throw(500, `Failed to fetch featured articles: ${error.message}`);
    }
  },

  // Get articles by category
  async getByCategory(ctx) {
    const { categoryId } = ctx.params;
    const { page = 1, pageSize = 10 } = ctx.query;
    
    try {
      const articles = await strapi.entityService.findMany('api::news-artikel.news-artikel', {
        filters: {
          kategorie: categoryId,
          publishedAt: { $notNull: true }
        },
        sort: { datum: 'desc' },
        start: (parseInt(page as string) - 1) * parseInt(pageSize as string),
        limit: parseInt(pageSize as string),
        populate: {
          kategorie: true,
          titelbild: true
        }
      });

      // Get total count for pagination
      const total = await strapi.entityService.count('api::news-artikel.news-artikel', {
        filters: {
          kategorie: categoryId,
          publishedAt: { $notNull: true }
        }
      });

      ctx.body = {
        data: articles,
        meta: {
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            pageCount: Math.ceil(total / parseInt(pageSize as string)),
            total
          }
        }
      };
    } catch (error) {
      ctx.throw(500, `Failed to fetch articles by category: ${error.message}`);
    }
  },

  // Search articles
  async search(ctx) {
    const { q, kategorie, limit = 10 } = ctx.query;
    
    if (!q) {
      return ctx.badRequest('Search query is required');
    }
    
    try {
      const filters: any = {
        $or: [
          { titel: { $containsi: q } },
          { kurzbeschreibung: { $containsi: q } },
          { inhalt: { $containsi: q } }
        ],
        publishedAt: { $notNull: true }
      };
      
      if (kategorie) {
        filters.kategorie = kategorie;
      }
      
      const articles = await strapi.entityService.findMany('api::news-artikel.news-artikel', {
        filters,
        sort: { datum: 'desc' },
        limit: parseInt(limit as string),
        populate: {
          kategorie: true,
          titelbild: true
        }
      });

      ctx.body = { data: articles };
    } catch (error) {
      ctx.throw(500, `Search failed: ${error.message}`);
    }
  },

  // Toggle featured status
  async toggleFeatured(ctx) {
    const { id } = ctx.params;
    
    try {
      const article = await strapi.entityService.findOne('api::news-artikel.news-artikel', id);
      
      if (!article) {
        return ctx.notFound('Article not found');
      }

      const updatedArticle = await strapi.entityService.update('api::news-artikel.news-artikel', id, {
        data: { featured: !article.featured },
        populate: {
          kategorie: true,
          titelbild: true
        }
      });

      ctx.body = { data: updatedArticle };
    } catch (error) {
      ctx.throw(500, `Failed to toggle featured status: ${error.message}`);
    }
  }

}));