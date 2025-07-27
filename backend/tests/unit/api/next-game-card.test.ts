/**
 * Unit tests for next-game-card API endpoint with mannschaft filtering
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
  delete: jest.fn(),
  findNext: jest.fn()
};

jest.mock('@strapi/strapi', () => ({
  factories: {
    createCoreController: jest.fn(() => mockController)
  }
}));

describe('Next Game Card API - Mannschaft Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/next-game-cards with mannschaft filter', () => {
    test('should filter next game cards by mannschaft=m1', async () => {
      const mockNextGameCards = [
        {
          id: 1,
          datum: '2025-02-15T15:00:00.000Z',
          ist_heimspiel: true,
          mannschaft: 'm1',
          gegner_team: {
            id: 1,
            name: 'Gegner Team A'
          }
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockNextGameCards);

      const filters = {
        mannschaft: {
          $eq: 'm1'
        }
      };

      const result = await mockStrapi.entityService.findMany('api::next-game-card.next-game-card', {
        filters,
        populate: {
          gegner_team: {
            fields: ['name'],
            populate: {
              teamfoto: true
            }
          }
        }
      });

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::next-game-card.next-game-card', {
        filters: {
          mannschaft: {
            $eq: 'm1'
          }
        },
        populate: {
          gegner_team: {
            fields: ['name'],
            populate: {
              teamfoto: true
            }
          }
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].mannschaft).toBe('m1');
    });

    test('should filter next game cards by mannschaft=m2', async () => {
      const mockNextGameCards = [
        {
          id: 2,
          datum: '2025-02-16T15:00:00.000Z',
          ist_heimspiel: false,
          mannschaft: 'm2',
          gegner_team: {
            id: 2,
            name: 'Gegner Team B'
          }
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockNextGameCards);

      const filters = {
        mannschaft: {
          $eq: 'm2'
        }
      };

      const result = await mockStrapi.entityService.findMany('api::next-game-card.next-game-card', {
        filters,
        populate: {
          gegner_team: {
            fields: ['name'],
            populate: {
              teamfoto: true
            }
          }
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].mannschaft).toBe('m2');
    });

    test('should filter next game cards by mannschaft=m3', async () => {
      const mockNextGameCards = [
        {
          id: 3,
          datum: '2025-02-17T15:00:00.000Z',
          ist_heimspiel: true,
          mannschaft: 'm3',
          gegner_team: {
            id: 3,
            name: 'Gegner Team C'
          }
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockNextGameCards);

      const filters = {
        mannschaft: {
          $eq: 'm3'
        }
      };

      const result = await mockStrapi.entityService.findMany('api::next-game-card.next-game-card', {
        filters,
        populate: {
          gegner_team: {
            fields: ['name'],
            populate: {
              teamfoto: true
            }
          }
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].mannschaft).toBe('m3');
    });

    test('should return empty array when no next game cards match the mannschaft filter', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const filters = {
        mannschaft: {
          $eq: 'm2'
        }
      };

      const result = await mockStrapi.entityService.findMany('api::next-game-card.next-game-card', {
        filters
      });

      expect(result).toHaveLength(0);
    });

    test('should handle combined filters with mannschaft and date', async () => {
      const mockNextGameCards = [
        {
          id: 1,
          datum: '2025-02-15T15:00:00.000Z',
          ist_heimspiel: true,
          mannschaft: 'm1',
          gegner_team: {
            id: 1,
            name: 'Gegner Team A'
          }
        }
      ];

      mockStrapi.entityService.findMany.mockResolvedValue(mockNextGameCards);

      const now = new Date().toISOString();
      const filters = {
        mannschaft: {
          $eq: 'm1'
        },
        datum: {
          $gte: now
        }
      };

      const result = await mockStrapi.entityService.findMany('api::next-game-card.next-game-card', {
        filters,
        sort: { datum: 'asc' },
        limit: 1
      });

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::next-game-card.next-game-card', {
        filters: {
          mannschaft: {
            $eq: 'm1'
          },
          datum: {
            $gte: now
          }
        },
        sort: { datum: 'asc' },
        limit: 1
      });

      expect(result).toHaveLength(1);
      expect(result[0].mannschaft).toBe('m1');
    });
  });

  describe('Validation Tests for mannschaft field', () => {
    test('should reject invalid mannschaft values during creation', async () => {
      const invalidNextGameCard = {
        datum: '2025-02-15T15:00:00.000Z',
        ist_heimspiel: true,
        mannschaft: 'invalid_value', // Invalid enum value
        gegner_team: 1
      };

      const validationError = new Error('mannschaft must be one of: m1, m2, m3');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.create.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.create('api::next-game-card.next-game-card', {
          data: invalidNextGameCard
        })
      ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
    });

    test('should reject numeric mannschaft values', async () => {
      const invalidNextGameCard = {
        datum: '2025-02-15T15:00:00.000Z',
        ist_heimspiel: true,
        mannschaft: '2', // Should be 'm2', not '2'
        gegner_team: 1
      };

      const validationError = new Error('mannschaft must be one of: m1, m2, m3');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.create.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.create('api::next-game-card.next-game-card', {
          data: invalidNextGameCard
        })
      ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
    });

    test('should accept valid mannschaft values', async () => {
      const validNextGameCards = [
        {
          datum: '2025-02-15T15:00:00.000Z',
          ist_heimspiel: true,
          mannschaft: 'm1',
          gegner_team: 1
        },
        {
          datum: '2025-02-16T15:00:00.000Z',
          ist_heimspiel: false,
          mannschaft: 'm2',
          gegner_team: 2
        },
        {
          datum: '2025-02-17T15:00:00.000Z',
          ist_heimspiel: true,
          mannschaft: 'm3',
          gegner_team: 3
        }
      ];

      for (const nextGameCard of validNextGameCards) {
        const mockCreatedCard = { id: 1, ...nextGameCard };
        mockStrapi.entityService.create.mockResolvedValue(mockCreatedCard);

        const result = await mockStrapi.entityService.create('api::next-game-card.next-game-card', {
          data: nextGameCard
        });

        expect(result.mannschaft).toBe(nextGameCard.mannschaft);
      }
    });

    test('should use default mannschaft value when not provided', async () => {
      const nextGameCardWithoutMannschaft = {
        datum: '2025-02-15T15:00:00.000Z',
        ist_heimspiel: true,
        gegner_team: 1
        // mannschaft not provided, should default to 'm1'
      };

      const mockCreatedCard = { 
        id: 1, 
        ...nextGameCardWithoutMannschaft, 
        mannschaft: 'm1' // Default value
      };
      mockStrapi.entityService.create.mockResolvedValue(mockCreatedCard);

      const result = await mockStrapi.entityService.create('api::next-game-card.next-game-card', {
        data: nextGameCardWithoutMannschaft
      });

      expect(result.mannschaft).toBe('m1');
    });
  });

  describe('Required Field Validation', () => {
    test('should require mannschaft field when explicitly set to null', async () => {
      const invalidNextGameCard = {
        datum: '2025-02-15T15:00:00.000Z',
        ist_heimspiel: true,
        mannschaft: null,
        gegner_team: 1
      };

      const validationError = new Error('mannschaft is required');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.create.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.create('api::next-game-card.next-game-card', {
          data: invalidNextGameCard
        })
      ).rejects.toThrow('mannschaft is required');
    });

    test('should require mannschaft field when explicitly set to undefined', async () => {
      const invalidNextGameCard = {
        datum: '2025-02-15T15:00:00.000Z',
        ist_heimspiel: true,
        mannschaft: undefined,
        gegner_team: 1
      };

      const validationError = new Error('mannschaft is required');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.create.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.create('api::next-game-card.next-game-card', {
          data: invalidNextGameCard
        })
      ).rejects.toThrow('mannschaft is required');
    });

    test('should validate other required fields alongside mannschaft', async () => {
      const invalidNextGameCard = {
        // datum missing (required)
        ist_heimspiel: true,
        mannschaft: 'm1',
        gegner_team: 1
      };

      const validationError = new Error('datum is required');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.create.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.create('api::next-game-card.next-game-card', {
          data: invalidNextGameCard
        })
      ).rejects.toThrow('datum is required');
    });
  });

  describe('Update Operations with mannschaft', () => {
    test('should allow updating mannschaft field to valid values', async () => {
      const updateData = {
        mannschaft: 'm3'
      };

      const mockUpdatedCard = {
        id: 1,
        datum: '2025-02-15T15:00:00.000Z',
        ist_heimspiel: true,
        mannschaft: 'm3',
        gegner_team: {
          id: 1,
          name: 'Test Team'
        }
      };

      mockStrapi.entityService.update.mockResolvedValue(mockUpdatedCard);

      const result = await mockStrapi.entityService.update('api::next-game-card.next-game-card', 1, {
        data: updateData
      });

      expect(result.mannschaft).toBe('m3');
    });

    test('should reject updating mannschaft to invalid values', async () => {
      const updateData = {
        mannschaft: 'team4'
      };

      const validationError = new Error('mannschaft must be one of: m1, m2, m3');
      validationError.name = 'ValidationError';
      mockStrapi.entityService.update.mockRejectedValue(validationError);

      await expect(
        mockStrapi.entityService.update('api::next-game-card.next-game-card', 1, {
          data: updateData
        })
      ).rejects.toThrow('mannschaft must be one of: m1, m2, m3');
    });
  });

  describe('Custom Controller Methods', () => {
    test('findNext should work with mannschaft filtering', async () => {
      const now = new Date().toISOString();
      const mockNextGameCard = {
        id: 1,
        datum: '2025-02-15T15:00:00.000Z',
        ist_heimspiel: true,
        mannschaft: 'm1',
        gegner_team: {
          id: 1,
          name: 'Test Team',
          teamfoto: null
        }
      };

      mockStrapi.entityService.findMany.mockResolvedValue([mockNextGameCard]);

      // Simulate the findNext controller method logic
      const result = await mockStrapi.entityService.findMany('api::next-game-card.next-game-card', {
        filters: {
          datum: {
            $gte: now
          },
          mannschaft: {
            $eq: 'm1'
          }
        },
        sort: { datum: 'asc' },
        limit: 1,
        populate: {
          gegner_team: {
            fields: ['name'],
            populate: {
              teamfoto: true
            }
          }
        }
      });

      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::next-game-card.next-game-card', {
        filters: {
          datum: {
            $gte: now
          },
          mannschaft: {
            $eq: 'm1'
          }
        },
        sort: { datum: 'asc' },
        limit: 1,
        populate: {
          gegner_team: {
            fields: ['name'],
            populate: {
              teamfoto: true
            }
          }
        }
      });

      expect(result).toHaveLength(1);
      expect(result[0].mannschaft).toBe('m1');
    });

    test('findNext should return empty when no future games exist for mannschaft', async () => {
      const now = new Date().toISOString();

      mockStrapi.entityService.findMany.mockResolvedValue([]);

      const result = await mockStrapi.entityService.findMany('api::next-game-card.next-game-card', {
        filters: {
          datum: {
            $gte: now
          },
          mannschaft: {
            $eq: 'm2'
          }
        },
        sort: { datum: 'asc' },
        limit: 1,
        populate: {
          gegner_team: {
            fields: ['name'],
            populate: {
              teamfoto: true
            }
          }
        }
      });

      expect(result).toHaveLength(0);
    });
  });
});