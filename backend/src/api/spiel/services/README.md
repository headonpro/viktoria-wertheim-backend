# Spiel Migration Service

This service handles the migration from team-based spiele to club-based spiele as part of the Club Collection Implementation.

## Overview

The migration service converts existing `spiel` records that use `heim_team` and `gast_team` relations to use `heim_club` and `gast_club` relations instead. This enables the system to work with real club names and data for league operations.

## Requirements Addressed

- **8.1**: Create migration script for existing spiele records
- **8.3**: Add validation for successful migration and implement rollback capability

## Features

### Core Migration Functions

- **`migrateTeamToClubRelations()`**: Main migration method that converts team-based spiele to club-based
- **`validateMigrationData()`**: Validates current migration state and identifies inconsistencies
- **`createMigrationBackup()`**: Creates backup before migration for rollback capability
- **`rollbackMigration(backupId)`**: Restores spiele from backup if migration fails

### Team-to-Club Mapping

The service uses the following mapping to convert Viktoria teams to clubs:

```typescript
const TEAM_TO_CLUB_MAPPING = {
  '1. Mannschaft': 'team_1',
  '2. Mannschaft': 'team_2', 
  '3. Mannschaft': 'team_3'
} as const;
```

### Club Discovery

For opponent teams, the service attempts to find matching clubs using:

1. **Exact name matching**: Direct match between team name and club name
2. **Partial name matching**: Handles common variations (SV, TSV, VfR prefixes, etc.)
3. **Liga-based filtering**: Prefers clubs that are in the same liga as the spiel

## Usage

### Programmatic Usage

```typescript
import { createSpielMigrationService } from './migration';

const migrationService = createSpielMigrationService(strapi);

// Run validation
const validation = await migrationService.validateMigrationData();
console.log(`Found ${validation.teamBasedSpiele} spiele to migrate`);

// Run migration
const result = await migrationService.migrateTeamToClubRelations();
console.log(`Migrated ${result.migrated} spiele successfully`);

// Rollback if needed
if (!result.success && result.backupId) {
  await migrationService.rollbackMigration(result.backupId);
}
```

### Command Line Usage

Use the migration script for interactive migration:

```bash
# Validate current state (dry-run)
node scripts/migrate-spiele-to-clubs.js --dry-run

# Run migration with confirmation
node scripts/migrate-spiele-to-clubs.js

# Run migration without confirmation
node scripts/migrate-spiele-to-clubs.js --force

# Rollback using backup
node scripts/migrate-spiele-to-clubs.js --rollback --backup-id spiel-migration-backup-2024-01-15T10-30-00-000Z
```

## Migration Process

### 1. Pre-Migration Validation

The service validates:
- Current migration state (team-based vs club-based spiele)
- Data consistency between existing team and club relations
- Availability of club mappings for all teams

### 2. Backup Creation

Before migration, the service:
- Creates a timestamped backup of all spiele records
- Stores backup in `backups/migrations/` directory
- Includes metadata for rollback verification

### 3. Migration Execution

For each spiel with team relations:
- Finds corresponding clubs using team-to-club mapping
- Validates clubs are in the same liga
- Updates spiel with club relations
- Preserves original team relations for compatibility

### 4. Post-Migration Validation

After migration:
- Validates all migrated spiele have correct club relations
- Checks for data consistency
- Reports any issues or warnings

## Data Structures

### MigrationResult

```typescript
interface MigrationResult {
  success: boolean;
  processed: number;      // Total spiele processed
  migrated: number;       // Successfully migrated
  skipped: number;        // Skipped (already migrated, etc.)
  errors: MigrationError[];
  warnings: string[];
  backupId?: string;      // Backup ID for rollback
  duration: number;       // Processing time in ms
}
```

### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;
  totalSpiele: number;
  teamBasedSpiele: number;    // Need migration
  clubBasedSpiele: number;    // Already migrated
  mixedSpiele: number;        // Have both relations
  unmappableSpiele: number;   // Cannot be migrated
  inconsistencies: DataInconsistency[];
  recommendations: string[];
}
```

### BackupResult

```typescript
interface BackupResult {
  success: boolean;
  backupId: string;       // Unique backup identifier
  recordCount: number;    // Number of records backed up
  filePath: string;       // Path to backup file
}
```

## Error Handling

The service handles various error scenarios:

- **Missing club mappings**: Spiele are skipped with warnings
- **Liga mismatches**: Validation prevents migration of invalid combinations
- **Backup failures**: Migration is aborted if backup cannot be created
- **Partial failures**: Individual spiel errors don't stop the entire migration

## Rollback Capability

The rollback feature:
- Restores all spiele to their pre-migration state
- Uses backup files created during migration
- Validates backup integrity before rollback
- Provides detailed rollback results

## Testing

The service includes comprehensive tests:

```bash
# Run migration tests
npm test -- spiel-migration.test.js

# Run integration tests
npm test -- --testNamePattern="Integration"
```

Test coverage includes:
- Unit tests for all migration methods
- Integration tests for complete workflows
- Error scenario testing
- Rollback functionality testing

## Monitoring and Logging

The service provides detailed logging:
- **Info**: Migration progress and results
- **Debug**: Individual spiel processing details
- **Warn**: Skipped spiele and potential issues
- **Error**: Migration failures and critical issues

## Performance Considerations

- **Batch processing**: Processes spiele in manageable batches
- **Memory management**: Streams large datasets to avoid memory issues
- **Database optimization**: Uses efficient queries with proper population
- **Backup compression**: Large backups are compressed to save space

## Security

- **Backup protection**: Backup files are stored with restricted permissions
- **Validation**: All input data is validated before processing
- **Atomic operations**: Database updates are wrapped in transactions
- **Audit trail**: All migration activities are logged for audit purposes

## Troubleshooting

### Common Issues

1. **"No club found for team"**: Create missing club or update team-to-club mapping
2. **"Club not in liga"**: Ensure clubs are properly assigned to ligen
3. **"Backup creation failed"**: Check disk space and permissions
4. **"Rollback file not found"**: Verify backup ID and file path

### Recovery Procedures

1. **Failed migration**: Use rollback with backup ID
2. **Corrupted data**: Restore from database backup and re-run migration
3. **Missing clubs**: Create clubs manually and re-run migration
4. **Performance issues**: Run migration in smaller batches

## Future Enhancements

- **Incremental migration**: Support for migrating only new spiele
- **Parallel processing**: Multi-threaded migration for large datasets
- **Web interface**: Admin panel for migration management
- **Automated scheduling**: Cron-based migration for regular updates