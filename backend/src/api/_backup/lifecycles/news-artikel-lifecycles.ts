/**
 * news-artikel lifecycles (simplified)
 */

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Set publication date to now if not provided
    if (!data.datum) {
      data.datum = new Date();
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    
    // Basic validation only
  },

  async afterCreate(event) {
    const { result } = event;
    
    // Log article creation
    strapi.log.info(`Created news article: ${result.titel} by ${result.autor}`);
  },

  async afterUpdate(event) {
    const { result } = event;
    
    // Log article update
    strapi.log.info(`Updated news article: ${result.titel}`);
  }
};

