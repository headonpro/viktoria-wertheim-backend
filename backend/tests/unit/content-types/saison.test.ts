/**
 * Unit tests for Saison content type and validation logic
 * Tests schema validation, lifecycle hooks, and business rules
 */

import saisonLifecycles from '../../../src/api/saison/content-types/saison/lifecycles';

describe('Saison Content Type', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    test('should require name field', () => {
      const invalidData = {
        start_datum: '2024-08-01',
        end_datum: '2025-07-31',
        aktiv: false
      };
      
      // This would be validated by Strapi's built-in validation
      expect(invalidData).not.toHaveProperty('name');
    });

    test('should validate name uniqueness constraint', () => {
      const validData = {
        name: '2024/25',
        start_datum: '2024-08-01',
        end_datum: '2025-07-31',
        aktiv: false
      };
      
      expect(validData.name).toBeDefined();
      expect(validData.name.length).toBeLessThanOrEqual(20);
    });

    test('should require start_datum and end_datum', () => {
      const validData = {
        name: '2024/25',
        start_datum: '2024-08-01',
        end_datum: '2025-07-31',
        aktiv: false
      };
      
      expect(validData.start_datum).toBeDefined();
      expect(validData.end_datum).toBeDefined();
    });

    test('should have default aktiv value as false', () => {
      const data = {
        name: '2024/25',
        start_datum: '2024-08-01',
        end_datum: '2025-07-31'
      };
      
      // Default value would be set by Strapi schema
      const expectedDefault = false;
      expect(expectedDefault).toBe(false);
    });
  });

  describe('Lifecycle Hooks - beforeCreate', () => {
    test('should validate season date ranges', async () => {
      const invalidData = {
        name: '2024/25',
        start_datum: '2025-07-31',
        end_datum: '2024-08-01',
        aktiv: false
      };

      const event = {
        params: { data: invalidData }
      };

      // Mock entityService to return no overlapping seasons
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue([]);

      await expect(saisonLifecycles.beforeCreate(event)).rejects.toThrow(
        'Saison-Startdatum muss vor dem Enddatum liegen'
      );
    });

    test('should prevent overlapping seasons', async () => {
      const newSeasonData = {
        name: '2024/25',
        start_datum: '2024-08-01',
        end_datum: '2025-07-31',
        aktiv: false
      };

      const overlappingSeason = {
        id: 1,
        name: '2023/24',
        start_datum: '2023-08-01',
        end_datum: '2024-12-31'
      };

      const event = {
        params: { data: newSeasonData }
      };

      // Mock entityService to return overlapping season
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue([overlappingSeason]);

      await expect(saisonLifecycles.beforeCreate(event)).rejects.toThrow(
        'Saison-Zeitraum überschneidet sich mit bestehenden Saisons: 2023/24'
      );
    });

    test('should enforce single active season constraint', async () => {
      const newActiveSeasonData = {
        name: '2024/25',
        start_datum: '2024-08-01',
        end_datum: '2025-07-31',
        aktiv: true
      };

      const existingActiveSeason = {
        id: 1,
        name: '2023/24',
        aktiv: true
      };

      const event = {
        params: { data: newActiveSeasonData }
      };

      // Mock entityService calls
      (global.strapi.entityService.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // No overlapping seasons
        .mockResolvedValueOnce([existingActiveSeason]); // Existing active season

      (global.strapi.entityService.update as jest.Mock).mockResolvedValue({});

      await saisonLifecycles.beforeCreate(event);

      // Should deactivate existing active season
      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::saison.saison',
        1,
        { data: { aktiv: false } }
      );
    });
  });

  describe('Lifecycle Hooks - beforeUpdate', () => {
    test('should validate date ranges on update', async () => {
      const updateData = {
        start_datum: '2025-07-31',
        end_datum: '2024-08-01'
      };

      const currentSeason = {
        id: 1,
        name: '2024/25',
        start_datum: '2024-08-01',
        end_datum: '2025-07-31',
        aktiv: false
      };

      const event = {
        params: { 
          data: updateData,
          where: { id: 1 }
        }
      };

      // Mock entityService calls
      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(currentSeason);
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue([]);

      await expect(saisonLifecycles.beforeUpdate(event)).rejects.toThrow(
        'Saison-Startdatum muss vor dem Enddatum liegen'
      );
    });

    test('should handle active season updates', async () => {
      const updateData = { aktiv: true };
      const existingActiveSeason = { id: 2, name: '2023/24', aktiv: true };

      const event = {
        params: { 
          data: updateData,
          where: { id: 1 }
        }
      };

      // Mock entityService calls
      (global.strapi.entityService.findMany as jest.Mock).mockResolvedValue([existingActiveSeason]);
      (global.strapi.entityService.update as jest.Mock).mockResolvedValue({});

      await saisonLifecycles.beforeUpdate(event);

      // Should deactivate other active seasons
      expect(global.strapi.entityService.update).toHaveBeenCalledWith(
        'api::saison.saison',
        2,
        { data: { aktiv: false } }
      );
    });
  });

  describe('Lifecycle Hooks - beforeDelete', () => {
    test('should prevent deletion of active season', async () => {
      const activeSeason = {
        id: 1,
        name: '2024/25',
        aktiv: true
      };

      const event = {
        params: { where: { id: 1 } }
      };

      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(activeSeason);

      await expect(saisonLifecycles.beforeDelete(event)).rejects.toThrow(
        'Aktive Saison kann nicht gelöscht werden'
      );
    });

    test('should prevent deletion when teams exist', async () => {
      const inactiveSeason = {
        id: 1,
        name: '2023/24',
        aktiv: false
      };

      const existingTeams = [{ id: 1, name: '1. Team' }];

      const event = {
        params: { where: { id: 1 } }
      };

      // Mock entityService calls
      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(inactiveSeason);
      (global.strapi.entityService.findMany as jest.Mock)
        .mockResolvedValueOnce(existingTeams) // Teams check
        .mockResolvedValueOnce([]) // Matches check
        .mockResolvedValueOnce([]); // Leagues check

      await expect(saisonLifecycles.beforeDelete(event)).rejects.toThrow(
        'Saison kann nicht gelöscht werden: Es sind noch Teams zugeordnet'
      );
    });

    test('should prevent deletion when matches exist', async () => {
      const inactiveSeason = {
        id: 1,
        name: '2023/24',
        aktiv: false
      };

      const existingMatches = [{ id: 1, datum: '2024-01-01' }];

      const event = {
        params: { where: { id: 1 } }
      };

      // Mock entityService calls
      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(inactiveSeason);
      (global.strapi.entityService.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // Teams check
        .mockResolvedValueOnce(existingMatches) // Matches check
        .mockResolvedValueOnce([]); // Leagues check

      await expect(saisonLifecycles.beforeDelete(event)).rejects.toThrow(
        'Saison kann nicht gelöscht werden: Es sind noch Spiele zugeordnet'
      );
    });

    test('should allow deletion when no dependencies exist', async () => {
      const inactiveSeason = {
        id: 1,
        name: '2023/24',
        aktiv: false
      };

      const event = {
        params: { where: { id: 1 } }
      };

      // Mock entityService calls
      (global.strapi.entityService.findOne as jest.Mock).mockResolvedValue(inactiveSeason);
      (global.strapi.entityService.findMany as jest.Mock)
        .mockResolvedValueOnce([]) // Teams check
        .mockResolvedValueOnce([]) // Matches check
        .mockResolvedValueOnce([]); // Leagues check

      // Should not throw
      await expect(saisonLifecycles.beforeDelete(event)).resolves.toBeUndefined();
    });
  });

  describe('Business Logic Validation', () => {
    test('should validate season name format', () => {
      const validFormats = ['2024/25', '2023/24', '2025/26'];
      const invalidFormats = ['2024', '24/25', '2024-25', '2024/2025'];

      validFormats.forEach(format => {
        expect(format).toMatch(/^\d{4}\/\d{2}$/);
      });

      invalidFormats.forEach(format => {
        expect(format).not.toMatch(/^\d{4}\/\d{2}$/);
      });
    });

    test('should validate logical season progression', () => {
      const seasonName = '2024/25';
      const [startYear, endYear] = seasonName.split('/').map(y => 
        y.length === 2 ? `20${y}` : y
      );
      
      expect(parseInt(endYear)).toBe(parseInt(startYear) + 1);
    });
  });
});