#!/usr/bin/env node

/**
 * Test Database Performance for Club Operations
 * 
 * This script tests the performance improvements from database optimizations
 * and provides benchmarking data for club-related queries.
 */

const { performance } = require('perf_hooks');

/**
 * Performance test suite for club operations
 */
class ClubPerformanceTester {
  constructor(strapi) {
    this.strapi = strapi;
    this.results = [];
  }

  /**
   * Log performance metric
   */
  async logMetric(name, duration, context = {}) {
    this.results.push({
      name,
      duration,
      context,
      timestamp: new Date().toISOString()
    });

    // Log to database if available
    try {
      if (this.strapi?.db) {
        await this.strapi.db.connection.raw(`
          SELECT log_performance_metric(?, ?, 'ms', ?::jsonb);
        `, [name, duration, JSON.stringify(context)]);
      }
    } catch (error) {
      console.warn('⚠️  Could not log metric to database:', error.message);
    }
  }

  /**
   * Test club lookup by liga performance
   */
  async testClubLookupByLiga() {
    console.log('🏃 Testing club lookup by liga...');
    
    try {
      const startTime = performance.now();
      
      // Test using optimized function
      const result = await this.strapi.db.connection.raw(`
        SELECT * FROM get_clubs_by_liga(1);
      `);
      
      const duration = performance.now() - startTime;
      
      await this.logMetric('club_lookup_by_liga_optimized', duration, {
        rows_returned: result.rows.length,
        liga_id: 1
      });
      
      console.log(`  ✓ Optimized query: ${duration.toFixed(2)}ms, ${result.rows.length} clubs`);
      
      // Compare with traditional query
      const startTime2 = performance.now();
      
      const result2 = await this.strapi.db.connection.raw(`
        SELECT c.id, c.name, c.kurz_name, c.club_typ, c.viktoria_team_mapping
        FROM clubs c
        JOIN clubs_ligen_links cll ON c.id = cll.club_id
        WHERE cll.liga_id = 1 AND c.aktiv = true
        ORDER BY c.name;
      `);
      
      const duration2 = performance.now() - startTime2;
      
      await this.logMetric('club_lookup_by_liga_traditional', duration2, {
        rows_returned: result2.rows.length,
        liga_id: 1
      });
      
      console.log(`  ✓ Traditional query: ${duration2.toFixed(2)}ms, ${result2.rows.length} clubs`);
      console.log(`  📊 Performance improvement: ${((duration2 - duration) / duration2 * 100).toFixed(1)}%`);
      
    } catch (error) {
      console.error('❌ Error testing club lookup:', error.message);
    }
  }

  /**
   * Test viktoria club lookup performance
   */
  async testViktoriaClubLookup() {
    console.log('🏃 Testing viktoria club lookup...');
    
    const teamMappings = ['team_1', 'team_2', 'team_3'];
    
    for (const mapping of teamMappings) {
      try {
        const startTime = performance.now();
        
        const result = await this.strapi.db.connection.raw(`
          SELECT * FROM get_viktoria_club_by_team(?);
        `, [mapping]);
        
        const duration = performance.now() - startTime;
        
        await this.logMetric('viktoria_club_lookup', duration, {
          team_mapping: mapping,
          found: result.rows.length > 0
        });
        
        console.log(`  ✓ ${mapping}: ${duration.toFixed(2)}ms, found: ${result.rows.length > 0}`);
        
      } catch (error) {
        console.error(`❌ Error testing ${mapping}:`, error.message);
      }
    }
  }

  /**
   * Test current season table performance
   */
  async testCurrentSeasonTable() {
    console.log('🏃 Testing current season table performance...');
    
    try {
      const startTime = performance.now();
      
      const result = await this.strapi.db.connection.raw(`
        SELECT * FROM get_current_season_table(1);
      `);
      
      const duration = performance.now() - startTime;
      
      await this.logMetric('current_season_table', duration, {
        rows_returned: result.rows.length,
        liga_id: 1
      });
      
      console.log(`  ✓ Current season table: ${duration.toFixed(2)}ms, ${result.rows.length} entries`);
      
      // Test materialized view performance
      const startTime2 = performance.now();
      
      const result2 = await this.strapi.db.connection.raw(`
        SELECT * FROM current_season_club_stats WHERE liga_id = 1;
      `);
      
      const duration2 = performance.now() - startTime2;
      
      await this.logMetric('current_season_materialized_view', duration2, {
        rows_returned: result2.rows.length,
        liga_id: 1
      });
      
      console.log(`  ✓ Materialized view: ${duration2.toFixed(2)}ms, ${result2.rows.length} entries`);
      
    } catch (error) {
      console.error('❌ Error testing current season table:', error.message);
    }
  }

  /**
   * Test club statistics view performance
   */
  async testClubStatisticsView() {
    console.log('🏃 Testing club statistics view performance...');
    
    try {
      const startTime = performance.now();
      
      const result = await this.strapi.db.connection.raw(`
        SELECT * FROM club_liga_stats WHERE liga_id = 1;
      `);
      
      const duration = performance.now() - startTime;
      
      await this.logMetric('club_statistics_view', duration, {
        rows_returned: result.rows.length,
        liga_id: 1
      });
      
      console.log(`  ✓ Club statistics view: ${duration.toFixed(2)}ms, ${result.rows.length} entries`);
      
    } catch (error) {
      console.error('❌ Error testing club statistics view:', error.message);
    }
  }

  /**
   * Test complex club queries
   */
  async testComplexClubQueries() {
    console.log('🏃 Testing complex club queries...');
    
    const complexQueries = [
      {
        name: 'club_games_with_results',
        query: `
          SELECT c.name, COUNT(s.id) as total_games, 
                 COUNT(CASE WHEN s.status = 'beendet' THEN 1 END) as finished_games
          FROM clubs c
          LEFT JOIN spiele s ON (s.heim_club_id = c.id OR s.gast_club_id = c.id)
          WHERE c.aktiv = true
          GROUP BY c.id, c.name
          ORDER BY total_games DESC
          LIMIT 10;
        `
      },
      {
        name: 'viktoria_clubs_performance',
        query: `
          SELECT c.name, c.viktoria_team_mapping, 
                 COUNT(s.id) as games_played,
                 SUM(CASE 
                   WHEN s.heim_club_id = c.id AND s.heim_tore > s.gast_tore THEN 1
                   WHEN s.gast_club_id = c.id AND s.gast_tore > s.heim_tore THEN 1
                   ELSE 0
                 END) as wins
          FROM clubs c
          LEFT JOIN spiele s ON (s.heim_club_id = c.id OR s.gast_club_id = c.id) 
                              AND s.status = 'beendet'
          WHERE c.club_typ = 'viktoria_verein'
          GROUP BY c.id, c.name, c.viktoria_team_mapping
          ORDER BY c.viktoria_team_mapping;
        `
      },
      {
        name: 'liga_club_distribution',
        query: `
          SELECT l.name as liga_name, COUNT(cll.club_id) as club_count,
                 COUNT(CASE WHEN c.club_typ = 'viktoria_verein' THEN 1 END) as viktoria_clubs,
                 COUNT(CASE WHEN c.club_typ = 'gegner_verein' THEN 1 END) as opponent_clubs
          FROM ligen l
          LEFT JOIN clubs_ligen_links cll ON l.id = cll.liga_id
          LEFT JOIN clubs c ON cll.club_id = c.id AND c.aktiv = true
          GROUP BY l.id, l.name
          ORDER BY club_count DESC;
        `
      }
    ];

    for (const testQuery of complexQueries) {
      try {
        const startTime = performance.now();
        
        const result = await this.strapi.db.connection.raw(testQuery.query);
        
        const duration = performance.now() - startTime;
        
        await this.logMetric(`complex_query_${testQuery.name}`, duration, {
          rows_returned: result.rows.length
        });
        
        console.log(`  ✓ ${testQuery.name}: ${duration.toFixed(2)}ms, ${result.rows.length} rows`);
        
      } catch (error) {
        console.error(`❌ Error testing ${testQuery.name}:`, error.message);
      }
    }
  }

  /**
   * Test database connection pool performance
   */
  async testConnectionPoolPerformance() {
    console.log('🏃 Testing connection pool performance...');
    
    try {
      const concurrentQueries = 10;
      const promises = [];
      
      const startTime = performance.now();
      
      for (let i = 0; i < concurrentQueries; i++) {
        promises.push(
          this.strapi.db.connection.raw(`
            SELECT COUNT(*) as club_count FROM clubs WHERE aktiv = true;
          `)
        );
      }
      
      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;
      
      await this.logMetric('connection_pool_concurrent', duration, {
        concurrent_queries: concurrentQueries,
        average_per_query: duration / concurrentQueries
      });
      
      console.log(`  ✓ ${concurrentQueries} concurrent queries: ${duration.toFixed(2)}ms total`);
      console.log(`  ✓ Average per query: ${(duration / concurrentQueries).toFixed(2)}ms`);
      
    } catch (error) {
      console.error('❌ Error testing connection pool:', error.message);
    }
  }

  /**
   * Run all performance tests
   */
  async runAllTests() {
    console.log('🚀 Starting club performance tests...\n');
    
    await this.testClubLookupByLiga();
    console.log('');
    
    await this.testViktoriaClubLookup();
    console.log('');
    
    await this.testCurrentSeasonTable();
    console.log('');
    
    await this.testClubStatisticsView();
    console.log('');
    
    await this.testComplexClubQueries();
    console.log('');
    
    await this.testConnectionPoolPerformance();
    console.log('');
    
    this.printSummary();
  }

  /**
   * Print performance test summary
   */
  printSummary() {
    console.log('📊 Performance Test Summary:');
    console.log('=' .repeat(50));
    
    const sortedResults = this.results.sort((a, b) => b.duration - a.duration);
    
    sortedResults.forEach((result, index) => {
      const status = result.duration < 100 ? '🟢' : result.duration < 500 ? '🟡' : '🔴';
      console.log(`${status} ${result.name}: ${result.duration.toFixed(2)}ms`);
    });
    
    const totalDuration = this.results.reduce((sum, result) => sum + result.duration, 0);
    const averageDuration = totalDuration / this.results.length;
    
    console.log('=' .repeat(50));
    console.log(`📈 Total test duration: ${totalDuration.toFixed(2)}ms`);
    console.log(`📊 Average query time: ${averageDuration.toFixed(2)}ms`);
    console.log(`🧪 Tests completed: ${this.results.length}`);
    
    // Performance recommendations
    const slowQueries = this.results.filter(r => r.duration > 500);
    if (slowQueries.length > 0) {
      console.log('\n⚠️  Performance Recommendations:');
      slowQueries.forEach(query => {
        console.log(`  - Optimize "${query.name}" (${query.duration.toFixed(2)}ms)`);
      });
    } else {
      console.log('\n✅ All queries performing well (< 500ms)');
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    // Initialize Strapi
    const Strapi = require('@strapi/strapi');
    const strapi = await Strapi().load();
    
    console.log('✅ Strapi loaded successfully');
    
    // Run performance tests
    const tester = new ClubPerformanceTester(strapi);
    await tester.runAllTests();
    
    console.log('\n🎉 Performance testing completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Performance testing failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = {
  ClubPerformanceTester,
  main
};