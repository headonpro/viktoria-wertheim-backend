/**
 * API Performance Testing Script
 * 
 * Tests API response times for mannschaft filtering to ensure
 * performance is not negatively impacted by the new filtering functionality.
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:1337';

// Performance test configuration
const TEST_CONFIG = {
  iterations: 10,
  timeout: 5000,
  endpoints: [
    {
      name: 'Game Cards - No Filter',
      url: `${API_BASE_URL}/api/game-cards`,
      description: 'Baseline performance without filtering'
    },
    {
      name: 'Game Cards - Team 1 Filter',
      url: `${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=m1`,
      description: 'Performance with mannschaft filter for team 1'
    },
    {
      name: 'Game Cards - Team 2 Filter',
      url: `${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=m2`,
      description: 'Performance with mannschaft filter for team 2'
    },
    {
      name: 'Game Cards - Team 3 Filter',
      url: `${API_BASE_URL}/api/game-cards?filters[mannschaft][$eq]=m3`,
      description: 'Performance with mannschaft filter for team 3'
    },
    {
      name: 'Next Game Cards - No Filter',
      url: `${API_BASE_URL}/api/next-game-cards?populate=gegner_team`,
      description: 'Baseline performance for next games without filtering'
    },
    {
      name: 'Next Game Cards - Team 1 Filter',
      url: `${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=m1&populate=gegner_team`,
      description: 'Performance with mannschaft filter for next games team 1'
    },
    {
      name: 'Next Game Cards - Team 2 Filter',
      url: `${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=m2&populate=gegner_team`,
      description: 'Performance with mannschaft filter for next games team 2'
    },
    {
      name: 'Next Game Cards - Team 3 Filter',
      url: `${API_BASE_URL}/api/next-game-cards?filters[mannschaft][$eq]=m3&populate=gegner_team`,
      description: 'Performance with mannschaft filter for next games team 3'
    }
  ]
};

/**
 * Measure API response time for a single request
 */
const measureResponseTime = async (url) => {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(url, {
      timeout: TEST_CONFIG.timeout
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      success: true,
      responseTime,
      statusCode: response.status,
      dataLength: response.data?.data?.length || 0
    };
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      success: false,
      responseTime,
      error: error.message,
      statusCode: error.response?.status || 0
    };
  }
};

/**
 * Run performance test for a single endpoint
 */
const testEndpoint = async (endpoint) => {
  console.log(`\n🧪 Testing: ${endpoint.name}`);
  console.log(`📝 Description: ${endpoint.description}`);
  console.log(`🔗 URL: ${endpoint.url}`);
  
  const results = [];
  
  for (let i = 0; i < TEST_CONFIG.iterations; i++) {
    process.stdout.write(`  Iteration ${i + 1}/${TEST_CONFIG.iterations}... `);
    
    const result = await measureResponseTime(endpoint.url);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.responseTime}ms (${result.dataLength} items)`);
    } else {
      console.log(`❌ ${result.responseTime}ms (Error: ${result.error})`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Calculate statistics
  const successfulResults = results.filter(r => r.success);
  const responseTimes = successfulResults.map(r => r.responseTime);
  
  if (responseTimes.length === 0) {
    console.log('❌ All requests failed');
    return {
      endpoint: endpoint.name,
      success: false,
      stats: null
    };
  }
  
  const stats = {
    successRate: (successfulResults.length / results.length) * 100,
    avgResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
    minResponseTime: Math.min(...responseTimes),
    maxResponseTime: Math.max(...responseTimes),
    medianResponseTime: responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)],
    totalRequests: results.length,
    successfulRequests: successfulResults.length
  };
  
  console.log(`📊 Results:`);
  console.log(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
  console.log(`  Average: ${stats.avgResponseTime.toFixed(1)}ms`);
  console.log(`  Median: ${stats.medianResponseTime}ms`);
  console.log(`  Min: ${stats.minResponseTime}ms`);
  console.log(`  Max: ${stats.maxResponseTime}ms`);
  
  return {
    endpoint: endpoint.name,
    success: true,
    stats
  };
};

/**
 * Run all performance tests
 */
const runPerformanceTests = async () => {
  console.log('🚀 Starting API Performance Tests');
  console.log(`📋 Configuration:`);
  console.log(`  - Iterations per endpoint: ${TEST_CONFIG.iterations}`);
  console.log(`  - Timeout: ${TEST_CONFIG.timeout}ms`);
  console.log(`  - Base URL: ${API_BASE_URL}`);
  
  const allResults = [];
  
  for (const endpoint of TEST_CONFIG.endpoints) {
    const result = await testEndpoint(endpoint);
    allResults.push(result);
  }
  
  // Generate summary report
  console.log('\n📋 PERFORMANCE TEST SUMMARY');
  console.log('=' .repeat(60));
  
  const successfulTests = allResults.filter(r => r.success);
  
  if (successfulTests.length === 0) {
    console.log('❌ All tests failed');
    return;
  }
  
  // Compare filtered vs unfiltered performance
  const gameCardsBaseline = successfulTests.find(r => r.endpoint === 'Game Cards - No Filter');
  const nextGameCardsBaseline = successfulTests.find(r => r.endpoint === 'Next Game Cards - No Filter');
  
  const gameCardsFiltered = successfulTests.filter(r => 
    r.endpoint.includes('Game Cards') && r.endpoint.includes('Filter') && !r.endpoint.includes('Next')
  );
  
  const nextGameCardsFiltered = successfulTests.filter(r => 
    r.endpoint.includes('Next Game Cards') && r.endpoint.includes('Filter')
  );
  
  console.log('\n🎯 PERFORMANCE COMPARISON:');
  
  if (gameCardsBaseline && gameCardsFiltered.length > 0) {
    console.log('\n📊 Game Cards Performance:');
    console.log(`  Baseline (no filter): ${gameCardsBaseline.stats.avgResponseTime.toFixed(1)}ms`);
    
    gameCardsFiltered.forEach(test => {
      const diff = test.stats.avgResponseTime - gameCardsBaseline.stats.avgResponseTime;
      const diffPercent = (diff / gameCardsBaseline.stats.avgResponseTime) * 100;
      const status = Math.abs(diffPercent) < 10 ? '✅' : (diffPercent > 0 ? '⚠️' : '🚀');
      
      console.log(`  ${test.endpoint}: ${test.stats.avgResponseTime.toFixed(1)}ms (${diff > 0 ? '+' : ''}${diff.toFixed(1)}ms, ${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(1)}%) ${status}`);
    });
  }
  
  if (nextGameCardsBaseline && nextGameCardsFiltered.length > 0) {
    console.log('\n📊 Next Game Cards Performance:');
    console.log(`  Baseline (no filter): ${nextGameCardsBaseline.stats.avgResponseTime.toFixed(1)}ms`);
    
    nextGameCardsFiltered.forEach(test => {
      const diff = test.stats.avgResponseTime - nextGameCardsBaseline.stats.avgResponseTime;
      const diffPercent = (diff / nextGameCardsBaseline.stats.avgResponseTime) * 100;
      const status = Math.abs(diffPercent) < 10 ? '✅' : (diffPercent > 0 ? '⚠️' : '🚀');
      
      console.log(`  ${test.endpoint}: ${test.stats.avgResponseTime.toFixed(1)}ms (${diff > 0 ? '+' : ''}${diff.toFixed(1)}ms, ${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(1)}%) ${status}`);
    });
  }
  
  // Performance recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  const avgResponseTime = successfulTests.reduce((sum, test) => sum + test.stats.avgResponseTime, 0) / successfulTests.length;
  
  if (avgResponseTime < 100) {
    console.log('✅ Excellent performance - all endpoints respond under 100ms average');
  } else if (avgResponseTime < 300) {
    console.log('✅ Good performance - average response time under 300ms');
  } else if (avgResponseTime < 500) {
    console.log('⚠️  Acceptable performance - consider optimization if response times increase');
  } else {
    console.log('❌ Poor performance - optimization recommended');
  }
  
  // Check if filtering impacts performance significantly
  const hasSignificantImpact = successfulTests.some(test => {
    if (!test.endpoint.includes('Filter')) return false;
    
    const baselineType = test.endpoint.includes('Next') ? nextGameCardsBaseline : gameCardsBaseline;
    if (!baselineType) return false;
    
    const impact = ((test.stats.avgResponseTime - baselineType.stats.avgResponseTime) / baselineType.stats.avgResponseTime) * 100;
    return Math.abs(impact) > 20;
  });
  
  if (hasSignificantImpact) {
    console.log('⚠️  Filtering has significant performance impact (>20%) - consider database optimization');
  } else {
    console.log('✅ Filtering has minimal performance impact - implementation is efficient');
  }
  
  console.log('\n🎉 Performance testing completed!');
  
  return allResults;
};

// Export for use in other scripts
module.exports = { runPerformanceTests, measureResponseTime };

// Run directly if called from command line
if (require.main === module) {
  runPerformanceTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Performance test failed:', error);
      process.exit(1);
    });
}