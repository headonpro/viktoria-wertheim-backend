/**
 * Performance Monitoring Utility for Liga-Tabellen-System
 * Monitors API performance, cache effectiveness, and user experience metrics
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

interface APIMetrics {
  endpoint: string;
  method: string;
  responseTime: number;
  status: number;
  cached: boolean;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private cacheMetrics: Map<string, CacheMetrics> = new Map();
  private apiMetrics: APIMetrics[] = [];
  private maxMetricsHistory = 100;

  /**
   * Start measuring performance for a specific operation
   */
  startMeasurement(name: string, metadata?: Record<string, any>): string {
    const measurementId = `${name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.metrics.push({
      name,
      startTime: performance.now(),
      metadata
    });

    return measurementId;
  }

  /**
   * End measurement and calculate duration
   */
  endMeasurement(name: string): number | null {
    const metric = this.metrics.find(m => m.name === name && !m.endTime);
    
    if (!metric) {
      console.warn(`Performance measurement not found: ${name}`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Log slow operations
    if (metric.duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${metric.duration.toFixed(2)}ms`);
    }

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    return metric.duration;
  }

  /**
   * Measure async function execution time
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      this.metrics.push({
        name,
        startTime,
        endTime: performance.now(),
        duration,
        metadata
      });

      // Log performance info
      if (duration > 500) {
        console.warn(`${name} took ${duration.toFixed(2)}ms`);
      } else if (duration < 100) {
        console.log(`${name} completed quickly: ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.metrics.push({
        name: `${name}_ERROR`,
        startTime,
        endTime: performance.now(),
        duration,
        metadata: { ...metadata, error: error instanceof Error ? error.message : String(error) }
      });

      throw error;
    }
  }

  /**
   * Record cache hit/miss statistics
   */
  recordCacheMetric(cacheKey: string, hit: boolean): void {
    const existing = this.cacheMetrics.get(cacheKey) || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0
    };

    if (hit) {
      existing.hits++;
    } else {
      existing.misses++;
    }

    existing.totalRequests = existing.hits + existing.misses;
    existing.hitRate = existing.totalRequests > 0 ? (existing.hits / existing.totalRequests) * 100 : 0;

    this.cacheMetrics.set(cacheKey, existing);
  }

  /**
   * Record API call metrics
   */
  recordAPIMetric(endpoint: string, method: string, responseTime: number, status: number, cached: boolean = false): void {
    this.apiMetrics.push({
      endpoint,
      method,
      responseTime,
      status,
      cached,
      timestamp: Date.now()
    });

    // Keep only recent API metrics
    if (this.apiMetrics.length > this.maxMetricsHistory) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetricsHistory);
    }

    // Log slow API calls
    if (responseTime > 2000) {
      console.warn(`Slow API call: ${method} ${endpoint} took ${responseTime}ms`);
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageResponseTime: number;
    slowestOperations: PerformanceMetric[];
    fastestOperations: PerformanceMetric[];
    totalOperations: number;
  } {
    const completedMetrics = this.metrics.filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        slowestOperations: [],
        fastestOperations: [],
        totalOperations: 0
      };
    }

    const durations = completedMetrics.map(m => m.duration!);
    const averageResponseTime = durations.reduce((a, b) => a + b, 0) / durations.length;

    const sortedByDuration = [...completedMetrics].sort((a, b) => (b.duration || 0) - (a.duration || 0));

    return {
      averageResponseTime,
      slowestOperations: sortedByDuration.slice(0, 5),
      fastestOperations: sortedByDuration.slice(-5).reverse(),
      totalOperations: completedMetrics.length
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): Map<string, CacheMetrics> {
    return new Map(this.cacheMetrics);
  }

  /**
   * Get API statistics
   */
  getAPIStats(): {
    averageResponseTime: number;
    successRate: number;
    cacheHitRate: number;
    endpointStats: Map<string, { count: number; avgTime: number; successRate: number }>;
  } {
    if (this.apiMetrics.length === 0) {
      return {
        averageResponseTime: 0,
        successRate: 0,
        cacheHitRate: 0,
        endpointStats: new Map()
      };
    }

    const totalResponseTime = this.apiMetrics.reduce((sum, metric) => sum + metric.responseTime, 0);
    const averageResponseTime = totalResponseTime / this.apiMetrics.length;

    const successfulCalls = this.apiMetrics.filter(m => m.status >= 200 && m.status < 300).length;
    const successRate = (successfulCalls / this.apiMetrics.length) * 100;

    const cachedCalls = this.apiMetrics.filter(m => m.cached).length;
    const cacheHitRate = (cachedCalls / this.apiMetrics.length) * 100;

    // Endpoint-specific statistics
    const endpointStats = new Map<string, { count: number; avgTime: number; successRate: number }>();
    
    this.apiMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const existing = endpointStats.get(key) || { count: 0, avgTime: 0, successRate: 0 };
      
      existing.count++;
      existing.avgTime = ((existing.avgTime * (existing.count - 1)) + metric.responseTime) / existing.count;
      
      const endpointSuccessful = this.apiMetrics
        .filter(m => `${m.method} ${m.endpoint}` === key && m.status >= 200 && m.status < 300)
        .length;
      existing.successRate = (endpointSuccessful / existing.count) * 100;
      
      endpointStats.set(key, existing);
    });

    return {
      averageResponseTime,
      successRate,
      cacheHitRate,
      endpointStats
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const perfStats = this.getPerformanceStats();
    const cacheStats = this.getCacheStats();
    const apiStats = this.getAPIStats();

    let report = '📊 Performance Monitor Report\n';
    report += '================================\n\n';

    // Performance Statistics
    report += '⚡ Performance Statistics:\n';
    report += `   Average Response Time: ${perfStats.averageResponseTime.toFixed(2)}ms\n`;
    report += `   Total Operations: ${perfStats.totalOperations}\n\n`;

    if (perfStats.slowestOperations.length > 0) {
      report += '🐌 Slowest Operations:\n';
      perfStats.slowestOperations.forEach((op, index) => {
        report += `   ${index + 1}. ${op.name}: ${op.duration?.toFixed(2)}ms\n`;
      });
      report += '\n';
    }

    // Cache Statistics
    if (cacheStats.size > 0) {
      report += '💾 Cache Statistics:\n';
      cacheStats.forEach((stats, key) => {
        report += `   ${key}: ${stats.hitRate.toFixed(1)}% hit rate (${stats.hits}/${stats.totalRequests})\n`;
      });
      report += '\n';
    }

    // API Statistics
    report += '🌐 API Statistics:\n';
    report += `   Average Response Time: ${apiStats.averageResponseTime.toFixed(2)}ms\n`;
    report += `   Success Rate: ${apiStats.successRate.toFixed(1)}%\n`;
    report += `   Cache Hit Rate: ${apiStats.cacheHitRate.toFixed(1)}%\n\n`;

    if (apiStats.endpointStats.size > 0) {
      report += '📋 Endpoint Statistics:\n';
      apiStats.endpointStats.forEach((stats, endpoint) => {
        report += `   ${endpoint}: ${stats.avgTime.toFixed(2)}ms avg, ${stats.successRate.toFixed(1)}% success\n`;
      });
    }

    return report;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.cacheMetrics.clear();
    this.apiMetrics = [];
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): {
    performance: PerformanceMetric[];
    cache: Record<string, CacheMetrics>;
    api: APIMetrics[];
  } {
    return {
      performance: [...this.metrics],
      cache: Object.fromEntries(this.cacheMetrics),
      api: [...this.apiMetrics]
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Helper functions for common use cases
export const measureLeagueServiceCall = async <T>(
  operation: string,
  fn: () => Promise<T>,
  teamId?: string
): Promise<T> => {
  return performanceMonitor.measureAsync(
    `leagueService.${operation}`,
    fn,
    { teamId }
  );
};

export const recordCacheHit = (cacheKey: string, hit: boolean): void => {
  performanceMonitor.recordCacheMetric(cacheKey, hit);
};

export const recordAPICall = (
  endpoint: string,
  method: string,
  responseTime: number,
  status: number,
  cached: boolean = false
): void => {
  performanceMonitor.recordAPIMetric(endpoint, method, responseTime, status, cached);
};

// Development helper to log performance stats
export const logPerformanceStats = (): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(performanceMonitor.generateReport());
  }
};

export default performanceMonitor;