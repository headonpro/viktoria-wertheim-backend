/**
 * news-artikel router
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
    
    // Custom routes for news article management
    {
      method: 'GET',
      path: '/news-artikels/slug/:slug',
      handler: 'news-artikel.findBySlug',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/news-artikels/featured',
      handler: 'news-artikel.getFeatured',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/news-artikels/category/:categoryId',
      handler: 'news-artikel.getByCategory',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/news-artikels/search',
      handler: 'news-artikel.search',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/news-artikels/:id/toggle-featured',
      handler: 'news-artikel.toggleFeatured',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};