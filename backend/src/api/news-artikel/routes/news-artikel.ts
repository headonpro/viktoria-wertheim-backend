/**
 * news-artikel router - Ultra-simplified version
 */

import { factories } from '@strapi/strapi';

export default {
  routes: [
    // Default CRUD routes
    {
      method: 'GET',
      path: '/news-artikels',
      handler: 'news-artikel.find',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/news-artikels/:id',
      handler: 'news-artikel.findOne',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/news-artikels',
      handler: 'news-artikel.create',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/news-artikels/:id',
      handler: 'news-artikel.update',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/news-artikels/:id',
      handler: 'news-artikel.delete',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    // Basic custom route only
    {
      method: 'GET',
      path: '/news-artikels/featured',
      handler: 'news-artikel.getFeatured',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};