/**
 * veranstaltung router - Ultra-simplified version
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
    // Basic custom route only
    {
      method: 'GET',
      path: '/veranstaltungs/upcoming',
      handler: 'veranstaltung.getUpcoming',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};