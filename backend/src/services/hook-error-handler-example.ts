/**
 * Example integration of Hook Error Handler
 * 
 * This file demonstrates how to integrate the HookErrorHandler into existing
 * lifecycle hooks. This is a reference implementation that shows the pattern
 * for refactoring existing hooks.
 */

import { HookWrapper } from './hook-error-handler';

/**
 * Example: Team lifecycle hooks using the error handler wrapper
 */
export function createTeamLifecycleWithErrorHandler(strapi: any) {
  const hookWrapper = new HookWrapper(strapi, {
    enableGracefulDegradation: true,
    enableStrictValidation: false, // Temporarily disabled
    maxExecutionTime: 100,
    logLevel: 'warn'
  });

  return {
    beforeCreate: hookWrapper.wrapBeforeCreate('team', async (event) => {
      const { data } = event.params;
      
      strapi.log.info(`Creating team: ${data.name || 'Unknown'}`);
      
      // Example validation logic that might fail
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Team name is required');
      }
      
      // Example business logic validation
      if (data.name.length > 100) {
        throw new Error('Team name too long (max 100 characters)');
      }
      
      // Simulate potential database validation
      const existingTeam = await strapi.entityService.findMany('api::team.team', {
        filters: { name: data.name },
        pagination: { limit: 1 }
      });
      
      if (existingTeam && existingTeam.length > 0) {
        throw new Error(`Team with name "${data.name}" already exists`);
      }
      
      return data; // Return modified data if needed
    }),

    beforeUpdate: hookWrapper.wrapBeforeUpdate('team', async (event) => {
      const { data, where } = event.params;
      
      strapi.log.info(`Updating team ${where.id}`, { 
        updatedFields: Object.keys(data) 
      });
      
      // Example validation for updates
      if (data.name && data.name.trim().length === 0) {
        throw new Error('Team name cannot be empty');
      }
      
      if (data.name && data.name.length > 100) {
        throw new Error('Team name too long (max 100 characters)');
      }
      
      return data;
    }),

    afterCreate: hookWrapper.wrapAfterCreate('team', async (event) => {
      const { result } = event;
      
      strapi.log.info(`Team ${result.id} (${result.name}) created successfully`);
      
      // Example: Trigger additional processing that shouldn't block creation
      try {
        // Could trigger team statistics initialization, etc.
        await initializeTeamStatistics(result.id);
      } catch (error) {
        // This error won't block the creation since it's in afterCreate
        strapi.log.warn('Failed to initialize team statistics:', error.message);
      }
    }),

    afterUpdate: hookWrapper.wrapAfterUpdate('team', async (event) => {
      const { result } = event;
      
      strapi.log.info(`Team ${result.id} (${result.name}) updated successfully`);
      
      // Example: Trigger cache invalidation or other non-critical operations
      try {
        await invalidateTeamCache(result.id);
      } catch (error) {
        strapi.log.warn('Failed to invalidate team cache:', error.message);
      }
    })
  };
}

/**
 * Example helper functions that might be called from hooks
 */
async function initializeTeamStatistics(teamId: number): Promise<void> {
  // Simulate async operation that might fail
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // This could fail but shouldn't block team creation
  if (Math.random() > 0.8) {
    throw new Error('Statistics service temporarily unavailable');
  }
}

async function invalidateTeamCache(teamId: number): Promise<void> {
  // Simulate cache invalidation that might fail
  await new Promise(resolve => setTimeout(resolve, 10));
  
  if (Math.random() > 0.9) {
    throw new Error('Cache service unavailable');
  }
}

/**
 * Example: Saison lifecycle hooks with complex validation
 */
export function createSaisonLifecycleWithErrorHandler(strapi: any) {
  const hookWrapper = new HookWrapper(strapi, {
    enableGracefulDegradation: true,
    enableStrictValidation: false,
    maxExecutionTime: 200, // Longer timeout for complex validation
    logLevel: 'warn'
  });

  return {
    beforeCreate: hookWrapper.wrapBeforeCreate('saison', async (event) => {
      const { data } = event.params;
      
      // Validate season date ranges
      await validateSeasonDates(data);
      
      // Enforce single active season constraint
      await enforceActiveSeasonConstraint(data);
      
      return data;
    }),

    beforeUpdate: hookWrapper.wrapBeforeUpdate('saison', async (event) => {
      const { data, where } = event.params;
      
      // Validate season date ranges if being updated
      if (data.start_datum || data.end_datum) {
        const currentSeason = await strapi.entityService.findOne('api::saison.saison', where.id);
        const mergedData = { ...currentSeason, ...data };
        await validateSeasonDates(mergedData);
      }
      
      // Enforce single active season constraint
      if (data.aktiv !== undefined) {
        await enforceActiveSeasonConstraint(data, where.id);
      }
      
      return data;
    })
  };
}

/**
 * Example validation functions that demonstrate error handling patterns
 */
async function validateSeasonDates(data: any): Promise<void> {
  if (data.start_datum && data.end_datum) {
    const startDate = new Date(data.start_datum);
    const endDate = new Date(data.end_datum);
    
    if (startDate >= endDate) {
      throw new Error('Saison-Startdatum muss vor dem Enddatum liegen');
    }
    
    // This validation might be temporarily disabled but the error handler
    // will classify it appropriately and allow graceful degradation
    const overlappingSeasons = await findOverlappingSeasons(data);
    if (overlappingSeasons.length > 0) {
      const names = overlappingSeasons.map(s => s.name).join(', ');
      throw new Error(`Saison-Zeitraum überschneidet sich mit: ${names}`);
    }
  }
}

async function enforceActiveSeasonConstraint(data: any, excludeId?: any): Promise<void> {
  if (data.aktiv) {
    const filters: any = { aktiv: true };
    if (excludeId) {
      filters.id = { $ne: excludeId };
    }
    
    const activeSeasons = await strapi.entityService.findMany('api::saison.saison', {
      filters
    });
    
    if (activeSeasons && activeSeasons.length > 0) {
      // This could be handled gracefully by auto-deactivating other seasons
      // The error handler will determine if this should block or warn
      throw new Error('Es kann nur eine aktive Saison geben');
    }
  }
}

async function findOverlappingSeasons(data: any): Promise<any[]> {
  // Simulate complex database query that might timeout
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Return empty array for now (overlap checking temporarily disabled)
  return [];
}