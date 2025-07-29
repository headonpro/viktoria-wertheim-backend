/**
 * Database Performance Tests
 * Tests for database operation performance benchmarks
 * Requirements: 8.1, 8.2
 */

import { TabellenBerechnungsServiceImpl } from '../../../../src/api/tabellen-eintrag/services/tabellen-berechnung';
import { DatabaseOptimizerImpl } from '../../../../src/api/tabellen-eintrag/services/database-optimizer';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
// Mock strapi helper
function createMockStrapi() {
  return {
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn()
    },
    entityService: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    db: {
      transaction: jest.fn().mockImplementation((callback) => callback()),
      connection: {
        raw: jest.fn()
      }
    }
  };
}

describe('Database Performance Tests', () => {
  let tabellenService: TabellenBerechnungsServiceImpl;
  let databaseOptimizer: DatabaseOptimizerImpl;
  let mockStrapi: any;

  beforeEach(() => {
    mockStrapi = createMockStrapi();
    tabellenService = new TabellenBerechnungsServiceImpl(mockStrapi);
    databaseOptimizer = new DatabaseOptimizerImpl(mockStrapi);
  });

  describe('Table Calculation Performance', () => {
    it('should calculate table for small league (16 teams) within 5 seconds', async () => {
      // Requirement 8.1: Liga with less than 50 games should complete under 5 seconds
      const ligaId = 1;
      const saisonId = 1;
      
      // Mock 16 teams with 30 games total (less than 50)
      const mockGames = generateMockGames(16, 30);
      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);

      const startTime = Date.now();
      
      await tabellenService.calculateTableForLiga(ligaId, saisonId);
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(5000);
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining(`Table calculation completed for liga ${ligaId}`)
      );
    });

    it('should calculate table for large league (18 teams) within 15 seconds', async () => {
      // Requirement 8.2: Liga with more than 100 games should complete under 15 seconds
      const ligaId = 2;
      const saisonId = 1;
      
      // Mock 18 teams with 120 games total (more than 100)
      const mockGames = generateMockGames(18, 120);
      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);

      const startTime = Date.now();
      
      await tabellenService.calculateTableForLiga(ligaId, saisonId);
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(15000);
    });

    it('should handle concurrent calculations efficiently', async () => {
      // Requirement 8.3: Multiple leagues should be processed in parallel
      const calculations = [];
      
      for (let i = 1; i <= 5; i++) {
        const mockGames = generateMockGames(16, 30);
        mockStrapi.entityService.findMany.mockResolvedValue(mockGames);
        
        calculations.push(
          tabellenService.calculateTableForLiga(i, 1)
        );
      }

      const startTime = Date.now();
      
      await Promise.all(calculations);
      
      const totalExecutionTime = Date.now() - startTime;
      
      // Parallel execution should be faster than sequential
      expect(totalExecutionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should optimize bulk updates for performance', async () => {
      const ligaId = 1;
      const saisonId = 1;
      
      // Create mock table entries for bulk update
      const mockEntries = generateMockTableEntries(16);
      
      const startTime = Date.now();
      
      await tabellenService.bulkUpdateTableEntries(mockEntries);
      
      const executionTime = Date.now() - startTime;
      
      // Bulk update should be efficient
      expect(executionTime).toBeLessThan(2000);
      expect(mockStrapi.entityService.update).toHaveBeenCalledTimes(16);
    });
  });

  describe('Database Index Performance', () => {
    it('should create indexes within acceptable time', async () => {
      const startTime = Date.now();
      
      // Mock successful index creation
      mockStrapi.db.connection.raw
        .mockResolvedValueOnce({ rows: [] }) // Index doesn't exist
        .mockResolvedValueOnce(undefined); // Index creation successful

      await databaseOptimizer.createIndexes();
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should analyze query performance efficiently', async () => {
      const startTime = Date.now();
      
      // Mock performance analysis data
      mockStrapi.db.connection.raw.mockResolvedValue({
        rows: [
          {
            tablename: 'spiele',
            indexname: 'idx_spiele_liga_saison',
            idx_tup_read: 1000,
            idx_tup_fetch: 800
          }
        ]
      });

      const report = await databaseOptimizer.analyzeQueryPerformance();
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(report).toHaveProperty('slowQueries');
      expect(report).toHaveProperty('recommendations');
    });
  });

  describe('Connection Pool Performance', () => {
    it('should handle high connection load', async () => {
      const connectionPromises = [];
      
      // Simulate 50 concurrent connection requests
      for (let i = 0; i < 50; i++) {
        connectionPromises.push(
          databaseOptimizer.getConnectionPoolStatus()
        );
      }

      const startTime = Date.now();
      
      const results = await Promise.all(connectionPromises);
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(5000); // Should handle load within 5 seconds
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result).toHaveProperty('size');
        expect(result).toHaveProperty('used');
        expect(result).toHaveProperty('waiting');
      });
    });

    it('should monitor connection pool efficiently', async () => {
      const startTime = Date.now();
      
      await databaseOptimizer.configureConnectionPool();
      
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(1000); // Should configure quickly
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not exceed memory limits during large calculations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Process large dataset
      const mockGames = generateMockGames(20, 200); // Large dataset
      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);

      await tabellenService.calculateTableForLiga(1, 1);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should clean up resources after calculations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform multiple calculations
      for (let i = 0; i < 10; i++) {
        const mockGames = generateMockGames(16, 30);
        mockStrapi.entityService.findMany.mockResolvedValue(mockGames);
        await tabellenService.calculateTableForLiga(i, 1);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory should not grow excessively
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Query Optimization Performance', () => {
    it('should execute optimized queries faster than unoptimized', async () => {
      // Test with optimization
      await databaseOptimizer.optimizeQueries();
      
      const optimizedStartTime = Date.now();
      const mockGames = generateMockGames(16, 50);
      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);
      await tabellenService.calculateTableForLiga(1, 1);
      const optimizedTime = Date.now() - optimizedStartTime;
      
      // Reset and test without optimization
      const unoptimizedStartTime = Date.now();
      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);
      await tabellenService.calculateTableForLiga(2, 1);
      const unoptimizedTime = Date.now() - unoptimizedStartTime;
      
      // Optimized should be faster or at least not significantly slower
      expect(optimizedTime).toBeLessThanOrEqual(unoptimizedTime * 1.1);
    });

    it('should cache frequently accessed data effectively', async () => {
      const ligaId = 1;
      const saisonId = 1;
      const mockGames = generateMockGames(16, 30);
      
      // First calculation (cache miss)
      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);
      const firstStartTime = Date.now();
      await tabellenService.calculateTableForLiga(ligaId, saisonId);
      const firstTime = Date.now() - firstStartTime;
      
      // Second calculation (should benefit from any caching)
      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);
      const secondStartTime = Date.now();
      await tabellenService.calculateTableForLiga(ligaId, saisonId);
      const secondTime = Date.now() - secondStartTime;
      
      // Second call should be faster or similar
      expect(secondTime).toBeLessThanOrEqual(firstTime * 1.2);
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid successive calculations', async () => {
      const calculations = [];
      const mockGames = generateMockGames(16, 30);
      
      // Rapid fire 20 calculations
      for (let i = 0; i < 20; i++) {
        mockStrapi.entityService.findMany.mockResolvedValue(mockGames);
        calculations.push(
          tabellenService.calculateTableForLiga(1, i)
        );
      }

      const startTime = Date.now();
      
      await Promise.all(calculations);
      
      const executionTime = Date.now() - startTime;
      
      // Should handle rapid calculations within reasonable time
      expect(executionTime).toBeLessThan(30000); // 30 seconds for 20 calculations
    });

    it('should maintain performance under database load', async () => {
      // Simulate database load with multiple operations
      const operations = [];
      
      for (let i = 0; i < 10; i++) {
        operations.push(databaseOptimizer.getConnectionPoolStatus());
        operations.push(databaseOptimizer.analyzeQueryPerformance());
        
        const mockGames = generateMockGames(16, 30);
        mockStrapi.entityService.findMany.mockResolvedValue(mockGames);
        operations.push(tabellenService.calculateTableForLiga(i, 1));
      }

      const startTime = Date.now();
      
      await Promise.all(operations);
      
      const executionTime = Date.now() - startTime;
      
      // Should handle mixed load efficiently
      expect(executionTime).toBeLessThan(20000);
    });
  });
});

/**
 * Helper function to generate mock games for testing
 */
function generateMockGames(teamCount: number, gameCount: number) {
  const games = [];
  const teams = [];
  
  // Generate teams
  for (let i = 1; i <= teamCount; i++) {
    teams.push({
      id: i,
      name: `Team ${i}`
    });
  }
  
  // Generate games
  for (let i = 1; i <= gameCount; i++) {
    const heimTeam = teams[Math.floor(Math.random() * teamCount)];
    let gastTeam = teams[Math.floor(Math.random() * teamCount)];
    
    // Ensure teams don't play against themselves
    while (gastTeam.id === heimTeam.id) {
      gastTeam = teams[Math.floor(Math.random() * teamCount)];
    }
    
    games.push({
      id: i,
      heim_team: heimTeam,
      gast_team: gastTeam,
      heim_tore: Math.floor(Math.random() * 5),
      gast_tore: Math.floor(Math.random() * 5),
      status: 'beendet',
      liga: { id: 1, name: 'Test Liga' },
      saison: { id: 1, name: '2024/25' },
      spieltag: Math.floor(i / (teamCount / 2)) + 1,
      datum: new Date().toISOString()
    });
  }
  
  return games;
}

/**
 * Helper function to generate mock table entries for testing
 */
function generateMockTableEntries(teamCount: number) {
  const entries = [];
  
  for (let i = 1; i <= teamCount; i++) {
    entries.push({
      id: i,
      team_name: `Team ${i}`,
      liga: { id: 1, name: 'Test Liga' },
      team: { id: i, name: `Team ${i}` },
      platz: i,
      spiele: Math.floor(Math.random() * 20) + 10,
      siege: Math.floor(Math.random() * 10),
      unentschieden: Math.floor(Math.random() * 5),
      niederlagen: Math.floor(Math.random() * 10),
      tore_fuer: Math.floor(Math.random() * 30) + 10,
      tore_gegen: Math.floor(Math.random() * 30) + 10,
      tordifferenz: Math.floor(Math.random() * 20) - 10,
      punkte: Math.floor(Math.random() * 30) + 10,
      last_updated: new Date(),
      auto_calculated: true,
      calculation_source: 'automatic'
    });
  }
  
  return entries;
}