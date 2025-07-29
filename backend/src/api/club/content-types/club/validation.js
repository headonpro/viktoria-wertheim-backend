/**
 * Enhanced Club validation configuration using comprehensive validation service
 */

module.exports = {
  beforeCreate: async (data) => {
    try {
      // Use comprehensive validation service
      const validationService = strapi.service('api::club.club-validation');
      
      // Sanitize input data
      const sanitizedData = validationService.sanitizeClubInput(data);
      
      // Perform comprehensive validation
      const validation = await validationService.validateClubCreation(sanitizedData);
      
      if (!validation.isValid) {
        const errorMessages = validationService.getErrorMessages(validation.errors);
        throw new Error(`Validation failed: ${errorMessages.join('; ')}`);
      }

      // Log warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        strapi.log.warn('Club creation warnings:', validation.warnings.map(w => w.message));
      }

      // Return sanitized data
      Object.assign(data, sanitizedData);
      return data;
    } catch (error) {
      strapi.log.error('Club creation validation error:', error);
      throw error;
    }
  },

  beforeUpdate: async (data, where) => {
    try {
      // Use comprehensive validation service
      const validationService = strapi.service('api::club.club-validation');
      
      // Perform update validation
      const validation = await validationService.validateClubUpdate(data, where.id);
      
      if (!validation.isValid) {
        const errorMessages = validationService.getErrorMessages(validation.errors);
        throw new Error(`Validation failed: ${errorMessages.join('; ')}`);
      }

      // Log warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        strapi.log.warn('Club update warnings:', validation.warnings.map(w => w.message));
      }

      // Sanitize only the fields being updated
      const sanitizedData = validationService.sanitizeClubInput(data);
      Object.assign(data, sanitizedData);
      
      return data;
    } catch (error) {
      strapi.log.error('Club update validation error:', error);
      throw error;
    }
  },

  afterCreate: async (result) => {
    try {
      // Invalidate cache after creation
      const clubService = strapi.service('api::club.club');
      await clubService.handleClubCacheInvalidation(result.id, 'create');
      
      strapi.log.info(`Club created successfully: ${result.name} (ID: ${result.id})`);
    } catch (error) {
      strapi.log.error('Error in afterCreate hook:', error);
    }
  },

  afterUpdate: async (result) => {
    try {
      // Invalidate cache after update
      const clubService = strapi.service('api::club.club');
      await clubService.handleClubCacheInvalidation(result.id, 'update');
      
      strapi.log.info(`Club updated successfully: ${result.name} (ID: ${result.id})`);
    } catch (error) {
      strapi.log.error('Error in afterUpdate hook:', error);
    }
  },

  afterDelete: async (result) => {
    try {
      // Invalidate cache after deletion
      const clubService = strapi.service('api::club.club');
      await clubService.handleClubCacheInvalidation(result.id, 'delete');
      
      strapi.log.info(`Club deleted successfully: ${result.name} (ID: ${result.id})`);
    } catch (error) {
      strapi.log.error('Error in afterDelete hook:', error);
    }
  }
};