import AuditLoggerService from '../../../../services/audit-logger';

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Validate team assignment consistency
    await validateTeamAssignments(data);
    
    // Validate unique jersey number within hauptteam
    if (data.hauptteam && data.rueckennummer) {
      await validateUniqueJerseyNumber(data);
    }
    
    // Validate captain assignment
    if (data.kapitaen && data.hauptteam) {
      await validateCaptainAssignment(data);
    }
    
    // Validate member relationship
    if (data.mitglied) {
      await validateMemberRelationship(data.mitglied);
    }
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    
    // Validate team assignment consistency
    await validateTeamAssignments(data);
    
    // Validate unique jersey number within hauptteam
    if (data.hauptteam && data.rueckennummer) {
      await validateUniqueJerseyNumber(data, where.id);
    }
    
    // Validate captain assignment
    if (data.kapitaen && data.hauptteam) {
      await validateCaptainAssignment(data, where.id);
    }
    
    // Validate member relationship if being updated
    if (data.mitglied) {
      await validateMemberRelationship(data.mitglied, where.id);
    }
  },

  async beforeDelete(event) {
    const { where } = event.params;
    
    // Check if player has statistics that would be orphaned
    await validatePlayerDeletion(where.id);
  },

  async afterCreate(event) {
    const { result } = event;
    
    // Log audit event for player creation
    await AuditLoggerService.logDataChange(
      'api::spieler.spieler',
      result.id,
      'create',
      null,
      result,
      event.state?.user?.id
    );
    
    // Initialize player statistics for current active season
    await initializePlayerStatistics(result);
    
    strapi.log.info(`Player created: ${result.vorname} ${result.nachname}`);
  },

  async afterUpdate(event) {
    const { result, params } = event;
    
    // Get original data for audit logging
    const originalData = event.state?.originalData || {};
    
    // Log audit event for player update
    await AuditLoggerService.logDataChange(
      'api::spieler.spieler',
      result.id,
      'update',
      originalData,
      result,
      event.state?.user?.id
    );
    
    // Update statistics if team assignments changed
    await handleTeamAssignmentChanges(result);
    
    strapi.log.info(`Player updated: ${result.vorname} ${result.nachname}`);
  },

  async afterDelete(event) {
    const { result } = event;
    
    // Log audit event for player deletion
    await AuditLoggerService.logDataChange(
      'api::spieler.spieler',
      result.id,
      'delete',
      result,
      null,
      event.state?.user?.id
    );
    
    strapi.log.info(`Player deleted: ${result.vorname} ${result.nachname}`);
  }
};

/**
 * Validates that team assignments are consistent
 * - Player must have a hauptteam
 * - Aushilfe teams must be different from hauptteam
 * - All teams must belong to the same club and season
 */
async function validateTeamAssignments(data: any) {
  if (!data.hauptteam) {
    return; // hauptteam is not required at schema level, but recommended
  }

  // Get the hauptteam details
  const hauptteam: any = await strapi.entityService.findOne('api::team.team', data.hauptteam, {
    populate: ['club', 'saison']
  });

  if (!hauptteam) {
    throw new Error('Hauptteam nicht gefunden');
  }

  // If aushilfe_teams are provided, validate them
  if (data.aushilfe_teams && data.aushilfe_teams.length > 0) {
    // Ensure aushilfe teams don't include the hauptteam
    if (data.aushilfe_teams.includes(data.hauptteam)) {
      throw new Error('Aushilfe-Teams dürfen nicht das Hauptteam enthalten');
    }

    // Get all aushilfe teams and validate they belong to the same club and season
    const aushilfeTeamsResult = await strapi.entityService.findMany('api::team.team', {
      filters: {
        id: {
          $in: data.aushilfe_teams
        }
      },
      populate: ['club', 'saison']
    });
    const aushilfeTeams: any[] = Array.isArray(aushilfeTeamsResult) ? aushilfeTeamsResult : [aushilfeTeamsResult];

    for (const team of aushilfeTeams) {
      if (team.club?.id !== hauptteam.club?.id) {
        throw new Error(`Aushilfe-Team "${team.name}" gehört nicht zum gleichen Verein wie das Hauptteam`);
      }
      
      if (team.saison?.id !== hauptteam.saison?.id) {
        throw new Error(`Aushilfe-Team "${team.name}" gehört nicht zur gleichen Saison wie das Hauptteam`);
      }
    }
  }
}

/**
 * Validates that jersey numbers are unique within a team
 */
async function validateUniqueJerseyNumber(data: any, excludeId?: any) {
  const filters: any = {
    hauptteam: data.hauptteam,
    rueckennummer: data.rueckennummer
  };

  // Exclude current player when updating
  if (excludeId) {
    filters.id = { $ne: excludeId };
  }

  const existingPlayers: any[] = await strapi.entityService.findMany('api::spieler.spieler', {
    filters,
    populate: ['hauptteam']
  });

  if (existingPlayers.length > 0) {
    const teamName = existingPlayers[0].hauptteam?.name || 'Unbekanntes Team';
    throw new Error(`Rückennummer ${data.rueckennummer} ist bereits im Team "${teamName}" vergeben`);
  }
}

/**
 * Validates captain assignment - only one captain per team
 */
async function validateCaptainAssignment(data: any, excludeId?: any) {
  if (!data.kapitaen) return;

  const filters: any = {
    hauptteam: data.hauptteam,
    kapitaen: true
  };

  // Exclude current player when updating
  if (excludeId) {
    filters.id = { $ne: excludeId };
  }

  const existingCaptains: any[] = await strapi.entityService.findMany('api::spieler.spieler', {
    filters,
    populate: ['hauptteam']
  });

  if (existingCaptains.length > 0) {
    const teamName = existingCaptains[0].hauptteam?.name || 'Unbekanntes Team';
    const captainName = `${existingCaptains[0].vorname} ${existingCaptains[0].nachname}`;
    throw new Error(`Team "${teamName}" hat bereits einen Kapitän: ${captainName}`);
  }
}

/**
 * Validates member relationship - one player per member
 */
async function validateMemberRelationship(mitgliedId: any, excludeId?: any) {
  const filters: any = {
    mitglied: mitgliedId
  };

  // Exclude current player when updating
  if (excludeId) {
    filters.id = { $ne: excludeId };
  }

  const existingPlayers: any[] = await strapi.entityService.findMany('api::spieler.spieler', {
    filters,
    populate: ['mitglied']
  });

  if (existingPlayers.length > 0) {
    const memberName = existingPlayers[0].mitglied 
      ? `${existingPlayers[0].mitglied.vorname} ${existingPlayers[0].mitglied.nachname}`
      : 'Unbekanntes Mitglied';
    throw new Error(`Mitglied "${memberName}" ist bereits einem Spieler zugeordnet`);
  }
}

/**
 * Validates that a player can be safely deleted
 */
async function validatePlayerDeletion(playerId: any) {
  // Check for existing statistics
  const statistics = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
    filters: { spieler: playerId },
    pagination: { limit: 1 }
  });

  if (statistics && statistics.length > 0) {
    throw new Error('Spieler kann nicht gelöscht werden: Es existieren noch Statistiken für diesen Spieler');
  }

  // Note: Match events check removed since Spiel content type was removed
  // Players can now be deleted if they only have statistics
}

/**
 * Initialize player statistics for the current active season
 */
async function initializePlayerStatistics(player: any) {
  try {
    // Get active season
    const activeSeason = await strapi.entityService.findMany('api::saison.saison' as any, {
      filters: { aktiv: true },
      pagination: { limit: 1 }
    });

    if (!activeSeason || activeSeason.length === 0) {
      strapi.log.warn('No active season found for player statistics initialization');
      return;
    }

    const season = Array.isArray(activeSeason) ? activeSeason[0] : activeSeason;

    // Get player with team information
    const fullPlayer = await strapi.entityService.findOne('api::spieler.spieler', player.id, {
      populate: ['hauptteam']
    });

    if (!(fullPlayer as any)?.hauptteam) {
      strapi.log.warn(`Player ${player.id} has no hauptteam for statistics initialization`);
      return;
    }

    // Check if statistics already exist
    const existingStats = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
      filters: {
        spieler: player.id,
        saison: season.id,
        team: (fullPlayer as any).hauptteam.id
      }
    });

    if (!existingStats || existingStats.length === 0) {
      // Create initial statistics entry
      await strapi.entityService.create('api::spielerstatistik.spielerstatistik' as any, {
        data: {
          spieler: player.id,
          saison: season.id,
          team: (fullPlayer as any).hauptteam.id,
          tore: 0,
          spiele: 0,
          assists: 0,
          gelbe_karten: 0,
          rote_karten: 0,
          minuten_gespielt: 0
        }
      });

      strapi.log.info(`Statistics initialized for player ${player.vorname} ${player.nachname}`);
    }
  } catch (error) {
    strapi.log.error('Error initializing player statistics:', error);
  }
}

/**
 * Handle team assignment changes and update statistics accordingly
 */
async function handleTeamAssignmentChanges(player: any) {
  try {
    // Get active season
    const activeSeason = await strapi.entityService.findMany('api::saison.saison' as any, {
      filters: { aktiv: true },
      pagination: { limit: 1 }
    });

    if (!activeSeason || activeSeason.length === 0) {
      return;
    }

    const season = Array.isArray(activeSeason) ? activeSeason[0] : activeSeason;

    // Get player with team information
    const fullPlayer = await strapi.entityService.findOne('api::spieler.spieler', player.id, {
      populate: ['hauptteam', 'aushilfe_teams']
    });

    if (!(fullPlayer as any)?.hauptteam) {
      return;
    }

    // Ensure statistics exist for hauptteam
    const hauptteamStats = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
      filters: {
        spieler: player.id,
        saison: season.id,
        team: (fullPlayer as any).hauptteam.id
      }
    });

    if (!hauptteamStats || hauptteamStats.length === 0) {
      await strapi.entityService.create('api::spielerstatistik.spielerstatistik' as any, {
        data: {
          spieler: player.id,
          saison: season.id,
          team: (fullPlayer as any).hauptteam.id,
          tore: 0,
          spiele: 0,
          assists: 0,
          gelbe_karten: 0,
          rote_karten: 0,
          minuten_gespielt: 0
        }
      });
    }

    // Ensure statistics exist for aushilfe teams
    if ((fullPlayer as any).aushilfe_teams && (fullPlayer as any).aushilfe_teams.length > 0) {
      for (const team of (fullPlayer as any).aushilfe_teams) {
        const teamStats = await strapi.entityService.findMany('api::spielerstatistik.spielerstatistik' as any, {
          filters: {
            spieler: player.id,
            saison: season.id,
            team: team.id
          }
        });

        if (!teamStats || teamStats.length === 0) {
          await strapi.entityService.create('api::spielerstatistik.spielerstatistik' as any, {
            data: {
              spieler: player.id,
              saison: season.id,
              team: team.id,
              tore: 0,
              spiele: 0,
              assists: 0,
              gelbe_karten: 0,
              rote_karten: 0,
              minuten_gespielt: 0
            }
          });
        }
      }
    }

    strapi.log.info(`Team assignment changes processed for player ${player.vorname} ${player.nachname}`);
  } catch (error) {
    strapi.log.error('Error handling team assignment changes:', error);
  }
}