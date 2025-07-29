/**
 * Admin routes for Tabellen-Automatisierung
 * Provides admin panel endpoints for manual recalculation, queue monitoring, and system management
 */

export default {
  routes: [
    // Manual recalculation endpoint
    {
      method: 'POST',
      path: '/admin/tabellen/recalculate',
      handler: 'admin.triggerRecalculation',
      config: {
        policies: ['admin::isAuthenticatedAdmin']
      }
    },

    // Queue status monitoring
    {
      method: 'GET',
      path: '/admin/tabellen/queue-status',
      handler: 'admin.getQueueStatus',
      config: {
        policies: ['admin::isAuthenticatedAdmin']
      }
    },

    // Pause automation
    {
      method: 'POST',
      path: '/admin/tabellen/pause',
      handler: 'admin.pauseAutomation',
      config: {
        policies: ['admin::isAuthenticatedAdmin']
      }
    },

    // Resume automation
    {
      method: 'POST',
      path: '/admin/tabellen/resume',
      handler: 'admin.resumeAutomation',
      config: {
        policies: ['admin::isAuthenticatedAdmin']
      }
    },

    // Get calculation history
    {
      method: 'GET',
      path: '/admin/tabellen/history/:ligaId',
      handler: 'admin.getCalculationHistory',
      config: {
        policies: ['admin::isAuthenticatedAdmin']
      }
    },

    // System health check
    {
      method: 'GET',
      path: '/admin/tabellen/health',
      handler: 'admin.getSystemHealth',
      config: {
        policies: ['admin::isAuthenticatedAdmin']
      }
    },

    // Get automation settings
    {
      method: 'GET',
      path: '/admin/tabellen/settings',
      handler: 'admin.getSettings',
      config: {
        policies: ['admin::isAuthenticatedAdmin']
      }
    },

    // Update automation settings
    {
      method: 'PUT',
      path: '/admin/tabellen/settings',
      handler: 'admin.updateSettings',
      config: {
        policies: ['admin::isAuthenticatedAdmin']
      }
    },

    // List snapshots for liga/saison
    {
      method: 'GET',
      path: '/admin/tabellen/snapshots/:ligaId/:saisonId',
      handler: 'admin.listSnapshots',
      config: {
        policies: ['admin::isAuthenticatedAdmin']
      }
    },

    // Create manual snapshot
    {
      method: 'POST',
      path: '/admin/tabellen/snapshots',
      handler: 'admin.createSnapshot',
      config: {
        policies: ['admin::isAuthenticatedAdmin']
      }
    },

    // Restore from snapshot
    {
      method: 'POST',
      path: '/admin/tabellen/snapshots/:snapshotId/restore',
      handler: 'admin.restoreSnapshot',
      config: {
        policies: ['admin::isAuthenticatedAdmin']
      }
    },

    // Delete snapshot
    {
      method: 'DELETE',
      path: '/admin/tabellen/snapshots/:snapshotId',
      handler: 'admin.deleteSnapshot',
      config: {
        policies: ['admin::isAuthenticatedAdmin']
      }
    }
  ]
};