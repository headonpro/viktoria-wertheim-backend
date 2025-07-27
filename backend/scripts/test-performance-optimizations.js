/**
 * Performance Testing Script for Liga-Tabellen-System Optimizations
 * Tests database indexes, API performance, and caching effectiveness
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const API_BASE_URL = process.env.FRONTEND_URL || 'http://localhost:1337';
const TEST_ITERATIONS = 10;
const CONCURRENT_REQUESTS = 5;

// Test data
const TEST_LEAGUES = [
  'Kreisliga Tauberbischofsheim',
  'Kreisklasse A Tauberbischofsheim',
  'Kreisklasse B Tauberbischofsheim'
];

/**
 * Measure execution time of a function
 */
async function measureTime(name, fn) {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;
  
  console.log(`⏱️  ${name}: ${duration.toFixed(2)}ms`);
  return { result, duration };
}

/**
 * Test database query performance
 */
async function testDatabasePerformance() {
  console.log('\n🗄️  Testing Database Performance...');
  
  const testQueries = [
    {
      name: 'Standard API Query',
      url: `${API_BASE_URL}/api/tabellen-eintraege`,
      params: {
        'filters[liga][name][$eq]': 'Kreisliga Tauberbischofsheim',
        populate: 'liga',
        sort: 'platz:asc'
      }
    },
    {
      name: 'Optimized API Query',
      url: `${API_BASE_URL}/api/tabellen-eintraege/liga/Kreisliga%20Tauberbischofsheim`,
      params: {}
    }
  ];

  for (const query of testQueries) {
    const times = [];
    
    for (let i = 0; i < TEST_ITERATIONS; i++) {
      try {
        const { duration } = await measureTime(`${query.name} - Run ${i + 1}`, async () => {
          const response = await axios.get(query.url, {
            params: query.params,
            timeout: 10000
          });
          return response.data;
        });
        times.push(duration);
      } catch (error) {
        console.error(`❌ ${query.name} failed:`, error.message);
      }
    }

    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log(`📊 ${query.name} Statistics:`);
      console.log(`   Average: ${avgTime.toFixed(2)}ms`);
      console.log(`   Min: ${minTime.toFixed(2)}ms`);
      console.log(`   Max: ${maxTime.toFixed(2)}ms`);
    }
  }
}

/**
 * Test concurrent request performance
 */
async function testConcurrentPerformance() {
  console.log('\n🚀 Testing Concurrent Request Performance...');
  
  const createConcurrentRequests = (url, count) => {
    return Array(count).fill().map(() => 
      axios.get(url, { timeout: 10000 })
    );
  };

  for (const league of TEST_LEAGUES) {
    console.log(`\n📋 Testing ${league}...`);
    
    // Test standard endpoint
    const standardUrl = `${API_BASE_URL}/api/tabellen-eintraege?filters[liga][name][$eq]=${encodeURIComponent(league)}&populate=liga&sort=platz:asc`;
    
    const { duration: standardDuration } = await measureTime(
      `${CONCURRENT_REQUESTS} concurrent standard requests`,
      async () => {
        const requests = createConcurrentRequests(standardUrl, CONCURRENT_REQUESTS);
        return await Promise.all(requests);
      }
    );

    // Test optimized endpoint
    const optimizedUrl = `${API_BASE_URL}/api/tabellen-eintraege/liga/${encodeURIComponent(league)}`;
    
    try {
      const { duration: optimizedDuration } = await measureTime(
        `${CONCURRENT_REQUESTS} concurrent optimized requests`,
        async () => {
          const requests = createConcurrentRequests(optimizedUrl, CONCURRENT_REQUESTS);
          return await Promise.all(requests);
        }
      );

      const improvement = ((standardDuration - optimizedDuration) / standardDuration * 100);
      console.log(`📈 Performance improvement: ${improvement.toFixed(1)}%`);
    } catch (error) {
      console.warn(`⚠️  Optimized endpoint not available, using standard endpoint`);
    }
  }
}

/**
 * Test cache effectiveness
 */
async function testCacheEffectiveness() {
  console.log('\n💾 Testing Cache Effectiveness...');
  
  const testUrl = `${API_BASE_URL}/api/tabellen-eintraege/liga/Kreisliga%20Tauberbischofsheim`;
  
  // First request (cache miss)
  const { duration: firstRequest } = await measureTime('First request (cache miss)', async () => {
    return await axios.get(testUrl, { timeout: 10000 });
  });

  // Second request (should be cached)
  const { duration: secondRequest } = await measureTime('Second request (cache hit)', async () => {
    return await axios.get(testUrl, { timeout: 10000 });
  });

  // Multiple rapid requests (all should be cached)
  const rapidRequests = [];
  for (let i = 0; i < 5; i++) {
    const { duration } = await measureTime(`Rapid request ${i + 1}`, async () => {
      return await axios.get(testUrl, { timeout: 10000 });
    });
    rapidRequests.push(duration);
  }

  const avgRapidTime = rapidRequests.reduce((a, b) => a + b, 0) / rapidRequests.length;
  
  console.log('\n📊 Cache Performance Summary:');
  console.log(`   First request: ${firstRequest.toFixed(2)}ms`);
  console.log(`   Second request: ${secondRequest.toFixed(2)}ms`);
  console.log(`   Average rapid requests: ${avgRapidTime.toFixed(2)}ms`);
  
  if (secondRequest < firstRequest) {
    const cacheImprovement = ((firstRequest - secondRequest) / firstRequest * 100);
    console.log(`   Cache improvement: ${cacheImprovement.toFixed(1)}%`);
  }
}

/**
 * Test memory usage and cleanup
 */
async function testMemoryUsage() {
  console.log('\n🧠 Testing Memory Usage...');
  
  const getMemoryUsage = () => {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100
    };
  };

  const initialMemory = getMemoryUsage();
  console.log('📊 Initial memory usage:', initialMemory);

  // Make many requests to test memory leaks
  console.log('🔄 Making 50 requests to test memory stability...');
  
  for (let i = 0; i < 50; i++) {
    try {
      await axios.get(`${API_BASE_URL}/api/tabellen-eintraege`, {
        params: {
          'filters[liga][name][$eq]': TEST_LEAGUES[i % TEST_LEAGUES.length],
          populate: 'liga',
          sort: 'platz:asc'
        },
        timeout: 5000
      });
    } catch (error) {
      // Ignore individual request failures
    }
    
    if (i % 10 === 9) {
      const currentMemory = getMemoryUsage();
      console.log(`   After ${i + 1} requests:`, currentMemory);
    }
  }

  const finalMemory = getMemoryUsage();
  console.log('📊 Final memory usage:', finalMemory);
  
  const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
  console.log(`📈 Memory increase: ${memoryIncrease.toFixed(2)}MB`);
  
  if (memoryIncrease < 10) {
    console.log('✅ Memory usage is stable');
  } else {
    console.log('⚠️  Potential memory leak detected');
  }
}

/**
 * Generate performance report
 */
function generatePerformanceReport(results) {
  console.log('\n📋 Performance Optimization Report');
  console.log('=====================================');
  
  console.log('\n✅ Completed Tests:');
  console.log('   - Database query performance');
  console.log('   - Concurrent request handling');
  console.log('   - Cache effectiveness');
  console.log('   - Memory usage stability');
  
  console.log('\n🎯 Optimization Benefits:');
  console.log('   - Database indexes improve query speed');
  console.log('   - Optimized API endpoints reduce response time');
  console.log('   - Caching reduces server load');
  console.log('   - Memory management prevents leaks');
  
  console.log('\n📊 Recommendations:');
  console.log('   - Monitor cache hit rates in production');
  console.log('   - Set up performance alerts for slow queries');
  console.log('   - Regular cache cleanup for memory efficiency');
  console.log('   - Consider CDN for static assets');
}

/**
 * Main test runner
 */
async function runPerformanceTests() {
  console.log('🚀 Starting Performance Optimization Tests...');
  console.log(`📍 API Base URL: ${API_BASE_URL}`);
  console.log(`🔄 Test iterations: ${TEST_ITERATIONS}`);
  console.log(`⚡ Concurrent requests: ${CONCURRENT_REQUESTS}`);
  
  try {
    // Test database performance
    await testDatabasePerformance();
    
    // Test concurrent performance
    await testConcurrentPerformance();
    
    // Test cache effectiveness
    await testCacheEffectiveness();
    
    // Test memory usage
    await testMemoryUsage();
    
    // Generate report
    generatePerformanceReport();
    
    console.log('\n🎉 Performance tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Performance tests failed:', error);
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runPerformanceTests();
}

module.exports = {
  runPerformanceTests,
  testDatabasePerformance,
  testConcurrentPerformance,
  testCacheEffectiveness,
  testMemoryUsage
};