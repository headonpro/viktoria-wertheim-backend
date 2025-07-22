/**
 * System Maintenance Routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/system-maintenance/status',
      handler: 'system-maintenance.getStatus',
      config: {
        policies: []
      }
    },
    {
      method: 'POST',
      path: '/system-maintenance/trigger',
      handler: 'system-maintenance.triggerMaintenance',
      config: {
        policies: []
      }
    },
    {
      method: 'POST',
      path: '/system-maintenance/integrity-check',
      handler: 'system-maintenance.checkIntegrity',
      config: {
        policies: []
      }
    },
    {
      method: 'POST',
      path: '/system-maintenance/auto-fix',
      handler: 'system-maintenance.autoFix',
      config: {
        policies: []
      }
    },
    {
      method: 'POST',
      path: '/system-maintenance/process-match/:matchId',
      handler: 'system-maintenance.processMatch',
      config: {
        policies: []
      }
    },
    {
      method: 'POST',
      path: '/system-maintenance/initialize-season-stats',
      handler: 'system-maintenance.initializeSeasonStats',
      config: {
        policies: []
      }
    },
    {
      method: 'POST',
      path: '/system-maintenance/recalculate-tables',
      handler: 'system-maintenance.recalculateTables',
      config: {
        policies: []
      }
    }
  ]
};