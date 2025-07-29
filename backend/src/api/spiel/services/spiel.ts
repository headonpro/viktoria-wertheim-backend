/**
 * spiel service
 */

import { factories } from '@strapi/strapi'
import { SpielValidationService, SpielEntity } from './validation';

export default factories.createCoreService('api::spiel.spiel', ({ strapi }) => ({
  async create(params: any) {
    const validationService = new SpielValidationService();
    
    // Validate the spiel data before creation
    const validation = await validationService.validateSpielResult(params.data);
    
    if (!validation.isValid) {
      const errorMessage = validation.errors.map(e => e.message).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    // Sanitize input data
    params.data = validationService.sanitizeSpielInput(params.data);
    
    return super.create(params);
  },

  async update(docId: string, params: any) {
    const validationService = new SpielValidationService();
    
    // Get existing entity for status transition validation
    const existingEntity = await super.findOne(docId, {});
    
    if (existingEntity && params.data.status && existingEntity.status !== params.data.status) {
      const statusValidation = validationService.validateStatusTransition(
        existingEntity.status, 
        params.data.status
      );
      
      if (!statusValidation.isValid) {
        const errorMessage = statusValidation.errors.map(e => e.message).join(', ');
        throw new Error(`Status transition validation failed: ${errorMessage}`);
      }
    }
    
    // Validate the updated spiel data
    const mergedData = { ...existingEntity, ...params.data };
    const validation = await validationService.validateSpielResult(mergedData);
    
    if (!validation.isValid) {
      const errorMessage = validation.errors.map(e => e.message).join(', ');
      throw new Error(`Validation failed: ${errorMessage}`);
    }

    // Sanitize input data
    params.data = validationService.sanitizeSpielInput(params.data);
    
    return super.update(docId, params);
  }
}));