# Saison Lifecycle Configuration

## Overview

The saison lifecycle hooks have been refactored to provide configurable validation behavior and improved error handling. This document describes the available configuration options and their effects.

## Configuration Flags

### Environment Variables

Add these to your `.env` file to control saison lifecycle behavior:

```env
# Enable strict validation for all saison operations
SAISON_STRICT_VALIDATION=false

# Enable season overlap validation (checks for date conflicts)
SAISON_OVERLAP_VALIDATION=false
```

### Configuration Options

#### `SAISON_STRICT_VALIDATION`
- **Default**: `false`
- **Purpose**: Controls whether validation failures block operations or allow graceful degradation
- **When `true`**: Validation failures will throw errors and block CRUD operations
- **When `false`**: Validation failures are logged as warnings but operations continue

#### `SAISON_OVERLAP_VALIDATION`
- **Default**: `false` 
- **Purpose**: Controls whether season date overlap validation is performed
- **When `true`**: Seasons with overlapping date ranges will be rejected
- **When `false`**: Season overlap validation is skipped (logged for monitoring)

## Error Messages

The lifecycle hooks now provide improved German error messages for common scenarios:

### Date Validation Errors
- Invalid date format: "Das Startdatum der Saison ist ungültig. Bitte verwenden Sie ein gültiges Datumsformat."
- Start date after end date: "Das Startdatum der Saison muss vor dem Enddatum liegen. Bitte überprüfen Sie die eingegebenen Daten."
- Missing dates: "Wenn ein Startdatum angegeben wird, muss auch ein Enddatum angegeben werden."

### Overlap Validation Errors
- Season overlap detected: "Der Zeitraum dieser Saison überschneidet sich mit folgenden bestehenden Saisons: [season names]. Bitte wählen Sie einen anderen Zeitraum oder passen Sie die bestehenden Saisons an."

### Deletion Errors
- Active season deletion: "Die aktive Saison kann nicht gelöscht werden. Bitte aktivieren Sie zuerst eine andere Saison."
- Teams assigned: "Diese Saison kann nicht gelöscht werden, da noch Teams zugeordnet sind. Bitte entfernen Sie zuerst alle Teams aus dieser Saison."
- Leagues assigned: "Diese Saison kann nicht gelöscht werden, da noch Ligen zugeordnet sind. Bitte entfernen Sie zuerst alle Ligen aus dieser Saison."

## Implementation Details

### Hook Wrapper Integration

The saison lifecycle uses the `HookWrapper` service for consistent error handling:

```typescript
const SAISON_HOOK_CONFIG = {
  enableStrictValidation: process.env.SAISON_STRICT_VALIDATION === 'true' || false,
  enableOverlapValidation: process.env.SAISON_OVERLAP_VALIDATION === 'true' || false,
  enableGracefulDegradation: true,
  maxExecutionTime: 200,
  retryAttempts: 2,
  logLevel: 'warn' as const
};
```

### Validation Functions

#### `validateSeasonDates(data, excludeId?)`
- Validates date format and logical consistency
- Conditionally performs overlap validation based on configuration
- Provides detailed error messages for all failure scenarios

#### `validateSeasonOverlap(data, excludeId?)`
- Checks for date range conflicts with existing seasons
- Excludes current season during updates
- Provides detailed information about conflicting seasons

#### `validateSeasonDeletion(seasonId)`
- Checks for dependent teams and leagues
- Provides specific information about blocking dependencies
- Handles database errors gracefully

## Monitoring and Logging

### Log Messages

When overlap validation is disabled:
```
INFO: Saison-Überschneidungsvalidierung ist deaktiviert
```

When seasons are automatically deactivated:
```
INFO: Deactivated season: [season name]
```

### Error Handling

All validation errors are processed through the hook error handler, which:
- Classifies errors as critical, warning, or info
- Applies appropriate recovery strategies
- Logs structured error information
- Enables graceful degradation when configured

## Migration Notes

### Current State
- Overlap validation is **disabled by default** for system stability
- Strict validation is **disabled by default** to prevent blocking operations
- All validation errors are logged for monitoring

### Enabling Validation
To gradually enable validation:

1. **Monitor logs** for validation warnings
2. **Fix data inconsistencies** identified in logs
3. **Enable overlap validation**: Set `SAISON_OVERLAP_VALIDATION=true`
4. **Test thoroughly** in staging environment
5. **Enable strict validation**: Set `SAISON_STRICT_VALIDATION=true` (optional)

## Troubleshooting

### Common Issues

1. **Season creation blocked**: Check for date format issues or overlaps
2. **Season deletion blocked**: Verify no teams or leagues are assigned
3. **Validation not working**: Ensure environment variables are set correctly

### Debug Information

Enable debug logging by setting the log level in the hook configuration:
```typescript
logLevel: 'debug'
```

This will provide detailed information about hook execution and validation steps.