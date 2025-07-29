# Performance Monitoring System for Club Operations

This directory contains a comprehensive performance monitoring system for club operations in the Viktoria Wertheim system, including metrics collection, alerting, benchmarking, and optimization tools.

## Overview

The performance monitoring system provides:
- **Real-time metrics collection** for club operations
- **Automated alerting** for performance degradation
- **Performance benchmarking** and baseline establishment
- **Cache performance monitoring** with Redis integration
- **Database optimization tracking** with materialized views
- **Multi-channel alerting** (Slack, Discord, Email, Webhooks)

## Components

### Core Services

#### 1. Performance Monitor (`performance-monitor.ts`)
- Collects and tracks performance metrics
- Maintains performance benchmarks
- Provides alerting for performance degradation
- Monitors system health and trends

#### 2. Performance Alerting (`performance-alerting.ts`)
- Multi-channel alert notifications
- Escalation rules and management
- Alert acknowledgment and tracking
- Notification history and statistics

#### 3. Cache Manager (`cache-manager.ts`)
- Redis-based caching for club data
- Cache warming and invalidation strategies
- Performance metrics and monitoring
- Health status and diagnostics

### Scripts and Tools

#### 1. Performance Testing (`test-database-performance.js`)
- Database optimization testing
- Query performance benchmarking
- Connection pool performance tests
- Materialized view effectiveness

#### 2. Redis Cache Testing (`test-redis-caching.js`)
- Cache hit/miss ratio testing
- Cache warming effectiveness
- Concurrent access performance
- Cache invalidation testing

#### 3. Performance Benchmarking (`benchmark-club-performance.js`)
- Comprehensive performance benchmarks
- Single-user and concurrent-user tests
- Data size impact analysis
- Performance baseline establishment

#### 4. Cache Performance Monitoring (`monitor-cache-performance.js`)
- Real-time cache performance monitoring
- Alert threshold monitoring
- Performance trend analysis
- Health status reporting

## Installation and Setup

### 1. Dependencies

Install required dependencies:

```bash
# Core dependencies (should already be installed)
npm install ioredis axios nodemailer

# Development dependencies for testing
npm install --save-dev @types/node
```

### 2. Environment Configuration

Add these environment variables to your `.env` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_KEY_PREFIX=viktoria:club:

# Cache Configuration
CACHE_TTL_CLUB=3600
CACHE_TTL_CLUB_LIST=1800
CACHE_TTL_STATISTICS=900
CACHE_TTL_VIKTORIA=7200
CACHE_WARMING_ENABLED=true
CACHE_WARMING_INTERVAL=300000
CACHE_MONITORING_ENABLED=true

# Alert Channels
ALERT_WEBHOOK_URL=https://your-webhook-url.com/alerts
ALERT_WEBHOOK_AUTH=Bearer your_token

SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SLACK_CHANNEL=#alerts
SLACK_USERNAME=Viktoria Performance Bot

DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK
DISCORD_USERNAME=Viktoria Performance Bot

# Email Alerts
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@domain.com
SMTP_PASS=your_password
ALERT_EMAIL_FROM=alerts@viktoria-wertheim.de
ALERT_EMAIL_TO=admin@viktoria-wertheim.de,dev@viktoria-wertheim.de
ALERT_EMAIL_ENABLED=true

# Performance Thresholds
PERF_ALERT_SLOW_QUERY_MS=500
PERF_ALERT_VERY_SLOW_QUERY_MS=2000
PERF_ALERT_LOW_CACHE_HIT_RATE=70
PERF_ALERT_CRITICAL_CACHE_HIT_RATE=50
PERF_ALERT_HIGH_ERROR_RATE=5
PERF_ALERT_HIGH_MEMORY_USAGE=85
```

### 3. Database Setup

Apply database optimizations:

```bash
# Apply database optimizations
node scripts/apply-database-optimizations.js

# Verify optimizations
psql -d viktoria_wertheim -c "SELECT matviewname, ispopulated FROM pg_matviews WHERE matviewname LIKE '%club%';"
```

### 4. Redis Setup

Ensure Redis is running and accessible:

```bash
# Test Redis connection
redis-cli ping

# Check Redis configuration
redis-cli config get maxmemory
redis-cli config get maxmemory-policy
```

## Usage

### 1. Starting Performance Monitoring

The performance monitoring system starts automatically when the club service is initialized. You can also start it manually:

```javascript
// In your Strapi application
const clubService = strapi.service('api::club.club');

// Start monitoring with custom interval (default: 60 seconds)
await clubService.startPerformanceMonitoring(30000); // 30 seconds

// Get performance summary
const summary = clubService.getPerformanceSummary();
console.log(summary);
```

### 2. Running Performance Tests

#### Database Performance Tests
```bash
# Test database optimizations
node scripts/test-database-performance.js

# Test with Strapi context
npm run strapi console
# Then: require('./scripts/test-database-performance.js').main()
```

#### Redis Cache Tests
```bash
# Test Redis caching performance
node scripts/test-redis-caching.js

# Monitor cache performance in real-time
node scripts/monitor-cache-performance.js --interval 30 --hit-rate-threshold 80
```

#### Comprehensive Benchmarks
```bash
# Run full performance benchmark suite
node scripts/benchmark-club-performance.js

# Results will be exported to: club-performance-benchmark-TIMESTAMP.json
```

### 3. Cache Management

#### Manual Cache Operations
```javascript
const clubService = strapi.service('api::club.club');

// Warm cache
await clubService.warmRedisCache();

// Clear cache
await clubService.clearRedisCache();

// Get cache health
const health = await clubService.getRedisCacheHealth();
console.log(health);

// Get cache metrics
const metrics = clubService.getRedisCacheMetrics();
console.log(metrics);
```

#### Cache Invalidation
```javascript
// Invalidate specific club cache
await clubService.handleClubCacheInvalidation(clubId, 'update');

// Cache is automatically invalidated on:
// - Club creation/update/deletion
// - Liga assignment changes
// - Club status changes
```

### 4. Alert Management

#### Configure Alert Channels
```javascript
// Add custom webhook channel
const alerting = clubService.performanceAlerting;
alerting.addChannel('custom-webhook', {
  type: 'webhook',
  config: {
    url: 'https://your-custom-webhook.com',
    method: 'POST',
    headers: { 'Authorization': 'Bearer token' }
  },
  enabled: true
});

// Test alert channel
await alerting.testChannel('slack');
```

#### Acknowledge Alerts
```javascript
// Acknowledge alert by ID
alerting.acknowledgeAlert('alert_id', 'admin_user');

// Get recent alerts
const recentAlerts = alerting.getRecentAlerts(10);

// Get notification statistics
const stats = alerting.getNotificationStats();
```

## Performance Metrics

### Tracked Metrics

#### Club Operations
- `club_findClubsByLiga_duration` - Time to find clubs by liga
- `club_findViktoriaClubByTeam_duration` - Time to find Viktoria club by team
- `club_getClubWithLogo_duration` - Time to get club with logo
- `club_getClubStatistics_duration` - Time to get club statistics
- `club_validateClubInLiga_duration` - Time to validate club in liga

#### System Metrics
- `memory_usage_percent` - Memory usage percentage
- `database_latency` - Database query latency
- `cache_hit_rate` - Redis cache hit rate
- `error_rate` - Error rate percentage

#### Cache Metrics
- `cache_hits` - Number of cache hits
- `cache_misses` - Number of cache misses
- `cache_sets` - Number of cache sets
- `cache_deletes` - Number of cache deletions

### Performance Benchmarks

#### Target Performance (Single User)
- `findClubsByLiga`: < 50ms
- `findViktoriaClubByTeam`: < 20ms
- `getClubWithLogo`: < 30ms
- `getClubStatistics`: < 100ms
- `validateClubInLiga`: < 25ms

#### Cache Performance Targets
- Hit rate: > 80%
- Cache response time: < 10ms
- Cache warming: < 5 seconds
- Invalidation time: < 100ms

#### Database Performance Targets
- Query latency: < 50ms
- Connection acquisition: < 100ms
- Materialized view refresh: < 2 seconds
- Index usage: > 90%

## Alert Configuration

### Default Alert Rules

#### Critical Alerts
- Query duration > 2000ms for 30 seconds
- Cache hit rate < 50% for 2 minutes
- Error rate > 5% for 1 minute
- Memory usage > 85% for 5 minutes

#### Warning Alerts
- Query duration > 500ms for 1 minute
- Cache hit rate < 70% for 5 minutes
- Database latency > 100ms for 3 minutes

### Escalation Rules

#### Critical Escalation
1. **Immediate**: Console, Slack, Discord, Webhook
2. **5 minutes unacknowledged**: Email notification
3. **15 minutes unacknowledged**: Manager escalation

#### Warning Escalation
1. **1 minute**: Console, Slack
2. **15 minutes unacknowledged**: Webhook notification

## Monitoring and Maintenance

### Daily Tasks

#### Performance Review
```bash
# Check performance summary
node -e "
const strapi = require('@strapi/strapi')();
strapi.load().then(() => {
  const summary = strapi.service('api::club.club').getPerformanceSummary();
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
});
"
```

#### Cache Health Check
```bash
# Monitor cache performance for 5 minutes
node scripts/monitor-cache-performance.js --interval 10

# Check cache health
redis-cli info memory
redis-cli info stats
```

### Weekly Tasks

#### Performance Benchmarking
```bash
# Run weekly performance benchmark
node scripts/benchmark-club-performance.js

# Compare with previous benchmarks
# Results are saved with timestamps for comparison
```

#### Database Maintenance
```bash
# Refresh materialized views
psql -d viktoria_wertheim -c "SELECT refresh_club_stats_views();"

# Clean up old performance metrics
psql -d viktoria_wertheim -c "SELECT cleanup_old_performance_metrics();"

# Analyze table statistics
psql -d viktoria_wertheim -c "ANALYZE clubs, spiele, tabellen_eintraege;"
```

### Monthly Tasks

#### Performance Analysis
```bash
# Export performance metrics for analysis
node -e "
const strapi = require('@strapi/strapi')();
strapi.load().then(() => {
  const monitor = strapi.service('api::club.club').performanceMonitor;
  const metrics = monitor.exportMetrics('csv');
  require('fs').writeFileSync('performance-metrics-' + new Date().toISOString().split('T')[0] + '.csv', metrics);
  console.log('Metrics exported');
  process.exit(0);
});
"
```

#### Alert Review
```bash
# Review alert statistics
node -e "
const strapi = require('@strapi/strapi')();
strapi.load().then(() => {
  const alerting = strapi.service('api::club.club').performanceAlerting;
  const stats = alerting.getNotificationStats();
  console.log('Alert Statistics:', stats);
  process.exit(0);
});
"
```

## Troubleshooting

### Common Issues

#### High Memory Usage
1. Check cache size: `redis-cli info memory`
2. Review cache TTL settings
3. Consider reducing cache warming frequency
4. Monitor for memory leaks in application

#### Low Cache Hit Rate
1. Check cache warming configuration
2. Review TTL settings (may be too short)
3. Verify cache invalidation isn't too aggressive
4. Monitor query patterns for optimization opportunities

#### Slow Database Queries
1. Check materialized view status: `SELECT * FROM pg_matviews;`
2. Verify index usage: `EXPLAIN ANALYZE your_query;`
3. Review connection pool settings
4. Check for table bloat: `SELECT * FROM pg_stat_user_tables;`

#### Alert Fatigue
1. Review alert thresholds (may be too sensitive)
2. Implement alert grouping/deduplication
3. Add alert acknowledgment workflows
4. Consider alert suppression during maintenance

### Performance Debugging

#### Enable Debug Logging
```env
# Add to .env
DATABASE_DEBUG=true
DATABASE_DEBUG_VERBOSE=true
CACHE_DEBUG=true
```

#### Query Analysis
```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
WHERE query LIKE '%club%' 
ORDER BY mean_time DESC 
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes 
WHERE tablename IN ('clubs', 'spiele', 'tabellen_eintraege')
ORDER BY idx_scan DESC;
```

#### Cache Analysis
```bash
# Redis slow log
redis-cli slowlog get 10

# Redis memory analysis
redis-cli --bigkeys

# Connection analysis
redis-cli client list
```

## API Integration

### REST Endpoints

The performance monitoring system can be integrated with REST endpoints:

```javascript
// Add to your routes
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/performance/metrics',
      handler: 'performance.getMetrics',
    },
    {
      method: 'GET',
      path: '/performance/health',
      handler: 'performance.getHealth',
    },
    {
      method: 'POST',
      path: '/performance/alerts/:id/acknowledge',
      handler: 'performance.acknowledgeAlert',
    }
  ]
};
```

### GraphQL Integration

```graphql
type PerformanceMetrics {
  clubOperations: [OperationMetric]
  systemHealth: SystemHealth
  cachePerformance: CacheMetrics
  alerts: [Alert]
}

type Query {
  performanceMetrics: PerformanceMetrics
  performanceHealth: HealthStatus
}

type Mutation {
  acknowledgeAlert(id: ID!, acknowledgedBy: String!): Boolean
  warmCache: Boolean
  clearCache: Boolean
}
```

## Best Practices

### Performance Optimization
1. **Use caching strategically** - Cache frequently accessed, rarely changed data
2. **Monitor cache hit rates** - Aim for >80% hit rate
3. **Optimize database queries** - Use indexes and materialized views
4. **Set appropriate TTLs** - Balance freshness with performance
5. **Monitor trends** - Track performance over time

### Alert Management
1. **Set meaningful thresholds** - Avoid alert fatigue
2. **Use escalation rules** - Ensure critical issues get attention
3. **Acknowledge alerts promptly** - Prevent unnecessary escalations
4. **Review alert patterns** - Identify recurring issues
5. **Test alert channels** - Ensure notifications work

### Monitoring Strategy
1. **Establish baselines** - Know your normal performance
2. **Monitor proactively** - Don't wait for user complaints
3. **Track key metrics** - Focus on user-impacting metrics
4. **Regular maintenance** - Keep monitoring system healthy
5. **Document incidents** - Learn from performance issues

## Support and Maintenance

### Log Locations
- Application logs: `backend/logs/`
- Performance metrics: Database `performance_metrics` table
- System logs: Database `system_logs` table
- Redis logs: Redis server logs

### Backup and Recovery
- Performance metrics are stored in the database
- Cache data can be rebuilt through warming
- Alert history is preserved in the database
- Configuration is in environment variables

### Scaling Considerations
- Redis clustering for high availability
- Database read replicas for query scaling
- Horizontal scaling of monitoring components
- Load balancing for alert endpoints

## Version History

- **v1.0** - Initial performance monitoring system
  - Basic metrics collection
  - Redis caching implementation
  - Database optimizations
  - Multi-channel alerting
  - Performance benchmarking tools