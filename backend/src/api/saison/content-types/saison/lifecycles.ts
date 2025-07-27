/**
 * Saison lifecycle hooks using SaisonHookService
 * 
 * This implementation uses the modular SaisonHookService for season-specific
 * validations, constraint handling, and lifecycle management with proper
 * error handling and graceful degradation.
 */

import { getHookServiceFactory } from '../../../../services/HookServiceFactory';
import { SaisonHookService } from '../../../../services/SaisonHookService';

// Configuration for saison hook behavior
const SAISON_HOOK_CONFIG = {
  enableStrictValidation: process.env.SAISON_STRICT_VALIDATION === 'true' || false,
  enableOverlapValidation: process.env.SAISON_OVERLAP_VALIDATION === 'true' || false,
  enableStrictOverlapValidation: process.env.SAISON_STRICT_VALIDATION === 'true' || false,
  enableGracefulDegradation: true,
  maxHookExecutionTime: 200, // Increased for database queries
  retryAttempts: 2,
  logLevel: 'warn' as const,
  enableActiveSeasonConstraint: true,
  autoDeactivateOtherSeasons: true,
  enableDateValidation: true,
  enableDateRangeValidation: true,
  enableDeletionValidation: true,
  checkDependentTeams: true,
  checkDependentLeagues: true,
  enableSeasonActivation: true,
  enableSeasonTransition: true,
  logSeasonChanges: true
};

// Get or create saison hook service
let saisonHookService: SaisonHookService | null = null;

function getSaisonHookService(): SaisonHookService {
  if (!saisonHookService) {
    const factory = getHookServiceFactory(strapi, {
      defaultHookConfig: SAISON_HOOK_CONFIG
    });
    
    // Register SaisonHookService with factory
    factory.registerService('api::saison.saison', SaisonHookService);
    
    // Create saison service instance
    saisonHookService = factory.createSaisonService(SAISON_HOOK_CONFIG) as SaisonHookService;
  }
  
  return saisonHookService;
}

export default {
  async beforeCreate(event: any) {
    try {
      const service = getSaisonHookService();
      const result = await service.beforeCreate(event);
      
      if (result.success && result.modifiedData) {
        event.params.data = result.modifiedData;
      }
      
      return result.canProceed ? event.params.data : null;
    } catch (error) {
      strapi.log.error('Saison beforeCreate hook failed', {
        error: error.message,
        stack: error.stack,
        eventData: event.params.data
      });
      
      // Graceful degradation - allow operation to continue with warning
      if (SAISON_HOOK_CONFIG.enableGracefulDegradation) {
        strapi.log.warn('Saison beforeCreate continuing with graceful degradation');
        return event.params.data;
      }
      
      throw error;
    }
  },

  async beforeUpdate(event: any) {
    try {
      const service = getSaisonHookService();
      const result = await service.beforeUpdate(event);
      
      if (result.success && result.modifiedData) {
        event.params.data = result.modifiedData;
      }
      
      return result.canProceed ? event.params.data : null;
    } catch (error) {
      strapi.log.error('Saison beforeUpdate hook failed', {
        error: error.message,
        stack: error.stack,
        eventData: event.params.data,
        where: event.params.where
      });
      
      // Graceful degradation - allow operation to continue with warning
      if (SAISON_HOOK_CONFIG.enableGracefulDegradation) {
        strapi.log.warn('Saison beforeUpdate continuing with graceful degradation');
        return event.params.data;
      }
      
      throw error;
    }
  },

  async beforeDelete(event: any) {
    try {
      const service = getSaisonHookService();
      const result = await service.beforeDelete(event);
      
      return result.canProceed;
    } catch (error) {
      strapi.log.error('Saison beforeDelete hook failed', {
        error: error.message,
        stack: error.stack,
        where: event.params.where
      });
      
      // Graceful degradation - allow operation to continue with warning
      if (SAISON_HOOK_CONFIG.enableGracefulDegradation) {
        strapi.log.warn('Saison beforeDelete continuing with graceful degradation');
        return true;
      }
      
      throw error;
    }
  },

  async afterCreate(event: any) {
    try {
      const service = getSaisonHookService();
      await service.afterCreate(event);
    } catch (error) {
      strapi.log.error('Saison afterCreate hook failed', {
        error: error.message,
        stack: error.stack,
        result: event.result
      });
      
      // After hooks should not block the operation
      // Just log the error and continue
    }
  },

  async afterUpdate(event: any) {
    try {
      const service = getSaisonHookService();
      await service.afterUpdate(event);
    } catch (error) {
      strapi.log.error('Saison afterUpdate hook failed', {
        error: error.message,
        stack: error.stack,
        result: event.result
      });
      
      // After hooks should not block the operation
      // Just log the error and continue
    }
  },

  async afterDelete(event: any) {
    try {
      const service = getSaisonHookService();
      await service.afterDelete(event);
    } catch (error) {
      strapi.log.error('Saison afterDelete hook failed', {
        error: error.message,
        stack: error.stack,
        result: event.result
      });
      
      // After hooks should not block the operation
      // Just log the error and continue
    }
  }
};

/**
 * Reset saison hook service (for testing or configuration changes)
 */
export function resetSaisonHookService(): void {
  saisonHookService = null;
}

/**
 * Get saison hook service statistics
 */
export function getSaisonHookStats(): any {
  if (!saisonHookService) {
    return null;
  }
  
  return saisonHookService.getSaisonStats();
}

/**
 * Update saison hook configuration
 */
export function updateSaisonHookConfig(newConfig: any): void {
  if (saisonHookService) {
    saisonHookService.updateSaisonConfig(newConfig);
  }
}

/**
 * Check season overlap with enhanced conflict analysis (utility function)
 */
export async function checkSeasonOverlap(startDate: string, endDate: string, excludeId?: number): Promise<{
  hasOverlap: boolean;
  overlappingSeasons: any[];
  conflictAnalysis?: any;
}> {
  const service = getSaisonHookService();
  return await service.checkSeasonOverlap(startDate, endDate, excludeId);
}

/**
 * Get conflict resolution suggestions (utility function)
 */
export async function getConflictResolutionSuggestions(newSeasonData: any, overlappingSeasons: any[]): Promise<any[]> {
  const service = getSaisonHookService();
  return service.getConflictResolutionSuggestions(newSeasonData, overlappingSeasons);
}

/**
 * Validate date range with detailed feedback (utility function)
 */
export function validateDateRange(startDate: string, endDate: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const service = getSaisonHookService();
  return service.validateDateRange(startDate, endDate);
}

/**
 * Get validation configuration status (utility function)
 */
export function getValidationConfig(): any {
  const service = getSaisonHookService();
  return service.getValidationConfig();
}

/**
 * Get active seasons (utility function)
 */
export async function getActiveSeasons(excludeId?: number): Promise<any[]> {
  const service = getSaisonHookService();
  return await service.getActiveSeasons(excludeId);
}

/**
 * Activate season with enhanced management (utility function)
 */
export async function activateSeason(seasonId: number): Promise<any> {
  const service = getSaisonHookService();
  return await service.activateSeason(seasonId);
}

/**
 * Deactivate season (utility function)
 */
export async function deactivateSeason(seasonId: number): Promise<any> {
  const service = getSaisonHookService();
  return await service.deactivateSeason(seasonId);
}

/**
 * Get current active season (utility function)
 */
export async function getCurrentActiveSeason(): Promise<any | null> {
  const service = getSaisonHookService();
  return await service.getCurrentActiveSeason();
}

/**
 * Get season activation history (utility function)
 */
export async function getSeasonActivationHistory(limit: number = 10): Promise<any[]> {
  const service = getSaisonHookService();
  return await service.getSeasonActivationHistory(limit);
}