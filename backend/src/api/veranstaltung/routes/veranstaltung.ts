/**
 * veranstaltung router
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Default CRUD routes
    {
      method: 'GET',
      path: '/veranstaltungs',
      handler: 'veranstaltung.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/veranstaltungs/:id',
      handler: 'veranstaltung.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/veranstaltungs',
      handler: 'veranstaltung.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/veranstaltungs/:id',
      handler: 'veranstaltung.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/veranstaltungs/:id',
      handler: 'veranstaltung.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    
    // Custom routes for event management
    {
      method: 'GET',
      path: '/veranstaltungs/slug/:slug',
      handler: 'veranstaltung.findBySlug',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/veranstaltungs/upcoming',
      handler: 'veranstaltung.getUpcoming',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/veranstaltungs/category/:kategorie',
      handler: 'veranstaltung.getByCategory',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/veranstaltungs/calendar',
      handler: 'veranstaltung.getCalendar',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/veranstaltungs/calendar/overview',
      handler: 'veranstaltung.getCalendarOverview',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/veranstaltungs/date-range',
      handler: 'veranstaltung.getEventsInDateRange',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/veranstaltungs/statistics',
      handler: 'veranstaltung.getEventStatistics',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/veranstaltungs/process-notifications',
      handler: 'veranstaltung.processScheduledNotifications',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/veranstaltungs/search',
      handler: 'veranstaltung.search',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/veranstaltungs/:id/toggle-public',
      handler: 'veranstaltung.togglePublic',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};