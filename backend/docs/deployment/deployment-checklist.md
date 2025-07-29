# Deployment Checklist

## Pre-Deployment Checklist

### Environment Preparation
- [ ] Environment configuration file exists (`config/environments/{environment}.json`)
- [ ] Environment variables file configured (`.env.{environment}`)
- [ ] Database connection tested
- [ ] Required directories created (`logs`, `snapshots`, `backups`)
- [ ] File permissions set correctly
- [ ] SSL certificates installed (production only)

### Code Preparation
- [ ] All tests passing (`npm run test`)
- [ ] Code reviewed and approved
- [ ] Database migrations prepared and tested
- [ ] Build process tested (`npm run build`)
- [ ] Dependencies updated and security checked

### Infrastructure Preparation
- [ ] Database backup created
- [ ] Application backup created
- [ ] Monitoring systems ready
- [ ] Load balancer/proxy configured
- [ ] DNS records updated (if needed)

## Deployment Process

### Standard Deployment
1. [ ] Run pre-deployment checks
   ```bash
   npm run deploy:verify
   ```

2. [ ] Create backup
   ```bash
   # Automatic backup is created during deployment
   npm run deploy:{environment}
   ```

3. [ ] Run database migrations
   ```bash
   npm run migrate
   ```

4. [ ] Deploy application
   ```bash
   npm run deploy:{environment}
   ```

5. [ ] Verify deployment
   ```bash
   npm run deploy:verify
   ```

### Zero-Downtime Deployment
1. [ ] Check current deployment status
   ```bash
   npm run deploy:status
   ```

2. [ ] Run zero-downtime deployment
   ```bash
   npm run deploy:zero-downtime
   ```

3. [ ] Monitor deployment progress
   ```bash
   tail -f logs/deployment-*.log
   ```

4. [ ] Verify new deployment
   ```bash
   npm run deploy:verify
   ```

## Post-Deployment Checklist

### Immediate Verification
- [ ] Application starts successfully
- [ ] Health checks passing
- [ ] Database connectivity verified
- [ ] API endpoints responding
- [ ] Admin panel accessible
- [ ] Automation services running

### Functional Testing
- [ ] User authentication working
- [ ] Table calculation automation working
- [ ] Queue processing functional
- [ ] Snapshot creation working
- [ ] Admin panel features working
- [ ] Frontend integration working

### Performance Testing
- [ ] Response times acceptable
- [ ] Database queries optimized
- [ ] Memory usage normal
- [ ] CPU usage normal
- [ ] Cache performance verified

### Monitoring Setup
- [ ] Application logs being written
- [ ] Error monitoring active
- [ ] Performance metrics collecting
- [ ] Alerts configured and tested
- [ ] Backup processes scheduled

## Rollback Procedures

### Automatic Rollback
If deployment verification fails, automatic rollback will be triggered:
```bash
# Rollback is automatic on failure
npm run deploy:rollback
```

### Manual Rollback
If issues are discovered after deployment:
```bash
# For zero-downtime deployments
npm run deploy:rollback

# For standard deployments
bash scripts/deploy.sh {environment} rollback
```

### Emergency Rollback
For critical issues requiring immediate rollback:
1. [ ] Stop current application
2. [ ] Restore database from backup
3. [ ] Restore application files from backup
4. [ ] Start previous version
5. [ ] Verify rollback successful

## Environment-Specific Considerations

### Development
- [ ] Local database running
- [ ] Frontend development server compatible
- [ ] Debug logging enabled
- [ ] Test data available

### Staging
- [ ] Production-like data available
- [ ] SSL certificates valid
- [ ] External integrations configured
- [ ] Performance testing completed

### Production
- [ ] Maintenance window scheduled
- [ ] Stakeholders notified
- [ ] Monitoring alerts configured
- [ ] Backup retention verified
- [ ] Security scanning completed
- [ ] Load testing completed

## Troubleshooting

### Common Issues

#### Database Connection Failures
```bash
# Check database connectivity
npm run check:db

# Verify environment variables
echo $DATABASE_HOST $DATABASE_NAME $DATABASE_USERNAME
```

#### Migration Failures
```bash
# Check migration status
npm run migrate:status

# Validate migrations
npm run migrate:validate

# Rollback last migration
npm run migrate:rollback
```

#### Application Start Failures
```bash
# Check logs
tail -f logs/strapi.log

# Verify configuration
node -e "console.log(require('./config/environment.json'))"

# Check file permissions
ls -la logs/ snapshots/ backups/
```

#### Health Check Failures
```bash
# Manual health check
curl -f http://localhost:1337/api/health

# Check specific services
curl -f http://localhost:1337/api/tabellen-eintraege/queue-status
```

### Recovery Procedures

#### Database Recovery
1. Stop application
2. Restore database from backup
3. Run data integrity checks
4. Restart application

#### Application Recovery
1. Stop current deployment
2. Restore from backup
3. Verify configuration
4. Start application
5. Run verification tests

#### Configuration Recovery
1. Restore configuration files
2. Verify environment variables
3. Restart services
4. Test functionality

## Monitoring and Maintenance

### Daily Checks
- [ ] Application health status
- [ ] Error log review
- [ ] Performance metrics review
- [ ] Backup verification

### Weekly Checks
- [ ] Security updates available
- [ ] Database performance review
- [ ] Storage usage review
- [ ] Monitoring system health

### Monthly Checks
- [ ] Full backup restoration test
- [ ] Disaster recovery drill
- [ ] Performance optimization review
- [ ] Security audit

## Contact Information

### Emergency Contacts
- **System Administrator**: admin@viktoria-wertheim.de
- **Database Administrator**: dba@viktoria-wertheim.de
- **Development Team**: dev@viktoria-wertheim.de

### Support Resources
- **Documentation**: `/docs/`
- **Runbooks**: `/docs/operational-runbooks/`
- **Monitoring Dashboard**: `http://monitoring.viktoria-wertheim.de`
- **Log Aggregation**: `http://logs.viktoria-wertheim.de`