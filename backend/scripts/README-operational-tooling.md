# Club System Operational Tooling

This directory contains comprehensive operational tooling for maintaining, monitoring, and troubleshooting the club collection implementation.

## Overview

The operational tooling suite provides four main categories of tools:

1. **Maintenance Scripts** - Data cleanup and system maintenance
2. **Backup & Restore** - Data protection and recovery
3. **Diagnostics** - Issue identification and troubleshooting
4. **Health Checks** - Automated monitoring and alerting

## Tools

### 1. Club Maintenance (`club-maintenance.js`)

Comprehensive maintenance tool for club data cleanup and system optimization.

**Features:**
- Cleanup orphaned club records
- Remove duplicate club names
- Validate club data integrity
- Clean up old calculation data
- Optimize database performance

**Usage:**
```bash
# Run all maintenance operations
node scripts/club-maintenance.js

# Run specific operations
node scripts/club-maintenance.js orphaned    # Clean orphaned clubs
node scripts/club-maintenance.js duplicates # Remove duplicates
node scripts/club-maintenance.js validate   # Validate data integrity
node scripts/club-maintenance.js cleanup    # Clean old data
node scripts/club-maintenance.js optimize   # Optimize database
```

**Configuration:**
```bash
# Environment variables
CLUB_DATA_RETENTION_DAYS=90  # How long to keep old data
```

### 2. Backup & Restore (`club-backup-restore.js`)

Complete backup and restore system for club data protection.

**Features:**
- Full system backups
- Incremental backups
- Selective table restoration
- Backup verification with checksums
- Automated backup cleanup

**Usage:**
```bash
# Create full backup
node scripts/club-backup-restore.js full

# Create incremental backup
node scripts/club-backup-restore.js incremental

# List available backups
node scripts/club-backup-restore.js list

# Restore from backup
node scripts/club-backup-restore.js restore backup-name

# Clean up old backups
node scripts/club-backup-restore.js cleanup
```

**Backup Structure:**
```
backups/club-data/
├── club-full-backup-2024-01-15T10-30-00.json.gz
├── club-full-backup-2024-01-15T10-30-00.metadata.json
├── club-incremental-backup-2024-01-15T16-30-00.json.gz
└── club-incremental-backup-2024-01-15T16-30-00.metadata.json
```

### 3. Diagnostics (`club-diagnostics.js`)

Comprehensive diagnostic tool for identifying system issues.

**Features:**
- Database health checks
- Club data integrity validation
- Performance metrics analysis
- Cache system diagnostics
- Monitoring system health
- File system checks

**Usage:**
```bash
# Run all diagnostic checks
node scripts/club-diagnostics.js

# Run specific checks
node scripts/club-diagnostics.js database     # Database health
node scripts/club-diagnostics.js data        # Data integrity
node scripts/club-diagnostics.js performance # Performance metrics
node scripts/club-diagnostics.js cache       # Cache system
node scripts/club-diagnostics.js monitoring  # Monitoring health
node scripts/club-diagnostics.js filesystem  # File system
```

**Output:**
- Console output with color-coded results
- Detailed JSON reports saved to `logs/diagnostics/`
- Prioritized recommendations for issues

### 4. Health Checks (`club-health-check.js`)

Automated health monitoring with alerting capabilities.

**Features:**
- Scheduled basic and deep health checks
- Real-time alerting via webhook/email/Slack
- Health history tracking
- Configurable alert thresholds
- Automatic issue detection

**Usage:**
```bash
# Start automated health checks
node scripts/club-health-check.js start

# Run single health check
node scripts/club-health-check.js check

# Run deep health check
node scripts/club-health-check.js deep

# Show health status
node scripts/club-health-check.js status
```

**Configuration:**
```bash
# Health check settings
CLUB_HEALTH_CHECK_ENABLED=true
CLUB_HEALTH_CHECK_INTERVAL="*/5 * * * *"      # Every 5 minutes
CLUB_DEEP_CHECK_INTERVAL="0 */6 * * *"        # Every 6 hours

# Alert thresholds
CLUB_HEALTH_CONSECUTIVE_FAILURES=3
CLUB_HEALTH_RESPONSE_TIME_WARNING=1000
CLUB_HEALTH_RESPONSE_TIME_CRITICAL=5000
CLUB_HEALTH_ERROR_RATE_WARNING=0.05
CLUB_HEALTH_ERROR_RATE_CRITICAL=0.1

# Notification channels
CLUB_HEALTH_WEBHOOK_URL=https://your-webhook-url
CLUB_HEALTH_EMAIL=admin@example.com
CLUB_HEALTH_SLACK_WEBHOOK=https://hooks.slack.com/...

# Data retention
CLUB_HEALTH_HISTORY_DAYS=7
CLUB_HEALTH_MAX_HISTORY=1000
```

## Integration with Existing Systems

### Monitoring Service Integration

All tools integrate with the existing monitoring service:

```javascript
// Get monitoring service
const monitoringService = strapi.service('api::club.monitoring-service');

// Record maintenance metrics
monitoringService.recordMetric('maintenance_operations', 1, {
  operation: 'cleanup_orphaned_clubs',
  status: 'success'
});

// Check system health
const systemStatus = await monitoringService.getSystemStatus();
```

### Cache Manager Integration

Tools work with the cache manager for performance optimization:

```javascript
// Get cache manager
const cacheManager = strapi.service('api::club.cache-manager');

// Test cache operations
await cacheManager.set('test_key', 'test_value', 60);
const value = await cacheManager.get('test_key');
await cacheManager.delete('test_key');

// Get cache metrics
const metrics = await cacheManager.getMetrics();
```

## Automation and Scheduling

### Cron Job Setup

Set up automated maintenance and health checks:

```bash
# Add to crontab
# Daily maintenance at 2 AM
0 2 * * * cd /path/to/backend && node scripts/club-maintenance.js >> logs/maintenance.log 2>&1

# Weekly full backup on Sundays at 3 AM
0 3 * * 0 cd /path/to/backend && node scripts/club-backup-restore.js full >> logs/backup.log 2>&1

# Daily incremental backup at 6 AM
0 6 * * * cd /path/to/backend && node scripts/club-backup-restore.js incremental >> logs/backup.log 2>&1

# Weekly diagnostics on Mondays at 4 AM
0 4 * * 1 cd /path/to/backend && node scripts/club-diagnostics.js >> logs/diagnostics.log 2>&1
```

### Systemd Service (Linux)

Create a systemd service for continuous health monitoring:

```ini
# /etc/systemd/system/club-health-check.service
[Unit]
Description=Club Health Check Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/backend
ExecStart=/usr/bin/node scripts/club-health-check.js start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl enable club-health-check
sudo systemctl start club-health-check
sudo systemctl status club-health-check
```

## Logging and Reporting

### Log Structure

All tools create structured logs in the `logs/` directory:

```
logs/
├── maintenance/
│   ├── club-maintenance-2024-01-15T10-30-00.json
│   └── club-maintenance-2024-01-15T16-45-00.json
├── diagnostics/
│   ├── club-diagnostics-2024-01-15T10-30-00.json
│   └── club-diagnostics-2024-01-15T16-45-00.json
├── health-checks/
│   ├── health-history-2024-01-15T10-30-00.json
│   └── health-history-2024-01-15T16-45-00.json
└── backup.log
```

### Report Format

All tools generate standardized JSON reports:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "operations": [
    {
      "operation": "cleanup_orphaned_clubs",
      "status": "success",
      "timestamp": "2024-01-15T10:30:05.000Z",
      "details": {
        "message": "Cleaned up 3 orphaned clubs",
        "cleaned": 3,
        "totalChecked": 15
      }
    }
  ],
  "errors": [],
  "warnings": [],
  "summary": {
    "totalOperations": 5,
    "successfulOperations": 4,
    "warnings": 1,
    "errors": 0
  }
}
```

## Error Handling and Recovery

### Graceful Error Handling

All tools implement comprehensive error handling:

- **Database Connection Failures**: Automatic retry with exponential backoff
- **File System Errors**: Graceful degradation and alternative paths
- **Memory Issues**: Chunked processing for large datasets
- **Network Timeouts**: Configurable timeouts and retry logic

### Recovery Procedures

1. **Database Issues**: 
   - Check connection settings
   - Verify database server status
   - Run diagnostic checks
   - Restore from backup if necessary

2. **Data Corruption**:
   - Run data integrity validation
   - Use backup restore for affected data
   - Re-run table calculations
   - Verify system consistency

3. **Performance Issues**:
   - Run performance diagnostics
   - Check system resources
   - Optimize database queries
   - Clear caches if needed

## Security Considerations

### Access Control

- Scripts require appropriate file system permissions
- Database operations use configured Strapi credentials
- Backup files are stored with restricted permissions
- Sensitive configuration via environment variables

### Data Protection

- Backup files are compressed and checksummed
- Sensitive data is excluded from diagnostic reports
- Log files are rotated and cleaned up automatically
- Network communications use secure protocols

## Performance Impact

### Resource Usage

- **Maintenance**: Low impact, runs during off-peak hours
- **Backup**: Medium impact during backup creation
- **Diagnostics**: Low impact, read-only operations
- **Health Checks**: Minimal impact, lightweight checks

### Optimization

- Database operations use efficient queries
- Large datasets are processed in chunks
- Caching is used where appropriate
- Background processing for non-critical operations

## Troubleshooting

### Common Issues

1. **Permission Denied**:
   ```bash
   chmod +x scripts/club-*.js
   chown www-data:www-data scripts/club-*.js
   ```

2. **Database Connection Failed**:
   - Check database server status
   - Verify connection configuration
   - Test network connectivity

3. **Out of Memory**:
   - Increase Node.js memory limit: `--max-old-space-size=4096`
   - Process data in smaller chunks
   - Clear caches before operations

4. **Backup Restore Failed**:
   - Verify backup file integrity
   - Check available disk space
   - Ensure database permissions

### Debug Mode

Enable debug logging for troubleshooting:

```bash
DEBUG=club:* node scripts/club-maintenance.js
```

## Future Enhancements

### Planned Features

1. **Web Dashboard**: Browser-based interface for all tools
2. **API Integration**: REST API for remote tool execution
3. **Advanced Analytics**: Trend analysis and predictive maintenance
4. **Multi-Environment Support**: Development, staging, production configs
5. **Integration Testing**: Automated testing of operational procedures

### Extensibility

The tooling framework is designed for easy extension:

```javascript
// Add custom maintenance operation
class CustomMaintenanceManager extends ClubMaintenanceManager {
  async customOperation() {
    // Custom logic here
    this.logOperation('custom_operation', 'success', {
      message: 'Custom operation completed'
    });
  }
}
```

## Support and Documentation

### Getting Help

1. Check the logs in `logs/` directory
2. Run diagnostic checks: `node scripts/club-diagnostics.js`
3. Review configuration settings
4. Check system resources and connectivity

### Documentation

- **API Documentation**: See individual script files for detailed API docs
- **Configuration Reference**: Environment variable documentation in each script
- **Examples**: Usage examples in this README and script help text
- **Troubleshooting Guide**: Common issues and solutions above

## Conclusion

The club system operational tooling provides comprehensive maintenance, monitoring, and troubleshooting capabilities for the club collection implementation. These tools ensure system reliability, data integrity, and optimal performance through automated processes and detailed diagnostics.

Regular use of these tools will help maintain a healthy club system and quickly identify and resolve any issues that may arise.