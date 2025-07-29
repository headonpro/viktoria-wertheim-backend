# Database Optimizations for Club Operations

This directory contains scripts and configurations for optimizing database performance for club-related operations in the Viktoria Wertheim system.

## Overview

The database optimizations include:
- **Indexes** for frequently queried club data
- **Materialized views** for complex club statistics
- **Connection pooling** optimizations
- **Query optimization** functions
- **Performance monitoring** tools

## Files

### Core Optimization Files

- `database-optimizations.sql` - Main SQL script with all optimizations
- `apply-database-optimizations.js` - Node.js script to apply optimizations
- `test-database-performance.js` - Performance testing suite
- `../config/database-pool.js` - Connection pooling configuration
- `../config/database.ts` - Updated database configuration

### Usage

#### 1. Apply Database Optimizations

```bash
# Apply all database optimizations
node scripts/apply-database-optimizations.js

# Or run the SQL directly (if you have psql access)
psql -d viktoria_wertheim -f scripts/database-optimizations.sql
```

#### 2. Test Performance Improvements

```bash
# Run performance tests
node scripts/test-database-performance.js

# Or run with Strapi context
npm run strapi console
# Then in console:
require('./scripts/test-database-performance.js').main()
```

#### 3. Monitor Performance

```bash
# Check materialized view status
psql -d viktoria_wertheim -c "SELECT matviewname, ispopulated FROM pg_matviews WHERE matviewname LIKE '%club%';"

# Check index usage
psql -d viktoria_wertheim -c "SELECT schemaname, tablename, indexname, idx_scan FROM pg_stat_user_indexes WHERE tablename IN ('clubs', 'spiele', 'tabellen_eintraege') ORDER BY idx_scan DESC;"
```

## Optimizations Applied

### 1. Database Indexes

#### Club Table Indexes
- `idx_clubs_typ_aktiv` - For filtering by club type and active status
- `idx_clubs_viktoria_mapping` - For viktoria team mapping lookups
- `idx_clubs_name_search` - Full-text search on club names
- `idx_clubs_aktiv` - For active club filtering

#### Spiele Table Indexes
- `idx_spiele_clubs_liga_saison` - Composite index for club games by league/season
- `idx_spiele_heim_club_status` - Home club games by status
- `idx_spiele_gast_club_status` - Away club games by status
- `idx_spiele_liga_saison_status` - League/season/status filtering

#### Tabellen-Einträge Indexes
- `idx_tabellen_club_liga` - Club table entries by league
- `idx_tabellen_liga_platz` - League standings by position
- `idx_tabellen_punkte_tordiff` - Sorting by points and goal difference

#### Relationship Indexes
- `idx_clubs_ligen_links_composite` - Club-league relationships

### 2. Materialized Views

#### club_liga_stats
Pre-calculated statistics for club-league combinations:
- Total games played
- Games finished
- Home/away game counts
- Goals for/against
- Updated automatically via triggers

#### current_season_club_stats
Current season statistics with calculated points:
- Wins, draws, losses
- Goals scored/conceded
- Points calculation (3-1-0 system)
- Goal difference
- Refreshed on game updates

### 3. Optimized Functions

#### get_clubs_by_liga(liga_id)
Fast lookup of clubs in a specific league with statistics.

#### get_viktoria_club_by_team(team_mapping)
Quick lookup of Viktoria clubs by team mapping (team_1, team_2, team_3).

#### get_current_season_table(liga_id)
Optimized current season table calculation with proper sorting.

#### refresh_club_stats_views()
Manual refresh function for materialized views.

### 4. Connection Pool Optimizations

#### Environment-Specific Settings

**Production:**
- Min connections: 5
- Max connections: 25
- Optimized timeouts and retry logic

**Development:**
- Min connections: 2
- Max connections: 15
- Error propagation enabled

**Test:**
- Min connections: 1
- Max connections: 5
- Fast timeouts for quick tests

#### Connection-Level Optimizations
- Statement timeout: 30s
- Idle transaction timeout: 60s
- TCP keepalive settings
- Query planner optimizations

### 5. Performance Monitoring

#### Metrics Tracked
- Query execution times
- Connection pool status
- Index usage statistics
- Materialized view refresh times

#### Monitoring Tables
- `performance_metrics` - Query performance data
- `system_logs` - System events and errors

## Performance Targets

### Query Performance Targets
- Club lookup by league: < 50ms
- Viktoria club lookup: < 10ms
- Current season table: < 100ms
- Complex statistics queries: < 200ms

### Connection Pool Targets
- Connection acquisition: < 100ms
- Pool utilization: 60-80%
- Connection lifetime: > 30 minutes

## Maintenance

### Regular Tasks

#### Daily
- Monitor slow queries via `pg_stat_statements`
- Check connection pool health
- Review performance metrics

#### Weekly
- Refresh materialized views manually if needed:
  ```sql
  SELECT refresh_club_stats_views();
  ```
- Clean up old performance metrics:
  ```sql
  SELECT cleanup_old_performance_metrics();
  ```

#### Monthly
- Analyze table statistics:
  ```sql
  ANALYZE clubs, spiele, tabellen_eintraege;
  ```
- Review and optimize slow queries
- Update connection pool settings if needed

### Troubleshooting

#### Slow Queries
1. Check `pg_stat_statements` for slow club queries
2. Verify indexes are being used with `EXPLAIN ANALYZE`
3. Consider refreshing materialized views
4. Check connection pool utilization

#### High Memory Usage
1. Reduce `work_mem` settings
2. Lower connection pool max size
3. Refresh materialized views to clear cache

#### Connection Pool Issues
1. Check pool status in logs
2. Verify database connection limits
3. Adjust timeout settings
4. Monitor connection lifecycle

## Environment Variables

Add these to your `.env` file for optimal performance:

```env
# Connection Pool Settings
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=25
DATABASE_CONNECTION_TIMEOUT=60000

# Performance Settings
DATABASE_DEBUG=false
DATABASE_DEBUG_VERBOSE=false

# Query Optimization
DATABASE_WORK_MEM=8MB
DATABASE_EFFECTIVE_CACHE_SIZE=1GB
```

## Monitoring Queries

### Check Index Usage
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('clubs', 'spiele', 'tabellen_eintraege')
ORDER BY idx_scan DESC;
```

### Check Materialized View Status
```sql
SELECT 
  matviewname,
  ispopulated,
  pg_size_pretty(pg_total_relation_size(matviewname::regclass)) as size
FROM pg_matviews 
WHERE matviewname LIKE '%club%';
```

### Check Connection Pool Status
```sql
SELECT 
  state,
  COUNT(*) as connection_count,
  MAX(state_change) as last_change
FROM pg_stat_activity 
WHERE datname = current_database()
GROUP BY state
ORDER BY connection_count DESC;
```

### Performance Metrics Query
```sql
SELECT 
  metric_name,
  AVG(metric_value) as avg_value,
  MIN(metric_value) as min_value,
  MAX(metric_value) as max_value,
  COUNT(*) as sample_count
FROM performance_metrics 
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND metric_name LIKE '%club%'
GROUP BY metric_name
ORDER BY avg_value DESC;
```

## Best Practices

1. **Always use prepared statements** for repeated queries
2. **Populate relations selectively** - only load what you need
3. **Use materialized views** for complex aggregations
4. **Monitor query performance** regularly
5. **Keep connection pools sized appropriately** for your load
6. **Refresh materialized views** during low-traffic periods
7. **Use indexes wisely** - too many can slow down writes
8. **Test performance changes** in staging before production

## Support

For issues with database optimizations:
1. Check the system logs table for errors
2. Review performance metrics for anomalies
3. Run the performance test suite
4. Check connection pool health
5. Verify materialized views are populated

## Version History

- **v1.0** - Initial database optimizations
  - Basic indexes for club operations
  - Materialized views for statistics
  - Connection pool optimizations
  - Performance monitoring setup