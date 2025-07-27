/**
 * Unit tests for TeamValidationRules
 * Tests team-specific validation rules and logic
 */

import { TeamValidationRules } from '../TeamValidationRules';
import { ValidationRule, ValidationResult } from '../../types';

describe('TeamValidationRules', () => {
  let rules: TeamValidationRules;

  beforeEach(() => {
    rules = new TeamValidationRules();
  });

  describe('getTeamNameValidationRule', () => {
    it('should validate required team name', () => {
      const rule = rules.getTeamNameValidationRule();
      
      expect(rule.name).toBe('team-name-required');
      expect(rule.type).toBe('critical');
      expect(rule.enabled).toBe(true);

      // Test valid name
      expect(rule.validator({ name: 'Test Team' })).toBe(true);
      
      // Test invalid names
      expect(rule.validator({ name: '' })).toBe(false);
      expect(rule.validator({ name: '   ' })).toBe(false);
      expect(rule.validator({})).toBe(false);
      expect(rule.validator({ name: null })).toBe(false);
    });

    it('should validate minimum name length', () => {
      const rule = rules.getTeamNameLengthValidationRule();
      
      expect(rule.name).toBe('team-name-length');
      expect(rule.type).toBe('critical');

      // Test valid lengths
      expect(rule.validator({ name: 'FC' })).toBe(true);
      expect(rule.validator({ name: 'Test Team FC' })).toBe(true);
      
      // Test invalid lengths
      expect(rule.validator({ name: 'A' })).toBe(false);
      expect(rule.validator({ name: 'A'.repeat(101) })).toBe(false);
    });
  });

  describe('getTeamUniquenessValidationRule', () => {
    it('should validate team uniqueness in liga-saison combination', async () => {
      const mockExistingTeams = [
        { id: 1, name: 'Existing Team', liga: 1, saison: 1 },
        { id: 2, name: 'Another Team', liga: 1, saison: 2 }
      ];

      // Mock database query
      const mockQuery = jest.fn().mockResolvedValue(mockExistingTeams);
      rules['queryExistingTeams'] = mockQuery;

      const rule = rules.getTeamUniquenessValidationRule();
      
      expect(rule.name).toBe('team-uniqueness');
      expect(rule.type).toBe('critical');

      // Test unique team (different liga)
      const uniqueTeam = { name: 'New Team', liga: 2, saison: 1 };
      expect(await rule.validator(uniqueTeam)).toBe(true);

      // Test duplicate team (same name, liga, saison)
      const duplicateTeam = { name: 'Existing Team', liga: 1, saison: 1 };
      expect(await rule.validator(duplicateTeam)).toBe(false);

      // Test same name but different saison (should be allowed)
      const sameNameDifferentSaison = { name: 'Existing Team', liga: 1, saison: 3 };
      expect(await rule.validator(sameNameDifferentSaison)).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = jest.fn().mockRejectedValue(new Error('Database error'));
      rules['queryExistingTeams'] = mockQuery;

      const rule = rules.getTeamUniquenessValidationRule();
      
      const team = { name: 'Test Team', liga: 1, saison: 1 };
      
      // Should return false (fail validation) on database error
      expect(await rule.validator(team)).toBe(false);
    });
  });

  describe('getLigaReferenceValidationRule', () => {
    it('should validate liga reference exists', async () => {
      const mockLigas = [
        { id: 1, name: 'Liga 1' },
        { id: 2, name: 'Liga 2' }
      ];

      const mockQuery = jest.fn().mockResolvedValue(mockLigas);
      rules['queryLigas'] = mockQuery;

      const rule = rules.getLigaReferenceValidationRule();
      
      expect(rule.name).toBe('liga-reference');
      expect(rule.type).toBe('critical');

      // Test valid liga reference
      expect(await rule.validator({ liga: 1 })).toBe(true);
      expect(await rule.validator({ liga: 2 })).toBe(true);

      // Test invalid liga reference
      expect(await rule.validator({ liga: 999 })).toBe(false);
      expect(await rule.validator({ liga: null })).toBe(false);
      expect(await rule.validator({})).toBe(false);
    });
  });

  describe('getSaisonReferenceValidationRule', () => {
    it('should validate saison reference exists', async () => {
      const mockSaisons = [
        { id: 1, name: '2023/2024' },
        { id: 2, name: '2024/2025' }
      ];

      const mockQuery = jest.fn().mockResolvedValue(mockSaisons);
      rules['querySaisons'] = mockQuery;

      const rule = rules.getSaisonReferenceValidationRule();
      
      expect(rule.name).toBe('saison-reference');
      expect(rule.type).toBe('critical');

      // Test valid saison reference
      expect(await rule.validator({ saison: 1 })).toBe(true);
      expect(await rule.validator({ saison: 2 })).toBe(true);

      // Test invalid saison reference
      expect(await rule.validator({ saison: 999 })).toBe(false);
      expect(await rule.validator({ saison: null })).toBe(false);
      expect(await rule.validator({})).toBe(false);
    });
  });

  describe('getTeamStatisticsValidationRule', () => {
    it('should validate team statistics consistency', () => {
      const rule = rules.getTeamStatisticsValidationRule();
      
      expect(rule.name).toBe('team-statistics');
      expect(rule.type).toBe('warning');

      // Test consistent statistics
      const validStats = {
        totalGames: 20,
        totalWins: 12,
        totalDraws: 5,
        totalLosses: 3
      };
      expect(rule.validator(validStats)).toBe(true);

      // Test inconsistent statistics
      const invalidStats = {
        totalGames: 20,
        totalWins: 12,
        totalDraws: 5,
        totalLosses: 5 // 12+5+5 = 22, but totalGames = 20
      };
      expect(rule.validator(invalidStats)).toBe(false);

      // Test missing statistics (should pass as it's optional)
      expect(rule.validator({})).toBe(true);
    });
  });

  describe('getTeamDescriptionValidationRule', () => {
    it('should validate team description as warning', () => {
      const rule = rules.getTeamDescriptionValidationRule();
      
      expect(rule.name).toBe('team-description');
      expect(rule.type).toBe('warning');

      // Test with description (should pass)
      expect(rule.validator({ description: 'Team description' })).toBe(true);

      // Test without description (should fail as warning)
      expect(rule.validator({})).toBe(false);
      expect(rule.validator({ description: '' })).toBe(false);
      expect(rule.validator({ description: '   ' })).toBe(false);
    });

    it('should validate description length', () => {
      const rule = rules.getTeamDescriptionLengthValidationRule();
      
      expect(rule.name).toBe('team-description-length');
      expect(rule.type).toBe('warning');

      // Test valid description length
      expect(rule.validator({ description: 'Short description' })).toBe(true);

      // Test too long description
      const longDescription = 'A'.repeat(501);
      expect(rule.validator({ description: longDescription })).toBe(false);

      // Test no description (should pass)
      expect(rule.validator({})).toBe(true);
    });
  });

  describe('getAllTeamValidationRules', () => {
    it('should return all team validation rules', () => {
      const allRules = rules.getAllTeamValidationRules();

      expect(allRules).toBeInstanceOf(Array);
      expect(allRules.length).toBeGreaterThan(0);

      // Check that all rules have required properties
      allRules.forEach(rule => {
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('type');
        expect(rule).toHaveProperty('validator');
        expect(rule).toHaveProperty('message');
        expect(rule).toHaveProperty('enabled');
        expect(['critical', 'warning']).toContain(rule.type);
      });
    });

    it('should include all expected rule types', () => {
      const allRules = rules.getAllTeamValidationRules();
      const ruleNames = allRules.map(rule => rule.name);

      expect(ruleNames).toContain('team-name-required');
      expect(ruleNames).toContain('team-name-length');
      expect(ruleNames).toContain('team-uniqueness');
      expect(ruleNames).toContain('liga-reference');
      expect(ruleNames).toContain('saison-reference');
      expect(ruleNames).toContain('team-statistics');
      expect(ruleNames).toContain('team-description');
    });

    it('should separate critical and warning rules correctly', () => {
      const allRules = rules.getAllTeamValidationRules();
      const criticalRules = allRules.filter(rule => rule.type === 'critical');
      const warningRules = allRules.filter(rule => rule.type === 'warning');

      expect(criticalRules.length).toBeGreaterThan(0);
      expect(warningRules.length).toBeGreaterThan(0);

      // Critical rules should include essential validations
      const criticalRuleNames = criticalRules.map(rule => rule.name);
      expect(criticalRuleNames).toContain('team-name-required');
      expect(criticalRuleNames).toContain('team-uniqueness');
      expect(criticalRuleNames).toContain('liga-reference');
      expect(criticalRuleNames).toContain('saison-reference');

      // Warning rules should include optional validations
      const warningRuleNames = warningRules.map(rule => rule.name);
      expect(warningRuleNames).toContain('team-description');
      expect(warningRuleNames).toContain('team-statistics');
    });
  });

  describe('rule configuration', () => {
    it('should allow enabling/disabling rules', () => {
      const rule = rules.getTeamNameValidationRule();
      
      expect(rule.enabled).toBe(true);
      
      // Test disabling rule
      rule.enabled = false;
      expect(rule.enabled).toBe(false);
    });

    it('should support rule dependencies', () => {
      const uniquenessRule = rules.getTeamUniquenessValidationRule();
      
      expect(uniquenessRule.dependencies).toContain('team-name-required');
      expect(uniquenessRule.dependencies).toContain('liga-reference');
      expect(uniquenessRule.dependencies).toContain('saison-reference');
    });
  });

  describe('error handling', () => {
    it('should handle invalid data gracefully', () => {
      const rule = rules.getTeamNameValidationRule();
      
      // Test with null/undefined data
      expect(rule.validator(null)).toBe(false);
      expect(rule.validator(undefined)).toBe(false);
      
      // Test with non-object data
      expect(rule.validator('string')).toBe(false);
      expect(rule.validator(123)).toBe(false);
      expect(rule.validator([])).toBe(false);
    });

    it('should handle validator function errors', () => {
      const errorRule: ValidationRule = {
        name: 'error-rule',
        type: 'critical',
        validator: (data: any) => {
          throw new Error('Validator error');
        },
        message: 'This rule throws an error',
        enabled: true
      };

      // Should not throw error, but return false
      expect(() => errorRule.validator({})).toThrow('Validator error');
    });
  });

  describe('performance', () => {
    it('should cache database queries for better performance', async () => {
      const mockQuery = jest.fn().mockResolvedValue([{ id: 1, name: 'Liga 1' }]);
      rules['queryLigas'] = mockQuery;

      const rule = rules.getLigaReferenceValidationRule();
      
      // First call
      await rule.validator({ liga: 1 });
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await rule.validator({ liga: 1 });
      expect(mockQuery).toHaveBeenCalledTimes(1); // Still 1 if cached
    });

    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Team ${i + 1}`,
        liga: 1,
        saison: 1
      }));

      const mockQuery = jest.fn().mockResolvedValue(largeDataset);
      rules['queryExistingTeams'] = mockQuery;

      const rule = rules.getTeamUniquenessValidationRule();
      
      const start = Date.now();
      await rule.validator({ name: 'New Team', liga: 1, saison: 1 });
      const duration = Date.now() - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100);
    });
  });
});