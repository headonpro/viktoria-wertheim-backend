/**
 * Validation controller for Spiel entities
 * Provides validation endpoints for admin panel
 */

'use strict';

module.exports = {
  /**
   * Validate game data before save/update
   * POST /api/spiel/validate
   */
  async validateGame(ctx) {
    try {
      const gameData = ctx.request.body;
      
      // Get validation service
      const gameValidationService = strapi.service('api::spiel.game-validation');
      
      // Perform comprehensive validation
      const validation = await gameValidationService.validateClubGame(gameData);
      
      // Get user-friendly summary
      const summary = gameValidationService.getValidationSummary(validation);
      
      ctx.body = {
        data: {
          ...validation,
          summary
        }
      };
    } catch (error) {
      strapi.log.error('Game validation error:', error);
      ctx.badRequest('Validation failed', {
        error: error.message,
        details: error.details || {}
      });
    }
  },

  /**
   * Validate club selection for specific liga
   * GET /api/spiel/validate-club/:clubId/liga/:ligaId
   */
  async validateClubInLiga(ctx) {
    try {
      const { clubId, ligaId } = ctx.params;
      
      const gameValidationService = strapi.service('api::spiel.game-validation');
      
      // Validate club exists and is in liga
      const validation = await gameValidationService.validateClubsInLiga(
        clubId,
        clubId, // Same club for both to just check liga membership
        ligaId
      );
      
      ctx.body = {
        data: validation
      };
    } catch (error) {
      strapi.log.error('Club-Liga validation error:', error);
      ctx.badRequest('Club-Liga validation failed', {
        error: error.message
      });
    }
  },

  /**
   * Validate that two clubs can play against each other
   * POST /api/spiel/validate-clubs
   */
  async validateClubMatch(ctx) {
    try {
      const { heimClubId, gastClubId, ligaId } = ctx.request.body;
      
      if (!heimClubId || !gastClubId) {
        return ctx.badRequest('Both club IDs are required');
      }
      
      const gameValidationService = strapi.service('api::spiel.game-validation');
      
      // Validate clubs can play against each other
      const validations = await Promise.all([
        gameValidationService.validateClubsExistAndActive(heimClubId, gastClubId),
        gameValidationService.validateClubsNotSame(heimClubId, gastClubId),
        ligaId ? gameValidationService.validateClubsInLiga(heimClubId, gastClubId, ligaId) : { isValid: true, errors: [], warnings: [] }
      ]);
      
      // Combine validation results
      const combinedErrors = validations.flatMap(v => v.errors || []);
      const combinedWarnings = validations.flatMap(v => v.warnings || []);
      
      const result = {
        isValid: combinedErrors.length === 0,
        errors: combinedErrors,
        warnings: combinedWarnings,
        details: {
          clubExistenceCheck: validations[0],
          selfPlayCheck: validations[1],
          ligaCheck: validations[2]
        }
      };
      
      ctx.body = {
        data: result
      };
    } catch (error) {
      strapi.log.error('Club match validation error:', error);
      ctx.badRequest('Club match validation failed', {
        error: error.message
      });
    }
  },

  /**
   * Get validation rules and hints for admin panel
   * GET /api/spiel/validation-rules
   */
  async getValidationRules(ctx) {
    try {
      const rules = {
        clubRules: [
          {
            rule: 'CLUB_REQUIRED',
            description: 'Beide Club-Felder (Heim und Gast) müssen ausgefüllt sein',
            severity: 'error'
          },
          {
            rule: 'CLUB_AGAINST_ITSELF',
            description: 'Ein Club kann nicht gegen sich selbst spielen',
            severity: 'error'
          },
          {
            rule: 'CLUB_ACTIVE',
            description: 'Beide Clubs müssen aktiv sein',
            severity: 'error'
          },
          {
            rule: 'CLUB_IN_LIGA',
            description: 'Beide Clubs müssen in der ausgewählten Liga spielen',
            severity: 'error'
          },
          {
            rule: 'VIKTORIA_MAPPING',
            description: 'Viktoria-Clubs mit derselben Team-Zuordnung können nicht gegeneinander spielen',
            severity: 'error'
          }
        ],
        gameRules: [
          {
            rule: 'SCORES_FOR_COMPLETED',
            description: 'Beendete Spiele müssen Tore haben',
            severity: 'error'
          },
          {
            rule: 'POSITIVE_SCORES',
            description: 'Tore müssen positive Zahlen sein',
            severity: 'error'
          },
          {
            rule: 'REASONABLE_SCORES',
            description: 'Sehr hohe Tore oder Tordifferenzen werden geprüft',
            severity: 'warning'
          }
        ],
        hints: [
          'Clubs werden automatisch nach Liga gefiltert',
          'Verwenden Sie die Suchfunktion für schnelle Club-Auswahl',
          'Validierung erfolgt automatisch bei der Eingabe',
          'Warnungen können ignoriert werden, Fehler müssen behoben werden'
        ]
      };
      
      ctx.body = {
        data: rules
      };
    } catch (error) {
      strapi.log.error('Error getting validation rules:', error);
      ctx.badRequest('Failed to get validation rules', {
        error: error.message
      });
    }
  },

  /**
   * Validate game creation data
   * POST /api/spiel/validate-creation
   */
  async validateGameCreation(ctx) {
    try {
      const gameData = ctx.request.body;
      
      const gameValidationService = strapi.service('api::spiel.game-validation');
      
      // Validate game creation
      const validation = await gameValidationService.validateGameCreation(gameData);
      
      // Add creation-specific checks
      if (validation.isValid) {
        // Check for duplicate games
        const existingGames = await strapi.entityService.findMany('api::spiel.spiel', {
          filters: {
            $and: [
              { heim_club: gameData.heim_club },
              { gast_club: gameData.gast_club },
              { liga: gameData.liga },
              { saison: gameData.saison },
              { spieltag: gameData.spieltag }
            ]
          }
        });
        
        if (existingGames.length > 0) {
          validation.warnings = validation.warnings || [];
          validation.warnings.push({
            field: 'duplicate',
            message: 'Ein ähnliches Spiel existiert bereits',
            code: 'DUPLICATE_GAME_WARNING'
          });
        }
      }
      
      const summary = gameValidationService.getValidationSummary(validation);
      
      ctx.body = {
        data: {
          ...validation,
          summary
        }
      };
    } catch (error) {
      strapi.log.error('Game creation validation error:', error);
      ctx.badRequest('Game creation validation failed', {
        error: error.message
      });
    }
  },

  /**
   * Validate game update data
   * PUT /api/spiel/validate-update/:id
   */
  async validateGameUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const updateData = ctx.request.body;
      
      const gameValidationService = strapi.service('api::spiel.game-validation');
      
      // Validate game update
      const validation = await gameValidationService.validateGameUpdate(updateData, parseInt(id));
      
      const summary = gameValidationService.getValidationSummary(validation);
      
      ctx.body = {
        data: {
          ...validation,
          summary
        }
      };
    } catch (error) {
      strapi.log.error('Game update validation error:', error);
      ctx.badRequest('Game update validation failed', {
        error: error.message
      });
    }
  }
};