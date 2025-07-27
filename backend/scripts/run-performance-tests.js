#!/usr/bin/env node

/**
 * Performance test runner script
 * Runs performance tests with appropriate configuration and reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PERFORMANCE_TEST_CONFIG = {
  testTimeout: 30000, // 30 seconds for performance tests
  maxWorkers: 1, // Run performance tests sequentially
  verbose: true,
  detectOpenHandles: true,
  forceExit: true
};

function runPerformanceTests() {
  console.log('🚀 Starting Hook Performance Tests...\n');

  const testCommand = [
    'npx jest',
    '--config', 'jest.config.js',
    '--testPathPattern=tests/performance',
    '--runInBand', // Run tests serially for accurate performance measurement
    '--verbose',
    '--detectOpenHandles',
    '--forceExit',
    `--testTimeout=${PERFORMANCE_TEST_CONFIG.testTimeout}`,
    '--no-cache'
  ].join(' ');

  try {
    // Set environment variables for performance testing
    process.env.NODE_ENV = 'test';
    process.env.PERFORMANCE_TEST = 'true';
    
    // Enable garbage collection for memory tests
    process.env.NODE_OPTIONS = '--expose-gc';

    console.log('Running command:', testCommand);
    console.log('Environment: NODE_ENV=test, PERFORMANCE_TEST=true\n');

    const result = execSync(testCommand, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env
    });

    console.log('\n✅ Performance tests completed successfully!');
    
    // Generate performance report
    generatePerformanceReport();
    
  } catch (error) {
    console.error('\n❌ Performance tests failed:');
    console.error(error.message);
    process.exit(1);
  }
}

function generatePerformanceReport() {
  const reportPath = path.join(__dirname, '..', 'performance-test-report.md');
  
  const report = `# Hook Performance Test Report

Generated: ${new Date().toISOString()}

## Test Configuration
- Test Timeout: ${PERFORMANCE_TEST_CONFIG.testTimeout}ms
- Max Workers: ${PERFORMANCE_TEST_CONFIG.maxWorkers}
- Node Environment: ${process.env.NODE_ENV}

## Performance Thresholds
- Hook Execution Time: < 100ms
- Concurrent Operations: 20+ operations within 1 second
- Memory Usage: < 50MB increase for 100 operations
- Database Queries: ≤ 5 queries per hook execution

## Test Categories
1. **Hook Execution Time Tests**
   - Individual hook performance
   - Complex validation performance
   - Timeout handling

2. **Concurrent Execution Tests**
   - Multiple hook executions
   - Mixed service operations
   - High concurrency scenarios

3. **Background Job Load Tests**
   - Job queue performance
   - Concurrent job execution
   - System overload recovery

4. **Memory and Resource Tests**
   - Memory leak detection
   - Large data object handling
   - Resource scaling

## Notes
- Tests run with garbage collection enabled
- Performance measurements use high-resolution timers
- Database operations are mocked for consistent results
- Tests are run sequentially to avoid interference

For detailed results, check the Jest output above.
`;

  fs.writeFileSync(reportPath, report);
  console.log(`📊 Performance report generated: ${reportPath}`);
}

function checkPrerequisites() {
  // Check if Jest is available
  try {
    execSync('npx jest --version', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Jest is not available. Please install dependencies first.');
    process.exit(1);
  }

  // Check if performance test files exist
  const performanceTestDir = path.join(__dirname, '..', 'tests', 'performance');
  if (!fs.existsSync(performanceTestDir)) {
    console.error('❌ Performance test directory not found:', performanceTestDir);
    process.exit(1);
  }

  const testFiles = fs.readdirSync(performanceTestDir).filter(file => file.endsWith('.test.ts'));
  if (testFiles.length === 0) {
    console.error('❌ No performance test files found in:', performanceTestDir);
    process.exit(1);
  }

  console.log(`✅ Found ${testFiles.length} performance test files`);
  testFiles.forEach(file => console.log(`   - ${file}`));
  console.log('');
}

function main() {
  console.log('Hook Lifecycle Performance Test Runner');
  console.log('=====================================\n');

  checkPrerequisites();
  runPerformanceTests();
}

if (require.main === module) {
  main();
}

module.exports = {
  runPerformanceTests,
  generatePerformanceReport
};