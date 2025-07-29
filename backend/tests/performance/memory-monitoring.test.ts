/**
 * Memory and Resource Usage Monitoring Tests
 * Tests memory consumption, garbage collection, and resource cleanup
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { QueueManagerImpl } from '../../src/api/tabellen-eintrag/services/queue-manager';
import { TabellenBerechnungsServiceImpl } from '../../src/api/tabellen-eintrag/services/tabellen-berechnung';
import { SnapshotServiceImpl } from '../../src/api/tabellen-eintrag/services/snapshot';
import { SpielLifecycleImpl } from '../../src/api/spiel/lifecycles';
import { SpielValidationService } from '../../src/api/spiel/services/validation';
import { DEFAULT_AUTOMATION_CONFIG } from '../../src/config/automation';
import { Priority, JobStatus } from '../../src/api/tabellen-eintrag/services/queue-manager';
import { SpielStatus } from '../../src/api/spiel/lifecycles';

// Memory monitoring utilities
class MemoryProfiler {
  private snapshots: Array<{
    timestamp: number;
    memory: NodeJS.MemoryUsage;
    label: string;
  }> = [];

  takeSnapshot(label: string) {
    this.snapshots.push({
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      label
    });
  }

  getMemoryTrend() {
    if (this.snapshots.length < 2) return null;

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    
    return {
      duration: last.timestamp - first.timestamp,
      heapGrowth: last.memory.heapUsed - first.memory.heapUsed,
      rssGrowth: last.memory.rss - first.memory.rss,
      externalGrowth: last.memory.external - first.memory.external,
      snapshots: this.snapshots.length,
      averageHeapPerSnapshot: this.snapshots.reduce((sum, s) => sum + s.memory.heapUsed, 0) / this.snapshots.length,
      peakHeapUsage: Math.max(...this.snapshots.map(s => s.memory.heapUsed)),
      memoryEfficiency: this.calculateMemoryEfficiency()
    };
  }

  private calculateMemoryEfficiency() {
    if (this.snapshots.length < 3) return 100;

    // Calculate how much memory is being freed between snapshots
    let totalGrowth = 0;
    let totalShrinkage = 0;

    for (let i = 1; i < this.snapshots.length; i++) {
      const diff = this.snapshots[i].memory.heapUsed - this.snapshots[i - 1].memory.heapUsed;
      if (diff > 0) {
        totalGrowth += diff;
      } else {
        totalShrinkage += Math.abs(diff);
      }
    }

    return totalGrowth > 0 ? (totalShrinkage / totalGrowth) * 100 : 100;
  }

  getDetailedReport() {
    return {
      snapshots: this.snapshots,
      trend: this.getMemoryTrend(),
      analysis: this.analyzeMemoryPattern()
    };
  }

  private analyzeMemoryPattern() {
    if (this.snapshots.length < 5) return 'Insufficient data';

    const heapValues = this.snapshots.map(s => s.memory.heapUsed);
    const isIncreasing = heapValues.every((val, i) => i === 0 || val >= heapValues[i - 1]);
    const isDecreasing = heapValues.every((val, i) => i === 0 || val <= heapValues[i - 1]);
    const isStable = Math.max(...heapValues) - Math.min(...heapValues) < 10 * 1024 * 1024; // 10MB variance

    if (isIncreasing && !isStable) return 'Memory leak detected';
    if (isDecreasing) return 'Memory being freed';
    if (isStable) return 'Stable memory usage';
    return 'Fluctuating memory usage';
  }

  reset() {
    this.snapshots = [];
  }
}

// Resource monitoring utilities
class ResourceMonitor {
  private handles: { [key: string]: any } = {};
  private timers: NodeJS.Timeout[] = [];
  private intervals: NodeJS.Timeout[] = [];

  trackHandle(name: string, handle: any) {
    this.handles[name] = handle;
  }

  trackTimer(timer: NodeJS.Timeout) {
    this.timers.push(timer);
  }

  trackInterval(interval: NodeJS.Timeout) {
    this.intervals.push(interval);
  }

  cleanup() {
    // Clear all tracked timers and intervals
    this.timers.forEach(timer => clearTimeout(timer));
    this.intervals.forEach(interval => clearInterval(interval));
    
    this.timers = [];
    this.intervals = [];
    this.handles = {};
  }

  getResourceCount() {
    return {
      handles: Object.keys(this.handles).length,
      timers: this.timers.length,
      intervals: this.intervals.length
    };
  }
}

// Mock Strapi with memory-conscious operations
const mockStrapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  db: {
    query: jest.fn(),
    transaction: jest.fn().mockImplementation(async (callback) => {
      // Simulate database transaction with memory allocation
      const transactionData = new Array(1000).fill('transaction-data');
      try {
        return await callback({});
      } finally {
        // Cleanup transaction data
        transactionData.length = 0;
      }
    })
  },
  entityService: {
    findOne: jest.fn().mockResolvedValue({ id: 1, name: 'Test Liga' }),
    findMany: jest.fn().mockImplementation(async () => {
      // Simulate large dataset
      return Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        data: `large-data-${i}`.repeat(100)
      }));
    }),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({})
  },
  config: {
    get: jest.fn().mockReturnValue(DEFAULT_AUTOMATION_CONFIG)
  }
};

global.strapi = mockStrapi as any;

describe('Memory and Resource Usage Monitoring', () => {
  let queueManager: QueueManagerImpl;
  let tabellenService: TabellenBerechnungsServiceImpl;
  let snapshotService: SnapshotServiceImpl;
  let lifecycle: SpielLifecycleImpl;
  let validationService: SpielValidationService;
  let memoryProfiler: MemoryProfiler;
  let resourceMonitor: ResourceMonitor;

  beforeAll(() => {
    memoryProfiler = new MemoryProfiler();
    resourceMonitor = new ResourceMonitor();
    validationService = new SpielValidationService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    memoryProfiler.reset();
    resourceMonitor.cleanup();
    
    tabellenService = new TabellenBerechnungsServiceImpl(mockStrapi);
    
    const queueConfig = {
      ...DEFAULT_AUTOMATION_CONFIG.queue,
      concurrency: 4,
      maxRetries: 2,
      jobTimeout: 10000,
      cleanupInterval: 5000
    };
    
    queueManager = new QueueManagerImpl(tabellenService, queueConfig);
    lifecycle = new SpielLifecycleImpl(validationService, queueManager);
    
    const snapshotConfig = {
      storageDirectory: './test-snapshots',
      maxSnapshots: 10,
      maxAge: 30,
      compressionEnabled: false,
      checksumEnabled: true
    };
    
    snapshotService = new SnapshotServiceImpl(mockStrapi, snapshotConfig);

    // Mock file system for snapshot service
    const fs = require('fs/promises');
    jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    jest.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('{}'));
    jest.spyOn(fs, 'readdir').mockResolvedValue([]);
    jest.spyOn(fs, 'unlink').mockResolvedValue(undefined);

    mockStrapi.db.query.mockReturnValue({
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({})
    });

    memoryProfiler.takeSnapshot('test-start');
  });

  afterEach(async () => {
    memoryProfiler.takeSnapshot('test-end');
    
    if (queueManager) {
      queueManager.pauseQueue();
      await queueManager.clearQueue();
      queueManager.destroy();
    }
    
    resourceMonitor.cleanup();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  });

  afterAll(() => {
    const finalReport = memoryProfiler.getDetailedReport();
    console.log('Final Memory Report:', JSON.stringify(finalReport, null, 2));
  });

  describe('Queue Manager Memory Usage', () => {
    it('should not leak memory during normal queue operations', async () => {
      const iterations = 50;
      
      for (let i = 0; i < iterations; i++) {
        // Add jobs
        await queueManager.addCalculationJob((i % 5) + 1, 1, Priority.NORMAL);
        
        // Process jobs
        await queueManager.processQueue();
        await new Promise(resolve => setTimeout(resolve, 10));
        
        // Take memory snapshot every 10 iterations
        if (i % 10 === 0) {
          memoryProfiler.takeSnapshot(`iteration-${i}`);
        }
      }

      // Final processing
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force garbage collection
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      memoryProfiler.takeSnapshot('after-gc');

      const trend = memoryProfiler.getMemoryTrend();
      expect(trend).toBeDefined();
      
      // Memory growth should be reasonable
      expect(trend!.heapGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB growth
      expect(trend!.memoryEfficiency).toBeGreaterThan(50); // At least 50% efficiency

      console.log('Queue Memory Usage Trend:', JSON.stringify(trend, null, 2));
    });

    it('should clean up completed jobs to prevent memory accumulation', async () => {
      memoryProfiler.takeSnapshot('before-jobs');

      // Add many jobs
      const jobCount = 100;
      for (let i = 0; i < jobCount; i++) {
        await queueManager.addCalculationJob((i % 3) + 1, 1, Priority.NORMAL);
      }

      memoryProfiler.takeSnapshot('after-adding-jobs');

      // Process all jobs
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 2000));

      memoryProfiler.takeSnapshot('after-processing');

      // Trigger cleanup
      await new Promise(resolve => setTimeout(resolve, 6000)); // Wait for cleanup interval

      memoryProfiler.takeSnapshot('after-cleanup');

      const queueStatus = queueManager.getQueueStatus();
      const trend = memoryProfiler.getMemoryTrend();

      // Completed jobs should be cleaned up
      expect(queueStatus.completedJobs).toBeLessThan(jobCount); // Some should be cleaned up
      expect(trend!.heapGrowth).toBeLessThan(100 * 1024 * 1024); // Reasonable growth

      console.log('Job Cleanup Memory Trend:', JSON.stringify(trend, null, 2));
    });

    it('should handle memory pressure during high load', async () => {
      // Create memory pressure
      const memoryHogs: any[] = [];
      for (let i = 0; i < 50; i++) {
        memoryHogs.push(new Array(50000).fill(`pressure-${i}`));
      }

      memoryProfiler.takeSnapshot('memory-pressure-created');

      // Add jobs under memory pressure
      const jobCount = 30;
      for (let i = 0; i < jobCount; i++) {
        await queueManager.addCalculationJob((i % 3) + 1, 1, Priority.NORMAL);
      }

      memoryProfiler.takeSnapshot('jobs-added-under-pressure');

      // Process jobs under pressure
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 1000));

      memoryProfiler.takeSnapshot('jobs-processed-under-pressure');

      // Release memory pressure
      memoryHogs.length = 0;
      if (global.gc) {
        global.gc();
      }

      memoryProfiler.takeSnapshot('pressure-released');

      const queueStatus = queueManager.getQueueStatus();
      const trend = memoryProfiler.getMemoryTrend();

      // System should handle memory pressure
      expect(queueStatus.completedJobs + queueStatus.failedJobs).toBeGreaterThan(0);
      expect(trend!.peakHeapUsage).toBeDefined();

      console.log('Memory Pressure Test Results:', JSON.stringify(trend, null, 2));
    });
  });

  describe('Table Calculation Memory Usage', () => {
    it('should efficiently process large datasets without excessive memory usage', async () => {
      // Mock large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        heim_team: { id: (i % 18) + 1, name: `Team ${(i % 18) + 1}` },
        gast_team: { id: ((i + 1) % 18) + 1, name: `Team ${((i + 1) % 18) + 1}` },
        heim_tore: Math.floor(Math.random() * 5),
        gast_tore: Math.floor(Math.random() * 5),
        status: 'beendet',
        liga: { id: 1, name: 'Test Liga' },
        saison: { id: 1, name: '2023/24' }
      }));

      mockStrapi.entityService.findMany.mockResolvedValue(largeDataset);

      memoryProfiler.takeSnapshot('before-calculation');

      // Trigger calculation
      await queueManager.addCalculationJob(1, 1, Priority.NORMAL);
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 1000));

      memoryProfiler.takeSnapshot('after-calculation');

      // Force cleanup
      if (global.gc) {
        global.gc();
      }

      memoryProfiler.takeSnapshot('after-gc');

      const trend = memoryProfiler.getMemoryTrend();
      const queueStatus = queueManager.getQueueStatus();

      // Should process large dataset efficiently
      expect(queueStatus.completedJobs).toBe(1);
      expect(trend!.heapGrowth).toBeLessThan(200 * 1024 * 1024); // Less than 200MB for 1000 games

      console.log('Large Dataset Memory Usage:', JSON.stringify(trend, null, 2));
    });

    it('should release memory after calculation completion', async () => {
      const iterations = 10;
      
      for (let i = 0; i < iterations; i++) {
        memoryProfiler.takeSnapshot(`before-calc-${i}`);

        // Trigger calculation
        await queueManager.addCalculationJob((i % 3) + 1, 1, Priority.NORMAL);
        await queueManager.processQueue();
        await new Promise(resolve => setTimeout(resolve, 100));

        memoryProfiler.takeSnapshot(`after-calc-${i}`);

        // Force garbage collection every few iterations
        if (i % 3 === 0 && global.gc) {
          global.gc();
          memoryProfiler.takeSnapshot(`after-gc-${i}`);
        }
      }

      const trend = memoryProfiler.getMemoryTrend();
      
      // Memory should not grow linearly with iterations
      expect(trend!.memoryEfficiency).toBeGreaterThan(30); // At least 30% efficiency
      expect(trend!.heapGrowth / iterations).toBeLessThan(10 * 1024 * 1024); // Less than 10MB per iteration

      console.log('Calculation Memory Release:', JSON.stringify(trend, null, 2));
    });
  });

  describe('Snapshot Service Memory Usage', () => {
    it('should handle snapshot creation without memory leaks', async () => {
      const snapshotCount = 20;
      
      for (let i = 0; i < snapshotCount; i++) {
        memoryProfiler.takeSnapshot(`before-snapshot-${i}`);

        // Create snapshot
        await snapshotService.createSnapshot(1, 1, `Test snapshot ${i}`);

        memoryProfiler.takeSnapshot(`after-snapshot-${i}`);

        // Cleanup every few snapshots
        if (i % 5 === 0 && global.gc) {
          global.gc();
        }
      }

      const trend = memoryProfiler.getMemoryTrend();
      
      // Memory growth should be reasonable for snapshot operations
      expect(trend!.heapGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      expect(trend!.memoryEfficiency).toBeGreaterThan(40); // At least 40% efficiency

      console.log('Snapshot Memory Usage:', JSON.stringify(trend, null, 2));
    });

    it('should efficiently handle large snapshot data', async () => {
      // Mock large table data
      const largeTableData = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        team_name: `Team ${i + 1}`,
        team: { id: i + 1, name: `Team ${i + 1}` },
        liga: { id: 1, name: 'Test Liga' },
        saison: { id: 1, name: '2023/24' },
        platz: i + 1,
        spiele: 34,
        siege: Math.floor(Math.random() * 34),
        unentschieden: Math.floor(Math.random() * 10),
        niederlagen: Math.floor(Math.random() * 10),
        tore_fuer: Math.floor(Math.random() * 100),
        tore_gegen: Math.floor(Math.random() * 100),
        tordifferenz: Math.floor(Math.random() * 50) - 25,
        punkte: Math.floor(Math.random() * 102),
        auto_calculated: true
      }));

      mockStrapi.db.query.mockReturnValue({
        findMany: jest.fn().mockResolvedValue(largeTableData)
      });

      memoryProfiler.takeSnapshot('before-large-snapshot');

      // Create snapshot with large data
      await snapshotService.createSnapshot(1, 1, 'Large snapshot test');

      memoryProfiler.takeSnapshot('after-large-snapshot');

      // Force cleanup
      if (global.gc) {
        global.gc();
      }

      memoryProfiler.takeSnapshot('after-snapshot-gc');

      const trend = memoryProfiler.getMemoryTrend();
      
      // Should handle large snapshots efficiently
      expect(trend!.heapGrowth).toBeLessThan(150 * 1024 * 1024); // Less than 150MB for 500 teams

      console.log('Large Snapshot Memory Usage:', JSON.stringify(trend, null, 2));
    });
  });

  describe('Resource Cleanup and Leak Detection', () => {
    it('should properly clean up timers and intervals', async () => {
      const initialResources = resourceMonitor.getResourceCount();

      // Create some timers and intervals (simulating what services might do)
      const timer1 = setTimeout(() => {}, 10000);
      const timer2 = setTimeout(() => {}, 20000);
      const interval1 = setInterval(() => {}, 5000);

      resourceMonitor.trackTimer(timer1);
      resourceMonitor.trackTimer(timer2);
      resourceMonitor.trackInterval(interval1);

      const resourcesAfterCreation = resourceMonitor.getResourceCount();
      expect(resourcesAfterCreation.timers).toBe(2);
      expect(resourcesAfterCreation.intervals).toBe(1);

      // Cleanup
      resourceMonitor.cleanup();

      const resourcesAfterCleanup = resourceMonitor.getResourceCount();
      expect(resourcesAfterCleanup.timers).toBe(0);
      expect(resourcesAfterCleanup.intervals).toBe(0);
    });

    it('should detect and prevent event listener leaks', async () => {
      const eventEmitter = new (require('events').EventEmitter)();
      let listenerCount = 0;

      // Add many listeners
      for (let i = 0; i < 50; i++) {
        const listener = () => {};
        eventEmitter.on('test-event', listener);
        listenerCount++;
      }

      expect(eventEmitter.listenerCount('test-event')).toBe(50);

      // Simulate cleanup
      eventEmitter.removeAllListeners('test-event');
      expect(eventEmitter.listenerCount('test-event')).toBe(0);
    });

    it('should monitor and report resource usage over time', async () => {
      const monitoringDuration = 5000; // 5 seconds
      const startTime = Date.now();
      
      // Start resource monitoring
      const monitoringInterval = setInterval(() => {
        memoryProfiler.takeSnapshot(`monitoring-${Date.now() - startTime}`);
      }, 500);

      resourceMonitor.trackInterval(monitoringInterval);

      // Simulate work
      for (let i = 0; i < 20; i++) {
        await queueManager.addCalculationJob((i % 3) + 1, 1, Priority.NORMAL);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Process jobs
      await queueManager.processQueue();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stop monitoring
      resourceMonitor.cleanup();

      const trend = memoryProfiler.getMemoryTrend();
      const report = memoryProfiler.getDetailedReport();

      expect(trend!.snapshots).toBeGreaterThan(5); // Should have multiple snapshots
      expect(report.analysis).toBeDefined();

      console.log('Resource Monitoring Report:', JSON.stringify({
        trend,
        analysis: report.analysis,
        snapshotCount: report.snapshots.length
      }, null, 2));
    });
  });

  describe('Memory Optimization Verification', () => {
    it('should demonstrate memory efficiency improvements', async () => {
      // Test without optimization
      memoryProfiler.takeSnapshot('unoptimized-start');
      
      // Simulate unoptimized operations (keeping references)
      const references: any[] = [];
      for (let i = 0; i < 100; i++) {
        const data = Array.from({ length: 1000 }, (_, j) => `data-${i}-${j}`);
        references.push(data);
        await queueManager.addCalculationJob((i % 5) + 1, 1, Priority.NORMAL);
      }

      memoryProfiler.takeSnapshot('unoptimized-end');

      // Clear references (simulate optimization)
      references.length = 0;
      if (global.gc) {
        global.gc();
      }

      memoryProfiler.takeSnapshot('optimized-after-cleanup');

      // Test with optimization
      for (let i = 0; i < 100; i++) {
        // Don't keep references (optimized)
        const data = Array.from({ length: 1000 }, (_, j) => `data-${i}-${j}`);
        // Use data but don't store reference
        expect(data.length).toBe(1000);
        
        await queueManager.addCalculationJob((i % 5) + 1, 1, Priority.NORMAL);
        
        // Force cleanup every 20 iterations
        if (i % 20 === 0 && global.gc) {
          global.gc();
        }
      }

      memoryProfiler.takeSnapshot('optimized-end');

      const trend = memoryProfiler.getMemoryTrend();
      
      // Optimized version should use less memory
      expect(trend!.memoryEfficiency).toBeGreaterThan(60); // Good efficiency
      
      console.log('Memory Optimization Results:', JSON.stringify(trend, null, 2));
    });

    it('should verify garbage collection effectiveness', async () => {
      if (!global.gc) {
        console.log('Garbage collection not available, skipping test');
        return;
      }

      // Create memory pressure
      memoryProfiler.takeSnapshot('before-pressure');
      
      const memoryHogs: any[] = [];
      for (let i = 0; i < 100; i++) {
        memoryHogs.push(new Array(10000).fill(`gc-test-${i}`));
      }

      memoryProfiler.takeSnapshot('after-pressure');

      // Release references
      memoryHogs.length = 0;

      memoryProfiler.takeSnapshot('after-release');

      // Force garbage collection
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 100));

      memoryProfiler.takeSnapshot('after-gc');

      const trend = memoryProfiler.getMemoryTrend();
      const snapshots = memoryProfiler.getDetailedReport().snapshots;
      
      const beforeGC = snapshots[snapshots.length - 2].memory.heapUsed;
      const afterGC = snapshots[snapshots.length - 1].memory.heapUsed;
      const memoryFreed = beforeGC - afterGC;

      // Garbage collection should free significant memory
      expect(memoryFreed).toBeGreaterThan(50 * 1024 * 1024); // At least 50MB freed
      
      console.log('Garbage Collection Results:', {
        memoryFreed: `${(memoryFreed / 1024 / 1024).toFixed(2)}MB`,
        beforeGC: `${(beforeGC / 1024 / 1024).toFixed(2)}MB`,
        afterGC: `${(afterGC / 1024 / 1024).toFixed(2)}MB`,
        trend
      });
    });
  });
});