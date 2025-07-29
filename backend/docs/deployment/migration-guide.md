# Migration Guide: Manual to Automatic Table Calculation

## Overview

This guide covers the complete migration process from manual table management to the automated table calculation system. The migration includes data validation, system preparation, and gradual rollout procedures.

## Prerequisites

### System Requirements
- PostgreSQL database with automation tables created
- Node.js environment with all dependencies installed
- Backup and restore capabilities
- Administrative access to the system

### Pre-Migration Checklist
- [ ] Database migrations applied (`npm run migrate`)
- [ ] Automation system tested in development
- [ ] Data backup created
- [ ] Stakeholders notified of migration timeline
- [ ] Rollback plan prepared

## Migration Process

### Phase 1: Data Validation and Preparation

#### 1.1 Validate Existing Data
```bash
# Run comprehensive data validation
npm run data:validate

# Generate detailed validation report
npm run data:report
```

**Expected Output:**
- Data integrity report
- List of inconsistencies (if any)
- Recommendations for fixes

#### 1.2 Repair Data Issues (if needed)
```bash
# Dry run to see what would be fixed
npm run data:repair:dry-run

# Apply fixes (interactive)
npm run data:repair
```

**Common Issues Fixed:**
- Negative values in table entries
- Mathematical inconsistencies (games ≠ wins + draws + losses)
- Orphaned records
- Duplicate entries

#### 1.3 Verify Data Consistency
```bash
# Re-run validation after repairs
npm run data:validate
```

### Phase 2: System Migration

#### 2.1 Run Migration Script
```bash
# Interactive migration process
npm run data:migrate-to-automation
```

**Migration Steps:**
1. Creates pre-migration snapshot
2. Validates data integrity
3. Marks existing entries as manually calculated
4. Initializes automation columns
5. Creates audit log entries
6. Tests automation system

#### 2.2 Verify Migration Success
```bash
# Check migration results
npm run data:report

# Verify deployment
npm run deploy:verify
```

### Phase 3: Gradual Rollout

#### 3.1 Enable Automation Features
Update configuration files to enable automation:

```json
// config/environments/{environment}.json
{
  "automation": {
    "features": {
      "automaticCalculation": true,
      "queueProcessing": true,
      "snapshotCreation": true
    }
  }
}
```

#### 3.2 Test with Limited Data
1. Select a test league/season
2. Enable automation for new games only
3. Monitor calculation accuracy
4. Compare with manual calculations

#### 3.3 Full Rollout
1. Enable automation for all leagues
2. Monitor system performance
3. Verify calculation accuracy
4. Handle any issues promptly

## Data Validation Tools

### validate-existing-data.js
Comprehensive validation of existing table data.

**Usage:**
```bash
node scripts/validate-existing-data.js
```

**Checks:**
- Invalid game scores
- Self-playing teams
- Orphaned records
- Mathematical inconsistencies
- Referential integrity

### data-consistency-repair.js
Interactive tool to fix common data issues.

**Usage:**
```bash
# Dry run (no changes)
node scripts/data-consistency-repair.js --dry-run

# Interactive repair
node scripts/data-consistency-repair.js
```

**Repairs:**
- Reset invalid finished games to planned status
- Remove games where team plays against itself
- Fix negative values in table entries
- Correct mathematical inconsistencies
- Remove duplicate entries
- Delete orphaned records
- Recalculate all table entries from game results

### migrate-to-automation.js
Main migration script from manual to automatic system.

**Usage:**
```bash
node scripts/migrate-to-automation.js
```

**Process:**
1. Prerequisites check
2. Pre-migration snapshot
3. Data validation
4. Mark existing entries as manual
5. Initialize automation columns
6. Create audit logs
7. Test automation system
8. Generate migration report

### generate-validation-report.js
Generates comprehensive validation and health reports.

**Usage:**
```bash
node scripts/generate-validation-report.js
```

**Report Sections:**
- Database overview
- Data integrity
- Calculation accuracy
- Performance metrics
- Automation system status

## Configuration Management

### Environment-Specific Settings

#### Development
```json
{
  "automation": {
    "queue": {
      "concurrency": 2,
      "maxRetries": 3
    },
    "features": {
      "debugMode": true
    }
  }
}
```

#### Staging
```json
{
  "automation": {
    "queue": {
      "concurrency": 3,
      "maxRetries": 3
    },
    "cache": {
      "provider": "redis"
    }
  }
}
```

#### Production
```json
{
  "automation": {
    "queue": {
      "concurrency": 5,
      "maxRetries": 3
    },
    "monitoring": {
      "alerting": {
        "enabled": true
      }
    }
  }
}
```

## Monitoring and Maintenance

### Daily Checks
```bash
# Generate health report
npm run data:report

# Check system status
npm run deploy:verify
```

### Weekly Maintenance
```bash
# Validate data integrity
npm run data:validate

# Check for performance issues
# Review automation logs
# Verify backup procedures
```

### Monthly Tasks
```bash
# Full system validation
npm run data:report

# Performance optimization review
# Security updates
# Backup restoration test
```

## Troubleshooting

### Common Issues

#### Migration Fails with Data Inconsistencies
```bash
# 1. Run data validation
npm run data:validate

# 2. Fix issues
npm run data:repair

# 3. Retry migration
npm run data:migrate-to-automation
```

#### Calculation Results Don't Match
```bash
# 1. Generate validation report
npm run data:report

# 2. Check for data issues
npm run data:validate

# 3. Recalculate tables
npm run data:repair
# Select "Recalculate all table entries"
```

#### Performance Issues
```bash
# 1. Generate performance report
npm run data:report

# 2. Check database indexes
# 3. Review query performance
# 4. Consider caching optimization
```

### Rollback Procedures

#### Immediate Rollback (Emergency)
```bash
# 1. Disable automation
# Update config: automaticCalculation: false

# 2. Restore from pre-migration snapshot
# Use admin panel or database restore

# 3. Verify system functionality
npm run deploy:verify
```

#### Gradual Rollback
```bash
# 1. Disable automation for new calculations
# 2. Keep existing automated entries
# 3. Resume manual calculation process
# 4. Plan future migration attempt
```

## Best Practices

### Before Migration
1. **Test thoroughly** in development environment
2. **Create comprehensive backups** of all data
3. **Validate data integrity** before starting
4. **Plan for rollback scenarios**
5. **Communicate with stakeholders**

### During Migration
1. **Monitor progress closely**
2. **Validate each step** before proceeding
3. **Keep detailed logs** of all actions
4. **Be prepared to rollback** if issues arise
5. **Test functionality** after each phase

### After Migration
1. **Monitor system performance**
2. **Verify calculation accuracy**
3. **Maintain regular backups**
4. **Update documentation**
5. **Train users** on new system

## Support and Resources

### Documentation
- [Deployment Checklist](./deployment-checklist.md)
- [Operational Runbooks](../operational-runbooks/)
- [API Documentation](../api/)

### Scripts and Tools
- `scripts/validate-existing-data.js` - Data validation
- `scripts/data-consistency-repair.js` - Data repair
- `scripts/migrate-to-automation.js` - Migration
- `scripts/generate-validation-report.js` - Reporting

### Monitoring
- Health check endpoints
- Validation reports
- Performance metrics
- Audit logs

### Emergency Contacts
- System Administrator: admin@viktoria-wertheim.de
- Development Team: dev@viktoria-wertheim.de
- Database Administrator: dba@viktoria-wertheim.de