/**
 * Dashboard WebSocket Service
 * 
 * Provides real-time WebSocket communication for the monitoring dashboard,
 * enabling live updates of metrics, alerts, and system status.
 * 
 * Requirements: 7.3, 7.4
 */

// import { Server as SocketIOServer, Socket } from 'socket.io';
type SocketIOServer = any;
type Socket = any;
import { Server as HttpServer } from 'http';
import HookMonitoringDashboard, { DashboardMetrics, DashboardEvent } from './HookMonitoringDashboard';
import { FeatureFlagMonitoring } from '../feature-flags/FeatureFlagMonitoring';
import { FeatureFlagManagement } from '../feature-flags/FeatureFlagManagement';
import { StructuredLogger } from '../logging/StructuredLogger';

/**
 * WebSocket client information
 */
interface WebSocketClient {
  id: string;
  socket: Socket;
  connectedAt: Date;
  lastActivity: Date;
  subscriptions: Set<string>;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
}

/**
 * WebSocket message types
 */
export type WebSocketMessageType = 
  | 'metrics_update'
  | 'hook_status_change'
  | 'alert_triggered'
  | 'alert_acknowledged'
  | 'alert_resolved'
  | 'performance_warning'
  | 'error_occurred'
  | 'system_health_change'
  | 'feature_flag_update'
  | 'rollout_status_change';

/**
 * WebSocket message
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  timestamp: string;
  data: any;
  source: 'dashboard' | 'feature_flags' | 'system';
}

/**
 * WebSocket configuration
 */
export interface WebSocketConfig {
  enableCors: boolean;
  corsOrigins: string[];
  enableAuthentication: boolean;
  enableRateLimit: boolean;
  rateLimitWindowMs: number;
  rateLimitMaxMessages: number;
  enableCompression: boolean;
  pingTimeout: number;
  pingInterval: number;
  maxConnections: number;
  enableMetrics: boolean;
  metricsInterval: number;
}

/**
 * Default WebSocket configuration
 */
const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  enableCors: true,
  corsOrigins: ['http://localhost:3000', 'http://localhost:1337'],
  enableAuthentication: false,
  enableRateLimit: true,
  rateLimitWindowMs: 60000, // 1 minute
  rateLimitMaxMessages: 100,
  enableCompression: true,
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  maxConnections: 100,
  enableMetrics: true,
  metricsInterval: 5000 // 5 seconds
};

/**
 * WebSocket statistics
 */
export interface WebSocketStats {
  totalConnections: number;
  activeConnections: number;
  totalMessages: number;
  messagesPerSecond: number;
  averageLatency: number;
  connectionsByType: Record<string, number>;
  subscriptionsByTopic: Record<string, number>;
  errorCount: number;
  uptime: number;
}

/**
 * Dashboard WebSocket Service
 */
export class DashboardWebSocket {
  private io: SocketIOServer;
  private dashboard: HookMonitoringDashboard;
  private featureFlagMonitoring?: FeatureFlagMonitoring;
  private featureFlagManagement?: FeatureFlagManagement;
  private strapi: any;
  private logger: StructuredLogger;
  private config: WebSocketConfig;

  // Client management
  private clients: Map<string, WebSocketClient> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // topic -> client IDs
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();

  // Statistics
  private stats: WebSocketStats = {
    totalConnections: 0,
    activeConnections: 0,
    totalMessages: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    connectionsByType: {},
    subscriptionsByTopic: {},
    errorCount: 0,
    uptime: Date.now()
  };

  // Timers
  private metricsTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;
  private statsTimer?: NodeJS.Timeout;

  constructor(
    httpServer: HttpServer,
    dashboard: HookMonitoringDashboard,
    strapi: any,
    config: Partial<WebSocketConfig> = {},
    featureFlagMonitoring?: FeatureFlagMonitoring,
    featureFlagManagement?: FeatureFlagManagement
  ) {
    this.dashboard = dashboard;
    this.featureFlagMonitoring = featureFlagMonitoring;
    this.featureFlagManagement = featureFlagManagement;
    this.strapi = strapi;
    this.logger = new StructuredLogger(strapi);
    this.config = { ...DEFAULT_WEBSOCKET_CONFIG, ...config };

    this.initializeSocketIO(httpServer);
    this.setupEventListeners();
    this.startTimers();

    this.logger.info('Dashboard WebSocket initialized', {
      maxConnections: this.config.maxConnections,
      enableAuthentication: this.config.enableAuthentication,
      enableRateLimit: this.config.enableRateLimit
    });
  }

  /**
   * Initialize Socket.IO server
   */
  private initializeSocketIO(httpServer: HttpServer): void {
    // Socket.IO is disabled for now
    this.logger.info('WebSocket functionality is disabled');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: Socket): void {
    const clientId = socket.id;
    const userAgent = socket.handshake.headers['user-agent'];
    const ipAddress = socket.handshake.address;

    // Check connection limit
    if (this.clients.size >= this.config.maxConnections) {
      this.logger.warn('WebSocket connection rejected: max connections reached', {
        clientId,
        maxConnections: this.config.maxConnections
      });
      socket.emit('error', { message: 'Maximum connections reached' });
      socket.disconnect();
      return;
    }

    // Create client record
    const client: WebSocketClient = {
      id: clientId,
      socket,
      connectedAt: new Date(),
      lastActivity: new Date(),
      subscriptions: new Set(),
      userAgent,
      ipAddress
    };

    this.clients.set(clientId, client);
    this.stats.totalConnections++;
    this.stats.activeConnections++;

    this.logger.info('WebSocket client connected', {
      clientId,
      userAgent,
      ipAddress,
      totalConnections: this.stats.totalConnections,
      activeConnections: this.stats.activeConnections
    });

    // Setup client event handlers
    this.setupClientHandlers(client);

    // Send initial data
    this.sendInitialData(client);

    // Emit connection event
    this.emit('client_connected', { clientId, client });
  }

  /**
   * Setup client event handlers
   */
  private setupClientHandlers(client: WebSocketClient): void {
    const { socket } = client;

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(client, reason);
    });

    // Handle subscription requests
    socket.on('subscribe', (data) => {
      this.handleSubscription(client, data);
    });

    // Handle unsubscription requests
    socket.on('unsubscribe', (data) => {
      this.handleUnsubscription(client, data);
    });

    // Handle ping/pong for latency measurement
    socket.on('ping', (timestamp) => {
      socket.emit('pong', timestamp);
    });

    // Handle alert acknowledgment
    socket.on('acknowledge_alert', (data) => {
      this.handleAlertAcknowledgment(client, data);
    });

    // Handle alert resolution
    socket.on('resolve_alert', (data) => {
      this.handleAlertResolution(client, data);
    });

    // Handle metrics refresh request
    socket.on('refresh_metrics', () => {
      this.handleMetricsRefresh(client);
    });

    // Handle error
    socket.on('error', (error) => {
      this.handleClientError(client, error);
    });

    // Update last activity on any message
    socket.onAny(() => {
      client.lastActivity = new Date();
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(client: WebSocketClient, reason: string): void {
    const { id: clientId } = client;

    // Remove from subscriptions
    for (const topic of client.subscriptions) {
      const subscribers = this.subscriptions.get(topic);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.subscriptions.delete(topic);
        }
      }
    }

    // Remove client
    this.clients.delete(clientId);
    this.stats.activeConnections--;

    this.logger.info('WebSocket client disconnected', {
      clientId,
      reason,
      activeConnections: this.stats.activeConnections,
      connectionDuration: Date.now() - client.connectedAt.getTime()
    });

    // Emit disconnection event
    this.emit('client_disconnected', { clientId, reason });
  }

  /**
   * Handle subscription request
   */
  private handleSubscription(client: WebSocketClient, data: { topics: string[] }): void {
    if (!data.topics || !Array.isArray(data.topics)) {
      client.socket.emit('error', { message: 'Invalid subscription data' });
      return;
    }

    for (const topic of data.topics) {
      if (this.isValidTopic(topic)) {
        client.subscriptions.add(topic);
        
        if (!this.subscriptions.has(topic)) {
          this.subscriptions.set(topic, new Set());
        }
        this.subscriptions.get(topic)!.add(client.id);

        this.logger.debug('Client subscribed to topic', {
          clientId: client.id,
          topic
        });
      }
    }

    client.socket.emit('subscription_confirmed', {
      topics: Array.from(client.subscriptions)
    });
  }

  /**
   * Handle unsubscription request
   */
  private handleUnsubscription(client: WebSocketClient, data: { topics: string[] }): void {
    if (!data.topics || !Array.isArray(data.topics)) {
      client.socket.emit('error', { message: 'Invalid unsubscription data' });
      return;
    }

    for (const topic of data.topics) {
      client.subscriptions.delete(topic);
      
      const subscribers = this.subscriptions.get(topic);
      if (subscribers) {
        subscribers.delete(client.id);
        if (subscribers.size === 0) {
          this.subscriptions.delete(topic);
        }
      }

      this.logger.debug('Client unsubscribed from topic', {
        clientId: client.id,
        topic
      });
    }

    client.socket.emit('unsubscription_confirmed', {
      topics: data.topics
    });
  }

  /**
   * Handle alert acknowledgment
   */
  private handleAlertAcknowledgment(client: WebSocketClient, data: { alertId: string; acknowledgedBy: string }): void {
    if (!this.checkRateLimit(client)) {
      return;
    }

    try {
      const result = this.dashboard.acknowledgeAlert(data.alertId, data.acknowledgedBy);
      
      client.socket.emit('alert_acknowledgment_result', {
        alertId: data.alertId,
        success: result
      });

      if (result) {
        this.broadcast('alert_acknowledged', {
          alertId: data.alertId,
          acknowledgedBy: data.acknowledgedBy,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      this.logger.error('Error handling alert acknowledgment', error);
      client.socket.emit('error', { message: 'Failed to acknowledge alert' });
    }
  }

  /**
   * Handle alert resolution
   */
  private handleAlertResolution(client: WebSocketClient, data: { alertId: string }): void {
    if (!this.checkRateLimit(client)) {
      return;
    }

    try {
      const result = this.dashboard.resolveAlert(data.alertId);
      
      client.socket.emit('alert_resolution_result', {
        alertId: data.alertId,
        success: result
      });

      if (result) {
        this.broadcast('alert_resolved', {
          alertId: data.alertId,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      this.logger.error('Error handling alert resolution', error);
      client.socket.emit('error', { message: 'Failed to resolve alert' });
    }
  }

  /**
   * Handle metrics refresh request
   */
  private handleMetricsRefresh(client: WebSocketClient): void {
    if (!this.checkRateLimit(client)) {
      return;
    }

    try {
      this.dashboard.refreshMetrics();
      client.socket.emit('metrics_refresh_result', { success: true });

    } catch (error) {
      this.logger.error('Error handling metrics refresh', error);
      client.socket.emit('error', { message: 'Failed to refresh metrics' });
    }
  }

  /**
   * Handle client error
   */
  private handleClientError(client: WebSocketClient, error: any): void {
    this.stats.errorCount++;
    
    this.logger.error(`WebSocket client error: ${client.id}`, error);
  }

  /**
   * Send initial data to client
   */
  private sendInitialData(client: WebSocketClient): void {
    try {
      // Send current metrics
      const metrics = this.dashboard.getCurrentMetrics();
      if (metrics) {
        client.socket.emit('initial_metrics', metrics);
      }

      // Send hook statuses
      const hookStatuses = this.dashboard.getHookStatuses();
      client.socket.emit('initial_hook_statuses', hookStatuses);

      // Send active alerts
      const alerts = this.dashboard.getAlerts({ resolved: false });
      client.socket.emit('initial_alerts', alerts);

    } catch (error) {
      this.logger.error('Error sending initial data to client', error);
    }
  }

  /**
   * Setup event listeners for dashboard events
   */
  private setupEventListeners(): void {
    // Dashboard events
    this.dashboard.on('metrics_updated', (metrics: DashboardMetrics) => {
      this.broadcast('metrics_update', metrics, 'dashboard');
    });

    this.dashboard.on('real_time_event', (event: DashboardEvent) => {
      this.broadcast(event.type as WebSocketMessageType, event.data, 'dashboard');
    });

    this.dashboard.on('alert_acknowledged', (data) => {
      this.broadcast('alert_acknowledged', data, 'dashboard');
    });

    this.dashboard.on('alert_resolved', (data) => {
      this.broadcast('alert_resolved', data, 'dashboard');
    });

    // Feature flag events (if available)
    if (this.featureFlagMonitoring) {
      this.featureFlagMonitoring.on('alert_created', (data) => {
        this.broadcast('alert_triggered', data, 'feature_flags');
      });

      this.featureFlagMonitoring.on('alert_acknowledged', (data) => {
        this.broadcast('alert_acknowledged', data, 'feature_flags');
      });

      this.featureFlagMonitoring.on('alert_resolved', (data) => {
        this.broadcast('alert_resolved', data, 'feature_flags');
      });
    }

    if (this.featureFlagManagement) {
      this.featureFlagManagement.on('rollout_started', (data) => {
        this.broadcast('rollout_status_change', { ...data, status: 'started' }, 'feature_flags');
      });

      this.featureFlagManagement.on('rollout_completed', (data) => {
        this.broadcast('rollout_status_change', { ...data, status: 'completed' }, 'feature_flags');
      });

      this.featureFlagManagement.on('rollout_rolled_back', (data) => {
        this.broadcast('rollout_status_change', { ...data, status: 'rolled_back' }, 'feature_flags');
      });
    }
  }

  /**
   * Broadcast message to subscribed clients
   */
  private broadcast(
    type: WebSocketMessageType,
    data: any,
    source: 'dashboard' | 'feature_flags' | 'system' = 'dashboard',
    topic?: string
  ): void {
    const message: WebSocketMessage = {
      type,
      timestamp: new Date().toISOString(),
      data,
      source
    };

    const targetTopic = topic || type;
    const subscribers = this.subscriptions.get(targetTopic);

    if (subscribers && subscribers.size > 0) {
      for (const clientId of subscribers) {
        const client = this.clients.get(clientId);
        if (client) {
          client.socket.emit(type, message);
          this.stats.totalMessages++;
        }
      }
    } else {
      // Broadcast to all clients if no specific subscribers
      for (const client of this.clients.values()) {
        client.socket.emit(type, message);
        this.stats.totalMessages++;
      }
    }

    this.logger.debug('WebSocket message broadcasted', {
      type,
      source,
      subscriberCount: subscribers?.size || this.clients.size
    });
  }

  /**
   * Check rate limit for client
   */
  private checkRateLimit(client: WebSocketClient): boolean {
    if (!this.config.enableRateLimit) {
      return true;
    }

    const now = Date.now();
    const clientLimit = this.rateLimitMap.get(client.id);

    if (!clientLimit || now > clientLimit.resetTime) {
      this.rateLimitMap.set(client.id, {
        count: 1,
        resetTime: now + this.config.rateLimitWindowMs
      });
      return true;
    }

    if (clientLimit.count >= this.config.rateLimitMaxMessages) {
      client.socket.emit('rate_limit_exceeded', {
        message: 'Rate limit exceeded',
        resetTime: clientLimit.resetTime
      });
      return false;
    }

    clientLimit.count++;
    return true;
  }

  /**
   * Check if topic is valid
   */
  private isValidTopic(topic: string): boolean {
    const validTopics = [
      'metrics_update',
      'hook_status_change',
      'alert_triggered',
      'alert_acknowledged',
      'alert_resolved',
      'performance_warning',
      'error_occurred',
      'system_health_change',
      'feature_flag_update',
      'rollout_status_change'
    ];

    return validTopics.includes(topic);
  }

  /**
   * Start timers
   */
  private startTimers(): void {
    // Metrics broadcast timer
    if (this.config.enableMetrics) {
      this.metricsTimer = setInterval(() => {
        const metrics = this.dashboard.getCurrentMetrics();
        if (metrics) {
          this.broadcast('metrics_update', metrics, 'dashboard');
        }
      }, this.config.metricsInterval);
    }

    // Cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanupInactiveClients();
      this.cleanupRateLimitMap();
    }, 60000); // Every minute

    // Statistics timer
    this.statsTimer = setInterval(() => {
      this.updateStatistics();
    }, 10000); // Every 10 seconds
  }

  /**
   * Stop timers
   */
  private stopTimers(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = undefined;
    }
  }

  /**
   * Cleanup inactive clients
   */
  private cleanupInactiveClients(): void {
    const now = Date.now();
    const inactivityThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastActivity.getTime() > inactivityThreshold) {
        this.logger.info('Disconnecting inactive WebSocket client', {
          clientId,
          lastActivity: client.lastActivity
        });
        client.socket.disconnect();
      }
    }
  }

  /**
   * Cleanup rate limit map
   */
  private cleanupRateLimitMap(): void {
    const now = Date.now();

    for (const [clientId, limit] of this.rateLimitMap.entries()) {
      if (now > limit.resetTime) {
        this.rateLimitMap.delete(clientId);
      }
    }
  }

  /**
   * Update statistics
   */
  private updateStatistics(): void {
    this.stats.activeConnections = this.clients.size;
    this.stats.uptime = Date.now() - this.stats.uptime;

    // Calculate messages per second (simplified)
    this.stats.messagesPerSecond = this.stats.totalMessages / (this.stats.uptime / 1000);

    // Update subscriptions by topic
    this.stats.subscriptionsByTopic = {};
    for (const [topic, subscribers] of this.subscriptions.entries()) {
      this.stats.subscriptionsByTopic[topic] = subscribers.size;
    }
  }

  /**
   * Get WebSocket statistics
   */
  getStats(): WebSocketStats {
    this.updateStatistics();
    return { ...this.stats };
  }

  /**
   * Get connected clients
   */
  getClients(): WebSocketClient[] {
    return Array.from(this.clients.values());
  }

  /**
   * Disconnect all clients
   */
  disconnectAll(): void {
    for (const client of this.clients.values()) {
      client.socket.disconnect();
    }
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    this.stopTimers();
    this.disconnectAll();
    this.io.close();
    
    this.logger.info('Dashboard WebSocket server shutdown');
  }

  /**
   * Emit event (for internal use)
   */
  private emit(event: string, data: any): void {
    // This would integrate with EventEmitter if needed
    this.logger.debug('WebSocket event emitted', { event, data });
  }
}

export default DashboardWebSocket;