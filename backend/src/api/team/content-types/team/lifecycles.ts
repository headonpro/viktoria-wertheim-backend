/**
 * Team lifecycle hooks using TeamHookService
 * 
 * This implementation uses the modular TeamHookService for team-specific
 * validations, calculations, and relationship management with proper
 * error handling and graceful degradation.
 */

import { getHookServiceFactory } from '../../../../services/HookServiceFactory';
import { TeamHookService } from '../../../../services/TeamHookService';

// Configuration for team hook behavior
const TEAM_HOOK_CONFIG = {
  enableStrictValidation: process.env.TEAM_STRICT_VALIDATION === 'true' || false,
  enableGracefulDegradation: true,
  maxHookExecutionTime: 100, // Increased for service-based operations
  retryAttempts: 2,
  logLevel: 'warn' as const,
  enableTeamNameValidation: true,
  enableTeamStatsCalculation: true,
  enableTeamRelationshipValidation: process.env.TEAM_RELATIONSHIP_VALIDATION === 'true' || false,
  maxTeamNameLength: 100,
  minFoundingYear: 1800,
  maxFoundingYear: new Date().getFullYear()
};

// Get or create team hook service
let teamHookService: TeamHookService | null = null;

function getTeamHookService(): TeamHookService {
  if (!teamHookService) {
    const factory = getHookServiceFactory(strapi, {
      defaultHookConfig: TEAM_HOOK_CONFIG
    });
    
    // Register TeamHookService with factory
    factory.registerService('api::team.team', TeamHookService);
    
    // Create team service instance
    teamHookService = factory.createTeamService(TEAM_HOOK_CONFIG) as TeamHookService;
  }
  
  return teamHookService;
}

export default {
  async beforeCreate(event: any) {
    try {
      const service = getTeamHookService();
      const result = await service.beforeCreate(event);
      
      if (result.success && result.modifiedData) {
        event.params.data = result.modifiedData;
      }
      
      return result.canProceed ? event.params.data : null;
    } catch (error) {
      strapi.log.error('Team beforeCreate hook failed', {
        error: error.message,
        stack: error.stack,
        eventData: event.params.data
      });
      
      // Graceful degradation - allow operation to continue with warning
      if (TEAM_HOOK_CONFIG.enableGracefulDegradation) {
        strapi.log.warn('Team beforeCreate continuing with graceful degradation');
        return event.params.data;
      }
      
      throw error;
    }
  },

  async beforeUpdate(event: any) {
    try {
      const service = getTeamHookService();
      const result = await service.beforeUpdate(event);
      
      if (result.success && result.modifiedData) {
        event.params.data = result.modifiedData;
      }
      
      return result.canProceed ? event.params.data : null;
    } catch (error) {
      strapi.log.error('Team beforeUpdate hook failed', {
        error: error.message,
        stack: error.stack,
        eventData: event.params.data,
        where: event.params.where
      });
      
      // Graceful degradation - allow operation to continue with warning
      if (TEAM_HOOK_CONFIG.enableGracefulDegradation) {
        strapi.log.warn('Team beforeUpdate continuing with graceful degradation');
        return event.params.data;
      }
      
      throw error;
    }
  },

  async afterCreate(event: any) {
    try {
      const service = getTeamHookService();
      await service.afterCreate(event);
    } catch (error) {
      strapi.log.error('Team afterCreate hook failed', {
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
      const service = getTeamHookService();
      await service.afterUpdate(event);
    } catch (error) {
      strapi.log.error('Team afterUpdate hook failed', {
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
 * Reset team hook service (for testing or configuration changes)
 */
export function resetTeamHookService(): void {
  teamHookService = null;
}

/**
 * Get team hook service statistics
 */
export function getTeamHookStats(): any {
  if (!teamHookService) {
    return null;
  }
  
  return teamHookService.getValidationStats();
}

/**
 * Update team hook configuration
 */
export function updateTeamHookConfig(newConfig: any): void {
  if (teamHookService) {
    teamHookService.updateTeamConfig(newConfig);
  }
}