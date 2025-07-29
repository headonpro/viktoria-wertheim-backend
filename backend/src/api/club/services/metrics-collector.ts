/**
 * Club Metrics Collector
 * 
 * Collects and aggregates club-specific metrics for monitoring and alerting.
 * Provides real-time metrics collection with configurable intervals.
 */

interface MetricPoint {
  timestamp: Date;
  value: number;
  tags: Record<string, string>;
}

interface ClubMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'timer';
  description: string;
  unit: string;
  points: MetricPoint[];
}

interface ClubOperationMetrics {
  clubCreationRate: ClubMetric;
  clubUpdateRate: ClubMetric;
  clubDeletionRate: ClubMetric;
  clubValidationErrors: ClubMetric;
  clubCacheHitRate: ClubMetric;
  clubCacheMissRate: ClubMetric;
  clubQueryResponseTime: ClubMetric;
  clubGameProcessingTime: ClubMetric;
  clubTableCalculationDuration: ClubMetric;
  clubMigrationProgress: ClubMetric;
}

interface AlertThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  severity: 'info' | 'warning' | 'critical';
  description: string;
}

export class ClubMetricsCollector {
  private strapi: any;
  private metrics: Map<string, ClubMetric> = new Map();
  private collectors: Map<string, NodeJS.Timeout> = new Map();
  private alertThresholds: AlertThreshold[] = [];
  private isCollecting = false;

  constructor(strapi: any) {
    this.strapi = strapi;
    this.initializeMetrics();
    this.setupAlertThresholds();
  }

  /**
   * Initialize all club-specific metrics
   */
  private initializeMetrics(): void {
    const metricsConfig: Array<{
      name: string;
      type: 'counter' | 'gauge' | 'histogram' | 'timer';
      description: string;
      unit: string;
    }> = [
      {
        name: 'club_creation_rate',
        type: 'counter',
        description: 'Rate of club creation operations',
        unit: 'operations/minute'
      },
      {
        name: 'club_update_rate',
        type: 'counter',
        description: 'Rate of club update operations',
        unit: 'operations/minute'
      },
      {
        name: 'club_deletion_rate',
        type: 'counter',
        description: 'Rate of club deletion operations',
        unit: 'operations/minute'
      },
      {
        name: 'club_validation_errors',
        type: 'counter',
        description: 'Number of club validation errors',
        unit: 'errors'
      },
      {
        name: 'club_cache_hit_rate',
        type: 'gauge',
        description: 'Club cache hit rate percentage',
        unit: 'percentage'
      },
      {
        name: 'club_cache_miss_rate',
        type: 'gauge',
        description: 'Club cache miss rate percentage',
        unit: 'percentage'
      },
      {
        name: 'club_query_response_time',
        type: 'histogram',
        description: 'Club query response time distribution',
        unit: 'milliseconds'
      },
      {
        name: 'club_game_processing_time',
        type: 'histogram',
        description: 'Club-based game processing time',
        unit: 'milliseconds'
      },
      {
        name: 'club_table_calculation_duration',
        type: 'histogram',
        description: 'Club table calculation duration',
        unit: 'milliseconds'
      },
      {
        name: 'club_migration_progress',
        type: 'gauge',
        description: 'Club migration progress percentage',
        unit: 'percentage'
      },
      {
        name: 'active_clubs_count',
        type: 'gauge',
        description: 'Number of active clubs',
        unit: 'count'
      },
      {
        name: 'viktoria_clubs_count',
        type: 'gauge',
        description: 'Number of Viktoria clubs',
        unit: 'count'
      },
      {
        name: 'opponent_clubs_count',
        type: 'gauge',
        description: 'Number of opponent clubs',
        unit: 'count'
      },
      {
        name: 'club_based_games_count',
        type: 'gauge',
        description: 'Number of club-based games',
        unit: 'count'
      },
      {
        name: 'club_table_entries_count',
        type: 'gauge',
        description: 'Number of club-based table entries',
        unit: 'count'
      }
    ];

    metricsConfig.forEach(config => {
      this.metrics.set(config.name, {
        name: config.name,
        type: config.type,
        description: config.description,
        unit: config.unit,
        points: []
      });
    });
  }

  /**
   * Setup alert thresholds for club metrics
   */
  private setupAlertThresholds(): void {
    this.alertThresholds = [
      {
        metric: 'club_validation_errors',
        operator: 'gt',
        value: 10,
        severity: 'warning',
        description: 'High number of club validation errors'
      },
      {
        metric: 'club_validation_errors',
        operator: 'gt',
        value: 50,
        severity: 'critical',
        description: 'Critical number of club validation errors'
      },
      {
        metric: 'club_cache_hit_rate',
        operator: 'lt',
        value: 60,
        severity: 'warning',
        description: 'Low club cache hit rate'
      },
      {
        metric: 'club_cache_hit_rate',
        operator: 'lt',
        value: 40,
        severity: 'critical',
        description: 'Critical club cache hit rate'
      },
      {
        metric: 'club_query_response_time',
        operator: 'gt',
        value: 1000,
        severity: 'warning',
        description: 'Slow club query response time'
      },
      {
        metric: 'club_query_response_time',
        operator: 'gt',
        value: 5000,
        severity: 'critical',
        description: 'Critical club query response time'
      },
      {
        metric: 'club_table_calculation_duration',
        operator: 'gt',
        value: 10000,
        severity: 'warning',
        description: 'Slow club table calculation'
      },
      {
        metric: 'club_table_calculation_duration',
        operator: 'gt',
        value: 30000,
        severity: 'critical',
        description: 'Critical club table calculation duration'
      },
      {
        metric: 'active_clubs_count',
        operator: 'lt',
        value: 1,
        severity: 'critical',
        description: 'No active clubs in system'
      }
    ];
  }

  /**
   * Start collecting metrics
   */
  startCollection(): void {
    if (this.isCollecting) {
      this.strapi.log.warn('Metrics collection already started');
      return;
    }

    this.isCollecting = true;
    this.strapi.log.info('Starting club metrics collection');

    // Collect basic metrics every 30 seconds
    this.collectors.set('basic', setInterval(() => {
      this.collectBasicMetrics();
    }, 30000));

    // Collect performance metrics every 60 seconds
    this.collectors.set('performance', setInterval(() => {
      this.collectPerformanceMetrics();
    }, 60000));

    // Collect operational metrics every 5 minutes
    this.collectors.set('operational', setInterval(() => {
      this.collectOperationalMetrics();
    }, 300000));

    // Check alerts every 2 minutes
    this.collectors.set('alerts', setInterval(() => {
      this.checkAlerts();
    }, 120000));

    // Initial collection
    this.collectBasicMetrics();
    this.collectPerformanceMetrics();
    this.collectOperationalMetrics();
  }

  /**
   * Stop collecting metrics
   */
  stopCollection(): void {
    if (!this.isCollecting) {
      return;
    }

    this.isCollecting = false;
    this.strapi.log.info('Stopping club metrics collection');

    this.collectors.forEach((interval, name) => {
      clearInterval(interval);
      this.strapi.log.debug(`Stopped ${name} metrics collector`);
    });
    this.collectors.clear();
  }

  /**
   * Record a metric point
   */
  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric = this.metrics.get(name);
    if (!metric) {
      this.strapi.log.warn(`Unknown metric: ${name}`);
      return;
    }

    const point: MetricPoint = {
      timestamp: new Date(),
      value,
      tags
    };

    metric.points.push(point);

    // Keep only last 1000 points per metric
    if (metric.points.length > 1000) {
      metric.points = metric.points.slice(-1000);
    }

    this.strapi.log.debug(`Recorded metric ${name}: ${value}`, tags);
  }

  /**
   * Collect basic club metrics
   */
  private async collectBasicMetrics(): Promise<void> {
    try {
      // Active clubs count
      const activeClubs = await this.strapi.entityService.count('api::club.club', {
        filters: { aktiv: true }
      });
      this.recordMetric('active_clubs_count', activeClubs);

      // Viktoria clubs count
      const viktoriaClubs = await this.strapi.entityService.count('api::club.club', {
        filters: { club_typ: 'viktoria_verein' }
      });
      this.recordMetric('viktoria_clubs_count', viktoriaClubs);

      // Opponent clubs count
      const opponentClubs = await this.strapi.entityService.count('api::club.club', {
        filters: { club_typ: 'gegner_verein' }
      });
      this.recordMetric('opponent_clubs_count', opponentClubs);

      // Club-based games count
      const clubGames = await this.strapi.entityService.count('api::spiel.spiel', {
        filters: {
          heim_club: { $notNull: true },
          gast_club: { $notNull: true }
        }
      });
      this.recordMetric('club_based_games_count', clubGames);

      // Club-based table entries count
      const clubTableEntries = await this.strapi.entityService.count('api::tabellen-eintrag.tabellen-eintrag', {
        filters: {
          club: { $notNull: true }
        }
      });
      this.recordMetric('club_table_entries_count', clubTableEntries);

    } catch (error) {
      this.strapi.log.error('Failed to collect basic metrics:', error);
    }
  }

  /**
   * Collect performance metrics
   */
  private async collectPerformanceMetrics(): Promise<void> {
    try {
      // Get cache metrics from cache manager
      const cacheManager = this.strapi.service('api::club.cache-manager');
      if (cacheManager && typeof cacheManager.getMetrics === 'function') {
        const cacheMetrics = await cacheManager.getMetrics();
        
        if (cacheMetrics.hitRate !== undefined) {
          this.recordMetric('club_cache_hit_rate', cacheMetrics.hitRate * 100);
        }
        
        if (cacheMetrics.missRate !== undefined) {
          this.recordMetric('club_cache_miss_rate', cacheMetrics.missRate * 100);
        }
      }

      // Get performance monitor metrics
      const performanceMonitor = this.strapi.service('api::club.performance-monitor');
      if (performanceMonitor && typeof performanceMonitor.getMetrics === 'function') {
        const perfMetrics = await performanceMonitor.getMetrics();
        
        if (perfMetrics.averageResponseTime !== undefined) {
          this.recordMetric('club_query_response_time', perfMetrics.averageResponseTime);
        }
        
        if (perfMetrics.tableCalculationTime !== undefined) {
          this.recordMetric('club_table_calculation_duration', perfMetrics.tableCalculationTime);
        }
      }

    } catch (error) {
      this.strapi.log.error('Failed to collect performance metrics:', error);
    }
  }

  /**
   * Collect operational metrics
   */
  private async collectOperationalMetrics(): Promise<void> {
    try {
      // Get recent activity metrics
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const recentClubCreations = await this.strapi.entityService.count('api::club.club', {
        filters: { createdAt: { $gte: oneHourAgo } }
      });
      this.recordMetric('club_creation_rate', recentClubCreations);

      const recentClubUpdates = await this.strapi.entityService.count('api::club.club', {
        filters: { updatedAt: { $gte: oneHourAgo } }
      });
      this.recordMetric('club_update_rate', recentClubUpdates);

      // Migration progress (if available)
      const migrationService = this.strapi.service('api::spiel.migration');
      if (migrationService && typeof migrationService.getProgress === 'function') {
        const progress = await migrationService.getProgress();
        this.recordMetric('club_migration_progress', progress.percentage || 0);
      }

    } catch (error) {
      this.strapi.log.error('Failed to collect operational metrics:', error);
    }
  }

  /**
   * Check alert thresholds
   */
  private async checkAlerts(): Promise<void> {
    try {
      for (const threshold of this.alertThresholds) {
        const metric = this.metrics.get(threshold.metric);
        if (!metric || metric.points.length === 0) {
          continue;
        }

        const latestPoint = metric.points[metric.points.length - 1];
        const shouldAlert = this.evaluateThreshold(latestPoint.value, threshold);

        if (shouldAlert) {
          await this.triggerAlert(threshold, latestPoint.value, metric);
        }
      }
    } catch (error) {
      this.strapi.log.error('Failed to check alerts:', error);
    }
  }

  /**
   * Evaluate if a threshold should trigger an alert
   */
  private evaluateThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'gt': return value > threshold.value;
      case 'lt': return value < threshold.value;
      case 'eq': return value === threshold.value;
      case 'gte': return value >= threshold.value;
      case 'lte': return value <= threshold.value;
      default: return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(threshold: AlertThreshold, currentValue: number, metric: ClubMetric): Promise<void> {
    const alertData = {
      metric: threshold.metric,
      severity: threshold.severity,
      description: threshold.description,
      currentValue,
      thresholdValue: threshold.value,
      operator: threshold.operator,
      timestamp: new Date(),
      unit: metric.unit
    };

    this.strapi.log[threshold.severity === 'critical' ? 'error' : 'warn'](
      `Club metrics alert: ${threshold.description}`,
      alertData
    );

    // Send to alerting system if available
    const alertingSystem = this.strapi.service('api::club.performance-alerting');
    if (alertingSystem && typeof alertingSystem.sendAlert === 'function') {
      await alertingSystem.sendAlert(alertData);
    }

    // Emit event for other systems
    this.strapi.eventHub?.emit('club.metrics.alert', alertData);
  }

  /**
   * Get current metrics
   */
  getMetrics(): Map<string, ClubMetric> {
    return new Map(this.metrics);
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): ClubMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get latest metric value
   */
  getLatestValue(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric || metric.points.length === 0) {
      return null;
    }
    return metric.points[metric.points.length - 1].value;
  }

  /**
   * Get metric statistics
   */
  getMetricStats(name: string, timeRangeMinutes: number = 60): {
    min: number;
    max: number;
    avg: number;
    count: number;
    latest: number;
  } | null {
    const metric = this.metrics.get(name);
    if (!metric || metric.points.length === 0) {
      return null;
    }

    const cutoff = new Date(Date.now() - timeRangeMinutes * 60 * 1000);
    const recentPoints = metric.points.filter(point => point.timestamp >= cutoff);

    if (recentPoints.length === 0) {
      return null;
    }

    const values = recentPoints.map(point => point.value);
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      count: values.length,
      latest: values[values.length - 1]
    };
  }

  /**
   * Export metrics for external systems
   */
  exportMetrics(): any {
    const exported: any = {
      timestamp: new Date().toISOString(),
      system: 'viktoria-club-metrics',
      metrics: {}
    };

    this.metrics.forEach((metric, name) => {
      exported.metrics[name] = {
        type: metric.type,
        description: metric.description,
        unit: metric.unit,
        pointCount: metric.points.length,
        latest: metric.points.length > 0 ? metric.points[metric.points.length - 1] : null,
        stats: this.getMetricStats(name)
      };
    });

    return exported;
  }

  /**
   * Clear old metric points
   */
  clearOldMetrics(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    
    this.metrics.forEach(metric => {
      const originalLength = metric.points.length;
      metric.points = metric.points.filter(point => point.timestamp >= cutoff);
      
      if (metric.points.length < originalLength) {
        this.strapi.log.debug(
          `Cleared ${originalLength - metric.points.length} old points from ${metric.name}`
        );
      }
    });
  }
}