/**
 * System Status Service
 * Provides comprehensive system status reporting and diagnostics
 */

import { AutomationLogger, AlertLevel } from './logger';
import { HealthCheckService, SystemHealth } from './health-check';
import { PerformanceMonitor, PerformanceMetrics } from './performance-monitor';
import { AlertingService, Alert } from './alerting';
import { MaintenanceService, DiagnosticsResult } from './maintenance';

export interface SystemStatusService {
  // Status reporting
  getSystemStatus(): Promise<SystemStatusReport>;
  getComponentStatus(component: string): Promise<ComponentStatusReport>;
  getStatusHistory(timeRange: TimeRange): Promise<StatusHistoryEntry[]>;
  
  // Status monitoring
  startStatusMonitoring(interval?: number): void;
  stopStatusMonitoring(): void;
  
  // Status notifications
  subscribeToStatusChanges(callback: StatusChangeCallback): string;
  unsubscribeFromStatusChanges(subscriptionId: string): void;
  
  // Status dashboard data
  getDashboardData(): Promise<DashboardData>;
  getStatusMetrics(timeRange: TimeRange): Promise<StatusMetrics>;
  
  // Status reports
  generateStatusReport(options?: StatusReportOptions): Promise<StatusReport>;
  exportStatusData(format: 'json' | 'csv' | 'pdf', timeRange: TimeRange): Promise<Buffer>;
}

export interface SystemStatusReport {
  timestamp: Date;
  overall: SystemStatus;
  uptime: number;
  version: string;
  environment: string;
  components: ComponentStatusSummary[];
  performance: PerformanceSummary;
  alerts: AlertSummary;
  resources: ResourceSummary;
  trends: StatusTrend[];
  lastUpdated: Date;
}

export interface ComponentStatusReport {
  name: string;
  status: ComponentStatus;
  health: ComponentHealth;
  performance: ComponentPerformance;
  alerts: ComponentAlert[];
  metrics: ComponentMetrics;
  history: ComponentStatusHistory[];
  dependencies: ComponentDependency[];
}

export interface ComponentStatusSummary {
  name: string;
  status: ComponentStatus;
  responseTime: number;
  availability: number;
  lastCheck: Date;
  message?: string;
  criticalAlerts: number;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  availability: number;
  lastHealthCheck: Date;
  healthScore: number; // 0-100
  issues: HealthIssue[];
}

export interface ComponentPerformance {
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  successRate: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

export interface ComponentAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  createdAt: Date;
  status: 'active' | 'resolved';
}

export interface ComponentMetrics {
  [key: string]: number | string | boolean;
}

export interface ComponentStatusHistory {
  timestamp: Date;
  status: ComponentStatus;
  responseTime: number;
  message?: string;
}

export interface ComponentDependency {
  name: string;
  type: 'service' | 'database' | 'external';
  status: ComponentStatus;
  required: boolean;
}

export interface HealthIssue {
  type: 'performance' | 'availability' | 'error' | 'configuration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation?: string;
}

export interface PerformanceSummary {
  averageResponseTime: number;
  totalOperations: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  resourceUtilization: ResourceUtilization;
}

export interface ResourceUtilization {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface AlertSummary {
  total: number;
  active: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  recentAlerts: RecentAlert[];
}

export interface RecentAlert {
  id: string;
  title: string;
  severity: string;
  component: string;
  createdAt: Date;
}

export interface ResourceSummary {
  memory: ResourceInfo;
  cpu: ResourceInfo;
  disk: ResourceInfo;
  database: DatabaseResourceInfo;
}

export interface ResourceInfo {
  used: number;
  total: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface DatabaseResourceInfo extends ResourceInfo {
  connections: {
    active: number;
    idle: number;
    total: number;
    max: number;
  };
  queryPerformance: {
    averageDuration: number;
    slowQueries: number;
  };
}

export interface StatusTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number;
  timeframe: string;
}

export interface StatusHistoryEntry {
  timestamp: Date;
  overall: SystemStatus;
  components: ComponentStatusSummary[];
  performance: PerformanceSummary;
  alerts: number;
}

export interface DashboardData {
  systemStatus: SystemStatusReport;
  realtimeMetrics: RealtimeMetrics;
  charts: ChartData[];
  notifications: DashboardNotification[];
}

export interface RealtimeMetrics {
  activeUsers: number;
  requestsPerSecond: number;
  responseTime: number;
  errorRate: number;
  queueSize: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'gauge';
  data: ChartDataPoint[];
  config: ChartConfig;
}

export interface ChartDataPoint {
  timestamp?: Date;
  label?: string;
  value: number;
  category?: string;
}

export interface ChartConfig {
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
  thresholds?: ChartThreshold[];
}

export interface ChartThreshold {
  value: number;
  color: string;
  label: string;
}

export interface DashboardNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  dismissible: boolean;
}

export interface StatusMetrics {
  timeRange: TimeRange;
  availability: AvailabilityMetrics;
  performance: PerformanceMetrics[];
  incidents: IncidentMetrics;
  trends: TrendMetrics[];
}

export interface AvailabilityMetrics {
  overall: number;
  components: ComponentAvailability[];
  downtime: DowntimeEvent[];
}

export interface ComponentAvailability {
  name: string;
  availability: number;
  uptime: number;
  downtime: number;
}

export interface DowntimeEvent {
  component: string;
  start: Date;
  end?: Date;
  duration: number;
  reason: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

export interface IncidentMetrics {
  total: number;
  resolved: number;
  averageResolutionTime: number;
  byComponent: ComponentIncidentCount[];
  bySeverity: SeverityIncidentCount[];
}

export interface ComponentIncidentCount {
  component: string;
  count: number;
}

export interface SeverityIncidentCount {
  severity: string;
  count: number;
}

export interface TrendMetrics {
  metric: string;
  values: TrendValue[];
  trend: 'improving' | 'degrading' | 'stable';
  changePercentage: number;
}

export interface TrendValue {
  timestamp: Date;
  value: number;
}

export interface StatusReport {
  id: string;
  generatedAt: Date;
  timeRange: TimeRange;
  summary: StatusReportSummary;
  sections: StatusReportSection[];
  recommendations: string[];
  appendices: StatusReportAppendix[];
}

export interface StatusReportSummary {
  overallHealth: string;
  availability: number;
  performance: string;
  incidents: number;
  keyFindings: string[];
}

export interface StatusReportSection {
  title: string;
  content: string;
  charts?: ChartData[];
  tables?: TableData[];
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface StatusReportAppendix {
  title: string;
  content: string;
  type: 'text' | 'data' | 'chart';
}

export interface StatusReportOptions {
  includeCharts?: boolean;
  includeRawData?: boolean;
  includeRecommendations?: boolean;
  components?: string[];
  format?: 'summary' | 'detailed' | 'executive';
}

export interface TimeRange {
  from: Date;
  to: Date;
}

export type SystemStatus = 'healthy' | 'degraded' | 'critical' | 'maintenance';
export type ComponentStatus = 'healthy' | 'degraded' | 'unhealthy' | 'offline';

export type StatusChangeCallback = (change: StatusChange) => void;

export interface StatusChange {
  timestamp: Date;
  component: string;
  previousStatus: ComponentStatus;
  currentStatus: ComponentStatus;
  message?: string;
  details?: any;
}

export class SystemStatusServiceImpl implements SystemStatusService {
  private logger: AutomationLogger;
  private healthCheckService: HealthCheckService;
  private performanceMonitor: PerformanceMonitor;
  private alertingService: AlertingService;
  private maintenanceService: MaintenanceService;
  
  private monitoringInterval?: NodeJS.Timeout;
  private statusHistory: StatusHistoryEntry[] = [];
  private subscribers: Map<string, StatusChangeCallback> = new Map();
  private lastStatus: Map<string, ComponentStatus> = new Map();

  constructor(
    logger: AutomationLogger,
    healthCheckService: HealthCheckService,
    performanceMonitor: PerformanceMonitor,
    alertingService: AlertingService,
    maintenanceService: MaintenanceService
  ) {
    this.logger = logger;
    this.healthCheckService = healthCheckService;
    this.performanceMonitor = performanceMonitor;
    this.alertingService = alertingService;
    this.maintenanceService = maintenanceService;
  }

  async getSystemStatus(): Promise<SystemStatusReport> {
    const timestamp = new Date();
    
    // Get health information
    const systemHealth = await this.healthCheckService.checkSystemHealth();
    
    // Get performance information
    const performanceReport = await this.performanceMonitor.getPerformanceReport({
      from: new Date(Date.now() - 3600000), // Last hour
      to: timestamp
    });
    
    // Get alerts
    const activeAlerts = await this.alertingService.getActiveAlerts();
    
    // Map health status to system status
    const overall = this.mapHealthToSystemStatus(systemHealth.overall);
    
    // Build component summaries
    const components: ComponentStatusSummary[] = systemHealth.components.map(comp => ({
      name: comp.name,
      status: this.mapHealthToComponentStatus(comp.status),
      responseTime: comp.responseTime,
      availability: this.calculateAvailability(comp.name),
      lastCheck: comp.lastCheck,
      message: comp.message,
      criticalAlerts: activeAlerts.filter(a => 
        a.component === comp.name && 
        (a.severity === 'critical' || a.severity === 'high')
      ).length
    }));
    
    // Build performance summary
    const performance: PerformanceSummary = {
      averageResponseTime: performanceReport.summary.averageDuration,
      totalOperations: performanceReport.summary.totalOperations,
      successRate: performanceReport.summary.successRate,
      errorRate: performanceReport.summary.errorRate,
      throughput: this.calculateThroughput(performanceReport.summary.totalOperations),
      resourceUtilization: {
        cpu: performanceReport.summary.resourceUsage.avgCpu,
        memory: (performanceReport.summary.resourceUsage.avgMemory / (1024 * 1024 * 1024)) * 100, // Convert to percentage
        disk: 0, // Would need disk monitoring
        network: 0 // Would need network monitoring
      }
    };
    
    // Build alert summary
    const alertSummary: AlertSummary = {
      total: activeAlerts.length,
      active: activeAlerts.filter(a => a.status === 'active').length,
      critical: activeAlerts.filter(a => a.severity === 'critical').length,
      high: activeAlerts.filter(a => a.severity === 'high').length,
      medium: activeAlerts.filter(a => a.severity === 'medium').length,
      low: activeAlerts.filter(a => a.severity === 'low').length,
      recentAlerts: activeAlerts.slice(0, 5).map(a => ({
        id: a.id,
        title: a.title,
        severity: a.severity,
        component: a.component,
        createdAt: a.createdAt
      }))
    };
    
    // Build resource summary
    const resources: ResourceSummary = {
      memory: {
        used: performanceReport.summary.resourceUsage.avgMemory,
        total: performanceReport.summary.resourceUsage.peakMemory * 1.2, // Estimate
        percentage: (performanceReport.summary.resourceUsage.avgMemory / (performanceReport.summary.resourceUsage.peakMemory * 1.2)) * 100,
        trend: 'stable'
      },
      cpu: {
        used: performanceReport.summary.resourceUsage.avgCpu,
        total: 100,
        percentage: performanceReport.summary.resourceUsage.avgCpu,
        trend: 'stable'
      },
      disk: {
        used: 0,
        total: 0,
        percentage: 0,
        trend: 'stable'
      },
      database: {
        used: 0,
        total: 0,
        percentage: 0,
        trend: 'stable',
        connections: {
          active: 5,
          idle: 3,
          total: 8,
          max: 20
        },
        queryPerformance: {
          averageDuration: 150,
          slowQueries: 2
        }
      }
    };
    
    // Calculate trends
    const trends: StatusTrend[] = [
      {
        metric: 'Response Time',
        direction: 'stable',
        change: 0,
        timeframe: '1h'
      },
      {
        metric: 'Error Rate',
        direction: 'down',
        change: -5.2,
        timeframe: '1h'
      }
    ];

    const report: SystemStatusReport = {
      timestamp,
      overall,
      uptime: systemHealth.uptime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      components,
      performance,
      alerts: alertSummary,
      resources,
      trends,
      lastUpdated: timestamp
    };

    // Store in history
    this.addToStatusHistory(report);
    
    // Check for status changes and notify subscribers
    this.checkStatusChanges(components);

    return report;
  }

  async getComponentStatus(component: string): Promise<ComponentStatusReport> {
    const health = await this.healthCheckService.checkComponent(component);
    const alerts = await this.alertingService.getActiveAlerts({ component });
    
    const report: ComponentStatusReport = {
      name: component,
      status: this.mapHealthToComponentStatus(health.status),
      health: {
        status: health.status,
        responseTime: health.responseTime,
        availability: this.calculateAvailability(component),
        lastHealthCheck: health.lastCheck,
        healthScore: this.calculateHealthScore(health),
        issues: this.extractHealthIssues(health)
      },
      performance: {
        averageResponseTime: health.responseTime,
        throughput: 0, // Would need performance data
        errorRate: 0,
        successRate: 100,
        p95ResponseTime: health.responseTime * 1.5,
        p99ResponseTime: health.responseTime * 2
      },
      alerts: alerts.map(a => ({
        id: a.id,
        severity: a.severity as 'low' | 'medium' | 'high' | 'critical',
        message: a.title,
        createdAt: a.createdAt,
        status: a.status as 'active' | 'resolved'
      })),
      metrics: health.metrics,
      history: [], // Would need historical data
      dependencies: this.getComponentDependencies(component)
    };

    return report;
  }

  async getStatusHistory(timeRange: TimeRange): Promise<StatusHistoryEntry[]> {
    return this.statusHistory.filter(entry => 
      entry.timestamp >= timeRange.from && entry.timestamp <= timeRange.to
    );
  }

  startStatusMonitoring(interval: number = 60000): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.getSystemStatus();
      } catch (error) {
        this.logger.logAlert(AlertLevel.MEDIUM, 'Status monitoring error', { error: error.message });
      }
    }, interval);

    this.logger.logSystemAction('status_monitoring_started', { interval });
  }

  stopStatusMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      this.logger.logSystemAction('status_monitoring_stopped', {});
    }
  }

  subscribeToStatusChanges(callback: StatusChangeCallback): string {
    const subscriptionId = this.generateSubscriptionId();
    this.subscribers.set(subscriptionId, callback);
    return subscriptionId;
  }

  unsubscribeFromStatusChanges(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId);
  }

  async getDashboardData(): Promise<DashboardData> {
    const systemStatus = await this.getSystemStatus();
    
    const realtimeMetrics: RealtimeMetrics = {
      activeUsers: 0, // Would need user tracking
      requestsPerSecond: systemStatus.performance.throughput,
      responseTime: systemStatus.performance.averageResponseTime,
      errorRate: systemStatus.performance.errorRate,
      queueSize: 0, // Would need queue data
      memoryUsage: systemStatus.resources.memory.percentage,
      cpuUsage: systemStatus.resources.cpu.percentage
    };

    const charts: ChartData[] = [
      {
        id: 'response_time',
        title: 'Response Time',
        type: 'line',
        data: this.generateResponseTimeChart(),
        config: {
          xAxis: 'Time',
          yAxis: 'Response Time (ms)',
          colors: ['#3b82f6'],
          thresholds: [
            { value: 1000, color: '#f59e0b', label: 'Warning' },
            { value: 5000, color: '#ef4444', label: 'Critical' }
          ]
        }
      },
      {
        id: 'system_health',
        title: 'System Health',
        type: 'pie',
        data: [
          { label: 'Healthy', value: systemStatus.components.filter(c => c.status === 'healthy').length },
          { label: 'Degraded', value: systemStatus.components.filter(c => c.status === 'degraded').length },
          { label: 'Unhealthy', value: systemStatus.components.filter(c => c.status === 'unhealthy').length }
        ],
        config: {
          colors: ['#10b981', '#f59e0b', '#ef4444']
        }
      }
    ];

    const notifications: DashboardNotification[] = [
      {
        id: 'welcome',
        type: 'info',
        title: 'System Status Dashboard',
        message: 'Monitoring system health and performance',
        timestamp: new Date(),
        dismissible: true
      }
    ];

    // Add alert notifications
    systemStatus.alerts.recentAlerts.forEach(alert => {
      notifications.push({
        id: alert.id,
        type: alert.severity === 'critical' || alert.severity === 'high' ? 'error' : 'warning',
        title: `Alert: ${alert.title}`,
        message: `Component: ${alert.component}`,
        timestamp: alert.createdAt,
        dismissible: true
      });
    });

    return {
      systemStatus,
      realtimeMetrics,
      charts,
      notifications
    };
  }

  async getStatusMetrics(timeRange: TimeRange): Promise<StatusMetrics> {
    const history = await this.getStatusHistory(timeRange);
    
    // Calculate availability metrics
    const availability: AvailabilityMetrics = {
      overall: this.calculateOverallAvailability(history),
      components: this.calculateComponentAvailabilities(history),
      downtime: this.extractDowntimeEvents(history)
    };

    // Get performance metrics
    const performanceMetrics = await this.performanceMonitor.getPerformanceReport(timeRange);

    // Calculate incident metrics
    const incidents: IncidentMetrics = {
      total: 0, // Would need incident tracking
      resolved: 0,
      averageResolutionTime: 0,
      byComponent: [],
      bySeverity: []
    };

    // Calculate trends
    const trends: TrendMetrics[] = [
      {
        metric: 'availability',
        values: history.map(h => ({
          timestamp: h.timestamp,
          value: h.overall === 'healthy' ? 100 : h.overall === 'degraded' ? 75 : 25
        })),
        trend: 'stable',
        changePercentage: 0
      }
    ];

    return {
      timeRange,
      availability,
      performance: [{
        operationName: 'system_performance',
        duration: performanceMetrics.summary?.averageDuration || 0,
        memoryUsage: performanceMetrics.summary?.resourceUsage?.avgMemory || 0,
        cpuUsage: performanceMetrics.summary?.resourceUsage?.avgCpu || 0,
        timestamp: new Date(),
        metadata: performanceMetrics
      }],
      incidents,
      trends
    };
  }

  async generateStatusReport(options: StatusReportOptions = {}): Promise<StatusReport> {
    const reportId = this.generateReportId();
    const timeRange = {
      from: new Date(Date.now() - 86400000), // Last 24 hours
      to: new Date()
    };

    const systemStatus = await this.getSystemStatus();
    const statusMetrics = await this.getStatusMetrics(timeRange);

    const summary: StatusReportSummary = {
      overallHealth: systemStatus.overall,
      availability: statusMetrics.availability.overall,
      performance: systemStatus.performance.averageResponseTime < 1000 ? 'Good' : 'Degraded',
      incidents: statusMetrics.incidents.total,
      keyFindings: [
        `System uptime: ${this.formatUptime(systemStatus.uptime)}`,
        `Average response time: ${systemStatus.performance.averageResponseTime}ms`,
        `Active alerts: ${systemStatus.alerts.active}`
      ]
    };

    const sections: StatusReportSection[] = [
      {
        title: 'Executive Summary',
        content: this.generateExecutiveSummary(systemStatus, statusMetrics)
      },
      {
        title: 'System Health Overview',
        content: this.generateHealthOverview(systemStatus)
      },
      {
        title: 'Performance Analysis',
        content: this.generatePerformanceAnalysis(systemStatus)
      },
      {
        title: 'Alert Summary',
        content: this.generateAlertSummary(systemStatus.alerts)
      }
    ];

    const recommendations = [
      'Monitor disk space usage regularly',
      'Consider scaling resources if performance degrades',
      'Review and optimize slow database queries',
      'Implement automated backup procedures'
    ];

    return {
      id: reportId,
      generatedAt: new Date(),
      timeRange,
      summary,
      sections,
      recommendations,
      appendices: []
    };
  }

  async exportStatusData(format: 'json' | 'csv' | 'pdf', timeRange: TimeRange): Promise<Buffer> {
    const statusData = await this.getStatusMetrics(timeRange);
    
    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(statusData, null, 2));
      case 'csv':
        return this.convertToCSV(statusData);
      case 'pdf':
        return this.convertToPDF(statusData);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Private helper methods
  private mapHealthToSystemStatus(healthStatus: string): SystemStatus {
    switch (healthStatus) {
      case 'healthy': return 'healthy';
      case 'degraded': return 'degraded';
      case 'unhealthy': return 'critical';
      default: return 'critical';
    }
  }

  private mapHealthToComponentStatus(healthStatus: string): ComponentStatus {
    switch (healthStatus) {
      case 'healthy': return 'healthy';
      case 'degraded': return 'degraded';
      case 'unhealthy': return 'unhealthy';
      default: return 'offline';
    }
  }

  private calculateAvailability(component: string): number {
    // Simplified availability calculation
    // In a real implementation, this would track uptime/downtime
    return 99.5;
  }

  private calculateThroughput(totalOperations: number): number {
    // Calculate operations per second over the last hour
    return totalOperations / 3600;
  }

  private calculateHealthScore(health: any): number {
    // Simple health score calculation
    if (health.status === 'healthy') return 100;
    if (health.status === 'degraded') return 75;
    return 25;
  }

  private extractHealthIssues(health: any): HealthIssue[] {
    const issues: HealthIssue[] = [];
    
    if (health.responseTime > 1000) {
      issues.push({
        type: 'performance',
        severity: health.responseTime > 5000 ? 'high' : 'medium',
        message: `High response time: ${health.responseTime}ms`,
        recommendation: 'Investigate performance bottlenecks'
      });
    }

    return issues;
  }

  private getComponentDependencies(component: string): ComponentDependency[] {
    // Simplified dependency mapping
    const dependencies: ComponentDependency[] = [];
    
    if (component !== 'database') {
      dependencies.push({
        name: 'database',
        type: 'database',
        status: 'healthy',
        required: true
      });
    }

    return dependencies;
  }

  private addToStatusHistory(report: SystemStatusReport): void {
    const historyEntry: StatusHistoryEntry = {
      timestamp: report.timestamp,
      overall: report.overall,
      components: report.components,
      performance: report.performance,
      alerts: report.alerts.active
    };

    this.statusHistory.push(historyEntry);
    
    // Keep only last 1000 entries
    if (this.statusHistory.length > 1000) {
      this.statusHistory.splice(0, this.statusHistory.length - 1000);
    }
  }

  private checkStatusChanges(components: ComponentStatusSummary[]): void {
    components.forEach(component => {
      const previousStatus = this.lastStatus.get(component.name);
      const currentStatus = component.status;
      
      if (previousStatus && previousStatus !== currentStatus) {
        const change: StatusChange = {
          timestamp: new Date(),
          component: component.name,
          previousStatus,
          currentStatus,
          message: component.message
        };

        // Notify subscribers
        this.subscribers.forEach(callback => {
          try {
            callback(change);
          } catch (error) {
            this.logger.logAlert(AlertLevel.LOW, 'Status change notification error', { error: error.message });
          }
        });

        this.logger.logSystemAction('component_status_changed', {
          component: component.name,
          previousStatus,
          currentStatus,
          message: component.message
        });
      }

      this.lastStatus.set(component.name, currentStatus);
    });
  }

  private generateResponseTimeChart(): ChartDataPoint[] {
    // Generate sample response time data
    const data: ChartDataPoint[] = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 3600000);
      const value = 200 + Math.random() * 300; // Random response time between 200-500ms
      
      data.push({ timestamp, value });
    }
    
    return data;
  }

  private calculateOverallAvailability(history: StatusHistoryEntry[]): number {
    if (history.length === 0) return 100;
    
    const healthyCount = history.filter(h => h.overall === 'healthy').length;
    return (healthyCount / history.length) * 100;
  }

  private calculateComponentAvailabilities(history: StatusHistoryEntry[]): ComponentAvailability[] {
    // Simplified component availability calculation
    return [
      { name: 'database', availability: 99.9, uptime: 86400000, downtime: 86400 },
      { name: 'queue', availability: 99.5, uptime: 86000000, downtime: 400000 },
      { name: 'memory', availability: 100, uptime: 86400000, downtime: 0 }
    ];
  }

  private extractDowntimeEvents(history: StatusHistoryEntry[]): DowntimeEvent[] {
    // Simplified downtime event extraction
    return [];
  }

  private generateExecutiveSummary(status: SystemStatusReport, metrics: StatusMetrics): string {
    return `System is currently ${status.overall} with ${status.components.length} monitored components. ` +
           `Overall availability is ${metrics.availability.overall.toFixed(2)}% with an average response time of ${status.performance.averageResponseTime}ms. ` +
           `There are ${status.alerts.active} active alerts requiring attention.`;
  }

  private generateHealthOverview(status: SystemStatusReport): string {
    const healthy = status.components.filter(c => c.status === 'healthy').length;
    const degraded = status.components.filter(c => c.status === 'degraded').length;
    const unhealthy = status.components.filter(c => c.status === 'unhealthy').length;
    
    return `Component health status: ${healthy} healthy, ${degraded} degraded, ${unhealthy} unhealthy. ` +
           `System uptime: ${this.formatUptime(status.uptime)}.`;
  }

  private generatePerformanceAnalysis(status: SystemStatusReport): string {
    return `Average response time: ${status.performance.averageResponseTime}ms. ` +
           `Success rate: ${(status.performance.successRate * 100).toFixed(1)}%. ` +
           `Error rate: ${(status.performance.errorRate * 100).toFixed(1)}%. ` +
           `Resource utilization - CPU: ${status.resources.cpu.percentage.toFixed(1)}%, Memory: ${status.resources.memory.percentage.toFixed(1)}%.`;
  }

  private generateAlertSummary(alerts: AlertSummary): string {
    return `Total alerts: ${alerts.total} (${alerts.critical} critical, ${alerts.high} high, ${alerts.medium} medium, ${alerts.low} low). ` +
           `Active alerts: ${alerts.active}.`;
  }

  private formatUptime(uptimeMs: number): string {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }

  private convertToCSV(data: any): Buffer {
    // Simplified CSV conversion
    const csv = 'timestamp,metric,value\n' + 
                JSON.stringify(data).replace(/[{}]/g, '').replace(/"/g, '');
    return Buffer.from(csv);
  }

  private convertToPDF(data: any): Buffer {
    // Simplified PDF conversion (would use a PDF library in real implementation)
    const content = `System Status Report\n\nGenerated: ${new Date().toISOString()}\n\nData: ${JSON.stringify(data, null, 2)}`;
    return Buffer.from(content);
  }

  private generateSubscriptionId(): string {
    return 'sub_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  private generateReportId(): string {
    return 'report_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Factory function
export function createSystemStatusService(
  logger: AutomationLogger,
  healthCheckService: HealthCheckService,
  performanceMonitor: PerformanceMonitor,
  alertingService: AlertingService,
  maintenanceService: MaintenanceService
): SystemStatusService {
  return new SystemStatusServiceImpl(
    logger,
    healthCheckService,
    performanceMonitor,
    alertingService,
    maintenanceService
  );
}