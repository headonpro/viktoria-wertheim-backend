# Migration Management Tools

This document describes the comprehensive migration management tools implemented for the Club Collection system. These tools provide interfaces for monitoring migration progress, manual data migration, validation, rollback capabilities, and data quality reporting.

## Overview

The migration management system consists of:

1. **Admin Panel Interface** - Web-based management interface
2. **CLI Migration Manager** - Command-line tool for advanced operations
3. **API Controllers** - Backend API for migration operations
4. **Validation Tools** - Data integrity and consistency checking
5. **Rollback System** - Safe migration reversal capabilities
6. **Data Quality Reporting** - Comprehensive data analysis

## Requirements Addressed

- **8.1**: Team-to-club mapping migration with validation and rollback
- **8.2**: Tabellen-eintrag migration with club relations and data consistency
- **8.5**: Data quality reporting, cleanup tools, and automated validation

## Components

### 1. Admin Panel Interface

**Location**: `backend/src/admin/extensions/migration/components/MigrationManagementView.js`

**Features**:
- Real-time migration status monitoring
- Progress tracking with visual indicators
- Migration history with rollback options
- Data validation and quality reports
- Manual migration triggers
- Export/import capabilities

**Access**: Available in Strapi admin panel at `/admin/migration-management`

**Tabs**:
- **Übersicht**: Overall migration status and statistics
- **Spiel Migration**: Team-to-club migration for games
- **Tabellen Migration**: Table entry migration to club relations
- **Validierung**: Data validation and consistency checks
- **Datenqualität**: Data quality reports and cleanup tools
- **Verlauf**: Migration history and rollback management

### 2. CLI Migration Manager

**Location**: `backend/scripts/migration-manager.js`

**Usage**:
```bash
# Show migration status
node scripts/migration-manager.js status

# Run validation
node scripts/migration-manager.js validate

# Run migrations
node scripts/migration-manager.js migrate --type spiel
node scripts/migration-manager.js migrate --type tabellen
node scripts/migration-manager.js migrate --type all

# Rollback migration
node scripts/migration-manager.js rollback --backup-id <backup-id>

# Clean up orphaned data
node scripts/migration-manager.js cleanup

# Generate data quality report
node scripts/migration-manager.js report
```

**Options**:
- `--dry-run`: Run without making changes
- `--force`: Skip confirmation prompts
- `--verbose`: Detailed output
- `--output json|table|summary`: Output format
- `--type spiel|tabellen|all`: Migration type

### 3. API Controllers

**Location**: `backend/src/api/migration/controllers/migration.js`

**Endpoints**:
- `GET /api/migration/status` - Get migration status
- `GET /api/migration/history` - Get migration history
- `POST /api/migration/run` - Run migration
- `POST /api/migration/rollback` - Rollback migration
- `POST /api/migration/validate` - Run validation
- `GET /api/migration/validation` - Get validation results
- `GET /api/migration/data-quality` - Get data quality report
- `POST /api/migration/cleanup` - Run data cleanup
- `GET /api/migration/export` - Export migration data

## Migration Types

### Spiel Migration

**Purpose**: Convert team-based games to club-based relations

**Process**:
1. Validate existing spiel data
2. Create backup of current state
3. Map team relations to club relations using predefined mappings
4. Update spiel records with club relations
5. Validate migration results
6. Log migration to history

**Mappings**:
```javascript
const TEAM_TO_CLUB_MAPPING = {
  '1. Mannschaft': 'SV Viktoria Wertheim',
  '2. Mannschaft': 'SV Viktoria Wertheim II',
  '3. Mannschaft': 'SpG Vikt. Wertheim 3/Grünenwort'
};
```

**Validation Checks**:
- Both clubs exist and are active
- Clubs belong to the same league
- No club plays against itself
- Data consistency between team and club relations

### Tabellen Migration

**Purpose**: Update table entries to use club relations and correct names

**Process**:
1. Find entries with team relations but no club relations
2. Map team names to club names
3. Update entries with club relations
4. Ensure team_name field uses club names
5. Validate data consistency
6. Clean up orphaned entries

**Validation Checks**:
- team_name matches club.name
- Club is assigned to correct league
- No orphaned team references
- Consistent data across relations

## Validation System

### Data Validation

**Spiel Validation**:
- Checks for inconsistent team/club relations
- Validates club-league assignments
- Identifies unmappable team references
- Reports data integrity issues

**Tabellen Validation**:
- Verifies club relations exist
- Checks team_name consistency
- Identifies orphaned entries
- Validates league assignments

**Consistency Checks**:
- Cross-references spiel and tabellen data
- Validates club-team mappings
- Checks for duplicate or conflicting data
- Reports data quality issues

### Validation Report Format

```json
{
  "lastRun": "2024-01-15T10:30:00.000Z",
  "valid": 150,
  "errors": 5,
  "warnings": 12,
  "total": 167,
  "issues": [
    {
      "type": "spiel_inconsistency",
      "severity": "error",
      "message": "Spiel has both team and club relations",
      "details": { "spielId": 123, "issue": "..." }
    }
  ],
  "spiel": { /* spiel validation details */ },
  "tabellen": { /* tabellen validation details */ }
}
```

## Rollback System

### Backup Creation

**Automatic Backups**:
- Created before each migration
- Stored in `backups/migrations/` directory
- Include complete data state and metadata
- Timestamped and uniquely identified

**Backup Format**:
```json
{
  "metadata": {
    "backupId": "spiel-migration-backup-2024-01-15T10-30-00-000Z",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "recordCount": 150,
    "version": "1.0",
    "migrationType": "spiel"
  },
  "data": {
    "spiele": [ /* original spiel records */ ],
    "tabellen": [ /* original tabellen records */ ]
  }
}
```

### Rollback Process

1. Validate backup exists and is compatible
2. Create pre-rollback backup
3. Restore original data from backup
4. Remove migration-added relations
5. Validate rollback success
6. Log rollback to history

### Rollback Limitations

- **Spiel Migration**: Full rollback supported with backup restoration
- **Tabellen Migration**: Limited rollback (requires manual intervention for complex cases)
- **Data Loss**: Rollback may lose data created after migration
- **Dependencies**: Cannot rollback if dependent data has been modified

## Data Quality Reporting

### Report Components

**Migration Progress**:
- Percentage of records migrated
- Remaining records to migrate
- Migration status by type

**Data Integrity**:
- Orphaned records count
- Inconsistent relations
- Missing required data
- Data validation errors

**Performance Metrics**:
- Migration execution time
- Record processing rate
- Error rates
- System resource usage

### Report Format

```json
{
  "lastGenerated": "2024-01-15T10:30:00.000Z",
  "spiele": {
    "total": 200,
    "teamBased": 50,
    "clubBased": 150,
    "inconsistent": 5,
    "migrationProgress": 75.0
  },
  "tabellen": {
    "total": 100,
    "withClub": 80,
    "withoutClub": 20,
    "orphaned": 3,
    "migrationProgress": 80.0
  },
  "issues": [
    {
      "type": "INCONSISTENT_SPIELE",
      "description": "Spiele have both team and club relations",
      "count": 5
    }
  ]
}
```

## Data Cleanup Tools

### Cleanup Operations

**Orphaned Records**:
- Remove tabellen entries with invalid team references
- Clean up spiele with missing club/team data
- Delete unused backup files

**Inconsistent Data**:
- Remove duplicate team relations when club relations exist
- Fix mismatched team_name and club.name fields
- Resolve conflicting league assignments

**Performance Optimization**:
- Rebuild database indexes
- Update statistics
- Compress backup files

### Cleanup Process

1. Identify cleanup targets
2. Create safety backup
3. Perform cleanup operations
4. Validate cleanup results
5. Log cleanup actions
6. Update data quality metrics

## Monitoring and Alerting

### Progress Monitoring

**Real-time Updates**:
- Migration progress percentage
- Current processing step
- Estimated completion time
- Error and warning counts

**Status Indicators**:
- `pending`: Migration not started
- `running`: Migration in progress
- `completed`: Migration finished successfully
- `failed`: Migration encountered errors
- `partial`: Migration partially completed

### Error Handling

**Error Categories**:
- **Critical**: Migration cannot continue
- **Warning**: Issues that should be reviewed
- **Info**: Normal processing information

**Error Recovery**:
- Automatic retry for transient errors
- Rollback on critical failures
- Manual intervention prompts
- Detailed error logging

## Security Considerations

### Access Control

**Admin Panel**:
- Requires admin authentication
- Role-based permissions
- Audit logging of all actions

**API Endpoints**:
- Authentication required
- Rate limiting applied
- Input validation and sanitization

**CLI Tools**:
- Server access required
- Confirmation prompts for destructive operations
- Comprehensive logging

### Data Protection

**Backup Security**:
- Encrypted backup storage
- Access logging
- Retention policies

**Migration Safety**:
- Dry-run mode for testing
- Automatic backups before changes
- Rollback capabilities
- Data validation at each step

## Troubleshooting

### Common Issues

**Migration Stuck**:
1. Check system resources
2. Review error logs
3. Restart migration service
4. Use CLI tools for manual intervention

**Validation Failures**:
1. Review validation report
2. Fix data inconsistencies
3. Re-run validation
4. Proceed with migration

**Rollback Problems**:
1. Verify backup integrity
2. Check system state
3. Use manual rollback procedures
4. Contact system administrator

### Log Locations

- **Migration Logs**: `logs/migration.log`
- **Error Logs**: `logs/error.log`
- **Audit Logs**: `logs/audit.log`
- **History File**: `migration-history.json`
- **Validation Results**: `validation-results.json`

## Best Practices

### Before Migration

1. **Backup**: Ensure recent system backup exists
2. **Validation**: Run comprehensive validation
3. **Testing**: Test migration on staging environment
4. **Planning**: Schedule migration during low-traffic period

### During Migration

1. **Monitoring**: Watch progress and error rates
2. **Resources**: Monitor system resources
3. **Logs**: Review logs for issues
4. **Communication**: Keep stakeholders informed

### After Migration

1. **Validation**: Verify migration success
2. **Testing**: Test system functionality
3. **Cleanup**: Remove temporary files
4. **Documentation**: Update system documentation

## Support

For issues with migration management tools:

1. Check this documentation
2. Review error logs
3. Use CLI diagnostic tools
4. Contact system administrator
5. Refer to Strapi documentation

## Future Enhancements

Planned improvements:

1. **Real-time Progress**: WebSocket-based progress updates
2. **Batch Processing**: Improved performance for large datasets
3. **Advanced Rollback**: More granular rollback options
4. **Automated Testing**: Integration with CI/CD pipeline
5. **Performance Optimization**: Enhanced caching and indexing