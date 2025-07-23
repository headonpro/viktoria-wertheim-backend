/**
 * Unit tests for data integrity service
 * Tests data consistency checks and constraint validation
 */

import DataIntegrityService from '../../../src/services/data-integrity';

describe('DataIntegrityService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkSeasonIntegrity', () => {
    test('should detect multiple active seasons', async () => {
      const activeSeasons = [
        { id: 1, name: '2023/24', aktiv: true },
        { id: 2, name: '2024/25', aktiv: true }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(activeSeasons);

      const result = await DataIntegrityService.checkSeasonIntegrity();

      expect(result.issues).toContain({
        type: 'constraint_violation',
        severity: 'error',
        message: 'Multiple active seasons detected',
        details: { activeSeasons: [1, 2] }
      });
    });

    test('should detect overlapping season dates', async () => {
      const seasons = [
        { 
          id: 1, 
          name: '2023/24', 
          start_datum: '2023-08-01', 
          end_datum: '2024-07-31' 
        },
        { 
          id: 2, 
          name: '2024/25', 
          start_datum: '2024-06-01', // Overlaps with previous season
          end_datum: '2025-05-31' 
        }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(seasons);

      const result = await DataIntegrityService.checkSeasonIntegrity();

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'data_inconsistency',
          severity: 'error',
          message: 'Overlapping season dates detected'
        })
      );
    });

    test('should pass with valid season data', async () => {
      const seasons = [
        { 
          id: 1, 
          name: '2023/24', 
          start_datum: '2023-08-01', 
          end_datum: '2024-07-31',
          aktiv: false
        },
        { 
          id: 2, 
          name: '2024/25', 
          start_datum: '2024-08-01', 
          end_datum: '2025-07-31',
          aktiv: true
        }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(seasons);

      const result = await DataIntegrityService.checkSeasonIntegrity();

      expect(result.issues).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('checkPlayerIntegrity', () => {
    test('should detect players without mitglied relationship', async () => {
      const players = [
        { id: 1, vorname: 'Max', nachname: 'Mustermann', mitglied: null },
        { id: 2, vorname: 'John', nachname: 'Doe', mitglied: { id: 1 } }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(players);

      const result = await DataIntegrityService.checkPlayerIntegrity();

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'missing_relationship',
          severity: 'error',
          message: 'Player without mitglied relationship',
          details: { playerId: 1 }
        })
      );
    });

    test('should detect duplicate jersey numbers in same team', async () => {
      const players = [
        { 
          id: 1, 
          vorname: 'Max', 
          nachname: 'Mustermann', 
          hauptteam: { id: 1 }, 
          rueckennummer: 10 
        },
        { 
          id: 2, 
          vorname: 'John', 
          nachname: 'Doe', 
          hauptteam: { id: 1 }, 
          rueckennummer: 10 
        }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(players);

      const result = await DataIntegrityService.checkPlayerIntegrity();

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'constraint_violation',
          severity: 'error',
          message: 'Duplicate jersey numbers in team',
          details: { teamId: 1, number: 10, players: [1, 2] }
        })
      );
    });

    test('should detect players in hauptteam and aushilfe_teams conflict', async () => {
      const players = [
        { 
          id: 1, 
          vorname: 'Max', 
          nachname: 'Mustermann', 
          hauptteam: { id: 1 }, 
          aushilfe_teams: [{ id: 1 }, { id: 2 }] // Same team in both
        }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(players);

      const result = await DataIntegrityService.checkPlayerIntegrity();

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'constraint_violation',
          severity: 'error',
          message: 'Player in both hauptteam and aushilfe_teams',
          details: { playerId: 1, teamId: 1 }
        })
      );
    });

    test('should detect multiple captains in same team', async () => {
      const players = [
        { 
          id: 1, 
          vorname: 'Max', 
          nachname: 'Mustermann', 
          hauptteam: { id: 1 }, 
          kapitaen: true 
        },
        { 
          id: 2, 
          vorname: 'John', 
          nachname: 'Doe', 
          hauptteam: { id: 1 }, 
          kapitaen: true 
        }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(players);

      const result = await DataIntegrityService.checkPlayerIntegrity();

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'constraint_violation',
          severity: 'error',
          message: 'Multiple captains in team',
          details: { teamId: 1, captains: [1, 2] }
        })
      );
    });
  });

  describe('checkMatchIntegrity', () => {
    test('should detect matches with invalid club relationships', async () => {
      const matches = [
        { 
          id: 1, 
          heimclub: { id: 1 }, 
          auswaertsclub: { id: 1 }, // Same club
          unser_team: { id: 1 }
        }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(matches);

      const result = await DataIntegrityService.checkMatchIntegrity();

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'constraint_violation',
          severity: 'error',
          message: 'Match with same home and away club',
          details: { matchId: 1, clubId: 1 }
        })
      );
    });

    test('should detect score inconsistencies with events', async () => {
      const matches = [
        { 
          id: 1, 
          tore_heim: 3,
          tore_auswaerts: 1,
          torschuetzen: [
            { spieler_id: 1, minute: 15 },
            { spieler_id: 2, minute: 30 }
          ], // Only 2 goals in events, but score is 3-1
          ist_heimspiel: true,
          unser_team: { id: 1 }
        }
      ];

      // Mock player data
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(matches);
      (global.strapi.entityService.findOne as jest.Mock)
        .mockResolvedValue({ hauptteam: { id: 1 } }); // Both players in our team

      const result = await DataIntegrityService.checkMatchIntegrity();

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'data_inconsistency',
          severity: 'warning',
          message: 'Score does not match goal events',
          details: { matchId: 1, expectedScore: '2-0', actualScore: '3-1' }
        })
      );
    });

    test('should detect invalid event sequences', async () => {
      const matches = [
        { 
          id: 1,
          karten: [
            { spieler_id: 1, minute: 30, typ: 'gelb' },
            { spieler_id: 1, minute: 20, typ: 'rot' } // Red card before yellow
          ]
        }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(matches);

      const result = await DataIntegrityService.checkMatchIntegrity();

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'data_inconsistency',
          severity: 'error',
          message: 'Invalid card sequence for player',
          details: { matchId: 1, playerId: 1 }
        })
      );
    });
  });

  describe('checkStatisticsIntegrity', () => {
    test('should detect statistics that do not match match events', async () => {
      const statistics = [
        { 
          id: 1, 
          spieler: { id: 1 }, 
          saison: { id: 1 },
          tore: 5,
          spiele: 3,
          gelbe_karten: 2
        }
      ];

      const matchEvents = [
        {
          torschuetzen: [{ spieler_id: 1 }], // 1 goal
          karten: [{ spieler_id: 1, typ: 'gelb' }] // 1 yellow card
        },
        {
          torschuetzen: [{ spieler_id: 1 }], // 1 goal
          karten: [] // No cards
        }
        // Total: 2 goals, 1 yellow card, but stats show 5 goals, 2 yellow cards
      ];

      (global.strapi.entityService.findMany as jest.Mock)
        .mockResolvedValueOnce(statistics)
        .mockResolvedValueOnce(matchEvents);

      const result = await DataIntegrityService.checkStatisticsIntegrity();

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'data_inconsistency',
          severity: 'error',
          message: 'Statistics do not match match events',
          details: { 
            playerId: 1, 
            saisonId: 1,
            expected: { tore: 2, gelbe_karten: 1 },
            actual: { tore: 5, gelbe_karten: 2 }
          }
        })
      );
    });

    test('should validate correct statistics', async () => {
      const statistics = [
        { 
          id: 1, 
          spieler: { id: 1 }, 
          saison: { id: 1 },
          tore: 2,
          spiele: 2,
          gelbe_karten: 1
        }
      ];

      const matchEvents = [
        {
          torschuetzen: [{ spieler_id: 1 }],
          karten: [{ spieler_id: 1, typ: 'gelb' }]
        },
        {
          torschuetzen: [{ spieler_id: 1 }],
          karten: []
        }
      ];

      (global.strapi.entityService.findMany as jest.Mock)
        .mockResolvedValueOnce(statistics)
        .mockResolvedValueOnce(matchEvents);

      const result = await DataIntegrityService.checkStatisticsIntegrity();

      expect(result.issues).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('checkTableIntegrity', () => {
    test('should detect incorrect table positions', async () => {
      const tableEntries = [
        { id: 1, club: { id: 1 }, platz: 1, punkte: 12, tordifferenz: 5 },
        { id: 2, club: { id: 2 }, platz: 2, punkte: 15, tordifferenz: 3 }, // Higher points but lower position
        { id: 3, club: { id: 3 }, platz: 3, punkte: 9, tordifferenz: -2 }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(tableEntries);

      const result = await DataIntegrityService.checkTableIntegrity();

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'data_inconsistency',
          severity: 'error',
          message: 'Table positions do not match points/goal difference order'
        })
      );
    });

    test('should validate correct table positions', async () => {
      const tableEntries = [
        { id: 1, club: { id: 1 }, platz: 1, punkte: 15, tordifferenz: 5 },
        { id: 2, club: { id: 2 }, platz: 2, punkte: 12, tordifferenz: 3 },
        { id: 3, club: { id: 3 }, platz: 3, punkte: 9, tordifferenz: -2 }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(tableEntries);

      const result = await DataIntegrityService.checkTableIntegrity();

      expect(result.issues).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    test('should handle equal points correctly', async () => {
      const tableEntries = [
        { id: 1, club: { id: 1 }, platz: 1, punkte: 15, tordifferenz: 5 },
        { id: 2, club: { id: 2 }, platz: 2, punkte: 15, tordifferenz: 3 }, // Same points, lower goal difference
        { id: 3, club: { id: 3 }, platz: 3, punkte: 12, tordifferenz: 2 }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(tableEntries);

      const result = await DataIntegrityService.checkTableIntegrity();

      expect(result.issues).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('checkReferentialIntegrity', () => {
    test('should detect broken foreign key relationships', async () => {
      const matches = [
        { 
          id: 1, 
          heimclub: 999, // Non-existent club
          auswaertsclub: 2,
          unser_team: 1,
          liga: 1,
          saison: 1
        }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(matches);
      (global.strapi.entityService.findOne as jest.Mock)
        .mockResolvedValueOnce(null) // heimclub not found
        .mockResolvedValueOnce({ id: 2 }) // auswaertsclub found
        .mockResolvedValueOnce({ id: 1 }) // unser_team found
        .mockResolvedValueOnce({ id: 1 }) // liga found
        .mockResolvedValueOnce({ id: 1 }); // saison found

      const result = await DataIntegrityService.checkReferentialIntegrity('api::spiel.spiel');

      expect(result.issues).toContainEqual(
        expect.objectContaining({
          type: 'missing_relationship',
          severity: 'error',
          message: 'Referenced entity not found',
          details: { entityId: 1, field: 'heimclub', referencedId: 999 }
        })
      );
    });

    test('should pass with valid relationships', async () => {
      const matches = [
        { 
          id: 1, 
          heimclub: 1,
          auswaertsclub: 2,
          unser_team: 1,
          liga: 1,
          saison: 1
        }
      ];

      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue(matches);
      (global.strapi.entityService.findOne as jest.Mock)
        .mockResolvedValue({ id: 1 }); // All entities found

      const result = await DataIntegrityService.checkReferentialIntegrity('api::spiel.spiel');

      expect(result.issues).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });
  });

  describe('runFullIntegrityCheck', () => {
    test('should run all integrity checks and aggregate results', async () => {
      // Mock various integrity check results
      jest.spyOn(DataIntegrityService, 'checkSeasonIntegrity').mockResolvedValue({
        isValid: false,
        issues: [{ type: 'constraint_violation', severity: 'error', message: 'Multiple active seasons' }]
      });

      jest.spyOn(DataIntegrityService, 'checkPlayerIntegrity').mockResolvedValue({
        isValid: true,
        issues: []
      });

      jest.spyOn(DataIntegrityService, 'checkMatchIntegrity').mockResolvedValue({
        isValid: false,
        issues: [{ type: 'data_inconsistency', severity: 'warning', message: 'Score mismatch' }]
      });

      const result = await DataIntegrityService.runFullIntegrityCheck();

      expect(result.isValid).toBe(false);
      expect(result.summary.totalIssues).toBe(2);
      expect(result.summary.errorCount).toBe(1);
      expect(result.summary.warningCount).toBe(1);
      expect(result.issues).toHaveLength(2);
    });

    test('should pass with no integrity issues', async () => {
      // Mock all checks passing
      jest.spyOn(DataIntegrityService, 'checkSeasonIntegrity').mockResolvedValue({ isValid: true, issues: [] });
      jest.spyOn(DataIntegrityService, 'checkPlayerIntegrity').mockResolvedValue({ isValid: true, issues: [] });
      jest.spyOn(DataIntegrityService, 'checkMatchIntegrity').mockResolvedValue({ isValid: true, issues: [] });
      jest.spyOn(DataIntegrityService, 'checkStatisticsIntegrity').mockResolvedValue({ isValid: true, issues: [] });
      jest.spyOn(DataIntegrityService, 'checkTableIntegrity').mockResolvedValue({ isValid: true, issues: [] });

      const result = await DataIntegrityService.runFullIntegrityCheck();

      expect(result.isValid).toBe(true);
      expect(result.summary.totalIssues).toBe(0);
      expect(result.issues).toHaveLength(0);
    });
  });
});