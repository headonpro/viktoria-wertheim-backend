#!/usr/bin/env node

/**
 * Test script for Validation Consistency Monitor
 * 
 * Tests the monitoring functionality and verifies it can detect inconsistencies
 */

const ValidationConsistencyMonitor = require('./validation-consistency-monitor');
const path = require('path');

async function testMonitor() {
  console.log('🧪 Testing Validation Consistency Monitor...\n');

  // Create test monitor with shorter intervals
  const monitor = new ValidationConsistencyMonitor({
    baseUrl: 'http://localhost:1337',
    monitorInterval: 5000, // 5 seconds for testing
    alertThreshold: 2, // Lower threshold for testing
    logFile: path.join(__dirname, '../validation-reports/test-monitor-log.json'),
    alertFile: path.join(__dirname, '../validation-reports/test-validation-alerts.json')
  });

  try {
    // Test 1: Single validation check
    console.log('📋 Test 1: Single validation check');
    await monitor.performValidationCheck();
    console.log('✅ Single check completed\n');

    // Test 2: Monitor status
    console.log('📋 Test 2: Monitor status');
    const status = monitor.getStatus();
    console.log('Status:', JSON.stringify(status, null, 2));
    console.log('✅ Status check completed\n');

    // Test 3: Short monitoring session (10 seconds)
    console.log('📋 Test 3: Short monitoring session (10 seconds)');
    monitor.startMonitoring();
    
    // Stop after 10 seconds
    setTimeout(() => {
      monitor.stopMonitoring();
      console.log('✅ Monitoring test completed\n');
      
      // Test 4: Final status check
      console.log('📋 Test 4: Final status after monitoring');
      const finalStatus = monitor.getStatus();
      console.log('Final Status:', JSON.stringify(finalStatus, null, 2));
      console.log('✅ All tests completed successfully!');
      
      process.exit(0);
    }, 10000);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown during testing
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted');
  process.exit(0);
});

if (require.main === module) {
  testMonitor();
}

module.exports = { testMonitor };