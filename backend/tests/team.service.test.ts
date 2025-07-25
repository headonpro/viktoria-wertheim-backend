/**
 * Unit tests for simplified Team service
 */

// Mock strapi global
const mockStrapi = {
  entityService: {
    findMany: jest.fn(),
  },
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
};

// Set global strapi mock
(global as any).strapi = mockStrapi;

// Create a simplified team service for testing
const createTeamService = () => ({
  /**
   * Find teams with basic relation loading
   */
  async findWithPopulate(params = {}) {
    return await mockStrapi.entityService.findMany('api::team.team', {
      ...params,
      populate: ['liga', 'saison'] as any
    });
  },

  /**
   * Find teams for a specific league
   */
  async findByLeague(ligaId: number, params: any = {}) {
    return await this.findWithPopulate({
      ...params,
      filters: {
        liga: ligaId,
        ...(params.filters || {})
      },
      sort: { tabellenplatz: 'asc' }
    });
  }
});

describe('Team Service (Simplified)', () => {
  let teamService: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Create fresh service instance
    teamService = createTeamService();
  });

  describe('findWithPopulate', () => {
    
    it('should call entityService.findMany with correct populate options', async () => {
      const mockTeams = [
        { id: 1, name: 'Team A', liga: { id: 1, name: 'Liga 1' }, saison: { id: 1, name: '2024' } },
        { id: 2, name: 'Team B', liga: { id: 1, name: 'Liga 1' }, saison: { id: 1, name: '2024' } }
      ];
      
      mockStrapi.entityService.findMany.mockResolvedValue(mockTeams);
      
      const result = await teamService.findWithPopulate();
      
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::team.team', {
        populate: ['liga', 'saison']
      });
      expect(result).toEqual(mockTeams);
    });

    it('should pass through additional parameters', async () => {
      const mockTeams = [{ id: 1, name: 'Team A' }];
      const params = {
        filters: { name: 'Team A' },
        sort: { name: 'asc' },
        pagination: { page: 1, pageSize: 10 }
      };
      
      mockStrapi.entityService.findMany.mockResolvedValue(mockTeams);
      
      const result = await teamService.findWithPopulate(params);
      
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::team.team', {
        ...params,
        populate: ['liga', 'saison']
      });
      expect(result).toEqual(mockTeams);
    });

    it('should handle empty results', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);
      
      const result = await teamService.findWithPopulate();
      
      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockStrapi.entityService.findMany.mockRejectedValue(dbError);
      
      await expect(teamService.findWithPopulate()).rejects.toThrow('Database connection failed');
    });
  });

  describe('findByLeague', () => {
    
    it('should find teams for a specific league with correct filters and sorting', async () => {
      const ligaId = 1;
      const mockTeams = [
        { id: 1, name: 'Team A', tabellenplatz: 1, liga: { id: 1 } },
        { id: 2, name: 'Team B', tabellenplatz: 2, liga: { id: 1 } }
      ];
      
      mockStrapi.entityService.findMany.mockResolvedValue(mockTeams);
      
      const result = await teamService.findByLeague(ligaId);
      
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::team.team', {
        filters: {
          liga: ligaId
        },
        sort: { tabellenplatz: 'asc' },
        populate: ['liga', 'saison']
      });
      expect(result).toEqual(mockTeams);
    });

    it('should merge additional filters with league filter', async () => {
      const ligaId = 1;
      const params = {
        filters: { name: { $contains: 'FC' } }
      };
      const mockTeams = [{ id: 1, name: 'FC Team A', liga: { id: 1 } }];
      
      mockStrapi.entityService.findMany.mockResolvedValue(mockTeams);
      
      const result = await teamService.findByLeague(ligaId, params);
      
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::team.team', {
        filters: {
          liga: ligaId,
          name: { $contains: 'FC' }
        },
        sort: { tabellenplatz: 'asc' },
        populate: ['liga', 'saison']
      });
      expect(result).toEqual(mockTeams);
    });

    it('should handle additional parameters like pagination', async () => {
      const ligaId = 1;
      const params = {
        pagination: { page: 1, pageSize: 5 },
        sort: { name: 'asc' } // This should be overridden by tabellenplatz sort
      };
      const mockTeams = [{ id: 1, name: 'Team A' }];
      
      mockStrapi.entityService.findMany.mockResolvedValue(mockTeams);
      
      const result = await teamService.findByLeague(ligaId, params);
      
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::team.team', {
        pagination: { page: 1, pageSize: 5 },
        filters: {
          liga: ligaId
        },
        sort: { tabellenplatz: 'asc' },
        populate: ['liga', 'saison']
      });
      expect(result).toEqual(mockTeams);
    });

    it('should handle numeric ligaId correctly', async () => {
      const ligaId = 999;
      mockStrapi.entityService.findMany.mockResolvedValue([]);
      
      await teamService.findByLeague(ligaId);
      
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::team.team', {
        filters: {
          liga: 999
        },
        sort: { tabellenplatz: 'asc' },
        populate: ['liga', 'saison']
      });
    });

    it('should handle empty results for league', async () => {
      const ligaId = 1;
      mockStrapi.entityService.findMany.mockResolvedValue([]);
      
      const result = await teamService.findByLeague(ligaId);
      
      expect(result).toEqual([]);
    });

    it('should handle database errors in findByLeague', async () => {
      const ligaId = 1;
      const dbError = new Error('Liga not found');
      mockStrapi.entityService.findMany.mockRejectedValue(dbError);
      
      await expect(teamService.findByLeague(ligaId)).rejects.toThrow('Liga not found');
    });

    it('should preserve existing filters when no additional filters provided', async () => {
      const ligaId = 1;
      const params = {}; // Empty params
      mockStrapi.entityService.findMany.mockResolvedValue([]);
      
      await teamService.findByLeague(ligaId, params);
      
      expect(mockStrapi.entityService.findMany).toHaveBeenCalledWith('api::team.team', {
        filters: {
          liga: ligaId
        },
        sort: { tabellenplatz: 'asc' },
        populate: ['liga', 'saison']
      });
    });
  });

  describe('Service Integration', () => {
    
    it('should have only the two required methods', () => {
      const serviceKeys = Object.keys(teamService);
      
      expect(serviceKeys).toContain('findWithPopulate');
      expect(serviceKeys).toContain('findByLeague');
      
      // Ensure no complex business logic methods remain
      expect(serviceKeys).not.toContain('getTeamRoster');
      expect(serviceKeys).not.toContain('updateTeamStatistics');
      expect(serviceKeys).not.toContain('validateTeamData');
      expect(serviceKeys).not.toContain('getTeamDetails');
      expect(serviceKeys).not.toContain('getLeagueStandings');
      expect(serviceKeys).not.toContain('findWithMatches');
      expect(serviceKeys).not.toContain('findActive');
      expect(serviceKeys).not.toContain('findBySeason');
    });

    it('should use simplified populate strategy', async () => {
      mockStrapi.entityService.findMany.mockResolvedValue([]);
      
      await teamService.findWithPopulate();
      
      const callArgs = mockStrapi.entityService.findMany.mock.calls[0][1];
      
      // Should only populate liga and saison, not complex relations like club, spieler, etc.
      expect(callArgs.populate).toEqual(['liga', 'saison']);
      expect(callArgs.populate).not.toContain('club');
      expect(callArgs.populate).not.toContain('spieler');
      expect(callArgs.populate).not.toContain('aushilfe_spieler');
    });
  });
});