# Database Connection Issues

## Overview
Database connection issues can cause the entire tabellen-automatisierung system to become unavailable. This runbook covers diagnosis and resolution of database connectivity problems.

## Symptoms
- Health check shows database as "unhealthy"
- API requests return 500 errors
- Log entries showing connection timeouts
- Queue jobs failing with database errors
- Admin panel becomes inaccessible

### Common Error Messages
```
Error: Connection terminated unexpectedly
Error: connect ECONNREFUSED 127.0.0.1:5432
Error: Connection pool exhausted
Error: Connection timeout
```

## Diagnosis

### Step 1: Check Database Service Status
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check database process
ps aux | grep postgres
```

### Step 2: Test Database Connectivity
```bash
# Test connection from application server
psql -h localhost -U strapi_user -d strapi_db -c "SELECT 1;"

# Check connection from Node.js application
node -e "
const { Client } = require('pg');
const client = new Client({
  host: 'localhost',
  user: 'strapi_user',
  database: 'strapi_db',
  password: process.env.DATABASE_PASSWORD
});
client.connect().then(() => {
  console.log('Connected successfully');
  client.end();
}).catch(err => {
  console.error('Connection failed:', err);
});
"
```

### Step 3: Check Connection Pool Status
```bash
# Check current connections
psql -U postgres -c "
SELECT 
  datname,
  numbackends,
  xact_commit,
  xact_rollback
FROM pg_stat_database 
WHERE datname = 'strapi_db';
"

# Check active connections
psql -U postgres -c "
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start
FROM pg_stat_activity 
WHERE datname = 'strapi_db';
"
```

### Step 4: Check System Resources
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check system load
top -n 1
```

## Resolution

### Scenario 1: Database Service Not Running

```bash
# Start PostgreSQL service
sudo systemctl start postgresql

# Enable auto-start on boot
sudo systemctl enable postgresql

# Verify service is running
sudo systemctl status postgresql
```

### Scenario 2: Connection Pool Exhausted

```bash
# Kill long-running connections
psql -U postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'strapi_db'
  AND state = 'idle'
  AND query_start < NOW() - INTERVAL '1 hour';
"

# Restart application to reset connection pool
sudo systemctl restart strapi-backend
```

### Scenario 3: Database Configuration Issues

Edit PostgreSQL configuration:
```bash
sudo nano /etc/postgresql/13/main/postgresql.conf
```

Key settings to check:
```
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
```

Edit connection settings:
```bash
sudo nano /etc/postgresql/13/main/pg_hba.conf
```

Ensure application can connect:
```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   strapi_db       strapi_user                             md5
host    strapi_db       strapi_user     127.0.0.1/32            md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Scenario 4: Network Issues

```bash
# Check if database port is open
netstat -tlnp | grep 5432

# Test network connectivity
telnet localhost 5432

# Check firewall rules
sudo ufw status
```

### Scenario 5: Disk Space Issues

```bash
# Check disk usage
df -h

# Clean up old log files
sudo find /var/log -name "*.log" -mtime +30 -delete

# Clean up old WAL files (if safe)
sudo -u postgres psql -c "SELECT pg_switch_wal();"
sudo -u postgres psql -c "CHECKPOINT;"
```

### Scenario 6: Application Configuration Issues

Check Strapi database configuration:
```bash
nano backend/config/database.js
```

Verify environment variables:
```bash
echo $DATABASE_HOST
echo $DATABASE_PORT
echo $DATABASE_NAME
echo $DATABASE_USERNAME
# Don't echo password for security
```

Update configuration if needed:
```javascript
module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', 'localhost'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'strapi_db'),
      user: env('DATABASE_USERNAME', 'strapi_user'),
      password: env('DATABASE_PASSWORD'),
      ssl: env.bool('DATABASE_SSL', false),
      pool: {
        min: env.int('DATABASE_POOL_MIN', 2),
        max: env.int('DATABASE_POOL_MAX', 10),
        acquireTimeoutMillis: env.int('DATABASE_POOL_ACQUIRE_TIMEOUT', 60000),
        createTimeoutMillis: env.int('DATABASE_POOL_CREATE_TIMEOUT', 30000),
        destroyTimeoutMillis: env.int('DATABASE_POOL_DESTROY_TIMEOUT', 5000),
        idleTimeoutMillis: env.int('DATABASE_POOL_IDLE_TIMEOUT', 30000),
        reapIntervalMillis: env.int('DATABASE_POOL_REAP_INTERVAL', 1000),
        createRetryIntervalMillis: env.int('DATABASE_POOL_CREATE_RETRY_INTERVAL', 200),
      }
    },
  },
});
```

## Verification

### Step 1: Test Database Connection
```bash
# Test direct connection
psql -h localhost -U strapi_user -d strapi_db -c "SELECT NOW();"
```

### Step 2: Check Application Health
```bash
# Check health endpoint
curl -f http://localhost:1337/api/tabellen-eintraege/monitoring/health/database

# Expected response:
# {
#   "data": {
#     "name": "database",
#     "status": "healthy",
#     "responseTime": 50,
#     "lastCheck": "2023-12-01T12:00:00.000Z",
#     "metrics": {
#       "responseTime": 50,
#       "activeConnections": 5,
#       "idleConnections": 3
#     }
#   }
# }
```

### Step 3: Test Application Functionality
```bash
# Test API endpoint
curl -f http://localhost:1337/api/tabellen-eintraege

# Test admin panel access
curl -f http://localhost:1337/admin
```

### Step 4: Monitor Connection Pool
```bash
# Check connection pool status
psql -U postgres -c "
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity 
WHERE datname = 'strapi_db';
"
```

## Prevention

### 1. Connection Pool Configuration
- Set appropriate pool sizes based on expected load
- Configure connection timeouts
- Monitor connection usage regularly

### 2. Database Monitoring
```bash
# Add to crontab for regular monitoring
*/5 * * * * psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'strapi_db';" >> /var/log/db-connections.log
```

### 3. Automated Health Checks
Ensure health checks are configured and alerting is set up:
```javascript
// In health check configuration
{
  database: {
    enabled: true,
    interval: 30000, // 30 seconds
    timeout: 10000,  // 10 seconds
    thresholds: {
      responseTime: { warning: 1000, error: 5000 },
      availability: { warning: 95, error: 90 }
    }
  }
}
```

### 4. Regular Maintenance
- Schedule regular database maintenance
- Monitor disk space usage
- Review and optimize slow queries
- Update database statistics regularly

### 5. Backup and Recovery
- Ensure regular database backups
- Test backup restoration procedures
- Document recovery procedures

## Related Issues
- [High Memory Usage](./high-memory-usage.md) - Database memory issues
- [Performance Degradation](./performance-degradation.md) - Slow database queries
- [Emergency System Restart](./emergency-restart.md) - When database restart is needed

## Escalation
If database issues persist after following this runbook:
1. Contact Database Administrator
2. Check for hardware issues
3. Consider database failover if available
4. Escalate to development team for application-level issues

## Additional Resources
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Strapi Database Configuration: https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/required/databases.html
- Connection Pool Tuning Guide: https://node-postgres.com/features/pooling