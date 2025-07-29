/**
 * Unit tests for Spiel Lifecycle Hooks
 * Tests automatic table calculation triggering on game changes
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { 
  SpielLifecycleImpl, 
  TriggerConditionImpl,
  LifecycleEvent,
  LifecycleOperation,
  SpielEntity,
  SpielStatus,
  Priority,
  HookConfiguration,
  DEFAULT_HOOK_CONFIG
} from '../../../src/api/spiel/lifecycles';
import { SpielValidationService } from '../../../src/api/spiel/services/validation';
import { QueueManagerImpl } from '../../../src/api/tabellen-eintrag/services/queue-manager';

// Mock dependencies
jest.mock('../../../src/api/spiel/services/validation');
jest.mock('../../../src/api/tabellen-eintrag/services/queue-manager');
jest.mock('../../../src/api/tabellen-eintrag/services/tabellen-berechnung');

describe('SpielLifecycleImpl', () => {
  let lifecycle: SpielLifecycleImpl;
  let mockValidationService: SpielValidationService;
  let mockQueueManager: QueueManagerImpl;
  let mockConfig: HookConfiguration;

  // Test data
  const mockLiga = { id: 1, name: 'Test Liga' };
  const mockSaison = { id: 1, name: '2023/24', jahr: 2023 };
  const mockHeimTeam = { id: 1, name: 'Team A' };
  const mockGastTeam = { id: 2, name: 'Team B' };

  const createMockSpiel = (overrides: Partial<SpielEntity> = {}): SpielEntity => ({
    id: 1,
    datum: '2023-10-15T15:00:00Z',
    liga: mockLiga,
    saison: mockSaison,
    heim_team: mockHeimTeam,
    gast_team: mockGastTeam,
    heim_tore: 2,
    gast_tore: 1,
    spieltag: 10,
    status: SpielStatus.BEENDET,
    notizen: '',
    ...overrides
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock instances
    mockValidationService = new SpielValidationService();
    mockQueueManager = {} as QueueManagerImpl;
    mockConfig = { ...DEFAULT_HOOK_CONFIG };

    // Mock validation service methods
    jest.mocked(mockValidationService.validateSpielResult).mockReturnValue({
      isValid: true,
      errors: []
    });

    // Mock queue manager methods
    mockQueueManager.addCalculationJob = jest.fn().mockResolvedValue('job_123');
    mockQueueManager.getQueueStatus = jest.fn().mockReturnValue({
      isRunning: false,
      totalJobs: 0,
      pendingJobs: 0,
      processingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0
    });
    mockQueueManager.pauseQueue = jest.fn();
    mockQueueManager.resumeQueue = jest.fn();

    // Create lifecycle instance with mocks
    lifecycle = new SpielLifecycleImpl(mockValidationService, mockQueueManager, mockConfig);
  });

  describe('afterCreate', () => {
    it('should trigger calculation for completed games', async () => {
      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      await lifecycle.afterCreate(event);

      expect(mockValidationService.validateSpielResult).toHaveBeenCalledWith(spiel);
      expect(mockQueueManager.addCalculationJob).toHaveBeenCalledWith(
        mockLiga.id,
        mockSaison.id,
        expect.any(Number)
      );
    });

    it('should not trigger calculation for planned games', async () => {
      const spiel = createMockSpiel({ 
        status: SpielStatus.GEPLANT,
        heim_tore: undefined,
        gast_tore: undefined
      });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      await lifecycle.afterCreate(event);

      expect(mockQueueManager.addCalculationJob).not.toHaveBeenCalled();
    });

    it('should not trigger calculation for completed games without scores', async () => {
      const spiel = createMockSpiel({ 
        status: SpielStatus.BEENDET,
        heim_tore: undefined,
        gast_tore: undefined
      });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      await lifecycle.afterCreate(event);

      expect(mockQueueManager.addCalculationJob).not.toHaveBeenCalled();
    });

    it('should not trigger calculation when validation fails', async () => {
      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      jest.mocked(mockValidationService.validateSpielResult).mockReturnValue({
        isValid: false,
        errors: [{ field: 'heim_tore', message: 'Invalid score', code: 'NEGATIVE_SCORE' as any }]
      });

      await lifecycle.afterCreate(event);

      expect(mockQueueManager.addCalculationJob).not.toHaveBeenCalled();
    });

    it('should not trigger calculation when hooks are disabled', async () => {
      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      lifecycle.updateConfig({ enabled: false });

      await lifecycle.afterCreate(event);

      expect(mockQueueManager.addCalculationJob).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully in async mode', async () => {
      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      jest.mocked(mockQueueManager.addCalculationJob).mockRejectedValue(new Error('Queue error'));

      // Should not throw in async mode
      await expect(lifecycle.afterCreate(event)).resolves.toBeUndefined();
    });
  });

  describe('afterUpdate', () => {
    it('should trigger calculation when status changes to completed', async () => {
      const oldSpiel = createMockSpiel({ 
        status: SpielStatus.GEPLANT,
        heim_tore: undefined,
        gast_tore: undefined
      });
      const newSpiel = createMockSpiel({ status: SpielStatus.BEENDET });
      
      const event: LifecycleEvent = {
        result: newSpiel,
        params: {},
        state: { previousData: oldSpiel }
      };

      await lifecycle.afterUpdate(event);

      expect(mockValidationService.validateSpielResult).toHaveBeenCalledWith(newSpiel);
      expect(mockQueueManager.addCalculationJob).toHaveBeenCalledWith(
        mockLiga.id,
        mockSaison.id,
        expect.any(Number)
      );
    });

    it('should trigger calculation when scores change', async () => {
      const oldSpiel = createMockSpiel({ heim_tore: 1, gast_tore: 0 });
      const newSpiel = createMockSpiel({ heim_tore: 2, gast_tore: 1 });
      
      const event: LifecycleEvent = {
        result: newSpiel,
        params: {},
        state: { previousData: oldSpiel }
      };

      await lifecycle.afterUpdate(event);

      expect(mockQueueManager.addCalculationJob).toHaveBeenCalledWith(
        mockLiga.id,
        mockSaison.id,
        expect.any(Number)
      );
    });

    it('should not trigger calculation when irrelevant fields change', async () => {
      const oldSpiel = createMockSpiel({ notizen: 'Old notes' });
      const newSpiel = createMockSpiel({ notizen: 'New notes' });
      
      const event: LifecycleEvent = {
        result: newSpiel,
        params: {},
        state: { previousData: oldSpiel }
      };

      await lifecycle.afterUpdate(event);

      expect(mockQueueManager.addCalculationJob).not.toHaveBeenCalled();
    });

    it('should not trigger calculation without previous data', async () => {
      const newSpiel = createMockSpiel({ status: SpielStatus.BEENDET });
      
      const event: LifecycleEvent = {
        result: newSpiel,
        params: {}
      };

      await lifecycle.afterUpdate(event);

      expect(mockQueueManager.addCalculationJob).not.toHaveBeenCalled();
    });

    it('should not trigger calculation when validation fails', async () => {
      const oldSpiel = createMockSpiel({ status: SpielStatus.GEPLANT });
      const newSpiel = createMockSpiel({ status: SpielStatus.BEENDET });
      
      const event: LifecycleEvent = {
        result: newSpiel,
        params: {},
        state: { previousData: oldSpiel }
      };

      jest.mocked(mockValidationService.validateSpielResult).mockReturnValue({
        isValid: false,
        errors: [{ field: 'heim_tore', message: 'Invalid score', code: 'NEGATIVE_SCORE' as any }]
      });

      await lifecycle.afterUpdate(event);

      expect(mockQueueManager.addCalculationJob).not.toHaveBeenCalled();
    });
  });

  describe('afterDelete', () => {
    it('should trigger recalculation for deleted completed games', async () => {
      const deletedSpiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: deletedSpiel,
        params: {}
      };

      await lifecycle.afterDelete(event);

      expect(mockQueueManager.addCalculationJob).toHaveBeenCalledWith(
        mockLiga.id,
        mockSaison.id,
        Priority.HIGH
      );
    });

    it('should not trigger recalculation for deleted planned games', async () => {
      const deletedSpiel = createMockSpiel({ 
        status: SpielStatus.GEPLANT,
        heim_tore: undefined,
        gast_tore: undefined
      });
      const event: LifecycleEvent = {
        result: deletedSpiel,
        params: {}
      };

      await lifecycle.afterDelete(event);

      expect(mockQueueManager.addCalculationJob).not.toHaveBeenCalled();
    });

    it('should not trigger recalculation for deleted games without scores', async () => {
      const deletedSpiel = createMockSpiel({ 
        status: SpielStatus.BEENDET,
        heim_tore: undefined,
        gast_tore: undefined
      });
      const event: LifecycleEvent = {
        result: deletedSpiel,
        params: {}
      };

      await lifecycle.afterDelete(event);

      expect(mockQueueManager.addCalculationJob).not.toHaveBeenCalled();
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = { enabled: false, priority: Priority.LOW };
      
      lifecycle.updateConfig(newConfig);
      
      const currentConfig = lifecycle.getConfig();
      expect(currentConfig.enabled).toBe(false);
      expect(currentConfig.priority).toBe(Priority.LOW);
    });

    it('should get current configuration', () => {
      const config = lifecycle.getConfig();
      
      expect(config).toEqual(mockConfig);
    });
  });

  describe('queue management', () => {
    it('should get queue status', () => {
      const status = lifecycle.getQueueStatus();
      
      expect(mockQueueManager.getQueueStatus).toHaveBeenCalled();
      expect(status).toBeDefined();
    });

    it('should pause queue', () => {
      lifecycle.pauseQueue();
      
      expect(mockQueueManager.pauseQueue).toHaveBeenCalled();
    });

    it('should resume queue', () => {
      lifecycle.resumeQueue();
      
      expect(mockQueueManager.resumeQueue).toHaveBeenCalled();
    });
  });
});

describe('TriggerConditionImpl', () => {
  let triggerCondition: TriggerConditionImpl;

  const mockLiga = { id: 1, name: 'Test Liga' };
  const mockSaison = { id: 1, name: '2023/24', jahr: 2023 };
  const mockHeimTeam = { id: 1, name: 'Team A' };
  const mockGastTeam = { id: 2, name: 'Team B' };

  const createMockSpiel = (overrides: Partial<SpielEntity> = {}): SpielEntity => ({
    id: 1,
    datum: '2023-10-15T15:00:00Z',
    liga: mockLiga,
    saison: mockSaison,
    heim_team: mockHeimTeam,
    gast_team: mockGastTeam,
    heim_tore: 2,
    gast_tore: 1,
    spieltag: 10,
    status: SpielStatus.BEENDET,
    notizen: '',
    ...overrides
  });

  beforeEach(() => {
    triggerCondition = new TriggerConditionImpl();
  });

  describe('shouldTriggerCalculation', () => {
    it('should trigger for completed games without previous data', () => {
      const spiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      const result = triggerCondition.shouldTriggerCalculation(event);

      expect(result).toBe(true);
    });

    it('should not trigger for planned games without previous data', () => {
      const spiel = createMockSpiel({ 
        status: SpielStatus.GEPLANT,
        heim_tore: undefined,
        gast_tore: undefined
      });
      const event: LifecycleEvent = {
        result: spiel,
        params: {}
      };

      const result = triggerCondition.shouldTriggerCalculation(event);

      expect(result).toBe(false);
    });

    it('should trigger when status changes to completed', () => {
      const oldSpiel = createMockSpiel({ status: SpielStatus.GEPLANT });
      const newSpiel = createMockSpiel({ status: SpielStatus.BEENDET });
      const event: LifecycleEvent = {
        result: newSpiel,
        params: {},
        state: { previousData: oldSpiel }
      };

      const result = triggerCondition.shouldTriggerCalculation(event);

      expect(result).toBe(true);
    });

    it('should trigger when scores change', () => {
      const oldSpiel = createMockSpiel({ heim_tore: 1, gast_tore: 0 });
      const newSpiel = createMockSpiel({ heim_tore: 2, gast_tore: 1 });
      const event: LifecycleEvent = {
        result: newSpiel,
        params: {},
        state: { previousData: oldSpiel }
      };

      const result = triggerCondition.shouldTriggerCalculation(event);

      expect(result).toBe(true);
    });

    it('should not trigger when only irrelevant fields change', () => {
      const oldSpiel = createMockSpiel({ notizen: 'Old notes' });
      const newSpiel = createMockSpiel({ notizen: 'New notes' });
      const event: LifecycleEvent = {
        result: newSpiel,
        params: {},
        state: { previousData: oldSpiel }
      };

      const result = triggerCondition.shouldTriggerCalculation(event);

      expect(result).toBe(false);
    });
  });

  describe('getChangedFields', () => {
    it('should detect status changes', () => {
      const oldSpiel = createMockSpiel({ status: SpielStatus.GEPLANT });
      const newSpiel = createMockSpiel({ status: SpielStatus.BEENDET });

      const changedFields = triggerCondition.getChangedFields(oldSpiel, newSpiel);

      expect(changedFields).toContain('status');
    });

    it('should detect score changes', () => {
      const oldSpiel = createMockSpiel({ heim_tore: 1, gast_tore: 0 });
      const newSpiel = createMockSpiel({ heim_tore: 2, gast_tore: 1 });

      const changedFields = triggerCondition.getChangedFields(oldSpiel, newSpiel);

      expect(changedFields).toContain('heim_tore');
      expect(changedFields).toContain('gast_tore');
    });

    it('should detect team changes', () => {
      const oldSpiel = createMockSpiel({ heim_team: { id: 1, name: 'Team A' } });
      const newSpiel = createMockSpiel({ heim_team: { id: 3, name: 'Team C' } });

      const changedFields = triggerCondition.getChangedFields(oldSpiel, newSpiel);

      expect(changedFields).toContain('heim_team');
    });

    it('should detect league changes', () => {
      const oldSpiel = createMockSpiel({ liga: { id: 1, name: 'Liga A' } });
      const newSpiel = createMockSpiel({ liga: { id: 2, name: 'Liga B' } });

      const changedFields = triggerCondition.getChangedFields(oldSpiel, newSpiel);

      expect(changedFields).toContain('liga');
    });

    it('should return empty array when no relevant fields change', () => {
      const oldSpiel = createMockSpiel({ notizen: 'Old notes' });
      const newSpiel = createMockSpiel({ notizen: 'New notes' });

      const changedFields = triggerCondition.getChangedFields(oldSpiel, newSpiel);

      expect(changedFields).toHaveLength(0);
    });
  });

  describe('isRelevantChange', () => {
    it('should return true for status changes', () => {
      const result = triggerCondition.isRelevantChange(['status']);
      expect(result).toBe(true);
    });

    it('should return true for score changes', () => {
      const result = triggerCondition.isRelevantChange(['heim_tore', 'gast_tore']);
      expect(result).toBe(true);
    });

    it('should return true for team changes', () => {
      const result = triggerCondition.isRelevantChange(['heim_team']);
      expect(result).toBe(true);
    });

    it('should return false for irrelevant changes', () => {
      const result = triggerCondition.isRelevantChange(['notizen', 'datum']);
      expect(result).toBe(false);
    });

    it('should return false for empty changes', () => {
      const result = triggerCondition.isRelevantChange([]);
      expect(result).toBe(false);
    });
  });
});