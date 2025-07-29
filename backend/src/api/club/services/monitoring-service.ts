/**
 * Club Monitoring Service
 * 
 * Central monitoring service that coordinates metrics collection, alerting,
 * and dashboard functionality for the club system.
 */

import { ClubMetricsCollector } from './metrics-collector';
import { ClubMetricsDashboard } from './metrics-dashboard';
import { ClubAlertingSystem } from './alerting-system';

interface MonitoringConfig {
  metricsCollection: {
    enabled: boolean;
    basicInterval: number; // seconds
    performanceInterval: number; // seconds
    operationalInterval: number; // seconds
  };
  alerting: {
    enabled: boolean;
    checkInterval: number; // seconds
  };
  dashboard: {
    enabled: boolean;
    cacheTimeout: number; // seconds
  };
  cleanup: {
    enabled: boolean;
    interval: number; // hours
    retentionDays: number;
  };
}

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  version: string;
  lastCheck: Date;
  components: {
    metricsCollection: 'running' | 'stopped' | 'error';
    alerting: 'running' | 'stopped' | 'error';
    dashboard: 'running' | 'stopped' | 'error';
  };
  statistics: {
    totalMetrics: number;
    activeAlerts: number;
    metricsPerSecond: number;
    alertsToday: number;
  };
}

export class ClubMonitoringService {
  private strapi: any;
  private metricsCollector: ClubMetricsCollector;
  private dashboard: ClubMetricsDashboard;
  private alertingSystem: ClubAlertingSystem;
  private performanceMonitor: any;
  private config: MonitoringConfig;
  private startTime: Date;
  private cleanupInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.startTime = new Date();
    
    // Initialize configuration
    this.config = this.loadConfiguration();
    
    // Initialize performance monitor (placeholder - would be actual implementation)
    this.performanceMonitor = this.createPerformanceMonitor();
    
    // Initialize components
    this.alertingSystem = new ClubAlertingSystem(strapi);
    this.metricsCollector = new ClubMetricsCollector(strapi);
    this.dashboard = new ClubMetricsDashboard(strapi, this.performanceMonitor, this.alertingSystem);
    
    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Load monitoring configuration
   */
  private loadConfiguration(): MonitoringConfig {
    return {
      metricsCollection: {
        enabled: process.env.CLUB_METRICS_ENABLED !== 'false',
        basicInterval: parseInt(process.env.CLUB_METRICS_BASIC_INTERVAL || '30'),
        performanceInterval: parseInt(process.env.CLUB_METRICS_PERFORMANCE_INTERVAL || '60'),
        operationalInterval: parseInt(process.env.CLUB_METRICS_OPERATIONAL_INTERVAL || '300')
      },
      alerting: {
        enabled: process.env.CLUB_ALERTING_ENABLED !== 'false',
        checkInterval: parseInt(process.env.CLUB_ALERTING_CHECK_INTERVAL || '120')
      },
      dashboard: {
        enabled: process.env.CLUB_DASHBOARD_ENABLED !== 'false',
        cacheTimeout: parseInt(process.env.CLUB_DASHBOARD_CACHE_TIMEOUT || '60')
      },
      cleanup: {
        enabled: process.env.CLUB_MONITORING_CLEANUP_ENABLED !== 'false',
        interval: parseInt(process.env.CLUB_MONITORING_CLEANUP_INTERVAL || '24'),
        retentionDays: parseInt(process.env.CLUB_MONITORING_RETENTION_DAYS || '30')
      }
    };
  }

  /**
   * Create performance monitor (placeholder implementation)
   */
  private createPerformanceMonitor(): any {
    return {
      getMetrics: async () => ({
        responseTime: {
          average: Math.random() * 500 + 100,
          p50: Math.random() * 400 + 80,
          p95: Math.random() * 1000 + 200,
          p99: Math.random() * 2000 + 500
        },
        throughput: {
          requestsPerSecond: Math.random() * 100 + 10,
          operationsPerMinute: Math.random() * 1000 + 100
        },
        errorRate: {
          percentage: Math.random() * 5,
          total: Math.floor(Math.random() * 50),
          byType: {
            validation: Math.floor(Math.random() * 20),
            database: Math.floor(Math.random() * 10),
            cache: Math.floor(Math.random() * 5)
          }
        },
        cache: {
          hitRate: 0.7 + Math.random() * 0.25,
          missRate: 0.05 + Math.random() * 0.2,
          evictionRate: Math.random() * 0.1,
          averageResponseTime: Math.random() * 50 + 10
        },
        tableCalculations: {
          successRate: 0.85 + Math.random() * 0.14,
          totalCalculations: Math.floor(Math.random() * 1000),
          successfulCalculations: Math.floor(Math.random() * 900),
          failedCalculations: Math.floor(Math.random() * 100),
          averageCalculationTime: Math.random() * 5000 + 1000,
          calculationsThisHour: Math.floor(Math.random() * 50),
          calculationsToday: Math.floor(Math.random() * 500)
        }
      }),
      getCacheMetrics: async () => ({
        hitRate: 0.7 + Math.random() * 0.25,
        missRate: 0.05 + Math.random() * 0.2,
        evictionRate: Math.random() * 0.1
      }),
      getTableCalculationMetrics: async () => ({
        successRate: 0.85 + Math.random() * 0.14,
        totalCalculations: Math.floor(Math.random() * 1000),
        successfulCalculations: Math.floor(Math.random() * 900),
        failedCalculations: Math.floor(Math.random() * 100),
        averageCalculationTime: Math.random() * 5000 + 1000
      }),
      getValidationMetrics: async () => ({
        totalValidations: Math.floor(Math.random() * 1000),
        passedValidations: Math.floor(Math.random() * 900),
        failedValidations: Math.floor(Math.random() * 100),
        validationErrors: Math.floor(Math.random() * 50),
        errorRate: Math.random() * 0.1,
        dataIntegrityScore: 85 + Math.random() * 14
      })
    };
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    // Listen for club operations
    this.strapi.eventHub?.on('club.created', (data: any) => {
      this.metricsCollector.recordMetric('club_creation_rate', 1, {
        club_type: data.club_typ || 'unknown'
      });
    });

    this.strapi.eventHub?.on('club.updated', (data: any) => {
      this.metricsCollector.recordMetric('club_update_rate', 1, {
        club_id: data.id?.toString() || 'unknown'
      });
    });

    this.strapi.eventHub?.on('club.deleted', (data: any) => {
      this.metricsCollector.recordMetric('club_deletion_rate', 1, {
        club_id: data.id?.toString() || 'unknown'
      });
    });

    // Listen for validation errors
    this.strapi.eventHub?.on('club.validation.error', (data: any) => {
      this.metricsCollector.recordMetric('club_validation_errors', 1, {
        error_type: data.type || 'unknown',
        club_id: data.clubId?.toString() || 'unknown'
      });
    });

    // Listen for game processing
    this.strapi.eventHub?.on('club.game.processed', (data: any) => {
      this.metricsCollector.recordMetric('club_game_processing_time', data.duration || 0, {
        game_id: data.gameId?.toString() || 'unknown',
        liga_id: data.ligaId?.toString() || 'unknown'
      });
    });

    // Listen for table calculations
    this.strapi.eventHub?.on('club.table.calculated', (data: any) => {
      this.metricsCollector.recordMetric('club_table_calculation_duration', data.duration || 0, {
        liga_id: data.ligaId?.toString() || 'unknown',
        club_count: data.clubCount?.toString() || 'unknown'
      });
    });

    // Listen for cache operations
    this.strapi.eventHub?.on('club.cache.hit', () => {
      // Cache hit rate is calculated in the collector
    });

    this.strapi.eventHub?.on('club.cache.miss', () => {
      // Cache miss rate is calculated in the collector
    });
  }

  /**
   * Start the monitoring service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.strapi.log.warn('Club monitoring service is already running');
      return;
    }

    this.strapi.log.info('Starting club monitoring service', this.config);

    try {
      // Start metrics collection
      if (this.config.metricsCollection.enabled) {
        this.metricsCollector.startCollection();
        this.strapi.log.info('Started club metrics collection');
      }

      // Setup cleanup interval
      if (this.config.cleanup.enabled) {
        this.cleanupInterval = setInterval(() => {
          this.performCleanup();
        }, this.config.cleanup.interval * 60 * 60 * 1000); // Convert hours to milliseconds
        
        this.strapi.log.info(`Started cleanup interval: every ${this.config.cleanup.interval} hours`);
      }

      this.isRunning = true;
      this.strapi.log.info('Club monitoring service started successfully');

      // Emit startup event
      this.strapi.eventHub?.emit('club.monitoring.started', {
        config: this.config,
        startTime: this.startTime
      });

    } catch (error) {
      this.strapi.log.error('Failed to start club monitoring service:', error);
      throw error;
    }
  }

  /**
   * Stop the monitoring service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.strapi.log.info('Stopping club monitoring service');

    try {
      // Stop metrics collection
      this.metricsCollector.stopCollection();

      // Clear cleanup interval
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = undefined;
      }

      this.isRunning = false;
      this.strapi.log.info('Club monitoring service stopped');

      // Emit shutdown event
      this.strapi.eventHub?.emit('club.monitoring.stopped', {
        uptime: Date.now() - this.startTime.getTime()
      });

    } catch (error) {
      this.strapi.log.error('Error stopping club monitoring service:', error);
      throw error;
    }
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const uptime = Date.now() - this.startTime.getTime();
    const activeAlerts = this.alertingSystem.getActiveAlerts().length;
    const totalMetrics = this.metricsCollector.getMetrics().size;

    // Calculate metrics per second (rough estimate)
    const metricsPerSecond = totalMetrics > 0 ? totalMetrics / (uptime / 1000) : 0;

    // Get alerts from today
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alertSummary = await this.alertingSystem.getAlertSummary();
    const alertsToday = alertSummary.resolved.today + alertSummary.active.critical + 
                      alertSummary.active.warning + alertSummary.active.info;

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (activeAlerts > 0) {
      const criticalAlerts = this.alertingSystem.getActiveAlerts()
        .filter(alert => alert.severity === 'critical').length;
      if (criticalAlerts > 0) {
        status = 'critical';
      } else {
        status = 'degraded';
      }
    }

    return {
      status,
      uptime: Math.round(uptime / 1000), // seconds
      version: '1.0.0',
      lastCheck: new Date(),
      components: {
        metricsCollection: this.isRunning && this.config.metricsCollection.enabled ? 'running' : 'stopped',
        alerting: this.isRunning && this.config.alerting.enabled ? 'running' : 'stopped',
        dashboard: this.config.dashboard.enabled ? 'running' : 'stopped'
      },
      statistics: {
        totalMetrics,
        activeAlerts,
        metricsPerSecond: Math.round(metricsPerSecond * 100) / 100,
        alertsToday
      }
    };
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(): Promise<any> {
    if (!this.config.dashboard.enabled) {
      throw new Error('Dashboard is disabled');
    }

    return await this.dashboard.getDashboardData();
  }

  /**
   * Get metrics collector
   */
  getMetricsCollector(): ClubMetricsCollector {
    return this.metricsCollector;
  }

  /**
   * Get alerting system
   */
  getAlertingSystem(): ClubAlertingSystem {
    return this.alertingSystem;
  }

  /**
   * Get dashboard
   */
  getDashboard(): ClubMetricsDashboard {
    return this.dashboard;
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    this.metricsCollector.recordMetric(name, value, tags);
    
    // Also check for alerts
    this.alertingSystem.processMetric(name, value, tags);
  }

  /**
   * Get health check endpoint data
   */
  async getHealthCheck(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
    checks: Record<string, boolean>;
  }> {
    const systemStatus = await this.getSystemStatus();
    
    const checks = {
      metricsCollection: systemStatus.components.metricsCollection === 'running',
      alerting: systemStatus.components.alerting === 'running',
      dashboard: systemStatus.components.dashboard === 'running',
      database: true, // Would check actual database connectivity
      cache: true     // Would check actual cache connectivity
    };

    return {
      status: systemStatus.status,
      timestamp: new Date().toISOString(),
      uptime: systemStatus.uptime,
      version: systemStatus.version,
      checks
    };
  }

  /**
   * Export all monitoring data
   */
  async exportMonitoringData(): Promise<any> {
    const [systemStatus, dashboardData, metrics, alerts] = await Promise.all([
      this.getSystemStatus(),
      this.getDashboardData(),
      this.metricsCollector.exportMetrics(),
      this.alertingSystem.getAlertSummary()
    ]);

    return {
      timestamp: new Date().toISOString(),
      system: 'viktoria-club-monitoring',
      version: '1.0.0',
      systemStatus,
      dashboardData,
      metrics,
      alerts,
      configuration: this.config
    };
  }

  /**
   * Perform cleanup of old data
   */
  private async performCleanup(): Promise<void> {
    try {
      this.strapi.log.info('Starting monitoring data cleanup');

      // Clean up old metrics
      this.metricsCollector.clearOldMetrics(this.config.cleanup.retentionDays * 24);

      // Clean up old alerts
      this.alertingSystem.cleanupOldAlerts(this.config.cleanup.retentionDays);

      // Clear dashboard cache
      this.dashboard.clearCache();

      this.strapi.log.info('Monitoring data cleanup completed');

    } catch (error) {
      this.strapi.log.error('Error during monitoring cleanup:', error);
    }
  }

  /**
   * Update configuration
   */
  updateConfiguration(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.strapi.log.info('Updated monitoring configuration', this.config);

    // Restart if running to apply new configuration
    if (this.isRunning) {
      this.stop().then(() => this.start());
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Test alert system
   */
  async testAlert(severity: 'info' | 'warning' | 'critical' = 'info'): Promise<void> {
    const testMetricName = 'test_metric';
    const testValue = severity === 'critical' ? 100 : severity === 'warning' ? 50 : 10;
    
    // Add a temporary test rule
    this.alertingSystem.addAlertRule({
      id: 'test-alert',
      name: 'Test Alert',
      metric: testMetricName,
      operator: 'gt',
      value: testValue - 1,
      severity,
      description: `Test alert with ${severity} severity`,
      enabled: true,
      cooldownMinutes: 0,
      notificationChannels: ['log', 'console']
    });

    // Trigger the test metric
    await this.alertingSystem.processMetric(testMetricName, testValue);

    // Remove the test rule
    this.alertingSystem.removeAlertRule('test-alert');

    this.strapi.log.info(`Test alert triggered with severity: ${severity}`);
  }
}