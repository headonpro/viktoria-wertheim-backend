/**
 * veranstaltung controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::veranstaltung.veranstaltung' as any, ({ strapi }) => ({
  
  // Get published events with pagination and filtering
  async find(ctx) {
    const { query } = ctx;
    
    // Default to published events only for public API
    if (!query.filters) {
      query.filters = {};
    }
    
    // Add publishedAt filter for public access unless user is authenticated
    if (!ctx.state.user || !ctx.state.user.role) {
      (query.filters as any).publishedAt = { $notNull: true };
      // Only show public events for non-authenticated users
      (query.filters as any).oeffentlich = true;
    }
    
    // Default sorting by event date (upcoming first)
    if (!query.sort) {
      query.sort = { datum: 'asc' };
    }
    
    // Default population
    if (!query.populate) {
      query.populate = {
        titelbild: true
      };
    }
    
    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  // Get single event by slug
  async findBySlug(ctx) {
    const { slug } = ctx.params;
    
    try {
      const filters: any = { 
        slug,
        publishedAt: { $notNull: true }
      };
      
      // Only show public events for non-authenticated users
      if (!ctx.state.user || !ctx.state.user.role) {
        filters.oeffentlich = true;
      }
      
      const events = await strapi.entityService.findMany('api::veranstaltung.veranstaltung' as any, {
        filters,
        populate: {
          titelbild: true
        }
      });

      if (events.length === 0) {
        return ctx.notFound('Event not found');
      }

      ctx.body = { data: events[0] };
    } catch (error) {
      ctx.throw(500, `Failed to fetch event: ${error.message}`);
    }
  },

  // Get upcoming events
  async getUpcoming(ctx) {
    try {
      const { kategorie, limit = 10, oeffentlich_only } = ctx.query;
      const today = new Date().toISOString().split('T')[0];
      
      const filters: any = {
        datum: { $gte: today },
        publishedAt: { $notNull: true }
      };
      
      // Filter by category if provided
      if (kategorie) {
        filters.kategorie = kategorie;
      }
      
      // Filter by public events if requested or user not authenticated
      if (oeffentlich_only === 'true' || (!ctx.state.user || !ctx.state.user.role)) {
        filters.oeffentlich = true;
      }
      
      const events = await strapi.entityService.findMany('api::veranstaltung.veranstaltung' as any, {
        filters,
        sort: { datum: 'asc' },
        limit: parseInt(limit as string),
        populate: {
          titelbild: true
        }
      });

      ctx.body = { data: events };
    } catch (error) {
      ctx.throw(500, `Failed to fetch upcoming events: ${error.message}`);
    }
  },

  // Get events by category
  async getByCategory(ctx) {
    const { kategorie } = ctx.params;
    const { page = 1, pageSize = 10, upcoming_only } = ctx.query;
    
    try {
      const filters: any = {
        kategorie,
        publishedAt: { $notNull: true }
      };
      
      // Filter upcoming events only if requested
      if (upcoming_only === 'true') {
        const today = new Date().toISOString().split('T')[0];
        filters.datum = { $gte: today };
      }
      
      // Only show public events for non-authenticated users
      if (!ctx.state.user || !ctx.state.user.role) {
        filters.oeffentlich = true;
      }
      
      const events = await strapi.entityService.findMany('api::veranstaltung.veranstaltung' as any, {
        filters,
        sort: { datum: 'asc' },
        start: (parseInt(page as string) - 1) * parseInt(pageSize as string),
        limit: parseInt(pageSize as string),
        populate: {
          titelbild: true
        }
      });

      // Get total count for pagination
      const total = await strapi.entityService.count('api::veranstaltung.veranstaltung' as any, {
        filters
      });

      ctx.body = {
        data: events,
        meta: {
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            pageCount: Math.ceil(total / parseInt(pageSize as string)),
            total
          }
        }
      };
    } catch (error) {
      ctx.throw(500, `Failed to fetch events by category: ${error.message}`);
    }
  },

  // Get events calendar for a specific month
  async getCalendar(ctx) {
    const { year, month } = ctx.query;
    
    if (!year || !month) {
      return ctx.badRequest('Year and month parameters are required');
    }
    
    try {
      const userRole = ctx.state.user?.role || null;
      const calendarData = await strapi.service('api::veranstaltung.veranstaltung').getCalendarEvents(
        parseInt(year as string),
        parseInt(month as string),
        userRole
      );

      ctx.body = { data: calendarData };
    } catch (error) {
      ctx.throw(500, `Failed to fetch calendar events: ${error.message}`);
    }
  },

  // Get calendar overview for multiple months
  async getCalendarOverview(ctx) {
    const { startYear, startMonth, monthCount = 3 } = ctx.query;
    
    if (!startYear || !startMonth) {
      return ctx.badRequest('startYear and startMonth parameters are required');
    }
    
    try {
      const userRole = ctx.state.user?.role || null;
      const overviewData = await strapi.service('api::veranstaltung.veranstaltung').getCalendarOverview(
        parseInt(startYear as string),
        parseInt(startMonth as string),
        parseInt(monthCount as string),
        userRole
      );

      ctx.body = { data: overviewData };
    } catch (error) {
      ctx.throw(500, `Failed to fetch calendar overview: ${error.message}`);
    }
  },

  // Get events in date range
  async getEventsInDateRange(ctx) {
    const { startDate, endDate, kategorie, limit } = ctx.query;
    
    if (!startDate || !endDate) {
      return ctx.badRequest('startDate and endDate parameters are required');
    }
    
    try {
      const userRole = ctx.state.user?.role || null;
      const options = {
        kategorie: kategorie as string,
        limit: limit ? parseInt(limit as string) : undefined
      };
      
      const events = await strapi.service('api::veranstaltung.veranstaltung').getEventsInDateRange(
        startDate as string,
        endDate as string,
        userRole,
        options
      );

      ctx.body = { data: events };
    } catch (error) {
      ctx.throw(500, `Failed to fetch events in date range: ${error.message}`);
    }
  },

  // Get event statistics
  async getEventStatistics(ctx) {
    try {
      const statistics = await strapi.service('api::veranstaltung.veranstaltung').getStatistics();
      ctx.body = { data: statistics };
    } catch (error) {
      ctx.throw(500, `Failed to fetch event statistics: ${error.message}`);
    }
  },

  // Process scheduled notifications (for cron jobs)
  async processScheduledNotifications(ctx) {
    try {
      const EventNotificationService = require('../services/notification').default;
      const notificationService = new EventNotificationService(strapi);
      
      await notificationService.processScheduledNotifications();
      
      ctx.body = { 
        message: 'Scheduled notifications processed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      ctx.throw(500, `Failed to process scheduled notifications: ${error.message}`);
    }
  },

  // Search events
  async search(ctx) {
    const { q, kategorie, limit = 10 } = ctx.query;
    
    if (!q) {
      return ctx.badRequest('Search query is required');
    }
    
    try {
      const filters: any = {
        $or: [
          { titel: { $containsi: q } },
          { kurzbeschreibung: { $containsi: q } },
          { beschreibung: { $containsi: q } },
          { ort: { $containsi: q } }
        ],
        publishedAt: { $notNull: true }
      };
      
      if (kategorie) {
        filters.kategorie = kategorie;
      }
      
      // Only show public events for non-authenticated users
      if (!ctx.state.user || !ctx.state.user.role) {
        filters.oeffentlich = true;
      }
      
      const events = await strapi.entityService.findMany('api::veranstaltung.veranstaltung' as any, {
        filters,
        sort: { datum: 'asc' },
        limit: parseInt(limit as string),
        populate: {
          titelbild: true
        }
      });

      ctx.body = { data: events };
    } catch (error) {
      ctx.throw(500, `Search failed: ${error.message}`);
    }
  },

  // Toggle public/private status
  async togglePublic(ctx) {
    const { id } = ctx.params;
    
    try {
      const event = await strapi.entityService.findOne('api::veranstaltung.veranstaltung' as any, id);
      
      if (!event) {
        return ctx.notFound('Event not found');
      }

      const updatedEvent = await strapi.entityService.update('api::veranstaltung.veranstaltung' as any, id, {
        data: { oeffentlich: !(event as any).oeffentlich },
        populate: {
          titelbild: true
        }
      });

      ctx.body = { data: updatedEvent };
    } catch (error) {
      ctx.throw(500, `Failed to toggle public status: ${error.message}`);
    }
  }

}));