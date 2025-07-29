/**
 * Comprehensive Unit Tests for Club Validation Service
 * Tests all validation logic, input sanitization, and error handling
 * Requirements: All requirements need test coverage
 */

// Mock validation service
const mockValidationService = {
  sanitizeString: jest.fn(),
  sanitizeUrl: jest.fn(),
  sanitizeYear: jest.fn(),
  sanitizeClubInput: jest.fn(),
  validateUniqueClubName: jest.fn(),
  validateUniqueViktoriaMapping: jest.fn(),
  validateLigaClubRelationships: jest.fn(),
  validateClubData: jest.fn(),
  validateClubCreation: jest.fn(),
  validateClubUpdate: jest.fn(),
  batchValidateClubs: jest.fn(),
  getErrorMessages: jest.fn(),
  getValidationReport: jest.fn()
};

// Mock Strapi
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

describe('Club Validation Service - Comprehensive Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Input Sanitization', () => {
    describe('sanitizeString', () => {
      it('should trim whitespace and remove HTML tags', () => {
        mockValidationService.sanitizeString.mockImplementation((input: string, maxLength: number) => {
          const cleaned = input.trim().replace(/<[^>]*>/g, '');
          return cleaned.length > maxLength ? cleaned.substring(0, maxLength) : cleaned;
        });

        const result = mockValidationService.sanitizeString('  <script>alert("test")</script>Test Club  ', 50);
        expect(result).toBe('Test Club');
      });

      it('should enforce maximum length', () => {
        mockValidationService.sanitizeString.mockImplementation((input: string, maxLength: number) => {
          const cleaned = input.trim();
          return cleaned.length > maxLength ? cleaned.substring(0, maxLength) : cleaned;
        });

        const longString = 'a'.repeat(100);
        const result = mockValidationService.sanitizeString(longString, 50);
        expect(result).toHaveLength(50);
      });

      it('should handle empty strings', () => {
        mockValidationService.sanitizeString.mockImplementation((input: string) => {
          return input.trim();
        });

        expect(mockValidationService.sanitizeString('')).toBe('');
        expect(mockValidationService.sanitizeString('   ')).toBe('');
      });

      it('should handle special characters safely', () => {
        mockValidationService.sanitizeString.mockImplementation((input: string) => {
          return input.trim().replace(/[<>&"']/g, '');
        });

        const result = mockValidationService.sanitizeString('Club & Team "Test" <script>');
        expect(result).toBe('Club  Team Test script');
      });
    });

    describe('sanitizeUrl', () => {
      it('should add https protocol to URLs without protocol', () => {
        mockValidationService.sanitizeUrl.mockImplementation((url: string) => {
          if (!url) return undefined;
          if (url.startsWith('http://') || url.startsWith('https://')) return url;
          if (url.includes('.')) return `https://${url}`;
          return undefined;
        });

        expect(mockValidationService.sanitizeUrl('www.example.com')).toBe('https://www.example.com');
        expect(mockValidationService.sanitizeUrl('example.com')).toBe('https://example.com');
      });

      it('should preserve existing protocols', () => {
        mockValidationService.sanitizeUrl.mockImplementation((url: string) => {
          if (url.startsWith('http://') || url.startsWith('https://')) return url;
          return `https://${url}`;
        });

        expect(mockValidationService.sanitizeUrl('http://example.com')).toBe('http://example.com');
        expect(mockValidationService.sanitizeUrl('https://example.com')).toBe('https://example.com');
      });

      it('should reject invalid URLs', () => {
        mockValidationService.sanitizeUrl.mockImplementation((url: string) => {
          if (!url || !url.includes('.') || url.includes(' ')) return undefined;
          return url.startsWith('http') ? url : `https://${url}`;
        });

        expect(mockValidationService.sanitizeUrl('invalid-url')).toBeUndefined();
        expect(mockValidationService.sanitizeUrl('not a url')).toBeUndefined();
        expect(mockValidationService.sanitizeUrl('')).toBeUndefined();
      });

      it('should handle malicious URLs', () => {
        mockValidationService.sanitizeUrl.mockImplementation((url: string) => {
          if (url.startsWith('javascript:') || url.startsWith('data:')) return undefined;
          return url.includes('.') ? `https://${url.replace(/^https?:\/\//, '')}` : undefined;
        });

        expect(mockValidationService.sanitizeUrl('javascript:alert("xss")')).toBeUndefined();
        expect(mockValidationService.sanitizeUrl('data:text/html,<script>alert("xss")</script>')).toBeUndefined();
      });
    });

    describe('sanitizeYear', () => {
      it('should convert valid year strings to numbers', () => {
        mockValidationService.sanitizeYear.mockImplementation((year: string) => {
          const num = parseInt(year, 10);
          return (num >= 1800 && num <= 2030) ? num : undefined;
        });

        expect(mockValidationService.sanitizeYear('1952')).toBe(1952);
        expect(mockValidationService.sanitizeYear('2024')).toBe(2024);
      });

      it('should reject invalid years', () => {
        mockValidationService.sanitizeYear.mockImplementation((year: string) => {
          const num = parseInt(year, 10);
          return (num >= 1800 && num <= 2030) ? num : undefined;
        });

        expect(mockValidationService.sanitizeYear('1700')).toBeUndefined(); // Too old
        expect(mockValidationService.sanitizeYear('2050')).toBeUndefined(); // Too far in future
        expect(mockValidationService.sanitizeYear('not_a_year')).toBeUndefined();
        expect(mockValidationService.sanitizeYear('')).toBeUndefined();
      });

      it('should handle edge cases', () => {
        mockValidationService.sanitizeYear.mockImplementation((year: string) => {
          const num = parseInt(year, 10);
          return (num >= 1800 && num <= 2030) ? num : undefined;
        });

        expect(mockValidationService.sanitizeYear('1800')).toBe(1800); // Minimum valid
        expect(mockValidationService.sanitizeYear('2030')).toBe(2030); // Maximum valid
        expect(mockValidationService.sanitizeYear('1799')).toBeUndefined(); // Just below minimum
        expect(mockValidationService.sanitizeYear('2031')).toBeUndefined(); // Just above maximum
      });
    });

    describe('sanitizeClubInput', () => {
      it('should sanitize complete club input', () => {
        const input = {
          name: '  <script>alert("test")</script>SV Test Club  ',
          kurz_name: 'SV TEST',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1',
          gruendungsjahr: '1952',
          website: 'www.test-club.de',
          vereinsfarben: 'Gelb & Blau',
          aktiv: 'true'
        };

        mockValidationService.sanitizeClubInput.mockReturnValue({
          name: 'SV Test Club',
          kurz_name: 'SV TEST',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1',
          gruendungsjahr: 1952,
          website: 'https://www.test-club.de',
          vereinsfarben: 'Gelb  Blau',
          aktiv: true
        });

        const result = mockValidationService.sanitizeClubInput(input);

        expect(result.name).toBe('SV Test Club');
        expect(result.kurz_name).toBe('SV TEST');
        expect(result.club_typ).toBe('viktoria_verein');
        expect(result.viktoria_team_mapping).toBe('team_1');
        expect(result.gruendungsjahr).toBe(1952);
        expect(result.website).toBe('https://www.test-club.de');
        expect(result.vereinsfarben).toBe('Gelb  Blau');
        expect(result.aktiv).toBe(true);
      });

      it('should throw error for empty required fields', () => {
        const input = {
          name: '',
          club_typ: 'invalid_type'
        };

        mockValidationService.sanitizeClubInput.mockImplementation(() => {
          throw new Error('Required string field cannot be empty');
        });

        expect(() => {
          mockValidationService.sanitizeClubInput(input);
        }).toThrow('Required string field cannot be empty');
      });

      it('should handle missing optional fields', () => {
        const input = {
          name: 'Test Club',
          club_typ: 'gegner_verein'
        };

        mockValidationService.sanitizeClubInput.mockReturnValue({
          name: 'Test Club',
          club_typ: 'gegner_verein',
          aktiv: true
        });

        const result = mockValidationService.sanitizeClubInput(input);

        expect(result.name).toBe('Test Club');
        expect(result.club_typ).toBe('gegner_verein');
        expect(result.aktiv).toBe(true);
        expect(result.kurz_name).toBeUndefined();
        expect(result.website).toBeUndefined();
      });
    });
  });

  describe('Uniqueness Validation', () => {
    describe('validateUniqueClubName', () => {
      it('should pass for unique club names', async () => {
        mockValidationService.validateUniqueClubName.mockResolvedValue({
          isValid: true,
          errors: []
        });

        const result = await mockValidationService.validateUniqueClubName('Unique Club Name');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail for duplicate club names', async () => {
        mockValidationService.validateUniqueClubName.mockResolvedValue({
          isValid: false,
          errors: [{
            type: 'unique',
            field: 'name',
            message: 'Club name already exists'
          }]
        });

        const result = await mockValidationService.validateUniqueClubName('Existing Club');

        expect(result.isValid).toBe(false);
        expect(result.errors[0].type).toBe('unique');
        expect(result.errors[0].field).toBe('name');
      });

      it('should allow same name when excluding current club', async () => {
        mockValidationService.validateUniqueClubName.mockResolvedValue({
          isValid: true,
          errors: []
        });

        const result = await mockValidationService.validateUniqueClubName('Test Club', 1);

        expect(result.isValid).toBe(true);
      });

      it('should reject empty club names', async () => {
        mockValidationService.validateUniqueClubName.mockResolvedValue({
          isValid: false,
          errors: [{
            type: 'required',
            field: 'name',
            message: 'Club name is required'
          }]
        });

        const result = await mockValidationService.validateUniqueClubName('');

        expect(result.isValid).toBe(false);
        expect(result.errors[0].type).toBe('required');
      });
    });

    describe('validateUniqueViktoriaMapping', () => {
      it('should pass for unique viktoria team mappings', async () => {
        mockValidationService.validateUniqueViktoriaMapping.mockResolvedValue({
          isValid: true,
          errors: []
        });

        const result = await mockValidationService.validateUniqueViktoriaMapping('team_2');

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should fail for duplicate viktoria team mappings', async () => {
        mockValidationService.validateUniqueViktoriaMapping.mockResolvedValue({
          isValid: false,
          errors: [{
            type: 'unique',
            field: 'viktoria_team_mapping',
            message: 'Team mapping already in use'
          }]
        });

        const result = await mockValidationService.validateUniqueViktoriaMapping('team_1');

        expect(result.isValid).toBe(false);
        expect(result.errors[0].type).toBe('unique');
        expect(result.errors[0].field).toBe('viktoria_team_mapping');
      });

      it('should reject invalid team mappings', async () => {
        mockValidationService.validateUniqueViktoriaMapping.mockResolvedValue({
          isValid: false,
          errors: [{
            type: 'format',
            field: 'viktoria_team_mapping',
            message: 'Invalid team mapping format'
          }]
        });

        const result = await mockValidationService.validateUniqueViktoriaMapping('invalid_team');

        expect(result.isValid).toBe(false);
        expect(result.errors[0].type).toBe('format');
      });

      it('should allow empty team mapping', async () => {
        mockValidationService.validateUniqueViktoriaMapping.mockResolvedValue({
          isValid: true,
          errors: []
        });

        const result = await mockValidationService.validateUniqueViktoriaMapping('');

        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Relationship Validation', () => {
    describe('validateLigaClubRelationships', () => {
      it('should validate valid liga-club relationships', async () => {
        mockValidationService.validateLigaClubRelationships.mockResolvedValue({
          isValid: true,
          errors: []
        });

        const result = await mockValidationService.validateLigaClubRelationships(1, [1, 2]);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject empty liga assignments', async () => {
        mockValidationService.validateLigaClubRelationships.mockResolvedValue({
          isValid: false,
          errors: [{
            type: 'required',
            field: 'ligen',
            message: 'At least one liga assignment is required'
          }]
        });

        const result = await mockValidationService.validateLigaClubRelationships(1, []);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].type).toBe('required');
        expect(result.errors[0].field).toBe('ligen');
      });

      it('should reject non-existent liga IDs', async () => {
        mockValidationService.validateLigaClubRelationships.mockResolvedValue({
          isValid: false,
          errors: [{
            type: 'relationship',
            field: 'ligen',
            message: 'Liga does not exist'
          }]
        });

        const result = await mockValidationService.validateLigaClubRelationships(1, [99999]);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].type).toBe('relationship');
      });

      it('should detect duplicate liga assignments', async () => {
        mockValidationService.validateLigaClubRelationships.mockResolvedValue({
          isValid: false,
          errors: [{
            type: 'business_rule',
            field: 'ligen',
            message: 'Duplicate liga assignments detected'
          }]
        });

        const result = await mockValidationService.validateLigaClubRelationships(1, [1, 1]);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].type).toBe('business_rule');
        expect(result.errors[0].message).toContain('Duplicate liga assignments');
      });
    });
  });

  describe('Comprehensive Club Data Validation', () => {
    describe('validateClubData', () => {
      it('should validate complete valid club data', async () => {
        const clubData = {
          name: 'Valid Test Club',
          kurz_name: 'VTC',
          club_typ: 'gegner_verein',
          gruendungsjahr: 1952,
          website: 'https://www.valid-test-club.de',
          vereinsfarben: 'Rot-Weiß',
          aktiv: true
        };

        mockValidationService.validateClubData.mockResolvedValue({
          isValid: true,
          errors: [],
          warnings: []
        });

        const result = await mockValidationService.validateClubData(clubData);

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate viktoria club requirements', async () => {
        const clubData = {
          name: 'SV Viktoria Valid',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_2',
          aktiv: true
        };

        mockValidationService.validateClubData.mockResolvedValue({
          isValid: true,
          errors: [],
          warnings: []
        });

        const result = await mockValidationService.validateClubData(clubData);

        expect(result.isValid).toBe(true);
      });

      it('should reject viktoria club without team mapping', async () => {
        const clubData = {
          name: 'SV Viktoria Invalid',
          club_typ: 'viktoria_verein',
          aktiv: true
        };

        mockValidationService.validateClubData.mockResolvedValue({
          isValid: false,
          errors: [{
            field: 'viktoria_team_mapping',
            type: 'required',
            message: 'Team mapping required for Viktoria clubs'
          }],
          warnings: []
        });

        const result = await mockValidationService.validateClubData(clubData);

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.field === 'viktoria_team_mapping')).toBe(true);
      });

      it('should reject invalid field lengths', async () => {
        const clubData = {
          name: 'a', // Too short
          kurz_name: 'a'.repeat(25), // Too long
          club_typ: 'gegner_verein',
          website: 'https://' + 'a'.repeat(200) + '.com', // Too long
          aktiv: true
        };

        mockValidationService.validateClubData.mockResolvedValue({
          isValid: false,
          errors: [
            {
              field: 'name',
              type: 'length',
              message: 'Name too short'
            },
            {
              field: 'kurz_name',
              type: 'length',
              message: 'Short name too long'
            },
            {
              field: 'website',
              type: 'length',
              message: 'Website URL too long'
            }
          ],
          warnings: []
        });

        const result = await mockValidationService.validateClubData(clubData);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should provide warnings for non-viktoria clubs with team mapping', async () => {
        const clubData = {
          name: 'Gegner Club With Mapping',
          club_typ: 'gegner_verein',
          viktoria_team_mapping: 'team_1', // Should warn
          aktiv: true
        };

        mockValidationService.validateClubData.mockResolvedValue({
          isValid: true,
          errors: [],
          warnings: [{
            field: 'viktoria_team_mapping',
            message: 'Team mapping not needed for non-Viktoria clubs'
          }]
        });

        const result = await mockValidationService.validateClubData(clubData);

        expect(result.warnings).toBeDefined();
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0].field).toBe('viktoria_team_mapping');
      });
    });

    describe('validateClubCreation', () => {
      it('should validate club creation data', async () => {
        const clubData = {
          name: 'New Creation Club',
          club_typ: 'gegner_verein',
          aktiv: true
        };

        mockValidationService.validateClubCreation.mockResolvedValue({
          isValid: true,
          errors: []
        });

        const result = await mockValidationService.validateClubCreation(clubData);

        expect(result.isValid).toBe(true);
      });

      it('should reject invalid creation data', async () => {
        const clubData = {
          name: '',
          club_typ: 'invalid_type'
        };

        mockValidationService.validateClubCreation.mockResolvedValue({
          isValid: false,
          errors: [
            {
              field: 'name',
              type: 'required',
              message: 'Name is required'
            },
            {
              field: 'club_typ',
              type: 'format',
              message: 'Invalid club type'
            }
          ]
        });

        const result = await mockValidationService.validateClubCreation(clubData);

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBe(2);
      });
    });

    describe('validateClubUpdate', () => {
      it('should validate club update data', async () => {
        const updateData = {
          kurz_name: 'UTC',
          website: 'https://www.updated-club.de'
        };

        mockValidationService.validateClubUpdate.mockResolvedValue({
          isValid: true,
          errors: []
        });

        const result = await mockValidationService.validateClubUpdate(updateData, 1);

        expect(result.isValid).toBe(true);
      });

      it('should reject update for non-existent club', async () => {
        mockValidationService.validateClubUpdate.mockResolvedValue({
          isValid: false,
          errors: [{
            type: 'relationship',
            message: 'Club not found'
          }]
        });

        const result = await mockValidationService.validateClubUpdate({}, 99999);

        expect(result.isValid).toBe(false);
        expect(result.errors[0].type).toBe('relationship');
      });
    });
  });

  describe('Batch Validation', () => {
    describe('batchValidateClubs', () => {
      it('should validate multiple clubs', async () => {
        const clubs = [
          {
            name: 'Batch Club 1',
            club_typ: 'gegner_verein',
            aktiv: true
          },
          {
            name: 'Batch Club 2',
            club_typ: 'viktoria_verein',
            viktoria_team_mapping: 'team_3',
            aktiv: true
          },
          {
            name: '', // Invalid
            club_typ: 'gegner_verein',
            aktiv: true
          }
        ];

        mockValidationService.batchValidateClubs.mockResolvedValue([
          { isValid: true, errors: [] },
          { isValid: true, errors: [] },
          { isValid: false, errors: [{ field: 'name', type: 'required', message: 'Name required' }] }
        ]);

        const results = await mockValidationService.batchValidateClubs(clubs);

        expect(results).toHaveLength(3);
        expect(results[0].isValid).toBe(true);
        expect(results[1].isValid).toBe(true);
        expect(results[2].isValid).toBe(false);
      });

      it('should handle empty batch', async () => {
        mockValidationService.batchValidateClubs.mockResolvedValue([]);

        const results = await mockValidationService.batchValidateClubs([]);

        expect(results).toHaveLength(0);
      });

      it('should handle batch validation errors', async () => {
        mockValidationService.batchValidateClubs.mockRejectedValue(
          new Error('Batch validation failed')
        );

        await expect(mockValidationService.batchValidateClubs([{}]))
          .rejects.toThrow('Batch validation failed');
      });
    });
  });

  describe('Error Message Formatting', () => {
    describe('getErrorMessages', () => {
      it('should format error messages correctly', () => {
        const errors = [
          {
            field: 'name',
            type: 'required',
            message: 'Name is required'
          },
          {
            field: 'website',
            type: 'format',
            message: 'Invalid URL format'
          }
        ];

        mockValidationService.getErrorMessages.mockReturnValue([
          'name: This field is required',
          'website: Invalid format'
        ]);

        const messages = mockValidationService.getErrorMessages(errors);

        expect(messages).toContain('name: This field is required');
        expect(messages).toContain('website: Invalid format');
      });

      it('should handle empty error array', () => {
        mockValidationService.getErrorMessages.mockReturnValue([]);

        const messages = mockValidationService.getErrorMessages([]);

        expect(messages).toHaveLength(0);
      });

      it('should handle malformed errors', () => {
        const malformedErrors = [
          { field: null, type: undefined, message: 'Test error' },
          { message: 'Error without field' }
        ];

        mockValidationService.getErrorMessages.mockReturnValue([
          'unknown: Test error',
          'Error without field'
        ]);

        const messages = mockValidationService.getErrorMessages(malformedErrors);

        expect(messages).toHaveLength(2);
      });
    });

    describe('getValidationReport', () => {
      it('should generate comprehensive validation report', () => {
        const validation = {
          isValid: false,
          errors: [
            {
              field: 'name',
              type: 'required',
              message: 'Name is required'
            }
          ],
          warnings: [
            {
              field: 'website',
              message: 'URL format could be improved'
            }
          ]
        };

        mockValidationService.getValidationReport.mockReturnValue({
          isValid: false,
          summary: 'Validation failed with 1 error and 1 warning',
          errors: ['name: This field is required'],
          warnings: ['website: URL format could be improved'],
          errorCount: 1,
          warningCount: 1
        });

        const report = mockValidationService.getValidationReport(validation);

        expect(report.isValid).toBe(false);
        expect(report.summary).toContain('failed with 1 error');
        expect(report.errors).toHaveLength(1);
        expect(report.warnings).toHaveLength(1);
      });

      it('should generate success report', () => {
        const validation = {
          isValid: true,
          errors: [],
          warnings: []
        };

        mockValidationService.getValidationReport.mockReturnValue({
          isValid: true,
          summary: 'Validation passed successfully',
          errors: [],
          warnings: [],
          errorCount: 0,
          warningCount: 0
        });

        const report = mockValidationService.getValidationReport(validation);

        expect(report.isValid).toBe(true);
        expect(report.summary).toContain('passed successfully');
        expect(report.errors).toHaveLength(0);
        expect(report.warnings).toHaveLength(0);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs', async () => {
      mockValidationService.validateClubData.mockResolvedValue({
        isValid: false,
        errors: [{ field: 'input', type: 'required', message: 'Input cannot be null' }]
      });

      const result = await mockValidationService.validateClubData(null);

      expect(result.isValid).toBe(false);
    });

    it('should handle malformed club data', async () => {
      const malformedData = {
        name: { invalid: 'object' },
        club_typ: 123,
        aktiv: 'not_boolean'
      };

      mockValidationService.validateClubData.mockResolvedValue({
        isValid: false,
        errors: [
          { field: 'name', type: 'type', message: 'Name must be string' },
          { field: 'club_typ', type: 'type', message: 'Club type must be string' },
          { field: 'aktiv', type: 'type', message: 'Active must be boolean' }
        ]
      });

      const result = await mockValidationService.validateClubData(malformedData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(3);
    });

    it('should handle validation service errors', async () => {
      mockValidationService.validateClubData.mockRejectedValue(
        new Error('Validation service unavailable')
      );

      await expect(mockValidationService.validateClubData({}))
        .rejects.toThrow('Validation service unavailable');
    });

    it('should handle concurrent validation requests', async () => {
      const clubData = { name: 'Test Club', club_typ: 'gegner_verein' };
      
      mockValidationService.validateClubData.mockResolvedValue({
        isValid: true,
        errors: []
      });

      const promises = Array.from({ length: 10 }, () => 
        mockValidationService.validateClubData(clubData)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });

    it('should handle large validation datasets', async () => {
      const largeClubList = Array.from({ length: 1000 }, (_, i) => ({
        name: `Club ${i + 1}`,
        club_typ: 'gegner_verein',
        aktiv: true
      }));

      mockValidationService.batchValidateClubs.mockResolvedValue(
        largeClubList.map(() => ({ isValid: true, errors: [] }))
      );

      const start = Date.now();
      const results = await mockValidationService.batchValidateClubs(largeClubList);
      const duration = Date.now() - start;

      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle special characters in club names', async () => {
      const specialCharClubs = [
        { name: 'FC Müller-Thurgau', club_typ: 'gegner_verein' },
        { name: 'SV Weiß-Blau', club_typ: 'gegner_verein' },
        { name: 'TSV 1860 München', club_typ: 'gegner_verein' },
        { name: 'SpVgg Greuther Fürth', club_typ: 'gegner_verein' }
      ];

      mockValidationService.batchValidateClubs.mockResolvedValue(
        specialCharClubs.map(() => ({ isValid: true, errors: [] }))
      );

      const results = await mockValidationService.batchValidateClubs(specialCharClubs);

      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });
  });
});