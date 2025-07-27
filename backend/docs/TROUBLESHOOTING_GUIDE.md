# Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting procedures for the refactored lifecycle hooks system. It covers common issues, diagnostic procedures, and resolution steps to help maintain system stability and performance.

## Quick Diagnostic Commands

### System Health Check

```bash
# Overall system health
curl http://localhost:1337/api/hook-monitoring/health

# Hook service status
curl http://localhost:1337/api/hook-monitoring/services/status

# Database connectivity
curl http://localhost:1337/api/hook-monitoring/database/status

# Background job queue status
curl http://localhost:1337/api/hook-monitoring/jobs/status

# Configuration validation
node scripts/config-cli.js validate

# Feature flags status
node scripts/feature-flags-cli.js list --status
```

### Performance Diagnostics

```bash
# Hook execution metrics
curl http://localhost:1337/api/hook-monitoring/performance

# Slow hook analysis
curl http://localhost:1337/api/hook-monitoring/performance/slow

# Memory usage
curl http://localhost:1337/api/hook-monitoring/system/memory

# Database connection pool status
curl http://localhost:1337/api/hook-monitoring/database/pool
```

## Common Issues and Solutions

### 1. Hook Execution Failures

#### Symptoms
- Internal Server Errors during CRUD operations
- Hook timeouts
- Validation failures blocking operations

#### Diagnostic Steps

```bash
# Check recent hook errors
curl http://localhost:1337/api/hook-monitoring/errors/recent

# View hook execution logs
tail -f backend/logs/hook-execution.log

# Check specific content type hooks
curl http://localhost:1337/api/hook-monitoring/hooks/api::team.team/status
```

#### Common Causes and Solutions

##### Timeout Issues

**Cause**: Hook operations exceeding configured timeout limits.

**Solution**:
```bash
# Check current timeout configuration
node scripts/config-cli.js get global.timeout

# Increase timeout for specific content type
node scripts/config-cli.js set contentTypes.api::team.team.timeout 10000

# Monitor hook execution times
curl http://localhost:1337/api/hook-monitoring/performance/api::team.team
```

##### Validation Failures

**Cause**: Strict validation rules blocking legitimate operations.

**Solution**:
```bash
# Check validation rule status
curl http://localhost:1337/api/hook-monitoring/validation/rules

# Temporarily disable strict validation
node scripts/feature-flags-cli.js disable strict-validation

# Review validation errors
curl http://localhost:1337/api/hook-monitoring/validation/errors/recent
```

##### Database Connection Issues

**Cause**: Database connection pool exhaustion or connectivity problems.

**Solution**:
```bash
# Check database connection status
psql -h localhost -U strapi -d viktoria_wertheim -c "SELECT 1;"

# Monitor connection pool
curl http://localhost:1337/api/hook-monitoring/database/pool

# Restart connection pool
curl -X POST http://localhost:1337/api/hook-monitoring/database/pool/restart
```

### 2. Performance Issues

#### Symptoms
- Slow response times
- High CPU usage
- Memory leaks
- Background job queue backlog

#### Diagnostic Steps

```bash
# System resource usage
htop
iotop

# Hook performance analysis
curl http://localhost:1337/api/hook-monitoring/performance/analysis

# Background job queue status
curl http://localhost:1337/api/hook-monitoring/jobs/queue/status

# Memory usage by service
curl http://localhost:1337/api/hook-monitoring/system/memory/services
```

#### Solutions

##### Slow Hook Execution

**Investigation**:
```bash
# Identify slow hooks
curl http://localhost:1337/api/hook-monitoring/performance/slow

# Analyze specific hook performance
curl http://localhost:1337/api/hook-monitoring/performance/api::team.team/details

# Check for database query performance
curl http://localhost:1337/api/hook-monitoring/database/slow-queries
```

**Resolution**:
```bash
# Enable async calculations for heavy operations
node scripts/feature-flags-cli.js enable async-calculations

# Optimize database queries
node scripts/optimize-database.js

# Increase worker processes for background jobs
node scripts/config-cli.js set calculation.maxConcurrentJobs 20
```

##### Memory Leaks

**Investigation**:
```bash
# Monitor memory usage over time
curl http://localhost:1337/api/hook-monitoring/system/memory/trend

# Check for memory leaks in specific services
curl http://localhost:1337/api/hook-monitoring/system/memory/leaks

# Analyze garbage collection
node --expose-gc scripts/memory-analysis.js
```

**Resolution**:
```bash
# Restart application to clear memory
pm2 restart viktoria-backend

# Enable memory monitoring
node scripts/feature-flags-cli.js enable memory-monitoring

# Configure garbage collection
export NODE_OPTIONS="--max-old-space-size=4096 --gc-interval=100"
```

##### Background Job Queue Backlog

**Investigation**:
```bash
# Check queue status
curl http://localhost:1337/api/hook-monitoring/jobs/queue/detailed

# Analyze failed jobs
curl http://localhost:1337/api/hook-monitoring/jobs/failed

# Monitor job processing rate
curl http://localhost:1337/api/hook-monitoring/jobs/processing-rate
```

**Resolution**:
```bash
# Increase concurrent job processing
node scripts/config-cli.js set calculation.maxConcurrentJobs 30

# Clear failed jobs
curl -X POST http://localhost:1337/api/hook-monitoring/jobs/failed/clear

# Restart job processing
curl -X POST http://localhost:1337/api/hook-monitoring/jobs/restart
```

### 3. Configuration Issues

#### Symptoms
- Configuration validation errors
- Feature flags not working
- Environment-specific issues

#### Diagnostic Steps

```bash
# Validate all configuration
node scripts/config-cli.js validate

# Check configuration differences between environments
node scripts/config-cli.js diff production staging

# Verify feature flag evaluation
node scripts/feature-flags-cli.js test strict-validation

# Check configuration loading
curl http://localhost:1337/api/hook-monitoring/config/status
```

#### Solutions

##### Invalid Configuration

**Investigation**:
```bash
# Detailed configuration validation
node scripts/config-cli.js validate --verbose

# Check configuration schema
node scripts/config-cli.js schema validate

# Review configuration history
node scripts/config-cli.js history
```

**Resolution**:
```bash
# Restore previous configuration
node scripts/config-cli.js restore backup-20240115.json

# Fix specific configuration issues
node scripts/config-cli.js fix

# Reload configuration
curl -X POST http://localhost:1337/api/hook-monitoring/config/reload
```

##### Feature Flag Issues

**Investigation**:
```bash
# Check flag evaluation
node scripts/feature-flags-cli.js debug strict-validation

# Verify flag cache
curl http://localhost:1337/api/feature-flags/cache/status

# Test flag rules
node scripts/feature-flags-cli.js test-rules strict-validation
```

**Resolution**:
```bash
# Clear flag cache
curl -X POST http://localhost:1337/api/feature-flags/cache/clear

# Reset flag to default
node scripts/feature-flags-cli.js reset strict-validation

# Validate flag rules
node scripts/feature-flags-cli.js validate-rules
```

### 4. Database Issues

#### Symptoms
- Connection timeouts
- Query performance issues
- Data inconsistencies

#### Diagnostic Steps

```bash
# Database connectivity test
psql -h localhost -U strapi -d viktoria_wertheim -c "SELECT version();"

# Check database performance
curl http://localhost:1337/api/hook-monitoring/database/performance

# Analyze slow queries
curl http://localhost:1337/api/hook-monitoring/database/slow-queries

# Check database locks
psql -h localhost -U strapi -d viktoria_wertheim -c "SELECT * FROM pg_locks WHERE NOT granted;"
```

#### Solutions

##### Connection Pool Issues

**Investigation**:
```bash
# Monitor connection pool
curl http://localhost:1337/api/hook-monitoring/database/pool/detailed

# Check active connections
psql -h localhost -U strapi -d viktoria_wertheim -c "SELECT count(*) FROM pg_stat_activity;"
```

**Resolution**:
```bash
# Increase connection pool size
node scripts/config-cli.js set database.connectionPool.max 30

# Restart connection pool
curl -X POST http://localhost:1337/api/hook-monitoring/database/pool/restart

# Optimize connection settings
node scripts/optimize-database-connections.js
```

##### Query Performance Issues

**Investigation**:
```bash
# Identify slow queries
curl http://localhost:1337/api/hook-monitoring/database/slow-queries/detailed

# Analyze query execution plans
psql -h localhost -U strapi -d viktoria_wertheim -c "EXPLAIN ANALYZE SELECT * FROM teams;"
```

**Resolution**:
```bash
# Create missing indexes
node scripts/create-database-indexes.js

# Update table statistics
psql -h localhost -U strapi -d viktoria_wertheim -c "ANALYZE;"

# Optimize database configuration
node scripts/optimize-database-config.js
```

### 5. Monitoring and Logging Issues

#### Symptoms
- Missing logs
- Monitoring dashboard not updating
- Alert notifications not working

#### Diagnostic Steps

```bash
# Check logging service status
curl http://localhost:1337/api/hook-monitoring/logging/status

# Verify log file permissions
ls -la backend/logs/

# Test monitoring endpoints
curl http://localhost:1337/api/hook-monitoring/dashboard/test

# Check alert configuration
curl http://localhost:1337/api/hook-monitoring/alerts/config
```

#### Solutions

##### Logging Issues

**Investigation**:
```bash
# Check log configuration
node scripts/config-cli.js get monitoring.enableLogging

# Verify log rotation
ls -la backend/logs/ | grep -E "\.(log|gz)$"

# Test log writing
curl -X POST http://localhost:1337/api/hook-monitoring/logging/test
```

**Resolution**:
```bash
# Enable logging
node scripts/feature-flags-cli.js enable performance-monitoring

# Fix log file permissions
chmod 644 backend/logs/*.log

# Restart logging service
curl -X POST http://localhost:1337/api/hook-monitoring/logging/restart
```

##### Monitoring Dashboard Issues

**Investigation**:
```bash
# Check dashboard service
curl http://localhost:1337/api/hook-monitoring/dashboard/health

# Verify WebSocket connection
curl -H "Upgrade: websocket" http://localhost:1337/api/hook-monitoring/dashboard/ws

# Test dashboard API
curl http://localhost:1337/api/hook-monitoring/dashboard/api/test
```

**Resolution**:
```bash
# Restart dashboard service
curl -X POST http://localhost:1337/api/hook-monitoring/dashboard/restart

# Clear dashboard cache
curl -X POST http://localhost:1337/api/hook-monitoring/dashboard/cache/clear

# Rebuild dashboard
node scripts/rebuild-dashboard.js
```

## Debugging Procedures

### 1. Hook Execution Debugging

#### Enable Debug Mode

```bash
# Enable debug logging
node scripts/config-cli.js set global.logLevel debug

# Enable hook tracing
node scripts/feature-flags-cli.js enable hook-tracing

# Start application in debug mode
DEBUG=hook:* npm run develop
```

#### Trace Hook Execution

```typescript
// Add debugging to hook service
class TeamHookService extends BaseHookService {
  async beforeCreate(event: HookEvent): Promise<HookResult> {
    this.logger.debug('TeamHookService.beforeCreate started', { event });
    
    try {
      const result = await this.processHook(event);
      this.logger.debug('TeamHookService.beforeCreate completed', { result });
      return result;
    } catch (error) {
      this.logger.error('TeamHookService.beforeCreate failed', { error, event });
      throw error;
    }
  }
}
```

#### Debug Validation Issues

```bash
# Test validation rules individually
curl -X POST http://localhost:1337/api/hook-monitoring/validation/test \
  -H "Content-Type: application/json" \
  -d '{"rule": "uniqueness", "data": {"name": "Test Team"}}'

# Debug validation rule execution
node scripts/debug-validation.js uniqueness '{"name": "Test Team"}'
```

### 2. Performance Debugging

#### Profile Hook Performance

```bash
# Enable performance profiling
node --prof scripts/profile-hooks.js

# Analyze performance profile
node --prof-process isolate-*.log > performance-analysis.txt

# Monitor real-time performance
curl http://localhost:1337/api/hook-monitoring/performance/realtime
```

#### Memory Profiling

```bash
# Generate heap snapshot
curl -X POST http://localhost:1337/api/hook-monitoring/system/heap-snapshot

# Analyze memory usage
node scripts/analyze-memory.js heap-snapshot-*.heapsnapshot

# Monitor memory leaks
node --inspect scripts/memory-leak-detection.js
```

### 3. Database Debugging

#### Query Analysis

```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Analyze slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check for blocking queries
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

#### Connection Debugging

```bash
# Monitor database connections
watch -n 1 'psql -h localhost -U strapi -d viktoria_wertheim -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"'

# Check connection pool metrics
curl http://localhost:1337/api/hook-monitoring/database/pool/metrics

# Test connection performance
node scripts/test-database-performance.js
```

## Maintenance Procedures

### 1. Regular Maintenance Tasks

#### Daily Tasks

```bash
#!/bin/bash
# daily-maintenance.sh

# Check system health
curl -f http://localhost:1337/api/hook-monitoring/health || exit 1

# Validate configuration
node scripts/config-cli.js validate || exit 1

# Check for errors in last 24 hours
curl http://localhost:1337/api/hook-monitoring/errors/last-24h

# Monitor performance metrics
curl http://localhost:1337/api/hook-monitoring/performance/daily-summary

# Clean up old logs
find backend/logs -name "*.log" -mtime +7 -delete

# Backup configuration
node scripts/config-cli.js backup
```

#### Weekly Tasks

```bash
#!/bin/bash
# weekly-maintenance.sh

# Analyze performance trends
curl http://localhost:1337/api/hook-monitoring/performance/weekly-analysis

# Check database performance
node scripts/analyze-database-performance.js

# Review feature flag usage
node scripts/feature-flags-cli.js usage-report

# Update database statistics
psql -h localhost -U strapi -d viktoria_wertheim -c "ANALYZE;"

# Check for memory leaks
node scripts/memory-leak-check.js

# Backup database
pg_dump -h localhost -U strapi viktoria_wertheim > backup-$(date +%Y%m%d).sql
```

#### Monthly Tasks

```bash
#!/bin/bash
# monthly-maintenance.sh

# Performance optimization review
node scripts/performance-optimization-review.js

# Configuration audit
node scripts/config-audit.js

# Security review
node scripts/security-audit.js

# Update dependencies
npm audit
npm update

# Database maintenance
psql -h localhost -U strapi -d viktoria_wertheim -c "VACUUM ANALYZE;"

# Archive old logs
tar -czf logs-archive-$(date +%Y%m).tar.gz backend/logs/*.log
```

### 2. Emergency Procedures

#### System Recovery

```bash
#!/bin/bash
# emergency-recovery.sh

echo "Starting emergency recovery procedure..."

# Stop application
pm2 stop viktoria-backend

# Backup current state
cp -r /var/www/viktoria-wertheim /var/www/viktoria-wertheim-emergency-backup-$(date +%Y%m%d-%H%M%S)

# Restore last known good configuration
node scripts/config-cli.js restore last-good-backup.json

# Reset feature flags to safe defaults
node scripts/feature-flags-cli.js reset-to-defaults

# Clear caches
redis-cli FLUSHALL

# Restart with minimal configuration
pm2 start ecosystem.config.js --env emergency

echo "Emergency recovery completed. Monitor system closely."
```

#### Database Recovery

```bash
#!/bin/bash
# database-recovery.sh

echo "Starting database recovery procedure..."

# Stop application
pm2 stop viktoria-backend

# Create emergency backup
pg_dump -h localhost -U strapi viktoria_wertheim > emergency-backup-$(date +%Y%m%d-%H%M%S).sql

# Check database integrity
psql -h localhost -U strapi -d viktoria_wertheim -c "SELECT pg_database_size('viktoria_wertheim');"

# Repair database if needed
psql -h localhost -U strapi -d viktoria_wertheim -c "REINDEX DATABASE viktoria_wertheim;"

# Restart application
pm2 start viktoria-backend

echo "Database recovery completed."
```

### 3. Monitoring and Alerting Setup

#### Health Check Script

```bash
#!/bin/bash
# health-check.sh

# Check application health
if ! curl -f http://localhost:1337/api/hook-monitoring/health > /dev/null 2>&1; then
  echo "CRITICAL: Application health check failed"
  exit 2
fi

# Check database connectivity
if ! psql -h localhost -U strapi -d viktoria_wertheim -c "SELECT 1;" > /dev/null 2>&1; then
  echo "CRITICAL: Database connectivity failed"
  exit 2
fi

# Check performance metrics
RESPONSE_TIME=$(curl -w "%{time_total}" -o /dev/null -s http://localhost:1337/api/hook-monitoring/performance)
if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
  echo "WARNING: High response time: ${RESPONSE_TIME}s"
  exit 1
fi

echo "OK: All health checks passed"
exit 0
```

#### Alert Configuration

```json
{
  "alerts": [
    {
      "name": "application-down",
      "check": "curl -f http://localhost:1337/api/hook-monitoring/health",
      "interval": 60,
      "severity": "critical",
      "actions": ["restart-application", "send-notification"]
    },
    {
      "name": "high-error-rate",
      "check": "curl http://localhost:1337/api/hook-monitoring/errors/rate | jq '.rate > 0.05'",
      "interval": 300,
      "severity": "warning",
      "actions": ["send-notification"]
    },
    {
      "name": "database-slow",
      "check": "curl http://localhost:1337/api/hook-monitoring/database/performance | jq '.avgQueryTime > 1000'",
      "interval": 300,
      "severity": "warning",
      "actions": ["optimize-database", "send-notification"]
    }
  ]
}
```

This troubleshooting guide provides comprehensive procedures for diagnosing and resolving issues in the lifecycle hooks system, ensuring reliable operation and quick problem resolution.