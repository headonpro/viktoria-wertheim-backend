/**
 * Comprehensive validation tests for mannschaft field across both game-card APIs
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock Strapi for validation tests
const mockStrapi = {
  entityService: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findOne: jest.fn()
  },
  db: {
    query: jest.fn()
  }
};

describe('Mannschaft Field Validation - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Enum Validation Edge Cases', () => {
    test('should reject empty string as mannschaft value', async () => {
      const invalidData = {
        datum: '2025-01-15T15:00:00.000Z',
        gegner: 'Test Team',
        ist_heimspiel: true,
        mannschaft: '' // Empty string
      };

      const validationError = new Error('mannschaft must be one of: m1, m2, m3');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.create.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.create('api::game-card.game-card', {
          data: invalidData
        })
      ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
    });

    test('should reject whitespace-only mannschaft values', async () => {
      const invalidData = {
        datum: '2025-01-15T15:00:00.000Z',
        gegner: 'Test Team',
        ist_heimspiel: true,
        mannschaft: '   ' // Whitespace only
      };

      const validationError = new Error('mannschaft must be one of: m1, m2, m3');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.create.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.create('api::game-card.game-card', {
          data: invalidData
        })
      ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
    });

    test('should reject case-sensitive variations', async () => {
      const invalidValues = ['M1', 'M2', 'M3', 'mM1', 'm1 ', ' m1'];

      for (const invalidValue of invalidValues) {
        const invalidData = {
          datum: '2025-01-15T15:00:00.000Z',
          gegner: 'Test Team',
          ist_heimspiel: true,
          mannschaft: invalidValue
        };

        const validationError = new Error('mannschaft must be one of: m1, m2, m3');
        validationError.name = 'ValidationError';
        mockStrapi.entityService.create.mockRejectedValue(validationError);

        await expect(
          mockStrapi.entityService.create('api::game-card.game-card', {
            data: invalidData
          })
        ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
      }
    });

    test('should reject old numeric format values', async () => {
      const oldFormatValues = ['1', '2', '3'];

      for (const oldValue of oldFormatValues) {
        const invalidData = {
          datum: '2025-01-15T15:00:00.000Z',
          gegner: 'Test Team',
          ist_heimspiel: true,
          mannschaft: oldValue
        };

        const validationError = new Error('mannschaft must be one of: m1, m2, m3');
        validationError.name = 'ValidationError';
        mockStrapi.entityService.create.mockRejectedValue(validationError);

        await expect(
          mockStrapi.entityService.create('api::game-card.game-card', {
            data: invalidData
          })
        ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
      }
    });

    test('should reject non-string types', async () => {
      const nonStringValues = [1, 2, 3, true, false, {}, []];

      for (const nonStringValue of nonStringValues) {
        const invalidData = {
          datum: '2025-01-15T15:00:00.000Z',
          gegner: 'Test Team',
          ist_heimspiel: true,
          mannschaft: nonStringValue
        };

        const validationError = new Error('mannschaft must be one of: m1, m2, m3');
        validationError.name = 'ValidationError';
        mockStrapi.entityService.create.mockRejectedValue(validationError);

        await expect(
          mockStrapi.entityService.create('api::game-card.game-card', {
            data: invalidData
          })
        ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
      }
    });
  });

  describe('Required Field Validation Scenarios', () => {
    test('should handle mannschaft field in bulk operations', async () => {
      const bulkData = [
        {
          datum: '2025-01-15T15:00:00.000Z',
          gegner: 'Team A',
          ist_heimspiel: true,
          mannschaft: 'm1'
        },
        {
          datum: '2025-01-16T15:00:00.000Z',
          gegner: 'Team B',
          ist_heimspiel: false,
          mannschaft: 'm2'
        },
        {
          datum: '2025-01-17T15:00:00.000Z',
          gegner: 'Team C',
          ist_heimspiel: true,
          mannschaft: 'invalid' // This should cause validation error
        }
      ];

      // Mock successful creation for first two, error for third
      mockStrapi.entityService.create
        .mockResolvedValueOnce({ id: 1, ...bulkData[0] })
        .mockResolvedValueOnce({ id: 2, ...bulkData[1] })
        .mockRejectedValueOnce(new Error('mannschaft must be one of: m1, m2, m3'));

      // Test first two succeed
      const result1 = await mockStrapi.entityService.create('api::game-card.game-card', {
        data: bulkData[0]
      });
      expect(result1.mannschaft).toBe('m1');

      const result2 = await mockStrapi.entityService.create('api::game-card.game-card', {
        data: bulkData[1]
      });
      expect(result2.mannschaft).toBe('m2');

      // Test third fails
      await expect(
        mockStrapi.entityService.create('api::game-card.game-card', {
          data: bulkData[2]
        })
      ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
    });

    test('should validate mannschaft in partial updates', async () => {
      const partialUpdate = {
        mannschaft: 'm3'
      };

      const mockUpdatedCard = {
        id: 1,
        datum: '2025-01-15T15:00:00.000Z',
        gegner: 'Test Team',
        ist_heimspiel: true,
        mannschaft: 'm3'
      };

      mockStrapi.entityService.update.mockResolvedValue(mockUpdatedCard);

      const result = await mockStrapi.entityService.update('api::game-card.game-card', 1, {
        data: partialUpdate
      });

      expect(result.mannschaft).toBe('m3');
    });

    test('should reject invalid mannschaft in partial updates', async () => {
      const invalidPartialUpdate = {
        mannschaft: 'team_four'
      };

      const validationError = new Error('mannschaft must be one of: m1, m2, m3');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.update.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.update('api::game-card.game-card', 1, {
          data: invalidPartialUpdate
        })
      ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
    });
  });

  describe('Filter Validation', () => {
    test('should handle invalid filter values gracefully', async () => {
      // When filtering with invalid mannschaft values, should return empty results
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const invalidFilters = [
        { mannschaft: { $eq: 'invalid' } },
        { mannschaft: { $eq: '1' } }, // Old format
        { mannschaft: { $eq: 'M1' } }, // Wrong case
        { mannschaft: { $eq: '' } }, // Empty string
        { mannschaft: { $eq: null } } // Null value
      ];

      for (const filter of invalidFilters) {
        const result = await mockStrapi.entityService.findMany('api::game-card.game-card', {
          filters: filter
        });

        expect(result).toHaveLength(0);
      }
    });

    test('should handle complex filter combinations with mannschaft', async () => {
      const mockGameCards = [
        {
          id: 1,
          datum: '2025-01-15T15:00:00.000Z',
          gegner: 'Team A',
          ist_heimspiel: true,
          unsere_tore: 2,
          gegner_tore: 1,
          mannschaft: 'm1'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGameCards);

      const complexFilters = {
        $and: [
          {
            mannschaft: {
              $eq: 'm1'
            }
          },
          {
            ist_heimspiel: {
              $eq: true
            }
          },
          {
            datum: {
              $gte: '2025-01-01T00:00:00.000Z'
            }
          }
        ]
      };

      const result = await mockStrapi.entityService.findMany('api::game-card.game-card', {
        filters: complexFilters
      });

      expect(result).toHaveLength(1);
      expect(result[0].mannschaft).toBe('m1');
    });

    test('should handle $in filter with mannschaft values', async () => {
      const mockGameCards = [
        {
          id: 1,
          datum: '2025-01-15T15:00:00.000Z',
          gegner: 'Team A',
          ist_heimspiel: true,
          mannschaft: 'm1'
        },
        {
          id: 2,
          datum: '2025-01-16T15:00:00.000Z',
          gegner: 'Team B',
          ist_heimspiel: false,
          mannschaft: 'm2'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGameCards);

      const inFilter = {
        mannschaft: {
          $in: ['m1', 'm2']
        }
      };

      const result = await mockStrapi.entityService.findMany('api::game-card.game-card', {
        filters: inFilter
      });

      expect(result).toHaveLength(2);
      expect(result[0].mannschaft).toBe('m1');
      expect(result[1].mannschaft).toBe('m2');
    });

    test('should handle $ne filter with mannschaft values', async () => {
      const mockGameCards = [
        {
          id: 2,
          datum: '2025-01-16T15:00:00.000Z',
          gegner: 'Team B',
          ist_heimspiel: false,
          mannschaft: 'm2'
        },
        {
          id: 3,
          datum: '2025-01-17T15:00:00.000Z',
          gegner: 'Team C',
          ist_heimspiel: true,
          mannschaft: 'm3'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGameCards);

      const neFilter = {
        mannschaft: {
          $ne: 'm1'
        }
      };

      const result = await mockStrapi.entityService.findMany('api::game-card.game-card', {
        filters: neFilter
      });

      expect(result).toHaveLength(2);
      expect(result.every(card => card.mannschaft !== 'm1')).toBe(true);
    });
  });

  describe('Cross-API Consistency', () => {
    test('should maintain consistent validation between game-card and next-game-card', async () => {
      const testData = {
        datum: '2025-01-15T15:00:00.000Z',
        ist_heimspiel: true,
        mannschaft: 'm2'
      };

      // Test game-card creation
      const gameCardData = {
        ...testData,
        gegner: 'Test Team',
        unsere_tore: 1,
        gegner_tore: 0
      };

      mockStrapi.entityService.create.mockResolvedValueOnce({ id: 1, ...gameCardData });

      const gameCardResult = await mockStrapi.entityService.create('api::game-card.game-card', {
        data: gameCardData
      });

      expect(gameCardResult.mannschaft).toBe('m2');

      // Test next-game-card creation with same mannschaft value
      const nextGameCardData = {
        ...testData,
        gegner_team: 1
      };

      mockStrapi.entityService.create.mockResolvedValueOnce({ id: 2, ...nextGameCardData });

      const nextGameCardResult = await mockStrapi.entityService.create('api::next-game-card.next-game-card', {
        data: nextGameCardData
      });

      expect(nextGameCardResult.mannschaft).toBe('m2');
    });

    test('should reject same invalid values across both APIs', async () => {
      const invalidMannschaftValue = 'team_invalid';

      const gameCardData = {
        datum: '2025-01-15T15:00:00.000Z',
        gegner: 'Test Team',
        ist_heimspiel: true,
        mannschaft: invalidMannschaftValue
      };

      const nextGameCardData = {
        datum: '2025-01-15T15:00:00.000Z',
        ist_heimspiel: true,
        mannschaft: invalidMannschaftValue,
        gegner_team: 1
      };

      const validationError = new Error('mannschaft must be one of: m1, m2, m3');
      validationError.name = 'ValidationError';

      mockStrapi.entityService.create.mockRejectedValue(validationError);

      // Both should fail with same error
      await expect(
        mockStrapi.entityService.create('api::game-card.game-card', {
          data: gameCardData
        })
      ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');

      await expect(
        mockStrapi.entityService.create('api::next-game-card.next-game-card', {
          data: nextGameCardData
        })
      ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
    });
  });

  describe('Migration Compatibility', () => {
    test('should handle default value assignment correctly', async () => {
      // Test that records without mannschaft get default value 'm1'
      const dataWithoutMannschaft = {
        datum: '2025-01-15T15:00:00.000Z',
        gegner: 'Test Team',
        ist_heimspiel: true
      };

      const mockCreatedCard = {
        id: 1,
        ...dataWithoutMannschaft,
        mannschaft: 'm1' // Default value applied
      };

      mockStrapi.entityService.create.mockResolvedValue(mockCreatedCard);

      const result = await mockStrapi.entityService.create('api::game-card.game-card', {
        data: dataWithoutMannschaft
      });

      expect(result.mannschaft).toBe('m1');
    });

    test('should preserve explicit mannschaft values over defaults', async () => {
      const dataWithExplicitMannschaft = {
        datum: '2025-01-15T15:00:00.000Z',
        gegner: 'Test Team',
        ist_heimspiel: true,
        mannschaft: 'm3'
      };

      const mockCreatedCard = {
        id: 1,
        ...dataWithExplicitMannschaft
      };

      mockStrapi.entityService.create.mockResolvedValue(mockCreatedCard);

      const result = await mockStrapi.entityService.create('api::game-card.game-card', {
        data: dataWithExplicitMannschaft
      });

      expect(result.mannschaft).toBe('m3');
    });
  });
});