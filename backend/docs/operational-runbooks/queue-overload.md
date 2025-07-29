# Queue Overload

## Overview
Queue overload occurs when the job queue accumulates more jobs than it can process, leading to delayed table calculations and potential system instability. This runbook covers diagnosis and resolution of queue overload situations.

## Symptoms
- Health check shows queue as "degraded" or "unhealthy"
- High number of pending jobs in queue status
- Table calculations taking longer than usual
- Users reporting outdated table data
- Memory usage increasing due to queued jobs
- Alert notifications about queue size

### Performance Indicators
- Pending jobs > 50
- Processing time > 30 seconds per job
- Queue processing rate < job creation rate
- Failed jobs increasing rapidly

## Diagnosis

### Step 1: Check Queue Status
```bash
# Check queue status via API
curl -s http://localhost:1337/api/tabellen-eintraege/monitoring/health/queue | jq '.'

# Expected healthy response:
# {
#   "data": {
#     "name": "queue",
#     "status": "healthy",
#     "metrics": {
#       "pendingJobs": 5,
#       "processingJobs": 2,
#       "completedJobs": 1000,
#       "failedJobs": 3
#     }
#   }
# }
```

### Step 2: Check Queue Manager Logs
```bash
# Check recent queue-related logs
tail -f backend/logs/automation.log | grep -i queue

# Look for patterns like:
# - "Job queued"
# - "Job started"
# - "Job completed"
# - "Job failed"
# - "Queue overload"
```

### Step 3: Analyze Job Distribution
```bash
# Check job types and priorities (if logging is detailed)
grep "Job queued" backend/logs/automation.log | tail -100 | awk '{print $5}' | sort | uniq -c

# Check processing times
grep "Job completed" backend/logs/automation.log | tail -50 | grep -o "in [0-9]*ms" | sort -n
```

### Step 4: Check System Resources
```bash
# Check memory usage
free -h

# Check CPU usage
top -n 1 | head -20

# Check disk I/O
iostat -x 1 3
```

### Step 5: Check Database Performance
```bash
# Check for long-running queries
psql -U postgres -d strapi_db -c "
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state = 'active';
"

# Check database locks
psql -U postgres -d strapi_db -c "
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
"
```

## Resolution

### Scenario 1: High Volume of Legitimate Jobs

#### Increase Queue Processing Capacity
```bash
# Edit queue configuration
nano backend/src/config/automation.ts
```

Update queue settings:
```typescript
export default {
  queue: {
    concurrency: 5, // Increase from default 3
    maxRetries: 3,
    retryDelay: 2000,
    jobTimeout: 30000, // 30 seconds
    cleanupInterval: 300000, // 5 minutes
    maxQueueSize: 200 // Increase limit
  }
}
```

#### Scale Processing Resources
```bash
# Increase memory allocation if using PM2
pm2 restart strapi-backend --max-memory-restart 2G

# Or restart with more memory
NODE_OPTIONS="--max-old-space-size=4096" npm run start
```

### Scenario 2: Stuck or Long-Running Jobs

#### Clear Stuck Jobs
```javascript
// Connect to application and clear stuck jobs
const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');

// Get stuck jobs (processing for more than 5 minutes)
const stuckJobs = queueManager.getStuckJobs(300000); // 5 minutes

// Cancel stuck jobs
for (const job of stuckJobs) {
  await queueManager.cancelJob(job.id);
  console.log(`Cancelled stuck job: ${job.id}`);
}
```

#### Restart Queue Processing
```bash
# Restart the application to reset queue state
sudo systemctl restart strapi-backend

# Or use PM2
pm2 restart strapi-backend
```

### Scenario 3: Database Performance Issues

#### Optimize Database Queries
```sql
-- Check slow queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements 
WHERE mean_time > 1000 -- queries taking more than 1 second
ORDER BY mean_time DESC 
LIMIT 10;

-- Update table statistics
ANALYZE spiele;
ANALYZE tabellen_eintraege;
ANALYZE teams;

-- Reindex if needed
REINDEX INDEX CONCURRENTLY idx_spiele_liga_saison;
REINDEX INDEX CONCURRENTLY idx_tabellen_liga_saison;
```

#### Kill Long-Running Queries
```sql
-- Kill queries running longer than 10 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '10 minutes'
  AND query NOT LIKE '%pg_stat_activity%';
```

### Scenario 4: Memory Issues

#### Clear Memory and Restart
```bash
# Clear system cache
sudo sync
sudo echo 3 > /proc/sys/vm/drop_caches

# Restart application with memory monitoring
NODE_OPTIONS="--max-old-space-size=2048" pm2 restart strapi-backend --max-memory-restart 1800M
```

#### Implement Job Batching
```javascript
// Modify queue manager to process jobs in smaller batches
const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');

// Process jobs in batches of 10
queueManager.setBatchSize(10);
queueManager.setBatchDelay(1000); // 1 second between batches
```

### Scenario 5: Emergency Queue Drain

#### Pause New Job Creation
```javascript
// Temporarily disable automatic job creation
const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
queueManager.pauseJobCreation();
```

#### Clear All Pending Jobs
```javascript
// Clear all pending jobs (use with caution)
const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
const pendingJobs = queueManager.getPendingJobs();

console.log(`Clearing ${pendingJobs.length} pending jobs`);
await queueManager.clearPendingJobs();
```

#### Manual Table Recalculation
```bash
# Trigger manual recalculation for critical leagues
curl -X POST http://localhost:1337/api/tabellen-eintraege/admin/recalculate \
  -H "Content-Type: application/json" \
  -d '{"ligaId": 1, "saisonId": 2023, "priority": "high"}'
```

## Verification

### Step 1: Check Queue Status
```bash
# Verify queue is healthy
curl -s http://localhost:1337/api/tabellen-eintraege/monitoring/health/queue | jq '.data.status'
# Should return: "healthy"

# Check queue metrics
curl -s http://localhost:1337/api/tabellen-eintraege/monitoring/health/queue | jq '.data.metrics'
```

### Step 2: Monitor Job Processing
```bash
# Watch queue processing in real-time
watch -n 5 'curl -s http://localhost:1337/api/tabellen-eintraege/monitoring/health/queue | jq ".data.metrics"'
```

### Step 3: Test Table Calculation
```bash
# Test a manual calculation
curl -X POST http://localhost:1337/api/tabellen-eintraege/admin/recalculate \
  -H "Content-Type: application/json" \
  -d '{"ligaId": 1, "saisonId": 2023}' | jq '.'

# Should complete within reasonable time (< 30 seconds)
```

### Step 4: Check System Resources
```bash
# Verify memory usage is stable
free -h

# Check CPU usage is normal
top -n 1 | grep "Cpu(s)"
```

## Prevention

### 1. Queue Monitoring and Alerting
```javascript
// Configure queue alerts
const alertRules = [
  {
    name: 'High Queue Size',
    metric: 'pendingJobs',
    threshold: 50,
    severity: 'warning'
  },
  {
    name: 'Queue Overload',
    metric: 'pendingJobs', 
    threshold: 100,
    severity: 'critical'
  },
  {
    name: 'High Job Failure Rate',
    metric: 'failureRate',
    threshold: 10, // 10%
    severity: 'high'
  }
];
```

### 2. Automatic Queue Management
```javascript
// Implement automatic queue cleanup
setInterval(async () => {
  const queueManager = strapi.service('api::tabellen-eintrag.queue-manager');
  
  // Clean up old completed jobs
  await queueManager.cleanupCompletedJobs(86400000); // 24 hours
  
  // Clean up old failed jobs
  await queueManager.cleanupFailedJobs(604800000); // 7 days
  
  // Check for stuck jobs
  const stuckJobs = queueManager.getStuckJobs(300000); // 5 minutes
  if (stuckJobs.length > 0) {
    console.warn(`Found ${stuckJobs.length} stuck jobs`);
    // Alert or auto-cancel based on policy
  }
}, 300000); // Run every 5 minutes
```

### 3. Resource Monitoring
```bash
# Add to crontab for resource monitoring
*/5 * * * * free -m | awk 'NR==2{printf "Memory Usage: %s/%sMB (%.2f%%)\n", $3,$2,$3*100/$2 }' >> /var/log/resource-usage.log
*/5 * * * * top -bn1 | grep "Cpu(s)" | awk '{print $2 + $4}' | awk '{printf "CPU Usage: %.1f%%\n", $1}' >> /var/log/resource-usage.log
```

### 4. Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spiele_status_updated 
ON spiele(status, updated_at) 
WHERE status = 'beendet';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_queue_jobs_status_priority 
ON queue_jobs(status, priority, created_at);
```

### 5. Load Testing
```bash
# Regular load testing to identify limits
# Create test script to simulate high load
node scripts/load-test-queue.js --concurrent-jobs=50 --duration=300
```

## Related Issues
- [High Memory Usage](./high-memory-usage.md) - Memory issues affecting queue
- [Database Connection Issues](./database-connection-issues.md) - Database problems causing queue backup
- [Performance Degradation](./performance-degradation.md) - Overall system performance issues

## Escalation
If queue issues persist:
1. Check for application bugs causing infinite job creation
2. Consider horizontal scaling (multiple queue workers)
3. Evaluate queue technology alternatives (Redis, RabbitMQ)
4. Contact development team for code optimization

## Additional Resources
- Queue Management Best Practices
- Node.js Memory Management
- PostgreSQL Performance Tuning
- System Resource Monitoring