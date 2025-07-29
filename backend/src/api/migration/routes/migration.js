'use strict';

/**
 * Migration Management Routes
 * Requirements: 8.1, 8.2, 8.5
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/migration/status',
      handler: 'migration.getStatus',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/migration/history',
      handler: 'migration.getHistory',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/migration/run',
      handler: 'migration.runMigration',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/migration/rollback',
      handler: 'migration.rollbackMigration',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/migration/validate',
      handler: 'migration.runValidation',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/migration/validation',
      handler: 'migration.getValidation',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/migration/data-quality',
      handler: 'migration.getDataQuality',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/migration/cleanup',
      handler: 'migration.runCleanup',
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/migration/export',
      handler: 'migration.exportData',
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};