/**
 * Unit tests for Tabellen-Berechnungs-Service
 * Testing core calculation logic, sorting algorithm, and database operations
 */

import { TabellenBerechnungsServiceImpl, TeamStats, TabellenEintrag } from '../../../../src/api/tabellen-eintrag/services/tabellen-berechnung';

// Mock Strapi instance
const mockStrapi = {
  entityService: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  db: {
    transaction: jest.fn()
  },
  log: {
    info: jest.fn(),
    error: jest.fn()
  }
};

describe('TabellenBerechnungsService', () => {
  let service: TabellenBerechnungsServiceImpl;

  beforeEach(() => {
    service = new TabellenBerechnungsServiceImpl(mockStrapi);
    jest.clearAllMocks();
  });

  describe('calculateTeamStats', () => {
    const teamId = 1;
    const ligaId = 1;
    const saisonId = 1;

    it('should calculate correct stats for team with wins, draws, and losses', async () => {
      // Mock games data - team plays as home and away
      const mockGames = [
        // Home win: 3-1
        {
          heim_team: { id: 1 },
          gast_team: { id: 2 },
          heim_tore: 3,
          gast_tore: 1,
          status: 'beendet'
        },
        // Away draw: 2-2
        {
          heim_team: { id: 3 },
          gast_team: { id: 1 },
          heim_tore: 2,
          gast_tore: 2,
          status: 'beendet'
        },
        // Home loss: 0-2
        {
          heim_team: { id: 1 },
          gast_team: { id: 4 },
          heim_tore: 0,
          gast_tore: 2,
          status: 'beendet'
        },
        // Away win: 1-3
        {
          heim_team: { id: 5 },
          gast_team: { id: 1 },
          heim_tore: 1,
          gast_tore: 3,
          status: 'beendet'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);

      const result = await service.calculateTeamStats(teamId, ligaId, saisonId);

      expect(result).toEqual({
        spiele: 4,
        siege: 2,        // 3-1 win, 1-3 win
        unentschieden: 1, // 2-2 draw
        niederlagen: 1,   // 0-2 loss
        toreFuer: 8,      // 3 + 2 + 0 + 3
        toreGegen: 6,     // 1 + 2 + 2 + 1
        tordifferenz: 2,  // 8 - 6
        punkte: 7         // (2 * 3) + (1 * 1) = 7
      });
    });

    it('should calculate correct points for wins (3 points each)', async () => {
      const mockGames = [
        {
          heim_team: { id: 1 },
          gast_team: { id: 2 },
          heim_tore: 2,
          gast_tore: 0,
          status: 'beendet'
        },
        {
          heim_team: { id: 3 },
          gast_team: { id: 1 },
          heim_tore: 0,
          gast_tore: 1,
          status: 'beendet'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);

      const result = await service.calculateTeamStats(teamId, ligaId, saisonId);

      expect(result.siege).toBe(2);
      expect(result.punkte).toBe(6); // 2 wins * 3 points = 6
    });

    it('should calculate correct points for draws (1 point each)', async () => {
      const mockGames = [
        {
          heim_team: { id: 1 },
          gast_team: { id: 2 },
          heim_tore: 1,
          gast_tore: 1,
          status: 'beendet'
        },
        {
          heim_team: { id: 3 },
          gast_team: { id: 1 },
          heim_tore: 2,
          gast_tore: 2,
          status: 'beendet'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);

      const result = await service.calculateTeamStats(teamId, ligaId, saisonId);

      expect(result.unentschieden).toBe(2);
      expect(result.punkte).toBe(2); // 2 draws * 1 point = 2
    });

    it('should calculate correct points for losses (0 points each)', async () => {
      const mockGames = [
        {
          heim_team: { id: 1 },
          gast_team: { id: 2 },
          heim_tore: 0,
          gast_tore: 2,
          status: 'beendet'
        },
        {
          heim_team: { id: 3 },
          gast_team: { id: 1 },
          heim_tore: 3,
          gast_tore: 1,
          status: 'beendet'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);

      const result = await service.calculateTeamStats(teamId, ligaId, saisonId);

      expect(result.niederlagen).toBe(2);
      expect(result.punkte).toBe(0); // 2 losses * 0 points = 0
    });

    it('should handle team with no games', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const result = await service.calculateTeamStats(teamId, ligaId, saisonId);

      expect(result).toEqual({
        spiele: 0,
        siege: 0,
        unentschieden: 0,
        niederlagen: 0,
        toreFuer: 0,
        toreGegen: 0,
        tordifferenz: 0,
        punkte: 0
      });
    });

    it('should only count completed games', async () => {
      const mockGames = [
        // Completed game
        {
          heim_team: { id: 1 },
          gast_team: { id: 2 },
          heim_tore: 2,
          gast_tore: 1,
          status: 'beendet'
        },
        // Planned game - should be filtered out by query
        {
          heim_team: { id: 1 },
          gast_team: { id: 3 },
          heim_tore: null,
          gast_tore: null,
          status: 'geplant'
        }
      ];

      // Only return completed games (filtered by query)
      mockStrapi.entityService.findMany.mockResolvedValue([mockGames[0]]);

      const result = await service.calculateTeamStats(teamId, ligaId, saisonId);

      expect(result.spiele).toBe(1);
      expect(result.siege).toBe(1);
      expect(result.punkte).toBe(3);
    });

    it('should throw error when database query fails', async () => {
      mockStrapi.entityService.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.calculateTeamStats(teamId, ligaId, saisonId))
        .rejects.toThrow('Failed to calculate team stats for team 1: Database error');
    });
  });

  describe('sortTableEntries', () => {
    it('should sort by points (descending) as primary criteria', () => {
      const entries: TabellenEintrag[] = [
        createMockEntry('Team A', 15, 5, 10), // 15 points
        createMockEntry('Team B', 20, 3, 12), // 20 points
        createMockEntry('Team C', 10, 2, 8)   // 10 points
      ];

      const result = service.sortTableEntries(entries);

      expect(result[0].team_name).toBe('Team B'); // 20 points
      expect(result[1].team_name).toBe('Team A'); // 15 points
      expect(result[2].team_name).toBe('Team C'); // 10 points
      expect(result[0].platz).toBe(1);
      expect(result[1].platz).toBe(2);
      expect(result[2].platz).toBe(3);
    });

    it('should sort by goal difference (descending) when points are equal', () => {
      const entries: TabellenEintrag[] = [
        createMockEntry('Team A', 15, -2, 10), // Same points, -2 goal diff
        createMockEntry('Team B', 15, 5, 12),  // Same points, +5 goal diff
        createMockEntry('Team C', 15, 0, 8)    // Same points, 0 goal diff
      ];

      const result = service.sortTableEntries(entries);

      expect(result[0].team_name).toBe('Team B'); // +5 goal diff
      expect(result[1].team_name).toBe('Team C'); // 0 goal diff
      expect(result[2].team_name).toBe('Team A'); // -2 goal diff
    });

    it('should sort by goals scored (descending) when points and goal difference are equal', () => {
      const entries: TabellenEintrag[] = [
        createMockEntry('Team A', 15, 5, 8),  // Same points, same diff, 8 goals
        createMockEntry('Team B', 15, 5, 12), // Same points, same diff, 12 goals
        createMockEntry('Team C', 15, 5, 10)  // Same points, same diff, 10 goals
      ];

      const result = service.sortTableEntries(entries);

      expect(result[0].team_name).toBe('Team B'); // 12 goals
      expect(result[1].team_name).toBe('Team C'); // 10 goals
      expect(result[2].team_name).toBe('Team A'); // 8 goals
    });

    it('should sort alphabetically by team name when all other criteria are equal', () => {
      const entries: TabellenEintrag[] = [
        createMockEntry('Team Z', 15, 5, 10),
        createMockEntry('Team A', 15, 5, 10),
        createMockEntry('Team M', 15, 5, 10)
      ];

      const result = service.sortTableEntries(entries);

      expect(result[0].team_name).toBe('Team A');
      expect(result[1].team_name).toBe('Team M');
      expect(result[2].team_name).toBe('Team Z');
    });

    it('should handle complex sorting scenario', () => {
      const entries: TabellenEintrag[] = [
        createMockEntry('Team A', 20, 10, 25), // 1st: highest points
        createMockEntry('Team B', 15, 8, 20),  // 2nd: same points as C, better goal diff
        createMockEntry('Team C', 15, 5, 22),  // 3rd: same points as B, worse goal diff but more goals
        createMockEntry('Team D', 15, 5, 18),  // 4th: same as C but fewer goals
        createMockEntry('Team E', 10, 0, 15)   // 5th: lowest points
      ];

      const result = service.sortTableEntries(entries);

      expect(result[0].team_name).toBe('Team A'); // 20 points
      expect(result[1].team_name).toBe('Team B'); // 15 points, +8 diff
      expect(result[2].team_name).toBe('Team C'); // 15 points, +5 diff, 22 goals
      expect(result[3].team_name).toBe('Team D'); // 15 points, +5 diff, 18 goals
      expect(result[4].team_name).toBe('Team E'); // 10 points
    });

    it('should not modify original array', () => {
      const entries: TabellenEintrag[] = [
        createMockEntry('Team B', 10, 0, 5),
        createMockEntry('Team A', 20, 5, 10)
      ];
      const originalOrder = entries.map(e => e.team_name);

      service.sortTableEntries(entries);

      expect(entries.map(e => e.team_name)).toEqual(originalOrder);
    });
  });

  describe('createMissingEntries', () => {
    const ligaId = 1;
    const saisonId = 1;

    it('should create entries for teams that have no table entry', async () => {
      const mockGames = [
        {
          heim_team: { id: 1, name: 'Team A' },
          gast_team: { id: 2, name: 'Team B' },
          liga: { id: 1, name: 'Liga 1' },
          saison: { id: 1, name: '2024' }
        }
      ];

      const mockExistingEntries = [
        { team: { id: 1 } } // Only Team A has an entry
      ];

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockGames) // Games query
        .mockResolvedValueOnce(mockExistingEntries); // Existing entries query

      mockStrapi.entityService.create.mockResolvedValue({});

      await service.createMissingEntries(ligaId, saisonId);

      // Should create entry for Team B only
      expect(mockStrapi.entityService.create).toHaveBeenCalledTimes(1);
      expect(mockStrapi.entityService.create).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        {
          data: expect.objectContaining({
            team_name: 'Team B',
            liga: 1,
            saison: 1,
            team: 2,
            spiele: 0,
            siege: 0,
            unentschieden: 0,
            niederlagen: 0,
            tore_fuer: 0,
            tore_gegen: 0,
            tordifferenz: 0,
            punkte: 0,
            auto_calculated: true,
            calculation_source: 'automatic'
          })
        }
      );
    });

    it('should not create entries for teams that already have entries', async () => {
      const mockGames = [
        {
          heim_team: { id: 1, name: 'Team A' },
          gast_team: { id: 2, name: 'Team B' },
          liga: { id: 1, name: 'Liga 1' },
          saison: { id: 1, name: '2024' }
        }
      ];

      const mockExistingEntries = [
        { team: { id: 1 } },
        { team: { id: 2 } }
      ];

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockGames)
        .mockResolvedValueOnce(mockExistingEntries);

      await service.createMissingEntries(ligaId, saisonId);

      expect(mockStrapi.entityService.create).not.toHaveBeenCalled();
    });

    it('should handle duplicate teams in games correctly', async () => {
      const mockGames = [
        {
          heim_team: { id: 1, name: 'Team A' },
          gast_team: { id: 2, name: 'Team B' },
          liga: { id: 1, name: 'Liga 1' },
          saison: { id: 1, name: '2024' }
        },
        {
          heim_team: { id: 2, name: 'Team B' },
          gast_team: { id: 1, name: 'Team A' },
          liga: { id: 1, name: 'Liga 1' },
          saison: { id: 1, name: '2024' }
        }
      ];

      const mockExistingEntries = [];

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockGames)
        .mockResolvedValueOnce(mockExistingEntries);

      mockStrapi.entityService.create.mockResolvedValue({});

      await service.createMissingEntries(ligaId, saisonId);

      // Should create entries for both teams only once each
      expect(mockStrapi.entityService.create).toHaveBeenCalledTimes(2);
    });
  });
});

// Helper function to create mock table entries
function createMockEntry(
  teamName: string, 
  punkte: number, 
  tordifferenz: number, 
  toreFuer: number
): TabellenEintrag {
  return {
    id: Math.random(),
    team_name: teamName,
    liga: { id: 1, name: 'Test Liga' },
    team: { id: Math.random(), name: teamName },
    platz: 0,
    spiele: 10,
    siege: Math.floor(punkte / 3),
    unentschieden: punkte % 3,
    niederlagen: 10 - Math.floor(punkte / 3) - (punkte % 3),
    tore_fuer: toreFuer,
    tore_gegen: toreFuer - tordifferenz,
    tordifferenz,
    punkte,
    last_updated: new Date(),
    auto_calculated: true,
    calculation_source: 'test'
  };
}