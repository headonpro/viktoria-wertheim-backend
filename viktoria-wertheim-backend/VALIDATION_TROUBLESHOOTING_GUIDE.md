# Validation Troubleshooting Guide

## Overview

This comprehensive guide documents the validation issues encountered in the Viktoria Wertheim Strapi backend, their root causes, and step-by-step resolution procedures. This documentation serves as a reference for troubleshooting similar validation problems in the future.

## Root Cause Analysis

### Primary Issue: Admin Interface vs API Validation Discrepancy

**Problem**: The Strapi admin interface throws "Validation error: Invalid status" when creating Mannschaft entries, while the API accepts the same data successfully.

**Root Causes Identified**:

1. **Schema Compilation Issues**
   - Admin interface uses cached/outdated schema definitions
   - TypeScript types not regenerated after schema changes
   - Build cache containing stale validation rules

2. **Database Constraint Mismatches**
   - PostgreSQL enum constraints not matching schema definitions
   - Migration scripts creating incorrect enum values
   - Case sensitivity issues in enum comparisons

3. **Validation Logic Inconsistencies**
   - Different validation paths for admin interface vs API
   - Frontend validation using different enum values than backend
   - Lifecycle hooks interfering with validation process

4. **Environment Configuration Issues**
   - Development vs production database differences
   - Environment variable misconfigurations
   - Package version incompatibilities

## Step-by-Step Troubleshooting Guide

### Phase 1: Initial Diagnosis

#### Step 1.1: Identify the Validation Error
```bash
# Check Strapi logs for specific error messages
npm run develop
# Look for validation errors in console output
```

**Common Error Patterns**:
- "Validation error: Invalid status"
- "Validation error: Invalid liga"
- "Value not in enum list"
- "Database constraint violation"

#### Step 1.2: Test API vs Admin Interface
```bash
# Test API endpoint directly
node scripts/test-mannschaft-creation.js

# Compare with admin interface behavior
# Navigate to Content Manager > Mannschaft > Create new entry
```

#### Step 1.3: Run Comprehensive Diagnostic
```bash
# Execute the comprehensive diagnostic script
node scripts/comprehensive-validation-diagnostic.js
```

### Phase 2: Schema Validation and Repair

#### Step 2.1: Verify Schema Definitions
```bash
# Check schema syntax and enum definitions
node scripts/schema-validation-checker.js
```

**What to Check**:
- Enum values in `src/api/mannschaft/content-types/mannschaft/schema.json`
- TypeScript type definitions in `types/generated/`
- Database schema constraints

#### Step 2.2: Rebuild Schema and Clear Cache
```bash
# Clear build cache and regenerate types
node scripts/schema-rebuild-utility.js

# Restart Strapi to reload schema
npm run develop
```

#### Step 2.3: Verify Schema Compilation
```bash
# Test schema compilation
node scripts/test-schema-compilation.js
```

### Phase 3: Database Integrity Validation

#### Step 3.1: Scan Database for Invalid Data
```bash
# Scan for invalid enum values
node scripts/database-enum-validation-scanner.js
```

#### Step 3.2: Repair Invalid Data
```bash
# Fix invalid enum values in existing records
node scripts/database-enum-repair.js
```

#### Step 3.3: Verify Database Constraints
```bash
# Check PostgreSQL enum constraints
node scripts/verify-database-constraints.js
```

### Phase 4: Validation Testing

#### Step 4.1: Test Admin Interface Validation
```bash
# Run automated admin interface tests
node scripts/admin-validation-tester.js
```

#### Step 4.2: Test API Consistency
```bash
# Run API consistency validation tests
npm test -- tests/api-consistency-validation.test.ts
```

#### Step 4.3: Run Comprehensive Validation Tests
```bash
# Execute full validation test suite
node scripts/run-comprehensive-validation-tests.js
```

### Phase 5: Monitoring and Prevention

#### Step 5.1: Set Up Validation Monitoring
```bash
# Start validation consistency monitor
node scripts/validation-consistency-monitor.js
```

#### Step 5.2: Run Validation Automation Suite
```bash
# Execute automated validation testing
node scripts/run-validation-automation-suite.js
```

## Common Validation Issues and Solutions

### Issue 1: "Invalid status" Error in Admin Interface

**Symptoms**:
- Admin interface rejects valid enum values
- API accepts the same values successfully
- Error appears during Mannschaft creation/editing

**Solution**:
1. Clear Strapi build cache: `rm -rf .strapi/`
2. Restart development server: `npm run develop`
3. Verify enum values in schema match database constraints
4. Test admin interface after restart

### Issue 2: Database Constraint Violations

**Symptoms**:
- PostgreSQL constraint violation errors
- Enum values not matching database schema
- Migration failures

**Solution**:
1. Check database enum definitions: `\dT+ mannschaft_status`
2. Update enum constraints if needed
3. Run database repair script: `node scripts/fix-postgres-enum.js`
4. Verify data integrity after repair

### Issue 3: TypeScript Type Mismatches

**Symptoms**:
- TypeScript compilation errors
- Type definitions not matching schema
- IDE showing incorrect enum options

**Solution**:
1. Regenerate types: `npm run build`
2. Check `types/generated/contentTypes.d.ts`
3. Verify enum types match schema definitions
4. Restart TypeScript language server

### Issue 4: Lifecycle Hook Interference

**Symptoms**:
- Validation errors in lifecycle hooks
- Data transformation causing validation failures
- Inconsistent validation behavior

**Solution**:
1. Check lifecycle hooks in `src/api/mannschaft/content-types/mannschaft/lifecycles.js`
2. Verify data transformations don't invalidate enum values
3. Add proper validation in lifecycle hooks
4. Test lifecycle hook behavior

## Preventive Measures

### 1. Schema Management Best Practices

**Guidelines**:
- Always restart Strapi after schema changes
- Clear build cache when modifying enums
- Verify TypeScript types after schema updates
- Test both admin interface and API after changes

**Automation**:
```bash
# Create schema change script
#!/bin/bash
rm -rf .strapi/
npm run build
npm run develop
```

### 2. Database Integrity Monitoring

**Regular Checks**:
- Weekly database enum validation scans
- Automated data integrity reports
- Constraint violation monitoring
- Migration verification procedures

**Monitoring Script**:
```bash
# Add to cron job for regular monitoring
0 2 * * 1 node scripts/database-enum-validation-scanner.js
```

### 3. Validation Testing Automation

**Continuous Testing**:
- Automated validation tests in CI/CD pipeline
- Pre-deployment validation checks
- Regular admin interface testing
- API consistency verification

**Test Integration**:
```json
{
  "scripts": {
    "test:validation": "node scripts/run-comprehensive-validation-tests.js",
    "precommit": "npm run test:validation"
  }
}
```

### 4. Development Environment Standards

**Environment Setup**:
- Consistent Node.js and npm versions
- Standardized database configurations
- Unified development dependencies
- Environment variable templates

**Configuration Management**:
- Use `.env.example` for environment templates
- Document required environment variables
- Validate environment setup in startup scripts
- Provide development environment verification

## Error Message Reference

### Common Validation Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Validation error: Invalid status" | Admin interface using cached validation | Clear cache, restart server |
| "Value not in enum list" | Database constraint mismatch | Update database enum constraints |
| "Cannot read property of undefined" | Missing enum definition | Verify schema enum definitions |
| "Database constraint violation" | Invalid data in database | Run data repair scripts |
| "Type error in lifecycle hook" | Lifecycle hook validation issue | Check lifecycle hook logic |

### Debugging Commands

```bash
# Check current enum values in database
psql -d viktoria_wertheim -c "SELECT unnest(enum_range(NULL::mannschaft_status));"

# Verify schema compilation
node -e "console.log(require('./types/generated/contentTypes.d.ts'))"

# Test API endpoint
curl -X POST http://localhost:1337/api/mannschaften \
  -H "Content-Type: application/json" \
  -d '{"data":{"name":"Test","status":"aktiv"}}'

# Check Strapi build cache
ls -la .strapi/

# Verify TypeScript types
npx tsc --noEmit
```

## Escalation Procedures

### When to Escalate

1. **Multiple validation systems failing simultaneously**
2. **Database corruption or constraint conflicts**
3. **Strapi core validation system issues**
4. **Environment-specific problems affecting production**

### Escalation Steps

1. **Document the Issue**:
   - Capture error messages and stack traces
   - Record steps to reproduce the problem
   - Note environment and version information
   - Gather relevant log files

2. **Gather Diagnostic Information**:
   ```bash
   # Run full diagnostic suite
   node scripts/comprehensive-validation-diagnostic.js > diagnostic-report.txt
   
   # Export database schema
   pg_dump --schema-only viktoria_wertheim > schema-backup.sql
   
   # Capture Strapi configuration
   tar -czf strapi-config.tar.gz config/ src/api/
   ```

3. **Contact Support Channels**:
   - Strapi Community Discord
   - GitHub Issues for Strapi repository
   - Internal development team escalation
   - Database administrator consultation

## Maintenance Schedule

### Daily Monitoring
- [ ] Check validation error logs
- [ ] Verify admin interface functionality
- [ ] Monitor API response consistency

### Weekly Maintenance
- [ ] Run comprehensive validation tests
- [ ] Check database integrity
- [ ] Review validation error reports
- [ ] Update documentation if needed

### Monthly Reviews
- [ ] Analyze validation trends
- [ ] Update preventive measures
- [ ] Review and update troubleshooting procedures
- [ ] Validate backup and recovery procedures

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-01-21 | Initial comprehensive troubleshooting guide | Kiro AI |

## Related Documentation

- [Comprehensive Validation Fix README](./COMPREHENSIVE_VALIDATION_FIX_README.md)
- [Validation Automation Suite](./VALIDATION_AUTOMATION_SUITE.md)
- [Validation Error Analysis Implementation](./VALIDATION_ERROR_ANALYSIS_IMPLEMENTATION.md)
- [Validation Diagnostic README](./VALIDATION_DIAGNOSTIC_README.md)

---

*This guide is maintained as part of the Viktoria Wertheim project validation system. For updates or questions, refer to the project documentation or contact the development team.*