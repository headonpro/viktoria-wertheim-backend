/**
 * Unit tests for validation service
 * Tests custom validation logic and business rules
 */

import ValidationService from '../../../src/services/validation';

describe('ValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateSeasonConstraints', () => {
    test('should validate single active season constraint', async () => {
      const activeSeasons = [
        { id: 1, name: '2023/24', aktiv: true },
        { id: 2, name: '2024/25', aktiv: true } // Two active seasons
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(activeSeasons);

      const result = await ValidationService.validateSeasonConstraints();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Multiple active seasons found');
    });

    test('should pass with single active season', async () => {
      const activeSeasons = [
        { id: 1, name: '2024/25', aktiv: true }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(activeSeasons);

      const result = await ValidationService.validateSeasonConstraints();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle no active seasons', async () => {
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue([]);

      const result = await ValidationService.validateSeasonConstraints();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No active season found');
    });
  });

  describe('validatePlayerTeamAssignments', () => {
    test('should validate player team assignments within same club', async () => {
      const player = {
        id: 1,
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: { id: 1, club: { id: 1 } },
        aushilfe_teams: [
          { id: 2, club: { id: 1 } }, // Same club - valid
          { id: 3, club: { id: 2 } }  // Different club - invalid
        ]
      };

      const result = await ValidationService.validatePlayerTeamAssignments(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Player assigned to teams from different clubs');
    });

    test('should prevent player from being in hauptteam and aushilfe_teams', async () => {
      const player = {
        id: 1,
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: { id: 1, club: { id: 1 } },
        aushilfe_teams: [
          { id: 1, club: { id: 1 } }, // Same as hauptteam
          { id: 2, club: { id: 1 } }
        ]
      };

      const result = await ValidationService.validatePlayerTeamAssignments(player);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Player cannot be in both hauptteam and aushilfe_teams for the same team');
    });

    test('should validate correct team assignments', async () => {
      const player = {
        id: 1,
        vorname: 'Max',
        nachname: 'Mustermann',
        hauptteam: { id: 1, club: { id: 1 } },
        aushilfe_teams: [
          { id: 2, club: { id: 1 } },
          { id: 3, club: { id: 1 } }
        ]
      };

      const result = await ValidationService.validatePlayerTeamAssignments(player);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateMatchEventConsistency', () => {
    test('should validate goal events against final score', async () => {
      const match = {
        id: 1,
        ist_heimspiel: true,
        unser_team: { id: 1 },
        tore_heim: 3,
        tore_auswaerts: 1,
        torschuetzen: [
          { spieler_id: 1, minute: 15 }, // Our team goal
          { spieler_id: 2, minute: 30 }  // Only 2 goals in events, but score is 3-1
        ]
      };

      // Mock player data
      (global.strapi.entityService.findOne as jest.Mock)
        .mockResolvedValueOnce({ hauptteam: { id: 1 } }) // Player 1 in our team
        .mockResolvedValueOnce({ hauptteam: { id: 1 } }); // Player 2 in our team

      const result = await ValidationService.validateMatchEventConsistency(match);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Goal events do not match final score');
    });

    test('should validate card events timing', async () => {
      const match = {
        id: 1,
        karten: [
          { spieler_id: 1, minute: 15, typ: 'gelb' },
          { spieler_id: 1, minute: 10, typ: 'rot' } // Red card before yellow card
        ]
      };

      const result = await ValidationService.validateMatchEventConsistency(match);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Card events have invalid timing sequence');
    });

    test('should validate substitution logic', async () => {
      const match = {
        id: 1,
        wechsel: [
          { raus_id: 1, rein_id: 2, minute: 60 },
          { raus_id: 1, rein_id: 3, minute: 70 } // Player 1 substituted twice
        ]
      };

      const result = await ValidationService.validateMatchEventConsistency(match);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Player substituted multiple times');
    });
  });

  describe('validateStatisticsIntegrity', () => {
    test('should validate player statistics match match events', async () => {
      const playerId = 1;
      const saisonId = 1;

      const playerStats = {
        tore: 5,
        spiele: 3,
        gelbe_karten: 2,
        rote_karten: 0
      };

      const matchEvents = [
        {
          spiel: { id: 1 },
          torschuetzen: [{ spieler_id: 1 }], // 1 goal
          karten: [{ spieler_id: 1, typ: 'gelb' }] // 1 yellow card
        },
        {
          spiel: { id: 2 },
          torschuetzen: [{ spieler_id: 1 }, { spieler_id: 1 }], // 2 goals
          karten: [{ spieler_id: 1, typ: 'gelb' }] // 1 yellow card
        }
        // Total from events: 3 goals, 2 yellow cards, but stats show 5 goals
      ];

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(playerStats);
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(matchEvents);

      const result = await ValidationService.validateStatisticsIntegrity(playerId, saisonId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Statistics do not match match events');
    });

    test('should validate correct statistics', async () => {
      const playerId = 1;
      const saisonId = 1;

      const playerStats = {
        tore: 3,
        spiele: 2,
        gelbe_karten: 2,
        rote_karten: 0
      };

      const matchEvents = [
        {
          spiel: { id: 1 },
          torschuetzen: [{ spieler_id: 1 }],
          karten: [{ spieler_id: 1, typ: 'gelb' }]
        },
        {
          spiel: { id: 2 },
          torschuetzen: [{ spieler_id: 1 }, { spieler_id: 1 }],
          karten: [{ spieler_id: 1, typ: 'gelb' }]
        }
      ];

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(playerStats);
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(matchEvents);

      const result = await ValidationService.validateStatisticsIntegrity(playerId, saisonId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateTablePositions', () => {
    test('should validate league table position consistency', async () => {
      const ligaId = 1;

      const tableEntries = [
        { id: 1, club: { id: 1 }, platz: 1, punkte: 15 },
        { id: 2, club: { id: 2 }, platz: 2, punkte: 12 },
        { id: 3, club: { id: 3 }, platz: 3, punkte: 18 } // Higher points but lower position
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(tableEntries);

      const result = await ValidationService.validateTablePositions(ligaId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Table positions do not match points order');
    });

    test('should validate correct table positions', async () => {
      const ligaId = 1;

      const tableEntries = [
        { id: 1, club: { id: 1 }, platz: 1, punkte: 18 },
        { id: 2, club: { id: 2 }, platz: 2, punkte: 15 },
        { id: 3, club: { id: 3 }, platz: 3, punkte: 12 }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(tableEntries);

      const result = await ValidationService.validateTablePositions(ligaId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle equal points with goal difference', async () => {
      const ligaId = 1;

      const tableEntries = [
        { id: 1, club: { id: 1 }, platz: 1, punkte: 15, tordifferenz: 5 },
        { id: 2, club: { id: 2 }, platz: 2, punkte: 15, tordifferenz: 3 },
        { id: 3, club: { id: 3 }, platz: 3, punkte: 12, tordifferenz: 1 }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(tableEntries);

      const result = await ValidationService.validateTablePositions(ligaId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateReferentialIntegrity', () => {
    test('should validate all foreign key relationships', async () => {
      const contentType = 'api::spiel.spiel';
      const entityId = 1;

      const match = {
        id: 1,
        heimclub: 999, // Non-existent club
        auswaertsclub: 2,
        unser_team: 1,
        liga: 1,
        saison: 1
      };

      (global.strapi.entityService.findOne as jest.Mock)
        .mockResolvedValueOnce(match) // Match data
        .mockResolvedValueOnce(null) // heimclub not found
        .mockResolvedValueOnce({ id: 2 }) // auswaertsclub found
        .mockResolvedValueOnce({ id: 1 }) // unser_team found
        .mockResolvedValueOnce({ id: 1 }) // liga found
        .mockResolvedValueOnce({ id: 1 }); // saison found

      const result = await ValidationService.validateReferentialIntegrity(contentType, entityId);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Referenced entity not found: heimclub (999)');
    });

    test('should pass with valid references', async () => {
      const contentType = 'api::spiel.spiel';
      const entityId = 1;

      const match = {
        id: 1,
        heimclub: 1,
        auswaertsclub: 2,
        unser_team: 1,
        liga: 1,
        saison: 1
      };

      (global.strapi.entityService.findOne as jest.Mock)
        .mockResolvedValueOnce(match) // Match data
        .mockResolvedValueOnce({ id: 1 }) // heimclub found
        .mockResolvedValueOnce({ id: 2 }) // auswaertsclub found
        .mockResolvedValueOnce({ id: 1 }) // unser_team found
        .mockResolvedValueOnce({ id: 1 }) // liga found
        .mockResolvedValueOnce({ id: 1 }); // saison found

      const result = await ValidationService.validateReferentialIntegrity(contentType, entityId);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateBusinessRules', () => {
    test('should validate all business rules for content type', async () => {
      const contentType = 'api::saison.saison';
      const entityData = {
        name: '2024/25',
        start_datum: '2024-08-01',
        end_datum: '2025-07-31',
        aktiv: true
      };

      // Mock various validation results
      const mockValidationResults = {
        seasonConstraints: { isValid: true, errors: [] },
        dateRanges: { isValid: true, errors: [] },
        uniqueConstraints: { isValid: true, errors: [] }
      };

      jest.spyOn(ValidationService, 'validateSeasonConstraints').mockResolvedValue(mockValidationResults.seasonConstraints);

      const result = await ValidationService.validateBusinessRules(contentType, entityData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should aggregate validation errors', async () => {
      const contentType = 'api::saison.saison';
      const entityData = {
        name: '2024/25',
        start_datum: '2025-07-31', // Invalid date range
        end_datum: '2024-08-01',
        aktiv: true
      };

      const mockValidationResults = {
        seasonConstraints: { isValid: false, errors: ['Multiple active seasons'] },
        dateRanges: { isValid: false, errors: ['Invalid date range'] }
      };

      jest.spyOn(ValidationService, 'validateSeasonConstraints').mockResolvedValue(mockValidationResults.seasonConstraints);

      const result = await ValidationService.validateBusinessRules(contentType, entityData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Multiple active seasons');
      expect(result.errors).toContain('Invalid date range');
    });
  });
});