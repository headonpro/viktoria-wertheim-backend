#!/usr/bin/env node

/**
 * Test script for comprehensive data analysis
 */

const DataConsistencyAnalyzer = require('./comprehensive-data-analysis');

async function runTests() {
  console.log('🧪 Testing comprehensive data analysis...\n');
  
  const analyzer = new DataConsistencyAnalyzer();
  const issues = await analyzer.analyze();
  
  // Test assertions
  const tests = [
    {
      name: 'Should find team/mannschaft duplication',
      test: () => issues.duplicateSchemas.some(d => d.group === 'Team/Mannschaft Duplication'),
      expected: true
    },
    {
      name: 'Should find orphaned directories',
      test: () => issues.orphanedDirectories.length > 0,
      expected: true
    },
    {
      name: 'Should find inconsistent mappings',
      test: () => issues.inconsistentMappings.length > 0,
      expected: true
    },
    {
      name: 'Should identify spiel schema with dual relations',
      test: () => issues.inconsistentMappings.some(m => 
        m.schema === 'api::spiel.spiel' && 
        m.relations.some(r => r.targetSchema === 'api::team.team') &&
        m.relations.some(r => r.targetSchema === 'api::mannschaft.mannschaft')
      ),
      expected: true
    },
    {
      name: 'Should identify spieler schema with dual relations',
      test: () => issues.inconsistentMappings.some(m => 
        m.schema === 'api::spieler.spieler' && 
        m.relations.some(r => r.targetSchema === 'api::team.team') &&
        m.relations.some(r => r.targetSchema === 'api::mannschaft.mannschaft')
      ),
      expected: true
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = test.test();
      if (result === test.expected) {
        console.log(`✅ ${test.name}`);
        passed++;
      } else {
        console.log(`❌ ${test.name} - Expected: ${test.expected}, Got: ${result}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} - Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
    return true;
  } else {
    console.log('⚠️  Some tests failed!');
    return false;
  }
}

if (require.main === module) {
  runTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = runTests;