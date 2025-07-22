/**
 * news-artikel service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::news-artikel.news-artikel', ({ strapi }) => ({
  
  // Get articles with enhanced filtering and sorting
  async findWithFilters(params: any = {}) {
    const {
      kategorie,
      featured,
      autor,
      dateFrom,
      dateTo,
      published = true,
      ...otherParams
    } = params;

    const filters: any = {};

    // Category filter
    if (kategorie) {
      filters.kategorie = kategorie;
    }

    // Featured filter
    if (featured !== undefined) {
      filters.featured = featured;
    }

    // Author filter
    if (autor) {
      filters.autor = { $containsi: autor };
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filters.datum = {};
      if (dateFrom) filters.datum.$gte = dateFrom;
      if (dateTo) filters.datum.$lte = dateTo;
    }

    // Published filter
    if (published) {
      filters.publishedAt = { $notNull: true };
    }

    return await strapi.entityService.findMany('api::news-artikel.news-artikel', {
      ...otherParams,
      filters,
      populate: {
        kategorie: true,
        titelbild: true
      },
      sort: { datum: 'desc' }
    });
  },

  // Get article statistics
  async getStatistics() {
    const totalArticles = await strapi.entityService.count('api::news-artikel.news-artikel');
    const publishedArticles = await strapi.entityService.count('api::news-artikel.news-artikel', {
      filters: { publishedAt: { $notNull: true } }
    });
    const draftArticles = await strapi.entityService.count('api::news-artikel.news-artikel', {
      filters: { publishedAt: { $null: true } }
    });
    const featuredArticles = await strapi.entityService.count('api::news-artikel.news-artikel', {
      filters: { featured: true, publishedAt: { $notNull: true } }
    });

    // Get articles by category
    const categories = await strapi.entityService.findMany('api::kategorie.kategorie', {
      populate: {
        news_artikel: {
          filters: { publishedAt: { $notNull: true } },
          count: true
        }
      }
    });

    const articlesByCategory = categories.map((category: any) => ({
      categoryName: category.name,
      categoryId: category.id,
      articleCount: category.news_artikel?.length || 0
    }));

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentArticles = await strapi.entityService.count('api::news-artikel.news-artikel', {
      filters: {
        datum: { $gte: thirtyDaysAgo },
        publishedAt: { $notNull: true }
      }
    });

    return {
      total: totalArticles,
      published: publishedArticles,
      drafts: draftArticles,
      featured: featuredArticles,
      recentArticles,
      articlesByCategory
    };
  },

  // Validate article data
  async validateArticle(data) {
    const errors = [];

    // Validate title
    if (!data.titel || data.titel.trim().length === 0) {
      errors.push('Article title is required');
    } else if (data.titel.length > 200) {
      errors.push('Article title must be 200 characters or less');
    }

    // Validate content
    if (!data.inhalt || data.inhalt.trim().length === 0) {
      errors.push('Article content is required');
    }

    // Validate author
    if (!data.autor || data.autor.trim().length === 0) {
      errors.push('Article author is required');
    } else if (data.autor.length > 100) {
      errors.push('Author name must be 100 characters or less');
    }

    // Validate category
    if (!data.kategorie) {
      errors.push('Article category is required');
    } else {
      const category = await strapi.entityService.findOne('api::kategorie.kategorie', data.kategorie);
      if (!category) {
        errors.push('Invalid category selected');
      }
    }

    // Validate publication date
    if (data.datum) {
      const articleDate = new Date(data.datum);
      const now = new Date();
      if (articleDate > now) {
        // Allow future dates but warn
        errors.push('Warning: Article date is in the future');
      }
    }

    // Validate SEO fields
    if (data.seo_titel && data.seo_titel.length > 60) {
      errors.push('SEO title must be 60 characters or less');
    }

    if (data.seo_beschreibung && data.seo_beschreibung.length > 160) {
      errors.push('SEO description must be 160 characters or less');
    }

    if (data.kurzbeschreibung && data.kurzbeschreibung.length > 500) {
      errors.push('Short description must be 500 characters or less');
    }

    return errors;
  },

  // Get related articles
  async getRelatedArticles(articleId, limit = 5) {
    const article = await strapi.entityService.findOne('api::news-artikel.news-artikel', articleId, {
      populate: { kategorie: true }
    });

    if (!article) {
      throw new Error('Article not found');
    }

    // Find articles in the same category, excluding the current article
    const relatedArticles = await strapi.entityService.findMany('api::news-artikel.news-artikel', {
      filters: {
        kategorie: (article as any).kategorie.id,
        id: { $ne: articleId },
        publishedAt: { $notNull: true }
      },
      sort: { datum: 'desc' },
      limit,
      populate: {
        kategorie: true,
        titelbild: true
      }
    });

    return relatedArticles;
  },

  // Generate article excerpt
  generateExcerpt(content, maxLength = 150) {
    if (!content) return '';
    
    // Strip HTML tags
    const plainText = content.replace(/<[^>]*>/g, '');
    
    // Truncate to maxLength
    if (plainText.length <= maxLength) {
      return plainText;
    }
    
    // Find the last complete word within the limit
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  },

  // Bulk operations
  async bulkUpdateCategory(articleIds, categoryId) {
    const category = await strapi.entityService.findOne('api::kategorie.kategorie', categoryId);
    if (!category) {
      throw new Error('Invalid category');
    }

    const updatedArticles = [];
    for (const articleId of articleIds) {
      const article = await strapi.entityService.update('api::news-artikel.news-artikel', articleId, {
        data: { kategorie: categoryId },
        populate: {
          kategorie: true,
          titelbild: true
        }
      });
      updatedArticles.push(article);
    }

    return updatedArticles;
  },

  async bulkPublish(articleIds) {
    const updatedArticles = [];
    for (const articleId of articleIds) {
      const article = await strapi.entityService.update('api::news-artikel.news-artikel', articleId, {
        data: { publishedAt: new Date() },
        populate: {
          kategorie: true,
          titelbild: true
        }
      });
      updatedArticles.push(article);
    }

    return updatedArticles;
  }

}));