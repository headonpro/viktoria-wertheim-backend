# Validation and Cleanup Tools

This directory contains comprehensive validation and cleanup tools for the club collection implementation. These tools ensure data integrity, consistency, and quality across the entire system.

## Overview

The validation and cleanup tools are designed to:
- Validate club data integrity
- Check team-club consistency
- Clean up orphaned records
- Generate data quality reports
- Provide automated recommendations
- Fix issues automatically where possible

## Tools

### 1. Club Data Integrity Validation (`validate-club-data-integrity.js`)

Validates all aspects of club data integrity including schema validation, business rules, and data quality.

**Usage:**
```bash
node scripts/validate-club-data-integrity.js [options]
```

**Options:**
- `--fix-orphans` - Automatically fix orphaned records
- `--detailed` - Show detailed validation results
- `--export-report` - Export validation report to JSON
- `--club-id=ID` - Validate specific club only
- `--liga-id=ID` - Validate specific liga only

**Features:**
- Club data consistency validation
- Team-to-club mapping validation
- Liga-club relationship validation
- Orphaned record detection
- Data quality checks
- Automated recommendations
- Health score calculation

**Example:**
```bash
# Run full validation with detailed output
node scripts/validate-club-data-integrity.js --detailed --export-report

# Validate specific club and fix orphans
node scripts/validate-club-data-integrity.js --club-id=123 --fix-orphans

# Validate all clubs in a specific liga
node scripts/validate-club-data-integrity.js --liga-id=456 --detailed
```

### 2. Orphaned Records Cleanup (`cleanup-orphaned-records.js`)

Identifies and cleans up orphaned records across the club system.

**Usage:**
```bash
node scripts/cleanup-orphaned-records.js [options]
```

**Options:**
- `--dry-run` - Show what would be cleaned up without making changes
- `--force` - Skip confirmation prompts
- `--backup` - Create backup before cleanup
- `--type=TYPE` - Clean specific type only (spiele|tabellen|clubs|media|duplicates)
- `--older-than=N` - Clean records older than N days

**Features:**
- Spiele with invalid club references
- Tabellen-Einträge with invalid club references
- Clubs with invalid liga references
- Unused media files (logos)
- Duplicate records
- Automatic backup creation
- Confirmation prompts for safety

**Example:**
```bash
# Dry run to see what would be cleaned
node scripts/cleanup-orphaned-records.js --dry-run

# Clean up spiele with backup
node scripts/cleanup-orphaned-records.js --type=spiele --backup

# Force cleanup of all orphaned records
node scripts/cleanup-orphaned-records.js --force --backup
```

### 3. Team-Club Consistency Validation (`validate-team-club-consistency.js`)

Validates consistency between team and club data during the migration process.

**Usage:**
```bash
node scripts/validate-team-club-consistency.js [options]
```

**Options:**
- `--detailed` - Show detailed validation results
- `--fix-issues` - Automatically fix consistency issues
- `--export-report` - Export validation report to JSON
- `--team-id=ID` - Validate specific team only
- `--club-id=ID` - Validate specific club only

**Features:**
- Team-to-club mapping accuracy
- Spiele consistency (team vs club data)
- Tabellen-eintrag consistency
- Migration status validation
- Cross-reference validation
- Automatic issue fixing

**Example:**
```bash
# Run full consistency validation
node scripts/validate-team-club-consistency.js --detailed

# Fix consistency issues automatically
node scripts/validate-team-club-consistency.js --fix-issues

# Validate specific team mapping
node scripts/validate-team-club-consistency.js --team-id=123 --detailed
```

### 4. Data Quality Report Generator (`generate-data-quality-report.js`)

Generates comprehensive data quality reports with metrics, trends, and recommendations.

**Usage:**
```bash
node scripts/generate-data-quality-report.js [options]
```

**Options:**
- `--format=FORMAT` - Output format (json|html|csv) [default: json]
- `--output=PATH` - Output file path
- `--period=DAYS` - Analysis period in days [default: 30]
- `--detailed` - Include detailed analysis
- `--trends` - Include trend analysis
- `--email=ADDRESS` - Email report to address

**Features:**
- Data completeness analysis
- Data accuracy validation
- Performance metrics
- Trend analysis
- Automated recommendations
- Health score calculation
- Multiple output formats
- Executive summary

**Example:**
```bash
# Generate comprehensive report
node scripts/generate-data-quality-report.js --detailed --trends

# Generate HTML report for last 7 days
node scripts/generate-data-quality-report.js --format=html --period=7

# Generate and email report
node scripts/generate-data-quality-report.js --email=admin@example.com
```

### 5. Master Validation Runner (`run-all-validations.js`)

Orchestrates all validation and cleanup tools in a single comprehensive run.

**Usage:**
```bash
node scripts/run-all-validations.js [options]
```

**Options:**
- `--fix-issues` - Automatically fix issues where possible
- `--cleanup` - Run cleanup tools
- `--report` - Generate data quality report
- `--detailed` - Show detailed results
- `--export` - Export all reports
- `--email=ADDRESS` - Email reports to address
- `--dry-run` - Show what would be done without making changes

**Features:**
- Runs all validation tools in sequence
- Consolidates results and recommendations
- Provides overall health score
- Generates executive summary
- Exports comprehensive reports
- Prioritizes recommendations

**Example:**
```bash
# Run all validations with reports
node scripts/run-all-validations.js --report --detailed

# Run full validation and cleanup with fixes
node scripts/run-all-validations.js --cleanup --fix-issues --export

# Dry run to see what would be done
node scripts/run-all-validations.js --dry-run --detailed
```

## Health Scoring

All tools use a consistent health scoring system:

- **90-100%**: 🟢 Excellent - System is healthy
- **80-89%**: 🟡 Good - Minor issues, monitoring recommended
- **70-79%**: 🟠 Fair - Some issues need attention
- **Below 70%**: 🔴 Needs Attention - Immediate action required

## Validation Categories

### Data Integrity
- Required field validation
- Data type validation
- Business rule validation
- Constraint validation

### Data Consistency
- Team-club mapping consistency
- Cross-reference integrity
- Relationship validation
- Migration status validation

### Data Quality
- Completeness analysis
- Accuracy validation
- Duplicate detection
- Orphaned record identification

### Performance
- Query performance metrics
- Cache efficiency
- System load analysis
- Optimization recommendations

## Automated Recommendations

The tools generate prioritized recommendations:

- **HIGH Priority**: Critical issues requiring immediate attention
- **MEDIUM Priority**: Important issues that should be addressed soon
- **LOW Priority**: Minor improvements for optimization

## Action Items

Generated action items include:
- Specific tasks to resolve issues
- Assigned responsibility
- Estimated effort
- Due dates
- Required commands/scripts

## Reports and Exports

### JSON Reports
Detailed machine-readable reports with all validation data.

### HTML Reports
Human-readable reports with visualizations and summaries.

### CSV Reports
Tabular data suitable for spreadsheet analysis.

### Executive Summary
High-level overview for stakeholders with key metrics and recommendations.

## Integration with CI/CD

These tools can be integrated into CI/CD pipelines:

```bash
# In your CI/CD pipeline
node scripts/run-all-validations.js --report --export
if [ $? -ne 0 ]; then
  echo "Data validation failed - blocking deployment"
  exit 1
fi
```

## Monitoring and Alerting

Set up regular validation runs:

```bash
# Daily health check (cron job)
0 2 * * * cd /path/to/project && node scripts/run-all-validations.js --report

# Weekly comprehensive validation
0 3 * * 0 cd /path/to/project && node scripts/run-all-validations.js --cleanup --fix-issues --export --email=admin@example.com
```

## Error Handling

All tools include comprehensive error handling:
- Graceful degradation on failures
- Detailed error logging
- Recovery suggestions
- Safe rollback mechanisms

## Testing

Run the test suite to verify tool functionality:

```bash
npm test -- validation-cleanup-tools.test.js
```

## Best Practices

1. **Always run dry-run first** before making changes
2. **Create backups** before running cleanup operations
3. **Review recommendations** before applying automatic fixes
4. **Monitor health scores** regularly
5. **Address high-priority issues** immediately
6. **Schedule regular validation runs**
7. **Export reports** for historical tracking

## Troubleshooting

### Common Issues

**Database Connection Errors:**
- Ensure Strapi is properly configured
- Check database connectivity
- Verify environment variables

**Permission Errors:**
- Ensure proper file system permissions
- Check database user permissions
- Verify Strapi admin access

**Memory Issues:**
- Increase Node.js memory limit: `--max-old-space-size=4096`
- Process data in smaller batches
- Clear caches between operations

**Performance Issues:**
- Add database indexes for frequently queried fields
- Implement query caching
- Optimize database queries

### Getting Help

1. Check the error logs in the console output
2. Review the generated reports for detailed information
3. Run individual validation tools for specific issues
4. Check the test suite for expected behavior
5. Consult the Strapi documentation for API issues

## Contributing

When adding new validation rules or cleanup operations:

1. Follow the existing patterns and interfaces
2. Add comprehensive error handling
3. Include dry-run support
4. Add appropriate tests
5. Update documentation
6. Consider performance implications

## Security Considerations

- All tools include input validation
- Sensitive data is not logged
- Backup files are created securely
- Database operations use proper transactions
- User permissions are respected

## Performance Considerations

- Tools are designed to handle large datasets
- Memory usage is optimized
- Database queries are efficient
- Progress indicators for long operations
- Configurable batch sizes

## Future Enhancements

Planned improvements:
- Real-time monitoring dashboard
- Automated issue resolution
- Machine learning for anomaly detection
- Integration with external monitoring systems
- Advanced trend analysis
- Custom validation rules configuration