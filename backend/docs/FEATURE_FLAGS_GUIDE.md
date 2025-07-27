# Feature Flags Usage Guide

## Overview

Feature flags provide a powerful mechanism to control the behavior of the lifecycle hooks system without code deployments. This guide explains how to use, manage, and monitor feature flags effectively across different environments.

## Feature Flag System Architecture

The feature flag system consists of several components:

- **Flag Storage**: Persistent storage for flag definitions and states
- **Flag Evaluation**: Runtime evaluation of flag conditions
- **Flag Management**: Administrative interface for flag control
- **Flag Monitoring**: Analytics and usage tracking
- **Flag Caching**: Performance optimization through caching

## Available Feature Flags

### Core System Flags

#### `strict-validation`
**Purpose**: Controls whether validation rules are enforced strictly or allow warnings to pass through.

**Default**: `false` (development), `true` (production)

**Usage**:
```typescript
const isStrictValidation = await featureFlagService.isEnabled('strict-validation');
if (isStrictValidation) {
  // Block operation on validation warnings
  return { success: false, canProceed: false };
} else {
  // Log warning but continue
  logger.warn('Validation warning detected');
  return { success: true, canProceed: true };
}
```

**Configuration**:
```json
{
  "name": "strict-validation",
  "enabled": false,
  "description": "Enable strict validation mode that treats warnings as errors",
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
}
```

#### `async-calculations`
**Purpose**: Enables asynchronous background processing for heavy calculations.

**Default**: `false` (development), `true` (staging/production)

**Usage**:
```typescript
const enableAsync = await featureFlagService.isEnabled('async-calculations');
if (enableAsync) {
  // Schedule calculation as background job
  await calculationService.scheduleAsync(data, calculations);
} else {
  // Execute calculation synchronously
  const result = await calculationService.calculateSync(data, calculations);
}
```

#### `performance-monitoring`
**Purpose**: Controls detailed performance monitoring and metrics collection.

**Default**: `false` (development), `true` (staging/production)

**Usage**:
```typescript
const enableMonitoring = await featureFlagService.isEnabled('performance-monitoring');
if (enableMonitoring) {
  const timer = performanceMonitor.startTimer('hook-execution');
  // ... execute hook logic
  timer.stop();
}
```

### Content-Type Specific Flags

#### `season-overlap-validation`
**Purpose**: Controls whether season date overlap validation is enforced.

**Default**: `true`

**Usage**:
```typescript
const checkOverlap = await featureFlagService.isEnabled('season-overlap-validation');
if (checkOverlap) {
  const validation = await validateSeasonOverlap(seasonData);
  if (!validation.isValid) {
    return { success: false, errors: validation.errors };
  }
}
```

#### `table-position-calculation`
**Purpose**: Enables automatic table position calculation after table entry updates.

**Default**: `true`

**Usage**:
```typescript
const autoCalculate = await featureFlagService.isEnabled('table-position-calculation');
if (autoCalculate) {
  await scheduleTablePositionUpdate(ligaId);
}
```

#### `team-statistics-calculation`
**Purpose**: Controls automatic team statistics calculation.

**Default**: `true`

**Usage**:
```typescript
const calculateStats = await featureFlagService.isEnabled('team-statistics-calculation');
if (calculateStats) {
  await teamHookService.calculateTeamStatistics(teamData);
}
```

### Advanced Flags

#### `hook-timeout-protection`
**Purpose**: Enables timeout protection for hook operations.

**Default**: `true`

**Usage**:
```typescript
const enableTimeout = await featureFlagService.isEnabled('hook-timeout-protection');
const timeout = enableTimeout ? config.timeout : Infinity;
await executeWithTimeout(operation, timeout);
```

#### `error-recovery-mode`
**Purpose**: Enables advanced error recovery mechanisms.

**Default**: `true`

**Usage**:
```typescript
const enableRecovery = await featureFlagService.isEnabled('error-recovery-mode');
if (enableRecovery) {
  try {
    return await operation();
  } catch (error) {
    return await errorRecoveryStrategy.recover(error, context);
  }
}
```

#### `configuration-hot-reload`
**Purpose**: Allows configuration changes without system restart.

**Default**: `false` (development), `true` (production)

**Usage**:
```typescript
const hotReload = await featureFlagService.isEnabled('configuration-hot-reload');
if (hotReload) {
  configManager.watchForChanges();
}
```

## Flag Management

### Administrative Interface

Access the feature flag management interface at:
- Development: `http://localhost:1337/admin/feature-flags`
- Staging: `https://staging-api.viktoria-wertheim.de/admin/feature-flags`
- Production: `https://api.viktoria-wertheim.de/admin/feature-flags`

### CLI Management

Use the feature flag CLI tool for programmatic management:

```bash
# List all feature flags
node scripts/feature-flags-cli.js list

# Get flag status
node scripts/feature-flags-cli.js get strict-validation

# Enable a flag
node scripts/feature-flags-cli.js enable async-calculations

# Disable a flag
node scripts/feature-flags-cli.js disable strict-validation

# Set flag with conditions
node scripts/feature-flags-cli.js set performance-monitoring \
  --condition "environment === 'production'" \
  --value true

# Create new flag
node scripts/feature-flags-cli.js create new-feature \
  --description "New feature flag" \
  --default false \
  --environments staging,production
```

### REST API Management

Feature flags can be managed through REST API:

```bash
# Get all flags
GET /api/feature-flags

# Get specific flag
GET /api/feature-flags/strict-validation

# Update flag
PUT /api/feature-flags/strict-validation
{
  "enabled": true,
  "rules": [
    {
      "condition": "environment === 'production'",
      "value": true
    }
  ]
}

# Create new flag
POST /api/feature-flags
{
  "name": "new-feature",
  "enabled": false,
  "description": "New feature description",
  "environments": ["staging", "production"]
}

# Delete flag
DELETE /api/feature-flags/old-feature
```

## Flag Evaluation Rules

### Simple Boolean Flags

```json
{
  "name": "simple-flag",
  "enabled": true,
  "description": "Simple boolean flag"
}
```

### Environment-Based Rules

```json
{
  "name": "environment-flag",
  "enabled": false,
  "rules": [
    {
      "condition": "environment === 'production'",
      "value": true
    },
    {
      "condition": "environment === 'staging'",
      "value": true
    },
    {
      "condition": "environment === 'development'",
      "value": false
    }
  ]
}
```

### User-Based Rules

```json
{
  "name": "user-flag",
  "enabled": false,
  "rules": [
    {
      "condition": "user.role === 'admin'",
      "value": true
    },
    {
      "condition": "user.id in ['user1', 'user2']",
      "value": true
    }
  ]
}
```

### Time-Based Rules

```json
{
  "name": "time-flag",
  "enabled": false,
  "rules": [
    {
      "condition": "Date.now() > new Date('2024-02-01').getTime()",
      "value": true
    },
    {
      "condition": "new Date().getHours() >= 9 && new Date().getHours() <= 17",
      "value": true
    }
  ]
}
```

### Percentage-Based Rollouts

```json
{
  "name": "rollout-flag",
  "enabled": false,
  "rules": [
    {
      "condition": "Math.random() < 0.1",
      "value": true
    }
  ]
}
```

### Complex Conditional Rules

```json
{
  "name": "complex-flag",
  "enabled": false,
  "rules": [
    {
      "condition": "environment === 'production' && user.role === 'admin'",
      "value": true
    },
    {
      "condition": "environment === 'staging' && Date.now() > new Date('2024-01-15').getTime()",
      "value": true
    }
  ]
}
```

## Flag Context

### Providing Context

When evaluating flags, provide relevant context:

```typescript
const context = {
  environment: process.env.NODE_ENV,
  user: {
    id: 'user123',
    role: 'admin'
  },
  contentType: 'api::team.team',
  operation: 'beforeCreate'
};

const isEnabled = await featureFlagService.isEnabled('strict-validation', context);
```

### Available Context Variables

- `environment`: Current environment (development, staging, production)
- `user.id`: User identifier
- `user.role`: User role
- `contentType`: Strapi content type
- `operation`: Hook operation (beforeCreate, beforeUpdate, etc.)
- `timestamp`: Current timestamp
- `request.ip`: Client IP address
- `request.userAgent`: Client user agent

## Flag Monitoring and Analytics

### Usage Analytics

Monitor flag usage through the analytics dashboard:

```typescript
// Track flag evaluation
await featureFlagService.trackEvaluation('strict-validation', true, context);

// Get usage statistics
const stats = await featureFlagService.getUsageStats('strict-validation', {
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
});
```

### Performance Impact

Monitor the performance impact of feature flags:

```typescript
const performanceMetrics = await featureFlagService.getPerformanceMetrics();
console.log('Average evaluation time:', performanceMetrics.avgEvaluationTime);
console.log('Cache hit rate:', performanceMetrics.cacheHitRate);
```

### Flag Health Monitoring

Set up monitoring for flag health:

```json
{
  "alerts": [
    {
      "name": "flag-evaluation-slow",
      "condition": "avgEvaluationTime > 10",
      "severity": "warning"
    },
    {
      "name": "flag-cache-miss-high",
      "condition": "cacheHitRate < 0.9",
      "severity": "warning"
    },
    {
      "name": "flag-evaluation-errors",
      "condition": "errorRate > 0.01",
      "severity": "critical"
    }
  ]
}
```

## Best Practices

### Flag Naming Conventions

- Use kebab-case: `strict-validation`, `async-calculations`
- Be descriptive: `season-overlap-validation` not `validation1`
- Include scope: `team-statistics-calculation` not `statistics`
- Avoid negatives: `enable-feature` not `disable-feature`

### Flag Lifecycle Management

1. **Creation**: Create flag with default `false` value
2. **Testing**: Test in development environment
3. **Staging**: Enable in staging for validation
4. **Gradual Rollout**: Use percentage-based rollout in production
5. **Full Rollout**: Enable for all users
6. **Code Cleanup**: Remove flag checks from code
7. **Flag Removal**: Delete unused flags

### Flag Organization

Group related flags:

```json
{
  "validation": {
    "strict-validation": true,
    "season-overlap-validation": true,
    "team-uniqueness-validation": true
  },
  "calculations": {
    "async-calculations": true,
    "table-position-calculation": true,
    "team-statistics-calculation": true
  },
  "monitoring": {
    "performance-monitoring": true,
    "error-tracking": true,
    "metrics-collection": true
  }
}
```

### Performance Optimization

1. **Cache Flags**: Use caching to reduce evaluation overhead
2. **Batch Evaluations**: Evaluate multiple flags in single call
3. **Minimize Context**: Only provide necessary context data
4. **Static Flags**: Use static evaluation for environment-only flags

### Security Considerations

1. **Access Control**: Restrict flag management to authorized users
2. **Audit Logging**: Log all flag changes
3. **Validation**: Validate flag rules before saving
4. **Rollback**: Maintain flag change history for rollbacks

### Testing with Feature Flags

```typescript
// Test with flag enabled
describe('Team creation with strict validation', () => {
  beforeEach(async () => {
    await featureFlagService.setFlag('strict-validation', true);
  });

  it('should block creation with invalid data', async () => {
    const result = await teamHookService.beforeCreate(invalidTeamData);
    expect(result.canProceed).toBe(false);
  });
});

// Test with flag disabled
describe('Team creation with lenient validation', () => {
  beforeEach(async () => {
    await featureFlagService.setFlag('strict-validation', false);
  });

  it('should allow creation with warnings', async () => {
    const result = await teamHookService.beforeCreate(warningTeamData);
    expect(result.canProceed).toBe(true);
  });
});
```

## Troubleshooting

### Common Issues

#### Flag Not Taking Effect

1. Check flag cache expiration
2. Verify flag evaluation context
3. Confirm flag rules syntax
4. Check environment configuration

```bash
# Clear flag cache
curl -X POST http://localhost:1337/api/feature-flags/cache/clear

# Validate flag rules
node scripts/feature-flags-cli.js validate strict-validation
```

#### Performance Issues

1. Monitor evaluation times
2. Check cache hit rates
3. Optimize flag rules
4. Reduce context size

```bash
# Get performance metrics
curl http://localhost:1337/api/feature-flags/metrics

# Analyze slow flags
node scripts/feature-flags-cli.js analyze-performance
```

#### Rule Evaluation Errors

1. Validate rule syntax
2. Check context variables
3. Test rule conditions
4. Review error logs

```bash
# Test flag evaluation
node scripts/feature-flags-cli.js test strict-validation \
  --context '{"environment": "production", "user": {"role": "admin"}}'
```

This feature flags guide provides comprehensive instructions for effectively using and managing feature flags in the lifecycle hooks system.