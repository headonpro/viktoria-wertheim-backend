# Comprehensive Rollback Procedures

## Overview

This document provides detailed rollback procedures for the lifecycle hooks migration. Each rollback type includes step-by-step instructions, validation procedures, and recovery strategies to ensure system stability during emergency situations.

## Rollback Classification

### Rollback Types by Severity

#### Level 1: Feature Flag Rollback (< 5 minutes)
- **Risk**: Low
- **Impact**: Minimal
- **Scope**: Specific features only
- **Automation**: Fully automated

#### Level 2: Service Rollback (< 15 minutes)
- **Risk**: Medium
- **Impact**: Service interruption
- **Scope**: Specific services
- **Automation**: Semi-automated

#### Level 3: Configuration Rollback (< 30 minutes)
- **Risk**: Medium-High
- **Impact**: System reconfiguration
- **Scope**: System configuration
- **Automation**: Manual with scripts

#### Level 4: Full System Rollback (< 60 minutes)
- **Risk**: High
- **Impact**: Complete system restoration
- **Scope**: Entire system
- **Automation**: Manual process

---

## Level 1: Feature Flag Rollback

### When to Use
- Specific feature causing issues
- Performance degradation from new feature
- User experience problems
- Non-critical errors in feature

### Prerequisites
- Feature flag service operational
- Admin access to feature flag system
- Monitoring systems active

### Procedure

#### Step 1: Identify Problem Feature (1 minute)
```bash
# Check current feature flag status
curl -X GET http://localhost:1337/api/admin/feature-flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# Identify problematic flags from monitoring
curl -X GET http://localhost:1337/api/admin/monitoring/alerts \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.[] | select(.type == "feature")'
```

#### Step 2: Disable Specific Feature Flag (1 minute)
```bash
# Disable specific feature flag
curl -X POST http://localhost:1337/api/admin/feature-flags/disable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "flagName": "enableAdvancedValidation",
    "reason": "Performance issues detected",
    "disabledBy": "migration-team"
  }'
```

#### Step 3: Verify Flag Disabled (1 minute)
```bash
# Verify flag is disabled
curl -X GET http://localhost:1337/api/admin/feature-flags/enableAdvancedValidation \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected response: {"enabled": false, "disabledAt": "2024-01-15T10:30:00Z"}
```

#### Step 4: Monitor Impact (2 minutes)
```bash
# Monitor system metrics for improvement
curl -X GET http://localhost:1337/api/admin/monitoring/metrics \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.performance'

# Check error rates
curl -X GET http://localhost:1337/api/admin/monitoring/errors \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.errorRate'
```

### Validation Checklist
- [ ] Feature flag shows as disabled
- [ ] System performance improved
- [ ] Error rates decreased
- [ ] No new alerts generated
- [ ] User experience restored

### Recovery Strategy
If rollback doesn't resolve the issue:
1. Disable additional related flags
2. Escalate to Level 2 rollback
3. Contact development team

---

## Level 2: Service Rollback

### When to Use
- Service-specific failures
- Memory leaks in new services
- Background job processing issues
- Service integration problems

### Prerequisites
- Process management access (PM2/systemd)
- Service configuration backups
- Database connectivity
- Monitoring systems active

### Procedure

#### Step 1: Identify Problematic Services (2 minutes)
```bash
# Check service status
pm2 status

# Check service logs for errors
pm2 logs --lines 50

# Identify high resource usage
pm2 monit
```

#### Step 2: Stop New Migration Services (3 minutes)
```bash
# Stop background job processor
pm2 stop background-job-processor

# Stop hook monitoring dashboard
pm2 stop hook-monitoring-dashboard

# Stop calculation service workers
pm2 stop calculation-service-worker

# Verify services stopped
pm2 status | grep stopped
```

#### Step 3: Restore Previous Service Configuration (5 minutes)
```bash
# Backup current configuration
cp /app/config/hooks.json /app/config/hooks.json.rollback-$(date +%Y%m%d_%H%M%S)

# Restore previous configuration
cp /backup/config/hooks.json.pre-migration /app/config/hooks.json
cp /backup/config/database.js.pre-migration /app/config/database.js

# Validate configuration
node -e "console.log(JSON.parse(require('fs').readFileSync('/app/config/hooks.json', 'utf8')))"
```

#### Step 4: Restart Core Services (3 minutes)
```bash
# Restart Strapi with old configuration
pm2 restart strapi --update-env

# Wait for service to be ready
sleep 30

# Check service health
curl -f http://localhost:1337/api/health || echo "Service not ready"
```

#### Step 5: Verify System Functionality (2 minutes)
```bash
# Test basic CRUD operations
curl -X GET http://localhost:1337/api/teams \
  -H "Authorization: Bearer $API_TOKEN"

# Test admin panel access
curl -f http://localhost:1337/admin/init

# Check database connectivity
curl -X GET http://localhost:1337/api/admin/database/health \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Validation Checklist
- [ ] All core services running
- [ ] Database connectivity restored
- [ ] Admin panel accessible
- [ ] CRUD operations working
- [ ] No critical errors in logs
- [ ] Performance within normal range

### Recovery Strategy
If service rollback doesn't resolve the issue:
1. Check database connectivity
2. Restart database if needed
3. Escalate to Level 3 rollback
4. Contact infrastructure team

---

## Level 3: Configuration Rollback

### When to Use
- Configuration-related system failures
- Database connection issues
- Environment variable problems
- Middleware configuration errors

### Prerequisites
- Configuration backups available
- Database access
- File system write permissions
- Service restart capabilities

### Procedure

#### Step 1: Stop All Services (3 minutes)
```bash
# Stop all PM2 processes
pm2 stop all

# Verify all processes stopped
pm2 status

# Stop database connections gracefully
pm2 kill
```

#### Step 2: Backup Current Configuration (2 minutes)
```bash
# Create rollback backup directory
mkdir -p /backup/rollback-$(date +%Y%m%d_%H%M%S)

# Backup current configurations
cp -r /app/config/* /backup/rollback-$(date +%Y%m%d_%H%M%S)/
cp /app/.env /backup/rollback-$(date +%Y%m%d_%H%M%S)/
cp /app/package.json /backup/rollback-$(date +%Y%m%d_%H%M%S)/
```

#### Step 3: Restore Pre-Migration Configuration (10 minutes)
```bash
# Restore main configuration files
cp /backup/pre-migration/config/* /app/config/
cp /backup/pre-migration/.env /app/
cp /backup/pre-migration/package.json /app/

# Restore lifecycle hooks
cp -r /backup/pre-migration/src/api/*/content-types/*/lifecycles.ts /app/src/api/

# Restore database configuration
cp /backup/pre-migration/config/database.js /app/config/

# Validate restored configurations
node -c /app/config/database.js
node -c /app/config/server.js
```

#### Step 4: Reinstall Dependencies (10 minutes)
```bash
# Navigate to app directory
cd /app

# Clear node modules and reinstall
rm -rf node_modules
rm package-lock.json

# Install dependencies from restored package.json
npm install

# Verify critical dependencies
npm list @strapi/strapi pg typescript
```

#### Step 5: Database Configuration Validation (3 minutes)
```bash
# Test database connection
node -e "
const config = require('./config/database.js');
const { Client } = require('pg');
const client = new Client(config.connection);
client.connect()
  .then(() => { console.log('Database connected'); client.end(); })
  .catch(err => { console.error('Database error:', err); process.exit(1); });
"
```

#### Step 6: Restart Services (2 minutes)
```bash
# Start services with restored configuration
pm2 start ecosystem.config.js

# Wait for services to initialize
sleep 60

# Check service status
pm2 status
```

### Validation Checklist
- [ ] All configuration files restored
- [ ] Dependencies installed correctly
- [ ] Database connection working
- [ ] Services started successfully
- [ ] Admin panel accessible
- [ ] Basic functionality working
- [ ] No configuration errors in logs

### Recovery Strategy
If configuration rollback doesn't resolve the issue:
1. Check file permissions
2. Verify database server status
3. Escalate to Level 4 rollback
4. Contact system administrator

---

## Level 4: Full System Rollback

### When to Use
- Complete system failure
- Data corruption detected
- Multiple component failures
- Security incident
- Last resort scenario

### Prerequisites
- Full system backup available
- Database backup verified
- Administrative access
- Downtime window approved
- Team coordination established

### Procedure

#### Step 1: System Assessment and Preparation (5 minutes)
```bash
# Document current system state
pm2 status > /tmp/system-state-$(date +%Y%m%d_%H%M%S).log
df -h > /tmp/disk-usage-$(date +%Y%m%d_%H%M%S).log
free -m > /tmp/memory-usage-$(date +%Y%m%d_%H%M%S).log

# Notify stakeholders
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text": "🚨 CRITICAL: Full system rollback initiated"}'

# Set maintenance mode
echo "System under maintenance" > /app/public/maintenance.html
```

#### Step 2: Complete Service Shutdown (5 minutes)
```bash
# Stop all application services
pm2 stop all
pm2 kill

# Stop web server
sudo systemctl stop nginx

# Stop database (if local)
sudo systemctl stop postgresql

# Verify all processes stopped
ps aux | grep -E "(node|strapi|pm2)"
```

#### Step 3: Database Rollback (15 minutes)
```bash
# Create current database backup (safety measure)
pg_dump -h localhost -U postgres viktoria_db > /backup/emergency-backup-$(date +%Y%m%d_%H%M%S).sql

# Stop database
sudo systemctl stop postgresql

# Restore database from pre-migration backup
sudo -u postgres psql -c "DROP DATABASE IF EXISTS viktoria_db;"
sudo -u postgres psql -c "CREATE DATABASE viktoria_db;"
sudo -u postgres psql viktoria_db < /backup/pre-migration/database-full-backup.sql

# Start database
sudo systemctl start postgresql

# Verify database restoration
sudo -u postgres psql viktoria_db -c "SELECT COUNT(*) FROM teams;"
```

#### Step 4: Application Code Rollback (10 minutes)
```bash
# Navigate to application directory
cd /app

# Backup current state
tar -czf /backup/current-state-$(date +%Y%m%d_%H%M%S).tar.gz .

# Remove current application
rm -rf /app/*

# Restore from pre-migration backup
tar -xzf /backup/pre-migration/application-backup.tar.gz -C /app/

# Set correct permissions
chown -R app:app /app
chmod +x /app/scripts/*
```

#### Step 5: Configuration Restoration (5 minutes)
```bash
# Restore environment variables
cp /backup/pre-migration/.env /app/
cp /backup/pre-migration/.env.local /app/

# Restore all configuration files
cp -r /backup/pre-migration/config/* /app/config/

# Restore PM2 ecosystem
cp /backup/pre-migration/ecosystem.config.js /app/

# Validate configurations
node -c /app/config/database.js
node -c /app/config/server.js
```

#### Step 6: Dependencies and Build (10 minutes)
```bash
# Install dependencies from backup
cd /app
npm ci

# Build application
npm run build

# Verify build success
ls -la /app/build/
```

#### Step 7: Service Restart and Validation (10 minutes)
```bash
# Start database if not already running
sudo systemctl start postgresql

# Start application services
pm2 start ecosystem.config.js

# Start web server
sudo systemctl start nginx

# Wait for services to initialize
sleep 120

# Comprehensive health check
curl -f http://localhost:1337/api/health
curl -f http://localhost:1337/admin/init
curl -f http://localhost:3000/

# Test database connectivity
sudo -u postgres psql viktoria_db -c "SELECT 1;"
```

### Validation Checklist
- [ ] Database restored and accessible
- [ ] Application code rolled back
- [ ] All services running
- [ ] Web server operational
- [ ] Admin panel accessible
- [ ] Frontend application working
- [ ] Database queries successful
- [ ] No critical errors in logs
- [ ] System performance normal
- [ ] User authentication working

### Recovery Strategy
If full system rollback fails:
1. Contact infrastructure team immediately
2. Escalate to disaster recovery procedures
3. Consider restoring from older backup
4. Implement emergency maintenance page
5. Coordinate with hosting provider

---

## Automated Rollback Scripts

### Quick Feature Flag Disable Script
```bash
#!/bin/bash
# File: /app/scripts/quick-flag-disable.sh

FLAG_NAME=$1
REASON=${2:-"Emergency rollback"}

if [ -z "$FLAG_NAME" ]; then
    echo "Usage: $0 <flag_name> [reason]"
    exit 1
fi

echo "Disabling feature flag: $FLAG_NAME"
curl -X POST http://localhost:1337/api/admin/feature-flags/disable \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{\"flagName\": \"$FLAG_NAME\", \"reason\": \"$REASON\"}"

echo "Verifying flag disabled..."
sleep 2
curl -X GET http://localhost:1337/api/admin/feature-flags/$FLAG_NAME \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Service Rollback Script
```bash
#!/bin/bash
# File: /app/scripts/service-rollback.sh

echo "Starting service rollback..."

# Stop new services
pm2 stop background-job-processor hook-monitoring-dashboard calculation-service-worker

# Restore configuration
cp /backup/config/hooks.json.pre-migration /app/config/hooks.json

# Restart core service
pm2 restart strapi --update-env

# Wait and verify
sleep 30
curl -f http://localhost:1337/api/health || echo "Service health check failed"

echo "Service rollback completed"
```

### Emergency Full Rollback Script
```bash
#!/bin/bash
# File: /app/scripts/emergency-rollback.sh

set -e

echo "🚨 EMERGENCY FULL ROLLBACK INITIATED"
echo "Timestamp: $(date)"

# Notify team
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text": "🚨 EMERGENCY: Full system rollback in progress"}'

# Stop all services
echo "Stopping all services..."
pm2 stop all
pm2 kill
sudo systemctl stop nginx

# Database rollback
echo "Rolling back database..."
sudo systemctl stop postgresql
sudo -u postgres psql -c "DROP DATABASE IF EXISTS viktoria_db;"
sudo -u postgres psql -c "CREATE DATABASE viktoria_db;"
sudo -u postgres psql viktoria_db < /backup/pre-migration/database-full-backup.sql
sudo systemctl start postgresql

# Application rollback
echo "Rolling back application..."
cd /app
rm -rf /app/*
tar -xzf /backup/pre-migration/application-backup.tar.gz -C /app/
chown -R app:app /app

# Restore and restart
echo "Restoring configuration and restarting..."
cp /backup/pre-migration/.env /app/
npm ci
pm2 start ecosystem.config.js
sudo systemctl start nginx

# Verify
sleep 60
curl -f http://localhost:1337/api/health && echo "✅ Rollback successful" || echo "❌ Rollback verification failed"

echo "Emergency rollback completed at $(date)"
```

---

## Rollback Decision Matrix

### Automatic Rollback Triggers

| Condition | Threshold | Action | Rollback Level |
|-----------|-----------|--------|----------------|
| Error Rate | > 15% for 5 min | Auto disable flags | Level 1 |
| Response Time | > 500ms for 10 min | Auto disable features | Level 1 |
| Memory Usage | > 90% for 5 min | Restart services | Level 2 |
| Database Errors | > 10% for 2 min | Service rollback | Level 2 |
| System Availability | < 99% for 5 min | Configuration rollback | Level 3 |
| Security Alert | Critical severity | Full rollback | Level 4 |

### Manual Rollback Guidelines

#### Business Impact Assessment
- **Low Impact**: Feature flags only (Level 1)
- **Medium Impact**: Service restart acceptable (Level 2)
- **High Impact**: Configuration changes needed (Level 3)
- **Critical Impact**: Full system restoration (Level 4)

#### Time Constraints
- **< 5 minutes**: Level 1 only
- **< 15 minutes**: Level 1-2
- **< 30 minutes**: Level 1-3
- **< 60 minutes**: All levels

---

## Post-Rollback Procedures

### Immediate Actions (0-30 minutes)
1. **Verify System Stability**
   - Run health checks
   - Monitor error rates
   - Check user access
   - Validate core functionality

2. **Stakeholder Communication**
   - Notify management
   - Update status page
   - Inform support team
   - Communicate with users

3. **Documentation**
   - Log rollback details
   - Record timeline
   - Document issues found
   - Note resolution steps

### Short-term Actions (30 minutes - 2 hours)
1. **Root Cause Analysis**
   - Analyze logs and metrics
   - Identify failure points
   - Document lessons learned
   - Plan prevention measures

2. **System Monitoring**
   - Extended monitoring period
   - Performance validation
   - Error rate tracking
   - User experience verification

3. **Team Coordination**
   - Debrief session
   - Action item assignment
   - Timeline adjustment
   - Risk reassessment

### Long-term Actions (2+ hours)
1. **Issue Resolution**
   - Fix identified problems
   - Test solutions thoroughly
   - Update rollback procedures
   - Improve monitoring

2. **Process Improvement**
   - Update rollback scripts
   - Enhance automation
   - Improve documentation
   - Train team members

3. **Migration Planning**
   - Revise migration strategy
   - Update timeline
   - Adjust rollout plan
   - Strengthen validation

---

## Testing Rollback Procedures

### Regular Testing Schedule
- **Weekly**: Feature flag rollback tests
- **Monthly**: Service rollback tests
- **Quarterly**: Configuration rollback tests
- **Annually**: Full system rollback tests

### Test Scenarios
1. **Planned Rollback Test**
   - Scheduled maintenance window
   - Full team participation
   - Complete procedure validation
   - Performance measurement

2. **Emergency Simulation**
   - Unannounced drill
   - Time pressure simulation
   - Communication testing
   - Decision-making validation

3. **Partial Failure Simulation**
   - Component-specific failures
   - Cascading failure scenarios
   - Recovery procedure testing
   - Monitoring system validation

---

## Rollback Success Criteria

### Technical Criteria
- [ ] System restored to previous stable state
- [ ] All services operational
- [ ] Database integrity maintained
- [ ] Performance within acceptable range
- [ ] No data loss occurred

### Business Criteria
- [ ] User access restored
- [ ] Core functionality working
- [ ] Support tickets minimized
- [ ] Stakeholder confidence maintained
- [ ] Business operations uninterrupted

### Operational Criteria
- [ ] Rollback completed within SLA
- [ ] Team coordination effective
- [ ] Communication clear and timely
- [ ] Documentation complete
- [ ] Lessons learned captured

---

## Conclusion

These comprehensive rollback procedures provide multiple levels of recovery options for the lifecycle hooks migration. The key to successful rollback execution is:

1. **Preparation**: Regular testing and validation of procedures
2. **Speed**: Quick decision-making and execution
3. **Communication**: Clear and timely stakeholder updates
4. **Documentation**: Thorough recording of actions and outcomes
5. **Learning**: Continuous improvement of procedures

By following these procedures and maintaining regular testing, the team can confidently handle any issues that arise during the migration process, ensuring system stability and business continuity.