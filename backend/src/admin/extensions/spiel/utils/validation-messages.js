/**
 * Validation messages for Spiel admin interface
 */

export const VALIDATION_MESSAGES = {
  // Club validation messages
  CLUB_REQUIRED: 'Club-Auswahl ist erforderlich',
  CLUB_AGAINST_ITSELF: 'Ein Club kann nicht gegen sich selbst spielen',
  CLUB_NOT_IN_LIGA: 'Der ausgewählte Club ist nicht in dieser Liga',
  CLUB_INACTIVE: 'Der ausgewählte Club ist nicht aktiv',
  CLUB_NOT_FOUND: 'Der ausgewählte Club wurde nicht gefunden',
  
  // Enhanced club validation messages
  CLUB_NOT_FOUND_OR_INACTIVE: 'Club nicht gefunden oder inaktiv',
  DUPLICATE_VIKTORIA_MAPPING: 'Viktoria-Clubs mit derselben Team-Zuordnung können nicht gegeneinander spielen',
  VIKTORIA_VS_VIKTORIA: 'Zwei Viktoria-Vereine spielen gegeneinander - bitte prüfen Sie die Eingabe',
  SIMILAR_CLUB_NAMES: 'Club-Namen sind sehr ähnlich - bitte prüfen Sie die Auswahl',
  
  // Real-time validation messages
  CLUB_SELECTION_INVALID: 'Die aktuelle Club-Auswahl ist ungültig',
  LIGA_FILTER_ACTIVE: 'Clubs werden nach Liga gefiltert',
  REAL_TIME_VALIDATION_FAILED: 'Echtzeitvalidierung fehlgeschlagen',
  API_VALIDATION_UNAVAILABLE: 'Erweiterte Validierung nicht verfügbar',
  
  // Team validation messages (legacy)
  TEAM_REQUIRED: 'Team-Auswahl ist erforderlich',
  TEAM_AGAINST_ITSELF: 'Ein Team kann nicht gegen sich selbst spielen',
  
  // General validation messages
  TEAM_OR_CLUB_REQUIRED: 'Entweder Team-Felder oder Club-Felder müssen ausgefüllt sein',
  INCOMPLETE_CLUB_DATA: 'Beide Club-Felder (Heim und Gast) müssen ausgefüllt sein',
  INCOMPLETE_TEAM_DATA: 'Beide Team-Felder (Heim und Gast) müssen ausgefüllt sein',
  
  // Score validation messages
  SCORES_REQUIRED_FOR_COMPLETED: 'Tore sind für beendete Spiele erforderlich',
  NEGATIVE_SCORE: 'Tore können nicht negativ sein',
  HIGH_SCORE_VALUE: 'Ungewöhnlich hohe Toranzahl - bitte prüfen Sie die Eingabe',
  UNUSUAL_SCORE_DIFFERENCE: 'Ungewöhnlich hohe Tordifferenz - bitte prüfen Sie das Ergebnis',
  
  // Status validation messages
  INVALID_STATUS_TRANSITION: 'Dieser Statuswechsel ist nicht erlaubt',
  
  // Liga validation messages
  LIGA_REQUIRED_FOR_CLUB_FILTER: 'Wählen Sie zuerst eine Liga aus, um Clubs zu filtern',
  CLUB_IN_MULTIPLE_LEAGUES: 'Club spielt in mehreren Ligen',
  
  // Date validation messages
  OLD_GAME_DATE: 'Spieltermin liegt weit in der Vergangenheit',
  FUTURE_GAME_DATE: 'Spieltermin liegt weit in der Zukunft',
  
  // General error messages
  VALIDATION_ERROR: 'Allgemeiner Validierungsfehler',
  GAME_NOT_FOUND: 'Spiel nicht gefunden',
};

export const VALIDATION_HINTS = {
  CLUB_SELECTION: 'Clubs werden automatisch nach der ausgewählten Liga gefiltert',
  TEAM_DEPRECATED: 'Team-Felder sind veraltet. Verwenden Sie stattdessen Club-Felder.',
  MIXED_DATA_WARNING: 'Sowohl Team- als auch Club-Daten vorhanden. Club-Daten haben Vorrang.',
  AUTOCOMPLETE_HELP: 'Verwenden Sie die Suchfunktion, um Clubs schnell zu finden',
  REAL_TIME_VALIDATION: 'Validierung erfolgt automatisch bei der Eingabe',
  LIGA_FILTER_ACTIVE: 'Nur Clubs der ausgewählten Liga werden angezeigt',
  VIKTORIA_CLUB_INFO: 'Viktoria-Vereine haben spezielle Validierungsregeln',
  MULTIPLE_LEAGUES_INFO: 'Clubs in mehreren Ligen werden entsprechend markiert',
  CLUB_STATUS_INFO: 'Nur aktive Clubs können für neue Spiele ausgewählt werden',
  
  // Enhanced hints for admin panel
  ENHANCED_VALIDATION: 'Erweiterte Validierung mit API-Unterstützung aktiv',
  CONFIRMATION_REQUIRED: 'Bestätigung erforderlich für kritische Operationen',
  VALIDATION_DETAILS: 'Detaillierte Validierungsinformationen verfügbar',
  LEAGUE_BASED_FILTERING: 'Liga-basierte Filterung für bessere Club-Auswahl',
};

/**
 * Get user-friendly validation message for error code
 */
export const getValidationMessage = (errorCode, context = {}) => {
  const message = VALIDATION_MESSAGES[errorCode];
  
  if (!message) {
    return `Validierungsfehler: ${errorCode}`;
  }
  
  // Add context-specific information if available
  if (context.clubName) {
    return message.replace('Club', `Club "${context.clubName}"`);
  }
  
  if (context.teamName) {
    return message.replace('Team', `Team "${context.teamName}"`);
  }
  
  return message;
};

/**
 * Get validation hint for field
 */
export const getValidationHint = (fieldName, context = {}) => {
  switch (fieldName) {
    case 'heim_club':
    case 'gast_club':
      if (context.hasLiga) {
        return VALIDATION_HINTS.CLUB_SELECTION;
      }
      return VALIDATION_HINTS.LIGA_REQUIRED_FOR_CLUB_FILTER;
      
    case 'heim_team':
    case 'gast_team':
      return VALIDATION_HINTS.TEAM_DEPRECATED;
      
    default:
      return null;
  }
};