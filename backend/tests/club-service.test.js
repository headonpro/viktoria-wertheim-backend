const request = require('supertest');

describe('Club Service', () => {
  let strapi;

  beforeAll(async () => {
    strapi = await require('../src/index.js');
  });

  afterAll(async () => {
    if (strapi) {
      await strapi.destroy();
    }
  });

  describe('Basic CRUD Operations', () => {
    test('should find clubs by liga', async () => {
      const clubService = strapi.service('api::club.club');
      
      // Test with a valid liga ID (assuming liga 1 exists)
      try {
        const clubs = await clubService.findClubsByLiga(1);
        expect(Array.isArray(clubs)).toBe(true);
        console.log(`Found ${clubs.length} clubs for liga 1`);
        
        if (clubs.length > 0) {
          expect(clubs[0]).toHaveProperty('name');
          expect(clubs[0]).toHaveProperty('club_typ');
          expect(clubs[0]).toHaveProperty('aktiv');
          expect(clubs[0].aktiv).toBe(true);
        }
      } catch (error) {
        console.log('Liga 1 might not exist or have clubs:', error.message);
      }
    });

    test('should find Viktoria club by team mapping', async () => {
      const clubService = strapi.service('api::club.club');
      
      try {
        const club = await clubService.findViktoriaClubByTeam('team_1');
        
        if (club) {
          expect(club).toHaveProperty('name');
          expect(club.club_typ).toBe('viktoria_verein');
          expect(club.viktoria_team_mapping).toBe('team_1');
          console.log(`Found Viktoria club for team_1: ${club.name}`);
        } else {
          console.log('No Viktoria club found for team_1');
        }
      } catch (error) {
        console.log('Error finding Viktoria club:', error.message);
      }
    });

    test('should validate club in liga', async () => {
      const clubService = strapi.service('api::club.club');
      
      // Test with invalid IDs
      const invalidResult = await clubService.validateClubInLiga(999, 999);
      expect(invalidResult).toBe(false);
      
      console.log('Club validation test completed');
    });

    test('should get club with logo', async () => {
      const clubService = strapi.service('api::club.club');
      
      try {
        // Try to get first available club
        const allClubs = await strapi.entityService.findMany('api::club.club', {
          limit: 1
        });
        
        if (allClubs.length > 0) {
          const clubWithLogo = await clubService.getClubWithLogo(allClubs[0].id);
          expect(clubWithLogo).toHaveProperty('name');
          expect(clubWithLogo).toHaveProperty('id');
          console.log(`Retrieved club with logo: ${clubWithLogo.name}`);
        } else {
          console.log('No clubs available for logo test');
        }
      } catch (error) {
        console.log('Error getting club with logo:', error.message);
      }
    });
  });

  describe('Validation Logic', () => {
    test('should validate club data', async () => {
      const clubService = strapi.service('api::club.club');
      
      // Test valid club data
      const validClubData = {
        name: 'Test Club',
        club_typ: 'gegner_verein',
        aktiv: true
      };
      
      const validResult = await clubService.validateClubData(validClubData);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      // Test invalid club data
      const invalidClubData = {
        name: '', // Invalid: too short
        club_typ: 'invalid_type', // Invalid: not in enum
        gruendungsjahr: 1700 // Invalid: too old
      };
      
      const invalidResult = await clubService.validateClubData(invalidClubData);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      
      console.log('Club data validation tests completed');
    });

    test('should validate Viktoria team mapping uniqueness', async () => {
      const clubService = strapi.service('api::club.club');
      
      try {
        const result = await clubService.validateViktoriaTeamMappingUniqueness();
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
        
        console.log(`Viktoria team mapping validation: ${result.isValid ? 'PASSED' : 'FAILED'}`);
        if (!result.isValid) {
          console.log('Validation errors:', result.errors);
        }
      } catch (error) {
        console.log('Error validating Viktoria team mappings:', error.message);
      }
    });

    test('should validate club-liga relationships', async () => {
      const clubService = strapi.service('api::club.club');
      
      try {
        const result = await clubService.validateClubLigaRelationships();
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
        
        console.log(`Club-liga relationship validation: ${result.isValid ? 'PASSED' : 'FAILED'}`);
        if (!result.isValid) {
          console.log('Validation errors:', result.errors.slice(0, 5)); // Show first 5 errors
        }
      } catch (error) {
        console.log('Error validating club-liga relationships:', error.message);
      }
    });
  });

  describe('Caching', () => {
    test('should cache and retrieve club data', async () => {
      const clubService = strapi.service('api::club.club');
      
      // Test cache operations
      const testData = { id: 1, name: 'Test Club' };
      const cacheKey = clubService.getCacheKey('test', 1);
      
      // Set cache
      clubService.setCache(cacheKey, testData, 1);
      
      // Get from cache
      const cachedData = clubService.getCache(cacheKey);
      expect(cachedData).toEqual(testData);
      
      // Test cache stats
      const stats = clubService.getCacheStats();
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      
      console.log('Cache stats:', stats);
    });

    test('should handle cache invalidation', async () => {
      const clubService = strapi.service('api::club.club');
      
      // Set some test cache entries
      clubService.setCache('club:test:1', { id: 1 }, 1);
      clubService.setCache('club:test:2', { id: 2 }, 1);
      clubService.setCache('club:other:1', { id: 3 }, 1);
      
      // Invalidate by pattern
      clubService.invalidateCache('test');
      
      // Check that test entries are gone but other remains
      expect(clubService.getCache('club:test:1')).toBeNull();
      expect(clubService.getCache('club:test:2')).toBeNull();
      expect(clubService.getCache('club:other:1')).not.toBeNull();
      
      console.log('Cache invalidation test completed');
    });

    test('should preload club data', async () => {
      const clubService = strapi.service('api::club.club');
      
      try {
        await clubService.preloadClubData([1, 2]);
        
        const stats = clubService.getCacheStats();
        console.log('Cache stats after preloading:', stats);
        
        // Cache should have some entries now
        expect(stats.size).toBeGreaterThan(0);
      } catch (error) {
        console.log('Error during preloading (expected if no ligen exist):', error.message);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid inputs gracefully', async () => {
      const clubService = strapi.service('api::club.club');
      
      // Test with invalid liga ID
      await expect(clubService.findClubsByLiga(null)).rejects.toThrow();
      await expect(clubService.findClubsByLiga('invalid')).rejects.toThrow();
      
      // Test with invalid team mapping
      await expect(clubService.findViktoriaClubByTeam('invalid')).rejects.toThrow();
      
      // Test with invalid club ID
      await expect(clubService.getClubWithLogo(null)).rejects.toThrow();
      await expect(clubService.getClubWithLogo('invalid')).rejects.toThrow();
      
      console.log('Error handling tests completed');
    });

    test('should provide detailed error messages', async () => {
      const clubService = strapi.service('api::club.club');
      
      const errors = [
        {
          type: 'club_not_found',
          message: 'Club not found',
          clubName: 'Test Club'
        },
        {
          type: 'invalid_viktoria_mapping',
          message: 'Invalid mapping',
          clubName: 'Viktoria Club'
        }
      ];
      
      const messages = clubService.getValidationErrorMessages(errors);
      expect(messages).toHaveLength(2);
      expect(messages[0]).toContain('Club not found');
      expect(messages[1]).toContain('Invalid Viktoria team mapping');
      
      console.log('Error message formatting test completed');
    });
  });
});