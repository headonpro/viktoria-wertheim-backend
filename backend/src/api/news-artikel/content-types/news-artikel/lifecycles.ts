/**
 * news-artikel lifecycles
 */

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Set publication date to now if not provided
    if (!data.datum) {
      data.datum = new Date();
    }
    
    // Calculate reading time based on content
    if (data.inhalt) {
      data.lesezeit = calculateReadingTime(data.inhalt);
    }
    
    // Generate SEO fields if not provided
    if (!data.seo_titel && data.titel) {
      data.seo_titel = data.titel.substring(0, 60);
    }
    
    if (!data.seo_beschreibung && data.kurzbeschreibung) {
      data.seo_beschreibung = data.kurzbeschreibung.substring(0, 160);
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    
    // Recalculate reading time if content changed
    if (data.inhalt) {
      data.lesezeit = calculateReadingTime(data.inhalt);
    }
    
    // Update SEO fields if title or description changed
    if (data.titel && !data.seo_titel) {
      data.seo_titel = data.titel.substring(0, 60);
    }
    
    if (data.kurzbeschreibung && !data.seo_beschreibung) {
      data.seo_beschreibung = data.kurzbeschreibung.substring(0, 160);
    }
  },

  async afterCreate(event) {
    const { result } = event;
    
    // Log article creation
    strapi.log.info(`Created news article: ${result.titel} by ${result.autor}`);
    
    // If featured, ensure only one featured article per category
    if (result.featured && result.kategorie) {
      await ensureOnlyOneFeaturedPerCategory(result.kategorie, result.id);
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    
    // If featured status changed, manage featured articles
    if (result.featured && result.kategorie) {
      await ensureOnlyOneFeaturedPerCategory(result.kategorie, result.id);
    }
  }
};

/**
 * Calculate reading time based on content
 * Assumes average reading speed of 200 words per minute
 */
function calculateReadingTime(content: string): number {
  if (!content) return 1;
  
  // Strip HTML tags and count words
  const plainText = content.replace(/<[^>]*>/g, '');
  const wordCount = plainText.trim().split(/\s+/).length;
  
  // Calculate reading time (minimum 1 minute)
  const readingTime = Math.ceil(wordCount / 200);
  return Math.max(1, readingTime);
}

/**
 * Ensure only one featured article per category
 */
async function ensureOnlyOneFeaturedPerCategory(categoryId: any, currentArticleId: any) {
  try {
    // Find other featured articles in the same category
    const otherFeaturedArticles = await strapi.entityService.findMany('api::news-artikel.news-artikel', {
      filters: {
        kategorie: { id: categoryId },
        featured: true,
        id: { $ne: currentArticleId }
      }
    });

    // Unfeatured other articles
    for (const article of otherFeaturedArticles) {
      await strapi.entityService.update('api::news-artikel.news-artikel', article.id, {
        data: { featured: false }
      });
    }

    if (otherFeaturedArticles.length > 0) {
      strapi.log.info(`Unfeatured ${otherFeaturedArticles.length} articles to maintain single featured article per category`);
    }
  } catch (error) {
    strapi.log.error('Error managing featured articles:', error);
  }
}