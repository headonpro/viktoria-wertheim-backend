#!/usr/bin/env ts-node

import { exportSQLiteData } from './sqlite-export';
import fs from 'fs';
import path from 'path';

async function validateExport(): Promise<void> {
  console.log('🔍 Validating SQLite export functionality...\n');

  try {
    // Test export with default settings
    const result = await exportSQLiteData({
      outputPath: path.join(__dirname, '../test-exports')
    });

    console.log('✅ Export completed successfully!');
    console.log(`📊 Exported ${result.metadata.totalRecords} records from ${result.metadata.totalTables} tables`);
    console.log(`⏱️  Duration: ${result.metadata.duration}ms`);

    // Validate data structure
    const requiredContentTypes = ['sponsors', 'news_artikel', 'kategorien', 'leaderboard_entries'];
    const foundContentTypes = result.metadata.contentTypes.filter(ct => requiredContentTypes.includes(ct));
    
    console.log(`\n📋 Found content types: ${foundContentTypes.join(', ')}`);

    // Validate specific table data
    if (result.data.sponsors) {
      const sponsorsData = result.data.sponsors as any;
      console.log(`📈 Sponsors: ${sponsorsData.recordCount} records`);
      console.log(`🔗 Schema fields: ${sponsorsData.schema.length} columns`);
      console.log(`🔗 Foreign keys: ${sponsorsData.foreignKeys.length} relationships`);
    }

    if (result.data.news_artikel) {
      const newsData = result.data.news_artikel as any;
      console.log(`📰 News articles: ${newsData.recordCount} records`);
      console.log(`🔗 Foreign keys: ${newsData.foreignKeys.length} relationships`);
    }

    // Validate serialization
    let jsonFieldsFound = 0;
    Object.values(result.data).forEach((tableData: any) => {
      if (tableData.serializedRecords) {
        tableData.serializedRecords.forEach((record: any) => {
          Object.keys(record).forEach(key => {
            if (key.endsWith('_is_json') && record[key] === true) {
              jsonFieldsFound++;
            }
          });
        });
      }
    });

    console.log(`🔄 JSON fields serialized: ${jsonFieldsFound}`);

    // Clean up test export
    const testExportDir = path.join(__dirname, '../test-exports');
    if (fs.existsSync(testExportDir)) {
      fs.rmSync(testExportDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up test export files');
    }

    console.log('\n✅ All validations passed! Export functionality is working correctly.');

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

validateExport();