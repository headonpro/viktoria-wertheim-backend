/**
 * Dashboard Integration Service
 * 
 * Integrates the monitoring dashboard with the existing hook system.
 * Provides a unified interface for dashboard initialization and management.
 */

import { Server as HttpServer } from 'http';
import { HookMonitoringDashboard } from './HookMonitoringDashboard';
import { DashboardAPI } from './DashboardAPI';
import { DashboardWebSocket } from './DashboardWebSocket';
import PerformanceMonitor from '../logging/PerformanceMonitor';
import ErrorTracker from '../logging/ErrorTracker';
import JobMonitor from '../JobMonitor';
import { BackgroundJobQueue } from '../BackgroundJobQueue';
import { JobScheduler } from '../JobScheduler';
import { StructuredLogger } from '../logging/StructuredLogger';

/**
 * Dashboard integration configuration
 */
export interface DashboardIntegrationConfig {
  enabled: boolean;
  dashboard: {
    refreshInterval: number;
    enableRealTimeUpdates: boolean;
    metricsHistorySize: number;
  };
  api: {
    enabled: boolean;
    basePath: string;
  };
  websocket: {
    enabled: boolean;
    namespace: string;
    cors: {
      origin: string | string[];
      credentials: boolean;
    };
  };
  monitoring: {
    performanceThresholds: {
      slowHookThreshold: number;
      highErrorRateThreshold: number;
      criticalErrorRateThreshold: number;
    };
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: DashboardIntegrationConfig = {
  enabled: true,
  dashboard: {
    refreshInterval: 5000,
    enableRealTimeUpdates: true,
    metricsHistorySize: 100
  },
  api: {
    enabled: true,
    basePath: '/api/monitoring'
  },
  websocket: {
    enabled: true,
    namespace: '/dashboard',
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:1337'],
      credentials: true
    }
  },
  monitoring: {
    performanceThresholds: {
      slowHookThreshold: 100,
      highErrorRateThreshold: 5,
      criticalErrorRateThreshold: 15
    }
  }
};

/**
 * Dashboard Integration Service
 */
export class DashboardIntegration {
  private strapi: any;
  private config: DashboardIntegrationConfig;
  private logger: StructuredLogger;

  // Core services
  private performanceMonitor?: PerformanceMonitor;
  private errorTracker?: ErrorTracker;
  private jobMonitor?: JobMonitor;

  // Dashboard components
  private dashboard?: HookMonitoringDashboard;
  private api?: DashboardAPI;
  private websocket?: DashboardWebSocket;
  private httpServer?: HttpServer;

  // State
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  constructor(strapi: any, config: Partial<DashboardIntegrationConfig> = {}) {
    this.strapi = strapi;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new StructuredLogger(strapi);
  }

  /**
   * Initialize the dashboard integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Dashboard integration already initialized');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('Dashboard integration disabled');
      return;
    }

    try {
      this.logger.info('Initializing dashboard integration...');

      // Initialize monitoring services
      await this.initializeMonitoringServices();

      // Initialize dashboard
      await this.initializeDashboard();

      // Initialize API if enabled
      if (this.config.api.enabled) {
        await this.initializeAPI();
      }

      // Initialize WebSocket if enabled
      if (this.config.websocket.enabled) {
        await this.initializeWebSocket();
      }

      this.isInitialized = true;
      this.logger.info('Dashboard integration initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize dashboard integration', error);
      throw error;
    }
  }

  /**
   * Start the dashboard services
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Dashboard integration not initialized');
    }

    if (this.isRunning) {
      this.logger.warn('Dashboard integration already running');
      return;
    }

    try {
      this.logger.info('Starting dashboard services...');

      // Start monitoring services
      if (this.jobMonitor) {
        this.jobMonitor.start();
      }

      // Start dashboard
      if (this.dashboard) {
        this.dashboard.start();
      }

      this.isRunning = true;
      this.logger.info('Dashboard services started successfully');

    } catch (error) {
      this.logger.error('Failed to start dashboard services', error);
      throw error;
    }
  }

  /**
   * Stop the dashboard services
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.logger.info('Stopping dashboard services...');

      // Stop dashboard
      if (this.dashboard) {
        this.dashboard.stop();
      }

      // Stop monitoring services
      if (this.jobMonitor) {
        this.jobMonitor.stop();
      }

      // Shutdown WebSocket
      if (this.websocket) {
        this.websocket.shutdown();
      }

      this.isRunning = false;
      this.logger.info('Dashboard services stopped successfully');

    } catch (error) {
      this.logger.error('Failed to stop dashboard services', error);
      throw error;
    }
  }

  /**
   * Get dashboard instance
   */
  getDashboard(): HookMonitoringDashboard | undefined {
    return this.dashboard;
  }

  /**
   * Get API instance
   */
  getAPI(): DashboardAPI | undefined {
    return this.api;
  }

  /**
   * Get WebSocket instance
   */
  getWebSocket(): DashboardWebSocket | undefined {
    return this.websocket;
  }

  /**
   * Get monitoring services
   */
  getMonitoringServices(): {
    performanceMonitor?: PerformanceMonitor;
    errorTracker?: ErrorTracker;
    jobMonitor?: JobMonitor;
  } {
    return {
      performanceMonitor: this.performanceMonitor,
      errorTracker: this.errorTracker,
      jobMonitor: this.jobMonitor
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DashboardIntegrationConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };

    // Update dashboard config if running
    if (this.dashboard && this.isRunning) {
      this.dashboard.updateConfig(this.config.dashboard);
    }

    this.logger.info('Dashboard integration configuration updated', {
      oldConfig,
      newConfig: this.config
    });
  }

  /**
   * Get integration status
   */
  getStatus(): {
    initialized: boolean;
    running: boolean;
    services: {
      dashboard: boolean;
      api: boolean;
      websocket: boolean;
      monitoring: boolean;
    };
    config: DashboardIntegrationConfig;
  } {
    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      services: {
        dashboard: !!this.dashboard,
        api: !!this.api,
        websocket: !!this.websocket,
        monitoring: !!(this.performanceMonitor && this.errorTracker && this.jobMonitor)
      },
      config: this.config
    };
  }

  /**
   * Initialize monitoring services
   */
  private async initializeMonitoringServices(): Promise<void> {
    this.logger.debug('Initializing monitoring services...');

    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor({
      enabled: true,
      collectMemoryMetrics: true,
      collectCpuMetrics: false
    });

    // Initialize error tracker
    this.errorTracker = new ErrorTracker({
      enabled: true,
      enableStackTraceAnalysis: true,
      enablePerformanceTracking: true
    });

    // Initialize job queue and scheduler (if not already available)
    const jobQueue = this.getOrCreateJobQueue();
    const jobScheduler = this.getOrCreateJobScheduler();

    // Initialize job monitor
    this.jobMonitor = new JobMonitor(
      this.strapi,
      jobQueue,
      jobScheduler,
      {
        alerting: {
          enabled: true,
          channels: ['log']
        }
      }
    );

    this.logger.debug('Monitoring services initialized');
  }

  /**
   * Initialize dashboard
   */
  private async initializeDashboard(): Promise<void> {
    if (!this.performanceMonitor || !this.errorTracker || !this.jobMonitor) {
      throw new Error('Monitoring services not initialized');
    }

    this.logger.debug('Initializing dashboard...');

    this.dashboard = new HookMonitoringDashboard(
      this.strapi,
      this.performanceMonitor,
      this.errorTracker,
      this.jobMonitor,
      {
        ...this.config.dashboard,
        performanceThresholds: this.config.monitoring.performanceThresholds
      }
    );

    this.logger.debug('Dashboard initialized');
  }

  /**
   * Initialize API
   */
  private async initializeAPI(): Promise<void> {
    if (!this.dashboard) {
      throw new Error('Dashboard not initialized');
    }

    this.logger.debug('Initializing dashboard API...');

    this.api = new DashboardAPI(
      this.dashboard,
      this.strapi,
      {
        enableCors: true,
        enableAuthentication: false,
        enableRateLimit: true,
        rateLimitWindowMs: 60000,
        rateLimitMaxRequests: 100,
        enableCaching: true,
        cacheMaxAge: 30,
        enableCompression: true
      }
    );

    this.logger.debug('Dashboard API initialized');
  }

  /**
   * Initialize WebSocket
   */
  private async initializeWebSocket(): Promise<void> {
    if (!this.dashboard) {
      throw new Error('Dashboard not initialized');
    }

    this.logger.debug('Initializing dashboard WebSocket...');

    // Create WebSocket service with HTTP server
    this.websocket = new DashboardWebSocket(
      this.strapi.server.httpServer,
      this.dashboard,
      this.strapi,
      {
        enableCors: true,
        corsOrigins: ['http://localhost:3000', 'http://localhost:1337'],
        enableAuthentication: false,
        enableRateLimit: true,
        rateLimitWindowMs: 60000,
        rateLimitMaxMessages: 100,
        enableCompression: true,
        maxConnections: 1000
      }
    );

    this.logger.debug('Dashboard WebSocket initialized');
  }

  /**
   * Get or create job queue
   */
  private getOrCreateJobQueue(): BackgroundJobQueue {
    // Try to get existing job queue from strapi services
    if (this.strapi.services?.['job-queue']) {
      return this.strapi.services['job-queue'];
    }

    // Create new job queue if not available
    return new BackgroundJobQueue(this.strapi);
  }

  /**
   * Get or create job scheduler
   */
  private getOrCreateJobScheduler(): JobScheduler | undefined {
    // Try to get existing job scheduler from strapi services
    if (this.strapi.services?.['job-scheduler']) {
      return this.strapi.services['job-scheduler'];
    }

    // Job scheduler is optional
    return undefined;
  }

  /**
   * Register with Strapi lifecycle
   */
  static registerWithStrapi(strapi: any, config?: Partial<DashboardIntegrationConfig>): DashboardIntegration {
    const integration = new DashboardIntegration(strapi, config);

    // Register as Strapi service
    strapi.services['dashboard-integration'] = integration;

    // Hook into Strapi lifecycle
    strapi.server.on('ready', async () => {
      try {
        await integration.initialize();
        await integration.start();
      } catch (error) {
        strapi.log.error('Failed to start dashboard integration', error);
      }
    });

    strapi.server.on('close', async () => {
      try {
        await integration.stop();
      } catch (error) {
        strapi.log.error('Failed to stop dashboard integration', error);
      }
    });

    return integration;
  }
}

export default DashboardIntegration;