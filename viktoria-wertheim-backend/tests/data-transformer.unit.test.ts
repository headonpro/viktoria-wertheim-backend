import {
  DataTypeConverter,
  RelationshipMapper,
  DataValidator,
  DataTransformer,
  ValidationError,
  RelationshipMapping
} from '../scripts/data-transformer';

describe('DataTypeConverter', () => {
  describe('convertValue', () => {
    it('should convert INTEGER values correctly', () => {
      expect(DataTypeConverter.convertValue('123', 'INTEGER')).toBe(123);
      expect(DataTypeConverter.convertValue(456, 'INTEGER')).toBe(456);
      expect(DataTypeConverter.convertValue(null, 'INTEGER')).toBeNull();
      expect(DataTypeConverter.convertValue(undefined, 'INTEGER')).toBeNull();
    });

    it('should convert TEXT values correctly', () => {
      expect(DataTypeConverter.convertValue('hello', 'TEXT')).toBe('hello');
      expect(DataTypeConverter.convertValue(123, 'TEXT')).toBe('123');
      expect(DataTypeConverter.convertValue(null, 'TEXT')).toBeNull();
    });

    it('should convert REAL values correctly', () => {
      expect(DataTypeConverter.convertValue('123.45', 'REAL')).toBe(123.45);
      expect(DataTypeConverter.convertValue(67.89, 'REAL')).toBe(67.89);
      expect(DataTypeConverter.convertValue(null, 'REAL')).toBeNull();
    });

    it('should convert BOOLEAN values correctly', () => {
      expect(DataTypeConverter.convertValue(1, 'BOOLEAN')).toBe(true);
      expect(DataTypeConverter.convertValue(0, 'BOOLEAN')).toBe(false);
      expect(DataTypeConverter.convertValue('true', 'BOOLEAN')).toBe(true);
      expect(DataTypeConverter.convertValue('false', 'BOOLEAN')).toBe(false);
      expect(DataTypeConverter.convertValue('1', 'BOOLEAN')).toBe(true);
      expect(DataTypeConverter.convertValue(null, 'BOOLEAN')).toBeNull();
    });

    it('should convert DATETIME values correctly', () => {
      const dateString = '2023-12-01T10:30:00Z';
      const date = new Date(dateString);
      
      expect(DataTypeConverter.convertValue(dateString, 'DATETIME')).toBe(date.toISOString());
      expect(DataTypeConverter.convertValue(date, 'DATETIME')).toBe(date.toISOString());
      expect(DataTypeConverter.convertValue(1701425400, 'DATETIME')).toBe(new Date(1701425400 * 1000).toISOString());
      expect(DataTypeConverter.convertValue(null, 'DATETIME')).toBeNull();
    });

    it('should convert JSON values correctly', () => {
      const jsonString = '{"key": "value"}';
      const jsonObject = { key: 'value' };
      
      expect(DataTypeConverter.convertValue(jsonString, 'JSON')).toEqual(jsonObject);
      expect(DataTypeConverter.convertValue(jsonObject, 'JSON')).toEqual(jsonObject);
      expect(DataTypeConverter.convertValue('not json', 'JSON')).toBe('not json');
      expect(DataTypeConverter.convertValue(null, 'JSON')).toBeNull();
    });

    it('should convert BLOB values correctly', () => {
      const buffer = Buffer.from('hello world');
      const expectedHex = '\\x' + buffer.toString('hex');
      
      expect(DataTypeConverter.convertValue(buffer, 'BLOB')).toBe(expectedHex);
      expect(DataTypeConverter.convertValue('string', 'BLOB')).toBe('string');
      expect(DataTypeConverter.convertValue(null, 'BLOB')).toBeNull();
    });

    it('should handle unknown types by defaulting to TEXT', () => {
      expect(DataTypeConverter.convertValue('test', 'UNKNOWN_TYPE')).toBe('test');
    });
  });

  describe('validateValue', () => {
    it('should validate INTEGER values', () => {
      expect(DataTypeConverter.validateValue(123, 'INTEGER')).toBe(true);
      expect(DataTypeConverter.validateValue('123', 'INTEGER')).toBe(false);
      expect(DataTypeConverter.validateValue(null, 'INTEGER')).toBe(true);
    });

    it('should validate TEXT values', () => {
      expect(DataTypeConverter.validateValue('hello', 'TEXT')).toBe(true);
      expect(DataTypeConverter.validateValue(123, 'TEXT')).toBe(false);
      expect(DataTypeConverter.validateValue(null, 'TEXT')).toBe(true);
    });

    it('should validate BOOLEAN values', () => {
      expect(DataTypeConverter.validateValue(true, 'BOOLEAN')).toBe(true);
      expect(DataTypeConverter.validateValue(false, 'BOOLEAN')).toBe(true);
      expect(DataTypeConverter.validateValue(0, 'BOOLEAN')).toBe(true);
      expect(DataTypeConverter.validateValue(1, 'BOOLEAN')).toBe(true);
      expect(DataTypeConverter.validateValue(2, 'BOOLEAN')).toBe(false);
      expect(DataTypeConverter.validateValue(null, 'BOOLEAN')).toBe(true);
    });
  });

  describe('getPostgreSQLType', () => {
    it('should return correct PostgreSQL types', () => {
      expect(DataTypeConverter.getPostgreSQLType('INTEGER')).toBe('INTEGER');
      expect(DataTypeConverter.getPostgreSQLType('TEXT')).toBe('TEXT');
      expect(DataTypeConverter.getPostgreSQLType('REAL')).toBe('DECIMAL');
      expect(DataTypeConverter.getPostgreSQLType('BLOB')).toBe('BYTEA');
      expect(DataTypeConverter.getPostgreSQLType('DATETIME')).toBe('TIMESTAMP');
      expect(DataTypeConverter.getPostgreSQLType('BOOLEAN')).toBe('BOOLEAN');
      expect(DataTypeConverter.getPostgreSQLType('UNKNOWN')).toBe('TEXT');
    });
  });

  describe('detectFieldType', () => {
    it('should detect INTEGER type', () => {
      expect(DataTypeConverter.detectFieldType([1, 2, 3, 4])).toBe('INTEGER');
      expect(DataTypeConverter.detectFieldType([1, null, 3, 4])).toBe('INTEGER');
    });

    it('should detect REAL type', () => {
      expect(DataTypeConverter.detectFieldType([1.5, 2.7, 3.14])).toBe('REAL');
    });

    it('should detect BOOLEAN type', () => {
      expect(DataTypeConverter.detectFieldType([true, false, true])).toBe('BOOLEAN');
      expect(DataTypeConverter.detectFieldType([0, 1, 0, 1])).toBe('BOOLEAN');
    });

    it('should detect DATETIME type', () => {
      expect(DataTypeConverter.detectFieldType([
        '2023-01-01T00:00:00Z',
        '2023-12-31T23:59:59Z'
      ])).toBe('DATETIME');
    });

    it('should detect JSON type', () => {
      expect(DataTypeConverter.detectFieldType([
        '{"key": "value"}',
        '{"another": "json"}'
      ])).toBe('JSON');
    });

    it('should default to TEXT type', () => {
      expect(DataTypeConverter.detectFieldType(['hello', 'world'])).toBe('TEXT');
      expect(DataTypeConverter.detectFieldType([])).toBe('TEXT');
    });
  });
});

describe('RelationshipMapper', () => {
  let mapper: RelationshipMapper;

  beforeEach(() => {
    mapper = new RelationshipMapper();
  });

  describe('addRelationship and getRelationships', () => {
    it('should add and retrieve relationships', () => {
      const relationship: RelationshipMapping = {
        sourceTable: 'posts',
        sourceField: 'author_id',
        targetTable: 'users',
        targetField: 'id',
        relationType: 'one-to-many'
      };

      mapper.addRelationship(relationship);
      const relationships = mapper.getRelationships('posts');
      
      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toEqual(relationship);
    });

    it('should return empty array for tables with no relationships', () => {
      expect(mapper.getRelationships('unknown_table')).toEqual([]);
    });
  });

  describe('buildFromForeignKeys', () => {
    it('should build relationships from foreign key data', () => {
      const foreignKeyData = {
        posts: [
          { from: 'author_id', table: 'users', to: 'id', on_delete: 'CASCADE' }
        ],
        comments: [
          { from: 'post_id', table: 'posts', to: 'id', on_delete: 'CASCADE' }
        ]
      };

      mapper.buildFromForeignKeys(foreignKeyData);

      const postRelationships = mapper.getRelationships('posts');
      const commentRelationships = mapper.getRelationships('comments');

      expect(postRelationships).toHaveLength(1);
      expect(postRelationships[0].targetTable).toBe('users');
      expect(postRelationships[0].cascadeDelete).toBe(true);

      expect(commentRelationships).toHaveLength(1);
      expect(commentRelationships[0].targetTable).toBe('posts');
    });
  });

  describe('validateRelationships', () => {
    it('should validate referential integrity', () => {
      const relationship: RelationshipMapping = {
        sourceTable: 'posts',
        sourceField: 'author_id',
        targetTable: 'users',
        targetField: 'id',
        relationType: 'one-to-many'
      };

      mapper.addRelationship(relationship);

      const data = {
        users: [
          { id: 1, name: 'John' },
          { id: 2, name: 'Jane' }
        ],
        posts: [
          { id: 1, title: 'Post 1', author_id: 1 },
          { id: 2, title: 'Post 2', author_id: 3 } // Invalid reference
        ]
      };

      const errors = mapper.validateRelationships(data);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].table).toBe('posts');
      expect(errors[0].field).toBe('author_id');
      expect(errors[0].severity).toBe('error');
    });

    it('should handle missing target tables', () => {
      const relationship: RelationshipMapping = {
        sourceTable: 'posts',
        sourceField: 'author_id',
        targetTable: 'users',
        targetField: 'id',
        relationType: 'one-to-many'
      };

      mapper.addRelationship(relationship);

      const data = {
        posts: [
          { id: 1, title: 'Post 1', author_id: 1 }
        ]
        // Missing users table
      };

      const errors = mapper.validateRelationships(data);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toContain('Referenced table users not found');
    });
  });

  describe('getImportOrder', () => {
    it('should return correct import order based on dependencies', () => {
      mapper.addRelationship({
        sourceTable: 'posts',
        sourceField: 'author_id',
        targetTable: 'users',
        targetField: 'id',
        relationType: 'one-to-many'
      });

      mapper.addRelationship({
        sourceTable: 'comments',
        sourceField: 'post_id',
        targetTable: 'posts',
        targetField: 'id',
        relationType: 'one-to-many'
      });

      const order = mapper.getImportOrder(['users', 'posts', 'comments']);
      
      expect(order.indexOf('users')).toBeLessThan(order.indexOf('posts'));
      expect(order.indexOf('posts')).toBeLessThan(order.indexOf('comments'));
    });
  });
});

describe('DataValidator', () => {
  let validator: DataValidator;

  beforeEach(() => {
    validator = new DataValidator();
  });

  describe('addValidationRule and validateData', () => {
    it('should add and execute validation rules', () => {
      const rule = (record: any): ValidationError | null => {
        if (!record.name) {
          return {
            table: 'test',
            recordId: record.id,
            field: 'name',
            error: 'Name is required',
            severity: 'error'
          };
        }
        return null;
      };

      validator.addValidationRule('users', rule);

      const data = {
        users: [
          { id: 1, name: 'John' },
          { id: 2 } // Missing name
        ]
      };

      const errors = validator.validateData(data);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('name');
      expect(errors[0].error).toBe('Name is required');
    });
  });

  describe('validateIntegrity', () => {
    it('should detect duplicate IDs', () => {
      const data = {
        users: [
          { id: 1, name: 'John' },
          { id: 1, name: 'Jane' } // Duplicate ID
        ]
      };

      const errors = validator.validateIntegrity(data);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toContain('Duplicate ID found: 1');
    });

    it('should handle records without IDs', () => {
      const data = {
        users: [
          { name: 'John' },
          { name: 'Jane' }
        ]
      };

      const errors = validator.validateIntegrity(data);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('DataTransformer', () => {
  let transformer: DataTransformer;

  beforeEach(() => {
    transformer = new DataTransformer({
      validateData: true,
      preserveIds: true,
      batchSize: 10
    });
  });

  describe('transform', () => {
    it('should transform exported data successfully', async () => {
      const exportedData = {
        data: {
          users: {
            data: [
              { id: 1, name: 'John', active: 1, created_at: '2023-01-01T00:00:00Z' },
              { id: 2, name: 'Jane', active: 0, created_at: '2023-01-02T00:00:00Z' }
            ],
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'name', type: 'TEXT' },
              { name: 'active', type: 'BOOLEAN' },
              { name: 'created_at', type: 'DATETIME' }
            ],
            foreignKeys: []
          }
        }
      };

      const result = await transformer.transform(exportedData);
      
      expect(result.success).toBe(true);
      expect(result.transformedData.users).toHaveLength(2);
      expect(result.transformedData.users[0].active).toBe(true);
      expect(result.transformedData.users[1].active).toBe(false);
      expect(typeof result.transformedData.users[0].created_at).toBe('string');
    });

    it('should handle transformation errors gracefully', async () => {
      const exportedData = {
        data: {
          invalid_table: {
            data: [
              { id: 'invalid_id', name: 'Test' } // Invalid ID type
            ],
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'name', type: 'TEXT' }
            ],
            foreignKeys: []
          }
        }
      };

      // Mock the convertValue to throw an error
      const originalConvertValue = DataTypeConverter.convertValue;
      DataTypeConverter.convertValue = jest.fn().mockImplementation((value, type, field) => {
        if (field === 'invalid_table.id') {
          throw new Error('Conversion failed');
        }
        return originalConvertValue(value, type, field);
      });

      const result = await transformer.transform(exportedData);
      
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Error transforming table invalid_table');

      // Restore original function
      DataTypeConverter.convertValue = originalConvertValue;
    });

    it('should emit progress events', async () => {
      const progressEvents: any[] = [];
      
      transformer.on('progress', (progress) => {
        progressEvents.push(progress);
      });

      const exportedData = {
        data: {
          users: {
            data: Array.from({ length: 25 }, (_, i) => ({
              id: i + 1,
              name: `User ${i + 1}`
            })),
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'name', type: 'TEXT' }
            ],
            foreignKeys: []
          }
        }
      };

      await transformer.transform(exportedData);
      
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[0]).toHaveProperty('totalRecords');
      expect(progressEvents[0]).toHaveProperty('processedRecords');
      expect(progressEvents[0]).toHaveProperty('currentTable');
    });
  });
});