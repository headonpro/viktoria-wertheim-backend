# Tabellen-Automatisierung Services

This directory contains all the core services and interfaces for the automatic table calculation system.

## Directory Structure

```
services/
├── index.ts                    # Main export point for all services
├── types.ts                    # Central type definitions and re-exports
├── queue-manager.ts            # Queue management interfaces
├── tabellen-berechnung.ts      # Table calculation service interfaces
├── snapshot.ts                 # Snapshot and rollback service interfaces
├── error-handling.ts           # Error handling types and utilities
└── README.md                   # This file
```

## Related Files

```
backend/src/
├── api/
│   ├── spiel/
│   │   ├── services/
│   │   │   ├── validation.ts   # Spiel validation service interfaces
│   │   │   └── index.ts        # Spiel services export
│   │   └── lifecycles.ts       # Spiel lifecycle hook interfaces
│   └── tabellen-eintrag/
│       └── services/           # This directory
├── admin/
│   └── extensions/
│       └── tabellen-automatisierung/
│           ├── types.ts        # Admin panel extension interfaces
│           └── index.ts        # Admin extensions export
└── config/
    └── automation.ts           # Configuration interfaces and defaults
```

## Key Interfaces

### Core Services
- **ValidationService**: Input validation and data consistency checks
- **QueueManager**: Job scheduling and queue management
- **TabellenBerechnungsService**: Core table calculation logic
- **SnapshotService**: Backup and rollback functionality
- **ErrorHandler**: Centralized error handling and recovery

### Supporting Types
- **SpielEntity**: Game data structure with automation fields
- **TabellenEintrag**: Table entry structure with tracking fields
- **CalculationJob**: Queue job definition and status tracking
- **AutomationError**: Comprehensive error classification system

### Configuration
- **AutomationConfig**: Complete system configuration
- **QueueConfig**: Queue-specific settings
- **CacheConfig**: Caching configuration
- **ErrorHandlingConfig**: Error handling and retry strategies

## Usage

```typescript
import {
  ValidationService,
  QueueManager,
  TabellenBerechnungsService,
  SnapshotService,
  AutomationConfig,
  DEFAULT_AUTOMATION_CONFIG
} from './services';

// All interfaces and types are available for implementation
```

## Implementation Notes

- All files contain only TypeScript interfaces and types
- Actual implementations will be created in subsequent tasks
- Error handling is centralized with comprehensive error classification
- Configuration is environment-aware with sensible defaults
- All services support monitoring and health checks
- Queue system supports priority-based job processing
- Snapshot system includes compression and validation
- Admin extensions provide full management capabilities

## Requirements Mapping

This structure addresses the following requirements:
- **1.1**: Automatic table updates on game result entry
- **4.4**: Data integrity and transaction management
- **6.1**: Monitoring and logging capabilities
- **6.3**: Queue-based job processing
- **7.1-7.5**: Snapshot and rollback functionality
- **8.1-8.5**: Performance optimization and monitoring

## Next Steps

1. Implement ValidationService (Task 2.1)
2. Implement TabellenBerechnungsService (Task 3.1-3.3)
3. Implement QueueManager (Task 4.1-4.3)
4. Implement lifecycle hooks (Task 5.1-5.2)
5. Implement SnapshotService (Task 6.1-6.2)
6. Create admin panel extensions (Task 7.1-7.3)