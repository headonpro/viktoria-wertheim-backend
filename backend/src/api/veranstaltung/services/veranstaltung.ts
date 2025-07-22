/**
 * veranstaltung service
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreService('api::veranstaltung.veranstaltung' as any, ({ strapi }) => ({
  
  // Get events with enhanced filtering and sorting
  async findWithFilters(params: any = {}) {
    const {
      kategorie,
      oeffentlich,
      dateFrom,
      dateTo,
      upcoming = false,
      published = true,
      ...otherParams
    } = params;

    const filters: any = {};

    // Category filter
    if (kategorie) {
      filters.kategorie = kategorie;
    }

    // Public/private filter
    if (oeffentlich !== undefined) {
      filters.oeffentlich = oeffentlich;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      filters.datum = {};
      if (dateFrom) filters.datum.$gte = dateFrom;
      if (dateTo) filters.datum.$lte = dateTo;
    }

    // Upcoming events filter
    if (upcoming) {
      const today = new Date().toISOString().split('T')[0];
      filters.datum = { $gte: today };
    }

    // Published filter
    if (published) {
      filters.publishedAt = { $notNull: true };
    }

    return await strapi.entityService.findMany('api::veranstaltung.veranstaltung' as any, {
      ...otherParams,
      filters,
      populate: {
        titelbild: true
      },
      sort: { datum: 'asc' }
    });
  },

  // Get event statistics
  async getStatistics() {
    const totalEvents = await strapi.entityService.count('api::veranstaltung.veranstaltung' as any);
    const publishedEvents = await strapi.entityService.count('api::veranstaltung.veranstaltung' as any, {
      filters: { publishedAt: { $notNull: true } } as any
    });
    const draftEvents = await strapi.entityService.count('api::veranstaltung.veranstaltung' as any, {
      filters: { publishedAt: { $null: true } } as any
    });
    const publicEvents = await strapi.entityService.count('api::veranstaltung.veranstaltung' as any, {
      filters: { oeffentlich: true, publishedAt: { $notNull: true } } as any
    });

    // Get upcoming events count
    const today = new Date().toISOString().split('T')[0];
    const upcomingEvents = await strapi.entityService.count('api::veranstaltung.veranstaltung' as any, {
      filters: {
        datum: { $gte: today },
        publishedAt: { $notNull: true }
      } as any
    });

    // Get events by category
    const eventsByCategory = {
      'Vereinsfeier': 0,
      'Mitgliederversammlung': 0,
      'Turnier': 0,
      'Training': 0
    };

    for (const kategorie of Object.keys(eventsByCategory)) {
      eventsByCategory[kategorie] = await strapi.entityService.count('api::veranstaltung.veranstaltung' as any, {
        filters: {
          kategorie,
          publishedAt: { $notNull: true }
        } as any
      });
    }

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEvents = await strapi.entityService.count('api::veranstaltung.veranstaltung' as any, {
      filters: {
        createdAt: { $gte: thirtyDaysAgo },
        publishedAt: { $notNull: true }
      } as any
    });

    return {
      total: totalEvents,
      published: publishedEvents,
      drafts: draftEvents,
      public: publicEvents,
      upcoming: upcomingEvents,
      recentEvents,
      eventsByCategory
    };
  },

  // Validate event data
  async validateEvent(data: any) {
    const errors = [];

    // Validate title
    if (!data.titel || data.titel.trim().length === 0) {
      errors.push('Event title is required');
    } else if (data.titel.length > 200) {
      errors.push('Event title must be 200 characters or less');
    }

    // Validate date
    if (!data.datum) {
      errors.push('Event date is required');
    } else {
      const eventDate = new Date(data.datum);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset time for date comparison
      
      if (eventDate < now) {
        errors.push('Warning: Event date is in the past');
      }
    }

    // Validate time format if provided
    if (data.uhrzeit) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(data.uhrzeit)) {
        errors.push('Time must be in HH:MM format (e.g., 14:30)');
      }
    }

    // Validate location
    if (data.ort && data.ort.length > 200) {
      errors.push('Location must be 200 characters or less');
    }

    // Validate category
    const validCategories = ['Vereinsfeier', 'Mitgliederversammlung', 'Turnier', 'Training'];
    if (!data.kategorie || !validCategories.includes(data.kategorie)) {
      errors.push('Valid event category is required');
    }

    // Validate contact information
    if (data.kontakt_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.kontakt_email)) {
      errors.push('Contact email must be a valid email address');
    }

    if (data.kontakt_person && data.kontakt_person.length > 100) {
      errors.push('Contact person name must be 100 characters or less');
    }

    if (data.kontakt_telefon && data.kontakt_telefon.length > 50) {
      errors.push('Contact phone must be 50 characters or less');
    }

    // Validate participant limits
    if (data.max_teilnehmer && data.max_teilnehmer < 1) {
      errors.push('Maximum participants must be at least 1');
    }

    if (data.kurzbeschreibung && data.kurzbeschreibung.length > 300) {
      errors.push('Short description must be 300 characters or less');
    }

    return errors;
  },

  // Get events for calendar view with enhanced functionality
  async getCalendarEvents(year: number, month: number, userRole = null) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const filters: any = {
      datum: {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0]
      },
      publishedAt: { $notNull: true }
    };

    // Only show public events for non-authenticated users
    if (!userRole) {
      filters.oeffentlich = true;
    }

    const events = await strapi.entityService.findMany('api::veranstaltung.veranstaltung' as any, {
      filters,
      sort: { datum: 'asc' },
      populate: {
        titelbild: true
      }
    });

    // Group events by date for calendar display
    const eventsByDate = {};
    const eventStats = {
      totalEvents: events.length,
      publicEvents: 0,
      privateEvents: 0,
      categoryCounts: {
        'Vereinsfeier': 0,
        'Mitgliederversammlung': 0,
        'Turnier': 0,
        'Training': 0
      }
    };

    events.forEach((event: any) => {
      const dateKey = event.datum;
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);

      // Update statistics
      if (event.oeffentlich) {
        eventStats.publicEvents++;
      } else {
        eventStats.privateEvents++;
      }
      
      if (eventStats.categoryCounts.hasOwnProperty(event.kategorie)) {
        eventStats.categoryCounts[event.kategorie]++;
      }
    });

    return {
      eventsByDate,
      statistics: eventStats,
      monthInfo: {
        year,
        month,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    };
  },

  // Get calendar overview for multiple months
  async getCalendarOverview(startYear: number, startMonth: number, monthCount: number = 3, userRole = null) {
    const calendarData = [];
    
    for (let i = 0; i < monthCount; i++) {
      const currentDate = new Date(startYear, startMonth - 1 + i, 1);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const monthData = await this.getCalendarEvents(year, month, userRole);
      calendarData.push({
        year,
        month,
        monthName: currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
        ...monthData
      });
    }
    
    return calendarData;
  },

  // Get events for a specific date range
  async getEventsInDateRange(startDate: string, endDate: string, userRole = null, options: any = {}) {
    const filters: any = {
      datum: {
        $gte: startDate,
        $lte: endDate
      },
      publishedAt: { $notNull: true }
    };

    // Only show public events for non-authenticated users
    if (!userRole) {
      filters.oeffentlich = true;
    }

    // Apply additional filters from options
    if (options.kategorie) {
      filters.kategorie = options.kategorie;
    }

    if (options.oeffentlich !== undefined) {
      filters.oeffentlich = options.oeffentlich;
    }

    const events = await strapi.entityService.findMany('api::veranstaltung.veranstaltung' as any, {
      filters,
      sort: { datum: 'asc' },
      limit: options.limit || 100,
      populate: {
        titelbild: true
      }
    });

    return events;
  },

  // Get similar events (same category, upcoming)
  async getSimilarEvents(eventId: any, limit = 5) {
    const event = await strapi.entityService.findOne('api::veranstaltung.veranstaltung' as any, eventId);

    if (!event) {
      throw new Error('Event not found');
    }

    const today = new Date().toISOString().split('T')[0];

    // Find upcoming events in the same category, excluding the current event
    const similarEvents = await strapi.entityService.findMany('api::veranstaltung.veranstaltung' as any, {
      filters: {
        kategorie: (event as any).kategorie,
        id: { $ne: eventId },
        datum: { $gte: today },
        publishedAt: { $notNull: true },
        oeffentlich: true
      },
      sort: { datum: 'asc' },
      limit,
      populate: {
        titelbild: true
      }
    });

    return similarEvents;
  },

  // Generate event summary
  generateSummary(event: any) {
    const parts = [];
    
    if (event.datum) {
      const date = new Date(event.datum);
      parts.push(date.toLocaleDateString('de-DE'));
    }
    
    if (event.uhrzeit) {
      parts.push(`um ${event.uhrzeit} Uhr`);
    }
    
    if (event.ort) {
      parts.push(`in ${event.ort}`);
    }
    
    return parts.join(' ');
  },

  // Bulk operations
  async bulkUpdateCategory(eventIds: any[], kategorie: string) {
    const validCategories = ['Vereinsfeier', 'Mitgliederversammlung', 'Turnier', 'Training'];
    if (!validCategories.includes(kategorie)) {
      throw new Error('Invalid category');
    }

    const updatedEvents = [];
    for (const eventId of eventIds) {
      const event = await strapi.entityService.update('api::veranstaltung.veranstaltung' as any, eventId, {
        data: { kategorie },
        populate: {
          titelbild: true
        }
      });
      updatedEvents.push(event);
    }

    return updatedEvents;
  },

  async bulkTogglePublic(eventIds: any[], oeffentlich: boolean) {
    const updatedEvents = [];
    for (const eventId of eventIds) {
      const event = await strapi.entityService.update('api::veranstaltung.veranstaltung' as any, eventId, {
        data: { oeffentlich },
        populate: {
          titelbild: true
        }
      });
      updatedEvents.push(event);
    }

    return updatedEvents;
  },

  async bulkPublish(eventIds: any[]) {
    const updatedEvents = [];
    for (const eventId of eventIds) {
      const event = await strapi.entityService.update('api::veranstaltung.veranstaltung' as any, eventId, {
        data: { publishedAt: new Date() },
        populate: {
          titelbild: true
        }
      });
      updatedEvents.push(event);
    }

    return updatedEvents;
  }

}));