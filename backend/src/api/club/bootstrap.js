/**
 * Club API Bootstrap
 * 
 * Initializes club-related services and monitoring when Strapi starts.
 */

'use strict';

module.exports = async ({ strapi }) => {
  try {
    strapi.log.info('Initializing Club API services...');

    // Initialize monitoring service
    const monitoringService = strapi.service('api::club.monitoring-service');
    if (monitoringService) {
      await monitoringService.start();
      strapi.log.info('Club monitoring service started successfully');
    }

    // Initialize cache manager
    const cacheManager = strapi.service('api::club.cache-manager');
    if (cacheManager && typeof cacheManager.initialize === 'function') {
      await cacheManager.initialize();
      strapi.log.info('Club cache manager initialized');
    }

    // Initialize performance monitor
    const performanceMonitor = strapi.service('api::club.performance-monitor');
    if (performanceMonitor && typeof performanceMonitor.start === 'function') {
      await performanceMonitor.start();
      strapi.log.info('Club performance monitor started');
    }

    // Register event listeners for monitoring
    strapi.eventHub.on('club.created', (data) => {
      strapi.log.debug('Club created event:', data.id);
    });

    strapi.eventHub.on('club.updated', (data) => {
      strapi.log.debug('Club updated event:', data.id);
    });

    strapi.eventHub.on('club.deleted', (data) => {
      strapi.log.debug('Club deleted event:', data.id);
    });

    // Register cleanup on shutdown
    process.on('SIGTERM', async () => {
      strapi.log.info('Shutting down club services...');
      
      if (monitoringService && typeof monitoringService.stop === 'function') {
        await monitoringService.stop();
      }
      
      if (performanceMonitor && typeof performanceMonitor.stop === 'function') {
        await performanceMonitor.stop();
      }
      
      strapi.log.info('Club services shutdown complete');
    });

    strapi.log.info('Club API bootstrap completed successfully');

  } catch (error) {
    strapi.log.error('Failed to bootstrap Club API:', error);
    throw error;
  }
};