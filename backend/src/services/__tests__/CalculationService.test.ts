/**
 * Unit tests for CalculationService
 * Tests the sync/async calculation separation and automatic field calculations
 */

import { CalculationService } from '../CalculationService';
import { SyncCalculation, AsyncCalculation, CalculationResult, CalculationStatus } from '../types';

describe('CalculationService', () => {
  let service: CalculationService;
  let mockSyncCalculations: SyncCalculation[];
  let mockAsyncCalculations: AsyncCalculation[];

  beforeEach(() => {
    mockSyncCalculations = [
      {
        field: 'totalPoints',
        calculator: (data: any) => (data.wins || 0) * 3 + (data.draws || 0),
        dependencies: ['wins', 'draws']
      },
      {
        field: 'goalDifference',
        calculator: (data: any) => (data.goalsFor || 0) - (data.goalsAgainst || 0),
        dependencies: ['goalsFor', 'goalsAgainst']
      },
      {
        field: 'gamesPlayed',
        calculator: (data: any) => (data.wins || 0) + (data.draws || 0) + (data.losses || 0),
        dependencies: ['wins', 'draws', 'losses']
      }
    ];

    mockAsyncCalculations = [
      {
        name: 'team-statistics',
        calculator: async (data: any) => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { averageGoals: data.goalsFor / data.gamesPlayed };
        },
        priority: 'high'
      },
      {
        name: 'league-position',
        calculator: async (data: any) => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return { position: Math.floor(Math.random() * 20) + 1 };
        },
        priority: 'medium'
      }
    ];

    service = new CalculationService();
  });

  describe('calculateSync', () => {
    it('should calculate all sync calculations successfully', () => {
      const data = {
        wins: 10,
        draws: 5,
        losses: 3,
        goalsFor: 25,
        goalsAgainst: 15
      };

      const result = service.calculateSync(data, mockSyncCalculations);

      expect(result.success).toBe(true);
      expect(result.results).toHaveProperty('totalPoints', 35);
      expect(result.results).toHaveProperty('goalDifference', 10);
      expect(result.results).toHaveProperty('gamesPlayed', 18);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle missing dependencies gracefully', () => {
      const data = {
        wins: 10,
        draws: 5
        // Missing losses, goalsFor, goalsAgainst
      };

      const result = service.calculateSync(data, mockSyncCalculations);

      expect(result.success).toBe(true);
      expect(result.results).toHaveProperty('totalPoints', 35);
      expect(result.results).toHaveProperty('goalDifference', 0);
      expect(result.results).toHaveProperty('gamesPlayed', 15);
    });

    it('should handle calculation errors', () => {
      const errorCalculation: SyncCalculation = {
        field: 'errorField',
        calculator: (data: any) => {
          throw new Error('Calculation failed');
        },
        dependencies: []
      };

      const data = { wins: 10 };
      const result = service.calculateSync(data, [errorCalculation]);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('errorField');
      expect(result.errors[0].message).toBe('Calculation failed');
    });

    it('should resolve dependencies in correct order', () => {
      const dependentCalculations: SyncCalculation[] = [
        {
          field: 'pointsPerGame',
          calculator: (data: any) => data.totalPoints / data.gamesPlayed,
          dependencies: ['totalPoints', 'gamesPlayed']
        },
        ...mockSyncCalculations
      ];

      const data = {
        wins: 10,
        draws: 5,
        losses: 3,
        goalsFor: 25,
        goalsAgainst: 15
      };

      const result = service.calculateSync(data, dependentCalculations);

      expect(result.success).toBe(true);
      expect(result.results).toHaveProperty('pointsPerGame');
      expect(result.results.pointsPerGame).toBeCloseTo(1.94, 2);
    });

    it('should detect circular dependencies', () => {
      const circularCalculations: SyncCalculation[] = [
        {
          field: 'fieldA',
          calculator: (data: any) => data.fieldB + 1,
          dependencies: ['fieldB']
        },
        {
          field: 'fieldB',
          calculator: (data: any) => data.fieldA + 1,
          dependencies: ['fieldA']
        }
      ];

      const data = {};
      const result = service.calculateSync(data, circularCalculations);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Circular dependency');
    });
  });

  describe('scheduleAsync', () => {
    it('should schedule async calculations', async () => {
      const data = {
        goalsFor: 25,
        gamesPlayed: 18
      };

      const jobIds = service.scheduleAsync(data, mockAsyncCalculations);

      expect(jobIds).toHaveLength(2);
      expect(jobIds[0]).toMatch(/^[a-f0-9-]{36}$/); // UUID format
      expect(jobIds[1]).toMatch(/^[a-f0-9-]{36}$/);
    });

    it('should prioritize high priority calculations', async () => {
      const data = { goalsFor: 25, gamesPlayed: 18 };
      
      const jobIds = service.scheduleAsync(data, mockAsyncCalculations);
      
      // Wait for calculations to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      const highPriorityStatus = service.getCalculationStatus(jobIds[0]);
      const mediumPriorityStatus = service.getCalculationStatus(jobIds[1]);

      expect(highPriorityStatus.status).toBe('completed');
      expect(mediumPriorityStatus.status).toBe('completed');
      
      // High priority should complete first
      expect(highPriorityStatus.completedAt).toBeLessThanOrEqual(mediumPriorityStatus.completedAt!);
    });

    it('should handle async calculation errors', async () => {
      const errorCalculation: AsyncCalculation = {
        name: 'error-calculation',
        calculator: async (data: any) => {
          throw new Error('Async calculation failed');
        },
        priority: 'high'
      };

      const data = {};
      const jobIds = service.scheduleAsync(data, [errorCalculation]);

      // Wait for calculation to fail
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = service.getCalculationStatus(jobIds[0]);

      expect(status.status).toBe('failed');
      expect(status.error).toBe('Async calculation failed');
    });
  });

  describe('getCalculationStatus', () => {
    it('should return status for existing job', async () => {
      const data = { goalsFor: 25, gamesPlayed: 18 };
      const jobIds = service.scheduleAsync(data, [mockAsyncCalculations[0]]);

      const status = service.getCalculationStatus(jobIds[0]);

      expect(status.jobId).toBe(jobIds[0]);
      expect(status.name).toBe('team-statistics');
      expect(['pending', 'running', 'completed']).toContain(status.status);
    });

    it('should return not found for non-existent job', () => {
      const status = service.getCalculationStatus('non-existent-id');

      expect(status.status).toBe('not_found');
    });

    it('should track job progress', async () => {
      const data = { goalsFor: 25, gamesPlayed: 18 };
      const jobIds = service.scheduleAsync(data, [mockAsyncCalculations[0]]);

      const initialStatus = service.getCalculationStatus(jobIds[0]);
      expect(initialStatus.status).toBe('pending');

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 150));

      const finalStatus = service.getCalculationStatus(jobIds[0]);
      expect(finalStatus.status).toBe('completed');
      expect(finalStatus.result).toBeDefined();
      expect(finalStatus.completedAt).toBeDefined();
    });
  });

  describe('calculation dependencies', () => {
    it('should wait for dependencies before calculating', () => {
      const data = {
        wins: 10,
        draws: 5,
        losses: 3
      };

      // This calculation depends on gamesPlayed which is calculated from wins, draws, losses
      const dependentCalculation: SyncCalculation = {
        field: 'winPercentage',
        calculator: (data: any) => (data.wins / data.gamesPlayed) * 100,
        dependencies: ['wins', 'gamesPlayed']
      };

      const calculations = [...mockSyncCalculations, dependentCalculation];
      const result = service.calculateSync(data, calculations);

      expect(result.success).toBe(true);
      expect(result.results).toHaveProperty('winPercentage');
      expect(result.results.winPercentage).toBeCloseTo(55.56, 2);
    });

    it('should handle missing dependencies', () => {
      const data = {
        wins: 10
        // Missing draws and losses needed for gamesPlayed
      };

      const dependentCalculation: SyncCalculation = {
        field: 'winPercentage',
        calculator: (data: any) => {
          if (!data.gamesPlayed || data.gamesPlayed === 0) {
            throw new Error('Cannot calculate percentage without games played');
          }
          return (data.wins / data.gamesPlayed) * 100;
        },
        dependencies: ['wins', 'gamesPlayed']
      };

      const calculations = [...mockSyncCalculations, dependentCalculation];
      const result = service.calculateSync(data, calculations);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.field === 'winPercentage')).toBe(true);
    });
  });

  describe('performance optimization', () => {
    it('should cache calculation results', () => {
      const data = {
        wins: 10,
        draws: 5,
        losses: 3,
        goalsFor: 25,
        goalsAgainst: 15
      };

      const start1 = Date.now();
      const result1 = service.calculateSync(data, mockSyncCalculations);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      const result2 = service.calculateSync(data, mockSyncCalculations);
      const time2 = Date.now() - start2;

      expect(result1).toEqual(result2);
      expect(time2).toBeLessThan(time1);
    });

    it('should invalidate cache when data changes', () => {
      const data1 = { wins: 10, draws: 5, losses: 3 };
      const data2 = { wins: 11, draws: 5, losses: 3 };

      const result1 = service.calculateSync(data1, mockSyncCalculations);
      const result2 = service.calculateSync(data2, mockSyncCalculations);

      expect(result1.results.totalPoints).toBe(35);
      expect(result2.results.totalPoints).toBe(38);
    });

    it('should limit concurrent async calculations', async () => {
      const manyCalculations = Array.from({ length: 10 }, (_, i) => ({
        name: `calculation-${i}`,
        calculator: async (data: any) => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { result: i };
        },
        priority: 'medium' as const
      }));

      const data = {};
      const jobIds = service.scheduleAsync(data, manyCalculations);

      expect(jobIds).toHaveLength(10);

      // Check that not all jobs are running simultaneously
      const runningJobs = jobIds
        .map(id => service.getCalculationStatus(id))
        .filter(status => status.status === 'running');

      expect(runningJobs.length).toBeLessThanOrEqual(5); // Assuming max 5 concurrent
    });
  });

  describe('error recovery', () => {
    it('should provide fallback values for failed calculations', () => {
      const calculationWithFallback: SyncCalculation = {
        field: 'complexCalculation',
        calculator: (data: any) => {
          throw new Error('Calculation failed');
        },
        dependencies: [],
        fallbackValue: 0
      };

      const data = {};
      const result = service.calculateSync(data, [calculationWithFallback]);

      expect(result.success).toBe(true);
      expect(result.results.complexCalculation).toBe(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('Using fallback value');
    });

    it('should retry failed async calculations', async () => {
      let attempts = 0;
      const retryCalculation: AsyncCalculation = {
        name: 'retry-calculation',
        calculator: async (data: any) => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return { success: true };
        },
        priority: 'high',
        maxRetries: 3
      };

      const data = {};
      const jobIds = service.scheduleAsync(data, [retryCalculation]);

      // Wait for retries to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const status = service.getCalculationStatus(jobIds[0]);

      expect(status.status).toBe('completed');
      expect(attempts).toBe(3);
    });
  });
});