/**
 * Test suite for enhanced Spiel Lifecycle Hooks with club support
 * Tests the implementation of task 7: Update Lifecycle Hooks for club support
 */

const { SpielLifecycleImpl, EnhancedTriggerConditionImpl, SpielStatus, Priority } = require('../src/api/spiel/lifecycles');

describe('Spiel Lifecycle Hooks - Club Support', () => {
  let lifecycleImpl;
  let mockStrapi;
  let mockValidationService;
  let mockQueueManager;

  beforeEach(() => {
    // Mock Strapi
    mockStrapi = {
      service: jest.fn(),
      entityService: {
        findOne: jest.fn(),
        findMany: jest.fn()
      },
      log: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      }
    };

    // Mock validation service
    mockValidationService = {
      validateSpielResult: jest.fn()
    };

    // Mock queue manager
    mockQueueManager = {
      addCalculationJob: jest.fn()
    };

    // Mock club service
    const mockClubService = {
      validateClubInLiga: jest.fn()
    };

    mockStrapi.service.mockReturnValue(mockClubService);

    // Create lifecycle implementation
    lifecycleImpl = new SpielLifecycleImpl(mockValidationService, mockQueueManager);

    // Mock global strapi
    global.strapi = mockStrapi;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.strapi;
  });

  describe('Enhanced Trigger Conditions', () => {
    let triggerCondition;

    beforeEach(() => {
      triggerCondition = new EnhancedTriggerConditionImpl();
    });

    test('should detect club field changes', () => {
      const oldData = {
        id: 1,
        status: SpielStatus.GEPLANT,
        heim_club: { id: 1, name: 'Club A' },
        gast_club: { id: 2, name: 'Club B' },
        heim_tore: undefined,
        gast_tore: undefined,
        liga: { id: 1, name: 'Liga 1' },
        saison: { id: 1, name: '2024/25' }
      };

      const newData = {
        ...oldData,
        heim_club: { id: 3, name: 'Club C' } // Changed home club
      };

      const changedFields = triggerCondition.getChangedFields(oldData, newData);
      expect(changedFields).toContain('heim_club');
    });

    test('should detect team-to-club migration', () => {
      const oldData = {
        id: 1,
        status: SpielStatus.GEPLANT,
        heim_team: { id: 1, name: 'Team A' },
        gast_team: { id: 2, name: 'Team B' },
        liga: { id: 1, name: 'Liga 1' },
        saison: { id: 1, name: '2024/25' }
      };

      const newData = {
        id: 1,
        status: SpielStatus.GEPLANT,
        heim_club: { id: 1, name: 'Club A' },
        gast_club: { id: 2, name: 'Club B' },
        liga: { id: 1, name: 'Liga 1' },
        saison: { id: 1, name: '2024/25' }
      };

      const changedFields = triggerCondition.getChangedFields(oldData, newData);
      expect(changedFields).toContain('migration_team_to_club');
    });

    test('should identify relevant club changes', () => {
      const changedFields = ['heim_club', 'gast_club', 'status'];
      const isRelevant = triggerCondition.isRelevantChange(changedFields);
      expect(isRelevant).toBe(true);
    });

    test('should validate club trigger conditions', () => {
      const spiel = {
        id: 1,
        heim_club: { id: 1, name: 'Club A' },
        gast_club: { id: 2, name: 'Club B' },
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1
      };

      const validation = triggerCondition.validateClubTriggerConditions(spiel);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject club playing against itself', () => {
      const spiel = {
        id: 1,
        heim_club: { id: 1, name: 'Club A' },
        gast_club: { id: 1, name: 'Club A' }, // Same club
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1
      };

      const validation = triggerCondition.validateClubTriggerConditions(spiel);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('A club cannot play against itself');
    });

    test('should determine correct priority for migration', () => {
      const changedFields = ['migration_team_to_club'];
      const priority = triggerCondition.getCalculationPriority(changedFields);
      expect(priority).toBe(Priority.HIGH);
    });
  });

  describe('Club Data Validation', () => {
    beforeEach(() => {
      // Mock club service methods
      const mockClubService = {
        validateClubInLiga: jest.fn()
      };
      mockStrapi.service.mockReturnValue(mockClubService);
    });

    test('should validate club data successfully', async () => {
      // Mock club entities
      const heimClub = { id: 1, name: 'Club A', aktiv: true, ligen: [{ id: 1 }] };
      const gastClub = { id: 2, name: 'Club B', aktiv: true, ligen: [{ id: 1 }] };

      mockStrapi.entityService.findOne
        .mockResolvedValueOnce(heimClub)
        .mockResolvedValueOnce(gastClub);

      mockStrapi.service().validateClubInLiga
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const spiel = {
        id: 1,
        heim_club: { id: 1, name: 'Club A' },
        gast_club: { id: 2, name: 'Club B' },
        liga: { id: 1, name: 'Liga 1' },
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1
      };

      const validation = await lifecycleImpl.validateClubData(spiel);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject inactive clubs', async () => {
      // Mock inactive club
      const heimClub = { id: 1, name: 'Club A', aktiv: false, ligen: [{ id: 1 }] };
      const gastClub = { id: 2, name: 'Club B', aktiv: true, ligen: [{ id: 1 }] };

      mockStrapi.entityService.findOne
        .mockResolvedValueOnce(heimClub)
        .mockResolvedValueOnce(gastClub);

      const spiel = {
        id: 1,
        heim_club: { id: 1, name: 'Club A' },
        gast_club: { id: 2, name: 'Club B' },
        liga: { id: 1, name: 'Liga 1' },
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1
      };

      const validation = await lifecycleImpl.validateClubData(spiel);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Home club "Club A" is inactive');
    });

    test('should reject clubs not in league', async () => {
      // Mock clubs
      const heimClub = { id: 1, name: 'Club A', aktiv: true, ligen: [{ id: 1 }] };
      const gastClub = { id: 2, name: 'Club B', aktiv: true, ligen: [{ id: 2 }] };

      mockStrapi.entityService.findOne
        .mockResolvedValueOnce(heimClub)
        .mockResolvedValueOnce(gastClub);

      mockStrapi.service().validateClubInLiga
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false); // Away club not in league

      const spiel = {
        id: 1,
        heim_club: { id: 1, name: 'Club A' },
        gast_club: { id: 2, name: 'Club B' },
        liga: { id: 1, name: 'Liga 1' },
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1
      };

      const validation = await lifecycleImpl.validateClubData(spiel);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(error => error.includes('not assigned to league'))).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    test('should process team-based games', () => {
      const spiel = {
        id: 1,
        heim_team: { id: 1, name: 'Team A' },
        gast_team: { id: 2, name: 'Team B' },
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1
      };

      const canProcess = lifecycleImpl.canProcessWithTeamData(spiel);
      expect(canProcess).toBe(true);
    });

    test('should reject team playing against itself', () => {
      const spiel = {
        id: 1,
        heim_team: { id: 1, name: 'Team A' },
        gast_team: { id: 1, name: 'Team A' }, // Same team
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1
      };

      const canProcess = lifecycleImpl.canProcessWithTeamData(spiel);
      expect(canProcess).toBe(false);
    });

    test('should handle workflow compatibility for club games', async () => {
      // Mock successful club validation
      const heimClub = { id: 1, name: 'Club A', aktiv: true, ligen: [{ id: 1 }] };
      const gastClub = { id: 2, name: 'Club B', aktiv: true, ligen: [{ id: 1 }] };

      mockStrapi.entityService.findOne
        .mockResolvedValueOnce(heimClub)
        .mockResolvedValueOnce(gastClub);

      mockStrapi.service().validateClubInLiga
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const spiel = {
        id: 1,
        heim_club: { id: 1, name: 'Club A' },
        gast_club: { id: 2, name: 'Club B' },
        liga: { id: 1, name: 'Liga 1' },
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1
      };

      const compatibility = await lifecycleImpl.ensureWorkflowCompatibility(spiel, 'create');
      expect(compatibility.isCompatible).toBe(true);
      expect(compatibility.recommendedAction).toBe('proceed');
    });

    test('should handle workflow compatibility with fallback', async () => {
      // Mock failed club validation but valid team data
      mockStrapi.entityService.findOne
        .mockResolvedValueOnce(null) // Club not found
        .mockResolvedValueOnce(null);

      const spiel = {
        id: 1,
        heim_club: { id: 999, name: 'Invalid Club' },
        gast_club: { id: 998, name: 'Invalid Club' },
        heim_team: { id: 1, name: 'Team A' },
        gast_team: { id: 2, name: 'Team B' },
        liga: { id: 1, name: 'Liga 1' },
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1
      };

      const compatibility = await lifecycleImpl.ensureWorkflowCompatibility(spiel, 'create');
      expect(compatibility.isCompatible).toBe(false);
      expect(compatibility.fallbackAvailable).toBe(true);
      expect(compatibility.recommendedAction).toBe('fallback');
    });
  });

  describe('Lifecycle Hook Integration', () => {
    beforeEach(() => {
      // Mock successful validation
      mockValidationService.validateSpielResult.mockReturnValue({
        isValid: true,
        errors: []
      });

      // Mock successful queue job
      mockQueueManager.addCalculationJob.mockResolvedValue('job-123');

      // Mock feature flags
      global.shouldRunAutomation = jest.fn().mockReturnValue(true);
    });

    test('should handle club-based game creation', async () => {
      // Create a new lifecycle implementation with proper strapi mock
      const testLifecycle = new SpielLifecycleImpl(mockValidationService, mockQueueManager);
      
      // Mock the validateClubData method to return success
      testLifecycle.validateClubData = jest.fn().mockResolvedValue({
        isValid: true,
        errors: []
      });

      // Mock the validateLigaConsistency method
      testLifecycle.validateLigaConsistency = jest.fn().mockResolvedValue({
        isValid: true,
        errors: []
      });

      // Mock the ensureWorkflowCompatibility method
      testLifecycle.ensureWorkflowCompatibility = jest.fn().mockResolvedValue({
        isCompatible: true,
        fallbackAvailable: false,
        recommendedAction: 'proceed',
        details: 'Club-based game is valid'
      });

      const event = {
        result: {
          id: 1,
          heim_club: { id: 1, name: 'Club A' },
          gast_club: { id: 2, name: 'Club B' },
          liga: { id: 1, name: 'Liga 1' },
          saison: { id: 1, name: '2024/25' },
          status: SpielStatus.BEENDET,
          heim_tore: 2,
          gast_tore: 1
        }
      };

      await testLifecycle.afterCreate(event);

      expect(mockQueueManager.addCalculationJob).toHaveBeenCalledWith(1, 1, expect.any(Number));
    });

    test('should handle team-based game with fallback', async () => {
      const event = {
        result: {
          id: 1,
          heim_team: { id: 1, name: 'Team A' },
          gast_team: { id: 2, name: 'Team B' },
          liga: { id: 1, name: 'Liga 1' },
          saison: { id: 1, name: '2024/25' },
          status: SpielStatus.BEENDET,
          heim_tore: 2,
          gast_tore: 1
        }
      };

      await lifecycleImpl.afterCreate(event);

      expect(mockQueueManager.addCalculationJob).toHaveBeenCalledWith(1, 1, expect.any(Number));
    });

    test('should handle migration scenario in update', async () => {
      // Mock successful club validation for new data
      const heimClub = { id: 1, name: 'Club A', aktiv: true, ligen: [{ id: 1 }] };
      const gastClub = { id: 2, name: 'Club B', aktiv: true, ligen: [{ id: 1 }] };

      mockStrapi.entityService.findOne
        .mockResolvedValueOnce(heimClub)
        .mockResolvedValueOnce(gastClub)
        .mockResolvedValueOnce({ id: 1, name: 'Liga 1', aktiv: true })
        .mockResolvedValueOnce({ id: 1, name: '2024/25', aktiv: true });

      mockStrapi.service().validateClubInLiga
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const event = {
        result: {
          id: 1,
          heim_club: { id: 1, name: 'Club A' },
          gast_club: { id: 2, name: 'Club B' },
          liga: { id: 1, name: 'Liga 1' },
          saison: { id: 1, name: '2024/25' },
          status: SpielStatus.BEENDET,
          heim_tore: 2,
          gast_tore: 1
        },
        state: {
          previousData: {
            id: 1,
            heim_team: { id: 1, name: 'Team A' },
            gast_team: { id: 2, name: 'Team B' },
            liga: { id: 1, name: 'Liga 1' },
            saison: { id: 1, name: '2024/25' },
            status: SpielStatus.BEENDET,
            heim_tore: 2,
            gast_tore: 1
          }
        }
      };

      await lifecycleImpl.afterUpdate(event);

      expect(mockQueueManager.addCalculationJob).toHaveBeenCalledWith(1, 1, Priority.HIGH);
    });
  });
});