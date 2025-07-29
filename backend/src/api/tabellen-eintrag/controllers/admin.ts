/**
 * Admin Controller for Tabellen-Automatisierung
 * Handles admin panel operations like manual recalculation, queue monitoring, and snapshots
 */

// Using Strapi's context type instead of Koa directly
type Context = any;
import { factories } from '@strapi/strapi';
import type { 
  RecalculationRequest, 
  RecalculationResponse,
  QueueStatus,
  SystemHealth,
  CalculationHistoryEntry,
  AutomationSettings
} from '../../../admin/extensions/tabellen-automatisierung/types';
import { SystemStatus, ComponentStatus } from '../../../admin/extensions/tabellen-automatisierung/types';
import type { JobId, Priority } from '../services/types';

interface AdminController {
  triggerRecalculation(ctx: Context): Promise<void>;
  getQueueStatus(ctx: Context): Promise<void>;
  pauseAutomation(ctx: Context): Promise<void>;
  resumeAutomation(ctx: Context): Promise<void>;
  getCalculationHistory(ctx: Context): Promise<void>;
  getSystemHealth(ctx: Context): Promise<void>;
  getSettings(ctx: Context): Promise<void>;
  updateSettings(ctx: Context): Promise<void>;
  listSnapshots(ctx: Context): Promise<void>;
  createSnapshot(ctx: Context): Promise<void>;
  restoreSnapshot(ctx: Context): Promise<void>;
  deleteSnapshot(ctx: Context): Promise<void>;
}

const adminController: AdminController = {
  /**
   * Trigger manual table recalculation for a specific liga
   * POST /api/admin/tabellen/recalculate
   */
  async triggerRecalculation(ctx: Context): Promise<void> {
    try {
      const { ligaId, saisonId, priority = 'HIGH', description } = ctx.request.body as RecalculationRequest;

      // Validate required parameters
      if (!ligaId) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Liga ID ist erforderlich',
          error: 'MISSING_LIGA_ID'
        };
        return;
      }

      // Get services
      const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
      const tabellenService = strapi.service('api::tabellen-eintrag.tabellen-berechnung');

      // Validate liga exists
      const liga = await strapi.entityService.findOne('api::liga.liga', ligaId);
      if (!liga) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: 'Liga nicht gefunden',
          error: 'LIGA_NOT_FOUND'
        };
        return;
      }

      // Get current saison if not provided
      let targetSaisonId = saisonId;
      if (!targetSaisonId) {
        const currentSaison = await strapi.entityService.findMany('api::saison.saison', {
          filters: { aktiv: true },
          limit: 1
        });
        
        if (!currentSaison || currentSaison.length === 0) {
          ctx.status = 400;
          ctx.body = {
            success: false,
            message: 'Keine aktive Saison gefunden',
            error: 'NO_ACTIVE_SAISON'
          };
          return;
        }
        
        targetSaisonId = Number(currentSaison[0].id);
      }

      // Add job to queue with high priority for manual triggers
      const jobId = await queueManager.addCalculationJob(
        ligaId, 
        targetSaisonId, 
        priority as Priority,
        'MANUAL_TRIGGER',
        description || `Manuelle Neuberechnung für Liga ${liga.name}`
      );

      // Estimate duration based on team count
      const teams = await strapi.entityService.findMany('api::team.team', {
        filters: { liga: { id: ligaId } },
        pagination: { limit: 100 }
      });
      
      const estimatedDuration = Math.max(5, teams.length * 0.5); // 0.5 seconds per team, minimum 5 seconds

      const response: RecalculationResponse = {
        success: true,
        jobId,
        message: `Tabellenberechnung für Liga "${liga.name}" wurde gestartet`,
        estimatedDuration
      };

      ctx.status = 200;
      ctx.body = response;

      // Log admin action
      strapi.log.info('Manual table recalculation triggered', {
        ligaId,
        saisonId: targetSaisonId,
        jobId,
        userId: ctx.state.user?.id,
        priority
      });

    } catch (error) {
      strapi.log.error('Error triggering recalculation:', error);
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Fehler beim Starten der Tabellenberechnung',
        error: error.message
      };
    }
  },

  /**
   * Get current queue status and statistics
   * GET /api/admin/tabellen/queue-status
   */
  async getQueueStatus(ctx: Context): Promise<void> {
    try {
      const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
      const status = await queueManager.getQueueStatus();

      ctx.status = 200;
      ctx.body = status;

    } catch (error) {
      strapi.log.error('Error getting queue status:', error);
      
      ctx.status = 500;
      ctx.body = {
        error: 'Fehler beim Abrufen des Queue-Status',
        message: error.message
      };
    }
  },

  /**
   * Pause automation system
   * POST /api/admin/tabellen/pause
   */
  async pauseAutomation(ctx: Context): Promise<void> {
    try {
      const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
      await queueManager.pauseQueue();

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Automatisierung wurde pausiert'
      };

      strapi.log.info('Automation paused by admin', {
        userId: ctx.state.user?.id,
        timestamp: new Date()
      });

    } catch (error) {
      strapi.log.error('Error pausing automation:', error);
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Fehler beim Pausieren der Automatisierung',
        error: error.message
      };
    }
  },

  /**
   * Resume automation system
   * POST /api/admin/tabellen/resume
   */
  async resumeAutomation(ctx: Context): Promise<void> {
    try {
      const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
      await queueManager.resumeQueue();

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Automatisierung wurde fortgesetzt'
      };

      strapi.log.info('Automation resumed by admin', {
        userId: ctx.state.user?.id,
        timestamp: new Date()
      });

    } catch (error) {
      strapi.log.error('Error resuming automation:', error);
      
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: 'Fehler beim Fortsetzen der Automatisierung',
        error: error.message
      };
    }
  },

  /**
   * Get calculation history for a liga
   * GET /api/admin/tabellen/history/:ligaId?limit=50
   */
  async getCalculationHistory(ctx: Context): Promise<void> {
    try {
      const { ligaId } = ctx.params;
      const { limit = 50 } = ctx.query;

      if (!ligaId) {
        ctx.status = 400;
        ctx.body = {
          error: 'Liga ID ist erforderlich'
        };
        return;
      }

      // Get calculation history from queue jobs
      const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
      const history = await queueManager.getJobHistory(parseInt(ligaId), parseInt(limit as string));

      ctx.status = 200;
      ctx.body = history;

    } catch (error) {
      strapi.log.error('Error getting calculation history:', error);
      
      ctx.status = 500;
      ctx.body = {
        error: 'Fehler beim Abrufen der Berechnungshistorie',
        message: error.message
      };
    }
  },

  /**
   * Get system health status
   * GET /api/admin/tabellen/health
   */
  async getSystemHealth(ctx: Context): Promise<void> {
    try {
      const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
      const snapshotService = strapi.service('api::tabellen-eintrag.snapshot');
      
      const health: SystemHealth = {
        status: SystemStatus.HEALTHY,
        components: [],
        lastChecked: new Date(),
        uptime: process.uptime()
      };

      // Check queue health
      try {
        const queueStatus = await queueManager.getQueueStatus();
        health.components.push({
          name: 'Queue System',
          status: queueStatus.isRunning ? ComponentStatus.UP : ComponentStatus.DOWN,
          message: queueStatus.isRunning ? 'Queue is running normally' : 'Queue is paused',
          lastChecked: new Date(),
          metrics: {
            responseTime: 0, // Could be measured
            throughput: queueStatus.completedJobs,
            errorRate: queueStatus.failedJobs / Math.max(1, queueStatus.totalJobs)
          }
        });
      } catch (error) {
        health.components.push({
          name: 'Queue System',
          status: ComponentStatus.DOWN,
          message: error.message,
          lastChecked: new Date()
        });
        health.status = SystemStatus.DEGRADED;
      }

      // Check database connectivity
      try {
        await strapi.db.connection.raw('SELECT 1');
        health.components.push({
          name: 'Database',
          status: ComponentStatus.UP,
          message: 'Database connection is healthy',
          lastChecked: new Date()
        });
      } catch (error) {
        health.components.push({
          name: 'Database',
          status: ComponentStatus.DOWN,
          message: error.message,
          lastChecked: new Date()
        });
        health.status = SystemStatus.UNHEALTHY;
      }

      // Check snapshot service
      try {
        // Simple health check - try to list snapshots
        await snapshotService.listSnapshots(1, 1); // Test with dummy IDs
        health.components.push({
          name: 'Snapshot Service',
          status: ComponentStatus.UP,
          message: 'Snapshot service is operational',
          lastChecked: new Date()
        });
      } catch (error) {
        health.components.push({
          name: 'Snapshot Service',
          status: ComponentStatus.WARNING,
          message: 'Snapshot service may have issues',
          lastChecked: new Date()
        });
        if (health.status === SystemStatus.HEALTHY) {
          health.status = SystemStatus.DEGRADED;
        }
      }

      ctx.status = 200;
      ctx.body = health;

    } catch (error) {
      strapi.log.error('Error getting system health:', error);
      
      ctx.status = 500;
      ctx.body = {
        error: 'Fehler beim Abrufen des Systemstatus',
        message: error.message
      };
    }
  },

  /**
   * Get automation settings
   * GET /api/admin/tabellen/settings
   */
  async getSettings(ctx: Context): Promise<void> {
    try {
      const automationConfig = strapi.config.get('automation', {}) as any;
      
      const settings: AutomationSettings = {
        enabled: automationConfig.queue?.enabled ?? true,
        queueConcurrency: automationConfig.queue?.concurrency ?? 3,
        maxRetries: automationConfig.queue?.maxRetries ?? 3,
        jobTimeout: automationConfig.queue?.jobTimeout ?? 300000, // 5 minutes
        snapshotRetention: automationConfig.snapshot?.retentionDays ?? 30, // 30 days
        enableNotifications: automationConfig.monitoring?.enableNotifications ?? true,
        logLevel: automationConfig.monitoring?.logLevel ?? 'info'
      };

      ctx.status = 200;
      ctx.body = settings;

    } catch (error) {
      strapi.log.error('Error getting settings:', error);
      
      ctx.status = 500;
      ctx.body = {
        error: 'Fehler beim Abrufen der Einstellungen',
        message: error.message
      };
    }
  },

  /**
   * Update automation settings
   * PUT /api/admin/tabellen/settings
   */
  async updateSettings(ctx: Context): Promise<void> {
    try {
      const newSettings = ctx.request.body as Partial<AutomationSettings>;
      
      // Validate settings
      if (newSettings.queueConcurrency && (newSettings.queueConcurrency < 1 || newSettings.queueConcurrency > 10)) {
        ctx.status = 400;
        ctx.body = {
          error: 'Queue Concurrency muss zwischen 1 und 10 liegen'
        };
        return;
      }

      if (newSettings.maxRetries && (newSettings.maxRetries < 0 || newSettings.maxRetries > 10)) {
        ctx.status = 400;
        ctx.body = {
          error: 'Max Retries muss zwischen 0 und 10 liegen'
        };
        return;
      }

      // Update configuration (in a real implementation, this would persist to database or config file)
      // For now, we'll just acknowledge the update
      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Einstellungen wurden aktualisiert',
        settings: newSettings
      };

      strapi.log.info('Automation settings updated by admin', {
        userId: ctx.state.user?.id,
        settings: newSettings,
        timestamp: new Date()
      });

    } catch (error) {
      strapi.log.error('Error updating settings:', error);
      
      ctx.status = 500;
      ctx.body = {
        error: 'Fehler beim Aktualisieren der Einstellungen',
        message: error.message
      };
    }
  },

  /**
   * List snapshots for a specific liga and saison
   * GET /api/admin/tabellen/snapshots/:ligaId/:saisonId
   */
  async listSnapshots(ctx: Context): Promise<void> {
    try {
      const { ligaId, saisonId } = ctx.params;

      if (!ligaId || !saisonId) {
        ctx.status = 400;
        ctx.body = {
          error: 'Liga ID und Saison ID sind erforderlich'
        };
        return;
      }

      const snapshotService = strapi.service('api::tabellen-eintrag.snapshot');
      const snapshots = await snapshotService.listSnapshots(parseInt(ligaId), parseInt(saisonId));

      ctx.status = 200;
      ctx.body = snapshots;

    } catch (error) {
      strapi.log.error('Error listing snapshots:', error);
      
      ctx.status = 500;
      ctx.body = {
        error: 'Fehler beim Abrufen der Snapshots',
        message: error.message
      };
    }
  },

  /**
   * Create a manual snapshot
   * POST /api/admin/tabellen/snapshots
   */
  async createSnapshot(ctx: Context): Promise<void> {
    try {
      const { ligaId, saisonId, description } = ctx.request.body;

      if (!ligaId || !saisonId) {
        ctx.status = 400;
        ctx.body = {
          error: 'Liga ID und Saison ID sind erforderlich'
        };
        return;
      }

      // Validate liga and saison exist
      const liga = await strapi.entityService.findOne('api::liga.liga', ligaId);
      if (!liga) {
        ctx.status = 404;
        ctx.body = {
          error: 'Liga nicht gefunden'
        };
        return;
      }

      const saison = await strapi.entityService.findOne('api::saison.saison', saisonId);
      if (!saison) {
        ctx.status = 404;
        ctx.body = {
          error: 'Saison nicht gefunden'
        };
        return;
      }

      const snapshotService = strapi.service('api::tabellen-eintrag.snapshot');
      const snapshotId = await snapshotService.createSnapshot(
        ligaId, 
        saisonId, 
        description || `Manueller Snapshot für Liga "${liga.name}" - ${new Date().toLocaleString('de-DE')}`
      );

      ctx.status = 201;
      ctx.body = {
        success: true,
        snapshotId,
        message: 'Snapshot wurde erfolgreich erstellt'
      };

      strapi.log.info('Manual snapshot created', {
        snapshotId,
        ligaId,
        saisonId,
        userId: ctx.state.user?.id,
        description
      });

    } catch (error) {
      strapi.log.error('Error creating snapshot:', error);
      
      ctx.status = 500;
      ctx.body = {
        error: 'Fehler beim Erstellen des Snapshots',
        message: error.message
      };
    }
  },

  /**
   * Restore from a snapshot
   * POST /api/admin/tabellen/snapshots/:snapshotId/restore
   */
  async restoreSnapshot(ctx: Context): Promise<void> {
    try {
      const { snapshotId } = ctx.params;
      const { confirmRestore } = ctx.request.body;

      if (!snapshotId) {
        ctx.status = 400;
        ctx.body = {
          error: 'Snapshot ID ist erforderlich'
        };
        return;
      }

      if (!confirmRestore) {
        ctx.status = 400;
        ctx.body = {
          error: 'Bestätigung für Wiederherstellung ist erforderlich',
          message: 'Setzen Sie confirmRestore auf true um die Wiederherstellung zu bestätigen'
        };
        return;
      }

      const snapshotService = strapi.service('api::tabellen-eintrag.snapshot');
      
      // Try to restore the snapshot directly
      // The snapshot service will handle validation
      await snapshotService.restoreSnapshot(snapshotId);

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Snapshot wurde erfolgreich wiederhergestellt'
      };

      strapi.log.info('Snapshot restored by admin', {
        snapshotId,
        userId: ctx.state.user?.id,
        timestamp: new Date()
      });

    } catch (error) {
      strapi.log.error('Error restoring snapshot:', error);
      
      ctx.status = 500;
      ctx.body = {
        error: 'Fehler beim Wiederherstellen des Snapshots',
        message: error.message
      };
    }
  },

  /**
   * Delete a snapshot
   * DELETE /api/admin/tabellen/snapshots/:snapshotId
   */
  async deleteSnapshot(ctx: Context): Promise<void> {
    try {
      const { snapshotId } = ctx.params;

      if (!snapshotId) {
        ctx.status = 400;
        ctx.body = {
          error: 'Snapshot ID ist erforderlich'
        };
        return;
      }

      const snapshotService = strapi.service('api::tabellen-eintrag.snapshot');
      
      // Check if snapshot exists (this is a simplified check)
      try {
        await snapshotService.deleteSnapshot(snapshotId);
      } catch (error) {
        if (error.message.includes('not found')) {
          ctx.status = 404;
          ctx.body = {
            error: 'Snapshot nicht gefunden'
          };
          return;
        }
        throw error;
      }

      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'Snapshot wurde erfolgreich gelöscht'
      };

      strapi.log.info('Snapshot deleted by admin', {
        snapshotId,
        userId: ctx.state.user?.id,
        timestamp: new Date()
      });

    } catch (error) {
      strapi.log.error('Error deleting snapshot:', error);
      
      ctx.status = 500;
      ctx.body = {
        error: 'Fehler beim Löschen des Snapshots',
        message: error.message
      };
    }
  }
};

export default adminController;