/**
 * Unit tests for SaisonValidationRules
 * Tests season-specific validation rules and overlap detection
 */

import { SaisonValidationRules } from '../SaisonValidationRules';
import { ValidationRule } from '../../types';

describe('SaisonValidationRules', () => {
  let rules: SaisonValidationRules;

  beforeEach(() => {
    rules = new SaisonValidationRules();
  });

  describe('getSaisonNameValidationRule', () => {
    it('should validate required season name', () => {
      const rule = rules.getSaisonNameValidationRule();
      
      expect(rule.name).toBe('saison-name-required');
      expect(rule.type).toBe('critical');
      expect(rule.enabled).toBe(true);

      // Test valid names
      expect(rule.validator({ name: '2024/2025' })).toBe(true);
      expect(rule.validator({ name: 'Saison 2024' })).toBe(true);
      
      // Test invalid names
      expect(rule.validator({ name: '' })).toBe(false);
      expect(rule.validator({ name: '   ' })).toBe(false);
      expect(rule.validator({})).toBe(false);
      expect(rule.validator({ name: null })).toBe(false);
    });

    it('should validate season name format', () => {
      const rule = rules.getSaisonNameFormatValidationRule();
      
      expect(rule.name).toBe('saison-name-format');
      expect(rule.type).toBe('warning');

      // Test valid formats
      expect(rule.validator({ name: '2024/2025' })).toBe(true);
      expect(rule.validator({ name: '2023/24' })).toBe(true);
      
      // Test invalid formats (warning only)
      expect(rule.validator({ name: 'Season 2024' })).toBe(false);
      expect(rule.validator({ name: '2024' })).toBe(false);
    });
  });

  describe('getDateRangeValidationRule', () => {
    it('should validate that end date is after start date', () => {
      const rule = rules.getDateRangeValidationRule();
      
      expect(rule.name).toBe('date-range-consistency');
      expect(rule.type).toBe('critical');

      // Test valid date range
      const validData = {
        startDate: '2024-08-01',
        endDate: '2025-05-31'
      };
      expect(rule.validator(validData)).toBe(true);

      // Test invalid date range (end before start)
      const invalidData = {
        startDate: '2025-05-31',
        endDate: '2024-08-01'
      };
      expect(rule.validator(invalidData)).toBe(false);

      // Test same dates (should be invalid)
      const sameDateData = {
        startDate: '2024-08-01',
        endDate: '2024-08-01'
      };
      expect(rule.validator(sameDateData)).toBe(false);
    });

    it('should handle missing dates', () => {
      const rule = rules.getDateRangeValidationRule();

      // Test missing start date
      expect(rule.validator({ endDate: '2025-05-31' })).toBe(false);
      
      // Test missing end date
      expect(rule.validator({ startDate: '2024-08-01' })).toBe(false);
      
      // Test both missing
      expect(rule.validator({})).toBe(false);
    });

    it('should handle invalid date formats', () => {
      const rule = rules.getDateRangeValidationRule();

      const invalidFormatData = {
        startDate: 'invalid-date',
        endDate: '2025-05-31'
      };
      expect(rule.validator(invalidFormatData)).toBe(false);
    });
  });

  describe('getSeasonOverlapValidationRule', () => {
    it('should detect overlapping seasons', async () => {
      const existingSeasons = [
        {
          id: 1,
          name: '2023/2024',
          startDate: '2023-08-01',
          endDate: '2024-05-31'
        },
        {
          id: 2,
          name: '2022/2023',
          startDate: '2022-08-01',
          endDate: '2023-05-31'
        }
      ];

      const mockQuery = jest.fn().mockResolvedValue(existingSeasons);
      rules['queryExistingSeasons'] = mockQuery;

      const rule = rules.getSeasonOverlapValidationRule();
      
      expect(rule.name).toBe('season-overlap');
      expect(rule.type).toBe('critical');

      // Test non-overlapping season
      const nonOverlapping = {
        startDate: '2024-08-01',
        endDate: '2025-05-31'
      };
      expect(await rule.validator(nonOverlapping)).toBe(true);

      // Test overlapping season
      const overlapping = {
        startDate: '2023-06-01',
        endDate: '2024-07-31'
      };
      expect(await rule.validator(overlapping)).toBe(false);

      // Test partial overlap
      const partialOverlap = {
        startDate: '2024-03-01',
        endDate: '2024-08-31'
      };
      expect(await rule.validator(partialOverlap)).toBe(false);
    });

    it('should allow updates to same season', async () => {
      const existingSeasons = [
        {
          id: 1,
          name: '2023/2024',
          startDate: '2023-08-01',
          endDate: '2024-05-31'
        }
      ];

      const mockQuery = jest.fn().mockResolvedValue(existingSeasons);
      rules['queryExistingSeasons'] = mockQuery;

      const rule = rules.getSeasonOverlapValidationRule();

      // Test updating same season (should be allowed)
      const sameSeasonUpdate = {
        id: 1,
        startDate: '2023-08-15',
        endDate: '2024-05-31'
      };
      expect(await rule.validator(sameSeasonUpdate)).toBe(true);
    });

    it('should handle edge cases in overlap detection', async () => {
      const existingSeasons = [
        {
          id: 1,
          name: '2023/2024',
          startDate: '2023-08-01',
          endDate: '2024-05-31'
        }
      ];

      const mockQuery = jest.fn().mockResolvedValue(existingSeasons);
      rules['queryExistingSeasons'] = mockQuery;

      const rule = rules.getSeasonOverlapValidationRule();

      // Test adjacent seasons (should be allowed)
      const adjacentBefore = {
        startDate: '2022-08-01',
        endDate: '2023-07-31'
      };
      expect(await rule.validator(adjacentBefore)).toBe(true);

      const adjacentAfter = {
        startDate: '2024-06-01',
        endDate: '2025-05-31'
      };
      expect(await rule.validator(adjacentAfter)).toBe(true);

      // Test exact boundary overlap (should be invalid)
      const boundaryOverlap = {
        startDate: '2023-08-01',
        endDate: '2024-08-01'
      };
      expect(await rule.validator(boundaryOverlap)).toBe(false);
    });
  });

  describe('getActiveSeasonValidationRule', () => {
    it('should prevent multiple active seasons', async () => {
      const existingSeasons = [
        {
          id: 1,
          name: '2023/2024',
          active: true
        },
        {
          id: 2,
          name: '2022/2023',
          active: false
        }
      ];

      const mockQuery = jest.fn().mockResolvedValue(existingSeasons);
      rules['queryActiveSeasons'] = mockQuery;

      const rule = rules.getActiveSeasonValidationRule();
      
      expect(rule.name).toBe('single-active-season');
      expect(rule.type).toBe('critical');

      // Test creating inactive season (should be allowed)
      expect(await rule.validator({ active: false })).toBe(true);

      // Test creating active season when one exists (should be blocked)
      expect(await rule.validator({ active: true })).toBe(false);

      // Test updating same season to active (should be allowed)
      expect(await rule.validator({ id: 1, active: true })).toBe(true);
    });

    it('should allow first active season', async () => {
      const mockQuery = jest.fn().mockResolvedValue([]);
      rules['queryActiveSeasons'] = mockQuery;

      const rule = rules.getActiveSeasonValidationRule();

      // Test creating first active season (should be allowed)
      expect(await rule.validator({ active: true })).toBe(true);
    });
  });

  describe('getSeasonDurationValidationRule', () => {
    it('should validate reasonable season duration', () => {
      const rule = rules.getSeasonDurationValidationRule();
      
      expect(rule.name).toBe('season-duration');
      expect(rule.type).toBe('warning');

      // Test normal season duration (9 months)
      const normalDuration = {
        startDate: '2024-08-01',
        endDate: '2025-05-31'
      };
      expect(rule.validator(normalDuration)).toBe(true);

      // Test too short season (1 month)
      const tooShort = {
        startDate: '2024-08-01',
        endDate: '2024-09-01'
      };
      expect(rule.validator(tooShort)).toBe(false);

      // Test too long season (18 months)
      const tooLong = {
        startDate: '2024-08-01',
        endDate: '2026-02-01'
      };
      expect(rule.validator(tooLong)).toBe(false);
    });

    it('should handle edge cases in duration calculation', () => {
      const rule = rules.getSeasonDurationValidationRule();

      // Test minimum acceptable duration (3 months)
      const minDuration = {
        startDate: '2024-08-01',
        endDate: '2024-11-01'
      };
      expect(rule.validator(minDuration)).toBe(true);

      // Test maximum acceptable duration (12 months)
      const maxDuration = {
        startDate: '2024-08-01',
        endDate: '2025-08-01'
      };
      expect(rule.validator(maxDuration)).toBe(true);
    });
  });

  describe('getSeasonYearValidationRule', () => {
    it('should validate season year consistency', () => {
      const rule = rules.getSeasonYearValidationRule();
      
      expect(rule.name).toBe('season-year-consistency');
      expect(rule.type).toBe('warning');

      // Test consistent season name and dates
      const consistent = {
        name: '2024/2025',
        startDate: '2024-08-01',
        endDate: '2025-05-31'
      };
      expect(rule.validator(consistent)).toBe(true);

      // Test inconsistent season name and dates
      const inconsistent = {
        name: '2024/2025',
        startDate: '2023-08-01',
        endDate: '2024-05-31'
      };
      expect(rule.validator(inconsistent)).toBe(false);

      // Test single year format
      const singleYear = {
        name: '2024',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };
      expect(rule.validator(singleYear)).toBe(true);
    });
  });

  describe('getAllSaisonValidationRules', () => {
    it('should return all season validation rules', () => {
      const allRules = rules.getAllSaisonValidationRules();

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
      const allRules = rules.getAllSaisonValidationRules();
      const ruleNames = allRules.map(rule => rule.name);

      expect(ruleNames).toContain('saison-name-required');
      expect(ruleNames).toContain('date-range-consistency');
      expect(ruleNames).toContain('season-overlap');
      expect(ruleNames).toContain('single-active-season');
      expect(ruleNames).toContain('season-duration');
      expect(ruleNames).toContain('season-year-consistency');
    });

    it('should separate critical and warning rules correctly', () => {
      const allRules = rules.getAllSaisonValidationRules();
      const criticalRules = allRules.filter(rule => rule.type === 'critical');
      const warningRules = allRules.filter(rule => rule.type === 'warning');

      expect(criticalRules.length).toBeGreaterThan(0);
      expect(warningRules.length).toBeGreaterThan(0);

      // Critical rules should include essential validations
      const criticalRuleNames = criticalRules.map(rule => rule.name);
      expect(criticalRuleNames).toContain('saison-name-required');
      expect(criticalRuleNames).toContain('date-range-consistency');
      expect(criticalRuleNames).toContain('season-overlap');
      expect(criticalRuleNames).toContain('single-active-season');

      // Warning rules should include optional validations
      const warningRuleNames = warningRules.map(rule => rule.name);
      expect(warningRuleNames).toContain('season-duration');
      expect(warningRuleNames).toContain('season-year-consistency');
    });
  });

  describe('configurable validation', () => {
    it('should support configurable overlap checking', async () => {
      const rule = rules.getSeasonOverlapValidationRule();
      
      // Test with strict overlap checking disabled
      rule.enabled = false;
      expect(rule.enabled).toBe(false);

      // Test with flexible overlap tolerance
      const flexibleRule = rules.getFlexibleOverlapValidationRule();
      expect(flexibleRule.type).toBe('warning');
    });

    it('should support different validation modes', () => {
      const strictRules = rules.getAllSaisonValidationRules();
      const lenientRules = rules.getAllSaisonValidationRules(false); // lenient mode

      // In lenient mode, some critical rules should become warnings
      const strictCritical = strictRules.filter(r => r.type === 'critical').length;
      const lenientCritical = lenientRules.filter(r => r.type === 'critical').length;

      expect(lenientCritical).toBeLessThanOrEqual(strictCritical);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockQuery = jest.fn().mockRejectedValue(new Error('Database error'));
      rules['queryExistingSeasons'] = mockQuery;

      const rule = rules.getSeasonOverlapValidationRule();
      
      const season = {
        startDate: '2024-08-01',
        endDate: '2025-05-31'
      };
      
      // Should return false (fail validation) on database error
      expect(await rule.validator(season)).toBe(false);
    });

    it('should handle invalid date formats gracefully', () => {
      const rule = rules.getDateRangeValidationRule();

      const invalidData = {
        startDate: 'not-a-date',
        endDate: 'also-not-a-date'
      };

      expect(rule.validator(invalidData)).toBe(false);
    });

    it('should handle null/undefined data', () => {
      const rule = rules.getSaisonNameValidationRule();
      
      expect(rule.validator(null)).toBe(false);
      expect(rule.validator(undefined)).toBe(false);
      expect(rule.validator({})).toBe(false);
    });
  });

  describe('performance', () => {
    it('should cache season queries for better performance', async () => {
      const mockQuery = jest.fn().mockResolvedValue([]);
      rules['queryExistingSeasons'] = mockQuery;

      const rule = rules.getSeasonOverlapValidationRule();
      
      // First call
      await rule.validator({ startDate: '2024-08-01', endDate: '2025-05-31' });
      expect(mockQuery).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await rule.validator({ startDate: '2024-09-01', endDate: '2025-06-30' });
      expect(mockQuery).toHaveBeenCalledTimes(1); // Still 1 if cached
    });

    it('should handle large numbers of existing seasons efficiently', async () => {
      const largeSeasonList = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Season ${i + 1}`,
        startDate: `${2000 + i}-08-01`,
        endDate: `${2001 + i}-05-31`
      }));

      const mockQuery = jest.fn().mockResolvedValue(largeSeasonList);
      rules['queryExistingSeasons'] = mockQuery;

      const rule = rules.getSeasonOverlapValidationRule();
      
      const start = Date.now();
      await rule.validator({ startDate: '2024-08-01', endDate: '2025-05-31' });
      const duration = Date.now() - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100);
    });
  });

  describe('overlap detection algorithms', () => {
    it('should correctly detect all types of overlaps', async () => {
      const existingSeason = {
        id: 1,
        startDate: '2024-08-01',
        endDate: '2025-05-31'
      };

      const mockQuery = jest.fn().mockResolvedValue([existingSeason]);
      rules['queryExistingSeasons'] = mockQuery;

      const rule = rules.getSeasonOverlapValidationRule();

      // Test complete overlap (new season contains existing)
      const completeOverlap = {
        startDate: '2024-07-01',
        endDate: '2025-06-30'
      };
      expect(await rule.validator(completeOverlap)).toBe(false);

      // Test contained overlap (existing contains new)
      const containedOverlap = {
        startDate: '2024-09-01',
        endDate: '2025-04-30'
      };
      expect(await rule.validator(containedOverlap)).toBe(false);

      // Test start overlap
      const startOverlap = {
        startDate: '2024-06-01',
        endDate: '2024-10-31'
      };
      expect(await rule.validator(startOverlap)).toBe(false);

      // Test end overlap
      const endOverlap = {
        startDate: '2025-03-01',
        endDate: '2025-08-31'
      };
      expect(await rule.validator(endOverlap)).toBe(false);
    });
  });
});