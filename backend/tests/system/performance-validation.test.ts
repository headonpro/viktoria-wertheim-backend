/**
 * Performance and Load Testing for Tabellen Automation
 * Tests system performance under realistic load conditions
 */

import { SpielLifecycleImpl } from '../../src/api/spiel/lifecycles';
import { SpielValidationService } from '../../src/api/spiel/services/validation';
import { QueueManagerImpl } from '../../src/api/tabellen-eintrag/services/queue-manager';
import { TabellenBerechnungsServiceImpl } from '../../src/api/tabellen-eintrag/services/tabellen-berechnung';
import { SnapshotServiceImpl } from '../../src/api/tabellen-eintrag/services/snapshot';
import { createAutomationLogger } from '../../src/api/tabellen-eintrag/services/logger';
import { createPerformanceMonitor } from '../../src/api/tabellen-eintrag/services/performance-monitor';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock Strapi
const mockStrapi = {
  entityService: {
    findMany: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  db: {
    query: jest.fn(() => ({
      findMany: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }))
  },
  log: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
};

describe('Performance Validation Tests', () => {
  let spielLifecycle: SpielLifecycleImpl;
  let validationService: SpielValidationService;
  let queueManager: QueueManagerImpl;
  let tabellenService: TabellenBerechnungsServiceImpl;
  let snapshotService: SnapshotServiceImpl;
  let logger: any;
  let performanceMonitor: any;

  beforeAll(async () => {
    // Initialize services
    logger = createAutomationLogger();
    performanceMonitor = createPerformanceMonitor();
    
    spielLifecycle = new SpielLifecycleImpl();
    validationService = new SpielValidationService();
    queueManager = new QueueManagerImpl();
    tabellenService = new TabellenBerechnungsServiceImpl();
    snapshotService = new SnapshotServiceImpl();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Cleanup resources
    if (queueManager) {
      await queueManager.shutdown();
    }
  });

  describe('Load Testing', () => {
    it('should handle concurrent spiel updates without performance degradation', async () => {
      const concurrentUpdates = 50;
      const startTime = Date.now();
      
      const promises = Array.from({ length: concurrentUpdates }, (_, i) => {
        const mockSpiel = {
          id: i + 1,
          heimmannschaft: { id: 1, name: 'Team A' },
          gastmannschaft: { id: 2, name: 'Team B' },
          saison: { id: 1, name: '2024/25' },
          tore_heim: Math.floor(Math.random() * 5),
          tore_gast: Math.floor(Math.random() * 5),
          status: 'beendet'
        };
        
        return spielLifecycle.afterUpdate({ result: mockSpiel });
      });

      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain queue performance under high load', async () => {
      const highLoadJobs = 100;
      const startTime = Date.now();
      
      const promises = Array.from({ length: highLoadJobs }, (_, i) => {
        return queueManager.addJob('recalculate-tabelle', {
          saisonId: 1,
          teamId: (i % 10) + 1,
          priority: 'normal'
        });
      });

      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Memory Usage', () => {
    it('should not have memory leaks during extended operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate extended operations
      for (let i = 0; i < 100; i++) {
        const mockSpiel = {
          id: i + 1,
          heimmannschaft: { id: 1, name: 'Team A' },
          gastmannschaft: { id: 2, name: 'Team B' },
          saison: { id: 1, name: '2024/25' },
          tore_heim: 2,
          tore_gast: 1,
          status: 'beendet'
        };
        
        await spielLifecycle.afterUpdate({ result: mockSpiel });
        
        // Force garbage collection periodically
        if (i % 20 === 0 && global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Database Performance', () => {
    it('should optimize database queries for large datasets', async () => {
      const startTime = Date.now();
      
      // Mock large dataset query
      mockStrapi.entityService.findMany.mockResolvedValue(
        Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          team: { id: (i % 20) + 1, name: `Team ${i % 20 + 1}` },
          punkte: Math.floor(Math.random() * 30),
          tore: Math.floor(Math.random() * 50),
          gegentore: Math.floor(Math.random() * 30)
        }))
      );
      
      await tabellenService.calculateTabelle(1); // Saison ID 1
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Stress Testing', () => {
    it('should handle system stress without failures', async () => {
      const stressTestDuration = 30000; // 30 seconds
      const startTime = Date.now();
      let operationCount = 0;
      let errorCount = 0;
      
      const stressTest = async () => {
        while (Date.now() - startTime < stressTestDuration) {
          try {
            const mockSpiel = {
              id: operationCount + 1,
              heimmannschaft: { id: (operationCount % 10) + 1, name: `Team ${(operationCount % 10) + 1}` },
              gastmannschaft: { id: ((operationCount + 1) % 10) + 1, name: `Team ${((operationCount + 1) % 10) + 1}` },
              saison: { id: 1, name: '2024/25' },
              tore_heim: Math.floor(Math.random() * 5),
              tore_gast: Math.floor(Math.random() * 5),
              status: 'beendet'
            };
            
            await spielLifecycle.afterUpdate({ result: mockSpiel });
            operationCount++;
            
            // Small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 10));
          } catch (error) {
            errorCount++;
            logger.error('Stress test operation failed:', error);
          }
        }
      };
      
      await stressTest();
      
      expect(operationCount).toBeGreaterThan(100); // Should complete many operations
      expect(errorCount / operationCount).toBeLessThan(0.05); // Error rate should be less than 5%
    });
  });

  describe('Response Time Validation', () => {
    it('should meet response time requirements for critical operations', async () => {
      const operations = [
        {
          name: 'Spiel Update',
          operation: () => spielLifecycle.afterUpdate({
            result: {
              id: 1,
              heimmannschaft: { id: 1, name: 'Team A' },
              gastmannschaft: { id: 2, name: 'Team B' },
              saison: { id: 1, name: '2024/25' },
              tore_heim: 2,
              tore_gast: 1,
              status: 'beendet'
            }
          }),
          maxTime: 1000 // 1 second
        },
        {
          name: 'Tabelle Calculation',
          operation: () => tabellenService.calculateTabelle(1),
          maxTime: 2000 // 2 seconds
        },
        {
          name: 'Queue Job Processing',
          operation: () => queueManager.addJob('recalculate-tabelle', { saisonId: 1, teamId: 1 }),
          maxTime: 500 // 500ms
        }
      ];
      
      for (const { name, operation, maxTime } of operations) {
        const startTime = Date.now();
        await operation();
        const duration = Date.now() - startTime;
        
        expect(duration).toBeLessThan(maxTime);
        logger.info(`${name} completed in ${duration}ms (max: ${maxTime}ms)`);
      }
    });
  });
});