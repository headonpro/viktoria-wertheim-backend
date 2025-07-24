/**
 * Data Integrity Controller
 * 
 * API endpoints for running data consistency validations
 */

import DataIntegrityService from '../../../services/data-integrity';

export default {
  /**
   * Run comprehensive data integrity validation
   */
  async validateAll(ctx) {
    try {
      const options = {
        checkBidirectional: ctx.query.checkBidirectional !== 'false',
        validateOrphans: ctx.query.validateOrphans !== 'false',
        checkConstraints: ctx.query.checkConstraints !== 'false'
      };

      const integrityService = new DataIntegrityService();
      const result = await integrityService.validateAllData(options);

      ctx.body = {
        success: result.isValid,
        data: result,
        message: result.isValid ? 'All data integrity checks passed' : 'Data integrity issues found'
      };

      // Set appropriate HTTP status
      ctx.status = result.isValid ? 200 : 422;

    } catch (error) {
      strapi.log.error('Data integrity validation failed:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Internal server error during validation',
        message: error.message
      };
    }
  },

  /**
   * Validate team relations specifically
   */
  async validateTeams(ctx) {
    try {
      const options = {
        checkBidirectional: ctx.query.checkBidirectional !== 'false',
        validateOrphans: ctx.query.validateOrphans !== 'false',
        checkConstraints: ctx.query.checkConstraints !== 'false'
      };

      const integrityService = new DataIntegrityService();
      const result = await integrityService.validateTeamRelations(options);

      ctx.body = {
        success: result.isValid,
        data: result,
        message: result.isValid ? 'Team validation passed' : 'Team validation issues found'
      };

      ctx.status = result.isValid ? 200 : 422;

    } catch (error) {
      strapi.log.error('Team validation failed:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Internal server error during team validation',
        message: error.message
      };
    }
  },

  /**
   * Validate spiel relations specifically
   */
  async validateSpiele(ctx) {
    try {
      const options = {
        checkBidirectional: ctx.query.checkBidirectional !== 'false',
        validateOrphans: ctx.query.validateOrphans !== 'false',
        checkConstraints: ctx.query.checkConstraints !== 'false'
      };

      const integrityService = new DataIntegrityService();
      const result = await integrityService.validateSpielRelations(options);

      ctx.body = {
        success: result.isValid,
        data: result,
        message: result.isValid ? 'Spiel validation passed' : 'Spiel validation issues found'
      };

      ctx.status = result.isValid ? 200 : 422;

    } catch (error) {
      strapi.log.error('Spiel validation failed:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Internal server error during spiel validation',
        message: error.message
      };
    }
  },

  /**
   * Validate spieler relations specifically
   */
  async validateSpielers(ctx) {
    try {
      const options = {
        checkBidirectional: ctx.query.checkBidirectional !== 'false',
        validateOrphans: ctx.query.validateOrphans !== 'false',
        checkConstraints: ctx.query.checkConstraints !== 'false'
      };

      const integrityService = new DataIntegrityService();
      const result = await integrityService.validateSpielerRelations(options);

      ctx.body = {
        success: result.isValid,
        data: result,
        message: result.isValid ? 'Spieler validation passed' : 'Spieler validation issues found'
      };

      ctx.status = result.isValid ? 200 : 422;

    } catch (error) {
      strapi.log.error('Spieler validation failed:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Internal server error during spieler validation',
        message: error.message
      };
    }
  },

  /**
   * Get data statistics for monitoring
   */
  async getStatistics(ctx) {
    try {
      const integrityService = new DataIntegrityService();
      const stats = await integrityService.getDataStatistics();

      ctx.body = {
        success: true,
        data: stats,
        message: 'Data statistics retrieved successfully'
      };

    } catch (error) {
      strapi.log.error('Failed to get data statistics:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Internal server error getting statistics',
        message: error.message
      };
    }
  },

  /**
   * Check for mannschaft references (should be none after consolidation)
   */
  async checkMannschaftRemoval(ctx) {
    try {
      const integrityService = new DataIntegrityService();
      const result = await integrityService.validateMannschaftRemoval();

      ctx.body = {
        success: result.isValid,
        data: result,
        message: result.isValid ? 'Mannschaft consolidation verified' : 'Mannschaft references still found'
      };

      ctx.status = result.isValid ? 200 : 422;

    } catch (error) {
      strapi.log.error('Mannschaft removal check failed:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        error: 'Internal server error during mannschaft check',
        message: error.message
      };
    }
  }
};