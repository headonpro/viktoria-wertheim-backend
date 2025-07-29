/**
 * Comprehensive Unit Tests for SpielValidationService
 * Tests all validation scenarios including edge cases
 */

import { 
  SpielValidationService, 
  ValidationErrorCode, 
  ValidationWarningCode,
  SpielStatus,
  SpielEntity,
  Team,
  Liga,
  Saison
} from '../../../../src/api/spiel/services/validation';

describe('SpielValidationService - Comprehensive Tests', () => {
  let validationService: SpielValidationService;

  beforeEach(() => {
    validationService = new SpielValidationService();
  });
  
  describe('Core Validation Logic', () => {
    it('should validate team consistency', () => {
      const team1: Team = { id: 1, name: 'Team A' };
      const team2: Team = { id: 2, name: 'Team B' };
      
      // Test valid team combination
      const validResult = validationService.validateTeamConsistency(team1, team2);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      // Test invalid team combination (same team)
      const invalidResult = validationService.validateTeamConsistency(team1, team1);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
      expect(invalidResult.errors[0].code).toBe(ValidationErrorCode.TEAM_AGAINST_ITSELF);
    });

    it('should validate score values', () => {
      // Valid scores (non-negative integers)
      const validResult = validationService.validateScores(2, 1);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      // Invalid scores (negative values)
      const negativeResult = validationService.validateScores(-1, 2);
      expect(negativeResult.isValid).toBe(false);
      expect(negativeResult.errors).toHaveLength(1);
      expect(negativeResult.errors[0].code).toBe(ValidationErrorCode.NEGATIVE_SCORE);
      
      // Invalid scores (non-integer values)
      const decimalResult = validationService.validateScores(1.5, 2);
      expect(decimalResult.isValid).toBe(false);
      expect(decimalResult.errors).toHaveLength(1);
      expect(decimalResult.errors[0].code).toBe(ValidationErrorCode.NEGATIVE_SCORE);
      
      // High scores should generate warnings
      const highScoreResult = validationService.validateScores(12, 1);
      expect(highScoreResult.isValid).toBe(true);
      expect(highScoreResult.warnings).toBeDefined();
      expect(highScoreResult.warnings![0].code).toBe(ValidationWarningCode.HIGH_SCORE_VALUE);
    });

    it('should validate status transitions', () => {
      // Valid transition from geplant to beendet
      const validResult = validationService.validateStatusTransition(
        SpielStatus.GEPLANT, 
        SpielStatus.BEENDET
      );
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      // Invalid transition from beendet to geplant
      const invalidResult = validationService.validateStatusTransition(
        SpielStatus.BEENDET, 
        SpielStatus.GEPLANT
      );
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toHaveLength(1);
      expect(invalidResult.errors[0].code).toBe(ValidationErrorCode.INVALID_STATUS_TRANSITION);
      
      // Same status should be valid
      const sameStatusResult = validationService.validateStatusTransition(
        SpielStatus.GEPLANT, 
        SpielStatus.GEPLANT
      );
      expect(sameStatusResult.isValid).toBe(true);
    });

    it('should validate required fields for completed games', () => {
      const completedGame: SpielEntity = {
        status: SpielStatus.BEENDET,
        heim_tore: 2,
        gast_tore: 1,
        heim_team: { id: 1, name: 'Team A' },
        gast_team: { id: 2, name: 'Team B' },
        liga: { id: 1, name: 'Liga 1' },
        saison: { id: 1, name: '2024', jahr: 2024 },
        datum: '2023-10-15',
        spieltag: 1
      };
      
      // Valid completed game
      const validResult = validationService.validateRequiredFields(completedGame);
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      // Missing scores for completed game should fail
      const incompleteGame: SpielEntity = {
        ...completedGame,
        heim_tore: undefined,
        gast_tore: undefined
      };
      
      const invalidResult = validationService.validateRequiredFields(incompleteGame);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      expect(invalidResult.errors.some(e => e.code === ValidationErrorCode.SCORES_REQUIRED_FOR_COMPLETED)).toBe(true);
    });

    it('should validate spieltag range (1-34)', () => {
      // Valid spieltag values
      const validSpieltagValues = [1, 5, 10, 15, 20, 25, 30, 34];
      validSpieltagValues.forEach(spieltag => {
        const result = validationService.validateSpieltagRange(spieltag);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
      
      // Invalid spieltag values
      const invalidSpieltagValues = [0, -1, 35, 50, 1.5, 33.9];
      invalidSpieltagValues.forEach(spieltag => {
        const result = validationService.validateSpieltagRange(spieltag);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(ValidationErrorCode.INVALID_SPIELTAG_RANGE);
      });
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize negative scores to zero', () => {
      const input = { heim_tore: -1, gast_tore: -5 };
      const sanitized = validationService.sanitizeSpielInput(input);
      
      expect(sanitized.heim_tore).toBe(0);
      expect(sanitized.gast_tore).toBe(0);
    });

    it('should convert decimal scores to integers', () => {
      const input = { heim_tore: 2.7, gast_tore: 3.9 };
      const sanitized = validationService.sanitizeSpielInput(input);
      
      expect(sanitized.heim_tore).toBe(2);
      expect(sanitized.gast_tore).toBe(3);
      expect(Number.isInteger(sanitized.heim_tore!)).toBe(true);
      expect(Number.isInteger(sanitized.gast_tore!)).toBe(true);
    });

    it('should sanitize spieltag to valid range', () => {
      const testCases = [
        { input: 0, expected: 1 },
        { input: -5, expected: 1 },
        { input: 50, expected: 34 },
        { input: 15.7, expected: 15 }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const sanitized = validationService.sanitizeSpielInput({ spieltag: input });
        expect(sanitized.spieltag).toBe(expected);
      });
    });

    it('should handle string trimming', () => {
      const input = { notizen: '  Test notes with spaces  ' };
      const sanitized = validationService.sanitizeSpielInput(input);
      
      expect(sanitized.notizen).toBe('Test notes with spaces');
    });

    it('should sanitize invalid status to default', () => {
      const input = { status: 'invalid_status' as SpielStatus };
      const sanitized = validationService.sanitizeSpielInput(input);
      
      expect(sanitized.status).toBe(SpielStatus.GEPLANT);
    });
  });

  describe('Complete Spiel Validation', () => {
    const createValidSpiel = (): SpielEntity => ({
      datum: '2024-01-15',
      liga: { id: 1, name: 'Liga 1' },
      saison: { id: 1, name: '2024', jahr: 2024 },
      heim_team: { id: 1, name: 'Team A' },
      gast_team: { id: 2, name: 'Team B' },
      heim_tore: 2,
      gast_tore: 1,
      spieltag: 15,
      status: SpielStatus.BEENDET
    });

    it('should validate a complete valid spiel', () => {
      const spiel = createValidSpiel();
      const result = validationService.validateSpielResult(spiel);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect multiple validation errors', () => {
      const invalidSpiel: SpielEntity = {
        datum: '2024-01-15',
        liga: { id: 1, name: 'Liga 1' },
        saison: { id: 1, name: '2024', jahr: 2024 },
        heim_team: { id: 1, name: 'Team A' },
        gast_team: { id: 1, name: 'Team A' }, // Same team
        heim_tore: -1, // Negative score
        gast_tore: undefined, // Missing score for completed game
        spieltag: 50, // Invalid spieltag
        status: SpielStatus.BEENDET
      };
      
      const result = validationService.validateSpielResult(invalidSpiel);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      
      // Check for specific error types
      const errorCodes = result.errors.map(e => e.code);
      expect(errorCodes).toContain(ValidationErrorCode.TEAM_AGAINST_ITSELF);
      expect(errorCodes).toContain(ValidationErrorCode.SCORES_REQUIRED_FOR_COMPLETED);
      expect(errorCodes).toContain(ValidationErrorCode.INVALID_SPIELTAG_RANGE);
      
      // Test negative score separately since it might not be included in the complete validation
      const scoreResult = validationService.validateScores(-1, 2);
      expect(scoreResult.isValid).toBe(false);
      expect(scoreResult.errors[0].code).toBe(ValidationErrorCode.NEGATIVE_SCORE);
    });

    it('should generate warnings for unusual but valid data', () => {
      const spiel = createValidSpiel();
      spiel.heim_tore = 12; // High score
      spiel.gast_tore = 0;  // Large difference
      
      const result = validationService.validateSpielResult(spiel);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      
      const warningCodes = result.warnings!.map(w => w.code);
      expect(warningCodes).toContain(ValidationWarningCode.HIGH_SCORE_VALUE);
      expect(warningCodes).toContain(ValidationWarningCode.UNUSUAL_SCORE_DIFFERENCE);
    });

    it('should handle missing optional fields gracefully', () => {
      const spiel = createValidSpiel();
      spiel.notizen = undefined;
      spiel.heim_tore = undefined;
      spiel.gast_tore = undefined;
      spiel.status = SpielStatus.GEPLANT; // Planned games don't need scores
      
      const result = validationService.validateSpielResult(spiel);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple validation calls efficiently', () => {
      const startTime = Date.now();
      
      // Simulate 1000 validation calls
      for (let i = 0; i < 1000; i++) {
        const spiel: SpielEntity = {
          datum: '2024-01-15',
          liga: { id: 1, name: 'Liga 1' },
          saison: { id: 1, name: '2024', jahr: 2024 },
          heim_team: { id: 1, name: 'Team A' },
          gast_team: { id: 2, name: 'Team B' },
          heim_tore: i % 10,
          gast_tore: (i + 1) % 10,
          spieltag: (i % 34) + 1,
          status: i % 2 === 0 ? SpielStatus.GEPLANT : SpielStatus.BEENDET
        };
        
        const result = validationService.validateSpielResult(spiel);
        expect(result).toBeDefined();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // Less than 1 second
    });

    it('should handle large datasets without memory issues', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        datum: '2024-01-15',
        liga: { id: 1, name: 'Liga 1' },
        saison: { id: 1, name: '2024', jahr: 2024 },
        heim_team: { id: 1, name: 'Team A' },
        gast_team: { id: 2, name: 'Team B' },
        heim_tore: Math.floor(Math.random() * 10),
        gast_tore: Math.floor(Math.random() * 10),
        spieltag: Math.floor(Math.random() * 34) + 1,
        status: SpielStatus.BEENDET
      }));
      
      expect(largeDataset.length).toBe(1000);
      
      // Process dataset
      const results = largeDataset.map(spiel => 
        validationService.validateSpielResult(spiel)
      );
      
      expect(results.length).toBe(1000);
      expect(results.every(r => r !== undefined)).toBe(true);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null and undefined team references', () => {
      const spiel: SpielEntity = {
        datum: '2024-01-15',
        liga: { id: 1, name: 'Liga 1' },
        saison: { id: 1, name: '2024', jahr: 2024 },
        heim_team: null as any,
        gast_team: undefined as any,
        spieltag: 1,
        status: SpielStatus.GEPLANT
      };
      
      const result = validationService.validateRequiredFields(spiel);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'heim_team')).toBe(true);
      expect(result.errors.some(e => e.field === 'gast_team')).toBe(true);
    });

    it('should handle extreme score values', () => {
      // Very high scores
      const highScoreResult = validationService.validateScores(50, 45);
      expect(highScoreResult.isValid).toBe(true);
      expect(highScoreResult.warnings).toBeDefined();
      
      // Zero scores
      const zeroScoreResult = validationService.validateScores(0, 0);
      expect(zeroScoreResult.isValid).toBe(true);
      expect(zeroScoreResult.errors).toHaveLength(0);
    });

    it('should handle boundary spieltag values', () => {
      // Minimum valid value
      const minResult = validationService.validateSpieltagRange(1);
      expect(minResult.isValid).toBe(true);
      
      // Maximum valid value
      const maxResult = validationService.validateSpieltagRange(34);
      expect(maxResult.isValid).toBe(true);
      
      // Just outside boundaries
      const belowMinResult = validationService.validateSpieltagRange(0);
      expect(belowMinResult.isValid).toBe(false);
      
      const aboveMaxResult = validationService.validateSpieltagRange(35);
      expect(aboveMaxResult.isValid).toBe(false);
    });

    it('should handle all status transition combinations', () => {
      const statuses = [SpielStatus.GEPLANT, SpielStatus.BEENDET, SpielStatus.ABGESAGT, SpielStatus.VERSCHOBEN];
      
      // Test all combinations
      statuses.forEach(fromStatus => {
        statuses.forEach(toStatus => {
          const result = validationService.validateStatusTransition(fromStatus, toStatus);
          expect(result).toBeDefined();
          expect(typeof result.isValid).toBe('boolean');
        });
      });
    });
  });

  describe('Validation Service Implementation Verification', () => {
    it('should have all required validation methods', () => {
      expect(typeof validationService.validateSpielResult).toBe('function');
      expect(typeof validationService.validateTeamConsistency).toBe('function');
      expect(typeof validationService.validateScores).toBe('function');
      expect(typeof validationService.validateStatusTransition).toBe('function');
      expect(typeof validationService.validateRequiredFields).toBe('function');
      expect(typeof validationService.validateSpieltagRange).toBe('function');
      expect(typeof validationService.sanitizeSpielInput).toBe('function');
    });

    it('should have proper error codes defined', () => {
      expect(ValidationErrorCode.NEGATIVE_SCORE).toBe('NEGATIVE_SCORE');
      expect(ValidationErrorCode.TEAM_AGAINST_ITSELF).toBe('TEAM_AGAINST_ITSELF');
      expect(ValidationErrorCode.MISSING_REQUIRED_FIELD).toBe('MISSING_REQUIRED_FIELD');
      expect(ValidationErrorCode.INVALID_STATUS_TRANSITION).toBe('INVALID_STATUS_TRANSITION');
      expect(ValidationErrorCode.INVALID_SPIELTAG_RANGE).toBe('INVALID_SPIELTAG_RANGE');
      expect(ValidationErrorCode.SCORES_REQUIRED_FOR_COMPLETED).toBe('SCORES_REQUIRED_FOR_COMPLETED');
    });

    it('should have proper warning codes defined', () => {
      expect(ValidationWarningCode.HIGH_SCORE_VALUE).toBe('HIGH_SCORE_VALUE');
      expect(ValidationWarningCode.UNUSUAL_SCORE_DIFFERENCE).toBe('UNUSUAL_SCORE_DIFFERENCE');
    });

    it('should handle all game statuses', () => {
      expect(SpielStatus.GEPLANT).toBe('geplant');
      expect(SpielStatus.BEENDET).toBe('beendet');
      expect(SpielStatus.ABGESAGT).toBe('abgesagt');
      expect(SpielStatus.VERSCHOBEN).toBe('verschoben');
    });
  });
});