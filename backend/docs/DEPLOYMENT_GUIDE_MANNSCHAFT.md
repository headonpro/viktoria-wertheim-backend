# Deployment Guide: Mannschaft Feature

## Overview

This guide provides step-by-step instructions for deploying the mannschaftsspezifische Game Cards feature to production. The deployment includes schema changes, data migration, and performance optimizations.

## Pre-Deployment Checklist

### 1. Environment Verification
- [ ] Backup production database
- [ ] Verify Strapi version compatibility (5.18.0+)
- [ ] Ensure PostgreSQL version supports required indexes
- [ ] Test deployment process in staging environment
- [ ] Verify all dependencies are installed

### 2. Code Verification
- [ ] All tests pass (unit, integration, e2e)
- [ ] Performance tests show acceptable results
- [ ] Frontend builds successfully
- [ ] Backend builds successfully
- [ ] No TypeScript errors

### 3. Data Preparation
- [ ] Review existing game cards data
- [ ] Identify any data inconsistencies
- [ ] Prepare rollback plan
- [ ] Document current data state

## Deployment Steps

### Phase 1: Backend Schema Migration

#### Step 1: Deploy Backend Code
```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
cd backend
npm install

# 3. Build application
npm run build
```

#### Step 2: Run Schema Migration
```bash
# 1. Stop the application (if running)
pm2 stop strapi-app  # or your process manager

# 2. Run schema migration
npm run strapi admin:reset --force  # Only if needed for schema changes
npm run develop  # This will apply schema changes automatically

# 3. Verify schema changes
# Check that mannschaft field exists in both content types
```

#### Step 3: Run Data Migration
```bash
# 1. Execute data migration script
node scripts/migrate-mannschaft-field.js

# 2. Verify migration results
# Check that all existing records have mannschaft="m1"
```

#### Step 4: Create Database Indexes
```bash
# 1. Run index creation script
node scripts/create-database-indexes.js

# 2. Verify indexes were created
# Check PostgreSQL for new indexes
```

### Phase 2: Performance Verification

#### Step 1: Run Performance Tests
```bash
# 1. Start the application
npm run start

# 2. Run performance tests
node scripts/performance-test-api.js

# 3. Verify results meet performance criteria
# - Average response time < 300ms
# - Filtering impact < 20%
# - Success rate > 95%
```

#### Step 2: Monitor Database Performance
```sql
-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE indexname LIKE '%mannschaft%';

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM game_cards WHERE mannschaft = 'm1';
EXPLAIN ANALYZE SELECT * FROM next_game_cards WHERE mannschaft = 'm2';
```

### Phase 3: Frontend Deployment

#### Step 1: Deploy Frontend Code
```bash
# 1. Navigate to frontend directory
cd ../frontend

# 2. Install dependencies
npm install

# 3. Build application
npm run build

# 4. Deploy to Vercel (or your hosting platform)
vercel --prod
```

#### Step 2: Verify Frontend Integration
- [ ] Test team switching functionality
- [ ] Verify API calls use correct filters
- [ ] Check error handling works properly
- [ ] Test all three teams show different data

### Phase 4: End-to-End Verification

#### Step 1: Functional Testing
```bash
# Run E2E tests
cd frontend
npm run test:e2e
```

#### Step 2: Manual Testing Checklist
- [ ] Homepage loads correctly
- [ ] Team buttons (1, 2, 3) are clickable
- [ ] Game cards update when switching teams
- [ ] Different data shows for different teams
- [ ] Fallback messages work when no data exists
- [ ] Error handling works properly
- [ ] Performance is acceptable on mobile

## Database Migration Scripts

### Schema Migration Verification
```sql
-- Verify mannschaft column exists
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name IN ('game_cards', 'next_game_cards') 
  AND column_name = 'mannschaft';

-- Check data distribution
SELECT mannschaft, COUNT(*) 
FROM game_cards 
GROUP BY mannschaft;

SELECT mannschaft, COUNT(*) 
FROM next_game_cards 
GROUP BY mannschaft;
```

### Index Verification
```sql
-- List all mannschaft-related indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE indexname LIKE '%mannschaft%'
ORDER BY tablename, indexname;
```

## Rollback Procedures

### Emergency Rollback (Frontend Only)
If issues are detected with frontend functionality:

```bash
# 1. Revert frontend deployment
vercel rollback

# 2. Or deploy previous version
git checkout previous-commit
npm run build
vercel --prod
```

### Full Rollback (Backend + Frontend)
If database issues are detected:

```bash
# 1. Stop application
pm2 stop strapi-app

# 2. Restore database backup
pg_restore -d viktoria_db backup_before_migration.sql

# 3. Revert code changes
git checkout previous-stable-commit

# 4. Rebuild and restart
npm run build
pm2 start strapi-app

# 5. Revert frontend
cd frontend
vercel rollback
```

## Monitoring and Alerts

### Key Metrics to Monitor

#### Performance Metrics
- API response times for game-cards endpoints
- Database query performance
- Frontend page load times
- Error rates

#### Functional Metrics
- Team switching success rate
- Data loading success rate
- User engagement with different teams

### Monitoring Setup
```javascript
// Example monitoring configuration
const monitoring = {
  apiEndpoints: [
    '/api/game-cards',
    '/api/next-game-cards'
  ],
  alertThresholds: {
    responseTime: 500, // ms
    errorRate: 5, // %
    availability: 99 // %
  }
};
```

## Post-Deployment Tasks

### Immediate (0-24 hours)
- [ ] Monitor error logs for any issues
- [ ] Check performance metrics
- [ ] Verify user feedback is positive
- [ ] Monitor database performance

### Short-term (1-7 days)
- [ ] Analyze usage patterns by team
- [ ] Optimize queries if needed
- [ ] Gather user feedback
- [ ] Document any issues found

### Long-term (1-4 weeks)
- [ ] Review performance trends
- [ ] Plan additional optimizations
- [ ] Consider additional features
- [ ] Update documentation based on learnings

## Troubleshooting Guide

### Common Issues

#### 1. Schema Migration Fails
**Symptoms:** Error during Strapi startup about missing columns
**Solution:**
```bash
# Check current schema
npm run strapi console
# In console: strapi.db.query('api::game-card.game-card').findMany()

# If needed, manually add columns
ALTER TABLE game_cards ADD COLUMN mannschaft VARCHAR(2) DEFAULT 'm1';
ALTER TABLE next_game_cards ADD COLUMN mannschaft VARCHAR(2) DEFAULT 'm1';
```

#### 2. Data Migration Incomplete
**Symptoms:** Some records have null mannschaft values
**Solution:**
```sql
-- Fix null values
UPDATE game_cards SET mannschaft = 'm1' WHERE mannschaft IS NULL;
UPDATE next_game_cards SET mannschaft = 'm1' WHERE mannschaft IS NULL;
```

#### 3. Index Creation Fails
**Symptoms:** Performance issues, index creation script errors
**Solution:**
```sql
-- Manually create indexes
CREATE INDEX CONCURRENTLY idx_game_cards_mannschaft ON game_cards(mannschaft);
CREATE INDEX CONCURRENTLY idx_next_game_cards_mannschaft ON next_game_cards(mannschaft);
```

#### 4. Frontend Shows Same Data for All Teams
**Symptoms:** All team buttons show identical game cards
**Solution:**
- Check API calls include correct filter parameters
- Verify backend returns different data for different teams
- Check teamService implementation

#### 5. Performance Degradation
**Symptoms:** Slow API responses after deployment
**Solution:**
- Verify indexes were created successfully
- Check database query plans
- Monitor database connection pool
- Consider query optimization

### Debug Commands

```bash
# Check Strapi logs
tail -f logs/strapi.log

# Check database connections
psql -d viktoria_db -c "SELECT * FROM pg_stat_activity WHERE datname = 'viktoria_db';"

# Test API endpoints manually
curl "http://localhost:1337/api/game-cards?filters[mannschaft][\$eq]=m1"
curl "http://localhost:1337/api/next-game-cards?filters[mannschaft][\$eq]=m2&populate=gegner_team"

# Check frontend build
cd frontend && npm run build 2>&1 | tee build.log
```

## Security Considerations

### Data Validation
- Mannschaft field accepts only valid values (m1, m2, m3)
- Input validation prevents SQL injection
- API endpoints maintain existing authentication requirements

### Access Control
- No changes to existing permission structure
- Game cards remain publicly readable
- Admin access required for content creation/modification

## Performance Benchmarks

### Expected Performance Metrics
- **API Response Time**: < 100ms average
- **Database Query Time**: < 50ms average
- **Frontend Load Time**: < 2 seconds on mobile
- **Filtering Overhead**: < 10% compared to unfiltered queries

### Performance Testing Results Template
```
Date: [DEPLOYMENT_DATE]
Environment: Production

API Performance:
- Game Cards (no filter): XXXms average
- Game Cards (with filter): XXXms average
- Next Game Cards (no filter): XXXms average  
- Next Game Cards (with filter): XXXms average

Database Performance:
- Index usage: XX% of queries use indexes
- Query execution time: XXms average
- Connection pool utilization: XX%

Frontend Performance:
- Page load time: XXXms
- Team switching time: XXXms
- Error rate: X.X%
```

## Success Criteria

The deployment is considered successful when:

- [ ] All automated tests pass
- [ ] Performance metrics meet benchmarks
- [ ] No critical errors in logs
- [ ] Users can successfully switch between teams
- [ ] Different data displays for different teams
- [ ] Fallback handling works correctly
- [ ] Mobile experience remains smooth
- [ ] Database performance is stable

## Contact Information

For deployment issues or questions:
- **Technical Lead**: [Name/Contact]
- **Database Admin**: [Name/Contact]
- **DevOps**: [Name/Contact]
- **Emergency Contact**: [Name/Contact]

## Appendix

### Environment Variables
```bash
# Required environment variables
DATABASE_URL=postgresql://user:pass@host:port/db
STRAPI_ADMIN_JWT_SECRET=your-secret
API_TOKEN_SALT=your-salt
```

### Useful SQL Queries
```sql
-- Check data distribution
SELECT 
    mannschaft,
    COUNT(*) as count,
    MIN(datum) as earliest_game,
    MAX(datum) as latest_game
FROM game_cards 
GROUP BY mannschaft;

-- Performance analysis
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('game_cards', 'next_game_cards')
  AND attname = 'mannschaft';
```

This deployment guide ensures a smooth and safe rollout of the mannschaftsspezifische Game Cards feature while maintaining system stability and performance.