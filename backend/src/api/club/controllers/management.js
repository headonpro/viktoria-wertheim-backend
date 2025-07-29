'use strict';

/**
 * Club management controller for admin panel operations
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::club.club', ({ strapi }) => ({
  /**
   * Export all clubs with their relationships
   */
  async export(ctx) {
    try {
      const clubs = await strapi.entityService.findMany('api::club.club', {
        populate: ['logo', 'ligen'],
        sort: 'name:asc'
      });

      const exportData = clubs.map(club => ({
        name: club.name,
        kurz_name: club.kurz_name,
        club_typ: club.club_typ,
        viktoria_team_mapping: club.viktoria_team_mapping,
        gruendungsjahr: club.gruendungsjahr,
        vereinsfarben: club.vereinsfarben,
        heimstadion: club.heimstadion,
        adresse: club.adresse,
        website: club.website,
        aktiv: club.aktiv,
        ligen: club.ligen?.map(liga => liga.name) || [],
        logo_url: club.logo?.url || null
      }));

      ctx.set('Content-Type', 'application/json');
      ctx.set('Content-Disposition', `attachment; filename="clubs-export-${new Date().toISOString().split('T')[0]}.json"`);
      
      return exportData;
    } catch (error) {
      ctx.throw(500, `Export failed: ${error.message}`);
    }
  },

  /**
   * Import clubs from JSON data
   */
  async import(ctx) {
    try {
      const { data } = ctx.request.body;
      
      if (!Array.isArray(data)) {
        return ctx.badRequest('Data must be an array');
      }

      const results = {
        total: data.length,
        success: 0,
        failed: 0,
        errors: []
      };

      // Process each club
      for (let i = 0; i < data.length; i++) {
        const clubData = data[i];
        
        try {
          // Validate required fields
          if (!clubData.name || !clubData.club_typ) {
            throw new Error('Name and club_typ are required');
          }

          // Handle liga relationships
          let ligenIds = [];
          if (clubData.ligen && Array.isArray(clubData.ligen)) {
            const ligen = await strapi.entityService.findMany('api::liga.liga', {
              filters: { name: { $in: clubData.ligen } }
            });
            ligenIds = ligen.map(liga => liga.id);
          }

          // Create club
          const club = await strapi.entityService.create('api::club.club', {
            data: {
              name: clubData.name,
              kurz_name: clubData.kurz_name,
              club_typ: clubData.club_typ,
              viktoria_team_mapping: clubData.viktoria_team_mapping,
              gruendungsjahr: clubData.gruendungsjahr,
              vereinsfarben: clubData.vereinsfarben,
              heimstadion: clubData.heimstadion,
              adresse: clubData.adresse,
              website: clubData.website,
              aktiv: clubData.aktiv !== undefined ? clubData.aktiv : true,
              ligen: ligenIds
            }
          });

          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      ctx.throw(500, `Import failed: ${error.message}`);
    }
  },

  /**
   * Bulk update clubs (activate/deactivate, assign to liga, etc.)
   */
  async bulkUpdate(ctx) {
    try {
      const { clubIds, updates } = ctx.request.body;
      
      if (!Array.isArray(clubIds) || clubIds.length === 0) {
        return ctx.badRequest('Club IDs array is required');
      }

      if (!updates || typeof updates !== 'object') {
        return ctx.badRequest('Updates object is required');
      }

      const results = {
        total: clubIds.length,
        success: 0,
        failed: 0,
        errors: []
      };

      // Process each club
      for (const clubId of clubIds) {
        try {
          await strapi.entityService.update('api::club.club', clubId, {
            data: updates
          });
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push(`Club ${clubId}: ${error.message}`);
        }
      }

      return results;
    } catch (error) {
      ctx.throw(500, `Bulk update failed: ${error.message}`);
    }
  },

  /**
   * Get club statistics for dashboard
   */
  async statistics(ctx) {
    try {
      const [
        totalClubs,
        viktoriaClubs,
        gegnerClubs,
        activeClubs,
        inactiveClubs,
        clubsWithLogos,
        clubsWithoutLogos
      ] = await Promise.all([
        strapi.entityService.count('api::club.club'),
        strapi.entityService.count('api::club.club', {
          filters: { club_typ: 'viktoria_verein' }
        }),
        strapi.entityService.count('api::club.club', {
          filters: { club_typ: 'gegner_verein' }
        }),
        strapi.entityService.count('api::club.club', {
          filters: { aktiv: true }
        }),
        strapi.entityService.count('api::club.club', {
          filters: { aktiv: false }
        }),
        strapi.entityService.count('api::club.club', {
          filters: { logo: { $notNull: true } }
        }),
        strapi.entityService.count('api::club.club', {
          filters: { logo: { $null: true } }
        })
      ]);

      return {
        total: totalClubs,
        byType: {
          viktoria: viktoriaClubs,
          gegner: gegnerClubs
        },
        byStatus: {
          active: activeClubs,
          inactive: inactiveClubs
        },
        byLogo: {
          withLogo: clubsWithLogos,
          withoutLogo: clubsWithoutLogos
        }
      };
    } catch (error) {
      ctx.throw(500, `Statistics failed: ${error.message}`);
    }
  },

  /**
   * Validate club data integrity
   */
  async validateIntegrity(ctx) {
    try {
      const clubs = await strapi.entityService.findMany('api::club.club', {
        populate: ['ligen']
      });

      const issues = [];

      clubs.forEach(club => {
        // Check viktoria team mapping consistency
        if (club.club_typ === 'viktoria_verein' && !club.viktoria_team_mapping) {
          issues.push({
            type: 'missing_team_mapping',
            clubId: club.id,
            clubName: club.name,
            message: 'Viktoria-Verein ohne Team-Zuordnung'
          });
        }

        // Check duplicate team mappings
        if (club.viktoria_team_mapping) {
          const duplicates = clubs.filter(c => 
            c.id !== club.id && 
            c.viktoria_team_mapping === club.viktoria_team_mapping
          );
          
          if (duplicates.length > 0) {
            issues.push({
              type: 'duplicate_team_mapping',
              clubId: club.id,
              clubName: club.name,
              message: `Doppelte Team-Zuordnung: ${club.viktoria_team_mapping}`,
              duplicates: duplicates.map(d => ({ id: d.id, name: d.name }))
            });
          }
        }

        // Check liga assignments
        if (!club.ligen || club.ligen.length === 0) {
          issues.push({
            type: 'no_liga_assignment',
            clubId: club.id,
            clubName: club.name,
            message: 'Verein ist keiner Liga zugeordnet'
          });
        }

        // Check name length
        if (club.name.length < 2 || club.name.length > 100) {
          issues.push({
            type: 'invalid_name_length',
            clubId: club.id,
            clubName: club.name,
            message: 'Vereinsname hat ungültige Länge'
          });
        }
      });

      return {
        totalClubs: clubs.length,
        issuesFound: issues.length,
        issues: issues
      };
    } catch (error) {
      ctx.throw(500, `Validation failed: ${error.message}`);
    }
  }
}));