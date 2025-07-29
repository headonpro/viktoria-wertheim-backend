/**
 * Performance and Load Testing for Club System Deployment
 * 
 * Validates system performance under realistic load conditions
 * and ensures the club system meets performance requirements.
 */

const { test, expect } = require('@playwright/test');

// Performance test configuration
const PERFORMANCE_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:1337',
  frontendURL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Performance thresholds
  thresholds: {
    apiResponseTime: 1000,      // API responses should be < 1 second
    pageLoadTime: 3000,         // Page loads should be < 3 seconds
    databaseQueryTime: 500,     // DB queries should be < 500ms
    memoryUsage: 0.8,          // Memory usage should be < 80%
    cpuUsage: 0.7,             // CPU usage should be < 70%
  },
  
  // Load testing parameters
  load: {
    concurrentUsers: 10,
    requestsPerUser: 20,
    testDuration: 60000,        // 1 minute
  }
};

test.describe('Performance and Load Validation', () => {
  
  test.describe('API Performance Testing', () => {
    test('should validate club API performance under normal load', async ({ request }) => {
      const endpoints = [
        '/api/clubs',
        '/api/clubs?populate=*',
        '/api/clubs?filters[club_typ][$eq]=viktoria_verein',
        '/api/clubs?populate[ligen]=*&populate[spiele_heim]=*',
      ];
      
      const results = [];
      
      for (const endpoint of endpoints) {
        const measurements = [];
        
        // Run multiple requests to get average
        for (let i = 0; i < 10; i++) {
          const startTime = Date.now();
          const response = await request.get(`${PERFORMANCE_CONFIG.baseURL}${endpoint}`);
          const responseTime = Date.now() - startTime;
          
          expect(response.ok()).toBeTruthy();
          measurements.push(responseTime);
        }
        
        const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
        const maxResponseTime = Math.max(...measurements);
        
        results.push({
          endpoint,
          avgResponseTime,
          maxResponseTime,
          measurements
        });
        
        // Validate performance thresholds
        expect(avgResponseTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.apiResponseTime);
        expect(maxResponseTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.apiResponseTime * 2);
        
        console.log(`${endpoint}: avg=${avgResponseTime}ms, max=${maxResponseTime}ms`);
      }
    });

    test('should validate spiele API performance with club relations', async ({ request }) => {
      const spieleEndpoints = [
        '/api/spiele?populate[heim_club]=*&populate[gast_club]=*',
        '/api/spiele?populate[heim_club][populate]=*&populate[gast_club][populate]=*',
        '/api/spiele?filters[datum][$gte]=2024-01-01&populate=*',
      ];
      
      for (const endpoint of spieleEndpoints) {
        const startTime = Date.now();
        const response = await request.get(`${PERFORMANCE_CONFIG.baseURL}${endpoint}`);
        const responseTime = Date.now() - startTime;
        
        expect(response.ok()).toBeTruthy();
        expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.apiResponseTime * 1.5);
        
        // Validate response structure
        const data = await response.json();
        expect(data.data).toBeDefined();
        expect(Array.isArray(data.data)).toBeTruthy();
        
        console.log(`Spiele endpoint ${endpoint}: ${responseTime}ms`);
      }
    });

    test('should validate tabellen-eintrag API performance with club data', async ({ request }) => {
      const tabellenEndpoints = [
        '/api/tabellen-eintraege?populate[club]=*',
        '/api/tabellen-eintraege?populate[club][populate]=*',
        '/api/tabellen-eintraege?filters[liga][id][$eq]=1&populate=*',
      ];
      
      for (const endpoint of tabellenEndpoints) {
        const startTime = Date.now();
        const response = await request.get(`${PERFORMANCE_CONFIG.baseURL}${endpoint}`);
        const responseTime = Date.now() - startTime;
        
        expect(response.ok()).toBeTruthy();
        expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.apiResponseTime);
        
        console.log(`Tabellen endpoint ${endpoint}: ${responseTime}ms`);
      }
    });
  });

  test.describe('Database Performance Testing', () => {
    test('should validate complex club queries performance', async ({ request }) => {
      // Test complex queries that join multiple tables
      const complexQueries = [
        // Club with all relations
        '/api/clubs?populate[ligen][populate]=*&populate[spiele_heim][populate]=*&populate[spiele_gast][populate]=*&populate[tabellen_eintraege][populate]=*',
        
        // Liga with all clubs and their games
        '/api/ligen?populate[clubs][populate][spiele_heim]=*&populate[clubs][populate][spiele_gast]=*',
        
        // Games with full club and liga data
        '/api/spiele?populate[heim_club][populate][ligen]=*&populate[gast_club][populate][ligen]=*&populate[liga]=*',
      ];
      
      for (const query of complexQueries) {
        const startTime = Date.now();
        const response = await request.get(`${PERFORMANCE_CONFIG.baseURL}${query}`);
        const responseTime = Date.now() - startTime;
        
        expect(response.ok()).toBeTruthy();
        expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.databaseQueryTime * 6); // Allow more time for complex queries
        
        console.log(`Complex query: ${responseTime}ms`);
      }
    });

    test('should validate pagination performance', async ({ request }) => {
      const paginationSizes = [10, 25, 50, 100];
      
      for (const pageSize of paginationSizes) {
        const startTime = Date.now();
        const response = await request.get(
          `${PERFORMANCE_CONFIG.baseURL}/api/clubs?pagination[pageSize]=${pageSize}&populate=*`
        );
        const responseTime = Date.now() - startTime;
        
        expect(response.ok()).toBeTruthy();
        expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.apiResponseTime * 2);
        
        const data = await response.json();
        expect(data.data.length).toBeLessThanOrEqual(pageSize);
        
        console.log(`Pagination ${pageSize} items: ${responseTime}ms`);
      }
    });

    test('should validate filtering performance', async ({ request }) => {
      const filters = [
        'filters[club_typ][$eq]=viktoria_verein',
        'filters[name][$contains]=Viktoria',
        'filters[ligen][name][$contains]=Kreisliga',
        'filters[created_at][$gte]=2024-01-01',
      ];
      
      for (const filter of filters) {
        const startTime = Date.now();
        const response = await request.get(
          `${PERFORMANCE_CONFIG.baseURL}/api/clubs?${filter}&populate=*`
        );
        const responseTime = Date.now() - startTime;
        
        expect(response.ok()).toBeTruthy();
        expect(responseTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.apiResponseTime);
        
        console.log(`Filter ${filter}: ${responseTime}ms`);
      }
    });
  });

  test.describe('Frontend Performance Testing', () => {
    test('should validate homepage performance with club data', async ({ page }) => {
      // Enable performance monitoring
      await page.goto(PERFORMANCE_CONFIG.frontendURL);
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');
      
      // Measure performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paintEntries = performance.getEntriesByType('paint');
        
        return {
          // Navigation timing
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          
          // Paint timing
          firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
          
          // Resource timing
          totalResources: performance.getEntriesByType('resource').length,
          
          // Memory usage (if available)
          memoryUsage: performance.memory ? {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          } : null
        };
      });
      
      // Validate performance thresholds
      expect(performanceMetrics.domContentLoaded).toBeLessThan(2000);
      expect(performanceMetrics.loadComplete).toBeLessThan(PERFORMANCE_CONFIG.thresholds.pageLoadTime);
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500);
      
      console.log('Homepage performance:', performanceMetrics);
    });

    test('should validate league table performance with club logos', async ({ page }) => {
      await page.goto(`${PERFORMANCE_CONFIG.frontendURL}/tabelle`);
      
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="league-table"]', { timeout: 10000 });
      const tableLoadTime = Date.now() - startTime;
      
      expect(tableLoadTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.pageLoadTime);
      
      // Check if club logos are loading efficiently
      const logoElements = page.locator('[data-testid="club-logo"]');
      const logoCount = await logoElements.count();
      
      if (logoCount > 0) {
        // Wait for logos to load
        await page.waitForFunction(() => {
          const logos = document.querySelectorAll('[data-testid="club-logo"]');
          return Array.from(logos).every(logo => logo.complete || logo.naturalWidth > 0);
        }, { timeout: 5000 });
        
        console.log(`League table with ${logoCount} logos loaded in ${tableLoadTime}ms`);
      }
    });

    test('should validate mobile performance', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const startTime = Date.now();
      await page.goto(PERFORMANCE_CONFIG.frontendURL);
      await page.waitForLoadState('networkidle');
      const mobileLoadTime = Date.now() - startTime;
      
      expect(mobileLoadTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.pageLoadTime * 1.2); // Allow 20% more time for mobile
      
      // Test mobile-specific elements
      const mobileTable = page.locator('[data-testid="mobile-league-table"]');
      if (await mobileTable.count() > 0) {
        await expect(mobileTable).toBeVisible();
      }
      
      console.log(`Mobile page load time: ${mobileLoadTime}ms`);
    });
  });

  test.describe('Load Testing', () => {
    test('should handle concurrent API requests', async ({ request }) => {
      const concurrentRequests = 20;
      const endpoint = '/api/clubs?populate=*';
      
      // Create concurrent requests
      const requests = Array.from({ length: concurrentRequests }, () =>
        request.get(`${PERFORMANCE_CONFIG.baseURL}${endpoint}`)
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const totalTime = Date.now() - startTime;
      
      // Validate all requests succeeded
      const successfulResponses = responses.filter(r => r.ok());
      expect(successfulResponses.length).toBe(concurrentRequests);
      
      // Validate average response time
      const avgResponseTime = totalTime / concurrentRequests;
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.apiResponseTime * 2);
      
      console.log(`${concurrentRequests} concurrent requests completed in ${totalTime}ms (avg: ${avgResponseTime}ms)`);
    });

    test('should handle sustained load', async ({ request }) => {
      const testDuration = 30000; // 30 seconds
      const requestInterval = 100; // Request every 100ms
      const endpoint = '/api/clubs';
      
      const startTime = Date.now();
      const results = [];
      
      while (Date.now() - startTime < testDuration) {
        const requestStart = Date.now();
        
        try {
          const response = await request.get(`${PERFORMANCE_CONFIG.baseURL}${endpoint}`);
          const responseTime = Date.now() - requestStart;
          
          results.push({
            success: response.ok(),
            responseTime,
            timestamp: Date.now()
          });
        } catch (error) {
          results.push({
            success: false,
            error: error.message,
            timestamp: Date.now()
          });
        }
        
        // Wait before next request
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }
      
      // Analyze results
      const successfulRequests = results.filter(r => r.success);
      const failedRequests = results.filter(r => !r.success);
      const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
      
      // Validate sustained load performance
      expect(successfulRequests.length).toBeGreaterThan(results.length * 0.95); // 95% success rate
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.apiResponseTime * 1.5);
      
      console.log(`Sustained load test: ${successfulRequests.length}/${results.length} successful (${(successfulRequests.length/results.length*100).toFixed(1)}%)`);
      console.log(`Average response time: ${avgResponseTime.toFixed(0)}ms`);
      console.log(`Failed requests: ${failedRequests.length}`);
    });
  });

  test.describe('Memory and Resource Testing', () => {
    test('should validate memory usage during intensive operations', async ({ page }) => {
      await page.goto(PERFORMANCE_CONFIG.frontendURL);
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return performance.memory ? {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize
        } : null;
      });
      
      if (initialMemory) {
        // Perform memory-intensive operations
        await page.evaluate(() => {
          // Simulate loading large amounts of club data
          const largeData = [];
          for (let i = 0; i < 1000; i++) {
            largeData.push({
              id: i,
              name: `Club ${i}`,
              data: new Array(1000).fill('test data')
            });
          }
          window.testData = largeData;
        });
        
        // Get memory usage after operations
        const finalMemory = await page.evaluate(() => {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize
          };
        });
        
        const memoryIncrease = finalMemory.used - initialMemory.used;
        const memoryUsageRatio = finalMemory.used / finalMemory.total;
        
        // Validate memory usage is reasonable
        expect(memoryUsageRatio).toBeLessThan(PERFORMANCE_CONFIG.thresholds.memoryUsage);
        
        console.log(`Memory usage: ${(finalMemory.used / 1024 / 1024).toFixed(2)}MB (${(memoryUsageRatio * 100).toFixed(1)}%)`);
        console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        
        // Cleanup
        await page.evaluate(() => {
          delete window.testData;
        });
      }
    });

    test('should validate resource loading efficiency', async ({ page }) => {
      await page.goto(PERFORMANCE_CONFIG.frontendURL);
      await page.waitForLoadState('networkidle');
      
      // Analyze resource loading
      const resourceMetrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        
        const resourceTypes = {};
        let totalSize = 0;
        let totalDuration = 0;
        
        resources.forEach(resource => {
          const type = resource.initiatorType || 'other';
          if (!resourceTypes[type]) {
            resourceTypes[type] = { count: 0, size: 0, duration: 0 };
          }
          
          resourceTypes[type].count++;
          resourceTypes[type].size += resource.transferSize || 0;
          resourceTypes[type].duration += resource.duration || 0;
          
          totalSize += resource.transferSize || 0;
          totalDuration += resource.duration || 0;
        });
        
        return {
          totalResources: resources.length,
          totalSize,
          totalDuration,
          resourceTypes,
          avgResourceSize: totalSize / resources.length,
          avgResourceDuration: totalDuration / resources.length
        };
      });
      
      // Validate resource efficiency
      expect(resourceMetrics.totalResources).toBeLessThan(100); // Reasonable number of resources
      expect(resourceMetrics.avgResourceDuration).toBeLessThan(500); // Average resource load time
      
      console.log('Resource metrics:', {
        totalResources: resourceMetrics.totalResources,
        totalSize: `${(resourceMetrics.totalSize / 1024).toFixed(2)}KB`,
        avgDuration: `${resourceMetrics.avgResourceDuration.toFixed(2)}ms`
      });
    });
  });

  test.describe('Stress Testing', () => {
    test('should handle database stress with club operations', async ({ request }) => {
      const stressOperations = [
        // Read operations
        () => request.get(`${PERFORMANCE_CONFIG.baseURL}/api/clubs?populate=*`),
        () => request.get(`${PERFORMANCE_CONFIG.baseURL}/api/spiele?populate[heim_club]=*&populate[gast_club]=*`),
        () => request.get(`${PERFORMANCE_CONFIG.baseURL}/api/tabellen-eintraege?populate[club]=*`),
        
        // Search operations
        () => request.get(`${PERFORMANCE_CONFIG.baseURL}/api/clubs?filters[name][$contains]=Viktoria`),
        () => request.get(`${PERFORMANCE_CONFIG.baseURL}/api/clubs?filters[club_typ][$eq]=viktoria_verein`),
      ];
      
      const stressTestDuration = 20000; // 20 seconds
      const startTime = Date.now();
      const results = [];
      
      // Run stress test
      while (Date.now() - startTime < stressTestDuration) {
        const operation = stressOperations[Math.floor(Math.random() * stressOperations.length)];
        
        try {
          const requestStart = Date.now();
          const response = await operation();
          const responseTime = Date.now() - requestStart;
          
          results.push({
            success: response.ok(),
            responseTime,
            status: response.status()
          });
        } catch (error) {
          results.push({
            success: false,
            error: error.message
          });
        }
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Analyze stress test results
      const successfulRequests = results.filter(r => r.success);
      const failedRequests = results.filter(r => !r.success);
      const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.responseTime, 0) / successfulRequests.length;
      
      // Validate system survived stress test
      expect(successfulRequests.length).toBeGreaterThan(results.length * 0.9); // 90% success rate under stress
      expect(avgResponseTime).toBeLessThan(PERFORMANCE_CONFIG.thresholds.apiResponseTime * 3); // Allow 3x normal time under stress
      
      console.log(`Stress test: ${results.length} requests, ${successfulRequests.length} successful (${(successfulRequests.length/results.length*100).toFixed(1)}%)`);
      console.log(`Average response time under stress: ${avgResponseTime.toFixed(0)}ms`);
    });
  });
});

// Performance monitoring utilities
class PerformanceMonitor {
  constructor() {
    this.metrics = [];
  }

  startMeasurement(name) {
    return {
      name,
      startTime: Date.now(),
      end: () => {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        this.metrics.push({ name, duration, timestamp: endTime });
        return duration;
      }
    };
  }

  getMetrics() {
    return this.metrics;
  }

  getAverageTime(name) {
    const measurements = this.metrics.filter(m => m.name === name);
    if (measurements.length === 0) return 0;
    return measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
  }

  reset() {
    this.metrics = [];
  }
}

module.exports = { PerformanceMonitor };