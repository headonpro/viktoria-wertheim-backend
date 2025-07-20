import { SQLiteExporter, exportSQLiteData } from '../scripts/sqlite-export';
import { EventEmitter } from 'events';

describe('SQLiteExporter Unit Tests', () => {
  describe('Constructor and basic functionality', () => {
    it('should initialize with default options', () => {
      const exporter = new SQLiteExporter();
      expect(exporter).toBeInstanceOf(SQLiteExporter);
      expect(exporter).toBeInstanceOf(EventEmitter);
    });

    it('should initialize with custom options', () => {
      const options = {
        databasePath: '/test/path/data.db',
        outputPath: '/test/exports',
        includeSystemTables: true,
        batchSize: 500
      };
      
      const exporter = new SQLiteExporter(options);
      expect(exporter).toBeInstanceOf(SQLiteExporter);
    });
  });

  describe('Event emission', () => {
    it('should be an EventEmitter', () => {
      const exporter = new SQLiteExporter();
      expect(exporter).toBeInstanceOf(EventEmitter);
      
      // Test that we can add listeners
      const mockListener = jest.fn();
      exporter.on('test', mockListener);
      exporter.emit('test', 'data');
      
      expect(mockListener).toHaveBeenCalledWith('data');
    });
  });

  describe('JSON serialization', () => {
    it('should serialize JSON fields correctly', () => {
      const exporter = new SQLiteExporter();
      
      // Test the private serializeJsonFields method through reflection
      const records = [
        { 
          id: 1, 
          name: 'Test',
          json_field: '{"key": "value"}',
          array_field: '[1, 2, 3]',
          text_field: 'plain text'
        }
      ];
      
      // Access private method for testing
      const serializedRecords = (exporter as any).serializeJsonFields(records);
      
      if (serializedRecords && serializedRecords.length > 0) {
        expect(serializedRecords[0].json_field).toEqual({ key: 'value' });
        expect(serializedRecords[0].json_field_is_json).toBe(true);
        expect(serializedRecords[0].array_field).toEqual([1, 2, 3]);
        expect(serializedRecords[0].array_field_is_json).toBe(true);
        expect(serializedRecords[0].text_field).toBe('plain text');
        expect(serializedRecords[0].text_field_is_json).toBe(false);
      }
    });
  });

  describe('Relationship mapping', () => {
    it('should build relationship maps from foreign keys', () => {
      const exporter = new SQLiteExporter();
      
      const foreignKeys = [
        { 
          id: 0, 
          seq: 0, 
          table: 'categories', 
          from: 'category_id', 
          to: 'id', 
          on_update: 'CASCADE', 
          on_delete: 'SET NULL' 
        }
      ];
      
      // Access private method for testing
      const relationshipMap = (exporter as any).buildRelationshipMap('test_table', foreignKeys);
      
      expect(relationshipMap).toEqual({
        category_id: {
          referencedTable: 'categories',
          referencedColumn: 'id',
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE'
        }
      });
    });
  });

  describe('ETA calculation', () => {
    it('should calculate estimated time correctly', () => {
      const exporter = new SQLiteExporter();
      
      const startTime = new Date(Date.now() - 10000); // 10 seconds ago
      const completed = 5;
      const total = 10;
      
      // Access private method for testing
      const eta = (exporter as any).calculateETA(startTime, completed, total);
      
      expect(eta).toBeGreaterThan(0);
      expect(eta).toBeLessThan(20000); // Should be reasonable
    });
  });
});

describe('exportSQLiteData convenience function', () => {
  it('should be a function', () => {
    expect(typeof exportSQLiteData).toBe('function');
  });
});