/**
 * Club Performance Monitor
 * 
 * Monitors and tracks performance metrics for club operations,
 * provides alerting for performance degradation, and benchmarking.
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  context: Record<string, any>;
  tags: string[];
}

interface PerformanceBenchmark {
  operation: string;
  baseline: number;
  current: number;
  threshold: number;
  status: 'good' | 'warning' | 'critical';
  trend: 'improving' | 'stable' | 'degrading';
}

interface AlertRule {
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq';
  threshold: number;
  duration: number; // ms
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
}

interface Alert {
  id: string;
  rule: AlertRule;
  value: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  message: string;
}

export class ClubPerformanceMonitor {
  private strapi: any;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [];
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.initializeDefaultAlertRules();
    this.initializeDefaultBenchmarks();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        name: 'Club Query Slow Response',
        metric: 'club_query_duration',
        condition: 'gt',
        threshold: 500, // ms
        duration: 60000, // 1 minute
        severity: 'warning',
        enabled: true
      },
      {
        name: 'Club Query Very Slow Response',
        metric: 'club_query_duration',
        condition: 'gt',
        threshold: 2000, // ms
        duration: 30000, // 30 seconds
        severity: 'critical',
        enabled: true
      },
      {
        name: 'Cache Hit Rate Low',
        metric: 'cache_hit_rate',
        condition: 'lt',
        threshold: 70, // %
        duration: 300000, // 5 minutes
        severity: 'warning',
        enabled: true
      },
      {
        name: 'Cache Hit Rate Critical',
        metric: 'cache_hit_rate',
        condition: 'lt',
        threshold: 50, // %
        duration: 120000, // 2 minutes
        severity: 'critical',
        enabled: true
      },
      {
        name: 'Database Connection Slow',
        metric: 'database_latency',
        condition: 'gt',
        threshold: 100, // ms
        duration: 180000, // 3 minutes
        severity: 'warning',
        enabled: true
      },
      {
        name: 'High Error Rate',
        metric: 'error_rate',
        condition: 'gt',
        threshold: 5, // %
        duration: 60000, // 1 minute
        severity: 'critical',
        enabled: true
      },
      {
        name: 'Memory Usage High',
        metric: 'memory_usage_percent',
        condition: 'gt',
        threshold: 85, // %
        duration: 300000, // 5 minutes
        severity: 'warning',
        enabled: true
      }
    ];
  }

  /**
   * Initialize default performance benchmarks
   */
  private initializeDefaultBenchmarks(): void {
    const defaultBenchmarks = [
      { operation: 'findClubsByLiga', baseline: 50, threshold: 100 },
      { operation: 'findViktoriaClubByTeam', baseline: 20, threshold: 50 },
      { operation: 'getClubWithLogo', baseline: 30, threshold: 75 },
      { operation: 'getClubStatistics', baseline: 100, threshold: 200 },
      { operation: 'validateClubInLiga', baseline: 25, threshold: 60 },
      { operation: 'createClubIfNotExists', baseline: 150, threshold: 300 }
    ];

    defaultBenchmarks.forEach(benchmark => {
      this.benchmarks.set(benchmark.operation, {
        operation: benchmark.operation,
        baseline: benchmark.baseline,
        current: benchmark.baseline,
        threshold: benchmark.threshold,
        status: 'good',
        trend: 'stable'
      });
    });
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, unit: string = 'ms', context: Record<string, any> = {}, tags: string[] = []): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      context,
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricHistory = this.metrics.get(name)!;
    metricHistory.push(metric);

    // Keep only last 1000 metrics per type
    if (metricHistory.length > 1000) {
      metricHistory.shift();
    }

    // Update benchmarks
    this.updateBenchmark(name, value);

    // Check alerts
    this.checkAlerts(metric);

    // Log to database if available
    this.logMetricToDatabase(metric);
  }

  /**
   * Update performance benchmark
   */
  private updateBenchmark(metricName: string, value: number): void {
    // Extract operation name from metric name
    const operation = metricName.replace('_duration', '').replace('club_', '');
    
    if (this.benchmarks.has(operation)) {
      const benchmark = this.benchmarks.get(operation)!;
      const previousCurrent = benchmark.current;
      
      // Calculate moving average (last 10 measurements)
      const recentMetrics = this.getRecentMetrics(metricName, 10);
      if (recentMetrics.length > 0) {
        benchmark.current = recentMetrics.reduce((sum, m) => sum + m.value, 0) / recentMetrics.length;
      }

      // Determine status
      if (benchmark.current <= benchmark.baseline) {
        benchmark.status = 'good';
      } else if (benchmark.current <= benchmark.threshold) {
        benchmark.status = 'warning';
      } else {
        benchmark.status = 'critical';
      }

      // Determine trend
      if (benchmark.current < previousCurrent * 0.95) {
        benchmark.trend = 'improving';
      } else if (benchmark.current > previousCurrent * 1.05) {
        benchmark.trend = 'degrading';
      } else {
        benchmark.trend = 'stable';
      }
    }
  }

  /**
   * Get recent metrics for a given name
   */
  private getRecentMetrics(name: string, count: number): PerformanceMetric[] {
    const metrics = this.metrics.get(name) || [];
    return metrics.slice(-count);
  }

  /**
   * Check alert rules against metric
   */
  private checkAlerts(metric: PerformanceMetric): void {
    const applicableRules = this.alertRules.filter(rule => 
      rule.enabled && rule.metric === metric.name
    );

    for (const rule of applicableRules) {
      const shouldAlert = this.evaluateAlertCondition(rule, metric.value);
      
      if (shouldAlert) {
        const existingAlert = this.alerts.find(alert => 
          alert.rule.name === rule.name && !alert.resolved
        );

        if (!existingAlert) {
          this.createAlert(rule, metric.value);
        }
      } else {
        // Check if we should resolve existing alert
        const existingAlert = this.alerts.find(alert => 
          alert.rule.name === rule.name && !alert.resolved
        );

        if (existingAlert) {
          this.resolveAlert(existingAlert.id);
        }
      }
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateAlertCondition(rule: AlertRule, value: number): boolean {
    switch (rule.condition) {
      case 'gt':
        return value > rule.threshold;
      case 'lt':
        return value < rule.threshold;
      case 'eq':
        return value === rule.threshold;
      default:
        return false;
    }
  }

  /**
   * Create new alert
   */
  private createAlert(rule: AlertRule, value: number): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rule,
      value,
      timestamp: new Date(),
      resolved: false,
      message: this.generateAlertMessage(rule, value)
    };

    this.alerts.push(alert);
    this.notifyAlert(alert);
    
    console.warn(`🚨 ALERT: ${alert.message}`);
  }

  /**
   * Resolve alert
   */
  private resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      
      console.log(`✅ RESOLVED: ${alert.message}`);
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: AlertRule, value: number): string {
    const condition = rule.condition === 'gt' ? 'above' : rule.condition === 'lt' ? 'below' : 'equal to';
    return `${rule.name}: ${rule.metric} is ${condition} threshold (${value} ${condition} ${rule.threshold})`;
  }

  /**
   * Notify alert (can be extended to send to external systems)
   */
  private notifyAlert(alert: Alert): void {
    // Log to database
    this.logAlertToDatabase(alert);

    // Could extend to send to:
    // - Slack/Discord webhooks
    // - Email notifications
    // - PagerDuty/OpsGenie
    // - Custom webhook endpoints
  }

  /**
   * Log metric to database
   */
  private async logMetricToDatabase(metric: PerformanceMetric): Promise<void> {
    try {
      if (this.strapi?.db) {
        await this.strapi.db.connection.raw(`
          SELECT log_performance_metric(?, ?, ?, ?::jsonb);
        `, [
          metric.name,
          metric.value,
          metric.unit,
          JSON.stringify({
            ...metric.context,
            tags: metric.tags
          })
        ]);
      }
    } catch (error) {
      // Silently fail to avoid performance impact
      console.warn('Failed to log metric to database:', error.message);
    }
  }

  /**
   * Log alert to database
   */
  private async logAlertToDatabase(alert: Alert): Promise<void> {
    try {
      if (this.strapi?.db) {
        await this.strapi.db.connection.raw(`
          INSERT INTO system_logs (level, message, context, created_at)
          VALUES (?, ?, ?::jsonb, NOW());
        `, [
          alert.rule.severity,
          alert.message,
          JSON.stringify({
            alert_id: alert.id,
            rule_name: alert.rule.name,
            metric: alert.rule.metric,
            value: alert.value,
            threshold: alert.rule.threshold
          })
        ]);
      }
    } catch (error) {
      console.warn('Failed to log alert to database:', error.message);
    }
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      console.warn('Performance monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    console.log(`🔍 Starting club performance monitoring (interval: ${intervalMs / 1000}s)`);

    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    this.isMonitoring = false;
    console.log('🛑 Club performance monitoring stopped');
  }

  /**
   * Collect system-level metrics
   */
  private async collectSystemMetrics(): Promise<void> {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      this.recordMetric('memory_usage_percent', memUsagePercent, '%', {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      }, ['system']);

      // Database latency
      const dbStart = Date.now();
      await this.strapi.db.connection.raw('SELECT 1');
      const dbLatency = Date.now() - dbStart;
      this.recordMetric('database_latency', dbLatency, 'ms', {}, ['database']);

      // Cache metrics (if available)
      try {
        const cacheService = this.strapi.service('api::club.club');
        const cacheMetrics = cacheService.getRedisCacheMetrics();
        
        if (cacheMetrics.hitRate !== undefined) {
          this.recordMetric('cache_hit_rate', cacheMetrics.hitRate, '%', {
            hits: cacheMetrics.hits,
            misses: cacheMetrics.misses,
            total: cacheMetrics.totalRequests
          }, ['cache']);
        }

        if (cacheMetrics.errors !== undefined && cacheMetrics.totalRequests > 0) {
          const errorRate = (cacheMetrics.errors / cacheMetrics.totalRequests) * 100;
          this.recordMetric('error_rate', errorRate, '%', {
            errors: cacheMetrics.errors,
            total: cacheMetrics.totalRequests
          }, ['cache', 'errors']);
        }
      } catch (error) {
        // Cache not available, skip cache metrics
      }

      // Club operation metrics
      await this.collectClubOperationMetrics();

    } catch (error) {
      console.error('Error collecting system metrics:', error.message);
    }
  }

  /**
   * Collect club operation performance metrics
   */
  private async collectClubOperationMetrics(): Promise<void> {
    try {
      const cacheService = this.strapi.service('api::club.club');

      // Test findClubsByLiga performance
      const ligen = await this.strapi.entityService.findMany('api::liga.liga', {
        filters: { aktiv: true },
        limit: 1
      });

      if (ligen.length > 0) {
        const start = Date.now();
        await cacheService.findClubsByLiga(ligen[0].id);
        const duration = Date.now() - start;
        this.recordMetric('club_findClubsByLiga_duration', duration, 'ms', {
          liga_id: ligen[0].id
        }, ['club', 'query']);
      }

      // Test findViktoriaClubByTeam performance
      const viktoriaStart = Date.now();
      await cacheService.findViktoriaClubByTeam('team_1');
      const viktoriaDuration = Date.now() - viktoriaStart;
      this.recordMetric('club_findViktoriaClubByTeam_duration', viktoriaDuration, 'ms', {
        team_mapping: 'team_1'
      }, ['club', 'viktoria']);

      // Test getClubWithLogo performance
      const clubs = await this.strapi.entityService.findMany('api::club.club', {
        filters: { aktiv: true },
        limit: 1
      });

      if (clubs.length > 0) {
        const logoStart = Date.now();
        await cacheService.getClubWithLogo(clubs[0].id);
        const logoDuration = Date.now() - logoStart;
        this.recordMetric('club_getClubWithLogo_duration', logoDuration, 'ms', {
          club_id: clubs[0].id
        }, ['club', 'logo']);
      }

    } catch (error) {
      console.error('Error collecting club operation metrics:', error.message);
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    metrics: Record<string, {
      current: number;
      average: number;
      min: number;
      max: number;
      count: number;
    }>;
    benchmarks: Record<string, PerformanceBenchmark>;
    alerts: {
      active: number;
      resolved: number;
      total: number;
      byType: Record<string, number>;
    };
  } {
    const metricsSummary: Record<string, any> = {};

    // Calculate metric summaries
    for (const [name, metrics] of this.metrics.entries()) {
      if (metrics.length > 0) {
        const values = metrics.map(m => m.value);
        metricsSummary[name] = {
          current: values[values.length - 1],
          average: values.reduce((sum, v) => sum + v, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    }

    // Calculate alert summary
    const activeAlerts = this.alerts.filter(a => !a.resolved);
    const resolvedAlerts = this.alerts.filter(a => a.resolved);
    const alertsByType: Record<string, number> = {};

    this.alerts.forEach(alert => {
      const type = alert.rule.severity;
      alertsByType[type] = (alertsByType[type] || 0) + 1;
    });

    return {
      metrics: metricsSummary,
      benchmarks: Object.fromEntries(this.benchmarks),
      alerts: {
        active: activeAlerts.length,
        resolved: resolvedAlerts.length,
        total: this.alerts.length,
        byType: alertsByType
      }
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): Alert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(metricName: string, hours: number = 24): {
    trend: 'improving' | 'stable' | 'degrading';
    change: number;
    data: Array<{ timestamp: Date; value: number }>;
  } {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const metrics = (this.metrics.get(metricName) || [])
      .filter(m => m.timestamp >= cutoff)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (metrics.length < 2) {
      return {
        trend: 'stable',
        change: 0,
        data: metrics.map(m => ({ timestamp: m.timestamp, value: m.value }))
      };
    }

    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));

    const firstAvg = firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;

    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (change < -5) trend = 'improving';
    else if (change > 5) trend = 'degrading';

    return {
      trend,
      change,
      data: metrics.map(m => ({ timestamp: m.timestamp, value: m.value }))
    };
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'enabled'>): void {
    this.alertRules.push({ ...rule, enabled: true });
    console.log(`📋 Added alert rule: ${rule.name}`);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleName: string): boolean {
    const index = this.alertRules.findIndex(rule => rule.name === ruleName);
    if (index !== -1) {
      this.alertRules.splice(index, 1);
      console.log(`🗑️  Removed alert rule: ${ruleName}`);
      return true;
    }
    return false;
  }

  /**
   * Enable/disable alert rule
   */
  toggleAlertRule(ruleName: string, enabled: boolean): boolean {
    const rule = this.alertRules.find(r => r.name === ruleName);
    if (rule) {
      rule.enabled = enabled;
      console.log(`${enabled ? '✅' : '❌'} Alert rule ${ruleName}: ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    const allMetrics: PerformanceMetric[] = [];
    
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }

    allMetrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (format === 'csv') {
      const headers = ['timestamp', 'name', 'value', 'unit', 'context', 'tags'];
      const rows = allMetrics.map(m => [
        m.timestamp.toISOString(),
        m.name,
        m.value.toString(),
        m.unit,
        JSON.stringify(m.context),
        m.tags.join(';')
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    return JSON.stringify(allMetrics, null, 2);
  }

  /**
   * Clear old metrics and alerts
   */
  cleanup(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    // Clean metrics
    let totalRemoved = 0;
    for (const [name, metrics] of this.metrics.entries()) {
      const originalLength = metrics.length;
      const filtered = metrics.filter(m => m.timestamp >= cutoff);
      this.metrics.set(name, filtered);
      totalRemoved += originalLength - filtered.length;
    }

    // Clean resolved alerts
    const originalAlertCount = this.alerts.length;
    this.alerts = this.alerts.filter(alert => 
      !alert.resolved || (alert.resolvedAt && alert.resolvedAt >= cutoff)
    );
    const alertsRemoved = originalAlertCount - this.alerts.length;

    console.log(`🧹 Cleanup completed: ${totalRemoved} metrics and ${alertsRemoved} alerts removed`);
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 100;

    // Check active critical alerts
    const criticalAlerts = this.alerts.filter(a => !a.resolved && a.rule.severity === 'critical');
    if (criticalAlerts.length > 0) {
      issues.push(`${criticalAlerts.length} critical alerts active`);
      score -= criticalAlerts.length * 30;
    }

    // Check active warning alerts
    const warningAlerts = this.alerts.filter(a => !a.resolved && a.rule.severity === 'warning');
    if (warningAlerts.length > 0) {
      issues.push(`${warningAlerts.length} warning alerts active`);
      score -= warningAlerts.length * 10;
    }

    // Check benchmark status
    const criticalBenchmarks = Array.from(this.benchmarks.values()).filter(b => b.status === 'critical');
    if (criticalBenchmarks.length > 0) {
      issues.push(`${criticalBenchmarks.length} operations performing critically`);
      score -= criticalBenchmarks.length * 20;
    }

    // Check degrading trends
    const degradingBenchmarks = Array.from(this.benchmarks.values()).filter(b => b.trend === 'degrading');
    if (degradingBenchmarks.length > 0) {
      issues.push(`${degradingBenchmarks.length} operations showing degrading performance`);
      score -= degradingBenchmarks.length * 5;
    }

    score = Math.max(0, score);

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (score < 50) status = 'critical';
    else if (score < 80) status = 'degraded';

    return { status, issues, score };
  }

  /**
   * Destroy monitor and cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.metrics.clear();
    this.benchmarks.clear();
    this.alerts = [];
    this.alertRules = [];
    console.log('🗑️  Performance monitor destroyed');
  }
}