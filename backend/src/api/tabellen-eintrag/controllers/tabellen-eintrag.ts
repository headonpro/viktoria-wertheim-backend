/**
 * tabellen-eintrag controller
 */

import { factories } from '@strapi/strapi'

// Utility functions for processing entry data
function processEntryData(entry: any) {
  // Ensure team_name uses club name when available
  if (entry.club && entry.club.name) {
    entry.team_name = entry.club.name;
  }

  // Handle logo display with fallback logic
  entry.logo = getEntryLogo(entry);

  // Add club information for frontend use
  if (entry.club) {
    entry.club_info = {
      id: entry.club.id,
      name: entry.club.name,
      kurz_name: entry.club.kurz_name,
      club_typ: entry.club.club_typ,
      viktoria_team_mapping: entry.club.viktoria_team_mapping
    };
  }

  return entry;
}

function getEntryLogo(entry: any) {
  // First priority: club logo
  if (entry.club && entry.club.logo) {
    return {
      ...entry.club.logo,
      source: 'club'
    };
  }

  // Second priority: team_logo field (legacy)
  if (entry.team_logo) {
    return {
      ...entry.team_logo,
      source: 'team_logo'
    };
  }

  // Third priority: team logo (fallback)
  if (entry.team && entry.team.teamfoto) {
    return {
      ...entry.team.teamfoto,
      source: 'team'
    };
  }

  // No logo available
  return null;
}

export default factories.createCoreController('api::tabellen-eintrag.tabellen-eintrag', ({ strapi }) => ({
  /**
   * Find entries with club population and logo handling
   */
  async find(ctx) {
    // Initialize populate if not exists
    if (!ctx.query.populate) {
      ctx.query.populate = {};
    }
    
    // Always populate club with logo for API responses
    (ctx.query.populate as any).club = {
      populate: ['logo']
    };
    
    // Also populate team for backward compatibility
    (ctx.query.populate as any).team = true;
    (ctx.query.populate as any).liga = true;
    (ctx.query.populate as any).team_logo = true;

    const { data, meta } = await super.find(ctx);
    
    // Process entries to handle club data and logo fallback
    const processedData = data.map(entry => processEntryData(entry));

    return { data: processedData, meta };
  },

  /**
   * Find one entry with club population and logo handling
   */
  async findOne(ctx) {
    // Ensure club relations are populated
    if (!ctx.query.populate) {
      ctx.query.populate = {};
    }
    
    (ctx.query.populate as any).club = {
      populate: ['logo']
    };
    (ctx.query.populate as any).team = true;
    (ctx.query.populate as any).liga = true;
    (ctx.query.populate as any).team_logo = true;

    const { data, meta } = await super.findOne(ctx);
    
    // Process entry to handle club data and logo fallback
    const processedData = data ? processEntryData(data) : data;

    return { data: processedData, meta };
  }
}));