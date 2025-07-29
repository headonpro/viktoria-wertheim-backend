/**
 * Integration tests for Tabellen-Berechnungs-Service
 * Testing database operations, transactions, and bulk updates
 */

import { TabellenBerechnungsServiceImpl } from '../../../../src/api/tabellen-eintrag/services/tabellen-berechnung';

// Mock Strapi with more realistic database transaction behavior
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

describe('TabellenBerechnungsService Integration Tests', () => {
  let service: TabellenBerechnungsServiceImpl;

  beforeEach(() => {
    service = new TabellenBerechnungsServiceImpl(mockStrapi);
    jest.clearAllMocks();
  });

  describe('calculateTableForLiga', () => {
    const ligaId = 1;
    const saisonId = 1;

    it('should calculate complete table with transaction support', async () => {
      // Mock transaction wrapper
      mockStrapi.db.transaction.mockImplementation(async (callback) => {
        return await callback();
      });

      // Mock games data
      const mockGames = [
        {
          heim_team: { id: 1, name: 'Team A' },
          gast_team: { id: 2, name: 'Team B' },
          heim_tore: 2,
          gast_tore: 1,
          status: 'beendet',
          liga: { id: 1, name: 'Liga 1' },
          saison: { id: 1, name: '2024' }
        },
        {
          heim_team: { id: 2, name: 'Team B' },
          gast_team: { id: 1, name: 'Team A' },
          heim_tore: 0,
          gast_tore: 3,
          status: 'beendet',
          liga: { id: 1, name: 'Liga 1' },
          saison: { id: 1, name: '2024' }
        }
      ];

      // Mock existing entries (empty for this test)
      const mockExistingEntries = [];

      // Mock entity service calls
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockGames) // createMissingEntries - games query
        .mockResolvedValueOnce(mockExistingEntries) // createMissingEntries - existing entries query
        .mockResolvedValueOnce(mockGames) // calculateTableForLiga - games query for unique teams
        .mockResolvedValueOnce(mockGames.filter(g => g.heim_team.id === 1 || g.gast_team.id === 1)) // calculateTeamStats for Team A
        .mockResolvedValueOnce(mockGames.filter(g => g.heim_team.id === 2 || g.gast_team.id === 2)); // calculateTeamStats for Team B

      // Mock create calls for missing entries
      mockStrapi.entityService.create.mockResolvedValue({});

      // Mock bulk update operations
      mockStrapi.entityService.findMany.mockResolvedValue([]); // No existing entries for bulk update
      mockStrapi.entityService.create.mockResolvedValue({
        id: 1,
        team_name: 'Team A',
        punkte: 6,
        platz: 1
      });

      const result = await service.calculateTableForLiga(ligaId, saisonId);

      // Verify transaction was used
      expect(mockStrapi.db.transaction).toHaveBeenCalledTimes(1);
      expect(mockStrapi.db.transaction).toHaveBeenCalledWith(expect.any(Function));

      // Verify createMissingEntries was called
      expect(mockStrapi.entityService.create).toHaveBeenCalled();

      // Verify logging
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringContaining('Table calculation completed for liga 1, saison 1')
      );
    });

    it('should handle transaction rollback on error', async () => {
      const testError = new Error('Database connection failed');

      // Mock transaction that throws error
      mockStrapi.db.transaction.mockImplementation(async (callback) => {
        throw testError;
      });

      await expect(service.calculateTableForLiga(ligaId, saisonId))
        .rejects.toThrow('Database connection failed');

      expect(mockStrapi.db.transaction).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during calculation and log them', async () => {
      const testError = new Error('Calculation failed');

      mockStrapi.db.transaction.mockImplementation(async (callback) => {
        return await callback();
      });

      // Mock findMany to throw error during games query
      mockStrapi.entityService.findMany.mockRejectedValue(testError);

      await expect(service.calculateTableForLiga(ligaId, saisonId))
        .rejects.toThrow('Failed to create missing entries: Calculation failed');

      expect(mockStrapi.log.error).toHaveBeenCalledWith(
        'Table calculation failed for liga 1, saison 1:',
        expect.any(Error)
      );
    });
  });

  describe('bulkUpdateTableEntries', () => {
    it('should perform bulk updates efficiently', async () => {
      const mockEntries = [
        {
          team_name: 'Team A',
          liga: { id: 1 },
          team: { id: 1, name: 'Team A' },
          platz: 1,
          spiele: 2,
          siege: 2,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 5,
          tore_gegen: 1,
          tordifferenz: 4,
          punkte: 6,
          auto_calculated: true,
          calculation_source: 'automatic'
        },
        {
          team_name: 'Team B',
          liga: { id: 1 },
          team: { id: 2, name: 'Team B' },
          platz: 2,
          spiele: 2,
          siege: 0,
          unentschieden: 0,
          niederlagen: 2,
          tore_fuer: 1,
          tore_gegen: 5,
          tordifferenz: -4,
          punkte: 0,
          auto_calculated: true,
          calculation_source: 'automatic'
        }
      ];

      // Mock existing entries lookup
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce([{ id: 1 }]) // Team A has existing entry
        .mockResolvedValueOnce([]); // Team B has no existing entry

      // Mock update and create operations
      mockStrapi.entityService.update.mockResolvedValue({
        id: 1,
        ...mockEntries[0]
      });
      mockStrapi.entityService.create.mockResolvedValue({
        id: 2,
        ...mockEntries[1]
      });

      const result = await service.bulkUpdateTableEntries(mockEntries);

      expect(result).toHaveLength(2);
      expect(mockStrapi.entityService.update).toHaveBeenCalledTimes(1);
      expect(mockStrapi.entityService.create).toHaveBeenCalledTimes(1);
      expect(mockStrapi.log.info).toHaveBeenCalledWith('Bulk updated 2 table entries');
    });

    it('should handle bulk update errors gracefully', async () => {
      const mockEntries = [
        {
          team_name: 'Team A',
          liga: { id: 1 },
          team: { id: 1, name: 'Team A' },
          platz: 1,
          spiele: 1,
          siege: 1,
          unentschieden: 0,
          niederlagen: 0,
          tore_fuer: 2,
          tore_gegen: 0,
          tordifferenz: 2,
          punkte: 3,
          auto_calculated: true,
          calculation_source: 'automatic'
        }
      ];

      mockStrapi.entityService.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.bulkUpdateTableEntries(mockEntries))
        .rejects.toThrow('Failed to bulk update table entries: Database error');
    });
  });

  describe('createMissingEntries', () => {
    const ligaId = 1;
    const saisonId = 1;

    it('should create missing entries with correct default values', async () => {
      const mockGames = [
        {
          heim_team: { id: 1, name: 'Team A' },
          gast_team: { id: 2, name: 'Team B' },
          liga: { id: 1, name: 'Liga 1' },
          saison: { id: 1, name: '2024' }
        }
      ];

      const mockExistingEntries = []; // No existing entries

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockGames) // Games query
        .mockResolvedValueOnce(mockExistingEntries); // Existing entries query

      mockStrapi.entityService.create.mockResolvedValue({});

      await service.createMissingEntries(ligaId, saisonId);

      expect(mockStrapi.entityService.create).toHaveBeenCalledTimes(2);
      
      // Verify Team A entry creation
      expect(mockStrapi.entityService.create).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        {
          data: expect.objectContaining({
            team_name: 'Team A',
            liga: 1,
            saison: 1,
            team: 1,
            platz: 0,
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

      // Verify Team B entry creation
      expect(mockStrapi.entityService.create).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        {
          data: expect.objectContaining({
            team_name: 'Team B',
            liga: 1,
            saison: 1,
            team: 2,
            auto_calculated: true,
            calculation_source: 'automatic'
          })
        }
      );

      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        'Created 2 missing table entries for liga 1, saison 1'
      );
    });

    it('should handle database errors during entry creation', async () => {
      const mockGames = [
        {
          heim_team: { id: 1, name: 'Team A' },
          gast_team: { id: 2, name: 'Team B' },
          liga: { id: 1, name: 'Liga 1' },
          saison: { id: 1, name: '2024' }
        }
      ];

      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockGames)
        .mockResolvedValueOnce([]);

      mockStrapi.entityService.create.mockRejectedValue(new Error('Create failed'));

      await expect(service.createMissingEntries(ligaId, saisonId))
        .rejects.toThrow('Failed to create missing entries: Create failed');
    });
  });

  describe('updateTableEntry', () => {
    it('should update single table entry with correct data', async () => {
      const mockEntry = {
        id: 1,
        team_name: 'Team A',
        liga: { id: 1, name: 'Liga 1' },
        team: { id: 1, name: 'Team A' },
        platz: 1,
        spiele: 10,
        siege: 7,
        unentschieden: 2,
        niederlagen: 1,
        tore_fuer: 20,
        tore_gegen: 8,
        tordifferenz: 12,
        punkte: 23,
        auto_calculated: true,
        calculation_source: 'automatic'
      };

      const updatedEntry = { ...mockEntry, last_updated: new Date() };
      mockStrapi.entityService.update.mockResolvedValue(updatedEntry);

      const result = await service.updateTableEntry(mockEntry);

      expect(mockStrapi.entityService.update).toHaveBeenCalledWith(
        'api::tabellen-eintrag.tabellen-eintrag',
        1,
        {
          data: expect.objectContaining({
            team_name: 'Team A',
            platz: 1,
            spiele: 10,
            siege: 7,
            unentschieden: 2,
            niederlagen: 1,
            tore_fuer: 20,
            tore_gegen: 8,
            tordifferenz: 12,
            punkte: 23,
            auto_calculated: true,
            calculation_source: 'automatic',
            last_updated: expect.any(Date)
          })
        }
      );

      expect(result).toEqual(updatedEntry);
    });

    it('should handle update errors', async () => {
      const mockEntry = {
        id: 1,
        team_name: 'Team A',
        liga: { id: 1, name: 'Liga 1' },
        team: { id: 1, name: 'Team A' },
        platz: 1,
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
      };

      mockStrapi.entityService.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.updateTableEntry(mockEntry))
        .rejects.toThrow('Failed to update table entry 1: Update failed');
    });
  });

  describe('Performance and Transaction Tests', () => {
    it('should complete table calculation within performance threshold', async () => {
      const startTime = Date.now();

      // Mock a realistic scenario with multiple teams
      mockStrapi.db.transaction.mockImplementation(async (callback) => {
        return await callback();
      });

      const mockGames = Array.from({ length: 20 }, (_, i) => ({
        heim_team: { id: (i % 4) + 1, name: `Team ${(i % 4) + 1}` },
        gast_team: { id: ((i + 1) % 4) + 1, name: `Team ${((i + 1) % 4) + 1}` },
        heim_tore: Math.floor(Math.random() * 4),
        gast_tore: Math.floor(Math.random() * 4),
        status: 'beendet',
        liga: { id: 1, name: 'Liga 1' },
        saison: { id: 1, name: '2024' }
      }));

      // Mock all the required findMany calls
      mockStrapi.entityService.findMany
        .mockResolvedValueOnce(mockGames) // createMissingEntries - games query
        .mockResolvedValueOnce([]) // createMissingEntries - existing entries query
        .mockResolvedValueOnce(mockGames) // calculateTableForLiga - games query for unique teams
        .mockResolvedValue(mockGames.filter((g, idx) => idx < 5)); // calculateTeamStats calls

      mockStrapi.entityService.create.mockResolvedValue({});
      mockStrapi.entityService.update.mockResolvedValue({});

      await service.calculateTableForLiga(1, 1);

      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time (less than 1 second for test)
      expect(duration).toBeLessThan(1000);
      
      // Verify performance logging
      expect(mockStrapi.log.info).toHaveBeenCalledWith(
        expect.stringMatching(/Table calculation completed for liga 1, saison 1 in \d+ms/)
      );
    });

    it('should handle concurrent operations safely', async () => {
      let transactionCount = 0;
      
      mockStrapi.db.transaction.mockImplementation(async (callback) => {
        transactionCount++;
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, 10));
        return await callback();
      });

      mockStrapi.entityService.findMany
        .mockResolvedValue([]) // createMissingEntries - games query
        .mockResolvedValue([]) // createMissingEntries - existing entries query
        .mockResolvedValue([]); // calculateTableForLiga - games query for unique teams
      mockStrapi.entityService.create.mockResolvedValue({});

      // Run multiple calculations concurrently
      const promises = [
        service.calculateTableForLiga(1, 1),
        service.calculateTableForLiga(2, 1),
        service.calculateTableForLiga(3, 1)
      ];

      await Promise.all(promises);

      // Each calculation should have used its own transaction
      expect(transactionCount).toBe(3);
    });
  });
});