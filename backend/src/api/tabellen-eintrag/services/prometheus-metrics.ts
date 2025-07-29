/**
 * Prometheus Metrics Service
 * Provides Prometheus-compatible metrics for monitoring and alerting
 */

import { AutomationLogger } from './logger';
import { PerformanceMetrics } from './types';

export interface PrometheusMetricsService {
  // Counter metrics
  incrementCalculationCounter(labels?: Record<string, string>): void;
  incrementJobCounter(status: string, labels?: Record<string, string>): void;
  incrementErrorCounter(errorType: string, labels?: Record<string, string>): void;
  incrementApiRequestCounter(endpoint: string, method: string, status: number): void;

  // Gauge metrics
  setQueueSizeGauge(size: number, queueType?: string): void;
  setActiveJobsGauge(count: number): void;
  setMemoryUsageGauge(bytes: number): void;
  setCpuUsageGauge(percentage: number): void;
  setDatabaseConnectionsGauge(active: number, idle: number): void;

  // Histogram metrics
  recordCalculationDuration(duration: number, labels?: Record<string, string>): void;
  recordJobDuration(duration: number, labels?: Record<string, string>): void;
  recordApiResponseTime(duration: number, endpoint: string, method: string): void;
  recordDatabaseQueryTime(duration: number, operation: string): void;

  // Summary metrics
  recordMemoryUsage(bytes: number): void;
  recordCpuUsage(percentage: number): void;

  // Health metrics
  setHealthStatus(component: string, status: number): void; // 1 = healthy, 0.5 = degraded, 0 = unhealthy
  recordHealthCheckDuration(component: string, duration: number): void;

  // Custom business metrics
  recordTeamsProcessed(count: number, ligaId: number): void;
  recordTableEntriesUpdated(count: number, ligaId: number): void;
  recordSnapshotCreated(ligaId: number, saisonId: number): void;
  recordRollbackPerformed(ligaId: number, saisonId: number): void;

  // Export metrics in Prometheus format
  getMetrics(): Promise<string>;
  getMetricsForComponent(component: string): Promise<string>;
  
  // Reset metrics (useful for testing)
  resetMetrics(): void;
  resetComponentMetrics(component: string): void;
}

export interface MetricDefinition {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  labels?: string[];
  buckets?: number[]; // For histograms
  quantiles?: number[]; // For summaries
}

export interface MetricValue {
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

export interface HistogramBucket {
  le: number; // Less than or equal to
  count: number;
}

export interface HistogramMetric {
  buckets: HistogramBucket[];
  count: number;
  sum: number;
}

export interface SummaryQuantile {
  quantile: number;
  value: number;
}

export interface SummaryMetric {
  quantiles: SummaryQuantile[];
  count: number;
  sum: number;
}

export class PrometheusMetricsServiceImpl implements PrometheusMetricsService {
  private logger: AutomationLogger;
  private metrics: Map<string, MetricDefinition> = new Map();
  private counters: Map<string, Map<string, number>> = new Map();
  private gauges: Map<string, Map<string, number>> = new Map();
  private histograms: Map<string, Map<string, HistogramMetric>> = new Map();
  private summaries: Map<string, Map<string, SummaryMetric>> = new Map();
  private startTime: Date = new Date();

  constructor(logger: AutomationLogger) {
    this.logger = logger;
    this.initializeMetrics();
  }

  // Counter methods
  incrementCalculationCounter(labels: Record<string, string> = {}): void {
    this.incrementCounter('tabellen_calculations_total', labels);
  }

  incrementJobCounter(status: string, labels: Record<string, string> = {}): void {
    this.incrementCounter('tabellen_jobs_total', { status, ...labels });
  }

  incrementErrorCounter(errorType: string, labels: Record<string, string> = {}): void {
    this.incrementCounter('tabellen_errors_total', { error_type: errorType, ...labels });
  }

  incrementApiRequestCounter(endpoint: string, method: string, status: number): void {
    this.incrementCounter('tabellen_api_requests_total', {
      endpoint,
      method,
      status: status.toString()
    });
  }

  // Gauge methods
  setQueueSizeGauge(size: number, queueType: string = 'default'): void {
    this.setGauge('tabellen_queue_size', size, { queue_type: queueType });
  }

  setActiveJobsGauge(count: number): void {
    this.setGauge('tabellen_active_jobs', count);
  }

  setMemoryUsageGauge(bytes: number): void {
    this.setGauge('tabellen_memory_usage_bytes', bytes);
  }

  setCpuUsageGauge(percentage: number): void {
    this.setGauge('tabellen_cpu_usage_percent', percentage);
  }

  setDatabaseConnectionsGauge(active: number, idle: number): void {
    this.setGauge('tabellen_database_connections', active, { state: 'active' });
    this.setGauge('tabellen_database_connections', idle, { state: 'idle' });
  }

  // Histogram methods
  recordCalculationDuration(duration: number, labels: Record<string, string> = {}): void {
    this.recordHistogram('tabellen_calculation_duration_seconds', duration / 1000, labels);
  }

  recordJobDuration(duration: number, labels: Record<string, string> = {}): void {
    this.recordHistogram('tabellen_job_duration_seconds', duration / 1000, labels);
  }

  recordApiResponseTime(duration: number, endpoint: string, method: string): void {
    this.recordHistogram('tabellen_api_response_time_seconds', duration / 1000, {
      endpoint,
      method
    });
  }

  recordDatabaseQueryTime(duration: number, operation: string): void {
    this.recordHistogram('tabellen_database_query_duration_seconds', duration / 1000, {
      operation
    });
  }

  // Summary methods
  recordMemoryUsage(bytes: number): void {
    this.recordSummary('tabellen_memory_usage_summary', bytes);
  }

  recordCpuUsage(percentage: number): void {
    this.recordSummary('tabellen_cpu_usage_summary', percentage);
  }

  // Health methods
  setHealthStatus(component: string, status: number): void {
    this.setGauge('tabellen_health_status', status, { component });
  }

  recordHealthCheckDuration(component: string, duration: number): void {
    this.recordHistogram('tabellen_health_check_duration_seconds', duration / 1000, {
      component
    });
  }

  // Business metrics
  recordTeamsProcessed(count: number, ligaId: number): void {
    this.incrementCounter('tabellen_teams_processed_total', {
      liga_id: ligaId.toString()
    }, count);
  }

  recordTableEntriesUpdated(count: number, ligaId: number): void {
    this.incrementCounter('tabellen_entries_updated_total', {
      liga_id: ligaId.toString()
    }, count);
  }

  recordSnapshotCreated(ligaId: number, saisonId: number): void {
    this.incrementCounter('tabellen_snapshots_created_total', {
      liga_id: ligaId.toString(),
      saison_id: saisonId.toString()
    });
  }

  recordRollbackPerformed(ligaId: number, saisonId: number): void {
    this.incrementCounter('tabellen_rollbacks_total', {
      liga_id: ligaId.toString(),
      saison_id: saisonId.toString()
    });
  }

  // Export methods
  async getMetrics(): Promise<string> {
    const lines: string[] = [];

    // Add process metrics
    lines.push(`# HELP tabellen_process_start_time_seconds Start time of the process since unix epoch in seconds`);
    lines.push(`# TYPE tabellen_process_start_time_seconds gauge`);
    lines.push(`tabellen_process_start_time_seconds ${this.startTime.getTime() / 1000}`);
    lines.push('');

    lines.push(`# HELP tabellen_process_uptime_seconds Process uptime in seconds`);
    lines.push(`# TYPE tabellen_process_uptime_seconds gauge`);
    lines.push(`tabellen_process_uptime_seconds ${(Date.now() - this.startTime.getTime()) / 1000}`);
    lines.push('');

    // Export all metrics
    for (const [name, definition] of this.metrics) {
      lines.push(`# HELP ${name} ${definition.help}`);
      lines.push(`# TYPE ${name} ${definition.type}`);

      switch (definition.type) {
        case 'counter':
          lines.push(...this.formatCounterMetric(name));
          break;
        case 'gauge':
          lines.push(...this.formatGaugeMetric(name));
          break;
        case 'histogram':
          lines.push(...this.formatHistogramMetric(name));
          break;
        case 'summary':
          lines.push(...this.formatSummaryMetric(name));
          break;
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  async getMetricsForComponent(component: string): Promise<string> {
    const allMetrics = await this.getMetrics();
    const lines = allMetrics.split('\n');
    const componentLines: string[] = [];

    let inComponentMetric = false;
    for (const line of lines) {
      if (line.startsWith('# HELP') || line.startsWith('# TYPE')) {
        inComponentMetric = line.includes(component);
        if (inComponentMetric) {
          componentLines.push(line);
        }
      } else if (inComponentMetric && (line.includes(`component="${component}"`) || line.trim() === '')) {
        componentLines.push(line);
      } else if (line.trim() === '') {
        inComponentMetric = false;
      }
    }

    return componentLines.join('\n');
  }

  resetMetrics(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.summaries.clear();
  }

  resetComponentMetrics(component: string): void {
    // Reset metrics that have component labels
    for (const [metricName, labelMap] of this.counters) {
      for (const [labelKey, value] of labelMap) {
        if (labelKey.includes(`component="${component}"`)) {
          labelMap.delete(labelKey);
        }
      }
    }

    for (const [metricName, labelMap] of this.gauges) {
      for (const [labelKey, value] of labelMap) {
        if (labelKey.includes(`component="${component}"`)) {
          labelMap.delete(labelKey);
        }
      }
    }

    for (const [metricName, labelMap] of this.histograms) {
      for (const [labelKey, value] of labelMap) {
        if (labelKey.includes(`component="${component}"`)) {
          labelMap.delete(labelKey);
        }
      }
    }

    for (const [metricName, labelMap] of this.summaries) {
      for (const [labelKey, value] of labelMap) {
        if (labelKey.includes(`component="${component}"`)) {
          labelMap.delete(labelKey);
        }
      }
    }
  }

  // Private helper methods
  private initializeMetrics(): void {
    // Counter metrics
    this.registerMetric({
      name: 'tabellen_calculations_total',
      help: 'Total number of table calculations performed',
      type: 'counter',
      labels: ['liga_id', 'saison_id', 'trigger', 'status']
    });

    this.registerMetric({
      name: 'tabellen_jobs_total',
      help: 'Total number of queue jobs processed',
      type: 'counter',
      labels: ['status', 'priority', 'liga_id']
    });

    this.registerMetric({
      name: 'tabellen_errors_total',
      help: 'Total number of errors encountered',
      type: 'counter',
      labels: ['error_type', 'component', 'severity']
    });

    this.registerMetric({
      name: 'tabellen_api_requests_total',
      help: 'Total number of API requests',
      type: 'counter',
      labels: ['endpoint', 'method', 'status']
    });

    // Gauge metrics
    this.registerMetric({
      name: 'tabellen_queue_size',
      help: 'Current number of jobs in queue',
      type: 'gauge',
      labels: ['queue_type']
    });

    this.registerMetric({
      name: 'tabellen_active_jobs',
      help: 'Current number of active jobs',
      type: 'gauge'
    });

    this.registerMetric({
      name: 'tabellen_memory_usage_bytes',
      help: 'Current memory usage in bytes',
      type: 'gauge'
    });

    this.registerMetric({
      name: 'tabellen_cpu_usage_percent',
      help: 'Current CPU usage percentage',
      type: 'gauge'
    });

    this.registerMetric({
      name: 'tabellen_database_connections',
      help: 'Current database connections',
      type: 'gauge',
      labels: ['state']
    });

    this.registerMetric({
      name: 'tabellen_health_status',
      help: 'Health status of components (1=healthy, 0.5=degraded, 0=unhealthy)',
      type: 'gauge',
      labels: ['component']
    });

    // Histogram metrics
    this.registerMetric({
      name: 'tabellen_calculation_duration_seconds',
      help: 'Time spent calculating tables',
      type: 'histogram',
      labels: ['liga_id', 'saison_id', 'trigger'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.registerMetric({
      name: 'tabellen_job_duration_seconds',
      help: 'Time spent processing queue jobs',
      type: 'histogram',
      labels: ['priority', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.registerMetric({
      name: 'tabellen_api_response_time_seconds',
      help: 'API response time',
      type: 'histogram',
      labels: ['endpoint', 'method'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    this.registerMetric({
      name: 'tabellen_database_query_duration_seconds',
      help: 'Database query execution time',
      type: 'histogram',
      labels: ['operation'],
      buckets: [0.001, 0.01, 0.1, 0.5, 1, 2, 5]
    });

    this.registerMetric({
      name: 'tabellen_health_check_duration_seconds',
      help: 'Health check execution time',
      type: 'histogram',
      labels: ['component'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
    });

    // Summary metrics
    this.registerMetric({
      name: 'tabellen_memory_usage_summary',
      help: 'Memory usage summary statistics',
      type: 'summary',
      quantiles: [0.5, 0.9, 0.95, 0.99]
    });

    this.registerMetric({
      name: 'tabellen_cpu_usage_summary',
      help: 'CPU usage summary statistics',
      type: 'summary',
      quantiles: [0.5, 0.9, 0.95, 0.99]
    });

    // Business metrics
    this.registerMetric({
      name: 'tabellen_teams_processed_total',
      help: 'Total number of teams processed in calculations',
      type: 'counter',
      labels: ['liga_id']
    });

    this.registerMetric({
      name: 'tabellen_entries_updated_total',
      help: 'Total number of table entries updated',
      type: 'counter',
      labels: ['liga_id']
    });

    this.registerMetric({
      name: 'tabellen_snapshots_created_total',
      help: 'Total number of snapshots created',
      type: 'counter',
      labels: ['liga_id', 'saison_id']
    });

    this.registerMetric({
      name: 'tabellen_rollbacks_total',
      help: 'Total number of rollbacks performed',
      type: 'counter',
      labels: ['liga_id', 'saison_id']
    });
  }

  private registerMetric(definition: MetricDefinition): void {
    this.metrics.set(definition.name, definition);
  }

  private incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, new Map());
    }

    const labelKey = this.serializeLabels(labels);
    const current = this.counters.get(name)!.get(labelKey) || 0;
    this.counters.get(name)!.set(labelKey, current + value);
  }

  private setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, new Map());
    }

    const labelKey = this.serializeLabels(labels);
    this.gauges.get(name)!.set(labelKey, value);
  }

  private recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Map());
    }

    const labelKey = this.serializeLabels(labels);
    const metric = this.metrics.get(name);
    const buckets = metric?.buckets || [0.1, 0.5, 1, 2, 5, 10, 30, 60];

    if (!this.histograms.get(name)!.has(labelKey)) {
      this.histograms.get(name)!.set(labelKey, {
        buckets: buckets.map(le => ({ le, count: 0 })),
        count: 0,
        sum: 0
      });
    }

    const histogram = this.histograms.get(name)!.get(labelKey)!;
    histogram.count++;
    histogram.sum += value;

    // Update bucket counts
    for (const bucket of histogram.buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }
  }

  private recordSummary(name: string, value: number, labels: Record<string, string> = {}): void {
    if (!this.summaries.has(name)) {
      this.summaries.set(name, new Map());
    }

    const labelKey = this.serializeLabels(labels);
    
    if (!this.summaries.get(name)!.has(labelKey)) {
      const metric = this.metrics.get(name);
      const quantiles = metric?.quantiles || [0.5, 0.9, 0.95, 0.99];
      
      this.summaries.get(name)!.set(labelKey, {
        quantiles: quantiles.map(quantile => ({ quantile, value: 0 })),
        count: 0,
        sum: 0
      });
    }

    const summary = this.summaries.get(name)!.get(labelKey)!;
    summary.count++;
    summary.sum += value;

    // Note: This is a simplified quantile calculation
    // In production, you'd want to use a proper quantile estimation algorithm
    for (const quantile of summary.quantiles) {
      quantile.value = value; // Simplified - just use latest value
    }
  }

  private serializeLabels(labels: Record<string, string>): string {
    const sortedKeys = Object.keys(labels).sort();
    return sortedKeys.map(key => `${key}="${labels[key]}"`).join(',');
  }

  private formatCounterMetric(name: string): string[] {
    const lines: string[] = [];
    const counterMap = this.counters.get(name);
    
    if (counterMap) {
      for (const [labelKey, value] of counterMap) {
        const labelStr = labelKey ? `{${labelKey}}` : '';
        lines.push(`${name}${labelStr} ${value}`);
      }
    }

    if (lines.length === 0) {
      lines.push(`${name} 0`);
    }

    return lines;
  }

  private formatGaugeMetric(name: string): string[] {
    const lines: string[] = [];
    const gaugeMap = this.gauges.get(name);
    
    if (gaugeMap) {
      for (const [labelKey, value] of gaugeMap) {
        const labelStr = labelKey ? `{${labelKey}}` : '';
        lines.push(`${name}${labelStr} ${value}`);
      }
    }

    if (lines.length === 0) {
      lines.push(`${name} 0`);
    }

    return lines;
  }

  private formatHistogramMetric(name: string): string[] {
    const lines: string[] = [];
    const histogramMap = this.histograms.get(name);
    
    if (histogramMap) {
      for (const [labelKey, histogram] of histogramMap) {
        const baseLabels = labelKey ? `${labelKey},` : '';
        
        // Bucket counts
        for (const bucket of histogram.buckets) {
          lines.push(`${name}_bucket{${baseLabels}le="${bucket.le}"} ${bucket.count}`);
        }
        
        // +Inf bucket
        lines.push(`${name}_bucket{${baseLabels}le="+Inf"} ${histogram.count}`);
        
        // Count and sum
        const labelStr = labelKey ? `{${labelKey}}` : '';
        lines.push(`${name}_count${labelStr} ${histogram.count}`);
        lines.push(`${name}_sum${labelStr} ${histogram.sum}`);
      }
    }

    return lines;
  }

  private formatSummaryMetric(name: string): string[] {
    const lines: string[] = [];
    const summaryMap = this.summaries.get(name);
    
    if (summaryMap) {
      for (const [labelKey, summary] of summaryMap) {
        const baseLabels = labelKey ? `${labelKey},` : '';
        
        // Quantiles
        for (const quantile of summary.quantiles) {
          lines.push(`${name}{${baseLabels}quantile="${quantile.quantile}"} ${quantile.value}`);
        }
        
        // Count and sum
        const labelStr = labelKey ? `{${labelKey}}` : '';
        lines.push(`${name}_count${labelStr} ${summary.count}`);
        lines.push(`${name}_sum${labelStr} ${summary.sum}`);
      }
    }

    return lines;
  }
}

// Factory function
export function createPrometheusMetricsService(logger: AutomationLogger): PrometheusMetricsService {
  return new PrometheusMetricsServiceImpl(logger);
}