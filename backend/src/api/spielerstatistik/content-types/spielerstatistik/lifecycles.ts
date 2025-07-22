/**
 * Lifecycle hooks for spielerstatistik content type
 * Implements data integrity checks for statistics
 */

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Validate statistics data integrity
    await validateStatisticsData(data);
    
    // Validate unique statistics entry per player/team/season
    await validateUniqueStatisticsEntry(data);
    
    // Ensure non-negative values
    validateNonNegativeValues(data);
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    
    // Validate statistics data integrity
    await validateStatisticsData(data);
    
    // Validate unique statistics entry per player/team/season (excluding current)
    if (data.spieler || data.team || data.saison) {
      await validateUniqueStatisticsEntry(data, where.id);
    }
    
    // Ensure non-negative values
    validateNonNegativeValues(data);
    
    // Validate statistics consistency
    await validateStatisticsConsistency(data, where.id);
  },

  async beforeDelete(event) {
    const { where } = event.params;
    
    // Log deletion for audit purposes
    const stats = await strapi.entityService.findOne('api::spielerstatistik.spielerstatistik', where.id, {
      populate: ['spieler', 'team', 'saison']
    });
    
    if (stats) {
      strapi.log.info(`Deleting statistics for player ${(stats as any).spieler?.vorname} ${(stats as any).spieler?.nachname} in team ${(stats as any).team?.name} for season ${(stats as any).saison?.name}`);
    }
  },

  async afterCreate(event) {
    const { result } = event;
    
    // Log statistics creation
    strapi.log.info(`Statistics created for player ID ${result.spieler} in team ID ${result.team} for season ID ${result.saison}`);
  },

  async afterUpdate(event) {
    const { result } = event;
    
    // Validate total statistics consistency after update
    await validateTotalStatisticsConsistency(result);
    
    strapi.log.info(`Statistics updated for player ID ${result.spieler} in team ID ${result.team} for season ID ${result.saison}`);
  }
};

/**
 * Validates basic statistics data integrity
 */
async function validateStatisticsData(data: any) {
  // Validate player exists and is active
  if (data.spieler) {
    const player = await strapi.entityService.findOne('api::spieler.spieler', data.spieler, {
      populate: ['hauptteam', 'aushilfe_teams']
    });
    
    if (!player) {
      throw new Error('Spieler nicht gefunden');
    }
    
    if (player.status === 'gesperrt') {
      strapi.log.warn(`Creating statistics for suspended player: ${player.vorname} ${player.nachname}`);
    }
  }

  // Validate team exists
  if (data.team) {
    const team = await strapi.entityService.findOne('api::team.team', data.team);
    if (!team) {
      throw new Error('Team nicht gefunden');
    }
  }

  // Validate season exists
  if (data.saison) {
    const season = await strapi.entityService.findOne('api::saison.saison', data.saison);
    if (!season) {
      throw new Error('Saison nicht gefunden');
    }
  }

  // Validate player belongs to team
  if (data.spieler && data.team) {
    const player = await strapi.entityService.findOne('api::spieler.spieler', data.spieler, {
      populate: ['hauptteam', 'aushilfe_teams']
    });
    
    if (player) {
      const isInTeam = (player as any).hauptteam?.id === data.team || 
                       (player as any).aushilfe_teams?.some((team: any) => team.id === data.team);
      
      if (!isInTeam) {
        throw new Error('Spieler ist nicht dem angegebenen Team zugeordnet');
      }
    }
  }

  // Validate team belongs to season
  if (data.team && data.saison) {
    const team = await strapi.entityService.findOne('api::team.team', data.team, {
      populate: ['saison']
    });
    
    if (team && (team as any).saison && (team as any).saison.id !== data.saison) {
      throw new Error('Team gehört nicht zur angegebenen Saison');
    }
  }
}

/**
 * Validates unique statistics entry per player/team/season combination
 */
async function validateUniqueStatisticsEntry(data: any, excludeId?: any) {
  if (!data.spieler || !data.team || !data.saison) {
    return; // Cannot validate without all required fields
  }

  const filters: any = {
    spieler: data.spieler,
    team: data.team,
    saison: data.saison
  };

  // Exclude current entry when updating
  if (excludeId) {
    filters.id = { $ne: excludeId };
  }

  const existingStats = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik', {
    filters
  });

  if (existingStats && existingStats.length > 0) {
    throw new Error('Statistik-Eintrag für diese Spieler/Team/Saison-Kombination existiert bereits');
  }
}

/**
 * Validates that all statistical values are non-negative
 */
function validateNonNegativeValues(data: any) {
  const numericFields = ['tore', 'spiele', 'assists', 'gelbe_karten', 'rote_karten', 'minuten_gespielt'];
  
  for (const field of numericFields) {
    if (data[field] !== undefined && data[field] < 0) {
      throw new Error(`${field} kann nicht negativ sein`);
    }
  }
}

/**
 * Validates statistics consistency (e.g., goals <= total match events)
 */
async function validateStatisticsConsistency(data: any, statisticsId: any) {
  // Get current statistics to merge with updates
  const currentStats = await strapi.entityService.findOne('api::spielerstatistik.spielerstatistik', statisticsId, {
    populate: ['spieler', 'team', 'saison']
  });
  
  if (!currentStats) {
    return;
  }

  const mergedData = { ...currentStats, ...data };

  // Validate logical consistency
  if (mergedData.tore > mergedData.spiele * 10) { // Arbitrary but reasonable limit
    strapi.log.warn(`Player has unusually high goals per game ratio: ${mergedData.tore} goals in ${mergedData.spiele} games`);
  }

  if (mergedData.assists > mergedData.spiele * 5) { // Arbitrary but reasonable limit
    strapi.log.warn(`Player has unusually high assists per game ratio: ${mergedData.assists} assists in ${mergedData.spiele} games`);
  }

  if (mergedData.gelbe_karten + mergedData.rote_karten > mergedData.spiele) {
    strapi.log.warn(`Player has more cards than games played: ${mergedData.gelbe_karten + mergedData.rote_karten} cards in ${mergedData.spiele} games`);
  }

  if (mergedData.minuten_gespielt > mergedData.spiele * 120) { // 120 minutes max per game (including extra time)
    strapi.log.warn(`Player has more minutes than theoretically possible: ${mergedData.minuten_gespielt} minutes in ${mergedData.spiele} games`);
  }
}

/**
 * Validates total statistics consistency across all teams for a player in a season
 */
async function validateTotalStatisticsConsistency(statistics: any) {
  try {
    // Get all statistics for this player in this season
    const allPlayerStats = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik', {
      filters: {
        spieler: statistics.spieler,
        saison: statistics.saison
      },
      populate: ['team']
    });

    if (!allPlayerStats || allPlayerStats.length <= 1) {
      return; // No other statistics to compare
    }

    // Calculate totals
    const totals = {
      tore: 0,
      spiele: 0,
      assists: 0,
      gelbe_karten: 0,
      rote_karten: 0,
      minuten_gespielt: 0
    };

    const statsArray = Array.isArray(allPlayerStats) ? allPlayerStats : [allPlayerStats];
    
    for (const stat of statsArray) {
      totals.tore += stat.tore || 0;
      totals.spiele += stat.spiele || 0;
      totals.assists += stat.assists || 0;
      totals.gelbe_karten += stat.gelbe_karten || 0;
      totals.rote_karten += stat.rote_karten || 0;
      totals.minuten_gespielt += stat.minuten_gespielt || 0;
    }

    // Log totals for monitoring
    strapi.log.info(`Player ${statistics.spieler} season totals: ${totals.tore} goals, ${totals.spiele} games, ${totals.assists} assists`);

    // Validate reasonable totals
    if (totals.spiele > 50) { // Reasonable limit for a season
      strapi.log.warn(`Player ${statistics.spieler} has unusually high total games: ${totals.spiele}`);
    }

    if (totals.tore > 100) { // Reasonable limit for a season
      strapi.log.warn(`Player ${statistics.spieler} has unusually high total goals: ${totals.tore}`);
    }

  } catch (error) {
    strapi.log.error('Error validating total statistics consistency:', error);
  }
}