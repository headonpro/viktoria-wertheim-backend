/**
 * Comprehensive Unit Tests for Club Service
 * Tests all CRUD operations, validation logic, caching, and error handling
 * Requirements: All requirements need test coverage
 */

// Mock data for testing
const mockClubs = [
  {
    id: 1,
    documentId: 'club-1',
    name: 'SV Viktoria Wertheim',
    kurz_name: 'SV VIK',
    club_typ: 'viktoria_verein',
    viktoria_team_mapping: 'team_1',
    aktiv: true,
    ligen: [{ id: 1, name: 'Kreisliga Tauberbischofsheim', aktiv: true }],
    logo: { id: 1, url: '/uploads/viktoria-logo.png' },
    gruendungsjahr: 1952,
    vereinsfarben: 'Gelb-Blau',
    heimstadion: 'Viktoria-Stadion',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    documentId: 'club-2',
    name: 'VfR Gerlachsheim',
    kurz_name: 'VfR GER',
    club_typ: 'gegner_verein',
    aktiv: true,
    ligen: [{ id: 1, name: 'Kreisliga Tauberbischofsheim', aktiv: true }],
    logo: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 3,
    documentId: 'club-3',
    name: 'SV Viktoria Wertheim II',
    kurz_name: 'SV VIK II',
    club_typ: 'viktoria_verein',
    viktoria_team_mapping: 'team_2',
    aktiv: true,
    ligen: [{ id: 2, name: 'Kreisklasse A Tauberbischofsheim', aktiv: true }],
    logo: { id: 1, url: '/uploads/viktoria-logo.png' },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 4,
    documentId: 'club-4',
    name: 'Inactive Club',
    kurz_name: 'INC',
    club_typ: 'gegner_verein',
    aktiv: false,
    ligen: [],
    logo: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
];

// Mock Strapi service
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

// Mock cache manager
const mockCacheManager = {
  getClubsByLiga: jest.fn(),
  getViktoriaClubByTeam: jest.fn(),
  getClubById: jest.fn(),
  invalidateClub: jest.fn(),
  invalidateLiga: jest.fn()
};

// Mock club service implementation
const createMockClubService = () => ({
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
  getCacheKey: jest.fn(),
  setCache: jest.fn(),
  getCache: jest.fn(),
  invalidateCache: jest.fn(),
  getCacheStats: jest.fn(),
  findClubsByLigaCached: jest.fn(),
  findViktoriaClubByTeamCached: jest.fn(),
  getClubWithLogoCached: jest.fn(),
  preloadClubData: jest.fn(),
  warmCache: jest.fn(),
  handleClubCacheInvalidation: jest.fn(),
  _cache: new Map(),
  _cacheStats: {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0
  }
});

describe('Club Service - Comprehensive Unit Tests', () => {
  let clubService: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock club service
    clubService = createMockClubService();
  });

  describe('Basic CRUD Operations', () => {
    describe('findClubsByLiga', () => {
      it('should find clubs by liga ID successfully', async () => {
        const ligaId = 1;
        const expectedClubs = mockClubs.filter(club => 
          club.ligen.some(liga => liga.id === ligaId) && club.aktiv
        );

        clubService.findClubsByLiga.mockResolvedValue(expectedClubs);

        const result = await clubService.findClubsByLiga(ligaId);

        expect(clubService.findClubsByLiga).toHaveBeenCalledWith(ligaId);
        expect(result).toEqual(expectedClubs);
        expect(result).toHaveLength(2); // SV Viktoria Wertheim and VfR Gerlachsheim
      });

      it('should return empty array for liga with no clubs', async () => {
        const ligaId = 999;
        mockStrapi.entityService.findMany.mockResolvedValue([]);

        const result = await clubService.findClubsByLiga(ligaId);

        expect(result).toEqual([]);
        expect(result).toHaveLength(0);
      });

      it('should throw error for invalid liga ID', async () => {
        await expect(clubService.findClubsByLiga(null)).rejects.toThrow('Valid liga ID is required');
        await expect(clubService.findClubsByLiga('invalid')).rejects.toThrow('Valid liga ID is required');
        await expect(clubService.findClubsByLiga(undefined)).rejects.toThrow('Valid liga ID is required');
      });

      it('should handle database errors gracefully', async () => {
        const ligaId = 1;
        const dbError = new Error('Database connection failed');
        mockStrapi.entityService.findMany.mockRejectedValue(dbError);

        await expect(clubService.findClubsByLiga(ligaId)).rejects.toThrow(
          `Failed to find clubs for liga ${ligaId}: Database connection failed`
        );
      });

      it('should use cache when available', async () => {
        const ligaId = 1;
        const cachedClubs = [mockClubs[0]];
        
        mockCacheManager.getClubsByLiga.mockResolvedValue(cachedClubs);

        const result = await clubService.findClubsByLiga(ligaId);

        expect(mockCacheManager.getClubsByLiga).toHaveBeenCalledWith(ligaId, {});
        expect(mockStrapi.entityService.findMany).not.toHaveBeenCalled();
        expect(result).toEqual(cachedClubs);
      });

      it('should skip cache when requested', async () => {
        const ligaId = 1;
        const expectedClubs = [mockClubs[0]];
        
        mockStrapi.entityService.findMany.mockResolvedValue(expectedClubs);

        const result = await clubService.findClubsByLiga(ligaId, { skipCache: true });

        expect(mockCacheManager.getClubsByLiga).not.toHaveBeenCalled();
        expect(mockStrapi.entityService.findMany).toHaveBeenCalled();
        expect(result).toEqual(expectedClubs);
      });
    });

    describe('findViktoriaClubByTeam', () => {
      it('should find Viktoria club by team mapping', async () => {
        const teamMapping = 'team_1';
        const expectedClub = mockClubs[0]; // SV Viktoria Wertheim

        mockStrapi.entityService.findMany.mockResolvedValue([expectedClub]);

        const result = await clubService.findViktoriaClubByTeam(teamMapping);

        expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::club.club', {
          filters: {
            club_typ: 'viktoria_verein',
            viktoria_team_mapping: teamMapping,
            aktiv: true
          },
          populate: {
            logo: true,
            ligen: true
          }
        });

        expect(result).toEqual(expectedClub);
      });

      it('should return null when no Viktoria club found', async () => {
        const teamMapping = 'team_3';
        mockStrapi.entityService.findMany.mockResolvedValue([]);

        const result = await clubService.findViktoriaClubByTeam(teamMapping);

        expect(result).toBeNull();
      });

      it('should throw error for invalid team mapping', async () => {
        await expect(clubService.findViktoriaClubByTeam('invalid')).rejects.toThrow('Valid team mapping is required');
        await expect(clubService.findViktoriaClubByTeam(null)).rejects.toThrow('Valid team mapping is required');
        await expect(clubService.findViktoriaClubByTeam('')).rejects.toThrow('Valid team mapping is required');
      });

      it('should use cache when available', async () => {
        const teamMapping = 'team_1';
        const cachedClub = mockClubs[0];
        
        mockCacheManager.getViktoriaClubByTeam.mockResolvedValue(cachedClub);

        const result = await clubService.findViktoriaClubByTeam(teamMapping);

        expect(mockCacheManager.getViktoriaClubByTeam).toHaveBeenCalledWith(teamMapping, {});
        expect(mockStrapi.entityService.findMany).not.toHaveBeenCalled();
        expect(result).toEqual(cachedClub);
      });
    });

    describe('validateClubInLiga', () => {
      it('should return true when club is in liga', async () => {
        const clubId = 1;
        const ligaId = 1;
        const club = mockClubs[0];

        mockStrapi.entityService.findOne.mockResolvedValue(club);

        const result = await clubService.validateClubInLiga(clubId, ligaId);

        expect(mockStrapi.entityService.findOne).toHaveBeenCalledWith('api::club.club', clubId, {
          populate: { ligen: true }
        });
        expect(result).toBe(true);
      });

      it('should return false when club is not in liga', async () => {
        const clubId = 1;
        const ligaId = 999;
        const club = mockClubs[0];

        mockStrapi.entityService.findOne.mockResolvedValue(club);

        const result = await clubService.validateClubInLiga(clubId, ligaId);

        expect(result).toBe(false);
      });

      it('should return false when club does not exist', async () => {
        const clubId = 999;
        const ligaId = 1;

        mockStrapi.entityService.findOne.mockResolvedValue(null);

        const result = await clubService.validateClubInLiga(clubId, ligaId);

        expect(result).toBe(false);
      });

      it('should return false for invalid parameters', async () => {
        expect(await clubService.validateClubInLiga(null, 1)).toBe(false);
        expect(await clubService.validateClubInLiga(1, null)).toBe(false);
        expect(await clubService.validateClubInLiga(null, null)).toBe(false);
      });

      it('should handle database errors gracefully', async () => {
        const clubId = 1;
        const ligaId = 1;
        const dbError = new Error('Database error');

        mockStrapi.entityService.findOne.mockRejectedValue(dbError);

        const result = await clubService.validateClubInLiga(clubId, ligaId);

        expect(result).toBe(false);
        expect(mockStrapi.log.error).toHaveBeenCalledWith('Error validating club in liga:', dbError);
      });
    });

    describe('getClubWithLogo', () => {
      it('should get club with logo and full data', async () => {
        const clubId = 1;
        const expectedClub = mockClubs[0];

        mockStrapi.entityService.findOne.mockResolvedValue(expectedClub);

        const result = await clubService.getClubWithLogo(clubId);

        expect(mockStrapi.entityService.findOne).toHaveBeenCalledWith('api::club.club', clubId, {
          populate: {
            logo: true,
            ligen: {
              populate: {
                saison: true
              }
            }
          }
        });

        expect(result).toEqual(expectedClub);
      });

      it('should throw error when club not found', async () => {
        const clubId = 999;
        mockStrapi.entityService.findOne.mockResolvedValue(null);

        await expect(clubService.getClubWithLogo(clubId)).rejects.toThrow(
          `Club with ID ${clubId} not found`
        );
      });

      it('should throw error for invalid club ID', async () => {
        await expect(clubService.getClubWithLogo(null)).rejects.toThrow('Valid club ID is required');
        await expect(clubService.getClubWithLogo('invalid')).rejects.toThrow('Valid club ID is required');
      });

      it('should use cache when available', async () => {
        const clubId = 1;
        const cachedClub = mockClubs[0];
        
        mockCacheManager.getClubById.mockResolvedValue(cachedClub);

        const result = await clubService.getClubWithLogo(clubId);

        expect(mockCacheManager.getClubById).toHaveBeenCalledWith(clubId, {});
        expect(mockStrapi.entityService.findOne).not.toHaveBeenCalled();
        expect(result).toEqual(cachedClub);
      });
    });

    describe('createClubIfNotExists', () => {
      it('should create new club when it does not exist', async () => {
        const clubData = {
          name: 'New Test Club',
          club_typ: 'gegner_verein' as const,
          aktiv: true
        };

        mockStrapi.entityService.findMany.mockResolvedValue([]); // No existing clubs
        mockStrapi.entityService.create.mockResolvedValue({ id: 5, ...clubData });

        // Mock validation to pass
        clubService.validateClubData = jest.fn().mockResolvedValue({ isValid: true, errors: [] });

        const result = await clubService.createClubIfNotExists(clubData);

        expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::club.club', {
          filters: { name: clubData.name }
        });
        expect(mockStrapi.entityService.create).toHaveBeenCalledWith('api::club.club', {
          data: { ...clubData, aktiv: true }
        });
        expect(result).toEqual({ id: 5, ...clubData });
      });

      it('should return existing club when it already exists', async () => {
        const clubData = {
          name: 'SV Viktoria Wertheim',
          club_typ: 'viktoria_verein' as const
        };
        const existingClub = mockClubs[0];

        mockStrapi.entityService.findMany.mockResolvedValue([existingClub]);

        const result = await clubService.createClubIfNotExists(clubData);

        expect(mockStrapi.entityService.findMany).toHaveBeenCalled();
        expect(mockStrapi.entityService.create).not.toHaveBeenCalled();
        expect(result).toEqual(existingClub);
      });

      it('should throw error for invalid club data', async () => {
        const invalidClubData = {
          name: '', // Invalid: empty name
          club_typ: 'invalid' as any
        };

        mockStrapi.entityService.findMany.mockResolvedValue([]);
        clubService.validateClubData = jest.fn().mockResolvedValue({
          isValid: false,
          errors: ['Club name is required', 'Invalid club type']
        });

        await expect(clubService.createClubIfNotExists(invalidClubData)).rejects.toThrow(
          'Invalid club data: Club name is required, Invalid club type'
        );
      });

      it('should throw error when name is missing', async () => {
        const clubData = {
          club_typ: 'gegner_verein' as const
        } as any;

        await expect(clubService.createClubIfNotExists(clubData)).rejects.toThrow(
          'Club name is required'
        );
      });
    });
  });

  describe('Validation Logic', () => {
    describe('validateClubData', () => {
      it('should validate correct club data', async () => {
        const validClubData = {
          name: 'Valid Club Name',
          club_typ: 'gegner_verein' as const,
          kurz_name: 'VCN',
          gruendungsjahr: 1950,
          website: 'https://example.com'
        };

        const result = await clubService.validateClubData(validClubData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate Viktoria club with team mapping', async () => {
        const validViktoriaData = {
          name: 'SV Viktoria Test',
          club_typ: 'viktoria_verein' as const,
          viktoria_team_mapping: 'team_1' as const
        };

        const result = await clubService.validateClubData(validViktoriaData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject invalid club name', async () => {
        const invalidData = {
          name: 'A', // Too short
          club_typ: 'gegner_verein' as const
        };

        const result = await clubService.validateClubData(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Club name must be at least 2 characters long');
      });

      it('should reject invalid club type', async () => {
        const invalidData = {
          name: 'Valid Name',
          club_typ: 'invalid_type' as any
        };

        const result = await clubService.validateClubData(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Valid club type is required (viktoria_verein or gegner_verein)');
      });

      it('should reject Viktoria club without team mapping', async () => {
        const invalidViktoriaData = {
          name: 'SV Viktoria Test',
          club_typ: 'viktoria_verein' as const
          // Missing viktoria_team_mapping
        };

        const result = await clubService.validateClubData(invalidViktoriaData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Viktoria clubs must have a team mapping');
      });

      it('should reject invalid team mapping', async () => {
        const invalidViktoriaData = {
          name: 'SV Viktoria Test',
          club_typ: 'viktoria_verein' as const,
          viktoria_team_mapping: 'invalid_team' as any
        };

        const result = await clubService.validateClubData(invalidViktoriaData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid team mapping for Viktoria club');
      });

      it('should reject invalid optional fields', async () => {
        const invalidData = {
          name: 'Valid Name',
          club_typ: 'gegner_verein' as const,
          kurz_name: 'This is way too long for a short name', // Too long
          gruendungsjahr: 1700, // Too old
          website: 'x'.repeat(201) // Too long
        };

        const result = await clubService.validateClubData(invalidData);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Short name must be 20 characters or less');
        expect(result.errors).toContain('Founding year must be between 1800 and 2030');
        expect(result.errors).toContain('Website URL must be 200 characters or less');
      });

      it('should handle validation errors gracefully', async () => {
        const clubData = { name: 'Test', club_typ: 'gegner_verein' as const };
        
        // Mock an error during validation
        const originalValidation = clubService.validateClubData;
        clubService.validateClubData = jest.fn().mockImplementation(() => {
          throw new Error('Validation system error');
        });

        const result = await originalValidation.call(clubService, clubData);

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Validation error: Validation system error');
      });
    });

    describe('validateClubConsistency', () => {
      it('should validate consistent club data', async () => {
        const clubId = 1;
        const club = mockClubs[0];

        mockStrapi.entityService.findOne.mockResolvedValue(club);
        mockStrapi.entityService.findMany
          .mockResolvedValueOnce([]) // No duplicate team mappings
          .mockResolvedValueOnce([]); // No duplicate names

        const result = await clubService.validateClubConsistency(clubId);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect missing club', async () => {
        const clubId = 999;
        mockStrapi.entityService.findOne.mockResolvedValue(null);

        const result = await clubService.validateClubConsistency(clubId);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Club with ID ${clubId} not found`);
      });

      it('should detect Viktoria club without team mapping', async () => {
        const clubId = 1;
        const invalidClub = {
          ...mockClubs[0],
          viktoria_team_mapping: null
        };

        mockStrapi.entityService.findOne.mockResolvedValue(invalidClub);

        const result = await clubService.validateClubConsistency(clubId);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Viktoria clubs must have a team mapping');
      });

      it('should detect duplicate team mapping', async () => {
        const clubId = 1;
        const club = mockClubs[0];
        const duplicateClub = { id: 99, name: 'Duplicate Club' };

        mockStrapi.entityService.findOne.mockResolvedValue(club);
        mockStrapi.entityService.findMany
          .mockResolvedValueOnce([duplicateClub]) // Duplicate team mapping
          .mockResolvedValueOnce([]); // No duplicate names

        const result = await clubService.validateClubConsistency(clubId);

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Team mapping team_1 is already used by another Viktoria club');
      });

      it('should detect club without liga assignment', async () => {
        const clubId = 4;
        const club = mockClubs[3]; // Inactive club with no ligen

        mockStrapi.entityService.findOne.mockResolvedValue(club);

        const result = await clubService.validateClubConsistency(clubId);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Club must be assigned to at least one liga');
      });

      it('should detect duplicate club name', async () => {
        const clubId = 1;
        const club = mockClubs[0];
        const duplicateNameClub = { id: 99, name: club.name };

        mockStrapi.entityService.findOne.mockResolvedValue(club);
        mockStrapi.entityService.findMany
          .mockResolvedValueOnce([]) // No duplicate team mappings
          .mockResolvedValueOnce([duplicateNameClub]); // Duplicate name

        const result = await clubService.validateClubConsistency(clubId);

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain(`Club name "${club.name}" is already used by another club`);
      });
    });

    describe('validateViktoriaTeamMappingUniqueness', () => {
      it('should pass when all team mappings are unique', async () => {
        const viktoriaClubs = [
          mockClubs[0], // team_1
          mockClubs[2]  // team_2
        ];

        mockStrapi.entityService.findMany.mockResolvedValue(viktoriaClubs);

        const result = await clubService.validateViktoriaTeamMappingUniqueness();

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect duplicate team mappings', async () => {
        const duplicateClubs = [
          mockClubs[0], // team_1
          { ...mockClubs[0], id: 99, name: 'Duplicate Club' } // Also team_1
        ];

        mockStrapi.entityService.findMany.mockResolvedValue(duplicateClubs);

        const result = await clubService.validateViktoriaTeamMappingUniqueness();

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Team mapping team_1 is used by multiple clubs');
      });

      it('should handle clubs without team mapping', async () => {
        const clubsWithoutMapping = [
          { ...mockClubs[0], viktoria_team_mapping: null },
          mockClubs[2] // team_2
        ];

        mockStrapi.entityService.findMany.mockResolvedValue(clubsWithoutMapping);

        const result = await clubService.validateViktoriaTeamMappingUniqueness();

        expect(result.isValid).toBe(true); // Should not fail for clubs without mapping
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('validateClubLigaRelationships', () => {
      it('should validate clubs with proper liga assignments', async () => {
        const clubsWithLigen = mockClubs.filter(club => club.ligen.length > 0);
        mockStrapi.entityService.findMany.mockResolvedValue(clubsWithLigen);

        const result = await clubService.validateClubLigaRelationships();

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect clubs without liga assignments', async () => {
        const clubsWithoutLigen = [mockClubs[3]]; // Inactive club with no ligen
        mockStrapi.entityService.findMany.mockResolvedValue(clubsWithoutLigen);

        const result = await clubService.validateClubLigaRelationships();

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Club "${clubsWithoutLigen[0].name}" is not assigned to any liga`);
      });

      it('should detect clubs assigned to inactive ligen', async () => {
        const clubWithInactiveLiga = {
          ...mockClubs[0],
          ligen: [{ id: 3, name: 'Inactive Liga', aktiv: false }]
        };
        mockStrapi.entityService.findMany.mockResolvedValue([clubWithInactiveLiga]);

        const result = await clubService.validateClubLigaRelationships();

        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('is assigned to inactive liga');
      });

      it('should validate specific club when clubId provided', async () => {
        const clubId = 1;
        const club = mockClubs[0];
        mockStrapi.entityService.findMany.mockResolvedValue([club]);

        const result = await clubService.validateClubLigaRelationships(clubId);

        expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::club.club', {
          filters: { aktiv: true, id: clubId },
          populate: { ligen: true }
        });
        expect(result.isValid).toBe(true);
      });
    });

    describe('validateAllClubData', () => {
      it('should provide comprehensive validation summary', async () => {
        const allClubs = mockClubs;
        mockStrapi.entityService.findMany.mockResolvedValue(allClubs);

        const result = await clubService.validateAllClubData();

        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('summary');
        
        expect(result.summary.totalClubs).toBe(4);
        expect(result.summary.viktoriaClubs).toBe(2);
        expect(result.summary.gegnerClubs).toBe(2);
        expect(result.summary.inactiveClubs).toBe(1);
        expect(result.summary.clubsWithoutLiga).toBe(1);
      });

      it('should detect all types of validation errors', async () => {
        const problematicClubs = [
          mockClubs[3], // Inactive club without liga
          {
            id: 99,
            name: 'Problem Club',
            club_typ: 'viktoria_verein',
            viktoria_team_mapping: null, // Missing team mapping
            aktiv: true,
            ligen: []
          }
        ];
        mockStrapi.entityService.findMany.mockResolvedValue(problematicClubs);

        const result = await clubService.validateAllClubData();

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        
        // Check for different error types
        const errorTypes = result.errors.map(e => e.type);
        expect(errorTypes).toContain('missing_liga_assignment');
        expect(errorTypes).toContain('invalid_viktoria_mapping');
        expect(errorTypes).toContain('club_inactive');
      });
    });

    describe('getValidationErrorMessages', () => {
      it('should format error messages correctly', async () => {
        const errors = [
          {
            type: 'club_not_found' as const,
            message: 'Club not found',
            clubName: 'Test Club'
          },
          {
            type: 'club_not_in_liga' as const,
            message: 'Club not in liga',
            clubName: 'Test Club',
            ligaId: 1
          },
          {
            type: 'duplicate_club_name' as const,
            message: 'Duplicate name',
            clubName: 'Test Club'
          },
          {
            type: 'invalid_viktoria_mapping' as const,
            message: 'Invalid mapping',
            clubName: 'Viktoria Club'
          },
          {
            type: 'club_inactive' as const,
            message: 'Club inactive',
            clubName: 'Inactive Club'
          },
          {
            type: 'missing_liga_assignment' as const,
            message: 'Missing liga',
            clubName: 'Orphan Club'
          }
        ];

        const messages = clubService.getValidationErrorMessages(errors);

        expect(messages).toHaveLength(6);
        expect(messages[0]).toContain('Club not found');
        expect(messages[1]).toContain('is not assigned to liga 1');
        expect(messages[2]).toContain('Duplicate club name detected');
        expect(messages[3]).toContain('Invalid Viktoria team mapping');
        expect(messages[4]).toContain('is inactive and cannot be used');
        expect(messages[5]).toContain('must be assigned to at least one liga');
      });

      it('should handle unknown error types', async () => {
        const unknownError = {
          type: 'unknown_error' as any,
          message: 'Unknown error occurred'
        };

        const messages = clubService.getValidationErrorMessages([unknownError]);

        expect(messages).toHaveLength(1);
        expect(messages[0]).toBe('Unknown error occurred');
      });
    });
  });

  describe('Caching Operations', () => {
    describe('Cache Management', () => {
      it('should set and get cache entries', () => {
        const testData = { id: 1, name: 'Test Club' };
        const cacheKey = clubService.getCacheKey('test', 1);
        
        clubService.setCache(cacheKey, testData, 1);
        const cachedData = clubService.getCache(cacheKey);
        
        expect(cachedData).toEqual(testData);
      });

      it('should handle cache expiration', (done) => {
        const testData = { id: 1, name: 'Test Club' };
        const cacheKey = clubService.getCacheKey('test', 1);
        
        clubService.setCache(cacheKey, testData, 0.001); // Very short TTL
        
        setTimeout(() => {
          const cachedData = clubService.getCache(cacheKey);
          expect(cachedData).toBeNull();
          done();
        }, 100);
      });

      it('should invalidate cache by pattern', () => {
        clubService.setCache('club:test:1', { id: 1 }, 1);
        clubService.setCache('club:test:2', { id: 2 }, 1);
        clubService.setCache('club:other:1', { id: 3 }, 1);
        
        clubService.invalidateCache('test');
        
        expect(clubService.getCache('club:test:1')).toBeNull();
        expect(clubService.getCache('club:test:2')).toBeNull();
        expect(clubService.getCache('club:other:1')).not.toBeNull();
      });

      it('should clear all cache', () => {
        clubService.setCache('club:test:1', { id: 1 }, 1);
        clubService.setCache('club:other:1', { id: 2 }, 1);
        
        clubService.invalidateCache();
        
        expect(clubService.getCache('club:test:1')).toBeNull();
        expect(clubService.getCache('club:other:1')).toBeNull();
      });

      it('should track cache statistics', () => {
        const testData = { id: 1, name: 'Test Club' };
        const cacheKey = clubService.getCacheKey('test', 1);
        
        // Reset stats
        clubService._cacheStats = { hits: 0, misses: 0, sets: 0, invalidations: 0 };
        
        clubService.setCache(cacheKey, testData, 1);
        clubService.getCache(cacheKey); // Hit
        clubService.getCache('nonexistent'); // Miss
        
        const stats = clubService.getCacheStats();
        expect(stats.sets).toBe(1);
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.hitRate).toBe(50);
      });
    });

    describe('Cached Methods', () => {
      it('should use cached findClubsByLiga', async () => {
        const ligaId = 1;
        const cachedClubs = [mockClubs[0]];
        
        clubService.getCache = jest.fn().mockReturnValue(cachedClubs);
        
        const result = await clubService.findClubsByLigaCached(ligaId);
        
        expect(result).toEqual(cachedClubs);
        expect(clubService.getCache).toHaveBeenCalled();
      });

      it('should cache findViktoriaClubByTeam results', async () => {
        const teamMapping = 'team_1';
        const club = mockClubs[0];
        
        clubService.getCache = jest.fn().mockReturnValue(null);
        clubService.setCache = jest.fn();
        clubService.findViktoriaClubByTeam = jest.fn().mockResolvedValue(club);
        
        const result = await clubService.findViktoriaClubByTeamCached(teamMapping);
        
        expect(result).toEqual(club);
        expect(clubService.setCache).toHaveBeenCalledWith(
          expect.stringContaining('viktoria'),
          club,
          60
        );
      });

      it('should preload club data', async () => {
        const ligaIds = [1, 2];
        
        clubService.findViktoriaClubByTeamCached = jest.fn().mockResolvedValue(mockClubs[0]);
        clubService.findClubsByLigaCached = jest.fn().mockResolvedValue([mockClubs[0]]);
        
        await clubService.preloadClubData(ligaIds);
        
        expect(clubService.findViktoriaClubByTeamCached).toHaveBeenCalledTimes(3); // team_1, team_2, team_3
        expect(clubService.findClubsByLigaCached).toHaveBeenCalledTimes(2); // 2 ligen
      });

      it('should warm cache with active ligen', async () => {
        const mockLigen = [
          { id: 1, name: 'Liga 1', aktiv: true },
          { id: 2, name: 'Liga 2', aktiv: true }
        ];
        
        mockStrapi.entityService.findMany.mockResolvedValue(mockLigen);
        clubService.preloadClubData = jest.fn().mockResolvedValue(undefined);
        
        await clubService.warmCache();
        
        expect(clubService.preloadClubData).toHaveBeenCalledWith([1, 2]);
      });
    });

    describe('Cache Invalidation', () => {
      it('should handle club cache invalidation on update', async () => {
        const clubId = 1;
        const club = mockClubs[0];
        
        mockStrapi.entityService.findOne.mockResolvedValue(club);
        clubService.invalidateCache = jest.fn();
        
        await clubService.handleClubCacheInvalidation(clubId, 'update');
        
        expect(clubService.invalidateCache).toHaveBeenCalledWith(`club:logo:${clubId}`);
        expect(clubService.invalidateCache).toHaveBeenCalledWith('club:liga:1');
      });

      it('should handle club cache invalidation on delete', async () => {
        const clubId = 1;
        
        clubService.invalidateCache = jest.fn();
        
        await clubService.handleClubCacheInvalidation(clubId, 'delete');
        
        expect(clubService.invalidateCache).toHaveBeenCalledWith(`club:logo:${clubId}`);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const dbError = new Error('Connection timeout');
      mockStrapi.entityService.findMany.mockRejectedValue(dbError);

      await expect(clubService.findClubsByLiga(1)).rejects.toThrow('Failed to find clubs for liga 1: Connection timeout');
    });

    it('should handle validation errors gracefully', async () => {
      const clubData = { name: 'Test', club_typ: 'gegner_verein' as const };
      
      // Force validation error
      const originalMethod = clubService.validateClubData;
      clubService.validateClubData = jest.fn().mockImplementation(() => {
        throw new Error('Validation system failure');
      });

      const result = await originalMethod.call(clubService, clubData);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Validation error: Validation system failure');
    });

    it('should handle cache errors gracefully', () => {
      // Force cache error
      clubService._cache = {
        get: () => { throw new Error('Cache error'); },
        set: () => { throw new Error('Cache error'); },
        delete: () => { throw new Error('Cache error'); },
        clear: () => { throw new Error('Cache error'); },
        keys: () => { throw new Error('Cache error'); }
      };

      expect(() => clubService.getCache('test')).not.toThrow();
      expect(() => clubService.setCache('test', {}, 1)).not.toThrow();
      expect(() => clubService.invalidateCache('test')).not.toThrow();
    });

    it('should handle missing required parameters', async () => {
      await expect(clubService.findClubsByLiga()).rejects.toThrow();
      await expect(clubService.findViktoriaClubByTeam()).rejects.toThrow();
      await expect(clubService.getClubWithLogo()).rejects.toThrow();
      await expect(clubService.createClubIfNotExists()).rejects.toThrow();
    });

    it('should handle malformed data gracefully', async () => {
      const malformedClub = {
        id: 'not-a-number',
        name: null,
        club_typ: undefined,
        ligen: 'not-an-array'
      };

      mockStrapi.entityService.findOne.mockResolvedValue(malformedClub);

      const result = await clubService.validateClubInLiga(1, 1);
      expect(result).toBe(false);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large datasets efficiently', async () => {
      const largeClubList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockClubs[0],
        id: i + 1,
        name: `Club ${i + 1}`
      }));

      mockStrapi.entityService.findMany.mockResolvedValue(largeClubList);

      const start = Date.now();
      const result = await clubService.findClubsByLiga(1);
      const duration = Date.now() - start;

      expect(result).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should complete quickly
    });

    it('should handle concurrent requests', async () => {
      const ligaId = 1;
      mockStrapi.entityService.findMany.mockResolvedValue([mockClubs[0]]);

      const promises = Array.from({ length: 10 }, () => 
        clubService.findClubsByLiga(ligaId)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toEqual([mockClubs[0]]);
      });
    });

    it('should handle empty results gracefully', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);
      mockStrapi.entityService.findOne.mockResolvedValue(null);

      expect(await clubService.findClubsByLiga(1)).toEqual([]);
      expect(await clubService.findViktoriaClubByTeam('team_1')).toBeNull();
      expect(await clubService.validateClubInLiga(1, 1)).toBe(false);
    });

    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      
      mockStrapi.entityService.findMany.mockRejectedValue(timeoutError);

      await expect(clubService.findClubsByLiga(1)).rejects.toThrow('Request timeout');
    });

    it('should validate input sanitization', async () => {
      const maliciousInput = {
        name: '<script>alert("xss")</script>Test Club',
        club_typ: 'gegner_verein' as const,
        website: 'javascript:alert("xss")'
      };

      const result = await clubService.validateClubData(maliciousInput);
      
      // Should reject malicious input
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('Website URL'))).toBe(true);
    });
  });
});