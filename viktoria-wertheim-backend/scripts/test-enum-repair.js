#!/usr/bin/env node

/**
 * Test Database Enum Repair Script
 * 
 * This is a test version that runs automatically in dry-run mode
 * to verify the repair functionality works correctly.
 */

const { DatabaseEnumRepairer } = require('./database-enum-repair.js');

class TestDatabaseEnumRepairer extends DatabaseEnumRepairer {
  constructor() {
    super();
    this.repairResults.dryRun = true; // Force dry-run mode
  }

  async confirmRepair() {
    console.log('\n🧪 TEST MODE: Running automated dry-run repair test...');
    return true; // Auto-confirm for testing
  }

  async askQuestion(question) {
    // Auto-answer questions for testing
    if (question.includes('proceed')) return 'yes';
    if (question.includes('dry-run')) return 'yes';
    return 'yes';
  }
}

async function testRepair() {
  const repairer = new TestDatabaseEnumRepairer();

  try {
    console.log('🧪 Testing Database Enum Repair Script...');
    
    await repairer.connect();
    await repairer.executeRepairs();
    await repairer.generateReport();
    await repairer.printConsoleSummary();
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  } finally {
    await repairer.disconnect();
  }
}

testRepair().catch(console.error);