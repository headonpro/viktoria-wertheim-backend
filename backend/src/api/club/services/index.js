/**
 * Club Services Index
 * 
 * Exports all club-related services for registration with Strapi.
 */

'use strict';

const club = require('./club');
const cacheManager = require('./cache-manager');
const performanceMonitor = require('./performance-monitor');
const performanceAlerting = require('./performance-alerting');
const validation = require('./validation');

// Import TypeScript services
const { ClubMetricsCollector } = require('./metrics-collector');
const { ClubMetricsDashboard } = require('./metrics-dashboard');
const { ClubAlertingSystem } = require('./alerting-system');
const { ClubMonitoringService } = require('./monitoring-service');

module.exports = {
  club,
  'cache-manager': cacheManager,
  'performance-monitor': performanceMonitor,
  'performance-alerting': performanceAlerting,
  validation,
  
  // Monitoring services
  'metrics-collector': ({ strapi }) => new ClubMetricsCollector(strapi),
  'metrics-dashboard': ({ strapi }) => {
    const performanceMonitor = strapi.service('api::club.performance-monitor');
    const alertingSystem = strapi.service('api::club.alerting-system');
    return new ClubMetricsDashboard(strapi, performanceMonitor, alertingSystem);
  },
  'alerting-system': ({ strapi }) => new ClubAlertingSystem(strapi),
  'monitoring-service': ({ strapi }) => new ClubMonitoringService(strapi)
};