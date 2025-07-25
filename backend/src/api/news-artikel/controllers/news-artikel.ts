/**
 * news-artikel controller - Ultra-simplified version with enhanced error handling
 */

import { factories } from '@strapi/strapi';
import { ValidationService } from '../../../services/ValidationService';

export default factories.createCoreController('api::news-artikel.news-artikel', ({ strapi }) => ({
  
  async find(ctx) {
    try {
      const { query } = ctx;
      
      strapi.log.debug('NewsArtikel.find: Fetching news articles with query', { query });
      
      if (!query.filters) {
        query.filters = {};
      }
      
      // Add publishedAt filter for public access
      if (!ctx.state.user || !ctx.state.user.role) {
        (query.filters as any).publishedAt = { $notNull: true };
      }
      
      if (!query.sort) {
        query.sort = { datum: 'desc' };
      }
      
      if (!query.populate) {
        query.populate = ['titelbild'];
      }
      
      const { data, meta } = await super.find(ctx);
      
      strapi.log.debug('NewsArtikel.find: Successfully fetched articles', { 
        count: data?.length || 0 
      });
      
      return { data, meta };
    } catch (error) {
      strapi.log.error('NewsArtikel.find: Error fetching news articles', {
        error: error.message,
        query: ctx.query
      });
      
      throw error;
    }
  },

  // Get featured articles with enhanced error handling
  async getFeatured(ctx) {
    try {
      const { limit = 5 } = ctx.query;
      
      strapi.log.debug('NewsArtikel.getFeatured: Fetching featured articles', { limit });
      
      // Validate limit parameter
      const parsedLimit = parseInt(limit as string);
      if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
        return ctx.badRequest(
          ValidationService.createErrorResponse(
            'Limit must be a number between 1 and 50',
            'INVALID_LIMIT'
          )
        );
      }
      
      const articles = await strapi.service('api::news-artikel.news-artikel').findFeatured(
        parsedLimit
      );

      strapi.log.debug('NewsArtikel.getFeatured: Successfully fetched featured articles', { 
        count: articles?.length || 0 
      });

      ctx.body = { data: articles };
    } catch (error) {
      strapi.log.error('NewsArtikel.getFeatured: Error fetching featured articles', {
        error: error.message,
        limit: ctx.query.limit
      });
      
      throw error;
    }
  },

  /**
   * Create news article with validation
   */
  async create(ctx) {
    try {
      const { data } = ctx.request.body;
      
      strapi.log.debug('NewsArtikel.create: Creating new article', { data });
      
      // Validate required fields
      const requiredFields = ['titel', 'inhalt', 'datum', 'autor'];
      const validation = ValidationService.validateRequiredWithDetails(data, requiredFields);
      
      if (!validation.isValid) {
        strapi.log.warn('NewsArtikel.create: Validation failed', { errors: validation.errors });
        return ctx.badRequest(ValidationService.formatErrorResponse(validation.errors));
      }
      
      // Validate datum is a valid date
      if (data.datum) {
        const date = new Date(data.datum);
        if (isNaN(date.getTime())) {
          return ctx.badRequest(
            ValidationService.createErrorResponse(
              'datum must be a valid date',
              'INVALID_DATE'
            )
          );
        }
      }
      
      const article = await strapi.entityService.create('api::news-artikel.news-artikel', {
        data,
        populate: ['titelbild']
      });
      
      strapi.log.info('NewsArtikel.create: Article created successfully', { 
        articleId: article.id, 
        titel: article.titel 
      });
      
      return article;
    } catch (error) {
      strapi.log.error('NewsArtikel.create: Error creating article', {
        error: error.message,
        data: ctx.request.body?.data
      });
      
      throw error;
    }
  }

}));