/**
 * team controller - Ultra-simplified version with enhanced error handling
 */

import { factories } from '@strapi/strapi';
import { ValidationService } from '../../../services/ValidationService';

export default factories.createCoreController('api::team.team', ({ strapi }) => ({
  /**
   * Find teams with populated relationships
   */
  async find(ctx) {
    try {
      const { query } = ctx;
      
      strapi.log.debug('Team.find: Fetching teams with query', { query });
      
      // Use custom service method for populated data
      const teams = await strapi.service('api::team.team').findWithPopulate(query);
      
      strapi.log.debug('Team.find: Successfully fetched teams', { count: teams?.length || 0 });
      
      return teams;
    } catch (error) {
      strapi.log.error('Team.find: Error fetching teams', {
        error: error.message,
        query: ctx.query
      });
      
      // Let the global error handler format the response
      throw error;
    }
  },

  /**
   * Get teams by league with enhanced validation and error handling
   */
  async byLeague(ctx) {
    try {
      const { ligaId } = ctx.query;
      
      strapi.log.debug('Team.byLeague: Request received', { ligaId, query: ctx.query });
      
      // Validate required parameter
      if (!ligaId) {
        strapi.log.warn('Team.byLeague: Missing required parameter ligaId');
        return ctx.badRequest(
          ValidationService.createErrorResponse(
            'ligaId parameter is required',
            'MISSING_PARAMETER'
          )
        );
      }
      
      // Validate ligaId is a valid number
      const parsedLigaId = parseInt(ligaId as string);
      if (isNaN(parsedLigaId) || parsedLigaId <= 0) {
        strapi.log.warn('Team.byLeague: Invalid ligaId parameter', { ligaId });
        return ctx.badRequest(
          ValidationService.createErrorResponse(
            'ligaId must be a valid positive number',
            'INVALID_PARAMETER'
          )
        );
      }
      
      const teams = await strapi.service('api::team.team').findByLeague(
        parsedLigaId,
        ctx.query
      );
      
      strapi.log.debug('Team.byLeague: Successfully fetched teams', { 
        ligaId: parsedLigaId, 
        count: teams?.length || 0 
      });
      
      return teams;
    } catch (error) {
      strapi.log.error('Team.byLeague: Error fetching teams by league', {
        error: error.message,
        ligaId: ctx.query.ligaId,
        query: ctx.query
      });
      
      // Let the global error handler format the response
      throw error;
    }
  },

  /**
   * Create team with validation
   */
  async create(ctx) {
    try {
      const { data } = ctx.request.body;
      
      strapi.log.debug('Team.create: Creating new team', { data });
      
      // Validate required fields
      const requiredFields = ['name', 'liga', 'saison'];
      const validation = ValidationService.validateRequiredWithDetails(data, requiredFields);
      
      if (!validation.isValid) {
        strapi.log.warn('Team.create: Validation failed', { errors: validation.errors });
        return ctx.badRequest(ValidationService.formatErrorResponse(validation.errors));
      }
      
      // Check name uniqueness within the same league and season
      const isUnique = await ValidationService.validateUnique(
        'api::team.team',
        'name',
        data.name
      );
      
      if (!isUnique) {
        strapi.log.warn('Team.create: Team name already exists', { name: data.name });
        return ctx.badRequest(
          ValidationService.createErrorResponse(
            `Team name '${data.name}' already exists`,
            'DUPLICATE_NAME'
          )
        );
      }
      
      // Create the team
      const team = await strapi.entityService.create('api::team.team', {
        data,
        populate: ['liga', 'saison']
      });
      
      strapi.log.info('Team.create: Team created successfully', { 
        teamId: team.id, 
        name: team.name 
      });
      
      return team;
    } catch (error) {
      strapi.log.error('Team.create: Error creating team', {
        error: error.message,
        data: ctx.request.body?.data
      });
      
      throw error;
    }
  },

  /**
   * Update team with validation
   */
  async update(ctx) {
    try {
      const { id } = ctx.params;
      const { data } = ctx.request.body;
      
      strapi.log.debug('Team.update: Updating team', { id, data });
      
      // Validate ID
      const teamId = parseInt(id);
      if (isNaN(teamId) || teamId <= 0) {
        return ctx.badRequest(
          ValidationService.createErrorResponse(
            'Invalid team ID',
            'INVALID_ID'
          )
        );
      }
      
      // Check if team exists
      const existingTeam = await strapi.entityService.findOne('api::team.team', teamId);
      if (!existingTeam) {
        return ctx.notFound(
          ValidationService.createErrorResponse(
            'Team not found',
            'NOT_FOUND',
            404
          )
        );
      }
      
      // Validate name uniqueness if name is being updated
      if (data.name && data.name !== existingTeam.name) {
        const isUnique = await ValidationService.validateUnique(
          'api::team.team',
          'name',
          data.name,
          teamId
        );
        
        if (!isUnique) {
          return ctx.badRequest(
            ValidationService.createErrorResponse(
              `Team name '${data.name}' already exists`,
              'DUPLICATE_NAME'
            )
          );
        }
      }
      
      // Update the team
      const updatedTeam = await strapi.entityService.update('api::team.team', teamId, {
        data,
        populate: ['liga', 'saison']
      });
      
      strapi.log.info('Team.update: Team updated successfully', { 
        teamId, 
        name: updatedTeam.name 
      });
      
      return updatedTeam;
    } catch (error) {
      strapi.log.error('Team.update: Error updating team', {
        error: error.message,
        id: ctx.params.id,
        data: ctx.request.body?.data
      });
      
      throw error;
    }
  }
}));