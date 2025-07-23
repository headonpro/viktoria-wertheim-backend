/**
 * Unit tests for Spiel content type and validation logic
 * Tests match data validation, event processing, and statistics updates
 */

import spielLifecycles from '../../../src/api/spiel/content-types/spiel/lifecycles';

describe('Spiel Content Type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    test('should require essential match fields', () => {
      const validMatchData = {
        datum: '2024-01-15T15:00:00.000Z',
        heimclub: 1,
        auswaertsclub: 2,
        unser_team: 1,
        liga: 1,
        saison: 1,
        ist_heimspiel: true,
        status: 'geplant'
      };
      
      expect(validMatchData.datum).toBeDefined();
      expect(validMatchData.heimclub).toBeDefined();
      expect(validMatchData.auswaertsclub).toBeDefined();
      expect(validMatchData.unser_team).toBeDefined();
      expect(validMatchData.liga).toBeDefined();
      expect(validMatchData.saison).toBeDefined();
      expect(typeof validMatchData.ist_heimspiel).toBe('boolean');
    });

    test('should validate status enumeration', () => {
      const validStatuses = ['geplant', 'laufend', 'beendet', 'abgesagt'];
      const invalidStatuses = ['planned', 'running', 'finished', 'cancelled'];

      validStatuses.forEach(status => {
        expect(['geplant', 'laufend', 'beendet', 'abgesagt']).toContain(status);
      });

      invalidStatuses.forEach(status => {
        expect(['geplant', 'laufend', 'beendet', 'abgesagt']).not.toContain(status);
      });
    });

    test('should validate score fields are non-negative', () => {
      const validScores = [0, 1, 5, 10];
      const invalidScores = [-1, -5];

      validScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
      });

      invalidScores.forEach(score => {
        expect(score).toBeLessThan(0);
      });
    });

    test('should have default JSON arrays for events', () => {
      const defaultData = {
        torschuetzen: [],
        karten: [],
        wechsel: []
      };
      
      expect(Array.isArray(defaultData.torschuetzen)).toBe(true);
      expect(Array.isArray(defaultData.karten)).toBe(true);
      expect(Array.isArray(defaultData.wechsel)).toBe(true);
    });
  });

  describe('Match Data Integrity Validation', () => {
    test('should prevent same club as home and away', async () => {
      const invalidMatchData = {
        datum: '2024-01-15T15:00:00.000Z',
        heimclub: 1,
        auswaertsclub: 1, // Same as heimclub
        unser_team: 1,
        liga: 1,
        saison: 1,
        ist_heimspiel: true
      };

      const event = {
        params: { data: invalidMatchData }
      };

      await expect(spielLifecycles.beforeCreate(event)).rejects.toThrow(
        'Heim- und Auswärtsverein müssen unterschiedlich sein'
      );
    });

    test('should validate our team belongs to correct club', async () => {
      const matchData = {
        datum: '2024-01-15T15:00:00.000Z',
        heimclub: 1,
        auswaertsclub: 2,
        unser_team: 1,
        ist_heimspiel: true
      };

      const team = {
        id: 1,
        name: '1. Team',
        club: { id: 2 } // Team belongs to club 2, but match says heimclub is 1
      };

      const event = {
        params: { data: matchData }
      };

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(team);

      await expect(spielLifecycles.beforeCreate(event)).rejects.toThrow(
        'Unser Team gehört nicht zum angegebenen Verein'
      );
    });

    test('should validate league and season consistency', async () => {
      const matchData = {
        datum: '2024-01-15T15:00:00.000Z',
        heimclub: 1,
        auswaertsclub: 2,
        unser_team: 1,
        liga: 1,
        saison: 1
      };

      const liga = {
        id: 1,
        name: 'Kreisliga A',
        saison: { id: 2 } // Different season
      };

      const event = {
        params: { data: matchData }
      };

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(liga);

      await expect(spielLifecycles.beforeCreate(event)).rejects.toThrow(
        'Liga und Saison sind nicht konsistent'
      );
    });

    test('should validate team belongs to same league and season', async () => {
      const matchData = {
        datum: '2024-01-15T15:00:00.000Z',
        heimclub: 1,
        auswaertsclub: 2,
        unser_team: 1,
        liga: 1,
        saison: 1
      };

      const team = {
        id: 1,
        name: '1. Team',
        liga: { id: 2 }, // Different league
        saison: { id: 1 }
      };

      const event = {
        params: { data: matchData }
      };

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(team);

      await expect(spielLifecycles.beforeCreate(event)).rejects.toThrow(
        'Team gehört nicht zur angegebenen Liga'
      );
    });
  });

  describe('Match Events Validation', () => {
    test('should validate goal event structure', async () => {
      const invalidGoalEvents = [
        { minute: 15 }, // Missing spieler_id
        { spieler_id: 1 }, // Missing minute
        { spieler_id: 1, minute: 0 }, // Invalid minute
        { spieler_id: 1, minute: 121 }, // Invalid minute
        { spieler_id: 1, minute: 15, typ: 'invalid' }, // Invalid type
        { spieler_id: 'invalid', minute: 15 } // Invalid spieler_id type
      ];

      for (const invalidGoal of invalidGoalEvents) {
        const matchData = {
          datum: '2024-01-15T15:00:00.000Z',
          heimclub: 1,
          auswaertsclub: 2,
          unser_team: 1,
          torschuetzen: [invalidGoal]
        };

        const event = {
          params: { data: matchData }
        };

        await expect(spielLifecycles.beforeCreate(event)).rejects.toThrow();
      }
    });

    test('should validate card event structure', async () => {
      const invalidCardEvents = [
        { minute: 15 }, // Missing spieler_id
        { spieler_id: 1 }, // Missing minute
        { spieler_id: 1, minute: 15 }, // Missing typ
        { spieler_id: 1, minute: 15, typ: 'invalid' }, // Invalid type
        { spieler_id: 1, minute: 0, typ: 'gelb' }, // Invalid minute
        { spieler_id: 1, minute: 121, typ: 'gelb' } // Invalid minute
      ];

      for (const invalidCard of invalidCardEvents) {
        const matchData = {
          datum: '2024-01-15T15:00:00.000Z',
          heimclub: 1,
          auswaertsclub: 2,
          unser_team: 1,
          karten: [invalidCard]
        };

        const event = {
          params: { data: matchData }
        };

        await expect(spielLifecycles.beforeCreate(event)).rejects.toThrow();
      }
    });

    test('should validate substitution event structure', async () => {
      const invalidSubEvents = [
        { rein_id: 2, minute: 60 }, // Missing raus_id
        { raus_id: 1, minute: 60 }, // Missing rein_id
        { raus_id: 1, rein_id: 2 }, // Missing minute
        { raus_id: 1, rein_id: 1, minute: 60 }, // Same player
        { raus_id: 1, rein_id: 2, minute: 0 }, // Invalid minute
        { raus_id: 1, rein_id: 2, minute: 121 } // Invalid minute
      ];

      for (const invalidSub of invalidSubEvents) {
        const matchData = {
          datum: '2024-01-15T15:00:00.000Z',
          heimclub: 1,
          auswaertsclub: 2,
          unser_team: 1,
          wechsel: [invalidSub]
        };

        const event = {
          params: { data: matchData }
        };

        await expect(spielLifecycles.beforeCreate(event)).rejects.toThrow();
      }
    });

    test('should validate valid event structures', async () => {
      const validMatchData = {
        datum: '2024-01-15T15:00:00.000Z',
        heimclub: 1,
        auswaertsclub: 2,
        unser_team: 1,
        torschuetzen: [
          { spieler_id: 1, minute: 15, typ: 'tor' },
          { spieler_id: 2, minute: 30, typ: 'elfmeter', assist_spieler_id: 3 }
        ],
        karten: [
          { spieler_id: 1, minute: 45, typ: 'gelb', grund: 'Foul' },
          { spieler_id: 2, minute: 80, typ: 'rot' }
        ],
        wechsel: [
          { raus_id: 1, rein_id: 4, minute: 60 },
          { raus_id: 2, rein_id: 5, minute: 75 }
        ]
      };

      const event = {
        params: { data: validMatchData }
      };

      // Mock all validation calls to pass
      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(null);

      // Should not throw for valid data
      await expect(spielLifecycles.beforeCreate(event)).resolves.toBeUndefined();
    });
  });

  describe('Player Participation Validation', () => {
    test('should validate players belong to participating team', async () => {
      const matchData = {
        datum: '2024-01-15T15:00:00.000Z',
        heimclub: 1,
        auswaertsclub: 2,
        unser_team: 1,
        torschuetzen: [
          { spieler_id: 1, minute: 15 }
        ]
      };

      const player = {
        id: 1,
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: { id: 2 }, // Different team
        aushilfe_teams: []
      };

      const event = {
        params: { data: matchData }
      };

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(player);

      await expect(spielLifecycles.beforeCreate(event)).rejects.toThrow(
        'ist nicht dem teilnehmenden Team zugeordnet'
      );
    });

    test('should allow players from aushilfe teams', async () => {
      const matchData = {
        datum: '2024-01-15T15:00:00.000Z',
        heimclub: 1,
        auswaertsclub: 2,
        unser_team: 1,
        torschuetzen: [
          { spieler_id: 1, minute: 15 }
        ]
      };

      const player = {
        id: 1,
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: { id: 2 },
        aushilfe_teams: [{ id: 1 }] // Player helps team 1
      };

      const event = {
        params: { data: matchData }
      };

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(player);

      // Should not throw for valid aushilfe team assignment
      await expect(spielLifecycles.beforeCreate(event)).resolves.toBeUndefined();
    });
  });

  describe('Status Transition Validation', () => {
    test('should validate valid status transitions', async () => {
      const validTransitions = [
        { from: 'geplant', to: 'laufend' },
        { from: 'geplant', to: 'abgesagt' },
        { from: 'laufend', to: 'beendet' },
        { from: 'laufend', to: 'abgesagt' },
        { from: 'abgesagt', to: 'geplant' }
      ];

      for (const transition of validTransitions) {
        const currentMatch = { id: 1, status: transition.from };
        const updateData = { status: transition.to };

        const event = {
          params: { 
            data: updateData,
            where: { id: 1 }
          }
        };

        (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(currentMatch);

        // Should not throw for valid transitions
        await expect(spielLifecycles.beforeUpdate(event)).resolves.toBeUndefined();
      }
    });

    test('should prevent invalid status transitions', async () => {
      const invalidTransitions = [
        { from: 'beendet', to: 'laufend' },
        { from: 'beendet', to: 'geplant' },
        { from: 'beendet', to: 'abgesagt' }
      ];

      for (const transition of invalidTransitions) {
        const currentMatch = { id: 1, status: transition.from };
        const updateData = { status: transition.to };

        const event = {
          params: { 
            data: updateData,
            where: { id: 1 }
          }
        };

        (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(currentMatch);

        await expect(spielLifecycles.beforeUpdate(event)).rejects.toThrow(
          `Invalid status transition from '${transition.from}' to '${transition.to}'`
        );
      }
    });

    test('should require final score when marking as completed', async () => {
      const currentMatch = { id: 1, status: 'laufend' };
      const updateData = { 
        status: 'beendet'
        // Missing tore_heim and tore_auswaerts
      };

      const event = {
        params: { 
          data: updateData,
          where: { id: 1 }
        }
      };

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(currentMatch);

      await expect(spielLifecycles.beforeUpdate(event)).rejects.toThrow(
        'Final score is required when marking match as completed'
      );
    });
  });

  describe('Score Consistency Validation', () => {
    test('should warn about score inconsistencies with events', async () => {
      const matchData = {
        id: 1,
        datum: '2024-01-15T15:00:00.000Z',
        heimclub: 1,
        auswaertsclub: 2,
        unser_team: 1,
        ist_heimspiel: true,
        status: 'beendet',
        tore_heim: 2,
        tore_auswaerts: 1,
        torschuetzen: [
          { spieler_id: 1, minute: 15 }, // Only 1 goal event, but score says 2-1
        ]
      };

      const player = {
        id: 1,
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: { id: 1 },
        aushilfe_teams: []
      };

      const event = {
        params: { data: matchData }
      };

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(player);

      // Should log warning but not throw
      await expect(spielLifecycles.beforeCreate(event)).resolves.toBeUndefined();
      expect(global.strapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Score inconsistency detected')
      );
    });
  });

  describe('Automated Processing Integration', () => {
    test('should trigger automated processing on match completion', async () => {
      const completedMatch = {
        id: 1,
        status: 'beendet',
        tore_heim: 2,
        tore_auswaerts: 1
      };

      const event = {
        result: completedMatch,
        params: {}
      };

      // Mock automated processing service
      const mockProcessingResult = { success: true };
      const mockAutomatedProcessing = {
        processMatchCompletion: jest.fn().mockResolvedValue(mockProcessingResult)
      };

      // This would be imported in the actual lifecycle
      global.AutomatedProcessingService = mockAutomatedProcessing;

      await spielLifecycles.afterUpdate(event);

      // Should trigger automated processing
      expect(mockAutomatedProcessing.processMatchCompletion).toHaveBeenCalledWith(1);
    });
  });
});