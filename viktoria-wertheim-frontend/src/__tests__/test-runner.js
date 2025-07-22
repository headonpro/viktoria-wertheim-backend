/**
 * Test Runner for Integration Tests
 * 
 * This script runs all integration tests and provides a summary report
 */

const { execSync } = require('child_process')
const path = require('path')

console.log('🚀 Starting Integration Test Suite for Team Management System')
console.log('=' .repeat(60))

const testSuites = [
  {
    name: 'End-to-End Component Integration',
    pattern: 'team-management-integration.test.tsx',
    description: 'Tests complete user flow and component interactions'
  },
  {
    name: 'API Integration Validation',
    pattern: 'api-integration.test.ts',
    description: 'Tests API endpoints and data transformation'
  },
  {
    name: 'Performance and UX Testing',
    pattern: 'performance-ux.test.tsx',
    description: 'Tests performance metrics and user experience'
  }
]

async function runTestSuite(suite) {
  console.log(`\n📋 Running: ${suite.name}`)
  console.log(`   ${suite.description}`)
  console.log('-'.repeat(50))
  
  try {
    const command = `npx jest --testPathPattern=${suite.pattern} --verbose --no-cache`
    const output = execSync(command, { 
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe'
    })
    
    console.log('✅ PASSED')
    return { suite: suite.name, status: 'PASSED', output }
  } catch (error) {
    console.log('❌ FAILED')
    console.log(error.stdout || error.message)
    return { suite: suite.name, status: 'FAILED', error: error.stdout || error.message }
  }
}

async function runAllTests() {
  const results = []
  
  for (const suite of testSuites) {
    const result = await runTestSuite(suite)
    results.push(result)
  }
  
  // Summary Report
  console.log('\n' + '='.repeat(60))
  console.log('📊 INTEGRATION TEST SUMMARY')
  console.log('='.repeat(60))
  
  const passed = results.filter(r => r.status === 'PASSED').length
  const failed = results.filter(r => r.status === 'FAILED').length
  
  results.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : '❌'
    console.log(`${icon} ${result.suite}: ${result.status}`)
  })
  
  console.log(`\n📈 Results: ${passed} passed, ${failed} failed`)
  
  if (failed > 0) {
    console.log('\n❗ Failed Tests Details:')
    results.filter(r => r.status === 'FAILED').forEach(result => {
      console.log(`\n🔍 ${result.suite}:`)
      console.log(result.error)
    })
    process.exit(1)
  } else {
    console.log('\n🎉 All integration tests passed!')
    process.exit(0)
  }
}

// Run if called directly
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('Test runner failed:', error)
    process.exit(1)
  })
}

module.exports = { runAllTests, runTestSuite }

// Add a simple test to satisfy Jest
describe('Test Runner', () => {
  test('should export required functions', () => {
    expect(typeof runAllTests).toBe('function')
    expect(typeof runTestSuite).toBe('function')
  })
})