/**
 * Lifecycle hooks for saison content type
 * Implements single active season constraint validation
 */

// Audit logging removed for simplification

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Validate season date ranges
    await validateSeasonDates(data);
    
    // Enforce single active season constraint
    await enforceActiveSeasonConstraint(data);
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    
    // Validate season date ranges if being updated
    if (data.start_datum || data.end_datum) {
      // Get current season data to merge with updates
      const currentSeason = await strapi.entityService.findOne('api::saison.saison' as any, where.id);
      const mergedData = {
        ...currentSeason,
        ...data
      };
      await validateSeasonDates(mergedData);
    }
    
    // Enforce single active season constraint
    if (data.aktiv !== undefined) {
      await enforceActiveSeasonConstraint(data, where.id);
    }
  },

  async beforeDelete(event) {
    const { where } = event.params;
    
    // Prevent deletion of active season
    const season = await strapi.entityService.findOne('api::saison.saison' as any, where.id);
    if (season?.aktiv) {
      throw new Error('Aktive Saison kann nicht gelöscht werden. Bitte zuerst eine andere Saison aktivieren.');
    }
    
    // Check if season has dependent data
    await validateSeasonDeletion(where.id);
  },

  async afterCreate(event) {
    const { result } = event;
    
    // Log when a new season is created
    strapi.log.info(`New season created: ${result.name} (Active: ${result.aktiv})`);
  },

  async afterUpdate(event) {
    const { result } = event;
    
    // Log when a season is updated
    strapi.log.info(`Season updated: ${result.name} (Active: ${result.aktiv})`);
  },

  async afterDelete(event) {
    const { result } = event;
    
    strapi.log.info(`Season deleted: ${result.name}`);
  }
};

/**
 * Validates season date ranges for logical consistency
 */
async function validateSeasonDates(data: any) {
  if (data.start_datum && data.end_datum) {
    const startDate = new Date(data.start_datum);
    const endDate = new Date(data.end_datum);
    
    if (startDate >= endDate) {
      throw new Error('Saison-Startdatum muss vor dem Enddatum liegen');
    }
    
    // Check for overlapping seasons
    const overlappingSeasons = await strapi.entityService.findMany('api::saison.saison' as any, {
      filters: {
        $or: [
          {
            $and: [
              { start_datum: { $lte: data.start_datum } },
              { end_datum: { $gte: data.start_datum } }
            ]
          },
          {
            $and: [
              { start_datum: { $lte: data.end_datum } },
              { end_datum: { $gte: data.end_datum } }
            ]
          },
          {
            $and: [
              { start_datum: { $gte: data.start_datum } },
              { end_datum: { $lte: data.end_datum } }
            ]
          }
        ]
      }
    });
    
    if (overlappingSeasons && overlappingSeasons.length > 0) {
      const overlappingNames = Array.isArray(overlappingSeasons) 
        ? overlappingSeasons.map((s: any) => s.name).join(', ')
        : overlappingSeasons.name;
      throw new Error(`Saison-Zeitraum überschneidet sich mit bestehenden Saisons: ${overlappingNames}`);
    }
  }
}

/**
 * Enforces single active season constraint
 */
async function enforceActiveSeasonConstraint(data: any, excludeId?: any) {
  if (data.aktiv) {
    const filters: any = { aktiv: true };
    if (excludeId) {
      filters.id = { $ne: excludeId };
    }
    
    const activeSeasons = await strapi.entityService.findMany('api::saison.saison' as any, {
      filters
    });
    
    if (activeSeasons && activeSeasons.length > 0) {
      // Automatically deactivate other seasons
      const seasonsArray = Array.isArray(activeSeasons) ? activeSeasons : [activeSeasons];
      for (const season of seasonsArray) {
        if (season && season.id) {
          await strapi.entityService.update('api::saison.saison' as any, season.id, {
            data: { aktiv: false }
          });
          strapi.log.info(`Deactivated season: ${season.name}`);
        }
      }
    }
  }
}

/**
 * Validates that a season can be safely deleted
 */
async function validateSeasonDeletion(seasonId: any) {
  // Match dependency check removed since Spiel content type was removed
  
  // Check for dependent teams
  const teams = await strapi.entityService.findMany('api::team.team' as any, {
    filters: { saison: seasonId },
    pagination: { limit: 1 }
  });
  
  // Handle both array and single object responses
  let teamsArray: any[] = [];
  if (teams) {
    teamsArray = Array.isArray(teams) ? teams : [teams];
  }
  
  if (teamsArray.length > 0) {
    throw new Error('Saison kann nicht gelöscht werden: Es sind noch Teams zugeordnet');
  }
  
  // Check for dependent leagues
  const leagues = await strapi.entityService.findMany('api::liga.liga' as any, {
    filters: { saison: seasonId },
    pagination: { limit: 1 }
  });
  
  // Handle both array and single object responses
  let leaguesArray: any[] = [];
  if (leagues) {
    leaguesArray = Array.isArray(leagues) ? leagues : [leagues];
  }
  
  if (leaguesArray.length > 0) {
    throw new Error('Saison kann nicht gelöscht werden: Es sind noch Ligen zugeordnet');
  }
}