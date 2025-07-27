# Configuration Management Guide

## Overview

This guide provides comprehensive instructions for configuring the refactored lifecycle hooks system. The configuration system supports environment-specific settings, feature flags, and runtime updates to ensure flexible deployment and operation.

## Configuration Architecture

The configuration system is built with the following principles:
- **Environment-specific**: Different settings for development, staging, and production
- **Hierarchical**: Configuration inheritance from global to specific settings
- **Versioned**: All configuration changes are tracked and versioned
- **Validated**: All configuration is validated against schemas before application
- **Hot-reloadable**: Configuration can be updated without system restart

## Configuration Files Structure

```
backend/
├── config/
│   ├── hooks.json                    # Main hook configuration
│   ├── environments/
│   │   ├── development.json          # Development-specific settings
│   │   ├── staging.json              # Staging-specific settings
│   │   └── production.json           # Production-specific settings
│   ├── validation-rules/
│   │   ├── team-rules.json           # Team validation rules
│   │   ├── saison-rules.json         # Season validation rules
│   │   └── table-rules.json          # Table validation rules
│   └── feature-flags/
│       └── flags.json                # Feature flag definitions
```

## Main Configuration File

### hooks.json

The main configuration file defines global settings for all hook services.

```json
{
  "version": "1.0.0",
  "environment": "development",
  "global": {
    "timeout": 5000,
    "retryAttempts": 3,
    "enableLogging": true,
    "enableMonitoring": true
  },
  "contentTypes": {
    "api::team.team": {
      "enabled": true,
      "timeout": 3000,
      "retryAttempts": 2,
      "hooks": {
        "beforeCreate": {
          "enabled": true,
          "validations": ["uniqueness", "required-fields"],
          "calculations": ["initial-stats"]
        },
        "beforeUpdate": {
          "enabled": true,
          "validations": ["uniqueness", "data-integrity"],
          "calculations": ["update-stats"]
        },
        "afterCreate": {
          "enabled": true,
          "backgroundJobs": ["update-rankings", "recalculate-league"]
        },
        "afterUpdate": {
          "enabled": true,
          "backgroundJobs": ["update-rankings"]
        }
      }
    },
    "api::saison.saison": {
      "enabled": true,
      "timeout": 2000,
      "retryAttempts": 1,
      "hooks": {
        "beforeCreate": {
          "enabled": true,
          "validations": ["date-range", "overlap-check"],
          "calculations": []
        },
        "beforeUpdate": {
          "enabled": true,
          "validations": ["date-range", "overlap-check", "active-season"],
          "calculations": []
        },
        "afterCreate": {
          "enabled": true,
          "backgroundJobs": ["setup-season"]
        },
        "afterUpdate": {
          "enabled": true,
          "backgroundJobs": ["update-season-status"]
        }
      }
    },
    "api::tabellen-eintrag.tabellen-eintrag": {
      "enabled": true,
      "timeout": 4000,
      "retryAttempts": 3,
      "hooks": {
        "beforeCreate": {
          "enabled": true,
          "validations": ["data-consistency", "required-fields"],
          "calculations": ["points", "goal-difference"]
        },
        "beforeUpdate": {
          "enabled": true,
          "validations": ["data-consistency"],
          "calculations": ["points", "goal-difference", "position"]
        },
        "afterCreate": {
          "enabled": true,
          "backgroundJobs": ["update-table", "recalculate-stats"]
        },
        "afterUpdate": {
          "enabled": true,
          "backgroundJobs": ["update-table", "recalculate-stats"]
        }
      }
    }
  },
  "validation": {
    "strictMode": false,
    "warningsAsErrors": false,
    "enableCaching": true,
    "cacheTimeout": 300000
  },
  "calculation": {
    "enableAsync": true,
    "maxConcurrentJobs": 10,
    "jobTimeout": 30000,
    "retryFailedJobs": true
  },
  "monitoring": {
    "enableMetrics": true,
    "enableTracing": true,
    "metricsInterval": 60000,
    "alertThresholds": {
      "errorRate": 0.05,
      "avgExecutionTime": 1000,
      "queueBacklog": 100
    }
  }
}
```

## Environment-Specific Configuration

### Development Configuration (development.json)

```json
{
  "global": {
    "timeout": 10000,
    "enableLogging": true,
    "logLevel": "debug"
  },
  "validation": {
    "strictMode": false,
    "warningsAsErrors": false
  },
  "calculation": {
    "enableAsync": false,
    "maxConcurrentJobs": 2
  },
  "monitoring": {
    "enableMetrics": true,
    "enableTracing": true,
    "metricsInterval": 30000
  },
  "database": {
    "connectionPool": {
      "min": 2,
      "max": 10
    }
  }
}
```

### Staging Configuration (staging.json)

```json
{
  "global": {
    "timeout": 5000,
    "enableLogging": true,
    "logLevel": "info"
  },
  "validation": {
    "strictMode": true,
    "warningsAsErrors": false
  },
  "calculation": {
    "enableAsync": true,
    "maxConcurrentJobs": 5
  },
  "monitoring": {
    "enableMetrics": true,
    "enableTracing": true,
    "metricsInterval": 60000,
    "alertThresholds": {
      "errorRate": 0.03,
      "avgExecutionTime": 800
    }
  },
  "database": {
    "connectionPool": {
      "min": 5,
      "max": 20
    }
  }
}
```

### Production Configuration (production.json)

```json
{
  "global": {
    "timeout": 3000,
    "enableLogging": true,
    "logLevel": "warn"
  },
  "validation": {
    "strictMode": true,
    "warningsAsErrors": false,
    "enableCaching": true,
    "cacheTimeout": 600000
  },
  "calculation": {
    "enableAsync": true,
    "maxConcurrentJobs": 20,
    "jobTimeout": 60000
  },
  "monitoring": {
    "enableMetrics": true,
    "enableTracing": false,
    "metricsInterval": 120000,
    "alertThresholds": {
      "errorRate": 0.01,
      "avgExecutionTime": 500,
      "queueBacklog": 50
    }
  },
  "database": {
    "connectionPool": {
      "min": 10,
      "max": 50
    }
  }
}
```

## Validation Rules Configuration

### Team Validation Rules (team-rules.json)

```json
{
  "rules": [
    {
      "name": "uniqueness",
      "type": "critical",
      "enabled": true,
      "description": "Team name must be unique within league and season",
      "validator": "TeamUniquenessValidator",
      "message": "Ein Team mit diesem Namen existiert bereits in dieser Liga und Saison",
      "fields": ["name", "liga", "saison"]
    },
    {
      "name": "required-fields",
      "type": "critical",
      "enabled": true,
      "description": "Required fields must be present",
      "validator": "RequiredFieldsValidator",
      "message": "Pflichtfelder müssen ausgefüllt werden",
      "fields": ["name", "liga", "saison"]
    },
    {
      "name": "data-integrity",
      "type": "warning",
      "enabled": true,
      "description": "Data integrity checks",
      "validator": "DataIntegrityValidator",
      "message": "Datenintegrität könnte beeinträchtigt sein",
      "fields": ["*"]
    }
  ]
}
```

### Season Validation Rules (saison-rules.json)

```json
{
  "rules": [
    {
      "name": "date-range",
      "type": "critical",
      "enabled": true,
      "description": "Start date must be before end date",
      "validator": "DateRangeValidator",
      "message": "Startdatum muss vor dem Enddatum liegen",
      "fields": ["startDate", "endDate"]
    },
    {
      "name": "overlap-check",
      "type": "warning",
      "enabled": true,
      "description": "Seasons should not overlap",
      "validator": "SeasonOverlapValidator",
      "message": "Saison überschneidet sich mit einer anderen Saison",
      "fields": ["startDate", "endDate", "liga"]
    },
    {
      "name": "active-season",
      "type": "warning",
      "enabled": true,
      "description": "Only one season can be active per league",
      "validator": "ActiveSeasonValidator",
      "message": "Nur eine Saison kann pro Liga aktiv sein",
      "fields": ["active", "liga"]
    }
  ]
}
```

### Table Entry Validation Rules (table-rules.json)

```json
{
  "rules": [
    {
      "name": "data-consistency",
      "type": "critical",
      "enabled": true,
      "description": "Table data must be mathematically consistent",
      "validator": "TableDataConsistencyValidator",
      "message": "Tabellendaten sind mathematisch inkonsistent",
      "fields": ["gamesPlayed", "wins", "draws", "losses", "goalsFor", "goalsAgainst"]
    },
    {
      "name": "required-fields",
      "type": "critical",
      "enabled": true,
      "description": "Required table fields must be present",
      "validator": "RequiredFieldsValidator",
      "message": "Pflichtfelder für Tabelleneintrag fehlen",
      "fields": ["team", "liga", "saison"]
    },
    {
      "name": "positive-values",
      "type": "warning",
      "enabled": true,
      "description": "Numeric values should be positive",
      "validator": "PositiveValuesValidator",
      "message": "Numerische Werte sollten positiv sein",
      "fields": ["gamesPlayed", "wins", "draws", "losses", "goalsFor", "goalsAgainst", "points"]
    }
  ]
}
```

## Feature Flags Configuration

### Feature Flags (flags.json)

```json
{
  "flags": [
    {
      "name": "strict-validation",
      "enabled": false,
      "description": "Enable strict validation mode",
      "environments": ["production"],
      "rules": [
        {
          "condition": "environment === 'production'",
          "value": true
        },
        {
          "condition": "environment === 'development'",
          "value": false
        }
      ]
    },
    {
      "name": "async-calculations",
      "enabled": true,
      "description": "Enable asynchronous calculations",
      "environments": ["staging", "production"],
      "rules": [
        {
          "condition": "environment === 'development'",
          "value": false
        }
      ]
    },
    {
      "name": "season-overlap-validation",
      "enabled": true,
      "description": "Enable season overlap validation",
      "environments": ["all"],
      "rules": []
    },
    {
      "name": "table-position-calculation",
      "enabled": true,
      "description": "Enable automatic table position calculation",
      "environments": ["all"],
      "rules": []
    },
    {
      "name": "performance-monitoring",
      "enabled": true,
      "description": "Enable detailed performance monitoring",
      "environments": ["staging", "production"],
      "rules": [
        {
          "condition": "environment === 'development'",
          "value": false
        }
      ]
    }
  ]
}
```

## Configuration Loading and Management

### Loading Configuration

The configuration system loads settings in the following order:
1. Base configuration from `hooks.json`
2. Environment-specific overrides from `environments/{environment}.json`
3. Runtime feature flag evaluations
4. Environment variables (for sensitive settings)

### Configuration CLI Tool

Use the configuration CLI tool to manage settings:

```bash
# Load and validate configuration
node scripts/config-cli.js validate

# Update a configuration value
node scripts/config-cli.js set contentTypes.api::team.team.timeout 5000

# Get a configuration value
node scripts/config-cli.js get contentTypes.api::team.team.timeout

# List all configuration keys
node scripts/config-cli.js list

# Backup current configuration
node scripts/config-cli.js backup

# Restore configuration from backup
node scripts/config-cli.js restore backup-20240101.json
```

### Environment Variables

Sensitive configuration can be overridden using environment variables:

```bash
# Database configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=viktoria_wertheim
DATABASE_USER=strapi
DATABASE_PASSWORD=secure_password

# Hook configuration
HOOK_TIMEOUT=5000
HOOK_RETRY_ATTEMPTS=3
HOOK_ENABLE_LOGGING=true

# Monitoring configuration
MONITORING_ENABLE_METRICS=true
MONITORING_METRICS_INTERVAL=60000

# Feature flags
FEATURE_STRICT_VALIDATION=false
FEATURE_ASYNC_CALCULATIONS=true
```

### Configuration Schema Validation

All configuration is validated against JSON schemas:

```typescript
// Hook configuration schema
const hookConfigSchema = {
  type: "object",
  properties: {
    version: { type: "string" },
    environment: { type: "string", enum: ["development", "staging", "production"] },
    global: {
      type: "object",
      properties: {
        timeout: { type: "number", minimum: 1000, maximum: 30000 },
        retryAttempts: { type: "number", minimum: 0, maximum: 5 },
        enableLogging: { type: "boolean" },
        enableMonitoring: { type: "boolean" }
      }
    },
    contentTypes: {
      type: "object",
      patternProperties: {
        "^api::[a-z-]+\\.[a-z-]+$": {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            timeout: { type: "number", minimum: 1000, maximum: 30000 },
            retryAttempts: { type: "number", minimum: 0, maximum: 5 }
          }
        }
      }
    }
  },
  required: ["version", "environment", "global", "contentTypes"]
}
```

## Runtime Configuration Updates

### Hot Reloading

Configuration can be updated at runtime without restarting the application:

```typescript
// Update configuration programmatically
const configManager = strapi.service('api::hook-config.configuration-manager');

// Update a specific setting
await configManager.updateConfiguration({
  'contentTypes.api::team.team.timeout': 6000
});

// Reload configuration from files
await configManager.reloadConfiguration();

// Validate current configuration
const validation = await configManager.validateConfiguration();
if (!validation.isValid) {
  console.error('Configuration validation failed:', validation.errors);
}
```

### Configuration API

The configuration can be managed through REST API endpoints:

```bash
# Get current configuration
GET /api/hook-config/configuration

# Update configuration
PUT /api/hook-config/configuration
{
  "contentTypes": {
    "api::team.team": {
      "timeout": 6000
    }
  }
}

# Validate configuration
POST /api/hook-config/configuration/validate
{
  "configuration": { ... }
}

# Get configuration history
GET /api/hook-config/configuration/history

# Rollback to previous version
POST /api/hook-config/configuration/rollback
{
  "version": "1.0.0"
}
```

## Configuration Best Practices

### Development Environment

1. **Disable strict validation** to allow flexible testing
2. **Enable detailed logging** for debugging
3. **Use synchronous calculations** for immediate feedback
4. **Set higher timeouts** to accommodate debugging

### Staging Environment

1. **Enable strict validation** to catch issues early
2. **Use production-like settings** for realistic testing
3. **Enable monitoring** to validate performance
4. **Test configuration changes** before production deployment

### Production Environment

1. **Enable strict validation** for data integrity
2. **Use conservative timeouts** to prevent blocking
3. **Enable comprehensive monitoring** and alerting
4. **Use feature flags** for gradual rollouts
5. **Backup configuration** before changes

### Security Considerations

1. **Never commit sensitive data** to configuration files
2. **Use environment variables** for secrets
3. **Validate all configuration** before application
4. **Audit configuration changes** for compliance
5. **Encrypt sensitive configuration** at rest

### Performance Optimization

1. **Cache configuration** to reduce load times
2. **Use appropriate timeouts** to balance performance and reliability
3. **Enable async processing** for heavy operations
4. **Monitor configuration impact** on system performance

### Monitoring Configuration Changes

All configuration changes are logged and monitored:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "user": "admin",
  "action": "update",
  "changes": [
    {
      "key": "contentTypes.api::team.team.timeout",
      "oldValue": 3000,
      "newValue": 5000
    }
  ],
  "version": "1.0.1",
  "environment": "production"
}
```

This configuration guide provides comprehensive instructions for managing the lifecycle hooks system configuration across all environments and use cases.