/**
 * Unit Tests for Performance Monitor
 */

import { 
  PerformanceMonitorImpl,
  PerformanceTracker,
  SystemHealth,
  HealthStatus,
  AlertType,
  TrendDirection
} from '../../../../src/api/tabellen-eintrag/services/performance-monitor';
import { 
  AutomationLoggerImpl,
  AlertLevel
} from '../../../../src/api/tabellen-eintrag/services/logger';
import { PerformanceThresholds } from '../../../../src/api/tabellen-eintrag/services/error-handling';

// Mock Strapi
const mockStrapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
    debug: jest.fn()
  },
  db: {
    connection: {
      raw: jest.fn(),
      pool: {
        numUsed: jest.fn().mockReturnValue(5),
        numFree: jest.fn().mockReturnValue(10)
      }
    }
  },
  service: jest.fn()
};

global.strapi = mockStrapi as any;

// Mock process methods
const originalMemoryUsage = process.memoryUsage;
const originalCpuUsage = process.cpuUsage;

beforeAll(() => {
  process.memoryUsage = jest.fn().mockReturnValue({
    heapUsed: 100 * 1024 * 1024, // 100MB
    heapTotal: 200 * 1024 * 1024, // 200MB
    external: 10 * 1024 * 1024,
    arrayBuffers: 5 * 1024 * 1024,
    rss: 150 * 1024 * 1024
  });

  process.cpuUsage = jest.fn().mockReturnValue({
    user: 50000, // 50ms
    system: 25000 // 25ms
  });
});

afterAll(() => {
  process.memoryUsage = originalMemoryUsage;
  process.cpuUsage = originalCpuUsage;
});

describe('PerformanceMonitorImpl', () => {
  let logger: AutomationLoggerImpl;
  let performanceMonitor: PerformanceMonitorImpl;
  let thresholds: PerformanceThresholds;

  beforeEach(() => {
    jest.clearAllMocks();
    
    logger = new AutomationLoggerImpl();
    thresholds = {
      duration: { warning: 1000, error: 5000 },
      memory: { warning: 100 * 1024 * 1024, error: 500 * 1024 * 1024 }, // 100MB, 500MB
      cpu: { warning: 70, error: 90 }
    };
    
    performanceMonitor = new PerformanceMonitorImpl(logger, thresholds);
  });

  afterEach(() => {
    performanceMonitor.stopMonitoring();
    logger.destroy();
  });

  describe('Operation Tracking', () => {
    it('should create and track performance tracker', () => {
      const tracker = performanceMonitor.startOperation('test_operation', { testData: 'test' });
      
      expect(tracker).toBeDefined();
      expect(typeof tracker.addMetadata).toBe('function');
      expect(typeof tracker.addCheckpoint).toBe('function');
      expect(typeof tracker.finish).toBe('function');
    });

    it('should track operation with metadata and checkpoints', async () => {
      const tracker = performanceMonitor.startOperation('complex_operation');
      
      tracker.addMetadata('userId', 'user123');
      tracker.addMetadata('operationType', 'calculation');
      
      tracker.addCheckpoint('validation_complete');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      tracker.addCheckpoint('processing_complete');
      
      const metrics = tracker.finish(true);
      
      expect(metrics.operationName).toBe('complex_operation');
      expect(metrics.duration).toBeGreaterThan(90);
      expect(metrics.metadata.userId).toBe('user123');
      expect(metrics.metadata.checkpoints).toHaveLength(2);
      expect(metrics.metadata.checkpoints[0].name).toBe('validation_complete');
      expect(metrics.metadata.success).toBe(true);
    });

    it('should handle tracker cancellation', () => {
      const tracker = performanceMonitor.startOperation('cancelled_operation');
      
      tracker.cancel();
      
      expect(() => tracker.finish()).toThrow('Tracker already finished or cancelled');
    });

    it('should prevent double finishing', () => {
      const tracker = performanceMonitor.startOperation('double_finish_operation');
      
      tracker.finish();
      
      expect(() => tracker.finish()).toThrow('Tracker already finished or cancelled');
    });

    it('should alert on slow operations', () => {
      const logAlertSpy = jest.spyOn(logger, 'logAlert');
      
      const tracker = performanceMonitor.startOperation('slow_operation');
      
      // Mock a slow operation by manipulating the start time
      (tracker as any).startTime = new Date(Date.now() - 2000); // 2 seconds ago
      
      tracker.finish();
      
      expect(logAlertSpy).toHaveBeenCalledWith(
        AlertLevel.MEDIUM,
        expect.stringContaining('Slow operation'),
        expect.objectContaining({
          operationName: 'slow_operation',
          duration: expect.any(Number),
          threshold: thresholds.duration.warning
        })
      );
    });

    it('should alert on high memory usage', () => {
      // Mock high memory usage
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 600 * 1024 * 1024, // 600MB (above error threshold)
        heapTotal: 1024 * 1024 * 1024, // 1GB
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
        rss: 700 * 1024 * 1024
      });

      const logAlertSpy = jest.spyOn(logger, 'logAlert');
      
      const tracker = performanceMonitor.startOperation('memory_intensive_operation');
      tracker.finish();
      
      expect(logAlertSpy).toHaveBeenCalledWith(
        AlertLevel.HIGH,
        expect.stringContaining('High memory usage'),
        expect.objectContaining({
          operationName: 'memory_intensive_operation',
          memoryUsage: 600 * 1024 * 1024,
          threshold: thresholds.memory.warning
        })
      );
    });
  });

  describe('Resource Usage Tracking', () => {
    it('should track basic resource usage', async () => {
      const usage = await performanceMonitor.trackResourceUsage();
      
      expect(usage).toMatchObject({
        timestamp: expect.any(Date),
        memoryUsage: {
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number)
        },
        cpuUsage: {
          percentage: expect.any(Number),
          loadAverage: expect.any(Array)
        }
      });
      
      expect(usage.memoryUsage.percentage).toBeGreaterThan(0);
      expect(usage.memoryUsage.percentage).toBeLessThanOrEqual(100);
    });

    it('should include database connection info when available', async () => {
      const usage = await performanceMonitor.trackResourceUsage();
      
      expect(usage.databaseConnections).toMatchObject({
        active: 5,
        idle: 10,
        total: 15
      });
    });

    it('should handle database connection info unavailable', async () => {
      // Mock database pool to be undefined
      mockStrapi.db.connection.pool = undefined;
      
      const usage = await performanceMonitor.trackResourceUsage();
      
      expect(usage.databaseConnections).toBeUndefined();
    });

    it('should maintain resource usage history', async () => {
      await performanceMonitor.trackResourceUsage();
      await performanceMonitor.trackResourceUsage();
      await performanceMonitor.trackResourceUsage();
      
      // Check that history is maintained (we can't directly access it, but we can test through reports)
      const report = await performanceMonitor.getPerformanceReport({
        from: new Date(Date.now() - 3600000), // 1 hour ago
        to: new Date()
      });
      
      expect(report.summary.resourceUsage).toBeDefined();
      expect(report.summary.resourceUsage.avgMemory).toBeGreaterThan(0);
    });
  });

  describe('System Health Monitoring', () => {
    it('should check database health', async () => {
      mockStrapi.db.connection.raw.mockResolvedValue([]);
      
      const health = await performanceMonitor.getSystemHealth();
      
      expect(health.overall).toBeDefined();
      expect(health.components).toContainEqual(
        expect.objectContaining({
          name: 'database',
          status: HealthStatus.HEALTHY,
          metrics: expect.objectContaining({
            responseTime: expect.any(Number),
            availability: 100
          })
        })
      );
    });

    it('should detect unhealthy database', async () => {
      mockStrapi.db.connection.raw.mockRejectedValue(new Error('Connection failed'));
      
      const health = await performanceMonitor.getSystemHealth();
      
      const dbComponent = health.components.find(c => c.name === 'database');
      expect(dbComponent).toMatchObject({
        name: 'database',
        status: HealthStatus.UNHEALTHY,
        metrics: {
          availability: 0,
          errorRate: 100
        },
        message: 'Database connection failed'
      });
    });

    it('should check memory health', async () => {
      const health = await performanceMonitor.getSystemHealth();
      
      const memoryComponent = health.components.find(c => c.name === 'memory');
      expect(memoryComponent).toMatchObject({
        name: 'memory',
        status: HealthStatus.HEALTHY, // 50% usage should be healthy
        metrics: {
          customMetrics: {
            usagePercentage: 50, // 100MB used / 200MB total
            usedMB: expect.any(Number),
            totalMB: expect.any(Number)
          }
        }
      });
    });

    it('should detect degraded memory health', async () => {
      // Mock high memory usage
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 180 * 1024 * 1024, // 180MB
        heapTotal: 200 * 1024 * 1024, // 200MB (90% usage)
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
        rss: 200 * 1024 * 1024
      });

      const health = await performanceMonitor.getSystemHealth();
      
      const memoryComponent = health.components.find(c => c.name === 'memory');
      expect(memoryComponent?.status).toBe(HealthStatus.UNHEALTHY); // 90% > 90% threshold
    });

    it('should check CPU health', async () => {
      const health = await performanceMonitor.getSystemHealth();
      
      const cpuComponent = health.components.find(c => c.name === 'cpu');
      expect(cpuComponent).toMatchObject({
        name: 'cpu',
        status: expect.any(String),
        metrics: {
          customMetrics: {
            usagePercentage: expect.any(Number),
            loadAverage1m: expect.any(Number),
            loadAverage5m: expect.any(Number),
            loadAverage15m: expect.any(Number)
          }
        }
      });
    });

    it('should check queue health when available', async () => {
      const mockQueueManager = {
        getQueueStatus: jest.fn().mockReturnValue({
          pendingJobs: 25,
          processingJobs: 3,
          failedJobs: 1
        })
      };
      
      mockStrapi.service.mockReturnValue(mockQueueManager);
      
      const health = await performanceMonitor.getSystemHealth();
      
      const queueComponent = health.components.find(c => c.name === 'queue');
      expect(queueComponent).toMatchObject({
        name: 'queue',
        status: HealthStatus.HEALTHY, // 25 pending jobs < 50 threshold
        metrics: {
          customMetrics: {
            pendingJobs: 25,
            processingJobs: 3,
            failedJobs: 1
          }
        }
      });
    });

    it('should determine overall health status', async () => {
      // Mock unhealthy database
      mockStrapi.db.connection.raw.mockRejectedValue(new Error('DB down'));
      
      const health = await performanceMonitor.getSystemHealth();
      
      expect(health.overall).toBe(HealthStatus.UNHEALTHY);
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should log health checks', async () => {
      const logHealthCheckSpy = jest.spyOn(logger, 'logHealthCheck');
      
      await performanceMonitor.getSystemHealth();
      
      expect(logHealthCheckSpy).toHaveBeenCalledWith(
        'system',
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Performance Reporting', () => {
    it('should generate performance report', async () => {
      // Create some tracked operations
      const tracker1 = performanceMonitor.startOperation('operation_1');
      await new Promise(resolve => setTimeout(resolve, 50));
      tracker1.finish(true);
      
      const tracker2 = performanceMonitor.startOperation('operation_2');
      await new Promise(resolve => setTimeout(resolve, 100));
      tracker2.finish(true);
      
      const tracker3 = performanceMonitor.startOperation('operation_1'); // Same operation name
      await new Promise(resolve => setTimeout(resolve, 75));
      tracker3.finish(true);
      
      // Track some resource usage
      await performanceMonitor.trackResourceUsage();
      
      const timeRange = {
        from: new Date(Date.now() - 3600000), // 1 hour ago
        to: new Date()
      };
      
      const report = await performanceMonitor.getPerformanceReport(timeRange);
      
      expect(report.timeRange).toEqual(timeRange);
      expect(report.summary.totalOperations).toBe(3);
      expect(report.summary.averageDuration).toBeGreaterThan(0);
      expect(report.operations).toHaveLength(2); // Two unique operation names
      
      const operation1 = report.operations.find(op => op.name === 'operation_1');
      expect(operation1).toMatchObject({
        name: 'operation_1',
        count: 2,
        averageDuration: expect.any(Number),
        minDuration: expect.any(Number),
        maxDuration: expect.any(Number),
        p95Duration: expect.any(Number),
        p99Duration: expect.any(Number)
      });
    });

    it('should generate alerts in performance report', async () => {
      // Create a slow operation
      const tracker = performanceMonitor.startOperation('slow_operation');
      (tracker as any).startTime = new Date(Date.now() - 6000); // 6 seconds ago (above error threshold)
      tracker.finish();
      
      const report = await performanceMonitor.getPerformanceReport({
        from: new Date(Date.now() - 3600000),
        to: new Date()
      });
      
      expect(report.alerts).toHaveLength(1);
      expect(report.alerts[0]).toMatchObject({
        level: AlertLevel.HIGH,
        type: AlertType.SLOW_OPERATION,
        operation: 'slow_operation',
        value: expect.any(Number),
        threshold: thresholds.duration.error
      });
    });

    it('should generate performance trends', async () => {
      // Create multiple operations to establish a trend
      for (let i = 0; i < 15; i++) {
        const tracker = performanceMonitor.startOperation('trending_operation');
        // Simulate increasing duration (degrading trend)
        (tracker as any).startTime = new Date(Date.now() - (100 + i * 10));
        tracker.finish();
      }
      
      const report = await performanceMonitor.getPerformanceReport({
        from: new Date(Date.now() - 3600000),
        to: new Date()
      });
      
      expect(report.trends).toHaveLength(1);
      expect(report.trends[0]).toMatchObject({
        metric: 'average_duration',
        trend: TrendDirection.DEGRADING,
        changePercentage: expect.any(Number),
        timePoints: expect.any(Array)
      });
    });

    it('should handle empty performance data', async () => {
      const report = await performanceMonitor.getPerformanceReport({
        from: new Date(Date.now() - 3600000),
        to: new Date()
      });
      
      expect(report.summary.totalOperations).toBe(0);
      expect(report.summary.averageDuration).toBe(0);
      expect(report.operations).toHaveLength(0);
      expect(report.alerts).toHaveLength(0);
      expect(report.trends).toHaveLength(0);
    });
  });

  describe('Monitoring Control', () => {
    it('should start and stop monitoring', () => {
      expect(performanceMonitor.startMonitoring).not.toThrow();
      expect(performanceMonitor.stopMonitoring).not.toThrow();
    });

    it('should not start monitoring twice', () => {
      performanceMonitor.startMonitoring();
      
      // Starting again should not throw or create duplicate intervals
      expect(() => performanceMonitor.startMonitoring()).not.toThrow();
      
      performanceMonitor.stopMonitoring();
    });

    it('should handle monitoring errors gracefully', async () => {
      const logAlertSpy = jest.spyOn(logger, 'logAlert');
      
      // Mock trackResourceUsage to throw an error
      jest.spyOn(performanceMonitor, 'trackResourceUsage').mockRejectedValue(new Error('Monitoring error'));
      
      performanceMonitor.startMonitoring();
      
      // Wait for monitoring interval to trigger
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(logAlertSpy).toHaveBeenCalledWith(
        AlertLevel.MEDIUM,
        'Performance monitoring error',
        expect.objectContaining({
          error: 'Monitoring error'
        })
      );
      
      performanceMonitor.stopMonitoring();
    });
  });

  describe('Threshold Management', () => {
    it('should update thresholds', () => {
      const newThresholds: PerformanceThresholds = {
        duration: { warning: 2000, error: 10000 },
        memory: { warning: 200 * 1024 * 1024, error: 1024 * 1024 * 1024 },
        cpu: { warning: 80, error: 95 }
      };
      
      performanceMonitor.setThresholds(newThresholds);
      
      // Test that new thresholds are applied
      const tracker = performanceMonitor.startOperation('threshold_test');
      (tracker as any).startTime = new Date(Date.now() - 1500); // 1.5 seconds (below new warning threshold)
      
      const logAlertSpy = jest.spyOn(logger, 'logAlert');
      tracker.finish();
      
      // Should not alert because 1.5s < 2s warning threshold
      expect(logAlertSpy).not.toHaveBeenCalled();
    });
  });

  describe('Memory Management', () => {
    it('should limit history size', async () => {
      // Create many operations to test history limiting
      for (let i = 0; i < 1200; i++) {
        const tracker = performanceMonitor.startOperation(`operation_${i}`);
        tracker.finish();
      }
      
      // Also create many resource usage entries
      for (let i = 0; i < 1200; i++) {
        await performanceMonitor.trackResourceUsage();
      }
      
      const report = await performanceMonitor.getPerformanceReport({
        from: new Date(Date.now() - 3600000),
        to: new Date()
      });
      
      // Should be limited to 1000 entries
      expect(report.summary.totalOperations).toBeLessThanOrEqual(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle process.memoryUsage errors', async () => {
      process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory usage unavailable');
      });
      
      await expect(performanceMonitor.trackResourceUsage()).rejects.toThrow('Memory usage unavailable');
    });

    it('should handle invalid operation names', () => {
      expect(() => performanceMonitor.startOperation('')).not.toThrow();
      expect(() => performanceMonitor.startOperation(null as any)).not.toThrow();
    });
  });
});