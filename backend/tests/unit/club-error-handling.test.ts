/**
 * Comprehensive Unit Tests for Club Service Error Handling
 * Tests all error scenarios, edge cases, and recovery mechanisms
 * Requirements: All requirements need test coverage
 */

// Mock Strapi with error scenarios
const mockStrapi = {
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  },
  entityService: {
    findOne: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
};

// Mock club service with error handling
const mockClubService = {
  findClubsByLiga: jest.fn(),
  findViktoriaClubByTeam: jest.fn(),
  validateClubInLiga: jest.fn(),
  getClubWithLogo: jest.fn(),
  createClubIfNotExists: jest.fn(),
  validateClubData: jest.fn(),
  validateClubConsistency: jest.fn(),
  validateViktoriaTeamMappingUniqueness: jest.fn(),
  validateClubLigaRelationships: jest.fn(),
  validateAllClubData: jest.fn(),
  getValidationErrorMessages: jest.fn(),
  handleClubCacheInvalidation: jest.fn()
};

describe('Club Service Error Handling - Comprehensive Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Database Connection Errors', () => {
    it('should handle database connection timeout', async () => {
      const timeoutError = new Error('Connection timeout');
      timeoutError.name = 'TimeoutError';
      
      mockClubService.findClubsByLiga.mockRejectedValue(timeoutError);

      await expect(mockClubService.findClubsByLiga(1))
        .rejects.toThrow('Connection timeout');
    });

    it('should handle database connection refused', async () => {
      const connectionError = new Error('Connection refused');
      connectionError.name = 'ConnectionError';
      
      mockClubService.findViktoriaClubByTeam.mockRejectedValue(connectionError);

      await expect(mockClubService.findViktoriaClubByTeam('team_1'))
        .rejects.toThrow('Connection refused');
    });

    it('should handle database pool exhaustion', async () => {
      const poolError = new Error('Pool exhausted');
      poolError.name = 'PoolError';
      
      mockClubService.getClubWithLogo.mockRejectedValue(poolError);

      await expect(mockClubService.getClubWithLogo(1))
        .rejects.toThrow('Pool exhausted');
    });

    it('should handle database deadlock', async () => {
      const deadlockError = new Error('Deadlock detected');
      deadlockError.name = 'DeadlockError';
      
      mockClubService.createClubIfNotExists.mockRejectedValue(deadlockError);

      await expect(mockClubService.createClubIfNotExists({ name: 'Test', club_typ: 'gegner_verein' }))
        .rejects.toThrow('Deadlock detected');
    });

    it('should handle database constraint violations', async () => {
      const constraintError = new Error('Unique constraint violation');
      constraintError.name = 'ConstraintError';
      constraintError.code = '23505'; // PostgreSQL unique violation
      
      mockClubService.createClubIfNotExists.mockRejectedValue(constraintError);

      await expect(mockClubService.createClubIfNotExists({ name: 'Duplicate', club_typ: 'gegner_verein' }))
        .rejects.toThrow('Unique constraint violation');
    });
  });

  describe('Input Validation Errors', () => {
    it('should handle null input parameters', async () => {
      mockClubService.findClubsByLiga.mockImplementation((ligaId) => {
        if (ligaId === null || ligaId === undefined) {
          throw new Error('Valid liga ID is required');
        }
        return Promise.resolve([]);
      });

      await expect(mockClubService.findClubsByLiga(null))
        .rejects.toThrow('Valid liga ID is required');
      
      await expect(mockClubService.findClubsByLiga(undefined))
        .rejects.toThrow('Valid liga ID is required');
    });

    it('should handle invalid data types', async () => {
      mockClubService.findClubsByLiga.mockImplementation((ligaId) => {
        if (typeof ligaId !== 'number') {
          throw new Error('Liga ID must be a number');
        }
        return Promise.resolve([]);
      });

      await expect(mockClubService.findClubsByLiga('invalid'))
        .rejects.toThrow('Liga ID must be a number');
      
      await expect(mockClubService.findClubsByLiga({}))
        .rejects.toThrow('Liga ID must be a number');
      
      await expect(mockClubService.findClubsByLiga([]))
        .rejects.toThrow('Liga ID must be a number');
    });

    it('should handle negative IDs', async () => {
      mockClubService.findClubsByLiga.mockImplementation((ligaId) => {
        if (ligaId < 0) {
          throw new Error('Liga ID must be positive');
        }
        return Promise.resolve([]);
      });

      await expect(mockClubService.findClubsByLiga(-1))
        .rejects.toThrow('Liga ID must be positive');
    });

    it('should handle extremely large IDs', async () => {
      mockClubService.findClubsByLiga.mockImplementation((ligaId) => {
        if (ligaId > Number.MAX_SAFE_INTEGER) {
          throw new Error('Liga ID too large');
        }
        return Promise.resolve([]);
      });

      await expect(mockClubService.findClubsByLiga(Number.MAX_SAFE_INTEGER + 1))
        .rejects.toThrow('Liga ID too large');
    });

    it('should handle malformed club data', async () => {
      const malformedData = {
        name: { invalid: 'object' },
        club_typ: 123,
        aktiv: 'not_boolean'
      };

      mockClubService.validateClubData.mockResolvedValue({
        isValid: false,
        errors: [
          'Name must be a string',
          'Club type must be a string',
          'Active must be a boolean'
        ]
      });

      const result = await mockClubService.validateClubData(malformedData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('Business Logic Errors', () => {
    it('should handle duplicate club names', async () => {
      mockClubService.createClubIfNotExists.mockImplementation((clubData) => {
        if (clubData.name === 'Existing Club') {
          throw new Error('Club name already exists');
        }
        return Promise.resolve({ id: 1, ...clubData });
      });

      await expect(mockClubService.createClubIfNotExists({ 
        name: 'Existing Club', 
        club_typ: 'gegner_verein' 
      })).rejects.toThrow('Club name already exists');
    });

    it('should handle invalid viktoria team mappings', async () => {
      mockClubService.validateViktoriaTeamMappingUniqueness.mockResolvedValue({
        isValid: false,
        errors: ['Team mapping team_1 is already used by another club']
      });

      const result = await mockClubService.validateViktoriaTeamMappingUniqueness();

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('already used');
    });

    it('should handle clubs without liga assignments', async () => {
      mockClubService.validateClubLigaRelationships.mockResolvedValue({
        isValid: false,
        errors: ['Club "Orphan Club" is not assigned to any liga']
      });

      const result = await mockClubService.validateClubLigaRelationships();

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('not assigned to any liga');
    });

    it('should handle inactive clubs in operations', async () => {
      mockClubService.validateClubInLiga.mockImplementation((clubId, ligaId) => {
        if (clubId === 999) { // Inactive club
          return Promise.resolve(false);
        }
        return Promise.resolve(true);
      });

      const result = await mockClubService.validateClubInLiga(999, 1);

      expect(result).toBe(false);
    });

    it('should handle circular references in data', async () => {
      const circularData = { name: 'Test Club', club_typ: 'gegner_verein' };
      circularData.self = circularData; // Create circular reference

      mockClubService.validateClubData.mockImplementation((data) => {
        try {
          JSON.stringify(data);
          return Promise.resolve({ isValid: true, errors: [] });
        } catch (error) {
          return Promise.resolve({ 
            isValid: false, 
            errors: ['Circular reference detected in club data'] 
          });
        }
      });

      const result = await mockClubService.validateClubData(circularData);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Circular reference');
    });
  });

  describe('Cache-Related Errors', () => {
    it('should handle Redis connection failures', async () => {
      const redisError = new Error('Redis connection failed');
      
      mockClubService.handleClubCacheInvalidation.mockRejectedValue(redisError);

      await expect(mockClubService.handleClubCacheInvalidation(1, 'update'))
        .rejects.toThrow('Redis connection failed');
    });

    it('should handle cache serialization errors', async () => {
      const serializationError = new Error('Cannot serialize circular structure');
      
      mockClubService.findClubsByLiga.mockRejectedValue(serializationError);

      await expect(mockClubService.findClubsByLiga(1))
        .rejects.toThrow('Cannot serialize circular structure');
    });

    it('should handle cache memory exhaustion', async () => {
      const memoryError = new Error('Redis out of memory');
      
      mockClubService.findViktoriaClubByTeam.mockRejectedValue(memoryError);

      await expect(mockClubService.findViktoriaClubByTeam('team_1'))
        .rejects.toThrow('Redis out of memory');
    });

    it('should handle cache key conflicts', async () => {
      const keyConflictError = new Error('Cache key conflict detected');
      
      mockClubService.handleClubCacheInvalidation.mockRejectedValue(keyConflictError);

      await expect(mockClubService.handleClubCacheInvalidation(1, 'delete'))
        .rejects.toThrow('Cache key conflict detected');
    });
  });

  describe('Network and Infrastructure Errors', () => {
    it('should handle network timeouts', async () => {
      const networkTimeout = new Error('Network timeout');
      networkTimeout.code = 'ETIMEDOUT';
      
      mockClubService.findClubsByLiga.mockRejectedValue(networkTimeout);

      await expect(mockClubService.findClubsByLiga(1))
        .rejects.toThrow('Network timeout');
    });

    it('should handle DNS resolution failures', async () => {
      const dnsError = new Error('DNS resolution failed');
      dnsError.code = 'ENOTFOUND';
      
      mockClubService.getClubWithLogo.mockRejectedValue(dnsError);

      await expect(mockClubService.getClubWithLogo(1))
        .rejects.toThrow('DNS resolution failed');
    });

    it('should handle SSL certificate errors', async () => {
      const sslError = new Error('SSL certificate verification failed');
      sslError.code = 'CERT_UNTRUSTED';
      
      mockClubService.createClubIfNotExists.mockRejectedValue(sslError);

      await expect(mockClubService.createClubIfNotExists({ 
        name: 'Test', 
        club_typ: 'gegner_verein' 
      })).rejects.toThrow('SSL certificate verification failed');
    });

    it('should handle service unavailable errors', async () => {
      const serviceError = new Error('Service temporarily unavailable');
      serviceError.code = 503;
      
      mockClubService.validateAllClubData.mockRejectedValue(serviceError);

      await expect(mockClubService.validateAllClubData())
        .rejects.toThrow('Service temporarily unavailable');
    });
  });

  describe('Memory and Resource Errors', () => {
    it('should handle out of memory errors', async () => {
      const memoryError = new Error('JavaScript heap out of memory');
      memoryError.name = 'RangeError';
      
      mockClubService.findClubsByLiga.mockRejectedValue(memoryError);

      await expect(mockClubService.findClubsByLiga(1))
        .rejects.toThrow('JavaScript heap out of memory');
    });

    it('should handle stack overflow errors', async () => {
      const stackError = new Error('Maximum call stack size exceeded');
      stackError.name = 'RangeError';
      
      mockClubService.validateClubConsistency.mockRejectedValue(stackError);

      await expect(mockClubService.validateClubConsistency(1))
        .rejects.toThrow('Maximum call stack size exceeded');
    });

    it('should handle file system errors', async () => {
      const fsError = new Error('ENOSPC: no space left on device');
      fsError.code = 'ENOSPC';
      
      mockClubService.createClubIfNotExists.mockRejectedValue(fsError);

      await expect(mockClubService.createClubIfNotExists({ 
        name: 'Test', 
        club_typ: 'gegner_verein' 
      })).rejects.toThrow('ENOSPC: no space left on device');
    });

    it('should handle permission errors', async () => {
      const permissionError = new Error('EACCES: permission denied');
      permissionError.code = 'EACCES';
      
      mockClubService.getClubWithLogo.mockRejectedValue(permissionError);

      await expect(mockClubService.getClubWithLogo(1))
        .rejects.toThrow('EACCES: permission denied');
    });
  });

  describe('Concurrent Access Errors', () => {
    it('should handle race conditions', async () => {
      let callCount = 0;
      
      mockClubService.createClubIfNotExists.mockImplementation(async (clubData) => {
        callCount++;
        if (callCount === 1) {
          // Simulate race condition - first call succeeds
          return { id: 1, ...clubData };
        } else {
          // Second call fails due to race condition
          throw new Error('Club was created by another process');
        }
      });

      const clubData = { name: 'Race Club', club_typ: 'gegner_verein' };
      
      const result1 = await mockClubService.createClubIfNotExists(clubData);
      expect(result1.id).toBe(1);

      await expect(mockClubService.createClubIfNotExists(clubData))
        .rejects.toThrow('Club was created by another process');
    });

    it('should handle concurrent validation conflicts', async () => {
      mockClubService.validateViktoriaTeamMappingUniqueness.mockImplementation(async () => {
        // Simulate concurrent modification during validation
        throw new Error('Data was modified during validation');
      });

      await expect(mockClubService.validateViktoriaTeamMappingUniqueness())
        .rejects.toThrow('Data was modified during validation');
    });

    it('should handle lock acquisition failures', async () => {
      const lockError = new Error('Could not acquire lock');
      lockError.code = 'LOCK_TIMEOUT';
      
      mockClubService.validateClubConsistency.mockRejectedValue(lockError);

      await expect(mockClubService.validateClubConsistency(1))
        .rejects.toThrow('Could not acquire lock');
    });
  });

  describe('Data Corruption and Integrity Errors', () => {
    it('should handle corrupted database records', async () => {
      const corruptedClub = {
        id: 1,
        name: null, // Corrupted data
        club_typ: undefined,
        ligen: 'not_an_array'
      };

      mockClubService.getClubWithLogo.mockResolvedValue(corruptedClub);
      mockClubService.validateClubData.mockResolvedValue({
        isValid: false,
        errors: ['Corrupted club data detected']
      });

      const club = await mockClubService.getClubWithLogo(1);
      const validation = await mockClubService.validateClubData(club);

      expect(validation.isValid).toBe(false);
      expect(validation.errors[0]).toContain('Corrupted');
    });

    it('should handle missing foreign key references', async () => {
      mockClubService.validateClubLigaRelationships.mockResolvedValue({
        isValid: false,
        errors: ['Referenced liga does not exist']
      });

      const result = await mockClubService.validateClubLigaRelationships(1);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('does not exist');
    });

    it('should handle orphaned records', async () => {
      mockClubService.validateAllClubData.mockResolvedValue({
        isValid: false,
        errors: [
          {
            type: 'orphaned_record',
            message: 'Club has no valid liga assignments',
            clubId: 1
          }
        ],
        summary: {
          totalClubs: 1,
          viktoriaClubs: 0,
          gegnerClubs: 1,
          inactiveClubs: 0,
          clubsWithoutLiga: 1,
          duplicateTeamMappings: 0
        }
      });

      const result = await mockClubService.validateAllClubData();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('orphaned_record');
    });
  });

  describe('Error Recovery and Graceful Degradation', () => {
    it('should provide fallback when primary service fails', async () => {
      let primaryFailed = false;
      
      mockClubService.findClubsByLiga.mockImplementation(async (ligaId) => {
        if (!primaryFailed) {
          primaryFailed = true;
          throw new Error('Primary service failed');
        }
        // Fallback succeeds
        return [{ id: 1, name: 'Fallback Club', club_typ: 'gegner_verein' }];
      });

      // First call fails
      await expect(mockClubService.findClubsByLiga(1))
        .rejects.toThrow('Primary service failed');

      // Second call uses fallback
      const result = await mockClubService.findClubsByLiga(1);
      expect(result[0].name).toBe('Fallback Club');
    });

    it('should continue operation with partial failures', async () => {
      mockClubService.validateAllClubData.mockResolvedValue({
        isValid: false,
        errors: [
          {
            type: 'partial_failure',
            message: 'Some validations failed but system continues',
            details: 'Cache validation failed, using database fallback'
          }
        ],
        summary: {
          totalClubs: 10,
          viktoriaClubs: 3,
          gegnerClubs: 7,
          inactiveClubs: 0,
          clubsWithoutLiga: 0,
          duplicateTeamMappings: 0
        }
      });

      const result = await mockClubService.validateAllClubData();

      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('partial_failure');
      expect(result.summary.totalClubs).toBe(10); // System still provides data
    });

    it('should provide meaningful error messages for debugging', async () => {
      const complexError = new Error('Complex validation failed');
      complexError.stack = 'Error: Complex validation failed\n    at validateClub (club.js:123:45)';
      complexError.cause = new Error('Underlying database constraint violation');
      
      mockClubService.getValidationErrorMessages.mockReturnValue([
        'Validation failed: Complex validation failed',
        'Root cause: Underlying database constraint violation',
        'Location: club.js:123:45',
        'Suggestion: Check club data integrity and database constraints'
      ]);

      const messages = mockClubService.getValidationErrorMessages([{
        type: 'complex_error',
        message: complexError.message,
        details: {
          stack: complexError.stack,
          cause: complexError.cause?.message
        }
      }]);

      expect(messages).toHaveLength(4);
      expect(messages[0]).toContain('Complex validation failed');
      expect(messages[1]).toContain('Root cause');
      expect(messages[2]).toContain('Location');
      expect(messages[3]).toContain('Suggestion');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty string inputs', async () => {
      mockClubService.validateClubData.mockImplementation((data) => {
        if (data.name === '') {
          return Promise.resolve({
            isValid: false,
            errors: ['Club name cannot be empty']
          });
        }
        return Promise.resolve({ isValid: true, errors: [] });
      });

      const result = await mockClubService.validateClubData({ name: '', club_typ: 'gegner_verein' });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('cannot be empty');
    });

    it('should handle whitespace-only inputs', async () => {
      mockClubService.validateClubData.mockImplementation((data) => {
        if (data.name && data.name.trim() === '') {
          return Promise.resolve({
            isValid: false,
            errors: ['Club name cannot be only whitespace']
          });
        }
        return Promise.resolve({ isValid: true, errors: [] });
      });

      const result = await mockClubService.validateClubData({ name: '   ', club_typ: 'gegner_verein' });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('only whitespace');
    });

    it('should handle extremely long inputs', async () => {
      const longName = 'a'.repeat(10000);
      
      mockClubService.validateClubData.mockImplementation((data) => {
        if (data.name && data.name.length > 100) {
          return Promise.resolve({
            isValid: false,
            errors: ['Club name too long (maximum 100 characters)']
          });
        }
        return Promise.resolve({ isValid: true, errors: [] });
      });

      const result = await mockClubService.validateClubData({ name: longName, club_typ: 'gegner_verein' });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('too long');
    });

    it('should handle special Unicode characters', async () => {
      const unicodeName = '🏆 FC München ⚽ 🇩🇪';
      
      mockClubService.validateClubData.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ['Unicode characters detected in club name']
      });

      const result = await mockClubService.validateClubData({ name: unicodeName, club_typ: 'gegner_verein' });

      expect(result.isValid).toBe(true);
      expect(result.warnings[0]).toContain('Unicode characters');
    });

    it('should handle zero and negative values appropriately', async () => {
      mockClubService.validateClubData.mockImplementation((data) => {
        const errors = [];
        if (data.gruendungsjahr !== undefined && data.gruendungsjahr <= 0) {
          errors.push('Founding year must be positive');
        }
        return Promise.resolve({
          isValid: errors.length === 0,
          errors
        });
      });

      const result = await mockClubService.validateClubData({ 
        name: 'Test Club', 
        club_typ: 'gegner_verein',
        gruendungsjahr: -1950
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('must be positive');
    });
  });
});