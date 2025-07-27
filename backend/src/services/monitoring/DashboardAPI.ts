/**
 * Dashboard API Service
 * 
 * Provides REST API endpoints for the monitoring dashboard,
 * including metrics retrieval, alert management, and real-time updates.
 * 
 * Requirements: 7.3, 7.4
 */

// import { Request, Response } from 'express';
type Request = any;
type Response = any;
import HookMonitoringDashboard, { DashboardMetrics, HookStatus, DashboardEvent } from './HookMonitoringDashboard';
import { FeatureFlagMonitoring } from '../feature-flags/FeatureFlagMonitoring';
import { FeatureFlagManagement } from '../feature-flags/FeatureFlagManagement';
import { StructuredLogger } from '../logging/StructuredLogger';

/**
 * API response wrapper
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * Dashboard API configuration
 */
export interface DashboardAPIConfig {
  enableCors: boolean;
  enableAuthentication: boolean;
  enableRateLimit: boolean;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  enableCaching: boolean;
  cacheMaxAge: number;
  enableCompression: boolean;
}

/**
 * Default API configuration
 */
const DEFAULT_API_CONFIG: DashboardAPIConfig = {
  enableCors: true,
  enableAuthentication: false,
  enableRateLimit: true,
  rateLimitWindowMs: 60000, // 1 minute
  rateLimitMaxRequests: 100,
  enableCaching: true,
  cacheMaxAge: 30, // 30 seconds
  enableCompression: true
};

/**
 * Dashboard API Service
 */
export class DashboardAPI {
  private dashboard: HookMonitoringDashboard;
  private featureFlagMonitoring?: FeatureFlagMonitoring;
  private featureFlagManagement?: FeatureFlagManagement;
  private strapi: any;
  private logger: StructuredLogger;
  private config: DashboardAPIConfig;

  // Cache for API responses
  private responseCache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(
    dashboard: HookMonitoringDashboard,
    strapi: any,
    config: Partial<DashboardAPIConfig> = {},
    featureFlagMonitoring?: FeatureFlagMonitoring,
    featureFlagManagement?: FeatureFlagManagement
  ) {
    this.dashboard = dashboard;
    this.featureFlagMonitoring = featureFlagMonitoring;
    this.featureFlagManagement = featureFlagManagement;
    this.strapi = strapi;
    this.logger = new StructuredLogger(strapi);
    this.config = { ...DEFAULT_API_CONFIG, ...config };

    this.setupCacheCleanup();
    this.logger.info('Dashboard API initialized', {
      enableAuthentication: this.config.enableAuthentication,
      enableRateLimit: this.config.enableRateLimit,
      enableCaching: this.config.enableCaching
    });
  }

  /**
   * Get dashboard metrics
   */
  getMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const cacheKey = 'dashboard_metrics';
      const cached = this.getCachedResponse(cacheKey);
      
      if (cached) {
        this.sendResponse(res, { success: true, data: cached });
        return;
      }

      const metrics = this.dashboard.getCurrentMetrics();
      
      if (!metrics) {
        this.sendResponse(res, { success: false, error: 'No metrics available' }, 404);
        return;
      }

      this.setCachedResponse(cacheKey, metrics);
      this.sendResponse(res, { success: true, data: metrics });

    } catch (error) {
      this.logger.error('Error getting dashboard metrics', error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Get metrics history
   */
  getMetricsHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const history = this.dashboard.getMetricsHistory(limit);

      this.sendResponse(res, { success: true, data: history });

    } catch (error) {
      this.logger.error('Error getting metrics history', error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Get hook statuses
   */
  getHookStatuses = async (req: Request, res: Response): Promise<void> => {
    try {
      const cacheKey = 'hook_statuses';
      const cached = this.getCachedResponse(cacheKey);
      
      if (cached) {
        this.sendResponse(res, { success: true, data: cached });
        return;
      }

      const hookStatuses = this.dashboard.getHookStatuses();
      
      this.setCachedResponse(cacheKey, hookStatuses);
      this.sendResponse(res, { success: true, data: hookStatuses });

    } catch (error) {
      this.logger.error('Error getting hook statuses', error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Get specific hook status
   */
  getHookStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { hookName } = req.params;
      
      if (!hookName) {
        this.sendResponse(res, { success: false, error: 'Hook name is required' }, 400);
        return;
      }

      const hookStatus = this.dashboard.getHookStatus(hookName);
      
      if (!hookStatus) {
        this.sendResponse(res, { success: false, error: 'Hook not found' }, 404);
        return;
      }

      this.sendResponse(res, { success: true, data: hookStatus });

    } catch (error) {
      this.logger.error(`Error getting hook status for ${req.params.hookName}`, error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Get hook performance trends
   */
  getHookPerformanceTrends = async (req: Request, res: Response): Promise<void> => {
    try {
      const { hookName } = req.params;
      const timeRange = parseInt(req.query.timeRange as string) || 3600000; // 1 hour default
      
      if (!hookName) {
        this.sendResponse(res, { success: false, error: 'Hook name is required' }, 400);
        return;
      }

      const trends = this.dashboard.getHookPerformanceTrends(hookName, timeRange);
      
      this.sendResponse(res, { success: true, data: trends });

    } catch (error) {
      this.logger.error(`Error getting performance trends for ${req.params.hookName}`, error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Get hook error trends
   */
  getHookErrorTrends = async (req: Request, res: Response): Promise<void> => {
    try {
      const { hookName } = req.params;
      const timeRange = parseInt(req.query.timeRange as string) || 3600000; // 1 hour default
      
      if (!hookName) {
        this.sendResponse(res, { success: false, error: 'Hook name is required' }, 400);
        return;
      }

      const trends = this.dashboard.getHookErrorTrends(hookName, timeRange);
      
      this.sendResponse(res, { success: true, data: trends });

    } catch (error) {
      this.logger.error(`Error getting error trends for ${req.params.hookName}`, error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Get alerts
   */
  getAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      const filter = {
        type: req.query.type as 'error' | 'warning' | 'info',
        acknowledged: req.query.acknowledged === 'true' ? true : req.query.acknowledged === 'false' ? false : undefined,
        resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined
      };

      const alerts = this.dashboard.getAlerts(filter);
      
      this.sendResponse(res, { success: true, data: alerts });

    } catch (error) {
      this.logger.error('Error getting alerts', error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Acknowledge alert
   */
  acknowledgeAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const { alertId } = req.params;
      const { acknowledgedBy } = req.body;
      
      if (!alertId) {
        this.sendResponse(res, { success: false, error: 'Alert ID is required' }, 400);
        return;
      }

      if (!acknowledgedBy) {
        this.sendResponse(res, { success: false, error: 'acknowledgedBy is required' }, 400);
        return;
      }

      const result = this.dashboard.acknowledgeAlert(alertId, acknowledgedBy);
      
      if (!result) {
        this.sendResponse(res, { success: false, error: 'Alert not found' }, 404);
        return;
      }

      this.sendResponse(res, { success: true, data: { acknowledged: true } });

    } catch (error) {
      this.logger.error(`Error acknowledging alert ${req.params.alertId}`, error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Resolve alert
   */
  resolveAlert = async (req: Request, res: Response): Promise<void> => {
    try {
      const { alertId } = req.params;
      
      if (!alertId) {
        this.sendResponse(res, { success: false, error: 'Alert ID is required' }, 400);
        return;
      }

      const result = this.dashboard.resolveAlert(alertId);
      
      if (!result) {
        this.sendResponse(res, { success: false, error: 'Alert not found' }, 404);
        return;
      }

      this.sendResponse(res, { success: true, data: { resolved: true } });

    } catch (error) {
      this.logger.error(`Error resolving alert ${req.params.alertId}`, error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Refresh metrics
   */
  refreshMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      this.dashboard.refreshMetrics();
      this.clearCache();
      
      this.sendResponse(res, { success: true, data: { refreshed: true } });

    } catch (error) {
      this.logger.error('Error refreshing metrics', error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Update dashboard configuration
   */
  updateDashboardConfig = async (req: Request, res: Response): Promise<void> => {
    try {
      const config = req.body;
      
      if (!config || typeof config !== 'object') {
        this.sendResponse(res, { success: false, error: 'Valid configuration object is required' }, 400);
        return;
      }

      this.dashboard.updateConfig(config);
      
      this.sendResponse(res, { success: true, data: { updated: true } });

    } catch (error) {
      this.logger.error('Error updating dashboard configuration', error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Get feature flag metrics (if feature flag monitoring is available)
   */
  getFeatureFlagMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.featureFlagMonitoring) {
        this.sendResponse(res, { success: false, error: 'Feature flag monitoring not available' }, 404);
        return;
      }

      const summary = this.featureFlagMonitoring.getMonitoringSummary();
      const usageMetrics = this.featureFlagMonitoring.getAllUsageMetrics();
      const performanceMetrics = this.featureFlagMonitoring.getAllPerformanceMetrics();

      this.sendResponse(res, {
        success: true,
        data: {
          summary,
          usageMetrics,
          performanceMetrics
        }
      });

    } catch (error) {
      this.logger.error('Error getting feature flag metrics', error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Get feature flag alerts
   */
  getFeatureFlagAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.featureFlagMonitoring) {
        this.sendResponse(res, { success: false, error: 'Feature flag monitoring not available' }, 404);
        return;
      }

      const flagName = req.query.flagName as string;
      const alerts = this.featureFlagMonitoring.getActiveAlerts(flagName);

      this.sendResponse(res, { success: true, data: alerts });

    } catch (error) {
      this.logger.error('Error getting feature flag alerts', error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Get feature flag rollout status
   */
  getFeatureFlagRollouts = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.featureFlagManagement) {
        this.sendResponse(res, { success: false, error: 'Feature flag management not available' }, 404);
        return;
      }

      const activeRollouts = this.featureFlagManagement.getActiveRollouts();
      const stats = this.featureFlagManagement.getManagementStats();

      this.sendResponse(res, {
        success: true,
        data: {
          activeRollouts,
          stats
        }
      });

    } catch (error) {
      this.logger.error('Error getting feature flag rollouts', error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Get system health summary
   */
  getSystemHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = this.dashboard.getCurrentMetrics();
      
      if (!metrics) {
        this.sendResponse(res, { success: false, error: 'No metrics available' }, 404);
        return;
      }

      const health = {
        status: metrics.overview.systemHealth,
        timestamp: new Date().toISOString(),
        components: {
          hooks: {
            status: metrics.overview.systemHealth,
            totalHooks: metrics.overview.totalHooks,
            healthyHooks: metrics.overview.healthyHooks,
            warningHooks: metrics.overview.warningHooks,
            criticalHooks: metrics.overview.criticalHooks
          },
          performance: {
            status: metrics.overview.averageExecutionTime < 100 ? 'healthy' : 
                    metrics.overview.averageExecutionTime < 500 ? 'warning' : 'critical',
            averageExecutionTime: metrics.overview.averageExecutionTime,
            totalExecutions: metrics.overview.totalExecutions
          },
          errors: {
            status: metrics.overview.overallErrorRate < 1 ? 'healthy' : 
                    metrics.overview.overallErrorRate < 5 ? 'warning' : 'critical',
            errorRate: metrics.overview.overallErrorRate,
            totalErrors: metrics.errors.totalErrors,
            recentErrors: metrics.errors.recentErrors
          },
          jobs: {
            status: metrics.jobs.systemHealth.queueHealth.status,
            queueHealth: metrics.jobs.systemHealth.queueHealth.status,
            workerHealth: metrics.jobs.systemHealth.workerHealth.status,
            recentFailures: metrics.jobs.recentFailures.length
          }
        }
      };

      this.sendResponse(res, { success: true, data: health });

    } catch (error) {
      this.logger.error('Error getting system health', error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Get dashboard statistics
   */
  getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const metrics = this.dashboard.getCurrentMetrics();
      const hookStatuses = this.dashboard.getHookStatuses();
      const alerts = this.dashboard.getAlerts();

      if (!metrics) {
        this.sendResponse(res, { success: false, error: 'No metrics available' }, 404);
        return;
      }

      const stats = {
        overview: metrics.overview,
        hookStatuses: {
          total: hookStatuses.length,
          byStatus: {
            healthy: hookStatuses.filter(h => h.status === 'healthy').length,
            warning: hookStatuses.filter(h => h.status === 'warning').length,
            critical: hookStatuses.filter(h => h.status === 'critical').length,
            disabled: hookStatuses.filter(h => h.status === 'disabled').length
          }
        },
        alerts: {
          total: alerts.length,
          unacknowledged: alerts.filter(a => !a.acknowledged).length,
          unresolved: alerts.filter(a => !a.resolved).length,
          byType: {
            error: alerts.filter(a => a.type === 'error').length,
            warning: alerts.filter(a => a.type === 'warning').length,
            info: alerts.filter(a => a.type === 'info').length
          }
        },
        performance: {
          slowestHooks: metrics.performance.slowestHooks.slice(0, 5),
          fastestHooks: metrics.performance.fastestHooks.slice(0, 5)
        },
        errors: {
          topErrors: metrics.errors.topErrors.slice(0, 5),
          errorTrends: metrics.errors.errorTrends.slice(-10)
        }
      };

      this.sendResponse(res, { success: true, data: stats });

    } catch (error) {
      this.logger.error('Error getting dashboard statistics', error);
      this.sendResponse(res, { success: false, error: 'Internal server error' }, 500);
    }
  };

  /**
   * Send API response
   */
  private sendResponse<T>(res: Response, response: Omit<ApiResponse<T>, 'timestamp'>, statusCode: number = 200): void {
    const apiResponse: ApiResponse<T> = {
      ...response,
      timestamp: new Date().toISOString()
    };

    if (this.config.enableCaching && statusCode === 200) {
      res.set('Cache-Control', `public, max-age=${this.config.cacheMaxAge}`);
    }

    res.status(statusCode).json(apiResponse);
  }

  /**
   * Get cached response
   */
  private getCachedResponse(key: string): any {
    if (!this.config.enableCaching) return null;

    const cached = this.responseCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const maxAge = this.config.cacheMaxAge * 1000;

    if (now - cached.timestamp > maxAge) {
      this.responseCache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached response
   */
  private setCachedResponse(key: string, data: any): void {
    if (!this.config.enableCaching) return;

    this.responseCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  private clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Setup cache cleanup
   */
  private setupCacheCleanup(): void {
    if (!this.config.enableCaching) return;

    setInterval(() => {
      const now = Date.now();
      const maxAge = this.config.cacheMaxAge * 1000;

      for (const [key, cached] of this.responseCache.entries()) {
        if (now - cached.timestamp > maxAge) {
          this.responseCache.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Get API routes configuration
   */
  getRoutes(): Array<{
    method: string;
    path: string;
    handler: (req: Request, res: Response) => Promise<void>;
    description: string;
  }> {
    return [
      {
        method: 'GET',
        path: '/api/dashboard/metrics',
        handler: this.getMetrics,
        description: 'Get current dashboard metrics'
      },
      {
        method: 'GET',
        path: '/api/dashboard/metrics/history',
        handler: this.getMetricsHistory,
        description: 'Get metrics history'
      },
      {
        method: 'GET',
        path: '/api/dashboard/hooks',
        handler: this.getHookStatuses,
        description: 'Get all hook statuses'
      },
      {
        method: 'GET',
        path: '/api/dashboard/hooks/:hookName',
        handler: this.getHookStatus,
        description: 'Get specific hook status'
      },
      {
        method: 'GET',
        path: '/api/dashboard/hooks/:hookName/performance',
        handler: this.getHookPerformanceTrends,
        description: 'Get hook performance trends'
      },
      {
        method: 'GET',
        path: '/api/dashboard/hooks/:hookName/errors',
        handler: this.getHookErrorTrends,
        description: 'Get hook error trends'
      },
      {
        method: 'GET',
        path: '/api/dashboard/alerts',
        handler: this.getAlerts,
        description: 'Get alerts with optional filtering'
      },
      {
        method: 'POST',
        path: '/api/dashboard/alerts/:alertId/acknowledge',
        handler: this.acknowledgeAlert,
        description: 'Acknowledge an alert'
      },
      {
        method: 'POST',
        path: '/api/dashboard/alerts/:alertId/resolve',
        handler: this.resolveAlert,
        description: 'Resolve an alert'
      },
      {
        method: 'POST',
        path: '/api/dashboard/refresh',
        handler: this.refreshMetrics,
        description: 'Force refresh metrics'
      },
      {
        method: 'PUT',
        path: '/api/dashboard/config',
        handler: this.updateDashboardConfig,
        description: 'Update dashboard configuration'
      },
      {
        method: 'GET',
        path: '/api/dashboard/feature-flags/metrics',
        handler: this.getFeatureFlagMetrics,
        description: 'Get feature flag metrics'
      },
      {
        method: 'GET',
        path: '/api/dashboard/feature-flags/alerts',
        handler: this.getFeatureFlagAlerts,
        description: 'Get feature flag alerts'
      },
      {
        method: 'GET',
        path: '/api/dashboard/feature-flags/rollouts',
        handler: this.getFeatureFlagRollouts,
        description: 'Get feature flag rollout status'
      },
      {
        method: 'GET',
        path: '/api/dashboard/health',
        handler: this.getSystemHealth,
        description: 'Get system health summary'
      },
      {
        method: 'GET',
        path: '/api/dashboard/stats',
        handler: this.getDashboardStats,
        description: 'Get dashboard statistics'
      }
    ];
  }
}

export default DashboardAPI;