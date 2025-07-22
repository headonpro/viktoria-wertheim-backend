import AuditLoggerService from '../../../../services/audit-logger';
import AutomatedProcessingService from '../../../../services/automated-processing';

export default {
  async beforeCreate(event) {
    const { data } = event.params;
    
    // Validate match date is not in the past for new matches
    if (data.datum && new Date(data.datum) < new Date()) {
      // Allow past dates for historical data import
      console.warn('Match date is in the past - this may be historical data');
    }
    
    // Validate basic match data integrity
    await validateMatchDataIntegrity(data);
    
    // Validate JSON event structures
    await validateMatchEvents(data);
    
    // Validate player participation in events against team rosters
    if (data.torschuetzen || data.karten || data.wechsel) {
      await validatePlayerParticipationInEvents(data);
    }
    
    // Ensure default values for JSON fields
    if (!data.torschuetzen) data.torschuetzen = [];
    if (!data.karten) data.karten = [];
    if (!data.wechsel) data.wechsel = [];
  },

  async beforeUpdate(event) {
    const { data, where } = event.params;
    
    // Get current match data for validation
    const currentMatch = await strapi.entityService.findOne('api::spiel.spiel', where.id, {
      populate: ['unser_team', 'saison', 'liga', 'heimclub', 'auswaertsclub']
    });
    
    // Merge current data with updates for complete validation
    const mergedData = { ...currentMatch, ...data };
    
    // Validate basic match data integrity
    await validateMatchDataIntegrity(mergedData);
    
    // Validate JSON event structures if they're being updated
    if (data.torschuetzen || data.karten || data.wechsel) {
      await validateMatchEvents(data);
      await validatePlayerParticipationInEvents(mergedData);
    }
    
    // Validate status transitions
    if (data.status) {
      await validateStatusTransition(event);
    }
    
    // Validate final score consistency with events
    if (data.status === 'beendet' || mergedData.status === 'beendet') {
      await validateScoreConsistency(mergedData);
    }
  },

  async afterUpdate(event) {
    const { result, params } = event;
    
    // Get original data for audit logging
    const originalData = event.state?.originalData || {};
    
    // Log audit event for match update
    await AuditLoggerService.logDataChange(
      'api::spiel.spiel',
      result.id,
      'update',
      originalData,
      result,
      event.state?.user?.id
    );
    
    // If match is completed, trigger automated processing
    if (result.status === 'beendet') {
      try {
        const processingResult = await AutomatedProcessingService.processMatchCompletion(result.id);
        if (!processingResult.success) {
          strapi.log.error(`Match completion processing failed for match ${result.id}:`, processingResult.errors);
        } else {
          strapi.log.info(`Match completion processing successful for match ${result.id}`);
        }
      } catch (error) {
        strapi.log.error(`Error in automated match processing for match ${result.id}:`, error);
      }
    }
  },

  async afterCreate(event) {
    const { result } = event;
    
    // Log audit event for match creation
    await AuditLoggerService.logDataChange(
      'api::spiel.spiel',
      result.id,
      'create',
      null,
      result,
      event.state?.user?.id
    );
    
    // If match is created as completed, trigger automated processing
    if (result.status === 'beendet') {
      try {
        const processingResult = await AutomatedProcessingService.processMatchCompletion(result.id);
        if (!processingResult.success) {
          strapi.log.error(`Match completion processing failed for match ${result.id}:`, processingResult.errors);
        } else {
          strapi.log.info(`Match completion processing successful for match ${result.id}`);
        }
      } catch (error) {
        strapi.log.error(`Error in automated match processing for match ${result.id}:`, error);
      }
    }
  },

  async afterDelete(event) {
    const { result } = event;
    
    // Log audit event for match deletion
    await AuditLoggerService.logDataChange(
      'api::spiel.spiel',
      result.id,
      'delete',
      result,
      null,
      event.state?.user?.id
    );
    
    strapi.log.info(`Match deleted: ${result.id}`);
  }
};

/**
 * Validates basic match data integrity
 */
async function validateMatchDataIntegrity(data: any) {
  // Validate that home and away clubs are different
  if (data.heimclub && data.auswaertsclub && data.heimclub === data.auswaertsclub) {
    throw new Error('Heim- und Auswärtsverein müssen unterschiedlich sein');
  }

  // Validate that our team belongs to the correct club
  if (data.unser_team && (data.heimclub || data.auswaertsclub)) {
    const team = await strapi.entityService.findOne('api::team.team', data.unser_team, {
      populate: ['club']
    });

    if (team && (team as any).club) {
      const isHomeMatch = data.ist_heimspiel;
      const expectedClub = isHomeMatch ? data.heimclub : data.auswaertsclub;
      
      if (expectedClub && (team as any).club.id !== expectedClub) {
        throw new Error('Unser Team gehört nicht zum angegebenen Verein');
      }
    }
  }

  // Validate league and season consistency
  if (data.liga && data.saison) {
    const liga = await strapi.entityService.findOne('api::liga.liga', data.liga, {
      populate: ['saison']
    });

    if (liga && (liga as any).saison && (liga as any).saison.id !== data.saison) {
      throw new Error('Liga und Saison sind nicht konsistent');
    }
  }

  // Validate team belongs to the same league and season
  if (data.unser_team && data.liga && data.saison) {
    const team = await strapi.entityService.findOne('api::team.team', data.unser_team, {
      populate: ['liga', 'saison']
    });

    if (team) {
      if ((team as any).liga && (team as any).liga.id !== data.liga) {
        throw new Error('Team gehört nicht zur angegebenen Liga');
      }
      if ((team as any).saison && (team as any).saison.id !== data.saison) {
        throw new Error('Team gehört nicht zur angegebenen Saison');
      }
    }
  }

  // Validate final scores are non-negative
  if (data.tore_heim !== undefined && data.tore_heim < 0) {
    throw new Error('Heimtore können nicht negativ sein');
  }
  if (data.tore_auswaerts !== undefined && data.tore_auswaerts < 0) {
    throw new Error('Auswärtstore können nicht negativ sein');
  }
}

/**
 * Validates player participation in events against team rosters
 */
async function validatePlayerParticipationInEvents(data: any) {
  if (!data.unser_team) {
    return; // Cannot validate without team information
  }

  const playerIds = new Set<number>();

  // Collect all player IDs from events
  if (data.torschuetzen && Array.isArray(data.torschuetzen)) {
    data.torschuetzen.forEach((goal: any) => {
      playerIds.add(goal.spieler_id);
      if (goal.assist_spieler_id) {
        playerIds.add(goal.assist_spieler_id);
      }
    });
  }

  if (data.karten && Array.isArray(data.karten)) {
    data.karten.forEach((card: any) => {
      playerIds.add(card.spieler_id);
    });
  }

  if (data.wechsel && Array.isArray(data.wechsel)) {
    data.wechsel.forEach((sub: any) => {
      playerIds.add(sub.raus_id);
      playerIds.add(sub.rein_id);
    });
  }

  // Validate each player belongs to the team
  for (const playerId of playerIds) {
    const player = await strapi.entityService.findOne('api::spieler.spieler', playerId, {
      populate: ['hauptteam', 'aushilfe_teams']
    });

    if (!player) {
      throw new Error(`Spieler mit ID ${playerId} nicht gefunden`);
    }

    const isInTeam = (player as any).hauptteam?.id === data.unser_team || 
                     (player as any).aushilfe_teams?.some((team: any) => team.id === data.unser_team);

    if (!isInTeam) {
      throw new Error(`Spieler ${player.vorname} ${player.nachname} ist nicht dem teilnehmenden Team zugeordnet`);
    }
  }
}

/**
 * Validates final score consistency with goal events
 */
async function validateScoreConsistency(data: any) {
  if (data.tore_heim === undefined || data.tore_auswaerts === undefined) {
    return; // Cannot validate without final scores
  }

  if (!data.torschuetzen || !Array.isArray(data.torschuetzen)) {
    return; // No goal events to validate against
  }

  // Count goals from events
  let homeGoals = 0;
  let awayGoals = 0;

  for (const goal of data.torschuetzen) {
    // Get player to determine which team scored
    const player = await strapi.entityService.findOne('api::spieler.spieler', goal.spieler_id, {
      populate: ['hauptteam', 'aushilfe_teams']
    });

    if (!player) {
      continue; // Skip if player not found
    }

    // Determine if goal was scored by our team
    const isOurTeamGoal = (player as any).hauptteam?.id === data.unser_team || 
                          (player as any).aushilfe_teams?.some((team: any) => team.id === data.unser_team);

    if (isOurTeamGoal) {
      if (data.ist_heimspiel) {
        homeGoals++;
      } else {
        awayGoals++;
      }
    } else {
      // Goal by opponent
      if (data.ist_heimspiel) {
        awayGoals++;
      } else {
        homeGoals++;
      }
    }
  }

  // Check consistency (allow some tolerance for own goals, etc.)
  if (Math.abs(homeGoals - data.tore_heim) > 0 || Math.abs(awayGoals - data.tore_auswaerts) > 0) {
    strapi.log.warn(`Score inconsistency detected in match ${data.id}: Events suggest ${homeGoals}-${awayGoals}, but final score is ${data.tore_heim}-${data.tore_auswaerts}`);
  }
}

/**
 * Validates the structure of match events (goals, cards, substitutions)
 */
async function validateMatchEvents(data: any) {
  // Validate torschuetzen (goals) structure
  if (data.torschuetzen && Array.isArray(data.torschuetzen)) {
    data.torschuetzen.forEach((goal: any, index: number) => {
      if (!goal.spieler_id || typeof goal.spieler_id !== 'number') {
        throw new Error(`Goal ${index + 1}: spieler_id is required and must be a number`);
      }
      if (!goal.minute || typeof goal.minute !== 'number' || goal.minute < 1 || goal.minute > 120) {
        throw new Error(`Goal ${index + 1}: minute must be between 1 and 120`);
      }
      if (goal.typ && !['tor', 'eigentor', 'elfmeter'].includes(goal.typ)) {
        throw new Error(`Goal ${index + 1}: typ must be 'tor', 'eigentor', or 'elfmeter'`);
      }
      if (goal.assist_spieler_id && typeof goal.assist_spieler_id !== 'number') {
        throw new Error(`Goal ${index + 1}: assist_spieler_id must be a number`);
      }
    });
  }

  // Validate karten (cards) structure
  if (data.karten && Array.isArray(data.karten)) {
    data.karten.forEach((card: any, index: number) => {
      if (!card.spieler_id || typeof card.spieler_id !== 'number') {
        throw new Error(`Card ${index + 1}: spieler_id is required and must be a number`);
      }
      if (!card.minute || typeof card.minute !== 'number' || card.minute < 1 || card.minute > 120) {
        throw new Error(`Card ${index + 1}: minute must be between 1 and 120`);
      }
      if (!card.typ || !['gelb', 'rot', 'gelb-rot'].includes(card.typ)) {
        throw new Error(`Card ${index + 1}: typ must be 'gelb', 'rot', or 'gelb-rot'`);
      }
      if (card.grund && typeof card.grund !== 'string') {
        throw new Error(`Card ${index + 1}: grund must be a string`);
      }
    });
  }

  // Validate wechsel (substitutions) structure
  if (data.wechsel && Array.isArray(data.wechsel)) {
    data.wechsel.forEach((sub: any, index: number) => {
      if (!sub.raus_id || typeof sub.raus_id !== 'number') {
        throw new Error(`Substitution ${index + 1}: raus_id is required and must be a number`);
      }
      if (!sub.rein_id || typeof sub.rein_id !== 'number') {
        throw new Error(`Substitution ${index + 1}: rein_id is required and must be a number`);
      }
      if (!sub.minute || typeof sub.minute !== 'number' || sub.minute < 1 || sub.minute > 120) {
        throw new Error(`Substitution ${index + 1}: minute must be between 1 and 120`);
      }
      if (sub.raus_id === sub.rein_id) {
        throw new Error(`Substitution ${index + 1}: player cannot substitute themselves`);
      }
    });
  }
}



/**
 * Validates status transitions to prevent invalid state changes
 */
async function validateStatusTransition(event: any) {
  const { data, where } = event.params;
  const newStatus = data.status;
  
  // Get current match data
  const currentMatch = await strapi.entityService.findOne('api::spiel.spiel', where.id);
  
  if (!currentMatch) {
    throw new Error('Match not found');
  }
  
  const currentStatus = currentMatch.status;
  
  // Define valid status transitions
  const validTransitions = {
    'geplant': ['laufend', 'abgesagt'],
    'laufend': ['beendet', 'abgesagt'],
    'beendet': [], // Completed matches cannot change status
    'abgesagt': ['geplant'] // Cancelled matches can be rescheduled
  };
  
  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
  }
  
  // Additional validation for completed matches
  if (newStatus === 'beendet') {
    if (data.tore_heim === undefined || data.tore_auswaerts === undefined) {
      throw new Error('Final score is required when marking match as completed');
    }
  }
}

