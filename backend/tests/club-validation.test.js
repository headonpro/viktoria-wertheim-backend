/**
 * Tests for Club Validation Service
 */

const { setupStrapi, cleanupStrapi } = require('./helpers/strapi');

describe('Club Validation Service', () => {
  let strapi;
  let validationService;

  beforeAll(async () => {
    strapi = await setupStrapi();
    validationService = strapi.service('api::club.club-validation');
  });

  afterAll(async () => {
    await cleanupStrapi(strapi);
  });

  describe('Input Sanitization', () => {
    test('should sanitize club input correctly', () => {
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

      const sanitized = validationService.sanitizeClubInput(input);

      expect(sanitized.name).toBe('SV Test Club');
      expect(sanitized.kurz_name).toBe('SV TEST');
      expect(sanitized.club_typ).toBe('viktoria_verein');
      expect(sanitized.viktoria_team_mapping).toBe('team_1');
      expect(sanitized.gruendungsjahr).toBe(1952);
      expect(sanitized.website).toBe('https://www.test-club.de');
      expect(sanitized.vereinsfarben).toBe('Gelb  Blau');
      expect(sanitized.aktiv).toBe(true);
    });

    test('should handle empty and invalid inputs', () => {
      const input = {
        name: '',
        club_typ: 'invalid_type',
        viktoria_team_mapping: 'invalid_mapping',
        gruendungsjahr: 'not_a_year',
        website: 'not_a_url',
        aktiv: null
      };

      expect(() => {
        validationService.sanitizeClubInput(input);
      }).toThrow('Required string field cannot be empty');
    });

    test('should sanitize string fields with length limits', () => {
      const longString = 'a'.repeat(200);
      
      const sanitized = validationService.sanitizeString(longString, 50);
      expect(sanitized.length).toBe(50);
    });

    test('should sanitize URLs correctly', () => {
      expect(validationService.sanitizeUrl('www.example.com')).toBe('https://www.example.com');
      expect(validationService.sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(validationService.sanitizeUrl('invalid-url')).toBeUndefined();
      expect(validationService.sanitizeUrl('')).toBeUndefined();
    });

    test('should sanitize years correctly', () => {
      expect(validationService.sanitizeYear('1952')).toBe(1952);
      expect(validationService.sanitizeYear('not_a_year')).toBeUndefined();
      expect(validationService.sanitizeYear('1700')).toBeUndefined(); // Too old
      expect(validationService.sanitizeYear('2050')).toBeUndefined(); // Too far in future
    });
  });

  describe('Club Name Validation', () => {
    test('should validate unique club names', async () => {
      // Create a test club first
      await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Test Club Unique',
          club_typ: 'gegner_verein',
          aktiv: true
        }
      });

      // Test uniqueness validation
      const validation = await validationService.validateUniqueClubName('Test Club Unique');
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].type).toBe('unique');
      expect(validation.errors[0].field).toBe('name');
    });

    test('should allow same name when excluding current club', async () => {
      const club = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Test Club Exclude',
          club_typ: 'gegner_verein',
          aktiv: true
        }
      });

      const validation = await validationService.validateUniqueClubName('Test Club Exclude', club.id);
      expect(validation.isValid).toBe(true);
    });

    test('should reject empty club names', async () => {
      const validation = await validationService.validateUniqueClubName('');
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].type).toBe('required');
    });
  });

  describe('Viktoria Team Mapping Validation', () => {
    test('should validate unique viktoria team mappings', async () => {
      // Create a viktoria club with team_1 mapping
      await strapi.entityService.create('api::club.club', {
        data: {
          name: 'SV Viktoria Test',
          club_typ: 'viktoria_verein',
          viktoria_team_mapping: 'team_1',
          aktiv: true
        }
      });

      // Test uniqueness validation
      const validation = await validationService.validateUniqueViktoriaMapping('team_1');
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].type).toBe('unique');
      expect(validation.errors[0].field).toBe('viktoria_team_mapping');
    });

    test('should reject invalid team mappings', async () => {
      const validation = await validationService.validateUniqueViktoriaMapping('invalid_team');
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].type).toBe('format');
    });

    test('should allow empty team mapping', async () => {
      const validation = await validationService.validateUniqueViktoriaMapping('');
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Liga-Club Relationship Validation', () => {
    let testLiga;

    beforeEach(async () => {
      // Create a test liga
      testLiga = await strapi.entityService.create('api::liga.liga', {
        data: {
          name: 'Test Liga',
          aktiv: true
        }
      });
    });

    test('should validate liga-club relationships', async () => {
      const validation = await validationService.validateLigaClubRelationships(1, [testLiga.id]);
      expect(validation.isValid).toBe(true);
    });

    test('should reject empty liga assignments', async () => {
      const validation = await validationService.validateLigaClubRelationships(1, []);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].type).toBe('required');
      expect(validation.errors[0].field).toBe('ligen');
    });

    test('should reject non-existent liga IDs', async () => {
      const validation = await validationService.validateLigaClubRelationships(1, [99999]);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].type).toBe('relationship');
    });

    test('should detect duplicate liga assignments', async () => {
      const validation = await validationService.validateLigaClubRelationships(1, [testLiga.id, testLiga.id]);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].type).toBe('business_rule');
      expect(validation.errors[0].message).toContain('Duplicate liga assignments');
    });
  });

  describe('Comprehensive Club Data Validation', () => {
    test('should validate complete club data', async () => {
      const clubData = {
        name: 'Valid Test Club',
        kurz_name: 'VTC',
        club_typ: 'gegner_verein',
        gruendungsjahr: 1952,
        website: 'https://www.valid-test-club.de',
        vereinsfarben: 'Rot-Weiß',
        aktiv: true
      };

      const validation = await validationService.validateClubData(clubData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should validate viktoria club requirements', async () => {
      const clubData = {
        name: 'SV Viktoria Valid',
        club_typ: 'viktoria_verein',
        viktoria_team_mapping: 'team_2',
        aktiv: true
      };

      const validation = await validationService.validateClubData(clubData);
      expect(validation.isValid).toBe(true);
    });

    test('should reject viktoria club without team mapping', async () => {
      const clubData = {
        name: 'SV Viktoria Invalid',
        club_typ: 'viktoria_verein',
        aktiv: true
      };

      const validation = await validationService.validateClubData(clubData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.field === 'viktoria_team_mapping')).toBe(true);
    });

    test('should reject invalid field lengths', async () => {
      const clubData = {
        name: 'a', // Too short
        kurz_name: 'a'.repeat(25), // Too long
        club_typ: 'gegner_verein',
        website: 'https://' + 'a'.repeat(200) + '.com', // Too long
        aktiv: true
      };

      const validation = await validationService.validateClubData(clubData);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should provide warnings for non-viktoria clubs with team mapping', async () => {
      const clubData = {
        name: 'Gegner Club With Mapping',
        club_typ: 'gegner_verein',
        viktoria_team_mapping: 'team_1', // Should warn
        aktiv: true
      };

      const validation = await validationService.validateClubData(clubData);
      expect(validation.warnings).toBeDefined();
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0].field).toBe('viktoria_team_mapping');
    });
  });

  describe('Club Creation and Update Validation', () => {
    test('should validate club creation', async () => {
      const clubData = {
        name: 'New Creation Club',
        club_typ: 'gegner_verein',
        aktiv: true
      };

      const validation = await validationService.validateClubCreation(clubData);
      expect(validation.isValid).toBe(true);
    });

    test('should validate club update', async () => {
      // Create a club first
      const club = await strapi.entityService.create('api::club.club', {
        data: {
          name: 'Update Test Club',
          club_typ: 'gegner_verein',
          aktiv: true
        }
      });

      // Test update validation
      const updateData = {
        kurz_name: 'UTC',
        website: 'https://www.updated-club.de'
      };

      const validation = await validationService.validateClubUpdate(updateData, club.id);
      expect(validation.isValid).toBe(true);
    });

    test('should reject update for non-existent club', async () => {
      const validation = await validationService.validateClubUpdate({}, 99999);
      expect(validation.isValid).toBe(false);
      expect(validation.errors[0].type).toBe('relationship');
    });
  });

  describe('Batch Validation', () => {
    test('should validate multiple clubs', async () => {
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

      const results = await validationService.batchValidateClubs(clubs);
      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[1].isValid).toBe(true);
      expect(results[2].isValid).toBe(false);
    });
  });

  describe('Error Message Formatting', () => {
    test('should format error messages correctly', () => {
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

      const messages = validationService.getErrorMessages(errors);
      expect(messages).toContain('name: This field is required');
      expect(messages).toContain('website: Invalid format');
    });

    test('should generate validation report', () => {
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

      const report = validationService.getValidationReport(validation);
      expect(report.isValid).toBe(false);
      expect(report.summary).toContain('failed with 1 error');
      expect(report.errors).toHaveLength(1);
      expect(report.warnings).toHaveLength(1);
    });
  });

  // Cleanup after each test
  afterEach(async () => {
    try {
      // Clean up test clubs
      const clubs = await strapi.entityService.findMany('api::club.club', {
        filters: {
          name: {
            $contains: 'Test'
          }
        }
      });

      for (const club of clubs) {
        await strapi.entityService.delete('api::club.club', club.id);
      }

      // Clean up test ligen
      const ligen = await strapi.entityService.findMany('api::liga.liga', {
        filters: {
          name: {
            $contains: 'Test'
          }
        }
      });

      for (const liga of ligen) {
        await strapi.entityService.delete('api::liga.liga', liga.id);
      }
    } catch (error) {
      console.warn('Cleanup error:', error.message);
    }
  });
});