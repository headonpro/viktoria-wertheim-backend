# Team Lifecycle Hooks Simplification

## Overview

The team lifecycle hooks have been simplified to address stability issues and blocking CRUD operations. This document describes the changes made and the configuration options available.

## Changes Made

### Removed Complex Validations

1. **Saison-Liga Relationship Validation**: Removed complex validation that checked for valid saison-liga combinations
2. **Cross-Reference Validation**: Removed database queries that validated team relationships during hook execution
3. **Circular Dependency Checks**: Removed validations that could cause circular dependencies with other content types

### Retained Essential Features

1. **Basic Field Validation**: Simple validation for required fields and data types
2. **Comprehensive Logging**: Structured logging for all team operations
3. **Error Handling**: Graceful error handling using the centralized hook error handler

### Added Features

1. **Feature Flag Support**: Configurable strict validation via environment variables
2. **Performance Optimization**: Reduced hook execution timeout to 50ms
3. **Graceful Degradation**: Non-critical errors don't block operations

## Configuration

### Environment Variables

- `TEAM_STRICT_VALIDATION`: Enable/disable strict validation (default: false)
  - `true`: Enable basic field validation
  - `false`: Disable all validation (current default for stability)

### Hook Configuration

```typescript
const TEAM_HOOK_CONFIG = {
  enableStrictValidation: process.env.TEAM_STRICT_VALIDATION === 'true' || false,
  enableGracefulDegradation: true,
  maxExecutionTime: 50, // 50ms timeout
  retryAttempts: 1,
  logLevel: 'info'
};
```

## Validation Rules

When `TEAM_STRICT_VALIDATION=true`, the following validations are applied:

### Required Fields
- `name`: Team name is required and cannot be empty

### Field Constraints
- `name`: Maximum 100 characters
- `gruendungsjahr`: Must be a valid year between 1800 and current year

### Removed Validations
- ❌ Saison-Liga relationship validation
- ❌ Duplicate team name in same league/season
- ❌ Active season constraints
- ❌ League membership validation

## Usage Examples

### Enable Strict Validation
```bash
# In .env file
TEAM_STRICT_VALIDATION=true
```

### Disable Strict Validation (Default)
```bash
# In .env file
TEAM_STRICT_VALIDATION=false
```

## Logging

All team operations are logged with structured data:

### Creation Logging
```json
{
  "level": "info",
  "message": "Creating team: Team Name",
  "teamData": {
    "name": "Team Name",
    "hasLiga": true,
    "hasSaison": true
  }
}
```

### Update Logging
```json
{
  "level": "info", 
  "message": "Updating team 123",
  "updatedFields": ["name", "gruendungsjahr"],
  "teamId": 123
}
```

### Success Logging
```json
{
  "level": "info",
  "message": "Team created successfully",
  "teamId": 123,
  "teamName": "Team Name",
  "liga": 456,
  "saison": 789
}
```

## Error Handling

Errors are handled by the centralized hook error handler:

1. **Critical Errors**: Block operation only if strict validation is enabled
2. **Warning Errors**: Logged but don't block operations
3. **Timeout Errors**: Logged with suggestion to move to async processing

## Migration Notes

### From Previous Implementation
- Complex validations have been removed
- Error swallowing has been replaced with proper error handling
- TODO comments have been resolved with feature flag implementation

### Future Enhancements
- Validation rules can be re-enabled gradually via feature flags
- Complex validations can be moved to background jobs
- Additional validation rules can be added as separate modules

## Testing

To test the simplified hooks:

1. **With Strict Validation Disabled** (default):
   ```bash
   # Teams can be created with minimal validation
   curl -X POST http://localhost:1337/api/teams \
     -H "Content-Type: application/json" \
     -d '{"data": {"name": "Test Team"}}'
   ```

2. **With Strict Validation Enabled**:
   ```bash
   # Set environment variable
   export TEAM_STRICT_VALIDATION=true
   
   # Restart Strapi and test validation
   curl -X POST http://localhost:1337/api/teams \
     -H "Content-Type: application/json" \
     -d '{"data": {"name": ""}}'  # Should fail validation
   ```

## Requirements Satisfied

- ✅ **Requirement 1.1**: Stable lifecycle hooks that don't block CRUD operations
- ✅ **Requirement 6.2**: Configurable validation via feature flags
- ✅ Removed complex saison-liga validation
- ✅ Kept essential logging and basic field validation
- ✅ Added temporary feature flag for strict validation