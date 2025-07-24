# Data Integrity Validation System

This document describes the automated validation and testing suite for ensuring data consistency after the team/mannschaft consolidation.

## Overview

The validation system consists of several components:

1. **Validation Scripts** - Standalone scripts for comprehensive data validation
2. **API Endpoints** - REST endpoints for running validations programmatically
3. **Unit Tests** - Test suite for validation logic
4. **Integration Tests** - End-to-end API testing
5. **Scheduled Monitoring** - Automated regular checks with alerting

## Components

### 1. Validation Scripts

#### `scripts/validate-data-consistency.js`
Comprehensive validation script that checks:
- Team relations and bidirectional consistency
- Spiel relations and required fields
- Spieler relations and constraints
- Removal of mannschaft references
- Data integrity and orphaned relations

**Usage:**
```bash
npm run validate:data
# or
node scripts/validate-data-consistency.js
```

**Environment Variables:**
- `STRAPI_URL` - Strapi server URL (default: http://localhost:1337)
- `STRAPI_API_TOKEN` - API token for authentication

#### `scripts/scheduled-data-check.js`
Scheduled monitoring script for regular data integrity checks with alerting.

**Usage:**
```bash
# Basic check
npm run validate:scheduled

# With email alerts
node scripts/scheduled-data-check.js --email

# With Slack alerts
node scripts/scheduled-data-check.js --slack

# Verbose output
node scripts/scheduled-data-check.js --verbose

# Generate report
npm run validate:report
```

**Environment Variables:**
- `STRAPI_URL` - Strapi server URL
- `STRAPI_API_TOKEN` - API token for authentication
- `ALERT_EMAIL` - Email address for alerts
- `SLACK_WEBHOOK` - Slack webhook URL for notifications
- `LOG_FILE` - Path to log file (default: logs/data-integrity.log)

### 2. API Endpoints

All endpoints are available under `/api/system-maintenance/data-integrity/`:

#### `GET /validate-all`
Run comprehensive data integrity validation.

**Query Parameters:**
- `checkBidirectional` (boolean) - Check bidirectional relations (default: true)
- `validateOrphans` (boolean) - Validate orphaned relations (default: true)
- `checkConstraints` (boolean) - Check field constraints (default: true)

**Response:**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "summary": {
      "totalChecks": 150,
      "passedChecks": 150,
      "failedChecks": 0
    }
  },
  "message": "All data integrity checks passed"
}
```

#### `GET /validate-teams`
Validate team relations specifically.

#### `GET /validate-spiele`
Validate spiel relations specifically.

#### `GET /validate-spielers`
Validate spieler relations specifically.

#### `GET /statistics`
Get data statistics for monitoring.

**Response:**
```json
{
  "success": true,
  "data": {
    "teams": 25,
    "spielers": 350,
    "spiele": 180,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

#### `GET /check-mannschaft-removal`
Verify that mannschaft references have been completely removed.

### 3. Data Integrity Service

The `DataIntegrityService` class provides programmatic access to validation functions:

```typescript
import DataIntegrityService from '../services/data-integrity';

const service = new DataIntegrityService();

// Run all validations
const result = await service.validateAllData({
  checkBidirectional: true,
  validateOrphans: true,
  checkConstraints: true
});

// Get statistics
const stats = await service.getDataStatistics();
```

### 4. Testing

#### Unit Tests
Located in `tests/unit/services/data-integrity.test.ts`

Run with:
```bash
npm run test:unit
```

#### Integration Tests
Located in `tests/integration/api/`

Run with:
```bash
npm run test:integration
```

#### Data Integrity Specific Tests
```bash
npm run test:data-integrity
```

## Validation Checks

### Team Validation
- ✅ Required fields (name)
- ✅ Unique name constraint
- ✅ Bidirectional relations with spieler
- ✅ Bidirectional relations with spiele
- ✅ No mannschaft references
- ✅ Valid enum values
- ✅ Proper relation population

### Spiel Validation
- ✅ Required relations (unser_team, heimclub, auswaertsclub)
- ✅ Required fields (datum, ist_heimspiel)
- ✅ Valid enum values (status)
- ✅ No mannschaft references
- ✅ Bidirectional team relations
- ✅ Proper relation population

### Spieler Validation
- ✅ Required fields (vorname, nachname)
- ✅ Valid enum values (status, position)
- ✅ Rueckennummer constraints (1-99)
- ✅ No mannschaft references
- ✅ Bidirectional hauptteam relations
- ✅ Bidirectional aushilfe_teams relations

### Data Integrity
- ✅ No orphaned relations
- ✅ Mannschaft content type removal
- ✅ Consistent bidirectional relations
- ✅ Field constraint validation
- ✅ Data type validation

## Monitoring and Alerting

### Scheduled Checks
Set up cron job for regular monitoring:

```bash
# Check every hour
0 * * * * cd /path/to/backend && npm run validate:scheduled

# Check daily with alerts
0 9 * * * cd /path/to/backend && node scripts/scheduled-data-check.js --email --slack
```

### Log Files
Validation logs are stored in `logs/data-integrity.log` with JSON format:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "success": true,
  "summary": {
    "totalChecks": 150,
    "passedChecks": 150,
    "failedChecks": 0
  },
  "errorCount": 0,
  "warningCount": 1,
  "errors": [],
  "warnings": ["No teams found in database"]
}
```

### Reports
Generate summary reports:

```bash
npm run validate:report
```

Creates `logs/data-integrity-report.json` with:
- Recent check summary
- Error trends
- Current statistics
- Success/failure rates

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure `STRAPI_API_TOKEN` is set correctly
   - Check token permissions in Strapi admin

2. **Connection Errors**
   - Verify `STRAPI_URL` is correct
   - Ensure Strapi server is running

3. **Validation Failures**
   - Check logs for specific error details
   - Run individual validation endpoints for debugging
   - Use `--verbose` flag for detailed output

### Debug Mode
Run validations with verbose output:

```bash
node scripts/validate-data-consistency.js --verbose
node scripts/scheduled-data-check.js --verbose
```

## Integration with CI/CD

Add validation to your deployment pipeline:

```yaml
# GitHub Actions example
- name: Validate Data Integrity
  run: |
    cd backend
    npm run validate:data
```

## Performance Considerations

- Validations are optimized for batch processing
- Large datasets are handled efficiently
- Bidirectional checks can be disabled for performance
- Use specific validation endpoints for targeted checks

## Security

- API endpoints should be protected in production
- Use proper authentication tokens
- Limit access to system maintenance endpoints
- Sanitize log outputs to avoid sensitive data exposure