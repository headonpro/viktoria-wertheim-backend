/**
 * Club Metrics Dashboard
 * 
 * Provides a comprehensive dashboard for monitoring club system health,
 * performance metrics, and operational status.
 */

interface DashboardMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  change: number;
  description: string;
  lastUpdated: Date;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  score: number;
  components: {
    database: 'healthy' | 'degraded' | 'critical';
    cache: 'healthy' | 'degraded' | 'critical';
    clubOperations: 'healthy' | 'degraded' | 'critical';
    tableCalculations: 'healthy' | 'degraded' | 'critical';
    validation: 'healthy' | 'degraded' | 'critical';
  };
  uptime: number;
  lastCheck: Date;
}

interface OperationalMetrics {
  clubOperations: {
    totalClubs: number;
    activeClubs: number;
    viktoriaClubs: number;
    opponentClubs: number;
    clubsPerLiga: Record<string, number>;
    recentlyCreated: number;
    recentlyUpdated: number;
  };
  gameOperations: {
    totalGames: number;
    clubBasedGames: number;
    teamBasedGames: number;
    gamesThisWeek: number;
    gamesThisMonth: number;
    averageGamesPerDay: number;
  };
  tableCalculations: {
    totalCalculations: number;
    successfulCalculations: number;
    failedCalculations: number;
    averageCalculationTime: number;
    calculationsThisHour: number;
    calculationsToday: number;
  };
  validation: {
    totalValidations: number;
    passedValidations: number;
    failedValidations: number;
    validationErrors: number;
    dataIntegrityScore: number;
  };
}

interface PerformanceMetrics {
  responseTime: {
    average: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    operationsPerMinute: number;
  };
  errorRate: {
    percentage: number;
    total: number;
    byType: Record<string, number>;
  };
  cachePerformance: {
    hitRate: number;
    missRate: number;
    evictionRate: number;
    averageResponseTime: number;
  };
}

interface AlertSummary {
  active: {
    critical: number;
    warning: number;
    info: number;
  };
  resolved: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  topAlerts: Array<{
    name: string;
    count: number;
    lastOccurrence: Date;
  }>;
}

export class ClubMetricsDashboard {
  private strapi: any;
  private performanceMonitor: any;
  private alertingSystem: any;
  private startTime: Date;
  private metricsCache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, Date> = new Map();

  constructor(strapi: any, performanceMonitor: any, alertingSystem: any) {
    this.strapi = strapi;
    this.performanceMonitor = performanceMonitor;
    this.alertingSystem = alertingSystem;
    this.startTime = new Date();
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(): Promise<{
    systemHealth: SystemHealth;
    operationalMetrics: OperationalMetrics;
    performanceMetrics: PerformanceMetrics;
    alertSummary: AlertSummary;
    keyMetrics: DashboardMetric[];
    lastUpdated: Date;
  }> {
    try {
      const [
        systemHealth,
        operationalMetrics,
        performanceMetrics,
        alertSummary,
        keyMetrics
      ] = await Promise.all([
        this.getSystemHealth(),
        this.getOperationalMetrics(),
        this.getPerformanceMetrics(),
        this.getAlertSummary(),
        this.getKeyMetrics()
      ]);

      return {
        systemHealth,
        operationalMetrics,
        performanceMetrics,
        alertSummary,
        keyMetrics,
        lastUpdated: new Date()
      };
    } catch (error) {
      this.strapi.log.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  private async getSystemHealth(): Promise<SystemHealth> {
    const cacheKey = 'system_health';
    const cached = this.getCachedMetric(cacheKey, 30); // 30 second cache
    if (cached) return cached;

    try {
      // Check database health
      const dbHealth = await this.checkDatabaseHealth();
      
      // Check cache health
      const cacheHealth = await this.checkCacheHealth();
      
      // Check club operations health
      const clubHealth = await this.checkClubOperationsHealth();
      
      // Check table calculations health
      const tableHealth = await this.checkTableCalculationsHealth();
      
      // Check validation health
      const validationHealth = await this.checkValidationHealth();

      const components = {
        database: dbHealth,
        cache: cacheHealth,
        clubOperations: clubHealth,
        tableCalculations: tableHealth,
        validation: validationHealth
      };

      // Calculate overall health score
      const healthScores = {
        healthy: 100,
        degraded: 50,
        critical: 0
      };

      const totalScore = Object.values(components)
        .reduce((sum, status) => sum + healthScores[status], 0);
      const averageScore = totalScore / Object.keys(components).length;

      let overall: 'healthy' | 'degraded' | 'critical';
      if (averageScore >= 80) overall = 'healthy';
      else if (averageScore >= 40) overall = 'degraded';
      else overall = 'critical';

      const uptime = Date.now() - this.startTime.getTime();

      const result = {
        overall,
        score: Math.round(averageScore),
        components,
        uptime: Math.round(uptime / 1000), // seconds
        lastCheck: new Date()
      };

      this.setCachedMetric(cacheKey, result, 30);
      return result;
    } catch (error) {
      this.strapi.log.error('Failed to get system health:', error);
      return {
        overall: 'critical',
        score: 0,
        components: {
          database: 'critical',
          cache: 'critical',
          clubOperations: 'critical',
          tableCalculations: 'critical',
          validation: 'critical'
        },
        uptime: 0,
        lastCheck: new Date()
      };
    }
  }

  /**
   * Get operational metrics
   */
  private async getOperationalMetrics(): Promise<OperationalMetrics> {
    const cacheKey = 'operational_metrics';
    const cached = this.getCachedMetric(cacheKey, 60); // 1 minute cache
    if (cached) return cached;

    try {
      // Club operations metrics
      const clubMetrics = await this.getClubOperationMetrics();
      
      // Game operations metrics
      const gameMetrics = await this.getGameOperationMetrics();
      
      // Table calculation metrics
      const tableMetrics = await this.getTableCalculationMetrics();
      
      // Validation metrics
      const validationMetrics = await this.getValidationMetrics();

      const result = {
        clubOperations: clubMetrics,
        gameOperations: gameMetrics,
        tableCalculations: tableMetrics,
        validation: validationMetrics
      };

      this.setCachedMetric(cacheKey, result, 60);
      return result;
    } catch (error) {
      this.strapi.log.error('Failed to get operational metrics:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const cacheKey = 'performance_metrics';
    const cached = this.getCachedMetric(cacheKey, 30); // 30 second cache
    if (cached) return cached;

    try {
      const metrics = await this.performanceMonitor.getMetrics();
      
      const result = {
        responseTime: {
          average: metrics.responseTime?.average || 0,
          p50: metrics.responseTime?.p50 || 0,
          p95: metrics.responseTime?.p95 || 0,
          p99: metrics.responseTime?.p99 || 0
        },
        throughput: {
          requestsPerSecond: metrics.throughput?.requestsPerSecond || 0,
          operationsPerMinute: metrics.throughput?.operationsPerMinute || 0
        },
        errorRate: {
          percentage: metrics.errorRate?.percentage || 0,
          total: metrics.errorRate?.total || 0,
          byType: metrics.errorRate?.byType || {}
        },
        cachePerformance: {
          hitRate: metrics.cache?.hitRate || 0,
          missRate: metrics.cache?.missRate || 0,
          evictionRate: metrics.cache?.evictionRate || 0,
          averageResponseTime: metrics.cache?.averageResponseTime || 0
        }
      };

      this.setCachedMetric(cacheKey, result, 30);
      return result;
    } catch (error) {
      this.strapi.log.error('Failed to get performance metrics:', error);
      return {
        responseTime: { average: 0, p50: 0, p95: 0, p99: 0 },
        throughput: { requestsPerSecond: 0, operationsPerMinute: 0 },
        errorRate: { percentage: 0, total: 0, byType: {} },
        cachePerformance: { hitRate: 0, missRate: 0, evictionRate: 0, averageResponseTime: 0 }
      };
    }
  }

  /**
   * Get alert summary
   */
  private async getAlertSummary(): Promise<AlertSummary> {
    const cacheKey = 'alert_summary';
    const cached = this.getCachedMetric(cacheKey, 60); // 1 minute cache
    if (cached) return cached;

    try {
      const alerts = await this.alertingSystem.getAlertSummary();
      
      const result = {
        active: {
          critical: alerts.active?.critical || 0,
          warning: alerts.active?.warning || 0,
          info: alerts.active?.info || 0
        },
        resolved: {
          today: alerts.resolved?.today || 0,
          thisWeek: alerts.resolved?.thisWeek || 0,
          thisMonth: alerts.resolved?.thisMonth || 0
        },
        topAlerts: alerts.topAlerts || []
      };

      this.setCachedMetric(cacheKey, result, 60);
      return result;
    } catch (error) {
      this.strapi.log.error('Failed to get alert summary:', error);
      return {
        active: { critical: 0, warning: 0, info: 0 },
        resolved: { today: 0, thisWeek: 0, thisMonth: 0 },
        topAlerts: []
      };
    }
  }

  /**
   * Get key dashboard metrics
   */
  private async getKeyMetrics(): Promise<DashboardMetric[]> {
    const cacheKey = 'key_metrics';
    const cached = this.getCachedMetric(cacheKey, 60); // 1 minute cache
    if (cached) return cached;

    try {
      const metrics: DashboardMetric[] = [];

      // Total clubs metric
      const totalClubs = await this.strapi.entityService.count('api::club.club');
      metrics.push({
        name: 'Total Clubs',
        value: totalClubs,
        unit: 'clubs',
        status: totalClubs > 0 ? 'good' : 'warning',
        trend: 'stable',
        change: 0,
        description: 'Total number of clubs in the system',
        lastUpdated: new Date()
      });

      // Active clubs metric
      const activeClubs = await this.strapi.entityService.count('api::club.club', {
        filters: { aktiv: true }
      });
      metrics.push({
        name: 'Active Clubs',
        value: activeClubs,
        unit: 'clubs',
        status: activeClubs > 0 ? 'good' : 'critical',
        trend: 'stable',
        change: 0,
        description: 'Number of active clubs',
        lastUpdated: new Date()
      });

      // Club-based games metric
      const clubGames = await this.strapi.entityService.count('api::spiel.spiel', {
        filters: {
          heim_club: { $notNull: true },
          gast_club: { $notNull: true }
        }
      });
      metrics.push({
        name: 'Club-based Games',
        value: clubGames,
        unit: 'games',
        status: clubGames > 0 ? 'good' : 'warning',
        trend: 'up',
        change: 0,
        description: 'Games using club relations',
        lastUpdated: new Date()
      });

      // Table calculation success rate
      const performanceMetrics = await this.performanceMonitor.getMetrics();
      const successRate = performanceMetrics.tableCalculations?.successRate || 0;
      metrics.push({
        name: 'Calculation Success Rate',
        value: Math.round(successRate * 100),
        unit: '%',
        status: successRate > 0.95 ? 'good' : successRate > 0.8 ? 'warning' : 'critical',
        trend: 'stable',
        change: 0,
        description: 'Table calculation success rate',
        lastUpdated: new Date()
      });

      // Cache hit rate
      const cacheHitRate = performanceMetrics.cache?.hitRate || 0;
      metrics.push({
        name: 'Cache Hit Rate',
        value: Math.round(cacheHitRate * 100),
        unit: '%',
        status: cacheHitRate > 0.8 ? 'good' : cacheHitRate > 0.6 ? 'warning' : 'critical',
        trend: 'stable',
        change: 0,
        description: 'Cache performance hit rate',
        lastUpdated: new Date()
      });

      this.setCachedMetric(cacheKey, metrics, 60);
      return metrics;
    } catch (error) {
      this.strapi.log.error('Failed to get key metrics:', error);
      return [];
    }
  }

  // Health check methods
  private async checkDatabaseHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      const start = Date.now();
      await this.strapi.db.connection.raw('SELECT 1');
      const responseTime = Date.now() - start;
      
      if (responseTime < 100) return 'healthy';
      if (responseTime < 500) return 'degraded';
      return 'critical';
    } catch (error) {
      return 'critical';
    }
  }

  private async checkCacheHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      const metrics = await this.performanceMonitor.getCacheMetrics();
      const hitRate = metrics.hitRate || 0;
      
      if (hitRate > 0.8) return 'healthy';
      if (hitRate > 0.6) return 'degraded';
      return 'critical';
    } catch (error) {
      return 'critical';
    }
  }

  private async checkClubOperationsHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      const activeClubs = await this.strapi.entityService.count('api::club.club', {
        filters: { aktiv: true }
      });
      
      if (activeClubs > 10) return 'healthy';
      if (activeClubs > 0) return 'degraded';
      return 'critical';
    } catch (error) {
      return 'critical';
    }
  }

  private async checkTableCalculationsHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      const metrics = await this.performanceMonitor.getTableCalculationMetrics();
      const successRate = metrics.successRate || 0;
      
      if (successRate > 0.95) return 'healthy';
      if (successRate > 0.8) return 'degraded';
      return 'critical';
    } catch (error) {
      return 'critical';
    }
  }

  private async checkValidationHealth(): Promise<'healthy' | 'degraded' | 'critical'> {
    try {
      const metrics = await this.performanceMonitor.getValidationMetrics();
      const errorRate = metrics.errorRate || 0;
      
      if (errorRate < 0.05) return 'healthy';
      if (errorRate < 0.2) return 'degraded';
      return 'critical';
    } catch (error) {
      return 'critical';
    }
  }

  // Operational metrics methods
  private async getClubOperationMetrics() {
    const totalClubs = await this.strapi.entityService.count('api::club.club');
    const activeClubs = await this.strapi.entityService.count('api::club.club', {
      filters: { aktiv: true }
    });
    const viktoriaClubs = await this.strapi.entityService.count('api::club.club', {
      filters: { club_typ: 'viktoria_verein' }
    });
    const opponentClubs = await this.strapi.entityService.count('api::club.club', {
      filters: { club_typ: 'gegner_verein' }
    });

    // Get clubs per liga
    const ligen = await this.strapi.entityService.findMany('api::liga.liga', {
      populate: ['clubs']
    });
    const clubsPerLiga: Record<string, number> = {};
    ligen.forEach((liga: any) => {
      clubsPerLiga[liga.name] = liga.clubs?.length || 0;
    });

    // Recent activity
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyCreated = await this.strapi.entityService.count('api::club.club', {
      filters: { createdAt: { $gte: oneDayAgo } }
    });
    const recentlyUpdated = await this.strapi.entityService.count('api::club.club', {
      filters: { updatedAt: { $gte: oneDayAgo } }
    });

    return {
      totalClubs,
      activeClubs,
      viktoriaClubs,
      opponentClubs,
      clubsPerLiga,
      recentlyCreated,
      recentlyUpdated
    };
  }

  private async getGameOperationMetrics() {
    const totalGames = await this.strapi.entityService.count('api::spiel.spiel');
    const clubBasedGames = await this.strapi.entityService.count('api::spiel.spiel', {
      filters: {
        heim_club: { $notNull: true },
        gast_club: { $notNull: true }
      }
    });
    const teamBasedGames = await this.strapi.entityService.count('api::spiel.spiel', {
      filters: {
        heim_team: { $notNull: true },
        gast_team: { $notNull: true }
      }
    });

    // Time-based metrics
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const gamesThisWeek = await this.strapi.entityService.count('api::spiel.spiel', {
      filters: { createdAt: { $gte: oneWeekAgo } }
    });
    const gamesThisMonth = await this.strapi.entityService.count('api::spiel.spiel', {
      filters: { createdAt: { $gte: oneMonthAgo } }
    });

    const averageGamesPerDay = gamesThisMonth / 30;

    return {
      totalGames,
      clubBasedGames,
      teamBasedGames,
      gamesThisWeek,
      gamesThisMonth,
      averageGamesPerDay: Math.round(averageGamesPerDay * 100) / 100
    };
  }

  private async getTableCalculationMetrics() {
    const metrics = await this.performanceMonitor.getTableCalculationMetrics();
    
    return {
      totalCalculations: metrics.totalCalculations || 0,
      successfulCalculations: metrics.successfulCalculations || 0,
      failedCalculations: metrics.failedCalculations || 0,
      averageCalculationTime: metrics.averageCalculationTime || 0,
      calculationsThisHour: metrics.calculationsThisHour || 0,
      calculationsToday: metrics.calculationsToday || 0
    };
  }

  private async getValidationMetrics() {
    const metrics = await this.performanceMonitor.getValidationMetrics();
    
    return {
      totalValidations: metrics.totalValidations || 0,
      passedValidations: metrics.passedValidations || 0,
      failedValidations: metrics.failedValidations || 0,
      validationErrors: metrics.validationErrors || 0,
      dataIntegrityScore: metrics.dataIntegrityScore || 0
    };
  }

  // Cache management
  private getCachedMetric(key: string, maxAgeSeconds: number): any {
    const cached = this.metricsCache.get(key);
    const expiry = this.cacheExpiry.get(key);
    
    if (cached && expiry && expiry > new Date()) {
      return cached;
    }
    
    return null;
  }

  private setCachedMetric(key: string, value: any, maxAgeSeconds: number): void {
    this.metricsCache.set(key, value);
    this.cacheExpiry.set(key, new Date(Date.now() + maxAgeSeconds * 1000));
  }

  /**
   * Clear all cached metrics
   */
  clearCache(): void {
    this.metricsCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get specific metric by name
   */
  async getMetric(name: string): Promise<DashboardMetric | null> {
    const keyMetrics = await this.getKeyMetrics();
    return keyMetrics.find(metric => metric.name === name) || null;
  }

  /**
   * Export metrics for external monitoring systems
   */
  async exportMetrics(): Promise<any> {
    const dashboardData = await this.getDashboardData();
    
    return {
      timestamp: new Date().toISOString(),
      system: 'viktoria-club-system',
      version: '1.0.0',
      metrics: dashboardData
    };
  }
}