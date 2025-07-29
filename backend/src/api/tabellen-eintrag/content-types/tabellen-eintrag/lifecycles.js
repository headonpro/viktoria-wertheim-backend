/**
 * Tabellen-Eintrag lifecycle hooks
 * Handles validation and data consistency for table entries
 */

const { validateTabellenEintrag } = require('./validation');

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;
    
    try {
      const errors = await validateTabellenEintrag(data, { strapi });
      
      if (errors.length > 0) {
        const error = new Error('Validation failed');
        error.details = { errors };
        throw error;
      }
    } catch (error) {
      strapi.log.error('[TabellenEintrag] Validation failed on create:', error);
      throw error;
    }
  },

  async beforeUpdate(event) {
    const { data } = event.params;
    
    try {
      const errors = await validateTabellenEintrag(data, { strapi });
      
      if (errors.length > 0) {
        const error = new Error('Validation failed');
        error.details = { errors };
        throw error;
      }
    } catch (error) {
      strapi.log.error('[TabellenEintrag] Validation failed on update:', error);
      throw error;
    }
  },

  async afterCreate(event) {
    const { result } = event;
    strapi.log.info(`[TabellenEintrag] Created entry for ${result.team_name} in liga ${result.liga?.id || 'unknown'}`);
  },

  async afterUpdate(event) {
    const { result } = event;
    strapi.log.info(`[TabellenEintrag] Updated entry for ${result.team_name} in liga ${result.liga?.id || 'unknown'}`);
  }
};