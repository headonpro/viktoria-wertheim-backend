/**
 * Health Check Service Tests
 * Tests for comprehensive health monitoring functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { createHealthCheckService, HealthCheckServiceImpl, HealthStatus } from '../../../../src/api/tabellen-eintrag/services/health-check';
import { createAutomationLogger } from '../../../../src/api/tabellen-eintrag/services/logger';
import { createPerformanceMonitor } from '../../../../src/api/tabellen-eintrag/services/performance-monitor';

// Mock Strapi
const mockStrapi = {
  db: {
    connection: {
      raw: vi.fn(),
      pool: {
        numUsed: vi.fn(() => 2),
        numFree: vi.fn(() => 8),
        max: 10
      }
    }
  },
  service: vi.fn(),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
};

global.strapi = mockStrapi as any;

describe('HealthCheckService', () => {
  let healthCheckService: any;
  let mockLogger: any;
  let mockPerformanceMonitor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockLogger = createAutomationLogger();
    mockPerformanceMonitor = createPerformanceMonitor(mockLogger, {
      duration: { warning: 5000, error: 15000 },
      memory: { warning: 100 * 1024 * 1024, error: 500 * 1024 * 1024 },
      cpu: { warning: 70, error: 90 }
    });
    
    healthCheckService = createHealthCheckService(mockLogger, mockPerformanceMonitor);
  });

  afterEach(() => {
    if (healthCheckService.stopMonitoring) {
      healthCheckService.stopMonitoring();
    }
  });

  describe('checkSystemHealth', () => {
    it('should return overall healthy status when all components are healthy', async () => {
      // Mock successful database connection
      mockStrapi.db.connection.raw.mockResolvedValue([{ result: 1 }]);
      
      // Mock queue manager
      mockStrapi.service.mockReturnValue({
        getQueueStatus: () => ({
          pendingJobs: 5,
          processingJobs: 2,
          completedJobs: 100,
          failedJobs: 1,
          isProcessing: true
        })
      });

      const health = await healthCheckService.checkSystemHealth();

      expect(health.overall).toBe(HealthStatus.HEALTHY);
      expect(health.components).toHaveLength(5); // database, memory, cpu, queue, disk
      expect(health.summary.totalComponents).toBe(5);
      expect(health.summary.healthyComponents).toBeGreaterThan(0);
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should return degraded status when some components are degraded', async () => {
      // Mock slow database response
      mockStrapi.db.connection.raw.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ result: 1 }]), 2000))
      );

      const health = await healthCheckService.checkSystemHealth();

      expect(health.overall).toBe(HealthStatus.DEGRADED);
      expect(health.summary.degradedComponents).toBeGreaterThan(0);
    });

    it('should return unhealthy status when components fail', async () => {
      // Mock database connection failure
      mockStrapi.db.connection.raw.mockRejectedValue(new Error('Connection failed'));

      const health = await healthCheckService.checkSystemHealth();

      expect(health.overall).toBe(HealthStatus.UNHEALTHY);
      expect(health.summary.unhealthyComponents).toBeGreaterThan(0);
      expect(health.summary.criticalIssues.length).toBeGreaterThan(0);
    });

    it('should include component metrics in health report', async () => {
      mockStrapi.db.connection.raw.mockResolvedValue([{ result: 1 }]);

      const health = await healthCheckService.checkSystemHealth();

      const memoryComponent = health.components.find(c => c.name === 'memory');
      expect(memoryComponent).toBeDefined();
      expect(memoryComponent.metrics).toHaveProperty('usagePercentage');
      expect(memoryComponent.metrics).toHaveProperty('usedMB');
      expect(memoryComponent.metrics).toHaveProperty('totalMB');
    });
  });

  describe('checkComponent', () => {
    it('should check individual component health', async () => {
      mockStrapi.db.connection.raw.mockResolvedValue([{ result: 1 }]);

      const componentHealth = await healthCheckService.checkComponent('database');

      expect(componentHealth.name).toBe('database');
      expect(componentHealth.status).toBe(HealthStatus.HEALTHY);
      expect(componentHealth.responseTime).toBeGreaterThan(0);
      expect(componentHealth.lastCheck).toBeInstanceOf(Date);
      expect(componentHealth.metrics).toHaveProperty('responseTime');
    });

    it('should throw error for non-existent component', async () => {
      await expect(healthCheckService.checkComponent('nonexistent'))
        .rejects.toThrow('Health check not found for component: nonexistent');
    });

    it('should handle component timeout', async () => {
      // Mock a very slow response that will timeout
      mockStrapi.db.connection.raw.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 15000))
      );

      const componentHealth = await healthCheckService.checkComponent('database');

      expect(componentHealth.status).toBe(HealthStatus.UNHEALTHY);
      expect(componentHealth.message).toContain('timeout');
    });
  });

  describe('registerHealthCheck', () => {
    it('should register custom health check', async () => {
      const customCheck = vi.fn().mockResolvedValue({
        status: HealthStatus.HEALTHY,
        message: 'Custom service is healthy',
        metrics: { customMetric: 42 }
      });

      healthCheckService.registerHealthCheck('custom', customCheck);

      const componentHealth = await healthCheckService.checkComponent('custom');

      expect(customCheck).toHaveBeenCalled();
      expect(componentHealth.name).toBe('custom');
      expect(componentHealth.status).toBe(HealthStatus.HEALTHY);
      expect(componentHealth.message).toBe('Custom service is healthy');
      expect(componentHealth.metrics.customMetric).toBe(42);
    });

    it('should unregister health check', async () => {
      const customCheck = vi.fn().mockResolvedValue({
        status: HealthStatus.HEALTHY
      });

      healthCheckService.registerHealthCheck('custom', customCheck);
      healthCheckService.unregisterHealthCheck('custom');

      await expect(healthCheckService.checkComponent('custom'))
        .rejects.toThrow('Health check not found for component: custom');
    });
  });

  describe('getHealthHistory', () => {
    it('should return health history for all components', async () => {
      mockStrapi.db.connection.raw.mockResolvedValue([{ result: 1 }]);

      // Trigger some health checks to create history
      await healthCheckService.checkSystemHealth();
      await healthCheckService.checkSystemHealth();

      const history = await healthCheckService.getHealthHistory();

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('component');
      expect(history[0]).toHaveProperty('status');
      expect(history[0]).toHaveProperty('responseTime');
    });

    it('should filter health history by component', async () => {
      mockStrapi.db.connection.raw.mockResolvedValue([{ result: 1 }]);

      await healthCheckService.checkComponent('database');
      await healthCheckService.checkComponent('memory');

      const databaseHistory = await healthCheckService.getHealthHistory('database');

      expect(databaseHistory.every(entry => entry.component === 'database')).toBe(true);
    });

    it('should filter health history by time range', async () => {
      mockStrapi.db.connection.raw.mockResolvedValue([{ result: 1 }]);

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);

      await healthCheckService.checkSystemHealth();

      const history = await healthCheckService.getHealthHistory(undefined, {
        from: oneHourAgo,
        to: now
      });

      expect(history.every(entry => 
        entry.timestamp >= oneHourAgo && entry.timestamp <= now
      )).toBe(true);
    });
  });

  describe('setHealthThresholds', () => {
    it('should apply custom thresholds to health checks', async () => {
      // Set strict thresholds for database
      healthCheckService.setHealthThresholds('database', {
        responseTime: { warning: 100, error: 200 },
        availability: { warning: 99, error: 95 }
      });

      // Mock a response that would normally be healthy but exceeds our strict threshold
      mockStrapi.db.connection.raw.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([{ result: 1 }]), 150))
      );

      const componentHealth = await healthCheckService.checkComponent('database');

      expect(componentHealth.status).toBe(HealthStatus.DEGRADED);
      expect(componentHealth.message).toContain('warning threshold');
    });
  });

  describe('monitoring', () => {
    it('should start and stop monitoring', () => {
      expect(() => healthCheckService.startMonitoring(1000)).not.toThrow();
      expect(() => healthCheckService.stopMonitoring()).not.toThrow();
    });

    it('should not start monitoring if already running', () => {
      healthCheckService.startMonitoring(1000);
      
      // Starting again should not throw or create duplicate intervals
      expect(() => healthCheckService.startMonitoring(1000)).not.toThrow();
      
      healthCheckService.stopMonitoring();
    });
  });

  describe('default health checks', () => {
    describe('database health check', () => {
      it('should report healthy for fast database response', async () => {
        mockStrapi.db.connection.raw.mockResolvedValue([{ result: 1 }]);

        const health = await healthCheckService.checkComponent('database');

        expect(health.status).toBe(HealthStatus.HEALTHY);
        expect(health.metrics).toHaveProperty('responseTime');
        expect(health.metrics).toHaveProperty('activeConnections');
        expect(health.metrics).toHaveProperty('idleConnections');
      });

      it('should report degraded for slow database response', async () => {
        mockStrapi.db.connection.raw.mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve([{ result: 1 }]), 2000))
        );

        const health = await healthCheckService.checkComponent('database');

        expect(health.status).toBe(HealthStatus.DEGRADED);
        expect(health.responseTime).toBeGreaterThan(1000);
      });

      it('should report unhealthy for database connection failure', async () => {
        mockStrapi.db.connection.raw.mockRejectedValue(new Error('Connection failed'));

        const health = await healthCheckService.checkComponent('database');

        expect(health.status).toBe(HealthStatus.UNHEALTHY);
        expect(health.message).toContain('Connection failed');
      });
    });

    describe('memory health check', () => {
      it('should report memory usage metrics', async () => {
        const health = await healthCheckService.checkComponent('memory');

        expect(health.metrics).toHaveProperty('usedMB');
        expect(health.metrics).toHaveProperty('totalMB');
        expect(health.metrics).toHaveProperty('percentage');
        expect(health.metrics).toHaveProperty('rss');
        expect(health.metrics).toHaveProperty('external');
      });

      it('should determine status based on memory usage percentage', async () => {
        const health = await healthCheckService.checkComponent('memory');

        // Memory status should be determined by percentage
        if (health.metrics.percentage < 70) {
          expect(health.status).toBe(HealthStatus.HEALTHY);
        } else if (health.metrics.percentage < 90) {
          expect(health.status).toBe(HealthStatus.DEGRADED);
        } else {
          expect(health.status).toBe(HealthStatus.UNHEALTHY);
        }
      });
    });

    describe('cpu health check', () => {
      it('should report cpu usage metrics', async () => {
        const health = await healthCheckService.checkComponent('cpu');

        expect(health.metrics).toHaveProperty('loadPercentage');
        expect(health.metrics).toHaveProperty('load1m');
        expect(health.metrics).toHaveProperty('load5m');
        expect(health.metrics).toHaveProperty('load15m');
        expect(health.metrics).toHaveProperty('cpuCount');
      });
    });

    describe('queue health check', () => {
      it('should report healthy queue status', async () => {
        mockStrapi.service.mockReturnValue({
          getQueueStatus: () => ({
            pendingJobs: 5,
            processingJobs: 2,
            completedJobs: 100,
            failedJobs: 1,
            isProcessing: true
          })
        });

        const health = await healthCheckService.checkComponent('queue');

        expect(health.status).toBe(HealthStatus.HEALTHY);
        expect(health.metrics).toHaveProperty('pendingJobs');
        expect(health.metrics).toHaveProperty('processingJobs');
        expect(health.metrics).toHaveProperty('failedJobs');
        expect(health.metrics.pendingJobs).toBe(5);
      });

      it('should report degraded for moderate queue load', async () => {
        mockStrapi.service.mockReturnValue({
          getQueueStatus: () => ({
            pendingJobs: 30,
            processingJobs: 5,
            completedJobs: 100,
            failedJobs: 10,
            isProcessing: true
          })
        });

        const health = await healthCheckService.checkComponent('queue');

        expect(health.status).toBe(HealthStatus.DEGRADED);
      });

      it('should report unhealthy for queue overload', async () => {
        mockStrapi.service.mockReturnValue({
          getQueueStatus: () => ({
            pendingJobs: 80,
            processingJobs: 10,
            completedJobs: 100,
            failedJobs: 30,
            isProcessing: true
          })
        });

        const health = await healthCheckService.checkComponent('queue');

        expect(health.status).toBe(HealthStatus.UNHEALTHY);
      });

      it('should report unhealthy when queue service is unavailable', async () => {
        mockStrapi.service.mockImplementation(() => {
          throw new Error('Queue service not available');
        });

        const health = await healthCheckService.checkComponent('queue');

        expect(health.status).toBe(HealthStatus.UNHEALTHY);
        expect(health.message).toContain('Queue service unavailable');
      });
    });
  });

  describe('error handling', () => {
    it('should handle health check function errors gracefully', async () => {
      const failingCheck = vi.fn().mockRejectedValue(new Error('Health check failed'));
      
      healthCheckService.registerHealthCheck('failing', failingCheck);

      const health = await healthCheckService.checkComponent('failing');

      expect(health.status).toBe(HealthStatus.UNHEALTHY);
      expect(health.message).toContain('Health check failed');
      expect(health.details).toHaveProperty('error');
    });

    it('should handle system health check with some failing components', async () => {
      // Mock database failure
      mockStrapi.db.connection.raw.mockRejectedValue(new Error('DB Error'));
      
      // Mock queue service failure
      mockStrapi.service.mockImplementation(() => {
        throw new Error('Queue Error');
      });

      const health = await healthCheckService.checkSystemHealth();

      expect(health.overall).toBe(HealthStatus.UNHEALTHY);
      expect(health.summary.unhealthyComponents).toBeGreaterThan(0);
      expect(health.summary.criticalIssues.length).toBeGreaterThan(0);
    });
  });
});