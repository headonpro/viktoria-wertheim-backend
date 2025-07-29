/**
 * tabellen-eintrag service
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreService('api::tabellen-eintrag.tabellen-eintrag', ({ strapi }) => ({
  /**
   * Find entries with optimized club and logo population
   */
  async findWithClubData(params: any = {}) {
    // Ensure proper population of club relations and logos
    const populateConfig = {
      club: {
        populate: ['logo']
      },
      team: {
        populate: ['teamfoto']
      },
      liga: true,
      team_logo: true,
      ...(params && params.populate ? params.populate : {})
    };

    const entries = await strapi.entityService.findMany('api::tabellen-eintrag.tabellen-eintrag', {
      ...params,
      populate: populateConfig
    });

    // Process entries to ensure consistent data
    return entries.map(entry => this.processEntryForClubData(entry));
  },

  /**
   * Find one entry with optimized club and logo population
   */
  async findOneWithClubData(id, params: any = {}) {
    const populateConfig = {
      club: {
        populate: ['logo']
      },
      team: {
        populate: ['teamfoto']
      },
      liga: true,
      team_logo: true,
      ...(params && params.populate ? params.populate : {})
    };

    const entry = await strapi.entityService.findOne('api::tabellen-eintrag.tabellen-eintrag', id, {
      ...params,
      populate: populateConfig
    });

    return entry ? this.processEntryForClubData(entry) : null;
  },

  /**
   * Process entry to ensure club data consistency and logo handling
   */
  processEntryForClubData(entry) {
    // Ensure team_name uses club name when available
    if (entry.club && entry.club.name) {
      entry.team_name = entry.club.name;
    }

    // Add computed logo field with fallback logic
    entry.computed_logo = this.getEntryLogo(entry);

    // Add club metadata for frontend
    if (entry.club) {
      entry.club_metadata = {
        is_viktoria: entry.club.club_typ === 'viktoria_verein',
        team_mapping: entry.club.viktoria_team_mapping,
        has_logo: !!entry.club.logo
      };
    }

    return entry;
  },

  /**
   * Get logo for entry with comprehensive fallback logic
   */
  getEntryLogo(entry) {
    // Priority 1: Club logo (preferred)
    if (entry.club && entry.club.logo) {
      return {
        id: entry.club.logo.id,
        url: entry.club.logo.url,
        alternativeText: entry.club.logo.alternativeText || `${entry.club.name} Logo`,
        width: entry.club.logo.width,
        height: entry.club.logo.height,
        source: 'club',
        entity_name: entry.club.name
      };
    }

    // Priority 2: Team logo field (legacy support)
    if (entry.team_logo) {
      return {
        id: entry.team_logo.id,
        url: entry.team_logo.url,
        alternativeText: entry.team_logo.alternativeText || `${entry.team_name} Logo`,
        width: entry.team_logo.width,
        height: entry.team_logo.height,
        source: 'team_logo',
        entity_name: entry.team_name
      };
    }

    // Priority 3: Team logo (fallback)
    if (entry.team && entry.team.logo) {
      return {
        id: entry.team.logo.id,
        url: entry.team.logo.url,
        alternativeText: entry.team.logo.alternativeText || `${entry.team.name} Logo`,
        width: entry.team.logo.width,
        height: entry.team.logo.height,
        source: 'team',
        entity_name: entry.team.name
      };
    }

    // No logo available
    return null;
  },

  /**
   * Update entry with club data validation
   */
  async updateWithClubValidation(id, data) {
    // Validate club data if provided
    if (data.club) {
      const club = await strapi.entityService.findOne('api::club.club', data.club);
      if (club && !data.team_name) {
        data.team_name = club.name;
      }
    }

    const updatedEntry = await strapi.entityService.update('api::tabellen-eintrag.tabellen-eintrag', id, {
      data,
      populate: {
        club: {
          populate: ['logo']
        },
        team: {
        populate: ['teamfoto']
      },
        liga: true,
        team_logo: true
      }
    });

    return this.processEntryForClubData(updatedEntry);
  },

  /**
   * Create entry with club data validation
   */
  async createWithClubValidation(data) {
    // Validate and set team_name from club if provided
    if (data.club) {
      const club = await strapi.entityService.findOne('api::club.club', data.club);
      if (club && !data.team_name) {
        data.team_name = club.name;
      }
    }

    const newEntry = await strapi.entityService.create('api::tabellen-eintrag.tabellen-eintrag', {
      data,
      populate: {
        club: {
          populate: ['logo']
        },
        team: {
        populate: ['teamfoto']
      },
        liga: true,
        team_logo: true
      }
    });

    return this.processEntryForClubData(newEntry);
  }
}));