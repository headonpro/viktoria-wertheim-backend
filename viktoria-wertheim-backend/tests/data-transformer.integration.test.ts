import {
  DataTransformer,
  transformData,
  DataTypeConverter,
  RelationshipMapper
} from '../scripts/data-transformer';

describe('DataTransformer Integration Tests', () => {
  describe('Real Strapi Content Types Transformation', () => {
    it('should transform sponsors data correctly', async () => {
      const exportedData = {
        data: {
          sponsors: {
            data: [
              {
                id: 1,
                name: 'Test Sponsor',
                logo: '{"id": 1, "url": "/uploads/logo.png"}',
                website_url: 'https://example.com',
                beschreibung: 'Test description',
                kategorie: 'premium',
                reihenfolge: 1,
                aktiv: 1,
                created_at: '2023-01-01T10:00:00.000Z',
                updated_at: '2023-01-01T10:00:00.000Z',
                published_at: '2023-01-01T10:00:00.000Z'
              },
              {
                id: 2,
                name: 'Another Sponsor',
                logo: null,
                website_url: null,
                beschreibung: null,
                kategorie: 'standard',
                reihenfolge: 2,
                aktiv: 0,
                created_at: '2023-01-02T10:00:00.000Z',
                updated_at: '2023-01-02T10:00:00.000Z',
                published_at: null
              }
            ],
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'name', type: 'TEXT' },
              { name: 'logo', type: 'JSON' },
              { name: 'website_url', type: 'TEXT' },
              { name: 'beschreibung', type: 'TEXT' },
              { name: 'kategorie', type: 'TEXT' },
              { name: 'reihenfolge', type: 'INTEGER' },
              { name: 'aktiv', type: 'BOOLEAN' },
              { name: 'created_at', type: 'DATETIME' },
              { name: 'updated_at', type: 'DATETIME' },
              { name: 'published_at', type: 'DATETIME' }
            ],
            foreignKeys: []
          }
        }
      };

      const result = await transformData(exportedData, { validateData: true });

      expect(result.success).toBe(true);
      expect(result.transformedData.sponsors).toHaveLength(2);

      const firstSponsor = result.transformedData.sponsors[0];
      expect(firstSponsor.id).toBe(1);
      expect(firstSponsor.name).toBe('Test Sponsor');
      expect(firstSponsor.logo).toEqual({ id: 1, url: '/uploads/logo.png' });
      expect(firstSponsor.aktiv).toBe(true);
      expect(typeof firstSponsor.created_at).toBe('string');

      const secondSponsor = result.transformedData.sponsors[1];
      expect(secondSponsor.aktiv).toBe(false);
      expect(secondSponsor.logo).toBeNull();
      expect(secondSponsor.published_at).toBeNull();
    });

    it('should transform news articles with relationships', async () => {
      const exportedData = {
        data: {
          kategorien: {
            data: [
              {
                id: 1,
                name: 'Erste Mannschaft',
                beschreibung: 'News der ersten Mannschaft',
                created_at: '2023-01-01T10:00:00.000Z',
                updated_at: '2023-01-01T10:00:00.000Z'
              }
            ],
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'name', type: 'TEXT' },
              { name: 'beschreibung', type: 'TEXT' },
              { name: 'created_at', type: 'DATETIME' },
              { name: 'updated_at', type: 'DATETIME' }
            ],
            foreignKeys: []
          },
          news_artikels: {
            data: [
              {
                id: 1,
                titel: 'Großer Sieg gegen Rivalen',
                inhalt: 'Ein spannender Bericht über das gestrige Spiel...',
                kategorie_id: 1,
                autor: 'Max Mustermann',
                featured_image: '{"id": 2, "url": "/uploads/news1.jpg"}',
                published: 1,
                created_at: '2023-01-01T12:00:00.000Z',
                updated_at: '2023-01-01T12:00:00.000Z',
                published_at: '2023-01-01T12:00:00.000Z'
              },
              {
                id: 2,
                titel: 'Training diese Woche',
                inhalt: 'Trainingszeiten für die kommende Woche...',
                kategorie_id: 1,
                autor: 'Anna Schmidt',
                featured_image: null,
                published: 0,
                created_at: '2023-01-02T12:00:00.000Z',
                updated_at: '2023-01-02T12:00:00.000Z',
                published_at: null
              }
            ],
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'titel', type: 'TEXT' },
              { name: 'inhalt', type: 'TEXT' },
              { name: 'kategorie_id', type: 'INTEGER' },
              { name: 'autor', type: 'TEXT' },
              { name: 'featured_image', type: 'JSON' },
              { name: 'published', type: 'BOOLEAN' },
              { name: 'created_at', type: 'DATETIME' },
              { name: 'updated_at', type: 'DATETIME' },
              { name: 'published_at', type: 'DATETIME' }
            ],
            foreignKeys: [
              { from: 'kategorie_id', table: 'kategorien', to: 'id', on_delete: 'SET NULL' }
            ]
          }
        }
      };

      const result = await transformData(exportedData, { validateData: true });

      expect(result.success).toBe(true);
      expect(result.transformedData.kategorien).toHaveLength(1);
      expect(result.transformedData.news_artikels).toHaveLength(2);

      const firstArticle = result.transformedData.news_artikels[0];
      expect(firstArticle.titel).toBe('Großer Sieg gegen Rivalen');
      expect(firstArticle.kategorie_id).toBe(1);
      expect(firstArticle.featured_image).toEqual({ id: 2, url: '/uploads/news1.jpg' });
      expect(firstArticle.published).toBe(true);

      const secondArticle = result.transformedData.news_artikels[1];
      expect(secondArticle.published).toBe(false);
      expect(secondArticle.featured_image).toBeNull();
      expect(secondArticle.published_at).toBeNull();

      // Should have no validation errors for valid relationships
      expect(result.metadata.validationErrors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('should detect and report relationship validation errors', async () => {
      const exportedData = {
        data: {
          kategorien: {
            data: [
              { id: 1, name: 'Erste Mannschaft' }
            ],
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'name', type: 'TEXT' }
            ],
            foreignKeys: []
          },
          news_artikels: {
            data: [
              {
                id: 1,
                titel: 'Test Article',
                kategorie_id: 999 // Invalid reference
              }
            ],
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'titel', type: 'TEXT' },
              { name: 'kategorie_id', type: 'INTEGER' }
            ],
            foreignKeys: [
              { from: 'kategorie_id', table: 'kategorien', to: 'id', on_delete: 'SET NULL' }
            ]
          }
        }
      };

      const result = await transformData(exportedData, { validateData: true });

      expect(result.success).toBe(false); // Should fail due to validation errors
      
      const relationshipErrors = result.metadata.validationErrors.filter(
        e => e.severity === 'error' && e.error.includes('Referenced record')
      );
      
      expect(relationshipErrors).toHaveLength(1);
      expect(relationshipErrors[0].table).toBe('news_artikels');
      expect(relationshipErrors[0].field).toBe('kategorie_id');
    });

    it('should transform team and player data with complex relationships', async () => {
      const exportedData = {
        data: {
          mannschafts: {
            data: [
              {
                id: 1,
                name: 'Erste Mannschaft',
                liga: 'Kreisliga A',
                trainer: 'Hans Müller',
                gruendungsjahr: 1985,
                aktiv: 1,
                created_at: '2023-01-01T10:00:00.000Z',
                updated_at: '2023-01-01T10:00:00.000Z'
              },
              {
                id: 2,
                name: 'Zweite Mannschaft',
                liga: 'Kreisliga B',
                trainer: 'Peter Schmidt',
                gruendungsjahr: 1990,
                aktiv: 1,
                created_at: '2023-01-01T10:00:00.000Z',
                updated_at: '2023-01-01T10:00:00.000Z'
              }
            ],
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'name', type: 'TEXT' },
              { name: 'liga', type: 'TEXT' },
              { name: 'trainer', type: 'TEXT' },
              { name: 'gruendungsjahr', type: 'INTEGER' },
              { name: 'aktiv', type: 'BOOLEAN' },
              { name: 'created_at', type: 'DATETIME' },
              { name: 'updated_at', type: 'DATETIME' }
            ],
            foreignKeys: []
          },
          spielers: {
            data: [
              {
                id: 1,
                vorname: 'Max',
                nachname: 'Mustermann',
                geburtsdatum: '1995-05-15',
                position: 'Stürmer',
                rueckennummer: 9,
                mannschaft_id: 1,
                aktiv: 1,
                created_at: '2023-01-01T10:00:00.000Z',
                updated_at: '2023-01-01T10:00:00.000Z'
              },
              {
                id: 2,
                vorname: 'Anna',
                nachname: 'Schmidt',
                geburtsdatum: '1992-08-22',
                position: 'Torwart',
                rueckennummer: 1,
                mannschaft_id: 2,
                aktiv: 1,
                created_at: '2023-01-01T10:00:00.000Z',
                updated_at: '2023-01-01T10:00:00.000Z'
              }
            ],
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'vorname', type: 'TEXT' },
              { name: 'nachname', type: 'TEXT' },
              { name: 'geburtsdatum', type: 'DATETIME' },
              { name: 'position', type: 'TEXT' },
              { name: 'rueckennummer', type: 'INTEGER' },
              { name: 'mannschaft_id', type: 'INTEGER' },
              { name: 'aktiv', type: 'BOOLEAN' },
              { name: 'created_at', type: 'DATETIME' },
              { name: 'updated_at', type: 'DATETIME' }
            ],
            foreignKeys: [
              { from: 'mannschaft_id', table: 'mannschafts', to: 'id', on_delete: 'CASCADE' }
            ]
          }
        }
      };

      const result = await transformData(exportedData, { validateData: true });

      expect(result.success).toBe(true);
      expect(result.transformedData.mannschafts).toHaveLength(2);
      expect(result.transformedData.spielers).toHaveLength(2);

      const firstTeam = result.transformedData.mannschafts[0];
      expect(firstTeam.name).toBe('Erste Mannschaft');
      expect(firstTeam.gruendungsjahr).toBe(1985);
      expect(firstTeam.aktiv).toBe(true);

      const firstPlayer = result.transformedData.spielers[0];
      expect(firstPlayer.vorname).toBe('Max');
      expect(firstPlayer.nachname).toBe('Mustermann');
      expect(firstPlayer.rueckennummer).toBe(9);
      expect(firstPlayer.mannschaft_id).toBe(1);
      expect(firstPlayer.aktiv).toBe(true);
      expect(typeof firstPlayer.geburtsdatum).toBe('string');

      // Validate relationships
      expect(result.metadata.validationErrors.filter(e => e.severity === 'error')).toHaveLength(0);
    });

    it('should handle leaderboard data with numeric statistics', async () => {
      const exportedData = {
        data: {
          leaderboard_entries: {
            data: [
              {
                id: 1,
                spieler_name: 'Max Mustermann',
                tore: 15,
                assists: 8,
                spiele: 22,
                gelbe_karten: 3,
                rote_karten: 0,
                punkte: 23.5,
                saison: '2023/24',
                aktiv: 1,
                created_at: '2023-01-01T10:00:00.000Z',
                updated_at: '2023-01-01T10:00:00.000Z'
              },
              {
                id: 2,
                spieler_name: 'Anna Schmidt',
                tore: 0,
                assists: 12,
                spiele: 20,
                gelbe_karten: 1,
                rote_karten: 0,
                punkte: 12.0,
                saison: '2023/24',
                aktiv: 1,
                created_at: '2023-01-01T10:00:00.000Z',
                updated_at: '2023-01-01T10:00:00.000Z'
              }
            ],
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'spieler_name', type: 'TEXT' },
              { name: 'tore', type: 'INTEGER' },
              { name: 'assists', type: 'INTEGER' },
              { name: 'spiele', type: 'INTEGER' },
              { name: 'gelbe_karten', type: 'INTEGER' },
              { name: 'rote_karten', type: 'INTEGER' },
              { name: 'punkte', type: 'REAL' },
              { name: 'saison', type: 'TEXT' },
              { name: 'aktiv', type: 'BOOLEAN' },
              { name: 'created_at', type: 'DATETIME' },
              { name: 'updated_at', type: 'DATETIME' }
            ],
            foreignKeys: []
          }
        }
      };

      const result = await transformData(exportedData, { validateData: true });

      expect(result.success).toBe(true);
      expect(result.transformedData.leaderboard_entries).toHaveLength(2);

      const firstEntry = result.transformedData.leaderboard_entries[0];
      expect(firstEntry.spieler_name).toBe('Max Mustermann');
      expect(firstEntry.tore).toBe(15);
      expect(firstEntry.assists).toBe(8);
      expect(firstEntry.punkte).toBe(23.5);
      expect(firstEntry.aktiv).toBe(true);

      const secondEntry = result.transformedData.leaderboard_entries[1];
      expect(secondEntry.tore).toBe(0);
      expect(secondEntry.punkte).toBe(12.0);
    });
  });

  describe('Performance and Progress Tracking', () => {
    it('should handle large datasets efficiently', async () => {
      // Create a large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        active: i % 2 === 0 ? 1 : 0,
        created_at: new Date(2023, 0, 1 + (i % 365)).toISOString()
      }));

      const exportedData = {
        data: {
          users: {
            data: largeDataset,
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'name', type: 'TEXT' },
              { name: 'email', type: 'TEXT' },
              { name: 'active', type: 'BOOLEAN' },
              { name: 'created_at', type: 'DATETIME' }
            ],
            foreignKeys: []
          }
        }
      };

      const startTime = Date.now();
      const progressEvents: any[] = [];

      const transformer = new DataTransformer({
        batchSize: 100,
        onProgress: (progress) => {
          progressEvents.push(progress);
        }
      });

      const result = await transformer.transform(exportedData);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.transformedData.users).toHaveLength(1000);
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify data integrity
      const transformedUsers = result.transformedData.users;
      expect(transformedUsers[0].active).toBe(true);
      expect(transformedUsers[1].active).toBe(false);
      expect(typeof transformedUsers[0].created_at).toBe('string');
    });

    it('should track progress accurately', async () => {
      const exportedData = {
        data: {
          table1: {
            data: Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` })),
            schema: [{ name: 'id', type: 'INTEGER' }, { name: 'name', type: 'TEXT' }],
            foreignKeys: []
          },
          table2: {
            data: Array.from({ length: 30 }, (_, i) => ({ id: i + 1, value: i * 2 })),
            schema: [{ name: 'id', type: 'INTEGER' }, { name: 'value', type: 'INTEGER' }],
            foreignKeys: []
          }
        }
      };

      const progressEvents: any[] = [];
      const transformer = new DataTransformer({
        batchSize: 10,
        onProgress: (progress) => {
          progressEvents.push(progress);
        }
      });

      const result = await transformer.transform(exportedData);

      expect(result.success).toBe(true);
      expect(progressEvents.length).toBeGreaterThan(0);

      // Check that progress tracking is accurate
      const lastProgress = progressEvents[progressEvents.length - 1];
      expect(lastProgress.totalRecords).toBe(80); // 50 + 30
      expect(lastProgress.processedRecords).toBeLessThanOrEqual(80);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle malformed JSON gracefully', async () => {
      const exportedData = {
        data: {
          test_table: {
            data: [
              {
                id: 1,
                valid_json: '{"key": "value"}',
                invalid_json: '{"key": invalid}', // Malformed JSON
                name: 'Test'
              }
            ],
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'valid_json', type: 'JSON' },
              { name: 'invalid_json', type: 'JSON' },
              { name: 'name', type: 'TEXT' }
            ],
            foreignKeys: []
          }
        }
      };

      const result = await transformData(exportedData, { validateData: true });

      expect(result.success).toBe(true);
      expect(result.transformedData.test_table).toHaveLength(1);

      const record = result.transformedData.test_table[0];
      expect(record.valid_json).toEqual({ key: 'value' });
      expect(record.invalid_json).toBe('{"key": invalid}'); // Should remain as string
    });

    it('should continue processing after individual record errors', async () => {
      const exportedData = {
        data: {
          mixed_table: {
            data: [
              { id: 1, name: 'Valid Record', number: 123 },
              { id: 'invalid', name: 'Invalid ID', number: 456 }, // Invalid ID type
              { id: 3, name: 'Another Valid Record', number: 789 }
            ],
            schema: [
              { name: 'id', type: 'INTEGER' },
              { name: 'name', type: 'TEXT' },
              { name: 'number', type: 'INTEGER' }
            ],
            foreignKeys: []
          }
        }
      };

      // This should handle the error gracefully and continue processing
      const result = await transformData(exportedData, { validateData: false });

      // The transformation should attempt to process all records
      expect(result.transformedData.mixed_table).toBeDefined();
    });
  });
});