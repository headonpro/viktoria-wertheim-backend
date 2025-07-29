/**
 * Test for enhanced Tabellen-Berechnungs-Service with club support
 */

const { TabellenBerechnungsServiceImpl } = require('../src/api/tabellen-eintrag/services/tabellen-berechnung');

describe('Enhanced Tabellen-Berechnungs-Service', () => {
  let service;
  let mockStrapi;

  beforeEach(() => {
    // Mock Strapi instance
    mockStrapi = {
      log: {
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
      },
      entityService: {
        findMany: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
      },
      db: {
        transaction: jest.fn((callback) => callback())
      }
    };

    service = new TabellenBerechnungsServiceImpl(mockStrapi);
  });

  describe('getClubsInLiga', () => {
    test('should return unique clubs for a league', async () => {
      // Mock games with clubs
      const mockGames = [
        {
          heim_club: { id: 1, name: 'SV Viktoria Wertheim', logo: null },
          gast_club: { id: 2, name: 'VfR Gerlachsheim', logo: null }
        },
        {
          heim_club: { id: 2, name: 'VfR Gerlachsheim', logo: null },
          gast_club: { id: 3, name: 'TSV Jahn Kreuzwertheim', logo: null }
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);

      const clubs = await service.getClubsInLiga(1, 1);

      expect(clubs).toHaveLength(3);
      expect(clubs[0].name).toBe('SV Viktoria Wertheim');
      expect(clubs[1].name).toBe('TSV Jahn Kreuzwertheim'); // Should be sorted alphabetically
      expect(clubs[2].name).toBe('VfR Gerlachsheim');
    });

    test('should handle empty games list', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const clubs = await service.getClubsInLiga(1, 1);

      expect(clubs).toHaveLength(0);
    });
  });

  describe('calculateClubStats', () => {
    test('should calculate correct stats for a club', async () => {
      // Mock games for club
      const mockGames = [
        {
          heim_club: { id: 1 },
          gast_club: { id: 2 },
          heim_tore: 2,
          gast_tore: 1
        },
        {
          heim_club: { id: 2 },
          gast_club: { id: 1 },
          heim_tore: 0,
          gast_tore: 1
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGames);

      const stats = await service.calculateClubStats(1, 1, 1);

      expect(stats.spiele).toBe(2);
      expect(stats.siege).toBe(2);
      expect(stats.unentschieden).toBe(0);
      expect(stats.niederlagen).toBe(0);
      expect(stats.toreFuer).toBe(3);
      expect(stats.toreGegen).toBe(1);
      expect(stats.tordifferenz).toBe(2);
      expect(stats.punkte).toBe(6); // 2 wins * 3 points
    });
  });

  describe('createUnifiedEntityCollection', () => {
    test('should create unified collection from club and team games', () => {
      const clubGames = [
        {
          heim_club: { id: 1, name: 'SV Viktoria Wertheim', logo: null },
          gast_club: { id: 2, name: 'VfR Gerlachsheim', logo: null }
        }
      ];

      const teamGames = [
        {
          heim_team: { id: 1, name: '1. Mannschaft', logo: null },
          gast_team: { id: 4, name: 'Other Team', logo: null }
        }
      ];

      const unifiedEntities = service.createUnifiedEntityCollection(clubGames, teamGames);

      expect(unifiedEntities.size).toBe(4); // 2 clubs + 2 teams (team mapping logic needs actual club data)
      expect(unifiedEntities.has('club_1')).toBe(true);
      expect(unifiedEntities.has('club_2')).toBe(true);
      expect(unifiedEntities.has('team_1')).toBe(true);
      expect(unifiedEntities.has('team_4')).toBe(true);
    });
  });

  describe('validateDataConsistency', () => {
    test('should detect mixed games with both team and club data', async () => {
      // Mock mixed games
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([{ id: 1 }]) // Mixed games
        .mockResolvedValueOnce([]); // Table entries

      const result = await service.validateDataConsistency(1, 1);

      expect(result.warnings).toContain('Found 1 games with both team and club data - this may cause inconsistencies');
    });

    test('should detect orphaned table entries', async () => {
      // Mock orphaned entries
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([]) // Mixed games
        .mockResolvedValueOnce([{ id: 1, team: null, club: null, team_name: 'Orphaned' }]); // Orphaned entries

      const result = await service.validateDataConsistency(1, 1);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Found 1 table entries without team or club reference');
    });
  });
});