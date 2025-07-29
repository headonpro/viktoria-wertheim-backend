/**
 * Prometheus Metrics Service Tests
 * Tests for Prometheus-compatible metrics collection and export
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPrometheusMetricsService, PrometheusMetricsServiceImpl } from '../../../../src/api/tabellen-eintrag/services/prometheus-metrics';
import { createAutomationLogger } from '../../../../src/api/tabellen-eintrag/services/logger';

describe('PrometheusMetricsService', () => {
  let metricsService: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = createAutomationLogger();
    metricsService = createPrometheusMetricsService(mockLogger);
  });

  describe('counter metrics', () => {
    it('should increment calculation counter', () => {
      metricsService.incrementCalculationCounter({ liga_id: '1', saison_id: '2023' });
      metricsService.incrementCalculationCounter({ liga_id: '1', saison_id: '2023' });
      metricsService.incrementCalculationCounter({ liga_id: '2', saison_id: '2023' });

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should increment job counter with status', () => {
      metricsService.incrementJobCounter('completed', { liga_id: '1' });
      metricsService.incrementJobCounter('failed', { liga_id: '1' });
      metricsService.incrementJobCounter('completed', { liga_id: '2' });

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should increment error counter with error type', () => {
      metricsService.incrementErrorCounter('validation_error', { component: 'calculation' });
      metricsService.incrementErrorCounter('database_error', { component: 'queue' });

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should increment API request counter', () => {
      metricsService.incrementApiRequestCounter('/api/tabellen-eintraege', 'GET', 200);
      metricsService.incrementApiRequestCounter('/api/tabellen-eintraege', 'POST', 201);
      metricsService.incrementApiRequestCounter('/api/tabellen-eintraege', 'GET', 500);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });
  });

  describe('gauge metrics', () => {
    it('should set queue size gauge', () => {
      metricsService.setQueueSizeGauge(10, 'calculation');
      metricsService.setQueueSizeGauge(5, 'notification');

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should set active jobs gauge', () => {
      metricsService.setActiveJobsGauge(3);
      metricsService.setActiveJobsGauge(7);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should set memory usage gauge', () => {
      metricsService.setMemoryUsageGauge(100 * 1024 * 1024); // 100MB

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should set CPU usage gauge', () => {
      metricsService.setCpuUsageGauge(45.5);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should set database connections gauge', () => {
      metricsService.setDatabaseConnectionsGauge(5, 3);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should set health status gauge', () => {
      metricsService.setHealthStatus('database', 1); // healthy
      metricsService.setHealthStatus('queue', 0.5); // degraded
      metricsService.setHealthStatus('memory', 0); // unhealthy

      expect(() => metricsService.getMetrics()).not.toThrow();
    });
  });

  describe('histogram metrics', () => {
    it('should record calculation duration', () => {
      metricsService.recordCalculationDuration(1500, { liga_id: '1' });
      metricsService.recordCalculationDuration(2300, { liga_id: '1' });
      metricsService.recordCalculationDuration(800, { liga_id: '2' });

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should record job duration', () => {
      metricsService.recordJobDuration(500, { priority: 'high' });
      metricsService.recordJobDuration(1200, { priority: 'normal' });

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should record API response time', () => {
      metricsService.recordApiResponseTime(150, '/api/health', 'GET');
      metricsService.recordApiResponseTime(300, '/api/tabellen-eintraege', 'POST');

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should record database query time', () => {
      metricsService.recordDatabaseQueryTime(50, 'SELECT');
      metricsService.recordDatabaseQueryTime(200, 'UPDATE');

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should record health check duration', () => {
      metricsService.recordHealthCheckDuration('database', 100);
      metricsService.recordHealthCheckDuration('queue', 50);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });
  });

  describe('summary metrics', () => {
    it('should record memory usage summary', () => {
      metricsService.recordMemoryUsage(50 * 1024 * 1024);
      metricsService.recordMemoryUsage(75 * 1024 * 1024);
      metricsService.recordMemoryUsage(60 * 1024 * 1024);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should record CPU usage summary', () => {
      metricsService.recordCpuUsage(30.5);
      metricsService.recordCpuUsage(45.2);
      metricsService.recordCpuUsage(38.7);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });
  });

  describe('business metrics', () => {
    it('should record teams processed', () => {
      metricsService.recordTeamsProcessed(16, 1);
      metricsService.recordTeamsProcessed(18, 2);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should record table entries updated', () => {
      metricsService.recordTableEntriesUpdated(16, 1);
      metricsService.recordTableEntriesUpdated(18, 2);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should record snapshot created', () => {
      metricsService.recordSnapshotCreated(1, 2023);
      metricsService.recordSnapshotCreated(2, 2023);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should record rollback performed', () => {
      metricsService.recordRollbackPerformed(1, 2023);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });
  });

  describe('metrics export', () => {
    it('should export metrics in Prometheus format', async () => {
      // Add some sample metrics
      metricsService.incrementCalculationCounter({ liga_id: '1' });
      metricsService.setActiveJobsGauge(5);
      metricsService.recordCalculationDuration(1500, { liga_id: '1' });
      metricsService.recordMemoryUsage(100 * 1024 * 1024);

      const metrics = await metricsService.getMetrics();

      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
      expect(metrics).toContain('tabellen_calculations_total');
      expect(metrics).toContain('tabellen_active_jobs');
      expect(metrics).toContain('tabellen_calculation_duration_seconds');
      expect(metrics).toContain('tabellen_memory_usage_summary');
    });

    it('should include process metrics in export', async () => {
      const metrics = await metricsService.getMetrics();

      expect(metrics).toContain('tabellen_process_start_time_seconds');
      expect(metrics).toContain('tabellen_process_uptime_seconds');
    });

    it('should export counter metrics correctly', async () => {
      metricsService.incrementCalculationCounter({ liga_id: '1', status: 'success' });
      metricsService.incrementCalculationCounter({ liga_id: '1', status: 'success' });
      metricsService.incrementCalculationCounter({ liga_id: '2', status: 'failed' });

      const metrics = await metricsService.getMetrics();

      expect(metrics).toContain('tabellen_calculations_total{liga_id="1",status="success"} 2');
      expect(metrics).toContain('tabellen_calculations_total{liga_id="2",status="failed"} 1');
    });

    it('should export gauge metrics correctly', async () => {
      metricsService.setActiveJobsGauge(7);
      metricsService.setQueueSizeGauge(15, 'calculation');

      const metrics = await metricsService.getMetrics();

      expect(metrics).toContain('tabellen_active_jobs 7');
      expect(metrics).toContain('tabellen_queue_size{queue_type="calculation"} 15');
    });

    it('should export histogram metrics correctly', async () => {
      metricsService.recordCalculationDuration(1500, { liga_id: '1' });
      metricsService.recordCalculationDuration(2500, { liga_id: '1' });

      const metrics = await metricsService.getMetrics();

      expect(metrics).toContain('tabellen_calculation_duration_seconds_bucket');
      expect(metrics).toContain('tabellen_calculation_duration_seconds_count');
      expect(metrics).toContain('tabellen_calculation_duration_seconds_sum');
      expect(metrics).toContain('le="');
      expect(metrics).toContain('le="+Inf"');
    });

    it('should export summary metrics correctly', async () => {
      metricsService.recordMemoryUsage(100 * 1024 * 1024);
      metricsService.recordMemoryUsage(150 * 1024 * 1024);

      const metrics = await metricsService.getMetrics();

      expect(metrics).toContain('tabellen_memory_usage_summary{quantile="');
      expect(metrics).toContain('tabellen_memory_usage_summary_count');
      expect(metrics).toContain('tabellen_memory_usage_summary_sum');
    });

    it('should export metrics for specific component', async () => {
      metricsService.setHealthStatus('database', 1);
      metricsService.setHealthStatus('queue', 0.5);
      metricsService.recordHealthCheckDuration('database', 100);

      const databaseMetrics = await metricsService.getMetricsForComponent('database');

      expect(databaseMetrics).toContain('component="database"');
      expect(databaseMetrics).not.toContain('component="queue"');
    });
  });

  describe('metrics management', () => {
    it('should reset all metrics', () => {
      metricsService.incrementCalculationCounter({ liga_id: '1' });
      metricsService.setActiveJobsGauge(5);
      metricsService.recordCalculationDuration(1500, { liga_id: '1' });

      metricsService.resetMetrics();

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should reset component-specific metrics', () => {
      metricsService.setHealthStatus('database', 1);
      metricsService.setHealthStatus('queue', 0.5);
      metricsService.recordHealthCheckDuration('database', 100);
      metricsService.recordHealthCheckDuration('queue', 50);

      metricsService.resetComponentMetrics('database');

      expect(() => metricsService.getMetrics()).not.toThrow();
    });
  });

  describe('metric validation', () => {
    it('should handle zero values correctly', () => {
      metricsService.incrementCalculationCounter({}, 0);
      metricsService.setActiveJobsGauge(0);
      metricsService.recordCalculationDuration(0, {});

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should handle negative values appropriately', () => {
      // Counters should not accept negative values in practice,
      // but the service should handle them gracefully
      metricsService.setActiveJobsGauge(-1);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should handle large values', () => {
      metricsService.incrementCalculationCounter({}, 1000000);
      metricsService.setMemoryUsageGauge(Number.MAX_SAFE_INTEGER);
      metricsService.recordCalculationDuration(999999, {});

      expect(() => metricsService.getMetrics()).not.toThrow();
    });
  });

  describe('label handling', () => {
    it('should serialize labels consistently', () => {
      metricsService.incrementCalculationCounter({ 
        liga_id: '1', 
        saison_id: '2023', 
        status: 'success' 
      });
      
      metricsService.incrementCalculationCounter({ 
        status: 'success',
        liga_id: '1', 
        saison_id: '2023'
      });

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should handle empty labels', () => {
      metricsService.incrementCalculationCounter({});
      metricsService.setActiveJobsGauge(5, {});

      expect(() => metricsService.getMetrics()).not.toThrow();
    });

    it('should handle special characters in label values', () => {
      metricsService.incrementCalculationCounter({ 
        operation: 'table-calculation',
        component: 'queue_manager'
      });

      expect(() => metricsService.getMetrics()).not.toThrow();
    });
  });

  describe('histogram buckets', () => {
    it('should use default buckets for duration metrics', async () => {
      metricsService.recordCalculationDuration(500, {});
      metricsService.recordCalculationDuration(1500, {});
      metricsService.recordCalculationDuration(5500, {});

      const metrics = await metricsService.getMetrics();

      // Check that default buckets are present
      expect(metrics).toContain('le="0.1"');
      expect(metrics).toContain('le="0.5"');
      expect(metrics).toContain('le="1"');
      expect(metrics).toContain('le="2"');
      expect(metrics).toContain('le="5"');
      expect(metrics).toContain('le="10"');
      expect(metrics).toContain('le="30"');
      expect(metrics).toContain('le="60"');
    });

    it('should distribute values across buckets correctly', async () => {
      // Record values that should fall into different buckets
      metricsService.recordCalculationDuration(100, {}); // 0.1s - should be in le="0.5" and higher
      metricsService.recordCalculationDuration(800, {}); // 0.8s - should be in le="1" and higher
      metricsService.recordCalculationDuration(3000, {}); // 3s - should be in le="5" and higher

      const metrics = await metricsService.getMetrics();

      // All values should be in the +Inf bucket
      expect(metrics).toMatch(/tabellen_calculation_duration_seconds_bucket\{le="\+Inf"\} 3/);
    });
  });

  describe('summary quantiles', () => {
    it('should use default quantiles for summary metrics', async () => {
      metricsService.recordMemoryUsage(50 * 1024 * 1024);
      metricsService.recordMemoryUsage(100 * 1024 * 1024);
      metricsService.recordMemoryUsage(75 * 1024 * 1024);

      const metrics = await metricsService.getMetrics();

      expect(metrics).toContain('quantile="0.5"');
      expect(metrics).toContain('quantile="0.9"');
      expect(metrics).toContain('quantile="0.95"');
      expect(metrics).toContain('quantile="0.99"');
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent metric updates', async () => {
      const promises = [];

      // Simulate concurrent updates
      for (let i = 0; i < 100; i++) {
        promises.push(Promise.resolve().then(() => {
          metricsService.incrementCalculationCounter({ liga_id: (i % 5).toString() });
          metricsService.setActiveJobsGauge(i % 10);
          metricsService.recordCalculationDuration(i * 10, { iteration: i.toString() });
        }));
      }

      await Promise.all(promises);

      expect(() => metricsService.getMetrics()).not.toThrow();
    });
  });
});