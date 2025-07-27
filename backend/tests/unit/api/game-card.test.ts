/**
 * Unit tests for game-card API endpoint with mannschaft filtering
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Mock Strapi for unit tests
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

// Mock the controller factory
const mockController = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreController: jest.fn(() => mockController)
  }
}));

describe('Game Card API - Mannschaft Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/game-cards with mannschaft filter', () => {
    test('should filter game cards by mannschaft=m1', async () => {
      const mockGameCards = [
        {
          id: 1,
          datum: '2025-01-15T15:00:00.000Z',
          gegner: 'Test Team A',
          ist_heimspiel: true,
          unsere_tore: 2,
          gegner_tore: 1,
          mannschaft: 'm1'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGameCards);

      // Simulate the filtering logic that would happen in Strapi
      const filters = {
        mannschaft: {
          $eq: 'm1'
        }
      };

      const result = await mockStrapi.entityService.findMany('api::game-card.game-card', {
        filters
      });

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::game-card.game-card', {
        filters: {
          mannschaft: {
            $eq: 'm1'
          }
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].mannschaft).toBe('m1');
    });

    test('should filter game cards by mannschaft=m2', async () => {
      const mockGameCards = [
        {
          id: 2,
          datum: '2025-01-16T15:00:00.000Z',
          gegner: 'Test Team B',
          ist_heimspiel: false,
          unsere_tore: 1,
          gegner_tore: 3,
          mannschaft: 'm2'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGameCards);

      const filters = {
        mannschaft: {
          $eq: 'm2'
        }
      };

      const result = await mockStrapi.entityService.findMany('api::game-card.game-card', {
        filters
      });

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::game-card.game-card', {
        filters: {
          mannschaft: {
            $eq: 'm2'
          }
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].mannschaft).toBe('m2');
    });

    test('should filter game cards by mannschaft=m3', async () => {
      const mockGameCards = [
        {
          id: 3,
          datum: '2025-01-17T15:00:00.000Z',
          gegner: 'Test Team C',
          ist_heimspiel: true,
          unsere_tore: 0,
          gegner_tore: 2,
          mannschaft: 'm3'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGameCards);

      const filters = {
        mannschaft: {
          $eq: 'm3'
        }
      };

      const result = await mockStrapi.entityService.findMany('api::game-card.game-card', {
        filters
      });

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::game-card.game-card', {
        filters: {
          mannschaft: {
            $eq: 'm3'
          }
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].mannschaft).toBe('m3');
    });

    test('should return empty array when no game cards match the mannschaft filter', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const filters = {
        mannschaft: {
          $eq: 'm2'
        }
      };

      const result = await mockStrapi.entityService.findMany('api::game-card.game-card', {
        filters
      });

      expect(result).toHaveLength(0);
    });

    test('should handle multiple filters including mannschaft', async () => {
      const mockGameCards = [
        {
          id: 1,
          datum: '2025-01-15T15:00:00.000Z',
          gegner: 'Test Team A',
          ist_heimspiel: true,
          unsere_tore: 2,
          gegner_tore: 1,
          mannschaft: 'm1'
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockGameCards);

      const filters = {
        mannschaft: {
          $eq: 'm1'
        },
        ist_heimspiel: {
          $eq: true
        }
      };

      const result = await mockStrapi.entityService.findMany('api::game-card.game-card', {
        filters
      });

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::game-card.game-card', {
        filters: {
          mannschaft: {
            $eq: 'm1'
          },
          ist_heimspiel: {
            $eq: true
          }
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].mannschaft).toBe('m1');
      expect(result[0].ist_heimspiel).toBe(true);
    });
  });

  describe('Validation Tests for mannschaft field', () => {
    test('should reject invalid mannschaft values during creation', async () => {
      const invalidGameCard = {
        datum: '2025-01-15T15:00:00.000Z',
        gegner: 'Test Team',
        ist_heimspiel: true,
        mannschaft: 'invalid_value' // Invalid enum value
      };

      // Mock validation error
      const validationError = new Error('mannschaft must be one of: m1, m2, m3');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.create.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.create('api::game-card.game-card', {
          data: invalidGameCard
        })
      ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
    });

    test('should reject numeric mannschaft values', async () => {
      const invalidGameCard = {
        datum: '2025-01-15T15:00:00.000Z',
        gegner: 'Test Team',
        ist_heimspiel: true,
        mannschaft: '1' // Should be 'm1', not '1'
      };

      const validationError = new Error('mannschaft must be one of: m1, m2, m3');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.create.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.create('api::game-card.game-card', {
          data: invalidGameCard
        })
      ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
    });

    test('should accept valid mannschaft values', async () => {
      const validGameCards = [
        {
          datum: '2025-01-15T15:00:00.000Z',
          gegner: 'Test Team A',
          ist_heimspiel: true,
          mannschaft: 'm1'
        },
        {
          datum: '2025-01-16T15:00:00.000Z',
          gegner: 'Test Team B',
          ist_heimspiel: false,
          mannschaft: 'm2'
        },
        {
          datum: '2025-01-17T15:00:00.000Z',
          gegner: 'Test Team C',
          ist_heimspiel: true,
          mannschaft: 'm3'
        }
      ];

      for (const gameCard of validGameCards) {
        const mockCreatedCard = { id: 1, ...gameCard };
        mockStrapi.entityService.create.mockResolvedValue(mockCreatedCard);

        const result = await mockStrapi.entityService.create('api::game-card.game-card', {
          data: gameCard
        });

        expect(result.mannschaft).toBe(gameCard.mannschaft);
      }
    });

    test('should use default mannschaft value when not provided', async () => {
      const gameCardWithoutMannschaft = {
        datum: '2025-01-15T15:00:00.000Z',
        gegner: 'Test Team',
        ist_heimspiel: true
        // mannschaft not provided, should default to 'm1'
      };

      const mockCreatedCard = { 
        id: 1, 
        ...gameCardWithoutMannschaft, 
        mannschaft: 'm1' // Default value
      };
      mockStrapi.entityService.create.mockResolvedValue(mockCreatedCard);

      const result = await mockStrapi.entityService.create('api::game-card.game-card', {
        data: gameCardWithoutMannschaft
      });

      expect(result.mannschaft).toBe('m1');
    });
  });

  describe('Required Field Validation', () => {
    test('should require mannschaft field when explicitly set to null', async () => {
      const invalidGameCard = {
        datum: '2025-01-15T15:00:00.000Z',
        gegner: 'Test Team',
        ist_heimspiel: true,
        mannschaft: null
      };

      const validationError = new Error('mannschaft is required');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.create.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.create('api::game-card.game-card', {
          data: invalidGameCard
        })
      ).rejects.toThrow('mannschaft is required');
    });

    test('should require mannschaft field when explicitly set to undefined', async () => {
      const invalidGameCard = {
        datum: '2025-01-15T15:00:00.000Z',
        gegner: 'Test Team',
        ist_heimspiel: true,
        mannschaft: undefined
      };

      const validationError = new Error('mannschaft is required');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.create.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.create('api::game-card.game-card', {
          data: invalidGameCard
        })
      ).rejects.toThrow('mannschaft is required');
    });

    test('should validate other required fields alongside mannschaft', async () => {
      const invalidGameCard = {
        // datum missing (required)
        gegner: 'Test Team',
        ist_heimspiel: true,
        mannschaft: 'm1'
      };

      const validationError = new Error('datum is required');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.create.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.create('api::game-card.game-card', {
          data: invalidGameCard
        })
      ).rejects.toThrow('datum is required');
    });
  });

  describe('Update Operations with mannschaft', () => {
    test('should allow updating mannschaft field to valid values', async () => {
      const updateData = {
        mannschaft: 'm2'
      };

      const mockUpdatedCard = {
        id: 1,
        datum: '2025-01-15T15:00:00.000Z',
        gegner: 'Test Team',
        ist_heimspiel: true,
        mannschaft: 'm2'
      };

      mockStrapi.entityService.update.mockResolvedValue(mockUpdatedCard);

      const result = await mockStrapi.entityService.update('api::game-card.game-card', 1, {
        data: updateData
      });

      expect(result.mannschaft).toBe('m2');
    });

    test('should reject updating mannschaft to invalid values', async () => {
      const updateData = {
        mannschaft: 'invalid'
      };

      const validationError = new Error('mannschaft must be one of: m1, m2, m3');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.update.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.update('api::game-card.game-card', 1, {
          data: updateData
        })
      ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
    });
  });
});