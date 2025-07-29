/**
 * Monitoring Controller Integration Tests
 * Tests for monitoring API endpoints and system integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { setupStrapi, cleanupStrapi } from '../../../helpers/strapi';

describe('Monitoring Controller Integration', () => {
  let strapi: any;
  let agent: any;

  beforeAll(async () => {
    strapi = await setupStrapi();
    agent = request.agent(strapi.server.httpServer);
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/tabellen-eintraege/monitoring/health', () => {
    it('should return system health status', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/health')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('overall');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('components');
      expect(response.body.data).toHaveProperty('summary');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.data.overall);
      expect(Array.isArray(response.body.data.components)).toBe(true);
      expect(response.body.data.summary).toHaveProperty('totalComponents');
      expect(response.body.data.summary).toHaveProperty('healthyComponents');
    });

    it('should include component details in health response', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/health')
        .expect(200);

      const components = response.body.data.components;
      expect(components.length).toBeGreaterThan(0);

      const component = components[0];
      expect(component).toHaveProperty('name');
      expect(component).toHaveProperty('status');
      expect(component).toHaveProperty('responseTime');
      expect(component).toHaveProperty('lastCheck');
      expect(component).toHaveProperty('metrics');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(component.status);
      expect(typeof component.responseTime).toBe('number');
      expect(typeof component.metrics).toBe('object');
    });

    it('should require admin authentication', async () => {
      // Test without authentication
      await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege/monitoring/health')
        .expect(401);
    });
  });

  describe('GET /api/tabellen-eintraege/monitoring/health/:component', () => {
    it('should return specific component health', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/health/database')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', 'database');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('responseTime');
      expect(response.body.data).toHaveProperty('lastCheck');
      expect(response.body.data).toHaveProperty('metrics');

      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('component', 'database');
    });

    it('should return 404 for non-existent component', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/health/nonexistent')
        .expect(404);

      expect(response.body.error.message).toContain('Health check not found for component: nonexistent');
    });

    it('should handle component health check failures', async () => {
      // Mock a failing health check
      const healthCheckService = strapi.service('api::tabellen-eintrag.health-check');
      const originalCheck = healthCheckService.checkComponent;
      
      healthCheckService.checkComponent = vi.fn().mockRejectedValue(new Error('Component check failed'));

      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/health/database')
        .expect(500);

      expect(response.body.error.message).toContain('Failed to retrieve component health');

      // Restore original method
      healthCheckService.checkComponent = originalCheck;
    });
  });

  describe('POST /api/tabellen-eintraege/monitoring/health-check/:component', () => {
    it('should trigger manual health check', async () => {
      const response = await agent
        .post('/api/tabellen-eintraege/monitoring/health-check/database')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', 'database');
      expect(response.body.data).toHaveProperty('status');

      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('triggered', true);
      expect(response.body.meta).toHaveProperty('component', 'database');
    });
  });

  describe('GET /api/tabellen-eintraege/monitoring/performance', () => {
    it('should return performance metrics with default time range', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/performance')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('timeRange');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('operations');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('trends');

      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('timeRange', '1h');
    });

    it('should accept custom time range', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/performance?timeRange=24h')
        .expect(200);

      expect(response.body.meta).toHaveProperty('timeRange', '24h');
      expect(response.body.data.timeRange).toHaveProperty('from');
      expect(response.body.data.timeRange).toHaveProperty('to');
    });

    it('should include performance summary', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/performance')
        .expect(200);

      const summary = response.body.data.summary;
      expect(summary).toHaveProperty('totalOperations');
      expect(summary).toHaveProperty('averageDuration');
      expect(summary).toHaveProperty('successRate');
      expect(summary).toHaveProperty('errorRate');
      expect(summary).toHaveProperty('slowOperations');
      expect(summary).toHaveProperty('resourceUsage');

      expect(typeof summary.totalOperations).toBe('number');
      expect(typeof summary.averageDuration).toBe('number');
      expect(typeof summary.resourceUsage).toBe('object');
    });
  });

  describe('GET /api/tabellen-eintraege/monitoring/metrics', () => {
    it('should return Prometheus metrics format', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/metrics')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(typeof response.text).toBe('string');
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
      expect(response.text).toContain('tabellen_');
    });

    it('should include process metrics', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/metrics')
        .expect(200);

      expect(response.text).toContain('tabellen_process_start_time_seconds');
      expect(response.text).toContain('tabellen_process_uptime_seconds');
    });

    it('should not require authentication for metrics endpoint', async () => {
      await request(strapi.server.httpServer)
        .get('/api/tabellen-eintraege/monitoring/metrics')
        .expect(200);
    });
  });

  describe('GET /api/tabellen-eintraege/monitoring/metrics/:component', () => {
    it('should return component-specific metrics', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/metrics/database')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('component="database"');
    });
  });

  describe('POST /api/tabellen-eintraege/monitoring/reset-metrics', () => {
    it('should reset all metrics', async () => {
      const response = await agent
        .post('/api/tabellen-eintraege/monitoring/reset-metrics')
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('component', 'all');
      expect(response.body.data).toHaveProperty('resetAt');
    });

    it('should reset component-specific metrics', async () => {
      const response = await agent
        .post('/api/tabellen-eintraege/monitoring/reset-metrics')
        .send({ component: 'database' })
        .expect(200);

      expect(response.body.data).toHaveProperty('component', 'database');
    });
  });

  describe('GET /api/tabellen-eintraege/monitoring/alerts', () => {
    it('should return active alerts by default', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/alerts')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta.filters).toHaveProperty('status', 'active');
    });

    it('should filter alerts by severity', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/alerts?severity=high')
        .expect(200);

      expect(response.body.meta.filters).toHaveProperty('severity', 'high');
    });

    it('should filter alerts by component', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/alerts?component=database')
        .expect(200);

      expect(response.body.meta.filters).toHaveProperty('component', 'database');
    });

    it('should limit number of returned alerts', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/alerts?limit=10')
        .expect(200);

      expect(response.body.meta.filters).toHaveProperty('limit', 10);
    });
  });

  describe('POST /api/tabellen-eintraege/monitoring/alerts/:alertId/resolve', () => {
    it('should resolve an alert', async () => {
      // First create an alert
      const alertingService = strapi.service('api::tabellen-eintrag.alerting');
      const alertId = await alertingService.createAlert({
        title: 'Test Alert',
        description: 'Test alert for resolution',
        severity: 'medium',
        component: 'test'
      });

      const response = await agent
        .post(`/api/tabellen-eintraege/monitoring/alerts/${alertId}/resolve`)
        .send({ resolution: 'Resolved via API test' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('alertId', alertId);
      expect(response.body.data).toHaveProperty('resolution', 'Resolved via API test');
    });

    it('should return 404 for non-existent alert', async () => {
      const response = await agent
        .post('/api/tabellen-eintraege/monitoring/alerts/non-existent/resolve')
        .send({ resolution: 'Test resolution' })
        .expect(404);

      expect(response.body.error.message).toContain('Alert not found: non-existent');
    });
  });

  describe('POST /api/tabellen-eintraege/monitoring/alerts/suppress', () => {
    it('should suppress alerts matching pattern', async () => {
      const response = await agent
        .post('/api/tabellen-eintraege/monitoring/alerts/suppress')
        .send({ 
          pattern: 'database',
          duration: 3600 // 1 hour
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('pattern', 'database');
      expect(response.body.data).toHaveProperty('duration', 3600);
      expect(response.body.data).toHaveProperty('suppressedAt');
      expect(response.body.data).toHaveProperty('expiresAt');
    });

    it('should require pattern for suppression', async () => {
      const response = await agent
        .post('/api/tabellen-eintraege/monitoring/alerts/suppress')
        .send({ duration: 3600 })
        .expect(400);

      expect(response.body.error.message).toContain('Pattern is required for alert suppression');
    });

    it('should use default duration if not provided', async () => {
      const response = await agent
        .post('/api/tabellen-eintraege/monitoring/alerts/suppress')
        .send({ pattern: 'test' })
        .expect(200);

      expect(response.body.data).toHaveProperty('duration', 3600); // Default 1 hour
    });
  });

  describe('GET /api/tabellen-eintraege/monitoring/export', () => {
    it('should export monitoring data in JSON format', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/export')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('monitoring-export-');

      const exportData = JSON.parse(response.text);
      expect(exportData).toHaveProperty('exportedAt');
      expect(exportData).toHaveProperty('timeRange');
      expect(exportData).toHaveProperty('data');
    });

    it('should include health data in export', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/export?includeHealth=true')
        .expect(200);

      const exportData = JSON.parse(response.text);
      expect(exportData.data).toHaveProperty('health');
      expect(exportData.data).toHaveProperty('healthHistory');
    });

    it('should include performance metrics in export', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/export?includeMetrics=true')
        .expect(200);

      const exportData = JSON.parse(response.text);
      expect(exportData.data).toHaveProperty('performance');
    });

    it('should include alerts in export', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/export?includeAlerts=true')
        .expect(200);

      const exportData = JSON.parse(response.text);
      expect(exportData.data).toHaveProperty('alerts');
    });

    it('should support different time ranges for export', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/export?timeRange=7d')
        .expect(200);

      const exportData = JSON.parse(response.text);
      expect(exportData).toHaveProperty('timeRange', '7d');
    });

    it('should reject unsupported export formats', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/export?format=xml')
        .expect(400);

      expect(response.body.error.message).toContain('Unsupported export format');
    });
  });

  describe('GET /api/tabellen-eintraege/monitoring/config', () => {
    it('should return monitoring configuration', async () => {
      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/config')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('healthChecks');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data).toHaveProperty('alerts');
      expect(response.body.data).toHaveProperty('performance');

      expect(response.body.data.healthChecks).toHaveProperty('enabled');
      expect(response.body.data.healthChecks).toHaveProperty('interval');
      expect(response.body.data.healthChecks).toHaveProperty('timeout');
    });
  });

  describe('PUT /api/tabellen-eintraege/monitoring/config', () => {
    it('should update monitoring configuration', async () => {
      const updates = {
        healthChecks: {
          enabled: true,
          interval: 60000
        },
        alerts: {
          enabled: true,
          escalationEnabled: false
        }
      };

      const response = await agent
        .put('/api/tabellen-eintraege/monitoring/config')
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('updatedAt');
      expect(response.body.data).toHaveProperty('updates');
      expect(response.body.data.updates).toEqual(updates);
    });
  });

  describe('error handling', () => {
    it('should handle service initialization errors', async () => {
      // Mock service failure
      const originalService = strapi.service;
      strapi.service = vi.fn().mockImplementation((name) => {
        if (name === 'api::tabellen-eintrag.health-check') {
          throw new Error('Service initialization failed');
        }
        return originalService(name);
      });

      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/health')
        .expect(500);

      expect(response.body.error.message).toContain('Failed to retrieve system health');

      // Restore original service
      strapi.service = originalService;
    });

    it('should handle malformed request bodies', async () => {
      const response = await agent
        .post('/api/tabellen-eintraege/monitoring/alerts/suppress')
        .send('invalid json')
        .expect(400);
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const originalRaw = strapi.db.connection.raw;
      strapi.db.connection.raw = vi.fn().mockRejectedValue(new Error('Database connection failed'));

      const response = await agent
        .get('/api/tabellen-eintraege/monitoring/health/database')
        .expect(200);

      // Should still return a response, but with unhealthy status
      expect(response.body.data.status).toBe('unhealthy');

      // Restore original method
      strapi.db.connection.raw = originalRaw;
    });
  });

  describe('performance', () => {
    it('should respond to health checks within reasonable time', async () => {
      const startTime = Date.now();
      
      await agent
        .get('/api/tabellen-eintraege/monitoring/health')
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should respond within 5 seconds
    });

    it('should handle concurrent health check requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          agent
            .get('/api/tabellen-eintraege/monitoring/health')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('overall');
      });
    });
  });
});