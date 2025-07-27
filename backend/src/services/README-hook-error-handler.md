# Hook Error Handler Service

## Overview

The Hook Error Handler Service provides centralized error handling for Strapi lifecycle hooks with graceful degradation for non-critical failures. This service prevents system blockage while maintaining proper error logging and monitoring.

## Key Features

- **Graceful Degradation**: Non-critical errors don't block operations
- **Timeout Protection**: Prevents hooks from hanging indefinitely
- **Error Classification**: Distinguishes between critical, warning, and info errors
- **Structured Logging**: Consistent logging format across all hooks
- **Configurable Behavior**: Runtime configuration updates
- **Recovery Strategies**: Automatic error recovery mechanisms

## Basic Usage

### Using HookWrapper (Recommended)

```typescript
import { HookWrapper } from '../services/hook-error-handler';

export default function createLifecycleHooks(strapi: any) {
  const hookWrapper = new HookWrapper(strapi, {
    enableGracefulDegradation: true,
    enableStrictValidation: false,
    maxExecutionTime: 100,
    logLevel: 'warn'
  });

  return {
    beforeCreate: hookWrapper.wrapBeforeCreate('team', async (event) => {
      const { data } = event.params;
      
      // Your validation logic here
      if (!data.name) {
        throw new Error('Team name is required');
      }
      
      return data; // Return modified data if needed
    }),

    beforeUpdate: hookWrapper.wrapBeforeUpdate('team', async (event) => {
      const { data } = event.params;
      
      // Your update validation logic here
      if (data.name && data.name.length > 100) {
        throw new Error('Team name too long');
      }
      
      return data;
    }),

    afterCreate: hookWrapper.wrapAfterCreate('team', async (event) => {
      const { result } = event;
      
      // Non-blocking operations here
      await initializeTeamStatistics(result.id);
    })
  };
}
```

### Using HookErrorHandler Directly

```typescript
import { createHookErrorHandler } from '../services/hook-error-handler';

export default {
  async beforeCreate(event: any) {
    const errorHandler = createHookErrorHandler(strapi);
    
    const context = {
      contentType: 'team',
      hookType: 'beforeCreate' as const,
      event,
      operationId: `team-beforeCreate-${Date.now()}`
    };

    const result = await errorHandler.wrapHookOperation(context, async () => {
      // Your hook logic here
      const { data } = event.params;
      
      if (!data.name) {
        throw new Error('Team name is required');
      }
      
      return data;
    });

    if (!result.canProceed) {
      throw new Error(result.errors[0]?.message || 'Hook operation failed');
    }

    return result.modifiedData;
  }
};
```

## Configuration Options

```typescript
interface HookErrorConfig {
  enableStrictValidation: boolean;    // Default: false
  enableGracefulDegradation: boolean; // Default: true
  maxExecutionTime: number;           // Default: 100ms
  retryAttempts: number;              // Default: 2
  logLevel: 'error' | 'warn' | 'info' | 'debug'; // Default: 'warn'
}
```

## Error Classification

### Critical Errors
- Block operations when strict validation is enabled
- Database constraint violations
- Required field validation failures
- Security violations

### Warning Errors
- Business logic validation failures
- Timeout errors
- Overlap validations
- Duplicate validations

### Info Errors
- Optional feature failures
- Cache misses
- Monitoring data collection failures

## Error Codes

- `HOOK_TIMEOUT`: Hook execution exceeded time limit
- `VALIDATION_ERROR`: Data validation failed
- `DATABASE_ERROR`: Database operation failed
- `OVERLAP_VALIDATION`: Season overlap detected
- `DUPLICATE_VALIDATION`: Duplicate data detected
- `UNKNOWN_ERROR`: Unclassified error

## Recovery Strategies

The error handler automatically applies recovery strategies:

1. **Timeout Recovery**: Logs timeout and suggests async processing
2. **Overlap Recovery**: Logs overlap but allows operation with warning
3. **Duplicate Recovery**: Logs duplicate detection with graceful continuation
4. **Default Recovery**: Logs error and continues with warning

## Monitoring and Logging

All hook operations are logged with structured format:

```json
{
  "contentType": "team",
  "hookType": "beforeCreate",
  "operationId": "team-beforeCreate-1234567890",
  "event": "start|success|error",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "executionTime": 45,
  "error": {
    "type": "warning",
    "code": "VALIDATION_ERROR",
    "message": "Team name is required"
  }
}
```

## Migration from Existing Hooks

### Before (Current Pattern)
```typescript
export default {
  async beforeCreate(event: any) {
    try {
      const { data } = event.params;
      // Validation logic
    } catch (error) {
      strapi.log.error('Error:', error.message);
      // Manual error handling
    }
  }
};
```

### After (With Error Handler)
```typescript
import { HookWrapper } from '../services/hook-error-handler';

const hookWrapper = new HookWrapper(strapi);

export default {
  beforeCreate: hookWrapper.wrapBeforeCreate('team', async (event) => {
    const { data } = event.params;
    // Same validation logic, but errors are handled automatically
    return data;
  })
};
```

## Testing

The service includes comprehensive tests covering:
- Successful operations
- Error handling scenarios
- Timeout protection
- Configuration management
- Error classification
- Recovery strategies

Run tests with:
```bash
npm test -- --testPathPattern=hook-error-handler.test.ts
```

## Best Practices

1. **Use HookWrapper**: Prefer the wrapper over direct error handler usage
2. **Configure Appropriately**: Set timeouts based on operation complexity
3. **Classify Errors Properly**: Ensure critical errors truly need to block operations
4. **Monitor Logs**: Watch for patterns in warnings and errors
5. **Test Error Scenarios**: Include error cases in your tests
6. **Update Configuration**: Adjust settings based on production behavior

## Future Enhancements

- Background job integration for async processing
- Advanced retry mechanisms with exponential backoff
- Error rate monitoring and alerting
- Configuration management UI
- Performance metrics dashboard